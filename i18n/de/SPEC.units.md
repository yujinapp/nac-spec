<!-- nac3-translation-store
locale: de
source: SPEC.md
source_version: 2.5.2
pass_date: 2026-10-27
engine: anthropic/claude-opus-5 (Yujin Forge)
-->

<!-- u 5e3e86e7f989 | 1 NAC3 -- Native Agent Contract | heading -->
# NAC3 -- Native Agent Contract

<!-- u 0e5eb9779108 | 1 NAC3 -- Native Agent Contract | prose -->
**Version:** 2.5.2 (stabil -- die vollständige v2.5-Oberfläche: narrate, context+tree, expect+diff)
**Status:** Stabile Veröffentlichung. Der npm-dist-tag `latest` zeigt hierher; Abschnitt 9.1 sagt, was das garantiert und was eine Vorabversion nicht garantiert. Dieses Dokument nennt seine Version an genau einer Stelle, in der Zeile darüber. Die veröffentlichten RFCs und ihre Nachweise auf Schicht 2 + Schicht 3 sind in `README.md` und `runtime/CHANGELOG.md` aufgeführt.
**Lizenz:** Apache-2.0
**Herausgeber:** Yujin (yujin.app)

<!-- u 0b1780790faf | 2 0. Purpose | heading -->
## 0. Zweck

<!-- u 582895d698d2 | 2 0. Purpose | prose -->
NAC3 ist ein Vertrag zwischen Web-Oberflächen und den Agenten, die sie
steuern. Zu den Agenten gehören Sprachausführer, LLM-Vermittler,
RPA-Bots, Barrierefreiheitswerkzeuge und End-to-End-Testausführer. Der
Vertrag legt fest:

<!-- u 7c6c7f420b83 | 2 0. Purpose | prose -->
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

<!-- u 878edf1e669e | 2 0. Purpose | prose -->
NAC3 legt eine dünne Schicht über das Framework, mit dem du schon
rendert. Es ersetzt weder ARIA noch React, Vue oder dein Design-System.

<!-- u c5107b92723f | 3 1. Roles | heading -->
## 1. Rollen

<!-- u b4f9560e4b2f | 3 1. Roles | prose -->
Jedes für einen Agenten relevante DOM-Element trägt `data-nac-role`.
Die kanonischen Rollen sind:

<!-- u dfae9890f1ae | 3 1. Roles | prose -->
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

<!-- u b08cd46560d8 | 3 1. Roles | prose -->
Rollen außerhalb dieser Liste sind für die Zukunft reserviert. Ein
NAC-strict-Runtime SOLLTE unbekannte Rollen zum Zeitpunkt der
Registrierung ablehnen (v2.2). Ein NAC-permissive-Runtime DARF
unbekannte Rollen aus Rückwärtskompatibilität wie `action` behandeln
(das Standardverhalten in v1.9 und v2.0).

<!-- u 4252e24a246a | 3 1. Roles | prose -->
Diese Tabelle ist die normative Liste, und sie wird als Daten
veröffentlicht: der maschinenlesbare Katalog unter
`api/latest/contract.json` führt jede Rolle, die das
Referenz-Runtime annimmt, jede mit `declared_in_spec_table` markiert,
damit sich die beiden Listen ohne das Lesen von Prosa vergleichen
lassen. Sie stimmen zum Stand v2.5 überein. Jede künftige Abweichung
ist in dieser Markierung sichtbar, statt in einer
Meinungsverschiedenheit zwischen einem Dokument und einer
Implementierung versteckt zu sein.

<!-- u ae2acf06f5be | 4 2. Names | heading -->
## 2. Namen

<!-- u d732bc7953d1 | 4 2. Names | prose -->
Jedes von einem Agenten auflösbare Element trägt `data-nac-id`. Die id
ist:

<!-- u 4984c2cad541 | 4 2. Names | prose -->
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

<!-- u 889014ee5ece | 4 2. Names | prose -->
Reservierte id-Präfixe (seit 2.1):

<!-- u 1c4cc568753b | 4 2. Names | prose -->
| Präfix | Reserviert für |
|--------|--------------|
| `tab.` | Tab-Knöpfe. Die Rolle MUSS `tab` sein. |
| `modal.` | Elemente im Geltungsbereich eines Modaldialogs. Die Rolle ist die des Blatt-Widgets. |
| `field.` | Kurzform für ein Formularfeld. Die Rolle MUSS `field` oder `option` sein. |
| `confirm.` | Bestätigungsdialoge. |

<!-- u 2a54888e0697 | 5 3. Verbs | heading -->
## 3. Verben

<!-- u d70d8aad531c | 5 3. Verbs | prose -->
Ein Element mit `data-nac-role="action"` DARF
`data-nac-action="<verb>"` tragen und damit benennen, was es tut. Das
Verb ist ein freier Bezeichner in snake-case, der zwischen Host und
Agent abgesprochen wird. Gängige Verben:

<!-- u 746c48370f66 | 5 3. Verbs | prose -->
`save`, `cancel`, `submit`, `delete`, `edit`, `view`, `create`,
`approve`, `reject`, `send`, `download`, `upload`, `refresh`,
`expand`, `collapse`, `open`, `close`, `add_row`, `remove_row`.

<!-- u 956edf53a876 | 5 3. Verbs | prose -->
`NAC.click_by_verb(plugin, verb)` löst ein Verb auf die eindeutige
Aktion unter diesem Plugin auf und klickt sie. Dass mehrere Aktionen
unter einem Plugin dasselbe Verb teilen, ist ein Manifestfehler (Lint:
`duplicate_verb`).

<!-- u 28e680935920 | 6 4. Manifest | heading -->
## 4. Manifest

<!-- u 6b623deee5e0 | 6 4. Manifest | prose -->
Jedes Plugin DARF ein Manifest registrieren über:

<!-- u d0d1394734ea | 6 4. Manifest | prose -->
Das Manifest ist die Quelle der Wahrheit, die dem Agenten zugewandt
ist. Ein LLM-Vermittler, der entscheidet "der Benutzer hat 'guardar'
gesagt", sieht im Plugin-Manifest nach, findet das Verb `save` und gibt
`NAC.click_by_verb('invoice', 'save')` aus.

<!-- u a6be4d566708 | 7 4.1 Required fields | heading -->
### 4.1 Pflichtfelder

<!-- u d190057894b0 | 7 4.1 Required fields | prose -->
- `plugin_slug` -- entspricht dem `data-nac-plugin` des Host-Elements.
- `nac_version` -- die NAC3-Version, mit der dieses Manifest
  übereinzustimmen behauptet. Das Runtime lehnt Manifeste ab, die eine
  höhere Version als die eigene angeben.

<!-- u 58cac67a09e6 | 8 4.2 Optional fields | heading -->
### 4.2 Optionale Felder

<!-- u 87ea0145c2ce | 8 4.2 Optional fields | prose -->
- `elements[]` -- der Katalog der benannten Widgets. Jeder Eintrag MUSS
  `id` und `role` haben.
- `tabs[]` -- ein eigenes Array auf oberster Ebene, für Tabs.
  Gleichwertig mit Einträgen in `elements[]` mit `role:'tab'`. Beide
  Formen sind gültig.
- `fields[]`, `actions[]`, `kpis[]`, `data_tables[]` -- typisierte
  Untersammlungen; dieselbe Semantik wie `elements[]` nach Rolle
  gefiltert. Die Demos wählen die Form, die sich für Menschen am besten
  liest.

<!-- u 3a8b6f4f8129 | 9 4.3 i18n | heading -->
### 4.3 i18n

<!-- u 6a665e6998c7 | 9 4.3 i18n | prose -->
Jedes `label_i18n` MUSS alle 10 NAC3-Locales abdecken:

<!-- u fa9df7559758 | 9 4.3 i18n | prose -->
`i18n_strict: 'permissive'` bei `NAC.autoRegister.watch()` erlaubt
während einer Brownfield-Migration eine teilweise Abdeckung;
Produktionsmanifeste sollten alle 10 Locales ausliefern.

<!-- u 672b32007192 | 10 4.3.1 What the ten locales are a requirement ON | heading -->
#### 4.3.1 Worauf sich die Anforderung der zehn Locales bezieht

<!-- u e01d2e357587 | 10 4.3.1 What the ten locales are a requirement ON | prose -->
Die Anforderung oben bezieht sich auf das **Manifest des Anwenders** --
die `label_i18n`-Tabelle, die ein Agent liest, um ein Element in der
Sprache des Benutzers zu benennen. Sie bezieht sich NICHT auf die
Sprache dieses Dokuments, und nichts in NAC3 verpflichtet eine
Implementierung, ihre eigene Dokumentation in zehn Sprachen zu
veröffentlichen.

<!-- u 6345c3141c02 | 11 4.3.2 Normative language of this specification | heading -->
#### 4.3.2 Normative Sprache dieser Spezifikation

<!-- u 0496b01c0221 | 11 4.3.2 Normative language of this specification | prose -->
Der normative Text von NAC3 ist der **englische**: die `SPEC.md` im
Wurzelverzeichnis des Spezifikations-Repositoriums, gerendert unter
`https://yujin.app/nac-spec/SPEC.html`.

<!-- u 5ac523ec3a00 | 11 4.3.2 Normative language of this specification | prose -->
Die Spezifikation wird außerdem als maschinelle Übersetzung unter
`i18n/<locale>/SPEC.md` veröffentlicht. Diese Übersetzungen sind
**nicht normativ**. Jede gibt in einem Banner, das ein Leser sieht, und
in maschinenlesbarem Frontmatter an, welche englische Fassung sie
übersetzt und wie viel davon sie abdeckt; der Banner ist Pflicht, und
eine veröffentlichte Übersetzung ohne Banner ist ein Mangel der
Veröffentlichung, nicht der Übersetzung. Wo eine Übersetzung und der
englische Text voneinander abweichen, gilt der englische Text, und eine
Konformitätsaussage ist eine Aussage gegenüber dem englischen Text.

<!-- u 22e3daff7a29 | 11 4.3.2 Normative language of this specification | prose -->
Eine Übersetzung, die hinter dem Englischen liegt, **blockiert niemals
die Veröffentlichung des Englischen**. Der normative Text erscheint,
wenn er fertig ist; eine veraltete Übersetzung wird je Einheit gemeldet,
und die Veröffentlichung geht hinaus. Neun maschinelle Artefakte haben
kein Vetorecht über das Dokument, das sie übersetzen. Bis einschließlich 2.5.1 deckten
die neun 34 von 83 Abschnitten ab, und nichts sagte das; sie werden
jetzt aus einem Speicher pro Locale erzeugt, und das Verfahren steht in
`docs/TRANSLATION_PASS.md`.

<!-- u a168e1e445ba | 12 5. Public API | heading -->
## 5. Öffentliche API

<!-- u e99a6820076b | 13 5.1 Imperative | heading -->
### 5.1 Imperativ

<!-- u 935555476ddb | 14 5.1.1 Conformance helper (v2.2) | heading -->
### 5.1.1 Konformitätshelfer (v2.2)

<!-- u 61773eab5781 | 14 5.1.1 Conformance helper (v2.2) | prose -->
`NAC.bindAction(el, handler, ctx)` ist der
spezifikationskonforme Weg, einen Klick-Handler anzubinden. Er gibt
`nac:action:succeeded` (oder `:failed`) automatisch aus, nachdem der
Handler gelaufen ist (synchron, mit Ausnahme oder als Promise). Er gibt
eine Funktion zum Abmelden zurück. Benutze ihn statt eines nackten
`addEventListener('click', ...)`, wann immer der Host es erlaubt;
Brownfield-Code kann das Ereignis weiterhin wie bisher von Hand
ausgeben.

<!-- u f3cb221e90bf | 15 5.1.3 Field editor (v2.3) | heading -->
### 5.1.3 Feld-Editor (v2.3)

<!-- u d53a2b25eb60 | 15 5.1.3 Field editor (v2.3) | prose -->
`NAC.edit_field(nac_id)` öffnet einen Modaldialog, mit dem eine Person
(oder ein Agent in ihrem Namen) jedes Textfeld mit Werkzeugen im Stil
einer Textverarbeitung bearbeiten kann:

<!-- u 7bdd9e99f71e | 15 5.1.3 Field editor (v2.3) | prose -->
Der Dialog registriert sich unter `plugin_slug='nac_editor'` mit diesen
aus NAC3 aufrufbaren Verben:

<!-- u 223097f9e322 | 15 5.1.3 Field editor (v2.3) | prose -->
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

<!-- u 9b5784a95c17 | 15 5.1.3 Field editor (v2.3) | prose -->
Esc schließt (bricht ab). Strg/Cmd+Enter speichert. Ein Klick auf den
Hintergrund der Überlagerung bricht ab.

<!-- u 4a9ebc2b57dd | 15 5.1.3 Field editor (v2.3) | prose -->
Abschnitt 13 der Spezifikation wird den Vertrag in v2.3 formalisieren;
das v2.2-Runtime liefert eine funktionierende Referenzimplementierung,
damit Anwender sie schon heute anbinden können. Auf jedem Feld
verfügbar über:

<!-- u 8aff4d81ab57 | 16 5.1.4 Action payload + invoke (v2.3) | heading -->
### 5.1.4 Aktions-Nutzlast + invoke (v2.3)

<!-- u 8dbd703fb6af | 16 5.1.4 Action payload + invoke (v2.3) | prose -->
Aktionen in NAC v2.2 sind vom Typ Klick-und-fertig: ein Agent löst
`NAC.click(id)` oder `NAC.click_by_verb(plugin, verb)` aus, und der
Host tut, was er tut. Das funktioniert für Verb-und-Zustand-Aktionen
(`save`, `cancel`, `submit`, `delete`), bricht aber zusammen, wenn eine
Aktion **Daten** vom Agenten braucht -- `utter(text)`,
`search(query)`, `send_message(body)`, `upload(file)`,
`schedule(date)`, `translate(text, target_lang)`. Der Host hat keine
Möglichkeit, die Nutzlast des Agenten über einen synthetischen Klick zu
empfangen.

<!-- u 121175aff245 | 16 5.1.4 Action payload + invoke (v2.3) | prose -->
v2.3 schließt diese Lücke. Der Vertrag ist additiv: Verben im
Klick-Stil funktionieren unverändert weiter.

<!-- u 1e70a9ba51ec | 16 5.1.4 Action payload + invoke (v2.3) | prose -->
`NAC.invoke` schickt ein `CustomEvent` `nac:action:requested` an das
Host-Element (es steigt bis zum document auf) mit:

<!-- u af505024f97e | 16 5.1.4 Action payload + invoke (v2.3) | prose -->
Der Host hört auf `nac:action:requested`, verarbeitet die Nutzlast und
gibt `nac:action:succeeded` (oder `nac:action:failed`) mit derselben
`request_id` im Detail aus. Das Runtime ordnet über die `request_id` zu
und löst das Promise des Agenten auf.

<!-- u abc54909999b | 16 5.1.4 Action payload + invoke (v2.3) | prose -->
Die Standard-Zeitgrenze liegt bei **30 Sekunden** (gegenüber 5 s beim
Klick). Mit `opts.timeout` lässt sie sich ändern. Bei Ablauf wird das
Promise mit `NacError('timeout', ...)` abgelehnt. Wie beim Klick
bedeutet ein Ablauf ein echtes Scheitern: der Aufrufer MUSS ihn so
behandeln, es sei denn, er hat über einen anderen Kanal den Nachweis
der Wirkung.

<!-- u f20ea060f5a1 | 16 5.1.4 Action payload + invoke (v2.3) | prose -->
`NAC.utter(id, opts)` ist die ergonomische Kurzform für das häufigste
Verb mit Nutzlast. Es ist gleichwertig mit:

<!-- u 494cdb0b8183 | 17 Manifest declaration | heading -->
#### Angabe im Manifest

<!-- u 237fe9674ed4 | 17 Manifest declaration | prose -->
Eine Aktion, die eine Nutzlast trägt, gibt das Schema dieser Nutzlast
in ihrem Manifesteintrag an, zur Nachvollziehbarkeit und für die
Werkzeuge:

<!-- u 6332c86c203d | 17 Manifest declaration | prose -->
`payload_schema` ist **zum Stand v2.5 nur informativ**, und das
Referenz-Runtime liest es überhaupt nicht: das Feld wird in einem
Manifest angenommen, in `NAC.manifest()` mitgeführt und niemals gegen
irgendetwas geprüft. `NAC.STRICT_VALIDATION` -- dessen Standardwert in
2.3.0 tatsächlich auf `true` umgestellt wurde -- deckt nur die Befunde
zu Manifest- und DOM-Rollen ab; Nutzlasten hat es nie abgedeckt. Ein
Agent DARF also NICHT annehmen, dass eine Nutzlast geprüft wurde, weil
ein Schema angegeben war: heute ist die einzige Prüfung, die
stattfindet, die, die der Agent vor dem Senden selbst vornimmt.

<!-- u 5f7dd2251b4c | 17 Manifest declaration | prose -->
Die Schemata sind absichtlich einfach (eine Teilmenge in der Form von
JSON-Schema), damit ein Runtime prüfen kann, ohne einen vollständigen
JSON-Schema-Prüfer mitzuliefern, und das bleibt die Entwurfsabsicht für
den Tag, an dem die Prüfung erzwungen wird.

<!-- u 5ca132eea4a7 | 17 Manifest declaration | prose -->
Eine frühere Fassung dieses Abschnitts versprach für die Version 2.4,
die Grammatik des Schemas zu formalisieren und die Erzwingung zum
Standard zu machen. **Das ist in 2.4 nicht passiert und ist es bis zur
2.5 nicht.** Der Satz wird entfernt statt neu datiert: ein Versprechen
mit einer angeklebten Versionsnummer, das über diese Version hinaus
stehen bleibt, liest sich für einen Agenten wie eine Fähigkeit, mit der
er rechnen kann. Die Grammatik zu formalisieren und die Erzwingung
anzuschließen, wird als offene Frage in Abschnitt 13 geführt, wo sie
als offen und ohne Datum steht.

<!-- u a8a904fe4f7c | 18 Disabled-state semantics (v2.3 hotfix from alpha.2) | heading -->
#### Semantik des deaktivierten Zustands (v2.3-Korrektur aus alpha.2)

<!-- u 1c4abe1b856c | 18 Disabled-state semantics (v2.3 hotfix from alpha.2) | prose -->
`NAC.invoke` lehnt NICHT ab, wenn das Zielelement `disabled` oder
`aria-disabled='true'` gesetzt hat. Das HTML-Attribut `disabled` ist
eine Klick-Sperre der Oberfläche; `invoke` ist eine logische Anfrage
mit Nutzlast, kein synthetischer Klick. Hosts, die ein invoke
aufgrund des Oberflächenzustands abweisen müssen, MÜSSEN das in ihrem
Zuhörer für `nac:action:requested` tun und `nac:action:failed` mit
einem Fehlercode ausgeben, der etwas bedeutet.

<!-- u 6840d6a4d6c1 | 18 Disabled-state semantics (v2.3 hotfix from alpha.2) | prose -->
`NAC.click` lehnt dagegen WEITERHIN bei deaktivierten Elementen ab (die
Klick-Semantik bleibt erhalten). Testabdeckung:
`runtime/test/v23-invoke.mjs` T7/T8/T9.

<!-- u 81d52460e217 | 19 Conformance: hosts that support invoke MUST | heading -->
#### Konformität: Hosts, die invoke unterstützen, MÜSSEN

<!-- u 55f1c3270fad | 19 Conformance: hosts that support invoke MUST | prose -->
1. `actions[].payload_schema` im Manifesteintrag angeben.
2. Auf `nac:action:requested` hören (oder einen allgemeinen Zuhörer
   verwenden, der nach `detail.action_id` + `detail.verb` filtert).
3. Nach der Verarbeitung `nac:action:succeeded` ausgeben -- mit
   unverändert zurückgegebener `detail.request_id` -- oder im
   Fehlerfall `nac:action:failed` (mit dem Code in `detail.error`).
4. NIEMALS ein `:succeeded`-Ereignis mit einer `request_id` ausgeben,
   die sie nicht empfangen haben (das verhindert Übersprechen zwischen
   gleichzeitigen Aufrufen).

<!-- u baa88e13de62 | 19 Conformance: hosts that support invoke MUST | prose -->
Hosts, die invoke NICHT unterstützen, arbeiten unter `NAC.click()` und
`NAC.click_by_verb()` normal weiter. Agenten, die `NAC.invoke()` gegen
einen Host ohne `actions[].payload_schema`-Eintrag aufrufen, erhalten
trotzdem eine `request_id`, aber das Runtime kann die Zustellung nicht
garantieren; die Zeitgrenze greift nach 30 s.

<!-- u eeaad94068b6 | 20 Why this matters | heading -->
#### Warum das wichtig ist

<!-- u 282e3ea6a073 | 20 Why this matters | prose -->
Die gesamte agentische Oberfläche ist nicht mehr "eine Liste von
Knöpfen", sondern "eine Liste von Knöpfen + strukturierte Eingaben".
Eine Sprachanzeige wird über NAC.invoke aufrufbar. Eine Suchleiste wird
über NAC.invoke aufrufbar. Ein Datei-Upload wird über NAC.invoke
aufrufbar. Dasselbe Protokoll, dieselbe Herkunft, dieselbe
Bestätigungssemantik.

<!-- u 828f3eb13a49 | 20 Why this matters | prose -->
Der erste Referenzanwender ist **Atlas Pro**: sein Element
`atlas_pro_ad.mic` gibt sowohl das Verb `listen` (nur Klick, schon
vorhanden) als auch `utter` (mit Nutzlast) an. Dieselbe
Gesprächsschleife aus `/parse` + `/tts` steuert in beiden Fällen;
Agenten mit Spracherkennung rufen `listen`, Agenten mit eigenem
Sprachmodell rufen `utter`.

<!-- u 3e2476dc9b6d | 21 Forward modalities (anticipated, no spec change require | heading -->
#### Künftige Modalitäten (vorgesehen, ohne Spezifikationsänderung)

<!-- u 96e747f48094 | 21 Forward modalities (anticipated, no spec change require | prose -->
`invoke` ist absichtlich modalitätsagnostisch, damit künftige
Eingabefamilien sich anschließen lassen, ohne den Vertrag zu brechen:

<!-- u 7b40b2227261 | 21 Forward modalities (anticipated, no spec change require | prose -->
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

<!-- u 93d49eb65964 | 21 Forward modalities (anticipated, no spec change require | prose -->
Jede Modalität folgt demselben Ereignisprotokoll
`nac:action:requested` -> `nac:action:succeeded` / `:failed`,
derselben Zuordnung über `request_id`, derselben Semantik der
Zeitgrenze. Das Runtime bleibt klein; der Wortschatz der Verben wächst
per Konvention zwischen Hosts und Agenten. Ergonomische Kurzformen
(`NAC.utter`, `NAC.search`, `NAC.watch` usw.) lassen sich später
hinzufügen, ohne etwas neu zu spezifizieren, weil jede eine dünne Hülle
über `invoke` ist.

<!-- u 0b074c9e1737 | 22 5.1.5 Shadow DOM resolution -- open roots (v2.3) | heading -->
### 5.1.5 Auflösung im Shadow DOM -- offene Wurzeln (v2.3)

<!-- u 1636464273f9 | 22 5.1.5 Shadow DOM resolution -- open roots (v2.3) | prose -->
Das Runtime löst `data-nac-id`-Verweise rekursiv durch offene
Shadow-Wurzeln hindurch auf. Eine Seite kann Web Components mit
`attachShadow({mode:'open'})` einhängen, `data-nac-*`-Attribute auf
Elemente innerhalb des Shadow-Baums setzen, und jeder NAC3-Aufrufer
(`NAC.click`, `NAC.fill`, `NAC.invoke` usw.) löst das Ziel
durchsichtig auf.

<!-- u b3a1385f2a5d | 23 Resolution algorithm | heading -->
#### Auflösungsalgorithmus

<!-- u 9b00de664df3 | 23 Resolution algorithm | prose -->
Für einen Selektor `S` (typischerweise `[data-nac-id="..."]`) gegen
eine Wurzel `R` (typischerweise `document`):

<!-- u 5f20e7f1e3d3 | 23 Resolution algorithm | prose -->
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

<!-- u bde7cd44c2f1 | 24 Event propagation | heading -->
#### Ereignisweitergabe

<!-- u 872114c02287 | 24 Event propagation | prose -->
Ereignisse, die Hosts innerhalb von Shadow-Wurzeln ausgeben, MÜSSEN
`composed: true` setzen, damit Zuhörer auf Dokumentebene sie
empfangen. Das NAC3-Runtime gibt alle eigenen Ereignisse schon mit
`composed:true` aus; Host-Code, der `nac:*`-Ereignisse von Hand
ausgibt, ist für dasselbe verantwortlich. Ohne `composed:true` bleibt
das Ereignis an der Shadow-Grenze stehen, und die Zuordnungsmechanik
des Runtime sieht es nie.

<!-- u 4fd85059ee08 | 25 Author responsibility | heading -->
#### Verantwortung der Komponentenautorin

<!-- u fa8b14bc2a42 | 25 Author responsibility | prose -->
Wer die Komponente schreibt, muss:

<!-- u 29626dc95548 | 25 Author responsibility | prose -->
1. `data-nac-id`, `data-nac-role`, `data-nac-action` auf die
   bedienbaren Elemente innerhalb der Shadow-Wurzel setzen.
2. `composed:true` auf jedem eigenen Ereignis setzen, das der Host
   ausgibt, um einen NAC3-Vertrag zu signalisieren
   (`nac:action:succeeded`, `nac:field:changed` usw.).
3. `<slot>` für Elemente vermeiden, die im Shadow abgeschottet bleiben
   müssen -- in einen Slot gestellte Knoten leben im Light DOM und
   werden dort aufgelöst.

<!-- u 818fc31bb7f1 | 25 Author responsibility | prose -->
Für offene Shadow-Wurzeln braucht es keinen Hinweis im Manifest und
keine Freischaltung im Runtime; die Auflösung passiert automatisch.

<!-- u 465f7ae635af | 26 Reference implementation | heading -->
#### Referenzimplementierung

<!-- u 2a8c8ecad562 | 26 Reference implementation | prose -->
Das Referenz-Runtime bietet zwei interne Helfer,
`_deepQuery(selector, root)` und `_deepQueryAll(selector, root)`, die
den Durchlauf erledigen. Die öffentlichen Helfer `NAC.click`,
`NAC.fill`, `NAC.invoke`, `NAC.describe` usw. gehen alle über die
tiefen Varianten.

<!-- u cce9bcee3ad4 | 27 Demos and tests | heading -->
#### Demos und Tests

<!-- u 3d3ef999b0ae | 27 Demos and tests | prose -->
- `example-v23-shadow-open.php` -- Demos für offenes Shadow,
  verschachtelt auf 1, 2 und 3 Ebenen.
- `runtime/test/v23-shadow.mjs` T1-T3, T10 -- Unit-Abdeckung,
  einschließlich der Tiefengrenze.

<!-- u 27cadaa47199 | 28 5.1.6 Shadow DOM resolution -- closed roots, voluntary  | heading -->
### 5.1.6 Auflösung im Shadow DOM -- geschlossene Wurzeln, freiwillige Offenlegung (v2.3)

<!-- u e1bdc1f1cb70 | 28 5.1.6 Shadow DOM resolution -- closed roots, voluntary  | prose -->
Geschlossene Shadow-Wurzeln (`attachShadow({mode:'closed'})`) sind von
außerhalb des Codes der Komponentenautorin undurchsichtig: das ist eine
Sicherheitsgrenze des Browsers, keine Entscheidung von NAC3. NAC3 kommt
nicht hinein, solange die Komponentenautorin nicht freiwillig über den
Vertrag unten eine abfragbare Oberfläche offenlegt.

<!-- u cc5e4a5b830e | 29 The `el.nac3` interface contract | heading -->
#### Der Schnittstellenvertrag `el.nac3`

<!-- u 76ac0cb03f1e | 29 The `el.nac3` interface contract | prose -->
Ein eigenes Element DARF über einen Getter namens `nac3` ein
Schnittstellenobjekt an seinem Host anbieten:

<!-- u 9d8b08a63d0f | 29 The `el.nac3` interface contract | prose -->
Komponenten machen mit, indem sie den Getter umsetzen. Komponenten, die
NICHT mitmachen, bleiben für NAC3-Aufrufer unerreichbar (ihre
Innereien bleiben privat, wie der Browser es vorsieht).

<!-- u d267ac2618bd | 30 Resolution semantics | heading -->
#### Semantik der Auflösung

<!-- u d5f238d3820d | 30 Resolution semantics | prose -->
Während `_deepQuery(selector)`, für jedes besuchte Element `el` mit
`el.shadowRoot === null`:

<!-- u 3955816b33aa | 30 Resolution semantics | prose -->
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

<!-- u 75f86a587f3d | 31 Error event detail shapes | heading -->
#### Form des Details der Fehlerereignisse

<!-- u d89cbc6658d3 | 31 Error event detail shapes | prose -->
Detail von `nac:shadow_blocked`:

<!-- u c01abbbc2bac | 31 Error event detail shapes | prose -->
Detail von `nac:shadow_protocol_violation`:

<!-- u cdc7ee5d5dc1 | 31 Error event detail shapes | prose -->
Beide Ereignisse steigen auf (`bubbles: true`) und überschreiten
Shadow-Grenzen (`composed: true`). Die Entdopplung erfolgt pro Host
über ein WeakSet, das das Runtime führt; derselbe Host gibt jedes
Ereignis **höchstens einmal pro Seitenaufruf** aus.

<!-- u 5fd63d2eb19d | 32 Why voluntary | heading -->
#### Warum freiwillig

<!-- u 64413da3b9b6 | 32 Why voluntary | prose -->
Die Undurchsichtigkeit geschlossener Shadows erzwingt der Browser.
Selbst wenn NAC3 einen unfreiwilligen Mechanismus festlegen würde,
würde der Browser ihn verhindern. Die freiwillige Offenlegung lässt der
Komponentenautorin die vollständige Kontrolle darüber, wie ihre
öffentliche Oberfläche für Agenten aussieht.

<!-- u 374ef204681b | 32 Why voluntary | prose -->
Der Preis ist das Mitmachen pro Komponente; der Nutzen ist, dass
NAC3-konforme Agenten gegen Design-Systeme mit geschlossenen
Shadow-Komponenten funktionieren (Salesforce Lightning, einige
Komponenten von GitHub Primer, sicherheitskritische Widgets), ohne
Adaptercode pro Komponente.

<!-- u 08aa8d40de06 | 33 Demos and tests | prose -->
- `example-v23-shadow-closed.php` -- der positive Fall
  (`<todo-card-closed-exposed>`) und der negative
  (`<todo-card-closed-blind>`) nebeneinander, mit Urteilsfeldern +
  laufendem Ereignisprotokoll.
- `runtime/test/v23-shadow.mjs` T4-T9 -- Unit-Abdeckung für jede
  Familie von Fehlerereignissen, dazu die Semantik der Entdopplung.
- `guides/SHADOW_DOM_CLOSED.md` -- Leitfaden für Komponentenautoren.

<!-- u 230b5b4555fa | 34 5.1.7 Auth-aware capabilities (v2.3) | heading -->
### 5.1.7 Berechtigungsbewusste Fähigkeiten (v2.3)

<!-- u eb36568e63b4 | 34 5.1.7 Auth-aware capabilities (v2.3) | prose -->
NAC3 v2.3 erlaubt dem Manifest, je Aktion die verlangten Fähigkeiten
anzugeben, und sperrt damit `NAC.click` und `NAC.invoke` schon vor dem
Versand. Der Agent erhält eine schnelle Ablehnung
(`code='capability_required'`) statt eines Hin und Her, das
serverseitig scheitert.

<!-- u 3394e13a69f2 | 35 Manifest declaration | prose -->
Eine Fähigkeitsanforderung hängt sich auf Elementebene oder auf
Verbebene an. Sind beide vorhanden, gewinnt die auf Verbebene.

<!-- u ed181c92022d | 35 Manifest declaration | prose -->
Für eine UND-Semantik ("der Benutzer braucht ALLE diese Fähigkeiten")
gib jede über getrennte gesperrte Aktionen an, oder setze es auf der
Host-Seite im Zuhörer für `nac:action:requested` zusammen.

<!-- u 41895cfbb955 | 36 Public API | heading -->
#### Öffentliche API

<!-- u 5c22e765201e | 36 Public API | prose -->
`setCapabilities` ersetzt die ganze Menge (für Anmeldung oder
Sitzungserneuerung). `grantCapability` / `revokeCapability` arbeiten
schrittweise. `userCapabilities` gibt ein Array als Momentaufnahme
zurück. `setCapabilities(null)` leert die Menge.

<!-- u 519e43ca0c04 | 36 Public API | prose -->
Hosts rufen das auf, wann immer sich die Rolle des Benutzers ändert.
Die Menge lebt im Runtime; kein Neuladen eines Manifests ist nötig.

<!-- u 4147b564fd7d | 37 Gate semantics | heading -->
#### Semantik der Sperre

<!-- u b7a3a617e58d | 37 Gate semantics | prose -->
Vor dem Versand suchen `NAC.click(id)` und `NAC.invoke(id, payload)`
den passenden Manifesteintrag (Element + Verb), lesen
`requires_capability` und rufen `_hasCapability` auf:

<!-- u 55539817baee | 37 Gate semantics | prose -->
- Keine Anforderung angegeben -> erlaubt.
- Anforderung angegeben und die aktuelle Menge erfüllt sie ->
  erlaubt.
- Anforderung angegeben und die aktuelle Menge erfüllt sie NICHT ->
  Ablehnung mit `NacError('capability_required', ...)` UND Ausgabe von
  `nac:command:rejected` mit
  `detail.reason='capability_required'`.

<!-- u 61bc21f3c289 | 37 Gate semantics | prose -->
Die Sperre läuft bei `click` NACH den Prüfungen auf `not_found` /
`disabled` / `hidden`, damit das genaueste Scheitern nach oben kommt.
Bei `invoke` läuft die Sperre, bevor das Anfrageereignis losgeht (der
Host sieht nie einen unberechtigten Versuch).

<!-- u 03badbc3eb0d | 38 Why this matters | prose -->
Ohne die Sperre hat ein Agent, der `NAC.click('finance.delete')`
aufruft, entweder Erfolg (gar keine Berechtigungssperre ->
Sicherheitsloch) oder er scheitert serverseitig mit einem 403, mehrere
Sekunden später. Mit der Sperre erfährt der Agent synchron, dass ihm
die Fähigkeit fehlt, und kann angemessen reagieren (einen anderen
Ablauf anfragen, eine Rechteerhöhung erbitten, die Einschränkung dem
Benutzer zeigen).

<!-- u e2ef7786fa19 | 38 Why this matters | prose -->
Das ergänzt die serverseitige Berechtigungsprüfung -- es ersetzt sie
nicht. Hosts MÜSSEN die Rechte weiterhin auf dem Server durchsetzen.
Die Sperre auf dem Client ist eine Verbesserung der Bedienung und ein
Signal auf Absichtsebene, keine Sicherheitsgrenze.

<!-- u cda6b9e803c0 | 39 Demos and tests | prose -->
- `runtime/test/v23-capabilities.mjs` -- 17 Zusicherungen, die das
  Setzen und Lesen der Menge, das Erteilen und Entziehen, die
  Klick-Sperre, die invoke-Sperre, die Auflösung zwischen Verbebene und
  Elementebene, die ODER-Semantik, das Leeren mit null, die Ablehnung
  ungültiger Eingaben und die Regression der ungesperrten Aktionen
  abdecken.

<!-- u 79530c72b823 | 40 5.1.2 Strict validation flag (v2.2; default-flipped in  | heading -->
### 5.1.2 Schalter für strenge Prüfung (v2.2; Standardwert in v2.3 umgestellt)

<!-- u 7206e583b3eb | 40 5.1.2 Strict validation flag (v2.2; default-flipped in  | prose -->
`NAC.STRICT_VALIDATION` (boolesch). Wenn er `true` ist, wirft
`NAC.register()` einen `Error` mit `code='strict_validation'` und
einem Array `findings` in jedem dieser Fälle:

<!-- u 1f68e4a109ee | 40 5.1.2 Strict validation flag (v2.2; default-flipped in  | prose -->
- `manifest_role_unknown` -- die Rolle des Eintrags liegt außerhalb der
  kanonischen Menge.
- `tab_id_manifest_role_drift` -- die id passt auf `^tab\.`, aber die
  Rolle ist nicht `'tab'`.
- `manifest_dom_role_mismatch` -- das `data-nac-role` des im DOM
  eingehängten Elements unterscheidet sich von der Rolle des
  Manifesteintrags.

<!-- u c981b4852469 | 40 5.1.2 Strict validation flag (v2.2; default-flipped in  | prose -->
**Standardwert:**

<!-- u 1aa996774f91 | 40 5.1.2 Strict validation flag (v2.2; default-flipped in  | prose -->
- **v2.2.x:** `false` (nur Warnung). Anwender brauchten ein
  Migrationsfenster.
- **v2.3.x:** **`true`** (wirft). Das Migrationsfenster schloss mit der
  v2.2-Linie. Anwender mit abweichungsbeladenen Manifesten steigen aus,
  indem sie `NAC.STRICT_VALIDATION = false` setzen, BEVOR irgendein
  `register()` aufgerufen wird.
- **v3.0:** der Schalter verschwindet (streng ist der einzige Modus).

<!-- u cf1e1b799422 | 40 5.1.2 Strict validation flag (v2.2; default-flipped in  | prose -->
Siehe `guides/MIGRATION_v2.2_to_v2.3.md` für das Drehbuch zum
Aufräumen der Abweichungsbefunde.

<!-- u cdd2e2a2034f | 40 5.1.2 Strict validation flag (v2.2; default-flipped in  | prose -->
Alle asynchronen Methoden lehnen mit einem `NacError` ab, dessen `code`
einer der folgenden ist:

<!-- u 7cdfcbe3b161 | 40 5.1.2 Strict validation flag (v2.2; default-flipped in  | prose -->
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

<!-- u d50c9290e353 | 41 5.2 Introspection | heading -->
### 5.2 Introspektion

<!-- u 68e75bf70e68 | 42 5.3 Data tables (since 2.1) | heading -->
### 5.3 Datentabellen (seit 2.1)

<!-- u e835e9440f25 | 42 5.3 Data tables (since 2.1) | prose -->
Die Primitive für Datentabellen sind NICHT Teil des Kern-Runtime
(`js/nac.js` / das `nac.mjs` von `@nac3/runtime`). Sie kommen im
Brownfield-Erweiterungsmodul `js/nac-v2-extensions.js` (veröffentlicht
als `@nac3/runtime/extensions`), das sie nach dem Laden an dasselbe
`window.NAC`-Objekt anhängt. Lade das Erweiterungsmodul nach dem
Kern-Runtime, um die `dt_*`-Oberfläche zu bekommen:

<!-- u 1702f2abb7ea | 42 5.3 Data tables (since 2.1) | prose -->
Die Methoden unten gibt es nur, wenn das Erweiterungsmodul geladen ist;
sie auf einem Runtime mit nur dem Kern aufzurufen tut nichts / gibt
`undefined` zurück.

<!-- u ebe9fa027ecd | 42 5.3 Data tables (since 2.1) | prose -->
Eine Datentabelle hat eine `subkind`:

<!-- u 731086aa49b1 | 42 5.3 Data tables (since 2.1) | prose -->
- `collection` -- geordnete Zeilen, mit optionaler transaktionaler
  Übernahme. Für Rechnungszeilen, Warenkorbposten, Protokolleinträge.
- `matrix` -- ein Gitter aus Zeile x Spalte, in dem jede Zelle einen
  Wert trägt. Für Berechtigungsmatrizen, Stundenpläne.
- `matrix-singletree` -- eine Matrix, in der jede Zeile zu einem Baum
  zusammenklappt (selten).

<!-- u bf57d7617b5a | 43 5.4 Strict resolution + disambiguation (v2.4) | heading -->
### 5.4 Strenge Auflösung + Vereindeutigung (v2.4)

<!-- u 5ce8d66447ea | 43 5.4 Strict resolution + disambiguation (v2.4) | prose -->
NAC3 v2.4 macht die Auflösung von id, Verb, Qualifizierer und Label
**streng**. Die Verben, die eine Anfrage auf ein einziges DOM-Element
auflösen -- `click_by_verb`, `tab` (die Form mit einem Argument) und
`tab_by_label` -- raten nicht mehr. Wenn eine Anfrage auf null
Kandidaten oder auf mehr als einen auflöst, wirft das Runtime einen
`NacError`, der die Kandidatenliste mitführt, UND gibt ein Ereignis
`nac:disambiguation_requested` aus, statt still an den ersten
Beinahe-Treffer zu schicken.

<!-- u 1360c72f2adf | 43 5.4 Strict resolution + disambiguation (v2.4) | prose -->
Das ist die Invariante **null stiller Schaden**. Sie existiert für
Hilfssoftware und für Agenten, wo ein stiller Versand an das falsche
Element ohne Weg zurück ein Sicherheitshindernis ist. Das
nachgiebige Verhalten vor 2.4 -- ein Rückfall über `indexOf` auf
Teilstrings, der auf den ersten Beinahe-Treffer auflöste -- ist
entfernt.

<!-- u 61c212ab5c75 | 43 5.4 Strict resolution + disambiguation (v2.4) | prose -->
> Rückwärtskompatibilität: v2.4 ist eine Änderung des
> *Vertragsverhaltens*. Codewege, die schon eindeutige Argumente
> übergaben, arbeiten unverändert weiter. Codewege, die sich auf den
> nachgiebigen `indexOf`-Rückfall verließen, um auf den ersten
> Beinahe-Treffer aufzulösen, werfen jetzt -- so gewollt.

<!-- u 9ded25436c09 | 44 5.4.1 Strict qualifier matching (`click_by_verb`) | heading -->
#### 5.4.1 Strenger Abgleich des Qualifizierers (`click_by_verb`)

<!-- u 03e301b58109 | 44 5.4.1 Strict qualifier matching (`click_by_verb`) | prose -->
`click_by_verb(plugin, verb, opts?)` wählt unter den DOM-Knoten, die
`data-nac-action="<verb>"` teilen. Wenn `opts.qualifier` (eine
Zeichenkette) übergeben wird, passt ein Element **nur**, wenn sein
`data-nac-id` Folgendes erfüllt:

<!-- u 3c202d4daa0e | 44 5.4.1 Strict qualifier matching (`click_by_verb`) | prose -->
Das heißt: genaue Gleichheit der id, oder ein verankertes Suffix nach
einem Trenner `__`. **Es gibt keinen Rückfall auf Teilstrings.** Ein
Qualifizierer, der bloß ein Teilstring einer id ist (nicht gleich, kein
verankertes `__suffix`), passt NICHT.

<!-- u a814e14491fc | 44 5.4.1 Strict qualifier matching (`click_by_verb`) | prose -->
- 0 Treffer -> wirft `NacError('no_matching_instance', ...)`.
- genau 1 Treffer -> löst auf und klickt.
- >1 Treffer -> wirft `NacError('ambiguous_qualifier', ...)`.

<!-- u 4218e75d95da | 44 5.4.1 Strict qualifier matching (`click_by_verb`) | prose -->
`opts.qualifier_ordinal` (eine Zahl) wählt nach Position unter allen
DOM-Elementen, die das Verb teilen, und umgeht den Abgleich des
Qualifizierers.

<!-- u d62dc6b56ca3 | 45 5.4.2 Strict id resolution (`tab`) | heading -->
#### 5.4.2 Strenge Auflösung der id (`tab`)

<!-- u 1a464a4756f3 | 45 5.4.2 Strict id resolution (`tab`) | prose -->
Form mit einem Argument von `tab(plugin, id)`: ein genauer Treffer auf
`data-nac-id` im DOM gewinnt. Sonst sucht das Runtime Instanzen, deren
id mit `id + "__"` beginnt:

<!-- u 2cae0a8b088f | 45 5.4.2 Strict id resolution (`tab`) | prose -->
- 0 qualifizierte Instanzen und keine genaue id ->
  `no_matching_instance`.
- genau 1 -> löst auf.
- >1 -> `ambiguous_tab` (übergib die vollständige qualifizierte id).

<!-- u 9dd62e535c05 | 46 5.4.3 Strict label resolution (`tab_by_label`) | heading -->
#### 5.4.3 Strenge Auflösung über das Label (`tab_by_label`)

<!-- u 6bd19a3dd928 | 46 5.4.3 Strict label resolution (`tab_by_label`) | prose -->
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

<!-- u 4da1ef43f342 | 47 5.4.4 Error codes | heading -->
#### 5.4.4 Fehlercodes

<!-- u b30b09fb4fb9 | 47 5.4.4 Error codes | prose -->
| `err.code` | Geworfen von | Bedeutung |
|------------|-----------|---------|
| `no_matching_instance` | `click_by_verb` (Qualifizierer), `tab` | kein Element passt auf den Qualifizierer / die id |
| `ambiguous_qualifier`  | `click_by_verb` | mehr als 1 Element passt auf den Qualifizierer |
| `ambiguous_tab`        | `tab`           | mehr als 1 qualifizierte `id__`-Instanz passt |
| `ambiguous_label`      | `tab_by_label`  | mehr als 1 Tab passt auf das Label (auf irgendeiner Stufe) |
| `not_found`            | `tab_by_label`  | kein Tab passt auf das Label |

<!-- u 2eacef367ba7 | 48 5.4.5 The `err.candidates` shape | heading -->
#### 5.4.5 Die Form von `err.candidates`

<!-- u d9e50d2513fb | 48 5.4.5 The `err.candidates` shape | prose -->
Jeder Vereindeutigungsfehler führt ein Array `candidates` mit. Jeder
Kandidat ist genau:

<!-- u bc9f0faf0ccb | 48 5.4.5 The `err.candidates` shape | prose -->
`nac_id` ist das `data-nac-id` des Elements. `label` wird aufgelöst,
indem `aria-label` bevorzugt wird, dann der beschnittene `textContent`
(auf 120 Zeichen gekürzt), und zuletzt auf das `data-nac-id`
zurückgefallen wird. Die Liste ist gegen das DOM geprüft: sie nennt die
echten Elemente, aus denen der Aufrufer wählen kann. `NacError` führt
`candidates` in den geworfenen `Error` zusammen, sodass `err.code`,
`err.message` und `err.candidates` alle drei gefüllt sind.

<!-- u 652f14fc6baa | 49 5.4.6 The `nac:disambiguation_requested` event | heading -->
#### 5.4.6 Das Ereignis `nac:disambiguation_requested`

<!-- u 595fd49c77a0 | 49 5.4.6 The `nac:disambiguation_requested` event | prose -->
Immer wenn ein Aufruf der strengen Auflösung scheitert (kein Treffer
ODER zu viele Treffer), schickt das Runtime ein `CustomEvent`
`nac:disambiguation_requested` an `document`, *zusätzlich* zum Werfen
der Ausnahme. Die Ausgabe erfolgt nach bestem Bemühen: scheitert der
Versand, wirft das Runtime trotzdem.

<!-- u e258631d1e18 | 50 5.4.7 How a caller disambiguates | heading -->
#### 5.4.7 Wie ein Aufrufer vereindeutigt

<!-- u 4277d2b1e5ff | 50 5.4.7 How a caller disambiguates | prose -->
Mit der Kandidatenliste in der Hand (aus `err.candidates` oder
`event.detail.candidates`) wählt der Aufrufer einen aus und schickt
erneut, auf einem dieser Wege:

<!-- u 874e8bd6dc4a | 50 5.4.7 How a caller disambiguates | prose -->
1. **Die vollständige `nac_id`** -- `NAC.click(candidate.nac_id)`. Das
   ist der kanonische Weg zurück: der Kandidat trägt die genaue id
   schon mit sich.
2. **Das verankerte `__suffix`** -- übergib `click_by_verb` das genaue
   Suffix der Instanz als Qualifizierer.
3. **`opts.qualifier_ordinal`** -- Auswahl nach Position unter den
   Elementen, die das Verb teilen (in DOM-Reihenfolge).

<!-- u 830efd33c855 | 50 5.4.7 How a caller disambiguates | prose -->
Das ausgearbeitete Beispiel ist `example-v24-disambiguation.php`; der
Vertrag ist durch `runtime/test/stage2-disambiguation.mjs` und
`runtime/test/stage7-strict-resolution.mjs` abgedeckt.

<!-- u 9a85added5a4 | 51 6. Events | heading -->
## 6. Ereignisse

<!-- u 3a66eff18a73 | 51 6. Events | prose -->
Jede Aktion gibt ein deterministisches Abschlussereignis aus. Das
`NAC.click()` des Runtime wartet auf dieses Ereignis und löst auf, wenn
es losgeht.

<!-- u 97fd131e3759 | 51 6. Events | prose -->
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

<!-- u d6c1e7b3214b | 52 6.1 Event detail shape | heading -->
### 6.1 Form des Ereignisdetails

<!-- u 963657156129 | 52 6.1 Event detail shape | prose -->
Das Detail jedes Ereignisses trägt das kanonische id-Feld, dazu
`plugin`:

<!-- u 1c1a163a8447 | 53 6.2 Emitting from a host handler | heading -->
### 6.2 Ausgeben aus einem Host-Handler

<!-- u e16fdbe62bd6 | 53 6.2 Emitting from a host handler | prose -->
Ein Klick-Handler MUSS nach seiner synchronen Wirkung das passende
Erfolgsereignis ausgeben:

<!-- u 495a09517d94 | 53 6.2 Emitting from a host handler | prose -->
Ist die Arbeit asynchron, gib nach dem Auflösen aus. Scheitert die
Arbeit, gib `nac:action:failed` mit `{detail: {plugin, action_id,
error: <message>}}` aus.

<!-- u 6edbabccfab8 | 53 6.2 Emitting from a host handler | prose -->
Das v2.2-Runtime wird `NAC.bindAction(el, handler, ctx)`
bereitstellen, das `addEventListener` umhüllt und automatisch ausgibt.

<!-- u 7160fc51611b | 54 6.3 Why not use the click event itself? | heading -->
### 6.3 Warum nicht das Klick-Ereignis selbst nehmen?

<!-- u 1baa670f9949 | 54 6.3 Why not use the click event itself? | prose -->
Ein DOM-`click`-Ereignis geht los, bevor der Handler läuft. Der Vertrag
von NAC3 muss wissen, wann **die Wirkung abgeschlossen ist**, nicht
wann der Klick begann. Daher die getrennte Ereignisfamilie.

<!-- u 8c146906a8b5 | 55 7. Provenance | heading -->
## 7. Herkunft

<!-- u cda1f0fe1033 | 56 7.1 isTrusted | heading -->
### 7.1 isTrusted

<!-- u ef353b56420d | 56 7.1 isTrusted | prose -->
`event.isTrusted` ist `true` bei Klicks, die eine Person ausgelöst hat
(echte Maus, echter Tastendruck, Auslösen durch einen Screenreader),
und `false` bei synthetisierten Klicks (`element.click()`, das
dispatchEvent eines selbst gebauten MouseEvent, Automatisierung).

<!-- u a62b76a788d4 | 56 7.1 isTrusted | prose -->
NAC3 MUSS das über `event.detail.is_trusted` im Erfolgsereignis
sichtbar machen. Hosts, die sicherheitskritische Aktionen ausführen
(Bezahlung, Löschung), DÜRFEN `is_trusted === true` verlangen und
synthetische Klicks abweisen. Die Referenzdemo
`example-v20-full.php` enthält ein Knopfpaar
(`v20_panel.istrusted_real` und `v20_panel.istrusted_fake`), das den
Unterschied zeigt.

<!-- u 99edfdf1816d | 57 7.2 HMAC-signed manifests | heading -->
### 7.2 Mit HMAC unterzeichnete Manifeste

<!-- u eaddcc19c68b | 57 7.2 HMAC-signed manifests | prose -->
Ein Manifest DARF einen `provenance`-Block tragen:

<!-- u a1e273bf09d9 | 57 7.2 HMAC-signed manifests | prose -->
Das Runtime berechnet den erwarteten HMAC über eine stabile
Serialisierung des Manifests (ohne die Unterschrift selbst) und lehnt
Manifeste ab, deren Unterschrift nicht passt. Wird von
mehrmandantenfähigen Installationen genutzt, um zu verhindern, dass ein
Mandant das Manifest eines anderen fälscht.

<!-- u 42eadfcaf1d4 | 58 7.3 Threat model | heading -->
### 7.3 Bedrohungsmodell

<!-- u e7fda825444a | 58 7.3 Threat model | prose -->
Siehe `SECURITY.md` für das vollständige Bedrohungsmodell. Die kurze
Fassung:

<!-- u e1934c89ce6b | 58 7.3 Threat model | prose -->
- NAC3 authentisiert nicht den **Benutzer**. Das ist die Aufgabe
  deiner Authentisierungsschicht.
- NAC3 authentisiert das **Manifest** (HMAC).
- NAC3 unterscheidet echte Klicks von synthetisierten (isTrusted),
  damit ein Host die zweiten bei sensiblen Verben abweisen kann.
- NAC3 schützt nicht vor einem bösartigen Agenten, der mit dem Zugriff
  des Benutzers läuft. So ein Agent kann alles, was der Benutzer kann.

<!-- u 4f92477e8bbc | 59 8. Conformance levels | heading -->
## 8. Konformitätsstufen

<!-- u f5b96249fe7b | 59 8. Conformance levels | prose -->
Eine Stufe schreibt sich **NAC3 Conformance Level 1**, **2** oder
**3**. Der Name einer Stufe ist nicht der Name des Protokolls: ein
Prüfer, ein Bericht oder eine Konformitätsaussage MUSS eine Stufe über
den Bezeichner `nac3-conformance-level-<1|2|3>` nennen, der in
`api/latest/levels.json` veröffentlicht ist, niemals über einen
Anzeigenamen. Abschnitt 8.1 hält die Namen fest, die diese Stufen vor
2.5.0 trugen.

<!-- u d73a01bfbec7 | 59 8. Conformance levels | prose -->
Eine Seite ist auf **NAC3 Conformance Level 1**, wenn:

<!-- u b8d1b21abef0 | 59 8. Conformance levels | prose -->
- Jedes klickbare Widget, das ein Agent bedienen können sollte,
  `data-nac-id` und `data-nac-role` trägt.
- Jedes Element mit `data-nac-role="action"` nach seiner Wirkung
  `nac:action:succeeded` auslöst.
- Die Seite mindestens ein Plugin-Manifest über `NAC.register()`
  registriert.
- `NAC.click(id)` für jede angekündigte id funktioniert.

<!-- u 8fea90259550 | 59 8. Conformance levels | prose -->
Eine Seite ist auf **NAC3 Conformance Level 2**, wenn sie außerdem:

<!-- u 548ba93fb7d9 | 59 8. Conformance levels | prose -->
- Die Arrays `tabs[]`, `fields[]`, `actions[]` ausdrücklich in ihrem
  Manifest registriert (nicht aus dem DOM abgeleitet).
- `label_i18n` für jedes dem Benutzer sichtbare Label mit allen 10
  NAC3-Locales bereitstellt.
- Die Brownfield-Primitive von v2.0 umsetzt: Geltungsbereichsbaum,
  flüchtige Erfassung, autoRegister.watch.
- `NAC.validate_global({probe: false})` mit null Befunden der Schwere
  `error` besteht.

<!-- u f9a2abaf6fbe | 59 8. Conformance levels | prose -->
Eine Seite ist auf **NAC3 Conformance Level 3**, wenn sie außerdem:

<!-- u 31ae71ba8c81 | 59 8. Conformance levels | prose -->
- Mit HMAC unterzeichnete Manifeste trägt.
- `isTrusted` bei sicherheitskritischen Verben unterscheidet.
- `NAC.validate_global({probe: true})` mit null Befunden besteht.

<!-- u c76a5cbd0d90 | 59 8. Conformance levels | prose -->
Die Kommandozeile des NPM-Pakets (`npx nac3 validate <url>`) nennt die
höchste Stufe, die eine Seite erreicht. (Das Paket liefert die Binaries
`nac3` und `nac`; beide führen zur gleichen Kommandozeile.)

<!-- u 45c18bc89776 | 60 8.1 Historical level names (v2.5) | heading -->
### 8.1 Historische Namen der Stufen (v2.5)

<!-- u e497f12e1675 | 60 8.1 Historical level names (v2.5) | prose -->
Vor 2.5.0 schrieben sich die drei Stufen `NAC-1`, `NAC-2` und `NAC-3`.
Diese Namen sind einen Bindestrich vom Protokollnamen `NAC3` entfernt,
sodass sich "diese Seite ist NAC-3-konform" nicht von "diese Seite
setzt NAC3 um" unterscheiden ließ, und ein Agent, der eine Stufe nennen
sollte, hatte keine eindeutige Zeichenkette zum Nennen.

<!-- u 4da6a2838062 | 60 8.1 Historical level names (v2.5) | prose -->
Die alten Namen bleiben als historische Aliasse lesbar:
`api/latest/levels.json` veröffentlicht jeden als
`legacy_display_name` neben der Stufe, zu der er gehörte, damit ein
vor 2.5.0 geschriebenes Dokument noch einer Stufe zugeordnet werden
kann. Sie sind NICHT normativ. Neuer Text, Prüferausgaben und
Konformitätsaussagen verwenden die Stufennummer oder den
veröffentlichten Bezeichner.

<!-- u 25cf5f341851 | 61 9. Versioning | heading -->
## 9. Versionierung

<!-- u f434370102cd | 61 9. Versioning | prose -->
NAC3 folgt semver:

<!-- u 21961e924493 | 61 9. Versioning | prose -->
- **Major**-Sprung: brechende Änderung der öffentlichen API oder der
  Übertragungsformate. Anwender müssen Code ändern.
- **Minor**-Sprung: neue Funktionen, rückwärtskompatibel. Alter Code
  arbeitet weiter.
- **Patch**-Sprung: Fehlerkorrekturen, Änderungen nur an der
  Dokumentation.

<!-- u 354961fe88c7 | 61 9. Versioning | prose -->
Abkündigungsregel: eine in Version `X.Y.0` als `@deprecated` markierte
Funktion wird nicht vor `(X+1).0.0` entfernt. Die
Veröffentlichungshinweise dokumentieren jede Entfernung ausdrücklich.

<!-- u 6040a078d2c9 | 61 9. Versioning | prose -->
Die Version des NPM-Pakets spiegelt die Version der Spezifikation:
`@nac3/runtime@X.Y.Z` setzt NAC3 vX.Y um, mit Z Patch-Revisionen
darüber. Das Beispiel ist absichtlich mit Platzhaltern geschrieben:
eine konkrete Version in diesem Satz veraltet mit der nächsten
Veröffentlichung, und dieses Dokument trug `2.1.3` noch lange, nachdem
das Paket weitergezogen war.

<!-- u db4793e191d0 | 62 9.1 Prereleases and dist-tags | heading -->
### 9.1 Vorabversionen und dist-tags

<!-- u c525c183f446 | 62 9.1 Prereleases and dist-tags | prose -->
Eine Version mit einem Vorabanhang (`-alpha.N`, `-beta.N`, `-rc.N`)
ist **keine** veröffentlichte Fassung dieser Spezifikation. Sie
existiert, damit eine Änderung geübt werden kann, bevor sie versprochen
wird.

<!-- u 06f01c7dd1c2 | 62 9.1 Prereleases and dist-tags | prose -->
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

<!-- u 5ff3ab15b820 | 62 9.1 Prereleases and dist-tags | prose -->
Die maßgebliche Version des Referenz-Runtime ist die Konstante
`NAC.version` in `js/nac.js`, und sie wird als Daten veröffentlicht:
`api/latest.json` führt einen getrennten Zeiger `stable` und
`prerelease` (jeder von beiden darf `null` sein), und jedes
veröffentlichte Artefakt trägt sein eigenes Feld `channel`. Ein
Verbraucher, der einen stabilen Vertrag braucht, liest ein Feld und
lehnt ab -- ohne eine Versionszeichenkette zu zerlegen und ohne einem
Tag zu glauben.

<!-- u 5f55983494b3 | 63 10. Validators | heading -->
## 10. Prüfer

<!-- u 2f3408ca1b03 | 64 10.1 Runtime: `NAC.validate_global()` | heading -->
### 10.1 Runtime: `NAC.validate_global()`

<!-- u ace4de89e478 | 64 10.1 Runtime: `NAC.validate_global()` | prose -->
Durchläuft das lebende DOM + die registrierten Manifeste und gibt ein
**Objekt aus benannten Gruppen** zurück: eine Gruppe pro Bedingung,
jede ein Array von Befunden. Seit 2.5.0 trägt jeder Befund jeder Gruppe
`code` und `severity`, sodass eine CI-Einbindung auf einen Code sperren
kann, ohne eine Meldung zu zerlegen:

<!-- u ac96fbc7a1f3 | 64 10.1 Runtime: `NAC.validate_global()` | prose -->
Die fünf Codes, ihre Schwere und was man mit jedem tut, werden als
Daten unter `api/latest/findings.json` veröffentlicht, im Abschnitt
`global_buckets`. Befundcodes sind über Patch-Veröffentlichungen
hinweg stabil; neue Codes nur bei Minor-Sprüngen, und ein Code wird
niemals für eine andere Bedingung wiederverwendet (Abschnitt 12,
Versprechen 4).

<!-- u ab93934bfc7f | 64 10.1 Runtime: `NAC.validate_global()` | prose -->
**Versionen vor 2.5.0 hefteten diesen Gruppen keinen Code an**, und
dieser Abschnitt beschrieb ein flaches Array von Befunden, das das
Referenz-Runtime nie zurückgab (Audit N-14, N-34).

<!-- u 656369a32729 | 64 10.1 Runtime: `NAC.validate_global()` | prose -->
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

<!-- u 8cb460800177 | 65 10.2 CLI: `npx nac3 validate <target>` | heading -->
### 10.2 CLI: `npx nac3 validate <target>`

<!-- u 5f1634cd35ad | 65 10.2 CLI: `npx nac3 validate <target>` | prose -->
Umhüllt `validate_global` plus eine statische Prüfung der
Übereinstimmung von HTML und Manifest. Rückgabewerte:

<!-- u 54affecdb5b9 | 65 10.2 CLI: `npx nac3 validate <target>` | prose -->
- `0` -- keine Befunde mit Schwere >= der eingestellten Schwelle.
- `1` -- es gibt Befunde.
- `2` -- das Ziel selbst ließ sich nicht laden.

<!-- u 62c5dfe68407 | 65 10.2 CLI: `npx nac3 validate <target>` | prose -->
Nützlich in der CI: `npx nac3 validate ./dist/index.html
--severity=error`. Das Paket stellt die CLI unter zwei Binary-Namen
bereit, `nac3` und `nac`; nimm den, der nicht mit einem anderen
Werkzeug in deinem PATH zusammenstößt.

<!-- u 01fa36c8d26c | 66 11. The system around NAC3 | heading -->
## 11. Das System um NAC3 herum

<!-- u 7ad464281bfd | 66 11. The system around NAC3 | prose -->
NAC3 ist eine Vertragsschicht. Um eine NAC3-konforme Seite in eine
sprachgesteuerte Anwendung zu verwandeln, braucht es außerdem:

<!-- u 10116f319016 | 66 11. The system around NAC3 | prose -->
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

<!-- u 400f6554acb4 | 66 11. The system around NAC3 | prose -->
NAC3 normt nur die Ein- und Ausgabeform von Schritt 2 (die
Momentaufnahme aus `NAC.describe()` + die Form der Aktionen). Die
Schritte 1, 3 und 4 liegen außerhalb der Spezifikation; du setzt
zusammen, was du magst.

<!-- u 9bd0d10006ac | 67 12. Stability guarantees | heading -->
## 12. Stabilitätsgarantien

<!-- u d448e3d3251d | 67 12. Stability guarantees | prose -->
Was diese Spezifikation verspricht:

<!-- u 299877632664 | 67 12. Stability guarantees | prose -->
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

<!-- u 7401ca7e951e | 67 12. Stability guarantees | prose -->
Was diese Spezifikation NICHT verspricht:

<!-- u 0f44826d96f1 | 67 12. Stability guarantees | prose -->
1. Den genauen Wortlaut der Fehlermeldungen (das sind Zeichenketten aus
   dem i18n-Katalog; Übersetzungen können sich verschieben).
2. Die DOM-Strategie zum Finden der Elemente (`querySelector` heute;
   später vielleicht ein schnellerer Index).
3. Den inneren Aufbau des Manifest-Zwischenspeichers. Behandle
   Manifeste host-seitig als nur schreibbar und agentenseitig als nur
   lesbar.

<!-- u a6934dd2b815 | 68 13. Open questions | heading -->
## 13. Offene Fragen

<!-- u f9ce60b69c5c | 68 13. Open questions | prose -->
Sie werden **hier** geführt, in diesem Abschnitt. Eine frühere Fassung
nannte dies "Offene Fragen (getrennt geführt)" und sagte nie, wo dieses
"getrennt" lag; es gab kein anderes Verzeichnis. Eine Frage, die zu
einer Entscheidung kommt, verlässt die Tabelle unten und zieht in den
Abschnitt, den sie betrifft. Eine Frage, die zu einem konkreten
Vorschlag wird, bekommt einen RFC, und die sind in
[`rfcs/README.md`](rfcs/README.md) verzeichnet, mit dem Verfahren in
[`CONTRIBUTING.md`](CONTRIBUTING.md).

<!-- u dcb4765e57ff | 68 13. Open questions | prose -->
Jede Zeile trägt die Version, in der sie zuletzt bewertet wurde, damit
Lesende eine lebende Frage von einer aufgegebenen unterscheiden können.
**Keine Zeile trägt eine Zielversion**: ein datiertes Versprechen, das
sein Datum überschreitet, ist schlimmer als ein undatiertes -- das ist
der Fehler, den Abschnitt 5 bei `payload_schema` machte.

<!-- u 5bc638bb20cd | 68 13. Open questions | prose -->
| Frage | Stand | Letzte Bewertung | Wie es steht |
|----------|-------|---------------|-----------------|
| Sollte `data-nac-role="navigation"` jemals auf einen Tab auflösen? | **ENTSCHIEDEN: nein** | v2.5 | In 2.2.0 entschieden und seither durchgesetzt: eine id mit Präfix `tab.` und der Rolle `navigation` löst `tab_id_manifest_role_drift` aus, und mit `STRICT_VALIDATION` (Vorgabe `true` seit 2.3.0) wirft `NAC.register`. `tab_by_label` löst Tabs nur aus `m.tabs[]` und `elements[role=='tab']` auf. `navigation` ist ein Orientierungsbereich, niemals ein umschaltbares Panel. Siehe die Abschnitte 1 und 10. |
| Sollte `NAC.click()` relative ids annehmen (zum Beispiel `'./save'`)? | **OFFEN, nicht umgesetzt** | v2.5 | Der Auflöser passt `data-nac-id` genau ab und grenzt nach Plugin ein: dem aktiven, oder dem aus `opts.plugin`. Diese Eingrenzung deckt den Fall, nach dem die Frage fragte, schon ab (`NAC.click('save', {plugin:'invoice'})`), also ist der Druck für eine relative Schreibweise gering, und es läuft nichts. Sie zu entscheiden hieße, Abschnitt 2 eine Pfadgrammatik hinzuzufügen -- dort, wo ids für das Runtime ausdrücklich undurchsichtig sind. |
| Sollten Manifeste Vererbung / Erweiterung über Plugins hinweg unterstützen (ein Basismanifest, das ein Mandant erweitert)? | **OFFEN, Kandidat für die nächste Major** | v2.5 | Nicht umgesetzt. **Nicht mit Abschnitt 15 zu verwechseln**, dem "Vertrag zur Plugin-Erweiterung": der ist in v2.5 erschienen und ist ein Mechanismus zum Weiterleiten an ein Backend (`registerPlugin` / `call` / `read` / `subscribe`), keine Manifestvererbung. Die Frage hier geht darum, dass ein Manifest von einem anderen abgeleitet wird, was die Eindeutigkeitsregeln für ids aus Abschnitt 2 berührt -- und deshalb für eine Major zurückgehalten wird. |
| Sollte die Erzwingung von `payload_schema` formalisiert und eingeschaltet werden? | **OFFEN, ohne Datum** | v2.5 | Von Abschnitt 5 hierher verschoben, der sie für v2.4 versprach. Sie kam nicht in v2.4 und ist bis v2.5 nicht gekommen; das Referenz-Runtime liest das Feld nicht. Siehe Abschnitt 5 dafür, was heute genau geprüft wird und was nicht. |
| Sollten die Befunde von `validate_global()` einen Code aus dem veröffentlichten Katalog tragen? | **ENTSCHIEDEN: ja, in 2.5.0 erschienen** | v2.5 | Jeder Posten jeder Gruppe trägt `code` + `severity`, sodass Versprechen 4 aus Abschnitt 12 jetzt eine echte Menge abdeckt statt einer leeren. Die fünf Codes sind unter `global_buckets` in `api/latest/findings.json` veröffentlicht, und der Generator LIEST sie aus einem Prüffall, der jede Gruppe provoziert, statt sie von Hand zu schreiben: die vorige Fassung schrieb `code: null` für eine Gruppe, die seit 2.5.0 einen Code trug, und veröffentlichte beide Behauptungen in derselben Datei. Diesen Prüffall zu bauen ist auch das, was Audit N-33 gefunden hat: der Prüfer konnte ein in der kanonischen Form geschriebenes Manifest nicht sehen. Siehe 10.1. |

<!-- u 1ba12333695c | 69 13.5 Governance | heading -->
## 13.5 Steuerung

<!-- u 091136995f4a | 69 13.5 Governance | prose -->
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

<!-- u fd9fc738b52c | 69 13.5 Governance | prose -->
Für Anwender: die einheitliche Lizenzierung unter Apache-2.0
garantiert, dass Spezifikation und Runtime jede Änderung der
Gesellschaftsform von Yujin überdauern. Du kannst beides forken,
beides betreiben und beides ausliefern, heute und nachdem wir nicht
mehr da sind. Dieses Dokument hält die Verpflichtung fest, damit der
Weg zu diesem Überdauern ausdrücklich ist und nicht bloß
unterstellt.

<!-- u 4d62e1227df1 | 70 14. Reference implementation | heading -->
## 14. Referenzimplementierung

<!-- u 52d4fad55b7e | 70 14. Reference implementation | prose -->
Die kanonische Implementierung ist das Referenz-Runtime, das als
NPM-Paket `@nac3/runtime` verteilt wird. Die normative Quelle der
Version ist die eigene Konstante `NAC.version` des Runtime,
veröffentlicht als Daten unter `api/latest.json` (siehe Abschnitt
9.1). Dieser Abschnitt nennt absichtlich keine Versionsnummer erneut:
er trug `2.5.0-alpha.5`, als das Paket schon weitergezogen war, und das
ist dieselbe Art von Mangel wie die veralteten Beispiele, die aus den
Abschnitten 5 und 9 entfernt wurden. Er liefert:

<!-- u 65f8174ff33b | 70 14. Reference implementation | prose -->
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

<!-- u 3267a25cd9bb | 70 14. Reference implementation | prose -->
Das Paket stellt außerdem eine CLI unter den Binary-Namen `nac3` und
`nac` bereit (`dist/cli.js`, Abschnitt 10.2).

<!-- u ada8333c036b | 70 14. Reference implementation | prose -->
Andere Implementierungen sind willkommen (Python für native
Automatisierungsausführer, Rust für eingebettete Agenten usw). Die
Autorität ist die Spezifikation, nicht der JS-Code.

<!-- u 4dc85a8e4ab3 | 71 15. Plugin extension contract -- canvas + API surfaces  | heading -->
## 15. Vertrag zur Plugin-Erweiterung -- Canvas- + API-Oberflächen (v2.5)

<!-- u 7d116da9b14a | 71 15. Plugin extension contract -- canvas + API surfaces  | prose -->
Die Abschnitte 1-14 setzen voraus, dass die für den Agenten relevante
Oberfläche das **DOM** ist. Jedes adressierbare Element hat ein
Attribut `data-nac-id`, jedes Verb löst über `el.click()` aus, jedes
Lesen von Zustand kommt aus `el.getAttribute(...)`. Das funktioniert
für Anwendungen, deren Rahmen UND Inhalt in DOM-Knoten leben.

<!-- u 0551bce3d392 | 71 15. Plugin extension contract -- canvas + API surfaces  | prose -->
Es funktioniert nicht für Anwendungen, bei denen ein Teil der
Oberfläche ein **Canvas** ist (LibreOffice / Collabora Online, Figma,
Excalidraw, Miro, jeder selbstgebaute WebGL-Editor). Der Rahmen kann
DOM bleiben (Werkzeugleisten, Dialoge), aber die Befehle müssen oft
über die eigene öffentliche API der Anwendung laufen (postMessage,
Plugin-SDK, Skriptbrücke), und der Zustand ist aus dem DOM
möglicherweise überhaupt nicht lesbar.

<!-- u 72264fb0f469 | 71 15. Plugin extension contract -- canvas + API surfaces  | prose -->
v2.5 fügt einen kleinen Satz Primitive hinzu, mit denen ein
NAC3-Plugin seinen eigenen Weiterleitungsvertrag zu solchen Oberflächen
angeben kann. Das Runtime bleibt gegenüber jeder bestimmten Anwendung
agnostisch -- es lernt nur dadurch, mit einer zu sprechen, dass es das
Manifest des Plugins liest.

<!-- u 6d9a90384f28 | 72 15.1 Why a new primitive set | heading -->
### 15.1 Warum ein neuer Satz Primitive

<!-- u a7e9cf90c978 | 72 15.1 Why a new primitive set | prose -->
Das `NAC.click(id)`, das nur das DOM kennt, kann nicht:

<!-- u 38b34f7795c3 | 72 15.1 Why a new primitive set | prose -->
- Ein postMessage `Send_UNO_Command` an ein abgeschottetes
  Collabora-iframe senden.
- `figma.currentPage.selection = [...]` innerhalb der Plugin-Sandbox
  von Figma aufrufen.
- `excalidrawAPI.setElements(...)` auf einer React-ref aufrufen.
- Lesen, ob Fett auf der aktuellen Auswahl in Collabora aktiv ist (die
  Werkzeugleiste spiegelt es; das Canvas verbirgt es).

<!-- u 7495e48dfe8c | 72 15.1 Why a new primitive set | prose -->
Die Lösung ist **nicht**, `NAC.click` um Heuristiken zur Erkennung des
Backends zu erweitern. Die Lösung ist, ein ausdrückliches, agnostisches
Verb hinzuzufügen, das einen Plugin-Slug und einen Verbpfad nimmt und
das Manifest des Plugins angeben lässt, wie dieses Verb weitergeleitet
wird.

<!-- u 641333576b18 | 73 15.2 The three primitives | heading -->
### 15.2 Die drei Primitive

<!-- u 2eeaa810cab5 | 73 15.2 The three primitives | prose -->
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

<!-- u da60503266ab | 73 15.2 The three primitives | prose -->
Alle vier Funktionen sind asynchron (sie geben ein Promise zurück),
außer `unsubscribe`, die synchron und idempotent ist.

<!-- u 3a61a03890f1 | 74 15.3 Plugin manifest shape | heading -->
### 15.3 Form des Plugin-Manifests

<!-- u 5420f520d0d4 | 74 15.3 Plugin manifest shape | prose -->
Manifeste sind reines JSON (keine JS-Callbacks). Forge, Sumi und jedes
künftige Werkzeug erzeugen sie als Daten; das Runtime deutet die
Backend-Namen aus einem festen Wortschatz.

<!-- u c81d6471a0ab | 74 15.3 Plugin manifest shape | prose -->
Verben und Ereignisse haben **genau eine** Bindung. Zustand hat ein
**geordnetes Array** von Bindungen: das Runtime durchläuft die Kette in
der Reihenfolge und gibt die erste Quelle zurück, die erfolgreich
aufgelöst hat.

<!-- u 673180462720 | 75 15.4 Backend vocabulary | heading -->
### 15.4 Backend-Wortschatz

<!-- u 1e544939bf9c | 75 15.4 Backend vocabulary | prose -->
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

<!-- u b3fb5326727c | 75 15.4 Backend vocabulary | prose -->
Jedes Backend MUSS vom Runtime als eigenständiger Verteiler umgesetzt
werden (`dispatch(binding, args, context) -> Promise<value>`). Eine
neue Backend-Art in die Spezifikation aufzunehmen erfordert einen
Sprung der Spezifikationsversion; Runtimes, die unbekannte Backends
übergehen, MÜSSEN Manifeste ablehnen, die sie angeben (kein stilles
Überspringen).

<!-- u 269f89fd3507 | 76 15.5 Extractor mini-DSL | heading -->
### 15.5 Mini-DSL zum Auslesen

<!-- u d4919abaffe4 | 76 15.5 Extractor mini-DSL | prose -->
Die Zustands-Backends und das Ereignis-Backend `postmessage-listen`
müssen oft ein Feld aus einem größeren Objekt herausgreifen. Das
Runtime bringt eine winzige deklarative DSL mit, damit Manifeste
reines JSON bleiben:

<!-- u edfb3ecdcba7 | 76 15.5 Extractor mini-DSL | prose -->
| Schreibweise | Bedeutung | Beispiel Eingabe -> Ausgabe |
|--------|---------|-------------------------|
| `field.path.to.value` | Durchlauf eines gepunkteten Pfads. | `{a:{b:1}}` mit `a.b` -> `1` |
| `attribute:NAME` | Nur DOM: `el.getAttribute(NAME)` lesen. | `<i data-x="hi">` mit `attribute:data-x` -> `'hi'` |
| `text` | Nur DOM: `el.textContent` lesen. | `<span>hi</span>` mit `text` -> `'hi'` |
| `classList.contains:CLASS` | Nur DOM: `el.classList.contains(CLASS)` -> boolesch. | `<button class="active">` mit `classList.contains:active` -> `true` |
| `value` | Nur DOM: `el.value` lesen. | `<input value="x">` mit `value` -> `'x'` |
| `present` | Nur DOM: gibt `true` zurück, wenn der Selektor ein Element aufgelöst hat, sonst `false`. | Selektor hat gepasst -> `true` |

<!-- u c21d2cceb93f | 76 15.5 Extractor mini-DSL | prose -->
In v2.5 wird Verkettung nicht unterstützt; ein Ausleser ist genau eine
der Zeilen oben. Ein Manifest, das eine komplexe Umformung braucht,
gibt stattdessen ein `script-bridge` an.

<!-- u 8eaa22faba63 | 77 15.6 Fallback chain semantics for `state` | heading -->
### 15.6 Semantik der Rückfallkette für `state`

<!-- u c1e30df97123 | 77 15.6 Fallback chain semantics for `state` | prose -->
`state[path]` ist ein Array von Bindungen. `NAC.read(plugin, path)`
durchläuft das Array in der Reihenfolge. Für jede Bindung:

<!-- u 9b9d10966d70 | 77 15.6 Fallback chain semantics for `state` | prose -->
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

<!-- u 68f0476ca245 | 77 15.6 Fallback chain semantics for `state` | prose -->
Begründung: die Kette verschlüsselt die Vorzugsreihenfolge derjenigen,
die das Manifest geschrieben hat. Die schnellste, günstigste und
frischeste Quelle steht zuerst; die Rückfälle werden mit Anstand
schlechter. Das Runtime wählt niemals still zuerst eine schlechtere
Quelle.

<!-- u ffedb5b06a01 | 78 15.7 Provenance for synthetic actions | heading -->
### 15.7 Herkunft synthetischer Aktionen

<!-- u bc6190f2e478 | 78 15.7 Provenance for synthetic actions | prose -->
Jeder Versand von `NAC.call` gibt nach der Rückkehr des Backends ein
Ereignis `nac:plugin:invoked` an `document` aus. Die Nutzlast des
Details:

<!-- u b527bd4cadd8 | 78 15.7 Provenance for synthetic actions | prose -->
Dieselbe Form gilt für `nac:plugin:read` (nach einem `read`) und
`nac:plugin:event` (die erneute Ausgabe eines synthetisierten
Ereignisses). `source` ist standardmäßig `'agent'`; Hosts, die das
Runtime in eine Benutzeroberfläche einhüllen, DÜRFEN es über den schon
vorhandenen Mechanismus `NAC.set_source(...)` überschreiben
(Abschnitt 7).

<!-- u 07f550e23dcf | 79 15.8 Worked example -- Collabora Writer | heading -->
### 15.8 Durchgerechnetes Beispiel -- Collabora Writer

<!-- u cae1093b9441 | 79 15.8 Worked example -- Collabora Writer | prose -->
Der Agent ruft `NAC.call('collabora.writer', 'uno.Bold')` auf; das
Runtime leitet über das Backend `postmessage` weiter und schickt
`Send_UNO_Command` an das iframe. Um zu bestätigen, dass die Wirkung
eingetreten ist (siehe Abschnitt 17), ruft der Agent
`await NAC.read('collabora.writer', 'selection.isBold')` auf; das
Runtime versucht zuerst den Spiegel der Werkzeugleiste (schnell,
kostenlos) und fällt auf die Python-Skriptbrücke zurück, wenn der
Spiegel nicht verfügbar ist. Der Agent weiß nie und interessiert sich
nie dafür, welche Quelle geantwortet hat.

<!-- u 35fc88c5f8c4 | 80 15.9 Errors | heading -->
### 15.9 Fehler

<!-- u 5eda63397d51 | 80 15.9 Errors | prose -->
`NAC.call` / `read` / `subscribe` lehnen mit einem `NacError` ab,
dessen `code` einer der folgenden ist:

<!-- u f6eceddeaf5f | 80 15.9 Errors | prose -->
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

<!-- u f92a4c02f492 | 81 16. Tree navigation (v2.5 -- SHIPPED in 2.5.0-alpha.5 / | heading -->
## 16. Baumnavigation (v2.5 -- ERSCHIENEN in 2.5.0-alpha.5 / RFC V25-02)

<!-- u 7a50acadcc20 | 81 16. Tree navigation (v2.5 -- SHIPPED in 2.5.0-alpha.5 / | prose -->
Primitive zur hierarchischen Navigation der Befehle, für
Hilfsabläufe und Sprachausführer, die beschreiben müssen, was sie vom
aktuellen Fokus aus tun können.

<!-- u 726350183f41 | 81 16. Tree navigation (v2.5 -- SHIPPED in 2.5.0-alpha.5 / | prose -->
**API-Oberfläche:**

<!-- u c57b2345c081 | 81 16. Tree navigation (v2.5 -- SHIPPED in 2.5.0-alpha.5 / | prose -->
- `NAC.context(plugin) -> { breadcrumb: [{nac_id, label}, ...] }`
  Steigt von `document.activeElement` über die Vorfahrenelemente auf,
  die `data-nac-id` tragen, und hält an der Wurzel des Plugins. Gibt
  einen leeren Pfad zurück, wenn innerhalb des Plugins nichts den Fokus
  hat. Das `label` jeder Stufe kommt von `narrate` (Abschnitt 17).

<!-- u 9345bb2ecfe1 | 81 16. Tree navigation (v2.5 -- SHIPPED in 2.5.0-alpha.5 / | prose -->
- `NAC.tree(plugin, rootId?) -> [{nac_id, label, opens?, leaf?}, ...]`
  Zählt die UNMITTELBAREN adressierbaren Kinder von `rootId` auf (oder
  der Plugin-Wurzel, wenn es fehlt). "Unmittelbar" heißt, dass kein
  weiteres Element mit `data-nac-id` zwischen dem Ausgangspunkt und dem
  Kind liegt. Für jeden Eintrag:
  - `label` über `narrate` aufgelöst
  - `opens` spiegelt das Attribut `data-nac-opens`, wenn es vorhanden
    ist
  - `leaf` ist `true`, wenn `data-nac-leaf` vorhanden ist

<!-- u b19ace6221f6 | 81 16. Tree navigation (v2.5 -- SHIPPED in 2.5.0-alpha.5 / | prose -->
**Attribute für Autoren:**

<!-- u 8c4475faabe9 | 81 16. Tree navigation (v2.5 -- SHIPPED in 2.5.0-alpha.5 / | prose -->
- `data-nac-opens="<target-nac-id>"`: gibt an, dass dieser Knoten zu
  dem Element öffnet / hinabführt, das die Ziel-id bezeichnet. Damit
  können Agenten der Navigationskette folgen, ohne Namen zu erraten.
- `data-nac-leaf`: ausdrückliche Endmarkierung; nachgelagerte Agenten
  wissen, dass kein weiteres Hinabgehen möglich ist.

<!-- u 6a2e330ae9a8 | 81 16. Tree navigation (v2.5 -- SHIPPED in 2.5.0-alpha.5 / | prose -->
**Fehler:** `tree` gibt für eine unbekannte rootId `[]` zurück (still
leer, kein Fehler). `context` gibt für unbekannte Plugins immer
`{ breadcrumb: [] }` zurück.

<!-- u 7a9670811789 | 82 17. Assistive labels (v2.5 -- SHIPPED in 2.5.0-alpha.5  | heading -->
## 17. Hilfs-Labels (v2.5 -- ERSCHIENEN in 2.5.0-alpha.5 / RFC V25-03)

<!-- u e6e2f1eecf4e | 82 17. Assistive labels (v2.5 -- SHIPPED in 2.5.0-alpha.5  | prose -->
Kanonische Auflösung von für Menschen lesbaren Labels. Eine Funktion
für Screenreader, Sprachausgabe, Sprachabläufe, Prüfprotokolle und
mobile Hilfsoberflächen.

<!-- u 2ee6d3c1ba46 | 82 17. Assistive labels (v2.5 -- SHIPPED in 2.5.0-alpha.5  | prose -->
- `NAC.narrate(plugin, nac_id) -> string | null`
  Gibt `null` zurück, wenn das Plugin oder die nac_id nicht gefunden
  werden. Sonst das Label nach dieser strengen Vorrangfolge:

<!-- u d1332c239eaf | 82 17. Assistive labels (v2.5 -- SHIPPED in 2.5.0-alpha.5  | prose -->
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

<!-- u ca12e3704975 | 82 17. Assistive labels (v2.5 -- SHIPPED in 2.5.0-alpha.5  | prose -->
  Werte, die auf irgendeiner Stufe nur aus Leerzeichen bestehen, fallen
  auf die nächste Stufe.

<!-- u 05527df57e48 | 82 17. Assistive labels (v2.5 -- SHIPPED in 2.5.0-alpha.5  | prose -->
**Prüfung:** `validate_global()` darf in der Gruppe
`plugin_instance_violations` Warnungen für nac_ids in Ordnungsform
(`btn-1`, `btn-2`, ...) ausgeben, denen irgendeines der Labels der
höheren Stufen fehlt.

<!-- u 8352032c85cd | 83 18. Effect detection (v2.5 -- SHIPPED in 2.5.0-alpha.5  | heading -->
## 18. Wirkungserkennung (v2.5 -- ERSCHIENEN in 2.5.0-alpha.5 / RFC V25-04)

<!-- u 229a636ff25c | 83 18. Effect detection (v2.5 -- SHIPPED in 2.5.0-alpha.5  | prose -->
Schließt die Lücke des "stillen Schadens": ein Agent bestätigt die
WIRKUNG einer Aktion, nicht bloß, dass der Befehl ausgegeben wurde.
Beide Primitive setzen auf `NAC.read()` auf, also funktioniert jedes
Backend aus V25-01 (postmessage, sdk-call, dom-mirror, ...).

<!-- u fbede61e05ec | 83 18. Effect detection (v2.5 -- SHIPPED in 2.5.0-alpha.5  | prose -->
- `NAC.expect(plugin, statePath, value, opts?) -> Promise<value>`
  Fragt `NAC.read(plugin, statePath)` wiederholt ab, bis der
  Vergleicher etwas Wahres zurückgibt oder die Frist abläuft. Löst mit
  dem aufgelösten Wert auf; lehnt bei Ablauf mit
  `NacError('timeout', ...)` ab.

<!-- u 2f8b051e6a19 | 83 18. Effect detection (v2.5 -- SHIPPED in 2.5.0-alpha.5  | prose -->
  Lesefehler während der Abfrage werden bis zur Frist erneut versucht
  (als "noch nicht beobachtbar" behandelt, nicht als harter Fehler).

<!-- u 31222acebd2a | 83 18. Effect detection (v2.5 -- SHIPPED in 2.5.0-alpha.5  | prose -->
  Optionen:
  - `timeout_ms` (Vorgabe `5000`)
  - `poll_ms` (Vorgabe `100`)
  - `comparator` (Vorgabe `(cur, want) => cur === want`)
    Bekommt `(current, expected)` und gibt einen booleschen Wert
    zurück.

<!-- u bfe42d1abbb0 | 83 18. Effect detection (v2.5 -- SHIPPED in 2.5.0-alpha.5  | prose -->
- `NAC.diff(plugin, statePath, actionFn) -> Promise<{before, after, changed}>`
  Liest den Zustand, wartet auf `actionFn()`, liest den Zustand
  erneut. Gibt beide Momentaufnahmen zurück und einen booleschen Wert
  `changed`, der über einen JSON-stringify-Vergleich berechnet wird (so
  wird auch `undefined` gegenüber einem Wert als geändert gemeldet).
  Lesefehler fallen auf `undefined` zusammen.

<!-- u 261f5079717f | 83 18. Effect detection (v2.5 -- SHIPPED in 2.5.0-alpha.5  | prose -->
**Hinweise zum Zusammensetzen:** `diff` erfasst nur die Momentaufnahme
am ANFANG und am ENDE; es beobachtet die Zwischenzustände innerhalb der
Aktion NICHT. Nimm `expect`, wenn dir wichtig ist, dass "der Zustand
irgendwann einen bestimmten Wert durchläuft".

<!-- u 3c1090ef8c62 | 83 18. Effect detection (v2.5 -- SHIPPED in 2.5.0-alpha.5  | prose -->
*Dieses Dokument ist die kanonische Spezifikation von NAC3 v2.5. Die
Abschnitte 0-14 sind gegenüber v2.4 stabil unverändert. Die Abschnitte
15-18 erscheinen in v2.5. Änderungen an dieser Datei sind Änderungen
der Spezifikation und erfordern einen RFC; siehe `CONTRIBUTING.md`.*
