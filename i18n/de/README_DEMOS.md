---
translation_source: README_DEMOS.md
translation_source_hash: 0f488dd749283f4f2e03f0e431de47d7007818c6745ce1ce993014bdf9839480
translation_quality: machine_v1
translation_lang: de
translation_date: 2026-05-11T13:00:46.836773+00:00
---

# NAC3 Live-Demos auf yujin.app/nac-spec/

**Spec-Version:** 2.2 stable (+ v2.3 Interop-Vorschau).

**NAC3** = **Native Agent Contract**. Die Spec, die es Web-UIs ermöglicht, von KI-Assistenten, Voice-Runnern und Accessibility-Tools gesteuert zu werden – ohne appspezifischen Glue-Code.

Drei Demos laufen nebeneinander. Jede hat einen klar abgegrenzten Zweck; bitte nicht verwechseln.

| Datei | Version | Zweck |
|---|---|---|
| `example.php` | v1.9 stable | Die kanonische Demo für NAC3 v1.9. 27 Widgets (Chat, Kalender, Autopilot, Modals, Tabs, Charts usw.). Zeigt die vollständige v1.9-Funktionsfläche in produktionsnaher UI. **Unverändert.** |
| `example-v20-primitives-showcase.php` | v2.0-rc4 | **Didaktische Showcase** der 8 v2.0-Primitives + HMAC + isTrusted + i18n-Contract. 8 Abschnitte, einer pro Primitive. Nützlich für Reviewer und Adopter, die jedes neue Primitive isoliert verstehen möchten. **KEINE Migration von example.php.** |
| `example-v20-full.php` | v2.0-rc4 | **Brownfield-Migration** von `example.php` auf NAC3 v2.0 strict. Dieselben 27 Widgets, dasselbe HTML, dieselben Handler – mit darübergelegtem v2.0-Layer via ~80 Zeilen Setup-Code. Zeigt, dass reale Adoption KEIN Neuschreiben jedes Widgets erfordert. |

## Vergleich nebeneinander

`example.php` und `example-v20-full.php` in zwei Tabs öffnen.

### Was identisch ist

- HTML-Markup (jedes `<article data-nac-plugin="X">`, jede
  `data-nac-id`, jede i18n-Katalog-Referenz, jeder Handler)
- Visuelles Erscheinungsbild (gleiches Layout, gleiche Widgets, gleiche Interaktionen)
- v1.9-Referenz-Runtime (`js/nac.js`) wird auf dieselbe Weise geladen
- Bestehende `data-i18n-key`-Katalog-Referenzen

### Was in der v2.0-full-Version anders ist

1. **Header-Docstring** erklärt explizit, dass es sich um eine Brownfield-Migration-Showcase handelt.
2. **Ein zusätzliches Script-Tag**: `js/nac-v2-extensions.js`, geladen nach `nac.js` und vor `example.js`.
3. **Ein zusätzlicher Setup-Block** (~80 Zeilen am Ende der Seite), der:
   - Einen hierarchischen Scope-Baum aus bestehenden
     `data-nac-plugin`-Attributen aufbaut (jedes Plugin wird zu einem Scope
     unter `demo.shell`).
   - `NAC.set_provenance_secret()` aufruft, um HMAC-Signierung zu aktivieren.
   - `NAC.setTenantPrefix('demo')` aufruft, um Multi-Tenant zu demonstrieren.
   - `NAC.captureEphemeral()` Ringpuffer für Toasts startet.
   - `NAC.autoRegister.watch()` auf dem Cards-Container aufruft.
4. **Ein zusätzliches UI-Panel** (`#v20-panel`, fest unten rechts),
   das live `describe_v2()`, `validate_global_v2()`, HMAC-Sign-Demo
   und den isTrusted-Unterscheidungs-Button bereitstellt.

Das ist das gesamte Delta. Reale Adopter übernehmen dieses Muster unverändert.

## Bewertungshinweise

Für Peer-Reviewer von NAC3 v2.0:

1. Zuerst `example.php` öffnen. Bestätigen, dass die v1.9-Demo wie gewohnt funktioniert.
2. `example-v20-full.php` öffnen. Bestätigen, dass die v1.9-Funktionalität (Chat, Kalender, Autopilot usw.) IDENTISCH funktioniert.
3. Das v2.0-Panel öffnen (untere rechte Ecke). Jeden Button anklicken:
   - `describe_v2()` – den aus den Brownfield-Plugin-Attributen aufgebauten Scope-Baum ansehen.
   - `validate_global_v2()` – Befunde ansehen (wahrscheinlich nur Warnungen, falls der i18n-Katalog Lücken hat).
   - `sign as agent` – erzeugte HMAC-Signatur ansehen.
   - `click=trusted` / `.click()=fake` – isTrusted-Unterscheidung in Aktion sehen.

Für Adopter:

Den Setup-Block aus `example-v20-full.php` als Vorlage verwenden. Den Scope-Baum an die Plugin-Struktur der eigenen App anpassen. Der Großteil der Arbeit besteht darin, die eigene Scope-Hierarchie zu identifizieren; der Rest ist mechanisch.

## Querverweise

- NAC3 Spec: https://github.com/pkuschnirof/nac-spec
- v1.9-Release: Tag `v1.9.0`
- v2.0-Release-Kandidat: `2.0.0-rc4` auf `main`
- Round-3-Peer-Review-Verlauf: `docs/PEER_REVIEW.md`

---

*This is a machine translation of the canonical English
version at `/nac-spec/README_DEMOS.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
