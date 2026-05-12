---
translation_source: guides/ANGULAR.md
translation_source_hash: db5a73d8ddcd813e9bac7918d3e48e9834f98d5f60e855ace8c2f9df7cc0f0af
translation_quality: machine_v1
translation_lang: zh
translation_date: 2026-05-11T14:48:49.713424+00:00
---

# NAC3 + Angular 接入指南

本指南通过两种路径将 Angular 应用接入 NAC 驱动：

- **全新项目（Greenfield）：** 从 `ng new` 开始，直接集成 NAC3。
- **存量项目（Brownfield）：** 在现有应用中渐进式接入 NAC3，无需重写。

已在 Angular 17+（独立组件、signals、inject）上验证。旧版 Angular（NgModules）的写法也有覆盖。使用与 React 相同的 `@nac3/runtime` 包，区别在于胶水层是否符合 Angular 惯用风格。

---

## 1. 安装

```
npm install @nac3/runtime
```

Angular 通过其标准构建流水线（17+ 使用 esbuild，旧版使用 webpack）打包该依赖，无需额外修改 `angular.json`。

---

## 2. 全新项目（Greenfield）

### 2.1 启动运行时（仅一次）

在 `main.ts` 中：

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
  // window.NAC 现已就绪。在此处统一配置租户和来源信息。
  if ((window as any).NAC?.setTenantPrefix) {
    (window as any).NAC.setTenantPrefix('demo');
  }
});
```

对于旧版 `app.module.ts`（NgModule），将相同的 import 语句放在 `platformBrowserDynamic().bootstrapModule(...)` 之前的模块文件中即可。

### 2.2 NAC3 服务——集中管理注册

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

  /* v2.2 辅助方法。 */
  bindAction(el: HTMLElement, handler: (ev: Event) => void | Promise<unknown>,
             ctx: { plugin: string; action_id: string }) {
    return this.runtime?.bindAction(el, handler, ctx);
  }
}
```

### 2.3 装饰组件

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
    /* v2.2：bindAction 包装点击事件并发出 ack，
       使任何等待 NAC.click('invoice.save') 的 agent 能够正常 resolve。 */
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
    // ... 你的保存逻辑 ...
  }
}
```

### 2.4 NacIdDirective——对存量项目友好的快捷方式

对于需要重复装饰的场景，使用属性指令比手写三个 `data-nac-*` 属性更符合 Angular 惯用风格。只需应用一次，指令会自动设置全部三个属性：

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

用法：

```html
<button nacId="invoice.save" nacRole="action" nacAction="save"
        (click)="onSave()">
  Save
</button>
```

### 2.5 NacActionDirective——免费获得 bindAction

将 `bindAction` 封装为指令，使任何带有 `nacAction` 装饰的 `(click)` 处理器自动满足 v2.2 的 ack 契约：

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
    /* 此时元素必须已由 Angular 绑定了 (click) 处理器。
       我们在其旁边附加自己的处理器；v2.2 运行时会在两者都执行后发出 ack。 */
    this.unbind = this.nac.bindAction(
      this.el.nativeElement,
      () => { /* 仅用于契约事件——用户的 (click) 会单独执行 */ },
      { plugin: this.nacAction.plugin, action_id: this.nacAction.actionId }
    );
  }

  ngOnDestroy() { this.unbind?.(); }
}
```

用法：

```html
<button nacId="invoice.save" nacRole="action" nacAction="save"
        [nacAction]="{ plugin: 'invoice', actionId: 'invoice.save' }"
        (click)="onSave()">
  Save
</button>
```

（是的，指令选择器 `nacAction` 与 `data-nac-action` 的简写输入存在命名重叠。实际使用时，建议在项目中选择其中一种模式；本节适用于希望使用 bindAction 包装器的接入方。）

---

## 3. 棕地场景——现有应用

核心原则（与 React 相同）：不要一次性重构所有内容。

### 3.1 推进顺序

1. **优先处理顶层 shell。** 在 `<app-root>` 模板的最外层包装元素上添加 `data-nac-plugin="<your-app-slug>"`。运行时作用域树会立即识别它。
2. **其次处理最常用的按钮。** 在使用频率最高的页面中，为保存 / 取消 / 提交 / 删除按钮直接在模板中添加三个 `data-nac-*` 属性（或通过 `NacIdDirective` 添加）。
3. **在 DevTools 中验证。** 在浏览器控制台运行 `window.NAC.describe()`，相关按钮应出现在你的插件 slug 下。
4. **添加 manifest。** 仅包含第 2 步中的按钮，并附上动词。此后 `NAC.click_by_verb()` 即可正常使用。
5. **添加字段和标签页。** 输入框设置 `role="field"`，标签页设置 `role="tab"`——**注意**：id 匹配 `^tab\.` 的元素，按规范第 1 节及 V22-01 严格校验器的要求，**必须**设置 role 为 `'tab'`。

### 3.2 与 Angular Material / PrimeNG / Taiga 配合使用

大多数 Angular 组件库支持 `[attr.data-nac-*]` 风格的输入绑定，或直接将未知属性透传到宿主元素。有两种常用模式：

**模式 A：直接绑定属性。**

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

**模式 B：在包装元素上使用 NacIdDirective。**

如果组件库渲染了宿主元素，而你希望将 NAC3 绑定到内部按钮，可以用包装元素：

```html
<span nacId="invoice.save" nacRole="action" nacAction="save"
      (click)="onSave()">
  <button mat-raised-button>Save</button>
</span>
```

NAC3 运行时通过 `data-nac-id` 进行解析，与标签名无关，因此此方式完全有效。

### 3.3 从 DOM 自动注册

与 React 中相同的 `autoRegister.watch` 模式：

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

当你的翻译目录覆盖全部 10 个 NAC3 语言区域后，将 `i18n_strict` 切换为 `'strict'`。

---

## 4. 路由与生命周期

NAC3 的快照反映的是**当前已挂载的内容**。在 Angular 路由场景下，这意味着：

- 组件在路由导航时挂载，应在 `ngOnInit` 中注册其 manifest。
- 组件在导航时卸载，应在 `ngOnDestroy` 中调用 `NAC.unregister(plugin_slug)`，避免过期插件出现在 agent 的快照中。

```ts
ngOnDestroy() {
  this.nac.runtime?.unregister?.('invoice');
}
```

对于长期存活的 shell 组件（如顶栏、侧边栏），**不要**调用 unregister——它们应始终保留在树中。

---

## 5. 测试

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

### 5.2 Playwright（端到端）

与 React 指南中相同：

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

## 6. 常见陷阱

- **`*ngFor` 中的过期 id。** 如果 id 基于索引构建（`data-nac-id="row.{{i}}"`），当列表重新排序后，缓存了该 id 的 agent 将失效。请使用稳定的键（如数据库 id）。
- **变更检测与注册循环。** 不要在 `ngOnChanges` 或每次变更检测周期都会执行的 getter 中注册 manifest。正确做法是在 `ngOnInit` 中注册一次。
- **严格模式与 zone.js。** NAC3 事件通过全局 document 传播，默认**不感知** zone。如需 zone 感知的处理，请包装你的监听器：
  ```ts
  this.zone.run(() => { /* respond to nac:action:succeeded */ });
  ```
- **SSR（Angular Universal）。** NAC3 仅在浏览器端运行。请对服务进行守卫：
  ```ts
  if (isPlatformBrowser(this.platformId)) {
    this.nac.register(...);
  }
  ```

---

## 7. 生产环境检查清单

上线前：

1. 将 `i18n_strict: 'permissive'` 替换为 `'strict'`，CI 将捕获缺失的翻译。
2. 运行 `npx @nac3/runtime validate ./src`，确保零 error 级别问题。
3. 在生产环境启动时设置 `(window as any).NAC.STRICT_VALIDATION = true`，以将 v2.2 注册时校验（如 `manifest_role_unknown` 等）升级为抛出异常。
4. 在 Playwright 测试中断言 `NAC.validate_global()` 返回 `[]`。
5. 多租户场景：在服务端对 manifest 进行 HMAC 签名，并在已认证的代码中调用 `NAC.set_provenance_secret()`。

---

## 8. 后续资源

- `SPEC.md`：完整规范合约。
- `guides/REACT.md`：跨框架对比。
- `guides/LLM_WIRING.md`：中间层后端接入指南。
- `SECURITY.md`：威胁模型说明。
- yujin.app/nac-spec/ 上的示例（`example.php` v1.9 参考实现；`example-v20-full.php` 棕地迁移示例；`example-v21-data-table.php` 数据表格 + 聊天示例）。

---

*This is a machine translation of the canonical English
version at `/nac-spec/guides/ANGULAR.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
