# V24-04 snapshot versioning + OCC demo

Live demo + Layer 2 evidence for NAC3 v2.5 RFC V24-04: snapshot
versioning + optimistic concurrency control. Three primitives in
cheap-to-expensive order:

- `plugin_version`         per-plugin monotonic; targeted noise filter
- `tree_version`           global monotonic; escape hatch
- `element_state_hash`     128-bit SHA-256 truncated content hash

Every mutating verb (`click`, `fill`, `select`, `invoke`, `tab`)
honours `expected_plugin_version` / `expected_tree_version` /
`expected_element_state_hash` and rejects with
`NacError('snapshot_stale', ...)` when the snapshot the agent planned
against has been invalidated. `STRICT_VERSIONING` defaults `true` in
v2.5 alpha.4.

## Files

- `index.html` -- counter plugin with input + add + reset, snapshot
  via describe(), buttons for each OCC variant + STRICT toggle.
- `../../scripts/run-demo-v24-04-snapshot-versioning.mjs` -- Playwright
  runner. 17 PASS / 0 FAIL across 8 scenarios.
- `../../evidence/v24-04-snapshot-versioning/<YYYY-MM-DD>/*.png`

## What the demo verifies

| # | Scenario | Verified |
|---|---|---|
| 1 | register + markHydrationComplete + describe | plugin_version + tree_version + element_state_hash present |
| 2 | click with FRESH expected_plugin_version | OK -- gate passes |
| 3 | click with STALE expected_plugin_version | rejected with `snapshot_stale` |
| 4 | STRICT=true + missing expected_* | rejected with `version_required` |
| 5 | STRICT=false + missing expected_* | OK -- relaxed path |
| 6 | tree_version: fresh OK, stale rejects | both signals honoured |
| 7 | element_state_hash: fresh OK, mutate-then-stale rejects | content hash flips after MutationObserver |
| 8 | versionHistory + conformance_tier surface | exposed + populated |

## Running

```bash
python -m http.server 8855
node scripts/run-demo-v24-04-snapshot-versioning.mjs
```
