---
translation_source: guides/RPA_PLAYWRIGHT.md
translation_source_hash: c90a4cc097a692f6fd51ae96eed88a67cadbd94b52bed4bba18af184a4b915bf
translation_quality: machine_v1
translation_lang: ja
translation_date: 2026-05-11T14:46:42.204936+00:00
---

# NAC3 + Playwright 統合ガイド

**NAC3 バージョン:** 2.2（v2.3 interop プレビュー対応）
**ステータス:** 安定版。Playwright 1.47 + chromium / firefox / webkit で動作確認済み。

Playwright は現在のブラウザ自動化における事実上の標準であり、QA チームのエンドツーエンドテストや、無人実行される軽量 RPA フローの両方で広く使われています。NAC3 と組み合わせることで、Playwright スクリプトは CSS セレクターや XPath を直接ターゲットにするのをやめ、ページの NAC3 コントラクトを通じてディスパッチするようになります。このコントラクトは、音声ランナー・アクセシビリティツール・エージェント型 LLM ワークフロー・本ガイドシリーズで紹介する他の RPA プラットフォームでも共通して使用されます。

Yujin リファレンステストスイート（`tests/e2e-nac/specs/*.spec.ts`）が標準的な実装例です。

## NAC3 + Playwright を使う理由

| 従来の課題 | NAC3 による解決 |
|--------------|---------|
| `page.click('button.save')` は CSS クラス名が変わると壊れる | `page.evaluate(() => window.NAC.click('invoice.save'))` は安定している |
| `page.getByRole('button', {name: 'Save'})` はローカライズで壊れる | ラベルではなく id でディスパッチ。label_i18n は LLM が担当 |
| `waitForSelector` は DOM をポーリングするため、非同期 UI で不安定になる | `nac:action:succeeded` は決定論的なイベント |
| ページオブジェクトパターンはアプリの UI 構造を重複させる | NAC3 マニフェスト自体がページオブジェクト――テストとアプリで共有される |
| ビジュアルテストはデザイン変更のたびに壊れる | NAC3 id を使った振る舞いテストはデザイン変更に耐える |

---

## 2 つの統合パス

### パス A -- `page.evaluate` インジェクション（推奨）

最もシンプルなパターン：すべての操作をページコンテキスト内で評価される `window.NAC` を通じて行います。

```ts
import { test, expect } from '@playwright/test';

test('save an invoice', async ({ page }) => {
  await page.goto('https://your-app.example.com/');

  // Wait for NAC3 to mount.
  await page.waitForFunction(() => window.NAC?.describe);

  // Fill a field.
  await page.evaluate(() =>
    window.NAC.fill('invoice.amount', '1500')
  );

  // Click an action + wait for its ack.
  const ackPromise = page.evaluate(() =>
    new Promise(resolve => {
      document.addEventListener(
        'nac:action:succeeded',
        e => resolve(e.detail),
        { once: true }
      );
    })
  );
  await page.evaluate(() =>
    window.NAC.click('invoice.save')
  );
  const ack = await ackPromise;

  expect(ack).toMatchObject({
    plugin: 'invoice',
    action_id: 'invoice.save'
  });
});
```

### パス B -- NAC をラップするカスタムフィクスチャ

ボイラープレートを Playwright フィクスチャにまとめます：

```ts
// tests/fixtures/nac.ts
import { test as base, Page } from '@playwright/test';

type NacApi = {
  click: (id: string) => Promise<void>;
  fill:  (id: string, value: string) => Promise<void>;
  tab:   (plugin: string, tabKey: string) => Promise<void>;
  describe: () => Promise<any>;
  waitForAck: () => Promise<any>;
};

export const test = base.extend<{ nac: NacApi }>({
  nac: async ({ page }, use) => {
    await page.waitForFunction(() => window.NAC?.describe);
    const api: NacApi = {
      click:  id => page.evaluate(i => window.NAC.click(i), id),
      fill:   (id, v) => page.evaluate(
        ([i, val]) => window.NAC.fill(i, val), [id, v]
      ),
      tab:    (p, k) => page.evaluate(
        ([pl, key]) => window.NAC.tab(pl, key), [p, k]
      ),
      describe: () => page.evaluate(() => window.NAC.describe()),
      waitForAck: () => page.evaluate(() =>
        new Promise(resolve => {
          document.addEventListener(
            'nac:action:succeeded',
            e => resolve(e.detail),
            { once: true }
          );
        })
      )
    };
    await use(api);
  }
});

export { expect } from '@playwright/test';
```

これにより、テストコードがアプリケーションの言葉で書けるようになります：

```ts
import { test, expect } from './fixtures/nac';

test('save flow', async ({ page, nac }) => {
  await page.goto('https://your-app.example.com/');
  await nac.fill('invoice.amount', '1500');

  const ackPromise = nac.waitForAck();
  await nac.click('invoice.save');
  const ack = await ackPromise;

  expect(ack.action_id).toBe('invoice.save');
});
```

Yujin リファレンスはパス B を採用しています（`tests/e2e-nac/specs/01-landing.spec.ts` 参照）。

---

## 動詞ベースのディスパッチ（クロスアプリ再利用に推奨）

同じ Playwright スイートを複数のデプロイメント（テナントやブランドが異なるが、コントラクトは同じ）に対して実行する場合は、id よりも動詞を優先してください：

```ts
await nac.clickByVerb('invoice', 'save');
```

ヘルパー：

```ts
clickByVerb: (plugin: string, verb: string) =>
  page.evaluate(
    ([p, v]) => window.NAC.click_by_verb(p, v),
    [plugin, verb]
  )
```

マニフェストのコントラクト：各テナントは `invoice.save`（またはローカルで選んだ任意の id）を動詞 `save` にマッピングします。テストはローカル id を知る必要がありません。

---

## ack の待機（`waitForSelector` に代わる決定論的な方法）

従来の Playwright：

```ts
await page.click('button.save');
await page.waitForSelector('.toast-success', { timeout: 5000 });
```

これは脆弱です。トーストの UI が変わるだけで壊れます。

NAC3 対応版：

```ts
const ack = await new Promise(resolve => {
  page.on('console', msg => { /* optional log */ });
  page.evaluate(() => new Promise(r =>
    document.addEventListener('nac:action:succeeded',
      e => r(e.detail), { once: true }
    )));
}).then(...);

// フィクスチャを使う場合:
const ackPromise = nac.waitForAck();
await nac.click('invoice.save');
const ack = await ackPromise;
```

このイベントはコントラクトの一部です。任意のトーストが描画されたタイミングではなく、副作用が完了したタイミングで発火します。

---

## テストケースの自動検出

NAC3 の `describe()` は要素カタログ全体を返します。これを使って、すべてのアクションのテストスキャフォールディングを自動生成できます：

```ts
test('smoke -- click every action', async ({ page, nac }) => {
  await page.goto('https://your-app.example.com/');
  const tree = await nac.describe();

  for (const plugin of tree.plugins) {
    for (const el of plugin.elements) {
      if (el.role !== 'action') continue;
      console.log('smoke clicking', el.id);
      await page.evaluate(id =>
        window.NAC.click(id), el.id
      );
    }
  }
});
```

テスト 1 本で全アクションをカバーし、アクションごとのメンテナンスはゼロです。仕様書の `validate_global({probe: true})` と組み合わせると効果的です。

---

## マルチロケール実行

コントラクトはロケール非依存なので、Playwright のマトリックス実行は簡単です：

```ts
const locales = ['es', 'en', 'pt', 'fr', 'de', 'ja',
                 'zh', 'hi', 'ar', 'it'];

for (const lang of locales) {
  test(`save invoice -- ${lang}`, async ({ page, nac }) => {
    await page.goto(`https://your-app.example.com/?lang=${lang}`);
    await nac.fill('invoice.amount', '1500');
    const ack = nac.waitForAck();
    await nac.click('invoice.save');
    expect((await ack).action_id).toBe('invoice.save');
  });
}
```

同じテストで 10 ロケールに対応。ページ内の label_i18n は変わっても、コントラクトは変わりません。

---

## ビジュアルリグレッション用スナップショット

NAC3 ツリー自体が構造的なスナップショットです。リリース間で比較できます：

```ts
test('structural snapshot', async ({ page, nac }) => {
  await page.goto('https://your-app.example.com/');
  const tree = await nac.describe();
  expect(tree).toMatchSnapshot('app-tree.json');
});
```

ボタンが 200px 移動するようなデザイン変更はスナップショットの差分に現れません。ボタンが**削除**された場合は差分に現れます。これが振る舞いグレードのリグレッションに適した粒度です。

---

## クロスオリジン / interop テスト（v2.3 プレビュー）

```ts
test('interop import remote app', async ({ page, nac }) => {
  await page.goto('https://app-a.example.com/');
  await page.evaluate(() => window.NAC.import_remote_tree({
    url: 'https://app-b.example.com/nac/export',
    bearer: 'TEST_TOKEN',
    namespace: 'b'
  }));
  const remotes = await page.evaluate(() =>
    window.NAC.list_remote_apps()
  );
  expect(remotes).toContainEqual(
    expect.objectContaining({ namespace: 'b' })
  );

  // Now dispatch into the remote app via the local NAC:
  await page.evaluate(() =>
    window.NAC.click('remote:b:invoice.save')
  );
});
```

`remote:` プレフィックスは `docs/NAC_INTEROP_MCP.md` に記載されている interop レイヤーを通じてルーティングされます。

---

## 障害モードとデバッグ

| 症状 | 診断 |
|---------|-----------|
| `window.NAC is undefined` | ページに nac.js が含まれていない――`<script>` タグを確認 |
| `NAC.click(...)` が `{ok: false, error: 'not_found'}` を返す | id がマニフェストに存在しない。`NAC.validate_global()` を実行してタイポを確認 |
| ack が発火しない（waitForAck でテストがハング） | ハンドラーに `dispatchEvent(new CustomEvent('nac:action:succeeded',...))` がない――`NAC.bindAction()`（V22-02）に移行する |
| 特定ロケールでロケール依存のラベルテストが失敗する | label_i18n にそのロケールが欠けている――仕様バリデーターで検出可能 |
| クロスオリジンテストで CORS プリフライトが失敗する | リモートピアの CORS 設定で `Origin: <your-test-host>` を許可する必要がある |

より詳細なデバッグには、以下を追加してください：

```ts
await page.evaluate(() => {
  document.addEventListener('nac:action:succeeded', e =>
    console.log('[ACK]', e.detail));
  document.addEventListener('nac:action:failed', e =>
    console.warn('[ACK-FAIL]', e.detail));
});
```

その後、`--headed` で実行してコンソールを確認します。

---

## Yujin リファレンススイート

Yujin デモには `tests/e2e-nac/specs/` に完全な Playwright スイートが付属しています。パターンを学ぶために以下の順番で読んでください：

| スペック | パターン |
|------|---------|
| `01-landing.spec.ts` | 基本的なページロード + オートパイロット起動 |
| `02-demo-v19.spec.ts` | 全ウィジェットを巡回するスモーク |
| `03-demo-v20.spec.ts` | v20 パネルのボタン + bindAction ack |
| `04-demo-v21.spec.ts` | データテーブルの dt_* ディスパッチ |
| `05-demo-v22-interop.spec.ts` | v2.3 interop フルハンドシェイク |
| `06-demo-react.spec.ts` | チャット経由の React ケーススタディ |
| `07-demo-angular.spec.ts` | チャット経由の Angular ケーススタディ |
| `08-pipeline-end-to-end.spec.ts` | チャット -> LLM -> ディスパッチ -> ack |
| `09-diagnostic.spec.ts` | 障害注入 + リカバリー |
| `10-deep-discovery.spec.ts` | 自律的な探索ループ |

全 16 スペックは `bash tools/nac/test-launch.sh` で実行でき、クリーンなチェックアウト状態で 15 秒以内に完了します。

---

## CI 統合

`.github/workflows/e2e.yml` に以下を追加してください：

```yaml
name: e2e
on: [push, pull_request]
jobs:
  playwright:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - run: npx playwright test
        env:
          BASE_URL: https://staging.your-app.example.com
```

ロケール / ブラウザ / テナントをまたいだマトリックス実行の場合：

```yaml
strategy:
  matrix:
    locale: [es, en, pt, fr, de, ja, zh, hi, ar, it]
    browser: [chromium, firefox, webkit]
```

10 ロケール × 3 ブラウザ = 30 ジョブ、すべて同じ NAC3 ディスパッチのテストコードを再利用します。

---

## 従来の Playwright テストとの比較

典型的な 100 ページ規模のエンタープライズアプリでは、約 500〜800 本の Playwright テストを管理しており、UI デザイン変更後のフレーク率は約 20% に達します。NAC3 を使うと：

| 指標 | 従来型 | NAC3 バックド |
|--------|-------------|-------------|
| 同等カバレッジのテスト数 | 約 500 本 | 約 100 本（動詞ベース） |
| デザイン変更後のフレーク率 | 約 20% | 約 2%（コントラクトが実際に壊れた場合のみ） |
| `<button>` → `<a>` 変更後のメンテナンス | セレクターを書き直す | 不要――id は安定 |
| 新ロケール対応 | ラベルベースのセレクターをすべて書き直す | 不要――ロケール非依存 |
| クロステナント再利用 | 不可能（セレクターが異なる） | 簡単（動詞ベース） |

---

## 関連情報

- `tests/e2e-nac/specs/` -- リファレンススイート
- `tools/nac/test-launch.sh` -- オーケストレーター
- [IMPACT_TESTING.md](IMPACT_TESTING.md) -- QA チーム向けの広範な影響分析
- [LLM_WIRING.md](LLM_WIRING.md) -- LLM エージェントが使用する同じディスパッチコントラクト
- `docs/NAC_TEST_MANUAL.md` -- 標準化されたテストプレイブック

## ライセンス

Apache-2.0.

---

*This is a machine translation of the canonical English
version at `/nac-spec/guides/RPA_PLAYWRIGHT.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
