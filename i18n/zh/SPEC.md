---
translation_source: SPEC.md
translation_source_hash: 5ebb8103746daf5bf7877b67ebb3a44cf98b4e2cba1fd8ba30093e0fce1b9b76
translation_quality: machine_v1
translation_lang: zh
translation_date: 2026-05-11T13:07:28.549236+00:00
---

# NAC3 -- Native Agent Contract

**版本：** 2.2.0
**状态：** 稳定
**许可证：** Apache-2.0
**编辑：** Yujin (yujin.app)

---

## 0. 目的

NAC3 是 Web UI 与驱动它们的 Agent 之间的契约。
Agent 包括语音运行器、LLM 中间件、RPA 机器人、
无障碍工具以及端到端测试运行器。该契约规定了：

1. **元素如何命名** —— 使 Agent 能够请求"点击保存按钮"并将其解析到唯一的 DOM 节点。
2. **动词如何应用** —— 使 Agent 能够调用 `NAC.click(id)`、
   `NAC.fill(id, value)`、`NAC.tab(plugin, key)` 等，无需针对每个应用编写胶水代码。
3. **如何发出完成信号** —— 使 Agent 知道某个步骤何时完成，每个角色对应一组确定性事件。
4. **如何保留来源信息** —— 使下游系统能够区分真实用户点击与合成点击。

NAC3 在你现有的渲染框架之上添加了一层薄薄的抽象，不会替代 ARIA、React、Vue 或你的设计系统。

---

## 1. 角色（Roles）

每个与 Agent 相关的 DOM 元素都携带 `data-nac-role`。规范角色如下：

| 角色 | 含义 | 示例 |
|------|------|------|
| `plugin` | 一个自包含的 UI 模块（页面、面板、组件集合）。 | `<article data-nac-plugin="invoice">` |
| `section` | plugin 内部的地标区域（页头、正文、页脚、侧边栏）。 | `<section data-nac-role="section">` |
| `region` | section 内部的可命名区域（卡片组、结果列表）。 | `<div data-nac-role="region">` |
| `action` | 触发动词的可点击组件（按钮、用作按钮的链接）。 | `<button data-nac-role="action" data-nac-action="save">` |
| `field` | 用户输入或切换的输入框（文本、数字、复选框、单选框、日期、文件）。 | `<input data-nac-role="field">` |
| `option` | field 内部的可选选项（combobox / select / 单选组子项）。 | `<li data-nac-role="option">` |
| `tab` | 可切换的面板选择器。**当 `data-nac-id` 匹配 `^tab\.` 时必须使用。** | `<button data-nac-role="tab" data-nac-id="tab.lines">` |
| `breadcrumb-item` | 面包屑导航节点。 | `<a data-nac-role="breadcrumb-item">` |
| `accordion-toggle` | 展开/折叠控件。 | `<button data-nac-role="accordion-toggle">` |
| `step` | 向导步骤指示器。 | `<li data-nac-role="step">` |
| `pagination-item` | 分页列表中的页码跳转控件。 | `<button data-nac-role="pagination-item">` |
| `confirm-button` | 确认对话框内的确认/取消按钮。 | `<button data-nac-role="confirm-button">` |
| `sort-control` | 列排序表头。 | `<th data-nac-role="sort-control">` |
| `filter-control` | 列筛选触发器。 | `<button data-nac-role="filter-control">` |
| `data-table` | 数据表宿主元素（v2.1）。 | `<table data-nac-role="data-table">` |
| `navigation` | 地标导航区域。**不是 tab。** | `<nav data-nac-role="navigation">` |
| `confirm-dialog` | 确认请求的模态框。 | `<div data-nac-role="confirm-dialog">` |

此列表之外的角色保留供将来使用。NAC-strict 运行时在注册时应（SHOULD）拒绝未知角色（v2.2）。NAC-permissive 运行时可（MAY）将未知角色视为 `action` 以保持向后兼容（v1.9 和 v2.0 默认行为）。

---

## 2. 名称（Names）

每个可被 Agent 解析的元素都携带 `data-nac-id`。该 id 具有以下特征：

- **点分路径**（例如 `deals.list.row.42.actions.delete`）。
  点号分隔语义层级；运行时不对其进行解析，但人类和 LLM 会理解其含义。
- **在 `data-nac-plugin` 作用域内全局唯一。** 不同 plugin 可以共享相同的 id；运行时通过 `(plugin, id)` 对进行解析。
- **在重新渲染时保持稳定。** 每次渲染都生成新 id 的框架（随机哈希、实例计数器）会破坏此契约。
- **在 UI 重新设计时保持稳定。** 按钮从工具栏移至下拉菜单时，其 id 必须（MUST）保持不变。

保留的 id 前缀（v2.1）：

| 前缀 | 保留用途 |
|------|----------|
| `tab.` | Tab 按钮。角色必须（MUST）为 `tab`。 |
| `modal.` | 模态框作用域内的元素。角色为叶子组件的角色。 |
| `field.` | 表单字段简写。角色必须（MUST）为 `field` 或 `option`。 |
| `confirm.` | 确认对话框。 |

---

## 3. 动词（Verbs）

`data-nac-role="action"` 元素可（MAY）携带 `data-nac-action="<verb>"`，
用于描述其功能。动词是宿主与 Agent 之间约定的自由格式 snake_case 标识符。常用动词：

`save`、`cancel`、`submit`、`delete`、`edit`、`view`、`create`、
`approve`、`reject`、`send`、`download`、`upload`、`refresh`、
`expand`、`collapse`、`open`、`close`、`add_row`、`remove_row`。

`NAC.click_by_verb(plugin, verb)` 将动词解析为该 plugin 下唯一的 action 并点击它。同一 plugin 下多个 action 共享相同动词属于明显错误（lint：`duplicate_verb`）。

---

## 4. 清单（Manifest）

每个 plugin 可（MAY）通过以下方式注册清单：

```js
NAC.register({
  plugin_slug: 'invoice',
  version:     '1.0.0',
  nac_version: '2.1',
  elements: [
    { id: 'invoice.save', role: 'action',
      actions: [{ verb: 'save', label_i18n: { es: 'Guardar', en: 'Save', ... } }],
      label_i18n: { es: 'Guardar factura', en: 'Save invoice', ... } },
    ...
  ],
  tabs: [
    { nac_id: 'tab.lines', label_i18n: { es: 'Lineas', en: 'Lines' } },
    ...
  ],
  fields: [
    { id: 'field.client_name', type: 'text', required: true,
      label_i18n: { es: 'Cliente', en: 'Customer' } },
    ...
  ],
  data_tables: [...]
});
```

清单是面向 Agent 的权威数据来源。当 LLM 中间件判断"用户说了 'guardar'"时，会查找 plugin 清单，找到动词 `save`，并发出 `NAC.click_by_verb('invoice', 'save')`。

### 4.1 必填字段

- `plugin_slug` —— 与宿主元素上的 `data-nac-plugin` 匹配。
- `nac_version` —— 该清单声明遵循的 NAC3 版本。运行时会拒绝声明版本高于自身版本的清单。

### 4.2 可选字段

- `elements[]` —— 已命名组件的目录。每个条目必须（MUST）包含 `id` 和 `role`。
- `tabs[]` —— 专用于 tab 的顶层数组。等同于 `elements[]` 中 `role:'tab'` 的条目，两种写法均有效。
- `fields[]`、`actions[]`、`kpis[]`、`data_tables[]` —— 按类型划分的子集合；语义与按角色过滤后的 `elements[]` 相同。示例代码会选择对人类阅读最友好的写法。

### 4.3 i18n

每个 `label_i18n` 必须（MUST）覆盖 NAC3 的全部 10 个语言区域：

```
es, en, pt, fr, ja, zh, hi, ar, de, it
```

在 `NAC.autoRegister.watch()` 上设置 `i18n_strict: 'permissive'` 允许在棕地迁移期间使用不完整的语言覆盖；生产环境的清单应提供全部 10 个语言区域。

---

## 5. 公共 API

### 5.1 命令式

```ts
NAC.click(nac_id: string, opts?: ClickOpts): Promise<{ok: true}>
NAC.click_by_verb(plugin: string|null, verb: string, opts?): Promise<...>
NAC.fill(nac_id: string, value: string|number|boolean): Promise<...>
NAC.select(nac_id: string, value: string): Promise<...>
NAC.tab(plugin: string, tab_key: string): Promise<...>
NAC.tab_by_label(plugin: string|null, label: string): Promise<...>
NAC.go_to_section(nac_id: string): Promise<...>
NAC.drag_drop(source_id, target_id, opts?: {to_index?: number}): Promise<...>
NAC.set_mode(mode: 'modal'|'maximized'|'new_tab'|'new_window'): void
NAC.screenshot(): Promise<string>  // data URL
NAC.bindAction(el, handler, {plugin, action_id}): () => void  // v2.2
```

### 5.1.1 合规辅助方法（v2.2）

`NAC.bindAction(el, handler, ctx)` 是规范推荐的点击处理器绑定方式。它会在处理器执行完毕后（无论是同步返回、抛出异常还是 Promise 完成）自动触发 `nac:action:succeeded`（或 `:failed`）事件，并返回一个解绑函数。在宿主支持的情况下，应优先使用此方法替代原始的 `addEventListener('click', ...)`；存量代码仍可像以前一样手动触发事件。

### 5.1.3 字段编辑器（v2.3 预览）

`NAC.edit_field(nac_id)` 会打开一个模态框，允许用户（或代表用户的智能体）使用类 Word 工具编辑任意文本字段：

```ts
NAC.edit_field(nac_id: string): Promise<{ok:true}>
```

该模态框以 `plugin_slug='nac_editor'` 注册，支持以下 NAC-3 可调用动词：

| 动词 | 效果 |
|------|--------|
| `select_word` | 选中光标处的单词 |
| `select_sentence` | 选中光标处的句子 |
| `select_all` | 在编辑器内执行全选（Ctrl-A） |
| `replace` | 用指定文本替换当前选中内容 |
| `delete_selection` | 删除当前选中内容 |
| `ai_correct_syntax` | 将当前值通过 POST 请求发送至 LLM 中间层，系统提示为"修正语法和拼写，仅返回修正后的文本"；并以响应结果替换当前值 |
| `save` | 将内容写回源字段，触发 input 和 change 事件，然后关闭 |
| `cancel` | 放弃更改并关闭 |

按 Esc 关闭（取消）。按 Ctrl/Cmd+Enter 保存。点击遮罩层背景取消。

规范第 13 节将在 v2.3 中正式确立该契约；v2.2 运行时已附带一个可用的参考实现，供接入方立即使用。可通过以下方式在任意字段上调用：

```js
NAC.edit_field('invoice.client_name');
// 或通过中间层调用：
NAC.click_by_verb('myplugin', 'edit_field', { nac_id: 'invoice.client_name' });
```

### 5.1.2 严格校验标志（v2.2）

`NAC.STRICT_VALIDATION`（布尔值，v2.2 中默认为 `false`）。当设为 `true` 时，若出现以下任一情况，`NAC.register()` 将抛出 `code='strict_validation'` 的 `Error`，并附带 `findings` 数组：

- `manifest_role_unknown` —— 条目的 role 不在规范集合内。
- `tab_id_manifest_role_drift` —— id 匹配 `^tab\.` 但 role 不为 `'tab'`。
- `manifest_dom_role_mismatch` —— 已挂载 DOM 元素的 `data-nac-role` 与 manifest 条目的 role 不一致。

v2.3 中该标志默认值将改为 `true`。v3.0 中该标志将被移除（届时严格模式为唯一模式）。

所有异步方法在失败时均以 `NacError` 拒绝，其 `code` 为以下之一：

- `not_found` —— 指定的元素/role/动词不在 DOM 中。
- `invalid` —— 参数格式错误。
- `timeout` —— 副作用已触发，但合规确认事件未在 5 秒内到达。**超时意味着真实失败**：处理器可能已挂起、确认事件从未被绑定，或发生了网络竞态。除非调用方能通过其他渠道确认副作用已完成，否则**必须**将超时视为失败。

### 5.2 内省

```ts
NAC.describe():    { active: string|null, plugins: PluginSnap[] }
NAC.describe_v2(): { v2_scope_entries: [...], sitemap: ..., data_tables: [...] }
NAC.manifest(plugin_slug: string): Manifest|null
NAC.validate_global(opts?: {probe?: boolean}): Findings[]
```

### 5.3 数据表（v2.1）

```ts
NAC.registerDataTable(spec: DataTableSpec): void
NAC.dt_add_row(table_id, values): {ok, row_id}
NAC.dt_remove_row(table_id, row_id): {ok}
NAC.dt_edit_cell(table_id, row_id, column, value): {ok} | {ok:false, error}
NAC.dt_set_cell(table_id, row, col, value): {ok} | {ok:false, error}
NAC.dt_select(table_id, target): {ok}
NAC.dt_commit(table_id): {ok, final_state} | {ok:false, errors:[...]}
NAC.dt_discard(table_id): {ok}
NAC.dt_state(table_id): TableState
NAC.dt_read_aggregate(table_id, agg_key, column): number|null
NAC.registerDataTableComputed(table_id, column, fn): void
```

数据表具有 `subkind` 属性：

- `collection` —— 有序行集合，支持可选的事务性提交。适用于发票明细行、购物车条目、日志记录等场景。
- `matrix` —— 行列网格，每个单元格均携带一个值。适用于权限矩阵、排班网格等场景。
- `matrix-singletree` —— 每行可折叠为树形结构的矩阵（较少见）。

---

## 6. 事件

每个操作都会触发一个确定性的完成事件。运行时的 `NAC.click()` 会轮询该事件，并在事件触发时完成 Promise。

| Role | 成功事件 | 失败事件 |
|------|---------------|---------------|
| `action` | `nac:action:succeeded` | `nac:action:failed` |
| `field` | `nac:field:changed` | -- |
| `option` | `nac:field:changed` | -- |
| `tab` | `nac:tab:activated` | -- |
| `breadcrumb-item` | `nac:breadcrumb:navigated` | -- |
| `accordion-toggle` | `nac:accordion:expanded` / `:collapsed` | -- |
| `step` | `nac:step:advanced` | -- |
| `pagination-item` | `nac:table:page_changed` | -- |
| `confirm-button` | `nac:confirm:resolved` / `:cancelled` | -- |
| `sort-control` | `nac:table:sort_changed` | -- |
| `filter-control` | `nac:table:filter_changed` | -- |

### 6.1 事件 detail 结构

每个事件的 detail 均包含规范 id 字段及 `plugin`：

```js
nac:action:succeeded {
  detail: { plugin: 'invoice', action_id: 'invoice.save', ... }
}
nac:tab:activated {
  detail: { plugin: 'invoice_edit_modal', tab_id: 'tab.lines', ... }
}
nac:field:changed {
  detail: { plugin: 'invoice', field_id: 'field.client_name',
            value: 'Acme Corp', ... }
}
```

### 6.2 在宿主处理器中触发事件

点击处理器**必须**在同步副作用完成后触发对应的成功事件：

```js
button.addEventListener('click', function (ev) {
  // ... 执行操作 ...
  document.dispatchEvent(new CustomEvent('nac:action:succeeded', {
    detail: { plugin: 'invoice', action_id: 'invoice.save' }
  }));
});
```

若操作为异步，则应在 Promise resolve 后触发事件。若操作失败，则触发 `nac:action:failed`，并附带 `{detail: {plugin, action_id, error: <message>}}`。

v2.2 运行时将提供 `NAC.bindAction(el, handler, ctx)`，它封装了 `addEventListener` 并可自动触发事件。

### 6.3 为何不直接使用 click 事件？

DOM 的 `click` 事件在处理器执行**之前**就已触发。NAC3 的契约需要知道**副作用何时完成**，而非点击何时开始。因此需要独立的事件体系。

---

## 7. 来源溯源

### 7.1 isTrusted

`event.isTrusted` 在用户主动触发的点击（真实鼠标、真实按键、屏幕阅读器激活）时为 `true`，在合成点击（`element.click()`、通过 dispatchEvent 派发的 MouseEvent、自动化脚本）时为 `false`。

NAC3 必须通过成功事件中的 `event.detail.is_trusted` 字段暴露此信息。对于涉及安全敏感操作（支付、删除）的宿主，可以要求 `is_trusted === true`，并拒绝合成点击。参考示例 `example-v20-full.php` 包含一对按钮（`v20_panel.istrusted_real` 和 `v20_panel.istrusted_fake`），用于演示两者的区别。

### 7.2 HMAC 签名清单

清单可以携带 `provenance` 块：

```js
NAC.set_provenance_secret('your-tenant-secret');
NAC.register({
  plugin_slug: 'invoice',
  ...,
  provenance: {
    signed_at: '2026-05-09T10:00:00Z',
    signed_by: 'tenant-X',
    signature: '<HMAC-SHA256 of manifest body>'
  }
});
```

运行时会对清单主体（不含签名字段本身）进行稳定序列化，并计算预期的 HMAC 值，若签名不匹配则拒绝该清单。此机制用于多租户部署场景，防止某个租户伪造其他租户的清单。

### 7.3 威胁模型

完整威胁模型请参见 `SECURITY.md`。简要说明如下：

- NAC3 不对**用户**进行身份验证，这是你的认证层的职责。
- NAC3 对**清单**进行身份验证（HMAC）。
- NAC3 区分真实点击与合成点击（isTrusted），宿主可据此拒绝敏感操作中的合成点击。
- NAC3 无法防御以用户级别权限运行的恶意代理，此类代理可以执行用户能做的任何操作。

---

## 8. 合规级别

若一个页面满足以下条件，则为 **NAC-1 合规**：

- 所有代理应能操作的可点击组件均携带 `data-nac-id` 和 `data-nac-role`。
- 所有 `data-nac-role="action"` 元素在其副作用完成后触发 `nac:action:succeeded`。
- 页面通过 `NAC.register()` 注册至少一个插件清单。
- `NAC.click(id)` 对所有已声明的 id 均可正常工作。

若页面还满足以下条件，则为 **NAC-2 合规**：

- 在清单中显式注册 `tabs[]`、`fields[]`、`actions[]` 数组（而非从 DOM 推断）。
- 为所有面向用户的标签提供覆盖全部 10 个 NAC3 语言区域的 `label_i18n`。
- 实现 v2.0 棕地原语：作用域树、临时捕获、autoRegister.watch。
- 以 `NAC.validate_global({probe: false})` 检查，零 `error` 级别发现。

若页面还满足以下条件，则为 **NAC-3 合规**：

- 携带 HMAC 签名清单。
- 对安全敏感操作区分 `isTrusted`。
- 以 `NAC.validate_global({probe: true})` 检查，零发现。

NPM 包的 CLI（`npx @nac3/runtime validate <url>`）会报告页面所达到的最高合规级别。

---

## 9. 版本管理

NAC3 遵循语义化版本规范（semver）：

- **主版本**升级：公共 API 或传输格式存在破坏性变更，接入方需修改代码。
- **次版本**升级：新增功能，向后兼容，旧代码无需改动。
- **补丁版本**升级：缺陷修复、仅文档变更。

废弃策略：在版本 `X.Y.0` 中标记为 `@deprecated` 的功能，最早在 `(X+1).0.0` 版本中移除。发布说明会明确记录每一项移除内容。

NPM 包版本与规范版本保持一致：`@nac3/runtime@2.1.3` 实现 NAC3 v2.1，含三个补丁修订。

---

## 10. 验证器

### 10.1 运行时：`NAC.validate_global()`

遍历实时 DOM、已注册清单及 i18n 目录，返回发现项数组：

```ts
{
  severity: 'error' | 'warn' | 'info',
  code:     string,                     // e.g. 'tab_role_drift'
  nac_id:   string | null,
  message:  string,
  detail:   Record<string, any>
}
```

发现项代码在补丁版本间保持稳定；新代码仅在次版本升级时引入。

### 10.2 CLI：`npx @nac3/runtime validate <target>`

封装了 `validate_global`，并对 HTML/清单一致性进行静态检查。退出码说明：

- `0` —— 无严重程度达到或超过配置阈值的发现项。
- `1` —— 存在发现项。
- `2` —— 目标本身加载失败。

适用于 CI 场景：`npx @nac3/runtime validate ./dist/index.html --severity=error`。

---

## 11. NAC3 的周边系统

NAC3 是一个契约层。要将 NAC 合规页面转变为语音驱动的应用，还需要：

1. **语音转文字来源**（浏览器 SpeechRecognition、Whisper API 等）。
2. **LLM 中间层**：接收用户文本、页面的 `NAC.describe()` 快照及 i18n 提示，输出结构化操作：`[{kind: 'click', nac_id: 'X'}, {kind: 'fill', nac_id: 'Y', value: 'Z'}]`。详见 `guides/LLM_WIRING.md`。
3. **聊天客户端**：维护对话上下文并派发操作，参考实现为 `js/nac-chat-client.js`。
4. **文字转语音输出**：用于语音回复（浏览器 SpeechSynthesis、ElevenLabs 等）。

NAC3 仅规范第 2 步的输入/输出格式（`NAC.describe()` 快照与操作结构）。第 1、3、4 步不在规范范围内，由你自由组合。

---

## 12. 稳定性保证

本规范承诺：

1. 第 1 节中的规范角色集合不会缩减，次版本升级时可能新增角色。
2. 第 6 节中的事件族不会被重命名，次版本升级时可能新增事件。
3. `NAC.click`、`NAC.fill` 等方法的参数结构在次版本间不会变更，可能新增可选的 `opts` 字段。
4. `validate_global` 的发现项代码在次版本间不会被复用于不同含义的条件。

本规范不承诺：

1. 错误消息的具体措辞（这些是 i18n 目录字符串，本地化内容可能变化）。
2. 查找元素的 DOM 策略（当前使用 `querySelector`，未来可能改用更快的索引方式）。
3. 内部清单缓存的布局。宿主侧应将清单视为只写，代理侧视为只读。

---

## 13. 待解决问题（单独跟踪）

- `data-nac-role="navigation"` 是否应解析为 tab？当前版本（v2.1）不支持，v22 路线图倾向于更严格地拒绝此类用法。
- `NAC.click()` 是否应支持相对 id（例如 `'./save'` 表示"当前活跃插件下的 save"）？v2.1 不支持，可能在 v2.3 中引入。
- 清单是否应支持跨插件的继承/扩展（一个基础清单由租户扩展）？已列为 v3.0 候选议题。

---

## 13.5 治理

NAC3 目前由 Yujin 负责维护。规范以 Apache 2.0 协议发布，参考运行时以 MIT 协议发布。若采用规模足以支撑中立治理，Yujin 承诺将 NAC3 移交至中立基金会（W3C 社区组、Linux Foundation 或同等行业机构）。在此之前，规范变更遵循 `CONTRIBUTING.md` 中记录的 RFC 流程，任何影响公共 API 或传输格式的变更须经过至少 14 天的公开评议期。

致接入方：Apache 2.0 + MIT 的许可证组合保证了规范和运行时不受 Yujin 公司状态变化的影响。无论现在还是将来，你均可自由 fork、运行和分发两者。本文件明确记录这一承诺，使延续路径清晰可见，而非隐含其中。

---

## 14. 参考实现

规范实现为 NPM 包 `@nac3/runtime` 所分发的参考运行时。该运行时已完整实现 v2.1，包含：

- `js/nac.js` —— v1.9 基础版本及第 5 节中的公共 API。
- `js/nac-v2-extensions.js` —— v2.0 棕地原语（作用域树、临时捕获、autoRegister、HMAC、isTrusted）。
- `js/nac-chat-client.js` —— 参考聊天客户端，集成语音、LLM 与调度器。

欢迎其他语言的实现（用于原生自动化运行器的 Python、用于嵌入式代理的 Rust 等）。规范本身，而非 JavaScript 代码，才是最终权威。

---

*本文件为 NAC3 v2.1 规范的权威版本。对本文件的任何修改均构成规范变更，须经 RFC 流程；详见 `CONTRIBUTING.md`。*

---

*This is a machine translation of the canonical English
version at `/nac-spec/SPEC.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
