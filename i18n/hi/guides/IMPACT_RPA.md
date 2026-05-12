---
translation_source: guides/IMPACT_RPA.md
translation_source_hash: d278c291a38100f66ef8ed5ae0030875b5e9eb4412db6edecf9b7db2794a16e2
translation_quality: machine_v1
translation_lang: hi
translation_date: 2026-05-11T15:04:10.065801+00:00
---

# RPA पर NAC3 का प्रभाव

**NAC3 संस्करण:** 2.2 stable.
**लक्षित पाठक:** RPA आर्किटेक्ट, automation centers of excellence (CoE) लीड्स, और वे automation इंजीनियर जो NAC3-संचालित automation की रखरखाव + विस्तार लागत का मूल्यांकन कर रहे हैं।

## संक्षेप में

CSS-selector-आधारित RPA स्वभाव से ही अस्थिर होती है। Image-based recognition डिस्प्ले पर निर्भर होने के कारण अस्थिर होती है। NAC3 पेज पर स्थिर named anchors स्थापित करता है जिन्हें कोई भी RPA platform target कर सकता है। प्रति automation लागत 60-90% घट जाती है और प्रति-तिमाही selector-maintenance का बोझ लगभग शून्य हो जाता है।

## आज RPA selectors की स्थिति

तीन तरीके हैं, सभी में खामियाँ हैं:

### 1. CSS selectors / XPath

```xml
<webctrl tag='button'
         class='btn-primary btn-lg invoice-save-btn'
         text='Save' />
```

इनमें खराबी आती है: CSS class रीनेम होने पर, layout पुनर्संरचना पर, लेबल अनुवाद पर, hover-state class जुड़ने पर।

### 2. Image / OCR matching

रेंडर हुए बटन की pixel-comparison। इनमें खराबी आती है: थीम बदलने पर, dark mode पर, रिज़ॉल्यूशन बदलने पर, font बदलने पर, focus ring overlap पर।

### 3. Anchor (relative-coordinate) targeting

"'Subtotal' लेबल से दो सेल दाईं ओर का बटन।" इनमें खराबी आती है: layout reflow पर, column क्रम बदलने पर, responsive breakpoint बदलने पर।

तीनों तरीकों में CoE को लगातार रखरखाव करना पड़ता है। एक सामान्य enterprise CoE अपना 35-60% समय UI redesign के बाद टूटे हुए selectors को ठीक करने में लगाती है।

## NAC3 के साथ स्थिति

प्रति element एक ही लाइन:

```js
await window.NAC.click('invoice.save');
```

इसमें खराबी आती है: जब product team `save` verb का नाम बदलकर कुछ और कर दे। यह एक वास्तविक semantic बदलाव है, और automation को उसी कारण से अपडेट करना होगा जिस कारण इंसानों को पुनः प्रशिक्षण की जरूरत होती।

## ठोस प्रभाव मेट्रिक्स

एक CoE से जिसने 14 automations में NAC3 का पायलट किया:

| मेट्रिक | Selector-आधारित | NAC3-आधारित | अंतर |
|--------|----------------|------------|------|
| प्रति automation औसत activities | 47 | 9 | -81% |
| UI redesign तिमाही में रखरखाव घंटे | 41 | 3 | -93% |
| प्रति सप्ताह विफल runs (selector drift) | 18 | 0 | -100% |
| नई automation बनाने में लगा समय | 12 घंटे | 2 घंटे | -83% |
| किसी app की surface coverage (% of app actions reachable) | 38% | 95% | +150% |

Coverage का आंकड़ा सबसे महत्वपूर्ण है। **Selector-आधारित RPA आमतौर पर किसी app की केवल 30-50% actions को cover करती है** क्योंकि शेष 50-70% को cost-effectively automate करना बहुत अस्थिर होता है। NAC3 इसे >90% तक ले जाता है -- long tail भी आर्थिक रूप से व्यवहार्य हो जाती है।

## RPA के लिए NAC3 क्या संभव बनाता है

### 1. Cross-tenant portability

आज: Customer A के Salesforce instance के लिए बना RPA bot Customer B पर नहीं चलता क्योंकि CSS classes थोड़ी अलग होती हैं। NAC3 के साथ: bot `invoice.save` को target करता है जो सभी tenants में स्थिर रहता है। एक ही bot, multi-tenant।

### 2. Cross-vendor portability

यदि एक ही domain (CRM, ERP, project management) के दो SaaS products दोनों NAC3 manifests ship करते हैं जिनमें overlapping verbs हों (`create_invoice`, `mark_paid`), तो एक ही bot logic दोनों के विरुद्ध dispatch कर सकता है। RPA bot vendor-agnostic बन जाता है।

### 3. LLM-द्वारा लिखित automation

एक CoE इंजीनियर automation को सामान्य भाषा में वर्णित करता है:

> "Yujin CRM खोलें, 60 दिन से अधिक पुराने सभी अवैतनिक invoices ढूंढें,
> उन्हें collections के रूप में चिह्नित करें, संबंधित advisor को ईमेल भेजें।"

`NAC.describe()` तक पहुँच रखने वाला LLM activity sequence तैयार करता है:

```
1. NAC.click_by_verb('invoice', 'list_unpaid')
2. NAC.fill('invoice.filter.age_days_min', 60)
3. NAC.click('invoice.filter.apply')
4. For each row in NAC.dt_state('invoice.list'):
     - NAC.click_by_verb('invoice', 'mark_collections', {row_id})
     - NAC.click_by_verb('email', 'send_advisor', {row_id})
```

CoE इंजीनियर समीक्षा करता है + अनुमोदन देता है। हफ्तों नहीं, घंटों में।

### 4. नए apps के लिए self-discovery

`NAC.describe()` पूरा manifest लौटाता है। Bot runtime पर किसी भी NAC-3-अनुरूप app का introspect कर सकता है। **"उपयोगकर्ता के पास खुले हर NAC-3 conformant app को target करने वाली automation" संभव हो जाती है** (productised संस्करण के लिए yujin.app/pilot पर Yujin Pilot देखें)।

### 5. provenance के साथ audit trail

प्रत्येक dispatch `nac:action:succeeded` emit करता है जिसमें `is_trusted: false` (RPA origin का संकेत) + `plugin` + `action_id` होता है। Host app इसे compliance के लिए log कर सकता है:

> Bot xyz ने `invoice.delete` को invoice #INV-42 के लिए
> 14:23 GMT-3 पर dispatch किया, `is_trusted=false` के साथ। अनुमोदित:
> rpa-coe-policy v1.4।

GRC teams को प्रति bot run एक deterministic audit log मिलता है। Logs में कोई DOM scraping नहीं, selector strings से कोई PII leakage नहीं।

### 6. Sensitive-verb gating

जो apps कुछ verbs (delete, payment, role grant) को `isTrusted`-required के रूप में चिह्नित करती हैं, वे डिफ़ॉल्ट रूप से RPA dispatches अस्वीकार कर देंगी। CoE स्पष्ट रूप से whitelist करती है कि RPA कौन से verbs उपयोग कर सकता है:

```js
window.__NAC_ALLOW_UNTRUSTED__ = [
  'invoice.send',
  'invoice.save',
  'report.export'
  // delete, payment, admin verbs यहाँ जानबूझकर नहीं हैं
];
```

CoE governance एक spreadsheet of bot permissions की जगह JS config + audit log बन जाती है।

### 7. Voice + chat RPA front-end के रूप में

RPA layer chat panel को अपने UI के रूप में उपयोग कर सकती है: एक CoE इंजीनियर कहता है "tenant Acme के लिए unpaid-invoice job चलाओ" और एक NAC-3-aware backend resolve + dispatch करता है। Voice path वही NAC.* primitives उपयोग करता है जो chat करता है।

## RPA platform के अनुसार adoption matrix

| Platform | तरीका | Integration लागत | संदर्भ |
|----------|-------|-----------------|--------|
| UiPath | Browser activity के माध्यम से JS inject करें | कम (प्रति call एक activity) | [RPA_UIPATH.md](RPA_UIPATH.md) |
| Automation Anywhere A360 | Run JavaScript Function | कम | [RPA_AUTOMATION_ANYWHERE.md](RPA_AUTOMATION_ANYWHERE.md) |
| Blue Prism | Inject JavaScript (VBO action) | कम | [RPA_BLUE_PRISM.md](RPA_BLUE_PRISM.md) |
| Power Automate Desktop | Run JavaScript on web page | कम | (शीघ्र आने वाला) |
| Selenium-based RPA | execute_script | कम | -- |
| Image-based (TagUI, Sikuli) | Fallback path; केवल अंतिम उपाय के रूप में उपयोग करें | अधिक | -- |

## मौजूदा automation suite के लिए migration playbook

### Phase 1 -- ऑडिट (1 सप्ताह)

1. हर automation में हर selector की सूची बनाएं।
2. प्रत्येक को वर्गीकृत करें: "stable-low-maintenance" /
   "fragile-high-maintenance"।
3. fragile वाले पहले NAC3 candidates बनते हैं।

### Phase 2 -- target app तैयारी

जिस web app को automation target करती है उसे NAC3 अपनाना होगा। या तो:

- App team migration playbook के माध्यम से अपनाए
  ([AI_PLAYBOOK_MIGRATION.md](AI_PLAYBOOK_MIGRATION.md))।
- या: यदि app team migrate नहीं कर सकती तो RPA CoE एक userscript /
  browser extension के माध्यम से NAC3 client-side inject करे। यह काम करता है
  लेकिन अस्थिर है; first-party adoption को प्राथमिकता दें।

### Phase 3 -- automation rewrite (प्रति automation 1-2 सप्ताह)

प्रत्येक selector को संबंधित `NAC.*` call से बदलें।
Selector-आधारित संस्करण backup branch में रहे। नया संस्करण
explicit NAC3 audit log के साथ ship हो।

### Phase 4 -- governance

CoE अपनी bot review checklist अपडेट करे:
- Bot केवल उन NAC ids को target करे जो वर्तमान manifests में मौजूद हों।
- Bot के पास sensitive operations के लिए explicit verb whitelist हो।
- Bot हर dispatch को audit table में log करे।

## adoption की लागत

50 automations और 10 target apps पर चलने वाली CoE के लिए:

- App-side migration: 6-8 सप्ताह (प्रति app एक इंजीनियर)।
- Bot-side rewrite: प्रति bot 1-2 सप्ताह = 50-100 engineer-weeks।

यह महंगा लगता है जब तक आप इसकी तुलना 50 selector-based bots को अनिश्चित काल तक बनाए रखने की steady-state लागत से न करें। Break-even आमतौर पर 6-9 महीनों में आता है; उसके बाद सब CoE इंजीनियर समय की शुद्ध बचत है।

## जोखिम + शमन

### जोखिम -- "target app NAC3 अपनाने से इनकार करती है"

Legacy enterprise software में यह आम है। इसे इस प्रकार कम करें:

- CoE-managed browser extension या Tampermonkey-style userscript के माध्यम से
  `nac.js` client-side inject करें।
- CoE-side manifests परिभाषित करें; app अछूती रहे।
- First-party adoption जितना मजबूत नहीं, लेकिन transitionally व्यवहार्य।

### जोखिम -- "RPA isTrusted gating को bypass करती है"

यह security trade-off है। RPA clicks synthesise करेगी ही। Host app को whitelist करना होगा कि RPA कौन से verbs trigger कर सकती है। CoE + app team प्रति verb बातचीत करें। बातचीत को document करें; whitelist को नियमित रूप से audit करें।

### जोखिम -- "हम RPA action sequence की visibility खो देते हैं"

इसका उलटा सच है: NAC3 के साथ आप visibility पाते हैं। हर bot dispatch एक canonical `nac:action:succeeded` event fire करता है जिसमें structured `{plugin, action_id, args, is_trusted}` होता है। उसे अपने SIEM + retention policy में log करें।

## उद्योग समानांतर

ARIA ने assistive technology के लिए जो किया (screen readers को page पर एक स्थिर contract दिया), NAC3 RPA + agentic automation के लिए वही करता है। CoE "selector janitor" से "automation designer" बन जाती है।

## यह भी देखें

- [RPA_UIPATH.md](RPA_UIPATH.md), [RPA_AUTOMATION_ANYWHERE.md](RPA_AUTOMATION_ANYWHERE.md),
  [RPA_BLUE_PRISM.md](RPA_BLUE_PRISM.md) -- per-platform
  integration guides।
- [IMPACT_TESTING.md](IMPACT_TESTING.md) -- test/QA आयाम के लिए
  sibling impact analysis।
- [SECURITY.md](../SECURITY.md) -- isTrusted threat model जिस पर
  RPA whitelist निर्भर करती है।

## लाइसेंस

Apache-2.0.

---

*This is a machine translation of the canonical English
version at `/nac-spec/guides/IMPACT_RPA.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
