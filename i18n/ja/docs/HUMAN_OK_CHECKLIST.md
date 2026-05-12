---
translation_source: docs/HUMAN_OK_CHECKLIST.md
translation_source_hash: 2b87f1b0665762daf6be1ad520c7ba16f977d21771e6574ae60451039baada31
translation_quality: machine_v1
translation_lang: ja
translation_date: 2026-05-11T15:04:17.711340+00:00
---

# NAC3 -- Human OK チェックリスト

**仕様バージョン:** 2.2 + v2.3 プレビュー。
**最終確認日:** 2026-05-11（リリースごとに更新）。
**目的:** [TEST_COVERAGE_MATRIX.md](TEST_COVERAGE_MATRIX.md) の MAN 列を実行可能な形式にしたもの。担当者が以下の全項目を確認し、チェックを入れる。いずれかの項目が失敗した場合、リリースは **出荷しない** -- バグを起票し、修正後に再試行すること。

これは自動テストの代替ではない。自動テストスイート（`bash tools/nac/test-launch.sh`）が **グリーン** であることを確認してからこのチェックリストを開始すること。このチェックリストは、自動化では確認できない事項のために存在する: 実際の音声、クロスブラウザの操作感、ネイティブスピーカーによる文言確認、ライブピアとのクロスオリジンハンドシェイク、ビジュアルの品質。

---

## このドキュメントの使い方

1. 新しいシークレットウィンドウを開く（Chrome → Firefox → Safari の順に、ビジュアル確認セクションは各ブラウザで繰り返す）。
2. セクションを順番に進める -- 前のセクションが完了していることを前提とするセクションがある（例: インターオペラビリティの確認には両方のデモがロード済みである必要がある）。
3. 自分自身で確認した場合のみ `[ ]` にチェックを入れる。他者に委任しない。不明な場合は `[?]` とマークし、仕様リードに確認する。
4. 最後に SIGN-OFF ブロックに署名と日付を記入する。
5. 新しい実行日付スタンプを付けてファイルをコミットする。

1回あたりの所要時間の目安: **45〜60分**。急がないこと。このゲートの目的は、自動化が見逃す部分を確認することにある。

---

## 1. ランタイム成果物

### 1.1 クロスブラウザ スモークテスト -- `js/nac.js` + `nac-v2-extensions.js`

各ブラウザ（Chrome、Firefox、Safari）で実施:

- [ ] シークレットモードで `https://yujin.app/nac-spec/example.php` を開く。
- [ ] 5秒後にコンソールにエラーがゼロであること。
- [ ] コンソールで `NAC.describe().plugins[0]` がオブジェクトを返すこと。
- [ ] `NAC.list_registered_plugins()` が少なくとも1つのスラッグを返すこと。
- [ ] `data-nac-role="action"` が付いたボタンを1つクリック -- 動作すること、かつ `nac:action:succeeded` イベントが発火すること（コンソールで `document.addEventListener` を使って確認）。

### 1.2 ライブチャットクライアント -- `nac-chat-client.js`

- [ ] `example-v21-data-table.php` でマイクボタンを押す。
- [ ] "ve a permisos" と発話 -- チャットがフリーテキスト返答ではなくタブ切り替えをディスパッチすること。
- [ ] 英語（"go to permissions"）とポルトガル語（"vai para permissoes"）でも繰り返す -- 正しくディスパッチされること。
- [ ] "cambia de pestaña" と発話 -- ロケールがドイツ語に切り替わらないこと（V22-03 のリグレッションガード）。

### 1.3 インターオペラビリティ ランタイム -- `nac-mcp-interop.js`

- [ ] `example-v22-interop.php` を開く。
- [ ] 4つの CTA を順番に使用: Export tree → Import remote → List remote apps → Disconnect remote。
- [ ] 各 CTA が出力パネルに成功ログを記録すること。
- [ ] Disconnect 後、リモートアプリが `NAC.list_remote_apps()` に表示されなくなること。

---

## 2. NPM パッケージ

### 2.1 クリーンインストール スモークテスト

- [ ] スクラッチディレクトリで実行:
      ```
      mkdir /tmp/nac-smoke && cd /tmp/nac-smoke
      npm init -y
      npm install @nac3/runtime
      node -e "import('@nac3/runtime').then(m => console.log(Object.keys(m)))"
      ```
- [ ] 出力に `NAC`、`registerPlugin`、バリデーターが含まれること。
- [ ] インストール中に非推奨警告が表示されないこと。

### 2.2 外部プロジェクトに対する CLI バリデーター

- [ ] Yujin 以外のプロジェクト（採用デモまたは任意のフォルダ）を選択する。
- [ ] そのルートから `npx @nac3/runtime validate .` を実行する。
- [ ] 出力が人間が読める形式であること、BLOCKER が 0 件であること、クリーンな場合は終了コード 0 / 問題がある場合は非ゼロで終了すること。

---

## 3. デモ

### 3.1 ランディングページ -- `index.html`

- [ ] ページが sumi-e ブランディングで FOUC なしにレンダリングされること。
- [ ] "Autopilot" をクリック -- 5秒間のツアーが実行され、ナレーションが聞こえること（TTS、無音でないこと）。
- [ ] チャットを開き "que es NAC3?" と入力 -- エラーではなく、意味のある応答が返ること。

### 3.2 リファレンスデモ -- `example.php`

- [ ] ページ上に表示されている 27 個のウィジェット全てを操作する。
- [ ] 全操作後にコンソールエラーがゼロであること。
- [ ] 反応しないウィジェットがゼロであること（クリックしても何も起きないものがないこと）。

### 3.3 ブラウンフィールドデモ -- `example-v20-full.php`

- [ ] ページロード後に `v20-panel` が右上に表示されること。
- [ ] "describe_v2" をクリック -- パネルに有効な JSON 出力が表示されること。
- [ ] "validate_global_v2" をクリック -- パネルに検出結果（または "0 findings, OK"）が表示されること。
- [ ] v20-panel 内の 6 つのボタンを全てクリック -- 全て `nac:action:succeeded` を発火すること（リスナーを設定している場合はコンソールで確認）。
- [ ] istrusted_fake ボタン -- ack が **発火しない**こと（ランタイムが isTrusted ゲート付き動詞に対して合成クリックを正しく拒否すること）。
- [ ] istrusted_real ボタン（実際の人間によるクリック）-- ack が **発火する**こと。

### 3.4 プリミティブ ショーケース -- `example-v20-primitives-showcase.php`

- [ ] 8 つのプリミティブそれぞれが、動作するサンプルを含むセクションをレンダリングすること。
- [ ] 各セクションの解説テキストが正しく表示されること（文字化けやプレースホルダーが残っていないこと）。

### 3.5 データテーブルデモ -- `example-v21-data-table.php`

- [ ] マイクを押し "agrega una linea con concepto leche cantidad 2 precio 100" と発話 -- コレクションテーブルに行が追加されること。
- [ ] "cuanto total hay?" と発話 -- チャットが生のテーブルではなく数値で返答すること。
- [ ] "ve a permisos" と発話 -- タブが切り替わること。

### 3.6 インターオペラビリティデモ -- `example-v22-interop.php`

- [ ] 上記 1.3 で既に確認済み。
- [ ] ボーナス: 2つのブラウザタブでページを開き、ハンドシェイクを繰り返す -- タブをまたいでも動作すること（各タブは独立した NAC インスタンスであり、インターオペラビリティレイヤーがブリッジとなる）。

### 3.7 React ケーススタディ -- `demos/react/`

- [ ] `https://yujin.app/nac-spec/demos/react/` を開く。
- [ ] テキストボックスに "leche" と入力し "Add" をクリック -- todo が表示されること。
- [ ] チャットを開き、マイクで "agrega pan" と発話 -- チャット経由のパスで todo "pan" が追加されること。これはケーススタディ バグ #2 のリグレッションガードである。
- [ ] "borra leche" と発話 -- todo "leche" が消えること。

### 3.8 Angular ケーススタディ -- `demos/angular/`

- [ ] React と同じ 4 項目を `/nac-spec/demos/angular/` で確認する。

---

## 4. ドキュメント

以下の各ドキュメントについて、四半期リリースごとに少なくとも1回は通読すること。確認事項:

- バージョンスタンプが最新（v2.2）であること。
- 内部リンクが壊れていないこと。
- 未解決の TODO が残っていないこと。
- コードスニペットが記載通りにコンパイル / 実行できること。

- [ ] `SPEC.md`（正規コントラクト）。
- [ ] `ABOUT.md`。
- [ ] `CONTRIBUTING.md`。
- [ ] `SECURITY.md` -- 加えて四半期ごとの脅威モデルの再読。
- [ ] `README_DEMOS.md`。
- [ ] `docs/NAC_V22_ROADMAP.md`。
- [ ] `docs/NAC_TEST_MANUAL.md`。
- [ ] `docs/NAC_INTEROP_MCP.md`。
- [ ] `docs/NAC_LAUNCH_DIFFUSION.md`。
- [ ] `docs/CASE_STUDIES_DISCOVERY.md`。
- [ ] `docs/TEST_COVERAGE_MATRIX.md`（このマトリクスの兄弟ドキュメント）。
- [ ] `docs/VOICE_CHAT_ERROR_ANALYSIS_2026_05_09.md`。

## 5. 導入ガイド

各ガイドについて、hello-world スニペットが引き続きコンパイルできること、および手順に従えば初めての読者でも動作するインストールが完了できることを確認する:

- [ ] `guides/REACT.md` -- Vite + React 18 でスニペットがコンパイルできること。
- [ ] `guides/ANGULAR.md` -- Angular 17 スタンドアロンでスニペットがコンパイルできること。
- [ ] `guides/LLM_WIRING.md` -- Node リファレンスバックエンドが起動し、サンプルのコントラクトテストが通ること。
- [ ] `guides/AI_PLAYBOOK_NEW_PROJECT.md` -- ステップのアサーションが現在のランタイム API と一致していること。
- [ ] `guides/AI_PLAYBOOK_MIGRATION.md` -- 同上。
- [ ] `guides/IMPACT_TESTING.md` -- 数値を最新状態に再確認すること（四半期ごとに再チェック）。
- [ ] `guides/IMPACT_RPA.md` -- 同上。
- [ ] `guides/RPA_UIPATH.md` -- `InvoiceFromCSV.xaml` サンプルを一度実行すること（または最新の UiPath Studio における相当のサンプル）。
- [ ] `guides/RPA_AUTOMATION_ANYWHERE.md` -- 相当するサンプルワークフローを実行すること。
- [ ] `guides/RPA_BLUE_PRISM.md` -- 相当するサンプルオブジェクトスタディを実行すること。

---

## 6. テストスイート

- [ ] `bash tools/nac/test-launch.sh` を実行 -- 15 秒以内に全件 GREEN であること。
- [ ] スモークカウンター（`36 PASS`）を確認 -- 期待する合計数と一致していること。
- [ ] `packages/nac/test/fixtures/voice/` を開き、ロケールごとに 1 ファイル（計 10 ファイル）を選択してオーディオプレイヤーで再生 -- 音声が聞こえ、かつ聞き取れること。
- [ ] `stage3-backend.mjs` からランダムに 2 件の LLM プロンプトをスポットチェック -- レスポンスが妥当であり、ドリフトがないこと。
- [ ] `--headed` オプション付きで Playwright スイートを一度実行（`npx playwright test --headed`）-- 実行中に各スペックの UI を目視確認すること。
- [ ] `bash tools/nac/discovery-loop.sh 1` を実行 -- 1 ラウンドが 0 件の検出で完了すること。

---

## 7. スタディケースパッケージ

- [ ] `packages/nac-react-demo/` がクリーンにビルドできること（`npm run build`）。
- [ ] デプロイ済みの React dist がローカルビルドと同一の動作をすること。
- [ ] `packages/nac-angular-demo/` がクリーンにビルドできること。
- [ ] デプロイ済みの Angular dist が同一の動作をすること。

---

## 8. 横断的確認事項

### 8.1 i18n

- [ ] ロケールを 1 つ選択（リリースごとにローテーション）-- ネイティブスピーカーにランダムな 10 文字列のスポットチェックを依頼すること。
- [ ] バリデーターが全 10 ロケールにわたってキーの欠落が 0 件であることを確認すること（`NAC.validate_global({locale: 'all'})`）。

### 8.2 HMAC + プロベナンス

- [ ] ステージングテナントに対してマルチテナントスモークを実行 -- マニフェスト署名が検証され、ログに `provenance_mismatch` エラーが出ないこと。

### 8.3 isTrusted ゲーティング

- [ ] `example-v20-full.php` において、istrusted_real と istrusted_fake の並列テスト（上記 3.3 で対象）がビジュアル差分で PASS すること: real は ack を発火し、fake は発火しないこと。

### 8.4 クロスオリジン相互運用（v2.3 プレビュー）

- [ ] v2.3 を GA 宣言する前に、クロスオリジンテストを少なくとも 1 件実施すること: 異なるオリジンにホストされたリモートの NAC3 ピアに対して相互運用デモを開き、実際の Bearer トークンと実際の CORS プリフライトを使用してラウンドトリップが成功すること。

### 8.5 デプロイメント

- [ ] リリースプッシュ後、以下の URL に curl し、200 と正しいコンテンツが返ることを確認すること:
      - `https://yujin.app/nac-spec/index.html`
      - `https://yujin.app/nac-spec/SPEC.md`
      - `https://yujin.app/nac-spec/js/nac.js`
      - `https://yujin.app/nac-spec/js/nac-chat-client.js`
      - `https://yujin.app/nac-spec/example.php`
      - `https://yujin.app/nac-spec/example-v21-data-table.php`
      - `https://yujin.app/nac-spec/example-v22-interop.php`
      - `https://yujin.app/nac-spec/demos/react/`
      - `https://yujin.app/nac-spec/demos/angular/`

### 8.6 実音声

- [ ] 実機ハードウェア（ノート PC のマイク＋スピーカー）を使用 -- ライブの `example-v21-data-table.php` でマイクボタンを押し、ロケールごとに 1 プロンプトを発話（計 10 プロンプト）-- 全ロケールで LLM のディスパッチが妥当であること。

---

## 9. スクリーンリーダーパス（アクセシビリティ -- Track G7）

このセクションでは、スクリーンリーダーを使用し、モニターをオフにした状態（または文字通り目を閉じた状態）でデモを操作する。これは [ACCESSIBILITY.md](ACCESSIBILITY.md) におけるアクセシビリティコミットメントのゲートである。

このセクションはリリースごとに少なくとも **2 種類**のスクリーンリーダーで実施すること（Windows では NVDA が最も手軽; macOS には VoiceOver がプリインストール済み; ライセンスがあれば JAWS も使用）。

### 9.1 NVDA（Windows）

- [ ] NVDA をインストールする（無料、nvaccess.org）。Ctrl+Alt+N で起動する。
- [ ] モニターをオフにした状態（または目を閉じた状態）で `https://yujin.app/nac-spec/index.html` を開く。
- [ ] H キーでナビゲートしたとき、NVDA がページタイトルと見出しの構造的なアウトライン（h1、h2、h3）を読み上げること。
- [ ] Tab キーで全インタラクティブコントロールに論理的な順序で到達でき、各コントロールがロールとラベルを明確に読み上げること。
- [ ] チャットパネルを開く（NVDA がチャット入力欄のロールが role=textbox であり、明確なラベルがあることを読み上げること）。
- [ ] "que es NAC3?" と入力して送信 -- レスポンスが届いたとき NVDA が全文を読み上げること。

### 9.2 NVDA での `example-v21-data-table.php`

- [ ] Tab ナビゲーションで NVDA が "Lines (collection) tab" と Permissions タブを読み上げること。
- [ ] タブをアクティブにすると、`nac:tab:activated` イベントの ack を通じて新しい状態が読み上げられること。
- [ ] LLM が行を追加したとき、NVDA が新しい行の内容を自動で（または Down キー 1 回で）読み上げること。

### 9.3 VoiceOver（macOS）

- [ ] Cmd+F5 で VoiceOver を起動する。
- [ ] `https://yujin.app/nac-spec/index.html` を開く。
- [ ] VO+U でローターを開き、見出し・リンク・フォームコントロールが表示されていることを確認する。
- [ ] VO+A でページ全体を上から下まで読み上げる -- "div div div link link button" ではなく、意味的に理解できる内容であること。

### 9.4 React + Angular スタディケースでの VoiceOver

- [ ] `demos/react/` にて: キーボードと VoiceOver のみを使用して入力フィールドから todo を追加する。追加時に新しい todo が読み上げられること（ack イベントが接続されていること）。
- [ ] `demos/angular/` にて: 同じテスト、同じ期待値。

### 9.5 キーボードのみのナビゲーション（スクリーンリーダーなし、マウスなし）

- [ ] マウスを切断または無効化する。
- [ ] Tab キーのみでランディングページを操作する。すべてのフォーカス停止箇所が視覚的に確認できること（フォーカスリングが表示されること）。
- [ ] キーボードでチャットパネルを開き、プロンプトを入力して送信する。結果が正しく表示・読み上げられること。
- [ ] Escape キーで開いているモーダルが閉じること。
- [ ] キーボードトラップがないこと（Tab で最終的にページ先頭に戻ってくること）。

### 9.6 ハイコントラスト + 200% ズーム

- [ ] ランディングページをブラウザで 200% にズームする。レイアウトが崩れないこと、横スクロールが発生しないこと、テキストが重ならないこと。
- [ ] Windows ハイコントラストモード（または macOS のコントラストを上げる設定）を使用する。ボタン・リンク・フォーカスリングが引き続き視認できること。

### 9.7 音声コントロール（再帰的なケース）

- [ ] Pilot 対応ブラウザ（またはリファレンスの `nac-chat-client.js` マイクボタンを使用）で、音声のみでデモを操作する。
- [ ] マイクボタンが NVDA/VoiceOver に状態を読み上げること（"recording started"、"recording stopped"）。
- [ ] NAC3 経由でディスパッチされた音声コマンドが有効になり、ack がスクリーンリーダーに読み上げられること。

### 9.8 発見されたアクセシビリティ上の問題

このセクションで発見された問題を重大度とともに以下に列挙すること:

```
-
-
-
```

BLOCKER 重大度の問題が未解決の場合、解決するまでリリースを出荷しないこと。

---

## SIGN-OFF

```
Release tag:    v____._.___
Walked by:      ______________________
Walked on:      ____-____-____
Browsers used:  [ ] Chrome  [ ] Firefox  [ ] Safari
Native speakers consulted (locale -> name):
   ____________________________________________
Total items walked:  ___ / ___
Failed items (list with bug links):
   ____________________________________________
   ____________________________________________
Signature:      ______________________
```

SIGN-OFF ブロックを記入した状態でこのファイルをコミットし、リリースを「human OK」としてマークすること。

---

## 参照

- [TEST_COVERAGE_MATRIX.md](TEST_COVERAGE_MATRIX.md) -- このチェックリストの元となるマトリクス。
- [NAC_TEST_MANUAL.md](NAC_TEST_MANUAL.md) -- 導入者向けのアップストリームプレイブック。
- [COVERAGE_REPORT_2026_05_10.md](COVERAGE_REPORT_2026_05_10.md) -- 現在のリリースの自動カバレッジ記録。

## ライセンス

Apache-2.0.

---

*This is a machine translation of the canonical English
version at `/nac-spec/docs/HUMAN_OK_CHECKLIST.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
