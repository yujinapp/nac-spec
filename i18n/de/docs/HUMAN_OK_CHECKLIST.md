---
translation_source: docs/HUMAN_OK_CHECKLIST.md
translation_source_hash: 2b87f1b0665762daf6be1ad520c7ba16f977d21771e6574ae60451039baada31
translation_quality: machine_v1
translation_lang: de
translation_date: 2026-05-11T14:47:53.392596+00:00
---

# NAC3 -- Human OK Checkliste

**Spec-Version:** 2.2 + v2.3 Vorschau.
**Zuletzt durchgeführt:** 2026-05-11 (wird je Release aktualisiert).
**Zweck:** die ausführbare Form der MAN-Spalte in
[TEST_COVERAGE_MATRIX.md](TEST_COVERAGE_MATRIX.md). Eine Person
geht jeden Punkt unten durch und setzt das Häkchen. Schlägt ein
Punkt fehl, wird das Release NICHT ausgeliefert -- Bug anlegen
und beheben, dann erneut versuchen.

Dies ist KEIN Ersatz für automatisierte Tests. Die automatische
Test-Suite (`bash tools/nac/test-launch.sh`) MUSS grün sein,
bevor diese Checkliste begonnen wird. Die Checkliste existiert
für alles, was Automatisierung nicht erfassen kann: echtes Audio,
browserübergreifendes Verhalten, muttersprachliche Formulierungen,
Cross-Origin-Handshake mit einem echten Peer, visuelle Qualität.

---

## Verwendung dieses Dokuments

1. Ein frisches Inkognito-Fenster öffnen (Chrome + Firefox +
   Safari, in dieser Reihenfolge; die visuellen Abschnitte für
   jeden Browser wiederholen).
2. Die Abschnitte der Reihe nach durchgehen -- einige Abschnitte
   setzen voraus, dass ein vorheriger bereits aktiv ist (z. B.
   benötigt Interop beide geladenen Demos).
3. Jedes `[ ]` nur dann abhaken, wenn man es persönlich bestätigt
   hat. Nicht delegieren. Bei Unsicherheit `[?]` markieren und
   die Spec-Verantwortliche fragen.
4. Am Ende den SIGN-OFF-Block unterschreiben und datieren.
5. Die Datei mit dem neuen Durchführungsdatum committen.

Geschätzte Zeit pro Durchlauf: **45-60 Minuten**. Nicht hetzen;
der Sinn dieses Gates sind genau die Teile, die Automatisierung
übersieht.

---

## 1. Laufzeit-Artefakte

### 1.1 Cross-Browser-Smoke -- `js/nac.js` + `nac-v2-extensions.js`

Für jeden Browser (Chrome, Firefox, Safari):

- [ ] `https://yujin.app/nac-spec/example.php` im
      Inkognito-Modus öffnen.
- [ ] Die Konsole zeigt nach 5 Sekunden null Fehler.
- [ ] `NAC.describe().plugins[0]` gibt in der Konsole ein
      Objekt zurück.
- [ ] `NAC.list_registered_plugins()` gibt mindestens einen
      Slug zurück.
- [ ] Einen Button mit `data-nac-role="action"` anklicken --
      er funktioniert UND ein `nac:action:succeeded`-Event
      wird ausgelöst (über `document.addEventListener` in der
      Konsole abhören).

### 1.2 Live-Chat-Client -- `nac-chat-client.js`

- [ ] Auf `example-v21-data-table.php` den Mikrofon-Button
      drücken.
- [ ] „ve a permisos" sagen -- der Chat löst einen Tab-Wechsel
      aus, keine Freitext-Antwort.
- [ ] Auf Englisch wiederholen („go to permissions") +
      Portugiesisch („vai para permissoes") -- korrekte
      Weiterleitung.
- [ ] „cambia de pestaña" sagen -- die Locale wechselt NICHT
      auf Deutsch (Regressionsschutz für V22-03).

### 1.3 Interop-Laufzeit -- `nac-mcp-interop.js`

- [ ] `example-v22-interop.php` öffnen.
- [ ] Die 4 CTAs der Reihe nach verwenden: Export tree ->
      Import remote -> List remote apps -> Disconnect remote.
- [ ] Jeder CTA protokolliert Erfolg in seinem Ausgabe-Panel.
- [ ] Nach Disconnect erscheint die Remote-App nicht mehr in
      `NAC.list_remote_apps()`.

---

## 2. NPM-Paket

### 2.1 Smoke-Test nach Neuinstallation

- [ ] In einem temporären Verzeichnis:
      ```
      mkdir /tmp/nac-smoke && cd /tmp/nac-smoke
      npm init -y
      npm install @nac3/runtime
      node -e "import('@nac3/runtime').then(m => console.log(Object.keys(m)))"
      ```
- [ ] Die Ausgabe enthält `NAC`, `registerPlugin` und
      Validatoren.
- [ ] Keine Deprecation-Warnungen während der Installation.

### 2.2 CLI-Validator auf einem externen Projekt

- [ ] Ein beliebiges Nicht-Yujin-Projekt auswählen (ein Demo
      aus der Einführung oder ein beliebiger Ordner).
- [ ] `npx @nac3/runtime validate .` aus dessen Wurzelverzeichnis
      ausführen.
- [ ] Die Ausgabe ist menschenlesbar, listet 0 BLOCKER auf,
      beendet sich mit 0 bei sauberem Ergebnis / ungleich 0
      bei Befunden.

---

## 3. Demos

### 3.1 Landing -- `index.html`

- [ ] Seite wird mit Sumi-e-Branding ohne FOUC gerendert.
- [ ] „Autopilot" anklicken -- 5-Sekunden-Tour läuft ab,
      Narration hörbar (TTS, nicht stumm).
- [ ] Chat öffnen -- „que es NAC3?" eingeben -- kohärente
      Antwort erhalten, kein Fehler.

### 3.2 Referenz-Demo -- `example.php`

- [ ] Alle 27 sichtbaren Widgets auf der Seite durchgehen.
- [ ] Nach dem vollständigen Durchgang null Konsolenfehler.
- [ ] Keine nicht reagierenden Widgets (keine Klicks ohne
      Reaktion).

### 3.3 Brownfield-Demo -- `example-v20-full.php`

- [ ] `v20-panel` ist nach dem Laden der Seite oben rechts
      sichtbar.
- [ ] „describe_v2" anklicken -- Panel zeigt gültige
      JSON-Ausgabe.
- [ ] „validate_global_v2" anklicken -- Panel zeigt Befunde
      (oder „0 findings, OK").
- [ ] Jeden der 6 Buttons im v20-Panel anklicken -- alle
      lösen `nac:action:succeeded` aus (in der Konsole
      sichtbar, wenn Listener gesetzt).
- [ ] istrusted_fake-Button -- ack wird NICHT ausgelöst (die
      Laufzeit lehnt synthetische Klicks für
      isTrusted-gesicherte Verben korrekt ab).
- [ ] istrusted_real-Button (echter Mausklick) -- ack WIRD
      ausgelöst.

### 3.4 Primitives-Showcase -- `example-v20-primitives-showcase.php`

- [ ] Jedes der 8 Primitives rendert einen Abschnitt mit einem
      funktionierenden Beispiel.
- [ ] Der didaktische Text in jedem Abschnitt ist korrekt
      lesbar (keine verstümmelten Platzhalter).

### 3.5 Data-Table-Demo -- `example-v21-data-table.php`

- [ ] Mikrofon drücken, „agrega una linea con concepto leche
      cantidad 2 precio 100" sagen -- eine Zeile erscheint in
      der Sammeltabelle.
- [ ] „cuanto total hay?" sagen -- der Chat antwortet mit
      einer Zahl, nicht mit der Rohtabelle.
- [ ] „ve a permisos" sagen -- Tab wechselt.

### 3.6 Interop-Demo -- `example-v22-interop.php`

- [ ] Bereits in 1.3 oben abgedeckt.
- [ ] Bonus: die Seite in zwei Browser-Tabs öffnen, den
      Handshake wiederholen -- er sollte auch tab-übergreifend
      funktionieren (jeder Tab ist eine eigene NAC-Instanz,
      die Interop-Schicht ist die Brücke).

### 3.7 React-Fallstudie -- `demos/react/`

- [ ] `https://yujin.app/nac-spec/demos/react/` öffnen.
- [ ] „leche" in das Textfeld eingeben, „Add" anklicken --
      Todo erscheint.
- [ ] Chat öffnen, (per Mikrofon) „agrega pan" sagen -- Todo
      „pan" erscheint über den chat-gesteuerten Pfad. Dies ist
      der Regressionsschutz für Fallstudie Bug #2.
- [ ] „borra leche" sagen -- Todo „leche" verschwindet.

### 3.8 Angular-Fallstudie -- `demos/angular/`

- [ ] Dieselben 4 Prüfungen wie bei React, auf
      `/nac-spec/demos/angular/`.

---

## 4. Dokumentation

Für jedes der unten aufgeführten Dokumente mindestens einmal pro
Quartals-Release vollständig lesen. Prüfen:

- Der Versionsstempel ist aktuell (v2.2).
- Keine defekten internen Links.
- Keine offenen TODOs.
- Die Code-Snippets kompilieren / laufen wie gezeigt.

- [ ] `SPEC.md` (kanonischer Vertrag).
- [ ] `ABOUT.md`.
- [ ] `CONTRIBUTING.md`.
- [ ] `SECURITY.md` -- plus vierteljährliche erneute Lektüre
      des Bedrohungsmodells.
- [ ] `README_DEMOS.md`.
- [ ] `docs/NAC_V22_ROADMAP.md`.
- [ ] `docs/NAC_TEST_MANUAL.md`.
- [ ] `docs/NAC_INTEROP_MCP.md`.
- [ ] `docs/NAC_LAUNCH_DIFFUSION.md`.
- [ ] `docs/CASE_STUDIES_DISCOVERY.md`.
- [ ] `docs/TEST_COVERAGE_MATRIX.md` (diese Matrix ist das
      Schwesterdokument).
- [ ] `docs/VOICE_CHAT_ERROR_ANALYSIS_2026_05_09.md`.

---

## 5. Adoptionsleitfäden

Für jeden Leitfaden sicherstellen, dass das Hello-World-Snippet noch kompiliert
und die Schritte einen neuen Leser zu einer funktionierenden Installation führen:

- [ ] `guides/REACT.md` -- Snippet kompiliert auf Vite + React 18.
- [ ] `guides/ANGULAR.md` -- Snippet kompiliert auf Angular 17
      Standalone.
- [ ] `guides/LLM_WIRING.md` -- das Node-Referenz-Backend startet
      und der Beispiel-Contract-Test besteht.
- [ ] `guides/AI_PLAYBOOK_NEW_PROJECT.md` -- Schritt-Assertions
      stimmen noch mit der Laufzeit-API überein.
- [ ] `guides/AI_PLAYBOOK_MIGRATION.md` -- ebenso.
- [ ] `guides/IMPACT_TESTING.md` -- Zahlen auf Aktualität prüfen
      (vierteljährlich neu prüfen).
- [ ] `guides/IMPACT_RPA.md` -- ebenso.
- [ ] `guides/RPA_UIPATH.md` -- `InvoiceFromCSV.xaml`-Beispiel
      einmal ausführen (oder das entsprechende Äquivalent in der
      aktuellen UiPath Studio-Version).
- [ ] `guides/RPA_AUTOMATION_ANYWHERE.md` -- entsprechender
      Beispiel-Workflow.
- [ ] `guides/RPA_BLUE_PRISM.md` -- entsprechende Beispiel-Object-Studie.

---

## 6. Test-Suites

- [ ] `bash tools/nac/test-launch.sh` ausführen -- ALLES GRÜN in
      unter 15 Sekunden.
- [ ] Smoke-Zähler prüfen (`36 PASS`) -- stimmt mit der
      erwarteten Gesamtzahl überein.
- [ ] `packages/nac/test/fixtures/voice/` öffnen -- pro Locale 1
      Datei auswählen (insgesamt 10 Dateien) -- im Audio-Player
      abspielen -- hörbar und verständlich.
- [ ] 2 zufällige LLM-Prompts aus `stage3-backend.mjs` stichprobenartig
      prüfen -- Antworten ergeben Sinn, kein Drift.
- [ ] Playwright-Suite einmal mit `--headed` ausführen
      (`npx playwright test --headed`) -- die Benutzeroberfläche
      jeder Spec während der Ausführung visuell prüfen.
- [ ] `bash tools/nac/discovery-loop.sh 1` ausführen -- eine Runde
      wird mit 0 Befunden abgeschlossen.

---

## 7. Fallstudienpakete

- [ ] `packages/nac-react-demo/` baut sauber
      (`npm run build`).
- [ ] Bereitgestelltes React-Dist verhält sich identisch zum lokalen
      Build.
- [ ] `packages/nac-angular-demo/` baut sauber.
- [ ] Bereitgestelltes Angular-Dist verhält sich identisch.

---

## 8. Übergreifende Aspekte

### 8.1 i18n

- [ ] Ein Locale auswählen (pro Release rotieren) -- zur Stichproben-
      prüfung von 10 zufälligen Strings an einen Muttersprachler senden.
- [ ] Validator bestätigt 0 fehlende Schlüssel über alle 10
      Locales hinweg (`NAC.validate_global({locale: 'all'})`).

### 8.2 HMAC + Provenienz

- [ ] Multi-Tenant-Smoke gegen den Staging-Tenant ausführen --
      Manifest-Signierung wird verifiziert, keine
      `provenance_mismatch`-Fehler in den Logs.

### 8.3 isTrusted-Gating

- [ ] Auf `example-v20-full.php` besteht der istrusted_real vs.
      istrusted_fake-Nebeneinandertest (abgedeckt in 3.3
      oben) den visuellen Diff: Real löst Ack aus, Fake nicht.

### 8.4 Cross-Origin-Interop (v2.3 Vorschau)

- [ ] Mindestens EINEN Cross-Origin-Test vor der Deklaration von v2.3
      als GA: Interop-Demo gegen einen entfernten NAC3-Peer öffnen,
      der auf einem anderen Origin gehostet wird, echter Bearer-Token,
      echter CORS-Preflight. Roundtrip erfolgreich.

### 8.5 Deployment

- [ ] Nach dem Release-Push diese URLs per curl abrufen und
      200 + korrekten Inhalt bestätigen:
      - `https://yujin.app/nac-spec/index.html`
      - `https://yujin.app/nac-spec/SPEC.md`
      - `https://yujin.app/nac-spec/js/nac.js`
      - `https://yujin.app/nac-spec/js/nac-chat-client.js`
      - `https://yujin.app/nac-spec/example.php`
      - `https://yujin.app/nac-spec/example-v21-data-table.php`
      - `https://yujin.app/nac-spec/example-v22-interop.php`
      - `https://yujin.app/nac-spec/demos/react/`
      - `https://yujin.app/nac-spec/demos/angular/`

### 8.6 Echtes Audio

- [ ] Echte Hardware (Laptop-Mikrofon + Lautsprecher) -- Mikrofon auf
      der Live-Seite `example-v21-data-table.php` drücken, einen Prompt
      pro Locale sprechen (insgesamt 10 Prompts) -- LLM-Dispatch ergibt
      in jedem Locale Sinn.

---

## 9. Screen-Reader-Durchlauf (Barrierefreiheit -- Track G7)

Dieser Abschnitt führt durch die Demos mit einem Screen Reader und
ausgeschaltetem Monitor (oder buchstäblich geschlossenen Augen). Er ist
das Gate für die Barrierefreiheitsverpflichtung in
[ACCESSIBILITY.md](ACCESSIBILITY.md).

Diesen Abschnitt pro Release auf mindestens ZWEI Screen Readern durchführen
(NVDA ist der einfachste Einstieg unter Windows; VoiceOver ist
auf macOS vorinstalliert; JAWS falls eine Lizenz vorhanden ist).

### 9.1 NVDA (Windows)

- [ ] NVDA installieren (kostenlos, nvaccess.org). Mit
      Ctrl+Alt+N starten.
- [ ] `https://yujin.app/nac-spec/index.html` mit ausgeschaltetem
      Monitor (oder geschlossenen Augen) öffnen.
- [ ] NVDA kündigt den Seitentitel + eine strukturierte Gliederung
      der Überschriften (h1, h2, h3) bei der Navigation mit der H-Taste an.
- [ ] Tab-Taste erreicht jedes interaktive Steuerelement in einer
      logischen Reihenfolge; jedes Steuerelement kündigt seine Rolle +
      Beschriftung klar an.
- [ ] Chat-Panel öffnen (NVDA liest, dass das Chat-Eingabefeld
      role=textbox mit einer klaren Beschriftung hat).
- [ ] "que es NAC3?" eingeben + senden -- NVDA liest die Antwort
      vollständig vor, wenn sie eintrifft.

### 9.2 NVDA auf `example-v21-data-table.php`

- [ ] NVDA kündigt "Lines (collection) tab" + den
      Permissions-Tab bei der Tab-Navigation an.
- [ ] Das Aktivieren eines Tabs kündigt den neuen Zustand über das
      `nac:tab:activated`-Event-Ack an.
- [ ] Wenn der LLM eine Zeile hinzufügt, liest NVDA den neuen Zeileninhalt
      unaufgefordert vor (oder mit einem einzelnen Pfeil-nach-unten).

### 9.3 VoiceOver (macOS)

- [ ] Cmd+F5 zum Starten von VoiceOver.
- [ ] `https://yujin.app/nac-spec/index.html` öffnen.
- [ ] VO+U öffnet den Rotor; Überschriften, Links und Formularsteuerelemente
      sind befüllt -- prüfen.
- [ ] VO+A liest die gesamte Seite von oben nach unten -- ergibt
      semantischen Sinn, nicht "div div div link link button".

### 9.4 VoiceOver auf den React- + Angular-Fallstudien

- [ ] Auf `demos/react/`: ein Todo über das Eingabefeld hinzufügen,
      nur mit Tastatur + VoiceOver. Das neue Todo wird beim Hinzufügen
      angekündigt (das Ack-Event ist verdrahtet).
- [ ] Auf `demos/angular/`: gleicher Test, gleiche Erwartung.

### 9.5 Nur-Tastatur-Navigation (kein Screen Reader, nur keine Maus)

- [ ] Maus trennen/deaktivieren.
- [ ] Die Startseite nur mit der Tab-Taste durchlaufen. Jeder Fokus-
      Stopp ist sichtbar (Fokusring vorhanden).
- [ ] Chat-Panel per Tastatur öffnen, einen Prompt eingeben,
      absenden. Ergebnis wird korrekt vorgelesen / angezeigt.
- [ ] Escape schließt jedes geöffnete Modal.
- [ ] Keine Tastaturfallen (Tab kehrt schließlich zum Anfang zurück).

### 9.6 Hoher Kontrast + 200 % Zoom

- [ ] Browser-Zoom auf der Startseite auf 200 % setzen. Layout bricht NICHT
      zusammen, kein horizontales Scrollen, kein überlappender Text.
- [ ] Windows-Hochkontrastmodus (oder macOS „Kontrast erhöhen").
      Schaltflächen, Links und Fokusringe bleiben sichtbar.

### 9.7 Sprachsteuerung (der rekursive Fall)

- [ ] In einem Pilot-fähigen Browser (oder mit dem Referenz-
      `nac-chat-client.js`-Mikrofon-Button) die Demos nur per Sprache
      steuern.
- [ ] Mikrofon-Button kündigt seinen Zustand gegenüber NVDA/VoiceOver an
      ("recording started", "recording stopped").
- [ ] Über NAC3 gesendete Sprachbefehle werden wirksam; das Ack wird
      dem Screen Reader angekündigt.

### 9.8 Gefundene Barrierefreiheitsprobleme

Alle in diesem Abschnitt gefundenen Probleme hier mit Schweregrad auflisten:

```
-
-
-
```

Wenn ein Problem mit dem Schweregrad BLOCKER offen ist, wird das Release NICHT
ausgeliefert, bis es behoben ist.

---

## FREIGABE

```
Release-Tag:          v____._.___
Durchgeführt von:     ______________________
Durchgeführt am:      ____-____-____
Verwendete Browser:   [ ] Chrome  [ ] Firefox  [ ] Safari
Konsultierte Muttersprachler (Locale -> Name):
   ____________________________________________
Gesamtzahl geprüfter Punkte:  ___ / ___
Fehlgeschlagene Punkte (Liste mit Bug-Links):
   ____________________________________________
   ____________________________________________
Unterschrift:         ______________________
```

Diese Datei mit dem ausgefüllten FREIGABE-Block committen, um das
Release als „menschlich geprüft" zu markieren.

---

## Siehe auch

- [TEST_COVERAGE_MATRIX.md](TEST_COVERAGE_MATRIX.md) -- die
  Matrix, aus der diese Checkliste abgeleitet ist.
- [NAC_TEST_MANUAL.md](NAC_TEST_MANUAL.md) -- das vorgelagerte
  Playbook für Adopter.
- [COVERAGE_REPORT_2026_05_10.md](COVERAGE_REPORT_2026_05_10.md)
  -- der automatische Coverage-Bericht für das aktuelle Release.

## Lizenz

Apache-2.0.

---

*This is a machine translation of the canonical English
version at `/nac-spec/docs/HUMAN_OK_CHECKLIST.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
