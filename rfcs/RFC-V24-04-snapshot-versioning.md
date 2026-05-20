# RFC V24-04 -- Snapshot versioning + optimistic concurrency control

| Field | Value |
|---|---|
| **RFC number** | V24-04 |
| **Status** | Final |
| **Target version** | NAC3 v2.4.0 |
| **Editor** | Yujin |
| **Created** | 2026-05-19 (draft v1 -> v2 -> v3 -> Final, same day) |
| **Public comment period** | None. See "Notes on process" below. |
| **Depends on** | V24-01 (plugin slug uniqueness), V24-02 (syncPlugin idempotent) |
| **Out of scope** | Automatic decoration (walker). Treated as host responsibility; tooling left to product layer. |

**Notes on process.** The standard NAC3 RFC process (`CONTRIBUTING.md`)
requires a 14-day public comment period. This RFC was authored at a
moment when no third-party implementations of NAC3 v2.3 existed -- no
forks, no adopter implementations, no published agents -- so the comment
period would have surfaced no external feedback. Internal review across
two drafts (v1 -> v2 -> v3 -> Final) covered the gaps the public process
would have caught. Future RFCs MUST follow the standard 14-day window;
this one ships Final to lock the v2.4 contract before the first adopter
arrives.

---

## Abstract

This RFC promotes NAC3 from a decoration-and-verb contract to a full
agentic concurrency protocol. It introduces per-plugin and global
version tokens as first-class fields of `NAC.describe()`, makes mutating
APIs version-aware via optional `expected_*` parameters, defines a new
error class (`snapshot_stale`) and event family
(`nac:plugin:invalidated`, `nac:tree:invalidated`), specifies a
deterministic content-hash primitive for element-level coherence checks,
exposes an explicit hydration-complete signal, exposes a runtime
self-describing conformance tier, and establishes the runtime as the
arbiter of agent-host coherence rather than relying on host discipline.

The default tool for agents is `expected_plugin_version` -- scoped,
narrow, ignores noise outside the targeted plugin. `expected_tree_version`
is a documented escape hatch for cross-plugin orchestration.
Element-level hashes are an optional third tool for content-aware
checks; all three are honored at the NAC-3-versioned conformance tier.

All version parameters are optional at the v2.4 API boundary. A new
conformance tier (NAC-3-versioned) marks adoption; a strict mode
(NAC-3-strict) requires version expectations on every mutation. v3.0
will flip the strict default; v3.1 removes the unversioned path.

This positions NAC3 as the first-mover protocol with explicit agentic
concurrency primitives -- a category that MCP intentionally does not
address and that Computer Use sidesteps via screenshot polling.

---

## 1. Motivation

### 1.1 Empirical evidence

The 2026-05-18 three-way benchmark (NAC3 vs MCP vs raw DOM, four
reliable models, four tasks, partial N=15 at the time of writing)
surfaced three independent bugs in less than 48 hours. All three belong
to the same class:

| Bug | Manifestation | Cause |
|---|---|---|
| V24-01 | `click_by_verb` resolves to wrong root non-deterministically | Multiple DOM roots share a slug without `data-nac-plugin-id` |
| V24-02 | Sonnet T_MCP1 NAC3 success 47% -- planning on stale manifest | `NAC.register()` is append-only; re-registration accumulates stale entries |
| V24-04 (this) | Any plan made against `describe()` output may be silently invalidated by intervening DOM changes | No coherence contract between snapshot and dispatch |

V24-01 and V24-02 are tactical fixes addressing specific manifestations
of a systemic gap. **V24-04 names the gap.** The agent receives a
snapshot at time `t0`, plans against it, and dispatches at time `t1`.
Between `t0` and `t1` the page may rerender -- WebSocket push, concurrent
edit by another user, framework remount, validation logic changing
visibility, anything. The current contract has nothing to say about this
interval.

### 1.2 The three failure modes the current contract permits

Without coherence semantics, an agent's dispatch can:

1. **Fail with `not_found`** -- the `nac_id` referenced in the plan no
   longer exists in the DOM. Visible to the agent, recoverable by
   re-describing.
2. **Resolve to the wrong element** -- the `nac_id` still exists but now
   refers to a different concrete entity (rows reordered, the "fifth
   row" in the plan is no longer the keyboard). Invisible to the agent.
   Silent damage.
3. **Resolve to the correct element in the wrong state** -- the button
   is still there, but the confirm dialog the agent expected is already
   closed. The action is semantically wrong even though syntactically
   valid.

The third mode is the most insidious -- the agent believes it
accomplished the task, the page records an unintended side effect. In
production this is the failure mode that ends agentic deployments. The
2026-05-18 benchmark surfaced an instance of exactly this in T_MCP1
NAC3.

### 1.3 Why this is foundational for NAC3's positioning

The protocols NAC3 is implicitly compared against (MCP, raw DOM via
Computer Use, agent-to-app glue layers) all sidestep this question
rather than solve it. MCP relies on backend transactions; the UI state
question doesn't arise because there is no shared UI state. Computer Use
re-screenshots before every action, accepting the latency cost as the
price of safety. Glue layers either tolerate inconsistency silently or
rebuild the world before every dispatch.

NAC3 has the opportunity to be the contract that **answers the question
directly**: agents and hosts share a versioned view of the surface,
mutations are explicitly versioned or explicitly fire-and-forget, the
runtime is the arbiter. This is what separates a decoration library
from a concurrency protocol. It is also what allows NAC3 to be cited
alongside MCP not as a competitor but as the layer MCP intentionally
does not address.

If NAC3 v2.4 ships without this, the first production adopter operating
an SPA with live data will encounter the failure modes above and write a
parallel coherence layer on top. That parallel layer will be ad-hoc,
incompatible across adopters, and will become the de facto standard the
SPEC failed to define. Versioning is what prevents fragmentation.

---

## 2. Goals

1. Make every `describe()` output carry version tokens sufficient to
   detect intervening change at two granularities (per-plugin and
   global).
2. Allow every mutating API call to be conditioned on an expected
   version, failing fast with a structured error when stale.
3. Provide push-side invalidation events so long-running agents can
   detect change without polling.
4. Distinguish structural change (affects planning) from state change
   (may or may not affect the specific plan) at the version level.
5. Define a deterministic content-hash primitive for elements so agents
   can verify "the row I'm about to act on still has the content I
   planned against."
6. Provide an explicit host-driven signal for hydration completion, so
   versioning is robust under SSR.
7. Provide a runtime self-describing conformance tier so agents and
   validators can adapt without behavioural probing.
8. Remain backward compatible with existing v2.3 callers: all new
   parameters and events are opt-in at the v2.4 API boundary.
9. Specify behavior precisely enough that an alternative implementation
   (Python automation runner, Rust embedded agent) generates identical
   version tokens and identical hashes for identical DOM states.

## 3. Non-goals

1. **Server-side reconciliation.** The runtime detects and reports
   staleness; it does not attempt to re-resolve the agent's intent. That
   responsibility stays with the agent. See section 11.3.
2. **Transactional multi-action dispatch.** The version model is
   per-action, not per-plan. Atomic multi-step transactions are out of
   scope; SPEC sec 5.3 (data-tables) already provides transactional
   semantics within a table.
3. **Cross-tab synchronization.** If the same user has the app open in
   two tabs, version tokens are per-tab. Cross-tab coherence is a host
   concern.
4. **Crypto-grade integrity.** Versions are integrity-of-state
   indicators, not provenance proofs. HMAC manifests (SPEC sec 7.2)
   remain the provenance layer.
5. **Automatic decoration of undecorated DOM.** Element naming is the
   host's responsibility. Tooling that automates decoration is a
   product-layer concern, not a runtime concern. See section 9.

---

## 4. Design overview

The runtime maintains version state at three granularities, listed in
the order an agent should typically use them:

- **`plugin_version`** -- a per-plugin-instance monotonic token bumped
  when something inside that plugin instance changes structurally.
  **This is the primary tool for agents.** Most plans are scoped to a
  single plugin; passing `expected_plugin_version` on a dispatch ignores
  noise from elsewhere in the page.
- **`element_state_hash`** -- an optional content hash exposed per
  element, summarizing the observable state of that single element.
  Used by agents that need content-level coherence (e.g., "delete this
  row only if its description is still what I planned against").
- **`tree_version`** -- a global monotonic token bumped on any
  structural change anywhere. **Escape hatch** for cross-plugin
  orchestration.

Mutating APIs (`click`, `fill`, `select`, `tab`, `dt_*`, `edit_field`)
accept optional `expected_plugin_version`, `expected_element_state_hash`,
and `expected_tree_version`. If any is provided and does not match the
runtime's current value at dispatch time, the call rejects with
`NacError('snapshot_stale', {...})` and the side effect does not occur.

`NAC.STRICT_VERSIONING` (boolean, default `false` in v2.4) enforces that
every mutating call carries at least one `expected_*` parameter.
Mutating calls without expectations reject with
`NacError('version_required', ...)`.

Push-side invalidation is exposed via two events:
`nac:plugin:invalidated` and `nac:tree:invalidated`.

A new lifecycle primitive, `NAC.markHydrationComplete()`, lets
SSR-driven hosts signal explicitly when the post-hydration DOM is
stable. The runtime emits the initial invalidation event at that
moment.

A new runtime property, `NAC.conformance_tier`, lets agents and
validators read the runtime's declared conformance level without probing
behaviour.

---

## 5. Detailed design

### 5.1 `plugin_version` (primary primitive)

Each plugin entry in `describe()` output carries a `plugin_version`
field, of the form `v_<integer>` where `<integer>` is a 64-bit monotonic
counter scoped to that `(plugin_slug, plugin_instance_id)` pair. The
starting value is `v_0` at plugin registration time.

The counter increments when a structural change touches an element
scoped to that plugin instance:

| Trigger (scoped to plugin X) | Increment X.plugin_version? |
|---|---|
| `NAC.register(spec)` for X | Yes |
| `NAC.syncPlugin(spec)` for X when manifest content differs | Yes |
| `NAC.syncPlugin(spec)` for X when content is byte-identical | No |
| `NAC.removePlugin(X, instance_id)` | The plugin entry is removed; downstream `expected_plugin_version` against the removed plugin rejects with `not_found`, not `snapshot_stale` |
| `dt_add_row`, `dt_remove_row`, `dt_commit`, `dt_discard` on a data-table owned by X | Yes |
| Mutation observed: element with `data-nac-*` attribute added inside X's subtree | Yes |
| Mutation observed: element with `data-nac-*` attribute removed inside X's subtree | Yes |
| Mutation observed: element's `data-nac-id`, `data-nac-role`, `data-nac-action`, or `data-nac-plugin*` attribute changes inside X's subtree | Yes |
| Mutation observed: effective visibility of an element inside X's subtree changes | Yes |
| Mutation observed: element's `value`, `textContent`, `disabled`, or focus state changes | No -- state-only, see `element_state_hash` |

The distinction between "structural" (yes) and "state" (no) is the
cornerstone of the design. If every keystroke in a field incremented
`plugin_version`, no plan could survive a typing user. The rule: **a
change increments `plugin_version` if and only if it could invalidate a
plan that does not target the specific element changed.**

#### 5.1.1 Plugin scope is logical, not physical

An element carrying `data-nac-plugin="X"` belongs to plugin X regardless
of its DOM position. A modal rendered via portal at `document.body` but
carrying `data-nac-plugin="deals"` bumps `deals.plugin_version` on
mutation, not the version of whatever plugin owns the DOM region it is
physically inserted into. This matters for React/Vue portal patterns,
Stripe Checkout iframes, third-party widget embeds, and any framework
that decouples logical scope from DOM tree position.

The runtime determines plugin scope by walking ancestors of every
`[data-nac-*]` element for the nearest `[data-nac-plugin]` attribute. A
portal that does not carry the attribute on the portaled root inherits
no scope and is invisible to versioning.

**Implementation guidance.** Naive ancestor walks are O(depth) per
mutation, which is a significant cost at high mutation rates (drag-drop,
autocomplete with live filtering). Implementations SHOULD cache plugin
scope per element via `WeakMap<Element, {slug, instance_id}>`,
invalidating cache entries when the element or its ancestors mutate
their `data-nac-plugin*` attributes. The reference implementation does
this and reports per-operation overhead in `docs/PERF.md`.

### 5.2 `element_state_hash`

Optional at the API surface, but **required at the NAC-3-versioned
conformance tier**. Each element in `describe()` output MAY carry an
`element_state_hash` field -- a 32-character hex string (128 bits)
computed deterministically from the element's observable state.

The hash is for content-level coherence checks. An agent planning
"delete row 5 where description is 'monitor LCD'" can pass
`expected_element_state_hash` on the `dt_remove_row` call. If the row
was edited between describe and dispatch (someone changed the
description), the hash differs and the dispatch rejects, even though
the structural `nac_id` of row 5 is unchanged.

#### 5.2.1 Hash inputs

The hash covers the following observable state, and nothing else:

```
{
  visible: boolean,        // effective visibility (offsetParent + display + visibility + aria-hidden)
  disabled: boolean,       // .disabled or aria-disabled
  value: string | null,    // for role=field/option; null otherwise; truncated to 256 chars
  text: string | null,     // for role=action/tab; el.textContent.trim() truncated to 256 chars; null otherwise
  custom: string | null    // data-nac-state attribute, opaque to the runtime
}
```

Truncation at 256 chars is normative. Implementations MUST truncate.
Agents that need to verify long content (e.g., full document bodies)
MUST use other channels -- the hash is not a content equality proof for
arbitrary-length content.

#### 5.2.2 Canonical serialization

The input object is serialized as follows, byte-for-byte:

1. Keys appear in alphabetical order: `custom`, `disabled`, `text`,
   `value`, `visible`.
2. Strings are encoded as JSON strings per RFC 8259 sec 7, with one
   normative additional rule: non-ASCII characters are escaped using
   `\uXXXX` lowercase, never represented as raw UTF-8 bytes. This
   eliminates the V8/Spidermonkey/Hermes divergence on escape format.
3. Booleans appear as `true` or `false`.
4. `null` appears as `null`.
5. No whitespace between tokens.

Pseudocode for the serializer:

```javascript
function _canonicalSerialize(obj) {
  return '{'
    + '"custom":'  + (obj.custom  === null ? 'null' : _jsonString(obj.custom)) + ','
    + '"disabled":' + (obj.disabled ? 'true' : 'false') + ','
    + '"text":'    + (obj.text    === null ? 'null' : _jsonString(obj.text))    + ','
    + '"value":'   + (obj.value   === null ? 'null' : _jsonString(obj.value))   + ','
    + '"visible":' + (obj.visible ? 'true' : 'false')
    + '}';
}

function _jsonString(s) {
  // emit standard JSON string with non-ASCII chars as \uXXXX lowercase
  // standard escapes for \\ \" \b \f \n \r \t; \u00XX for other controls
}
```

This mini-spec is intentionally narrow -- five known keys, five known
types -- so that two implementations cannot diverge. It does not need
RFC 8785 JCS in full because the input domain is fixed.

#### 5.2.3 Hash algorithm

The hash is SHA-256 over the canonical serialization, truncated to the
leading 128 bits (16 bytes), encoded as 32 lowercase hex characters.

At 128 bits, collision probability for an app with 10^4 elements is
< 2^-96. The truncation is normative.

#### 5.2.4 When the hash is computed

Implementations choose between eager (compute on every state change,
store on element) and lazy (compute on `describe()` call). Both are
conformant. The runtime exposes `NAC.eager_hashing` (boolean, default
`false`).

### 5.3 `tree_version` (escape hatch)

`tree_version` is a global 64-bit monotonic counter, returned at the
top level of `describe()`. It increments on every structural change
anywhere in the agent-relevant DOM -- the union of every
`plugin_version` increment.

`tree_version` is included for two use cases:

1. **Cross-plugin orchestration.** An agent executing a plan that
   touches plugins A and B in sequence can use `expected_tree_version`
   to detect change in either.
2. **Coarse "did anything change" checks** for agents that do not want
   to track per-plugin versions.

For single-plugin plans, agents SHOULD prefer `expected_plugin_version`.
`expected_tree_version` will reject on changes that do not affect the
plan; this is correct behavior but creates more retry traffic than
necessary.

### 5.4 Extended mutation API

All mutating methods grow optional version parameters. Listed in
recommended-order-of-use:

```typescript
type VersionOpts = {
  expected_plugin_version?: string;       // primary
  expected_element_state_hash?: string;   // content-aware secondary
  expected_tree_version?: string;         // escape hatch for cross-plugin plans
};

NAC.click(nac_id: string, opts?: ClickOpts & VersionOpts):
  Promise<{ok: true, at_plugin_version: string, at_tree_version: string}>;

NAC.click_by_verb(plugin: string | null, verb: string, args?: object, opts?: VersionOpts):
  Promise<{ok: true, at_plugin_version: string, at_tree_version: string}>;

NAC.fill(nac_id: string, value: string | number | boolean, opts?: VersionOpts):
  Promise<{ok: true, at_plugin_version: string, at_tree_version: string}>;

NAC.select(nac_id: string, value: string, opts?: VersionOpts):
  Promise<{ok: true, at_plugin_version: string, at_tree_version: string}>;

NAC.tab(plugin: string, tab_key: string, opts?: VersionOpts):
  Promise<{ok: true, at_plugin_version: string, at_tree_version: string}>;

NAC.dt_add_row(table_id: string, values: object, opts?: VersionOpts):
  Promise<{ok: true, row_id: string, at_plugin_version: string, at_tree_version: string}>;

NAC.dt_remove_row(table_id: string, row_id: string, opts?: VersionOpts):
  Promise<{ok: true, at_plugin_version: string, at_tree_version: string}>;

NAC.dt_edit_cell(table_id: string, row_id: string, column: string, value: any, opts?: VersionOpts):
  Promise<{ok: true, at_plugin_version: string, at_tree_version: string}>;

NAC.dt_commit(table_id: string, opts?: VersionOpts):
  Promise<{ok: true, final_state: TableState, at_plugin_version: string, at_tree_version: string}>;

NAC.edit_field(nac_id: string, opts?: VersionOpts):
  Promise<{ok: true, at_plugin_version: string, at_tree_version: string}>;
```

Resolution rules, applied in order:

1. If `NAC.STRICT_VERSIONING === true` and no `expected_*` parameter is
   provided, reject synchronously with `NacError('version_required',
   {nac_id, method, ...})`.
2. If a runtime at NAC-3 (non-versioned) tier receives any `expected_*`
   parameter, reject with `NacError('feature_not_supported', {tier:
   'NAC-3', requested_feature: 'versioning', ...})`. **Silently
   ignoring expectations is non-conformant.**
3. If `expected_plugin_version` is provided, compare against the
   targeted plugin's current `plugin_version`. Mismatch -> reject with
   `snapshot_stale`, `reason: 'plugin_changed'`.
4. If `expected_tree_version` is provided, compare against current
   `tree_version`. Mismatch -> reject with `snapshot_stale`, `reason:
   'tree_changed'`.
5. If `expected_element_state_hash` is provided, compute the current
   hash of the target element. Mismatch -> reject with
   `snapshot_stale`, `reason: 'element_changed'`.
6. If all checks pass, dispatch the side effect.
7. Before resolving the promise, flush any pending mutation observer
   microtasks. See section 5.8.

Check order matters: cheaper checks (integer comparisons) run before
hash computation.

### 5.5 `snapshot_stale` error

```typescript
NacError {
  code: 'snapshot_stale',
  message: string,
  detail: {
    nac_id?: string,
    method?: string,

    expected_plugin_version?: string,
    current_plugin_version?: string,
    plugin_slug?: string,
    plugin_instance_id?: string,

    expected_tree_version?: string,
    current_tree_version?: string,

    expected_element_state_hash?: string,
    current_element_state_hash?: string,

    reason: 'plugin_changed' | 'tree_changed' | 'element_changed',
    last_change_trigger?: 'syncPlugin' | 'syncDataTable' | 'mutation' | 'register' | 'remove' | 'hydration_complete',
    affected_plugins?: Array<{slug: string, instance_id?: string}>
  }
}
```

Agents implementing recovery typically follow:

1. Receive `snapshot_stale`.
2. Inspect `reason`. If `plugin_changed` and the plugin is the one
   targeted, re-describe scoped to that plugin and replan.
3. If `tree_changed` but the agent was using `expected_tree_version` as
   a coarse check, re-describe and decide whether to replan based on
   which plugins changed (`affected_plugins`).
4. If `element_changed`, the structural plan is still valid but the
   specific element's state differs from expected -- the agent decides
   whether to retry or abort based on its semantic intent.

### 5.6 `nac:plugin:invalidated` and `nac:tree:invalidated`

```typescript
'nac:plugin:invalidated' detail: {
  plugin_slug: string,
  plugin_instance_id?: string,
  from_version: string,
  to_version: string,
  trigger: 'syncPlugin' | 'syncDataTable' | 'mutation' | 'register' | 'remove' | 'hydration_complete'
}

'nac:tree:invalidated' detail: {
  from_version: string,
  to_version: string,
  trigger: 'syncPlugin' | 'syncDataTable' | 'mutation' | 'register' | 'remove' | 'hydration_complete',
  affected_plugins: Array<{slug: string, instance_id?: string}>
}
```

Both events are dispatched on `document`. The runtime guarantees the
events fire **after** the corresponding internal counters have been
updated; a listener calling `NAC.describe()` synchronously inside the
handler observes the new versions.

`affected_plugins` is currently always length-1 in v2.4 implementations
(one structural change -> one affected plugin -> one event pair). The
array shape is forward-compatible: future RFCs may introduce batch
invalidation primitives that emit length-N arrays from a single event.
Agents SHOULD iterate over the array rather than assume length-1.

### 5.7 `NAC.STRICT_VERSIONING`

Boolean flag, default `false` in v2.4.

When `true`:
- Every mutating call that does not include at least one `expected_*`
  parameter rejects synchronously with `NacError('version_required',
  {nac_id, method, ...})`.
- `NAC.describe()` operates unchanged -- describing is not a mutation.

Migration plan:
- v2.4: flag exists, default `false`. Hosts opt in for production.
- v2.5: flag exists, default `false`; runtime logs a `console.warn`
  when a fire-and-forget mutation occurs without `STRICT_VERSIONING ===
  true`.
- v3.0: default flips to `true`. Hosts that need legacy behavior set
  `false` explicitly.
- v3.1: flag removed. All mutating calls must carry expectations.

Four-minor-release migration window.

### 5.8 `at_plugin_version` and `at_tree_version` -- ordering semantics

Every mutating API response includes `at_plugin_version` and
`at_tree_version`. These are the values of the targeted plugin's
version and the global tree version **after** the synchronous side
effect of this dispatch has been integrated.

The runtime MUST, before resolving the promise:

1. Apply the side effect (click handler, fill, etc.).
2. Allow the click handler's synchronous mutations to occur.
3. Flush the pending `MutationObserver` microtask queue (causing
   version bumps for the just-observed mutations to be applied).
4. Read the post-flush `plugin_version` and `tree_version` values.
5. Include them as `at_plugin_version` and `at_tree_version` in the
   response.

This guarantees the agent's next dispatch can use the returned `at_*`
values as `expected_*` without an additional `describe()` round-trip
-- **for handlers whose effects are fully synchronous.**

#### 5.8.1 Limitation: async handlers

The flush-before-resolve guarantee captures mutations emitted
synchronously by the side effect handler. Handlers that perform
`await fetch()` or schedule mutations beyond the initial microtask
cycle emit mutations that arrive **after** the runtime has resolved:

```javascript
button.onclick = async () => {
  setLoading(true);           // synchronous mutation -- captured
  await fetch('/api/...');    // async gap -- runtime has already resolved
  setData(data);              // post-async mutation -- NOT in at_plugin_version
};
```

In this case, the returned `at_plugin_version` reflects only the
synchronous portion (`setLoading(true)`). An agent using
`at_plugin_version` as `expected_plugin_version` on its next dispatch
will receive `snapshot_stale` when the post-async mutation lands.

This is fundamentally unresolvable from the runtime: it cannot know
when a logically-asynchronous side effect has completed. The contract
is:

- **For synchronous handlers**, `at_*` is a reliable substitute for
  re-describing.
- **For async handlers** (handlers performing `fetch`, `setTimeout`,
  deferred state updates, etc.), agents MUST NOT use `at_*` blindly.
  Instead, agents subscribe to `nac:plugin:invalidated` for the
  targeted plugin and wait for the post-async invalidation event
  before issuing the next dispatch. **See Appendix C.4 for the
  monotonic-version filter pattern that avoids capturing unrelated
  intermediate invalidations.**

Hosts that wrap async work should expose this fact in the manifest
where possible (e.g., via a convention like `data-nac-async="true"`
on actions that trigger async side effects), so agents can plan
accordingly. A formal manifest field for async-handler declaration is
deferred to a future RFC.

### 5.9 `NAC.versionHistory(limit?)` -- devtools surface

```typescript
NAC.versionHistory(limit?: number): Array<{
  at: number,                                // unix epoch ms
  tree_version: string,
  trigger: string,
  affected_plugins: Array<{slug: string, instance_id?: string}>
}>;
```

Returns the most recent N version bumps (default 50, configurable, max
500) as a circular buffer. Used by developers debugging
`snapshot_stale` errors.

The buffer is in-memory only, not persisted.

### 5.10 `NAC.markHydrationComplete()` -- explicit hydration signal

```typescript
NAC.markHydrationComplete(): void
```

Idempotent. Callable once per page lifecycle. Signals to the runtime
that the host has completed its hydration phase and the agent-relevant
DOM is stable.

On the first call (and only the first), the runtime:

1. Performs a full scan of all registered plugins and re-computes
   `plugin_version` and `tree_version` from the current DOM state.
   This catches any structural changes that occurred during hydration.
2. Emits `nac:tree:invalidated` with `from_version: null`,
   `to_version: <current>`, `trigger: 'hydration_complete'`, and
   `affected_plugins` listing every registered plugin.
3. Emits `nac:plugin:invalidated` for each plugin with
   `from_version: null` and `to_version: <current>`.
4. Transitions internal state from "hydrating" to "stable." Subsequent
   calls to `markHydrationComplete()` are no-ops.

#### 5.10.1 The 100ms fallback

If the host does not call `markHydrationComplete()` within 100ms after
`DOMContentLoaded` fires, the runtime invokes it implicitly as a
fallback.

The fallback is **an acknowledged heuristic**. Section 10.6 rejects
implicit hydration detection on the grounds that all heuristics
produce false positives or false negatives in real frameworks. The
100ms fallback is the minimum viable concession to developer
experience for simple SPAs that have no concept of "hydration" -- the
implicit call lets them ship without learning the API. It is not a
substitute for explicit signalling.

Concretely:

- **Simple SPAs with no SSR** require no code changes; the fallback
  fires shortly after page load. The risk of false positives is low
  because there is no deferred hydration to confuse it with.
- **SSR with deferred hydration** (React Suspense, Next.js streaming,
  Astro islands, Vue Suspense, etc.) **MUST** call
  `markHydrationComplete()` explicitly after hydration finishes. The
  100ms fallback **WILL** fire mid-hydration on slow devices or slow
  networks and produce version tokens against transitional state.
  Hosts in this category that omit the explicit call are non-conformant.

The 100ms value is normative; implementations MUST NOT use shorter or
longer values. The number is calibrated to (a) allow synchronous
hydration to complete on a low-end device (Moto G4 baseline,
representative slow laptop), (b) not delay agent operation
unreasonably on simple pages. If application telemetry shows the
fallback consistently firing before hydration completes, that is a
signal the host MUST migrate to explicit `markHydrationComplete()`.

Agents SHOULD subscribe to `nac:tree:invalidated` with `trigger ===
'hydration_complete'` as a signal that the initial DOM is ready for
planning. Describes performed before this event MAY observe
transitional state.

### 5.11 `NAC.conformance_tier` -- self-describing runtime tier

```typescript
NAC.conformance_tier: 'NAC-3' | 'NAC-3-versioned' | 'NAC-3-strict'
```

Read-only property, available synchronously at any time after the
runtime script has loaded (no need to wait for hydration).

Implementations MUST set this property to the highest tier the runtime
fully supports (see section 6 for tier definitions). The property MUST
NOT change during the page lifecycle -- the tier is a static property
of the runtime build, not a runtime configuration. Setting
`NAC.STRICT_VERSIONING = true` does NOT promote the tier from
`NAC-3-versioned` to `NAC-3-strict`; the tier is determined by the
implementation, not by flag state.

Agents and validators consume this property:

- **Agents** read it at boot to decide whether to pass `expected_*`
  parameters at all. An agent talking to a `NAC-3` runtime degrades to
  fire-and-forget; an agent talking to a `NAC-3-versioned` runtime
  uses the version contract; an agent talking to `NAC-3-strict` knows
  the runtime will reject any unversioned mutation and adjusts.
- **Validators** (`npx @nac3/runtime validate <url>`) read it and
  cross-check against observed behaviour (does the runtime actually
  emit `plugin_version`? does it actually reject `feature_not_supported`
  when given expectations at NAC-3 tier?). Mismatch is a conformance
  failure.

Runtimes that misrepresent their tier are non-conformant. The
validator MUST emit a `tier_misrepresentation` finding on detected
mismatch.

For backward compatibility: v2.3 runtimes do not expose this property.
Agents detecting `typeof NAC.conformance_tier === 'undefined'` should
treat the runtime as `NAC-3` (non-versioned).

### 5.12 Special contexts: SSR, iframes, portals

**Server-side rendering and hydration.** Covered by 5.10. Re-describe
after `trigger === 'hydration_complete'`.

**Iframes.** Each frame loads its own runtime instance and maintains
independent `plugin_version` and `tree_version` counters. Version
tokens from one frame are not valid in another. Agents operating
across frames MUST subscribe to `nac:tree:invalidated` on each frame's
`document` independently.

Cross-frame coherence (a global "app version" spanning multiple
frames) is deferred to a future RFC.

**Portals and teleports.** As specified in 5.1.1, plugin scope is
logical, not physical. Authors using React Portals, Vue Teleport, or
equivalent patterns MUST ensure the portaled root carries the
appropriate `data-nac-plugin` attribute. The runtime cannot infer
scope from logical component hierarchy when the DOM hierarchy
diverges.

---

## 6. Conformance levels

V24-04 introduces two new tiers stacked on the v2.3 baseline:

**NAC-3 conformant** (unchanged from main SPEC sec 8): everything in
v2.3. Implementations at this tier MUST set `NAC.conformance_tier =
'NAC-3'`. Mutating calls carrying `expected_*` parameters MUST be
rejected with `feature_not_supported` (silent-ignore is
non-conformant).

**NAC-3-versioned conformant** if it also:
- Returns `plugin_version` on every plugin entry in `describe()`.
- Returns `tree_version` at the top level of `describe()`.
- Returns `element_state_hash` on every agent-relevant element in
  `describe()` output (eager or lazy, conformant either way).
- Emits `nac:plugin:invalidated`, `nac:tree:invalidated`, and the
  hydration completion event on `markHydrationComplete()`.
- Honors `expected_plugin_version`, `expected_tree_version`, and
  `expected_element_state_hash` on every mutating call.
- Sets `NAC.conformance_tier = 'NAC-3-versioned'`.

**NAC-3-strict conformant** if it also:
- Sets `NAC.STRICT_VERSIONING = true` before any agent interaction.
- Rejects every mutating call that arrives without at least one
  `expected_*` parameter.
- Sets `NAC.conformance_tier = 'NAC-3-strict'`.

The tiering simplification compared to draft v2: `element_state_hash`
was moved from the strict tier to the versioned tier. Strict mode now
differs from versioned mode only in **enforcement** (requiring
expectations), not in **features exposed** (hash support). This
eliminates the silent-ignore failure mode where a NAC-3-versioned
runtime received `expected_element_state_hash` and discarded it.

The CLI validator (`npx @nac3/runtime validate <url>`) reads
`NAC.conformance_tier` and cross-checks against observed behaviour;
the highest tier the page actually reaches is the reported result.

---

## 7. Backward compatibility

All additions are opt-in at the API boundary. A v2.3 agent calling
v2.4 runtime works unchanged: it doesn't pass version parameters, the
runtime doesn't enforce them.

A v2.4 agent calling v2.3 runtime degrades gracefully via two paths:

1. **Preferred**: the agent reads `NAC.conformance_tier` at boot.
   `undefined` -> v2.3 -> degrade. This is the explicit detection path
   and SHOULD be used by every v2.4-aware agent.
2. **Fallback**: if for any reason the agent did not check
   `conformance_tier`, the v2.3 runtime silently ignores the unknown
   `expected_*` opt keys (per the v2.1 convention that unknown opts
   are ignored). The mutation proceeds fire-and-forget. The agent
   observes `at_plugin_version` is missing from the response and
   concludes the runtime is v2.3.

**Note**: the silent-ignore behaviour described above is the v2.3
runtime's existing pattern. v2.4 runtimes do NOT silently ignore -- see
resolution rule 2 in section 5.4. The asymmetry is intentional: v2.4
has tier reporting + explicit rejection, v2.3 does not.

The only breaking change in the family is the `STRICT_VERSIONING`
default flip in v3.0, with the four-minor-release migration window in
5.7.

---

## 8. Reference implementation guidance

### 8.1 Internal state

```javascript
let _tree_version = 0;
const _plugin_versions = new Map();  // key: `${slug}|${instance_id || ''}`, value: integer
const _version_history = [];          // circular buffer for versionHistory()
const _plugin_scope_cache = new WeakMap();  // Element -> {slug, instance_id}
let _hydration_complete = false;
let _hydration_fallback_timer = null;

function _bumpPluginVersion(slug, instance_id, trigger) {
  const key = `${slug}|${instance_id || ''}`;
  const prev = _plugin_versions.get(key) || 0;
  const next = prev + 1;
  _plugin_versions.set(key, next);
  _bumpTreeVersion(trigger, [{slug, instance_id}]);
  document.dispatchEvent(new CustomEvent('nac:plugin:invalidated', {
    detail: {
      plugin_slug: slug, plugin_instance_id: instance_id,
      from_version: `v_${prev}`, to_version: `v_${next}`, trigger
    }
  }));
}

function _bumpTreeVersion(trigger, affected_plugins) {
  _tree_version += 1;
  _version_history.push({
    at: Date.now(),
    tree_version: `v_${_tree_version}`,
    trigger,
    affected_plugins
  });
  while (_version_history.length > 500) _version_history.shift();
  document.dispatchEvent(new CustomEvent('nac:tree:invalidated', {
    detail: {
      from_version: `v_${_tree_version - 1}`,
      to_version: `v_${_tree_version}`,
      trigger, affected_plugins
    }
  }));
}
```

### 8.2 Mutation observer

A single `MutationObserver` rooted at `document.body` observes
attribute and childList changes filtered to elements within
`[data-nac-plugin]` subtrees. The handler categorizes each mutation as
structural or state and bumps versions accordingly.

The observer fires once per microtask flush. Coalesced bumps share a
single increment -- five DOM mutations in the same tick produce one
`plugin_version` increment for the affected plugin, not five.

Performance MUST be benchmarked per implementation. The reference
implementation publishes its numbers in `docs/PERF.md` after release;
this RFC does not assert performance targets.

### 8.3 Resolution order in mutation API

```javascript
async function _resolveExpectations(opts, target_el, target_plugin) {
  // Rule 1: STRICT mode requires at least one expectation.
  if (NAC.STRICT_VERSIONING) {
    const has_any = opts.expected_plugin_version
                 || opts.expected_tree_version
                 || opts.expected_element_state_hash;
    if (!has_any) {
      throw NacError('version_required', {/* ... */});
    }
  }
  // Rule 2: NAC-3 (non-versioned) tier rejects any expectation.
  if (NAC.conformance_tier === 'NAC-3') {
    const has_any = opts.expected_plugin_version
                 || opts.expected_tree_version
                 || opts.expected_element_state_hash;
    if (has_any) {
      throw NacError('feature_not_supported', {
        tier: 'NAC-3', requested_feature: 'versioning',
      });
    }
  }
  // Rules 3-5: version + hash checks (in cheap-to-expensive order).
  if (opts.expected_plugin_version) {
    const key = `${target_plugin.slug}|${target_plugin.instance_id || ''}`;
    const cur = `v_${_plugin_versions.get(key) || 0}`;
    if (opts.expected_plugin_version !== cur) {
      throw NacError('snapshot_stale', { reason: 'plugin_changed', /* ... */ });
    }
  }
  if (opts.expected_tree_version) {
    const cur = `v_${_tree_version}`;
    if (opts.expected_tree_version !== cur) {
      throw NacError('snapshot_stale', { reason: 'tree_changed', /* ... */ });
    }
  }
  if (opts.expected_element_state_hash) {
    const cur = await _stateHashOf(target_el);  // ASYNC -- see 8.5
    if (opts.expected_element_state_hash !== cur) {
      throw NacError('snapshot_stale', { reason: 'element_changed', /* ... */ });
    }
  }
}
```

Plugin version check runs before tree version check because it is the
recommended primary tool and rejects more narrowly. Hash check runs
last, after structural checks pass -- and crucially is awaited, because
`_stateHashOf` returns a Promise (see 8.5).

### 8.4 Microtask flush in mutating APIs

```javascript
async function _dispatchAndFlush(target_el, sideEffect, target_plugin, opts) {
  await _resolveExpectations(opts, target_el, target_plugin);
  await sideEffect();   // applies the click/fill/etc.
  await new Promise(resolve => queueMicrotask(resolve));  // flush observer
  const at_plugin = `v_${_plugin_versions.get(_pluginKey(target_plugin)) || 0}`;
  const at_tree = `v_${_tree_version}`;
  return { ok: true, at_plugin_version: at_plugin, at_tree_version: at_tree };
}
```

Note that `at_*` values reflect only the synchronous portion of the
side effect. See 5.8.1 for the async-handler limitation.

### 8.5 Element state hash

```javascript
async function _stateHashOf(el) {
  const role = el.getAttribute('data-nac-role') || '';
  const state = {
    custom: el.getAttribute('data-nac-state'),
    disabled: el.disabled === true || el.getAttribute('aria-disabled') === 'true',
    text: (role === 'action' || role === 'tab')
      ? (el.textContent || '').trim().slice(0, 256)
      : null,
    value: (role === 'field' || role === 'option')
      ? _readValue(el)
      : null,
    visible: _isEffectivelyVisible(el)
  };
  const canonical = _canonicalSerialize(state);
  const digest = await _sha256(new TextEncoder().encode(canonical));
  return _bytesToHex(digest.slice(0, 16));
}

async function _sha256(bytes) {
  // Prefer WebCrypto when available
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const buf = await crypto.subtle.digest('SHA-256', bytes);
    return new Uint8Array(buf);
  }
  // Synchronous fallback (mandatory for non-secure contexts)
  return _sha256Sync(bytes);
}
```

**WebCrypto availability constraint.** `crypto.subtle.digest` requires
a secure context (HTTPS or `localhost`). Apps embedded in iframes
served over HTTP (some legacy embed scenarios, intranet HTTP, etc.)
cannot use WebCrypto. Implementations MUST provide a synchronous
SHA-256 fallback that produces byte-identical digests. Acceptable
libraries: `js-sha256` (MIT), embedded reference impl, etc. The choice
is implementation-specific; only the digest value is normative.

The reference runtime includes a ~3KB minified synchronous SHA-256
implementation as fallback. Hosts in secure contexts get WebCrypto
performance automatically; insecure contexts pay the synchronous cost
transparently.

---

## 9. Interaction with V24-01, V24-02, and out-of-scope tooling

**V24-01 (plugin slug uniqueness):** the `(slug, instance_id)` pair
that V24-01 establishes as the canonical instance key is the same key
used to scope `plugin_version`. The two RFCs share the data model.

**V24-02 (`syncPlugin` idempotent):** `syncPlugin` bumps
`plugin_version` if and only if the new manifest differs from the
prior one. Byte-identical re-registration is a no-op and does not
invalidate agent plans.

**Automatic decoration tooling.** Tools that generate `data-nac-*`
attributes for undecorated DOM (sometimes informally called "walkers")
are explicitly out of scope for the NAC3 runtime. The runtime does not
generate IDs. Decoration is the host's responsibility, whether
produced manually, by a build-time tool, by a framework integration,
or by a commercial product.

This boundary is normative. Implementations of the runtime MUST NOT
include logic that synthesizes `nac_id` for elements without
`data-nac-id`. Decoration tooling lives outside the runtime, free to
evolve independently, and is not bound by the version-determinism
requirements of this RFC.

The rationale is twofold. First, version determinism requires
`nac_id` stability across rerenders; a tool that generates IDs from
DOM topology can violate that property in subtle ways that would
compromise the entire concurrency contract. Second, decoration is a
product surface -- different adopters want different tradeoffs between
automation and control -- and the standard should not bake in a single
tradeoff.

The reference decoration tooling is Yujin Forge
(github.com/yujinapp/yujin-forge), which provides both build-time
source decoration (AST transforms for `.tsx`/`.jsx`/`.html`) and an
assisted interactive mode (CLI prompts with verb/role classification
+ confidence scoring). Yujin Forge is distributed under the MIT
license. Other decoration tools are welcome and competing
implementations are a healthy signal for the protocol; the runtime
remains agnostic.

---

## 10. Alternatives considered

### 10.1 Hash-based versioning (rejected)

Compute `tree_version` as a hash of the full manifest state instead
of a monotonic counter. Advantage: any two runtimes observing the
same DOM state produce the same version token.

Rejected because hashing on every change is expensive for large
manifests; monotonic counters are sufficient ("is this the version I
saw?" not "is this the same state I saw earlier?"); content-level
coherence is already served by `element_state_hash`.

### 10.2 Per-element versioning (rejected)

Give every element its own version counter. Rejected because
administrative cost is too high; per-plugin scoping plus
`element_state_hash` covers the practical use cases.

### 10.3 Server-side reconciliation (rejected)

The runtime re-resolves agent intent against the current tree on
stale dispatch. Rejected because the runtime does not know the
agent's semantic intent; reconciliation introduces non-determinism
the agent cannot audit; this is the failure mode the RFC exists to
prevent. Equivalent decisions in HTTP (If-Match), Git (no auto-merge
on conflict), and SQL (no implicit row reselection) all chose
explicit failure.

### 10.4 RFC 8785 JCS for canonical serialization (rejected for v2.4)

Rejected because the hash input domain in 5.2.1 is fixed and small;
a narrow mini-spec (5.2.2) is sufficient and tractable.

### 10.5 Transactional multi-action dispatch (deferred)

Rejected for v2.4: true rollback in the DOM is hard; the version
model is sufficient for the agent to implement its own retry loop
at the plan level.

### 10.6 Implicit hydration detection without explicit signal (rejected)

Earlier drafts allowed the runtime to detect hydration completion
automatically (via DOMContentLoaded, idle callbacks, or mutation
observer quiet periods). Rejected because all heuristics produce
false positives or false negatives in real frameworks (React 18
streaming, Vue Suspense, Astro islands). The explicit
`markHydrationComplete()` API gives hosts control with a documented
fallback (sec 5.10.1) for the simple-SPA case.

### 10.7 Behavioural tier detection (rejected)

Earlier drafts left tier detection to validators inferring tier from
runtime behaviour (does it emit `plugin_version`? does it reject
`feature_not_supported`?). Rejected for v2.4 because behavioural
probing is fragile: it requires the validator to issue a mutation,
which has side effects; misconfigured runtimes can produce ambiguous
results. Explicit self-reporting via `NAC.conformance_tier` (sec
5.11) is unambiguous, side-effect-free, and validator-friendly.

---

## 11. Open questions

1. **Eager vs lazy hashing default.** Section 5.2.4 leaves the choice
   to implementations. Should the SPEC mandate one? Resolved: no;
   both are conformant. The `NAC.eager_hashing` flag is the host's
   lever.
2. **Async-handler manifest declaration.** Section 5.8.1 suggests
   `data-nac-async="true"` as a convention. Should this be normative
   in v2.4 or deferred? Resolved: deferred -- gather adopter feedback
   on actual usage before formalizing.
3. **Cross-frame coherence.** Deferred to a future RFC if production
   use cases materialize.
4. **Walker integration with versioning.** Closed: out of scope (sec
   9).
5. **Performance targets.** No assertions in this RFC; reference
   implementation publishes in `docs/PERF.md`.
6. **WebCrypto fallback library.** Implementation-specific; only the
   digest is normative.

---

## 12. Status

| Phase | Date | Status |
|---|---|---|
| Draft v1 | 2026-05-19 | Superseded |
| Draft v2 | 2026-05-19 | Superseded |
| Draft v3 | 2026-05-19 | Superseded |
| **Final** | **2026-05-19** | **This document** |
| Reference impl in `js/nac.js` | 2026-05-19 onward | Pending |
| Spec patches (SPEC.md sec 5.2, sec 5.5, sec 6.1, sec 8 conformance) | 2026-05-19 onward | Pending |
| Ship in v2.4.0 | TBD | Pending |

This RFC is Final. No public comment period was conducted (see
"Notes on process" in the header). The reference implementation in
`js/nac.js`, the corresponding spec patches in `SPEC.md`, and the
CLI validator update follow this RFC.

---

## Appendix A -- Why this is the contract that scales

NAC3 v2.1 was a decoration vocabulary. v2.2 added a strict validator.
v2.3 added the field editor primitive and named MCP as the cross-app
transport. v2.4 is the version that makes NAC3 a real concurrency
protocol.

The bar for "reference contract" is not low. It requires two
independent implementations to produce identical version tokens for
identical DOM states. It requires failure modes to be precisely
enumerated and recovery defined for each. It requires backward
compatibility as a design constraint. It requires the wire format to
be small enough for token economics to make sense for cheap models.
It requires the runtime to do its job and leave the rest to layers
above.

This RFC tries to clear each bar.

The benchmark that produced V24-01, V24-02, and this RFC ran in less
than a week. It found three structural gaps that production adoption
would have found later, more expensively. That is the case for
benchmarks.

---

## Appendix B -- Changes across drafts

### Draft v1 -> v2

1. Reordering: `plugin_version` promoted to primary, `tree_version`
   to escape hatch.
2. `element_state_hash` strengthened: SHA-256/128-bit + canonical
   mini-spec.
3. `at_*` ordering made explicit (flush-before-resolve).
4. Performance assertions removed.
5. SSR, iframes, and portals addressed.
6. Error renamed: `strict_versioning_required` -> `version_required`.
7. Counter rollover section removed (64-bit normative).
8. `NAC.versionHistory(limit?)` added.
9. Walker removed from scope (sec 9 reframed as normative boundary).
10. Plugin scope is logical, not physical, made explicit.
11. `plugin_version` triggers in 5.1 scoped per-plugin explicitly.

### Draft v2 -> v3

1. Async handler limitation (sec 5.8.1) documented explicitly.
2. `element_state_hash` moved from NAC-3-strict to NAC-3-versioned
   tier (sec 6).
3. Non-versioned runtimes MUST reject `expected_*` parameters
   (resolution rule 2 in sec 5.4).
4. `NAC.markHydrationComplete()` API added (sec 5.10).
5. Pseudocode bug in 8.3 fixed.
6. WebCrypto HTTP fallback (sec 8.5).
7. WeakMap caching guidance (sec 5.1.1).
8. `affected_plugins` length-1 note (sec 5.6).
9. Appendix C added -- best practices for agent implementers.
10. Reference walker mentioned (sec 9 / now reframed as Yujin Forge
    reference).
11. Sec 11 (open questions) trimmed.

### Draft v3 -> Final

1. **`NAC.conformance_tier` runtime property added (sec 5.11).**
   Replaces behavioural tier detection. Runtime self-describes its
   conformance level synchronously, allowing agents and validators
   to adapt without probing. Resolution rule 2 in sec 5.4
   references this property explicitly. Backward compatibility path
   in sec 7 updated: agents detect v2.3 via `typeof
   NAC.conformance_tier === 'undefined'` instead of inspecting
   response shape. Conformance levels in sec 6 require
   implementations to declare their tier via this property.
   Validator behaviour (sec 6, sec 11) updated to cross-check
   declared tier against observed behaviour and emit
   `tier_misrepresentation` on mismatch. Alternative considered +
   rejected (behavioural probing) recorded in sec 10.7.

2. **Hydration fallback (sec 5.10.1) reframed as acknowledged
   heuristic.** Earlier drafts described the 100ms `DOMContentLoaded`
   fallback as if it were equivalent to explicit `markHydrationComplete()`.
   Final draft makes the trade-off explicit: the fallback is a
   minimum viable concession to DX for simple SPAs; SSR-with-
   deferred-hydration MUST call explicitly and is non-conformant if
   it does not. The 100ms value's calibration rationale (low-end
   device baseline + agent latency budget) recorded for future
   tuning.

3. **Appendix C.4 Pattern A race documented (sec 5.8.1 +
   Appendix C.7).** The naive listener pattern -- subscribe to
   `nac:plugin:invalidated`, treat the first matching event as the
   ack -- captures any intermediate invalidation, not necessarily
   the one caused by the dispatch. Final draft cross-references
   the monotonic-version filter pattern in C.4 from sec 5.8.1 and
   adds it as a Common Mistake in C.7. The fix is to filter by
   `ev.detail.to_version > expected_plugin_version_at_dispatch`,
   not just by plugin slug.

4. **Notes on process** added to header. Documents that this RFC
   was authored before any third-party implementations existed,
   that the standard 14-day public comment period would have
   surfaced no external feedback, and that future RFCs MUST
   follow the standard window. Locks the v2.4 contract before the
   first adopter arrives.

5. **Yujin Forge cited as reference decoration tooling (sec 9).**
   Previously sec 9 mentioned "reference walker in
   `tools/reference-walker/`"; Final draft points to
   `github.com/yujinapp/yujin-forge` as the canonical reference,
   distributed under MIT, with both build-time AST transforms and
   assisted interactive mode. Other decoration tools are welcome;
   the runtime remains agnostic.

---

## Appendix C -- Best practices for agent implementers

This appendix is non-normative. It describes patterns the editor
recommends for agents consuming a NAC-3-versioned runtime.

### C.1 The basic loop

```javascript
// 0. Detect tier at boot.
const tier = NAC.conformance_tier;
if (typeof tier === 'undefined') {
  // v2.3 runtime -- degrade to fire-and-forget.
  return runLegacyMode();
}
if (tier === 'NAC-3') {
  // v2.4 runtime at base tier -- versioning unavailable, expect
  // feature_not_supported on any expected_*.
  return runLegacyMode();
}

// 1. Describe to get the current state.
const snap = await NAC.describe();
const target_plugin = snap.plugins.find(p => p.slug === 'invoice_app');
const expected_v = target_plugin.plugin_version;

// 2. Plan against the snapshot.
const action = planAction(snap, userRequest);

// 3. Dispatch with the expected version.
try {
  const result = await NAC.click_by_verb(
    action.plugin,
    action.verb,
    action.args,
    { expected_plugin_version: expected_v }
  );
  // 4. Use the returned at_plugin_version for the next dispatch
  //    (only safe if the handler was synchronous -- see C.4).
  next_expected = result.at_plugin_version;
} catch (err) {
  if (err.code === 'snapshot_stale') {
    return handleStale(err);
  }
  if (err.code === 'feature_not_supported') {
    return runLegacyMode();
  }
  throw err;
}
```

### C.2 Handling `snapshot_stale`

The recovery strategy depends on `err.detail.reason`:

```javascript
function handleStale(err) {
  switch (err.detail.reason) {
    case 'plugin_changed':
      // The plugin we targeted changed. Re-describe and replan.
      return rePlanScoped(err.detail.plugin_slug);

    case 'tree_changed':
      // Something elsewhere changed. We were being conservative.
      // Decide based on affected_plugins whether we care.
      if (err.detail.affected_plugins.some(p => p.slug === our_target)) {
        return rePlanScoped(our_target);
      }
      // Otherwise, retry with the new tree version.
      return retryWithFreshVersion();

    case 'element_changed':
      // The specific element's content changed. Our structural plan
      // is still valid, but the entity may no longer be what we
      // intended. Abort and ask the user, or retry with fresh hash.
      return askUserOrAbort();
  }
}
```

### C.3 Choosing among `expected_*` parameters

| Use case | Recommended parameter |
|---|---|
| Single-plugin plan, structural-only sensitivity | `expected_plugin_version` |
| Cross-plugin orchestration | `expected_tree_version` |
| "Act on this row only if its content is still X" | `expected_plugin_version` + `expected_element_state_hash` |
| Coarse "anything changed?" check | `expected_tree_version` alone |
| Fire-and-forget (legacy mode) | None -- but the runtime may reject if STRICT or tier=NAC-3 |

The recommended default for new agents: `expected_plugin_version`
always; add `expected_element_state_hash` for destructive actions
(delete, cancel, irreversible mutations) where targeting the wrong
entity would be costly.

### C.4 Synchronous vs async handlers (monotonic filter)

Agents cannot tell from `describe()` output alone whether an action's
handler is synchronous or async. Two patterns:

**Pattern A -- assume async, wait for the next post-dispatch
invalidation event. Filter by monotonic version increase:**

```javascript
// Capture the plugin_version at dispatch time. We want to wait for
// the first invalidation event whose to_version exceeds this value.
const v_at_dispatch = currentVersionOfPlugin(target_plugin.slug);

const invalidationPromise = new Promise(resolve => {
  document.addEventListener('nac:plugin:invalidated', function once(ev) {
    if (ev.detail.plugin_slug !== target_plugin.slug) return;
    // CRITICAL: filter by version, not just slug. Otherwise an
    // unrelated intermediate invalidation (e.g., a WebSocket push
    // bumping the same plugin while we wait) captures the listener
    // before the dispatch's own effect lands.
    if (versionGt(ev.detail.to_version, v_at_dispatch)) {
      document.removeEventListener('nac:plugin:invalidated', once);
      resolve(ev.detail.to_version);
    }
  });
});

await NAC.click_by_verb(plugin, verb, args, {
  expected_plugin_version: v_at_dispatch
});

next_expected = await Promise.race([
  invalidationPromise,
  new Promise((_, rej) => setTimeout(
    () => rej(new Error('timeout')), 5000
  ))
]);

function versionGt(a, b) {
  // 'v_42' > 'v_41' lexically would fail at 'v_10' vs 'v_9'; compare
  // the integer suffix instead.
  return parseInt(a.slice(2), 10) > parseInt(b.slice(2), 10);
}
```

Safer; slightly higher latency.

**Pattern B -- trust `at_*` for known-synchronous handlers:**

```javascript
const result = await NAC.click('invoice.save', {
  expected_plugin_version: v
});
next_expected = result.at_plugin_version;  // safe only if save is sync
```

Faster; risky if the handler turns out to be async.

Most agents should default to Pattern A and use Pattern B only for
actions known a priori to be synchronous (tab switches, local
filters, etc.).

### C.5 Event subscription patterns

For long-running plans, subscribe to invalidation events at plan
start:

```javascript
const tracker = new InvalidationTracker(['invoice_app']);
tracker.start();

// ... execute plan, using tracker.currentVersion('invoice_app') as expected ...

tracker.stop();

class InvalidationTracker {
  constructor(plugins) {
    this.plugins = new Set(plugins);
    this.versions = new Map();
    this.handler = this.handler.bind(this);
  }
  start() {
    document.addEventListener('nac:plugin:invalidated', this.handler);
    NAC.describe().plugins
      .filter(p => this.plugins.has(p.slug))
      .forEach(p => this.versions.set(p.slug, p.plugin_version));
  }
  handler(ev) {
    if (this.plugins.has(ev.detail.plugin_slug)) {
      this.versions.set(ev.detail.plugin_slug, ev.detail.to_version);
    }
  }
  currentVersion(slug) { return this.versions.get(slug); }
  stop() { document.removeEventListener('nac:plugin:invalidated', this.handler); }
}
```

This avoids the cost of a `describe()` round-trip on every dispatch.

### C.6 Hydration

Agents that may be invoked during page load SHOULD wait for the
hydration event before issuing plans:

```javascript
function waitForHydration() {
  return new Promise(resolve => {
    document.addEventListener('nac:tree:invalidated', function once(ev) {
      if (ev.detail.trigger === 'hydration_complete') {
        document.removeEventListener('nac:tree:invalidated', once);
        resolve();
      }
    });
  });
}

await waitForHydration();
const snap = await NAC.describe();
// ... plan ...
```

Skipping this step on SSR pages with deferred hydration produces
snapshots against transitional state.

### C.7 Common mistakes

- **Using `at_tree_version` instead of `at_plugin_version` for
  next-dispatch.** The plugin version rejects more narrowly; using
  tree version forces retries on changes that don't affect the plan.
- **Subscribing to `nac:plugin:invalidated` without filtering by
  version.** Captures unrelated intermediate invalidations
  (WebSocket pushes, concurrent edits) instead of the dispatch's own
  effect. Always compare `ev.detail.to_version` against the version
  captured at dispatch time -- see C.4.
- **Hashing comparison for content equality verification.** The hash
  is for "did this element's observable state change?" not "is this
  element semantically equivalent?" Truncation at 256 chars means
  long content equality is not preserved.
- **Ignoring `feature_not_supported`.** If the runtime returns this
  error, the agent is talking to a NAC-3 (non-versioned) host or has
  asked for a feature the runtime declared unavailable via
  `conformance_tier`. Degrade gracefully or refuse to operate.
- **Skipping the `conformance_tier` check at boot.** Detecting
  runtime version by response-shape inspection works but is
  fragile; the explicit property exists exactly to avoid this.
- **Polling `describe()` instead of subscribing to events.**
  Subscription is push-based and zero-cost when the page is idle;
  polling wastes tokens and cycles.

---

*End of RFC V24-04 Final.*
