---
translation_source: guides/AI_PLAYBOOK_NEW_PROJECT.md
translation_source_hash: 6586a966938a6d84086a8b79805cde15886536b6718b79526ff7d16d202686fe
translation_quality: machine_v1
translation_lang: hi
translation_date: 2026-05-11T15:00:28.053777+00:00
---

# AI Playbook -- नया NAC-3 प्रोजेक्ट शुरू करें

**NAC3 संस्करण:** 2.2 stable + v2.3 interop preview.
**लक्षित पाठक:** कोई भी AI agent (Claude, GPT, Gemini, local LLM) जिसे
NAC-3 अनुरूप प्रोजेक्ट को शुरू से bootstrap करने का काम सौंपा गया हो।
**प्रारूप:** चरण-दर-चरण runbook। हर चरण में WHAT, HOW, ASSERT है।
कोई अस्पष्टता नहीं।

जब कोई इंसान **"let's start a new NAC-3 project"** या
इससे मिलती-जुलती बात कहे, तो इस फ़ाइल को पढ़ने वाले AI agent को
नीचे दिए गए चरण क्रम से निष्पादित करने होंगे और आगे बढ़ने से पहले
हर gate को assert करना होगा।

---

## Step 0 -- इंसान से scope की पुष्टि करें

कोई भी कोड लिखने से पहले ठीक ये सवाल पूछें:

1. **Framework**: React, Angular, Vue, Svelte, vanilla, या
   server-rendered (PHP/Rails/Django)?
2. **Languages**: लॉन्च के समय ऐप को 10 NAC3 locales में से कौन-से
   support करने होंगे? (es, en, pt, fr, it, de, ja, zh, hi, ar)
3. **Chat backend**: क्या ऐप अपना LLM intermediary expose करेगा
   (endpoint प्रदान करेगा) या hosted Yujin chat उपयोग करेगा?
4. **Provenance**: Multi-tenant है? अगर हाँ, तो HMAC manifest
   signing की योजना बनाएं।
5. **Voice**: केवल push-to-talk, hands-free, या दोनों?
6. **Interop (v2.3 preview)**: क्या यह ऐप अन्य NAC3 hosts (Yujin Pilot, peer apps)
   द्वारा import किया जा सकेगा? हाँ -> MCP server tools expose करें।

हर उत्तर नोट करें। ये सभी आगे के हर निर्णय को प्रभावित करते हैं।

---

## Step 1 -- प्रोजेक्ट scaffold करें

### React (Vite)

```bash
npm create vite@latest <slug> -- --template react-ts
cd <slug>
npm install
npm install @nac3/runtime@^2.2.0
```

### Angular

```bash
npx -p @angular/cli ng new <slug> --style=css --routing=true --strict
cd <slug>
npm install @nac3/runtime@^2.2.0
```

### Vanilla (HTML + JS + PHP, कोई framework नहीं)

बनाएं:
- `index.html` जिसमें `<body data-nac-plugin="app">` हो।
- `js/app.js` जिसमें imports हों।

### Server-rendered

`@nac3/runtime` को CDN के ज़रिए embed करें:

```html
<script src="https://yujin.app/nac-spec/js/nac.js?v=v22"></script>
<script src="https://yujin.app/nac-spec/js/nac-v2-extensions.js?v=v22"></script>
```

**Assert:** `npm run build` (या framework का समकक्ष) बिना किसी error के
सफल हो। Browser में खोलें; `window.NAC` defined हो।

---

## Step 2 -- Shell को decorate करें

अपने template के **root container** में जोड़ें:

```html
<div data-nac-plugin="<your-app-slug>" class="app">
  ...
</div>
```

**हर clickable widget** (buttons, links-as-buttons) में जोड़ें:

```html
<button
  data-nac-id="<slug>.<verb>"
  data-nac-role="action"
  data-nac-action="<verb>"
  onclick="...">
  ...
</button>
```

**हर form field** (input, textarea, select) में जोड़ें:

```html
<input
  data-nac-id="<slug>.<field-name>"
  data-nac-role="field"
  ... />
```

**हर tab button** में जोड़ें (spec सख्त है: `^tab\.` id में role `tab` होना
अनिवार्य है):

```html
<button
  data-nac-id="tab.<key>"
  data-nac-role="tab"
  onclick="...">
  ...
</button>
```

**Assert:** `npx @nac3/runtime validate ./src` में zero error-severity
findings आएं। Browser console से `NAC.describe()` एक ऐसा tree
return करे जिसमें `data-nac-plugin` matches हों।

---

## Step 3 -- Manifest लिखें

`src/nac/manifest.ts` (या समकक्ष) बनाएं:

```ts
const li = (es:string,en:string,pt:string,fr:string,it:string,
            de:string,ja:string,zh:string,hi:string,ar:string) =>
  ({ es, en, pt, fr, it, de, ja, zh, hi, ar });

export const APP_MANIFEST = {
  plugin_slug: '<your-app-slug>',
  version: '1.0.0',
  nac_version: '2.2',
  elements: [
    {
      id: '<slug>.save',
      role: 'action',
      actions: [{
        verb: 'save',
        label_i18n: li('Guardar','Save','Salvar','Sauver','Salva',
                       'Speichern','保存','保存','sahejna','حفظ')
      }],
      label_i18n: li(/* same 10 */)
    },
    // ... बाकी सभी elements ...
  ]
};
```

**ज़रूरी नियम:**
- हर `label_i18n` में सभी 10 supported locales होने चाहिए। अधूरा
  भरा होना v2.2 strict-validator finding है।
- `^tab\.` से मेल खाने वाले हर `id` में `role: 'tab'` होना चाहिए।
- हर `id` plugin-namespaced होना चाहिए (जैसे `invoice.save`,
  न कि सिर्फ `save`)।
- UI redesign के बाद भी IDs स्थिर रहने चाहिए।

**Assert:** `NAC.validate_global({probe: false})` में 0
error-severity findings आएं।

---

## Step 4 -- Boot पर manifest register करें

### React

```tsx
import { useEffect } from 'react';
import '@nac3/runtime';
import '@nac3/runtime/extensions';
import { APP_MANIFEST } from './nac/manifest';

export function App() {
  useEffect(() => {
    window.NAC?.register(APP_MANIFEST);
  }, []);
  // ...
}
```

### Angular

```ts
import { Injectable } from '@angular/core';
import '@nac3/runtime';
import '@nac3/runtime/extensions';
import { APP_MANIFEST } from './nac/manifest';

@Injectable({ providedIn: 'root' })
export class NacBoot {
  constructor() {
    (window as any).NAC?.register(APP_MANIFEST);
  }
}
```

`NacBoot` को अपने `AppComponent` में inject करें।

### Vanilla

```html
<script type="module">
import { APP_MANIFEST } from './nac/manifest.js';
window.NAC.register(APP_MANIFEST);
</script>
```

**Assert:** `NAC.list_registered_plugins()` में
`['<your-app-slug>']` return हो।

---

## Step 5 -- हर click handler से ack contract emit करें

`data-nac-role="action"` से decorated हर button के लिए, आपके
click handler को अपना synchronous side effect पूरा होने के बाद
`nac:action:succeeded` emit करना होगा।

### Pattern A -- `NAC.bindAction` के ज़रिए (v2.2 helper, अनुशंसित)

```ts
const btn = document.querySelector('[data-nac-id="<slug>.save"]');
NAC.bindAction(btn, function (ev) {
  saveInvoice();          // आपका side effect
}, { plugin: '<slug>', action_id: '<slug>.save' });
```

`bindAction` sync, async (Promise), और throw — तीनों cases को
स्वचालित रूप से संभालता है।

### Pattern B -- manual emission

```ts
button.addEventListener('click', function () {
  saveInvoice();
  document.dispatchEvent(new CustomEvent('nac:action:succeeded', {
    detail: { plugin: '<slug>', action_id: '<slug>.save' }
  }));
});
```

अन्य roles के लिए canonical event family emit करें:
- `role="field"` -> `nac:field:changed` (detail: `{plugin, field_id, value}`)
- `role="tab"` -> `nac:tab:activated` (detail: `{plugin, tab_id}`)
- पूरी table के लिए SPEC.md section 6 देखें।

**Assert:** Browser console से:
```js
document.addEventListener('nac:action:succeeded', e => console.log(e.detail));
await NAC.click('<slug>.save');
// यह print होना चाहिए: {plugin: '<slug>', action_id: '<slug>.save', ...}
```

---

## Step 6 -- Chat panel जोड़ें

Reference chat client embed करें या Yujin Pilot (external) उपयोग करें।

### Option A -- `nac-chat-client.js` embed करें

```html
<aside class="chat" data-nac-plugin="chat" aria-hidden="true">
  <header class="chat-head">...</header>
  <div id="chat-log" data-nac-id="chat.log" data-nac-role="region"></div>
  <input id="chat-input" data-nac-id="chat.input" data-nac-role="field">
  <button id="chat-send" data-nac-id="chat.send" data-nac-role="action">send</button>
</aside>

<script src="https://yujin.app/nac-spec/js/nac-chat-client.js?v=v22"></script>
<script>
  NacChat.init({
    endpoint: '/api/your-llm-intermediary',
    chatLog: document.getElementById('chat-log'),
    input:   document.getElementById('chat-input'),
    sendBtn: document.getElementById('chat-send')
  });
</script>
```

`endpoint` आप प्रदान करते हैं -- वह LLM intermediary backend जो
`{prompt, lang, history, nac_tree}` receive करता है और
`{message, actions[]}` return करता है। `LLM_WIRING.md` देखें।

### Option B -- Yujin Pilot पर छोड़ें

Chat बिल्कुल embed न करें। उपयोगकर्ताओं को बताएं "इस ऐप पर voice + chat
के लिए Yujin Pilot (yujin.app/pilot) install करें"। Pilot का MCP
scanner आपका ऐप खोजता है और उसे अपने central cockpit से चलाता है।

---

## Step 7 -- Test corpus चलाएं

शुरुआती बिंदु के रूप में Yujin reference test infrastructure copy करें:

```bash
# अपने project root से
cp -r /path/to/rpaforce-crm/packages/nac/test ./test
cp -r /path/to/rpaforce-crm/tools/nac/test-launch.sh ./tools/test-launch.sh
```

`test/stage*.mjs` को edit करें ताकि demo की जगह आपके manifest और
plugin slug का reference हो। Skeleton बिल्कुल वैसा ही रहेगा।

चलाएं:

```bash
bash ./tools/test-launch.sh
```

**Assert:** सभी node-side layers GREEN हों। कुल समय < 15s।

---

## Step 8 -- Playwright e2e जोड़ें

```bash
mkdir -p tests/e2e-nac
cd tests/e2e-nac
npm init -y
npm install --save-dev @playwright/test
npx playwright install chromium
```

Template के रूप में Yujin reference से `tests/e2e-nac/specs/01-landing.spec.ts`
copy करें; अपने ऐप के URL और plugin slug के अनुसार adapt करें।

**पूरे pipeline test** (chat -> LLM -> dispatch -> DOM ->
ack) के लिए Yujin का `08-pipeline-end-to-end.spec.ts` देखें। तीन tests
आपके live backend के विरुद्ध पूरे flow को परखते हैं।

---

## Step 9 -- Production checklist

Deploy से पहले:

- [ ] `NAC.STRICT_VALIDATION = true` -- register-time role validation
      लागू करता है (drift पर throw करता है)।
- [ ] `npx @nac3/runtime validate ./src` -- zero error-severity findings।
- [ ] `npm test` (आपका harness) -- 100% pass।
- [ ] `npx playwright test` -- सभी e2e green।
- [ ] Multi-tenant: server-side HMAC-sign manifests; authed code से
      `NAC.set_provenance_secret()` call करें।
- [ ] is_trusted-gated verbs: कोई भी verb जिसे RPA bots / synthetic
      clicks trigger कर सकें, उसे explicitly whitelist करें
      (SECURITY.md देखें)।
- [ ] i18n: हर `label_i18n` में सभी 10 locales हों (या migration के
      दौरान `i18n_strict: 'permissive'` उपयोग करें)।

---

## Step 10 -- NAC-3 conformance प्राप्त करें

`NAC.validate_global({probe: true})` चलाएं। Runtime हर `role="action"`
element पर synthetic clicks करके verify करता है कि हर एक 5s के भीतर
अपना ack emit करता है।

**Assert:** zero findings। आप NAC-3 conformant हैं।

---

## AI की सामान्य गलतियाँ (और उनसे बचने के तरीके)

1. **DOM पर `data-nac-plugin` के बिना manifest register करना।**
   Runtime का `NAC.describe()` registry नहीं, DOM को traverse करता है।
   Attribute के बिना, LLM intermediary का snapshot उस plugin के लिए
   खाली रहेगा। दोनों को हमेशा साथ रखें।
2. **React/Vue state पर chat handlers close करना।** Refs या
   functional setters उपयोग करें। CASE_STUDIES_DISCOVERY.md bug #2 देखें।
3. **अधूरा i18n।** v2.2 strict validator अधूरे label_i18n maps पर fail
   करता है। अगर आंशिक ship करना ज़रूरी हो, तो `i18n_strict: 'permissive'`
   और एक TODO ticket उपयोग करें; यह स्थायी समाधान नहीं है।
4. **Refactor के बाद IDs दोबारा उपयोग करना।** किसी button का semantic
   role बदलने पर उसे नया id मिलना चाहिए। पुराना id reuse करने से हर
   downstream agent script टूट जाती है।
5. **Ack event भूल जाना।** एक handler जो अपना काम synchronously करता है
   लेकिन `nac:action:succeeded` emit नहीं करता, वह NAC.click() को
   timeout कर देगा। Contract को bake करने के लिए `bindAction` उपयोग करें।

---

## यह भी देखें

- [SPEC.md](../SPEC.md) -- canonical contract।
- [AI_PLAYBOOK_MIGRATION.md](AI_PLAYBOOK_MIGRATION.md) -- brownfield
  प्रोजेक्ट के लिए।
- [NAC_TEST_MANUAL.md](../docs/NAC_TEST_MANUAL.md) -- किसी भी NAC-3 ऐप
  के लिए test playbook।
- [REACT.md](REACT.md) / [ANGULAR.md](ANGULAR.md) -- framework की
  गहरी जानकारी।

## License

Apache-2.0.

---

*This is a machine translation of the canonical English
version at `/nac-spec/guides/AI_PLAYBOOK_NEW_PROJECT.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
