---
translation_source: guides/RPA_AUTOMATION_ANYWHERE.md
translation_source_hash: 165e60e4b3922f8353a3f038d815452ebf9ba7d597cb68f8c313eb47cb416eab
translation_quality: machine_v1
translation_lang: it
translation_date: 2026-05-11T14:12:46.621031+00:00
---

# NAC3 + Guida all'integrazione con Automation Anywhere

**Versione NAC3:** 2.2 (con anteprima interoperabilità v2.3)
**Testato con:** Automation Anywhere A2019 + A360.

## Due percorsi -- scegli in base alla tua edizione AA

### Percorso A -- A360 + Web Recorder + Run JavaScript

L'azione `Run JavaScript Function` di AA viene iniettata nel tab del browser attivo.

```js
// payload variable: NAC_ID = "invoice.save"
async function nacClick(id) {
  await window.NAC.click(id);
  return 'ok';
}
return nacClick($NAC_ID$);
```

Associa le variabili di input (`$NAC_ID$`, `$VALUE$`) in fase di progettazione;
l'azione restituisce una stringa su cui il bot può fare branching.

### Percorso B -- A2019 + Object Cloning con attributo personalizzato

L'`Object Cloning` di A2019 individua gli elementi tramite proprietà DOM.
Configura il selettore di proprietà come segue:

```
HTML.Attribute: data-nac-id
Search value: invoice.save
```

Meno robusto del Percorso A (dipende dai tempi di costruzione del DOM), ma consente ai bot A2019 esistenti di adottare NAC3 senza riscrivere i flussi.

## Template bot canonico con 8 azioni

Per la demo fatture v21:

| Passo | Azione | Payload |
|-------|--------|---------|
| 1 | Open Browser | https://your-app.example.com/ |
| 2 | Wait | attendi che `window.NAC` sia pronto (polling JS) |
| 3 | Loop CSV | righe |
| 4 | Run JS | `await window.NAC.click_by_verb('invoice','new')` |
| 5 | Run JS | `await window.NAC.fill('invoice.client',$row.client$)` |
| 6 | Run JS | `await window.NAC.fill('invoice.amount',$row.amount$)` |
| 7 | Run JS | `await window.NAC.click_by_verb('invoice','save')` |
| 8 | End Loop | -- |

8 azioni indipendentemente dalla complessità dell'interfaccia. Da confrontare con le tipiche 30-60 azioni dei flussi basati su selettori CSS.

## Esplorazione tramite `NAC.describe()`

```js
return JSON.stringify(window.NAC.describe());
```

Restituisce l'albero del manifest. AA può analizzarlo con `JSON Parse` e
costruire flowchart dinamici.

## Provenienza + isTrusted

AA genera click sintetici. L'applicazione host potrebbe rifiutare i verb sensibili (delete, payment) a meno che non siano esplicitamente inseriti nella whitelist. Consulta la sezione "Provenance" di `RPA_UIPATH.md` per il pattern di opt-in lato host. Lo stesso vale per AA.

## Gestione degli errori

Racchiudi ogni chiamata JS in un blocco `try/catch` che restituisce JSON:

```js
try {
  await window.NAC.fill('@id@', '@value@');
  return JSON.stringify({ok: true});
} catch (e) {
  return JSON.stringify({ok: false, code: e.code, message: e.message});
}
```

L'azione `If` fa branching sul JSON analizzato.

## Licenza + riferimenti

Apache-2.0. Consulta [RPA_UIPATH.md](RPA_UIPATH.md) per una trattazione più approfondita; i pattern si trasferiscono 1:1.

---

*This is a machine translation of the canonical English
version at `/nac-spec/guides/RPA_AUTOMATION_ANYWHERE.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
