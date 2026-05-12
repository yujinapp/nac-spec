---
translation_source: guides/AI_PLAYBOOK_MIGRATION.md
translation_source_hash: f49b65c798ab36923cab79511851c64a81ad6609a1c37d4936d4c6c0542cc706
translation_quality: machine_v1
translation_lang: ja
translation_date: 2026-05-11T14:41:59.333262+00:00
---

# AI Playbook -- 既存プロジェクトを NAC3 へ移行する

**NAC3 バージョン:** 2.2 stable + v2.3 interop preview。
**対象読者:** ブラウンフィールド移行（既存 Web アプリを NAC-3 準拠へ移行）を担当する AI エージェント（Claude、GPT、Gemini、ローカル LLM）。
**フォーマット:** 各ステップに WHAT・HOW・ASSERT を記載したステップバイステップのランブック。

人間が **「このプロジェクトを NAC-3 に移行しよう」** と言ったとき、このファイルを読んだ AI エージェントは以下のステップを順番に実行しなければならない。
ブラウンフィールド移行は、動いているアプリを壊せないため、グリーンフィールドより難しい。各ステップは**独立してリリース**する。

---

## Step 0 -- スコープ + 安全ゲート

### 0.1 人間に確認すべき質問

1. **リスク範囲**: アプリは本番稼働中か？本番の場合はフィーチャーフラグの裏で画面単位に移行する。ステージング環境なら大胆に進められる。
2. **フレームワーク**: `package.json` / `composer.json` / プロジェクトツリーから検出し、人間に確認する。
3. **上位 10 動詞**: アプリで最もよく使われるアクション（保存、キャンセル、検索、フィルターなど）を 10 個挙げてもらう。これらを最初に移行する。
4. **チャットバックエンド**: 既存のチャット基盤（`/yujin/nac-demo` の Yujin chat、または独自の LLM 仲介サービス）を再利用するか？
5. **現在のテストカバレッジ**: Playwright / Cypress / Jest は導入済みか？NAC3 のテストは既存テストを置き換えるのではなく、並列で追加する。
6. **コンポーネントライブラリ**: shadcn / MUI / PrimeNG / Mantine / カスタム？ライブラリによっては `data-*` プロパティを飲み込んでしまうため、ラッパーが必要になる（Step 5 参照）。

### 0.2 事前 git 整理

```bash
git status              # 開始前にクリーンな状態であること
git checkout -b feat/nac3-migration
```

NAC 移行の各ステップは独自のコミットに収める。人間がスライス単位でレビュー・リバートできるようにするためだ。

---

## Step 1 -- ランタイムのインストール + ブートモジュールの作成

```bash
npm install @nac3/runtime@^2.2.0
```

`src/nac/boot.ts`（またはフレームワーク相当のファイル）を作成する:

```ts
import '@nac3/runtime';
import '@nac3/runtime/extensions';
// import '@nac3/runtime/chat-client';  // uncomment when ready for chat

declare global { interface Window { NAC?: any; NacChat?: any; } }
```

アプリのルートエントリ（`main.tsx`、`app.module.ts`、または HTML の head スクリプトの先頭）から一度だけインポートする。

**Assert:** ブラウザコンソールで `window.NAC` が定義されていること。`window.NAC.version` が `'2.2.0'`（以上）を返すこと。

**Commit:** `feat(nac3-migration): step 1 -- install runtime + boot module`

---

## Step 2 -- アプリシェルのデコレート

メイン UI を包む**最外側のコンテナ**に `data-nac-plugin="<app-slug>"` を追加する。これは移行において最も重要な属性だ。これがないと LLM 仲介サービスのスナップショットが空になる（React + Angular の事例調査で発覚したバグ #1。`docs/CASE_STUDIES_DISCOVERY.md` に記録済み）。

### React の例

```tsx
return (
  <div className="app" data-nac-plugin="my-app">
    ...
  </div>
);
```

### Angular の例

```html
<div class="app" data-nac-plugin="my-app">
  ...
</div>
```

### サーバーレンダリング（PHP / Rails / Django）

```html
<body data-nac-plugin="my-app">
  ...
</body>
```

**Assert:** ブラウザコンソールで `NAC.describe().plugins.length >= 1` を確認。

**Commit:** `feat(nac3-migration): step 2 -- root data-nac-plugin attribute`

---

## Step 3 -- 上位 10 動詞を持つボタンのデコレート

Step 0.3 で挙げた上位 10 アクションを対象にする。各ボタンに以下を追加する:

```html
<button
  data-nac-id="<plugin>.<verb>"
  data-nac-role="action"
  data-nac-action="<verb>"
  onclick="...">
  ...
</button>
```

**ID 命名規則:**
- プラグイン名前空間を付ける: `save` だけでなく `invoice.save`。
- スネークケース小文字: `add_row`（`AddRow` や `add-row` は不可）。
- アプリ全体の動詞ならリーフに動詞を置く。ネストする場合は `dashboard.invoice.list.row.42.delete` のように記述する。

既存の `onclick` / イベントハンドラには触れない。デコレートは追加的な変更だ。

**Assert:** コンソールから確認:
```js
NAC.describe().plugins[0].elements.length  // >= 10
NAC.list_registered_plugins()                // プラグインが含まれていること
```

**Commit:** `feat(nac3-migration): step 3 -- top-10 buttons decorated`

---

## Step 4 -- 最小限のマニフェストを追加する

初日からすべての要素を網羅しようとしないこと。Step 3 の上位 10 動詞ボタンに `label_i18n` を付けてカバーする:

```ts
// src/nac/manifest.ts
const li = (es:string,en:string,pt:string,fr:string,it:string,
            de:string,ja:string,zh:string,hi:string,ar:string) =>
  ({ es, en, pt, fr, it, de, ja, zh, hi, ar });

export const APP_MANIFEST = {
  plugin_slug: 'my-app',
  version: '1.0.0',
  nac_version: '2.2',
  elements: [
    {
      id: 'my-app.save', role: 'action',
      actions: [{
        verb: 'save',
        label_i18n: li('Guardar','Save','Salvar','Sauver','Salva',
                       'Speichern','保存','保存','sahejna','حفظ')
      }],
      label_i18n: li(/* same */)
    },
    // ... 残り 9 件 ...
  ]
};
```

ブート時に登録する:

```ts
window.NAC?.register(APP_MANIFEST);
```

初日に 10 ロケールをリリースできない場合は、autoRegister.watch パスで `i18n_strict: 'permissive'` を使用する。これは一時的な回避策だ。本番の NAC3 v2.2 strict-validator は i18n が不完全な場合に警告を出す。

**Assert:**
```js
NAC.list_registered_plugins()           // ['my-app']
await NAC.click_by_verb('my-app','save')  // resolves
```

**Commit:** `feat(nac3-migration): step 4 -- manifest with top-10 verbs`

---

## Step 5 -- コンポーネントライブラリへの対応（該当する場合）

MUI / Mantine / PrimeNG などを使用していてボタンが `data-*` プロパティを飲み込む場合は、薄いラッパーを書く:

```tsx
// src/nac/NacButton.tsx
import { Button as MuiButton } from '@mui/material';
import { useEffect, useRef } from 'react';

export function NacButton({ nacId, verb, plugin, children, ...rest }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.setAttribute('data-nac-id', nacId);
    el.setAttribute('data-nac-role', 'action');
    el.setAttribute('data-nac-action', verb);
  }, [nacId, verb]);
  return <MuiButton ref={ref} {...rest}>{children}</MuiButton>;
}
```

上位 10 ボタンについて `<Button>` を `<NacButton nacId="..." verb="...">` に置き換える。段階的に進めること。

**Commit:** `feat(nac3-migration): step 5 -- component library wrapper`

---

## Step 6 -- ack コントラクトの発行

v2.2 の `bindAction` ヘルパーが最もクリーンな方法だ:

```ts
import { useRef, useEffect } from 'react';

export function useNacAction(plugin: string, actionId: string) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || !window.NAC) return;
    return window.NAC.bindAction(el, () => {}, { plugin, action_id: actionId });
  }, [plugin, actionId]);
  return ref;
}
```

```tsx
function SaveButton({ onSave }) {
  const ref = useNacAction('my-app', 'my-app.save');
  return <button ref={ref} onClick={onSave}>Save</button>;
}
```

`bindAction` レイヤーは、ユーザーの `onClick` が返った後に自動で `nac:action:succeeded` を発火する。「チャットが『X を実行できませんでした: タイムアウト』と言う」問題はこれで解消される。

**Assert:** コンソールから確認:
```js
document.addEventListener('nac:action:succeeded', e => console.log(e.detail));
await NAC.click('my-app.save');
// {plugin: 'my-app', action_id: 'my-app.save', ...} が出力されること
```

**Commit:** `feat(nac3-migration): step 6 -- bindAction ack contract`

---

## Step 7 -- フィールドとタブの追加

ユーザーが入力するすべての input に:

```html
<input data-nac-id="my-app.field_x" data-nac-role="field" ...>
```

タブストリップコンポーネントのすべてのタブに:

```html
<button
  data-nac-id="tab.<key>"
  data-nac-role="tab"
  onclick="...">
  ...
</button>
```

**重要（v2.2 strict-validator ルール）:** `^tab\.` にマッチする ID は必ず role を `tab` にすること。ロールが一致しない場合は `tab_id_manifest_role_drift` の検出結果が生成され、ランタイムが `NAC.tab()` でタブを見つけられなくなる。

**Commit:** `feat(nac3-migration): step 7 -- fields + tabs decorated`

---

## Step 8 -- チャットパネルの追加（任意・後回し可）

リファレンス実装の `nac-chat-client.js` を組み込む:

```html
<aside class="chat" data-nac-plugin="chat" aria-hidden="true">
  <div id="chat-log" data-nac-id="chat.log" data-nac-role="region"></div>
  <input id="chat-input" data-nac-id="chat.input" data-nac-role="field">
  <button id="chat-send" data-nac-id="chat.send" data-nac-role="action">send</button>
</aside>

<script src="https://yujin.app/nac-spec/js/nac-chat-client.js?v=v22"></script>
<script>
NacChat.init({
  endpoint: '/your-llm-intermediary',   // or '/crm/api/v1/yujin/nac-demo'
  chatLog: document.getElementById('chat-log'),
  input:   document.getElementById('chat-input'),
  sendBtn: document.getElementById('chat-send')
});
</script>
```

あるいは、**チャットを完全に後回しにして**、Yujin Pilot（`yujin.app/pilot`）をインストールするようユーザーに案内する方法もある。Yujin Pilot は MCP 経由でアプリを検出し、中央コックピットから操作できる。

**Commit:** `feat(nac3-migration): step 8 -- chat panel`

---

## Step 9 -- NAC3 テストコーパスの追加

Yujin リファレンステストインフラをコピーする:

```bash
mkdir -p test/nac3
cp /path/to/rpaforce-crm/packages/nac/test/stage*.mjs ./test/nac3/
cp /path/to/rpaforce-crm/tools/nac/test-launch.sh ./test/nac3/
```

プラグインスラッグとマニフェスト参照を適宜修正する。実行:

```bash
bash ./test/nac3/test-launch.sh
```

**Assert:** すべてのレイヤーが GREEN であること。

**Commit:** `feat(nac3-migration): step 9 -- NAC3 test corpus`

---

## Step 10 -- NAC-3 準拠への昇格

```bash
# CI にて:
npx @nac3/runtime validate ./src --severity=error  # exit 0 が必要
NAC.validate_global({probe: true})              # 検出結果ゼロが必要
```

本番ブートで `NAC.STRICT_VALIDATION = true` を設定し、登録時のロール整合性を強制する。

**Commit:** `feat(nac3-migration): step 10 -- NAC-3 conformance gate`

---

## 画面をまたいだ移行順序

多くの画面を持つ本番アプリでは、一度にすべてを移行しようとしないこと:

1. **最もよく使われる画面から**（例: ログイン + ダッシュボード）。
2. **次に価値の高い画面**（パワーユーザーが常駐する画面）。
3. **公開向け画面**（匿名トラフィックから見える画面）。
4. **管理画面は最後**（トラフィックが少なく、受け入れが深い）。

各画面は独自の PR にする。フィーチャーフラグがあれば PR ごとにフラグの裏でリリースし、フラグを切り替えるだけでロールバックできる。

---

## よくある移行の落とし穴

1. **ルートに `data-nac-plugin` を付け忘れた。** マニフェストは登録されているが LLM には見えない。**症状:** チャットがアクションなしで「何かお手伝いできますか」と返す。修正: 属性を追加する（事例調査のバグ #1）。
2. **onChatAction 内の React state のステールクロージャ。** ref と関数型セッターを使うこと（事例調査のバグ #2）。
3. **tab ロール以外の ID が `^tab\.` にマッチしている。** v2.2 strict-validator の検出対象。`^tab\.` には必ず role `tab` を付けること。
4. **リファクタ後に ID を再利用した。** 新しいセマンティックロールに移動したボタンには必ず新しい ID を付けること。再利用するとダウンストリームの自動化が壊れる。
5. **コンポーネントライブラリが `data-*` を飲み込む。** 早期に検出してラッパーを書くこと（Step 5）。
6. **クリックハンドラが ack を発行しない。** `bindAction` を使うこと。これがないと、副作用が成功していても `NAC.click()` が 5 秒でタイムアウトする。

---

## 関連ドキュメント

- [AI_PLAYBOOK_NEW_PROJECT.md](AI_PLAYBOOK_NEW_PROJECT.md) -- グリーンフィールドプロジェクト向け。
- [REACT.md](REACT.md) / [ANGULAR.md](ANGULAR.md) -- フレームワーク詳細解説。
- [NAC_TEST_MANUAL.md](../docs/NAC_TEST_MANUAL.md) -- 移行後のテストプレイブック。
- [CASE_STUDIES_DISCOVERY.md](../docs/CASE_STUDIES_DISCOVERY.md) -- Yujin リファレンス移行中に発見されたバグ。

## ライセンス

Apache-2.0.

---

*This is a machine translation of the canonical English
version at `/nac-spec/guides/AI_PLAYBOOK_MIGRATION.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
