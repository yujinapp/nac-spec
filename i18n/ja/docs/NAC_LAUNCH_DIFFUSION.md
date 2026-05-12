---
translation_source: docs/NAC_LAUNCH_DIFFUSION.md
translation_source_hash: cbdf7b9e5ec3ed43a39111aab16fbe59c222a05a835429ea43148036320fc5cf
translation_quality: machine_v1
translation_lang: ja
translation_date: 2026-05-11T15:07:42.976955+00:00
---

# NAC3 ローンチ拡散プラン

NAC3 を使うべき人々に届けるための実践的なプレイブック。v2.2 / v2.3-preview ローンチに向けて 2026-05-10 に作成。

## リリース内容

- **仕様:** v2.2 安定版、v2.3 プレビュー（フィールドエディタプリミティブ）。
- **ランタイム:** npm の `@nac3/runtime@2.2.0`（ESM + CJS + d.ts + CLI）。
- **デモ:** yujin.app/nac-spec/ にライブデモ 4 本。
- **導入ガイド:** React + Angular + LLM 連携。
- **スタディケース:** `packages/nac-react-demo` + `packages/nac-angular-demo` に動作する Vite + React 18 および Angular 17 アプリ。
- **ブラウンフィールド移行事例:** Yujin CRM 自体を pkuschnirof/yujin docs/MIGRATION_FROM_RPAFORCE.md にドキュメント化。
- **NAC-3 準拠:** ランディングページ自体が NAC-3 準拠（manifest + chat + autopilot + isTrusted 対応）。

## メッセージング

### ワンライナー

> **NAC3 -- アプリごとのグルーコードなしに、Web UI を AI エージェント・音声ランナー・アクセシビリティツールから操作できるようにする、小さな公開仕様。**

### スリーライナー

> NAC3 は、2026 年に LLM を念頭に置いて設計されていたとしたら ARIA がなっていたであろうものです。既存の UI に HTML 属性を 3 つ付けるだけ。ランタイムが名前解決・クリックのディスパッチ・完了イベントの発行・ローカライゼーション・プロベナンスをすべて処理します。Apache-2.0、npm install、ビルドステップの変更不要。

### 30 秒ピッチ

> 音声アシスタント、LLM チャットエージェント、アクセシビリティツールはすべて同じ問題を抱えています。操作したい要素に対して安定した名前が必要なのです。CSS セレクタは壊れる。ARIA は「これはボタンです」で止まる。どのチームも同じ配管を一から作り直している。
>
> NAC3 はこれを解決する小さなコントラクトです。エージェントが操作すべき要素に `data-nac-id`、`data-nac-role`、`data-nac-action` を追加すれば、あとはランタイムが引き受けます。v2.2 仕様、安定版 npm パッケージ、React + Angular ガイド、そして今すぐ話しかけられる Claude Sonnet チャットバックエンドにエンドツーエンドで接続されたものを含む 4 本のライブデモが揃っています。
>
> Apache-2.0 です。私たちが必要としていた CRM を作る中で生まれました。今、あなたも使えます。

## ターゲットオーディエンス

| オーディエンス | チャネル | フック |
|----------|---------|------|
| React + Vue + Svelte + Angular 開発者 | dev.to、Hashnode、r/javascript、r/webdev | 「既存の React アプリを 80 行で音声対応にする」 |
| 音声・エージェントビルダー | r/LocalLLaMA、r/ChatGPTCoding、エージェントビルダー Discord | 「音声アプリのユーザー向け側面に欠けていた標準」 |
| アクセシビリティ推進者 | r/Accessibility、a11y メーリングリスト、A11y ミートアップ登壇者 | 「2026 年に LLM を念頭に置いて設計された ARIA」 |
| テスト・QA エンジニア | r/qualityassurance、Selenium / Playwright コミュニティ | 「UI 再設計後も壊れない安定したセレクタ」 |
| HN | news.ycombinator.com | 正統派 Show HN |
| テックリード・CTO | LinkedIn、Mastodon | 「どうせ 12 ヶ月後には導入することになる」アングル |
| Yujin CRM ユーザー | 直接メール + プロダクト内バナー | 「あなたの CRM は NAC3 に対応しています。その意味は」 |

## チャネル別サンプル投稿

### Show HN

- **タイトル:** `Show HN: NAC -- a small public spec that lets web UIs be driven by AI agents`
- **冒頭文:** "We made this while building Yujin CRM and realised every team trying to ship voice/agent UI rebuilds the same plumbing."
- **本文:** コントラクト（属性 3 つ + manifest + イベント）を説明し、ライブデモ・仕様・npm パッケージ・React スタディケースへのリンクを貼る。200 語以内に収める。長い投稿よりコメントスレッドの方が注目を集める。
- **投稿日:** 米国時間の火曜か水曜の午前。月曜・金曜は避ける。
- **フォローアップ:** 少なくとも 4 時間はコメント欄に張り付く。技術的な質問にはすべて返答する。炎上には反応しない。

### r/javascript

- **タイトル:** `[Showoff] NAC: drive your React app with voice + chat using 3 HTML attributes`
- **本文:** 「React 導入者は何をするのか」に焦点を当てる。`guides/REACT.md` のコード例を使用。スタディケースの GitHub ディレクトリへリンク。

### r/Accessibility

- **タイトル:** `NAC: a parallel layer to ARIA for AI-agent-driven UI`
- **本文:** 「これは ARIA の代替ではなく、兄弟関係にある仕様です」から始める。アクセシビリティ関係者は（正当な理由から）保守的なので注意。`data-nac-role="action"` と `role="button"` が共存する様子を示す。

### dev.to

- **タイトル:** `Drive any web UI by voice with @nac3/runtime`
- **フック:** React スタディケースリポジトリ。チャットパネルと autopilot ツアーのスクリーンショット・gif をインライン掲載。
- **長さ:** 1500〜2000 語。ステップバイステップ形式。

### Twitter / X

6 ツイートのスレッド:

1. 「NAC3 v2.2 をリリースしました。Web UI を AI エージェントから操作できる公開仕様 + npm パッケージです。Apache-2.0。（デモの gif）」
2. 「なぜ作ったか: 音声・エージェント UX を構築するすべてのチームが同じ配管を作り直しています。CSS セレクタは壊れる。ARIA はエージェント向けに設計されていない。小さなコントラクトが必要でした。」
3. 「どれだけ小さいか: 要素ごとに HTML 属性 3 つ。（コードのスクリーンショット）」
4. 「得られるもの: 安定した名前、決定論的な完了イベント、10 ロケール対応 i18n、HMAC + isTrusted によるプロベナンス、自動バリデーション。」
5. 「yujin.app/nac-spec にライブデモあり。4 本のデモのうち 1 本は Claude Sonnet チャットバックエンドに接続済み。今すぐ話しかけてみてください。」
6. 「React + Angular 導入ガイドと動作するスタディケースは github.com/pkuschnirof/rpaforce-crm に。仕様は yujin.app/nac-spec/SPEC.md に。」

### LinkedIn

長文投稿（約 600 語）。「どうせ 12 ヶ月後には導入することになる」アングルを前面に出し、エージェント戦略を検討中の CTO に訴求する。BPMN 形式の autopilot ツアーのスクリーンショットを含める。

### Mastodon

Twitter スレッドをクロスポスト、簡潔に。すべての画像に alt テキストを付ける（Mastodon では重要）。

## デモ gif・動画プラン

### Gif（15 秒、ループ）

シーン 1（4 秒）: React デモのチャット入力に「agrega tomar agua」と入力。
シーン 2（3 秒）: LLM が解決し、todo がフラッシュハイライト付きで追加される。
シーン 3（4 秒）: 「tour」をクリック。autopilot がページをナレーション付きで案内。
シーン 4（4 秒）: マイクを押しながら「remove all done」と発話。todo がクリアされる。

8MB の MP4 + 4MB の WebP フォールバックとして `yujin.app/nac-spec/assets/demo.{mp4,webp}` にホスト。README のヒーロー gif、OG 画像、Twitter カード、dev.to ヘッダーとして使用。

### 動画（90 秒、ボイスオーバー）

YouTube + Vimeo に投稿。
- 0:00-0:10 -- 問題提起（「音声・エージェントには安定した名前が必要」）。
- 0:10-0:25 -- コントラクト（属性 3 つ）。
- 0:25-0:45 -- 導入デモ（React スタディケース、5 行追加）。
- 0:45-1:05 -- チャット・音声・autopilot による操作。
- 1:05-1:20 -- Yujin CRM ブラウンフィールド事例。
- 1:20-1:30 -- 「Apache-2.0、npm install @nac3/runtime、リンクは下記。」

## フォローアップスケジュール

| タイミング | アクション |
|------|--------|
| Day 0 | Show HN + r/javascript + Twitter スレッド + dev.to 記事。4〜8 時間コメントに対応。 |
| Day 1 | LinkedIn 投稿。dev.to コメントに対応。提起された簡単な課題を GitHub バックログに追加。 |
| Day 3 | r/Accessibility 投稿 + Mastodon クロスポスト。 |
| Day 7 | 「Week 1 振り返り」ブログ記事: 得られたフィードバック、変更点、上位 GitHub issues。 |
| Day 14 | Day 0 にエンゲージしたアクセシビリティ・エージェントビルダー関係者に「話しませんか？」と DM。 |
| Day 30 | コミュニティから要望の多かった修正を含む v2.2.x パッチをリリース。告知記事:「NAC3 の 30 日間で学んだこと」。 |
| Day 90 | NAC3 v2.3 リリース（フィールドエディタ正式版、STRICT_VALIDATION デフォルト true）。新たなローンチパルス、小規模展開。 |

## 追跡指標

- `@nac3/runtime` の週次 npm ダウンロード数。
- `pkuschnirof/rpaforce-crm` と `pkuschnirof/yujin` の GitHub スター数・フォーク数。
- yujin.app/nac-spec/ のデモページビュー数（サーバーアクセスログ）。
- 開設された GitHub issues 数（エンゲージメントの代理指標）。
- 上記チャネル全体のユニークコメント投稿者数。
- 「Native Agent Contract」の検索トレンド（Google Trends）。

Week 1 目標:
- npm ダウンロード 200 件
- 両リポジトリ合計 GitHub スター 100 個
- デモページビュー 5000 件
- issues / ディスカッション 10 件開設
- 外部者による自発的なブログ記事 1 本

これらを 50% 以上下回った場合はメッセージングを見直し、Day 14 に LinkedIn + dev.to の投稿文を改訂して再挑戦する。

## 公開前チェックリスト（投稿ボタンを押す前に）

- [ ] `npm publish @nac3/runtime@2.2.0` 完了（**手動**操作が必要。オーナーの npm トークンが必要）。
- [ ] 新規の tmp ディレクトリから `npm install @nac3/runtime` が動作すること。
- [ ] Chrome + Firefox + Safari でライブデモがコンソールエラーなしに読み込まれること。
- [ ] ランディングページで `validate_global({probe: true})` が `[]` を返すこと。
- [ ] デモ gif が dev.to + Twitter のプレビューカードで正しく表示されること。
- [ ] `LICENSE`、`CONTRIBUTING`、`SECURITY` がすべて配置済みであること。
- [ ] Day 1 に訪れたコントリビューターが取り組める場所を確保するため、「good first issue」ラベルの付いた GitHub issue が少なくとも 1 件あること。
- [ ] Pablo が起きていて、4 時間コメントに対応できる状態であること。

## アンチゴール

やらないこと:

- 広告費の支出（少なくとも Week 4 の指標が出るまで）。
- ARIA、Selenium、Playwright、または任意のエージェントベンダーの批判。NAC3 は追加的なものであり、対立的なものではない。
- ローンチ時点でのエンタープライズサポート契約の約束（サポート負荷を把握してから）。
- オープンソースウォッシュ: コードは Apache-2.0 であり、チャットバックエンドのリファレンス実装も同様。「コア」と「プレミアム」機能を分けて堀を作ることはしない。堀はホスティング・LLM クレジット・運用にある。

## ローンチ当日のプレイブック

Pablo がソロで運営するため、時間を区切って実施:

| 時刻 | アクション |
|------|--------|
| 06:00（米国 ET） | 最終スモークテスト: `npm test` + `npx @nac3/runtime validate yujin.app/nac-spec/` + シークレットモードですべてのデモを開く。問題があれば修正。 |
| 09:00 | Show HN 投稿。 |
| 09:05 | Twitter スレッド投稿。 |
| 09:15 | r/javascript 投稿。 |
| 09:30 | dev.to 記事投稿。 |
| 09:30-13:30 | HN コメント欄に常駐。クイックリンクをトップコメントにピン留め。 |
| 14:00 | LinkedIn 投稿。 |
| 14:00-18:00 | dev.to コメント + Twitter メンションに常駐。 |
| 18:00 | 終了。休む。 |
| Day 1 09:00 | r/Accessibility + Mastodon 投稿。GitHub issues のトリアージ。 |

---

*This is a machine translation of the canonical English
version at `/nac-spec/docs/NAC_LAUNCH_DIFFUSION.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
