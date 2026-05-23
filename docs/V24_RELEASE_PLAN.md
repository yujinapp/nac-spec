# NAC3 v2.4 -- release plan (detailed)

**Owner:** Pablo Kuschnirof
**Author:** Sumi (Claude Opus 4.7)
**Started:** 2026-05-21
**Target ship:** TBD -- gated on V24-02 elevation gate landing
(it is the headline). Ships as ONE coherent train, not piecemeal.
**Last revision:** 2026-05-21 night session, after Conduit H4
benchmark + Gate 1 + Gate 2 + Pablo's "Elevate Privs" clarification.

This doc is the single source of truth for what has to happen
before `@nac3/runtime@2.4.0` (or `3.0.0`, see Open Questions)
ships. Every V24-NN item below carries an explicit
**Veredicto post-Conduit** subsection that revisits the item's
necessity in light of what the Conduit benchmark + the 2.3.1
stable state actually delivered.

Companion docs:
- `ROADMAP.md` -- master roadmap (must reflect this train at
  cut time).
- `V23_STABLE_RELEASE_PLAN.md` -- structural precedent.
- `NAC3_COVERAGE_INTERNAL.md` -- internal coverage matrix;
  some v2.4 items close specific gaps listed there.
- `packages/nac/SPEC.md` -- normative contract; gets new
  section 5.1.8 (elevation) plus updates to 5.1.4
  (payload_schema enforcement), 5.1.7 (capability cross-ref
  to elevation), and 6.2.32 (confirm_action cross-ref to
  elevation).
- `packages/nac/CHANGELOG.md` -- the 2.4.0 entry currently
  documents ONLY V24-01 (strict resolution); the entry MUST
  be expanded to cover the full train before publish.

---

## Snapshot of what ships in 2.3.1 (the baseline this plan
extends)

Per `packages/nac/CHANGELOG.md` and Conduit benchmark evidence:

| Capability | Status in 2.3.1 |
|---|---|
| `NAC.click` / `fill` / `tab` / `tab_by_label` / `click_by_verb` | shipped |
| `NAC.invoke(action_id, payload)` payload-bearing dispatch | shipped |
| `NAC.utter(action_id, {text, lang?, voice?})` | shipped |
| `NAC.bindAction` (v2.2) / `NAC.bindTab` (v2.3) host helpers | shipped |
| `NAC.edit_field(nac_id)` field editor primitive | shipped |
| Open shadow DOM traversal (depth 10) | shipped |
| Closed shadow DOM voluntary exposure (`el.nac3 = {...}`) | shipped |
| `nac:shadow_blocked` / `nac:shadow_protocol_violation` events | shipped |
| Auth-aware capabilities (`requires_capability`) + gate on click/invoke | shipped |
| `setCapabilities` / `grantCapability` / `revokeCapability` / `userCapabilities` | shipped |
| `STRICT_VALIDATION = true` by default | shipped |
| `confirm_action` + `nac:action:confirm:requested/:granted/:denied` (v1.9.0) | shipped |
| ProvenanceBlock with `source.type` ∈ `'user' | 'agent' | 'script'` (v1.9.0) | shipped |
| Strict resolution (no lenient `indexOf` fallback) | **shipped in code**, NOT YET PUBLISHED. This is V24-01. |

The strict-resolution code already in `js/nac.js` 2.4.0
provisional + `packages/nac/dist/*` is the ONE piece of the
v2.4 train that has empirical validation (Conduit H4 178/180
cross-lang at N=3). Every other item below is **not yet
implemented**.

---

## Evolutivos detectados durante Conduit (lo que cambió el plan)

The Conduit benchmark window (2026-05-20 → 2026-05-21) surfaced
several findings that REFINE the v2.4 plan beyond what was on
the V23 deferred list:

1. **Silent damage is real and measurable.** 12/18 "model
   failures" were actually wrong-target resolutions silently
   succeeded by the lenient `indexOf` fallback. This confirms
   V24-01's necessity is not theoretical -- it is THE majority
   failure mode at scale. The agent-safety framing of the train
   gains weight: V24-01 + V24-02 together address the two
   classes of silent failure (wrong target + wrong consent).

2. **The disambiguation contract works in practice.** The
   `candidates: [...]` payload + `nac:disambiguation_requested`
   event let the model recover at turn 2 instead of looping. In
   the Conduit traces, recovery happened in 1 turn 100% of the
   time the candidate list was non-empty. **Validates the
   error-with-candidates design pattern** that V24-02 will
   reuse for elevation prompts.

3. **Cross-lang invariance of the manifest holds.** 178/180
   cells across en/es/zh/hi/ar at N=3 with the same manifest +
   same NAC IDs proves the language-decoupling principle. This
   strengthens the rationale for the elevation gate to be a
   PROVENANCE-based gate (not a language-based one) -- agents
   are agents regardless of prompt language.

4. **Shared-DB feed sort is a state contamination risk.** The
   benchmark hit this twice. The right fix at the harness layer
   is unique-per-iter seeds; at the SPEC layer, this validates
   the need for V24-08 (subscriptions / live state) -- agents
   currently have no way to know "what's the freshest article
   in this feed RIGHT NOW" beyond reading the DOM.

5. **The `disabled` semantics relaxation (v2.3 hotfix) held up.**
   No regression observed in Conduit. Reinforces that future
   semantics changes (V24-02 elevation gate) can ship with
   confidence if test coverage is comparable.

6. **STRICT_VALIDATION = true (v2.3 default) was not a problem
   in adoption.** Conduit's manifest registered without strict
   findings on every run. Suggests V24-03 (payload_schema
   STRICT enforcement) can also ship with default-true safely,
   if migration tooling is in place.

7. **The Pilot bundle BYOK pattern proved viable for
   production.** No API keys in code/build/git history. This
   is independent of v2.4 spec but justifies investing in
   V24-06 ergonomic shortcuts (`NAC.search` etc) that make BYOK
   workflows cleaner.

---

## Framing decision -- what is the v2.4 train?

**v2.4 is the "agent-safety train".** Two of its items
(V24-01 strict resolution + V24-02 elevation gate) close the
same gap from two angles: an autonomous agent should NEVER do
an irreversible thing invisibly. Strict resolution stops the
WRONG target; elevation stops the WRONG consent.

The other items (V24-03..V24-09) are the **payload formalisation
+ ergonomic shortcuts + interop hardening** that were already
pre-declared as "deferred to v2.4" in the V23 stable plan.
They ride the same train so the cut has a coherent story:
*"v2.4 = NAC3 that's safe under autonomous agents in production,
with the ergonomic surface those agents need."*

**Bundling principle:** the train ships as ONE release. V24-01
alone is **NOT** sufficient justification to publish v2.4 --
it would break train semantics and leave V24-02 (the real
headline) in limbo.

---

## V24-01 -- Strict id / verb / qualifier resolution

### Problem (motivated by Conduit H4)

`click_by_verb(plugin, verb, {qualifier})` in 2.3.x has a
lenient fallback path: after exact equality + `__suffix`
matches fail, the runtime calls `indexOf(qualifier)` and
resolves to the first element whose id CONTAINS the qualifier
string anywhere. This is silent: no error, no event, the agent
believes its dispatch succeeded.

In Conduit H4 (N=18 across 6 models, 3 flows), the lenient
runtime silently resolved 12 dispatches to the wrong element.
The most damaging pattern was Haiku in `post_comment`:
agent emits `click_by_verb('conduit', 'navigate', {qualifier:
'article'})` intending to click an article preview; runtime
matches `conduit.navigation.nav_item__new_article` by
substring "article"; DOM transitions to the editor; agent
loops home-editor-home-editor-... for 12 turns until budget
exhausted. To the agent, every dispatch said "ok". To the
human reviewing the trace, the runtime lied.

### Contract change

`click_by_verb` / `tab` (single-arg fallback) / `tab_by_label`:

- **Before (v2.3.x):** on no-exact-suffix match, fall through
  to substring `indexOf` search.
- **After (v2.4):** exact equality OR `__<suffix>` only.
  Throws `NacError` with `err.code` in
  `{no_matching_instance, ambiguous_qualifier, ambiguous_tab,
  ambiguous_label}` AND `err.candidates: [{nac_id, label}]`
  pre-validated against the live DOM. Also emits
  `nac:disambiguation_requested` on `document` with the same
  detail payload.

For `tab_by_label`, exact label match wins; fuzzy substring
matching is preserved BUT throws `ambiguous_label` if more than
one element's label matches the substring (was lenient before,
returning first).

### Error model + candidates contract

```js
{
  code: 'no_matching_instance' | 'ambiguous_qualifier' |
        'ambiguous_tab' | 'ambiguous_label',
  message: '<human-readable, with the original request>',
  candidates: [
    { nac_id: '<exact id>', label: '<human label from DOM>' },
    ...
  ]
}
```

`candidates` is pre-validated against the live DOM: every entry
is an element the runtime CAN resolve right now. The agent
picks from this list (via a follow-up `click_by_verb` with the
exact `nac_id` OR a `click` to the same), never invents another
qualifier guess.

### Companion event

`nac:disambiguation_requested` on `document` with the SAME
detail payload. Hosts that want to render a UI prompt for the
USER (not just the agent) listen for this. The two surfaces
are siblings, NOT redundant: the error informs the agent at
the API boundary, the event informs any host-side UX listener.

### Tests

- `packages/nac/test/stage7-strict-resolution.mjs` -- 9
  invariants PASS against live dev server.
- Conduit H4 N=10 EN baseline (180 runs) + N=3 multilingual
  (180 runs) = empirical validation at scale.

### Migration impact

Adopters whose agents depended on lenient substring resolution
need to either (a) supply unambiguous qualifiers in agent
output, or (b) catch the new error and present the candidates
UI (recommended -- it's strictly better than the old behavior).
Migration guide: `guides/MIGRATION_v2.3_to_v2.4.md` (TBD;
includes 3 worked examples for the most common patterns).

### Veredicto post-Conduit (¿sigue siendo necesario?)

**SÍ, sin dudas. Es la headline de seguridad del train.** El
benchmark proved that 67% of what we previously classified as
"model failures" was actually runtime damage. This item is no
longer "behavior fix"; it is "safety primitive for assistive
tech". The 12/18 number is the marketing line for the v2.4
launch posts.

The implementation is DONE in code. The ONLY remaining work
on this item is:
- (a) SPEC.md sec 5.1.2 update with the new error model.
- (b) CHANGELOG 2.4.0 entry expansion (currently only mentions
  this item; needs to reflect the full train).
- (c) Migration guide write-up.

---

## V24-02 -- Elevation gate (sudo for agents)

### Problem

The v1.9.0 `confirm_action` interposition (SPEC sec 6.2.32)
fires a modal for any action carrying `irreversible /
requires_confirmation / data_loss / dangerous` hints. The
modal blocks until SOMETHING clicks the confirm button. Today
that "something" can be any DOM click handler -- including a
synthetic click emitted by the agent itself.

For Yujin's primary use case (assistive tech for children with
disabilities), this is unacceptable. The child speaks "delete
my account" via voice; agent dispatches the verb; modal
appears asking "are you sure?"; agent dispatches another click
on confirm; account is deleted. The modal IS the safety
primitive, and it's voluntary.

### Principle

An autonomous agent operating on behalf of a child / disabled
user MUST NOT be able to auto-click "OK" on a destructive-
action confirmation. The human owner of the account is the
only legitimate confirmer; the agent has to surface the request
and wait.

### Contract change

When `confirm_action` fires its modal, the confirm-button
click handler consults a new gate. The gate decision tree:

1. If `event.isTrusted === true` AND
   `provenance.source.type === 'user'`: PASS.
   (Real human interaction, browser-native, unspoofable from
   script.)
2. Else if `provenance.source.type === 'agent'` AND the
   current session holds the `__elevated__` capability (or
   equivalent grant with valid TTL): PASS.
3. Else: REJECT with `code='confirm_requires_elevation'`,
   emit `nac:elevation:requested` on document with the
   pending action's metadata, leave the modal open.

### Default policy -- which hints trigger the gate

Gate ENGAGED for actions with ANY of the following hints
(subset of the v1.9.0 Sec 3.1 priority order):

- `irreversible`
- `data_loss`
- `session_boundary`
- `audit_required`
- `dangerous`

Gate NOT engaged for `requires_confirmation` alone (covers
benign "are you sure?" modals that aren't dangerous, e.g.
"discard draft?"), `external_side_effect` (would force every
webhook to gate; too aggressive), `long_running`, `costly`.
Adopters override per element with `requires_elevation:
false` (or `true` to engage gate on non-default hints).

### Public API

```ts
// Gate decision -- exposed for hosts building custom confirm
// flows on top of confirm_action:
NAC.requiresElevation(action_id): boolean

// Agent-facing -- request permission ahead of time (avoids
// the "click rejected" round-trip):
NAC.requestElevation(reason: string, action_id?: string):
  Promise<{
    granted: boolean,
    one_shot: boolean,
    ttl_ms?: number,
    denied_reason?: string
  }>

// Host-facing -- after surfacing prompt to user, host calls
// ONE of these:
NAC.grantElevation(action_id, opts?: { ttl_ms?: number })
NAC.denyElevation(action_id, reason: string)

// Session state:
NAC.elevatedUntil(): number | null    // epoch ms or null
NAC.dropElevation(): void              // user-initiated revoke
NAC.isElevated(): boolean
```

### Grant modes

- **One-shot:** confirms just this pending action. Gate
  unlocks for `action_id` only, then re-locks. Default for
  actions with `irreversible | data_loss` hints.
- **Window:** elevates the agent for a configurable duration
  (default 5 min, max 30 min, configurable per tenant via
  `NAC.setMaxElevationWindowMs`). Capability auto-revokes at
  TTL via `nac:elevation:expired`. Default allowed only for
  hints `session_boundary | audit_required` and requires
  explicit user opt-in in the elevation prompt UI.

### New event family

- `nac:elevation:requested` -- detail
  `{action_id, agent_id?, reason, action_metadata}`. Fires
  when the gate rejects an agent confirm-click. Hosts MUST
  listen and render a prompt.
- `nac:elevation:granted` -- detail
  `{action_id, one_shot, ttl_ms?, granted_by_provenance}`.
  Fires after host calls `grantElevation`.
- `nac:elevation:denied` -- detail
  `{action_id, reason}`. Fires after host calls
  `denyElevation` OR after a TTL timeout on a pending
  prompt (default 5 min host response window).
- `nac:elevation:expired` -- detail `{ttl_started_at,
  ttl_ms}`. Fires when a window grant's TTL elapses.

### Provenance defence (anti-spoof)

A malicious script can lie in its ProvenanceBlock about
`source.type`. The gate cross-checks against the DOM event's
`event.isTrusted` property (browser-native, unspoofable from
script). The provenance MUST satisfy BOTH:

- `event.isTrusted === true` (real user interaction), AND
- `provenance.source.type === 'user'` (declared)

Agents that emit synthetic clicks fail `isTrusted`. Scripts
that lie about provenance pass `isTrusted: false` and the gate
rejects on that signal alone. Test: a script that calls
`el.click()` synthetically AND declares
`source.type='user'` in its provenance MUST be rejected.

### Host wiring example

```html
<script>
  document.addEventListener('nac:elevation:requested', (e) => {
    const { action_id, reason, action_metadata } = e.detail;
    showElevationModal({
      title: 'Agent requests permission: ' +
             action_metadata.verb,
      body: reason,
      onApproveOneShot: () => NAC.grantElevation(action_id),
      onApproveWindow: (ms) => NAC.grantElevation(action_id,
                                                  {ttl_ms: ms}),
      onDeny: (why) => NAC.denyElevation(action_id, why),
    });
  });
</script>
```

The elevation modal itself is host-rendered, NOT
auto-rendered by NAC. NAC ships only the gate + event + API.
Hosts compose their own elevation UX consistent with the rest
of their UI.

### SPEC section to add

New normative section in `packages/nac/SPEC.md` at sec 5.1.8.
Plus cross-references in:
- Sec 5.1.7 (capabilities) -- mention elevation as
  capability-flow extension.
- Sec 6.2.32 (confirm_action) -- mention the gate now applies.
- Sec 6.2.1 (ProvenanceBlock) -- mention `isTrusted`
  cross-check.

### Tests

`packages/nac/test/v24-elevation.mjs` -- ~20 assertions:

1. Agent click on confirm modal (isTrusted=false,
   source.type=agent, no elevation) → REJECTED with
   `code='confirm_requires_elevation'`.
2. Human click on confirm modal (isTrusted=true) → PASSES.
3. Agent calls `requestElevation` → modal prompt fires →
   host calls `grantElevation` → next confirm-click passes
   (one-shot).
4. Window grant honours TTL; expires correctly via
   `nac:elevation:expired`.
5. Window grant default 5 min, max 30 min, configurable.
6. Per-element `requires_elevation: false` bypasses gate.
7. Per-element `requires_elevation: true` engages gate even
   without default hints.
8. Per-tenant policy override
   (`NAC.setElevationPolicy({hints: [...]})`).
9. Default policy hint-mapping matches the spec
   (`irreversible | data_loss | session_boundary |
   audit_required | dangerous`).
10. ProvenanceBlock spoofing: script with isTrusted=false +
    source.type=user → REJECTED.
11. ProvenanceBlock omitted (legacy code path) → treated as
    `source.type='unknown'` → REJECTED if gate engaged.
12. `dropElevation` clears state cleanly; subsequent agent
    confirms re-trigger gate.
13. Back-compat: hosts that don't wire the
    `nac:elevation:requested` listener get the legacy
    `confirm_action` behaviour for actions WITHOUT elevation
    hints.
14. Back-compat: legacy `confirm_action` modal still works
    for human-only flows (no agent involvement).
15. Race condition: 2 concurrent elevation requests from
    same agent for same action_id → second waits for first.
16. Race condition: agent attempts to call `grantElevation`
    on itself → REJECTED (only host can grant).
17. Audit: every grant/deny logged via `nac:elevation:*`
    events (consumers can persist to audit log).
18. TTL behaviour: `elevatedUntil()` returns correct epoch ms
    during window; null after.
19. `isElevated()` returns true during window, false outside.
20. Host elevation prompt timeout (5 min default, configurable)
    fires `nac:elevation:denied` with reason=`host_timeout`.

### Migration impact

Hosts that have `confirm_action` flows with destructive
actions MUST wire the `nac:elevation:requested` listener
before v2.4 upgrade, otherwise agents hit a rejected click
with no UI recovery (poor UX, not a security failure).
Migration guide includes the host-side wiring template +
fallback (if no listener present within 1s of
`nac:elevation:requested`, NAC auto-emits a console warning).

### Veredicto post-Conduit (¿sigue siendo necesario?)

**SÍ, ES LA RAZÓN DE SER del train v2.4.** Conduit benchmark
focused on resolution quality (which V24-01 addressed); it did
NOT exercise destructive-action confirmation flows. But Pablo's
clarification reframed the train: the v2.4 train is about
agent safety, and resolution + confirmation are the two
surfaces.

The implementation is NOT started. This is the single biggest
work item in v2.4. Estimated Sumi-time: 1 full day of focused
work + 2-3 days of test coverage + Atlas Pro pilot soak (per
OQ5 below).

**Strong recommendation: this item gates the entire train. Do
NOT publish v2.4 with V24-01 alone.**

---

## V24-03 -- `payload_schema` STRICT enforcement

### Problem

v2.3 stable allows actions to declare `payload_schema` in
their manifest, but the runtime treats it as informative only.
Validators warn on mismatch; nothing rejects.

This means an agent can dispatch `NAC.invoke('fin.transfer',
{amount: 'one billion'})` (string instead of number) and the
runtime forwards it to the host without warning. The host
might silently coerce, throw an opaque error 30s later, or
worst case execute the wrong intent.

### Contract change

`NAC.invoke(action_id, payload)`:

- **Before (v2.3.x):** runtime accepts any payload shape;
  validator warns but doesn't reject.
- **After (v2.4):** if the action declares `payload_schema`
  in the manifest AND `STRICT_VALIDATION = true` (the v2.3
  default), the runtime validates the payload shape against
  the schema BEFORE dispatching. On mismatch: rejects with
  `code='payload_schema_violation'` and a `findings` array
  listing each failed assertion.

### Schema grammar

JSON-Schema-shaped subset; the runtime ships a validator that
covers the supported keywords without pulling in a full
JSON-Schema implementation. Supported:

- `type` (string, number, boolean, object, array, null)
- `required` (array of property names)
- `properties` (per-property recursion)
- `enum` (allowed literal values)
- `items` (for arrays)
- `minLength` / `maxLength` (strings)
- `minimum` / `maximum` (numbers)
- `pattern` (regex string)
- `format` (`'email' | 'uri' | 'date' | 'date-time' | 'uuid'`)
- `oneOf` / `anyOf` (composition, 1-deep)

Keywords outside this list: validator emits
`schema_keyword_unsupported` warning and skips. Documents the
deliberate trade-off (small runtime, predictable validation).

### Error shape

```js
{
  code: 'payload_schema_violation',
  message: 'payload does not match declared schema',
  findings: [
    { path: '/amount', keyword: 'type',
      expected: 'number', actual: 'string' },
    { path: '/destination', keyword: 'required',
      reason: 'missing property' },
    ...
  ]
}
```

### Migration impact

Adopters with declared `payload_schema` should run
`NAC.validate_global({probe: true})` against their production
manifest to surface drift BEFORE v2.4 lands. A new tool
`packages/nac/tools/schema-lint.mjs` ships with the v2.4 cut
to assist (CLI: `npx @nac3/runtime schema-lint
<manifest.json>`). Adopters who haven't declared
`payload_schema` are unaffected (the gate only fires when the
schema is present).

Opt-out for adopters who declared schemas but aren't ready
for enforcement: set
`NAC.STRICT_PAYLOAD_SCHEMA = false` BEFORE first invoke
(separate from the general `STRICT_VALIDATION` flag, which
governs manifest shape only).

### Tests

`packages/nac/test/v24-payload-schema.mjs` -- ~25 assertions
covering each supported keyword + composition + back-compat
(actions without declared schema pass through unchanged) +
the opt-out flag.

### Veredicto post-Conduit (¿sigue siendo necesario?)

**SÍ, pero con prioridad bajada de P0 a P1.** Conduit's
benchmark exercised `NAC.click` / `click_by_verb` / `fill`
extensively. It did NOT exercise `NAC.invoke` with declared
payload schemas. So the gap exists in theory but didn't bite
us empirically.

Two reasons to still ship it in v2.4:
1. Atlas Pro (the canonical adopter) already declares
   `payload_schema` on `atlas_pro_ad.mic` and other actions.
   Enforcement closes their exposure.
2. The schema-lint tool benefits adopters NOW regardless of
   when enforcement flips on. Ship the tool with v2.4 even if
   enforcement-default-on is deferred to v2.5.

Recommendation: keep V24-03 in scope but reduce test surface
to ~15 assertions (skip the 1-deep composition for now;
revisit if an adopter requests).

---

## V24-04 -- Closed shadow root bridging primitive

### Problem (revised post-2.3.1)

v2.3.0 SHIPPED the closed-shadow exposure API: components
expose `el.nac3 = { query, queryAll, describe }` on the host
element, and the runtime delegates. This works today for
single-depth closed roots.

What's missing: the runtime has no internal helper to walk
a chain of nested closed roots (closed root A whose children
include closed root B). Each host re-implements the
traversal in their `query` callback if they want to support
deep nesting.

### Contract change (revised scope)

Runtime gains internal `_resolveAcrossClosedShadow(id)` that:

1. Walks open shadow roots normally (existing).
2. On closed shadow: probes `host_element.nac3` and traverses
   into the exposed manifest snapshot.
3. **NEW:** recurses if the exposed element is itself a
   closed-shadow host (depth limit 10, same as open shadow).
4. Returns the deep-resolved element handle.

Exposed publicly as `NAC.findDeep(id)` for hosts that want
the helper directly (rare; most callers use `NAC.click` etc
which call it internally).

### Tests

`packages/nac/test/v24-closed-shadow.mjs` -- ~12 assertions
covering nested closed roots (2-deep + 3-deep), exposure
manifest mismatches, `findDeep` returning null cleanly when
not exposed, depth limit enforcement.

### Veredicto post-Conduit (¿sigue siendo necesario?)

**SÍ, pero con prioridad bajada a P2 (signal).** Conduit
doesn't use closed shadow components anywhere. No adopter in
the V23 stable cut reported needing nested-closed-root
support. This is theoretical until a Web Components-heavy
adopter shows up.

Keep in scope to close the loop on the V23 deferred list, but
do NOT block the v2.4 cut on this if it slips. Acceptable to
re-defer to v2.5 if it surfaces complications.

---

## V24-05 -- `NAC.invoke` ack response data vocabulary

### Problem

v2.3 stable defines `nac:action:succeeded` with detail
`{request_id, slots: {...}}` where `slots` is host-defined
free-form. Agents can't programmatically interpret responses
without per-action documentation. Common patterns
(success/error, created_id, affected count, warnings) get
re-implemented inconsistently across adopters.

### Contract change

Action manifest gains optional `response_schema` alongside
`payload_schema`. The ack event `nac:action:succeeded`
carries `detail.response` validated against `response_schema`
(same grammar as V24-03).

Standard response keys (vocabulary, OPTIONAL but documented):

- `success` (boolean, required when declared)
- `result` (the primary returned value)
- `created_id` (string, for create-style actions)
- `affected_count` (number, for batch operations)
- `next_action` (string nac_id, suggested follow-up for
  chained flows)
- `warnings` (array of `{code, message}`)

Custom keys allowed under `extensions: {...}` map.

Back-compat: actions without declared `response_schema`
continue to receive `slots` free-form. Adopters opt in per
action.

### Tests

`packages/nac/test/v24-ack-vocab.mjs` -- ~10 assertions
covering standard keys, custom extensions, back-compat,
schema-driven validation of the response.

### Veredicto post-Conduit (¿sigue siendo necesario?)

**SÍ, prioridad P1.** Conduit didn't exercise `invoke` (its
flows are click/fill/tab only). But the multi-step closing
dialogue table for the Conduit case study WOULD benefit from
the `next_action` vocabulary -- agents reading the trace
could chain on response data instead of re-reading DOM. It's
preparatory for richer agent integrations.

Ship in v2.4 with the vocabulary documented as RECOMMENDED
(not required). Enforcement (reject responses that omit
declared schema fields) is opt-in via a new flag
`NAC.STRICT_RESPONSE_SCHEMA = false` (default; flip to true
in v2.5 if adopters are happy).

---

## V24-06 -- `NAC.search` / `NAC.upload` / `NAC.watch` shortcuts

### Problem

`NAC.invoke` is general-purpose; agents constructing search
calls write boilerplate every time:
```js
NAC.invoke('app.search.posts', {query: 'react'})
NAC.invoke('app.upload.avatar', {file: blob, mime: 'image/png'})
```
Common verbs deserve ergonomic wrappers.

### Contract change

Three new public methods, each a thin wrapper:

```ts
NAC.search(plugin: string, query: string,
           opts?: {limit?: number, filters?: object}):
  Promise<SearchResult[]>

NAC.upload(plugin: string, file: File | Blob,
           opts?: {target?: string, metadata?: object}):
  Promise<UploadAck>

NAC.watch(plugin: string, target: string, callback):
  () => void   // returns unsubscribe
```

Resolution:
- `search` → finds the action whose verb is `search` (or
  `find`) in the plugin's manifest and dispatches with
  `{query, ...opts}` payload.
- `upload` → verb `upload` (or `attach`) with `{file, mime,
  size, ...opts}` payload. File transfer: ArrayBuffered +
  base64 for files <1MB, structuredClone for larger (host
  hint in manifest determines).
- `watch` → if plugin declares `subscriptions` (future
  V25), uses native subscription; otherwise falls back to
  polling with manifest-declared `watch_interval_ms`.

### Tests

`packages/nac/test/v24-shortcuts.mjs` -- ~12 assertions
covering each shortcut + error path (target action not in
manifest) + file size threshold for upload + watch
unsubscribe.

### Veredicto post-Conduit (¿sigue siendo necesario?)

**Prioridad P2 (signal only).** Conduit doesn't use these
verbs at all. Atlas Pro uses `utter` not `search/upload`. The
demand for these shortcuts is hypothetical until an adopter
with a search-heavy or upload-heavy use case shows up
(potentially Yujin's Reports Suite F70 or Sazanami hub).

Recommendation: spec the API in v2.4 SPEC.md (so future
adopters know the contract) but defer IMPLEMENTATION to v2.5
unless a P0 adopter requests during the v2.4 prep window.
This keeps the train smaller without losing the design.

---

## V24-07 -- Cross-imports + reentrancy + cycle detection (peer interop)

### Problem

v2.3 peer interop is one-way (host → peer). A peer plugin
cannot import another peer's actions to compose flows. This
limits multi-plugin app patterns (e.g. a finance plugin
calling into a notifications plugin to alert a user about a
posted journal entry).

Additionally, even one-way calls can recurse if a target
plugin calls back into the source plugin's action. Today this
silently stack-overflows.

### Contract change

Plugin manifest gains `imports: [{plugin: 'other_slug',
actions: ['verb1', 'verb2']}]`. Runtime resolves imports at
register time, detects cycles
(`A.imports(B) AND B.imports(A)` chain) and throws
`code='circular_import'` with the cycle path in the error
detail.

Reentrancy guard: if plugin A's action calls into plugin B
which calls back into plugin A within the same call stack,
the runtime detects re-entry, throws `code='reentrant_invoke'`
with the call stack unless the caller passed
`opts.allow_reentry: true` (explicit override).

### Tests

`packages/nac/test/v24-cross-imports.mjs` -- ~15 assertions
covering 2-deep cycles, 3-deep cycles, reentrancy detection,
opt-out via `allow_reentry`, valid bidirectional flows
(non-cyclic).

### Veredicto post-Conduit (¿sigue siendo necesario?)

**Prioridad P1 (stable quality).** Conduit is a single-plugin
app so this didn't surface. But the NAC_INTEROP_MCP.md plan
calls this out as the gap that blocks multi-plugin
composition, and Yujin's CRM-side multi-plugin patterns
(F58 catalog, F73 sazanami, F71 workflow actions) all assume
this. Ship in v2.4 so the multi-plugin story is unblocked
once an adopter integrates.

---

## V24-08 -- Optional streaming chat dispatch

### Problem

`NAC.invoke` is request-response; an action either completes
in one ack or fails. Streaming responses (chat tokens,
incremental search results, real-time progress) have no
contract surface today.

### Contract change

`NAC.invoke` gains optional `opts.stream: true`. When set:

- Ack event family extends with `nac:action:chunk` (detail
  `{request_id, chunk_index, chunk: any, done: boolean}`).
- `nac:action:succeeded` fires AFTER the final chunk
  (`done: true`), with `detail.response` being the full
  assembled response (host-side concatenation logic).

Hosts opt in per action via manifest declaration
`supports_streaming: true`. Back-compat: actions without
streaming use existing single-ack flow.

### Tests

`packages/nac/test/v24-streaming.mjs` -- ~10 assertions
covering chunk ordering, partial-stream cancellation
(`NAC.cancel(request_id)` mid-stream), back-compat fallback,
host failing to support streaming for a streaming-requested
action (rejects with `code='streaming_not_supported'`).

### Veredicto post-Conduit (¿sigue siendo necesario?)

**Prioridad P2 (signal only) -- specs OK, implementation
defers.** Conduit doesn't stream anything. Atlas Pro doesn't
either. The demand is hypothetical until a chat-bot-style
adopter requests. The implementation surface is large; the
test surface is large. Spec it in V24 SPEC for forward-
compat; defer implementation to v2.5 unless an adopter
forces it. Documenting the spec now lets us discuss with
prospective adopters during the v2.4 → v2.5 window without
making promises we'd have to break.

---

## V24-09 -- Cross-browser audit (Firefox + WebKit)

### Problem

Existing test infrastructure runs against Chromium via
Playwright. Adopters using Firefox or Safari users (a
significant fraction of accessibility-focused audiences)
have no guarantee NAC3 behaves identically.

### Tasks

- Add Playwright configs for `firefox` and `webkit`
  projects.
- Run the full smoke + stage1..6b + v22 + v23-* + v24-*
  suites on all three browsers.
- Document browser-specific quirks in `docs/
  CROSS_BROWSER_NOTES.md`.
- CI gate: a v2.4-stable cut requires all three browsers
  green.

### Tests

No new test files; reuses existing suites via Playwright
multi-browser config.

### Veredicto post-Conduit (¿sigue siendo necesario?)

**SÍ, prioridad P1.** Even if it surfaces no bugs, the
guarantee matters for assistive-tech adopters who don't
control which browser their end-users have. Atlas Pro's
embeddable ad surface specifically benefits because publishers
embed in any browser. Should ship green for the v2.4 stable
tag.

If issues surface, document them in the cross-browser notes
and gate FIXES to v2.5 (don't slip v2.4 on browser-specific
patches unless a P0 adopter is blocked).

---

## Deferred to v2.5 (NOT in this cut)

- Mobile-native bridge (RN / Flutter / Swift / Kotlin) --
  see `NAC3_COVERAGE_INTERNAL.md` Gap 5.
- Canvas / WebGL primitive (NAC3-Scene) -- Gap 1.
- iframe cross-origin proxy -- Gap 2.
- Drag-and-drop / gestures verb -- Gap 3.
- Live state subscriptions -- Gap 4.
- Hydration-window streaming (Next.js App Router) -- Gap 6.
- V24-06 IMPLEMENTATION (spec ships in v2.4; runtime in v2.5
  if no demand surfaces).
- V24-08 IMPLEMENTATION (spec ships in v2.4; runtime in v2.5
  if no demand surfaces).

Each will get its own `V25_*_PLAN.md` once a design partner
triggers prioritisation.

---

## Priority tiers + execution order

### P0 -- Blockers for v2.4 publish (no cut without these)

| # | Item | Owner | Status |
|---|---|---|---|
| 1 | V24-01 strict resolution -- SPEC sec 5.1.2 update + CHANGELOG expansion + migration guide | Sumi | code shipped, docs pending |
| 2 | V24-02 elevation gate -- IMPLEMENTATION + SPEC sec 5.1.8 + tests + host-side demo + docs | Sumi | not started |
| 3 | V24-03 payload_schema STRICT (reduced scope per veredicto) -- implementation + schema-lint tool + tests | Sumi | not started |
| 4 | OQ1 MAJOR vs MINOR decision | Pablo | pending |
| 5 | Cut PR with full CHANGELOG diff + SPEC updates + version bump | Sumi | gated on 1-4 |
| 6 | Publish to npm | Pablo (gpg-signed) | gated on 5 + OQ5 |

### P1 -- Stable quality (what a reviewer asks for)

| # | Item | Notes |
|---|---|---|
| 1 | V24-05 ack vocabulary (RECOMMENDED, not required) | Drives adopter ergonomics |
| 2 | V24-07 cross-imports + reentrancy | Closes interop story; gates multi-plugin patterns |
| 3 | V24-09 cross-browser audit | CI matrix expansion; should ship green |
| 4 | `MIGRATION_v2.3_to_v2.4.md` | One per breaking item, worked examples |
| 5 | Atlas Pro voice ad regression smoke | Catch surprises early |
| 6 | Conduit-NAC3 fork regression on v2.4 final | Confirms our own benchmark holds |

### P2 -- Signal (no blocker)

| # | Item | Notes |
|---|---|---|
| 1 | V24-04 closed-shadow primitive | Theoretical until Web Components adopter |
| 2 | V24-06 shortcuts SPEC (implementation defers) | Documentation lets us discuss with adopters |
| 3 | V24-08 streaming SPEC (implementation defers) | Same rationale |
| 4 | Updated demos (Angular/React/Vanilla) showing elevation flow | Diffusion-side |
| 5 | Landing page version chips updated (unify per OQ3) | Cosmetic |
| 6 | NAC numbering header-comment cleanup in `nac.js` | Stale "v1.9.0" in line 1 should reference the constant |

---

## Acceptance criteria for v2.4 stable tag

1. All P0 items SHIPPED with green tests on Chromium + FF +
   WebKit (V24-09).
2. SPEC.md updated with:
   - Sec 5.1.2 strict-resolution error model
   - Sec 5.1.4 payload_schema enforcement
   - Sec 5.1.7 capability cross-ref to elevation
   - Sec 5.1.8 NEW elevation gate
   - Sec 6.2.32 confirm_action cross-ref to elevation
   - Sec 6.2.1 ProvenanceBlock isTrusted cross-check
3. CHANGELOG 2.4.0 (or 3.0.0) entry documents EVERY breaking
   change + migration path per item.
4. `MIGRATION_v2.3_to_v2.4.md` exists with worked examples
   for each breaking item.
5. Atlas Pro voice ad regression smoke passes against v2.4
   `unpkg` URL.
6. Conduit-NAC3 fork regression: N=10 EN baseline reproduced
   under v2.4 final code (not the provisional 2.4.0 from the
   benchmark window).
7. v2.4 `unpkg` URL serves the new bundle within 10 min of
   publish.
8. Landing page (`yujin.app/nac-spec/`) version chips
   reflect v2.4 consistently (resolved per OQ3).
9. Discord announce + launch posts updated for v2.4.
10. Pablo signs the npm publish manually (NEVER auto-publish
    behavior changes).

---

## Open questions for Pablo

### OQ1 -- MAJOR (3.0.0) vs MINOR (2.4.0)?

The train contains AT LEAST TWO behavior-of-contract changes:

- V24-01 strict resolution: code paths depending on lenient
  substring fallback BREAK.
- V24-02 elevation gate: agent code paths that auto-confirmed
  modals are now REJECTED.

Per strict SemVer, behavior-of-contract changes are MAJOR.
v2.4.0 (MINOR) would be technically wrong but pragmatically
common ("we treat as minor because the JSON shapes / function
signatures didn't change, only failure behaviour").

**Recommendation: publish as 3.0.0.** Reasons:
1. Honest SemVer signals to adopters they must read the
   migration guide.
2. The MAJOR namespace lets us drop v1.x compat shims that
   carry deadweight.
3. Marketing-wise, "NAC3 → NAC v3" tracks cleanly with the
   prior "NAC v1 → NAC3 v2" precedent (MAJOR jumps tie to
   product milestones).
4. The "agent-safety train" framing reads as a major version
   theme more naturally than a minor.

If you prefer 2.4.0 MINOR for continuity, defensible but
requires a SPEC paragraph explaining pragma over strict
SemVer. Decide BEFORE the cut.

### OQ2 -- Elevation grant modes

The window-grant option (default 5 min) is convenient for
agents running multi-step flows but technically widens the
attack surface (any confirm within the window passes without
re-prompting).

**Recommendation:** ship BOTH; default ONE-SHOT for actions
with `irreversible | data_loss` hints; allow window for
`session_boundary | audit_required` only with explicit user
opt-in via the elevation prompt UI. Max window 30 min hard
cap.

### OQ3 -- Landing page version chips

Today `yujin.app/nac-spec/index.html` shows per-integration
chips (`v2.2 npm + React 18`, `v2.2 npm + Angular 17`, etc).
Some are stale (e.g. `v2.3 preview` chip).

Options:
- (a) Update each chip to highest tested version (most
  honest, requires per-chip audit).
- (b) Replace all chips with single "current: v2.4" at top.
- (c) Keep per-integration chips but standardise format:
  "Adopter on v2.4" with green dot if green-tested, yellow
  if last tested at prior version.

**Recommendation: (c)** -- middle ground that preserves the
historical per-integration verification while flagging
staleness.

### OQ4 -- `MIGRATION_v2.3_to_v2.4.md` placement

Per V22/V23 precedent, migration docs live in
`packages/nac/guides/MIGRATION_v*_to_v*.md`. Confirm same
location for v2.4, or move to `yujin.app/nac-spec/docs/` for
public visibility on the landing page. Recommendation: KEEP
in `packages/nac/guides/` and link from the landing.

### OQ5 -- Adopter pilot before publish

Atlas Pro is the canonical reference adopter. Should v2.4
ship to the live Atlas Pro deploy as a pilot for 48-72h
BEFORE general npm publish, to catch surprises before
adopters cascade? V23 did this.

**Recommendation:** YES -- same playbook as v2.3. Defer
general publish until 72h on Atlas Pro green.

### OQ6 -- Elevation default policy: which hints trigger?

Default proposal: `irreversible | data_loss | session_boundary
| audit_required | dangerous`.

Should we add `external_side_effect` (every webhook / API
call) -- which would make every non-trivial action gated by
default?

**Recommendation: KEEP the proposed 5 hints; do NOT add
`external_side_effect`** (too aggressive, would force every
adopter to wire elevation UX for non-destructive flows).
Adopters can opt in per element if they want.

### OQ7 -- Conduit's role in v2.4 launch

The Conduit-NAC3 fork is the empirical validation of V24-01.
Should we ship Conduit-NAC3 as a co-launched artefact with
v2.4 (i.e. the public deployment Pablo asked about in the
closure brief)?

**Recommendation: YES** -- but as a SEPARATE thread per the
multi-brief decision tree:
- Conduit closure brief = product evaluable by an
  organization (closes that thread).
- v2.4 SPEC + npm publish = protocol release (this train).
- The two share the strict-resolution finding but don't gate
  each other. Both can launch the same week.

### OQ8 -- Multi-tenant elevation policy

For SaaS-style adopters (Yujin CRM, future Forge-spawned
products), each tenant has different elevation policies
(internal-tools admin = no gate; consumer-facing = strict
gate). API surface for tenant-scoped policy:

```ts
NAC.setElevationPolicy({
  default_hints: [...],
  overrides: {[plugin_slug]: [...]},
})
```

Should this ship with v2.4 or defer to v2.5?
**Recommendation:** ship the API in v2.4 (cheap addition);
default tenant policy = the global default (so adopters who
don't configure get sensible behavior).

---

## Order proposed for execution (once Pablo OKs)

1. **Pablo decides OQ1-OQ8.** Especially OQ1 (MAJOR/MINOR)
   and OQ5 (Atlas pilot) -- they shape everything downstream.
2. **Sumi implements V24-02 elevation gate** (highest-risk
   item; deserves longest tail to validate).
3. **Sumi implements V24-03 payload_schema STRICT** (clean
   addition, limited blast radius, ships with schema-lint
   tool).
4. **Sumi implements V24-05 ack vocabulary** (back-compat by
   design, opt-in).
5. **Sumi implements V24-07 cross-imports + reentrancy** (graph
   algorithm only; no I/O).
6. **Sumi implements V24-04 closed-shadow primitive** (mostly
   internal refactor; can defer to v2.5 if surface contention
   arises).
7. **Sumi writes V24-06 + V24-08 SPECS** (no implementation in
   v2.4; documentation for future adopters).
8. **Cross-browser audit V24-09** -- runs full suite on FF +
   WebKit, documents quirks.
9. **SPEC + CHANGELOG + migration guide updated coherently** in
   one PR.
10. **Atlas Pro pilot (OQ5)** -- 72h soak.
11. **General publish to npm** -- Pablo gpg-signs.
12. **Landing page chips updated (OQ3) + launch posts revised.**
13. **Conduit-NAC3 product launch** (separate thread, OQ7)
    coordinated with v2.4 publish.

Estimated total Sumi-time:
- V24-02 implementation + tests: 1-1.5 days
- V24-03 + V24-05 + V24-07: 1 day combined
- V24-04: 0.5 day
- V24-06 + V24-08 specs (no implementation): 0.5 day
- V24-09 cross-browser + quirk documentation: 0.5 day
- SPEC + CHANGELOG + migration guide: 0.5 day
- Demos updated: 0.5 day
- Total focused: 4.5-5 days
- + 72h Atlas Pro soak (calendar time, not Sumi)

---

## Where to find the work as it lands

| Component | Location |
|---|---|
| Runtime source | `js/nac.js` (mirror `packages/nac/src/*`) |
| Built bundles | `packages/nac/dist/nac.{cjs,mjs,browser.js}` |
| Spec | `packages/nac/SPEC.md` |
| CHANGELOG | `packages/nac/CHANGELOG.md` |
| Tests | `packages/nac/test/v24-*.mjs` (one per item) |
| Schema-lint tool | `packages/nac/tools/schema-lint.mjs` (NEW) |
| Migration guide | `packages/nac/guides/MIGRATION_v2.3_to_v2.4.md` (NEW) |
| Demos | `yujin.app/nac-spec/migration/demos/` |
| Landing | `yujin.app/nac-spec/index.html` (chips) |
| Launch posts | `yujin.app/nac-spec/docs/LAUNCH_POSTS_2026.md` |
| This plan | `yujin.app/nac-spec/docs/V24_RELEASE_PLAN.md` |
| Roadmap (master) | `nac-spec/docs/ROADMAP.md` (mirror update at cut) |

---

*Fin del plan v2.4 detallado. Próximo paso: Pablo decide OQ1-OQ8,
luego Sumi arranca por V24-02 (elevation gate).*
