# NAC3 + UiPath integration guide

**NAC3 version:** 2.2 (with v2.3 interop preview)
**Status:** Stable. Tested against UiPath Studio 23.10 + Web
Automation v23.10.

UiPath's web automation today scrapes the DOM with CSS selectors,
visual targeting, or hardcoded coordinates. With NAC3, every
clickable widget in your app advertises a stable
`data-nac-id`; UiPath addresses elements by that id and survives
UI redesigns trivially.

## Why NAC3 + UiPath

| Today's pain | NAC3 fix |
|--------------|---------|
| Selectors break when CSS changes | `data-nac-id` is stable across visual redesigns |
| Anchor / coordinate targeting fails after a button moves | Same |
| Cross-tenant brittleness (different IDs per customer) | Manifest declares the verb; bot calls by verb |
| Wait for "the element is ready" is fragile | `nac:action:succeeded` event is deterministic |
| Multi-language UIs need per-locale automation | `label_i18n` is locale-agnostic; bot uses ids not labels |

## Two integration paths

### Path A -- Browser activity + JS injection (recommended)

UiPath's `Inject JavaScript` activity runs `window.NAC.click(...)`
directly. No selectors, no fragility.

```vb
' UiPath sequence pseudocode
Open Browser https://your-app.example.com/
Inject JS: window.NAC.click('invoice.save')
Wait for Event: nac:action:succeeded
```

Implementation:

1. **Browser activity** -- standard UiPath flow.
2. **Inject JavaScript activity** -- payload:
   ```js
   return await (async () => {
     const result = await window.NAC.click('@id@');
     return JSON.stringify(result);
   })();
   ```
3. **Assign** the returned string to a variable. Parse to check
   `{ok: true}`.

For verb-based dispatch:

```js
await window.NAC.click_by_verb('@plugin@', '@verb@')
```

For fill:

```js
await window.NAC.fill('@id@', '@value@')
```

### Path B -- Selector-based with NAC-aware xpath

If your UiPath profile prefers selectors, use the `data-nac-id`
attribute directly:

```xml
<webctrl tag='button' attr='data-nac-id' value='invoice.save' />
```

Same logic but consumes the Browser DOM via UiPath's tree
explorer. Slightly less robust (depends on tree timing) but
keeps the UiPath idiom.

## Sample UiPath workflow

`Examples_NAC_Invoice.xaml` (download from the Yujin marketplace
once published):

1. **Open Browser** -- target tab to your NAC-3 conformant app.
2. **Wait for window.NAC3** -- inject:
   ```js
   return new Promise(r => {
     const t = setInterval(() => {
       if (window.NAC) { clearInterval(t); r('ready'); }
     }, 100);
   });
   ```
3. **For Each Row** -- iterate the source data table.
4. **Inject JS** -- per row:
   ```js
   await window.NAC.click_by_verb('invoice', 'new');
   await window.NAC.fill('invoice.client_name', @row("client")@);
   await window.NAC.fill('invoice.amount', @row("amount")@);
   await window.NAC.click_by_verb('invoice', 'save');
   ```
5. **Wait for** -- nac:action:succeeded with action_id='invoice.save'.
6. **Continue** loop.

The whole flow is 5 activities regardless of how complex the
underlying app is. Compare to the typical 30-50 activities for a
CSS-selector-based equivalent.

## Discovery: read the manifest

UiPath can introspect the manifest before automating:

```js
return window.NAC.describe();
```

Returns the full plugin tree. Use it to build dynamic
flowcharts that adapt to manifest changes without redeploying
the .xaml.

## Provenance (NAC-3)

UiPath dispatches synthetic clicks, so `event.isTrusted === false`
on the NAC3 ack event. Apps that gate sensitive verbs on
`is_trusted` (delete, payment, admin) WILL refuse the UiPath
dispatch by default.

To enable RPA for those verbs, the host app must explicitly
whitelist:

```js
// In the host app's NAC bootstrap:
window.__NAC_ALLOW_UNTRUSTED__ = ['invoice.save', 'invoice.send'];
```

Discuss the threat model with the app owner -- bypassing
isTrusted defeats the spec's anti-spoofing guarantee. UiPath
runs in a controlled environment so the trade-off is usually
acceptable, but document it.

## Error handling

NAC3 throws structured errors UiPath can branch on:

```js
try {
  await window.NAC.click('invoice.save');
} catch (e) {
  return JSON.stringify({ ok: false, code: e.code, message: e.message });
}
```

| `e.code` | Meaning | UiPath branch |
|----------|---------|---------------|
| `not_found` | id doesn't exist in current DOM | Re-discover via `NAC.describe()` |
| `invalid` | argument shape wrong | Bot logic bug, escalate |
| `timeout` | side effect didn't ack in 5s | Retry up to N times |

## Tested matrix

We exercise the integration against the
[v21 data-table demo](https://yujin.app/nac-spec/example-v21-data-table.php)
via UiPath 23.10 in CI. The reference workflow is in
`tools/rpa/uipath/InvoiceFromCSV.xaml` of this repo (forthcoming).

## See also

- [SPEC.md sec 5](../SPEC.md#5-public-api) -- full NAC.* surface.
- [SECURITY.md](../SECURITY.md) -- isTrusted threat model.
- [LLM_WIRING.md](LLM_WIRING.md) -- if your RPA flow also needs
  voice / chat input, wire the LLM intermediary in front.
- [NAC_TEST_MANUAL.md](../docs/NAC_TEST_MANUAL.md) -- how Yujin
  tests this contract end-to-end.

## License

Apache-2.0.
