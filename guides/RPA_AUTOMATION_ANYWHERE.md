# NAC3 + Automation Anywhere integration guide

**NAC3 version:** 2.2 (with v2.3 interop preview)
**Tested against:** Automation Anywhere A2019 + A360.

## Two paths -- pick by your AA edition

### Path A -- A360 + Web Recorder + Run JavaScript

AA's `Run JavaScript Function` action injects into the active
browser tab.

```js
// payload variable: NAC_ID = "invoice.save"
async function nacClick(id) {
  await window.NAC.click(id);
  return 'ok';
}
return nacClick($NAC_ID$);
```

Bind input variables (`$NAC_ID$`, `$VALUE$`) at design time;
the action returns a string the bot branches on.

### Path B -- A2019 + Object Cloning with custom attribute

A2019's `Object Cloning` traditionally targets via DOM
properties. Configure the property selector:

```
HTML.Attribute: data-nac-id
Search value: invoice.save
```

Less robust than Path A (depends on DOM tree timing), but lets
veteran A2019 bots adopt NAC3 without rewriting flows.

## Canonical 8-action bot template

For the v21 invoice demo:

| Step | Action | Payload |
|------|--------|---------|
| 1 | Open Browser | https://your-app.example.com/ |
| 2 | Wait | for `window.NAC` ready (poll JS) |
| 3 | Loop CSV | rows |
| 4 | Run JS | `await window.NAC.click_by_verb('invoice','new')` |
| 5 | Run JS | `await window.NAC.fill('invoice.client',$row.client$)` |
| 6 | Run JS | `await window.NAC.fill('invoice.amount',$row.amount$)` |
| 7 | Run JS | `await window.NAC.click_by_verb('invoice','save')` |
| 8 | End Loop | -- |

8 actions regardless of UI complexity. Compare to typical
30-60 actions for CSS-selector flows.

## Discovery via `NAC.describe()`

```js
return JSON.stringify(window.NAC.describe());
```

Returns the manifest tree. AA can parse it with `JSON Parse` and
build dynamic flowcharts.

## Provenance + isTrusted

AA dispatches synthetic clicks. The host app may refuse sensitive
verbs (delete, payment) unless explicitly whitelisted. See
`RPA_UIPATH.md` section "Provenance" for the host-side opt-in
pattern. Same applies to AA.

## Error handling

Wrap every JS call in `try/catch` returning JSON:

```js
try {
  await window.NAC.fill('@id@', '@value@');
  return JSON.stringify({ok: true});
} catch (e) {
  return JSON.stringify({ok: false, code: e.code, message: e.message});
}
```

`If` action branches on the parsed JSON.

## License + see also

Apache-2.0. See [RPA_UIPATH.md](RPA_UIPATH.md) for the deeper
treatment; the patterns transfer 1:1.
