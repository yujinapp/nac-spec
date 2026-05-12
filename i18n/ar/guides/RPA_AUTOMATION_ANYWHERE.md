---
translation_source: guides/RPA_AUTOMATION_ANYWHERE.md
translation_source_hash: 165e60e4b3922f8353a3f038d815452ebf9ba7d597cb68f8c313eb47cb416eab
translation_quality: machine_v1
translation_lang: ar
translation_date: 2026-05-11T15:18:30.470223+00:00
---

# دليل تكامل NAC3 مع Automation Anywhere

**إصدار NAC3:** 2.2 (مع معاينة التوافق مع v2.3)
**تم الاختبار مع:** Automation Anywhere A2019 + A360.

## مساران — اختر وفق إصدار AA لديك

### المسار A — A360 + Web Recorder + Run JavaScript

يقوم إجراء `Run JavaScript Function` في AA بالحقن في تبويب المتصفح النشط.

```js
// payload variable: NAC_ID = "invoice.save"
async function nacClick(id) {
  await window.NAC.click(id);
  return 'ok';
}
return nacClick($NAC_ID$);
```

اربط متغيرات الإدخال (`$NAC_ID$`، `$VALUE$`) في وقت التصميم؛
يُعيد الإجراء سلسلة نصية يتفرع عليها الروبوت.

### المسار B — A2019 + Object Cloning مع خاصية مخصصة

يستهدف `Object Cloning` في A2019 تقليديًا العناصر عبر خصائص DOM.
اضبط محدد الخاصية على النحو التالي:

```
HTML.Attribute: data-nac-id
Search value: invoice.save
```

هذا المسار أقل موثوقية من المسار A (إذ يعتمد على توقيت شجرة DOM)، غير أنه يتيح لروبوتات A2019 القديمة اعتماد NAC3 دون إعادة كتابة التدفقات.

## قالب الروبوت القياسي المكوّن من 8 إجراءات

للعرض التوضيحي للفاتورة v21:

| الخطوة | الإجراء | الحمولة |
|--------|---------|---------|
| 1 | Open Browser | https://your-app.example.com/ |
| 2 | Wait | انتظار جاهزية `window.NAC` (استطلاع JS) |
| 3 | Loop CSV | الصفوف |
| 4 | Run JS | `await window.NAC.click_by_verb('invoice','new')` |
| 5 | Run JS | `await window.NAC.fill('invoice.client',$row.client$)` |
| 6 | Run JS | `await window.NAC.fill('invoice.amount',$row.amount$)` |
| 7 | Run JS | `await window.NAC.click_by_verb('invoice','save')` |
| 8 | End Loop | -- |

8 إجراءات بصرف النظر عن تعقيد واجهة المستخدم، مقارنةً بـ 30 إلى 60 إجراءً في تدفقات محددات CSS النمطية.

## الاستكشاف عبر `NAC.describe()`

```js
return JSON.stringify(window.NAC.describe());
```

يُعيد شجرة البيان. يمكن لـ AA تحليلها باستخدام `JSON Parse` وبناء مخططات تدفق ديناميكية.

## الإسناد و isTrusted

يُرسل AA نقرات اصطناعية. قد يرفض التطبيق المضيف الأفعال الحساسة (كالحذف والدفع) ما لم تُدرج صراحةً في القائمة البيضاء. راجع قسم "Provenance" في `RPA_UIPATH.md` للاطلاع على نمط الموافقة من جانب المضيف، إذ ينطبق الأمر ذاته على AA.

## معالجة الأخطاء

لُفّ كل استدعاء JS داخل `try/catch` يُعيد JSON:

```js
try {
  await window.NAC.fill('@id@', '@value@');
  return JSON.stringify({ok: true});
} catch (e) {
  return JSON.stringify({ok: false, code: e.code, message: e.message});
}
```

يتفرع إجراء `If` بناءً على JSON المُحلَّل.

## الترخيص وروابط ذات صلة

Apache-2.0. راجع [RPA_UIPATH.md](RPA_UIPATH.md) للاطلاع على شرح أكثر تعمقًا؛ إذ تنتقل الأنماط بشكل متطابق 1:1.

---

*This is a machine translation of the canonical English
version at `/nac-spec/guides/RPA_AUTOMATION_ANYWHERE.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
