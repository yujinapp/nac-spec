# V24-02 syncPlugin idempotent registration demo

Live demo + Layer 2 evidence for NAC3 v2.5 RFC V24-02: idempotent
`syncPlugin(slug, manifest)` that REPLACES a registration instead of
appending. SPA hosts that re-render on every prop change must call
syncPlugin -- legacy `register()` accumulates stale entries.

## Files

- `index.html` -- 4 manifests v1-v4, register vs syncPlugin contrast,
  invalidated subscription, tree_version monotonic display.
- `../../scripts/run-demo-v24-02-sync-plugin.mjs` -- Playwright runner.
  10 PASS / 0 FAIL across 5 scenarios.
- `../../evidence/v24-02-sync-plugin/<YYYY-MM-DD>/*.png` -- per-scenario
  screenshots + run-log.json + run-log.txt.

## What the demo verifies

1. `register()` adds 1 verb -> verb_count=1.
2. Legacy second `register()` contrast shown but does not pollute the
   syncPlugin path.
3. `syncPlugin(v3)` replaces -> verb_count goes to 2 (renamed verbs).
4. `syncPlugin(v3)` again is idempotent at the registry layer but
   bumps `tree_version` monotonically each call (V24-04 OCC contract).
5. `syncPlugin(v4)` with new manifest fires `nac:plugin:invalidated`
   exactly once per replace.

## Running

```bash
python -m http.server 8855
node scripts/run-demo-v24-02-sync-plugin.mjs
```
