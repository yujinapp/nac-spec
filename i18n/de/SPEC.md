---
translation_source: SPEC.md
translation_source_hash: 5ebb8103746daf5bf7877b67ebb3a44cf98b4e2cba1fd8ba30093e0fce1b9b76
translation_quality: machine_v1
translation_lang: de
translation_date: 2026-05-11T12:59:09.388858+00:00
---

# NAC3 -- Native Agent Contract

**Version:** 2.2.0
**Status:** Stable
**License:** Apache-2.0
**Editor:** Yujin (rpaforce.com)

---

## 0. Zweck

NAC3 ist ein Vertrag zwischen Web-UIs und den Agenten, die sie steuern.
Agenten umfassen Voice-Runner, LLM-Intermediäre, RPA-Bots,
Barrierefreiheitswerkzeuge und End-to-End-Test-Runner. Der Vertrag
legt fest:

1. **Wie Elemente benannt werden** -- damit ein Agent „Klick auf den
   Speichern-Button" anfordern und diesen einem einzelnen DOM-Knoten
   zuordnen kann.
2. **Wie Verben angewendet werden** -- damit ein Agent `NAC.click(id)`,
   `NAC.fill(id, value)`, `NAC.tab(plugin, key)` usw. aufrufen kann,
   ohne app-spezifischen Verbindungscode.
3. **Wie der Abschluss signalisiert wird** -- damit ein Agent weiß,
   wann ein Schritt abgeschlossen ist, mit einer deterministischen
   Ereignisfamilie pro Rolle.
4. **Wie die Herkunft erhalten bleibt** -- damit ein nachgelagertes
   System einen echten Benutzerklick von einem synthetisierten
   unterscheiden kann.

NAC3 fügt eine dünne Schicht über dem Framework hinzu, mit dem Sie
bereits rendern. Es ersetzt weder ARIA, React, Vue noch Ihr
Design-System.

---

## 1. Rollen

Jedes agenten-relevante DOM-Element trägt `data-nac-role`. Die
kanonischen Rollen sind:

| Rolle | Bedeutung | Beispiel |
|-------|-----------|---------|
| `plugin` | Ein eigenständiges UI-Modul (eine Seite, ein Panel, eine Widget-Sammlung). | `<article data-nac-plugin="invoice">` |
| `section` | Ein Orientierungspunkt innerhalb eines Plugins (Header, Body, Footer, Sidebar). | `<section data-nac-role="section">` |
| `region` | Ein benennbarer Bereich innerhalb einer Section (ein Karten-Cluster, eine Ergebnisliste). | `<div data-nac-role="region">` |
| `action` | Ein anklickbares Widget, das ein Verb auslöst (Button, Link-als-Button). | `<button data-nac-role="action" data-nac-action="save">` |
| `field` | Eine Eingabe, die der Benutzer tippt oder umschaltet (Text, Zahl, Checkbox, Radio, Datum, Datei). | `<input data-nac-role="field">` |
| `option` | Eine auswählbare Option innerhalb eines Feldes (Combobox / Select / Radio-Group-Kind). | `<li data-nac-role="option">` |
| `tab` | Ein umschaltbarer Panel-Selektor. **Erforderlich, wenn `data-nac-id` auf `^tab\.` passt** | `<button data-nac-role="tab" data-nac-id="tab.lines">` |
| `breadcrumb-item` | Ein Breadcrumb-Schritt. | `<a data-nac-role="breadcrumb-item">` |
| `accordion-toggle` | Ein Auf-/Zuklappen-Steuerelement. | `<button data-nac-role="accordion-toggle">` |
| `step` | Ein Wizard-Schrittindikator. | `<li data-nac-role="step">` |
| `pagination-item` | Ein Seitensprung-Steuerelement in einer paginierten Liste. | `<button data-nac-role="pagination-item">` |
| `confirm-button` | Ein Bestätigen/Abbrechen-Button innerhalb eines Bestätigungsdialogs. | `<button data-nac-role="confirm-button">` |
| `sort-control` | Ein Spalten-Sortier-Header. | `<th data-nac-role="sort-control">` |
| `filter-control` | Ein Spaltenfilter-Auslöser. | `<button data-nac-role="filter-control">` |
| `data-table` | Ein Datentabellen-Host (v2.1). | `<table data-nac-role="data-table">` |
| `navigation` | Eine Orientierungspunkt-Navigationsregion. **Kein Tab.** | `<nav data-nac-role="navigation">` |
| `confirm-dialog` | Das Modal einer Bestätigungsanfrage. | `<div data-nac-role="confirm-dialog">` |

Rollen außerhalb dieser Liste sind für zukünftige Verwendung reserviert.
Eine NAC-strikte Runtime SOLLTE unbekannte Rollen zur Registrierungszeit
ablehnen (v2.2). Eine NAC-permissive Runtime DARF unbekannte Rollen zur
Abwärtskompatibilität als `action` behandeln (Standard in v1.9 und v2.0).

---

## 2. Namen

Jedes agenten-auflösbare Element trägt `data-nac-id`. Die ID ist:

- **Ein Punkt-Pfad** (z. B. `deals.list.row.42.actions.delete`).
  Punkte trennen semantische Ebenen; die Runtime interpretiert sie
  nicht, aber Menschen und LLMs tun es.
- **Global eindeutig innerhalb eines `data-nac-plugin`-Geltungsbereichs.**
  Zwei verschiedene Plugins DÜRFEN eine ID teilen; die Runtime löst
  über das Paar `(plugin, id)` auf.
- **Stabil über Re-Renders hinweg.** Frameworks, die pro Render eine
  neue ID erzeugen (zufällige Hashes, Instanzzähler), brechen den
  Vertrag.
- **Stabil über UI-Neugestaltungen hinweg.** Ein Button wird von der
  Toolbar in ein Dropdown verschoben; seine ID MUSS gleich bleiben.

Reservierte ID-Präfixe (v2.1):

| Präfix | Reserviert für |
|--------|----------------|
| `tab.` | Tab-Buttons. Rolle MUSS `tab` sein. |
| `modal.` | Modal-bezogene Elemente. Rolle ist die Rolle des Blatt-Widgets. |
| `field.` | Formularfeld-Kurzform. Rolle MUSS `field` oder `option` sein. |
| `confirm.` | Bestätigungsdialoge. |

---

## 3. Verben

Ein `data-nac-role="action"`-Element DARF `data-nac-action="<verb>"`
tragen, das benennt, was es tut. Das Verb ist ein freier Snake-Case-
Bezeichner, der zwischen Host und Agent vereinbart wird. Gängige Verben:

`save`, `cancel`, `submit`, `delete`, `edit`, `view`, `create`,
`approve`, `reject`, `send`, `download`, `upload`, `refresh`,
`expand`, `collapse`, `open`, `close`, `add_row`, `remove_row`.

`NAC.click_by_verb(plugin, verb)` löst ein Verb zur eindeutigen Aktion
unter diesem Plugin auf und klickt es. Mehrere Aktionen, die dasselbe
Verb unter einem Plugin teilen, sind ein Manifestfehler (Lint:
`duplicate_verb`).

---

## 4. Manifest

Jedes Plugin DARF ein Manifest registrieren über:

```js
NAC.register({
  plugin_slug: 'invoice',
  version:     '1.0.0',
  nac_version: '2.1',
  elements: [
    { id: 'invoice.save', role: 'action',
      actions: [{ verb: 'save', label_i18n: { es: 'Guardar', en: 'Save', ... } }],
      label_i18n: { es: 'Guardar factura', en: 'Save invoice', ... } },
    ...
  ],
  tabs: [
    { nac_id: 'tab.lines', label_i18n: { es: 'Lineas', en: 'Lines' } },
    ...
  ],
  fields: [
    { id: 'field.client_name', type: 'text', required: true,
      label_i18n: { es: 'Cliente', en: 'Customer' } },
    ...
  ],
  data_tables: [...]
});
```

Das Manifest ist die agenten-seitige Quelle der Wahrheit. Ein LLM-
Intermediär, der entscheidet „der Benutzer sagte ‚guardar'", schlägt
das Plugin-Manifest nach, findet das Verb `save` und gibt
`NAC.click_by_verb('invoice', 'save')` aus.

### 4.1 Pflichtfelder

- `plugin_slug` -- entspricht `data-nac-plugin` am Host-Element.
- `nac_version` -- die NAC3-Version, mit der dieses Manifest
  Konformität beansprucht. Die Runtime lehnt Manifeste ab, die eine
  höhere Version als sich selbst beanspruchen.

### 4.2 Optionale Felder

- `elements[]` -- der Katalog benannter Widgets. Jeder Eintrag MUSS
  `id` und `role` haben.
- `tabs[]` -- ein separates Top-Level-Array für Tabs. Entspricht
  `elements[]`-Einträgen mit `role:'tab'`. Beide Formen sind gültig.
- `fields[]`, `actions[]`, `kpis[]`, `data_tables[]` -- typisierte
  Teilsammlungen; gleiche Semantik wie `elements[]`, gefiltert nach
  Rolle. Demos wählen die Form, die für Menschen am lesbarsten ist.

### 4.3 i18n

Jedes `label_i18n` MUSS alle 10 NAC3-Locales abdecken:

```
es, en, pt, fr, ja, zh, hi, ar, de, it
```

`i18n_strict: 'permissive'` bei `NAC.autoRegister.watch()` erlaubt
unvollständige Abdeckung während der Brownfield-Migration;
Produktions-Manifeste sollten 10 Locales ausliefern.

---

## 5. Public API

### 5.1 Imperativ

```ts
NAC.click(nac_id: string, opts?: ClickOpts): Promise<{ok: true}>
NAC.click_by_verb(plugin: string|null, verb: string, opts?): Promise<...>
NAC.fill(nac_id: string, value: string|number|boolean): Promise<...>
NAC.select(nac_id: string, value: string): Promise<...>
NAC.tab(plugin: string, tab_key: string): Promise<...>
NAC.tab_by_label(plugin: string|null, label: string): Promise<...>
NAC.go_to_section(nac_id: string): Promise<...>
NAC.drag_drop(source_id, target_id, opts?: {to_index?: number}): Promise<...>
NAC.set_mode(mode: 'modal'|'maximized'|'new_tab'|'new_window'): void
NAC.screenshot(): Promise<string>  // data URL
NAC.bindAction(el, handler, {plugin, action_id}): () => void  // v2.2
```

### 5.1.1 Conformance-Hilfsfunktion (v2.2)

`NAC.bindAction(el, handler, ctx)` ist der spezifikationskonforme Weg,
um einen Click-Handler zu verdrahten. Nach Ausführung des Handlers (synchron,
mit Ausnahme oder als Promise) wird automatisch `nac:action:succeeded` (bzw.
`:failed`) ausgelöst. Gibt eine Unbinder-Funktion zurück. Verwende dies
anstelle von rohem `addEventListener('click', ...)`, sofern der Host es
unterstützt; Brownfield-Code kann das Event wie bisher weiterhin manuell
auslösen.

### 5.1.3 Feldeditor (v2.3 Vorschau)

`NAC.edit_field(nac_id)` öffnet ein Modal, das einem Benutzer (oder einem
Agenten in seinem Auftrag) ermöglicht, beliebige Textfelder mit
Word-ähnlichen Werkzeugen zu bearbeiten:

```ts
NAC.edit_field(nac_id: string): Promise<{ok:true}>
```

Das Modal registriert sich unter `plugin_slug='nac_editor'` mit folgenden
NAC-3-aufrufbaren Verben:

| Verb | Wirkung |
|------|---------|
| `select_word` | Wort an der Einfügemarke auswählen |
| `select_sentence` | Satz an der Einfügemarke auswählen |
| `select_all` | Strg-A innerhalb des Editors |
| `replace` | Auswahl durch angegebenen Text ersetzen |
| `delete_selection` | Aktuelle Auswahl entfernen |
| `ai_correct_syntax` | Aktuellen Wert per POST an den LLM-Intermediär senden mit System-Prompt „fix grammar + spelling, return only fixed text"; Wert durch Antwort ersetzen |
| `save` | In das Quellfeld zurückschreiben, Input- und Change-Events auslösen, schließen |
| `cancel` | Verwerfen, schließen |

Esc schließt (Abbrechen). Strg/Cmd+Enter speichert. Klick auf den
Overlay-Hintergrund bricht ab.

Spec-Abschnitt 13 wird den Vertrag in v2.3 formalisieren; die v2.2-Runtime
liefert eine funktionierende Referenzimplementierung, damit Anwender sie
bereits heute einbinden können. Verfügbar für jedes Feld über:

```js
NAC.edit_field('invoice.client_name');
// oder über Intermediär:
NAC.click_by_verb('myplugin', 'edit_field', { nac_id: 'invoice.client_name' });
```

### 5.1.2 Striktes Validierungsflag (v2.2)

`NAC.STRICT_VALIDATION` (Boolean, Standard `false` in v2.2). Bei `true`
wirft `NAC.register()` einen `Error` mit `code='strict_validation'` und
einem `findings`-Array bei einem der folgenden Fälle:

- `manifest_role_unknown` – die Rolle eines Eintrags liegt außerhalb des kanonischen Satzes.
- `tab_id_manifest_role_drift` – die ID entspricht `^tab\.`, aber die Rolle ist nicht `'tab'`.
- `manifest_dom_role_mismatch` – das gemountete DOM-Element hat ein abweichendes `data-nac-role` gegenüber dem Manifest-Eintrag.

In v2.3 wechselt der Standardwert auf `true`. In v3.0 wird das Flag entfernt
(strikt ist dann der einzige Modus).

Alle asynchronen Methoden lehnen mit einem `NacError` ab, dessen `code` einer
der folgenden ist:

- `not_found` – das benannte Element/die Rolle/das Verb ist nicht im DOM.
- `invalid` – die Form des Arguments ist falsch.
- `timeout` – der Seiteneffekt wurde ausgelöst, aber das Conformance-Ack-Event
  ist nicht innerhalb von 5 Sekunden eingetroffen. **Ein Timeout bedeutet
  echtes Versagen**: Der Handler könnte hängen, das Ack wurde nie verdrahtet,
  oder es ist ein Netzwerk-Race aufgetreten. Aufrufer MÜSSEN einen Timeout als
  Fehler behandeln, es sei denn, sie haben über einen anderen Kanal einen
  Nachweis des Seiteneffekts.

### 5.2 Introspektion

```ts
NAC.describe():    { active: string|null, plugins: PluginSnap[] }
NAC.describe_v2(): { v2_scope_entries: [...], sitemap: ..., data_tables: [...] }
NAC.manifest(plugin_slug: string): Manifest|null
NAC.validate_global(opts?: {probe?: boolean}): Findings[]
```

### 5.3 Datentabellen (v2.1)

```ts
NAC.registerDataTable(spec: DataTableSpec): void
NAC.dt_add_row(table_id, values): {ok, row_id}
NAC.dt_remove_row(table_id, row_id): {ok}
NAC.dt_edit_cell(table_id, row_id, column, value): {ok} | {ok:false, error}
NAC.dt_set_cell(table_id, row, col, value): {ok} | {ok:false, error}
NAC.dt_select(table_id, target): {ok}
NAC.dt_commit(table_id): {ok, final_state} | {ok:false, errors:[...]}
NAC.dt_discard(table_id): {ok}
NAC.dt_state(table_id): TableState
NAC.dt_read_aggregate(table_id, agg_key, column): number|null
NAC.registerDataTableComputed(table_id, column, fn): void
```

Eine Datentabelle hat einen `subkind`:

- `collection` – geordnete Zeilen mit optionalem transaktionalem Commit.
  Verwendet für Rechnungspositionen, Warenkorbeinträge, Protokolleinträge.
- `matrix` – Zeile-×-Spalte-Raster, bei dem jede Zelle einen Wert trägt.
  Verwendet für Berechtigungsmatrizen, Zeitplanraster.
- `matrix-singletree` – Matrix, bei der jede Zeile zu einem Baum
  zusammenklappt (selten).

---

## 6. Events

Jede Aktion löst ein deterministisches Abschlussevent aus. `NAC.click()` der
Runtime fragt dieses Event ab und löst auf, sobald es eintrifft.

| Rolle | Erfolgsevent | Fehlerevent |
|-------|--------------|-------------|
| `action` | `nac:action:succeeded` | `nac:action:failed` |
| `field` | `nac:field:changed` | -- |
| `option` | `nac:field:changed` | -- |
| `tab` | `nac:tab:activated` | -- |
| `breadcrumb-item` | `nac:breadcrumb:navigated` | -- |
| `accordion-toggle` | `nac:accordion:expanded` / `:collapsed` | -- |
| `step` | `nac:step:advanced` | -- |
| `pagination-item` | `nac:table:page_changed` | -- |
| `confirm-button` | `nac:confirm:resolved` / `:cancelled` | -- |
| `sort-control` | `nac:table:sort_changed` | -- |
| `filter-control` | `nac:table:filter_changed` | -- |

### 6.1 Struktur des Event-Details

Jedes Event-Detail enthält das kanonische ID-Feld sowie `plugin`:

```js
nac:action:succeeded {
  detail: { plugin: 'invoice', action_id: 'invoice.save', ... }
}
nac:tab:activated {
  detail: { plugin: 'invoice_edit_modal', tab_id: 'tab.lines', ... }
}
nac:field:changed {
  detail: { plugin: 'invoice', field_id: 'field.client_name',
            value: 'Acme Corp', ... }
}
```

### 6.2 Auslösen aus einem Host-Handler

Ein Click-Handler MUSS nach seinem synchronen Seiteneffekt das entsprechende
Erfolgsevent auslösen:

```js
button.addEventListener('click', function (ev) {
  // ... Arbeit erledigen ...
  document.dispatchEvent(new CustomEvent('nac:action:succeeded', {
    detail: { plugin: 'invoice', action_id: 'invoice.save' }
  }));
});
```

Bei asynchroner Arbeit nach der Auflösung auslösen. Schlägt die Arbeit fehl,
`nac:action:failed` mit `{detail: {plugin, action_id, error: <message>}}`
auslösen.

Die v2.2-Runtime stellt `NAC.bindAction(el, handler, ctx)` bereit, das
`addEventListener` kapselt und das Event automatisch auslöst.

### 6.3 Warum nicht das Click-Event selbst verwenden?

Ein DOM-`click`-Event wird ausgelöst, bevor der Handler läuft. NAC3s Vertrag
muss wissen, wann der **Seiteneffekt abgeschlossen** ist, nicht wann der Klick
begann. Daher die separate Event-Familie.

---

## 7. Herkunft (Provenance)

### 7.1 isTrusted

`event.isTrusted` ist `true` bei nutzerinitierten Klicks (echte Maus,
echter Tastendruck, Screen-Reader-Aktivierung) und `false` bei
synthetischen Klicks (`element.click()`, dispatchEvent eines programmatisch
erzeugten MouseEvent, Automatisierung).

NAC3 MUSS diesen Wert über `event.detail.is_trusted` im Erfolgsevent
bereitstellen. Hosts, die sicherheitskritische Aktionen ausführen
(Zahlung, Löschung), DÜRFEN `is_trusted === true` voraussetzen und
synthetische Klicks ablehnen. Die Referenz-Demo `example-v20-full.php`
enthält ein Button-Paar (`v20_panel.istrusted_real` und
`v20_panel.istrusted_fake`), das den Unterschied veranschaulicht.

### 7.2 HMAC-signierte Manifeste

Ein Manifest DARF einen `provenance`-Block enthalten:

```js
NAC.set_provenance_secret('your-tenant-secret');
NAC.register({
  plugin_slug: 'invoice',
  ...,
  provenance: {
    signed_at: '2026-05-09T10:00:00Z',
    signed_by: 'tenant-X',
    signature: '<HMAC-SHA256 of manifest body>'
  }
});
```

Die Laufzeitumgebung berechnet den erwarteten HMAC über eine stabile
Serialisierung des Manifests (ohne die Signatur selbst) und lehnt
Manifeste ab, deren Signatur nicht übereinstimmt. Dies wird in
Multi-Tenant-Deployments eingesetzt, um zu verhindern, dass ein Tenant
das Manifest eines anderen Tenants fälscht.

### 7.3 Bedrohungsmodell (Threat Model)

Das vollständige Bedrohungsmodell ist in `SECURITY.md` beschrieben. Kurzfassung:

- NAC3 authentifiziert nicht den **Nutzer**. Das ist Aufgabe Ihrer
  Auth-Schicht.
- NAC3 authentifiziert das **Manifest** (HMAC).
- NAC3 unterscheidet echte Klicks von synthetischen Klicks
  (isTrusted), damit ein Host Letztere bei sicherheitskritischen Aktionen ablehnen kann.
- NAC3 schützt nicht vor einem bösartigen Agenten, der mit
  Nutzer-Zugriffsrechten läuft. Ein solcher Agent kann alles tun, was der Nutzer kann.

---

## 8. Konformitätsstufen

Eine Seite ist **NAC-1-konform**, wenn:

- Jedes anklickbare Widget, das ein Agent bedienen können soll,
  `data-nac-id` und `data-nac-role` trägt.
- Jedes Element mit `data-nac-role="action"` nach seinem Seiteneffekt
  `nac:action:succeeded` auslöst.
- Die Seite mindestens ein Plugin-Manifest über `NAC.register()` registriert.
- `NAC.click(id)` für jede beworbene ID funktioniert.

Eine Seite ist **NAC-2-konform**, wenn sie zusätzlich:

- `tabs[]`, `fields[]`, `actions[]`-Arrays explizit im Manifest
  registriert (nicht aus dem DOM abgeleitet).
- `label_i18n` für alle 10 NAC3-Locales für jedes nutzerseitige Label bereitstellt.
- Die v2.0-Brownfield-Primitive implementiert: Scope-Baum,
  ephemeres Capture, autoRegister.watch.
- `NAC.validate_global({probe: false})` ohne Befunde der Schwere `error` besteht.

Eine Seite ist **NAC-3-konform**, wenn sie zusätzlich:

- HMAC-signierte Manifeste trägt.
- `isTrusted` für sicherheitskritische Aktionen unterscheidet.
- `NAC.validate_global({probe: true})` ohne jegliche Befunde besteht.

Das CLI des NPM-Pakets (`npx @nac3/runtime validate <url>`) meldet
die höchste Stufe, die eine Seite erreicht.

---

## 9. Versionierung

NAC3 folgt Semver:

- **Major**-Bump: Breaking Change an der öffentlichen API oder den Wire-Formaten.
  Übernehmer müssen Code anpassen.
- **Minor**-Bump: neue Features, abwärtskompatibel. Bestehender Code
  funktioniert weiterhin.
- **Patch**-Bump: Bugfixes, reine Dokumentationsänderungen.

Deprecation-Richtlinie: Ein in Version `X.Y.0` als `@deprecated` markiertes
Feature wird frühestens in `(X+1).0.0` entfernt. Die Release Notes
dokumentieren jede Entfernung explizit.

Die NPM-Paketversion spiegelt die Spec-Version wider: `@nac3/runtime@2.1.3`
implementiert NAC3 v2.1 mit drei Patch-Revisionen.

---

## 10. Validatoren

### 10.1 Laufzeit: `NAC.validate_global()`

Durchläuft das Live-DOM, die registrierten Manifeste und den i18n-Katalog
und gibt ein Array von Befunden zurück:

```ts
{
  severity: 'error' | 'warn' | 'info',
  code:     string,                     // e.g. 'tab_role_drift'
  nac_id:   string | null,
  message:  string,
  detail:   Record<string, any>
}
```

Befundcodes sind über Patch-Releases hinweg stabil; neue Codes erscheinen
nur in Minor-Bumps.

### 10.2 CLI: `npx @nac3/runtime validate <target>`

Kapselt `validate_global` und ergänzt einen statischen Lint der
HTML/Manifest-Kohärenz. Exit-Codes:

- `0` -- keine Befunde mit Schwere >= konfiguriertem Schwellenwert.
- `1` -- Befunde vorhanden.
- `2` -- das Ziel konnte nicht geladen werden.

Nützlich in CI: `npx @nac3/runtime validate ./dist/index.html
--severity=error`.

---

## 11. Das System rund um NAC3

NAC3 ist eine Vertragsschicht. Um aus einer NAC-konformen Seite eine
sprachgesteuerte App zu machen, benötigen Sie außerdem:

1. **Eine Speech-to-Text-Quelle** (Browser SpeechRecognition,
   Whisper API usw.).
2. **Einen LLM-Vermittler**, der Nutzertext, den `NAC.describe()`-Snapshot
   der Seite und einen i18n-Hinweis entgegennimmt und strukturierte
   Aktionen ausgibt: `[{kind: 'click', nac_id: 'X'}, {kind: 'fill', nac_id:
   'Y', value: 'Z'}]`. Siehe `guides/LLM_WIRING.md`.
3. **Einen Chat-Client**, der die Konversation führt und die Aktionen
   ausführt. Die Referenz ist `js/nac-chat-client.js`.
4. **Eine Text-to-Speech-Senke** für gesprochene Antworten (Browser
   SpeechSynthesis, ElevenLabs usw.).

NAC3 standardisiert nur die Ein-/Ausgabeform von Schritt 2 (den
`NAC.describe()`-Snapshot und das Aktionsformat). Schritte 1, 3 und 4
liegen außerhalb der Spec; Sie kombinieren, was Ihnen passt.

---

## 12. Stabilitätsgarantien

Was diese Spec zusichert:

1. Die Menge der kanonischen Rollen in Abschnitt 1 wird nicht kleiner.
   Neue Rollen DÜRFEN in Minor-Versionen hinzugefügt werden.
2. Die Event-Familie in Abschnitt 6 wird nicht umbenannt.
   Neue Events DÜRFEN in Minor-Versionen hinzugefügt werden.
3. Die Signaturen von `NAC.click`, `NAC.fill` usw. ändern sich in
   Minor-Versionen nicht. Neue optionale `opts`-Felder DÜRFEN erscheinen.
4. Die `validate_global`-Befundcodes werden in Minor-Versionen nicht
   für andere Bedingungen wiederverwendet.

Was diese Spec NICHT zusichert:

1. Den genauen Wortlaut von Fehlermeldungen (das sind i18n-Katalog-
   Strings; Lokalisierungen können sich ändern).
2. Die DOM-Strategie zum Auffinden von Elementen (`querySelector` heute;
   kann später auf einen schnelleren Index umgestellt werden).
3. Das interne Layout des Manifest-Cache. Manifeste sind aus Host-Sicht
   als schreibgeschützt, aus Agenten-Sicht als lesend zu behandeln.

---

## 13. Offene Fragen (separat verfolgt)

- Sollte `data-nac-role="navigation"` jemals zu einem Tab aufgelöst werden?
  Derzeit nein (v2.1). Die v22-Roadmap plädiert für eine strengere Ablehnung.
- Sollte `NAC.click()` relative IDs akzeptieren (z. B. `'./save'` für
  „save unter dem aktiven Plugin")? Nicht in v2.1; möglicherweise v2.3.
- Sollten Manifeste Vererbung/Erweiterung über Plugins hinweg unterstützen
  (ein Basis-Manifest, das von einem Tenant erweitert wird)? Wird als
  v3.0-Kandidat verfolgt.

---

## 13.5 Governance

NAC3 wird derzeit von Yujin betreut. Die Spec ist unter Apache 2.0
veröffentlicht; die Referenz-Laufzeitumgebung unter MIT. Yujin verpflichtet
sich, NAC3 in eine neutrale Stiftung (W3C Community Group, Linux Foundation
oder vergleichbare Branchenorganisation) zu überführen, sobald die Verbreitung
eine neutrale Governance rechtfertigt. Bis dahin folgen Spec-Änderungen dem
RFC-Prozess, der in `CONTRIBUTING.md` dokumentiert ist, mit einer öffentlichen
Kommentarfrist von mindestens 14 Tagen für jede Änderung, die die öffentliche
API oder die Wire-Formate betrifft.

Für Übernehmer gilt: Die Kombination aus Apache 2.0 und MIT stellt sicher,
dass Spec und Laufzeitumgebung jede Änderung im Unternehmensstatus von Yujin
überstehen. Sie können beides forken, betreiben und ausliefern – heute und
auch nach unserem Ausscheiden. Dieses Dokument hält die Zusage fest, damit
der Weg zu diesem Fortbestand explizit und nicht implizit ist.

---

## 14. Referenzimplementierung

Die kanonische Implementierung ist die Referenz-Laufzeitumgebung, die als
NPM-Paket `@nac3/runtime` vertrieben wird. Die Laufzeitumgebung ist für v2.1
vollständig und enthält:

- `js/nac.js` -- v1.9-Basis und die öffentliche API aus Abschnitt 5.
- `js/nac-v2-extensions.js` -- die v2.0-Brownfield-Primitive
  (Scope-Baum, ephemeres Capture, autoRegister, HMAC, isTrusted).
- `js/nac-chat-client.js` -- ein Referenz-Chat-Client, der
  Voice, LLM und Dispatcher verbindet.

Weitere Implementierungen sind willkommen (Python für native Automatisierungs-
Runner, Rust für eingebettete Agenten usw.). Die Spec, nicht der JavaScript-Code,
ist die maßgebliche Quelle.

---

*Dieses Dokument ist die kanonische NAC3-v2.1-Spezifikation. Änderungen an
dieser Datei stellen Spec-Änderungen dar und erfordern einen RFC; siehe
`CONTRIBUTING.md`.*

---

*This is a machine translation of the canonical English
version at `/nac-spec/SPEC.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
