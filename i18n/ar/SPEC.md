---
translation_source: SPEC.md
translation_source_hash: 5ebb8103746daf5bf7877b67ebb3a44cf98b4e2cba1fd8ba30093e0fce1b9b76
translation_quality: machine_v1
translation_lang: ar
translation_date: 2026-05-11T13:16:28.404860+00:00
---

# NAC3 -- Native Agent Contract

**الإصدار:** 2.2.0
**الحالة:** مستقر
**الرخصة:** Apache-2.0
**المحرر:** Yujin (yujin.app)

---

## 0. الغرض

NAC3 هو عقد بين واجهات المستخدم على الويب والوكلاء الذين يتحكمون فيها.
تشمل هذه الوكلاء: منفذي الأوامر الصوتية، والوسطاء القائمين على LLM، وروبوتات RPA،
وأدوات إمكانية الوصول، ومشغّلات الاختبار الشامل. يحدد هذا العقد:

1. **كيفية تسمية العناصر** -- حتى يتمكن الوكيل من طلب "انقر على زر الحفظ"
   وتحديد عقدة DOM وحيدة مقابلها.
2. **كيفية تطبيق الأفعال** -- حتى يتمكن الوكيل من استدعاء `NAC.click(id)` و`NAC.fill(id, value)` و`NAC.tab(plugin, key)` وغيرها، دون الحاجة إلى رمز وصل خاص بكل تطبيق.
3. **كيفية الإشارة إلى اكتمال العملية** -- حتى يعرف الوكيل متى انتهت خطوة ما، من خلال عائلة أحداث محددة لكل دور.
4. **كيفية الحفاظ على مصدر الإجراء** -- حتى تستطيع الأنظمة المتلقية التمييز بين نقرة مستخدم حقيقية وأخرى مُولَّدة اصطناعياً.

يضيف NAC3 طبقة خفيفة فوق أي إطار عمل تستخدمه بالفعل للعرض، ولا يحل محل ARIA أو React أو Vue أو نظام التصميم الخاص بك.

---

## 1. الأدوار

كل عنصر DOM ذي صلة بالوكيل يحمل `data-nac-role`. الأدوار المعيارية هي:

| الدور | المعنى | مثال |
|-------|--------|------|
| `plugin` | وحدة واجهة مستخدم مكتفية بذاتها (صفحة، أو لوحة، أو مجموعة أدوات). | `<article data-nac-plugin="invoice">` |
| `section` | معلم داخل plugin (رأس، أو جسم، أو تذييل، أو شريط جانبي). | `<section data-nac-role="section">` |
| `region` | منطقة قابلة للتسمية داخل section (مجموعة بطاقات، أو قائمة نتائج). | `<div data-nac-role="region">` |
| `action` | عنصر قابل للنقر يُشغّل فعلاً (زر، أو رابط يعمل كزر). | `<button data-nac-role="action" data-nac-action="save">` |
| `field` | حقل إدخال يكتب فيه المستخدم أو يبدّله (نص، رقم، خانة اختيار، زر راديو، تاريخ، ملف). | `<input data-nac-role="field">` |
| `option` | خيار قابل للتحديد داخل field (عنصر فرعي في combobox / select / radio group). | `<li data-nac-role="option">` |
| `tab` | محدد لوحة قابل للتبديل. **مطلوب عندما يطابق `data-nac-id` النمط `^tab\.`** | `<button data-nac-role="tab" data-nac-id="tab.lines">` |
| `breadcrumb-item` | خطوة في مسار التنقل التفصيلي. | `<a data-nac-role="breadcrumb-item">` |
| `accordion-toggle` | عنصر تحكم للتوسيع/الطي. | `<button data-nac-role="accordion-toggle">` |
| `step` | مؤشر خطوة في معالج الإعداد. | `<li data-nac-role="step">` |
| `pagination-item` | عنصر تحكم للانتقال بين الصفحات في قائمة مُرقَّمة. | `<button data-nac-role="pagination-item">` |
| `confirm-button` | زر تأكيد/إلغاء داخل مربع حوار التأكيد. | `<button data-nac-role="confirm-button">` |
| `sort-control` | رأس عمود لترتيب البيانات. | `<th data-nac-role="sort-control">` |
| `filter-control` | مشغّل تصفية العمود. | `<button data-nac-role="filter-control">` |
| `data-table` | حاوية جدول البيانات (v2.1). | `<table data-nac-role="data-table">` |
| `navigation` | منطقة تنقل معلمية. **ليست tab.** | `<nav data-nac-role="navigation">` |
| `confirm-dialog` | النافذة المنبثقة لطلب التأكيد. | `<div data-nac-role="confirm-dialog">` |

الأدوار غير الواردة في هذه القائمة محجوزة للاستخدام المستقبلي. يجب على بيئة تشغيل NAC-strict رفض الأدوار غير المعروفة عند التسجيل (v2.2). يجوز لبيئة تشغيل NAC-permissive معاملة الأدوار غير المعروفة باعتبارها `action` للتوافق مع الإصدارات السابقة (الافتراضي في v1.9 وv2.0).

---

## 2. الأسماء

كل عنصر قابل للتحليل من قِبَل الوكيل يحمل `data-nac-id`. يتسم هذا المعرّف بما يلي:

- **مسار منقوط** (مثل `deals.list.row.42.actions.delete`).
  تفصل النقاط بين المستويات الدلالية؛ لا تفسّرها بيئة التشغيل، لكن يفهمها البشر وLLMs.
- **فريد عالمياً ضمن نطاق `data-nac-plugin`**. يجوز لـ plugin-ين مختلفين مشاركة نفس المعرّف؛ تحلّ بيئة التشغيل الغموض عبر زوج `(plugin, id)`.
- **ثابت عبر إعادة العرض.** أطر العمل التي تُنتج معرّفاً جديداً في كل عرض (تجزئات عشوائية، أو عدادات نسخ) تنتهك العقد.
- **ثابت عبر إعادة تصميم الواجهة.** إذا انتقل زر من شريط الأدوات إلى قائمة منسدلة، يجب أن يبقى معرّفه كما هو.

بادئات المعرّفات المحجوزة (v2.1):

| البادئة | محجوزة لـ |
|---------|-----------|
| `tab.` | أزرار التبويب. يجب أن يكون الدور `tab`. |
| `modal.` | العناصر المحدودة بنطاق النافذة المنبثقة. الدور هو دور الأداة الطرفية. |
| `field.` | اختصار حقل النموذج. يجب أن يكون الدور `field` أو `option`. |
| `confirm.` | مربعات حوار التأكيد. |

---

## 3. الأفعال

يجوز لعنصر `data-nac-role="action"` أن يحمل `data-nac-action="<verb>"`
لتسمية ما يفعله. الفعل هو معرّف بصيغة snake-case حر الشكل، يُتفق عليه بين المضيف والوكيل. الأفعال الشائعة:

`save`، `cancel`، `submit`، `delete`، `edit`، `view`، `create`،
`approve`، `reject`، `send`، `download`، `upload`، `refresh`،
`expand`، `collapse`، `open`، `close`، `add_row`، `remove_row`.

تحلّ `NAC.click_by_verb(plugin, verb)` الفعلَ إلى الإجراء الوحيد ضمن ذلك plugin وتنقر عليه. وجود إجراءات متعددة تشترك في نفس الفعل تحت plugin واحد يُعدّ خطأً صريحاً (lint: `duplicate_verb`).

---

## 4. البيان

يجوز لكل plugin تسجيل بيان عبر:

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

البيان هو مرجع الحقيقة الموجَّه للوكيل. يبحث وسيط LLM الذي يستنتج أن "المستخدم قال 'guardar'" في بيان plugin، فيجد الفعل `save`، ثم يُصدر `NAC.click_by_verb('invoice', 'save')`.

### 4.1 الحقول المطلوبة

- `plugin_slug` -- يطابق `data-nac-plugin` على العنصر المضيف.
- `nac_version` -- إصدار NAC3 الذي يدّعي هذا البيان الامتثال له. ترفض بيئة التشغيل البيانات التي تدّعي إصداراً أعلى من إصدارها.

### 4.2 الحقول الاختيارية

- `elements[]` -- فهرس الأدوات المسمّاة. يجب أن يحتوي كل إدخال على `id` و`role`.
- `tabs[]` -- مصفوفة مستقلة على المستوى الأعلى للتبويبات. مكافئة لإدخالات `elements[]` ذات `role:'tab'`. كلا الشكلين صالح.
- `fields[]` و`actions[]` و`kpis[]` و`data_tables[]` -- مجموعات فرعية مُصنَّفة؛ لها نفس دلالات `elements[]` مُصفَّاةً حسب الدور. تختار العروض التوضيحية الشكل الأوضح للقراءة البشرية.

### 4.3 التدويل (i18n)

يجب أن يغطي كل `label_i18n` جميع لغات NAC3 العشر:

```
es, en, pt, fr, ja, zh, hi, ar, de, it
```

يسمح `i18n_strict: 'permissive'` على `NAC.autoRegister.watch()` بتغطية جزئية أثناء الترحيل التدريجي؛ أما البيانات في بيئة الإنتاج فينبغي أن تشمل اللغات العشر.

## 5. واجهة برمجة التطبيقات العامة (Public API)

### 5.1 الأوامر المباشرة (Imperative)

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

### 5.1.1 مساعد المطابقة (v2.2)

`NAC.bindAction(el, handler, ctx)` هو الأسلوب المعتمد في المواصفة لربط معالج النقر. يُصدر تلقائيًا الحدث `nac:action:succeeded` (أو `:failed`) بعد تنفيذ المعالج، سواء أكان متزامنًا أم رمى استثناءً أم أعاد Promise. يُعيد دالةً لإلغاء الربط. استخدم هذا الأسلوب بدلًا من `addEventListener('click', ...)` المباشر كلما كان المضيف يدعمه؛ أما الكود القديم (brownfield) فلا يزال بإمكانه إصدار الحدث يدويًا كما كان من قبل.

### 5.1.3 محرر الحقول (v2.3 preview)

`NAC.edit_field(nac_id)` يفتح نافذة modal تتيح للمستخدم (أو وكيل ينوب عنه) تحرير أي حقل نصي بأدوات مشابهة لـ Word:

```ts
NAC.edit_field(nac_id: string): Promise<{ok:true}>
```

تُسجَّل النافذة تحت `plugin_slug='nac_editor'` مع هذه الأفعال القابلة للاستدعاء عبر NAC-3:

| الفعل (Verb) | التأثير |
|------|--------|
| `select_word` | تحديد الكلمة عند موضع المؤشر |
| `select_sentence` | تحديد الجملة عند موضع المؤشر |
| `select_all` | تحديد الكل (Ctrl-A) داخل المحرر |
| `replace` | استبدال التحديد بالنص المحدد |
| `delete_selection` | حذف التحديد الحالي |
| `ai_correct_syntax` | إرسال القيمة الحالية إلى الوسيط LLM مع موجّه النظام "fix grammar + spelling, return only fixed text"، ثم استبدال القيمة بالاستجابة |
| `save` | كتابة القيمة إلى الحقل المصدر، وإطلاق أحداث input و change، ثم الإغلاق |
| `cancel` | تجاهل التغييرات والإغلاق |

يُغلق المفتاح Esc النافذة (إلغاء). يحفظ Ctrl/Cmd+Enter. النقر على خلفية النافذة يُلغي العملية.

سيُرسّخ القسم 13 من المواصفة هذا العقد في الإصدار v2.3؛ ويشحن وقت تشغيل v2.2 تطبيقًا مرجعيًا عاملًا حتى يتمكن المعتمدون من توصيله اليوم. متاح على أي حقل عبر:

```js
NAC.edit_field('invoice.client_name');
// أو عبر الوسيط:
NAC.click_by_verb('myplugin', 'edit_field', { nac_id: 'invoice.client_name' });
```

### 5.1.2 علامة التحقق الصارم (v2.2)

`NAC.STRICT_VALIDATION` (قيمة منطقية boolean، الافتراضي `false` في v2.2). عند تعيينها `true`، يُطلق `NAC.register()` خطأ `Error` بالكود `code='strict_validation'` ومصفوفة `findings` في أيٍّ من الحالات التالية:

- `manifest_role_unknown` -- دور الإدخال خارج المجموعة المعتمدة.
- `tab_id_manifest_role_drift` -- المعرّف يطابق `^tab\.` لكن الدور ليس `'tab'`.
- `manifest_dom_role_mismatch` -- قيمة `data-nac-role` في عنصر DOM المُركَّب تختلف عن دور الإدخال في الـ manifest.

في الإصدار v2.3 سيتغير الافتراضي إلى `true`. وفي الإصدار v3.0 ستُحذف هذه العلامة (يصبح الوضع الصارم هو الوحيد).

جميع الدوال غير المتزامنة ترفض بخطأ `NacError` يحمل `code` بإحدى القيم التالية:

- `not_found` -- العنصر أو الدور أو الفعل المطلوب غير موجود في DOM.
- `invalid` -- شكل المعامل غير صحيح.
- `timeout` -- أُطلق التأثير الجانبي لكن حدث تأكيد المطابقة لم يصل خلال 5 ثوانٍ. **انتهاء المهلة يعني فشلًا حقيقيًا**: ربما تعطّل المعالج، أو لم يُربط حدث التأكيد قط، أو حدث تعارض في الشبكة. يجب على المستدعين معاملة انتهاء المهلة باعتباره فشلًا ما لم يكن لديهم دليل على نجاح التأثير الجانبي عبر قناة أخرى.

### 5.2 الاستبطان (Introspection)

```ts
NAC.describe():    { active: string|null, plugins: PluginSnap[] }
NAC.describe_v2(): { v2_scope_entries: [...], sitemap: ..., data_tables: [...] }
NAC.manifest(plugin_slug: string): Manifest|null
NAC.validate_global(opts?: {probe?: boolean}): Findings[]
```

### 5.3 جداول البيانات (v2.1)

```ts
NAC.registerDataTable(spec: DataTableSpec): void
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

يمتلك كل جدول بيانات خاصية `subkind`:

- `collection` -- صفوف مرتبة مع إمكانية الحفظ التعاملي (transactional commit). يُستخدم لبنود الفاتورة وعناصر السلة وسجلات الأحداث.
- `matrix` -- شبكة صفوف وأعمدة تحمل كل خلية فيها قيمة. يُستخدم لمصفوفات الصلاحيات وشبكات الجداول الزمنية.
- `matrix-singletree` -- matrix حيث ينهار كل صف إلى شجرة (نادر الاستخدام).

---

## 6. الأحداث (Events)

كل إجراء يُصدر حدث اكتمال محدد. تستطلع `NAC.click()` في وقت التشغيل هذا الحدث وتُحل عند إطلاقه.

| الدور (Role) | حدث النجاح | حدث الفشل |
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

### 6.1 شكل تفاصيل الحدث (Event detail shape)

تحمل تفاصيل كل حدث حقل المعرّف الأساسي إضافةً إلى `plugin`:

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

### 6.2 الإصدار من معالج المضيف

يجب على معالج النقر إصدار حدث النجاح المقابل بعد اكتمال تأثيره الجانبي المتزامن:

```js
button.addEventListener('click', function (ev) {
  // ... تنفيذ العمل ...
  document.dispatchEvent(new CustomEvent('nac:action:succeeded', {
    detail: { plugin: 'invoice', action_id: 'invoice.save' }
  }));
});
```

إذا كان العمل غير متزامن، أصدر الحدث بعد الحل. وإذا فشل العمل، أصدر `nac:action:failed` مع `{detail: {plugin, action_id, error: <message>}}`.

سيوفر وقت تشغيل v2.2 الدالة `NAC.bindAction(el, handler, ctx)` التي تُغلّف `addEventListener` وتُصدر الأحداث تلقائيًا.

### 6.3 لماذا لا نستخدم حدث النقر مباشرةً؟

حدث DOM `click` يُطلق قبل تشغيل المعالج. يحتاج عقد NAC3 إلى معرفة متى **اكتمل التأثير الجانبي**، لا متى بدأ النقر. ومن هنا جاءت عائلة الأحداث المنفصلة.

---

## 7. المصدر والمنشأ

### 7.1 isTrusted

`event.isTrusted` تكون `true` للنقرات التي يبادر بها المستخدم (فأرة حقيقية، ضغطة مفتاح حقيقية، تفعيل قارئ الشاشة)، و`false` للنقرات الاصطناعية (`element.click()`، أو إرسال حدث MouseEvent مُنشأ برمجياً، أو أدوات الأتمتة).

يجب على NAC3 إتاحة هذه القيمة عبر `event.detail.is_trusted` في حدث النجاح. يجوز للمضيفين الذين ينفّذون إجراءات حساسة أمنياً (الدفع، الحذف) اشتراط أن تكون `is_trusted === true` ورفض النقرات الاصطناعية. يتضمن العرض التوضيحي المرجعي `example-v20-full.php` زوجاً من الأزرار (`v20_panel.istrusted_real` و`v20_panel.istrusted_fake`) يوضّح هذا الفرق.

### 7.2 المانيفستات الموقّعة بـ HMAC

يجوز أن يحمل المانيفست كتلة `provenance`:

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

تحسب بيئة التشغيل قيمة HMAC المتوقعة على تسلسل ثابت لمحتوى المانيفست (باستثناء التوقيع نفسه)، وترفض أي مانيفست لا يتطابق توقيعه. يُستخدم هذا في بيئات متعددة المستأجرين للحيلولة دون انتحال أحد المستأجرين لهوية مانيفست مستأجر آخر.

### 7.3 نموذج التهديد

راجع `SECURITY.md` للاطلاع على نموذج التهديد الكامل. الملخص:

- لا يُوثّق NAC3 هوية **المستخدم**؛ ذلك من مهام طبقة المصادقة الخاصة بك.
- يُوثّق NAC3 **المانيفست** (عبر HMAC).
- يميّز NAC3 بين النقرات الحقيقية والنقرات الاصطناعية (isTrusted) حتى يتمكن المضيف من رفض الأخيرة في العمليات الحساسة.
- لا يوفر NAC3 حماية ضد وكيل خبيث يعمل بصلاحيات المستخدم؛ إذ يستطيع مثل هذا الوكيل تنفيذ أي شيء يستطيع المستخدم تنفيذه.

---

## 8. مستويات المطابقة

تكون الصفحة **مطابقة لـ NAC-1** إذا:

- كان كل عنصر قابل للنقر يُفترض أن يتمكن الوكيل من تشغيله يحمل `data-nac-id` و`data-nac-role`.
- كان كل عنصر `data-nac-role="action"` يُطلق `nac:action:succeeded` بعد تنفيذ تأثيره الجانبي.
- سجّلت الصفحة مانيفست إضافة واحداً على الأقل عبر `NAC.register()`.
- عمل `NAC.click(id)` لكل معرّف معلَن.

تكون الصفحة **مطابقة لـ NAC-2** إذا استوفت أيضاً:

- تسجيل مصفوفات `tabs[]` و`fields[]` و`actions[]` صراحةً في المانيفست (لا استنتاجاً من DOM).
- توفير `label_i18n` يغطي جميع لغات NAC3 العشر لكل تسمية تواجه المستخدم.
- تطبيق العناصر الأولية للتكامل مع الأنظمة القائمة في الإصدار v2.0: شجرة النطاق، الالتقاط المؤقت، autoRegister.watch.
- اجتياز `NAC.validate_global({probe: false})` بدون أي نتائج بمستوى خطورة `error`.

تكون الصفحة **مطابقة لـ NAC-3** إذا استوفت أيضاً:

- حمل المانيفستات توقيعات HMAC.
- التمييز بين `isTrusted` للأفعال الحساسة أمنياً.
- اجتياز `NAC.validate_global({probe: true})` بدون أي نتائج.

يُبلّغ CLI الخاص بحزمة NPM (`npx @nac3/runtime validate <url>`) عن أعلى مستوى تبلغه الصفحة.

---

## 9. الإصدارات

يتبع NAC3 نظام semver:

- **رفع رقم الإصدار الرئيسي**: تغيير جذري في API العام أو تنسيقات البيانات. يتطلب من المستخدمين تعديل الكود.
- **رفع رقم الإصدار الثانوي**: ميزات جديدة متوافقة مع الإصدارات السابقة. يستمر الكود القديم في العمل.
- **رفع رقم التصحيح**: إصلاح أخطاء وتغييرات في التوثيق فقط.

سياسة الإهمال: تُزال الميزة المُعلَّمة بـ `@deprecated` في الإصدار `X.Y.0` في موعد لا يسبق `(X+1).0.0`. توثّق ملاحظات الإصدار كل عملية إزالة صراحةً.

يعكس إصدار حزمة NPM إصدار المواصفة: `@nac3/runtime@2.1.3` تُطبّق NAC3 v2.1 مع ثلاثة مراجعات تصحيحية.

---

## 10. أدوات التحقق

### 10.1 وقت التشغيل: `NAC.validate_global()`

يتجوّل عبر DOM الحي والمانيفستات المسجّلة وكتالوج i18n، ويُعيد مصفوفة من النتائج:

```ts
{
  severity: 'error' | 'warn' | 'info',
  code:     string,                     // e.g. 'tab_role_drift'
  nac_id:   string | null,
  message:  string,
  detail:   Record<string, any>
}
```

رموز النتائج ثابتة عبر إصدارات التصحيح؛ لا تُضاف رموز جديدة إلا في الإصدارات الثانوية.

### 10.2 CLI: `npx @nac3/runtime validate <target>`

يُغلّف `validate_global` مع فحص ثابت لتناسق HTML والمانيفست. رموز الخروج:

- `0` -- لا توجد نتائج بمستوى خطورة يساوي أو يتجاوز الحد المُهيَّأ.
- `1` -- توجد نتائج.
- `2` -- فشل تحميل الهدف نفسه.

مفيد في CI: `npx @nac3/runtime validate ./dist/index.html --severity=error`.

---

## 11. المنظومة المحيطة بـ NAC3

NAC3 طبقة تعاقد. لتحويل صفحة مطابقة لـ NAC إلى تطبيق مُدار بالصوت، تحتاج أيضاً إلى:

1. **مصدر تحويل الكلام إلى نص** (browser SpeechRecognition، Whisper API، إلخ).
2. **وسيط LLM** يأخذ نص المستخدم ولقطة `NAC.describe()` للصفحة وتلميح i18n، ويُصدر إجراءات منظّمة: `[{kind: 'click', nac_id: 'X'}, {kind: 'fill', nac_id: 'Y', value: 'Z'}]`. راجع `guides/LLM_WIRING.md`.
3. **عميل محادثة** يحتفظ بالحوار ويُرسل الإجراءات. المرجع هو `js/nac-chat-client.js`.
4. **مخرج تحويل النص إلى كلام** للردود المنطوقة (browser SpeechSynthesis، ElevenLabs، إلخ).

يُقنّن NAC3 فقط شكل المدخلات والمخرجات في الخطوة 2 (لقطة `NAC.describe()` وشكل الإجراء). الخطوات 1 و3 و4 خارج نطاق المواصفة؛ تختار ما يناسبك.

---

## 12. ضمانات الاستقرار

ما تعد به هذه المواصفة:

1. لن تتقلص مجموعة الأدوار القياسية في القسم 1. يجوز إضافة أدوار جديدة في الإصدارات الثانوية.
2. لن تُعاد تسمية عائلة الأحداث في القسم 6. يجوز إضافة أحداث جديدة في الإصدارات الثانوية.
3. لن يتغير شكل أفعال `NAC.click` و`NAC.fill` وغيرها في الإصدارات الثانوية. يجوز إضافة حقول `opts` اختيارية جديدة.
4. لن تُعاد استخدام رموز نتائج `validate_global` لحالات مختلفة عبر الإصدارات الثانوية.

ما لا تعد به هذه المواصفة:

1. الصياغة الدقيقة لرسائل الخطأ (تلك سلاسل كتالوج i18n؛ قد تتغير الترجمات).
2. استراتيجية DOM للعثور على العناصر (`querySelector` حالياً؛ قد تنتقل إلى فهرس أسرع لاحقاً).
3. تخطيط ذاكرة التخزين المؤقت الداخلية للمانيفست. تعامل مع المانيفستات على أنها للكتابة فقط من جانب المضيف، وللقراءة فقط من جانب الوكيل.

---

## 13. أسئلة مفتوحة (تُتابع بشكل منفصل)

- هل يجب أن يُحلَّل `data-nac-role="navigation"` إلى تبويب؟ حالياً لا (v2.1). تدعو خارطة طريق v22 إلى رفض أكثر صرامة.
- هل يجب أن يقبل `NAC.click()` معرّفات نسبية (مثل `'./save'` بمعنى "احفظ ضمن الإضافة النشطة")؟ ليس في v2.1؛ ربما في v2.3.
- هل يجب أن تدعم المانيفستات الوراثة/التوسعة عبر الإضافات (مانيفست أساسي يوسّعه مستأجر)؟ مُتابَع كمرشح لـ v3.0.

---

## 13.5 الحوكمة

تتولى Yujin حالياً رعاية NAC3. المواصفة منشورة تحت رخصة Apache 2.0؛ وبيئة التشغيل المرجعية تحت رخصة MIT. تلتزم Yujin بنقل NAC3 إلى مؤسسة محايدة (مجموعة مجتمع W3C، أو Linux Foundation، أو هيئة صناعية مماثلة) متى ما برّر حجم التبني الحوكمةَ المحايدة. حتى ذلك الحين، تتبع تغييرات المواصفة عملية RFC الموثّقة في `CONTRIBUTING.md`، مع فترة تعليق عام لا تقل عن 14 يوماً لأي تغيير يؤثر على API العام أو تنسيقات البيانات.

للمستخدمين: يضمن الجمع بين رخصتَي Apache 2.0 وMIT بقاء المواصفة وبيئة التشغيل بصرف النظر عن أي تغيير في الوضع المؤسسي لـ Yujin. يمكنك تفريع أي منهما، وتشغيل أي منهما، وشحن أي منهما، اليوم وبعد رحيلنا. يُسجّل هذا المستند الالتزام حتى يكون مسار البقاء صريحاً لا ضمنياً.

---

## 14. التطبيق المرجعي

التطبيق القانوني هو بيئة التشغيل المرجعية الموزَّعة كحزمة NPM `@nac3/runtime`. بيئة التشغيل مكتملة الميزات للإصدار v2.1 وتشمل:

- `js/nac.js` -- قاعدة v1.9 مع API العام في القسم 5.
- `js/nac-v2-extensions.js` -- العناصر الأولية للتكامل مع الأنظمة القائمة في v2.0 (شجرة النطاق، الالتقاط المؤقت، autoRegister، HMAC، isTrusted).
- `js/nac-chat-client.js` -- عميل محادثة مرجعي يربط الصوت بـ LLM والمُرسِل.

التطبيقات الأخرى مرحّب بها (Python لمشغّلات الأتمتة الأصلية، Rust للوكلاء المدمجين، إلخ). المواصفة هي المرجع، لا كود JavaScript.

---

*هذا المستند هو مواصفة NAC3 v2.1 القانونية. أي تعديل على هذا الملف يُعدّ تغييراً في المواصفة ويستلزم RFC؛ راجع `CONTRIBUTING.md`.*

---

*This is a machine translation of the canonical English
version at `/nac-spec/SPEC.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
