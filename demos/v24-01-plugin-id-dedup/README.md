# V24-01 plugin slug uniqueness demo

Live demo + Layer 2 evidence for NAC3 v2.5 RFC V24-01: plugin slug
uniqueness gate. When the same `data-nac-plugin` slug appears on more
than one DOM root, every root MUST carry a unique `data-nac-plugin-id`.

## Files

- `index.html` -- host page with 2 valid cart roots + violation
  injection surface + happy/violation flows.
- `../../scripts/run-demo-v24-01-plugin-id-dedup.mjs` -- Playwright
  runner. 11 PASS / 0 FAIL across 6 scenarios.
- `../../evidence/v24-01-plugin-id-dedup/<YYYY-MM-DD>/*.png` --
  per-scenario screenshots + run-log.json + run-log.txt.

## Enforcement layers covered

| Layer | Surface | Demo button | Verified |
|---|---|---|---|
| Register-time throw | `NAC.register(slug)` | `try-register-after-violation` | `NacError('duplicate_plugin_no_instance_id')` |
| Boot-time fatal banner | DOMContentLoaded validator | (mirrored via register surface) | `nac:fatal` listener captures the event |
| Non-fatal CI finding | `NAC.validate_global()` | `validate-after-violation` | `plugin_instance_violations[]` populated |
| Migration flag | `NAC.HARD_DEDUP=false` | `toggle-hard-dedup-off` | validate still reports; banner silenced |

## Running

```bash
# from c:/yujin-nac-spec/
python -m http.server 8855   # terminal 1
node scripts/run-demo-v24-01-plugin-id-dedup.mjs   # terminal 2
```

Output exits 0 on success.

## Live URL

http://localhost:8855/demos/v24-01-plugin-id-dedup/index.html
