---
translation_source: docs/VOICE_CHAT_ERROR_ANALYSIS_2026_05_09.md
translation_source_hash: 1c92bf209ccbc809e9d43062cc65ea0594983593f9e93293ae2912837f639f8d
translation_quality: machine_v1
translation_lang: it
translation_date: 2026-05-11T14:39:11.661560+00:00
---

# Analisi degli errori -- sessione voce+chat 2026-05-09

> Sessione di test di Pablo su `example-v20-full.php` con voce +
> chat. Questo documento isola i difetti osservati, li classifica
> per causa radice e propone una correzione concreta per ciascuno.
> ASCII-only.
>
> **STATUS 2026-05-09 (fine giornata):** gli 8 fix del
> roadmap sono implementati (C1..C8). Vedere la sezione 7 alla fine
> con il riepilogo delle modifiche + posizione nel codice.

---

## 1. Sommario esecutivo

7 categorie di difetti rilevate. 4 sono **bug riproducibili**
con causa radice identificata nel codice; 2 sono **limitazioni
di design della pipeline vocale** che richiedono un cambio di
architettura; 1 è **un blocker di UX** (il modal blocca la chat).

Severità:

| Categoria | Severità | Tipo | Priorità |
|---|---|---|---|
| C1. Feedback loop TTS -> STT | **CRITICAL** | architettura | immediata |
| C2. Matcher per sotto-stringa attiva comandi | **HIGH** | bug | immediata |
| C3. Modal di conferma blocca la chat | **HIGH** | UX | alta |
| C4. v20_panel.X non risolve via chat | **MEDIUM** | bug | media |
| C5. Frammenti STT eseguiti come comandi | **MEDIUM** | architettura | media |
| C6. "show" in inglese mappa male quando v20_panel non è presente | derivato da C4 | -- | risolto chiudendo C4 |
| C7. "cambia lingua" inconsistente | **LOW** | bug | bassa |

---

## 2. Diario dei comandi (input -> output -> diagnosi)

| # | Input voce / chat | Risposta del bot | Diagnosi |
|---|---|---|---|
| 1 | "apreta describe_v20" | "No encuentro esa accion. Lo mas parecido: Correr el self-test, Ver capacidades, Ver mapa del sistema." | **C4** -- il manifest v20_panel non è nell'albero ricevuto dal backend. Il bot cerca nell'albero che vede e i top-3 sono gli slug reali presenti. |
| 2 | "pulsa boton show" | "Mostrando el mapa del sistema." | **C6** = conseguenza di C4. La parola "show" in EN dovrebbe corrispondere a `v20_panel.toggle` (label EN "Toggle panel"), ma poiché quel plugin non è nell'albero, il matcher ricade su `navmap.fetch_map` (label "Show the system map"). |
| 3 | "ve a NAC3 v2.0 layer y pulsa el boton mostrar" | "No veo una capa v2.0 ni un boton 'mostrar'. Lo mas cercano: Ver mapa, Ver capacidades, Listar secciones." | **C4** -- coerente con #1. Se v20_panel è nell'albero, il bot trova `v20_panel.toggle`. Altrimenti no. |
| 4 | "cambia a ingles" | "No encuentro un control de idioma en esta pagina..." | **C7** -- inconsistente: il comando #16 (identico) ha funzionato. |
| 5 | "pulsa system map" | "Pulsando NAC.system_map()." | OK (corretto). Lo slug `navmap.fetch_map` è nell'albero. |
| 6 | "pulsa capacidades" | "Pulsando NAC.capabilities()." | OK. Slug `navmap.caps`. |
| 7 | "pulsa ver capacidades" | "Pulsando Ver capacidades." | OK. Stesso slug. |
| 8 | "filtra por ricardo" | "Filtrando la tabla por 'ricardo'." | OK. Tabella con filtro live. |
| 9 | "pon brasil" | "Pongo Brasil en el campo Pais." | OK. Datalist autocomplete. |
| 10 | "sube volumen a 80" | "Subiendo volumen a 80%." | OK. Slider. |
| 11 | "Porqué no me iluminas mostrándome el monte" | "Te muestro el Monte Fuji." | OK. Frase lunga + indiretta -- il LLM mappa correttamente sull'icona `art.fuji`. |
| 12 | "secretísimo" | "Abriendo el modal secreto." | OK. |
| 13 | "elimina factura" | "Eliminando la factura." | **C3** -- l'azione è distruttiva ma NON viene interposta una conferma prima di eseguirla; il modal appare DOPO ma la chat rimane bloccata (vedi C3). |
| 14 | "Voz activada" (era TTS del bot) | "Eliminando la factura." | **C1** -- feedback loop. Il TTS ha detto "Voz activada" e lo STT lo ha catturato. La parola "Voz activada" non dovrebbe corrispondere a nulla, ma per C2 "activada" viene associata a un comando di eliminazione precedente nel buffer. |
| 15 | "voz activada" (eco) | "Eliminando la factura." | **C1** + **C2** -- il ciclo si ripete. |
| 16 | "eliminatorias" | "Eliminando la factura." | **C2** -- il matcher usa la sotto-stringa: il prefisso "elimin" corrisponde a "eliminar". Qualsiasi parola che inizia con "elimina" attiva l'azione. |
| 17 | "Muéstrame factura" | "Previsualizando la factura." | OK. |
| 18 | "Manos libres activado..." (TTS) -> "manos libres activado" (STT) | "Modo manos libres confirmado." | **C1** -- stesso loop. |
| 19 | "modo manos libres confirmado Dime cuáles son tus capacidades" | "Mostrando las capacidades del sistema." | L'input è la risposta del bot concatenata al comando dell'utente. Ha funzionato perché "capacidades" ha un match forte. **C5** parziale. |
| 20 | "del sistema" | "Mostrando el mapa del sistema." | **C5** -- un frammento dell'input precedente viene elaborato come comando indipendente. |
| 21 | "corre el test" | "Corriendo el self-test de NAC." | OK. |
| 22 | "de nac" | "Corriendo el self-test de NAC." | **C5** -- frammento. |
| 23 | "cambia a inglés" | "Switching to English mode for upcoming replies." | OK. **MA** inconsistente con #4 (stesso input, risposta diversa). |
| 24 | "cambia el idioma de la página a chino" | "No encuentro un control de idioma en esta página..." | **C7** -- il LLM non riconosce questo meta-comando come cambio di lingua della sessione, lo cerca come un controllo nell'albero. |

---

## 3. Causa radice per categoria

### C1 -- Feedback loop TTS -> STT (CRITICAL)

**Meccanismo:** il `SpeechSynthesisUtterance` riproduce la
risposta del bot dagli altoparlanti dell'utente. Il
`SpeechRecognition` è attivo contemporaneamente (modalità
mani libere). Il microfono cattura l'audio degli altoparlanti,
lo STT lo trascrive come input dell'utente, la chat lo elabora,
il bot torna a parlare: ciclo infinito.

Qualsiasi risposta del bot che contenga una parola
simile-a-comando (eliminar, mostrar, abrir, cambiar) può
attivare un'altra azione. Se la parola è distruttiva,
**produce danno reale**.

**Evidenza nel log:**
- "Voz activada" (TTS) -> catturato come input -> corrisposto
  contro "elimina" del buffer precedente -> elimina la fattura.
- "Manos libres activado. Te escucho de continuo." (TTS) ->
  catturato come "manos libres activado" -> bot risponde "Modo
  manos libres confirmado".
- "Modo manos libres confirmado" (TTS) -> catturato e
  concatenato all'input successivo.

**Soluzioni (in ordine di robustezza):**

1. **Half-duplex obbligatorio** (la correzione standard del
   settore):
   - `recognition.stop()` quando `speechSynthesis.speaking
     === true`.
   - `recognition.start()` riprende al termine dell'utterance
     (evento `onend` dell'utterance).
   - Costo: l'utente non può parlare SOPRA il bot. Accettabile
     nel 99% dei casi; aggiunge latenza percepita ma evita
     il loop.
2. **Filtro per contenuto** (difesa in profondità):
   - Mantenere un buffer circolare degli ultimi N (=10)
     `SpeechSynthesisUtterance.text` pronunciati dal bot negli
     ultimi 30 secondi.
   - Quando arriva un transcript dallo STT, normalizzarlo
     (lowercase, senza diacritici, trim) e confrontarlo con il
     buffer. Se coincide >70% con qualsiasi utterance recente,
     scartarlo silenziosamente.
3. **Conferma obbligatoria per azioni distruttive**
   (difesa di ultimo ricorso):
   - Qualsiasi azione con `data-nac-a11y-hint="destructive"` o
     marcata `irreversible` richiede un secondo turno di
     conferma esplicita PRIMA di essere eseguita. NAC3 v1.9
     definisce già `confirm_action()` per questo -- il demo
     non lo sta usando nel path distruttivo.

**Raccomandazione:** implementare (1) immediatamente + (3) a
breve termine. (2) opzionale per ambienti in cui l'utente vuole
poter interrompere il bot.

---

### C2 -- Matcher per sotto-stringa attiva comandi (HIGH)

**Meccanismo:** il resolver dell'intent (nel backend o nel
LLM) esegue il match per sotto-stringa. La parola
"eliminatorias" contiene "elimina" come prefisso, e "elimina"
è il verbo di un'azione registrata -> l'azione viene attivata.

**Evidenza:**
- "eliminatorias" -> "Eliminando la factura."

**Soluzione:** il matcher deve operare per **token completo**
(o per stem), non per sotto-stringa. Implementazione possibile:

- Tokenizzare l'input per spazi + punteggiatura.
- Per ogni token, confrontarlo con i verbi delle azioni
  applicando la normalizzazione dello stem spagnolo
  ("elimina/elimino/elimine/eliminar" -> stem `elimin`,
  "eliminatorias" -> stem `eliminatori`). Stem diversi ->
  nessun match.
- Mantenere una lista breve di stem "comando" nel system
  prompt (~30 verbi) per limitare l'euristica.

Il modulo `@nac-spec/test-runner/src/lib/matcher.js` esegue
già il matching per token completo (`indexOf` sull'intera
frase, non per sotto-stringa dello slug). Il bug è nel backend
intermediario, non nel matcher recente.

**Azione concreta:** verificare il system prompt
(`yjNacDemoSystemPrompt` in `crm_desa/api/v1/yujin.php`) e
aggiungere una regola esplicita: "verbi come `eliminar`,
`borrar`, `cancelar` corrispondono solo quando il token
completo dell'input coincide con il verbo coniugato, NON
quando è prefisso di un'altra parola."

---

### C3 -- Modal di conferma blocca la chat (HIGH)

**Meccanismo (segnalato da Pablo):** quando il bot attiva
un'azione distruttiva, appare un modal con i pulsanti
"Aprobar" / "Cancelar". Il modal usa `<dialog>` con focus
trap oppure un overlay con `inert` sul resto del DOM,
inclusa la chat. La chat diventa inaccessibile: non si può
scrivere, non si può dettare via voce, non si può confermare
tramite la conversazione.

**Conseguenza:** l'utente deve approvare/annullare
manualmente con un click. In modalità mani libere questo
rompe il contratto di "operabile via voce".

**Soluzione:**

1. Il modal di conferma deve essere **fuori dal focus trap**
   della chat -- o equivalentemente, la chat deve essere
   **fuori dal trap** del modal. Pratica: spostare la chat in
   `position: fixed` con `z-index` superiore al modal e
   `inert={false}` quando il modal si apre.
2. Il modal deve dichiarare i suoi pulsanti con `data-nac-id`
   (es. `confirm.approve`, `confirm.cancel`) e inserirli
   nell'albero NAC. Il chatbot può quindi eseguire il dispatch
   di "approva" o "annulla" via voce contro lo slug
   corrispondente.
3. Il TTS deve leggere automaticamente la domanda del modal
   ("Confermi l'eliminazione della fattura? Di' 'sì' o 'no'.")
   e lo STT deve interpretare la risposta direttamente come
   confirm/reject.

**Azione concreta:** verificare il componente modal-confirm in
`example-v20-full.php` (se esiste) o il hook generico di
`confirm_action()` in `js/nac.js` per garantire che il modal
NON racchiuda la chat nel suo albero di focus.

---

### C4 -- v20_panel.X non risolve via chat (MEDIUM)

**Meccanismo:** il JS della pagina chiama
`nacDemoSnapshotTree()` prima di ogni turno di chat per
serializzare l'albero NAC. Quella funzione chiama
`NAC.describe()` (v1, non `describe_v2()`). `NAC.describe()`
include SOLO i plugin già registrati tramite `NAC.register()`.

Il v20_panel si registra in `example-v20-full.php` all'interno
del blocco `<script>` alla fine del body, nella funzione
`bootV20()` che esegue il polling con `setTimeout(bootV20, 50)`
finché `NAC.scope` non esiste. Se:
- il browser è lento o il deploy del rc5 non è ancora arrivato
  (rpaforce-crm include la propria copia di
  `nac-v2-extensions.js`), `NAC.scope` non esiste e bootV20
  non viene eseguito,
- oppure bootV20 viene eseguito tardi, dopo che l'utente ha
  inviato il primo messaggio alla chat,

allora `NAC.describe()` non include il v20_panel e il backend
riceve un albero senza quegli slug.

**Evidenza:**
- "apreta describe_v20" -> il bot non trova
  `v20_panel.describe_v2`.
- "pulsa system map" -> il bot trova `navmap.fetch_map`
  (perché navmap si registra nel boot di example.js, molto
  prima).

**Soluzioni:**

1. **Migrare `nacDemoSnapshotTree` a `describe_v2()`** (quando
   disponibile). `describe_v2()` restituisce sia i
   v1_plugins (compat) che i v2_scope_entries -- garantisce
   che i manifest registrati via `NAC.register` E gli scope
   dichiarati via `NAC.scope` arrivino al backend.
2. **Bloccare l'invio del primo messaggio fino al completamento
   di `bootV20()`.** Il `chat-send` ha uno stato disabled
   finché non viene emesso `nac:v2_installed`.
3. **Garantire che `NAC.register({plugin_slug:'v20_panel'})`
   venga eseguito PRIMA di qualsiasi tentativo di `chatSend`.**
   Spostare quel register nel boot di `example.js` stesso
   (riga ~30 dove si trovano gli altri manifest) invece di
   differirlo allo script inline alla fine.

**Raccomandazione:** combinare (1) + (3). (1) è il fix
strutturale; (3) elimina la race condition.

---

### C5 -- Frammenti STT come comandi (MEDIUM)

**Meccanismo:** la Web Speech API restituisce risultati
parziali (`onresult` con `interim` true) e risultati finali.
La chat attuale elabora ogni risultato finale come un messaggio
indipendente. Quando l'utente fa una pausa tra "el del sistema"
e "muéstrame el mapa", lo STT può emettere due risultati
finali: "el del sistema" e poi "muéstrame el mapa", e il bot
li elabora entrambi.

Inoltre, la risposta del bot via TTS (problema C1) può
intromettersi ed essere elaborata come un frammento.

**Evidenza:**
- "del sistema" -> esegue "mostrare mappa del sistema" come
  se fosse un comando completo.
- "de nac" -> esegue "self-test de NAC3".

**Soluzione:**

1. **Buffer + debounce con timeout di silenzio**:
   - Accumulare i risultati finali in un buffer.
   - Inviare al backend solo dopo 800-1500 ms di silenzio
     dall'ultimo risultato, OPPURE quando l'utente preme
     "send".
   - Questo raggruppa i frammenti contigui in un'unica
     richiesta.
2. **Filtro di lunghezza minima**: ignorare transcript di meno
   di 4 caratteri significativi a meno che non corrispondano
   a un verbo + oggetto (regex di frase corta valida).
3. **Filtro contro C1**: se il transcript corrisponde (>70%)
   agli ultimi N utterance del bot, scartarlo.

**Raccomandazione:** (1) + (3). Standard nelle applicazioni
vocali moderne (Alexa, Google Assistant, Siri).

---

### C6 -- "show" mappa male quando v20_panel non è presente (DERIVATO)

Risolto chiudendo C4. Quando il v20_panel è nell'albero,
il suo `label_i18n.en="Toggle panel"` (o quello scelto) vince
il match contro "show". Attualmente non è nell'albero -> il
matcher ricade su `navmap.fetch_map` (label "Show the system
map") perché la sua keyword "show" fa prefix match.

In aggiunta: la label EN di `v20_panel.toggle` dovrebbe
includere "show / hide" come sinonimi, non solo "Toggle panel".
Aggiornare il manifest:

```js
{ id: 'v20_panel.toggle', role: 'button',
  label_i18n: {
    es: 'Mostrar / ocultar panel',
    en: 'Show or hide panel',  /* antes: 'Toggle panel' */
    ...
  }
}
```

---

### C7 -- "cambia lingua" inconsistente (LOW)

**Meccanismo:** il LLM ha due percorsi non deterministici:
- Percorso letterale: cercare un controllo di lingua nell'albero
  visibile (non esiste -> rifiuta con i top-3 candidati).
- Percorso meta: riconoscere "cambia a inglés" come
  meta-comando della sessione ed emettere
  `{kind:'say', text:'Switching to English mode...'}` cambiando
  `currentLang`.

Quale percorso viene seguito dipende dal campionamento del LLM
(temperature 0.5-0.7 nel system prompt attuale). Risultato:
inconsistente.

**Soluzione:** **regola esplicita nel system prompt**:

> "Quando l'utente chiede di cambiare la lingua della sessione
> (es. 'cambia a inglés', 'switch to French', 'idioma chino'),
> rispondere SEMPRE con `{kind:'change_locale', locale:'<2-letter>'}` --
> NON cercare un controllo di lingua nell'albero. È un
> meta-comando che riguarda la sessione, non un click sulla
> pagina."

E aggiungere il kind `change_locale` al vocabolario accettato
dal backend (insieme a click / fill / say / ecc.).

Costo: 1 riga nel system prompt + 1 branch nel backend handler.

---

## 4. Roadmap dei fix (in ordine di impatto / costo)

| # | Fix | Categoria | Costo | Impatto |
|---|---|---|---|---|
| 1 | TTS/STT half-duplex (microfono in mute mentre parla il bot) | C1 | basso | critico |
| 2 | Conferma azioni distruttive con `confirm_action()` | C1, C3 | medio | critico |
| 3 | Modal-confirm fuori dal focus trap della chat | C3 | medio | alto |
| 4 | Tokenizer per parola intera nel matcher | C2 | basso | alto |
| 5 | Migrare `nacDemoSnapshotTree` a `describe_v2()` | C4 | basso | medio |
| 6 | Spostare `NAC.register('v20_panel')` al boot anticipato | C4 | triviale | medio |
| 7 | Buffer + debounce 800-1500ms per STT | C5 | basso | medio |
| 8 | Regola `change_locale` nel system prompt | C7 | triviale | basso |
| 9 | Sinonimi in `label_i18n` del v20_panel.toggle | C6 | triviale | basso |

Costi:
- **triviale**: 1 riga di codice + 1 commit.
- **basso**: <30 righe, 1-2 ore.
- **medio**: 30-150 righe, mezza giornata.

---

## 5. Risultati positivi (ciò che ha funzionato)

Documentare anche ciò che ha funzionato bene per non romperlo:

- "Porqué no me iluminas mostrándome el monte" -> il LLM mappa
  correttamente all'icona `art.fuji`. **Risoluzione di intent indiretto +
  metaforico** -- è esattamente ciò che abbiamo richiesto nella sec 16.
- "secretísimo" -> apre il modal segreto. **Colloquialismo
  risolto**.
- "Muéstrame factura" -> anteprima. **Coniugazione + oggetto
  differenziato dal comando distruttivo "elimina factura"**.
- "filtra por ricardo" -> filtro live. **Azione + parametro
  separati correttamente**.
- "pon brasil" -> Brasile nel campo paese. **Mapping di oggetto
  dichiarativo a `fill`**.
- "sube volumen a 80" -> slider all'80%. **Valore numerico estratto dal
  testo + azione sullo slider**.
- "corre el test" -> self-test. **Verbo + oggetto dall'albero**.

Questi casi validano che il system prompt rc5 (contratto sec 16)
funziona quando l'albero è completo e il matcher
non si confonde per sotto-stringa.

---

## 6. Prossimo passo

Implementare i fix #1, #4, #6 nel prossimo push (tutti e tre
hanno costo basso o triviale e coprono le 3 categorie
critiche). I fix #2, #3, #5 possono andare in una PR separata
di maggiore portata. Il resto può essere messo in backlog.

Pablo: fammi sapere se vuoi che inizi con questi fix adesso
o se preferisci rivedere prima il documento.

---

## 7. STATUS dell'implementazione (2026-05-09 finale)

Pablo ha approvato l'implementazione di **tutti** i fix con la
restrizione di **NON rompere la risoluzione di intent indiretto /
metaforico / colloquiale** abilitata dal system prompt rc5
(metafore come "porqué no me iluminas mostrándome el monte"
-> Mt. Fuji; colloquialismi come "secretísimo" -> modal
segreto). Questa capacità risiede nel LLM, non nel matcher locale.
I fix lasciano il LLM intatto e affinano: (a) la cattura
dell'input prima del LLM (C1, C5), (b) le regole che il
prompt consegna al LLM (C2, C7, C8), e (c) il dispatch
successivo (C3, C4).

| # | Categoria | Fix implementato | Posizione |
|---|---|---|---|
| C1 | Feedback loop TTS->STT | Half-duplex (mute STT mentre `speechSynthesis.speaking`) + buffer circolare delle ultime 8 utterance del bot + filtro contenuto (exact / containment / 70%-token-overlap) nel handler `recognizer.onresult` | `js/example.js` -- `_ttsRecentBuf`, `_sttIsBotEcho`, `_ttsRememberUtterance`; recognizer.onresult verifica `speechSynthesis.speaking` prima di elaborare |
| C2 | Matcher per sotto-stringa | Regola 11 esplicita nel system prompt: "WORD-LEVEL MATCHING -- 'eliminatorias' NO matches 'eliminar'. Conjugated forms or infinitive only. On near-prefix ambiguity, return `{kind:'say'}` for clarification, NEVER the destructive action." Il metodo locale interpret() tokenizzava già correttamente dal 2026-05-06. | `crm_desa/api/v1/yujin.php` `yjNacDemoSystemPrompt` regola 11 |
| C3 | Modal confirm blocca la chat | (a) CSS: `.ne-side { z-index: 10001 }` porta la chat fuori dall'overlay (z-index 9999). (b) Listener `nac:confirm:requested` che annuncia il prompt + hint localizzato via TTS. (c) `_maybeAnswerPendingConfirm()` instradato in `chatSend` e in `_sttFlush` mappa YES/NO in 10 lingue a `<id>.confirm`/`.cancel` direttamente, prima del LLM. | `css/example.css` `.ne-side`; `js/example.js` `_findPendingConfirm`, `_maybeAnswerPendingConfirm`, listener `nac:confirm:requested` |
| C4 | v20_panel non raggiunge la chat | (a) Manifest estratto in `window.__V20_PANEL_MANIFEST__` e registrato tramite `registerV20PanelManifest()` con polling a 30ms non appena `NAC.register` esiste (prima di `bootV20`). (b) `nacDemoSnapshotTree` ora include anche `v2_scope_entries`, `v2_intermediate_scopes`, `sitemap`, `tenant_prefix`, `nac_version_v2` quando `NAC.describe_v2` esiste. | `example-v20-full.php` (blocco early register); `js/example.js` `nacDemoSnapshotTree` esteso |
| C5 | Frammenti STT come comandi | Buffer `_sttBuffer` + `setTimeout(_sttFlush, 1100)`. Ogni risultato STT `final` riavvia il timer; solo dopo 1100ms di silenzio il buffer viene scaricato al backend. Buffer azzerato nel percorso manuale (chatSend / mic-stop). | `js/example.js` `recognizer.onresult` + `_sttFlush` |
| C6 | "show" mappa in modo errato | Risolto chiudendo C4 (v20_panel ora visibile nell'albero). In aggiunta: `label_i18n.en` del v20_panel.toggle aggiornato da "Toggle panel" a "Show or hide v2.0 panel" + 9 nuovi locale completi. | `example-v20-full.php` `__V20_PANEL_MANIFEST__` |
| C7 | "cambia idioma" inconsistente | (a) Nuovo kind `change_locale` nel catalogo del system prompt. (b) Regola 13: "SESSION META-COMMANDS use change_locale -- do NOT search the tree for a 'language control'." (c) Handler in `dispatchAgenticAction` che chiama `applyLangChange(a.locale)`. | `crm_desa/api/v1/yujin.php` (nuovo kind + regola 13); `js/example.js` `dispatchAgenticAction` case `change_locale` |
| C8 | Verbo nel plugin errato (warning in console "No action with verb=fetch_map found in plugin selftest") | Regola 12 esplicita: "PLUGIN-VERB BINDING is fixed by the manifest. Do NOT guess, do NOT carry the verb to a nearby plugin, do NOT invent a plugin name." Con esempi WRONG ↔ RIGHT. | `crm_desa/api/v1/yujin.php` `yjNacDemoSystemPrompt` regola 12 |

### Cosa NON ho modificato (intenzionale)

- **System prompt principale (contratto sec 16):** intatto. Sono state
  aggiunte solo le regole 11, 12, 13 come affinamento; le assolute A-F e
  le 1-10 non sono cambiate.
- **Matcher locale `interpret()`:** tokenizza già per parola
  intera dal 2026-05-06. Nessun rischio in questo punto.
- **Confirm dialog (`NAC.confirm_dialog` in `nac.js`):** intatto;
  emetteva già `nac:confirm:requested` e i pulsanti avevano già
  `data-nac-id`. Ora viene semplicemente ascoltato.

### Rischio residuo / prossimi passi

- **C1 livello-3 (`confirm_action()` per azioni distruttive):** ancora
  in sospeso. Oggi "elimina factura" attiva l'azione + il
  modal appare. Se il LLM dovesse confondersi nuovamente nonostante la
  regola 11, il fallback dovrebbe essere che OGNI azione dichiarata
  distruttiva (`data-nac-a11y-hint=destructive`) PASSI prima
  per `confirm_dialog`. Lo lascio come follow-up: implica
  ispezionare manifest.actions[].destructive e, se presente,
  avvolgere l'invoke con `confirm_action()` nel dispatch layer.
- **STT debounce (C5):** i 1100ms sono un valore empirico.
  Se si osserva "il bot tarda a rispondere a comandi brevi",
  abbassare a 800ms e osservare.
- **Filtro feedback TTS (C1) -- livello aggressivo:** la soglia
  del 70% token-overlap può bloccare comandi legittimi dell'utente
  che coincidano con frasi comuni del bot (es.
  "muestra capacidades" se il bot ha appena detto "estas son
  las capacidades"). Telemetria futura: contare quanti drop
  vengono registrati da `[stt] dropping bot-echo` -- se supera N per sessione,
  abbassare la soglia all'80%.

---

*This is a machine translation of the canonical English
version at `/nac-spec/docs/VOICE_CHAT_ERROR_ANALYSIS_2026_05_09.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
