<!-- nac3-translation-store
locale: ar
source: SPEC.md
source_version: 2.5.1
pass_date: 2026-10-27
engine: anthropic/claude-opus-5 (Yujin Forge)
-->

<!-- u 5e3e86e7f989 | 1 NAC3 -- Native Agent Contract | heading -->
# NAC3 -- Native Agent Contract

<!-- u 5e88280f4232 | 1 NAC3 -- Native Agent Contract | prose -->
**الإصدار:** 2.5.1 (مستقر -- سطح v2.5 الكامل: narrate و context+tree و expect+diff)
**الحالة:** إصدار مستقر. وسم التوزيع `latest` في npm يشير إلى هنا؛ والقسم 9.1 يبين ما يضمنه ذلك وما لا تضمنه نسخة ما قبل الإصدار. هذا المستند يذكر إصداره في موضع واحد بالضبط، في السطر أعلاه. أما وثائق RFC المنشورة وأدلتها في الطبقة 2 + الطبقة 3 فهي مسرودة في `README.md` و `runtime/CHANGELOG.md`.
**الترخيص:** Apache-2.0
**المحرر:** Yujin (yujin.app)

<!-- u 0b1780790faf | 2 0. Purpose | heading -->
## 0. الغرض

<!-- u 582895d698d2 | 2 0. Purpose | prose -->
NAC3 عقد بين واجهات الويب والوكلاء الذين يشغلونها. ويشمل الوكلاء منفذي
الصوت، ووسطاء نماذج اللغة، وروبوتات RPA، وأدوات الوصول، ومنفذي
الاختبارات من الطرف إلى الطرف. ويحدد هذا العقد:

<!-- u 7c6c7f420b83 | 2 0. Purpose | prose -->
1. **كيف تُسمَّى العناصر** -- حتى يستطيع الوكيل أن يقول "انقر زر الحفظ"
   وأن يحل ذلك إلى عقدة واحدة في DOM.
2. **كيف تُطبَّق الأفعال** -- حتى يستطيع الوكيل أن ينادي
   `NAC.click(id)` و `NAC.fill(id, value)` و `NAC.tab(plugin, key)`
   وغيرها، دون كود لاصق لكل تطبيق.
3. **كيف يُشار إلى الإتمام** -- حتى يعرف الوكيل متى انتهت خطوة، بعائلة
   أحداث حتمية لكل دور.
4. **كيف يُحفظ المنشأ** -- حتى يستطيع نظام لاحق أن يميز نقرة مستخدم
   حقيقية من نقرة مصنوعة.

<!-- u 878edf1e669e | 2 0. Purpose | prose -->
يضيف NAC3 طبقة رقيقة فوق أي إطار عمل تستخدمه أصلا في العرض. وهو لا
يحل مكان ARIA ولا React ولا Vue ولا نظام التصميم الذي تستخدمه.

<!-- u c5107b92723f | 3 1. Roles | heading -->
## 1. الأدوار

<!-- u b4f9560e4b2f | 3 1. Roles | prose -->
كل عنصر في DOM يهم الوكيل يحمل `data-nac-role`. والأدوار المعيارية هي:

<!-- u dfae9890f1ae | 3 1. Roles | prose -->
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

<!-- u b08cd46560d8 | 3 1. Roles | prose -->
الأدوار الخارجة عن هذه القائمة محفوظة لاستخدام مستقبلي. وينبغي لزمن
تشغيل من نوع NAC-strict أن يرفض الأدوار المجهولة عند التسجيل (v2.2).
ويمكن لزمن تشغيل من نوع NAC-permissive أن يعامل الأدوار المجهولة
كأنها `action` حفاظا على التوافق مع الماضي (السلوك الافتراضي في v1.9
و v2.0).

<!-- u 4252e24a246a | 3 1. Roles | prose -->
هذا الجدول هو القائمة المعيارية، وهو منشور كبيانات أيضا: الفهرس المقروء
آليا في `api/latest/contract.json` يحمل كل دور يقبله زمن التشغيل
المرجعي، وكل دور موسوم بـ `declared_in_spec_table`، حتى تُقارن
القائمتان دون قراءة نص سردي. وهما متفقتان حتى v2.5. وأي اختلاف لاحق
سيظهر في ذلك الوسم، بدل أن يبقى مخفيا في خلاف رأي بين مستند وتنفيذ.

<!-- u ae2acf06f5be | 4 2. Names | heading -->
## 2. الأسماء

<!-- u d732bc7953d1 | 4 2. Names | prose -->
كل عنصر يستطيع الوكيل حله يحمل `data-nac-id`. وهذا المعرف:

<!-- u 4984c2cad541 | 4 2. Names | prose -->
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

<!-- u 889014ee5ece | 4 2. Names | prose -->
بادئات المعرفات المحفوظة (منذ 2.1):

<!-- u 1c4cc568753b | 4 2. Names | prose -->
| البادئة | محفوظة لأجل |
|--------|--------------|
| `tab.` | أزرار التبويب. ويجب أن يكون الدور `tab`. |
| `modal.` | عناصر في نطاق نافذة طارئة. والدور هو دور العنصر الورقي. |
| `field.` | صيغة مختصرة لحقل استمارة. ويجب أن يكون الدور `field` أو `option`. |
| `confirm.` | حوارات التأكيد. |

<!-- u 2a54888e0697 | 5 3. Verbs | heading -->
## 3. الأفعال

<!-- u d70d8aad531c | 5 3. Verbs | prose -->
يمكن للعنصر الذي يحمل `data-nac-role="action"` أن يحمل
`data-nac-action="<verb>"` ليسمي ما يفعله. والفعل معرف حر بصيغة
snake-case يُتفق عليه بين المضيف والوكيل. ومن الأفعال الشائعة:

<!-- u 746c48370f66 | 5 3. Verbs | prose -->
`save` و `cancel` و `submit` و `delete` و `edit` و `view` و `create`
و `approve` و `reject` و `send` و `download` و `upload` و `refresh`
و `expand` و `collapse` و `open` و `close` و `add_row` و `remove_row`.

<!-- u 956edf53a876 | 5 3. Verbs | prose -->
تحل `NAC.click_by_verb(plugin, verb)` الفعل إلى العنصر الوحيد من نوع
action تحت ذلك الملحق وتنقره. وأن تتشارك عدة عناصر action الفعل نفسه
تحت ملحق واحد خطأ في البيان (lint: `duplicate_verb`).

<!-- u 28e680935920 | 6 4. Manifest | heading -->
## 4. البيان

<!-- u 6b623deee5e0 | 6 4. Manifest | prose -->
يمكن لكل ملحق أن يسجل بيانا عبر:

<!-- u d0d1394734ea | 6 4. Manifest | prose -->
البيان هو مصدر الحقيقة الموجه إلى الوكيل. فوسيط نماذج لغة يقرر أن
"المستخدم قال 'guardar'" يراجع بيان الملحق، فيجد الفعل `save`، ثم يصدر
`NAC.click_by_verb('invoice', 'save')`.

<!-- u a6be4d566708 | 7 4.1 Required fields | heading -->
### 4.1 الحقول المطلوبة

<!-- u d190057894b0 | 7 4.1 Required fields | prose -->
- `plugin_slug` -- يطابق `data-nac-plugin` في العنصر المضيف.
- `nac_version` -- إصدار NAC3 الذي يدعي هذا البيان مطابقته. ويرفض زمن
  التشغيل البيانات التي تدعي إصدارا أعلى من إصداره.

<!-- u 58cac67a09e6 | 8 4.2 Optional fields | heading -->
### 4.2 الحقول الاختيارية

<!-- u 87ea0145c2ce | 8 4.2 Optional fields | prose -->
- `elements[]` -- فهرس العناصر المسماة. ويجب أن يحمل كل مدخل `id`
  و `role`.
- `tabs[]` -- مصفوفة مستقلة في المستوى الأعلى للتبويبات. وهي مكافئة
  لمداخل `elements[]` التي تحمل `role:'tab'`. والصيغتان صحيحتان.
- `fields[]` و `actions[]` و `kpis[]` و `data_tables[]` -- مجموعات
  فرعية مصنفة بالنوع؛ ولها معنى `elements[]` نفسه بعد التصفية بالدور.
  وتختار العروض التوضيحية الصيغة الأسهل قراءة على البشر.

<!-- u 3a8b6f4f8129 | 9 4.3 i18n | heading -->
### 4.3 i18n

<!-- u 6a665e6998c7 | 9 4.3 i18n | prose -->
يجب أن يغطي كل `label_i18n` كل لغات NAC3 العشر، وهي 10 لغات:

<!-- u fa9df7559758 | 9 4.3 i18n | prose -->
القيمة `i18n_strict: 'permissive'` في `NAC.autoRegister.watch()` تسمح
بتغطية جزئية خلال ترحيل نظام قائم؛ أما بيانات الإنتاج فينبغي أن تقدم
اللغات العشر كلها، أي 10 لغات.

<!-- u 672b32007192 | 10 4.3.1 What the ten locales are a requirement ON | heading -->
#### 4.3.1 على من يقع شرط اللغات العشر

<!-- u e01d2e357587 | 10 4.3.1 What the ten locales are a requirement ON | prose -->
الشرط أعلاه يقع على **بيان الجهة المتبنية**، أي على جدول
`label_i18n` الذي يقرأه الوكيل ليسمي عنصرا بلغة المستخدم. وهو **لا**
يقع على لغة هذا المستند، وليس في NAC3 ما يلزم أي تنفيذ بنشر وثائقه
بعشر لغات.

<!-- u 6345c3141c02 | 11 4.3.2 Normative language of this specification | heading -->
#### 4.3.2 اللغة المعيارية لهذه المواصفة

<!-- u 0496b01c0221 | 11 4.3.2 Normative language of this specification | prose -->
النص المعياري لـ NAC3 هو النص **الإنجليزي**: ملف `SPEC.md` في جذر
مستودع المواصفة، معروضا في
`https://yujin.app/nac-spec/SPEC.html`.

<!-- u 82cce4eb7161 | 11 4.3.2 Normative language of this specification | prose -->
تُنشر المواصفة كذلك على هيئة ترجمات آلية تحت
`i18n/<locale>/SPEC.md`. وتلك الترجمات **غير معيارية**. كل واحدة منها
جزئية، وكل واحدة مجمدة على مراجعة المصدر التي يعلنها إشعارها الخاص؛
والإشعار إلزامي، وأي ترجمة منشورة بلا إشعار فهي عيب في النشر لا في
الترجمة. وحيث تختلف الترجمة عن النص الإنجليزي فالنص الإنجليزي هو
الحاكم، وأي دعوى مطابقة هي دعوى في مواجهة النص الإنجليزي.

<!-- u a168e1e445ba | 12 5. Public API | heading -->
## 5. الواجهة البرمجية العامة

<!-- u e99a6820076b | 13 5.1 Imperative | heading -->
### 5.1 الصيغة الآمرة

<!-- u 935555476ddb | 14 5.1.1 Conformance helper (v2.2) | heading -->
### 5.1.1 معين المطابقة (v2.2)

<!-- u 61773eab5781 | 14 5.1.1 Conformance helper (v2.2) | prose -->
الدالة `NAC.bindAction(el, handler, ctx)` هي الطريقة المطابقة
للمواصفة لتوصيل معالج نقر. وهي تصدر `nac:action:succeeded` (أو
`:failed`) تلقائيا بعد تنفيذ المعالج (متزامنا أو برمي استثناء أو
بوعد). وتعيد دالة لفك الارتباط. استخدمها بدلا من
`addEventListener('click', ...)` المجرد حيثما يدعم المضيف ذلك؛ وما زال
الكود القائم قادرا على إصدار الحدث يدويا كما كان.

<!-- u f3cb221e90bf | 15 5.1.3 Field editor (v2.3) | heading -->
### 5.1.3 محرر الحقول (v2.3)

<!-- u d53a2b25eb60 | 15 5.1.3 Field editor (v2.3) | prose -->
تفتح `NAC.edit_field(nac_id)` نافذة طارئة تتيح لشخص (أو لوكيل ينوب
عنه) تحرير أي حقل نصي بأدوات على طريقة معالجات النصوص:

<!-- u 7bdd9e99f71e | 15 5.1.3 Field editor (v2.3) | prose -->
تسجل هذه النافذة نفسها تحت `plugin_slug='nac_editor'` بالأفعال التالية
القابلة للنداء من NAC3:

<!-- u 223097f9e322 | 15 5.1.3 Field editor (v2.3) | prose -->
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

<!-- u 9b5784a95c17 | 15 5.1.3 Field editor (v2.3) | prose -->
مفتاح Esc يغلق (إلغاء). و Ctrl/Cmd+Enter يحفظ. والنقر على خلفية الطبقة
يلغي.

<!-- u 4a9ebc2b57dd | 15 5.1.3 Field editor (v2.3) | prose -->
سيضبط القسم 13 من المواصفة هذا العقد رسميا في v2.3؛ وزمن تشغيل v2.2
يقدم تنفيذا مرجعيا عاملا حتى تستطيع الجهات المتبنية توصيله اليوم.
وهو متاح على أي حقل عبر:

<!-- u 8aff4d81ab57 | 16 5.1.4 Action payload + invoke (v2.3) | heading -->
### 5.1.4 حمولة الفعل + invoke (v2.3)

<!-- u 8dbd703fb6af | 16 5.1.4 Action payload + invoke (v2.3) | prose -->
أفعال NAC v2.2 من نوع انقر وانطلق: يطلق الوكيل `NAC.click(id)` أو
`NAC.click_by_verb(plugin, verb)` فيفعل المضيف ما يفعله. وهذا يصلح
لأفعال الفعل والحالة (`save` و `cancel` و `submit` و `delete`) لكنه
ينهار عندما يحتاج الفعل إلى **بيانات** من الوكيل -- `utter(text)`
و `search(query)` و `send_message(body)` و `upload(file)`
و `schedule(date)` و `translate(text, target_lang)`. فليس لدى المضيف
طريقة لاستلام حمولة الوكيل عبر نقرة مصنوعة.

<!-- u 121175aff245 | 16 5.1.4 Action payload + invoke (v2.3) | prose -->
الإصدار v2.3 يسد هذه الثغرة. والعقد تراكمي: أفعال النقر تبقى عاملة كما
هي دون تغيير.

<!-- u 1e70a9ba51ec | 16 5.1.4 Action payload + invoke (v2.3) | prose -->
ترسل `NAC.invoke` حدثا من نوع `CustomEvent` باسم
`nac:action:requested` على العنصر المضيف (ويصعد حتى document) يحمل:

<!-- u af505024f97e | 16 5.1.4 Action payload + invoke (v2.3) | prose -->
ينصت المضيف إلى `nac:action:requested`، ويعالج الحمولة، ثم يصدر
`nac:action:succeeded` (أو `nac:action:failed`) مع `request_id` نفسه
في التفصيل. ويربط زمن التشغيل بينهما بـ `request_id` ويحل وعد الوكيل.

<!-- u abc54909999b | 16 5.1.4 Action payload + invoke (v2.3) | prose -->
المهلة الافتراضية **30 ثانية** (مقابل 5 s للنقر). وتُغير بـ
`opts.timeout`. وعند انتهاء المهلة يُرفض الوعد بـ
`NacError('timeout', ...)`. وكما في النقر، انتهاء المهلة يعني فشلا
حقيقيا: ويجب على المنادي أن يعامله كذلك إلا إذا كان لديه دليل على
الأثر من قناة أخرى.

<!-- u f20ea060f5a1 | 16 5.1.4 Action payload + invoke (v2.3) | prose -->
الدالة `NAC.utter(id, opts)` اختصار مريح لأكثر الأفعال الحاملة للحمولة
شيوعا. وهي تكافئ:

<!-- u 494cdb0b8183 | 17 Manifest declaration | heading -->
#### الإعلان في البيان

<!-- u 237fe9674ed4 | 17 Manifest declaration | prose -->
الفعل الذي يحمل حمولة يعلن مخطط تلك الحمولة في مدخله في البيان، لأجل
إمكان التتبع ولأجل الأدوات:

<!-- u 6332c86c203d | 17 Manifest declaration | prose -->
الحقل `payload_schema` **إعلامي فقط حتى v2.5**، وزمن التشغيل المرجعي
لا يقرأه إطلاقا: فهو مقبول في البيان، ومحمول في `NAC.manifest()`، ولا
يُتحقق منه قط في مقابل أي شيء. والمفتاح `NAC.STRICT_VALIDATION` --
الذي تحولت قيمته الافتراضية فعلا إلى `true` في 2.3.0 -- يغطي نتائج
أدوار البيان و DOM فقط؛ ولم يغط الحمولات أبدا. لذا يجب ألا يفترض
الوكيل أن حمولة قد فُحصت لمجرد أن مخططا أُعلن: فالتحقق الوحيد الذي
يجري اليوم هو ما يفعله الوكيل بنفسه قبل الإرسال.

<!-- u 5f7dd2251b4c | 17 Manifest declaration | prose -->
المخططات بسيطة بقصد (مجموعة فرعية على شكل JSON-Schema) حتى يستطيع زمن
التشغيل التحقق دون أن يحمل معه مدقق JSON-Schema كاملا، وهذا يبقى قصد
التصميم ليوم يُفرض فيه الالتزام.

<!-- u 5ca132eea4a7 | 17 Manifest declaration | prose -->
وعدت مراجعة سابقة من هذا القسم بأن يُضبط نحو المخطط رسميا في إصدار
2.4 وأن يصبح الفرض هو الافتراضي. **ولم يحدث ذلك في 2.4 ولم يحدث حتى
2.5.** وقد حُذفت تلك الجملة بدل أن يُجدد تاريخها: فالوعد الملتصق برقم
إصدار، إذا بقي قائما بعد ذلك الإصدار، يقرؤه الوكيل كقدرة يمكنه
الاعتماد عليها. وضبط النحو رسميا وتوصيل الفرض مسجلان كسؤال مفتوح في
القسم 13، وهناك يظهران مفتوحين وبلا تاريخ.

<!-- u a8a904fe4f7c | 18 Disabled-state semantics (v2.3 hotfix from alpha.2) | heading -->
#### دلالة الحالة المعطلة (إصلاح عاجل في v2.3 جاء من alpha.2)

<!-- u 1c4abe1b856c | 18 Disabled-state semantics (v2.3 hotfix from alpha.2) | prose -->
لا ترفض `NAC.invoke` عندما يكون العنصر الهدف يحمل `disabled` أو
`aria-disabled='true'`. فسمة HTML المسماة `disabled` حاجز نقر على
مستوى الواجهة؛ أما `invoke` فطلب منطقي يحمل حمولة، وليس نقرة مصنوعة.
والمضيفون الذين يحتاجون إلى رفض invoke بناء على حالة الواجهة يجب أن
يفعلوا ذلك في منصتهم على `nac:action:requested`، وأن يصدروا
`nac:action:failed` مع رمز خطأ ذي معنى.

<!-- u 6840d6a4d6c1 | 18 Disabled-state semantics (v2.3 hotfix from alpha.2) | prose -->
في المقابل، ما زالت `NAC.click` ترفض على العناصر المعطلة (فدلالة النقر
محفوظة). وتغطية الاختبار: `runtime/test/v23-invoke.mjs` T7/T8/T9.

<!-- u 81d52460e217 | 19 Conformance: hosts that support invoke MUST | heading -->
#### المطابقة: على المضيفين الذين يدعمون invoke أن

<!-- u 55f1c3270fad | 19 Conformance: hosts that support invoke MUST | prose -->
1. يعلنوا `actions[].payload_schema` في مدخل البيان.
2. ينصتوا إلى `nac:action:requested` (أو يستخدموا منصتا عاما يصفي
   بـ `detail.action_id` + `detail.verb`).
3. يصدروا `nac:action:succeeded` -- مع إرجاع `detail.request_id` كما
   هو -- بعد المعالجة، أو `nac:action:failed` (مع الرمز في
   `detail.error`) عند الفشل.
4. لا يصدروا أبدا حدث `:succeeded` بـ `request_id` لم يستلموه (هذا
   يمنع التشابك بين النداءات المتزامنة).

<!-- u baa88e13de62 | 19 Conformance: hosts that support invoke MUST | prose -->
المضيفون الذين **لا** يدعمون invoke يواصلون العمل بصورة طبيعية تحت
`NAC.click()` و `NAC.click_by_verb()`. والوكلاء الذين ينادون
`NAC.invoke()` على مضيف بلا مدخل `actions[].payload_schema` سيستلمون
`request_id` على أي حال، لكن زمن التشغيل لا يستطيع ضمان التسليم؛
وتنتهي المهلة بعد 30 s.

<!-- u eeaad94068b6 | 20 Why this matters | heading -->
#### لماذا يهم هذا

<!-- u 282e3ea6a073 | 20 Why this matters | prose -->
يكف سطح الوكالة الكامل عن أن يكون "قائمة أزرار" ويصبح "قائمة أزرار +
مدخلات مبنية". فإعلان صوتي يصبح قابلا للنداء بـ NAC.invoke. وشريط بحث
يصبح قابلا للنداء بـ NAC.invoke. ورفع ملف يصبح قابلا للنداء بـ
NAC.invoke. البروتوكول نفسه، والمنشأ نفسه، ودلالة الإقرار نفسها.

<!-- u 828f3eb13a49 | 20 Why this matters | prose -->
أول جهة مرجعية متبنية هي **Atlas Pro**: فعنصرها `atlas_pro_ad.mic`
يعلن الفعلين كليهما، `listen` (نقر فقط، وهو القائم أصلا) و `utter`
(الحامل للحمولة). وتقود الحالة نفسها حلقة المحادثة
`/parse` + `/tts` في كلتا الحالتين؛ فالوكلاء الذين يملكون تحويل الكلام
إلى نص ينادون `listen`، والذين يملكون نموذج لغة خاصا بهم ينادون
`utter`.

<!-- u 3e2476dc9b6d | 21 Forward modalities (anticipated, no spec change require | heading -->
#### أنماط قادمة (متوقعة، ولا تحتاج تغييرا في المواصفة)

<!-- u 96e747f48094 | 21 Forward modalities (anticipated, no spec change require | prose -->
الفعل `invoke` محايد تجاه النمط بقصد، حتى تتصل عائلات الإدخال القادمة
دون كسر العقد:

<!-- u 7b40b2227261 | 21 Forward modalities (anticipated, no spec change require | prose -->
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

<!-- u 93d49eb65964 | 21 Forward modalities (anticipated, no spec change require | prose -->
يتبع كل نمط بروتوكول الأحداث نفسه `nac:action:requested` ->
`nac:action:succeeded` / `:failed`، والربط نفسه بـ `request_id`،
ودلالة المهلة نفسها. ويبقى زمن التشغيل صغيرا؛ أما معجم الأفعال فينمو
بالاتفاق بين المضيفين والوكلاء. والاختصارات المريحة (`NAC.utter`
و `NAC.search` و `NAC.watch` وغيرها) يمكن إضافتها لاحقا بلا إعادة ضبط
للمواصفة، لأن كل واحد منها غلاف رقيق فوق `invoke`.

<!-- u 0b074c9e1737 | 22 5.1.5 Shadow DOM resolution -- open roots (v2.3) | heading -->
### 5.1.5 الحل في shadow DOM -- الجذور المفتوحة (v2.3)

<!-- u 1636464273f9 | 22 5.1.5 Shadow DOM resolution -- open roots (v2.3) | prose -->
يحل زمن التشغيل إحالات `data-nac-id` عبر جذور shadow المفتوحة بصورة
متداخلة. وتستطيع الصفحة أن تركب Web Components بـ
`attachShadow({mode:'open'})`، وتضع سمات `data-nac-*` على عناصر داخل
شجرة shadow، فيحل أي منادي من NAC3 (`NAC.click` و `NAC.fill`
و `NAC.invoke` وغيرها) الهدف بشفافية.

<!-- u b3a1385f2a5d | 23 Resolution algorithm | heading -->
#### خوارزمية الحل

<!-- u 9b00de664df3 | 23 Resolution algorithm | prose -->
لمنتقي `S` (وهو عادة `[data-nac-id="..."]`) في مقابل جذر `R` (وهو
عادة `document`):

<!-- u 5f20e7f1e3d3 | 23 Resolution algorithm | prose -->
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

<!-- u bde7cd44c2f1 | 24 Event propagation | heading -->
#### انتشار الأحداث

<!-- u 872114c02287 | 24 Event propagation | prose -->
الأحداث التي يصدرها المضيفون داخل جذور shadow يجب أن تضبط
`composed: true` حتى تستلمها المنصتات على مستوى المستند. وزمن تشغيل
NAC3 يصدر أحداثه كلها بـ `composed:true` أصلا؛ وكود المضيف الذي يصدر
أحداث `nac:*` يدويا مسؤول عن الشيء نفسه. فبلا `composed:true` يتوقف
الحدث عند حد shadow، ولا ترى آلية الربط في زمن التشغيل ذلك الحدث
أبدا.

<!-- u 4fd85059ee08 | 25 Author responsibility | heading -->
#### مسؤولية كاتب المكون

<!-- u fa8b14bc2a42 | 25 Author responsibility | prose -->
على كاتب المكون أن:

<!-- u 29626dc95548 | 25 Author responsibility | prose -->
1. يضع `data-nac-id` و `data-nac-role` و `data-nac-action` على
   العناصر القابلة للتشغيل داخل جذر shadow.
2. يضبط `composed:true` على أي حدث خاص يصدره المضيف للإشارة إلى عقد
   من NAC3 (`nac:action:succeeded` و `nac:field:changed` وغيرها).
3. يتجنب `<slot>` للعناصر التي يلزم أن تبقى معزولة في shadow -- فالعقد
   الموضوعة في slot تعيش في light DOM وتُحل هناك.

<!-- u 818fc31bb7f1 | 25 Author responsibility | prose -->
جذور shadow المفتوحة لا تحتاج أي تلميح في البيان ولا أي تمكين في زمن
التشغيل؛ فالحل يجري تلقائيا.

<!-- u 465f7ae635af | 26 Reference implementation | heading -->
#### التنفيذ المرجعي

<!-- u 2a8c8ecad562 | 26 Reference implementation | prose -->
يعرض زمن التشغيل المرجعي معينين داخليين،
`_deepQuery(selector, root)` و `_deepQueryAll(selector, root)`، وهما
من ينفذ المسح. أما المعينات العامة `NAC.click` و `NAC.fill`
و `NAC.invoke` و `NAC.describe` وغيرها فتمر كلها عبر النسختين
العميقتين.

<!-- u cce9bcee3ad4 | 27 Demos and tests | heading -->
#### عروض واختبارات

<!-- u 3d3ef999b0ae | 27 Demos and tests | prose -->
- `example-v23-shadow-open.php` -- عروض shadow مفتوح معشش على 1 و 2
  و 3 مستويات.
- `runtime/test/v23-shadow.mjs` T1-T3 و T10 -- تغطية وحدات تشمل حد
  العمق.

<!-- u 27cadaa47199 | 28 5.1.6 Shadow DOM resolution -- closed roots, voluntary  | heading -->
### 5.1.6 الحل في shadow DOM -- الجذور المغلقة والكشف الطوعي (v2.3)

<!-- u e1bdc1f1cb70 | 28 5.1.6 Shadow DOM resolution -- closed roots, voluntary  | prose -->
جذور shadow المغلقة (`attachShadow({mode:'closed'})`) معتمة من خارج
كود كاتب المكون -- وهذا حد أمني من المتصفح، لا قرار من NAC3. ولا
يستطيع NAC3 الوصول إلى الداخل إلا إذا كشف كاتب المكون طوعا سطحا قابلا
للاستعلام عبر العقد التالي.

<!-- u cc5e4a5b830e | 29 The `el.nac3` interface contract | heading -->
#### عقد الواجهة `el.nac3`

<!-- u 76ac0cb03f1e | 29 The `el.nac3` interface contract | prose -->
يمكن لعنصر مخصص أن يعرض كائن واجهة على مضيفه عبر جالب اسمه `nac3`:

<!-- u 9d8b08a63d0f | 29 The `el.nac3` interface contract | prose -->
تشارك المكونات بتنفيذ ذلك الجالب. أما المكونات التي **لا** تشارك فتبقى
بعيدة عن متناول منادي NAC3 (فتبقى أحشاؤها خاصة، كما يريد المتصفح).

<!-- u d267ac2618bd | 30 Resolution semantics | heading -->
#### دلالة الحل

<!-- u d5f238d3820d | 30 Resolution semantics | prose -->
خلال `_deepQuery(selector)`، ولكل عنصر مزار `el` يكون فيه
`el.shadowRoot === null`:

<!-- u 3955816b33aa | 30 Resolution semantics | prose -->
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

<!-- u 75f86a587f3d | 31 Error event detail shapes | heading -->
#### أشكال تفصيل أحداث الخطأ

<!-- u d89cbc6658d3 | 31 Error event detail shapes | prose -->
تفصيل `nac:shadow_blocked`:

<!-- u c01abbbc2bac | 31 Error event detail shapes | prose -->
تفصيل `nac:shadow_protocol_violation`:

<!-- u cdc7ee5d5dc1 | 31 Error event detail shapes | prose -->
كلا الحدثين يصعد (`bubbles: true`) ويعبر حدود shadow
(`composed: true`). وإزالة التكرار تجري لكل مضيف على حدة، عبر WeakSet
يحفظه زمن التشغيل؛ فالمضيف الواحد يصدر كل حدث **مرة واحدة على الأكثر
في كل تحميل للصفحة**.

<!-- u 5fd63d2eb19d | 32 Why voluntary | heading -->
#### لماذا هو طوعي

<!-- u 64413da3b9b6 | 32 Why voluntary | prose -->
عتامة shadow المغلق يفرضها المتصفح. ولو عرف NAC3 آلية غير طوعية لمنعها
المتصفح. والكشف الطوعي يترك لكاتب المكون السيطرة الكاملة على شكل سطحه
العام في عين الوكلاء.

<!-- u 374ef204681b | 32 Why voluntary | prose -->
الثمن هو مشاركة مكون بمكون؛ والفائدة أن الوكلاء المطابقين لـ NAC3
يعملون مع أنظمة تصميم فيها مكونات shadow مغلقة (Salesforce Lightning،
وبعض مكونات GitHub Primer، وعناصر حساسة أمنيا) دون كود محول لكل مكون.

<!-- u 08aa8d40de06 | 33 Demos and tests | prose -->
- `example-v23-shadow-closed.php` -- الحالة الموجبة
  (`<todo-card-closed-exposed>`) والحالة السالبة
  (`<todo-card-closed-blind>`) جنبا إلى جنب، مع لوحات حكم + سجل أحداث
  حي.
- `runtime/test/v23-shadow.mjs` T4-T9 -- تغطية وحدات لكل عائلة من
  أحداث الخطأ، مع دلالة إزالة التكرار.
- `guides/SHADOW_DOM_CLOSED.md` -- دليل للكاتب.

<!-- u 230b5b4555fa | 34 5.1.7 Auth-aware capabilities (v2.3) | heading -->
### 5.1.7 القدرات الواعية بالتخويل (v2.3)

<!-- u eb36568e63b4 | 34 5.1.7 Auth-aware capabilities (v2.3) | prose -->
يتيح NAC3 v2.3 للبيان أن يعلن، لكل فعل، القدرات المطلوبة، ويوقف بذلك
`NAC.click` و `NAC.invoke` قبل الإرسال. فيستلم الوكيل رفضا سريعا
(`code='capability_required'`) بدل رحلة ذهاب وعودة تفشل عند الخادم.

<!-- u 3394e13a69f2 | 35 Manifest declaration | prose -->
شرط القدرة يتعلق على مستوى العنصر أو على مستوى الفعل. وإن وُجد
المستويان فالغلبة لمستوى الفعل.

<!-- u ed181c92022d | 35 Manifest declaration | prose -->
ولدلالة "و" المنطقية ("يحتاج المستخدم إلى كل هذه القدرات")، أعلن كل
واحدة عبر أفعال موقوفة منفصلة، أو ركب الأمر عند المضيف في المنصت على
`nac:action:requested`.

<!-- u 41895cfbb955 | 36 Public API | heading -->
#### الواجهة البرمجية العامة

<!-- u 5c22e765201e | 36 Public API | prose -->
الدالة `setCapabilities` تبدل المجموعة كلها (استخدمها عند الدخول أو
تجديد الجلسة). و `grantCapability` / `revokeCapability` تعملان
بالزيادة والنقص. و `userCapabilities` ترجع مصفوفة بلقطة عن الحالة.
و `setCapabilities(null)` تفرغ المجموعة.

<!-- u 519e43ca0c04 | 36 Public API | prose -->
ينادي المضيفون هذه الدوال كلما تغير دور المستخدم. والمجموعة تعيش في
زمن التشغيل؛ ولا حاجة إلى إعادة تحميل أي بيان.

<!-- u 4147b564fd7d | 37 Gate semantics | heading -->
#### دلالة البوابة

<!-- u b7a3a617e58d | 37 Gate semantics | prose -->
قبل الإرسال، تبحث `NAC.click(id)` و `NAC.invoke(id, payload)` عن مدخل
البيان المطابق (العنصر + الفعل)، وتقرأ `requires_capability`، وتنادي
`_hasCapability`:

<!-- u 55539817baee | 37 Gate semantics | prose -->
- لا شرط معلن -> اسمح.
- شرط معلن والمجموعة الحالية تحققه -> اسمح.
- شرط معلن والمجموعة الحالية **لا** تحققه -> ارفض بـ
  `NacError('capability_required', ...)` وأصدر
  `nac:command:rejected` مع
  `detail.reason='capability_required'`.

<!-- u 61bc21f3c289 | 37 Gate semantics | prose -->
تعمل البوابة في `click` **بعد** فحوص `not_found` / `disabled` /
`hidden`، حتى يظهر أدق فشل على السطح. أما في `invoke` فتعمل البوابة
قبل انطلاق حدث الطلب (فلا يرى المضيف محاولة غير مخولة أبدا).

<!-- u 03badbc3eb0d | 38 Why this matters | prose -->
بلا البوابة، الوكيل الذي ينادي `NAC.click('finance.delete')` إما ينجح
(ولا بوابة تخويل أصلا -> ثقب أمني) وإما يفشل عند الخادم برمز 403 بعد
عدة ثوان. ومع البوابة يعرف الوكيل تزامنيا أن القدرة ناقصة لديه،
فيستجيب كما يجب (يطلب مسارا آخر، أو يطلب رفع الصلاحية، أو يعرض القيد
على المستخدم).

<!-- u e2ef7786fa19 | 38 Why this matters | prose -->
هذا يكمل التخويل عند الخادم -- ولا يحل مكانه. ويجب على المضيفين أن
يواصلوا فرض الصلاحيات على الخادم. فبوابة العميل تحسين لتجربة الاستخدام
وإشارة على مستوى القصد، وليست حدا أمنيا.

<!-- u cda6b9e803c0 | 39 Demos and tests | prose -->
- `runtime/test/v23-capabilities.mjs` -- 17 تأكيدا تغطي ضبط المجموعة
  وقراءتها، والمنح والسحب، وبوابة النقر، وبوابة invoke، والحل بين
  مستوى الفعل ومستوى العنصر، ودلالة "أو" المنطقية، والإفراغ بـ null،
  ورفض المدخلات غير الصحيحة، وانحدار الأفعال بلا بوابة.

<!-- u 79530c72b823 | 40 5.1.2 Strict validation flag (v2.2; default-flipped in  | heading -->
### 5.1.2 راية التحقق الصارم (v2.2؛ قُلبت قيمتها الافتراضية في v2.3)

<!-- u 7206e583b3eb | 40 5.1.2 Strict validation flag (v2.2; default-flipped in  | prose -->
المفتاح `NAC.STRICT_VALIDATION` (منطقي). فحين يكون `true` ترمي
`NAC.register()` خطأ `Error` يحمل `code='strict_validation'` ومصفوفة
`findings` في أي من هذه الحالات:

<!-- u 1f68e4a109ee | 40 5.1.2 Strict validation flag (v2.2; default-flipped in  | prose -->
- `manifest_role_unknown` -- دور المدخل خارج المجموعة المعيارية.
- `tab_id_manifest_role_drift` -- المعرف يطابق `^tab\.` لكن الدور ليس
  `'tab'`.
- `manifest_dom_role_mismatch` -- سمة `data-nac-role` للعنصر المركب في
  DOM تختلف عن دور مدخل البيان.

<!-- u c981b4852469 | 40 5.1.2 Strict validation flag (v2.2; default-flipped in  | prose -->
**القيمة الافتراضية:**

<!-- u 1aa996774f91 | 40 5.1.2 Strict validation flag (v2.2; default-flipped in  | prose -->
- **v2.2.x:** `false` (تحذير فقط). فالجهات المتبنية كانت تحتاج مهلة
  ترحيل.
- **v2.3.x:** **`true`** (ترمي). أُغلقت مهلة الترحيل مع خط v2.2. ومن
  يتبنى ببيانات مثقلة بالانحراف يخرج من ذلك بضبط
  `NAC.STRICT_VALIDATION = false` **قبل** أي نداء لـ `register()`.
- **v3.0:** تُحذف الراية (فالصارم هو النمط الوحيد).

<!-- u cf1e1b799422 | 40 5.1.2 Strict validation flag (v2.2; default-flipped in  | prose -->
انظر `guides/MIGRATION_v2.2_to_v2.3.md` لطريقة تنظيف نتائج الانحراف.

<!-- u cdd2e2a2034f | 40 5.1.2 Strict validation flag (v2.2; default-flipped in  | prose -->
كل الطرق غير المتزامنة ترفض بـ `NacError` يكون `code` فيه واحدا من
هذه:

<!-- u 7cdfcbe3b161 | 40 5.1.2 Strict validation flag (v2.2; default-flipped in  | prose -->
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

<!-- u d50c9290e353 | 41 5.2 Introspection | heading -->
### 5.2 الاستبطان

<!-- u 68e75bf70e68 | 42 5.3 Data tables (since 2.1) | heading -->
### 5.3 جداول البيانات (منذ 2.1)

<!-- u e835e9440f25 | 42 5.3 Data tables (since 2.1) | prose -->
بدائيات جدول البيانات **ليست** جزءا من زمن التشغيل الأساسي
(`js/nac.js` / ملف `nac.mjs` في `@nac3/runtime`). فهي تأتي في وحدة
الامتدادات الخاصة بالأنظمة القائمة `js/nac-v2-extensions.js` (منشورة
كـ `@nac3/runtime/extensions`)، وهي تعلقها على كائن `window.NAC` نفسه
بعد أن تُحمَّل. فحمّل وحدة الامتدادات بعد زمن التشغيل الأساسي لتحصل على
سطح `dt_*`:

<!-- u 1702f2abb7ea | 42 5.3 Data tables (since 2.1) | prose -->
الطرق أدناه موجودة فقط حين تكون وحدة الامتدادات محمّلة؛ ومناداتها على
زمن تشغيل فيه الأساس وحده لا تفعل شيئا / ترجع `undefined`.

<!-- u ebe9fa027ecd | 42 5.3 Data tables (since 2.1) | prose -->
لكل جدول بيانات حقل `subkind`:

<!-- u 731086aa49b1 | 42 5.3 Data tables (since 2.1) | prose -->
- `collection` -- صفوف مرتبة، مع تثبيت معاملاتي اختياري. تُستخدم لبنود
  الفاتورة، وعناصر سلة الشراء، ومداخل السجل.
- `matrix` -- شبكة صف x عمود تحمل كل خلية فيها قيمة. تُستخدم لمصفوفات
  الصلاحيات، وجداول المواعيد.
- `matrix-singletree` -- مصفوفة ينطوي فيها كل صف إلى شجرة (وهي نادرة).

<!-- u bf57d7617b5a | 43 5.4 Strict resolution + disambiguation (v2.4) | heading -->
### 5.4 الحل الصارم + إزالة الالتباس (v2.4)

<!-- u 5ce8d66447ea | 43 5.4 Strict resolution + disambiguation (v2.4) | prose -->
يجعل NAC3 v2.4 حل المعرف والفعل والمخصص والتسمية **صارما**. فالأفعال
التي تحل طلبا إلى عنصر DOM واحد -- `click_by_verb` و `tab` (الصيغة
بوسيط واحد) و `tab_by_label` -- لم تعد تخمن. فحين يُحل طلب إلى صفر
مرشحين أو إلى أكثر من مرشح واحد، يرمي زمن التشغيل خطأ `NacError`
يحمل قائمة المرشحين ويصدر كذلك حدث
`nac:disambiguation_requested`، بدل الإرسال الصامت إلى أول شبيه.

<!-- u 1360c72f2adf | 43 5.4 Strict resolution + disambiguation (v2.4) | prose -->
هذا هو ثابت **صفر ضرر صامت**. وهو موجود من أجل البرمجيات المساعدة
والوكلاء المنادين، حيث يكون الإرسال الصامت إلى العنصر الخاطئ بلا طريق
للتعافي عائقا أمنيا. أما السلوك المتسامح قبل 2.4 -- احتياط بـ
`indexOf` على سلسلة جزئية كان يحل إلى أول شبيه -- فقد أُزيل.

<!-- u 61c212ab5c75 | 43 5.4 Strict resolution + disambiguation (v2.4) | prose -->
> التوافق مع الماضي: الإصدار v2.4 تغيير في *سلوك العقد*. فمسارات الكود
> التي كانت تمرر وسائط بلا التباس تبقى عاملة كما هي. أما مسارات الكود
> التي اتكلت على احتياط `indexOf` المتسامح للحل إلى أول شبيه فسترمي
> الآن استثناء -- وهذا مقصود.

<!-- u 9ded25436c09 | 44 5.4.1 Strict qualifier matching (`click_by_verb`) | heading -->
#### 5.4.1 المطابقة الصارمة للمخصص (`click_by_verb`)

<!-- u 03e301b58109 | 44 5.4.1 Strict qualifier matching (`click_by_verb`) | prose -->
تختار `click_by_verb(plugin, verb, opts?)` من بين عقد DOM التي تتشارك
`data-nac-action="<verb>"`. وحين يُمرر `opts.qualifier` (وهو نص)،
يطابق العنصر **فقط** إذا كان `data-nac-id` فيه يحقق:

<!-- u 3c202d4daa0e | 44 5.4.1 Strict qualifier matching (`click_by_verb`) | prose -->
أي: تساوي المعرف تماما، أو لاحقة مرساة بعد الفاصل `__`. **ولا يوجد أي
احتياط بالسلسلة الجزئية.** فالمخصص الذي هو مجرد سلسلة جزئية من معرف
(غير مساو، وليس `__suffix` مرساة) **لا** يطابق.

<!-- u a814e14491fc | 44 5.4.1 Strict qualifier matching (`click_by_verb`) | prose -->
- 0 مطابقة -> ترمي `NacError('no_matching_instance', ...)`.
- مطابقة واحدة بالضبط، أي 1 -> تحل وتنقر.
- أكثر من 1 -> ترمي `NacError('ambiguous_qualifier', ...)`.

<!-- u 4218e75d95da | 44 5.4.1 Strict qualifier matching (`click_by_verb`) | prose -->
الخيار `opts.qualifier_ordinal` (وهو رقم) يختار بالموضع من بين كل
عناصر DOM التي تتشارك الفعل، متجاوزا مطابقة المخصص.

<!-- u d62dc6b56ca3 | 45 5.4.2 Strict id resolution (`tab`) | heading -->
#### 5.4.2 الحل الصارم للمعرف (`tab`)

<!-- u 1a464a4756f3 | 45 5.4.2 Strict id resolution (`tab`) | prose -->
صيغة الوسيط الواحد من `tab(plugin, id)`: تفوز المطابقة التامة لـ
`data-nac-id` في DOM. وإلا فإن زمن التشغيل يبحث عن النسخ التي يبدأ
معرفها بـ `id + "__"`:

<!-- u 2cae0a8b088f | 45 5.4.2 Strict id resolution (`tab`) | prose -->
- 0 نسخة مخصصة ولا معرف مطابق تماما -> `no_matching_instance`.
- واحدة بالضبط، أي 1 -> تُحل.
- أكثر من 1 -> `ambiguous_tab` (مرر المعرف المخصص كاملا).

<!-- u 9dd62e535c05 | 46 5.4.3 Strict label resolution (`tab_by_label`) | heading -->
#### 5.4.3 الحل الصارم بالتسمية (`tab_by_label`)

<!-- u 6bd19a3dd928 | 46 5.4.3 Strict label resolution (`tab_by_label`) | prose -->
تحل `tab_by_label(plugin, label)` تسمية يقرؤها البشر إلى تبويب، وتجرب
بهذا الترتيب: مطابقة تامة لتسمية البيان، ثم مطابقة تقريبية أو بسلسلة
جزئية في البيان، ثم مطابقة تامة لنص DOM، ثم مطابقة تقريبية لنص DOM.
وإن أعطت أي طبقة أكثر من مطابقة واحدة رمت
`NacError('ambiguous_label', ...)`؛ وإن لم تطابق أي طبقة رمت
`NacError('not_found', ...)`. ويسجل حقل `reason` في الحدث المُصدر أي
طبقة كانت ملتبسة (`ambiguous_label_exact` أو
`ambiguous_label_fuzzy` أو `ambiguous_label_exact_dom` أو
`ambiguous_label_fuzzy_dom` أو `no_matching_label`).

<!-- u 4da1ef43f342 | 47 5.4.4 Error codes | heading -->
#### 5.4.4 رموز الأخطاء

<!-- u b30b09fb4fb9 | 47 5.4.4 Error codes | prose -->
| `err.code` | من يرميه | المعنى |
|------------|-----------|---------|
| `no_matching_instance` | `click_by_verb` (المخصص) و `tab` | لا عنصر يطابق المخصص / المعرف |
| `ambiguous_qualifier`  | `click_by_verb` | أكثر من 1 عنصر يطابق المخصص |
| `ambiguous_tab`        | `tab`           | أكثر من 1 نسخة مخصصة من `id__` تطابق |
| `ambiguous_label`      | `tab_by_label`  | أكثر من 1 تبويب يطابق التسمية (في أي طبقة) |
| `not_found`            | `tab_by_label`  | لا تبويب يطابق التسمية إطلاقا |

<!-- u 2eacef367ba7 | 48 5.4.5 The `err.candidates` shape | heading -->
#### 5.4.5 شكل `err.candidates`

<!-- u d9e50d2513fb | 48 5.4.5 The `err.candidates` shape | prose -->
كل خطأ التباس يحمل مصفوفة `candidates`. وكل مرشح هو بالضبط:

<!-- u bc9f0faf0ccb | 48 5.4.5 The `err.candidates` shape | prose -->
الحقل `nac_id` هو `data-nac-id` للعنصر. أما `label` فيُحل بتفضيل
`aria-label` أولا، ثم `textContent` بعد تشذيبه (مقطوعا عند 120 حرفا)،
ثم بالرجوع إلى `data-nac-id`. والقائمة متحققة في مقابل DOM -- فهي تسمي
العناصر الحقيقية التي يستطيع المنادي أن يختار منها. ويدمج `NacError`
الحقل `candidates` في الخطأ `Error` المرمي، فتكون `err.code`
و `err.message` و `err.candidates` كلها مملوءة.

<!-- u 652f14fc6baa | 49 5.4.6 The `nac:disambiguation_requested` event | heading -->
#### 5.4.6 الحدث `nac:disambiguation_requested`

<!-- u 595fd49c77a0 | 49 5.4.6 The `nac:disambiguation_requested` event | prose -->
كلما فشل نداء حل صارم (لا مطابقة أو مطابقات كثيرة)، يرسل زمن التشغيل
حدث `CustomEvent` باسم `nac:disambiguation_requested` على `document`
*بالإضافة إلى* رمي الاستثناء. والإصدار على قدر الوسع: فإن فشل الإرسال
رمى زمن التشغيل على أي حال.

<!-- u e258631d1e18 | 50 5.4.7 How a caller disambiguates | heading -->
#### 5.4.7 كيف يزيل المنادي الالتباس

<!-- u 4277d2b1e5ff | 50 5.4.7 How a caller disambiguates | prose -->
بعد أن تصير قائمة المرشحين في يده (من `err.candidates` أو من
`event.detail.candidates`)، يختار المنادي واحدا ويعيد الإرسال بأي من
هذه الطرق:

<!-- u 874e8bd6dc4a | 50 5.4.7 How a caller disambiguates | prose -->
1. **المعرف `nac_id` كاملا** -- `NAC.click(candidate.nac_id)`. وهذا
   طريق التعافي المعياري: فالمرشح يحمل المعرف الدقيق أصلا.
2. **اللاحقة المرساة `__suffix`** -- مرر لاحقة النسخة الدقيقة كمخصص
   إلى `click_by_verb`.
3. **`opts.qualifier_ordinal`** -- اختيار بالموضع من بين العناصر التي
   تتشارك الفعل (بترتيب DOM).

<!-- u 830efd33c855 | 50 5.4.7 How a caller disambiguates | prose -->
المرجع المشغول بالكامل هو `example-v24-disambiguation.php`؛ ويغطي
العقد كل من `runtime/test/stage2-disambiguation.mjs` و
`runtime/test/stage7-strict-resolution.mjs`.

<!-- u 9a85added5a4 | 51 6. Events | heading -->
## 6. الأحداث

<!-- u 3a66eff18a73 | 51 6. Events | prose -->
كل فعل يصدر حدث إتمام حتميا. وتنتظر `NAC.click()` في زمن التشغيل ذلك
الحدث وتُحل عند انطلاقه.

<!-- u 97fd131e3759 | 51 6. Events | prose -->
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

<!-- u d6c1e7b3214b | 52 6.1 Event detail shape | heading -->
### 6.1 شكل تفصيل الحدث

<!-- u 963657156129 | 52 6.1 Event detail shape | prose -->
تفصيل كل حدث يحمل حقل المعرف المعياري، ومعه `plugin`:

<!-- u 1c1a163a8447 | 53 6.2 Emitting from a host handler | heading -->
### 6.2 الإصدار من معالج عند المضيف

<!-- u e16fdbe62bd6 | 53 6.2 Emitting from a host handler | prose -->
يجب على معالج النقر أن يصدر حدث النجاح المقابل بعد أثره المتزامن:

<!-- u 495a09517d94 | 53 6.2 Emitting from a host handler | prose -->
وإن كان العمل غير متزامن فأصدره بعد الحل. وإن فشل العمل فأصدر
`nac:action:failed` مع `{detail: {plugin, action_id,
error: <message>}}`.

<!-- u 6edbabccfab8 | 53 6.2 Emitting from a host handler | prose -->
سيوفر زمن تشغيل v2.2 الدالة `NAC.bindAction(el, handler, ctx)` التي
تغلف `addEventListener` وتصدر تلقائيا.

<!-- u 7160fc51611b | 54 6.3 Why not use the click event itself? | heading -->
### 6.3 لم لا نستخدم حدث النقر نفسه؟

<!-- u 1baa670f9949 | 54 6.3 Why not use the click event itself? | prose -->
حدث `click` في DOM ينطلق قبل أن يعمل المعالج. وعقد NAC3 يحتاج أن يعرف
متى **تم الأثر**، لا متى بدأ النقر. ومن هنا جاءت عائلة الأحداث
المستقلة.

<!-- u 8c146906a8b5 | 55 7. Provenance | heading -->
## 7. المنشأ

<!-- u cda1f0fe1033 | 56 7.1 isTrusted | heading -->
### 7.1 isTrusted

<!-- u ef353b56420d | 56 7.1 isTrusted | prose -->
القيمة `event.isTrusted` تكون `true` في النقرات التي يبدؤها شخص (فأرة
حقيقية، ضغطة مفتاح حقيقية، تنشيط من قارئ شاشة)، و `false` في النقرات
المصنوعة (`element.click()`، أو dispatchEvent على MouseEvent مبني
يدويا، أو الأتمتة).

<!-- u a62b76a788d4 | 56 7.1 isTrusted | prose -->
ويجب على NAC3 أن يظهر ذلك عبر `event.detail.is_trusted` في حدث
النجاح. والمضيفون الذين ينفذون أفعالا حساسة أمنيا (الدفع، الحذف) يمكن
أن يشترطوا `is_trusted === true` وأن يرفضوا النقرات المصنوعة. ويضم
العرض المرجعي `example-v20-full.php` زوج أزرار
(`v20_panel.istrusted_real` و `v20_panel.istrusted_fake`) يبين هذا
الفرق.

<!-- u 99edfdf1816d | 57 7.2 HMAC-signed manifests | heading -->
### 7.2 البيانات الموقعة بـ HMAC

<!-- u eaddcc19c68b | 57 7.2 HMAC-signed manifests | prose -->
يمكن للبيان أن يحمل كتلة `provenance`:

<!-- u a1e273bf09d9 | 57 7.2 HMAC-signed manifests | prose -->
يحسب زمن التشغيل قيمة HMAC المتوقعة على تسلسل ثابت للبيان (مستثنيا
التوقيع نفسه) ويرفض البيانات التي لا يطابق توقيعها. وتستخدمه
النشرات متعددة المستأجرين لمنع مستأجر من تقليد بيان مستأجر آخر.

<!-- u 42eadfcaf1d4 | 58 7.3 Threat model | heading -->
### 7.3 نموذج التهديد

<!-- u e7fda825444a | 58 7.3 Threat model | prose -->
انظر `SECURITY.md` لنموذج التهديد الكامل. والنسخة القصيرة:

<!-- u e1934c89ce6b | 58 7.3 Threat model | prose -->
- NAC3 لا يوثق **المستخدم**. فذلك عمل طبقة التوثيق عندك.
- NAC3 يوثق **البيان** (HMAC).
- NAC3 يميز النقرات الحقيقية من المصنوعة (isTrusted)، فيستطيع المضيف
  أن يرفض الثانية في الأفعال الحساسة.
- NAC3 لا يحمي من وكيل خبيث يعمل بصلاحية المستخدم. فمثل هذا الوكيل
  يستطيع كل ما يستطيعه المستخدم.

<!-- u 4f92477e8bbc | 59 8. Conformance levels | heading -->
## 8. مستويات المطابقة

<!-- u f5b96249fe7b | 59 8. Conformance levels | prose -->
يُكتب المستوى هكذا: **NAC3 Conformance Level 1** أو **2** أو **3**.
واسم المستوى ليس اسم البروتوكول: فيجب على أي مدقق أو تقرير أو دعوى
مطابقة أن يذكر المستوى بالمعرف
`nac3-conformance-level-<1|2|3>` المنشور في
`api/latest/levels.json`، ولا يذكره أبدا باسم معروض. ويسجل القسم 8.1
الأسماء التي كانت تحملها هذه المستويات قبل 2.5.0.

<!-- u d73a01bfbec7 | 59 8. Conformance levels | prose -->
تكون الصفحة عند **NAC3 Conformance Level 1** إذا:

<!-- u b8d1b21abef0 | 59 8. Conformance levels | prose -->
- كان كل عنصر قابل للنقر ينبغي للوكيل أن يستطيع تشغيله يحمل
  `data-nac-id` و `data-nac-role`.
- كان كل عنصر `data-nac-role="action"` يطلق `nac:action:succeeded`
  بعد أثره.
- سجلت الصفحة بيان ملحق واحدا على الأقل عبر `NAC.register()`.
- عملت `NAC.click(id)` لكل معرف معلن.

<!-- u 8fea90259550 | 59 8. Conformance levels | prose -->
وتكون الصفحة عند **NAC3 Conformance Level 2** إذا كانت فوق ذلك:

<!-- u 548ba93fb7d9 | 59 8. Conformance levels | prose -->
- تسجل مصفوفات `tabs[]` و `fields[]` و `actions[]` صراحة في بيانها
  (لا مستنبطة من DOM).
- تقدم `label_i18n` يغطي كل لغات NAC3 العشر، أي 10 لغات، لكل تسمية
  يراها المستخدم.
- تنفذ بدائيات v2.0 الخاصة بالأنظمة القائمة: شجرة النطاق، والالتقاط
  العابر، و autoRegister.watch.
- تنجح في `NAC.validate_global({probe: false})` بصفر نتائج من شدة
  `error`.

<!-- u f9a2abaf6fbe | 59 8. Conformance levels | prose -->
وتكون الصفحة عند **NAC3 Conformance Level 3** إذا كانت فوق ذلك:

<!-- u 31ae71ba8c81 | 59 8. Conformance levels | prose -->
- تحمل بيانات موقعة بـ HMAC.
- تميز `isTrusted` في الأفعال الحساسة أمنيا.
- تنجح في `NAC.validate_global({probe: true})` بصفر نتائج.

<!-- u c76a5cbd0d90 | 59 8. Conformance levels | prose -->
وسطر أوامر حزمة NPM (`npx nac3 validate <url>`) يبلغ عن أعلى مستوى
تبلغه الصفحة. (وتقدم الحزمة الملفين التنفيذيين `nac3` و `nac`؛
وكلاهما يصل إلى سطر الأوامر نفسه.)

<!-- u 45c18bc89776 | 60 8.1 Historical level names (v2.5) | heading -->
### 8.1 أسماء المستويات التاريخية (v2.5)

<!-- u e497f12e1675 | 60 8.1 Historical level names (v2.5) | prose -->
قبل 2.5.0 كانت المستويات الثلاثة تُكتب `NAC-1` و `NAC-2` و `NAC-3`.
وتلك الأسماء تبعد شرطة واحدة عن اسم البروتوكول `NAC3`، فلم يكن يمكن
تمييز "هذه الصفحة مطابقة لـ NAC-3" من "هذه الصفحة تنفذ NAC3"، ولم يكن
عند الوكيل الذي يُطلب منه الإبلاغ عن مستوى أي نص بلا التباس يبلغ به.

<!-- u 4da6a2838062 | 60 8.1 Historical level names (v2.5) | prose -->
وتبقى الأسماء القديمة مقروءة كأسماء بديلة تاريخية: فملف
`api/latest/levels.json` ينشر كل اسم منها كـ `legacy_display_name`
بجانب المستوى الذي كان يخصه، حتى يبقى ممكنا رد مستند كُتب قبل 2.5.0
إلى مستوى. وهي **ليست** معيارية. أما النص الجديد وخرج المدققين ودعاوى
المطابقة فتستخدم رقم المستوى أو المعرف المنشور.

<!-- u 25cf5f341851 | 61 9. Versioning | heading -->
## 9. ترقيم الإصدارات

<!-- u f434370102cd | 61 9. Versioning | prose -->
يتبع NAC3 نظام semver:

<!-- u 21961e924493 | 61 9. Versioning | prose -->
- رفع **رئيسي**: تغيير كاسر في الواجهة البرمجية العامة أو في صيغ
  النقل. وعلى الجهات المتبنية أن تعدل الكود.
- رفع **ثانوي**: ميزات جديدة متوافقة مع الماضي. والكود القديم يبقى
  عاملا.
- رفع **ترقيعي**: إصلاح عيوب، أو تغييرات في الوثائق فقط.

<!-- u 354961fe88c7 | 61 9. Versioning | prose -->
سياسة الإبطال: الميزة الموسومة `@deprecated` في الإصدار `X.Y.0` لا
تُحذف قبل `(X+1).0.0`. وتوثق ملاحظات الإصدار كل حذف صراحة.

<!-- u 6040a078d2c9 | 61 9. Versioning | prose -->
إصدار حزمة NPM يعكس إصدار المواصفة: فـ `@nac3/runtime@X.Y.Z` ينفذ
NAC3 vX.Y، مع Z مراجعة ترقيعية فوقه. وقد كُتب المثال بعناصر نائبة
بقصد -- فإصدار محدد في هذه الجملة يصير قديما مع الإصدار التالي، وقد حمل
هذا المستند فعلا `2.1.3` مدة طويلة بعد أن تقدمت الحزمة.

<!-- u db4793e191d0 | 62 9.1 Prereleases and dist-tags | heading -->
### 9.1 نسخ ما قبل الإصدار ووسوم التوزيع

<!-- u c525c183f446 | 62 9.1 Prereleases and dist-tags | prose -->
الإصدار الذي يحمل ذيل ما قبل الإصدار (`-alpha.N` أو `-beta.N` أو
`-rc.N`) **ليس** إصدارا منشورا من هذه المواصفة. وهو موجود ليتاح تمرين
تغيير قبل أن يُوعد به.

<!-- u 06f01c7dd1c2 | 62 9.1 Prereleases and dist-tags | prose -->
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

<!-- u 5ff3ab15b820 | 62 9.1 Prereleases and dist-tags | prose -->
الإصدار المعتمد لزمن التشغيل المرجعي هو الثابت `NAC.version` في
`js/nac.js`، وهو منشور كبيانات أيضا: فملف `api/latest.json` يحمل
مؤشرين منفصلين، `stable` و `prerelease` (وأي منهما قد يكون `null`)،
وكل منتج منشور يحمل حقل `channel` الخاص به. فالمستهلك الذي يشترط عقدا
مستقرا يقرأ حقلا واحدا ويرفض، بلا نص إصدار يحلله وبلا وسم يثق به.

<!-- u 5f55983494b3 | 63 10. Validators | heading -->
## 10. المدققون

<!-- u 2f3408ca1b03 | 64 10.1 Runtime: `NAC.validate_global()` | heading -->
### 10.1 زمن التشغيل: `NAC.validate_global()`

<!-- u ace4de89e478 | 64 10.1 Runtime: `NAC.validate_global()` | prose -->
يمشي على DOM الحي وعلى البيانات المسجلة، ويرجع **كائنا من مجموعات
مسماة** -- مجموعة لكل شرط، وكل مجموعة مصفوفة من النتائج. ومنذ 2.5.0
تحمل كل نتيجة في كل مجموعة `code` و `severity`، فيستطيع تكامل CI أن
يوقف على رمز دون تحليل أي رسالة:

<!-- u ac96fbc7a1f3 | 64 10.1 Runtime: `NAC.validate_global()` | prose -->
والرموز الخمسة، وشدة كل منها، وما يجب فعله مع كل واحد، منشورة كبيانات
في `api/latest/findings.json` تحت `global_buckets`. ورموز النتائج
مستقرة عبر الإصدارات الترقيعية؛ والرموز الجديدة لا تأتي إلا في الرفع
الثانوي، ولا يُعاد استخدام رمز لشرط آخر أبدا (القسم 12، الوعد 4).

<!-- u ab93934bfc7f | 64 10.1 Runtime: `NAC.validate_global()` | prose -->
**الإصدارات قبل 2.5.0 لم تكن تربط أي رمز بهذه المجموعات**، وكان هذا
القسم يصف مصفوفة مسطحة من النتائج لم يرجعها زمن التشغيل المرجعي أبدا
(التدقيق N-14 و N-34).

<!-- u 656369a32729 | 64 10.1 Runtime: `NAC.validate_global()` | prose -->
**تغيير في السلوك في 2.5.0 (التدقيق N-33).** قبل 2.5.0 كان الجامع
الذي يقف خلف هذا المدقق يقرأ مجموعات البيان القديمة وحدها (`actions`
و `fields` و `tabs` و `kpis` و `charts`، مفتاحها `nac_id`) ولا يقرأ
أبدا الشكل المعياري `elements: [{ id }]` من القسم 4. ولذلك كان، أمام
بيان مكتوب على الصورة الموثقة، يبلغ `total_ids: 0`، ويسرد كل عنصر
معلن كيتيم، ولا يستطيع الإبلاغ عن تكرار ولا عن معرف غير مركب ولا عن
خرق لاصطلاح إطلاقا، ومع ذلك يجيب `ok: true`. ومن 2.5.0 فصاعدا يُقرأ
الشكلان. والمضيف الذي كان يوقف CI عنده على `has_errors` قد يرى أول
فشل بعد الترقية: وذاك إيجاب صحيح كان موجودا دائما، لا قاعدة جديدة.

<!-- u 8cb460800177 | 65 10.2 CLI: `npx nac3 validate <target>` | heading -->
### 10.2 سطر الأوامر: `npx nac3 validate <target>`

<!-- u 5f1634cd35ad | 65 10.2 CLI: `npx nac3 validate <target>` | prose -->
يغلف `validate_global` ويضيف إليه تدقيقا ساكنا لتوافق HTML مع البيان.
ورموز الخروج:

<!-- u 54affecdb5b9 | 65 10.2 CLI: `npx nac3 validate <target>` | prose -->
- `0` -- لا نتائج بشدة >= الحد المضبوط.
- `1` -- هناك نتائج.
- `2` -- الهدف نفسه فشل في التحميل.

<!-- u 62c5dfe68407 | 65 10.2 CLI: `npx nac3 validate <target>` | prose -->
مفيد في CI: `npx nac3 validate ./dist/index.html --severity=error`.
وتعرض الحزمة سطر الأوامر باسمين تنفيذيين، `nac3` و `nac`؛ فاستخدم ما
لا يتعارض مع أداة أخرى في PATH عندك.

<!-- u 01fa36c8d26c | 66 11. The system around NAC3 | heading -->
## 11. النظام حول NAC3

<!-- u 7ad464281bfd | 66 11. The system around NAC3 | prose -->
NAC3 طبقة عقد. ولتحويل صفحة مطابقة لـ NAC3 إلى تطبيق يُقاد بالصوت
تحتاج أيضا إلى:

<!-- u 10116f319016 | 66 11. The system around NAC3 | prose -->
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

<!-- u 400f6554acb4 | 66 11. The system around NAC3 | prose -->
NAC3 يوحد شكل دخل وخرج الخطوة 2 وحدها (لقطة `NAC.describe()` + شكل
الأفعال). أما الخطوات 1 و 3 و 4 فهي خارج المواصفة؛ وتركبها كما تحب.

<!-- u 9bd0d10006ac | 67 12. Stability guarantees | heading -->
## 12. ضمانات الاستقرار

<!-- u d448e3d3251d | 67 12. Stability guarantees | prose -->
ما تعد به هذه المواصفة:

<!-- u 299877632664 | 67 12. Stability guarantees | prose -->
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

<!-- u 7401ca7e951e | 67 12. Stability guarantees | prose -->
وما **لا** تعد به هذه المواصفة:

<!-- u 0f44826d96f1 | 67 12. Stability guarantees | prose -->
1. الصياغة الحرفية لرسائل الخطأ (فهي نصوص من فهرس i18n؛ وقد تتبدل
   ترجماتها).
2. استراتيجية DOM في إيجاد العناصر (`querySelector` اليوم؛ وقد تنتقل
   لاحقا إلى فهرس أسرع).
3. التنظيم الداخلي لمخزن البيانات المؤقت. فعامل البيانات كأنها للكتابة
   فقط من جهة المضيف، وللقراءة فقط من جهة الوكيل.

<!-- u a6934dd2b815 | 68 13. Open questions | heading -->
## 13. أسئلة مفتوحة

<!-- u f9ce60b69c5c | 68 13. Open questions | prose -->
تُتابع **هنا**، في هذا القسم. وكانت مراجعة سابقة تسمي هذا "أسئلة
مفتوحة (تُتابع على حدة)" ولم تقل قط أين كان ذلك "على حدة"؛ ولم يكن
هناك سجل آخر. والسؤال الذي يصل إلى قرار يخرج من الجدول أدناه ويدخل في
القسم الذي يؤثر فيه. والسؤال الذي يصير مقترحا محددا يحصل على RFC،
وتلك موثقة في [`rfcs/README.md`](rfcs/README.md)، وعمليتها في
[`CONTRIBUTING.md`](CONTRIBUTING.md).

<!-- u dcb4765e57ff | 68 13. Open questions | prose -->
كل سطر يحمل الإصدار الذي قُيم فيه آخر مرة، حتى يميز القارئ سؤالا حيا من
سؤال متروك. **ولا يحمل أي سطر إصدارا مستهدفا**: فالوعد المؤرخ الذي
يتجاوز تاريخه أسوأ من وعد بلا تاريخ، وهذا هو الخطأ الذي كان القسم 5
يرتكبه بشأن `payload_schema`.

<!-- u 5bc638bb20cd | 68 13. Open questions | prose -->
| السؤال | الحالة | آخر تقييم | أين يقف الأمر |
|----------|-------|---------------|-----------------|
| هل ينبغي أن يُحل `data-nac-role="navigation"` يوما إلى تبويب؟ | **قرار: لا** | v2.5 | قُرر في 2.2.0 وفُرض منذ ذلك الحين: فالمعرف ببادئة `tab.` مع الدور `navigation` يرفع `tab_id_manifest_role_drift`، ومع `STRICT_VALIDATION` (افتراضيا `true` منذ 2.3.0) ترمي `NAC.register`. و `tab_by_label` لا تحل التبويبات إلا من `m.tabs[]` و `elements[role=='tab']`. والدور `navigation` منطقة علامة، لا لوحة قابلة للتبديل أبدا. انظر القسمين 1 و 10. |
| هل ينبغي أن تقبل `NAC.click()` معرفات نسبية (مثل `'./save'`)؟ | **مفتوح، غير منفذ** | v2.5 | المحلل يطابق `data-nac-id` مطابقة تامة ويحدد النطاق بالملحق: الملحق النشط، أو ما في `opts.plugin`. وذلك التحديد يغطي أصلا الحالة التي كان السؤال يطلبها (`NAC.click('save', {plugin:'invoice'})`)، فالضغط نحو صيغة نسبية ضعيف ولا شيء جار. وحسم هذا يعني إضافة نحو للمسارات إلى القسم 2، وهو القسم الذي تُعلن فيه المعرفات معتمة في نظر زمن التشغيل. |
| هل ينبغي أن تدعم البيانات الوراثة / التوسيع بين الملحقات (بيان أساس يوسعه مستأجر)؟ | **مفتوح، مرشح للرفع الرئيسي القادم** | v2.5 | غير منفذ. **ولا يُخلط بالقسم 15**: فذاك "عقد توسيع الملحق" وقد صدر في v2.5، وهو آلية توجيه إلى backend (`registerPlugin` / `call` / `read` / `subscribe`)، لا وراثة بيانات. والسؤال هنا عن بيان يُشتق من بيان آخر، وهذا يلمس قواعد تفرد المعرفات في القسم 2، ولهذا يبقى محفوظا لرفع رئيسي. |
| هل ينبغي ضبط فرض `payload_schema` رسميا وتشغيله؟ | **مفتوح، بلا تاريخ** | v2.5 | نُقل إلى هنا من القسم 5 الذي كان يعد به لـ v2.4. ولم يحضر في v2.4 ولم يحضر حتى v2.5؛ وزمن التشغيل المرجعي لا يقرأ الحقل. انظر القسم 5 لتعرف بالضبط ما يُتحقق منه اليوم وما لا يُتحقق. |
| هل ينبغي أن تحمل نتائج `validate_global()` رمزا من الفهرس المنشور؟ | **قرار: نعم، صدر في 2.5.0** | v2.5 | كل بند في كل مجموعة يحمل `code` + `severity`، فالوعد 4 في القسم 12 يغطي الآن مجموعة حقيقية بدل مجموعة خالية. والرموز الخمسة منشورة تحت `global_buckets` في `api/latest/findings.json`، والمولد **يقرؤها** من حالة اختبار تستفز كل مجموعة، بدل أن يكتبها يدويا: فالنسخة السابقة كانت تكتب `code: null` لمجموعة تحمل رمزا منذ 2.5.0، وتنشر الدعويين في الملف نفسه. وبناء حالة الاختبار تلك هو أيضا ما كشف التدقيق N-33: فالمدقق لم يكن يرى بيانا مكتوبا بالشكل المعياري. انظر 10.1. |

<!-- u 1ba12333695c | 69 13.5 Governance | heading -->
## 13.5 الإدارة

<!-- u 091136995f4a | 69 13.5 Governance | prose -->
يرعى NAC3 حاليا فريق Yujin. والمواصفة والوثائق وزمن التشغيل المرجعي
كلها منشورة تحت Apache-2.0. (وكان زمن التشغيل موسوما بـ MIT في زمن
المستودعين قبل 2.5؛ ثم وُحد على Apache-2.0 في كل منتجات NAC3 عند
الدمج في 2026-05-23. انظر `LICENSE` و `runtime/LICENSE`.) وتتعهد
Yujin بنقل NAC3 إلى مؤسسة محايدة (مجموعة مجتمعية في W3C، أو
Linux Foundation، أو هيئة صناعية مكافئة) متى صار التبني مبررا لإدارة
محايدة. وحتى ذلك الحين تتبع تغييرات المواصفة عملية RFC الموثقة في
`CONTRIBUTING.md`، مع فترة تعليق عام لا تقل عن 14 يوما لأي تغيير يمس
الواجهة البرمجية العامة أو صيغ النقل.

<!-- u fd9fc738b52c | 69 13.5 Governance | prose -->
إلى الجهات المتبنية: الترخيص الموحد تحت Apache-2.0 يضمن بقاء المواصفة
وزمن التشغيل بعد أي تغير في وضع Yujin كشركة. فتستطيع أن تفرع أيهما
شئت، وأن تشغل أيهما شئت، وأن تنشر أيهما شئت، اليوم وبعد أن نزول. وهذا
المستند يسجل ذلك التعهد حتى يكون الطريق إلى هذا البقاء صريحا لا ضمنيا.

<!-- u 4d62e1227df1 | 70 14. Reference implementation | heading -->
## 14. التنفيذ المرجعي

<!-- u 52d4fad55b7e | 70 14. Reference implementation | prose -->
التنفيذ المعياري هو زمن التشغيل المرجعي الموزع كحزمة NPM باسم
`@nac3/runtime`. والمصدر المعياري للإصدار هو ثابت زمن التشغيل نفسه
`NAC.version`، المنشور كبيانات في `api/latest.json` (انظر القسم
9.1). وهذا القسم لا يعيد ذكر رقم إصدار بقصد: فقد كان يحمل
`2.5.0-alpha.5` بينما كانت الحزمة قد تقدمت أصلا، وهذا من صنف العيب
نفسه الذي أُزيلت بسببه الأمثلة القديمة من القسمين 5 و 9. وهو يقدم:

<!-- u 65f8174ff33b | 70 14. Reference implementation | prose -->
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

<!-- u 3267a25cd9bb | 70 14. Reference implementation | prose -->
وتعرض الحزمة أيضا سطر أوامر باسمي التنفيذ `nac3` و `nac`
(`dist/cli.js`، القسم 10.2).

<!-- u ada8333c036b | 70 14. Reference implementation | prose -->
والتنفيذات الأخرى مرحب بها (Python لمنفذي الأتمتة الأصليين، و Rust
للوكلاء المدمجين، وغيرها). فالمرجعية للمواصفة، لا لكود JS.

<!-- u 4dc85a8e4ab3 | 71 15. Plugin extension contract -- canvas + API surfaces  | heading -->
## 15. عقد توسيع الملحق -- أسطح canvas والواجهات البرمجية (v2.5)

<!-- u 7d116da9b14a | 71 15. Plugin extension contract -- canvas + API surfaces  | prose -->
تفترض الأقسام 1-14 أن السطح الذي يهم الوكيل هو **DOM**. فكل عنصر له
عنوان يحمل سمة `data-nac-id`، وكل فعل ينطلق عبر `el.click()`، وكل
قراءة حالة تأتي من `el.getAttribute(...)`. وهذا يصلح للتطبيقات التي
يعيش إطارها **ومحتواها** في عقد DOM.

<!-- u 0551bce3d392 | 71 15. Plugin extension contract -- canvas + API surfaces  | prose -->
وهو لا يصلح للتطبيقات التي يكون جزء من سطحها **canvas** (مثل
LibreOffice / Collabora Online، و Figma، و Excalidraw، و Miro، وأي
محرر WebGL مصنوع في البيت). فقد يبقى الإطار من DOM (أشرطة أدوات،
حوارات)، لكن الأوامر كثيرا ما تحتاج أن تمر عبر الواجهة البرمجية
العامة للتطبيق نفسه (postMessage، أو SDK الملحقات، أو جسر السكربتات)،
وقد لا تكون الحالة مقروءة من DOM إطلاقا.

<!-- u 72264fb0f469 | 71 15. Plugin extension contract -- canvas + API surfaces  | prose -->
يضيف v2.5 طاقما صغيرا من البدائيات يتيح لملحق NAC3 أن يعلن عقد التوجيه
الخاص به نحو تلك الأسطح. ويبقى زمن التشغيل محايدا تجاه أي تطبيق بعينه
-- فهو لا يتعلم الحديث مع تطبيق إلا بقراءة بيان الملحق.

<!-- u 6d9a90384f28 | 72 15.1 Why a new primitive set | heading -->
### 15.1 لماذا طاقم بدائيات جديد

<!-- u a7e9cf90c978 | 72 15.1 Why a new primitive set | prose -->
الدالة `NAC.click(id)` التي لا تعرف غير DOM لا تستطيع:

<!-- u 38b34f7795c3 | 72 15.1 Why a new primitive set | prose -->
- إرسال postMessage باسم `Send_UNO_Command` إلى iframe لـ Collabora
  موضوع في صندوق رمل.
- نداء `figma.currentPage.selection = [...]` داخل صندوق رمل ملحقات
  Figma.
- استدعاء `excalidrawAPI.setElements(...)` على ref في React.
- قراءة ما إذا كان العريض مفعلا على المنتقى الحالي في Collabora (فشريط
  الأدوات يعكسه؛ و canvas يخفيه).

<!-- u 7495e48dfe8c | 72 15.1 Why a new primitive set | prose -->
والعلاج **ليس** توسيع `NAC.click` بحدسيات لاكتشاف الـ backend. العلاج
هو إضافة فعل صريح ومحايد يأخذ slug الملحق ومسار الفعل، ويترك لبيان
الملحق أن يعلن كيف يُوجَّه ذلك الفعل.

<!-- u 641333576b18 | 73 15.2 The three primitives | heading -->
### 15.2 البدائيات الثلاث

<!-- u 2eeaa810cab5 | 73 15.2 The three primitives | prose -->
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

<!-- u da60503266ab | 73 15.2 The three primitives | prose -->
الدوال الأربع كلها غير متزامنة (ترجع وعدا) إلا `unsubscribe`، فهي
متزامنة ولا يتغير أثرها بتكرار النداء.

<!-- u 3a61a03890f1 | 74 15.3 Plugin manifest shape | heading -->
### 15.3 شكل بيان الملحق

<!-- u 5420f520d0d4 | 74 15.3 Plugin manifest shape | prose -->
البيانات JSON خالص (بلا دوال رد JS). وتولدها Forge و Sumi وأي أداة
قادمة كبيانات؛ وزمن التشغيل يفسر أسماء الـ backend من معجم ثابت.

<!-- u c81d6471a0ab | 74 15.3 Plugin manifest shape | prose -->
للأفعال والأحداث **ارتباط واحد بالضبط**. وللحالة **مصفوفة مرتبة** من
الارتباطات: فيمشي زمن التشغيل على السلسلة بالترتيب، ويرجع أول مصدر
نجح في الحل.

<!-- u 673180462720 | 75 15.4 Backend vocabulary | heading -->
### 15.4 معجم الـ backend

<!-- u 1e544939bf9c | 75 15.4 Backend vocabulary | prose -->
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

<!-- u b3fb5326727c | 75 15.4 Backend vocabulary | prose -->
يجب أن ينفذ زمن التشغيل كل backend كمرسل مكتف بذاته
(`dispatch(binding, args, context) -> Promise<value>`). وإضافة نوع
backend جديد إلى المواصفة تقتضي رفع إصدار المواصفة؛ وأزمنة التشغيل
التي تتجاهل الـ backend المجهولة يجب أن ترفض البيانات التي تعلنها (لا
تجاوز صامت).

<!-- u 269f89fd3507 | 76 15.5 Extractor mini-DSL | heading -->
### 15.5 معجم الاستخراج المصغر

<!-- u d4919abaffe4 | 76 15.5 Extractor mini-DSL | prose -->
كثيرا ما تحتاج backend الحالة و backend الحدث `postmessage-listen` أن
تنتزع حقلا من كائن أكبر. ويحمل زمن التشغيل معجما تعريفيا صغيرا جدا حتى
تبقى البيانات JSON فقط:

<!-- u edfb3ecdcba7 | 76 15.5 Extractor mini-DSL | prose -->
| الصيغة | المعنى | مثال دخل -> خرج |
|--------|---------|-------------------------|
| `field.path.to.value` | المشي على مسار بنقاط. | `{a:{b:1}}` مع `a.b` -> `1` |
| `attribute:NAME` | في DOM فقط: قراءة `el.getAttribute(NAME)`. | `<i data-x="hi">` مع `attribute:data-x` -> `'hi'` |
| `text` | في DOM فقط: قراءة `el.textContent`. | `<span>hi</span>` مع `text` -> `'hi'` |
| `classList.contains:CLASS` | في DOM فقط: `el.classList.contains(CLASS)` -> منطقي. | `<button class="active">` مع `classList.contains:active` -> `true` |
| `value` | في DOM فقط: قراءة `el.value`. | `<input value="x">` مع `value` -> `'x'` |
| `present` | في DOM فقط: ترجع `true` إن حل المنتقي عنصرا، و `false` إن لم يحل. | المنتقي طابق -> `true` |

<!-- u c21d2cceb93f | 76 15.5 Extractor mini-DSL | prose -->
التركيب غير مدعوم في v2.5؛ فالمستخرج هو بالضبط أحد السطور أعلاه. وأي
بيان يحتاج تحويلا معقدا يعلن `script-bridge` بدلا من ذلك.

<!-- u 8eaa22faba63 | 77 15.6 Fallback chain semantics for `state` | heading -->
### 15.6 دلالة سلسلة الاحتياطات في `state`

<!-- u c1e30df97123 | 77 15.6 Fallback chain semantics for `state` | prose -->
الحقل `state[path]` مصفوفة من الارتباطات. وتمشي
`NAC.read(plugin, path)` على المصفوفة بالترتيب. ولكل ارتباط:

<!-- u 9b9d10966d70 | 77 15.6 Fallback chain semantics for `state` | prose -->
1. ينادي زمن التشغيل مرسل الـ backend.
2. إن حُل المرسل بقيمة (ومنها `false` و `0` والنص الفارغ، لكن **ليس**
   `undefined`) أرجعت `read` تلك القيمة.
3. وإن رفض المرسل أو حُل بـ `undefined` تقدم زمن التشغيل إلى الارتباط
   التالي في المصفوفة.
4. وإن لم ينتج أي ارتباط قيمة رفضت `read` بـ
   `NacError('state_unreadable', ...)`، ويحمل فيه
   `err.attempts: [...]` مدخلا لكل backend جُرب، بصيغة
   `{backend, reason}`.

<!-- u 68f0476ca245 | 77 15.6 Fallback chain semantics for `state` | prose -->
والعلة: السلسلة تسجل ترتيب تفضيل من كتب البيان. فالمصدر الأسرع والأرخص
والأحدث يُعلن أولا؛ والاحتياطات تتدرج هبوطا بلياقة. ولا يختار زمن
التشغيل أبدا، في صمت، مصدرا أدنى أولا.

<!-- u ffedb5b06a01 | 78 15.7 Provenance for synthetic actions | heading -->
### 15.7 منشأ الأفعال المصنوعة

<!-- u bc6190f2e478 | 78 15.7 Provenance for synthetic actions | prose -->
كل إرسال من `NAC.call` يصدر حدث `nac:plugin:invoked` على `document`
بعد أن يرجع الـ backend. وحمولة التفصيل:

<!-- u b527bd4cadd8 | 78 15.7 Provenance for synthetic actions | prose -->
والشكل نفسه يسري على `nac:plugin:read` (بعد `read`) وعلى
`nac:plugin:event` (إعادة إصدار حدث مصنوع). والحقل `source` قيمته
الافتراضية `'agent'`؛ والمضيفون الذين يغلفون زمن التشغيل بواجهة
للمستخدم يمكن أن يستبدلوها عبر الآلية القائمة
`NAC.set_source(...)` (القسم 7).

<!-- u 07f550e23dcf | 79 15.8 Worked example -- Collabora Writer | heading -->
### 15.8 مثال مشغول -- Collabora Writer

<!-- u cae1093b9441 | 79 15.8 Worked example -- Collabora Writer | prose -->
ينادي الوكيل `NAC.call('collabora.writer', 'uno.Bold')`؛ فيوجه زمن
التشغيل عبر backend المسمى `postmessage` ويرسل `Send_UNO_Command`
إلى الـ iframe. وللتأكد من أن الأثر قد حدث (انظر القسم 17) ينادي
الوكيل `await NAC.read('collabora.writer', 'selection.isBold')`؛
فيجرب زمن التشغيل مرآة شريط الأدوات أولا (سريعة ومجانية)، ثم ينزل إلى
جسر سكربتات Python إن لم تكن المرآة متاحة. ولا يعرف الوكيل أبدا، ولا
يهمه، أي مصدر أجاب.

<!-- u 35fc88c5f8c4 | 80 15.9 Errors | heading -->
### 15.9 الأخطاء

<!-- u 5eda63397d51 | 80 15.9 Errors | prose -->
ترفض `NAC.call` / `read` / `subscribe` بـ `NacError` يكون `code` فيه
واحدا من هذه:

<!-- u f6eceddeaf5f | 80 15.9 Errors | prose -->
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

<!-- u f92a4c02f492 | 81 16. Tree navigation (v2.5 -- SHIPPED in 2.5.0-alpha.5 / | heading -->
## 16. التنقل في الشجرة (v2.5 -- صدر في 2.5.0-alpha.5 / RFC V25-02)

<!-- u 7a50acadcc20 | 81 16. Tree navigation (v2.5 -- SHIPPED in 2.5.0-alpha.5 / | prose -->
بدائيات للتنقل الهرمي في الأوامر، لأجل مسارات المساعدة ومنفذي الصوت
الذين يحتاجون أن يصفوا ما يمكنهم فعله من موضع التركيز الحالي.

<!-- u 726350183f41 | 81 16. Tree navigation (v2.5 -- SHIPPED in 2.5.0-alpha.5 / | prose -->
**سطح الواجهة البرمجية:**

<!-- u c57b2345c081 | 81 16. Tree navigation (v2.5 -- SHIPPED in 2.5.0-alpha.5 / | prose -->
- `NAC.context(plugin) -> { breadcrumb: [{nac_id, label}, ...] }`
  يصعد من `document.activeElement` عبر العناصر الأسلاف التي تحمل
  `data-nac-id`، ويتوقف عند جذر الملحق. ويرجع مسارا فارغا إن لم يكن
  شيء في الملحق يحمل التركيز. وتسمية `label` لكل درجة تأتي من
  `narrate` (القسم 17).

<!-- u 9345bb2ecfe1 | 81 16. Tree navigation (v2.5 -- SHIPPED in 2.5.0-alpha.5 / | prose -->
- `NAC.tree(plugin, rootId?) -> [{nac_id, label, opens?, leaf?}, ...]`
  يعد الأبناء ذوي العناوين **المباشرين** لـ `rootId` (أو لجذر الملحق
  إن أُهمل). و"المباشر" يعني أنه لا يوجد عنصر آخر يحمل `data-nac-id`
  بين نقطة البداية والابن. ولكل مدخل:
  - `label` محلولة عبر `narrate`
  - `opens` تعكس السمة `data-nac-opens` حين تكون موجودة
  - `leaf` تكون `true` حين تكون `data-nac-leaf` موجودة

<!-- u b19ace6221f6 | 81 16. Tree navigation (v2.5 -- SHIPPED in 2.5.0-alpha.5 / | prose -->
**سمات للكاتب:**

<!-- u 8c4475faabe9 | 81 16. Tree navigation (v2.5 -- SHIPPED in 2.5.0-alpha.5 / | prose -->
- `data-nac-opens="<target-nac-id>"`: تعلن أن هذه العقدة تفتح / تهبط
  إلى العنصر الذي يحدده المعرف الهدف. وبذلك يتابع الوكلاء سلسلة التنقل
  دون تخمين الأسماء.
- `data-nac-leaf`: علامة نهاية صريحة؛ فتعرف الوكلاء اللاحقة أن لا هبوط
  أعمق ممكن.

<!-- u 6a2e330ae9a8 | 81 16. Tree navigation (v2.5 -- SHIPPED in 2.5.0-alpha.5 / | prose -->
**الأخطاء:** ترجع `tree` القيمة `[]` لـ rootId مجهول (فراغ صامت، لا
خطأ). وترجع `context` دائما `{ breadcrumb: [] }` للملحقات المجهولة.

<!-- u 7a9670811789 | 82 17. Assistive labels (v2.5 -- SHIPPED in 2.5.0-alpha.5  | heading -->
## 17. التسميات المساعدة (v2.5 -- صدر في 2.5.0-alpha.5 / RFC V25-03)

<!-- u e6e2f1eecf4e | 82 17. Assistive labels (v2.5 -- SHIPPED in 2.5.0-alpha.5  | prose -->
حل معياري للتسميات التي يقرؤها البشر. دالة واحدة لقارئات الشاشة،
وتوليد الكلام، ومسارات الصوت، وسجلات التدقيق، وأسطح المساعدة على
الهاتف.

<!-- u 2ee6d3c1ba46 | 82 17. Assistive labels (v2.5 -- SHIPPED in 2.5.0-alpha.5  | prose -->
- `NAC.narrate(plugin, nac_id) -> string | null`
  ترجع `null` إن لم يُوجد الملحق أو لم يُوجد nac_id. وإلا فالتسمية
  وفق ترتيب الأولوية الصارم هذا:

<!-- u d1332c239eaf | 82 17. Assistive labels (v2.5 -- SHIPPED in 2.5.0-alpha.5  | prose -->
  1. **`aria-label`** -- الوصول أولا؛ ويُحترم إلا إذا كان فراغا فقط.
  2. **النص المرئي** -- أي `textContent` للعنصر، مستثنى منه أي شجرة
     فرعية معششة تحمل `data-nac-id` (فلتلك حل narrate خاص بها؛
     وتُستثنى حتى يبقى الخرج المنطوق محصورا في نطاقه).
  3. **`data-nac-label`** -- تجاوز صريح من الكاتب؛ وهو مفيد حين يحتوي
     النص المرئي على رموز أيقونات أو مفاتيح i18n.
  4. **`nac_id` كآخر ملجأ** -- وهي أسوأ حالة؛ وتشير إلى أن "لا تسمية
     كُتبت".

<!-- u ca12e3704975 | 82 17. Assistive labels (v2.5 -- SHIPPED in 2.5.0-alpha.5  | prose -->
  والقيم التي هي فراغ فقط، في أي طبقة، تنزل إلى الطبقة التالية.

<!-- u 05527df57e48 | 82 17. Assistive labels (v2.5 -- SHIPPED in 2.5.0-alpha.5  | prose -->
**التحقق:** يمكن لـ `validate_global()` أن تصدر تحذيرات في مجموعة
`plugin_instance_violations` للمعرفات ذات الشكل الترتيبي (`btn-1`
و `btn-2` و ...) التي تنقصها أي من تسميات الطبقات الأعلى.

<!-- u 8352032c85cd | 83 18. Effect detection (v2.5 -- SHIPPED in 2.5.0-alpha.5  | heading -->
## 18. اكتشاف الأثر (v2.5 -- صدر في 2.5.0-alpha.5 / RFC V25-04)

<!-- u 229a636ff25c | 83 18. Effect detection (v2.5 -- SHIPPED in 2.5.0-alpha.5  | prose -->
يسد ثغرة "الضرر الصامت": فالوكيل يتأكد من أثر الفعل، لا من مجرد أن
الأمر قد أُصدر. والبدائيتان تتركبان مع `NAC.read()`، فيعمل أي backend
من V25-01 (postmessage، و sdk-call، و dom-mirror، ...).

<!-- u fbede61e05ec | 83 18. Effect detection (v2.5 -- SHIPPED in 2.5.0-alpha.5  | prose -->
- `NAC.expect(plugin, statePath, value, opts?) -> Promise<value>`
  تستفتي `NAC.read(plugin, statePath)` مرة بعد مرة حتى يرجع المقارن
  قيمة صادقة أو حتى يحل الأجل. وتُحل بالقيمة المحلولة؛ وترفض بـ
  `NacError('timeout', ...)` عند الأجل.

<!-- u 2f8b051e6a19 | 83 18. Effect detection (v2.5 -- SHIPPED in 2.5.0-alpha.5  | prose -->
  وإخفاقات القراءة خلال الاستفتاء تُعاد المحاولة فيها حتى الأجل
  (وتُعامل كأنها "غير مرئي بعد"، لا كخطأ قاس).

<!-- u 31222acebd2a | 83 18. Effect detection (v2.5 -- SHIPPED in 2.5.0-alpha.5  | prose -->
  الخيارات:
  - `timeout_ms` (افتراضيا `5000`)
  - `poll_ms` (افتراضيا `100`)
  - `comparator` (افتراضيا `(cur, want) => cur === want`)
    ويستلم `(current, expected)` ويرجع قيمة منطقية.

<!-- u bfe42d1abbb0 | 83 18. Effect detection (v2.5 -- SHIPPED in 2.5.0-alpha.5  | prose -->
- `NAC.diff(plugin, statePath, actionFn) -> Promise<{before, after, changed}>`
  تقرأ الحالة، وتنتظر `actionFn()`، ثم تقرأ الحالة مرة أخرى. وترجع
  اللقطتين وقيمة منطقية `changed` محسوبة بمقارنة JSON-stringify (فحتى
  `undefined` في مقابل قيمة يُعد تغيرا). وإخفاقات القراءة تنطوي إلى
  `undefined`.

<!-- u 261f5079717f | 83 18. Effect detection (v2.5 -- SHIPPED in 2.5.0-alpha.5  | prose -->
**ملاحظات على التركيب:** تلتقط `diff` لقطة البداية ولقطة النهاية فقط؛
وهي **لا** تراقب الحالات الوسيطة داخل الفعل. فإن كان همك أن "الحالة تمر
بقيمة بعينها في لحظة ما" فاستخدم `expect`.

<!-- u 3c1090ef8c62 | 83 18. Effect detection (v2.5 -- SHIPPED in 2.5.0-alpha.5  | prose -->
*هذا المستند هو المواصفة المعيارية لـ NAC3 v2.5. والأقسام 0-14 لم
تتغير عن v2.4 المستقر. والأقسام 15-18 تصدر في v2.5. وتعديلات هذا
الملف تعد تغييرات في المواصفة وتقتضي RFC؛ انظر `CONTRIBUTING.md`.*
