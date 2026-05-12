---
translation_source: ABOUT.md
translation_source_hash: 4ab5d9a2ad96ee42811299474895d9836adc1ca93ea37726806f190f59646484
translation_quality: machine_v1
translation_lang: hi
translation_date: 2026-05-11T13:11:57.494597+00:00
---

# NAC3 के बारे में

**Spec संस्करण:** 2.2 stable (+ v2.3 interop preview)।

**NAC3** = **Native Agent Contract**।

एक छोटी, सार्वजनिक spec जो web UIs को AI agents, voice runners, और accessibility tools द्वारा उसी तरह चलाने देती है जैसे आज इंसान चलाते हैं: क्लिक करके, टाइप करके, और पढ़कर -- लेकिन ऐसे नामों के साथ जिन्हें मशीनें resolve कर सकें, ऐसे events जिनका मशीनें इंतज़ार कर सकें, और एक provenance trail जो किसी असली उपयोगकर्ता को किसी synthetic caller से अलग पहचाने।

NAC3, ARIA के बगल में बैठता है, उसके ऊपर नहीं। जहाँ ARIA ने **accessibility tree** को standardise किया ताकि screen readers और switch devices उसी UI को operate कर सकें जो एक दृष्टिसंपन्न उपयोगकर्ता देखता है, वहीं NAC3 **agent tree** को standardise करता है ताकि एक voice command, एक LLM intermediary, या एक RPA bot बिना किसी per-app glue code के वही काम कर सके।

## आप क्या लिखते हैं

कुछ HTML attributes (`data-nac-id`, `data-nac-role`, `data-nac-action`, `data-nac-plugin`) और एक वैकल्पिक JS manifest जो page पर मौजूद चीज़ों और उनके द्वारा स्वीकृत verbs का नाम देता है। Runtime नामों को elements से resolve करता है और उन तक dispatch करता है।

## आपको क्या मिलता है

- एक ऐसा page जो किसी भी caller से -- voice runner, Playwright spec, LLM intermediary, keyboard macro, accessibility tool -- `NAC.click('deals.create')` पर प्रतिक्रिया देता है।
- एक ऐसा page जो एक deterministic event family (`nac:action:succeeded`, `nac:tab:activated`, `nac:field:changed`, ...) emit करता है ताकि caller को पता चले कि हर step कब पूरा हुआ।
- एक ऐसा page जिसका contract coordinates नहीं, बल्कि element identities पर आधारित है -- इसलिए UI redesign से automation नहीं टूटती।
- एक provenance layer (`isTrusted`, HMAC-signed manifests) जो किसी downstream system को बताता है कि क्लिक किसी असली उपयोगकर्ता से आई या किसी अन्य agent से।

## NAC3 क्या नहीं है

- यह कोई UI framework नहीं है। आप React / Vue / vanilla / PHP / जो भी उपयोग करते हैं, वह रखें। NAC3 एक पतला contract है जो आप जो भी render करते हैं उसके ऊपर layered होता है।
- यह कोई LLM नहीं है। जो LLM "click the save button" को `NAC.click('deals.save')` में resolve करता है, वह आपकी (या आपके vendor की) ज़िम्मेदारी है; reference के लिए `guides/LLM_WIRING.md` देखें।
- यह accessibility का विकल्प नहीं है। अपने ARIA roles बनाए रखें। NAC3 एक parallel layer जोड़ता है; कई adopters के पास एक ही element पर `role="button"` और `data-nac-role="action"` दोनों होते हैं।

## स्थिति

- **v1.9** -- stable। 27 widgets, 9 event families, HMAC + isTrusted, i18n strict mode, validator शामिल। Production reference है `example.php`।
- **v2.0** -- brownfield migration की सुविधा लाता है (मौजूदा pages ~80 lines के setup से NAC-driven बन जाते हैं)। Reference: `example-v20-full.php`।
- **v2.1** -- data-table primitive जोड़ता है (`collection`, `matrix`, `matrix-singletree` subkinds; `dt_add_row`, `dt_edit_cell`, aggregates, transactional commit)। Reference: `example-v21-data-table.php`।
- **v2.2** -- 2026-05-10 को SHIPPED। `NAC.register` अब एक strict validator है (`manifest_role_unknown`, `tab_id_manifest_role_drift`, `manifest_dom_role_mismatch`)। नया `NAC.bindAction(el, handler, ctx)` helper `nac:action:succeeded` contract को runtime में bake करता है। नया flag `NAC.STRICT_VALIDATION` findings को warning-only (2.2 में default) और throwing (2.3 में default) के बीच toggle करता है। **यही `npm install @nac3/runtime` आज ship करता है।** पूरे changelog के लिए `docs/NAC_V22_ROADMAP.md` देखें।
- **v2.3** -- planning में है। `STRICT_VALIDATION` का default `true` हो जाएगा। Tab widgets के लिए `NAC.bindTab(el, handler, ctx)` companion। वैकल्पिक opt-in: streaming chat dispatch।

## कहाँ से शुरू करें

- `yujin.app/nac-spec/` पर demos चलाएँ (कोई भी browser, कोई भी device)।
- पूरे contract के लिए `SPEC.md` पढ़ें।
- यदि आप React से adopt कर रहे हैं तो `guides/REACT.md` पढ़ें।
- यदि आप अपना LLM intermediary wire कर रहे हैं तो `guides/LLM_WIRING.md` पढ़ें।
- NAC3 को किसी tenant context में deploy करने से पहले `SECURITY.md` पढ़ें।

## Governance

NAC3 वर्तमान में Yujin द्वारा steward किया जाता है। Spec Apache 2.0 है; reference runtime MIT है। Yujin प्रतिबद्ध है कि यदि और जब adoption neutral governance को उचित ठहराए, तो NAC3 को एक neutral foundation (W3C community group, Linux Foundation, या समकक्ष industry body) में स्थानांतरित किया जाएगा। तब तक, spec changes `CONTRIBUTING.md` में RFC process का पालन करती हैं, जिसमें public API या wire format में किसी भी बदलाव के लिए कम से कम 14 दिनों की public comment period होती है।

Apache 2.0 + MIT licensing यह सुनिश्चित करती है कि spec और runtime Yujin की corporate स्थिति में किसी भी बदलाव से बचे रहें। Adopters आज और Yujin के अस्तित्व में न रहने के बाद भी दोनों को fork, run, और ship कर सकते हैं।

## लेखकत्व

NAC3 को Yujin (rpaforce.com) द्वारा authored और maintained किया गया है। Apache-2.0। Contributions का स्वागत है -- `CONTRIBUTING.md` देखें।

---

*This is a machine translation of the canonical English
version at `/nac-spec/ABOUT.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
