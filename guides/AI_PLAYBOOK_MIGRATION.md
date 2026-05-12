# AI Playbook -- Migrate an existing project to NAC3

**NAC3 version:** 2.2 stable + v2.3 interop preview.
**Audience:** Any AI agent (Claude, GPT, Gemini, local LLM) tasked
with brownfield-migrating an existing web app to NAC-3 conformance.
**Format:** Step-by-step runbook with WHAT, HOW, ASSERT per step.

When a human says **"let's migrate this project to NAC-3"** an AI
agent reading this file MUST execute the steps below in order.
Brownfield migration is harder than greenfield because you cannot
break the running app. Every step ships INDEPENDENTLY.

---

## Step 0 -- Scope + safety gates

### 0.1 Questions to ask the human

1. **Risk envelope**: Is the app in production? If yes, you migrate
   per-screen behind feature flags. If staging, you can be bolder.
2. **Framework**: Detect from `package.json` / `composer.json` /
   project tree, then confirm with the human.
3. **Top-10 verbs**: Ask the human to list the 10 most-used
   actions in their app (save, cancel, search, filter, etc).
   These migrate first.
4. **Chat backend**: Will you reuse an existing chat infra (Yujin
   chat at `/yujin/nac-demo`, or your own LLM intermediary)?
5. **Test coverage today**: Existing Playwright / Cypress / Jest?
   You'll layer NAC3 tests alongside, not replace.
6. **Component library**: shadcn / MUI / PrimeNG / Mantine /
   custom? Some libraries swallow `data-*` props; you'll need
   wrappers (see step 5).

### 0.2 Pre-flight git hygiene

```bash
git status              # MUST be clean before starting
git checkout -b feat/nac3-migration
```

Every NAC migration step lives in its own commit so the human
can review + revert per slice.

---

## Step 1 -- Install runtime + create boot module

```bash
npm install @nac3/runtime@^2.2.0
```

Create `src/nac/boot.ts` (or framework equivalent):

```ts
import '@nac3/runtime';
import '@nac3/runtime/extensions';
// import '@nac3/runtime/chat-client';  // uncomment when ready for chat

declare global { interface Window { NAC?: any; NacChat?: any; } }
```

Import once from your app's root entry (`main.tsx`, `app.module.ts`,
or top of your HTML head script).

**Assert:** `window.NAC` defined in browser console;
`window.NAC.version` returns `'2.2.0'` (or higher).

**Commit:** `feat(nac3-migration): step 1 -- install runtime + boot module`

---

## Step 2 -- Decorate the app shell

Add `data-nac-plugin="<app-slug>"` to the OUTERMOST container that
wraps your main UI. This is the single most-important attribute
in the migration -- without it the LLM intermediary's snapshot
is empty (lesson from the React + Angular study cases bug #1,
documented at `docs/CASE_STUDIES_DISCOVERY.md`).

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

**Assert:** Browser console: `NAC.describe().plugins.length >= 1`.

**Commit:** `feat(nac3-migration): step 2 -- root data-nac-plugin attribute`

---

## Step 3 -- Decorate the top-10 verb-bearing buttons

Take the 10 most-used actions from step 0.3. For each button:

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
- Plugin-namespaced: `invoice.save`, not just `save`.
- Snake_case lowercase: `add_row`, not `AddRow` or `add-row`.
- Verb at the leaf if it's a global app verb; otherwise nested:
  `dashboard.invoice.list.row.42.delete`.

Don't touch the existing `onclick` / event handler -- the
decoration is additive.

**Assert:** From console:
```js
NAC.describe().plugins[0].elements.length  // >= 10
NAC.list_registered_plugins()                // includes your plugin
```

**Commit:** `feat(nac3-migration): step 3 -- top-10 buttons decorated`

---

## Step 4 -- Add a minimal manifest

Don't try to cover EVERY element on day 1. Cover the top-10
verb-bearing buttons from step 3 with proper `label_i18n`:

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

Register on boot:

```ts
window.NAC?.register(APP_MANIFEST);
```

If you can't ship 10 locales day 1, use `i18n_strict: 'permissive'`
on the autoRegister.watch path. This is a temporary crutch;
production NAC3 v2.2 strict-validator will warn on incomplete
i18n.

**Assert:**
```js
NAC.list_registered_plugins()           // ['my-app']
await NAC.click_by_verb('my-app','save')  // resolves
```

**Commit:** `feat(nac3-migration): step 4 -- manifest with top-10 verbs`

---

## Step 5 -- Handle the component library (if applicable)

If your app uses MUI / Mantine / PrimeNG / etc and the buttons
swallow `data-*` props, write a thin wrapper:

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

Find-replace `<Button>` -> `<NacButton nacId="..." verb="...">` for
the top-10 buttons. Do it incrementally.

**Commit:** `feat(nac3-migration): step 5 -- component library wrapper`

---

## Step 6 -- Emit the ack contract

The v2.2 `bindAction` helper is the cleanest path:

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

The bindAction layer fires `nac:action:succeeded` automatically
after the user's `onClick` returns. No more "the chat says
'No pude ejecutar X: timeout'".

**Assert:** From console:
```js
document.addEventListener('nac:action:succeeded', e => console.log(e.detail));
await NAC.click('my-app.save');
// Should print {plugin: 'my-app', action_id: 'my-app.save', ...}
```

**Commit:** `feat(nac3-migration): step 6 -- bindAction ack contract`

---

## Step 7 -- Add fields + tabs

For every input the user types into:

```html
<input data-nac-id="my-app.field_x" data-nac-role="field" ...>
```

For every tab in tab-strip components:

```html
<button
  data-nac-id="tab.<key>"
  data-nac-role="tab"
  onclick="...">
  ...
</button>
```

**Critical (v2.2 strict-validator rule):** ID matching `^tab\.`
MUST have role `tab`. Mismatched roles produce
`tab_id_manifest_role_drift` finding and the runtime cannot find
the tab via `NAC.tab()`.

**Commit:** `feat(nac3-migration): step 7 -- fields + tabs decorated`

---

## Step 8 -- Add chat panel (optional, deferable)

Drop in the reference `nac-chat-client.js`:

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

Alternatively, **defer chat entirely** and tell users to install
Yujin Pilot (`yujin.app/pilot`) which discovers your app via
MCP and drives it from a central cockpit.

**Commit:** `feat(nac3-migration): step 8 -- chat panel`

---

## Step 9 -- Layer the NAC3 test corpus

Copy the Yujin reference test infrastructure:

```bash
mkdir -p test/nac3
cp /path/to/rpaforce-crm/packages/nac/test/stage*.mjs ./test/nac3/
cp /path/to/rpaforce-crm/tools/nac/test-launch.sh ./test/nac3/
```

Adapt the plugin slug + manifest reference. Run:

```bash
bash ./test/nac3/test-launch.sh
```

**Assert:** All layers GREEN.

**Commit:** `feat(nac3-migration): step 9 -- NAC3 test corpus`

---

## Step 10 -- Promote to NAC-3 conformance

```bash
# In your CI:
npx @nac3/runtime validate ./src --severity=error  # exit 0 required
NAC.validate_global({probe: true})              # zero findings required
```

Set `NAC.STRICT_VALIDATION = true` in your prod boot to enforce
register-time role coherence.

**Commit:** `feat(nac3-migration): step 10 -- NAC-3 conformance gate`

---

## Migration order across screens

In a production app with many screens, don't try to migrate them
all at once:

1. **Most-used screen first** (e.g. login + dashboard).
2. **Highest-value screen next** (the one your power users
   live in).
3. **Public-facing screens** (visible to anonymous traffic).
4. **Admin screens** last (low traffic, deeper acceptance).

Each screen gets its own PR. Each PR ships behind a feature flag
if you have one; rollback by flipping the flag.

---

## Common migration gotchas

1. **Forgot `data-nac-plugin` on the root.** Manifest registered
   but LLM blind to it. **Symptom:** chat says generic "How can
   I help" with no actions. Fix: add the attribute. (Bug #1 from
   case studies.)
2. **React state stale closure in onChatAction.** Use refs +
   functional setters. (Bug #2 from case studies.)
3. **Tab ID with non-tab role.** v2.2 strict-validator finding.
   `^tab\.` MUST have role `tab`.
4. **Reusing IDs after a refactor.** A button moved to a new
   semantic role MUST get a new id. Reuse breaks downstream
   automation.
5. **Component library swallows data-*.** Detect early; write a
   wrapper (step 5).
6. **Click handler doesn't emit ack.** Use `bindAction`. Without
   it, `NAC.click()` times out at 5s even when the side effect
   worked.

---

## See also

- [AI_PLAYBOOK_NEW_PROJECT.md](AI_PLAYBOOK_NEW_PROJECT.md) -- for
  greenfield projects.
- [REACT.md](REACT.md) / [ANGULAR.md](ANGULAR.md) -- framework
  deep dives.
- [NAC_TEST_MANUAL.md](../docs/NAC_TEST_MANUAL.md) -- post-
  migration test playbook.
- [CASE_STUDIES_DISCOVERY.md](../docs/CASE_STUDIES_DISCOVERY.md)
  -- bugs found during the Yujin reference migration.

## License

Apache-2.0.
