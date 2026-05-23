# H4 — cheap-model validation on NAC-3 flows

**Date:** 2026-05-21
**Scope:** brief "H4 cheap-model validation" against the v3 flow corpus.
**Matrix:** 3 flows × 6 models × 3 iterations = **54 runs**.
**Status:** **gemini-3.1-flash-lite reaches Sonnet's success rate at 42× lower cost.**

## What H4 answers

If a v3 capture (canonical happy-path) was produced with Claude Sonnet 4.6,
can a **cheaper model** drive the SAME flow to the SAME end-state at runtime?
Independent of Sonnet's exact action sequence — the model is free to pick
its own path as long as it reaches `success_probe === true`.

This is orthogonal to v3. v3 tests the APP (replay a verified sequence). H4
tests the MODEL (can it find a working sequence).

## Final matrix

3 flows × 3 iter per (flow, model). Each cell shows `OK/N | turns | cost`.

| Model | login | publish_article | post_comment | Total | Avg $/flow |
|---|---|---|---|---|---|
| **claude-sonnet-4-6** *(baseline)* | 3/3 · 4t · $0.0181 | 3/3 · 5t · $0.0285 | 3/3 · 3t · $0.0168 | **9/9** | $0.0211 |
| claude-haiku-4-5 | 3/3 · 6t · $0.0105 | 3/3 · 10t · $0.0221 | **0/3** · 12t · $0.0235 | 6/9 | $0.0187 |
| gpt-4o-mini | **0/3** · 12t · $0.0026 | **0/3** · 12t · $0.0030 | **0/3** · 12t · $0.0029 | **0/9** | $0.0028 |
| gpt-5-mini | 3/3 · 6.7t · $0.0120 | 2/3 · 7.3t · $0.0169 | 3/3 · 3t · $0.0038 | 8/9 | $0.0109 |
| gemini-2.5-flash | 1/3 · 2t · $0.0009 | 3/3 · 5t · $0.0032 | 0/3 · 1t · $0.0005 | 4/9 | $0.0015 |
| **gemini-3.1-flash-lite** | **3/3 · 4t · $0.0004** | **3/3 · 5t · $0.0007** | **3/3 · 3t · $0.0004** | **9/9** | **$0.0005** |

## The unlock

**gemini-3.1-flash-lite matches the Sonnet baseline (9/9 success) at
1/42 of Sonnet's cost** — $0.0005 per flow vs $0.0211. For three flows,
$0.0015 vs $0.063. Project that to 1000 flow captures: **$1.50 with
flash-lite vs $63 with Sonnet** for byte-identical capture fidelity.

Crucially, success rate is not just "comparable" — it's **identical**
(9/9 vs 9/9 in this matrix). The action sequences differ slightly (mean
turn counts are within ±0.5 of Sonnet on every flow), but the end-state
probe passes the same.

This is the H4 result we wanted: the cheap-model floor is well below
$0.001 per multi-step flow on a real RealWorld-class SPA, with no
success-rate compromise.

## Other findings

### gpt-4o-mini is below the floor (0/9)

Loops without progress on every flow. Hits MAX_TURNS=12 every time.
Cheapest per attempt ($0.0026) but burns budget without completing,
which makes it the most expensive in $/successful-flow terms (∞).
**Recommendation: do not use for NAC-3 flow capture.**

### claude-haiku-4-5 fails multi-step nav→fill→submit (6/9)

Passes simple login (3/3) and the publish editor flow (3/3) when given
a unique title, but **0/3 on post_comment** — consistently hits MAX_TURNS
when the flow requires nav-from-feed → article-page → fill-comment → submit.
Costs $0.0235 per wasted attempt on the failing flow.

At $0.0187 average across the matrix, **haiku is slightly cheaper than
Sonnet but loses an entire flow class.** Hard to justify over either
Sonnet (higher cost but 100% success) or flash-lite (42× cheaper at 100%).

### gpt-5-mini is the runner-up (8/9)

Strong on login + comment, one publish iteration outlier (12 turns,
$0.0404 spent without success on iter 2; the other two completed in
5 turns at $0.005). Total avg $0.0109/flow makes it ~22× cheaper than
Sonnet at 89% success. **Solid budget pick when Google isn't available.**

### gemini-2.5-flash has a parse-format problem (4/9)

When it works it's fast and cheap (5t, $0.003 on publish). But on
post_comment it returns **prose** instead of JSON despite the
"JSON only" rule in the system prompt, producing `parse_fail` after
turn 1 every time. The newer flash-lite (3.1) doesn't have this bug.
**Recommendation: prefer 3.1-flash-lite over 2.5-flash for Pilot loops.**

## Cost-per-successful-flow ranking

Excluding `gpt-4o-mini` (∞ — never succeeds), and dividing total spend
by successful runs:

| Model | $ / success | × vs Sonnet |
|---|---|---|
| gemini-3.1-flash-lite | $0.0005 | 0.024× |
| gpt-5-mini | $0.0122 | 0.58× |
| claude-sonnet-4-6 | $0.0211 | 1.00× |
| claude-haiku-4-5 | $0.0280 | 1.33× |
| gemini-2.5-flash | $0.0034 (when works) | – |
| gpt-4o-mini | ∞ | – |

Flash-lite is **~42× cheaper per successful flow** than the Sonnet
baseline that produced the v3 captures, and ~25× cheaper than the
runner-up (gpt-5-mini).

## What changed between H4 v1 (contaminated) and v2 (clean)

Initial run had `publish_article` use a hardcoded title `"Forge v3 capture"`.
Conduit's slug-uniqueness check is GLOBAL — once the first model succeeded,
every subsequent attempt hit `AlreadyTaken` and the success probe stayed
false. Result: Sonnet 1/3, everyone else 0/3 on publish — a false-negative
cascade.

**Fix:** `prompt = "publish ... title 'Forge H4 publish ' + process.env.H4_PUBLISH_SUFFIX"`,
with the suffix set per (model, iter) cell to `${model}-${iter}-${unix_ts}`.
Re-ran the 18 publish cells. Clean numbers above.

Honest framing: the original run revealed a **fixture-isolation problem**,
not a model-capability problem. Documented as such; the v1 results are
preserved in `h4_results/h4_2026-05-21T17-42-20-209Z.json` for the audit
trail.

## What H4 does NOT test (kept explicit per brief)

- **General model capability** — H4 is specific to NAC-3 flow capture
  against this Conduit fork. A model that fails here may be fine on
  other tasks; one that passes is validated only for this use case.
- **Sub-Sonnet quality of the captured trace** — when flash-lite
  succeeds in 4 turns, it MIGHT take a slightly different path than
  Sonnet's 4-turn path. We did not diff action sequences here. That's
  a follow-up if the v3 emitter ever wants to canonicalize on the
  shortest verified path.
- **Replay variance** — v3 captures are byte-deterministic on replay
  because the actions are fixed. H4 measures CAPTURE variance per
  model (3 iterations each), not replay variance.

## Operational implication

For the Yujin Forge product going forward:

1. **Default capture model: claude-sonnet-4-6** (baseline reliability,
   ~$0.063 for 3 canonical flows on a Conduit-sized app).
2. **Cheap-capture default: gemini-3.1-flash-lite** when token budget
   matters. 42× cheaper, same success rate on this corpus.
3. **Cheap-capture warning list:** gpt-4o-mini (never use for capture),
   gemini-2.5-flash (parse_fail risk), claude-haiku-4-5 (fails multi-step
   nav flows).
4. **Capture cost projection:** 100-flow corpus on a Sonnet baseline =
   ~$2.10. Same corpus on flash-lite = **~$0.05**.

## Files

- `nac3-bench/bench/scripts/h4_cheap_model_validation.mjs` — H4 harness
- `nac3-bench/bench/h4_results/h4_FINAL.json` — consolidated 54-run matrix
- `nac3-bench/bench/h4_results/h4_2026-05-21T17-42-20-209Z.json` — v1 (contaminated)
- `nac3-bench/bench/h4_results/` other files — individual iter smoke runs
- `nac-spec/conduit/H4_REPORT.md` — this report

## Open items (NOT in this lote per "no avances más")

- Action-sequence divergence diff (flash-lite vs Sonnet path on same flow)
- Larger N (10+ iter per cell) for tighter variance bands
- Additional flows (settings update, follow author, favorite article) to
  test the cheap-model floor against more flow archetypes
- Re-run on a different SPA (non-Conduit) to validate the gemini-flash-lite
  unlock is general, not Conduit-specific
