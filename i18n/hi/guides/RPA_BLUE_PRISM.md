---
translation_source: guides/RPA_BLUE_PRISM.md
translation_source_hash: 7ab698b35a99ca25e77a07599f1aa733b4ba42eb08d0f3bce785a9b0c7f7e276
translation_quality: machine_v1
translation_lang: hi
translation_date: 2026-05-11T15:05:25.348370+00:00
---

# NAC3 + Blue Prism इंटीग्रेशन गाइड

**NAC3 संस्करण:** 2.2 (v2.3 इंटरऑप प्रीव्यू सहित)
**परीक्षण:** Blue Prism 7.1 + Browser Automation v7.1 के साथ।

Blue Prism का `Browser` बिज़नेस ऑब्जेक्ट डिफ़ॉल्ट रूप से `Inject JavaScript` की सुविधा देता है। NAC3 + Blue Prism एक 5-चरण वाला पैटर्न है।

## चरण प्रवाह

1. **Login Agent** -- सामान्य।
2. **Navigate** -- NAC-अनुरूप ऐप खोलें।
3. **JS: wait for window.NAC3** -- तैयार होने तक पोल करें।
4. **JS: NAC.click / fill / tab** -- कैनोनिकल डिस्पैच।
5. **JS: read describe()** -- डेटाफ़्लो के अगले चक्र के लिए मैनिफ़ेस्ट का निरीक्षण करें।

## नमूना VBO (Visual Business Object)

```
Object: NAC Driver
Action: Click NAC ID
  Inputs:
    - nacId (Text)
  Code (Inject JavaScript):
    (async () => {
      try {
        await window.NAC.click([nacId]);
        return JSON.stringify({ok:true});
      } catch (e) {
        return JSON.stringify({ok:false, code:e.code, message:e.message});
      }
    })()
  Outputs:
    - resultJson (Text)
```

मिरर एक्शन: `Click By Verb`, `Fill`, `Select`, `Tab`,
`Describe`, `WaitForAck`।

## Ack प्रतीक्षा पैटर्न

`NAC.click()` आंतरिक रूप से पहले से ही `nac:action:succeeded` की प्रतीक्षा करता है
(5 सेकंड टाइमआउट)। Blue Prism ऊपर से एक अतिरिक्त स्पष्ट प्रतीक्षा जोड़ सकता है:

```js
return new Promise(resolve => {
  let acked = false;
  document.addEventListener('nac:action:succeeded', function (e) {
    if (e.detail.action_id === '[expectedId]') {
      acked = true;
      resolve('ok');
    }
  }, { once: true });
  setTimeout(() => { if (!acked) resolve('timeout'); }, [timeoutMs]);
});
```

यह पैटर्न Blue Prism के स्टेज आउटपुट के भीतर कैनोनिकल NAC3 इवेंट फ़ैमिली को उजागर करता है, जो प्रोसेस फ़्लो में ब्रांचिंग के लिए उपयोगी है।

## डिस्कवरी

`Read Manifest` एक्शन:

```js
return JSON.stringify(window.NAC.describe());
```

किसी Collection में पाइप करें। प्रोसेस स्टेज को पुनः कंपाइल किए बिना मैनिफ़ेस्ट स्कीमा परिवर्तनों के अनुसार अनुकूलित हो सकती है।

## लाइसेंस + यह भी देखें

Apache-2.0। व्यापक विवरण के लिए [RPA_UIPATH.md](RPA_UIPATH.md) देखें।

---

*This is a machine translation of the canonical English
version at `/nac-spec/guides/RPA_BLUE_PRISM.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
