---
translation_source: guides/RPA_BLUE_PRISM.md
translation_source_hash: 7ab698b35a99ca25e77a07599f1aa733b4ba42eb08d0f3bce785a9b0c7f7e276
translation_quality: machine_v1
translation_lang: it
translation_date: 2026-05-11T14:12:54.586494+00:00
---

# Guida all'integrazione NAC3 + Blue Prism

**Versione NAC3:** 2.2 (con anteprima interop v2.3)
**Testato con:** Blue Prism 7.1 + Browser Automation v7.1.

Il business object `Browser` di Blue Prism espone `Inject JavaScript`
nativamente. NAC3 + Blue Prism segue un pattern in 5 fasi.

## Flusso delle fasi

1. **Login Agent** -- standard.
2. **Navigate** -- aprire l'applicazione conforme a NAC.
3. **JS: wait for window.NAC3** -- polling fino a quando non è pronto.
4. **JS: NAC.click / fill / tab** -- dispatch canonico.
5. **JS: read describe()** -- introspezione del manifest per la
   successiva iterazione del flusso dati.

## Esempio di VBO (Visual Business Object)

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

Azioni speculari: `Click By Verb`, `Fill`, `Select`, `Tab`,
`Describe`, `WaitForAck`.

## Pattern di attesa dell'ack

`NAC.click()` attende già internamente l'evento `nac:action:succeeded`
(timeout di 5s). Blue Prism può aggiungere un'ulteriore attesa esplicita:

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

Questo pattern espone la famiglia di eventi canonici NAC3 negli output
delle stage di Blue Prism, utile per ramificare il flusso di processo.

## Discovery

Azione `Read Manifest`:

```js
return JSON.stringify(window.NAC.describe());
```

Convogliare il risultato in una Collection. Il processo può adattarsi
alle modifiche dello schema del manifest senza ricompilare le stage.

## Licenza e riferimenti

Apache-2.0. Vedere [RPA_UIPATH.md](RPA_UIPATH.md) per una trattazione
più approfondita.

---

*This is a machine translation of the canonical English
version at `/nac-spec/guides/RPA_BLUE_PRISM.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
