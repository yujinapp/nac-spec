---
translation_source: SPEC.md
translation_source_hash: 5ebb8103746daf5bf7877b67ebb3a44cf98b4e2cba1fd8ba30093e0fce1b9b76
translation_quality: machine_v1
translation_lang: it
translation_date: 2026-05-11T12:55:43.753701+00:00
---

# NAC3 -- Native Agent Contract

**Version:** 2.2.0
**Status:** Stable
**License:** Apache-2.0
**Editor:** Yujin (yujin.app)

---

## 0. Scopo

NAC3 è un contratto tra le UI web e gli agenti che le governano.
Gli agenti includono runner vocali, intermediari LLM, bot RPA,
strumenti di accessibilità e runner di test end-to-end. Il contratto
specifica:

1. **Come vengono nominati gli elementi** -- in modo che un agente possa chiedere "clicca il
   pulsante salva" e risolverlo in un singolo nodo DOM.
2. **Come si applicano i verbi** -- in modo che un agente possa chiamare `NAC.click(id)`,
   `NAC.fill(id, value)`, `NAC.tab(plugin, key)`, ecc., senza
   codice di collegamento specifico per ogni app.
3. **Come viene segnalato il completamento** -- in modo che un agente sappia quando un
   passo è terminato, con una famiglia di eventi deterministica per ogni role.
4. **Come viene preservata la provenienza** -- in modo che un sistema a valle possa
   distinguere un click reale di un utente da uno sintetizzato.

NAC3 aggiunge un livello sottile sopra qualsiasi framework con cui già
esegui il rendering. Non sostituisce ARIA, React, Vue o il tuo design
system.

---

## 1. Role

Ogni elemento DOM rilevante per un agente porta `data-nac-role`. Le
role canoniche sono:

| Role | Significato | Esempio |
|------|-------------|---------|
| `plugin` | Un modulo UI autonomo (una pagina, un pannello, una raccolta di widget). | `<article data-nac-plugin="invoice">` |
| `section` | Un landmark all'interno di un plugin (header, body, footer, sidebar). | `<section data-nac-role="section">` |
| `region` | Un'area nominabile all'interno di una section (un cluster di card, una lista di risultati). | `<div data-nac-role="region">` |
| `action` | Un widget cliccabile che attiva un verbo (button, link-as-button). | `<button data-nac-role="action" data-nac-action="save">` |
| `field` | Un input che l'utente digita o attiva (testo, numero, checkbox, radio, data, file). | `<input data-nac-role="field">` |
| `option` | Un'opzione selezionabile all'interno di un field (figlio di combobox / select / radio group). | `<li data-nac-role="option">` |
| `tab` | Un selettore di pannello commutabile. **Obbligatorio quando `data-nac-id` corrisponde a `^tab\.`** | `<button data-nac-role="tab" data-nac-id="tab.lines">` |
| `breadcrumb-item` | Un elemento di navigazione breadcrumb. | `<a data-nac-role="breadcrumb-item">` |
| `accordion-toggle` | Un controllo espandi/comprimi. | `<button data-nac-role="accordion-toggle">` |
| `step` | Un indicatore di step in un wizard. | `<li data-nac-role="step">` |
| `pagination-item` | Un controllo di salto pagina in una lista paginata. | `<button data-nac-role="pagination-item">` |
| `confirm-button` | Un pulsante conferma/annulla all'interno di un dialog di conferma. | `<button data-nac-role="confirm-button">` |
| `sort-control` | Un'intestazione di colonna per l'ordinamento. | `<th data-nac-role="sort-control">` |
| `filter-control` | Un trigger di filtro per colonna. | `<button data-nac-role="filter-control">` |
| `data-table` | Un host per data-table (v2.1). | `<table data-nac-role="data-table">` |
| `navigation` | Una regione di navigazione landmark. **Non è un tab.** | `<nav data-nac-role="navigation">` |
| `confirm-dialog` | Il modal di una richiesta di conferma. | `<div data-nac-role="confirm-dialog">` |

Le role non presenti in questo elenco sono riservate per usi futuri. Un
runtime NAC-strict DOVREBBE rifiutare le role sconosciute al momento della
registrazione (v2.2). Un runtime NAC-permissive PUÒ trattare le role
sconosciute come `action` per compatibilità con versioni precedenti
(impostazione predefinita v1.9 e v2.0).

---

## 2. Nomi

Ogni elemento risolvibile da un agente porta `data-nac-id`. L'id è:

- **Un percorso puntato** (es. `deals.list.row.42.actions.delete`).
  I punti separano i livelli semantici; il runtime non li interpreta,
  ma gli esseri umani e gli LLM sì.
- **Globalmente univoco nell'ambito di un `data-nac-plugin`.** Due
  plugin diversi POSSONO condividere un id; il runtime risolve tramite
  la coppia `(plugin, id)`.
- **Stabile tra i re-render.** I framework che producono un nuovo id
  ad ogni render (hash casuali, contatori di istanza) violano il contratto.
- **Stabile tra le riprogettazioni della UI.** Un pulsante si sposta dalla toolbar
  a un dropdown; il suo id DEVE rimanere lo stesso.

Prefissi id riservati (v2.1):

| Prefisso | Riservato per |
|----------|---------------|
| `tab.` | Pulsanti tab. La role DEVE essere `tab`. |
| `modal.` | Elementi con scope modal. La role è quella del widget foglia. |
| `field.` | Abbreviazione per form field. La role DEVE essere `field` o `option`. |
| `confirm.` | Dialog di conferma. |

---

## 3. Verbi

Un elemento `data-nac-role="action"` PUÒ portare `data-nac-action="<verb>"`
che indica cosa fa. Il verbo è un identificatore snake-case in formato libero
concordato tra l'host e l'agente. Verbi comuni:

`save`, `cancel`, `submit`, `delete`, `edit`, `view`, `create`,
`approve`, `reject`, `send`, `download`, `upload`, `refresh`,
`expand`, `collapse`, `open`, `close`, `add_row`, `remove_row`.

`NAC.click_by_verb(plugin, verb)` risolve un verbo nell'action univoca
sotto quel plugin e la clicca. Più action che condividono lo stesso verbo
sotto un unico plugin costituiscono un errore manifesto (lint:
`duplicate_verb`).

---

## 4. Manifest

Ogni plugin PUÒ registrare un manifest tramite:

```js
NAC.register({
  plugin_slug: 'invoice',
  version:     '1.0.0',
  nac_version: '2.1',
  elements: [
    { id: 'invoice.save', role: 'action',
      actions: [{ verb: 'save', label_i18n: { es: 'Guardar', en: 'Save', ... } }],
      label_i18n: { es: 'Guardar factura', en: 'Save invoice', ... } },
    ...
  ],
  tabs: [
    { nac_id: 'tab.lines', label_i18n: { es: 'Lineas', en: 'Lines' } },
    ...
  ],
  fields: [
    { id: 'field.client_name', type: 'text', required: true,
      label_i18n: { es: 'Cliente', en: 'Customer' } },
    ...
  ],
  data_tables: [...]
});
```

Il manifest è la fonte di verità rivolta all'agente. Un intermediario LLM
che decide "l'utente ha detto 'guardar'" consulta il manifest del plugin,
trova il verbo `save` ed emette
`NAC.click_by_verb('invoice', 'save')`.

### 4.1 Campi obbligatori

- `plugin_slug` -- corrisponde a `data-nac-plugin` sull'elemento host.
- `nac_version` -- la versione di NAC3 con cui questo manifest dichiara di
  essere conforme. Il runtime rifiuta i manifest che dichiarano una versione
  superiore alla propria.

### 4.2 Campi opzionali

- `elements[]` -- il catalogo dei widget nominati. Ogni voce DEVE
  avere `id` e `role`.
- `tabs[]` -- un array separato di primo livello per i tab. Equivalente alle
  voci di `elements[]` con `role:'tab'`. Entrambe le forme sono valide.
- `fields[]`, `actions[]`, `kpis[]`, `data_tables[]` -- sotto-collezioni
  tipizzate; stessa semantica di `elements[]` filtrato per
  role. I demo scelgono la forma più leggibile per gli esseri umani.

### 4.3 i18n

Ogni `label_i18n` DEVE coprire tutte e 10 le locale NAC3:

```
es, en, pt, fr, ja, zh, hi, ar, de, it
```

`i18n_strict: 'permissive'` su `NAC.autoRegister.watch()` consente
una copertura parziale durante la migrazione brownfield; i manifest in
produzione dovrebbero includere tutte e 10 le locale.

---

## 5. API Pubblica

### 5.1 Imperativa

```ts
NAC.click(nac_id: string, opts?: ClickOpts): Promise<{ok: true}>
NAC.click_by_verb(plugin: string|null, verb: string, opts?): Promise<...>
NAC.fill(nac_id: string, value: string|number|boolean): Promise<...>
NAC.select(nac_id: string, value: string): Promise<...>
NAC.tab(plugin: string, tab_key: string): Promise<...>
NAC.tab_by_label(plugin: string|null, label: string): Promise<...>
NAC.go_to_section(nac_id: string): Promise<...>
NAC.drag_drop(source_id, target_id, opts?: {to_index?: number}): Promise<...>
NAC.set_mode(mode: 'modal'|'maximized'|'new_tab'|'new_window'): void
NAC.screenshot(): Promise<string>  // data URL
NAC.bindAction(el, handler, {plugin, action_id}): () => void  // v2.2
```

### 5.1.1 Helper di conformità (v2.2)

`NAC.bindAction(el, handler, ctx)` è il metodo conforme alle specifiche per
collegare un handler al click. Emette automaticamente `nac:action:succeeded` (o
`:failed`) al termine dell'esecuzione dell'handler (sincrono, con eccezione o Promise).
Restituisce una funzione di rimozione. Usare questo metodo al posto del grezzo
`addEventListener('click', ...)` ogni volta che l'host lo supporta;
il codice brownfield può continuare a emettere l'evento manualmente come in precedenza.

### 5.1.3 Editor di campo (v2.3 preview)

`NAC.edit_field(nac_id)` apre una modale che consente a un utente (o a un
agente per suo conto) di modificare qualsiasi campo di testo con strumenti in stile Word:

```ts
NAC.edit_field(nac_id: string): Promise<{ok:true}>
```

La modale si registra con `plugin_slug='nac_editor'` e i seguenti
verb richiamabili via NAC-3:

| Verb | Effetto |
|------|---------|
| `select_word` | seleziona la parola al cursore |
| `select_sentence` | seleziona la frase al cursore |
| `select_all` | ctrl-A all'interno dell'editor |
| `replace` | sostituisce la selezione con il testo fornito |
| `delete_selection` | rimuove la selezione corrente |
| `ai_correct_syntax` | invia il valore corrente all'intermediario LLM con il prompt di sistema "fix grammar + spelling, return only fixed text"; sostituisce il valore con la risposta |
| `save` | scrive nel campo sorgente, genera gli eventi input + change, chiude |
| `cancel` | annulla le modifiche, chiude |

Esc chiude (annulla). Ctrl/Cmd+Enter salva. Il clic sul backdrop della modale annulla.

La sezione 13 delle specifiche formalizzerà il contratto nella v2.3; il runtime v2.2
include un'implementazione di riferimento funzionante affinché gli adottanti possano
integrarlo già oggi. Disponibile su qualsiasi campo tramite:

```js
NAC.edit_field('invoice.client_name');
// oppure tramite intermediario:
NAC.click_by_verb('myplugin', 'edit_field', { nac_id: 'invoice.client_name' });
```

### 5.1.2 Flag di validazione strict (v2.2)

`NAC.STRICT_VALIDATION` (booleano, default `false` in v2.2). Quando
impostato a `true`, `NAC.register()` lancia un `Error` con `code='strict_validation'`
e un array `findings` in presenza di uno dei seguenti casi:

- `manifest_role_unknown` -- il ruolo di un'entry non appartiene all'insieme canonico.
- `tab_id_manifest_role_drift` -- l'id corrisponde a `^tab\.` ma il ruolo
  non è `'tab'`.
- `manifest_dom_role_mismatch` -- il `data-nac-role` dell'elemento DOM montato
  differisce dal ruolo dell'entry nel manifest.

Nella v2.3 il default diventerà `true`. Nella v3.0 il flag verrà rimosso
(la modalità strict sarà l'unica disponibile).

Tutti i metodi asincroni rigettano con un `NacError` il cui `code` è uno dei seguenti:

- `not_found` -- l'elemento/ruolo/verb indicato non è presente nel DOM.
- `invalid` -- la forma dell'argomento non è corretta.
- `timeout` -- l'effetto collaterale è stato inviato ma l'evento di ack di conformità
  non è arrivato entro 5 secondi. **Un timeout indica un vero fallimento**:
  l'handler potrebbe essersi bloccato, l'ack potrebbe non essere mai stato collegato,
  o si è verificata una race condition di rete. I chiamanti DEVONO trattare il timeout
  come un fallimento, salvo prova dell'effetto collaterale tramite un altro canale.

### 5.2 Introspezione

```ts
NAC.describe():    { active: string|null, plugins: PluginSnap[] }
NAC.describe_v2(): { v2_scope_entries: [...], sitemap: ..., data_tables: [...] }
NAC.manifest(plugin_slug: string): Manifest|null
NAC.validate_global(opts?: {probe?: boolean}): Findings[]
```

### 5.3 Tabelle dati (v2.1)

```ts
NAC.registerDataTable(spec: DataTableSpec): void
NAC.dt_add_row(table_id, values): {ok, row_id}
NAC.dt_remove_row(table_id, row_id): {ok}
NAC.dt_edit_cell(table_id, row_id, column, value): {ok} | {ok:false, error}
NAC.dt_set_cell(table_id, row, col, value): {ok} | {ok:false, error}
NAC.dt_select(table_id, target): {ok}
NAC.dt_commit(table_id): {ok, final_state} | {ok:false, errors:[...]}
NAC.dt_discard(table_id): {ok}
NAC.dt_state(table_id): TableState
NAC.dt_read_aggregate(table_id, agg_key, column): number|null
NAC.registerDataTableComputed(table_id, column, fn): void
```

Una tabella dati ha un `subkind`:

- `collection` -- righe ordinate con commit transazionale opzionale.
  Usata per righe di fattura, articoli del carrello, voci di log.
- `matrix` -- griglia riga x colonna in cui ogni cella contiene un valore.
  Usata per matrici di permessi, griglie di pianificazione.
- `matrix-singletree` -- matrix in cui ogni riga si espande in un
  albero (raro).

---

## 6. Eventi

Ogni azione emette un evento di completamento deterministico. Il metodo
`NAC.click()` del runtime attende questo evento e si risolve quando viene emesso.

| Ruolo | Evento di successo | Evento di fallimento |
|-------|--------------------|----------------------|
| `action` | `nac:action:succeeded` | `nac:action:failed` |
| `field` | `nac:field:changed` | -- |
| `option` | `nac:field:changed` | -- |
| `tab` | `nac:tab:activated` | -- |
| `breadcrumb-item` | `nac:breadcrumb:navigated` | -- |
| `accordion-toggle` | `nac:accordion:expanded` / `:collapsed` | -- |
| `step` | `nac:step:advanced` | -- |
| `pagination-item` | `nac:table:page_changed` | -- |
| `confirm-button` | `nac:confirm:resolved` / `:cancelled` | -- |
| `sort-control` | `nac:table:sort_changed` | -- |
| `filter-control` | `nac:table:filter_changed` | -- |

### 6.1 Struttura del detail dell'evento

Il detail di ogni evento contiene il campo id canonico più `plugin`:

```js
nac:action:succeeded {
  detail: { plugin: 'invoice', action_id: 'invoice.save', ... }
}
nac:tab:activated {
  detail: { plugin: 'invoice_edit_modal', tab_id: 'tab.lines', ... }
}
nac:field:changed {
  detail: { plugin: 'invoice', field_id: 'field.client_name',
            value: 'Acme Corp', ... }
}
```

### 6.2 Emissione dall'handler dell'host

Un handler al click DEVE emettere il corrispondente evento di successo dopo
il proprio effetto collaterale sincrono:

```js
button.addEventListener('click', function (ev) {
  // ... esegui il lavoro ...
  document.dispatchEvent(new CustomEvent('nac:action:succeeded', {
    detail: { plugin: 'invoice', action_id: 'invoice.save' }
  }));
});
```

Se il lavoro è asincrono, emettere dopo la risoluzione. In caso di errore,
emettere `nac:action:failed` con `{detail: {plugin, action_id,
error: <messaggio>}}`.

Il runtime v2.2 fornirà `NAC.bindAction(el, handler, ctx)`
che incapsula `addEventListener` ed emette automaticamente.

### 6.3 Perché non usare l'evento click stesso?

Un evento DOM `click` viene emesso prima che l'handler venga eseguito. Il contratto
di NAC3 richiede di sapere quando **l'effetto collaterale è completato**, non quando
il click è iniziato. Da qui la famiglia di eventi separata.

---

## 7. Provenienza

### 7.1 isTrusted

`event.isTrusted` è `true` per i click avviati dall'utente (mouse reale,
pressione di tasto reale, attivazione tramite screen reader) e `false` per
i click sintetici (`element.click()`, dispatchEvent di un MouseEvent
costruito manualmente, automazione).

NAC3 DEVE esporre questo valore tramite `event.detail.is_trusted` nell'evento
di successo. Gli host che eseguono azioni sensibili alla sicurezza
(pagamento, eliminazione) POSSONO richiedere `is_trusted === true` e rifiutare
i click sintetici. La demo di riferimento `example-v20-full.php`
include una coppia di pulsanti (`v20_panel.istrusted_real` e
`v20_panel.istrusted_fake`) che illustra la distinzione.

### 7.2 Manifest firmati con HMAC

Un manifest PUÒ contenere un blocco `provenance`:

```js
NAC.set_provenance_secret('your-tenant-secret');
NAC.register({
  plugin_slug: 'invoice',
  ...,
  provenance: {
    signed_at: '2026-05-09T10:00:00Z',
    signed_by: 'tenant-X',
    signature: '<HMAC-SHA256 of manifest body>'
  }
});
```

Il runtime calcola l'HMAC atteso su una serializzazione stabile
del manifest (esclusa la firma stessa) e rifiuta i manifest la cui
firma non corrisponde. Utilizzato nelle distribuzioni multi-tenant
per impedire a un tenant di falsificare il manifest di un altro tenant.

### 7.3 Modello di minaccia

Consultare `SECURITY.md` per il modello di minaccia completo. Versione sintetica:

- NAC3 non autentica l'**utente**. Questo è compito del tuo livello di autenticazione.
- NAC3 autentica il **manifest** (HMAC).
- NAC3 distingue i click reali da quelli sintetici
  (isTrusted), così un host può rifiutare questi ultimi per operazioni sensibili.
- NAC3 non protegge da un agente malevolo che opera con accesso a livello utente.
  Un tale agente può fare tutto ciò che l'utente può fare.

---

## 8. Livelli di conformità

Una pagina è **conforme a NAC-1** se:

- Ogni widget cliccabile che un agente deve poter azionare
  porta `data-nac-id` e `data-nac-role`.
- Ogni elemento con `data-nac-role="action"` emette
  `nac:action:succeeded` dopo il suo effetto collaterale.
- La pagina registra almeno un manifest di plugin tramite
  `NAC.register()`.
- `NAC.click(id)` funziona per ogni id dichiarato.

Una pagina è **conforme a NAC-2** se inoltre:

- Registra gli array `tabs[]`, `fields[]`, `actions[]` esplicitamente
  nel proprio manifest (non inferiti dal DOM).
- Fornisce `label_i18n` che copre tutte le 10 locale NAC3 per ogni
  etichetta visibile all'utente.
- Implementa le primitive brownfield v2.0: scope tree,
  ephemeral capture, autoRegister.watch.
- Supera `NAC.validate_global({probe: false})` con zero
  risultati di severità `error`.

Una pagina è **conforme a NAC-3** se inoltre:

- Porta manifest firmati con HMAC.
- Distingue `isTrusted` per le operazioni sensibili alla sicurezza.
- Supera `NAC.validate_global({probe: true})` con zero
  risultati.

Il CLI del pacchetto NPM (`npx @nac3/runtime validate <url>`) riporta
il livello più alto raggiunto dalla pagina.

---

## 9. Versionamento

NAC3 segue il semver:

- Incremento **Major**: modifica incompatibile all'API pubblica o ai formati wire.
  Gli adottanti devono modificare il codice.
- Incremento **Minor**: nuove funzionalità, compatibili con le versioni precedenti.
  Il codice esistente continua a funzionare.
- Incremento **Patch**: correzioni di bug, modifiche solo alla documentazione.

Politica di deprecazione: una funzionalità contrassegnata come `@deprecated` nella versione
`X.Y.0` viene rimossa non prima di `(X+1).0.0`. Le note di rilascio
documentano ogni rimozione in modo esplicito.

La versione del pacchetto NPM rispecchia la versione della specifica: `@nac3/runtime@2.1.3`
implementa NAC3 v2.1 con tre revisioni patch.

---

## 10. Validatori

### 10.1 Runtime: `NAC.validate_global()`

Analizza il DOM live, i manifest registrati e il catalogo i18n,
e restituisce un array di risultati:

```ts
{
  severity: 'error' | 'warn' | 'info',
  code:     string,                     // e.g. 'tab_role_drift'
  nac_id:   string | null,
  message:  string,
  detail:   Record<string, any>
}
```

I codici dei risultati sono stabili tra le release patch; nuovi codici compaiono
solo negli incrementi minor.

### 10.2 CLI: `npx @nac3/runtime validate <target>`

Racchiude `validate_global` più un lint statico della coerenza HTML/manifest.
Codici di uscita:

- `0` -- nessun risultato con severità >= soglia configurata.
- `1` -- risultati presenti.
- `2` -- il target non è riuscito a caricarsi.

Utile in CI: `npx @nac3/runtime validate ./dist/index.html
--severity=error`.

---

## 11. Il sistema attorno a NAC3

NAC3 è uno strato contrattuale. Per trasformare una pagina conforme a NAC
in un'app a controllo vocale, sono necessari anche:

1. **Una sorgente speech-to-text** (browser SpeechRecognition,
   Whisper API, ecc.).
2. **Un intermediario LLM** che riceve il testo dell'utente, lo snapshot
   `NAC.describe()` della pagina e un suggerimento i18n, e produce azioni strutturate:
   `[{kind: 'click', nac_id: 'X'}, {kind: 'fill', nac_id:
   'Y', value: 'Z'}]`. Vedere `guides/LLM_WIRING.md`.
3. **Un client di chat** che gestisce la conversazione e invia
   le azioni. Il riferimento è `js/nac-chat-client.js`.
4. **Un sink text-to-speech** per le risposte vocali (browser
   SpeechSynthesis, ElevenLabs, ecc.).

NAC3 standardizza solo la forma di input/output del passaggio 2 (lo
snapshot `NAC.describe()` e la forma delle azioni). I passaggi 1, 3 e 4 sono
al di fuori della specifica; puoi comporre ciò che preferisci.

---

## 12. Garanzie di stabilità

Ciò che questa specifica promette:

1. L'insieme dei ruoli canonici nella sezione 1 non si ridurrà.
   Nuovi ruoli POSSONO essere aggiunti nelle versioni minor.
2. La famiglia di eventi nella sezione 6 non verrà rinominata.
   Nuovi eventi POSSONO essere aggiunti nelle versioni minor.
3. I verbi di `NAC.click`, `NAC.fill`, ecc. non cambieranno
   forma nelle versioni minor. Nuovi campi opzionali `opts` POSSONO comparire.
4. I codici dei risultati di `validate_global` non verranno riutilizzati per
   condizioni diverse nelle versioni minor.

Ciò che questa specifica NON promette:

1. La formulazione precisa dei messaggi di errore (sono stringhe del catalogo i18n;
   le localizzazioni possono variare).
2. La strategia DOM per trovare gli elementi (`querySelector` oggi;
   potrebbe passare a un indice più veloce in futuro).
3. Il layout interno della cache dei manifest. Tratta i manifest come
   in sola scrittura dal lato host, in sola lettura dal lato agente.

---

## 13. Questioni aperte (tracciate separatamente)

- `data-nac-role="navigation"` dovrebbe mai risolversi in un tab?
  Attualmente no (v2.1). La roadmap v22 propone un rifiuto più rigoroso.
- `NAC.click()` dovrebbe accettare id relativi (es. `'./save'` per
  intendere "save sotto il plugin attivo")? Non in v2.1; possibilmente in v2.3.
- I manifest dovrebbero supportare ereditarietà/estensione tra plugin
  (un manifest base esteso da un tenant)? Tracciato come candidato per v3.0.

---

## 13.5 Governance

NAC3 è attualmente gestito da Yujin. La specifica è pubblicata
sotto licenza Apache 2.0; il runtime di riferimento sotto MIT. Yujin
si impegna a trasferire NAC3 a una fondazione neutrale (gruppo comunitario W3C,
Linux Foundation o organismo industriale equivalente) qualora e
quando l'adozione giustifichi una governance neutrale. Nel frattempo, le modifiche
alla specifica seguono il processo RFC documentato in
`CONTRIBUTING.md`, con un periodo di commento pubblico di almeno 14
giorni per qualsiasi modifica che influisca sull'API pubblica o sui formati wire.

Adottanti: la combinazione di licenze Apache 2.0 + MIT garantisce
che la specifica e il runtime sopravvivano a qualsiasi cambiamento nello
stato societario di Yujin. Puoi fare il fork di entrambi, eseguirli ed includerli
nei tuoi prodotti, oggi e dopo che non saremo più operativi. Questo documento registra
l'impegno affinché il percorso verso tale sopravvivenza sia esplicito, non implicito.

---

## 14. Implementazione di riferimento

L'implementazione canonica è il runtime di riferimento distribuito
come pacchetto NPM `@nac3/runtime`. Il runtime è completo di funzionalità
per v2.1 e include:

- `js/nac.js` -- base v1.9 + l'API pubblica della sezione 5.
- `js/nac-v2-extensions.js` -- le primitive brownfield v2.0
  (scope tree, capture ephemeral, autoRegister, HMAC, isTrusted).
- `js/nac-chat-client.js` -- un client di chat di riferimento che collega
  voce, LLM e dispatcher.

Altre implementazioni sono benvenute (Python per runner di automazione nativi,
Rust per agenti embedded, ecc.). La specifica, non il codice JS,
è l'autorità.

---

*Questo documento è la specifica canonica NAC3 v2.1. Le modifiche a
questo file costituiscono cambiamenti alla specifica e richiedono un RFC; vedere
`CONTRIBUTING.md`.*

---

*This is a machine translation of the canonical English
version at `/nac-spec/SPEC.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
