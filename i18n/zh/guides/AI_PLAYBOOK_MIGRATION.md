---
translation_source: guides/AI_PLAYBOOK_MIGRATION.md
translation_source_hash: f49b65c798ab36923cab79511851c64a81ad6609a1c37d4936d4c6c0542cc706
translation_quality: machine_v1
translation_lang: zh
translation_date: 2026-05-11T14:52:01.106931+00:00
---

# AI Playbook -- 将现有项目迁移到 NAC3

**NAC3 版本：** 2.2 稳定版 + v2.3 互操作预览版。
**目标读者：** 任何被指派执行棕地迁移任务的 AI 智能体（Claude、GPT、Gemini、本地 LLM），将现有 Web 应用迁移至 NAC-3 合规状态。
**格式：** 分步操作手册，每步包含 WHAT（做什么）、HOW（怎么做）、ASSERT（如何验证）。

当用户说 **"让我们把这个项目迁移到 NAC-3"** 时，读取本文件的 AI 智能体必须按顺序执行以下步骤。棕地迁移比绿地迁移更难，因为不能中断正在运行的应用。每个步骤必须**独立上线**。

---

## Step 0 -- 范围界定 + 安全门控

### 0.1 需要向用户确认的问题

1. **风险边界**：应用是否在生产环境？如果是，则在功能开关后面逐屏迁移。如果是预发布环境，可以更大胆。
2. **框架**：从 `package.json` / `composer.json` / 项目目录结构中检测，然后与用户确认。
3. **Top-10 动词**：请用户列出应用中最常用的 10 个操作（保存、取消、搜索、筛选等）。这些操作优先迁移。
4. **Chat 后端**：是否复用现有的 chat 基础设施（Yujin chat 位于 `/yujin/nac-demo`，或自有 LLM 中间层）？
5. **当前测试覆盖率**：是否已有 Playwright / Cypress / Jest？NAC3 测试将叠加在现有测试旁边，而非替换。
6. **组件库**：shadcn / MUI / PrimeNG / Mantine / 自定义？某些库会吞掉 `data-*` 属性，届时需要包装组件（见 Step 5）。

### 0.2 起飞前 git 卫生检查

```bash
git status              # MUST be clean before starting
git checkout -b feat/nac3-migration
```

每个 NAC 迁移步骤都放在独立的 commit 中，方便用户逐片审查和回滚。

---

## Step 1 -- 安装运行时 + 创建启动模块

```bash
npm install @nac3/runtime@^2.2.0
```

创建 `src/nac/boot.ts`（或对应框架的等效文件）：

```ts
import '@nac3/runtime';
import '@nac3/runtime/extensions';
// import '@nac3/runtime/chat-client';  // uncomment when ready for chat

declare global { interface Window { NAC?: any; NacChat?: any; } }
```

在应用根入口文件（`main.tsx`、`app.module.ts` 或 HTML head 脚本顶部）中导入一次。

**验证：** 在浏览器控制台中确认 `window.NAC` 已定义；`window.NAC.version` 返回 `'2.2.0'`（或更高版本）。

**Commit：** `feat(nac3-migration): step 1 -- install runtime + boot module`

---

## Step 2 -- 装饰应用外壳

在包裹主 UI 的**最外层容器**上添加 `data-nac-plugin="<app-slug>"`。这是迁移中最重要的单个属性——没有它，LLM 中间层的快照将为空（来自 React + Angular 案例研究的 Bug #1，记录于 `docs/CASE_STUDIES_DISCOVERY.md`）。

### React 示例

```tsx
return (
  <div className="app" data-nac-plugin="my-app">
    ...
  </div>
);
```

### Angular 示例

```html
<div class="app" data-nac-plugin="my-app">
  ...
</div>
```

### 服务端渲染（PHP / Rails / Django）

```html
<body data-nac-plugin="my-app">
  ...
</body>
```

**验证：** 在浏览器控制台执行：`NAC.describe().plugins.length >= 1`。

**Commit：** `feat(nac3-migration): step 2 -- root data-nac-plugin attribute`

---

## Step 3 -- 装饰 Top-10 动词按钮

取 Step 0.3 中最常用的 10 个操作。对每个按钮：

```html
<button
  data-nac-id="<plugin>.<verb>"
  data-nac-role="action"
  data-nac-action="<verb>"
  onclick="...">
  ...
</button>
```

**ID 命名规范：**
- 使用插件命名空间：用 `invoice.save`，而非 `save`。
- 小写蛇形命名：用 `add_row`，而非 `AddRow` 或 `add-row`。
- 全局应用动词将动词放在末尾；否则使用嵌套结构：`dashboard.invoice.list.row.42.delete`。

不要修改现有的 `onclick` / 事件处理器——装饰属性是纯增量添加。

**验证：** 在控制台执行：
```js
NAC.describe().plugins[0].elements.length  // >= 10
NAC.list_registered_plugins()                // includes your plugin
```

**Commit：** `feat(nac3-migration): step 3 -- top-10 buttons decorated`

---

## Step 4 -- 添加最小化 manifest

第一天不要试图覆盖所有元素。先用 `label_i18n` 覆盖 Step 3 中的 Top-10 动词按钮：

```ts
// src/nac/manifest.ts
const li = (es:string,en:string,pt:string,fr:string,it:string,
            de:string,ja:string,zh:string,hi:string,ar:string) =>
  ({ es, en, pt, fr, it, de, ja, zh, hi, ar });

export const APP_MANIFEST = {
  plugin_slug: 'my-app',
  version: '1.0.0',
  nac_version: '2.2',
  elements: [
    {
      id: 'my-app.save', role: 'action',
      actions: [{
        verb: 'save',
        label_i18n: li('Guardar','Save','Salvar','Sauver','Salva',
                       'Speichern','保存','保存','sahejna','حفظ')
      }],
      label_i18n: li(/* same */)
    },
    // ... 9 more ...
  ]
};
```

在启动时注册：

```ts
window.NAC?.register(APP_MANIFEST);
```

如果第一天无法提供全部 10 种语言，可在 autoRegister.watch 路径上使用 `i18n_strict: 'permissive'`。这是临时方案；生产环境的 NAC3 v2.2 严格校验器会对不完整的 i18n 发出警告。

**验证：**
```js
NAC.list_registered_plugins()           // ['my-app']
await NAC.click_by_verb('my-app','save')  // resolves
```

**Commit：** `feat(nac3-migration): step 4 -- manifest with top-10 verbs`

---

## Step 5 -- 处理组件库（如适用）

如果应用使用 MUI / Mantine / PrimeNG 等组件库，且按钮会吞掉 `data-*` 属性，则编写一个薄包装组件：

```tsx
// src/nac/NacButton.tsx
import { Button as MuiButton } from '@mui/material';
import { useEffect, useRef } from 'react';

export function NacButton({ nacId, verb, plugin, children, ...rest }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.setAttribute('data-nac-id', nacId);
    el.setAttribute('data-nac-role', 'action');
    el.setAttribute('data-nac-action', verb);
  }, [nacId, verb]);
  return <MuiButton ref={ref} {...rest}>{children}</MuiButton>;
}
```

对 Top-10 按钮，将 `<Button>` 替换为 `<NacButton nacId="..." verb="...">`，增量进行。

**Commit：** `feat(nac3-migration): step 5 -- component library wrapper`

---

## Step 6 -- 发出 ack 契约

v2.2 的 `bindAction` 辅助函数是最简洁的方式：

```ts
import { useRef, useEffect } from 'react';

export function useNacAction(plugin: string, actionId: string) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || !window.NAC) return;
    return window.NAC.bindAction(el, () => {}, { plugin, action_id: actionId });
  }, [plugin, actionId]);
  return ref;
}
```

```tsx
function SaveButton({ onSave }) {
  const ref = useNacAction('my-app', 'my-app.save');
  return <button ref={ref} onClick={onSave}>Save</button>;
}
```

`bindAction` 层会在用户的 `onClick` 返回后自动触发 `nac:action:succeeded`。不再出现"chat 提示 'No pude ejecutar X: timeout'"的问题。

**验证：** 在控制台执行：
```js
document.addEventListener('nac:action:succeeded', e => console.log(e.detail));
await NAC.click('my-app.save');
// Should print {plugin: 'my-app', action_id: 'my-app.save', ...}
```

**Commit：** `feat(nac3-migration): step 6 -- bindAction ack contract`

---

## Step 7 -- 添加字段 + 标签页

对用户输入的每个输入框：

```html
<input data-nac-id="my-app.field_x" data-nac-role="field" ...>
```

对标签页组件中的每个标签页：

```html
<button
  data-nac-id="tab.<key>"
  data-nac-role="tab"
  onclick="...">
  ...
</button>
```

**关键点（v2.2 严格校验器规则）：** ID 匹配 `^tab\.` 的元素**必须**具有 `tab` role。Role 不匹配会产生 `tab_id_manifest_role_drift` 发现项，运行时将无法通过 `NAC.tab()` 找到该标签页。

**Commit：** `feat(nac3-migration): step 7 -- fields + tabs decorated`

---

## Step 8 -- 添加 chat 面板（可选，可延后）

引入参考实现 `nac-chat-client.js`：

```html
<aside class="chat" data-nac-plugin="chat" aria-hidden="true">
  <div id="chat-log" data-nac-id="chat.log" data-nac-role="region"></div>
  <input id="chat-input" data-nac-id="chat.input" data-nac-role="field">
  <button id="chat-send" data-nac-id="chat.send" data-nac-role="action">send</button>
</aside>

<script src="https://yujin.app/nac-spec/js/nac-chat-client.js?v=v22"></script>
<script>
NacChat.init({
  endpoint: '/your-llm-intermediary',   // or '/crm/api/v1/yujin/nac-demo'
  chatLog: document.getElementById('chat-log'),
  input:   document.getElementById('chat-input'),
  sendBtn: document.getElementById('chat-send')
});
</script>
```

或者，**完全推迟 chat 集成**，告知用户安装 Yujin Pilot（`yujin.app/pilot`），它会通过 MCP 发现你的应用并从中央驾驶舱驱动它。

**Commit：** `feat(nac3-migration): step 8 -- chat panel`

---

## Step 9 -- 叠加 NAC3 测试语料库

复制 Yujin 参考测试基础设施：

```bash
mkdir -p test/nac3
cp /path/to/rpaforce-crm/packages/nac/test/stage*.mjs ./test/nac3/
cp /path/to/rpaforce-crm/tools/nac/test-launch.sh ./test/nac3/
```

调整插件 slug 和 manifest 引用，然后运行：

```bash
bash ./test/nac3/test-launch.sh
```

**验证：** 所有层级均为绿色（GREEN）。

**Commit：** `feat(nac3-migration): step 9 -- NAC3 test corpus`

---

## Step 10 -- 晋升至 NAC-3 合规状态

```bash
# In your CI:
npx @nac3/runtime validate ./src --severity=error  # exit 0 required
NAC.validate_global({probe: true})              # zero findings required
```

在生产启动配置中设置 `NAC.STRICT_VALIDATION = true`，以在注册时强制执行 role 一致性校验。

**Commit：** `feat(nac3-migration): step 10 -- NAC-3 conformance gate`

---

## 多屏迁移顺序

对于拥有多个页面的生产应用，不要试图一次性全部迁移：

1. **最常用的页面优先**（如登录页 + 仪表盘）。
2. **价值最高的页面其次**（高级用户最常驻留的页面）。
3. **面向公众的页面**（匿名流量可见的页面）。
4. **管理后台页面最后**（流量低，验收周期长）。

每个页面单独提 PR。如果有功能开关，每个 PR 都在开关后面上线；翻转开关即可回滚。

---

## 常见迁移陷阱

1. **忘记在根元素上添加 `data-nac-plugin`。** Manifest 已注册，但 LLM 对其视而不见。**症状：** chat 显示通用的"How can I help"，没有任何操作。修复：添加该属性。（案例研究 Bug #1。）
2. **React 状态在 onChatAction 中出现陈旧闭包。** 使用 ref + 函数式 setter。（案例研究 Bug #2。）
3. **Tab ID 使用了非 tab role。** v2.2 严格校验器发现项。`^tab\.` 必须具有 `tab` role。
4. **重构后复用了旧 ID。** 按钮移至新语义 role 后必须分配新 ID。复用 ID 会破坏下游自动化。
5. **组件库吞掉了 `data-*` 属性。** 尽早发现；编写包装组件（Step 5）。
6. **点击处理器未发出 ack。** 使用 `bindAction`。没有它，即使副作用已生效，`NAC.click()` 也会在 5 秒后超时。

---

## 参见

- [AI_PLAYBOOK_NEW_PROJECT.md](AI_PLAYBOOK_NEW_PROJECT.md) -- 绿地项目指南。
- [REACT.md](REACT.md) / [ANGULAR.md](ANGULAR.md) -- 框架深度解析。
- [NAC_TEST_MANUAL.md](../docs/NAC_TEST_MANUAL.md) -- 迁移后测试手册。
- [CASE_STUDIES_DISCOVERY.md](../docs/CASE_STUDIES_DISCOVERY.md) -- Yujin 参考迁移过程中发现的 Bug。

## 许可证

Apache-2.0.

---

*This is a machine translation of the canonical English
version at `/nac-spec/guides/AI_PLAYBOOK_MIGRATION.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
