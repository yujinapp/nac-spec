---
translation_source: SECURITY.md
translation_source_hash: 4d9f26e0cc810ed4f1c6cf921c7ae8f5c004d8ba42445a69a2de58106db2b64f
translation_quality: machine_v1
translation_lang: de
translation_date: 2026-05-11T13:00:24.781869+00:00
---

# NAC3 -- Sicherheitsmodell

**Spec-Version:** 2.2 stable (+ v2.3 Interop-Vorschau).

## Bedrohungsmodell

NAC3 sitzt zwischen Agenten und Ihrer UI. Es ist eine Vertragsschicht, keine
Authentifizierungsschicht. Es gibt mehrere klar abgegrenzte Vertrauensgrenzen;
dieses Dokument benennt sie, damit Sie genau nachvollziehen können, welche NAC3
schützt und welche nicht.

### Grenze A: Benutzer -> UI

Außerhalb des NAC-Geltungsbereichs. Verwenden Sie Ihre bestehende Authentifizierung (Sessions, OAuth,
SSO, MFA). Sobald ein Benutzer authentifiziert ist, geht NAC3 davon aus, dass jede Aktion,
die der Benutzer in der UI ausführen kann, zulässig ist.

### Grenze B: Benutzergesteuerter Agent -> UI

Ein Benutzer erteilt einem Agenten die Berechtigung, seine Browsersitzung zu steuern.
Beispiele: ein Sprachassistent, ein Screen Reader, ein LLM-Chat-Client,
der in dieselbe Seite eingebettet ist. Die Aufgabe von NAC3 hier:

1. Den Agenten mit stabilen Elementnamen versorgen, damit er agieren kann,
   ohne Koordinaten scrapen zu müssen.
2. `event.isTrusted` bereitstellen, damit der Host synthetische
   Klicks für sicherheitskritische Verben (Zahlung, Löschung, Rollenvergabe) ablehnen kann. Der Agent kann `isTrusted=true` nicht fälschen; nur eine echte
   Benutzergeste setzt diesen Wert.
3. Ereignisbasierte Bestätigungen bereitstellen, damit der Agent weiß, was abgeschlossen wurde,
   ohne das DOM erneut lesen zu müssen.

NAC3 schützt NICHT davor, dass ein Agent, dem der Benutzer explizit vertraut hat,
dieses Vertrauen missbraucht. Das ist ein UX-Problem
(Einwilligungsaufforderungen vor sensiblen Verben), das Ihre Anwendung behandelt, nicht
NAC.

### Grenze C: Externer Dienst -> UI (LLM-Vermittler)

Wenn die Spracheingabe eines Benutzers an ein entferntes LLM übermittelt wird, das NAC3-Aktionen zurückgibt, wird das LLM zu einem Vertrauensprinzipal. Die Aufgabe von NAC3 hier:

1. Das LLM sieht nur, was `NAC.describe()` offenlegt (den Baum-Snapshot
   und die registrierten Manifeste). Es sieht weder die Auth-Tokens des Benutzers noch Cookies oder DOM-Interna, die über das hinausgehen, was das Manifest deklariert.
2. Das LLM kann keinen Klick direkt auslösen. Es gibt eine strukturierte
   Aktion zurück; der Chat-Client validiert sie (existiert die nac_id?
   ist das Verb erlaubt?), bevor er sie ausführt.
3. Der Chat-Client SOLLTE Aktionen ablehnen, deren `nac_id` nicht
   im gesendeten Snapshot enthalten war (verhindert Prompt-Injection, die
   beliebige IDs einschleust).

NAC3 schreibt NICHT das Prompt-Template des LLM, Rate Limits oder
Filterung vor. Empfehlungen finden Sie in `guides/LLM_WIRING.md`.

### Grenze D: Mandant -> Mandant (Multi-Mandanten-Deployments)

Multi-Mandanten-SaaS, bei dem Mandanten eine Laufzeitumgebung, aber keine Daten teilen. NAC3
schützt dies mit HMAC-signierten Manifesten:

1. Jeder Mandant liefert sein Manifest mit einer HMAC-Signatur, die
   über eine stabile Serialisierung berechnet wird, unter Verwendung eines serverseitig gespeicherten mandantenspezifischen Geheimnisses.
2. Die Laufzeitumgebung berechnet bei `NAC.register()` den HMAC mit dem
   für den aktiven Mandanten erwarteten Geheimnis neu. Stimmt die Signatur
   nicht überein, wird das Manifest abgelehnt.
3. Ein bösartiger Mandant kann das Manifest eines anderen Mandanten nicht fälschen,
   ohne das Signiergeheimnis zu kennen.

NAC3 verhindert NICHT, dass ein Mandant ein übermäßig großes oder fehlerhaftes Manifest registriert, abgesehen von einer grundlegenden Größenbeschränkung; begrenzen Sie die Manifest-Registrierung serverseitig per Rate Limiting, wenn Sie nicht vertrauenswürdige Manifeste akzeptieren.

### Grenze E: Bösartiges Skript -> Seite

Eine Seite, die angreifer-kontrollierten JS-Code enthält (XSS, Supply-Chain-Kompromittierung), ist bereits verloren. NAC3 kann hier nicht helfen; der Angreifer
kann `NAC.click(...)` direkt aufrufen. Mindern Sie das Risiko durch CSP, SRI und
Ihren üblichen Web-Security-Stack.

## Herkunftssignale

### `is_trusted` in Erfolgsereignissen

Jedes Aktions-Erfolgsereignis enthält im Detail `is_trusted: boolean`.
Ein Host kann dies für sicherheitskritische Verben voraussetzen:

```js
document.addEventListener('nac:action:succeeded', function (e) {
  var d = e.detail;
  if (d.action_id === 'invoice.delete' && !d.is_trusted) {
    console.warn('[security] refused synthetic delete click');
    e.preventDefault();
  }
});
```

Die Referenz-Demo `example-v20-full.php` enthält ein Button-Paar
(`v20_panel.istrusted_real` und `v20_panel.istrusted_fake`), das
den Unterschied in der Panel-Ausgabe veranschaulicht.

### HMAC-Manifest-Signierung

Serverseitig die Signatur erzeugen:

```python
import hmac, hashlib, json
manifest_body = json.dumps(manifest, sort_keys=True, separators=(',', ':'))
sig = hmac.new(
    tenant_secret.encode('utf-8'),
    manifest_body.encode('utf-8'),
    hashlib.sha256
).hexdigest()
manifest['provenance'] = {
    'signed_at': now_iso8601(),
    'signed_by': tenant_slug,
    'signature': sig
}
```

Clientseitig:

```js
NAC.set_provenance_secret(SECRET_FROM_AUTHED_RESPONSE);
NAC.register(manifest);
// runtime recomputes hmac, rejects if mismatch
```

Das Geheimnis MUSS aus einer authentifizierten Server-Antwort stammen; betten Sie es
niemals in den JS-Quellcode ein. Rotieren Sie es pro Sitzung, wenn das Bedrohungsmodell
dies erfordert.

## Eine Sicherheitslücke melden

Senden Sie eine E-Mail an `nac@yujin.dev` mit:

1. Beschreibung der Sicherheitslücke.
2. Reproduktionsschritte oder Proof-of-Concept.
3. Betroffene NAC3-Version(en).
4. Vorgeschlagene Abhilfemaßnahme, falls vorhanden.

Öffnen Sie KEIN öffentliches GitHub-Issue. Wir verpflichten uns zu:

- Eingangsbestätigung innerhalb von 3 Werktagen.
- Bereitstellung einer Triage-Bewertung innerhalb von 10 Werktagen.
- Abstimmung des Offenlegungszeitpunkts mit dem Meldenden.

Kritische Probleme, die die öffentliche Spec betreffen, werden innerhalb von 30 Tagen mit einem Patch-Release behoben; weniger schwerwiegende innerhalb von 90 Tagen.

## Was NAC3 ausdrücklich NICHT tut

- Benutzer authentifizieren.
- Daten während der Übertragung verschlüsseln (verwenden Sie TLS).
- Den Benutzer daran hindern, das zu tun, was ihm erlaubt ist.
- Agenten voneinander isolieren (sie laufen alle auf derselben
  Seite; wenn Sie Isolation wünschen, verwenden Sie separate Seiten).
- Einzelne Aktionen signieren (nur Manifeste). Aktionsbezogenes Signieren wird
  als v3.0-Kandidat verfolgt.

---

*This is a machine translation of the canonical English
version at `/nac-spec/SECURITY.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
