---
translation_source: docs/NAC_V22_ROADMAP.md
translation_source_hash: 8d844659a0ed290a00c015c5b2e875d6d9b3d52b18f02f8c182169927d3d4750
translation_quality: machine_v1
translation_lang: hi
translation_date: 2026-05-11T15:27:19.125713+00:00
---

# NAC3 v2.2 -- रोडमैप

NAC3 = **Native Agent Contract**।

शुरुआत 2026-05-09। यह फ़ाइल NAC3 spec के अगले माइनर वर्शन के लिए evolution items जमा करती है। हर सेक्शन स्वतंत्र है: एक problem statement, जिस bug class को यह रोकता है, प्रस्तावित contract change, और implementation notes।

**2026-05-10 तक की स्थिति:** v2.2 SHIPPED। Items V22-01 +
V22-02 + V22-03 + V22-04 सभी `js/nac.js` + `@nac3/runtime`
2.2.0 NPM पैकेज में हैं। यह फ़ाइल अब इस वर्शन का canonical changelog है।

| Item | Status | Commit |
|------|--------|--------|
| V22-01 strict validator | SHIPPED | 6c2b1866 |
| V22-02 bindAction helper | SHIPPED | 6c2b1866 |
| V22-03 locale detector hardening | SHIPPED 2026-05-09 | f631d77a |
| V22-04 tab_by_label parens normalisation | SHIPPED 2026-05-09 | f631d77a |
| V23-01 field editor primitive (preview) | DEMO SHIPPED 2026-05-11 | (example-v23-editor.php + packages/nac/test/v23-editor.mjs 8/8 PASS) |

---

## V22-01 -- Constructor (`NAC.register`) एक strict validator बनता है

**Problem class।** Brownfield demos manifest elements को non-canonical role values के साथ declare कर सकते हैं (जैसे tab पर `role:'navigation'`, `'action'` की जगह `role:'button'` आदि)। मौजूदा constructor जो भी shape मिलती है उसे स्वीकार करके as-is स्टोर कर लेता है। bug तब सामने आती है जब runtime में API (`NAC.tab()`, `NAC.tab_by_label()`, `NAC.click()`) element नहीं ढूंढ पाता, क्योंकि canonical DOM query (`[data-nac-role="tab"]`) match नहीं करती। तब तक demo deploy हो चुका होता है, user टूटा हुआ voice command hit कर चुका होता है, और runtime सही तरह से `tab X missing` throw करता है -- एक भ्रामक error क्योंकि element DOM में मौजूद है, बस गलत role के साथ।

**Concrete trigger (2026-05-09)।** Pablo `example-v21-data-table.php` पर `ve a pestana permisos` बोलता है। LLM इसे `NAC.tab('invoice_edit_modal','tab.permissions')` में resolve करता है। button DOM में मौजूद है लेकिन `data-nac-role="navigation"` के साथ (demo author ने HTML-semantic आधार पर सेट किया था: tabs IS navigation हैं)। Runtime "tab tab.permissions missing" throw करता है जबकि button वहीं मौजूद है। इसी root cause से उसी session में पहले `tab_by_label('Lines (collection)')` भी miss हुई थी।

**तीन guard layers को यह पकड़ना चाहिए था, लेकिन नहीं पकड़ा।**

| Layer | किसे detect करना चाहिए... | आज क्या करता है |
|---|---|---|
| Pre-commit lint | PHP/HTML demo files में role drift | मौजूद नहीं है |
| `NAC.register(manifest)` (register-time) | non-canonical roles, id/role mismatch | सब कुछ चुपचाप accept करता है |
| `NAC.validate_global()` (lint-time) | `m.elements[]` के अंदर role drift | केवल `m.tabs[]` की उपस्थिति जाँचता है |

Runtime API layer (`NAC.tab` आदि) **चौथा** guard है, और आज केवल यही fire होता है -- end user को runtime error के रूप में। तब तक नुकसान सबसे ज़्यादा हो चुका होता है।

**v2.2 के लिए प्रस्तावित contract change।**

`NAC.register` को manifest स्टोर करने से पहले उसे validate करना MUST है।
Validation rules:

1. **Known role enumeration।** हर `m.elements[i].role` canonical role set का member होना चाहिए (`_CLICK_EVENT_FAMILY` को extend करता है):

   ```
   action, field, option, tab, breadcrumb-item, accordion-toggle,
   step, pagination-item, confirm-button, sort-control,
   filter-control, data-table, plugin, section, region,
   navigation, banner, complementary, contentinfo, button
   ```

   अज्ञात roles -> `console.error` + register call reject।
   Landmark roles (`navigation`, `banner`, आदि) स्वीकार किए जाते हैं लेकिन केवल उन elements पर जिनका corresponding DOM node एक region container है, clickable widget नहीं।

2. **Id/role coherence।** अगर `e.id` `^tab\.` से match करता है तो `e.role === 'tab'` ज़रूरी है। अगर `e.id` `^modal\.` से match करता है तो `e.role === 'action'` (या action का sub-role) ज़रूरी है। कोई भी mismatch -> `console.error` + reject। id field की grammar भी एक contract है; आज यह implicit है।

3. **DOM coherence (best effort)।** जब `register` DOM parse होने के बाद call होता है (सामान्य path), तो DOM में `[data-nac-id="<e.id>"]` lookup करें। अगर मिला और उसका `data-nac-role`, `e.role` से अलग है, तो `console.error` + reject। यह Pablo का 2026-05-09 वाला case पकड़ता है: manifest कहता है `role:'tab'` लेकिन HTML अभी भी `data-nac-role="navigation"` कहता है (या उलटा)। DOM ready होने से पहले call होने पर, check को `DOMContentLoaded` post-pass तक defer करें।

4. **Migration helper (एक release window)।** v2.2.0 के लिए उपरोक्त `console.error` emit करते हैं लेकिन throw नहीं करते -- adopters को migrate करने के लिए एक window चाहिए। v2.3.0 से वे `RegisterError` throw करेंगे और manifest पूरी तरह reject होगा। Runtime में `NAC.STRICT_VALIDATION` flag के ज़रिए track किया जाता है जो v2.2 में `false` और v2.3 में `true` default होगा।

**`NAC.validate_global()` extension।**

तीन नए findings जोड़ें:

- `manifest_role_unknown` -- किसी element का role canonical set से बाहर है।
- `manifest_dom_role_mismatch` -- `<id>` के लिए manifest का role DOM के `data-nac-role` attribute से अलग है।
- `tab_role_drift` -- DOM में कोई `<button>` (या कोई भी clickable) का `data-nac-id="tab.X"` है लेकिन `data-nac-role` `"tab"` नहीं है -- चाहे manifest entry मौजूद हो या नहीं। HTML-only drift पकड़ता है जिसे manifest validator परिभाषा के अनुसार miss करता है।

हर finding की severity default रूप से `error` है; `{ kind: 'warn' }` प्रति project override किया जा सकता है।

**Pre-commit lint (अलग deliverable, वही drift रोकता है)।**

एक नया node script `tools/nac/check_demos.mjs` `yujin.app/nac-spec/` में हर `*.php` और `*.html` पढ़ता है, cheerio (या lightweight path के लिए regex) के ज़रिए pseudo-DOM बनाता है, inline scripts से हर `NAC.register({...})` call निकालता है, और वही coherence rules cross-check करता है। GitHub Actions और local `pre-commit` git hook से जुड़ा है। कोई भी rule fail होने पर commit block करता है।

**Effort estimate।**

| Task | कहाँ | Effort |
|---|---|---|
| `NAC.register` strict mode | `js/nac.js` | 2h |
| `validate_global` new findings | `js/nac.js` | 2h |
| Pre-commit lint script | `tools/nac/check_demos.mjs` | 4h |
| मौजूदा demos पर migration sweep | `example-v*.php` | 1h |
| Spec में doc updates | `docs/spec.md` आदि | 1h |
| Tests + CI wiring | `tests/` + `.github/workflows/` | 2h |

कुल: ~12h focused।

**Backwards compatibility।**

v2.2 release notes में घोषित करना होगा:
- `NAC.register` अब role drift पर `console.error` emit करता है (non-throwing)।
- v2.3 उन्हीं conditions पर `RegisterError` throw करना शुरू करेगा।
- Adopters को ship करने से पहले `NAC.validate_global()` चलाना चाहिए।

इस repo के मौजूदा 6 demos के लिए migration path commit `0633e080` (2026-05-09) तक पहले ही हो चुकी है: v21 demo के tab buttons + manifest को `role:'tab'` में सही किया गया।

---

## V22-02 -- Action-ack contract enforcement

**समस्या का प्रकार।** जो click handlers अपना काम synchronously करते हैं, उन्हें side effect के बाद `dispatchEvent(new CustomEvent('nac:action:succeeded', {detail:{plugin,action_id}}))` dispatch करना **जरूरी** है। Brownfield panels अक्सर यह भूल जाते हैं। इसके बाद runtime 5s का ack-poll timeout कर देता है, भले ही side effect हो चुका हो — और chat या agent `No pude ejecutar X: timeout` रिपोर्ट करता है।

**ठोस ट्रिगर (2026-05-09)।** Pablo: `hide` -> panel सही से छुप जाता है, लेकिन chat कहता है "No pude ejecutar v20_panel.toggle: timeout"। v20-panel के हर button के साथ यही हुआ।

**पिछला workaround गलत था।** Commit `ad200e4c` ने chat agentic loop में `err.code === 'timeout'` को success मानकर दबा दिया था। Pablo ने सही पकड़ा कि यह असली failures (handler hung, network race, unhandled exception) को छुपा रहा था और runtime के एकमात्र भरोसेमंद signal को तोड़ रहा था। `c9bf2bdb` में revert किया गया।

**सही fix पहले ही ship हो चुकी है।** `example-v20-full.php` में `bind()` को wrap किया गया ताकि हर handler के बाद `nac:action:succeeded`/`nac:action:failed` auto-emit हो। यह `c9bf2bdb` में हो चुका है।

**v2.2 के लिए प्रस्तावित contract बदलाव।**

Runtime को एक helper PROVIDE करना चाहिए:

```js
NAC.bindAction(el, handler, { plugin, action_id })
```

जो ack emission का काम खुद संभाले। यह `addEventListener('click', handler)` जैसा ही interface है, लेकिन conformance contract पहले से built-in है। जो demos इस helper को अपनाएंगे, वे इसे भूल नहीं सकते।

`validate_global` में एक नया finding जोड़ा जाएगा:

- `action_handler_without_ack` -- instrumentation के जरिए detect होगा: `validate_global` के दौरान validator एक controlled context में हर `data-nac-role="action"` element पर synthetic click dispatch करेगा, 500ms तक `nac:action:succeeded` सुनेगा, और जो fire नहीं करते उन्हें flag करेगा।

यह finding opt-in है (`NAC.validate_global({ probe: true })`) क्योंकि synthetic clicks के side effects होते हैं।

**अनुमानित effort।** Helper के लिए ~3h + probe-based finding के लिए ~4h।

---

## V22-03 -- Locale-switch detector hardening

**समस्या का प्रकार।** Chat client के language detector में bare 2-letter locale codes (`'de'`, `'es'`, `'en'`) कई भाषाओं के prepositions और articles से टकराते हैं। `cambia DE pestana` ने chat को German में switch कर दिया।

**Fix पहले ही ship हो चुकी है।** `nac-chat-client.js` के `_detectLangSwitch` में अब bare 2-letter codes के लिए एक explicit `LOCALE_TRIGGER` (`idioma`/`language`/`sprache`/...) का साथ होना जरूरी है। यह `f631d77a` में हो चुका है।

**v2.2 के लिए प्रस्ताव।** Locale detector को chat client से निकालकर एक NAC3 primitive में ले जाएं, ताकि हर brownfield chat embed को वही hardened detector मिले। Spec में false-positive class को स्पष्ट रूप से document करें ताकि भविष्य के implementations यह bug दोबारा न लाएं।

**अनुमानित effort।** ~2h।

---

## V22-04 -- `tab_by_label` natural-language tolerance

**पहले से शामिल है।** Parens stripping (`"Lines (collection)"` से `"Lines"` और `"Lines tab"` match होना) `f631d77a` में ship हो चुका है। यह कोई legacy fallback **नहीं** है — यह LLM-quoted button text का legitimate normalisation है। Spec में इसे canonical matcher behaviour के रूप में document करें।

**अनुमानित effort।** ~1h, केवल documentation।

---

## v2.2 के scope से बाहर (v2.3+ के लिए deferred)

- Composable role hierarchies (`role:'tab.primary'` बनाम `role:'tab.secondary'`): nice-to-have है लेकिन कोई ठोस ट्रिगर नहीं।
- Manifest hot-reload: अभी भी दुर्लभ; मौजूदा page reload ठीक है।
- सभी 10 locales में एक साथ multi-locale label search (आज matcher उन्हें serially iterate करता है, जो ~20 tabs per plugin के लिए ठीक है)।

---

## V23-01 -- Field editor primitive (preview shipped)

**समस्या का प्रकार।** Voice runners और agents के पास `<input>` या `<textarea>` के अंदर text को गहराई से manipulate करने का कोई सामान्य तरीका नहीं है — वे केवल `NAC.fill(id, value)` कर सकते हैं जो सब कुछ replace कर देता है। Real-world tasks (किसी paragraph में grammar सुधारना, केवल selection replace करना, AI से sentence improve करना) के लिए बारीक verbs चाहिए। आज हर adopter जिसे यह चाहिए, अपना खुद का solution बनाता है।

**समाधान।** एक नया runtime primitive `NAC.edit_field(nac_id)` एक modal खोलता है जो editing surface का मालिक होता है और अपना खुद का plugin `nac_editor` 8 canonical verbs के साथ register करता है:

| Verb | विवरण |
|------|-------|
| `select_word` | caret पर मौजूद word को select करें |
| `select_sentence` | caret पर मौजूद sentence को select करें |
| `select_all` | सारा text select करें |
| `replace` | selection को दिए गए text से replace करें |
| `delete_selection` | मौजूदा selection delete करें |
| `ai_correct_syntax` | मौजूदा value को chat backend पर POST करें, AI-corrected version से replace करें |
| `save` | source field में वापस लिखें, modal बंद करें |
| `cancel` | discard करें, modal बंद करें |

Modal का manifest idempotently register होता है (कई `edit_field` calls एक ही `nac_editor` plugin share करते हैं)। सभी verbs में सभी 10 locales के लिए `label_i18n` है।

**स्थिति:**
- Runtime: `js/nac.js` में 2026-05-10 को SHIPPED (`edit_field` + `_editorRegisterManifest` + ack-emitting modal handlers functions)।
- Demo: `example-v23-editor.php` पर 2026-05-11 को SHIPPED (3 editable fields + `nac:action:succeeded` से जुड़े live verb counters)।
- Tests: `packages/nac/test/v23-editor.mjs` पर 2026-05-11 को SHIPPED (8/8 PASS): exists + invalid id throws + invalid role throws + mounts modal + registers plugin + idempotent + cancel closes + save closes।
- Spec: v2.3 GA cycle के हिस्से के रूप में SPEC.md sec 13 में section जोड़ा जाना है।

**GA तक की effort।** जो पहले से है उससे आगे: ja/zh/ar/hi के लिए native-locale label review (~2hrs), Playwright e2e visual spec (~3hrs), SPEC.md में spec text (~2hrs)।

---

## Items इस doc से spec में कैसे जाते हैं

1. Runtime change को feature flag के पीछे implement और ship करें।
2. Demos को update करें ताकि वे नई strict validation pass करें।
3. कम से कम एक release cycle तक production में soak करें, flag default `warn` (non-throwing) पर रखें।
4. Rule को `docs/spec.md` में move करें और अगले minor में default को `error` (throwing) पर bump करें।
5. इस roadmap से entry हटाएं और `docs/CHANGELOG.md` में एक one-line entry जोड़ें।

---

*This is a machine translation of the canonical English
version at `/nac-spec/docs/NAC_V22_ROADMAP.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
