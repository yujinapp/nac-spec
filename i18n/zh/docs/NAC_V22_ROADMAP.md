---
translation_source: docs/NAC_V22_ROADMAP.md
translation_source_hash: 8d844659a0ed290a00c015c5b2e875d6d9b3d52b18f02f8c182169927d3d4750
translation_quality: machine_v1
translation_lang: zh
translation_date: 2026-05-11T15:12:34.797173+00:00
---

# NAC3 v2.2 -- 路线图

NAC3 = **Native Agent Contract**。

起始日期：2026-05-09。本文件记录 NAC3 规范下一个次要版本的演进事项。每个章节自成一体，包含：问题描述、所预防的缺陷类型、拟议的合约变更，以及实现说明。

**截至 2026-05-10 的状态：** v2.2 已发布。V22-01 + V22-02 + V22-03 + V22-04 均已合入 `js/nac.js` 及 `@nac3/runtime` 2.2.0 NPM 包。本文件现为该版本的权威变更日志。

| 事项 | 状态 | 提交 |
|------|--------|--------|
| V22-01 严格验证器 | 已发布 | 6c2b1866 |
| V22-02 bindAction 辅助函数 | 已发布 | 6c2b1866 |
| V22-03 locale 检测器加固 | 已发布 2026-05-09 | f631d77a |
| V22-04 tab_by_label 括号规范化 | 已发布 2026-05-09 | f631d77a |
| V23-01 字段编辑器原语（预览） | 演示已发布 2026-05-11 | (example-v23-editor.php + packages/nac/test/v23-editor.mjs 8/8 通过) |

---

## V22-01 -- 构造函数（`NAC.register`）升级为严格验证器

**缺陷类型。** 棕地演示可能在 manifest 中声明非规范的 role 值（例如在 tab 上使用 `role:'navigation'`，或用 `role:'button'` 代替 `'action'` 等）。当前构造函数对接收到的任何结构均原样接受并存储，缺陷只在运行时才会暴露——当 API（`NAC.tab()`、`NAC.tab_by_label()`、`NAC.click()`）无法找到元素时，因为规范的 DOM 查询（`[data-nac-role="tab"]`）无法匹配。此时演示已经部署，用户已经触发了失效的语音命令，运行时会正确抛出 `tab X missing`——这是一个误导性错误，因为该元素确实存在于 DOM 中，只是使用了错误的 role。

**具体触发场景（2026-05-09）。** Pablo 在 `example-v21-data-table.php` 上口述 `ve a pestana permisos`。LLM 解析为 `NAC.tab('invoice_edit_modal','tab.permissions')`。该按钮存在于 DOM 中，但其 `data-nac-role="navigation"`（演示作者基于 HTML 语义设置：tab 本质上是导航）。运行时抛出 "tab tab.permissions missing"，尽管按钮就在那里。同一会话中，`tab_by_label('Lines (collection)')` 未能匹配也源于同一根本原因。

**为何三道防护层本应捕获却未能捕获。**

| 层级 | 应检测…… | 当前行为 |
|---|---|---|
| 提交前 lint | PHP/HTML 演示文件中的 role 偏移 | 不存在 |
| `NAC.register(manifest)`（注册时） | 非规范 role、id/role 不匹配 | 静默接受一切 |
| `NAC.validate_global()`（lint 时） | `m.elements[]` 内的 role 偏移 | 仅检查 `m.tabs[]` 是否存在 |

运行时 API 层（`NAC.tab` 等）是**第四道**防护，也是目前唯一触发的一道——以运行时错误的形式呈现给终端用户，此时代价最高。

**v2.2 拟议合约变更。**

`NAC.register` 在存储 manifest 前**必须**对其进行验证。验证规则如下：

1. **已知 role 枚举。** 每个 `m.elements[i].role` 必须属于规范 role 集合（扩展自 `_CLICK_EVENT_FAMILY`）：

   ```
   action, field, option, tab, breadcrumb-item, accordion-toggle,
   step, pagination-item, confirm-button, sort-control,
   filter-control, data-table, plugin, section, region,
   navigation, banner, complementary, contentinfo, button
   ```

   未知 role -> `console.error` + 拒绝注册调用。地标 role（`navigation`、`banner` 等）可被接受，但仅限于对应 DOM 节点为区域容器而非可点击控件的元素。

2. **Id/role 一致性。** 若 `e.id` 匹配 `^tab\.`，则要求 `e.role === 'tab'`；若 `e.id` 匹配 `^modal\.`，则要求 `e.role === 'action'`（或 action 的子 role）。任何不匹配 -> `console.error` + 拒绝。id 字段的命名语法也是合约的一部分，目前仅为隐式约定。

3. **DOM 一致性（尽力而为）。** 当 `register` 在 DOM 解析完成后调用（典型路径）时，在 DOM 中查找 `[data-nac-id="<e.id>"]`。若找到且其 `data-nac-role` 与 `e.role` 不同，则 `console.error` + 拒绝。这可捕获 Pablo 于 2026-05-09 遇到的情况：manifest 声明 `role:'tab'`，但 HTML 仍写着 `data-nac-role="navigation"`（或反之）。若在 DOM 就绪前调用，则将检查推迟至 `DOMContentLoaded` 后置处理。

4. **迁移辅助（一个发布窗口期）。** v2.2.0 中上述规则产生 `console.error` 但**不抛出异常**——采用者需要时间迁移。从 v2.3.0 起，将抛出 `RegisterError` 并彻底拒绝 manifest。通过运行时标志 `NAC.STRICT_VALIDATION` 追踪，v2.2 中默认为 `false`，v2.3 中默认为 `true`。

**`NAC.validate_global()` 扩展。**

新增三项检测结果：

- `manifest_role_unknown` —— 某元素的 role 不在规范集合内。
- `manifest_dom_role_mismatch` —— `<id>` 在 manifest 中的 role 与 DOM 中的 `data-nac-role` 属性不符。
- `tab_role_drift` —— DOM 中某个 `<button>`（或任意可点击元素）的 `data-nac-id="tab.X"`，但 `data-nac-role` 不是 `"tab"`——无论 manifest 中是否存在对应条目。可捕获 manifest 验证器定义上无法发现的纯 HTML 侧偏移。

每项检测结果默认严重级别为 `error`；可按项目覆盖为 `{ kind: 'warn' }`。

**提交前 lint（独立交付物，阻断同类偏移）。**

新增 Node 脚本 `tools/nac/check_demos.mjs`，读取 `yujin.app/nac-spec/` 下所有 `*.php` 和 `*.html` 文件，通过 cheerio（或轻量路径下的正则）构建伪 DOM，从内联脚本中提取所有 `NAC.register({...})` 调用，并交叉检验相同的一致性规则。已接入 GitHub Actions 及本地 `pre-commit` git hook，任何规则失败均阻断提交。

**工作量估算。**

| 任务 | 位置 | 工作量 |
|---|---|---|
| `NAC.register` 严格模式 | `js/nac.js` | 2h |
| `validate_global` 新增检测项 | `js/nac.js` | 2h |
| 提交前 lint 脚本 | `tools/nac/check_demos.mjs` | 4h |
| 现有演示迁移扫描 | `example-v*.php` | 1h |
| 规范文档更新 | `docs/spec.md` 等 | 1h |
| 测试及 CI 接入 | `tests/` + `.github/workflows/` | 2h |

合计：约 12 小时专注工作。

**向后兼容性。**

v2.2 发布说明须声明：
- `NAC.register` 现在会在 role 偏移时输出 `console.error`（不抛出异常）。
- v2.3 将在相同条件下开始抛出 `RegisterError`。
- 采用者应在发布前运行 `NAC.validate_global()`。

本仓库现有 6 个演示的迁移路径已于提交 `0633e080`（2026-05-09）完成：v21 演示的 tab 按钮及 manifest 已更正为 `role:'tab'`。

---

## V22-02 -- Action-ack 合约执行

**问题类型。** 同步执行操作的点击处理器必须在副作用完成后调用 `dispatchEvent(new CustomEvent('nac:action:succeeded', {detail:{plugin,action_id}}))` 。存量面板经常遗漏这一步。运行时随即对 5 秒 ack 轮询超时，即便副作用已经发生，聊天或 Agent 仍会报告 `No pude ejecutar X: timeout`。

**具体触发场景（2026-05-09）。** Pablo：`hide` -> 面板正确隐藏，聊天却显示 "No pude ejecutar v20_panel.toggle: timeout"。v20-panel 上的每个按钮均有此问题。

**之前的临时方案是错误的。** 提交 `ad200e4c` 在聊天 Agentic 循环中将 `err.code === 'timeout'` 吞掉当作成功处理。Pablo 正确指出这会掩盖真实失败（处理器挂起、网络竞态、未捕获异常），破坏运行时唯一可信的信号。已在 `c9bf2bdb` 中回滚。

**正确修复已上线。** 在 `example-v20-full.php` 中包装 `bind()`，使其在每个处理器执行后自动触发 `nac:action:succeeded`/`nac:action:failed`。已在 `c9bf2bdb` 中完成。

**v2.2 拟议合约变更。**

运行时 SHOULD 提供如下辅助方法：

```js
NAC.bindAction(el, handler, { plugin, action_id })
```

该方法自动处理 ack 触发，接口与 `addEventListener('click', handler)` 相同，但内置了合规合约。采用该辅助方法的 Demo 不会再遗漏 ack。

`validate_global` 新增一项检测结果：

- `action_handler_without_ack` —— 通过插桩检测：在 `validate_global` 执行期间，验证器在受控上下文中对每个 `data-nac-role="action"` 元素派发合成点击事件，监听 `nac:action:succeeded` 500 毫秒，对未触发的元素进行标记。

该检测项为可选启用（`NAC.validate_global({ probe: true })`），因为合成点击会产生副作用。

**工作量。** 辅助方法约 3 小时 + 基于探针的检测项约 4 小时。

---

## V22-03 -- 语言切换检测器加固

**问题类型。** 聊天客户端语言检测器中的纯 2 字母语言代码（`'de'`、`'es'`、`'en'`）与多种语言中的介词和冠词发生冲突。`cambia DE pestana` 会将聊天切换为德语。

**修复已上线。** `nac-chat-client.js` 中的 `_detectLangSwitch` 现在要求纯 2 字母代码必须与显式的 `LOCALE_TRIGGER`（`idioma`/`language`/`sprache`/...）共同出现。已在 `f631d77a` 中完成。

**v2.2 拟议内容。** 将语言检测器从聊天客户端迁移为 NAC3 原语，使所有存量聊天嵌入都能使用同一个加固后的检测器。在规范中明确记录误报类型，避免未来实现重新引入该问题。

**工作量。** 约 2 小时。

---

## V22-04 -- `tab_by_label` 自然语言容错

**已合入。** 括号剥离（`"Lines (collection)"` 可匹配 `"Lines"` 和 `"Lines tab"`）已在 `f631d77a` 中上线。这**不是**兼容性降级方案，而是对 LLM 引用按钮文本的合理规范化处理。应在规范中将其记录为标准匹配器行为。

**工作量。** 仅文档，约 1 小时。

---

## v2.2 范围外（推迟至 v2.3+）

- 可组合角色层级（`role:'tab.primary'` 与 `role:'tab.secondary'`）：有一定价值，但尚无具体触发场景。
- Manifest 热重载：仍属罕见需求，当前页面刷新方案可满足需求。
- 跨全部 10 个语言区域同时搜索标签（当前匹配器串行遍历，对每个插件约 20 个标签的场景性能足够）。

---

## V23-01 -- 字段编辑器原语（预览版已上线）

**问题类型。** 语音运行器和 Agent 没有通用方式对 `<input>` 或 `<textarea>` 内的文本进行精细操作——只能使用 `NAC.fill(id, value)` 全量替换。实际任务（修正段落语法、仅替换选中内容、AI 优化句子）需要更细粒度的操作动词。目前每个有此需求的接入方都在自行实现。

**解决方案。** 新增运行时原语 `NAC.edit_field(nac_id)`，打开一个模态框，该模态框拥有独立的编辑界面，并以插件名 `nac_editor` 注册 8 个标准动词：

| 动词 | 说明 |
|------|-------------|
| `select_word` | 选中光标处的单词 |
| `select_sentence` | 选中光标处的句子 |
| `select_all` | 选中全部文本 |
| `replace` | 用指定文本替换当前选中内容 |
| `delete_selection` | 删除当前选中内容 |
| `ai_correct_syntax` | 将当前值 POST 至聊天后端，用 AI 校正结果替换 |
| `save` | 写回源字段并关闭模态框 |
| `cancel` | 放弃更改并关闭模态框 |

模态框的 manifest 以幂等方式注册（多次调用 `edit_field` 共享同一个 `nac_editor` 插件）。所有动词均包含全部 10 个语言区域的 `label_i18n`。

**状态：**
- 运行时：已于 2026-05-10 在 `js/nac.js` 中上线（函数 `edit_field` + `_editorRegisterManifest` + 带 ack 触发的模态框处理器）。
- Demo：已于 2026-05-11 在 `example-v23-editor.php` 上线（3 个可编辑字段 + 绑定至 `nac:action:succeeded` 的实时动词计数器）。
- 测试：已于 2026-05-11 在 `packages/nac/test/v23-editor.mjs` 上线（8/8 通过）：存在性验证 + 无效 id 抛出异常 + 无效 role 抛出异常 + 挂载模态框 + 注册插件 + 幂等性 + cancel 关闭 + save 关闭。
- 规范：相关章节将在 v2.3 GA 周期内作为第 13 节添加至 SPEC.md。

**GA 所需额外工作量。** 在现有基础上：ja/zh/ar/hi 原生语言标签审校（约 2 小时）、Playwright e2e 视觉规范（约 3 小时）、SPEC.md 规范文本（约 2 小时）。

---

## 条目从本文档迁移至规范的流程

1. 在功能标志后实现并上线运行时变更。
2. 更新 Demo，使其通过新的严格验证。
3. 在生产环境中至少经历一个发布周期的浸泡测试，期间标志默认为 `warn`（非抛出模式）。
4. 将规则迁移至 `docs/spec.md`，并在下一个次版本中将默认值提升为 `error`（抛出模式）。
5. 从本路线图中删除该条目，并在 `docs/CHANGELOG.md` 中添加一行记录。

---

*This is a machine translation of the canonical English
version at `/nac-spec/docs/NAC_V22_ROADMAP.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
