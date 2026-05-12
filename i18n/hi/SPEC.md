---
translation_source: SPEC.md
translation_source_hash: 5ebb8103746daf5bf7877b67ebb3a44cf98b4e2cba1fd8ba30093e0fce1b9b76
translation_quality: machine_v1
translation_lang: hi
translation_date: 2026-05-11T13:11:32.281564+00:00
---

# NAC3 -- Native Agent Contract

**Version:** 2.2.0
**Status:** Stable
**License:** Apache-2.0
**Editor:** Yujin (yujin.app)

---

## 0. उद्देश्य

NAC3 एक contract है जो web UIs और उन्हें चलाने वाले agents के बीच परिभाषित होता है।
Agents में voice runners, LLM intermediaries, RPA bots,
accessibility tools, और end-to-end test runners शामिल हैं। यह contract निम्नलिखित निर्धारित करता है:

1. **Elements का नामकरण कैसे हो** -- ताकि कोई agent "save button क्लिक करो" कह सके और वह एक ही DOM node पर resolve हो जाए।
2. **Verbs कैसे लागू होते हैं** -- ताकि कोई agent `NAC.click(id)`,
   `NAC.fill(id, value)`, `NAC.tab(plugin, key)` आदि को बिना किसी per-app glue के call कर सके।
3. **Completion का संकेत कैसे मिले** -- ताकि agent को पता चले कि कोई step कब पूरा हुआ, प्रत्येक role के लिए एक निश्चित event family के साथ।
4. **Provenance कैसे सुरक्षित रहे** -- ताकि कोई downstream system यह बता सके कि click किसी वास्तविक उपयोगकर्ता का था या किसी synthesised प्रक्रिया का।

NAC3 आपके मौजूदा rendering framework के ऊपर एक पतली layer जोड़ता है। यह ARIA, React, Vue, या आपके design system को replace नहीं करता।

---

## 1. Roles

हर agent-relevant DOM element में `data-nac-role` होता है। Canonical roles इस प्रकार हैं:

| Role | अर्थ | उदाहरण |
|------|------|--------|
| `plugin` | एक self-contained UI module (एक page, panel, या widget collection)। | `<article data-nac-plugin="invoice">` |
| `section` | किसी plugin के अंदर एक landmark (header, body, footer, sidebar)। | `<section data-nac-role="section">` |
| `region` | किसी section के अंदर एक नामयोग्य क्षेत्र (card cluster, result list)। | `<div data-nac-role="region">` |
| `action` | एक clickable widget जो कोई verb trigger करता है (button, link-as-button)। | `<button data-nac-role="action" data-nac-action="save">` |
| `field` | एक input जिसे उपयोगकर्ता type या toggle करता है (text, number, checkbox, radio, date, file)। | `<input data-nac-role="field">` |
| `option` | किसी field के अंदर एक selectable option (combobox / select / radio group child)। | `<li data-nac-role="option">` |
| `tab` | एक switchable panel selector। **आवश्यक जब `data-nac-id` `^tab\.` से मेल खाए।** | `<button data-nac-role="tab" data-nac-id="tab.lines">` |
| `breadcrumb-item` | एक breadcrumb hop। | `<a data-nac-role="breadcrumb-item">` |
| `accordion-toggle` | एक expand/collapse control। | `<button data-nac-role="accordion-toggle">` |
| `step` | एक wizard step indicator। | `<li data-nac-role="step">` |
| `pagination-item` | एक paginated list में page-jump control। | `<button data-nac-role="pagination-item">` |
| `confirm-button` | किसी confirm dialog के अंदर confirm/cancel button। | `<button data-nac-role="confirm-button">` |
| `sort-control` | एक column sort header। | `<th data-nac-role="sort-control">` |
| `filter-control` | एक column filter trigger। | `<button data-nac-role="filter-control">` |
| `data-table` | एक data-table host (v2.1)। | `<table data-nac-role="data-table">` |
| `navigation` | एक landmark navigation region। **Tab नहीं।** | `<nav data-nac-role="navigation">` |
| `confirm-dialog` | किसी confirmation request का modal। | `<div data-nac-role="confirm-dialog">` |

इस सूची से बाहर के roles भविष्य के उपयोग के लिए reserved हैं। NAC-strict runtime को register-time पर अज्ञात roles को SHOULD reject करना चाहिए (v2.2)। NAC-permissive runtime अज्ञात roles को back-compat के लिए `action` मान सकता है (v1.9 और v2.0 default)।

---

## 2. नाम

हर agent-resolvable element में `data-nac-id` होता है। यह id:

- **एक dotted path होती है** (जैसे `deals.list.row.42.actions.delete`)।
  Dots semantic levels को अलग करते हैं; runtime इन्हें interpret नहीं करता,
  लेकिन मनुष्य और LLMs करते हैं।
- **`data-nac-plugin` scope के अंदर globally unique होती है।** दो
  अलग-अलग plugins एक ही id share कर सकते हैं; runtime `(plugin, id)` pair से resolve करता है।
- **Re-renders के बाद भी stable रहती है।** जो frameworks प्रत्येक render पर नई id बनाते हैं
  (random hashes, instance counters) वे इस contract को तोड़ते हैं।
- **UI redesigns के बाद भी stable रहती है।** कोई button toolbar से
  dropdown में चला जाए; उसकी id MUST वही रहनी चाहिए।

Reserved id prefixes (v2.1):

| Prefix | किसके लिए reserved |
|--------|-------------------|
| `tab.` | Tab buttons। Role MUST `tab` होना चाहिए। |
| `modal.` | Modal-scoped elements। Role leaf widget का role होता है। |
| `field.` | Form field shorthand। Role MUST `field` या `option` होना चाहिए। |
| `confirm.` | Confirm dialogs। |

---

## 3. Verbs

`data-nac-role="action"` element में `data-nac-action="<verb>"` हो सकता है
जो बताता है कि वह क्या करता है। Verb एक free-form snake-case identifier है
जो host और agent के बीच तय होता है। सामान्य verbs:

`save`, `cancel`, `submit`, `delete`, `edit`, `view`, `create`,
`approve`, `reject`, `send`, `download`, `upload`, `refresh`,
`expand`, `collapse`, `open`, `close`, `add_row`, `remove_row`।

`NAC.click_by_verb(plugin, verb)` किसी verb को उस plugin के अंतर्गत unique action पर resolve करके उसे click करता है। एक ही plugin के अंतर्गत एक ही verb share करने वाले कई actions एक manifest error हैं (lint: `duplicate_verb`)।

---

## 4. Manifest

हर plugin निम्न प्रकार से manifest register कर सकता है:

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

Manifest agent-facing source of truth है। कोई LLM intermediary जो यह तय करता है कि "उपयोगकर्ता ने 'guardar' कहा" वह plugin manifest देखता है, verb `save` ढूंढता है, और `NAC.click_by_verb('invoice', 'save')` emit करता है।

### 4.1 आवश्यक fields

- `plugin_slug` -- host element पर `data-nac-plugin` से मेल खाता है।
- `nac_version` -- वह NAC3 version जिसका यह manifest अनुपालन करने का दावा करता है। Runtime उन manifests को reject करता है जो अपने से ऊंचे version का दावा करते हैं।

### 4.2 वैकल्पिक fields

- `elements[]` -- named widgets की catalogue। प्रत्येक entry में `id` और `role` MUST होना चाहिए।
- `tabs[]` -- tabs के लिए एक अलग top-level array। `role:'tab'` वाले `elements[]` entries के समकक्ष। दोनों shapes मान्य हैं।
- `fields[]`, `actions[]`, `kpis[]`, `data_tables[]` -- typed
  sub-collections; role के अनुसार filter किए गए `elements[]` जैसी ही semantics। Demos वह shape चुनते हैं जो मनुष्यों को सबसे स्पष्ट लगे।

### 4.3 i18n

हर `label_i18n` में NAC3 के सभी 10 locales MUST शामिल होने चाहिए:

```
es, en, pt, fr, ja, zh, hi, ar, de, it
```

`NAC.autoRegister.watch()` पर `i18n_strict: 'permissive'` brownfield migration के दौरान आंशिक coverage की अनुमति देता है; production manifests में 10 locales होने चाहिए।

---

## 5. Public API

### 5.1 Imperative

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

### 5.1.1 Conformance helper (v2.2)

`NAC.bindAction(el, handler, ctx)` click handler जोड़ने का spec-अनुरूप तरीका है।
यह handler चलने के बाद (sync, throw, या Promise) स्वचालित रूप से `nac:action:succeeded`
(या `:failed`) emit करता है। यह एक unbinder लौटाता है। जब भी host इसे support करे,
raw `addEventListener('click', ...)` की जगह इसका उपयोग करें;
brownfield code पहले की तरह event manually emit कर सकता है।

### 5.1.3 Field editor (v2.3 preview)

`NAC.edit_field(nac_id)` एक modal खोलता है जो किसी user (या उनकी ओर से किसी agent) को
Word-style tools के साथ कोई भी text field संपादित करने देता है:

```ts
NAC.edit_field(nac_id: string): Promise<{ok:true}>
```

यह modal `plugin_slug='nac_editor'` के अंतर्गत इन NAC-3 callable verbs के साथ register होता है:

| Verb | प्रभाव |
|------|--------|
| `select_word` | caret पर स्थित शब्द को select करें |
| `select_sentence` | caret पर स्थित वाक्य को select करें |
| `select_all` | editor के भीतर ctrl-A |
| `replace` | selection को दिए गए text से बदलें |
| `delete_selection` | वर्तमान selection हटाएं |
| `ai_correct_syntax` | system prompt "fix grammar + spelling, return only fixed text" के साथ वर्तमान value को LLM intermediary पर POST करें; response से value बदलें |
| `save` | source field में वापस लिखें, input + change events dispatch करें, बंद करें |
| `cancel` | परिवर्तन छोड़ें, बंद करें |

Esc से बंद होता है (cancel)। Ctrl/Cmd+Enter से save होता है। overlay backdrop पर click करने से cancel होता है।

Spec sec 13 v2.3 में इस contract को औपचारिक रूप देगा; v2.2 runtime एक कार्यशील reference impl
ship करता है ताकि adopters इसे आज ही wire कर सकें।
किसी भी field पर इस प्रकार उपलब्ध है:

```js
NAC.edit_field('invoice.client_name');
// या intermediary द्वारा:
NAC.click_by_verb('myplugin', 'edit_field', { nac_id: 'invoice.client_name' });
```

### 5.1.2 Strict validation flag (v2.2)

`NAC.STRICT_VALIDATION` (boolean, v2.2 में default `false`)। जब `true` हो,
तो `NAC.register()` निम्न में से किसी भी स्थिति में `code='strict_validation'`
और एक `findings` array के साथ `Error` throw करता है:

- `manifest_role_unknown` -- entry की role canonical set से बाहर है।
- `tab_id_manifest_role_drift` -- id `^tab\.` से match करती है लेकिन role
  `'tab'` नहीं है।
- `manifest_dom_role_mismatch` -- mounted DOM element का
  `data-nac-role` manifest entry की role से अलग है।

v2.3 में default `true` हो जाएगा। v3.0 में यह flag हटा दिया जाएगा
(strict ही एकमात्र mode होगा)।

सभी async methods `NacError` के साथ reject करती हैं जिसका `code` इनमें से एक होता है:

- `not_found` -- नामित element/role/verb DOM में नहीं है।
- `invalid` -- argument का आकार गलत है।
- `timeout` -- side effect dispatch हुआ लेकिन conformance ack
  event 5 सेकंड के भीतर नहीं आया। **timeout का अर्थ वास्तविक विफलता है**:
  handler रुक गया हो सकता है, ack कभी wire नहीं हुआ, या network race हुई।
  Callers को timeout को विफलता मानना चाहिए जब तक कि किसी अन्य channel से
  side effect का प्रमाण न हो।

### 5.2 Introspection

```ts
NAC.describe():    { active: string|null, plugins: PluginSnap[] }
NAC.describe_v2(): { v2_scope_entries: [...], sitemap: ..., data_tables: [...] }
NAC.manifest(plugin_slug: string): Manifest|null
NAC.validate_global(opts?: {probe?: boolean}): Findings[]
```

### 5.3 Data tables (v2.1)

```ts
NAC.registerDataTable(spec: DataTableSpec): void
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

एक data table का एक `subkind` होता है:

- `collection` -- वैकल्पिक transactional commit के साथ क्रमबद्ध rows।
  Invoice lines, cart items, log entries के लिए उपयोग होता है।
- `matrix` -- row x column grid जहाँ प्रत्येक cell एक value रखती है।
  Permission matrices, schedule grids के लिए उपयोग होता है।
- `matrix-singletree` -- matrix जहाँ प्रत्येक row एक tree में सिकुड़ती है (दुर्लभ)।

---

## 6. Events

प्रत्येक action एक निर्धारित completion event emit करता है। Runtime का
`NAC.click()` इस event के लिए poll करता है और fire होने पर resolve करता है।

| Role | Success event | Failure event |
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

### 6.1 Event detail का आकार

प्रत्येक event detail में canonical id field और `plugin` होता है:

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

### 6.2 Host handler से emit करना

एक click handler को अपने synchronous side effect के बाद संबंधित success event
emit करना चाहिए:

```js
button.addEventListener('click', function (ev) {
  // ... कार्य करें ...
  document.dispatchEvent(new CustomEvent('nac:action:succeeded', {
    detail: { plugin: 'invoice', action_id: 'invoice.save' }
  }));
});
```

यदि कार्य asynchronous है, तो resolution के बाद emit करें। यदि कार्य
विफल हो, तो `{detail: {plugin, action_id, error: <message>}}` के साथ
`nac:action:failed` emit करें।

v2.2 runtime `NAC.bindAction(el, handler, ctx)` प्रदान करेगा
जो `addEventListener` को wrap करता है और स्वचालित रूप से emit करता है।

### 6.3 Click event का उपयोग क्यों नहीं?

DOM `click` event handler चलने से पहले fire होता है। NAC3 के contract को
यह जानना होता है कि **side effect कब पूरा हुआ**, न कि click कब शुरू हुआ।
इसीलिए अलग event family का उपयोग किया जाता है।

---

## 7. Provenance

### 7.1 isTrusted

`event.isTrusted` उन clicks के लिए `true` होता है जो user द्वारा शुरू किए गए हों (असली mouse, असली keypress, screen reader activation), और synthesised clicks के लिए `false` (`element.click()`, built MouseEvent का dispatchEvent, automation)।

NAC3 को यह जानकारी success event में `event.detail.is_trusted` के ज़रिए उपलब्ध करानी **चाहिए**। जो Hosts security-sensitive कार्य करते हैं (payment, deletion), वे `is_trusted === true` की शर्त लगा सकते हैं और synthetic clicks को अस्वीकार कर सकते हैं। Reference demo `example-v20-full.php` में एक button pair (`v20_panel.istrusted_real` और `v20_panel.istrusted_fake`) शामिल है जो इस अंतर को दर्शाता है।

### 7.2 HMAC-signed manifests

एक manifest में `provenance` block हो सकता है:

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

Runtime, manifest के stable serialisation (signature को छोड़कर) पर expected HMAC की गणना करता है और उन manifests को अस्वीकार कर देता है जिनकी signature मेल नहीं खाती। इसका उपयोग multi-tenant deployments में किया जाता है ताकि कोई tenant दूसरे tenant के manifest की नकल न कर सके।

### 7.3 Threat model

पूरे threat model के लिए `SECURITY.md` देखें। संक्षेप में:

- NAC3 **user** को authenticate नहीं करता। यह आपकी auth layer की ज़िम्मेदारी है।
- NAC3 **manifest** को authenticate करता है (HMAC)।
- NAC3 असली clicks और synthesised clicks में अंतर करता है (isTrusted), ताकि host sensitive verbs के लिए बाद वाले को अस्वीकार कर सके।
- NAC3 किसी ऐसे malicious agent से सुरक्षा नहीं देता जो user-level access के साथ चल रहा हो। ऐसा agent वह सब कुछ कर सकता है जो user कर सकता है।

---

## 8. Conformance levels

एक page **NAC-1 conformant** है यदि:

- हर clickable widget जिसे agent को operate करना चाहिए, उस पर `data-nac-id` और `data-nac-role` मौजूद हो।
- हर `data-nac-role="action"` element अपना side effect होने के बाद `nac:action:succeeded` fire करे।
- Page कम से कम एक plugin manifest `NAC.register()` के ज़रिए register करे।
- हर advertised id के लिए `NAC.click(id)` काम करे।

एक page **NAC-2 conformant** है यदि वह उपरोक्त के साथ-साथ:

- अपने manifest में `tabs[]`, `fields[]`, `actions[]` arrays को DOM से infer करने की बजाय explicitly register करे।
- हर user-facing label के लिए सभी 10 NAC3 locales को cover करने वाला `label_i18n` प्रदान करे।
- v2.0 brownfield primitives implement करे: scope tree, ephemeral capture, autoRegister.watch।
- `NAC.validate_global({probe: false})` को zero `error`-severity findings के साथ pass करे।

एक page **NAC-3 conformant** है यदि वह उपरोक्त के साथ-साथ:

- HMAC-signed manifests रखे।
- Security-sensitive verbs के लिए `isTrusted` का अंतर करे।
- `NAC.validate_global({probe: true})` को zero findings के साथ pass करे।

NPM package का CLI (`npx @nac3/runtime validate <url>`) किसी page द्वारा प्राप्त उच्चतम level की रिपोर्ट करता है।

---

## 9. Versioning

NAC3 semver का पालन करता है:

- **Major** bump: public API या wire formats में breaking change। Adopters को code बदलना होगा।
- **Minor** bump: नए features, backward-compatible। पुराना code काम करता रहेगा।
- **Patch** bump: bug fixes, केवल documentation में बदलाव।

Deprecation policy: version `X.Y.0` में `@deprecated` चिह्नित feature को `(X+1).0.0` से पहले नहीं हटाया जाएगा। Release notes में हर removal को स्पष्ट रूप से document किया जाता है।

NPM package version, spec version को mirror करता है: `@nac3/runtime@2.1.3` तीन patch revisions के साथ NAC3 v2.1 implement करता है।

---

## 10. Validators

### 10.1 Runtime: `NAC.validate_global()`

Live DOM, registered manifests और i18n catalog को traverse करता है और findings का एक array return करता है:

```ts
{
  severity: 'error' | 'warn' | 'info',
  code:     string,                     // e.g. 'tab_role_drift'
  nac_id:   string | null,
  message:  string,
  detail:   Record<string, any>
}
```

Findings codes patch releases में stable रहते हैं; नए codes केवल minor bumps में आते हैं।

### 10.2 CLI: `npx @nac3/runtime validate <target>`

`validate_global` के साथ-साथ HTML/manifest coherence का static lint भी करता है। Exit codes:

- `0` -- configured threshold से अधिक severity की कोई finding नहीं।
- `1` -- findings मौजूद हैं।
- `2` -- target खुद load होने में विफल रहा।

CI में उपयोगी: `npx @nac3/runtime validate ./dist/index.html --severity=error`।

---

## 11. NAC3 के आसपास का system

NAC3 एक contract layer है। किसी NAC-conformant page को voice-driven app में बदलने के लिए आपको यह भी चाहिए:

1. **एक speech-to-text source** (browser SpeechRecognition, Whisper API, आदि)।
2. **एक LLM intermediary** जो user text + page का `NAC.describe()` snapshot + एक i18n hint लेकर structured actions emit करे: `[{kind: 'click', nac_id: 'X'}, {kind: 'fill', nac_id: 'Y', value: 'Z'}]`। `guides/LLM_WIRING.md` देखें।
3. **एक chat client** जो conversation को hold करे और actions dispatch करे। Reference है `js/nac-chat-client.js`।
4. **एक text-to-speech sink** बोले गए replies के लिए (browser SpeechSynthesis, ElevenLabs, आदि)।

NAC3 केवल step 2 के input/output shape को standardise करता है (`NAC.describe()` snapshot + action shape)। Steps 1, 3, 4 spec के बाहर हैं; आप अपनी पसंद के अनुसार इन्हें जोड़ सकते हैं।

---

## 12. Stability guarantees

यह spec क्या वादा करती है:

1. Section 1 में canonical roles का set कम नहीं होगा। Minor versions में नए roles जोड़े जा सकते हैं।
2. Section 6 में event family का नाम नहीं बदला जाएगा। Minor versions में नए events जोड़े जा सकते हैं।
3. `NAC.click`, `NAC.fill` आदि के verbs का shape minor versions में नहीं बदलेगा। नए optional `opts` fields आ सकते हैं।
4. `validate_global` finding codes को minor versions में अलग-अलग conditions के लिए reuse नहीं किया जाएगा।

यह spec क्या वादा नहीं करती:

1. Error messages की सटीक wording (वे i18n catalog strings हैं; localisations बदल सकती हैं)।
2. Elements खोजने की DOM strategy (आज `querySelector`; बाद में faster index में जा सकती है)।
3. Internal manifest cache layout। Host side से manifests को write-only और agent side से read-only मानें।

---

## 13. Open questions (अलग से tracked)

- क्या `data-nac-role="navigation"` कभी tab में resolve होना चाहिए? फिलहाल नहीं (v2.1)। v22 roadmap stricter rejection के पक्ष में है।
- क्या `NAC.click()` relative ids accept करे (जैसे `'./save'` का अर्थ "active plugin के अंतर्गत save")? v2.1 में नहीं; संभवतः v2.3 में।
- क्या manifests plugins में inheritance / extension support करें (एक base manifest जिसे tenant extend करे)? v3.0 candidate के रूप में tracked है।

---

## 13.5 Governance

NAC3 वर्तमान में Yujin द्वारा steward किया जाता है। Spec Apache 2.0 के अंतर्गत publish है; reference runtime MIT के अंतर्गत। Yujin यह प्रतिबद्धता देता है कि यदि और जब adoption neutral governance को उचित ठहराए, तो NAC3 को एक neutral foundation (W3C community group, Linux Foundation, या समकक्ष industry body) में स्थानांतरित किया जाएगा। तब तक, spec changes `CONTRIBUTING.md` में documented RFC process का पालन करती हैं, जिसमें public API या wire formats को प्रभावित करने वाले किसी भी बदलाव के लिए कम से कम 14 दिनों की public comment period होती है।

Adopters के लिए: Apache 2.0 + MIT license का संयोजन यह सुनिश्चित करता है कि Yujin की corporate स्थिति में किसी भी बदलाव के बावजूद spec और runtime जीवित रहें। आप आज और हमारे जाने के बाद भी दोनों को fork, run और ship कर सकते हैं। यह document इस प्रतिबद्धता को दर्ज करता है ताकि उस survival का रास्ता implicit नहीं, बल्कि explicit हो।

---

## 14. Reference implementation

Canonical implementation वह reference runtime है जो NPM package `@nac3/runtime` के रूप में distribute किया जाता है। Runtime v2.1 के लिए feature-complete है और इसमें शामिल हैं:

- `js/nac.js` -- v1.9 base + section 5 में public API।
- `js/nac-v2-extensions.js` -- v2.0 brownfield primitives (scope tree, capture ephemeral, autoRegister, HMAC, isTrusted)।
- `js/nac-chat-client.js` -- एक reference chat client जो voice + LLM + dispatcher को जोड़ता है।

अन्य implementations का स्वागत है (native automation runners के लिए Python, embedded agents के लिए Rust, आदि)। Authority JS code नहीं, बल्कि spec है।

---

*यह document canonical NAC3 v2.1 specification है। इस file में किए गए edits spec changes माने जाते हैं और RFC की आवश्यकता होती है; `CONTRIBUTING.md` देखें।*

---

*This is a machine translation of the canonical English
version at `/nac-spec/SPEC.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
