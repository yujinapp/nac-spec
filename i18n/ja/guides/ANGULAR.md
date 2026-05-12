---
translation_source: guides/ANGULAR.md
translation_source_hash: db5a73d8ddcd813e9bac7918d3e48e9834f98d5f60e855ace8c2f9df7cc0f0af
translation_quality: machine_v1
translation_lang: ja
translation_date: 2026-05-11T14:38:05.048317+00:00
---

# NAC3 + Angular 導入ガイド

このガイドでは、Angular アプリを NAC 駆動にするための 2 つの方法を説明します。

- **Greenfield（新規）：** `ng new` から NAC3 を統合した新規プロジェクト。
- **Brownfield（既存）：** 既存アプリに NAC3 を段階的に追加。リライト不要。

Angular 17+（スタンドアロンコンポーネント、signals、inject）で動作確認済み。旧来の Angular（NgModules）構成にも対応しています。React と同じ `@nac3/runtime` パッケージを使用し、違いは Angular らしいグルーコードの書き方にあります。

---

## 1. インストール

```
npm install @nac3/runtime
```

Angular は標準のビルドパイプライン（17+ では esbuild、旧バージョンでは webpack）でパッケージをバンドルします。`angular.json` の追加設定は不要です。

---

## 2. Greenfield -- 新規アプリ

### 2.1 ランタイムを一度だけ起動する

`main.ts` にて：

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
  // window.NAC はここで利用可能になります。テナントとプロバナンスを一度だけ設定します。
  if ((window as any).NAC?.setTenantPrefix) {
    (window as any).NAC.setTenantPrefix('demo');
  }
});
```

旧来の `app.module.ts`（NgModule）の場合、同じインポートを `platformBrowserDynamic().bootstrapModule(...)` の前にモジュールファイルへ記述します。

### 2.2 NAC3 サービス -- 登録を一元管理する

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

  /* v2.2 ヘルパー */
  bindAction(el: HTMLElement, handler: (ev: Event) => void | Promise<unknown>,
             ctx: { plugin: string; action_id: string }) {
    return this.runtime?.bindAction(el, handler, ctx);
  }
}
```

### 2.3 コンポーネントを装飾する

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
    /* v2.2: bindAction はクリックをラップし、ack を発行することで
       NAC.click('invoice.save') を待機しているエージェントが
       正常に解決できるようにします。 */
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
    // ... 保存ロジックをここに記述 ...
  }
}
```

### 2.4 NacIdDirective -- Brownfield に適したショートカット

繰り返しの装飾には、生の `data-nac-*` を 3 つ並べるよりも属性ディレクティブの方が Angular らしい書き方です。一度適用するだけで、ディレクティブが 3 つの属性をすべて設定します。

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

使用例：

```html
<button nacId="invoice.save" nacRole="action" nacAction="save"
        (click)="onSave()">
  Save
</button>
```

### 2.5 NacActionDirective -- bindAction を自動適用する

`bindAction` をラップすることで、`nacAction` で装飾された `(click)` ハンドラーが自動的に v2.2 の ack コントラクトを発行するようにします。

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
    /* この時点で Angular による (click) ハンドラーはすでに
       アタッチされています。こちらのハンドラーはそれと並行して追加され、
       v2.2 ランタイムは両方の実行後に ack を発行します。 */
    this.unbind = this.nac.bindAction(
      this.el.nativeElement,
      () => { /* コントラクトイベントのみ -- ユーザーの (click) は別途実行されます */ },
      { plugin: this.nacAction.plugin, action_id: this.nacAction.actionId }
    );
  }

  ngOnDestroy() { this.unbind?.(); }
}
```

使用例：

```html
<button nacId="invoice.save" nacRole="action" nacAction="save"
        [nacAction]="{ plugin: 'invoice', actionId: 'invoice.save' }"
        (click)="onSave()">
  Save
</button>
```

（ディレクティブのセレクター `nacAction` と `data-nac-action` のショートハンド入力が重複していますが、実際にはプロジェクトごとにどちらか一方のパターンを選択してください。このセクションは `bindAction` ラッパーを使いたい導入者向けです。）

---

## 3. ブラウンフィールド -- 既存アプリ

原則はReactと同じ：一度にすべてをリファクタリングしない。

### 3.1 作業の順序

1. **まずトップレベルのシェルから。** `<app-root>` テンプレートの最外側ラッパーに `data-nac-plugin="<your-app-slug>"` を追加する。ランタイムのスコープツリーが即座に認識する。
2. **次に最もよく使うボタン。** 最も使用頻度の高い画面の保存・キャンセル・送信・削除ボタンに、3つの `data-nac-*` 属性をテンプレートに直接（または `NacIdDirective` 経由で）追加する。
3. **DevToolsで確認。** ブラウザコンソールから `window.NAC.describe()` を実行する。ボタンがプラグインスラグの下に表示されるはず。
4. **マニフェストを追加。** ステップ2のボタンだけを、動詞とともに登録する。これで `NAC.click_by_verb()` が使えるようになる。
5. **フィールドとタブを追加。** 入力欄には `role="field"` を付与。タブには `role="tab"` を付与する。**注意：** `^tab\.` にマッチするidは、仕様書セクション1およびV22-01厳格バリデーターの規定により、必ずロール `'tab'` を持たなければならない。

### 3.2 Angular Material / PrimeNG / Taiga との連携

ほとんどのAngularコンポーネントライブラリは、`[attr.data-nac-*]` 形式の入力バインディングをサポートしているか、未知の属性をホスト要素にそのまま転送する。2つのパターンを紹介する：

**パターンA：属性バインディングを直接使用。**

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

**パターンB：ラッパーにNacIdDirectiveを使用。**

ライブラリがホスト要素をレンダリングしており、内側のボタンにNAC3を適用したい場合は、ラップする：

```html
<span nacId="invoice.save" nacRole="action" nacAction="save"
      (click)="onSave()">
  <button mat-raised-button>Save</button>
</span>
```

NAC3ランタイムはタグではなく `data-nac-id` で解決するため、これで正しく動作する。

### 3.3 DOMからの自動登録

Reactと同じ `autoRegister.watch` パターンを使用する：

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

翻訳カタログがNAC3の全10ロケールをカバーしたら、`i18n_strict` を `'strict'` に切り替える。

---

## 4. ルーティングとライフサイクル

NAC3のスナップショットは**現在マウントされているもの**を対象とする。Angularのルーターを使う場合：

- ルートナビゲーションでマウントされるコンポーネントは、`ngOnInit` でマニフェストを登録する。
- ナビゲーションでアンマウントされるコンポーネントは、`ngOnDestroy` で `NAC.unregister(plugin_slug)` を呼び出し、古いプラグインがエージェントのスナップショットに残らないようにする。

```ts
ngOnDestroy() {
  this.nac.runtime?.unregister?.('invoice');
}
```

トップバーやサイドバーなど、長期間存在するシェルコンポーネントはアンレジスターしないこと。これらは常にツリーに存在すべきである。

---

## 5. テスト

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

### 5.2 Playwright（e2e）

Reactガイドと同様：

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

## 6. よくある落とし穴

- **`*ngFor` 内の古いid。** インデックスからidを生成している場合（`data-nac-id="row.{{i}}"`）、idをキャッシュしたエージェントは並び替え時に壊れる。安定したキー（DBのid）を使うこと。
- **変更検知と登録ループ。** `ngOnChanges` や、変更検知サイクルごとに実行されるゲッター内でマニフェストを登録しないこと。`ngOnInit` で一度だけ登録するのが正しい。
- **Strictモードとzone.js。** NAC3のイベントはグローバルなdocumentを通じて流れる。デフォルトではzone対応していない。zone対応のハンドリングが必要な場合は、リスナーをラップすること：
  ```ts
  this.zone.run(() => { /* respond to nac:action:succeeded */ });
  ```
- **SSR（Angular Universal）。** NAC3はブラウザ専用である。サービスをガードすること：
  ```ts
  if (isPlatformBrowser(this.platformId)) {
    this.nac.register(...);
  }
  ```

---

## 7. 本番環境チェックリスト

リリース前に：

1. `i18n_strict: 'permissive'` を `'strict'` に変更する。CIが翻訳漏れを検出するようになる。
2. `npx @nac3/runtime validate ./src` を実行し、エラー重大度の指摘がゼロであることを確認する。
3. 本番起動時に `(window as any).NAC.STRICT_VALIDATION = true` を設定し、v2.2のレジスター時チェック（`manifest_role_unknown` など）を例外としてスローするよう強制する。
4. Playwrightテストから `NAC.validate_global()` が `[]` を返すことをアサートする。
5. マルチテナント環境では：サーバーサイドでHMACによりマニフェストに署名し、認証済みコードから `NAC.set_provenance_secret()` を呼び出す。

---

## 8. 次のステップ

- `SPEC.md` ：完全な仕様書。
- `guides/REACT.md` ：フレームワーク間の比較。
- `guides/LLM_WIRING.md` ：中間バックエンドの接続方法。
- `SECURITY.md` ：脅威モデル。
- yujin.app/nac-spec/ のデモ（`example.php` v1.9リファレンス、`example-v20-full.php` ブラウンフィールド移行、`example-v21-data-table.php` データテーブル＋チャット）。

---

*This is a machine translation of the canonical English
version at `/nac-spec/guides/ANGULAR.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
