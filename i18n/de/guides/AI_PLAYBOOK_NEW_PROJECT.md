---
translation_source: guides/AI_PLAYBOOK_NEW_PROJECT.md
translation_source_hash: 6586a966938a6d84086a8b79805cde15886536b6718b79526ff7d16d202686fe
translation_quality: machine_v1
translation_lang: de
translation_date: 2026-05-11T14:30:24.116732+00:00
---

# AI Playbook -- Neues NAC-3-Projekt starten

**NAC3-Version:** 2.2 stable + v2.3 Interop-Vorschau.
**Zielgruppe:** Jeder AI-Agent (Claude, GPT, Gemini, lokales LLM), der mit dem Aufsetzen eines NAC-3-konformen Projekts von Grund auf beauftragt wurde.
**Format:** Schritt-für-Schritt-Runbook. Jeder Schritt enthält WHAT, HOW, ASSERT.
Keine Mehrdeutigkeiten.

Wenn ein Mensch **„lass uns ein neues NAC-3-Projekt starten"** oder Ähnliches sagt, MUSS ein AI-Agent, der diese Datei liest, die folgenden Schritte der Reihe nach ausführen und jedes Gate prüfen, bevor er weitermacht.

---

## Schritt 0 -- Umfang mit dem Menschen klären

Stelle genau diese Fragen, bevor du Code schreibst:

1. **Framework**: React, Angular, Vue, Svelte, Vanilla oder Server-seitig gerendert (PHP/Rails/Django)?
2. **Sprachen**: Welche der 10 NAC3-Locales muss die App beim Launch unterstützen? (es, en, pt, fr, it, de, ja, zh, hi, ar)
3. **Chat-Backend**: Wird die App einen eigenen LLM-Intermediär bereitstellen (Endpunkt angeben) oder einen gehosteten Yujin-Chat verwenden?
4. **Provenienz**: Multi-Tenant? Falls ja, HMAC-Manifest-Signierung einplanen.
5. **Spracheingabe**: Nur Push-to-Talk, Freisprechen oder beides?
6. **Interop (v2.3-Vorschau)**: Soll diese App von anderen NAC3-Hosts (Yujin Pilot, Peer-Apps) importierbar sein? Ja -> MCP-Server-Tools bereitstellen.

Alle Antworten festhalten. Sie bestimmen jede nachfolgende Entscheidung.

---

## Schritt 1 -- Projekt aufsetzen

### React (Vite)

```bash
npm create vite@latest <slug> -- --template react-ts
cd <slug>
npm install
npm install @nac3/runtime@^2.2.0
```

### Angular

```bash
npx -p @angular/cli ng new <slug> --style=css --routing=true --strict
cd <slug>
npm install @nac3/runtime@^2.2.0
```

### Vanilla (HTML + JS + PHP, kein Framework)

Erstelle:
- `index.html` mit `<body data-nac-plugin="app">`.
- `js/app.js` mit Importen.

### Server-seitig gerendert

`@nac3/runtime` per CDN einbinden:

```html
<script src="https://yujin.app/nac-spec/js/nac.js?v=v22"></script>
<script src="https://yujin.app/nac-spec/js/nac-v2-extensions.js?v=v22"></script>
```

**Assert:** `npm run build` (oder Framework-Äquivalent) schlägt fehlerfrei durch. Im Browser öffnen; `window.NAC` ist definiert.

---

## Schritt 2 -- Shell dekorieren

Füge zum **Root-Container** im Template hinzu:

```html
<div data-nac-plugin="<your-app-slug>" class="app">
  ...
</div>
```

Füge zu **jedem klickbaren Widget** (Buttons, Links-als-Buttons) hinzu:

```html
<button
  data-nac-id="<slug>.<verb>"
  data-nac-role="action"
  data-nac-action="<verb>"
  onclick="...">
  ...
</button>
```

Füge zu **jedem Formularfeld** (input, textarea, select) hinzu:

```html
<input
  data-nac-id="<slug>.<field-name>"
  data-nac-role="field"
  ... />
```

Füge zu **jedem Tab-Button** hinzu (die Spec ist strikt: `^tab\.`-IDs MÜSSEN die Rolle `tab` haben):

```html
<button
  data-nac-id="tab.<key>"
  data-nac-role="tab"
  onclick="...">
  ...
</button>
```

**Assert:** `npx @nac3/runtime validate ./src` meldet null Befunde mit Fehler-Schweregrad. `NAC.describe()` aus der Browser-Konsole gibt einen Baum zurück, in dem `data-nac-plugin` übereinstimmt.

---

## Schritt 3 -- Manifest schreiben

Erstelle `src/nac/manifest.ts` (oder Äquivalent):

```ts
const li = (es:string,en:string,pt:string,fr:string,it:string,
            de:string,ja:string,zh:string,hi:string,ar:string) =>
  ({ es, en, pt, fr, it, de, ja, zh, hi, ar });

export const APP_MANIFEST = {
  plugin_slug: '<your-app-slug>',
  version: '1.0.0',
  nac_version: '2.2',
  elements: [
    {
      id: '<slug>.save',
      role: 'action',
      actions: [{
        verb: 'save',
        label_i18n: li('Guardar','Save','Salvar','Sauver','Salva',
                       'Speichern','保存','保存','sahejna','حفظ')
      }],
      label_i18n: li(/* same 10 */)
    },
    // ... alle weiteren Elemente ...
  ]
};
```

**Kritische Regeln:**
- Jedes `label_i18n` MUSS alle 10 unterstützten Locales abdecken. Unvollständige Einträge werden vom v2.2-Strict-Validator gemeldet.
- Jede `id` mit dem Muster `^tab\.` MUSS `role: 'tab'` haben.
- Jede `id` MUSS plugin-namespaced sein (z. B. `invoice.save`, nicht `save`).
- IDs MÜSSEN über UI-Redesigns hinweg stabil bleiben.

**Assert:** `NAC.validate_global({probe: false})` gibt 0 Befunde mit Fehler-Schweregrad zurück.

---

## Schritt 4 -- Manifest beim Start registrieren

### React

```tsx
import { useEffect } from 'react';
import '@nac3/runtime';
import '@nac3/runtime/extensions';
import { APP_MANIFEST } from './nac/manifest';

export function App() {
  useEffect(() => {
    window.NAC?.register(APP_MANIFEST);
  }, []);
  // ...
}
```

### Angular

```ts
import { Injectable } from '@angular/core';
import '@nac3/runtime';
import '@nac3/runtime/extensions';
import { APP_MANIFEST } from './nac/manifest';

@Injectable({ providedIn: 'root' })
export class NacBoot {
  constructor() {
    (window as any).NAC?.register(APP_MANIFEST);
  }
}
```

`NacBoot` in die `AppComponent` injizieren.

### Vanilla

```html
<script type="module">
import { APP_MANIFEST } from './nac/manifest.js';
window.NAC.register(APP_MANIFEST);
</script>
```

**Assert:** `NAC.list_registered_plugins()` gibt `['<your-app-slug>']` zurück.

---

## Schritt 5 -- Ack-Vertrag aus jedem Click-Handler emittieren

Für jeden Button mit `data-nac-role="action"` MUSS der Click-Handler nach seinem synchronen Seiteneffekt `nac:action:succeeded` emittieren.

### Muster A -- via `NAC.bindAction` (v2.2-Hilfsfunktion, empfohlen)

```ts
const btn = document.querySelector('[data-nac-id="<slug>.save"]');
NAC.bindAction(btn, function (ev) {
  saveInvoice();          // dein Seiteneffekt
}, { plugin: '<slug>', action_id: '<slug>.save' });
```

`bindAction` behandelt synchrone, asynchrone (Promise) und Fehler-Fälle automatisch.

### Muster B -- manuelle Emission

```ts
button.addEventListener('click', function () {
  saveInvoice();
  document.dispatchEvent(new CustomEvent('nac:action:succeeded', {
    detail: { plugin: '<slug>', action_id: '<slug>.save' }
  }));
});
```

Für andere Rollen die kanonische Event-Familie emittieren:
- `role="field"` -> `nac:field:changed` (detail: `{plugin, field_id, value}`)
- `role="tab"` -> `nac:tab:activated` (detail: `{plugin, tab_id}`)
- Vollständige Tabelle siehe SPEC.md Abschnitt 6.

**Assert:** Aus der Browser-Konsole:
```js
document.addEventListener('nac:action:succeeded', e => console.log(e.detail));
await NAC.click('<slug>.save');
// Sollte ausgeben: {plugin: '<slug>', action_id: '<slug>.save', ...}
```

---

## Schritt 6 -- Chat-Panel verdrahten

Den Referenz-Chat-Client einbetten ODER Yujin Pilot (extern) verwenden.

### Option A -- `nac-chat-client.js` einbetten

```html
<aside class="chat" data-nac-plugin="chat" aria-hidden="true">
  <header class="chat-head">...</header>
  <div id="chat-log" data-nac-id="chat.log" data-nac-role="region"></div>
  <input id="chat-input" data-nac-id="chat.input" data-nac-role="field">
  <button id="chat-send" data-nac-id="chat.send" data-nac-role="action">send</button>
</aside>

<script src="https://yujin.app/nac-spec/js/nac-chat-client.js?v=v22"></script>
<script>
  NacChat.init({
    endpoint: '/api/your-llm-intermediary',
    chatLog: document.getElementById('chat-log'),
    input:   document.getElementById('chat-input'),
    sendBtn: document.getElementById('chat-send')
  });
</script>
```

Den `endpoint` stellst du bereit -- das LLM-Intermediär-Backend, das `{prompt, lang, history, nac_tree}` empfängt und `{message, actions[]}` zurückgibt. Siehe `LLM_WIRING.md`.

### Option B -- Yujin Pilot überlassen

Chat gar nicht einbetten. Nutzer darauf hinweisen: „Installiere Yujin Pilot (yujin.app/pilot) für Sprache + Chat in dieser App." Pilots MCP-Scanner erkennt deine App und steuert sie von seinem zentralen Cockpit aus.

---

## Schritt 7 -- Test-Corpus ausführen

Die Yujin-Referenz-Testinfrastruktur als Ausgangspunkt kopieren:

```bash
# Aus deinem Projektstamm
cp -r /path/to/rpaforce-crm/packages/nac/test ./test
cp -r /path/to/rpaforce-crm/tools/nac/test-launch.sh ./tools/test-launch.sh
```

`test/stage*.mjs` bearbeiten, um auf dein Manifest und deinen Plugin-Slug statt auf das Demo-Projekt zu verweisen. Das Grundgerüst bleibt identisch.

Ausführen:

```bash
bash ./tools/test-launch.sh
```

**Assert:** Alle Node-seitigen Schichten GREEN. Gesamtlaufzeit < 15s.

---

## Schritt 8 -- Playwright-E2E hinzufügen

```bash
mkdir -p tests/e2e-nac
cd tests/e2e-nac
npm init -y
npm install --save-dev @playwright/test
npx playwright install chromium
```

`tests/e2e-nac/specs/01-landing.spec.ts` aus der Yujin-Referenz als Vorlage kopieren; an die URL und den Plugin-Slug deiner App anpassen.

Für den **vollständigen Pipeline-Test** (Chat -> LLM -> Dispatch -> DOM -> Ack) siehe Yujins `08-pipeline-end-to-end.spec.ts`. Drei Tests decken den gesamten Ablauf gegen dein Live-Backend ab.

---

## Schritt 9 -- Produktions-Checkliste

Vor dem Deployment:

- [ ] `NAC.STRICT_VALIDATION = true` -- erzwingt Rollen-Validierung zur Registrierungszeit (wirft bei Abweichungen).
- [ ] `npx @nac3/runtime validate ./src` -- null Befunde mit Fehler-Schweregrad.
- [ ] `npm test` (dein Testrahmen) -- 100% bestanden.
- [ ] `npx playwright test` -- alle E2E grün.
- [ ] Multi-Tenant: Manifeste serverseitig per HMAC signieren; `NAC.set_provenance_secret()` aus authentifiziertem Code aufrufen.
- [ ] `is_trusted`-gesicherte Verben: alle Verben explizit auf die Whitelist setzen, die RPA-Bots / synthetische Klicks auslösen dürfen (siehe SECURITY.md).
- [ ] i18n: jedes `label_i18n` deckt alle 10 Locales ab (oder `i18n_strict: 'permissive'` während der Migration verwenden).

---

## Schritt 10 -- NAC-3-Konformität bestätigen

`NAC.validate_global({probe: true})` ausführen. Die Laufzeit synthetisiert Klicks auf jedes `role="action"`-Element und prüft, ob jedes seinen Ack innerhalb von 5s emittiert.

**Assert:** Null Befunde. Die App ist NAC-3-konform.

---

## Häufige AI-Fehler (und wie man sie vermeidet)

1. **Manifest registrieren ohne `data-nac-plugin` im DOM.**
   `NAC.describe()` der Laufzeit durchläuft das DOM, nicht die Registry. Ohne das Attribut ist der Snapshot des LLM-Intermediärs für dieses Plugin leer. IMMER beides zusammen setzen.
2. **Chat-Handler über React/Vue-State schließen.** Refs oder funktionale Setter verwenden. Siehe CASE_STUDIES_DISCOVERY.md Bug #2.
3. **Unvollständige i18n.** Der v2.2-Strict-Validator schlägt bei unvollständigen `label_i18n`-Maps fehl. Falls unvollständig ausgeliefert werden muss, `i18n_strict: 'permissive'` verwenden und ein TODO-Ticket anlegen -- das ist keine dauerhafte Lösung.
4. **IDs nach Refactoring wiederverwenden.** Ein Button, der in eine neue semantische Rolle umbenannt wird, MUSS eine neue ID erhalten. Wiederverwendung bricht alle nachgelagerten Agent-Skripte.
5. **Das Ack-Event vergessen.** Ein Handler, der seine Arbeit synchron erledigt, aber kein `nac:action:succeeded` emittiert, lässt `NAC.click()` in einen Timeout laufen. `bindAction` verwenden, um den Vertrag fest einzubauen.

---

## Siehe auch

- [SPEC.md](../SPEC.md) -- kanonischer Vertrag.
- [AI_PLAYBOOK_MIGRATION.md](AI_PLAYBOOK_MIGRATION.md) -- für Brownfield-Projekte.
- [NAC_TEST_MANUAL.md](../docs/NAC_TEST_MANUAL.md) -- Test-Playbook für jede NAC-3-App.
- [REACT.md](REACT.md) / [ANGULAR.md](ANGULAR.md) -- Framework-Vertiefungen.

## Lizenz

Apache-2.0.

---

*This is a machine translation of the canonical English
version at `/nac-spec/guides/AI_PLAYBOOK_NEW_PROJECT.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
