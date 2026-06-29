# NAC3 live demos at yujin.app/nac-spec/

**Spec version:** 2.5.0-alpha.5 (v2.5 line complete; promoted to npm
dist-tag `latest`).

**NAC3** = **Native Agent Contract**. The spec that lets web UIs be
driven by AI assistants, voice runners, RPA bots, and accessibility
tools without per-app glue code.

The repo ships two families of runnable demos:

1. **Vanilla PHP examples** at the repo root (`example*.php`) -- one
   self-contained page per spec milestone, loading the reference
   runtime directly.
2. **Framework + RFC demos** under `demos/` -- React/Angular study
   cases plus a focused walkthrough per shipped v2.4 / v2.5 RFC.

## Vanilla PHP examples (repo root) -- 13 files

| File | Version | Purpose |
|---|---|---|
| `example.php` | v1.9 stable | The canonical demo. 27 widgets (chat, calendar, autopilot, modals, tabs, charts, etc.). The full v1.9 surface in a production-shaped UI. |
| `example-navmap.php` | v1.x | Navigation map / sitemap primitive demo. |
| `example-v13.php` | v1.3 | The v1.3 widget primitives (stepper, tree, calendar, chart, map, richtext, ...). |
| `example-v20-primitives-showcase.php` | v2.0 | Didactic showcase of the 8 v2.0 brownfield primitives + HMAC + isTrusted + i18n, one section each. |
| `example-v20-full.php` | v2.0 | Brownfield migration of `example.php` to NAC3 v2.0 strict -- same widgets, v2.0 layer added in ~80 lines. See the side-by-side guide below. |
| `example-v20-page-a.php` / `example-v20-page-b.php` | v2.0 | Two-page pair for cross-page scope + navigation. |
| `example-v21-data-table.php` | v2.1 | The data-table primitives (`registerDataTable` + `dt_*`, from the extensions module). |
| `example-v22-interop.php` | v2.2 | The cross-app interop layer (routing verbs between NAC3 apps). |
| `example-v23-editor.php` | v2.3 | The `edit_field` Word-style field editor primitive. |
| `example-v23-shadow-open.php` / `example-v23-shadow-closed.php` | v2.3 | Shadow-DOM resolution for open and (voluntarily exposed) closed roots. |
| `example-v24-disambiguation.php` | v2.4 | Strict resolution + disambiguation: `err.candidates`, `nac:disambiguation_requested`, and the "silent damage" anti-pattern (SPEC sec 5.4). |

## Framework + RFC demos (`demos/`) -- 10 dirs

| Dir | What it shows |
|---|---|
| `demos/react/` | NAC3 + React -- todos study case. |
| `demos/angular/` | NAC3 + Angular -- todos study case. |
| `demos/v24-01-plugin-id-dedup/` | V24-01 plugin slug uniqueness (`data-nac-plugin-id`). |
| `demos/v24-02-sync-plugin/` | V24-02 idempotent `syncPlugin`. |
| `demos/v24-04-snapshot-versioning/` | V24-04 snapshot versioning + optimistic concurrency. |
| `demos/v24-05-authority-sudo/` | V24-05 agent authority + sudo elevation. |
| `demos/v25-canvas-api/` | V25-01 plugin extension contract for canvas + API surfaces. |
| `demos/v25-02-tree-nav/` | V25-02 tree navigation (`context` + `tree`). |
| `demos/v25-03-narrate/` | V25-03 asistive labels (`narrate`). |
| `demos/v25-04-expect-diff/` | V25-04 effect detection (`expect` + `diff`). |

Plus the **Atlas Pro voice ad** under `ads-demo/atlas-pro/` -- a
voice-driven advertisement that closes its own sale via NAC3.

## Side-by-side comparison: brownfield migration

Open `example.php` and `example-v20-full.php` in two tabs.

### What is identical

- HTML markup (every `<article data-nac-plugin="X">`, every
  `data-nac-id`, every i18n catalog reference, every handler)
- Visual appearance (same layout, same widgets, same interactions)
- Reference runtime (`js/nac.js`) loaded the same way
- Existing `data-i18n-key` catalog references

### What is different in the v2.0-full version

1. **Header docstring** explaining it is a brownfield migration.
2. **One additional script tag**: `js/nac-v2-extensions.js` loaded
   after `nac.js` and before `example.js`.
3. **One additional setup block** (~80 lines) that builds a scope
   tree from existing `data-nac-plugin` attributes, enables HMAC
   sign via `NAC.set_provenance_secret()`, sets a tenant prefix,
   starts `NAC.captureEphemeral()`, and calls
   `NAC.autoRegister.watch()` on the cards container.
4. **One additional UI panel** (`#v20-panel`) exposing live
   `describe_v2()`, `validate_global_v2()`, HMAC sign, and the
   isTrusted distinction.

That is the entire delta. Real adopters reuse this pattern verbatim.

## Cross-links

- NAC3 spec: https://github.com/yujinapp/nac-spec
- Live spec: https://yujin.app/nac-spec/
- npm: https://www.npmjs.com/package/@nac3/runtime
- CHANGELOG: `runtime/CHANGELOG.md`
- RFC state index: `rfcs/`
