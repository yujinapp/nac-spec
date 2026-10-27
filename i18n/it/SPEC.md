---
translation_source_hash: 13f2725d22ba29c84ddfdf58bac800d547f968b0f393d5cd9285cf1e2d4d0a0a
translation_quality: machine_v1
translation_date: 2026-10-27
translation_engine: anthropic/claude-opus-5 (Yujin Forge)
translation_normative: false
translation_status: complete
translation_lang: it
translation_source: SPEC.md
translation_source_version: 2.5.1
translation_source_date: 2026-10-27
translation_sections: 83
translation_sections_canonical: 83
translation_units: 282
translation_units_canonical: 282
translation_canonical_url: /nac-spec/SPEC.html
---

<!-- translation-banner: produced by scripts/build-translation-banners.mjs -->

> **Traduzione automatica, non normativa.** Traduce la versione inglese come era il 2026-10-27 (NAC3 v2.5.1) e copre 83 delle 83 sezioni dell'originale di oggi. Il testo normativo è l'inglese: in caso di divergenza tra questa traduzione e l'inglese, prevale l'inglese.
>
> *Non-normative machine translation. The normative text of NAC3 is the English one.*
>
> [Leggere il testo normativo in inglese](/nac-spec/SPEC.html)

<!-- /translation-banner -->

# NAC3 -- Native Agent Contract

**Versione:** 2.5.1 (stabile -- la superficie v2.5 completa: narrate, context+tree, expect+diff)
**Stato:** Versione stabile. Il dist-tag npm `latest` punta qui; la sezione 9.1 dice che cosa garantisce e che cosa non garantisce una prerelease. Questo documento dichiara la propria versione in esattamente un posto, la riga qui sopra. Gli RFC pubblicati e le loro prove di Livello 2 + Livello 3 sono elencati in `README.md` e `runtime/CHANGELOG.md`.
**Licenza:** Apache-2.0
**Curatore:** Yujin (yujin.app)

---

## 0. Scopo

NAC3 è un contratto fra le interfacce web e gli agenti che le
guidano. Fra gli agenti ci sono gli esecutori vocali, gli intermediari
LLM, i bot RPA, gli strumenti di accessibilità e gli esecutori di test
end-to-end. Il contratto specifica:

1. **Come vengono nominati gli elementi** -- perché un agente possa
   chiedere "fai clic sul pulsante salva" e risolverlo a un unico nodo
   del DOM.
2. **Come si applicano i verbi** -- perché un agente possa chiamare
   `NAC.click(id)`, `NAC.fill(id, value)`, `NAC.tab(plugin, key)`,
   ecc., senza collante per applicazione.
3. **Come viene segnalato il completamento** -- perché un agente sappia
   quando un passo è finito, con una famiglia di eventi deterministica
   per ruolo.
4. **Come viene preservata la provenienza** -- perché un sistema a
   valle possa distinguere un clic reale dell'utente da uno
   sintetizzato.

NAC3 aggiunge uno strato sottile sopra il framework con cui già
renderizzi. Non sostituisce ARIA, React, Vue né il tuo design system.

---

## 1. Ruoli

Ogni elemento del DOM rilevante per un agente porta `data-nac-role`. I
ruoli canonici sono:

| Ruolo | Significato | Esempio |
|------|---------|---------|
| `plugin` | Un modulo di interfaccia autonomo (una pagina, un pannello, un insieme di widget). | `<article data-nac-plugin="invoice">` |
| `section` | Un punto di riferimento dentro un plugin (intestazione, corpo, piè di pagina, barra laterale). | `<section data-nac-role="section">` |
| `region` | Un'area nominabile dentro una sezione (un gruppo di schede, un elenco di risultati). | `<div data-nac-role="region">` |
| `action` | Un widget cliccabile che innesca un verbo (pulsante, link usato come pulsante). | `<button data-nac-role="action" data-nac-action="save">` |
| `field` | Un input che l'utente digita o commuta (testo, numero, casella, radio, data, file). | `<input data-nac-role="field">` |
| `option` | Un'opzione selezionabile dentro un campo (figlio di combobox / select / gruppo di radio). | `<li data-nac-role="option">` |
| `tab` | Un selettore di pannello commutabile. **Obbligatorio quando `data-nac-id` corrisponde a `^tab\.`** | `<button data-nac-role="tab" data-nac-id="tab.lines">` |
| `breadcrumb-item` | Un salto del percorso di navigazione. | `<a data-nac-role="breadcrumb-item">` |
| `accordion-toggle` | Un controllo di espansione/chiusura. | `<button data-nac-role="accordion-toggle">` |
| `step` | Un indicatore di passo di una procedura guidata. | `<li data-nac-role="step">` |
| `pagination-item` | Un controllo di salto pagina in un elenco paginato. | `<button data-nac-role="pagination-item">` |
| `confirm-button` | Un pulsante conferma/annulla dentro una finestra di conferma. | `<button data-nac-role="confirm-button">` |
| `sort-control` | Un'intestazione di colonna che ordina. | `<th data-nac-role="sort-control">` |
| `filter-control` | Un innesco di filtro di colonna. | `<button data-nac-role="filter-control">` |
| `data-table` | L'host di una tabella di dati (dalla 2.1). | `<table data-nac-role="data-table">` |
| `navigation` | Una regione di navigazione di riferimento. **Non è una scheda.** | `<nav data-nac-role="navigation">` |
| `confirm-dialog` | La finestra modale di una richiesta di conferma. | `<div data-nac-role="confirm-dialog">` |
| `draggable` | Un elemento che l'utente può prendere e spostare (dalla 1.6.2). | `<li data-nac-role="draggable">` |
| `drop-target` | Un posto dove un `draggable` può essere rilasciato (dalla 1.6.2). | `<ul data-nac-role="drop-target">` |
| `button` | **Tollerato, non raccomandato.** Un pulsante legacy che deve solo essere cliccabile, senza contratto d'azione. Il runtime lo tratta come `action`. Preferisci `action` con un `data-nac-action` esplicito. | `<button data-nac-role="button">` |

I ruoli fuori da questo elenco sono riservati per usi futuri. Un
runtime NAC-strict DOVREBBE rifiutare i ruoli sconosciuti al momento
della registrazione (v2.2). Un runtime NAC-permissive PUÒ trattare i
ruoli sconosciuti come `action` per compatibilità con il passato (il
comportamento predefinito in v1.9 e v2.0).

Questa tabella è l'elenco normativo, ed è pubblicata come dato: il
catalogo leggibile da una macchina in `api/latest/contract.json` porta
tutti i ruoli che il runtime di riferimento accetta, ciascuno marcato
con `declared_in_spec_table` perché i due elenchi si possano
confrontare senza leggere prosa. Coincidono alla v2.5. Ogni divergenza
futura è visibile in quel marcatore, invece di restare nascosta in una
differenza di opinione fra un documento e un'implementazione.

---

## 2. Nomi

Ogni elemento risolvibile da un agente porta `data-nac-id`. L'id è:

- **Un percorso con punti** (per esempio
  `deals.list.row.42.actions.delete`). I punti separano livelli
  semantici; il runtime non li interpreta, ma le persone e gli LLM sì.
- **Univoco a livello globale dentro l'ambito di un
  `data-nac-plugin`.** Due plugin diversi POSSONO condividere un id; il
  runtime risolve per la coppia `(plugin, id)`.
- **Stabile fra un render e l'altro.** I framework che producono un id
  nuovo a ogni render (hash casuali, contatori di istanza) rompono il
  contratto.
- **Stabile fra le riprogettazioni dell'interfaccia.** Un pulsante
  passa dalla barra degli strumenti a un menu a tendina; il suo id DEVE
  restare lo stesso.

Prefissi di id riservati (dalla 2.1):

| Prefisso | Riservato per |
|--------|--------------|
| `tab.` | Pulsanti di scheda. Il ruolo DEVE essere `tab`. |
| `modal.` | Elementi con ambito modale. Il ruolo è quello del widget foglia. |
| `field.` | Forma abbreviata di un campo di modulo. Il ruolo DEVE essere `field` oppure `option`. |
| `confirm.` | Finestre di conferma. |

---

## 3. Verbi

Un elemento con `data-nac-role="action"` PUÒ portare
`data-nac-action="<verb>"` che nomina ciò che fa. Il verbo è un
identificatore libero in snake-case concordato fra host e agente. Verbi
comuni:

`save`, `cancel`, `submit`, `delete`, `edit`, `view`, `create`,
`approve`, `reject`, `send`, `download`, `upload`, `refresh`,
`expand`, `collapse`, `open`, `close`, `add_row`, `remove_row`.

`NAC.click_by_verb(plugin, verb)` risolve un verbo all'unica azione
sotto quel plugin e ci fa clic. Che più azioni condividano lo stesso
verbo sotto un unico plugin è un errore di manifesto (lint:
`duplicate_verb`).

---

## 4. Manifesto

Ogni plugin PUÒ registrare un manifesto tramite:

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

Il manifesto è la fonte di verità rivolta all'agente. Un intermediario
LLM che decide che "l'utente ha detto 'guardar'" consulta il manifesto
del plugin, trova il verbo `save` ed emette
`NAC.click_by_verb('invoice', 'save')`.

### 4.1 Campi obbligatori

- `plugin_slug` -- corrisponde al `data-nac-plugin` dell'elemento host.
- `nac_version` -- la versione di NAC3 con cui questo manifesto
  dichiara di essere conforme. Il runtime rifiuta i manifesti che
  dichiarano una versione più alta della propria.

### 4.2 Campi facoltativi

- `elements[]` -- il catalogo dei widget con nome. Ogni voce DEVE avere
  `id` e `role`.
- `tabs[]` -- un array di primo livello separato, per le schede.
  Equivale a voci di `elements[]` con `role:'tab'`. Entrambe le forme
  sono valide.
- `fields[]`, `actions[]`, `kpis[]`, `data_tables[]` --
  sottocollezioni tipizzate; stessa semantica di `elements[]` filtrato
  per ruolo. Le demo scelgono la forma che si legge meglio per una
  persona.

### 4.3 i18n

Ogni `label_i18n` DEVE coprire tutte le 10 locale di NAC3:

```
es, en, pt, fr, ja, zh, hi, ar, de, it
```

`i18n_strict: 'permissive'` su `NAC.autoRegister.watch()` ammette una
copertura parziale durante una migrazione brownfield; i manifesti di
produzione dovrebbero pubblicare tutte le 10 locale.

#### 4.3.1 Su che cosa ricade il requisito delle dieci locale

Il requisito qui sopra ricade sul **manifesto di chi adotta**: la mappa
`label_i18n` che un agente legge per nominare un elemento nella lingua
dell'utente. NON ricade sulla lingua di questo documento, e niente in
NAC3 obbliga un'implementazione a pubblicare la propria documentazione
in dieci lingue.

#### 4.3.2 Lingua normativa di questa specifica

Il testo normativo di NAC3 è quello **inglese**: il `SPEC.md` nella
radice del repository della specifica, reso in
`https://yujin.app/nac-spec/SPEC.html`.

La specifica è pubblicata anche come traduzioni automatiche sotto
`i18n/<locale>/SPEC.md`. Quelle traduzioni sono **non normative**.
Ognuna è parziale e ognuna è congelata alla revisione di origine che il
suo stesso cartello dichiara; il cartello è obbligatorio, e una
traduzione pubblicata che non porta il cartello è un difetto della
pubblicazione, non della traduzione. Quando una traduzione e il testo
inglese non concordano, vale il testo inglese, e una dichiarazione di
conformità è una dichiarazione rispetto al testo inglese.

---

## 5. API pubblica

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

### 5.1.1 Aiuto alla conformità (v2.2)

`NAC.bindAction(el, handler, ctx)` è il modo conforme alla specifica di
collegare un gestore di clic. Emette `nac:action:succeeded` (oppure
`:failed`) automaticamente dopo l'esecuzione del gestore (sincrono, con
eccezione o Promise). Restituisce una funzione per scollegarlo. Usalo
invece di un `addEventListener('click', ...)` nudo ogni volta che
l'host lo permette; il codice brownfield può continuare a emettere
l'evento a mano come prima.

### 5.1.3 Editor di campo (v2.3)

`NAC.edit_field(nac_id)` apre una finestra modale che permette a una
persona (o a un agente a suo nome) di modificare qualsiasi campo di
testo con strumenti in stile elaboratore di testi:

```ts
NAC.edit_field(nac_id: string): Promise<{ok:true}>
```

La finestra si registra sotto `plugin_slug='nac_editor'` con questi
verbi invocabili da NAC3:

| Verbo | Effetto |
|------|--------|
| `select_word` | selezionare la parola dove sta il cursore |
| `select_sentence` | selezionare la frase dove sta il cursore |
| `select_all` | ctrl-A dentro l'editor |
| `replace` | sostituire la selezione con il testo dato |
| `delete_selection` | rimuovere la selezione corrente |
| `ai_correct_syntax` | fare POST del valore corrente all'intermediario LLM con il prompt di sistema "fix grammar + spelling, return only fixed text"; sostituire il valore con la risposta |
| `save` | riscrivere nel campo di origine, inviare gli eventi input e change, chiudere |
| `cancel` | scartare, chiudere |

Esc chiude (annulla). Ctrl/Cmd+Invio salva. Un clic sullo sfondo
dell'overlay annulla.

La sezione 13 della specifica formalizzerà il contratto nella v2.3; il
runtime v2.2 pubblica un'implementazione di riferimento funzionante
perché chi adotta possa collegarla già oggi. Disponibile su qualsiasi
campo tramite:

```js
NAC.edit_field('invoice.client_name');
// or by intermediary:
NAC.click_by_verb('myplugin', 'edit_field', { nac_id: 'invoice.client_name' });
```

### 5.1.4 Payload dell'azione + invoke (v2.3)

Le azioni di NAC v2.2 sono del tipo clic-e-via: un agente innesca
`NAC.click(id)` oppure `NAC.click_by_verb(plugin, verb)` e l'host fa
quello che fa. Funziona per le azioni di verbo e stato (`save`,
`cancel`, `submit`, `delete`) ma crolla quando un'azione ha bisogno di
**dati** dall'agente -- `utter(text)`, `search(query)`,
`send_message(body)`, `upload(file)`, `schedule(date)`,
`translate(text, target_lang)`. L'host non ha modo di ricevere il
payload dell'agente tramite un clic sintetico.

La v2.3 chiude quel buco. Il contratto è additivo: i verbi in stile
clic continuano a funzionare senza cambiamenti.

```ts
NAC.invoke(action_id: string, payload: object, opts?: { timeout?: number })
  : Promise<{ok: true, request_id: string, ack: object|null}>

NAC.utter(action_id: string,
          opts: { text: string, lang?: string, voice?: string, metadata?: object })
  : Promise<{ok: true, request_id: string, ack: object|null}>
```

`NAC.invoke` invia un `CustomEvent` `nac:action:requested`
sull'elemento host (risale fino a document) con:

```ts
detail: {
  action_id:  string,    // canonical nac_id of the host element
  verb:       string,    // payload.verb || el's data-nac-action
  payload:    object,    // arbitrary, action-specific
  plugin:     string|null,
  request_id: string,    // correlation token assigned by the runtime
  ts:         number,    // Date.now()
}
```

L'host ascolta `nac:action:requested`, elabora il payload ed emette
`nac:action:succeeded` (oppure `nac:action:failed`) con lo stesso
`request_id` nel dettaglio. Il runtime correla per `request_id` e
risolve la Promise dell'agente.

Il timeout predefinito è di **30 secondi** (contro 5 s per il clic). Si
cambia con `opts.timeout`. Alla scadenza la Promise viene rifiutata con
`NacError('timeout', ...)`. Come per il clic, una scadenza significa un
fallimento reale: chi chiama DEVE trattarla come tale, a meno che non
abbia la prova dell'effetto per un altro canale.

`NAC.utter(id, opts)` è la scorciatoia ergonomica per il verbo con
payload più comune. Equivale a:

```js
NAC.invoke(id, { verb: 'utter', text: opts.text, lang: opts.lang });
```

#### Dichiarazione nel manifesto

Un'azione che porta un payload dichiara lo schema di quel payload nella
sua voce di manifesto, per tracciabilità e per gli strumenti:

```js
NAC.register({
  plugin_slug: 'atlas_pro_ad',
  version:     '2.1.0',
  nac_version: '2.3',
  elements: [
    { id: 'atlas_pro_ad.mic', role: 'action',
      actions: [
        { verb: 'listen' },
        { verb: 'utter',
          payload_schema: {
            text: { type: 'string', required: true, max: 4000 },
            lang: { type: 'string',
                    enum: ['en','es','pt','fr','it','de','ja','zh','hi','ar'] }
          },
          label_i18n: { es:'Decir', en:'Utter', /* ... 10 locales */ } }
      ],
      label_i18n: { /* ... */ } }
  ]
});
```

`payload_schema` è **informativo alla v2.5**, e il runtime di
riferimento non lo legge affatto: il campo viene accettato in un
manifesto, viaggia in `NAC.manifest()` e non viene mai validato contro
nulla. `NAC.STRICT_VALIDATION` -- il cui valore predefinito è
effettivamente passato a `true` nella 2.3.0 -- copre soltanto i
riscontri di ruolo del manifesto e del DOM; non ha mai coperto i
payload. Quindi un agente NON DEVE supporre che un payload sia stato
verificato perché è stato dichiarato uno schema: oggi l'unica
validazione che avviene è quella che fa l'agente prima di inviare.

Gli schemi sono volutamente semplici (un sottoinsieme con la forma di
JSON-Schema) perché un runtime possa validare senza imbarcare un
validatore JSON-Schema completo, e quella resta l'intenzione di
progetto per quando il requisito verrà applicato.

Una revisione precedente di questa sezione prometteva, per la versione
2.4, di formalizzare la grammatica dello schema e di renderne
obbligatoria l'applicazione. **Non è avvenuto nella 2.4 e non è
avvenuto fino alla 2.5.** La frase viene rimossa invece di essere
ridatata: una promessa con un numero di versione attaccato, lasciata in
piedi oltre quella versione, per un agente si legge come una capacità
su cui può contare. Formalizzare la grammatica e collegare
l'applicazione è tracciato come domanda aperta nella sezione 13, dove
risulta aperta e senza data.

#### Semantica dello stato disabilitato (correzione v2.3 arrivata da alpha.2)

`NAC.invoke` NON rifiuta quando l'elemento di destinazione ha impostato
`disabled` oppure `aria-disabled='true'`. L'attributo HTML `disabled` è
una protezione del clic a livello di interfaccia; `invoke` è una
richiesta logica che porta un payload, non un clic sintetico. Gli host
che hanno bisogno di rifiutare un invoke in base allo stato
dell'interfaccia DEVONO farlo nel loro ascoltatore di
`nac:action:requested` ed emettere `nac:action:failed` con un codice di
errore che significhi qualcosa.

`NAC.click`, al contrario, rifiuta ANCORA sugli elementi disabilitati
(la semantica del clic è preservata). Copertura di test:
`runtime/test/v23-invoke.mjs` T7/T8/T9.

#### Conformità: gli host che supportano invoke DEVONO

1. Dichiarare `actions[].payload_schema` nella voce del manifesto.
2. Ascoltare `nac:action:requested` (oppure usare un ascoltatore
   generico che filtri per `detail.action_id` + `detail.verb`).
3. Emettere `nac:action:succeeded` -- con `detail.request_id`
   restituito uguale -- dopo l'elaborazione, oppure
   `nac:action:failed` (con il codice in `detail.error`) in caso di
   fallimento.
4. MAI emettere un evento `:succeeded` con un `request_id` che non
   hanno ricevuto (evita l'incrocio fra invocazioni concorrenti).

Gli host che NON supportano invoke continuano a funzionare normalmente
con `NAC.click()` e `NAC.click_by_verb()`. Gli agenti che chiamano
`NAC.invoke()` contro un host senza una voce
`actions[].payload_schema` riceveranno comunque un `request_id`, ma il
runtime non può garantire la consegna; il timeout scatta dopo 30 s.

#### Perché questo conta

L'intera superficie agentica smette di essere "un elenco di pulsanti" e
diventa "un elenco di pulsanti + input strutturati". Un annuncio vocale
diventa invocabile con NAC.invoke. Una barra di ricerca diventa
invocabile con NAC.invoke. Un caricamento di file diventa invocabile con
NAC.invoke. Stesso protocollo, stessa provenienza, stessa semantica di
conferma.

Il primo adottante di riferimento è **Atlas Pro**: il suo elemento
`atlas_pro_ad.mic` dichiara sia il verbo `listen` (solo clic, quello
che già c'era) sia `utter` (con payload). Lo stesso ciclo
conversazionale di `/parse` + `/tts` guida in entrambi i casi; gli
agenti che hanno il riconoscimento vocale chiamano `listen`, quelli che
hanno un proprio modello linguistico chiamano `utter`.

#### Modalità future (previste, senza cambio di specifica)

`invoke` è volutamente agnostico rispetto alla modalità, perché le
famiglie di input che arriveranno si innestino senza rompere il
contratto:

| Modalità | Verbo (bozza)         | Payload (bozza)                                  |
|----------|-----------------------|--------------------------------------------------|
| Testo    | `utter`               | `{text, lang?}`                                  |
| Ricerca  | `search`              | `{query, scope?, limit?}`                        |
| File     | `upload`              | `{filename, mime, data_url \| stream_id}`        |
| Immagine | `analyze_image`       | `{image_url \| data_url, prompt?}`               |
| Video    | `analyze_stream`      | `{stream_url, frame_window_ms?, return?}`        |
| Agenda   | `schedule`            | `{datetime, duration_min, attendees?}`           |
| Codice   | `apply_diff`          | `{file_path, unified_diff}`                      |
| Voce     | `transcribe`          | `{audio_url \| data_url, lang?}`                 |

Ogni modalità segue lo stesso protocollo di eventi
`nac:action:requested` -> `nac:action:succeeded` / `:failed`, la stessa
correlazione per `request_id`, la stessa semantica di timeout. Il
runtime resta piccolo; il vocabolario dei verbi cresce per convenzione
fra host e agenti. Le scorciatoie ergonomiche (`NAC.utter`,
`NAC.search`, `NAC.watch`, ecc.) si possono aggiungere più tardi senza
rispecificare nulla, perché ognuna è un involucro sottile sopra
`invoke`.

### 5.1.5 Risoluzione nello shadow DOM -- radici aperte (v2.3)

Il runtime risolve i riferimenti `data-nac-id` attraverso le radici
shadow aperte, in modo ricorsivo. Una pagina può montare Web Components
con `attachShadow({mode:'open'})`, mettere attributi `data-nac-*` su
elementi dentro l'albero shadow, e qualsiasi chiamante NAC3
(`NAC.click`, `NAC.fill`, `NAC.invoke`, ecc.) risolve la destinazione
in modo trasparente.

#### Algoritmo di risoluzione

Per un selettore `S` (tipicamente `[data-nac-id="..."]`) contro una
radice `R` (tipicamente `document`):

1. `R.querySelector(S)` -> se non è nullo, restituire subito.
2. Per ogni discendente `el` di `R`:
   - Se `el.shadowRoot` non è nullo (cioè radice shadow aperta):
     ricorrere con `R := el.shadowRoot`, profondità +1.
   - Altrimenti, se `el.nac3` è un oggetto che espone un metodo
     `query`, delegare (vedi la sezione 5.1.6).
3. La ricorsione è **limitata a 10 livelli di profondità**. Le
   destinazioni più profonde di 10 sono irraggiungibili; chi chiama
   riceve `code='not_found'`. Il limite esiste per evitare percorsi
   patologici; in pratica nessuna base di codice in produzione annida
   più di 3-4 livelli di shadow.
4. Il percorso segue l'ordine del DOM in ampiezza: prima i fratelli,
   poi gli shadow annidati. Vince la prima corrispondenza.

#### Propagazione degli eventi

Gli eventi emessi da host dentro radici shadow DEVONO impostare
`composed: true` perché gli ascoltatori a livello di document li
ricevano. Il runtime di NAC3 emette già tutti i propri eventi con
`composed:true`; il codice dell'host che emette eventi `nac:*` a mano è
responsabile della stessa cosa. Senza `composed:true` l'evento si
ferma al confine dello shadow e il meccanismo di correlazione del
runtime non lo vede mai.

#### Responsabilità di chi scrive il componente

Chi scrive il componente deve:

1. Mettere `data-nac-id`, `data-nac-role`, `data-nac-action` sugli
   elementi operabili dentro la radice shadow.
2. Impostare `composed:true` su qualsiasi evento personalizzato che
   l'host emetta per segnalare un contratto NAC3
   (`nac:action:succeeded`, `nac:field:changed`, ecc.).
3. Evitare `<slot>` per gli elementi che devono restare isolati nello
   shadow -- i nodi messi in uno slot vivono nel light DOM e vengono
   risolti lì.

Per le radici shadow aperte non serve nessun suggerimento nel manifesto
né nessuna attivazione nel runtime; la risoluzione è automatica.

#### Implementazione di riferimento

Il runtime di riferimento espone due aiuti interni,
`_deepQuery(selector, root)` e `_deepQueryAll(selector, root)`, che
fanno il percorso. Gli aiuti pubblici `NAC.click`, `NAC.fill`,
`NAC.invoke`, `NAC.describe`, ecc., passano tutti dalle varianti
profonde.

#### Demo e test

- `example-v23-shadow-open.php` -- demo di shadow aperto annidato a 1,
  2 e 3 livelli.
- `runtime/test/v23-shadow.mjs` T1-T3, T10 -- copertura unitaria,
  compreso il limite di profondità.

### 5.1.6 Risoluzione nello shadow DOM -- radici chiuse, esposizione volontaria (v2.3)

Le radici shadow chiuse (`attachShadow({mode:'closed'})`) sono opache
da fuori il codice di chi ha scritto il componente: è un confine di
sicurezza del browser, non una decisione di NAC3. NAC3 non può arrivare
dentro se chi ha scritto il componente non espone volontariamente una
superficie interrogabile tramite il contratto qui sotto.

#### Il contratto di interfaccia `el.nac3`

Un elemento personalizzato PUÒ esporre un oggetto di interfaccia sul
proprio host, tramite un getter chiamato `nac3`:

```ts
interface NAC3HostInterface {
  query(selector: string): Element | null;        // MANDATORY
  queryAll(selector: string): Element[];          // RECOMMENDED
  describe?(): Array<{                            // OPTIONAL
    id:    string;
    role:  string;
    action?: string;
    label?: string;
  }>;
}
```

I componenti aderiscono implementando il getter. I componenti che NON
aderiscono restano inaccessibili ai chiamanti NAC3 (le loro parti
interne restano private, come il browser intende).

#### Semantica della risoluzione

Durante `_deepQuery(selector)`, per ogni elemento visitato `el` con
`el.shadowRoot === null`:

1. Se `typeof el.nac3 === 'object'` e `el.nac3.query` è una funzione,
   il runtime chiama `el.nac3.query(selector)`:
   - Il valore restituito è un Element -> risolto.
   - Il valore restituito è `null` -> nessuna corrispondenza in questo
     shadow.
   - Il valore restituito è qualsiasi altra cosa -> emette
     `nac:shadow_protocol_violation` (una volta per host) e salta.
   - Solleva un'eccezione -> emette `nac:shadow_blocked` (motivo
     `'exposure_threw'`, una volta per host) e salta.
2. Altrimenti, se `el.hasAttribute('data-nac-shadow') === true` e il
   valore dell'attributo è `'closed'` E non è presente nessuna
   interfaccia `nac3`, il runtime emette `nac:shadow_blocked` (motivo
   `'not_exposed'`, una volta per host). È l'adesione di chi scrive il
   componente al segnale di debug "sono un componente deliberatamente
   chiuso".
3. Altrimenti: l'elemento viene trattato come un normale elemento del
   light DOM, senza radice shadow.

#### Forma del dettaglio degli eventi di errore

Dettaglio di `nac:shadow_blocked`:

```ts
{
  host:   Element,     // the closed-shadow host
  reason: 'exposure_threw' | 'not_exposed',
  ts:     number       // Date.now()
}
```

Dettaglio di `nac:shadow_protocol_violation`:

```ts
{
  host:           Element,
  message:        string,            // diagnostic message
  value_snapshot: string,            // truncated value preview
  ts:             number
}
```

Entrambi gli eventi risalgono (`bubbles: true`) e attraversano i
confini dello shadow (`composed: true`). La deduplicazione è per host,
tramite un WeakSet tenuto dal runtime; uno stesso host emette ciascun
evento **al massimo una volta per caricamento di pagina**.

#### Perché è volontaria

L'opacità dello shadow chiuso è imposta dal browser. Anche se NAC3
definisse un meccanismo non volontario, il browser lo impedirebbe.
L'esposizione volontaria lascia a chi scrive il componente il controllo
completo di come appare la sua superficie pubblica per gli agenti.

Il costo è l'adesione componente per componente; il beneficio è che gli
agenti conformi a NAC3 funzionano contro design system con componenti a
shadow chiuso (Salesforce Lightning, alcuni componenti di GitHub
Primer, widget sensibili per sicurezza) senza codice adattatore per
componente.

#### Demo e test

- `example-v23-shadow-closed.php` -- il caso positivo
  (`<todo-card-closed-exposed>`) e quello negativo
  (`<todo-card-closed-blind>`) uno accanto all'altro, con pannelli di
  verdetto + registro eventi in tempo reale.
- `runtime/test/v23-shadow.mjs` T4-T9 -- copertura unitaria di ogni
  famiglia di eventi di errore, più la semantica di deduplicazione.
- `guides/SHADOW_DOM_CLOSED.md` -- guida per chi scrive componenti.

### 5.1.7 Capacità consapevoli dell'autorizzazione (v2.3)

NAC3 v2.3 permette al manifesto di dichiarare, azione per azione, quali
capacità sono richieste, e con questo blocca `NAC.click` e `NAC.invoke`
prima dell'invio. L'agente riceve un rifiuto rapido
(`code='capability_required'`) invece di un andata e ritorno che
fallisce sul server.

#### Dichiarazione nel manifesto

Un requisito di capacità si attacca al livello dell'elemento o al
livello del verbo. Se ci sono entrambi, vince quello del verbo.

```js
NAC.register({
  plugin_slug: 'fin',
  version:     '1.0.0',
  nac_version: '2.3',
  elements: [
    // Element-level (covers all verbs on this id).
    { id: 'fin.invoice.delete', role: 'action',
      requires_capability: 'finance.delete_invoice',
      actions: [{ verb: 'delete' }] },

    // Verb-level (more granular).
    { id: 'fin.invoice.edit', role: 'action',
      actions: [
        { verb: 'edit',
          requires_capability: 'finance.edit_invoice' },
        { verb: 'view',
          /* no capability -> always allowed */ }
      ] },

    // Array value: OR semantics.
    // ("at least one of these capabilities matches")
    { id: 'fin.invoice.approve', role: 'action',
      requires_capability: ['finance.approve',
                            'finance.admin'],
      actions: [{ verb: 'approve' }] }
  ]
});
```

Per una semantica di E logico ("all'utente servono TUTTE queste
capacità"), dichiarale una per una tramite azioni bloccate separate,
oppure componi sull'host nell'ascoltatore di `nac:action:requested`.

#### API pubblica

```ts
NAC.setCapabilities(caps: string | string[] | null): void
NAC.grantCapability(cap: string): void
NAC.revokeCapability(cap: string): void
NAC.userCapabilities(): string[]
```

`setCapabilities` sostituisce l'insieme intero (usalo per il login o il
rinnovo della sessione). `grantCapability` / `revokeCapability` sono
incrementali. `userCapabilities` restituisce un array con
un'istantanea. `setCapabilities(null)` svuota l'insieme.

Gli host chiamano questi metodi ogni volta che cambia il ruolo
dell'utente. L'insieme vive nel runtime; non serve ricaricare nessun
manifesto.

#### Semantica del blocco

Prima dell'invio, `NAC.click(id)` e `NAC.invoke(id, payload)` cercano
la voce di manifesto corrispondente (elemento + verbo), leggono
`requires_capability` e chiamano `_hasCapability`:

- Nessun requisito dichiarato -> consentito.
- Requisito dichiarato e l'insieme corrente lo soddisfa -> consentito.
- Requisito dichiarato e l'insieme corrente NON lo soddisfa -> rifiuto
  con `NacError('capability_required', ...)` E emissione di
  `nac:command:rejected` con
  `detail.reason='capability_required'`.

Il blocco scatta DOPO i controlli di `not_found` / `disabled` /
`hidden` su `click`, perché emerga il fallimento più specifico. Su
`invoke`, il blocco scatta prima che parta l'evento di richiesta
(l'host non vede mai un tentativo non autorizzato).

#### Perché questo conta

Senza il blocco, un agente che chiama `NAC.click('finance.delete')` o
riesce (nessun blocco di autorizzazione -> falla di sicurezza) o
fallisce sul server con un 403 diversi secondi dopo. Con il blocco,
l'agente scopre in modo sincrono che gli manca la capacità e può
reagire come si deve (chiedere un altro percorso, chiedere
un'elevazione di permessi, mostrare il vincolo all'utente).

Questo completa -- non sostituisce -- l'autorizzazione sul server. Gli
host DEVONO continuare a far valere i permessi sul server. Il blocco
sul client è un'ottimizzazione dell'esperienza e un segnale a livello di
intenzione, non un confine di sicurezza.

#### Demo e test

- `runtime/test/v23-capabilities.mjs` -- 17 asserzioni che coprono
  lettura e scrittura dell'insieme, concessione e revoca, il blocco del
  clic, il blocco dell'invoke, la risoluzione fra livello di verbo e
  livello di elemento, la semantica di O logico, lo svuotamento con
  null, il rifiuto degli input non validi, e la regressione delle
  azioni senza blocco.

### 5.1.2 Flag di validazione stretta (v2.2; valore predefinito invertito nella v2.3)

`NAC.STRICT_VALIDATION` (booleano). Quando vale `true`,
`NAC.register()` solleva un `Error` con `code='strict_validation'` e un
array `findings` in uno qualsiasi di questi casi:

- `manifest_role_unknown` -- il ruolo della voce è fuori dall'insieme
  canonico.
- `tab_id_manifest_role_drift` -- l'id corrisponde a `^tab\.` ma il
  ruolo non è `'tab'`.
- `manifest_dom_role_mismatch` -- il `data-nac-role` dell'elemento
  montato nel DOM è diverso dal ruolo della voce del manifesto.

**Valore predefinito:**

- **v2.2.x:** `false` (solo avviso). A chi adottava serviva una
  finestra di migrazione.
- **v2.3.x:** **`true`** (solleva). La finestra di migrazione si è
  chiusa con la linea v2.2. Chi adotta con manifesti pieni di
  scostamenti si tira fuori impostando
  `NAC.STRICT_VALIDATION = false` PRIMA di qualsiasi chiamata a
  `register()`.
- **v3.0:** il flag viene rimosso (stretto è l'unica modalità).

Vedi `guides/MIGRATION_v2.2_to_v2.3.md` per il copione di pulizia dei
riscontri di scostamento.

Tutti i metodi asincroni rifiutano con un `NacError` il cui `code` è
uno di questi:

- `not_found` -- l'elemento, il ruolo o il verbo nominato non è nel
  DOM.
- `invalid` -- la forma dell'argomento è sbagliata.
- `disabled` -- l'elemento ha `disabled` oppure
  `aria-disabled='true'` (solo `NAC.click`; `NAC.invoke` non controlla
  più dalla correzione della v2.3, vedi la sezione 5.1.4).
- `hidden` -- l'elemento è fuori schermo, oppure ha
  `aria-hidden='true'`, oppure ha dimensione zero.
- `capability_required` -- il manifesto ha dichiarato
  `requires_capability` e l'insieme corrente di
  `NAC.userCapabilities()` non lo soddisfa (v2.3, vedi la sezione
  5.1.7).
- `timeout` -- l'effetto è stato inviato ma l'evento di conferma di
  conformità non è arrivato entro 5 secondi (30 secondi per `invoke`).
  **Una scadenza significa un fallimento reale**: il gestore può
  essersi bloccato, la conferma può non essere mai stata collegata, può
  esserci stata una corsa di rete. Chi chiama DEVE trattare la scadenza
  come un fallimento, a meno che non abbia la prova dell'effetto per un
  altro canale.

### 5.2 Introspezione

```ts
NAC.describe():    { active: string|null, plugins: PluginSnap[] }
NAC.describe_v2(): { v2_scope_entries: [...], sitemap: ..., data_tables: [...] }
NAC.manifest(plugin_slug: string): Manifest|null
NAC.validate_global(opts?: {probe?: boolean}): GlobalReport   // named buckets, see 10.1
```

### 5.3 Tabelle di dati (dalla 2.1)

Le primitive di tabella di dati NON fanno parte del runtime centrale
(`js/nac.js` / il `nac.mjs` di `@nac3/runtime`). Arrivano nel modulo di
estensioni per brownfield `js/nac-v2-extensions.js` (pubblicato come
`@nac3/runtime/extensions`), che le attacca allo stesso oggetto
`window.NAC` dopo essersi caricato. Carica il modulo di estensioni dopo
il runtime centrale per avere la superficie `dt_*`:

```html
<script src="https://yujin.app/nac-spec/js/nac.js"></script>
<script src="https://yujin.app/nac-spec/js/nac-v2-extensions.js"></script>
```

```js
// or with the npm package:
import '@nac3/runtime';
import '@nac3/runtime/extensions';
```

I metodi qui sotto esistono solo quando il modulo di estensioni è
caricato; chiamarli su un runtime con il solo nucleo non fa niente /
restituisce `undefined`.

```ts
NAC.registerDataTable(spec: DataTableSpec): string   // returns table_id
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

Una tabella di dati ha un `subkind`:

- `collection` -- righe ordinate, con conferma transazionale
  facoltativa. Usata per le righe di una fattura, gli articoli di un
  carrello, le voci di un registro.
- `matrix` -- una griglia riga x colonna in cui ogni cella porta un
  valore. Usata per le matrici di permessi, le griglie di orari.
- `matrix-singletree` -- una matrice in cui ogni riga si ripiega in un
  albero (raro).

---

### 5.4 Risoluzione stretta + disambiguazione (v2.4)

NAC3 v2.4 rende **stretta** la risoluzione di id, verbo, qualificatore
ed etichetta. I verbi che risolvono una richiesta a un unico elemento
del DOM -- `click_by_verb`, `tab` (nella forma a un argomento) e
`tab_by_label` -- non tirano più a indovinare. Quando una richiesta
risolve a zero candidati o a più di uno, il runtime solleva un
`NacError` che porta l'elenco dei candidati E emette un evento
`nac:disambiguation_requested`, invece di inviare in silenzio al primo
che somiglia.

Questo è l'invariante di **zero danno silenzioso**. Esiste per il
software di assistenza e per gli agenti, dove un invio silenzioso
all'elemento sbagliato senza via di recupero è un bloccante di
sicurezza. Il comportamento indulgente di prima della 2.4 -- un
ripiego con `indexOf` per sottostringa che risolveva al primo che
somigliava -- è stato rimosso.

> Compatibilità con il passato: la v2.4 è un cambiamento del
> *comportamento del contratto*. I percorsi di codice che già
> passavano argomenti senza ambiguità continuano a funzionare
> identici. I percorsi di codice che dipendevano dal ripiego
> indulgente con `indexOf` per risolvere al primo che somigliava ora
> solleveranno un'eccezione -- per scelta.

#### 5.4.1 Corrispondenza stretta del qualificatore (`click_by_verb`)

`click_by_verb(plugin, verb, opts?)` sceglie fra i nodi del DOM che
condividono `data-nac-action="<verb>"`. Quando viene fornito
`opts.qualifier` (una stringa), un elemento corrisponde **solo** se il
suo `data-nac-id` soddisfa:

```js
id === qualifier || id.endsWith('__' + qualifier)
```

Cioè: uguaglianza esatta dell'id, oppure un suffisso ancorato dopo un
separatore `__`. **Non c'è nessun ripiego per sottostringa**. Un
qualificatore che è soltanto una sottostringa di un id (non uguale, non
un `__suffix` ancorato) NON corrisponde.

- 0 corrispondenze -> solleva
  `NacError('no_matching_instance', ...)`.
- esattamente 1 corrispondenza -> risolve e fa clic.
- >1 corrispondenze -> solleva
  `NacError('ambiguous_qualifier', ...)`.

`opts.qualifier_ordinal` (un numero) sceglie per posizione fra tutti
gli elementi del DOM che condividono il verbo, scavalcando la
corrispondenza di qualificatore.

#### 5.4.2 Risoluzione stretta di id (`tab`)

Forma a un argomento di `tab(plugin, id)`: vince una corrispondenza
esatta di `data-nac-id` nel DOM. Altrimenti il runtime cerca le
istanze il cui id comincia con `id + "__"`:

- 0 istanze qualificate e nessun id esatto ->
  `no_matching_instance`.
- esattamente 1 -> risolve.
- >1 -> `ambiguous_tab` (passa l'id qualificato completo).

#### 5.4.3 Risoluzione stretta per etichetta (`tab_by_label`)

`tab_by_label(plugin, label)` risolve un'etichetta leggibile da una
persona a una scheda, provando, in quest'ordine: corrispondenza esatta
con l'etichetta del manifesto, corrispondenza sfumata o per
sottostringa nel manifesto, corrispondenza esatta con il testo del DOM,
corrispondenza sfumata con il testo del DOM. Se uno qualsiasi di questi
livelli dà più di una corrispondenza, solleva
`NacError('ambiguous_label', ...)`; se nessun livello corrisponde,
solleva `NacError('not_found', ...)`. Il campo `reason` dell'evento
emesso registra quale livello era ambiguo (`ambiguous_label_exact`,
`ambiguous_label_fuzzy`, `ambiguous_label_exact_dom`,
`ambiguous_label_fuzzy_dom` oppure `no_matching_label`).

#### 5.4.4 Codici di errore

| `err.code` | Sollevato da | Significato |
|------------|-----------|---------|
| `no_matching_instance` | `click_by_verb` (qualificatore), `tab` | nessun elemento corrisponde al qualificatore / id |
| `ambiguous_qualifier`  | `click_by_verb` | più di 1 elemento corrisponde al qualificatore |
| `ambiguous_tab`        | `tab`           | più di 1 istanza qualificata `id__` corrisponde |
| `ambiguous_label`      | `tab_by_label`  | più di 1 scheda corrisponde all'etichetta (a qualsiasi livello) |
| `not_found`            | `tab_by_label`  | nessuna scheda corrisponde all'etichetta |

#### 5.4.5 La forma di `err.candidates`

Ogni errore di disambiguazione porta un array `candidates`. Ogni
candidato è esattamente:

```ts
{ nac_id: string, label: string }
```

`nac_id` è il `data-nac-id` dell'elemento. `label` si risolve
preferendo `aria-label`, poi il `textContent` ripulito (tagliato a 120
caratteri), e infine ricadendo sul `data-nac-id`. L'elenco è validato
contro il DOM: nomina gli elementi reali fra cui chi chiama può
scegliere. `NacError` fonde `candidates` nell'`Error` sollevato, quindi
`err.code`, `err.message` ed `err.candidates` sono tutti e tre
popolati.

#### 5.4.6 L'evento `nac:disambiguation_requested`

Ogni volta che una chiamata di risoluzione stretta fallisce (nessuna
corrispondenza OPPURE troppe), il runtime invia un `CustomEvent`
`nac:disambiguation_requested` su `document` *oltre a* sollevare
l'eccezione. L'emissione è al meglio possibile: se l'invio fallisce, il
runtime solleva comunque.

```ts
document.addEventListener('nac:disambiguation_requested', (e) => {
  e.detail; /* {
    method:     'click_by_verb' | 'tab' | 'tab_by_label',
    plugin:     string | null,
    query:      { verb?, qualifier?, label?, id? },
    reason:     string,   // finer-grained than err.code (see 5.4.3)
    candidates: Array<{ nac_id: string, label: string }>,
  } */
});
```

#### 5.4.7 Come disambigua chi chiama

Con l'elenco dei candidati in mano (da `err.candidates` oppure da
`event.detail.candidates`), chi chiama ne sceglie uno e rinvia per
una di queste vie:

1. **Il `nac_id` completo** -- `NAC.click(candidate.nac_id)`. È la via
   canonica di recupero: il candidato porta già l'id esatto.
2. **Il `__suffix` ancorato** -- passa a `click_by_verb` il suffisso
   esatto dell'istanza come qualificatore.
3. **`opts.qualifier_ordinal`** -- selezione per posizione fra gli
   elementi che condividono il verbo (nell'ordine del DOM).

Il riferimento lavorato è `example-v24-disambiguation.php`; il
contratto è coperto da `runtime/test/stage2-disambiguation.mjs` e
`runtime/test/stage7-strict-resolution.mjs`.

---

## 6. Eventi

Ogni azione emette un evento di completamento deterministico. Il
`NAC.click()` del runtime sta in ascolto di quell'evento e si risolve
quando parte.

| Ruolo | Evento di successo | Evento di fallimento |
|------|---------------|---------------|
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

### 6.1 Forma del dettaglio dell'evento

Il dettaglio di ogni evento porta il campo id canonico, più `plugin`:

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

### 6.2 Emettere da un gestore dell'host

Un gestore di clic DEVE emettere l'evento di successo corrispondente
dopo il suo effetto sincrono:

```js
button.addEventListener('click', function (ev) {
  // ... do the work ...
  document.dispatchEvent(new CustomEvent('nac:action:succeeded', {
    detail: { plugin: 'invoice', action_id: 'invoice.save' }
  }));
});
```

Se il lavoro è asincrono, emetti dopo la risoluzione. Se il lavoro
fallisce, emetti `nac:action:failed` con `{detail: {plugin, action_id,
error: <message>}}`.

Il runtime v2.2 fornirà `NAC.bindAction(el, handler, ctx)`, che
avvolge `addEventListener` ed emette automaticamente.

### 6.3 Perché non usare l'evento di clic stesso?

Un evento `click` del DOM parte prima che il gestore venga eseguito. Il
contratto di NAC3 ha bisogno di sapere quando **l'effetto è finito**,
non quando è cominciato il clic. Da qui la famiglia di eventi separata.

---

## 7. Provenienza

### 7.1 isTrusted

`event.isTrusted` vale `true` per i clic avviati da una persona (mouse
vero, tasto vero, attivazione da uno screen reader) e `false` per i
clic sintetizzati (`element.click()`, il dispatchEvent di un MouseEvent
costruito a mano, l'automazione).

NAC3 DEVE esporlo tramite `event.detail.is_trusted` dentro l'evento di
successo. Gli host che eseguono azioni sensibili per la sicurezza
(pagamento, cancellazione) POSSONO esigere `is_trusted === true` e
rifiutare i clic sintetici. La demo di riferimento
`example-v20-full.php` include una coppia di pulsanti
(`v20_panel.istrusted_real` e `v20_panel.istrusted_fake`) che dimostra
la distinzione.

### 7.2 Manifesti firmati con HMAC

Un manifesto PUÒ portare un blocco `provenance`:

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

Il runtime calcola l'HMAC atteso su una serializzazione stabile del
manifesto (esclusa la firma stessa) e rifiuta i manifesti la cui firma
non corrisponde. Usato dai dispiegamenti multi-inquilino per impedire
che un inquilino falsifichi il manifesto di un altro.

### 7.3 Modello di minaccia

Vedi `SECURITY.md` per il modello di minaccia completo. Versione
breve:

- NAC3 non autentica l'**utente**. Quello è il lavoro del tuo livello
  di autenticazione.
- NAC3 autentica il **manifesto** (HMAC).
- NAC3 distingue i clic reali da quelli sintetizzati (isTrusted), così
  un host può rifiutare i secondi per i verbi sensibili.
- NAC3 non protegge da un agente malevolo che gira con l'accesso
  dell'utente. Un agente così può fare tutto quello che può fare
  l'utente.

---

## 8. Livelli di conformità

Un livello si scrive **NAC3 Conformance Level 1**, **2** oppure **3**.
Il nome di un livello non è il nome del protocollo: un validatore, un
rapporto o una dichiarazione di conformità DEVE citare un livello con
l'identificatore `nac3-conformance-level-<1|2|3>` pubblicato in
`api/latest/levels.json`, mai con un nome visualizzato. La sezione 8.1
registra i nomi che questi livelli portavano prima della 2.5.0.

Una pagina è al **NAC3 Conformance Level 1** se:

- Ogni widget cliccabile che un agente dovrebbe poter manovrare porta
  `data-nac-id` e `data-nac-role`.
- Ogni elemento con `data-nac-role="action"` fa partire
  `nac:action:succeeded` dopo il suo effetto.
- La pagina registra almeno un manifesto di plugin tramite
  `NAC.register()`.
- `NAC.click(id)` funziona per ogni id annunciato.

Una pagina è al **NAC3 Conformance Level 2** se inoltre:

- Registra gli array `tabs[]`, `fields[]`, `actions[]` in modo
  esplicito nel suo manifesto (non dedotti dal DOM).
- Fornisce `label_i18n` che copre tutte le 10 locale di NAC3 per ogni
  etichetta visibile all'utente.
- Implementa le primitive brownfield della v2.0: albero di ambito,
  cattura effimera, autoRegister.watch.
- Passa `NAC.validate_global({probe: false})` con zero riscontri di
  severità `error`.

Una pagina è al **NAC3 Conformance Level 3** se inoltre:

- Porta manifesti firmati con HMAC.
- Distingue `isTrusted` per i verbi sensibili per la sicurezza.
- Passa `NAC.validate_global({probe: true})` con zero riscontri.

La riga di comando del pacchetto NPM (`npx nac3 validate <url>`)
riporta il livello più alto che una pagina raggiunge. (Il pacchetto
pubblica i binari `nac3` e `nac`; entrambi portano alla stessa riga di
comando.)

### 8.1 Nomi storici dei livelli (v2.5)

Prima della 2.5.0 i tre livelli si scrivevano `NAC-1`, `NAC-2` e
`NAC-3`. Quei nomi stanno a un trattino di distanza dal nome del
protocollo, `NAC3`, quindi "questa pagina è conforme a NAC-3" non si
poteva distinguere da "questa pagina implementa NAC3", e un agente a
cui si chiedeva di riportare un livello non aveva nessuna stringa senza
ambiguità da riportare.

I nomi vecchi restano leggibili come alias storici:
`api/latest/levels.json` pubblica ciascuno come
`legacy_display_name` accanto al livello a cui apparteneva, così un
documento scritto prima della 2.5.0 si può ancora ricondurre a un
livello. NON sono normativi. Il testo nuovo, l'output dei validatori e
le dichiarazioni di conformità usano il numero del livello o
l'identificatore pubblicato.

---

## 9. Versionamento

NAC3 segue semver:

- Salto **maggiore**: cambiamento incompatibile dell'API pubblica o dei
  formati di trasporto. Chi adotta modifica il codice.
- Salto **minore**: funzionalità nuove, compatibili con il passato. Il
  codice vecchio continua a funzionare.
- Salto di **patch**: correzioni di difetti, cambiamenti di sola
  documentazione.

Politica di deprecazione: una funzionalità marcata `@deprecated` nella
versione `X.Y.0` non viene rimossa prima di `(X+1).0.0`. Le note di
rilascio documentano esplicitamente ogni rimozione.

La versione del pacchetto NPM rispecchia la versione della specifica:
`@nac3/runtime@X.Y.Z` implementa NAC3 vX.Y, con Z revisioni di patch
sopra. L'esempio è scritto con dei segnaposto di proposito: una
versione concreta in questa frase invecchia alla versione successiva, e
questo documento ha portato `2.1.3` molto dopo che il pacchetto era
andato avanti.

### 9.1 Prerelease e dist-tag

Una versione con una coda di prerelease (`-alpha.N`, `-beta.N`,
`-rc.N`) **non** è una versione pubblicata di questa specifica. Esiste
perché un cambiamento possa essere esercitato prima di essere promesso.

- **`latest` punta sempre e soltanto a una versione stabile.** Un
  `npm install @nac3/runtime` senza tag DEVE risolvere a una versione
  senza coda di prerelease. Chi adotta e installa il valore
  predefinito non riceve mai una prerelease per sbaglio.
- **Le prerelease vengono pubblicate sotto il proprio dist-tag**
  (`alpha`, `beta`, `rc`). Aderirvi è esplicito: `npm install
  @nac3/runtime@alpha`.
- **Niente in una prerelease è una promessa.** Qualsiasi superficie
  introdotta in una di esse può cambiare o scomparire prima della
  versione stabile che la porta. Le garanzie di stabilità della sezione
  10 e le garanzie sui codici di riscontro della sezione 12 cominciano
  alla versione stabile.
- **Le prerelease non vengono mai ritirate** e mai rietichettate come
  `latest` in modo retroattivo. La traccia di quello che è stato
  pubblicato resta leggibile.

La versione autoritativa del runtime di riferimento è la costante
`NAC.version` in `js/nac.js`, e viene pubblicata come dato:
`api/latest.json` porta un puntatore `stable` e uno `prerelease`
separati (uno dei due può valere `null`), e ogni artefatto pubblicato
porta il proprio campo `channel`. Un consumatore che esige un contratto
stabile legge un campo e rifiuta, senza nessuna stringa di versione da
analizzare e nessun tag di cui fidarsi.

---

## 10. Validatori

### 10.1 Runtime: `NAC.validate_global()`

Percorre il DOM vivo + i manifesti registrati e restituisce un
**oggetto di gruppi con nome**: un gruppo per condizione, ciascuno un
array di riscontri. Dalla 2.5.0 ogni riscontro di ogni gruppo porta
`code` e `severity`, così un'integrazione di CI può bloccare su un
codice senza analizzare un messaggio:

```ts
{
  ok:         boolean,       // false when any error-severity finding exists
  has_errors: boolean,
  duplicates: [{ code: 'nac_id_duplicate_across_plugins',
                 severity: 'error', nac_id, plugins: string[] }],
  orphans:    [{ code: 'nac_id_orphan_in_dom',
                 severity: 'warn', nac_id, in_dom, in_manifest,
                 plugin_root }],
  unmounted:  [{ code: 'nac_id_declared_not_mounted',
                 severity: 'warn', nac_id, in_manifest, in_dom,
                 plugin }],
  convention_violations:
              [{ code: 'nac_id_missing_plugin_prefix',
                 severity: 'warn', nac_id, plugin, hint }],
  plugin_instance_violations:
              [{ code: 'duplicate_plugin_no_instance_id',
                 severity: 'error', slug, instance_count, ... }],
  tolerated:  [{ kind, nac_id, until, original }],
  plugin_count: number,
  total_ids:    number,
  timestamp:    number
}
```

I cinque codici, la loro severità e cosa fare con ciascuno sono
pubblicati come dato in `api/latest/findings.json`, sotto
`global_buckets`. I codici di riscontro sono stabili fra le versioni di
patch; codici nuovi soltanto nei salti minori, e un codice non viene
mai riutilizzato per un'altra condizione (sezione 12, promessa 4).

**Le versioni precedenti alla 2.5.0 non attaccavano nessun codice a
questi gruppi**, e questa sezione descriveva un array piatto di
riscontri che il runtime di riferimento non ha mai restituito (audit
N-14, N-34).

**Cambiamento di comportamento nella 2.5.0 (audit N-33).** Prima della
2.5.0 il raccoglitore dietro questo validatore leggeva soltanto i
gruppi legacy del manifesto (`actions`, `fields`, `tabs`, `kpis`,
`charts`, con chiave `nac_id`) e mai la forma canonica
`elements: [{ id }]` della sezione 4. Contro un manifesto scritto nel
modo documentato, quindi, riportava `total_ids: 0`, elencava ogni
elemento dichiarato come orfano, non riusciva a riportare né un
duplicato, né un id non montato, né una violazione di convenzione, e
rispondeva comunque `ok: true`. Dalla 2.5.0 in avanti vengono lette
entrambe le forme. Un host che bloccava la propria CI su `has_errors`
può vedere il primo fallimento dopo l'aggiornamento: quello è un vero
positivo che c'è sempre stato, non una regola nuova.

### 10.2 CLI: `npx nac3 validate <target>`

Avvolge `validate_global` più un lint statico di coerenza fra HTML e
manifesto. Codici di uscita:

- `0` -- nessun riscontro di severità >= alla soglia configurata.
- `1` -- ci sono riscontri.
- `2` -- la destinazione stessa non si è potuta caricare.

Utile in CI: `npx nac3 validate ./dist/index.html --severity=error`. Il
pacchetto espone la CLI sotto due nomi di binario, `nac3` e `nac`; usa
quello che non entra in conflitto con un altro strumento del tuo PATH.

---

## 11. Il sistema intorno a NAC3

NAC3 è uno strato di contratto. Per trasformare una pagina conforme a
NAC3 in un'applicazione guidata dalla voce servono anche:

1. **Una fonte di riconoscimento vocale** (lo SpeechRecognition del
   browser, l'API di Whisper, ecc).
2. **Un intermediario LLM** che prende il testo dell'utente + lo
   scatto che `NAC.describe()` dà della pagina + un suggerimento di
   i18n ed emette azioni strutturate: `[{kind: 'click', nac_id: 'X'},
   {kind: 'fill', nac_id: 'Y', value: 'Z'}]`. Vedi
   `guides/LLM_WIRING.md`.
3. **Un client di chat** che tiene la conversazione e invia le azioni.
   Il riferimento è `js/nac-chat-client.js`.
4. **Una destinazione di sintesi vocale** per le risposte parlate (lo
   SpeechSynthesis del browser, ElevenLabs, ecc).

NAC3 standardizza soltanto la forma di ingresso e uscita del passo 2
(lo scatto di `NAC.describe()` + la forma delle azioni). I passi 1, 3 e
4 sono fuori dalla specifica; componi quello che preferisci.

---

## 12. Garanzie di stabilità

Quello che questa specifica promette:

1. L'insieme dei ruoli canonici della sezione 1 non si restringerà.
   POSSONO essere aggiunti ruoli nuovi nelle versioni minori.
2. La famiglia di eventi della sezione 6 non verrà rinominata.
   POSSONO essere aggiunti eventi nuovi nelle versioni minori.
3. I verbi di `NAC.click`, `NAC.fill`, ecc., non cambieranno forma
   nelle versioni minori. POSSONO comparire campi facoltativi nuovi in
   `opts`.
4. I codici di riscontro di `validate_global` non verranno riutilizzati
   per condizioni diverse fra una versione minore e l'altra. Dalla
   2.5.0 ogni gruppo di quel validatore porta un codice, e tutti sono
   pubblicati con la loro severità in `api/latest/findings.json`:
   confronta due versioni pubblicate e un codice riutilizzato è
   visibile senza leggere nemmeno un sorgente.

Quello che questa specifica NON promette:

1. La formulazione esatta dei messaggi di errore (sono stringhe del
   catalogo i18n; le localizzazioni possono spostarsi).
2. La strategia DOM per trovare gli elementi (`querySelector` oggi;
   più avanti può diventare un indice più veloce).
3. La disposizione interna della cache dei manifesti. Tratta i
   manifesti come di sola scrittura dal lato host, e di sola lettura
   dal lato agente.

---

## 13. Domande aperte

Vengono tracciate **qui**, in questa sezione. Una revisione precedente
intitolava questo "Domande aperte (tracciate separatamente)" e non
diceva mai dove fosse quel "separatamente"; non c'era nessun altro
registro. Una domanda che arriva a una decisione esce dalla tabella
qui sotto ed entra nella sezione che riguarda. Una domanda che diventa
una proposta concreta riceve un RFC, e quelli sono indicizzati in
[`rfcs/README.md`](rfcs/README.md), con il processo in
[`CONTRIBUTING.md`](CONTRIBUTING.md).

Ogni riga porta la versione in cui è stata valutata l'ultima volta,
così chi legge distingue una domanda viva da una abbandonata.
**Nessuna riga porta una versione obiettivo**: una promessa con una
data che supera la sua data è peggio di una senza data, che è
l'errore che la sezione 5 commetteva su `payload_schema`.

| Domanda | Stato | Ultima valutazione | Come sta |
|----------|-------|---------------|-----------------|
| `data-nac-role="navigation"` dovrebbe mai risolvere a una scheda? | **DECISO: no** | v2.5 | Deciso nella 2.2.0 e imposto da allora: un id con prefisso `tab.` e ruolo `navigation` solleva `tab_id_manifest_role_drift`, e con `STRICT_VALIDATION` (predefinito `true` dalla 2.3.0) `NAC.register` solleva. `tab_by_label` risolve le schede soltanto da `m.tabs[]` ed `elements[role=='tab']`. `navigation` è una regione di riferimento, mai un pannello commutabile. Vedi le sezioni 1 e 10. |
| `NAC.click()` dovrebbe accettare id relativi (per esempio `'./save'`)? | **APERTA, non implementata** | v2.5 | Il risolutore fa corrispondere `data-nac-id` in modo esatto e delimita per plugin: quello attivo, o quello di `opts.plugin`. Quella delimitazione copre già il caso che la domanda chiedeva (`NAC.click('save', {plugin:'invoice'})`), quindi la pressione per una sintassi relativa è bassa e niente è in corso. Deciderla vorrebbe dire aggiungere una grammatica di percorsi alla sezione 2, dove gli id sono dichiarati opachi per il runtime. |
| I manifesti dovrebbero supportare ereditarietà / estensione fra plugin (un manifesto di base esteso da un inquilino)? | **APERTA, candidata per la prossima maggiore** | v2.5 | Non implementata. **Non va confusa con la sezione 15**, il "contratto di estensione di plugin": quello è stato pubblicato nella v2.5 ed è un meccanismo di instradamento verso il backend (`registerPlugin` / `call` / `read` / `subscribe`), non ereditarietà di manifesti. La domanda qui riguarda un manifesto che deriva da un altro, cosa che tocca le regole di unicità degli id della sezione 2 ed è il motivo per cui resta riservata a una maggiore. |
| L'applicazione di `payload_schema` dovrebbe essere formalizzata e attivata? | **APERTA, senza data** | v2.5 | Spostata qui dalla sezione 5, che la prometteva per la v2.4. Non è arrivata nella v2.4 e non è arrivata fino alla v2.5; il runtime di riferimento non legge il campo. Vedi la sezione 5 per sapere esattamente cosa viene validato oggi e cosa no. |
| I riscontri di `validate_global()` dovrebbero portare un codice dal catalogo pubblicato? | **DECISO: sì, pubblicato nella 2.5.0** | v2.5 | Ogni voce di ogni gruppo porta `code` + `severity`, quindi la promessa 4 della sezione 12 ora copre un insieme reale invece di uno vuoto. I cinque codici sono pubblicati sotto `global_buckets` in `api/latest/findings.json`, e il generatore li LEGGE da un caso di prova che provoca ogni gruppo, invece di scriverli a mano: la versione precedente scriveva `code: null` per un gruppo che portava un codice dalla 2.5.0 e pubblicava entrambe le affermazioni nello stesso file. Costruire quel caso di prova è anche ciò che ha trovato l'audit N-33: il validatore non riusciva a vedere un manifesto scritto nella forma canonica. Vedi 10.1. |

---

## 13.5 Governance

Oggi NAC3 è curato da Yujin. La specifica, la documentazione e il
runtime di riferimento sono pubblicati tutti sotto Apache-2.0. (Il
runtime era etichettato MIT nell'era dei due repository, prima della
2.5; è stato armonizzato ad Apache-2.0 su tutti gli artefatti di NAC3
nel consolidamento del 2026-05-23. Vedi `LICENSE` e
`runtime/LICENSE`.) Yujin si impegna a spostare NAC3 presso una
fondazione neutrale (un gruppo comunitario del W3C, la Linux
Foundation, o un organismo industriale equivalente) se e quando
l'adozione giustificherà una governance neutrale. Fino ad allora, i
cambiamenti della specifica seguono il processo RFC documentato in
`CONTRIBUTING.md`, con un periodo di commento pubblico di almeno 14
giorni per qualsiasi cambiamento che tocchi l'API pubblica o i formati
di trasporto.

Per chi adotta: la licenza uniforme Apache-2.0 garantisce che la
specifica e il runtime sopravvivano a qualsiasi cambiamento nella
situazione societaria di Yujin. Puoi biforcare l'uno o l'altro, far
girare l'uno o l'altro e pubblicare l'uno o l'altro, oggi e dopo che
non ci saremo più. Questo documento registra l'impegno perché la strada
verso quella sopravvivenza sia esplicita, non implicita.

---

## 14. Implementazione di riferimento

L'implementazione canonica è il runtime di riferimento distribuito come
il pacchetto NPM `@nac3/runtime`. La fonte normativa della versione è
la costante `NAC.version` del runtime stesso, pubblicata come dato in
`api/latest.json` (vedi la sezione 9.1). Questa sezione
deliberatamente non ripete un numero di versione: portava
`2.5.0-alpha.5` quando il pacchetto era già andato avanti, che è la
stessa classe di difetto degli esempi vecchi rimossi dalle sezioni
5 e 9. Pubblica:

- `js/nac.js` -- il runtime centrale: l'API pubblica imperativa + di
  introspezione della sezione 5 (click/fill/select/tab,
  click_by_verb/tab_by_label, invoke/utter, edit_field,
  setCapabilities, syncPlugin, request_authority/confirm_action,
  registerPlugin/call/read/subscribe, narrate/context/tree,
  expect/diff, describe, validate_global, ...). Pubblicato come
  l'ingresso `main`/`module`/`browser` del pacchetto
  (`dist/nac.mjs`).
- `js/nac-v2-extensions.js` -- le primitive brownfield + di tabella di
  dati che si attaccano allo stesso `window.NAC` dopo il caricamento
  del nucleo: albero di ambito, autoRegister, cattura effimera, HMAC,
  attestazione di isTrusted, catalogo i18n (`t`/`locale`), e tutta la
  famiglia `registerDataTable` / `dt_*` delle tabelle di dati (sezione
  5.3). Pubblicato come `@nac3/runtime/extensions`
  (`dist/nac-v2-extensions.mjs`). Il runtime centrale NON porta la
  superficie `dt_*`; carica questo modulo per averla.
- `js/nac-chat-client.js` -- un client di chat di riferimento che
  collega voce + LLM + dispatcher. Pubblicato come
  `@nac3/runtime/chat-client`.

Il pacchetto espone anche una CLI sotto i nomi di binario `nac3` e
`nac` (`dist/cli.js`, sezione 10.2).

Altre implementazioni sono benvenute (Python per esecutori di
automazione nativi, Rust per agenti embedded, ecc). L'autorità è la
specifica, non il codice JS.

---

## 15. Contratto di estensione di plugin -- superfici canvas + API (v2.5)

Le sezioni 1-14 presuppongono che la superficie rilevante per l'agente
sia il **DOM**. Ogni elemento indirizzabile ha un attributo
`data-nac-id`, ogni verbo parte attraverso `el.click()`, ogni lettura
di stato viene da `el.getAttribute(...)`. Questo funziona per le
applicazioni la cui cornice E il cui contenuto vivono in nodi del DOM.

Non funziona per le applicazioni in cui parte della superficie è un
**canvas** (LibreOffice / Collabora Online, Figma, Excalidraw, Miro,
qualsiasi editor WebGL fatto in casa). La cornice può restare DOM
(barre degli strumenti, finestre di dialogo), ma i comandi spesso
devono passare per l'API pubblica dell'applicazione stessa
(postMessage, SDK dei plugin, ponte di scripting), e lo stato può non
essere leggibile dal DOM per niente.

La v2.5 aggiunge un piccolo insieme di primitive che permettono a un
plugin NAC3 di dichiarare il proprio contratto di instradamento verso
superfici del genere. Il runtime resta agnostico rispetto a qualsiasi
applicazione specifica: impara a parlare con una soltanto leggendo il
manifesto del plugin.

### 15.1 Perché un nuovo insieme di primitive

Il `NAC.click(id)` che conosce solo il DOM non può:

- Mandare un postMessage `Send_UNO_Command` a un iframe di Collabora
  in sandbox.
- Chiamare `figma.currentPage.selection = [...]` dentro la sandbox dei
  plugin di Figma.
- Invocare `excalidrawAPI.setElements(...)` su una ref di React.
- Leggere se Grassetto è attivo sulla selezione corrente di Collabora
  (la barra degli strumenti lo riflette; il canvas lo nasconde).

La soluzione **non** è estendere `NAC.click` con euristiche di
individuazione del backend. La soluzione è aggiungere un verbo
esplicito e agnostico che prenda uno slug di plugin e un percorso di
verbo, e che lasci al manifesto del plugin dichiarare come quel verbo
viene instradato.

### 15.2 Le tre primitive

```ts
NAC.registerPlugin(slug: string, manifest: PluginManifest): void
NAC.call(plugin: string, verb_path: string, args?: object): Promise<any>
NAC.read(plugin: string, state_path: string): Promise<any>
NAC.subscribe(plugin: string, event_path: string,
              cb: (data: any) => void): SubscriptionHandle
NAC.unsubscribe(handle: SubscriptionHandle): void
```

- `registerPlugin(slug, manifest)` registra un plugin v2.5. Uno stesso
  `slug` PUÒ comparire sia nel registro dei manifesti del DOM (sezione
  5) sia nel registro delle estensioni v2.5; i due coesistono. Le
  chiamate v2.5 risolvono soltanto attraverso il registro v2.5.
- `call` invoca un verbo dichiarato. L'instradamento lo sceglie il
  manifesto, non l'agente. Si risolve con quello che il backend ha
  restituito (spesso `undefined` / `{ok: true}`); rifiuta con
  `NacError` se il verbo è sconosciuto, se il backend fallisce, o se la
  forma della risposta non è valida.
- `read` restituisce un valore di stato dichiarato. Il runtime percorre
  la catena di ripieghi dello stato nell'ordine dichiarato e
  restituisce la prima fonte che si risolve; rifiuta soltanto quando
  tutte le fonti della catena hanno fallito.
- `subscribe` attacca un ascoltatore a un evento dichiarato.
  Restituisce un identificatore che chi chiama passa a `unsubscribe`
  per fare pulizia. Gli eventi POSSONO essere sostenuti da una vera
  fonte di eventi a monte oppure sintetizzati con interrogazione
  periodica / MutationObserver -- il manifesto dichiara quale.

Tutte e quattro le funzioni sono asincrone (restituiscono una Promise)
tranne `unsubscribe`, che è sincrona e idempotente.

### 15.3 Forma del manifesto di plugin

```ts
interface PluginManifest {
  slug: string;
  verbs:  { [verb_path: string]: VerbBinding };
  state:  { [state_path: string]: StateBinding[] };
  events: { [event_path: string]: EventBinding };
}

interface VerbBinding {
  backend:       BackendKind;
  /* backend-specific fields (see 15.4) */
  [k: string]: any;
}

interface StateBinding {
  backend:       BackendKind;
  /* backend-specific fields (see 15.4) */
  extract?:      string;   /* extractor DSL string (see 15.5) */
  [k: string]: any;
}

interface EventBinding {
  backend:       BackendKind;
  /* backend-specific fields */
  [k: string]: any;
}

type BackendKind =
  | 'postmessage'
  | 'postmessage-listen'
  | 'sdk-call'
  | 'script-bridge'
  | 'dom-mirror'
  | 'same-origin-window'
  | 'synthetic-mutation'
  | 'synthetic-poll';
```

I manifesti sono JSON puro (nessun callback JS). Forge, Sumi e
qualsiasi strumento futuro li generano come dato; il runtime
interpreta i nomi dei backend a partire da un vocabolario fisso.

I verbi e gli eventi hanno **esattamente un** legame. Lo stato ha un
**array ordinato** di legami: il runtime percorre la catena in ordine e
restituisce la prima fonte che si è risolta con successo.

### 15.4 Vocabolario dei backend

| Tipo | Usato per | Campi obbligatori |
|------|----------|-----------------|
| `postmessage` | Verbo: inviare un messaggio a un iframe tramite `postMessage`. | `target` (selettore CSS dell'iframe a cui inviare), `message` (la stringa MessageId), `values` (oggetto letterale interpolato con gli argomenti), `values_from_args` (array facoltativo di chiavi di argomento inoltrate così come sono) |
| `postmessage-listen` | Evento: ascoltare un `MessageId` entrante preciso su `window.message`. | `source` (selettore CSS dell'iframe con cui filtrare l'origine; se omesso, si accetta qualsiasi origine), `message` (il MessageId da far corrispondere), `extract` (il DSL di estrazione sui dati del messaggio) |
| `sdk-call` | Verbo: chiamare una funzione JS esposta globalmente (per esempio un plugin di Figma, l'API di Excalidraw). | `path` (percorso con punti dentro `window`, per esempio `figma.currentPage.selection`), `mode` (`assign` per assegnare al percorso il valore degli argomenti, `invoke` per chiamarlo come funzione con l'oggetto degli argomenti) |
| `script-bridge` | Verbo o stato: invocare il ponte di scripting di un'applicazione (il `CallPythonScript` di Collabora, il ponte UNO di LibreOffice, Google Apps Script). | `bridge` (un identificatore proprio del backend, come `collabora.python`), `script` (identificatore dello script), `function` (nome della funzione da eseguire), `args` (oggetto letterale interpolato con gli argomenti della chiamata), `response_match` (per lo stato: il MessageId di risposta da attendere), `timeout_ms` (facoltativo, 5000 per impostazione predefinita) |
| `dom-mirror` | Stato: leggere da un elemento del DOM il cui attributo / classe / testo rispecchia uno stato interno del canvas (per esempio un pulsante della barra degli strumenti evidenziato quando la sua formattazione è attiva sulla selezione corrente). | `selector` (selettore CSS da interrogare), `extract` (il DSL di estrazione, vedi 15.5) |
| `same-origin-window` | Stato: leggere da `iframe.contentWindow.<path>` quando l'iframe è della stessa origine. Il runtime individua l'origine incrociata e passa al ripiego successivo. | `target` (selettore CSS dell'iframe), `path` (percorso con punti dentro `contentWindow`) |
| `synthetic-mutation` | Evento: sintetizzare un evento osservando le mutazioni del DOM su una o più fonti di stato e riemettendo quando il valore osservato cambia. | `observe` (array di percorsi di stato da sorvegliare; il runtime chiama `read` su ciascuno e li confronta fra una mutazione e l'altra), `throttle_ms` (facoltativo, 100 per impostazione predefinita) |
| `synthetic-poll` | Evento: sintetizzare un evento interrogando periodicamente le fonti di stato. | `observe` (array di percorsi di stato), `interval_ms` (250 per impostazione predefinita) |

Ogni backend DEVE essere implementato dal runtime come un dispatcher
autonomo (`dispatch(binding, args, context) -> Promise<value>`).
Aggiungere un tipo di backend nuovo alla specifica richiede di alzare
la versione della specifica; i runtime che ignorano i backend
sconosciuti DEVONO rifiutare i manifesti che li dichiarano (nessun
salto silenzioso).

### 15.5 Mini-DSL di estrazione

I backend di stato e il backend di evento `postmessage-listen` hanno
spesso bisogno di estrarre un campo da un oggetto più grande. Il
runtime porta un minuscolo DSL dichiarativo perché i manifesti restino
soltanto JSON:

| Sintassi | Significato | Esempio di ingresso -> uscita |
|--------|---------|-------------------------|
| `field.path.to.value` | Percorso con punti. | `{a:{b:1}}` con `a.b` -> `1` |
| `attribute:NAME` | Solo DOM: leggere `el.getAttribute(NAME)`. | `<i data-x="hi">` con `attribute:data-x` -> `'hi'` |
| `text` | Solo DOM: leggere `el.textContent`. | `<span>hi</span>` con `text` -> `'hi'` |
| `classList.contains:CLASS` | Solo DOM: `el.classList.contains(CLASS)` -> booleano. | `<button class="active">` con `classList.contains:active` -> `true` |
| `value` | Solo DOM: leggere `el.value`. | `<input value="x">` con `value` -> `'x'` |
| `present` | Solo DOM: restituisce `true` se il selettore ha risolto un elemento, `false` altrimenti. | il selettore ha corrisposto -> `true` |

Nella v2.5 la composizione non è supportata; un estrattore è
esattamente una delle righe qui sopra. Un manifesto che ha bisogno di
una trasformazione complessa dichiara invece un `script-bridge`.

### 15.6 Semantica della catena di ripieghi per `state`

`state[path]` è un array di legami. `NAC.read(plugin, path)` percorre
l'array in ordine. Per ogni legame:

1. Il runtime invoca il dispatcher del backend.
2. Se il dispatcher si risolve con un valore (compresi `false`, `0` e
   la stringa vuota, ma NON `undefined`), `read` restituisce quel
   valore.
3. Se il dispatcher rifiuta, oppure si risolve con `undefined`, il
   runtime passa al legame successivo dell'array.
4. Se nessun legame ha prodotto un valore, `read` rifiuta con
   `NacError('state_unreadable', ...)`, il cui
   `err.attempts: [...]` porta una voce per ogni backend tentato, con
   `{backend, reason}`.

Motivazione: la catena codifica l'ordine di preferenza di chi ha
scritto il manifesto. La fonte più rapida, più economica e più fresca
viene dichiarata per prima; i ripieghi degradano con eleganza. Il
runtime non sceglie mai in silenzio una fonte peggiore per prima.

### 15.7 Provenienza delle azioni sintetiche

Ogni invio di `NAC.call` emette un evento `nac:plugin:invoked` su
`document` dopo che il backend ha restituito. Il carico del dettaglio:

```js
{
  plugin:    'collabora.writer',
  verb_path: 'uno.Bold',
  backend:   'postmessage',
  request_id: 'pi_<random hex>',
  source:    'agent',     // see sec 7
  trusted:   false,
  duration_ms: 12,
  ok:        true,
  error:     null,
}
```

Stessa forma per `nac:plugin:read` (dopo un `read`) e per
`nac:plugin:event` (la riemissione di un evento sintetizzato). `source`
vale `'agent'` per impostazione predefinita; gli host che avvolgono il
runtime in un'interfaccia utente POSSONO cambiarlo con il meccanismo
che già esiste, `NAC.set_source(...)` (sezione 7).

### 15.8 Esempio svolto -- Collabora Writer

```json
{
  "slug": "collabora.writer",
  "verbs": {
    "uno.Bold": {
      "backend": "postmessage",
      "target":  "iframe[data-collabora-frame]",
      "message": "Send_UNO_Command",
      "values":  { "Command": ".uno:Bold" }
    },
    "doc.save": {
      "backend": "postmessage",
      "target":  "iframe[data-collabora-frame]",
      "message": "Action_Save",
      "values_from_args": ["DontTerminateEdit", "Notify"]
    }
  },
  "state": {
    "selection.isBold": [
      { "backend": "dom-mirror",
        "selector": "[data-nac-id='toolbar.bold']",
        "extract":  "classList.contains:selected" },
      { "backend": "script-bridge",
        "bridge":   "collabora.python",
        "script":   "yujin_state.py",
        "function": "GetSelectionState",
        "response_match": "CallPythonScript-Result",
        "extract":  "Values.is_bold" }
    ],
    "doc.modified": [
      { "backend": "same-origin-window",
        "target":  "iframe[data-collabora-frame]",
        "path":    "app.file.modified" }
    ]
  },
  "events": {
    "doc.modified": {
      "backend": "postmessage-listen",
      "source":  "iframe[data-collabora-frame]",
      "message": "Doc_ModifiedStatus",
      "extract": "Values.Modified"
    },
    "selection.changed": {
      "backend":     "synthetic-mutation",
      "observe":     ["selection.isBold", "selection.isItalic"],
      "throttle_ms": 100
    }
  }
}
```

L'agente chiama `NAC.call('collabora.writer', 'uno.Bold')`; il runtime
instrada attraverso il backend `postmessage` e invia
`Send_UNO_Command` all'iframe. Per confermare che l'effetto è avvenuto
(vedi la sezione 17), l'agente chiama
`await NAC.read('collabora.writer', 'selection.isBold')`; il runtime
prova prima lo specchio della barra degli strumenti (veloce, gratis) e
ripiega sul ponte di script Python se lo specchio non è disponibile.
L'agente non sa mai e non gli interessa mai quale fonte ha risposto.

### 15.9 Errori

`NAC.call` / `read` / `subscribe` rifiutano con un `NacError` il cui
`code` è uno di questi:

- `plugin_not_registered` -- lo slug non ha manifesto v2.5.
- `verb_not_declared` -- il percorso del verbo non è nel manifesto.
- `state_not_declared` -- il percorso dello stato non è nel manifesto.
- `event_not_declared` -- il percorso dell'evento non è nel manifesto.
- `backend_unknown` -- il manifesto dichiara un backend che il runtime
  non implementa. Il manifesto DEVE essere rifiutato al momento della
  registrazione; questo errore emerge solo se un runtime accetta un
  formato di manifesto futuro che poi non riesce a instradare.
- `backend_target_missing` -- la destinazione del backend (iframe,
  percorso JS, selettore DOM) non si trova.
- `cross_origin_blocked` -- si è tentato un `same-origin-window`
  contro un iframe di origine incrociata.
- `state_unreadable` -- tutti i legami di una catena di stato hanno
  fallito; vedi 15.6.
- `timeout` -- un backend non ha risposto entro il suo `timeout_ms`
  dichiarato (5000 per impostazione predefinita per i verbi, 1000 per
  le letture di stato).
- `invalid` -- la forma dell'argomento è sbagliata (slug non valido,
  manifesto mal formato al momento della registrazione, ecc).

---

## 16. Navigazione ad albero (v2.5 -- PUBBLICATA in 2.5.0-alpha.5 / RFC V25-02)

Primitive di navigazione gerarchica dei comandi, per i percorsi di
assistenza e gli esecutori vocali che hanno bisogno di descrivere cosa
possono fare a partire dal fuoco corrente.

**Superficie dell'API:**

- `NAC.context(plugin) -> { breadcrumb: [{nac_id, label}, ...] }`
  Risale da `document.activeElement` attraverso gli elementi antenati
  che portano `data-nac-id`, fermandosi alla radice del plugin.
  Restituisce un percorso vuoto se niente ha il fuoco dentro il
  plugin. Il `label` di ogni passo viene da `narrate` (sezione 17).

- `NAC.tree(plugin, rootId?) -> [{nac_id, label, opens?, leaf?}, ...]`
  Enumera i figli indirizzabili IMMEDIATI di `rootId` (oppure della
  radice del plugin, se omesso). "Immediato" vuol dire che non c'è
  nessun altro elemento con `data-nac-id` fra il punto di partenza e
  il figlio. Per ogni voce:
  - `label` risolto tramite `narrate`
  - `opens` rispecchia l'attributo `data-nac-opens` quando è presente
  - `leaf` vale `true` quando `data-nac-leaf` è presente

**Attributi per chi scrive:**

- `data-nac-opens="<target-nac-id>"`: dichiara che questo nodo apre /
  scende verso l'elemento identificato dall'id di destinazione.
  Permette agli agenti di seguire la catena di navigazione senza
  indovinare nomi.
- `data-nac-leaf`: marcatore terminale esplicito; gli agenti a valle
  sanno che non è possibile scendere ulteriormente.

**Errori:** `tree` restituisce `[]` per un rootId sconosciuto (vuoto
silenzioso, non un errore). `context` restituisce sempre
`{ breadcrumb: [] }` per i plugin sconosciuti.

---

## 17. Etichette di assistenza (v2.5 -- PUBBLICATE in 2.5.0-alpha.5 / RFC V25-03)

Risoluzione canonica delle etichette leggibili da una persona. Un'unica
funzione per gli screen reader, la sintesi vocale, i percorsi vocali, i
registri di audit, le superfici di assistenza mobili.

**Superficie dell'API:**

- `NAC.narrate(plugin, nac_id) -> string | null`
  Restituisce `null` se il plugin o il nac_id non si trovano.
  Altrimenti l'etichetta che segue questo ordine di priorità stretto:

  1. **`aria-label`** -- prima l'accessibilità; rispettato a meno che
     non sia soltanto spazi.
  2. **il testo visibile** -- il `textContent` dell'elemento, esclusi
     tutti i sottoalberi annidati con `data-nac-id` (quelli hanno la
     propria risoluzione di narrate; vengono esclusi perché l'uscita
     parlata resti delimitata).
  3. **`data-nac-label`** -- sovrascrittura esplicita di chi scrive;
     utile quando il testo visibile contiene glifi di icone o chiavi
     di i18n.
  4. **il `nac_id` come ultima risorsa** -- il caso peggiore; segnala
     che "non è stata scritta nessuna etichetta".

  I valori che sono soltanto spazi, a qualsiasi livello, scendono al
  livello successivo.

**Validazione:** `validate_global()` può emettere avvisi nel gruppo
`plugin_instance_violations` per i nac_id di forma ordinale (`btn-1`,
`btn-2`, ...) a cui manca una qualsiasi delle etichette dei livelli
superiori.

---

## 18. Rilevamento dell'effetto (v2.5 -- PUBBLICATO in 2.5.0-alpha.5 / RFC V25-04)

Chiude il buco del "danno silenzioso": un agente conferma l'EFFETTO di
un'azione, non soltanto che il comando è stato emesso. Le due primitive
si compongono con `NAC.read()`, quindi funziona qualsiasi backend di
V25-01 (postmessage, sdk-call, dom-mirror, ...).

**Superficie dell'API:**

- `NAC.expect(plugin, statePath, value, opts?) -> Promise<value>`
  Interroga `NAC.read(plugin, statePath)` periodicamente finché il
  comparatore non restituisce un valore vero oppure finché non scade
  il termine. Si risolve con il valore risolto; rifiuta con
  `NacError('timeout', ...)` alla scadenza.

  I fallimenti di lettura durante l'interrogazione vengono ritentati
  fino alla scadenza (trattati come "non ancora osservabile", non come
  un errore duro).

  Opzioni:
  - `timeout_ms` (`5000` per impostazione predefinita)
  - `poll_ms` (`100` per impostazione predefinita)
  - `comparator` (`(cur, want) => cur === want` per impostazione
    predefinita) Riceve `(current, expected)` e restituisce un
    booleano.

- `NAC.diff(plugin, statePath, actionFn) -> Promise<{before, after, changed}>`
  Legge lo stato, attende `actionFn()`, rilegge lo stato. Restituisce
  entrambi gli scatti e un booleano `changed` calcolato con un
  confronto JSON-stringify (quindi anche `undefined` contro un valore
  viene segnalato come cambiato). I fallimenti di lettura si riducono a
  `undefined`.

**Note di composizione:** `diff` cattura soltanto lo scatto di INIZIO e
quello di FINE; NON osserva gli stati intermedi dentro l'azione. Usa
`expect` se quello che ti interessa è "lo stato passa per un certo
valore preciso a un certo punto".

---

*Questo documento è la specifica canonica di NAC3 v2.5. Le sezioni
0-14 sono invariate rispetto alla v2.4 stabile. Le sezioni 15-18 sono
pubblicate nella v2.5. Le modifiche a questo file costituiscono
cambiamenti della specifica e richiedono un RFC; vedi
`CONTRIBUTING.md`.*
