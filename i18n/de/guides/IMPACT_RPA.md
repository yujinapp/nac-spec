---
translation_source: guides/IMPACT_RPA.md
translation_source_hash: d278c291a38100f66ef8ed5ae0030875b5e9eb4412db6edecf9b7db2794a16e2
translation_quality: machine_v1
translation_lang: de
translation_date: 2026-05-11T14:33:30.851032+00:00
---

# Auswirkungen von NAC3 auf RPA

**NAC3-Version:** 2.2 stable.
**Zielgruppe:** RPA-Architekten, Leiter von Automation Centers of Excellence
(CoE), Automatisierungsingenieure, die die Wartungs- und
Erweiterungskosten NAC3-gesteuerter Automatisierung bewerten.

## Kurzfassung

CSS-Selektor-basiertes RPA ist konstruktionsbedingt fragil. Bildbasierte
Erkennung ist anzeigebedingt fragil. NAC3 platziert stabile benannte Anker
auf der Seite, die JEDE RPA-Plattform ansprechen kann. Die Kosten pro
Automatisierung sinken um 60–90 %, und die vierteljährliche Selektor-Wartungsschuld
geht gegen null.

## Der aktuelle Stand von RPA-Selektoren

Drei Ansätze – alle fehlerbehaftet:

### 1. CSS-Selektoren / XPath

```xml
<webctrl tag='button'
         class='btn-primary btn-lg invoice-save-btn'
         text='Save' />
```

Bricht bei: CSS-Klassen-Umbenennung, Layout-Umstrukturierung, Label-
Übersetzung, Hinzufügen von Hover-State-Klassen.

### 2. Bild- / OCR-Abgleich

Ein Pixelvergleich des gerenderten Buttons. Bricht bei: Theme-Wechsel,
Dark Mode, Auflösungsänderung, Schriftart-Tausch, Überlappung durch den Fokusring.

### 3. Anker-basiertes Targeting (relative Koordinaten)

„Der Button zwei Zellen rechts vom Label ‚Subtotal'." Bricht bei:
Layout-Reflow, Spalten-Umsortierung, Verschiebungen durch responsive Breakpoints.

Alle drei erfordern ständige CoE-Wartung. Ein typisches
Unternehmens-CoE verbringt 35–60 % seiner Zeit damit, nach UI-Redesigns
defekte Selektoren zu aktualisieren.

## Der Stand mit NAC3

Eine einzige Zeile pro Element:

```js
await window.NAC.click('invoice.save');
```

Bricht bei: dem Verb `save`, das vom Produktteam in etwas anderes umbenannt
wird. Das ist eine echte semantische Änderung, und die Automatisierung MUSS
aus demselben Grund aktualisiert werden, aus dem auch Menschen neu geschult
werden müssten.

## Konkrete Auswirkungsmetriken

Aus einem CoE, das NAC3 in 14 Automatisierungen pilotiert hat:

| Metrik | Selektor-basiert | NAC3-basiert | Delta |
|--------|-----------------|-------------|-------|
| Durchschn. Aktivitäten pro Automatisierung | 47 | 9 | -81 % |
| Wartungsstunden pro UI-Redesign-Quartal | 41 | 3 | -93 % |
| Fehlgeschlagene Ausführungen pro Woche (Selektor-Drift) | 18 | 0 | -100 % |
| Zeit zum Erstellen einer neuen Automatisierung | 12 Stunden | 2 Stunden | -83 % |
| Abdeckung der App-Oberfläche (% der erreichbaren App-Aktionen) | 38 % | 95 % | +150 % |

Der Abdeckungswert ist der wichtigste. **Selektor-basiertes RPA deckt
typischerweise 30–50 % der App-Aktionen ab**, weil die verbleibenden
50–70 % zu fragil sind, um sie kosteneffizient zu automatisieren.
NAC3 hebt das auf >90 % – der Long Tail wird wirtschaftlich erschließbar.

## Was NAC3 für RPA ermöglicht

### 1. Mandantenübergreifende Portabilität

Heute: Ein RPA-Bot, der für die Salesforce-Instanz von Kunde A gebaut wurde,
läuft nicht bei Kunde B, weil die CSS-Klassen leicht abweichen. Mit NAC3:
Der Bot spricht `invoice.save` an, das mandantenübergreifend stabil ist.
Derselbe Bot, mehrere Mandanten.

### 2. Anbieterübergreifende Portabilität

Wenn zwei SaaS-Produkte im selben Bereich (CRM, ERP, Projektmanagement)
beide NAC3-Manifeste mit überlappenden Verben liefern
(`create_invoice`, `mark_paid`), dispatcht dieselbe Bot-Logik gegen beide.
Der RPA-Bot wird anbieterunabhängig.

### 3. LLM-erstellte Automatisierung

Ein CoE-Ingenieur beschreibt die Automatisierung in Prosa:

> „Yujin CRM öffnen, alle unbezahlten Rechnungen > 60 Tage alt finden,
> sie als Inkasso markieren, E-Mail an den zuständigen Berater senden."

Ein LLM mit Zugriff auf `NAC.describe()` erzeugt die Aktivitätssequenz:

```
1. NAC.click_by_verb('invoice', 'list_unpaid')
2. NAC.fill('invoice.filter.age_days_min', 60)
3. NAC.click('invoice.filter.apply')
4. For each row in NAC.dt_state('invoice.list'):
     - NAC.click_by_verb('invoice', 'mark_collections', {row_id})
     - NAC.click_by_verb('email', 'send_advisor', {row_id})
```

Der CoE-Ingenieur prüft und genehmigt. Stunden, nicht Wochen.

### 4. Selbstentdeckung für neue Apps

`NAC.describe()` gibt das vollständige Manifest zurück. Der Bot kann
JEDE NAC-3-konforme App zur Laufzeit introspektieren. **Eine Automatisierung,
die „jede NAC-3-konforme App, die der Benutzer geöffnet hat" anspricht,
wird möglich** (siehe Yujin Pilot unter yujin.app/pilot für die
produktisierte Version).

### 5. Audit-Trail mit Herkunftsnachweis

Jeder Dispatch gibt `nac:action:succeeded` mit
`is_trusted: false` (signalisiert RPA-Ursprung) + `plugin` +
`action_id` aus. Die Host-App kann dies für Compliance-Zwecke protokollieren:

> Bot xyz hat `invoice.delete` für Rechnung #INV-42
> um 14:23 GMT-3 dispatcht, mit `is_trusted=false`. Genehmigt durch:
> rpa-coe-policy v1.4.

GRC-Teams erhalten ein deterministisches Audit-Log pro Bot-Ausführung.
Kein DOM-Scraping in den Logs, kein PII-Leck durch Selektor-Strings.

### 6. Absicherung sensibler Verben

Apps, die bestimmte Verben (delete, payment, role grant) als
`isTrusted`-erforderlich markieren, lehnen RPA-Dispatches standardmäßig ab.
Das CoE whitelistet explizit, welche Verben RPA verwenden darf:

```js
window.__NAC_ALLOW_UNTRUSTED__ = [
  'invoice.send',
  'invoice.save',
  'report.export'
  // delete, payment, admin-Verben absichtlich NICHT hier
];
```

CoE-Governance wird zu einer JS-Konfiguration + einem Audit-Log,
nicht zu einer Tabellenkalkulation mit Bot-Berechtigungen.

### 7. Sprache + Chat als RPA-Frontend

Die RPA-Schicht kann das Chat-Panel als UI nutzen: Ein CoE-Ingenieur
sagt „Führe den Job für unbezahlte Rechnungen für Mandant Acme aus" und ein
NAC-3-fähiges Backend löst auf und dispatcht. Der Sprachpfad verwendet
dieselben NAC.*-Primitiven wie der Chat.

## Adoptionsmatrix nach RPA-Plattform

| Plattform | Ansatz | Integrationsaufwand | Referenz |
|-----------|--------|---------------------|---------|
| UiPath | JS über Browser-Aktivität injizieren | Gering (eine Aktivität pro Aufruf) | [RPA_UIPATH.md](RPA_UIPATH.md) |
| Automation Anywhere A360 | Run JavaScript Function | Gering | [RPA_AUTOMATION_ANYWHERE.md](RPA_AUTOMATION_ANYWHERE.md) |
| Blue Prism | Inject JavaScript (VBO action) | Gering | [RPA_BLUE_PRISM.md](RPA_BLUE_PRISM.md) |
| Power Automate Desktop | Run JavaScript on web page | Gering | (folgt) |
| Selenium-basiertes RPA | execute_script | Gering | -- |
| Bildbasiert (TagUI, Sikuli) | Fallback-Pfad; nur als letztes Mittel verwenden | Hoch | -- |

## Migrationsplan für eine bestehende Automatisierungssuite

### Phase 1 – Bestandsaufnahme (1 Woche)

1. Alle Selektoren in allen Automatisierungen inventarisieren.
2. Jeden klassifizieren als „stabil-wartungsarm" /
   „fragil-wartungsintensiv".
3. Die fragilen werden zuerst zu NAC3-Kandidaten.

### Phase 2 – Vorbereitung der Ziel-App

Die Web-App, gegen die die Automatisierung läuft, muss NAC3 übernehmen. Entweder:

- Das App-Team übernimmt NAC3 über den Migrationsplan
  ([AI_PLAYBOOK_MIGRATION.md](AI_PLAYBOOK_MIGRATION.md)).
- ODER: Das RPA-CoE injiziert NAC3 clientseitig über ein Userscript /
  eine Browser-Erweiterung, falls das App-Team nicht migrieren kann. Das
  funktioniert, ist aber fragil; First-Party-Adoption ist vorzuziehen.

### Phase 3 – Automatisierungs-Rewrite (1–2 Wochen pro Automatisierung)

Jeden Selektor durch den entsprechenden `NAC.*`-Aufruf ersetzen.
Die selektor-basierte Version bleibt in einem Backup-Branch. Die neue Version
wird mit explizitem NAC3-Audit-Log ausgeliefert.

### Phase 4 – Governance

Das CoE aktualisiert seine Bot-Review-Checkliste:
- Bot spricht nur NAC-IDs an, die in aktuellen Manifesten vorhanden sind.
- Bot hat eine explizite Verb-Whitelist für sensible Operationen.
- Bot protokolliert jeden Dispatch in der Audit-Tabelle.

## Adoptionskosten

Für ein CoE, das 50 Automatisierungen gegen 10 Ziel-Apps betreibt:

- App-seitige Migration: 6–8 Wochen (ein Ingenieur pro App).
- Bot-seitiger Rewrite: 1–2 Wochen pro Bot = 50–100 Ingenieur-Wochen.

Klingt teuer, bis man es mit den laufenden Kosten vergleicht, 50
selektor-basierte Bots auf unbestimmte Zeit zu warten. Der Break-even
tritt typischerweise nach 6–9 Monaten ein; alles danach ist reines
Einsparpotenzial an CoE-Ingenieurzeit.

## Risiken + Gegenmaßnahmen

### Risiko – „Die Ziel-App verweigert die Übernahme von NAC3"

Häufig bei Legacy-Unternehmenssoftware. Gegenmaßnahmen:

- `nac.js` clientseitig über eine CoE-verwaltete Browser-Erweiterung
  oder ein Tampermonkey-ähnliches Userscript injizieren.
- Manifeste CoE-seitig definieren; die App bleibt unverändert.
- Weniger robust als First-Party-Adoption, aber übergangsweise praktikabel.

### Risiko – „RPA umgeht die isTrusted-Absicherung"

Das ist der Sicherheits-Kompromiss. RPA WIRD Klicks synthetisieren. Die
Host-App muss whitelisten, welche Verben RPA auslösen darf. CoE und
App-Team verhandeln pro Verb. Die Verhandlung dokumentieren;
die Whitelist regelmäßig prüfen.

### Risiko – „Wir verlieren die Sichtbarkeit auf die RPA-Aktionssequenz"

Umgekehrt: Mit NAC3 GEWINNEN Sie Sichtbarkeit. Jeder Bot-Dispatch feuert
ein kanonisches `nac:action:succeeded`-Event mit strukturiertem
`{plugin, action_id, args, is_trusted}`. Das in Ihr SIEM +
Aufbewahrungsrichtlinie protokollieren.

## Branchenparallele

Was ARIA für assistive Technologie getan hat (Screen Readern einen stabilen
Vertrag auf der Seite geben), tut NAC3 für RPA + agentische Automatisierung.
Das CoE wechselt vom „Selektor-Hausmeister" zum „Automatisierungsdesigner".

## Siehe auch

- [RPA_UIPATH.md](RPA_UIPATH.md), [RPA_AUTOMATION_ANYWHERE.md](RPA_AUTOMATION_ANYWHERE.md),
  [RPA_BLUE_PRISM.md](RPA_BLUE_PRISM.md) – plattformspezifische
  Integrationsleitfäden.
- [IMPACT_TESTING.md](IMPACT_TESTING.md) – verwandte Auswirkungsanalyse
  für die Test-/QA-Dimension.
- [SECURITY.md](../SECURITY.md) – isTrusted-Bedrohungsmodell, auf das
  die RPA-Whitelist aufbaut.

## Lizenz

Apache-2.0.

---

*This is a machine translation of the canonical English
version at `/nac-spec/guides/IMPACT_RPA.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
