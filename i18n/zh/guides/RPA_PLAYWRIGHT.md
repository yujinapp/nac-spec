---
translation_source: guides/RPA_PLAYWRIGHT.md
translation_source_hash: c90a4cc097a692f6fd51ae96eed88a67cadbd94b52bed4bba18af184a4b915bf
translation_quality: machine_v1
translation_lang: zh
translation_date: 2026-05-11T14:55:38.749158+00:00
---

# NAC3 + Playwright 集成指南

**NAC3 版本：** 2.2（含 v2.3 互操作预览）
**状态：** 稳定。已针对 Playwright 1.47 + chromium / firefox / webkit 完成测试。

Playwright 是当今浏览器自动化的事实标准，广泛用于 QA 团队的端到端测试以及无人值守的轻量级 RPA 流程。引入 NAC3 后，你的 Playwright 脚本不再需要针对 CSS 选择器或 XPath，而是通过页面的 NAC3 契约进行调度——这套契约同样被语音运行器、无障碍工具、智能体 LLM 工作流以及本系列指南中的其他 RPA 平台所共用。

Yujin 参考测试套件（`tests/e2e-nac/specs/*.spec.ts`）是最权威的示例。

## 为什么选择 NAC3 + Playwright

| 当前痛点 | NAC3 解决方案 |
|--------------|---------|
| `page.click('button.save')` 在 CSS 类名重命名后失效 | `page.evaluate(() => window.NAC.click('invoice.save'))` 保持稳定 |
| `page.getByRole('button', {name: 'Save'})` 在本地化后失效 | 按 id 调度，而非标签；label_i18n 是 LLM 关心的事 |
| `waitForSelector` 轮询 DOM，在异步 UI 上容易出现不稳定 | `nac:action:succeeded` 是确定性事件 |
| Page Object 模式与应用 UI 结构重复 | NAC3 清单本身就是 Page Object——在测试与应用之间共享 |
| 视觉测试因外观重设计而频繁变动 | 基于 NAC3 id 的行为测试在重设计后依然有效 |

---

## 两种集成路径

### 路径 A——`page.evaluate` 注入（推荐）

最简单的模式：所有交互都通过在页面上下文中执行的 `window.NAC` 完成。

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

### 路径 B——封装 NAC 的自定义 fixtures

将样板代码封装到 Playwright fixture 中：

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

这样你的测试读起来就像应用本身在说话：

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

Yujin 参考套件采用路径 B（参见 `tests/e2e-nac/specs/01-landing.spec.ts`）。

---

## 基于动词的调度（跨应用复用的首选方式）

当同一个 Playwright 套件需要在多个部署环境（不同租户、不同品牌、相同契约）中运行时，优先使用动词而非 id：

```ts
await nac.clickByVerb('invoice', 'save');
```

辅助函数：

```ts
clickByVerb: (plugin: string, verb: string) =>
  page.evaluate(
    ([p, v]) => window.NAC.click_by_verb(p, v),
    [plugin, verb]
  )
```

清单契约：每个租户将 `invoice.save`（或其选择的本地 id）映射到动词 `save`。测试无需知道本地 id。

---

## 等待 ack（`waitForSelector` 的确定性替代方案）

传统 Playwright 写法：

```ts
await page.click('button.save');
await page.waitForSelector('.toast-success', { timeout: 5000 });
```

这种写法很脆弱：toast 的任何 UI 变更都会导致测试失败。

NAC3 感知写法：

```ts
const ack = await new Promise(resolve => {
  page.on('console', msg => { /* optional log */ });
  page.evaluate(() => new Promise(r =>
    document.addEventListener('nac:action:succeeded',
      e => r(e.detail), { once: true }
    )));
}).then(...);

// 或使用 fixture：
const ackPromise = nac.waitForAck();
await nac.click('invoice.save');
const ack = await ackPromise;
```

该事件是契约的一部分，在副作用完成时触发，而不是在某个任意的 toast 渲染时触发。

---

## 自动发现测试用例

NAC3 的 `describe()` 返回完整的元素目录，可用于自动为每个 action 生成测试脚手架：

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

一个测试，覆盖所有 action，零维护成本。与规范中的 `validate_global({probe: true})` 完美配合。

---

## 多语言运行

Playwright 矩阵运行非常简单：契约与语言无关。

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

同一套测试，10 种语言。页面内的 label_i18n 发生了变化，契约没有。

---

## 快照用于视觉回归测试

NAC3 树本身就是结构快照，可跨版本进行比对：

```ts
test('structural snapshot', async ({ page, nac }) => {
  await page.goto('https://your-app.example.com/');
  const tree = await nac.describe();
  expect(tree).toMatchSnapshot('app-tree.json');
});
```

将按钮移动 200px 的重设计**不会**产生快照差异。**删除**按钮的重设计才会。这正是行为级回归测试所需的粒度。

---

## 跨域 / 互操作测试（v2.3 预览）

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

`remote:` 前缀通过互操作层进行路由，详见 `docs/NAC_INTEROP_MCP.md`。

---

## 故障模式与调试

| 现象 | 诊断 |
|---------|-----------|
| `window.NAC is undefined` | 页面未引入 nac.js——检查 `<script>` 标签 |
| `NAC.click(...)` 返回 `{ok: false, error: 'not_found'}` | id 不在清单中；运行 `NAC.validate_global()` 查找拼写错误 |
| Ack 始终不触发（测试卡在 waitForAck） | 处理器缺少 `dispatchEvent(new CustomEvent('nac:action:succeeded',...))` ——迁移到 `NAC.bindAction()`（V22-02） |
| 某个语言的标签相关测试失败 | label_i18n 缺少该语言——规范验证器会捕获此问题 |
| 跨域测试在 CORS 预检时失败 | 远端节点必须在其 CORS 配置中允许 `Origin: <your-test-host>` |

如需深入调试，添加以下代码：

```ts
await page.evaluate(() => {
  document.addEventListener('nac:action:succeeded', e =>
    console.log('[ACK]', e.detail));
  document.addEventListener('nac:action:failed', e =>
    console.warn('[ACK-FAIL]', e.detail));
});
```

然后以 `--headed` 模式运行并观察控制台输出。

---

## Yujin 参考套件

Yujin 示例附带了完整的 Playwright 套件，位于 `tests/e2e-nac/specs/`。按以下顺序阅读以学习各种模式：

| 规范文件 | 模式 |
|------|---------|
| `01-landing.spec.ts` | 基本页面加载 + 自动驾驶启动 |
| `02-demo-v19.spec.ts` | 遍历所有组件的冒烟测试 |
| `03-demo-v20.spec.ts` | v20 面板按钮 + bindAction ack |
| `04-demo-v21.spec.ts` | 数据表 dt_* 调度 |
| `05-demo-v22-interop.spec.ts` | v2.3 互操作完整握手 |
| `06-demo-react.spec.ts` | 通过聊天的 React 案例研究 |
| `07-demo-angular.spec.ts` | 通过聊天的 Angular 案例研究 |
| `08-pipeline-end-to-end.spec.ts` | 聊天 -> LLM -> 调度 -> ack |
| `09-diagnostic.spec.ts` | 故障注入 + 恢复 |
| `10-deep-discovery.spec.ts` | 自主发现循环 |

全部 16 个规范文件可通过 `bash tools/nac/test-launch.sh` 运行，在干净的代码检出环境下 15 秒内完成。

---

## CI 集成

将以下内容添加到 `.github/workflows/e2e.yml`：

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

跨语言 / 浏览器 / 租户的矩阵运行：

```yaml
strategy:
  matrix:
    locale: [es, en, pt, fr, de, ja, zh, hi, ar, it]
    browser: [chromium, firefox, webkit]
```

10 种语言 × 3 种浏览器 = 30 个任务，全部复用同一套 NAC3 调度的测试代码。

---

## 与传统 Playwright 测试的对比

一个典型的 100 页企业应用通常维护约 500–800 个 Playwright 测试，UI 重设计后的不稳定率约为 20%。引入 NAC3 后：

| 指标 | 传统方式 | NAC3 支持 |
|--------|-------------|-------------|
| 相同覆盖率所需测试数量 | ~500 | ~100（基于动词） |
| 重设计后的不稳定率 | ~20% | ~2%（仅在契约真正变更时） |
| `<button>` 替换为 `<a>` 后的维护成本 | 重写选择器 | 无——id 保持稳定 |
| 新增语言支持 | 重写所有基于标签的选择器 | 无——与语言无关 |
| 跨租户复用 | 不可能（选择器各不相同） | 轻而易举（基于动词） |

---

## 另请参阅

- `tests/e2e-nac/specs/` —— 参考套件。
- `tools/nac/test-launch.sh` —— 编排工具。
- [IMPACT_TESTING.md](IMPACT_TESTING.md) —— 面向 QA 团队的更广泛影响分析。
- [LLM_WIRING.md](LLM_WIRING.md) —— LLM 智能体使用的相同调度契约。
- `docs/NAC_TEST_MANUAL.md` —— 标准化测试手册。

## 许可证

Apache-2.0。

---

*This is a machine translation of the canonical English
version at `/nac-spec/guides/RPA_PLAYWRIGHT.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
