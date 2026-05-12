---
translation_source: docs/HUMAN_OK_CHECKLIST.md
translation_source_hash: 2b87f1b0665762daf6be1ad520c7ba16f977d21771e6574ae60451039baada31
translation_quality: machine_v1
translation_lang: it
translation_date: 2026-05-11T14:33:43.971738+00:00
---

# NAC3 -- Checklist di approvazione umana (Human OK)

**Versione spec:** 2.2 + anteprima v2.3.
**Ultima esecuzione:** 2026-05-11 (da aggiornare ad ogni release).
**Scopo:** forma eseguibile della colonna MAN in
[TEST_COVERAGE_MATRIX.md](TEST_COVERAGE_MATRIX.md). Un operatore
umano percorre ogni voce qui sotto e spunta la casella. Se anche
un solo elemento fallisce, la release NON viene pubblicata --
aprire un bug e correggerlo prima di riprovare.

Questo documento NON sostituisce i test automatizzati. La suite
automatica (`bash tools/nac/test-launch.sh`) DEVE essere verde
prima di iniziare questa checklist. La checklist esiste per tutto
ciò che l'automazione non può verificare: audio reale, sensazione
cross-browser, formulazioni da madrelingua, handshake cross-origin
con un peer live, rifinitura visiva.

---

## Come usare questo documento

1. Aprire una finestra di navigazione in incognito (Chrome + Firefox + Safari,
   in quest'ordine; ripetere le sezioni visive per ciascun browser).
2. Percorrere le sezioni in ordine -- alcune dipendono dal fatto che
   la precedente sia attiva (es. l'interop richiede che entrambe le
   demo siano caricate).
3. Spuntare ogni `[ ]` solo dopo conferma personale. Non delegare.
   In caso di dubbio, segnare `[?]` e consultare il responsabile della spec.
4. Al termine, firmare e datare il blocco SIGN-OFF.
5. Fare il commit del file con il nuovo timestamp di esecuzione.

Tempo stimato per passaggio: **45-60 minuti**. Non affrettarsi; lo
scopo di questo gate è proprio coprire ciò che l'automazione non vede.

---

## 1. Artefatti runtime

### 1.1 Smoke test cross-browser -- `js/nac.js` + `nac-v2-extensions.js`

Per ciascun browser (Chrome, Firefox, Safari):

- [ ] Aprire `https://yujin.app/nac-spec/example.php` in
      incognito.
- [ ] La console non mostra errori dopo 5 secondi.
- [ ] `NAC.describe().plugins[0]` restituisce un oggetto nella
      console.
- [ ] `NAC.list_registered_plugins()` restituisce almeno uno
      slug.
- [ ] Cliccare un pulsante decorato con `data-nac-role="action"`
      -- funziona E viene emesso un evento `nac:action:succeeded`
      (ascoltare tramite `document.addEventListener` nella console).

### 1.2 Client chat live -- `nac-chat-client.js`

- [ ] Su `example-v21-data-table.php`, premere il pulsante microfono.
- [ ] Dire "ve a permisos" -- la chat esegue un cambio di tab,
      non una risposta in testo libero.
- [ ] Ripetere in inglese ("go to permissions") + portoghese
      ("vai para permissoes") -- dispatch corretto.
- [ ] Dire "cambia de pestaña" -- la locale NON passa al tedesco
      (guardia di regressione per V22-03).

### 1.3 Runtime interop -- `nac-mcp-interop.js`

- [ ] Aprire `example-v22-interop.php`.
- [ ] Usare le 4 CTA nell'ordine: Export tree -> Import remote ->
      List remote apps -> Disconnect remote.
- [ ] Ogni CTA registra il successo nel proprio pannello di output.
- [ ] Dopo Disconnect, l'app remota non compare più in
      `NAC.list_remote_apps()`.

---

## 2. Pacchetto NPM

### 2.1 Smoke test di installazione pulita

- [ ] In una directory temporanea:
      ```
      mkdir /tmp/nac-smoke && cd /tmp/nac-smoke
      npm init -y
      npm install @nac3/runtime
      node -e "import('@nac3/runtime').then(m => console.log(Object.keys(m)))"
      ```
- [ ] L'output include `NAC`, `registerPlugin` e i validatori.
- [ ] Nessun avviso di deprecazione durante l'installazione.

### 2.2 Validatore CLI su un progetto esterno

- [ ] Scegliere un progetto non-Yujin a disposizione (una demo di
      adozione o qualsiasi cartella).
- [ ] Eseguire `npx @nac3/runtime validate .` dalla sua root.
- [ ] L'output è leggibile, elenca 0 BLOCKERS, esce con 0 se
      pulito / con valore non zero in presenza di segnalazioni.

---

## 3. Demo

### 3.1 Landing -- `index.html`

- [ ] La pagina si renderizza con il branding sumi-e, senza FOUC.
- [ ] Cliccare "Autopilot" -- il tour di 5 secondi parte, la
      narrazione è udibile (TTS, non silenziosa).
- [ ] Aprire la chat -- digitare "que es NAC3?" -- ricevere una
      risposta coerente, non un errore.

### 3.2 Demo di riferimento -- `example.php`

- [ ] Percorrere ognuno dei 27 widget visibili sulla pagina.
- [ ] Zero errori in console dopo l'intera navigazione.
- [ ] Zero widget non responsivi (nessun click che non produce
      alcun effetto).

### 3.3 Demo brownfield -- `example-v20-full.php`

- [ ] Il `v20-panel` è visibile in alto a destra dopo il caricamento.
- [ ] Cliccare "describe_v2" -- il pannello mostra output JSON valido.
- [ ] Cliccare "validate_global_v2" -- il pannello mostra le
      segnalazioni (o "0 findings, OK").
- [ ] Cliccare ciascuno dei 6 pulsanti nel v20-panel -- tutti
      emettono `nac:action:succeeded` (visibile in console se il
      listener è attivo).
- [ ] Pulsante istrusted_fake -- l'ack NON viene emesso (il
      runtime rifietta correttamente i click sintetici per i verbi
      con gate isTrusted).
- [ ] Pulsante istrusted_real (click umano reale) -- l'ack VIENE
      emesso.

### 3.4 Showcase dei primitivi -- `example-v20-primitives-showcase.php`

- [ ] Ciascuno degli 8 primitivi renderizza una sezione con un
      esempio funzionante.
- [ ] Il testo didattico in ogni sezione è leggibile correttamente
      (nessun segnaposto corrotto).

### 3.5 Demo data-table -- `example-v21-data-table.php`

- [ ] Premere il microfono, dire "agrega una linea con concepto leche
      cantidad 2 precio 100" -- una riga appare nella tabella
      della collezione.
- [ ] Dire "cuanto total hay?" -- la chat risponde con un numero,
      non con la tabella grezza.
- [ ] Dire "ve a permisos" -- il tab cambia.

### 3.6 Demo interop -- `example-v22-interop.php`

- [ ] Già verificato nella sezione 1.3.
- [ ] Bonus: aprire la pagina in due tab del browser, ripetere
      l'handshake -- deve funzionare anche tra tab (ogni tab è
      una propria istanza NAC, il layer interop fa da bridge).

### 3.7 Caso studio React -- `demos/react/`

- [ ] Aprire `https://yujin.app/nac-spec/demos/react/`.
- [ ] Digitare "leche" nella casella di testo, cliccare "Add" --
      il todo appare.
- [ ] Aprire la chat, dire (via microfono) "agrega pan" -- il todo
      "pan" appare tramite il percorso guidato dalla chat. Questa è
      la guardia di regressione per il bug #2 del caso studio.
- [ ] Dire "borra leche" -- il todo "leche" scompare.

### 3.8 Caso studio Angular -- `demos/angular/`

- [ ] Stessi 4 controlli del caso React, su
      `/nac-spec/demos/angular/`.

---

## 4. Documentazione

Per ciascuno dei documenti elencati di seguito, leggere dall'inizio
alla fine almeno una volta per ogni release trimestrale. Verificare:

- Il timbro di versione è aggiornato (v2.2).
- Nessun link interno interrotto.
- Nessun TODO in sospeso.
- Gli snippet di codice si compilano / eseguono come mostrato.

- [ ] `SPEC.md` (contratto canonico).
- [ ] `ABOUT.md`.
- [ ] `CONTRIBUTING.md`.
- [ ] `SECURITY.md` -- più rilettura trimestrale del modello di minaccia.
- [ ] `README_DEMOS.md`.
- [ ] `docs/NAC_V22_ROADMAP.md`.
- [ ] `docs/NAC_TEST_MANUAL.md`.
- [ ] `docs/NAC_INTEROP_MCP.md`.
- [ ] `docs/NAC_LAUNCH_DIFFUSION.md`.
- [ ] `docs/CASE_STUDIES_DISCOVERY.md`.
- [ ] `docs/TEST_COVERAGE_MATRIX.md` (questa matrice è il documento
      gemello).
- [ ] `docs/VOICE_CHAT_ERROR_ANALYSIS_2026_05_09.md`.

---

## 5. Guide all'adozione

Per ogni guida, verificare che lo snippet hello-world compili ancora e che i passaggi portino un nuovo lettore a un'installazione funzionante:

- [ ] `guides/REACT.md` -- lo snippet compila su Vite + React 18.
- [ ] `guides/ANGULAR.md` -- lo snippet compila su Angular 17 standalone.
- [ ] `guides/LLM_WIRING.md` -- il backend Node di riferimento si avvia e il contract test di esempio passa.
- [ ] `guides/AI_PLAYBOOK_NEW_PROJECT.md` -- le asserzioni sui passaggi corrispondono ancora all'API runtime.
- [ ] `guides/AI_PLAYBOOK_MIGRATION.md` -- idem.
- [ ] `guides/IMPACT_TESTING.md` -- i numeri vanno riletti per verificarne l'attualità (ricontrollare ogni trimestre).
- [ ] `guides/IMPACT_RPA.md` -- idem.
- [ ] `guides/RPA_UIPATH.md` -- eseguire il campione `InvoiceFromCSV.xaml` almeno una volta (o l'equivalente nell'ultima versione di UiPath Studio).
- [ ] `guides/RPA_AUTOMATION_ANYWHERE.md` -- workflow campione equivalente.
- [ ] `guides/RPA_BLUE_PRISM.md` -- object study campione equivalente.

---

## 6. Suite di test

- [ ] Eseguire `bash tools/nac/test-launch.sh` -- TUTTI VERDI in meno di 15 secondi.
- [ ] Verificare il contatore smoke (`36 PASS`) -- corrisponde al totale atteso.
- [ ] Aprire `packages/nac/test/fixtures/voice/` -- selezionare 1 file per locale (10 file in totale) -- riprodurre con un lettore audio -- udibile e intellegibile.
- [ ] Controllare a campione 2 prompt LLM casuali da `stage3-backend.mjs` -- le risposte hanno senso, nessuna deriva.
- [ ] Eseguire la suite Playwright con `--headed` una volta (`npx playwright test --headed`) -- osservare visivamente l'interfaccia di ogni spec durante l'esecuzione.
- [ ] Eseguire `bash tools/nac/discovery-loop.sh 1` -- un ciclo completo con 0 rilevamenti.

---

## 7. Pacchetti di studio dei casi

- [ ] `packages/nac-react-demo/` compila senza errori (`npm run build`).
- [ ] Il dist React distribuito si comporta in modo identico alla build locale.
- [ ] `packages/nac-angular-demo/` compila senza errori.
- [ ] Il dist Angular distribuito si comporta in modo identico.

---

## 8. Aspetti trasversali

### 8.1 i18n

- [ ] Scegliere un locale (ruotare ad ogni release) -- inviare a un madrelingua per la verifica a campione di 10 stringhe casuali.
- [ ] Il validatore conferma 0 chiavi mancanti su tutti i 10 locale (`NAC.validate_global({locale: 'all'})`).

### 8.2 HMAC + provenienza

- [ ] Eseguire lo smoke multi-tenant contro il tenant di staging -- la firma del manifest viene verificata, nessun errore `provenance_mismatch` nei log.

### 8.3 Gating isTrusted

- [ ] Su `example-v20-full.php`, il test affiancato istrusted_real vs istrusted_fake (trattato nel punto 3.3 sopra) SUPERA il diff visivo: il reale genera l'ack, il falso no.

### 8.4 Interoperabilità cross-origin (anteprima v2.3)

- [ ] Almeno UN test cross-origin prima di dichiarare v2.3 GA: aprire la demo di interoperabilità contro un peer NAC3 remoto ospitato su un'origine diversa, bearer token reale, CORS preflight reale. Il roundtrip ha successo.

### 8.5 Distribuzione

- [ ] Dopo il push della release, eseguire curl su questi URL e confermare 200 + contenuto corretto:
      - `https://yujin.app/nac-spec/index.html`
      - `https://yujin.app/nac-spec/SPEC.md`
      - `https://yujin.app/nac-spec/js/nac.js`
      - `https://yujin.app/nac-spec/js/nac-chat-client.js`
      - `https://yujin.app/nac-spec/example.php`
      - `https://yujin.app/nac-spec/example-v21-data-table.php`
      - `https://yujin.app/nac-spec/example-v22-interop.php`
      - `https://yujin.app/nac-spec/demos/react/`
      - `https://yujin.app/nac-spec/demos/angular/`

### 8.6 Audio reale

- [ ] Hardware reale (microfono e altoparlante del laptop) -- premere il microfono sul `example-v21-data-table.php` live, pronunciare un prompt per locale (10 prompt in totale) -- il dispatch LLM ha senso in ogni locale.

---

## 9. Verifica con screen reader (accessibilità -- Track G7)

Questa sezione percorre le demo con uno screen reader attivo e il monitor spento (o con gli occhi letteralmente chiusi). È il requisito per l'impegno sull'accessibilità descritto in [ACCESSIBILITY.md](ACCESSIBILITY.md).

Eseguire questa sezione su almeno DUE screen reader per ogni release (NVDA è il più semplice su Windows; VoiceOver è preinstallato su macOS; JAWS se si dispone di una licenza).

### 9.1 NVDA (Windows)

- [ ] Installare NVDA (gratuito, nvaccess.org). Avviare con Ctrl+Alt+N.
- [ ] Aprire `https://yujin.app/nac-spec/index.html` con il monitor spento (o con gli occhi chiusi).
- [ ] NVDA annuncia il titolo della pagina e una struttura gerarchica delle intestazioni (h1, h2, h3) durante la navigazione con il tasto H.
- [ ] Il tasto Tab raggiunge ogni controllo interattivo in un ordine logico; ogni controllo annuncia chiaramente il proprio ruolo e la propria etichetta.
- [ ] Aprire il pannello chat (NVDA legge che l'input chat ha role=textbox con un'etichetta chiara).
- [ ] Digitare "que es NAC3?" + inviare -- NVDA legge la risposta per intero quando arriva.

### 9.2 NVDA su `example-v21-data-table.php`

- [ ] NVDA annuncia "Lines (collection) tab" e il tab Permissions durante la navigazione con Tab.
- [ ] L'attivazione di un tab annuncia il nuovo stato tramite l'ack dell'evento `nac:tab:activated`.
- [ ] Quando l'LLM aggiunge una riga, NVDA legge il contenuto della nuova riga senza ulteriori input (o con una singola freccia giù).

### 9.3 VoiceOver (macOS)

- [ ] Cmd+F5 per avviare VoiceOver.
- [ ] Aprire `https://yujin.app/nac-spec/index.html`.
- [ ] VO+U apre il rotore; verificare che intestazioni, link e controlli del modulo siano popolati.
- [ ] VO+A legge l'intera pagina dall'inizio alla fine -- il risultato ha senso semanticamente, non "div div div link link button".

### 9.4 VoiceOver sui casi di studio React + Angular

- [ ] Su `demos/react/`: aggiungere un todo tramite il campo di input usando solo tastiera + VoiceOver. Il nuovo todo viene annunciato al momento dell'aggiunta (l'evento ack è collegato).
- [ ] Su `demos/angular/`: stesso test, stessa aspettativa.

### 9.5 Navigazione solo da tastiera (nessuno screen reader, solo senza mouse)

- [ ] Disconnettere/disabilitare il mouse.
- [ ] Navigare la pagina di destinazione usando solo il tasto Tab. Ogni punto di focus è visibile (anello di focus presente).
- [ ] Aprire il pannello chat da tastiera, digitare un prompt, inviare. Il risultato viene narrato/visualizzato correttamente.
- [ ] Escape chiude qualsiasi modale aperta.
- [ ] Nessuna trappola da tastiera (Tab alla fine torna all'inizio).

### 9.6 Alto contrasto + zoom al 200%

- [ ] Zoom del browser al 200% sulla pagina di destinazione. Il layout NON si rompe, nessuno scroll orizzontale, nessun testo sovrapposto.
- [ ] Modalità alto contrasto di Windows (o Aumenta contrasto su macOS). Pulsanti, link e anelli di focus rimangono visibili.

### 9.7 Controllo vocale (il caso ricorsivo)

- [ ] Su un browser con Pilot attivo (o usando il pulsante microfono del `nac-chat-client.js` di riferimento), controllare le demo solo con la voce.
- [ ] Il pulsante microfono annuncia il proprio stato a NVDA/VoiceOver ("registrazione avviata", "registrazione interrotta").
- [ ] I comandi vocali inviati tramite NAC3 hanno effetto; l'ack viene annunciato allo screen reader.

### 9.8 Problemi di accessibilità rilevati

Elencare qui eventuali problemi riscontrati in questa sezione, con la relativa gravità:

```
-
-
-
```

Se è aperto un problema di gravità BLOCCANTE, la release NON viene distribuita fino alla sua risoluzione.

---

## APPROVAZIONE FINALE

```
Tag di release:         v____._.___
Verificato da:          ______________________
Verificato il:          ____-____-____
Browser utilizzati:     [ ] Chrome  [ ] Firefox  [ ] Safari
Madrelingua consultati (locale -> nome):
   ____________________________________________
Elementi totali verificati:  ___ / ___
Elementi falliti (elenco con link ai bug):
   ____________________________________________
   ____________________________________________
Firma:                  ______________________
```

Eseguire il commit di questo file con il blocco APPROVAZIONE FINALE compilato per contrassegnare la release come "approvata da un essere umano".

---

## Vedere anche

- [TEST_COVERAGE_MATRIX.md](TEST_COVERAGE_MATRIX.md) -- la matrice da cui deriva questa checklist.
- [NAC_TEST_MANUAL.md](NAC_TEST_MANUAL.md) -- il playbook upstream per gli adottanti.
- [COVERAGE_REPORT_2026_05_10.md](COVERAGE_REPORT_2026_05_10.md) -- il report di copertura automatico per la release corrente.

## Licenza

Apache-2.0.

---

*This is a machine translation of the canonical English
version at `/nac-spec/docs/HUMAN_OK_CHECKLIST.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
