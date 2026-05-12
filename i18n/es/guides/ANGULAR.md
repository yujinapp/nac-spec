---
translation_source: guides/ANGULAR.md
translation_source_hash: db5a73d8ddcd813e9bac7918d3e48e9834f98d5f60e855ace8c2f9df7cc0f0af
translation_quality: machine_v1
translation_lang: es
translation_date: 2026-05-11T13:22:55.045601+00:00
---

# Guía de adopción de NAC3 + Angular

Esta guía integra NAC3 en una aplicación Angular mediante dos caminos:

- **Greenfield:** proyecto nuevo, NAC3 integrado desde `ng new`.
- **Brownfield:** aplicación existente, NAC3 agregado de forma progresiva, sin reescritura.

Probado con Angular 17+ (componentes standalone, signals, inject).
También se cubre la forma con Angular antiguo (NgModules). El mismo paquete `@nac3/runtime` que en React; la diferencia está en qué tan idiomático se siente el código de integración para Angular.

---

## 1. Instalación

```
npm install @nac3/runtime
```

Angular empaqueta el módulo a través de su pipeline de build estándar (esbuild en 17+, webpack en versiones anteriores). No se requiere configuración adicional en `angular.json`.

---

## 2. Greenfield -- nueva aplicación

### 2.1 Inicializar el runtime una sola vez

En `main.ts`:

```ts
import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { AppComponent } from './app/app.component';
import { routes } from './app/app.routes';
import '@nac3/runtime';
import '@nac3/runtime/extensions';
// opcional: import '@nac3/runtime/chat-client';

bootstrapApplication(AppComponent, {
  providers: [provideRouter(routes)]
}).then(() => {
  // window.NAC ya está listo. Configura tenant + provenance una sola vez.
  if ((window as any).NAC?.setTenantPrefix) {
    (window as any).NAC.setTenantPrefix('demo');
  }
});
```

Para el `app.module.ts` antiguo (NgModule), los mismos imports van en el archivo del módulo antes de `platformBrowserDynamic().bootstrapModule(...)`.

### 2.2 Servicio NAC3 -- centralizar el registro

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

  /* Helper v2.2. */
  bindAction(el: HTMLElement, handler: (ev: Event) => void | Promise<unknown>,
             ctx: { plugin: string; action_id: string }) {
    return this.runtime?.bindAction(el, handler, ctx);
  }
}
```

### 2.3 Decorar componentes

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
    /* v2.2: bindAction envuelve el click + emite el ack para que cualquier
       agente que espere NAC.click('invoice.save') resuelva correctamente. */
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
    // ... tu lógica de guardado ...
  }
}
```

### 2.4 NacIdDirective -- el atajo amigable para brownfield

Para decorar elementos de forma repetitiva, una directiva de atributo resulta más idiomática en Angular que el triple `data-nac-*` manual. Se aplica una vez y la directiva establece los tres atributos:

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

Uso:

```html
<button nacId="invoice.save" nacRole="action" nacAction="save"
        (click)="onSave()">
  Save
</button>
```

### 2.5 NacActionDirective -- bindAction sin configuración extra

Envuelve `bindAction` para que cualquier handler `(click)` decorado con `nacAction` emita automáticamente el contrato de ack de v2.2:

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
    /* El elemento YA debe tener un handler (click) adjunto por Angular
       en este punto. El nuestro se agrega junto al existente; el runtime
       v2.2 emite el ack después de que ambos hayan ejecutado. */
    this.unbind = this.nac.bindAction(
      this.el.nativeElement,
      () => { /* solo evento de contrato -- el (click) del usuario corre por separado */ },
      { plugin: this.nacAction.plugin, action_id: this.nacAction.actionId }
    );
  }

  ngOnDestroy() { this.unbind?.(); }
}
```

Uso:

```html
<button nacId="invoice.save" nacRole="action" nacAction="save"
        [nacAction]="{ plugin: 'invoice', actionId: 'invoice.save' }"
        (click)="onSave()">
  Save
</button>
```

(Sí, el selector de la directiva `nacAction` se superpone con el input abreviado `data-nac-action`. En la práctica se elige uno de los dos patrones por proyecto; esta sección es para quienes desean el wrapper de bindAction.)

---

## 3. Brownfield -- aplicación existente

El principio (igual que en React): no refactorizar todo de una vez.

### 3.1 Orden de ataque

1. **Primero el shell de nivel superior.** Agrega `data-nac-plugin="<your-app-slug>"`
   al contenedor más externo del template de `<app-root>`. El árbol de
   alcance del runtime lo detecta de inmediato.
2. **Luego los botones más usados.** Guardar / cancelar / enviar / eliminar
   en las pantallas con más tráfico. Agrega los tres atributos `data-nac-*`
   directamente en el template (o mediante `NacIdDirective`).
3. **Verifica en DevTools.** Ejecuta `window.NAC.describe()` desde la
   consola del navegador. Los botones deben aparecer bajo el slug de tu plugin.
4. **Agrega un manifest.** Solo los botones del paso 2, con verbos.
   `NAC.click_by_verb()` ya funcionará.
5. **Agrega campos y tabs.** Los inputs reciben `role="field"`. Los tabs reciben
   `role="tab"` -- **nota**: los ids que coincidan con `^tab\.` DEBEN tener el role
   `'tab'` según la sección 1 de la especificación y el validador estricto V22-01.

### 3.2 Trabajar con Angular Material / PrimeNG / Taiga

La mayoría de las librerías de componentes Angular exponen bindings de entrada
al estilo `[attr.data-nac-*]` o simplemente reenvían atributos desconocidos al
elemento host. Dos patrones:

**Patrón A: binding de atributo directo.**

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

**Patrón B: NacIdDirective en el contenedor.**

Si la librería renderiza un elemento host y quieres NAC3 en el
botón interno, envuélvelo:

```html
<span nacId="invoice.save" nacRole="action" nacAction="save"
      (click)="onSave()">
  <button mat-raised-button>Save</button>
</span>
```

El runtime de NAC3 resuelve por `data-nac-id`, no por etiqueta, así que
esto funciona.

### 3.3 Auto-registro desde el DOM

El mismo patrón `autoRegister.watch` que en React:

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

Cambia `i18n_strict` a `'strict'` una vez que tu catálogo de traducciones
cubra los 10 locales de NAC3.

---

## 4. Routing + ciclo de vida

El snapshot de NAC3 refleja **lo que está montado en ese momento**. Con el
router de Angular esto significa:

- Un componente que se monta al navegar a una ruta registra su
  manifest en `ngOnInit`.
- Un componente que se desmonta al navegar debe llamar a
  `NAC.unregister(plugin_slug)` en `ngOnDestroy` para que los plugins
  obsoletos no aparezcan en el snapshot del agente.

```ts
ngOnDestroy() {
  this.nac.runtime?.unregister?.('invoice');
}
```

Para los componentes shell de larga vida (la barra superior, la barra lateral),
NO los desregistres -- siempre deben estar en el árbol.

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

Igual que en la guía de React:

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

## 6. Errores comunes

- **Ids obsoletos en `*ngFor`.** Si construyes ids a partir del índice
  (`data-nac-id="row.{{i}}"`), los agentes que cachearon un id se rompen al
  reordenar. Usa claves estables (ids de base de datos).
- **Detección de cambios y bucles de registro.** NO registres el manifest
  en `ngOnChanges` ni en un getter que se ejecute en cada ciclo de CD.
  `ngOnInit` una sola vez es el lugar correcto.
- **Modo estricto + zone.js.** Los eventos de NAC3 fluyen a través del
  documento global; por defecto NO son zone-aware. Si necesitas manejo
  zone-aware, envuelve tu listener:
  ```ts
  this.zone.run(() => { /* respond to nac:action:succeeded */ });
  ```
- **SSR (Angular Universal).** NAC3 es solo para el navegador. Protege el
  servicio:
  ```ts
  if (isPlatformBrowser(this.platformId)) {
    this.nac.register(...);
  }
  ```

---

## 7. Checklist de producción

Antes de publicar:

1. Reemplaza `i18n_strict: 'permissive'` por `'strict'`. El CI detectará
   traducciones faltantes.
2. Ejecuta `npx @nac3/runtime validate ./src` -- se esperan cero hallazgos de
   severidad error.
3. Establece `(window as any).NAC.STRICT_VALIDATION = true` en el arranque
   de producción para que las verificaciones de registro de v2.2
   (manifest_role_unknown, etc.) lancen excepciones.
4. Desde un test de Playwright, verifica que `NAC.validate_global()` retorne
   `[]`.
5. Multi-tenant: firma los manifests con HMAC del lado del servidor y llama a
   `NAC.set_provenance_secret()` desde código autenticado.

---

## 8. Próximos pasos

- `SPEC.md` para el contrato completo.
- `guides/REACT.md` para la comparación entre frameworks.
- `guides/LLM_WIRING.md` para el backend intermediario.
- `SECURITY.md` para el modelo de amenazas.
- Las demos en yujin.app/nac-spec/ (`example.php` referencia v1.9;
  `example-v20-full.php` migración brownfield; `example-v21-data-table.php`
  tabla de datos + chat).

---

*This is a machine translation of the canonical English
version at `/nac-spec/guides/ANGULAR.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
