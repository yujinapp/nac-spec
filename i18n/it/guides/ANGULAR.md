---
translation_source: guides/ANGULAR.md
translation_source_hash: db5a73d8ddcd813e9bac7918d3e48e9834f98d5f60e855ace8c2f9df7cc0f0af
translation_quality: machine_v1
translation_lang: it
translation_date: 2026-05-11T13:50:31.860401+00:00
---

# Guida all'adozione di NAC3 con Angular

Questa guida illustra due percorsi per integrare NAC in un'app Angular:

- **Greenfield:** nuovo progetto, NAC3 integrato fin da `ng new`.
- **Brownfield:** app esistente, NAC3 aggiunto progressivamente, senza riscrittura.

Testato con Angular 17+ (componenti standalone, signals, inject).
È coperta anche la struttura con Angular precedente (NgModules). Stesso pacchetto `@nac3/runtime` di React; la differenza sta in quanto risulta idiomatico il codice di collegamento in Angular.

---

## 1. Installazione

```
npm install @nac3/runtime
```

Angular include il pacchetto tramite la sua pipeline di build standard (esbuild in 17+, webpack nelle versioni precedenti). Nessuna configurazione aggiuntiva in `angular.json`.

---

## 2. Greenfield -- nuovo progetto

### 2.1 Avvio del runtime una sola volta

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
  // window.NAC è ora pronto. Configura tenant e provenienza una sola volta.
  if ((window as any).NAC?.setTenantPrefix) {
    (window as any).NAC.setTenantPrefix('demo');
  }
});
```

Per il vecchio `app.module.ts` (NgModule), gli stessi import vanno inseriti nel file del modulo prima di `platformBrowserDynamic().bootstrapModule(...)`.

### 2.2 Service NAC3 -- centralizzare la registrazione

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

### 2.3 Decorare i componenti

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
    /* v2.2: bindAction avvolge il click ed emette l'ack affinché
       qualsiasi agent in attesa di NAC.click('invoice.save') si risolva correttamente. */
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
    // ... logica di salvataggio ...
  }
}
```

### 2.4 NacIdDirective -- la scorciatoia adatta al brownfield

Per la decorazione ripetitiva, una directive ad attributo risulta più idiomatica in Angular rispetto al triplo `data-nac-*` grezzo. Si applica una volta sola e la directive imposta tutti e tre gli attributi:

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

Utilizzo:

```html
<button nacId="invoice.save" nacRole="action" nacAction="save"
        (click)="onSave()">
  Save
</button>
```

### 2.5 NacActionDirective -- bindAction incluso

Avvolge `bindAction` in modo che qualsiasi handler `(click)` decorato con `nacAction` emetta automaticamente il contratto ack della v2.2:

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
    /* L'elemento DEVE avere già un handler (click) collegato da Angular
       in questo momento. Il nostro viene aggiunto in parallelo; il runtime
       v2.2 emette l'ack dopo che entrambi sono stati eseguiti. */
    this.unbind = this.nac.bindAction(
      this.el.nativeElement,
      () => { /* solo evento contratto -- il (click) dell'utente viene eseguito separatamente */ },
      { plugin: this.nacAction.plugin, action_id: this.nacAction.actionId }
    );
  }

  ngOnDestroy() { this.unbind?.(); }
}
```

Utilizzo:

```html
<button nacId="invoice.save" nacRole="action" nacAction="save"
        [nacAction]="{ plugin: 'invoice', actionId: 'invoice.save' }"
        (click)="onSave()">
  Save
</button>
```

(Sì, il selettore della directive `nacAction` si sovrappone all'input abbreviato `data-nac-action`. In pratica si sceglie uno dei due pattern per progetto; questa sezione è per chi vuole il wrapper bindAction.)

## 3. Brownfield -- app esistente

Il principio (come in React): non refactorizzare tutto in una volta sola.

### 3.1 Ordine di intervento

1. **Prima la shell di primo livello.** Aggiungi `data-nac-plugin="<your-app-slug>"`
   al wrapper più esterno del template `<app-root>`. Il runtime
   lo rileva immediatamente nell'albero degli scope.
2. **Poi i pulsanti più usati.** Salva / annulla / invia / elimina
   nelle schermate più frequentate. Aggiungi i tre attributi `data-nac-*`
   direttamente nel template (oppure tramite `NacIdDirective`).
3. **Verifica in DevTools.** Esegui `window.NAC.describe()` dalla
   console del browser. I pulsanti dovrebbero comparire sotto il tuo
   plugin slug.
4. **Aggiungi un manifest.** Solo i pulsanti del punto 2, con i verbi.
   `NAC.click_by_verb()` funzionerà da subito.
5. **Aggiungi campi e tab.** Gli input ricevono `role="field"`. I tab ricevono
   `role="tab"` -- **nota**: gli id che corrispondono a `^tab\.` DEVONO avere role
   `'tab'` secondo la spec sez. 1 + validatore strict V22-01.

### 3.2 Utilizzo con Angular Material / PrimeNG / Taiga

La maggior parte delle librerie di componenti Angular espone binding
di input in stile `[attr.data-nac-*]` oppure propaga semplicemente
gli attributi sconosciuti all'elemento host. Due pattern:

**Pattern A: binding diretto degli attributi.**

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

**Pattern B: NacIdDirective sul wrapper.**

Se la libreria renderizza un elemento host e vuoi NAC3 sul
pulsante interno, usa un wrapper:

```html
<span nacId="invoice.save" nacRole="action" nacAction="save"
      (click)="onSave()">
  <button mat-raised-button>Save</button>
</span>
```

Il runtime NAC3 risolve tramite `data-nac-id`, non per tag, quindi
questo approccio funziona correttamente.

### 3.3 Auto-registrazione dal DOM

Stesso pattern `autoRegister.watch` di React:

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

Passa `i18n_strict` a `'strict'` non appena il tuo catalogo di traduzioni
copre tutti i 10 locale NAC3.

---

## 4. Routing + ciclo di vita

Lo snapshot di NAC3 riflette **ciò che è attualmente montato**. Con il
router di Angular questo significa:

- Un componente che si monta alla navigazione di una route registra il
  proprio manifest in `ngOnInit`.
- Un componente che si smonta alla navigazione dovrebbe chiamare
  `NAC.unregister(plugin_slug)` in `ngOnDestroy`, così i plugin obsoleti
  non compaiono nello snapshot dell'agente.

```ts
ngOnDestroy() {
  this.nac.runtime?.unregister?.('invoice');
}
```

Per i componenti shell a lunga vita (la topbar, la sidebar), NON
eseguire l'unregister -- devono essere sempre presenti nell'albero.

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

Come nella guida React:

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

## 6. Errori comuni

- **Id obsoleti in `*ngFor`.** Se costruisci gli id dall'indice
  (`data-nac-id="row.{{i}}"`), gli agenti che hanno memorizzato un id
  si rompono al riordinamento. Usa chiavi stabili (id del DB).
- **Change detection + loop di registrazione.** NON registrare il
  manifest in `ngOnChanges` o in un getter che viene eseguito ad ogni
  ciclo di CD. `ngOnInit` una volta sola è il posto giusto.
- **Strict mode + zone.js.** Gli eventi NAC3 transitano attraverso il
  documento globale; NON sono zone-aware per impostazione predefinita.
  Se hai bisogno di gestione zone-aware, avvolgi il listener:
  ```ts
  this.zone.run(() => { /* respond to nac:action:succeeded */ });
  ```
- **SSR (Angular Universal).** NAC3 è solo per il browser. Proteggi il
  servizio:
  ```ts
  if (isPlatformBrowser(this.platformId)) {
    this.nac.register(...);
  }
  ```

---

## 7. Checklist per la produzione

Prima del rilascio:

1. Sostituisci `i18n_strict: 'permissive'` con `'strict'`. La CI
   intercetta le traduzioni mancanti.
2. Esegui `npx @nac3/runtime validate ./src` -- attendi zero risultati
   con severità error.
3. Imposta `(window as any).NAC.STRICT_VALIDATION = true` nel boot di
   produzione per far sì che i controlli v2.2 al momento della registrazione
   (manifest_role_unknown ecc.) vengano lanciati come eccezioni.
4. Da un test Playwright, verifica che `NAC.validate_global()` restituisca
   `[]`.
5. Multi-tenant: firma i manifest con HMAC lato server e chiama
   `NAC.set_provenance_secret()` dal codice autenticato.

---

## 8. Passi successivi

- `SPEC.md` per il contratto completo.
- `guides/REACT.md` per il confronto cross-framework.
- `guides/LLM_WIRING.md` per il backend intermediario.
- `SECURITY.md` per il modello delle minacce.
- Le demo su yujin.app/nac-spec/ (`example.php` riferimento v1.9;
  `example-v20-full.php` migrazione brownfield; `example-v21-data-table.php`
  data-table + chat).

---

*This is a machine translation of the canonical English
version at `/nac-spec/guides/ANGULAR.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
