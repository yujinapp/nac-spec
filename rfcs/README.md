# NAC3 RFCs

These are proposals and shipped-change records for the NAC3 spec. **Read this index first** before reading any individual RFC — it tells you what's in the current npm and what is still proposed.

The SPEC (`../SPEC.md`) describes **what the current npm runtime does**.
RFCs describe **what we propose, are implementing, or already shipped**.
A reader confused about the difference: stick to SPEC for adoption decisions.

---

## Index

| RFC | Title | Status | Shipped in | Notes |
|-----|-------|--------|------------|-------|
| V24-01 | Plugin slug uniqueness | **SHIPPED** | 2.3.0 | `data-nac-plugin-id` MUST when slug appears more than once. Enforced by `validate_global`. |
| V24-02 | Idempotent `syncPlugin` | **SHIPPED** | 2.3.0 | Replaces manifest for a plugin instead of appending. Fixes the stale-snapshot class of bugs. |
| V24-04 | Snapshot versioning + OCC | **IMPLEMENTED, ENFORCEMENT OPT-IN** | code merged in 2.3.0 runtime | `plugin_version` + `element_state_hash` exposed in `describe()` by default. `expected_*` enforcement gated by `STRICT_VERSIONING=true`. Targeting GA + benchmark in v2.4. See [RFC-V24-04](./RFC-V24-04-snapshot-versioning.md). |
| V24-05 | Agent authority + interposition | **DRAFT** | target v2.4.0 | `confirm_action`, `request_authority`, `set_confirm_handler` semantics. NOT in 2.3.0 runtime. |

---

## What this means for adopters

If you install `@nac3/runtime@2.3.0` today:

- ✅ You get `syncPlugin`, `data-nac-plugin-id`, idempotent registration.
- ✅ You get the V24-01 / V24-02 SHIPPED features above.
- ⚠️ You can observe `plugin_version` and `element_state_hash` in `NAC.describe()` output. These are **stable in shape but experimental in contract** — their semantics may tighten when V24-04 GAs in v2.4. Read but don't depend on them yet for production OCC.
- ⚠️ `markHydrationComplete()` is exported and active. Calling it is safe (resolves the 100ms hydration fallback). The exact semantics around plugin-version bumps post-hydration may change in v2.4.
- ❌ V24-05 authority primitives (`confirm_action`, `request_authority`) are NOT in the 2.3.0 runtime. Don't rely on them existing.

---

## What this means for spec contributors

If you're proposing a change to NAC3:

1. Open an issue describing the problem first.
2. If consensus emerges that a spec change is warranted, draft an RFC in this directory as `RFC-V<MAJOR>-<NN>-short-title.md`.
3. The RFC follows the structure of [RFC-V24-04](./RFC-V24-04-snapshot-versioning.md).
4. After comment period, status moves DRAFT → IMPLEMENTED → SHIPPED with the npm release that includes it.

---

## Why V24-04 has the "enforcement opt-in" status

The benchmark (600 runs, 5 models, May 2026) ran against this exact runtime with `STRICT_VERSIONING=false` (the default). It validated the 2.3.0 decoration + verb + idempotency layer; it did NOT exercise the snapshot-versioning enforcement (no `expected_*` params in the benchmark dispatches).

Shipping V24-04 enforcement as GA without a benchmark of concurrent agents racing on the same UI would be premature. The plan is:

1. **v2.3.0 (now):** snapshot versioning fields readable, enforcement off-by-default. Stable behavior for adopters who don't opt in.
2. **v2.4.0 (later):** dedicated concurrency benchmark — N concurrent agents on the same UI, with `STRICT_VERSIONING=true`, measuring snapshot_stale rates and conflict resolution. When that lands, V24-04 moves to SHIPPED status and the SPEC documents the enforcement contract.

---

## RFC drafts in this directory

- [`RFC-V24-04-snapshot-versioning.md`](./RFC-V24-04-snapshot-versioning.md) — full draft, includes implementation notes.

V24-05 (authority) draft pending; will be added in the same directory when ready.
