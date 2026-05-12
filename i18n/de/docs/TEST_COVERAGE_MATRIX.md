---
translation_source: docs/TEST_COVERAGE_MATRIX.md
translation_source_hash: 378d7bf89e65b07e54f5d5dc1c62938accfe383e903468a4df028a3e2936f48d
translation_quality: machine_v1
translation_lang: de
translation_date: 2026-05-11T14:46:30.277183+00:00
---

# NAC3 -- Test Coverage Matrix (automatisch + manuell)

**Spec-Version:** 2.2 + v2.3 Vorschau.
**Erstellt:** 2026-05-11.
**Maßgeblich für:** das Yujin-Referenz-Repository
`yujinapp/nac-spec` auf `main`.

Diese Matrix listet ALLE Artefakte im NAC3-Ökosystem und
dokumentiert deren Abdeckung durch automatisierte Tests sowie das
manuelle Verifikations-Gate (die „Human OK"-Checkliste).

Übernehmer: Kopieren Sie diese Matrixstruktur für Ihre eigene App. Ersetzen
Sie die Spalten durch Ihre Artefakte; behalten Sie dieselbe Tiefe pro Zeile.

---

## Legende

| Symbol | Bedeutung |
|--------|-----------|
| AUTO | Durch automatisierte Tests abgedeckt (Playwright / Node-seitige Suite) |
| MAN  | Erfordert manuelle Verifikation (Browser-Darstellung, Sprachgeste, subjektive UX) |
| BOTH | Auto-abgedeckt für Invarianten + manuell verifiziert für UX |
| --   | Keine Abdeckung geplant (bewusste Entscheidung) |
| TBD  | Abdeckung geplant, aber noch nicht umgesetzt |

---

## 1. Laufzeit-Artefakte

| Artefakt | Auto-Abdeckung | Manuelles Gate | Hinweise |
|----------|----------------|----------------|----------|
| `js/nac.js` (v1.9 Basis + v2.0 + v2.1) | AUTO 95% | MAN (Cross-Browser-Smoke) | smoke + v22 + stage4 decken die Write-API ab; manuell = mindestens einmal pro Release in Firefox + Safari öffnen |
| `js/nac-v2-extensions.js` | AUTO 90% | MAN (autoRegister.watch auf einem frischen DOM) | stage4 dt_* + v22 partiell; manuell = zur Laufzeit ein neues Plugin via autoRegister einbinden |
| `js/nac-chat-client.js` | AUTO 95% | MAN (echtes Mikrofon STT) | stage1-audio mockt SpeechRecognition; manuell = Mikrofon in der Live-Demo drücken + pro Locale einen Prompt sprechen |
| `js/nac-mcp-interop.js` (v2.3 Vorschau) | AUTO 100% | MAN (Cross-Origin-Peer-Roundtrip) | v23-interop deckt das lokale Seitenszenario ab; manuell = gegen einen echten entfernten NAC3-Peer über HTTPS testen |

## 2. NPM-Paket

| Artefakt | Auto-Abdeckung | Manuelles Gate | Hinweise |
|----------|----------------|----------------|----------|
| `@nac3/runtime` Build (dist/ ESM + CJS + d.ts + CLI) | AUTO 100% | MAN (`npm install` in einem frischen Verzeichnis) | smoke.mjs 36 Prüfungen; manuell = npm pack + install + import in einem leeren Node-Projekt verifizieren |
| `@nac3/runtime/extensions` Subpfad | AUTO 100% | -- | smoke bestätigt Dateien + d.ts-Präsenz |
| `@nac3/runtime/chat-client` Subpfad | AUTO 100% | -- | smoke bestätigt Dateien + d.ts-Präsenz |
| CLI `npx @nac3/runtime validate` | AUTO 100% | MAN (gegen ein extern vom Team erstelltes Projekt ausführen) | smoke führt die CLI gegen das demos-Verzeichnis aus; manuell = gegen das eigene Repo des Kunden ausführen, bevor dieser ausliefert |

## 3. Demos (live unter yujin.app/nac-spec/)

| Demo | Auto-Abdeckung | Manuelles Gate | Hinweise |
|------|----------------|----------------|----------|
| `index.html` (Landing) | BOTH | MAN (Autopilot-Tour + Chat-Senden) | Playwright 01-landing.spec.ts verifiziert die Oberfläche; manuell = Autopilot in einem echten Browser ausführen, Narration hörbar |
| `example.php` (v1.9 Referenz) | AUTO | MAN (27 Widgets durchklicken) | Playwright 02-demo-v19 prüft den Start; manuell = alle 27 Widgets durchgehen, keine Konsolenfehler |
| `example-v20-full.php` (Brownfield) | AUTO | MAN (v20-Panel describe_v2 / validate_global_v2 Schaltflächen) | Playwright 03-demo-v20 deckt Panel + bindAction-Ack ab; manuell = jede Panel-Schaltfläche klicken + Ausgabe prüfen |
| `example-v20-primitives-showcase.php` | -- | MAN (didaktischer Durchgang pro Primitive) | Rein didaktische Demo; manuell = die 8-Primitive-Tour |
| `example-v21-data-table.php` | AUTO | MAN (Chat-Sprache mit Mikrofon) | Playwright 04-demo-v21 deckt dt_state + tab.permissions ab; manuell = Sprach-Mikrofon verwenden, LLM-Dispatch korrekt beobachten |
| `example-v22-interop.php` (v2.3 Vorschau) | AUTO | MAN (die 4 CTAs der Reihe nach verwenden) | Playwright 05-demo-v22-interop End-to-End; manuell = der 4-Schaltflächen-Ablauf mit Augenkontakt auf dem Bildschirm |
| `demos/react/` (kompilierte Fallstudie) | AUTO | MAN (Chat-gesteuert hinzufügen/löschen) | Playwright 06-demo-react deckt Mount + Hinzufügen ab; manuell = „agrega leche" per echtem Mikrofon senden, React-State-Update beobachten |
| `demos/angular/` (kompilierte Fallstudie) | AUTO | MAN (Chat-gesteuert hinzufügen/löschen) | Playwright 07-demo-angular deckt Mount + Hinzufügen ab; manuell = wie React |

## 4. Dokumentation

| Dokument | Auto-Abdeckung | Manuelles Gate | Hinweise |
|----------|----------------|----------------|----------|
| `SPEC.md` (v2.2 kanonisch) | -- | MAN (PR-Review durch einen Maintainer) | Spec ist Prosatext; kein Auto-Test möglich. Jedes Wort wird manuell geprüft |
| `ABOUT.md` | -- | MAN (PR-Review) | Gleich |
| `CONTRIBUTING.md` | -- | MAN (PR-Review) | Gleich |
| `SECURITY.md` | -- | MAN (PR-Review) | Gleich. Zusätzlich vierteljährliches erneutes Lesen des Bedrohungsmodells |
| `README_DEMOS.md` | -- | MAN | Manuelle Link-Prüfung |
| `docs/NAC_V22_ROADMAP.md` | -- | MAN | Aktualisierung + Review pro Release |
| `docs/NAC_TEST_MANUAL.md` | AUTO (Links) | MAN (PR-Review) | test-launch.sh Schicht 3 verifiziert das Vorhandensein aller 11 Dokumente; manuell = auf Korrektheit lesen |
| `docs/COVERAGE_REPORT_2026_05_10.md` | -- | MAN (pro Release neu erstellen) | Dies ist selbst der Coverage-Nachweis; wird pro Release manuell geschrieben |
| `docs/NAC_INTEROP_MCP.md` | -- | MAN | Spec-Vorschlag, manuell geprüft |
| `docs/NAC_LAUNCH_DIFFUSION.md` | -- | MAN | Internes Playbook |
| `docs/CASE_STUDIES_DISCOVERY.md` | -- | MAN | Bug-Postmortems; manuell gepflegt |
| `docs/LAUNCH_PLAN_2026_05_10.md` | -- | MAN (historisch) | Historischer Nachweis |
| `docs/TEST_COVERAGE_MATRIX.md` (diese Datei) | AUTO (Links) | MAN | Pro Release aktualisieren |
| `docs/VOICE_CHAT_ERROR_ANALYSIS_2026_05_09.md` | -- | MAN | Historische Fehleranalyse |
| `docs/HUMAN_OK_CHECKLIST.md` | -- | MAN (Pablo führt sie durch) | Die Checkliste selbst; Pablo führt sie aus |

## 5. Adoptions-Guides

| Guide | Auto-Abdeckung | Manuelles Gate | Hinweise |
|-------|----------------|----------------|----------|
| `guides/REACT.md` | -- | MAN (PR-Review + Adopter-Feedback) | Hello-World-Snippet sollte weiterhin kompilieren; manuell = jährliche Rebuild-Prüfung |
| `guides/ANGULAR.md` | -- | MAN (PR-Review) | Gleich |
| `guides/LLM_WIRING.md` | -- | MAN (PR-Review) | Das Node-Referenz-Backend funktioniert; manuell = gegen die Live-Spec ausführen |
| `guides/AI_PLAYBOOK_NEW_PROJECT.md` | -- | MAN (PR-Review) | Schritt-Assertions sollten ausführbar bleiben |
| `guides/AI_PLAYBOOK_MIGRATION.md` | -- | MAN (PR-Review) | Gleich |
| `guides/IMPACT_TESTING.md` | -- | MAN (PR-Review) | Impact-Aussagen; Zahlen vierteljährlich aktualisieren |
| `guides/IMPACT_RPA.md` | -- | MAN (PR-Review) | Gleich |
| `guides/RPA_UIPATH.md` | -- | MAN (Beispiel-Workflow einmal pro Release ausführen) | Manuell = InvoiceFromCSV.xaml ausführen |
| `guides/RPA_AUTOMATION_ANYWHERE.md` | -- | MAN | Gleiche Struktur |
| `guides/RPA_BLUE_PRISM.md` | -- | MAN | Gleiche Struktur |
| `guides/RPA_PLAYWRIGHT.md` | AUTO (Referenz-Suite) | MAN (PR-Review) | Muster werden durch `tests/e2e-nac/specs/` ausgeführt; manuell = einmal pro Release lesen |

## 6. Test-Suiten

| Suite | Auto-Abdeckung | Manuelles Gate | Hinweise |
|-------|----------------|----------------|----------|
| `packages/nac/test/smoke.mjs` | AUTO (selbst) | MAN (Bestehensquote prüfen) | 36 Prüfungen; manuell = Anzahl einmal pro Release ansehen |
| `packages/nac/test/v22.mjs` | AUTO (selbst) | -- | 14 Unit-Tests |
| `packages/nac/test/v23-interop.mjs` | AUTO (selbst) | -- | 14 Unit-Tests |
| `packages/nac/test/stage1-audio.mjs` | AUTO (selbst) | MAN (Corpus pro Locale neu erstellen) | 33 Prüfungen; manuell = eine Auswahl des TTS-Corpus anhören, Hörbarkeit verifizieren |
| `packages/nac/test/stage2-disambiguation.mjs` | AUTO (selbst) | -- | 31 Prüfungen |
| `packages/nac/test/stage3-backend.mjs` | AUTO (selbst, live) | MAN (LLM-Antworten prüfen) | 45 Prompts x 10 Locales; manuell = LLM-Drift bei 2 zufälligen Prompts stichprobenartig prüfen |
| `packages/nac/test/stage4-calls.mjs` | AUTO (selbst) | -- | 31 Prüfungen |
| `packages/nac/test/stage6-ack.mjs` | AUTO (selbst) | -- | 16 Prüfungen |
| `packages/nac/test/stage6b-longtail.mjs` | AUTO (selbst) | -- | 14 Prüfungen |
| `tests/e2e-nac/specs/*.spec.ts` | AUTO (selbst) | MAN (visuelle Prüfung eines headed Runs einmal pro Release) | 16 Specs; manuell = einmal mit `--headed` ausführen und visuell prüfen |
| TTS-Corpus (30 MP3-Dateien) | AUTO (Vorhandensein + Größe) | MAN (1 pro Locale anhören) | Manuell = 10 Dateien stichprobenartig prüfen, Hörbarkeit bestätigen, kein Datenmüll |
| `tools/nac/test-launch.sh` | AUTO (selbst) | -- | Orchestrator |
| `tools/nac/discovery-loop.sh` | AUTO (selbst) | -- | Discovery + Fix-Schleife |

## 7. Fallstudie-Pakete

| Paket | Auto-Abdeckung | Manuelles Gate | Hinweise |
|-------|----------------|----------------|----------|
| `packages/nac-react-demo/` Quellcode | AUTO (Build + Playwright) | MAN (visuell auf dem deployte dist) | Vite-Build sauber; Playwright deckt todos + chat + autopilot ab |
| `packages/nac-react-demo/` deploytes dist | AUTO | MAN (im Inkognito-Modus öffnen und durchgehen) | Manuell = der menschliche Durchgang unter /demos/react/ |
| `packages/nac-angular-demo/` Quellcode | AUTO | MAN | Gleiche Struktur |
| `packages/nac-angular-demo/` deploytes dist | AUTO | MAN | Gleich |

## 8. Übergreifende Aspekte

| Aspekt | Auto-Abdeckung | Manuelles Gate | Hinweise |
|--------|----------------|----------------|----------|
| i18n-Katalog-Vollständigkeit | AUTO (Validator) | MAN (Muttersprachler-Review pro Locale) | Strict-Mode-Validator meldet fehlende Schlüssel; Muttersprachler prüft stichprobenartig, ob die Strings kulturell sinnvoll sind |
| HMAC-Manifest-Signierung | AUTO (Unit) | MAN (Multi-Tenant-Deploy-Smoke) | Unit-Tests signieren + verifizieren; manuell = Produktions-Smoke gegen den Secret-Distribution-Flow |
| isTrusted-Gating | AUTO (Unit) | MAN (echter vs. synthetischer Klick im Vergleich) | v22-Unit deckt das Flag ab; manuell = das Schaltflächenpaar istrusted_real / istrusted_fake auf example-v20-full.php |
| Cross-Origin-Interop (v2.3) | AUTO (Mock) | MAN (echter Peer mit echtem Bearer-Token) | v23-interop verwendet In-Page-Mock; manuell = mindestens ein Cross-Origin-Test, bevor v2.3 als GA erklärt wird |
| Deployment auf yujin.app | AUTO (Push -> Auto-Deploy) | MAN (URLs auf 200 + korrekten Inhalt prüfen) | GoDaddy deployt automatisch; manuell = alle kritischen URLs nach jedem main-Push per curl prüfen |
| Echte Browser-Audio-Wiedergabe | -- | MAN (Mikrofon + Lautsprecher-Test) | Web Speech API benötigt echte Hardware; manuell = Mikrofon in der Live-v21-Demo drücken, pro Locale einen Prompt sprechen |

## Zusammenfassung -- gewichtete Abdeckung nach Kategorie

| Kategorie | AUTO | MAN | BOTH | Abdeckungsqualität |
|-----------|------|-----|------|--------------------|
| Laufzeit-Artefakte | 4 | 0 | 0 | AUSGEZEICHNET (Ø 95% auto) |
| NPM-Paket | 4 | 0 | 0 | AUSGEZEICHNET (100% auto) |
| Demos | 6 | 1 | 1 | GUT (auto für Invarianten, manuell für UX) |
| Dokumentation | 1 | 14 | 0 | ERWARTET (Docs werden geprüft, nicht unit-getestet) |
| Adoptions-Guides | 0 | 10 | 0 | ERWARTET |
| Test-Suiten | 13 | 4 | 0 | AUSGEZEICHNET |
| Fallstudie-Pakete | 2 | 2 | 0 | GUT (auto + manuelle Sichtprüfung) |
| Übergreifende Aspekte | 4 | 2 | 0 | GUT |
| **GESAMT** | **34** | **33** | **1** | **AUSGEZEICHNET** |

## Verwendung dieser Matrix

### Pro Release

1. Spec-Version + Referenz-Suite-Version taggen.
2. `bash tools/nac/test-launch.sh` ausführen -- jede AUTO-Zeile ist ein Gate.
3. Die MAN-Spalte durcharbeiten -- die [Human OK
   Checkliste](HUMAN_OK_CHECKLIST.md) ist die ausführbare Form davon.
4. Das COVERAGE_REPORT_<Datum>.md mit den Laufergebnissen aktualisieren.
5. Diese Matrix anpassen, falls sich die Artefaktlandschaft verändert hat.

### Pro Übernehmer

Kopieren Sie diese Matrixstruktur für Ihre eigene App. Ersetzen Sie die
Artefaktnamen; behalten Sie dieselbe Struktur. Die Disziplin ist dieselbe:
Jedes Artefakt erhält ein explizites Auto- und manuelles Gate.

### Anti-Pattern

Markieren Sie ein Artefakt NICHT als „AUTO", wenn der Test nur das
Vorhandensein einer Datei prüft. AUTO bedeutet, dass der Test das Verhalten
ausübt. Datei-Präsenz-Prüfungen gehören in den Harness (test-launch.sh),
nicht in die Artefakt-Matrix.

## Siehe auch

- [NAC_TEST_MANUAL.md](NAC_TEST_MANUAL.md) -- das Playbook, aus dem
  diese Matrix abgeleitet ist.
- [HUMAN_OK_CHECKLIST.md](HUMAN_OK_CHECKLIST.md) -- die ausführbare
  Form der MAN-Spalte.
- [COVERAGE_REPORT_2026_05_10.md](COVERAGE_REPORT_2026_05_10.md)
  -- die tatsächlichen Laufergebnisse für das aktuelle Release.

## Lizenz

Apache-2.0.

---

*This is a machine translation of the canonical English
version at `/nac-spec/docs/TEST_COVERAGE_MATRIX.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
