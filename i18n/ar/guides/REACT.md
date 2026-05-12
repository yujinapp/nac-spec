---
translation_source: guides/REACT.md
translation_source_hash: 9026b361e9e072347481a1f4492eea6f306e77cbbdb53b0d1a40d25008dbecdd
translation_quality: machine_v1
translation_lang: ar
translation_date: 2026-05-11T15:07:59.679015+00:00
---

# دليل تبني NAC3 مع React

يوضح هذا الدليل كيفية تحويل تطبيق React إلى تطبيق مدفوع بـ NAC، وذلك عبر مسارين:

- **Greenfield:** مشروع جديد، NAC3 من اليوم الأول.
- **Brownfield:** تطبيق قائم، يُضاف إليه NAC3 تدريجياً دون إعادة كتابة.

كلاهما يستخدم `@nac3/runtime` من npm. لا افتراضات على خطوة البناء؛ يعمل هذا مع Vite وNext.js وCreate React App وRemix وأي أداة تجميع تتعامل مع الحزم العادية.

---

## 1. التثبيت

```
npm install @nac3/runtime
```

تُعرِّض الحزمة وقت التشغيل عبر `window.NAC` عند أول استيراد.
وقت التشغيل مستقل عن أي إطار عمل؛ React فقط يُزيّن JSX بسمات `data-nac-*` ويسجّل المانيفستات عبر `useEffect`.

---

## 2. Greenfield -- تطبيق جديد

### 2.1 تهيئة وقت التشغيل مرة واحدة

في المكوّن الجذري (أو `main.tsx` / `_app.tsx`):

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

### 2.2 تزيين المكوّنات

كل عنصر قابل للنقر أو التعبئة أو التبديل يحصل على:

- `data-nac-id` -- مسار منقّط ثابت.
- `data-nac-role` -- أحد الأدوار القياسية (انظر SPEC القسم 1).
- `data-nac-action="<verb>"` -- فقط للعناصر ذات `role="action"`.

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

### 2.3 تسجيل مانيفست

المانيفست هو مصدر الحقيقة الموجَّه للوكيل. عندما يحلّ نموذج LLM كلمة "guardar" يجد الفعل `save` هنا:

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

قواعد أساسية:

- `useEffect` مع تبعيات `[]`: التسجيل مرة واحدة عند التحميل.
- المانيفست كائن ثابت؛ لا تُعد بناءه عند كل تصيير (وقت التشغيل يعامل `register` كعملية idempotent لكنك تُهدر دورات معالجة).
- وضع React Strict Mode يستدعي التأثيرات مرتين في بيئة التطوير. `register` في وقت التشغيل idempotent؛ آمن.

### 2.4 إطلاق أحداث النجاح من المعالجات

إذا كان وقت التشغيل سيُقاد بواسطة وكيل ينتظر `NAC.click()`، يجب على معالجاتك إطلاق `nac:action:succeeded` بعد تنفيذ التأثير الجانبي:

```tsx
function onSave() {
  await api.saveInvoice(/* ... */);
  document.dispatchEvent(new CustomEvent('nac:action:succeeded', {
    detail: { plugin: 'invoice', action_id: 'invoice.save' }
  }));
}
```

هذا هو عقد v2.1. يأتي v2.2 بخطاف `useNACAction` يتولى هذا عنك (انظر قسم الخطاطيف أدناه).

### 2.5 تشغيله

من أي وكيل أو مشغّل صوتي أو اختبار:

```tsx
await window.NAC.click('invoice.save');
// or by verb:
await window.NAC.click_by_verb('invoice', 'save');
// or fill a field:
await window.NAC.fill('invoice.client_name', 'Acme Corp');
```

---

## 3. Brownfield -- تطبيق React قائم

المبدأ: لا تُعيد هيكلة كل شيء دفعة واحدة. أضف NAC3 إلى مكوّن واحد، تحقق منه، ثم كرّر.

### 3.1 ترتيب العمل

1. **ابدأ بالغلاف الأعلى مستوى.** أضف `data-nac-plugin="<your-app-slug>"` إلى `<div>` أو `<main>` الجذري. يلتقطه شجرة النطاق في وقت التشغيل.
2. **الأزرار الأكثر استخداماً بعد ذلك.** حفظ، إلغاء، إرسال، حذف في الشاشات الأكثر نشاطاً. أضف `data-nac-id` و`data-nac-role="action"` و`data-nac-action="<verb>"`. لا تُضف مانيفست بعد.
3. **تحقق أن وقت التشغيل يراها.** افتح DevTools، نفّذ `NAC.describe()`. يجب أن تظهر الأزرار تحت slug الإضافة الخاصة بها.
4. **أضف مانيفست بسيطاً.** فقط الأزرار من الخطوة 2 مع أفعالها. الآن يعمل `NAC.click_by_verb()`.
5. **أضف الحقول.** تحصل المدخلات على `data-nac-role="field"` وإدخالات في المانيفست.
6. **أضف التبويبات.** تحصل مبدّلات التبويب على `data-nac-role="tab"`. **مهم جداً:** المعرّفات المطابقة لـ `^tab\.` يجب أن يكون دورها `tab` (استعلام `NAC.tab()` في وقت التشغيل يعمل بالأدوار القياسية فقط؛ انظر SPEC القسم 1).

### 3.2 لا تتعارض مع مكتبة المكوّنات الحالية

على الأرجح تستخدم shadcn أو Mantine أو MUI أو Chakra أو نظامك المخصص. معظم هذه المكتبات تُصيّر DOM خاصاً بها. نمطان يعملان:

**النمط A: تمرير سمات NAC3 مباشرة.** معظم المكتبات المبنية جيداً تُمرّر الخصائص غير المعروفة إلى عنصر DOM الأساسي:

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

إذا كانت مكتبتك تُمرّر سمات `data-*`، فهذا كافٍ.

**النمط B: مكوّن غلاف.** إذا كانت مكتبتك تبتلع خصائص `data-*`، اكتب غلافاً صغيراً:

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

### 3.3 التسجيل التلقائي من DOM

إذا كان التصريح بالمانيفستات يدوياً أمراً مرهقاً، فإن الامتداد `autoRegister.watch` في v2.0 يتجوّل في DOM ويسجّل تلقائياً كل ما يحمل `data-nac-id` و`data-nac-role`:

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

`i18n_strict: 'permissive'` مناسب لـ Brownfield. في الإنتاج، انتقل إلى `'strict'` بمجرد اكتمال كتالوج الترجمة لديك.

---

## 4. الخطاطيف (معاينة v2.2)

تُشحن هذه الخطاطيف في v2.2. لـ v2.1 يمكنك نسخها إلى مشروعك اليوم؛ فهي تُغلّف وقت تشغيل v2.1 وتوفر API أكثر اتساقاً مع أسلوب React.

### 4.1 `useNACManifest`

```tsx
export function useNACManifest(manifest) {
  useEffect(() => {
    if (!window.NAC) return;
    window.NAC.register(manifest);
  }, [manifest.plugin_slug]);  // re-register only on slug change
}
```

### 4.2 `useNACAction` -- إطلاق تأكيد تلقائي

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

الاستخدام:

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

### 4.3 `useNACDescribe` -- استعراض الشجرة من لوحة تحكم

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

## 5. الاختبار

### 5.1 اختبارات الوحدة والتكامل

يتكامل NAC3 بسلاسة مع React Testing Library:

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

### 5.2 اختبارات شاملة (Playwright)

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

## 6. المشكلات الشائعة

- **معرّفات قديمة في القوائم المفهرسة.** إذا بنيت المعرّفات من فهرس الصف (`data-nac-id={'row.' + i}`) وأُعيد ترتيب الصفوف، تنكسر الوكلاء التي خزّنت المعرّف مسبقاً. استخدم مفاتيح ثابتة (معرّفات قاعدة البيانات).
- **التصيير الشرطي.** زر يُحمَّل ويُفرَّغ بناءً على `if (loaded)` يُربك نموذج LLM الذي التقط لقطة للشجرة قبل التحميل. أخبر النموذج عبر `NAC.describe()` الذي يتضمن علامة `mounted` لكل عنصر (مفعّلة دائماً في v2.1)؛ يجب على مستهلك اللقطة التصفية بناءً عليها.
- **React 18 Strict Mode.** التأثيرات المستدعاة مرتين تُعيد تسجيل المانيفست. وقت التشغيل idempotent؛ آمن لكنك ستلاحظ سطور سجل مضاعفة في بيئة التطوير.
- **مكوّنات الخادم / SSR.** NAC3 يعمل على جانب العميل فقط. ضع `'use client'` على المكوّنات التي تستخدم NAC (Next.js App Router) أو صيّرها بشكل كسول.

---

## 7. الانتقال إلى الإنتاج

قبل الشحن:

1. استبدل `i18n_strict: 'permissive'` بـ `'strict'`. يكتشف CI الترجمات المفقودة.
2. نفّذ `npx @nac3/runtime validate ./src` -- توقّع صفر نتائج بمستوى خطأ.
3. نفّذ `NAC.validate_global()` من اختبار Playwright؛ تحقق أنه يُعيد `[]`.
4. في حالة تعدد المستأجرين، تأكد أن المانيفستات موقّعة بـ HMAC من جانب الخادم وأن `NAC.set_provenance_secret()` يُستدعى من كود مصادق عليه.

---

## 8. الخطوات التالية

- `SPEC.md` للعقد الكامل.
- `guides/LLM_WIRING.md` للواجهة الخلفية الوسيطة التي تحوّل "guardar la factura" إلى `NAC.click_by_verb('invoice','save')`.
- `SECURITY.md` لنموذج التهديدات.
- العروض التوضيحية على yujin.app/nac-spec/ (`example.php` هو المرجع للإصدار v1.9؛ `example-v20-full.php` هو قصة الترحيل لـ Brownfield).

---

*This is a machine translation of the canonical English
version at `/nac-spec/guides/REACT.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
