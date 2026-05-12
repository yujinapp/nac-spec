---
translation_source: guides/ANGULAR.md
translation_source_hash: db5a73d8ddcd813e9bac7918d3e48e9834f98d5f60e855ace8c2f9df7cc0f0af
translation_quality: machine_v1
translation_lang: de
translation_date: 2026-05-11T14:28:04.973594+00:00
---

# NAC3 + Angular Adoptionsleitfaden

Dieser Leitfaden integriert NAC in eine Angular-App über zwei Wege:

- **Greenfield:** neues Projekt, NAC3 von Anfang an mit `ng new` integriert.
- **Brownfield:** bestehende App, NAC3 wird schrittweise hinzugefügt, kein Rewrite.

Getestet mit Angular 17+ (Standalone-Komponenten, Signals, inject).
Älteres Angular (NgModules) wird ebenfalls behandelt. Dasselbe `@nac3/runtime`-Paket wie bei React; der Unterschied liegt darin, wie Angular-idiomatisch die Verbindungsschicht wirkt.

---

## 1. Installation

```
npm install @nac3/runtime
```

Angular bündelt das Paket über seine Standard-Build-Pipeline (esbuild
ab 17+, webpack bei älteren Versionen). Keine zusätzliche `angular.json`-Konfiguration erforderlich.

---

## 2. Greenfield -- neue App

### 2.1 Runtime einmalig starten

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
  // window.NAC ist jetzt bereit. Tenant + Provenance einmalig konfigurieren.
  if ((window as any).NAC?.setTenantPrefix) {
    (window as any).NAC.setTenantPrefix('demo');
  }
});
```

Bei älterem `app.module.ts` (NgModule) kommen dieselben Imports in die
Moduldatei, vor `platformBrowserDynamic().bootstrapModule(...)`.

### 2.2 NAC3-Service -- Registrierung zentralisieren

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

  /* v2.2 Hilfsmethode. */
  bindAction(el: HTMLElement, handler: (ev: Event) => void | Promise<unknown>,
             ctx: { plugin: string; action_id: string }) {
    return this.runtime?.bindAction(el, handler, ctx);
  }
}
```

### 2.3 Komponenten dekorieren

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
    /* v2.2: bindAction kapselt den Klick und sendet das Ack, sodass
       ein Agent, der auf NAC.click('invoice.save') wartet, sauber auflöst. */
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
    // ... Ihre Speicherlogik ...
  }
}
```

### 2.4 NacIdDirective -- die brownfield-freundliche Abkürzung

Für wiederkehrende Dekorierung wirkt eine Attribut-Direktive
Angular-idiomatischer als das rohe `data-nac-*`-Tripel. Einmal
angewendet, setzt die Direktive alle drei Attribute:

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

Verwendung:

```html
<button nacId="invoice.save" nacRole="action" nacAction="save"
        (click)="onSave()">
  Save
</button>
```

### 2.5 NacActionDirective -- bindAction ohne Mehraufwand

Kapselt `bindAction`, sodass jeder mit `nacAction` dekorierte
`(click)`-Handler automatisch den v2.2-Ack-Vertrag erfüllt:

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
    /* Das Element MUSS zu diesem Zeitpunkt bereits einen von Angular
       gebundenen (click)-Handler besitzen. Unserer wird parallel
       hinzugefügt; die v2.2-Runtime sendet das Ack, nachdem beide
       ausgeführt wurden. */
    this.unbind = this.nac.bindAction(
      this.el.nativeElement,
      () => { /* nur Contract-Event -- der (click) des Nutzers läuft separat */ },
      { plugin: this.nacAction.plugin, action_id: this.nacAction.actionId }
    );
  }

  ngOnDestroy() { this.unbind?.(); }
}
```

Verwendung:

```html
<button nacId="invoice.save" nacRole="action" nacAction="save"
        [nacAction]="{ plugin: 'invoice', actionId: 'invoice.save' }"
        (click)="onSave()">
  Save
</button>
```

(Der Direktiven-Selektor `nacAction` überschneidet sich mit dem
`data-nac-action`-Kurzeingabe-Input. In der Praxis entscheidet man
sich pro Projekt für eines der beiden Muster; dieser Abschnitt richtet
sich an Anwender, die den bindAction-Wrapper nutzen möchten.)

---

## 3. Brownfield – bestehende App

Das Prinzip (wie bei React): Nicht alles auf einmal refaktorieren.

### 3.1 Reihenfolge der Umsetzung

1. **Zuerst die oberste Shell.** `data-nac-plugin="<your-app-slug>"`
   zum äußersten Wrapper im `<app-root>`-Template hinzufügen. Der
   Runtime-Scope-Tree erkennt ihn sofort.
2. **Danach die meistgenutzten Buttons.** Speichern / Abbrechen /
   Absenden / Löschen in den am häufigsten verwendeten Screens. Die
   drei `data-nac-*`-Attribute direkt im Template (oder per
   `NacIdDirective`) hinzufügen.
3. **In DevTools überprüfen.** `window.NAC.describe()` in der
   Browser-Konsole ausführen. Die Buttons sollten unter dem
   Plugin-Slug erscheinen.
4. **Ein Manifest hinzufügen.** Nur die Buttons aus Schritt 2, mit
   Verben. `NAC.click_by_verb()` funktioniert damit.
5. **Felder und Tabs ergänzen.** Eingabefelder erhalten
   `role="field"`. Tabs erhalten `role="tab"` – **Hinweis:** IDs,
   die auf `^tab\.` passen, MÜSSEN laut Spec Abschnitt 1 + V22-01
   Strict Validator die Rolle `'tab'` haben.

### 3.2 Zusammenarbeit mit Angular Material / PrimeNG / Taiga

Die meisten Angular-Komponentenbibliotheken unterstützen
`[attr.data-nac-*]`-Bindungen oder leiten unbekannte Attribute
einfach an das Host-Element weiter. Zwei Muster:

**Muster A: Direkte Attributbindung.**

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

**Muster B: NacIdDirective am Wrapper.**

Wenn die Bibliothek ein Host-Element rendert und NAC3 auf dem
inneren Button benötigt wird, einen Wrapper verwenden:

```html
<span nacId="invoice.save" nacRole="action" nacAction="save"
      (click)="onSave()">
  <button mat-raised-button>Save</button>
</span>
```

Die NAC3-Runtime löst über `data-nac-id` auf, nicht über den Tag –
das funktioniert also problemlos.

### 3.3 Automatische Registrierung aus dem DOM

Dasselbe `autoRegister.watch`-Muster wie bei React:

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

`i18n_strict` auf `'strict'` umstellen, sobald der
Übersetzungskatalog alle 10 NAC3-Locales abdeckt.

---

## 4. Routing + Lifecycle

Der NAC3-Snapshot zeigt **was aktuell eingebunden ist**. Mit Angulars
Router bedeutet das:

- Eine Komponente, die bei der Routennavigation eingebunden wird,
  registriert ihr Manifest in `ngOnInit`.
- Eine Komponente, die bei der Navigation ausgebunden wird, sollte
  `NAC.unregister(plugin_slug)` in `ngOnDestroy` aufrufen, damit
  veraltete Plugins nicht im Snapshot des Agenten erscheinen.

```ts
ngOnDestroy() {
  this.nac.runtime?.unregister?.('invoice');
}
```

Langlebige Shell-Komponenten (Topbar, Sidebar) sollten NICHT
deregistriert werden – sie sollen immer im Baum vorhanden sein.

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

Wie im React-Leitfaden:

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

## 6. Häufige Fallstricke

- **Veraltete IDs in `*ngFor`.** Wenn IDs aus dem Index aufgebaut
  werden (`data-nac-id="row.{{i}}"`), brechen Agenten, die eine ID
  gecacht haben, bei einer Neuanordnung. Stabile Schlüssel (DB-IDs)
  verwenden.
- **Change Detection + Registrierungsschleifen.** Das Manifest NICHT
  in `ngOnChanges` oder in einem Getter registrieren, der bei jedem
  CD-Zyklus ausgeführt wird. `ngOnInit` einmalig ist der richtige
  Ort.
- **Strict Mode + zone.js.** NAC3-Events fließen durch das globale
  Document; sie sind standardmäßig NICHT zone-aware. Für
  zone-aware-Behandlung den Listener einwickeln:
  ```ts
  this.zone.run(() => { /* respond to nac:action:succeeded */ });
  ```
- **SSR (Angular Universal).** NAC3 ist ausschließlich für den
  Browser. Den Service absichern:
  ```ts
  if (isPlatformBrowser(this.platformId)) {
    this.nac.register(...);
  }
  ```

---

## 7. Produktions-Checkliste

Vor dem Deployment:

1. `i18n_strict: 'permissive'` durch `'strict'` ersetzen. CI erkennt
   fehlende Übersetzungen.
2. `npx @nac3/runtime validate ./src` ausführen – es sollten null
   Fehler mit Schweregrad „error" auftreten.
3. `(window as any).NAC.STRICT_VALIDATION = true` im Produktions-Boot
   setzen, um v2.2-Prüfungen zur Registrierungszeit (z. B.
   `manifest_role_unknown`) als Exceptions zu erzwingen.
4. In einem Playwright-Test sicherstellen, dass `NAC.validate_global()`
   `[]` zurückgibt.
5. Multi-Tenant: Manifeste serverseitig per HMAC signieren und
   `NAC.set_provenance_secret()` aus authentifiziertem Code aufrufen.

---

## 8. Nächste Schritte

- `SPEC.md` für den vollständigen Vertrag.
- `guides/REACT.md` für den Framework-übergreifenden Vergleich.
- `guides/LLM_WIRING.md` für das Intermediary-Backend.
- `SECURITY.md` für das Bedrohungsmodell.
- Die Demos unter yujin.app/nac-spec/ (`example.php` v1.9-Referenz;
  `example-v20-full.php` Brownfield-Migration; `example-v21-data-table.php`
  Datentabelle + Chat).

---

*This is a machine translation of the canonical English
version at `/nac-spec/guides/ANGULAR.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
