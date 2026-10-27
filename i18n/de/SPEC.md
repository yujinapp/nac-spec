---
translation_source_hash: 13f2725d22ba29c84ddfdf58bac800d547f968b0f393d5cd9285cf1e2d4d0a0a
translation_quality: machine_v1
translation_date: 2026-10-27
translation_engine: anthropic/claude-opus-5 (Yujin Forge)
translation_normative: false
translation_status: complete
translation_lang: de
translation_source: SPEC.md
translation_source_version: 2.5.1
translation_source_date: 2026-10-27
translation_sections: 83
translation_sections_canonical: 83
translation_units: 282
translation_units_canonical: 282
translation_canonical_url: /nac-spec/SPEC.html
---

<!-- translation-banner: produced by scripts/build-translation-banners.mjs -->

> **Maschinelle Übersetzung, nicht normativ.** Sie übersetzt die englische Fassung vom 2026-10-27 (NAC3 v2.5.1) und deckt 83 von 83 Abschnitten des heutigen Originals ab. Der normative Text ist der englische: bei Abweichungen gilt der englische Text.
>
> *Non-normative machine translation. The normative text of NAC3 is the English one.*
>
> [Den normativen englischen Text lesen](/nac-spec/SPEC.html)

<!-- /translation-banner -->

# NAC3 -- Native Agent Contract

**Version:** 2.5.1 (stabil -- die vollständige v2.5-Oberfläche: narrate, context+tree, expect+diff)
**Status:** Stabile Veröffentlichung. Der npm-dist-tag `latest` zeigt hierher; Abschnitt 9.1 sagt, was das garantiert und was eine Vorabversion nicht garantiert. Dieses Dokument nennt seine Version an genau einer Stelle, in der Zeile darüber. Die veröffentlichten RFCs und ihre Nachweise auf Schicht 2 + Schicht 3 sind in `README.md` und `runtime/CHANGELOG.md` aufgeführt.
**Lizenz:** Apache-2.0
**Herausgeber:** Yujin (yujin.app)

---

## 0. Zweck

NAC3 ist ein Vertrag zwischen Web-Oberflächen und den Agenten, die sie
steuern. Zu den Agenten gehören Sprachausführer, LLM-Vermittler,
RPA-Bots, Barrierefreiheitswerkzeuge und End-to-End-Testausführer. Der
Vertrag legt fest:

1. **Wie Elemente benannt werden** -- damit ein Agent "klicke auf den
   Speichern-Knopf" sagen und das auf einen einzigen DOM-Knoten
   auflösen kann.
2. **Wie Verben angewandt werden** -- damit ein Agent `NAC.click(id)`,
   `NAC.fill(id, value)`, `NAC.tab(plugin, key)` usw. aufrufen kann,
   ohne Klebecode pro Anwendung.
3. **Wie der Abschluss signalisiert wird** -- damit ein Agent weiß,
   wann ein Schritt fertig ist, mit einer deterministischen
   Ereignisfamilie pro Rolle.
4. **Wie die Herkunft erhalten bleibt** -- damit ein nachgelagertes
   System einen echten Benutzerklick von einem synthetisierten
   unterscheiden kann.

NAC3 legt eine dünne Schicht über das Framework, mit dem du schon
rendert. Es ersetzt weder ARIA noch React, Vue oder dein Design-System.

---

## 1. Rollen

Jedes für einen Agenten relevante DOM-Element trägt `data-nac-role`.
Die kanonischen Rollen sind:

| Rolle | Bedeutung | Beispiel |
|------|---------|---------|
| `plugin` | Ein in sich geschlossenes Oberflächenmodul (eine Seite, ein Panel, eine Sammlung von Widgets). | `<article data-nac-plugin="invoice">` |
| `section` | Ein Orientierungspunkt innerhalb eines Plugins (Kopf, Körper, Fuß, Seitenleiste). | `<section data-nac-role="section">` |
| `region` | Ein benennbarer Bereich innerhalb eines Abschnitts (eine Kartengruppe, eine Ergebnisliste). | `<div data-nac-role="region">` |
| `action` | Ein klickbares Widget, das ein Verb auslöst (Knopf, Link als Knopf). | `<button data-nac-role="action" data-nac-action="save">` |
| `field` | Eine Eingabe, die der Benutzer tippt oder umschaltet (Text, Zahl, Kontrollkästchen, Radio, Datum, Datei). | `<input data-nac-role="field">` |
| `option` | Eine auswählbare Option innerhalb eines Feldes (Kind einer Combobox / eines Select / einer Radiogruppe). | `<li data-nac-role="option">` |
| `tab` | Ein umschaltbarer Panel-Wähler. **Pflicht, wenn `data-nac-id` auf `^tab\.` passt** | `<button data-nac-role="tab" data-nac-id="tab.lines">` |
| `breadcrumb-item` | Eine Stufe des Brotkrümelpfads. | `<a data-nac-role="breadcrumb-item">` |
| `accordion-toggle` | Ein Auf-/Zuklapp-Steuerelement. | `<button data-nac-role="accordion-toggle">` |
| `step` | Eine Schrittanzeige eines Assistenten. | `<li data-nac-role="step">` |
| `pagination-item` | Ein Seitensprung-Steuerelement in einer blätterbaren Liste. | `<button data-nac-role="pagination-item">` |
| `confirm-button` | Ein Bestätigen/Abbrechen-Knopf in einem Bestätigungsdialog. | `<button data-nac-role="confirm-button">` |
| `sort-control` | Eine Spaltenkopfzeile, die sortiert. | `<th data-nac-role="sort-control">` |
| `filter-control` | Ein Auslöser für einen Spaltenfilter. | `<button data-nac-role="filter-control">` |
| `data-table` | Der Host einer Datentabelle (seit 2.1). | `<table data-nac-role="data-table">` |
| `navigation` | Ein Navigationsbereich als Orientierungspunkt. **Kein Tab.** | `<nav data-nac-role="navigation">` |
| `confirm-dialog` | Der Modaldialog einer Bestätigungsanfrage. | `<div data-nac-role="confirm-dialog">` |
| `draggable` | Ein Element, das der Benutzer aufnehmen und verschieben kann (seit 1.6.2). | `<li data-nac-role="draggable">` |
| `drop-target` | Ein Ort, an dem ein `draggable` abgelegt werden kann (seit 1.6.2). | `<ul data-nac-role="drop-target">` |
| `button` | **Geduldet, nicht empfohlen.** Ein Altknopf, der nur klickbar sein muss, ohne Aktionsvertrag. Das Runtime behandelt ihn wie `action`. Bevorzuge `action` mit einem ausdrücklichen `data-nac-action`. | `<button data-nac-role="button">` |

Rollen außerhalb dieser Liste sind für die Zukunft reserviert. Ein
NAC-strict-Runtime SOLLTE unbekannte Rollen zum Zeitpunkt der
Registrierung ablehnen (v2.2). Ein NAC-permissive-Runtime DARF
unbekannte Rollen aus Rückwärtskompatibilität wie `action` behandeln
(das Standardverhalten in v1.9 und v2.0).

Diese Tabelle ist die normative Liste, und sie wird als Daten
veröffentlicht: der maschinenlesbare Katalog unter
`api/latest/contract.json` führt jede Rolle, die das
Referenz-Runtime annimmt, jede mit `declared_in_spec_table` markiert,
damit sich die beiden Listen ohne das Lesen von Prosa vergleichen
lassen. Sie stimmen zum Stand v2.5 überein. Jede künftige Abweichung
ist in dieser Markierung sichtbar, statt in einer
Meinungsverschiedenheit zwischen einem Dokument und einer
Implementierung versteckt zu sein.

---

## 2. Namen

Jedes von einem Agenten auflösbare Element trägt `data-nac-id`. Die id
ist:

- **Ein gepunkteter Pfad** (zum Beispiel
  `deals.list.row.42.actions.delete`). Die Punkte trennen semantische
  Ebenen; das Runtime deutet sie nicht, Menschen und LLMs aber schon.
- **Global eindeutig innerhalb des Geltungsbereichs eines
  `data-nac-plugin`.** Zwei verschiedene Plugins DÜRFEN eine id teilen;
  das Runtime löst über das Paar `(plugin, id)` auf.
- **Stabil über Neu-Renderings hinweg.** Frameworks, die bei jedem
  Rendering eine neue id erzeugen (Zufalls-Hashes, Instanzzähler),
  brechen den Vertrag.
- **Stabil über Neugestaltungen der Oberfläche hinweg.** Ein Knopf
  wandert von der Werkzeugleiste in ein Aufklappmenü; seine id MUSS
  dieselbe bleiben.

Reservierte id-Präfixe (seit 2.1):

| Präfix | Reserviert für |
|--------|--------------|
| `tab.` | Tab-Knöpfe. Die Rolle MUSS `tab` sein. |
| `modal.` | Elemente im Geltungsbereich eines Modaldialogs. Die Rolle ist die des Blatt-Widgets. |
| `field.` | Kurzform für ein Formularfeld. Die Rolle MUSS `field` oder `option` sein. |
| `confirm.` | Bestätigungsdialoge. |

---

## 3. Verben

Ein Element mit `data-nac-role="action"` DARF
`data-nac-action="<verb>"` tragen und damit benennen, was es tut. Das
Verb ist ein freier Bezeichner in snake-case, der zwischen Host und
Agent abgesprochen wird. Gängige Verben:

`save`, `cancel`, `submit`, `delete`, `edit`, `view`, `create`,
`approve`, `reject`, `send`, `download`, `upload`, `refresh`,
`expand`, `collapse`, `open`, `close`, `add_row`, `remove_row`.

`NAC.click_by_verb(plugin, verb)` löst ein Verb auf die eindeutige
Aktion unter diesem Plugin auf und klickt sie. Dass mehrere Aktionen
unter einem Plugin dasselbe Verb teilen, ist ein Manifestfehler (Lint:
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

Das Manifest ist die Quelle der Wahrheit, die dem Agenten zugewandt
ist. Ein LLM-Vermittler, der entscheidet "der Benutzer hat 'guardar'
gesagt", sieht im Plugin-Manifest nach, findet das Verb `save` und gibt
`NAC.click_by_verb('invoice', 'save')` aus.

### 4.1 Pflichtfelder

- `plugin_slug` -- entspricht dem `data-nac-plugin` des Host-Elements.
- `nac_version` -- die NAC3-Version, mit der dieses Manifest
  übereinzustimmen behauptet. Das Runtime lehnt Manifeste ab, die eine
  höhere Version als die eigene angeben.

### 4.2 Optionale Felder

- `elements[]` -- der Katalog der benannten Widgets. Jeder Eintrag MUSS
  `id` und `role` haben.
- `tabs[]` -- ein eigenes Array auf oberster Ebene, für Tabs.
  Gleichwertig mit Einträgen in `elements[]` mit `role:'tab'`. Beide
  Formen sind gültig.
- `fields[]`, `actions[]`, `kpis[]`, `data_tables[]` -- typisierte
  Untersammlungen; dieselbe Semantik wie `elements[]` nach Rolle
  gefiltert. Die Demos wählen die Form, die sich für Menschen am besten
  liest.

### 4.3 i18n

Jedes `label_i18n` MUSS alle 10 NAC3-Locales abdecken:

```
es, en, pt, fr, ja, zh, hi, ar, de, it
```

`i18n_strict: 'permissive'` bei `NAC.autoRegister.watch()` erlaubt
während einer Brownfield-Migration eine teilweise Abdeckung;
Produktionsmanifeste sollten alle 10 Locales ausliefern.

#### 4.3.1 Worauf sich die Anforderung der zehn Locales bezieht

Die Anforderung oben bezieht sich auf das **Manifest des Anwenders** --
die `label_i18n`-Tabelle, die ein Agent liest, um ein Element in der
Sprache des Benutzers zu benennen. Sie bezieht sich NICHT auf die
Sprache dieses Dokuments, und nichts in NAC3 verpflichtet eine
Implementierung, ihre eigene Dokumentation in zehn Sprachen zu
veröffentlichen.

#### 4.3.2 Normative Sprache dieser Spezifikation

Der normative Text von NAC3 ist der **englische**: die `SPEC.md` im
Wurzelverzeichnis des Spezifikations-Repositoriums, gerendert unter
`https://yujin.app/nac-spec/SPEC.html`.

Die Spezifikation wird außerdem als maschinelle Übersetzung unter
`i18n/<locale>/SPEC.md` veröffentlicht. Diese Übersetzungen sind
**nicht normativ**. Jede ist unvollständig, und jede ist auf dem
Quellstand eingefroren, den ihr eigener Hinweisbanner angibt; der
Banner ist Pflicht, und eine veröffentlichte Übersetzung ohne Banner
ist ein Mangel der Veröffentlichung, nicht der Übersetzung. Wo eine
Übersetzung und der englische Text voneinander abweichen, gilt der
englische Text, und eine Konformitätsaussage ist eine Aussage gegenüber
dem englischen Text.

---

## 5. Öffentliche API

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

### 5.1.1 Konformitätshelfer (v2.2)

`NAC.bindAction(el, handler, ctx)` ist der
spezifikationskonforme Weg, einen Klick-Handler anzubinden. Er gibt
`nac:action:succeeded` (oder `:failed`) automatisch aus, nachdem der
Handler gelaufen ist (synchron, mit Ausnahme oder als Promise). Er gibt
eine Funktion zum Abmelden zurück. Benutze ihn statt eines nackten
`addEventListener('click', ...)`, wann immer der Host es erlaubt;
Brownfield-Code kann das Ereignis weiterhin wie bisher von Hand
ausgeben.

### 5.1.3 Feld-Editor (v2.3)

`NAC.edit_field(nac_id)` öffnet einen Modaldialog, mit dem eine Person
(oder ein Agent in ihrem Namen) jedes Textfeld mit Werkzeugen im Stil
einer Textverarbeitung bearbeiten kann:

```ts
NAC.edit_field(nac_id: string): Promise<{ok:true}>
```

Der Dialog registriert sich unter `plugin_slug='nac_editor'` mit diesen
aus NAC3 aufrufbaren Verben:

| Verb | Wirkung |
|------|--------|
| `select_word` | das Wort an der Einfügemarke auswählen |
| `select_sentence` | den Satz an der Einfügemarke auswählen |
| `select_all` | Strg-A innerhalb des Editors |
| `replace` | die Auswahl durch den angegebenen Text ersetzen |
| `delete_selection` | die aktuelle Auswahl entfernen |
| `ai_correct_syntax` | den aktuellen Wert per POST an den LLM-Vermittler schicken, mit dem System-Prompt "fix grammar + spelling, return only fixed text"; den Wert durch die Antwort ersetzen |
| `save` | in das Quellfeld zurückschreiben, die Ereignisse input und change auslösen, schließen |
| `cancel` | verwerfen, schließen |

Esc schließt (bricht ab). Strg/Cmd+Enter speichert. Ein Klick auf den
Hintergrund der Überlagerung bricht ab.

Abschnitt 13 der Spezifikation wird den Vertrag in v2.3 formalisieren;
das v2.2-Runtime liefert eine funktionierende Referenzimplementierung,
damit Anwender sie schon heute anbinden können. Auf jedem Feld
verfügbar über:

```js
NAC.edit_field('invoice.client_name');
// or by intermediary:
NAC.click_by_verb('myplugin', 'edit_field', { nac_id: 'invoice.client_name' });
```

### 5.1.4 Aktions-Nutzlast + invoke (v2.3)

Aktionen in NAC v2.2 sind vom Typ Klick-und-fertig: ein Agent löst
`NAC.click(id)` oder `NAC.click_by_verb(plugin, verb)` aus, und der
Host tut, was er tut. Das funktioniert für Verb-und-Zustand-Aktionen
(`save`, `cancel`, `submit`, `delete`), bricht aber zusammen, wenn eine
Aktion **Daten** vom Agenten braucht -- `utter(text)`,
`search(query)`, `send_message(body)`, `upload(file)`,
`schedule(date)`, `translate(text, target_lang)`. Der Host hat keine
Möglichkeit, die Nutzlast des Agenten über einen synthetischen Klick zu
empfangen.

v2.3 schließt diese Lücke. Der Vertrag ist additiv: Verben im
Klick-Stil funktionieren unverändert weiter.

```ts
NAC.invoke(action_id: string, payload: object, opts?: { timeout?: number })
  : Promise<{ok: true, request_id: string, ack: object|null}>

NAC.utter(action_id: string,
          opts: { text: string, lang?: string, voice?: string, metadata?: object })
  : Promise<{ok: true, request_id: string, ack: object|null}>
```

`NAC.invoke` schickt ein `CustomEvent` `nac:action:requested` an das
Host-Element (es steigt bis zum document auf) mit:

```ts
detail: {
  action_id:  string,    // canonical nac_id of the host element
  verb:       string,    // payload.verb || el's data-nac-action
  payload:    object,    // arbitrary, action-specific
  plugin:     string|null,
  request_id: string,    // correlation token assigned by the runtime
  ts:         number,    // Date.now()
}
```

Der Host hört auf `nac:action:requested`, verarbeitet die Nutzlast und
gibt `nac:action:succeeded` (oder `nac:action:failed`) mit derselben
`request_id` im Detail aus. Das Runtime ordnet über die `request_id` zu
und löst das Promise des Agenten auf.

Die Standard-Zeitgrenze liegt bei **30 Sekunden** (gegenüber 5 s beim
Klick). Mit `opts.timeout` lässt sie sich ändern. Bei Ablauf wird das
Promise mit `NacError('timeout', ...)` abgelehnt. Wie beim Klick
bedeutet ein Ablauf ein echtes Scheitern: der Aufrufer MUSS ihn so
behandeln, es sei denn, er hat über einen anderen Kanal den Nachweis
der Wirkung.

`NAC.utter(id, opts)` ist die ergonomische Kurzform für das häufigste
Verb mit Nutzlast. Es ist gleichwertig mit:

```js
NAC.invoke(id, { verb: 'utter', text: opts.text, lang: opts.lang });
```

#### Angabe im Manifest

Eine Aktion, die eine Nutzlast trägt, gibt das Schema dieser Nutzlast
in ihrem Manifesteintrag an, zur Nachvollziehbarkeit und für die
Werkzeuge:

```js
NAC.register({
  plugin_slug: 'atlas_pro_ad',
  version:     '2.1.0',
  nac_version: '2.3',
  elements: [
    { id: 'atlas_pro_ad.mic', role: 'action',
      actions: [
        { verb: 'listen' },
        { verb: 'utter',
          payload_schema: {
            text: { type: 'string', required: true, max: 4000 },
            lang: { type: 'string',
                    enum: ['en','es','pt','fr','it','de','ja','zh','hi','ar'] }
          },
          label_i18n: { es:'Decir', en:'Utter', /* ... 10 locales */ } }
      ],
      label_i18n: { /* ... */ } }
  ]
});
```

`payload_schema` ist **zum Stand v2.5 nur informativ**, und das
Referenz-Runtime liest es überhaupt nicht: das Feld wird in einem
Manifest angenommen, in `NAC.manifest()` mitgeführt und niemals gegen
irgendetwas geprüft. `NAC.STRICT_VALIDATION` -- dessen Standardwert in
2.3.0 tatsächlich auf `true` umgestellt wurde -- deckt nur die Befunde
zu Manifest- und DOM-Rollen ab; Nutzlasten hat es nie abgedeckt. Ein
Agent DARF also NICHT annehmen, dass eine Nutzlast geprüft wurde, weil
ein Schema angegeben war: heute ist die einzige Prüfung, die
stattfindet, die, die der Agent vor dem Senden selbst vornimmt.

Die Schemata sind absichtlich einfach (eine Teilmenge in der Form von
JSON-Schema), damit ein Runtime prüfen kann, ohne einen vollständigen
JSON-Schema-Prüfer mitzuliefern, und das bleibt die Entwurfsabsicht für
den Tag, an dem die Prüfung erzwungen wird.

Eine frühere Fassung dieses Abschnitts versprach für die Version 2.4,
die Grammatik des Schemas zu formalisieren und die Erzwingung zum
Standard zu machen. **Das ist in 2.4 nicht passiert und ist es bis zur
2.5 nicht.** Der Satz wird entfernt statt neu datiert: ein Versprechen
mit einer angeklebten Versionsnummer, das über diese Version hinaus
stehen bleibt, liest sich für einen Agenten wie eine Fähigkeit, mit der
er rechnen kann. Die Grammatik zu formalisieren und die Erzwingung
anzuschließen, wird als offene Frage in Abschnitt 13 geführt, wo sie
als offen und ohne Datum steht.

#### Semantik des deaktivierten Zustands (v2.3-Korrektur aus alpha.2)

`NAC.invoke` lehnt NICHT ab, wenn das Zielelement `disabled` oder
`aria-disabled='true'` gesetzt hat. Das HTML-Attribut `disabled` ist
eine Klick-Sperre der Oberfläche; `invoke` ist eine logische Anfrage
mit Nutzlast, kein synthetischer Klick. Hosts, die ein invoke
aufgrund des Oberflächenzustands abweisen müssen, MÜSSEN das in ihrem
Zuhörer für `nac:action:requested` tun und `nac:action:failed` mit
einem Fehlercode ausgeben, der etwas bedeutet.

`NAC.click` lehnt dagegen WEITERHIN bei deaktivierten Elementen ab (die
Klick-Semantik bleibt erhalten). Testabdeckung:
`runtime/test/v23-invoke.mjs` T7/T8/T9.

#### Konformität: Hosts, die invoke unterstützen, MÜSSEN

1. `actions[].payload_schema` im Manifesteintrag angeben.
2. Auf `nac:action:requested` hören (oder einen allgemeinen Zuhörer
   verwenden, der nach `detail.action_id` + `detail.verb` filtert).
3. Nach der Verarbeitung `nac:action:succeeded` ausgeben -- mit
   unverändert zurückgegebener `detail.request_id` -- oder im
   Fehlerfall `nac:action:failed` (mit dem Code in `detail.error`).
4. NIEMALS ein `:succeeded`-Ereignis mit einer `request_id` ausgeben,
   die sie nicht empfangen haben (das verhindert Übersprechen zwischen
   gleichzeitigen Aufrufen).

Hosts, die invoke NICHT unterstützen, arbeiten unter `NAC.click()` und
`NAC.click_by_verb()` normal weiter. Agenten, die `NAC.invoke()` gegen
einen Host ohne `actions[].payload_schema`-Eintrag aufrufen, erhalten
trotzdem eine `request_id`, aber das Runtime kann die Zustellung nicht
garantieren; die Zeitgrenze greift nach 30 s.

#### Warum das wichtig ist

Die gesamte agentische Oberfläche ist nicht mehr "eine Liste von
Knöpfen", sondern "eine Liste von Knöpfen + strukturierte Eingaben".
Eine Sprachanzeige wird über NAC.invoke aufrufbar. Eine Suchleiste wird
über NAC.invoke aufrufbar. Ein Datei-Upload wird über NAC.invoke
aufrufbar. Dasselbe Protokoll, dieselbe Herkunft, dieselbe
Bestätigungssemantik.

Der erste Referenzanwender ist **Atlas Pro**: sein Element
`atlas_pro_ad.mic` gibt sowohl das Verb `listen` (nur Klick, schon
vorhanden) als auch `utter` (mit Nutzlast) an. Dieselbe
Gesprächsschleife aus `/parse` + `/tts` steuert in beiden Fällen;
Agenten mit Spracherkennung rufen `listen`, Agenten mit eigenem
Sprachmodell rufen `utter`.

#### Künftige Modalitäten (vorgesehen, ohne Spezifikationsänderung)

`invoke` ist absichtlich modalitätsagnostisch, damit künftige
Eingabefamilien sich anschließen lassen, ohne den Vertrag zu brechen:

| Modalität | Verb (Skizze)         | Nutzlast (Skizze)                                |
|----------|-----------------------|--------------------------------------------------|
| Text     | `utter`               | `{text, lang?}`                                  |
| Suche    | `search`              | `{query, scope?, limit?}`                        |
| Datei    | `upload`              | `{filename, mime, data_url \| stream_id}`        |
| Bild     | `analyze_image`       | `{image_url \| data_url, prompt?}`               |
| Video    | `analyze_stream`      | `{stream_url, frame_window_ms?, return?}`        |
| Termin   | `schedule`            | `{datetime, duration_min, attendees?}`           |
| Code     | `apply_diff`          | `{file_path, unified_diff}`                      |
| Stimme   | `transcribe`          | `{audio_url \| data_url, lang?}`                 |

Jede Modalität folgt demselben Ereignisprotokoll
`nac:action:requested` -> `nac:action:succeeded` / `:failed`,
derselben Zuordnung über `request_id`, derselben Semantik der
Zeitgrenze. Das Runtime bleibt klein; der Wortschatz der Verben wächst
per Konvention zwischen Hosts und Agenten. Ergonomische Kurzformen
(`NAC.utter`, `NAC.search`, `NAC.watch` usw.) lassen sich später
hinzufügen, ohne etwas neu zu spezifizieren, weil jede eine dünne Hülle
über `invoke` ist.

### 5.1.5 Auflösung im Shadow DOM -- offene Wurzeln (v2.3)

Das Runtime löst `data-nac-id`-Verweise rekursiv durch offene
Shadow-Wurzeln hindurch auf. Eine Seite kann Web Components mit
`attachShadow({mode:'open'})` einhängen, `data-nac-*`-Attribute auf
Elemente innerhalb des Shadow-Baums setzen, und jeder NAC3-Aufrufer
(`NAC.click`, `NAC.fill`, `NAC.invoke` usw.) löst das Ziel
durchsichtig auf.

#### Auflösungsalgorithmus

Für einen Selektor `S` (typischerweise `[data-nac-id="..."]`) gegen
eine Wurzel `R` (typischerweise `document`):

1. `R.querySelector(S)` -> wenn nicht null, sofort zurückgeben.
2. Für jeden Nachkommen `el` von `R`:
   - Wenn `el.shadowRoot` nicht null ist (also eine offene
     Shadow-Wurzel): Rekursion mit `R := el.shadowRoot`, Tiefe +1.
   - Sonst, wenn `el.nac3` ein Objekt ist, das eine Methode `query`
     anbietet, delegieren (siehe Abschnitt 5.1.6).
3. Die Rekursion ist **auf 10 Ebenen Tiefe begrenzt**. Ziele tiefer
   als 10 sind unerreichbar; der Aufrufer erhält
   `code='not_found'`. Die Grenze gibt es, um krankhafte Durchläufe zu
   verhindern; in der Praxis verschachtelt keine Produktions-Codebasis
   mehr als 3-4 Shadow-Ebenen.
4. Der Durchlauf folgt der DOM-Reihenfolge in die Breite:
   Geschwister vor verschachtelten Shadows. Der erste Treffer gewinnt.

#### Ereignisweitergabe

Ereignisse, die Hosts innerhalb von Shadow-Wurzeln ausgeben, MÜSSEN
`composed: true` setzen, damit Zuhörer auf Dokumentebene sie
empfangen. Das NAC3-Runtime gibt alle eigenen Ereignisse schon mit
`composed:true` aus; Host-Code, der `nac:*`-Ereignisse von Hand
ausgibt, ist für dasselbe verantwortlich. Ohne `composed:true` bleibt
das Ereignis an der Shadow-Grenze stehen, und die Zuordnungsmechanik
des Runtime sieht es nie.

#### Verantwortung der Komponentenautorin

Wer die Komponente schreibt, muss:

1. `data-nac-id`, `data-nac-role`, `data-nac-action` auf die
   bedienbaren Elemente innerhalb der Shadow-Wurzel setzen.
2. `composed:true` auf jedem eigenen Ereignis setzen, das der Host
   ausgibt, um einen NAC3-Vertrag zu signalisieren
   (`nac:action:succeeded`, `nac:field:changed` usw.).
3. `<slot>` für Elemente vermeiden, die im Shadow abgeschottet bleiben
   müssen -- in einen Slot gestellte Knoten leben im Light DOM und
   werden dort aufgelöst.

Für offene Shadow-Wurzeln braucht es keinen Hinweis im Manifest und
keine Freischaltung im Runtime; die Auflösung passiert automatisch.

#### Referenzimplementierung

Das Referenz-Runtime bietet zwei interne Helfer,
`_deepQuery(selector, root)` und `_deepQueryAll(selector, root)`, die
den Durchlauf erledigen. Die öffentlichen Helfer `NAC.click`,
`NAC.fill`, `NAC.invoke`, `NAC.describe` usw. gehen alle über die
tiefen Varianten.

#### Demos und Tests

- `example-v23-shadow-open.php` -- Demos für offenes Shadow,
  verschachtelt auf 1, 2 und 3 Ebenen.
- `runtime/test/v23-shadow.mjs` T1-T3, T10 -- Unit-Abdeckung,
  einschließlich der Tiefengrenze.

### 5.1.6 Auflösung im Shadow DOM -- geschlossene Wurzeln, freiwillige Offenlegung (v2.3)

Geschlossene Shadow-Wurzeln (`attachShadow({mode:'closed'})`) sind von
außerhalb des Codes der Komponentenautorin undurchsichtig: das ist eine
Sicherheitsgrenze des Browsers, keine Entscheidung von NAC3. NAC3 kommt
nicht hinein, solange die Komponentenautorin nicht freiwillig über den
Vertrag unten eine abfragbare Oberfläche offenlegt.

#### Der Schnittstellenvertrag `el.nac3`

Ein eigenes Element DARF über einen Getter namens `nac3` ein
Schnittstellenobjekt an seinem Host anbieten:

```ts
interface NAC3HostInterface {
  query(selector: string): Element | null;        // MANDATORY
  queryAll(selector: string): Element[];          // RECOMMENDED
  describe?(): Array<{                            // OPTIONAL
    id:    string;
    role:  string;
    action?: string;
    label?: string;
  }>;
}
```

Komponenten machen mit, indem sie den Getter umsetzen. Komponenten, die
NICHT mitmachen, bleiben für NAC3-Aufrufer unerreichbar (ihre
Innereien bleiben privat, wie der Browser es vorsieht).

#### Semantik der Auflösung

Während `_deepQuery(selector)`, für jedes besuchte Element `el` mit
`el.shadowRoot === null`:

1. Wenn `typeof el.nac3 === 'object'` ist und `el.nac3.query` eine
   Funktion ist, ruft das Runtime `el.nac3.query(selector)` auf:
   - Der Rückgabewert ist ein Element -> aufgelöst.
   - Der Rückgabewert ist `null` -> kein Treffer in diesem Shadow.
   - Der Rückgabewert ist irgendetwas anderes ->
     `nac:shadow_protocol_violation` ausgeben (einmal pro Host) und
     überspringen.
   - Es wird eine Ausnahme geworfen -> `nac:shadow_blocked` ausgeben
     (Grund `'exposure_threw'`, einmal pro Host) und überspringen.
2. Sonst, wenn `el.hasAttribute('data-nac-shadow') === true` ist und
   der Attributwert `'closed'` lautet UND keine `nac3`-Schnittstelle
   vorhanden ist, gibt das Runtime `nac:shadow_blocked` aus (Grund
   `'not_exposed'`, einmal pro Host). Das ist das Mitmachen der
   Autorin beim Debug-Signal "ich bin eine absichtlich geschlossene
   Komponente".
3. Sonst: das Element wird als normales Light-DOM-Element ohne
   Shadow-Wurzel behandelt.

#### Form des Details der Fehlerereignisse

Detail von `nac:shadow_blocked`:

```ts
{
  host:   Element,     // the closed-shadow host
  reason: 'exposure_threw' | 'not_exposed',
  ts:     number       // Date.now()
}
```

Detail von `nac:shadow_protocol_violation`:

```ts
{
  host:           Element,
  message:        string,            // diagnostic message
  value_snapshot: string,            // truncated value preview
  ts:             number
}
```

Beide Ereignisse steigen auf (`bubbles: true`) und überschreiten
Shadow-Grenzen (`composed: true`). Die Entdopplung erfolgt pro Host
über ein WeakSet, das das Runtime führt; derselbe Host gibt jedes
Ereignis **höchstens einmal pro Seitenaufruf** aus.

#### Warum freiwillig

Die Undurchsichtigkeit geschlossener Shadows erzwingt der Browser.
Selbst wenn NAC3 einen unfreiwilligen Mechanismus festlegen würde,
würde der Browser ihn verhindern. Die freiwillige Offenlegung lässt der
Komponentenautorin die vollständige Kontrolle darüber, wie ihre
öffentliche Oberfläche für Agenten aussieht.

Der Preis ist das Mitmachen pro Komponente; der Nutzen ist, dass
NAC3-konforme Agenten gegen Design-Systeme mit geschlossenen
Shadow-Komponenten funktionieren (Salesforce Lightning, einige
Komponenten von GitHub Primer, sicherheitskritische Widgets), ohne
Adaptercode pro Komponente.

#### Demos und Tests

- `example-v23-shadow-closed.php` -- der positive Fall
  (`<todo-card-closed-exposed>`) und der negative
  (`<todo-card-closed-blind>`) nebeneinander, mit Urteilsfeldern +
  laufendem Ereignisprotokoll.
- `runtime/test/v23-shadow.mjs` T4-T9 -- Unit-Abdeckung für jede
  Familie von Fehlerereignissen, dazu die Semantik der Entdopplung.
- `guides/SHADOW_DOM_CLOSED.md` -- Leitfaden für Komponentenautoren.

### 5.1.7 Berechtigungsbewusste Fähigkeiten (v2.3)

NAC3 v2.3 erlaubt dem Manifest, je Aktion die verlangten Fähigkeiten
anzugeben, und sperrt damit `NAC.click` und `NAC.invoke` schon vor dem
Versand. Der Agent erhält eine schnelle Ablehnung
(`code='capability_required'`) statt eines Hin und Her, das
serverseitig scheitert.

#### Angabe im Manifest

Eine Fähigkeitsanforderung hängt sich auf Elementebene oder auf
Verbebene an. Sind beide vorhanden, gewinnt die auf Verbebene.

```js
NAC.register({
  plugin_slug: 'fin',
  version:     '1.0.0',
  nac_version: '2.3',
  elements: [
    // Element-level (covers all verbs on this id).
    { id: 'fin.invoice.delete', role: 'action',
      requires_capability: 'finance.delete_invoice',
      actions: [{ verb: 'delete' }] },

    // Verb-level (more granular).
    { id: 'fin.invoice.edit', role: 'action',
      actions: [
        { verb: 'edit',
          requires_capability: 'finance.edit_invoice' },
        { verb: 'view',
          /* no capability -> always allowed */ }
      ] },

    // Array value: OR semantics.
    // ("at least one of these capabilities matches")
    { id: 'fin.invoice.approve', role: 'action',
      requires_capability: ['finance.approve',
                            'finance.admin'],
      actions: [{ verb: 'approve' }] }
  ]
});
```

Für eine UND-Semantik ("der Benutzer braucht ALLE diese Fähigkeiten")
gib jede über getrennte gesperrte Aktionen an, oder setze es auf der
Host-Seite im Zuhörer für `nac:action:requested` zusammen.

#### Öffentliche API

```ts
NAC.setCapabilities(caps: string | string[] | null): void
NAC.grantCapability(cap: string): void
NAC.revokeCapability(cap: string): void
NAC.userCapabilities(): string[]
```

`setCapabilities` ersetzt die ganze Menge (für Anmeldung oder
Sitzungserneuerung). `grantCapability` / `revokeCapability` arbeiten
schrittweise. `userCapabilities` gibt ein Array als Momentaufnahme
zurück. `setCapabilities(null)` leert die Menge.

Hosts rufen das auf, wann immer sich die Rolle des Benutzers ändert.
Die Menge lebt im Runtime; kein Neuladen eines Manifests ist nötig.

#### Semantik der Sperre

Vor dem Versand suchen `NAC.click(id)` und `NAC.invoke(id, payload)`
den passenden Manifesteintrag (Element + Verb), lesen
`requires_capability` und rufen `_hasCapability` auf:

- Keine Anforderung angegeben -> erlaubt.
- Anforderung angegeben und die aktuelle Menge erfüllt sie ->
  erlaubt.
- Anforderung angegeben und die aktuelle Menge erfüllt sie NICHT ->
  Ablehnung mit `NacError('capability_required', ...)` UND Ausgabe von
  `nac:command:rejected` mit
  `detail.reason='capability_required'`.

Die Sperre läuft bei `click` NACH den Prüfungen auf `not_found` /
`disabled` / `hidden`, damit das genaueste Scheitern nach oben kommt.
Bei `invoke` läuft die Sperre, bevor das Anfrageereignis losgeht (der
Host sieht nie einen unberechtigten Versuch).

#### Warum das wichtig ist

Ohne die Sperre hat ein Agent, der `NAC.click('finance.delete')`
aufruft, entweder Erfolg (gar keine Berechtigungssperre ->
Sicherheitsloch) oder er scheitert serverseitig mit einem 403, mehrere
Sekunden später. Mit der Sperre erfährt der Agent synchron, dass ihm
die Fähigkeit fehlt, und kann angemessen reagieren (einen anderen
Ablauf anfragen, eine Rechteerhöhung erbitten, die Einschränkung dem
Benutzer zeigen).

Das ergänzt die serverseitige Berechtigungsprüfung -- es ersetzt sie
nicht. Hosts MÜSSEN die Rechte weiterhin auf dem Server durchsetzen.
Die Sperre auf dem Client ist eine Verbesserung der Bedienung und ein
Signal auf Absichtsebene, keine Sicherheitsgrenze.

#### Demos und Tests

- `runtime/test/v23-capabilities.mjs` -- 17 Zusicherungen, die das
  Setzen und Lesen der Menge, das Erteilen und Entziehen, die
  Klick-Sperre, die invoke-Sperre, die Auflösung zwischen Verbebene und
  Elementebene, die ODER-Semantik, das Leeren mit null, die Ablehnung
  ungültiger Eingaben und die Regression der ungesperrten Aktionen
  abdecken.

### 5.1.2 Schalter für strenge Prüfung (v2.2; Standardwert in v2.3 umgestellt)

`NAC.STRICT_VALIDATION` (boolesch). Wenn er `true` ist, wirft
`NAC.register()` einen `Error` mit `code='strict_validation'` und
einem Array `findings` in jedem dieser Fälle:

- `manifest_role_unknown` -- die Rolle des Eintrags liegt außerhalb der
  kanonischen Menge.
- `tab_id_manifest_role_drift` -- die id passt auf `^tab\.`, aber die
  Rolle ist nicht `'tab'`.
- `manifest_dom_role_mismatch` -- das `data-nac-role` des im DOM
  eingehängten Elements unterscheidet sich von der Rolle des
  Manifesteintrags.

**Standardwert:**

- **v2.2.x:** `false` (nur Warnung). Anwender brauchten ein
  Migrationsfenster.
- **v2.3.x:** **`true`** (wirft). Das Migrationsfenster schloss mit der
  v2.2-Linie. Anwender mit abweichungsbeladenen Manifesten steigen aus,
  indem sie `NAC.STRICT_VALIDATION = false` setzen, BEVOR irgendein
  `register()` aufgerufen wird.
- **v3.0:** der Schalter verschwindet (streng ist der einzige Modus).

Siehe `guides/MIGRATION_v2.2_to_v2.3.md` für das Drehbuch zum
Aufräumen der Abweichungsbefunde.

Alle asynchronen Methoden lehnen mit einem `NacError` ab, dessen `code`
einer der folgenden ist:

- `not_found` -- das genannte Element, die genannte Rolle oder das
  genannte Verb ist nicht im DOM.
- `invalid` -- die Form des Arguments ist falsch.
- `disabled` -- das Element hat `disabled` oder
  `aria-disabled='true'` (nur `NAC.click`; `NAC.invoke` prüft seit der
  v2.3-Korrektur nicht mehr, siehe Abschnitt 5.1.4).
- `hidden` -- das Element ist außerhalb des Bildschirms, hat
  `aria-hidden='true'` oder die Größe null.
- `capability_required` -- das Manifest hat `requires_capability`
  angegeben, und die aktuelle Menge von `NAC.userCapabilities()`
  erfüllt es nicht (v2.3, siehe Abschnitt 5.1.7).
- `timeout` -- die Wirkung wurde losgeschickt, aber das
  Konformitäts-Bestätigungsereignis kam nicht innerhalb von 5 Sekunden
  an (30 Sekunden bei `invoke`). **Ein Ablauf bedeutet ein echtes
  Scheitern**: der Handler kann hängen geblieben sein, die Bestätigung
  kann nie angeschlossen worden sein, es kann ein Netzwerkwettlauf
  gewesen sein. Aufrufer MÜSSEN den Ablauf als Scheitern behandeln, es
  sei denn, sie haben über einen anderen Kanal den Nachweis der
  Wirkung.

### 5.2 Introspektion

```ts
NAC.describe():    { active: string|null, plugins: PluginSnap[] }
NAC.describe_v2(): { v2_scope_entries: [...], sitemap: ..., data_tables: [...] }
NAC.manifest(plugin_slug: string): Manifest|null
NAC.validate_global(opts?: {probe?: boolean}): GlobalReport   // named buckets, see 10.1
```

### 5.3 Datentabellen (seit 2.1)

Die Primitive für Datentabellen sind NICHT Teil des Kern-Runtime
(`js/nac.js` / das `nac.mjs` von `@nac3/runtime`). Sie kommen im
Brownfield-Erweiterungsmodul `js/nac-v2-extensions.js` (veröffentlicht
als `@nac3/runtime/extensions`), das sie nach dem Laden an dasselbe
`window.NAC`-Objekt anhängt. Lade das Erweiterungsmodul nach dem
Kern-Runtime, um die `dt_*`-Oberfläche zu bekommen:

```html
<script src="https://yujin.app/nac-spec/js/nac.js"></script>
<script src="https://yujin.app/nac-spec/js/nac-v2-extensions.js"></script>
```

```js
// or with the npm package:
import '@nac3/runtime';
import '@nac3/runtime/extensions';
```

Die Methoden unten gibt es nur, wenn das Erweiterungsmodul geladen ist;
sie auf einem Runtime mit nur dem Kern aufzurufen tut nichts / gibt
`undefined` zurück.

```ts
NAC.registerDataTable(spec: DataTableSpec): string   // returns table_id
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

Eine Datentabelle hat eine `subkind`:

- `collection` -- geordnete Zeilen, mit optionaler transaktionaler
  Übernahme. Für Rechnungszeilen, Warenkorbposten, Protokolleinträge.
- `matrix` -- ein Gitter aus Zeile x Spalte, in dem jede Zelle einen
  Wert trägt. Für Berechtigungsmatrizen, Stundenpläne.
- `matrix-singletree` -- eine Matrix, in der jede Zeile zu einem Baum
  zusammenklappt (selten).

---

### 5.4 Strenge Auflösung + Vereindeutigung (v2.4)

NAC3 v2.4 macht die Auflösung von id, Verb, Qualifizierer und Label
**streng**. Die Verben, die eine Anfrage auf ein einziges DOM-Element
auflösen -- `click_by_verb`, `tab` (die Form mit einem Argument) und
`tab_by_label` -- raten nicht mehr. Wenn eine Anfrage auf null
Kandidaten oder auf mehr als einen auflöst, wirft das Runtime einen
`NacError`, der die Kandidatenliste mitführt, UND gibt ein Ereignis
`nac:disambiguation_requested` aus, statt still an den ersten
Beinahe-Treffer zu schicken.

Das ist die Invariante **null stiller Schaden**. Sie existiert für
Hilfssoftware und für Agenten, wo ein stiller Versand an das falsche
Element ohne Weg zurück ein Sicherheitshindernis ist. Das
nachgiebige Verhalten vor 2.4 -- ein Rückfall über `indexOf` auf
Teilstrings, der auf den ersten Beinahe-Treffer auflöste -- ist
entfernt.

> Rückwärtskompatibilität: v2.4 ist eine Änderung des
> *Vertragsverhaltens*. Codewege, die schon eindeutige Argumente
> übergaben, arbeiten unverändert weiter. Codewege, die sich auf den
> nachgiebigen `indexOf`-Rückfall verließen, um auf den ersten
> Beinahe-Treffer aufzulösen, werfen jetzt -- so gewollt.

#### 5.4.1 Strenger Abgleich des Qualifizierers (`click_by_verb`)

`click_by_verb(plugin, verb, opts?)` wählt unter den DOM-Knoten, die
`data-nac-action="<verb>"` teilen. Wenn `opts.qualifier` (eine
Zeichenkette) übergeben wird, passt ein Element **nur**, wenn sein
`data-nac-id` Folgendes erfüllt:

```js
id === qualifier || id.endsWith('__' + qualifier)
```

Das heißt: genaue Gleichheit der id, oder ein verankertes Suffix nach
einem Trenner `__`. **Es gibt keinen Rückfall auf Teilstrings.** Ein
Qualifizierer, der bloß ein Teilstring einer id ist (nicht gleich, kein
verankertes `__suffix`), passt NICHT.

- 0 Treffer -> wirft `NacError('no_matching_instance', ...)`.
- genau 1 Treffer -> löst auf und klickt.
- >1 Treffer -> wirft `NacError('ambiguous_qualifier', ...)`.

`opts.qualifier_ordinal` (eine Zahl) wählt nach Position unter allen
DOM-Elementen, die das Verb teilen, und umgeht den Abgleich des
Qualifizierers.

#### 5.4.2 Strenge Auflösung der id (`tab`)

Form mit einem Argument von `tab(plugin, id)`: ein genauer Treffer auf
`data-nac-id` im DOM gewinnt. Sonst sucht das Runtime Instanzen, deren
id mit `id + "__"` beginnt:

- 0 qualifizierte Instanzen und keine genaue id ->
  `no_matching_instance`.
- genau 1 -> löst auf.
- >1 -> `ambiguous_tab` (übergib die vollständige qualifizierte id).

#### 5.4.3 Strenge Auflösung über das Label (`tab_by_label`)

`tab_by_label(plugin, label)` löst ein für Menschen lesbares Label auf
einen Tab auf und versucht dabei, in dieser Reihenfolge: genauer
Treffer auf das Label im Manifest, unscharfer oder Teilstring-Treffer
im Manifest, genauer Treffer auf den DOM-Text, unscharfer Treffer auf
den DOM-Text. Liefert irgendeine dieser Stufen mehr als einen Treffer,
wirft sie `NacError('ambiguous_label', ...)`; passt keine Stufe, wirft
sie `NacError('not_found', ...)`. Das Feld `reason` des ausgegebenen
Ereignisses hält fest, welche Stufe mehrdeutig war
(`ambiguous_label_exact`, `ambiguous_label_fuzzy`,
`ambiguous_label_exact_dom`, `ambiguous_label_fuzzy_dom` oder
`no_matching_label`).

#### 5.4.4 Fehlercodes

| `err.code` | Geworfen von | Bedeutung |
|------------|-----------|---------|
| `no_matching_instance` | `click_by_verb` (Qualifizierer), `tab` | kein Element passt auf den Qualifizierer / die id |
| `ambiguous_qualifier`  | `click_by_verb` | mehr als 1 Element passt auf den Qualifizierer |
| `ambiguous_tab`        | `tab`           | mehr als 1 qualifizierte `id__`-Instanz passt |
| `ambiguous_label`      | `tab_by_label`  | mehr als 1 Tab passt auf das Label (auf irgendeiner Stufe) |
| `not_found`            | `tab_by_label`  | kein Tab passt auf das Label |

#### 5.4.5 Die Form von `err.candidates`

Jeder Vereindeutigungsfehler führt ein Array `candidates` mit. Jeder
Kandidat ist genau:

```ts
{ nac_id: string, label: string }
```

`nac_id` ist das `data-nac-id` des Elements. `label` wird aufgelöst,
indem `aria-label` bevorzugt wird, dann der beschnittene `textContent`
(auf 120 Zeichen gekürzt), und zuletzt auf das `data-nac-id`
zurückgefallen wird. Die Liste ist gegen das DOM geprüft: sie nennt die
echten Elemente, aus denen der Aufrufer wählen kann. `NacError` führt
`candidates` in den geworfenen `Error` zusammen, sodass `err.code`,
`err.message` und `err.candidates` alle drei gefüllt sind.

#### 5.4.6 Das Ereignis `nac:disambiguation_requested`

Immer wenn ein Aufruf der strengen Auflösung scheitert (kein Treffer
ODER zu viele Treffer), schickt das Runtime ein `CustomEvent`
`nac:disambiguation_requested` an `document`, *zusätzlich* zum Werfen
der Ausnahme. Die Ausgabe erfolgt nach bestem Bemühen: scheitert der
Versand, wirft das Runtime trotzdem.

```ts
document.addEventListener('nac:disambiguation_requested', (e) => {
  e.detail; /* {
    method:     'click_by_verb' | 'tab' | 'tab_by_label',
    plugin:     string | null,
    query:      { verb?, qualifier?, label?, id? },
    reason:     string,   // finer-grained than err.code (see 5.4.3)
    candidates: Array<{ nac_id: string, label: string }>,
  } */
});
```

#### 5.4.7 Wie ein Aufrufer vereindeutigt

Mit der Kandidatenliste in der Hand (aus `err.candidates` oder
`event.detail.candidates`) wählt der Aufrufer einen aus und schickt
erneut, auf einem dieser Wege:

1. **Die vollständige `nac_id`** -- `NAC.click(candidate.nac_id)`. Das
   ist der kanonische Weg zurück: der Kandidat trägt die genaue id
   schon mit sich.
2. **Das verankerte `__suffix`** -- übergib `click_by_verb` das genaue
   Suffix der Instanz als Qualifizierer.
3. **`opts.qualifier_ordinal`** -- Auswahl nach Position unter den
   Elementen, die das Verb teilen (in DOM-Reihenfolge).

Das ausgearbeitete Beispiel ist `example-v24-disambiguation.php`; der
Vertrag ist durch `runtime/test/stage2-disambiguation.mjs` und
`runtime/test/stage7-strict-resolution.mjs` abgedeckt.

---

## 6. Ereignisse

Jede Aktion gibt ein deterministisches Abschlussereignis aus. Das
`NAC.click()` des Runtime wartet auf dieses Ereignis und löst auf, wenn
es losgeht.

| Rolle | Erfolgsereignis | Fehlerereignis |
|------|---------------|---------------|
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

### 6.1 Form des Ereignisdetails

Das Detail jedes Ereignisses trägt das kanonische id-Feld, dazu
`plugin`:

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

### 6.2 Ausgeben aus einem Host-Handler

Ein Klick-Handler MUSS nach seiner synchronen Wirkung das passende
Erfolgsereignis ausgeben:

```js
button.addEventListener('click', function (ev) {
  // ... do the work ...
  document.dispatchEvent(new CustomEvent('nac:action:succeeded', {
    detail: { plugin: 'invoice', action_id: 'invoice.save' }
  }));
});
```

Ist die Arbeit asynchron, gib nach dem Auflösen aus. Scheitert die
Arbeit, gib `nac:action:failed` mit `{detail: {plugin, action_id,
error: <message>}}` aus.

Das v2.2-Runtime wird `NAC.bindAction(el, handler, ctx)`
bereitstellen, das `addEventListener` umhüllt und automatisch ausgibt.

### 6.3 Warum nicht das Klick-Ereignis selbst nehmen?

Ein DOM-`click`-Ereignis geht los, bevor der Handler läuft. Der Vertrag
von NAC3 muss wissen, wann **die Wirkung abgeschlossen ist**, nicht
wann der Klick begann. Daher die getrennte Ereignisfamilie.

---

## 7. Herkunft

### 7.1 isTrusted

`event.isTrusted` ist `true` bei Klicks, die eine Person ausgelöst hat
(echte Maus, echter Tastendruck, Auslösen durch einen Screenreader),
und `false` bei synthetisierten Klicks (`element.click()`, das
dispatchEvent eines selbst gebauten MouseEvent, Automatisierung).

NAC3 MUSS das über `event.detail.is_trusted` im Erfolgsereignis
sichtbar machen. Hosts, die sicherheitskritische Aktionen ausführen
(Bezahlung, Löschung), DÜRFEN `is_trusted === true` verlangen und
synthetische Klicks abweisen. Die Referenzdemo
`example-v20-full.php` enthält ein Knopfpaar
(`v20_panel.istrusted_real` und `v20_panel.istrusted_fake`), das den
Unterschied zeigt.

### 7.2 Mit HMAC unterzeichnete Manifeste

Ein Manifest DARF einen `provenance`-Block tragen:

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

Das Runtime berechnet den erwarteten HMAC über eine stabile
Serialisierung des Manifests (ohne die Unterschrift selbst) und lehnt
Manifeste ab, deren Unterschrift nicht passt. Wird von
mehrmandantenfähigen Installationen genutzt, um zu verhindern, dass ein
Mandant das Manifest eines anderen fälscht.

### 7.3 Bedrohungsmodell

Siehe `SECURITY.md` für das vollständige Bedrohungsmodell. Die kurze
Fassung:

- NAC3 authentisiert nicht den **Benutzer**. Das ist die Aufgabe
  deiner Authentisierungsschicht.
- NAC3 authentisiert das **Manifest** (HMAC).
- NAC3 unterscheidet echte Klicks von synthetisierten (isTrusted),
  damit ein Host die zweiten bei sensiblen Verben abweisen kann.
- NAC3 schützt nicht vor einem bösartigen Agenten, der mit dem Zugriff
  des Benutzers läuft. So ein Agent kann alles, was der Benutzer kann.

---

## 8. Konformitätsstufen

Eine Stufe schreibt sich **NAC3 Conformance Level 1**, **2** oder
**3**. Der Name einer Stufe ist nicht der Name des Protokolls: ein
Prüfer, ein Bericht oder eine Konformitätsaussage MUSS eine Stufe über
den Bezeichner `nac3-conformance-level-<1|2|3>` nennen, der in
`api/latest/levels.json` veröffentlicht ist, niemals über einen
Anzeigenamen. Abschnitt 8.1 hält die Namen fest, die diese Stufen vor
2.5.0 trugen.

Eine Seite ist auf **NAC3 Conformance Level 1**, wenn:

- Jedes klickbare Widget, das ein Agent bedienen können sollte,
  `data-nac-id` und `data-nac-role` trägt.
- Jedes Element mit `data-nac-role="action"` nach seiner Wirkung
  `nac:action:succeeded` auslöst.
- Die Seite mindestens ein Plugin-Manifest über `NAC.register()`
  registriert.
- `NAC.click(id)` für jede angekündigte id funktioniert.

Eine Seite ist auf **NAC3 Conformance Level 2**, wenn sie außerdem:

- Die Arrays `tabs[]`, `fields[]`, `actions[]` ausdrücklich in ihrem
  Manifest registriert (nicht aus dem DOM abgeleitet).
- `label_i18n` für jedes dem Benutzer sichtbare Label mit allen 10
  NAC3-Locales bereitstellt.
- Die Brownfield-Primitive von v2.0 umsetzt: Geltungsbereichsbaum,
  flüchtige Erfassung, autoRegister.watch.
- `NAC.validate_global({probe: false})` mit null Befunden der Schwere
  `error` besteht.

Eine Seite ist auf **NAC3 Conformance Level 3**, wenn sie außerdem:

- Mit HMAC unterzeichnete Manifeste trägt.
- `isTrusted` bei sicherheitskritischen Verben unterscheidet.
- `NAC.validate_global({probe: true})` mit null Befunden besteht.

Die Kommandozeile des NPM-Pakets (`npx nac3 validate <url>`) nennt die
höchste Stufe, die eine Seite erreicht. (Das Paket liefert die Binaries
`nac3` und `nac`; beide führen zur gleichen Kommandozeile.)

### 8.1 Historische Namen der Stufen (v2.5)

Vor 2.5.0 schrieben sich die drei Stufen `NAC-1`, `NAC-2` und `NAC-3`.
Diese Namen sind einen Bindestrich vom Protokollnamen `NAC3` entfernt,
sodass sich "diese Seite ist NAC-3-konform" nicht von "diese Seite
setzt NAC3 um" unterscheiden ließ, und ein Agent, der eine Stufe nennen
sollte, hatte keine eindeutige Zeichenkette zum Nennen.

Die alten Namen bleiben als historische Aliasse lesbar:
`api/latest/levels.json` veröffentlicht jeden als
`legacy_display_name` neben der Stufe, zu der er gehörte, damit ein
vor 2.5.0 geschriebenes Dokument noch einer Stufe zugeordnet werden
kann. Sie sind NICHT normativ. Neuer Text, Prüferausgaben und
Konformitätsaussagen verwenden die Stufennummer oder den
veröffentlichten Bezeichner.

---

## 9. Versionierung

NAC3 folgt semver:

- **Major**-Sprung: brechende Änderung der öffentlichen API oder der
  Übertragungsformate. Anwender müssen Code ändern.
- **Minor**-Sprung: neue Funktionen, rückwärtskompatibel. Alter Code
  arbeitet weiter.
- **Patch**-Sprung: Fehlerkorrekturen, Änderungen nur an der
  Dokumentation.

Abkündigungsregel: eine in Version `X.Y.0` als `@deprecated` markierte
Funktion wird nicht vor `(X+1).0.0` entfernt. Die
Veröffentlichungshinweise dokumentieren jede Entfernung ausdrücklich.

Die Version des NPM-Pakets spiegelt die Version der Spezifikation:
`@nac3/runtime@X.Y.Z` setzt NAC3 vX.Y um, mit Z Patch-Revisionen
darüber. Das Beispiel ist absichtlich mit Platzhaltern geschrieben:
eine konkrete Version in diesem Satz veraltet mit der nächsten
Veröffentlichung, und dieses Dokument trug `2.1.3` noch lange, nachdem
das Paket weitergezogen war.

### 9.1 Vorabversionen und dist-tags

Eine Version mit einem Vorabanhang (`-alpha.N`, `-beta.N`, `-rc.N`)
ist **keine** veröffentlichte Fassung dieser Spezifikation. Sie
existiert, damit eine Änderung geübt werden kann, bevor sie versprochen
wird.

- **`latest` zeigt immer nur auf eine stabile Version.** Ein
  `npm install @nac3/runtime` ohne Tag MUSS auf eine Version ohne
  Vorabanhang auflösen. Wer anwendet und die Vorgabe installiert,
  bekommt nie versehentlich eine Vorabversion.
- **Vorabversionen werden unter ihrem eigenen dist-tag
  veröffentlicht** (`alpha`, `beta`, `rc`). Das Mitmachen ist
  ausdrücklich: `npm install @nac3/runtime@alpha`.
- **Nichts in einer Vorabversion ist ein Versprechen.** Jede
  Oberfläche, die in einer eingeführt wird, kann sich ändern oder
  verschwinden, bevor die stabile Version kommt, die sie trägt. Die
  Stabilitätsgarantien von Abschnitt 10 und die Garantien zu
  Befundcodes von Abschnitt 12 beginnen bei der stabilen Version.
- **Vorabversionen werden nie zurückgezogen** und nie rückwirkend auf
  `latest` umetikettiert. Die Aufzeichnung dessen, was veröffentlicht
  wurde, bleibt lesbar.

Die maßgebliche Version des Referenz-Runtime ist die Konstante
`NAC.version` in `js/nac.js`, und sie wird als Daten veröffentlicht:
`api/latest.json` führt einen getrennten Zeiger `stable` und
`prerelease` (jeder von beiden darf `null` sein), und jedes
veröffentlichte Artefakt trägt sein eigenes Feld `channel`. Ein
Verbraucher, der einen stabilen Vertrag braucht, liest ein Feld und
lehnt ab -- ohne eine Versionszeichenkette zu zerlegen und ohne einem
Tag zu glauben.

---

## 10. Prüfer

### 10.1 Runtime: `NAC.validate_global()`

Durchläuft das lebende DOM + die registrierten Manifeste und gibt ein
**Objekt aus benannten Gruppen** zurück: eine Gruppe pro Bedingung,
jede ein Array von Befunden. Seit 2.5.0 trägt jeder Befund jeder Gruppe
`code` und `severity`, sodass eine CI-Einbindung auf einen Code sperren
kann, ohne eine Meldung zu zerlegen:

```ts
{
  ok:         boolean,       // false when any error-severity finding exists
  has_errors: boolean,
  duplicates: [{ code: 'nac_id_duplicate_across_plugins',
                 severity: 'error', nac_id, plugins: string[] }],
  orphans:    [{ code: 'nac_id_orphan_in_dom',
                 severity: 'warn', nac_id, in_dom, in_manifest,
                 plugin_root }],
  unmounted:  [{ code: 'nac_id_declared_not_mounted',
                 severity: 'warn', nac_id, in_manifest, in_dom,
                 plugin }],
  convention_violations:
              [{ code: 'nac_id_missing_plugin_prefix',
                 severity: 'warn', nac_id, plugin, hint }],
  plugin_instance_violations:
              [{ code: 'duplicate_plugin_no_instance_id',
                 severity: 'error', slug, instance_count, ... }],
  tolerated:  [{ kind, nac_id, until, original }],
  plugin_count: number,
  total_ids:    number,
  timestamp:    number
}
```

Die fünf Codes, ihre Schwere und was man mit jedem tut, werden als
Daten unter `api/latest/findings.json` veröffentlicht, im Abschnitt
`global_buckets`. Befundcodes sind über Patch-Veröffentlichungen
hinweg stabil; neue Codes nur bei Minor-Sprüngen, und ein Code wird
niemals für eine andere Bedingung wiederverwendet (Abschnitt 12,
Versprechen 4).

**Versionen vor 2.5.0 hefteten diesen Gruppen keinen Code an**, und
dieser Abschnitt beschrieb ein flaches Array von Befunden, das das
Referenz-Runtime nie zurückgab (Audit N-14, N-34).

**Verhaltensänderung in 2.5.0 (Audit N-33).** Vor 2.5.0 las der
Sammler hinter diesem Prüfer nur die alten Manifestgruppen (`actions`,
`fields`, `tabs`, `kpis`, `charts`, nach `nac_id` geschlüsselt) und
niemals die kanonische Form `elements: [{ id }]` aus Abschnitt 4. Gegen
ein wie dokumentiert geschriebenes Manifest meldete er daher
`total_ids: 0`, führte jedes angegebene Element als Waise, konnte weder
eine Dopplung noch eine nicht eingehängte id noch einen
Konventionsbruch überhaupt melden, und antwortete dennoch `ok: true`.
Ab 2.5.0 werden beide Formen gelesen. Ein Host, der seine CI auf
`has_errors` sperrte, sieht nach dem Aktualisieren vielleicht sein
erstes Scheitern: das ist ein echter Treffer, der immer schon da war,
keine neue Regel.

### 10.2 CLI: `npx nac3 validate <target>`

Umhüllt `validate_global` plus eine statische Prüfung der
Übereinstimmung von HTML und Manifest. Rückgabewerte:

- `0` -- keine Befunde mit Schwere >= der eingestellten Schwelle.
- `1` -- es gibt Befunde.
- `2` -- das Ziel selbst ließ sich nicht laden.

Nützlich in der CI: `npx nac3 validate ./dist/index.html
--severity=error`. Das Paket stellt die CLI unter zwei Binary-Namen
bereit, `nac3` und `nac`; nimm den, der nicht mit einem anderen
Werkzeug in deinem PATH zusammenstößt.

---

## 11. Das System um NAC3 herum

NAC3 ist eine Vertragsschicht. Um eine NAC3-konforme Seite in eine
sprachgesteuerte Anwendung zu verwandeln, braucht es außerdem:

1. **Eine Quelle für Spracherkennung** (das SpeechRecognition des
   Browsers, die Whisper-API usw).
2. **Einen LLM-Vermittler**, der den Text des Benutzers + die
   Momentaufnahme, die `NAC.describe()` von der Seite liefert, + einen
   i18n-Hinweis nimmt und strukturierte Aktionen ausgibt:
   `[{kind: 'click', nac_id: 'X'}, {kind: 'fill', nac_id: 'Y',
   value: 'Z'}]`. Siehe `guides/LLM_WIRING.md`.
3. **Einen Chat-Client**, der das Gespräch hält und die Aktionen
   verschickt. Die Referenz ist `js/nac-chat-client.js`.
4. **Ein Ziel für Sprachausgabe** für gesprochene Antworten (das
   SpeechSynthesis des Browsers, ElevenLabs usw).

NAC3 normt nur die Ein- und Ausgabeform von Schritt 2 (die
Momentaufnahme aus `NAC.describe()` + die Form der Aktionen). Die
Schritte 1, 3 und 4 liegen außerhalb der Spezifikation; du setzt
zusammen, was du magst.

---

## 12. Stabilitätsgarantien

Was diese Spezifikation verspricht:

1. Die Menge der kanonischen Rollen aus Abschnitt 1 wird nicht
   schrumpfen. In Minor-Versionen DÜRFEN neue Rollen hinzukommen.
2. Die Ereignisfamilie aus Abschnitt 6 wird nicht umbenannt. In
   Minor-Versionen DÜRFEN neue Ereignisse hinzukommen.
3. Die Verben von `NAC.click`, `NAC.fill` usw. werden in
   Minor-Versionen ihre Form nicht ändern. Neue optionale Felder in
   `opts` DÜRFEN auftauchen.
4. Die Befundcodes von `validate_global` werden über Minor-Versionen
   hinweg nicht für andere Bedingungen wiederverwendet. Seit 2.5.0
   trägt jede Gruppe dieses Prüfers einen Code, und alle werden mit
   ihrer Schwere unter `api/latest/findings.json` veröffentlicht:
   vergleiche zwei veröffentlichte Versionen, und ein
   wiederverwendeter Code ist sichtbar, ohne eine einzige Quelle zu
   lesen.

Was diese Spezifikation NICHT verspricht:

1. Den genauen Wortlaut der Fehlermeldungen (das sind Zeichenketten aus
   dem i18n-Katalog; Übersetzungen können sich verschieben).
2. Die DOM-Strategie zum Finden der Elemente (`querySelector` heute;
   später vielleicht ein schnellerer Index).
3. Den inneren Aufbau des Manifest-Zwischenspeichers. Behandle
   Manifeste host-seitig als nur schreibbar und agentenseitig als nur
   lesbar.

---

## 13. Offene Fragen

Sie werden **hier** geführt, in diesem Abschnitt. Eine frühere Fassung
nannte dies "Offene Fragen (getrennt geführt)" und sagte nie, wo dieses
"getrennt" lag; es gab kein anderes Verzeichnis. Eine Frage, die zu
einer Entscheidung kommt, verlässt die Tabelle unten und zieht in den
Abschnitt, den sie betrifft. Eine Frage, die zu einem konkreten
Vorschlag wird, bekommt einen RFC, und die sind in
[`rfcs/README.md`](rfcs/README.md) verzeichnet, mit dem Verfahren in
[`CONTRIBUTING.md`](CONTRIBUTING.md).

Jede Zeile trägt die Version, in der sie zuletzt bewertet wurde, damit
Lesende eine lebende Frage von einer aufgegebenen unterscheiden können.
**Keine Zeile trägt eine Zielversion**: ein datiertes Versprechen, das
sein Datum überschreitet, ist schlimmer als ein undatiertes -- das ist
der Fehler, den Abschnitt 5 bei `payload_schema` machte.

| Frage | Stand | Letzte Bewertung | Wie es steht |
|----------|-------|---------------|-----------------|
| Sollte `data-nac-role="navigation"` jemals auf einen Tab auflösen? | **ENTSCHIEDEN: nein** | v2.5 | In 2.2.0 entschieden und seither durchgesetzt: eine id mit Präfix `tab.` und der Rolle `navigation` löst `tab_id_manifest_role_drift` aus, und mit `STRICT_VALIDATION` (Vorgabe `true` seit 2.3.0) wirft `NAC.register`. `tab_by_label` löst Tabs nur aus `m.tabs[]` und `elements[role=='tab']` auf. `navigation` ist ein Orientierungsbereich, niemals ein umschaltbares Panel. Siehe die Abschnitte 1 und 10. |
| Sollte `NAC.click()` relative ids annehmen (zum Beispiel `'./save'`)? | **OFFEN, nicht umgesetzt** | v2.5 | Der Auflöser passt `data-nac-id` genau ab und grenzt nach Plugin ein: dem aktiven, oder dem aus `opts.plugin`. Diese Eingrenzung deckt den Fall, nach dem die Frage fragte, schon ab (`NAC.click('save', {plugin:'invoice'})`), also ist der Druck für eine relative Schreibweise gering, und es läuft nichts. Sie zu entscheiden hieße, Abschnitt 2 eine Pfadgrammatik hinzuzufügen -- dort, wo ids für das Runtime ausdrücklich undurchsichtig sind. |
| Sollten Manifeste Vererbung / Erweiterung über Plugins hinweg unterstützen (ein Basismanifest, das ein Mandant erweitert)? | **OFFEN, Kandidat für die nächste Major** | v2.5 | Nicht umgesetzt. **Nicht mit Abschnitt 15 zu verwechseln**, dem "Vertrag zur Plugin-Erweiterung": der ist in v2.5 erschienen und ist ein Mechanismus zum Weiterleiten an ein Backend (`registerPlugin` / `call` / `read` / `subscribe`), keine Manifestvererbung. Die Frage hier geht darum, dass ein Manifest von einem anderen abgeleitet wird, was die Eindeutigkeitsregeln für ids aus Abschnitt 2 berührt -- und deshalb für eine Major zurückgehalten wird. |
| Sollte die Erzwingung von `payload_schema` formalisiert und eingeschaltet werden? | **OFFEN, ohne Datum** | v2.5 | Von Abschnitt 5 hierher verschoben, der sie für v2.4 versprach. Sie kam nicht in v2.4 und ist bis v2.5 nicht gekommen; das Referenz-Runtime liest das Feld nicht. Siehe Abschnitt 5 dafür, was heute genau geprüft wird und was nicht. |
| Sollten die Befunde von `validate_global()` einen Code aus dem veröffentlichten Katalog tragen? | **ENTSCHIEDEN: ja, in 2.5.0 erschienen** | v2.5 | Jeder Posten jeder Gruppe trägt `code` + `severity`, sodass Versprechen 4 aus Abschnitt 12 jetzt eine echte Menge abdeckt statt einer leeren. Die fünf Codes sind unter `global_buckets` in `api/latest/findings.json` veröffentlicht, und der Generator LIEST sie aus einem Prüffall, der jede Gruppe provoziert, statt sie von Hand zu schreiben: die vorige Fassung schrieb `code: null` für eine Gruppe, die seit 2.5.0 einen Code trug, und veröffentlichte beide Behauptungen in derselben Datei. Diesen Prüffall zu bauen ist auch das, was Audit N-33 gefunden hat: der Prüfer konnte ein in der kanonischen Form geschriebenes Manifest nicht sehen. Siehe 10.1. |

---

## 13.5 Steuerung

NAC3 wird derzeit von Yujin betreut. Die Spezifikation, die
Dokumentation und das Referenz-Runtime werden alle unter Apache-2.0
veröffentlicht. (Das Runtime war in der Zeit der zwei Repositorien vor
2.5 als MIT ausgewiesen; es wurde bei der Zusammenlegung am 2026-05-23
über alle NAC3-Artefakte hinweg auf Apache-2.0 vereinheitlicht. Siehe
`LICENSE` und `runtime/LICENSE`.) Yujin verpflichtet sich, NAC3 an eine
neutrale Stiftung zu übergeben (eine W3C Community Group, die Linux
Foundation oder ein gleichwertiges Branchengremium), sobald die
Verbreitung eine neutrale Steuerung rechtfertigt. Bis dahin folgen
Änderungen der Spezifikation dem RFC-Verfahren, das in
`CONTRIBUTING.md` dokumentiert ist, mit einer öffentlichen
Kommentarfrist von mindestens 14 Tagen für jede Änderung, welche die
öffentliche API oder die Übertragungsformate betrifft.

Für Anwender: die einheitliche Lizenzierung unter Apache-2.0
garantiert, dass Spezifikation und Runtime jede Änderung der
Gesellschaftsform von Yujin überdauern. Du kannst beides forken,
beides betreiben und beides ausliefern, heute und nachdem wir nicht
mehr da sind. Dieses Dokument hält die Verpflichtung fest, damit der
Weg zu diesem Überdauern ausdrücklich ist und nicht bloß
unterstellt.

---

## 14. Referenzimplementierung

Die kanonische Implementierung ist das Referenz-Runtime, das als
NPM-Paket `@nac3/runtime` verteilt wird. Die normative Quelle der
Version ist die eigene Konstante `NAC.version` des Runtime,
veröffentlicht als Daten unter `api/latest.json` (siehe Abschnitt
9.1). Dieser Abschnitt nennt absichtlich keine Versionsnummer erneut:
er trug `2.5.0-alpha.5`, als das Paket schon weitergezogen war, und das
ist dieselbe Art von Mangel wie die veralteten Beispiele, die aus den
Abschnitten 5 und 9 entfernt wurden. Er liefert:

- `js/nac.js` -- das Kern-Runtime: die öffentliche imperative +
  Introspektions-API aus Abschnitt 5 (click/fill/select/tab,
  click_by_verb/tab_by_label, invoke/utter, edit_field,
  setCapabilities, syncPlugin, request_authority/confirm_action,
  registerPlugin/call/read/subscribe, narrate/context/tree,
  expect/diff, describe, validate_global, ...). Veröffentlicht als
  Einstieg `main`/`module`/`browser` des Pakets (`dist/nac.mjs`).
- `js/nac-v2-extensions.js` -- die Brownfield- +
  Datentabellen-Primitive, die sich nach dem Laden des Kerns an
  dasselbe `window.NAC` hängen: Geltungsbereichsbaum, autoRegister,
  flüchtige Erfassung, HMAC, isTrusted-Bezeugung, i18n-Katalog
  (`t`/`locale`) und die ganze Familie `registerDataTable` / `dt_*`
  der Datentabellen (Abschnitt 5.3). Veröffentlicht als
  `@nac3/runtime/extensions` (`dist/nac-v2-extensions.mjs`). Das
  Kern-Runtime trägt die `dt_*`-Oberfläche NICHT; lade dieses Modul,
  um sie zu bekommen.
- `js/nac-chat-client.js` -- ein Referenz-Chat-Client, der Sprache +
  LLM + Verteiler verbindet. Veröffentlicht als
  `@nac3/runtime/chat-client`.

Das Paket stellt außerdem eine CLI unter den Binary-Namen `nac3` und
`nac` bereit (`dist/cli.js`, Abschnitt 10.2).

Andere Implementierungen sind willkommen (Python für native
Automatisierungsausführer, Rust für eingebettete Agenten usw). Die
Autorität ist die Spezifikation, nicht der JS-Code.

---

## 15. Vertrag zur Plugin-Erweiterung -- Canvas- + API-Oberflächen (v2.5)

Die Abschnitte 1-14 setzen voraus, dass die für den Agenten relevante
Oberfläche das **DOM** ist. Jedes adressierbare Element hat ein
Attribut `data-nac-id`, jedes Verb löst über `el.click()` aus, jedes
Lesen von Zustand kommt aus `el.getAttribute(...)`. Das funktioniert
für Anwendungen, deren Rahmen UND Inhalt in DOM-Knoten leben.

Es funktioniert nicht für Anwendungen, bei denen ein Teil der
Oberfläche ein **Canvas** ist (LibreOffice / Collabora Online, Figma,
Excalidraw, Miro, jeder selbstgebaute WebGL-Editor). Der Rahmen kann
DOM bleiben (Werkzeugleisten, Dialoge), aber die Befehle müssen oft
über die eigene öffentliche API der Anwendung laufen (postMessage,
Plugin-SDK, Skriptbrücke), und der Zustand ist aus dem DOM
möglicherweise überhaupt nicht lesbar.

v2.5 fügt einen kleinen Satz Primitive hinzu, mit denen ein
NAC3-Plugin seinen eigenen Weiterleitungsvertrag zu solchen Oberflächen
angeben kann. Das Runtime bleibt gegenüber jeder bestimmten Anwendung
agnostisch -- es lernt nur dadurch, mit einer zu sprechen, dass es das
Manifest des Plugins liest.

### 15.1 Warum ein neuer Satz Primitive

Das `NAC.click(id)`, das nur das DOM kennt, kann nicht:

- Ein postMessage `Send_UNO_Command` an ein abgeschottetes
  Collabora-iframe senden.
- `figma.currentPage.selection = [...]` innerhalb der Plugin-Sandbox
  von Figma aufrufen.
- `excalidrawAPI.setElements(...)` auf einer React-ref aufrufen.
- Lesen, ob Fett auf der aktuellen Auswahl in Collabora aktiv ist (die
  Werkzeugleiste spiegelt es; das Canvas verbirgt es).

Die Lösung ist **nicht**, `NAC.click` um Heuristiken zur Erkennung des
Backends zu erweitern. Die Lösung ist, ein ausdrückliches, agnostisches
Verb hinzuzufügen, das einen Plugin-Slug und einen Verbpfad nimmt und
das Manifest des Plugins angeben lässt, wie dieses Verb weitergeleitet
wird.

### 15.2 Die drei Primitive

```ts
NAC.registerPlugin(slug: string, manifest: PluginManifest): void
NAC.call(plugin: string, verb_path: string, args?: object): Promise<any>
NAC.read(plugin: string, state_path: string): Promise<any>
NAC.subscribe(plugin: string, event_path: string,
              cb: (data: any) => void): SubscriptionHandle
NAC.unsubscribe(handle: SubscriptionHandle): void
```

- `registerPlugin(slug, manifest)` registriert ein v2.5-Plugin. Ein
  bestimmter `slug` DARF sowohl im DOM-Manifestverzeichnis (Abschnitt
  5) als auch im v2.5-Erweiterungsverzeichnis auftauchen; die beiden
  bestehen nebeneinander. v2.5-Aufrufe lösen nur über das
  v2.5-Verzeichnis auf.
- `call` ruft ein angegebenes Verb auf. Die Weiterleitung wählt das
  Manifest, nicht der Agent. Es löst mit dem auf, was das Backend
  zurückgegeben hat (oft `undefined` / `{ok: true}`); es lehnt mit
  `NacError` ab, wenn das Verb unbekannt ist, das Backend scheitert
  oder die Form der Antwort ungültig ist.
- `read` gibt einen angegebenen Zustandswert zurück. Das Runtime
  durchläuft die Rückfallkette des Zustands in der angegebenen
  Reihenfolge und gibt die erste Quelle zurück, die auflöst; es lehnt
  nur ab, wenn jede Quelle der Kette gescheitert ist.
- `subscribe` hängt einen Zuhörer an ein angegebenes Ereignis. Es gibt
  eine Kennung zurück, die der Aufrufer zum Aufräumen an
  `unsubscribe` übergibt. Ereignisse DÜRFEN von einer echten
  vorgelagerten Ereignisquelle gestützt oder über Abfrage /
  MutationObserver synthetisiert sein -- das Manifest gibt an, welches
  von beiden.

Alle vier Funktionen sind asynchron (sie geben ein Promise zurück),
außer `unsubscribe`, die synchron und idempotent ist.

### 15.3 Form des Plugin-Manifests

```ts
interface PluginManifest {
  slug: string;
  verbs:  { [verb_path: string]: VerbBinding };
  state:  { [state_path: string]: StateBinding[] };
  events: { [event_path: string]: EventBinding };
}

interface VerbBinding {
  backend:       BackendKind;
  /* backend-specific fields (see 15.4) */
  [k: string]: any;
}

interface StateBinding {
  backend:       BackendKind;
  /* backend-specific fields (see 15.4) */
  extract?:      string;   /* extractor DSL string (see 15.5) */
  [k: string]: any;
}

interface EventBinding {
  backend:       BackendKind;
  /* backend-specific fields */
  [k: string]: any;
}

type BackendKind =
  | 'postmessage'
  | 'postmessage-listen'
  | 'sdk-call'
  | 'script-bridge'
  | 'dom-mirror'
  | 'same-origin-window'
  | 'synthetic-mutation'
  | 'synthetic-poll';
```

Manifeste sind reines JSON (keine JS-Callbacks). Forge, Sumi und jedes
künftige Werkzeug erzeugen sie als Daten; das Runtime deutet die
Backend-Namen aus einem festen Wortschatz.

Verben und Ereignisse haben **genau eine** Bindung. Zustand hat ein
**geordnetes Array** von Bindungen: das Runtime durchläuft die Kette in
der Reihenfolge und gibt die erste Quelle zurück, die erfolgreich
aufgelöst hat.

### 15.4 Backend-Wortschatz

| Art | Verwendet für | Pflichtfelder |
|------|----------|-----------------|
| `postmessage` | Verb: eine Nachricht per `postMessage` an ein iframe schicken. | `target` (CSS-Selektor des iframe, an das geschickt wird), `message` (die MessageId-Zeichenkette), `values` (Objektliteral, mit den Argumenten gefüllt), `values_from_args` (optionales Array von Argumentschlüsseln, die unverändert weitergegeben werden) |
| `postmessage-listen` | Ereignis: auf eine bestimmte eingehende `MessageId` an `window.message` hören. | `source` (CSS-Selektor des iframe, nach dem der Ursprung gefiltert wird; fehlt er, wird jeder Ursprung angenommen), `message` (die abzugleichende MessageId), `extract` (die Auslese-DSL auf den Nachrichtendaten) |
| `sdk-call` | Verb: eine global bereitgestellte JS-Funktion aufrufen (zum Beispiel ein Figma-Plugin, die Excalidraw-API). | `path` (gepunkteter Pfad in `window`, zum Beispiel `figma.currentPage.selection`), `mode` (`assign`, um dem Pfad den Wert der Argumente zuzuweisen, `invoke`, um ihn als Funktion mit dem Argumentobjekt aufzurufen) |
| `script-bridge` | Verb oder Zustand: die Skriptbrücke einer Anwendung aufrufen (das `CallPythonScript` von Collabora, die UNO-Brücke von LibreOffice, Google Apps Script). | `bridge` (eine backend-eigene Kennung wie `collabora.python`), `script` (Kennung des Skripts), `function` (Name der auszuführenden Funktion), `args` (Objektliteral, mit den Aufrufargumenten gefüllt), `response_match` (bei Zustand: die MessageId der Antwort, auf die gewartet wird), `timeout_ms` (optional, Vorgabe 5000) |
| `dom-mirror` | Zustand: aus einem DOM-Element lesen, dessen Attribut / Klasse / Text einen canvas-internen Zustand spiegelt (zum Beispiel ein Werkzeugleistenknopf, der hervorgehoben ist, wenn seine Formatierung auf der aktuellen Auswahl aktiv ist). | `selector` (abzufragender CSS-Selektor), `extract` (die Auslese-DSL, siehe 15.5) |
| `same-origin-window` | Zustand: aus `iframe.contentWindow.<path>` lesen, wenn das iframe gleichen Ursprungs ist. Das Runtime erkennt fremden Ursprung und fällt weiter. | `target` (CSS-Selektor des iframe), `path` (gepunkteter Pfad in `contentWindow`) |
| `synthetic-mutation` | Ereignis: ein Ereignis synthetisieren, indem DOM-Änderungen an einer oder mehreren Zustandsquellen beobachtet und bei Änderung des beobachteten Werts neu ausgegeben werden. | `observe` (Array von Zustandspfaden zum Beobachten; das Runtime ruft auf jedem `read` auf und vergleicht über Änderungen hinweg), `throttle_ms` (optional, Vorgabe 100) |
| `synthetic-poll` | Ereignis: ein Ereignis synthetisieren, indem Zustandsquellen abgefragt werden. | `observe` (Array von Zustandspfaden), `interval_ms` (Vorgabe 250) |

Jedes Backend MUSS vom Runtime als eigenständiger Verteiler umgesetzt
werden (`dispatch(binding, args, context) -> Promise<value>`). Eine
neue Backend-Art in die Spezifikation aufzunehmen erfordert einen
Sprung der Spezifikationsversion; Runtimes, die unbekannte Backends
übergehen, MÜSSEN Manifeste ablehnen, die sie angeben (kein stilles
Überspringen).

### 15.5 Mini-DSL zum Auslesen

Die Zustands-Backends und das Ereignis-Backend `postmessage-listen`
müssen oft ein Feld aus einem größeren Objekt herausgreifen. Das
Runtime bringt eine winzige deklarative DSL mit, damit Manifeste
reines JSON bleiben:

| Schreibweise | Bedeutung | Beispiel Eingabe -> Ausgabe |
|--------|---------|-------------------------|
| `field.path.to.value` | Durchlauf eines gepunkteten Pfads. | `{a:{b:1}}` mit `a.b` -> `1` |
| `attribute:NAME` | Nur DOM: `el.getAttribute(NAME)` lesen. | `<i data-x="hi">` mit `attribute:data-x` -> `'hi'` |
| `text` | Nur DOM: `el.textContent` lesen. | `<span>hi</span>` mit `text` -> `'hi'` |
| `classList.contains:CLASS` | Nur DOM: `el.classList.contains(CLASS)` -> boolesch. | `<button class="active">` mit `classList.contains:active` -> `true` |
| `value` | Nur DOM: `el.value` lesen. | `<input value="x">` mit `value` -> `'x'` |
| `present` | Nur DOM: gibt `true` zurück, wenn der Selektor ein Element aufgelöst hat, sonst `false`. | Selektor hat gepasst -> `true` |

In v2.5 wird Verkettung nicht unterstützt; ein Ausleser ist genau eine
der Zeilen oben. Ein Manifest, das eine komplexe Umformung braucht,
gibt stattdessen ein `script-bridge` an.

### 15.6 Semantik der Rückfallkette für `state`

`state[path]` ist ein Array von Bindungen. `NAC.read(plugin, path)`
durchläuft das Array in der Reihenfolge. Für jede Bindung:

1. Das Runtime ruft den Verteiler des Backends auf.
2. Löst der Verteiler mit einem Wert auf (einschließlich `false`, `0`
   und der leeren Zeichenkette, aber NICHT `undefined`), gibt `read`
   diesen Wert zurück.
3. Lehnt der Verteiler ab oder löst er mit `undefined` auf, geht das
   Runtime zur nächsten Bindung im Array weiter.
4. Hat keine Bindung einen Wert erzeugt, lehnt `read` mit
   `NacError('state_unreadable', ...)` ab, dessen
   `err.attempts: [...]` einen Eintrag pro versuchtem Backend trägt,
   mit `{backend, reason}`.

Begründung: die Kette verschlüsselt die Vorzugsreihenfolge derjenigen,
die das Manifest geschrieben hat. Die schnellste, günstigste und
frischeste Quelle steht zuerst; die Rückfälle werden mit Anstand
schlechter. Das Runtime wählt niemals still zuerst eine schlechtere
Quelle.

### 15.7 Herkunft synthetischer Aktionen

Jeder Versand von `NAC.call` gibt nach der Rückkehr des Backends ein
Ereignis `nac:plugin:invoked` an `document` aus. Die Nutzlast des
Details:

```js
{
  plugin:    'collabora.writer',
  verb_path: 'uno.Bold',
  backend:   'postmessage',
  request_id: 'pi_<random hex>',
  source:    'agent',     // see sec 7
  trusted:   false,
  duration_ms: 12,
  ok:        true,
  error:     null,
}
```

Dieselbe Form gilt für `nac:plugin:read` (nach einem `read`) und
`nac:plugin:event` (die erneute Ausgabe eines synthetisierten
Ereignisses). `source` ist standardmäßig `'agent'`; Hosts, die das
Runtime in eine Benutzeroberfläche einhüllen, DÜRFEN es über den schon
vorhandenen Mechanismus `NAC.set_source(...)` überschreiben
(Abschnitt 7).

### 15.8 Durchgerechnetes Beispiel -- Collabora Writer

```json
{
  "slug": "collabora.writer",
  "verbs": {
    "uno.Bold": {
      "backend": "postmessage",
      "target":  "iframe[data-collabora-frame]",
      "message": "Send_UNO_Command",
      "values":  { "Command": ".uno:Bold" }
    },
    "doc.save": {
      "backend": "postmessage",
      "target":  "iframe[data-collabora-frame]",
      "message": "Action_Save",
      "values_from_args": ["DontTerminateEdit", "Notify"]
    }
  },
  "state": {
    "selection.isBold": [
      { "backend": "dom-mirror",
        "selector": "[data-nac-id='toolbar.bold']",
        "extract":  "classList.contains:selected" },
      { "backend": "script-bridge",
        "bridge":   "collabora.python",
        "script":   "yujin_state.py",
        "function": "GetSelectionState",
        "response_match": "CallPythonScript-Result",
        "extract":  "Values.is_bold" }
    ],
    "doc.modified": [
      { "backend": "same-origin-window",
        "target":  "iframe[data-collabora-frame]",
        "path":    "app.file.modified" }
    ]
  },
  "events": {
    "doc.modified": {
      "backend": "postmessage-listen",
      "source":  "iframe[data-collabora-frame]",
      "message": "Doc_ModifiedStatus",
      "extract": "Values.Modified"
    },
    "selection.changed": {
      "backend":     "synthetic-mutation",
      "observe":     ["selection.isBold", "selection.isItalic"],
      "throttle_ms": 100
    }
  }
}
```

Der Agent ruft `NAC.call('collabora.writer', 'uno.Bold')` auf; das
Runtime leitet über das Backend `postmessage` weiter und schickt
`Send_UNO_Command` an das iframe. Um zu bestätigen, dass die Wirkung
eingetreten ist (siehe Abschnitt 17), ruft der Agent
`await NAC.read('collabora.writer', 'selection.isBold')` auf; das
Runtime versucht zuerst den Spiegel der Werkzeugleiste (schnell,
kostenlos) und fällt auf die Python-Skriptbrücke zurück, wenn der
Spiegel nicht verfügbar ist. Der Agent weiß nie und interessiert sich
nie dafür, welche Quelle geantwortet hat.

### 15.9 Fehler

`NAC.call` / `read` / `subscribe` lehnen mit einem `NacError` ab,
dessen `code` einer der folgenden ist:

- `plugin_not_registered` -- der Slug hat kein v2.5-Manifest.
- `verb_not_declared` -- der Verbpfad steht nicht im Manifest.
- `state_not_declared` -- der Zustandspfad steht nicht im Manifest.
- `event_not_declared` -- der Ereignispfad steht nicht im Manifest.
- `backend_unknown` -- das Manifest gibt ein Backend an, das das
  Runtime nicht umsetzt. Das Manifest MUSS bei der Registrierung
  abgelehnt werden; dieser Fehler tritt nur auf, wenn ein Runtime ein
  künftiges Manifestformat annimmt, das es dann nicht verteilen kann.
- `backend_target_missing` -- das Ziel des Backends (iframe, JS-Pfad,
  DOM-Selektor) ist nicht zu finden.
- `cross_origin_blocked` -- ein `same-origin-window` wurde gegen ein
  iframe fremden Ursprungs versucht.
- `state_unreadable` -- jede Bindung einer Zustandskette ist
  gescheitert; siehe 15.6.
- `timeout` -- ein Backend hat nicht innerhalb seines angegebenen
  `timeout_ms` geantwortet (Vorgabe 5000 für Verben, 1000 für
  Zustandslesungen).
- `invalid` -- die Form des Arguments ist falsch (ungültiger Slug,
  fehlerhaftes Manifest bei der Registrierung usw).

---

## 16. Baumnavigation (v2.5 -- ERSCHIENEN in 2.5.0-alpha.5 / RFC V25-02)

Primitive zur hierarchischen Navigation der Befehle, für
Hilfsabläufe und Sprachausführer, die beschreiben müssen, was sie vom
aktuellen Fokus aus tun können.

**API-Oberfläche:**

- `NAC.context(plugin) -> { breadcrumb: [{nac_id, label}, ...] }`
  Steigt von `document.activeElement` über die Vorfahrenelemente auf,
  die `data-nac-id` tragen, und hält an der Wurzel des Plugins. Gibt
  einen leeren Pfad zurück, wenn innerhalb des Plugins nichts den Fokus
  hat. Das `label` jeder Stufe kommt von `narrate` (Abschnitt 17).

- `NAC.tree(plugin, rootId?) -> [{nac_id, label, opens?, leaf?}, ...]`
  Zählt die UNMITTELBAREN adressierbaren Kinder von `rootId` auf (oder
  der Plugin-Wurzel, wenn es fehlt). "Unmittelbar" heißt, dass kein
  weiteres Element mit `data-nac-id` zwischen dem Ausgangspunkt und dem
  Kind liegt. Für jeden Eintrag:
  - `label` über `narrate` aufgelöst
  - `opens` spiegelt das Attribut `data-nac-opens`, wenn es vorhanden
    ist
  - `leaf` ist `true`, wenn `data-nac-leaf` vorhanden ist

**Attribute für Autoren:**

- `data-nac-opens="<target-nac-id>"`: gibt an, dass dieser Knoten zu
  dem Element öffnet / hinabführt, das die Ziel-id bezeichnet. Damit
  können Agenten der Navigationskette folgen, ohne Namen zu erraten.
- `data-nac-leaf`: ausdrückliche Endmarkierung; nachgelagerte Agenten
  wissen, dass kein weiteres Hinabgehen möglich ist.

**Fehler:** `tree` gibt für eine unbekannte rootId `[]` zurück (still
leer, kein Fehler). `context` gibt für unbekannte Plugins immer
`{ breadcrumb: [] }` zurück.

---

## 17. Hilfs-Labels (v2.5 -- ERSCHIENEN in 2.5.0-alpha.5 / RFC V25-03)

Kanonische Auflösung von für Menschen lesbaren Labels. Eine Funktion
für Screenreader, Sprachausgabe, Sprachabläufe, Prüfprotokolle und
mobile Hilfsoberflächen.

**API-Oberfläche:**

- `NAC.narrate(plugin, nac_id) -> string | null`
  Gibt `null` zurück, wenn das Plugin oder die nac_id nicht gefunden
  werden. Sonst das Label nach dieser strengen Vorrangfolge:

  1. **`aria-label`** -- Barrierefreiheit zuerst; wird beachtet, außer
     es besteht nur aus Leerzeichen.
  2. **der sichtbare Text** -- der `textContent` des Elements, ohne
     eingebettete Unterbäume mit `data-nac-id` (die haben ihre eigene
     narrate-Auflösung; sie werden ausgeschlossen, damit die
     gesprochene Ausgabe eingegrenzt bleibt).
  3. **`data-nac-label`** -- ausdrückliche Übersteuerung durch die
     Autorin; nützlich, wenn der sichtbare Text Symbolzeichen oder
     i18n-Schlüssel enthält.
  4. **die `nac_id` als letzter Ausweg** -- der schlechteste Fall; er
     zeigt an, dass "kein Label geschrieben wurde".

  Werte, die auf irgendeiner Stufe nur aus Leerzeichen bestehen, fallen
  auf die nächste Stufe.

**Prüfung:** `validate_global()` darf in der Gruppe
`plugin_instance_violations` Warnungen für nac_ids in Ordnungsform
(`btn-1`, `btn-2`, ...) ausgeben, denen irgendeines der Labels der
höheren Stufen fehlt.

---

## 18. Wirkungserkennung (v2.5 -- ERSCHIENEN in 2.5.0-alpha.5 / RFC V25-04)

Schließt die Lücke des "stillen Schadens": ein Agent bestätigt die
WIRKUNG einer Aktion, nicht bloß, dass der Befehl ausgegeben wurde.
Beide Primitive setzen auf `NAC.read()` auf, also funktioniert jedes
Backend aus V25-01 (postmessage, sdk-call, dom-mirror, ...).

**API-Oberfläche:**

- `NAC.expect(plugin, statePath, value, opts?) -> Promise<value>`
  Fragt `NAC.read(plugin, statePath)` wiederholt ab, bis der
  Vergleicher etwas Wahres zurückgibt oder die Frist abläuft. Löst mit
  dem aufgelösten Wert auf; lehnt bei Ablauf mit
  `NacError('timeout', ...)` ab.

  Lesefehler während der Abfrage werden bis zur Frist erneut versucht
  (als "noch nicht beobachtbar" behandelt, nicht als harter Fehler).

  Optionen:
  - `timeout_ms` (Vorgabe `5000`)
  - `poll_ms` (Vorgabe `100`)
  - `comparator` (Vorgabe `(cur, want) => cur === want`)
    Bekommt `(current, expected)` und gibt einen booleschen Wert
    zurück.

- `NAC.diff(plugin, statePath, actionFn) -> Promise<{before, after, changed}>`
  Liest den Zustand, wartet auf `actionFn()`, liest den Zustand
  erneut. Gibt beide Momentaufnahmen zurück und einen booleschen Wert
  `changed`, der über einen JSON-stringify-Vergleich berechnet wird (so
  wird auch `undefined` gegenüber einem Wert als geändert gemeldet).
  Lesefehler fallen auf `undefined` zusammen.

**Hinweise zum Zusammensetzen:** `diff` erfasst nur die Momentaufnahme
am ANFANG und am ENDE; es beobachtet die Zwischenzustände innerhalb der
Aktion NICHT. Nimm `expect`, wenn dir wichtig ist, dass "der Zustand
irgendwann einen bestimmten Wert durchläuft".

---

*Dieses Dokument ist die kanonische Spezifikation von NAC3 v2.5. Die
Abschnitte 0-14 sind gegenüber v2.4 stabil unverändert. Die Abschnitte
15-18 erscheinen in v2.5. Änderungen an dieser Datei sind Änderungen
der Spezifikation und erfordern einen RFC; siehe `CONTRIBUTING.md`.*
