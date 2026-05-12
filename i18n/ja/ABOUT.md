---
translation_source: ABOUT.md
translation_source_hash: 4ab5d9a2ad96ee42811299474895d9836adc1ca93ea37726806f190f59646484
translation_quality: machine_v1
translation_lang: ja
translation_date: 2026-05-11T13:03:48.439308+00:00
---

# NAC3 について

**仕様バージョン:** 2.2 安定版（+ v2.3 相互運用プレビュー）

**NAC3** = **Native Agent Contract**

AIエージェント、音声ランナー、アクセシビリティツールが、今日の人間と同じようにWebUIを操作できるようにするための、小規模で公開された仕様です。クリック、入力、読み取りといった操作を、マシンが解決できる名前、マシンが待機できるイベント、そして実際のユーザーと合成的な呼び出し元を区別するプロベナンストレイルとともに実現します。

NAC3はARIAの上に重なるのではなく、ARIAと並列に位置します。ARIAが**アクセシビリティツリー**を標準化することで、スクリーンリーダーやスイッチデバイスが晴眼者と同じUIを操作できるようにしたように、NAC3は**エージェントツリー**を標準化することで、音声コマンド、LLM仲介者、RPAボットがアプリごとのグルーコードなしに同じことを実現できるようにします。

## 記述内容

HTMLの属性（`data-nac-id`、`data-nac-role`、`data-nac-action`、`data-nac-plugin`）と、ページ上の要素とそれが受け付ける動詞を定義するオプションのJSマニフェストを記述します。ランタイムは名前を要素に解決し、ディスパッチします。

## 得られるもの

- 音声ランナー、Playwrightスペック、LLM仲介者、キーボードマクロ、アクセシビリティツールなど、あらゆる呼び出し元から `NAC.click('deals.create')` に応答するページ。
- 各ステップの完了を呼び出し元が把握できるよう、決定論的なイベントファミリー（`nac:action:succeeded`、`nac:tab:activated`、`nac:field:changed` など）を発行するページ。
- 座標ではなく要素のアイデンティティによってコントラクトが駆動されるため、UIの再設計によって自動化が壊れないページ。
- クリックが実際のユーザーからのものか別のエージェントからのものかを下流システムに伝えるプロベナンスレイヤー（`isTrusted`、HMACで署名されたマニフェスト）。

## NAC3 ではないもの

- UIフレームワークではありません。React / Vue / バニラ / PHP など、既存の構成はそのまま使用できます。NAC3は既存のレンダリングの上に薄く重ねるコントラクトです。
- LLMではありません。「保存ボタンをクリック」を `NAC.click('deals.save')` に解決するLLMはご自身（またはベンダー）の責任です。リファレンスは `guides/LLM_WIRING.md` を参照してください。
- アクセシビリティの代替ではありません。ARIAロールはそのまま維持してください。NAC3は並列レイヤーを追加するものであり、多くの採用者が同じ要素に `role="button"` と `data-nac-role="action"` の両方を付与しています。

## ステータス

- **v1.9** -- 安定版。27ウィジェット、9イベントファミリー、HMAC + isTrusted、i18nストリクトモード、バリデーターを収録。本番リファレンスは `example.php`。
- **v2.0** -- ブラウンフィールドマイグレーションのストーリーを提供（既存ページが約80行のセットアップでNAC駆動になる）。リファレンス: `example-v20-full.php`。
- **v2.1** -- データテーブルプリミティブを追加（`collection`、`matrix`、`matrix-singletree` サブカインド、`dt_add_row`、`dt_edit_cell`、集計、トランザクショナルコミット）。リファレンス: `example-v21-data-table.php`。
- **v2.2** -- 2026-05-10 リリース済み。`NAC.register` が厳格なバリデーター（`manifest_role_unknown`、`tab_id_manifest_role_drift`、`manifest_dom_role_mismatch`）になりました。新しい `NAC.bindAction(el, handler, ctx)` ヘルパーが `nac:action:succeeded` コントラクトをランタイムに組み込みます。新フラグ `NAC.STRICT_VALIDATION` により、検出結果を警告のみ（2.2のデフォルト）とスロー（2.3のデフォルト）の間で切り替えられます。**これが `npm install @nac3/runtime` で現在インストールされるバージョンです。** 完全な変更履歴は `docs/NAC_V22_ROADMAP.md` を参照してください。
- **v2.3** -- 計画中。`STRICT_VALIDATION` のデフォルトが `true` に変更されます。タブウィジェット向けの `NAC.bindTab(el, handler, ctx)` コンパニオンが追加されます。オプトイン機能としてストリーミングチャットディスパッチが追加される予定です。

## はじめ方

- `yujin.app/nac-spec/` でデモを実行する（任意のブラウザ・デバイスで動作）。
- 完全なコントラクトは `SPEC.md` を参照する。
- Reactから採用する場合は `guides/REACT.md` を参照する。
- 独自のLLM仲介者を接続する場合は `guides/LLM_WIRING.md` を参照する。
- テナントコンテキストでNAC3をデプロイする前に `SECURITY.md` を参照する。

## ガバナンス

NAC3は現在Yujinによって管理されています。仕様はApache 2.0、リファレンスランタイムはMITライセンスです。採用状況が中立的なガバナンスを正当化する場合、YujinはNAC3を中立的な財団（W3Cコミュニティグループ、Linux Foundation、または同等の業界団体）に移管することを約束しています。それまでの間、仕様の変更は `CONTRIBUTING.md` のRFCプロセスに従い、公開APIまたはワイヤーフォーマットへのいかなる変更についても最低14日間のパブリックコメント期間が設けられます。

Apache 2.0 + MITのライセンスにより、仕様とランタイムはYujinの企業状況の変化に関わらず存続することが保証されます。採用者は今日も、Yujinが存在しなくなった後も、どちらをフォーク、実行、配布することも可能です。

## 著者情報

NAC3はYujin（rpaforce.com）によって作成・メンテナンスされています。Apache-2.0ライセンス。コントリビューション歓迎 -- `CONTRIBUTING.md` を参照してください。

---

*This is a machine translation of the canonical English
version at `/nac-spec/ABOUT.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
