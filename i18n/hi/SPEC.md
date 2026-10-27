---
translation_source_hash: abf83a2435d03edd99061463e66e25982e426a41f93a8a1bf4a0c0720500553c
translation_quality: machine_v1
translation_date: 2026-10-27
translation_engine: anthropic/claude-opus-5 (Yujin Forge)
translation_normative: false
translation_status: complete
translation_lang: hi
translation_source: SPEC.md
translation_source_version: 2.5.2
translation_source_date: 2026-10-27
translation_sections: 83
translation_sections_canonical: 83
translation_units: 283
translation_units_canonical: 283
translation_canonical_url: /nac-spec/SPEC.html
---

<!-- translation-banner: produced by scripts/build-translation-banners.mjs -->

> **मशीनी अनुवाद, गैर-मानक।** यह 2026-10-27 के अंग्रेज़ी संस्करण (NAC3 v2.5.2) का अनुवाद है और आज के मूल दस्तावेज़ के 83 में से 83 अनुभागों को शामिल करता है। मानक पाठ अंग्रेज़ी है: बेमेल होने पर अंग्रेज़ी पाठ मान्य होगा।
>
> *Non-normative machine translation. The normative text of NAC3 is the English one.*
>
> [अंग्रेज़ी मानक पाठ पढ़ें](/nac-spec/SPEC.html)

<!-- /translation-banner -->

# NAC3 -- Native Agent Contract

**संस्करण:** 2.5.2 (स्थिर -- पूरी v2.5 सतह: narrate, context+tree, expect+diff)
**स्थिति:** स्थिर रिलीज़। npm का dist-tag `latest` यहीं इशारा करता है; खंड 9.1 बताता है कि यह क्या गारंटी देता है और एक प्री-रिलीज़ क्या गारंटी नहीं देती। यह दस्तावेज़ अपना संस्करण ठीक एक ही जगह लिखता है, ऊपर की पंक्ति में। प्रकाशित RFC और उनके परत 2 + परत 3 के साक्ष्य `README.md` और `runtime/CHANGELOG.md` में सूचीबद्ध हैं।
**लाइसेंस:** Apache-2.0
**संपादक:** Yujin (yujin.app)

---

## 0. उद्देश्य

NAC3 वेब इंटरफ़ेस और उन्हें चलाने वाले एजेंटों के बीच का अनुबंध है।
एजेंटों में आवाज़ चलाने वाले, LLM मध्यस्थ, RPA बॉट, सुगम्यता के उपकरण
और एंड-टू-एंड परीक्षण चलाने वाले शामिल हैं। यह अनुबंध तय करता है:

1. **तत्वों के नाम कैसे रखे जाते हैं** -- ताकि एजेंट कह सके "सेव बटन
   दबाओ" और उसे DOM के एक ही नोड पर हल कर सके।
2. **क्रियाएँ कैसे लागू होती हैं** -- ताकि एजेंट हर ऐप के लिए अलग जोड़
   लिखे बिना `NAC.click(id)`, `NAC.fill(id, value)`,
   `NAC.tab(plugin, key)` आदि बुला सके।
3. **पूरा होने का संकेत कैसे मिलता है** -- ताकि एजेंट जान सके कि एक चरण
   कब खत्म हुआ, हर भूमिका के लिए एक निश्चित घटना-परिवार के साथ।
4. **उद्गम कैसे सुरक्षित रहता है** -- ताकि आगे की कोई प्रणाली उपयोगकर्ता
   के असली क्लिक को गढ़े गए क्लिक से अलग पहचान सके।

NAC3 उस ढाँचे के ऊपर एक पतली परत जोड़ता है जिससे आप पहले से रेंडर कर
रहे हैं। यह ARIA, React, Vue या आपके डिज़ाइन सिस्टम की जगह नहीं लेता।

---

## 1. भूमिकाएँ

एजेंट से जुड़ा हर DOM तत्व `data-nac-role` रखता है। मानक भूमिकाएँ ये
हैं:

| भूमिका | अर्थ | उदाहरण |
|------|---------|---------|
| `plugin` | अपने आप में पूरा एक इंटरफ़ेस मॉड्यूल (एक पृष्ठ, एक पैनल, विजेट का एक समूह)। | `<article data-nac-plugin="invoice">` |
| `section` | प्लगिन के भीतर एक पहचान-बिंदु (शीर्ष, मुख्य भाग, तल, किनारे की पट्टी)। | `<section data-nac-role="section">` |
| `region` | एक खंड के भीतर नाम दिया जा सकने वाला क्षेत्र (कार्डों का समूह, परिणामों की सूची)। | `<div data-nac-role="region">` |
| `action` | एक क्रिया चलाने वाला दबाने योग्य विजेट (बटन, बटन की तरह इस्तेमाल हुई कड़ी)। | `<button data-nac-role="action" data-nac-action="save">` |
| `field` | वह इनपुट जिसे उपयोगकर्ता लिखता या बदलता है (पाठ, संख्या, चेकबॉक्स, रेडियो, तारीख, फ़ाइल)। | `<input data-nac-role="field">` |
| `option` | किसी फ़ील्ड के भीतर चुना जा सकने वाला विकल्प (कॉम्बोबॉक्स / select / रेडियो समूह का बच्चा)। | `<li data-nac-role="option">` |
| `tab` | बदला जा सकने वाला पैनल चयनकर्ता। **जब `data-nac-id` `^tab\.` से मेल खाए तो आवश्यक है** | `<button data-nac-role="tab" data-nac-id="tab.lines">` |
| `breadcrumb-item` | रास्ते की एक कड़ी। | `<a data-nac-role="breadcrumb-item">` |
| `accordion-toggle` | खोलने / समेटने का नियंत्रण। | `<button data-nac-role="accordion-toggle">` |
| `step` | सहायक प्रक्रिया के चरण का सूचक। | `<li data-nac-role="step">` |
| `pagination-item` | पृष्ठों में बँटी सूची में पृष्ठ बदलने का नियंत्रण। | `<button data-nac-role="pagination-item">` |
| `confirm-button` | पुष्टि के संवाद में पुष्टि / रद्द करने का बटन। | `<button data-nac-role="confirm-button">` |
| `sort-control` | क्रम लगाने वाला स्तंभ-शीर्ष। | `<th data-nac-role="sort-control">` |
| `filter-control` | स्तंभ छानने का प्रवर्तक। | `<button data-nac-role="filter-control">` |
| `data-table` | किसी डेटा तालिका का मेज़बान (2.1 से)। | `<table data-nac-role="data-table">` |
| `navigation` | पहचान-बिंदु के रूप में नेविगेशन क्षेत्र। **यह टैब नहीं है।** | `<nav data-nac-role="navigation">` |
| `confirm-dialog` | पुष्टि के अनुरोध का मोडल। | `<div data-nac-role="confirm-dialog">` |
| `draggable` | वह तत्व जिसे उपयोगकर्ता उठाकर हिला सकता है (1.6.2 से)। | `<li data-nac-role="draggable">` |
| `drop-target` | वह जगह जहाँ `draggable` छोड़ा जा सकता है (1.6.2 से)। | `<ul data-nac-role="drop-target">` |
| `button` | **सहा जाता है, सुझाया नहीं जाता।** एक पुराना बटन जिसे सिर्फ़ दबाने योग्य होना है, जिसका कोई क्रिया-अनुबंध नहीं। रनटाइम उसे `action` की तरह बरतता है। स्पष्ट `data-nac-action` के साथ `action` को वरीयता दें। | `<button data-nac-role="button">` |

इस सूची से बाहर की भूमिकाएँ भविष्य के लिए आरक्षित हैं। NAC-strict
रनटाइम को पंजीकरण के समय अनजानी भूमिकाओं को ठुकरा देना चाहिए (v2.2)।
NAC-permissive रनटाइम पुराने के साथ निभाने के लिए अनजानी भूमिकाओं को
`action` की तरह बरत सकता है (v1.9 और v2.0 का तयशुदा व्यवहार)।

यही तालिका मानक सूची है, और इसे डेटा के रूप में भी प्रकाशित किया जाता
है: `api/latest/contract.json` पर रखी मशीन-पठनीय सूची में हर वह भूमिका
है जिसे संदर्भ रनटाइम स्वीकार करता है, और हर एक पर
`declared_in_spec_table` का निशान है, ताकि दोनों सूचियों की तुलना गद्य
पढ़े बिना हो सके। v2.5 तक वे मेल खाती हैं। आगे कोई भी फ़र्क़ उसी निशान
में दिखेगा, किसी दस्तावेज़ और किसी कार्यान्वयन के मतभेद में छिपा नहीं
रहेगा।

---

## 2. नाम

एजेंट द्वारा हल किया जा सकने वाला हर तत्व `data-nac-id` रखता है। यह id:

- **बिंदुओं वाला एक रास्ता है** (उदाहरण के लिए
  `deals.list.row.42.actions.delete`)। बिंदु अर्थ के स्तर अलग करते हैं;
  रनटाइम उनका मतलब नहीं निकालता, पर इंसान और LLM निकालते हैं।
- **किसी एक `data-nac-plugin` के दायरे में विश्व भर में अनन्य है।** दो
  अलग प्लगिन एक ही id साझा कर सकते हैं; रनटाइम `(plugin, id)` की जोड़ी
  से हल करता है।
- **दोबारा रेंडर होने पर भी स्थिर है।** वे ढाँचे जो हर रेंडर पर नया id
  बनाते हैं (बेतरतीब हैश, इंस्टैंस के गिनतीकार) इस अनुबंध को तोड़ देते
  हैं।
- **इंटरफ़ेस के नए सिरे से डिज़ाइन होने पर भी स्थिर है।** एक बटन
  टूलबार से किसी ड्रॉपडाउन में चला जाता है; उसका id वही रहना आवश्यक
  है।

आरक्षित id उपसर्ग (2.1 से):

| उपसर्ग | किसके लिए आरक्षित |
|--------|--------------|
| `tab.` | टैब के बटन। भूमिका `tab` होनी आवश्यक है। |
| `modal.` | मोडल के दायरे के तत्व। भूमिका अंतिम विजेट की भूमिका होती है। |
| `field.` | फ़ॉर्म फ़ील्ड का संक्षिप्त रूप। भूमिका `field` या `option` होनी आवश्यक है। |
| `confirm.` | पुष्टि के संवाद। |

---

## 3. क्रियाएँ

`data-nac-role="action"` वाला तत्व `data-nac-action="<verb>"` रख सकता
है, जो बताता है कि वह क्या करता है। क्रिया एक खुला snake-case पहचानक है
जिस पर मेज़बान और एजेंट के बीच सहमति होती है। आम क्रियाएँ:

`save`, `cancel`, `submit`, `delete`, `edit`, `view`, `create`,
`approve`, `reject`, `send`, `download`, `upload`, `refresh`,
`expand`, `collapse`, `open`, `close`, `add_row`, `remove_row`।

`NAC.click_by_verb(plugin, verb)` किसी क्रिया को उस प्लगिन के नीचे की
अनन्य action पर हल करता है और उसे दबाता है। एक ही प्लगिन के नीचे कई
action का एक ही क्रिया साझा करना मैनिफ़ेस्ट की ग़लती है (lint:
`duplicate_verb`)।

---

## 4. मैनिफ़ेस्ट

हर प्लगिन इस तरह एक मैनिफ़ेस्ट पंजीकृत कर सकता है:

```js
NAC.register({
  plugin_slug: 'invoice',
  version:     '1.0.0',
  nac_version: '2.1',
  elements: [
    { id: 'invoice.save', role: 'action',
      actions: [{ verb: 'save', label_i18n: { es: 'Guardar', en: 'Save', ... } }],
      label_i18n: { es: 'Guardar factura', en: 'Save invoice', ... } },
    ...
  ],
  tabs: [
    { nac_id: 'tab.lines', label_i18n: { es: 'Lineas', en: 'Lines' } },
    ...
  ],
  fields: [
    { id: 'field.client_name', type: 'text', required: true,
      label_i18n: { es: 'Cliente', en: 'Customer' } },
    ...
  ],
  data_tables: [...]
});
```

मैनिफ़ेस्ट एजेंट की ओर देखने वाला सत्य का स्रोत है। एक LLM मध्यस्थ जो
तय करता है कि "उपयोगकर्ता ने 'guardar' कहा", प्लगिन का मैनिफ़ेस्ट
देखता है, क्रिया `save` पाता है, और
`NAC.click_by_verb('invoice', 'save')` भेजता है।

### 4.1 आवश्यक खाने

- `plugin_slug` -- मेज़बान तत्व के `data-nac-plugin` से मेल खाता है।
- `nac_version` -- NAC3 का वह संस्करण जिसके अनुरूप होने का दावा यह
  मैनिफ़ेस्ट करता है। रनटाइम उन मैनिफ़ेस्टों को ठुकरा देता है जो अपने से
  ऊँचे संस्करण का दावा करते हैं।

### 4.2 वैकल्पिक खाने

- `elements[]` -- नाम दिए गए विजेटों की सूची। हर प्रविष्टि में `id` और
  `role` होना आवश्यक है।
- `tabs[]` -- टैबों के लिए अलग, सबसे ऊपर का एक सरणी। यह `role:'tab'`
  वाली `elements[]` की प्रविष्टियों के बराबर है। दोनों रूप मान्य हैं।
- `fields[]`, `actions[]`, `kpis[]`, `data_tables[]` -- प्रकार के
  हिसाब से उप-संग्रह; भूमिका से छाने गए `elements[]` जैसा ही अर्थ।
  नमूने वह रूप चुनते हैं जो इंसान के लिए सबसे साफ़ पढ़ा जाए।

### 4.3 i18n

हर `label_i18n` में NAC3 की सभी 10 लोकेल आना आवश्यक है:

```
es, en, pt, fr, ja, zh, hi, ar, de, it
```

`NAC.autoRegister.watch()` पर `i18n_strict: 'permissive'` ब्राउनफ़ील्ड
प्रवास के दौरान अधूरी कवरेज की छूट देता है; उत्पादन के मैनिफ़ेस्टों को
सभी 10 लोकेल देनी चाहिए।

#### 4.3.1 दस लोकेल की शर्त किस पर लागू होती है

ऊपर की शर्त **अपनाने वाले के मैनिफ़ेस्ट** पर लागू होती है -- वह
`label_i18n` तालिका जिसे एजेंट पढ़कर किसी तत्व को उपयोगकर्ता की भाषा में
नाम देता है। यह इस दस्तावेज़ की भाषा पर लागू **नहीं** होती, और NAC3 में
कुछ भी किसी कार्यान्वयन को अपने दस्तावेज़ दस भाषाओं में छापने के लिए
बाध्य नहीं करता।

#### 4.3.2 इस विशिष्टि की मानक भाषा

NAC3 का मानक पाठ **अंग्रेज़ी** वाला है: विशिष्टि के भंडार की जड़ में रखी
`SPEC.md`, जो `https://yujin.app/nac-spec/SPEC.html` पर रेंडर होती है।

यह विशिष्टि `i18n/<locale>/SPEC.md` के नीचे मशीनी अनुवादों के रूप में भी
छापी जाती है। वे अनुवाद **मानक नहीं** हैं। हर एक, पाठक को दिखने वाले
सूचना-पट्ट में और मशीन के पढ़ने लायक़ शीर्ष-खंड में, यह घोषित करता है कि
वह अंग्रेज़ी के किस संशोधन का अनुवाद है और उसका कितना हिस्सा ढकता है;
सूचना-पट्ट अनिवार्य है, और बिना पट्ट छपा अनुवाद प्रकाशन की ख़ामी है,
अनुवाद की नहीं। जहाँ अनुवाद और अंग्रेज़ी पाठ में फ़र्क़ हो, वहाँ
अंग्रेज़ी पाठ चलता है, और अनुरूपता का दावा अंग्रेज़ी पाठ के विरुद्ध दावा
है।

अंग्रेज़ी से पीछे चल रहा अनुवाद **अंग्रेज़ी के प्रकाशन को कभी नहीं
रोकता**। मानक पाठ तैयार होने पर निकल जाता है; पुराने अनुवाद की इकाई-दर-
इकाई ख़बर दी जाती है, और रिलीज़ चली जाती है। नौ मशीनी उत्पादों के पास उस
दस्तावेज़ पर कोई वीटो नहीं जिसका वे अनुवाद हैं। 2.5.1 तक वे नौ 83 में
से 34 खंड ढकते थे और यह कोई नहीं कहता था; अब वे हर भाषा के अपने भंडार से
बनते हैं, और तरीक़ा `docs/TRANSLATION_PASS.md` में है।

---

## 5. सार्वजनिक API

### 5.1 आज्ञार्थक

```ts
NAC.click(nac_id: string, opts?: ClickOpts): Promise<{ok: true}>
NAC.click_by_verb(plugin: string|null, verb: string, opts?): Promise<...>
NAC.fill(nac_id: string, value: string|number|boolean): Promise<...>
NAC.select(nac_id: string, value: string): Promise<...>
NAC.tab(plugin: string, tab_key: string): Promise<...>
NAC.tab_by_label(plugin: string|null, label: string): Promise<...>
NAC.go_to_section(nac_id: string): Promise<...>
NAC.drag_drop(source_id, target_id, opts?: {to_index?: number}): Promise<...>
NAC.set_mode(mode: 'modal'|'maximized'|'new_tab'|'new_window'): void
NAC.screenshot(): Promise<string>  // data URL
NAC.bindAction(el, handler, {plugin, action_id}): () => void  // v2.2
```

### 5.1.1 अनुरूपता का सहायक (v2.2)

`NAC.bindAction(el, handler, ctx)` क्लिक के हैंडलर को जोड़ने का
विशिष्टि-अनुरूप तरीका है। हैंडलर चलने के बाद (समकालिक, अपवाद के साथ या
Promise) यह `nac:action:succeeded` (या `:failed`) अपने आप भेजता है। यह
जोड़ हटाने वाला एक फलन लौटाता है। जहाँ भी मेज़बान इसका साथ दे, नंगे
`addEventListener('click', ...)` की जगह इसी का उपयोग करें; ब्राउनफ़ील्ड
कोड पहले की तरह घटना हाथ से भेजता रह सकता है।

### 5.1.3 फ़ील्ड संपादक (v2.3)

`NAC.edit_field(nac_id)` एक मोडल खोलता है जिससे कोई व्यक्ति (या उसकी
ओर से कोई एजेंट) किसी भी पाठ फ़ील्ड को शब्द-संसाधक जैसे उपकरणों से
संपादित कर सकता है:

```ts
NAC.edit_field(nac_id: string): Promise<{ok:true}>
```

यह मोडल `plugin_slug='nac_editor'` के नीचे, NAC3 से बुलाई जा सकने वाली
इन क्रियाओं के साथ पंजीकृत होता है:

| क्रिया | असर |
|------|--------|
| `select_word` | कर्सर वाले शब्द को चुनना |
| `select_sentence` | कर्सर वाले वाक्य को चुनना |
| `select_all` | संपादक के भीतर ctrl-A |
| `replace` | चुने हुए हिस्से को दिए गए पाठ से बदलना |
| `delete_selection` | अभी चुने हुए हिस्से को हटाना |
| `ai_correct_syntax` | अभी का मान सिस्टम प्रॉम्प्ट "fix grammar + spelling, return only fixed text" के साथ LLM मध्यस्थ को POST करना; मान को उत्तर से बदल देना |
| `save` | स्रोत फ़ील्ड में वापस लिखना, input और change घटनाएँ भेजना, बंद करना |
| `cancel` | छोड़ देना, बंद करना |

Esc बंद करता है (रद्द)। Ctrl/Cmd+Enter सहेजता है। ओवरले की पृष्ठभूमि पर
क्लिक रद्द कर देता है।

विशिष्टि का खंड 13 इस अनुबंध को v2.3 में औपचारिक रूप देगा; v2.2 का
रनटाइम एक चलता-फिरता संदर्भ कार्यान्वयन देता है ताकि अपनाने वाले इसे आज
ही जोड़ सकें। किसी भी फ़ील्ड पर इस तरह उपलब्ध:

```js
NAC.edit_field('invoice.client_name');
// or by intermediary:
NAC.click_by_verb('myplugin', 'edit_field', { nac_id: 'invoice.client_name' });
```

### 5.1.4 क्रिया का पेलोड + invoke (v2.3)

NAC v2.2 की क्रियाएँ दबाओ-और-चलो वाली हैं: एजेंट `NAC.click(id)` या
`NAC.click_by_verb(plugin, verb)` चलाता है और मेज़बान जो करता है वह
करता है। यह क्रिया-और-स्थिति वाली क्रियाओं (`save`, `cancel`,
`submit`, `delete`) के लिए चलता है, पर तब ढह जाता है जब किसी क्रिया को
एजेंट से **डेटा** चाहिए -- `utter(text)`, `search(query)`,
`send_message(body)`, `upload(file)`, `schedule(date)`,
`translate(text, target_lang)`। मेज़बान के पास गढ़े गए क्लिक के रास्ते
एजेंट का पेलोड पाने का कोई तरीका नहीं है।

v2.3 इस खाई को भर देता है। अनुबंध जोड़ने वाला है: क्लिक शैली की
क्रियाएँ बिना बदलाव चलती रहती हैं।

```ts
NAC.invoke(action_id: string, payload: object, opts?: { timeout?: number })
  : Promise<{ok: true, request_id: string, ack: object|null}>

NAC.utter(action_id: string,
          opts: { text: string, lang?: string, voice?: string, metadata?: object })
  : Promise<{ok: true, request_id: string, ack: object|null}>
```

`NAC.invoke` मेज़बान तत्व पर `nac:action:requested` नाम का एक
`CustomEvent` भेजता है (जो document तक उठता है), इन बातों के साथ:

```ts
detail: {
  action_id:  string,    // canonical nac_id of the host element
  verb:       string,    // payload.verb || el's data-nac-action
  payload:    object,    // arbitrary, action-specific
  plugin:     string|null,
  request_id: string,    // correlation token assigned by the runtime
  ts:         number,    // Date.now()
}
```

मेज़बान `nac:action:requested` सुनता है, पेलोड पर काम करता है, और
detail में वही `request_id` डालकर `nac:action:succeeded` (या
`nac:action:failed`) भेजता है। रनटाइम `request_id` से जोड़ी बनाता है और
एजेंट के Promise को हल करता है।

तयशुदा प्रतीक्षा **30 सेकंड** है (क्लिक के लिए 5 s)। इसे
`opts.timeout` से बदला जा सकता है। समय बीतने पर Promise
`NacError('timeout', ...)` के साथ ठुकरा दिया जाता है। क्लिक की ही तरह,
समय बीतना असली विफलता का अर्थ रखता है: जब तक बुलाने वाले के पास किसी और
रास्ते से असर का सबूत न हो, उसे इसे विफलता ही मानना आवश्यक है।

`NAC.utter(id, opts)` पेलोड ढोने वाली सबसे आम क्रिया के लिए सुविधाजनक
छोटा रास्ता है। यह इसके बराबर है:

```js
NAC.invoke(id, { verb: 'utter', text: opts.text, lang: opts.lang });
```

#### मैनिफ़ेस्ट में घोषणा

पेलोड ढोने वाली क्रिया अपने मैनिफ़ेस्ट की प्रविष्टि में उस पेलोड का
ढाँचा घोषित करती है, पीछा करने और औज़ारों के लिए:

```js
NAC.register({
  plugin_slug: 'atlas_pro_ad',
  version:     '2.1.0',
  nac_version: '2.3',
  elements: [
    { id: 'atlas_pro_ad.mic', role: 'action',
      actions: [
        { verb: 'listen' },
        { verb: 'utter',
          payload_schema: {
            text: { type: 'string', required: true, max: 4000 },
            lang: { type: 'string',
                    enum: ['en','es','pt','fr','it','de','ja','zh','hi','ar'] }
          },
          label_i18n: { es:'Decir', en:'Utter', /* ... 10 locales */ } }
      ],
      label_i18n: { /* ... */ } }
  ]
});
```

`payload_schema` **v2.5 तक सिर्फ़ सूचना भर है**, और संदर्भ रनटाइम उसे
पढ़ता ही नहीं: यह खाना मैनिफ़ेस्ट में स्वीकार होता है,
`NAC.manifest()` में साथ चलता है, और कभी किसी चीज़ के विरुद्ध जाँचा नहीं
जाता। `NAC.STRICT_VALIDATION` -- जिसका तयशुदा मान सचमुच 2.3.0 में
`true` हो गया -- सिर्फ़ मैनिफ़ेस्ट और DOM की भूमिका के निष्कर्ष ढकता
है; पेलोड उसने कभी नहीं ढके। इसलिए एजेंट को यह नहीं मान लेना चाहिए कि
ढाँचा घोषित था तो पेलोड जाँचा गया होगा: आज एकमात्र जाँच वही है जो एजेंट
भेजने से पहले ख़ुद करता है।

ढाँचे जान-बूझकर सरल हैं (JSON-Schema जैसी शक्ल का एक उपसमुच्चय), ताकि
रनटाइम पूरा JSON-Schema जाँचक साथ लाए बिना जाँच सके, और लागू करने के दिन
के लिए डिज़ाइन का इरादा वही बना हुआ है।

इस खंड के एक पुराने संशोधन ने 2.4 रिलीज़ के लिए वादा किया था कि ढाँचे
का व्याकरण औपचारिक कर दिया जाएगा और उसे लागू करना तयशुदा हो जाएगा।
**वह 2.4 में नहीं हुआ और 2.5 तक भी नहीं हुआ।** उस वाक्य पर नई तारीख
लगाने के बजाय उसे हटा दिया गया है: संस्करण संख्या चिपकाए हुए वादा, उस
संस्करण के बीत जाने पर भी खड़ा रह जाए, तो एजेंट उसे ऐसी क्षमता की तरह
पढ़ता है जिस पर वह भरोसा कर सकता है। व्याकरण को औपचारिक करना और लागू
करना जोड़ना खंड 13 में खुले प्रश्न के रूप में दर्ज है, जहाँ वह खुला और
बिना तारीख लिखा है।

#### निष्क्रिय स्थिति का अर्थ (alpha.2 से आया v2.3 का तुरंत सुधार)

जब लक्ष्य तत्व पर `disabled` या `aria-disabled='true'` लगा हो, तब
`NAC.invoke` इनकार **नहीं** करता। HTML का `disabled` गुण इंटरफ़ेस की
क्लिक-रोक है; `invoke` पेलोड ढोने वाला तार्किक अनुरोध है, गढ़ा हुआ
क्लिक नहीं। जिन मेज़बानों को इंटरफ़ेस की स्थिति देखकर किसी invoke से
मना करना है, उन्हें यह अपने `nac:action:requested` के श्रोता में करना
आवश्यक है, और अर्थपूर्ण त्रुटि कोड के साथ `nac:action:failed` भेजना
आवश्यक है।

इसके उलट, `NAC.click` निष्क्रिय तत्वों पर अब भी इनकार करता है (क्लिक का
अर्थ बचा हुआ है)। परीक्षण की कवरेज:
`runtime/test/v23-invoke.mjs` T7/T8/T9।

#### अनुरूपता: invoke का साथ देने वाले मेज़बानों के लिए आवश्यक है

1. मैनिफ़ेस्ट की प्रविष्टि में `actions[].payload_schema` घोषित करना।
2. `nac:action:requested` सुनना (या एक सामान्य श्रोता रखना जो
   `detail.action_id` + `detail.verb` से छाने)।
3. काम पूरा होने पर `nac:action:succeeded` भेजना -- जिसमें
   `detail.request_id` वैसा ही लौटाया जाए -- या विफलता पर
   `nac:action:failed` (कोड `detail.error` में)।
4. ऐसा `:succeeded` कभी न भेजना जिसका `request_id` उन्हें मिला ही न हो
   (इससे साथ-साथ चल रहे बुलावों के बीच की गड़बड़ रुकती है)।

जो मेज़बान invoke का साथ **नहीं** देते, वे `NAC.click()` और
`NAC.click_by_verb()` के नीचे सामान्य रूप से चलते रहते हैं। जो एजेंट
`actions[].payload_schema` प्रविष्टि के बिना किसी मेज़बान पर
`NAC.invoke()` बुलाते हैं, उन्हें `request_id` तो मिलेगा, पर रनटाइम
पहुँचने की गारंटी नहीं दे सकता; प्रतीक्षा 30 s पर टूट जाती है।

#### यह क्यों मायने रखता है

एजेंट की तरफ़ की पूरी सतह "बटनों की सूची" नहीं रहती, "बटनों की सूची +
ढाँचेदार इनपुट" बन जाती है। आवाज़ का एक विज्ञापन NAC.invoke से बुलाया
जा सकने लगता है। एक खोज-पट्टी NAC.invoke से बुलाई जा सकने लगती है। एक
फ़ाइल चढ़ाना NAC.invoke से बुलाया जा सकने लगता है। वही प्रोटोकॉल, वही
उद्गम, पहुँच की वही समझ।

पहला संदर्भ अपनाने वाला **Atlas Pro** है: उसका तत्व
`atlas_pro_ad.mic` दोनों क्रियाएँ घोषित करता है -- `listen` (सिर्फ़
क्लिक, पहले से मौजूद) और `utter` (पेलोड वाली)। दोनों हालतों में वही
`/parse` + `/tts` वाला संवाद का चक्र चलाता है; जिन एजेंटों के पास
वाणी-पहचान है वे `listen` बुलाते हैं, जिनके पास अपना भाषा-मॉडल है वे
`utter` बुलाते हैं।

#### आगे आने वाली विधाएँ (पहले से सोची हुई, विशिष्टि बदलने की ज़रूरत नहीं)

`invoke` जान-बूझकर विधा से बेपरवाह है, ताकि आगे आने वाले इनपुट के कुल
अनुबंध तोड़े बिना जुड़ सकें:

| विधा | क्रिया (खाका)         | पेलोड (खाका)                                     |
|----------|-----------------------|--------------------------------------------------|
| पाठ      | `utter`               | `{text, lang?}`                                  |
| खोज      | `search`              | `{query, scope?, limit?}`                        |
| फ़ाइल    | `upload`              | `{filename, mime, data_url \| stream_id}`        |
| छवि      | `analyze_image`       | `{image_url \| data_url, prompt?}`               |
| वीडियो   | `analyze_stream`      | `{stream_url, frame_window_ms?, return?}`        |
| समय      | `schedule`            | `{datetime, duration_min, attendees?}`           |
| कोड      | `apply_diff`          | `{file_path, unified_diff}`                      |
| आवाज़    | `transcribe`          | `{audio_url \| data_url, lang?}`                 |

हर विधा उसी `nac:action:requested` -> `nac:action:succeeded` /
`:failed` घटना-प्रोटोकॉल का पालन करती है, उसी `request_id` से जोड़ी
बनाती है, प्रतीक्षा का वही अर्थ रखती है। रनटाइम छोटा बना रहता है;
क्रियाओं की शब्दावली मेज़बानों और एजेंटों के बीच की परंपरा से बढ़ती है।
सुविधाजनक छोटे रास्ते (`NAC.utter`, `NAC.search`, `NAC.watch` आदि) बाद
में बिना कुछ दोबारा तय किए जोड़े जा सकते हैं, क्योंकि हर एक `invoke`
के ऊपर की पतली परत भर है।

### 5.1.5 shadow DOM में हल करना -- खुली जड़ें (v2.3)

रनटाइम `data-nac-id` के संदर्भों को खुली shadow जड़ों के आर-पार,
पुनरावर्ती ढंग से हल करता है। कोई पृष्ठ
`attachShadow({mode:'open'})` से Web Components लगा सकता है, shadow
पेड़ के भीतर के तत्वों पर `data-nac-*` गुण रख सकता है, और NAC3 का कोई
भी बुलाने वाला (`NAC.click`, `NAC.fill`, `NAC.invoke` आदि) लक्ष्य को
पारदर्शी ढंग से हल कर लेता है।

#### हल करने की विधि

किसी चयनक `S` (आम तौर पर `[data-nac-id="..."]`) को किसी जड़ `R` (आम तौर
पर `document`) के विरुद्ध हल करने के लिए:

1. `R.querySelector(S)` -> null न हो तो तुरंत लौटा दें।
2. `R` के हर वंशज `el` के लिए:
   - `el.shadowRoot` null न हो (अर्थात खुली shadow जड़) तो
     `R := el.shadowRoot` के साथ गहराई +1 पर पुनरावर्तन करें।
   - वरना, `el.nac3` ऐसा वस्तु हो जो `query` विधि देता है, तो सौंप दें
     (खंड 5.1.6 देखें)।
3. पुनरावर्तन **10 स्तर की गहराई पर रुक जाता है**। 10 से गहरे लक्ष्य
   अपहुँच हैं; बुलाने वाले को `code='not_found'` मिलता है। यह सीमा
   रोगी किस्म की खोज रोकने के लिए है; व्यवहार में उत्पादन का कोई कोड
   shadow को 3-4 स्तर से ज़्यादा नहीं घोंसलाता।
4. खोज DOM के क्रम में चौड़ाई से चलती है: घोंसले के shadow से पहले भाई।
   पहला मेल जीतता है।

#### घटनाओं का फैलाव

shadow जड़ के भीतर के मेज़बानों से भेजी गई घटनाओं में
`composed: true` रखना आवश्यक है, तभी document के स्तर के श्रोता उन्हें
पाएँगे। NAC3 का रनटाइम अपनी सारी घटनाएँ पहले से `composed:true` के साथ
भेजता है; हाथ से `nac:*` घटनाएँ भेजने वाले मेज़बान कोड की भी वही
ज़िम्मेदारी है। `composed:true` के बिना घटना shadow की सीमा पर रुक
जाती है और रनटाइम की जोड़ी बनाने वाली मशीनरी उसे कभी नहीं देखती।

#### पुर्ज़ा लिखने वाले की ज़िम्मेदारी

पुर्ज़ा लिखने वाले को यह करना होता है:

1. shadow जड़ के भीतर चलाए जा सकने वाले तत्वों पर `data-nac-id`,
   `data-nac-role`, `data-nac-action` रखना।
2. मेज़बान जो भी अपनी घटना NAC3 के अनुबंध का संकेत देने के लिए भेजे,
   उसमें `composed:true` रखना (`nac:action:succeeded`,
   `nac:field:changed` आदि)।
3. जिन तत्वों को shadow में अलग-थलग रहना है उनके लिए `<slot>` से बचना --
   slot में रखे नोड light DOM में रहते हैं और वहीं हल होते हैं।

खुली shadow जड़ों के लिए मैनिफ़ेस्ट में किसी इशारे या रनटाइम में किसी
स्वीकृति की ज़रूरत नहीं; हल करना अपने आप होता है।

#### संदर्भ कार्यान्वयन

संदर्भ रनटाइम दो भीतरी सहायक देता है,
`_deepQuery(selector, root)` और `_deepQueryAll(selector, root)`, जो यह
खोज करते हैं। सार्वजनिक सहायक `NAC.click`, `NAC.fill`, `NAC.invoke`,
`NAC.describe` आदि सब गहरे रूपों से ही गुज़रते हैं।

#### नमूने और परीक्षण

- `example-v23-shadow-open.php` -- 1, 2 और 3 स्तर घोंसले वाले खुले
  shadow के नमूने।
- `runtime/test/v23-shadow.mjs` T1-T3, T10 -- गहराई की सीमा समेत
  इकाई-कवरेज।

### 5.1.6 shadow DOM में हल करना -- बंद जड़ें, स्वैच्छिक उद्घाटन (v2.3)

बंद shadow जड़ें (`attachShadow({mode:'closed'})`) पुर्ज़ा लिखने वाले के
कोड के बाहर से अपारदर्शी होती हैं -- यह ब्राउज़र की सुरक्षा सीमा है,
NAC3 का फ़ैसला नहीं। जब तक पुर्ज़ा लिखने वाला नीचे दिए अनुबंध से अपनी
मर्ज़ी से एक पूछे जा सकने वाली सतह न खोले, NAC3 भीतर नहीं पहुँच सकता।

#### `el.nac3` का अंतरफलक अनुबंध

कोई कस्टम तत्व `nac3` नाम के एक getter के ज़रिये अपने मेज़बान पर एक
अंतरफलक वस्तु खोल सकता है:

```ts
interface NAC3HostInterface {
  query(selector: string): Element | null;        // MANDATORY
  queryAll(selector: string): Element[];          // RECOMMENDED
  describe?(): Array<{                            // OPTIONAL
    id:    string;
    role:  string;
    action?: string;
    label?: string;
  }>;
}
```

पुर्ज़े उस getter को लागू करके शामिल होते हैं। जो पुर्ज़े शामिल
**नहीं** होते वे NAC3 के बुलाने वालों के लिए अपहुँच बने रहते हैं (उनके
भीतरी हिस्से निजी रहते हैं, जैसा ब्राउज़र चाहता है)।

#### हल करने का अर्थ

`_deepQuery(selector)` के दौरान, हर उस देखे गए तत्व `el` के लिए जिसमें
`el.shadowRoot === null` हो:

1. अगर `typeof el.nac3 === 'object'` है और `el.nac3.query` एक फलन है,
   तो रनटाइम `el.nac3.query(selector)` बुलाता है:
   - लौटा मान एक Element हो -> हल हो गया।
   - लौटा मान `null` हो -> इस shadow में कोई मेल नहीं।
   - लौटा मान कुछ और हो -> `nac:shadow_protocol_violation` भेजें
     (प्रति मेज़बान एक बार) और छोड़ आगे बढ़ें।
   - अपवाद फेंके -> `nac:shadow_blocked` भेजें (कारण
     `'exposure_threw'`, प्रति मेज़बान एक बार) और छोड़ आगे बढ़ें।
2. वरना, अगर `el.hasAttribute('data-nac-shadow') === true` है और गुण का
   मान `'closed'` है और कोई `nac3` अंतरफलक मौजूद नहीं है, तो रनटाइम
   `nac:shadow_blocked` भेजता है (कारण `'not_exposed'`, प्रति मेज़बान एक
   बार)। यह "मैं जान-बूझकर बंद पुर्ज़ा हूँ" वाले छानबीन के संकेत में
   लिखने वाले का शामिल होना है।
3. वरना: उस तत्व को बिना shadow जड़ वाले सामान्य light DOM तत्व की तरह
   बरता जाता है।

#### त्रुटि घटनाओं के detail की शक्ल

`nac:shadow_blocked` का detail:

```ts
{
  host:   Element,     // the closed-shadow host
  reason: 'exposure_threw' | 'not_exposed',
  ts:     number       // Date.now()
}
```

`nac:shadow_protocol_violation` का detail:

```ts
{
  host:           Element,
  message:        string,            // diagnostic message
  value_snapshot: string,            // truncated value preview
  ts:             number
}
```

दोनों घटनाएँ ऊपर उठती हैं (`bubbles: true`) और shadow की सीमाएँ पार
करती हैं (`composed: true`)। दोहराव हटाना प्रति मेज़बान होता है, रनटाइम
के रखे एक WeakSet के ज़रिये; एक ही मेज़बान हर घटना **प्रति पृष्ठ-लोड
ज़्यादा से ज़्यादा एक बार** भेजता है।

#### यह स्वैच्छिक क्यों है

बंद shadow की अपारदर्शिता ब्राउज़र लागू करता है। NAC3 कोई अनिवार्य
तरीका तय भी कर दे, तो ब्राउज़र उसे रोक देगा। स्वैच्छिक उद्घाटन यह पूरा
नियंत्रण पुर्ज़ा लिखने वाले के हाथ में रखता है कि एजेंटों के लिए उसकी
सार्वजनिक सतह कैसी दिखे।

क़ीमत है हर पुर्ज़े का अलग से शामिल होना; फ़ायदा है कि NAC3 के अनुरूप
एजेंट उन डिज़ाइन सिस्टमों के साथ काम करते हैं जिनमें बंद shadow के
पुर्ज़े हैं (Salesforce Lightning, GitHub Primer के कुछ पुर्ज़े,
सुरक्षा के लिहाज़ से नाज़ुक विजेट), और हर पुर्ज़े के लिए अलग अनुकूलक
कोड नहीं लिखना पड़ता।

#### नमूने और परीक्षण

- `example-v23-shadow-closed.php` -- सकारात्मक हालत
  (`<todo-card-closed-exposed>`) और नकारात्मक हालत
  (`<todo-card-closed-blind>`) साथ-साथ, फ़ैसले के पटल + जीवित घटना-लॉग
  के साथ।
- `runtime/test/v23-shadow.mjs` T4-T9 -- त्रुटि घटनाओं के हर परिवार और
  दोहराव हटाने के अर्थ की इकाई-कवरेज।
- `guides/SHADOW_DOM_CLOSED.md` -- लिखने वालों के लिए मार्गदर्शिका।

### 5.1.7 अनुमति को समझने वाली क्षमताएँ (v2.3)

NAC3 v2.3 मैनिफ़ेस्ट को यह घोषित करने देता है कि हर क्रिया के लिए कौन-सी
क्षमताएँ चाहिए, और इसी से `NAC.click` और `NAC.invoke` को भेजने से पहले
रोक देता है। एजेंट को सर्वर पर विफल होने वाली आवाजाही के बजाय तुरंत
इनकार मिलता है (`code='capability_required'`)।

#### मैनिफ़ेस्ट में घोषणा

क्षमता की शर्त तत्व के स्तर पर या क्रिया के स्तर पर लगती है। दोनों हों
तो क्रिया के स्तर की जीतती है।

```js
NAC.register({
  plugin_slug: 'fin',
  version:     '1.0.0',
  nac_version: '2.3',
  elements: [
    // Element-level (covers all verbs on this id).
    { id: 'fin.invoice.delete', role: 'action',
      requires_capability: 'finance.delete_invoice',
      actions: [{ verb: 'delete' }] },

    // Verb-level (more granular).
    { id: 'fin.invoice.edit', role: 'action',
      actions: [
        { verb: 'edit',
          requires_capability: 'finance.edit_invoice' },
        { verb: 'view',
          /* no capability -> always allowed */ }
      ] },

    // Array value: OR semantics.
    // ("at least one of these capabilities matches")
    { id: 'fin.invoice.approve', role: 'action',
      requires_capability: ['finance.approve',
                            'finance.admin'],
      actions: [{ verb: 'approve' }] }
  ]
});
```

"और" वाले अर्थ के लिए ("उपयोगकर्ता को ये सारी क्षमताएँ चाहिए"), हर एक
को अलग-अलग रुकी हुई क्रियाओं से घोषित करें, या मेज़बान की तरफ़
`nac:action:requested` के श्रोता में जोड़कर बनाएँ।

#### सार्वजनिक API

```ts
NAC.setCapabilities(caps: string | string[] | null): void
NAC.grantCapability(cap: string): void
NAC.revokeCapability(cap: string): void
NAC.userCapabilities(): string[]
```

`setCapabilities` पूरे समुच्चय की जगह ले लेता है (लॉगिन या सत्र के
नवीनीकरण पर इसी का उपयोग करें)। `grantCapability` /
`revokeCapability` थोड़ा-थोड़ा बदलते हैं। `userCapabilities` उस समय की
एक झलक का सरणी लौटाता है। `setCapabilities(null)` समुच्चय खाली कर देता
है।

जब भी उपयोगकर्ता की भूमिका बदले, मेज़बान इन्हें बुलाते हैं। समुच्चय
रनटाइम में ही रहता है; किसी मैनिफ़ेस्ट को दोबारा लादने की ज़रूरत नहीं।

#### रोक का अर्थ

भेजने से पहले, `NAC.click(id)` और `NAC.invoke(id, payload)` मेल खाती
मैनिफ़ेस्ट प्रविष्टि (तत्व + क्रिया) देखते हैं,
`requires_capability` पढ़ते हैं, और `_hasCapability` बुलाते हैं:

- कोई शर्त घोषित नहीं -> जाने दें।
- शर्त घोषित है और अभी का समुच्चय उसे पूरा करता है -> जाने दें।
- शर्त घोषित है और अभी का समुच्चय उसे पूरा **नहीं** करता ->
  `NacError('capability_required', ...)` से इनकार करें और
  `detail.reason='capability_required'` के साथ
  `nac:command:rejected` भेजें।

`click` पर यह रोक `not_found` / `disabled` / `hidden` की जाँचों के
**बाद** चलती है, ताकि सबसे ख़ास विफलता ऊपर आए। `invoke` पर रोक अनुरोध की
घटना निकलने से पहले चलती है (मेज़बान अनधिकृत कोशिश कभी नहीं देखता)।

#### यह क्यों मायने रखता है

रोक न हो, तो `NAC.click('finance.delete')` बुलाने वाला एजेंट या तो सफल
हो जाता है (अनुमति की कोई रोक ही नहीं -> सुरक्षा में छेद) या कई सेकंड
बाद सर्वर की तरफ़ 403 के साथ विफल होता है। रोक के साथ, एजेंट को
समकालिक रूप से पता चल जाता है कि उसके पास वह क्षमता नहीं है, और वह ठीक
से प्रतिक्रिया कर सकता है (कोई दूसरा रास्ता माँगे, अधिकार बढ़ाने को कहे,
बंधन उपयोगकर्ता को दिखाए)।

यह सर्वर की तरफ़ की अनुमति-जाँच का पूरक है -- उसकी जगह नहीं लेता।
मेज़बानों के लिए अनुमतियाँ सर्वर पर लागू करते रहना आवश्यक है। क्लाइंट
की रोक अनुभव का सुधार और मंशा के स्तर का संकेत है, सुरक्षा की सीमा
नहीं।

#### नमूने और परीक्षण

- `runtime/test/v23-capabilities.mjs` -- 17 कथन, जो समुच्चय को रखना और
  पढ़ना, देना और छीनना, क्लिक की रोक, invoke की रोक, क्रिया के स्तर और
  तत्व के स्तर के बीच का हल, "या" वाला अर्थ, null से खाली करना, अवैध
  इनपुट का इनकार, और बिना रोक वाली क्रियाओं की वापसी-जाँच ढकते हैं।

### 5.1.2 कड़ी जाँच का झंडा (v2.2; तयशुदा मान v2.3 में पलटा)

`NAC.STRICT_VALIDATION` (बूलियन)। जब यह `true` हो, तो इनमें से किसी भी
हालत में `NAC.register()` एक `Error` फेंकता है जिसमें
`code='strict_validation'` और `findings` का सरणी होता है:

- `manifest_role_unknown` -- प्रविष्टि की भूमिका मानक समुच्चय से बाहर
  है।
- `tab_id_manifest_role_drift` -- id `^tab\.` से मेल खाता है पर भूमिका
  `'tab'` नहीं है।
- `manifest_dom_role_mismatch` -- DOM में लगे तत्व का `data-nac-role`
  मैनिफ़ेस्ट प्रविष्टि की भूमिका से अलग है।

**तयशुदा मान:**

- **v2.2.x:** `false` (सिर्फ़ चेतावनी)। अपनाने वालों को प्रवास की
  मोहलत चाहिए थी।
- **v2.3.x:** **`true`** (फेंकता है)। प्रवास की मोहलत v2.2 की कड़ी के
  साथ बंद हो गई। जिनके मैनिफ़ेस्ट भटकावों से भरे हैं, वे किसी भी
  `register()` से **पहले** `NAC.STRICT_VALIDATION = false` रखकर बाहर
  हो सकते हैं।
- **v3.0:** यह झंडा हटा दिया जाता है (कड़ा ही एकमात्र ढंग है)।

भटकाव के निष्कर्ष साफ़ करने का तरीक़ा
`guides/MIGRATION_v2.2_to_v2.3.md` में देखें।

सारी असमकालिक विधियाँ एक `NacError` से इनकार करती हैं जिसका `code`
इनमें से एक होता है:

- `not_found` -- नाम लिया गया तत्व, भूमिका या क्रिया DOM में नहीं है।
- `invalid` -- तर्क की शक्ल ग़लत है।
- `disabled` -- तत्व पर `disabled` या `aria-disabled='true'` है
  (सिर्फ़ `NAC.click`; v2.3 के तुरंत सुधार के बाद से `NAC.invoke` जाँचता
  नहीं, खंड 5.1.4 देखें)।
- `hidden` -- तत्व परदे से बाहर है, या उस पर `aria-hidden='true'` है,
  या उसका नाप शून्य है।
- `capability_required` -- मैनिफ़ेस्ट ने `requires_capability` घोषित
  किया और `NAC.userCapabilities()` का अभी का समुच्चय उसे पूरा नहीं
  करता (v2.3, खंड 5.1.7 देखें)।
- `timeout` -- असर भेज दिया गया पर अनुरूपता की पहुँच-घटना 5 सेकंड में
  नहीं आई (`invoke` के लिए 30 सेकंड)। **समय बीतना असली विफलता का अर्थ
  रखता है**: हैंडलर अटक गया हो सकता है, पहुँच कभी जोड़ी ही न गई हो, या
  नेटवर्क की दौड़ हो गई हो। जब तक बुलाने वाले के पास किसी और रास्ते से
  असर का सबूत न हो, उसे समय बीतने को विफलता मानना आवश्यक है।

### 5.2 आत्म-निरीक्षण

```ts
NAC.describe():    { active: string|null, plugins: PluginSnap[] }
NAC.describe_v2(): { v2_scope_entries: [...], sitemap: ..., data_tables: [...] }
NAC.manifest(plugin_slug: string): Manifest|null
NAC.validate_global(opts?: {probe?: boolean}): GlobalReport   // named buckets, see 10.1
```

### 5.3 डेटा तालिकाएँ (2.1 से)

डेटा तालिका की बुनियादी इकाइयाँ मुख्य रनटाइम (`js/nac.js` /
`@nac3/runtime` का `nac.mjs`) का हिस्सा **नहीं** हैं। वे ब्राउनफ़ील्ड
विस्तार मॉड्यूल `js/nac-v2-extensions.js` में आती हैं
(`@nac3/runtime/extensions` के रूप में छपा), जो लद जाने के बाद उन्हें
उसी `window.NAC` वस्तु पर जोड़ देता है। `dt_*` सतह पाने के लिए विस्तार
मॉड्यूल को मुख्य रनटाइम के बाद लादें:

```html
<script src="https://yujin.app/nac-spec/js/nac.js"></script>
<script src="https://yujin.app/nac-spec/js/nac-v2-extensions.js"></script>
```

```js
// or with the npm package:
import '@nac3/runtime';
import '@nac3/runtime/extensions';
```

नीचे की विधियाँ सिर्फ़ तब मौजूद होती हैं जब विस्तार मॉड्यूल लदा हो;
सिर्फ़ मुख्य भाग वाले रनटाइम पर उन्हें बुलाने से कुछ नहीं होता /
`undefined` मिलता है।

```ts
NAC.registerDataTable(spec: DataTableSpec): string   // returns table_id
NAC.dt_add_row(table_id, values): {ok, row_id}
NAC.dt_remove_row(table_id, row_id): {ok}
NAC.dt_edit_cell(table_id, row_id, column, value): {ok} | {ok:false, error}
NAC.dt_set_cell(table_id, row, col, value): {ok} | {ok:false, error}
NAC.dt_select(table_id, target): {ok}
NAC.dt_commit(table_id): {ok, final_state} | {ok:false, errors:[...]}
NAC.dt_discard(table_id): {ok}
NAC.dt_state(table_id): TableState
NAC.dt_read_aggregate(table_id, agg_key, column): number|null
NAC.registerDataTableComputed(table_id, column, fn): void
```

हर डेटा तालिका का एक `subkind` होता है:

- `collection` -- क्रम वाली पंक्तियाँ, वैकल्पिक लेन-देनी पक्की करने के
  साथ। बीजक की पंक्तियों, टोकरी की चीज़ों, लॉग की प्रविष्टियों के लिए।
- `matrix` -- पंक्ति x स्तंभ की जाली जिसमें हर ख़ाना एक मान रखता है।
  अनुमति की सारणियों, समय-सारणियों के लिए।
- `matrix-singletree` -- वह सारणी जिसमें हर पंक्ति एक पेड़ में सिमट
  जाती है (कम मिलती है)।

---

### 5.4 कड़ा हल + अस्पष्टता मिटाना (v2.4)

NAC3 v2.4 id, क्रिया, विशेषक और लेबल के हल को **कड़ा** बना देता है। वे
क्रियाएँ जो किसी अनुरोध को DOM के एक ही तत्व पर हल करती हैं --
`click_by_verb`, `tab` (एक तर्क वाला रूप) और `tab_by_label` -- अब
अंदाज़ा नहीं लगातीं। जब कोई अनुरोध शून्य उम्मीदवारों पर या एक से ज़्यादा
पर हल होता है, तो रनटाइम उम्मीदवारों की सूची लिए हुए एक `NacError`
फेंकता है और `nac:disambiguation_requested` घटना भी भेजता है, पहले
मिलते-जुलते पर चुपचाप भेजने के बजाय।

यही **शून्य चुप नुक़सान** वाला अचर है। यह सहायक सॉफ़्टवेयर और एजेंट
बुलाने वालों के लिए है, जहाँ बिना उबरने के रास्ते ग़लत तत्व पर चुपचाप
भेज देना सुरक्षा की दीवार बन जाता है। 2.4 से पहले का ढीला व्यवहार --
उपपाठ पर `indexOf` का सहारा, जो पहले मिलते-जुलते पर हल कर देता था --
हटा दिया गया है।

> पुराने के साथ निभाव: v2.4 *अनुबंध के व्यवहार* का बदलाव है। जो कोड के
> रास्ते पहले से बिना अस्पष्टता तर्क देते थे, वे वैसे ही चलते रहते हैं।
> जो रास्ते पहले मिलते-जुलते पर हल करने के लिए ढीले `indexOf` के सहारे
> पर टिके थे, वे अब अपवाद फेंकेंगे -- यह जान-बूझकर है।

#### 5.4.1 विशेषक का कड़ा मेल (`click_by_verb`)

`click_by_verb(plugin, verb, opts?)` उन DOM नोडों में से चुनता है जो
`data-nac-action="<verb>"` साझा करते हैं। जब `opts.qualifier` (एक
स्ट्रिंग) दिया जाए, तो कोई तत्व **सिर्फ़ तब** मेल खाता है जब उसका
`data-nac-id` यह पूरा करे:

```js
id === qualifier || id.endsWith('__' + qualifier)
```

अर्थात: id पूरी तरह बराबर हो, या विभाजक `__` के बाद लंगर डाला हुआ
प्रत्यय हो। **उपपाठ का कोई सहारा नहीं है।** जो विशेषक किसी id का बस एक
उपपाठ है (बराबर नहीं, लंगर डाला `__suffix` भी नहीं) वह मेल **नहीं**
खाता।

- 0 मेल -> `NacError('no_matching_instance', ...)` फेंकता है।
- ठीक 1 मेल -> हल करता है और दबाता है।
- 1 से ज़्यादा मेल -> `NacError('ambiguous_qualifier', ...)` फेंकता है।

`opts.qualifier_ordinal` (एक संख्या) विशेषक के मेल को छोड़कर, उस क्रिया
को साझा करने वाले सारे DOM तत्वों में से जगह के हिसाब से चुनता है।

#### 5.4.2 id का कड़ा हल (`tab`)

`tab(plugin, id)` का एक तर्क वाला रूप: DOM में `data-nac-id` का पूरा
मेल जीतता है। वरना रनटाइम उन इंस्टैंसों को खोजता है जिनका id
`id + "__"` से शुरू होता है:

- 0 विशेषित इंस्टैंस और कोई पूरा मेल खाता id भी नहीं ->
  `no_matching_instance`।
- ठीक 1 -> हल हो जाता है।
- 1 से ज़्यादा -> `ambiguous_tab` (पूरा विशेषित id दें)।

#### 5.4.3 लेबल का कड़ा हल (`tab_by_label`)

`tab_by_label(plugin, label)` इंसान के पढ़ने लायक़ लेबल को किसी टैब पर
हल करता है, और इस क्रम में कोशिश करता है: मैनिफ़ेस्ट के लेबल से पूरा
मेल, मैनिफ़ेस्ट में धुँधला / उपपाठ मेल, DOM के पाठ से पूरा मेल, DOM के
पाठ से धुँधला मेल। किसी भी सतह पर एक से ज़्यादा मेल मिले तो यह
`NacError('ambiguous_label', ...)` फेंकता है; कोई सतह मेल न खाए तो
`NacError('not_found', ...)` फेंकता है। भेजी गई घटना का `reason` खाना
दर्ज करता है कि कौन-सी सतह अस्पष्ट थी (`ambiguous_label_exact`,
`ambiguous_label_fuzzy`, `ambiguous_label_exact_dom`,
`ambiguous_label_fuzzy_dom`, या `no_matching_label`)।

#### 5.4.4 त्रुटि के कोड

| `err.code` | कौन फेंकता है | अर्थ |
|------------|-----------|---------|
| `no_matching_instance` | `click_by_verb` (विशेषक), `tab` | कोई तत्व उस विशेषक / id से मेल नहीं खाता |
| `ambiguous_qualifier`  | `click_by_verb` | 1 से ज़्यादा तत्व उस विशेषक से मेल खाते हैं |
| `ambiguous_tab`        | `tab`           | 1 से ज़्यादा विशेषित `id__` इंस्टैंस मेल खाते हैं |
| `ambiguous_label`      | `tab_by_label`  | 1 से ज़्यादा टैब उस लेबल से मेल खाते हैं (किसी भी सतह पर) |
| `not_found`            | `tab_by_label`  | कोई भी टैब उस लेबल से मेल नहीं खाता |

#### 5.4.5 `err.candidates` की शक्ल

अस्पष्टता की हर त्रुटि अपने साथ `candidates` का सरणी लाती है। हर
उम्मीदवार ठीक यह होता है:

```ts
{ nac_id: string, label: string }
```

`nac_id` उस तत्व का `data-nac-id` है। `label` इस तरह हल होता है: पहले
`aria-label`, फिर कटा-छँटा `textContent` (120 अक्षरों पर काटा हुआ), और
आख़िर में `data-nac-id` पर उतर जाना। यह सूची DOM के विरुद्ध जाँची हुई
है -- यह उन असली तत्वों के नाम देती है जिनमें से बुलाने वाला चुन सकता
है। `NacError` `candidates` को फेंके गए `Error` में मिला देता है, इसलिए
`err.code`, `err.message` और `err.candidates` तीनों भरे होते हैं।

#### 5.4.6 `nac:disambiguation_requested` घटना

जब भी कड़े हल वाला कोई बुलावा विफल होता है (कोई मेल नहीं, या बहुत
ज़्यादा मेल), रनटाइम अपवाद फेंकने के *अलावा* `document` पर एक
`nac:disambiguation_requested` नाम का `CustomEvent` भी भेजता है। यह
भेजना यथासंभव है: भेजना विफल हो जाए तो भी रनटाइम फेंकता ही है।

```ts
document.addEventListener('nac:disambiguation_requested', (e) => {
  e.detail; /* {
    method:     'click_by_verb' | 'tab' | 'tab_by_label',
    plugin:     string | null,
    query:      { verb?, qualifier?, label?, id? },
    reason:     string,   // finer-grained than err.code (see 5.4.3)
    candidates: Array<{ nac_id: string, label: string }>,
  } */
});
```

#### 5.4.7 बुलाने वाला अस्पष्टता कैसे मिटाता है

उम्मीदवारों की सूची हाथ में आने पर (`err.candidates` से या
`event.detail.candidates` से), बुलाने वाला एक चुनता है और इनमें से किसी
भी तरीक़े से दोबारा भेजता है:

1. **पूरा `nac_id`** -- `NAC.click(candidate.nac_id)`। यही उबरने का
   मानक रास्ता है: उम्मीदवार पहले से ही सही id लिए हुए है।
2. **लंगर डाला `__suffix`** -- उस इंस्टैंस का सही प्रत्यय विशेषक के
   रूप में `click_by_verb` को दें।
3. **`opts.qualifier_ordinal`** -- उस क्रिया को साझा करने वाले तत्वों
   में से जगह के हिसाब से चुनाव (DOM के क्रम में)।

पूरा चलाया हुआ संदर्भ `example-v24-disambiguation.php` है; अनुबंध को
`runtime/test/stage2-disambiguation.mjs` और
`runtime/test/stage7-strict-resolution.mjs` ढकते हैं।

---

## 6. घटनाएँ

हर क्रिया पूरा होने की एक निश्चित घटना भेजती है। रनटाइम का
`NAC.click()` उस घटना की राह देखता है और जब वह निकलती है तब हल हो जाता
है।

| भूमिका | सफलता की घटना | विफलता की घटना |
|------|---------------|---------------|
| `action` | `nac:action:succeeded` | `nac:action:failed` |
| `field` | `nac:field:changed` | -- |
| `option` | `nac:field:changed` | -- |
| `tab` | `nac:tab:activated` | -- |
| `breadcrumb-item` | `nac:breadcrumb:navigated` | -- |
| `accordion-toggle` | `nac:accordion:expanded` / `:collapsed` | -- |
| `step` | `nac:step:advanced` | -- |
| `pagination-item` | `nac:table:page_changed` | -- |
| `confirm-button` | `nac:confirm:resolved` / `:cancelled` | -- |
| `sort-control` | `nac:table:sort_changed` | -- |
| `filter-control` | `nac:table:filter_changed` | -- |

### 6.1 घटना के detail की शक्ल

हर घटना का detail मानक id खाने के साथ-साथ `plugin` भी लाता है:

```js
nac:action:succeeded {
  detail: { plugin: 'invoice', action_id: 'invoice.save', ... }
}
nac:tab:activated {
  detail: { plugin: 'invoice_edit_modal', tab_id: 'tab.lines', ... }
}
nac:field:changed {
  detail: { plugin: 'invoice', field_id: 'field.client_name',
            value: 'Acme Corp', ... }
}
```

### 6.2 मेज़बान के हैंडलर से भेजना

क्लिक के हैंडलर के लिए अपने समकालिक असर के बाद उससे मेल खाती सफलता की
घटना भेजना आवश्यक है:

```js
button.addEventListener('click', function (ev) {
  // ... do the work ...
  document.dispatchEvent(new CustomEvent('nac:action:succeeded', {
    detail: { plugin: 'invoice', action_id: 'invoice.save' }
  }));
});
```

काम असमकालिक हो तो हल होने के बाद भेजें। काम विफल हो तो
`nac:action:failed` भेजें, `{detail: {plugin, action_id,
error: <message>}}` के साथ।

v2.2 का रनटाइम `NAC.bindAction(el, handler, ctx)` देगा, जो
`addEventListener` को लपेटकर अपने आप भेजेगा।

### 6.3 ख़ुद क्लिक की घटना क्यों न लें?

DOM की `click` घटना हैंडलर चलने से पहले निकल जाती है। NAC3 के अनुबंध को
यह जानना होता है कि **असर कब पूरा हुआ**, न कि क्लिक कब शुरू हुआ। इसी
वजह से घटनाओं का अलग परिवार है।

---

## 7. उद्गम

### 7.1 isTrusted

`event.isTrusted` उन क्लिकों पर `true` होता है जो किसी व्यक्ति ने शुरू
किए (असली माउस, असली कुंजी, स्क्रीन रीडर से चालू करना), और गढ़े गए
क्लिकों पर `false` (`element.click()`, हाथ से बनाए MouseEvent का
dispatchEvent, स्वचालन)।

NAC3 के लिए इसे सफलता की घटना में `event.detail.is_trusted` से बाहर
दिखाना आवश्यक है। सुरक्षा के लिहाज़ से नाज़ुक काम (भुगतान, मिटाना) करने
वाले मेज़बान `is_trusted === true` माँग सकते हैं और गढ़े गए क्लिकों से
मना कर सकते हैं। संदर्भ नमूना `example-v20-full.php` में बटनों की एक
जोड़ी है (`v20_panel.istrusted_real` और `v20_panel.istrusted_fake`) जो
यह फ़र्क़ दिखाती है।

### 7.2 HMAC से हस्ताक्षरित मैनिफ़ेस्ट

कोई मैनिफ़ेस्ट `provenance` का खंड रख सकता है:

```js
NAC.set_provenance_secret('your-tenant-secret');
NAC.register({
  plugin_slug: 'invoice',
  ...,
  provenance: {
    signed_at: '2026-05-09T10:00:00Z',
    signed_by: 'tenant-X',
    signature: '<HMAC-SHA256 of manifest body>'
  }
});
```

रनटाइम मैनिफ़ेस्ट के एक स्थिर क्रमांकन पर (हस्ताक्षर को छोड़कर) अपेक्षित
HMAC गिनता है और उन मैनिफ़ेस्टों को ठुकरा देता है जिनका हस्ताक्षर मेल
नहीं खाता। बहु-किरायेदार तैनातियाँ इसका उपयोग यह रोकने के लिए करती हैं
कि एक किरायेदार दूसरे का मैनिफ़ेस्ट न बना ले।

### 7.3 ख़तरे का ख़ाका

पूरा ख़तरे का ख़ाका `SECURITY.md` में देखें। छोटा रूप:

- NAC3 **उपयोगकर्ता** को प्रमाणित नहीं करता। वह आपकी प्रमाणन परत का
  काम है।
- NAC3 **मैनिफ़ेस्ट** को प्रमाणित करता है (HMAC)।
- NAC3 असली क्लिकों को गढ़े गए क्लिकों से अलग पहचानता है (isTrusted),
  ताकि मेज़बान नाज़ुक क्रियाओं पर दूसरों से मना कर सके।
- NAC3 उस दुर्भावी एजेंट से नहीं बचाता जो उपयोगकर्ता की ही पहुँच से चल
  रहा हो। ऐसा एजेंट वह सब कर सकता है जो उपयोगकर्ता कर सकता है।

---

## 8. अनुरूपता की सतहें

सतह इस तरह लिखी जाती है: **NAC3 Conformance Level 1**, **2** या
**3**। सतह का नाम प्रोटोकॉल का नाम नहीं है: किसी जाँचक, किसी रिपोर्ट या
किसी अनुरूपता-दावे के लिए सतह का हवाला उस पहचानक से देना आवश्यक है जो
`api/latest/levels.json` में छपा है, यानी
`nac3-conformance-level-<1|2|3>`, कभी किसी दिखाए जाने वाले नाम से नहीं।
खंड 8.1 उन नामों को दर्ज करता है जो ये सतहें 2.5.0 से पहले रखती थीं।

कोई पृष्ठ **NAC3 Conformance Level 1** पर है, अगर:

- हर वह दबाने योग्य विजेट जिसे एजेंट चला पाना चाहिए, `data-nac-id` और
  `data-nac-role` रखता है।
- हर `data-nac-role="action"` तत्व अपने असर के बाद
  `nac:action:succeeded` भेजता है।
- पृष्ठ `NAC.register()` से कम से कम एक प्लगिन मैनिफ़ेस्ट पंजीकृत करता
  है।
- हर घोषित id के लिए `NAC.click(id)` काम करता है।

कोई पृष्ठ **NAC3 Conformance Level 2** पर है, अगर वह इसके अलावा:

- अपने मैनिफ़ेस्ट में `tabs[]`, `fields[]`, `actions[]` सरणियाँ स्पष्ट
  रूप से पंजीकृत करे (DOM से अनुमान लगाकर नहीं)।
- उपयोगकर्ता को दिखने वाले हर लेबल के लिए NAC3 की सभी 10 लोकेल ढकने
  वाला `label_i18n` दे।
- v2.0 की ब्राउनफ़ील्ड इकाइयाँ लागू करे: दायरे का पेड़, क्षणिक पकड़,
  autoRegister.watch।
- `NAC.validate_global({probe: false})` को `error` गंभीरता के शून्य
  निष्कर्षों के साथ पास करे।

कोई पृष्ठ **NAC3 Conformance Level 3** पर है, अगर वह इसके अलावा:

- HMAC से हस्ताक्षरित मैनिफ़ेस्ट रखे।
- सुरक्षा के लिहाज़ से नाज़ुक क्रियाओं पर `isTrusted` का फ़र्क़ करे।
- `NAC.validate_global({probe: true})` को शून्य निष्कर्षों के साथ पास
  करे।

NPM पैकेज की कमांड लाइन (`npx nac3 validate <url>`) बताती है कि पृष्ठ
सबसे ऊँची कौन-सी सतह तक पहुँचता है। (पैकेज `nac3` और `nac` दोनों
निष्पादनीय नाम देता है; दोनों उसी कमांड लाइन पर जाते हैं।)

### 8.1 सतहों के ऐतिहासिक नाम (v2.5)

2.5.0 से पहले तीनों सतहें `NAC-1`, `NAC-2` और `NAC-3` लिखी जाती थीं। वे
नाम प्रोटोकॉल के नाम `NAC3` से बस एक डैश की दूरी पर हैं, इसलिए "यह
पृष्ठ NAC-3 के अनुरूप है" और "यह पृष्ठ NAC3 लागू करता है" में फ़र्क़
नहीं किया जा सकता था, और जिस एजेंट से सतह बताने को कहा जाता, उसके पास
बताने के लिए कोई बे-अस्पष्ट स्ट्रिंग ही नहीं थी।

पुराने नाम ऐतिहासिक उपनामों के रूप में पढ़े जा सकते रहते हैं:
`api/latest/levels.json` हर एक को उस सतह के बगल में
`legacy_display_name` के रूप में छापता है जिसकी वह थी, ताकि 2.5.0 से
पहले लिखा दस्तावेज़ भी किसी सतह से जोड़ा जा सके। वे मानक **नहीं** हैं।
नया पाठ, जाँचकों का उत्पादन और अनुरूपता के दावे सतह की संख्या या छपा
पहचानक ही इस्तेमाल करते हैं।

---

## 9. संस्करण-क्रम

NAC3 semver का पालन करता है:

- **बड़ी** छलाँग: सार्वजनिक API या तार के स्वरूपों में तोड़ने वाला
  बदलाव। अपनाने वालों को कोड बदलना पड़ता है।
- **छोटी** छलाँग: नई सुविधाएँ, पुराने के साथ निभाव। पुराना कोड चलता
  रहता है।
- **पैच** छलाँग: ख़ामियों का सुधार, सिर्फ़ दस्तावेज़ के बदलाव।

त्याग की नीति: जिस सुविधा को संस्करण `X.Y.0` में `@deprecated` लिखा गया
हो, उसे `(X+1).0.0` से पहले नहीं हटाया जाता। रिलीज़ के नोट हर हटाने को
साफ़-साफ़ दर्ज करते हैं।

NPM पैकेज का संस्करण विशिष्टि के संस्करण का आईना है:
`@nac3/runtime@X.Y.Z` NAC3 vX.Y लागू करता है, उसके ऊपर Z पैच संशोधनों
के साथ। यह उदाहरण जान-बूझकर प्लेसहोल्डरों से लिखा गया है -- इस वाक्य
में कोई ठोस संस्करण अगली रिलीज़ में पुराना पड़ जाता है, और यह दस्तावेज़
सचमुच `2.1.3` को पैकेज के आगे बढ़ जाने के बाद भी बहुत समय तक ढोता रहा।

### 9.1 प्री-रिलीज़ और dist-tag

प्री-रिलीज़ की पूँछ वाला संस्करण (`-alpha.N`, `-beta.N`, `-rc.N`) इस
विशिष्टि की रिलीज़ **नहीं** है। वह इसलिए होता है कि किसी बदलाव को वादा
बनने से पहले आज़माया जा सके।

- **`latest` कभी भी किसी स्थिर संस्करण की ही ओर इशारा करता है।** बिना
  टैग वाला `npm install @nac3/runtime` ऐसे संस्करण पर हल होना आवश्यक
  है जिसमें प्री-रिलीज़ की पूँछ न हो। जो अपनाने वाला तयशुदा चीज़ लगाता
  है, उसे ग़लती से कभी प्री-रिलीज़ नहीं मिलती।
- **प्री-रिलीज़ अपने ही dist-tag के नीचे छपती हैं** (`alpha`, `beta`,
  `rc`)। उसमें शामिल होना स्पष्ट है: `npm install
  @nac3/runtime@alpha`।
- **प्री-रिलीज़ में कुछ भी वादा नहीं है।** उसमें आई कोई भी सतह उस स्थिर
  संस्करण से पहले बदल या मिट सकती है जो उसे लाएगा। खंड 10 की स्थिरता की
  गारंटियाँ और खंड 12 की निष्कर्ष-कोड की गारंटियाँ स्थिर संस्करण से
  शुरू होती हैं।
- **प्री-रिलीज़ कभी वापस नहीं ली जातीं** और पिछली तारीख़ से `latest` पर
  फिर से नहीं लगाई जातीं। क्या छपा था, उसका ब्यौरा पढ़ा जा सकने योग्य
  बना रहता है।

संदर्भ रनटाइम का अधिकृत संस्करण `js/nac.js` में रखा स्थिरांक
`NAC.version` है, और उसे डेटा के रूप में भी छापा जाता है:
`api/latest.json` में `stable` और `prerelease` के अलग-अलग इशारे होते
हैं (दोनों में से कोई भी `null` हो सकता है), और हर छपा उत्पाद अपना
`channel` खाना रखता है। जिस उपभोक्ता को स्थिर अनुबंध चाहिए वह एक खाना
पढ़कर मना कर सकता है -- न कोई संस्करण-स्ट्रिंग चीरनी पड़ती है, न किसी
टैग पर भरोसा करना पड़ता है।

---

## 10. जाँचक

### 10.1 रनटाइम: `NAC.validate_global()`

यह जीवित DOM और पंजीकृत मैनिफ़ेस्टों पर चलता है और **नाम दिए गए
समूहों की एक वस्तु** लौटाता है -- हर शर्त के लिए एक समूह, और हर समूह
निष्कर्षों का सरणी। 2.5.0 से हर समूह का हर निष्कर्ष `code` और
`severity` रखता है, इसलिए CI का जोड़ कोई संदेश चीरने के बजाय किसी कोड
पर रोक लगा सकता है:

```ts
{
  ok:         boolean,       // false when any error-severity finding exists
  has_errors: boolean,
  duplicates: [{ code: 'nac_id_duplicate_across_plugins',
                 severity: 'error', nac_id, plugins: string[] }],
  orphans:    [{ code: 'nac_id_orphan_in_dom',
                 severity: 'warn', nac_id, in_dom, in_manifest,
                 plugin_root }],
  unmounted:  [{ code: 'nac_id_declared_not_mounted',
                 severity: 'warn', nac_id, in_manifest, in_dom,
                 plugin }],
  convention_violations:
              [{ code: 'nac_id_missing_plugin_prefix',
                 severity: 'warn', nac_id, plugin, hint }],
  plugin_instance_violations:
              [{ code: 'duplicate_plugin_no_instance_id',
                 severity: 'error', slug, instance_count, ... }],
  tolerated:  [{ kind, nac_id, until, original }],
  plugin_count: number,
  total_ids:    number,
  timestamp:    number
}
```

वे पाँच कोड, उनकी गंभीरता और हर एक के साथ क्या करना है, यह सब
`api/latest/findings.json` में `global_buckets` के नीचे डेटा के रूप में
छपा है। निष्कर्षों के कोड पैच रिलीज़ों के बीच स्थिर रहते हैं; नए कोड
सिर्फ़ छोटी छलाँगों में आते हैं, और कोई कोड किसी दूसरी शर्त के लिए कभी
दोबारा इस्तेमाल नहीं होता (खंड 12, वादा 4)।

**2.5.0 से पहले के संस्करण इन समूहों पर कोई कोड नहीं लगाते थे**, और यह
खंड निष्कर्षों के एक सपाट सरणी का वर्णन करता था जो संदर्भ रनटाइम ने
कभी लौटाया ही नहीं (ऑडिट N-14, N-34)।

**2.5.0 में व्यवहार का बदलाव (ऑडिट N-33)।** 2.5.0 से पहले इस जाँचक के
पीछे का संग्राहक मैनिफ़ेस्ट के सिर्फ़ पुराने समूह पढ़ता था (`actions`,
`fields`, `tabs`, `kpis`, `charts`, कुंजी `nac_id` के साथ) और खंड 4 की
मानक शक्ल `elements: [{ id }]` कभी नहीं। इसलिए जैसा दस्तावेज़ कहता है,
उस तरह लिखे मैनिफ़ेस्ट के सामने वह `total_ids: 0` बताता था, हर घोषित
तत्व को अनाथ गिनाता था, किसी दोहराव, बिन-लगे id या रिवाज़ के उल्लंघन की
ख़बर ही नहीं दे पाता था, और फिर भी `ok: true` कहता था। 2.5.0 से दोनों
शक्लें पढ़ी जाती हैं। जिस मेज़बान ने अपनी CI को `has_errors` पर रोका
हुआ था, उसे उन्नयन के बाद पहली विफलता दिख सकती है: वह एक सच्चा
निष्कर्ष है जो हमेशा वहीं था, कोई नया नियम नहीं।

### 10.2 कमांड लाइन: `npx nac3 validate <target>`

यह `validate_global` को लपेटता है और उसके ऊपर HTML तथा मैनिफ़ेस्ट के
मेल की एक स्थिर जाँच जोड़ता है। बाहर निकलने के कोड:

- `0` -- तय की गई सीमा से ऊपर की गंभीरता का कोई निष्कर्ष नहीं।
- `1` -- निष्कर्ष हैं।
- `2` -- लक्ष्य ख़ुद लद नहीं पाया।

CI में काम का: `npx nac3 validate ./dist/index.html --severity=error`।
पैकेज इस कमांड लाइन को दो निष्पादनीय नामों से देता है, `nac3` और `nac`;
जो आपके PATH में किसी और औज़ार से न टकराए, वही इस्तेमाल करें।

---

## 11. NAC3 के इर्द-गिर्द की प्रणाली

NAC3 एक अनुबंध की परत है। NAC3 के अनुरूप किसी पृष्ठ को आवाज़ से चलने
वाला ऐप बनाने के लिए आपको यह भी चाहिए:

1. **आवाज़ से पाठ बनाने का स्रोत** (ब्राउज़र का SpeechRecognition,
   Whisper का API आदि)।
2. **एक LLM मध्यस्थ** जो उपयोगकर्ता का पाठ + पृष्ठ की
   `NAC.describe()` झलक + i18n का इशारा लेकर ढाँचेदार क्रियाएँ भेजे:
   `[{kind: 'click', nac_id: 'X'}, {kind: 'fill', nac_id: 'Y',
   value: 'Z'}]`। `guides/LLM_WIRING.md` देखें।
3. **एक चैट क्लाइंट** जो बातचीत सँभाले और क्रियाएँ भेजे। संदर्भ
   `js/nac-chat-client.js` है।
4. **पाठ से आवाज़ बनाने का ठिकाना** बोले गए जवाबों के लिए (ब्राउज़र का
   SpeechSynthesis, ElevenLabs आदि)।

NAC3 सिर्फ़ चरण 2 के आने-जाने की शक्ल को मानक बनाता है
(`NAC.describe()` की झलक + क्रियाओं की शक्ल)। चरण 1, 3 और 4 विशिष्टि
से बाहर हैं; आप जो चाहें जोड़ें।

---

## 12. स्थिरता की गारंटियाँ

यह विशिष्टि जिसका वादा करती है:

1. खंड 1 की मानक भूमिकाओं का समुच्चय सिकुड़ेगा नहीं। छोटे संस्करणों में
   नई भूमिकाएँ जोड़ी जा सकती हैं।
2. खंड 6 का घटना-परिवार नाम नहीं बदलेगा। छोटे संस्करणों में नई घटनाएँ
   जोड़ी जा सकती हैं।
3. `NAC.click`, `NAC.fill` आदि की क्रियाएँ छोटे संस्करणों में शक्ल
   नहीं बदलेंगी। `opts` में नए वैकल्पिक खाने आ सकते हैं।
4. `validate_global` के निष्कर्ष-कोड छोटे संस्करणों के बीच किसी और शर्त
   के लिए दोबारा इस्तेमाल नहीं होंगे। 2.5.0 से उस जाँचक का हर समूह एक
   कोड रखता है, और सब अपनी गंभीरता के साथ
   `api/latest/findings.json` पर छपते हैं: दो छपे संस्करणों की तुलना
   करें और दोबारा इस्तेमाल हुआ कोई कोड किसी स्रोत को पढ़े बिना दिख
   जाएगा।

यह विशिष्टि जिसका वादा **नहीं** करती:

1. त्रुटि संदेशों के ठीक शब्द (वे i18n सूची की स्ट्रिंग हैं; स्थानीय
   रूप खिसक सकते हैं)।
2. तत्व खोजने की DOM रणनीति (आज `querySelector`; आगे किसी तेज़ सूची पर
   जा सकती है)।
3. मैनिफ़ेस्ट के भीतरी संचय की बनावट। मैनिफ़ेस्ट को मेज़बान की तरफ़ से
   सिर्फ़ लिखने योग्य और एजेंट की तरफ़ से सिर्फ़ पढ़ने योग्य मानें।

---

## 13. खुले प्रश्न

ये **यहीं**, इसी खंड में दर्ज होते हैं। एक पुराने संशोधन ने इसका
शीर्षक "खुले प्रश्न (अलग से दर्ज)" रखा था और कभी नहीं बताया कि वह "अलग
से" कहाँ है; कोई और बही ही नहीं थी। जो प्रश्न किसी फ़ैसले तक पहुँच जाता
है, वह नीचे की सारणी छोड़कर उस खंड में चला जाता है जिस पर उसका असर है।
जो प्रश्न ठोस प्रस्ताव बन जाता है उसे एक RFC मिलता है, और वे
[`rfcs/README.md`](rfcs/README.md) में सूचीबद्ध हैं, और प्रक्रिया
[`CONTRIBUTING.md`](CONTRIBUTING.md) में है।

हर पंक्ति वह संस्करण लिए हुए है जिसमें उसे आख़िरी बार आँका गया, ताकि
पढ़ने वाला जीवित प्रश्न को छोड़ दिए गए प्रश्न से अलग पहचान सके। **कोई
पंक्ति कोई लक्ष्य संस्करण नहीं लिए हुए है**: तारीख़ वाला वादा जो अपनी
तारीख़ पार कर जाए, बिना तारीख़ वाले वादे से बुरा होता है -- और यही ग़लती
खंड 5 `payload_schema` के बारे में करता था।

| प्रश्न | स्थिति | आख़िरी आँकलन | अभी कहाँ खड़ा है |
|----------|-------|---------------|-----------------|
| क्या `data-nac-role="navigation"` को कभी किसी टैब पर हल होना चाहिए? | **फ़ैसला: नहीं** | v2.5 | 2.2.0 में तय हुआ और तब से लागू है: `tab.` उपसर्ग वाला id जिसकी भूमिका `navigation` हो, `tab_id_manifest_role_drift` उठाता है, और `STRICT_VALIDATION` (2.3.0 से तयशुदा `true`) के साथ `NAC.register` फेंकता है। `tab_by_label` टैब सिर्फ़ `m.tabs[]` और `elements[role=='tab']` से हल करता है। `navigation` पहचान-बिंदु का क्षेत्र है, बदला जा सकने वाला पैनल कभी नहीं। खंड 1 और 10 देखें। |
| क्या `NAC.click()` को सापेक्ष id स्वीकार करने चाहिए (उदाहरण के लिए `'./save'`)? | **खुला, लागू नहीं** | v2.5 | हल करने वाला `data-nac-id` का पूरा मेल देखता है और प्लगिन से दायरा बाँधता है -- चालू प्लगिन, या `opts.plugin` वाला। वह बाँधना उस हालत को पहले से ढक लेता है जिसके लिए यह प्रश्न पूछा गया था (`NAC.click('save', {plugin:'invoice'})`), इसलिए सापेक्ष लिखावट का दबाव कम है और कुछ चल भी नहीं रहा। इसे तय करने का मतलब होगा खंड 2 में रास्तों का व्याकरण जोड़ना -- उसी खंड में जहाँ id को रनटाइम के लिए अपारदर्शी घोषित किया गया है। |
| क्या मैनिफ़ेस्टों को प्लगिनों के आर-पार विरासत / विस्तार का साथ देना चाहिए (एक आधार मैनिफ़ेस्ट जिसे कोई किरायेदार बढ़ाए)? | **खुला, अगली बड़ी छलाँग का उम्मीदवार** | v2.5 | लागू नहीं। **खंड 15 से न उलझाएँ**: वह "प्लगिन विस्तार का अनुबंध" v2.5 में आ गया और वह backend तक रास्ता दिखाने की व्यवस्था है (`registerPlugin` / `call` / `read` / `subscribe`), मैनिफ़ेस्ट की विरासत नहीं। यहाँ का प्रश्न यह है कि एक मैनिफ़ेस्ट दूसरे से निकले, जो खंड 2 के id की अनन्यता के नियमों को छूता है, और इसी वजह से यह बड़ी छलाँग तक रोका गया है। |
| क्या `payload_schema` को लागू करना औपचारिक और चालू कर देना चाहिए? | **खुला, बिना तारीख़** | v2.5 | खंड 5 से यहाँ लाया गया, जहाँ इसका वादा v2.4 के लिए था। वह v2.4 में नहीं उतरा और v2.5 तक भी नहीं उतरा; संदर्भ रनटाइम वह खाना पढ़ता ही नहीं। आज ठीक-ठीक क्या जाँचा जाता है और क्या नहीं, इसके लिए खंड 5 देखें। |
| क्या `validate_global()` के निष्कर्षों को छपी सूची का कोड लिए होना चाहिए? | **फ़ैसला: हाँ, 2.5.0 में आया** | v2.5 | हर समूह की हर चीज़ `code` + `severity` लिए हुए है, इसलिए खंड 12 का वादा 4 अब ख़ाली समुच्चय के बजाय एक असली समुच्चय ढकता है। वे पाँच कोड `api/latest/findings.json` में `global_buckets` के नीचे छपे हैं, और जनक उन्हें हाथ से लिखने के बजाय एक ऐसे परीक्षण-नमूने से **पढ़ता** है जो हर समूह को उठाता है: पिछला संस्करण एक ऐसे समूह के लिए `code: null` लिखता था जो 2.5.0 से कोड रखता था, और दोनों दावे उसी फ़ाइल में छापता था। वह नमूना बनाना ही वह काम भी है जिसने ऑडिट N-33 पकड़ा: जाँचक मानक शक्ल में लिखे मैनिफ़ेस्ट को देख ही नहीं पाता था। 10.1 देखें। |

---

## 13.5 संचालन

अभी NAC3 की देखरेख Yujin करता है। विशिष्टि, दस्तावेज़ और संदर्भ रनटाइम
सब Apache-2.0 के नीचे छपते हैं। (2.5 से पहले, दो भंडारों के ज़माने में,
रनटाइम पर MIT लिखा था; 2026-05-23 के समेकन में उसे NAC3 के सारे
उत्पादों पर Apache-2.0 के साथ एक कर दिया गया। `LICENSE` और
`runtime/LICENSE` देखें।) Yujin वादा करता है कि जब अपनाव इतना हो जाए कि
तटस्थ संचालन का औचित्य बने, तब NAC3 को किसी तटस्थ संस्था (W3C का
समुदाय समूह, Linux Foundation, या उसके बराबर कोई उद्योग-निकाय) को सौंप
देगा। तब तक विशिष्टि के बदलाव `CONTRIBUTING.md` में दर्ज RFC प्रक्रिया
का पालन करते हैं, और सार्वजनिक API या तार के स्वरूपों पर असर डालने वाले
किसी भी बदलाव के लिए कम से कम 14 दिन की सार्वजनिक टिप्पणी की अवधि होती
है।

अपनाने वालों के लिए: Apache-2.0 के नीचे एक जैसा लाइसेंस यह गारंटी देता
है कि Yujin की कंपनी की हालत कैसे भी बदले, विशिष्टि और रनटाइम बचे
रहेंगे। आप दोनों में से किसी को भी शाखा में ले सकते हैं, चला सकते हैं और
छाप सकते हैं -- आज भी, और हमारे न रहने के बाद भी। यह दस्तावेज़ उस वादे
को दर्ज करता है, ताकि उस बचे रहने तक का रास्ता कहा हुआ हो, मान लिया हुआ
नहीं।

---

## 14. संदर्भ कार्यान्वयन

मानक कार्यान्वयन वही संदर्भ रनटाइम है जो NPM पैकेज `@nac3/runtime` के
रूप में बाँटा जाता है। संस्करण का मानक स्रोत रनटाइम का अपना स्थिरांक
`NAC.version` है, जो `api/latest.json` पर डेटा के रूप में छपा है (खंड
9.1 देखें)। यह खंड जान-बूझकर कोई संस्करण संख्या दोबारा नहीं लिखता: यह
`2.5.0-alpha.5` तब भी लिए हुए था जब पैकेज आगे बढ़ चुका था, और यह उसी
क़िस्म की ख़ामी है जैसी वे पुराने उदाहरण थे जो खंड 5 और 9 से हटाए गए।
इसमें आता है:

- `js/nac.js` -- मुख्य रनटाइम: खंड 5 की सार्वजनिक आज्ञार्थक +
  आत्म-निरीक्षण API (click/fill/select/tab,
  click_by_verb/tab_by_label, invoke/utter, edit_field,
  setCapabilities, syncPlugin, request_authority/confirm_action,
  registerPlugin/call/read/subscribe, narrate/context/tree,
  expect/diff, describe, validate_global, ...)। पैकेज के
  `main`/`module`/`browser` द्वार के रूप में छपा (`dist/nac.mjs`)।
- `js/nac-v2-extensions.js` -- ब्राउनफ़ील्ड + डेटा तालिका की इकाइयाँ, जो
  मुख्य भाग लद जाने के बाद उसी `window.NAC` पर जुड़ जाती हैं: दायरे का
  पेड़, autoRegister, क्षणिक पकड़, HMAC, isTrusted का प्रमाण, i18n की
  सूची (`t`/`locale`), और `registerDataTable` / `dt_*` वाला डेटा
  तालिका का पूरा कुटुंब (खंड 5.3)। `@nac3/runtime/extensions` के रूप
  में छपा (`dist/nac-v2-extensions.mjs`)। मुख्य रनटाइम `dt_*` सतह
  **नहीं** रखता; उसे पाने के लिए यह मॉड्यूल लादें।
- `js/nac-chat-client.js` -- एक संदर्भ चैट क्लाइंट जो आवाज़ + LLM +
  भेजने वाले को जोड़ता है। `@nac3/runtime/chat-client` के रूप में छपा।

पैकेज `nac3` और `nac` निष्पादनीय नामों से एक कमांड लाइन भी देता है
(`dist/cli.js`, खंड 10.2)।

और कार्यान्वयन का स्वागत है (मूल स्वचालन चलाने वालों के लिए Python,
अंतःस्थापित एजेंटों के लिए Rust आदि)। अधिकार विशिष्टि का है, JS कोड का
नहीं।

---

## 15. प्लगिन विस्तार का अनुबंध -- canvas और API की सतहें (v2.5)

खंड 1-14 यह मानकर चलते हैं कि एजेंट से जुड़ी सतह **DOM** है। हर पता
रखने वाले तत्व पर `data-nac-id` गुण होता है, हर क्रिया `el.click()` से
चलती है, स्थिति का हर पठन `el.getAttribute(...)` से आता है। यह उन ऐपों
के लिए चलता है जिनका ढाँचा **और** सामग्री दोनों DOM के नोडों में रहते
हैं।

यह उन ऐपों के लिए नहीं चलता जिनकी सतह का हिस्सा **canvas** है
(LibreOffice / Collabora Online, Figma, Excalidraw, Miro, कोई भी अपना
बनाया WebGL संपादक)। ढाँचा DOM ही रह सकता है (टूलबार, संवाद), पर आदेशों
को अक्सर ऐप के अपने सार्वजनिक API से गुज़रना पड़ता है (postMessage,
प्लगिन का SDK, स्क्रिप्ट का पुल), और स्थिति DOM से पढ़ी ही न जा सकती
हो, यह भी हो सकता है।

v2.5 इकाइयों का एक छोटा समूह जोड़ता है जिससे कोई NAC3 प्लगिन ऐसी सतहों
तक अपना रास्ता दिखाने का अनुबंध ख़ुद घोषित कर सके। रनटाइम किसी भी ख़ास
ऐप से बेख़बर बना रहता है -- वह किसी ऐप से बात करना सिर्फ़ उस प्लगिन का
मैनिफ़ेस्ट पढ़कर सीखता है।

### 15.1 नई इकाइयों का समूह क्यों

सिर्फ़ DOM जानने वाला `NAC.click(id)` ये नहीं कर सकता:

- रेत-बक्से में बंद Collabora के iframe को `Send_UNO_Command` का
  postMessage भेजना।
- Figma के प्लगिन के रेत-बक्से के भीतर
  `figma.currentPage.selection = [...]` बुलाना।
- React की किसी ref पर `excalidrawAPI.setElements(...)` चलाना।
- यह पढ़ना कि Collabora के अभी के चयन पर मोटा अक्षर चालू है या नहीं
  (टूलबार उसे दिखाता है; canvas उसे छिपा लेता है)।

हल यह **नहीं** है कि `NAC.click` में backend ताड़ने के तुक्के जोड़ दिए
जाएँ। हल यह है कि एक स्पष्ट, निरपेक्ष क्रिया जोड़ी जाए जो प्लगिन का slug
और क्रिया का रास्ता लेती है, और प्लगिन के मैनिफ़ेस्ट को यह घोषित करने
दे कि उस क्रिया का रास्ता कैसे तय होता है।

### 15.2 तीन इकाइयाँ

```ts
NAC.registerPlugin(slug: string, manifest: PluginManifest): void
NAC.call(plugin: string, verb_path: string, args?: object): Promise<any>
NAC.read(plugin: string, state_path: string): Promise<any>
NAC.subscribe(plugin: string, event_path: string,
              cb: (data: any) => void): SubscriptionHandle
NAC.unsubscribe(handle: SubscriptionHandle): void
```

- `registerPlugin(slug, manifest)` एक v2.5 प्लगिन पंजीकृत करता है। कोई
  एक `slug` DOM के मैनिफ़ेस्ट बही (खंड 5) और v2.5 के विस्तार बही, दोनों
  में आ सकता है; दोनों साथ रहते हैं। v2.5 के बुलावे सिर्फ़ v2.5 की बही
  से हल होते हैं।
- `call` किसी घोषित क्रिया को बुलाता है। रास्ता मैनिफ़ेस्ट चुनता है,
  एजेंट नहीं। backend ने जो लौटाया उसी से हल होता है (अक्सर
  `undefined` / `{ok: true}`); क्रिया अनजानी हो, backend विफल हो, या
  उत्तर की शक्ल अवैध हो, तो `NacError` से इनकार करता है।
- `read` किसी घोषित स्थिति का मान लौटाता है। रनटाइम उस स्थिति के
  सहारों की कड़ी को घोषित क्रम में चलता है और पहला हल होने वाला स्रोत
  लौटाता है; इनकार सिर्फ़ तब करता है जब कड़ी का हर स्रोत विफल हो जाए।
- `subscribe` किसी घोषित घटना पर एक श्रोता जोड़ता है। यह एक मूठ लौटाता
  है जिसे बुलाने वाला सफ़ाई के लिए `unsubscribe` को देता है। घटनाएँ ऊपर
  की किसी असली घटना-स्रोत पर टिकी हो सकती हैं, या बार-बार पूछकर /
  MutationObserver से गढ़ी जा सकती हैं -- कौन-सी, यह मैनिफ़ेस्ट घोषित
  करता है।

चारों फलन असमकालिक हैं (Promise लौटाते हैं), सिर्फ़ `unsubscribe` को
छोड़कर, जो समकालिक है और कितनी बार भी चलाने पर वही रहता है।

### 15.3 प्लगिन मैनिफ़ेस्ट की शक्ल

```ts
interface PluginManifest {
  slug: string;
  verbs:  { [verb_path: string]: VerbBinding };
  state:  { [state_path: string]: StateBinding[] };
  events: { [event_path: string]: EventBinding };
}

interface VerbBinding {
  backend:       BackendKind;
  /* backend-specific fields (see 15.4) */
  [k: string]: any;
}

interface StateBinding {
  backend:       BackendKind;
  /* backend-specific fields (see 15.4) */
  extract?:      string;   /* extractor DSL string (see 15.5) */
  [k: string]: any;
}

interface EventBinding {
  backend:       BackendKind;
  /* backend-specific fields */
  [k: string]: any;
}

type BackendKind =
  | 'postmessage'
  | 'postmessage-listen'
  | 'sdk-call'
  | 'script-bridge'
  | 'dom-mirror'
  | 'same-origin-window'
  | 'synthetic-mutation'
  | 'synthetic-poll';
```

मैनिफ़ेस्ट शुद्ध JSON होते हैं (कोई JS कॉलबैक नहीं)। Forge, Sumi और आगे
का कोई भी औज़ार उन्हें डेटा के रूप में बनाता है; रनटाइम backend के नाम
एक तय शब्दावली से समझता है।

क्रियाओं और घटनाओं के पास **ठीक एक** जोड़ होता है। स्थिति के पास जोड़ों
का एक **क्रम वाला सरणी** होता है: रनटाइम कड़ी को क्रम से चलता है और
पहला सफलता से हल हुआ स्रोत लौटाता है।

### 15.4 backend की शब्दावली

| क़िस्म | किसके लिए | आवश्यक खाने |
|------|----------|-----------------|
| `postmessage` | क्रिया: `postMessage` से किसी iframe को संदेश भेजना। | `target` (जिस iframe को भेजना है उसका CSS चयनक), `message` (MessageId स्ट्रिंग), `values` (तर्कों से भरा वस्तु-शब्दशः), `values_from_args` (वैकल्पिक, उन तर्क-कुंजियों का सरणी जो जैसी हैं वैसी आगे भेजी जाएँ) |
| `postmessage-listen` | घटना: `window.message` पर किसी ख़ास आने वाले `MessageId` को सुनना। | `source` (उद्गम छानने के लिए iframe का CSS चयनक; न दिया जाए तो कोई भी उद्गम स्वीकार), `message` (जिस MessageId से मेल करना है), `extract` (संदेश के डेटा पर निकालने वाला DSL) |
| `sdk-call` | क्रिया: विश्व भर में खुले किसी JS फलन को बुलाना (उदाहरण के लिए Figma का प्लगिन, Excalidraw का API)। | `path` (`window` के भीतर बिंदुओं वाला रास्ता, जैसे `figma.currentPage.selection`), `mode` (`assign` से उस रास्ते पर तर्कों का मान बैठाना, `invoke` से उसे तर्क-वस्तु के साथ फलन की तरह बुलाना) |
| `script-bridge` | क्रिया या स्थिति: किसी ऐप का स्क्रिप्ट पुल बुलाना (Collabora का `CallPythonScript`, LibreOffice का UNO पुल, Google Apps Script)। | `bridge` (backend का अपना पहचानक, जैसे `collabora.python`), `script` (स्क्रिप्ट का पहचानक), `function` (चलाने वाले फलन का नाम), `args` (बुलावे के तर्कों से भरा वस्तु-शब्दशः), `response_match` (स्थिति के लिए: जिस उत्तर के MessageId की राह देखनी है), `timeout_ms` (वैकल्पिक, तयशुदा 5000) |
| `dom-mirror` | स्थिति: किसी DOM तत्व से पढ़ना जिसका गुण / वर्ग / पाठ canvas के भीतर की किसी स्थिति का आईना है (उदाहरण के लिए टूलबार का वह बटन जो अभी के चयन पर उसकी सज्जा चालू होने पर उजला पड़ता है)। | `selector` (पूछने वाला CSS चयनक), `extract` (निकालने वाला DSL, 15.5 देखें) |
| `same-origin-window` | स्थिति: iframe एक ही उद्गम का हो तो `iframe.contentWindow.<path>` से पढ़ना। रनटाइम भिन्न उद्गम ताड़ लेता है और अगले सहारे पर उतर जाता है। | `target` (iframe का CSS चयनक), `path` (`contentWindow` के भीतर बिंदुओं वाला रास्ता) |
| `synthetic-mutation` | घटना: एक या अधिक स्थिति-स्रोतों पर DOM के बदलाव देखकर, और देखा गया मान बदलने पर फिर से भेजकर, एक घटना गढ़ना। | `observe` (जिन स्थिति-रास्तों पर नज़र रखनी है उनका सरणी; रनटाइम हर एक पर `read` बुलाता है और बदलावों के बीच तुलना करता है), `throttle_ms` (वैकल्पिक, तयशुदा 100) |
| `synthetic-poll` | घटना: स्थिति-स्रोतों से बार-बार पूछकर एक घटना गढ़ना। | `observe` (स्थिति-रास्तों का सरणी), `interval_ms` (तयशुदा 250) |

हर backend को रनटाइम में एक अपने-आप-में-पूरे भेजने वाले के रूप में लागू
करना आवश्यक है (`dispatch(binding, args, context) -> Promise<value>`)।
विशिष्टि में किसी नई क़िस्म का backend जोड़ने पर विशिष्टि का संस्करण
बढ़ाना पड़ता है; जो रनटाइम अनजाने backend को नज़रअंदाज़ करते हैं, उनके
लिए उन्हें घोषित करने वाले मैनिफ़ेस्टों को ठुकराना आवश्यक है (चुपचाप
छोड़ देना मना है)।

### 15.5 निकालने वाला छोटा DSL

स्थिति के backend और `postmessage-listen` वाले घटना-backend को अक्सर
किसी बड़ी वस्तु से एक खाना चुनकर निकालना होता है। रनटाइम एक बहुत छोटा
घोषणात्मक DSL साथ लाता है, ताकि मैनिफ़ेस्ट सिर्फ़ JSON बने रहें:

| लिखावट | अर्थ | इनपुट का उदाहरण -> आउटपुट |
|--------|---------|-------------------------|
| `field.path.to.value` | बिंदुओं वाले रास्ते पर चलना। | `{a:{b:1}}` के साथ `a.b` -> `1` |
| `attribute:NAME` | सिर्फ़ DOM: `el.getAttribute(NAME)` पढ़ना। | `<i data-x="hi">` के साथ `attribute:data-x` -> `'hi'` |
| `text` | सिर्फ़ DOM: `el.textContent` पढ़ना। | `<span>hi</span>` के साथ `text` -> `'hi'` |
| `classList.contains:CLASS` | सिर्फ़ DOM: `el.classList.contains(CLASS)` -> बूलियन। | `<button class="active">` के साथ `classList.contains:active` -> `true` |
| `value` | सिर्फ़ DOM: `el.value` पढ़ना। | `<input value="x">` के साथ `value` -> `'x'` |
| `present` | सिर्फ़ DOM: चयनक ने कोई तत्व हल किया तो `true`, वरना `false` लौटाता है। | चयनक मेल खा गया -> `true` |

v2.5 में जोड़-तोड़ का साथ नहीं है; निकालने वाला ठीक ऊपर की किसी एक
पंक्ति जैसा ही होता है। जिस मैनिफ़ेस्ट को जटिल बदलाव चाहिए वह उसके बजाय
एक `script-bridge` घोषित करता है।

### 15.6 `state` के सहारों की कड़ी का अर्थ

`state[path]` जोड़ों का एक सरणी है। `NAC.read(plugin, path)` उस सरणी को
क्रम से चलता है। हर जोड़ के लिए:

1. रनटाइम उस backend के भेजने वाले को बुलाता है।
2. भेजने वाला किसी मान से हल हो (`false`, `0` और ख़ाली स्ट्रिंग भी, पर
   `undefined` **नहीं**), तो `read` वही मान लौटाता है।
3. भेजने वाला इनकार करे, या `undefined` से हल हो, तो रनटाइम सरणी के
   अगले जोड़ पर बढ़ जाता है।
4. किसी भी जोड़ ने मान न दिया, तो `read`
   `NacError('state_unreadable', ...)` से इनकार करता है, जिसका
   `err.attempts: [...]` हर कोशिश किए गए backend के लिए एक प्रविष्टि
   लाता है, `{backend, reason}` के साथ।

तर्क: यह कड़ी मैनिफ़ेस्ट लिखने वाले की पसंद का क्रम दर्ज करती है। सबसे
तेज़, सबसे सस्ता, सबसे ताज़ा स्रोत पहले घोषित होता है; सहारे शालीनता से
उतरते जाते हैं। रनटाइम कभी चुपचाप किसी घटिया स्रोत को पहले नहीं चुनता।

### 15.7 गढ़ी गई क्रियाओं का उद्गम

`NAC.call` का हर भेजना, backend के लौटने के बाद `document` पर एक
`nac:plugin:invoked` घटना भेजता है। detail का भार:

```js
{
  plugin:    'collabora.writer',
  verb_path: 'uno.Bold',
  backend:   'postmessage',
  request_id: 'pi_<random hex>',
  source:    'agent',     // see sec 7
  trusted:   false,
  duration_ms: 12,
  ok:        true,
  error:     null,
}
```

`nac:plugin:read` (किसी `read` के बाद) और `nac:plugin:event` (गढ़ी गई
घटना का दोबारा भेजना) के लिए वही शक्ल है। `source` तयशुदा रूप से
`'agent'` होता है; जो मेज़बान रनटाइम को उपयोगकर्ता के सामने वाले
इंटरफ़ेस में लपेटते हैं वे उसे पहले से मौजूद
`NAC.set_source(...)` की व्यवस्था से बदल सकते हैं (खंड 7)।

### 15.8 पूरा चलाया उदाहरण -- Collabora Writer

```json
{
  "slug": "collabora.writer",
  "verbs": {
    "uno.Bold": {
      "backend": "postmessage",
      "target":  "iframe[data-collabora-frame]",
      "message": "Send_UNO_Command",
      "values":  { "Command": ".uno:Bold" }
    },
    "doc.save": {
      "backend": "postmessage",
      "target":  "iframe[data-collabora-frame]",
      "message": "Action_Save",
      "values_from_args": ["DontTerminateEdit", "Notify"]
    }
  },
  "state": {
    "selection.isBold": [
      { "backend": "dom-mirror",
        "selector": "[data-nac-id='toolbar.bold']",
        "extract":  "classList.contains:selected" },
      { "backend": "script-bridge",
        "bridge":   "collabora.python",
        "script":   "yujin_state.py",
        "function": "GetSelectionState",
        "response_match": "CallPythonScript-Result",
        "extract":  "Values.is_bold" }
    ],
    "doc.modified": [
      { "backend": "same-origin-window",
        "target":  "iframe[data-collabora-frame]",
        "path":    "app.file.modified" }
    ]
  },
  "events": {
    "doc.modified": {
      "backend": "postmessage-listen",
      "source":  "iframe[data-collabora-frame]",
      "message": "Doc_ModifiedStatus",
      "extract": "Values.Modified"
    },
    "selection.changed": {
      "backend":     "synthetic-mutation",
      "observe":     ["selection.isBold", "selection.isItalic"],
      "throttle_ms": 100
    }
  }
}
```

एजेंट `NAC.call('collabora.writer', 'uno.Bold')` बुलाता है; रनटाइम
`postmessage` backend से रास्ता तय करता है और iframe को
`Send_UNO_Command` भेजता है। असर हुआ या नहीं, यह पक्का करने के लिए
(खंड 17 देखें) एजेंट
`await NAC.read('collabora.writer', 'selection.isBold')` बुलाता है;
रनटाइम पहले टूलबार का आईना आज़माता है (तेज़, मुफ़्त), और आईना न मिले तो
Python के स्क्रिप्ट पुल पर उतर जाता है। एजेंट कभी नहीं जानता और उसे कभी
फ़र्क़ नहीं पड़ता कि जवाब किस स्रोत ने दिया।

### 15.9 त्रुटियाँ

`NAC.call` / `read` / `subscribe` एक `NacError` से इनकार करते हैं
जिसका `code` इनमें से एक होता है:

- `plugin_not_registered` -- उस slug का कोई v2.5 मैनिफ़ेस्ट नहीं है।
- `verb_not_declared` -- क्रिया का रास्ता मैनिफ़ेस्ट में नहीं है।
- `state_not_declared` -- स्थिति का रास्ता मैनिफ़ेस्ट में नहीं है।
- `event_not_declared` -- घटना का रास्ता मैनिफ़ेस्ट में नहीं है।
- `backend_unknown` -- मैनिफ़ेस्ट ऐसा backend घोषित करता है जिसे
  रनटाइम लागू नहीं करता। मैनिफ़ेस्ट को पंजीकरण के समय ही ठुकराना
  आवश्यक है; यह त्रुटि सिर्फ़ तब सामने आती है जब कोई रनटाइम आगे का कोई
  मैनिफ़ेस्ट स्वरूप स्वीकार कर ले और फिर उसे भेज न पाए।
- `backend_target_missing` -- backend का लक्ष्य (iframe, JS का रास्ता,
  DOM का चयनक) मिल ही नहीं रहा।
- `cross_origin_blocked` -- भिन्न उद्गम वाले iframe पर
  `same-origin-window` की कोशिश की गई।
- `state_unreadable` -- स्थिति की कड़ी का हर जोड़ विफल हो गया; 15.6
  देखें।
- `timeout` -- कोई backend अपने घोषित `timeout_ms` के भीतर जवाब नहीं
  दिया (क्रियाओं के लिए तयशुदा 5000, स्थिति पढ़ने के लिए 1000)।
- `invalid` -- तर्क की शक्ल ग़लत है (अवैध slug, पंजीकरण के समय बिगड़ी
  शक्ल का मैनिफ़ेस्ट आदि)।

---

## 16. पेड़ में चलना (v2.5 -- 2.5.0-alpha.5 में आया / RFC V25-02)

उन सहायक प्रवाहों और आवाज़ चलाने वालों के लिए आदेशों में सीढ़ी-दर-सीढ़ी
चलने की इकाइयाँ, जिन्हें बताना होता है कि अभी के ध्यान-बिंदु से वे क्या
कर सकते हैं।

**API की सतह:**

- `NAC.context(plugin) -> { breadcrumb: [{nac_id, label}, ...] }`
  `document.activeElement` से शुरू होकर, `data-nac-id` रखने वाले पूर्वज
  तत्वों से ऊपर चढ़ता है और प्लगिन की जड़ पर रुक जाता है। प्लगिन के
  भीतर किसी के पास ध्यान न हो तो ख़ाली रास्ता लौटाता है। हर कड़ी का
  `label` `narrate` से आता है (खंड 17)।

- `NAC.tree(plugin, rootId?) -> [{nac_id, label, opens?, leaf?}, ...]`
  `rootId` (न दिया जाए तो प्लगिन की जड़) के **तुरंत अगले** पता रखने
  वाले बच्चे गिनाता है। "तुरंत अगले" का मतलब है कि शुरू के बिंदु और उस
  बच्चे के बीच `data-nac-id` रखने वाला कोई और तत्व नहीं है। हर
  प्रविष्टि के लिए:
  - `label` `narrate` से हल किया गया
  - `opens` मौजूद होने पर `data-nac-opens` गुण का आईना
  - `leaf` `data-nac-leaf` मौजूद होने पर `true`

**लिखने वालों के लिए गुण:**

- `data-nac-opens="<target-nac-id>"`: घोषित करता है कि यह नोड उस तत्व
  को खोलता / उसमें उतरता है जिसे लक्ष्य id बताता है। इससे एजेंट नाम
  अंदाज़े से लगाए बिना चलने की कड़ी के पीछे जा सकते हैं।
- `data-nac-leaf`: स्पष्ट अंतिम निशान; आगे के एजेंट जान जाते हैं कि अब
  और नीचे उतरना मुमकिन नहीं।

**त्रुटियाँ:** अनजाने rootId पर `tree` `[]` लौटाता है (चुपचाप ख़ाली,
त्रुटि नहीं)। अनजाने प्लगिनों पर `context` हमेशा
`{ breadcrumb: [] }` लौटाता है।

---

## 17. सहायक लेबल (v2.5 -- 2.5.0-alpha.5 में आया / RFC V25-03)

इंसान के पढ़ने लायक़ लेबलों का मानक हल। एक ही फलन -- स्क्रीन रीडरों,
बोली-संश्लेषण, आवाज़ के प्रवाहों, ऑडिट के लॉगों और मोबाइल की सहायक
सतहों के लिए।

**API की सतह:**

- `NAC.narrate(plugin, nac_id) -> string | null`
  प्लगिन या nac_id न मिले तो `null` लौटाता है। वरना इस कड़े प्राथमिकता
  क्रम वाला लेबल:

  1. **`aria-label`** -- सुगम्यता पहले; जब तक वह सिर्फ़ ख़ाली जगह न
     हो, उसे माना जाता है।
  2. **दिखने वाला पाठ** -- उस तत्व का `textContent`, पर `data-nac-id`
     रखने वाले भीतरी उप-पेड़ों को छोड़कर (उनका अपना narrate हल होता है;
     उन्हें इसलिए छोड़ा जाता है कि बोला गया उत्पादन अपने दायरे में रहे)।
  3. **`data-nac-label`** -- लिखने वाले का स्पष्ट अधिलेखन; तब काम का
     जब दिखने वाले पाठ में चिह्नों की आकृतियाँ या i18n की कुंजियाँ हों।
  4. **आख़िरी सहारे के तौर पर `nac_id`** -- सबसे बुरी हालत; यह बताता
     है कि "कोई लेबल लिखा ही नहीं गया"।

  किसी भी सतह पर सिर्फ़ ख़ाली जगह वाले मान अगली सतह पर उतर जाते हैं।

**जाँच:** `validate_global()` उन क्रम-जैसी शक्ल वाले nac_id के लिए
(`btn-1`, `btn-2`, ...) जिनमें ऊपर की सतहों का कोई भी लेबल न हो,
`plugin_instance_violations` समूह में चेतावनियाँ दे सकता है।

---

## 18. असर की पहचान (v2.5 -- 2.5.0-alpha.5 में आया / RFC V25-04)

यह "चुप नुक़सान" की खाई भरता है: एजेंट किसी क्रिया का असर पक्का करता
है, सिर्फ़ यह नहीं कि आदेश भेजा गया था। दोनों इकाइयाँ `NAC.read()` के
साथ जुड़ती हैं, इसलिए V25-01 का कोई भी backend चलता है (postmessage,
sdk-call, dom-mirror, ...)।

**API की सतह:**

- `NAC.expect(plugin, statePath, value, opts?) -> Promise<value>`
  यह `NAC.read(plugin, statePath)` से बार-बार पूछता रहता है, जब तक
  तुलना करने वाला सही न कहे या मियाद पूरी न हो जाए। हल हुए मान से हल
  होता है; मियाद पर `NacError('timeout', ...)` से इनकार करता है।

  पूछते रहने के दौरान पढ़ने की विफलताएँ मियाद तक दोबारा आज़माई जाती हैं
  ("अभी दिखाई नहीं दे रहा" मानकर, कड़ी त्रुटि मानकर नहीं)।

  विकल्प:
  - `timeout_ms` (तयशुदा `5000`)
  - `poll_ms` (तयशुदा `100`)
  - `comparator` (तयशुदा `(cur, want) => cur === want`)
    यह `(current, expected)` लेता है और बूलियन लौटाता है।

- `NAC.diff(plugin, statePath, actionFn) -> Promise<{before, after, changed}>`
  यह स्थिति पढ़ता है, `actionFn()` की राह देखता है, फिर स्थिति दोबारा
  पढ़ता है। दोनों झलकें और एक बूलियन `changed` लौटाता है, जो
  JSON-stringify की तुलना से निकाला जाता है (इसलिए `undefined` बनाम
  किसी मान को भी बदला हुआ गिना जाता है)। पढ़ने की विफलताएँ
  `undefined` में सिमट जाती हैं।

**जोड़ने के बारे में टिप्पणी:** `diff` सिर्फ़ शुरू और अंत की झलक पकड़ता
है; क्रिया के भीतर की बीच की स्थितियाँ वह **नहीं** देखता। अगर आपकी
चिंता यह है कि "स्थिति किसी समय किसी ख़ास मान से गुज़रती है", तो
`expect` का उपयोग करें।

---

*यह दस्तावेज़ NAC3 v2.5 की मानक विशिष्टि है। खंड 0-14 v2.4 स्थिर से
बदले नहीं हैं। खंड 15-18 v2.5 में आते हैं। इस फ़ाइल के संपादन विशिष्टि
के बदलाव माने जाते हैं और उनके लिए RFC आवश्यक है; `CONTRIBUTING.md`
देखें।*
