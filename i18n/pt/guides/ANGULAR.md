---
translation_source: guides/ANGULAR.md
translation_source_hash: db5a73d8ddcd813e9bac7918d3e48e9834f98d5f60e855ace8c2f9df7cc0f0af
translation_quality: machine_v1
translation_lang: pt
translation_date: 2026-05-11T13:31:44.116933+00:00
---

# Guia de adoção do NAC3 + Angular

Este guia integra um app Angular ao NAC por dois caminhos:

- **Greenfield:** projeto novo, NAC3 integrado desde o `ng new`.
- **Brownfield:** app existente, NAC3 adicionado progressivamente, sem reescrita.

Testado com Angular 17+ (standalone components, signals, inject).
O formato com Angular mais antigo (NgModules) também é coberto. Mesmo pacote `@nac3/runtime` do React; a diferença está em quão idiomático para o Angular fica o código de integração.

---

## 1. Instalação

```
npm install @nac3/runtime
```

O Angular empacota o pacote via seu pipeline de build padrão (esbuild
no 17+, webpack em versões mais antigas). Nenhuma configuração extra no `angular.json`.

---

## 2. Greenfield -- novo app

### 2.1 Inicialize o runtime uma vez

Em `main.ts`:

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
  // window.NAC está pronto. Configure tenant + provenance uma vez.
  if ((window as any).NAC?.setTenantPrefix) {
    (window as any).NAC.setTenantPrefix('demo');
  }
});
```

Para o `app.module.ts` mais antigo (NgModule), os mesmos imports vão
no arquivo do módulo antes de `platformBrowserDynamic().bootstrapModule(...)`.

### 2.2 Serviço NAC3 -- centralize o registro

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

  /* helper v2.2. */
  bindAction(el: HTMLElement, handler: (ev: Event) => void | Promise<unknown>,
             ctx: { plugin: string; action_id: string }) {
    return this.runtime?.bindAction(el, handler, ctx);
  }
}
```

### 2.3 Decore os componentes

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
    /* v2.2: bindAction envolve o clique + emite o ack para que qualquer
       agente aguardando NAC.click('invoice.save') resolva corretamente. */
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
    // ... sua lógica de salvamento ...
  }
}
```

### 2.4 NacIdDirective -- o atalho amigável para brownfield

Para decoração repetitiva, uma diretiva de atributo é mais idiomática
no Angular do que a tripla `data-nac-*` bruta. Aplique uma vez e a
diretiva define os três atributos:

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

### 2.5 NacActionDirective -- bindAction sem esforço

Envolve `bindAction` para que qualquer handler `(click)` decorado com
`nacAction` emita automaticamente o contrato de ack da v2.2:

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
    /* O elemento JÁ DEVE ter um handler (click) do Angular anexado
       neste ponto. Adicionamos o nosso junto; o runtime v2.2
       emite o ack após ambos terem executado. */
    this.unbind = this.nac.bindAction(
      this.el.nativeElement,
      () => { /* apenas evento de contrato -- o (click) do usuário executa separadamente */ },
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

(Sim, o seletor da diretiva `nacAction` se sobrepõe ao input abreviado
`data-nac-action`. Na prática, escolha um dos dois padrões por projeto;
esta seção é para quem deseja o wrapper do `bindAction`.)

---

## 3. Brownfield -- aplicação existente

O princípio (igual ao React): não refatore tudo de uma vez.

### 3.1 Ordem de ataque

1. **Shell de nível superior primeiro.** Adicione `data-nac-plugin="<seu-app-slug>"`
   ao wrapper mais externo do template do seu `<app-root>`. A árvore de
   escopo do runtime o detecta imediatamente.
2. **Botões mais usados em seguida.** Salvar / cancelar / enviar / excluir
   nas suas telas mais movimentadas. Adicione os três atributos `data-nac-*`
   diretamente no template (ou via `NacIdDirective`).
3. **Verifique no DevTools.** Execute `window.NAC.describe()` no
   console do navegador. Os botões devem aparecer sob o slug do seu plugin.
4. **Adicione um manifest.** Apenas os botões do passo 2, com verbos.
   `NAC.click_by_verb()` passa a funcionar.
5. **Adicione campos + abas.** Inputs recebem `role="field"`. Abas recebem
   `role="tab"` -- **atenção**: ids que correspondam a `^tab\.` DEVEM ter role
   `'tab'` conforme spec sec 1 + validador estrito V22-01.

### 3.2 Trabalhando com Angular Material / PrimeNG / Taiga

A maioria das bibliotecas de componentes Angular expõe bindings de input
no estilo `[attr.data-nac-*]` ou simplesmente repassa atributos desconhecidos
ao elemento host. Dois padrões:

**Padrão A: binding de atributo direto.**

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

**Padrão B: NacIdDirective no wrapper.**

Se a biblioteca renderiza um elemento host e você quer o NAC3 no
botão interno, envolva-o:

```html
<span nacId="invoice.save" nacRole="action" nacAction="save"
      (click)="onSave()">
  <button mat-raised-button>Save</button>
</span>
```

O runtime do NAC3 resolve pelo `data-nac-id`, não pela tag, então isso
funciona.

### 3.3 Auto-registro a partir do DOM

Mesmo padrão `autoRegister.watch` do React:

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

Mude `i18n_strict` para `'strict'` assim que seu catálogo de traduções
cobrir todos os 10 locales do NAC3.

---

## 4. Roteamento + ciclo de vida

O snapshot do NAC3 reflete **o que está montado no momento**. Com o
router do Angular isso significa:

- Um componente que monta ao navegar para uma rota registra seu
  manifest em `ngOnInit`.
- Um componente que desmonta ao navegar deve chamar
  `NAC.unregister(plugin_slug)` em `ngOnDestroy` para que plugins
  obsoletos não apareçam no snapshot do agente.

```ts
ngOnDestroy() {
  this.nac.runtime?.unregister?.('invoice');
}
```

Para componentes shell de longa duração (a barra superior, a barra lateral),
NÃO faça unregister -- eles devem estar sempre na árvore.

---

## 5. Testes

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

Igual ao guia do React:

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

## 6. Armadilhas comuns

- **Ids obsoletos em `*ngFor`.** Se você constrói ids a partir do índice
  (`data-nac-id="row.{{i}}"`), agentes que cachearam um id quebram ao
  reordenar. Use chaves estáveis (ids do banco de dados).
- **Detecção de mudanças + loops de registro.** NÃO registre o
  manifest em `ngOnChanges` nem em um getter que execute a cada ciclo de CD.
  `ngOnInit` uma única vez é o lugar certo.
- **Modo estrito + zone.js.** Eventos do NAC3 fluem pelo documento global;
  eles NÃO são zone-aware por padrão. Se precisar de tratamento zone-aware,
  envolva seu listener:
  ```ts
  this.zone.run(() => { /* respond to nac:action:succeeded */ });
  ```
- **SSR (Angular Universal).** O NAC3 é exclusivo para o navegador. Proteja
  o serviço:
  ```ts
  if (isPlatformBrowser(this.platformId)) {
    this.nac.register(...);
  }
  ```

---

## 7. Checklist de produção

Antes de publicar:

1. Substitua `i18n_strict: 'permissive'` por `'strict'`. O CI detecta
   traduções ausentes.
2. Execute `npx @nac3/runtime validate ./src` -- espere zero ocorrências de
   severidade de erro.
3. Defina `(window as any).NAC.STRICT_VALIDATION = true` na inicialização
   de produção para que as verificações v2.2 em tempo de registro (manifest_role_unknown
   etc.) sejam lançadas como exceções.
4. Em um teste Playwright, asserte que `NAC.validate_global()` retorna
   `[]`.
5. Multi-tenant: assine manifests com HMAC no servidor e chame
   `NAC.set_provenance_secret()` a partir de código autenticado.

---

## 8. Próximos passos

- `SPEC.md` para o contrato completo.
- `guides/REACT.md` para a comparação entre frameworks.
- `guides/LLM_WIRING.md` para o backend intermediário.
- `SECURITY.md` para o modelo de ameaças.
- As demos em yujin.app/nac-spec/ (`example.php` referência v1.9;
  `example-v20-full.php` migração brownfield; `example-v21-data-table.php`
  data-table + chat).

---

*This is a machine translation of the canonical English
version at `/nac-spec/guides/ANGULAR.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
