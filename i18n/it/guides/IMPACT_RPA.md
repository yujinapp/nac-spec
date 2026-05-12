---
translation_source: guides/IMPACT_RPA.md
translation_source_hash: d278c291a38100f66ef8ed5ae0030875b5e9eb4412db6edecf9b7db2794a16e2
translation_quality: machine_v1
translation_lang: it
translation_date: 2026-05-11T14:12:15.018562+00:00
---

# Impatto di NAC3 sull'RPA

**Versione NAC3:** 2.2 stable.
**Destinatari:** Architetti RPA, responsabili dei centri di eccellenza per l'automazione (CoE), ingegneri di automazione che valutano i costi di manutenzione ed espansione delle automazioni basate su NAC3.

## Sintesi

L'RPA basato su selettori CSS è fragile per natura. Il riconoscimento basato su immagini è fragile per via del rendering. NAC3 inserisce nella pagina ancoraggi nominali stabili che QUALSIASI piattaforma RPA può utilizzare come target. Il costo per automazione si riduce del 60-90% e il debito trimestrale di manutenzione dei selettori scende quasi a zero.

## Lo stato attuale dei selettori RPA

Tre approcci, tutti difettosi:

### 1. Selettori CSS / XPath

```xml
<webctrl tag='button'
         class='btn-primary btn-lg invoice-save-btn'
         text='Save' />
```

Si rompe con: rinomina delle classi CSS, ristrutturazione del layout, traduzione delle etichette, aggiunta di classi per lo stato hover.

### 2. Corrispondenza tramite immagine / OCR

Un confronto pixel del pulsante renderizzato. Si rompe con: cambio di tema, dark mode, cambio di risoluzione, sostituzione del font, sovrapposizione del focus ring.

### 3. Targeting tramite ancoraggio (coordinate relative)

"Il pulsante due celle a destra dell'etichetta 'Subtotal'." Si rompe con: reflow del layout, riordinamento delle colonne, spostamenti dei breakpoint responsive.

Tutti e tre richiedono una manutenzione costante da parte del CoE. Il tipico CoE enterprise spende il 35-60% del proprio tempo ad aggiornare selettori non funzionanti dopo redesign dell'interfaccia.

## Lo stato con NAC3

Una singola riga per elemento:

```js
await window.NAC.click('invoice.save');
```

Si rompe con: il verbo `save` rinominato dal team di prodotto in qualcos'altro. Si tratta di un vero cambiamento semantico, e l'automazione DEVE essere aggiornata per lo stesso motivo per cui gli esseri umani avrebbero bisogno di riqualificazione.

## Metriche di impatto concrete

Da un CoE che ha sperimentato NAC3 su 14 automazioni:

| Metrica | Basato su selettori | Basato su NAC3 | Delta |
|---------|---------------------|----------------|-------|
| Attività medie per automazione | 47 | 9 | -81% |
| Ore di manutenzione per trimestre di redesign UI | 41 | 3 | -93% |
| Esecuzioni fallite per settimana (deriva dei selettori) | 18 | 0 | -100% |
| Tempo per creare una nuova automazione | 12 ore | 2 ore | -83% |
| Copertura della superficie dell'app (% di azioni raggiungibili) | 38% | 95% | +150% |

Il dato sulla copertura è il più importante. **L'RPA basato su selettori copre tipicamente il 30-50% delle azioni di un'app** perché il restante 50-70% è troppo fragile per essere automatizzato in modo economicamente sostenibile. NAC3 porta quella percentuale a >90% — la coda lunga diventa economicamente affrontabile.

## Cosa abilita NAC3 per l'RPA

### 1. Portabilità cross-tenant

Oggi: un bot RPA costruito per l'istanza Salesforce del Cliente A non funziona su quella del Cliente B perché le classi CSS differiscono leggermente. Con NAC3: il bot punta a `invoice.save`, che è stabile tra i tenant. Stesso bot, multi-tenant.

### 2. Portabilità cross-vendor

Se due prodotti SaaS nello stesso dominio (CRM, ERP, project management) distribuiscono entrambi manifest NAC3 con verbi sovrapposti (`create_invoice`, `mark_paid`), la stessa logica del bot si esegue su entrambi. Il bot RPA diventa vendor-agnostic.

### 3. Automazione generata da LLM

Un ingegnere del CoE descrive l'automazione in prosa:

> "Apri Yujin CRM, trova tutte le fatture non pagate con più di 60 giorni, contrassegnale come in riscossione, invia un'email al consulente assegnato."

Un LLM con accesso a `NAC.describe()` produce la sequenza di attività:

```
1. NAC.click_by_verb('invoice', 'list_unpaid')
2. NAC.fill('invoice.filter.age_days_min', 60)
3. NAC.click('invoice.filter.apply')
4. For each row in NAC.dt_state('invoice.list'):
     - NAC.click_by_verb('invoice', 'mark_collections', {row_id})
     - NAC.click_by_verb('email', 'send_advisor', {row_id})
```

L'ingegnere del CoE rivede e approva. Ore, non settimane.

### 4. Auto-discovery per nuove app

`NAC.describe()` restituisce il manifest completo. Il bot può fare introspezione su QUALSIASI app conforme a NAC3 a runtime. **Un'automazione che punta a "ogni app conforme a NAC3 aperta dall'utente" diventa possibile** (vedi Yujin Pilot su yujin.app/pilot per la versione produttizzata).

### 5. Audit trail con provenienza

Ogni dispatch emette `nac:action:succeeded` con `is_trusted: false` (che segnala l'origine RPA) + `plugin` + `action_id`. L'app host può registrare questo per la conformità:

> Il bot xyz ha eseguito il dispatch di `invoice.delete` per la fattura #INV-42
> alle 14:23 GMT-3, con `is_trusted=false`. Approvato da:
> rpa-coe-policy v1.4.

I team GRC ottengono un audit log deterministico per ogni esecuzione del bot. Nessun scraping del DOM nei log, nessuna perdita di PII dalle stringhe dei selettori.

### 6. Controllo dei verbi sensibili

Le app che contrassegnano certi verbi (delete, payment, role grant) come richiedenti `isTrusted` rifiuteranno i dispatch RPA per impostazione predefinita. Il CoE inserisce esplicitamente nella whitelist i verbi che l'RPA può utilizzare:

```js
window.__NAC_ALLOW_UNTRUSTED__ = [
  'invoice.send',
  'invoice.save',
  'report.export'
  // i verbi delete, payment, admin non sono qui intenzionalmente
];
```

La governance del CoE diventa una configurazione JS + un audit log, non un foglio di calcolo con i permessi dei bot.

### 7. Voce + chat come front-end RPA

Il layer RPA può usare il pannello chat come interfaccia: un ingegnere del CoE dice "esegui il job delle fatture non pagate per il tenant Acme" e un backend NAC3-aware risolve ed esegue il dispatch. Il percorso vocale usa le stesse primitive `NAC.*` usate dalla chat.

## Matrice di adozione per piattaforma RPA

| Piattaforma | Approccio | Costo di integrazione | Riferimento |
|-------------|-----------|----------------------|-------------|
| UiPath | Inietta JS tramite attività Browser | Basso (una attività per chiamata) | [RPA_UIPATH.md](RPA_UIPATH.md) |
| Automation Anywhere A360 | Run JavaScript Function | Basso | [RPA_AUTOMATION_ANYWHERE.md](RPA_AUTOMATION_ANYWHERE.md) |
| Blue Prism | Inject JavaScript (azione VBO) | Basso | [RPA_BLUE_PRISM.md](RPA_BLUE_PRISM.md) |
| Power Automate Desktop | Run JavaScript on web page | Basso | (in arrivo) |
| RPA basato su Selenium | execute_script | Basso | -- |
| Basato su immagini (TagUI, Sikuli) | Percorso di fallback; usare solo come ultima risorsa | Alto | -- |

## Playbook di migrazione per una suite di automazioni esistente

### Fase 1 — audit (1 settimana)

1. Inventariare ogni selettore in ogni automazione.
2. Per ciascuno: classificare come "stabile-bassa-manutenzione" /
   "fragile-alta-manutenzione".
3. Quelli fragili diventano i primi candidati per NAC3.

### Fase 2 — preparazione dell'app target

L'app web che l'automazione punta deve adottare NAC3. Oppure:

- Il team dell'app adotta tramite il playbook di migrazione
  ([AI_PLAYBOOK_MIGRATION.md](AI_PLAYBOOK_MIGRATION.md)).
- OPPURE: il CoE RPA inietta NAC3 lato client tramite uno userscript /
  estensione del browser se il team dell'app non può migrare. Funziona
  ma è fragile; preferire l'adozione first-party.

### Fase 3 — riscrittura dell'automazione (1-2 settimane per automazione)

Sostituire ogni selettore con la corrispondente chiamata `NAC.*`.
La versione basata su selettori rimane in un branch di backup. La nuova versione
viene distribuita con un audit log NAC3 esplicito.

### Fase 4 — governance

Il CoE aggiorna la sua checklist di revisione dei bot:
- Il bot punta solo a NAC id presenti nei manifest correnti.
- Il bot ha una whitelist esplicita di verbi per le operazioni sensibili.
- Il bot registra ogni dispatch nella tabella di audit.

## Costo di adozione

Per un CoE che gestisce 50 automazioni su 10 app target:

- Migrazione lato app: 6-8 settimane (un ingegnere per app).
- Riscrittura lato bot: 1-2 settimane per bot = 50-100 settimane-ingegnere.

Sembra costoso finché non si confronta con il costo a regime della
manutenzione di 50 bot basati su selettori a tempo indeterminato. Il break-even
si raggiunge tipicamente in 6-9 mesi; tutto ciò che segue è puro risparmio
di tempo degli ingegneri del CoE.

## Rischi e mitigazione

### Rischio — "l'app target rifiuta di adottare NAC3"

Comune nel software enterprise legacy. Mitigare tramite:

- Iniezione di `nac.js` lato client tramite un'estensione del browser
  gestita dal CoE o uno userscript in stile Tampermonkey.
- Definizione dei manifest lato CoE; l'app rimane invariata.
- Meno robusto dell'adozione first-party, ma transitoriamente
  praticabile.

### Rischio — "l'RPA aggira il controllo isTrusted"

Questo è il trade-off di sicurezza. L'RPA SINTETIZZERÀ i click. L'app
host deve inserire nella whitelist i verbi che l'RPA può attivare. Il CoE e
il team dell'app negoziano verbo per verbo. Documentare la negoziazione;
verificare la whitelist periodicamente.

### Rischio — "perdiamo visibilità sulla sequenza di azioni RPA"

Al contrario: con NAC3 si GUADAGNA visibilità. Ogni dispatch del bot genera
un evento canonico `nac:action:succeeded` con `{plugin, action_id, args, is_trusted}` strutturato. Registrarlo nel proprio SIEM
con la relativa policy di retention.

## Parallelo con il settore

Ciò che ARIA ha fatto per le tecnologie assistive (fornire ai lettori di schermo un contratto stabile sulla pagina), NAC3 lo fa per l'RPA e l'automazione agentiva. Il CoE passa da "manutentore di selettori" a "progettista di automazioni".

## Vedi anche

- [RPA_UIPATH.md](RPA_UIPATH.md), [RPA_AUTOMATION_ANYWHERE.md](RPA_AUTOMATION_ANYWHERE.md),
  [RPA_BLUE_PRISM.md](RPA_BLUE_PRISM.md) — guide di integrazione per piattaforma.
- [IMPACT_TESTING.md](IMPACT_TESTING.md) — analisi di impatto parallela per la dimensione test/QA.
- [SECURITY.md](../SECURITY.md) — threat model isTrusted da cui dipende la whitelist RPA.

## Licenza

Apache-2.0.

---

*This is a machine translation of the canonical English
version at `/nac-spec/guides/IMPACT_RPA.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
