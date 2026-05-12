---
translation_source: docs/TEST_COVERAGE_MATRIX.md
translation_source_hash: 378d7bf89e65b07e54f5d5dc1c62938accfe383e903468a4df028a3e2936f48d
translation_quality: machine_v1
translation_lang: ja
translation_date: 2026-05-11T15:02:34.783823+00:00
---

# NAC3 -- テストカバレッジマトリクス（自動 + 手動）

**仕様バージョン:** 2.2 + v2.3 プレビュー。
**生成日:** 2026-05-11。
**対象リポジトリ:** Yujin リファレンスリポジトリ
`pkuschnirof/rpaforce-crm` の `main` ブランチ。

このマトリクスは NAC3 エコシステムのすべての成果物を列挙し、
自動テストおよび手動検証ゲート（「Human OK」チェックリスト）によるカバレッジを報告します。

採用者へ: このマトリクス構造を自分のアプリ用にコピーしてください。列を自分の成果物に置き換え、行の深さは同じに保ってください。

---

## 凡例

| シンボル | 意味 |
|--------|---------|
| AUTO | 自動テストでカバー済み（Playwright / Node サイドスイート） |
| MAN  | 手動検証が必要（ブラウザ目視、音声ジェスチャー、主観的 UX） |
| BOTH | 不変条件は自動カバー + UX は人間が検証 |
| --   | カバレッジなし（意図的） |
| TBD  | カバレッジ予定だが未実装 |

---

## 1. ランタイム成果物

| 成果物 | 自動カバレッジ | 手動ゲート | 備考 |
|----------|---------------|-------------|-------|
| `js/nac.js`（v1.9 ベース + v2.0 + v2.1） | AUTO 95% | MAN（クロスブラウザスモーク） | smoke + v22 + stage4 が write API をカバー；手動 = リリースごとに最低 Firefox + Safari で開いて確認 |
| `js/nac-v2-extensions.js` | AUTO 90% | MAN（新規 DOM での autoRegister.watch） | stage4 dt_* + v22 一部；手動 = autoRegister 経由でランタイムに新しいプラグインをマウント |
| `js/nac-chat-client.js` | AUTO 95% | MAN（実マイクによる STT） | stage1-audio が SpeechRecognition をモック；手動 = ライブデモでマイクを押してロケールごとに 1 プロンプト発話 |
| `js/nac-mcp-interop.js`（v2.3 プレビュー） | AUTO 100% | MAN（クロスオリジンピアのラウンドトリップ） | v23-interop がローカルページシナリオをカバー；手動 = HTTPS 経由で実際のリモート NAC3 ピアに対してテスト |

## 2. NPM パッケージ

| 成果物 | 自動カバレッジ | 手動ゲート | 備考 |
|----------|---------------|-------------|-------|
| `@nac3/runtime` ビルド（dist/ ESM + CJS + d.ts + CLI） | AUTO 100% | MAN（新規ディレクトリへの `npm install`） | smoke.mjs 36 チェック；手動 = npm pack + install + 空の Node プロジェクトで import して確認 |
| `@nac3/runtime/extensions` サブパス | AUTO 100% | -- | smoke がファイル + d.ts の存在を確認 |
| `@nac3/runtime/chat-client` サブパス | AUTO 100% | -- | smoke がファイル + d.ts の存在を確認 |
| CLI `npx @nac3/runtime validate` | AUTO 100% | MAN（チームが外部で構築したプロジェクトに対して実行） | smoke が demos ディレクトリに対して CLI を実行；手動 = 顧客のリポジトリに対してリリース前に実行 |

## 3. デモ（yujin.app/nac-spec/ でライブ公開）

| デモ | 自動カバレッジ | 手動ゲート | 備考 |
|------|---------------|-------------|-------|
| `index.html`（ランディング） | BOTH | MAN（オートパイロットツアー + チャット送信） | Playwright 01-landing.spec.ts が表面を検証；手動 = 実ブラウザでオートパイロットを実行し、ナレーションが聞こえることを確認 |
| `example.php`（v1.9 リファレンス） | AUTO | MAN（27 ウィジェットのクリックスルー） | Playwright 02-demo-v19 が起動チェック；手動 = 27 ウィジェットをすべて操作し、コンソールエラーがないことを確認 |
| `example-v20-full.php`（ブラウンフィールド） | AUTO | MAN（v20 パネルの describe_v2 / validate_global_v2 ボタン） | Playwright 03-demo-v20 がパネル + bindAction ack をカバー；手動 = 各パネルボタンをクリックして出力を確認 |
| `example-v20-primitives-showcase.php` | -- | MAN（プリミティブごとの教育的ウォーク） | 純粋な教育用デモ；手動 = 8 プリミティブツアー |
| `example-v21-data-table.php` | AUTO | MAN（マイクを使った音声チャット） | Playwright 04-demo-v21 が dt_state + tab.permissions をカバー；手動 = 音声マイクを使用し、LLM が正しくディスパッチすることを確認 |
| `example-v22-interop.php`（v2.3 プレビュー） | AUTO | MAN（4 つの CTA を順番に使用） | Playwright 05-demo-v22-interop がエンドツーエンドをカバー；手動 = 画面を目視しながら 4 ボタンフローを実行 |
| `demos/react/`（コンパイル済みスタディケース） | AUTO | MAN（チャット駆動の追加/削除） | Playwright 06-demo-react がマウント + 追加をカバー；手動 = 実マイクで「agrega leche」とチャット送信し、React の状態更新を確認 |
| `demos/angular/`（コンパイル済みスタディケース） | AUTO | MAN（チャット駆動の追加/削除） | Playwright 07-demo-angular がマウント + 追加をカバー；手動 = React と同様 |

## 4. ドキュメント

| ドキュメント | 自動カバレッジ | 手動ゲート | 備考 |
|-----|---------------|-------------|-------|
| `SPEC.md`（v2.2 正規版） | -- | MAN（メンテナーによる PR レビュー） | 仕様は散文；自動テスト不可。人間がすべての文言をレビュー |
| `ABOUT.md` | -- | MAN（PR レビュー） | 同上 |
| `CONTRIBUTING.md` | -- | MAN（PR レビュー） | 同上 |
| `SECURITY.md` | -- | MAN（PR レビュー） | 同上。加えて四半期ごとの脅威モデル再読 |
| `README_DEMOS.md` | -- | MAN | 手動リンクチェック |
| `docs/NAC_V22_ROADMAP.md` | -- | MAN | リリースごとに更新・レビュー |
| `docs/NAC_TEST_MANUAL.md` | AUTO（リンク） | MAN（PR レビュー） | test-launch.sh レイヤー 3 が 11 ドキュメントすべての存在を確認；手動 = 正確性を確認するために通読 |
| `docs/COVERAGE_REPORT_2026_05_10.md` | -- | MAN（リリースごとに再生成） | これ自体がカバレッジ記録；人間がリリースごとに作成 |
| `docs/NAC_INTEROP_MCP.md` | -- | MAN | 仕様提案、人間がレビュー |
| `docs/NAC_LAUNCH_DIFFUSION.md` | -- | MAN | 内部プレイブック |
| `docs/CASE_STUDIES_DISCOVERY.md` | -- | MAN | バグポストモーテム；人間がキュレーション |
| `docs/LAUNCH_PLAN_2026_05_10.md` | -- | MAN（履歴） | 履歴記録 |
| `docs/TEST_COVERAGE_MATRIX.md`（本ファイル） | AUTO（リンク） | MAN | リリースごとに更新 |
| `docs/VOICE_CHAT_ERROR_ANALYSIS_2026_05_09.md` | -- | MAN | 履歴バグ分析 |
| `docs/HUMAN_OK_CHECKLIST.md` | -- | MAN（Pablo が実施） | チェックリスト本体；Pablo が実行 |

## 5. 採用ガイド

| ガイド | 自動カバレッジ | 手動ゲート | 備考 |
|-------|---------------|-------------|-------|
| `guides/REACT.md` | -- | MAN（PR レビュー + 採用者フィードバック） | Hello-world スニペットが引き続きコンパイルできること；手動 = 年次リビルドチェック |
| `guides/ANGULAR.md` | -- | MAN（PR レビュー） | 同上 |
| `guides/LLM_WIRING.md` | -- | MAN（PR レビュー） | リファレンス Node バックエンドが動作すること；手動 = ライブ仕様に対して実行 |
| `guides/AI_PLAYBOOK_NEW_PROJECT.md` | -- | MAN（PR レビュー） | ステップのアサーションが引き続き実行可能であること |
| `guides/AI_PLAYBOOK_MIGRATION.md` | -- | MAN（PR レビュー） | 同上 |
| `guides/IMPACT_TESTING.md` | -- | MAN（PR レビュー） | インパクトの主張；四半期ごとに数値を更新 |
| `guides/IMPACT_RPA.md` | -- | MAN（PR レビュー） | 同上 |
| `guides/RPA_UIPATH.md` | -- | MAN（リリースごとにサンプルワークフローを 1 回実行） | 手動 = InvoiceFromCSV.xaml を実行 |
| `guides/RPA_AUTOMATION_ANYWHERE.md` | -- | MAN | 同様の形式 |
| `guides/RPA_BLUE_PRISM.md` | -- | MAN | 同様の形式 |
| `guides/RPA_PLAYWRIGHT.md` | AUTO（リファレンススイート） | MAN（PR レビュー） | パターンは `tests/e2e-nac/specs/` で実行済み；手動 = リリースごとに 1 回通読 |

## 6. テストスイート

| スイート | 自動カバレッジ | 手動ゲート | 備考 |
|-------|---------------|-------------|-------|
| `packages/nac/test/smoke.mjs` | AUTO（自己） | MAN（合格率の確認） | 36 チェック；手動 = リリースごとにカウントを確認 |
| `packages/nac/test/v22.mjs` | AUTO（自己） | -- | 14 ユニットテスト |
| `packages/nac/test/v23-interop.mjs` | AUTO（自己） | -- | 14 ユニットテスト |
| `packages/nac/test/stage1-audio.mjs` | AUTO（自己） | MAN（ロケールごとにコーパスを再生成） | 33 チェック；手動 = TTS コーパスのサンプルを聴いて音声が正常であることを確認 |
| `packages/nac/test/stage2-disambiguation.mjs` | AUTO（自己） | -- | 31 チェック |
| `packages/nac/test/stage3-backend.mjs` | AUTO（自己、ライブ） | MAN（LLM レスポンスの確認） | 45 プロンプト × 10 ロケール；手動 = ランダムな 2 プロンプトで LLM がドリフトしていないことをスポットチェック |
| `packages/nac/test/stage4-calls.mjs` | AUTO（自己） | -- | 31 チェック |
| `packages/nac/test/stage6-ack.mjs` | AUTO（自己） | -- | 16 チェック |
| `packages/nac/test/stage6b-longtail.mjs` | AUTO（自己） | -- | 14 チェック |
| `tests/e2e-nac/specs/*.spec.ts` | AUTO（自己） | MAN（リリースごとに headed 実行で目視確認） | 16 スペック；手動 = `--headed` で 1 回実行して目視確認 |
| TTS コーパス（MP3 ファイル 30 件） | AUTO（存在 + サイズ） | MAN（ロケールごとに 1 件を試聴） | 手動 = 10 ファイルをサンプリングし、音声が正常でゴミデータがないことを確認 |
| `tools/nac/test-launch.sh` | AUTO（自己） | -- | オーケストレーター |
| `tools/nac/discovery-loop.sh` | AUTO（自己） | -- | ディスカバリー + 修正ループ |

## 7. スタディケースパッケージ

| パッケージ | 自動カバレッジ | 手動ゲート | 備考 |
|---------|---------------|-------------|-------|
| `packages/nac-react-demo/` ソース | AUTO（ビルド + Playwright） | MAN（デプロイ済み dist の目視確認） | Vite ビルドがクリーン；Playwright が todos + chat + autopilot をカバー |
| `packages/nac-react-demo/` デプロイ済み dist | AUTO | MAN（シークレットモードで開いて操作） | 手動 = /demos/react/ での人間によるウォークスルー |
| `packages/nac-angular-demo/` ソース | AUTO | MAN | 同様の形式 |
| `packages/nac-angular-demo/` デプロイ済み dist | AUTO | MAN | 同上 |

## 8. クロスカッティング

| 懸念事項 | 自動カバレッジ | 手動ゲート | 備考 |
|---------|---------------|-------------|-------|
| i18n カタログの完全性 | AUTO（バリデーター） | MAN（ロケールごとにネイティブスピーカーがレビュー） | Strict モードバリデーターが欠落キーを検出；ネイティブスピーカーが文字列の文化的妥当性をスポットチェック |
| HMAC マニフェスト署名 | AUTO（ユニット） | MAN（マルチテナントデプロイのスモーク） | ユニットテストが署名 + 検証；手動 = シークレット配布フローに対して本番スモーク |
| isTrusted ゲーティング | AUTO（ユニット） | MAN（実クリックと合成クリックの並列確認） | v22 ユニットがフラグをカバー；手動 = example-v20-full.php の istrusted_real / istrusted_fake ボタンペア |
| クロスオリジン相互運用（v2.3） | AUTO（モック） | MAN（実ベアラートークンを使った実ピア） | v23-interop がページ内モックを使用；手動 = v2.3 GA 宣言前に少なくとも 1 回クロスオリジンテストを実施 |
| yujin.app へのデプロイ | AUTO（push → 自動デプロイ） | MAN（URL が 200 + 正しいコンテンツを返すことを確認） | GoDaddy が自動デプロイ；手動 = main への push ごとに重要な URL を curl で確認 |
| 実ブラウザでの音声再生 | -- | MAN（マイク + スピーカーテスト） | Web Speech API は実ハードウェアが必要；手動 = ライブ v21 デモでマイクを押してロケールごとに 1 プロンプト発話 |

## サマリー -- カテゴリ別の重み付きカバレッジ

| カテゴリ | AUTO | MAN | BOTH | カバレッジ健全性 |
|----------|------|-----|------|-----------------|
| ランタイム成果物 | 4 | 0 | 0 | 優秀（平均自動 95%） |
| NPM パッケージ | 4 | 0 | 0 | 優秀（自動 100%） |
| デモ | 6 | 1 | 1 | 良好（不変条件は自動、UX は手動） |
| ドキュメント | 1 | 14 | 0 | 想定内（ドキュメントはレビュー対象、ユニットテスト不可） |
| 採用ガイド | 0 | 10 | 0 | 想定内 |
| テストスイート | 13 | 4 | 0 | 優秀 |
| スタディケースパッケージ | 2 | 2 | 0 | 良好（自動 + 手動目視） |
| クロスカッティング | 4 | 2 | 0 | 良好 |
| **合計** | **34** | **33** | **1** | **優秀** |

## このマトリクスの使い方

### リリースごと

1. 仕様バージョン + リファレンススイートバージョンにタグを付ける。
2. `bash tools/nac/test-launch.sh` を実行 -- すべての AUTO 行がゲートとなる。
3. MAN 列を実施 -- [Human OK チェックリスト](HUMAN_OK_CHECKLIST.md) が実行可能な形式。
4. 実行結果を COVERAGE_REPORT_<date>.md に更新する。
5. 成果物の状況が変わった場合はこのマトリクスを修正する。

### 採用者ごと

このマトリクス構造を自分のアプリ用にコピーしてください。成果物名を置き換え、同じ形式を維持してください。規律は同じです：すべての成果物に明示的な自動 + 手動ゲートを設けること。

### アンチパターン

テストがファイルの存在確認のみを行う場合、成果物を「AUTO」とマークしないでください。AUTO はテストが動作を検証することを意味します。ファイル存在チェックはハーネス（test-launch.sh）に属し、成果物マトリクスには含めません。

## 関連情報

- [NAC_TEST_MANUAL.md](NAC_TEST_MANUAL.md) -- このマトリクスの元となるプレイブック。
- [HUMAN_OK_CHECKLIST.md](HUMAN_OK_CHECKLIST.md) -- MAN 列の実行可能な形式。
- [COVERAGE_REPORT_2026_05_10.md](COVERAGE_REPORT_2026_05_10.md)
  -- 現在のリリースの実際の実行結果。

## ライセンス

Apache-2.0.

---

*This is a machine translation of the canonical English
version at `/nac-spec/docs/TEST_COVERAGE_MATRIX.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
