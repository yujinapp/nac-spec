---
translation_source: guides/AI_PLAYBOOK_MIGRATION.md
translation_source_hash: f49b65c798ab36923cab79511851c64a81ad6609a1c37d4936d4c6c0542cc706
translation_quality: machine_v1
translation_lang: de
translation_date: 2026-05-11T14:31:31.172777+00:00
---

# AI Playbook -- Bestehendes Projekt zu NAC3 migrieren

**NAC3-Version:** 2.2 stable + v2.3 Interop-Vorschau.
**Zielgruppe:** Jeder AI-Agent (Claude, GPT, Gemini, lokales LLM), der mit der Brownfield-Migration einer bestehenden Web-App zu NAC-3-Konformität beauftragt ist.
**Format:** Schritt-für-Schritt-Runbook mit WHAT, HOW, ASSERT pro Schritt.

Wenn ein Mensch sagt **„lass uns dieses Projekt zu NAC-3 migrieren"**, MUSS ein AI-Agent, der diese Datei liest, die folgenden Schritte der Reihe nach ausführen.
Brownfield-Migration ist schwieriger als Greenfield, weil die laufende App nicht unterbrochen werden darf. Jeder Schritt wird UNABHÄNGIG ausgeliefert.

---

## Schritt 0 -- Umfang + Sicherheitsschranken

### 0.1 Fragen an den Menschen

1. **Risikorahmen**: Ist die App in Produktion? Falls ja, wird pro Screen hinter Feature-Flags migriert. Bei Staging kann mutiger vorgegangen werden.
2. **Framework**: Aus `package.json` / `composer.json` / Projektstruktur ermitteln, dann mit dem Menschen bestätigen.
3. **Top-10-Verben**: Den Menschen bitten, die 10 am häufigsten verwendeten Aktionen in der App aufzulisten (speichern, abbrechen, suchen, filtern usw.). Diese werden zuerst migriert.
4. **Chat-Backend**: Wird eine bestehende Chat-Infrastruktur wiederverwendet (Yujin Chat unter `/yujin/nac-demo` oder ein eigener LLM-Intermediär)?
5. **Aktuelle Testabdeckung**: Vorhandene Playwright / Cypress / Jest-Tests? NAC3-Tests werden ergänzend hinzugefügt, nicht ersetzt.
6. **Komponentenbibliothek**: shadcn / MUI / PrimeNG / Mantine / eigene? Manche Bibliotheken schlucken `data-*`-Props; dann werden Wrapper benötigt (siehe Schritt 5).

### 0.2 Pre-Flight-Git-Hygiene

```bash
git status              # MUSS sauber sein, bevor es losgeht
git checkout -b feat/nac3-migration
```

Jeder NAC-Migrationsschritt lebt in einem eigenen Commit, damit der Mensch jeden Abschnitt prüfen und rückgängig machen kann.

---

## Schritt 1 -- Runtime installieren + Boot-Modul erstellen

```bash
npm install @nac3/runtime@^2.2.0
```

`src/nac/boot.ts` erstellen (oder Framework-Äquivalent):

```ts
import '@nac3/runtime';
import '@nac3/runtime/extensions';
// import '@nac3/runtime/chat-client';  // uncomment when ready for chat

declare global { interface Window { NAC?: any; NacChat?: any; } }
```

Einmalig aus dem Root-Entry der App importieren (`main.tsx`, `app.module.ts` oder ganz oben im HTML-Head-Skript).

**Assert:** `window.NAC` in der Browser-Konsole definiert;
`window.NAC.version` gibt `'2.2.0'` (oder höher) zurück.

**Commit:** `feat(nac3-migration): step 1 -- install runtime + boot module`

---

## Schritt 2 -- App-Shell dekorieren

`data-nac-plugin="<app-slug>"` zum ÄUSSERSTEN Container hinzufügen, der die Haupt-UI umschließt. Dies ist das wichtigste einzelne Attribut bei der Migration -- ohne es ist der Snapshot des LLM-Intermediärs leer (Lektion aus den React- und Angular-Fallstudien, Bug #1, dokumentiert unter `docs/CASE_STUDIES_DISCOVERY.md`).

### React-Beispiel

```tsx
return (
  <div className="app" data-nac-plugin="my-app">
    ...
  </div>
);
```

### Angular-Beispiel

```html
<div class="app" data-nac-plugin="my-app">
  ...
</div>
```

### Server-seitig gerendert (PHP / Rails / Django)

```html
<body data-nac-plugin="my-app">
  ...
</body>
```

**Assert:** Browser-Konsole: `NAC.describe().plugins.length >= 1`.

**Commit:** `feat(nac3-migration): step 2 -- root data-nac-plugin attribute`

---

## Schritt 3 -- Top-10-Verb-Buttons dekorieren

Die 10 am häufigsten verwendeten Aktionen aus Schritt 0.3 nehmen. Für jeden Button:

```html
<button
  data-nac-id="<plugin>.<verb>"
  data-nac-role="action"
  data-nac-action="<verb>"
  onclick="...">
  ...
</button>
```

**ID-Konventionen:**
- Plugin-Namespace: `invoice.save`, nicht nur `save`.
- Snake_case Kleinbuchstaben: `add_row`, nicht `AddRow` oder `add-row`.
- Verb am Ende, wenn es ein globales App-Verb ist; andernfalls verschachtelt:
  `dashboard.invoice.list.row.42.delete`.

Den vorhandenen `onclick`-Handler / Event-Handler nicht anfassen -- die Dekoration ist additiv.

**Assert:** In der Konsole:
```js
NAC.describe().plugins[0].elements.length  // >= 10
NAC.list_registered_plugins()                // enthält das eigene Plugin
```

**Commit:** `feat(nac3-migration): step 3 -- top-10 buttons decorated`

---

## Schritt 4 -- Minimales Manifest hinzufügen

Nicht versuchen, am ersten Tag ALLE Elemente abzudecken. Die Top-10-Verb-Buttons aus Schritt 3 mit korrektem `label_i18n` versehen:

```ts
// src/nac/manifest.ts
const li = (es:string,en:string,pt:string,fr:string,it:string,
            de:string,ja:string,zh:string,hi:string,ar:string) =>
  ({ es, en, pt, fr, it, de, ja, zh, hi, ar });

export const APP_MANIFEST = {
  plugin_slug: 'my-app',
  version: '1.0.0',
  nac_version: '2.2',
  elements: [
    {
      id: 'my-app.save', role: 'action',
      actions: [{
        verb: 'save',
        label_i18n: li('Guardar','Save','Salvar','Sauver','Salva',
                       'Speichern','保存','保存','sahejna','حفظ')
      }],
      label_i18n: li(/* same */)
    },
    // ... 9 weitere ...
  ]
};
```

Beim Boot registrieren:

```ts
window.NAC?.register(APP_MANIFEST);
```

Falls am ersten Tag nicht alle 10 Sprachen geliefert werden können, `i18n_strict: 'permissive'` auf dem autoRegister.watch-Pfad verwenden. Dies ist eine temporäre Krücke; der Strict-Validator von NAC3 v2.2 in Produktion warnt bei unvollständigem i18n.

**Assert:**
```js
NAC.list_registered_plugins()           // ['my-app']
await NAC.click_by_verb('my-app','save')  // löst auf
```

**Commit:** `feat(nac3-migration): step 4 -- manifest with top-10 verbs`

---

## Schritt 5 -- Komponentenbibliothek behandeln (falls zutreffend)

Falls die App MUI / Mantine / PrimeNG / etc. verwendet und die Buttons `data-*`-Props schlucken, einen dünnen Wrapper schreiben:

```tsx
// src/nac/NacButton.tsx
import { Button as MuiButton } from '@mui/material';
import { useEffect, useRef } from 'react';

export function NacButton({ nacId, verb, plugin, children, ...rest }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.setAttribute('data-nac-id', nacId);
    el.setAttribute('data-nac-role', 'action');
    el.setAttribute('data-nac-action', verb);
  }, [nacId, verb]);
  return <MuiButton ref={ref} {...rest}>{children}</MuiButton>;
}
```

`<Button>` durch `<NacButton nacId="..." verb="...">` für die Top-10-Buttons ersetzen. Inkrementell vorgehen.

**Commit:** `feat(nac3-migration): step 5 -- component library wrapper`

---

## Schritt 6 -- Ack-Vertrag emittieren

Der `bindAction`-Helper aus v2.2 ist der sauberste Weg:

```ts
import { useRef, useEffect } from 'react';

export function useNacAction(plugin: string, actionId: string) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || !window.NAC) return;
    return window.NAC.bindAction(el, () => {}, { plugin, action_id: actionId });
  }, [plugin, actionId]);
  return ref;
}
```

```tsx
function SaveButton({ onSave }) {
  const ref = useNacAction('my-app', 'my-app.save');
  return <button ref={ref} onClick={onSave}>Save</button>;
}
```

Der bindAction-Layer feuert `nac:action:succeeded` automatisch, nachdem das `onClick` des Benutzers zurückgekehrt ist. Kein „Der Chat sagt ‚No pude ejecutar X: timeout'" mehr.

**Assert:** In der Konsole:
```js
document.addEventListener('nac:action:succeeded', e => console.log(e.detail));
await NAC.click('my-app.save');
// Sollte ausgeben: {plugin: 'my-app', action_id: 'my-app.save', ...}
```

**Commit:** `feat(nac3-migration): step 6 -- bindAction ack contract`

---

## Schritt 7 -- Felder + Tabs hinzufügen

Für jedes Eingabefeld, in das der Benutzer tippt:

```html
<input data-nac-id="my-app.field_x" data-nac-role="field" ...>
```

Für jeden Tab in Tab-Leisten-Komponenten:

```html
<button
  data-nac-id="tab.<key>"
  data-nac-role="tab"
  onclick="...">
  ...
</button>
```

**Kritisch (Strict-Validator-Regel v2.2):** IDs, die auf `^tab\.` passen, MÜSSEN die Rolle `tab` haben. Nicht übereinstimmende Rollen erzeugen den Fund `tab_id_manifest_role_drift`, und die Runtime kann den Tab nicht über `NAC.tab()` finden.

**Commit:** `feat(nac3-migration): step 7 -- fields + tabs decorated`

---

## Schritt 8 -- Chat-Panel hinzufügen (optional, aufschiebbar)

Den Referenz-`nac-chat-client.js` einbinden:

```html
<aside class="chat" data-nac-plugin="chat" aria-hidden="true">
  <div id="chat-log" data-nac-id="chat.log" data-nac-role="region"></div>
  <input id="chat-input" data-nac-id="chat.input" data-nac-role="field">
  <button id="chat-send" data-nac-id="chat.send" data-nac-role="action">send</button>
</aside>

<script src="https://yujin.app/nac-spec/js/nac-chat-client.js?v=v22"></script>
<script>
NacChat.init({
  endpoint: '/your-llm-intermediary',   // or '/crm/api/v1/yujin/nac-demo'
  chatLog: document.getElementById('chat-log'),
  input:   document.getElementById('chat-input'),
  sendBtn: document.getElementById('chat-send')
});
</script>
```

Alternativ den Chat **vollständig aufschieben** und Benutzern empfehlen, Yujin Pilot (`yujin.app/pilot`) zu installieren, das die App über MCP erkennt und von einem zentralen Cockpit aus steuert.

**Commit:** `feat(nac3-migration): step 8 -- chat panel`

---

## Schritt 9 -- NAC3-Testkorpus einschichten

Die Yujin-Referenz-Testinfrastruktur kopieren:

```bash
mkdir -p test/nac3
cp /path/to/rpaforce-crm/packages/nac/test/stage*.mjs ./test/nac3/
cp /path/to/rpaforce-crm/tools/nac/test-launch.sh ./test/nac3/
```

Plugin-Slug und Manifest-Referenz anpassen. Ausführen:

```bash
bash ./test/nac3/test-launch.sh
```

**Assert:** Alle Ebenen GRÜN.

**Commit:** `feat(nac3-migration): step 9 -- NAC3 test corpus`

---

## Schritt 10 -- Zu NAC-3-Konformität befördern

```bash
# In der CI:
npx @nac3/runtime validate ./src --severity=error  # exit 0 erforderlich
NAC.validate_global({probe: true})              # null Befunde erforderlich
```

`NAC.STRICT_VALIDATION = true` im Produktions-Boot setzen, um Rollen-Kohärenz zur Registrierungszeit zu erzwingen.

**Commit:** `feat(nac3-migration): step 10 -- NAC-3 conformance gate`

---

## Migrationsreihenfolge über Screens hinweg

In einer Produktions-App mit vielen Screens nicht versuchen, alle auf einmal zu migrieren:

1. **Meistgenutzter Screen zuerst** (z. B. Login + Dashboard).
2. **Screen mit dem höchsten Wert als nächstes** (der Screen, in dem Power-User die meiste Zeit verbringen).
3. **Öffentlich zugängliche Screens** (für anonymen Traffic sichtbar).
4. **Admin-Screens** zuletzt (geringer Traffic, tiefere Abnahme).

Jeder Screen bekommt seinen eigenen PR. Jeder PR wird hinter einem Feature-Flag ausgeliefert, falls vorhanden; Rollback durch Umschalten des Flags.

---

## Häufige Migrationsfallen

1. **`data-nac-plugin` am Root vergessen.** Manifest registriert, aber LLM sieht nichts. **Symptom:** Chat sagt generisch „Wie kann ich helfen" ohne Aktionen. Behebung: Attribut hinzufügen. (Bug #1 aus den Fallstudien.)
2. **React-State-Stale-Closure in onChatAction.** Refs + funktionale Setter verwenden. (Bug #2 aus den Fallstudien.)
3. **Tab-ID mit Nicht-Tab-Rolle.** Fund des v2.2-Strict-Validators. `^tab\.` MUSS die Rolle `tab` haben.
4. **IDs nach einem Refactoring wiederverwenden.** Ein Button, der in eine neue semantische Rolle verschoben wurde, MUSS eine neue ID erhalten. Wiederverwendung bricht nachgelagerte Automatisierung.
5. **Komponentenbibliothek schluckt data-*.** Früh erkennen; Wrapper schreiben (Schritt 5).
6. **Click-Handler emittiert kein Ack.** `bindAction` verwenden. Ohne es läuft `NAC.click()` nach 5 s ab, auch wenn der Seiteneffekt funktioniert hat.

---

## Siehe auch

- [AI_PLAYBOOK_NEW_PROJECT.md](AI_PLAYBOOK_NEW_PROJECT.md) -- für Greenfield-Projekte.
- [REACT.md](REACT.md) / [ANGULAR.md](ANGULAR.md) -- Framework-Vertiefungen.
- [NAC_TEST_MANUAL.md](../docs/NAC_TEST_MANUAL.md) -- Test-Playbook nach der Migration.
- [CASE_STUDIES_DISCOVERY.md](../docs/CASE_STUDIES_DISCOVERY.md) -- Bugs, die während der Yujin-Referenzmigration gefunden wurden.

## Lizenz

Apache-2.0.

---

*This is a machine translation of the canonical English
version at `/nac-spec/guides/AI_PLAYBOOK_MIGRATION.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
