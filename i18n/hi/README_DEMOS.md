---
translation_source: README_DEMOS.md
translation_source_hash: 0f488dd749283f4f2e03f0e431de47d7007818c6745ce1ce993014bdf9839480
translation_quality: machine_v1
translation_lang: hi
translation_date: 2026-05-11T13:13:14.441024+00:00
---

# NAC3 के लाइव डेमो yujin.app/nac-spec/ पर

**Spec संस्करण:** 2.2 stable (+ v2.3 interop preview)।

**NAC3** = **Native Agent Contract**। यह spec वेब UIs को AI assistants, voice runners, और accessibility tools द्वारा चलाने की सुविधा देता है — बिना प्रत्येक app के लिए अलग glue code लिखे।

तीन डेमो एक साथ live हैं। हर एक का अलग उद्देश्य है; इन्हें आपस में न मिलाएं।

| फ़ाइल | संस्करण | उद्देश्य |
|---|---|---|
| `example.php` | v1.9 stable | NAC3 v1.9 का canonical डेमो। 27 widgets (chat, calendar, autopilot, modals, tabs, charts, आदि)। production जैसे UI में v1.9 की पूरी feature surface दिखाता है। **अपरिवर्तित।** |
| `example-v20-primitives-showcase.php` | v2.0-rc4 | 8 v2.0 primitives + HMAC + isTrusted + i18n contract का **didactic showcase**। 8 sections, हर primitive के लिए एक। उन reviewers और adopters के लिए उपयोगी जो प्रत्येक नए primitive को अलग से समझना चाहते हैं। **यह example.php का migration नहीं है।** |
| `example-v20-full.php` | v2.0-rc4 | `example.php` का NAC3 v2.0 strict में **brownfield migration**। वही 27 widgets, वही HTML, वही handlers — ऊपर से ~80 lines के setup code के ज़रिए v2.0 layer लागू की गई। दर्शाता है कि real-world adoption में हर widget को फिर से लिखना ज़रूरी नहीं है। |

## साथ-साथ तुलना

`example.php` और `example-v20-full.php` को दो tabs में खोलें।

### जो समान है

- HTML markup (हर `<article data-nac-plugin="X">`, हर
  `data-nac-id`, हर i18n catalog reference, हर handler)
- दृश्य रूप (एक जैसा layout, एक जैसे widgets, एक जैसे interactions)
- v1.9 reference runtime (`js/nac.js`) उसी तरह लोड किया गया
- मौजूदा `data-i18n-key` catalog references

### v2.0-full संस्करण में क्या अलग है

1. **Header docstring** स्पष्ट रूप से बताता है कि यह एक brownfield
   migration showcase है।
2. **एक अतिरिक्त script tag**: `js/nac-v2-extensions.js` जो
   `nac.js` के बाद और `example.js` से पहले लोड होता है।
3. **एक अतिरिक्त setup block** (पेज के नीचे ~80 lines) जो:
   - मौजूदा `data-nac-plugin` attributes से एक hierarchical scope tree
     बनाता है (हर plugin, `demo.shell` के अंतर्गत एक scope बन जाता है)।
   - HMAC sign सक्षम करने के लिए `NAC.set_provenance_secret()` कॉल करता है।
   - multi-tenant डेमो के लिए `NAC.setTenantPrefix('demo')` कॉल करता है।
   - toasts के लिए `NAC.captureEphemeral()` ring buffer शुरू करता है।
   - cards container पर `NAC.autoRegister.watch()` कॉल करता है।
4. **एक अतिरिक्त UI panel** (`#v20-panel`, नीचे-दाईं ओर fixed) जो
   live `describe_v2()`, `validate_global_v2()`, HMAC sign डेमो,
   और isTrusted distinction button उपलब्ध कराता है।

बस यही पूरा अंतर है। Real adopters इस pattern को ज्यों का त्यों उपयोग कर सकते हैं।

## मूल्यांकन कैसे करें

यदि आप NAC3 v2.0 के peer reviewer हैं:

1. पहले `example.php` खोलें। पुष्टि करें कि v1.9 डेमो पहले की तरह काम करता है।
2. `example-v20-full.php` खोलें। पुष्टि करें कि v1.9 की कार्यक्षमता
   (chat, calendar, autopilot, आदि) बिल्कुल **समान रूप से** काम करती है।
3. v2.0 panel खोलें (नीचे-दाईं कोने में)। हर बटन पर क्लिक करें:
   - `describe_v2()` — brownfield plugin attributes से बना scope tree देखें।
   - `validate_global_v2()` — findings देखें (यदि i18n catalog में gaps हैं
     तो संभवतः केवल warnings होंगी)।
   - `sign as agent` — उत्पन्न HMAC signature देखें।
   - `click=trusted` / `.click()=fake` — isTrusted distinction को
     व्यवहार में देखें।

यदि आप एक adopter हैं:

`example-v20-full.php` के setup block को अपना template मानें। scope tree को
अपने app की plugin structure के अनुसार ढालें। अधिकांश काम अपनी scope
hierarchy पहचानने में है; बाकी सब mechanical है।

## Cross-links

- NAC3 spec: https://github.com/pkuschnirof/nac-spec
- v1.9 release: tag `v1.9.0`
- v2.0 release candidate: `2.0.0-rc4` on `main`
- Round 3 peer review trail: `docs/PEER_REVIEW.md`

---

*This is a machine translation of the canonical English
version at `/nac-spec/README_DEMOS.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
