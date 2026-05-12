---
translation_source: guides/AI_PLAYBOOK_MIGRATION.md
translation_source_hash: f49b65c798ab36923cab79511851c64a81ad6609a1c37d4936d4c6c0542cc706
translation_quality: machine_v1
translation_lang: hi
translation_date: 2026-05-11T15:01:49.312469+00:00
---

# AI Playbook -- किसी मौजूदा प्रोजेक्ट को NAC3 में Migrate करें

**NAC3 version:** 2.2 stable + v2.3 interop preview.
**Audience:** कोई भी AI agent (Claude, GPT, Gemini, local LLM) जिसे किसी मौजूदा web app को NAC-3 conformance में brownfield-migrate करने का काम सौंपा गया हो।
**Format:** WHAT, HOW, ASSERT के साथ step-by-step runbook।

जब कोई human कहे **"let's migrate this project to NAC-3"** तो इस फ़ाइल को पढ़ने वाले AI agent को नीचे दिए गए steps क्रम में execute करने होंगे।
Brownfield migration, greenfield से कठिन होती है क्योंकि चल रहे app को तोड़ा नहीं जा सकता। हर step INDEPENDENTLY ship होता है।

---

## Step 0 -- Scope + safety gates

### 0.1 Human से पूछे जाने वाले सवाल

1. **Risk envelope**: क्या app production में है? अगर हाँ, तो feature flags के पीछे per-screen migrate करें। Staging हो तो थोड़ा और साहसी हो सकते हैं।
2. **Framework**: `package.json` / `composer.json` / project tree से detect करें, फिर human से confirm करें।
3. **Top-10 verbs**: Human से app के 10 सबसे ज़्यादा इस्तेमाल होने वाले actions की सूची माँगें (save, cancel, search, filter, आदि)। इन्हें पहले migrate किया जाएगा।
4. **Chat backend**: क्या कोई मौजूदा chat infra reuse होगी (Yujin chat at `/yujin/nac-demo`, या आपका खुद का LLM intermediary)?
5. **Test coverage आज**: मौजूदा Playwright / Cypress / Jest? NAC3 tests को साथ में layer करेंगे, replace नहीं।
6. **Component library**: shadcn / MUI / PrimeNG / Mantine / custom? कुछ libraries `data-*` props को निगल जाती हैं; wrappers की ज़रूरत होगी (step 5 देखें)।

### 0.2 Pre-flight git hygiene

```bash
git status              # MUST be clean before starting
git checkout -b feat/nac3-migration
```

हर NAC migration step का अपना commit होता है ताकि human हर slice को review + revert कर सके।

---

## Step 1 -- Runtime install करें + boot module बनाएँ

```bash
npm install @nac3/runtime@^2.2.0
```

`src/nac/boot.ts` बनाएँ (या framework के अनुसार equivalent):

```ts
import '@nac3/runtime';
import '@nac3/runtime/extensions';
// import '@nac3/runtime/chat-client';  // uncomment when ready for chat

declare global { interface Window { NAC?: any; NacChat?: any; } }
```

अपने app के root entry (`main.tsx`, `app.module.ts`, या HTML head script के शीर्ष) से एक बार import करें।

**Assert:** Browser console में `window.NAC` defined हो;
`window.NAC.version` `'2.2.0'` (या उससे ऊपर) return करे।

**Commit:** `feat(nac3-migration): step 1 -- install runtime + boot module`

---

## Step 2 -- App shell को decorate करें

अपने main UI को wrap करने वाले OUTERMOST container में `data-nac-plugin="<app-slug>"` जोड़ें। यह migration का सबसे महत्वपूर्ण attribute है -- इसके बिना LLM intermediary का snapshot खाली रहता है (React + Angular study cases bug #1 से सबक, `docs/CASE_STUDIES_DISCOVERY.md` में documented)।

### React example

```tsx
return (
  <div className="app" data-nac-plugin="my-app">
    ...
  </div>
);
```

### Angular example

```html
<div class="app" data-nac-plugin="my-app">
  ...
</div>
```

### Server-rendered (PHP / Rails / Django)

```html
<body data-nac-plugin="my-app">
  ...
</body>
```

**Assert:** Browser console: `NAC.describe().plugins.length >= 1`।

**Commit:** `feat(nac3-migration): step 2 -- root data-nac-plugin attribute`

---

## Step 3 -- Top-10 verb-bearing buttons को decorate करें

Step 0.3 से 10 सबसे ज़्यादा इस्तेमाल होने वाले actions लें। हर button के लिए:

```html
<button
  data-nac-id="<plugin>.<verb>"
  data-nac-role="action"
  data-nac-action="<verb>"
  onclick="...">
  ...
</button>
```

**ID conventions:**
- Plugin-namespaced: `invoice.save`, न कि सिर्फ़ `save`।
- Snake_case lowercase: `add_row`, न कि `AddRow` या `add-row`।
- अगर global app verb है तो leaf पर verb; अन्यथा nested:
  `dashboard.invoice.list.row.42.delete`।

मौजूदा `onclick` / event handler को न छुएँ -- decoration additive है।

**Assert:** Console से:
```js
NAC.describe().plugins[0].elements.length  // >= 10
NAC.list_registered_plugins()                // includes your plugin
```

**Commit:** `feat(nac3-migration): step 3 -- top-10 buttons decorated`

---

## Step 4 -- एक minimal manifest जोड़ें

पहले दिन हर element cover करने की कोशिश न करें। Step 3 के top-10 verb-bearing buttons को proper `label_i18n` के साथ cover करें:

```ts
// src/nac/manifest.ts
const li = (es:string,en:string,pt:string,fr:string,it:string,
            de:string,ja:string,zh:string,hi:string,ar:string) =>
  ({ es, en, pt, fr, it, de, ja, zh, hi, ar });

export const APP_MANIFEST = {
  plugin_slug: 'my-app',
  version: '1.0.0',
  nac_version: '2.2',
  elements: [
    {
      id: 'my-app.save', role: 'action',
      actions: [{
        verb: 'save',
        label_i18n: li('Guardar','Save','Salvar','Sauver','Salva',
                       'Speichern','保存','保存','sahejna','حفظ')
      }],
      label_i18n: li(/* same */)
    },
    // ... 9 more ...
  ]
};
```

Boot पर register करें:

```ts
window.NAC?.register(APP_MANIFEST);
```

अगर पहले दिन 10 locales ship नहीं कर सकते, तो autoRegister.watch path पर `i18n_strict: 'permissive'` इस्तेमाल करें। यह एक अस्थायी सहारा है; production NAC3 v2.2 strict-validator अधूरे i18n पर warn करेगा।

**Assert:**
```js
NAC.list_registered_plugins()           // ['my-app']
await NAC.click_by_verb('my-app','save')  // resolves
```

**Commit:** `feat(nac3-migration): step 4 -- manifest with top-10 verbs`

---

## Step 5 -- Component library को handle करें (अगर लागू हो)

अगर आपका app MUI / Mantine / PrimeNG / आदि इस्तेमाल करता है और buttons `data-*` props निगल जाते हैं, तो एक thin wrapper लिखें:

```tsx
// src/nac/NacButton.tsx
import { Button as MuiButton } from '@mui/material';
import { useEffect, useRef } from 'react';

export function NacButton({ nacId, verb, plugin, children, ...rest }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.setAttribute('data-nac-id', nacId);
    el.setAttribute('data-nac-role', 'action');
    el.setAttribute('data-nac-action', verb);
  }, [nacId, verb]);
  return <MuiButton ref={ref} {...rest}>{children}</MuiButton>;
}
```

Top-10 buttons के लिए `<Button>` -> `<NacButton nacId="..." verb="...">` find-replace करें। इसे incrementally करें।

**Commit:** `feat(nac3-migration): step 5 -- component library wrapper`

---

## Step 6 -- Ack contract emit करें

v2.2 `bindAction` helper सबसे साफ़ रास्ता है:

```ts
import { useRef, useEffect } from 'react';

export function useNacAction(plugin: string, actionId: string) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || !window.NAC) return;
    return window.NAC.bindAction(el, () => {}, { plugin, action_id: actionId });
  }, [plugin, actionId]);
  return ref;
}
```

```tsx
function SaveButton({ onSave }) {
  const ref = useNacAction('my-app', 'my-app.save');
  return <button ref={ref} onClick={onSave}>Save</button>;
}
```

bindAction layer, user का `onClick` return होने के बाद automatically `nac:action:succeeded` fire करता है। अब "chat says 'No pude ejecutar X: timeout'" जैसी समस्या नहीं होगी।

**Assert:** Console से:
```js
document.addEventListener('nac:action:succeeded', e => console.log(e.detail));
await NAC.click('my-app.save');
// Should print {plugin: 'my-app', action_id: 'my-app.save', ...}
```

**Commit:** `feat(nac3-migration): step 6 -- bindAction ack contract`

---

## Step 7 -- Fields + tabs जोड़ें

हर उस input के लिए जिसमें user टाइप करता है:

```html
<input data-nac-id="my-app.field_x" data-nac-role="field" ...>
```

Tab-strip components में हर tab के लिए:

```html
<button
  data-nac-id="tab.<key>"
  data-nac-role="tab"
  onclick="...">
  ...
</button>
```

**ज़रूरी बात (v2.2 strict-validator rule):** `^tab\.` से match होने वाले ID का role `tab` MUST होना चाहिए। गलत roles से `tab_id_manifest_role_drift` finding आती है और runtime `NAC.tab()` से tab नहीं ढूँढ पाता।

**Commit:** `feat(nac3-migration): step 7 -- fields + tabs decorated`

---

## Step 8 -- Chat panel जोड़ें (optional, टाला जा सकता है)

Reference `nac-chat-client.js` drop in करें:

```html
<aside class="chat" data-nac-plugin="chat" aria-hidden="true">
  <div id="chat-log" data-nac-id="chat.log" data-nac-role="region"></div>
  <input id="chat-input" data-nac-id="chat.input" data-nac-role="field">
  <button id="chat-send" data-nac-id="chat.send" data-nac-role="action">send</button>
</aside>

<script src="https://yujin.app/nac-spec/js/nac-chat-client.js?v=v22"></script>
<script>
NacChat.init({
  endpoint: '/your-llm-intermediary',   // or '/crm/api/v1/yujin/nac-demo'
  chatLog: document.getElementById('chat-log'),
  input:   document.getElementById('chat-input'),
  sendBtn: document.getElementById('chat-send')
});
</script>
```

वैकल्पिक रूप से, **chat को पूरी तरह defer करें** और users को Yujin Pilot (`yujin.app/pilot`) install करने को कहें जो MCP के ज़रिए आपका app discover करता है और एक central cockpit से चलाता है।

**Commit:** `feat(nac3-migration): step 8 -- chat panel`

---

## Step 9 -- NAC3 test corpus layer करें

Yujin reference test infrastructure copy करें:

```bash
mkdir -p test/nac3
cp /path/to/rpaforce-crm/packages/nac/test/stage*.mjs ./test/nac3/
cp /path/to/rpaforce-crm/tools/nac/test-launch.sh ./test/nac3/
```

Plugin slug + manifest reference को adapt करें। Run करें:

```bash
bash ./test/nac3/test-launch.sh
```

**Assert:** सभी layers GREEN।

**Commit:** `feat(nac3-migration): step 9 -- NAC3 test corpus`

---

## Step 10 -- NAC-3 conformance पर promote करें

```bash
# In your CI:
npx @nac3/runtime validate ./src --severity=error  # exit 0 required
NAC.validate_global({probe: true})              # zero findings required
```

Register-time role coherence enforce करने के लिए prod boot में `NAC.STRICT_VALIDATION = true` set करें।

**Commit:** `feat(nac3-migration): step 10 -- NAC-3 conformance gate`

---

## Screens में migration का क्रम

Production app में कई screens हों तो सब एक साथ migrate करने की कोशिश न करें:

1. **सबसे ज़्यादा इस्तेमाल होने वाली screen पहले** (जैसे login + dashboard)।
2. **सबसे ज़्यादा value वाली screen अगली** (जिसमें power users सबसे ज़्यादा समय बिताते हैं)।
3. **Public-facing screens** (anonymous traffic को दिखने वाली)।
4. **Admin screens** सबसे अंत में (कम traffic, गहरी acceptance)।

हर screen का अपना PR होता है। अगर feature flag हो तो हर PR उसके पीछे ship होता है; flag flip करके rollback करें।

---

## Migration के आम gotchas

1. **Root पर `data-nac-plugin` भूल गए।** Manifest registered है लेकिन LLM को दिखता नहीं। **Symptom:** chat generic "How can I help" कहता है, कोई actions नहीं। Fix: attribute जोड़ें। (Case studies से Bug #1।)
2. **React state stale closure in onChatAction।** Refs + functional setters इस्तेमाल करें। (Case studies से Bug #2।)
3. **Tab ID के साथ non-tab role।** v2.2 strict-validator finding। `^tab\.` का role `tab` MUST होना चाहिए।
4. **Refactor के बाद IDs reuse करना।** किसी button का semantic role बदले तो उसे नया id MUST मिलना चाहिए। Reuse से downstream automation टूटती है।
5. **Component library `data-*` निगल जाती है।** जल्दी detect करें; wrapper लिखें (step 5)।
6. **Click handler ack emit नहीं करता।** `bindAction` इस्तेमाल करें। इसके बिना, side effect काम करने पर भी `NAC.click()` 5s पर timeout हो जाता है।

---

## यह भी देखें

- [AI_PLAYBOOK_NEW_PROJECT.md](AI_PLAYBOOK_NEW_PROJECT.md) -- greenfield projects के लिए।
- [REACT.md](REACT.md) / [ANGULAR.md](ANGULAR.md) -- framework deep dives।
- [NAC_TEST_MANUAL.md](../docs/NAC_TEST_MANUAL.md) -- migration के बाद का test playbook।
- [CASE_STUDIES_DISCOVERY.md](../docs/CASE_STUDIES_DISCOVERY.md) -- Yujin reference migration के दौरान मिले bugs।

## License

Apache-2.0.

---

*This is a machine translation of the canonical English
version at `/nac-spec/guides/AI_PLAYBOOK_MIGRATION.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
