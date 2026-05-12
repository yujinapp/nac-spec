---
translation_source: guides/RPA_AUTOMATION_ANYWHERE.md
translation_source_hash: 165e60e4b3922f8353a3f038d815452ebf9ba7d597cb68f8c313eb47cb416eab
translation_quality: machine_v1
translation_lang: hi
translation_date: 2026-05-11T15:05:11.375308+00:00
---

# NAC3 + Automation Anywhere इंटीग्रेशन गाइड

**NAC3 संस्करण:** 2.2 (v2.3 इंटरऑप प्रीव्यू सहित)
**परीक्षण किया गया:** Automation Anywhere A2019 + A360 पर।

## दो रास्ते -- अपने AA संस्करण के अनुसार चुनें

### Path A -- A360 + Web Recorder + Run JavaScript

AA का `Run JavaScript Function` एक्शन सक्रिय ब्राउज़र टैब में इंजेक्ट करता है।

```js
// payload variable: NAC_ID = "invoice.save"
async function nacClick(id) {
  await window.NAC.click(id);
  return 'ok';
}
return nacClick($NAC_ID$);
```

इनपुट वेरिएबल्स (`$NAC_ID$`, `$VALUE$`) को डिज़ाइन टाइम पर बाइंड करें;
एक्शन एक स्ट्रिंग रिटर्न करता है जिस पर बॉट ब्रांचिंग करता है।

### Path B -- A2019 + Object Cloning with custom attribute

A2019 का `Object Cloning` परंपरागत रूप से DOM प्रॉपर्टीज़ के ज़रिए टार्गेट करता है। प्रॉपर्टी सेलेक्टर इस प्रकार कॉन्फ़िगर करें:

```
HTML.Attribute: data-nac-id
Search value: invoice.save
```

Path A की तुलना में कम मज़बूत (DOM ट्री टाइमिंग पर निर्भर), लेकिन अनुभवी A2019 बॉट्स को फ्लो दोबारा लिखे बिना NAC3 अपनाने की सुविधा देता है।

## कैनोनिकल 8-एक्शन बॉट टेम्पलेट

v21 इनवॉइस डेमो के लिए:

| चरण | एक्शन | पेलोड |
|------|--------|---------|
| 1 | Open Browser | https://your-app.example.com/ |
| 2 | Wait | `window.NAC` रेडी होने तक (poll JS) |
| 3 | Loop CSV | rows |
| 4 | Run JS | `await window.NAC.click_by_verb('invoice','new')` |
| 5 | Run JS | `await window.NAC.fill('invoice.client',$row.client$)` |
| 6 | Run JS | `await window.NAC.fill('invoice.amount',$row.amount$)` |
| 7 | Run JS | `await window.NAC.click_by_verb('invoice','save')` |
| 8 | End Loop | -- |

UI की जटिलता चाहे जितनी हो, केवल 8 एक्शन। CSS-सेलेक्टर फ्लो के सामान्य 30-60 एक्शन से तुलना करें।

## `NAC.describe()` के ज़रिए डिस्कवरी

```js
return JSON.stringify(window.NAC.describe());
```

मैनिफेस्ट ट्री रिटर्न करता है। AA इसे `JSON Parse` से पार्स करके डायनामिक फ्लोचार्ट बना सकता है।

## Provenance + isTrusted

AA सिंथेटिक क्लिक्स डिस्पैच करता है। होस्ट ऐप संवेदनशील वर्ब्स (delete, payment) को तब तक अस्वीकार कर सकता है जब तक उन्हें स्पष्ट रूप से व्हाइटलिस्ट न किया जाए। होस्ट-साइड ऑप्ट-इन पैटर्न के लिए `RPA_UIPATH.md` का "Provenance" सेक्शन देखें। यही AA पर भी लागू होता है।

## एरर हैंडलिंग

हर JS कॉल को `try/catch` में लपेटें और JSON रिटर्न करें:

```js
try {
  await window.NAC.fill('@id@', '@value@');
  return JSON.stringify({ok: true});
} catch (e) {
  return JSON.stringify({ok: false, code: e.code, message: e.message});
}
```

`If` एक्शन पार्स किए गए JSON पर ब्रांचिंग करता है।

## लाइसेंस + अन्य संदर्भ

Apache-2.0। विस्तृत जानकारी के लिए [RPA_UIPATH.md](RPA_UIPATH.md) देखें; वहाँ के पैटर्न 1:1 यहाँ भी लागू होते हैं।

---

*This is a machine translation of the canonical English
version at `/nac-spec/guides/RPA_AUTOMATION_ANYWHERE.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
