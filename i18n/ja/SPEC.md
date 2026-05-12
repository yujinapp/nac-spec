---
translation_source: SPEC.md
translation_source_hash: 5ebb8103746daf5bf7877b67ebb3a44cf98b4e2cba1fd8ba30093e0fce1b9b76
translation_quality: machine_v1
translation_lang: ja
translation_date: 2026-05-11T13:03:11.000777+00:00
---

# NAC3 -- Native Agent Contract

**Version:** 2.2.0
**Status:** Stable
**License:** Apache-2.0
**Editor:** Yujin (yujin.app)

---

## 0. 目的

NAC3 は、Web UI とそれを操作するエージェントの間のコントラクトです。
エージェントには、音声ランナー、LLM 仲介、RPA ボット、
アクセシビリティツール、エンドツーエンドテストランナーが含まれます。このコントラクトは以下を規定します：

1. **要素の命名方法** -- エージェントが「保存ボタンをクリック」と要求したとき、単一の DOM ノードに解決できるようにする。
2. **動詞の適用方法** -- エージェントがアプリごとのグルーコードなしに `NAC.click(id)`、`NAC.fill(id, value)`、`NAC.tab(plugin, key)` などを呼び出せるようにする。
3. **完了の通知方法** -- ロールごとに決定論的なイベントファミリーを用いて、エージェントがステップの完了を認識できるようにする。
4. **来歴の保持方法** -- 下流システムが実際のユーザー操作と合成操作を区別できるようにする。

NAC3 は、既存のレンダリングフレームワークの上に薄いレイヤーを追加するものです。ARIA、React、Vue、またはデザインシステムを置き換えるものではありません。

---

## 1. ロール

エージェントが関与するすべての DOM 要素は `data-nac-role` を持ちます。標準ロールは以下のとおりです：

| ロール | 意味 | 例 |
|--------|------|----|
| `plugin` | 自己完結した UI モジュール（ページ、パネル、ウィジェット集合）。 | `<article data-nac-plugin="invoice">` |
| `section` | プラグイン内のランドマーク（ヘッダー、ボディ、フッター、サイドバー）。 | `<section data-nac-role="section">` |
| `region` | セクション内の名前付きエリア（カードクラスター、結果リストなど）。 | `<div data-nac-role="region">` |
| `action` | 動詞をトリガーするクリック可能なウィジェット（ボタン、ボタンとして機能するリンク）。 | `<button data-nac-role="action" data-nac-action="save">` |
| `field` | ユーザーが入力またはトグルする入力要素（テキスト、数値、チェックボックス、ラジオ、日付、ファイル）。 | `<input data-nac-role="field">` |
| `option` | フィールド内の選択可能なオプション（コンボボックス / セレクト / ラジオグループの子要素）。 | `<li data-nac-role="option">` |
| `tab` | 切り替え可能なパネルセレクター。**`data-nac-id` が `^tab\.` にマッチする場合は必須。** | `<button data-nac-role="tab" data-nac-id="tab.lines">` |
| `breadcrumb-item` | パンくずリストのホップ。 | `<a data-nac-role="breadcrumb-item">` |
| `accordion-toggle` | 展開/折りたたみコントロール。 | `<button data-nac-role="accordion-toggle">` |
| `step` | ウィザードのステップインジケーター。 | `<li data-nac-role="step">` |
| `pagination-item` | ページネーションリストのページジャンプコントロール。 | `<button data-nac-role="pagination-item">` |
| `confirm-button` | 確認ダイアログ内の確認/キャンセルボタン。 | `<button data-nac-role="confirm-button">` |
| `sort-control` | 列ソートヘッダー。 | `<th data-nac-role="sort-control">` |
| `filter-control` | 列フィルタートリガー。 | `<button data-nac-role="filter-control">` |
| `data-table` | データテーブルのホスト要素（v2.1）。 | `<table data-nac-role="data-table">` |
| `navigation` | ランドマークナビゲーション領域。**タブではありません。** | `<nav data-nac-role="navigation">` |
| `confirm-dialog` | 確認要求のモーダル。 | `<div data-nac-role="confirm-dialog">` |

このリスト以外のロールは将来の使用のために予約されています。NAC-strict ランタイムは、登録時に未知のロールを拒否すべきです（SHOULD）（v2.2）。NAC-permissive ランタイムは、後方互換性のために未知のロールを `action` として扱ってもかまいません（MAY）（v1.9 および v2.0 のデフォルト）。

---

## 2. 名前

エージェントが解決可能なすべての要素は `data-nac-id` を持ちます。ID は以下の特性を持ちます：

- **ドット区切りのパス**（例：`deals.list.row.42.actions.delete`）。
  ドットはセマンティックレベルを区切ります。ランタイムはこれを解釈しませんが、人間と LLM は解釈します。
- **`data-nac-plugin` スコープ内でグローバルに一意。** 異なる 2 つのプラグインが同じ ID を持つことは許可されます（MAY）。ランタイムは `(plugin, id)` のペアで解決します。
- **再レンダリングをまたいで安定。** レンダリングごとに新しい ID を生成するフレームワーク（ランダムハッシュ、インスタンスカウンターなど）はこのコントラクトを破壊します。
- **UI 再設計をまたいで安定。** ボタンがツールバーからドロップダウンに移動しても、その ID は変更してはなりません（MUST）。

予約済み ID プレフィックス（v2.1）：

| プレフィックス | 予約用途 |
|----------------|----------|
| `tab.` | タブボタン。ロールは `tab` でなければなりません（MUST）。 |
| `modal.` | モーダルスコープの要素。ロールはリーフウィジェットのロールになります。 |
| `field.` | フォームフィールドの省略形。ロールは `field` または `option` でなければなりません（MUST）。 |
| `confirm.` | 確認ダイアログ。 |

---

## 3. 動詞

`data-nac-role="action"` 要素は、その動作を示す `data-nac-action="<verb>"` を持つことができます（MAY）。動詞は、ホストとエージェントの間で合意されたスネークケースの自由形式識別子です。一般的な動詞：

`save`, `cancel`, `submit`, `delete`, `edit`, `view`, `create`,
`approve`, `reject`, `send`, `download`, `upload`, `refresh`,
`expand`, `collapse`, `open`, `close`, `add_row`, `remove_row`.

`NAC.click_by_verb(plugin, verb)` は、動詞をそのプラグイン配下の一意のアクションに解決してクリックします。1 つのプラグイン内で複数のアクションが同じ動詞を共有することはマニフェストエラーです（lint: `duplicate_verb`）。

---

## 4. マニフェスト

すべてのプラグインは、以下の方法でマニフェストを登録することができます（MAY）：

```js
NAC.register({
  plugin_slug: 'invoice',
  version:     '1.0.0',
  nac_version: '2.1',
  elements: [
    { id: 'invoice.save', role: 'action',
      actions: [{ verb: 'save', label_i18n: { es: 'Guardar', en: 'Save', ... } }],
      label_i18n: { es: 'Guardar factura', en: 'Save invoice', ... } },
    ...
  ],
  tabs: [
    { nac_id: 'tab.lines', label_i18n: { es: 'Lineas', en: 'Lines' } },
    ...
  ],
  fields: [
    { id: 'field.client_name', type: 'text', required: true,
      label_i18n: { es: 'Cliente', en: 'Customer' } },
    ...
  ],
  data_tables: [...]
});
```

マニフェストはエージェント向けの信頼できる情報源です。「ユーザーが『guardar』と言った」と判断した LLM 仲介は、プラグインマニフェストを参照して動詞 `save` を見つけ、`NAC.click_by_verb('invoice', 'save')` を発行します。

### 4.1 必須フィールド

- `plugin_slug` -- ホスト要素の `data-nac-plugin` と一致する必要があります。
- `nac_version` -- このマニフェストが準拠を主張する NAC3 のバージョン。ランタイムは、自身のバージョンより高いバージョンを主張するマニフェストを拒否します。

### 4.2 オプションフィールド

- `elements[]` -- 名前付きウィジェットのカタログ。各エントリは `id` と `role` を持たなければなりません（MUST）。
- `tabs[]` -- タブ専用のトップレベル配列。`role:'tab'` を持つ `elements[]` エントリと同等です。どちらの形式も有効です。
- `fields[]`、`actions[]`、`kpis[]`、`data_tables[]` -- 型付きサブコレクション。ロールでフィルタリングされた `elements[]` と同じセマンティクスを持ちます。デモでは人間が読みやすい形式を選択します。

### 4.3 i18n

すべての `label_i18n` は NAC3 の 10 ロケールをすべてカバーしなければなりません（MUST）：

```
es, en, pt, fr, ja, zh, hi, ar, de, it
```

`NAC.autoRegister.watch()` の `i18n_strict: 'permissive'` を指定すると、ブラウンフィールド移行中に部分的なカバレッジを許可します。本番マニフェストは 10 ロケールをすべて含めるべきです。

---

## 5. パブリック API

### 5.1 命令型

```ts
NAC.click(nac_id: string, opts?: ClickOpts): Promise<{ok: true}>
NAC.click_by_verb(plugin: string|null, verb: string, opts?): Promise<...>
NAC.fill(nac_id: string, value: string|number|boolean): Promise<...>
NAC.select(nac_id: string, value: string): Promise<...>
NAC.tab(plugin: string, tab_key: string): Promise<...>
NAC.tab_by_label(plugin: string|null, label: string): Promise<...>
NAC.go_to_section(nac_id: string): Promise<...>
NAC.drag_drop(source_id, target_id, opts?: {to_index?: number}): Promise<...>
NAC.set_mode(mode: 'modal'|'maximized'|'new_tab'|'new_window'): void
NAC.screenshot(): Promise<string>  // data URL
NAC.bindAction(el, handler, {plugin, action_id}): () => void  // v2.2
```

### 5.1.1 適合ヘルパー (v2.2)

`NAC.bindAction(el, handler, ctx)` は、クリックハンドラーを接続するための仕様準拠の方法です。ハンドラーの実行後（同期・例外・Promise のいずれの場合も）、`nac:action:succeeded`（または `:failed`）を自動的に発行します。アンバインダーを返します。ホストが対応している場合は、生の `addEventListener('click', ...)` の代わりにこちらを使用してください。既存のブラウンフィールドコードは、従来どおり手動でイベントを発行することも引き続き可能です。

### 5.1.3 フィールドエディター (v2.3 プレビュー)

`NAC.edit_field(nac_id)` は、ユーザー（またはその代理エージェント）が Word スタイルのツールを使って任意のテキストフィールドを編集できるモーダルを開きます。

```ts
NAC.edit_field(nac_id: string): Promise<{ok:true}>
```

このモーダルは `plugin_slug='nac_editor'` として登録され、以下の NAC-3 呼び出し可能な verb を持ちます。

| Verb | 効果 |
|------|--------|
| `select_word` | キャレット位置の単語を選択する |
| `select_sentence` | キャレット位置の文を選択する |
| `select_all` | エディター内で Ctrl-A を実行する |
| `replace` | 選択範囲を指定テキストで置換する |
| `delete_selection` | 現在の選択範囲を削除する |
| `ai_correct_syntax` | システムプロンプト「fix grammar + spelling, return only fixed text」とともに現在の値を LLM 仲介者に POST し、レスポンスで値を置換する |
| `save` | ソースフィールドに書き戻し、input + change イベントをディスパッチして閉じる |
| `cancel` | 変更を破棄して閉じる |

Esc でキャンセル終了、Ctrl/Cmd+Enter で保存。オーバーレイの背景をクリックするとキャンセルされます。

仕様のセクション 13 で v2.3 における契約が正式化される予定ですが、v2.2 ランタイムには動作するリファレンス実装が同梱されているため、採用者は今すぐ組み込むことができます。任意のフィールドで以下のように利用できます。

```js
NAC.edit_field('invoice.client_name');
// または仲介者経由:
NAC.click_by_verb('myplugin', 'edit_field', { nac_id: 'invoice.client_name' });
```

### 5.1.2 厳格バリデーションフラグ (v2.2)

`NAC.STRICT_VALIDATION`（boolean、v2.2 のデフォルトは `false`）。`true` に設定すると、以下のいずれかの条件に該当した場合に `NAC.register()` が `code='strict_validation'` と `findings` 配列を持つ `Error` をスローします。

- `manifest_role_unknown` -- エントリーのロールが正規セット外である。
- `tab_id_manifest_role_drift` -- id が `^tab\.` にマッチするが、ロールが `'tab'` でない。
- `manifest_dom_role_mismatch` -- マウントされた DOM 要素の `data-nac-role` がマニフェストエントリーのロールと異なる。

v2.3 ではデフォルトが `true` に変更されます。v3.0 ではこのフラグは削除され、厳格モードのみになります。

すべての非同期メソッドは、以下のいずれかの `code` を持つ `NacError` で reject します。

- `not_found` -- 指定された要素・ロール・verb が DOM に存在しない。
- `invalid` -- 引数の形式が不正である。
- `timeout` -- 副作用はディスパッチされたが、適合確認イベントが 5 秒以内に届かなかった。**タイムアウトは実際の失敗を意味します**。ハンドラーがハングした、ack が接続されていない、ネットワーク競合が発生した可能性があります。別のチャネルで副作用の証拠がない限り、呼び出し元はタイムアウトを失敗として扱わなければなりません。

### 5.2 イントロスペクション

```ts
NAC.describe():    { active: string|null, plugins: PluginSnap[] }
NAC.describe_v2(): { v2_scope_entries: [...], sitemap: ..., data_tables: [...] }
NAC.manifest(plugin_slug: string): Manifest|null
NAC.validate_global(opts?: {probe?: boolean}): Findings[]
```

### 5.3 データテーブル (v2.1)

```ts
NAC.registerDataTable(spec: DataTableSpec): void
NAC.dt_add_row(table_id, values): {ok, row_id}
NAC.dt_remove_row(table_id, row_id): {ok}
NAC.dt_edit_cell(table_id, row_id, column, value): {ok} | {ok:false, error}
NAC.dt_set_cell(table_id, row, col, value): {ok} | {ok:false, error}
NAC.dt_select(table_id, target): {ok}
NAC.dt_commit(table_id): {ok, final_state} | {ok:false, errors:[...]}
NAC.dt_discard(table_id): {ok}
NAC.dt_state(table_id): TableState
NAC.dt_read_aggregate(table_id, agg_key, column): number|null
NAC.registerDataTableComputed(table_id, column, fn): void
```

データテーブルには `subkind` があります。

- `collection` -- オプションのトランザクションコミットを持つ順序付き行。請求書明細、カートアイテム、ログエントリーなどに使用。
- `matrix` -- すべてのセルが値を持つ行×列グリッド。権限マトリクス、スケジュールグリッドなどに使用。
- `matrix-singletree` -- 各行がツリーに折りたたまれるマトリクス（まれなケース）。

---

## 6. イベント

すべてのアクションは確定的な完了イベントを発行します。ランタイムの `NAC.click()` はこのイベントをポーリングし、発火時に resolve します。

| ロール | 成功イベント | 失敗イベント |
|------|---------------|---------------|
| `action` | `nac:action:succeeded` | `nac:action:failed` |
| `field` | `nac:field:changed` | -- |
| `option` | `nac:field:changed` | -- |
| `tab` | `nac:tab:activated` | -- |
| `breadcrumb-item` | `nac:breadcrumb:navigated` | -- |
| `accordion-toggle` | `nac:accordion:expanded` / `:collapsed` | -- |
| `step` | `nac:step:advanced` | -- |
| `pagination-item` | `nac:table:page_changed` | -- |
| `confirm-button` | `nac:confirm:resolved` / `:cancelled` | -- |
| `sort-control` | `nac:table:sort_changed` | -- |
| `filter-control` | `nac:table:filter_changed` | -- |

### 6.1 イベント detail の形式

すべてのイベント detail は、正規の id フィールドと `plugin` を含みます。

```js
nac:action:succeeded {
  detail: { plugin: 'invoice', action_id: 'invoice.save', ... }
}
nac:tab:activated {
  detail: { plugin: 'invoice_edit_modal', tab_id: 'tab.lines', ... }
}
nac:field:changed {
  detail: { plugin: 'invoice', field_id: 'field.client_name',
            value: 'Acme Corp', ... }
}
```

### 6.2 ホストハンドラーからのイベント発行

クリックハンドラーは、同期的な副作用の完了後に対応する成功イベントを発行しなければなりません。

```js
button.addEventListener('click', function (ev) {
  // ... 処理を実行 ...
  document.dispatchEvent(new CustomEvent('nac:action:succeeded', {
    detail: { plugin: 'invoice', action_id: 'invoice.save' }
  }));
});
```

処理が非同期の場合は、resolve 後に発行してください。処理が失敗した場合は、`{detail: {plugin, action_id, error: <message>}}` とともに `nac:action:failed` を発行してください。

v2.2 ランタイムでは、`addEventListener` をラップして自動的にイベントを発行する `NAC.bindAction(el, handler, ctx)` が提供されます。

### 6.3 クリックイベント自体を使わない理由

DOM の `click` イベントはハンドラーの実行前に発火します。NAC3 の契約では、クリックが開始されたタイミングではなく、**副作用が完了した**タイミングを把握する必要があります。そのため、専用のイベントファミリーが設けられています。

---

## 7. 出所（Provenance）

### 7.1 isTrusted

`event.isTrusted` は、ユーザーが起点のクリック（実際のマウス操作、実際のキー押下、スクリーンリーダーによる操作）の場合は `true`、合成クリック（`element.click()`、組み込み MouseEvent の dispatchEvent、自動化ツール）の場合は `false` になります。

NAC3 は、この値を成功イベントの `event.detail.is_trusted` として公開しなければなりません（MUST）。決済や削除などのセキュリティ上重要な操作を行うホストは、`is_trusted === true` を必須条件とし、合成クリックを拒否してもかまいません（MAY）。リファレンスデモ `example-v20-full.php` には、この違いを示すボタンペア（`v20_panel.istrusted_real` と `v20_panel.istrusted_fake`）が含まれています。

### 7.2 HMAC 署名付きマニフェスト

マニフェストには `provenance` ブロックを含めることができます（MAY）：

```js
NAC.set_provenance_secret('your-tenant-secret');
NAC.register({
  plugin_slug: 'invoice',
  ...,
  provenance: {
    signed_at: '2026-05-09T10:00:00Z',
    signed_by: 'tenant-X',
    signature: '<HMAC-SHA256 of manifest body>'
  }
});
```

ランタイムは、マニフェスト本体（署名自体を除く）の安定したシリアライズに対して期待される HMAC を計算し、署名が一致しないマニフェストを拒否します。これは、マルチテナント環境において、あるテナントが別のテナントのマニフェストを偽装することを防ぐために使用されます。

### 7.3 脅威モデル

完全な脅威モデルについては `SECURITY.md` を参照してください。要点は以下のとおりです：

- NAC3 は**ユーザー**を認証しません。それは認証レイヤーの役割です。
- NAC3 は**マニフェスト**を認証します（HMAC）。
- NAC3 は実際のクリックと合成クリックを区別します（isTrusted）。これにより、ホストはセキュリティ上重要な操作に対して後者を拒否できます。
- NAC3 は、ユーザーレベルのアクセス権で動作する悪意のあるエージェントからは保護しません。そのようなエージェントは、ユーザーが行えることをすべて実行できます。

---

## 8. 適合レベル

以下の条件を満たすページは **NAC-1 適合**です：

- エージェントが操作すべきすべてのクリック可能なウィジェットに `data-nac-id` と `data-nac-role` が付与されている。
- `data-nac-role="action"` のすべての要素が、副作用の後に `nac:action:succeeded` を発火する。
- ページが `NAC.register()` を通じて少なくとも1つのプラグインマニフェストを登録している。
- 公開されているすべての id に対して `NAC.click(id)` が機能する。

以下の条件も満たすページは **NAC-2 適合**です：

- マニフェスト内で `tabs[]`、`fields[]`、`actions[]` 配列を明示的に登録している（DOM からの推論ではない）。
- すべてのユーザー向けラベルについて、NAC3 の全 10 ロケールをカバーする `label_i18n` を提供している。
- v2.0 ブラウンフィールドプリミティブ（スコープツリー、エフェメラルキャプチャ、autoRegister.watch）を実装している。
- `NAC.validate_global({probe: false})` を `error` 重大度の指摘ゼロで通過する。

以下の条件も満たすページは **NAC-3 適合**です：

- HMAC 署名付きマニフェストを持つ。
- セキュリティ上重要な操作に対して `isTrusted` を区別する。
- `NAC.validate_global({probe: true})` を指摘ゼロで通過する。

NPM パッケージの CLI（`npx @nac3/runtime validate <url>`）は、ページが到達している最高レベルを報告します。

---

## 9. バージョニング

NAC3 は semver に従います：

- **メジャー**バンプ：公開 API またはワイヤーフォーマットへの破壊的変更。採用者はコードを修正する必要があります。
- **マイナー**バンプ：後方互換性のある新機能の追加。既存のコードはそのまま動作します。
- **パッチ**バンプ：バグ修正、ドキュメントのみの変更。

廃止ポリシー：バージョン `X.Y.0` で `@deprecated` とマークされた機能は、`(X+1).0.0` より前には削除されません。リリースノートにはすべての削除が明示的に記載されます。

NPM パッケージのバージョンはスペックバージョンと対応しています：`@nac3/runtime@2.1.3` は NAC3 v2.1 を3つのパッチリビジョンで実装しています。

---

## 10. バリデーター

### 10.1 ランタイム：`NAC.validate_global()`

ライブ DOM、登録済みマニフェスト、i18n カタログを走査し、指摘事項の配列を返します：

```ts
{
  severity: 'error' | 'warn' | 'info',
  code:     string,                     // e.g. 'tab_role_drift'
  nac_id:   string | null,
  message:  string,
  detail:   Record<string, any>
}
```

指摘コードはパッチリリース間で安定しています。新しいコードはマイナーバンプでのみ追加されます。

### 10.2 CLI：`npx @nac3/runtime validate <target>`

`validate_global` に加え、HTML とマニフェストの整合性に関する静的リントを実行します。終了コード：

- `0` -- 設定されたしきい値以上の重大度の指摘なし。
- `1` -- 指摘あり。
- `2` -- ターゲット自体の読み込みに失敗。

CI での使用例：`npx @nac3/runtime validate ./dist/index.html --severity=error`

---

## 11. NAC3 を取り巻くシステム

NAC3 はコントラクトレイヤーです。NAC 適合ページを音声駆動アプリに変えるには、以下も必要です：

1. **音声認識ソース**（ブラウザの SpeechRecognition、Whisper API など）。
2. **LLM 仲介レイヤー**：ユーザーのテキスト、ページの `NAC.describe()` スナップショット、i18n ヒントを受け取り、構造化されたアクションを出力します：`[{kind: 'click', nac_id: 'X'}, {kind: 'fill', nac_id: 'Y', value: 'Z'}]`。`guides/LLM_WIRING.md` を参照してください。
3. **チャットクライアント**：会話を保持し、アクションをディスパッチします。リファレンス実装は `js/nac-chat-client.js` です。
4. **音声合成シンク**：音声による返答のため（ブラウザの SpeechSynthesis、ElevenLabs など）。

NAC3 が標準化するのは、ステップ 2 の入出力形式（`NAC.describe()` スナップショットとアクション形式）のみです。ステップ 1、3、4 はスペックの対象外であり、自由に組み合わせることができます。

---

## 12. 安定性の保証

このスペックが約束すること：

1. セクション 1 の正規ロールのセットは縮小しません。新しいロールはマイナーバージョンで追加される場合があります（MAY）。
2. セクション 6 のイベントファミリーは名称変更されません。新しいイベントはマイナーバージョンで追加される場合があります（MAY）。
3. `NAC.click`、`NAC.fill` などの動詞は、マイナーバージョンで形式が変わりません。新しいオプションの `opts` フィールドが追加される場合があります（MAY）。
4. `validate_global` の指摘コードは、マイナーバージョン間で異なる条件に再利用されません。

このスペックが約束しないこと：

1. エラーメッセージの正確な文言（これらは i18n カタログ文字列であり、ローカライズは変わる場合があります）。
2. 要素を検索するための DOM 戦略（現在は `querySelector`；後により高速なインデックスに移行する可能性があります）。
3. 内部マニフェストキャッシュのレイアウト。マニフェストはホスト側からは書き込み専用、エージェント側からは読み取り専用として扱ってください。

---

## 13. 未解決の問題（別途追跡中）

- `data-nac-role="navigation"` はタブとして解決されるべきか？現時点ではノー（v2.1）。v22 ロードマップではより厳格な拒否を主張しています。
- `NAC.click()` は相対 id（例：`'./save'` でアクティブなプラグイン配下の「save」を意味する）を受け入れるべきか？v2.1 では対象外；v2.3 で検討される可能性があります。
- マニフェストはプラグイン間での継承・拡張（1つのベースマニフェストをテナントが拡張する）をサポートすべきか？v3.0 候補として追跡中。

---

## 13.5 ガバナンス

NAC3 は現在 Yujin によって管理されています。スペックは Apache 2.0 の下で公開されており、リファレンスランタイムは MIT の下で公開されています。Yujin は、採用状況がニュートラルなガバナンスを正当化する場合、NAC3 をニュートラルな財団（W3C コミュニティグループ、Linux Foundation、または同等の業界団体）に移管することを約束します。それまでの間、スペックの変更は `CONTRIBUTING.md` に記載された RFC プロセスに従い、公開 API またはワイヤーフォーマットに影響する変更については少なくとも 14 日間のパブリックコメント期間が設けられます。

採用者へ：Apache 2.0 と MIT のライセンスの組み合わせにより、スペックとランタイムは Yujin の企業状況がいかなる変化を遂げても存続することが保証されます。どちらもフォーク、実行、配布が可能であり、現在も将来も同様です。このドキュメントはその約束を明示的に記録するものであり、存続への道筋を暗黙のものではなく明確なものとします。

---

## 14. リファレンス実装

正規の実装は、NPM パッケージ `@nac3/runtime` として配布されるリファレンスランタイムです。このランタイムは v2.1 に対して機能完全であり、以下を含みます：

- `js/nac.js` -- v1.9 ベース + セクション 5 の公開 API。
- `js/nac-v2-extensions.js` -- v2.0 ブラウンフィールドプリミティブ（スコープツリー、エフェメラルキャプチャ、autoRegister、HMAC、isTrusted）。
- `js/nac-chat-client.js` -- 音声、LLM、ディスパッチャーを接続するリファレンスチャットクライアント。

他の実装も歓迎します（ネイティブ自動化ランナー向けの Python、組み込みエージェント向けの Rust など）。権威はスペックにあり、JS コードにはありません。

---

*このドキュメントは NAC3 v2.1 の正規仕様書です。このファイルへの編集はスペック変更を構成するものであり、RFC が必要です。`CONTRIBUTING.md` を参照してください。*

---

*This is a machine translation of the canonical English
version at `/nac-spec/SPEC.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
