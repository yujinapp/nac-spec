# Gate 2 verdict -- Escalon 2 multilingual N=3

**Date:** 2026-05-21
**Sumi decision (Pablo delegating):** GREEN. Final matrix in.
**What gates:** advance to Escalon 3 (multilingual N=10 paper-grade).

---

## Matrix (5 langs × 4 models × 3 flows × 3 iter = 180 runs)

| lang | model | login | publish | comment | cost/cell |
|---|---|---|---|---|---|
| en | gemini-3.1-flash-lite | 3/3 | 3/3 | 3/3 | $0.0060 |
| en | gpt-5-mini | 3/3 | 3/3 | 3/3 | $0.0414 |
| en | claude-haiku-4-5 | 3/3 | 3/3 | 3/3 | $0.1120 |
| en | claude-sonnet-4-6 | 3/3 | 3/3 | 3/3 | $0.2635 |
| es | gemini-3.1-flash-lite | 3/3 | 3/3 | 3/3 | $0.0063 |
| es | gpt-5-mini | 3/3 | 3/3 | 3/3 | $0.0526 |
| es | claude-haiku-4-5 | 3/3 | 3/3 | 3/3 | $0.1073 |
| es | claude-sonnet-4-6 | 3/3 | 3/3 | 3/3 | $0.2618 |
| zh | gemini-3.1-flash-lite | 3/3 | 3/3 | 3/3 | $0.0058 |
| zh | gpt-5-mini | 3/3 | 3/3 | 3/3 | $0.0431 |
| zh | claude-haiku-4-5 | 3/3 | 3/3 | 3/3 | $0.0902 |
| zh | claude-sonnet-4-6 | 3/3 | 3/3 | 3/3 | $0.2530 |
| hi | gemini-3.1-flash-lite | 3/3 | 3/3 | 3/3 | $0.0066 |
| hi | gpt-5-mini | 3/3 | 3/3 | 2/3 | $0.0861 |
| hi | claude-haiku-4-5 | 3/3 | 3/3 | 2/3 | $0.1520 |
| hi | claude-sonnet-4-6 | 3/3 | 3/3 | 3/3 | $0.2621 |
| ar | gemini-3.1-flash-lite | 3/3 | 3/3 | 3/3 | $0.0064 |
| ar | gpt-5-mini | 3/3 | 3/3 | 3/3 | $0.0422 |
| ar | claude-haiku-4-5 | 3/3 | 3/3 | 3/3 | $0.1019 |
| ar | claude-sonnet-4-6 | 3/3 | 3/3 | 3/3 | $0.2658 |

Total Escalon 2 cost: $2.17. Under budget ($5-7 forecast).

---

## Headline numbers

- **gemini-3.1-flash-lite cross-lang: 45/45 PERFECT.** The default
  candidate transfers cleanly across all 5 languages including
  non-latin scripts (zh, hi, ar).
- **gpt-5-mini cross-lang: 44/45** (1 failure on hi/post_comment).
- **claude-haiku-4-5 cross-lang: 44/45** (1 failure on hi/post_comment).
- **claude-sonnet-4-6 cross-lang: 45/45 PERFECT.**

Overall: **178/180 = 98.9% pass rate cross-lang at N=3.**

The 2 failures are isolated to hi/post_comment for gpt-5-mini and
haiku-4-5 — same flow, same language, two adjacent models. Pattern
suggests a hi-specific signal worth quantifying at N=10 (could be
prompt transliteration noise, or a real cross-lang difficulty
ranking with hi specifically more demanding for those two models).

---

## What this confirms

**The cheap-model unlock transfers across languages.** Tested on a
real app (Conduit RealWorld), with NAC-3 strict resolution, the
contract holds:
- Prompt in arabic (RTL) -> NAC dispatches still resolve.
- Prompt in mandarin (CJK, no spaces) -> manifest verbs still picked.
- Prompt in devanagari/hindi -> same.
- Prompt in spanish/english -> baseline.

The decoupling principle of NAC-3 (manifest invariant across UI
language, prompt language, model language) is empirically validated.

**Strict-mode candidates list works for non-native languages.** The 1
gpt-5-mini hi/post_comment failure happens at turn 12 (exhausted),
not at turn 1 with silent damage. The model was actively trying with
candidates feedback all the way to giving up. That's noisy failure,
recoverable in production by the host UI re-asking the user.

---

## Hi-specific minor degradation

Hindi shows a small (~33% on post_comment for 2 of 4 models)
degradation vs other languages. Hypothesis:

- Hindi rendered in transliterated Latin (`Hindi me {{seed_title}}
  titled article par jao`) is more ambiguous than native devanagari.
  Models may parse it as English-ish prose and lose the structured
  task framing.
- A future Option A run (native devanagari) might INCREASE
  performance here, paradoxically. Or might DECREASE if there's
  an Unicode/fill issue.

The N=10 in Escalon 3 will quantify this with confidence intervals.

---

## Variance vs Escalon 1 EN baseline

Same 4 models on en at N=3 here vs N=10 in Escalon 1:
- flash-lite: 3/3/3 vs 10/10/10 -> consistent
- gpt-5-mini: 3/3/3 vs 10/10/10 -> consistent
- haiku-4-5: 3/3/3 vs 10/10/10 -> consistent
- sonnet: 3/3/3 vs 10/10/10 -> consistent

**No regression from EN N=10.** The harness changes (i18n flag,
NFC normalization, seed-DELETE for post_comment isolation) did NOT
break the EN baseline. This is the key non-regression check.

---

## Cost-extrapolation for Escalon 3

N=10 × 5 langs × 4 models × 3 flows = 600 runs. From N=3 cost:
- flash-lite: $0.006/cell × 5 langs × 10/3 = $0.10 total
- gpt-5-mini: $0.05/cell × 5 × 10/3 = $0.83
- haiku-4-5: $0.10/cell × 5 × 10/3 = $1.66
- sonnet: $0.26/cell × 5 × 10/3 = $4.30

Total Escalon 3 forecast: **~$7**. Total path-to-paper: ~$10. Well
under the $30 ceiling in the brief.

---

## Recommendation for Pablo on his return

**GATE 2: GREEN. Launch Escalon 3.**

Three of the four models transfer cross-lang at near-perfect rates
at N=3. The default candidate (flash-lite) is 45/45 across all 5
languages. The minor hi degradation is interesting paper material
but not a blocker — N=10 will tell us if it's a structural finding
or noise.

If you prefer extra caution, we could:
- Run a quick N=10 on JUST hi-sonnet/post_comment first (~10 cells,
  ~$1) before committing to full Escalon 3.
- Or run the full N=10 in 5 parallel lang launchers and accept
  some hi-cell noise.

My default decision (Sumi) is to launch full Escalon 3 in
parallel and have the paper-grade data ready when you wake up.
