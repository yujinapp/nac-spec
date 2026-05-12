# NAC3 v2.2 -- roadmap

NAC3 = **Native Agent Contract**.

Started 2026-05-09. This file accumulates the evolution items for
the next minor of the NAC3 spec. Each section is self-contained: a
problem statement, the bug class it prevents, the proposed contract
change, and the implementation notes.

**Status as of 2026-05-10:** v2.2 SHIPPED. Items V22-01 +
V22-02 + V22-03 + V22-04 are all in `js/nac.js` + the `@nac3/runtime`
2.2.0 NPM package. This file is now the canonical changelog for
the version.

| Item | Status | Commit |
|------|--------|--------|
| V22-01 strict validator | SHIPPED | 6c2b1866 |
| V22-02 bindAction helper | SHIPPED | 6c2b1866 |
| V22-03 locale detector hardening | SHIPPED 2026-05-09 | f631d77a |
| V22-04 tab_by_label parens normalisation | SHIPPED 2026-05-09 | f631d77a |
| V23-01 field editor primitive (preview) | DEMO SHIPPED 2026-05-11 | (example-v23-editor.php + packages/nac/test/v23-editor.mjs 8/8 PASS) |

---

## V22-01 -- Constructor (`NAC.register`) becomes a strict validator

**Problem class.** Brownfield demos can declare manifest elements
with non-canonical role values (`role:'navigation'` on a tab,
`role:'button'` instead of `'action'`, etc). The current
constructor accepts whatever shape it receives and stores it as-is.
The bug only surfaces in runtime when the API (`NAC.tab()`,
`NAC.tab_by_label()`, `NAC.click()`) cannot find the element,
because the canonical DOM query (`[data-nac-role="tab"]`) does
not match. By then the demo is already deployed, the user already
hit the broken voice command, and the runtime correctly throws
`tab X missing` -- a misleading error since the element IS in the
DOM, just under the wrong role.

**Concrete trigger (2026-05-09).** Pablo dictates `ve a pestana
permisos` on `example-v21-data-table.php`. The LLM resolves to
`NAC.tab('invoice_edit_modal','tab.permissions')`. The button
exists in the DOM but with `data-nac-role="navigation"` (set by
the demo author on HTML-semantic grounds: tabs ARE navigation).
The runtime throws "tab tab.permissions missing" even though the
button is right there. Same root cause caused
`tab_by_label('Lines (collection)')` to miss earlier in the same
session.

**Why three guard layers should have caught it but didn't.**

| Layer | Should detect... | What it does today |
|---|---|---|
| Pre-commit lint | role drift in PHP/HTML demo files | does not exist |
| `NAC.register(manifest)` (register-time) | non-canonical roles, id/role mismatch | accepts everything silently |
| `NAC.validate_global()` (lint-time) | role drift inside `m.elements[]` | only checks `m.tabs[]` presence |

The runtime API layer (`NAC.tab` etc.) is the **fourth** guard,
and the only one that fires today -- as a runtime error to the
end user. By then the cost is highest.

**Proposed contract change for v2.2.**

`NAC.register` MUST validate the manifest before storing it.
Validation rules:

1. **Known role enumeration.** Every `m.elements[i].role` must
   be a member of the canonical role set (extends
   `_CLICK_EVENT_FAMILY`):

   ```
   action, field, option, tab, breadcrumb-item, accordion-toggle,
   step, pagination-item, confirm-button, sort-control,
   filter-control, data-table, plugin, section, region,
   navigation, banner, complementary, contentinfo, button
   ```

   Unknown roles -> `console.error` + reject the register call.
   Landmark roles (`navigation`, `banner`, etc) are accepted but
   only on elements whose corresponding DOM node is a region
   container, not a clickable widget.

2. **Id/role coherence.** If `e.id` matches `^tab\.` then
   `e.role === 'tab'` is required. If `e.id` matches
   `^modal\.` then `e.role === 'action'` (or the action's
   sub-role) is required. Any mismatch -> `console.error` +
   reject. The grammar of the id field is a contract too;
   today it is implicit.

3. **DOM coherence (best effort).** When `register` is called
   after the DOM is parsed (the typical path), look up
   `[data-nac-id="<e.id>"]` in the DOM. If found and its
   `data-nac-role` differs from `e.role`, `console.error` +
   reject. This catches the case Pablo hit on 2026-05-09: the
   manifest says `role:'tab'` but the HTML still says
   `data-nac-role="navigation"` (or vice versa). When called
   before the DOM is ready, defer the check to a
   `DOMContentLoaded` post-pass.

4. **Migration helper (one release window).** For v2.2.0 the
   above produce `console.error` but do NOT throw -- adopters
   need a window to migrate. Starting v2.3.0 they throw a
   `RegisterError` and the manifest is rejected outright.
   Tracked in the runtime via `NAC.STRICT_VALIDATION` flag
   defaulting to `false` in v2.2 and `true` in v2.3.

**`NAC.validate_global()` extension.**

Add three new findings:

- `manifest_role_unknown` -- an element's role is outside the
  canonical set.
- `manifest_dom_role_mismatch` -- the manifest's role for
  `<id>` differs from the DOM's `data-nac-role` attribute.
- `tab_role_drift` -- a `<button>` (or any clickable) in the
  DOM has `data-nac-id="tab.X"` but `data-nac-role` is not
  `"tab"` -- regardless of whether a manifest entry exists.
  Catches HTML-only drift that the manifest validator misses
  by definition.

Each finding carries severity `error` by default;
`{ kind: 'warn' }` overridable per project.

**Pre-commit lint (separate deliverable, blocks the same drift).**

A new node script `tools/nac/check_demos.mjs` reads every
`*.php` and `*.html` in `yujin.app/nac-spec/`, builds a pseudo-DOM
via cheerio (or regex for the lightweight path), extracts every
`NAC.register({...})` call from inline scripts, and cross-checks
the same coherence rules. Hooked to GitHub Actions and to a local
`pre-commit` git hook. Blocks the commit if any rule fails.

**Effort estimate.**

| Task | Where | Effort |
|---|---|---|
| `NAC.register` strict mode | `js/nac.js` | 2h |
| `validate_global` new findings | `js/nac.js` | 2h |
| Pre-commit lint script | `tools/nac/check_demos.mjs` | 4h |
| Migration sweep over existing demos | `example-v*.php` | 1h |
| Doc updates in spec | `docs/spec.md` etc. | 1h |
| Tests + CI wiring | `tests/` + `.github/workflows/` | 2h |

Total: ~12h focused.

**Backwards compatibility.**

v2.2 release notes must declare:
- `NAC.register` now emits `console.error` on role drift
  (non-throwing).
- v2.3 will start throwing `RegisterError` on the same conditions.
- Adopters should run `NAC.validate_global()` before shipping.

The migration path for the existing 6 demos in this repo is
already done as of commit `0633e080` (2026-05-09): the v21
demo's tab buttons + manifest were corrected to `role:'tab'`.

---

## V22-02 -- Action-ack contract enforcement

**Problem class.** Click handlers that do their work synchronously
must `dispatchEvent(new CustomEvent('nac:action:succeeded',
{detail:{plugin,action_id}}))` after the side effect. Brownfield
panels often forget. The runtime then times out the 5s ack-poll
even though the side effect already happened, and the chat or
agent reports `No pude ejecutar X: timeout`.

**Concrete trigger (2026-05-09).** Pablo: `hide` -> panel hides
correctly, chat says "No pude ejecutar v20_panel.toggle: timeout".
Same for every button on the v20-panel.

**The previous workaround was wrong.** Commit `ad200e4c` swallowed
`err.code === 'timeout'` as success in the chat agentic loop.
Pablo correctly flagged that as masking real failures (handler
hung, network race, unhandled exception) and breaking the
runtime's only honest signal. Reverted in `c9bf2bdb`.

**The right fix shipped already.** Wrap `bind()` in
`example-v20-full.php` to auto-emit
`nac:action:succeeded`/`nac:action:failed` after every handler.
Done in `c9bf2bdb`.

**Proposed contract change for v2.2.**

The runtime SHOULD provide a helper:

```js
NAC.bindAction(el, handler, { plugin, action_id })
```

that takes care of the ack emission automatically. Same surface
as `addEventListener('click', handler)` but with the conformance
contract baked in. Demos that adopt the helper cannot forget.

`validate_global` adds a new finding:

- `action_handler_without_ack` -- detected via instrumentation:
  during `validate_global` the validator dispatches a synthetic
  click on each `data-nac-role="action"` element under a
  controlled context, listens for `nac:action:succeeded` for
  500ms, and flags the ones that don't fire.

This finding is opt-in (`NAC.validate_global({ probe: true })`)
because synthetic clicks have side effects.

**Effort.** ~3h for the helper + ~4h for the probe-based finding.

---

## V22-03 -- Locale-switch detector hardening

**Problem class.** Bare 2-letter locale codes in the chat client's
language detector (`'de'`, `'es'`, `'en'`) collide with prepositions
and articles in several languages. `cambia DE pestana` switched
the chat to German.

**The fix shipped already.** `nac-chat-client.js` `_detectLangSwitch`
now requires bare 2-letter codes to coexist with an explicit
`LOCALE_TRIGGER` (`idioma`/`language`/`sprache`/...). Done in
`f631d77a`.

**Proposed for v2.2.** Move the locale detector out of the chat
client into a NAC3 primitive, so every brownfield chat embed gets
the same hardened detector. Document the false-positive class
explicitly in the spec so future implementations don't reintroduce
the bug.

**Effort.** ~2h.

---

## V22-04 -- `tab_by_label` natural-language tolerance

**Already in.** Parens stripping (`"Lines (collection)"` matches
`"Lines"` and `"Lines tab"`) shipped in `f631d77a`. This is
**not** a legacy fallback -- it is legitimate normalisation of
LLM-quoted button text. Document in the spec as the canonical
matcher behaviour.

**Effort.** ~1h doc only.

---

## Out of scope for v2.2 (deferred to v2.3+)

- Composable role hierarchies (`role:'tab.primary'` vs
  `role:'tab.secondary'`): nice-to-have but no concrete trigger.
- Manifest hot-reload: still rare; current page reload is fine.
- Multi-locale label search across all 10 locales simultaneously
  (today the matcher iterates them serially, which is fine for
  ~20 tabs per plugin).

---

## V23-01 -- Field editor primitive (preview shipped)

**Problem class.** Voice runners + agents have no general way to
deeply manipulate text inside a `<input>` or `<textarea>` --
they can only `NAC.fill(id, value)` which replaces everything.
Real-world tasks (correct grammar inside a paragraph, replace
just the selection, AI-improve a sentence) need finer-grain
verbs. Today every adopter who needs this rolls their own.

**Solution.** A new runtime primitive `NAC.edit_field(nac_id)`
opens a modal that owns the editing surface and registers its
own plugin `nac_editor` with 8 canonical verbs:

| Verb | Description |
|------|-------------|
| `select_word` | select the word at the caret |
| `select_sentence` | select the sentence at the caret |
| `select_all` | select all text |
| `replace` | replace selection with given text |
| `delete_selection` | delete current selection |
| `ai_correct_syntax` | POST current value to chat backend, replace with AI-corrected version |
| `save` | write back to source field, close modal |
| `cancel` | discard, close modal |

The modal's manifest is registered idempotently (multiple
`edit_field` calls share one `nac_editor` plugin). All verbs
carry `label_i18n` for all 10 locales.

**Status:**
- Runtime: SHIPPED 2026-05-10 in `js/nac.js` (functions
  `edit_field` + `_editorRegisterManifest` + ack-emitting
  modal handlers).
- Demo: SHIPPED 2026-05-11 at `example-v23-editor.php`
  (3 editable fields + live verb counters wired to
  `nac:action:succeeded`).
- Tests: SHIPPED 2026-05-11 at
  `packages/nac/test/v23-editor.mjs` (8/8 PASS): exists +
  invalid id throws + invalid role throws + mounts modal +
  registers plugin + idempotent + cancel closes + save
  closes.
- Spec: section to be added to SPEC.md sec 13 as part of the
  v2.3 GA cycle.

**Effort to GA.** Beyond what is already in: native-locale
label review for ja/zh/ar/hi (~2hrs), Playwright e2e visual
spec (~3hrs), spec text in SPEC.md (~2hrs).

---

## How items move from this doc to the spec

1. Implement + ship the runtime change behind a feature flag.
2. Update demos so they pass the new strict validation.
3. Soak in production for at least one release cycle with the
   flag default to `warn` (non-throwing).
4. Move the rule into `docs/spec.md` and bump default to `error`
   (throwing) in the next minor.
5. Strike the entry from this roadmap and add a one-line entry
   to `docs/CHANGELOG.md`.
