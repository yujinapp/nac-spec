<!-- nac3-translation-store
locale: it
source: SPEC.md
source_version: 2.5.2
pass_date: 2026-10-27
engine: anthropic/claude-opus-5 (Yujin Forge)
-->

<!-- u 5e3e86e7f989 | 1 NAC3 -- Native Agent Contract | heading -->
# NAC3 -- Native Agent Contract

<!-- u 0e5eb9779108 | 1 NAC3 -- Native Agent Contract | prose -->
**Versione:** 2.5.2 (stabile -- la superficie v2.5 completa: narrate, context+tree, expect+diff)
**Stato:** Versione stabile. Il dist-tag npm `latest` punta qui; la sezione 9.1 dice che cosa garantisce e che cosa non garantisce una prerelease. Questo documento dichiara la propria versione in esattamente un posto, la riga qui sopra. Gli RFC pubblicati e le loro prove di Livello 2 + Livello 3 sono elencati in `README.md` e `runtime/CHANGELOG.md`.
**Licenza:** Apache-2.0
**Curatore:** Yujin (yujin.app)

<!-- u 0b1780790faf | 2 0. Purpose | heading -->
## 0. Scopo

<!-- u 582895d698d2 | 2 0. Purpose | prose -->
NAC3 è un contratto fra le interfacce web e gli agenti che le
guidano. Fra gli agenti ci sono gli esecutori vocali, gli intermediari
LLM, i bot RPA, gli strumenti di accessibilità e gli esecutori di test
end-to-end. Il contratto specifica:

<!-- u 7c6c7f420b83 | 2 0. Purpose | prose -->
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

<!-- u 878edf1e669e | 2 0. Purpose | prose -->
NAC3 aggiunge uno strato sottile sopra il framework con cui già
renderizzi. Non sostituisce ARIA, React, Vue né il tuo design system.

<!-- u c5107b92723f | 3 1. Roles | heading -->
## 1. Ruoli

<!-- u b4f9560e4b2f | 3 1. Roles | prose -->
Ogni elemento del DOM rilevante per un agente porta `data-nac-role`. I
ruoli canonici sono:

<!-- u dfae9890f1ae | 3 1. Roles | prose -->
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

<!-- u b08cd46560d8 | 3 1. Roles | prose -->
I ruoli fuori da questo elenco sono riservati per usi futuri. Un
runtime NAC-strict DOVREBBE rifiutare i ruoli sconosciuti al momento
della registrazione (v2.2). Un runtime NAC-permissive PUÒ trattare i
ruoli sconosciuti come `action` per compatibilità con il passato (il
comportamento predefinito in v1.9 e v2.0).

<!-- u 4252e24a246a | 3 1. Roles | prose -->
Questa tabella è l'elenco normativo, ed è pubblicata come dato: il
catalogo leggibile da una macchina in `api/latest/contract.json` porta
tutti i ruoli che il runtime di riferimento accetta, ciascuno marcato
con `declared_in_spec_table` perché i due elenchi si possano
confrontare senza leggere prosa. Coincidono alla v2.5. Ogni divergenza
futura è visibile in quel marcatore, invece di restare nascosta in una
differenza di opinione fra un documento e un'implementazione.

<!-- u ae2acf06f5be | 4 2. Names | heading -->
## 2. Nomi

<!-- u d732bc7953d1 | 4 2. Names | prose -->
Ogni elemento risolvibile da un agente porta `data-nac-id`. L'id è:

<!-- u 4984c2cad541 | 4 2. Names | prose -->
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

<!-- u 889014ee5ece | 4 2. Names | prose -->
Prefissi di id riservati (dalla 2.1):

<!-- u 1c4cc568753b | 4 2. Names | prose -->
| Prefisso | Riservato per |
|--------|--------------|
| `tab.` | Pulsanti di scheda. Il ruolo DEVE essere `tab`. |
| `modal.` | Elementi con ambito modale. Il ruolo è quello del widget foglia. |
| `field.` | Forma abbreviata di un campo di modulo. Il ruolo DEVE essere `field` oppure `option`. |
| `confirm.` | Finestre di conferma. |

<!-- u 2a54888e0697 | 5 3. Verbs | heading -->
## 3. Verbi

<!-- u d70d8aad531c | 5 3. Verbs | prose -->
Un elemento con `data-nac-role="action"` PUÒ portare
`data-nac-action="<verb>"` che nomina ciò che fa. Il verbo è un
identificatore libero in snake-case concordato fra host e agente. Verbi
comuni:

<!-- u 746c48370f66 | 5 3. Verbs | prose -->
`save`, `cancel`, `submit`, `delete`, `edit`, `view`, `create`,
`approve`, `reject`, `send`, `download`, `upload`, `refresh`,
`expand`, `collapse`, `open`, `close`, `add_row`, `remove_row`.

<!-- u 956edf53a876 | 5 3. Verbs | prose -->
`NAC.click_by_verb(plugin, verb)` risolve un verbo all'unica azione
sotto quel plugin e ci fa clic. Che più azioni condividano lo stesso
verbo sotto un unico plugin è un errore di manifesto (lint:
`duplicate_verb`).

<!-- u 28e680935920 | 6 4. Manifest | heading -->
## 4. Manifesto

<!-- u 6b623deee5e0 | 6 4. Manifest | prose -->
Ogni plugin PUÒ registrare un manifesto tramite:

<!-- u d0d1394734ea | 6 4. Manifest | prose -->
Il manifesto è la fonte di verità rivolta all'agente. Un intermediario
LLM che decide che "l'utente ha detto 'guardar'" consulta il manifesto
del plugin, trova il verbo `save` ed emette
`NAC.click_by_verb('invoice', 'save')`.

<!-- u a6be4d566708 | 7 4.1 Required fields | heading -->
### 4.1 Campi obbligatori

<!-- u d190057894b0 | 7 4.1 Required fields | prose -->
- `plugin_slug` -- corrisponde al `data-nac-plugin` dell'elemento host.
- `nac_version` -- la versione di NAC3 con cui questo manifesto
  dichiara di essere conforme. Il runtime rifiuta i manifesti che
  dichiarano una versione più alta della propria.

<!-- u 58cac67a09e6 | 8 4.2 Optional fields | heading -->
### 4.2 Campi facoltativi

<!-- u 87ea0145c2ce | 8 4.2 Optional fields | prose -->
- `elements[]` -- il catalogo dei widget con nome. Ogni voce DEVE avere
  `id` e `role`.
- `tabs[]` -- un array di primo livello separato, per le schede.
  Equivale a voci di `elements[]` con `role:'tab'`. Entrambe le forme
  sono valide.
- `fields[]`, `actions[]`, `kpis[]`, `data_tables[]` --
  sottocollezioni tipizzate; stessa semantica di `elements[]` filtrato
  per ruolo. Le demo scelgono la forma che si legge meglio per una
  persona.

<!-- u 3a8b6f4f8129 | 9 4.3 i18n | heading -->
### 4.3 i18n

<!-- u 6a665e6998c7 | 9 4.3 i18n | prose -->
Ogni `label_i18n` DEVE coprire tutte le 10 locale di NAC3:

<!-- u fa9df7559758 | 9 4.3 i18n | prose -->
`i18n_strict: 'permissive'` su `NAC.autoRegister.watch()` ammette una
copertura parziale durante una migrazione brownfield; i manifesti di
produzione dovrebbero pubblicare tutte le 10 locale.

<!-- u 672b32007192 | 10 4.3.1 What the ten locales are a requirement ON | heading -->
#### 4.3.1 Su che cosa ricade il requisito delle dieci locale

<!-- u e01d2e357587 | 10 4.3.1 What the ten locales are a requirement ON | prose -->
Il requisito qui sopra ricade sul **manifesto di chi adotta**: la mappa
`label_i18n` che un agente legge per nominare un elemento nella lingua
dell'utente. NON ricade sulla lingua di questo documento, e niente in
NAC3 obbliga un'implementazione a pubblicare la propria documentazione
in dieci lingue.

<!-- u 6345c3141c02 | 11 4.3.2 Normative language of this specification | heading -->
#### 4.3.2 Lingua normativa di questa specifica

<!-- u 0496b01c0221 | 11 4.3.2 Normative language of this specification | prose -->
Il testo normativo di NAC3 è quello **inglese**: il `SPEC.md` nella
radice del repository della specifica, reso in
`https://yujin.app/nac-spec/SPEC.html`.

<!-- u 5ac523ec3a00 | 11 4.3.2 Normative language of this specification | prose -->
La specifica è pubblicata anche come traduzioni automatiche sotto
`i18n/<locale>/SPEC.md`. Quelle traduzioni sono **non normative**. Ognuna
dichiara, in un cartello che il lettore vede e in un frontmatter
leggibile da una macchina, quale revisione inglese traduce e quanta ne
copre; il cartello è obbligatorio, e una traduzione pubblicata senza
cartello è un difetto della pubblicazione, non della traduzione. Quando
una traduzione e il testo inglese non concordano, vale il testo inglese,
e una dichiarazione di conformità è una dichiarazione rispetto al testo
inglese.

<!-- u 22e3daff7a29 | 11 4.3.2 Normative language of this specification | prose -->
Una traduzione in ritardo rispetto all'inglese **non blocca mai la
pubblicazione dell'inglese**. Il testo normativo esce quando è pronto;
una traduzione vecchia viene segnalata, unità per unità, e la versione
parte. Nove artefatti automatici non hanno potere di veto sul documento
che traducono. Fino alla 2.5.1 le nove coprivano 34 delle 83 sezioni e
niente lo diceva; ora vengono prodotte da un archivio per lingua, e la
procedura è `docs/TRANSLATION_PASS.md`.

<!-- u a168e1e445ba | 12 5. Public API | heading -->
## 5. API pubblica

<!-- u e99a6820076b | 13 5.1 Imperative | heading -->
### 5.1 Imperativa

<!-- u 935555476ddb | 14 5.1.1 Conformance helper (v2.2) | heading -->
### 5.1.1 Aiuto alla conformità (v2.2)

<!-- u 61773eab5781 | 14 5.1.1 Conformance helper (v2.2) | prose -->
`NAC.bindAction(el, handler, ctx)` è il modo conforme alla specifica di
collegare un gestore di clic. Emette `nac:action:succeeded` (oppure
`:failed`) automaticamente dopo l'esecuzione del gestore (sincrono, con
eccezione o Promise). Restituisce una funzione per scollegarlo. Usalo
invece di un `addEventListener('click', ...)` nudo ogni volta che
l'host lo permette; il codice brownfield può continuare a emettere
l'evento a mano come prima.

<!-- u f3cb221e90bf | 15 5.1.3 Field editor (v2.3) | heading -->
### 5.1.3 Editor di campo (v2.3)

<!-- u d53a2b25eb60 | 15 5.1.3 Field editor (v2.3) | prose -->
`NAC.edit_field(nac_id)` apre una finestra modale che permette a una
persona (o a un agente a suo nome) di modificare qualsiasi campo di
testo con strumenti in stile elaboratore di testi:

<!-- u 7bdd9e99f71e | 15 5.1.3 Field editor (v2.3) | prose -->
La finestra si registra sotto `plugin_slug='nac_editor'` con questi
verbi invocabili da NAC3:

<!-- u 223097f9e322 | 15 5.1.3 Field editor (v2.3) | prose -->
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

<!-- u 9b5784a95c17 | 15 5.1.3 Field editor (v2.3) | prose -->
Esc chiude (annulla). Ctrl/Cmd+Invio salva. Un clic sullo sfondo
dell'overlay annulla.

<!-- u 4a9ebc2b57dd | 15 5.1.3 Field editor (v2.3) | prose -->
La sezione 13 della specifica formalizzerà il contratto nella v2.3; il
runtime v2.2 pubblica un'implementazione di riferimento funzionante
perché chi adotta possa collegarla già oggi. Disponibile su qualsiasi
campo tramite:

<!-- u 8aff4d81ab57 | 16 5.1.4 Action payload + invoke (v2.3) | heading -->
### 5.1.4 Payload dell'azione + invoke (v2.3)

<!-- u 8dbd703fb6af | 16 5.1.4 Action payload + invoke (v2.3) | prose -->
Le azioni di NAC v2.2 sono del tipo clic-e-via: un agente innesca
`NAC.click(id)` oppure `NAC.click_by_verb(plugin, verb)` e l'host fa
quello che fa. Funziona per le azioni di verbo e stato (`save`,
`cancel`, `submit`, `delete`) ma crolla quando un'azione ha bisogno di
**dati** dall'agente -- `utter(text)`, `search(query)`,
`send_message(body)`, `upload(file)`, `schedule(date)`,
`translate(text, target_lang)`. L'host non ha modo di ricevere il
payload dell'agente tramite un clic sintetico.

<!-- u 121175aff245 | 16 5.1.4 Action payload + invoke (v2.3) | prose -->
La v2.3 chiude quel buco. Il contratto è additivo: i verbi in stile
clic continuano a funzionare senza cambiamenti.

<!-- u 1e70a9ba51ec | 16 5.1.4 Action payload + invoke (v2.3) | prose -->
`NAC.invoke` invia un `CustomEvent` `nac:action:requested`
sull'elemento host (risale fino a document) con:

<!-- u af505024f97e | 16 5.1.4 Action payload + invoke (v2.3) | prose -->
L'host ascolta `nac:action:requested`, elabora il payload ed emette
`nac:action:succeeded` (oppure `nac:action:failed`) con lo stesso
`request_id` nel dettaglio. Il runtime correla per `request_id` e
risolve la Promise dell'agente.

<!-- u abc54909999b | 16 5.1.4 Action payload + invoke (v2.3) | prose -->
Il timeout predefinito è di **30 secondi** (contro 5 s per il clic). Si
cambia con `opts.timeout`. Alla scadenza la Promise viene rifiutata con
`NacError('timeout', ...)`. Come per il clic, una scadenza significa un
fallimento reale: chi chiama DEVE trattarla come tale, a meno che non
abbia la prova dell'effetto per un altro canale.

<!-- u f20ea060f5a1 | 16 5.1.4 Action payload + invoke (v2.3) | prose -->
`NAC.utter(id, opts)` è la scorciatoia ergonomica per il verbo con
payload più comune. Equivale a:

<!-- u 494cdb0b8183 | 17 Manifest declaration | heading -->
#### Dichiarazione nel manifesto

<!-- u 237fe9674ed4 | 17 Manifest declaration | prose -->
Un'azione che porta un payload dichiara lo schema di quel payload nella
sua voce di manifesto, per tracciabilità e per gli strumenti:

<!-- u 6332c86c203d | 17 Manifest declaration | prose -->
`payload_schema` è **informativo alla v2.5**, e il runtime di
riferimento non lo legge affatto: il campo viene accettato in un
manifesto, viaggia in `NAC.manifest()` e non viene mai validato contro
nulla. `NAC.STRICT_VALIDATION` -- il cui valore predefinito è
effettivamente passato a `true` nella 2.3.0 -- copre soltanto i
riscontri di ruolo del manifesto e del DOM; non ha mai coperto i
payload. Quindi un agente NON DEVE supporre che un payload sia stato
verificato perché è stato dichiarato uno schema: oggi l'unica
validazione che avviene è quella che fa l'agente prima di inviare.

<!-- u 5f7dd2251b4c | 17 Manifest declaration | prose -->
Gli schemi sono volutamente semplici (un sottoinsieme con la forma di
JSON-Schema) perché un runtime possa validare senza imbarcare un
validatore JSON-Schema completo, e quella resta l'intenzione di
progetto per quando il requisito verrà applicato.

<!-- u 5ca132eea4a7 | 17 Manifest declaration | prose -->
Una revisione precedente di questa sezione prometteva, per la versione
2.4, di formalizzare la grammatica dello schema e di renderne
obbligatoria l'applicazione. **Non è avvenuto nella 2.4 e non è
avvenuto fino alla 2.5.** La frase viene rimossa invece di essere
ridatata: una promessa con un numero di versione attaccato, lasciata in
piedi oltre quella versione, per un agente si legge come una capacità
su cui può contare. Formalizzare la grammatica e collegare
l'applicazione è tracciato come domanda aperta nella sezione 13, dove
risulta aperta e senza data.

<!-- u a8a904fe4f7c | 18 Disabled-state semantics (v2.3 hotfix from alpha.2) | heading -->
#### Semantica dello stato disabilitato (correzione v2.3 arrivata da alpha.2)

<!-- u 1c4abe1b856c | 18 Disabled-state semantics (v2.3 hotfix from alpha.2) | prose -->
`NAC.invoke` NON rifiuta quando l'elemento di destinazione ha impostato
`disabled` oppure `aria-disabled='true'`. L'attributo HTML `disabled` è
una protezione del clic a livello di interfaccia; `invoke` è una
richiesta logica che porta un payload, non un clic sintetico. Gli host
che hanno bisogno di rifiutare un invoke in base allo stato
dell'interfaccia DEVONO farlo nel loro ascoltatore di
`nac:action:requested` ed emettere `nac:action:failed` con un codice di
errore che significhi qualcosa.

<!-- u 6840d6a4d6c1 | 18 Disabled-state semantics (v2.3 hotfix from alpha.2) | prose -->
`NAC.click`, al contrario, rifiuta ANCORA sugli elementi disabilitati
(la semantica del clic è preservata). Copertura di test:
`runtime/test/v23-invoke.mjs` T7/T8/T9.

<!-- u 81d52460e217 | 19 Conformance: hosts that support invoke MUST | heading -->
#### Conformità: gli host che supportano invoke DEVONO

<!-- u 55f1c3270fad | 19 Conformance: hosts that support invoke MUST | prose -->
1. Dichiarare `actions[].payload_schema` nella voce del manifesto.
2. Ascoltare `nac:action:requested` (oppure usare un ascoltatore
   generico che filtri per `detail.action_id` + `detail.verb`).
3. Emettere `nac:action:succeeded` -- con `detail.request_id`
   restituito uguale -- dopo l'elaborazione, oppure
   `nac:action:failed` (con il codice in `detail.error`) in caso di
   fallimento.
4. MAI emettere un evento `:succeeded` con un `request_id` che non
   hanno ricevuto (evita l'incrocio fra invocazioni concorrenti).

<!-- u baa88e13de62 | 19 Conformance: hosts that support invoke MUST | prose -->
Gli host che NON supportano invoke continuano a funzionare normalmente
con `NAC.click()` e `NAC.click_by_verb()`. Gli agenti che chiamano
`NAC.invoke()` contro un host senza una voce
`actions[].payload_schema` riceveranno comunque un `request_id`, ma il
runtime non può garantire la consegna; il timeout scatta dopo 30 s.

<!-- u eeaad94068b6 | 20 Why this matters | heading -->
#### Perché questo conta

<!-- u 282e3ea6a073 | 20 Why this matters | prose -->
L'intera superficie agentica smette di essere "un elenco di pulsanti" e
diventa "un elenco di pulsanti + input strutturati". Un annuncio vocale
diventa invocabile con NAC.invoke. Una barra di ricerca diventa
invocabile con NAC.invoke. Un caricamento di file diventa invocabile con
NAC.invoke. Stesso protocollo, stessa provenienza, stessa semantica di
conferma.

<!-- u 828f3eb13a49 | 20 Why this matters | prose -->
Il primo adottante di riferimento è **Atlas Pro**: il suo elemento
`atlas_pro_ad.mic` dichiara sia il verbo `listen` (solo clic, quello
che già c'era) sia `utter` (con payload). Lo stesso ciclo
conversazionale di `/parse` + `/tts` guida in entrambi i casi; gli
agenti che hanno il riconoscimento vocale chiamano `listen`, quelli che
hanno un proprio modello linguistico chiamano `utter`.

<!-- u 3e2476dc9b6d | 21 Forward modalities (anticipated, no spec change require | heading -->
#### Modalità future (previste, senza cambio di specifica)

<!-- u 96e747f48094 | 21 Forward modalities (anticipated, no spec change require | prose -->
`invoke` è volutamente agnostico rispetto alla modalità, perché le
famiglie di input che arriveranno si innestino senza rompere il
contratto:

<!-- u 7b40b2227261 | 21 Forward modalities (anticipated, no spec change require | prose -->
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

<!-- u 93d49eb65964 | 21 Forward modalities (anticipated, no spec change require | prose -->
Ogni modalità segue lo stesso protocollo di eventi
`nac:action:requested` -> `nac:action:succeeded` / `:failed`, la stessa
correlazione per `request_id`, la stessa semantica di timeout. Il
runtime resta piccolo; il vocabolario dei verbi cresce per convenzione
fra host e agenti. Le scorciatoie ergonomiche (`NAC.utter`,
`NAC.search`, `NAC.watch`, ecc.) si possono aggiungere più tardi senza
rispecificare nulla, perché ognuna è un involucro sottile sopra
`invoke`.

<!-- u 0b074c9e1737 | 22 5.1.5 Shadow DOM resolution -- open roots (v2.3) | heading -->
### 5.1.5 Risoluzione nello shadow DOM -- radici aperte (v2.3)

<!-- u 1636464273f9 | 22 5.1.5 Shadow DOM resolution -- open roots (v2.3) | prose -->
Il runtime risolve i riferimenti `data-nac-id` attraverso le radici
shadow aperte, in modo ricorsivo. Una pagina può montare Web Components
con `attachShadow({mode:'open'})`, mettere attributi `data-nac-*` su
elementi dentro l'albero shadow, e qualsiasi chiamante NAC3
(`NAC.click`, `NAC.fill`, `NAC.invoke`, ecc.) risolve la destinazione
in modo trasparente.

<!-- u b3a1385f2a5d | 23 Resolution algorithm | heading -->
#### Algoritmo di risoluzione

<!-- u 9b00de664df3 | 23 Resolution algorithm | prose -->
Per un selettore `S` (tipicamente `[data-nac-id="..."]`) contro una
radice `R` (tipicamente `document`):

<!-- u 5f20e7f1e3d3 | 23 Resolution algorithm | prose -->
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

<!-- u bde7cd44c2f1 | 24 Event propagation | heading -->
#### Propagazione degli eventi

<!-- u 872114c02287 | 24 Event propagation | prose -->
Gli eventi emessi da host dentro radici shadow DEVONO impostare
`composed: true` perché gli ascoltatori a livello di document li
ricevano. Il runtime di NAC3 emette già tutti i propri eventi con
`composed:true`; il codice dell'host che emette eventi `nac:*` a mano è
responsabile della stessa cosa. Senza `composed:true` l'evento si
ferma al confine dello shadow e il meccanismo di correlazione del
runtime non lo vede mai.

<!-- u 4fd85059ee08 | 25 Author responsibility | heading -->
#### Responsabilità di chi scrive il componente

<!-- u fa8b14bc2a42 | 25 Author responsibility | prose -->
Chi scrive il componente deve:

<!-- u 29626dc95548 | 25 Author responsibility | prose -->
1. Mettere `data-nac-id`, `data-nac-role`, `data-nac-action` sugli
   elementi operabili dentro la radice shadow.
2. Impostare `composed:true` su qualsiasi evento personalizzato che
   l'host emetta per segnalare un contratto NAC3
   (`nac:action:succeeded`, `nac:field:changed`, ecc.).
3. Evitare `<slot>` per gli elementi che devono restare isolati nello
   shadow -- i nodi messi in uno slot vivono nel light DOM e vengono
   risolti lì.

<!-- u 818fc31bb7f1 | 25 Author responsibility | prose -->
Per le radici shadow aperte non serve nessun suggerimento nel manifesto
né nessuna attivazione nel runtime; la risoluzione è automatica.

<!-- u 465f7ae635af | 26 Reference implementation | heading -->
#### Implementazione di riferimento

<!-- u 2a8c8ecad562 | 26 Reference implementation | prose -->
Il runtime di riferimento espone due aiuti interni,
`_deepQuery(selector, root)` e `_deepQueryAll(selector, root)`, che
fanno il percorso. Gli aiuti pubblici `NAC.click`, `NAC.fill`,
`NAC.invoke`, `NAC.describe`, ecc., passano tutti dalle varianti
profonde.

<!-- u cce9bcee3ad4 | 27 Demos and tests | heading -->
#### Demo e test

<!-- u 3d3ef999b0ae | 27 Demos and tests | prose -->
- `example-v23-shadow-open.php` -- demo di shadow aperto annidato a 1,
  2 e 3 livelli.
- `runtime/test/v23-shadow.mjs` T1-T3, T10 -- copertura unitaria,
  compreso il limite di profondità.

<!-- u 27cadaa47199 | 28 5.1.6 Shadow DOM resolution -- closed roots, voluntary  | heading -->
### 5.1.6 Risoluzione nello shadow DOM -- radici chiuse, esposizione volontaria (v2.3)

<!-- u e1bdc1f1cb70 | 28 5.1.6 Shadow DOM resolution -- closed roots, voluntary  | prose -->
Le radici shadow chiuse (`attachShadow({mode:'closed'})`) sono opache
da fuori il codice di chi ha scritto il componente: è un confine di
sicurezza del browser, non una decisione di NAC3. NAC3 non può arrivare
dentro se chi ha scritto il componente non espone volontariamente una
superficie interrogabile tramite il contratto qui sotto.

<!-- u cc5e4a5b830e | 29 The `el.nac3` interface contract | heading -->
#### Il contratto di interfaccia `el.nac3`

<!-- u 76ac0cb03f1e | 29 The `el.nac3` interface contract | prose -->
Un elemento personalizzato PUÒ esporre un oggetto di interfaccia sul
proprio host, tramite un getter chiamato `nac3`:

<!-- u 9d8b08a63d0f | 29 The `el.nac3` interface contract | prose -->
I componenti aderiscono implementando il getter. I componenti che NON
aderiscono restano inaccessibili ai chiamanti NAC3 (le loro parti
interne restano private, come il browser intende).

<!-- u d267ac2618bd | 30 Resolution semantics | heading -->
#### Semantica della risoluzione

<!-- u d5f238d3820d | 30 Resolution semantics | prose -->
Durante `_deepQuery(selector)`, per ogni elemento visitato `el` con
`el.shadowRoot === null`:

<!-- u 3955816b33aa | 30 Resolution semantics | prose -->
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

<!-- u 75f86a587f3d | 31 Error event detail shapes | heading -->
#### Forma del dettaglio degli eventi di errore

<!-- u d89cbc6658d3 | 31 Error event detail shapes | prose -->
Dettaglio di `nac:shadow_blocked`:

<!-- u c01abbbc2bac | 31 Error event detail shapes | prose -->
Dettaglio di `nac:shadow_protocol_violation`:

<!-- u cdc7ee5d5dc1 | 31 Error event detail shapes | prose -->
Entrambi gli eventi risalgono (`bubbles: true`) e attraversano i
confini dello shadow (`composed: true`). La deduplicazione è per host,
tramite un WeakSet tenuto dal runtime; uno stesso host emette ciascun
evento **al massimo una volta per caricamento di pagina**.

<!-- u 5fd63d2eb19d | 32 Why voluntary | heading -->
#### Perché è volontaria

<!-- u 64413da3b9b6 | 32 Why voluntary | prose -->
L'opacità dello shadow chiuso è imposta dal browser. Anche se NAC3
definisse un meccanismo non volontario, il browser lo impedirebbe.
L'esposizione volontaria lascia a chi scrive il componente il controllo
completo di come appare la sua superficie pubblica per gli agenti.

<!-- u 374ef204681b | 32 Why voluntary | prose -->
Il costo è l'adesione componente per componente; il beneficio è che gli
agenti conformi a NAC3 funzionano contro design system con componenti a
shadow chiuso (Salesforce Lightning, alcuni componenti di GitHub
Primer, widget sensibili per sicurezza) senza codice adattatore per
componente.

<!-- u 08aa8d40de06 | 33 Demos and tests | prose -->
- `example-v23-shadow-closed.php` -- il caso positivo
  (`<todo-card-closed-exposed>`) e quello negativo
  (`<todo-card-closed-blind>`) uno accanto all'altro, con pannelli di
  verdetto + registro eventi in tempo reale.
- `runtime/test/v23-shadow.mjs` T4-T9 -- copertura unitaria di ogni
  famiglia di eventi di errore, più la semantica di deduplicazione.
- `guides/SHADOW_DOM_CLOSED.md` -- guida per chi scrive componenti.

<!-- u 230b5b4555fa | 34 5.1.7 Auth-aware capabilities (v2.3) | heading -->
### 5.1.7 Capacità consapevoli dell'autorizzazione (v2.3)

<!-- u eb36568e63b4 | 34 5.1.7 Auth-aware capabilities (v2.3) | prose -->
NAC3 v2.3 permette al manifesto di dichiarare, azione per azione, quali
capacità sono richieste, e con questo blocca `NAC.click` e `NAC.invoke`
prima dell'invio. L'agente riceve un rifiuto rapido
(`code='capability_required'`) invece di un andata e ritorno che
fallisce sul server.

<!-- u 3394e13a69f2 | 35 Manifest declaration | prose -->
Un requisito di capacità si attacca al livello dell'elemento o al
livello del verbo. Se ci sono entrambi, vince quello del verbo.

<!-- u ed181c92022d | 35 Manifest declaration | prose -->
Per una semantica di E logico ("all'utente servono TUTTE queste
capacità"), dichiarale una per una tramite azioni bloccate separate,
oppure componi sull'host nell'ascoltatore di `nac:action:requested`.

<!-- u 41895cfbb955 | 36 Public API | heading -->
#### API pubblica

<!-- u 5c22e765201e | 36 Public API | prose -->
`setCapabilities` sostituisce l'insieme intero (usalo per il login o il
rinnovo della sessione). `grantCapability` / `revokeCapability` sono
incrementali. `userCapabilities` restituisce un array con
un'istantanea. `setCapabilities(null)` svuota l'insieme.

<!-- u 519e43ca0c04 | 36 Public API | prose -->
Gli host chiamano questi metodi ogni volta che cambia il ruolo
dell'utente. L'insieme vive nel runtime; non serve ricaricare nessun
manifesto.

<!-- u 4147b564fd7d | 37 Gate semantics | heading -->
#### Semantica del blocco

<!-- u b7a3a617e58d | 37 Gate semantics | prose -->
Prima dell'invio, `NAC.click(id)` e `NAC.invoke(id, payload)` cercano
la voce di manifesto corrispondente (elemento + verbo), leggono
`requires_capability` e chiamano `_hasCapability`:

<!-- u 55539817baee | 37 Gate semantics | prose -->
- Nessun requisito dichiarato -> consentito.
- Requisito dichiarato e l'insieme corrente lo soddisfa -> consentito.
- Requisito dichiarato e l'insieme corrente NON lo soddisfa -> rifiuto
  con `NacError('capability_required', ...)` E emissione di
  `nac:command:rejected` con
  `detail.reason='capability_required'`.

<!-- u 61bc21f3c289 | 37 Gate semantics | prose -->
Il blocco scatta DOPO i controlli di `not_found` / `disabled` /
`hidden` su `click`, perché emerga il fallimento più specifico. Su
`invoke`, il blocco scatta prima che parta l'evento di richiesta
(l'host non vede mai un tentativo non autorizzato).

<!-- u 03badbc3eb0d | 38 Why this matters | prose -->
Senza il blocco, un agente che chiama `NAC.click('finance.delete')` o
riesce (nessun blocco di autorizzazione -> falla di sicurezza) o
fallisce sul server con un 403 diversi secondi dopo. Con il blocco,
l'agente scopre in modo sincrono che gli manca la capacità e può
reagire come si deve (chiedere un altro percorso, chiedere
un'elevazione di permessi, mostrare il vincolo all'utente).

<!-- u e2ef7786fa19 | 38 Why this matters | prose -->
Questo completa -- non sostituisce -- l'autorizzazione sul server. Gli
host DEVONO continuare a far valere i permessi sul server. Il blocco
sul client è un'ottimizzazione dell'esperienza e un segnale a livello di
intenzione, non un confine di sicurezza.

<!-- u cda6b9e803c0 | 39 Demos and tests | prose -->
- `runtime/test/v23-capabilities.mjs` -- 17 asserzioni che coprono
  lettura e scrittura dell'insieme, concessione e revoca, il blocco del
  clic, il blocco dell'invoke, la risoluzione fra livello di verbo e
  livello di elemento, la semantica di O logico, lo svuotamento con
  null, il rifiuto degli input non validi, e la regressione delle
  azioni senza blocco.

<!-- u 79530c72b823 | 40 5.1.2 Strict validation flag (v2.2; default-flipped in  | heading -->
### 5.1.2 Flag di validazione stretta (v2.2; valore predefinito invertito nella v2.3)

<!-- u 7206e583b3eb | 40 5.1.2 Strict validation flag (v2.2; default-flipped in  | prose -->
`NAC.STRICT_VALIDATION` (booleano). Quando vale `true`,
`NAC.register()` solleva un `Error` con `code='strict_validation'` e un
array `findings` in uno qualsiasi di questi casi:

<!-- u 1f68e4a109ee | 40 5.1.2 Strict validation flag (v2.2; default-flipped in  | prose -->
- `manifest_role_unknown` -- il ruolo della voce è fuori dall'insieme
  canonico.
- `tab_id_manifest_role_drift` -- l'id corrisponde a `^tab\.` ma il
  ruolo non è `'tab'`.
- `manifest_dom_role_mismatch` -- il `data-nac-role` dell'elemento
  montato nel DOM è diverso dal ruolo della voce del manifesto.

<!-- u c981b4852469 | 40 5.1.2 Strict validation flag (v2.2; default-flipped in  | prose -->
**Valore predefinito:**

<!-- u 1aa996774f91 | 40 5.1.2 Strict validation flag (v2.2; default-flipped in  | prose -->
- **v2.2.x:** `false` (solo avviso). A chi adottava serviva una
  finestra di migrazione.
- **v2.3.x:** **`true`** (solleva). La finestra di migrazione si è
  chiusa con la linea v2.2. Chi adotta con manifesti pieni di
  scostamenti si tira fuori impostando
  `NAC.STRICT_VALIDATION = false` PRIMA di qualsiasi chiamata a
  `register()`.
- **v3.0:** il flag viene rimosso (stretto è l'unica modalità).

<!-- u cf1e1b799422 | 40 5.1.2 Strict validation flag (v2.2; default-flipped in  | prose -->
Vedi `guides/MIGRATION_v2.2_to_v2.3.md` per il copione di pulizia dei
riscontri di scostamento.

<!-- u cdd2e2a2034f | 40 5.1.2 Strict validation flag (v2.2; default-flipped in  | prose -->
Tutti i metodi asincroni rifiutano con un `NacError` il cui `code` è
uno di questi:

<!-- u 7cdfcbe3b161 | 40 5.1.2 Strict validation flag (v2.2; default-flipped in  | prose -->
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

<!-- u d50c9290e353 | 41 5.2 Introspection | heading -->
### 5.2 Introspezione

<!-- u 68e75bf70e68 | 42 5.3 Data tables (since 2.1) | heading -->
### 5.3 Tabelle di dati (dalla 2.1)

<!-- u e835e9440f25 | 42 5.3 Data tables (since 2.1) | prose -->
Le primitive di tabella di dati NON fanno parte del runtime centrale
(`js/nac.js` / il `nac.mjs` di `@nac3/runtime`). Arrivano nel modulo di
estensioni per brownfield `js/nac-v2-extensions.js` (pubblicato come
`@nac3/runtime/extensions`), che le attacca allo stesso oggetto
`window.NAC` dopo essersi caricato. Carica il modulo di estensioni dopo
il runtime centrale per avere la superficie `dt_*`:

<!-- u 1702f2abb7ea | 42 5.3 Data tables (since 2.1) | prose -->
I metodi qui sotto esistono solo quando il modulo di estensioni è
caricato; chiamarli su un runtime con il solo nucleo non fa niente /
restituisce `undefined`.

<!-- u ebe9fa027ecd | 42 5.3 Data tables (since 2.1) | prose -->
Una tabella di dati ha un `subkind`:

<!-- u 731086aa49b1 | 42 5.3 Data tables (since 2.1) | prose -->
- `collection` -- righe ordinate, con conferma transazionale
  facoltativa. Usata per le righe di una fattura, gli articoli di un
  carrello, le voci di un registro.
- `matrix` -- una griglia riga x colonna in cui ogni cella porta un
  valore. Usata per le matrici di permessi, le griglie di orari.
- `matrix-singletree` -- una matrice in cui ogni riga si ripiega in un
  albero (raro).

<!-- u bf57d7617b5a | 43 5.4 Strict resolution + disambiguation (v2.4) | heading -->
### 5.4 Risoluzione stretta + disambiguazione (v2.4)

<!-- u 5ce8d66447ea | 43 5.4 Strict resolution + disambiguation (v2.4) | prose -->
NAC3 v2.4 rende **stretta** la risoluzione di id, verbo, qualificatore
ed etichetta. I verbi che risolvono una richiesta a un unico elemento
del DOM -- `click_by_verb`, `tab` (nella forma a un argomento) e
`tab_by_label` -- non tirano più a indovinare. Quando una richiesta
risolve a zero candidati o a più di uno, il runtime solleva un
`NacError` che porta l'elenco dei candidati E emette un evento
`nac:disambiguation_requested`, invece di inviare in silenzio al primo
che somiglia.

<!-- u 1360c72f2adf | 43 5.4 Strict resolution + disambiguation (v2.4) | prose -->
Questo è l'invariante di **zero danno silenzioso**. Esiste per il
software di assistenza e per gli agenti, dove un invio silenzioso
all'elemento sbagliato senza via di recupero è un bloccante di
sicurezza. Il comportamento indulgente di prima della 2.4 -- un
ripiego con `indexOf` per sottostringa che risolveva al primo che
somigliava -- è stato rimosso.

<!-- u 61c212ab5c75 | 43 5.4 Strict resolution + disambiguation (v2.4) | prose -->
> Compatibilità con il passato: la v2.4 è un cambiamento del
> *comportamento del contratto*. I percorsi di codice che già
> passavano argomenti senza ambiguità continuano a funzionare
> identici. I percorsi di codice che dipendevano dal ripiego
> indulgente con `indexOf` per risolvere al primo che somigliava ora
> solleveranno un'eccezione -- per scelta.

<!-- u 9ded25436c09 | 44 5.4.1 Strict qualifier matching (`click_by_verb`) | heading -->
#### 5.4.1 Corrispondenza stretta del qualificatore (`click_by_verb`)

<!-- u 03e301b58109 | 44 5.4.1 Strict qualifier matching (`click_by_verb`) | prose -->
`click_by_verb(plugin, verb, opts?)` sceglie fra i nodi del DOM che
condividono `data-nac-action="<verb>"`. Quando viene fornito
`opts.qualifier` (una stringa), un elemento corrisponde **solo** se il
suo `data-nac-id` soddisfa:

<!-- u 3c202d4daa0e | 44 5.4.1 Strict qualifier matching (`click_by_verb`) | prose -->
Cioè: uguaglianza esatta dell'id, oppure un suffisso ancorato dopo un
separatore `__`. **Non c'è nessun ripiego per sottostringa**. Un
qualificatore che è soltanto una sottostringa di un id (non uguale, non
un `__suffix` ancorato) NON corrisponde.

<!-- u a814e14491fc | 44 5.4.1 Strict qualifier matching (`click_by_verb`) | prose -->
- 0 corrispondenze -> solleva
  `NacError('no_matching_instance', ...)`.
- esattamente 1 corrispondenza -> risolve e fa clic.
- >1 corrispondenze -> solleva
  `NacError('ambiguous_qualifier', ...)`.

<!-- u 4218e75d95da | 44 5.4.1 Strict qualifier matching (`click_by_verb`) | prose -->
`opts.qualifier_ordinal` (un numero) sceglie per posizione fra tutti
gli elementi del DOM che condividono il verbo, scavalcando la
corrispondenza di qualificatore.

<!-- u d62dc6b56ca3 | 45 5.4.2 Strict id resolution (`tab`) | heading -->
#### 5.4.2 Risoluzione stretta di id (`tab`)

<!-- u 1a464a4756f3 | 45 5.4.2 Strict id resolution (`tab`) | prose -->
Forma a un argomento di `tab(plugin, id)`: vince una corrispondenza
esatta di `data-nac-id` nel DOM. Altrimenti il runtime cerca le
istanze il cui id comincia con `id + "__"`:

<!-- u 2cae0a8b088f | 45 5.4.2 Strict id resolution (`tab`) | prose -->
- 0 istanze qualificate e nessun id esatto ->
  `no_matching_instance`.
- esattamente 1 -> risolve.
- >1 -> `ambiguous_tab` (passa l'id qualificato completo).

<!-- u 9dd62e535c05 | 46 5.4.3 Strict label resolution (`tab_by_label`) | heading -->
#### 5.4.3 Risoluzione stretta per etichetta (`tab_by_label`)

<!-- u 6bd19a3dd928 | 46 5.4.3 Strict label resolution (`tab_by_label`) | prose -->
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

<!-- u 4da1ef43f342 | 47 5.4.4 Error codes | heading -->
#### 5.4.4 Codici di errore

<!-- u b30b09fb4fb9 | 47 5.4.4 Error codes | prose -->
| `err.code` | Sollevato da | Significato |
|------------|-----------|---------|
| `no_matching_instance` | `click_by_verb` (qualificatore), `tab` | nessun elemento corrisponde al qualificatore / id |
| `ambiguous_qualifier`  | `click_by_verb` | più di 1 elemento corrisponde al qualificatore |
| `ambiguous_tab`        | `tab`           | più di 1 istanza qualificata `id__` corrisponde |
| `ambiguous_label`      | `tab_by_label`  | più di 1 scheda corrisponde all'etichetta (a qualsiasi livello) |
| `not_found`            | `tab_by_label`  | nessuna scheda corrisponde all'etichetta |

<!-- u 2eacef367ba7 | 48 5.4.5 The `err.candidates` shape | heading -->
#### 5.4.5 La forma di `err.candidates`

<!-- u d9e50d2513fb | 48 5.4.5 The `err.candidates` shape | prose -->
Ogni errore di disambiguazione porta un array `candidates`. Ogni
candidato è esattamente:

<!-- u bc9f0faf0ccb | 48 5.4.5 The `err.candidates` shape | prose -->
`nac_id` è il `data-nac-id` dell'elemento. `label` si risolve
preferendo `aria-label`, poi il `textContent` ripulito (tagliato a 120
caratteri), e infine ricadendo sul `data-nac-id`. L'elenco è validato
contro il DOM: nomina gli elementi reali fra cui chi chiama può
scegliere. `NacError` fonde `candidates` nell'`Error` sollevato, quindi
`err.code`, `err.message` ed `err.candidates` sono tutti e tre
popolati.

<!-- u 652f14fc6baa | 49 5.4.6 The `nac:disambiguation_requested` event | heading -->
#### 5.4.6 L'evento `nac:disambiguation_requested`

<!-- u 595fd49c77a0 | 49 5.4.6 The `nac:disambiguation_requested` event | prose -->
Ogni volta che una chiamata di risoluzione stretta fallisce (nessuna
corrispondenza OPPURE troppe), il runtime invia un `CustomEvent`
`nac:disambiguation_requested` su `document` *oltre a* sollevare
l'eccezione. L'emissione è al meglio possibile: se l'invio fallisce, il
runtime solleva comunque.

<!-- u e258631d1e18 | 50 5.4.7 How a caller disambiguates | heading -->
#### 5.4.7 Come disambigua chi chiama

<!-- u 4277d2b1e5ff | 50 5.4.7 How a caller disambiguates | prose -->
Con l'elenco dei candidati in mano (da `err.candidates` oppure da
`event.detail.candidates`), chi chiama ne sceglie uno e rinvia per
una di queste vie:

<!-- u 874e8bd6dc4a | 50 5.4.7 How a caller disambiguates | prose -->
1. **Il `nac_id` completo** -- `NAC.click(candidate.nac_id)`. È la via
   canonica di recupero: il candidato porta già l'id esatto.
2. **Il `__suffix` ancorato** -- passa a `click_by_verb` il suffisso
   esatto dell'istanza come qualificatore.
3. **`opts.qualifier_ordinal`** -- selezione per posizione fra gli
   elementi che condividono il verbo (nell'ordine del DOM).

<!-- u 830efd33c855 | 50 5.4.7 How a caller disambiguates | prose -->
Il riferimento lavorato è `example-v24-disambiguation.php`; il
contratto è coperto da `runtime/test/stage2-disambiguation.mjs` e
`runtime/test/stage7-strict-resolution.mjs`.

<!-- u 9a85added5a4 | 51 6. Events | heading -->
## 6. Eventi

<!-- u 3a66eff18a73 | 51 6. Events | prose -->
Ogni azione emette un evento di completamento deterministico. Il
`NAC.click()` del runtime sta in ascolto di quell'evento e si risolve
quando parte.

<!-- u 97fd131e3759 | 51 6. Events | prose -->
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

<!-- u d6c1e7b3214b | 52 6.1 Event detail shape | heading -->
### 6.1 Forma del dettaglio dell'evento

<!-- u 963657156129 | 52 6.1 Event detail shape | prose -->
Il dettaglio di ogni evento porta il campo id canonico, più `plugin`:

<!-- u 1c1a163a8447 | 53 6.2 Emitting from a host handler | heading -->
### 6.2 Emettere da un gestore dell'host

<!-- u e16fdbe62bd6 | 53 6.2 Emitting from a host handler | prose -->
Un gestore di clic DEVE emettere l'evento di successo corrispondente
dopo il suo effetto sincrono:

<!-- u 495a09517d94 | 53 6.2 Emitting from a host handler | prose -->
Se il lavoro è asincrono, emetti dopo la risoluzione. Se il lavoro
fallisce, emetti `nac:action:failed` con `{detail: {plugin, action_id,
error: <message>}}`.

<!-- u 6edbabccfab8 | 53 6.2 Emitting from a host handler | prose -->
Il runtime v2.2 fornirà `NAC.bindAction(el, handler, ctx)`, che
avvolge `addEventListener` ed emette automaticamente.

<!-- u 7160fc51611b | 54 6.3 Why not use the click event itself? | heading -->
### 6.3 Perché non usare l'evento di clic stesso?

<!-- u 1baa670f9949 | 54 6.3 Why not use the click event itself? | prose -->
Un evento `click` del DOM parte prima che il gestore venga eseguito. Il
contratto di NAC3 ha bisogno di sapere quando **l'effetto è finito**,
non quando è cominciato il clic. Da qui la famiglia di eventi separata.

<!-- u 8c146906a8b5 | 55 7. Provenance | heading -->
## 7. Provenienza

<!-- u cda1f0fe1033 | 56 7.1 isTrusted | heading -->
### 7.1 isTrusted

<!-- u ef353b56420d | 56 7.1 isTrusted | prose -->
`event.isTrusted` vale `true` per i clic avviati da una persona (mouse
vero, tasto vero, attivazione da uno screen reader) e `false` per i
clic sintetizzati (`element.click()`, il dispatchEvent di un MouseEvent
costruito a mano, l'automazione).

<!-- u a62b76a788d4 | 56 7.1 isTrusted | prose -->
NAC3 DEVE esporlo tramite `event.detail.is_trusted` dentro l'evento di
successo. Gli host che eseguono azioni sensibili per la sicurezza
(pagamento, cancellazione) POSSONO esigere `is_trusted === true` e
rifiutare i clic sintetici. La demo di riferimento
`example-v20-full.php` include una coppia di pulsanti
(`v20_panel.istrusted_real` e `v20_panel.istrusted_fake`) che dimostra
la distinzione.

<!-- u 99edfdf1816d | 57 7.2 HMAC-signed manifests | heading -->
### 7.2 Manifesti firmati con HMAC

<!-- u eaddcc19c68b | 57 7.2 HMAC-signed manifests | prose -->
Un manifesto PUÒ portare un blocco `provenance`:

<!-- u a1e273bf09d9 | 57 7.2 HMAC-signed manifests | prose -->
Il runtime calcola l'HMAC atteso su una serializzazione stabile del
manifesto (esclusa la firma stessa) e rifiuta i manifesti la cui firma
non corrisponde. Usato dai dispiegamenti multi-inquilino per impedire
che un inquilino falsifichi il manifesto di un altro.

<!-- u 42eadfcaf1d4 | 58 7.3 Threat model | heading -->
### 7.3 Modello di minaccia

<!-- u e7fda825444a | 58 7.3 Threat model | prose -->
Vedi `SECURITY.md` per il modello di minaccia completo. Versione
breve:

<!-- u e1934c89ce6b | 58 7.3 Threat model | prose -->
- NAC3 non autentica l'**utente**. Quello è il lavoro del tuo livello
  di autenticazione.
- NAC3 autentica il **manifesto** (HMAC).
- NAC3 distingue i clic reali da quelli sintetizzati (isTrusted), così
  un host può rifiutare i secondi per i verbi sensibili.
- NAC3 non protegge da un agente malevolo che gira con l'accesso
  dell'utente. Un agente così può fare tutto quello che può fare
  l'utente.

<!-- u 4f92477e8bbc | 59 8. Conformance levels | heading -->
## 8. Livelli di conformità

<!-- u f5b96249fe7b | 59 8. Conformance levels | prose -->
Un livello si scrive **NAC3 Conformance Level 1**, **2** oppure **3**.
Il nome di un livello non è il nome del protocollo: un validatore, un
rapporto o una dichiarazione di conformità DEVE citare un livello con
l'identificatore `nac3-conformance-level-<1|2|3>` pubblicato in
`api/latest/levels.json`, mai con un nome visualizzato. La sezione 8.1
registra i nomi che questi livelli portavano prima della 2.5.0.

<!-- u d73a01bfbec7 | 59 8. Conformance levels | prose -->
Una pagina è al **NAC3 Conformance Level 1** se:

<!-- u b8d1b21abef0 | 59 8. Conformance levels | prose -->
- Ogni widget cliccabile che un agente dovrebbe poter manovrare porta
  `data-nac-id` e `data-nac-role`.
- Ogni elemento con `data-nac-role="action"` fa partire
  `nac:action:succeeded` dopo il suo effetto.
- La pagina registra almeno un manifesto di plugin tramite
  `NAC.register()`.
- `NAC.click(id)` funziona per ogni id annunciato.

<!-- u 8fea90259550 | 59 8. Conformance levels | prose -->
Una pagina è al **NAC3 Conformance Level 2** se inoltre:

<!-- u 548ba93fb7d9 | 59 8. Conformance levels | prose -->
- Registra gli array `tabs[]`, `fields[]`, `actions[]` in modo
  esplicito nel suo manifesto (non dedotti dal DOM).
- Fornisce `label_i18n` che copre tutte le 10 locale di NAC3 per ogni
  etichetta visibile all'utente.
- Implementa le primitive brownfield della v2.0: albero di ambito,
  cattura effimera, autoRegister.watch.
- Passa `NAC.validate_global({probe: false})` con zero riscontri di
  severità `error`.

<!-- u f9a2abaf6fbe | 59 8. Conformance levels | prose -->
Una pagina è al **NAC3 Conformance Level 3** se inoltre:

<!-- u 31ae71ba8c81 | 59 8. Conformance levels | prose -->
- Porta manifesti firmati con HMAC.
- Distingue `isTrusted` per i verbi sensibili per la sicurezza.
- Passa `NAC.validate_global({probe: true})` con zero riscontri.

<!-- u c76a5cbd0d90 | 59 8. Conformance levels | prose -->
La riga di comando del pacchetto NPM (`npx nac3 validate <url>`)
riporta il livello più alto che una pagina raggiunge. (Il pacchetto
pubblica i binari `nac3` e `nac`; entrambi portano alla stessa riga di
comando.)

<!-- u 45c18bc89776 | 60 8.1 Historical level names (v2.5) | heading -->
### 8.1 Nomi storici dei livelli (v2.5)

<!-- u e497f12e1675 | 60 8.1 Historical level names (v2.5) | prose -->
Prima della 2.5.0 i tre livelli si scrivevano `NAC-1`, `NAC-2` e
`NAC-3`. Quei nomi stanno a un trattino di distanza dal nome del
protocollo, `NAC3`, quindi "questa pagina è conforme a NAC-3" non si
poteva distinguere da "questa pagina implementa NAC3", e un agente a
cui si chiedeva di riportare un livello non aveva nessuna stringa senza
ambiguità da riportare.

<!-- u 4da6a2838062 | 60 8.1 Historical level names (v2.5) | prose -->
I nomi vecchi restano leggibili come alias storici:
`api/latest/levels.json` pubblica ciascuno come
`legacy_display_name` accanto al livello a cui apparteneva, così un
documento scritto prima della 2.5.0 si può ancora ricondurre a un
livello. NON sono normativi. Il testo nuovo, l'output dei validatori e
le dichiarazioni di conformità usano il numero del livello o
l'identificatore pubblicato.

<!-- u 25cf5f341851 | 61 9. Versioning | heading -->
## 9. Versionamento

<!-- u f434370102cd | 61 9. Versioning | prose -->
NAC3 segue semver:

<!-- u 21961e924493 | 61 9. Versioning | prose -->
- Salto **maggiore**: cambiamento incompatibile dell'API pubblica o dei
  formati di trasporto. Chi adotta modifica il codice.
- Salto **minore**: funzionalità nuove, compatibili con il passato. Il
  codice vecchio continua a funzionare.
- Salto di **patch**: correzioni di difetti, cambiamenti di sola
  documentazione.

<!-- u 354961fe88c7 | 61 9. Versioning | prose -->
Politica di deprecazione: una funzionalità marcata `@deprecated` nella
versione `X.Y.0` non viene rimossa prima di `(X+1).0.0`. Le note di
rilascio documentano esplicitamente ogni rimozione.

<!-- u 6040a078d2c9 | 61 9. Versioning | prose -->
La versione del pacchetto NPM rispecchia la versione della specifica:
`@nac3/runtime@X.Y.Z` implementa NAC3 vX.Y, con Z revisioni di patch
sopra. L'esempio è scritto con dei segnaposto di proposito: una
versione concreta in questa frase invecchia alla versione successiva, e
questo documento ha portato `2.1.3` molto dopo che il pacchetto era
andato avanti.

<!-- u db4793e191d0 | 62 9.1 Prereleases and dist-tags | heading -->
### 9.1 Prerelease e dist-tag

<!-- u c525c183f446 | 62 9.1 Prereleases and dist-tags | prose -->
Una versione con una coda di prerelease (`-alpha.N`, `-beta.N`,
`-rc.N`) **non** è una versione pubblicata di questa specifica. Esiste
perché un cambiamento possa essere esercitato prima di essere promesso.

<!-- u 06f01c7dd1c2 | 62 9.1 Prereleases and dist-tags | prose -->
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

<!-- u 5ff3ab15b820 | 62 9.1 Prereleases and dist-tags | prose -->
La versione autoritativa del runtime di riferimento è la costante
`NAC.version` in `js/nac.js`, e viene pubblicata come dato:
`api/latest.json` porta un puntatore `stable` e uno `prerelease`
separati (uno dei due può valere `null`), e ogni artefatto pubblicato
porta il proprio campo `channel`. Un consumatore che esige un contratto
stabile legge un campo e rifiuta, senza nessuna stringa di versione da
analizzare e nessun tag di cui fidarsi.

<!-- u 5f55983494b3 | 63 10. Validators | heading -->
## 10. Validatori

<!-- u 2f3408ca1b03 | 64 10.1 Runtime: `NAC.validate_global()` | heading -->
### 10.1 Runtime: `NAC.validate_global()`

<!-- u ace4de89e478 | 64 10.1 Runtime: `NAC.validate_global()` | prose -->
Percorre il DOM vivo + i manifesti registrati e restituisce un
**oggetto di gruppi con nome**: un gruppo per condizione, ciascuno un
array di riscontri. Dalla 2.5.0 ogni riscontro di ogni gruppo porta
`code` e `severity`, così un'integrazione di CI può bloccare su un
codice senza analizzare un messaggio:

<!-- u ac96fbc7a1f3 | 64 10.1 Runtime: `NAC.validate_global()` | prose -->
I cinque codici, la loro severità e cosa fare con ciascuno sono
pubblicati come dato in `api/latest/findings.json`, sotto
`global_buckets`. I codici di riscontro sono stabili fra le versioni di
patch; codici nuovi soltanto nei salti minori, e un codice non viene
mai riutilizzato per un'altra condizione (sezione 12, promessa 4).

<!-- u ab93934bfc7f | 64 10.1 Runtime: `NAC.validate_global()` | prose -->
**Le versioni precedenti alla 2.5.0 non attaccavano nessun codice a
questi gruppi**, e questa sezione descriveva un array piatto di
riscontri che il runtime di riferimento non ha mai restituito (audit
N-14, N-34).

<!-- u 656369a32729 | 64 10.1 Runtime: `NAC.validate_global()` | prose -->
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

<!-- u 8cb460800177 | 65 10.2 CLI: `npx nac3 validate <target>` | heading -->
### 10.2 CLI: `npx nac3 validate <target>`

<!-- u 5f1634cd35ad | 65 10.2 CLI: `npx nac3 validate <target>` | prose -->
Avvolge `validate_global` più un lint statico di coerenza fra HTML e
manifesto. Codici di uscita:

<!-- u 54affecdb5b9 | 65 10.2 CLI: `npx nac3 validate <target>` | prose -->
- `0` -- nessun riscontro di severità >= alla soglia configurata.
- `1` -- ci sono riscontri.
- `2` -- la destinazione stessa non si è potuta caricare.

<!-- u 62c5dfe68407 | 65 10.2 CLI: `npx nac3 validate <target>` | prose -->
Utile in CI: `npx nac3 validate ./dist/index.html --severity=error`. Il
pacchetto espone la CLI sotto due nomi di binario, `nac3` e `nac`; usa
quello che non entra in conflitto con un altro strumento del tuo PATH.

<!-- u 01fa36c8d26c | 66 11. The system around NAC3 | heading -->
## 11. Il sistema intorno a NAC3

<!-- u 7ad464281bfd | 66 11. The system around NAC3 | prose -->
NAC3 è uno strato di contratto. Per trasformare una pagina conforme a
NAC3 in un'applicazione guidata dalla voce servono anche:

<!-- u 10116f319016 | 66 11. The system around NAC3 | prose -->
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

<!-- u 400f6554acb4 | 66 11. The system around NAC3 | prose -->
NAC3 standardizza soltanto la forma di ingresso e uscita del passo 2
(lo scatto di `NAC.describe()` + la forma delle azioni). I passi 1, 3 e
4 sono fuori dalla specifica; componi quello che preferisci.

<!-- u 9bd0d10006ac | 67 12. Stability guarantees | heading -->
## 12. Garanzie di stabilità

<!-- u d448e3d3251d | 67 12. Stability guarantees | prose -->
Quello che questa specifica promette:

<!-- u 299877632664 | 67 12. Stability guarantees | prose -->
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

<!-- u 7401ca7e951e | 67 12. Stability guarantees | prose -->
Quello che questa specifica NON promette:

<!-- u 0f44826d96f1 | 67 12. Stability guarantees | prose -->
1. La formulazione esatta dei messaggi di errore (sono stringhe del
   catalogo i18n; le localizzazioni possono spostarsi).
2. La strategia DOM per trovare gli elementi (`querySelector` oggi;
   più avanti può diventare un indice più veloce).
3. La disposizione interna della cache dei manifesti. Tratta i
   manifesti come di sola scrittura dal lato host, e di sola lettura
   dal lato agente.

<!-- u a6934dd2b815 | 68 13. Open questions | heading -->
## 13. Domande aperte

<!-- u f9ce60b69c5c | 68 13. Open questions | prose -->
Vengono tracciate **qui**, in questa sezione. Una revisione precedente
intitolava questo "Domande aperte (tracciate separatamente)" e non
diceva mai dove fosse quel "separatamente"; non c'era nessun altro
registro. Una domanda che arriva a una decisione esce dalla tabella
qui sotto ed entra nella sezione che riguarda. Una domanda che diventa
una proposta concreta riceve un RFC, e quelli sono indicizzati in
[`rfcs/README.md`](rfcs/README.md), con il processo in
[`CONTRIBUTING.md`](CONTRIBUTING.md).

<!-- u dcb4765e57ff | 68 13. Open questions | prose -->
Ogni riga porta la versione in cui è stata valutata l'ultima volta,
così chi legge distingue una domanda viva da una abbandonata.
**Nessuna riga porta una versione obiettivo**: una promessa con una
data che supera la sua data è peggio di una senza data, che è
l'errore che la sezione 5 commetteva su `payload_schema`.

<!-- u 5bc638bb20cd | 68 13. Open questions | prose -->
| Domanda | Stato | Ultima valutazione | Come sta |
|----------|-------|---------------|-----------------|
| `data-nac-role="navigation"` dovrebbe mai risolvere a una scheda? | **DECISO: no** | v2.5 | Deciso nella 2.2.0 e imposto da allora: un id con prefisso `tab.` e ruolo `navigation` solleva `tab_id_manifest_role_drift`, e con `STRICT_VALIDATION` (predefinito `true` dalla 2.3.0) `NAC.register` solleva. `tab_by_label` risolve le schede soltanto da `m.tabs[]` ed `elements[role=='tab']`. `navigation` è una regione di riferimento, mai un pannello commutabile. Vedi le sezioni 1 e 10. |
| `NAC.click()` dovrebbe accettare id relativi (per esempio `'./save'`)? | **APERTA, non implementata** | v2.5 | Il risolutore fa corrispondere `data-nac-id` in modo esatto e delimita per plugin: quello attivo, o quello di `opts.plugin`. Quella delimitazione copre già il caso che la domanda chiedeva (`NAC.click('save', {plugin:'invoice'})`), quindi la pressione per una sintassi relativa è bassa e niente è in corso. Deciderla vorrebbe dire aggiungere una grammatica di percorsi alla sezione 2, dove gli id sono dichiarati opachi per il runtime. |
| I manifesti dovrebbero supportare ereditarietà / estensione fra plugin (un manifesto di base esteso da un inquilino)? | **APERTA, candidata per la prossima maggiore** | v2.5 | Non implementata. **Non va confusa con la sezione 15**, il "contratto di estensione di plugin": quello è stato pubblicato nella v2.5 ed è un meccanismo di instradamento verso il backend (`registerPlugin` / `call` / `read` / `subscribe`), non ereditarietà di manifesti. La domanda qui riguarda un manifesto che deriva da un altro, cosa che tocca le regole di unicità degli id della sezione 2 ed è il motivo per cui resta riservata a una maggiore. |
| L'applicazione di `payload_schema` dovrebbe essere formalizzata e attivata? | **APERTA, senza data** | v2.5 | Spostata qui dalla sezione 5, che la prometteva per la v2.4. Non è arrivata nella v2.4 e non è arrivata fino alla v2.5; il runtime di riferimento non legge il campo. Vedi la sezione 5 per sapere esattamente cosa viene validato oggi e cosa no. |
| I riscontri di `validate_global()` dovrebbero portare un codice dal catalogo pubblicato? | **DECISO: sì, pubblicato nella 2.5.0** | v2.5 | Ogni voce di ogni gruppo porta `code` + `severity`, quindi la promessa 4 della sezione 12 ora copre un insieme reale invece di uno vuoto. I cinque codici sono pubblicati sotto `global_buckets` in `api/latest/findings.json`, e il generatore li LEGGE da un caso di prova che provoca ogni gruppo, invece di scriverli a mano: la versione precedente scriveva `code: null` per un gruppo che portava un codice dalla 2.5.0 e pubblicava entrambe le affermazioni nello stesso file. Costruire quel caso di prova è anche ciò che ha trovato l'audit N-33: il validatore non riusciva a vedere un manifesto scritto nella forma canonica. Vedi 10.1. |

<!-- u 1ba12333695c | 69 13.5 Governance | heading -->
## 13.5 Governance

<!-- u 091136995f4a | 69 13.5 Governance | prose -->
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

<!-- u fd9fc738b52c | 69 13.5 Governance | prose -->
Per chi adotta: la licenza uniforme Apache-2.0 garantisce che la
specifica e il runtime sopravvivano a qualsiasi cambiamento nella
situazione societaria di Yujin. Puoi biforcare l'uno o l'altro, far
girare l'uno o l'altro e pubblicare l'uno o l'altro, oggi e dopo che
non ci saremo più. Questo documento registra l'impegno perché la strada
verso quella sopravvivenza sia esplicita, non implicita.

<!-- u 4d62e1227df1 | 70 14. Reference implementation | heading -->
## 14. Implementazione di riferimento

<!-- u 52d4fad55b7e | 70 14. Reference implementation | prose -->
L'implementazione canonica è il runtime di riferimento distribuito come
il pacchetto NPM `@nac3/runtime`. La fonte normativa della versione è
la costante `NAC.version` del runtime stesso, pubblicata come dato in
`api/latest.json` (vedi la sezione 9.1). Questa sezione
deliberatamente non ripete un numero di versione: portava
`2.5.0-alpha.5` quando il pacchetto era già andato avanti, che è la
stessa classe di difetto degli esempi vecchi rimossi dalle sezioni
5 e 9. Pubblica:

<!-- u 65f8174ff33b | 70 14. Reference implementation | prose -->
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

<!-- u 3267a25cd9bb | 70 14. Reference implementation | prose -->
Il pacchetto espone anche una CLI sotto i nomi di binario `nac3` e
`nac` (`dist/cli.js`, sezione 10.2).

<!-- u ada8333c036b | 70 14. Reference implementation | prose -->
Altre implementazioni sono benvenute (Python per esecutori di
automazione nativi, Rust per agenti embedded, ecc). L'autorità è la
specifica, non il codice JS.

<!-- u 4dc85a8e4ab3 | 71 15. Plugin extension contract -- canvas + API surfaces  | heading -->
## 15. Contratto di estensione di plugin -- superfici canvas + API (v2.5)

<!-- u 7d116da9b14a | 71 15. Plugin extension contract -- canvas + API surfaces  | prose -->
Le sezioni 1-14 presuppongono che la superficie rilevante per l'agente
sia il **DOM**. Ogni elemento indirizzabile ha un attributo
`data-nac-id`, ogni verbo parte attraverso `el.click()`, ogni lettura
di stato viene da `el.getAttribute(...)`. Questo funziona per le
applicazioni la cui cornice E il cui contenuto vivono in nodi del DOM.

<!-- u 0551bce3d392 | 71 15. Plugin extension contract -- canvas + API surfaces  | prose -->
Non funziona per le applicazioni in cui parte della superficie è un
**canvas** (LibreOffice / Collabora Online, Figma, Excalidraw, Miro,
qualsiasi editor WebGL fatto in casa). La cornice può restare DOM
(barre degli strumenti, finestre di dialogo), ma i comandi spesso
devono passare per l'API pubblica dell'applicazione stessa
(postMessage, SDK dei plugin, ponte di scripting), e lo stato può non
essere leggibile dal DOM per niente.

<!-- u 72264fb0f469 | 71 15. Plugin extension contract -- canvas + API surfaces  | prose -->
La v2.5 aggiunge un piccolo insieme di primitive che permettono a un
plugin NAC3 di dichiarare il proprio contratto di instradamento verso
superfici del genere. Il runtime resta agnostico rispetto a qualsiasi
applicazione specifica: impara a parlare con una soltanto leggendo il
manifesto del plugin.

<!-- u 6d9a90384f28 | 72 15.1 Why a new primitive set | heading -->
### 15.1 Perché un nuovo insieme di primitive

<!-- u a7e9cf90c978 | 72 15.1 Why a new primitive set | prose -->
Il `NAC.click(id)` che conosce solo il DOM non può:

<!-- u 38b34f7795c3 | 72 15.1 Why a new primitive set | prose -->
- Mandare un postMessage `Send_UNO_Command` a un iframe di Collabora
  in sandbox.
- Chiamare `figma.currentPage.selection = [...]` dentro la sandbox dei
  plugin di Figma.
- Invocare `excalidrawAPI.setElements(...)` su una ref di React.
- Leggere se Grassetto è attivo sulla selezione corrente di Collabora
  (la barra degli strumenti lo riflette; il canvas lo nasconde).

<!-- u 7495e48dfe8c | 72 15.1 Why a new primitive set | prose -->
La soluzione **non** è estendere `NAC.click` con euristiche di
individuazione del backend. La soluzione è aggiungere un verbo
esplicito e agnostico che prenda uno slug di plugin e un percorso di
verbo, e che lasci al manifesto del plugin dichiarare come quel verbo
viene instradato.

<!-- u 641333576b18 | 73 15.2 The three primitives | heading -->
### 15.2 Le tre primitive

<!-- u 2eeaa810cab5 | 73 15.2 The three primitives | prose -->
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

<!-- u da60503266ab | 73 15.2 The three primitives | prose -->
Tutte e quattro le funzioni sono asincrone (restituiscono una Promise)
tranne `unsubscribe`, che è sincrona e idempotente.

<!-- u 3a61a03890f1 | 74 15.3 Plugin manifest shape | heading -->
### 15.3 Forma del manifesto di plugin

<!-- u 5420f520d0d4 | 74 15.3 Plugin manifest shape | prose -->
I manifesti sono JSON puro (nessun callback JS). Forge, Sumi e
qualsiasi strumento futuro li generano come dato; il runtime
interpreta i nomi dei backend a partire da un vocabolario fisso.

<!-- u c81d6471a0ab | 74 15.3 Plugin manifest shape | prose -->
I verbi e gli eventi hanno **esattamente un** legame. Lo stato ha un
**array ordinato** di legami: il runtime percorre la catena in ordine e
restituisce la prima fonte che si è risolta con successo.

<!-- u 673180462720 | 75 15.4 Backend vocabulary | heading -->
### 15.4 Vocabolario dei backend

<!-- u 1e544939bf9c | 75 15.4 Backend vocabulary | prose -->
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

<!-- u b3fb5326727c | 75 15.4 Backend vocabulary | prose -->
Ogni backend DEVE essere implementato dal runtime come un dispatcher
autonomo (`dispatch(binding, args, context) -> Promise<value>`).
Aggiungere un tipo di backend nuovo alla specifica richiede di alzare
la versione della specifica; i runtime che ignorano i backend
sconosciuti DEVONO rifiutare i manifesti che li dichiarano (nessun
salto silenzioso).

<!-- u 269f89fd3507 | 76 15.5 Extractor mini-DSL | heading -->
### 15.5 Mini-DSL di estrazione

<!-- u d4919abaffe4 | 76 15.5 Extractor mini-DSL | prose -->
I backend di stato e il backend di evento `postmessage-listen` hanno
spesso bisogno di estrarre un campo da un oggetto più grande. Il
runtime porta un minuscolo DSL dichiarativo perché i manifesti restino
soltanto JSON:

<!-- u edfb3ecdcba7 | 76 15.5 Extractor mini-DSL | prose -->
| Sintassi | Significato | Esempio di ingresso -> uscita |
|--------|---------|-------------------------|
| `field.path.to.value` | Percorso con punti. | `{a:{b:1}}` con `a.b` -> `1` |
| `attribute:NAME` | Solo DOM: leggere `el.getAttribute(NAME)`. | `<i data-x="hi">` con `attribute:data-x` -> `'hi'` |
| `text` | Solo DOM: leggere `el.textContent`. | `<span>hi</span>` con `text` -> `'hi'` |
| `classList.contains:CLASS` | Solo DOM: `el.classList.contains(CLASS)` -> booleano. | `<button class="active">` con `classList.contains:active` -> `true` |
| `value` | Solo DOM: leggere `el.value`. | `<input value="x">` con `value` -> `'x'` |
| `present` | Solo DOM: restituisce `true` se il selettore ha risolto un elemento, `false` altrimenti. | il selettore ha corrisposto -> `true` |

<!-- u c21d2cceb93f | 76 15.5 Extractor mini-DSL | prose -->
Nella v2.5 la composizione non è supportata; un estrattore è
esattamente una delle righe qui sopra. Un manifesto che ha bisogno di
una trasformazione complessa dichiara invece un `script-bridge`.

<!-- u 8eaa22faba63 | 77 15.6 Fallback chain semantics for `state` | heading -->
### 15.6 Semantica della catena di ripieghi per `state`

<!-- u c1e30df97123 | 77 15.6 Fallback chain semantics for `state` | prose -->
`state[path]` è un array di legami. `NAC.read(plugin, path)` percorre
l'array in ordine. Per ogni legame:

<!-- u 9b9d10966d70 | 77 15.6 Fallback chain semantics for `state` | prose -->
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

<!-- u 68f0476ca245 | 77 15.6 Fallback chain semantics for `state` | prose -->
Motivazione: la catena codifica l'ordine di preferenza di chi ha
scritto il manifesto. La fonte più rapida, più economica e più fresca
viene dichiarata per prima; i ripieghi degradano con eleganza. Il
runtime non sceglie mai in silenzio una fonte peggiore per prima.

<!-- u ffedb5b06a01 | 78 15.7 Provenance for synthetic actions | heading -->
### 15.7 Provenienza delle azioni sintetiche

<!-- u bc6190f2e478 | 78 15.7 Provenance for synthetic actions | prose -->
Ogni invio di `NAC.call` emette un evento `nac:plugin:invoked` su
`document` dopo che il backend ha restituito. Il carico del dettaglio:

<!-- u b527bd4cadd8 | 78 15.7 Provenance for synthetic actions | prose -->
Stessa forma per `nac:plugin:read` (dopo un `read`) e per
`nac:plugin:event` (la riemissione di un evento sintetizzato). `source`
vale `'agent'` per impostazione predefinita; gli host che avvolgono il
runtime in un'interfaccia utente POSSONO cambiarlo con il meccanismo
che già esiste, `NAC.set_source(...)` (sezione 7).

<!-- u 07f550e23dcf | 79 15.8 Worked example -- Collabora Writer | heading -->
### 15.8 Esempio svolto -- Collabora Writer

<!-- u cae1093b9441 | 79 15.8 Worked example -- Collabora Writer | prose -->
L'agente chiama `NAC.call('collabora.writer', 'uno.Bold')`; il runtime
instrada attraverso il backend `postmessage` e invia
`Send_UNO_Command` all'iframe. Per confermare che l'effetto è avvenuto
(vedi la sezione 17), l'agente chiama
`await NAC.read('collabora.writer', 'selection.isBold')`; il runtime
prova prima lo specchio della barra degli strumenti (veloce, gratis) e
ripiega sul ponte di script Python se lo specchio non è disponibile.
L'agente non sa mai e non gli interessa mai quale fonte ha risposto.

<!-- u 35fc88c5f8c4 | 80 15.9 Errors | heading -->
### 15.9 Errori

<!-- u 5eda63397d51 | 80 15.9 Errors | prose -->
`NAC.call` / `read` / `subscribe` rifiutano con un `NacError` il cui
`code` è uno di questi:

<!-- u f6eceddeaf5f | 80 15.9 Errors | prose -->
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

<!-- u f92a4c02f492 | 81 16. Tree navigation (v2.5 -- SHIPPED in 2.5.0-alpha.5 / | heading -->
## 16. Navigazione ad albero (v2.5 -- PUBBLICATA in 2.5.0-alpha.5 / RFC V25-02)

<!-- u 7a50acadcc20 | 81 16. Tree navigation (v2.5 -- SHIPPED in 2.5.0-alpha.5 / | prose -->
Primitive di navigazione gerarchica dei comandi, per i percorsi di
assistenza e gli esecutori vocali che hanno bisogno di descrivere cosa
possono fare a partire dal fuoco corrente.

<!-- u 726350183f41 | 81 16. Tree navigation (v2.5 -- SHIPPED in 2.5.0-alpha.5 / | prose -->
**Superficie dell'API:**

<!-- u c57b2345c081 | 81 16. Tree navigation (v2.5 -- SHIPPED in 2.5.0-alpha.5 / | prose -->
- `NAC.context(plugin) -> { breadcrumb: [{nac_id, label}, ...] }`
  Risale da `document.activeElement` attraverso gli elementi antenati
  che portano `data-nac-id`, fermandosi alla radice del plugin.
  Restituisce un percorso vuoto se niente ha il fuoco dentro il
  plugin. Il `label` di ogni passo viene da `narrate` (sezione 17).

<!-- u 9345bb2ecfe1 | 81 16. Tree navigation (v2.5 -- SHIPPED in 2.5.0-alpha.5 / | prose -->
- `NAC.tree(plugin, rootId?) -> [{nac_id, label, opens?, leaf?}, ...]`
  Enumera i figli indirizzabili IMMEDIATI di `rootId` (oppure della
  radice del plugin, se omesso). "Immediato" vuol dire che non c'è
  nessun altro elemento con `data-nac-id` fra il punto di partenza e
  il figlio. Per ogni voce:
  - `label` risolto tramite `narrate`
  - `opens` rispecchia l'attributo `data-nac-opens` quando è presente
  - `leaf` vale `true` quando `data-nac-leaf` è presente

<!-- u b19ace6221f6 | 81 16. Tree navigation (v2.5 -- SHIPPED in 2.5.0-alpha.5 / | prose -->
**Attributi per chi scrive:**

<!-- u 8c4475faabe9 | 81 16. Tree navigation (v2.5 -- SHIPPED in 2.5.0-alpha.5 / | prose -->
- `data-nac-opens="<target-nac-id>"`: dichiara che questo nodo apre /
  scende verso l'elemento identificato dall'id di destinazione.
  Permette agli agenti di seguire la catena di navigazione senza
  indovinare nomi.
- `data-nac-leaf`: marcatore terminale esplicito; gli agenti a valle
  sanno che non è possibile scendere ulteriormente.

<!-- u 6a2e330ae9a8 | 81 16. Tree navigation (v2.5 -- SHIPPED in 2.5.0-alpha.5 / | prose -->
**Errori:** `tree` restituisce `[]` per un rootId sconosciuto (vuoto
silenzioso, non un errore). `context` restituisce sempre
`{ breadcrumb: [] }` per i plugin sconosciuti.

<!-- u 7a9670811789 | 82 17. Assistive labels (v2.5 -- SHIPPED in 2.5.0-alpha.5  | heading -->
## 17. Etichette di assistenza (v2.5 -- PUBBLICATE in 2.5.0-alpha.5 / RFC V25-03)

<!-- u e6e2f1eecf4e | 82 17. Assistive labels (v2.5 -- SHIPPED in 2.5.0-alpha.5  | prose -->
Risoluzione canonica delle etichette leggibili da una persona. Un'unica
funzione per gli screen reader, la sintesi vocale, i percorsi vocali, i
registri di audit, le superfici di assistenza mobili.

<!-- u 2ee6d3c1ba46 | 82 17. Assistive labels (v2.5 -- SHIPPED in 2.5.0-alpha.5  | prose -->
- `NAC.narrate(plugin, nac_id) -> string | null`
  Restituisce `null` se il plugin o il nac_id non si trovano.
  Altrimenti l'etichetta che segue questo ordine di priorità stretto:

<!-- u d1332c239eaf | 82 17. Assistive labels (v2.5 -- SHIPPED in 2.5.0-alpha.5  | prose -->
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

<!-- u ca12e3704975 | 82 17. Assistive labels (v2.5 -- SHIPPED in 2.5.0-alpha.5  | prose -->
  I valori che sono soltanto spazi, a qualsiasi livello, scendono al
  livello successivo.

<!-- u 05527df57e48 | 82 17. Assistive labels (v2.5 -- SHIPPED in 2.5.0-alpha.5  | prose -->
**Validazione:** `validate_global()` può emettere avvisi nel gruppo
`plugin_instance_violations` per i nac_id di forma ordinale (`btn-1`,
`btn-2`, ...) a cui manca una qualsiasi delle etichette dei livelli
superiori.

<!-- u 8352032c85cd | 83 18. Effect detection (v2.5 -- SHIPPED in 2.5.0-alpha.5  | heading -->
## 18. Rilevamento dell'effetto (v2.5 -- PUBBLICATO in 2.5.0-alpha.5 / RFC V25-04)

<!-- u 229a636ff25c | 83 18. Effect detection (v2.5 -- SHIPPED in 2.5.0-alpha.5  | prose -->
Chiude il buco del "danno silenzioso": un agente conferma l'EFFETTO di
un'azione, non soltanto che il comando è stato emesso. Le due primitive
si compongono con `NAC.read()`, quindi funziona qualsiasi backend di
V25-01 (postmessage, sdk-call, dom-mirror, ...).

<!-- u fbede61e05ec | 83 18. Effect detection (v2.5 -- SHIPPED in 2.5.0-alpha.5  | prose -->
- `NAC.expect(plugin, statePath, value, opts?) -> Promise<value>`
  Interroga `NAC.read(plugin, statePath)` periodicamente finché il
  comparatore non restituisce un valore vero oppure finché non scade
  il termine. Si risolve con il valore risolto; rifiuta con
  `NacError('timeout', ...)` alla scadenza.

<!-- u 2f8b051e6a19 | 83 18. Effect detection (v2.5 -- SHIPPED in 2.5.0-alpha.5  | prose -->
  I fallimenti di lettura durante l'interrogazione vengono ritentati
  fino alla scadenza (trattati come "non ancora osservabile", non come
  un errore duro).

<!-- u 31222acebd2a | 83 18. Effect detection (v2.5 -- SHIPPED in 2.5.0-alpha.5  | prose -->
  Opzioni:
  - `timeout_ms` (`5000` per impostazione predefinita)
  - `poll_ms` (`100` per impostazione predefinita)
  - `comparator` (`(cur, want) => cur === want` per impostazione
    predefinita) Riceve `(current, expected)` e restituisce un
    booleano.

<!-- u bfe42d1abbb0 | 83 18. Effect detection (v2.5 -- SHIPPED in 2.5.0-alpha.5  | prose -->
- `NAC.diff(plugin, statePath, actionFn) -> Promise<{before, after, changed}>`
  Legge lo stato, attende `actionFn()`, rilegge lo stato. Restituisce
  entrambi gli scatti e un booleano `changed` calcolato con un
  confronto JSON-stringify (quindi anche `undefined` contro un valore
  viene segnalato come cambiato). I fallimenti di lettura si riducono a
  `undefined`.

<!-- u 261f5079717f | 83 18. Effect detection (v2.5 -- SHIPPED in 2.5.0-alpha.5  | prose -->
**Note di composizione:** `diff` cattura soltanto lo scatto di INIZIO e
quello di FINE; NON osserva gli stati intermedi dentro l'azione. Usa
`expect` se quello che ti interessa è "lo stato passa per un certo
valore preciso a un certo punto".

<!-- u 3c1090ef8c62 | 83 18. Effect detection (v2.5 -- SHIPPED in 2.5.0-alpha.5  | prose -->
*Questo documento è la specifica canonica di NAC3 v2.5. Le sezioni
0-14 sono invariate rispetto alla v2.4 stabile. Le sezioni 15-18 sono
pubblicate nella v2.5. Le modifiche a questo file costituiscono
cambiamenti della specifica e richiedono un RFC; vedi
`CONTRIBUTING.md`.*
