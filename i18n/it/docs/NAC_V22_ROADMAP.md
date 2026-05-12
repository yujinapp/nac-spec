---
translation_source: docs/NAC_V22_ROADMAP.md
translation_source_hash: 8d844659a0ed290a00c015c5b2e875d6d9b3d52b18f02f8c182169927d3d4750
translation_quality: machine_v1
translation_lang: it
translation_date: 2026-05-11T14:27:10.436550+00:00
---

# NAC3 v2.2 -- roadmap

NAC3 = **Native Agent Contract**.

Avviato il 2026-05-09. Questo file raccoglie gli elementi evolutivi per
la prossima versione minore della specifica NAC3. Ogni sezione è autonoma: contiene
la descrizione del problema, la classe di bug che previene, la modifica proposta al contratto
e le note di implementazione.

**Stato al 2026-05-10:** v2.2 RILASCIATA. Gli elementi V22-01 +
V22-02 + V22-03 + V22-04 sono tutti in `js/nac.js` + nel pacchetto NPM
`@nac3/runtime` 2.2.0. Questo file è ora il changelog canonico per
la versione.

| Elemento | Stato | Commit |
|------|--------|--------|
| V22-01 strict validator | RILASCIATO | 6c2b1866 |
| V22-02 bindAction helper | RILASCIATO | 6c2b1866 |
| V22-03 locale detector hardening | RILASCIATO 2026-05-09 | f631d77a |
| V22-04 tab_by_label parens normalisation | RILASCIATO 2026-05-09 | f631d77a |
| V23-01 field editor primitive (preview) | DEMO RILASCIATA 2026-05-11 | (example-v23-editor.php + packages/nac/test/v23-editor.mjs 8/8 PASS) |

---

## V22-01 -- Il costruttore (`NAC.register`) diventa un validatore strict

**Classe di problema.** Le demo brownfield possono dichiarare elementi del manifest
con valori di role non canonici (`role:'navigation'` su un tab,
`role:'button'` invece di `'action'`, ecc.). Il costruttore attuale
accetta qualsiasi struttura ricevuta e la memorizza così com'è.
Il bug emerge solo a runtime quando le API (`NAC.tab()`,
`NAC.tab_by_label()`, `NAC.click()`) non riescono a trovare l'elemento,
perché la query DOM canonica (`[data-nac-role="tab"]`)
non corrisponde. A quel punto la demo è già in produzione, l'utente ha già
incontrato il comando vocale non funzionante, e il runtime lancia correttamente
`tab X missing` -- un errore fuorviante, dato che l'elemento È nel
DOM, ma con il role sbagliato.

**Trigger concreto (2026-05-09).** Pablo detta `ve a pestana
permisos` su `example-v21-data-table.php`. Il LLM risolve in
`NAC.tab('invoice_edit_modal','tab.permissions')`. Il pulsante
esiste nel DOM ma con `data-nac-role="navigation"` (impostato dall'autore
della demo per ragioni di semantica HTML: i tab SONO navigazione).
Il runtime lancia "tab tab.permissions missing" anche se il
pulsante è lì. La stessa causa ha provocato
`tab_by_label('Lines (collection)')` a mancare in precedenza nella stessa
sessione.

**Perché tre livelli di guardia avrebbero dovuto intercettarlo ma non l'hanno fatto.**

| Livello | Dovrebbe rilevare... | Cosa fa oggi |
|---|---|---|
| Lint pre-commit | role drift nei file demo PHP/HTML | non esiste |
| `NAC.register(manifest)` (al momento della registrazione) | role non canonici, mismatch id/role | accetta tutto silenziosamente |
| `NAC.validate_global()` (al momento del lint) | role drift dentro `m.elements[]` | controlla solo la presenza di `m.tabs[]` |

Il livello delle API runtime (`NAC.tab` ecc.) è il **quarto** livello di guardia,
e l'unico che si attiva oggi -- come errore runtime per l'utente finale.
A quel punto il costo è massimo.

**Modifica proposta al contratto per v2.2.**

`NAC.register` DEVE validare il manifest prima di memorizzarlo.
Regole di validazione:

1. **Enumerazione dei role noti.** Ogni `m.elements[i].role` deve
   essere un membro del set di role canonici (estende
   `_CLICK_EVENT_FAMILY`):

   ```
   action, field, option, tab, breadcrumb-item, accordion-toggle,
   step, pagination-item, confirm-button, sort-control,
   filter-control, data-table, plugin, section, region,
   navigation, banner, complementary, contentinfo, button
   ```

   Role sconosciuti -> `console.error` + rifiuto della chiamata register.
   I role landmark (`navigation`, `banner`, ecc.) sono accettati ma
   solo su elementi il cui nodo DOM corrispondente è un contenitore di regione,
   non un widget cliccabile.

2. **Coerenza id/role.** Se `e.id` corrisponde a `^tab\.` allora
   è richiesto `e.role === 'tab'`. Se `e.id` corrisponde a
   `^modal\.` allora è richiesto `e.role === 'action'` (o il
   sub-role dell'azione). Qualsiasi mismatch -> `console.error` +
   rifiuto. La grammatica del campo id è anch'essa un contratto;
   oggi è implicita.

3. **Coerenza DOM (best effort).** Quando `register` viene chiamato
   dopo il parsing del DOM (il percorso tipico), cerca
   `[data-nac-id="<e.id>"]` nel DOM. Se trovato e il suo
   `data-nac-role` differisce da `e.role`, `console.error` +
   rifiuto. Questo intercetta il caso che Pablo ha incontrato il 2026-05-09: il
   manifest dice `role:'tab'` ma l'HTML dice ancora
   `data-nac-role="navigation"` (o viceversa). Se chiamato
   prima che il DOM sia pronto, rinvia il controllo a un
   post-pass su `DOMContentLoaded`.

4. **Helper di migrazione (una finestra di rilascio).** Per v2.2.0 le
   condizioni sopra producono `console.error` ma NON lanciano eccezioni -- gli adottanti
   hanno bisogno di una finestra per migrare. A partire da v2.3.0 lanceranno un
   `RegisterError` e il manifest verrà rifiutato definitivamente.
   Tracciato nel runtime tramite il flag `NAC.STRICT_VALIDATION`
   che vale `false` in v2.2 e `true` in v2.3.

**Estensione di `NAC.validate_global()`.**

Aggiunta di tre nuovi findings:

- `manifest_role_unknown` -- il role di un elemento è fuori dal
  set canonico.
- `manifest_dom_role_mismatch` -- il role nel manifest per
  `<id>` differisce dall'attributo `data-nac-role` nel DOM.
- `tab_role_drift` -- un `<button>` (o qualsiasi elemento cliccabile) nel
  DOM ha `data-nac-id="tab.X"` ma `data-nac-role` non è
  `"tab"` -- indipendentemente dall'esistenza di una voce nel manifest.
  Intercetta il drift solo-HTML che il validatore del manifest manca
  per definizione.

Ogni finding ha severità `error` per default;
`{ kind: 'warn' }` sovrascrivibile per progetto.

**Lint pre-commit (deliverable separato, blocca lo stesso drift).**

Un nuovo script node `tools/nac/check_demos.mjs` legge ogni
file `*.php` e `*.html` in `yujin.app/nac-spec/`, costruisce uno pseudo-DOM
tramite cheerio (o regex per il percorso leggero), estrae ogni
chiamata `NAC.register({...})` dagli script inline, e verifica in modo incrociato
le stesse regole di coerenza. Agganciato a GitHub Actions e a un hook git
`pre-commit` locale. Blocca il commit se una qualsiasi regola fallisce.

**Stima dello sforzo.**

| Attività | Dove | Sforzo |
|---|---|---|
| Modalità strict di `NAC.register` | `js/nac.js` | 2h |
| Nuovi findings di `validate_global` | `js/nac.js` | 2h |
| Script lint pre-commit | `tools/nac/check_demos.mjs` | 4h |
| Sweep di migrazione sulle demo esistenti | `example-v*.php` | 1h |
| Aggiornamenti documentazione nella spec | `docs/spec.md` ecc. | 1h |
| Test e configurazione CI | `tests/` + `.github/workflows/` | 2h |

Totale: ~12h concentrate.

**Compatibilità con le versioni precedenti.**

Le note di rilascio di v2.2 devono dichiarare:
- `NAC.register` ora emette `console.error` in caso di role drift
  (senza lanciare eccezioni).
- v2.3 inizierà a lanciare `RegisterError` nelle stesse condizioni.
- Gli adottanti dovrebbero eseguire `NAC.validate_global()` prima del rilascio.

Il percorso di migrazione per le 6 demo esistenti in questo repository è
già completato al commit `0633e080` (2026-05-09): i pulsanti tab della demo v21
e il manifest sono stati corretti a `role:'tab'`.

---

## V22-02 -- Applicazione del contratto action-ack

**Classe del problema.** I click handler che operano in modo sincrono
devono eseguire `dispatchEvent(new CustomEvent('nac:action:succeeded',
{detail:{plugin,action_id}}))` dopo l'effetto collaterale. I pannelli
brownfield spesso se ne dimenticano. Il runtime va quindi in timeout
sul poll di ack da 5s anche se l'effetto collaterale è già avvenuto,
e la chat o l'agente riporta `No pude ejecutar X: timeout`.

**Trigger concreto (2026-05-09).** Pablo: `hide` -> il pannello si
nasconde correttamente, la chat dice "No pude ejecutar v20_panel.toggle:
timeout". Lo stesso accade per ogni pulsante del v20-panel.

**La precedente soluzione era sbagliata.** Il commit `ad200e4c` trattava
`err.code === 'timeout'` come successo nel loop agentico della chat.
Pablo ha giustamente segnalato che questo mascherava i veri errori
(handler bloccato, race condition di rete, eccezione non gestita) e
comprometteva l'unico segnale affidabile del runtime. Ripristinato in
`c9bf2bdb`.

**La correzione corretta è già stata rilasciata.** Wrapping di `bind()`
in `example-v20-full.php` per emettere automaticamente
`nac:action:succeeded`/`nac:action:failed` dopo ogni handler.
Fatto in `c9bf2bdb`.

**Modifica proposta al contratto per v2.2.**

Il runtime DOVREBBE fornire un helper:

```js
NAC.bindAction(el, handler, { plugin, action_id })
```

che si occupa automaticamente dell'emissione dell'ack. Stessa interfaccia
di `addEventListener('click', handler)` ma con il contratto di conformità
già integrato. I demo che adottano l'helper non possono dimenticarsene.

`validate_global` aggiunge un nuovo tipo di segnalazione:

- `action_handler_without_ack` -- rilevato tramite strumentazione:
  durante `validate_global` il validatore invia un click sintetico su
  ogni elemento `data-nac-role="action"` in un contesto controllato,
  rimane in ascolto di `nac:action:succeeded` per 500ms e segnala
  quelli che non lo emettono.

Questa segnalazione è opt-in (`NAC.validate_global({ probe: true })`)
perché i click sintetici hanno effetti collaterali.

**Impegno stimato.** ~3h per l'helper + ~4h per la segnalazione basata
su probe.

---

## V22-03 -- Rafforzamento del rilevatore di cambio lingua

**Classe del problema.** I codici lingua a 2 lettere nel rilevatore
di lingua del client chat (`'de'`, `'es'`, `'en'`) collidono con
preposizioni e articoli in diverse lingue. `cambia DE pestana` ha
cambiato la chat in tedesco.

**La correzione è già stata rilasciata.** `_detectLangSwitch` in
`nac-chat-client.js` ora richiede che i codici a 2 lettere coesistano
con un `LOCALE_TRIGGER` esplicito (`idioma`/`language`/`sprache`/...).
Fatto in `f631d77a`.

**Proposta per v2.2.** Spostare il rilevatore di lingua fuori dal
client chat e farne una primitiva NAC3, in modo che ogni embed di
chat brownfield utilizzi lo stesso rilevatore rafforzato. Documentare
esplicitamente nella spec la classe dei falsi positivi, così le
implementazioni future non reintroducono il bug.

**Impegno stimato.** ~2h.

---

## V22-04 -- Tolleranza al linguaggio naturale per `tab_by_label`

**Già incluso.** La rimozione delle parentesi (`"Lines (collection)"`
corrisponde a `"Lines"` e `"Lines tab"`) è stata rilasciata in
`f631d77a`. Questo **non** è un fallback legacy -- è una normalizzazione
legittima del testo dei pulsanti citato dagli LLM. Da documentare nella
spec come comportamento canonico del matcher.

**Impegno stimato.** ~1h solo documentazione.

---

## Fuori scope per v2.2 (rimandato a v2.3+)

- Gerarchie di ruoli componibili (`role:'tab.primary'` vs
  `role:'tab.secondary'`): utile ma senza un trigger concreto.
- Hot-reload del manifest: ancora raro; il ricaricamento della pagina
  attuale va bene.
- Ricerca di etichette multi-lingua su tutti e 10 i locale
  simultaneamente (oggi il matcher li itera in serie, il che va bene
  per ~20 tab per plugin).

---

## V23-01 -- Primitiva field editor (anteprima rilasciata)

**Classe del problema.** I voice runner e gli agenti non hanno un modo
generale per manipolare in profondità il testo all'interno di un
`<input>` o `<textarea>` -- possono solo usare `NAC.fill(id, value)`,
che sostituisce tutto il contenuto. Attività reali (correggere la
grammatica in un paragrafo, sostituire solo la selezione, migliorare
una frase con l'AI) richiedono verbi più granulari. Oggi ogni adottante
che ne ha bisogno si costruisce la propria soluzione.

**Soluzione.** Una nuova primitiva runtime `NAC.edit_field(nac_id)`
apre una modale che gestisce la superficie di editing e registra il
proprio plugin `nac_editor` con 8 verbi canonici:

| Verbo | Descrizione |
|-------|-------------|
| `select_word` | seleziona la parola al cursore |
| `select_sentence` | seleziona la frase al cursore |
| `select_all` | seleziona tutto il testo |
| `replace` | sostituisce la selezione con il testo fornito |
| `delete_selection` | elimina la selezione corrente |
| `ai_correct_syntax` | invia il valore corrente al backend della chat via POST, sostituisce con la versione corretta dall'AI |
| `save` | scrive nel campo sorgente, chiude la modale |
| `cancel` | annulla le modifiche, chiude la modale |

Il manifest della modale viene registrato in modo idempotente (più
chiamate a `edit_field` condividono un unico plugin `nac_editor`).
Tutti i verbi includono `label_i18n` per tutti e 10 i locale.

**Stato:**
- Runtime: RILASCIATO il 2026-05-10 in `js/nac.js` (funzioni
  `edit_field` + `_editorRegisterManifest` + handler della modale
  con emissione dell'ack).
- Demo: RILASCIATO il 2026-05-11 in `example-v23-editor.php`
  (3 campi modificabili + contatori di verbi in tempo reale collegati
  a `nac:action:succeeded`).
- Test: RILASCIATI il 2026-05-11 in
  `packages/nac/test/v23-editor.mjs` (8/8 PASS): esistenza +
  id non valido genera eccezione + ruolo non valido genera eccezione +
  monta la modale + registra il plugin + idempotenza + cancel chiude +
  save chiude.
- Spec: sezione da aggiungere a SPEC.md sez. 13 nell'ambito del
  ciclo GA di v2.3.

**Impegno per il GA.** Oltre a quanto già presente: revisione delle
etichette in lingua nativa per ja/zh/ar/hi (~2h), spec visuale
Playwright e2e (~3h), testo della spec in SPEC.md (~2h).

---

## Come gli elementi passano da questo documento alla spec

1. Implementare e rilasciare la modifica al runtime dietro un feature
   flag.
2. Aggiornare i demo in modo che superino la nuova validazione
   rigorosa.
3. Lasciare in produzione per almeno un ciclo di release con il flag
   impostato di default su `warn` (non bloccante).
4. Spostare la regola in `docs/spec.md` e portare il default a `error`
   (bloccante) nella minor successiva.
5. Eliminare la voce da questo roadmap e aggiungere una riga in
   `docs/CHANGELOG.md`.

---

*This is a machine translation of the canonical English
version at `/nac-spec/docs/NAC_V22_ROADMAP.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
