# NAC3 + Blue Prism integration guide

**NAC3 version:** 2.2 (with v2.3 interop preview)
**Tested against:** Blue Prism 7.1 + Browser Automation v7.1.

Blue Prism's `Browser` business object exposes `Inject JavaScript`
out of the box. NAC3 + Blue Prism is a 5-stage pattern.

## Stage flow

1. **Login Agent** -- standard.
2. **Navigate** -- open the NAC-conformant app.
3. **JS: wait for window.NAC3** -- poll until ready.
4. **JS: NAC.click / fill / tab** -- canonical dispatch.
5. **JS: read describe()** -- introspect manifest for the next
   iteration of the dataflow.

## Sample VBO (Visual Business Object)

```
Object: NAC Driver
Action: Click NAC ID
  Inputs:
    - nacId (Text)
  Code (Inject JavaScript):
    (async () => {
      try {
        await window.NAC.click([nacId]);
        return JSON.stringify({ok:true});
      } catch (e) {
        return JSON.stringify({ok:false, code:e.code, message:e.message});
      }
    })()
  Outputs:
    - resultJson (Text)
```

Mirror actions: `Click By Verb`, `Fill`, `Select`, `Tab`,
`Describe`, `WaitForAck`.

## Wait for ack pattern

`NAC.click()` already waits for `nac:action:succeeded` internally
(5s timeout). Blue Prism can layer an additional explicit wait:

```js
return new Promise(resolve => {
  let acked = false;
  document.addEventListener('nac:action:succeeded', function (e) {
    if (e.detail.action_id === '[expectedId]') {
      acked = true;
      resolve('ok');
    }
  }, { once: true });
  setTimeout(() => { if (!acked) resolve('timeout'); }, [timeoutMs]);
});
```

This pattern surfaces the canonical NAC3 event family inside Blue
Prism's stage outputs, useful for branching the process flow.

## Discovery

`Read Manifest` action:

```js
return JSON.stringify(window.NAC.describe());
```

Pipe into a Collection. The process can adapt to manifest
schema changes without recompiling stages.

## License + see also

Apache-2.0. See [RPA_UIPATH.md](RPA_UIPATH.md) for the broader
treatment.
