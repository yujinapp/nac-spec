# NAC3 + React adoption guide

This guide gets a React app NAC-driven in two paths:

- **Greenfield:** new project, NAC3 from day one.
- **Brownfield:** existing app, NAC3 added progressively without a
  rewrite.

Both use `@nac3/runtime` from npm. No build-step assumptions; this
works with Vite, Next.js, Create React App, Remix, or anything
that bundles a normal package.

---

## 1. Install

```
npm install @nac3/runtime
```

The package exposes the runtime as `window.NAC` after first import.
The runtime is framework-agnostic; React just decorates JSX with
`data-nac-*` attributes and registers manifests via `useEffect`.

---

## 2. Greenfield -- new app

### 2.1 Mount the runtime once

In your root component (or `main.tsx` / `_app.tsx`):

```tsx
import { useEffect } from 'react';
import '@nac3/runtime';
import '@nac3/runtime/extensions';   // v2.0 brownfield primitives + HMAC
// optional: '@nac3/runtime/chat-client' for voice + chat

export function App() {
  useEffect(() => {
    // Tenant prefix (multi-tenant SaaS pattern). Skip if single-tenant.
    if (window.NAC?.setTenantPrefix) {
      window.NAC.setTenantPrefix('demo');
    }
    // HMAC secret if you ship signed manifests. Get from your auth API.
    // window.NAC.set_provenance_secret(secret);
  }, []);

  return <YourAppShell />;
}
```

### 2.2 Decorate components

Every clickable / fillable / switchable element gets:

- `data-nac-id` -- a stable dotted path.
- `data-nac-role` -- one of the canonical roles (see SPEC sec 1).
- `data-nac-action="<verb>"` -- only for `role="action"`.

```tsx
function InvoiceForm({ invoice, onSave, onCancel }) {
  return (
    <article data-nac-plugin="invoice">
      <input
        type="text"
        data-nac-id="invoice.client_name"
        data-nac-role="field"
        value={invoice.clientName}
        onChange={(e) => /* ... */}
      />

      <button
        data-nac-id="invoice.save"
        data-nac-role="action"
        data-nac-action="save"
        onClick={onSave}
      >
        Save
      </button>

      <button
        data-nac-id="invoice.cancel"
        data-nac-role="action"
        data-nac-action="cancel"
        onClick={onCancel}
      >
        Cancel
      </button>
    </article>
  );
}
```

### 2.3 Register a manifest

The manifest is the agent-facing source of truth. An LLM resolving
"guardar" finds the verb `save` here:

```tsx
import { useEffect } from 'react';

const INVOICE_MANIFEST = {
  plugin_slug: 'invoice',
  version: '1.0.0',
  nac_version: '2.1',
  elements: [
    {
      id: 'invoice.client_name',
      role: 'field',
      label_i18n: {
        es: 'Nombre del cliente', en: 'Customer name',
        pt: 'Nome do cliente', fr: 'Nom du client',
        it: 'Nome del cliente', de: 'Kundenname',
        ja: '顧客名', zh: '客户名称',
        hi: 'ग्राहक का नाम', ar: 'اسم العميل'
      }
    },
    {
      id: 'invoice.save',
      role: 'action',
      actions: [{
        verb: 'save',
        label_i18n: { /* 10 locales */ }
      }],
      label_i18n: { /* 10 locales */ }
    },
    {
      id: 'invoice.cancel',
      role: 'action',
      actions: [{
        verb: 'cancel',
        label_i18n: { /* 10 locales */ }
      }],
      label_i18n: { /* 10 locales */ }
    }
  ]
};

export function InvoiceForm(props) {
  useEffect(() => {
    if (!window.NAC) return;
    window.NAC.register(INVOICE_MANIFEST);
  }, []);
  // ... JSX from 2.2 ...
}
```

Key rules:

- `useEffect` with `[]` deps: register once on mount.
- The manifest is a static object; do not rebuild it on every
  render (the runtime treats `register` as idempotent but you
  waste cycles).
- React Strict Mode double-invokes effects in dev. The runtime's
  `register` is idempotent; safe.

### 2.4 Emit success events from handlers

If the runtime is going to be driven by an agent that awaits
`NAC.click()`, your handlers must emit `nac:action:succeeded`
after their side effect:

```tsx
function onSave() {
  await api.saveInvoice(/* ... */);
  document.dispatchEvent(new CustomEvent('nac:action:succeeded', {
    detail: { plugin: 'invoice', action_id: 'invoice.save' }
  }));
}
```

This is the v2.1 contract. v2.2 ships a `useNACAction` hook that
does this for you (see Hooks section below).

### 2.5 Drive it

From any agent, voice runner, or test:

```tsx
await window.NAC.click('invoice.save');
// or by verb:
await window.NAC.click_by_verb('invoice', 'save');
// or fill a field:
await window.NAC.fill('invoice.client_name', 'Acme Corp');
```

---

## 3. Brownfield -- existing React app

The principle: do not refactor everything at once. Add NAC3 to one
component, validate, repeat.

### 3.1 Order of attack

1. **Top-level wrapper first.** Add `data-nac-plugin="<your-app-slug>"`
   to your root `<div>` or `<main>`. The runtime's scope tree picks
   it up.
2. **Most-used buttons next.** Save, cancel, submit, delete in your
   busiest screens. Add `data-nac-id`, `data-nac-role="action"`,
   `data-nac-action="<verb>"`. Don't add a manifest yet.
3. **Verify the runtime sees them.** Open DevTools, run
   `NAC.describe()`. The buttons should appear under their plugin
   slug.
4. **Add a minimal manifest.** Just the buttons from step 2, with
   their verbs. Now `NAC.click_by_verb()` works.
5. **Add fields.** Inputs get `data-nac-role="field"` + manifest
   entries.
6. **Add tabs.** Tab switchers get `data-nac-role="tab"`. **Critical:**
   ids matching `^tab\.` MUST have role `tab` (the runtime's
   `NAC.tab()` query is canonical-role-only; see SPEC sec 1).

### 3.2 Don't fight your existing component library

You probably use shadcn / Mantine / MUI / Chakra / your-custom-system.
Most of these render their own DOM. Two patterns work:

**Pattern A: pass NAC3 attrs through.** Most well-built libraries
forward unknown props to the underlying DOM element:

```tsx
<Button
  data-nac-id="invoice.save"
  data-nac-role="action"
  data-nac-action="save"
  onClick={onSave}
>
  Save
</Button>
```

If your library forwards `data-*` attrs, this is enough.

**Pattern B: wrapper component.** If your library swallows
`data-*` props, write a tiny wrapper:

```tsx
import { Button as MuiButton } from '@mui/material';
import { useEffect, useRef } from 'react';

interface NACButtonProps {
  nacId: string;
  verb: string;
  // ...other Mui props
}

export function NACButton({ nacId, verb, ...rest }: NACButtonProps) {
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    ref.current.setAttribute('data-nac-id', nacId);
    ref.current.setAttribute('data-nac-role', 'action');
    ref.current.setAttribute('data-nac-action', verb);
  }, [nacId, verb]);
  return <MuiButton ref={ref} {...rest} />;
}
```

### 3.3 Auto-register from DOM

If declaring manifests by hand is tedious, the v2.0 extension
`autoRegister.watch` walks the DOM and registers anything with
`data-nac-id` + `data-nac-role` automatically:

```tsx
useEffect(() => {
  if (!window.NAC?.autoRegister) return;
  const root = document.querySelector('[data-nac-plugin]');
  if (!root) return;
  root.setAttribute('data-nac-watch', '1');
  window.NAC.autoRegister.watch(root, {
    i18n_strict: 'permissive',  // accept partial 10-locale during migration
    throttleMs: 100
  });
}, []);
```

`i18n_strict: 'permissive'` is right for brownfield. For
production, switch to `'strict'` once your i18n catalogue is
complete.

---

## 4. Hooks (v2.2 preview)

These ship in v2.2. For v2.1 you can copy them into your project
today; they wrap the v2.1 runtime and provide a more idiomatic
React API.

### 4.1 `useNACManifest`

```tsx
export function useNACManifest(manifest) {
  useEffect(() => {
    if (!window.NAC) return;
    window.NAC.register(manifest);
  }, [manifest.plugin_slug]);  // re-register only on slug change
}
```

### 4.2 `useNACAction` -- auto-emit ack

```tsx
import { useEffect, useRef } from 'react';

export function useNACAction(plugin: string, actionId: string) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    function onClick() {
      // Emit the v2.1 contract event after the React onClick runs.
      // Microtask delay so React's synthetic event finishes first.
      queueMicrotask(() => {
        document.dispatchEvent(new CustomEvent('nac:action:succeeded', {
          detail: { plugin, action_id: actionId }
        }));
      });
    }
    el.addEventListener('click', onClick);
    return () => el.removeEventListener('click', onClick);
  }, [plugin, actionId]);
  return ref;
}
```

Usage:

```tsx
function SaveButton({ onSave }) {
  const ref = useNACAction('invoice', 'invoice.save');
  return (
    <button
      ref={ref}
      data-nac-id="invoice.save"
      data-nac-role="action"
      data-nac-action="save"
      onClick={onSave}
    >
      Save
    </button>
  );
}
```

### 4.3 `useNACDescribe` -- introspect the tree from a panel

```tsx
import { useState, useEffect } from 'react';

export function useNACDescribe() {
  const [snap, setSnap] = useState(null);
  useEffect(() => {
    if (!window.NAC) return;
    setSnap(window.NAC.describe());
    const tick = setInterval(() => setSnap(window.NAC.describe()), 1000);
    return () => clearInterval(tick);
  }, []);
  return snap;
}
```

---

## 5. Testing

### 5.1 Unit + integration

NAC3 plays nicely with React Testing Library:

```tsx
import { render, fireEvent, waitFor } from '@testing-library/react';
import '@nac3/runtime';
import { InvoiceForm } from './InvoiceForm';

test('save button drives via NAC', async () => {
  render(<InvoiceForm />);

  const saved = jest.fn();
  document.addEventListener('nac:action:succeeded', saved);

  await window.NAC.click('invoice.save');

  await waitFor(() => expect(saved).toHaveBeenCalled());
});
```

### 5.2 End-to-end (Playwright)

```ts
import { test, expect } from '@playwright/test';

test('invoice save', async ({ page }) => {
  await page.goto('/invoices/new');
  await page.evaluate(() => window.NAC.fill('invoice.client_name', 'Acme'));
  await page.evaluate(() => window.NAC.click('invoice.save'));
  await expect(page.getByText('Invoice saved')).toBeVisible();
});
```

---

## 6. Common gotchas

- **Stale ids in keyed lists.** If you build ids from a row index
  (`data-nac-id={'row.' + i}`) and rows reorder, agents that
  cached the id break. Use stable keys (DB ids).
- **Conditional rendering.** A button that mounts/unmounts based on
  `if (loaded)` confuses an LLM that snapshotted the tree before
  load. Tell the LLM via `NAC.describe()` includes a `mounted` flag
  per element (v2.1 always-on); your snapshot consumer should
  filter by that.
- **React 18 Strict Mode.** Double-invoked effects re-register the
  manifest. The runtime is idempotent; safe but you'll see double
  log lines in dev.
- **Server components / SSR.** NAC3 is client-only. Mark NAC-using
  components with `'use client'` (Next.js App Router) or render
  them lazily.

---

## 7. Going to production

Before shipping:

1. Replace `i18n_strict: 'permissive'` with `'strict'`. CI catches
   missing translations.
2. Run `npx @nac3/runtime validate ./src` -- expect zero error-severity
   findings.
3. Run `NAC.validate_global()` from a Playwright test; assert it
   returns `[]`.
4. If multi-tenant, ensure manifests are HMAC-signed server-side
   and `NAC.set_provenance_secret()` is called from authed code.

---

## 8. Where to go next

- `SPEC.md` for the full contract.
- `guides/LLM_WIRING.md` for the intermediary backend that resolves
  "guardar la factura" into `NAC.click_by_verb('invoice','save')`.
- `SECURITY.md` for the threat model.
- The demos at yujin.app/nac-spec/ (`example.php` is the v1.9
  reference; `example-v20-full.php` is the brownfield migration
  story).
