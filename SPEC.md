# NAC3 -- Native Agent Contract

**Version:** 2.3.0
**Status:** Stable (npm `@nac3/runtime@2.3.0`)
**Benchmark:** 600 runs across 5 models x 3 protocols -- [results](./benchmark/)
**License:** Apache-2.0
**Editor:** Yujin (yujin.app)
**RFCs in flight:** see [/rfcs/](./rfcs/) for V24-04 (snapshot versioning, enforcement opt-in in 2.3.0) and V24-05 (authority, draft for 2.4).

---

## 0. Purpose

NAC3 is a contract between web UIs and the agents that drive them.
Agents include voice runners, LLM intermediaries, RPA bots,
accessibility tools, and end-to-end test runners. The contract
specifies:

1. **How elements are named** -- so an agent can ask "click the
   save button" and resolve it to a single DOM node.
2. **How verbs apply** -- so an agent can call `NAC.click(id)`,
   `NAC.fill(id, value)`, `NAC.tab(plugin, key)`, etc., without
   per-app glue.
3. **How completion is signalled** -- so an agent knows when a
   step finished, with a deterministic event family per role.
4. **How provenance is preserved** -- so a downstream system can
   tell a real user click from a synthesised one.

NAC3 adds a thin layer on top of whatever framework you already
render with. It does not replace ARIA, React, Vue, or your design
system.

---

## 1. Roles

Every agent-relevant DOM element carries `data-nac-role`. The
canonical roles are:

| Role | Meaning | Example |
|------|---------|---------|
| `plugin` | A self-contained UI module (a page, a panel, a widget collection). | `<article data-nac-plugin="invoice">` |
| `section` | A landmark inside a plugin (header, body, footer, sidebar). | `<section data-nac-role="section">` |
| `region` | A nameable area inside a section (a card cluster, a result list). | `<div data-nac-role="region">` |
| `action` | A clickable widget that triggers a verb (button, link-as-button). | `<button data-nac-role="action" data-nac-action="save">` |
| `field` | An input the user types or toggles (text, number, checkbox, radio, date, file). | `<input data-nac-role="field">` |
| `option` | A selectable option inside a field (combobox / select / radio group child). | `<li data-nac-role="option">` |
| `tab` | A switchable panel selector. **Required when `data-nac-id` matches `^tab\.`** | `<button data-nac-role="tab" data-nac-id="tab.lines">` |
| `breadcrumb-item` | A breadcrumb hop. | `<a data-nac-role="breadcrumb-item">` |
| `accordion-toggle` | An expand/collapse control. | `<button data-nac-role="accordion-toggle">` |
| `step` | A wizard step indicator. | `<li data-nac-role="step">` |
| `pagination-item` | A page-jump control in a paginated list. | `<button data-nac-role="pagination-item">` |
| `confirm-button` | A confirm/cancel button inside a confirm dialog. | `<button data-nac-role="confirm-button">` |
| `sort-control` | A column sort header. | `<th data-nac-role="sort-control">` |
| `filter-control` | A column filter trigger. | `<button data-nac-role="filter-control">` |
| `data-table` | A data-table host (v2.1). | `<table data-nac-role="data-table">` |
| `navigation` | A landmark navigation region. **Not a tab.** | `<nav data-nac-role="navigation">` |
| `confirm-dialog` | The modal of a confirmation request. | `<div data-nac-role="confirm-dialog">` |

Roles outside this list are reserved for future use. A NAC-strict
runtime SHOULD reject unknown roles at register-time (v2.2). A
NAC-permissive runtime MAY treat unknown roles as `action` for
back-compat (v1.9 and v2.0 default).

---

## 2. Names

Every agent-resolvable element carries `data-nac-id`. The id is:

- **A dotted path** (e.g. `deals.list.row.42.actions.delete`).
  Dots separate semantic levels; the runtime does not interpret
  them, but humans and LLMs do.
- **Globally unique within a `(data-nac-plugin, data-nac-plugin-id)`
  instance scope.** Two different plugins MAY share an id; the
  runtime resolves by `(plugin, plugin_instance_id, id)` pair.
  See sec 7.4 for the plugin slug uniqueness contract.
- **Stable across re-renders.** Frameworks that produce a new id
  per render (random hashes, instance counters) break the contract.
- **Stable across UI redesigns.** A button moves from the toolbar
  to a dropdown; its id MUST stay the same.

Reserved id prefixes (v2.1):

| Prefix | Reserved for |
|--------|--------------|
| `tab.` | Tab buttons. Role MUST be `tab`. |
| `modal.` | Modal-scoped elements. Role is the leaf widget's role. |
| `field.` | Form field shorthand. Role MUST be `field` or `option`. |
| `confirm.` | Confirm dialogs. |

---

## 3. Verbs

A `data-nac-role="action"` element MAY carry `data-nac-action="<verb>"`
naming what it does. The verb is a free-form snake-case identifier
agreed between the host and the agent. Common verbs:

`save`, `cancel`, `submit`, `delete`, `edit`, `view`, `create`,
`approve`, `reject`, `send`, `download`, `upload`, `refresh`,
`expand`, `collapse`, `open`, `close`, `add_row`, `remove_row`.

`NAC.click_by_verb(plugin, verb)` resolves a verb to the unique
action under that plugin and clicks it. Multiple actions sharing
the same verb under one plugin is a manifest error (lint:
`duplicate_verb`).

---

## 4. Manifest

Every plugin MAY register a manifest via:

```js
NAC.register({
  plugin_slug: 'invoice',
  version:     '1.0.0',
  nac_version: '2.1',
  elements: [
    { id: 'invoice.save', role: 'action',
      actions: [{ verb: 'save', label_i18n: { es: 'Guardar', en: 'Save', ... } }],
      label_i18n: { es: 'Guardar factura', en: 'Save invoice', ... } },
    ...
  ],
  tabs: [
    { nac_id: 'tab.lines', label_i18n: { es: 'Lineas', en: 'Lines' } },
    ...
  ],
  fields: [
    { id: 'field.client_name', type: 'text', required: true,
      label_i18n: { es: 'Cliente', en: 'Customer' } },
    ...
  ],
  data_tables: [...]
});
```

The manifest is the agent-facing source of truth. An LLM
intermediary that decides "the user said 'guardar'" looks up the
plugin manifest, finds the verb `save`, and emits
`NAC.click_by_verb('invoice', 'save')`.

### 4.1 Required fields

- `plugin_slug` -- matches `data-nac-plugin` on the host element.
- `nac_version` -- the NAC3 version this manifest claims to comply
  with. Runtime rejects manifests claiming a version higher than
  itself.

### 4.2 Optional fields

- `elements[]` -- the catalogue of named widgets. Each entry MUST
  have `id` and `role`.
- `tabs[]` -- a separate top-level array for tabs. Equivalent to
  `elements[]` entries with `role:'tab'`. Both shapes valid.
- `fields[]`, `actions[]`, `kpis[]`, `data_tables[]` -- typed
  sub-collections; same semantics as `elements[]` filtered by
  role. Demos pick the shape that reads cleanest to humans.

### 4.3 i18n

Every `label_i18n` MUST cover all 10 NAC3 locales:

```
es, en, pt, fr, ja, zh, hi, ar, de, it
```

`i18n_strict: 'permissive'` on `NAC.autoRegister.watch()` allows
partial coverage during brownfield migration; production manifests
should ship 10 locales.

---

## 5. Public API

### 5.1 Imperative

```ts
NAC.click(nac_id: string, opts?: ClickOpts): Promise<{ok: true}>
NAC.click_by_verb(plugin: string|null, verb: string, opts?): Promise<...>
NAC.fill(nac_id: string, value: string|number|boolean): Promise<...>
NAC.select(nac_id: string, value: string): Promise<...>
NAC.tab(plugin: string, tab_key: string): Promise<...>
NAC.tab_by_label(plugin: string|null, label: string): Promise<...>
NAC.go_to_section(nac_id: string): Promise<...>
NAC.drag_drop(source_id, target_id, opts?: {to_index?: number}): Promise<...>
NAC.set_mode(mode: 'modal'|'maximized'|'new_tab'|'new_window'): void
NAC.screenshot(): Promise<string>  // data URL
NAC.bindAction(el, handler, {plugin, action_id}): () => void  // v2.2
```

### 5.1.1 Conformance helper (v2.2)

`NAC.bindAction(el, handler, ctx)` is the spec-conformant way to
wire a click handler. It emits `nac:action:succeeded` (or
`:failed`) automatically after the handler runs (sync, throw, or
Promise). Returns an unbinder. Use this instead of raw
`addEventListener('click', ...)` whenever the host supports it;
brownfield code can still emit the event manually as before.

### 5.1.3 Field editor (v2.3 preview)

`NAC.edit_field(nac_id)` opens a modal that lets a user (or an
agent on their behalf) edit any text field with Word-style tools:

```ts
NAC.edit_field(nac_id: string): Promise<{ok:true}>
```

The modal registers under `plugin_slug='nac_editor'` with these
NAC-3 callable verbs:

| Verb | Effect |
|------|--------|
| `select_word` | select the word at the caret |
| `select_sentence` | select the sentence at the caret |
| `select_all` | ctrl-A within the editor |
| `replace` | replace selection with given text |
| `delete_selection` | remove current selection |
| `ai_correct_syntax` | POST current value to the LLM intermediary with system prompt "fix grammar + spelling, return only fixed text"; replace value with response |
| `save` | write back to source field, dispatch input + change events, close |
| `cancel` | discard, close |

Esc closes (cancel). Ctrl/Cmd+Enter saves. Click on overlay
backdrop cancels.

Spec sec 13 will formalise the contract in v2.3; the v2.2 runtime
ships a working reference impl so adopters can wire it today.
Available on any field via:

```js
NAC.edit_field('invoice.client_name');
// or by intermediary:
NAC.click_by_verb('myplugin', 'edit_field', { nac_id: 'invoice.client_name' });
```

### 5.1.2 Strict validation flag (v2.2)

`NAC.STRICT_VALIDATION` (boolean, default `false` in v2.2). When
`true`, `NAC.register()` throws an `Error` with `code='strict_validation'`
and a `findings` array on any of:

- `manifest_role_unknown` -- entry's role outside the canonical set.
- `tab_id_manifest_role_drift` -- id matches `^tab\.` but role
  is not `'tab'`.
- `manifest_dom_role_mismatch` -- mounted DOM element's
  `data-nac-role` differs from manifest entry's role.

In v2.3 the default flips to `true`. In v3.0 the flag is removed
(strict is the only mode).

All async methods reject with `NacError` whose `code` is one of:

- `not_found` -- the named element/role/verb is not in the DOM.
- `invalid` -- argument shape is wrong.
- `timeout` -- side effect dispatched but the conformance ack
  event did not arrive within 5 seconds. **A timeout means real
  failure**: the handler may have hung, the ack was never wired,
  a network race occurred. Callers MUST treat timeout as failure
  unless they have proof of side effect via another channel.

### 5.2 Introspection

```ts
NAC.describe():    { active: string|null, plugins: PluginSnap[] }
NAC.describe_v2(): { v2_scope_entries: [...], sitemap: ..., data_tables: [...] }
NAC.manifest(plugin_slug: string): Manifest|null
NAC.validate_global(opts?: {probe?: boolean}): Findings[]
```

### 5.3 Data tables (v2.1)

```ts
NAC.registerDataTable(spec: DataTableSpec): void
NAC.dt_add_row(table_id, values): {ok, row_id}
NAC.dt_remove_row(table_id, row_id): {ok}
NAC.dt_edit_cell(table_id, row_id, column, value): {ok} | {ok:false, error}
NAC.dt_set_cell(table_id, row, col, value): {ok} | {ok:false, error}
NAC.dt_select(table_id, target): {ok}
NAC.dt_commit(table_id): {ok, final_state} | {ok:false, errors:[...]}
NAC.dt_discard(table_id): {ok}
NAC.dt_state(table_id): TableState
NAC.dt_read_aggregate(table_id, agg_key, column): number|null
NAC.registerDataTableComputed(table_id, column, fn): void
```

A data table has a `subkind`:

- `collection` -- ordered rows with optional transactional commit.
  Used for invoice lines, cart items, log entries.
- `matrix` -- row x column grid where every cell carries a value.
  Used for permission matrices, schedule grids.
- `matrix-singletree` -- matrix where each row collapses into a
  tree (rare).

---

## 6. Events

Every action emits a deterministic completion event. The runtime's
`NAC.click()` polls for this event and resolves when it fires.

| Role | Success event | Failure event |
|------|---------------|---------------|
| `action` | `nac:action:succeeded` | `nac:action:failed` |
| `field` | `nac:field:changed` | -- |
| `option` | `nac:field:changed` | -- |
| `tab` | `nac:tab:activated` | -- |
| `breadcrumb-item` | `nac:breadcrumb:navigated` | -- |
| `accordion-toggle` | `nac:accordion:expanded` / `:collapsed` | -- |
| `step` | `nac:step:advanced` | -- |
| `pagination-item` | `nac:table:page_changed` | -- |
| `confirm-button` | `nac:confirm:resolved` / `:cancelled` | -- |
| `sort-control` | `nac:table:sort_changed` | -- |
| `filter-control` | `nac:table:filter_changed` | -- |

### 6.1 Event detail shape

Every event detail carries the canonical id field plus `plugin`:

```js
nac:action:succeeded {
  detail: { plugin: 'invoice', action_id: 'invoice.save', ... }
}
nac:tab:activated {
  detail: { plugin: 'invoice_edit_modal', tab_id: 'tab.lines', ... }
}
nac:field:changed {
  detail: { plugin: 'invoice', field_id: 'field.client_name',
            value: 'Acme Corp', ... }
}
```

### 6.2 Emitting from a host handler

A click handler MUST emit the corresponding success event after
its synchronous side effect:

```js
button.addEventListener('click', function (ev) {
  // ... do the work ...
  document.dispatchEvent(new CustomEvent('nac:action:succeeded', {
    detail: { plugin: 'invoice', action_id: 'invoice.save' }
  }));
});
```

If the work is asynchronous, emit after resolution. If the work
fails, emit `nac:action:failed` with `{detail: {plugin, action_id,
error: <message>}}`.

The v2.2 runtime will provide `NAC.bindAction(el, handler, ctx)`
that wraps `addEventListener` and emits automatically.

### 6.3 Why not use the click event itself?

A DOM `click` event fires before the handler runs. NAC3's contract
needs to know when the **side effect completed**, not when the
click started. Hence the separate event family.

---

## 7. Provenance

### 7.1 isTrusted

`event.isTrusted` is `true` for user-initiated clicks (real mouse,
real keypress, screen reader activation) and `false` for
synthesised clicks (`element.click()`, dispatchEvent of a built
MouseEvent, automation).

NAC3 MUST surface this via `event.detail.is_trusted` in the
success event. Hosts that take security-sensitive actions
(payment, deletion) MAY require `is_trusted === true` and reject
synthetic clicks. The reference demo `example-v20-full.php`
includes a button pair (`v20_panel.istrusted_real` and
`v20_panel.istrusted_fake`) that demonstrates the distinction.

### 7.2 HMAC-signed manifests

A manifest MAY carry a `provenance` block:

```js
NAC.set_provenance_secret('your-tenant-secret');
NAC.register({
  plugin_slug: 'invoice',
  ...,
  provenance: {
    signed_at: '2026-05-09T10:00:00Z',
    signed_by: 'tenant-X',
    signature: '<HMAC-SHA256 of manifest body>'
  }
});
```

The runtime computes the expected HMAC over a stable
serialisation of the manifest (excluding the signature itself)
and rejects manifests whose signature does not match. Used by
multi-tenant deployments to prevent a tenant from spoofing
another tenant's manifest.

### 7.3 Threat model

See `SECURITY.md` for the full threat model. Short version:

- NAC3 does not authenticate the **user**. That is your auth
  layer's job.
- NAC3 authenticates the **manifest** (HMAC).
- NAC3 distinguishes real clicks from synthesised clicks
  (isTrusted) so a host can refuse the latter for sensitive verbs.
- NAC3 does not protect against a malicious agent running with
  user-level access. Such an agent can do anything the user can.

### 7.4 Plugin slug uniqueness (v2.4)

A `data-nac-plugin="<slug>"` attribute identifies a plugin
**instance** in the DOM. The runtime resolves
`(plugin, nac_id)` pairs against these scopes, so the host MUST
guarantee unambiguous resolution.

**Rules.**

1. A given plugin slug MAY appear on more than one DOM root
   simultaneously (a "list view + side panel" combo for the same
   plugin family, a topbar mirror of an action that also lives in
   the body, etc).
2. **When the slug appears more than once, every root carrying it
   MUST also carry a unique `data-nac-plugin-id` attribute.** The
   pair `(data-nac-plugin, data-nac-plugin-id)` is the canonical
   instance key.
3. A single-root slug MAY omit `data-nac-plugin-id`; in that case
   `(slug, null)` is the instance key.

**Runtime enforcement (v2.4).**

- The constructor `NAC.register(manifest)` rejects the call
  synchronously with `NacError('duplicate_plugin_no_instance_id',
  ...)` when the DOM already contains multiple roots with the
  registered slug and any of them omits / duplicates
  `data-nac-plugin-id`.
- A boot-time pass (`nac:dom-ready` listener installed by the
  runtime) performs the same check across every `[data-nac-plugin]`
  root in the document. On the first violation it dispatches
  `nac:fatal` with `code='duplicate_plugin_no_instance_id'`,
  inserts a visible red banner at the top of `<body>`, and
  throws. The runtime then refuses every subsequent
  `describe`/`click`/`click_by_verb`/`tab` call.
- `NAC.click_by_verb` resolves verbs against the manifest first.
  When the manifest does not declare a top-level `actions[]` and
  the runtime falls back to DOM scanning, the scan iterates
  **every** `[data-nac-plugin="<slug>"]` root (not just the
  first), matching the first descendant `[data-nac-action="<verb>"]`
  it finds.
- `NAC.validate_global()` continues to emit
  `duplicate_plugin_no_instance_id` as a structured finding for CI
  pipelines that prefer non-fatal reporting.

**Migration from v2.3.**

The boot-time throw is enabled by default in v2.4. Authors who
need a one-release migration window can set
`NAC.HARD_DEDUP = false` before the runtime's
`DOMContentLoaded` listener fires. The flag is removed in v2.5.

**Why "throw" not "warn".**

Multiple roots sharing a slug without instance ids make every
`(plugin, nac_id)` lookup first-match-wins by document order.
That is non-deterministic across DOM rearrangements (drag-drop
sorts, conditional render order, framework re-mounts) and the
agent has no way to know which root won. v2.3 surfaced this only
through opt-in lint; v2.4 makes it a build-time gate.

---

## 8. Conformance levels

A page is **NAC-1 conformant** if:

- Every clickable widget that an agent should be able to operate
  carries `data-nac-id` and `data-nac-role`.
- Every `data-nac-role="action"` element fires
  `nac:action:succeeded` after its side effect.
- The page registers at least one plugin manifest via
  `NAC.register()`.
- `NAC.click(id)` works for every advertised id.

A page is **NAC-2 conformant** if it also:

- Registers `tabs[]`, `fields[]`, `actions[]` arrays explicitly
  in its manifest (not inferred from DOM).
- Provides `label_i18n` covering all 10 NAC3 locales for every
  user-facing label.
- Implements the v2.0 brownfield primitives: scope tree,
  ephemeral capture, autoRegister.watch.
- Passes `NAC.validate_global({probe: false})` with zero
  `error`-severity findings.

A page is **NAC-3 conformant** if it also:

- Carries HMAC-signed manifests.
- Distinguishes `isTrusted` for security-sensitive verbs.
- Passes `NAC.validate_global({probe: true})` with zero
  findings.

The NPM package's CLI (`npx @nac3/runtime validate <url>`) reports
the highest level a page reaches.

---

## 9. Versioning

NAC3 follows semver:

- **Major** bump: breaking change to public API or wire formats.
  Adopters edit code.
- **Minor** bump: new features, backward-compatible. Old code
  keeps working.
- **Patch** bump: bug fixes, doc-only changes.

Deprecation policy: a feature marked `@deprecated` in version
`X.Y.0` is removed no earlier than `(X+1).0.0`. The release notes
document every removal explicitly.

The NPM package version mirrors the spec version: `@nac3/runtime@2.1.3`
implements NAC3 v2.1 with three patch revisions.

---

## 10. Validators

### 10.1 Runtime: `NAC.validate_global()`

Walks the live DOM + the registered manifests + the i18n catalog
and returns an array of findings:

```ts
{
  severity: 'error' | 'warn' | 'info',
  code:     string,                     // e.g. 'tab_role_drift'
  nac_id:   string | null,
  message:  string,
  detail:   Record<string, any>
}
```

Findings codes are stable across patch releases; new codes only
in minor bumps.

### 10.2 CLI: `npx @nac3/runtime validate <target>`

Wraps `validate_global` plus a static lint of HTML/manifest
coherence. Exit codes:

- `0` -- no findings of severity >= configured threshold.
- `1` -- findings.
- `2` -- the target itself failed to load.

Useful in CI: `npx @nac3/runtime validate ./dist/index.html
--severity=error`.

---

## 11. The system around NAC3

NAC3 is a contract layer. To turn a NAC-conformant page into a
voice-driven app, you also need:

1. **A speech-to-text source** (browser SpeechRecognition,
   Whisper API, etc).
2. **An LLM intermediary** that takes user text + the page's
   `NAC.describe()` snapshot + an i18n hint and emits structured
   actions: `[{kind: 'click', nac_id: 'X'}, {kind: 'fill', nac_id:
   'Y', value: 'Z'}]`. See `guides/LLM_WIRING.md`.
3. **A chat client** that holds the conversation and dispatches
   the actions. The reference is `js/nac-chat-client.js`.
4. **A text-to-speech sink** for spoken replies (browser
   SpeechSynthesis, ElevenLabs, etc).

NAC3 standardises only step 2's input/output shape (the
`NAC.describe()` snapshot + the action shape). Steps 1, 3, 4 are
outside the spec; you compose what you like.

---

## 12. Stability guarantees

What this spec promises:

1. The set of canonical roles in section 1 will not shrink.
   New roles MAY be added in minor versions.
2. The event family in section 6 will not be renamed.
   New events MAY be added in minor versions.
3. The verbs of `NAC.click`, `NAC.fill`, etc. will not change
   shape in minor versions. New optional `opts` fields MAY appear.
4. The `validate_global` finding codes will not be reused for
   different conditions across minor versions.

What this spec does NOT promise:

1. Precise wording of error messages (those are i18n catalog
   strings; localisations may shift).
2. The DOM strategy for finding elements (`querySelector` today;
   may move to a faster index later).
3. The internal manifest cache layout. Treat manifests as
   write-only from the host side, read-only from the agent side.

---

## 13. Open questions (tracked separately)

- Should `data-nac-role="navigation"` ever resolve to a tab?
  Currently no (v2.1). The v22 roadmap argues for stricter
  rejection.
- Should `NAC.click()` accept relative ids (e.g. `'./save'` to
  mean "save under the active plugin")? Not in v2.1; possibly v2.3.
- Should manifests support inheritance / extension across plugins
  (one base manifest extended by a tenant)? Tracked as v3.0
  candidate.

---

## 13.5 Governance

NAC3 is currently stewarded by Yujin. The spec is published
under Apache 2.0; the reference runtime under MIT. Yujin
commits to moving NAC3 to a neutral foundation (W3C community
group, Linux Foundation, or equivalent industry body) if and
when adoption justifies neutral governance. Until then, spec
changes follow the RFC process documented in
`CONTRIBUTING.md`, with public comment period of at least 14
days for any change that affects the public API or wire
formats.

Adopters: the Apache 2.0 + MIT license combination guarantees
that the spec and runtime survive any change in Yujin's
corporate status. You can fork either, run either, and ship
either, today and after we are gone. This document records
the commitment so the path to that survival is explicit, not
implicit.

---

## 14. Reference implementation

The canonical implementation is the reference runtime distributed
as the NPM package `@nac3/runtime`. The runtime is feature-complete
for v2.1 and ships:

- `js/nac.js` -- v1.9 base + the public API in section 5.
- `js/nac-v2-extensions.js` -- the v2.0 brownfield primitives
  (scope tree, capture ephemeral, autoRegister, HMAC, isTrusted).
- `js/nac-chat-client.js` -- a reference chat client that wires
  voice + LLM + dispatcher.

Other implementations are welcome (Python for native automation
runners, Rust for embedded agents, etc). The spec, not the JS
code, is the authority.

---

*This document is the canonical NAC3 v2.1 specification. Edits to
this file constitute spec changes and require an RFC; see
`CONTRIBUTING.md`.*
