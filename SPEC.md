# NAC3 -- Native Agent Contract

**Version:** 2.5.0-alpha.5 (alpha.4 + Blocks B/C/D -- narrate, context+tree, expect+diff -- complete v2.5 surface SHIPPED)
**Status:** v2.5.0-alpha.5 -- all 8 SHIPPED RFCs (V24-01/02/04/05 + V25-01/02/03/04) have runtime + Layer 2 visual + Layer 3 Pilot LIVE evidence. Promoted to npm dist-tag `latest`.
**License:** Apache-2.0
**Editor:** Yujin (yujin.app)

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
- **Globally unique within a `data-nac-plugin` scope.** Two
  different plugins MAY share an id; the runtime resolves by
  `(plugin, id)` pair.
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

### 5.1.3 Field editor (v2.3)

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

### 5.1.4 Action payload + invoke (v2.3)

NAC v2.2 actions are click-and-go: an agent triggers `NAC.click(id)`
or `NAC.click_by_verb(plugin, verb)` and the host runs whatever it
does. This works for verb-and-state actions (`save`, `cancel`,
`submit`, `delete`) but collapses when an action needs **data**
from the agent -- `utter(text)`, `search(query)`,
`send_message(body)`, `upload(file)`, `schedule(date)`,
`translate(text, target_lang)`. The host has no way to receive
the agent's payload via a synthetic click.

v2.3 closes this gap. The contract is additive: click-style
verbs continue to work unchanged.

```ts
NAC.invoke(action_id: string, payload: object, opts?: { timeout?: number })
  : Promise<{ok: true, request_id: string, ack: object|null}>

NAC.utter(action_id: string,
          opts: { text: string, lang?: string, voice?: string, metadata?: object })
  : Promise<{ok: true, request_id: string, ack: object|null}>
```

`NAC.invoke` dispatches a `nac:action:requested` `CustomEvent`
on the host element (bubbles to document) with:

```ts
detail: {
  action_id:  string,    // canonical nac_id of the host element
  verb:       string,    // payload.verb || el's data-nac-action
  payload:    object,    // arbitrary, action-specific
  plugin:     string|null,
  request_id: string,    // correlation token assigned by the runtime
  ts:         number,    // Date.now()
}
```

The host listens for `nac:action:requested`, processes the
payload, and emits `nac:action:succeeded` (or `nac:action:failed`)
with the same `request_id` in the detail. The runtime correlates
by `request_id` and resolves the agent's Promise.

Default timeout is **30 seconds** (vs 5 s for click). Override
with `opts.timeout`. On timeout, the Promise rejects with
`NacError('timeout', ...)`. As with click, a timeout means real
failure: callers MUST treat it as such unless they have side-
effect proof via another channel.

`NAC.utter(id, opts)` is the ergonomic shortcut for the most
common payload-bearing verb. It is equivalent to:

```js
NAC.invoke(id, { verb: 'utter', text: opts.text, lang: opts.lang });
```

#### Manifest declaration

A payload-bearing action declares its payload schema in the
manifest entry for traceability and tooling:

```js
NAC.register({
  plugin_slug: 'atlas_pro_ad',
  version:     '2.1.0',
  nac_version: '2.3',
  elements: [
    { id: 'atlas_pro_ad.mic', role: 'action',
      actions: [
        { verb: 'listen' },
        { verb: 'utter',
          payload_schema: {
            text: { type: 'string', required: true, max: 4000 },
            lang: { type: 'string',
                    enum: ['en','es','pt','fr','it','de','ja','zh','hi','ar'] }
          },
          label_i18n: { es:'Decir', en:'Utter', /* ... 10 locales */ } }
      ],
      label_i18n: { /* ... */ } }
  ]
});
```

`payload_schema` is informational in v2.3 stable. Agents MAY
validate before sending; runtimes MAY enforce it when
`STRICT_VALIDATION` is `true`. Schemas are intentionally simple
(JSON-Schema-shaped subset) so a runtime can validate without
shipping a full JSON-Schema validator. v2.4 will formalise the
schema grammar and turn enforcement into a default.

#### Disabled-state semantics (v2.3 hotfix from alpha.2)

`NAC.invoke` does NOT reject when the target element has
`disabled` or `aria-disabled='true'` set. The `disabled` HTML
attribute is a UX click guard; `invoke` is a logical
payload-bearing request, not a synthetic click. Hosts that need
to refuse an invoke based on UI state MUST do it in their
`nac:action:requested` listener and emit `nac:action:failed`
with a meaningful error code.

`NAC.click`, by contrast, STILL rejects on disabled elements
(click semantics preserved). Test coverage:
`runtime/test/v23-invoke.mjs` T7/T8/T9.

#### Conformance: hosts that support invoke MUST

1. Declare `actions[].payload_schema` in the manifest entry.
2. Listen for `nac:action:requested` (or use a generic listener
   that filters by `detail.action_id` + `detail.verb`).
3. Emit `nac:action:succeeded` -- with `detail.request_id`
   echoed back -- after processing, or `nac:action:failed`
   (with `detail.error` code) on failure.
4. NEVER emit a `:succeeded` event with a `request_id` they did
   not receive (prevents cross-talk between concurrent invocations).

Hosts that do NOT support invoke continue to operate normally
under `NAC.click()` and `NAC.click_by_verb()`. Agents that call
`NAC.invoke()` against a host without an `actions[].payload_schema`
entry will still receive a `request_id` but the runtime cannot
guarantee delivery; the timeout fires after 30 s.

#### Why this matters

The full agentic surface stops being "list of buttons" and
becomes "list of buttons + structured inputs". A voice ad becomes
NAC.invoke-able. A search bar becomes NAC.invoke-able. A
file upload becomes NAC.invoke-able. Same protocol, same
provenance, same ack semantics.

The first reference adopter is **Atlas Pro** -- its
`atlas_pro_ad.mic` element declares both `listen` (click-only,
existing) and `utter` (payload-bearing) verbs. The same
`/parse` + `/tts` conversational loop drives in either case;
agents that have STT call `listen`, agents that have their own
language model call `utter`.

#### Forward modalities (anticipated, no spec change required)

`invoke` is intentionally modality-agnostic so future input
families plug in without breaking the contract:

| Modality | Verb (sketch)         | Payload (sketch)                                |
|----------|-----------------------|--------------------------------------------------|
| Text     | `utter`               | `{text, lang?}`                                  |
| Search   | `search`              | `{query, scope?, limit?}`                        |
| File     | `upload`              | `{filename, mime, data_url \| stream_id}`        |
| Image    | `analyze_image`       | `{image_url \| data_url, prompt?}`               |
| Video    | `analyze_stream`      | `{stream_url, frame_window_ms?, return?}`        |
| Schedule | `schedule`            | `{datetime, duration_min, attendees?}`           |
| Code     | `apply_diff`          | `{file_path, unified_diff}`                      |
| Voice    | `transcribe`          | `{audio_url \| data_url, lang?}`                 |

Each modality follows the same `nac:action:requested` ->
`nac:action:succeeded` / `:failed` event protocol, the same
`request_id` correlation, the same timeout semantics. The
runtime stays small; the verb vocabulary grows by convention
between hosts and agents. Ergonomic shortcuts (`NAC.utter`,
`NAC.search`, `NAC.watch`, etc.) can be added later without
re-spec because each is a thin wrapper over `invoke`.

### 5.1.5 Shadow DOM resolution -- open roots (v2.3)

The runtime resolves `data-nac-id` references through open
shadow roots recursively. A page can mount Web Components
using `attachShadow({mode:'open'})`, place
`data-nac-*` attributes on elements inside the shadow tree,
and any NAC3 caller (`NAC.click`, `NAC.fill`, `NAC.invoke`,
etc.) resolves the target transparently.

#### Resolution algorithm

For a selector `S` (typically `[data-nac-id="..."]`) against a
root `R` (typically `document`):

1. `R.querySelector(S)` -> if non-null, return immediately.
2. For every descendant `el` of `R`:
   - If `el.shadowRoot` is non-null (i.e. open shadow root):
     recurse with `R := el.shadowRoot`, depth +1.
   - Else if `el.nac3` is an object exposing a `query` method,
     delegate (see sec 5.1.6).
3. The recursion is **depth-capped at 10 levels**. Targets
   deeper than 10 are unreachable; the caller receives
   `code='not_found'`. The cap exists to prevent pathological
   walks; in practice no production codebase nests more than
   3-4 shadow levels.
4. The walk is breadth-of-DOM-order: siblings before nested
   shadows. First match wins.

#### Event propagation

Events emitted by hosts inside shadow roots MUST set
`composed: true` for document-level listeners to receive them.
The NAC3 runtime emits all its own events with `composed:true`
already; host code that emits manual `nac:*` events is
responsible for the same. Without `composed:true` the event
stops at the shadow boundary and the runtime's correlation
machinery never sees it.

#### Author responsibility

The component author needs to:

1. Place `data-nac-id`, `data-nac-role`, `data-nac-action` on
   operable elements inside the shadow root.
2. Set `composed:true` on any custom event the host emits to
   signal a NAC3 contract (`nac:action:succeeded`,
   `nac:field:changed`, etc.).
3. Avoid `<slot>` for elements that need to be
   shadow-isolated -- slotted nodes live in light DOM and are
   resolved there instead.

No manifest hint or runtime opt-in is required for open shadow
roots; the resolution is automatic.

#### Reference implementation

The reference runtime exposes two internal helpers,
`_deepQuery(selector, root)` and
`_deepQueryAll(selector, root)`, that perform the walk. Public
helpers `NAC.click`, `NAC.fill`, `NAC.invoke`,
`NAC.describe`, etc. all go through the deep variants.

#### Demos and tests

- `example-v23-shadow-open.php` -- 1-, 2-, and 3-level nested
  open shadow demos.
- `runtime/test/v23-shadow.mjs` T1-T3, T10 -- unit
  coverage including depth cap.

### 5.1.6 Shadow DOM resolution -- closed roots, voluntary exposure (v2.3)

Closed shadow roots (`attachShadow({mode:'closed'})`) are
opaque from outside the component author's code -- a browser
security boundary, not a NAC3 decision. NAC3 cannot reach
inside unless the component author voluntarily exposes a
queriable surface via the contract below.

#### The `el.nac3` interface contract

A custom element MAY expose an interface object on its host
via a getter named `nac3`:

```ts
interface NAC3HostInterface {
  query(selector: string): Element | null;        // MANDATORY
  queryAll(selector: string): Element[];          // RECOMMENDED
  describe?(): Array<{                            // OPTIONAL
    id:    string;
    role:  string;
    action?: string;
    label?: string;
  }>;
}
```

Components opt in by implementing the getter. Components that
do NOT opt in remain inaccessible to NAC3 callers (their
internals stay private, as the browser intends).

#### Resolution semantics

During `_deepQuery(selector)`, for every visited element `el`
with `el.shadowRoot === null`:

1. If `typeof el.nac3 === 'object'` and `el.nac3.query` is a
   function, the runtime calls `el.nac3.query(selector)`:
   - Return value is an Element -> resolved.
   - Return value is `null` -> not a match in this shadow.
   - Return value is anything else -> emit
     `nac:shadow_protocol_violation` (once per host) and skip.
   - Throws -> emit `nac:shadow_blocked` (reason
     `'exposure_threw'`, once per host) and skip.
2. Else if `el.hasAttribute('data-nac-shadow') === true` and
   the attribute value is `'closed'` AND there is no `nac3`
   interface present, the runtime emits `nac:shadow_blocked`
   (reason `'not_exposed'`, once per host). Author opt-in to
   the "I am a deliberately closed component" debug signal.
3. Else: the element is treated as a normal light-DOM
   element with no shadow root.

#### Error event detail shapes

`nac:shadow_blocked` detail:

```ts
{
  host:   Element,     // the closed-shadow host
  reason: 'exposure_threw' | 'not_exposed',
  ts:     number       // Date.now()
}
```

`nac:shadow_protocol_violation` detail:

```ts
{
  host:           Element,
  message:        string,            // diagnostic message
  value_snapshot: string,            // truncated value preview
  ts:             number
}
```

Both events bubble (`bubbles: true`) and cross shadow
boundaries (`composed: true`). Dedup is per-host via a
WeakSet kept by the runtime; the same host emits each event
**at most once per page load**.

#### Why voluntary

The browser enforces closed-shadow opacity. Even if NAC3
defined a non-voluntary mechanism, the browser would prevent
it. Voluntary exposure puts the component author in full
control of what their public surface looks like for agents.

The cost is per-component opt-in; the benefit is that
NAC3-compliant agents work against design systems with closed
shadow components (Salesforce Lightning, some GitHub Primer
components, security-sensitive widgets) without per-component
adapter code.

#### Demos and tests

- `example-v23-shadow-closed.php` -- positive
  (`<todo-card-closed-exposed>`) and negative
  (`<todo-card-closed-blind>`) side-by-side with verdict
  panels + live event log.
- `runtime/test/v23-shadow.mjs` T4-T9 -- unit coverage
  for every error event family plus dedup semantics.
- `guides/SHADOW_DOM_CLOSED.md` -- authoring guide.

### 5.1.7 Auth-aware capabilities (v2.3)

NAC3 v2.3 lets the manifest declare per-action capability
requirements that gate `NAC.click` and `NAC.invoke` before
dispatch. The agent receives a fast rejection
(`code='capability_required'`) instead of a round-trip that
fails server-side.

#### Manifest declaration

A capability requirement attaches at the element level or at
the verb level. Verb-level wins if both are present.

```js
NAC.register({
  plugin_slug: 'fin',
  version:     '1.0.0',
  nac_version: '2.3',
  elements: [
    // Element-level (covers all verbs on this id).
    { id: 'fin.invoice.delete', role: 'action',
      requires_capability: 'finance.delete_invoice',
      actions: [{ verb: 'delete' }] },

    // Verb-level (more granular).
    { id: 'fin.invoice.edit', role: 'action',
      actions: [
        { verb: 'edit',
          requires_capability: 'finance.edit_invoice' },
        { verb: 'view',
          /* no capability -> always allowed */ }
      ] },

    // Array value: OR semantics.
    // ("at least one of these capabilities matches")
    { id: 'fin.invoice.approve', role: 'action',
      requires_capability: ['finance.approve',
                            'finance.admin'],
      actions: [{ verb: 'approve' }] }
  ]
});
```

For AND semantics ("user needs ALL of these caps"), declare
each via separate gated actions or compose at the host level
in the `nac:action:requested` listener.

#### Public API

```ts
NAC.setCapabilities(caps: string | string[] | null): void
NAC.grantCapability(cap: string): void
NAC.revokeCapability(cap: string): void
NAC.userCapabilities(): string[]
```

`setCapabilities` replaces the entire set (use for login /
session refresh). `grantCapability` / `revokeCapability` are
incremental. `userCapabilities` returns a snapshot array.
`setCapabilities(null)` clears the set.

Hosts call these whenever the user's role changes. The set
lives in the runtime; no manifest reload is required.

#### Gate semantics

Before dispatch, `NAC.click(id)` and `NAC.invoke(id, payload)`
look up the matching manifest entry (element + verb), read
`requires_capability`, and call `_hasCapability`:

- No requirement declared -> allow.
- Requirement declared, current set satisfies it -> allow.
- Requirement declared, current set does NOT satisfy -> reject
  with `NacError('capability_required', ...)` AND emit
  `nac:command:rejected` with `detail.reason='capability_required'`.

The gate runs AFTER `not_found` / `disabled` / `hidden` checks
on `click` so the most specific failure surfaces. On `invoke`,
the gate runs before the request event fires (the host never
sees an unauthorised attempt).

#### Why this matters

Without the gate, an agent calling `NAC.click('finance.delete')`
either succeeds (no auth gate at all -> security hole) or
fails server-side with a 403 several seconds later. With the
gate, the agent learns synchronously that it lacks the
capability and can react appropriately (request a different
flow, ask for elevation, surface the constraint to the user).

This complements -- it does not replace -- server-side
authorisation. Hosts MUST still enforce permissions on the
server. The client gate is a UX optimisation and an
intent-level signal, not a security boundary.

#### Demos and tests

- `runtime/test/v23-capabilities.mjs` -- 17 assertions
  covering set/get, grant/revoke, click gate, invoke gate,
  verb-level vs element-level resolution, OR semantics,
  null-clear, invalid-input rejection, regression for
  unguarded actions.

### 5.1.2 Strict validation flag (v2.2; default-flipped in v2.3)

`NAC.STRICT_VALIDATION` (boolean). When `true`, `NAC.register()`
throws an `Error` with `code='strict_validation'` and a
`findings` array on any of:

- `manifest_role_unknown` -- entry's role outside the canonical set.
- `tab_id_manifest_role_drift` -- id matches `^tab\.` but role
  is not `'tab'`.
- `manifest_dom_role_mismatch` -- mounted DOM element's
  `data-nac-role` differs from manifest entry's role.

**Default value:**

- **v2.2.x:** `false` (warning-only). Adopters needed a migration
  window.
- **v2.3.x:** **`true`** (throwing). The migration window closed
  with the v2.2 line. Adopters with drift-laden manifests opt
  out by setting `NAC.STRICT_VALIDATION = false` BEFORE any
  `register()` call.
- **v3.0:** flag removed (strict is the only mode).

See `guides/MIGRATION_v2.2_to_v2.3.md` for the playbook to clean
up drift findings.

All async methods reject with `NacError` whose `code` is one of:

- `not_found` -- the named element/role/verb is not in the DOM.
- `invalid` -- argument shape is wrong.
- `disabled` -- element has `disabled` or `aria-disabled='true'`
  (`NAC.click` only; `NAC.invoke` no longer checks per v2.3
  hotfix, see sec 5.1.4).
- `hidden` -- element is offscreen / `aria-hidden='true'` /
  zero-dimension.
- `capability_required` -- manifest declared
  `requires_capability` and the current
  `NAC.userCapabilities()` set does not satisfy it (v2.3, see
  sec 5.1.7).
- `timeout` -- side effect dispatched but the conformance ack
  event did not arrive within 5 seconds (30 seconds for
  `invoke`). **A timeout means real failure**: the handler may
  have hung, the ack was never wired, a network race occurred.
  Callers MUST treat timeout as failure unless they have proof
  of side effect via another channel.

### 5.2 Introspection

```ts
NAC.describe():    { active: string|null, plugins: PluginSnap[] }
NAC.describe_v2(): { v2_scope_entries: [...], sitemap: ..., data_tables: [...] }
NAC.manifest(plugin_slug: string): Manifest|null
NAC.validate_global(opts?: {probe?: boolean}): Findings[]
```

### 5.3 Data tables (v2.1)

The data-table primitives are NOT part of the core runtime
(`js/nac.js` / `@nac3/runtime`'s `nac.mjs`). They ship in the
brownfield extensions module `js/nac-v2-extensions.js`
(published as `@nac3/runtime/extensions`), which attaches them
onto the same `window.NAC` object after it loads. Load the
extensions module after the core runtime to get the `dt_*`
surface:

```html
<script src="https://yujin.app/nac-spec/js/nac.js"></script>
<script src="https://yujin.app/nac-spec/js/nac-v2-extensions.js"></script>
```

```js
// or with the npm package:
import '@nac3/runtime';
import '@nac3/runtime/extensions';
```

The methods below are present only when the extensions module
is loaded; calling them on a core-only runtime is a no-op /
`undefined`.

```ts
NAC.registerDataTable(spec: DataTableSpec): string   // returns table_id
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

### 5.4 Strict resolution + disambiguation (v2.4)

NAC3 v2.4 makes id / verb / qualifier / label resolution
**strict**. The verbs that resolve a request to a single DOM
element -- `click_by_verb`, `tab` (single-arg form), and
`tab_by_label` -- no longer guess. When a request resolves to
zero candidates or to more than one, the runtime throws a
`NacError` carrying the candidate list AND emits a
`nac:disambiguation_requested` event, instead of silently
dispatching to the first near-match.

This is the **zero-silent-damage** invariant. It exists for
assistive-software and agent callers, where a silent dispatch to
the wrong element with no recovery path is a safety blocker. The
pre-2.4 lenient behaviour -- a substring `indexOf` fallback that
resolved to the first near-match -- is removed.

> Backward compatibility: v2.4 is a *behaviour-of-contract*
> change. Code paths that already supplied unambiguous arguments
> keep working unchanged. Code paths that depended on the lenient
> `indexOf` fallback to resolve to the first near-match will now
> throw -- by design.

#### 5.4.1 Strict qualifier matching (`click_by_verb`)

`click_by_verb(plugin, verb, opts?)` selects among DOM nodes that
share `data-nac-action="<verb>"`. When `opts.qualifier` (a string)
is supplied, an element matches **only** if its `data-nac-id`
satisfies:

```js
id === qualifier || id.endsWith('__' + qualifier)
```

That is: exact id equality, or an anchored suffix after a `__`
separator. There is **no substring fallback**. A qualifier that
is a mere substring of an id (not equal, not an anchored
`__suffix`) does NOT match.

- 0 matches -> throw `NacError('no_matching_instance', ...)`.
- exactly 1 match -> resolves and clicks.
- >1 matches -> throw `NacError('ambiguous_qualifier', ...)`.

`opts.qualifier_ordinal` (a number) selects positionally across
all DOM elements sharing the verb, bypassing qualifier matching.

#### 5.4.2 Strict id resolution (`tab`)

`tab(plugin, id)` single-arg form: an exact `data-nac-id` match
in the DOM wins. Otherwise the runtime looks for instances whose
id starts with `id + "__"`:

- 0 qualified instances and no exact id -> `no_matching_instance`.
- exactly 1 -> resolves.
- >1 -> `ambiguous_tab` (pass the full qualified id).

#### 5.4.3 Strict label resolution (`tab_by_label`)

`tab_by_label(plugin, label)` resolves a human label to a tab,
trying, in order: exact manifest-label match, fuzzy/substring
manifest match, exact DOM-text match, fuzzy DOM-text match. If
any tier yields more than one match it throws
`NacError('ambiguous_label', ...)`; if no tier matches it throws
`NacError('not_found', ...)`. The emitted event's `reason` field
records which tier was ambiguous (`ambiguous_label_exact`,
`ambiguous_label_fuzzy`, `ambiguous_label_exact_dom`,
`ambiguous_label_fuzzy_dom`, or `no_matching_label`).

#### 5.4.4 Error codes

| `err.code` | Thrown by | Meaning |
|------------|-----------|---------|
| `no_matching_instance` | `click_by_verb` (qualifier), `tab` | zero elements match the qualifier / id |
| `ambiguous_qualifier`  | `click_by_verb` | >1 element matches the qualifier |
| `ambiguous_tab`        | `tab`           | >1 qualified `id__` instance matches |
| `ambiguous_label`      | `tab_by_label`  | >1 tab matches the label (any tier) |
| `not_found`            | `tab_by_label`  | no tab matches the label at all |

#### 5.4.5 The `err.candidates` shape

Every disambiguation error carries a `candidates` array. Each
candidate is exactly:

```ts
{ nac_id: string, label: string }
```

`nac_id` is the element's `data-nac-id`. `label` is resolved by
preferring `aria-label`, then trimmed `textContent` (sliced to
120 chars), then falling back to the `data-nac-id`. The list is
DOM-validated -- it names the real elements the caller can pick
from. `NacError` merges `candidates` onto the thrown `Error`, so
`err.code`, `err.message`, and `err.candidates` are all
populated.

#### 5.4.6 The `nac:disambiguation_requested` event

Whenever a strict-resolution call fails (no match OR too many
matches), the runtime dispatches a `nac:disambiguation_requested`
`CustomEvent` on `document` *in addition to* throwing. Emission
is best-effort: if dispatch fails the runtime still throws.

```ts
document.addEventListener('nac:disambiguation_requested', (e) => {
  e.detail; /* {
    method:     'click_by_verb' | 'tab' | 'tab_by_label',
    plugin:     string | null,
    query:      { verb?, qualifier?, label?, id? },
    reason:     string,   // finer-grained than err.code (see 5.4.3)
    candidates: Array<{ nac_id: string, label: string }>,
  } */
});
```

#### 5.4.7 How a caller disambiguates

Given the candidate list (from `err.candidates` or
`event.detail.candidates`), the caller picks one and re-dispatches
by any of:

1. **Full `nac_id`** -- `NAC.click(candidate.nac_id)`. This is the
   canonical recovery path: the candidate already carries the
   exact id.
2. **Anchored `__suffix`** -- pass the instance's exact suffix as
   the qualifier to `click_by_verb`.
3. **`opts.qualifier_ordinal`** -- positional selection across the
   elements sharing the verb (DOM order).

The worked reference is `example-v24-disambiguation.php`; the
contract is covered by `runtime/test/stage2-disambiguation.mjs`
and `runtime/test/stage7-strict-resolution.mjs`.

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

The NPM package's CLI (`npx nac3 validate <url>`) reports
the highest level a page reaches. (The package ships `nac3` and
`nac` bins; both resolve to the same CLI.)

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

### 10.2 CLI: `npx nac3 validate <target>`

Wraps `validate_global` plus a static lint of HTML/manifest
coherence. Exit codes:

- `0` -- no findings of severity >= configured threshold.
- `1` -- findings.
- `2` -- the target itself failed to load.

Useful in CI: `npx nac3 validate ./dist/index.html
--severity=error`. The package exposes the CLI under two bin
names, `nac3` and `nac`; use whichever does not collide with
another tool on your PATH.

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

NAC3 is currently stewarded by Yujin. The spec, the docs, and
the reference runtime are all published under Apache-2.0. (The
runtime was tagged MIT in the pre-2.5 dual-repo era; it was
harmonised to Apache-2.0 across every NAC3 artefact in the
2026-05-23 consolidation. See `LICENSE` and `runtime/LICENSE`.)
Yujin commits to moving NAC3 to a neutral foundation (W3C
community group, Linux Foundation, or equivalent industry body)
if and when adoption justifies neutral governance. Until then,
spec changes follow the RFC process documented in
`CONTRIBUTING.md`, with public comment period of at least 14
days for any change that affects the public API or wire
formats.

Adopters: the uniform Apache-2.0 licensing guarantees that the
spec and runtime survive any change in Yujin's corporate status.
You can fork either, run either, and ship either, today and
after we are gone. This document records the commitment so the
path to that survival is explicit, not implicit.

---

## 14. Reference implementation

The canonical implementation is the reference runtime distributed
as the NPM package `@nac3/runtime` (current version
2.5.0-alpha.5; the runtime's `NAC.version` constant is the
normative version source). It ships:

- `js/nac.js` -- the core runtime: the public imperative +
  introspection API of section 5 (click/fill/select/tab,
  click_by_verb/tab_by_label, invoke/utter, edit_field,
  setCapabilities, syncPlugin, request_authority/confirm_action,
  registerPlugin/call/read/subscribe, narrate/context/tree,
  expect/diff, describe, validate_global, ...). Published as the
  package's `main`/`module`/`browser` entry (`dist/nac.mjs`).
- `js/nac-v2-extensions.js` -- the brownfield + data-table
  primitives that attach onto the same `window.NAC` after the
  core loads: scope tree, autoRegister, capture ephemeral, HMAC,
  isTrusted attestation, i18n catalog (`t`/`locale`), and the
  entire `registerDataTable` / `dt_*` data-table family
  (section 5.3). Published as `@nac3/runtime/extensions`
  (`dist/nac-v2-extensions.mjs`). The core runtime does NOT carry
  the `dt_*` surface; load this module to get it.
- `js/nac-chat-client.js` -- a reference chat client that wires
  voice + LLM + dispatcher. Published as `@nac3/runtime/chat-client`.

The package also exposes a CLI under the bin names `nac3` and
`nac` (`dist/cli.js`, section 10.2).

Other implementations are welcome (Python for native automation
runners, Rust for embedded agents, etc). The spec, not the JS
code, is the authority.

---

## 15. Plugin extension contract -- canvas + API surfaces (v2.5)

Sections 1-14 assume the agent-relevant surface is **DOM**. Every
addressable element has a `data-nac-id` attribute, every verb fires
through `el.click()`, every state read comes from
`el.getAttribute(...)`. This works for apps whose chrome AND
content live in DOM nodes.

It does not work for apps where part of the surface is **canvas**
(LibreOffice / Collabora Online, Figma, Excalidraw, Miro, every
custom WebGL editor). The chrome may still be DOM (toolbars,
dialogs), but commands often need to flow through the app's own
public API (postMessage, plugin SDK, script bridge), and state may
not be readable from the DOM at all.

v2.5 adds a small set of primitives that let a NAC3 plugin declare
its own routing contract to such surfaces. The runtime stays
agnostic of any specific app -- it learns how to talk to one only
by reading the plugin's manifest.

### 15.1 Why a new primitive set

DOM-only `NAC.click(id)` cannot:

- Send a `Send_UNO_Command` postMessage to a sandboxed Collabora
  iframe.
- Call `figma.currentPage.selection = [...]` inside the Figma
  plugin sandbox.
- Invoke `excalidrawAPI.setElements(...)` on a React ref.
- Read whether Bold is active on the current Collabora selection
  (the toolbar reflects it; the canvas hides it).

The fix is **not** to extend `NAC.click` with backend-detection
heuristics. The fix is to add an explicit, agnostic verb that
takes a plugin slug and a verb path, and lets the plugin's
manifest declare how that verb is routed.

### 15.2 The three primitives

```ts
NAC.registerPlugin(slug: string, manifest: PluginManifest): void
NAC.call(plugin: string, verb_path: string, args?: object): Promise<any>
NAC.read(plugin: string, state_path: string): Promise<any>
NAC.subscribe(plugin: string, event_path: string,
              cb: (data: any) => void): SubscriptionHandle
NAC.unsubscribe(handle: SubscriptionHandle): void
```

- `registerPlugin(slug, manifest)` registers a v2.5 plugin. A given
  `slug` MAY appear in both the DOM manifest registry (section 5)
  and the v2.5 extension registry; the two coexist. v2.5 calls
  resolve only through the v2.5 registry.
- `call` invokes a declared verb. Routing is chosen by the
  manifest, not by the agent. Resolves with whatever the backend
  returned (often `undefined` / `{ok: true}`); rejects with
  `NacError` if the verb is unknown, the backend fails, or the
  response shape is invalid.
- `read` returns a declared state value. The runtime walks the
  state's fallback chain in declared order and returns the first
  source that resolves; rejects only when every source in the
  chain failed.
- `subscribe` attaches a listener to a declared event. Returns a
  handle that the caller passes to `unsubscribe` to clean up.
  Events MAY be backed by a real upstream event source or
  synthesised via polling / MutationObserver -- the manifest
  declares which.

All four functions are async (Promise-returning) except
`unsubscribe`, which is synchronous and idempotent.

### 15.3 Plugin manifest shape

```ts
interface PluginManifest {
  slug: string;
  verbs:  { [verb_path: string]: VerbBinding };
  state:  { [state_path: string]: StateBinding[] };
  events: { [event_path: string]: EventBinding };
}

interface VerbBinding {
  backend:       BackendKind;
  /* backend-specific fields (see 15.4) */
  [k: string]: any;
}

interface StateBinding {
  backend:       BackendKind;
  /* backend-specific fields (see 15.4) */
  extract?:      string;   /* extractor DSL string (see 15.5) */
  [k: string]: any;
}

interface EventBinding {
  backend:       BackendKind;
  /* backend-specific fields */
  [k: string]: any;
}

type BackendKind =
  | 'postmessage'
  | 'postmessage-listen'
  | 'sdk-call'
  | 'script-bridge'
  | 'dom-mirror'
  | 'same-origin-window'
  | 'synthetic-mutation'
  | 'synthetic-poll';
```

Manifests are pure JSON (no JS callbacks). Forge, Sumi, and any
future tooling generates them as data; the runtime interprets the
backend names from a fixed vocabulary.

Verbs and events have **exactly one** binding. State has an
**ordered array** of bindings: the runtime walks the chain in
order, returning the first source that successfully resolved.

### 15.4 Backend vocabulary

| Kind | Used for | Required fields |
|------|----------|-----------------|
| `postmessage` | Verb: post a message to an iframe via `postMessage`. | `target` (CSS selector of the iframe to send to), `message` (MessageId string), `values` (object literal interpolated with args), `values_from_args` (optional array of arg keys to forward verbatim) |
| `postmessage-listen` | Event: listen for a specific incoming `MessageId` on `window.message`. | `source` (CSS selector of the iframe to filter origin by; if omitted, accept any source), `message` (MessageId to match), `extract` (extractor DSL into the message data) |
| `sdk-call` | Verb: call a globally-exposed JS function (e.g. Figma plugin, Excalidraw API). | `path` (dotted path into `window`, e.g. `figma.currentPage.selection`), `mode` (`assign` to set the path to the args value, `invoke` to call it as a function with the args object) |
| `script-bridge` | Verb or state: invoke an app's scripting bridge (Collabora's `CallPythonScript`, LibreOffice UNO bridge, Google Apps Script). | `bridge` (a backend-specific identifier like `collabora.python`), `script` (script identifier), `function` (function name to run), `args` (object literal interpolated with the call args), `response_match` (for state: the response MessageId to wait on), `timeout_ms` (optional, default 5000) |
| `dom-mirror` | State: read from a DOM element whose attribute / class / text mirrors a canvas-internal state (e.g. a toolbar button highlighted when its formatting is active on the current selection). | `selector` (CSS selector to query), `extract` (extractor DSL, see 15.5) |
| `same-origin-window` | State: read from `iframe.contentWindow.<path>` when the iframe is same-origin. The runtime detects cross-origin and falls through. | `target` (CSS selector of the iframe), `path` (dotted path into `contentWindow`) |
| `synthetic-mutation` | Event: synthesise an event by observing DOM mutations on one or more state sources and re-emitting when the observed value changes. | `observe` (array of state paths to watch; the runtime calls `read` on each and diffs across mutations), `throttle_ms` (optional, default 100) |
| `synthetic-poll` | Event: synthesise an event by polling state sources. | `observe` (array of state paths), `interval_ms` (default 250) |

Each backend MUST be implemented by the runtime as a self-contained
dispatcher (`dispatch(binding, args, context) -> Promise<value>`).
Adding a new backend type to the spec requires bumping the spec
version; runtimes ignoring unknown backends MUST reject manifests
that declare them (no silent skip).

### 15.5 Extractor mini-DSL

State backends and the `postmessage-listen` event backend often
need to pluck a field out of a larger object. The runtime ships
a tiny declarative DSL so manifests stay JSON-only:

| Syntax | Meaning | Example input -> output |
|--------|---------|-------------------------|
| `field.path.to.value` | Dotted path traversal. | `{a:{b:1}}` with `a.b` -> `1` |
| `attribute:NAME` | DOM only: read `el.getAttribute(NAME)`. | `<i data-x="hi">` with `attribute:data-x` -> `'hi'` |
| `text` | DOM only: read `el.textContent`. | `<span>hi</span>` with `text` -> `'hi'` |
| `classList.contains:CLASS` | DOM only: `el.classList.contains(CLASS)` -> boolean. | `<button class="active">` with `classList.contains:active` -> `true` |
| `value` | DOM only: read `el.value`. | `<input value="x">` with `value` -> `'x'` |
| `present` | DOM only: returns `true` if the selector resolved an element, `false` otherwise. | selector matched -> `true` |

Composition is not supported in v2.5; an extractor is exactly one
of the rows above. A manifest needing complex transformation
declares a `script-bridge` instead.

### 15.6 Fallback chain semantics for `state`

`state[path]` is an array of bindings. `NAC.read(plugin, path)` walks
the array in order. For each binding:

1. The runtime invokes the backend's dispatcher.
2. If the dispatcher resolves with a value (including `false`, `0`,
   empty string, but NOT `undefined`), `read` returns that value.
3. If the dispatcher rejects, or resolves with `undefined`, the
   runtime advances to the next binding in the array.
4. If no binding produced a value, `read` rejects with
   `NacError('state_unreadable', ...)` whose `err.attempts: [...]`
   carries one entry per attempted backend with `{backend, reason}`.

Rationale: the chain encodes the manifest author's preference
order. The fastest, cheapest, freshest source is declared first;
fallbacks degrade gracefully. The runtime never silently picks an
inferior source first.

### 15.7 Provenance for synthetic actions

Every `NAC.call` dispatch emits a `nac:plugin:invoked` event on
`document` after the backend returns. The detail payload:

```js
{
  plugin:    'collabora.writer',
  verb_path: 'uno.Bold',
  backend:   'postmessage',
  request_id: 'pi_<random hex>',
  source:    'agent',     // see sec 7
  trusted:   false,
  duration_ms: 12,
  ok:        true,
  error:     null,
}
```

Same shape for `nac:plugin:read` (after a `read`) and
`nac:plugin:event` (synthesised event re-emit). `source` defaults
to `'agent'`; hosts that wrap the runtime in a user-facing UI MAY
override via the existing `NAC.set_source(...)` mechanism (sec 7).

### 15.8 Worked example -- Collabora Writer

```json
{
  "slug": "collabora.writer",
  "verbs": {
    "uno.Bold": {
      "backend": "postmessage",
      "target":  "iframe[data-collabora-frame]",
      "message": "Send_UNO_Command",
      "values":  { "Command": ".uno:Bold" }
    },
    "doc.save": {
      "backend": "postmessage",
      "target":  "iframe[data-collabora-frame]",
      "message": "Action_Save",
      "values_from_args": ["DontTerminateEdit", "Notify"]
    }
  },
  "state": {
    "selection.isBold": [
      { "backend": "dom-mirror",
        "selector": "[data-nac-id='toolbar.bold']",
        "extract":  "classList.contains:selected" },
      { "backend": "script-bridge",
        "bridge":   "collabora.python",
        "script":   "yujin_state.py",
        "function": "GetSelectionState",
        "response_match": "CallPythonScript-Result",
        "extract":  "Values.is_bold" }
    ],
    "doc.modified": [
      { "backend": "same-origin-window",
        "target":  "iframe[data-collabora-frame]",
        "path":    "app.file.modified" }
    ]
  },
  "events": {
    "doc.modified": {
      "backend": "postmessage-listen",
      "source":  "iframe[data-collabora-frame]",
      "message": "Doc_ModifiedStatus",
      "extract": "Values.Modified"
    },
    "selection.changed": {
      "backend":     "synthetic-mutation",
      "observe":     ["selection.isBold", "selection.isItalic"],
      "throttle_ms": 100
    }
  }
}
```

The agent calls `NAC.call('collabora.writer', 'uno.Bold')`; the
runtime routes through the `postmessage` backend, posts
`Send_UNO_Command` to the iframe. To confirm the effect occurred
(see sec 17), the agent calls
`await NAC.read('collabora.writer', 'selection.isBold')`; the
runtime tries the toolbar mirror first (fast, free), falls back to
the Python script bridge if the mirror is unavailable. The agent
never knows or cares which source answered.

### 15.9 Errors

`NAC.call` / `read` / `subscribe` reject with `NacError` whose `code`
is one of:

- `plugin_not_registered` -- the slug has no v2.5 manifest.
- `verb_not_declared` -- the verb path is not in the manifest.
- `state_not_declared` -- the state path is not in the manifest.
- `event_not_declared` -- the event path is not in the manifest.
- `backend_unknown` -- the manifest declares a backend the runtime
  does not implement. Manifest MUST be rejected at register time;
  this error only surfaces if a runtime accepts a future manifest
  format it then cannot dispatch.
- `backend_target_missing` -- the backend's target (iframe, JS
  path, DOM selector) is not findable.
- `cross_origin_blocked` -- `same-origin-window` was attempted
  against a cross-origin iframe.
- `state_unreadable` -- every binding in a state chain failed; see
  15.6.
- `timeout` -- a backend did not respond within its declared
  `timeout_ms` (default 5000 for verbs, 1000 for state reads).
- `invalid` -- argument shape is wrong (bad slug, malformed
  manifest at register time, etc).

---

## 16. Tree navigation (v2.5 -- SHIPPED in 2.5.0-alpha.5 / RFC V25-02)

Hierarchical command navigation primitives for assistive flows and
voice runners that need to describe what they can do from the
current focus.

**API surface:**

- `NAC.context(plugin) -> { breadcrumb: [{nac_id, label}, ...] }`
  Walks up from `document.activeElement` through ancestor elements
  carrying `data-nac-id`, stopping at the plugin root. Returns an
  empty breadcrumb if nothing is focused inside the plugin. Each
  crumb's `label` comes from `narrate` (sec 17).

- `NAC.tree(plugin, rootId?) -> [{nac_id, label, opens?, leaf?}, ...]`
  Enumerates the IMMEDIATE addressable children of `rootId` (or the
  plugin root if omitted). "Immediate" means no other `data-nac-id`
  element lies between the start and the child. For each entry:
  - `label` resolved via `narrate`
  - `opens` mirrors the `data-nac-opens` attribute when present
  - `leaf` is `true` when `data-nac-leaf` is present

**Authoring attributes:**

- `data-nac-opens="<target-nac-id>"`: declares this node opens /
  drills into the element identified by the target id. Lets agents
  follow the navigation chain without guessing names.
- `data-nac-leaf`: explicit terminal marker; downstream agents know
  no further drill is possible.

**Errors:** `tree` returns `[]` for an unknown rootId (silent
empty, not an error). `context` always returns
`{ breadcrumb: [] }` for unknown plugins.

---

## 17. Asistive labels (v2.5 -- SHIPPED in 2.5.0-alpha.5 / RFC V25-03)

Canonical human-readable label resolution. One function for screen
readers, TTS, voice flows, audit logs, mobile assistive surfaces.

**API surface:**

- `NAC.narrate(plugin, nac_id) -> string | null`
  Returns `null` if the plugin or nac_id cannot be found. Otherwise
  the label following this strict priority order:

  1. **`aria-label`** -- a11y-first; respected unless whitespace-only.
  2. **visible text** -- `textContent` of the element excluding any
     nested `data-nac-id` subtrees (those have their own narrate
     resolution; they get excluded so spoken output stays scoped).
  3. **`data-nac-label`** -- explicit author override; useful when
     visible text contains icon glyphs or i18n keys.
  4. **`nac_id` fallback** -- worst case; signals "no label authored".

  Whitespace-only values at any tier collapse to the next tier.

**Validation:** `validate_global()` may emit warnings in the
`plugin_instance_violations` bucket for ordinal-shaped nac_ids
(`btn-1`, `btn-2`, ...) lacking any of the upper-tier labels.

---

## 18. Effect detection (v2.5 -- SHIPPED in 2.5.0-alpha.5 / RFC V25-04)

Closes the "silent damage" gap: an agent confirms the EFFECT of
an action, not just that the command was emitted. Both primitives
compose with `NAC.read()` so any V25-01 backend works (postmessage,
sdk-call, dom-mirror, ...).

**API surface:**

- `NAC.expect(plugin, statePath, value, opts?) -> Promise<value>`
  Polls `NAC.read(plugin, statePath)` until the comparator returns
  truthy or the deadline fires. Resolves with the resolved value;
  rejects with `NacError('timeout', ...)` on deadline.

  Read failures during polling are retried until the deadline
  (treated as "not yet observable", not as a hard error).

  Options:
  - `timeout_ms` (default `5000`)
  - `poll_ms` (default `100`)
  - `comparator` (default `(cur, want) => cur === want`)
    Receives `(current, expected)`, returns boolean.

- `NAC.diff(plugin, statePath, actionFn) -> Promise<{before, after, changed}>`
  Reads state, awaits `actionFn()`, reads state again. Returns
  both snapshots and a `changed` boolean computed via JSON-stringify
  compare (so `undefined`-vs-value still flags as changed).
  Read failures collapse to `undefined`.

**Composition notes:** `diff` only captures the START and END
snapshot; it does NOT observe intermediate states inside the
action. Use `expect` if your concern is "the state passes through
some specific value at some point".

---

*This document is the canonical NAC3 v2.5 specification.
Sections 0-14 are unchanged from v2.4 stable. Sections 15-18 ship
in v2.5. Edits to this file constitute spec changes and require an
RFC; see `CONTRIBUTING.md`.*
