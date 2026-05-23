# gen-tests v3 — capture-replay flow tests, shipped

**Date:** 2026-05-21
**Scope:** brief "gen-tests v3 — capture-replay flow tests" (full).
**Status:** **3/3 flows captured, 3/3 specs emitted, 3/3 byte-deterministic
across 3 consecutive runs, 0 LLM calls in replay.**

## What v3 ships

A new test class **derived from real Pilot execution against the live
app**, never imagined by an LLM at test-generation time. The cost of
producing the test is one LLM call per flow (~$0.02–0.03 each);
replay is free and deterministic forever.

### Capture (one-time per flow)

`nac3-bench/bench/scripts/v3_capture_flow.mjs` drives a Playwright
Pilot loop against Conduit using Claude Sonnet 4.6 at temp=0. Each
flow has:
- a stable id (filename of the resulting trace)
- a one-sentence prompt the agent uses
- a `pre` block (optional pre-login)
- a `successProbe` evaluated in the browser between turns

The harness records every action the Pilot dispatched, the success
probe outcome between turns, and the round-trip tokens + cost. When
the probe returns `true`, the trace is serialized to
`traces/<flow_id>.json`. When it doesn't, the trace lands under
`traces/_failed/` for human inspection and is **not** picked up
by the emitter.

Schema (v3):
```json
{
  "schema_version": "v3",
  "flow_id": "...",
  "captured_at": "<iso>",
  "captured_with": { "model", "temperature", "turns_used", "tokens", "cost_usd" },
  "manifest_checksum": "sha256:...",
  "pre_state": { "login_user", "base_url" },
  "success_probe": { "description", "fingerprint" },
  "actions": [{ "step", "kind", "plugin", "verb_or_id", "value", "qualifier", "ok" }],
  "success": true
}
```

### Replay (every CI run, no LLM)

`yf gen-flow-tests <traces-dir>` reads each trace JSON and emits a
Cypress spec that **literally re-plays the captured action sequence**.
Each spec carries provenance in its header comment so the operator
knows exactly when + how + by which model the trace was captured,
and can re-capture if the app changes.

The emitted test:
1. Pre-state setup (login as the captured user via cy.request +
   onBeforeLoad localStorage seeding — the same fix that landed in
   gen-tests v2).
2. Visit base URL with auth wrapper.
3. For each captured action in order:
   a. `cy.get(<specific selector>)` retry-until-exists gate (8s).
   b. `cy.window().then(win => win.NAC.<kind>(...))` dispatch.
   c. 400ms inter-action wait (mirrors capture loop's 800ms cushion).
4. Probe fingerprint as a comment for re-capture reference.

## Validation on Conduit (3 flows × 3 runs)

| Flow | Turns | Cost (capture) | Replay outcome |
|---|---|---|---|
| `login_existing_user` | 4 | $0.0211 | ✓ ✓ ✓ |
| `publish_article` | 5 | $0.0297 | ✓ ✓ ✓ |
| `post_comment` | 3 | $0.0186 | ✓ ✓ ✓ |
| **total** | 12 | **$0.0694** | **9/9 = 100%** |

Total LLM spend to produce the entire flow suite: **$0.0694**.
Per-run replay cost: $0. Determinism: 3/3 byte-identical.

## Distinction from v2 (kept explicit per brief)

| | Cobertura | CI gate provided |
|---|---|---|
| **v2 — element tests** | Each `nac_id` is dispatchable. Surface depth. | "No rompiste un elemento NAC3." |
| **v3 — flow tests** | The main user paths complete end-to-end. Multi-step depth. | "No rompiste un flujo de usuario." |

Both live in the same Cypress suite. They answer different
questions. The brief's non-negotiables are honored:

1. **Flows derive from real execution, never imagined.** Every
   action in every replay came from a Pilot turn against the live
   app. No model-imagined intermediate step.
2. **Only success traces serialize.** Failed runs go to
   `_failed/` for human review; the emitter never picks them up.
3. **Replay contains zero LLM calls.** Verified: `npx cypress run`
   on the flow specs succeeds without `ANTHROPIC_API_KEY` set.
4. **Provenance per test.** Every emitted spec carries
   `Captured <date> | model=<m> temp=0 turns=N cost=$X manifest=<hash>`.
   The `manifest_checksum` lets the operator detect when the app's
   NAC surface drifted away from the captured assumption and
   schedule a re-capture.

## Distinction from H4 (kept explicit per brief)

v3 tests the **app**: did the sequence of NAC actions cause the
expected state? Independent of which model produced the sequence.
H4 will test **models**: can a cheaper model produce a sequence
that reaches the same state? Orthogonal. The same trace can be
the ground-truth target for an H4 cheap-model comparison, but the
v3 test does not validate the model — only the app.

## What this unlocks for the case study

Forge now ships **two coordinated test corpora** for any
NAC-3-decorated React app:

> "Forge doesn't just test that each element is reachable. It
> captures the actual sequences a Pilot agent used to complete
> each core flow against the live app — login, publish, comment —
> and serializes them as replayable Cypress flow tests. The
> flows are derived from real execution, not imagined. Capture
> costs one LLM call per flow; replay is free and deterministic
> forever."

The flagship demo for a new candidate adopter becomes:
1. `yf migrate --ai-apply` — generate manifest.
2. `yf gen-tests` — emit ~50 element tests (v2).
3. `node v3_capture_flow.mjs --all` — emit ~6 flow traces (~$0.20).
4. `yf gen-flow-tests` — serialize traces to ~6 replay specs.
5. Run all of it in CI on every push, $0 ongoing.

That's the most defensible argument the product can make: tests
of YOUR app, derived from YOUR app executing, never from a
template or LLM imagination.

## Commits

- `forge gen-tests v3 + stabilizer: flow capture-replay + token cache`
  — yujinapp/yujin-forge commit `9782892`
- `conduit fork: v3 flow tests + token-cache stabilizer regen`
  — conduit-bench/conduit commit `bcc5605`

(The capture script + traces live in `nac3-bench/bench/` which is
not under git; they ship to the case study writeup as
copy-paste-ready artifacts when the public bundle is assembled.)

## What's left for the next iteration

Per the brief's "Lo que queda para después del 90%" list:

- **Repo público con MIT attribution** — pendiente.
- **H4 cheap-model validation** — fixture is now ready; the seed
  data + multi-user fixture + flow traces give it real ground
  truth to compare against. Next clearly-scoped move.
- **Reproducción por un tercero sin tu harness** — final
  validation of the case study.

These three are the natural follow-ups; this v3 build is the
substrate they all sit on.
