---
translation_source: docs/NAC_V22_ROADMAP.md
translation_source_hash: 8d844659a0ed290a00c015c5b2e875d6d9b3d52b18f02f8c182169927d3d4750
translation_quality: machine_v1
translation_lang: ja
translation_date: 2026-05-11T14:56:25.867715+00:00
---

# NAC3 v2.2 -- ロードマップ

NAC3 = **Native Agent Contract**。

2026-05-09 開始。このファイルは NAC3 仕様の次マイナーバージョンに向けた進化項目を蓄積する。各セクションは独立した構成となっており、問題の説明、防止できるバグの種類、提案するコントラクト変更、および実装メモを含む。

**2026-05-10 時点のステータス:** v2.2 リリース済み。V22-01 + V22-02 + V22-03 + V22-04 はすべて `js/nac.js` および `@nac3/runtime` 2.2.0 NPM パッケージに含まれている。このファイルは当バージョンの正式な変更履歴となる。

| 項目 | ステータス | コミット |
|------|--------|--------|
| V22-01 厳格バリデーター | リリース済み | 6c2b1866 |
| V22-02 bindAction ヘルパー | リリース済み | 6c2b1866 |
| V22-03 ロケール検出の堅牢化 | リリース済み 2026-05-09 | f631d77a |
| V22-04 tab_by_label 括弧の正規化 | リリース済み 2026-05-09 | f631d77a |
| V23-01 フィールドエディタープリミティブ（プレビュー） | デモリリース済み 2026-05-11 | (example-v23-editor.php + packages/nac/test/v23-editor.mjs 8/8 PASS) |

---

## V22-01 -- コンストラクター（`NAC.register`）を厳格バリデーターに変更

**バグの種類。** ブラウンフィールドのデモでは、マニフェスト要素に非正規のロール値（タブに `role:'navigation'`、`'action'` の代わりに `role:'button'` など）を宣言することがある。現在のコンストラクターは受け取った形状をそのまま受け入れて保存する。バグが表面化するのは、API（`NAC.tab()`、`NAC.tab_by_label()`、`NAC.click()`）が要素を見つけられない実行時であり、正規の DOM クエリ（`[data-nac-role="tab"]`）がマッチしないことが原因となる。その時点ではデモはすでにデプロイ済みで、ユーザーはすでに壊れた音声コマンドを実行しており、ランタイムは正しく `tab X missing` をスローする――しかしこれは誤解を招くエラーであり、要素は DOM に存在しているが、誤ったロールで登録されているだけである。

**具体的なトリガー（2026-05-09）。** Pablo が `example-v21-data-table.php` で `ve a pestana permisos` と発話する。LLM は `NAC.tab('invoice_edit_modal','tab.permissions')` に解決する。ボタンは DOM に存在するが、`data-nac-role="navigation"` が設定されている（デモ作成者が HTML セマンティクスの観点からタブをナビゲーションとして扱ったため）。ランタイムはボタンが目の前にあるにもかかわらず「tab tab.permissions missing」をスローする。同じ根本原因が、同セッションの前半で `tab_by_label('Lines (collection)')` の失敗も引き起こしていた。

**3 つのガード層がなぜ検出できなかったか。**

| 層 | 検出すべき内容 | 現在の動作 |
|---|---|---|
| プリコミットリント | PHP/HTML デモファイルのロールずれ | 存在しない |
| `NAC.register(manifest)`（登録時） | 非正規ロール、id/ロールの不一致 | すべてサイレントに受け入れる |
| `NAC.validate_global()`（リント時） | `m.elements[]` 内のロールずれ | `m.tabs[]` の存在確認のみ |

ランタイム API 層（`NAC.tab` など）は**第 4 の**ガードであり、今日唯一発火するものだが――エンドユーザーへのランタイムエラーとして発生する。その時点でコストは最大となる。

**v2.2 向けの提案コントラクト変更。**

`NAC.register` はマニフェストを保存する前に検証しなければならない。
検証ルール:

1. **既知のロール列挙。** すべての `m.elements[i].role` は正規ロールセット（`_CLICK_EVENT_FAMILY` を拡張）のメンバーでなければならない:

   ```
   action, field, option, tab, breadcrumb-item, accordion-toggle,
   step, pagination-item, confirm-button, sort-control,
   filter-control, data-table, plugin, section, region,
   navigation, banner, complementary, contentinfo, button
   ```

   未知のロール -> `console.error` + 登録呼び出しを拒否。
   ランドマークロール（`navigation`、`banner` など）は受け入れるが、クリッカブルウィジェットではなくリージョンコンテナーに対応する DOM ノードを持つ要素にのみ適用される。

2. **id/ロールの整合性。** `e.id` が `^tab\.` にマッチする場合、`e.role === 'tab'` が必須。`e.id` が `^modal\.` にマッチする場合、`e.role === 'action'`（またはアクションのサブロール）が必須。不一致の場合 -> `console.error` + 拒否。id フィールドの文法もコントラクトであり、現在は暗黙的となっている。

3. **DOM 整合性（ベストエフォート）。** DOM のパース後に `register` が呼ばれた場合（典型的なパス）、DOM 内の `[data-nac-id="<e.id>"]` を検索する。見つかり、その `data-nac-role` が `e.role` と異なる場合、`console.error` + 拒否。これは Pablo が 2026-05-09 に遭遇したケースを捕捉する: マニフェストは `role:'tab'` と言っているが、HTML は依然として `data-nac-role="navigation"` と言っている（またはその逆）。DOM の準備が整う前に呼ばれた場合は、`DOMContentLoaded` のポストパスにチェックを遅延させる。

4. **マイグレーションヘルパー（1 リリースウィンドウ）。** v2.2.0 では上記は `console.error` を出力するが、スローしない――採用者にはマイグレーションのための猶予期間が必要。v2.3.0 以降は `RegisterError` をスローし、マニフェストは完全に拒否される。ランタイムでは `NAC.STRICT_VALIDATION` フラグで管理され、v2.2 ではデフォルト `false`、v2.3 では `true` となる。

**`NAC.validate_global()` の拡張。**

新たに 3 つの検出項目を追加:

- `manifest_role_unknown` -- 要素のロールが正規セットの外にある。
- `manifest_dom_role_mismatch` -- `<id>` に対するマニフェストのロールが DOM の `data-nac-role` 属性と異なる。
- `tab_role_drift` -- DOM 内の `<button>`（またはクリッカブル要素）が `data-nac-id="tab.X"` を持つが `data-nac-role` が `"tab"` でない――マニフェストエントリーの有無にかかわらず。マニフェストバリデーターが定義上見逃す HTML のみのずれを捕捉する。

各検出項目はデフォルトで severity `error` を持ち、プロジェクトごとに `{ kind: 'warn' }` でオーバーライド可能。

**プリコミットリント（別途デリバラブル、同じずれをブロック）。**

新しい Node スクリプト `tools/nac/check_demos.mjs` が `yujin.app/nac-spec/` 内のすべての `*.php` および `*.html` を読み込み、cheerio（または軽量パスとして正規表現）で疑似 DOM を構築し、インラインスクリプトからすべての `NAC.register({...})` 呼び出しを抽出して、同じ整合性ルールをクロスチェックする。GitHub Actions およびローカルの `pre-commit` git フックに接続される。いずれかのルールが失敗した場合はコミットをブロックする。

**工数見積もり。**

| タスク | 場所 | 工数 |
|---|---|---|
| `NAC.register` 厳格モード | `js/nac.js` | 2h |
| `validate_global` 新規検出項目 | `js/nac.js` | 2h |
| プリコミットリントスクリプト | `tools/nac/check_demos.mjs` | 4h |
| 既存デモへのマイグレーション適用 | `example-v*.php` | 1h |
| 仕様のドキュメント更新 | `docs/spec.md` など | 1h |
| テストおよび CI 配線 | `tests/` + `.github/workflows/` | 2h |

合計: 集中作業で約 12h。

**後方互換性。**

v2.2 リリースノートには以下を明記すること:
- `NAC.register` はロールずれに対して `console.error` を出力するようになった（スローなし）。
- v2.3 では同条件で `RegisterError` をスローするようになる。
- 採用者はリリース前に `NAC.validate_global()` を実行すること。

このリポジトリ内の既存 6 つのデモへのマイグレーションパスは、コミット `0633e080`（2026-05-09）時点で完了済み: v21 デモのタブボタンとマニフェストが `role:'tab'` に修正された。

---

## V22-02 -- Action-ack コントラクトの強制

**問題のクラス。** 同期的に処理を行うクリックハンドラは、副作用の後に `dispatchEvent(new CustomEvent('nac:action:succeeded', {detail:{plugin,action_id}}))` を呼び出す必要がある。ブラウンフィールドのパネルはこれを忘れがちだ。その結果、副作用はすでに発生しているにもかかわらず、ランタイムが 5 秒の ack ポーリングをタイムアウトさせ、チャットやエージェントが `No pude ejecutar X: timeout` と報告してしまう。

**具体的なトリガー（2026-05-09）。** Pablo: `hide` -> パネルは正しく非表示になるが、チャットには「No pude ejecutar v20_panel.toggle: timeout」と表示される。v20-panel 上のすべてのボタンで同様の問題が発生。

**以前のワークアラウンドは誤りだった。** コミット `ad200e4c` は、チャットのエージェントループ内で `err.code === 'timeout'` を成功として握りつぶしていた。Pablo はこれが実際の障害（ハンドラのハング、ネットワーク競合、未処理の例外）を隠蔽し、ランタイムの唯一の正直なシグナルを壊すと正しく指摘した。`c9bf2bdb` でリバートされた。

**正しい修正はすでにリリース済み。** `example-v20-full.php` の `bind()` をラップして、すべてのハンドラの後に `nac:action:succeeded`/`nac:action:failed` を自動的に emit するようにした。`c9bf2bdb` で対応済み。

**v2.2 向けのコントラクト変更案。**

ランタイムはヘルパーを提供すべきである（SHOULD）:

```js
NAC.bindAction(el, handler, { plugin, action_id })
```

このヘルパーは ack の emit を自動的に処理する。`addEventListener('click', handler)` と同じインターフェースだが、適合コントラクトが組み込まれている。このヘルパーを採用したデモは ack を忘れることがない。

`validate_global` に新しい検出項目を追加する:

- `action_handler_without_ack` -- インストルメンテーションによる検出: `validate_global` 実行中に、バリデータが制御されたコンテキスト下で各 `data-nac-role="action"` 要素に対して合成クリックをディスパッチし、500ms 間 `nac:action:succeeded` を待ち受け、発火しないものをフラグする。

合成クリックには副作用があるため、この検出項目はオプトイン（`NAC.validate_global({ probe: true })`）とする。

**工数。** ヘルパーに約 3 時間 + プローブベースの検出項目に約 4 時間。

---

## V22-03 -- ロケール切り替え検出のハード化

**問題のクラス。** チャットクライアントの言語検出器における 2 文字のロケールコード（`'de'`、`'es'`、`'en'`）が、複数の言語の前置詞や冠詞と衝突する。`cambia DE pestana` がチャットをドイツ語に切り替えてしまっていた。

**修正はすでにリリース済み。** `nac-chat-client.js` の `_detectLangSwitch` は、2 文字の単独コードに対して明示的な `LOCALE_TRIGGER`（`idioma`/`language`/`sprache`/...）との共存を必須とするようになった。`f631d77a` で対応済み。

**v2.2 向けの提案。** ロケール検出器をチャットクライアントから NAC3 プリミティブに移動し、すべてのブラウンフィールドのチャット埋め込みが同じハード化された検出器を使用できるようにする。将来の実装がバグを再導入しないよう、偽陽性のクラスをスペックに明示的に文書化する。

**工数。** 約 2 時間。

---

## V22-04 -- `tab_by_label` の自然言語許容度

**すでに対応済み。** 括弧の除去（`"Lines (collection)"` が `"Lines"` および `"Lines tab"` にマッチする）は `f631d77a` でリリースされた。これはレガシーのフォールバックでは**なく**、LLM が引用したボタンテキストの正当な正規化である。スペックにおける正規のマッチャー動作として文書化する。

**工数。** 約 1 時間（ドキュメントのみ）。

---

## v2.2 のスコープ外（v2.3 以降に延期）

- コンポーザブルなロールの階層（`role:'tab.primary'` vs `role:'tab.secondary'`）: あると便利だが具体的なトリガーなし。
- マニフェストのホットリロード: まだ稀なケース。現在のページリロードで十分。
- 全 10 ロケールにわたるマルチロケールラベルの同時検索（現在のマッチャーはシリアルに反復するが、プラグインあたり約 20 タブ程度であれば問題ない）。

---

## V23-01 -- フィールドエディタプリミティブ（プレビューリリース済み）

**問題のクラス。** ボイスランナーやエージェントには、`<input>` や `<textarea>` 内のテキストを細かく操作する汎用的な手段がない。利用できるのは `NAC.fill(id, value)` のみで、これはすべての内容を置き換えてしまう。実際のタスク（段落内の文法修正、選択範囲のみの置換、AI による文章改善）にはより細粒度の動詞が必要だ。現在は、この機能が必要な採用者がそれぞれ独自に実装している。

**解決策。** 新しいランタイムプリミティブ `NAC.edit_field(nac_id)` は、編集サーフェスを所有するモーダルを開き、8 つの正規動詞を持つ独自プラグイン `nac_editor` を登録する:

| 動詞 | 説明 |
|------|-------------|
| `select_word` | キャレット位置の単語を選択する |
| `select_sentence` | キャレット位置の文を選択する |
| `select_all` | すべてのテキストを選択する |
| `replace` | 選択範囲を指定したテキストで置換する |
| `delete_selection` | 現在の選択範囲を削除する |
| `ai_correct_syntax` | 現在の値をチャットバックエンドに POST し、AI が修正したバージョンで置換する |
| `save` | ソースフィールドに書き戻し、モーダルを閉じる |
| `cancel` | 変更を破棄し、モーダルを閉じる |

モーダルのマニフェストはべき等に登録される（複数の `edit_field` 呼び出しは 1 つの `nac_editor` プラグインを共有する）。すべての動詞は全 10 ロケールの `label_i18n` を持つ。

**ステータス:**
- ランタイム: 2026-05-10 に `js/nac.js` へ SHIPPED（関数 `edit_field` + `_editorRegisterManifest` + ack を emit するモーダルハンドラ）。
- デモ: 2026-05-11 に `example-v23-editor.php` へ SHIPPED（3 つの編集可能フィールド + `nac:action:succeeded` に接続されたライブ動詞カウンター）。
- テスト: 2026-05-11 に `packages/nac/test/v23-editor.mjs` へ SHIPPED（8/8 PASS）: 存在確認 + 無効な id で例外 + 無効なロールで例外 + モーダルのマウント + プラグインの登録 + べき等性 + キャンセルで閉じる + 保存で閉じる。
- スペック: v2.3 GA サイクルの一環として SPEC.md セクション 13 に追加予定。

**GA までの工数。** すでに実装済みの内容を超えるもの: ja/zh/ar/hi のネイティブロケールラベルレビュー（約 2 時間）、Playwright e2e ビジュアルスペック（約 3 時間）、SPEC.md のスペックテキスト（約 2 時間）。

---

## このドキュメントからスペックへの移行手順

1. フィーチャーフラグの後ろでランタイム変更を実装・リリースする。
2. 新しい厳格なバリデーションをパスするようにデモを更新する。
3. フラグのデフォルトを `warn`（非スロー）にした状態で、少なくとも 1 リリースサイクル本番環境でソークする。
4. ルールを `docs/spec.md` に移動し、次のマイナーバージョンでデフォルトを `error`（スロー）に引き上げる。
5. このロードマップからエントリを削除し、`docs/CHANGELOG.md` に 1 行のエントリを追加する。

---

*This is a machine translation of the canonical English
version at `/nac-spec/docs/NAC_V22_ROADMAP.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
