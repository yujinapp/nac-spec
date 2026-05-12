---
translation_source: guides/ANGULAR.md
translation_source_hash: db5a73d8ddcd813e9bac7918d3e48e9834f98d5f60e855ace8c2f9df7cc0f0af
translation_quality: machine_v1
translation_lang: hi
translation_date: 2026-05-11T14:57:47.072908+00:00
---

# NAC3 + Angular अपनाने की गाइड

यह गाइड एक Angular ऐप को दो तरीकों से NAC-संचालित बनाती है:

- **Greenfield:** नया प्रोजेक्ट, NAC3 को `ng new` से ही इंटीग्रेट किया गया।
- **Brownfield:** मौजूदा ऐप, NAC3 को धीरे-धीरे जोड़ा गया, कोई rewrite नहीं।

Angular 17+ (standalone components, signals, inject) के साथ परीक्षित।
पुराना Angular (NgModules) स्वरूप भी कवर किया गया है। React जैसा ही `@nac3/runtime`
पैकेज है; फ़र्क सिर्फ यह है कि Angular-idiomatic तरीके से glue कितना स्वाभाविक लगता है।

---

## 1. इंस्टॉल करें

```
npm install @nac3/runtime
```

Angular इस पैकेज को अपनी मानक build pipeline (17+ में esbuild,
पुराने में webpack) के ज़रिए बंडल करता है। `angular.json` में कोई अतिरिक्त कॉन्फ़िग नहीं चाहिए।

---

## 2. Greenfield -- नया ऐप

### 2.1 Runtime को एक बार बूट करें

`main.ts` में:

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
  // window.NAC अब तैयार है। Tenant + provenance एक बार कॉन्फ़िगर करें।
  if ((window as any).NAC?.setTenantPrefix) {
    (window as any).NAC.setTenantPrefix('demo');
  }
});
```

पुराने `app.module.ts` (NgModule) के लिए, वही imports
`platformBrowserDynamic().bootstrapModule(...)` से पहले module फ़ाइल में डालें।

### 2.2 NAC3 सर्विस -- रजिस्ट्रेशन केंद्रीकृत करें

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

### 2.3 Components को डेकोरेट करें

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
    /* v2.2: bindAction क्लिक को wrap करता है + ack emit करता है ताकि
       NAC.click('invoice.save') का इंतज़ार कर रहा कोई भी agent
       cleanly resolve हो सके। */
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
    // ... आपका save logic यहाँ ...
  }
}
```

### 2.4 NacIdDirective -- Brownfield के लिए सुविधाजनक शॉर्टकट

बार-बार decoration के लिए, एक attribute directive कच्चे `data-nac-*` triple की
तुलना में ज़्यादा Angular-idiomatic लगती है। इसे एक बार लगाएं, directive तीनों
attrs खुद सेट कर देती है:

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

उपयोग:

```html
<button nacId="invoice.save" nacRole="action" nacAction="save"
        (click)="onSave()">
  Save
</button>
```

### 2.5 NacActionDirective -- मुफ़्त में bindAction

`bindAction` को wrap करती है ताकि `nacAction` से decorated कोई भी `(click)` handler
स्वचालित रूप से v2.2 ack contract emit करे:

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
    /* इस बिंदु पर element में Angular का (click) handler पहले से
       attached होना चाहिए। हम अपना handler उसके साथ जोड़ते हैं;
       v2.2 runtime दोनों के चलने के बाद ack emit करता है। */
    this.unbind = this.nac.bindAction(
      this.el.nativeElement,
      () => { /* केवल contract event -- यूज़र का (click) अलग से चलता है */ },
      { plugin: this.nacAction.plugin, action_id: this.nacAction.actionId }
    );
  }

  ngOnDestroy() { this.unbind?.(); }
}
```

उपयोग:

```html
<button nacId="invoice.save" nacRole="action" nacAction="save"
        [nacAction]="{ plugin: 'invoice', actionId: 'invoice.save' }"
        (click)="onSave()">
  Save
</button>
```

(हाँ, directive selector `nacAction` का `data-nac-action` shorthand input से overlap होता है।
व्यवहार में आप प्रति प्रोजेक्ट दोनों में से एक pattern चुनते हैं; यह सेक्शन उन adopters के लिए है
जो bindAction wrapper चाहते हैं।)

---

## 3. Brownfield -- मौजूदा ऐप

सिद्धांत (React जैसा ही): एक साथ सब कुछ refactor न करें।

### 3.1 काम करने का क्रम

1. **पहले top-level shell।** अपने `<app-root>` template के सबसे बाहरी wrapper में `data-nac-plugin="<your-app-slug>"` जोड़ें। Runtime scope tree इसे तुरंत पहचान लेती है।
2. **इसके बाद सबसे ज़्यादा इस्तेमाल होने वाले buttons।** अपनी सबसे व्यस्त screens में Save / Cancel / Submit / Delete। Template में सीधे तीनों `data-nac-*` attrs जोड़ें (या `NacIdDirective` के ज़रिए)।
3. **DevTools में जाँचें।** Browser console से `window.NAC.describe()` चलाएँ। Buttons आपके plugin slug के अंतर्गत दिखने चाहिए।
4. **Manifest जोड़ें।** बस step 2 के buttons, verbs के साथ। `NAC.click_by_verb()` अब काम करेगा।
5. **Fields + tabs जोड़ें।** Inputs को `role="field"` मिलता है। Tabs को `role="tab"` -- **ध्यान दें** `^tab\.` से मेल खाने वाले ids में spec sec 1 + V22-01 strict validator के अनुसार role `'tab'` होना **अनिवार्य** है।

### 3.2 Angular Material / PrimeNG / Taiga के साथ काम करना

अधिकांश Angular component libraries `[attr.data-nac-*]`-style input bindings expose करती हैं या host element को unknown attrs सीधे forward कर देती हैं। दो patterns:

**Pattern A: सीधे attribute binding।**

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

**Pattern B: wrapper पर NacIdDirective।**

अगर library एक host element render करती है और आप inner button पर NAC3 चाहते हैं, तो उसे wrap करें:

```html
<span nacId="invoice.save" nacRole="action" nacAction="save"
      (click)="onSave()">
  <button mat-raised-button>Save</button>
</span>
```

NAC3 runtime tag से नहीं, `data-nac-id` से resolve करता है, इसलिए यह काम करता है।

### 3.3 DOM से Auto-register

React जैसा ही `autoRegister.watch` pattern:

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

जब आपका translation catalogue सभी 10 NAC3 locales को cover कर ले, तब `i18n_strict` को `'strict'` पर बदलें।

---

## 4. Routing + lifecycle

NAC3 का snapshot **वही है जो अभी mounted है**। Angular के router के साथ इसका मतलब है:

- जो component route navigation पर mount होता है, वह `ngOnInit` में अपना manifest register करता है।
- जो component navigation पर unmount होता है, उसे `ngOnDestroy` में `NAC.unregister(plugin_slug)` call करना चाहिए ताकि पुराने plugins agent के snapshot में न दिखें।

```ts
ngOnDestroy() {
  this.nac.runtime?.unregister?.('invoice');
}
```

लंबे समय तक चलने वाले shell components (topbar, sidebar) के लिए unregister **न करें** -- वे हमेशा tree में रहने चाहिए।

---

## 5. Testing

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

React guide जैसा ही:

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

## 6. आम गलतियाँ

- **`*ngFor` में stale ids।** अगर आप index से ids बनाते हैं (`data-nac-id="row.{{i}}"`), तो reorder होने पर cached id वाले agents टूट जाते हैं। Stable keys (DB ids) इस्तेमाल करें।
- **Change detection + register loops।** Manifest को `ngOnChanges` में या किसी ऐसे getter में register **न करें** जो हर CD cycle में चलता हो। सही जगह है `ngOnInit`, एक बार।
- **Strict mode + zone.js।** NAC3 events global document से flow होते हैं; ये default रूप से zone-aware नहीं होते। अगर zone-aware handling चाहिए, तो अपना listener wrap करें:
  ```ts
  this.zone.run(() => { /* respond to nac:action:succeeded */ });
  ```
- **SSR (Angular Universal)।** NAC3 केवल browser के लिए है। Service को guard करें:
  ```ts
  if (isPlatformBrowser(this.platformId)) {
    this.nac.register(...);
  }
  ```

---

## 7. Production checklist

Ship करने से पहले:

1. `i18n_strict: 'permissive'` को `'strict'` से बदलें। CI missing translations पकड़ेगा।
2. `npx @nac3/runtime validate ./src` चलाएँ -- zero error-severity findings की उम्मीद रखें।
3. अपने prod boot में `(window as any).NAC.STRICT_VALIDATION = true` set करें ताकि v2.2 register-time checks (manifest_role_unknown आदि) throws के रूप में enforce हों।
4. Playwright test से assert करें कि `NAC.validate_global()` `[]` return करता है।
5. Multi-tenant: Server-side HMAC-sign manifests करें और authed code से `NAC.set_provenance_secret()` call करें।

---

## 8. आगे कहाँ जाएँ

- पूरे contract के लिए `SPEC.md`।
- Cross-framework तुलना के लिए `guides/REACT.md`।
- Intermediary backend के लिए `guides/LLM_WIRING.md`।
- Threat model के लिए `SECURITY.md`।
- yujin.app/nac-spec/ पर demos (`example.php` v1.9 reference; `example-v20-full.php` brownfield migration; `example-v21-data-table.php` data-table + chat)।

---

*This is a machine translation of the canonical English
version at `/nac-spec/guides/ANGULAR.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
