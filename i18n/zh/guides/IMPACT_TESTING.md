---
translation_source: guides/IMPACT_TESTING.md
translation_source_hash: d69b8343b9c3e6a8ba3e22f198a9a6646d800f3f32a2f0446a506cb44f9e664b
translation_quality: machine_v1
translation_lang: zh
translation_date: 2026-05-11T14:52:49.512428+00:00
---

# NAC3 对测试与 QA 的影响

**NAC3 版本：** 2.2 稳定版。
**目标读者：** 测试工程师、QA 负责人、SDET，以及正在评估 NAC3 采用后长期测试维护成本的 CTO。

## 简要概述

使用 NAC3 id 的测试代码能够在 UI 重新设计后继续运行，而使用 CSS 选择器的测试代码则不能。这一特性将测试维护的成本模型从"随 UI 变动线性增长"转变为"随功能变动线性增长"——通常可减少 5-10 倍的工作量。

## 当前的维护成本分析

一个中等规模 Web 应用的典型 Selenium / Cypress / Playwright 测试套件通常包含数百个选择器：

```ts
await page.locator('button.btn-primary.btn-large:has-text("Save")').click();
await page.locator('div.modal > div.body > input[type="text"]:first-of-type').fill('Acme');
await page.locator('table.invoice-grid > tbody > tr:nth-child(1) > td:last-child > button').click();
```

以下情况会导致这些选择器失效：

- 设计团队将 `.btn-primary` 重命名为 `.btn-cta`。
- 为了无障碍访问而新增了一个包裹 div。
- 按钮文本经过国际化处理，"Save" 在西班牙语租户测试中变成了 "Guardar"。
- 网格布局切换为 grid-template-rows。
- 任何与语义意图无关的页面变更。

2024-2025 年的行业调查估计，**QA 工程师 30-50% 的时间花费在选择器维护上**。随着应用规模增长，这一比例还会持续恶化。

## 使用 NAC3 后的维护成本分析

```ts
await NAC.click('invoice.save');
await NAC.fill('invoice.client_name', 'Acme');
await NAC.click('invoice.line.42.delete');
```

这些调用能够在以下情况下继续正常运行：

- CSS 类名重命名（选择器不引用 CSS）。
- DOM 树结构调整（选择器不引用结构）。
- I18n 标签变更（选择器不引用文本）。
- Grid 到 Flex 的布局迁移。
- 组件库替换。

仅在以下情况下才会失效：

- 产品团队重命名了某个动词（`save` -> `commit`）。
- 某个按钮被完全移除。

这些属于**功能层面的变更**，而非 UI 层面。测试需要更新，原因与生产代码需要更新相同。这才是合理的成本基准。

## 具体影响指标

来自 Yujin CRM 内部数据（2025 年）：

| 指标 | 使用 NAC 前 | 使用 NAC 后 | 变化 |
|------|------------|------------|------|
| Playwright 规格文件平均行数 | 187 | 64 | -66% |
| 重新设计冲刺后每个规格文件的维护时间 | 4.2 小时 | 0.3 小时 | -93% |
| 每周因选择器导致的测试失败次数 | 38 | 2 | -95% |
| 新 QA 工程师上手周期 | 3 周 | 1 周 | -67% |
| 编写 6 个月后无需修改仍可通过的测试比例 | 31% | 89% | +180% |

89% 这个数字最为关键。**绝大多数 NAC3 测试在产品正常演进过程中持续有效**，而基于选择器的同类测试则会逐渐失效。

## NAC3 为测试自动化带来的能力

### 1. 稳定的测试语料库

2024 年针对 `NAC.click('invoice.save')` 编写的测试，只要动词 `save` 在产品路线图中保留，到 2026 年仍可正常运行。按钮周围的 DOM 结构可以已经被重建了三次。

### 2. 跨浏览器无需切换选择器模式

CSS 选择器在 Chromium / Firefox / WebKit 中对边缘情况（伪元素、焦点环、Shadow DOM）的行为存在差异。NAC3 通过运行时的解析器进行分发——无论哪种浏览器，代码路径完全一致。

### 3. I18n 无关的测试

对于多语言应用：当前的测试套件需要针对每种语言单独运行，因为 "Save" / "Guardar" / "Speichern" 其实是同一个按钮。使用 NAC3 后，测试调用 id，运行时跨语言解析。**编写 1 个测试，即可覆盖 10 种语言**（每个 对应一种）。

### 4. LLM 辅助测试编写

能够读取 `NAC.describe()` 的 LLM 可以根据自然语言描述生成完整的测试规格文件，例如："测试添加一行后再删除，表格恢复到初始状态。" LLM 输出 NAC.* 调用，由人工审查后提交。Yujin CRM 中约有 250 个规格文件以这种方式生成，并经过审查后合并。

### 5. 通过发现机制实现测试自愈

当测试因 id 被重命名而失败时：

```ts
try {
  await NAC.click('invoice.save');
} catch (e) {
  if (e.code === 'not_found') {
    // 重新发现；动词 'save' 可能存在于新的 id 下。
    const r = await NAC.click_by_verb('invoice', 'save');
    if (r.ok) console.warn('id has changed; update test');
  }
}
```

运行时的 `click_by_verb` 提供了一个自愈回退机制，能够反馈"此测试需要更新，但操作仍然有效"——这比"选择器未找到，直接失败"要好得多。

### 6. 从清单自动生成测试

`NAC.validate_global({probe: true})` 会对每个 `role="action"` 元素合成一次点击操作，并验证其在 5 秒内发出规范的确认事件。**这是针对整个应用可点击界面的自动生成冒烟测试**。在 CI 中运行，可捕获任何挂载时未正确发出确认事件的按钮。

### 7. 按阶段划分的流水线覆盖率

Yujin 的参考测试套件（NAC_TEST_MANUAL.md）按 NAC3 流水线阶段组织测试：

- 阶段 1（STT 输入）
- 阶段 2（消歧义）
- 阶段 3（LLM 中间层）
- 阶段 4（NAC.* 调用）
- 阶段 5（DOM 副作用）
- 阶段 6（确认事件）

覆盖率按**每个阶段**衡量，而非仅按代码行数。Yujin 参考报告显示所有阶段的加权平均覆盖率约为 95%。采用该模式可获得一份直接映射到合约的覆盖率评分卡。

## 对现有测试框架的影响

### Playwright

直接集成。`page.evaluate()` 调用 `NAC.*`。选择器作为布局断言的备用方案保留。Yujin 参考包含 16 个 Playwright 规格文件，位于 `tests/e2e-nac/specs/`。

### Cypress

`cy.window().then(win => win.NAC.click(id))`。模式相同。可通过自定义命令封装 NAC 调用：`cy.nacClick('invoice.save')`。

### Selenium

使用 JavaScript 执行器：`driver.execute_script('return window.NAC.click(arguments[0])', 'invoice.save')`。

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

NAC3 与 React Testing Library 并行使用，而非相互替代。

### Karma / Jasmine / 旧版测试运行器

通过 `window.NAC` 直接注入。任何能够在浏览器上下文中运行 JavaScript 的框架均可使用。

## 采用成本

### 现有应用

参考[迁移手册](AI_PLAYBOOK_MIGRATION.md)，预估如下：

- 每个页面的标注与清单工作约需 1 天。
- 每个页面的测试语料库迁移约需 1 天。
- 一个 20 个页面的应用总计约需 1 名工程师 6 周时间，维护节省的成本可在 3-4 个月内收回投入。

### 新应用

内置支持。绿地项目手册将 NAC3 属性作为一等关注点处理，无需改造成本。

## 风险与缓解措施

### 风险——"我们不信任 LLM 生成的测试"

这是合理的顾虑。LLM 生成候选内容，由人工审查后提交。工作流程与 Copilot 相同。最终交付的语料库是团队审批通过的内容，而非 LLM 直接输出的内容。

### 风险——"NAC id 随时间推移会成为技术债务"

如果放任不管，确实如此。将 NAC id 视同数据库列名：通过迁移进行重命名，绝不在使用中直接删除。`@nac3/runtime` CLI 可通过静态检查发现孤立 id。

### 风险——"如果 NAC 的采用停滞怎么办？"

规范采用 Apache-2.0 授权。运行时体积小于 200KB。最坏情况：你拥有该产物，id 保持稳定。即便是最坏情况，也优于使用 CSS 选择器。

## 参见

- [NAC_TEST_MANUAL.md](../docs/NAC_TEST_MANUAL.md) —— 本影响分析所依据的标准化测试手册。
- [RPA_UIPATH.md](RPA_UIPATH.md) /
  [RPA_AUTOMATION_ANYWHERE.md](RPA_AUTOMATION_ANYWHERE.md) /
  [RPA_BLUE_PRISM.md](RPA_BLUE_PRISM.md) —— 同一合约的相关应用场景。
- [COVERAGE_REPORT_2026_05_10.md](../docs/COVERAGE_REPORT_2026_05_10.md)
  —— Yujin 参考项目自身的覆盖率数据。

## 许可证

Apache-2.0。

---

*This is a machine translation of the canonical English
version at `/nac-spec/guides/IMPACT_TESTING.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
