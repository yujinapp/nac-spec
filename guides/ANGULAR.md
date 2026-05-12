# NAC3 + Angular adoption guide

This guide gets an Angular app NAC-driven via two paths:

- **Greenfield:** new project, NAC3 integrated from `ng new`.
- **Brownfield:** existing app, NAC3 added progressively, no
  rewrite.

Tested with Angular 17+ (standalone components, signals, inject).
Older Angular (NgModules) shape is also covered. Same `@nac3/runtime`
package as React; the difference is how Angular-idiomatic the
glue feels.

---

## 1. Install

```
npm install @nac3/runtime
```

Angular bundles the package via its standard build pipeline (esbuild
in 17+, webpack in older). No extra `angular.json` config.

---

## 2. Greenfield -- new app

### 2.1 Boot the runtime once

In `main.ts`:

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

For older `app.module.ts` (NgModule), the same imports go into
the module file before `platformBrowserDynamic().bootstrapModule(...)`.

### 2.2 NAC3 service -- centralise registration

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

### 2.3 Decorate components

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

### 2.4 NacIdDirective -- the brownfield-friendly shortcut

For repetitive decoration, an attribute directive feels more
Angular-idiomatic than the raw `data-nac-*` triple. Apply it
once, the directive sets all three attrs:

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

Usage:

```html
<button nacId="invoice.save" nacRole="action" nacAction="save"
        (click)="onSave()">
  Save
</button>
```

### 2.5 NacActionDirective -- bindAction for free

Wraps `bindAction` so any (click) handler decorated with
`nacAction` automatically emits the v2.2 ack contract:

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

Usage:

```html
<button nacId="invoice.save" nacRole="action" nacAction="save"
        [nacAction]="{ plugin: 'invoice', actionId: 'invoice.save' }"
        (click)="onSave()">
  Save
</button>
```

(Yes, the directive selector `nacAction` overlaps with the
`data-nac-action` shorthand input. In practice you pick one of
the two patterns per project; this section is for adopters who
want the bindAction wrapper.)

---

## 3. Brownfield -- existing app

The principle (same as React): do not refactor everything at once.

### 3.1 Order of attack

1. **Top-level shell first.** Add `data-nac-plugin="<your-app-slug>"`
   to your `<app-root>` template's outermost wrapper. The runtime
   scope tree picks it up immediately.
2. **Most-used buttons next.** Save / cancel / submit / delete
   in your busiest screens. Add the three `data-nac-*` attrs
   directly in the template (or via `NacIdDirective`).
3. **Verify in DevTools.** Run `window.NAC.describe()` from the
   browser console. The buttons should appear under your plugin
   slug.
4. **Add a manifest.** Just the buttons from step 2, with verbs.
   `NAC.click_by_verb()` now works.
5. **Add fields + tabs.** Inputs get `role="field"`. Tabs get
   `role="tab"` -- **note** ids matching `^tab\.` MUST have role
   `'tab'` per spec sec 1 + V22-01 strict validator.

### 3.2 Working with Angular Material / PrimeNG / Taiga

Most Angular component libraries expose `[attr.data-nac-*]`-style
input bindings or simply forward unknown attrs to the host
element. Two patterns:

**Pattern A: attribute binding direct.**

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

**Pattern B: NacIdDirective on the wrapper.**

If the library renders a host element + you want NAC3 on the
inner button, wrap it:

```html
<span nacId="invoice.save" nacRole="action" nacAction="save"
      (click)="onSave()">
  <button mat-raised-button>Save</button>
</span>
```

The NAC3 runtime resolves by `data-nac-id`, not by tag, so this
works.

### 3.3 Auto-register from DOM

Same `autoRegister.watch` pattern as React:

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

Switch `i18n_strict` to `'strict'` once your translation catalogue
covers all 10 NAC3 locales.

---

## 4. Routing + lifecycle

NAC3's snapshot is **what is currently mounted**. With Angular's
router this means:

- A component that mounts on route navigation registers its
  manifest in `ngOnInit`.
- A component that unmounts on navigation should call
  `NAC.unregister(plugin_slug)` in `ngOnDestroy` so stale plugins
  don't appear in the agent's snapshot.

```ts
ngOnDestroy() {
  this.nac.runtime?.unregister?.('invoice');
}
```

For long-lived shell components (the topbar, the sidebar), do
NOT unregister -- they should always be in the tree.

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

Same as the React guide:

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

## 6. Common gotchas

- **Stale ids in `*ngFor`.** If you build ids from index
  (`data-nac-id="row.{{i}}"`), agents that cached an id break on
  reorder. Use stable keys (DB ids).
- **Change detection + register loops.** Do NOT register the
  manifest in `ngOnChanges` or in a getter that runs every CD
  cycle. `ngOnInit` once is the right place.
- **Strict mode + zone.js.** NAC3 events flow through the global
  document; they are NOT zone-aware by default. If you need
  zone-aware handling, wrap your listener:
  ```ts
  this.zone.run(() => { /* respond to nac:action:succeeded */ });
  ```
- **SSR (Angular Universal).** NAC3 is browser-only. Guard the
  service:
  ```ts
  if (isPlatformBrowser(this.platformId)) {
    this.nac.register(...);
  }
  ```

---

## 7. Production checklist

Before shipping:

1. Replace `i18n_strict: 'permissive'` with `'strict'`. CI catches
   missing translations.
2. Run `npx @nac3/runtime validate ./src` -- expect zero error-severity
   findings.
3. Set `(window as any).NAC.STRICT_VALIDATION = true` in your
   prod boot to enforce v2.2 register-time checks (manifest_role_unknown
   etc.) as throws.
4. From a Playwright test, assert `NAC.validate_global()` returns
   `[]`.
5. Multi-tenant: HMAC-sign manifests server-side and call
   `NAC.set_provenance_secret()` from authed code.

---

## 8. Where to go next

- `SPEC.md` for the full contract.
- `guides/REACT.md` for the cross-framework comparison.
- `guides/LLM_WIRING.md` for the intermediary backend.
- `SECURITY.md` for the threat model.
- The demos at yujin.app/nac-spec/ (`example.php` v1.9 reference;
  `example-v20-full.php` brownfield migration; `example-v21-data-table.php`
  data-table + chat).
