---
translation_source: docs/CASE_STUDIES_DISCOVERY.md
translation_source_hash: 59b940d486104c6a9b42d59c1ee6f16c25eb01c0c08b8b98458c68ef4312ed77
translation_quality: machine_v1
translation_lang: zh
translation_date: 2026-05-11T15:19:55.338391+00:00
---

# 案例研究 —— 自主发现的演示 Bug

这些 Bug 由诊断性 Playwright 扫描在 `yujin.app/nac-spec/demos/react/` 和 `/demos/angular/` 中发现。Pablo 于 2026-05-11 要求我在他不描述症状的情况下自行发现、记录并修复。本文件记录了发现过程与修复方案。

---

## Bug #1（高危）—— LLM 中间层无法获取应用的 manifest

**受影响的演示：** React + Angular。

**可观测症状：** 用户在 React 或 Angular 演示的聊天面板中输入"hola"时，聊天回复的是通用的"How can I help you with this page?"，完全不知道这是一个待办事项应用。当用户说"agrega tomar agua"时，LLM 无法派发 `click_by_verb('todos', 'add_todo')`，因为它根本不知道该插件的存在。

**发现方式。** 诊断规格在聊天交互期间捕获所有 `page.console` 消息。聊天客户端日志如下：

```
[nac-chat] snapshot plugins (1): chat
[nac-chat] backend response: message="Hi! How can I help you with this page?" actions=[]
```

`snapshot plugins (1): chat` 是关键线索 —— 发送给 LLM 的快照中只出现了**一个**插件，即 `chat` 插件。演示通过 `NAC.register(TODOS_MANIFEST)` 注册的 `todos` 插件完全缺失。

**根本原因。** `NAC.describe()` 通过遍历 DOM 中的 `[data-nac-plugin="..."]` 元素来枚举插件（位于 `yujin.app/nac-spec/js/nac.js` 第约 1557 行）。聊天面板的 `<aside class="chat" data-nac-plugin="chat">` 带有该属性，而应用的待办事项区域则没有。运行时从未将待办事项区域识别为插件作用域，因此 `describe()`、`snapshotTree()` 以及 LLM 均无法感知它的存在。

通过 `NAC.register(...)` 注册 manifest 只会填充内部的 `_manifests` 映射，**不会**自动将 `data-nac-plugin` 属性附加到 DOM 上。这是调用方的责任。

**修复方案。** 在两个演示的主应用容器上添加 `data-nac-plugin="todos"`：

- React：`<div className="app">` -> `<div className="app" data-nac-plugin="todos">`
- Angular：模板中的 `<div class="app">` -> `<div class="app" data-nac-plugin="todos">`

修复后，`NAC.describe()` 返回 2 个插件（`todos` + `chat`），快照携带两份 manifest，LLM 即可针对 `todos.*` 派发基于动词的操作。

**对手册的启示。** NAC3 合约要求**同时满足**以下两点：
1. 通过 `NAC.register(manifest)` 声明 schema。
2. 在某个 DOM 根节点上添加 `data-nac-plugin="<slug>"` 以将插件纳入作用域树。

采用指南和 NAC_TEST_MANUAL 应明确说明这一点。接入者的常见错误是只注册 manifest 而忘记添加 DOM 属性，从而产生上述"LLM 失明"症状。应在 `stage2-disambiguation.mjs` 中添加回归测试：快照必须包含**所有**已注册的插件，否则标记为发现项。

---

## Bug #2（中危）—— React 的 onChatAction 处理器捕获了过时的 state

**受影响的演示：** 仅 React。Angular 的 signals + `update()` 机制不存在此类问题。

**可观测症状：** Bug #1 修复部署后，聊天驱动的动词派发仍然无法添加待办事项。发送"agrega leche"后没有新增任何待办项。LLM 正确生成了两步操作序列（`fill todos.input "leche"` + `click_by_verb todos add_todo`），但 `add_todo` 处理器执行时 `input.trim() === ''`，静默返回，未调用 `addTodo()`。

**发现方式。** 第二轮深度诊断 Playwright 扫描在聊天驱动的添加操作前后捕获行数变化。发现项如下：

```
[WARN] chat.dispatch: [react] chat "agrega leche" did not add a
todo (before=3, after=3). May be LLM hallucination or dispatch
broken.
```

**根本原因。** `App.tsx` 中用于注册聊天处理器的 `useEffect` 依赖项为 `[input, todos]`。处理器在**注册时**捕获了 React state 的值。当 LLM 同步发送 `actions[]` 时，聊天客户端依次派发：
1. `fill todos.input "leche"` -> 调用 `setInput('leche')`，将重新渲染加入队列。
2. `click_by_verb todos add_todo` -> **立即**执行，在同一个 JS 任务中。此时 React 尚未重新渲染，处理器的闭包中 `input` 仍为 `''`。`input.trim()` 检查失败，`addTodo()` 永远不会执行。

这是经典的 React 闭包捕获过时 state 问题。

**修复方案。** 使用一个 `useRef` 来镜像 `input`；处理器从 ref（始终是最新值）中读取，而非从闭包中读取。`todos` 也采用同样的模式，以备未来的动词需要用到它。

```ts
const inputRef = useRef(input);
useEffect(() => { inputRef.current = input; }, [input]);

useEffect(() => {
  if (!window.NacChat) return;
  window.NacChat.onAction('click_by_verb', (a) => {
    if (a.plugin === 'todos' && a.verb === 'add_todo') {
      const text = (a as any).args?.text || inputRef.current.trim();
      if (text) {
        addTodoFromText(text);
        return { ok: true };
      }
    }
    ...
  });
}, []); // 只注册一次
```

额外收益：同时支持 LLM 直接在 `args.text` 中传入文本，这样即使应用不走"先填写再点击"的流程也能正常工作。

**对手册的启示。** 在 React 中接入 NAC3 聊天驱动的动词时，**绝对不要**让处理器直接捕获 state。应使用 ref 或函数式 setter 模式。请在 React 采用指南（`guides/REACT.md`）和测试手册中添加"常见陷阱"章节。

---

## Bug #3（待定）

等待第三轮诊断。

---

## 循环日志

| 轮次 | 时间 | React 错误 | Angular 错误 | 已提交 Bug |
|------|------|------------|--------------|------------|
| 1 | 2026-05-11 02:10 | 表面扫描 0 个 | 表面扫描 0 个 | #1（manifest 覆盖问题，通过控制台日志解析发现） |

诊断规格的结构性检查（NAC 已挂载、validate_global 通过、manifest 在注册表中、待办事项 CRUD 正常、聊天切换正常）全部**绿色通过**。Bug 出现在更深层的语义层面，例如"LLM 实际上是否看到了我们注册的内容？"。后续诊断轮次将新增以下检查：LLM 响应后的操作结构、验证派发是否触发、验证 dt_state 变更是否通过框架 state 正确传播、验证自动驾驶完成所有步骤、验证从聊天切换语言环境。

---

*This is a machine translation of the canonical English
version at `/nac-spec/docs/CASE_STUDIES_DISCOVERY.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
