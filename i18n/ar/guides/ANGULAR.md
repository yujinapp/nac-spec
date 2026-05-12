---
translation_source: guides/ANGULAR.md
translation_source_hash: db5a73d8ddcd813e9bac7918d3e48e9834f98d5f60e855ace8c2f9df7cc0f0af
translation_quality: machine_v1
translation_lang: ar
translation_date: 2026-05-11T15:09:28.328111+00:00
---

# دليل اعتماد NAC3 مع Angular

يوضح هذا الدليل طريقتين لتحويل تطبيق Angular إلى تطبيق مدار بـ NAC:

- **Greenfield:** مشروع جديد، يُدمج NAC3 منذ `ng new`.
- **Brownfield:** تطبيق قائم، يُضاف إليه NAC3 تدريجيًا دون إعادة كتابة.

تم الاختبار مع Angular 17+ (المكوّنات المستقلة، والإشارات، و inject).
كما يغطي الدليل الشكل القديم لـ Angular (NgModules). الحزمة المستخدمة هي `@nac3/runtime` ذاتها المستخدمة مع React؛ والفرق يكمن في مدى ملاءمة طريقة التكامل لأسلوب Angular.

---

## 1. التثبيت

```
npm install @nac3/runtime
```

يُدرج Angular الحزمة عبر خط أنابيب البناء القياسي (esbuild
في الإصدار 17+، وwebpack في الإصدارات الأقدم). لا حاجة لأي إعداد إضافي في `angular.json`.

---

## 2. Greenfield -- تطبيق جديد

### 2.1 تشغيل وقت التشغيل مرة واحدة

في `main.ts`:

```ts
import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { AppComponent } from './app/app.component';
import { routes } from './app/app.routes';
import '@nac3/runtime';
import '@nac3/runtime/extensions';
// optional: import '@nac3/runtime/chat-client';

bootstrapApplication(AppComponent, {
  providers: [provideRouter(routes)]
}).then(() => {
  // window.NAC is now ready. Configure tenant + provenance once.
  if ((window as any).NAC?.setTenantPrefix) {
    (window as any).NAC.setTenantPrefix('demo');
  }
});
```

بالنسبة للمشاريع القديمة التي تستخدم `app.module.ts` (NgModule)، تُضاف نفس عمليات الاستيراد في ملف الوحدة قبل استدعاء `platformBrowserDynamic().bootstrapModule(...)`.

### 2.2 خدمة NAC3 -- مركزة التسجيل

```ts
// nac.service.ts
import { Injectable, OnDestroy } from '@angular/core';

declare global {
  interface Window { NAC?: any; }
}

export interface NACManifest {
  plugin_slug: string;
  nac_version?: string;
  elements?: Array<{
    id: string; role: string;
    label_i18n?: Record<string, string>;
    actions?: Array<{ verb: string; label_i18n?: Record<string, string> }>;
  }>;
  tabs?: Array<{ nac_id: string; label_i18n?: Record<string, string> }>;
}

@Injectable({ providedIn: 'root' })
export class NacService {
  get runtime() { return window.NAC; }

  register(manifest: NACManifest) {
    if (!this.runtime) {
      console.warn('NAC runtime not ready, skipping register for', manifest.plugin_slug);
      return;
    }
    this.runtime.register(manifest);
  }

  click(id: string)                       { return this.runtime?.click(id); }
  click_by_verb(plugin: string|null, verb: string) { return this.runtime?.click_by_verb(plugin, verb); }
  fill(id: string, value: any)            { return this.runtime?.fill(id, value); }
  tab(plugin: string, tab_key: string)    { return this.runtime?.tab(plugin, tab_key); }
  describe()                              { return this.runtime?.describe(); }
  validate_global()                       { return this.runtime?.validate_global(); }

  /* v2.2 helper. */
  bindAction(el: HTMLElement, handler: (ev: Event) => void | Promise<unknown>,
             ctx: { plugin: string; action_id: string }) {
    return this.runtime?.bindAction(el, handler, ctx);
  }
}
```

### 2.3 تزيين المكوّنات

```ts
import { Component, OnInit, ElementRef, inject, ViewChild, AfterViewInit, OnDestroy } from '@angular/core';
import { NacService } from './nac.service';

const INVOICE_MANIFEST = {
  plugin_slug: 'invoice',
  nac_version: '2.2',
  elements: [
    {
      id: 'invoice.client_name', role: 'field',
      label_i18n: { es:'Nombre',en:'Name',pt:'Nome',fr:'Nom',
                    it:'Nome',de:'Name',ja:'名前',zh:'姓名',
                    hi:'naam',ar:'الاسم' }
    },
    {
      id: 'invoice.save', role: 'action',
      actions: [{ verb: 'save', label_i18n: { es:'Guardar',en:'Save',
                  pt:'Salvar',fr:'Sauver',it:'Salva',de:'Speichern',
                  ja:'保存',zh:'保存',hi:'sahejna',ar:'حفظ' } }],
      label_i18n: { es:'Guardar factura',en:'Save invoice',
                    pt:'Salvar fatura',fr:'Sauver facture',
                    it:'Salva fattura',de:'Rechnung speichern',
                    ja:'請求書保存',zh:'保存发票',
                    hi:'invoice sahejen',ar:'حفظ الفاتورة' }
    }
  ]
};

@Component({
  selector: 'app-invoice-form',
  standalone: true,
  template: `
    <article data-nac-plugin="invoice">
      <input type="text"
             data-nac-id="invoice.client_name"
             data-nac-role="field"
             [(ngModel)]="clientName">

      <button #saveBtn
              data-nac-id="invoice.save"
              data-nac-role="action"
              data-nac-action="save"
              (click)="onSave()">
        Save
      </button>
    </article>
  `
})
export class InvoiceFormComponent implements OnInit, AfterViewInit, OnDestroy {
  private nac = inject(NacService);
  @ViewChild('saveBtn', { static: true }) saveBtn!: ElementRef<HTMLButtonElement>;

  clientName = '';
  private unbind: (() => void) | undefined;

  ngOnInit() {
    this.nac.register(INVOICE_MANIFEST);
  }

  ngAfterViewInit() {
    /* v2.2: bindAction wraps the click + emits the ack so any
       agent awaiting NAC.click('invoice.save') resolves cleanly. */
    this.unbind = this.nac.bindAction(
      this.saveBtn.nativeElement,
      () => this.onSave(),
      { plugin: 'invoice', action_id: 'invoice.save' }
    );
  }

  ngOnDestroy() {
    this.unbind?.();
  }

  async onSave() {
    // ... your save logic ...
  }
}
```

### 2.4 NacIdDirective -- الاختصار الملائم لـ Brownfield

بالنسبة للتزيين المتكرر، يبدو استخدام موجّه السمات أكثر توافقًا مع أسلوب Angular مقارنةً بكتابة ثلاثية `data-nac-*` يدويًا. يكفي تطبيقه مرة واحدة، وسيتولى الموجّه ضبط السمات الثلاث:

```ts
// nac-id.directive.ts
import { Directive, ElementRef, Input, OnInit } from '@angular/core';

@Directive({
  selector: '[nacId]',
  standalone: true
})
export class NacIdDirective implements OnInit {
  @Input({ required: true }) nacId!: string;
  @Input() nacRole: 'action' | 'field' | 'tab' | 'option' | 'data-table' | string = 'action';
  @Input() nacAction?: string;

  constructor(private el: ElementRef<HTMLElement>) {}

  ngOnInit() {
    const e = this.el.nativeElement;
    e.setAttribute('data-nac-id', this.nacId);
    e.setAttribute('data-nac-role', this.nacRole);
    if (this.nacAction) {
      e.setAttribute('data-nac-action', this.nacAction);
    }
  }
}
```

مثال على الاستخدام:

```html
<button nacId="invoice.save" nacRole="action" nacAction="save"
        (click)="onSave()">
  Save
</button>
```

### 2.5 NacActionDirective -- تغليف bindAction تلقائيًا

يُغلّف `bindAction` بحيث يُصدر أي معالج `(click)` مزيَّن بـ `nacAction` تلقائيًا عقد الإقرار الخاص بالإصدار v2.2:

```ts
// nac-action.directive.ts
import { Directive, ElementRef, Input, OnInit, OnDestroy, inject } from '@angular/core';
import { NacService } from './nac.service';

@Directive({
  selector: '[nacAction]',
  standalone: true
})
export class NacActionDirective implements OnInit, OnDestroy {
  @Input({ required: true }) nacAction!: { plugin: string; actionId: string };
  private nac = inject(NacService);
  private unbind?: () => void;

  constructor(private el: ElementRef<HTMLElement>) {}

  ngOnInit() {
    /* The element MUST already have a (click) handler attached
       by Angular at this point. We add ours alongside; the v2.2
       runtime emits the ack after both have run. */
    this.unbind = this.nac.bindAction(
      this.el.nativeElement,
      () => { /* contract event only -- the user's (click) runs separately */ },
      { plugin: this.nacAction.plugin, action_id: this.nacAction.actionId }
    );
  }

  ngOnDestroy() { this.unbind?.(); }
}
```

مثال على الاستخدام:

```html
<button nacId="invoice.save" nacRole="action" nacAction="save"
        [nacAction]="{ plugin: 'invoice', actionId: 'invoice.save' }"
        (click)="onSave()">
  Save
</button>
```

(نعم، محدد الموجّه `nacAction` يتداخل مع مدخل الاختصار `data-nac-action`. من الناحية العملية، يختار كل مشروع أحد النمطين؛ وهذا القسم موجّه للمطوّرين الراغبين في استخدام تغليف `bindAction`.)

---

## 3. Brownfield -- التطبيق القائم

المبدأ (كما هو الحال في React): لا تُعيد هيكلة كل شيء دفعةً واحدة.

### 3.1 ترتيب العمل

1. **الغلاف الخارجي أولاً.** أضف `data-nac-plugin="<your-app-slug>"`
   إلى العنصر الأعلى في قالب `<app-root>`. تلتقطه شجرة النطاق في وقت التشغيل فوراً.
2. **الأزرار الأكثر استخداماً بعد ذلك.** حفظ / إلغاء / إرسال / حذف
   في الشاشات الأكثر نشاطاً. أضف السمات الثلاث `data-nac-*`
   مباشرةً في القالب (أو عبر `NacIdDirective`).
3. **التحقق في DevTools.** شغّل `window.NAC.describe()` من
   وحدة تحكم المتصفح. يجب أن تظهر الأزرار تحت مُعرِّف الإضافة الخاص بك.
4. **أضف ملف manifest.** فقط الأزرار من الخطوة 2، مع الأفعال.
   `NAC.click_by_verb()` يعمل الآن.
5. **أضف الحقول والتبويبات.** تحصل المدخلات على `role="field"`. تحصل التبويبات على
   `role="tab"` -- **ملاحظة**: المُعرِّفات المطابقة للنمط `^tab\.` يجب أن تحمل الدور
   `'tab'` وفقاً للمواصفة القسم 1 + المدقق الصارم V22-01.

### 3.2 العمل مع Angular Material / PrimeNG / Taiga

تتيح معظم مكتبات مكوّنات Angular ربط المدخلات بأسلوب `[attr.data-nac-*]`
أو تمرير السمات غير المعروفة مباشرةً إلى العنصر المضيف.
نمطان شائعان:

**النمط A: ربط السمة مباشرةً.**

```html
<!-- Material -->
<button mat-raised-button
        [attr.data-nac-id]="'invoice.save'"
        [attr.data-nac-role]="'action'"
        [attr.data-nac-action]="'save'"
        (click)="onSave()">
  Save
</button>
```

**النمط B: NacIdDirective على العنصر الغلاف.**

إذا كانت المكتبة تُصيِّر عنصراً مضيفاً وأردت تطبيق NAC3 على
الزر الداخلي، فاستخدم غلافاً:

```html
<span nacId="invoice.save" nacRole="action" nacAction="save"
      (click)="onSave()">
  <button mat-raised-button>Save</button>
</span>
```

يعتمد وقت تشغيل NAC3 على `data-nac-id` لا على نوع العنصر، لذا يعمل هذا بشكل صحيح.

### 3.3 التسجيل التلقائي من DOM

نفس نمط `autoRegister.watch` المستخدم في React:

```ts
// in your AppComponent ngAfterViewInit:
const root = document.querySelector('[data-nac-plugin]') as HTMLElement;
if (root && (window as any).NAC?.autoRegister) {
  root.setAttribute('data-nac-watch', '1');
  (window as any).NAC.autoRegister.watch(root, {
    i18n_strict: 'permissive',
    throttleMs: 100
  });
}
```

بدّل `i18n_strict` إلى `'strict'` بمجرد أن يغطي كتالوج الترجمة لديك
جميع لغات NAC3 العشر.

---

## 4. التوجيه ودورة الحياة

لقطة NAC3 هي **ما هو مُحمَّل حالياً**. مع موجّه Angular يعني ذلك:

- المكوّن الذي يُحمَّل عند التنقل بين المسارات يُسجِّل ملف manifest
  الخاص به في `ngOnInit`.
- المكوّن الذي يُفرَّغ عند التنقل يجب أن يستدعي
  `NAC.unregister(plugin_slug)` في `ngOnDestroy` حتى لا تظهر
  الإضافات القديمة في لقطة الوكيل.

```ts
ngOnDestroy() {
  this.nac.runtime?.unregister?.('invoice');
}
```

بالنسبة لمكوّنات الغلاف طويلة الأمد (الشريط العلوي، الشريط الجانبي)،
لا تُلغِ التسجيل -- يجب أن تبقى دائماً في الشجرة.

---

## 5. الاختبار

### 5.1 TestBed / Karma

```ts
import { TestBed } from '@angular/core/testing';
import { InvoiceFormComponent } from './invoice-form.component';
import '@nac3/runtime';

describe('InvoiceFormComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [InvoiceFormComponent]
    });
  });

  it('save button drives via NAC', async () => {
    const fixture = TestBed.createComponent(InvoiceFormComponent);
    fixture.detectChanges();

    let acked = false;
    document.addEventListener('nac:action:succeeded', () => { acked = true; });

    await (window as any).NAC.click('invoice.save');

    expect(acked).toBe(true);
  });
});
```

### 5.2 Playwright (e2e)

كما هو الحال في دليل React:

```ts
import { test, expect } from '@playwright/test';

test('invoice save', async ({ page }) => {
  await page.goto('/invoices/new');
  await page.evaluate(() => (window as any).NAC.fill('invoice.client_name', 'Acme'));
  await page.evaluate(() => (window as any).NAC.click('invoice.save'));
  await expect(page.getByText('Invoice saved')).toBeVisible();
});
```

---

## 6. المشكلات الشائعة

- **مُعرِّفات قديمة في `*ngFor`.** إذا بنيت المُعرِّفات من الفهرس
  (`data-nac-id="row.{{i}}"`), فإن الوكلاء الذين خزّنوا مُعرِّفاً ما سيتعطلون عند إعادة الترتيب. استخدم مفاتيح ثابتة (مُعرِّفات قاعدة البيانات).
- **حلقات الكشف عن التغييرات والتسجيل.** لا تُسجِّل ملف manifest
  في `ngOnChanges` أو في دالة getter تعمل في كل دورة كشف. `ngOnInit` مرةً واحدة هو المكان الصحيح.
- **الوضع الصارم + zone.js.** تتدفق أحداث NAC3 عبر المستند العام؛
  وهي ليست zone-aware بشكل افتراضي. إذا احتجت إلى معالجة zone-aware، فاستخدم الغلاف التالي:
  ```ts
  this.zone.run(() => { /* respond to nac:action:succeeded */ });
  ```
- **SSR (Angular Universal).** NAC3 مخصص للمتصفح فقط. احمِ الخدمة:
  ```ts
  if (isPlatformBrowser(this.platformId)) {
    this.nac.register(...);
  }
  ```

---

## 7. قائمة التحقق قبل الإنتاج

قبل الإطلاق:

1. استبدل `i18n_strict: 'permissive'` بـ `'strict'`. يرصد CI
   الترجمات المفقودة.
2. شغّل `npx @nac3/runtime validate ./src` -- توقّع صفراً من النتائج ذات مستوى الخطأ.
3. اضبط `(window as any).NAC.STRICT_VALIDATION = true` في إقلاع
   الإنتاج لديك لتفعيل فحوصات التسجيل وفق v2.2 (manifest_role_unknown
   وما شابهها) كاستثناءات.
4. من اختبار Playwright، تحقق من أن `NAC.validate_global()` تُعيد
   `[]`.
5. البيئات متعددة المستأجرين: وقّع ملفات manifest بـ HMAC من جانب الخادم
   واستدعِ `NAC.set_provenance_secret()` من الكود المُصادَق عليه.

---

## 8. الخطوات التالية

- `SPEC.md` للعقد الكامل.
- `guides/REACT.md` للمقارنة بين الأطر المختلفة.
- `guides/LLM_WIRING.md` للواجهة الخلفية الوسيطة.
- `SECURITY.md` لنموذج التهديدات.
- العروض التوضيحية على yujin.app/nac-spec/ (`example.php` مرجع الإصدار v1.9؛
  `example-v20-full.php` ترحيل brownfield؛ `example-v21-data-table.php`
  جدول البيانات + الدردشة).

---

*This is a machine translation of the canonical English
version at `/nac-spec/guides/ANGULAR.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
