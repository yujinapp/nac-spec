---
translation_source: guides/RPA_PLAYWRIGHT.md
translation_source_hash: c90a4cc097a692f6fd51ae96eed88a67cadbd94b52bed4bba18af184a4b915bf
translation_quality: machine_v1
translation_lang: ar
translation_date: 2026-05-11T15:20:20.825975+00:00
---

# دليل تكامل NAC3 + Playwright

**إصدار NAC3:** 2.2 (مع معاينة التوافق مع v2.3)
**الحالة:** مستقر. تم الاختبار مع Playwright 1.47 + chromium / firefox / webkit.

Playwright هو المعيار الفعلي لأتمتة المتصفح اليوم، تستخدمه فرق ضمان الجودة (اختبارات شاملة من البداية إلى النهاية) وسير عمل RPA الخفيفة التي تعمل دون تدخل بشري. مع NAC3، تتوقف سكريبتات Playwright عن استهداف محددات CSS أو XPath وتبدأ في الإرسال عبر عقد NAC3 الخاص بالصفحة -- العقد ذاته الذي تستخدمه مشغّلات الصوت وأدوات إمكانية الوصول وسير عمل LLM الذكية ومنصات RPA الأخرى في هذه السلسلة من الأدلة.

مجموعة اختبارات Yujin المرجعية
(`tests/e2e-nac/specs/*.spec.ts`) هي المثال الأساسي المعتمد.

## لماذا NAC3 + Playwright

| المشكلة الحالية | الحل مع NAC3 |
|----------------|-------------|
| `page.click('button.save')` ينكسر عند إعادة تسمية فئة CSS | `page.evaluate(() => window.NAC.click('invoice.save'))` مستقر |
| `page.getByRole('button', {name: 'Save'})` ينكسر عند الترجمة | الإرسال بالمعرّف لا بالتسمية؛ label_i18n شأن LLM |
| `waitForSelector` يستطلع DOM وهو هش مع الواجهات غير المتزامنة | `nac:action:succeeded` حدث حتمي |
| نمط Page-Object يكرّر بنية واجهة التطبيق | مانيفست NAC3 هو Page Object بحد ذاته -- مشترك بين الاختبارات والتطبيق |
| الاختبارات البصرية تتأثر بإعادة التصميم الشكلية | اختبارات السلوك عبر معرّفات NAC3 تصمد أمام إعادة التصميم |

---

## مساران للتكامل

### المسار A -- حقن `page.evaluate` (موصى به)

النمط الأبسط: كل تفاعل يمر عبر `window.NAC` المُقيَّم في سياق الصفحة.

```ts
import { test, expect } from '@playwright/test';

test('save an invoice', async ({ page }) => {
  await page.goto('https://your-app.example.com/');

  // Wait for NAC3 to mount.
  await page.waitForFunction(() => window.NAC?.describe);

  // Fill a field.
  await page.evaluate(() =>
    window.NAC.fill('invoice.amount', '1500')
  );

  // Click an action + wait for its ack.
  const ackPromise = page.evaluate(() =>
    new Promise(resolve => {
      document.addEventListener(
        'nac:action:succeeded',
        e => resolve(e.detail),
        { once: true }
      );
    })
  );
  await page.evaluate(() =>
    window.NAC.click('invoice.save')
  );
  const ack = await ackPromise;

  expect(ack).toMatchObject({
    plugin: 'invoice',
    action_id: 'invoice.save'
  });
});
```

### المسار B -- تغليف NAC في fixtures مخصصة

لفّ الكود المتكرر داخل fixture خاصة بـ Playwright:

```ts
// tests/fixtures/nac.ts
import { test as base, Page } from '@playwright/test';

type NacApi = {
  click: (id: string) => Promise<void>;
  fill:  (id: string, value: string) => Promise<void>;
  tab:   (plugin: string, tabKey: string) => Promise<void>;
  describe: () => Promise<any>;
  waitForAck: () => Promise<any>;
};

export const test = base.extend<{ nac: NacApi }>({
  nac: async ({ page }, use) => {
    await page.waitForFunction(() => window.NAC?.describe);
    const api: NacApi = {
      click:  id => page.evaluate(i => window.NAC.click(i), id),
      fill:   (id, v) => page.evaluate(
        ([i, val]) => window.NAC.fill(i, val), [id, v]
      ),
      tab:    (p, k) => page.evaluate(
        ([pl, key]) => window.NAC.tab(pl, key), [p, k]
      ),
      describe: () => page.evaluate(() => window.NAC.describe()),
      waitForAck: () => page.evaluate(() =>
        new Promise(resolve => {
          document.addEventListener(
            'nac:action:succeeded',
            e => resolve(e.detail),
            { once: true }
          );
        })
      )
    };
    await use(api);
  }
});

export { expect } from '@playwright/test';
```

الآن تبدو اختباراتك وكأنها تتحدث بلغة التطبيق:

```ts
import { test, expect } from './fixtures/nac';

test('save flow', async ({ page, nac }) => {
  await page.goto('https://your-app.example.com/');
  await nac.fill('invoice.amount', '1500');

  const ackPromise = nac.waitForAck();
  await nac.click('invoice.save');
  const ack = await ackPromise;

  expect(ack.action_id).toBe('invoice.save');
});
```

مرجع Yujin يستخدم المسار B (انظر
`tests/e2e-nac/specs/01-landing.spec.ts`).

---

## الإرسال القائم على الأفعال (مفضّل لإعادة الاستخدام عبر التطبيقات)

عندما يجب تشغيل مجموعة Playwright ذاتها على عدة نشرات (مستأجرون مختلفون، علامات تجارية مختلفة، عقد واحد)، يُفضَّل استخدام الأفعال بدلاً من المعرّفات:

```ts
await nac.clickByVerb('invoice', 'save');
```

الدالة المساعدة:

```ts
clickByVerb: (plugin: string, verb: string) =>
  page.evaluate(
    ([p, v]) => window.NAC.click_by_verb(p, v),
    [plugin, verb]
  )
```

عقد المانيفست: كل مستأجر يربط `invoice.save` (أو أي معرّف محلي يختاره) بالفعل `save`. الاختبار لا يحتاج إلى معرفة المعرّف المحلي.

---

## انتظار الإقرار (البديل الحتمي لـ `waitForSelector`)

الأسلوب التقليدي في Playwright:

```ts
await page.click('button.save');
await page.waitForSelector('.toast-success', { timeout: 5000 });
```

هذا هش: أي تغيير في واجهة الإشعار يكسره.

الأسلوب المدرك لـ NAC3:

```ts
const ack = await new Promise(resolve => {
  page.on('console', msg => { /* optional log */ });
  page.evaluate(() => new Promise(r =>
    document.addEventListener('nac:action:succeeded',
      e => r(e.detail), { once: true }
    )));
}).then(...);

// أو باستخدام fixture:
const ackPromise = nac.waitForAck();
await nac.click('invoice.save');
const ack = await ackPromise;
```

الحدث جزء من العقد. يُطلَق عند اكتمال الأثر الجانبي، لا عند ظهور إشعار عشوائي.

---

## الاكتشاف التلقائي لحالات الاختبار

`describe()` في NAC3 يُعيد الفهرس الكامل للعناصر. استخدمه لتوليد هيكل الاختبارات لكل إجراء تلقائياً:

```ts
test('smoke -- click every action', async ({ page, nac }) => {
  await page.goto('https://your-app.example.com/');
  const tree = await nac.describe();

  for (const plugin of tree.plugins) {
    for (const el of plugin.elements) {
      if (el.role !== 'action') continue;
      console.log('smoke clicking', el.id);
      await page.evaluate(id =>
        window.NAC.click(id), el.id
      );
    }
  }
});
```

اختبار واحد، كل الإجراءات، صفر صيانة لكل إجراء. يتكامل بشكل مثالي مع `validate_global({probe: true})` من المواصفة.

---

## تشغيل متعدد اللغات

تشغيل مصفوفة Playwright أمر بسيط: العقد مستقل عن اللغة.

```ts
const locales = ['es', 'en', 'pt', 'fr', 'de', 'ja',
                 'zh', 'hi', 'ar', 'it'];

for (const lang of locales) {
  test(`save invoice -- ${lang}`, async ({ page, nac }) => {
    await page.goto(`https://your-app.example.com/?lang=${lang}`);
    await nac.fill('invoice.amount', '1500');
    const ack = nac.waitForAck();
    await nac.click('invoice.save');
    expect((await ack).action_id).toBe('invoice.save');
  });
}
```

اختبار واحد، 10 لغات. تغيّرت label_i18n داخل الصفحة؛ العقد لم يتغير.

---

## لقطة للانحدار البصري

شجرة NAC3 هي اللقطة البنيوية بحد ذاتها. قارنها عبر الإصدارات:

```ts
test('structural snapshot', async ({ page, nac }) => {
  await page.goto('https://your-app.example.com/');
  const tree = await nac.describe();
  expect(tree).toMatchSnapshot('app-tree.json');
});
```

إعادة تصميم تنقل زراً بمقدار 200 بكسل لا تُحدث فرقاً في اللقطة. إعادة تصميم تُزيل الزر تُحدث فرقاً. هذا هو المستوى الصحيح من الدقة لاختبارات الانحدار السلوكي.

---

## اختبارات Cross-Origin / التوافق (معاينة v2.3)

```ts
test('interop import remote app', async ({ page, nac }) => {
  await page.goto('https://app-a.example.com/');
  await page.evaluate(() => window.NAC.import_remote_tree({
    url: 'https://app-b.example.com/nac/export',
    bearer: 'TEST_TOKEN',
    namespace: 'b'
  }));
  const remotes = await page.evaluate(() =>
    window.NAC.list_remote_apps()
  );
  expect(remotes).toContainEqual(
    expect.objectContaining({ namespace: 'b' })
  );

  // Now dispatch into the remote app via the local NAC:
  await page.evaluate(() =>
    window.NAC.click('remote:b:invoice.save')
  );
});
```

البادئة `remote:` تُوجَّه عبر طبقة التوافق الموثقة في
`docs/NAC_INTEROP_MCP.md`.

---

## أوضاع الفشل والتصحيح

| العَرَض | التشخيص |
|---------|---------|
| `window.NAC is undefined` | الصفحة لا تتضمن nac.js -- تحقق من وسم `<script>` |
| `NAC.click(...)` يُعيد `{ok: false, error: 'not_found'}` | المعرّف غير موجود في المانيفست؛ شغّل `NAC.validate_global()` للكشف عن الأخطاء المطبعية |
| الإقرار لا يُطلَق أبداً (الاختبار يتوقف عند waitForAck) | المعالج يفتقر إلى `dispatchEvent(new CustomEvent('nac:action:succeeded',...))` -- انتقل إلى `NAC.bindAction()` (V22-02) |
| اختبار التسمية المعتمد على اللغة يفشل للغة واحدة | label_i18n لا يتضمن تلك اللغة -- مدقق المواصفة يكتشف هذا |
| اختبار Cross-origin يفشل عند CORS preflight | يجب أن يسمح الطرف البعيد بـ `Origin: <your-test-host>` في إعدادات CORS |

للتصحيح المعمّق، أضف:

```ts
await page.evaluate(() => {
  document.addEventListener('nac:action:succeeded', e =>
    console.log('[ACK]', e.detail));
  document.addEventListener('nac:action:failed', e =>
    console.warn('[ACK-FAIL]', e.detail));
});
```

ثم شغّل `--headed` وراقب وحدة التحكم.

---

## مجموعة مرجع Yujin

تأتي عروض Yujin مع مجموعة Playwright كاملة في
`tests/e2e-nac/specs/`. اقرأها بالترتيب لتتعلم الأنماط:

| الملف | النمط |
|-------|-------|
| `01-landing.spec.ts` | تحميل الصفحة الأساسي + بدء الطيار الآلي |
| `02-demo-v19.spec.ts` | اختبار دخاني لكل عنصر واجهة |
| `03-demo-v20.spec.ts` | أزرار v20-panel + إقرار bindAction |
| `04-demo-v21.spec.ts` | إرسالات dt_* لجدول البيانات |
| `05-demo-v22-interop.spec.ts` | مصافحة كاملة لتوافق v2.3 |
| `06-demo-react.spec.ts` | حالة دراسة React عبر الدردشة |
| `07-demo-angular.spec.ts` | حالة دراسة Angular عبر الدردشة |
| `08-pipeline-end-to-end.spec.ts` | دردشة -> LLM -> إرسال -> إقرار |
| `09-diagnostic.spec.ts` | حقن الأعطال والتعافي منها |
| `10-deep-discovery.spec.ts` | حلقة اكتشاف ذاتية |

جميع الـ 16 ملفاً تعمل عبر `bash tools/nac/test-launch.sh` في أقل من 15 ثانية على نسخة نظيفة.

---

## التكامل مع CI

أضف هذا في `.github/workflows/e2e.yml`:

```yaml
name: e2e
on: [push, pull_request]
jobs:
  playwright:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - run: npx playwright test
        env:
          BASE_URL: https://staging.your-app.example.com
```

لتشغيل المصفوفة عبر لغات / متصفحات / مستأجرين:

```yaml
strategy:
  matrix:
    locale: [es, en, pt, fr, de, ja, zh, hi, ar, it]
    browser: [chromium, firefox, webkit]
```

10 لغات × 3 متصفحات = 30 مهمة، جميعها تعيد استخدام كود الاختبار المُرسَل عبر NAC3.

---

## مقارنة مع اختبارات Playwright التقليدية

تطبيق مؤسسي نموذجي من 100 صفحة يحتفظ بـ 500-800 اختبار Playwright، مع معدل هشاشة ~20% بعد إعادة تصميم الواجهة. مع NAC3:

| المقياس | التقليدي | مدعوم بـ NAC3 |
|---------|----------|--------------|
| عدد الاختبارات لتغطية مماثلة | ~500 | ~100 (قائم على الأفعال) |
| معدل الهشاشة بعد إعادة التصميم | ~20% | ~2% (فقط عند كسر العقد فعلياً) |
| الصيانة بعد استبدال `<button>` بـ `<a>` | إعادة كتابة المحدد | لا شيء -- المعرّف مستقر |
| دعم لغة جديدة | إعادة كتابة كل المحددات القائمة على التسمية | لا شيء -- مستقل عن اللغة |
| إعادة الاستخدام عبر المستأجرين | مستحيل (المحددات تختلف) | بسيط (قائم على الأفعال) |

---

## انظر أيضاً

- `tests/e2e-nac/specs/` -- المجموعة المرجعية.
- `tools/nac/test-launch.sh` -- المنسّق.
- [IMPACT_TESTING.md](IMPACT_TESTING.md) -- تحليل الأثر الشامل لفرق ضمان الجودة.
- [LLM_WIRING.md](LLM_WIRING.md) -- عقد الإرسال ذاته الذي تستخدمه وكلاء LLM.
- `docs/NAC_TEST_MANUAL.md` -- دليل الاختبار الموحّد.

## الرخصة

Apache-2.0.

---

*This is a machine translation of the canonical English
version at `/nac-spec/guides/RPA_PLAYWRIGHT.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
