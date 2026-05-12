---
translation_source: guides/IMPACT_TESTING.md
translation_source_hash: d69b8343b9c3e6a8ba3e22f198a9a6646d800f3f32a2f0446a506cb44f9e664b
translation_quality: machine_v1
translation_lang: ja
translation_date: 2026-05-11T14:43:00.611081+00:00
---

# NAC3 がテスト・QA に与える影響

**NAC3 バージョン:** 2.2 stable。
**対象読者:** テストエンジニア、QA リード、SDET、および NAC3 導入による長期的なテスト保守コストを評価している CTO。

## 要約

NAC3 の id を使用したテストコードは UI の再設計を乗り越えられる。CSS セレクターを使用したテストコードはそうではない。この一点だけで、テスト保守のコスト構造が「UI の変更に比例する」から「機能の変更に比例する」へと変わる――通常、作業量は 5〜10 倍少なくなる。

## 現状の保守コストの計算

規模のある Web アプリ向けの典型的な Selenium / Cypress / Playwright スイートには、数百のセレクターが含まれる:

```ts
await page.locator('button.btn-primary.btn-large:has-text("Save")').click();
await page.locator('div.modal > div.body > input[type="text"]:first-of-type').fill('Acme');
await page.locator('table.invoice-grid > tbody > tr:nth-child(1) > td:last-child > button').click();
```

これらのセレクターは以下の場合に壊れる:

- デザインチームが `.btn-primary` を `.btn-cta` にリネームした。
- アクセシビリティ対応のためラッパー div が追加された。
- ボタンのラベルが国際化され、es テナントのテストで "Save" が "Guardar" になった。
- グリッドレイアウトが grid-template-rows に切り替わった。
- セマンティックな意図以外のページ上のあらゆる変更。

2024〜2025 年の業界調査によると、**QA エンジニアの作業時間の 30〜50% がセレクターの保守**に費やされている。この割合はアプリの成長とともに悪化する。

## NAC3 を使った場合の保守コストの計算

```ts
await NAC.click('invoice.save');
await NAC.fill('invoice.client_name', 'Acme');
await NAC.click('invoice.line.42.delete');
```

これらの呼び出しは以下の変更を乗り越えられる:

- CSS クラスのリネーム（セレクターが CSS を参照しないため）。
- DOM ツリーの再構成（セレクターが構造を参照しないため）。
- I18n によるラベル変更（セレクターがテキストを参照しないため）。
- グリッドからフレックスへのレイアウト移行。
- コンポーネントライブラリの入れ替え。

壊れるのは以下の場合のみ:

- プロダクトチームが動詞をリネームした（`save` → `commit`）。
- ボタンが完全に削除された。

これらは **UI レベルではなく機能レベルの変更**である。プロダクションコードの更新が必要なのと同じ理由でテストの更新が必要になる。それが正しいコスト基準だ。

## 具体的な影響指標

Yujin CRM の社内データ（2025 年）より:

| 指標 | NAC 導入前 | NAC 導入後 | 変化 |
|------|-----------|-----------|------|
| Playwright スペックの平均行数 | 187 | 64 | -66% |
| リデザインスプリント後のスペック 1 件あたりの保守時間 | 4.2 時間 | 0.3 時間 | -93% |
| セレクター起因のテスト失敗（週あたり） | 38 | 2 | -95% |
| 新規 QA エンジニアのオンボーディング期間 | 3 週間 | 1 週間 | -67% |
| 作成から 6 ヶ月後、無修正でパスするテスト | 31% | 89% | +180% |

89% という数字が決定的だ。**NAC3 のテストの大多数は、通常のプロダクト進化を経ても動き続ける**。一方、セレクターベースの同等テストは腐敗していく。

## NAC3 がテスト自動化にもたらすもの

### 1. 安定したテストコーパス

2024 年に `NAC.click('invoice.save')` に対して書かれたテストは、動詞 `save` がプロダクトロードマップ上で生き残っている限り、2026 年も動作する。ボタン周辺の DOM が 3 回作り直されていても関係ない。

### 2. セレクターモードの切り替えなしにクロスブラウザ対応

CSS セレクターはエッジケース（疑似要素、フォーカスリング、shadow DOM）において Chromium / Firefox / WebKit で挙動が異なる。NAC3 はランタイムのリゾルバー経由でディスパッチするため、ブラウザに関わらず同じコードパスを使用する。

### 3. I18n に依存しないテスト

多ロケール対応アプリでは、"Save" / "Guardar" / "Speichern" はすべて同じボタンであるため、今日のテストスイートはロケールごとの実行が必要になる。NAC3 ではテストが id を呼び出し、ランタイムがロケールをまたいで解決する。**テストを 1 つ書けば、10 ロケールで実行できる**（ごとに 1 つ）。

### 4. LLM によるテスト作成支援

`NAC.describe()` を参照できる LLM は、散文による説明からテストスペックを完全に生成できる。「行を追加してから削除すると、テーブルが初期状態に戻ることをテストせよ」という指示に対して、LLM が NAC.* 呼び出しを出力し、人間がレビューしてコミットする。Yujin CRM にはこの方法で作成されレビュー後にマージされたスペックが約 250 件ある。

### 5. ディスカバリーによるセルフヒーリングテスト

id がリネームされてテストが失敗した場合:

```ts
try {
  await NAC.click('invoice.save');
} catch (e) {
  if (e.code === 'not_found') {
    // 再探索する。動詞 'save' が新しい id の下にある可能性がある。
    const r = await NAC.click_by_verb('invoice', 'save');
    if (r.ok) console.warn('id has changed; update test');
  }
}
```

ランタイムの `click_by_verb` はセルフヒーリングのフォールバックを提供し、「このテストは更新が必要だが、アクション自体は動作している」という状態を表面化する。「セレクターが見つからない、以上」よりはるかに優れた失敗モードだ。

### 6. マニフェストからのテスト生成

`NAC.validate_global({probe: true})` は `role="action"` を持つすべての要素に対してクリックを合成し、5 秒以内に正規の ack イベントが発行されることを検証する。**これはアプリ全体のクリッカブルなサーフェスに対する自動生成スモークテストだ**。CI で実行することで、適切な ack 発行なしにマウントされたボタンを検出できる。

### 7. ステージ別のパイプラインカバレッジ

Yujin のリファレンステストスイート（NAC_TEST_MANUAL.md）は、NAC3 パイプラインのステージ別にテストを整理している:

- ステージ 1（STT 入力）
- ステージ 2（曖昧性解消）
- ステージ 3（LLM 仲介）
- ステージ 4（NAC.* 呼び出し）
- ステージ 5（DOM 副作用）
- ステージ 6（Ack イベント）

カバレッジはコード行単位ではなく**ステージ単位**で計測される。Yujin のリファレンスは全ステージの加重平均で約 95% を報告している。このスキーマを採用することで、コントラクトに直接対応したカバレッジスコアカードが得られる。

## 既存のテストフレームワークへの影響

### Playwright

直接統合できる。`page.evaluate()` で `NAC.*` 呼び出しを実行する。セレクターはレイアウトアサーションのフォールバックとして残す。Yujin リファレンスには `tests/e2e-nac/specs/` に 16 件の Playwright スペックが含まれている。

### Cypress

`cy.window().then(win => win.NAC.click(id))` というパターンで使用する。カスタムコマンドで NAC 呼び出しをラップする: `cy.nacClick('invoice.save')`。

### Selenium

JavaScript エグゼキューター経由: `driver.execute_script('return window.NAC.click(arguments[0])', 'invoice.save')`。

### Jest + React Testing Library

```ts
import '@nac3/runtime';
import { render } from '@testing-library/react';
import { App } from './App';

test('save works', async () => {
  render(<App />);
  await window.NAC.click('invoice.save');
  expect(mockApi.save).toHaveBeenCalled();
});
```

NAC3 は React Testing Library と対立するのではなく、並列して機能する。

### Karma / Jasmine / 旧来のランナー

`window.NAC` 経由で直接インジェクションする。ブラウザコンテキストで JavaScript を実行できるものであれば何でも動作する。

## 導入コスト

### 既存アプリへの適用

[マイグレーションプレイブック](AI_PLAYBOOK_MIGRATION.md) に基づく目安:

- デコレーションとマニフェスト作成: 画面 1 枚あたり約 1 日。
- テストコーパスの移行: 画面 1 枚あたり約 1 日。
- 20 画面のアプリの合計: エンジニア 1 人で約 6 週間。保守コストの削減により 3〜4 ヶ月で回収できる。

### 新規アプリへの適用

最初から組み込む。グリーンフィールドのプレイブックでは NAC3 属性をファーストクラスの関心事として扱う。リトロフィットコストはゼロ。

## リスクと対策

### リスク――「LLM が生成したテストは信頼できない」

もっともな懸念だ。LLM は候補を生成し、人間がレビューしてコミットする。Copilot と同じワークフローだ。リリースされるコーパスはチームが承認したものであり、LLM が書いたものそのままではない。

### リスク――「NAC の id が時間とともに技術的負債になる」

放置すれば確かにそうなる。NAC の id をデータベースのカラム名と同様に扱うこと: マイグレーションを通じてリネームし、稼働中に削除しない。`@nac3/runtime` CLI が静的リントで孤立した id を検出する。

### リスク――「NAC の普及が止まったら？」

スペックは Apache-2.0 だ。ランタイムは 200KB 未満。最悪のケースでも: アーティファクトを自社で保有し、id は安定したまま残る。最悪のケースでも CSS セレクターよりはましだ。

## 関連ドキュメント

- [NAC_TEST_MANUAL.md](../docs/NAC_TEST_MANUAL.md) ――この影響分析が根拠とする標準化されたテストプレイブック。
- [RPA_UIPATH.md](RPA_UIPATH.md) /
  [RPA_AUTOMATION_ANYWHERE.md](RPA_AUTOMATION_ANYWHERE.md) /
  [RPA_BLUE_PRISM.md](RPA_BLUE_PRISM.md) ――同じコントラクトの隣接する応用例。
- [COVERAGE_REPORT_2026_05_10.md](../docs/COVERAGE_REPORT_2026_05_10.md)
  ――Yujin リファレンス自身のカバレッジ数値。

## ライセンス

Apache-2.0。

---

*This is a machine translation of the canonical English
version at `/nac-spec/guides/IMPACT_TESTING.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
