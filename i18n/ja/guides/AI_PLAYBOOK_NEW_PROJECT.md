---
translation_source: guides/AI_PLAYBOOK_NEW_PROJECT.md
translation_source_hash: 6586a966938a6d84086a8b79805cde15886536b6718b79526ff7d16d202686fe
translation_quality: machine_v1
translation_lang: ja
translation_date: 2026-05-11T14:40:43.860355+00:00
---

# AI プレイブック -- 新しい NAC-3 プロジェクトを始める

**NAC3 バージョン:** 2.2 stable + v2.3 interop preview。
**対象読者:** NAC-3 準拠プロジェクトをゼロからブートストラップするタスクを担う AI エージェント（Claude、GPT、Gemini、ローカル LLM）。
**形式:** ステップバイステップのランブック。各ステップに WHAT・HOW・ASSERT を記載。曖昧さなし。

人間が **「新しい NAC-3 プロジェクトを始めよう」** などと言った場合、このファイルを読んでいる AI エージェントは以下のステップを順番に実行し、各ゲートを確認してから次へ進まなければならない。

---

## Step 0 -- 人間とスコープを確認する

コードを書く前に、以下の質問を正確に行うこと:

1. **フレームワーク**: React、Angular、Vue、Svelte、バニラ、またはサーバーレンダリング（PHP/Rails/Django）？
2. **言語**: アプリがローンチ時にサポートすべき NAC3 の 10 ロケールはどれか？（es、en、pt、fr、it、de、ja、zh、hi、ar）
3. **チャットバックエンド**: アプリ独自の LLM 仲介（エンドポイントを提供）を公開するか、ホスト型の Yujin チャットを使用するか？
4. **プロベナンス**: マルチテナントか？ Yes の場合、HMAC マニフェスト署名を計画すること。
5. **音声**: プッシュトゥトーク専用、ハンズフリー、またはその両方？
6. **Interop（v2.3 preview）**: このアプリは他の NAC3 ホスト（Yujin Pilot、ピアアプリ）からインポート可能にするか？ Yes の場合 -> MCP サーバーツールを公開すること。

各回答を記録しておくこと。これらがその後のすべての判断を左右する。

---

## Step 1 -- プロジェクトをスキャフォールドする

### React (Vite)

```bash
npm create vite@latest <slug> -- --template react-ts
cd <slug>
npm install
npm install @nac3/runtime@^2.2.0
```

### Angular

```bash
npx -p @angular/cli ng new <slug> --style=css --routing=true --strict
cd <slug>
npm install @nac3/runtime@^2.2.0
```

### バニラ（HTML + JS + PHP、フレームワークなし）

以下を作成:
- `index.html` に `<body data-nac-plugin="app">` を含める。
- `js/app.js` にインポートを記述。

### サーバーレンダリング

CDN 経由で `@nac3/runtime` を埋め込む:

```html
<script src="https://yujin.app/nac-spec/js/nac.js?v=v22"></script>
<script src="https://yujin.app/nac-spec/js/nac-v2-extensions.js?v=v22"></script>
```

**Assert:** `npm run build`（またはフレームワーク相当のコマンド）がエラーなく成功すること。ブラウザで開き、`window.NAC` が定義されていること。

---

## Step 2 -- シェルをデコレートする

テンプレートの**ルートコンテナ**に追加:

```html
<div data-nac-plugin="<your-app-slug>" class="app">
  ...
</div>
```

**クリック可能なすべてのウィジェット**（ボタン、ボタンとして機能するリンク）に追加:

```html
<button
  data-nac-id="<slug>.<verb>"
  data-nac-role="action"
  data-nac-action="<verb>"
  onclick="...">
  ...
</button>
```

**すべてのフォームフィールド**（input、textarea、select）に追加:

```html
<input
  data-nac-id="<slug>.<field-name>"
  data-nac-role="field"
  ... />
```

**すべてのタブボタン**に追加（仕様は厳格: `^tab\.` の id には必ず role `tab` が必要）:

```html
<button
  data-nac-id="tab.<key>"
  data-nac-role="tab"
  onclick="...">
  ...
</button>
```

**Assert:** `npx @nac3/runtime validate ./src` がエラー重大度のゼロ件を報告すること。ブラウザコンソールから `NAC.describe()` を実行すると、`data-nac-plugin` に一致するツリーが返ること。

---

## Step 3 -- マニフェストを書く

`src/nac/manifest.ts`（または相当ファイル）を作成:

```ts
const li = (es:string,en:string,pt:string,fr:string,it:string,
            de:string,ja:string,zh:string,hi:string,ar:string) =>
  ({ es, en, pt, fr, it, de, ja, zh, hi, ar });

export const APP_MANIFEST = {
  plugin_slug: '<your-app-slug>',
  version: '1.0.0',
  nac_version: '2.2',
  elements: [
    {
      id: '<slug>.save',
      role: 'action',
      actions: [{
        verb: 'save',
        label_i18n: li('Guardar','Save','Salvar','Sauver','Salva',
                       'Speichern','保存','保存','sahejna','حفظ')
      }],
      label_i18n: li(/* same 10 */)
    },
    // ... その他すべての要素 ...
  ]
};
```

**重要なルール:**
- すべての `label_i18n` はサポートする 10 ロケールすべてをカバーしなければならない。半分しか入力されていない場合、v2.2 厳格バリデーターの指摘対象となる。
- `^tab\.` に一致するすべての `id` は `role: 'tab'` を持たなければならない。
- すべての `id` はプラグイン名前空間付きでなければならない（例: `save` ではなく `invoice.save`）。
- ID は UI のリデザインをまたいで安定していなければならない。

**Assert:** `NAC.validate_global({probe: false})` がエラー重大度ゼロ件を返すこと。

---

## Step 4 -- 起動時にマニフェストを登録する

### React

```tsx
import { useEffect } from 'react';
import '@nac3/runtime';
import '@nac3/runtime/extensions';
import { APP_MANIFEST } from './nac/manifest';

export function App() {
  useEffect(() => {
    window.NAC?.register(APP_MANIFEST);
  }, []);
  // ...
}
```

### Angular

```ts
import { Injectable } from '@angular/core';
import '@nac3/runtime';
import '@nac3/runtime/extensions';
import { APP_MANIFEST } from './nac/manifest';

@Injectable({ providedIn: 'root' })
export class NacBoot {
  constructor() {
    (window as any).NAC?.register(APP_MANIFEST);
  }
}
```

`NacBoot` を `AppComponent` にインジェクトすること。

### バニラ

```html
<script type="module">
import { APP_MANIFEST } from './nac/manifest.js';
window.NAC.register(APP_MANIFEST);
</script>
```

**Assert:** `NAC.list_registered_plugins()` が `['<your-app-slug>']` を返すこと。

---

## Step 5 -- すべてのクリックハンドラーから ack コントラクトを発行する

`data-nac-role="action"` でデコレートされた各ボタンについて、クリックハンドラーは同期的な副作用の後に `nac:action:succeeded` を発行しなければならない。

### パターン A -- `NAC.bindAction` 経由（v2.2 ヘルパー、推奨）

```ts
const btn = document.querySelector('[data-nac-id="<slug>.save"]');
NAC.bindAction(btn, function (ev) {
  saveInvoice();          // 副作用
}, { plugin: '<slug>', action_id: '<slug>.save' });
```

`bindAction` は同期・非同期（Promise）・例外のケースを自動的に処理する。

### パターン B -- 手動発行

```ts
button.addEventListener('click', function () {
  saveInvoice();
  document.dispatchEvent(new CustomEvent('nac:action:succeeded', {
    detail: { plugin: '<slug>', action_id: '<slug>.save' }
  }));
});
```

他の role については、対応する標準イベントファミリーを発行すること:
- `role="field"` -> `nac:field:changed`（detail: `{plugin, field_id, value}`）
- `role="tab"` -> `nac:tab:activated`（detail: `{plugin, tab_id}`）
- 完全なテーブルは SPEC.md セクション 6 を参照。

**Assert:** ブラウザコンソールから:
```js
document.addEventListener('nac:action:succeeded', e => console.log(e.detail));
await NAC.click('<slug>.save');
// {plugin: '<slug>', action_id: '<slug>.save', ...} が出力されるはず
```

---

## Step 6 -- チャットパネルを接続する

リファレンスチャットクライアントを組み込むか、Yujin Pilot（外部）を使用する。

### オプション A -- `nac-chat-client.js` を埋め込む

```html
<aside class="chat" data-nac-plugin="chat" aria-hidden="true">
  <header class="chat-head">...</header>
  <div id="chat-log" data-nac-id="chat.log" data-nac-role="region"></div>
  <input id="chat-input" data-nac-id="chat.input" data-nac-role="field">
  <button id="chat-send" data-nac-id="chat.send" data-nac-role="action">send</button>
</aside>

<script src="https://yujin.app/nac-spec/js/nac-chat-client.js?v=v22"></script>
<script>
  NacChat.init({
    endpoint: '/api/your-llm-intermediary',
    chatLog: document.getElementById('chat-log'),
    input:   document.getElementById('chat-input'),
    sendBtn: document.getElementById('chat-send')
  });
</script>
```

`endpoint` は自分で用意する -- `{prompt, lang, history, nac_tree}` を受け取り `{message, actions[]}` を返す LLM 仲介バックエンド。`LLM_WIRING.md` を参照。

### オプション B -- Yujin Pilot に委ねる

チャットを一切埋め込まない。ユーザーに「このアプリで音声 + チャットを使うには Yujin Pilot（yujin.app/pilot）をインストールしてください」と伝える。Pilot の MCP スキャナーがアプリを検出し、中央コックピットから操作する。

---

## Step 7 -- テストコーパスを実行する

Yujin リファレンステストインフラを出発点としてコピーする:

```bash
# プロジェクトルートから
cp -r /path/to/rpaforce-crm/packages/nac/test ./test
cp -r /path/to/rpaforce-crm/tools/nac/test-launch.sh ./tools/test-launch.sh
```

`test/stage*.mjs` を編集し、デモのものではなく自分のマニフェストとプラグインスラッグを参照するようにする。スケルトン自体は同一のまま。

実行:

```bash
bash ./tools/test-launch.sh
```

**Assert:** ノード側のすべてのレイヤーが GREEN。合計時間 15 秒未満。

---

## Step 8 -- Playwright e2e を追加する

```bash
mkdir -p tests/e2e-nac
cd tests/e2e-nac
npm init -y
npm install --save-dev @playwright/test
npx playwright install chromium
```

Yujin リファレンスの `tests/e2e-nac/specs/01-landing.spec.ts` をテンプレートとしてコピーし、自分のアプリの URL とプラグインスラッグに合わせて修正する。

**フルパイプラインテスト**（チャット -> LLM -> ディスパッチ -> DOM -> ack）については、Yujin の `08-pipeline-end-to-end.spec.ts` を参照。3 つのテストがライブバックエンドに対してフロー全体を検証する。

---

## Step 9 -- 本番チェックリスト

デプロイ前に:

- [ ] `NAC.STRICT_VALIDATION = true` -- 登録時のロールバリデーションを強制する（ドリフト時にスローする）。
- [ ] `npx @nac3/runtime validate ./src` -- エラー重大度ゼロ件。
- [ ] `npm test`（自分のハーネス）-- 100% パス。
- [ ] `npx playwright test` -- すべての e2e がグリーン。
- [ ] マルチテナント: サーバーサイドでマニフェストを HMAC 署名し、認証済みコードから `NAC.set_provenance_secret()` を呼び出す。
- [ ] is_trusted ゲート付き動詞: RPA ボット / 合成クリックがトリガーを許可されるべき動詞を明示的にホワイトリスト登録する（SECURITY.md 参照）。
- [ ] i18n: すべての `label_i18n` が 10 ロケールすべてをカバーしていること（移行中は `i18n_strict: 'permissive'` を使用可）。

---

## Step 10 -- NAC-3 準拠に昇格する

`NAC.validate_global({probe: true})` を実行する。ランタイムが `role="action"` のすべての要素に対して合成クリックを行い、各要素が 5 秒以内に ack を発行することを検証する。

**Assert:** ゼロ件。これで NAC-3 準拠となる。

---

## AI がよく犯すミス（とその回避方法）

1. **DOM に `data-nac-plugin` がない状態でマニフェストを登録する。**
   ランタイムの `NAC.describe()` はレジストリではなく DOM を走査する。属性がなければ、LLM 仲介のスナップショットはそのプラグインについて空になる。必ず両方をセットで設定すること。
2. **React/Vue の状態をチャットハンドラーでクロージャーする。** ref または関数型セッターを使用すること。CASE_STUDIES_DISCOVERY.md バグ #2 を参照。
3. **i18n の不完全な設定。** v2.2 厳格バリデーターは不完全な label_i18n マップで失敗する。部分的にリリースしなければならない場合は `i18n_strict: 'permissive'` と TODO チケットを使用すること。永続的な回避策ではない。
4. **リファクタリング後に ID を再利用する。** 新しいセマンティックロールに名前変更されたボタンは新しい id を取得しなければならない。再利用するとすべてのダウンストリームエージェントスクリプトが壊れる。
5. **ack イベントを忘れる。** 処理を同期的に行うが `nac:action:succeeded` を発行しないハンドラーは `NAC.click()` をタイムアウトさせる。コントラクトを組み込むために `bindAction` を使用すること。

---

## 関連情報

- [SPEC.md](../SPEC.md) -- 標準コントラクト。
- [AI_PLAYBOOK_MIGRATION.md](AI_PLAYBOOK_MIGRATION.md) -- 既存プロジェクト向け。
- [NAC_TEST_MANUAL.md](../docs/NAC_TEST_MANUAL.md) -- あらゆる NAC-3 アプリ向けテストプレイブック。
- [REACT.md](REACT.md) / [ANGULAR.md](ANGULAR.md) -- フレームワーク詳細解説。

## ライセンス

Apache-2.0。

---

*This is a machine translation of the canonical English
version at `/nac-spec/guides/AI_PLAYBOOK_NEW_PROJECT.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
