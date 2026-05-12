---
translation_source: guides/AI_PLAYBOOK_MIGRATION.md
translation_source_hash: f49b65c798ab36923cab79511851c64a81ad6609a1c37d4936d4c6c0542cc706
translation_quality: machine_v1
translation_lang: ar
translation_date: 2026-05-11T15:14:04.215917+00:00
---

# دليل الذكاء الاصطناعي -- ترحيل مشروع قائم إلى NAC3

**إصدار NAC3:** 2.2 مستقر + معاينة التوافق v2.3.
**الجمهور المستهدف:** أي وكيل ذكاء اصطناعي (Claude، GPT، Gemini، نموذج محلي) مكلّف
بترحيل تطبيق ويب قائم إلى مطابقة NAC-3.
**الصيغة:** دليل تشغيل خطوة بخطوة يتضمن لكل خطوة: ماذا، وكيف، والتحقق.

حين يقول المستخدم **"لنرحّل هذا المشروع إلى NAC-3"** يجب على وكيل الذكاء الاصطناعي
الذي يقرأ هذا الملف تنفيذ الخطوات أدناه بالترتيب.
الترحيل من مشاريع قائمة أصعب من البناء من الصفر، لأنك لا تستطيع تعطيل التطبيق الجاري.
كل خطوة تُشحن بشكل **مستقل**.

---

## الخطوة 0 -- تحديد النطاق + بوابات الأمان

### 0.1 أسئلة تُطرح على المستخدم

1. **هامش المخاطرة**: هل التطبيق في بيئة الإنتاج؟ إذا نعم، يجري الترحيل شاشةً بشاشة خلف feature flags. أما في بيئة التجهيز فيمكنك أن تكون أكثر جرأة.
2. **الإطار البرمجي**: استنتجه من `package.json` / `composer.json` / شجرة المشروع، ثم أكّد مع المستخدم.
3. **أهم 10 أفعال**: اطلب من المستخدم سرد الإجراءات العشرة الأكثر استخدامًا في تطبيقه (حفظ، إلغاء، بحث، تصفية، إلخ). هذه تُرحَّل أولًا.
4. **خلفية المحادثة**: هل ستعيد استخدام بنية محادثة قائمة (Yujin chat على `/yujin/nac-demo`، أو وسيط LLM خاص بك)؟
5. **تغطية الاختبارات الحالية**: هل يوجد Playwright / Cypress / Jest؟ ستضيف اختبارات NAC3 بجانبها، لا بديلًا عنها.
6. **مكتبة المكوّنات**: shadcn / MUI / PrimeNG / Mantine / مخصصة؟ بعض المكتبات تبتلع خصائص `data-*`؛ ستحتاج إلى غلافات (انظر الخطوة 5).

### 0.2 التحقق المبدئي من git

```bash
git status              # MUST be clean before starting
git checkout -b feat/nac3-migration
```

كل خطوة ترحيل في NAC تعيش في commit مستقل حتى يتمكن المستخدم من مراجعة كل شريحة والتراجع عنها.

---

## الخطوة 1 -- تثبيت وقت التشغيل + إنشاء وحدة التشغيل

```bash
npm install @nac3/runtime@^2.2.0
```

أنشئ `src/nac/boot.ts` (أو ما يعادله في إطارك البرمجي):

```ts
import '@nac3/runtime';
import '@nac3/runtime/extensions';
// import '@nac3/runtime/chat-client';  // uncomment when ready for chat

declare global { interface Window { NAC?: any; NacChat?: any; } }
```

استورده مرة واحدة من نقطة الدخول الجذرية لتطبيقك (`main.tsx`، `app.module.ts`،
أو أعلى سكريبت `<head>` في HTML).

**التحقق:** `window.NAC` معرَّف في وحدة تحكم المتصفح؛
`window.NAC.version` يُرجع `'2.2.0'` (أو أعلى).

**Commit:** `feat(nac3-migration): step 1 -- install runtime + boot module`

---

## الخطوة 2 -- تزيين غلاف التطبيق

أضف `data-nac-plugin="<app-slug>"` إلى الحاوية **الأخارجية** التي تلفّ واجهتك الرئيسية.
هذه هي أهم سمة في عملية الترحيل -- بدونها تكون لقطة وسيط LLM فارغة
(درس مستفاد من حالات React + Angular، الخطأ رقم 1،
موثّق في `docs/CASE_STUDIES_DISCOVERY.md`).

### مثال React

```tsx
return (
  <div className="app" data-nac-plugin="my-app">
    ...
  </div>
);
```

### مثال Angular

```html
<div class="app" data-nac-plugin="my-app">
  ...
</div>
```

### تصيير من الخادم (PHP / Rails / Django)

```html
<body data-nac-plugin="my-app">
  ...
</body>
```

**التحقق:** من وحدة تحكم المتصفح: `NAC.describe().plugins.length >= 1`.

**Commit:** `feat(nac3-migration): step 2 -- root data-nac-plugin attribute`

---

## الخطوة 3 -- تزيين أزرار الأفعال العشرة الأولى

خذ الإجراءات العشرة الأكثر استخدامًا من الخطوة 0.3. لكل زر:

```html
<button
  data-nac-id="<plugin>.<verb>"
  data-nac-role="action"
  data-nac-action="<verb>"
  onclick="...">
  ...
</button>
```

**اصطلاحات المعرّفات:**
- مُسبوقة باسم الإضافة: `invoice.save`، لا `save` وحدها.
- حروف صغيرة مع شرطة سفلية: `add_row`، لا `AddRow` ولا `add-row`.
- الفعل في النهاية إن كان فعلًا عامًا للتطبيق؛ وإلا يكون متداخلًا:
  `dashboard.invoice.list.row.42.delete`.

لا تلمس `onclick` الحالي / معالج الحدث -- التزيين إضافي فقط.

**التحقق:** من وحدة التحكم:
```js
NAC.describe().plugins[0].elements.length  // >= 10
NAC.list_registered_plugins()                // includes your plugin
```

**Commit:** `feat(nac3-migration): step 3 -- top-10 buttons decorated`

---

## الخطوة 4 -- إضافة manifest مبسّط

لا تحاول تغطية كل عنصر في اليوم الأول. غطِّ أزرار الأفعال العشرة الأولى
من الخطوة 3 مع `label_i18n` مناسب:

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

سجّله عند التشغيل:

```ts
window.NAC?.register(APP_MANIFEST);
```

إن لم تستطع شحن 10 لغات في اليوم الأول، استخدم `i18n_strict: 'permissive'`
على مسار autoRegister.watch. هذا حلٌّ مؤقت؛
سيُصدر المدقق الصارم لـ NAC3 v2.2 في الإنتاج تحذيرات عند نقص الترجمات.

**التحقق:**
```js
NAC.list_registered_plugins()           // ['my-app']
await NAC.click_by_verb('my-app','save')  // resolves
```

**Commit:** `feat(nac3-migration): step 4 -- manifest with top-10 verbs`

---

## الخطوة 5 -- التعامل مع مكتبة المكوّنات (إن وُجدت)

إذا كان تطبيقك يستخدم MUI / Mantine / PrimeNG / إلخ وكانت الأزرار
تبتلع خصائص `data-*`، اكتب غلافًا خفيفًا:

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

استبدل `<Button>` بـ `<NacButton nacId="..." verb="...">` للأزرار العشرة الأولى.
افعل ذلك تدريجيًا.

**Commit:** `feat(nac3-migration): step 5 -- component library wrapper`

---

## الخطوة 6 -- إصدار عقد الإقرار

مساعد `bindAction` في v2.2 هو المسار الأنظف:

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

تُطلق طبقة bindAction حدث `nac:action:succeeded` تلقائيًا
بعد انتهاء `onClick` الخاص بالمستخدم. لا مزيد من رسائل "لم أتمكن من تنفيذ X: انتهت المهلة".

**التحقق:** من وحدة التحكم:
```js
document.addEventListener('nac:action:succeeded', e => console.log(e.detail));
await NAC.click('my-app.save');
// Should print {plugin: 'my-app', action_id: 'my-app.save', ...}
```

**Commit:** `feat(nac3-migration): step 6 -- bindAction ack contract`

---

## الخطوة 7 -- إضافة الحقول والتبويبات

لكل حقل إدخال يكتب فيه المستخدم:

```html
<input data-nac-id="my-app.field_x" data-nac-role="field" ...>
```

لكل تبويب في مكوّنات شريط التبويبات:

```html
<button
  data-nac-id="tab.<key>"
  data-nac-role="tab"
  onclick="...">
  ...
</button>
```

**تنبيه مهم (قاعدة المدقق الصارم v2.2):** أي معرّف يطابق `^tab\.`
يجب أن يحمل الدور `tab`. عدم التطابق يُنتج
نتيجة `tab_id_manifest_role_drift` ولن يتمكن وقت التشغيل من إيجاد
التبويب عبر `NAC.tab()`.

**Commit:** `feat(nac3-migration): step 7 -- fields + tabs decorated`

---

## الخطوة 8 -- إضافة لوحة المحادثة (اختياري، قابل للتأجيل)

أدرج مرجع `nac-chat-client.js`:

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

بديلًا عن ذلك، **أجّل المحادثة كليًا** وأخبر المستخدمين بتثبيت
Yujin Pilot (`yujin.app/pilot`) الذي يكتشف تطبيقك عبر
MCP ويتحكم فيه من لوحة قيادة مركزية.

**Commit:** `feat(nac3-migration): step 8 -- chat panel`

---

## الخطوة 9 -- إضافة مجموعة اختبارات NAC3

انسخ بنية الاختبارات المرجعية من Yujin:

```bash
mkdir -p test/nac3
cp /path/to/rpaforce-crm/packages/nac/test/stage*.mjs ./test/nac3/
cp /path/to/rpaforce-crm/tools/nac/test-launch.sh ./test/nac3/
```

كيّف slug الإضافة ومرجع manifest. ثم شغّل:

```bash
bash ./test/nac3/test-launch.sh
```

**التحقق:** جميع الطبقات خضراء.

**Commit:** `feat(nac3-migration): step 9 -- NAC3 test corpus`

---

## الخطوة 10 -- الترقية إلى مطابقة NAC-3

```bash
# In your CI:
npx @nac3/runtime validate ./src --severity=error  # exit 0 required
NAC.validate_global({probe: true})              # zero findings required
```

اضبط `NAC.STRICT_VALIDATION = true` في تشغيل الإنتاج لفرض
تماسك الأدوار عند التسجيل.

**Commit:** `feat(nac3-migration): step 10 -- NAC-3 conformance gate`

---

## ترتيب الترحيل عبر الشاشات

في تطبيق إنتاجي يضم شاشات كثيرة، لا تحاول ترحيلها دفعة واحدة:

1. **الشاشة الأكثر استخدامًا أولًا** (مثل تسجيل الدخول + لوحة التحكم).
2. **الشاشة الأعلى قيمة تاليًا** (التي يقضي فيها مستخدموك المتمرسون معظم وقتهم).
3. **الشاشات العامة** (المرئية لحركة المرور المجهولة).
4. **شاشات الإدارة** أخيرًا (حركة مرور منخفضة، قبول أعمق).

كل شاشة تحصل على PR مستقل. كل PR يُشحن خلف feature flag إن توفّر؛
التراجع يكون بقلب الـ flag.

---

## أخطاء الترحيل الشائعة

1. **نسيان `data-nac-plugin` على العنصر الجذري.** الـ manifest مسجَّل لكن LLM لا يراه. **العَرَض:** المحادثة تقول "كيف يمكنني مساعدتك" بشكل عام دون إجراءات. الحل: أضف السمة. (الخطأ رقم 1 من دراسات الحالة.)
2. **إغلاق stale closure لحالة React في onChatAction.** استخدم refs والمحدِّدات الدالية. (الخطأ رقم 2 من دراسات الحالة.)
3. **معرّف تبويب بدور غير tab.** نتيجة من المدقق الصارم v2.2. `^tab\.` يجب أن يحمل الدور `tab`.
4. **إعادة استخدام المعرّفات بعد إعادة الهيكلة.** زر انتقل إلى دور دلالي جديد يجب أن يحصل على معرّف جديد. إعادة الاستخدام تكسر الأتمتة اللاحقة.
5. **مكتبة المكوّنات تبتلع data-*.** اكتشف ذلك مبكرًا؛ اكتب غلافًا (الخطوة 5).
6. **معالج النقر لا يُصدر إقرارًا.** استخدم `bindAction`. بدونه، `NAC.click()` ينتهي بمهلة 5 ثوانٍ حتى لو نجح التأثير الجانبي.

---

## انظر أيضًا

- [AI_PLAYBOOK_NEW_PROJECT.md](AI_PLAYBOOK_NEW_PROJECT.md) -- للمشاريع الجديدة من الصفر.
- [REACT.md](REACT.md) / [ANGULAR.md](ANGULAR.md) -- تعمّق في الأطر البرمجية.
- [NAC_TEST_MANUAL.md](../docs/NAC_TEST_MANUAL.md) -- دليل الاختبار بعد الترحيل.
- [CASE_STUDIES_DISCOVERY.md](../docs/CASE_STUDIES_DISCOVERY.md) -- أخطاء اكتُشفت خلال ترحيل مرجع Yujin.

## الرخصة

Apache-2.0.

---

*This is a machine translation of the canonical English
version at `/nac-spec/guides/AI_PLAYBOOK_MIGRATION.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
