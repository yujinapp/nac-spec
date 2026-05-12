---
translation_source: guides/RPA_UIPATH.md
translation_source_hash: 2dd66d68221f687237ac663fa2a360077a51b7cdf8ad74c16488a5934ee7927d
translation_quality: machine_v1
translation_lang: it
translation_date: 2026-05-11T14:12:36.051896+00:00
---

# Guida all'integrazione NAC3 + UiPath

**Versione NAC3:** 2.2 (con anteprima interop v2.3)
**Stato:** Stabile. Testato con UiPath Studio 23.10 + Web
Automation v23.10.

L'automazione web di UiPath oggi analizza il DOM tramite selettori CSS,
targeting visivo o coordinate fisse. Con NAC3, ogni widget cliccabile
nell'app espone un `data-nac-id` stabile; UiPath indirizza gli elementi
tramite quell'id e sopravvive senza problemi alle riprogettazioni dell'interfaccia.

## Perché NAC3 + UiPath

| Problema attuale | Soluzione NAC3 |
|-----------------|----------------|
| I selettori si rompono quando cambia il CSS | `data-nac-id` è stabile attraverso le riprogettazioni visive |
| Il targeting ad ancora / coordinate fallisce dopo che un pulsante si sposta | Idem |
| Fragilità multi-tenant (ID diversi per cliente) | Il manifest dichiara il verbo; il bot chiama per verbo |
| Attendere che "l'elemento sia pronto" è fragile | L'evento `nac:action:succeeded` è deterministico |
| Le UI multilingua richiedono automazioni per ogni lingua | `label_i18n` è indipendente dalla lingua; il bot usa gli id, non le etichette |

## Due percorsi di integrazione

### Percorso A -- Attività browser + iniezione JS (consigliato)

L'attività `Inject JavaScript` di UiPath esegue `window.NAC.click(...)`
direttamente. Nessun selettore, nessuna fragilità.

```vb
' UiPath sequence pseudocode
Open Browser https://your-app.example.com/
Inject JS: window.NAC.click('invoice.save')
Wait for Event: nac:action:succeeded
```

Implementazione:

1. **Attività browser** -- flusso UiPath standard.
2. **Attività Inject JavaScript** -- payload:
   ```js
   return await (async () => {
     const result = await window.NAC.click('@id@');
     return JSON.stringify(result);
   })();
   ```
3. **Assegna** la stringa restituita a una variabile. Analizzala per verificare
   `{ok: true}`.

Per il dispatch basato su verbo:

```js
await window.NAC.click_by_verb('@plugin@', '@verb@')
```

Per il riempimento:

```js
await window.NAC.fill('@id@', '@value@')
```

### Percorso B -- Basato su selettori con xpath NAC-aware

Se il profilo UiPath preferisce i selettori, usa direttamente l'attributo
`data-nac-id`:

```xml
<webctrl tag='button' attr='data-nac-id' value='invoice.save' />
```

Stessa logica, ma accede al DOM del browser tramite l'esplora struttura
di UiPath. Leggermente meno robusto (dipende dai tempi di caricamento
dell'albero), ma mantiene l'approccio tipico di UiPath.

## Workflow UiPath di esempio

`Examples_NAC_Invoice.xaml` (da scaricare dal marketplace Yujin
una volta pubblicato):

1. **Open Browser** -- punta la scheda alla tua app conforme a NAC-3.
2. **Attendi window.NAC3** -- inietta:
   ```js
   return new Promise(r => {
     const t = setInterval(() => {
       if (window.NAC) { clearInterval(t); r('ready'); }
     }, 100);
   });
   ```
3. **For Each Row** -- itera la tabella dati sorgente.
4. **Inject JS** -- per ogni riga:
   ```js
   await window.NAC.click_by_verb('invoice', 'new');
   await window.NAC.fill('invoice.client_name', @row("client")@);
   await window.NAC.fill('invoice.amount', @row("amount")@);
   await window.NAC.click_by_verb('invoice', 'save');
   ```
5. **Attendi** -- nac:action:succeeded con action_id='invoice.save'.
6. **Continua** il ciclo.

L'intero flusso è composto da 5 attività, indipendentemente dalla
complessità dell'app sottostante. A confronto, un equivalente basato
su selettori CSS richiede tipicamente 30-50 attività.

## Discovery: lettura del manifest

UiPath può esaminare il manifest prima di avviare l'automazione:

```js
return window.NAC.describe();
```

Restituisce l'intero albero dei plugin. Usalo per costruire flowchart
dinamici che si adattano alle modifiche del manifest senza ridistribuire
il file .xaml.

## Provenienza (NAC-3)

UiPath invia click sintetici, quindi `event.isTrusted === false`
sull'evento di ack di NAC3. Le app che condizionano i verbi sensibili
a `is_trusted` (elimina, pagamento, admin) RIFIUTERANNO per impostazione
predefinita il dispatch di UiPath.

Per abilitare l'RPA su quei verbi, l'app host deve esplicitamente
inserirli nella whitelist:

```js
// In the host app's NAC bootstrap:
window.__NAC_ALLOW_UNTRUSTED__ = ['invoice.save', 'invoice.send'];
```

Discuti il modello di minaccia con il proprietario dell'app -- aggirare
isTrusted vanifica la garanzia anti-spoofing della specifica. UiPath
opera in un ambiente controllato, quindi il compromesso è generalmente
accettabile, ma documentalo.

## Gestione degli errori

NAC3 genera errori strutturati su cui UiPath può ramificare:

```js
try {
  await window.NAC.click('invoice.save');
} catch (e) {
  return JSON.stringify({ ok: false, code: e.code, message: e.message });
}
```

| `e.code` | Significato | Branch UiPath |
|----------|-------------|---------------|
| `not_found` | L'id non esiste nel DOM corrente | Riscopri tramite `NAC.describe()` |
| `invalid` | Forma dell'argomento errata | Bug nella logica del bot, escalate |
| `timeout` | L'effetto collaterale non ha risposto entro 5s | Riprova fino a N volte |

## Matrice di test

Eseguiamo i test dell'integrazione con il
[demo data-table v21](https://yujin.app/nac-spec/example-v21-data-table.php)
tramite UiPath 23.10 in CI. Il workflow di riferimento si trova in
`tools/rpa/uipath/InvoiceFromCSV.xaml` di questo repository (in arrivo).

## Vedi anche

- [SPEC.md sec 5](../SPEC.md#5-public-api) -- superficie completa di NAC.*.
- [SECURITY.md](../SECURITY.md) -- modello di minaccia isTrusted.
- [LLM_WIRING.md](LLM_WIRING.md) -- se il tuo flusso RPA necessita anche
  di input vocale / chat, collega l'intermediario LLM a monte.
- [NAC_TEST_MANUAL.md](../docs/NAC_TEST_MANUAL.md) -- come Yujin
  testa questo contratto end-to-end.

## Licenza

Apache-2.0.

---

*This is a machine translation of the canonical English
version at `/nac-spec/guides/RPA_UIPATH.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
