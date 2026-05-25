# V25-02 tree navigation demo

Live demo + Layer 2 + Layer 3 evidence for NAC3 v2.5 RFC V25-02:
hierarchical command navigation for assistive flows.

## API

- `NAC.context(plugin) -> { breadcrumb: [{nac_id, label}, ...] }`
  Walks up from `document.activeElement` through addressable
  ancestors, stopping at the plugin root.
- `NAC.tree(plugin, rootId?) -> [{nac_id, label, opens?, leaf?}, ...]`
  Enumerates IMMEDIATE addressable children of rootId (or plugin
  root if omitted). Honours `data-nac-opens` + `data-nac-leaf`.

Labels resolved via `narrate` (RFC V25-03).

## Files

- `index.html` -- editor with multi-level menubar (File / Edit /
  Insert / Help), nested submenus, opens-chain (`menu-file` opens
  `submenu-file`, `action-file.export` opens `submenu-file.export`...).
- `../../scripts/run-demo-v25-02-tree-nav.mjs` -- Playwright runner.
  **18 PASS / 0 FAIL** across 9 scenarios (tree at root, at
  menubar, at submenus, opens-chain composition, leaf empty, unknown
  rootId empty, context with no focus, context with deep focus).
- `../../scripts/run-pilot-v25-02-tree-nav.mjs` -- Layer 3 Pilot
  driver. LIVE: **4 PASS / 0 FAIL** across 2 statements (walk to
  leaf via opens-chain composition; enumerate menubar with leaf vs
  opens semantics).
- Evidence under `../../evidence/v25-02-tree-nav{,-pilot}/`.

## Running

```bash
python -m http.server 8855
node scripts/run-demo-v25-02-tree-nav.mjs
PILOT_MODE=live ANTHROPIC_API_KEY=sk-... \
  node scripts/run-pilot-v25-02-tree-nav.mjs
```
