---
translation_source: guides/AI_PLAYBOOK_NEW_PROJECT.md
translation_source_hash: 6586a966938a6d84086a8b79805cde15886536b6718b79526ff7d16d202686fe
translation_quality: machine_v1
translation_lang: zh
translation_date: 2026-05-11T14:50:54.171713+00:00
---

# AI Playbook -- 新建 NAC-3 项目

**NAC3 版本：** 2.2 稳定版 + v2.3 互操作预览版。
**适用对象：** 任何被指派从零开始搭建 NAC-3 合规项目的 AI 代理（Claude、GPT、Gemini、本地 LLM）。
**格式：** 分步操作手册。每个步骤包含 WHAT（做什么）、HOW（怎么做）、ASSERT（验证）。
无歧义。

当用户说 **"让我们新建一个 NAC-3 项目"** 或类似表述时，读取本文件的 AI 代理必须按顺序执行以下步骤，并在推进前验证每个关卡。

---

## Step 0 -- 与用户确认范围

在编写任何代码之前，请逐一询问以下问题：

1. **框架**：React、Angular、Vue、Svelte、原生 JS，还是服务端渲染（PHP/Rails/Django）？
2. **语言**：应用上线时需要支持 NAC3 的哪些语言区域（最多 10 个）？（es、en、pt、fr、it、de、ja、zh、hi、ar）
3. **聊天后端**：应用是否自行暴露 LLM 中间层（提供 endpoint），还是使用托管的 Yujin 聊天服务？
4. **来源标识**：是否多租户？如果是，需规划 HMAC 清单签名。
5. **语音**：仅按键通话、免提，还是两者都支持？
6. **互操作（v2.3 预览）**：此应用是否需要被其他 NAC3 宿主（Yujin Pilot、对等应用）导入？是 -> 暴露 MCP server 工具。

记录每个答案，它们将驱动后续所有决策。

---

## Step 1 -- 初始化项目

### React (Vite)

```bash
npm create vite@latest <slug> -- --template react-ts
cd <slug>
npm install
npm install @nac3/runtime@^2.2.0
```

### Angular

```bash
npx -p @angular/cli ng new <slug> --style=css --routing=true --strict
cd <slug>
npm install @nac3/runtime@^2.2.0
```

### 原生（HTML + JS + PHP，无框架）

创建：
- `index.html`，包含 `<body data-nac-plugin="app">`。
- `js/app.js`，包含相关导入。

### 服务端渲染

通过 CDN 嵌入 `@nac3/runtime`：

```html
<script src="https://yujin.app/nac-spec/js/nac.js?v=v22"></script>
<script src="https://yujin.app/nac-spec/js/nac-v2-extensions.js?v=v22"></script>
```

**验证：** `npm run build`（或框架对应命令）无报错完成。在浏览器中打开；`window.NAC` 已定义。

---

## Step 2 -- 装饰 Shell

在模板的**根容器**中添加：

```html
<div data-nac-plugin="<your-app-slug>" class="app">
  ...
</div>
```

在**每个可点击控件**（按钮、用作按钮的链接）上添加：

```html
<button
  data-nac-id="<slug>.<verb>"
  data-nac-role="action"
  data-nac-action="<verb>"
  onclick="...">
  ...
</button>
```

在**每个表单字段**（input、textarea、select）上添加：

```html
<input
  data-nac-id="<slug>.<field-name>"
  data-nac-role="field"
  ... />
```

在**每个 tab 按钮**上添加（规范严格要求：`^tab\.` 开头的 id 必须具有 `tab` role）：

```html
<button
  data-nac-id="tab.<key>"
  data-nac-role="tab"
  onclick="...">
  ...
</button>
```

**验证：** `npx @nac3/runtime validate ./src` 报告零个 error 级别的发现。在浏览器控制台执行 `NAC.describe()`，返回包含 `data-nac-plugin` 匹配项的树结构。

---

## Step 3 -- 编写清单

创建 `src/nac/manifest.ts`（或等效文件）：

```ts
const li = (es:string,en:string,pt:string,fr:string,it:string,
            de:string,ja:string,zh:string,hi:string,ar:string) =>
  ({ es, en, pt, fr, it, de, ja, zh, hi, ar });

export const APP_MANIFEST = {
  plugin_slug: '<your-app-slug>',
  version: '1.0.0',
  nac_version: '2.2',
  elements: [
    {
      id: '<slug>.save',
      role: 'action',
      actions: [{
        verb: 'save',
        label_i18n: li('Guardar','Save','Salvar','Sauver','Salva',
                       'Speichern','保存','保存','sahejna','حفظ')
      }],
      label_i18n: li(/* same 10 */)
    },
    // ... 其他所有元素 ...
  ]
};
```

**关键规则：**
- 每个 `label_i18n` 必须覆盖全部 10 个语言区域。填写不完整是 v2.2 严格验证器的发现项。
- 每个 id 匹配 `^tab\.` 的元素必须具有 `role: 'tab'`。
- 每个 `id` 必须带有插件命名空间前缀（例如 `invoice.save`，而非 `save`）。
- ID 在 UI 重新设计后必须保持稳定。

**验证：** `NAC.validate_global({probe: false})` 返回 0 个 error 级别的发现。

---

## Step 4 -- 在启动时注册清单

### React

```tsx
import { useEffect } from 'react';
import '@nac3/runtime';
import '@nac3/runtime/extensions';
import { APP_MANIFEST } from './nac/manifest';

export function App() {
  useEffect(() => {
    window.NAC?.register(APP_MANIFEST);
  }, []);
  // ...
}
```

### Angular

```ts
import { Injectable } from '@angular/core';
import '@nac3/runtime';
import '@nac3/runtime/extensions';
import { APP_MANIFEST } from './nac/manifest';

@Injectable({ providedIn: 'root' })
export class NacBoot {
  constructor() {
    (window as any).NAC?.register(APP_MANIFEST);
  }
}
```

将 `NacBoot` 注入到 `AppComponent` 中。

### 原生

```html
<script type="module">
import { APP_MANIFEST } from './nac/manifest.js';
window.NAC.register(APP_MANIFEST);
</script>
```

**验证：** `NAC.list_registered_plugins()` 返回 `['<your-app-slug>']`。

---

## Step 5 -- 在每个点击处理器中触发 ack 契约

对于每个带有 `data-nac-role="action"` 的按钮，点击处理器在完成同步副作用后必须触发 `nac:action:succeeded`。

### 方式 A -- 通过 `NAC.bindAction`（v2.2 辅助方法，推荐）

```ts
const btn = document.querySelector('[data-nac-id="<slug>.save"]');
NAC.bindAction(btn, function (ev) {
  saveInvoice();          // 你的副作用
}, { plugin: '<slug>', action_id: '<slug>.save' });
```

`bindAction` 自动处理同步、异步（Promise）和抛出异常三种情况。

### 方式 B -- 手动触发

```ts
button.addEventListener('click', function () {
  saveInvoice();
  document.dispatchEvent(new CustomEvent('nac:action:succeeded', {
    detail: { plugin: '<slug>', action_id: '<slug>.save' }
  }));
});
```

其他 role 触发对应的标准事件族：
- `role="field"` -> `nac:field:changed`（detail：`{plugin, field_id, value}`）
- `role="tab"` -> `nac:tab:activated`（detail：`{plugin, tab_id}`）
- 完整事件表见 SPEC.md 第 6 节。

**验证：** 在浏览器控制台执行：
```js
document.addEventListener('nac:action:succeeded', e => console.log(e.detail));
await NAC.click('<slug>.save');
// 应打印 {plugin: '<slug>', action_id: '<slug>.save', ...}
```

---

## Step 6 -- 接入聊天面板

嵌入参考聊天客户端，或使用 Yujin Pilot（外部）。

### 选项 A -- 嵌入 `nac-chat-client.js`

```html
<aside class="chat" data-nac-plugin="chat" aria-hidden="true">
  <header class="chat-head">...</header>
  <div id="chat-log" data-nac-id="chat.log" data-nac-role="region"></div>
  <input id="chat-input" data-nac-id="chat.input" data-nac-role="field">
  <button id="chat-send" data-nac-id="chat.send" data-nac-role="action">send</button>
</aside>

<script src="https://yujin.app/nac-spec/js/nac-chat-client.js?v=v22"></script>
<script>
  NacChat.init({
    endpoint: '/api/your-llm-intermediary',
    chatLog: document.getElementById('chat-log'),
    input:   document.getElementById('chat-input'),
    sendBtn: document.getElementById('chat-send')
  });
</script>
```

你需要提供 `endpoint`——即 LLM 中间层后端，接收 `{prompt, lang, history, nac_tree}` 并返回 `{message, actions[]}`。详见 `LLM_WIRING.md`。

### 选项 B -- 交由 Yujin Pilot 处理

不嵌入聊天功能。告知用户"请安装 Yujin Pilot（yujin.app/pilot）以在此应用上使用语音和聊天功能"。Pilot 的 MCP 扫描器会自动发现你的应用，并从其中央驾驶舱驱动它。

---

## Step 7 -- 运行测试语料库

将 Yujin 参考测试基础设施复制为起点：

```bash
# 在项目根目录执行
cp -r /path/to/rpaforce-crm/packages/nac/test ./test
cp -r /path/to/rpaforce-crm/tools/nac/test-launch.sh ./tools/test-launch.sh
```

编辑 `test/stage*.mjs`，将清单和插件 slug 替换为你的应用的，骨架结构保持不变。

运行：

```bash
bash ./tools/test-launch.sh
```

**验证：** 所有 node 端层级均为 GREEN。总耗时 < 15s。

---

## Step 8 -- 添加 Playwright e2e 测试

```bash
mkdir -p tests/e2e-nac
cd tests/e2e-nac
npm init -y
npm install --save-dev @playwright/test
npx playwright install chromium
```

以 Yujin 参考项目的 `tests/e2e-nac/specs/01-landing.spec.ts` 为模板进行复制，并适配为你的应用 URL 和插件 slug。

**完整流水线测试**（聊天 -> LLM -> 分发 -> DOM -> ack），参见 Yujin 的 `08-pipeline-end-to-end.spec.ts`。其中三个测试用例针对你的实时后端覆盖完整流程。

---

## Step 9 -- 生产环境检查清单

部署前：

- [ ] `NAC.STRICT_VALIDATION = true` -- 强制注册时进行 role 校验（发现漂移时抛出异常）。
- [ ] `npx @nac3/runtime validate ./src` -- 零个 error 级别的发现。
- [ ] `npm test`（你的测试套件）-- 100% 通过。
- [ ] `npx playwright test` -- 所有 e2e 测试绿灯。
- [ ] 多租户：在服务端对清单进行 HMAC 签名；在已认证代码中调用 `NAC.set_provenance_secret()`。
- [ ] `is_trusted` 门控动词：明确将允许 RPA 机器人/合成点击触发的动词加入白名单（见 SECURITY.md）。
- [ ] i18n：每个 `label_i18n` 覆盖全部 10 个语言区域（迁移期间可使用 `i18n_strict: 'permissive'`）。

---

## Step 10 -- 晋升为 NAC-3 合规

运行 `NAC.validate_global({probe: true})`。运行时会对每个 `role="action"` 元素合成点击，验证每个元素是否在 5 秒内触发其 ack。

**验证：** 零个发现。你的应用已达到 NAC-3 合规。

---

## AI 常见错误（及规避方法）

1. **注册清单时 DOM 上缺少 `data-nac-plugin`。**
   运行时的 `NAC.describe()` 遍历 DOM，而非注册表。没有该属性，LLM 中间层的快照对该插件而言将为空。务必两者配套使用。
2. **聊天处理器闭包捕获了 React/Vue 状态。** 使用 ref 或函数式 setter。详见 CASE_STUDIES_DISCOVERY.md bug #2。
3. **i18n 不完整。** v2.2 严格验证器会在 `label_i18n` 映射不完整时报错。如果必须带缺失项上线，使用 `i18n_strict: 'permissive'` 并创建 TODO 工单；这不是永久的解决方案。
4. **重构后复用 ID。** 按钮被重命名为新的语义 role 后，必须分配新的 id。复用 ID 会破坏所有下游代理脚本。
5. **忘记触发 ack 事件。** 处理器同步完成工作但未触发 `nac:action:succeeded`，会导致 `NAC.click()` 超时。使用 `bindAction` 将契约内置其中。

---

## 参见

- [SPEC.md](../SPEC.md) -- 规范契约。
- [AI_PLAYBOOK_MIGRATION.md](AI_PLAYBOOK_MIGRATION.md) -- 棕地项目迁移指南。
- [NAC_TEST_MANUAL.md](../docs/NAC_TEST_MANUAL.md) -- 适用于任何 NAC-3 应用的测试手册。
- [REACT.md](REACT.md) / [ANGULAR.md](ANGULAR.md) -- 框架深度指南。

## 许可证

Apache-2.0.

---

*This is a machine translation of the canonical English
version at `/nac-spec/guides/AI_PLAYBOOK_NEW_PROJECT.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
