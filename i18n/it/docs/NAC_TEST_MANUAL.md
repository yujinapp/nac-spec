---
translation_source: docs/NAC_TEST_MANUAL.md
translation_source_hash: 75c7b936593deacfec1dd9689f1093483363cc45f01514ff9c9d8d52e466c9a9
translation_quality: machine_v1
translation_lang: it
translation_date: 2026-05-11T14:30:51.865910+00:00
---

# Manuale di Test NAC3

**Un playbook di test standardizzato per qualsiasi app conforme a NAC-3.**

Versione 1.0 -- 2026-05-11. Autorevole per la superficie NAC3 v2.2 + anteprima v2.3.
Aggiornare quando le specifiche cambiano.

Questo documento indica al team adottante cosa testare, come testare, cosa verificare
e cosa saltare. Fase per fase lungo la pipeline NAC3:

```
Comunicacion -> Desambiguacion -> Intencion -> Llamada -> Resultado -> Ack
    (1)             (2)             (3)         (4)         (5)        (6)
```

Più le problematiche trasversali: constructor (V22-01), contratto bindAction
(V22-02), interop (v2.3), provenienza + sicurezza.

La suite di riferimento Yujin (il caso studio in fondo a questo manuale) conta
**175+ unit test + 16 test e2e Playwright**. Copertura media ponderata della
pipeline: **95%**. Prendete ciò che fa al caso vostro.

---

## 0. Perché esiste questo manuale

Ogni team che adotta NAC3 costruisce un corpus di test da zero e finisce con
una copertura disomogenea -- un team ha test perfetti sugli ack-event ma ignora
l'intermediario LLM; un altro ha Playwright end-to-end ma nessun unit test.
Questo manuale codifica cosa significa "test completo" per un'app NAC-3.

La soglia minima per un'app certificata NAC-3:

| Fase | Obbligatorio | Consigliato |
|------|--------------|-------------|
| 1 Comunicacion | Percorso testuale coperto. Test con mock STT per il client chat. | Corpus TTS reale + riproduzione audio via Playwright. |
| 2 Desambiguacion | Rilevatore di cambio lingua testato per falsi positivi. Forma di snapshotTree verificata. | Tolleranza etichette per tab/i18n testata. |
| 3 Intencion | Smoke backend live (o con cassette VCR) per >= 5 prompt. | Guardie anti-bug (specifiche alla storia dei bug della vostra app). |
| 4 Llamada | Ogni funzione pubblica NAC.* usata dalla vostra app, con percorsi happy + error. | drag_drop, edit_field se li collegate. |
| 5 Resultado | Effetto collaterale DOM verificato per almeno i 10 verbi principali esposti dalla vostra app. | Cross-browser via matrice Playwright. |
| 6 Ack | Ogni famiglia di eventi prodotta dai vostri ruoli, con forma del detail verificata. | Famiglie di coda lunga (breadcrumb, accordion, step). |
| Interop | Se esportate/importate via MCP: forma di export_tree + import + proxy + disconnect. | Firma HMAC + guardia alla ricorsione. |

---

## 1. Struttura della suite

Raccomandiamo questa struttura (corrisponde al riferimento Yujin):

```
packages/<your-app>/
  test/
    smoke.mjs                       artefact integrity + CLI
    v22.mjs                         strict validator + bindAction
    v23-interop.mjs                 cross-app MCP (if you implement)
    stage1-audio.mjs                STT mock + TTS corpus integrity
    stage2-disambiguation.mjs       _detectLangSwitch + tab_by_label + snapshotTree
    stage3-backend.mjs              live (or recorded) backend smoke
    stage4-calls.mjs                every public NAC.* write API
    stage6-ack.mjs                  ack event families
    stage6b-longtail.mjs            breadcrumb/accordion/step/sort/filter/confirm
    fixtures/voice/                 TTS-generated MP3 corpus
      corpus.json                   prompt -> expected outcome
      generate.mjs                  one-shot regen via Google/ElevenLabs
      <locale>/<id>.mp3
tests/
  e2e-nac/
    playwright.config.ts
    specs/
      01-landing.spec.ts            @demos
      02-demo-<name>.spec.ts        @demos one per surface
      08-pipeline-end-to-end.spec.ts @e2e full chat-to-ack
tools/nac/
  test-launch.sh                    orchestrates everything
```

`tools/nac/test-launch.sh` esegue:
- Layer 1: ogni suite lato Node concatenata in ordine, con interruzione al
  primo FAIL.
- Layer 1b (opt-in): smoke backend live (~60s).
- Layer 2: lint statico via `npx @nac3/runtime validate <dir>`.
- Layer 3: sanity check dei link alla documentazione.
- Layer 4: integrità degli artefatti demo.
- Layer 5: integrità del pacchetto del caso studio.

Obiettivo: layer 1 + 2 + 3 + 4 + 5 in meno di 10 secondi su un laptop.

---

## 2. Fase per fase: cosa testare

### Fase 1 -- Comunicacion (STT + input grezzo)

#### Cosa gestisce questa fase

Acquisizione audio, trascrizione STT, input testuale grezzo nel client chat.
Il debouncing di `_sttBuffer` + `_sttFlushTimer` del client chat appartiene
qui. Anche il cortocircuito per il cambio lingua
(`_maybeChangeLocaleLocally`) vive qui.

#### Cosa testare

1. **Mock STT + iniezione trascrizione.** Sostituire
   `window.SpeechRecognition` con un fake che genera un evento `result`
   sintetico con una trascrizione predefinita. Verificare che
   `NacChat.send(transcript)` propaghi esattamente quel testo nel dispatcher.
2. **Integrità del corpus TTS.** Generare ~30 prompt audio via Google Cloud
   TTS / ElevenLabs nelle 10 lingue supportate. Verificare che ogni file MP3
   esista e sia >= 1KB. Funge da rilevatore di regressione per il corpus stesso.
3. **Riproduzione audio reale (Playwright).** Opzionale. Riprodurre uno degli
   MP3 del corpus tramite mock di `getUserMedia`, instradato verso
   SpeechRecognition del browser. Difficile da configurare in modo pulito;
   saltare per la v1.

#### Cosa verificare

- Ogni prompt del corpus raggiunge `NacChat.send()` con il testo esatto.
- Input vuoto o con soli spazi non manda in crash il client chat.
- Il cortocircuito per il cambio lingua si attiva per i prompt che
  corrispondono a `_detectLangSwitch` (coperto anche nella Fase 2).

#### Cosa saltare

- Flussi di autorizzazione del microfono. Sono UI a livello browser; non
  vale la pena usare Playwright.
- Compatibilità cross-browser dei codec audio. Usare MP3 nel corpus e un
  solo browser.

---

### Fase 2 -- Desambiguacion

#### Cosa gestisce questa fase

`_detectLangSwitch`. Composizione e sanitizzazione degli snapshot.
Tolleranza del matcher `tab_by_label`. Tutto ciò che trasforma il testo
grezzo in "cosa deve vedere l'LLM / quale scorciatoia attivare localmente".

#### Cosa testare

1. **Casi di falso positivo di `_detectLangSwitch`.** Questa è l'area più
   soggetta a bug; includere test anti-regressione espliciti:
   - `'cambia de pestana'` -> rimane nella lingua corrente.
   - `'cambia precio de mouse 40'` -> rimane nella lingua corrente.
   - `'borra de la lista'` -> rimane.
   - `'pasa de A a B'` -> rimane.
2. **Casi positivi di `_detectLangSwitch`.** Minimo 12 tra le lingue
   supportate:
   - `'cambia a aleman'` -> de
   - `'switch to english'` -> en
   - `'use spanish'` -> es
   - `'cambia idioma a de'` (trigger esplicito + codice bare) -> de
   - Noop per stessa lingua.
   - Input vuoto / con soli spazi.
3. **Tolleranza di `tab_by_label`**:
   - Corrispondenza esatta su textContent.
   - Corrispondenza con parentesi rimosse (`"Lines (collection)"` corrisponde
     a `"Lines"`).
   - Corrispondenza con etichetta i18n per lingua.
   - Etichetta sconosciuta -> not_found.
4. **Forma di `snapshotTree`.** Restituisce `{active, plugins[]}`.
   Include il manifest per ogni plugin. Contiene lo snapshot della
   data-table del plugin attivo (se v2.1).

#### Cosa verificare

- La lingua finale dopo `NacChat.send(text)` corrisponde all'attesa.
- Il backend è stato chiamato o meno come previsto.
- `tab_by_label` restituisce o lancia eccezione in modo pulito per ogni caso.
- `snapshotTree()` è serializzabile in JSON e di dimensioni contenute.

#### Insidie comuni

- I codici lingua a 2 lettere bare (`'de'`, `'es'`) collidono con
  preposizioni/articoli. Testare esplicitamente i casi trappola.
- Etichette filler di 1-2 caratteri in `label_i18n` causano falsi positivi
  nella corrispondenza parziale. Usare stringhe realistiche.

---

### Fase 3 -- Intencion (intermediario LLM)

#### Cosa gestisce questa fase

Il round-trip HTTP tra il client chat e l'intermediario LLM. Il ruolo del
backend: leggere lo snapshot `nac_tree` + il prompt, restituire
`{message, actions[]}`.

#### Cosa testare

1. **Smoke sulla forma del backend.** Per un insieme di prompt canonici nelle
   lingue supportate (consigliati >= 15), inviare una POST all'endpoint e
   verificare:
   - HTTP 200.
   - Risposta JSON con booleano `ok`.
   - Se ok: stringa `message` + array `actions`.
   - Ogni `action.kind` è uno dei kind canonici.
2. **Guardie anti-bug.** Per ogni classe di bug nota nella vostra storia,
   scrivere un test live esplicito. Esempio: `'cambia de pestana'` NON DEVE
   restituire `change_locale: 'de'`.
3. **Guardia sulla dimensione dello snapshot.** Non inviare snapshot > 20KB
   all'LLM se si paga per token; il test fa fallire la build se il vostro
   albero supera il budget.

#### Cosa saltare

- Contenuti specifici delle azioni LLM. L'LLM è non deterministico; non
  verificare "save attiverà action_id = X". Solo la forma.
- Resilienza di rete (timeout, retry). Appartiene ai test di carico /
  affidabilità, non agli unit / smoke test.

#### Live vs VCR

I test live sono fragili rispetto ai costi e ai rate limit dell'LLM. Dopo
che il corpus di prompt si stabilizza, registrare le risposte come cassette
VCR (file JSON che mappano prompt -> risposta) e riprodurle in CI. Il
riferimento Yujin usa test live perché il budget consente ~60s/esecuzione;
passare alle cassette se la CI gira troppo spesso.

---

### Fase 4 -- Llamada (API di scrittura NAC.*)

#### Cosa gestisce questa fase

Ogni funzione pubblica su `window.NAC`: click, click_by_verb, fill, select,
tab, tab_by_label, go_to_section, drag_drop, edit_field, dt_*, bindAction.

#### Cosa testare

Per ogni funzione usata, tre casi:

1. **Happy path.** Montare un elemento DOM corrispondente all'id del manifest;
   collegare il suo handler per emettere l'ack event canonico; chiamare
   NAC.<func>(...) e verificare che si risolva.
2. **not_found.** Chiamare con un id che non esiste; verificare che lanci
   eccezione con codice `'not_found'` (o `'section_not_found'` per
   go_to_section).
3. **Input non valido.** Chiamare con argomenti vuoti o di forma errata;
   verificare che lanci eccezione con codice `'invalid'`.

Per la famiglia `dt_*`, in aggiunta:

- `dt_add_row` restituisce `{ok, row_id}`.
- `dt_edit_cell` happy path + valore non valido rifiutato (es.
  `qty < min`).
- `dt_remove_row` decrementa `dt_state().rows.length`.
- `dt_commit` restituisce `{ok, final_state}`.
- `dt_discard` annulla le mutazioni non committate.

#### Nota implementativa

Eseguire in un piccolo shim DOM in-process (~150-200 righe di sottoclasse
EventTarget) così non serve jsdom o Playwright per la fase 4. Il matcher
di selettori composti (`[a="b"][c="d"]`) è l'unica funzionalità che dovete
supportare. Vedere `stage4-calls.mjs` nella suite di riferimento.

---

### Fase 5 -- Resultado (effetto collaterale DOM)

#### Cosa gestisce questa fase

Cosa cambia effettivamente nel DOM dopo una chiamata NAC.*. Distinto dalla
Fase 4 (la funzione ha restituito ok) e dalla Fase 6 (l'ack event è stato
emesso).

#### Cosa testare

1. **Mutazione DOM per verbo.** Per i vostri 10 verbi principali:
   - `save` -> il form sottostante è stato inviato? È apparso un toast?
   - `cancel` -> il modal si è chiuso? I valori del form sono stati
     ripristinati?
   - `delete` -> la riga è stata rimossa dalla lista?
   - `add_row` -> una nuova riga è visibile nella tabella?
2. **E2e Playwright per superficie.** Una spec per ogni plugin / schermata
   di primo livello. Montare la superficie in un browser reale, eseguire il
   flusso utente canonico, verificare lo stato del DOM.

#### Cosa saltare

- Diff di screenshot pixel-perfect. La regressione visiva ha i propri
  strumenti dedicati.
- Performance (frame rate, layout shift). Appartiene ai test di performance,
  budget separato.

---

### Fase 6 -- Famiglia di ack event

#### Cosa gestisce questa fase

Ogni evento `nac:*` ascoltato dal runtime. Ognuno ha una forma canonica del
detail (plugin + id-key + extra opzionali).

#### Cosa testare

Per ogni famiglia in `_CLICK_EVENT_FAMILY`:

- `nac:action:succeeded` -- detail.plugin + detail.action_id +
  detail.is_trusted.
- `nac:action:failed` -- stesso + detail.error.
- `nac:field:changed` -- detail.field_id + detail.value.
- `nac:tab:activated` -- detail.tab_id.
- `nac:breadcrumb:navigated` -- detail.breadcrumb_id.
- `nac:accordion:expanded` / `:collapsed` -- detail.accordion_id.
- `nac:step:advanced` -- detail.step_id.
- `nac:table:page_changed` -- detail.page_index.
- `nac:confirm:resolved` / `:cancelled` -- detail.confirm_id.
- `nac:table:sort_changed` -- detail.column_id.
- `nac:table:filter_changed` -- detail.filter_id.

Per ognuno:
1. Montare un elemento DOM con il ruolo canonico.
2. Collegare il click handler per emettere l'evento canonico.
3. Chiamare `NAC.click(id)` e ascoltare l'evento.
4. Verificare la forma del detail.

Inoltre:
- **Timing click-to-resolve.** Il listener del runtime deve risolversi entro
  200ms dall'emissione dell'ack. Qualsiasi ritardo maggiore è un bug del
  runtime.
- **`bindAction`** emette automaticamente l'ack dopo un handler sincrono.
- **`bindAction` async-resolve** emette automaticamente dopo la risoluzione
  della Promise.
- **`bindAction` throw** -> emette automaticamente `nac:action:failed` con
  detail.error.

---

### V22-01 -- Validatore strict del constructor

`NAC.STRICT_VALIDATION = true` fa sì che `NAC.register` lanci eccezione su:

- `manifest_role_unknown` -- ruolo fuori dall'insieme canonico.
- `tab_id_manifest_role_drift` -- l'id corrisponde a `^tab\.` ma il ruolo
  non è `'tab'`.
- `manifest_dom_role_mismatch` -- il DOM montato ha un ruolo diverso da
  quello dichiarato nel manifest.

Testare ognuno:
1. Impostare `STRICT_VALIDATION = true`.
2. Chiamare `register` con un manifest costruito per violare la regola.
3. Verificare che lanci eccezione con `code: 'strict_validation'` e
   `findings: [...]`.

Senza strict mode: verificare che `console.error` sia stato emesso
(catturare tramite spy su `console.error`).

---

### V22-02 -- Helper bindAction

Già coperto sopra nella Fase 6, ma: scrivere almeno 5 test espliciti:

1. Handler sincrono -> ack emesso.
2. Handler che lancia eccezione -> evento failed emesso + errore rilanciato.
3. Handler asincrono che si risolve -> ack emesso dopo la risoluzione.
4. `bindAction` restituisce un unbinder; chiamarlo interrompe l'emissione.
5. ctx mancante (nessun plugin o action_id) -> lancia eccezione con
   `code: 'invalid'`.

---

### Interop -- anteprima v2.3

Se la vostra app esporta / importa alberi NAC3 via MCP:

1. **Forma di export_tree.** Restituisce `{app_id, app_version,
   nac_version, exported_at, active_plugin, manifests,
   scope_tree, data_tables, state, ack_endpoint}`.
2. **Filtri di export_tree.** `scope: 'plugin_slug:<slug>'` restituisce
   solo quel plugin. `scope: 'active_plugin'` restituisce solo quello
   attivo. `include_locales: ['en','es']` restituisce solo quelle lingue.
3. **Validazione di import_remote_tree.** Bearer o endpoint mancante lancia
   `invalid`. Namespace duplicato lancia `conflict`.
4. **Registrazione plugin con namespace.** Dopo l'import,
   `NAC.list_registered_plugins()` include `remote:<ns>:<slug>`.
5. **Proxy dispatch.** `NAC.click('remote:<ns>:...')` attiva una `fetch`
   verso l'endpoint del peer con `bearer` + `nac_id` (locale al peer, senza
   prefisso) + `action.kind`.
6. **Mirror ack locale.** Dopo un proxy riuscito, un evento locale
   `nac:action:succeeded` viene emesso con `detail.via_interop: true` +
   `detail.is_trusted: false`.
7. **Bubbling degli errori del peer.** Il peer restituisce `{ok: false,
   error: {code: '...', message: '...'}}` -> il client lancia eccezione con
   il codice del peer.
8. **disconnect_remote.** Cancella il namespace; le successive chiamate
   `NAC.click('remote:...')` lanciano not_found.
9. **I click locali non fanno proxy.** Contratto critico: dopo che il layer
   interop è installato, chiamare NAC.click su un id LOCALE non deve
   eseguire fetch.

---

## 3. Raccomandazioni sugli strumenti

### Test runner

- **Node + moduli ESM puri** per le fasi 2-6. Niente Jest, niente
  Vitest -- 200 righe di `assert(name, ok)` sono sufficienti e
  introducono meno dipendenze.
- **Playwright** per gli e2e della Fase 5 + la riproduzione audio della Fase 1, se la si implementa.

### CI

- Non eseguire lo smoke live del backend (Fase 3) ad ogni push -- ~60s
  per esecuzione x frequenza di merge = costi reali. Eseguirlo su:
  - Trigger manuale (`gh workflow run`).
  - Cron notturno.
  - Prima di taggare una release.
- Eseguire le fasi 1, 2, 4, 6 + l'harness ad ogni push. Budget
  totale: meno di 15s.

### Report di copertura

Mantenere un file `docs/COVERAGE_REPORT_<date>.md` per ogni release. Aggiornare
la tabella caso per caso. Includere la media ponderata della pipeline.
Il riferimento Yujin si trova in
`yujin.app/nac-spec/docs/COVERAGE_REPORT_2026_05_10.md`.

---

## 4. Anti-pattern da evitare

1. **Verificare il contenuto delle azioni LLM.** Non deterministico.
   Testare la FORMA, non i VALORI.
2. **Simulare il DOM nella Fase 5.** La Fase 5 riguarda la mutazione reale del DOM;
   usare Playwright, non uno shim.
3. **Copertura per riga, non per fase.** Le righe di codice coperte
   non dicono nulla sul funzionamento della pipeline. Usare
   la matrice per fase.
4. **Solo happy-path nella Fase 4.** Not_found + input non valido rappresentano
   metà del contratto.
5. **Saltare la Fase 6.** L'evento ack è la parte più violata
   della spec nel codice degli adottanti. Testare ogni famiglia che si emette.
6. **Nessuna guardia anti-regressione.** Ogni bug di produzione corretto nella propria app
   deve avere un test di regressione permanente. Il caso 'cambia de pestana'
   è per sempre nella nostra Fase 2.
7. **Test live ad ogni push.** Brucia il budget; instabile per
   varianza di terze parti.

---

## 5. Caso di studio -- la suite di riferimento Yujin

Tutti i link ai sorgenti dei test puntano ai file canonici su
GitHub.

| Suite | Sorgente | Test | Tempo |
|-------|--------|-------|------|
| smoke | [packages/nac/test/smoke.mjs](https://github.com/pkuschnirof/rpaforce-crm/blob/main/packages/nac/test/smoke.mjs) | 36 | < 1s |
| v22 | [packages/nac/test/v22.mjs](https://github.com/pkuschnirof/rpaforce-crm/blob/main/packages/nac/test/v22.mjs) | 14 | < 1s |
| v23-interop | [packages/nac/test/v23-interop.mjs](https://github.com/pkuschnirof/rpaforce-crm/blob/main/packages/nac/test/v23-interop.mjs) | 14 | < 2s |
| stage1-audio | [packages/nac/test/stage1-audio.mjs](https://github.com/pkuschnirof/rpaforce-crm/blob/main/packages/nac/test/stage1-audio.mjs) | 33 | < 1s |
| stage2-disambiguation | [packages/nac/test/stage2-disambiguation.mjs](https://github.com/pkuschnirof/rpaforce-crm/blob/main/packages/nac/test/stage2-disambiguation.mjs) | 31 | < 1s |
| stage3-backend (live) | [packages/nac/test/stage3-backend.mjs](https://github.com/pkuschnirof/rpaforce-crm/blob/main/packages/nac/test/stage3-backend.mjs) | ~150 (10 locale x 3 prompt) | ~120s |
| stage4-calls | [packages/nac/test/stage4-calls.mjs](https://github.com/pkuschnirof/rpaforce-crm/blob/main/packages/nac/test/stage4-calls.mjs) | 31 | ~2s |
| stage6-ack | [packages/nac/test/stage6-ack.mjs](https://github.com/pkuschnirof/rpaforce-crm/blob/main/packages/nac/test/stage6-ack.mjs) | 16 | < 1s |
| stage6b-longtail | [packages/nac/test/stage6b-longtail.mjs](https://github.com/pkuschnirof/rpaforce-crm/blob/main/packages/nac/test/stage6b-longtail.mjs) | 14 | < 1s |
| Generatore corpus TTS | [packages/nac/test/fixtures/voice/generate.mjs](https://github.com/pkuschnirof/rpaforce-crm/blob/main/packages/nac/test/fixtures/voice/generate.mjs) | -- | one-shot |
| Catalogo corpus TTS | [packages/nac/test/fixtures/voice/corpus.json](https://github.com/pkuschnirof/rpaforce-crm/blob/main/packages/nac/test/fixtures/voice/corpus.json) | 30 prompt | -- |
| Harness | [tools/nac/test-launch.sh](https://github.com/pkuschnirof/rpaforce-crm/blob/main/tools/nac/test-launch.sh) | 5 livelli | ~10s |
| **Totale lato Node** | | **259+** | **~10s + 120s opzionale** |

Più 16 spec e2e Playwright (~54s):

| Spec | Sorgente | Test | Tag |
|------|--------|-------|-----|
| 01-landing | [tests/e2e-nac/specs/01-landing.spec.ts](https://github.com/pkuschnirof/rpaforce-crm/blob/main/tests/e2e-nac/specs/01-landing.spec.ts) | 2 | @demos |
| 02-demo-v19 | [tests/e2e-nac/specs/02-demo-v19.spec.ts](https://github.com/pkuschnirof/rpaforce-crm/blob/main/tests/e2e-nac/specs/02-demo-v19.spec.ts) | 1 | @demos |
| 03-demo-v20 | [tests/e2e-nac/specs/03-demo-v20.spec.ts](https://github.com/pkuschnirof/rpaforce-crm/blob/main/tests/e2e-nac/specs/03-demo-v20.spec.ts) | 2 | @demos |
| 04-demo-v21-datatable | [tests/e2e-nac/specs/04-demo-v21-datatable.spec.ts](https://github.com/pkuschnirof/rpaforce-crm/blob/main/tests/e2e-nac/specs/04-demo-v21-datatable.spec.ts) | 3 | @demos |
| 05-demo-v22-interop | [tests/e2e-nac/specs/05-demo-v22-interop.spec.ts](https://github.com/pkuschnirof/rpaforce-crm/blob/main/tests/e2e-nac/specs/05-demo-v22-interop.spec.ts) | 1 | @demos |
| 06-demo-react-study-case | [tests/e2e-nac/specs/06-demo-react-study-case.spec.ts](https://github.com/pkuschnirof/rpaforce-crm/blob/main/tests/e2e-nac/specs/06-demo-react-study-case.spec.ts) | 2 | @study |
| 07-demo-angular-study-case | [tests/e2e-nac/specs/07-demo-angular-study-case.spec.ts](https://github.com/pkuschnirof/rpaforce-crm/blob/main/tests/e2e-nac/specs/07-demo-angular-study-case.spec.ts) | 2 | @study |
| 08-pipeline-end-to-end | [tests/e2e-nac/specs/08-pipeline-end-to-end.spec.ts](https://github.com/pkuschnirof/rpaforce-crm/blob/main/tests/e2e-nac/specs/08-pipeline-end-to-end.spec.ts) | 3 | @e2e |
| Config | [tests/e2e-nac/playwright.config.ts](https://github.com/pkuschnirof/rpaforce-crm/blob/main/tests/e2e-nac/playwright.config.ts) | -- | -- |
| **Totale Playwright** | | **16** | |

**Totale complessivo: 205+ test** che coprono l'intera pipeline dall'input
della chat all'evento ack, con copertura ponderata media del **95%**.

### Copertura per fase (riferimento Yujin, 2026-05-11)

| Fase | Suite che la copre | Copertura |
|-------|---------------------|----------|
| 1 Comunicacion | stage1-audio.mjs | 85% |
| 2 Desambiguacion | stage2-disambiguation.mjs | 95% |
| 3 Intencion | stage3-backend.mjs (LLM live) | 85% |
| 4 Llamada | stage4-calls.mjs | 95% |
| 5 Resultado | tests/e2e-nac/specs/*.spec.ts (Playwright) | 95% |
| 6 Ack | stage6-ack.mjs + stage6b-longtail.mjs | 100% |
| Interop (v2.3) | v23-interop.mjs + 05-demo-v22-interop.spec.ts | 100% |
| Constructor (V22-01) | v22.mjs | 100% |
| bindAction (V22-02) | v22.mjs | 100% |
| **Media ponderata** | | **~95%** |

### Bug emersi dal corpus di test

Il corpus di test, durante lo sviluppo, ha portato alla luce due bug
reali a runtime, corretti nello stesso branch:

1. **Matcher `tab_by_label` troppo permissivo.** L'implementazione originale
   accettava qualsiasi corrispondenza bidirezionale con `indexOf`. Un'etichetta
   filler di 1 carattere (`'a'`) in `label_i18n` avrebbe corrisposto a qualsiasi
   query di 1+ caratteri.
   Il test B4 della Fase 2 lo ha individuato. Correzione: richiedere che sia il candidato
   che la query abbiano >= 3 caratteri per la corrispondenza parziale; l'uguaglianza
   esatta è sempre consentita.

2. **Helper di introspezione `list_registered_plugins` mancante.**
   Il metodo `export_tree` del livello interop itera il registro dei manifest
   per produrre il proprio payload. Il runtime non disponeva di un'API pubblica
   per elencare i plugin registrati indipendentemente dallo stato di mount del DOM.
   Individuato durante la scrittura della suite v23-interop. Correzione:
   aggiunto `NAC.list_registered_plugins()` che restituisce
   `Object.keys(_manifests)`.

Entrambe le correzioni sono state rilasciate in `js/nac.js` nello stesso branch.

### Playbook per adottanti -- adottare questa suite

1. **Copiare prima l'infrastruttura di test.** Shim + helper + harness da `packages/nac/test/`.
   Eseguire i test esistenti per verificare.
2. **Sostituire il corpus di test con la superficie della propria app.** I propri
   slug di plugin, i propri verbi, le proprie data-table. Mantenere l'organizzazione
   per fase della pipeline.
3. **Generare il proprio corpus TTS** tramite
   `packages/nac/test/fixtures/voice/generate.mjs`. Fornire
   la propria chiave Google Cloud TTS o ElevenLabs tramite variabile d'ambiente.
4. **Collegare `tools/nac/test-launch.sh`** alla propria CI. Livelli 1-5
   in pre-merge; livello backend 1b opzionale o notturno.
5. **Mantenere un report di copertura.** Aggiornarlo ad ogni release.

### Licenza

Questo manuale è rilasciato sotto Apache-2.0 insieme al resto della spec NAC3.
È possibile copiarlo, forkarlo e ridistribuirlo liberamente.

---

## 6. Passi successivi

- [SPEC.md](../SPEC.md) -- il contratto canonico contro cui Yujin esegue i test.
- [SECURITY.md](../SECURITY.md) -- modello di minaccia + provenienza.
- [COVERAGE_REPORT_2026_05_10.md](COVERAGE_REPORT_2026_05_10.md)
  -- il report di riferimento aggiornato.
- [LAUNCH_PLAN_2026_05_10.md](LAUNCH_PLAN_2026_05_10.md) -- il
  playbook di lancio autonomo di Sumi all'interno del quale è stato costruito questo corpus di test.

*Questo documento evolve insieme alla spec NAC3. Inviare modifiche tramite PR
contro `yujin.app/nac-spec/docs/NAC_TEST_MANUAL.md`.*

---

*This is a machine translation of the canonical English
version at `/nac-spec/docs/NAC_TEST_MANUAL.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
