---
translation_source: guides/IMPACT_TESTING.md
translation_source_hash: d69b8343b9c3e6a8ba3e22f198a9a6646d800f3f32a2f0446a506cb44f9e664b
translation_quality: machine_v1
translation_lang: hi
translation_date: 2026-05-11T15:02:45.839394+00:00
---

# NAC3 का Testing + QA पर प्रभाव

**NAC3 संस्करण:** 2.2 stable.
**लक्षित पाठक:** Test engineers, QA leads, SDETs, और वे CTOs जो NAC3 अपनाने की दीर्घकालिक test maintenance लागत का मूल्यांकन कर रहे हैं।

## संक्षेप में

NAC3 ids का उपयोग करने वाला test code UI redesigns के बाद भी काम करता रहता है। CSS selectors का उपयोग करने वाला test code नहीं करता। यह एक अकेली विशेषता test maintenance की अर्थव्यवस्था को "UI बदलाव के साथ रैखिक" से बदलकर "feature बदलाव के साथ रैखिक" कर देती है -- जो आमतौर पर 5-10 गुना कम काम होता है।

## आज की maintenance का गणित

किसी भी गैर-तुच्छ web app के लिए एक सामान्य Selenium / Cypress / Playwright suite में सैकड़ों selectors होते हैं:

```ts
await page.locator('button.btn-primary.btn-large:has-text("Save")').click();
await page.locator('div.modal > div.body > input[type="text"]:first-of-type').fill('Acme');
await page.locator('table.invoice-grid > tbody > tr:nth-child(1) > td:last-child > button').click();
```

ये selectors तब टूट जाते हैं जब:

- Design team `.btn-primary` का नाम बदलकर `.btn-cta` कर दे।
- Accessibility के लिए एक wrapping div जोड़ा जाए।
- Button का label अंतर्राष्ट्रीयकृत हो जाए और es-tenant tests में "Save" बदलकर "Guardar" हो जाए।
- Grid layout, grid-template-rows में बदल जाए।
- Page के बारे में कुछ भी बदले जो semantic intent नहीं है।

Industry surveys (2024-2025) का अनुमान है कि **QA engineer के 30-50% समय का उपयोग selector maintenance में होता है**। App बढ़ने के साथ यह संख्या और खराब होती जाती है।

## NAC3 के साथ maintenance का गणित

```ts
await NAC.click('invoice.save');
await NAC.fill('invoice.client_name', 'Acme');
await NAC.click('invoice.line.42.delete');
```

ये calls इन परिस्थितियों में भी काम करती रहती हैं:

- CSS class का नाम बदलने पर (selectors CSS को संदर्भित नहीं करते)।
- DOM tree के पुनर्गठन पर (selectors संरचना को संदर्भित नहीं करते)।
- I18n label बदलने पर (selectors text को संदर्भित नहीं करते)।
- Grid-to-flex layout migrations पर।
- Component library बदलने पर।

ये केवल तभी टूटती हैं जब:

- Product team किसी verb का नाम बदले (`save` -> `commit`)।
- कोई button पूरी तरह हटा दिया जाए।

ये **feature-level बदलाव** हैं, UI-level नहीं। Test को उसी कारण से अपडेट करना पड़ता है जिस कारण production code को करना पड़ता है। यही सही लागत का आधार है।

## ठोस प्रभाव मेट्रिक्स

Yujin CRM के आंतरिक डेटा से (2025):

| मेट्रिक | NAC से पहले | NAC के बाद | अंतर |
|--------|-----------|-----------|-------|
| औसत Playwright spec लाइनें | 187 | 64 | -66% |
| Redesign sprint के बाद प्रति-spec maintenance | 4.2 घंटे | 0.3 घंटे | -93% |
| प्रति सप्ताह Selector-संबंधित test विफलताएं | 38 | 2 | -95% |
| नए QA engineer के लिए onboarding समय | 3 सप्ताह | 1 सप्ताह | -67% |
| बिना संपादन के 6 महीने बाद passing tests | 31% | 89% | +180% |

89% का आंकड़ा सबसे महत्वपूर्ण है। **NAC3 tests का विशाल बहुमत सामान्य product evolution के दौरान काम करता रहता है**, जबकि selector-आधारित समकक्ष सड़ जाते हैं।

## NAC3 test automation के लिए क्या सक्षम करता है

### 1. स्थिर test corpus

2024 में `NAC.click('invoice.save')` के विरुद्ध लिखा गया test 2026 में भी चलेगा यदि verb `save` product roadmap में बना रहे। Button के आसपास का DOM तीन बार पुनर्निर्मित हो सकता है।

### 2. Selector mode बदले बिना cross-browser

Edge cases (pseudo-elements, focus rings, shadow DOM) के लिए CSS selectors Chromium / Firefox / WebKit में अलग-अलग व्यवहार करते हैं। NAC3 runtime के resolver के माध्यम से dispatch करता है -- browser चाहे जो भी हो, code path एक ही रहता है।

### 3. I18n-agnostic tests

एक multi-locale app में: आज की test suite को per-locale runs की जरूरत होती है क्योंकि "Save" / "Guardar" / "Speichern" सभी एक ही button हैं। NAC3 के साथ test id को call करता है; runtime सभी locales में resolve करता है। **आप 1 test लिखते हैं, वह 10 locales में चलता है** (प्रत्येक के लिए एक)।

### 4. LLM-assisted test authoring

एक LLM जो `NAC.describe()` देखता है, वह एक prose description से पूरी test spec बना सकता है: "Test करें कि एक row जोड़ने और फिर उसे delete करने के बाद table प्रारंभिक अवस्था में वापस आ जाती है।" LLM NAC.* calls emit करता है; आप review + commit करते हैं। Yujin CRM में ~250 specs हैं जो इस तरह authored और merge से पहले reviewed की गई थीं।

### 5. Discovery के माध्यम से self-healing tests

जब कोई test id का नाम बदलने के कारण विफल होता है:

```ts
try {
  await NAC.click('invoice.save');
} catch (e) {
  if (e.code === 'not_found') {
    // Re-discover; the verb 'save' may live under a new id.
    const r = await NAC.click_by_verb('invoice', 'save');
    if (r.ok) console.warn('id has changed; update test');
  }
}
```

Runtime का `click_by_verb` एक self-healing fallback देता है जो "इस test को अपडेट करने की जरूरत है, लेकिन action अभी भी काम करता है" -- "selector not found, पूरी तरह बंद" से कहीं बेहतर failure mode।

### 6. Manifests से test-generation

`NAC.validate_global({probe: true})` हर `role="action"` element पर एक click synthesise करता है + verify करता है कि वह 5s के भीतर canonical ack event emit करता है। **यह पूरे app की clickable surface के लिए एक auto-generated smoke test है**। इसे CI में चलाएं; यह किसी भी ऐसे button को पकड़ता है जो proper ack emission के बिना mount होता है।

### 7. Stage के अनुसार pipeline coverage

Yujin की reference test suite (NAC_TEST_MANUAL.md) tests को NAC3 pipeline stage के अनुसार व्यवस्थित करती है:

- Stage 1 (STT input)
- Stage 2 (Disambiguation)
- Stage 3 (LLM intermediary)
- Stage 4 (NAC.* calls)
- Stage 5 (DOM side effect)
- Stage 6 (Ack event)

Coverage को **प्रति stage** मापा जाता है, न कि केवल code की प्रति line। Yujin reference सभी stages में ~95% weighted average रिपोर्ट करता है। उस schema को अपनाने से आपको एक coverage scorecard मिलता है जो सीधे contract पर map होता है।

## मौजूदा test frameworks पर प्रभाव

### Playwright

सीधा integration। `page.evaluate()` NAC.* calls invoke करता है। Layout assertions के लिए Selectors fallback के रूप में रहते हैं। Yujin reference में `tests/e2e-nac/specs/` पर 16 Playwright specs शामिल हैं।

### Cypress

`cy.window().then(win => win.NAC.click(id))`। वही pattern। Custom commands NAC calls को wrap करते हैं:
`cy.nacClick('invoice.save')`।

### Selenium

JavaScript executor: `driver.execute_script('return
window.NAC.click(arguments[0])', 'invoice.save')`।

### Jest + React Testing Library

```ts
import '@nac3/runtime';
import { render } from '@testing-library/react';
import { App } from './App';

test('save works', async () => {
  render(<App />);
  await window.NAC.click('invoice.save');
  expect(mockApi.save).toHaveBeenCalled();
});
```

NAC3 React Testing Library के साथ-साथ काम करता है, उसके विरुद्ध नहीं।

### Karma / Jasmine / पुराने runners

`window.NAC` के माध्यम से सीधा injection। कोई भी चीज़ जो browser context में JavaScript चला सकती है, काम करती है।

## अपनाने की लागत

### मौजूदा app

[migration playbook](AI_PLAYBOOK_MIGRATION.md) के अनुसार अनुमान:

- Decoration + manifest के लिए प्रति screen ~1 दिन।
- Test corpus migration के लिए प्रति screen ~1 दिन।
- 20-screen app के लिए कुल: एक engineer का ~6 सप्ताह का समय, जो 3-4 महीनों के भीतर maintenance बचत से वापस मिल जाता है।

### नई app

Built-in। Greenfield playbook NAC3 attributes को first-class concern के रूप में मानता है। कोई retrofit लागत नहीं।

## जोखिम + शमन

### जोखिम -- "हम LLM-generated tests पर भरोसा नहीं करते"

उचित है। LLM एक candidate तैयार करता है; एक मानव review + commit करता है। Copilot जैसा ही workflow। जो corpus ship होता है वह वही है जो team ने approve किया, न कि वह जो LLM ने लिखा।

### जोखिम -- "NAC ids समय के साथ tech debt बन जाते हैं"

सच है यदि आप उन्हें सड़ने दें। NAC ids को database column names की तरह treat करें: migration के माध्यम से rename करें, in-flight कभी delete न करें। `@nac3/runtime` CLI static lint के माध्यम से orphan ids को पकड़ता है।

### जोखिम -- "अगर NAC की adoption रुक जाए तो?"

Spec Apache-2.0 है। Runtime < 200KB है। सबसे बुरी स्थिति में: आप artifact के मालिक हैं, ids स्थिर रहते हैं। सबसे बुरी स्थिति भी CSS selectors से बेहतर है।

## यह भी देखें

- [NAC_TEST_MANUAL.md](../docs/NAC_TEST_MANUAL.md) -- मानकीकृत test playbook जिसे यह impact analysis underwrite करता है।
- [RPA_UIPATH.md](RPA_UIPATH.md) /
  [RPA_AUTOMATION_ANYWHERE.md](RPA_AUTOMATION_ANYWHERE.md) /
  [RPA_BLUE_PRISM.md](RPA_BLUE_PRISM.md) -- उसी contract के समीपवर्ती अनुप्रयोग।
- [COVERAGE_REPORT_2026_05_10.md](../docs/COVERAGE_REPORT_2026_05_10.md)
  -- Yujin reference के अपने coverage numbers।

## लाइसेंस

Apache-2.0.

---

*This is a machine translation of the canonical English
version at `/nac-spec/guides/IMPACT_TESTING.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
