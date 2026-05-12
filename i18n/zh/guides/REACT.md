---
translation_source: guides/REACT.md
translation_source_hash: 9026b361e9e072347481a1f4492eea6f306e77cbbdb53b0d1a40d25008dbecdd
translation_quality: machine_v1
translation_lang: zh
translation_date: 2026-05-11T14:47:42.879498+00:00
---

# NAC3 + React 集成指南

本指南通过两种路径将 React 应用接入 NAC 驱动：

- **Greenfield：** 全新项目，从第一天起就使用 NAC3。
- **Brownfield：** 现有应用，渐进式引入 NAC3，无需重写。

两种路径均使用 npm 上的 `@nac3/runtime`。不依赖特定构建工具；兼容 Vite、Next.js、Create React App、Remix 或任何能打包普通 npm 包的工具链。

---

## 1. 安装

```
npm install @nac3/runtime
```

首次导入后，该包会将运行时挂载为 `window.NAC`。运行时与框架无关；React 只需在 JSX 上添加 `data-nac-*` 属性，并通过 `useEffect` 注册 manifest。

---

## 2. Greenfield —— 新项目

### 2.1 挂载运行时（仅一次）

在根组件（或 `main.tsx` / `_app.tsx`）中：

```tsx
import { useEffect } from 'react';
import '@nac3/runtime';
import '@nac3/runtime/extensions';   // v2.0 brownfield 原语 + HMAC
// 可选：'@nac3/runtime/chat-client' 用于语音 + 聊天

export function App() {
  useEffect(() => {
    // 租户前缀（多租户 SaaS 模式）。单租户可跳过。
    if (window.NAC?.setTenantPrefix) {
      window.NAC.setTenantPrefix('demo');
    }
    // 如果你下发签名 manifest，需要设置 HMAC 密钥，从认证 API 获取。
    // window.NAC.set_provenance_secret(secret);
  }, []);

  return <YourAppShell />;
}
```

### 2.2 为组件添加标注

每个可点击 / 可填写 / 可切换的元素都需要：

- `data-nac-id` —— 稳定的点分路径。
- `data-nac-role` —— 规范角色之一（参见 SPEC 第 1 节）。
- `data-nac-action="<动词>"` —— 仅用于 `role="action"`。

```tsx
function InvoiceForm({ invoice, onSave, onCancel }) {
  return (
    <article data-nac-plugin="invoice">
      <input
        type="text"
        data-nac-id="invoice.client_name"
        data-nac-role="field"
        value={invoice.clientName}
        onChange={(e) => /* ... */}
      />

      <button
        data-nac-id="invoice.save"
        data-nac-role="action"
        data-nac-action="save"
        onClick={onSave}
      >
        Save
      </button>

      <button
        data-nac-id="invoice.cancel"
        data-nac-role="action"
        data-nac-action="cancel"
        onClick={onCancel}
      >
        Cancel
      </button>
    </article>
  );
}
```

### 2.3 注册 manifest

manifest 是面向 Agent 的权威数据源。LLM 解析"guardar"时，会在此处找到动词 `save`：

```tsx
import { useEffect } from 'react';

const INVOICE_MANIFEST = {
  plugin_slug: 'invoice',
  version: '1.0.0',
  nac_version: '2.1',
  elements: [
    {
      id: 'invoice.client_name',
      role: 'field',
      label_i18n: {
        es: 'Nombre del cliente', en: 'Customer name',
        pt: 'Nome do cliente', fr: 'Nom du client',
        it: 'Nome del cliente', de: 'Kundenname',
        ja: '顧客名', zh: '客户名称',
        hi: 'ग्राहक का नाम', ar: 'اسم العميل'
      }
    },
    {
      id: 'invoice.save',
      role: 'action',
      actions: [{
        verb: 'save',
        label_i18n: { /* 10 个语言区域 */ }
      }],
      label_i18n: { /* 10 个语言区域 */ }
    },
    {
      id: 'invoice.cancel',
      role: 'action',
      actions: [{
        verb: 'cancel',
        label_i18n: { /* 10 个语言区域 */ }
      }],
      label_i18n: { /* 10 个语言区域 */ }
    }
  ]
};

export function InvoiceForm(props) {
  useEffect(() => {
    if (!window.NAC) return;
    window.NAC.register(INVOICE_MANIFEST);
  }, []);
  // ... 来自 2.2 的 JSX ...
}
```

关键规则：

- `useEffect` 使用 `[]` 依赖：仅在挂载时注册一次。
- manifest 是静态对象；不要在每次渲染时重新构建（运行时将 `register` 视为幂等操作，但会浪费计算资源）。
- React Strict Mode 在开发环境下会双重调用 effect。运行时的 `register` 是幂等的，安全无虞。

### 2.4 在处理函数中发出成功事件

如果运行时将由等待 `NAC.click()` 的 Agent 驱动，你的处理函数必须在副作用完成后发出 `nac:action:succeeded`：

```tsx
function onSave() {
  await api.saveInvoice(/* ... */);
  document.dispatchEvent(new CustomEvent('nac:action:succeeded', {
    detail: { plugin: 'invoice', action_id: 'invoice.save' }
  }));
}
```

这是 v2.1 的契约。v2.2 将提供 `useNACAction` hook 自动完成此操作（见下方 Hooks 章节）。

### 2.5 驱动它

从任意 Agent、语音运行器或测试中调用：

```tsx
await window.NAC.click('invoice.save');
// 或通过动词：
await window.NAC.click_by_verb('invoice', 'save');
// 或填写字段：
await window.NAC.fill('invoice.client_name', 'Acme Corp');
```

---

## 3. Brownfield —— 现有 React 应用

核心原则：不要一次性重构所有内容。先为一个组件添加 NAC3，验证通过后再推进。

### 3.1 推进顺序

1. **先处理顶层包装元素。** 在根 `<div>` 或 `<main>` 上添加 `data-nac-plugin="<你的应用标识>"`。运行时的作用域树会自动识别。
2. **接着处理最常用的按钮。** 在最繁忙的页面中，为保存、取消、提交、删除按钮添加 `data-nac-id`、`data-nac-role="action"`、`data-nac-action="<动词>"`。暂时不需要添加 manifest。
3. **验证运行时能识别它们。** 打开 DevTools，运行 `NAC.describe()`。这些按钮应出现在对应的 plugin slug 下。
4. **添加最小化 manifest。** 仅包含第 2 步中的按钮及其动词。此时 `NAC.click_by_verb()` 即可使用。
5. **添加字段。** 为输入框添加 `data-nac-role="field"` 及对应的 manifest 条目。
6. **添加标签页。** 标签切换器添加 `data-nac-role="tab"`。**重要：** id 匹配 `^tab\.` 的元素必须使用 `tab` 角色（运行时的 `NAC.tab()` 查询仅针对规范角色；参见 SPEC 第 1 节）。

### 3.2 不要与现有组件库对抗

你可能使用了 shadcn / Mantine / MUI / Chakra 或自定义组件系统。这些库大多会渲染自己的 DOM。以下两种模式可行：

**模式 A：透传 NAC3 属性。** 大多数构建良好的库会将未知 props 转发到底层 DOM 元素：

```tsx
<Button
  data-nac-id="invoice.save"
  data-nac-role="action"
  data-nac-action="save"
  onClick={onSave}
>
  Save
</Button>
```

如果你的库能转发 `data-*` 属性，这样就足够了。

**模式 B：包装组件。** 如果你的库会吞掉 `data-*` props，写一个轻量包装器：

```tsx
import { Button as MuiButton } from '@mui/material';
import { useEffect, useRef } from 'react';

interface NACButtonProps {
  nacId: string;
  verb: string;
  // ...其他 MUI props
}

export function NACButton({ nacId, verb, ...rest }: NACButtonProps) {
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    ref.current.setAttribute('data-nac-id', nacId);
    ref.current.setAttribute('data-nac-role', 'action');
    ref.current.setAttribute('data-nac-action', verb);
  }, [nacId, verb]);
  return <MuiButton ref={ref} {...rest} />;
}
```

### 3.3 从 DOM 自动注册

如果手动声明 manifest 过于繁琐，v2.0 扩展 `autoRegister.watch` 可以遍历 DOM，自动注册所有带有 `data-nac-id` + `data-nac-role` 的元素：

```tsx
useEffect(() => {
  if (!window.NAC?.autoRegister) return;
  const root = document.querySelector('[data-nac-plugin]');
  if (!root) return;
  root.setAttribute('data-nac-watch', '1');
  window.NAC.autoRegister.watch(root, {
    i18n_strict: 'permissive',  // 迁移期间接受不完整的 10 语言区域
    throttleMs: 100
  });
}, []);
```

Brownfield 场景适合使用 `i18n_strict: 'permissive'`。待 i18n 目录完善后，切换为 `'strict'` 用于生产环境。

---

## 4. Hooks（v2.2 预览）

以下 hooks 将在 v2.2 中发布。对于 v2.1，你可以直接将它们复制到项目中使用；它们封装了 v2.1 运行时，提供更符合 React 惯用风格的 API。

### 4.1 `useNACManifest`

```tsx
export function useNACManifest(manifest) {
  useEffect(() => {
    if (!window.NAC) return;
    window.NAC.register(manifest);
  }, [manifest.plugin_slug]);  // 仅在 slug 变更时重新注册
}
```

### 4.2 `useNACAction` —— 自动发出确认事件

```tsx
import { useEffect, useRef } from 'react';

export function useNACAction(plugin: string, actionId: string) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    function onClick() {
      // 在 React 的 onClick 执行后发出 v2.1 契约事件。
      // 使用微任务延迟，确保 React 合成事件先完成。
      queueMicrotask(() => {
        document.dispatchEvent(new CustomEvent('nac:action:succeeded', {
          detail: { plugin, action_id: actionId }
        }));
      });
    }
    el.addEventListener('click', onClick);
    return () => el.removeEventListener('click', onClick);
  }, [plugin, actionId]);
  return ref;
}
```

用法：

```tsx
function SaveButton({ onSave }) {
  const ref = useNACAction('invoice', 'invoice.save');
  return (
    <button
      ref={ref}
      data-nac-id="invoice.save"
      data-nac-role="action"
      data-nac-action="save"
      onClick={onSave}
    >
      Save
    </button>
  );
}
```

### 4.3 `useNACDescribe` —— 从面板内省树结构

```tsx
import { useState, useEffect } from 'react';

export function useNACDescribe() {
  const [snap, setSnap] = useState(null);
  useEffect(() => {
    if (!window.NAC) return;
    setSnap(window.NAC.describe());
    const tick = setInterval(() => setSnap(window.NAC.describe()), 1000);
    return () => clearInterval(tick);
  }, []);
  return snap;
}
```

---

## 5. 测试

### 5.1 单元测试 + 集成测试

NAC3 与 React Testing Library 配合良好：

```tsx
import { render, fireEvent, waitFor } from '@testing-library/react';
import '@nac3/runtime';
import { InvoiceForm } from './InvoiceForm';

test('save button drives via NAC', async () => {
  render(<InvoiceForm />);

  const saved = jest.fn();
  document.addEventListener('nac:action:succeeded', saved);

  await window.NAC.click('invoice.save');

  await waitFor(() => expect(saved).toHaveBeenCalled());
});
```

### 5.2 端到端测试（Playwright）

```ts
import { test, expect } from '@playwright/test';

test('invoice save', async ({ page }) => {
  await page.goto('/invoices/new');
  await page.evaluate(() => window.NAC.fill('invoice.client_name', 'Acme'));
  await page.evaluate(() => window.NAC.click('invoice.save'));
  await expect(page.getByText('Invoice saved')).toBeVisible();
});
```

---

## 6. 常见陷阱

- **键控列表中的 id 失效。** 如果你用行索引构建 id（`data-nac-id={'row.' + i}`），行顺序变化后，缓存了该 id 的 Agent 会失效。请使用稳定的键（如数据库 id）。
- **条件渲染。** 基于 `if (loaded)` 挂载/卸载的按钮，会让在加载前已快照树结构的 LLM 感到困惑。告知 LLM：`NAC.describe()` 为每个元素包含 `mounted` 标志（v2.1 默认开启）；快照消费方应按此字段过滤。
- **React 18 Strict Mode。** 双重调用 effect 会重复注册 manifest。运行时是幂等的，安全无虞，但开发环境下会看到重复的日志行。
- **Server Components / SSR。** NAC3 仅在客户端运行。将使用 NAC 的组件标记为 `'use client'`（Next.js App Router），或采用懒加载渲染。

---

## 7. 上线前准备

发布前请确认：

1. 将 `i18n_strict: 'permissive'` 替换为 `'strict'`。CI 会捕获缺失的翻译。
2. 运行 `npx @nac3/runtime validate ./src` —— 期望零个 error 级别的问题。
3. 在 Playwright 测试中运行 `NAC.validate_global()`，断言其返回 `[]`。
4. 如果是多租户场景，确保 manifest 在服务端经过 HMAC 签名，并在已认证的代码中调用 `NAC.set_provenance_secret()`。

---

## 8. 延伸阅读

- `SPEC.md` —— 完整契约说明。
- `guides/LLM_WIRING.md` —— 将"guardar la factura"解析为 `NAC.click_by_verb('invoice','save')` 的中间层后端实现。
- `SECURITY.md` —— 威胁模型。
- yujin.app/nac-spec/ 上的示例（`example.php` 是 v1.9 参考实现；`example-v20-full.php` 是 Brownfield 迁移示例）。

---

*This is a machine translation of the canonical English
version at `/nac-spec/guides/REACT.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
