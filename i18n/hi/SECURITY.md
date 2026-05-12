---
translation_source: SECURITY.md
translation_source_hash: 4d9f26e0cc810ed4f1c6cf921c7ae8f5c004d8ba42445a69a2de58106db2b64f
translation_quality: machine_v1
translation_lang: hi
translation_date: 2026-05-11T13:12:55.040192+00:00
---

# NAC3 -- सुरक्षा मॉडल

**Spec संस्करण:** 2.2 stable (+ v2.3 interop preview)।

## Threat model

NAC3 agents और आपके UI के बीच स्थित होता है। यह एक contract layer है, न कि authentication layer। इसमें कई अलग-अलग trust boundaries मौजूद हैं; यह दस्तावेज़ उन्हें स्पष्ट रूप से नाम देता है ताकि आप सोच सकें कि NAC3 किन्हें सुरक्षित करता है और किन्हें नहीं।

### Boundary A: User -> UI

यह NAC के दायरे से बाहर है। अपने मौजूदा auth (sessions, OAuth, SSO, MFA) का उपयोग करें। एक बार user authenticate हो जाने के बाद, NAC3 यह मान लेता है कि user UI में जो भी कार्य कर सकता है, वह अनुमत है।

### Boundary B: User-controlled agent -> UI

एक user किसी agent को अपना browser session चलाने की अनुमति देता है। उदाहरण: एक voice assistant, एक screen reader, या उसी page में embedded एक LLM chat client। यहाँ NAC3 की भूमिका:

1. Agent को stable element names प्रदान करना ताकि वह coordinates scrape किए बिना कार्य कर सके।
2. `event.isTrusted` को surface करना ताकि host security-sensitive verbs (payment, deletion, role grants) के लिए synthetic clicks को अस्वीकार कर सके। Agent `isTrusted=true` forge नहीं कर सकता; केवल एक वास्तविक user gesture ही इसे set करता है।
3. Event-level acks प्रदान करना ताकि agent को DOM दोबारा पढ़े बिना पता चले कि क्या पूरा हुआ।

NAC3 उस स्थिति से सुरक्षा नहीं करता जहाँ user द्वारा स्पष्ट रूप से trusted agent उस trust का दुरुपयोग करे। यह एक user-experience समस्या है (sensitive verbs से पहले consent prompts) जिसे आपका app संभालता है, NAC नहीं।

### Boundary C: External service -> UI (LLM intermediary)

यदि user का voice prompt किसी remote LLM को भेजा जाता है जो NAC3 actions लौटाता है, तो LLM एक trust principal बन जाता है। यहाँ NAC3 की भूमिका:

1. LLM केवल वही देखता है जो `NAC.describe()` expose करता है (tree snapshot + registered manifests)। वह user के auth tokens, cookies, या manifest में declared से परे DOM internals नहीं देखता।
2. LLM सीधे click नहीं कर सकता। वह एक structured action लौटाता है; chat client dispatch करने से पहले उसे validate करता है (क्या nac_id मौजूद है? क्या verb allowed है?)।
3. Chat client को उन actions को अस्वीकार करना चाहिए जिनका `nac_id` उसके भेजे गए snapshot में नहीं था (यह prompt injection को रोकता है जो arbitrary ids smuggle करने की कोशिश करता है)।

NAC3 LLM के prompt template, rate limits, या filtering को निर्धारित नहीं करता। सिफारिशों के लिए `guides/LLM_WIRING.md` देखें।

### Boundary D: Tenant -> Tenant (multi-tenant deployments)

Multi-tenant SaaS जहाँ tenants एक runtime share करते हैं लेकिन data नहीं। NAC3 इसे HMAC-signed manifests से सुरक्षित करता है:

1. प्रत्येक tenant अपना manifest एक HMAC signature के साथ ship करता है जो server-side stored per-tenant secret का उपयोग करके एक stable serialisation पर compute किया जाता है।
2. Runtime, `NAC.register()` पर, active tenant के लिए expected secret का उपयोग करके HMAC recompute करता है। यदि signature मेल नहीं खाता, तो manifest अस्वीकार कर दिया जाता है।
3. कोई malicious tenant signing secret के बिना दूसरे tenant का manifest forge नहीं कर सकता।

NAC3 किसी tenant को एक basic size cap से परे अत्यधिक बड़ा या malformed manifest register करने से नहीं रोकता; यदि आप untrusted manifests स्वीकार करते हैं तो server-side manifest registration को rate-limit करें।

### Boundary E: Malicious script -> Page

जो page attacker-controlled JS (XSS, supply chain compromise) include करती है, वह पहले से ही compromised है। NAC3 यहाँ मदद नहीं कर सकता; attacker सीधे `NAC.click(...)` call कर सकता है। CSP, SRI, और अपने सामान्य web security stack के माध्यम से इसे कम करें।

## Provenance signals

### success events में `is_trusted`

प्रत्येक action success event detail में `is_trusted: boolean` होता है। Host sensitive verbs के लिए इसे require कर सकता है:

```js
document.addEventListener('nac:action:succeeded', function (e) {
  var d = e.detail;
  if (d.action_id === 'invoice.delete' && !d.is_trusted) {
    console.warn('[security] refused synthetic delete click');
    e.preventDefault();
  }
});
```

Reference demo `example-v20-full.php` में एक button pair (`v20_panel.istrusted_real` और `v20_panel.istrusted_fake`) शामिल है जो panel output में यह अंतर दर्शाता है।

### HMAC manifest signing

Server-side, signature generate करें:

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

Client-side:

```js
NAC.set_provenance_secret(SECRET_FROM_AUTHED_RESPONSE);
NAC.register(manifest);
// runtime recomputes hmac, rejects if mismatch
```

Secret एक authenticated server response से आना चाहिए; इसे कभी भी JS source में embed न करें। यदि threat model की आवश्यकता हो तो per-session rotate करें।

## कोई vulnerability रिपोर्ट करना

`nac@yujin.dev` पर email करें, जिसमें शामिल हों:

1. Vulnerability का विवरण।
2. Reproduction steps या proof-of-concept।
3. प्रभावित NAC3 संस्करण।
4. यदि आपके पास हो तो suggested mitigation।

कोई public GitHub issue न खोलें। हम प्रतिबद्ध हैं:

- 3 business days के भीतर receipt की पुष्टि करना।
- 10 business days के भीतर triage assessment प्रदान करना।
- Reporter के साथ disclosure timing coordinate करना।

Public spec को प्रभावित करने वाले critical issues 30 दिनों के भीतर patch release के साथ ship होते हैं; कम severity वाले 90 दिनों के भीतर।

## NAC3 स्पष्ट रूप से क्या नहीं करता

- Users को authenticate करना।
- Transit में data encrypt करना (TLS का उपयोग करें)।
- User को वह करने से रोकना जो user को करने की अनुमति है।
- Agents को एक-दूसरे से sandbox करना (वे सभी एक ही page में चलते हैं; यदि आप isolation चाहते हैं, तो अलग pages चलाएं)।
- Individual actions को sign करना (केवल manifests)। Per-action signing को v3.0 candidate के रूप में track किया जा रहा है।

---

*This is a machine translation of the canonical English
version at `/nac-spec/SECURITY.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
