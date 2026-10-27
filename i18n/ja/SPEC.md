---
translation_source_hash: 13f2725d22ba29c84ddfdf58bac800d547f968b0f393d5cd9285cf1e2d4d0a0a
translation_quality: machine_v1
translation_date: 2026-10-27
translation_engine: anthropic/claude-opus-5 (Yujin Forge)
translation_normative: false
translation_status: complete
translation_lang: ja
translation_source: SPEC.md
translation_source_version: 2.5.1
translation_source_date: 2026-10-27
translation_sections: 83
translation_sections_canonical: 83
translation_units: 282
translation_units_canonical: 282
translation_canonical_url: /nac-spec/SPEC.html
---

<!-- translation-banner: produced by scripts/build-translation-banners.mjs -->

> **機械翻訳であり、規範ではありません。** 2026-10-27 時点の英語版 (NAC3 v2.5.1) を翻訳したもので、現在の原文の 83 / 83 節を収録しています。規範となる本文は英語版です。本翻訳と英語版が食い違う場合は英語版が優先します。
>
> *Non-normative machine translation. The normative text of NAC3 is the English one.*
>
> [規範となる英語版を読む](/nac-spec/SPEC.html)

<!-- /translation-banner -->

# NAC3 -- Native Agent Contract

**バージョン:** 2.5.1 (安定版 -- v2.5 の全面: narrate、context+tree、expect+diff)
**状態:** 安定リリース。npm の dist-tag `latest` はここを指します。それが何を保証し、プレリリースが何を保証しないかは 9.1 節に書いてあります。この文書は自身のバージョンをちょうど一箇所、すぐ上の行だけに書きます。公開済みの RFC とその第 2 層 + 第 3 層の証跡は `README.md` と `runtime/CHANGELOG.md` に一覧があります。
**ライセンス:** Apache-2.0
**編集者:** Yujin (yujin.app)

---

## 0. 目的

NAC3 は、ウェブ UI と、それを操作するエージェントとのあいだの契約です。
エージェントには音声実行系、LLM 仲介系、RPA ボット、支援技術のツール、
エンドツーエンドのテスト実行系が含まれます。この契約が定めるのは次の
とおりです。

1. **要素の名前の付け方** -- エージェントが「保存ボタンをクリックして」
   と言えて、それが DOM の単一ノードに解決できるように。
2. **動詞の適用のしかた** -- エージェントがアプリごとの接着コードなしに
   `NAC.click(id)`、`NAC.fill(id, value)`、`NAC.tab(plugin, key)` などを
   呼べるように。
3. **完了の知らせ方** -- 役割ごとに決定的なイベント群によって、
   エージェントが手順の終わりを知れるように。
4. **来歴の保ち方** -- 後続のシステムが、利用者の本当のクリックと
   合成されたクリックを区別できるように。

NAC3 は、あなたがすでに描画に使っているフレームワークの上に薄い層を
足すだけです。ARIA、React、Vue、あなたのデザインシステムを置き換え
ません。

---

## 1. 役割

エージェントに関わるすべての DOM 要素は `data-nac-role` を持ちます。
正規の役割は次のとおりです。

| 役割 | 意味 | 例 |
|------|---------|---------|
| `plugin` | 自己完結した UI モジュール (ページ、パネル、ウィジェットの集まり)。 | `<article data-nac-plugin="invoice">` |
| `section` | プラグイン内の目印 (ヘッダー、本体、フッター、サイドバー)。 | `<section data-nac-role="section">` |
| `region` | セクション内の名前を付けられる領域 (カード群、結果一覧)。 | `<div data-nac-role="region">` |
| `action` | 動詞を起こすクリック可能なウィジェット (ボタン、ボタン代わりのリンク)。 | `<button data-nac-role="action" data-nac-action="save">` |
| `field` | 利用者が入力または切り替える入力欄 (テキスト、数値、チェックボックス、ラジオ、日付、ファイル)。 | `<input data-nac-role="field">` |
| `option` | フィールド内の選択できる選択肢 (コンボボックス / select / ラジオ群の子)。 | `<li data-nac-role="option">` |
| `tab` | 切り替え式のパネル選択子。**`data-nac-id` が `^tab\.` に一致する場合は必須** | `<button data-nac-role="tab" data-nac-id="tab.lines">` |
| `breadcrumb-item` | パン屑の一段。 | `<a data-nac-role="breadcrumb-item">` |
| `accordion-toggle` | 開閉の操作子。 | `<button data-nac-role="accordion-toggle">` |
| `step` | ウィザードの手順表示。 | `<li data-nac-role="step">` |
| `pagination-item` | ページ送り一覧内のページ移動の操作子。 | `<button data-nac-role="pagination-item">` |
| `confirm-button` | 確認ダイアログ内の確定 / 取消ボタン。 | `<button data-nac-role="confirm-button">` |
| `sort-control` | 並べ替えを行う列見出し。 | `<th data-nac-role="sort-control">` |
| `filter-control` | 列の絞り込みの起動子。 | `<button data-nac-role="filter-control">` |
| `data-table` | データ表のホスト (2.1 以降)。 | `<table data-nac-role="data-table">` |
| `navigation` | 目印となるナビゲーション領域。**タブではありません。** | `<nav data-nac-role="navigation">` |
| `confirm-dialog` | 確認要求のモーダル。 | `<div data-nac-role="confirm-dialog">` |
| `draggable` | 利用者がつかんで動かせる要素 (1.6.2 以降)。 | `<li data-nac-role="draggable">` |
| `drop-target` | `draggable` を落とせる場所 (1.6.2 以降)。 | `<ul data-nac-role="drop-target">` |
| `button` | **許容はするが推奨しません。** クリックできるだけでよく、動作の契約を持たない旧来のボタン。ランタイムは `action` として扱います。明示した `data-nac-action` を伴う `action` を選んでください。 | `<button data-nac-role="button">` |

この一覧にない役割は将来のために予約されています。NAC-strict な
ランタイムは、登録の時点で未知の役割を拒否すべきです (v2.2)。
NAC-permissive なランタイムは、後方互換のために未知の役割を `action` と
して扱ってもよいです (v1.9 と v2.0 の既定の挙動)。

この表が規範の一覧であり、データとしても公開されています。
`api/latest/contract.json` にある機械可読のカタログは、参照ランタイムが
受け入れるすべての役割を載せ、それぞれに `declared_in_spec_table` の印を
付けてあるので、散文を読まずに二つの一覧を比べられます。v2.5 の時点で
両者は一致しています。将来のずれは、文書と実装の見解の相違の中に隠れる
のではなく、その印の中に見えるようになります。

---

## 2. 名前

エージェントが解決できるすべての要素は `data-nac-id` を持ちます。
その id は次のとおりです。

- **点で区切られた経路** (たとえば `deals.list.row.42.actions.delete`)。
  点は意味の階層を分けます。ランタイムは点を解釈しませんが、人間と
  LLM は解釈します。
- **`data-nac-plugin` の範囲内で全体として一意。** 異なる二つの
  プラグインが同じ id を共有してもよく、ランタイムは
  `(plugin, id)` の組で解決します。
- **再描画をまたいで安定。** 描画ごとに新しい id を作るフレームワーク
  (乱数ハッシュ、インスタンス連番) は契約を壊します。
- **UI の作り直しをまたいで安定。** ボタンがツールバーからドロップ
  ダウンへ移っても、その id は同じままでなければなりません。

予約された id の接頭辞 (2.1 以降):

| 接頭辞 | 予約されている用途 |
|--------|--------------|
| `tab.` | タブのボタン。役割は `tab` でなければなりません。 |
| `modal.` | モーダルの範囲の要素。役割は末端のウィジェットの役割です。 |
| `field.` | フォーム項目の略記。役割は `field` または `option` でなければなりません。 |
| `confirm.` | 確認ダイアログ。 |

---

## 3. 動詞

`data-nac-role="action"` の要素は、何をするのかを示す
`data-nac-action="<verb>"` を持ってもよいです。動詞は、ホストと
エージェントのあいだで取り決めた自由な snake-case の識別子です。
よく使う動詞:

`save`、`cancel`、`submit`、`delete`、`edit`、`view`、`create`、
`approve`、`reject`、`send`、`download`、`upload`、`refresh`、
`expand`、`collapse`、`open`、`close`、`add_row`、`remove_row`。

`NAC.click_by_verb(plugin, verb)` は、動詞をそのプラグイン配下の
一意な action に解決してクリックします。一つのプラグインの中で
複数の action が同じ動詞を共有するのはマニフェストの誤りです
(lint: `duplicate_verb`)。

---

## 4. マニフェスト

すべてのプラグインは、次の方法でマニフェストを登録してもよいです。

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

マニフェストは、エージェントに向けた真実の出どころです。「利用者は
'guardar' と言った」と判断した LLM 仲介系は、プラグインの
マニフェストを引き、動詞 `save` を見つけ、
`NAC.click_by_verb('invoice', 'save')` を出します。

### 4.1 必須の項目

- `plugin_slug` -- ホスト要素の `data-nac-plugin` と一致します。
- `nac_version` -- このマニフェストが準拠を主張する NAC3 の
  バージョン。ランタイムは、自分より高いバージョンを主張する
  マニフェストを拒否します。

### 4.2 任意の項目

- `elements[]` -- 名前の付いたウィジェットのカタログ。各項目は `id` と
  `role` を持たなければなりません。
- `tabs[]` -- タブ用の、最上位の別配列。`role:'tab'` を持つ
  `elements[]` の項目と同等です。どちらの書き方も妥当です。
- `fields[]`、`actions[]`、`kpis[]`、`data_tables[]` -- 型ごとの
  部分集合。役割で絞った `elements[]` と同じ意味です。デモは、人間に
  いちばん読みやすい書き方を選んでいます。

### 4.3 i18n

すべての `label_i18n` は NAC3 の 10 ロケールすべてを覆わなければ
なりません。

```
es, en, pt, fr, ja, zh, hi, ar, de, it
```

`NAC.autoRegister.watch()` に渡す `i18n_strict: 'permissive'` は、
ブラウンフィールドの移行中に部分的な網羅を許します。本番の
マニフェストは 10 ロケールを備えるべきです。

#### 4.3.1 十ロケールの要求が向いている先

上の要求が向いているのは、**採用者のマニフェスト**です。つまり、
エージェントが要素を利用者の言語で呼ぶために読む `label_i18n` の
対応表です。この文書の言語に向けたものでは**ありません**。NAC3 の
どこにも、実装が自分の文書を十の言語で出す義務はありません。

#### 4.3.2 この仕様の規範となる言語

NAC3 の規範となる本文は**英語**です。仕様リポジトリの直下にある
`SPEC.md` で、`https://yujin.app/nac-spec/SPEC.html` に描画されます。

仕様は `i18n/<locale>/SPEC.md` の下に機械翻訳としても公開されます。
それらの翻訳は**規範ではありません**。どれも部分的で、どれも自分の
掲示が宣言する原文の版に凍結されています。掲示は必須であり、掲示を
持たない公開済みの翻訳は、翻訳の欠陥ではなく公開の欠陥です。翻訳と
英語の本文が食い違う場合は英語の本文が優先し、適合の主張は英語の
本文に対する主張です。

---

## 5. 公開 API

### 5.1 命令形

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

### 5.1.1 適合の補助関数 (v2.2)

`NAC.bindAction(el, handler, ctx)` は、クリックの処理関数をつなぐ、
仕様に適合したやり方です。処理関数が走ったあと (同期、例外、Promise の
いずれでも)、`nac:action:succeeded` (または `:failed`) を自動で出します。
解除用の関数を返します。ホストが対応しているときは、素の
`addEventListener('click', ...)` ではなくこれを使ってください。
ブラウンフィールドのコードは、これまでどおり手動でイベントを出し続け
られます。

### 5.1.3 フィールド編集器 (v2.3)

`NAC.edit_field(nac_id)` は、人 (または本人の代わりのエージェント) が
任意のテキスト欄をワープロ風の道具で編集できるモーダルを開きます。

```ts
NAC.edit_field(nac_id: string): Promise<{ok:true}>
```

このモーダルは `plugin_slug='nac_editor'` として、NAC3 から呼べる次の
動詞を伴って登録されます。

| 動詞 | 効果 |
|------|--------|
| `select_word` | カーソル位置の単語を選ぶ |
| `select_sentence` | カーソル位置の文を選ぶ |
| `select_all` | 編集器の中で ctrl-A |
| `replace` | 選択範囲を与えた文字列で置き換える |
| `delete_selection` | 今の選択範囲を取り除く |
| `ai_correct_syntax` | 今の値を、システムプロンプト "fix grammar + spelling, return only fixed text" とともに LLM 仲介系へ POST し、値を応答で置き換える |
| `save` | 元の欄へ書き戻し、input と change のイベントを送り、閉じる |
| `cancel` | 破棄して閉じる |

Esc で閉じます (取消)。Ctrl/Cmd+Enter で保存します。覆いの背景を
クリックすると取消です。

仕様の 13 節が v2.3 でこの契約を正式に定めます。v2.2 のランタイムは、
採用者が今日つなげられるよう、動く参照実装を出しています。どの
フィールドでも次の方法で使えます。

```js
NAC.edit_field('invoice.client_name');
// or by intermediary:
NAC.click_by_verb('myplugin', 'edit_field', { nac_id: 'invoice.client_name' });
```

### 5.1.4 動作のペイロード + invoke (v2.3)

NAC v2.2 の動作はクリックして終わりです。エージェントが
`NAC.click(id)` か `NAC.click_by_verb(plugin, verb)` を起こし、ホストは
自分の仕事をします。これは動詞と状態の動作 (`save`、`cancel`、
`submit`、`delete`) では成り立ちますが、動作がエージェントからの
**データ**を必要とするときに崩れます -- `utter(text)`、
`search(query)`、`send_message(body)`、`upload(file)`、
`schedule(date)`、`translate(text, target_lang)`。ホストには、合成
クリック経由でエージェントのペイロードを受け取る手段がありません。

v2.3 はこの隙間を埋めます。契約は足し算です。クリック型の動詞は
これまでどおり動き続けます。

```ts
NAC.invoke(action_id: string, payload: object, opts?: { timeout?: number })
  : Promise<{ok: true, request_id: string, ack: object|null}>

NAC.utter(action_id: string,
          opts: { text: string, lang?: string, voice?: string, metadata?: object })
  : Promise<{ok: true, request_id: string, ack: object|null}>
```

`NAC.invoke` は、ホスト要素の上に `nac:action:requested` の
`CustomEvent` を送ります (document まで浮上します)。中身は次のとおり
です。

```ts
detail: {
  action_id:  string,    // canonical nac_id of the host element
  verb:       string,    // payload.verb || el's data-nac-action
  payload:    object,    // arbitrary, action-specific
  plugin:     string|null,
  request_id: string,    // correlation token assigned by the runtime
  ts:         number,    // Date.now()
}
```

ホストは `nac:action:requested` を聞き、ペイロードを処理し、同じ
`request_id` を detail に入れて `nac:action:succeeded` (または
`nac:action:failed`) を出します。ランタイムは `request_id` で対応づけ、
エージェントの Promise を解決します。

既定の待ち時間は **30 秒**です (クリックは 5 s)。`opts.timeout` で
変えられます。期限切れのとき Promise は
`NacError('timeout', ...)` で拒否されます。クリックと同じく、期限切れは
本当の失敗を意味します。別の経路で副作用の証拠を持っていない限り、
呼び出し側はそう扱わなければなりません。

`NAC.utter(id, opts)` は、ペイロードを運ぶ動詞のうち最もよく使うものの
ための手軽な近道です。次と同等です。

```js
NAC.invoke(id, { verb: 'utter', text: opts.text, lang: opts.lang });
```

#### マニフェストでの宣言

ペイロードを運ぶ動作は、追跡と道具立てのために、そのペイロードの
スキーマをマニフェストの項目で宣言します。

```js
NAC.register({
  plugin_slug: 'atlas_pro_ad',
  version:     '2.1.0',
  nac_version: '2.3',
  elements: [
    { id: 'atlas_pro_ad.mic', role: 'action',
      actions: [
        { verb: 'listen' },
        { verb: 'utter',
          payload_schema: {
            text: { type: 'string', required: true, max: 4000 },
            lang: { type: 'string',
                    enum: ['en','es','pt','fr','it','de','ja','zh','hi','ar'] }
          },
          label_i18n: { es:'Decir', en:'Utter', /* ... 10 locales */ } }
      ],
      label_i18n: { /* ... */ } }
  ]
});
```

`payload_schema` は **v2.5 の時点では参考情報**であり、参照ランタイムは
これをまったく読みません。この項目はマニフェストで受け入れられ、
`NAC.manifest()` に載って運ばれ、何にも照らして検証されません。
`NAC.STRICT_VALIDATION` -- その既定値は確かに 2.3.0 で `true` に
変わりました -- が覆うのはマニフェストと DOM の役割に関する検出結果
だけで、ペイロードを覆ったことはありません。したがってエージェントは、
スキーマが宣言されているからペイロードが検査されたと考えてはなりません。
今日ただ一つ行われる検証は、エージェントが送る前に自分で行うものです。

スキーマは意図的に単純です (JSON-Schema の形をした部分集合)。ランタイム
が完全な JSON-Schema 検証器を同梱せずに検証できるようにするためで、
強制を入れる日のための設計意図もそのままです。

この節の前の版は、2.4 のリリースに向けて、スキーマの文法を正式に定め、
強制を既定にすると約束していました。**それは 2.4 で起こらず、2.5 を
通じても起きていません。**その一文は日付を付け替えるのではなく削除
します。バージョン番号を貼った約束が、そのバージョンを過ぎても残って
いると、エージェントには期待してよい機能のように読めます。文法を正式に
定めて強制をつなぐ作業は、13 節で未解決の問いとして追跡され、そこでは
未解決かつ日付なしと記されています。

#### 無効状態の意味 (alpha.2 から来た v2.3 の緊急修正)

`NAC.invoke` は、対象の要素に `disabled` または
`aria-disabled='true'` が付いていても拒否しません。HTML の `disabled`
属性は UI のクリック止めです。`invoke` はペイロードを運ぶ論理的な要求で
あり、合成クリックではありません。UI の状態に応じて invoke を断る必要の
あるホストは、`nac:action:requested` の受け手の中でそれを行い、意味の
ある誤りコードを付けて `nac:action:failed` を出さなければなりません。

対して `NAC.click` は、無効な要素では今も拒否します (クリックの意味は
保たれます)。テストの網羅: `runtime/test/v23-invoke.mjs` T7/T8/T9。

#### 適合: invoke に対応するホストがしなければならないこと

1. マニフェストの項目で `actions[].payload_schema` を宣言する。
2. `nac:action:requested` を聞く (または `detail.action_id` +
   `detail.verb` で絞る汎用の受け手を使う)。
3. 処理のあとに `nac:action:succeeded` を -- `detail.request_id` を
   そのまま返して -- 出す。失敗した場合は `nac:action:failed` を
   (`detail.error` にコードを入れて) 出す。
4. 受け取っていない `request_id` を持つ `:succeeded` のイベントを
   決して出さない (同時に走る呼び出しの混線を防ぎます)。

invoke に対応しないホストは、`NAC.click()` と
`NAC.click_by_verb()` のもとで変わらず動き続けます。
`actions[].payload_schema` の項目を持たないホストに対して
`NAC.invoke()` を呼ぶエージェントは、それでも `request_id` を受け取り
ますが、ランタイムは配達を保証できません。待ち時間は 30 s で切れます。

#### これが大事な理由

エージェントに向いた面の全体が、「ボタンの一覧」ではなく「ボタンの
一覧 + 構造化された入力」になります。音声の広告が NAC.invoke で
呼べるようになります。検索欄が NAC.invoke で呼べるようになります。
ファイルの送信が NAC.invoke で呼べるようになります。同じ手順、同じ
来歴、同じ受領の意味です。

最初の参照採用者は **Atlas Pro** です。その要素
`atlas_pro_ad.mic` は、動詞 `listen` (クリックのみ、既存) と `utter`
(ペイロードあり) の両方を宣言しています。どちらの場合も同じ
`/parse` + `/tts` の会話の輪が動かします。音声認識を持つエージェントは
`listen` を呼び、自前の言語モデルを持つエージェントは `utter` を
呼びます。

#### これから来る様式 (想定済み、仕様の変更は不要)

`invoke` は意図的に様式を問いません。将来の入力の系統が、契約を壊さずに
差し込めるようにするためです。

| 様式 | 動詞 (素案)           | ペイロード (素案)                                |
|----------|-----------------------|--------------------------------------------------|
| テキスト | `utter`               | `{text, lang?}`                                  |
| 検索     | `search`              | `{query, scope?, limit?}`                        |
| ファイル | `upload`              | `{filename, mime, data_url \| stream_id}`        |
| 画像     | `analyze_image`       | `{image_url \| data_url, prompt?}`               |
| 動画     | `analyze_stream`      | `{stream_url, frame_window_ms?, return?}`        |
| 予定     | `schedule`            | `{datetime, duration_min, attendees?}`           |
| コード   | `apply_diff`          | `{file_path, unified_diff}`                      |
| 音声     | `transcribe`          | `{audio_url \| data_url, lang?}`                 |

どの様式も、同じ `nac:action:requested` -> `nac:action:succeeded` /
`:failed` のイベント手順、同じ `request_id` による対応づけ、同じ
待ち時間の意味に従います。ランタイムは小さいままで、動詞の語彙は
ホストとエージェントのあいだの取り決めで育ちます。手軽な近道
(`NAC.utter`、`NAC.search`、`NAC.watch` など) は、どれも `invoke` の
薄い包みなので、仕様を書き直さずにあとから足せます。

### 5.1.5 shadow DOM の解決 -- 開いた根 (v2.3)

ランタイムは、開いた shadow の根を再帰的にたどって `data-nac-id` の
参照を解決します。ページは `attachShadow({mode:'open'})` で Web
Components を取り付け、shadow の木の中の要素に `data-nac-*` 属性を
置けます。そして NAC3 のどの呼び出し側 (`NAC.click`、`NAC.fill`、
`NAC.invoke` など) も、対象を透過的に解決します。

#### 解決の手順

セレクタ `S` (たいていは `[data-nac-id="..."]`) を、根 `R`
(たいていは `document`) に対して解くとき:

1. `R.querySelector(S)` -> null でなければ、すぐに返す。
2. `R` のすべての子孫 `el` について:
   - `el.shadowRoot` が null でなければ (つまり開いた shadow の根)、
     `R := el.shadowRoot` として深さ +1 で再帰する。
   - そうでなく、`el.nac3` が `query` メソッドを備えたオブジェクト
     なら、委譲する (5.1.6 節を参照)。
3. 再帰は**深さ 10 段で打ち止め**です。10 より深い対象には届かず、
   呼び出し側は `code='not_found'` を受け取ります。この上限は、病的な
   探索を防ぐためにあります。実際には、本番のコードが 3-4 段より深く
   shadow を入れ子にすることはありません。
4. 探索は DOM の順の幅優先です。入れ子の shadow より先に兄弟を見ます。
   最初に一致したものが勝ちます。

#### イベントの伝播

shadow の根の内側にいるホストが出すイベントは、document の階層の
受け手に届くよう `composed: true` を設定しなければなりません。NAC3 の
ランタイムは、自分の出すイベントをすべてすでに `composed:true` で
出します。`nac:*` のイベントを手で出すホストのコードにも同じ責任が
あります。`composed:true` がないとイベントは shadow の境目で止まり、
ランタイムの対応づけの仕組みは決してそれを見ません。

#### 部品を書く人の責任

部品を書く人がする必要があるのは次のことです。

1. shadow の根の内側で操作できる要素に `data-nac-id`、
   `data-nac-role`、`data-nac-action` を置く。
2. NAC3 の契約を知らせるためにホストが出す独自イベントには
   `composed:true` を設定する (`nac:action:succeeded`、
   `nac:field:changed` など)。
3. shadow の中に閉じておきたい要素には `<slot>` を使わない -- slot に
   差し込まれた節点は light DOM に住み、そこで解決されます。

開いた shadow の根には、マニフェストの手がかりもランタイム側の有効化も
要りません。解決は自動です。

#### 参照実装

参照ランタイムは、探索を行う二つの内部補助、
`_deepQuery(selector, root)` と `_deepQueryAll(selector, root)` を
備えています。公開の補助 `NAC.click`、`NAC.fill`、`NAC.invoke`、
`NAC.describe` などは、すべて深い方の変種を通ります。

#### デモとテスト

- `example-v23-shadow-open.php` -- 1、2、3 段に入れ子にした開いた
  shadow のデモ。
- `runtime/test/v23-shadow.mjs` T1-T3、T10 -- 深さの上限も含む
  単体の網羅。

### 5.1.6 shadow DOM の解決 -- 閉じた根、自発的な開示 (v2.3)

閉じた shadow の根 (`attachShadow({mode:'closed'})`) は、部品を書いた
人のコードの外からは不透明です。これはブラウザの安全の境目であり、
NAC3 の決めごとではありません。部品を書いた人が下の契約によって
自発的に問い合わせ可能な面を開示しない限り、NAC3 は中に届きません。

#### `el.nac3` のインターフェース契約

カスタム要素は、`nac3` という名前のゲッターを通して、自分のホストに
インターフェースのオブジェクトを出してもよいです。

```ts
interface NAC3HostInterface {
  query(selector: string): Element | null;        // MANDATORY
  queryAll(selector: string): Element[];          // RECOMMENDED
  describe?(): Array<{                            // OPTIONAL
    id:    string;
    role:  string;
    action?: string;
    label?: string;
  }>;
}
```

部品は、そのゲッターを実装することで参加します。参加しない部品は NAC3
の呼び出し側から手が届かないままです (ブラウザの意図どおり、内部は
私的なままです)。

#### 解決の意味

`_deepQuery(selector)` のあいだ、`el.shadowRoot === null` である
訪れた各要素 `el` について:

1. `typeof el.nac3 === 'object'` であり `el.nac3.query` が関数なら、
   ランタイムは `el.nac3.query(selector)` を呼びます。
   - 返り値が Element -> 解決。
   - 返り値が `null` -> この shadow では一致なし。
   - 返り値がそれ以外 -> `nac:shadow_protocol_violation` を出して
     (ホストごとに一度) 飛ばす。
   - 例外を投げる -> `nac:shadow_blocked` を出して (理由
     `'exposure_threw'`、ホストごとに一度) 飛ばす。
2. そうでなく、`el.hasAttribute('data-nac-shadow') === true` で属性の
   値が `'closed'` であり、かつ `nac3` のインターフェースが無い場合、
   ランタイムは `nac:shadow_blocked` を出します (理由
   `'not_exposed'`、ホストごとに一度)。これは「私は意図して閉じた
   部品です」という診断の合図への、書いた人の参加です。
3. それ以外: その要素は、shadow の根を持たない普通の light DOM の
   要素として扱われます。

#### 誤りイベントの detail の形

`nac:shadow_blocked` の detail:

```ts
{
  host:   Element,     // the closed-shadow host
  reason: 'exposure_threw' | 'not_exposed',
  ts:     number       // Date.now()
}
```

`nac:shadow_protocol_violation` の detail:

```ts
{
  host:           Element,
  message:        string,            // diagnostic message
  value_snapshot: string,            // truncated value preview
  ts:             number
}
```

どちらのイベントも浮上し (`bubbles: true`)、shadow の境目を越えます
(`composed: true`)。重複の除去はホストごとで、ランタイムが持つ WeakSet
によります。同じホストが各イベントを出すのは**ページの読み込みごとに
多くて一度**です。

#### なぜ自発的なのか

閉じた shadow の不透明さはブラウザが強制します。NAC3 が自発的でない
仕組みを定めたとしても、ブラウザがそれを阻みます。自発的な開示は、
エージェントから見た公開の面をどう見せるかの全権を、部品を書いた人に
残します。

代償は部品ごとの参加です。見返りは、NAC3 に適合したエージェントが、
閉じた shadow の部品を含むデザインシステム (Salesforce Lightning、
GitHub Primer の一部の部品、安全に関わるウィジェット) に対して、部品
ごとの変換コードなしに働くことです。

#### デモとテスト

- `example-v23-shadow-closed.php` -- 肯定の例
  (`<todo-card-closed-exposed>`) と否定の例
  (`<todo-card-closed-blind>`) を並べ、判定の枠と生のイベント記録を
  添えたもの。
- `runtime/test/v23-shadow.mjs` T4-T9 -- 誤りイベントのすべての系統と
  重複除去の意味を覆う単体の網羅。
- `guides/SHADOW_DOM_CLOSED.md` -- 書く人のための手引き。

### 5.1.7 権限を意識した能力 (v2.3)

NAC3 v2.3 は、動作ごとに必要な能力をマニフェストで宣言できるようにし、
それで `NAC.click` と `NAC.invoke` を送出の前に止めます。エージェントは
サーバー側で失敗する往復ではなく、速い拒否
(`code='capability_required'`) を受け取ります。

#### マニフェストでの宣言

能力の要求は、要素の階層か動詞の階層に付きます。両方ある場合は動詞の
階層が勝ちます。

```js
NAC.register({
  plugin_slug: 'fin',
  version:     '1.0.0',
  nac_version: '2.3',
  elements: [
    // Element-level (covers all verbs on this id).
    { id: 'fin.invoice.delete', role: 'action',
      requires_capability: 'finance.delete_invoice',
      actions: [{ verb: 'delete' }] },

    // Verb-level (more granular).
    { id: 'fin.invoice.edit', role: 'action',
      actions: [
        { verb: 'edit',
          requires_capability: 'finance.edit_invoice' },
        { verb: 'view',
          /* no capability -> always allowed */ }
      ] },

    // Array value: OR semantics.
    // ("at least one of these capabilities matches")
    { id: 'fin.invoice.approve', role: 'action',
      requires_capability: ['finance.approve',
                            'finance.admin'],
      actions: [{ verb: 'approve' }] }
  ]
});
```

AND の意味 (「利用者はこれらの能力をすべて持つ必要がある」) にしたい
ときは、止めのかかった動作を別々に宣言するか、
`nac:action:requested` の受け手の中でホスト側で組み立ててください。

#### 公開 API

```ts
NAC.setCapabilities(caps: string | string[] | null): void
NAC.grantCapability(cap: string): void
NAC.revokeCapability(cap: string): void
NAC.userCapabilities(): string[]
```

`setCapabilities` は集合を丸ごと置き換えます (ログインやセッションの
更新で使います)。`grantCapability` / `revokeCapability` は少しずつ
変えます。`userCapabilities` は今の状態の写しの配列を返します。
`setCapabilities(null)` は集合を空にします。

ホストは、利用者の役割が変わるたびにこれらを呼びます。集合は
ランタイムの中に住み、マニフェストの読み直しは要りません。

#### 止めの意味

送出の前に、`NAC.click(id)` と `NAC.invoke(id, payload)` は対応する
マニフェストの項目 (要素 + 動詞) を引き、`requires_capability` を読み、
`_hasCapability` を呼びます。

- 要求の宣言なし -> 通す。
- 要求が宣言され、今の集合がそれを満たす -> 通す。
- 要求が宣言され、今の集合がそれを満たさない ->
  `NacError('capability_required', ...)` で拒否し、かつ
  `detail.reason='capability_required'` を付けて
  `nac:command:rejected` を出す。

この止めは、`click` では `not_found` / `disabled` / `hidden` の検査の
あとに走ります。いちばん具体的な失敗が表に出るようにするためです。
`invoke` では、要求のイベントが出る前に止めが走ります (ホストは
権限のない試みを決して見ません)。

#### これが大事な理由

止めがなければ、`NAC.click('finance.delete')` を呼ぶエージェントは、
成功するか (権限の止めがまったくない -> 安全の穴)、数秒後にサーバー側
で 403 とともに失敗するかのどちらかです。止めがあれば、エージェントは
能力が足りないことを同期的に知り、ふさわしく振る舞えます (別の流れを
求める、権限の引き上げを頼む、制約を利用者に見せる)。

これはサーバー側の権限確認を補うもので、置き換えるものでは
ありません。ホストは権限をサーバーで強制し続けなければなりません。
クライアント側の止めは使い勝手の改善と意図の階層の合図であり、安全の
境目ではありません。

#### デモとテスト

- `runtime/test/v23-capabilities.mjs` -- 集合の設定と取得、付与と
  取り消し、クリックの止め、invoke の止め、動詞の階層と要素の階層の
  解決、OR の意味、null での空化、不正な入力の拒否、止めのない動作の
  回帰を覆う 17 の確認。

### 5.1.2 厳格な検証の切り替え (v2.2、既定値は v2.3 で反転)

`NAC.STRICT_VALIDATION` (真偽値)。`true` のとき、`NAC.register()` は
次のいずれかで `code='strict_validation'` と `findings` の配列を伴う
`Error` を投げます。

- `manifest_role_unknown` -- 項目の役割が正規の集合の外にある。
- `tab_id_manifest_role_drift` -- id は `^tab\.` に一致するが、役割が
  `'tab'` でない。
- `manifest_dom_role_mismatch` -- DOM に取り付いた要素の
  `data-nac-role` が、マニフェストの項目の役割と違う。

**既定値:**

- **v2.2.x:** `false` (警告だけ)。採用者には移行の猶予が必要でした。
- **v2.3.x:** **`true`** (投げる)。移行の猶予は v2.2 の系統で閉じ
  ました。ずれを多く抱えたマニフェストを持つ採用者は、どの
  `register()` の呼び出しよりも前に
  `NAC.STRICT_VALIDATION = false` を置いて抜けます。
- **v3.0:** この切り替えは消えます (厳格が唯一の様式)。

ずれの検出結果を片づける手順は
`guides/MIGRATION_v2.2_to_v2.3.md` を見てください。

すべての非同期メソッドは、`code` が次のいずれかである `NacError` で
拒否します。

- `not_found` -- 名前を挙げた要素、役割、動詞が DOM にない。
- `invalid` -- 引数の形が違う。
- `disabled` -- 要素に `disabled` または `aria-disabled='true'` が
  ある (`NAC.click` だけ。`NAC.invoke` は v2.3 の緊急修正以降もう
  検査しません。5.1.4 節を参照)。
- `hidden` -- 要素が画面の外、`aria-hidden='true'`、または大きさが
  ゼロ。
- `capability_required` -- マニフェストが `requires_capability` を
  宣言し、今の `NAC.userCapabilities()` の集合がそれを満たさない
  (v2.3、5.1.7 節を参照)。
- `timeout` -- 副作用は送られたが、適合の受領イベントが 5 秒以内に
  来なかった (`invoke` では 30 秒)。**期限切れは本当の失敗を意味し
  ます**。処理関数が固まったのかもしれず、受領がつながれていなかった
  のかもしれず、通信の競合が起きたのかもしれません。別の経路で副作用の
  証拠を持っていない限り、呼び出し側は期限切れを失敗として扱わなければ
  なりません。

### 5.2 内省

```ts
NAC.describe():    { active: string|null, plugins: PluginSnap[] }
NAC.describe_v2(): { v2_scope_entries: [...], sitemap: ..., data_tables: [...] }
NAC.manifest(plugin_slug: string): Manifest|null
NAC.validate_global(opts?: {probe?: boolean}): GlobalReport   // named buckets, see 10.1
```

### 5.3 データ表 (2.1 以降)

データ表の原語は、中核のランタイム (`js/nac.js` / `@nac3/runtime` の
`nac.mjs`) の一部では**ありません**。ブラウンフィールド向けの拡張
モジュール `js/nac-v2-extensions.js` (`@nac3/runtime/extensions` として
公開) に入っており、読み込まれたあとで同じ `window.NAC` の
オブジェクトに取り付きます。`dt_*` の面を得るには、中核のランタイムの
あとで拡張モジュールを読み込んでください。

```html
<script src="https://yujin.app/nac-spec/js/nac.js"></script>
<script src="https://yujin.app/nac-spec/js/nac-v2-extensions.js"></script>
```

```js
// or with the npm package:
import '@nac3/runtime';
import '@nac3/runtime/extensions';
```

以下のメソッドは、拡張モジュールが読み込まれているときだけ存在します。
中核だけのランタイムで呼ぶと何も起きない / `undefined` が返ります。

```ts
NAC.registerDataTable(spec: DataTableSpec): string   // returns table_id
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

データ表は `subkind` を持ちます。

- `collection` -- 順序のある行で、任意で取引的な確定を伴います。請求書
  の明細、買い物かごの品、記録の行に使います。
- `matrix` -- 行 x 列の格子で、どの升にも値があります。権限の表、時間
  割の格子に使います。
- `matrix-singletree` -- 各行が一本の木に畳まれる行列 (まれ)。

---

### 5.4 厳格な解決 + 曖昧さの解消 (v2.4)

NAC3 v2.4 は、id、動詞、修飾子、ラベルの解決を**厳格**にします。要求を
単一の DOM 要素に解決する動詞 -- `click_by_verb`、`tab` (引数一つの
形)、`tab_by_label` -- はもう当て推量をしません。要求が候補ゼロ、
または一つより多くに解決したとき、ランタイムは候補の一覧を載せた
`NacError` を投げ、かつ `nac:disambiguation_requested` のイベントを
出します。黙って最初の近いものへ送ることはしません。

これが**沈黙の被害ゼロ**という不変条件です。これは支援ソフトウェアと
エージェントの呼び出し側のためにあります。そこでは、回復の道のないまま
黙って誤った要素へ送ることは、安全上の妨げになります。2.4 より前の
緩い挙動 -- 部分文字列の `indexOf` による代替で最初の近いものに
解決していた -- は取り除かれました。

> 後方互換性: v2.4 は*契約の挙動*の変更です。すでに曖昧さのない引数を
> 渡していたコードの道筋は、変わらず動き続けます。緩い `indexOf` の
> 代替に頼って最初の近いものに解決していたコードの道筋は、これからは
> 例外を投げます -- そう設計しています。

#### 5.4.1 修飾子の厳格な一致 (`click_by_verb`)

`click_by_verb(plugin, verb, opts?)` は、`data-nac-action="<verb>"` を
共有する DOM の節点の中から選びます。`opts.qualifier` (文字列) が
与えられたとき、要素が一致するのは、その `data-nac-id` が次を満たす
**場合だけ**です。

```js
id === qualifier || id.endsWith('__' + qualifier)
```

つまり、id が厳密に等しいか、区切り `__` のあとに錨を下ろした接尾辞で
あること。**部分文字列への代替はありません。**単に id の部分文字列で
あるだけの修飾子 (等しくなく、錨を下ろした `__suffix` でもないもの) は
一致**しません**。

- 一致 0 件 -> `NacError('no_matching_instance', ...)` を投げる。
- ちょうど 1 件 -> 解決してクリックする。
- 1 件より多い -> `NacError('ambiguous_qualifier', ...)` を投げる。

`opts.qualifier_ordinal` (数) は、修飾子の一致を通さずに、その動詞を
共有する DOM 要素すべての中から位置で選びます。

#### 5.4.2 id の厳格な解決 (`tab`)

`tab(plugin, id)` の引数一つの形: DOM 内の `data-nac-id` の厳密な一致が
勝ちます。そうでなければ、ランタイムは id が `id + "__"` で始まる
実体を探します。

- 修飾された実体 0 件で厳密な id もない -> `no_matching_instance`。
- ちょうど 1 件 -> 解決する。
- 1 件より多い -> `ambiguous_tab` (修飾された完全な id を渡して
  ください)。

#### 5.4.3 ラベルの厳格な解決 (`tab_by_label`)

`tab_by_label(plugin, label)` は、人が読めるラベルをタブに解決します。
順に、マニフェストのラベルとの厳密な一致、マニフェストでのあいまい /
部分文字列の一致、DOM の文字列との厳密な一致、DOM の文字列との
あいまいな一致を試します。どの段でも一致が一つより多ければ
`NacError('ambiguous_label', ...)` を投げ、どの段も一致しなければ
`NacError('not_found', ...)` を投げます。出されたイベントの `reason`
の欄は、どの段が曖昧だったかを記録します
(`ambiguous_label_exact`、`ambiguous_label_fuzzy`、
`ambiguous_label_exact_dom`、`ambiguous_label_fuzzy_dom`、または
`no_matching_label`)。

#### 5.4.4 誤りのコード

| `err.code` | 投げる側 | 意味 |
|------------|-----------|---------|
| `no_matching_instance` | `click_by_verb` (修飾子)、`tab` | 修飾子 / id に一致する要素がない |
| `ambiguous_qualifier`  | `click_by_verb` | 修飾子に一致する要素が 1 つより多い |
| `ambiguous_tab`        | `tab`           | 修飾された `id__` の実体が 1 つより多く一致する |
| `ambiguous_label`      | `tab_by_label`  | ラベルに一致するタブが 1 つより多い (どの段でも) |
| `not_found`            | `tab_by_label`  | ラベルに一致するタブがまったくない |

#### 5.4.5 `err.candidates` の形

曖昧さの誤りはすべて `candidates` の配列を運びます。各候補はちょうど
次のとおりです。

```ts
{ nac_id: string, label: string }
```

`nac_id` はその要素の `data-nac-id` です。`label` は、まず
`aria-label` を優先し、次に端を落とした `textContent` (120 文字で
切る)、最後に `data-nac-id` へ退いて解決します。この一覧は DOM に
照らして検証されており、呼び出し側が選べる本物の要素を挙げます。
`NacError` は `candidates` を投げられた `Error` に合わせて入れるので、
`err.code`、`err.message`、`err.candidates` の三つがすべて埋まります。

#### 5.4.6 `nac:disambiguation_requested` のイベント

厳格な解決の呼び出しが失敗するたびに (一致なし、または多すぎる)、
ランタイムは例外を投げる*ことに加えて*、`document` に
`nac:disambiguation_requested` の `CustomEvent` を送ります。この送出は
最善努力です。送出が失敗しても、ランタイムはやはり投げます。

```ts
document.addEventListener('nac:disambiguation_requested', (e) => {
  e.detail; /* {
    method:     'click_by_verb' | 'tab' | 'tab_by_label',
    plugin:     string | null,
    query:      { verb?, qualifier?, label?, id? },
    reason:     string,   // finer-grained than err.code (see 5.4.3)
    candidates: Array<{ nac_id: string, label: string }>,
  } */
});
```

#### 5.4.7 呼び出し側の曖昧さの解き方

候補の一覧 (`err.candidates` または `event.detail.candidates`) を手に、
呼び出し側は一つを選び、次のいずれかの方法でもう一度送ります。

1. **完全な `nac_id`** -- `NAC.click(candidate.nac_id)`。これが正規の
   立て直しの道です。候補はすでに厳密な id を持っています。
2. **錨を下ろした `__suffix`** -- その実体の厳密な接尾辞を修飾子として
   `click_by_verb` に渡します。
3. **`opts.qualifier_ordinal`** -- その動詞を共有する要素の中から
   位置で選びます (DOM の順)。

手本となる例は `example-v24-disambiguation.php` です。契約は
`runtime/test/stage2-disambiguation.mjs` と
`runtime/test/stage7-strict-resolution.mjs` が覆っています。

---

## 6. イベント

すべての動作は、決定的な完了のイベントを出します。ランタイムの
`NAC.click()` はこのイベントを待ち受け、出たときに解決します。

| 役割 | 成功のイベント | 失敗のイベント |
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

### 6.1 イベントの detail の形

すべてのイベントの detail は、正規の id の欄に加えて `plugin` を
運びます。

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

### 6.2 ホストの処理関数から出す

クリックの処理関数は、同期の副作用のあとに対応する成功のイベントを
出さなければなりません。

```js
button.addEventListener('click', function (ev) {
  // ... do the work ...
  document.dispatchEvent(new CustomEvent('nac:action:succeeded', {
    detail: { plugin: 'invoice', action_id: 'invoice.save' }
  }));
});
```

仕事が非同期なら、解決したあとに出してください。仕事が失敗したら、
`{detail: {plugin, action_id, error: <message>}}` を付けて
`nac:action:failed` を出してください。

v2.2 のランタイムは、`addEventListener` を包んで自動で出す
`NAC.bindAction(el, handler, ctx)` を提供する予定です。

### 6.3 なぜクリックのイベントそのものを使わないのか

DOM の `click` のイベントは、処理関数が走る前に出ます。NAC3 の契約が
知る必要があるのは、クリックが始まった時点ではなく**副作用が終わった**
時点です。だから別のイベント群があります。

---

## 7. 来歴

### 7.1 isTrusted

`event.isTrusted` は、人が起こしたクリック (本物のマウス、本物の
キー、スクリーンリーダーからの起動) では `true` で、合成された
クリック (`element.click()`、自分で作った MouseEvent の
dispatchEvent、自動化) では `false` です。

NAC3 は、これを成功のイベントの `event.detail.is_trusted` で表に
出さなければなりません。安全に関わる動作 (支払い、削除) を行うホストは、
`is_trusted === true` を求めて合成クリックを拒んでもよいです。参照の
デモ `example-v20-full.php` には、この違いを示すボタンの組
(`v20_panel.istrusted_real` と `v20_panel.istrusted_fake`) が
あります。

### 7.2 HMAC で署名したマニフェスト

マニフェストは `provenance` の塊を持ってもよいです。

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

ランタイムは、マニフェストの安定した直列化 (署名そのものは除く) に
対して期待される HMAC を計算し、署名が合わないマニフェストを拒否
します。複数の借り手が同居する配置で、ある借り手が別の借り手の
マニフェストを偽るのを防ぐために使います。

### 7.3 脅威の想定

脅威の想定の全体は `SECURITY.md` を見てください。短く言えば:

- NAC3 は**利用者**を認証しません。それはあなたの認証の層の仕事です。
- NAC3 は**マニフェスト**を認証します (HMAC)。
- NAC3 は本物のクリックと合成されたクリックを区別します (isTrusted)。
  ホストは、敏感な動詞では後者を断れます。
- NAC3 は、利用者と同じ権限で走る悪意あるエージェントからは守りません。
  そのエージェントは、利用者ができることは何でもできます。

---

## 8. 適合の段階

段階は **NAC3 Conformance Level 1**、**2**、**3** と書きます。段階の
名前は手順の名前ではありません。検証器、報告、適合の主張は、段階を
`api/latest/levels.json` で公開されている識別子
`nac3-conformance-level-<1|2|3>` で挙げなければならず、表示名で挙げては
なりません。8.1 節には、これらの段階が 2.5.0 より前に持っていた名前が
記録されています。

ページが **NAC3 Conformance Level 1** にあるのは、次のときです。

- エージェントが操作できるべきクリック可能なウィジェットがすべて
  `data-nac-id` と `data-nac-role` を持つ。
- `data-nac-role="action"` のすべての要素が、副作用のあとに
  `nac:action:succeeded` を出す。
- ページが `NAC.register()` で少なくとも一つのプラグインの
  マニフェストを登録する。
- 公表したすべての id について `NAC.click(id)` が働く。

ページが **NAC3 Conformance Level 2** にあるのは、さらに次のときです。

- `tabs[]`、`fields[]`、`actions[]` の配列を、マニフェストで明示して
  登録している (DOM からの推測ではない)。
- 利用者に見えるすべてのラベルについて、NAC3 の 10 ロケールを覆う
  `label_i18n` を備えている。
- v2.0 のブラウンフィールドの原語を実装している: 範囲の木、
  一時的な捕捉、autoRegister.watch。
- `NAC.validate_global({probe: false})` を、重さ `error` の検出結果
  ゼロで通る。

ページが **NAC3 Conformance Level 3** にあるのは、さらに次のときです。

- HMAC で署名したマニフェストを持つ。
- 安全に関わる動詞について `isTrusted` を区別する。
- `NAC.validate_global({probe: true})` を検出結果ゼロで通る。

NPM パッケージのコマンド (`npx nac3 validate <url>`) は、ページが
届いた最も高い段階を報告します。(パッケージは `nac3` と `nac` の
実行ファイルを備えます。どちらも同じコマンドに解決します。)

### 8.1 段階の歴史的な名前 (v2.5)

2.5.0 より前、三つの段階は `NAC-1`、`NAC-2`、`NAC-3` と書かれていました。
それらの名前は手順の名前 `NAC3` からハイフン一つの違いしかないため、
「このページは NAC-3 適合である」と「このページは NAC3 を実装して
いる」を見分けられず、段階の報告を求められたエージェントには、
報告すべき一意な文字列がありませんでした。

古い名前は歴史的な別名として読めるまま残ります。
`api/latest/levels.json` は、それぞれを属していた段階の隣に
`legacy_display_name` として公開するので、2.5.0 より前に書かれた文書も
段階に対応づけられます。それらは規範では**ありません**。新しい本文、
検証器の出力、適合の主張は、段階の番号か公開された識別子を使います。

---

## 9. バージョン付け

NAC3 は semver に従います。

- **メジャー**の繰り上げ: 公開 API か通信の形式を壊す変更。採用者は
  コードを直します。
- **マイナー**の繰り上げ: 新しい機能で、後方互換。古いコードはそのまま
  動き続けます。
- **パッチ**の繰り上げ: 欠陥の修正、文書だけの変更。

廃止の方針: バージョン `X.Y.0` で `@deprecated` と記された機能は、
`(X+1).0.0` より前には取り除きません。各版の案内は、すべての除去を
明示して記します。

NPM パッケージのバージョンは仕様のバージョンを映します。
`@nac3/runtime@X.Y.Z` は NAC3 vX.Y を実装し、その上に Z 回のパッチの
改訂が載ります。この例は意図して記号で書いてあります。この文に
具体的なバージョンを書くと次の版で古びるからで、実際この文書は、
パッケージがもう先へ進んだあとも長く `2.1.3` を抱えていました。

### 9.1 プレリリースと dist-tag

プレリリースの尾を持つバージョン (`-alpha.N`、`-beta.N`、`-rc.N`) は、
この仕様の公開された版では**ありません**。約束する前に変更を試せる
ようにするために存在します。

- **`latest` が指すのは、いつでも安定版だけです。** タグなしの
  `npm install @nac3/runtime` は、プレリリースの尾を持たない
  バージョンに解決しなければなりません。既定のまま入れた採用者が、
  うっかりプレリリースを受け取ることはありません。
- **プレリリースは、それ自身の dist-tag で公開されます** (`alpha`、
  `beta`、`rc`)。乗ることは明示的です: `npm install
  @nac3/runtime@alpha`。
- **プレリリースの中身はどれも約束ではありません。** そこで導入された
  どの面も、それを載せる安定版の前に変わったり消えたりしえます。
  10 節の安定の保証と 12 節の検出結果コードの保証は、安定版から
  始まります。
- **プレリリースは決して取り下げられず**、あとから `latest` に付け替え
  られることもありません。何が公開されたかの記録は読めるまま残ります。

参照ランタイムの正式なバージョンは `js/nac.js` の中の定数
`NAC.version` であり、データとしても公開されます。`api/latest.json` は
`stable` と `prerelease` の別々の指し手を持ち (どちらも `null` に
なりえます)、公開されるすべての産物が自分の `channel` の欄を持ちます。
安定した契約を要する利用側は、一つの欄を読んで拒否できます。解析する
バージョン文字列も、信じるタグもありません。

---

## 10. 検証器

### 10.1 ランタイム: `NAC.validate_global()`

生きた DOM と登録済みのマニフェストをたどり、**名前の付いた入れ物の
オブジェクト**を返します。条件ごとに一つの入れ物で、どれも検出結果の
配列です。2.5.0 以降、どの入れ物のどの検出結果も `code` と
`severity` を持つので、CI の組み込みはメッセージを解析せずにコードで
止められます。

```ts
{
  ok:         boolean,       // false when any error-severity finding exists
  has_errors: boolean,
  duplicates: [{ code: 'nac_id_duplicate_across_plugins',
                 severity: 'error', nac_id, plugins: string[] }],
  orphans:    [{ code: 'nac_id_orphan_in_dom',
                 severity: 'warn', nac_id, in_dom, in_manifest,
                 plugin_root }],
  unmounted:  [{ code: 'nac_id_declared_not_mounted',
                 severity: 'warn', nac_id, in_manifest, in_dom,
                 plugin }],
  convention_violations:
              [{ code: 'nac_id_missing_plugin_prefix',
                 severity: 'warn', nac_id, plugin, hint }],
  plugin_instance_violations:
              [{ code: 'duplicate_plugin_no_instance_id',
                 severity: 'error', slug, instance_count, ... }],
  tolerated:  [{ kind, nac_id, until, original }],
  plugin_count: number,
  total_ids:    number,
  timestamp:    number
}
```

五つのコード、その重さ、それぞれに対して何をすべきかは、
`api/latest/findings.json` の `global_buckets` の下にデータとして
公開されています。検出結果のコードはパッチの版をまたいで安定で、
新しいコードはマイナーの繰り上げのときだけ増え、コードが別の条件に
使い回されることは決してありません (12 節、約束 4)。

**2.5.0 より前の版は、これらの入れ物にコードを付けていませんでした。**
そしてこの節は、参照ランタイムが一度も返したことのない、平らな検出結果
の配列を説明していました (監査 N-14、N-34)。

**2.5.0 での挙動の変更 (監査 N-33)。** 2.5.0 より前、この検証器の裏に
いる収集器は、マニフェストの旧来の群 (`actions`、`fields`、`tabs`、
`kpis`、`charts`、鍵は `nac_id`) だけを読み、4 節の正規の形
`elements: [{ id }]` を決して読みませんでした。そのため、文書どおりに
書かれたマニフェストに対しては `total_ids: 0` と報告し、宣言された
すべての要素を孤児として並べ、重複も、取り付いていない id も、慣習
違反も、まったく報告できず、それでも `ok: true` と答えていました。
2.5.0 からは両方の形を読みます。CI を `has_errors` で止めていた
ホストは、更新したあとに最初の失敗を見るかもしれません。それは
ずっとそこにあった真の指摘であり、新しい規則ではありません。

### 10.2 コマンド: `npx nac3 validate <target>`

`validate_global` を包み、さらに HTML とマニフェストの整合の静的な
検査を足します。終了のコード:

- `0` -- 設定した閾値以上の重さの検出結果がない。
- `1` -- 検出結果がある。
- `2` -- 対象そのものが読み込めなかった。

CI で便利です: `npx nac3 validate ./dist/index.html --severity=error`。
パッケージはこのコマンドを `nac3` と `nac` の二つの実行名で出します。
あなたの PATH で他の道具とぶつからない方を使ってください。

---

## 11. NAC3 のまわりの仕組み

NAC3 は契約の層です。NAC3 に適合したページを音声で動くアプリに変える
には、ほかに次のものが必要です。

1. **音声から文字への入り口** (ブラウザの SpeechRecognition、Whisper の
   API など)。
2. **LLM の仲介系**。利用者の文字列と、ページの `NAC.describe()` の
   写し、そして i18n の手がかりを受け取り、構造化された動作を出します:
   `[{kind: 'click', nac_id: 'X'}, {kind: 'fill', nac_id: 'Y',
   value: 'Z'}]`。`guides/LLM_WIRING.md` を見てください。
3. **チャットの client**。会話を保ち、動作を送り出します。参照は
   `js/nac-chat-client.js` です。
4. **文字から音声への出口**。話す返事のために (ブラウザの
   SpeechSynthesis、ElevenLabs など)。

NAC3 が標準にするのは、手順 2 の入出力の形だけです (`NAC.describe()`
の写しと、動作の形)。手順 1、3、4 は仕様の外です。好きなように組んで
ください。

---

## 12. 安定の保証

この仕様が約束すること:

1. 1 節の正規の役割の集合は縮みません。マイナーの版で新しい役割が
   増えてもよいです。
2. 6 節のイベント群の名前は変わりません。マイナーの版で新しい
   イベントが増えてもよいです。
3. `NAC.click`、`NAC.fill` などの動詞は、マイナーの版で形を変え
   ません。`opts` に新しい任意の欄が現れてもよいです。
4. `validate_global` の検出結果のコードは、マイナーの版をまたいで別の
   条件に使い回されません。2.5.0 以降、この検証器のどの入れ物もコードを
   持ち、すべてが重さとともに `api/latest/findings.json` に公開されます。
   公開された二つの版を比べれば、使い回されたコードは、どのソースも
   読まずに見えます。

この仕様が約束**しない**こと:

1. 誤りのメッセージの正確な言い回し (それらは i18n のカタログの
   文字列で、各言語版は動きえます)。
2. 要素を見つけるための DOM の戦略 (今日は `querySelector`。将来は
   もっと速い索引に移るかもしれません)。
3. マニフェストの内部の控えの配置。マニフェストは、ホスト側からは
   書き込み専用、エージェント側からは読み取り専用として扱ってください。

---

## 13. 未解決の問い

これらは**ここで**、この節で追跡されます。前の版はこれを「未解決の問い
(別に追跡)」と題していながら、その「別に」がどこなのかを一度も言わず、
ほかの台帳はありませんでした。決定に至った問いは下の表を出て、影響する
節に入ります。具体的な提案になった問いは RFC を得て、それらは
[`rfcs/README.md`](rfcs/README.md) に索引され、手順は
[`CONTRIBUTING.md`](CONTRIBUTING.md) にあります。

どの行も、最後に見直した版を持っています。読む人が、生きている問いと
捨てられた問いを見分けられるようにするためです。**どの行も目標の版を
持ちません。**日付のある約束がその日付を過ぎるのは、日付のない約束より
悪く、それは 5 節が `payload_schema` について犯していた誤りです。

| 問い | 状態 | 最後の見直し | 今どうなっているか |
|----------|-------|---------------|-----------------|
| `data-nac-role="navigation"` は、いつかタブに解決すべきか。 | **決定: いいえ** | v2.5 | 2.2.0 で決まり、以来強制されています。接頭辞 `tab.` の id に役割 `navigation` が付くと `tab_id_manifest_role_drift` が立ち、`STRICT_VALIDATION` (2.3.0 以降は既定で `true`) のもとでは `NAC.register` が投げます。`tab_by_label` がタブを解決するのは `m.tabs[]` と `elements[role=='tab']` からだけです。`navigation` は目印の領域であり、切り替え式のパネルでは決してありません。1 節と 10 節を見てください。 |
| `NAC.click()` は相対の id (たとえば `'./save'`) を受け入れるべきか。 | **未解決、未実装** | v2.5 | 解決器は `data-nac-id` を厳密に突き合わせ、プラグインで範囲を限ります。活動中のもの、または `opts.plugin` のものです。その範囲の限りが、問いの求めていた場合をすでに覆っています (`NAC.click('save', {plugin:'invoice'})`)。したがって相対の書き方への圧力は低く、進行中のものもありません。これを決めるなら、id がランタイムに対して不透明だと宣言されている 2 節に、経路の文法を足すことになります。 |
| マニフェストは、プラグインをまたぐ継承 / 拡張を支えるべきか (基になるマニフェストを借り手が拡張する)。 | **未解決、次のメジャーの候補** | v2.5 | 未実装。**15 節と混同しないでください。**そこの「プラグイン拡張の契約」は v2.5 で出ており、backend への振り分けの仕組み (`registerPlugin` / `call` / `read` / `subscribe`) であって、マニフェストの継承ではありません。ここでの問いは、あるマニフェストが別のマニフェストから派生することで、2 節の id の一意性の規則に触れます。だからメジャーまで留保されています。 |
| `payload_schema` の強制を正式に定めて有効にすべきか。 | **未解決、日付なし** | v2.5 | 5 節からここへ移しました。そこではこれを v2.4 に約束していました。v2.4 では実現せず、v2.5 を通じても実現していません。参照ランタイムはこの欄を読みません。今日何が検証され何が検証されないかは 5 節を見てください。 |
| `validate_global()` の検出結果は、公開されたカタログのコードを持つべきか。 | **決定: はい、2.5.0 で出荷** | v2.5 | どの入れ物のどの項目も `code` + `severity` を持つので、12 節の約束 4 は空集合ではなく本物の集合を覆うようになりました。五つのコードは `api/latest/findings.json` の `global_buckets` の下に公開され、生成器はそれらを手で書くのではなく、各入れ物を引き起こす試験用の材料から読み取ります。前の版は、2.5.0 以降コードを持っていた入れ物に `code: null` と書き、二つの主張を同じファイルで公開していました。その材料を作ることが、監査 N-33 を見つけた作業でもあります。検証器は、正規の形で書かれたマニフェストを見られませんでした。10.1 を見てください。 |

---

## 13.5 運営

NAC3 は今のところ Yujin が世話をしています。仕様、文書、参照
ランタイムはすべて Apache-2.0 で公開されています。(2.5 より前、
二つのリポジトリの時代には、ランタイムは MIT と記されていました。
2026-05-23 の統合で、NAC3 のすべての産物にわたって Apache-2.0 に
揃えました。`LICENSE` と `runtime/LICENSE` を見てください。) Yujin は、
普及が中立な運営を正当づけるようになったときには、NAC3 を中立な
財団 (W3C のコミュニティグループ、Linux Foundation、または同等の業界の
団体) に移すと約束します。それまでは、仕様の変更は
`CONTRIBUTING.md` に記された RFC の手順に従い、公開 API や通信の形式に
関わる変更には、少なくとも 14 日の公開の意見期間を置きます。

採用者へ: Apache-2.0 で一様に許諾していることは、Yujin の会社としての
立場がどう変わっても、仕様とランタイムが生き残ることを保証します。
どちらも分岐でき、どちらも動かせ、どちらも配れます。今日も、私たちが
いなくなったあとも。この文書は、その生き残りへの道筋が暗黙ではなく
明示であるように、約束を記録しています。

---

## 14. 参照実装

正規の実装は、NPM パッケージ `@nac3/runtime` として配られる参照
ランタイムです。バージョンの規範の出どころはランタイム自身の定数
`NAC.version` であり、`api/latest.json` にデータとして公開されています
(9.1 節を参照)。この節は意図してバージョン番号を書き直しません。
パッケージがもう先へ進んだあとも `2.5.0-alpha.5` を抱えていたからで、
それは 5 節と 9 節から取り除いた古い例と同じ種類の欠陥です。中身は
次のとおりです。

- `js/nac.js` -- 中核のランタイム。5 節の公開された命令形 + 内省の API
  (click/fill/select/tab、click_by_verb/tab_by_label、invoke/utter、
  edit_field、setCapabilities、syncPlugin、
  request_authority/confirm_action、
  registerPlugin/call/read/subscribe、narrate/context/tree、
  expect/diff、describe、validate_global、...)。パッケージの
  `main`/`module`/`browser` の入り口として公開 (`dist/nac.mjs`)。
- `js/nac-v2-extensions.js` -- 中核が読み込まれたあとで同じ
  `window.NAC` に取り付く、ブラウンフィールドとデータ表の原語。
  範囲の木、autoRegister、一時的な捕捉、HMAC、isTrusted の証明、
  i18n のカタログ (`t`/`locale`)、そして `registerDataTable` /
  `dt_*` のデータ表の一族すべて (5.3 節)。
  `@nac3/runtime/extensions` として公開
  (`dist/nac-v2-extensions.mjs`)。中核のランタイムは `dt_*` の面を
  持ち**ません**。得るにはこのモジュールを読み込んでください。
- `js/nac-chat-client.js` -- 音声と LLM と送り手をつなぐ、参照の
  チャット client。`@nac3/runtime/chat-client` として公開。

パッケージは `nac3` と `nac` の実行名でコマンドも出します
(`dist/cli.js`、10.2 節)。

ほかの実装も歓迎します (native な自動化の実行系なら Python、組み込みの
エージェントなら Rust など)。拠りどころは仕様であって、JS のコードでは
ありません。

---

## 15. プラグイン拡張の契約 -- canvas と API の面 (v2.5)

1-14 節は、エージェントに関わる面が **DOM** であることを前提に
しています。番地を持つすべての要素は `data-nac-id` の属性を持ち、
すべての動詞は `el.click()` を通って起こり、状態の読み取りはすべて
`el.getAttribute(...)` から来ます。これは、外枠も中身も DOM の節点に
住むアプリでは成り立ちます。

面の一部が **canvas** であるアプリでは成り立ちません (LibreOffice /
Collabora Online、Figma、Excalidraw、Miro、自作のあらゆる WebGL の
編集器)。外枠は DOM のままでもよいのですが (ツールバー、ダイアログ)、
命令はしばしばアプリ自身の公開 API を通る必要があり (postMessage、
プラグインの SDK、スクリプトの橋)、状態は DOM からまったく読めない
こともあります。

v2.5 は、NAC3 のプラグインがそうした面への振り分けの契約を自分で
宣言できるようにする、小さな原語の組を足します。ランタイムは特定の
アプリについて何も知らないままです。あるアプリとの話し方は、プラグイン
のマニフェストを読むことだけで覚えます。

### 15.1 なぜ新しい原語の組が必要か

DOM しか知らない `NAC.click(id)` にできないこと:

- 砂箱に入った Collabora の iframe へ `Send_UNO_Command` の
  postMessage を送る。
- Figma のプラグインの砂箱の中で
  `figma.currentPage.selection = [...]` を呼ぶ。
- React の ref に対して `excalidrawAPI.setElements(...)` を呼ぶ。
- Collabora の今の選択で太字が有効かどうかを読む (ツールバーは
  映しますが、canvas は隠します)。

直し方は、`NAC.click` に backend を見分ける当て推量を足すことでは
**ありません**。直し方は、プラグインの slug と動詞の経路を取る、明示
された中立な動詞を足し、その動詞がどう振り分けられるかをプラグインの
マニフェストに宣言させることです。

### 15.2 三つの原語

```ts
NAC.registerPlugin(slug: string, manifest: PluginManifest): void
NAC.call(plugin: string, verb_path: string, args?: object): Promise<any>
NAC.read(plugin: string, state_path: string): Promise<any>
NAC.subscribe(plugin: string, event_path: string,
              cb: (data: any) => void): SubscriptionHandle
NAC.unsubscribe(handle: SubscriptionHandle): void
```

- `registerPlugin(slug, manifest)` は v2.5 のプラグインを登録します。
  同じ `slug` が、DOM のマニフェストの台帳 (5 節) と v2.5 の拡張の
  台帳の両方に現れてもよく、二つは併存します。v2.5 の呼び出しは
  v2.5 の台帳だけで解決します。
- `call` は宣言された動詞を呼びます。振り分けを選ぶのはマニフェストで
  あり、エージェントではありません。backend が返したもので解決します
  (多くは `undefined` / `{ok: true}`)。動詞が未知のとき、backend が
  失敗したとき、応答の形が不正なときは `NacError` で拒否します。
- `read` は宣言された状態の値を返します。ランタイムは状態の代替の鎖を
  宣言された順にたどり、最初に解決した出どころを返します。鎖のすべての
  出どころが失敗したときだけ拒否します。
- `subscribe` は宣言されたイベントに受け手を付けます。片づけのために
  呼び出し側が `unsubscribe` に渡す取っ手を返します。イベントは、
  上流の本物のイベントの出どころに支えられていてもよく、定期的な
  問い合わせ / MutationObserver で合成されていてもよいです。どちらかは
  マニフェストが宣言します。

四つの関数はすべて非同期です (Promise を返します)。ただし
`unsubscribe` は同期で、何度呼んでも同じです。

### 15.3 プラグインのマニフェストの形

```ts
interface PluginManifest {
  slug: string;
  verbs:  { [verb_path: string]: VerbBinding };
  state:  { [state_path: string]: StateBinding[] };
  events: { [event_path: string]: EventBinding };
}

interface VerbBinding {
  backend:       BackendKind;
  /* backend-specific fields (see 15.4) */
  [k: string]: any;
}

interface StateBinding {
  backend:       BackendKind;
  /* backend-specific fields (see 15.4) */
  extract?:      string;   /* extractor DSL string (see 15.5) */
  [k: string]: any;
}

interface EventBinding {
  backend:       BackendKind;
  /* backend-specific fields */
  [k: string]: any;
}

type BackendKind =
  | 'postmessage'
  | 'postmessage-listen'
  | 'sdk-call'
  | 'script-bridge'
  | 'dom-mirror'
  | 'same-origin-window'
  | 'synthetic-mutation'
  | 'synthetic-poll';
```

マニフェストは純粋な JSON です (JS の callback はありません)。Forge、
Sumi、そして将来のどの道具も、これらをデータとして生みます。ランタイム
は backend の名前を固定の語彙から解釈します。

動詞とイベントは**ちょうど一つ**の結びを持ちます。状態は結びの
**順序のある配列**を持ちます。ランタイムは鎖を順にたどり、うまく
解決した最初の出どころを返します。

### 15.4 backend の語彙

| 種類 | 用途 | 必須の項目 |
|------|----------|-----------------|
| `postmessage` | 動詞: `postMessage` で iframe へメッセージを送る。 | `target` (送り先の iframe の CSS セレクタ)、`message` (MessageId の文字列)、`values` (引数で埋めるオブジェクトのリテラル)、`values_from_args` (そのまま転送する引数の鍵の配列、任意) |
| `postmessage-listen` | イベント: `window.message` に来る特定の `MessageId` を聞く。 | `source` (出どころを絞るための iframe の CSS セレクタ。省くとどの出どころも受け入れる)、`message` (合わせる MessageId)、`extract` (メッセージのデータに対する取り出しの DSL) |
| `sdk-call` | 動詞: 全域に出してある JS の関数を呼ぶ (たとえば Figma のプラグイン、Excalidraw の API)。 | `path` (`window` の中の点で区切った経路。たとえば `figma.currentPage.selection`)、`mode` (`assign` はその経路に引数の値を代入、`invoke` は引数のオブジェクトを渡して関数として呼ぶ) |
| `script-bridge` | 動詞か状態: アプリのスクリプトの橋を呼ぶ (Collabora の `CallPythonScript`、LibreOffice の UNO の橋、Google Apps Script)。 | `bridge` (backend 固有の識別子。`collabora.python` など)、`script` (スクリプトの識別子)、`function` (走らせる関数の名前)、`args` (呼び出しの引数で埋めるオブジェクトのリテラル)、`response_match` (状態の場合: 待つ応答の MessageId)、`timeout_ms` (任意、既定は 5000) |
| `dom-mirror` | 状態: 属性 / クラス / 文字列が canvas の内部の状態を映している DOM 要素から読む (たとえば、今の選択でその書式が有効なときに強調されるツールバーのボタン)。 | `selector` (問い合わせる CSS セレクタ)、`extract` (取り出しの DSL。15.5 を参照) |
| `same-origin-window` | 状態: iframe が同一の出どころのとき、`iframe.contentWindow.<path>` から読む。ランタイムは出どころが違うことを見分け、次の代替へ落ちます。 | `target` (iframe の CSS セレクタ)、`path` (`contentWindow` の中の点で区切った経路) |
| `synthetic-mutation` | イベント: 一つ以上の状態の出どころについて DOM の変化を見張り、見ている値が変わったら出し直すことでイベントを合成する。 | `observe` (見張る状態の経路の配列。ランタイムはそれぞれに `read` を呼び、変化のあいだで比べます)、`throttle_ms` (任意、既定は 100) |
| `synthetic-poll` | イベント: 状態の出どころを定期的に問い合わせてイベントを合成する。 | `observe` (状態の経路の配列)、`interval_ms` (既定は 250) |

どの backend も、ランタイムによって自己完結した送り手
(`dispatch(binding, args, context) -> Promise<value>`) として実装され
なければなりません。新しい種類の backend を仕様に足すには、仕様の
バージョンを繰り上げる必要があります。未知の backend を無視する
ランタイムは、それを宣言したマニフェストを拒否しなければなりません
(黙って飛ばしてはいけません)。

### 15.5 取り出しの小さな DSL

状態の backend と `postmessage-listen` のイベントの backend は、大きな
オブジェクトから一つの欄を摘み取る必要がよくあります。マニフェストが
JSON だけで済むように、ランタイムはごく小さな宣言の DSL を備えます。

| 書き方 | 意味 | 入力の例 -> 出力 |
|--------|---------|-------------------------|
| `field.path.to.value` | 点で区切った経路をたどる。 | `{a:{b:1}}` に `a.b` -> `1` |
| `attribute:NAME` | DOM だけ: `el.getAttribute(NAME)` を読む。 | `<i data-x="hi">` に `attribute:data-x` -> `'hi'` |
| `text` | DOM だけ: `el.textContent` を読む。 | `<span>hi</span>` に `text` -> `'hi'` |
| `classList.contains:CLASS` | DOM だけ: `el.classList.contains(CLASS)` -> 真偽値。 | `<button class="active">` に `classList.contains:active` -> `true` |
| `value` | DOM だけ: `el.value` を読む。 | `<input value="x">` に `value` -> `'x'` |
| `present` | DOM だけ: セレクタが要素を解決したら `true`、そうでなければ `false` を返す。 | セレクタが一致した -> `true` |

v2.5 では組み合わせに対応しません。取り出しは上の行のちょうど一つ
です。複雑な変換が必要なマニフェストは、代わりに `script-bridge` を
宣言します。

### 15.6 `state` の代替の鎖の意味

`state[path]` は結びの配列です。`NAC.read(plugin, path)` はその配列を
順にたどります。各結びについて:

1. ランタイムが backend の送り手を呼びます。
2. 送り手が値で解決したら (`false`、`0`、空文字列も含みますが
   `undefined` は**含みません**)、`read` はその値を返します。
3. 送り手が拒否したか `undefined` で解決したら、ランタイムは配列の
   次の結びへ進みます。
4. どの結びも値を生まなかったら、`read` は
   `NacError('state_unreadable', ...)` で拒否します。その
   `err.attempts: [...]` は、試した backend ごとに一件、
   `{backend, reason}` を運びます。

理由: この鎖は、マニフェストを書いた人の好みの順を表します。最も速く、
最も安く、最も新しい出どころを先に宣言し、代替は上品に落ちていきます。
ランタイムが黙って劣った出どころを先に選ぶことはありません。

### 15.7 合成された動作の来歴

`NAC.call` の送出はすべて、backend が返ったあとに `document` に
`nac:plugin:invoked` のイベントを出します。detail の中身:

```js
{
  plugin:    'collabora.writer',
  verb_path: 'uno.Bold',
  backend:   'postmessage',
  request_id: 'pi_<random hex>',
  source:    'agent',     // see sec 7
  trusted:   false,
  duration_ms: 12,
  ok:        true,
  error:     null,
}
```

`nac:plugin:read` (`read` のあと) と `nac:plugin:event` (合成した
イベントの出し直し) も同じ形です。`source` の既定は `'agent'` です。
ランタイムを利用者向けの UI で包むホストは、すでにある
`NAC.set_source(...)` の仕組みで上書きしてもよいです (7 節)。

### 15.8 通して見る例 -- Collabora Writer

```json
{
  "slug": "collabora.writer",
  "verbs": {
    "uno.Bold": {
      "backend": "postmessage",
      "target":  "iframe[data-collabora-frame]",
      "message": "Send_UNO_Command",
      "values":  { "Command": ".uno:Bold" }
    },
    "doc.save": {
      "backend": "postmessage",
      "target":  "iframe[data-collabora-frame]",
      "message": "Action_Save",
      "values_from_args": ["DontTerminateEdit", "Notify"]
    }
  },
  "state": {
    "selection.isBold": [
      { "backend": "dom-mirror",
        "selector": "[data-nac-id='toolbar.bold']",
        "extract":  "classList.contains:selected" },
      { "backend": "script-bridge",
        "bridge":   "collabora.python",
        "script":   "yujin_state.py",
        "function": "GetSelectionState",
        "response_match": "CallPythonScript-Result",
        "extract":  "Values.is_bold" }
    ],
    "doc.modified": [
      { "backend": "same-origin-window",
        "target":  "iframe[data-collabora-frame]",
        "path":    "app.file.modified" }
    ]
  },
  "events": {
    "doc.modified": {
      "backend": "postmessage-listen",
      "source":  "iframe[data-collabora-frame]",
      "message": "Doc_ModifiedStatus",
      "extract": "Values.Modified"
    },
    "selection.changed": {
      "backend":     "synthetic-mutation",
      "observe":     ["selection.isBold", "selection.isItalic"],
      "throttle_ms": 100
    }
  }
}
```

エージェントが `NAC.call('collabora.writer', 'uno.Bold')` を呼び、
ランタイムは `postmessage` の backend を通して iframe に
`Send_UNO_Command` を送ります。効果が起きたことを確かめるために
(17 節を参照)、エージェントは
`await NAC.read('collabora.writer', 'selection.isBold')` を呼びます。
ランタイムはまずツールバーの映し (速くて無料) を試し、映しが使えなければ
Python のスクリプトの橋に落ちます。エージェントは、どの出どころが
答えたかを知ることも気にすることもありません。

### 15.9 誤り

`NAC.call` / `read` / `subscribe` は、`code` が次のいずれかである
`NacError` で拒否します。

- `plugin_not_registered` -- その slug には v2.5 のマニフェストがない。
- `verb_not_declared` -- 動詞の経路がマニフェストにない。
- `state_not_declared` -- 状態の経路がマニフェストにない。
- `event_not_declared` -- イベントの経路がマニフェストにない。
- `backend_unknown` -- マニフェストが、ランタイムの実装していない
  backend を宣言している。マニフェストは登録の時点で拒否されなければ
  なりません。この誤りが表に出るのは、ランタイムが将来のマニフェストの
  形式を受け入れたうえで、それを送り出せない場合だけです。
- `backend_target_missing` -- backend の対象 (iframe、JS の経路、DOM の
  セレクタ) が見つからない。
- `cross_origin_blocked` -- 出どころの違う iframe に対して
  `same-origin-window` を試した。
- `state_unreadable` -- 状態の鎖のすべての結びが失敗した。15.6 を
  参照。
- `timeout` -- backend が、宣言された `timeout_ms` の中に応えなかった
  (既定は動詞で 5000、状態の読み取りで 1000)。
- `invalid` -- 引数の形が違う (不正な slug、登録の時点で形の崩れた
  マニフェストなど)。

---

## 16. 木のたどり方 (v2.5 -- 2.5.0-alpha.5 で出荷 / RFC V25-02)

今の焦点から何ができるかを説明する必要のある支援の流れや音声の
実行系のための、命令の階層をたどる原語です。

**API の面:**

- `NAC.context(plugin) -> { breadcrumb: [{nac_id, label}, ...] }`
  `document.activeElement` から、`data-nac-id` を持つ祖先の要素を
  たどって上がり、プラグインの根で止まります。プラグインの中で何も
  焦点を持っていなければ、空のパン屑を返します。各段の `label` は
  `narrate` から来ます (17 節)。

- `NAC.tree(plugin, rootId?) -> [{nac_id, label, opens?, leaf?}, ...]`
  `rootId` (省けばプラグインの根) の、番地を持つ**直下**の子を列挙し
  ます。「直下」とは、出発点と子のあいだに `data-nac-id` を持つ別の
  要素がないことです。各項目について:
  - `label` は `narrate` で解決
  - `opens` は、`data-nac-opens` の属性があればそれを映す
  - `leaf` は、`data-nac-leaf` があれば `true`

**書く人のための属性:**

- `data-nac-opens="<target-nac-id>"`: この節点が、対象の id で示される
  要素を開く / そこへ掘り進むことを宣言します。エージェントは名前を
  当てずに、たどる鎖を追えます。
- `data-nac-leaf`: 明示した終端の印。後続のエージェントは、これ以上
  掘り進めないことを知ります。

**誤り:** `tree` は未知の rootId には `[]` を返します (黙って空で、
誤りではありません)。`context` は未知のプラグインにはいつでも
`{ breadcrumb: [] }` を返します。

---

## 17. 支援のラベル (v2.5 -- 2.5.0-alpha.5 で出荷 / RFC V25-03)

人が読めるラベルの正規の解決です。スクリーンリーダー、音声の読み上げ、
音声の流れ、監査の記録、携帯の支援の面のための、ひとつの関数です。

**API の面:**

- `NAC.narrate(plugin, nac_id) -> string | null`
  プラグインか nac_id が見つからなければ `null` を返します。見つかれば、
  次の厳密な優先の順に従うラベルを返します。

  1. **`aria-label`** -- まず支援技術。空白だけでなければ尊重します。
  2. **見える文字列** -- その要素の `textContent` から、`data-nac-id`
     を持つ入れ子の部分木を除いたもの (それらには自分の narrate の
     解決があります。読み上げの出力が範囲内に収まるよう除きます)。
  3. **`data-nac-label`** -- 書く人による明示の上書き。見える文字列に
     記号の字形や i18n の鍵が入っているときに役立ちます。
  4. **最後の頼みの `nac_id`** -- 最悪の場合で、「ラベルが書かれて
     いない」ことを示します。

  どの段でも、空白だけの値は次の段へ落ちます。

**検証:** `validate_global()` は、上の段のラベルをどれも持たない
序数の形の nac_id (`btn-1`、`btn-2`、...) について、
`plugin_instance_violations` の入れ物に警告を出すことがあります。

---

## 18. 効果の検出 (v2.5 -- 2.5.0-alpha.5 で出荷 / RFC V25-04)

「沈黙の被害」の隙間を埋めます。エージェントは、命令が出たことだけで
なく、動作の効果を確かめます。二つの原語はどちらも `NAC.read()` と
組み合わさるので、V25-01 のどの backend でも働きます (postmessage、
sdk-call、dom-mirror、...)。

**API の面:**

- `NAC.expect(plugin, statePath, value, opts?) -> Promise<value>`
  比べ手が真を返すか期限が来るまで、`NAC.read(plugin, statePath)` を
  繰り返し問い合わせます。解決した値で解決し、期限では
  `NacError('timeout', ...)` で拒否します。

  問い合わせの途中の読み取りの失敗は、期限まで再試行されます
  (硬い誤りではなく「まだ見えない」として扱います)。

  選べる項目:
  - `timeout_ms` (既定は `5000`)
  - `poll_ms` (既定は `100`)
  - `comparator` (既定は `(cur, want) => cur === want`)
    `(current, expected)` を受け取り、真偽値を返します。

- `NAC.diff(plugin, statePath, actionFn) -> Promise<{before, after, changed}>`
  状態を読み、`actionFn()` を待ち、もう一度状態を読みます。二つの写しと、
  JSON-stringify の比較で求めた真偽値 `changed` を返します (なので
  `undefined` と値の対比も、変わったと示されます)。読み取りの失敗は
  `undefined` に畳まれます。

**組み合わせについての注意:** `diff` が捉えるのは始めと終わりの写し
だけで、動作の内側の途中の状態は見**ません**。「状態がどこかの時点で
ある特定の値を通る」ことが関心なら `expect` を使ってください。

---

*この文書は NAC3 v2.5 の正規の仕様です。0-14 節は v2.4 安定版から
変わっていません。15-18 節は v2.5 で出ます。このファイルへの編集は
仕様の変更にあたり、RFC が必要です。`CONTRIBUTING.md` を見てください。*
