# Changelog

## 2.5.0-alpha.2 -- 2026-05-23

NAC3 v2.5.0-alpha.2 lands the V24-04 OCC foundation that was
deferred from alpha.1. This is an additive release on top of
alpha.1 -- everything that worked in alpha.1 still works.

### Added (V24-04 -- foundation SHIPPED)

The snapshot versioning + optimistic concurrency framework from
RFC V24-04 lands as a foundation layer:

- `_tree_version` + `_plugin_versions` Map -- per-(slug, instance_id)
  monotonic version counters. Bumped on every structural mutation
  observed by the runtime MutationObserver + on every syncPlugin
  call.
- `_resolvePluginScope(el)` walks ancestor [data-nac-plugin] roots
  with WeakMap caching to avoid O(depth) walks on every mutation.
- `_bumpPluginVersion(slug, instance_id, trigger)` + `_bumpTreeVersion`
  atomic helpers: increment counter, push to `_version_history`
  (capped at 500), dispatch `nac:plugin:invalidated` +
  `nac:tree:invalidated` events.
- Single document-rooted MutationObserver that filters mutations to
  data-nac-* attribute changes + addNodes/removeNodes that contain
  data-nac-* descendants. Pure value/text changes do NOT bump.
- `element_state_hash` (128-bit SHA-256 truncated) over a canonical
  5-key state (visible, disabled, value, text, custom). Sync impl
  + async crypto.subtle path when available. Byte-identical digests
  across paths.
- `markHydrationComplete()` + 100ms fallback for SSR-then-hydrate
  scenarios. Tagged trigger='hydration_complete' on the resulting
  bump events.
- `versionHistory(limit?)` devtools surface -- last N bumps, most
  recent first.

### Added (V24-04 -- describe() additions)

- `describe()` output now carries `tree_version` at the root +
  `plugin_version` + `plugin_instance_id` per plugin entry +
  `element_state_hash` per element entry. All three are read-only
  observers; consuming them is opt-in.

### Added (V24-04 -- NAC.* surface)

- `NAC.STRICT_VERSIONING` (default **false** in alpha.2; will flip to
  true in alpha.3 after one soak window). When true,
  every mutating API call without `expected_*` parameters throws
  `NacError('version_required', ...)`.
- `NAC.eager_hashing` (default false) -- placeholder flag for future
  cache-the-hash-on-mutate optimization.
- `NAC.conformance_tier` (default `'NAC-3-versioned'`). Runtimes that
  declare the legacy `'NAC-3'` tier explicitly reject `expected_*`
  parameters with `NacError('feature_not_supported', ...)`.
- `NAC.markHydrationComplete()` -- explicit hydration ack.
- `NAC.versionHistory(limit?)` -- devtools.

### V24-02 syncPlugin consolidation

syncPlugin's version stamp now uses the V24-04 `_bumpPluginVersion`
machinery instead of the alpha.1 per-call timestamp string. The
return shape (`{replaced, slug, version}`) is unchanged, but the
`version` value is now `v_<N>` instead of `v_<base36-ts>_<seq>`.
Tests pass either format (just check the `v_` prefix and that
versions differ across calls).

### Pending for 2.5.0-alpha.3

- **Dispatch enforcement hooks.** `click` / `click_by_verb` / `tab` /
  `tab_by_label` / `fill` / `select` / `invoke` accept
  `expected_plugin_version` / `expected_tree_version` /
  `expected_element_state_hash` parameters and reject with
  `NacError('snapshot_stale', ...)` on mismatch via
  `_resolveVersionExpectations()` (the helper is already in this
  release; the hooks are not yet wired into the dispatch verbs).
- **`STRICT_VERSIONING` default flip** from false to true. Gated on
  the dispatch hooks landing.
- **V25-02/03/04 drafts** -- tree navigation, asistive labels,
  effect detection. Target subsequent 2.5.x patches.

### Tests

`runtime/test/` adds stage12-snapshot-versioning.mjs (23 PASS):
API surface, describe() additions, syncPlugin bump events, version
history, markHydrationComplete idempotency, hydration trigger
tagging.

Suite total: **377 PASS / 0 FAIL** across 14 stage suites.

### Migration notes

- Code consuming `describe()` output that did NOT expect
  `tree_version` / `plugin_version` / `element_state_hash` keys is
  unaffected: those keys are additive. Code that explicitly checked
  describe().plugins[i] for an enumerated key set might fail; the
  fix is to ignore unknown keys (forward-compatible default).
- syncPlugin's `result.version` value format changed (see V24-02
  section above). Tests that asserted the exact alpha.1 format
  string would need to relax to a prefix-only check.

---

## 2.5.0-alpha.1 -- 2026-05-23

NAC3 v2.5.0-alpha.1 is a **consolidation release**. Two parallel
development lines that diverged during May 2026 are unified here.
The yujinapp/nac-spec repository becomes the SOLE source of truth
for NAC3 from this commit forward; the prior development copies
under rpaforce-crm (`packages/nac/`, `yujin.app/nac-spec/`) are
deleted in that monorepo's history.

### Lines unified

- **Line A** (was on this repo, RFC track): V24-01 plugin slug
  uniqueness, V24-02 idempotent syncPlugin (was announced in
  2.3.x changelog but never landed in code -- now implemented
  for the first time with full test coverage), V24-04 snapshot
  versioning + OCC (in flight, see "Pending" below), V24-05
  agent authority + sudo (was DRAFT, ships SHIPPED here).
- **Line B** (was on rpaforce-crm, contract track): V25-01 plugin
  extension contract for canvas+API surfaces (Block A: 8 backends
  complete + tests).

### Added (V25-01 -- NEW)

- `NAC.registerPlugin(slug, manifest)` declarative plugin
  registration for surfaces where verbs / state / events route
  through something other than direct DOM (postMessage to iframe,
  plugin SDK call, script bridge, DOM mirror, same-origin window,
  synthesised events).
- `NAC.call(plugin, verb_path, args)` abstract verb dispatch.
- `NAC.read(plugin, state_path)` abstract state read with declared
  fallback chain semantics.
- `NAC.subscribe(plugin, event_path, cb) / unsubscribe(handle)`
  event subscription with backend routing.
- 8 backend kinds in fixed vocabulary: `postmessage`,
  `postmessage-listen`, `sdk-call`, `script-bridge`, `dom-mirror`,
  `same-origin-window`, `synthetic-mutation`, `synthetic-poll`.
- Declarative extractor mini-DSL (`text` / `value` / `present` /
  `attribute:NAME` / `classList.contains:CLASS` / dotted-path).
- Provenance event family: `nac:plugin:invoked` / `:read` / `:event`
  with `{plugin, backend, request_id, source, trusted, duration_ms,
  ok, error}` payload.

### Added (V24-02 -- NEW IMPLEMENTATION)

- `NAC.syncPlugin(manifest)` / `NAC.syncPlugin(slug, manifest)`
  -- idempotent registration. Replaces the manifest for a slug
  instead of appending; SPA hosts call this on remount without
  accumulating stale entries.
- Returns `{ replaced: boolean, slug, version }`.
- Emits `nac:plugin:invalidated` on REPLACE (not on first-add),
  detail `{plugin_slug, plugin_instance_id, from_version,
  to_version, trigger: 'syncPlugin'}`.

### Added (V24-05 -- NEW)

- `NAC.set_confirm_handler(fn)` -- register async (req) => boolean.
- `NAC.confirm_action(action_id, message, opts?)` -- Promise<boolean>.
  Sudo bypass: short-circuits true if elevation already granted
  for the requested scope (or higher).
- `NAC.request_authority(scope, ttl_ms, opts?)` -- sudo-style
  time-bounded elevation. Scope rank: high > medium > low.
- `NAC.has_authority(scope) -> bool`.
- `NAC.revoke_authority(scope) -> void` (idempotent).
- Provenance event family:
  `nac:authority:requested / :granted / :denied / :revoked / :expired`,
  `nac:action:confirmed / :rejected`.
- SUPERSEDES the v1.9 confirm_action mechanism (removed: it was
  unused + had a strictly narrower contract).

### Added (V24-01 -- CONSOLIDATED + ENFORCED)

- `NAC.HARD_DEDUP` flag (default true). Gates the synchronous
  throw in `NAC.register` + the boot-time pass.
- `NAC.register` throws `NacError('duplicate_plugin_no_instance_id',
  ...)` synchronously when the DOM already contains multiple roots
  for the registered slug and any of them omits / duplicates
  `data-nac-plugin-id`.
- Boot-time pass on `DOMContentLoaded` runs the same check across
  every `[data-nac-plugin]` root. On first violation: dispatches
  `nac:fatal` event + paints a fixed-position red banner
  (`#__nac_fatal_banner__`) + re-throws asynchronously so test
  harnesses + browsers catch it.
- `validate_global()` extended with `plugin_instance_violations`
  array -- structured findings for CI gates.
- Migration: `NAC.HARD_DEDUP = false` BEFORE any `register()`
  call opts out for one release window. Flag removed in v2.6.

### New: PROJECT.md at repo root

PROJECT.md documents the post-migration topology, the RFC process
states (Proposed / In implementation / Implemented / Alpha /
Production), the doc-update invariant (every RFC transition
touches SPEC + CHANGELOG + USER_MANUAL + TECHNICAL_DESIGN + demos
list + benchmark numbers + Sumi KB), and the programming +
architecture norms. Read it FIRST before any contribution.

### Tests

`runtime/test/` suite now has 13 stages:

  smoke + v22 + v23-{invoke,shadow,capabilities,editor,interop}
  + stage2-disambiguation + stage7-strict-resolution + stage8-plugin-extension
  + stage9-sync-plugin + stage10-authority-sudo + stage11-plugin-id-dedup

`npm test` exit code 0, 349 PASS / 0 FAIL.

### Pending for 2.5.0-alpha.2

- V24-04 snapshot versioning + OCC -- in implementation, code in
  flight. Targets `NAC.STRICT_VERSIONING=true` by default, with
  `expected_plugin_version` / `expected_tree_version` enforcement
  on every mutating API. The `plugin_version` + `element_state_hash`
  fields will appear in `describe()` output.
- V25-02 tree navigation (`context`, `tree`, `data-nac-opens`)
  -- DRAFT, target 2.5.x.
- V25-03 asistive labels (`narrate`) -- DRAFT, target 2.5.x.
- V25-04 effect detection (`expect`, `diff`) -- DRAFT, target 2.5.x.

### Migration notes

- Code that ran fine under 2.4.0 (strict resolution + disambiguation)
  continues to work unchanged in 2.5; that contract is stable.
- Code that called the pre-existing v1.9 `confirm_action` must
  migrate to V24-05 (`confirm_action` + `set_confirm_handler` +
  `request_authority`). The argument shape changed
  (`(action_id, opts)` -> `(action_id, message, opts)`). Audit
  callers; no automatic migration tool.
- Code that registered the same plugin slug on multiple DOM roots
  WITHOUT `data-nac-plugin-id` now throws at register time. Either
  add the attribute, OR set `NAC.HARD_DEDUP=false` before
  registering for a one-release migration window.

---

## 2.4.0 -- 2026-05-21

NAC3 v2.4.0 is a **behavior-of-contract change**: id / verb / qualifier
resolution becomes strict. Backwards-compatible with code paths that
already supplied unambiguous arguments, **NOT** backwards-compatible
with code paths that depended on the previous lenient (`indexOf`)
fallback to resolve to the first near-match.

### Why this changed (the principle, not a feature)

The lenient resolution in 2.3.x violated the spec's 0-silent-damage
invariant. Specifically, `click_by_verb(plugin, verb, { qualifier })`
would, on a no-exact-suffix match, fall through to an `indexOf(qualifier)`
substring search and resolve silently to whatever element happened to
contain the qualifier string anywhere in its id. The H4 benchmark on the
Conduit case study (2026-05-21) showed that **12 of 18 "model failures"
on the canonical flows were actually silent runtime damage** — the
agent emitted an invalid qualifier, the runtime sent it to the wrong
element, the agent looped against the wrong page state. Strict
resolution rescues those 12 (see `nac-spec/conduit/H4_STRICT_NAC_REPORT.md`).

For an assistive-software use case (the principal driver of this
project), a silent dispatch to the wrong element with no recovery path
is a safety blocker. Strict resolution closes that gap.

### New error model — disambiguation contract

When `click_by_verb` / `tab` / `tab_by_label` cannot resolve a request
unambiguously, the runtime now:

1. Emits `nac:disambiguation_requested` on `document` with a
   structured detail payload (see below).
2. Throws `NacError` with `err.code` ∈ `{no_matching_instance,
   ambiguous_qualifier, ambiguous_tab, ambiguous_label}` AND
   `err.candidates: [{nac_id, label}, ...]` pre-validated against the
   live DOM.

Detail / candidates payload:
```js
{
  method:    'click_by_verb' | 'tab' | 'tab_by_label',
  plugin:    string | null,
  query:     { verb?, qualifier?, label?, id? },
  reason:    'no_matching_instance' | 'ambiguous_qualifier' | 'ambiguous_tab' |
             'ambiguous_label' | 'ambiguous_label_exact' | 'ambiguous_label_fuzzy' |
             'no_matching_label',
  candidates: [{ nac_id: string, label: string }, ...]
}
```

A reactive host (chat UI / voice agent / screen-reader) can listen
on the event and present the options to the user as *"did you
mean A or B?"*. A synchronous catcher can read `err.candidates`
directly. An autonomous agent (Pilot, etc.) can inject the candidates
into the next turn's prompt so the LLM picks from a DOM-validated
list instead of re-guessing a qualifier.

### What changed in the resolvers

- **`click_by_verb` with qualifier:** only exact-equality or anchored
  suffix (`id === qualifier || id.endsWith('__' + qualifier)`)
  resolves. Multiple matches → `ambiguous_qualifier`. Zero matches →
  `no_matching_instance`. **The `indexOf` substring fallback is
  removed.**
- **`tab` single-arg form:** bare id resolves to exact match in DOM. If
  no exact, exactly one anchored-prefix instance
  (`id.startsWith(bare + '__')`) resolves; multiple → `ambiguous_tab`;
  zero → `no_matching_instance`.
- **`tab_by_label`:** two-tier strict — exact label match first
  (errors if multiple), then substring match (errors if multiple).
  Fuzzy match preserved for voice/assistive use case; ambiguity
  caught.

### Verification

- `packages/nac/test/stage2-disambiguation.mjs` — pre-existing
  tab_by_label cases still PASS (B1–B4).
- `packages/nac/test/stage7-strict-resolution.mjs` (new) — 9/9
  invariants pass under JSDOM shim.
- `nac3-bench/bench/scripts/stage7_strict_nac.mjs` (new) — 9/9
  invariants pass under Playwright against a live page.
- `nac3-bench/bench/h4_results/h4_2026-05-21T19-01-19-040Z.json` —
  cheap-model benchmark with strict NAC: 48/54 = 89% (vs 36/54 = 67%
  under lenient).

### Migration guide

If your code was passing fuzzy qualifiers and depending on the runtime
to pick "something close", the upgrade requires you to:
- Either supply the full `nac_id` directly (always unambiguous), OR
- Pass the exact `__suffix` of the instance you want, OR
- Listen for `nac:disambiguation_requested` / catch `NacError` with
  `err.candidates` and pick from the returned list.

Most users won't be affected — the only callers that broke during the
internal regression were the ones that were already broken silently in
2.3.x but happened to land on the wrong-but-related element instead of
failing.

---

## 2.3.1 -- 2026-05-13 (stable, blank republish)

Identical source to 2.3.0. The 2.3.0 tag had already been published to
npm as a preview; 2.3.1 is the first installable stable version. No
behavioural changes.

---

## 2.3.0 -- 2026-05-13 (stable)

NAC3 v2.3.0 is the first stable release of the payload-bearing
contract. Everything in 2.3.0-alpha.1 and 2.3.0-alpha.2 is rolled
in; the alpha tags are deprecated. New in stable (beyond the alpha
preview):

### New primitives

- **`NAC.invoke(action_id, payload, opts?)`** -- payload-bearing
  action. Dispatches `nac:action:requested`, awaits the host's
  `nac:action:succeeded` / `:failed` with the same `request_id`.
  Default timeout 30 s. (Promoted from 2.3.0-alpha.1.)
- **`NAC.utter(action_id, {text, lang?, voice?})`** -- ergonomic
  shortcut for `verb='utter'`. (Promoted from 2.3.0-alpha.1.)
- **`NAC.bindTab(el, handler, ctx, opts?)`** -- tab companion to
  `bindAction`. Emits `nac:tab:activated` / `:activation_failed`
  for you. Sister of v2.2's `bindAction`.
- **`NAC.edit_field(nac_id)`** -- field editor primitive promoted
  from preview to GA. Selection, replace, AI syntax correction,
  save/cancel verbs. Modal mounts the `nac_editor` plugin
  idempotently with all 10 locales.

### Shadow DOM resolution (F1 + F6)

- **Open shadow DOM**: the runtime walks `el.shadowRoot`
  recursively up to depth 10. Any element with `data-nac-id`
  inside an open shadow root is now resolvable by `NAC.click`,
  `NAC.fill`, `NAC.invoke`, etc. with no glue code.
- **Closed shadow DOM**: voluntary exposure contract. A
  component MAY expose a `nac3` getter on the host element
  implementing `query(selector)` (mandatory),
  `queryAll(selector)` (recommended), and `describe()` (optional).
  The runtime delegates to those methods.
- **Error events** for closed shadow:
  - `nac:shadow_blocked` -- emitted once per host with
    `detail.reason` in `'exposure_threw'`, `'not_exposed'`.
  - `nac:shadow_protocol_violation` -- emitted when an exposed
    method returns a non-Element value.
- All events use `composed: true` so they correctly cross shadow
  boundaries to document-level listeners.

### Auth-aware capabilities (F7)

- Manifest entries MAY declare `requires_capability: 'verb_slug'`
  at the element level or per `action.verb`. Array values use
  OR semantics ("at least one cap matches passes").
- `NAC.setCapabilities([...])`, `NAC.grantCapability(cap)`,
  `NAC.revokeCapability(cap)`, `NAC.userCapabilities()` manage
  the user's capability set.
- `NAC.click` and `NAC.invoke` gate against the set before
  dispatch. Missing cap -> reject with `code='capability_required'`
  + emit `nac:command:rejected`.

### Strict validation default (F3)

- `NAC.STRICT_VALIDATION` default flipped from `false` to **`true`**
  in v2.3 stable, per the v2.2 migration promise.
  `NAC.register` now throws `code='strict_validation'` on
  `manifest_role_unknown` / `tab_id_manifest_role_drift` /
  `manifest_dom_role_mismatch` findings.
- Opt-out: set `NAC.STRICT_VALIDATION = false` BEFORE any
  `register()` call in your bootstrap. See
  `guides/MIGRATION_v2.2_to_v2.3.md` for the playbook.

### Hotfix carryover from alpha.2

- `NAC.invoke` does NOT reject with `code='disabled'` on elements
  with `disabled` or `aria-disabled='true'`. `invoke` is a logical
  payload-bearing request, not a synthetic click. `NAC.click` still
  rejects on disabled (click semantics preserved). Pinned down by
  test v23-invoke.mjs T7/T8/T9 so the relaxation cannot silently
  regress.

### Test surface

`npm test` now chains 7 suites (75+ assertions):
smoke, v22, v23-invoke, v23-shadow, v23-capabilities, v23-editor,
v23-interop. Plus 5 stage suites + live Playwright E2E
(`atlas-pro-v23-utter-e2e.mjs` 16/16 GREEN against the deployed
demo).

### Spec text

SPEC.md updated:
- Section 5.1.4 -- `NAC.invoke` + `NAC.utter` final wording.
- Section 5.1.5 -- Shadow DOM resolution (open, cap 10).
- Section 5.1.6 -- Closed shadow DOM exposure API (voluntary).
- Section 5.1.7 -- Auth-aware capabilities.
- Section 13 -- `edit_field` promoted from preview to GA.

### Reference adopters

- Atlas Pro voice ad (`ads-demo/atlas-pro/`) -- production live,
  uses `NAC.utter` + payload schema.
- React demo (`packages/nac-react-demo/`) -- adopts payload-bearing
  pattern for the chat-to-todos flow.
- Angular demo (`packages/nac-angular-demo/`) -- mirror of React.
- Web Component demos: `example-v23-shadow-open.html` and
  `example-v23-shadow-closed.html`.

## 2.3.0-alpha.2 -- 2026-05-13 (superseded by 2.3.0)

Hotfix on top of 2.3.0-alpha.1:

- `NAC.invoke` no longer rejects with `code='disabled'` when the
  target element has `disabled` or `aria-disabled='true'` set. The
  `disabled` HTML attribute is a click-event UX guard; `invoke` is
  a logical payload-bearing request, not a synthetic click. Hosts
  that need to refuse an invoke based on UI state should do it in
  their `nac:action:requested` listener and emit
  `nac:action:failed` with a meaningful code. This was hitting the
  Atlas Pro mic which gets `disabled = true` during /parse +
  /tts processing, blocking subsequent NAC.utter calls from
  external agents mid-conversation. Reproduced in the video-gen
  pipeline (every turn after the demo's first state-transition).
- Bumped CLI version + smoke test assertions to match.

## 2.3.0-alpha.1 -- 2026-05-12

### New: payload-bearing actions via `NAC.invoke` + `NAC.utter`

The NAC v2.2 contract was click-and-go: an agent triggers
`NAC.click(id)` or `NAC.click_by_verb(plugin, verb)` and the host
does whatever it does. That works for verb-and-state actions
(`save`, `cancel`, `submit`, `delete`) but breaks down when the
action needs **data** from the agent: `utter(text)`,
`search(query)`, `send_message(body)`, `upload(file)`,
`schedule(date)`. Hosts had no way to receive an agent's payload
via a synthetic click.

v2.3 adds the missing primitive:

```ts
NAC.invoke(action_id, payload, opts?): Promise<{ok, request_id, ack}>
NAC.utter(action_id, {text, lang?, voice?}): Promise<...>
```

`NAC.invoke` dispatches a `nac:action:requested` CustomEvent on
the host element (bubbles) with the agent's `payload` + a
runtime-issued `request_id`. The host listens, processes, emits
`nac:action:succeeded` (or `:failed`) echoing the same
`request_id`. The runtime correlates and resolves the Promise.

Default timeout 30 s (vs 5 s for click). On timeout the Promise
rejects with `code='timeout'`.

`NAC.utter(id, opts)` is the ergonomic shortcut for `verb='utter'`
-- equivalent to `NAC.invoke(id, {verb:'utter', text, lang, voice})`.

Manifest entries for payload-bearing actions can declare an
informational `payload_schema`:

```js
{ id: 'atlas_pro_ad.mic', role: 'action',
  actions: [
    { verb: 'listen' },
    { verb: 'utter',
      payload_schema: {
        text: { type: 'string', required: true, max: 4000 },
        lang: { type: 'string', enum: ['en','es','pt','fr','it','de','ja','zh','hi','ar'] }
      }
    }
  ]
}
```

Click-style verbs (`NAC.click`, `NAC.click_by_verb`) continue to
work unchanged. The new contract is purely additive; no demo
behaviour regresses.

#### First adopter

Atlas Pro (`https://yujin.app/nac-spec/ads-demo/atlas-pro/`)
declares both `listen` (click-only, existing) and `utter`
(payload-bearing) on its `atlas_pro_ad.mic` action. The same
`/ad-orchestrator/parse` + `/ad-orchestrator/tts` loop drives
either path -- agents with their own STT call `listen`, agents
with their own LM call `utter` with the recognised text.

#### Test coverage

- `test/v23-invoke.mjs` (new) -- 22 assertions covering happy
  path, ack echo, host-failed path, invalid args, not-found,
  custom timeout. PASS.
- `test/v22.mjs` -- amended to accept v2.3.x in addition to
  v2.2.x. PASS.
- `test/smoke.mjs` -- updated version assertions. PASS.

#### Files touched

- `yujin.app/nac-spec/js/nac.js` -- `invoke()` + `utter()` (~150
  LOC additive). Public API surface +2 functions. NAC.version
  bumped to '2.3.0-alpha.1', spec_version to '2.3'.
- `yujin.app/nac-spec/SPEC.md` -- new section 5.1.4 + header
  version line.
- `yujin.app/nac-spec/ads-demo/atlas-pro/index.html` -- manifest
  declares the `utter` verb + DOM listener routes into the demo's
  existing `handleUtterance(text)`.
- `packages/nac/package.json`, `build.mjs`, `test/smoke.mjs` --
  version bumps + new test in `npm test`.

#### Not yet wired

- `STRICT_VALIDATION` enforcement of `payload_schema` (alpha:
  schema is informational).
- A `NAC.search` / `NAC.upload` / `NAC.send_message` ergonomic
  shortcut sibling to `NAC.utter`. The generic `NAC.invoke` works
  today; concrete shortcuts can be added without re-spec.

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
