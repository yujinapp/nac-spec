---
translation_source: guides/RPA_AUTOMATION_ANYWHERE.md
translation_source_hash: 165e60e4b3922f8353a3f038d815452ebf9ba7d597cb68f8c313eb47cb416eab
translation_quality: machine_v1
translation_lang: de
translation_date: 2026-05-11T14:34:08.332263+00:00
---

# NAC3 + Automation Anywhere Integrationsanleitung

**NAC3-Version:** 2.2 (mit v2.3 Interop-Vorschau)
**Getestet mit:** Automation Anywhere A2019 + A360.

## Zwei Wege – Auswahl nach AA-Edition

### Weg A – A360 + Web Recorder + Run JavaScript

AAs `Run JavaScript Function`-Aktion wird in den aktiven Browser-Tab injiziert.

```js
// payload variable: NAC_ID = "invoice.save"
async function nacClick(id) {
  await window.NAC.click(id);
  return 'ok';
}
return nacClick($NAC_ID$);
```

Eingabevariablen (`$NAC_ID$`, `$VALUE$`) werden zur Entwurfszeit gebunden;
die Aktion gibt einen String zurück, auf den der Bot verzweigt.

### Weg B – A2019 + Object Cloning mit benutzerdefiniertem Attribut

A2019s `Object Cloning` adressiert Elemente traditionell über DOM-Eigenschaften.
Konfiguration des Property-Selektors:

```
HTML.Attribute: data-nac-id
Search value: invoice.save
```

Weniger robust als Weg A (abhängig vom Timing des DOM-Baums), ermöglicht aber
erfahrenen A2019-Bots die Nutzung von NAC3, ohne bestehende Flows neu schreiben zu müssen.

## Kanonische 8-Aktionen-Bot-Vorlage

Für die v21-Rechnungsdemo:

| Schritt | Aktion | Payload |
|---------|--------|---------|
| 1 | Open Browser | https://your-app.example.com/ |
| 2 | Wait | auf `window.NAC` bereit (JS-Polling) |
| 3 | Loop CSV | Zeilen |
| 4 | Run JS | `await window.NAC.click_by_verb('invoice','new')` |
| 5 | Run JS | `await window.NAC.fill('invoice.client',$row.client$)` |
| 6 | Run JS | `await window.NAC.fill('invoice.amount',$row.amount$)` |
| 7 | Run JS | `await window.NAC.click_by_verb('invoice','save')` |
| 8 | End Loop | -- |

8 Aktionen unabhängig von der UI-Komplexität. Zum Vergleich: typische
CSS-Selektor-Flows benötigen 30–60 Aktionen.

## Erkundung via `NAC.describe()`

```js
return JSON.stringify(window.NAC.describe());
```

Gibt den Manifest-Baum zurück. AA kann diesen mit `JSON Parse` verarbeiten und
dynamische Flowcharts aufbauen.

## Herkunft + isTrusted

AA sendet synthetische Klicks. Die Host-Anwendung kann sensible Verben
(delete, payment) ablehnen, sofern diese nicht explizit auf der Whitelist stehen.
Das Host-seitige Opt-in-Muster ist im Abschnitt „Provenance" von
`RPA_UIPATH.md` beschrieben. Dasselbe gilt für AA.

## Fehlerbehandlung

Jeden JS-Aufruf in `try/catch` einwickeln, das JSON zurückgibt:

```js
try {
  await window.NAC.fill('@id@', '@value@');
  return JSON.stringify({ok: true});
} catch (e) {
  return JSON.stringify({ok: false, code: e.code, message: e.message});
}
```

Die `If`-Aktion verzweigt anhand des geparsten JSON.

## Lizenz + Siehe auch

Apache-2.0. Siehe [RPA_UIPATH.md](RPA_UIPATH.md) für eine ausführlichere
Behandlung; die Muster lassen sich 1:1 übertragen.

---

*This is a machine translation of the canonical English
version at `/nac-spec/guides/RPA_AUTOMATION_ANYWHERE.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
