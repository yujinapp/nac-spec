# V25-04 expect + diff demo

Live demo + Layer 2 + Layer 3 evidence for NAC3 v2.5 RFC V25-04:
effect detection (closing the "silent damage" gap for assistive
callers).

## API

- `NAC.expect(plugin, statePath, value, opts?) -> Promise<value>`
  Polls `NAC.read()` until the comparator returns truthy or the
  deadline fires. Read failures during polling are retried.
  - `timeout_ms` (default 5000)
  - `poll_ms` (default 100)
  - `comparator` (default `===`)
- `NAC.diff(plugin, statePath, actionFn) -> Promise<{before, after, changed}>`
  Snapshots, awaits actionFn, snapshots, returns delta.
  JSON-stringify compare for `changed`.

Both compose with V25-01 `read()` so any backend works (postmessage,
sdk-call, dom-mirror, ...).

## Files

- `index.html` -- fake canvas with `canvasApp.set(n)` + `setBold(on)`
  host-side SDK, plugin registered with two state paths.
- `../../scripts/run-demo-v25-04-expect-diff.mjs` -- Playwright runner.
  **17 PASS / 0 FAIL** across 7 scenarios (expect immediate, expect
  delayed, expect timeout, expect on bool, diff with change, diff
  no-op, diff multi-step).
- `../../scripts/run-pilot-v25-04-expect-diff.mjs` -- Layer 3 Pilot
  driver. LIVE: **7 PASS / 0 FAIL** across 3 statements
  (wait-for-effect, detect-silent-damage, noop-detection).
- Evidence under `../../evidence/v25-04-expect-diff{,-pilot}/`.

## Running

```bash
python -m http.server 8855
node scripts/run-demo-v25-04-expect-diff.mjs
PILOT_MODE=live ANTHROPIC_API_KEY=sk-... \
  node scripts/run-pilot-v25-04-expect-diff.mjs
```
