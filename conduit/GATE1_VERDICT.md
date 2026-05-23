# Gate 1 verdict -- N=10 EN base

**Date:** 2026-05-21
**Sumi decision (Pablo asleep, 2h delegation):** AMBER-GREEN
**What gates:** advance to Escalon 2 (multilingual N=3) with a
fix-first action item (shared-DB contamination on post_comment).

---

## Matrix (180 runs, 6 models, 3 flows, N=10)

| Model | login | publish | comment | Cost/flow | Verdict |
|---|---|---|---|---|---|
| **gemini-3.1-flash-lite** | 10/10 | 10/10 | 10/10 | $0.00066 | **Default (cheapest 10/10)** |
| **gpt-5-mini** | 10/10 | 10/10 | 10/10 | $0.00559 | **Runner-up** |
| **claude-haiku-4-5** | 10/10 | 10/10 | 10/10 | $0.01314 | **Promote (was N=3 9/9 strict, now N=10 10/10)** |
| **claude-sonnet-4-6** | 10/10 | 10/10 | 10/10 | $0.02794 | **Baseline** |
| gemini-2.5-flash | 10/10 | 10/10 | 0/10 | $0.00213 | Avoid (parse_fail multi-step) |
| gpt-4o-mini | 10/10 | 10/10 | 2/10 | $0.00176 | Avoid (post_comment 20%) |

### What changed N=3 -> N=10 (variance check)

- **No surprises.** The strict-NAC report's classification holds:
  the 4 reliable models remain reliable; the 2 fragile models
  remain fragile on the same failure mode (post_comment +
  prose-instead-of-JSON / multi-step navigation loops).
- **Promotion:** haiku-4-5 strengthens from 9/9 strict (N=3) to
  30/30 (N=10). Confirmed fit for the multilingual roster.

---

## Byte-determinism audit (temp=0)

Ran across the 4 winners on the two prompt-deterministic flows
(login + post_comment). publish_article has per-iter unique
slug by design so divergence there is expected.

| Model | login (truly isolated) | post_comment (shared feed) |
|---|---|---|
| flash-lite | BYTE-IDENTICAL (1 seq / 10) | DIVERGENT (4 variants) |
| gpt-5-mini | BYTE-IDENTICAL (1 seq / 10) | DIVERGENT (5 variants) |
| sonnet | BYTE-IDENTICAL (1 seq / 10) | DIVERGENT (5 variants) |
| haiku-4-5 | **DIVERGENT (2 variants)** | DIVERGENT (2 variants) |

### Diagnosis

**post_comment divergence is environmental, not model.** All
divergent post_comment sequences differ only in WHICH article
they clicked. The 6 parallel N=10 runs (3 earlier + 3 today)
all wrote into the same Conduit SQLite. The home feed shows
the union -- ~150 articles by run-end. "Click the first
article on the home feed" resolves to "whatever publish_article
ran most recently against this DB", and that ID varies across
iters because the home feed is global state, not isolated state.

So the per-flow action_sequence is correctly byte-deterministic
**given the same input state**. The input state for post_comment
isn't held fixed because the prompt says "first article", which
is a state-dependent referent. **This is a harness flaw at N=10
that didn't show at N=3.**

**login divergence on haiku is model-side.** Two distinct
sequences, both succeeding:
- variant A (60%): `click_by_verb:nav_item__login -> click:nav_item__login -> fill -> fill -> click_by_verb:login`
- variant B (40%): `click:nav_item__login -> fill -> fill -> click:action.login`

Haiku occasionally emits a redundant initial dispatch (click_by_verb,
then click) before recovering. Both paths succeed. Score 10/10 holds.
At temp=0 this is unexpected; either Haiku's "temperature=0"
isn't fully greedy in our SDK setup, OR there's per-call sampling
of intermediate hidden-state. Documented; not a blocker.

---

## Fix-first action before Escalon 2

**Problem:** post_comment's prompt is state-dependent ("click the
first article") and the shared feed makes "first article" a moving
target across parallel runs. In Escalon 2 we'll run 5 langs * 4
models * 3 iter = 60 post_comment runs, plus 60 publish_article
runs adding more articles to the feed -- contamination compounds.

**Fix:** change post_comment to target a **pre-seeded specific
article** by slug, not "the first article". Two options:

1. **Pre-seed in flow.pre** (preferred): each iter starts by
   API-seeding a known article with a known slug, then the model
   gets a prompt referring to that exact slug. The model exercises
   the same NAC path (filter/search article preview + click),
   but the target is invariant.

2. **DB reset between iters** (heavier): kill backend, delete
   `database.sqlite`, re-migrate + re-seed. Cleanest isolation
   but slow (~10s overhead per iter) and breaks the parallelism
   we get from shared DB.

Going with (1). Prompt becomes "Navigate to the article titled
'forge-seed-1' (search or click its link in the feed). Write a
comment 'captured by v3 flow' and submit." The `forge-seed-1`
article gets seeded via API before each iter.

---

## Roster for Escalon 2

- **gemini-3.1-flash-lite** (default candidate)
- **gpt-5-mini** (runner-up)
- **claude-haiku-4-5** (premium-fast, byte-determinism caveat
  noted but pass rate clean)
- **claude-sonnet-4-6** (baseline)

Drop from roster:
- gemini-2.5-flash (parse_fail multi-step)
- gpt-4o-mini (post_comment 20%)

These two stay in the documented "avoid for multi-step" tier.
They will NOT run multilingual (their failure mode is
pre-multilingual; running them in 5 langs would add 60 runs of
expected failure with no signal).

---

## Cost so far + budget for next escalons

- Escalon 1 spent: ~$1.40 (6 models, 30 runs each).
- Escalon 2 forecast: 4 models * 3 flows * 5 langs * 3 iter = 180
  runs; weighted ~$0.011/run -> ~$2.00.
- Escalon 3 forecast: 4 models * 3 flows * 5 langs * 10 iter = 600
  runs; ~$6.60.

Total path to paper: ~$10. Under the $30 ceiling.

---

## Next steps (in order)

1. **Harness edit:** add `--lang` flag, i18n prompts map for
   en/es/zh/hi/ar, NFC normalization helper on postcondition text
   comparisons (preventive, no-op under Option B but guards future
   Option A).
2. **post_comment isolation fix:** add `pre.seed_article` that
   API-seeds `forge-seed-1` and modifies the prompt to target it.
3. **Smoke validation:** run `--lang=en` flash-lite N=1 on all 3
   flows. action_sequences must be byte-equivalent to the existing
   Escalon 1 EN runs for login + publish (post_comment will
   differ because we changed the prompt target).
4. **Launch Escalon 2:** N=3 across 5 langs * 4 models.
5. **Gate 2 audit:** does the unlock transfer? If yes, prep
   Escalon 3 for Pablo to approve on return.
