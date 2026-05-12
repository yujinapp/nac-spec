---
translation_source: docs/NAC_LAUNCH_DIFFUSION.md
translation_source_hash: cbdf7b9e5ec3ed43a39111aab16fbe59c222a05a835429ea43148036320fc5cf
translation_quality: machine_v1
translation_lang: de
translation_date: 2026-05-11T14:51:04.671750+00:00
---

# NAC3 Launch-Diffusionsplan

Ein praktisches Playbook, um NAC3 zu den Menschen zu bringen, die es nutzen sollten. Verfasst am 2026-05-10 für den v2.2 / v2.3-preview Launch.

## Was wir veröffentlichen

- **Spec:** v2.2 stabil, v2.3 Preview (Field-Editor-Primitive).
- **Runtime:** `@nac3/runtime@2.2.0` auf npm (ESM + CJS + d.ts + CLI).
- **Demos:** vier Live-Demos unter yujin.app/nac-spec/.
- **Adoptionsleitfäden:** React + Angular + LLM-Anbindung.
- **Fallstudien:** funktionierende Vite + React 18 und Angular 17 Apps in
  `packages/nac-react-demo` + `packages/nac-angular-demo`.
- **Brownfield-Migrationsstory:** das Yujin CRM selbst, dokumentiert
  in pkuschnirof/yujin docs/MIGRATION_FROM_RPAFORCE.md.
- **NAC-3-Konformität:** die Landing Page selbst ist NAC-3-konform
  (Manifest + Chat + Autopilot + isTrusted-aware).

## Messaging

### One-Liner

> **NAC3 -- die kleine öffentliche Spec, mit der Web-UIs von KI-Agenten,
> Voice-Runnern und Accessibility-Tools gesteuert werden können, ohne
> app-spezifischen Klebe-Code.**

### Three-Liner

> NAC3 ist das, was ARIA geworden wäre, wenn es 2026 mit LLMs im Blick
> entworfen worden wäre. Versehe deine bestehende UI mit drei HTML-Attributen;
> die Runtime löst Namen auf, dispatcht Klicks, emittiert Completion-Events,
> übernimmt die Lokalisierung und liefert Provenance. Apache-2.0, npm install,
> keine Änderungen am Build-Schritt.

### 30-Sekunden-Pitch

> Voice-Assistenten, LLM-Chat-Agenten und Accessibility-Tools stehen alle
> vor demselben Problem: Sie brauchen stabile Namen für die Dinge, auf die
> sie reagieren sollen. CSS-Selektoren brechen. ARIA hört bei „das ist ein
> Button" auf. Jedes Team baut dieselbe Infrastruktur von Grund auf neu.
>
> NAC3 ist der kleine Vertrag, der das behebt. Du fügst `data-nac-id`,
> `data-nac-role`, `data-nac-action` zu den Elementen hinzu, die ein Agent
> steuern soll; die Runtime kümmert sich um den Rest. Es gibt eine
> funktionierende v2.2-Spec, ein stabiles npm-Paket, React + Angular
> Leitfäden und vier Live-Demos -- darunter eine, die end-to-end mit einem
> Claude Sonnet Chat-Backend verbunden ist und mit der du jetzt sofort
> sprechen kannst.
>
> Apache-2.0. Wir haben es gebaut, weil wir ein CRM betreiben, das es
> brauchte. Jetzt kannst du es auch nutzen.

## Zielgruppen

| Zielgruppe | Kanal | Hook |
|------------|-------|------|
| React + Vue + Svelte + Angular Devs | dev.to, Hashnode, r/javascript, r/webdev | „Steuere deine bestehende React-App mit Voice in 80 Zeilen" |
| Voice + Agent Builder | r/LocalLLaMA, r/ChatGPTCoding, Agent-Builder-Discords | „Ein Standard, den die nutzerseitige Schicht von Voice-Apps bisher vermisst hat" |
| Accessibility-Advocates | r/Accessibility, a11y-Mailinglisten, A11y-Meetup-Speaker | „ARIA, entworfen 2026 mit LLMs im Blick" |
| Test/QA Engineers | r/qualityassurance, Selenium / Playwright Communities | „Stabile Selektoren, die UI-Redesigns überleben" |
| HN | news.ycombinator.com | das kanonische Show HN |
| Tech Leads + CTOs | LinkedIn, Mastodon | der „Du wirst das in 12 Monaten sowieso einbauen"-Ansatz |
| Yujin CRM Nutzer | Direkt-E-Mail + In-Product-Banner | „Dein CRM spricht NAC3 -- was das bedeutet" |

## Kanäle + Beispiel-Posts

### Show HN

- **Titel:** `Show HN: NAC -- a small public spec that lets web UIs be driven by AI agents`
- **Erste Zeile:** „We made this while building Yujin CRM and realised every team trying to ship voice/agent UI rebuilds the same plumbing."
- **Body:** Den Vertrag erklären (3 Attribute + Manifest + Events), Link zur Live-Demo, Link zur Spec, Link zum npm-Paket, Link zur React-Fallstudie. Unter 200 Wörter halten. Kommentar-Threads ziehen mehr Aufmerksamkeit als lange Posts.
- **Tag:** Dienstag oder Mittwoch, US-Morgen. Montage + Freitage meiden.
- **Follow-up:** Mindestens 4 Stunden in den Kommentaren präsent sein; jede technische Frage beantworten; auf Flame nicht eingehen.

### r/javascript

- **Titel:** `[Showoff] NAC: drive your React app with voice + chat using 3 HTML attributes`
- **Body:** Fokus auf „Was macht der React-Adopter" -- Code-Beispiele aus `guides/REACT.md`. Link zum Fallstudie-GitHub-Verzeichnis.

### r/Accessibility

- **Titel:** `NAC: a parallel layer to ARIA for AI-agent-driven UI`
- **Body:** Mit „Das ist KEIN Ersatz für ARIA, sondern ein Geschwister" einleiten -- Accessibility-Leute sind zu Recht schutzbewusst. Zeigen, wie `data-nac-role="action"` und `role="button"` koexistieren.

### dev.to

- **Titel:** `Drive any web UI by voice with @nac3/runtime`
- **Hook:** Das React-Fallstudie-Repo. Inline-Screenshots/Gifs des Chat-Panels + der Autopilot-Tour.
- **Länge:** 1500-2000 Wörter. Schritt für Schritt.

### Twitter / X

Ein 6-Tweet-Thread:

1. „Wir haben gerade NAC3 v2.2 veröffentlicht -- eine öffentliche Spec + npm-Paket, mit dem Web-UIs von KI-Agenten gesteuert werden können. Apache-2.0. (Gif der Demo)"
2. „Warum: Jedes Team, das Voice/Agent-UX baut, baut dieselbe Infrastruktur neu. CSS-Selektoren brechen. ARIA ist nicht agenten-geformt. Wir brauchten einen kleinen Vertrag."
3. „Wie klein: 3 HTML-Attribute pro Element. (Code-Screenshot)"
4. „Was du bekommst: stabile Namen, deterministische Completion-Events, 10-Locale i18n out of the box, Provenance via HMAC + isTrusted, Auto-Validierung."
5. „Live-Demo unter yujin.app/nac-spec -- vier Demos, eine davon mit einem Claude Sonnet Chat-Backend verbunden. Sprich damit."
6. „React + Angular Adoptionsleitfäden + funktionierende Fallstudien unter github.com/pkuschnirof/rpaforce-crm. Spec unter yujin.app/nac-spec/SPEC.md."

### LinkedIn

Langer Post (~600 Wörter). Den „Du wirst das in 12 Monaten sowieso einbauen"-Ansatz betonen; CTOs ansprechen, die ihre Agenten-Strategie evaluieren. Screenshot der BPMN-förmigen Autopilot-Tour einbinden.

### Mastodon

Den Twitter-Thread crossposten, knapp halten. Alt-Text bei jedem Bild angeben (ist dort wichtig).

## Demo-Gif/Video-Plan

### Gif (15 Sekunden, loopend)

Szene 1 (4s): Nutzer tippt „agrega tomar agua" in das Chat-Input der
React-Demo.
Szene 2 (3s): Das LLM löst auf; der Todo-Eintrag wird mit einem
Flash-Highlight hinzugefügt.
Szene 3 (4s): Nutzer klickt auf „tour"; Autopilot geht die Seite durch
und kommentiert.
Szene 4 (4s): Nutzer hält das Mikrofon, sagt „remove all done", Todos
werden geleert.

Gehostet als 8MB MP4 + 4MB WebP-Fallback unter
`yujin.app/nac-spec/assets/demo.{mp4,webp}`. Wird als README-Hero-Gif,
OG-Image, Twitter-Card und dev.to-Header verwendet.

### Video (90 Sekunden, Voiceover)

Auf YouTube + Vimeo veröffentlicht.
- 0:00-0:10 -- Das Problem („Voice + Agenten brauchen stabile Namen").
- 0:10-0:25 -- Der Vertrag (3 Attribute).
- 0:25-0:45 -- Adoptions-Demo (React-Fallstudie, 5 hinzugefügte Zeilen).
- 0:45-1:05 -- Steuerung via Chat + Voice + Autopilot.
- 1:05-1:20 -- Yujin CRM Brownfield-Beispiel.
- 1:20-1:30 -- „Apache-2.0, npm install @nac3/runtime, Links unten."

## Follow-up-Kadenz

| Zeitpunkt | Aktion |
|-----------|--------|
| Tag 0 | Show HN + r/javascript + Twitter-Thread + dev.to-Artikel. 4-8 Stunden auf Kommentare antworten. |
| Tag 1 | LinkedIn-Post. Auf dev.to-Kommentare antworten. Einfach umsetzbare gemeldete Issues ins GitHub-Backlog aufnehmen. |
| Tag 3 | r/Accessibility-Post + Mastodon-Crosspost. |
| Tag 7 | „Woche-1-Reflexion"-Blogpost: welches Feedback wir erhalten haben, was wir geändert haben, die wichtigsten eröffneten GitHub-Issues. |
| Tag 14 | Accessibility- / Agent-Builder-Personen, die an Tag 0 interagiert haben, mit einem „Möchtest du kurz sprechen?"-DM kontaktieren. |
| Tag 30 | Einen v2.2.x-Patch mit den am häufigsten gewünschten Community-Fixes veröffentlichen. Ankündigungspost: „Was uns 30 Tage über NAC3 gelehrt haben". |
| Tag 90 | NAC3 v2.3 erscheint (Field-Editor kanonisch, STRICT_VALIDATION standardmäßig true). Neuer Launch-Pulse, kleinerer Footprint. |

## Zu messende Metriken

- Wöchentliche npm-Downloads von `@nac3/runtime`.
- GitHub-Stars + Forks auf `pkuschnirof/rpaforce-crm` und
  `pkuschnirof/yujin`.
- Demo-Seitenaufrufe unter yujin.app/nac-spec/ (Server-Zugriffslogs).
- Anzahl eröffneter GitHub-Issues (Proxy für Engagement).
- Anzahl einzigartiger Kommentatoren über alle oben genannten Kanäle.
- Suchtrend für „Native Agent Contract" (Google Trends).

Ziele, Woche 1:
- 200 npm-Downloads
- 100 GitHub-Stars über beide Repos
- 5000 Demo-Seitenaufrufe
- 10 eröffnete Issues / Diskussionen
- 1 unaufgeforderter Blogpost von außen

Wenn wir diese Ziele um 50 %+ verfehlen, muss das Messaging überarbeitet werden; den LinkedIn + dev.to-Post-Text iterieren und an Tag 14 erneut versuchen.

## Pre-Flight-Checkliste (vor dem Veröffentlichen)

- [ ] `npm publish @nac3/runtime@2.2.0` abgeschlossen (das ist **manuell**;
      erfordert Owner-npm-Token).
- [ ] `npm install @nac3/runtime` funktioniert aus einem frischen tmp-Verzeichnis.
- [ ] Live-Demos laden ohne Konsolenfehler in Chrome + Firefox + Safari.
- [ ] `validate_global({probe: true})` gibt `[]` auf der Landing Page zurück.
- [ ] Demo-Gif wird in dev.to + Twitter-Preview-Cards korrekt gerendert.
- [ ] `LICENSE`, `CONTRIBUTING`, `SECURITY` sind alle vorhanden.
- [ ] Mindestens ein offenes GitHub-Issue mit dem Label „good first issue",
      damit Beitragende, die an Tag 1 ankommen, einen Einstiegspunkt haben.
- [ ] Pablo ist wach + bereit, 4 Stunden lang Kommentare zu beantworten.

## Anti-Ziele

Was wir NICHT tun werden:

- Werbung schalten (bis mindestens die Woche-4-Metriken vorliegen).
- ARIA, Selenium, Playwright oder einen Agenten-Anbieter schlecht reden.
  NAC3 ist additiv, nicht adversarial.
- Enterprise-Support-Verträge beim Launch versprechen (die kommen,
  nachdem wir die Support-Last kennen).
- Open-Source-Washing: Der Code IST Apache-2.0, UND die Chat-Backend-
  Referenzimplementierung ebenfalls. Wir trennen „Core" nicht von
  „Premium"-Features als Burggraben -- der Burggraben ist Hosting +
  LLM-Credits + Ops.

## Launch-Tag-Playbook

Zeitlich begrenzt, weil Pablo das alleine durchführt:

| Uhrzeit | Aktion |
|---------|--------|
| 06:00 (US ET) | Finaler Smoke-Test: `npm test` + `npx @nac3/runtime validate yujin.app/nac-spec/` + alle Demos im Inkognito-Modus öffnen. Fehler beheben. |
| 09:00 | Show HN veröffentlicht. |
| 09:05 | Twitter-Thread veröffentlicht. |
| 09:15 | r/javascript veröffentlicht. |
| 09:30 | dev.to-Artikel veröffentlicht. |
| 09:30-13:30 | Live in HN-Kommentaren. Einen Top-Kommentar mit Quick-Links anpinnen. |
| 14:00 | LinkedIn-Post. |
| 14:00-18:00 | Live in dev.to-Kommentaren + Twitter-Mentions. |
| 18:00 | Schluss. Durchatmen. |
| Tag 1, 09:00 | r/Accessibility + Mastodon. GitHub-Issues triagieren. |

---

*This is a machine translation of the canonical English
version at `/nac-spec/docs/NAC_LAUNCH_DIFFUSION.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
