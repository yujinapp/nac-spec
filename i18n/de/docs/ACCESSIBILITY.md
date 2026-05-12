---
translation_source: docs/ACCESSIBILITY.md
translation_source_hash: 615f9c5a447d95c7aee985d926f7b29377bed44dc959fd07a966fd41fa86a03b
translation_quality: machine_v1
translation_lang: de
translation_date: 2026-05-11T14:39:51.431256+00:00
---

# NAC3 -- Barrierefreiheitsverpflichtung

**Spec-Version:** 2.2 stable (+ v2.3 Interop-Vorschau).
**Zuletzt geprüft:** 2026-05-11.

NAC3 wurde entwickelt, um Web-UIs für Maschinen adressierbar zu machen. Die gleiche Eigenschaft, die eine UI für einen KI-Agenten navigierbar macht, macht sie auch für einen Screenreader, ein Switch-Gerät, einen Eye-Tracker und eine Sprachsteuerung navigierbar. NAC3 ist konstruktionsbedingt ein Barrierefreiheits-Grundbaustein – und Yujin verpflichtet sich, das so zu halten.

---

## Die Verpflichtung

1. **WCAG 2.1 Level AA** Konformität ist die Mindestanforderung für jedes Yujin-Produkt, das auf NAC3 aufbaut (`yujin-pilot`, `yujin-forge`, die Referenz-Demos unter yujin.app/nac-spec/, yujin.app/registry).
2. **AAA wo möglich** für die Bereiche, in denen Barrierefreiheit am wichtigsten ist: Chat-Panel, Sprachaktivierung, Ersteinrichtung, Fehlermeldungen.
3. **Keine separate „barrierefreie Edition"**. Barrierefreiheit ist im Hauptprodukt enthalten, zum gleichen Preis, im gleichen Release-Rhythmus. Separate Editionen stigmatisieren Nutzer und veralten.
4. **Kein „Barrierefreiheit später"**. Jedes Release setzt die Barrierefreiheitsprüfungen voraus, die in [HUMAN_OK_CHECKLIST.md](HUMAN_OK_CHECKLIST.md) Abschnitt 8.6 und im neuen Screenreader-Smoke-Abschnitt (Track G7) dokumentiert sind.

---

## Unterstützte assistive Technologien

Die Referenzimplementierungen werden getestet mit:

| AT-Kategorie | Geprüfte Tools |
|--------------|----------------|
| Screenreader | NVDA (Windows), JAWS (Windows), VoiceOver (macOS, iOS) |
| Sprachsteuerung | Yujin Pilot, Apple Voice Control, Windows Speech Recognition, Dragon NaturallySpeaking |
| Switch-Zugang | iOS Switch Control, Android Switch Access |
| Eye-Tracking | Tobii Dynavox |
| Vergrößerung | Browser-Zoom bis 200%, ZoomText, macOS Zoom |
| Nur Tastatur | Vollständige Tastaturnavigation, sichtbarer Fokus, keine Zeitlimits |

Jede AT, die den standardmäßigen Accessibility-Tree (ARIA, accessibilityRole, accessibilityLabel) nutzt, profitiert von NAC3, da NAC3-Elemente dieselben semantischen Informationen tragen, die von der AT-Schicht verwendet werden.

---

## Was NAC3 zur Barrierefreiheit beiträgt (Mechanismus)

- **Stabile Bezeichner (`data-nac-id`)**: Screenreader und Switch-Zugang sind nicht von der visuellen Position abhängig. Der Bezeichner überlebt Redesigns – und damit auch das Muskelgedächtnis von AT-Nutzern.
- **Kanonische Rollen (`data-nac-role`)**: Die Rollen-Enumeration (action, field, tab usw.) bildet sich 1:1 auf ARIA-Rollen ab. AT-Nutzer hören semantisch korrekte Ansagen.
- **Manifest-Verben (`label_i18n`)**: Jede Aktion hat eine lokalisierte Bezeichnung in 10 Sprachen. Sprachsteuerungsnutzer sprechen das Verb; das Manifest löst es auf.
- **Deterministische Bestätigungsereignisse (`nac:action:succeeded`)**: AT-Nutzer hören eine Bestätigung, dass eine Aktion abgeschlossen wurde – keine Vermutung anhand von UI-Animationen.
- **Strikte Validierung (v2.2)**: Erkennt Abweichungen zwischen Manifest und DOM, bevor sie AT-Nutzer erreichen.

---

## Was NAC3 NICHT löst

- **Native iOS/Android-Anwendungen**: Die v2.2-Spec deckt nur Web + WebView ab. Natives Mobile ist auf der v3.0-Roadmap.
- **Visuelle Darstellung**: NAC3 ist strukturell. Kontrast, Schriftgröße und Fokusindikatoren liegen in der Verantwortung der Implementierung (Yujin-Tokens decken dies in unseren Referenzimplementierungen ab).
- **Kognitive Last komplexer Abläufe**: NAC3-IDs machen einen schlecht gestalteten Workflow nicht einfach. Gute Informationsarchitektur und verständliche Texte tun das.
- **Untertitelung von Multimedia**: Audio-/Video-Inhalte müssen vom Herausgeber untertitelt werden. NAC3 stellt Hooks bereit, aber nicht den Inhalt.

---

## Melden eines Barrierefreiheitsproblems

E-Mail an `accessibility@yujin.app` (oder was auch immer an den Maintainer weitergeleitet wird). Antwort-SLA: 5 Werktage für die Ersteinschätzung, kein SLA für die Behebung, da jeder Fall anders ist. Probleme werden öffentlich im `nac-spec`-Repository mit dem Label `a11y` verfolgt.

Bei sicherheitsrelevanten Problemen (z. B. AT-Umgehung von Bestätigungsdialogen) bitte `SECURITY.md` befolgen.

---

## Roadmap

| Track | Beschreibung | Ziel |
|-------|--------------|------|
| G1 | WCAG 2.1 AA Audit + Behebung (Forge + Pilot UI) | Vor Forge/Pilot v1 |
| G2 | Sprachgesteuerter Einrichtungsassistent (Forge + Pilot Erststart) | Forge/Pilot v1 |
| G3 | NAC3-Konformität auf jeder Dokumentationsseite | NAC3 v2.2 Launch |
| G4 | Audioversion (.mp3) jedes Leitfadens | NAC3 v2.3 |
| G5 | Konversationelles Tutorial unter yujin.app/learn | NAC3 v2.3 |
| G6 | Leicht verständliche Parallelversion der wichtigsten Leitfäden | NAC3 v2.3 |
| G7 | Screenreader-Smoke-Test in HUMAN_OK_CHECKLIST | NAC3 v2.2 Launch |
| G8 | Echtes Beta-Programm mit Nutzern mit Behinderungen | Vor Forge/Pilot v1 |
| G9 | Diese Erklärung, öffentlich + verlinkt von jeder Seite | NAC3 v2.2 Launch |
| G10 | Externer zertifizierter Audit | Vor Forge/Pilot 1.0 kommerziell |

---

## Warum wir dies veröffentlichen

Zwei praktische Gründe jenseits ethischer Überlegungen:

1. **EU Accessibility Act (EAA)** trat im Juni 2025 für B2C-Dienste in Kraft. Mit Forge erstellte Apps sind standardmäßig NAC3-konform und erfüllen die EAA-Anforderungen näher als Wettbewerber.
2. **US ADA Title III-Klagen wegen Web-Apps** stiegen um 320 % im Jahresvergleich. Enterprise-Kunden achten darauf. NAC3 + Yujins Compliance-Haltung reduziert deren rechtliches Risiko.

NAC3 ist kein „offener Standard mit Barrierefreiheit als Bonus". NAC3 ist „der einzige universelle Web-Automatisierungsvertrag, der konstruktionsbedingt barrierefreiheitsnativ ist". Das werden wir so halten.

---

## Siehe auch

- [SPEC.md](../SPEC.md) -- der kanonische Vertrag.
- [HUMAN_OK_CHECKLIST.md](HUMAN_OK_CHECKLIST.md) -- enthält den Screenreader-Smoke-Abschnitt.
- [SECURITY.md](../SECURITY.md) -- Sicherheitsmodell, einschließlich AT-bezogener Aspekte.

## Lizenz

Dieses Dokument steht unter Apache-2.0. Die Implementierungen, auf die es sich verpflichtet, stehen unter MIT (Runtime) / Apache-2.0 (Spec) / proprietär (Forge, Pilot).

---

*This is a machine translation of the canonical English
version at `/nac-spec/docs/ACCESSIBILITY.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
