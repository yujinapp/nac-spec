# V25-03 narrate demo

Live demo + Layer 2 + Layer 3 evidence for NAC3 v2.5 RFC V25-03:
canonical human-readable label resolution.

## API

`NAC.narrate(plugin, nac_id) -> string | null`. Priority:

1. `aria-label`             (a11y-first)
2. visible text             (textContent, nested addressable children excluded)
3. `data-nac-label`         (author override)
4. `nac_id`                 (worst case)

Whitespace-only values at any tier collapse to the next tier.

## Files

- `index.html` -- editor toolbar with 7 buttons exercising each tier
- `../../scripts/run-demo-v25-03-narrate.mjs` -- Playwright runner.
  **12 PASS / 0 FAIL** across 11 scenarios.
- `../../scripts/run-pilot-v25-03-narrate.mjs` -- Layer 3 Pilot
  driver. LIVE w/ Claude sonnet-4-6: **6 PASS / 0 FAIL** across 3
  high-complexity statements (priority-order, null-on-missing,
  nested-children-excluded).
- `../../evidence/v25-03-narrate/<YYYY-MM-DD>/*.png`
- `../../evidence/v25-03-narrate-pilot/<YYYY-MM-DD>/*.{png,json,txt}`

## Running

```bash
python -m http.server 8855                              # terminal 1
node scripts/run-demo-v25-03-narrate.mjs                # Layer 2
PILOT_MODE=live ANTHROPIC_API_KEY=sk-...                  \
  node scripts/run-pilot-v25-03-narrate.mjs              # Layer 3 LIVE
```
