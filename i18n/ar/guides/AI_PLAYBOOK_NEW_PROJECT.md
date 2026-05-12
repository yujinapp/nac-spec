---
translation_source: guides/AI_PLAYBOOK_NEW_PROJECT.md
translation_source_hash: 6586a966938a6d84086a8b79805cde15886536b6718b79526ff7d16d202686fe
translation_quality: machine_v1
translation_lang: ar
translation_date: 2026-05-11T15:12:31.380084+00:00
---

# دليل الذكاء الاصطناعي -- بدء مشروع NAC-3 جديد

**إصدار NAC3:** 2.2 مستقر + معاينة التوافق v2.3.
**الجمهور المستهدف:** أي وكيل ذكاء اصطناعي (Claude، GPT، Gemini، نموذج محلي) مكلّف
ببناء مشروع متوافق مع NAC-3 من الصفر.
**الصيغة:** دليل تنفيذي خطوة بخطوة. لكل خطوة: ماذا، وكيف، وتحقق.
لا غموض.

عندما يقول المستخدم **"لنبدأ مشروع NAC-3 جديد"** أو ما شابه ذلك،
يجب على وكيل الذكاء الاصطناعي الذي يقرأ هذا الملف تنفيذ الخطوات
أدناه بالترتيب، مع التحقق من كل بوابة قبل المتابعة.

---

## الخطوة 0 -- تأكيد النطاق مع المستخدم

اطرح هذه الأسئلة بالضبط قبل كتابة أي كود:

1. **الإطار**: React، Angular، Vue، Svelte، Vanilla، أم
   server-rendered (PHP/Rails/Django)؟
2. **اللغات**: أيٌّ من اللغات العشر في NAC3 يجب أن يدعمها التطبيق
   عند الإطلاق؟ (es, en, pt, fr, it, de, ja, zh, hi, ar)
3. **الواجهة الخلفية للمحادثة**: هل سيعرض التطبيق وسيطه الخاص مع
   نموذج اللغة (توفير endpoint)، أم سيستخدم Yujin chat المستضاف؟
4. **المصدر**: هل هو متعدد المستأجرين؟ إذا نعم، خطّط لتوقيع
   مانيفست HMAC.
5. **الصوت**: ضغط للتحدث فقط، أم حرّ اليدين، أم كلاهما؟
6. **التوافق (معاينة v2.3)**: هل سيكون هذا التطبيق قابلاً للاستيراد
   من قِبل مضيفي NAC3 الآخرين (Yujin Pilot، التطبيقات المشابهة)؟
   إذا نعم -> اعرض أدوات MCP server.

احتفظ بكل إجابة. فهي تحكم كل قرار لاحق.

---

## الخطوة 1 -- إنشاء هيكل المشروع

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

### Vanilla (HTML + JS + PHP، بدون إطار)

أنشئ:
- `index.html` مع `<body data-nac-plugin="app">`.
- `js/app.js` مع الاستيرادات.

### Server-rendered

ضمّن `@nac3/runtime` عبر CDN:

```html
<script src="https://yujin.app/nac-spec/js/nac.js?v=v22"></script>
<script src="https://yujin.app/nac-spec/js/nac-v2-extensions.js?v=v22"></script>
```

**تحقق:** ينجح `npm run build` (أو ما يعادله في الإطار المستخدم)
دون أخطاء. افتح في المتصفح؛ يجب أن يكون `window.NAC` معرَّفاً.

---

## الخطوة 2 -- تزيين الهيكل الخارجي

أضف إلى **الحاوية الجذرية** في القالب:

```html
<div data-nac-plugin="<your-app-slug>" class="app">
  ...
</div>
```

أضف إلى **كل عنصر قابل للنقر** (أزرار، روابط تعمل كأزرار):

```html
<button
  data-nac-id="<slug>.<verb>"
  data-nac-role="action"
  data-nac-action="<verb>"
  onclick="...">
  ...
</button>
```

أضف إلى **كل حقل نموذج** (input، textarea، select):

```html
<input
  data-nac-id="<slug>.<field-name>"
  data-nac-role="field"
  ... />
```

أضف إلى **كل زر تبويب** (المواصفة صارمة: المعرّف `^tab\.` يجب أن
يحمل role بقيمة `tab`):

```html
<button
  data-nac-id="tab.<key>"
  data-nac-role="tab"
  onclick="...">
  ...
</button>
```

**تحقق:** يُبلّغ `npx @nac3/runtime validate ./src` عن صفر نتائج
بمستوى خطأ. يُعيد `NAC.describe()` من وحدة تحكم المتصفح شجرةً
تحتوي على تطابقات `data-nac-plugin`.

---

## الخطوة 3 -- كتابة المانيفست

أنشئ `src/nac/manifest.ts` (أو ما يعادله):

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
    // ... كل العناصر الأخرى ...
  ]
};
```

**قواعد أساسية:**
- يجب أن يغطي كل `label_i18n` جميع اللغات العشر المدعومة. الخريطة
  المكتملة جزئياً تُعدّ نتيجة في المدقق الصارم v2.2.
- كل `id` يطابق `^tab\.` يجب أن يحمل `role: 'tab'`.
- كل `id` يجب أن يكون مسبوقاً باسم الإضافة (مثلاً `invoice.save`،
  وليس `save`).
- يجب أن تظل المعرّفات ثابتة عبر إعادة تصميم واجهة المستخدم.

**تحقق:** يُعيد `NAC.validate_global({probe: false})` صفر نتائج
بمستوى خطأ.

---

## الخطوة 4 -- تسجيل المانيفست عند التشغيل

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

أدرج `NacBoot` في `AppComponent` الخاص بك.

### Vanilla

```html
<script type="module">
import { APP_MANIFEST } from './nac/manifest.js';
window.NAC.register(APP_MANIFEST);
</script>
```

**تحقق:** يُعيد `NAC.list_registered_plugins()` القيمة
`['<your-app-slug>']`.

---

## الخطوة 5 -- إرسال عقد التأكيد من كل معالج نقر

لكل زر مزيَّن بـ `data-nac-role="action"`، يجب على معالج النقر
إرسال `nac:action:succeeded` بعد تأثيره الجانبي المتزامن.

### النمط A -- عبر `NAC.bindAction` (مساعد v2.2، موصى به)

```ts
const btn = document.querySelector('[data-nac-id="<slug>.save"]');
NAC.bindAction(btn, function (ev) {
  saveInvoice();          // تأثيرك الجانبي
}, { plugin: '<slug>', action_id: '<slug>.save' });
```

يتعامل `bindAction` تلقائياً مع الحالات المتزامنة وغير المتزامنة
(Promise) وحالات الإلقاء.

### النمط B -- الإرسال اليدوي

```ts
button.addEventListener('click', function () {
  saveInvoice();
  document.dispatchEvent(new CustomEvent('nac:action:succeeded', {
    detail: { plugin: '<slug>', action_id: '<slug>.save' }
  }));
});
```

للأدوار الأخرى، أرسل عائلة الأحداث القياسية:
- `role="field"` -> `nac:field:changed` (التفاصيل: `{plugin, field_id, value}`)
- `role="tab"` -> `nac:tab:activated` (التفاصيل: `{plugin, tab_id}`)
- راجع القسم 6 من SPEC.md للجدول الكامل.

**تحقق:** من وحدة تحكم المتصفح:
```js
document.addEventListener('nac:action:succeeded', e => console.log(e.detail));
await NAC.click('<slug>.save');
// يجب أن يطبع {plugin: '<slug>', action_id: '<slug>.save', ...}
```

---

## الخطوة 6 -- توصيل لوحة المحادثة

أدرج عميل المحادثة المرجعي أو استخدم Yujin Pilot (خارجي).

### الخيار A -- تضمين `nac-chat-client.js`

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

أنت توفر `endpoint` -- الواجهة الخلفية الوسيطة لنموذج اللغة التي
تستقبل `{prompt, lang, history, nac_tree}` وتُعيد
`{message, actions[]}`. راجع `LLM_WIRING.md`.

### الخيار B -- الاعتماد على Yujin Pilot

لا تضمّن المحادثة إطلاقاً. أخبر المستخدمين: "ثبّت Yujin Pilot
(yujin.app/pilot) للحصول على الصوت والمحادثة في هذا التطبيق".
يكتشف ماسح MCP الخاص بـ Pilot تطبيقك ويتحكم فيه من لوحة التحكم
المركزية.

---

## الخطوة 7 -- تشغيل مجموعة الاختبارات

انسخ البنية التحتية لاختبارات Yujin المرجعية كنقطة بداية:

```bash
# من جذر مشروعك
cp -r /path/to/rpaforce-crm/packages/nac/test ./test
cp -r /path/to/rpaforce-crm/tools/nac/test-launch.sh ./tools/test-launch.sh
```

عدّل `test/stage*.mjs` للإشارة إلى مانيفستك ومعرّف إضافتك بدلاً
من مانيفست العرض التوضيحي. يبقى الهيكل الأساسي متطابقاً.

شغّل:

```bash
bash ./tools/test-launch.sh
```

**تحقق:** جميع الطبقات على جانب Node خضراء. الوقت الإجمالي أقل من 15 ثانية.

---

## الخطوة 8 -- إضافة اختبارات Playwright الشاملة

```bash
mkdir -p tests/e2e-nac
cd tests/e2e-nac
npm init -y
npm install --save-dev @playwright/test
npx playwright install chromium
```

انسخ `tests/e2e-nac/specs/01-landing.spec.ts` من مرجع Yujin
كقالب؛ وكيّفه مع URL تطبيقك ومعرّف الإضافة.

لاختبار **خط الأنابيب الكامل** (محادثة -> نموذج اللغة -> إرسال ->
DOM -> تأكيد)، راجع `08-pipeline-end-to-end.spec.ts` من Yujin.
ثلاثة اختبارات تغطي التدفق بأكمله مقابل واجهتك الخلفية الحية.

---

## الخطوة 9 -- قائمة التحقق قبل النشر

قبل النشر:

- [ ] `NAC.STRICT_VALIDATION = true` -- يفرض التحقق من الأدوار
      عند التسجيل (يُلقي خطأ عند الانحراف).
- [ ] `npx @nac3/runtime validate ./src` -- صفر نتائج بمستوى خطأ.
- [ ] `npm test` (مجموعة اختباراتك) -- نجاح 100%.
- [ ] `npx playwright test` -- جميع اختبارات e2e خضراء.
- [ ] متعدد المستأجرين: وقّع المانيفستات بـ HMAC من جانب الخادم؛
      استدعِ `NAC.set_provenance_secret()` من كود مصادَق عليه.
- [ ] الأفعال المحمية بـ is_trusted: أدرج صراحةً في القائمة البيضاء
      أي فعل يُسمح لروبوتات RPA أو النقرات الاصطناعية بتشغيله
      (راجع SECURITY.md).
- [ ] i18n: كل `label_i18n` يغطي اللغات العشر (أو استخدم
      `i18n_strict: 'permissive'` أثناء الترحيل).

---

## الخطوة 10 -- الترقية إلى مطابقة NAC-3

شغّل `NAC.validate_global({probe: true})`. يُنشئ وقت التشغيل
نقرات اصطناعية على كل عنصر بـ `role="action"` للتحقق من أن كلاً
منها يُرسل تأكيده خلال 5 ثوانٍ.

**تحقق:** صفر نتائج. أنت الآن متوافق مع NAC-3.

---

## أخطاء شائعة للذكاء الاصطناعي (وكيفية تجنبها)

1. **تسجيل المانيفست دون وجود `data-nac-plugin` في DOM.**
   يتجوّل `NAC.describe()` في DOM، لا في السجل. بدون السمة،
   تكون لقطة الوسيط لنموذج اللغة فارغة لتلك الإضافة. اقرن
   الاثنين دائماً.
2. **إغلاق معالجات المحادثة على حالة React/Vue.** استخدم refs
   أو setters وظيفية. راجع الخطأ رقم 2 في CASE_STUDIES_DISCOVERY.md.
3. **i18n جزئي.** يفشل المدقق الصارم v2.2 على خرائط label_i18n
   غير المكتملة. إذا كان لا بد من الشحن جزئياً، استخدم
   `i18n_strict: 'permissive'` مع تذكرة TODO؛ فهذا ليس اختصاراً
   دائماً.
4. **إعادة استخدام المعرّفات بعد إعادة الهيكلة.** زر أُعيدت
   تسميته لدور دلالي جديد يجب أن يحصل على معرّف جديد. إعادة
   الاستخدام تُعطّل كل سكريبت وكيل مرتبط به.
5. **نسيان حدث التأكيد.** معالج يؤدي عمله بشكل متزامن لكنه لا
   يُرسل `nac:action:succeeded` سيُسبّب انتهاء مهلة `NAC.click()`.
   استخدم `bindAction` لتضمين العقد مباشرةً.

---

## انظر أيضاً

- [SPEC.md](../SPEC.md) -- العقد القياسي.
- [AI_PLAYBOOK_MIGRATION.md](AI_PLAYBOOK_MIGRATION.md) -- للمشاريع
  القائمة.
- [NAC_TEST_MANUAL.md](../docs/NAC_TEST_MANUAL.md) -- دليل
  الاختبار لأي تطبيق NAC-3.
- [REACT.md](REACT.md) / [ANGULAR.md](ANGULAR.md) -- تعمق في
  الأطر.

## الرخصة

Apache-2.0.

---

*This is a machine translation of the canonical English
version at `/nac-spec/guides/AI_PLAYBOOK_NEW_PROJECT.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
