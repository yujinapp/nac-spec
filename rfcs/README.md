# NAC3 RFCs

These are proposals and shipped-change records for the NAC3 spec.
**Read this index first** before reading any individual RFC -- it tells
you what's in the current npm and what is still proposed.

The SPEC (`../SPEC.md`) describes **what the current npm runtime does**.
RFCs describe **what we propose, are implementing, or already shipped**.
A reader confused about the difference: stick to SPEC for adoption
decisions.

---

## Index

| RFC | Title | Status | Shipped in | Evidence | Notes |
|-----|-------|--------|------------|----------|-------|
| V24-01 | Plugin slug uniqueness | **SHIPPED** | runtime in 2.3.1; formalised + enforced in 2.5.0 | L1: stage11 (14 PASS) -- L2: demos/v24-01-plugin-id-dedup (11 PASS, 6 screenshots) -- L3: pilot LIVE w/ Claude (5 PASS, 2 statements) | `data-nac-plugin-id` MUST when a plugin slug appears on more than one DOM root. Boot-time validator + `validate_global` reporting + `nac:fatal` banner. Migration flag `NAC.HARD_DEDUP=false` available for one release; removed in v2.6. |
| V24-02 | Idempotent `syncPlugin` | **SHIPPED** | 2.5.0 (was announced for 2.3.x but never landed in code; implemented for the first time in 2.5.0 with full test coverage and demo evidence) | L1: stage9 (21 PASS) -- L2: demos/v24-02-sync-plugin (10 PASS, 5 screenshots) -- L3: pilot LIVE w/ Claude (3 PASS, 3 statements) | Replaces a plugin's manifest instead of appending, so SPA re-renders do not accumulate stale entries. Counterpart `syncDataTable` for the data-table primitive. |
| V24-04 | Snapshot versioning + OCC | **SHIPPED** | foundation in alpha.2; dispatch hooks for click/fill/select/invoke + click_by_verb + tab_by_label in alpha.3; tab(opts?) + STRICT_VERSIONING default flipped to true in alpha.4 | L1: stage12 (~31 PASS including tab) -- L2: demos/v24-04-snapshot-versioning (17 PASS, 8 screenshots) -- L3: pilot LIVE w/ Claude (8 PASS, 3 statements -- includes plan-and-execute retry pattern) | Full V24-04 contract live across every mutating verb. `tree_version` + per-plugin `plugin_version` + per-element `element_state_hash` in `describe()`. `_resolveVersionExpectations(opts, el)` helper. `_bumpPluginVersion` + `_bumpTreeVersion` + MutationObserver wiring. `STRICT_VERSIONING` defaults true in alpha.4 -- callers without `expected_*` either opt out (`NAC.STRICT_VERSIONING = false`) or get `version_required`. `markHydrationComplete()` + `versionHistory(limit)` + `conformance_tier` exposed. Every dispatch verb rejects `snapshot_stale` synchronously when caller passes mismatched `expected_plugin_version` / `expected_tree_version` / `expected_element_state_hash`. |
| V24-05 | Agent authority + sudo elevation | **SHIPPED** | 2.5.0 | L1: stage10 (~31 PASS) -- L2: demos/v24-05-authority-sudo (15 PASS, 7 screenshots) -- L3: pilot LIVE w/ Claude (7 PASS, 3 statements -- sudo bypass, rank rule, single confirm) | `NAC.confirm_action(action_id, message, opts)` blocking confirmation hook; `NAC.request_authority(scope, ttl_ms)` temporary sudo-style elevation that bypasses confirmations for the granted scope until TTL expires; `NAC.set_confirm_handler(fn)` for host UI injection. Provenance: `nac:authority:requested / :granted / :revoked / :expired`. |
| V25-01 | Plugin extension contract -- canvas + API | **SHIPPED** | 2.5.0 | L1: stage8 (84 PASS) -- L2: demos/v25-canvas-api (24 PASS, 9 screenshots) -- L3: pilot LIVE w/ Claude (11 PASS, 4 statements) | `NAC.registerPlugin / call / read / subscribe / unsubscribe` for surfaces where verbs / state / events route through something other than direct DOM (postMessage to iframe, plugin SDK, script bridge, DOM mirror, same-origin window, synthesised events). 8 backend kinds + declarative extractor mini-DSL + fallback chain + provenance. The canvas-side mechanism for assistive use cases (Collabora, etc) and the universal contract for canvas+API apps (Figma, Excalidraw, Miro, ...). |
| V25-02 | Tree navigation (`context` / `tree` / `data-nac-opens`) | **SHIPPED** | 2.5.0-alpha.5 | L2: demos/v25-02-tree-nav (18 PASS, 6 screenshots) -- L3: pilot LIVE w/ Claude (4 PASS, 2 statements) | Hierarchical command navigation: `NAC.context(plugin)` returns the current node's breadcrumb; `NAC.tree(plugin, rootId?)` enumerates immediate addressable children; `data-nac-opens` / `data-nac-leaf` attributes declare parent-child relationships explicitly in the chrome. Labels resolved via narrate. |
| V25-03 | Asistive labels (`narrate`) | **SHIPPED** | 2.5.0-alpha.5 | L2: demos/v25-03-narrate (12 PASS, 3 screenshots) -- L3: pilot LIVE w/ Claude (6 PASS, 3 statements) | `NAC.narrate(plugin, nodeId)` returns the canonical human-readable label prioritising aria-label > visible text > data-nac-label > nac_id fallback. Whitespace-only values at any tier collapse to the next tier. Nested addressable children excluded from parent's visible-text resolution. |
| V25-04 | Effect detection (`expect` / `diff`) | **SHIPPED** | 2.5.0-alpha.5 | L2: demos/v25-04-expect-diff (17 PASS, 7 screenshots) -- L3: pilot LIVE w/ Claude (7 PASS, 3 statements) | `NAC.expect(plugin, statePath, value, opts?)` Promise that resolves when a state matches an expected value within a timeout; `NAC.diff(plugin, statePath, actionFn)` snapshots a state pre- and post-action, returns `{before, after, changed}`. Closes the "silent damage" gap for assistive callers. Both primitives compose with V25-01 `read()` so any backend works. |

---

## What this means for adopters

If you install `@nac3/runtime@2.5.0-alpha.1` today:

- All the **SHIPPED** rows above are live. No opt-in required for V24-01 / V24-02 / V24-05 / V25-01.
- V24-04 enforcement is ON by default. Adopters with code paths that
  pass `expected_*` parameters but don't handle `snapshot_stale` MUST
  add a handler before upgrading, or temporarily set
  `NAC.STRICT_VERSIONING = false`.
- V25-02 / V25-03 / V25-04 are not in the runtime yet. Don't rely on
  them. Spec drafts published for review; ship target is a 2.5 patch
  release.

If you install `@nac3/runtime@2.4.0` (the prior release):

- You get strict resolution + disambiguation contract (the
  zero-silent-damage release on the qualifier resolver). That work
  remains stable in 2.5 -- no behaviour regression.
- You do NOT get V24-01..05 or V25-01. Upgrade to 2.5.0-alpha.1 to
  receive them.

If you install `@nac3/runtime@2.3.1` (older still):

- You get the V24-04 runtime code at opt-in level (the OCC fields are
  exposed in `describe()` output but no `snapshot_stale` enforcement
  unless you set `STRICT_VERSIONING=true`).
- You do NOT get syncPlugin / syncDataTable -- they were announced in
  CHANGELOG but never actually landed in code. 2.5.0-alpha.1 is the
  first release where they are usable.

---

## What this means for spec contributors

If you're proposing a change to NAC3:

1. Open an issue describing the problem first.
2. If consensus emerges that a spec change is warranted, draft an RFC
   in this directory as `RFC-V<MAJOR>-<NN>-short-title.md`.
3. The RFC follows the structure of [RFC-V24-04](./RFC-V24-04-snapshot-versioning.md).
4. After comment period, status moves DRAFT -> IMPLEMENTED -> SHIPPED
   with the npm release that includes it.

---

## v2.5.0 consolidation note

NAC3 v2.5.0 is a consolidation release. Two parallel development lines
that diverged during May 2026 are unified here:

- **Line A** (yujinapp/nac-spec, RFC track): V24-01 plugin slug
  uniqueness, V24-02 idempotent syncPlugin (announced but never
  implemented; first implementation lands in 2.5), V24-04 snapshot
  versioning + OCC (was opt-in in 2.3.1 runtime, now GA), V24-05 agent
  authority + sudo (was DRAFT, now SHIPPED in 2.5).
- **Line B** (rpaforce-crm, contract track): V25-01 plugin extension
  contract for canvas+API surfaces (Blocks A 8 backends complete).

Both lines now live in this single source tree. The rpaforce-crm
copies of `packages/nac/` and `yujin.app/nac-spec/` were deleted on
2026-05-23 (commit `0ff3afa`), and `yujinapp/nac-spec` is now the
sole source of truth for NAC3.

---

## RFC drafts in this directory

- [`RFC-V24-04-snapshot-versioning.md`](./RFC-V24-04-snapshot-versioning.md) -- full draft, includes implementation notes.

V24-05 (authority + sudo), V25-01 (plugin extension contract),
V25-02/03/04 (tree nav, asistive labels, effect detection) drafts to be
added in this directory before their respective ship dates.
