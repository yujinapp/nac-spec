---
translation_source: docs/NAC_TEST_MANUAL.md
translation_source_hash: 75c7b936593deacfec1dd9689f1093483363cc45f01514ff9c9d8d52e466c9a9
translation_quality: machine_v1
translation_lang: de
translation_date: 2026-05-11T14:45:03.352677+00:00
---

# NAC3 Test Manual

**Ein standardisiertes Test-Playbook für jede NAC-3-konforme App.**

Version 1.0 -- 2026-05-11. Maßgeblich für die NAC3 v2.2 + v2.3
Preview-Oberfläche. Bei Änderungen an der Spezifikation aktualisieren.

Dieses Dokument beschreibt, was ein Adopter-Team testen soll, wie es getestet wird, was zu prüfen ist und was übersprungen werden kann. Stufe für Stufe entlang der NAC3-Pipeline:

```
Comunicacion -> Desambiguacion -> Intencion -> Llamada -> Resultado -> Ack
    (1)             (2)             (3)         (4)         (5)        (6)
```

Dazu kommen übergreifende Themen: Konstruktor (V22-01), bindAction-Vertrag (V22-02), Interop (v2.3), Provenienz + Sicherheit.

Die Yujin-Referenz-Suite (die Fallstudie am Ende dieses Handbuchs) umfasst **175+ Unit-Tests + 16 Playwright-E2E-Tests**. Gewichtete Pipeline-Abdeckung im Durchschnitt **95 %**. Übernehmen Sie, was passt.

---

## 0. Warum dieses Handbuch existiert

Jedes Team, das NAC3 einführt, baut ein Test-Corpus von Grund auf und landet bei ungleichmäßiger Abdeckung -- ein Team hat perfekte Ack-Event-Tests, ignoriert aber den LLM-Intermediär; ein anderes hat End-to-End-Playwright, aber keine Unit-Tests. Dieses Handbuch legt fest, was „vollständiges Testen" für eine NAC-3-App bedeutet.

Die Mindestanforderungen für eine NAC-3-zertifizierte App:

| Stufe | Pflicht | Empfohlen |
|-------|---------|-----------|
| 1 Comunicacion | Text-Pfad abgedeckt. STT-Mock-Test für den Chat-Client. | Echtes TTS-Corpus + Audio-Wiedergabe via Playwright. |
| 2 Desambiguacion | Locale-Switch-Detektor auf False-Positives getestet. snapshotTree-Form verifiziert. | Pro-Tab/i18n-Label-Toleranz getestet. |
| 3 Intencion | Live- (oder VCR-Cassette-)Backend-Smoke für >= 5 Prompts. | Anti-Bug-Guards (spezifisch für die Bug-Historie Ihrer App). |
| 4 Llamada | Jede öffentliche NAC.*-Funktion, die Ihre App verwendet, mit Happy- und Error-Pfaden. | drag_drop, edit_field, wenn Sie diese verdrahten. |
| 5 Resultado | DOM-Seiteneffekt für mindestens die Top-10-Verben Ihrer App verifiziert. | Cross-Browser via Playwright-Matrix. |
| 6 Ack | Jede Event-Familie, die Ihre Rollen erzeugen, mit geprüfter Detail-Form. | Long-Tail-Familien (breadcrumb, accordion, step). |
| Interop | Wenn Sie MCP-Export/Import ausliefern: export_tree-Form + Import + Proxy + Disconnect. | HMAC-Signierung + Rekursionsschutz. |

---

## 1. Suite-Aufbau

Wir empfehlen diese Struktur (entspricht der Yujin-Referenz):

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

`tools/nac/test-launch.sh` führt aus:
- Layer 1: Alle node-seitigen Suites in Reihenfolge, Abbruch beim ersten FAIL.
- Layer 1b (optional): Live-Backend-Smoke (~60s).
- Layer 2: Statisches Linting via `npx @nac3/runtime validate <dir>`.
- Layer 3: Plausibilitätsprüfung von Dokumentationslinks.
- Layer 4: Demo-Artefakt-Integrität.
- Layer 5: Fallstudie-Paket-Integrität.

Ziel: Layer 1 + 2 + 3 + 4 + 5 unter 10 Sekunden auf einem Laptop.

---

## 2. Stufe für Stufe: Was zu testen ist

### Stufe 1 -- Comunicacion (STT + Roheingabe)

#### Was diese Stufe umfasst

Audio-Aufnahme, STT-Transkript, Rohtexteingabe in den Chat-Client. Das `_sttBuffer`- + `_sttFlushTimer`-Debouncing des Chat-Clients gehört hierher. Der Locale-Switch-Kurzschluss (`_maybeChangeLocaleLocally`) ebenfalls.

#### Was zu testen ist

1. **STT-Mock + Transkript-Injektion.** Ersetzen Sie `window.SpeechRecognition` durch ein Fake, das ein synthetisches `result`-Event mit einem eingesetzten Transkript auslöst. Verifizieren Sie, dass `NacChat.send(transcript)` genau diesen Text in den Dispatcher weiterleitet.
2. **TTS-Corpus-Integrität.** Generieren Sie ~30 Audio-Prompts via Google Cloud TTS / ElevenLabs in Ihren 10 unterstützten Locales. Verifizieren Sie, dass jede MP3-Datei existiert und >= 1 KB groß ist. Dient als Regressionsschutz für das Corpus selbst.
3. **Echte Audio-Wiedergabe (Playwright).** Optional. Spielen Sie eine der Corpus-MP3s über `getUserMedia`-Mocking ab und leiten Sie sie an die SpeechRecognition des Browsers weiter. Schwierig sauber aufzusetzen; für v1 überspringen.

#### Was zu prüfen ist

- Jeder Prompt im Corpus erreicht `NacChat.send()` mit dem exakten Text.
- Leere + Whitespace-Eingaben bringen den Chat-Client nicht zum Absturz.
- Der Locale-Switch-Kurzschluss feuert für Prompts, die `_detectLangSwitch` entsprechen (auch in Stufe 2 abgedeckt).

#### Was zu überspringen ist

- Mikrofon-Berechtigungsabläufe. Das ist Browser-Level-UI; nicht für Playwright geeignet.
- Cross-Browser-Audio-Codec-Kompatibilität. Im Corpus bei MP3 und einem Browser bleiben.

---

### Stufe 2 -- Desambiguacion

#### Was diese Stufe umfasst

`_detectLangSwitch`. Snapshot-Komposition + Bereinigung. `tab_by_label`-Matcher-Toleranz. Alles, was Rohtext in „was der LLM sehen soll / welchen Shortcut lokal auslösen" umwandelt.

#### Was zu testen ist

1. **`_detectLangSwitch`-False-Positive-Fälle.** Das ist der fehleranfällige Bereich; explizite Anti-Tests ausliefern:
   - `'cambia de pestana'` -> bleibt in der aktuellen Locale.
   - `'cambia precio de mouse 40'` -> bleibt in der aktuellen Locale.
   - `'borra de la lista'` -> bleibt.
   - `'pasa de A a B'` -> bleibt.
2. **`_detectLangSwitch`-Positive-Fälle.** Mindestens 12 über die unterstützten Locales:
   - `'cambia a aleman'` -> de
   - `'switch to english'` -> en
   - `'use spanish'` -> es
   - `'cambia idioma a de'` (expliziter Trigger + nackter Code) -> de
   - Same-Lang-Noop.
   - Leere / Whitespace-Eingabe.
3. **`tab_by_label`**-Toleranz:
   - Exakter textContent-Treffer.
   - Treffer mit entfernten Klammern (`"Lines (collection)"` trifft `"Lines"`).
   - i18n-Locale-Label-Treffer.
   - Unbekanntes Label -> not_found.
4. **`snapshotTree`-Form.** Gibt `{active, plugins[]}` zurück. Enthält Manifest pro Plugin. Enthält den Datentabellen-Snapshot des aktiven Plugins (falls v2.1).

#### Was zu prüfen ist

- Die finale Sprache nach `NacChat.send(text)` entspricht der Erwartung.
- Das Backend wurde wie erwartet aufgerufen oder nicht.
- `tab_by_label` gibt sauber zurück oder wirft sauber pro Fall.
- `snapshotTree()` ist JSON-serialisierbar + in der Größe begrenzt.

#### Häufige Fallstricke

- Nackte 2-Buchstaben-Locale-Codes (`'de'`, `'es'`) kollidieren mit Präpositionen/Artikeln. Die Fallstricke explizit testen.
- Füll-Labels mit 1-2 Zeichen in `label_i18n` verursachen False-Positives bei Teiltreffern. Realistische Strings verwenden.

---

### Stufe 3 -- Intencion (LLM-Intermediär)

#### Was diese Stufe umfasst

Der HTTP-Round-Trip zwischen dem Chat-Client und dem LLM-Intermediär. Die Rolle des Backends: `nac_tree`-Snapshot + Prompt lesen, `{message, actions[]}` zurückgeben.

#### Was zu testen ist

1. **Backend-Form-Smoke.** Für eine Reihe kanonischer Prompts in Ihren unterstützten Locales (empfohlen >= 15): POST an den Endpunkt und prüfen:
   - HTTP 200.
   - JSON-Antwort mit `ok`-Boolean.
   - Bei ok: `message`-String + `actions`-Array.
   - Jedes `action.kind` ist eines der kanonischen Kinds.
2. **Anti-Bug-Guards.** Für jede bekannte Bug-Klasse in Ihrer Historie einen expliziten Live-Test schreiben. Beispiel: `'cambia de pestana'` DARF NICHT `change_locale: 'de'` zurückgeben.
3. **Snapshot-Größen-Guard.** Keine Snapshots > 20 KB an den LLM senden, wenn Sie nach Token abrechnen; der Test schlägt den Build fehl, wenn Ihr Tree das Budget überschreitet.

#### Was zu überspringen ist

- LLM-spezifische Action-Inhalte. Der LLM ist nicht-deterministisch; nicht prüfen „save löst action_id = X aus". Nur die Form.
- Netzwerk-Resilienz (Timeouts, Retries). Gehört zu Last-/Zuverlässigkeitstests, nicht zu Unit-/Smoke-Tests.

#### Live vs. VCR

Live-Tests sind anfällig für LLM-Kosten + Rate-Limits. Nachdem das Prompt-Corpus stabil ist, Antworten als VCR-Cassettes aufzeichnen (JSON-Dateien, die Prompt -> Antwort abbilden) und in CI abspielen. Yujins Referenz verwendet Live-Tests, weil das Budget ~60s/Run erlaubt; auf Cassettes umsteigen, wenn Ihr CI zu häufig läuft.

---

### Stufe 4 -- Llamada (NAC.*-Write-APIs)

#### Was diese Stufe umfasst

Jede öffentliche Funktion auf `window.NAC`: click, click_by_verb, fill, select, tab, tab_by_label, go_to_section, drag_drop, edit_field, dt_*, bindAction.

#### Was zu testen ist

Für jede Funktion, die Sie verwenden, drei Fälle:

1. **Happy Path.** Ein DOM-Element passend zur Manifest-ID mounten; seinen Handler so verdrahten, dass er das kanonische Ack-Event emittiert; `NAC.<func>(...)` aufrufen und prüfen, dass es auflöst.
2. **not_found.** Mit einer nicht existierenden ID aufrufen; prüfen, dass es mit Code `'not_found'` wirft (oder `'section_not_found'` für go_to_section).
3. **Ungültige Eingabe.** Mit leeren / falsch geformten Argumenten aufrufen; prüfen, dass es mit Code `'invalid'` wirft.

Für die `dt_*`-Familie zusätzlich:

- `dt_add_row` gibt `{ok, row_id}` zurück.
- `dt_edit_cell` Happy + ungültiger-Wert-abgelehnt (z. B. `qty < min`).
- `dt_remove_row` dekrementiert `dt_state().rows.length`.
- `dt_commit` gibt `{ok, final_state}` zurück.
- `dt_discard` macht nicht committete Mutationen rückgängig.

#### Implementierungshinweis

In einem kleinen In-Process-DOM-Shim (~150-200 Zeilen EventTarget-Unterklasse) ausführen, sodass Sie für Stufe 4 kein jsdom oder Playwright benötigen. Der Compound-Selector-Matcher (`[a="b"][c="d"]`) ist das einzige Feature, das Sie unterstützen müssen. Siehe `stage4-calls.mjs` in der Referenz-Suite.

---

### Stufe 5 -- Resultado (DOM-Seiteneffekt)

#### Was diese Stufe umfasst

Was sich im DOM nach einem NAC.*-Aufruf tatsächlich ändert. Unterscheidet sich von Stufe 4 (die Funktion hat ok zurückgegeben) und Stufe 6 (das Ack-Event hat gefeuert).

#### Was zu testen ist

1. **Pro-Verb-DOM-Mutation.** Für Ihre Top-10-Verben:
   - `save` -> wurde das zugrunde liegende Formular abgeschickt? Toast erschienen?
   - `cancel` -> wurde das Modal geschlossen? Formularwerte zurückgesetzt?
   - `delete` -> wurde die Zeile aus der Liste entfernt?
   - `add_row` -> ist eine neue Zeile in der Tabelle sichtbar?
2. **Playwright-E2E pro Oberfläche.** Ein Spec pro Top-Level-Plugin / Screen. Die Oberfläche in einem echten Browser mounten, den kanonischen Benutzerfluss durchführen, DOM-Zustand prüfen.

#### Was zu überspringen ist

- Pixelgenaue Screenshot-Diffs. Visuelle Regression hat eigene Tooling.
- Performance (Frame-Rate, Layout-Shifts). Gehört zu Performance-Tests, separates Budget.

---

### Stufe 6 -- Ack-Event-Familie

#### Was diese Stufe umfasst

Jedes `nac:*`-Event, auf das die Runtime hört. Jedes hat eine kanonische Detail-Form (Plugin + ID-Schlüssel + optionale Extras).

#### Was zu testen ist

Pro Familie in `_CLICK_EVENT_FAMILY`:

- `nac:action:succeeded` -- detail.plugin + detail.action_id + detail.is_trusted.
- `nac:action:failed` -- dasselbe + detail.error.
- `nac:field:changed` -- detail.field_id + detail.value.
- `nac:tab:activated` -- detail.tab_id.
- `nac:breadcrumb:navigated` -- detail.breadcrumb_id.
- `nac:accordion:expanded` / `:collapsed` -- detail.accordion_id.
- `nac:step:advanced` -- detail.step_id.
- `nac:table:page_changed` -- detail.page_index.
- `nac:confirm:resolved` / `:cancelled` -- detail.confirm_id.
- `nac:table:sort_changed` -- detail.column_id.
- `nac:table:filter_changed` -- detail.filter_id.

Für jede:
1. Ein DOM-Element mit der kanonischen Rolle mounten.
2. Den Click-Handler so verdrahten, dass er das kanonische Event emittiert.
3. `NAC.click(id)` aufrufen und auf das Event hören.
4. Detail-Form prüfen.

Zusätzlich:
- **Click-to-Resolve-Timing.** Der Listener der Runtime sollte innerhalb von 200ms nach dem Ack-Feuern auflösen. Alles Langsamere ist ein Runtime-Bug.
- **`bindAction`** emittiert das Ack automatisch nach einem synchronen Handler.
- **`bindAction` async-resolve** emittiert automatisch nach Promise-Auflösung.
- **`bindAction` throw** -> emittiert automatisch `nac:action:failed` mit detail.error.

---

### V22-01 -- Strikter Konstruktor-Validator

`NAC.STRICT_VALIDATION = true` lässt `NAC.register` werfen bei:

- `manifest_role_unknown` -- Rolle außerhalb des kanonischen Sets.
- `tab_id_manifest_role_drift` -- ID entspricht `^tab\.`, aber Rolle ist nicht `'tab'`.
- `manifest_dom_role_mismatch` -- gemountetes DOM hat eine andere Rolle als das Manifest deklariert.

Jeden Fall testen durch:
1. `STRICT_VALIDATION = true` setzen.
2. `register` mit einem Manifest aufrufen, das die Regel verletzt.
3. Prüfen, dass es mit `code: 'strict_validation'` und `findings: [...]` wirft.

Ohne Strict-Mode: prüfen, dass `console.error` emittiert wurde (via Spy auf `console.error` erfassen).

---

### V22-02 -- bindAction-Helper

Bereits oben in Stufe 6 abgedeckt, aber: mindestens 5 explizite Tests schreiben:

1. Synchroner Handler -> Ack feuert.
2. Werfender Handler -> Failed-Event feuert + Fehler wird weitergeworfen.
3. Asynchroner Handler, der auflöst -> Ack feuert nach Auflösung.
4. `bindAction` gibt einen Unbinder zurück; dessen Aufruf stoppt die Emission.
5. Fehlender Ctx (kein Plugin oder action_id) -> wirft mit `code: 'invalid'`.

---

### Interop -- v2.3 Preview

Wenn Ihre App NAC3-Trees via MCP exportiert / importiert:

1. **export_tree-Form.** Gibt `{app_id, app_version, nac_version, exported_at, active_plugin, manifests, scope_tree, data_tables, state, ack_endpoint}` zurück.
2. **export_tree-Filter.** `scope: 'plugin_slug:<slug>'` gibt nur dieses Plugin zurück. `scope: 'active_plugin'` gibt nur das aktive zurück. `include_locales: ['en','es']` gibt nur diese Locales zurück.
3. **import_remote_tree-Validierung.** Fehlender Bearer oder Endpunkt wirft `invalid`. Doppelter Namespace wirft `conflict`.
4. **Namespaced Plugin-Registrierung.** Nach dem Import enthält `NAC.list_registered_plugins()` `remote:<ns>:<slug>`.
5. **Proxy-Dispatch.** `NAC.click('remote:<ns>:...')` löst einen `fetch` an den Endpunkt des Peers mit `bearer` + `nac_id` (peer-lokal, ohne Präfix) + `action.kind` aus.
6. **Lokaler Ack-Spiegel.** Nach erfolgreichem Proxy feuert ein lokales `nac:action:succeeded` mit `detail.via_interop: true` + `detail.is_trusted: false`.
7. **Peer-Fehler-Bubbling.** Peer gibt `{ok: false, error: {code: '...', message: '...'}}` zurück -> Client wirft mit dem Code des Peers.
8. **disconnect_remote.** Löscht den Namespace; nachfolgendes `NAC.click('remote:...')` wirft not_found.
9. **Lokale Clicks proxyen nicht.** Kritischer Vertrag: Nachdem die Interop-Schicht installiert ist, darf `NAC.click` auf einer LOKALEN ID NICHT fetchen.

---

## 3. Tooling-Empfehlungen

### Test-Runner

- **Node + einfache ESM-Module** für die Stufen 2–6. Kein Jest, kein
  Vitest – 200 Zeilen `assert(name, ok)` reichen aus und bringen
  weniger Abhängigkeiten mit sich.
- **Playwright** für Stage 5 e2e + Stage 1 Audio-Wiedergabe, falls
  gewünscht.

### CI

- Keinen Live-Backend-Smoke (Stage 3) bei jedem Push ausführen – ~60s
  pro Lauf × Merge-Häufigkeit = echte Kosten. Ausführen bei:
  - Manuellem Auslöser (`gh workflow run`).
  - Nächtlichem Cron-Job.
  - Vor dem Erstellen eines Release-Tags.
- Stufen 1, 2, 4, 6 + den Harness bei jedem Push ausführen. Gesamtbudget:
  unter 15s.

### Coverage-Bericht

Pro Release eine `docs/COVERAGE_REPORT_<date>.md` pflegen. Die
fallbezogene Tabelle aktualisieren. Den gewichteten Pipeline-Durchschnitt
angeben. Die Yujin-Referenz befindet sich unter
`yujin.app/nac-spec/docs/COVERAGE_REPORT_2026_05_10.md`.

---

## 4. Anti-Patterns, die vermieden werden sollten

1. **Inhalte von LLM-Aktionen prüfen.** Nicht-deterministisch.
   FORM testen, nicht WERTE.
2. **DOM im Stage 5 mocken.** Stage 5 dreht sich um echte DOM-
   Mutation; Playwright verwenden, kein Shim.
3. **Coverage nach Zeilen statt nach Stufen.** Abgedeckte Code-Zeilen
   sagen nichts darüber aus, ob die Pipeline funktioniert. Die
   Stufen-Matrix verwenden.
4. **Nur Happy-Paths in Stage 4.** Not_found + ungültige Eingaben
   machen die Hälfte des Vertrags aus.
5. **Stage 6 überspringen.** Das Ack-Event ist der am häufigsten
   verletzte Teil der Spec in Adopter-Code. Jede emittierte Familie
   testen.
6. **Keine Anti-Bug-Absicherungen.** Jeder Produktionsfehler, den die
   App behoben hat, erhält einen dauerhaften Regressionstest. Der
   „cambia de pestana"-Fall ist für immer in unserem Stage 2.
7. **Live-Tests bei jedem Push.** Verbraucht Budget; fehleranfällig
   durch Drittanbieter-Varianz.

---

## 5. Fallstudie – die Yujin-Referenz-Suite

Alle Test-Quell-Links unten verweisen auf die kanonischen Dateien auf
GitHub.

| Suite | Quelle | Tests | Zeit |
|-------|--------|-------|------|
| smoke | [packages/nac/test/smoke.mjs](https://github.com/pkuschnirof/rpaforce-crm/blob/main/packages/nac/test/smoke.mjs) | 36 | < 1s |
| v22 | [packages/nac/test/v22.mjs](https://github.com/pkuschnirof/rpaforce-crm/blob/main/packages/nac/test/v22.mjs) | 14 | < 1s |
| v23-interop | [packages/nac/test/v23-interop.mjs](https://github.com/pkuschnirof/rpaforce-crm/blob/main/packages/nac/test/v23-interop.mjs) | 14 | < 2s |
| stage1-audio | [packages/nac/test/stage1-audio.mjs](https://github.com/pkuschnirof/rpaforce-crm/blob/main/packages/nac/test/stage1-audio.mjs) | 33 | < 1s |
| stage2-disambiguation | [packages/nac/test/stage2-disambiguation.mjs](https://github.com/pkuschnirof/rpaforce-crm/blob/main/packages/nac/test/stage2-disambiguation.mjs) | 31 | < 1s |
| stage3-backend (live) | [packages/nac/test/stage3-backend.mjs](https://github.com/pkuschnirof/rpaforce-crm/blob/main/packages/nac/test/stage3-backend.mjs) | ~150 (10 Locales × 3 Prompts) | ~120s |
| stage4-calls | [packages/nac/test/stage4-calls.mjs](https://github.com/pkuschnirof/rpaforce-crm/blob/main/packages/nac/test/stage4-calls.mjs) | 31 | ~2s |
| stage6-ack | [packages/nac/test/stage6-ack.mjs](https://github.com/pkuschnirof/rpaforce-crm/blob/main/packages/nac/test/stage6-ack.mjs) | 16 | < 1s |
| stage6b-longtail | [packages/nac/test/stage6b-longtail.mjs](https://github.com/pkuschnirof/rpaforce-crm/blob/main/packages/nac/test/stage6b-longtail.mjs) | 14 | < 1s |
| TTS-Corpus-Generator | [packages/nac/test/fixtures/voice/generate.mjs](https://github.com/pkuschnirof/rpaforce-crm/blob/main/packages/nac/test/fixtures/voice/generate.mjs) | -- | einmalig |
| TTS-Corpus-Katalog | [packages/nac/test/fixtures/voice/corpus.json](https://github.com/pkuschnirof/rpaforce-crm/blob/main/packages/nac/test/fixtures/voice/corpus.json) | 30 Prompts | -- |
| Harness | [tools/nac/test-launch.sh](https://github.com/pkuschnirof/rpaforce-crm/blob/main/tools/nac/test-launch.sh) | 5 Schichten | ~10s |
| **Gesamt Node-seitig** | | **259+** | **~10s + 120s optional** |

Dazu 16 Playwright-e2e-Specs (~54s):

| Spec | Quelle | Tests | Tag |
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
| **Gesamt Playwright** | | **16** | |

**Gesamtsumme: 205+ Tests**, die die vollständige Pipeline von der
Chat-Eingabe bis zum Ack-Event abdecken, mit einer gewichteten
durchschnittlichen Coverage von **95%**.

### Coverage nach Stufe (Yujin-Referenz, 2026-05-11)

| Stufe | Abdeckende Suite | Coverage |
|-------|-----------------|----------|
| 1 Comunicacion | stage1-audio.mjs | 85% |
| 2 Desambiguacion | stage2-disambiguation.mjs | 95% |
| 3 Intencion | stage3-backend.mjs (live LLM) | 85% |
| 4 Llamada | stage4-calls.mjs | 95% |
| 5 Resultado | tests/e2e-nac/specs/*.spec.ts (Playwright) | 95% |
| 6 Ack | stage6-ack.mjs + stage6b-longtail.mjs | 100% |
| Interop (v2.3) | v23-interop.mjs + 05-demo-v22-interop.spec.ts | 100% |
| Constructor (V22-01) | v22.mjs | 100% |
| bindAction (V22-02) | v22.mjs | 100% |
| **Gewichteter Durchschnitt** | | **~95%** |

### Fehler, die der Test-Corpus aufgedeckt hat

Der Test-Corpus hat während der Entwicklung zwei echte Laufzeitfehler
aufgedeckt, die im selben Branch behoben wurden:

1. **`tab_by_label`-Matcher zu ungenau.** Die ursprüngliche Implementierung
   akzeptierte jeden bidirektionalen `indexOf`-Treffer. Ein 1-Zeichen-Füll-
   Label (`'a'`) in `label_i18n` würde jede Anfrage mit 1+ Zeichen treffen.
   Stage-2-Test B4 hat es gefunden. Fix: Sowohl Kandidat als auch Anfrage
   müssen für einen Teilabgleich >= 3 Zeichen lang sein; exakte Gleichheit
   ist immer erlaubt.

2. **Fehlender `list_registered_plugins`-Introspektions-Helper.**
   Die `export_tree`-Funktion der Interop-Schicht iteriert die Manifest-
   Registry, um ihre Nutzlast zu erzeugen. Die Laufzeit hatte keine
   öffentliche API, um registrierte Plugins unabhängig vom DOM-Mount-
   Zustand aufzulisten. Aufgedeckt beim Schreiben der v23-interop-Suite.
   Fix: `NAC.list_registered_plugins()` hinzugefügt, das
   `Object.keys(_manifests)` zurückgibt.

Beide Fixes wurden im selben Branch in `js/nac.js` ausgeliefert.

### Adopter-Playbook – diese Suite übernehmen

1. **Zuerst die Test-Infrastruktur kopieren.** `packages/nac/test/`
   Shim + Helpers + Harness. Die vorhandenen Tests ausführen, um alles
   zu verifizieren.
2. **Den Test-Corpus durch die eigene App-Oberfläche ersetzen.** Eigene
   Plugin-Slugs, eigene Verben, eigene Datentabellen. Die Pipeline-Stufen-
   Organisation beibehalten.
3. **Den TTS-Corpus generieren** via
   `packages/nac/test/fixtures/voice/generate.mjs`. Den Google Cloud TTS-
   oder ElevenLabs-Schlüssel per Umgebungsvariable bereitstellen.
4. **`tools/nac/test-launch.sh` in die CI einbinden.** Schichten 1–5
   vor dem Merge; Backend-Schicht 1b optional oder nächtlich.
5. **Einen Coverage-Bericht pflegen.** Pro Release aktualisieren.

### Lizenz

Dieses Handbuch steht wie der Rest der NAC3-Spec unter Apache-2.0.
Kopieren, forken, weitergeben.

---

## 6. Wie geht es weiter

- [SPEC.md](../SPEC.md) – der kanonische Vertrag, gegen den Yujin testet.
- [SECURITY.md](../SECURITY.md) – Bedrohungsmodell + Herkunft.
- [COVERAGE_REPORT_2026_05_10.md](COVERAGE_REPORT_2026_05_10.md)
  – der aktuelle Referenzbericht.
- [LAUNCH_PLAN_2026_05_10.md](LAUNCH_PLAN_2026_05_10.md) – das
  autonome Sumi-Launch-Playbook, in dem dieser Test-Corpus entwickelt wurde.

*Dieses Dokument entwickelt sich mit der NAC3-Spec weiter. Änderungen als
PR gegen `yujin.app/nac-spec/docs/NAC_TEST_MANUAL.md` einreichen.*

---

*This is a machine translation of the canonical English
version at `/nac-spec/docs/NAC_TEST_MANUAL.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
