# AI Playbook -- Start a new NAC-3 project

**NAC3 version:** 2.2 stable + v2.3 interop preview.
**Audience:** Any AI agent (Claude, GPT, Gemini, local LLM) tasked
with bootstrapping a NAC-3 conformant project from scratch.
**Format:** Step-by-step runbook. Each step has WHAT, HOW, ASSERT.
No ambiguity.

When a human says **"let's start a new NAC-3 project"** or
similar, an AI agent reading this file MUST execute the steps
below in order, asserting each gate before advancing.

---

## Step 0 -- Confirm scope with the human

Ask exactly these questions before writing any code:

1. **Framework**: React, Angular, Vue, Svelte, vanilla, or
   server-rendered (PHP/Rails/Django)?
2. **Languages**: Which of the 10 NAC3 locales must the app
   support at launch? (es, en, pt, fr, it, de, ja, zh, hi, ar)
3. **Chat backend**: Will the app expose its own LLM
   intermediary (provide endpoint) or use a hosted Yujin chat?
4. **Provenance**: Multi-tenant? If yes, plan for HMAC manifest
   signing.
5. **Voice**: Push-to-talk only, hands-free, or both?
6. **Interop (v2.3 preview)**: Will this app be importable by
   other NAC3 hosts (Yujin Pilot, peer apps)? Yes -> expose
   MCP server tools.

Park each answer. They drive every subsequent decision.

---

## Step 1 -- Scaffold the project

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

### Vanilla (HTML + JS + PHP, no framework)

Create:
- `index.html` with `<body data-nac-plugin="app">`.
- `js/app.js` with imports.

### Server-rendered

Embed `@nac3/runtime` via CDN:

```html
<script src="https://yujin.app/nac-spec/js/nac.js?v=v22"></script>
<script src="https://yujin.app/nac-spec/js/nac-v2-extensions.js?v=v22"></script>
```

**Assert:** `npm run build` (or framework equivalent) succeeds
without error. Open in browser; `window.NAC` is defined.

---

## Step 2 -- Decorate the shell

Add to your **root container** in the template:

```html
<div data-nac-plugin="<your-app-slug>" class="app">
  ...
</div>
```

Add to **every clickable widget** (buttons, links-as-buttons):

```html
<button
  data-nac-id="<slug>.<verb>"
  data-nac-role="action"
  data-nac-action="<verb>"
  onclick="...">
  ...
</button>
```

Add to **every form field** (input, textarea, select):

```html
<input
  data-nac-id="<slug>.<field-name>"
  data-nac-role="field"
  ... />
```

Add to **every tab button** (the spec is strict: `^tab\.` id MUST
have role `tab`):

```html
<button
  data-nac-id="tab.<key>"
  data-nac-role="tab"
  onclick="...">
  ...
</button>
```

**Assert:** `npx @nac3/runtime validate ./src` reports zero error-
severity findings. `NAC.describe()` from the browser console
returns a tree with `data-nac-plugin` matches.

---

## Step 3 -- Write the manifest

Create `src/nac/manifest.ts` (or equivalent):

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
    // ... every other element ...
  ]
};
```

**Critical rules:**
- Every `label_i18n` MUST cover all 10 supported locales. Half-
  populated is a v2.2 strict-validator finding.
- Every `id` matching `^tab\.` MUST have `role: 'tab'`.
- Every `id` MUST be plugin-namespaced (e.g. `invoice.save`,
  not `save`).
- IDs MUST be stable across UI redesigns.

**Assert:** `NAC.validate_global({probe: false})` returns 0
error-severity findings.

---

## Step 4 -- Register the manifest at boot

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

Inject `NacBoot` into your `AppComponent`.

### Vanilla

```html
<script type="module">
import { APP_MANIFEST } from './nac/manifest.js';
window.NAC.register(APP_MANIFEST);
</script>
```

**Assert:** `NAC.list_registered_plugins()` returns
`['<your-app-slug>']`.

---

## Step 5 -- Emit the ack contract from every click handler

For each button decorated with `data-nac-role="action"`, your
click handler MUST emit `nac:action:succeeded` after its
synchronous side effect.

### Pattern A -- via `NAC.bindAction` (v2.2 helper, recommended)

```ts
const btn = document.querySelector('[data-nac-id="<slug>.save"]');
NAC.bindAction(btn, function (ev) {
  saveInvoice();          // your side effect
}, { plugin: '<slug>', action_id: '<slug>.save' });
```

`bindAction` handles sync, async (Promise), and throw cases
automatically.

### Pattern B -- manual emission

```ts
button.addEventListener('click', function () {
  saveInvoice();
  document.dispatchEvent(new CustomEvent('nac:action:succeeded', {
    detail: { plugin: '<slug>', action_id: '<slug>.save' }
  }));
});
```

For other roles emit the canonical event family:
- `role="field"` -> `nac:field:changed` (detail: `{plugin, field_id, value}`)
- `role="tab"` -> `nac:tab:activated` (detail: `{plugin, tab_id}`)
- See SPEC.md section 6 for the full table.

**Assert:** From the browser console:
```js
document.addEventListener('nac:action:succeeded', e => console.log(e.detail));
await NAC.click('<slug>.save');
// Should print {plugin: '<slug>', action_id: '<slug>.save', ...}
```

---

## Step 6 -- Wire the chat panel

Drop in the reference chat client OR use Yujin Pilot (external).

### Option A -- embed `nac-chat-client.js`

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

You provide the `endpoint` -- the LLM intermediary backend that
receives `{prompt, lang, history, nac_tree}` and returns
`{message, actions[]}`. See `LLM_WIRING.md`.

### Option B -- defer to Yujin Pilot

Don't embed chat at all. Tell users "install Yujin Pilot
(yujin.app/pilot) for voice + chat on this app". Pilot's MCP
scanner discovers your app + drives it from its central cockpit.

---

## Step 7 -- Run the test corpus

Copy the Yujin reference test infrastructure as your starting
point:

```bash
# From your project root
cp -r /path/to/rpaforce-crm/packages/nac/test ./test
cp -r /path/to/rpaforce-crm/tools/nac/test-launch.sh ./tools/test-launch.sh
```

Edit `test/stage*.mjs` to reference your manifest + your plugin
slug instead of the demo's. The skeleton stays identical.

Run:

```bash
bash ./tools/test-launch.sh
```

**Assert:** All node-side layers GREEN. Total time < 15s.

---

## Step 8 -- Add Playwright e2e

```bash
mkdir -p tests/e2e-nac
cd tests/e2e-nac
npm init -y
npm install --save-dev @playwright/test
npx playwright install chromium
```

Copy `tests/e2e-nac/specs/01-landing.spec.ts` from the Yujin
reference as a template; adapt to your app's URL + plugin slug.

For the **full pipeline test** (chat -> LLM -> dispatch -> DOM ->
ack), see Yujin's `08-pipeline-end-to-end.spec.ts`. Three tests
exercise the entire flow against your live backend.

---

## Step 9 -- Production checklist

Before deploy:

- [ ] `NAC.STRICT_VALIDATION = true` -- enforces register-time
      role validation (throws on drift).
- [ ] `npx @nac3/runtime validate ./src` -- zero error-severity
      findings.
- [ ] `npm test` (your harness) -- 100% pass.
- [ ] `npx playwright test` -- all e2e green.
- [ ] Multi-tenant: HMAC-sign manifests server-side; call
      `NAC.set_provenance_secret()` from authed code.
- [ ] is_trusted-gated verbs: explicitly whitelist any verb that
      RPA bots / synthetic clicks should be allowed to trigger
      (see SECURITY.md).
- [ ] i18n: every `label_i18n` covers all 10 locales (or use
      `i18n_strict: 'permissive'` during migration).

---

## Step 10 -- Promote to NAC-3 conformance

Run `NAC.validate_global({probe: true})`. The runtime synthesises
clicks against every `role="action"` element to verify each
emits its ack within 5s.

**Assert:** zero findings. You are NAC-3 conformant.

---

## Common AI mistakes (and how to avoid them)

1. **Register manifest without `data-nac-plugin` on the DOM.**
   The runtime's `NAC.describe()` walks the DOM, not the
   registry. Without the attribute, the LLM intermediary's
   snapshot is empty for that plugin. ALWAYS pair the two.
2. **Closing chat handlers over React/Vue state.** Use refs or
   functional setters. See CASE_STUDIES_DISCOVERY.md bug #2.
3. **Partial i18n.** v2.2 strict validator fails on incomplete
   label_i18n maps. If you must ship partial, use
   `i18n_strict: 'permissive'` and a TODO ticket; it's not a
   forever shortcut.
4. **Reusing IDs after refactor.** A button renamed to a new
   semantic role MUST get a new id. Reusing breaks every
   downstream agent script.
5. **Forgetting the ack event.** A handler that does its work
   synchronously but doesn't emit `nac:action:succeeded` will
   time out NAC.click(). Use `bindAction` to bake the
   contract in.

---

## See also

- [SPEC.md](../SPEC.md) -- canonical contract.
- [AI_PLAYBOOK_MIGRATION.md](AI_PLAYBOOK_MIGRATION.md) -- for
  brownfield projects.
- [NAC_TEST_MANUAL.md](../docs/NAC_TEST_MANUAL.md) -- test
  playbook for any NAC-3 app.
- [REACT.md](REACT.md) / [ANGULAR.md](ANGULAR.md) -- framework
  deep dives.

## License

Apache-2.0.
