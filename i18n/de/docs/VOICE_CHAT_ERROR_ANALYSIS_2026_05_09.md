---
translation_source: docs/VOICE_CHAT_ERROR_ANALYSIS_2026_05_09.md
translation_source_hash: 1c92bf209ccbc809e9d43062cc65ea0594983593f9e93293ae2912837f639f8d
translation_quality: machine_v1
translation_lang: de
translation_date: 2026-05-11T14:54:04.239353+00:00
---

# Fehleranalyse -- Sitzung Sprache+Chat 2026-05-09

> Testprotokoll von Pablo in `example-v20-full.php` mit Sprache +
> Chat. Dieses Dokument isoliert die beobachteten Fehler,
> klassifiziert sie nach Grundursache und schlägt für jeden eine
> konkrete Korrektur vor. ASCII-only.
>
> **STATUS 2026-05-09 (Tagesende):** Die 8 Fixes der
> Roadmap sind implementiert (C1..C8). Siehe Abschnitt 7 am Ende
> mit der Änderungsübersicht + Codeposition.

---

## 1. Zusammenfassung

7 Fehlerkategorien erkannt. 4 sind **reproduzierbare Bugs**
mit identifizierter Grundursache im Code; 2 sind
**Designeinschränkungen der Sprach-Pipeline**, die eine
Architekturänderung erfordern; 1 ist ein **UX-Blocker**
(Modal blockiert den Chat).

Schweregrad:

| Kategorie | Schweregrad | Typ | Priorität |
|---|---|---|---|
| C1. Feedback-Loop TTS -> STT | **CRITICAL** | Architektur | sofort |
| C2. Substring-Matcher löst Befehle aus | **HIGH** | Bug | sofort |
| C3. Bestätigungs-Modal blockiert Chat | **HIGH** | UX | hoch |
| C4. v20_panel.X löst per Chat nicht auf | **MEDIUM** | Bug | mittel |
| C5. STT-Fragmente werden als Befehle ausgeführt | **MEDIUM** | Architektur | mittel |
| C6. "show" auf Englisch mappt falsch, wenn v20_panel fehlt | abgeleitet von C4 | -- | gelöst mit C4 |
| C7. "cambia idioma" inkonsistent | **LOW** | Bug | niedrig |

---

## 2. Befehlsprotokoll (Eingabe -> Ausgabe -> Diagnose)

| # | Sprach-/Chat-Eingabe | Bot-Antwort | Diagnose |
|---|---|---|---|
| 1 | "apreta describe_v20" | "No encuentro esa accion. Lo mas parecido: Correr el self-test, Ver capacidades, Ver mapa del sistema." | **C4** -- das v20_panel-Manifest ist nicht im Baum, den das Backend empfängt. Der Bot sucht im sichtbaren Baum; die Top-3 sind die tatsächlich vorhandenen Slugs. |
| 2 | "pulsa boton show" | "Mostrando el mapa del sistema." | **C6** = Folge von C4. Das englische Wort "show" sollte `v20_panel.toggle` matchen (EN-Label "Toggle panel"), aber da dieses Plugin nicht im Baum ist, fällt der Matcher auf `navmap.fetch_map` zurück (Label "Show the system map"). |
| 3 | "ve a NAC3 v2.0 layer y pulsa el boton mostrar" | "No veo una capa v2.0 ni un boton 'mostrar'. Lo mas cercano: Ver mapa, Ver capacidades, Listar secciones." | **C4** -- konsistent mit #1. Wenn v20_panel im Baum ist, findet der Bot `v20_panel.toggle`; sonst nicht. |
| 4 | "cambia a ingles" | "No encuentro un control de idioma en esta pagina..." | **C7** -- inkonsistent: Befehl #16 (identisch) hat funktioniert. |
| 5 | "pulsa system map" | "Pulsando NAC.system_map()." | OK (Treffer). Slug `navmap.fetch_map` ist im Baum. |
| 6 | "pulsa capacidades" | "Pulsando NAC.capabilities()." | OK. Slug `navmap.caps`. |
| 7 | "pulsa ver capacidades" | "Pulsando Ver capacidades." | OK. Gleicher Slug. |
| 8 | "filtra por ricardo" | "Filtrando la tabla por 'ricardo'." | OK. Tabelle mit Live-Filter. |
| 9 | "pon brasil" | "Pongo Brasil en el campo Pais." | OK. Datalist-Autocomplete. |
| 10 | "sube volumen a 80" | "Subiendo volumen a 80%." | OK. Slider. |
| 11 | "Porqué no me iluminas mostrándome el monte" | "Te muestro el Monte Fuji." | OK. Langer, indirekter Satz -- der LLM mappt korrekt auf das Icon `art.fuji`. |
| 12 | "secretísimo" | "Abriendo el modal secreto." | OK. |
| 13 | "elimina factura" | "Eliminando la factura." | **C3** -- die Aktion ist destruktiv, aber es wird KEINE Bestätigung eingeholt, bevor sie ausgelöst wird; das Modal erscheint DANACH, und der Chat ist blockiert (siehe C3). |
| 14 | "Voz activada" (war TTS des Bots) | "Eliminando la factura." | **C1** -- Feedback-Loop. Der TTS sagte "Voz activada", der STT hat es aufgenommen. "Voz activada" sollte nichts matchen, aber durch C2 wird "activada" mit einem Löschbefehl aus dem vorherigen Buffer assoziiert. |
| 15 | "voz activada" (Echo) | "Eliminando la factura." | **C1** + **C2** -- Zyklus wiederholt sich. |
| 16 | "eliminatorias" | "Eliminando la factura." | **C2** -- der Matcher arbeitet mit Substring: das Präfix "elimin" matcht "eliminar". Jedes Wort, das mit "elimina" beginnt, löst die Aktion aus. |
| 17 | "Muéstrame factura" | "Previsualizando la factura." | OK. |
| 18 | "Manos libres activado..." (TTS) -> "manos libres activado" (STT) | "Modo manos libres confirmado." | **C1** -- gleicher Loop. |
| 19 | "modo manos libres confirmado Dime cuáles son tus capacidades" | "Mostrando las capacidades del sistema." | Die Eingabe ist die Bot-Antwort, direkt an den Benutzerbefehl angehängt. Treffer, weil "capacidades" stark matcht. **C5** partiell. |
| 20 | "del sistema" | "Mostrando el mapa del sistema." | **C5** -- Fragment der vorherigen Eingabe wird als eigenständiger Befehl verarbeitet. |
| 21 | "corre el test" | "Corriendo el self-test de NAC." | OK. |
| 22 | "de nac" | "Corriendo el self-test de NAC." | **C5** -- Fragment. |
| 23 | "cambia a inglés" | "Switching to English mode for upcoming replies." | OK. **ABER** inkonsistent mit #4 (gleiche Eingabe, andere Antwort). |
| 24 | "cambia el idioma de la página a chino" | "No encuentro un control de idioma en esta página..." | **C7** -- der LLM erkennt diesen Meta-Befehl nicht als Sitzungs-Sprachwechsel, sondern sucht ihn als Steuerelement im Baum. |

---

## 3. Grundursache nach Kategorie

### C1 -- Feedback-Loop TTS -> STT (CRITICAL)

**Mechanismus:** `SpeechSynthesisUtterance` gibt die
Bot-Antwort über die Lautsprecher des Benutzers aus.
`SpeechRecognition` ist gleichzeitig aktiv (Freisprechmodus).
Das Mikrofon nimmt die Lautsprecherausgabe auf, der STT
transkribiert sie als Benutzereingabe, der Chat verarbeitet
sie, der Bot spricht erneut: Endlosschleife.

Jede Bot-Antwort, die ein befehlsähnliches Wort enthält
(eliminar, mostrar, abrir, cambiar), kann eine weitere Aktion
auslösen. Bei destruktiven Wörtern **entsteht echter Schaden**.

**Belege im Log:**
- "Voz activada" (TTS) -> als Eingabe aufgenommen -> gegen
  "elimina" aus dem vorherigen Buffer gematcht -> Rechnung
  gelöscht.
- "Manos libres activado. Te escucho de continuo." (TTS) ->
  als "manos libres activado" aufgenommen -> Bot antwortet
  "Modo manos libres confirmado".
- "Modo manos libres confirmado" (TTS) -> aufgenommen und an
  die nächste Eingabe angehängt.

**Lösungen (nach Robustheit geordnet):**

1. **Half-Duplex erzwingen** (Industriestandard):
   - `recognition.stop()` wenn `speechSynthesis.speaking
     === true`.
   - `recognition.start()` wird wieder aufgenommen, wenn der
     Utterance endet (Ereignis `onend` des Utterance).
   - Nachteil: Der Benutzer kann den Bot nicht unterbrechen.
     In 99 % der Fälle akzeptabel; erhöht die wahrgenommene
     Latenz, verhindert aber den Loop.
2. **Inhaltsbasierter Filter** (Defense in Depth):
   - Einen Ringpuffer der letzten N (=10)
     `SpeechSynthesisUtterance.text`-Werte der letzten
     30 Sekunden führen.
   - Eingehende STT-Transkripte normalisieren (Kleinbuchstaben,
     ohne Diakritika, getrimmt) und gegen den Puffer prüfen.
     Bei >70 % Übereinstimmung mit einem aktuellen Utterance
     stillschweigend verwerfen.
3. **Pflichtbestätigung für destruktive Aktionen**
   (letzte Verteidigungslinie):
   - Jede Aktion mit `data-nac-a11y-hint="destructive"` oder
     als `irreversible` markiert erfordert einen zweiten
     expliziten Bestätigungsschritt BEVOR sie ausgelöst wird.
     NAC3 v1.9 definiert bereits `confirm_action()` dafür --
     der Demo-Pfad für destruktive Aktionen nutzt es nicht.

**Empfehlung:** (1) sofort implementieren + (3) kurzfristig.
(2) optional für Umgebungen, in denen der Benutzer den Bot
unterbrechen können soll.

---

### C2 -- Substring-Matcher löst Befehle aus (HIGH)

**Mechanismus:** Der Intent-Resolver (im Backend oder im LLM)
matcht per Substring. Das Wort "eliminatorias" enthält "elimina"
als Präfix, und "elimina" ist das Verb einer registrierten
Aktion -> Aktion wird ausgelöst.

**Belege:**
- "eliminatorias" -> "Eliminando la factura."

**Lösung:** Der Matcher muss auf **vollständige Token**
(oder Stems) arbeiten, nicht auf Substrings. Mögliche
Implementierung:

- Eingabe nach Leerzeichen + Satzzeichen tokenisieren.
- Jeden Token gegen die Aktionsverben mit spanischer
  Stem-Normalisierung vergleichen ("elimina/elimino/
  elimine/eliminar" -> Stem `elimin`, "eliminatorias" ->
  Stem `eliminatori`). Unterschiedliche Stems -> kein Match.
- Eine kurze Liste von "Befehls-Stems" im System-Prompt
  pflegen (~30 Verben), um die Heuristik zu begrenzen.

Das Modul `@nac-spec/test-runner/src/lib/matcher.js` matcht
bereits per vollständigem Token (`indexOf` auf den gesamten
Satz, nicht per Substring des Slugs). Der Bug liegt im
zwischengeschalteten Backend, nicht im aktuellen Matcher.

**Konkrete Maßnahme:** Den System-Prompt
(`yjNacDemoSystemPrompt` in `crm_desa/api/v1/yujin.php`)
prüfen und eine explizite Regel ergänzen: "Verben wie
`eliminar`, `borrar`, `cancelar` matchen nur, wenn das
vollständige Token der Eingabe mit dem konjugierten Verb
übereinstimmt -- NICHT wenn es ein Präfix eines anderen
Wortes ist."

---

### C3 -- Bestätigungs-Modal blockiert Chat (HIGH)

**Mechanismus (von Pablo gemeldet):** Wenn der Bot eine
destruktive Aktion auslöst, erscheint ein Modal mit den
Schaltflächen "Aprobar" / "Cancelar". Das Modal verwendet
`<dialog>` mit Focus-Trap oder ein Overlay mit `inert` über
dem restlichen DOM, einschließlich des Chats. Der Chat wird
unzugänglich: Tippen, Diktat per Sprache und Bestätigung
über die Konversation sind nicht mehr möglich.

**Folge:** Der Benutzer muss manuell per Klick
bestätigen/abbrechen. Im Freisprechmodus bricht das den
Vertrag "per Sprache bedienbar".

**Lösung:**

1. Das Bestätigungs-Modal muss **außerhalb des Focus-Traps**
   des Chats liegen -- oder umgekehrt muss der Chat
   **außerhalb des Traps** des Modals liegen. Praxis: Chat
   auf `position: fixed` mit `z-index` über dem Modal setzen
   und `inert={false}` wenn das Modal öffnet.
2. Das Modal muss seine Schaltflächen mit `data-nac-id`
   deklarieren (z. B. `confirm.approve`, `confirm.cancel`)
   und in den NAC-Baum aufgenommen werden. Der Chatbot kann
   dann "aprobar" oder "cancelar" per Sprache gegen den
   entsprechenden Slug dispatchen.
3. Der TTS muss die Modal-Frage automatisch vorlesen
   ("Confirmás eliminar la factura? Decí 'sí' o 'no'.") und
   der STT muss die Antwort direkt als confirm/reject
   interpretieren.

**Konkrete Maßnahme:** Die Modal-Confirm-Komponente in
`example-v20-full.php` (falls vorhanden) oder den generischen
`confirm_action()`-Hook in `js/nac.js` prüfen, um
sicherzustellen, dass das Modal den Chat NICHT in seinem
Focus-Tree einschließt.

---

### C4 -- v20_panel.X löst per Chat nicht auf (MEDIUM)

**Mechanismus:** Das JS der Seite ruft
`nacDemoSnapshotTree()` vor jedem Chat-Turnus auf, um den
NAC-Baum zu serialisieren. Diese Funktion ruft
`NAC.describe()` auf (v1, nicht `describe_v2()`).
`NAC.describe()` schließt NUR Plugins ein, die bereits via
`NAC.register()` registriert wurden.

Das v20_panel wird in `example-v20-full.php` innerhalb des
`<script>`-Blocks am Ende des Body in der Funktion `bootV20()`
registriert, die per `setTimeout(bootV20, 50)` wartet, bis
`NAC.scope` existiert. Wenn:
- der Browser langsam ist oder das rc5-Deploy noch nicht
  angekommen ist (rpaforce-crm liefert eine eigene Kopie von
  `nac-v2-extensions.js`), existiert `NAC.scope` nicht und
  `bootV20` läuft nicht,
- oder `bootV20` zu spät läuft, nachdem der Benutzer die
  erste Chat-Nachricht gesendet hat,

dann enthält `NAC.describe()` das v20_panel nicht, und das
Backend empfängt einen Baum ohne diese Slugs.

**Belege:**
- "apreta describe_v20" -> Bot findet `v20_panel.describe_v2`
  nicht.
- "pulsa system map" -> Bot findet `navmap.fetch_map`
  (weil navmap im Boot von example.js registriert wird,
  deutlich früher).

**Lösungen:**

1. **`nacDemoSnapshotTree` auf `describe_v2()` migrieren**
   (sobald verfügbar). `describe_v2()` gibt sowohl
   v1_plugins (Compat) als auch v2_scope_entries zurück --
   garantiert, dass via `NAC.register` registrierte Manifests
   UND via `NAC.scope` deklarierte Scopes das Backend
   erreichen.
2. **Ersten Nachrichtenversand blockieren, bis `bootV20()`
   abgeschlossen ist.** `chat-send` bleibt deaktiviert, bis
   das Ereignis `nac:v2_installed` ausgelöst wird.
3. **Sicherstellen, dass `NAC.register({plugin_slug:'v20_panel'})`
   VOR jedem `chatSend`-Versuch läuft.** Dieses Register in
   den Boot von `example.js` selbst verschieben (ca. Zeile 30,
   wo die anderen Manifests stehen), statt es in das Inline-
   Script am Ende zu verlagern.

**Empfehlung:** (1) + (3) kombinieren. (1) ist der strukturelle
Fix; (3) eliminiert die Race Condition.

---

### C5 -- STT-Fragmente als Befehle (MEDIUM)

**Mechanismus:** Die Web Speech API liefert Teilergebnisse
(`onresult` mit `interim` true) und Endergebnisse. Der aktuelle
Chat verarbeitet jedes Endergebnis als eigenständige Nachricht.
Wenn der Benutzer zwischen "el del sistema" und "muéstrame el
mapa" pausiert, kann der STT zwei Endergebnisse liefern:
"el del sistema" und dann "muéstrame el mapa" -- der Bot
verarbeitet beide.

Zusätzlich kann die Bot-Antwort per TTS (Problem C1) als
Fragment einfließen und verarbeitet werden.

**Belege:**
- "del sistema" -> führt "Systemkarte anzeigen" aus, als wäre
  es ein vollständiger Befehl.
- "de nac" -> führt "NAC3-Self-Test" aus.

**Lösung:**

1. **Buffer + Debounce mit Stille-Timeout**:
   - Endergebnisse in einem Buffer akkumulieren.
   - Erst ans Backend senden, wenn 800--1500 ms Stille nach
     dem letzten Ergebnis vergangen sind ODER der Benutzer
     "send" tippt.
   - Dadurch werden aufeinanderfolgende Fragmente zu einer
     einzigen Anfrage zusammengefasst.
2. **Mindestlängen-Filter**: Transkripte mit weniger als
   4 signifikanten Zeichen ignorieren, es sei denn, sie
   matchen ein Verb + Objekt (Regex für gültige Kurzphrase).
3. **Filter gegen C1**: Wenn das Transkript (>70 %) mit einem
   der letzten N Bot-Utterances übereinstimmt, verwerfen.

**Empfehlung:** (1) + (3). Standard in modernen
Sprachanwendungen (Alexa, Google Assistant, Siri).

---

### C6 -- "show" mappt falsch, wenn v20_panel fehlt (ABGELEITET)

Wird durch Schließen von C4 gelöst. Wenn v20_panel im Baum
ist, gewinnt sein `label_i18n.en="Toggle panel"` (oder ein
gewähltes Äquivalent) den Match gegen "show". Aktuell ist es
nicht im Baum -> der Matcher fällt auf `navmap.fetch_map`
zurück (Label "Show the system map"), weil dessen Schlüsselwort
"show" einen Präfix-Match erzeugt.

Zusätzlich sollte das EN-Label von `v20_panel.toggle` "show /
hide" als Synonyme enthalten, nicht nur "Toggle panel". Manifest
aktualisieren:

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

### C7 -- "cambia idioma" inkonsistent (LOW)

**Mechanismus:** Der LLM hat zwei nicht-deterministische Pfade:
- Literaler Pfad: Suche nach einem Sprachsteuerelement im
  sichtbaren Baum (existiert nicht -> Ablehnung mit Top-3-
  Kandidaten).
- Meta-Pfad: "cambia a inglés" als Meta-Befehl der Sitzung
  erkennen und `{kind:'say', text:'Switching to English
  mode...'}` ausgeben, dabei `currentLang` ändern.

Welcher Pfad genommen wird, hängt vom LLM-Sampling ab
(Temperature 0,5--0,7 im aktuellen System-Prompt). Ergebnis:
inkonsistent.

**Lösung:** **Explizite Regel im System-Prompt**:

> "Wenn der Benutzer die Sitzungssprache ändern möchte
> (z. B. 'cambia a inglés', 'switch to French', 'idioma
> chino'), IMMER mit `{kind:'change_locale', locale:'<2-Buchstaben>'}` antworten -- NICHT nach einem
> Sprachsteuerelement im Baum suchen. Es ist ein Meta-Befehl,
> der die Sitzung betrifft, kein Klick auf der Seite."

Und den Kind `change_locale` zum akzeptierten Vokabular des
Backends hinzufügen (neben click / fill / say / etc.).

Aufwand: 1 Zeile im System-Prompt + 1 Branch im Backend-Handler.

---

## 4. Roadmap der Fixes (nach Auswirkung / Aufwand geordnet)

| # | Fix | Kategorie | Aufwand | Auswirkung |
|---|---|---|---|---|
| 1 | Half-duplex TTS/STT (Mikrofon stumm schalten, während der Bot spricht) | C1 | gering | kritisch |
| 2 | Destruktive Aktionen mit `confirm_action()` bestätigen | C1, C3 | mittel | kritisch |
| 3 | Modal-Bestätigung außerhalb des Focus-Traps des Chats | C3 | mittel | hoch |
| 4 | Tokenizer für vollständige Wörter im Matcher | C2 | gering | hoch |
| 5 | `nacDemoSnapshotTree` auf `describe_v2()` migrieren | C4 | gering | mittel |
| 6 | `NAC.register('v20_panel')` in den frühen Boot-Prozess verschieben | C4 | trivial | mittel |
| 7 | Buffer + Debounce 800–1500 ms für STT | C5 | gering | mittel |
| 8 | Regel `change_locale` im System-Prompt | C7 | trivial | gering |
| 9 | Synonyme in `label_i18n` des v20_panel.toggle | C6 | trivial | gering |

Aufwand:
- **trivial**: 1 Codezeile + 1 Commit.
- **gering**: <30 Zeilen, 1–2 Stunden.
- **mittel**: 30–150 Zeilen, ein halber Tag.

---

## 5. Relevante Erfolge (was tatsächlich funktioniert hat)

Auch das Funktionierende dokumentieren, damit es nicht kaputt gemacht wird:

- „Porqué no me iluminas mostrándome el monte" → das LLM mappt
  korrekt auf das Icon `art.fuji`. **Auflösung indirekter +
  metaphorischer Intents** – genau das, was in Abschnitt 16 gefordert wurde.
- „secretísimo" → öffnet das geheime Modal. **Umgangssprachlicher
  Ausdruck korrekt aufgelöst**.
- „Muéstrame factura" → Vorschau wird angezeigt. **Konjugation + Objekt
  korrekt vom destruktiven Befehl „elimina factura" unterschieden**.
- „filtra por ricardo" → Live-Filter. **Aktion + Parameter
  korrekt getrennt**.
- „pon brasil" → Brasilien im Länderfeld. **Deklaratives Objekt
  korrekt auf `fill` gemappt**.
- „sube volumen a 80" → Slider auf 80 %. **Numerischer Wert aus
  dem Text extrahiert + Slider-Aktion ausgeführt**.
- „corre el test" → Self-Test. **Verb + Objekt aus dem Baum**.

Diese Fälle bestätigen, dass der System-Prompt rc5 (Abschnitt 16
Contract) funktioniert, wenn der Baum vollständig ist und der Matcher
nicht durch Teilzeichenketten verwirrt wird.

---

## 6. Nächster Schritt

Fixes #1, #4, #6 im nächsten Push implementieren (alle drei
haben geringen oder trivialen Aufwand und decken die 3 kritischen
Kategorien ab). Fixes #2, #3, #5 können in einem separaten,
umfangreicheren PR folgen. Der Rest kann ins Backlog.

Pablo: Sag mir Bescheid, ob du möchtest, dass ich jetzt mit
diesen Fixes anfange, oder ob du das Dokument zuerst prüfen möchtest.

---

## 7. Implementierungsstatus (2026-05-09 final)

Pablo hat die Implementierung **aller** Fixes genehmigt, mit der
Einschränkung, die Auflösung indirekter / metaphorischer /
umgangssprachlicher Intents **nicht zu beschädigen**, die der
System-Prompt rc5 ermöglicht hat (Metaphern wie „porqué no me
iluminas mostrándome el monte" → Mt. Fuji; Umgangssprache wie
„secretísimo" → geheimes Modal). Diese Fähigkeit liegt im LLM,
nicht im lokalen Matcher. Die Fixes lassen das LLM unberührt und
verfeinern: (a) die Eingabeerfassung vor dem LLM (C1, C5),
(b) die Regeln, die der Prompt dem LLM übergibt (C2, C7, C8),
und (c) den nachgelagerten Dispatch (C3, C4).

| # | Kategorie | Implementierter Fix | Ort |
|---|---|---|---|
| C1 | Feedback-Loop TTS->STT | Half-duplex (STT stumm schalten, während `speechSynthesis.speaking`) + zirkulärer Buffer der letzten 8 Bot-Utterances + Inhaltsfilter (exact / containment / 70%-Token-Overlap) im Handler `recognizer.onresult` | `js/example.js` -- `_ttsRecentBuf`, `_sttIsBotEcho`, `_ttsRememberUtterance`; recognizer.onresult prüft `speechSynthesis.speaking` vor der Verarbeitung |
| C2 | Substring-Matcher | Explizite Regel 11 im System-Prompt: „WORD-LEVEL MATCHING -- 'eliminatorias' NO matches 'eliminar'. Conjugated forms or infinitive only. On near-prefix ambiguity, return `{kind:'say'}` for clarification, NEVER the destructive action." Die lokale `interpret()` tokenisierte bereits seit 2026-05-06 korrekt. | `crm_desa/api/v1/yujin.php` `yjNacDemoSystemPrompt` Regel 11 |
| C3 | Modal-Bestätigung blockiert Chat | (a) CSS: `.ne-side { z-index: 10001 }` hebt den Chat aus dem Overlay (z-index 9999). (b) Listener `nac:confirm:requested`, der den Prompt + lokalisierten Hinweis per TTS ankündigt. (c) `_maybeAnswerPendingConfirm()`, eingebunden in `chatSend` und `_sttFlush`, mappt YES/NO in 10 Sprachen direkt auf `<id>.confirm`/`.cancel`, noch vor dem LLM. | `css/example.css` `.ne-side`; `js/example.js` `_findPendingConfirm`, `_maybeAnswerPendingConfirm`, Listener `nac:confirm:requested` |
| C4 | v20_panel erreicht den Chat nicht | (a) Manifest in `window.__V20_PANEL_MANIFEST__` ausgelagert und über `registerV20PanelManifest()` mit 30-ms-Polling registriert, sobald `NAC.register` verfügbar ist (vor `bootV20`). (b) `nacDemoSnapshotTree` enthält jetzt auch `v2_scope_entries`, `v2_intermediate_scopes`, `sitemap`, `tenant_prefix`, `nac_version_v2`, wenn `NAC.describe_v2` vorhanden ist. | `example-v20-full.php` (Early-Register-Block); `js/example.js` erweitertes `nacDemoSnapshotTree` |
| C5 | STT-Fragmente als Befehle | Buffer `_sttBuffer` + `setTimeout(_sttFlush, 1100)`. Jedes `final`-STT-Ergebnis setzt den Timer neu; erst nach 1100 ms Stille wird der Buffer an das Backend übergeben. Buffer wird beim manuellen Pfad (chatSend / mic-stop) geleert. | `js/example.js` `recognizer.onresult` + `_sttFlush` |
| C6 | „show" wird falsch gemappt | Durch Schließen von C4 behoben (v20_panel jetzt im Baum sichtbar). Zusätzlich: `label_i18n.en` des v20_panel.toggle von „Toggle panel" auf „Show or hide v2.0 panel" angehoben + 9 neue vollständige Locales. | `example-v20-full.php` `__V20_PANEL_MANIFEST__` |
| C7 | „cambia idioma" inkonsistent | (a) Neuer Kind `change_locale` im Katalog des System-Prompts. (b) Regel 13: „SESSION META-COMMANDS use change_locale -- do NOT search the tree for a 'language control'." (c) Handler in `dispatchAgenticAction`, der `applyLangChange(a.locale)` aufruft. | `crm_desa/api/v1/yujin.php` (neuer Kind + Regel 13); `js/example.js` `dispatchAgenticAction` case `change_locale` |
| C8 | Verb im falschen Plugin (Konsolenwarnung „No action with verb=fetch_map found in plugin selftest") | Explizite Regel 12: „PLUGIN-VERB BINDING is fixed by the manifest. Do NOT guess, do NOT carry the verb to a nearby plugin, do NOT invent a plugin name." Mit WRONG ↔ RIGHT-Beispielen. | `crm_desa/api/v1/yujin.php` `yjNacDemoSystemPrompt` Regel 12 |

### Was absichtlich nicht geändert wurde

- **Haupt-System-Prompt (Abschnitt 16 Contract):** unverändert. Es wurden
  lediglich die Regeln 11, 12, 13 als Verfeinerungen hinzugefügt;
  die absoluten Regeln A–F und 1–10 blieben unverändert.
- **Lokaler Matcher `interpret()`:** tokenisiert bereits seit 2026-05-06
  nach vollständigen Wörtern. Kein Risiko dort.
- **Bestätigungsdialog (`NAC.confirm_dialog` in `nac.js`):** unverändert;
  er sendete bereits `nac:confirm:requested` und die Buttons hatten
  bereits `data-nac-id`. Dieser wird jetzt nur noch abgehört.

### Verbleibendes Risiko / nächste Schritte

- **C1 Stufe 3 (`confirm_action()` für destruktive Aktionen):** noch
  ausstehend. Aktuell löst „elimina factura" die Aktion aus + das Modal
  erscheint. Sollte das LLM trotz Regel 11 wieder verwirrt werden, wäre
  der Fallback, dass JEDE als destruktiv deklarierte Aktion
  (`data-nac-a11y-hint=destructive`) zuerst durch `confirm_dialog` laufen
  muss. Dies bleibt als Follow-up: Es erfordert die Prüfung von
  manifest.actions[].destructive und, falls gesetzt, das Einwickeln des
  Invokes mit `confirm_action()` im Dispatch-Layer.
- **STT-Debounce (C5):** Die 1100 ms sind ein empirischer Wert.
  Wenn beobachtet wird, dass „der Bot bei kurzen Befehlen zu langsam
  reagiert", auf 800 ms reduzieren und beobachten.
- **TTS-Feedback-Filter (C1) – aggressiver Schwellenwert:** Der
  70%-Token-Overlap-Schwellenwert kann legitime Benutzerbefehle blockieren,
  die mit häufigen Bot-Phrasen übereinstimmen (z. B. „muestra capacidades",
  wenn der Bot gerade „estas son las capacidades" gesagt hat). Zukünftige
  Telemetrie: Zählen, wie viele Drops `[stt] dropping bot-echo` pro Sitzung
  geloggt werden – übersteigt der Wert N, Schwellenwert auf 80 % erhöhen.

---

*This is a machine translation of the canonical English
version at `/nac-spec/docs/VOICE_CHAT_ERROR_ANALYSIS_2026_05_09.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
