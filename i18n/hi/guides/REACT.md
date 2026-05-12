---
translation_source: guides/REACT.md
translation_source_hash: 9026b361e9e072347481a1f4492eea6f306e77cbbdb53b0d1a40d25008dbecdd
translation_quality: machine_v1
translation_lang: hi
translation_date: 2026-05-11T14:56:46.897124+00:00
---

# NAC3 + React अपनाने की गाइड

यह गाइड एक React ऐप को दो तरीकों से NAC-संचालित बनाती है:

- **Greenfield:** नया प्रोजेक्ट, शुरू से ही NAC3।
- **Brownfield:** मौजूदा ऐप, बिना पूरी तरह दोबारा लिखे NAC3 को धीरे-धीरे जोड़ना।

दोनों में npm से `@nac3/runtime` का उपयोग होता है। किसी खास build-step की ज़रूरत नहीं; यह Vite, Next.js, Create React App, Remix, या किसी भी सामान्य पैकेज को bundle करने वाले टूल के साथ काम करता है।

---

## 1. इंस्टॉल करें

```
npm install @nac3/runtime
```

पैकेज पहली बार import होने के बाद runtime को `window.NAC` के रूप में उपलब्ध कराता है।
Runtime framework-agnostic है; React बस JSX में `data-nac-*` attributes जोड़ता है और `useEffect` के ज़रिए manifests रजिस्टर करता है।

---

## 2. Greenfield -- नया ऐप

### 2.1 Runtime को एक बार माउंट करें

अपने root component (या `main.tsx` / `_app.tsx`) में:

```tsx
import { useEffect } from 'react';
import '@nac3/runtime';
import '@nac3/runtime/extensions';   // v2.0 brownfield primitives + HMAC
// वैकल्पिक: voice + chat के लिए '@nac3/runtime/chat-client'

export function App() {
  useEffect(() => {
    // Tenant prefix (multi-tenant SaaS pattern)। single-tenant हो तो छोड़ें।
    if (window.NAC?.setTenantPrefix) {
      window.NAC.setTenantPrefix('demo');
    }
    // अगर signed manifests भेज रहे हैं तो HMAC secret। अपने auth API से लें।
    // window.NAC.set_provenance_secret(secret);
  }, []);

  return <YourAppShell />;
}
```

### 2.2 Components को decorate करें

हर clickable / fillable / switchable element को ये मिलते हैं:

- `data-nac-id` -- एक स्थिर dotted path।
- `data-nac-role` -- canonical roles में से एक (SPEC sec 1 देखें)।
- `data-nac-action="<verb>"` -- केवल `role="action"` के लिए।

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

### 2.3 Manifest रजिस्टर करें

Manifest agent के लिए सच्चाई का स्रोत है। "guardar" को resolve करने वाला LLM यहाँ verb `save` ढूंढता है:

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
  // ... 2.2 का JSX ...
}
```

मुख्य नियम:

- `useEffect` के साथ `[]` deps: mount पर एक बार रजिस्टर करें।
- Manifest एक static object है; हर render पर इसे दोबारा न बनाएं (runtime `register` को idempotent मानता है, लेकिन cycles बर्बाद होते हैं)।
- React Strict Mode dev में effects को दो बार invoke करता है। Runtime का `register` idempotent है; सुरक्षित है।

### 2.4 Handlers से success events emit करें

अगर runtime को किसी agent द्वारा चलाया जाना है जो `NAC.click()` का इंतज़ार करता है, तो आपके handlers को side effect के बाद `nac:action:succeeded` emit करना होगा:

```tsx
function onSave() {
  await api.saveInvoice(/* ... */);
  document.dispatchEvent(new CustomEvent('nac:action:succeeded', {
    detail: { plugin: 'invoice', action_id: 'invoice.save' }
  }));
}
```

यह v2.1 contract है। v2.2 में एक `useNACAction` hook आता है जो यह काम आपके लिए करता है (नीचे Hooks section देखें)।

### 2.5 इसे चलाएं

किसी भी agent, voice runner, या test से:

```tsx
await window.NAC.click('invoice.save');
// या verb से:
await window.NAC.click_by_verb('invoice', 'save');
// या field भरें:
await window.NAC.fill('invoice.client_name', 'Acme Corp');
```

---

## 3. Brownfield -- मौजूदा React ऐप

सिद्धांत: एक साथ सब कुछ refactor न करें। NAC3 को एक component में जोड़ें, validate करें, दोहराएं।

### 3.1 काम का क्रम

1. **पहले top-level wrapper।** अपने root `<div>` या `<main>` में `data-nac-plugin="<your-app-slug>"` जोड़ें। Runtime का scope tree इसे उठा लेता है।
2. **इसके बाद सबसे ज़्यादा इस्तेमाल होने वाले buttons।** अपनी सबसे व्यस्त screens में Save, cancel, submit, delete। `data-nac-id`, `data-nac-role="action"`, `data-nac-action="<verb>"` जोड़ें। अभी manifest न जोड़ें।
3. **Verify करें कि runtime उन्हें देख रहा है।** DevTools खोलें, `NAC.describe()` चलाएं। Buttons अपने plugin slug के नीचे दिखने चाहिए।
4. **एक minimal manifest जोड़ें।** बस step 2 के buttons, उनके verbs के साथ। अब `NAC.click_by_verb()` काम करेगा।
5. **Fields जोड़ें।** Inputs को `data-nac-role="field"` + manifest entries मिलती हैं।
6. **Tabs जोड़ें।** Tab switchers को `data-nac-role="tab"` मिलता है। **ज़रूरी:** `^tab\.` से मेल खाने वाले ids का role `tab` होना चाहिए (runtime का `NAC.tab()` query canonical-role-only है; SPEC sec 1 देखें)।

### 3.2 अपनी मौजूदा component library से न लड़ें

आप शायद shadcn / Mantine / MUI / Chakra / अपना custom system इस्तेमाल करते हैं।
इनमें से ज़्यादातर अपना DOM render करते हैं। दो patterns काम करते हैं:

**Pattern A: NAC3 attrs पास करें।** ज़्यादातर अच्छी तरह बनी libraries unknown props को underlying DOM element तक forward करती हैं:

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

अगर आपकी library `data-*` attrs forward करती है, तो यही काफी है।

**Pattern B: wrapper component।** अगर आपकी library `data-*` props को निगल जाती है, तो एक छोटा wrapper लिखें:

```tsx
import { Button as MuiButton } from '@mui/material';
import { useEffect, useRef } from 'react';

interface NACButtonProps {
  nacId: string;
  verb: string;
  // ...अन्य Mui props
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

### 3.3 DOM से auto-register करें

अगर manifests हाथ से declare करना थकाऊ है, तो v2.0 extension `autoRegister.watch` DOM को traverse करता है और `data-nac-id` + `data-nac-role` वाली हर चीज़ को अपने आप रजिस्टर करता है:

```tsx
useEffect(() => {
  if (!window.NAC?.autoRegister) return;
  const root = document.querySelector('[data-nac-plugin]');
  if (!root) return;
  root.setAttribute('data-nac-watch', '1');
  window.NAC.autoRegister.watch(root, {
    i18n_strict: 'permissive',  // migration के दौरान partial 10-locale स्वीकार करें
    throttleMs: 100
  });
}, []);
```

Brownfield के लिए `i18n_strict: 'permissive'` सही है। Production के लिए, जब आपका i18n catalogue पूरा हो जाए तो `'strict'` पर switch करें।

---

## 4. Hooks (v2.2 preview)

ये v2.2 में आते हैं। v2.1 के लिए आप इन्हें आज अपने प्रोजेक्ट में copy कर सकते हैं; ये v2.1 runtime को wrap करते हैं और एक ज़्यादा idiomatic React API देते हैं।

### 4.1 `useNACManifest`

```tsx
export function useNACManifest(manifest) {
  useEffect(() => {
    if (!window.NAC) return;
    window.NAC.register(manifest);
  }, [manifest.plugin_slug]);  // केवल slug बदलने पर re-register करें
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
      // React का synthetic event खत्म होने के बाद v2.1 contract event emit करें।
      // Microtask delay ताकि React का synthetic event पहले पूरा हो।
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

उपयोग:

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

### 4.3 `useNACDescribe` -- panel से tree को introspect करें

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

NAC3 React Testing Library के साथ अच्छी तरह काम करता है:

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

## 6. आम गलतियाँ

- **Keyed lists में stale ids।** अगर आप ids row index से बनाते हैं (`data-nac-id={'row.' + i}`) और rows का क्रम बदलता है, तो id cache करने वाले agents टूट जाते हैं। Stable keys (DB ids) इस्तेमाल करें।
- **Conditional rendering।** एक button जो `if (loaded)` के आधार पर mount/unmount होता है, उस LLM को confuse करता है जिसने load से पहले tree का snapshot लिया था। LLM को बताएं कि `NAC.describe()` में हर element के लिए `mounted` flag होता है (v2.1 में हमेशा चालू); आपके snapshot consumer को उसी से filter करना चाहिए।
- **React 18 Strict Mode।** Double-invoked effects manifest को दोबारा रजिस्टर करते हैं। Runtime idempotent है; सुरक्षित है, लेकिन dev में double log lines दिखेंगी।
- **Server components / SSR।** NAC3 केवल client-side है। NAC इस्तेमाल करने वाले components को `'use client'` (Next.js App Router) से mark करें या उन्हें lazily render करें।

---

## 7. Production में जाना

भेजने से पहले:

1. `i18n_strict: 'permissive'` को `'strict'` से बदलें। CI छूटे हुए translations पकड़ेगा।
2. `npx @nac3/runtime validate ./src` चलाएं -- zero error-severity findings की उम्मीद करें।
3. Playwright test से `NAC.validate_global()` चलाएं; assert करें कि यह `[]` return करता है।
4. Multi-tenant होने पर, सुनिश्चित करें कि manifests server-side HMAC-signed हों और `NAC.set_provenance_secret()` authenticated code से call हो।

---

## 8. आगे कहाँ जाएं

- पूरे contract के लिए `SPEC.md`।
- उस intermediary backend के लिए `guides/LLM_WIRING.md` जो "guardar la factura" को `NAC.click_by_verb('invoice','save')` में resolve करता है।
- Threat model के लिए `SECURITY.md`।
- yujin.app/nac-spec/ पर demos (`example.php` v1.9 reference है; `example-v20-full.php` brownfield migration की कहानी है)।

---

*This is a machine translation of the canonical English
version at `/nac-spec/guides/REACT.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
