---
translation_source: docs/NAC_V22_ROADMAP.md
translation_source_hash: 8d844659a0ed290a00c015c5b2e875d6d9b3d52b18f02f8c182169927d3d4750
translation_quality: machine_v1
translation_lang: de
translation_date: 2026-05-11T14:41:15.073573+00:00
---

# NAC3 v2.2 -- Roadmap

NAC3 = **Native Agent Contract**.

Gestartet am 2026-05-09. Diese Datei dokumentiert die Weiterentwicklung für die nächste Minor-Version der NAC3-Spezifikation. Jeder Abschnitt ist in sich geschlossen: Problembeschreibung, verhinderte Fehlerklasse, vorgeschlagene Vertragsänderung und Implementierungshinweise.

**Stand 2026-05-10:** v2.2 AUSGELIEFERT. Die Punkte V22-01 +
V22-02 + V22-03 + V22-04 sind alle in `js/nac.js` + dem `@nac3/runtime`
2.2.0 NPM-Paket enthalten. Diese Datei ist nun das kanonische Changelog für die Version.

| Punkt | Status | Commit |
|------|--------|--------|
| V22-01 strikter Validator | AUSGELIEFERT | 6c2b1866 |
| V22-02 bindAction-Hilfsfunktion | AUSGELIEFERT | 6c2b1866 |
| V22-03 Locale-Detector-Härtung | AUSGELIEFERT 2026-05-09 | f631d77a |
| V22-04 tab_by_label Klammern-Normalisierung | AUSGELIEFERT 2026-05-09 | f631d77a |
| V23-01 Field-Editor-Primitive (Vorschau) | DEMO AUSGELIEFERT 2026-05-11 | (example-v23-editor.php + packages/nac/test/v23-editor.mjs 8/8 PASS) |

---

## V22-01 -- Konstruktor (`NAC.register`) wird zum strikten Validator

**Fehlerklasse.** Brownfield-Demos können Manifest-Elemente mit nicht-kanonischen Role-Werten deklarieren (`role:'navigation'` auf einem Tab, `role:'button'` statt `'action'` usw.). Der aktuelle Konstruktor akzeptiert jede beliebige Form und speichert sie unverändert. Der Fehler tritt erst zur Laufzeit auf, wenn die API (`NAC.tab()`, `NAC.tab_by_label()`, `NAC.click()`) das Element nicht finden kann, weil die kanonische DOM-Abfrage (`[data-nac-role="tab"]`) nicht übereinstimmt. Zu diesem Zeitpunkt ist das Demo bereits deployed, der Nutzer hat bereits den fehlerhaften Sprachbefehl ausgelöst, und die Laufzeit wirft korrekt `tab X missing` -- eine irreführende Fehlermeldung, da das Element durchaus im DOM vorhanden ist, nur unter der falschen Role.

**Konkreter Auslöser (2026-05-09).** Pablo diktiert `ve a pestana permisos` auf `example-v21-data-table.php`. Das LLM löst dies zu `NAC.tab('invoice_edit_modal','tab.permissions')` auf. Der Button existiert im DOM, jedoch mit `data-nac-role="navigation"` (so vom Demo-Autor aus HTML-semantischen Gründen gesetzt: Tabs SIND Navigation). Die Laufzeit wirft „tab tab.permissions missing", obwohl der Button direkt vorhanden ist. Dieselbe Grundursache führte früher in derselben Sitzung dazu, dass `tab_by_label('Lines (collection)')` fehlschlug.

**Warum drei Schutzschichten es hätten abfangen sollen, es aber nicht taten.**

| Schicht | Sollte erkennen... | Was sie heute tut |
|---|---|---|
| Pre-commit-Lint | Role-Drift in PHP/HTML-Demo-Dateien | existiert nicht |
| `NAC.register(manifest)` (zur Registrierungszeit) | nicht-kanonische Roles, Id/Role-Mismatch | akzeptiert alles stillschweigend |
| `NAC.validate_global()` (zur Lint-Zeit) | Role-Drift innerhalb von `m.elements[]` | prüft nur das Vorhandensein von `m.tabs[]` |

Die Laufzeit-API-Schicht (`NAC.tab` usw.) ist die **vierte** Schutzschicht und die einzige, die heute anspricht -- als Laufzeitfehler für den Endnutzer. Zu diesem Zeitpunkt sind die Kosten am höchsten.

**Vorgeschlagene Vertragsänderung für v2.2.**

`NAC.register` MUSS das Manifest vor der Speicherung validieren.
Validierungsregeln:

1. **Bekannte Role-Enumeration.** Jedes `m.elements[i].role` muss ein Mitglied des kanonischen Role-Sets sein (erweitert `_CLICK_EVENT_FAMILY`):

   ```
   action, field, option, tab, breadcrumb-item, accordion-toggle,
   step, pagination-item, confirm-button, sort-control,
   filter-control, data-table, plugin, section, region,
   navigation, banner, complementary, contentinfo, button
   ```

   Unbekannte Roles -> `console.error` + Registrierungsaufruf ablehnen. Landmark-Roles (`navigation`, `banner` usw.) werden akzeptiert, jedoch nur bei Elementen, deren zugehöriger DOM-Knoten ein Region-Container ist, kein klickbares Widget.

2. **Id/Role-Kohärenz.** Wenn `e.id` auf `^tab\.` passt, ist `e.role === 'tab'` erforderlich. Wenn `e.id` auf `^modal\.` passt, ist `e.role === 'action'` (oder die Sub-Role der Action) erforderlich. Jede Abweichung -> `console.error` + ablehnen. Die Grammatik des Id-Felds ist ebenfalls ein Vertrag; heute ist sie implizit.

3. **DOM-Kohärenz (Best Effort).** Wenn `register` nach dem Parsen des DOM aufgerufen wird (der typische Pfad), wird `[data-nac-id="<e.id>"]` im DOM nachgeschlagen. Wird es gefunden und sein `data-nac-role` weicht von `e.role` ab, `console.error` + ablehnen. Dies fängt den Fall ab, den Pablo am 2026-05-09 erlebt hat: Das Manifest gibt `role:'tab'` an, aber das HTML enthält noch `data-nac-role="navigation"` (oder umgekehrt). Wird `register` vor dem Bereitstehen des DOM aufgerufen, wird die Prüfung auf einen `DOMContentLoaded`-Nachlauf verschoben.

4. **Migrations-Hilfsfunktion (ein Release-Fenster).** Für v2.2.0 erzeugen die obigen Regeln `console.error`, werfen jedoch KEINE Exception -- Adopter benötigen ein Fenster zur Migration. Ab v2.3.0 werfen sie einen `RegisterError` und das Manifest wird vollständig abgelehnt. Im Laufzeitsystem über das Flag `NAC.STRICT_VALIDATION` verfolgt, das in v2.2 standardmäßig `false` und in v2.3 `true` ist.

**Erweiterung von `NAC.validate_global()`.**

Drei neue Befunde hinzufügen:

- `manifest_role_unknown` -- die Role eines Elements liegt außerhalb des kanonischen Sets.
- `manifest_dom_role_mismatch` -- die Manifest-Role für `<id>` weicht vom `data-nac-role`-Attribut im DOM ab.
- `tab_role_drift` -- ein `<button>` (oder ein beliebiges klickbares Element) im DOM hat `data-nac-id="tab.X"`, aber `data-nac-role` ist nicht `"tab"` -- unabhängig davon, ob ein Manifest-Eintrag existiert. Fängt rein HTML-seitigen Drift ab, den der Manifest-Validator per Definition nicht erkennt.

Jeder Befund trägt standardmäßig den Schweregrad `error`; `{ kind: 'warn' }` ist pro Projekt überschreibbar.

**Pre-commit-Lint (separates Lieferobjekt, blockiert denselben Drift).**

Ein neues Node-Skript `tools/nac/check_demos.mjs` liest jede `*.php`- und `*.html`-Datei in `yujin.app/nac-spec/`, erstellt ein Pseudo-DOM via cheerio (oder Regex für den schlanken Pfad), extrahiert jeden `NAC.register({...})`-Aufruf aus Inline-Skripten und prüft dieselben Kohärenzregeln. In GitHub Actions und einen lokalen `pre-commit`-Git-Hook eingebunden. Blockiert den Commit, wenn eine Regel fehlschlägt.

**Aufwandsschätzung.**

| Aufgabe | Ort | Aufwand |
|---|---|---|
| `NAC.register` Strict Mode | `js/nac.js` | 2h |
| `validate_global` neue Befunde | `js/nac.js` | 2h |
| Pre-commit-Lint-Skript | `tools/nac/check_demos.mjs` | 4h |
| Migrations-Durchlauf über bestehende Demos | `example-v*.php` | 1h |
| Dokumentationsaktualisierungen in der Spezifikation | `docs/spec.md` usw. | 1h |
| Tests + CI-Einbindung | `tests/` + `.github/workflows/` | 2h |

Gesamt: ~12h fokussiert.

**Abwärtskompatibilität.**

Die v2.2-Versionshinweise müssen deklarieren:
- `NAC.register` gibt bei Role-Drift nun `console.error` aus (ohne Exception).
- v2.3 wird unter denselben Bedingungen einen `RegisterError` werfen.
- Adopter sollten `NAC.validate_global()` vor dem Ausliefern ausführen.

Der Migrationspfad für die bestehenden 6 Demos in diesem Repository ist bereits mit Commit `0633e080` (2026-05-09) abgeschlossen: Die Tab-Buttons und das Manifest des v21-Demos wurden auf `role:'tab'` korrigiert.

---

## V22-02 -- Durchsetzung des Action-Ack-Vertrags

**Problemklasse.** Click-Handler, die ihre Arbeit synchron erledigen,
müssen nach dem Seiteneffekt `dispatchEvent(new CustomEvent('nac:action:succeeded',
{detail:{plugin,action_id}}))` aufrufen. Brownfield-Panels vergessen das häufig.
Die Runtime lässt dann den 5s-Ack-Poll ablaufen, obwohl der Seiteneffekt bereits
eingetreten ist, und der Chat oder Agent meldet `No pude ejecutar X: timeout`.

**Konkreter Auslöser (2026-05-09).** Pablo: `hide` -> Panel wird korrekt
ausgeblendet, Chat meldet „No pude ejecutar v20_panel.toggle: timeout".
Gleiches gilt für jeden Button im v20-Panel.

**Der bisherige Workaround war falsch.** Commit `ad200e4c` hat
`err.code === 'timeout'` im agentic Loop des Chats stillschweigend als Erfolg
gewertet. Pablo hat zu Recht darauf hingewiesen, dass dies echte Fehler
verschleiert (hängender Handler, Network-Race, unbehandelte Exception) und das
einzige verlässliche Signal der Runtime untergräbt. Rückgängig gemacht in
`c9bf2bdb`.

**Der richtige Fix ist bereits ausgeliefert.** `bind()` in
`example-v20-full.php` wurde so erweitert, dass nach jedem Handler automatisch
`nac:action:succeeded`/`nac:action:failed` emittiert wird. Umgesetzt in
`c9bf2bdb`.

**Vorgeschlagene Vertragsänderung für v2.2.**

Die Runtime SOLLTE einen Helper bereitstellen:

```js
NAC.bindAction(el, handler, { plugin, action_id })
```

der die Ack-Emission automatisch übernimmt. Gleiche Schnittstelle wie
`addEventListener('click', handler)`, aber mit eingebautem Konformitätsvertrag.
Demos, die den Helper verwenden, können das Ack nicht mehr vergessen.

`validate_global` erhält einen neuen Befund:

- `action_handler_without_ack` -- wird per Instrumentierung erkannt:
  Während `validate_global` sendet der Validator einen synthetischen
  Click auf jedes `data-nac-role="action"`-Element in einem kontrollierten
  Kontext, lauscht 500ms auf `nac:action:succeeded` und markiert alle
  Elemente, die das Event nicht feuern.

Dieser Befund ist opt-in (`NAC.validate_global({ probe: true })`),
da synthetische Clicks Seiteneffekte haben.

**Aufwand.** ~3h für den Helper + ~4h für den probe-basierten Befund.

---

## V22-03 -- Härtung des Locale-Switch-Detektors

**Problemklasse.** Nackte 2-Buchstaben-Locale-Codes im Sprachdetektor des
Chat-Clients (`'de'`, `'es'`, `'en'`) kollidieren in mehreren Sprachen mit
Präpositionen und Artikeln. `cambia DE pestana` hat den Chat auf Deutsch
umgeschaltet.

**Der Fix ist bereits ausgeliefert.** `_detectLangSwitch` in
`nac-chat-client.js` verlangt nun, dass nackte 2-Buchstaben-Codes zusammen mit
einem expliziten `LOCALE_TRIGGER` auftreten
(`idioma`/`language`/`sprache`/...). Umgesetzt in `f631d77a`.

**Vorschlag für v2.2.** Den Locale-Detektor aus dem Chat-Client herauslösen
und als NAC3-Primitive bereitstellen, damit jedes Brownfield-Chat-Embed
denselben gehärteten Detektor erhält. Die Klasse der False Positives explizit
in der Spec dokumentieren, damit künftige Implementierungen den Fehler nicht
erneut einführen.

**Aufwand.** ~2h.

---

## V22-04 -- Natürlichsprachliche Toleranz bei `tab_by_label`

**Bereits enthalten.** Das Entfernen von Klammern (`"Lines (collection)"` trifft
auf `"Lines"` und `"Lines tab"`) wurde in `f631d77a` ausgeliefert. Dies ist
**kein** Legacy-Fallback -- es ist eine legitime Normalisierung von
LLM-zitiertem Button-Text. In der Spec als kanonisches Matcher-Verhalten
dokumentieren.

**Aufwand.** ~1h, nur Dokumentation.

---

## Nicht im Scope von v2.2 (verschoben auf v2.3+)

- Komponierbare Rollenhierarchien (`role:'tab.primary'` vs.
  `role:'tab.secondary'`): wünschenswert, aber kein konkreter Auslöser.
- Manifest Hot-Reload: weiterhin selten benötigt; aktuelles Seiten-Reload
  ist ausreichend.
- Mehrsprachige Label-Suche über alle 10 Locales gleichzeitig
  (der Matcher iteriert sie heute seriell, was für ~20 Tabs pro Plugin
  problemlos ist).

---

## V23-01 -- Field-Editor-Primitive (Preview ausgeliefert)

**Problemklasse.** Voice-Runner und Agents haben keine allgemeine Möglichkeit,
Text in einem `<input>` oder `<textarea>` feingranular zu bearbeiten --
sie können nur `NAC.fill(id, value)` aufrufen, was den gesamten Inhalt ersetzt.
Reale Aufgaben (Grammatik in einem Absatz korrigieren, nur die Selektion
ersetzen, einen Satz per KI verbessern) erfordern feinere Verben. Heute
implementiert jeder Anwender, der das benötigt, seine eigene Lösung.

**Lösung.** Eine neue Runtime-Primitive `NAC.edit_field(nac_id)` öffnet ein
Modal, das die Bearbeitungsoberfläche besitzt und ein eigenes Plugin
`nac_editor` mit 8 kanonischen Verben registriert:

| Verb | Beschreibung |
|------|-------------|
| `select_word` | Wort an der Caret-Position auswählen |
| `select_sentence` | Satz an der Caret-Position auswählen |
| `select_all` | Gesamten Text auswählen |
| `replace` | Selektion durch angegebenen Text ersetzen |
| `delete_selection` | Aktuelle Selektion löschen |
| `ai_correct_syntax` | Aktuellen Wert per POST an das Chat-Backend senden und durch KI-korrigierte Version ersetzen |
| `save` | In das Quellfeld zurückschreiben, Modal schließen |
| `cancel` | Verwerfen, Modal schließen |

Das Manifest des Modals wird idempotent registriert (mehrere
`edit_field`-Aufrufe teilen sich ein `nac_editor`-Plugin). Alle Verben
enthalten `label_i18n` für alle 10 Locales.

**Status:**
- Runtime: AUSGELIEFERT 2026-05-10 in `js/nac.js` (Funktionen
  `edit_field` + `_editorRegisterManifest` + ack-emittierende
  Modal-Handler).
- Demo: AUSGELIEFERT 2026-05-11 unter `example-v23-editor.php`
  (3 editierbare Felder + Live-Verb-Zähler, verdrahtet mit
  `nac:action:succeeded`).
- Tests: AUSGELIEFERT 2026-05-11 unter
  `packages/nac/test/v23-editor.mjs` (8/8 PASS): exists +
  invalid id throws + invalid role throws + mounts modal +
  registers plugin + idempotent + cancel closes + save
  closes.
- Spec: Abschnitt wird im Rahmen des v2.3-GA-Zyklus als
  Abschnitt 13 in SPEC.md ergänzt.

**Aufwand bis GA.** Über den bereits enthaltenen Stand hinaus:
Überprüfung der nativen Locale-Labels für ja/zh/ar/hi (~2h),
Playwright-E2E-Visual-Spec (~3h), Spec-Text in SPEC.md (~2h).

---

## Wie Einträge von diesem Dokument in die Spec wandern

1. Runtime-Änderung implementieren und hinter einem Feature-Flag ausliefern.
2. Demos aktualisieren, sodass sie die neue strenge Validierung bestehen.
3. Mindestens einen Release-Zyklus lang in Produktion einlaufen lassen,
   mit Flag-Standard auf `warn` (nicht werfend).
4. Regel in `docs/spec.md` übernehmen und Standard in der nächsten
   Minor-Version auf `error` (werfend) anheben.
5. Eintrag aus dieser Roadmap streichen und einen einzeiligen Eintrag
   in `docs/CHANGELOG.md` ergänzen.

---

*This is a machine translation of the canonical English
version at `/nac-spec/docs/NAC_V22_ROADMAP.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
