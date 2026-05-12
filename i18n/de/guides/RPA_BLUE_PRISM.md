---
translation_source: guides/RPA_BLUE_PRISM.md
translation_source_hash: 7ab698b35a99ca25e77a07599f1aa733b4ba42eb08d0f3bce785a9b0c7f7e276
translation_quality: machine_v1
translation_lang: de
translation_date: 2026-05-11T14:34:16.883400+00:00
---

# NAC3 + Blue Prism Integrationshandbuch

**NAC3-Version:** 2.2 (mit v2.3 Interop-Vorschau)
**Getestet mit:** Blue Prism 7.1 + Browser Automation v7.1.

Blue Prisms `Browser`-Geschäftsobjekt stellt `Inject JavaScript`
standardmäßig bereit. NAC3 + Blue Prism folgt einem 5-stufigen Muster.

## Ablauf der Stufen

1. **Login Agent** -- Standard.
2. **Navigate** -- NAC-konforme App öffnen.
3. **JS: wait for window.NAC3** -- Polling bis bereit.
4. **JS: NAC.click / fill / tab** -- kanonischer Dispatch.
5. **JS: read describe()** -- Manifest für die nächste
   Iteration des Datenflusses introspektieren.

## Beispiel-VBO (Visual Business Object)

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

Entsprechende Aktionen: `Click By Verb`, `Fill`, `Select`, `Tab`,
`Describe`, `WaitForAck`.

## Wait-for-Ack-Muster

`NAC.click()` wartet intern bereits auf `nac:action:succeeded`
(5s Timeout). Blue Prism kann zusätzlich ein explizites Warten einbauen:

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

Dieses Muster macht die kanonische NAC3-Ereignisfamilie in den
Stage-Ausgaben von Blue Prism sichtbar – nützlich für die Verzweigung
des Prozessablaufs.

## Discovery

`Read Manifest`-Aktion:

```js
return JSON.stringify(window.NAC.describe());
```

In eine Collection einlesen. Der Prozess kann sich an Änderungen
des Manifest-Schemas anpassen, ohne dass Stages neu kompiliert werden müssen.

## Lizenz + Siehe auch

Apache-2.0. Siehe [RPA_UIPATH.md](RPA_UIPATH.md) für eine ausführlichere
Behandlung des Themas.

---

*This is a machine translation of the canonical English
version at `/nac-spec/guides/RPA_BLUE_PRISM.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
