---
translation_source: guides/RPA_UIPATH.md
translation_source_hash: 2dd66d68221f687237ac663fa2a360077a51b7cdf8ad74c16488a5934ee7927d
translation_quality: machine_v1
translation_lang: hi
translation_date: 2026-05-11T15:04:51.728191+00:00
---

# NAC3 + UiPath इंटीग्रेशन गाइड

**NAC3 संस्करण:** 2.2 (v2.3 इंटरऑप प्रीव्यू सहित)
**स्थिति:** स्थिर। UiPath Studio 23.10 + Web Automation v23.10 के साथ परीक्षित।

UiPath की वेब ऑटोमेशन आज CSS सेलेक्टर्स, विज़ुअल टार्गेटिंग, या हार्डकोडेड कोऑर्डिनेट्स से DOM स्क्रेप करती है। NAC3 के साथ, आपके ऐप का हर क्लिक करने योग्य विजेट एक स्थिर `data-nac-id` प्रकाशित करता है; UiPath उस id से एलिमेंट को एड्रेस करता है और UI रीडिज़ाइन के बाद भी आसानी से काम करता रहता है।

## NAC3 + UiPath क्यों

| आज की समस्या | NAC3 का समाधान |
|--------------|---------|
| CSS बदलने पर सेलेक्टर टूट जाते हैं | `data-nac-id` विज़ुअल रीडिज़ाइन के बाद भी स्थिर रहता है |
| बटन हिलने के बाद Anchor / कोऑर्डिनेट टार्गेटिंग विफल हो जाती है | वही |
| क्रॉस-टेनेंट अस्थिरता (हर कस्टमर के अलग IDs) | Manifest verb घोषित करता है; बॉट verb से कॉल करता है |
| "एलिमेंट तैयार है" का इंतज़ार अविश्वसनीय है | `nac:action:succeeded` इवेंट निर्धारक है |
| मल्टी-लैंग्वेज UI के लिए प्रति-लोकेल ऑटोमेशन चाहिए | `label_i18n` लोकेल-अज्ञेयवादी है; बॉट लेबल नहीं, ids उपयोग करता है |

## दो इंटीग्रेशन पथ

### Path A -- Browser activity + JS injection (अनुशंसित)

UiPath की `Inject JavaScript` activity सीधे `window.NAC.click(...)` चलाती है। कोई सेलेक्टर नहीं, कोई अस्थिरता नहीं।

```vb
' UiPath sequence pseudocode
Open Browser https://your-app.example.com/
Inject JS: window.NAC.click('invoice.save')
Wait for Event: nac:action:succeeded
```

कार्यान्वयन:

1. **Browser activity** -- मानक UiPath फ्लो।
2. **Inject JavaScript activity** -- पेलोड:
   ```js
   return await (async () => {
     const result = await window.NAC.click('@id@');
     return JSON.stringify(result);
   })();
   ```
3. **Assign** -- लौटाई गई स्ट्रिंग को एक वेरिएबल में असाइन करें। `{ok: true}` जाँचने के लिए पार्स करें।

verb-आधारित डिस्पैच के लिए:

```js
await window.NAC.click_by_verb('@plugin@', '@verb@')
```

fill के लिए:

```js
await window.NAC.fill('@id@', '@value@')
```

### Path B -- NAC-aware xpath के साथ सेलेक्टर-आधारित

यदि आपका UiPath प्रोफ़ाइल सेलेक्टर पसंद करता है, तो `data-nac-id` एट्रिब्यूट सीधे उपयोग करें:

```xml
<webctrl tag='button' attr='data-nac-id' value='invoice.save' />
```

वही तर्क, लेकिन UiPath के ट्री एक्सप्लोरर के ज़रिए Browser DOM उपभोग करता है। थोड़ा कम मज़बूत (ट्री टाइमिंग पर निर्भर) लेकिन UiPath का मुहावरा बनाए रखता है।

## UiPath वर्कफ़्लो का नमूना

`Examples_NAC_Invoice.xaml` (प्रकाशित होने पर Yujin मार्केटप्लेस से डाउनलोड करें):

1. **Open Browser** -- अपने NAC-3 अनुरूप ऐप के टैब को लक्षित करें।
2. **Wait for window.NAC3** -- इंजेक्ट करें:
   ```js
   return new Promise(r => {
     const t = setInterval(() => {
       if (window.NAC) { clearInterval(t); r('ready'); }
     }, 100);
   });
   ```
3. **For Each Row** -- स्रोत डेटा टेबल पर इटरेट करें।
4. **Inject JS** -- प्रति पंक्ति:
   ```js
   await window.NAC.click_by_verb('invoice', 'new');
   await window.NAC.fill('invoice.client_name', @row("client")@);
   await window.NAC.fill('invoice.amount', @row("amount")@);
   await window.NAC.click_by_verb('invoice', 'save');
   ```
5. **Wait for** -- action_id='invoice.save' के साथ nac:action:succeeded।
6. **Continue** लूप।

पूरा फ्लो 5 activities का है, चाहे अंतर्निहित ऐप कितना भी जटिल हो। CSS-सेलेक्टर-आधारित समकक्ष के लिए सामान्यतः 30-50 activities से तुलना करें।

## डिस्कवरी: manifest पढ़ें

UiPath ऑटोमेट करने से पहले manifest का निरीक्षण कर सकता है:

```js
return window.NAC.describe();
```

पूरा प्लगइन ट्री लौटाता है। इसका उपयोग डायनामिक फ्लोचार्ट बनाने के लिए करें जो .xaml को फिर से डिप्लॉय किए बिना manifest परिवर्तनों के अनुकूल हो जाते हैं।

## Provenance (NAC-3)

UiPath सिंथेटिक क्लिक डिस्पैच करता है, इसलिए NAC3 ack इवेंट पर `event.isTrusted === false` होता है। जो ऐप संवेदनशील verbs पर `is_trusted` (delete, payment, admin) की जाँच करते हैं, वे डिफ़ॉल्ट रूप से UiPath डिस्पैच को अस्वीकार कर देंगे।

उन verbs के लिए RPA सक्षम करने हेतु, होस्ट ऐप को स्पष्ट रूप से व्हाइटलिस्ट करना होगा:

```js
// In the host app's NAC bootstrap:
window.__NAC_ALLOW_UNTRUSTED__ = ['invoice.save', 'invoice.send'];
```

ऐप ओनर के साथ थ्रेट मॉडल पर चर्चा करें -- isTrusted को बायपास करना स्पेक की एंटी-स्पूफिंग गारंटी को निष्क्रिय करता है। UiPath एक नियंत्रित वातावरण में चलता है इसलिए ट्रेड-ऑफ़ आमतौर पर स्वीकार्य है, लेकिन इसे दस्तावेज़ीकृत करें।

## एरर हैंडलिंग

NAC3 संरचित एरर फेंकता है जिन पर UiPath ब्रांच कर सकता है:

```js
try {
  await window.NAC.click('invoice.save');
} catch (e) {
  return JSON.stringify({ ok: false, code: e.code, message: e.message });
}
```

| `e.code` | अर्थ | UiPath ब्रांच |
|----------|---------|---------------|
| `not_found` | id वर्तमान DOM में मौजूद नहीं है | `NAC.describe()` से पुनः-डिस्कवर करें |
| `invalid` | आर्गुमेंट का आकार गलत है | बॉट लॉजिक बग, एस्केलेट करें |
| `timeout` | साइड इफेक्ट ने 5s में ack नहीं किया | N बार तक पुनः प्रयास करें |

## परीक्षित मैट्रिक्स

हम CI में UiPath 23.10 के ज़रिए
[v21 data-table demo](https://yujin.app/nac-spec/example-v21-data-table.php)
के विरुद्ध इंटीग्रेशन का परीक्षण करते हैं। संदर्भ वर्कफ़्लो इस रेपो के `tools/rpa/uipath/InvoiceFromCSV.xaml` में है (शीघ्र आने वाला)।

## यह भी देखें

- [SPEC.md sec 5](../SPEC.md#5-public-api) -- पूरी NAC.* सर्फेस।
- [SECURITY.md](../SECURITY.md) -- isTrusted थ्रेट मॉडल।
- [LLM_WIRING.md](LLM_WIRING.md) -- यदि आपके RPA फ्लो को voice / chat इनपुट की भी ज़रूरत है, तो LLM इंटरमीडियरी को आगे वायर करें।
- [NAC_TEST_MANUAL.md](../docs/NAC_TEST_MANUAL.md) -- Yujin इस कॉन्ट्रैक्ट को एंड-टू-एंड कैसे परीक्षित करता है।

## लाइसेंस

Apache-2.0.

---

*This is a machine translation of the canonical English
version at `/nac-spec/guides/RPA_UIPATH.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
