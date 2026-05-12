---
translation_source: guides/RPA_UIPATH.md
translation_source_hash: 2dd66d68221f687237ac663fa2a360077a51b7cdf8ad74c16488a5934ee7927d
translation_quality: machine_v1
translation_lang: de
translation_date: 2026-05-11T14:33:55.365563+00:00
---

# NAC3 + UiPath Integrationsleitfaden

**NAC3-Version:** 2.2 (mit v2.3 Interop-Vorschau)
**Status:** Stabil. Getestet mit UiPath Studio 23.10 + Web
Automation v23.10.

UiPath's Web-Automatisierung liest heute den DOM per CSS-Selektoren,
visueller Zielerkennung oder fest codierten Koordinaten aus. Mit NAC3
stellt jedes anklickbare Widget in Ihrer Anwendung eine stabile
`data-nac-id` bereit; UiPath adressiert Elemente über diese ID und
übersteht UI-Redesigns problemlos.

## Warum NAC3 + UiPath

| Heutiges Problem | NAC3-Lösung |
|------------------|-------------|
| Selektoren brechen bei CSS-Änderungen | `data-nac-id` bleibt über visuelle Redesigns hinweg stabil |
| Anker-/Koordinaten-Targeting schlägt fehl, wenn ein Button verschoben wird | Dasselbe |
| Mandantenübergreifende Instabilität (unterschiedliche IDs je Kunde) | Das Manifest deklariert das Verb; der Bot ruft per Verb auf |
| Warten auf „Element ist bereit" ist fehleranfällig | Das `nac:action:succeeded`-Ereignis ist deterministisch |
| Mehrsprachige UIs erfordern lokalisierungsspezifische Automatisierung | `label_i18n` ist sprachunabhängig; der Bot verwendet IDs, keine Labels |

## Zwei Integrationswege

### Weg A – Browser-Aktivität + JS-Injektion (empfohlen)

UiPath's `Inject JavaScript`-Aktivität führt `window.NAC.click(...)`
direkt aus. Keine Selektoren, keine Fehleranfälligkeit.

```vb
' UiPath sequence pseudocode
Open Browser https://your-app.example.com/
Inject JS: window.NAC.click('invoice.save')
Wait for Event: nac:action:succeeded
```

Umsetzung:

1. **Browser-Aktivität** – standardmäßiger UiPath-Ablauf.
2. **Inject JavaScript-Aktivität** – Payload:
   ```js
   return await (async () => {
     const result = await window.NAC.click('@id@');
     return JSON.stringify(result);
   })();
   ```
3. **Assign** – den zurückgegebenen String einer Variable zuweisen. Parsen und `{ok: true}` prüfen.

Für verbbasiertes Dispatching:

```js
await window.NAC.click_by_verb('@plugin@', '@verb@')
```

Zum Befüllen:

```js
await window.NAC.fill('@id@', '@value@')
```

### Weg B – Selektorbasiert mit NAC-bewusstem XPath

Wenn Ihr UiPath-Profil Selektoren bevorzugt, verwenden Sie das
`data-nac-id`-Attribut direkt:

```xml
<webctrl tag='button' attr='data-nac-id' value='invoice.save' />
```

Gleiche Logik, greift aber über UiPath's Tree Explorer auf den Browser-DOM zu. Etwas weniger robust (abhängig vom Tree-Timing), behält jedoch den UiPath-Idiom bei.

## Beispiel-UiPath-Workflow

`Examples_NAC_Invoice.xaml` (nach Veröffentlichung im Yujin-Marketplace zum Download verfügbar):

1. **Open Browser** – Ziel-Tab auf Ihre NAC-3-konforme App richten.
2. **Warten auf window.NAC3** – injizieren:
   ```js
   return new Promise(r => {
     const t = setInterval(() => {
       if (window.NAC) { clearInterval(t); r('ready'); }
     }, 100);
   });
   ```
3. **For Each Row** – Quelldatentabelle iterieren.
4. **Inject JS** – pro Zeile:
   ```js
   await window.NAC.click_by_verb('invoice', 'new');
   await window.NAC.fill('invoice.client_name', @row("client")@);
   await window.NAC.fill('invoice.amount', @row("amount")@);
   await window.NAC.click_by_verb('invoice', 'save');
   ```
5. **Warten auf** – `nac:action:succeeded` mit `action_id='invoice.save'`.
6. **Schleife fortsetzen.**

Der gesamte Ablauf umfasst 5 Aktivitäten – unabhängig davon, wie komplex
die zugrunde liegende Anwendung ist. Zum Vergleich: Ein äquivalenter
CSS-selektorbasierter Ablauf benötigt typischerweise 30–50 Aktivitäten.

## Erkundung: Manifest auslesen

UiPath kann das Manifest vor der Automatisierung abfragen:

```js
return window.NAC.describe();
```

Gibt den vollständigen Plugin-Baum zurück. Damit lassen sich dynamische
Flowcharts erstellen, die sich an Manifest-Änderungen anpassen, ohne
die `.xaml`-Datei neu deployen zu müssen.

## Herkunftsnachweis (NAC-3)

UiPath sendet synthetische Klicks, daher gilt `event.isTrusted === false`
beim NAC3-Bestätigungsereignis. Apps, die sensible Verben an `is_trusted`
knüpfen (Löschen, Zahlung, Admin), werden den UiPath-Dispatch
standardmäßig ablehnen.

Um RPA für diese Verben zu aktivieren, muss die Host-Anwendung sie
explizit auf die Whitelist setzen:

```js
// In the host app's NAC bootstrap:
window.__NAC_ALLOW_UNTRUSTED__ = ['invoice.save', 'invoice.send'];
```

Besprechen Sie das Bedrohungsmodell mit dem App-Eigentümer – das Umgehen
von `isTrusted` hebt die Anti-Spoofing-Garantie der Spezifikation auf.
UiPath läuft in einer kontrollierten Umgebung, daher ist der Kompromiss
in der Regel akzeptabel, sollte aber dokumentiert werden.

## Fehlerbehandlung

NAC3 wirft strukturierte Fehler, auf die UiPath verzweigen kann:

```js
try {
  await window.NAC.click('invoice.save');
} catch (e) {
  return JSON.stringify({ ok: false, code: e.code, message: e.message });
}
```

| `e.code` | Bedeutung | UiPath-Verzweigung |
|----------|-----------|--------------------|
| `not_found` | ID existiert nicht im aktuellen DOM | Neu erkunden via `NAC.describe()` |
| `invalid` | Argumentform falsch | Bot-Logikfehler, eskalieren |
| `timeout` | Seiteneffekt hat nicht innerhalb von 5 s bestätigt | Bis zu N-mal wiederholen |

## Getestete Matrix

Wir testen die Integration gegen die
[v21 data-table demo](https://yujin.app/nac-spec/example-v21-data-table.php)
mit UiPath 23.10 in CI. Der Referenz-Workflow befindet sich in
`tools/rpa/uipath/InvoiceFromCSV.xaml` in diesem Repository (demnächst verfügbar).

## Siehe auch

- [SPEC.md Abschnitt 5](../SPEC.md#5-public-api) – vollständige NAC.*-Oberfläche.
- [SECURITY.md](../SECURITY.md) – `isTrusted`-Bedrohungsmodell.
- [LLM_WIRING.md](LLM_WIRING.md) – falls Ihr RPA-Ablauf auch Sprach-/Chat-Eingaben benötigt, den LLM-Vermittler vorschalten.
- [NAC_TEST_MANUAL.md](../docs/NAC_TEST_MANUAL.md) – wie Yujin diesen Vertrag Ende-zu-Ende testet.

## Lizenz

Apache-2.0.

---

*This is a machine translation of the canonical English
version at `/nac-spec/guides/RPA_UIPATH.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
