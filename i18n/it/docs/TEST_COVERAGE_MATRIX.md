---
translation_source: docs/TEST_COVERAGE_MATRIX.md
translation_source_hash: 378d7bf89e65b07e54f5d5dc1c62938accfe383e903468a4df028a3e2936f48d
translation_quality: machine_v1
translation_lang: it
translation_date: 2026-05-11T14:32:13.636094+00:00
---

# NAC3 -- Matrice di Copertura dei Test (automatici + manuali)

**Versione spec:** 2.2 + anteprima v2.3.
**Generato il:** 2026-05-11.
**Riferimento autorevole per:** il repository di riferimento Yujin
`pkuschnirof/rpaforce-crm` su `main`.

Questa matrice elenca OGNI artefatto dell'ecosistema NAC3 e
riporta la sua copertura tramite test automatizzati + il gate di
verifica manuale (la checklist "human OK").

Adottanti: copiate questa struttura di matrice per la vostra app. Sostituite
le colonne con i vostri artefatti; mantenete la stessa profondità per riga.

---

## Legenda

| Simbolo | Significato |
|---------|-------------|
| AUTO | Coperto da test automatizzati (suite Playwright / Node) |
| MAN  | Richiede verifica umana (visiva nel browser, gesture vocali, UX soggettiva) |
| BOTH | Coperto automaticamente per gli invarianti + verificato manualmente per la UX |
| --   | Nessuna copertura prevista (intenzionale) |
| TBD  | Copertura pianificata ma non ancora implementata |

---

## 1. Artefatti runtime

| Artefatto | Copertura AUTO | Gate manuale | Note |
|-----------|----------------|--------------|------|
| `js/nac.js` (base v1.9 + v2.0 + v2.1) | AUTO 95% | MAN (smoke cross-browser) | smoke + v22 + stage4 coprono la write API; manuale = aprire in Firefox + Safari almeno una volta per release |
| `js/nac-v2-extensions.js` | AUTO 90% | MAN (autoRegister.watch su un DOM nuovo) | stage4 dt_* + v22 parziale; manuale = montare un nuovo plugin a runtime via autoRegister |
| `js/nac-chat-client.js` | AUTO 95% | MAN (STT con microfono reale) | stage1-audio simula SpeechRecognition; manuale = premere il microfono nella demo live + pronunciare un prompt per locale |
| `js/nac-mcp-interop.js` (anteprima v2.3) | AUTO 100% | MAN (roundtrip cross-origin con peer reale) | v23-interop copre lo scenario in-page; manuale = testare contro un peer NAC3 remoto reale via HTTPS |

## 2. Pacchetto NPM

| Artefatto | Copertura AUTO | Gate manuale | Note |
|-----------|----------------|--------------|------|
| Build `@nac3/runtime` (dist/ ESM + CJS + d.ts + CLI) | AUTO 100% | MAN (`npm install` in una directory vuota) | smoke.mjs 36 controlli; manuale = npm pack + install + import in un progetto Node vuoto per verificare |
| Subpath `@nac3/runtime/extensions` | AUTO 100% | -- | smoke conferma la presenza di file + d.ts |
| Subpath `@nac3/runtime/chat-client` | AUTO 100% | -- | smoke conferma la presenza di file + d.ts |
| CLI `npx @nac3/runtime validate` | AUTO 100% | MAN (eseguire contro un progetto costruito esternamente dal team) | smoke esegue la CLI contro la dir demos; manuale = eseguire contro il repo del cliente prima del rilascio |

## 3. Demo (live su yujin.app/nac-spec/)

| Demo | Copertura AUTO | Gate manuale | Note |
|------|----------------|--------------|------|
| `index.html` (landing) | BOTH | MAN (tour autopilot + invio chat) | Playwright 01-landing.spec.ts verifica la superficie; manuale = eseguire l'autopilot da un browser reale, narrazione udibile |
| `example.php` (riferimento v1.9) | AUTO | MAN (click-through dei 27 widget) | Playwright 02-demo-v19 verifica l'avvio; manuale = percorrere tutti i 27 widget, nessun errore in console |
| `example-v20-full.php` (brownfield) | AUTO | MAN (pulsanti describe_v2 / validate_global_v2 del pannello v20) | Playwright 03-demo-v20 copre pannello + ack bindAction; manuale = cliccare ogni pulsante del pannello + ispezionare l'output |
| `example-v20-primitives-showcase.php` | -- | MAN (percorso didattico per primitiva) | Demo puramente educativa; manuale = il tour degli 8 primitivi |
| `example-v21-data-table.php` | AUTO | MAN (chat vocale con microfono) | Playwright 04-demo-v21 copre dt_state + tab.permissions; manuale = usare il microfono vocale, osservare il dispatch corretto dell'LLM |
| `example-v22-interop.php` (anteprima v2.3) | AUTO | MAN (usare le 4 CTA in ordine) | Playwright 05-demo-v22-interop end-to-end; manuale = il flusso a 4 pulsanti con occhi sullo schermo |
| `demos/react/` (caso studio compilato) | AUTO | MAN (aggiunta/eliminazione via chat) | Playwright 06-demo-react copre mount + add; manuale = inviare via mic reale "agrega leche", osservare l'aggiornamento dello stato React |
| `demos/angular/` (caso studio compilato) | AUTO | MAN (aggiunta/eliminazione via chat) | Playwright 07-demo-angular copre mount + add; manuale = stesso di React |

## 4. Documentazione

| Doc | Copertura AUTO | Gate manuale | Note |
|-----|----------------|--------------|------|
| `SPEC.md` (v2.2 canonico) | -- | MAN (revisione PR da parte di un maintainer) | La spec è in prosa; nessun test automatico possibile. Un umano rivede ogni parola |
| `ABOUT.md` | -- | MAN (revisione PR) | Stesso |
| `CONTRIBUTING.md` | -- | MAN (revisione PR) | Stesso |
| `SECURITY.md` | -- | MAN (revisione PR) | Stesso. Più rilettura trimestrale del threat model |
| `README_DEMOS.md` | -- | MAN | Verifica manuale dei link |
| `docs/NAC_V22_ROADMAP.md` | -- | MAN | Aggiornamento + revisione per release |
| `docs/NAC_TEST_MANUAL.md` | AUTO (link) | MAN (revisione PR) | Il layer 3 di test-launch.sh verifica l'esistenza di tutti gli 11 doc; manuale = leggere per verificare l'accuratezza |
| `docs/COVERAGE_REPORT_2026_05_10.md` | -- | MAN (rigenerare per ogni release) | Questo è il registro di copertura; un umano lo scrive per ogni release |
| `docs/NAC_INTEROP_MCP.md` | -- | MAN | Proposta di spec, revisionata da umani |
| `docs/NAC_LAUNCH_DIFFUSION.md` | -- | MAN | Playbook interno |
| `docs/CASE_STUDIES_DISCOVERY.md` | -- | MAN | Postmortem dei bug; curato da umani |
| `docs/LAUNCH_PLAN_2026_05_10.md` | -- | MAN (storico) | Registro storico |
| `docs/TEST_COVERAGE_MATRIX.md` (questo file) | AUTO (link) | MAN | Aggiornare per ogni release |
| `docs/VOICE_CHAT_ERROR_ANALYSIS_2026_05_09.md` | -- | MAN | Analisi storica dei bug |
| `docs/HUMAN_OK_CHECKLIST.md` | -- | MAN (Pablo la esegue) | La checklist stessa; Pablo la esegue |

## 5. Guide per l'adozione

| Guida | Copertura AUTO | Gate manuale | Note |
|-------|----------------|--------------|------|
| `guides/REACT.md` | -- | MAN (revisione PR + feedback degli adottanti) | Lo snippet hello-world dovrebbe ancora compilare; manuale = verifica annuale con rebuild |
| `guides/ANGULAR.md` | -- | MAN (revisione PR) | Stesso |
| `guides/LLM_WIRING.md` | -- | MAN (revisione PR) | Il backend Node di riferimento funziona; manuale = eseguirlo contro la spec live |
| `guides/AI_PLAYBOOK_NEW_PROJECT.md` | -- | MAN (revisione PR) | Le asserzioni dei passi devono rimanere eseguibili |
| `guides/AI_PLAYBOOK_MIGRATION.md` | -- | MAN (revisione PR) | Stesso |
| `guides/IMPACT_TESTING.md` | -- | MAN (revisione PR) | Affermazioni sull'impatto; aggiornare i numeri ogni trimestre |
| `guides/IMPACT_RPA.md` | -- | MAN (revisione PR) | Stesso |
| `guides/RPA_UIPATH.md` | -- | MAN (eseguire il workflow di esempio una volta per release) | Manuale = esercitare InvoiceFromCSV.xaml |
| `guides/RPA_AUTOMATION_ANYWHERE.md` | -- | MAN | Stessa struttura |
| `guides/RPA_BLUE_PRISM.md` | -- | MAN | Stessa struttura |
| `guides/RPA_PLAYWRIGHT.md` | AUTO (suite di riferimento) | MAN (revisione PR) | I pattern sono esercitati da `tests/e2e-nac/specs/`; manuale = leggere una volta per release |

## 6. Suite di test

| Suite | Copertura AUTO | Gate manuale | Note |
|-------|----------------|--------------|------|
| `packages/nac/test/smoke.mjs` | AUTO (self) | MAN (revisione del tasso di superamento) | 36 controlli; manuale = verificare il conteggio una volta per release |
| `packages/nac/test/v22.mjs` | AUTO (self) | -- | 14 unit test |
| `packages/nac/test/v23-interop.mjs` | AUTO (self) | -- | 14 unit test |
| `packages/nac/test/stage1-audio.mjs` | AUTO (self) | MAN (rigenerare il corpus per locale) | 33 controlli; manuale = ascoltare un campione del corpus TTS, verificare che sia udibile |
| `packages/nac/test/stage2-disambiguation.mjs` | AUTO (self) | -- | 31 controlli |
| `packages/nac/test/stage3-backend.mjs` | AUTO (self, live) | MAN (revisione delle risposte LLM) | 45 prompt x 10 locale; manuale = spot-check che l'LLM non sia andato in drift su 2 prompt casuali |
| `packages/nac/test/stage4-calls.mjs` | AUTO (self) | -- | 31 controlli |
| `packages/nac/test/stage6-ack.mjs` | AUTO (self) | -- | 16 controlli |
| `packages/nac/test/stage6b-longtail.mjs` | AUTO (self) | -- | 14 controlli |
| `tests/e2e-nac/specs/*.spec.ts` | AUTO (self) | MAN (revisione visiva di una run headed una volta per release) | 16 spec; manuale = eseguire con `--headed` una volta per osservare visivamente |
| Corpus TTS (30 file MP3) | AUTO (presenza + dimensione) | MAN (ascoltare 1 per locale) | Manuale = campionare 10 file, confermare che siano udibili e privi di artefatti |
| `tools/nac/test-launch.sh` | AUTO (self) | -- | Orchestratore |
| `tools/nac/discovery-loop.sh` | AUTO (self) | -- | Loop di discovery + fix |

## 7. Pacchetti dei casi studio

| Pacchetto | Copertura AUTO | Gate manuale | Note |
|-----------|----------------|--------------|------|
| Sorgente `packages/nac-react-demo/` | AUTO (build + Playwright) | MAN (visivo sul dist deployato) | Build Vite pulita; Playwright copre todos+chat+autopilot |
| Dist deployato `packages/nac-react-demo/` | AUTO | MAN (aprire in incognito, percorrerlo) | Manuale = il walkthrough umano su /demos/react/ |
| Sorgente `packages/nac-angular-demo/` | AUTO | MAN | Stessa struttura |
| Dist deployato `packages/nac-angular-demo/` | AUTO | MAN | Stesso |

## 8. Aspetti trasversali

| Aspetto | Copertura AUTO | Gate manuale | Note |
|---------|----------------|--------------|------|
| Completezza del catalogo i18n | AUTO (validatore) | MAN (revisione da parte di un madrelingua per locale) | Il validatore in strict mode segnala le chiavi mancanti; il madrelingua verifica che le stringhe abbiano senso culturalmente |
| Firma del manifest HMAC | AUTO (unit) | MAN (smoke su deploy multi-tenant) | I unit test firmano + verificano; manuale = smoke in produzione contro il flusso di distribuzione dei secret |
| Gating isTrusted | AUTO (unit) | MAN (click reale vs sintetico affiancati) | Il unit v22 copre il flag; manuale = la coppia di pulsanti istrusted_real / istrusted_fake su example-v20-full.php |
| Interop cross-origin (v2.3) | AUTO (mock) | MAN (peer reale con bearer token reale) | v23-interop usa un mock in-page; manuale = almeno un test cross-origin prima di dichiarare v2.3 GA |
| Deploy su yujin.app | AUTO (push -> auto-deploy) | MAN (verificare che gli URL restituiscano 200 + contenuto corretto) | GoDaddy esegue il deploy automaticamente; manuale = curl di tutti gli URL critici dopo ogni push su main |
| Riproduzione audio nel browser reale | -- | MAN (test microfono + altoparlante) | La Web Speech API richiede hardware reale; manuale = premere il microfono nella demo v21 live, pronunciare un prompt per locale |

## Riepilogo -- copertura ponderata per categoria

| Categoria | AUTO | MAN | BOTH | Stato della copertura |
|-----------|------|-----|------|-----------------------|
| Artefatti runtime | 4 | 0 | 0 | ECCELLENTE (media auto 95%) |
| Pacchetto NPM | 4 | 0 | 0 | ECCELLENTE (100% auto) |
| Demo | 6 | 1 | 1 | BUONO (auto per invarianti, manuale per UX) |
| Documentazione | 1 | 14 | 0 | ATTESO (i doc vengono revisionati, non testati con unit test) |
| Guide per l'adozione | 0 | 10 | 0 | ATTESO |
| Suite di test | 13 | 4 | 0 | ECCELLENTE |
| Pacchetti dei casi studio | 2 | 2 | 0 | BUONO (auto + visivo manuale) |
| Aspetti trasversali | 4 | 2 | 0 | BUONO |
| **TOTALE** | **34** | **33** | **1** | **ECCELLENTE** |

## Come usare questa matrice

### Per ogni release

1. Taggare la versione della spec + la versione della suite di riferimento.
2. Eseguire `bash tools/nac/test-launch.sh` -- ogni riga AUTO è un gate.
3. Percorrere la colonna MAN -- la [checklist Human OK](HUMAN_OK_CHECKLIST.md) è la forma eseguibile.
4. Aggiornare COVERAGE_REPORT_<data>.md con i risultati dell'esecuzione.
5. Adeguare questa matrice se il panorama degli artefatti è cambiato.

### Per ogni adottante

Copiate questa struttura di matrice per la vostra app. Sostituite i
nomi degli artefatti; mantenete la stessa forma. La disciplina è la stessa:
ogni artefatto riceve un gate esplicito auto + manuale.

### Anti-pattern

NON contrassegnare un artefatto come "AUTO" se il test verifica solo la
presenza del file. AUTO significa che il test esercita un comportamento. I
controlli di presenza dei file vanno nell'harness (test-launch.sh), non nella
matrice degli artefatti.

## Vedi anche

- [NAC_TEST_MANUAL.md](NAC_TEST_MANUAL.md) -- il playbook da cui
  deriva questa matrice.
- [HUMAN_OK_CHECKLIST.md](HUMAN_OK_CHECKLIST.md) -- la forma eseguibile
  della colonna MAN.
- [COVERAGE_REPORT_2026_05_10.md](COVERAGE_REPORT_2026_05_10.md)
  -- i risultati effettivi dell'esecuzione per la release corrente.

## Licenza

Apache-2.0.

---

*This is a machine translation of the canonical English
version at `/nac-spec/docs/TEST_COVERAGE_MATRIX.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
