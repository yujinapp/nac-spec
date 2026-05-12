---
translation_source: guides/RPA_BLUE_PRISM.md
translation_source_hash: 7ab698b35a99ca25e77a07599f1aa733b4ba42eb08d0f3bce785a9b0c7f7e276
translation_quality: machine_v1
translation_lang: ar
translation_date: 2026-05-11T15:18:43.897879+00:00
---

# دليل تكامل NAC3 مع Blue Prism

**إصدار NAC3:** 2.2 (مع معاينة التوافق مع الإصدار v2.3)
**تم الاختبار مع:** Blue Prism 7.1 + Browser Automation v7.1.

يُتيح كائن الأعمال `Browser` في Blue Prism استخدام `Inject JavaScript`
بشكل افتراضي. يعتمد تكامل NAC3 مع Blue Prism على نمط مكوّن من 5 مراحل.

## تدفق المراحل

1. **Login Agent** -- قياسي.
2. **Navigate** -- فتح التطبيق المتوافق مع NAC.
3. **JS: wait for window.NAC3** -- الاستطلاع حتى يصبح جاهزًا.
4. **JS: NAC.click / fill / tab** -- الإرسال القانوني.
5. **JS: read describe()** -- استبطان البيان للتكرار التالي في تدفق البيانات.

## نموذج VBO (Visual Business Object)

```
Object: NAC Driver
Action: Click NAC ID
  Inputs:
    - nacId (Text)
  Code (Inject JavaScript):
    (async () => {
      try {
        await window.NAC.click([nacId]);
        return JSON.stringify({ok:true});
      } catch (e) {
        return JSON.stringify({ok:false, code:e.code, message:e.message});
      }
    })()
  Outputs:
    - resultJson (Text)
```

الإجراءات المقابلة: `Click By Verb`، و`Fill`، و`Select`، و`Tab`،
و`Describe`، و`WaitForAck`.

## نمط انتظار التأكيد

تنتظر `NAC.click()` داخليًا حدث `nac:action:succeeded`
(مهلة 5 ثوانٍ). يمكن لـ Blue Prism إضافة انتظار صريح إضافي:

```js
return new Promise(resolve => {
  let acked = false;
  document.addEventListener('nac:action:succeeded', function (e) {
    if (e.detail.action_id === '[expectedId]') {
      acked = true;
      resolve('ok');
    }
  }, { once: true });
  setTimeout(() => { if (!acked) resolve('timeout'); }, [timeoutMs]);
});
```

يُظهر هذا النمط عائلة أحداث NAC3 القانونية داخل مخرجات مراحل Blue Prism،
وهو مفيد لتفريع تدفق العملية.

## الاستكشاف

إجراء `Read Manifest`:

```js
return JSON.stringify(window.NAC.describe());
```

يُمرَّر الناتج إلى Collection. يمكن للعملية التكيّف مع تغييرات مخطط البيان
دون إعادة تصريف المراحل.

## الترخيص وانظر أيضًا

Apache-2.0. انظر [RPA_UIPATH.md](RPA_UIPATH.md) للاطلاع على المعالجة الأشمل.

---

*This is a machine translation of the canonical English
version at `/nac-spec/guides/RPA_BLUE_PRISM.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
