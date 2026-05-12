---
translation_source: guides/IMPACT_TESTING.md
translation_source_hash: d69b8343b9c3e6a8ba3e22f198a9a6646d800f3f32a2f0446a506cb44f9e664b
translation_quality: machine_v1
translation_lang: de
translation_date: 2026-05-11T14:32:33.112500+00:00
---

# Auswirkungen von NAC3 auf Testing + QA

**NAC3-Version:** 2.2 stable.
**Zielgruppe:** Testingenieure, QA-Leads, SDETs und CTOs, die die langfristigen Wartungskosten einer NAC3-Einführung bewerten.

## Kurzfassung

Testcode, der NAC3-IDs verwendet, übersteht UI-Redesigns. Testcode mit CSS-Selektoren nicht. Diese eine Eigenschaft verändert die Wirtschaftlichkeit der Testwartung grundlegend: von „linear mit UI-Änderungen" zu „linear mit Feature-Änderungen" – typischerweise 5–10× weniger Aufwand.

## Die Wartungsrechnung heute

Eine typische Selenium-/Cypress-/Playwright-Suite für eine nicht-triviale Web-App enthält Hunderte von Selektoren:

```ts
await page.locator('button.btn-primary.btn-large:has-text("Save")').click();
await page.locator('div.modal > div.body > input[type="text"]:first-of-type').fill('Acme');
await page.locator('table.invoice-grid > tbody > tr:nth-child(1) > td:last-child > button').click();
```

Diese Selektoren brechen, wenn:

- Das Design-Team `.btn-primary` in `.btn-cta` umbenennt.
- Ein umschließendes Div für Barrierefreiheit hinzugefügt wird.
- Die Schaltflächenbeschriftung internationalisiert wird und „Save" in es-Tenant-Tests zu „Guardar" wird.
- Das Grid-Layout auf `grid-template-rows` umgestellt wird.
- Irgendetwas an der Seite geändert wird, das NICHT die semantische Absicht betrifft.

Branchenumfragen (2024–2025) schätzen, dass **30–50 % der Arbeitszeit von QA-Ingenieuren auf Selektorwartung entfallen**. Dieser Anteil steigt mit wachsender App.

## Die Wartungsrechnung mit NAC3

```ts
await NAC.click('invoice.save');
await NAC.fill('invoice.client_name', 'Acme');
await NAC.click('invoice.line.42.delete');
```

Diese Aufrufe überstehen:

- CSS-Klassenumbenennungen (Selektoren referenzieren kein CSS).
- DOM-Umstrukturierungen (Selektoren referenzieren keine Struktur).
- I18n-Beschriftungsänderungen (Selektoren referenzieren keinen Text).
- Migrationen von Grid- zu Flex-Layout.
- Wechsel der Komponentenbibliothek.

Sie brechen NUR, wenn:

- Das Produktteam ein Verb umbenennt (`save` → `commit`).
- Eine Schaltfläche vollständig entfernt wird.

Das sind **Feature-Level-Änderungen**, keine UI-Level-Änderungen. Der Test muss aus demselben Grund aktualisiert werden, aus dem auch Produktionscode aktualisiert werden muss. Das ist die richtige Kostenbasis.

## Konkrete Auswirkungsmetriken

Aus den internen Daten von Yujin CRM (2025):

| Metrik | Vor NAC | Nach NAC | Delta |
|--------|---------|----------|-------|
| Durchschnittliche Playwright-Spec-Zeilen | 187 | 64 | -66 % |
| Wartungsaufwand pro Spec nach einem Redesign-Sprint | 4,2 Stunden | 0,3 Stunden | -93 % |
| Selektorbezogene Testfehler pro Woche | 38 | 2 | -95 % |
| Einarbeitungszeit für neue QA-Ingenieure | 3 Wochen | 1 Woche | -67 % |
| Tests, die 6 Monate nach dem Schreiben ohne Änderungen bestehen | 31 % | 89 % | +180 % |

Die 89 % sind der entscheidende Wert. **Die große Mehrheit der NAC3-Tests bleibt durch normale Produktentwicklung hindurch funktionsfähig**, während die selectorbasierten Äquivalente veralten.

## Was NAC3 für die Testautomatisierung ermöglicht

### 1. Stabiles Test-Corpus

Ein 2024 geschriebener Test gegen `NAC.click('invoice.save')` läuft noch 2026, sofern das Verb `save` auf der Produkt-Roadmap erhalten bleibt. Der DOM rund um die Schaltfläche kann in der Zwischenzeit dreimal neu aufgebaut worden sein.

### 2. Cross-Browser ohne Selektormodus-Wechsel

CSS-Selektoren verhalten sich bei Grenzfällen (Pseudo-Elemente, Fokusringe, Shadow DOM) in Chromium, Firefox und WebKit unterschiedlich. NAC3 dispatcht über den Resolver der Runtime – derselbe Code-Pfad, unabhängig vom Browser.

### 3. I18n-agnostische Tests

Bei einer mehrsprachigen App muss die heutige Test-Suite pro Locale ausgeführt werden, weil „Save" / „Guardar" / „Speichern" alle dieselbe Schaltfläche sind. Mit NAC3 ruft der Test die ID auf; die Runtime löst sie über alle Locales auf. **Man schreibt 1 Test, er läuft in 10 Locales** (eine pro ).

### 4. LLM-gestützte Testerstellung

Ein LLM, das `NAC.describe()` sieht, kann aus einer Prosa-Beschreibung eine vollständige Test-Spec erzeugen: „Teste, dass das Hinzufügen einer Zeile und anschließendes Löschen die Tabelle in den Ausgangszustand zurückversetzt." Das LLM gibt `NAC.*`-Aufrufe aus; man prüft und committet. Das Yujin CRM enthält ~250 Specs, die auf diese Weise erstellt und vor dem Merge geprüft wurden.

### 5. Selbstheilende Tests per Discovery

Wenn ein Test fehlschlägt, weil eine ID umbenannt wurde:

```ts
try {
  await NAC.click('invoice.save');
} catch (e) {
  if (e.code === 'not_found') {
    // Re-discover; the verb 'save' may live under a new id.
    const r = await NAC.click_by_verb('invoice', 'save');
    if (r.ok) console.warn('id has changed; update test');
  }
}
```

`click_by_verb` der Runtime bietet einen selbstheilenden Fallback, der signalisiert: „Dieser Test muss aktualisiert werden, aber die Aktion funktioniert noch" – ein deutlich besserer Fehlermodus als „Selektor nicht gefunden, Ende".

### 6. Testgenerierung aus Manifesten

`NAC.validate_global({probe: true})` synthetisiert einen Klick auf jedes `role="action"`-Element und prüft, ob es innerhalb von 5 Sekunden das kanonische Ack-Event auslöst. **Das ist ein automatisch generierter Smoke-Test für die gesamte klickbare Oberfläche der App.** In CI ausgeführt, erkennt er jede Schaltfläche, die ohne korrekte Ack-Emission eingebunden wird.

### 7. Pipeline-Coverage nach Stage

Die Referenz-Test-Suite von Yujin (`NAC_TEST_MANUAL.md`) organisiert Tests nach NAC3-Pipeline-Stage:

- Stage 1 (STT-Eingabe)
- Stage 2 (Disambiguierung)
- Stage 3 (LLM-Intermediär)
- Stage 4 (`NAC.*`-Aufrufe)
- Stage 5 (DOM-Seiteneffekt)
- Stage 6 (Ack-Event)

Coverage wird **pro Stage** gemessen, nicht nur pro Codezeile. Der Yujin-Referenzbericht weist einen gewichteten Durchschnitt von ~95 % über alle Stages aus. Wer dieses Schema übernimmt, erhält eine Coverage-Scorecard, die direkt auf den Vertrag abbildet.

## Auswirkungen auf bestehende Test-Frameworks

### Playwright

Direkte Integration. `page.evaluate()` ruft `NAC.*`-Aufrufe auf. Selektoren bleiben als Fallback für Layout-Assertions erhalten. Die Yujin-Referenz enthält 16 Playwright-Specs unter `tests/e2e-nac/specs/`.

### Cypress

`cy.window().then(win => win.NAC.click(id))`. Gleiches Muster. Custom Commands kapseln die NAC-Aufrufe: `cy.nacClick('invoice.save')`.

### Selenium

JavaScript-Executor: `driver.execute_script('return window.NAC.click(arguments[0])', 'invoice.save')`.

### Jest + React Testing Library

```ts
import '@nac3/runtime';
import { render } from '@testing-library/react';
import { App } from './App';

test('save works', async () => {
  render(<App />);
  await window.NAC.click('invoice.save');
  expect(mockApi.save).toHaveBeenCalled();
});
```

NAC3 ergänzt React Testing Library – es steht nicht im Widerspruch dazu.

### Karma / Jasmine / ältere Test-Runner

Direkte Einbindung über `window.NAC`. Alles, was JavaScript in einem Browser-Kontext ausführen kann, funktioniert.

## Adoptionskosten

### Bestehende App

Gemäß dem [Migrations-Playbook](AI_PLAYBOOK_MIGRATION.md) ist zu rechnen mit:

- ~1 Tag pro Screen für Dekoration + Manifest.
- ~1 Tag pro Screen für die Migration des Test-Corpus.
- Gesamt für eine App mit 20 Screens: ~6 Wochen für einen Ingenieur, amortisiert durch Wartungseinsparungen innerhalb von 3–4 Monaten.

### Neue App

Integriert von Anfang an. Das Greenfield-Playbook behandelt NAC3-Attribute als erstklassiges Anliegen. Kein Nachrüstaufwand.

## Risiken + Gegenmaßnahmen

### Risiko – „Wir vertrauen LLM-generierten Tests nicht"

Berechtigt. Das LLM erstellt einen Kandidaten; ein Mensch prüft und committet. Gleicher Workflow wie bei Copilot. Das ausgelieferte Corpus ist genau das, was das Team freigegeben hat – nicht das, was das LLM geschrieben hat.

### Risiko – „NAC-IDs werden mit der Zeit zu technischen Schulden"

Stimmt, wenn man sie veralten lässt. Behandle NAC-IDs wie Datenbankspalten-Namen: Umbenennung per Migration, niemals im laufenden Betrieb löschen. Das `@nac3/runtime` CLI erkennt verwaiste IDs per statischem Lint.

### Risiko – „Was, wenn die Verbreitung von NAC ins Stocken gerät?"

Die Spezifikation ist Apache-2.0. Die Runtime ist < 200 KB. Im schlimmsten Fall: Man besitzt das Artefakt, IDs bleiben stabil. Selbst der schlimmste Fall ist noch besser als CSS-Selektoren.

## Siehe auch

- [NAC_TEST_MANUAL.md](../docs/NAC_TEST_MANUAL.md) – das standardisierte Test-Playbook, das diese Auswirkungsanalyse untermauert.
- [RPA_UIPATH.md](RPA_UIPATH.md) / [RPA_AUTOMATION_ANYWHERE.md](RPA_AUTOMATION_ANYWHERE.md) / [RPA_BLUE_PRISM.md](RPA_BLUE_PRISM.md) – angrenzende Anwendungen desselben Vertrags.
- [COVERAGE_REPORT_2026_05_10.md](../docs/COVERAGE_REPORT_2026_05_10.md) – die eigenen Coverage-Zahlen der Yujin-Referenz.

## Lizenz

Apache-2.0.

---

*This is a machine translation of the canonical English
version at `/nac-spec/guides/IMPACT_TESTING.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
