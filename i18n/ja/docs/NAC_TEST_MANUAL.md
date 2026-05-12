---
translation_source: docs/NAC_TEST_MANUAL.md
translation_source_hash: 75c7b936593deacfec1dd9689f1093483363cc45f01514ff9c9d8d52e466c9a9
translation_quality: machine_v1
translation_lang: ja
translation_date: 2026-05-11T15:00:56.499867+00:00
---

# NAC3 テストマニュアル

**NAC-3 準拠アプリ向けの標準化されたテストプレイブック。**

バージョン 1.0 -- 2026-05-11。NAC3 v2.2 + v2.3 プレビューサーフェスに対して有効。仕様変更時は更新すること。

このドキュメントは、採用チームに対して「何をテストするか」「どのようにテストするか」「何を検証するか」「何をスキップするか」を NAC3 パイプラインの各ステージに沿って説明する。

```
Comunicacion -> Desambiguacion -> Intencion -> Llamada -> Resultado -> Ack
    (1)             (2)             (3)         (4)         (5)        (6)
```

加えて、横断的な関心事として、コンストラクター（V22-01）、bindAction コントラクト（V22-02）、インターオペラビリティ（v2.3）、プロベナンス + セキュリティも対象とする。

Yujin リファレンススイート（本マニュアル末尾のケーススタディ）は **175 件以上のユニットテスト + 16 件の Playwright e2e テスト**で構成される。加重平均パイプラインカバレッジは **95%**。参考になる部分は自由に流用してほしい。

---

## 0. このマニュアルの目的

NAC3 を採用するチームはそれぞれゼロからテストコーパスを構築するため、カバレッジにムラが生じやすい。ack イベントのテストは完璧なのに LLM 仲介層を無視しているチームもあれば、Playwright による e2e はあるのにユニットテストが皆無なチームもある。このマニュアルは、NAC-3 アプリにおける「完全なテスト」の定義を明文化したものだ。

NAC-3 認定アプリの最低基準：

| ステージ | 必須 | 推奨 |
|-------|-----------|-------------|
| 1 Comunicacion | テキストパスのカバー。チャットクライアント向け STT モックテスト。 | 実際の TTS コーパス + Playwright による音声再生。 |
| 2 Desambiguacion | ロケール切り替え検出器の偽陽性テスト。snapshotTree の形状検証。 | タブごと / i18n ラベルの許容範囲テスト。 |
| 3 Intencion | 5 件以上のプロンプトに対するライブ（または VCR カセット）バックエンドスモーク。 | アプリ固有のバグ履歴に基づくアンチバグガード。 |
| 4 Llamada | アプリが使用するすべての公開 NAC.* 関数について、正常系 + エラー系のパス。 | drag_drop、edit_field（使用する場合）。 |
| 5 Resultado | アプリが公開する上位 10 動詞について DOM の副作用を検証。 | Playwright マトリックスによるクロスブラウザ検証。 |
| 6 Ack | ロールが生成するすべてのイベントファミリーについて、detail の形状を検証。 | ロングテールファミリー（breadcrumb、accordion、step）。 |
| Interop | MCP エクスポート / インポートを実装する場合：export_tree の形状 + インポート + プロキシ + 切断。 | HMAC 署名 + 再帰ガード。 |

---

## 1. スイートのレイアウト

以下の構成を推奨する（Yujin リファレンスに準拠）：

```
packages/<your-app>/
  test/
    smoke.mjs                       artefact integrity + CLI
    v22.mjs                         strict validator + bindAction
    v23-interop.mjs                 cross-app MCP (if you implement)
    stage1-audio.mjs                STT mock + TTS corpus integrity
    stage2-disambiguation.mjs       _detectLangSwitch + tab_by_label + snapshotTree
    stage3-backend.mjs              live (or recorded) backend smoke
    stage4-calls.mjs                every public NAC.* write API
    stage6-ack.mjs                  ack event families
    stage6b-longtail.mjs            breadcrumb/accordion/step/sort/filter/confirm
    fixtures/voice/                 TTS-generated MP3 corpus
      corpus.json                   prompt -> expected outcome
      generate.mjs                  one-shot regen via Google/ElevenLabs
      <locale>/<id>.mp3
tests/
  e2e-nac/
    playwright.config.ts
    specs/
      01-landing.spec.ts            @demos
      02-demo-<name>.spec.ts        @demos one per surface
      08-pipeline-end-to-end.spec.ts @e2e full chat-to-ack
tools/nac/
  test-launch.sh                    orchestrates everything
```

`tools/nac/test-launch.sh` の実行内容：
- レイヤー 1：すべての Node サイドスイートを順番に連結実行し、最初の FAIL で停止。
- レイヤー 1b（オプトイン）：ライブバックエンドスモーク（約 60 秒）。
- レイヤー 2：`npx @nac3/runtime validate <dir>` による静的リント。
- レイヤー 3：ドキュメントリンクの健全性チェック。
- レイヤー 4：デモアーティファクトの整合性確認。
- レイヤー 5：ケーススタディパッケージの整合性確認。

目標：レイヤー 1 + 2 + 3 + 4 + 5 をラップトップ上で 10 秒以内に完了。

---

## 2. ステージ別：テスト内容

### ステージ 1 -- Comunicacion（STT + 生入力）

#### このステージが担う範囲

音声キャプチャ、STT トランスクリプト、チャットクライアントへの生テキスト入力。チャットクライアントの `_sttBuffer` + `_sttFlushTimer` デバウンシングはここに属する。ロケール切り替えのショートサーキット（`_maybeChangeLocaleLocally`）もここに含まれる。

#### テスト内容

1. **STT モック + トランスクリプト注入。** `window.SpeechRecognition` を、植え付けたトランスクリプトを含む合成 `result` イベントを発火するフェイクに置き換える。`NacChat.send(transcript)` がそのテキストをディスパッチャーに正確に伝播することを検証する。
2. **TTS コーパスの整合性。** サポートする 10 ロケールで Google Cloud TTS / ElevenLabs を使って約 30 件の音声プロンプトを生成する。各 MP3 ファイルが存在し、かつ 1KB 以上であることを検証する。コーパス自体のリグレッション検出として機能する。
3. **実際の音声再生（Playwright）。** オプション。コーパスの MP3 を `getUserMedia` モッキング経由で再生し、ブラウザの SpeechRecognition にルーティングする。セットアップが複雑なため、v1 ではスキップしてよい。

#### 検証内容

- コーパス内のすべてのプロンプトが、正確なテキストで `NacChat.send()` に到達すること。
- 空入力・空白のみの入力でチャットクライアントがクラッシュしないこと。
- `_detectLangSwitch` にマッチするプロンプトでロケール切り替えショートサーキットが発火すること（ステージ 2 でも対象）。

#### スキップしてよい内容

- マイクの権限フロー。ブラウザレベルの UI であり、Playwright で対応する価値はない。
- クロスブラウザの音声コーデック互換性。コーパスは MP3 + 単一ブラウザで統一する。

---

### ステージ 2 -- Desambiguacion

#### このステージが担う範囲

`_detectLangSwitch`。スナップショットの構成とサニタイズ。`tab_by_label` マッチャーの許容範囲。生テキストを「LLM が見るべき内容 / ローカルで発火するショートカット」に変換するすべての処理。

#### テスト内容

1. **`_detectLangSwitch` の偽陽性ケース。** バグが発生しやすい箇所なので、明示的なアンチテストを用意する：
   - `'cambia de pestana'` -> 現在のロケールを維持。
   - `'cambia precio de mouse 40'` -> 現在のロケールを維持。
   - `'borra de la lista'` -> 維持。
   - `'pasa de A a B'` -> 維持。
2. **`_detectLangSwitch` の正常ケース。** サポートするロケール全体で最低 12 件：
   - `'cambia a aleman'` -> de
   - `'switch to english'` -> en
   - `'use spanish'` -> es
   - `'cambia idioma a de'`（明示的なトリガー + ベアコード）-> de
   - 同一言語への切り替えは noop。
   - 空入力 / 空白のみの入力。
3. **`tab_by_label`** の許容範囲：
   - textContent の完全一致。
   - 括弧除去後の一致（`"Lines (collection)"` が `"Lines"` にマッチ）。
   - i18n ロケールラベルの一致。
   - 未知のラベル -> not_found。
4. **`snapshotTree` の形状。** `{active, plugins[]}` を返す。プラグインごとにマニフェストを含む。アクティブプラグインのデータテーブルスナップショットを含む（v2.1 の場合）。

#### 検証内容

- `NacChat.send(text)` 後の最終言語が期待値と一致すること。
- バックエンドが呼び出された / 呼び出されなかったことが期待通りであること。
- `tab_by_label` がケースごとに正常に返却またはスローすること。
- `snapshotTree()` が JSON シリアライズ可能かつサイズが適切であること。

#### よくある落とし穴

- 2 文字のベアロケールコード（`'de'`、`'es'`）が前置詞や冠詞と衝突する。トラップケースを明示的にテストすること。
- `label_i18n` の 1〜2 文字のフィラーラベルが部分一致で偽陽性を引き起こす。現実的な文字列を使用すること。

---

### ステージ 3 -- Intencion（LLM 仲介層）

#### このステージが担う範囲

チャットクライアントと LLM 仲介層の間の HTTP ラウンドトリップ。バックエンドの役割：`nac_tree` スナップショット + プロンプトを読み取り、`{message, actions[]}` を返す。

#### テスト内容

1. **バックエンド形状スモーク。** サポートするロケールの標準プロンプトセット（15 件以上推奨）に対してエンドポイントに POST し、以下を検証する：
   - HTTP 200。
   - `ok` ブール値を含む JSON レスポンス。
   - ok の場合：`message` 文字列 + `actions` 配列。
   - すべての `action.kind` が標準の kind のいずれかであること。
2. **アンチバグガード。** バグ履歴の各既知バグクラスに対して、明示的なライブテストを記述する。例：`'cambia de pestana'` は `change_locale: 'de'` を返してはならない。
3. **スナップショットサイズガード。** トークン課金の場合、20KB を超えるスナップショットを LLM に送信しないこと。ツリーが予算を超えた場合はビルドを失敗させる。

#### スキップしてよい内容

- LLM 固有のアクション内容。LLM は非決定的なため、「save が action_id = X をトリガーする」といった検証はしない。形状のみを検証する。
- ネットワーク耐障害性（タイムアウト、リトライ）。負荷 / 信頼性テストに属し、ユニット / スモークの範囲外。

#### ライブ vs VCR

ライブテストは LLM のコストやレート制限に対して脆弱だ。プロンプトコーパスが安定したら、レスポンスを VCR カセット（プロンプト -> レスポンスのマッピングを持つ JSON ファイル）として記録し、CI で再生する。Yujin のリファレンスは予算の都合でライブテスト（約 60 秒 / 実行）を使用しているが、CI の実行頻度が高い場合はカセットに切り替えること。

---

### ステージ 4 -- Llamada（NAC.* 書き込み API）

#### このステージが担う範囲

`window.NAC` 上のすべての公開関数：click、click_by_verb、fill、select、tab、tab_by_label、go_to_section、drag_drop、edit_field、dt_*、bindAction。

#### テスト内容

使用する各関数について、3 つのケース：

1. **正常系。** マニフェスト id に一致する DOM 要素をマウントし、ハンドラーが標準の ack イベントを発火するよう設定し、`NAC.<func>(...)` を呼び出して解決することを検証する。
2. **not_found。** 存在しない id で呼び出し、コード `'not_found'`（`go_to_section` の場合は `'section_not_found'`）でスローすることを検証する。
3. **無効な入力。** 空または不正な形状の引数で呼び出し、コード `'invalid'` でスローすることを検証する。

`dt_*` ファミリーについては、追加で：

- `dt_add_row` が `{ok, row_id}` を返すこと。
- `dt_edit_cell` の正常系 + 無効値の拒否（例：`qty < min`）。
- `dt_remove_row` が `dt_state().rows.length` をデクリメントすること。
- `dt_commit` が `{ok, final_state}` を返すこと。
- `dt_discard` がコミットされていない変更をロールバックすること。

#### 実装上の注意

jsdom や Playwright を使わずに済むよう、小さなインプロセス DOM シム（EventTarget サブクラス約 150〜200 行）で実行する。複合セレクターマッチャー（`[a="b"][c="d"]`）はサポートが必要な唯一の機能だ。リファレンススイートの `stage4-calls.mjs` を参照。

---

### ステージ 5 -- Resultado（DOM の副作用）

#### このステージが担う範囲

NAC.* 呼び出し後に DOM で実際に変化する内容。ステージ 4（関数が ok を返した）やステージ 6（ack イベントが発火した）とは区別される。

#### テスト内容

1. **動詞ごとの DOM ミューテーション。** 上位 10 動詞について：
   - `save` -> 対象フォームがサブミットされたか？トーストが表示されたか？
   - `cancel` -> モーダルが閉じたか？フォームの値がリセットされたか？
   - `delete` -> リストから行が削除されたか？
   - `add_row` -> テーブルに新しい行が表示されたか？
2. **サーフェスごとの Playwright e2e。** トップレベルのプラグイン / 画面ごとに 1 つのスペック。実際のブラウザでサーフェスをマウントし、標準的なユーザーフローを実行して DOM の状態を検証する。

#### スキップしてよい内容

- ピクセルパーフェクトなスクリーンショット差分。ビジュアルリグレッションには専用のツールがある。
- パフォーマンス（フレームレート、レイアウトシフト）。パフォーマンステストに属し、別予算で対応する。

---

### ステージ 6 -- Ack イベントファミリー

#### このステージが担う範囲

ランタイムがリッスンするすべての `nac:*` イベント。各イベントには標準の detail 形状（plugin + id キー + オプションの追加情報）がある。

#### テスト内容

`_CLICK_EVENT_FAMILY` の各ファミリーについて：

- `nac:action:succeeded` -- detail.plugin + detail.action_id + detail.is_trusted。
- `nac:action:failed` -- 同上 + detail.error。
- `nac:field:changed` -- detail.field_id + detail.value。
- `nac:tab:activated` -- detail.tab_id。
- `nac:breadcrumb:navigated` -- detail.breadcrumb_id。
- `nac:accordion:expanded` / `:collapsed` -- detail.accordion_id。
- `nac:step:advanced` -- detail.step_id。
- `nac:table:page_changed` -- detail.page_index。
- `nac:confirm:resolved` / `:cancelled` -- detail.confirm_id。
- `nac:table:sort_changed` -- detail.column_id。
- `nac:table:filter_changed` -- detail.filter_id。

各ファミリーについて：
1. 標準ロールを持つ DOM 要素をマウントする。
2. クリックハンドラーが標準イベントを発火するよう設定する。
3. `NAC.click(id)` を呼び出してイベントをリッスンする。
4. detail の形状を検証する。

加えて：
- **クリックから解決までのタイミング。** ランタイムのリスナーは ack 発火から 200ms 以内に解決すること。それ以上かかる場合はランタイムのバグだ。
- **`bindAction`** は同期ハンドラーの後に ack を自動発火する。
- **`bindAction` 非同期解決** は Promise の解決後に自動発火する。
- **`bindAction` スロー** -> `nac:action:failed` を detail.error 付きで自動発火する。

---

### V22-01 -- 厳格なコンストラクターバリデーター

`NAC.STRICT_VALIDATION = true` にすると、`NAC.register` が以下の場合にスローする：

- `manifest_role_unknown` -- 標準セット外のロール。
- `tab_id_manifest_role_drift` -- id が `^tab\.` にマッチするがロールが `'tab'` でない。
- `manifest_dom_role_mismatch` -- マウントされた DOM のロールがマニフェストで宣言されたロールと異なる。

各ケースのテスト方法：
1. `STRICT_VALIDATION = true` に設定する。
2. ルール違反となるよう作成したマニフェストで `register` を呼び出す。
3. `code: 'strict_validation'` + `findings: [...]` でスローすることを検証する。

厳格モードなしの場合：`console.error` が発火されたことを検証する（`console.error` へのスパイでキャプチャ）。

---

### V22-02 -- bindAction ヘルパー

ステージ 6 でも対象としているが、最低 5 件の明示的なテストを記述すること：

1. 同期ハンドラー -> ack が発火する。
2. スローするハンドラー -> failed イベントが発火し、エラーが再スローされる。
3. 解決する非同期ハンドラー -> 解決後に ack が発火する。
4. `bindAction` がアンバインダーを返し、呼び出すと発火が停止する。
5. ctx の欠如（plugin または action_id がない）-> `code: 'invalid'` でスローする。

---

### Interop -- v2.3 プレビュー

アプリが MCP 経由で NAC3 ツリーをエクスポート / インポートする場合：

1. **export_tree の形状。** `{app_id, app_version, nac_version, exported_at, active_plugin, manifests, scope_tree, data_tables, state, ack_endpoint}` を返す。
2. **export_tree のフィルター。** `scope: 'plugin_slug:<slug>'` は該当プラグインのみを返す。`scope: 'active_plugin'` はアクティブなプラグインのみを返す。`include_locales: ['en','es']` は該当ロケールのみを返す。
3. **import_remote_tree のバリデーション。** bearer またはエンドポイントが欠如している場合は `invalid` をスローする。名前空間の重複は `conflict` をスローする。
4. **名前空間付きプラグイン登録。** インポート後、`NAC.list_registered_plugins()` に `remote:<ns>:<slug>` が含まれること。
5. **プロキシディスパッチ。** `NAC.click('remote:<ns>:...')` がピアのエンドポイントへの `fetch` を `bearer` + `nac_id`（プレフィックスなしのピアローカル）+ `action.kind` 付きでトリガーすること。
6. **ローカル ack ミラー。** プロキシ成功後、`detail.via_interop: true` + `detail.is_trusted: false` を持つローカルの `nac:action:succeeded` が発火すること。
7. **ピアエラーのバブリング。** ピアが `{ok: false, error: {code: '...', message: '...'}}` を返した場合、クライアントはピアのコードでスローすること。
8. **disconnect_remote。** 名前空間をクリアし、以降の `NAC.click('remote:...')` が not_found をスローすること。
9. **ローカルクリックはプロキシしない。** 重要なコントラクト：インターオペラビリティレイヤーがインストールされた後も、ローカル id に対する NAC.click の呼び出しは fetch を行ってはならない。

---

## 3. ツーリング推奨事項

### テストランナー

- **Node + プレーン ESM モジュール**（ステージ 2〜6 向け）。Jest も Vitest も不要 -- `assert(name, ok)` を 200 行書けば十分で、依存関係の増加を抑えられる。
- **Playwright**（ステージ 5 の e2e、および実施する場合はステージ 1 の音声再生テスト向け）。

### CI

- ライブバックエンドのスモークテスト（ステージ 3）はプッシュのたびに実行しない -- 1 回あたり約 60 秒 × マージ頻度 = 実際のコストになる。以下のタイミングで実行する:
  - 手動トリガー（`gh workflow run`）。
  - 夜間 cron。
  - リリースタグ付け前。
- ステージ 1、2、4、6 とハーネスはプッシュのたびに実行する。合計予算: 15 秒以内。

### カバレッジレポート

リリースごとに `docs/COVERAGE_REPORT_<date>.md` を管理する。ケースごとのテーブルを更新し、加重パイプライン平均を記載する。Yujin のリファレンスは `yujin.app/nac-spec/docs/COVERAGE_REPORT_2026_05_10.md` にある。

---

## 4. 避けるべきアンチパターン

1. **LLM アクションの内容をアサートする。** 非決定論的なため NG。VALUES ではなく SHAPE をテストする。
2. **ステージ 5 で DOM をモックする。** ステージ 5 は実際の DOM ミューテーションを検証するもの。シムではなく Playwright を使う。
3. **ステージ単位ではなく行単位のカバレッジ。** コードの行カバレッジはパイプラインが正しく動作するかどうかを何も示さない。ステージマトリクスを使う。
4. **ステージ 4 のハッピーパスのみ。** `not_found` と無効な入力はコントラクトの半分を占める。
5. **ステージ 6 をスキップする。** ack イベントはアダプターコードの中でスペック違反が最も多い部分。emit するすべてのファミリーをテストする。
6. **アンチバグガードなし。** アプリで修正した本番バグはすべて永続的なリグレッションテストとして残す。'cambia de pestana' のケースは永遠にステージ 2 に残る。
7. **プッシュのたびにライブテストを実行する。** コストを消費し、サードパーティの変動でフレーキーになる。

---

## 5. ケーススタディ -- Yujin リファレンススイート

以下のテストソースリンクはすべて GitHub 上の正規ファイルを指している。

| スイート | ソース | テスト数 | 時間 |
|-------|--------|-------|------|
| smoke | [packages/nac/test/smoke.mjs](https://github.com/pkuschnirof/rpaforce-crm/blob/main/packages/nac/test/smoke.mjs) | 36 | < 1s |
| v22 | [packages/nac/test/v22.mjs](https://github.com/pkuschnirof/rpaforce-crm/blob/main/packages/nac/test/v22.mjs) | 14 | < 1s |
| v23-interop | [packages/nac/test/v23-interop.mjs](https://github.com/pkuschnirof/rpaforce-crm/blob/main/packages/nac/test/v23-interop.mjs) | 14 | < 2s |
| stage1-audio | [packages/nac/test/stage1-audio.mjs](https://github.com/pkuschnirof/rpaforce-crm/blob/main/packages/nac/test/stage1-audio.mjs) | 33 | < 1s |
| stage2-disambiguation | [packages/nac/test/stage2-disambiguation.mjs](https://github.com/pkuschnirof/rpaforce-crm/blob/main/packages/nac/test/stage2-disambiguation.mjs) | 31 | < 1s |
| stage3-backend (ライブ) | [packages/nac/test/stage3-backend.mjs](https://github.com/pkuschnirof/rpaforce-crm/blob/main/packages/nac/test/stage3-backend.mjs) | 約 150（10 ロケール × 3 プロンプト） | 約 120s |
| stage4-calls | [packages/nac/test/stage4-calls.mjs](https://github.com/pkuschnirof/rpaforce-crm/blob/main/packages/nac/test/stage4-calls.mjs) | 31 | 約 2s |
| stage6-ack | [packages/nac/test/stage6-ack.mjs](https://github.com/pkuschnirof/rpaforce-crm/blob/main/packages/nac/test/stage6-ack.mjs) | 16 | < 1s |
| stage6b-longtail | [packages/nac/test/stage6b-longtail.mjs](https://github.com/pkuschnirof/rpaforce-crm/blob/main/packages/nac/test/stage6b-longtail.mjs) | 14 | < 1s |
| TTS コーパスジェネレーター | [packages/nac/test/fixtures/voice/generate.mjs](https://github.com/pkuschnirof/rpaforce-crm/blob/main/packages/nac/test/fixtures/voice/generate.mjs) | -- | ワンショット |
| TTS コーパスカタログ | [packages/nac/test/fixtures/voice/corpus.json](https://github.com/pkuschnirof/rpaforce-crm/blob/main/packages/nac/test/fixtures/voice/corpus.json) | 30 プロンプト | -- |
| ハーネス | [tools/nac/test-launch.sh](https://github.com/pkuschnirof/rpaforce-crm/blob/main/tools/nac/test-launch.sh) | 5 レイヤー | 約 10s |
| **Node サイド合計** | | **259+** | **約 10s + 120s オプトイン** |

加えて 16 件の Playwright e2e スペック（約 54s）:

| スペック | ソース | テスト数 | タグ |
|------|--------|-------|-----|
| 01-landing | [tests/e2e-nac/specs/01-landing.spec.ts](https://github.com/pkuschnirof/rpaforce-crm/blob/main/tests/e2e-nac/specs/01-landing.spec.ts) | 2 | @demos |
| 02-demo-v19 | [tests/e2e-nac/specs/02-demo-v19.spec.ts](https://github.com/pkuschnirof/rpaforce-crm/blob/main/tests/e2e-nac/specs/02-demo-v19.spec.ts) | 1 | @demos |
| 03-demo-v20 | [tests/e2e-nac/specs/03-demo-v20.spec.ts](https://github.com/pkuschnirof/rpaforce-crm/blob/main/tests/e2e-nac/specs/03-demo-v20.spec.ts) | 2 | @demos |
| 04-demo-v21-datatable | [tests/e2e-nac/specs/04-demo-v21-datatable.spec.ts](https://github.com/pkuschnirof/rpaforce-crm/blob/main/tests/e2e-nac/specs/04-demo-v21-datatable.spec.ts) | 3 | @demos |
| 05-demo-v22-interop | [tests/e2e-nac/specs/05-demo-v22-interop.spec.ts](https://github.com/pkuschnirof/rpaforce-crm/blob/main/tests/e2e-nac/specs/05-demo-v22-interop.spec.ts) | 1 | @demos |
| 06-demo-react-study-case | [tests/e2e-nac/specs/06-demo-react-study-case.spec.ts](https://github.com/pkuschnirof/rpaforce-crm/blob/main/tests/e2e-nac/specs/06-demo-react-study-case.spec.ts) | 2 | @study |
| 07-demo-angular-study-case | [tests/e2e-nac/specs/07-demo-angular-study-case.spec.ts](https://github.com/pkuschnirof/rpaforce-crm/blob/main/tests/e2e-nac/specs/07-demo-angular-study-case.spec.ts) | 2 | @study |
| 08-pipeline-end-to-end | [tests/e2e-nac/specs/08-pipeline-end-to-end.spec.ts](https://github.com/pkuschnirof/rpaforce-crm/blob/main/tests/e2e-nac/specs/08-pipeline-end-to-end.spec.ts) | 3 | @e2e |
| 設定 | [tests/e2e-nac/playwright.config.ts](https://github.com/pkuschnirof/rpaforce-crm/blob/main/tests/e2e-nac/playwright.config.ts) | -- | -- |
| **Playwright 合計** | | **16** | |

**総合計: 205+ テスト**。チャット入力から ack イベントまでのフルパイプラインをカバーし、加重平均カバレッジは **95%**。

### ステージ別カバレッジ（Yujin リファレンス、2026-05-11）

| ステージ | カバーするスイート | カバレッジ |
|-------|---------------------|----------|
| 1 Comunicacion | stage1-audio.mjs | 85% |
| 2 Desambiguacion | stage2-disambiguation.mjs | 95% |
| 3 Intencion | stage3-backend.mjs（ライブ LLM） | 85% |
| 4 Llamada | stage4-calls.mjs | 95% |
| 5 Resultado | tests/e2e-nac/specs/*.spec.ts（Playwright） | 95% |
| 6 Ack | stage6-ack.mjs + stage6b-longtail.mjs | 100% |
| Interop (v2.3) | v23-interop.mjs + 05-demo-v22-interop.spec.ts | 100% |
| Constructor (V22-01) | v22.mjs | 100% |
| bindAction (V22-02) | v22.mjs | 100% |
| **加重平均** | | **約 95%** |

### テストコーパスが発見したバグ

開発中にテストコーパスが実際のランタイムバグを 2 件発見し、同一ブランチで修正された:

1. **`tab_by_label` マッチャーが緩すぎる。** 元の実装は双方向の `indexOf` マッチを受け入れていた。`label_i18n` に 1 文字のフィラーラベル（`'a'`）があると、1 文字以上のクエリすべてにマッチしてしまう。ステージ 2 のテスト B4 が検出。修正: 部分マッチには候補とクエリの両方が 3 文字以上であることを要求し、完全一致は常に許可する。

2. **`list_registered_plugins` イントロスペクションヘルパーの欠落。** interop レイヤーの `export_tree` はマニフェストレジストリをイテレートしてペイロードを生成する。ランタイムには DOM マウント状態に依存しない、登録済みプラグインを一覧表示するパブリック API がなかった。v23-interop スイートの作成中に発見。修正: `Object.keys(_manifests)` を返す `NAC.list_registered_plugins()` を追加。

両修正とも同一ブランチで `js/nac.js` にリリース済み。

### アダプター向けプレイブック -- このスイートを採用する

1. **まずテストインフラをコピーする。** `packages/nac/test/` のシム・ヘルパー・ハーネス。既存テストを実行して動作を確認する。
2. **テストコーパスをアプリの対象に置き換える。** 自分のプラグインスラッグ、動詞、データテーブルに差し替える。パイプラインステージの構成は維持する。
3. **TTS コーパスを生成する。** `packages/nac/test/fixtures/voice/generate.mjs` を使い、Google Cloud TTS または ElevenLabs のキーを環境変数で渡す。
4. **`tools/nac/test-launch.sh` を CI に組み込む。** レイヤー 1〜5 はマージ前に実行し、バックエンドレイヤー 1b はオプトインまたは夜間実行にする。
5. **カバレッジレポートを管理する。** リリースごとに更新する。

### ライセンス

このマニュアルは NAC3 スペックの他の部分と同様に Apache-2.0 ライセンスで提供される。コピー、フォーク、再配布は自由。

---

## 6. 次のステップ

- [SPEC.md](../SPEC.md) -- Yujin がテストの基準とする正規コントラクト。
- [SECURITY.md](../SECURITY.md) -- 脅威モデルとプロベナンス。
- [COVERAGE_REPORT_2026_05_10.md](COVERAGE_REPORT_2026_05_10.md) -- ライブリファレンスレポート。
- [LAUNCH_PLAN_2026_05_10.md](LAUNCH_PLAN_2026_05_10.md) -- このテストコーパスが構築された自律 Sumi ローンチプレイブック。

*このドキュメントは NAC3 スペックとともに進化する。編集は `yujin.app/nac-spec/docs/NAC_TEST_MANUAL.md` への PR で提出すること。*

---

*This is a machine translation of the canonical English
version at `/nac-spec/docs/NAC_TEST_MANUAL.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
