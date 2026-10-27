---
translation_source_hash: 13f2725d22ba29c84ddfdf58bac800d547f968b0f393d5cd9285cf1e2d4d0a0a
translation_quality: machine_v1
translation_date: 2026-10-27
translation_engine: anthropic/claude-opus-5 (Yujin Forge)
translation_normative: false
translation_status: complete
translation_lang: ar
translation_source: SPEC.md
translation_source_version: 2.5.1
translation_source_date: 2026-10-27
translation_sections: 83
translation_sections_canonical: 83
translation_units: 282
translation_units_canonical: 282
translation_canonical_url: /nac-spec/SPEC.html
---

<!-- translation-banner: produced by scripts/build-translation-banners.mjs -->

> **ترجمة آلية وغير معيارية.** تُترجم النسخة الإنجليزية كما كانت في 2026-10-27 (NAC3 v2.5.1)، وتغطي 83 من 83 قسما في النص الأصلي الحالي. النص المعياري هو الإنجليزي؛ وعند أي اختلاف يُعتمد النص الإنجليزي.
>
> *Non-normative machine translation. The normative text of NAC3 is the English one.*
>
> [اقرأ النص المعياري بالإنجليزية](/nac-spec/SPEC.html)

<!-- /translation-banner -->

# NAC3 -- Native Agent Contract

**الإصدار:** 2.5.1 (مستقر -- سطح v2.5 الكامل: narrate و context+tree و expect+diff)
**الحالة:** إصدار مستقر. وسم التوزيع `latest` في npm يشير إلى هنا؛ والقسم 9.1 يبين ما يضمنه ذلك وما لا تضمنه نسخة ما قبل الإصدار. هذا المستند يذكر إصداره في موضع واحد بالضبط، في السطر أعلاه. أما وثائق RFC المنشورة وأدلتها في الطبقة 2 + الطبقة 3 فهي مسرودة في `README.md` و `runtime/CHANGELOG.md`.
**الترخيص:** Apache-2.0
**المحرر:** Yujin (yujin.app)

---

## 0. الغرض

NAC3 عقد بين واجهات الويب والوكلاء الذين يشغلونها. ويشمل الوكلاء منفذي
الصوت، ووسطاء نماذج اللغة، وروبوتات RPA، وأدوات الوصول، ومنفذي
الاختبارات من الطرف إلى الطرف. ويحدد هذا العقد:

1. **كيف تُسمَّى العناصر** -- حتى يستطيع الوكيل أن يقول "انقر زر الحفظ"
   وأن يحل ذلك إلى عقدة واحدة في DOM.
2. **كيف تُطبَّق الأفعال** -- حتى يستطيع الوكيل أن ينادي
   `NAC.click(id)` و `NAC.fill(id, value)` و `NAC.tab(plugin, key)`
   وغيرها، دون كود لاصق لكل تطبيق.
3. **كيف يُشار إلى الإتمام** -- حتى يعرف الوكيل متى انتهت خطوة، بعائلة
   أحداث حتمية لكل دور.
4. **كيف يُحفظ المنشأ** -- حتى يستطيع نظام لاحق أن يميز نقرة مستخدم
   حقيقية من نقرة مصنوعة.

يضيف NAC3 طبقة رقيقة فوق أي إطار عمل تستخدمه أصلا في العرض. وهو لا
يحل مكان ARIA ولا React ولا Vue ولا نظام التصميم الذي تستخدمه.

---

## 1. الأدوار

كل عنصر في DOM يهم الوكيل يحمل `data-nac-role`. والأدوار المعيارية هي:

| الدور | المعنى | مثال |
|------|---------|---------|
| `plugin` | وحدة واجهة مكتفية بذاتها (صفحة أو لوحة أو مجموعة عناصر). | `<article data-nac-plugin="invoice">` |
| `section` | علامة داخل ملحق (رأس، متن، تذييل، شريط جانبي). | `<section data-nac-role="section">` |
| `region` | منطقة قابلة للتسمية داخل قسم (مجموعة بطاقات، قائمة نتائج). | `<div data-nac-role="region">` |
| `action` | عنصر قابل للنقر يطلق فعلا (زر، رابط يعمل كزر). | `<button data-nac-role="action" data-nac-action="save">` |
| `field` | مدخل يكتبه المستخدم أو يبدله (نص، رقم، مربع اختيار، زر اختيار، تاريخ، ملف). | `<input data-nac-role="field">` |
| `option` | خيار قابل للانتقاء داخل حقل (ابن لمربع مركب أو select أو مجموعة أزرار اختيار). | `<li data-nac-role="option">` |
| `tab` | منتقي لوحات قابل للتبديل. **مطلوب عندما يطابق `data-nac-id` النمط `^tab\.`** | `<button data-nac-role="tab" data-nac-id="tab.lines">` |
| `breadcrumb-item` | درجة في مسار التنقل. | `<a data-nac-role="breadcrumb-item">` |
| `accordion-toggle` | أداة فتح وطي. | `<button data-nac-role="accordion-toggle">` |
| `step` | مؤشر خطوة في معالج. | `<li data-nac-role="step">` |
| `pagination-item` | أداة الانتقال بين الصفحات في قائمة مقسمة. | `<button data-nac-role="pagination-item">` |
| `confirm-button` | زر تأكيد أو إلغاء داخل حوار تأكيد. | `<button data-nac-role="confirm-button">` |
| `sort-control` | رأس عمود يرتب. | `<th data-nac-role="sort-control">` |
| `filter-control` | مطلق تصفية عمود. | `<button data-nac-role="filter-control">` |
| `data-table` | مضيف جدول بيانات (منذ 2.1). | `<table data-nac-role="data-table">` |
| `navigation` | منطقة تنقل تعمل كعلامة. **ليست تبويبا.** | `<nav data-nac-role="navigation">` |
| `confirm-dialog` | النافذة الطارئة لطلب تأكيد. | `<div data-nac-role="confirm-dialog">` |
| `draggable` | عنصر يستطيع المستخدم أن يرفعه ويحركه (منذ 1.6.2). | `<li data-nac-role="draggable">` |
| `drop-target` | موضع يمكن إفلات `draggable` فيه (منذ 1.6.2). | `<ul data-nac-role="drop-target">` |
| `button` | **مقبول على مضض، وغير موصى به.** زر قديم يحتاج فقط أن يكون قابلا للنقر، دون عقد فعل. يعامله زمن التشغيل كأنه `action`. والأفضل استخدام `action` مع `data-nac-action` صريح. | `<button data-nac-role="button">` |

الأدوار الخارجة عن هذه القائمة محفوظة لاستخدام مستقبلي. وينبغي لزمن
تشغيل من نوع NAC-strict أن يرفض الأدوار المجهولة عند التسجيل (v2.2).
ويمكن لزمن تشغيل من نوع NAC-permissive أن يعامل الأدوار المجهولة
كأنها `action` حفاظا على التوافق مع الماضي (السلوك الافتراضي في v1.9
و v2.0).

هذا الجدول هو القائمة المعيارية، وهو منشور كبيانات أيضا: الفهرس المقروء
آليا في `api/latest/contract.json` يحمل كل دور يقبله زمن التشغيل
المرجعي، وكل دور موسوم بـ `declared_in_spec_table`، حتى تُقارن
القائمتان دون قراءة نص سردي. وهما متفقتان حتى v2.5. وأي اختلاف لاحق
سيظهر في ذلك الوسم، بدل أن يبقى مخفيا في خلاف رأي بين مستند وتنفيذ.

---

## 2. الأسماء

كل عنصر يستطيع الوكيل حله يحمل `data-nac-id`. وهذا المعرف:

- **مسار بنقاط** (مثلا `deals.list.row.42.actions.delete`). النقاط
  تفصل مستويات المعنى؛ وزمن التشغيل لا يفسرها، لكن البشر ونماذج اللغة
  يفسرونها.
- **فريد عالميا داخل نطاق `data-nac-plugin` واحد.** ويمكن لملحقين
  مختلفين أن يتشاركا المعرف نفسه؛ وزمن التشغيل يحل بالزوج
  `(plugin, id)`.
- **ثابت عبر إعادة العرض.** وأطر العمل التي تولد معرفا جديدا في كل عرض
  (بصمات عشوائية، عدادات نسخ) تكسر هذا العقد.
- **ثابت عبر إعادة تصميم الواجهة.** ينتقل زر من شريط الأدوات إلى قائمة
  منسدلة؛ ويجب أن يبقى معرفه كما هو.

بادئات المعرفات المحفوظة (منذ 2.1):

| البادئة | محفوظة لأجل |
|--------|--------------|
| `tab.` | أزرار التبويب. ويجب أن يكون الدور `tab`. |
| `modal.` | عناصر في نطاق نافذة طارئة. والدور هو دور العنصر الورقي. |
| `field.` | صيغة مختصرة لحقل استمارة. ويجب أن يكون الدور `field` أو `option`. |
| `confirm.` | حوارات التأكيد. |

---

## 3. الأفعال

يمكن للعنصر الذي يحمل `data-nac-role="action"` أن يحمل
`data-nac-action="<verb>"` ليسمي ما يفعله. والفعل معرف حر بصيغة
snake-case يُتفق عليه بين المضيف والوكيل. ومن الأفعال الشائعة:

`save` و `cancel` و `submit` و `delete` و `edit` و `view` و `create`
و `approve` و `reject` و `send` و `download` و `upload` و `refresh`
و `expand` و `collapse` و `open` و `close` و `add_row` و `remove_row`.

تحل `NAC.click_by_verb(plugin, verb)` الفعل إلى العنصر الوحيد من نوع
action تحت ذلك الملحق وتنقره. وأن تتشارك عدة عناصر action الفعل نفسه
تحت ملحق واحد خطأ في البيان (lint: `duplicate_verb`).

---

## 4. البيان

يمكن لكل ملحق أن يسجل بيانا عبر:

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

البيان هو مصدر الحقيقة الموجه إلى الوكيل. فوسيط نماذج لغة يقرر أن
"المستخدم قال 'guardar'" يراجع بيان الملحق، فيجد الفعل `save`، ثم يصدر
`NAC.click_by_verb('invoice', 'save')`.

### 4.1 الحقول المطلوبة

- `plugin_slug` -- يطابق `data-nac-plugin` في العنصر المضيف.
- `nac_version` -- إصدار NAC3 الذي يدعي هذا البيان مطابقته. ويرفض زمن
  التشغيل البيانات التي تدعي إصدارا أعلى من إصداره.

### 4.2 الحقول الاختيارية

- `elements[]` -- فهرس العناصر المسماة. ويجب أن يحمل كل مدخل `id`
  و `role`.
- `tabs[]` -- مصفوفة مستقلة في المستوى الأعلى للتبويبات. وهي مكافئة
  لمداخل `elements[]` التي تحمل `role:'tab'`. والصيغتان صحيحتان.
- `fields[]` و `actions[]` و `kpis[]` و `data_tables[]` -- مجموعات
  فرعية مصنفة بالنوع؛ ولها معنى `elements[]` نفسه بعد التصفية بالدور.
  وتختار العروض التوضيحية الصيغة الأسهل قراءة على البشر.

### 4.3 i18n

يجب أن يغطي كل `label_i18n` كل لغات NAC3 العشر، وهي 10 لغات:

```
es, en, pt, fr, ja, zh, hi, ar, de, it
```

القيمة `i18n_strict: 'permissive'` في `NAC.autoRegister.watch()` تسمح
بتغطية جزئية خلال ترحيل نظام قائم؛ أما بيانات الإنتاج فينبغي أن تقدم
اللغات العشر كلها، أي 10 لغات.

#### 4.3.1 على من يقع شرط اللغات العشر

الشرط أعلاه يقع على **بيان الجهة المتبنية**، أي على جدول
`label_i18n` الذي يقرأه الوكيل ليسمي عنصرا بلغة المستخدم. وهو **لا**
يقع على لغة هذا المستند، وليس في NAC3 ما يلزم أي تنفيذ بنشر وثائقه
بعشر لغات.

#### 4.3.2 اللغة المعيارية لهذه المواصفة

النص المعياري لـ NAC3 هو النص **الإنجليزي**: ملف `SPEC.md` في جذر
مستودع المواصفة، معروضا في
`https://yujin.app/nac-spec/SPEC.html`.

تُنشر المواصفة كذلك على هيئة ترجمات آلية تحت
`i18n/<locale>/SPEC.md`. وتلك الترجمات **غير معيارية**. كل واحدة منها
جزئية، وكل واحدة مجمدة على مراجعة المصدر التي يعلنها إشعارها الخاص؛
والإشعار إلزامي، وأي ترجمة منشورة بلا إشعار فهي عيب في النشر لا في
الترجمة. وحيث تختلف الترجمة عن النص الإنجليزي فالنص الإنجليزي هو
الحاكم، وأي دعوى مطابقة هي دعوى في مواجهة النص الإنجليزي.

---

## 5. الواجهة البرمجية العامة

### 5.1 الصيغة الآمرة

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

### 5.1.1 معين المطابقة (v2.2)

الدالة `NAC.bindAction(el, handler, ctx)` هي الطريقة المطابقة
للمواصفة لتوصيل معالج نقر. وهي تصدر `nac:action:succeeded` (أو
`:failed`) تلقائيا بعد تنفيذ المعالج (متزامنا أو برمي استثناء أو
بوعد). وتعيد دالة لفك الارتباط. استخدمها بدلا من
`addEventListener('click', ...)` المجرد حيثما يدعم المضيف ذلك؛ وما زال
الكود القائم قادرا على إصدار الحدث يدويا كما كان.

### 5.1.3 محرر الحقول (v2.3)

تفتح `NAC.edit_field(nac_id)` نافذة طارئة تتيح لشخص (أو لوكيل ينوب
عنه) تحرير أي حقل نصي بأدوات على طريقة معالجات النصوص:

```ts
NAC.edit_field(nac_id: string): Promise<{ok:true}>
```

تسجل هذه النافذة نفسها تحت `plugin_slug='nac_editor'` بالأفعال التالية
القابلة للنداء من NAC3:

| الفعل | الأثر |
|------|--------|
| `select_word` | انتقاء الكلمة عند المؤشر |
| `select_sentence` | انتقاء الجملة عند المؤشر |
| `select_all` | ctrl-A داخل المحرر |
| `replace` | إبدال المنتقى بالنص المعطى |
| `delete_selection` | إزالة المنتقى الحالي |
| `ai_correct_syntax` | إرسال القيمة الحالية بطلب POST إلى وسيط نماذج اللغة مع التوجيه النظامي "fix grammar + spelling, return only fixed text"؛ وإبدال القيمة بالجواب |
| `save` | الكتابة رجوعا في الحقل الأصلي، وإرسال حدثي input و change، ثم الإغلاق |
| `cancel` | الإهمال والإغلاق |

مفتاح Esc يغلق (إلغاء). و Ctrl/Cmd+Enter يحفظ. والنقر على خلفية الطبقة
يلغي.

سيضبط القسم 13 من المواصفة هذا العقد رسميا في v2.3؛ وزمن تشغيل v2.2
يقدم تنفيذا مرجعيا عاملا حتى تستطيع الجهات المتبنية توصيله اليوم.
وهو متاح على أي حقل عبر:

```js
NAC.edit_field('invoice.client_name');
// or by intermediary:
NAC.click_by_verb('myplugin', 'edit_field', { nac_id: 'invoice.client_name' });
```

### 5.1.4 حمولة الفعل + invoke (v2.3)

أفعال NAC v2.2 من نوع انقر وانطلق: يطلق الوكيل `NAC.click(id)` أو
`NAC.click_by_verb(plugin, verb)` فيفعل المضيف ما يفعله. وهذا يصلح
لأفعال الفعل والحالة (`save` و `cancel` و `submit` و `delete`) لكنه
ينهار عندما يحتاج الفعل إلى **بيانات** من الوكيل -- `utter(text)`
و `search(query)` و `send_message(body)` و `upload(file)`
و `schedule(date)` و `translate(text, target_lang)`. فليس لدى المضيف
طريقة لاستلام حمولة الوكيل عبر نقرة مصنوعة.

الإصدار v2.3 يسد هذه الثغرة. والعقد تراكمي: أفعال النقر تبقى عاملة كما
هي دون تغيير.

```ts
NAC.invoke(action_id: string, payload: object, opts?: { timeout?: number })
  : Promise<{ok: true, request_id: string, ack: object|null}>

NAC.utter(action_id: string,
          opts: { text: string, lang?: string, voice?: string, metadata?: object })
  : Promise<{ok: true, request_id: string, ack: object|null}>
```

ترسل `NAC.invoke` حدثا من نوع `CustomEvent` باسم
`nac:action:requested` على العنصر المضيف (ويصعد حتى document) يحمل:

```ts
detail: {
  action_id:  string,    // canonical nac_id of the host element
  verb:       string,    // payload.verb || el's data-nac-action
  payload:    object,    // arbitrary, action-specific
  plugin:     string|null,
  request_id: string,    // correlation token assigned by the runtime
  ts:         number,    // Date.now()
}
```

ينصت المضيف إلى `nac:action:requested`، ويعالج الحمولة، ثم يصدر
`nac:action:succeeded` (أو `nac:action:failed`) مع `request_id` نفسه
في التفصيل. ويربط زمن التشغيل بينهما بـ `request_id` ويحل وعد الوكيل.

المهلة الافتراضية **30 ثانية** (مقابل 5 s للنقر). وتُغير بـ
`opts.timeout`. وعند انتهاء المهلة يُرفض الوعد بـ
`NacError('timeout', ...)`. وكما في النقر، انتهاء المهلة يعني فشلا
حقيقيا: ويجب على المنادي أن يعامله كذلك إلا إذا كان لديه دليل على
الأثر من قناة أخرى.

الدالة `NAC.utter(id, opts)` اختصار مريح لأكثر الأفعال الحاملة للحمولة
شيوعا. وهي تكافئ:

```js
NAC.invoke(id, { verb: 'utter', text: opts.text, lang: opts.lang });
```

#### الإعلان في البيان

الفعل الذي يحمل حمولة يعلن مخطط تلك الحمولة في مدخله في البيان، لأجل
إمكان التتبع ولأجل الأدوات:

```js
NAC.register({
  plugin_slug: 'atlas_pro_ad',
  version:     '2.1.0',
  nac_version: '2.3',
  elements: [
    { id: 'atlas_pro_ad.mic', role: 'action',
      actions: [
        { verb: 'listen' },
        { verb: 'utter',
          payload_schema: {
            text: { type: 'string', required: true, max: 4000 },
            lang: { type: 'string',
                    enum: ['en','es','pt','fr','it','de','ja','zh','hi','ar'] }
          },
          label_i18n: { es:'Decir', en:'Utter', /* ... 10 locales */ } }
      ],
      label_i18n: { /* ... */ } }
  ]
});
```

الحقل `payload_schema` **إعلامي فقط حتى v2.5**، وزمن التشغيل المرجعي
لا يقرأه إطلاقا: فهو مقبول في البيان، ومحمول في `NAC.manifest()`، ولا
يُتحقق منه قط في مقابل أي شيء. والمفتاح `NAC.STRICT_VALIDATION` --
الذي تحولت قيمته الافتراضية فعلا إلى `true` في 2.3.0 -- يغطي نتائج
أدوار البيان و DOM فقط؛ ولم يغط الحمولات أبدا. لذا يجب ألا يفترض
الوكيل أن حمولة قد فُحصت لمجرد أن مخططا أُعلن: فالتحقق الوحيد الذي
يجري اليوم هو ما يفعله الوكيل بنفسه قبل الإرسال.

المخططات بسيطة بقصد (مجموعة فرعية على شكل JSON-Schema) حتى يستطيع زمن
التشغيل التحقق دون أن يحمل معه مدقق JSON-Schema كاملا، وهذا يبقى قصد
التصميم ليوم يُفرض فيه الالتزام.

وعدت مراجعة سابقة من هذا القسم بأن يُضبط نحو المخطط رسميا في إصدار
2.4 وأن يصبح الفرض هو الافتراضي. **ولم يحدث ذلك في 2.4 ولم يحدث حتى
2.5.** وقد حُذفت تلك الجملة بدل أن يُجدد تاريخها: فالوعد الملتصق برقم
إصدار، إذا بقي قائما بعد ذلك الإصدار، يقرؤه الوكيل كقدرة يمكنه
الاعتماد عليها. وضبط النحو رسميا وتوصيل الفرض مسجلان كسؤال مفتوح في
القسم 13، وهناك يظهران مفتوحين وبلا تاريخ.

#### دلالة الحالة المعطلة (إصلاح عاجل في v2.3 جاء من alpha.2)

لا ترفض `NAC.invoke` عندما يكون العنصر الهدف يحمل `disabled` أو
`aria-disabled='true'`. فسمة HTML المسماة `disabled` حاجز نقر على
مستوى الواجهة؛ أما `invoke` فطلب منطقي يحمل حمولة، وليس نقرة مصنوعة.
والمضيفون الذين يحتاجون إلى رفض invoke بناء على حالة الواجهة يجب أن
يفعلوا ذلك في منصتهم على `nac:action:requested`، وأن يصدروا
`nac:action:failed` مع رمز خطأ ذي معنى.

في المقابل، ما زالت `NAC.click` ترفض على العناصر المعطلة (فدلالة النقر
محفوظة). وتغطية الاختبار: `runtime/test/v23-invoke.mjs` T7/T8/T9.

#### المطابقة: على المضيفين الذين يدعمون invoke أن

1. يعلنوا `actions[].payload_schema` في مدخل البيان.
2. ينصتوا إلى `nac:action:requested` (أو يستخدموا منصتا عاما يصفي
   بـ `detail.action_id` + `detail.verb`).
3. يصدروا `nac:action:succeeded` -- مع إرجاع `detail.request_id` كما
   هو -- بعد المعالجة، أو `nac:action:failed` (مع الرمز في
   `detail.error`) عند الفشل.
4. لا يصدروا أبدا حدث `:succeeded` بـ `request_id` لم يستلموه (هذا
   يمنع التشابك بين النداءات المتزامنة).

المضيفون الذين **لا** يدعمون invoke يواصلون العمل بصورة طبيعية تحت
`NAC.click()` و `NAC.click_by_verb()`. والوكلاء الذين ينادون
`NAC.invoke()` على مضيف بلا مدخل `actions[].payload_schema` سيستلمون
`request_id` على أي حال، لكن زمن التشغيل لا يستطيع ضمان التسليم؛
وتنتهي المهلة بعد 30 s.

#### لماذا يهم هذا

يكف سطح الوكالة الكامل عن أن يكون "قائمة أزرار" ويصبح "قائمة أزرار +
مدخلات مبنية". فإعلان صوتي يصبح قابلا للنداء بـ NAC.invoke. وشريط بحث
يصبح قابلا للنداء بـ NAC.invoke. ورفع ملف يصبح قابلا للنداء بـ
NAC.invoke. البروتوكول نفسه، والمنشأ نفسه، ودلالة الإقرار نفسها.

أول جهة مرجعية متبنية هي **Atlas Pro**: فعنصرها `atlas_pro_ad.mic`
يعلن الفعلين كليهما، `listen` (نقر فقط، وهو القائم أصلا) و `utter`
(الحامل للحمولة). وتقود الحالة نفسها حلقة المحادثة
`/parse` + `/tts` في كلتا الحالتين؛ فالوكلاء الذين يملكون تحويل الكلام
إلى نص ينادون `listen`، والذين يملكون نموذج لغة خاصا بهم ينادون
`utter`.

#### أنماط قادمة (متوقعة، ولا تحتاج تغييرا في المواصفة)

الفعل `invoke` محايد تجاه النمط بقصد، حتى تتصل عائلات الإدخال القادمة
دون كسر العقد:

| النمط | الفعل (مسودة)         | الحمولة (مسودة)                                  |
|----------|-----------------------|--------------------------------------------------|
| نص       | `utter`               | `{text, lang?}`                                  |
| بحث      | `search`              | `{query, scope?, limit?}`                        |
| ملف      | `upload`              | `{filename, mime, data_url \| stream_id}`        |
| صورة     | `analyze_image`       | `{image_url \| data_url, prompt?}`               |
| فيديو    | `analyze_stream`      | `{stream_url, frame_window_ms?, return?}`        |
| موعد     | `schedule`            | `{datetime, duration_min, attendees?}`           |
| كود      | `apply_diff`          | `{file_path, unified_diff}`                      |
| صوت      | `transcribe`          | `{audio_url \| data_url, lang?}`                 |

يتبع كل نمط بروتوكول الأحداث نفسه `nac:action:requested` ->
`nac:action:succeeded` / `:failed`، والربط نفسه بـ `request_id`،
ودلالة المهلة نفسها. ويبقى زمن التشغيل صغيرا؛ أما معجم الأفعال فينمو
بالاتفاق بين المضيفين والوكلاء. والاختصارات المريحة (`NAC.utter`
و `NAC.search` و `NAC.watch` وغيرها) يمكن إضافتها لاحقا بلا إعادة ضبط
للمواصفة، لأن كل واحد منها غلاف رقيق فوق `invoke`.

### 5.1.5 الحل في shadow DOM -- الجذور المفتوحة (v2.3)

يحل زمن التشغيل إحالات `data-nac-id` عبر جذور shadow المفتوحة بصورة
متداخلة. وتستطيع الصفحة أن تركب Web Components بـ
`attachShadow({mode:'open'})`، وتضع سمات `data-nac-*` على عناصر داخل
شجرة shadow، فيحل أي منادي من NAC3 (`NAC.click` و `NAC.fill`
و `NAC.invoke` وغيرها) الهدف بشفافية.

#### خوارزمية الحل

لمنتقي `S` (وهو عادة `[data-nac-id="..."]`) في مقابل جذر `R` (وهو
عادة `document`):

1. `R.querySelector(S)` -> إن لم يكن null فأرجعه فورا.
2. لكل سليل `el` من `R`:
   - إن لم يكن `el.shadowRoot` هو null (أي جذر shadow مفتوح): كرر
     العملية بـ `R := el.shadowRoot` وبعمق +1.
   - وإلا، إن كان `el.nac3` كائنا يعرض الطريقة `query`، فوكل الأمر
     إليه (انظر القسم 5.1.6).
3. التكرار **محدود بعشرة مستويات، أي 10 مستويات**. فالأهداف الأعمق من
   10 غير قابلة للوصول؛ ويستلم المنادي `code='not_found'`. وهذا الحد
   موجود لمنع المسارات المرضية؛ وفي الواقع لا تعشش أي قاعدة كود في
   الإنتاج shadow أكثر من 3-4 مستويات.
4. يسير المسح على ترتيب DOM بالعرض: الأشقاء قبل shadow المعششة. وأول
   مطابقة تفوز.

#### انتشار الأحداث

الأحداث التي يصدرها المضيفون داخل جذور shadow يجب أن تضبط
`composed: true` حتى تستلمها المنصتات على مستوى المستند. وزمن تشغيل
NAC3 يصدر أحداثه كلها بـ `composed:true` أصلا؛ وكود المضيف الذي يصدر
أحداث `nac:*` يدويا مسؤول عن الشيء نفسه. فبلا `composed:true` يتوقف
الحدث عند حد shadow، ولا ترى آلية الربط في زمن التشغيل ذلك الحدث
أبدا.

#### مسؤولية كاتب المكون

على كاتب المكون أن:

1. يضع `data-nac-id` و `data-nac-role` و `data-nac-action` على
   العناصر القابلة للتشغيل داخل جذر shadow.
2. يضبط `composed:true` على أي حدث خاص يصدره المضيف للإشارة إلى عقد
   من NAC3 (`nac:action:succeeded` و `nac:field:changed` وغيرها).
3. يتجنب `<slot>` للعناصر التي يلزم أن تبقى معزولة في shadow -- فالعقد
   الموضوعة في slot تعيش في light DOM وتُحل هناك.

جذور shadow المفتوحة لا تحتاج أي تلميح في البيان ولا أي تمكين في زمن
التشغيل؛ فالحل يجري تلقائيا.

#### التنفيذ المرجعي

يعرض زمن التشغيل المرجعي معينين داخليين،
`_deepQuery(selector, root)` و `_deepQueryAll(selector, root)`، وهما
من ينفذ المسح. أما المعينات العامة `NAC.click` و `NAC.fill`
و `NAC.invoke` و `NAC.describe` وغيرها فتمر كلها عبر النسختين
العميقتين.

#### عروض واختبارات

- `example-v23-shadow-open.php` -- عروض shadow مفتوح معشش على 1 و 2
  و 3 مستويات.
- `runtime/test/v23-shadow.mjs` T1-T3 و T10 -- تغطية وحدات تشمل حد
  العمق.

### 5.1.6 الحل في shadow DOM -- الجذور المغلقة والكشف الطوعي (v2.3)

جذور shadow المغلقة (`attachShadow({mode:'closed'})`) معتمة من خارج
كود كاتب المكون -- وهذا حد أمني من المتصفح، لا قرار من NAC3. ولا
يستطيع NAC3 الوصول إلى الداخل إلا إذا كشف كاتب المكون طوعا سطحا قابلا
للاستعلام عبر العقد التالي.

#### عقد الواجهة `el.nac3`

يمكن لعنصر مخصص أن يعرض كائن واجهة على مضيفه عبر جالب اسمه `nac3`:

```ts
interface NAC3HostInterface {
  query(selector: string): Element | null;        // MANDATORY
  queryAll(selector: string): Element[];          // RECOMMENDED
  describe?(): Array<{                            // OPTIONAL
    id:    string;
    role:  string;
    action?: string;
    label?: string;
  }>;
}
```

تشارك المكونات بتنفيذ ذلك الجالب. أما المكونات التي **لا** تشارك فتبقى
بعيدة عن متناول منادي NAC3 (فتبقى أحشاؤها خاصة، كما يريد المتصفح).

#### دلالة الحل

خلال `_deepQuery(selector)`، ولكل عنصر مزار `el` يكون فيه
`el.shadowRoot === null`:

1. إن كان `typeof el.nac3 === 'object'` وكان `el.nac3.query` دالة،
   ينادي زمن التشغيل `el.nac3.query(selector)`:
   - القيمة المرجعة عنصر Element -> تم الحل.
   - القيمة المرجعة `null` -> لا مطابقة في هذا shadow.
   - القيمة المرجعة أي شيء آخر -> أصدر
     `nac:shadow_protocol_violation` (مرة واحدة لكل مضيف) وتجاوز.
   - رمي استثناء -> أصدر `nac:shadow_blocked` (السبب
     `'exposure_threw'`، مرة واحدة لكل مضيف) وتجاوز.
2. وإلا، إن كان `el.hasAttribute('data-nac-shadow') === true` وكانت
   قيمة السمة `'closed'` ولم تكن هناك واجهة `nac3`، يصدر زمن التشغيل
   `nac:shadow_blocked` (السبب `'not_exposed'`، مرة واحدة لكل مضيف).
   وهذه مشاركة الكاتب في إشارة التنقيح التي تقول "أنا مكون مغلق بقصد".
3. وإلا: يعامل العنصر كعنصر light DOM عادي بلا جذر shadow.

#### أشكال تفصيل أحداث الخطأ

تفصيل `nac:shadow_blocked`:

```ts
{
  host:   Element,     // the closed-shadow host
  reason: 'exposure_threw' | 'not_exposed',
  ts:     number       // Date.now()
}
```

تفصيل `nac:shadow_protocol_violation`:

```ts
{
  host:           Element,
  message:        string,            // diagnostic message
  value_snapshot: string,            // truncated value preview
  ts:             number
}
```

كلا الحدثين يصعد (`bubbles: true`) ويعبر حدود shadow
(`composed: true`). وإزالة التكرار تجري لكل مضيف على حدة، عبر WeakSet
يحفظه زمن التشغيل؛ فالمضيف الواحد يصدر كل حدث **مرة واحدة على الأكثر
في كل تحميل للصفحة**.

#### لماذا هو طوعي

عتامة shadow المغلق يفرضها المتصفح. ولو عرف NAC3 آلية غير طوعية لمنعها
المتصفح. والكشف الطوعي يترك لكاتب المكون السيطرة الكاملة على شكل سطحه
العام في عين الوكلاء.

الثمن هو مشاركة مكون بمكون؛ والفائدة أن الوكلاء المطابقين لـ NAC3
يعملون مع أنظمة تصميم فيها مكونات shadow مغلقة (Salesforce Lightning،
وبعض مكونات GitHub Primer، وعناصر حساسة أمنيا) دون كود محول لكل مكون.

#### عروض واختبارات

- `example-v23-shadow-closed.php` -- الحالة الموجبة
  (`<todo-card-closed-exposed>`) والحالة السالبة
  (`<todo-card-closed-blind>`) جنبا إلى جنب، مع لوحات حكم + سجل أحداث
  حي.
- `runtime/test/v23-shadow.mjs` T4-T9 -- تغطية وحدات لكل عائلة من
  أحداث الخطأ، مع دلالة إزالة التكرار.
- `guides/SHADOW_DOM_CLOSED.md` -- دليل للكاتب.

### 5.1.7 القدرات الواعية بالتخويل (v2.3)

يتيح NAC3 v2.3 للبيان أن يعلن، لكل فعل، القدرات المطلوبة، ويوقف بذلك
`NAC.click` و `NAC.invoke` قبل الإرسال. فيستلم الوكيل رفضا سريعا
(`code='capability_required'`) بدل رحلة ذهاب وعودة تفشل عند الخادم.

#### الإعلان في البيان

شرط القدرة يتعلق على مستوى العنصر أو على مستوى الفعل. وإن وُجد
المستويان فالغلبة لمستوى الفعل.

```js
NAC.register({
  plugin_slug: 'fin',
  version:     '1.0.0',
  nac_version: '2.3',
  elements: [
    // Element-level (covers all verbs on this id).
    { id: 'fin.invoice.delete', role: 'action',
      requires_capability: 'finance.delete_invoice',
      actions: [{ verb: 'delete' }] },

    // Verb-level (more granular).
    { id: 'fin.invoice.edit', role: 'action',
      actions: [
        { verb: 'edit',
          requires_capability: 'finance.edit_invoice' },
        { verb: 'view',
          /* no capability -> always allowed */ }
      ] },

    // Array value: OR semantics.
    // ("at least one of these capabilities matches")
    { id: 'fin.invoice.approve', role: 'action',
      requires_capability: ['finance.approve',
                            'finance.admin'],
      actions: [{ verb: 'approve' }] }
  ]
});
```

ولدلالة "و" المنطقية ("يحتاج المستخدم إلى كل هذه القدرات")، أعلن كل
واحدة عبر أفعال موقوفة منفصلة، أو ركب الأمر عند المضيف في المنصت على
`nac:action:requested`.

#### الواجهة البرمجية العامة

```ts
NAC.setCapabilities(caps: string | string[] | null): void
NAC.grantCapability(cap: string): void
NAC.revokeCapability(cap: string): void
NAC.userCapabilities(): string[]
```

الدالة `setCapabilities` تبدل المجموعة كلها (استخدمها عند الدخول أو
تجديد الجلسة). و `grantCapability` / `revokeCapability` تعملان
بالزيادة والنقص. و `userCapabilities` ترجع مصفوفة بلقطة عن الحالة.
و `setCapabilities(null)` تفرغ المجموعة.

ينادي المضيفون هذه الدوال كلما تغير دور المستخدم. والمجموعة تعيش في
زمن التشغيل؛ ولا حاجة إلى إعادة تحميل أي بيان.

#### دلالة البوابة

قبل الإرسال، تبحث `NAC.click(id)` و `NAC.invoke(id, payload)` عن مدخل
البيان المطابق (العنصر + الفعل)، وتقرأ `requires_capability`، وتنادي
`_hasCapability`:

- لا شرط معلن -> اسمح.
- شرط معلن والمجموعة الحالية تحققه -> اسمح.
- شرط معلن والمجموعة الحالية **لا** تحققه -> ارفض بـ
  `NacError('capability_required', ...)` وأصدر
  `nac:command:rejected` مع
  `detail.reason='capability_required'`.

تعمل البوابة في `click` **بعد** فحوص `not_found` / `disabled` /
`hidden`، حتى يظهر أدق فشل على السطح. أما في `invoke` فتعمل البوابة
قبل انطلاق حدث الطلب (فلا يرى المضيف محاولة غير مخولة أبدا).

#### لماذا يهم هذا

بلا البوابة، الوكيل الذي ينادي `NAC.click('finance.delete')` إما ينجح
(ولا بوابة تخويل أصلا -> ثقب أمني) وإما يفشل عند الخادم برمز 403 بعد
عدة ثوان. ومع البوابة يعرف الوكيل تزامنيا أن القدرة ناقصة لديه،
فيستجيب كما يجب (يطلب مسارا آخر، أو يطلب رفع الصلاحية، أو يعرض القيد
على المستخدم).

هذا يكمل التخويل عند الخادم -- ولا يحل مكانه. ويجب على المضيفين أن
يواصلوا فرض الصلاحيات على الخادم. فبوابة العميل تحسين لتجربة الاستخدام
وإشارة على مستوى القصد، وليست حدا أمنيا.

#### عروض واختبارات

- `runtime/test/v23-capabilities.mjs` -- 17 تأكيدا تغطي ضبط المجموعة
  وقراءتها، والمنح والسحب، وبوابة النقر، وبوابة invoke، والحل بين
  مستوى الفعل ومستوى العنصر، ودلالة "أو" المنطقية، والإفراغ بـ null،
  ورفض المدخلات غير الصحيحة، وانحدار الأفعال بلا بوابة.

### 5.1.2 راية التحقق الصارم (v2.2؛ قُلبت قيمتها الافتراضية في v2.3)

المفتاح `NAC.STRICT_VALIDATION` (منطقي). فحين يكون `true` ترمي
`NAC.register()` خطأ `Error` يحمل `code='strict_validation'` ومصفوفة
`findings` في أي من هذه الحالات:

- `manifest_role_unknown` -- دور المدخل خارج المجموعة المعيارية.
- `tab_id_manifest_role_drift` -- المعرف يطابق `^tab\.` لكن الدور ليس
  `'tab'`.
- `manifest_dom_role_mismatch` -- سمة `data-nac-role` للعنصر المركب في
  DOM تختلف عن دور مدخل البيان.

**القيمة الافتراضية:**

- **v2.2.x:** `false` (تحذير فقط). فالجهات المتبنية كانت تحتاج مهلة
  ترحيل.
- **v2.3.x:** **`true`** (ترمي). أُغلقت مهلة الترحيل مع خط v2.2. ومن
  يتبنى ببيانات مثقلة بالانحراف يخرج من ذلك بضبط
  `NAC.STRICT_VALIDATION = false` **قبل** أي نداء لـ `register()`.
- **v3.0:** تُحذف الراية (فالصارم هو النمط الوحيد).

انظر `guides/MIGRATION_v2.2_to_v2.3.md` لطريقة تنظيف نتائج الانحراف.

كل الطرق غير المتزامنة ترفض بـ `NacError` يكون `code` فيه واحدا من
هذه:

- `not_found` -- العنصر أو الدور أو الفعل المسمى ليس في DOM.
- `invalid` -- شكل الوسيط خاطئ.
- `disabled` -- العنصر يحمل `disabled` أو `aria-disabled='true'`
  (في `NAC.click` فقط؛ أما `NAC.invoke` فلم تعد تفحص منذ الإصلاح
  العاجل في v2.3، انظر القسم 5.1.4).
- `hidden` -- العنصر خارج الشاشة، أو يحمل `aria-hidden='true'`، أو
  أبعاده صفرية.
- `capability_required` -- البيان أعلن `requires_capability`
  والمجموعة الحالية من `NAC.userCapabilities()` لا تحققه (v2.3، انظر
  القسم 5.1.7).
- `timeout` -- أُرسل الأثر لكن حدث إقرار المطابقة لم يصل خلال 5 ثوان
  (30 ثانية في `invoke`). **وانتهاء المهلة يعني فشلا حقيقيا**: فقد
  يكون المعالج قد تجمد، وقد لا يكون الإقرار قد وُصل أبدا، وقد يكون
  حدث تسابق في الشبكة. ويجب على المنادي أن يعامل انتهاء المهلة فشلا
  إلا إذا كان لديه دليل على الأثر من قناة أخرى.

### 5.2 الاستبطان

```ts
NAC.describe():    { active: string|null, plugins: PluginSnap[] }
NAC.describe_v2(): { v2_scope_entries: [...], sitemap: ..., data_tables: [...] }
NAC.manifest(plugin_slug: string): Manifest|null
NAC.validate_global(opts?: {probe?: boolean}): GlobalReport   // named buckets, see 10.1
```

### 5.3 جداول البيانات (منذ 2.1)

بدائيات جدول البيانات **ليست** جزءا من زمن التشغيل الأساسي
(`js/nac.js` / ملف `nac.mjs` في `@nac3/runtime`). فهي تأتي في وحدة
الامتدادات الخاصة بالأنظمة القائمة `js/nac-v2-extensions.js` (منشورة
كـ `@nac3/runtime/extensions`)، وهي تعلقها على كائن `window.NAC` نفسه
بعد أن تُحمَّل. فحمّل وحدة الامتدادات بعد زمن التشغيل الأساسي لتحصل على
سطح `dt_*`:

```html
<script src="https://yujin.app/nac-spec/js/nac.js"></script>
<script src="https://yujin.app/nac-spec/js/nac-v2-extensions.js"></script>
```

```js
// or with the npm package:
import '@nac3/runtime';
import '@nac3/runtime/extensions';
```

الطرق أدناه موجودة فقط حين تكون وحدة الامتدادات محمّلة؛ ومناداتها على
زمن تشغيل فيه الأساس وحده لا تفعل شيئا / ترجع `undefined`.

```ts
NAC.registerDataTable(spec: DataTableSpec): string   // returns table_id
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

لكل جدول بيانات حقل `subkind`:

- `collection` -- صفوف مرتبة، مع تثبيت معاملاتي اختياري. تُستخدم لبنود
  الفاتورة، وعناصر سلة الشراء، ومداخل السجل.
- `matrix` -- شبكة صف x عمود تحمل كل خلية فيها قيمة. تُستخدم لمصفوفات
  الصلاحيات، وجداول المواعيد.
- `matrix-singletree` -- مصفوفة ينطوي فيها كل صف إلى شجرة (وهي نادرة).

---

### 5.4 الحل الصارم + إزالة الالتباس (v2.4)

يجعل NAC3 v2.4 حل المعرف والفعل والمخصص والتسمية **صارما**. فالأفعال
التي تحل طلبا إلى عنصر DOM واحد -- `click_by_verb` و `tab` (الصيغة
بوسيط واحد) و `tab_by_label` -- لم تعد تخمن. فحين يُحل طلب إلى صفر
مرشحين أو إلى أكثر من مرشح واحد، يرمي زمن التشغيل خطأ `NacError`
يحمل قائمة المرشحين ويصدر كذلك حدث
`nac:disambiguation_requested`، بدل الإرسال الصامت إلى أول شبيه.

هذا هو ثابت **صفر ضرر صامت**. وهو موجود من أجل البرمجيات المساعدة
والوكلاء المنادين، حيث يكون الإرسال الصامت إلى العنصر الخاطئ بلا طريق
للتعافي عائقا أمنيا. أما السلوك المتسامح قبل 2.4 -- احتياط بـ
`indexOf` على سلسلة جزئية كان يحل إلى أول شبيه -- فقد أُزيل.

> التوافق مع الماضي: الإصدار v2.4 تغيير في *سلوك العقد*. فمسارات الكود
> التي كانت تمرر وسائط بلا التباس تبقى عاملة كما هي. أما مسارات الكود
> التي اتكلت على احتياط `indexOf` المتسامح للحل إلى أول شبيه فسترمي
> الآن استثناء -- وهذا مقصود.

#### 5.4.1 المطابقة الصارمة للمخصص (`click_by_verb`)

تختار `click_by_verb(plugin, verb, opts?)` من بين عقد DOM التي تتشارك
`data-nac-action="<verb>"`. وحين يُمرر `opts.qualifier` (وهو نص)،
يطابق العنصر **فقط** إذا كان `data-nac-id` فيه يحقق:

```js
id === qualifier || id.endsWith('__' + qualifier)
```

أي: تساوي المعرف تماما، أو لاحقة مرساة بعد الفاصل `__`. **ولا يوجد أي
احتياط بالسلسلة الجزئية.** فالمخصص الذي هو مجرد سلسلة جزئية من معرف
(غير مساو، وليس `__suffix` مرساة) **لا** يطابق.

- 0 مطابقة -> ترمي `NacError('no_matching_instance', ...)`.
- مطابقة واحدة بالضبط، أي 1 -> تحل وتنقر.
- أكثر من 1 -> ترمي `NacError('ambiguous_qualifier', ...)`.

الخيار `opts.qualifier_ordinal` (وهو رقم) يختار بالموضع من بين كل
عناصر DOM التي تتشارك الفعل، متجاوزا مطابقة المخصص.

#### 5.4.2 الحل الصارم للمعرف (`tab`)

صيغة الوسيط الواحد من `tab(plugin, id)`: تفوز المطابقة التامة لـ
`data-nac-id` في DOM. وإلا فإن زمن التشغيل يبحث عن النسخ التي يبدأ
معرفها بـ `id + "__"`:

- 0 نسخة مخصصة ولا معرف مطابق تماما -> `no_matching_instance`.
- واحدة بالضبط، أي 1 -> تُحل.
- أكثر من 1 -> `ambiguous_tab` (مرر المعرف المخصص كاملا).

#### 5.4.3 الحل الصارم بالتسمية (`tab_by_label`)

تحل `tab_by_label(plugin, label)` تسمية يقرؤها البشر إلى تبويب، وتجرب
بهذا الترتيب: مطابقة تامة لتسمية البيان، ثم مطابقة تقريبية أو بسلسلة
جزئية في البيان، ثم مطابقة تامة لنص DOM، ثم مطابقة تقريبية لنص DOM.
وإن أعطت أي طبقة أكثر من مطابقة واحدة رمت
`NacError('ambiguous_label', ...)`؛ وإن لم تطابق أي طبقة رمت
`NacError('not_found', ...)`. ويسجل حقل `reason` في الحدث المُصدر أي
طبقة كانت ملتبسة (`ambiguous_label_exact` أو
`ambiguous_label_fuzzy` أو `ambiguous_label_exact_dom` أو
`ambiguous_label_fuzzy_dom` أو `no_matching_label`).

#### 5.4.4 رموز الأخطاء

| `err.code` | من يرميه | المعنى |
|------------|-----------|---------|
| `no_matching_instance` | `click_by_verb` (المخصص) و `tab` | لا عنصر يطابق المخصص / المعرف |
| `ambiguous_qualifier`  | `click_by_verb` | أكثر من 1 عنصر يطابق المخصص |
| `ambiguous_tab`        | `tab`           | أكثر من 1 نسخة مخصصة من `id__` تطابق |
| `ambiguous_label`      | `tab_by_label`  | أكثر من 1 تبويب يطابق التسمية (في أي طبقة) |
| `not_found`            | `tab_by_label`  | لا تبويب يطابق التسمية إطلاقا |

#### 5.4.5 شكل `err.candidates`

كل خطأ التباس يحمل مصفوفة `candidates`. وكل مرشح هو بالضبط:

```ts
{ nac_id: string, label: string }
```

الحقل `nac_id` هو `data-nac-id` للعنصر. أما `label` فيُحل بتفضيل
`aria-label` أولا، ثم `textContent` بعد تشذيبه (مقطوعا عند 120 حرفا)،
ثم بالرجوع إلى `data-nac-id`. والقائمة متحققة في مقابل DOM -- فهي تسمي
العناصر الحقيقية التي يستطيع المنادي أن يختار منها. ويدمج `NacError`
الحقل `candidates` في الخطأ `Error` المرمي، فتكون `err.code`
و `err.message` و `err.candidates` كلها مملوءة.

#### 5.4.6 الحدث `nac:disambiguation_requested`

كلما فشل نداء حل صارم (لا مطابقة أو مطابقات كثيرة)، يرسل زمن التشغيل
حدث `CustomEvent` باسم `nac:disambiguation_requested` على `document`
*بالإضافة إلى* رمي الاستثناء. والإصدار على قدر الوسع: فإن فشل الإرسال
رمى زمن التشغيل على أي حال.

```ts
document.addEventListener('nac:disambiguation_requested', (e) => {
  e.detail; /* {
    method:     'click_by_verb' | 'tab' | 'tab_by_label',
    plugin:     string | null,
    query:      { verb?, qualifier?, label?, id? },
    reason:     string,   // finer-grained than err.code (see 5.4.3)
    candidates: Array<{ nac_id: string, label: string }>,
  } */
});
```

#### 5.4.7 كيف يزيل المنادي الالتباس

بعد أن تصير قائمة المرشحين في يده (من `err.candidates` أو من
`event.detail.candidates`)، يختار المنادي واحدا ويعيد الإرسال بأي من
هذه الطرق:

1. **المعرف `nac_id` كاملا** -- `NAC.click(candidate.nac_id)`. وهذا
   طريق التعافي المعياري: فالمرشح يحمل المعرف الدقيق أصلا.
2. **اللاحقة المرساة `__suffix`** -- مرر لاحقة النسخة الدقيقة كمخصص
   إلى `click_by_verb`.
3. **`opts.qualifier_ordinal`** -- اختيار بالموضع من بين العناصر التي
   تتشارك الفعل (بترتيب DOM).

المرجع المشغول بالكامل هو `example-v24-disambiguation.php`؛ ويغطي
العقد كل من `runtime/test/stage2-disambiguation.mjs` و
`runtime/test/stage7-strict-resolution.mjs`.

---

## 6. الأحداث

كل فعل يصدر حدث إتمام حتميا. وتنتظر `NAC.click()` في زمن التشغيل ذلك
الحدث وتُحل عند انطلاقه.

| الدور | حدث النجاح | حدث الفشل |
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

### 6.1 شكل تفصيل الحدث

تفصيل كل حدث يحمل حقل المعرف المعياري، ومعه `plugin`:

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

### 6.2 الإصدار من معالج عند المضيف

يجب على معالج النقر أن يصدر حدث النجاح المقابل بعد أثره المتزامن:

```js
button.addEventListener('click', function (ev) {
  // ... do the work ...
  document.dispatchEvent(new CustomEvent('nac:action:succeeded', {
    detail: { plugin: 'invoice', action_id: 'invoice.save' }
  }));
});
```

وإن كان العمل غير متزامن فأصدره بعد الحل. وإن فشل العمل فأصدر
`nac:action:failed` مع `{detail: {plugin, action_id,
error: <message>}}`.

سيوفر زمن تشغيل v2.2 الدالة `NAC.bindAction(el, handler, ctx)` التي
تغلف `addEventListener` وتصدر تلقائيا.

### 6.3 لم لا نستخدم حدث النقر نفسه؟

حدث `click` في DOM ينطلق قبل أن يعمل المعالج. وعقد NAC3 يحتاج أن يعرف
متى **تم الأثر**، لا متى بدأ النقر. ومن هنا جاءت عائلة الأحداث
المستقلة.

---

## 7. المنشأ

### 7.1 isTrusted

القيمة `event.isTrusted` تكون `true` في النقرات التي يبدؤها شخص (فأرة
حقيقية، ضغطة مفتاح حقيقية، تنشيط من قارئ شاشة)، و `false` في النقرات
المصنوعة (`element.click()`، أو dispatchEvent على MouseEvent مبني
يدويا، أو الأتمتة).

ويجب على NAC3 أن يظهر ذلك عبر `event.detail.is_trusted` في حدث
النجاح. والمضيفون الذين ينفذون أفعالا حساسة أمنيا (الدفع، الحذف) يمكن
أن يشترطوا `is_trusted === true` وأن يرفضوا النقرات المصنوعة. ويضم
العرض المرجعي `example-v20-full.php` زوج أزرار
(`v20_panel.istrusted_real` و `v20_panel.istrusted_fake`) يبين هذا
الفرق.

### 7.2 البيانات الموقعة بـ HMAC

يمكن للبيان أن يحمل كتلة `provenance`:

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

يحسب زمن التشغيل قيمة HMAC المتوقعة على تسلسل ثابت للبيان (مستثنيا
التوقيع نفسه) ويرفض البيانات التي لا يطابق توقيعها. وتستخدمه
النشرات متعددة المستأجرين لمنع مستأجر من تقليد بيان مستأجر آخر.

### 7.3 نموذج التهديد

انظر `SECURITY.md` لنموذج التهديد الكامل. والنسخة القصيرة:

- NAC3 لا يوثق **المستخدم**. فذلك عمل طبقة التوثيق عندك.
- NAC3 يوثق **البيان** (HMAC).
- NAC3 يميز النقرات الحقيقية من المصنوعة (isTrusted)، فيستطيع المضيف
  أن يرفض الثانية في الأفعال الحساسة.
- NAC3 لا يحمي من وكيل خبيث يعمل بصلاحية المستخدم. فمثل هذا الوكيل
  يستطيع كل ما يستطيعه المستخدم.

---

## 8. مستويات المطابقة

يُكتب المستوى هكذا: **NAC3 Conformance Level 1** أو **2** أو **3**.
واسم المستوى ليس اسم البروتوكول: فيجب على أي مدقق أو تقرير أو دعوى
مطابقة أن يذكر المستوى بالمعرف
`nac3-conformance-level-<1|2|3>` المنشور في
`api/latest/levels.json`، ولا يذكره أبدا باسم معروض. ويسجل القسم 8.1
الأسماء التي كانت تحملها هذه المستويات قبل 2.5.0.

تكون الصفحة عند **NAC3 Conformance Level 1** إذا:

- كان كل عنصر قابل للنقر ينبغي للوكيل أن يستطيع تشغيله يحمل
  `data-nac-id` و `data-nac-role`.
- كان كل عنصر `data-nac-role="action"` يطلق `nac:action:succeeded`
  بعد أثره.
- سجلت الصفحة بيان ملحق واحدا على الأقل عبر `NAC.register()`.
- عملت `NAC.click(id)` لكل معرف معلن.

وتكون الصفحة عند **NAC3 Conformance Level 2** إذا كانت فوق ذلك:

- تسجل مصفوفات `tabs[]` و `fields[]` و `actions[]` صراحة في بيانها
  (لا مستنبطة من DOM).
- تقدم `label_i18n` يغطي كل لغات NAC3 العشر، أي 10 لغات، لكل تسمية
  يراها المستخدم.
- تنفذ بدائيات v2.0 الخاصة بالأنظمة القائمة: شجرة النطاق، والالتقاط
  العابر، و autoRegister.watch.
- تنجح في `NAC.validate_global({probe: false})` بصفر نتائج من شدة
  `error`.

وتكون الصفحة عند **NAC3 Conformance Level 3** إذا كانت فوق ذلك:

- تحمل بيانات موقعة بـ HMAC.
- تميز `isTrusted` في الأفعال الحساسة أمنيا.
- تنجح في `NAC.validate_global({probe: true})` بصفر نتائج.

وسطر أوامر حزمة NPM (`npx nac3 validate <url>`) يبلغ عن أعلى مستوى
تبلغه الصفحة. (وتقدم الحزمة الملفين التنفيذيين `nac3` و `nac`؛
وكلاهما يصل إلى سطر الأوامر نفسه.)

### 8.1 أسماء المستويات التاريخية (v2.5)

قبل 2.5.0 كانت المستويات الثلاثة تُكتب `NAC-1` و `NAC-2` و `NAC-3`.
وتلك الأسماء تبعد شرطة واحدة عن اسم البروتوكول `NAC3`، فلم يكن يمكن
تمييز "هذه الصفحة مطابقة لـ NAC-3" من "هذه الصفحة تنفذ NAC3"، ولم يكن
عند الوكيل الذي يُطلب منه الإبلاغ عن مستوى أي نص بلا التباس يبلغ به.

وتبقى الأسماء القديمة مقروءة كأسماء بديلة تاريخية: فملف
`api/latest/levels.json` ينشر كل اسم منها كـ `legacy_display_name`
بجانب المستوى الذي كان يخصه، حتى يبقى ممكنا رد مستند كُتب قبل 2.5.0
إلى مستوى. وهي **ليست** معيارية. أما النص الجديد وخرج المدققين ودعاوى
المطابقة فتستخدم رقم المستوى أو المعرف المنشور.

---

## 9. ترقيم الإصدارات

يتبع NAC3 نظام semver:

- رفع **رئيسي**: تغيير كاسر في الواجهة البرمجية العامة أو في صيغ
  النقل. وعلى الجهات المتبنية أن تعدل الكود.
- رفع **ثانوي**: ميزات جديدة متوافقة مع الماضي. والكود القديم يبقى
  عاملا.
- رفع **ترقيعي**: إصلاح عيوب، أو تغييرات في الوثائق فقط.

سياسة الإبطال: الميزة الموسومة `@deprecated` في الإصدار `X.Y.0` لا
تُحذف قبل `(X+1).0.0`. وتوثق ملاحظات الإصدار كل حذف صراحة.

إصدار حزمة NPM يعكس إصدار المواصفة: فـ `@nac3/runtime@X.Y.Z` ينفذ
NAC3 vX.Y، مع Z مراجعة ترقيعية فوقه. وقد كُتب المثال بعناصر نائبة
بقصد -- فإصدار محدد في هذه الجملة يصير قديما مع الإصدار التالي، وقد حمل
هذا المستند فعلا `2.1.3` مدة طويلة بعد أن تقدمت الحزمة.

### 9.1 نسخ ما قبل الإصدار ووسوم التوزيع

الإصدار الذي يحمل ذيل ما قبل الإصدار (`-alpha.N` أو `-beta.N` أو
`-rc.N`) **ليس** إصدارا منشورا من هذه المواصفة. وهو موجود ليتاح تمرين
تغيير قبل أن يُوعد به.

- **الوسم `latest` لا يشير أبدا إلا إلى إصدار مستقر.** فأمر
  `npm install @nac3/runtime` بلا وسم يجب أن يُحل إلى إصدار بلا ذيل
  ما قبل الإصدار. ومن يتبنى ويثبت الافتراضي لا يستلم أبدا نسخة ما قبل
  إصدار بالخطأ.
- **تُنشر نسخ ما قبل الإصدار تحت وسم توزيع خاص بها** (`alpha`
  و `beta` و `rc`). والانضمام إليها صريح: `npm install
  @nac3/runtime@alpha`.
- **لا شيء في نسخة ما قبل الإصدار وعد.** فأي سطح يُقدم فيها قد يتغير
  أو يزول قبل الإصدار المستقر الذي يحمله. وضمانات الاستقرار في القسم
  10 وضمانات رموز النتائج في القسم 12 تبدأ من الإصدار المستقر.
- **لا تُسحب نسخ ما قبل الإصدار من النشر أبدا**، ولا يعاد وسمها
  كـ `latest` بأثر رجعي. فسجل ما نُشر يبقى مقروءا.

الإصدار المعتمد لزمن التشغيل المرجعي هو الثابت `NAC.version` في
`js/nac.js`، وهو منشور كبيانات أيضا: فملف `api/latest.json` يحمل
مؤشرين منفصلين، `stable` و `prerelease` (وأي منهما قد يكون `null`)،
وكل منتج منشور يحمل حقل `channel` الخاص به. فالمستهلك الذي يشترط عقدا
مستقرا يقرأ حقلا واحدا ويرفض، بلا نص إصدار يحلله وبلا وسم يثق به.

---

## 10. المدققون

### 10.1 زمن التشغيل: `NAC.validate_global()`

يمشي على DOM الحي وعلى البيانات المسجلة، ويرجع **كائنا من مجموعات
مسماة** -- مجموعة لكل شرط، وكل مجموعة مصفوفة من النتائج. ومنذ 2.5.0
تحمل كل نتيجة في كل مجموعة `code` و `severity`، فيستطيع تكامل CI أن
يوقف على رمز دون تحليل أي رسالة:

```ts
{
  ok:         boolean,       // false when any error-severity finding exists
  has_errors: boolean,
  duplicates: [{ code: 'nac_id_duplicate_across_plugins',
                 severity: 'error', nac_id, plugins: string[] }],
  orphans:    [{ code: 'nac_id_orphan_in_dom',
                 severity: 'warn', nac_id, in_dom, in_manifest,
                 plugin_root }],
  unmounted:  [{ code: 'nac_id_declared_not_mounted',
                 severity: 'warn', nac_id, in_manifest, in_dom,
                 plugin }],
  convention_violations:
              [{ code: 'nac_id_missing_plugin_prefix',
                 severity: 'warn', nac_id, plugin, hint }],
  plugin_instance_violations:
              [{ code: 'duplicate_plugin_no_instance_id',
                 severity: 'error', slug, instance_count, ... }],
  tolerated:  [{ kind, nac_id, until, original }],
  plugin_count: number,
  total_ids:    number,
  timestamp:    number
}
```

والرموز الخمسة، وشدة كل منها، وما يجب فعله مع كل واحد، منشورة كبيانات
في `api/latest/findings.json` تحت `global_buckets`. ورموز النتائج
مستقرة عبر الإصدارات الترقيعية؛ والرموز الجديدة لا تأتي إلا في الرفع
الثانوي، ولا يُعاد استخدام رمز لشرط آخر أبدا (القسم 12، الوعد 4).

**الإصدارات قبل 2.5.0 لم تكن تربط أي رمز بهذه المجموعات**، وكان هذا
القسم يصف مصفوفة مسطحة من النتائج لم يرجعها زمن التشغيل المرجعي أبدا
(التدقيق N-14 و N-34).

**تغيير في السلوك في 2.5.0 (التدقيق N-33).** قبل 2.5.0 كان الجامع
الذي يقف خلف هذا المدقق يقرأ مجموعات البيان القديمة وحدها (`actions`
و `fields` و `tabs` و `kpis` و `charts`، مفتاحها `nac_id`) ولا يقرأ
أبدا الشكل المعياري `elements: [{ id }]` من القسم 4. ولذلك كان، أمام
بيان مكتوب على الصورة الموثقة، يبلغ `total_ids: 0`، ويسرد كل عنصر
معلن كيتيم، ولا يستطيع الإبلاغ عن تكرار ولا عن معرف غير مركب ولا عن
خرق لاصطلاح إطلاقا، ومع ذلك يجيب `ok: true`. ومن 2.5.0 فصاعدا يُقرأ
الشكلان. والمضيف الذي كان يوقف CI عنده على `has_errors` قد يرى أول
فشل بعد الترقية: وذاك إيجاب صحيح كان موجودا دائما، لا قاعدة جديدة.

### 10.2 سطر الأوامر: `npx nac3 validate <target>`

يغلف `validate_global` ويضيف إليه تدقيقا ساكنا لتوافق HTML مع البيان.
ورموز الخروج:

- `0` -- لا نتائج بشدة >= الحد المضبوط.
- `1` -- هناك نتائج.
- `2` -- الهدف نفسه فشل في التحميل.

مفيد في CI: `npx nac3 validate ./dist/index.html --severity=error`.
وتعرض الحزمة سطر الأوامر باسمين تنفيذيين، `nac3` و `nac`؛ فاستخدم ما
لا يتعارض مع أداة أخرى في PATH عندك.

---

## 11. النظام حول NAC3

NAC3 طبقة عقد. ولتحويل صفحة مطابقة لـ NAC3 إلى تطبيق يُقاد بالصوت
تحتاج أيضا إلى:

1. **مصدر لتحويل الكلام إلى نص** (أداة SpeechRecognition في المتصفح،
   أو واجهة Whisper، وغيرها).
2. **وسيط نماذج لغة** يأخذ نص المستخدم + لقطة `NAC.describe()` عن
   الصفحة + تلميح i18n، ويصدر أفعالا مبنية:
   `[{kind: 'click', nac_id: 'X'}, {kind: 'fill', nac_id: 'Y',
   value: 'Z'}]`. انظر `guides/LLM_WIRING.md`.
3. **عميل محادثة** يحمل الحوار ويرسل الأفعال. والمرجع هو
   `js/nac-chat-client.js`.
4. **مصرفا لتحويل النص إلى كلام** للأجوبة المنطوقة (أداة
   SpeechSynthesis في المتصفح، أو ElevenLabs، وغيرها).

NAC3 يوحد شكل دخل وخرج الخطوة 2 وحدها (لقطة `NAC.describe()` + شكل
الأفعال). أما الخطوات 1 و 3 و 4 فهي خارج المواصفة؛ وتركبها كما تحب.

---

## 12. ضمانات الاستقرار

ما تعد به هذه المواصفة:

1. مجموعة الأدوار المعيارية في القسم 1 لن تصغر. ويمكن إضافة أدوار
   جديدة في الإصدارات الثانوية.
2. عائلة الأحداث في القسم 6 لن يُغير اسمها. ويمكن إضافة أحداث جديدة في
   الإصدارات الثانوية.
3. أفعال `NAC.click` و `NAC.fill` وغيرها لن تغير شكلها في الإصدارات
   الثانوية. ويمكن أن تظهر حقول اختيارية جديدة في `opts`.
4. رموز نتائج `validate_global` لن يُعاد استخدامها لشروط مختلفة عبر
   الإصدارات الثانوية. ومنذ 2.5.0 تحمل كل مجموعة في ذلك المدقق رمزا،
   وكلها منشورة مع شدتها في `api/latest/findings.json`: فقارن إصدارين
   منشورين، ورمز أُعيد استخدامه سيظهر بلا قراءة أي مصدر.

وما **لا** تعد به هذه المواصفة:

1. الصياغة الحرفية لرسائل الخطأ (فهي نصوص من فهرس i18n؛ وقد تتبدل
   ترجماتها).
2. استراتيجية DOM في إيجاد العناصر (`querySelector` اليوم؛ وقد تنتقل
   لاحقا إلى فهرس أسرع).
3. التنظيم الداخلي لمخزن البيانات المؤقت. فعامل البيانات كأنها للكتابة
   فقط من جهة المضيف، وللقراءة فقط من جهة الوكيل.

---

## 13. أسئلة مفتوحة

تُتابع **هنا**، في هذا القسم. وكانت مراجعة سابقة تسمي هذا "أسئلة
مفتوحة (تُتابع على حدة)" ولم تقل قط أين كان ذلك "على حدة"؛ ولم يكن
هناك سجل آخر. والسؤال الذي يصل إلى قرار يخرج من الجدول أدناه ويدخل في
القسم الذي يؤثر فيه. والسؤال الذي يصير مقترحا محددا يحصل على RFC،
وتلك موثقة في [`rfcs/README.md`](rfcs/README.md)، وعمليتها في
[`CONTRIBUTING.md`](CONTRIBUTING.md).

كل سطر يحمل الإصدار الذي قُيم فيه آخر مرة، حتى يميز القارئ سؤالا حيا من
سؤال متروك. **ولا يحمل أي سطر إصدارا مستهدفا**: فالوعد المؤرخ الذي
يتجاوز تاريخه أسوأ من وعد بلا تاريخ، وهذا هو الخطأ الذي كان القسم 5
يرتكبه بشأن `payload_schema`.

| السؤال | الحالة | آخر تقييم | أين يقف الأمر |
|----------|-------|---------------|-----------------|
| هل ينبغي أن يُحل `data-nac-role="navigation"` يوما إلى تبويب؟ | **قرار: لا** | v2.5 | قُرر في 2.2.0 وفُرض منذ ذلك الحين: فالمعرف ببادئة `tab.` مع الدور `navigation` يرفع `tab_id_manifest_role_drift`، ومع `STRICT_VALIDATION` (افتراضيا `true` منذ 2.3.0) ترمي `NAC.register`. و `tab_by_label` لا تحل التبويبات إلا من `m.tabs[]` و `elements[role=='tab']`. والدور `navigation` منطقة علامة، لا لوحة قابلة للتبديل أبدا. انظر القسمين 1 و 10. |
| هل ينبغي أن تقبل `NAC.click()` معرفات نسبية (مثل `'./save'`)؟ | **مفتوح، غير منفذ** | v2.5 | المحلل يطابق `data-nac-id` مطابقة تامة ويحدد النطاق بالملحق: الملحق النشط، أو ما في `opts.plugin`. وذلك التحديد يغطي أصلا الحالة التي كان السؤال يطلبها (`NAC.click('save', {plugin:'invoice'})`)، فالضغط نحو صيغة نسبية ضعيف ولا شيء جار. وحسم هذا يعني إضافة نحو للمسارات إلى القسم 2، وهو القسم الذي تُعلن فيه المعرفات معتمة في نظر زمن التشغيل. |
| هل ينبغي أن تدعم البيانات الوراثة / التوسيع بين الملحقات (بيان أساس يوسعه مستأجر)؟ | **مفتوح، مرشح للرفع الرئيسي القادم** | v2.5 | غير منفذ. **ولا يُخلط بالقسم 15**: فذاك "عقد توسيع الملحق" وقد صدر في v2.5، وهو آلية توجيه إلى backend (`registerPlugin` / `call` / `read` / `subscribe`)، لا وراثة بيانات. والسؤال هنا عن بيان يُشتق من بيان آخر، وهذا يلمس قواعد تفرد المعرفات في القسم 2، ولهذا يبقى محفوظا لرفع رئيسي. |
| هل ينبغي ضبط فرض `payload_schema` رسميا وتشغيله؟ | **مفتوح، بلا تاريخ** | v2.5 | نُقل إلى هنا من القسم 5 الذي كان يعد به لـ v2.4. ولم يحضر في v2.4 ولم يحضر حتى v2.5؛ وزمن التشغيل المرجعي لا يقرأ الحقل. انظر القسم 5 لتعرف بالضبط ما يُتحقق منه اليوم وما لا يُتحقق. |
| هل ينبغي أن تحمل نتائج `validate_global()` رمزا من الفهرس المنشور؟ | **قرار: نعم، صدر في 2.5.0** | v2.5 | كل بند في كل مجموعة يحمل `code` + `severity`، فالوعد 4 في القسم 12 يغطي الآن مجموعة حقيقية بدل مجموعة خالية. والرموز الخمسة منشورة تحت `global_buckets` في `api/latest/findings.json`، والمولد **يقرؤها** من حالة اختبار تستفز كل مجموعة، بدل أن يكتبها يدويا: فالنسخة السابقة كانت تكتب `code: null` لمجموعة تحمل رمزا منذ 2.5.0، وتنشر الدعويين في الملف نفسه. وبناء حالة الاختبار تلك هو أيضا ما كشف التدقيق N-33: فالمدقق لم يكن يرى بيانا مكتوبا بالشكل المعياري. انظر 10.1. |

---

## 13.5 الإدارة

يرعى NAC3 حاليا فريق Yujin. والمواصفة والوثائق وزمن التشغيل المرجعي
كلها منشورة تحت Apache-2.0. (وكان زمن التشغيل موسوما بـ MIT في زمن
المستودعين قبل 2.5؛ ثم وُحد على Apache-2.0 في كل منتجات NAC3 عند
الدمج في 2026-05-23. انظر `LICENSE` و `runtime/LICENSE`.) وتتعهد
Yujin بنقل NAC3 إلى مؤسسة محايدة (مجموعة مجتمعية في W3C، أو
Linux Foundation، أو هيئة صناعية مكافئة) متى صار التبني مبررا لإدارة
محايدة. وحتى ذلك الحين تتبع تغييرات المواصفة عملية RFC الموثقة في
`CONTRIBUTING.md`، مع فترة تعليق عام لا تقل عن 14 يوما لأي تغيير يمس
الواجهة البرمجية العامة أو صيغ النقل.

إلى الجهات المتبنية: الترخيص الموحد تحت Apache-2.0 يضمن بقاء المواصفة
وزمن التشغيل بعد أي تغير في وضع Yujin كشركة. فتستطيع أن تفرع أيهما
شئت، وأن تشغل أيهما شئت، وأن تنشر أيهما شئت، اليوم وبعد أن نزول. وهذا
المستند يسجل ذلك التعهد حتى يكون الطريق إلى هذا البقاء صريحا لا ضمنيا.

---

## 14. التنفيذ المرجعي

التنفيذ المعياري هو زمن التشغيل المرجعي الموزع كحزمة NPM باسم
`@nac3/runtime`. والمصدر المعياري للإصدار هو ثابت زمن التشغيل نفسه
`NAC.version`، المنشور كبيانات في `api/latest.json` (انظر القسم
9.1). وهذا القسم لا يعيد ذكر رقم إصدار بقصد: فقد كان يحمل
`2.5.0-alpha.5` بينما كانت الحزمة قد تقدمت أصلا، وهذا من صنف العيب
نفسه الذي أُزيلت بسببه الأمثلة القديمة من القسمين 5 و 9. وهو يقدم:

- `js/nac.js` -- زمن التشغيل الأساسي: الواجهة العامة الآمرة +
  الاستبطانية من القسم 5 (click/fill/select/tab،
  click_by_verb/tab_by_label، invoke/utter، edit_field،
  setCapabilities، syncPlugin، request_authority/confirm_action،
  registerPlugin/call/read/subscribe، narrate/context/tree،
  expect/diff، describe، validate_global، ...). منشور كمدخل
  `main`/`module`/`browser` للحزمة (`dist/nac.mjs`).
- `js/nac-v2-extensions.js` -- بدائيات الأنظمة القائمة + جداول
  البيانات، وهي تتعلق بـ `window.NAC` نفسه بعد تحميل الأساس: شجرة
  النطاق، و autoRegister، والالتقاط العابر، و HMAC، وشهادة
  isTrusted، وفهرس i18n (`t`/`locale`)، وكل عائلة
  `registerDataTable` / `dt_*` لجداول البيانات (القسم 5.3). منشور
  كـ `@nac3/runtime/extensions` (`dist/nac-v2-extensions.mjs`).
  وزمن التشغيل الأساسي **لا** يحمل سطح `dt_*`؛ فحمّل هذه الوحدة
  لتحصل عليه.
- `js/nac-chat-client.js` -- عميل محادثة مرجعي يوصل الصوت + نموذج
  اللغة + المرسل. منشور كـ `@nac3/runtime/chat-client`.

وتعرض الحزمة أيضا سطر أوامر باسمي التنفيذ `nac3` و `nac`
(`dist/cli.js`، القسم 10.2).

والتنفيذات الأخرى مرحب بها (Python لمنفذي الأتمتة الأصليين، و Rust
للوكلاء المدمجين، وغيرها). فالمرجعية للمواصفة، لا لكود JS.

---

## 15. عقد توسيع الملحق -- أسطح canvas والواجهات البرمجية (v2.5)

تفترض الأقسام 1-14 أن السطح الذي يهم الوكيل هو **DOM**. فكل عنصر له
عنوان يحمل سمة `data-nac-id`، وكل فعل ينطلق عبر `el.click()`، وكل
قراءة حالة تأتي من `el.getAttribute(...)`. وهذا يصلح للتطبيقات التي
يعيش إطارها **ومحتواها** في عقد DOM.

وهو لا يصلح للتطبيقات التي يكون جزء من سطحها **canvas** (مثل
LibreOffice / Collabora Online، و Figma، و Excalidraw، و Miro، وأي
محرر WebGL مصنوع في البيت). فقد يبقى الإطار من DOM (أشرطة أدوات،
حوارات)، لكن الأوامر كثيرا ما تحتاج أن تمر عبر الواجهة البرمجية
العامة للتطبيق نفسه (postMessage، أو SDK الملحقات، أو جسر السكربتات)،
وقد لا تكون الحالة مقروءة من DOM إطلاقا.

يضيف v2.5 طاقما صغيرا من البدائيات يتيح لملحق NAC3 أن يعلن عقد التوجيه
الخاص به نحو تلك الأسطح. ويبقى زمن التشغيل محايدا تجاه أي تطبيق بعينه
-- فهو لا يتعلم الحديث مع تطبيق إلا بقراءة بيان الملحق.

### 15.1 لماذا طاقم بدائيات جديد

الدالة `NAC.click(id)` التي لا تعرف غير DOM لا تستطيع:

- إرسال postMessage باسم `Send_UNO_Command` إلى iframe لـ Collabora
  موضوع في صندوق رمل.
- نداء `figma.currentPage.selection = [...]` داخل صندوق رمل ملحقات
  Figma.
- استدعاء `excalidrawAPI.setElements(...)` على ref في React.
- قراءة ما إذا كان العريض مفعلا على المنتقى الحالي في Collabora (فشريط
  الأدوات يعكسه؛ و canvas يخفيه).

والعلاج **ليس** توسيع `NAC.click` بحدسيات لاكتشاف الـ backend. العلاج
هو إضافة فعل صريح ومحايد يأخذ slug الملحق ومسار الفعل، ويترك لبيان
الملحق أن يعلن كيف يُوجَّه ذلك الفعل.

### 15.2 البدائيات الثلاث

```ts
NAC.registerPlugin(slug: string, manifest: PluginManifest): void
NAC.call(plugin: string, verb_path: string, args?: object): Promise<any>
NAC.read(plugin: string, state_path: string): Promise<any>
NAC.subscribe(plugin: string, event_path: string,
              cb: (data: any) => void): SubscriptionHandle
NAC.unsubscribe(handle: SubscriptionHandle): void
```

- الدالة `registerPlugin(slug, manifest)` تسجل ملحق v2.5. ويمكن
  لـ `slug` واحد أن يظهر في سجل بيانات DOM (القسم 5) وفي سجل
  امتدادات v2.5 معا؛ فالسجلان يتعايشان. ونداءات v2.5 لا تُحل إلا عبر
  سجل v2.5.
- الدالة `call` تنادي فعلا معلنا. والتوجيه يختاره البيان، لا الوكيل.
  وتُحل بما أرجعه الـ backend (وهو غالبا `undefined` /
  `{ok: true}`)؛ وترفض بـ `NacError` إن كان الفعل مجهولا، أو فشل
  الـ backend، أو كان شكل الجواب غير صحيح.
- الدالة `read` ترجع قيمة حالة معلنة. ويمشي زمن التشغيل على سلسلة
  احتياطات الحالة بالترتيب المعلن ويرجع أول مصدر يُحل؛ ولا يرفض إلا
  حين تفشل كل مصادر السلسلة.
- الدالة `subscribe` تعلق منصتا على حدث معلن. وترجع مقبضا يمرره
  المنادي إلى `unsubscribe` للتنظيف. ويمكن للأحداث أن تستند إلى مصدر
  أحداث حقيقي في الأعلى، أو أن تكون مصنوعة بالاستفتاء الدوري /
  MutationObserver -- والبيان يعلن أيهما.

الدوال الأربع كلها غير متزامنة (ترجع وعدا) إلا `unsubscribe`، فهي
متزامنة ولا يتغير أثرها بتكرار النداء.

### 15.3 شكل بيان الملحق

```ts
interface PluginManifest {
  slug: string;
  verbs:  { [verb_path: string]: VerbBinding };
  state:  { [state_path: string]: StateBinding[] };
  events: { [event_path: string]: EventBinding };
}

interface VerbBinding {
  backend:       BackendKind;
  /* backend-specific fields (see 15.4) */
  [k: string]: any;
}

interface StateBinding {
  backend:       BackendKind;
  /* backend-specific fields (see 15.4) */
  extract?:      string;   /* extractor DSL string (see 15.5) */
  [k: string]: any;
}

interface EventBinding {
  backend:       BackendKind;
  /* backend-specific fields */
  [k: string]: any;
}

type BackendKind =
  | 'postmessage'
  | 'postmessage-listen'
  | 'sdk-call'
  | 'script-bridge'
  | 'dom-mirror'
  | 'same-origin-window'
  | 'synthetic-mutation'
  | 'synthetic-poll';
```

البيانات JSON خالص (بلا دوال رد JS). وتولدها Forge و Sumi وأي أداة
قادمة كبيانات؛ وزمن التشغيل يفسر أسماء الـ backend من معجم ثابت.

للأفعال والأحداث **ارتباط واحد بالضبط**. وللحالة **مصفوفة مرتبة** من
الارتباطات: فيمشي زمن التشغيل على السلسلة بالترتيب، ويرجع أول مصدر
نجح في الحل.

### 15.4 معجم الـ backend

| النوع | يُستخدم لأجل | الحقول المطلوبة |
|------|----------|-----------------|
| `postmessage` | فعل: إرسال رسالة إلى iframe عبر `postMessage`. | `target` (منتقي CSS لـ iframe المستقبل)، `message` (نص MessageId)، `values` (كائن حرفي يُعبأ بالوسائط)، `values_from_args` (مصفوفة اختيارية بمفاتيح وسائط تُمرر كما هي) |
| `postmessage-listen` | حدث: الإنصات إلى `MessageId` وارد محدد على `window.message`. | `source` (منتقي CSS لـ iframe تُصفى به الأصول؛ وإن أُهمل قُبل أي أصل)، `message` (قيمة MessageId المطلوب مطابقتها)، `extract` (معجم الاستخراج على بيانات الرسالة) |
| `sdk-call` | فعل: نداء دالة JS معروضة عالميا (مثل ملحق Figma، أو واجهة Excalidraw). | `path` (مسار بنقاط داخل `window`، مثل `figma.currentPage.selection`)، `mode` (`assign` لإسناد قيمة الوسائط إلى المسار، و `invoke` لنداء المسار كدالة بكائن الوسائط) |
| `script-bridge` | فعل أو حالة: نداء جسر السكربتات في تطبيق (مثل `CallPythonScript` في Collabora، أو جسر UNO في LibreOffice، أو Google Apps Script). | `bridge` (معرف خاص بالـ backend، مثل `collabora.python`)، `script` (معرف السكربت)، `function` (اسم الدالة المطلوب تشغيلها)، `args` (كائن حرفي يُعبأ بوسائط النداء)، `response_match` (للحالة: قيمة MessageId للجواب الذي يُنتظر)، `timeout_ms` (اختياري، افتراضيا 5000) |
| `dom-mirror` | حالة: القراءة من عنصر DOM تعكس سمته / صنفه / نصه حالة داخلية في canvas (مثل زر في شريط الأدوات يُبرز حين يكون تنسيقه مفعلا على المنتقى الحالي). | `selector` (منتقي CSS للاستعلام)، `extract` (معجم الاستخراج، انظر 15.5) |
| `same-origin-window` | حالة: القراءة من `iframe.contentWindow.<path>` حين يكون iframe من الأصل نفسه. ويكتشف زمن التشغيل اختلاف الأصل فينزل إلى الاحتياط التالي. | `target` (منتقي CSS لـ iframe)، `path` (مسار بنقاط داخل `contentWindow`) |
| `synthetic-mutation` | حدث: صناعة حدث بمراقبة تغيرات DOM على مصدر حالة أو أكثر، وإعادة الإصدار حين تتغير القيمة المراقبة. | `observe` (مصفوفة بمسارات الحالة المطلوب مراقبتها؛ وينادي زمن التشغيل `read` على كل منها ويقارن بين التغيرات)، `throttle_ms` (اختياري، افتراضيا 100) |
| `synthetic-poll` | حدث: صناعة حدث باستفتاء مصادر الحالة دوريا. | `observe` (مصفوفة بمسارات الحالة)، `interval_ms` (افتراضيا 250) |

يجب أن ينفذ زمن التشغيل كل backend كمرسل مكتف بذاته
(`dispatch(binding, args, context) -> Promise<value>`). وإضافة نوع
backend جديد إلى المواصفة تقتضي رفع إصدار المواصفة؛ وأزمنة التشغيل
التي تتجاهل الـ backend المجهولة يجب أن ترفض البيانات التي تعلنها (لا
تجاوز صامت).

### 15.5 معجم الاستخراج المصغر

كثيرا ما تحتاج backend الحالة و backend الحدث `postmessage-listen` أن
تنتزع حقلا من كائن أكبر. ويحمل زمن التشغيل معجما تعريفيا صغيرا جدا حتى
تبقى البيانات JSON فقط:

| الصيغة | المعنى | مثال دخل -> خرج |
|--------|---------|-------------------------|
| `field.path.to.value` | المشي على مسار بنقاط. | `{a:{b:1}}` مع `a.b` -> `1` |
| `attribute:NAME` | في DOM فقط: قراءة `el.getAttribute(NAME)`. | `<i data-x="hi">` مع `attribute:data-x` -> `'hi'` |
| `text` | في DOM فقط: قراءة `el.textContent`. | `<span>hi</span>` مع `text` -> `'hi'` |
| `classList.contains:CLASS` | في DOM فقط: `el.classList.contains(CLASS)` -> منطقي. | `<button class="active">` مع `classList.contains:active` -> `true` |
| `value` | في DOM فقط: قراءة `el.value`. | `<input value="x">` مع `value` -> `'x'` |
| `present` | في DOM فقط: ترجع `true` إن حل المنتقي عنصرا، و `false` إن لم يحل. | المنتقي طابق -> `true` |

التركيب غير مدعوم في v2.5؛ فالمستخرج هو بالضبط أحد السطور أعلاه. وأي
بيان يحتاج تحويلا معقدا يعلن `script-bridge` بدلا من ذلك.

### 15.6 دلالة سلسلة الاحتياطات في `state`

الحقل `state[path]` مصفوفة من الارتباطات. وتمشي
`NAC.read(plugin, path)` على المصفوفة بالترتيب. ولكل ارتباط:

1. ينادي زمن التشغيل مرسل الـ backend.
2. إن حُل المرسل بقيمة (ومنها `false` و `0` والنص الفارغ، لكن **ليس**
   `undefined`) أرجعت `read` تلك القيمة.
3. وإن رفض المرسل أو حُل بـ `undefined` تقدم زمن التشغيل إلى الارتباط
   التالي في المصفوفة.
4. وإن لم ينتج أي ارتباط قيمة رفضت `read` بـ
   `NacError('state_unreadable', ...)`، ويحمل فيه
   `err.attempts: [...]` مدخلا لكل backend جُرب، بصيغة
   `{backend, reason}`.

والعلة: السلسلة تسجل ترتيب تفضيل من كتب البيان. فالمصدر الأسرع والأرخص
والأحدث يُعلن أولا؛ والاحتياطات تتدرج هبوطا بلياقة. ولا يختار زمن
التشغيل أبدا، في صمت، مصدرا أدنى أولا.

### 15.7 منشأ الأفعال المصنوعة

كل إرسال من `NAC.call` يصدر حدث `nac:plugin:invoked` على `document`
بعد أن يرجع الـ backend. وحمولة التفصيل:

```js
{
  plugin:    'collabora.writer',
  verb_path: 'uno.Bold',
  backend:   'postmessage',
  request_id: 'pi_<random hex>',
  source:    'agent',     // see sec 7
  trusted:   false,
  duration_ms: 12,
  ok:        true,
  error:     null,
}
```

والشكل نفسه يسري على `nac:plugin:read` (بعد `read`) وعلى
`nac:plugin:event` (إعادة إصدار حدث مصنوع). والحقل `source` قيمته
الافتراضية `'agent'`؛ والمضيفون الذين يغلفون زمن التشغيل بواجهة
للمستخدم يمكن أن يستبدلوها عبر الآلية القائمة
`NAC.set_source(...)` (القسم 7).

### 15.8 مثال مشغول -- Collabora Writer

```json
{
  "slug": "collabora.writer",
  "verbs": {
    "uno.Bold": {
      "backend": "postmessage",
      "target":  "iframe[data-collabora-frame]",
      "message": "Send_UNO_Command",
      "values":  { "Command": ".uno:Bold" }
    },
    "doc.save": {
      "backend": "postmessage",
      "target":  "iframe[data-collabora-frame]",
      "message": "Action_Save",
      "values_from_args": ["DontTerminateEdit", "Notify"]
    }
  },
  "state": {
    "selection.isBold": [
      { "backend": "dom-mirror",
        "selector": "[data-nac-id='toolbar.bold']",
        "extract":  "classList.contains:selected" },
      { "backend": "script-bridge",
        "bridge":   "collabora.python",
        "script":   "yujin_state.py",
        "function": "GetSelectionState",
        "response_match": "CallPythonScript-Result",
        "extract":  "Values.is_bold" }
    ],
    "doc.modified": [
      { "backend": "same-origin-window",
        "target":  "iframe[data-collabora-frame]",
        "path":    "app.file.modified" }
    ]
  },
  "events": {
    "doc.modified": {
      "backend": "postmessage-listen",
      "source":  "iframe[data-collabora-frame]",
      "message": "Doc_ModifiedStatus",
      "extract": "Values.Modified"
    },
    "selection.changed": {
      "backend":     "synthetic-mutation",
      "observe":     ["selection.isBold", "selection.isItalic"],
      "throttle_ms": 100
    }
  }
}
```

ينادي الوكيل `NAC.call('collabora.writer', 'uno.Bold')`؛ فيوجه زمن
التشغيل عبر backend المسمى `postmessage` ويرسل `Send_UNO_Command`
إلى الـ iframe. وللتأكد من أن الأثر قد حدث (انظر القسم 17) ينادي
الوكيل `await NAC.read('collabora.writer', 'selection.isBold')`؛
فيجرب زمن التشغيل مرآة شريط الأدوات أولا (سريعة ومجانية)، ثم ينزل إلى
جسر سكربتات Python إن لم تكن المرآة متاحة. ولا يعرف الوكيل أبدا، ولا
يهمه، أي مصدر أجاب.

### 15.9 الأخطاء

ترفض `NAC.call` / `read` / `subscribe` بـ `NacError` يكون `code` فيه
واحدا من هذه:

- `plugin_not_registered` -- لا بيان v2.5 لهذا الـ slug.
- `verb_not_declared` -- مسار الفعل ليس في البيان.
- `state_not_declared` -- مسار الحالة ليس في البيان.
- `event_not_declared` -- مسار الحدث ليس في البيان.
- `backend_unknown` -- البيان يعلن backend لا ينفذه زمن التشغيل. ويجب
  رفض البيان عند التسجيل؛ ولا يظهر هذا الخطأ إلا إذا قبل زمن تشغيل
  صيغة بيان مستقبلية ثم لم يقدر على إرسالها.
- `backend_target_missing` -- هدف الـ backend (iframe، أو مسار JS، أو
  منتقي DOM) غير موجود.
- `cross_origin_blocked` -- جُرب `same-origin-window` على iframe من
  أصل مختلف.
- `state_unreadable` -- فشل كل ارتباط في سلسلة حالة؛ انظر 15.6.
- `timeout` -- لم يجب backend خلال `timeout_ms` المعلن عنده
  (افتراضيا 5000 للأفعال و 1000 لقراءات الحالة).
- `invalid` -- شكل الوسيط خاطئ (slug غير صحيح، أو بيان مشوه عند
  التسجيل، وغير ذلك).

---

## 16. التنقل في الشجرة (v2.5 -- صدر في 2.5.0-alpha.5 / RFC V25-02)

بدائيات للتنقل الهرمي في الأوامر، لأجل مسارات المساعدة ومنفذي الصوت
الذين يحتاجون أن يصفوا ما يمكنهم فعله من موضع التركيز الحالي.

**سطح الواجهة البرمجية:**

- `NAC.context(plugin) -> { breadcrumb: [{nac_id, label}, ...] }`
  يصعد من `document.activeElement` عبر العناصر الأسلاف التي تحمل
  `data-nac-id`، ويتوقف عند جذر الملحق. ويرجع مسارا فارغا إن لم يكن
  شيء في الملحق يحمل التركيز. وتسمية `label` لكل درجة تأتي من
  `narrate` (القسم 17).

- `NAC.tree(plugin, rootId?) -> [{nac_id, label, opens?, leaf?}, ...]`
  يعد الأبناء ذوي العناوين **المباشرين** لـ `rootId` (أو لجذر الملحق
  إن أُهمل). و"المباشر" يعني أنه لا يوجد عنصر آخر يحمل `data-nac-id`
  بين نقطة البداية والابن. ولكل مدخل:
  - `label` محلولة عبر `narrate`
  - `opens` تعكس السمة `data-nac-opens` حين تكون موجودة
  - `leaf` تكون `true` حين تكون `data-nac-leaf` موجودة

**سمات للكاتب:**

- `data-nac-opens="<target-nac-id>"`: تعلن أن هذه العقدة تفتح / تهبط
  إلى العنصر الذي يحدده المعرف الهدف. وبذلك يتابع الوكلاء سلسلة التنقل
  دون تخمين الأسماء.
- `data-nac-leaf`: علامة نهاية صريحة؛ فتعرف الوكلاء اللاحقة أن لا هبوط
  أعمق ممكن.

**الأخطاء:** ترجع `tree` القيمة `[]` لـ rootId مجهول (فراغ صامت، لا
خطأ). وترجع `context` دائما `{ breadcrumb: [] }` للملحقات المجهولة.

---

## 17. التسميات المساعدة (v2.5 -- صدر في 2.5.0-alpha.5 / RFC V25-03)

حل معياري للتسميات التي يقرؤها البشر. دالة واحدة لقارئات الشاشة،
وتوليد الكلام، ومسارات الصوت، وسجلات التدقيق، وأسطح المساعدة على
الهاتف.

**سطح الواجهة البرمجية:**

- `NAC.narrate(plugin, nac_id) -> string | null`
  ترجع `null` إن لم يُوجد الملحق أو لم يُوجد nac_id. وإلا فالتسمية
  وفق ترتيب الأولوية الصارم هذا:

  1. **`aria-label`** -- الوصول أولا؛ ويُحترم إلا إذا كان فراغا فقط.
  2. **النص المرئي** -- أي `textContent` للعنصر، مستثنى منه أي شجرة
     فرعية معششة تحمل `data-nac-id` (فلتلك حل narrate خاص بها؛
     وتُستثنى حتى يبقى الخرج المنطوق محصورا في نطاقه).
  3. **`data-nac-label`** -- تجاوز صريح من الكاتب؛ وهو مفيد حين يحتوي
     النص المرئي على رموز أيقونات أو مفاتيح i18n.
  4. **`nac_id` كآخر ملجأ** -- وهي أسوأ حالة؛ وتشير إلى أن "لا تسمية
     كُتبت".

  والقيم التي هي فراغ فقط، في أي طبقة، تنزل إلى الطبقة التالية.

**التحقق:** يمكن لـ `validate_global()` أن تصدر تحذيرات في مجموعة
`plugin_instance_violations` للمعرفات ذات الشكل الترتيبي (`btn-1`
و `btn-2` و ...) التي تنقصها أي من تسميات الطبقات الأعلى.

---

## 18. اكتشاف الأثر (v2.5 -- صدر في 2.5.0-alpha.5 / RFC V25-04)

يسد ثغرة "الضرر الصامت": فالوكيل يتأكد من أثر الفعل، لا من مجرد أن
الأمر قد أُصدر. والبدائيتان تتركبان مع `NAC.read()`، فيعمل أي backend
من V25-01 (postmessage، و sdk-call، و dom-mirror، ...).

**سطح الواجهة البرمجية:**

- `NAC.expect(plugin, statePath, value, opts?) -> Promise<value>`
  تستفتي `NAC.read(plugin, statePath)` مرة بعد مرة حتى يرجع المقارن
  قيمة صادقة أو حتى يحل الأجل. وتُحل بالقيمة المحلولة؛ وترفض بـ
  `NacError('timeout', ...)` عند الأجل.

  وإخفاقات القراءة خلال الاستفتاء تُعاد المحاولة فيها حتى الأجل
  (وتُعامل كأنها "غير مرئي بعد"، لا كخطأ قاس).

  الخيارات:
  - `timeout_ms` (افتراضيا `5000`)
  - `poll_ms` (افتراضيا `100`)
  - `comparator` (افتراضيا `(cur, want) => cur === want`)
    ويستلم `(current, expected)` ويرجع قيمة منطقية.

- `NAC.diff(plugin, statePath, actionFn) -> Promise<{before, after, changed}>`
  تقرأ الحالة، وتنتظر `actionFn()`، ثم تقرأ الحالة مرة أخرى. وترجع
  اللقطتين وقيمة منطقية `changed` محسوبة بمقارنة JSON-stringify (فحتى
  `undefined` في مقابل قيمة يُعد تغيرا). وإخفاقات القراءة تنطوي إلى
  `undefined`.

**ملاحظات على التركيب:** تلتقط `diff` لقطة البداية ولقطة النهاية فقط؛
وهي **لا** تراقب الحالات الوسيطة داخل الفعل. فإن كان همك أن "الحالة تمر
بقيمة بعينها في لحظة ما" فاستخدم `expect`.

---

*هذا المستند هو المواصفة المعيارية لـ NAC3 v2.5. والأقسام 0-14 لم
تتغير عن v2.4 المستقر. والأقسام 15-18 تصدر في v2.5. وتعديلات هذا
الملف تعد تغييرات في المواصفة وتقتضي RFC؛ انظر `CONTRIBUTING.md`.*
