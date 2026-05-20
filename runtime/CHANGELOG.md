# Changelog

## 2.3.0 -- 2026-05-20

### Added

- **`NAC.syncPlugin(spec)`** -- idempotent plugin registration.
  Replaces the manifest for a plugin instead of appending, fixing the
  stale-snapshot class of bugs where repeated `register()` calls on
  dynamic re-renders accumulated duplicate manifest entries. Counterpart
  to the existing `syncDataTable`. Recommended path for SPA hosts.
- **`data-nac-plugin-id`** -- explicit plugin instance identifier for
  pages with multiple roots sharing a plugin slug. When a slug appears
  more than once in the DOM, every root MUST carry a unique
  `data-nac-plugin-id`. `validate_global` flags violations.

### Fixed

- Manifest accumulation on repeated `register()` calls. `syncPlugin` is
  the recommended migration path for hosts that re-render.
- `validate_global` now flags duplicate plugin manifest entries.

### Benchmark

This release ships the runtime that was validated across **600 runs**
(5 models x 3 protocols x 4 tasks x 10 iterations) published at
<https://github.com/yujinapp/nac-spec/tree/main/benchmark/>. Highlights:

- **95.5% success rate** under NAC3 (191 / 200 runs).
- **Zero phantom-selector silent damage** in NAC3 (0 / 200) vs
  **15%** in Raw DOM (30 / 200).
- **1.0 round-trip per task** in NAC3 vs 3.5 in MCP.
- Cheap models (Gemini Flash Lite, GPT-4o-mini) reached
  **100% success** under NAC3 -- matching frontier models in Raw DOM.

Full reproducibility: every JSONL row carries `runtime_version`,
`bench_version`, `manifest_checksum`. Bundle downloadable from the
benchmark page. Cost to re-run: ~US$15.

### Experimental (not yet GA)

The runtime contains code merged for the V24-04 RFC (snapshot
versioning + optimistic concurrency control). This release ships it as
**implementation present, enforcement opt-in**:

- `plugin_version` and `element_state_hash` are present in
  `NAC.describe()` output by default. Shape is stable; semantics may
  tighten in v2.4.
- `expected_plugin_version` and `expected_tree_version` parameters on
  dispatch are accepted, but enforcement (throwing `snapshot_stale`)
  is gated behind `NAC.STRICT_VERSIONING = true`. Default is `false`.
- `markHydrationComplete()` is exported and active. SSR hosts may call
  it; SPA hosts get a 100ms auto-fallback.

The 2.3 benchmark ran with `STRICT_VERSIONING=false` and did not
exercise the OCC enforcement. V24-04 will move from "experimental
opt-in" to "SHIPPED" in v2.4, validated by a dedicated concurrency
benchmark. See `/rfcs/README.md` for status.

V24-05 (agent authority + interposition: `confirm_action`,
`request_authority`) is RFC draft only -- not in this runtime.

### Spec changes

- `SPEC.md` header bumped to v2.3.
- New `/rfcs/` directory separates spec-shipped features from open
  proposals. Index in `/rfcs/README.md` documents status per RFC.
- `docs/BENCHMARK_PROVENANCE.md` ties dataset (which reads
  `runtime_version=2.2.1` per JSONL field) to the npm release
  (`2.3.0`) via the shared commit hash.

## 2.2.1 -- 2026-05-12

### Bug fix: importable in Node / SSR / test contexts

Pre-launch smoke test caught that `import '@nac3/runtime'` and
`import '@nac3/runtime/chat-client'` crashed in Node.js with
`ReferenceError: document is not defined`. The bundles had
top-level `document.dispatchEvent` and `document.addEventListener`
calls firing at module-evaluation time.

Fix: wrap browser-only init in `typeof document !== 'undefined'`
guards. In the browser the behaviour is unchanged (the events
still fire on install + the confirm listener still attaches). In
Node / SSR / Vitest / Jest the bundles now import as no-ops
instead of crashing.

Files patched (no API change):
- `dist/nac.{mjs,cjs,browser.js}` -- guarded `nac:installed`
  dispatch + `_installA11yHintBridge()` call.
- `dist/nac-chat-client.{mjs,cjs,browser.js}` -- guarded
  `nac:confirm:requested` listener attach.
- `dist/nac-v2-extensions.*` -- unchanged (it already early-bails
  when the main runtime is not present).

Verified: all three entry points (`@nac3/runtime`,
`@nac3/runtime/extensions`, `@nac3/runtime/chat-client`) now
import cleanly under Node 22 ESM + CommonJS `require`.

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
