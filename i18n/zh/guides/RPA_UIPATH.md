---
translation_source: guides/RPA_UIPATH.md
translation_source_hash: 2dd66d68221f687237ac663fa2a360077a51b7cdf8ad74c16488a5934ee7927d
translation_quality: machine_v1
translation_lang: zh
translation_date: 2026-05-11T14:54:21.493044+00:00
---

# NAC3 + UiPath 集成指南

**NAC3 版本：** 2.2（含 v2.3 互操作预览）
**状态：** 稳定。已针对 UiPath Studio 23.10 + Web Automation v23.10 完成测试。

UiPath 的 Web 自动化目前通过 CSS 选择器、视觉定位或硬编码坐标来抓取 DOM。接入 NAC3 后，应用中每个可点击的组件都会暴露一个稳定的 `data-nac-id`；UiPath 通过该 id 定位元素，UI 重新设计后无需任何改动。

## 为什么选择 NAC3 + UiPath

| 现有痛点 | NAC3 解决方案 |
|--------------|---------|
| CSS 变更导致选择器失效 | `data-nac-id` 在视觉重设计后保持稳定 |
| 按钮移位后锚点/坐标定位失败 | 同上 |
| 跨租户脆弱性（不同客户 ID 不同） | Manifest 声明动作（verb），机器人按动作调用 |
| 等待"元素就绪"的逻辑不稳定 | `nac:action:succeeded` 事件是确定性的 |
| 多语言 UI 需要针对每种语言单独编写自动化 | `label_i18n` 与语言无关，机器人使用 id 而非标签 |

## 两种集成方式

### 方式 A —— Browser activity + JS 注入（推荐）

UiPath 的 `Inject JavaScript` activity 直接运行 `window.NAC.click(...)`，无需选择器，稳定可靠。

```vb
' UiPath sequence pseudocode
Open Browser https://your-app.example.com/
Inject JS: window.NAC.click('invoice.save')
Wait for Event: nac:action:succeeded
```

实现步骤：

1. **Browser activity** —— 标准 UiPath 流程。
2. **Inject JavaScript activity** —— 注入内容：
   ```js
   return await (async () => {
     const result = await window.NAC.click('@id@');
     return JSON.stringify(result);
   })();
   ```
3. **Assign** 将返回的字符串赋值给变量，解析后检查 `{ok: true}`。

基于动作（verb）的调度：

```js
await window.NAC.click_by_verb('@plugin@', '@verb@')
```

填充字段：

```js
await window.NAC.fill('@id@', '@value@')
```

### 方式 B —— 基于选择器的 NAC 感知 xpath

如果你的 UiPath 配置偏向使用选择器，可直接使用 `data-nac-id` 属性：

```xml
<webctrl tag='button' attr='data-nac-id' value='invoice.save' />
```

逻辑相同，但通过 UiPath 的树浏览器消费 Browser DOM。稳定性略低（依赖树的时序），但保留了 UiPath 的惯用方式。

## UiPath 示例工作流

`Examples_NAC_Invoice.xaml`（发布后可从 Yujin marketplace 下载）：

1. **Open Browser** —— 将目标标签页指向符合 NAC-3 规范的应用。
2. **Wait for window.NAC3** —— 注入：
   ```js
   return new Promise(r => {
     const t = setInterval(() => {
       if (window.NAC) { clearInterval(t); r('ready'); }
     }, 100);
   });
   ```
3. **For Each Row** —— 遍历源数据表。
4. **Inject JS** —— 每行执行：
   ```js
   await window.NAC.click_by_verb('invoice', 'new');
   await window.NAC.fill('invoice.client_name', @row("client")@);
   await window.NAC.fill('invoice.amount', @row("amount")@);
   await window.NAC.click_by_verb('invoice', 'save');
   ```
5. **Wait for** —— 等待 nac:action:succeeded，其中 action_id='invoice.save'。
6. **Continue** 循环。

无论底层应用多复杂，整个流程只需 5 个 activity。相比之下，基于 CSS 选择器的等效实现通常需要 30～50 个 activity。

## 发现机制：读取 manifest

UiPath 可在自动化前内省 manifest：

```js
return window.NAC.describe();
```

返回完整的插件树。利用它可以构建动态流程图，在 manifest 变更后无需重新部署 .xaml 即可自动适应。

## 来源可信度（NAC-3）

UiPath 派发的是合成点击，因此 NAC3 确认事件上的 `event.isTrusted === false`。对敏感动作（删除、支付、管理员操作）设有 `is_trusted` 校验的应用，默认情况下**会拒绝** UiPath 的调度。

若要为这些动作启用 RPA，宿主应用必须显式加入白名单：

```js
// In the host app's NAC bootstrap:
window.__NAC_ALLOW_UNTRUSTED__ = ['invoice.save', 'invoice.send'];
```

请与应用负责人讨论威胁模型——绕过 isTrusted 会破坏规范的防伪造保证。UiPath 运行在受控环境中，因此这种权衡通常是可接受的，但务必记录在案。

## 错误处理

NAC3 抛出结构化错误，UiPath 可据此进行分支处理：

```js
try {
  await window.NAC.click('invoice.save');
} catch (e) {
  return JSON.stringify({ ok: false, code: e.code, message: e.message });
}
```

| `e.code` | 含义 | UiPath 分支处理 |
|----------|---------|---------------|
| `not_found` | 当前 DOM 中不存在该 id | 通过 `NAC.describe()` 重新发现 |
| `invalid` | 参数格式错误 | 机器人逻辑 bug，上报处理 |
| `timeout` | 副作用在 5 秒内未确认 | 重试最多 N 次 |

## 测试矩阵

我们在 CI 中使用 UiPath 23.10 针对
[v21 数据表演示](https://yujin.app/nac-spec/example-v21-data-table.php)
对集成进行验证。参考工作流位于本仓库的
`tools/rpa/uipath/InvoiceFromCSV.xaml`（即将发布）。

## 参见

- [SPEC.md 第 5 节](../SPEC.md#5-public-api) —— 完整的 NAC.* 接口说明。
- [SECURITY.md](../SECURITY.md) —— isTrusted 威胁模型。
- [LLM_WIRING.md](LLM_WIRING.md) —— 如果你的 RPA 流程还需要语音/对话输入，可在前端接入 LLM 中间层。
- [NAC_TEST_MANUAL.md](../docs/NAC_TEST_MANUAL.md) —— Yujin 端到端测试此契约的方式。

## 许可证

Apache-2.0。

---

*This is a machine translation of the canonical English
version at `/nac-spec/guides/RPA_UIPATH.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
