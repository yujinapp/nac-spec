---
translation_source: guides/RPA_UIPATH.md
translation_source_hash: 2dd66d68221f687237ac663fa2a360077a51b7cdf8ad74c16488a5934ee7927d
translation_quality: machine_v1
translation_lang: ar
translation_date: 2026-05-11T15:18:09.416277+00:00
---

# دليل تكامل NAC3 مع UiPath

**إصدار NAC3:** 2.2 (مع معاينة التوافق مع v2.3)
**الحالة:** مستقر. تم الاختبار مع UiPath Studio 23.10 + Web Automation v23.10.

تعتمد أتمتة الويب في UiPath اليوم على استخراج DOM باستخدام محددات CSS، أو الاستهداف البصري، أو الإحداثيات المُضمَّنة. مع NAC3، يُعلن كل عنصر قابل للنقر في تطبيقك عن معرّف ثابت `data-nac-id`؛ يستخدم UiPath هذا المعرّف للوصول إلى العناصر، مما يجعله متيناً أمام أي إعادة تصميم للواجهة.

## لماذا NAC3 + UiPath

| المشكلة الحالية | الحل مع NAC3 |
|----------------|-------------|
| تنكسر المحددات عند تغيير CSS | `data-nac-id` ثابت عبر إعادة التصاميم البصرية |
| يفشل الاستهداف بالإحداثيات بعد تحريك زر | نفس الحل |
| هشاشة التعامل مع المستأجرين المتعددين (معرّفات مختلفة لكل عميل) | يُعلن المانيفست عن الفعل؛ يستدعي البوت بالفعل |
| الانتظار حتى "يصبح العنصر جاهزاً" غير موثوق | حدث `nac:action:succeeded` حتمي ودقيق |
| واجهات متعددة اللغات تحتاج أتمتة لكل لغة | `label_i18n` مستقل عن اللغة؛ يستخدم البوت المعرّفات لا التسميات |

## مسارا التكامل

### المسار A -- نشاط المتصفح + حقن JS (موصى به)

يُشغّل نشاط `Inject JavaScript` في UiPath الأمر `window.NAC.click(...)` مباشرةً. لا محددات، لا هشاشة.

```vb
' UiPath sequence pseudocode
Open Browser https://your-app.example.com/
Inject JS: window.NAC.click('invoice.save')
Wait for Event: nac:action:succeeded
```

خطوات التنفيذ:

1. **نشاط المتصفح** -- تدفق UiPath المعتاد.
2. **نشاط Inject JavaScript** -- الحمولة:
   ```js
   return await (async () => {
     const result = await window.NAC.click('@id@');
     return JSON.stringify(result);
   })();
   ```
3. **تعيين** السلسلة المُعادة إلى متغير. تحليلها للتحقق من `{ok: true}`.

للإرسال المبني على الأفعال:

```js
await window.NAC.click_by_verb('@plugin@', '@verb@')
```

للتعبئة:

```js
await window.NAC.fill('@id@', '@value@')
```

### المسار B -- مبني على المحددات مع xpath يدرك NAC

إذا كان ملف تعريف UiPath لديك يُفضّل المحددات، استخدم السمة `data-nac-id` مباشرةً:

```xml
<webctrl tag='button' attr='data-nac-id' value='invoice.save' />
```

نفس المنطق لكنه يستهلك DOM المتصفح عبر مستكشف شجرة UiPath. أقل متانةً قليلاً (يعتمد على توقيت الشجرة) لكنه يحافظ على أسلوب UiPath المعتاد.

## نموذج سير عمل UiPath

`Examples_NAC_Invoice.xaml` (للتنزيل من سوق Yujin عند النشر):

1. **Open Browser** -- وجّه التبويب إلى تطبيقك المتوافق مع NAC-3.
2. **انتظر window.NAC3** -- احقن:
   ```js
   return new Promise(r => {
     const t = setInterval(() => {
       if (window.NAC) { clearInterval(t); r('ready'); }
     }, 100);
   });
   ```
3. **For Each Row** -- كرّر على جدول البيانات المصدر.
4. **Inject JS** -- لكل صف:
   ```js
   await window.NAC.click_by_verb('invoice', 'new');
   await window.NAC.fill('invoice.client_name', @row("client")@);
   await window.NAC.fill('invoice.amount', @row("amount")@);
   await window.NAC.click_by_verb('invoice', 'save');
   ```
5. **انتظر** -- حدث nac:action:succeeded مع action_id='invoice.save'.
6. **تابع** الحلقة.

يتكون التدفق بأكمله من 5 أنشطة بغض النظر عن مدى تعقيد التطبيق الأساسي. قارن ذلك بـ 30-50 نشاطاً نموذجياً لمكافئ مبني على محددات CSS.

## الاستكشاف: قراءة المانيفست

يستطيع UiPath استبطان المانيفست قبل بدء الأتمتة:

```js
return window.NAC.describe();
```

يُعيد شجرة الإضافات كاملةً. استخدمها لبناء مخططات تدفق ديناميكية تتكيف مع تغييرات المانيفست دون إعادة نشر ملف .xaml.

## الإثبات (NAC-3)

يُرسل UiPath نقرات اصطناعية، لذا تكون قيمة `event.isTrusted === false` في حدث إقرار NAC3. التطبيقات التي تشترط `is_trusted` للأفعال الحساسة (الحذف، الدفع، الإدارة) ستُرفض افتراضياً عند إرسال UiPath.

لتمكين RPA لتلك الأفعال، يجب على التطبيق المضيف إدراجها صراحةً في القائمة البيضاء:

```js
// In the host app's NAC bootstrap:
window.__NAC_ALLOW_UNTRUSTED__ = ['invoice.save', 'invoice.send'];
```

ناقش نموذج التهديد مع مالك التطبيق -- تجاوز isTrusted يُبطل ضمان مكافحة الانتحال في المواصفة. يعمل UiPath في بيئة خاضعة للتحكم لذا تكون المقايضة مقبولة عادةً، لكن وثّق ذلك.

## معالجة الأخطاء

يُطلق NAC3 أخطاءً منظّمة يمكن لـ UiPath التفريع بناءً عليها:

```js
try {
  await window.NAC.click('invoice.save');
} catch (e) {
  return JSON.stringify({ ok: false, code: e.code, message: e.message });
}
```

| `e.code` | المعنى | فرع UiPath |
|----------|--------|------------|
| `not_found` | المعرّف غير موجود في DOM الحالي | أعد الاستكشاف عبر `NAC.describe()` |
| `invalid` | شكل الوسيطة خاطئ | خطأ في منطق البوت، صعّده |
| `timeout` | لم يُقرّ التأثير الجانبي خلال 5 ثوانٍ | أعد المحاولة حتى N مرات |

## مصفوفة الاختبار

نختبر التكامل مقابل
[عرض جدول البيانات v21](https://yujin.app/nac-spec/example-v21-data-table.php)
عبر UiPath 23.10 في CI. سير العمل المرجعي موجود في
`tools/rpa/uipath/InvoiceFromCSV.xaml` من هذا المستودع (قريباً).

## انظر أيضاً

- [SPEC.md القسم 5](../SPEC.md#5-public-api) -- واجهة NAC.* الكاملة.
- [SECURITY.md](../SECURITY.md) -- نموذج تهديد isTrusted.
- [LLM_WIRING.md](LLM_WIRING.md) -- إذا كان تدفق RPA لديك يحتاج أيضاً إدخالاً صوتياً أو محادثةً، اربط وسيط LLM في المقدمة.
- [NAC_TEST_MANUAL.md](../docs/NAC_TEST_MANUAL.md) -- كيف تختبر Yujin هذا العقد من البداية إلى النهاية.

## الرخصة

Apache-2.0.

---

*This is a machine translation of the canonical English
version at `/nac-spec/guides/RPA_UIPATH.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
