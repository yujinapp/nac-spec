# Migrating from NAC3 v2.2 to v2.3

> **TL;DR.** v2.3 is **strict-superset** of v2.2. Existing
> manifests keep working with **two caveats**:
> (1) `NAC.STRICT_VALIDATION` now defaults to `true`, so
> previously-warning drift findings now throw on `register()`;
> (2) `NAC.invoke` no longer rejects on `disabled` elements (it
> never did intentionally, but the alpha.2 hotfix pinned the
> behaviour down; `NAC.click` still does). Everything else in
> v2.3 is additive.

This guide is for adopters upgrading from
`@nac3/runtime@2.2.x` to `@nac3/runtime@2.3.0`.

---

## Will my v2.2 app break?

Only if **all four** are true:

1. Your manifest has drift findings (unknown role,
   `tab.*` id with non-tab role, manifest vs DOM role mismatch).
2. You upgraded the runtime without auditing those findings.
3. Your code calls `NAC.register()` synchronously during app
   bootstrap with no error handling.
4. You did NOT explicitly set
   `NAC.STRICT_VALIDATION = false` before `register()`.

If those four hold, your `register()` call now throws and your
plugin fails to register. Fix paths below.

If they do NOT all hold (you have a clean manifest, OR you
already had drift-finding-clean output in v2.2, OR you handle
register failures), the upgrade is silent.

---

## Step-by-step upgrade

### 1. Bump the runtime

```bash
npm install @nac3/runtime@2.3.0
```

Or via CDN:

```html
<script src="https://unpkg.com/@nac3/runtime@2.3.0/dist/nac.browser.js"></script>
```

### 2. Audit your manifest for drift findings

In your app, open devtools console with the v2.2.x runtime
running. Set:

```js
NAC.STRICT_VALIDATION = false;
NAC.register({ /* your manifest */ });
// then run:
console.log(NAC.validate_global());
```

If `validate_global()` returns an empty array OR an array with
only `info` / `warn` findings (no `error` level), you are
clean. Skip to step 5.

If it returns `error`-level findings of these codes:
- `manifest_role_unknown`
- `tab_id_manifest_role_drift`
- `manifest_dom_role_mismatch`

go to step 3.

### 3. Fix the drift findings

#### `manifest_role_unknown`

Your manifest has a `role: 'banana'` (or anything outside the
canonical set). Replace with one of:

```
plugin section region action field option tab
breadcrumb-item accordion-toggle step pagination-item
confirm-button sort-control filter-control data-table
navigation confirm-dialog draggable drop-target button
```

#### `tab_id_manifest_role_drift`

Your id starts with `tab.` (e.g. `tab.lines`) but the role is
not `tab`. Either:

- Rename the id so it does not start with `tab.` (e.g.
  `nav.lines`), OR
- Change the role to `tab`.

`NAC.tab()` / `NAC.tab_by_label()` rely on the `tab.` prefix
convention; mismatches break those callers.

#### `manifest_dom_role_mismatch`

Your manifest says `role: 'action'` but the DOM element
declares `data-nac-role="navigation"` (or vice versa).
Reconcile by editing whichever is wrong.

The DOM-side declaration usually wins because it is closer to
the user's intent. If both are intentional, you have two
elements with conflicting contracts and you need to disambiguate.

### 4. Re-run `validate_global()`

It should return clean (no `error`-level findings). Now safe
to ship with v2.3 defaults.

### 5. Optionally adopt new v2.3 surfaces

These are additive and entirely opt-in:

- **`NAC.invoke(action_id, payload, opts?)`** -- payload-bearing
  action. See SPEC.md sec 5.1.4. Use when an action needs DATA
  from the agent (text, file, query, schedule) -- not just a
  click.
- **`NAC.utter(action_id, {text, lang})`** -- ergonomic shortcut
  for `verb='utter'`.
- **`NAC.bindTab(el, handler, ctx)`** -- tab companion to
  v2.2's `bindAction`. Bakes the `nac:tab:activated` event
  into the runtime.
- **`NAC.edit_field(nac_id)`** -- field editor primitive.
  Promoted from preview to GA in v2.3.
- **Shadow DOM open** -- existing Web Components automatically
  resolved. No code change required. See SPEC.md sec 5.1.5 +
  `guides/SHADOW_DOM_OPEN.md`.
- **Shadow DOM closed** -- if you have closed-shadow components,
  optionally implement `get nac3()` to expose them. See SPEC.md
  sec 5.1.6 + `guides/SHADOW_DOM_CLOSED.md`.
- **Auth-aware capabilities** -- gate actions by user
  permissions declared in the manifest. See SPEC.md sec 5.1.7.

None of these are required for v2.3 conformance; v2.2 manifests
continue to work unchanged.

---

## Opt-out: keep `STRICT_VALIDATION = false`

If you cannot clean up drift findings before upgrade, set:

```js
NAC.STRICT_VALIDATION = false;
NAC.register({ /* your manifest */ });
```

The runtime will warn on findings instead of throwing.
**This opt-out is supported through the v2.3 minor line; v3.0
removes the flag entirely.** Plan to clean up before v3.0
lands.

---

## Common gotchas

### Where to set the flag

`STRICT_VALIDATION` is a runtime-wide flag. Set it BEFORE the
first `NAC.register()` call:

```html
<script src="nac.js"></script>
<script>
  NAC.STRICT_VALIDATION = false;  // FIRST
  NAC.register({ ... });          // then
</script>
```

If you set it after `register()` has already run, the
registration has already either succeeded or thrown -- too
late.

### Per-manifest opt-out

If you have multiple plugins and only one has drift findings:

```js
// Clean plugin -- ship with strict.
NAC.STRICT_VALIDATION = true;
NAC.register({ plugin_slug: 'clean_one', /* ... */ });

// Legacy plugin -- ship with warn-only.
NAC.STRICT_VALIDATION = false;
NAC.register({ plugin_slug: 'legacy_one', /* ... */ });

// Restore default for the rest of the page.
NAC.STRICT_VALIDATION = true;
```

This is a workaround, not a recommendation. Cleaning up the
manifest is preferred.

### `NAC.click` vs `NAC.invoke` on disabled elements

v2.3 stable retains the alpha.2 hotfix: `NAC.invoke` does NOT
reject on `disabled` / `aria-disabled='true'` elements.
`NAC.click` still does. If your app relied on `invoke` failing
on disabled, you need to add the gate in your own
`nac:action:requested` listener and emit `nac:action:failed`
with a meaningful code.

### Web Components with shadow DOM

If your app uses Web Components, v2.3 now walks open shadow
roots automatically. This is purely a capability gain -- any
`data-nac-*` element you previously had to wire via custom
glue now resolves through `NAC.click` / `NAC.invoke` directly.

Closed shadow components remain inaccessible unless they
implement the voluntary `get nac3()` exposure API.

---

## Test surface

Verify your migration by running NAC3's own test suite in your
project (one-time check):

```bash
npx @nac3/runtime validate path/to/your/manifest.json
```

Or programmatically in a CI step:

```js
const findings = NAC.validate_global();
const errors = findings.filter(f => f.severity === 'error');
if (errors.length) {
  console.error('NAC3 v2.3 drift findings:', errors);
  process.exit(1);
}
```

---

## Quick reference

| What | v2.2.x | v2.3.0 |
|------|--------|--------|
| `STRICT_VALIDATION` default | `false` | **`true`** |
| `NAC.invoke` rejects on disabled | n/a (didn't exist) | **NO** (intentional relaxation) |
| `NAC.click` rejects on disabled | yes | yes (unchanged) |
| `NAC.bindAction` | yes | yes (unchanged) |
| `NAC.bindTab` | n/a | **new** |
| `NAC.invoke`, `NAC.utter` | n/a (preview in alpha) | **stable** |
| `NAC.edit_field` | n/a (preview in alpha) | **GA** |
| Open shadow DOM walk | n/a | **automatic** |
| Closed shadow DOM `el.nac3` API | n/a | **available** |
| `NAC.setCapabilities` | n/a | **new** |
| Manifest `requires_capability` | n/a | **new** |

---

## See also

- `CHANGELOG.md` -- consolidated v2.3.0 entry.
- `ABOUT.md` -- spec versions header.
- `SPEC.md` sec 5.1.2 (strict validation), 5.1.3 (edit_field),
  5.1.4 (invoke/utter), 5.1.5 (open shadow), 5.1.6 (closed
  shadow), 5.1.7 (capabilities).
- `guides/SHADOW_DOM_OPEN.md` -- shadow DOM authoring.
- `guides/SHADOW_DOM_CLOSED.md` -- closed shadow exposure.
