# Changelog

## 2.2.0 -- 2026-05-10

Same-day v2.2 ships the constructor-strict validator + action-ack
helper. Both items moved from the v2.2 roadmap into the runtime
with no breaking changes (warning-only mode by default).

### V22-01 -- `NAC.register` strict validator

`NAC.register(manifest)` now checks each manifest entry against
three rules and emits `console.error` for findings:

- `manifest_role_unknown` -- the entry's `role` is outside the
  canonical set (the 18 roles in SPEC sec 1).
- `tab_id_manifest_role_drift` -- the entry's id matches `^tab\.`
  but its role is not `'tab'`. NAC.tab() and NAC.tab_by_label()
  query the canonical role only; a drift here makes the tab
  invisible to those resolvers (the bug class that broke
  example-v21-data-table.php on 2026-05-09).
- `manifest_dom_role_mismatch` -- the corresponding DOM element
  is mounted, and its `data-nac-role` differs from the manifest's
  `role` value. Catches the case where an HTML author and a JS
  author drift apart on what role to use.

A new flag `NAC.STRICT_VALIDATION` toggles findings between
warning-only (default; ships in 2.2) and throwing (will be the
v2.3 default; opt-in in 2.2 for adopters who want to gate CI).

Migration window: v2.2 = console.error only, v2.3 = throw
default, v3.0 = remove the flag.

### V22-02 -- `NAC.bindAction` helper

New helper:

```js
NAC.bindAction(buttonEl, function (ev) { /* side effect */ }, {
  plugin: 'invoice', action_id: 'invoice.save'
});
```

Bakes the `nac:action:succeeded` / `:failed` contract into the
runtime so brownfield panels cannot forget to emit the ack event.
Handles sync handlers + Promise-returning handlers; emits failure
on throw + preserves normal error semantics; returns an unbinder
function.

Removes the foot-gun that produced the v20-panel timeout reports
on 2026-05-09 (every voice command on example-v20-full.php
replied "No pude ejecutar X: timeout" because the panel handlers
did the work synchronously but never emitted the ack).

### Tests

- `test/smoke.mjs` -- 36/36 PASS (artefact integrity + d.ts
  surface + CLI version + CLI lint over demos + package.json
  consistency, version asserts now check 2.2.0).
- `test/v22.mjs` -- new. 14/14 PASS. 5 strict-validator cases
  (clean, unknown-role, tab-drift, DOM mismatch, strict-throws)
  + 5 bindAction cases (sync ack, throw -> failed event, Promise
  ack, unbinder, ctx validation) + NAC sanity checks.

Run via: `npm test` (chains both suites).

### Known to-dos

- Per-action signing (v3.0 candidate).
- v2.3 will flip `STRICT_VALIDATION` default to true.
- v2.3 will ship `NAC.bindTab(el, handler, ctx)` companion for
  tab-role widgets.

## 2.1.0 -- 2026-05-10

First public release. Wraps the reference runtime that has been
running in production at yujin.app since 2026-04 as the npm package
`@nac3/runtime`.

### Spec

- v2.1 with data-table primitive (collection / matrix /
  matrix-singletree subkinds; `dt_add_row` / `dt_edit_cell` /
  aggregates / transactional commit).
- Brownfield migration story shipped (v2.0 extensions: scope tree,
  ephemeral capture, autoRegister, HMAC, isTrusted).
- 18 canonical roles, 11 success-event families.
- 10-locale i18n contract.

### Package

- ESM + CJS + browser builds.
- TypeScript declarations (permissive surface; v2.2 ships
  hand-authored full types).
- CLI: `npx nac validate <dir>` does static lint of HTML/PHP.
- Single source of truth: package built from
  `yujin.app/nac-spec/js/*.js`, no maintenance duplication.

### Demos

- `example.php` -- v1.9 reference, 27 widgets.
- `example-v20-full.php` -- brownfield migration of v1.9 to v2.0.
- `example-v20-primitives-showcase.php` -- didactic showcase of
  the 8 v2.0 primitives.
- `example-v21-data-table.php` -- live data-table demo wired to
  the Yujin chat backend.

All demos hosted at yujin.app/nac-spec/.

### Known limitations

- No per-action signing yet (only manifests). v3.0 candidate.
- Constructor (`NAC.register`) is permissive on unknown roles; the
  v2.2 strict-validator landing fixes this.
- CLI URL mode (`nac validate https://...`) requires Playwright;
  the package does not pull Playwright as a hard dep. Static-lint
  mode works without it.
