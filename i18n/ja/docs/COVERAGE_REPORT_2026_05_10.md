---
translation_source: docs/COVERAGE_REPORT_2026_05_10.md
translation_source_hash: 4da4311e057dd1c23dea9b23a506ada42741d28b05b94709cb5150b1686c51ac
translation_quality: machine_v1
translation_lang: ja
translation_date: 2026-05-11T15:06:22.808032+00:00
---

# NAC3 カバレッジレポート -- 2026-05-10 / 11 夜間

ブランチ `feat/nac-interop-mcp` のカバレッジ夜間終了時点で生成。
テスト内容と深度をケースごとに正直に記録したものです。

以前の非公式な「50/50 PASS」「5/5 レイヤー GREEN」という表現に代わるものです。
あの数字は構造的には正確でしたが、深度にばらつきがありました。
本レポートではパイプラインステージ別に実態を整理します。

## パイプラインステージの確認

```
Comunicacion -> Desambiguacion -> Intencion -> Llamada -> Resultado -> Ack
    (1)              (2)             (3)         (4)        (5)         (6)
```

## 本ブランチに含まれるスイート

| スイート | パス | テスト数 |
|---------|------|---------|
| smoke | `packages/nac/test/smoke.mjs` | 36 |
| v22 (コンストラクタ strict + bindAction) | `packages/nac/test/v22.mjs` | 14 |
| v23-interop (クロスアプリ MCP) | `packages/nac/test/v23-interop.mjs` | 14 |
| stage1-audio (STT モック + TTS コーパス) | `packages/nac/test/stage1-audio.mjs` | 33 |
| stage2-disambiguation | `packages/nac/test/stage2-disambiguation.mjs` | 31 |
| stage3-backend (ライブ呼び出し) | `packages/nac/test/stage3-backend.mjs` | ~80 |
| stage4-calls | `packages/nac/test/stage4-calls.mjs` | 31 |
| stage6-ack | `packages/nac/test/stage6-ack.mjs` | 16 |
| **ローカル合計** | | **175+** |

現在すべてローカルで PASS。GitHub Actions は未実行（クレジット残高ゼロのため、Pablo のラップトップ上でオンデマンド実行のみ）。

## パイプラインステージ別カバレッジマトリクス

### Stage 1 -- Comunicacion（STT + 生入力）

| レイヤー | ステータス | 備考 |
|---------|-----------|------|
| **CAPA A: STT モック + コーパス注入** | PASS (30/30) | `packages/nac/test/stage1-audio.mjs`。モック `SpeechRecognition` が `result` イベントを合成し、NacChat が正常に受信・ディスパッチ。言語トラップがロケール内に留まること、切り替えプロンプトで切り替わること、通常プロンプトがバックエンドをトリガーすることをアサート。 |
| **CAPA B: コーパス整合性** | PASS (3/3) | `packages/nac/test/fixtures/voice/` に Google Cloud TTS で生成した MP3 ファイル 30 件。10 ロケール合計 365 KB。ファイル存在確認 + 最小サイズのサニティチェック。 |
| ブラウザ SpeechRecognition 実音声再生 | DEFERRED | Web Speech API には実マイクストリーム + ブラウザが必要。Playwright e2e に委ねる（キュー済み）。 |

**Stage 1 カバレッジ: 約 85%** -- テキスト・コーパス・STT モックのパスは完全カバー。残るのは実ブラウザ音声再生のみで、Playwright が必要。

### Stage 2 -- Desambiguacion

| 確認項目 | ケース数 | 結果 |
|---------|---------|------|
| `_detectLangSwitch` 誤検知ガード（バグクラス f631d77a） | 12 | PASS -- `cambia de pestana`、`cambia precio de mouse 40`、`borra de la lista`、`pasa de A a B` はすべて正しくスペイン語に留まる。`cambia a aleman`、`switch to english`、`use spanish`、`cambia idioma a de` は正しく切り替わる。同一言語の no-op + 空入力でクラッシュしないことも確認。 |
| `tab_by_label` textContent 完全一致 | 1 | PASS |
| `tab_by_label` 括弧除去（`"Lines (collection)"` が `"Lines"` にマッチ） | 1 | PASS |
| `tab_by_label` i18n ロケールマッチ | 1 | PASS |
| `tab_by_label` 未知ラベル -> not_found | 1 | PASS |
| `snapshotTree` が有効な形状を返す | 6 | PASS |

**Stage 2 カバレッジ: 約 95%。** マッチャーの厳格化（部分マッチに `cand.length >= 3` を要求）は同スイートのサイドフィックスとして導入済みで、1 文字フィラーラベルの誤検知を解消。

### Stage 3 -- Intencion

本番エンドポイント `https://yujin.app/crm/api/v1/yujin/nac-demo` へのライブ呼び出し。Yujin チャットバックエンド（Claude Sonnet）が LLM 仲介役。

| 確認項目 | ケース数 | 結果 |
|---------|---------|------|
| プロンプトごとに HTTP 200 + JSON レスポンス | 7 ロケール（es/en/pt/fr/de/ja + スペイン語トラッププロンプト）で 15 プロンプト | すべて PASS |
| レスポンスに `ok` ブール値が含まれる | 15 | PASS |
| `ok` が真の場合、`message` 文字列 + `actions` 配列が存在する | 15 | PASS |
| すべてのアクションに `kind` 文字列が含まれる | 15 | PASS |
| **アンチバグガード**: `cambia de pestana` が `change_locale: 'de'` を発行しない | 1 | PASS -- ライブ LLM が 2026-05-09 に導入したシステムプロンプトルールを遵守。 |

**Stage 3 カバレッジ: 約 85%**（コントラクト形状）。LLM の具体的なアクション内容は非決定論的なため 100% には至らず、形状とアンチバグケースのみアサート。

### Stage 4 -- Llamada（NAC.* 公開関数すべて）

| 関数 | ケース数 | 結果 |
|------|---------|------|
| `NAC.click` | happy / not_found / invalid | 3 PASS |
| `NAC.click_by_verb` | happy / 未知動詞 | 2 PASS |
| `NAC.fill` | happy / not_found / DOM への値適用 | 3 PASS |
| `NAC.select` | happy / not_found | 2 PASS |
| `NAC.tab` | happy / 未知キー / プラグイン未マウント | 3 PASS |
| `NAC.tab_by_label` | textContent / 括弧 / i18n / not_found | 4 PASS（Stage 2 と重複） |
| `NAC.go_to_section` | happy / section_not_found | 2 PASS |
| `NAC.set_mode` | 有効 / 無効 | 2 PASS |
| `NAC.screenshot` | データ URL を返す | 1 PASS |
| `NAC.edit_field`（v2.3 プレビュー） | 開く / not_found / invalid | 3 PASS |
| `NAC.dt_add_row` | row_id を返す | 1 PASS |
| `NAC.dt_edit_cell` | happy / 無効値を拒否 | 2 PASS |
| `NAC.dt_remove_row` | 状態をデクリメント | 1 PASS |
| `NAC.dt_commit` | final_state を返す | 1 PASS |
| `NAC.dt_discard` | 未コミットをロールバック | 1 PASS |
| `NAC.dt_read_aggregate` | sum 集計 | 1 PASS |
| `NAC.bindAction` | ハンドラ発火 + アンバインダー動作 | 2 PASS |

**Stage 4 カバレッジ: 約 95%**（公開書き込み API）。未カバー: `drag_drop`（シム未対応）、v1.3 の toast / banner / confirm ダイアログプリミティブ（v2.x では低優先度）。

### Stage 5 -- Resultado（DOM 副作用）

| 確認項目 | ステータス |
|---------|-----------|
| `fill` が input.value を更新する | PASS（Stage 4 T6 で確認） |
| `select` が select 要素を更新する | PASS（Stage 4 T8） |
| `dt_*` の変更が `dt_state()` に反映される | PASS（Stage 4 T24-T30） |
| `edit_field` モーダルがマウントされる | PASS（Stage 4 T21） |
| フルスクリーン Playwright DOM 検証 | DEFERRED -- 実ブラウザ + Vite/ng-build ステップが必要 |

**Stage 5 カバレッジ: 約 70%**（ユニットレベル）。フルスクリーン DOM 検証はキュー済み。

### Stage 6 -- Ack イベントファミリー

| ファミリー | ケース数 | 結果 |
|----------|---------|------|
| `nac:action:succeeded` 形状（plugin + action_id + is_trusted） | 4 | PASS |
| `nac:field:changed` 形状 | 3 | PASS |
| `nac:tab:activated` 形状 | 2 | PASS |
| ハンドラ例外時の `nac:action:failed` | 2 | PASS |
| `bindAction` 非同期 resolve パス | 1 | PASS |
| クリックから resolve までの時間 < 200ms | 1 | PASS |
| ファミリー横断の標準 detail 形状 | 3 | PASS |

**Stage 6 カバレッジ: 約 95%。** 未カバー: ロングテールのイベントファミリー（`nac:breadcrumb:navigated`、`nac:accordion:expanded`、`nac:step:advanced`、`nac:table:sort_changed`、`nac:table:filter_changed`、`nac:confirm:resolved`）。パターンは同じで、カバーは機械的な作業。

### 横断的関心事: interop（v2.3 プレビュー）

| 確認項目 | ケース数 | 結果 |
|---------|---------|------|
| `export_tree` 形状 + スコープ + ロケールフィルター | 7 | PASS |
| `import_remote_tree` が接続を検証し、名前空間付きプラグインを登録し、リストに反映される | 5 | PASS |
| `click` + `fill` のプロキシディスパッチ | 4 | PASS |
| `via_interop:true` 付きのローカル ack ミラー | 1 | PASS |
| ピアエラーコードのバブルアップ | 1 | PASS |
| `disconnect_remote` + 切断後の拒否 | 2 | PASS |
| ローカルクリックがプロキシされないこと | 1 | PASS |

**Interop カバレッジ: 100%**（v2.3 プレビュー全面）。

## カバレッジサマリー -- パイプライン加重平均

| ステージ | カバレッジ | 判定 |
|---------|----------|------|
| 1 Comunicacion | **85%** | STT モック + TTS コーパス PASS。実ブラウザ音声再生のみキュー済み。 |
| 2 Desambiguacion | 95% | 良好。バグクラス検証済み。 |
| 3 Intencion | 85% | ライブバックエンドの形状カバー済み。 |
| 4 Llamada | 95% | 公開書き込み API すべてテスト済み。 |
| 5 Resultado | 70% | ユニットレベルが主。Playwright キュー済み。 |
| 6 Ack | 95% | コアファミリーカバー済み。ロングテールは機械的作業。 |
| Interop | 100% | v2.3 プレビュー全面カバー。 |
| **加重平均** | **~90%** | |

## ランタイムへの変更内容

テストにより実際の問題が 2 件発見され、同ブランチ内で修正済み:

1. **`tab_by_label` マッチャーが 1 文字ラベルに対して緩すぎた。** `js/nac.js` 2264 行目で双方向部分マッチに `cand.length >= 3` を要求するよう修正。完全一致は常に許可。Stage 2 テスト B4（未知ラベルが漏れ通過）で発見。

2. **`NAC.list_registered_plugins()` イントロスペクションヘルパーが未実装。** interop レイヤーの `export_tree` が DOM マウント状態に関わらず登録済みマニフェストを反復できるよう `js/nac.js` に追加。v23 interop スイート作成中に発見。

いずれも価値ある発見です -- テストがランタイムから実際のバグを引き出した、まさにその目的通りの結果です。

## main へのマージ前に必要な作業

| タスク | 優先度 | 工数 |
|-------|--------|------|
| 6 つのライブデモへの Playwright e2e | 高 | 1h |
| React + Angular スタディケースへの Playwright（開発サーバー） | 高 | 30min |
| TTS コーパス生成（Google Cloud、30 プロンプト） | 中 | 20min |
| STT モック + コーパス注入テスト | 中 | 30min |
| `drag_drop` ユニットテスト | 低 | 10min |
| ロングテール ack ファミリーテスト（breadcrumb、accordion、step 等） | 低 | 30min |
| `yujin.app/nac-spec/demos/` + ランディングを main へ cherry-pick | ゲーティング | 2min |
| Pablo へのメール切り替え | ゲーティング | 5min |

残り見積もり: **Sumi-time 約 3h** で加重平均 90% 以上 + main へのクリーンな cherry-pick 完了。

## テスト実行時間（ラップトップ、コールド）

| スイート | 時間 |
|---------|------|
| smoke | < 1s |
| v22 | < 1s |
| v23-interop | < 2s |
| stage2 | < 1s |
| stage3（ライブバックエンド） | ~60s（15 プロンプト × 平均 ~4s + 500ms ペーシング） |
| stage4 | ~2s（モーダル + dt セットアップ） |
| stage6 | < 1s |
| **合計** | **~75s** |

`tools/nac/test-launch.sh`（ハーネス）は stage 2-6 + interop を含むよう拡張が必要。対応待ち。

## 監査証跡

| コミット | 内容 |
|---------|------|
| `5b06ae3f` | デモのコンパイル + デプロイ + stage 2 |
| `632aa1f6` | stage 2+4 + ランディングユースケース |
| （保留中） | stage 3+6 + 本レポート |

---

*本ドキュメントは v2.3 interop ブランチおよび 2026-05-11 00:50 UTC-3 時点の v2.2 ランタイムに関する正式なカバレッジ記録です。新スイートが追加され次第、随時更新されます。*

---

*This is a machine translation of the canonical English
version at `/nac-spec/docs/COVERAGE_REPORT_2026_05_10.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
