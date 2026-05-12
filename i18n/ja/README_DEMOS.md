---
translation_source: README_DEMOS.md
translation_source_hash: 0f488dd749283f4f2e03f0e431de47d7007818c6745ce1ce993014bdf9839480
translation_quality: machine_v1
translation_lang: ja
translation_date: 2026-05-11T13:05:19.143922+00:00
---

# yujin.app/nac-spec/ のNAC3ライブデモ

**スペックバージョン:** 2.2 stable（+ v2.3 相互運用プレビュー）

**NAC3** = **Native Agent Contract**。アプリごとのグルーコードなしに、AIアシスタント・音声ランナー・アクセシビリティツールからWeb UIを操作できるようにするスペック。

3つのデモが並んで公開されています。それぞれ目的が異なるため、混同しないでください。

| ファイル | バージョン | 目的 |
|---|---|---|
| `example.php` | v1.9 stable | NAC3 v1.9の正規デモ。27種類のウィジェット（チャット、カレンダー、オートパイロット、モーダル、タブ、チャートなど）を収録。v1.9の全機能を本番に近いUIで示す。**変更なし。** |
| `example-v20-primitives-showcase.php` | v2.0-rc4 | v2.0の8つのプリミティブ・HMAC・isTrusted・i18nコントラクトを**教材として紹介**するショーケース。プリミティブごとに1セクション、計8セクション構成。各プリミティブを個別に理解したいレビュアーや採用検討者に有用。**example.phpの移行版ではない。** |
| `example-v20-full.php` | v2.0-rc4 | `example.php`をNAC3 v2.0 strictへ**ブラウンフィールド移行**したもの。同じ27ウィジェット、同じHTML、同じハンドラーに、約80行のセットアップコードでv2.0レイヤーを追加適用。実際の採用においてウィジェットを全て書き直す必要がないことを示す。 |

## 並べて比較する

`example.php` と `example-v20-full.php` を2つのタブで開いてください。

### 同一の部分

- HTMLマークアップ（すべての `<article data-nac-plugin="X">`、すべての `data-nac-id`、すべてのi18nカタログ参照、すべてのハンドラー）
- 見た目（同じレイアウト、同じウィジェット、同じインタラクション）
- v1.9リファレンスランタイム（`js/nac.js`）の読み込み方法
- 既存の `data-i18n-key` カタログ参照

### v2.0-full版で異なる部分

1. **ヘッダーのdocstring**：ブラウンフィールド移行ショーケースであることを明示。
2. **スクリプトタグの追加**：`js/nac-v2-extensions.js` を `nac.js` の後、`example.js` の前に読み込む。
3. **セットアップブロックの追加**（ページ末尾の約80行）：
   - 既存の `data-nac-plugin` 属性から階層スコープツリーを構築（各プラグインが `demo.shell` 配下のスコープになる）。
   - `NAC.set_provenance_secret()` を呼び出してHMAC署名を有効化。
   - `NAC.setTenantPrefix('demo')` を呼び出してマルチテナントをデモ。
   - トースト用に `NAC.captureEphemeral()` リングバッファを開始。
   - カードコンテナに対して `NAC.autoRegister.watch()` を呼び出す。
4. **UIパネルの追加**（`#v20-panel`、右下に固定）：`describe_v2()`・`validate_global_v2()`・HMAC署名デモ・isTrusted識別ボタンをリアルタイムで公開。

変更点はこれだけです。実際の採用者はこのパターンをそのまま再利用できます。

## 評価方法

NAC3 v2.0のピアレビュアーの場合：

1. まず `example.php` を開き、v1.9デモが従来通り動作することを確認する。
2. `example-v20-full.php` を開き、v1.9の機能（チャット、カレンダー、オートパイロットなど）が**まったく同じように**動作することを確認する。
3. v2.0パネル（右下隅）を開き、各ボタンをクリックする：
   - `describe_v2()` ── ブラウンフィールドのプラグイン属性から構築されたスコープツリーを確認。
   - `validate_global_v2()` ── 検出結果を確認（i18nカタログに抜けがある場合は警告のみが表示される可能性が高い）。
   - `sign as agent` ── 生成されたHMAC署名を確認。
   - `click=trusted` / `.click()=fake` ── isTrusted識別の動作を確認。

採用検討者の場合：

`example-v20-full.php` のセットアップブロックをテンプレートとして使用してください。スコープツリーをご自身のアプリのプラグイン構造に合わせて調整してください。作業の大半はスコープ階層の特定であり、残りは機械的な作業です。

## 関連リンク

- NAC3 spec: https://github.com/pkuschnirof/nac-spec
- v1.9リリース: タグ `v1.9.0`
- v2.0リリース候補: `main` ブランチの `2.0.0-rc4`
- ラウンド3ピアレビュー記録: `docs/PEER_REVIEW.md`

---

*This is a machine translation of the canonical English
version at `/nac-spec/README_DEMOS.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
