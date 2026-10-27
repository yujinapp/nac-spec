---
translation_source_hash: 13f2725d22ba29c84ddfdf58bac800d547f968b0f393d5cd9285cf1e2d4d0a0a
translation_quality: machine_v1
translation_date: 2026-10-27
translation_engine: anthropic/claude-opus-5 (Yujin Forge)
translation_normative: false
translation_status: complete
translation_lang: zh
translation_source: SPEC.md
translation_source_version: 2.5.1
translation_source_date: 2026-10-27
translation_sections: 83
translation_sections_canonical: 83
translation_units: 282
translation_units_canonical: 282
translation_canonical_url: /nac-spec/SPEC.html
---

<!-- translation-banner: produced by scripts/build-translation-banners.mjs -->

> **机器翻译，非规范性文本。** 本文翻译的是 2026-10-27 的英文版 (NAC3 v2.5.1)，覆盖当前原文的 83 / 83 节。规范性文本为英文版；本译文与英文版不一致时，以英文版为准。
>
> *Non-normative machine translation. The normative text of NAC3 is the English one.*
>
> [阅读规范性的英文版本](/nac-spec/SPEC.html)

<!-- /translation-banner -->

# NAC3 -- Native Agent Contract

**版本:** 2.5.1 (稳定版 -- 完整的 v2.5 表面: narrate、context+tree、expect+diff)
**状态:** 稳定发布。npm 的 dist-tag `latest` 指向这里; 9.1 节说明它保证什么、预发布版不保证什么。本文档只在一个地方写明自己的版本, 就是上面那一行。已发布的 RFC 及其第 2 层 + 第 3 层证据列在 `README.md` 和 `runtime/CHANGELOG.md` 中。
**许可:** Apache-2.0
**编者:** Yujin (yujin.app)

---

## 0. 目的

NAC3 是网页界面与驱动它们的代理之间的契约。代理包括语音执行器、LLM
中介、RPA 机器人、无障碍工具, 以及端到端测试执行器。该契约规定:

1. **元素如何命名** -- 使代理可以说"点击保存按钮", 并把它解析到唯一的
   DOM 节点。
2. **动词如何适用** -- 使代理可以调用 `NAC.click(id)`、
   `NAC.fill(id, value)`、`NAC.tab(plugin, key)` 等, 而不需要逐个应用
   的粘合代码。
3. **完成如何示意** -- 使代理知道一个步骤何时结束, 并且每个角色都有
   确定的事件族。
4. **来源如何保留** -- 使下游系统能够区分用户真实的点击与合成的点击。

NAC3 只在你已经使用的渲染框架之上加一层薄薄的东西。它不替代 ARIA、
React、Vue, 也不替代你的设计系统。

---

## 1. 角色

每个与代理有关的 DOM 元素都带有 `data-nac-role`。规范的角色如下:

| 角色 | 含义 | 示例 |
|------|---------|---------|
| `plugin` | 自成一体的界面模块 (一个页面、一个面板、一组控件)。 | `<article data-nac-plugin="invoice">` |
| `section` | 插件内部的地标 (页头、主体、页脚、侧栏)。 | `<section data-nac-role="section">` |
| `region` | 区块内部可命名的区域 (一组卡片、一个结果列表)。 | `<div data-nac-role="region">` |
| `action` | 触发动词的可点击控件 (按钮、当作按钮用的链接)。 | `<button data-nac-role="action" data-nac-action="save">` |
| `field` | 用户输入或切换的输入项 (文本、数字、复选框、单选、日期、文件)。 | `<input data-nac-role="field">` |
| `option` | 字段内部可选的选项 (组合框 / select / 单选组的子元素)。 | `<li data-nac-role="option">` |
| `tab` | 可切换的面板选择器。**当 `data-nac-id` 匹配 `^tab\.` 时必须使用** | `<button data-nac-role="tab" data-nac-id="tab.lines">` |
| `breadcrumb-item` | 面包屑的一级。 | `<a data-nac-role="breadcrumb-item">` |
| `accordion-toggle` | 展开 / 折叠的控制件。 | `<button data-nac-role="accordion-toggle">` |
| `step` | 向导的步骤指示。 | `<li data-nac-role="step">` |
| `pagination-item` | 分页列表中的翻页控制件。 | `<button data-nac-role="pagination-item">` |
| `confirm-button` | 确认对话框中的确认 / 取消按钮。 | `<button data-nac-role="confirm-button">` |
| `sort-control` | 可排序的列标题。 | `<th data-nac-role="sort-control">` |
| `filter-control` | 列筛选的触发件。 | `<button data-nac-role="filter-control">` |
| `data-table` | 数据表的宿主 (自 2.1 起)。 | `<table data-nac-role="data-table">` |
| `navigation` | 作为地标的导航区域。**不是选项卡。** | `<nav data-nac-role="navigation">` |
| `confirm-dialog` | 确认请求的模态框。 | `<div data-nac-role="confirm-dialog">` |
| `draggable` | 用户可以拿起并移动的元素 (自 1.6.2 起)。 | `<li data-nac-role="draggable">` |
| `drop-target` | 可以放下 `draggable` 的位置 (自 1.6.2 起)。 | `<ul data-nac-role="drop-target">` |
| `button` | **容忍, 但不推荐。** 只需要可点击、没有动作契约的旧式按钮。运行时把它当作 `action`。请优先使用带明确 `data-nac-action` 的 `action`。 | `<button data-nac-role="button">` |

不在此列表中的角色保留给将来使用。NAC-strict 的运行时应该在注册时拒绝
未知的角色 (v2.2)。NAC-permissive 的运行时可以为了向后兼容, 把未知的
角色当作 `action` (v1.9 和 v2.0 的默认行为)。

这张表就是规范性的清单, 并且它也作为数据发布: `api/latest/contract.json`
里的机器可读目录载有参考运行时接受的每一个角色, 每个都标注了
`declared_in_spec_table`, 于是两份清单可以不读散文就相互比对。到 v2.5
为止它们一致。将来的任何分歧都会显示在那个标记里, 而不是藏在文档与
实现的意见分歧中。

---

## 2. 名称

每个代理可解析的元素都带有 `data-nac-id`。这个 id 是:

- **一条点号路径** (例如 `deals.list.row.42.actions.delete`)。点号分隔
  语义层级; 运行时不解释它们, 但人和 LLM 会。
- **在一个 `data-nac-plugin` 的范围内全局唯一。** 两个不同的插件可以
  共用一个 id; 运行时按 `(plugin, id)` 这一对来解析。
- **跨重新渲染保持稳定。** 每次渲染都生成新 id 的框架 (随机哈希、
  实例计数器) 会破坏这个契约。
- **跨界面改版保持稳定。** 一个按钮从工具栏搬到下拉菜单; 它的 id
  必须保持不变。

保留的 id 前缀 (自 2.1 起):

| 前缀 | 保留用于 |
|--------|--------------|
| `tab.` | 选项卡按钮。角色必须是 `tab`。 |
| `modal.` | 模态框范围内的元素。角色是末端控件的角色。 |
| `field.` | 表单字段的简写。角色必须是 `field` 或 `option`。 |
| `confirm.` | 确认对话框。 |

---

## 3. 动词

带 `data-nac-role="action"` 的元素可以带上
`data-nac-action="<verb>"` 来说明它做什么。动词是宿主与代理之间约定的
自由形式 snake-case 标识符。常见动词:

`save`、`cancel`、`submit`、`delete`、`edit`、`view`、`create`、
`approve`、`reject`、`send`、`download`、`upload`、`refresh`、
`expand`、`collapse`、`open`、`close`、`add_row`、`remove_row`。

`NAC.click_by_verb(plugin, verb)` 把一个动词解析到该插件下唯一的
action 并点击它。同一个插件下多个 action 共用同一个动词是清单错误
(lint: `duplicate_verb`)。

---

## 4. 清单

每个插件都可以通过下面的方式注册一份清单:

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

清单是面向代理的真相来源。一个判定"用户说了 'guardar'"的 LLM 中介会
去查插件的清单, 找到动词 `save`, 然后发出
`NAC.click_by_verb('invoice', 'save')`。

### 4.1 必填字段

- `plugin_slug` -- 与宿主元素上的 `data-nac-plugin` 一致。
- `nac_version` -- 这份清单声称遵循的 NAC3 版本。运行时会拒绝声称版本
  高于自身的清单。

### 4.2 可选字段

- `elements[]` -- 具名控件的目录。每一项都必须有 `id` 和 `role`。
- `tabs[]` -- 给选项卡用的另一个顶层数组。等价于 `elements[]` 中
  `role:'tab'` 的项。两种写法都有效。
- `fields[]`、`actions[]`、`kpis[]`、`data_tables[]` -- 带类型的子集合;
  语义与按角色过滤后的 `elements[]` 相同。演示会选择对人最易读的写法。

### 4.3 i18n

每个 `label_i18n` 都必须覆盖 NAC3 的全部 10 个区域设置:

```
es, en, pt, fr, ja, zh, hi, ar, de, it
```

在 `NAC.autoRegister.watch()` 上使用 `i18n_strict: 'permissive'` 允许在
棕地迁移期间只做部分覆盖; 生产用的清单应当提供全部 10 个区域设置。

#### 4.3.1 十个区域设置这项要求落在谁身上

上面那项要求落在**采用方的清单**上, 也就是代理读取、用来以用户语言
称呼元素的那张 `label_i18n` 映射表。它**不是**对本文档语言的要求, 并且
NAC3 中没有任何内容强制一个实现用十种语言发布自己的文档。

#### 4.3.2 本规范的规范性语言

NAC3 的规范性文本是**英文**的那一份: 规范仓库根目录下的 `SPEC.md`,
渲染在 `https://yujin.app/nac-spec/SPEC.html`。

本规范也以机器翻译的形式发布在 `i18n/<locale>/SPEC.md` 下。那些译文
**不具规范性**。每一份都是部分的, 每一份都冻结在它自己的提示横幅所
声明的源修订上; 横幅是必须的, 而一份没有横幅的已发布译文是发布的缺陷,
不是翻译的缺陷。当译文与英文文本不一致时, 以英文文本为准, 而一项合规
声明是针对英文文本的声明。

---

## 5. 公开 API

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

### 5.1.1 合规辅助函数 (v2.2)

`NAC.bindAction(el, handler, ctx)` 是符合本规范的点击处理函数接线方式。
处理函数运行之后 (同步、抛出异常或 Promise), 它会自动发出
`nac:action:succeeded` (或 `:failed`)。它返回一个解绑函数。只要宿主
支持, 就用它来代替裸的 `addEventListener('click', ...)`; 棕地代码仍然
可以像以前那样手动发事件。

### 5.1.3 字段编辑器 (v2.3)

`NAC.edit_field(nac_id)` 打开一个模态框, 让人 (或代替他的代理) 用类似
文字处理软件的工具编辑任意文本字段:

```ts
NAC.edit_field(nac_id: string): Promise<{ok:true}>
```

这个模态框以 `plugin_slug='nac_editor'` 注册, 带有下面这些可由 NAC3
调用的动词:

| 动词 | 效果 |
|------|--------|
| `select_word` | 选中光标处的词 |
| `select_sentence` | 选中光标处的句子 |
| `select_all` | 在编辑器内按 ctrl-A |
| `replace` | 用给定文本替换选区 |
| `delete_selection` | 移除当前选区 |
| `ai_correct_syntax` | 把当前值 POST 给 LLM 中介, 系统提示为 "fix grammar + spelling, return only fixed text"; 用回应替换该值 |
| `save` | 写回源字段, 派发 input 与 change 事件, 关闭 |
| `cancel` | 丢弃, 关闭 |

Esc 关闭 (取消)。Ctrl/Cmd+Enter 保存。点击遮罩背景取消。

本规范第 13 节将在 v2.3 把这个契约正式化; v2.2 的运行时已提供一个可用的
参考实现, 让采用方今天就能接上。在任何字段上都可通过下面的方式使用:

```js
NAC.edit_field('invoice.client_name');
// or by intermediary:
NAC.click_by_verb('myplugin', 'edit_field', { nac_id: 'invoice.client_name' });
```

### 5.1.4 动作载荷 + invoke (v2.3)

NAC v2.2 的动作是点一下就走: 代理触发 `NAC.click(id)` 或
`NAC.click_by_verb(plugin, verb)`, 宿主做它该做的事。这对"动词加状态"
型的动作 (`save`、`cancel`、`submit`、`delete`) 成立, 但当一个动作需要
代理提供**数据**时就崩了 -- `utter(text)`、`search(query)`、
`send_message(body)`、`upload(file)`、`schedule(date)`、
`translate(text, target_lang)`。宿主没有办法通过一次合成点击接收代理的
载荷。

v2.3 补上了这个缺口。契约是叠加式的: 点击式的动词照旧工作, 不受影响。

```ts
NAC.invoke(action_id: string, payload: object, opts?: { timeout?: number })
  : Promise<{ok: true, request_id: string, ack: object|null}>

NAC.utter(action_id: string,
          opts: { text: string, lang?: string, voice?: string, metadata?: object })
  : Promise<{ok: true, request_id: string, ack: object|null}>
```

`NAC.invoke` 在宿主元素上派发一个 `nac:action:requested` 的
`CustomEvent` (冒泡到 document), 内容是:

```ts
detail: {
  action_id:  string,    // canonical nac_id of the host element
  verb:       string,    // payload.verb || el's data-nac-action
  payload:    object,    // arbitrary, action-specific
  plugin:     string|null,
  request_id: string,    // correlation token assigned by the runtime
  ts:         number,    // Date.now()
}
```

宿主监听 `nac:action:requested`, 处理载荷, 然后在 detail 中带上同一个
`request_id` 发出 `nac:action:succeeded` (或 `nac:action:failed`)。
运行时按 `request_id` 关联, 并解决代理的 Promise。

默认超时是 **30 秒** (点击是 5 s)。可以用 `opts.timeout` 覆盖。超时时
Promise 会以 `NacError('timeout', ...)` 被拒绝。和点击一样, 超时意味着
真正的失败: 除非调用方通过别的通道拿到了副作用的证据, 否则必须按失败
对待。

`NAC.utter(id, opts)` 是最常用的带载荷动词的便捷快捷方式。它等价于:

```js
NAC.invoke(id, { verb: 'utter', text: opts.text, lang: opts.lang });
```

#### 在清单中的声明

一个带载荷的动作, 会在它的清单条目里声明该载荷的模式, 以便追溯和
配套工具使用:

```js
NAC.register({
  plugin_slug: 'atlas_pro_ad',
  version:     '2.1.0',
  nac_version: '2.3',
  elements: [
    { id: 'atlas_pro_ad.mic', role: 'action',
      actions: [
        { verb: 'listen' },
        { verb: 'utter',
          payload_schema: {
            text: { type: 'string', required: true, max: 4000 },
            lang: { type: 'string',
                    enum: ['en','es','pt','fr','it','de','ja','zh','hi','ar'] }
          },
          label_i18n: { es:'Decir', en:'Utter', /* ... 10 locales */ } }
      ],
      label_i18n: { /* ... */ } }
  ]
});
```

`payload_schema` 在 **v2.5 时仍只是信息性的**, 参考运行时根本不读它:
这个字段在清单里会被接受, 会随 `NAC.manifest()` 一起带走, 但从不与
任何东西对照校验。`NAC.STRICT_VALIDATION` -- 它的默认值确实在 2.3.0
改成了 `true` -- 只覆盖清单与 DOM 角色方面的发现项; 它从来没有覆盖过
载荷。所以代理不得因为声明了模式就假定载荷已被检查: 今天唯一发生的
校验, 是代理在发送之前自己做的那一次。

这些模式是刻意保持简单的 (形状像 JSON-Schema 的一个子集), 好让运行时
不必携带完整的 JSON-Schema 校验器就能校验, 而这仍然是将来真正强制时的
设计意图。

本节较早的一版曾承诺, 在 2.4 这个版本里把模式的文法正式化, 并把强制
作为默认。**那在 2.4 没有发生, 直到 2.5 也没有发生。**那句话被删掉而
不是改个日期: 一个贴着版本号的承诺, 过了那个版本还立在那里, 在代理
看来就像是一项可以指望的能力。把文法正式化并接上强制, 作为未决的问题
记在第 13 节, 在那里它被标为未决且没有日期。

#### 禁用状态的语义 (来自 alpha.2 的 v2.3 热修复)

当目标元素设置了 `disabled` 或 `aria-disabled='true'` 时,
`NAC.invoke` 并不拒绝。HTML 的 `disabled` 属性是界面层面的点击护栏;
`invoke` 是一次带载荷的逻辑请求, 不是合成点击。需要根据界面状态拒绝
一次 invoke 的宿主, 必须在自己的 `nac:action:requested` 监听器里做,
并发出带有有意义错误码的 `nac:action:failed`。

相对地, `NAC.click` 在被禁用的元素上仍然拒绝 (点击的语义被保留)。
测试覆盖: `runtime/test/v23-invoke.mjs` T7/T8/T9。

#### 合规: 支持 invoke 的宿主必须

1. 在清单条目中声明 `actions[].payload_schema`。
2. 监听 `nac:action:requested` (或使用按 `detail.action_id` +
   `detail.verb` 过滤的通用监听器)。
3. 处理完成后发出 `nac:action:succeeded` -- 并把 `detail.request_id`
   原样回带 -- 或在失败时发出 `nac:action:failed` (错误码放在
   `detail.error`)。
4. 绝不发出带着自己没有收到过的 `request_id` 的 `:succeeded` 事件
   (这可防止并发调用之间串台)。

不支持 invoke 的宿主, 在 `NAC.click()` 和 `NAC.click_by_verb()` 之下
照常运作。对没有 `actions[].payload_schema` 条目的宿主调用
`NAC.invoke()` 的代理, 仍然会收到一个 `request_id`, 但运行时无法保证
送达; 超时会在 30 s 后触发。

#### 这为什么重要

整个面向代理的表面不再是"一串按钮", 而成了"一串按钮 + 结构化输入"。
一条语音广告变得可以用 NAC.invoke 调用。一个搜索框变得可以用
NAC.invoke 调用。一次文件上传变得可以用 NAC.invoke 调用。同样的协议,
同样的来源, 同样的确认语义。

第一个参考采用方是 **Atlas Pro**: 它的元素 `atlas_pro_ad.mic` 同时
声明了动词 `listen` (仅点击, 原有的) 和 `utter` (带载荷)。两种情况下都
由同一个 `/parse` + `/tts` 的对话回路驱动; 有语音识别的代理调用
`listen`, 有自己语言模型的代理调用 `utter`。

#### 将来的模态 (已预计, 无需改规范)

`invoke` 刻意与模态无关, 好让将来的输入族可以接进来而不破坏契约:

| 模态 | 动词 (草拟)           | 载荷 (草拟)                                      |
|----------|-----------------------|--------------------------------------------------|
| 文本     | `utter`               | `{text, lang?}`                                  |
| 搜索     | `search`              | `{query, scope?, limit?}`                        |
| 文件     | `upload`              | `{filename, mime, data_url \| stream_id}`        |
| 图像     | `analyze_image`       | `{image_url \| data_url, prompt?}`               |
| 视频     | `analyze_stream`      | `{stream_url, frame_window_ms?, return?}`        |
| 日程     | `schedule`            | `{datetime, duration_min, attendees?}`           |
| 代码     | `apply_diff`          | `{file_path, unified_diff}`                      |
| 语音     | `transcribe`          | `{audio_url \| data_url, lang?}`                 |

每种模态都遵循同一套 `nac:action:requested` ->
`nac:action:succeeded` / `:failed` 的事件协议, 同样的 `request_id`
关联, 同样的超时语义。运行时保持小巧; 动词的词汇表按宿主与代理之间的
约定生长。便捷快捷方式 (`NAC.utter`、`NAC.search`、`NAC.watch` 等)
以后可以添加而不必重新制定规范, 因为每一个都只是 `invoke` 之上的一层
薄包装。

### 5.1.5 shadow DOM 的解析 -- 开放的根 (v2.3)

运行时会递归地穿过开放的 shadow 根来解析 `data-nac-id` 引用。页面可以
用 `attachShadow({mode:'open'})` 挂载 Web Components, 在 shadow 树内部
的元素上放 `data-nac-*` 属性, 而任何 NAC3 的调用方 (`NAC.click`、
`NAC.fill`、`NAC.invoke` 等) 都能透明地解析到目标。

#### 解析算法

对于选择器 `S` (通常是 `[data-nac-id="..."]`) 与根 `R` (通常是
`document`):

1. `R.querySelector(S)` -> 若非 null, 立即返回。
2. 对 `R` 的每个后代 `el`:
   - 若 `el.shadowRoot` 非 null (即开放的 shadow 根): 以
     `R := el.shadowRoot` 递归, 深度 +1。
   - 否则, 若 `el.nac3` 是一个暴露 `query` 方法的对象, 则委派
     (见 5.1.6 节)。
3. 递归**在 10 层深度处封顶**。比 10 更深的目标无法到达; 调用方会收到
   `code='not_found'`。这个上限的存在是为了防止病态的遍历; 实践中没有
   任何生产代码库把 shadow 嵌套超过 3-4 层。
4. 遍历按 DOM 顺序逐层展开: 先兄弟, 后嵌套的 shadow。第一个匹配者
   胜出。

#### 事件传播

shadow 根内部的宿主发出的事件必须设置 `composed: true`, 文档层面的
监听器才能收到。NAC3 的运行时已经用 `composed:true` 发出自己全部的
事件; 手动发出 `nac:*` 事件的宿主代码也要负同样的责任。没有
`composed:true` 的话, 事件会停在 shadow 的边界上, 运行时的关联机制
永远看不到它。

#### 组件作者的责任

写组件的人需要:

1. 在 shadow 根内部可操作的元素上放 `data-nac-id`、`data-nac-role`、
   `data-nac-action`。
2. 在宿主为示意 NAC3 契约而发出的任何自定义事件上设置
   `composed:true` (`nac:action:succeeded`、`nac:field:changed` 等)。
3. 对需要被 shadow 隔离的元素避免使用 `<slot>` -- 放进插槽的节点活在
   light DOM 里, 并在那里被解析。

开放的 shadow 根不需要清单里的任何提示, 也不需要在运行时开启什么;
解析是自动的。

#### 参考实现

参考运行时暴露了两个内部辅助函数,
`_deepQuery(selector, root)` 和 `_deepQueryAll(selector, root)`, 由它们
执行遍历。公开的辅助函数 `NAC.click`、`NAC.fill`、`NAC.invoke`、
`NAC.describe` 等, 全都走深度变体。

#### 演示与测试

- `example-v23-shadow-open.php` -- 嵌套 1、2、3 层的开放 shadow 演示。
- `runtime/test/v23-shadow.mjs` T1-T3、T10 -- 单元覆盖, 包括深度上限。

### 5.1.6 shadow DOM 的解析 -- 封闭的根, 自愿暴露 (v2.3)

封闭的 shadow 根 (`attachShadow({mode:'closed'})`) 从组件作者的代码之外
看是不透明的 -- 这是浏览器的安全边界, 不是 NAC3 的决定。除非组件作者
通过下面的契约自愿暴露一个可查询的表面, 否则 NAC3 伸不进去。

#### `el.nac3` 接口契约

自定义元素可以通过一个名为 `nac3` 的 getter, 在自己的宿主上暴露一个
接口对象:

```ts
interface NAC3HostInterface {
  query(selector: string): Element | null;        // MANDATORY
  queryAll(selector: string): Element[];          // RECOMMENDED
  describe?(): Array<{                            // OPTIONAL
    id:    string;
    role:  string;
    action?: string;
    label?: string;
  }>;
}
```

组件通过实现这个 getter 来加入。不加入的组件对 NAC3 的调用方仍然不可
触及 (它们的内部保持私有, 正如浏览器所希望的)。

#### 解析的语义

在 `_deepQuery(selector)` 期间, 对每个访问到的、满足
`el.shadowRoot === null` 的元素 `el`:

1. 若 `typeof el.nac3 === 'object'` 且 `el.nac3.query` 是函数, 运行时
   调用 `el.nac3.query(selector)`:
   - 返回值是一个 Element -> 解析成功。
   - 返回值是 `null` -> 这个 shadow 里没有匹配。
   - 返回值是别的任何东西 -> 发出
     `nac:shadow_protocol_violation` (每个宿主一次) 并跳过。
   - 抛出异常 -> 发出 `nac:shadow_blocked` (原因
     `'exposure_threw'`, 每个宿主一次) 并跳过。
2. 否则, 若 `el.hasAttribute('data-nac-shadow') === true` 且属性值为
   `'closed'`, 并且不存在 `nac3` 接口, 运行时发出
   `nac:shadow_blocked` (原因 `'not_exposed'`, 每个宿主一次)。这是
   作者对"我是一个刻意封闭的组件"这一调试信号的主动加入。
3. 否则: 该元素被当作没有 shadow 根的普通 light DOM 元素对待。

#### 错误事件 detail 的形状

`nac:shadow_blocked` 的 detail:

```ts
{
  host:   Element,     // the closed-shadow host
  reason: 'exposure_threw' | 'not_exposed',
  ts:     number       // Date.now()
}
```

`nac:shadow_protocol_violation` 的 detail:

```ts
{
  host:           Element,
  message:        string,            // diagnostic message
  value_snapshot: string,            // truncated value preview
  ts:             number
}
```

两个事件都会冒泡 (`bubbles: true`) 并跨越 shadow 的边界
(`composed: true`)。去重是按宿主来的, 依靠运行时维护的一个 WeakSet;
同一个宿主发出每个事件**每次页面加载最多一次**。

#### 为什么是自愿的

封闭 shadow 的不透明性是浏览器强制的。即使 NAC3 定义了一种非自愿的
机制, 浏览器也会阻止它。自愿暴露把"自己的公开表面在代理眼里长什么样"
的全部控制权, 留在组件作者手里。

代价是逐个组件主动加入; 好处是符合 NAC3 的代理能够面对带封闭 shadow
组件的设计系统 (Salesforce Lightning、GitHub Primer 的部分组件、
对安全敏感的控件) 正常工作, 而不需要逐个组件写适配代码。

#### 演示与测试

- `example-v23-shadow-closed.php` -- 正面例子
  (`<todo-card-closed-exposed>`) 与负面例子
  (`<todo-card-closed-blind>`) 并排摆放, 配有判定面板 + 实时事件日志。
- `runtime/test/v23-shadow.mjs` T4-T9 -- 覆盖每一类错误事件以及去重
  语义的单元测试。
- `guides/SHADOW_DOM_CLOSED.md` -- 给编写者的指南。

### 5.1.7 感知授权的能力 (v2.3)

NAC3 v2.3 允许清单按动作声明所需的能力, 并据此在派发之前拦住
`NAC.click` 和 `NAC.invoke`。代理会收到一次快速拒绝
(`code='capability_required'`), 而不是一次在服务端失败的往返。

#### 在清单中的声明

能力要求可以挂在元素层面或动词层面。两者都存在时, 动词层面胜出。

```js
NAC.register({
  plugin_slug: 'fin',
  version:     '1.0.0',
  nac_version: '2.3',
  elements: [
    // Element-level (covers all verbs on this id).
    { id: 'fin.invoice.delete', role: 'action',
      requires_capability: 'finance.delete_invoice',
      actions: [{ verb: 'delete' }] },

    // Verb-level (more granular).
    { id: 'fin.invoice.edit', role: 'action',
      actions: [
        { verb: 'edit',
          requires_capability: 'finance.edit_invoice' },
        { verb: 'view',
          /* no capability -> always allowed */ }
      ] },

    // Array value: OR semantics.
    // ("at least one of these capabilities matches")
    { id: 'fin.invoice.approve', role: 'action',
      requires_capability: ['finance.approve',
                            'finance.admin'],
      actions: [{ verb: 'approve' }] }
  ]
});
```

若要"与"的语义 ("用户需要具备所有这些能力"), 请通过分开的受拦动作分别
声明, 或者在宿主一侧的 `nac:action:requested` 监听器里组合。

#### 公开 API

```ts
NAC.setCapabilities(caps: string | string[] | null): void
NAC.grantCapability(cap: string): void
NAC.revokeCapability(cap: string): void
NAC.userCapabilities(): string[]
```

`setCapabilities` 整体替换这个集合 (用于登录或会话刷新)。
`grantCapability` / `revokeCapability` 是增量的。`userCapabilities`
返回一个快照数组。`setCapabilities(null)` 清空该集合。

每当用户的角色发生变化, 宿主就调用它们。这个集合活在运行时里;
不需要重新加载清单。

#### 门禁的语义

在派发之前, `NAC.click(id)` 和 `NAC.invoke(id, payload)` 会查出对应的
清单条目 (元素 + 动词), 读取 `requires_capability`, 并调用
`_hasCapability`:

- 没有声明任何要求 -> 允许。
- 声明了要求, 且当前集合满足它 -> 允许。
- 声明了要求, 而当前集合不满足 -> 以
  `NacError('capability_required', ...)` 拒绝, 并发出带
  `detail.reason='capability_required'` 的 `nac:command:rejected`。

在 `click` 上, 门禁在 `not_found` / `disabled` / `hidden` 的检查之后
运行, 以便让最具体的失败浮上来。在 `invoke` 上, 门禁在请求事件发出
之前运行 (宿主永远看不到一次未授权的尝试)。

#### 这为什么重要

没有门禁时, 一个调用 `NAC.click('finance.delete')` 的代理, 要么成功
(完全没有授权门禁 -> 安全漏洞), 要么在几秒之后由服务端以 403 失败。
有了门禁, 代理会同步地得知自己缺少该能力, 并能作出恰当反应 (请求另一
条流程、申请提权、把这个限制呈现给用户)。

这是对服务端授权的补充 -- 不是替代。宿主仍然必须在服务端执行权限。
客户端的门禁是一次体验上的优化, 以及一个意图层面的信号, 不是安全
边界。

#### 演示与测试

- `runtime/test/v23-capabilities.mjs` -- 17 条断言, 覆盖集合的设置与
  读取、授予与撤销、点击的门禁、invoke 的门禁、动词层面与元素层面的
  解析、"或"的语义、用 null 清空、对无效输入的拒绝, 以及无门禁动作的
  回归。

### 5.1.2 严格校验开关 (v2.2; 默认值在 v2.3 翻转)

`NAC.STRICT_VALIDATION` (布尔)。为 `true` 时, 遇到下列任一情况,
`NAC.register()` 会抛出一个带 `code='strict_validation'` 和 `findings`
数组的 `Error`:

- `manifest_role_unknown` -- 条目的角色在规范集合之外。
- `tab_id_manifest_role_drift` -- id 匹配 `^tab\.` 但角色不是 `'tab'`。
- `manifest_dom_role_mismatch` -- 挂载在 DOM 上的元素的
  `data-nac-role` 与清单条目的角色不同。

**默认值:**

- **v2.2.x:** `false` (仅警告)。采用方需要一个迁移窗口。
- **v2.3.x:** **`true`** (抛出)。迁移窗口随 v2.2 这条线关闭。清单里
  带着大量偏差的采用方, 可在任何 `register()` 调用之前设置
  `NAC.STRICT_VALIDATION = false` 退出。
- **v3.0:** 这个开关被移除 (严格是唯一的模式)。

清理偏差发现项的操作手册见
`guides/MIGRATION_v2.2_to_v2.3.md`。

所有异步方法都会以一个 `NacError` 拒绝, 其 `code` 是下列之一:

- `not_found` -- 指名的元素、角色或动词不在 DOM 中。
- `invalid` -- 参数的形状不对。
- `disabled` -- 元素带有 `disabled` 或 `aria-disabled='true'` (仅
  `NAC.click`; 自 v2.3 的热修复起, `NAC.invoke` 不再检查, 见 5.1.4
  节)。
- `hidden` -- 元素在屏幕之外、带 `aria-hidden='true'`, 或尺寸为零。
- `capability_required` -- 清单声明了 `requires_capability`, 而当前的
  `NAC.userCapabilities()` 集合不满足它 (v2.3, 见 5.1.7 节)。
- `timeout` -- 副作用已派发, 但合规确认事件在 5 秒内没有到达
  (`invoke` 是 30 秒)。**超时意味着真正的失败**: 处理函数可能挂住了,
  确认可能从未接线, 也可能发生了一次网络竞态。除非调用方通过别的通道
  拿到了副作用的证据, 否则必须把超时当作失败。

### 5.2 自省

```ts
NAC.describe():    { active: string|null, plugins: PluginSnap[] }
NAC.describe_v2(): { v2_scope_entries: [...], sitemap: ..., data_tables: [...] }
NAC.manifest(plugin_slug: string): Manifest|null
NAC.validate_global(opts?: {probe?: boolean}): GlobalReport   // named buckets, see 10.1
```

### 5.3 数据表 (自 2.1 起)

数据表的原语**不是**核心运行时 (`js/nac.js` / `@nac3/runtime` 的
`nac.mjs`) 的一部分。它们随棕地扩展模块
`js/nac-v2-extensions.js` (发布为 `@nac3/runtime/extensions`) 一起提供,
该模块加载后会把它们挂到同一个 `window.NAC` 对象上。要得到 `dt_*`
这一表面, 请在核心运行时之后加载扩展模块:

```html
<script src="https://yujin.app/nac-spec/js/nac.js"></script>
<script src="https://yujin.app/nac-spec/js/nac-v2-extensions.js"></script>
```

```js
// or with the npm package:
import '@nac3/runtime';
import '@nac3/runtime/extensions';
```

下面这些方法只在扩展模块已加载时存在; 在只有核心的运行时上调用它们
不会有任何效果 / 返回 `undefined`。

```ts
NAC.registerDataTable(spec: DataTableSpec): string   // returns table_id
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

一张数据表有一个 `subkind`:

- `collection` -- 有序的行, 可选带事务性提交。用于发票行、购物车条目、
  日志记录。
- `matrix` -- 行 x 列的网格, 每个格子都带一个值。用于权限矩阵、排班
  网格。
- `matrix-singletree` -- 每一行折叠成一棵树的矩阵 (少见)。

---

### 5.4 严格解析 + 消歧 (v2.4)

NAC3 v2.4 把 id、动词、限定词、标签的解析变得**严格**。那些把一次请求
解析到单个 DOM 元素的动词 -- `click_by_verb`、`tab` (单参数形式) 和
`tab_by_label` -- 不再猜了。当一次请求解析到零个候选或多于一个候选时,
运行时会抛出一个带着候选清单的 `NacError`, 并发出一个
`nac:disambiguation_requested` 事件, 而不是默默派发给第一个大致相似
的那个。

这就是**零静默损害**这条不变式。它为辅助软件和代理调用方而存在: 在
那里, 默默派发到错误的元素又没有恢复的路径, 是一个安全层面的阻塞项。
2.4 之前那种宽松的行为 -- 一个按子串 `indexOf` 的兜底, 会解析到第一个
大致相似的那个 -- 已被移除。

> 向后兼容: v2.4 是一次*契约行为*的变更。本来就传入无歧义参数的代码
> 路径照旧工作。依赖宽松的 `indexOf` 兜底来解析到第一个大致相似者的
> 代码路径, 现在会抛出异常 -- 这是设计使然。

#### 5.4.1 限定词的严格匹配 (`click_by_verb`)

`click_by_verb(plugin, verb, opts?)` 在共享
`data-nac-action="<verb>"` 的 DOM 节点之间挑选。当提供了
`opts.qualifier` (一个字符串) 时, 一个元素**只有**在它的
`data-nac-id` 满足下面条件时才算匹配:

```js
id === qualifier || id.endsWith('__' + qualifier)
```

也就是: id 完全相等, 或者是分隔符 `__` 之后锚定的后缀。**没有按子串的
兜底。**一个只是某个 id 的子串的限定词 (既不相等, 也不是锚定的
`__suffix`) 不算匹配。

- 0 个匹配 -> 抛出 `NacError('no_matching_instance', ...)`。
- 恰好 1 个匹配 -> 解析并点击。
- 多于 1 个匹配 -> 抛出 `NacError('ambiguous_qualifier', ...)`。

`opts.qualifier_ordinal` (一个数) 跳过限定词匹配, 在共享该动词的所有
DOM 元素之间按位置挑选。

#### 5.4.2 id 的严格解析 (`tab`)

`tab(plugin, id)` 的单参数形式: DOM 中 `data-nac-id` 的完全匹配胜出。
否则运行时会去找 id 以 `id + "__"` 开头的实例:

- 0 个受限定的实例且没有完全匹配的 id -> `no_matching_instance`。
- 恰好 1 个 -> 解析成功。
- 多于 1 个 -> `ambiguous_tab` (请传入完整的受限定 id)。

#### 5.4.3 标签的严格解析 (`tab_by_label`)

`tab_by_label(plugin, label)` 把一个人类可读的标签解析到一个选项卡,
依次尝试: 与清单标签的完全匹配、清单里的模糊 / 子串匹配、与 DOM 文本的
完全匹配、与 DOM 文本的模糊匹配。若任一层得到多于一个匹配, 它会抛出
`NacError('ambiguous_label', ...)`; 若没有任何一层匹配, 它会抛出
`NacError('not_found', ...)`。所发出事件的 `reason` 字段会记下是哪一层
出现了歧义 (`ambiguous_label_exact`、`ambiguous_label_fuzzy`、
`ambiguous_label_exact_dom`、`ambiguous_label_fuzzy_dom`, 或
`no_matching_label`)。

#### 5.4.4 错误码

| `err.code` | 由谁抛出 | 含义 |
|------------|-----------|---------|
| `no_matching_instance` | `click_by_verb` (限定词)、`tab` | 没有元素匹配该限定词 / id |
| `ambiguous_qualifier`  | `click_by_verb` | 多于 1 个元素匹配该限定词 |
| `ambiguous_tab`        | `tab`           | 多于 1 个受限定的 `id__` 实例匹配 |
| `ambiguous_label`      | `tab_by_label`  | 多于 1 个选项卡匹配该标签 (任一层) |
| `not_found`            | `tab_by_label`  | 没有任何选项卡匹配该标签 |

#### 5.4.5 `err.candidates` 的形状

每个消歧错误都带着一个 `candidates` 数组。每个候选恰好是:

```ts
{ nac_id: string, label: string }
```

`nac_id` 是该元素的 `data-nac-id`。`label` 的解析顺序是: 优先
`aria-label`, 然后是修剪过的 `textContent` (截到 120 个字符), 最后退回
到 `data-nac-id`。这份清单是对照 DOM 校验过的 -- 它列出的是调用方可以
从中挑选的真实元素。`NacError` 把 `candidates` 合并到抛出的 `Error`
上, 于是 `err.code`、`err.message` 和 `err.candidates` 三者都有值。

#### 5.4.6 `nac:disambiguation_requested` 事件

每当一次严格解析的调用失败 (没有匹配, 或者匹配太多), 运行时都会在
抛出异常*之外*, 向 `document` 派发一个
`nac:disambiguation_requested` 的 `CustomEvent`。这次发出是尽力而为的:
若派发失败, 运行时照样抛出。

```ts
document.addEventListener('nac:disambiguation_requested', (e) => {
  e.detail; /* {
    method:     'click_by_verb' | 'tab' | 'tab_by_label',
    plugin:     string | null,
    query:      { verb?, qualifier?, label?, id? },
    reason:     string,   // finer-grained than err.code (see 5.4.3)
    candidates: Array<{ nac_id: string, label: string }>,
  } */
});
```

#### 5.4.7 调用方如何消歧

拿到候选清单 (来自 `err.candidates` 或 `event.detail.candidates`) 之后,
调用方挑一个, 并用下面任一方式重新派发:

1. **完整的 `nac_id`** -- `NAC.click(candidate.nac_id)`。这是规范的
   恢复路径: 候选本身已经带着那个精确的 id。
2. **锚定的 `__suffix`** -- 把该实例精确的后缀作为限定词传给
   `click_by_verb`。
3. **`opts.qualifier_ordinal`** -- 在共享该动词的元素之间按位置选择
   (按 DOM 顺序)。

完整走通的参考是 `example-v24-disambiguation.php`; 这个契约由
`runtime/test/stage2-disambiguation.mjs` 和
`runtime/test/stage7-strict-resolution.mjs` 覆盖。

---

## 6. 事件

每个动作都会发出一个确定的完成事件。运行时的 `NAC.click()` 会等候这个
事件, 并在它发出时解决。

| 角色 | 成功事件 | 失败事件 |
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

### 6.1 事件 detail 的形状

每个事件的 detail 都带着规范的 id 字段, 再加上 `plugin`:

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

### 6.2 从宿主的处理函数里发出

点击处理函数必须在它的同步副作用之后, 发出对应的成功事件:

```js
button.addEventListener('click', function (ev) {
  // ... do the work ...
  document.dispatchEvent(new CustomEvent('nac:action:succeeded', {
    detail: { plugin: 'invoice', action_id: 'invoice.save' }
  }));
});
```

若这项工作是异步的, 请在解决之后发出。若这项工作失败, 请发出
`nac:action:failed`, 带上 `{detail: {plugin, action_id,
error: <message>}}`。

v2.2 的运行时将提供 `NAC.bindAction(el, handler, ctx)`, 它包住
`addEventListener` 并自动发出。

### 6.3 为什么不直接用点击事件本身?

DOM 的 `click` 事件在处理函数运行之前就发出了。NAC3 的契约需要知道的是
**副作用何时完成**, 而不是点击何时开始。因此才有这一族独立的事件。

---

## 7. 来源

### 7.1 isTrusted

对于由人发起的点击 (真实的鼠标、真实的按键、屏幕阅读器的激活),
`event.isTrusted` 是 `true`; 对于合成的点击 (`element.click()`、对手工
构造的 MouseEvent 调用 dispatchEvent、自动化), 它是 `false`。

NAC3 必须通过成功事件里的 `event.detail.is_trusted` 把它暴露出来。
执行对安全敏感动作的宿主 (付款、删除) 可以要求
`is_trusted === true` 并拒绝合成的点击。参考演示
`example-v20-full.php` 里有一对按钮
(`v20_panel.istrusted_real` 和 `v20_panel.istrusted_fake`) 演示了这个
区别。

### 7.2 用 HMAC 签名的清单

清单可以带一个 `provenance` 块:

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

运行时会在清单的稳定序列化结果上 (排除签名本身) 计算期望的 HMAC, 并
拒绝签名不符的清单。多租户部署用它来防止一个租户伪造另一个租户的
清单。

### 7.3 威胁模型

完整的威胁模型见 `SECURITY.md`。简短版本:

- NAC3 不认证**用户**。那是你的认证层的工作。
- NAC3 认证**清单** (HMAC)。
- NAC3 区分真实点击与合成点击 (isTrusted), 这样宿主可以对敏感动词
  拒绝后者。
- NAC3 不防护以用户权限运行的恶意代理。这样的代理能做用户能做的一切。

---

## 8. 合规级别

级别写作 **NAC3 Conformance Level 1**、**2** 或 **3**。级别的名称不是
协议的名称: 校验器、报告或合规声明必须用
`api/latest/levels.json` 中发布的标识符
`nac3-conformance-level-<1|2|3>` 来引用级别, 绝不用显示名称。8.1 节
记录了这些级别在 2.5.0 之前所用的名称。

一个页面达到 **NAC3 Conformance Level 1**, 条件是:

- 每个代理应当能够操作的可点击控件都带有 `data-nac-id` 和
  `data-nac-role`。
- 每个 `data-nac-role="action"` 的元素都在它的副作用之后发出
  `nac:action:succeeded`。
- 该页面通过 `NAC.register()` 至少注册一份插件清单。
- 对每个已公布的 id, `NAC.click(id)` 都能工作。

一个页面达到 **NAC3 Conformance Level 2**, 还要:

- 在它的清单里显式注册 `tabs[]`、`fields[]`、`actions[]` 数组
  (不是从 DOM 推断的)。
- 对每个面向用户的标签, 提供覆盖 NAC3 全部 10 个区域设置的
  `label_i18n`。
- 实现 v2.0 的棕地原语: 作用域树、瞬时捕获、autoRegister.watch。
- 通过 `NAC.validate_global({probe: false})`, 且严重度为 `error` 的
  发现项为零。

一个页面达到 **NAC3 Conformance Level 3**, 还要:

- 带有用 HMAC 签名的清单。
- 对安全敏感的动词区分 `isTrusted`。
- 通过 `NAC.validate_global({probe: true})`, 且发现项为零。

NPM 包的命令行 (`npx nac3 validate <url>`) 会报告一个页面所达到的最高
级别。(该包提供 `nac3` 和 `nac` 两个可执行名; 两者都指向同一个命令
行。)

### 8.1 级别的历史名称 (v2.5)

在 2.5.0 之前, 这三个级别写作 `NAC-1`、`NAC-2` 和 `NAC-3`。那些名称
与协议名 `NAC3` 只差一个连字符, 于是"本页符合 NAC-3"无法与"本页实现了
NAC3"区分开来, 而被要求报告级别的代理, 也没有一个无歧义的字符串可报。

旧名称作为历史别名仍然可读: `api/latest/levels.json` 把每一个都作为
`legacy_display_name` 发布在它原属的级别旁边, 这样 2.5.0 之前写的文档
仍然能对应到一个级别。它们**不具**规范性。新的文本、校验器的输出和
合规声明, 都使用级别编号或已发布的标识符。

---

## 9. 版本管理

NAC3 遵循 semver:

- **主版本**跃进: 对公开 API 或传输格式的破坏性变更。采用方需要改
  代码。
- **次版本**跃进: 新功能, 向后兼容。旧代码继续工作。
- **补丁**跃进: 缺陷修复, 仅文档的变更。

弃用策略: 在版本 `X.Y.0` 中被标记为 `@deprecated` 的功能, 不会早于
`(X+1).0.0` 被移除。发布说明会明确记录每一次移除。

NPM 包的版本映射规范的版本: `@nac3/runtime@X.Y.Z` 实现 NAC3 vX.Y,
其上再加 Z 个补丁修订。这个例子刻意用占位符写成: 在这句话里写一个具体
版本, 到下一个发布就过期了, 而本文档确实在该包早已前进之后, 还长期
带着 `2.1.3`。

### 9.1 预发布版与 dist-tag

带预发布尾巴的版本 (`-alpha.N`、`-beta.N`、`-rc.N`) **不是**本规范的
一次发布。它存在的目的, 是让一项变更在被承诺之前先被演练。

- **`latest` 永远只指向一个稳定版本。** 不带标签的
  `npm install @nac3/runtime` 必须解析到一个没有预发布尾巴的版本。
  按默认安装的采用方, 绝不会意外拿到预发布版。
- **预发布版在它们自己的 dist-tag 下发布** (`alpha`、`beta`、`rc`)。
  加入是显式的: `npm install @nac3/runtime@alpha`。
- **预发布版里的任何东西都不是承诺。** 在其中引入的任何表面, 都可能
  在承载它的稳定版本之前改变或消失。第 10 节的稳定性保证和第 12 节的
  发现项编码保证, 都从稳定版本开始。
- **预发布版绝不会被撤销发布**, 也绝不会被追溯地重贴成 `latest`。
  已发布内容的记录会保持可读。

参考运行时的权威版本是 `js/nac.js` 里的常量 `NAC.version`, 并且它也
作为数据发布: `api/latest.json` 分别带着 `stable` 和 `prerelease` 两个
指针 (任一个都可以是 `null`), 而每个已发布的产物都带着自己的
`channel` 字段。需要稳定契约的消费方只读一个字段就能拒绝, 不必解析
任何版本字符串, 也不必相信任何标签。

---

## 10. 校验器

### 10.1 运行时: `NAC.validate_global()`

它遍历活的 DOM 以及已注册的清单, 返回一个**具名分组的对象**: 每个条件
一个分组, 每个分组都是一个发现项数组。自 2.5.0 起, 每个分组的每个
发现项都带着 `code` 和 `severity`, 于是 CI 的集成可以按编码拦截, 而
不必解析消息:

```ts
{
  ok:         boolean,       // false when any error-severity finding exists
  has_errors: boolean,
  duplicates: [{ code: 'nac_id_duplicate_across_plugins',
                 severity: 'error', nac_id, plugins: string[] }],
  orphans:    [{ code: 'nac_id_orphan_in_dom',
                 severity: 'warn', nac_id, in_dom, in_manifest,
                 plugin_root }],
  unmounted:  [{ code: 'nac_id_declared_not_mounted',
                 severity: 'warn', nac_id, in_manifest, in_dom,
                 plugin }],
  convention_violations:
              [{ code: 'nac_id_missing_plugin_prefix',
                 severity: 'warn', nac_id, plugin, hint }],
  plugin_instance_violations:
              [{ code: 'duplicate_plugin_no_instance_id',
                 severity: 'error', slug, instance_count, ... }],
  tolerated:  [{ kind, nac_id, until, original }],
  plugin_count: number,
  total_ids:    number,
  timestamp:    number
}
```

这五个编码、它们的严重度以及各自该怎么处理, 都作为数据发布在
`api/latest/findings.json` 的 `global_buckets` 之下。发现项的编码跨
补丁发布保持稳定; 新编码只在次版本跃进时出现, 而且一个编码绝不会被
重新用于另一个条件 (第 12 节, 承诺 4)。

**2.5.0 之前的版本不给这些分组附上任何编码**, 而本节描述的是一个扁平
的发现项数组 -- 参考运行时从未返回过那种形状 (审计 N-14、N-34)。

**2.5.0 的行为变更 (审计 N-33)。** 在 2.5.0 之前, 这个校验器背后的
收集器只读清单的旧式分组 (`actions`、`fields`、`tabs`、`kpis`、
`charts`, 以 `nac_id` 为键), 从不读第 4 节那个规范形状
`elements: [{ id }]`。因此, 面对一份按文档方式写成的清单, 它报告
`total_ids: 0`, 把每个已声明的元素都列为孤儿, 根本无法报告重复、未挂载
的 id 或违反约定的情况, 却仍然回答 `ok: true`。自 2.5.0 起两种形状都
会读。曾用 `has_errors` 拦截 CI 的宿主, 在升级之后可能看到第一次失败:
那是一直都在那里的真实问题, 不是新规则。

### 10.2 命令行: `npx nac3 validate <target>`

它包住 `validate_global`, 再加上一次 HTML 与清单一致性的静态检查。
退出码:

- `0` -- 没有严重度 >= 所配置阈值的发现项。
- `1` -- 有发现项。
- `2` -- 目标自身加载失败。

在 CI 里很有用: `npx nac3 validate ./dist/index.html --severity=error`。
该包以两个可执行名 `nac3` 和 `nac` 暴露这个命令行; 用哪个取决于哪个
不与你 PATH 上的其他工具冲突。

---

## 11. NAC3 周围的系统

NAC3 是一个契约层。要把一个符合 NAC3 的页面变成一个语音驱动的应用,
你还需要:

1. **一个语音转文字的来源** (浏览器的 SpeechRecognition、Whisper 的
   API 等)。
2. **一个 LLM 中介**, 它接收用户的文本 + 页面的 `NAC.describe()`
   快照 + 一个 i18n 提示, 然后发出结构化的动作:
   `[{kind: 'click', nac_id: 'X'}, {kind: 'fill', nac_id: 'Y',
   value: 'Z'}]`。见 `guides/LLM_WIRING.md`。
3. **一个聊天客户端**, 它维持对话并派发这些动作。参考实现是
   `js/nac-chat-client.js`。
4. **一个文字转语音的出口**, 用于口头回应 (浏览器的
   SpeechSynthesis、ElevenLabs 等)。

NAC3 只标准化第 2 步的输入 / 输出形状 (`NAC.describe()` 的快照 + 动作
的形状)。第 1、3、4 步在规范之外; 你可以随意组合。

---

## 12. 稳定性保证

本规范所承诺的:

1. 第 1 节那组规范角色不会缩减。次版本里可以添加新角色。
2. 第 6 节那族事件不会改名。次版本里可以添加新事件。
3. `NAC.click`、`NAC.fill` 等的动词, 在次版本里不会改变形状。`opts`
   里可以出现新的可选字段。
4. `validate_global` 的发现项编码, 不会跨次版本被重新用于不同的条件。
   自 2.5.0 起, 这个校验器的每个分组都带一个编码, 并且全部连同严重度
   发布在 `api/latest/findings.json`: 比较两个已发布的版本, 被重用的
   编码不读任何源码就能看见。

本规范**不**承诺的:

1. 错误消息的确切措辞 (那些是 i18n 目录里的字符串; 各语言版本可能
   变动)。
2. 查找元素所用的 DOM 策略 (今天是 `querySelector`; 以后可能改成更快
   的索引)。
3. 清单内部缓存的布局。请把清单当作: 宿主一侧只写, 代理一侧只读。

---

## 13. 未决的问题

它们就在**这里**、在本节里被追踪。较早的一版把这里题为"未决的问题
(另行追踪)", 却从未说"另行"是在哪里; 当时没有别的登记册。一个得出
决定的问题会离开下面这张表, 进入它所影响的那一节。一个变成具体提案的
问题会获得一个 RFC, 而那些 RFC 索引在
[`rfcs/README.md`](rfcs/README.md), 流程在
[`CONTRIBUTING.md`](CONTRIBUTING.md)。

每一行都带着它最后一次被评估的版本, 这样读者就能把一个活着的问题与一个
被放弃的问题区分开来。**没有任何一行带着目标版本**: 一个带日期的承诺
过了它的日期, 比一个不带日期的更糟 -- 那正是第 5 节在
`payload_schema` 上犯过的错。

| 问题 | 状态 | 最后评估 | 现状如何 |
|----------|-------|---------------|-----------------|
| `data-nac-role="navigation"` 是否应该在某些情况下解析到选项卡? | **已决定: 不** | v2.5 | 在 2.2.0 决定, 此后一直强制: 带 `tab.` 前缀而角色为 `navigation` 的 id 会触发 `tab_id_manifest_role_drift`, 而在 `STRICT_VALIDATION` (自 2.3.0 起默认为 `true`) 之下 `NAC.register` 会抛出。`tab_by_label` 只从 `m.tabs[]` 和 `elements[role=='tab']` 解析选项卡。`navigation` 是一个地标区域, 绝不是可切换的面板。见第 1 节和第 10 节。 |
| `NAC.click()` 是否应该接受相对的 id (例如 `'./save'`)? | **未决, 未实现** | v2.5 | 解析器完全匹配 `data-nac-id` 并按插件限定范围: 当前活动的插件, 或 `opts.plugin` 指定的那个。那种限定已经覆盖了这个问题当初要解决的场景 (`NAC.click('save', {plugin:'invoice'})`), 所以对相对写法的压力很低, 也没有任何进行中的工作。要决定它, 就意味着给第 2 节加上一套路径文法 -- 而在那一节里, id 被明确声明为对运行时不透明。 |
| 清单是否应该支持跨插件的继承 / 扩展 (一份基础清单被某个租户扩展)? | **未决, 下一个主版本的候选** | v2.5 | 未实现。**不要与第 15 节混淆**, 那个"插件扩展契约"在 v2.5 已经发布, 是一套面向 backend 的路由机制 (`registerPlugin` / `call` / `read` / `subscribe`), 不是清单的继承。这里的问题是一份清单派生自另一份, 它触及第 2 节关于 id 唯一性的规则, 这也是它被留到主版本的原因。 |
| `payload_schema` 的强制是否应该正式化并打开? | **未决, 无日期** | v2.5 | 从第 5 节移到这里, 那一节曾把它承诺给 v2.4。它没有在 v2.4 落地, 直到 v2.5 也没有落地; 参考运行时不读这个字段。今天究竟什么被校验、什么没有, 见第 5 节。 |
| `validate_global()` 的发现项是否应该带上已发布目录里的编码? | **已决定: 是, 在 2.5.0 发布** | v2.5 | 每个分组的每一项都带着 `code` + `severity`, 于是第 12 节的承诺 4 现在覆盖的是一个真实的集合, 而不是一个空集。这五个编码发布在 `api/latest/findings.json` 的 `global_buckets` 之下, 而生成器是从一个会触发每个分组的测试样例里**读出**它们的, 不是手写: 上一版给一个自 2.5.0 起就带编码的分组写了 `code: null`, 并把两种说法发布在同一个文件里。构造那个样例也正是发现审计 N-33 的过程: 那个校验器看不见一份按规范形状写成的清单。见 10.1。 |

---

## 13.5 治理

NAC3 目前由 Yujin 看护。规范、文档和参考运行时全部以 Apache-2.0
发布。(在 2.5 之前双仓库的时期, 运行时被标为 MIT; 在 2026-05-23 的
整合中, 它在 NAC3 的所有产物上被统一为 Apache-2.0。见 `LICENSE` 和
`runtime/LICENSE`。) Yujin 承诺: 当采用程度足以证明需要中立治理时,
就把 NAC3 移交给一个中立的基金会 (W3C 社区组、Linux Foundation, 或
同等的行业机构)。在那之前, 规范的变更遵循 `CONTRIBUTING.md` 中记录的
RFC 流程, 任何影响公开 API 或传输格式的变更, 都有至少 14 天的公开评论
期。

给采用方: 统一的 Apache-2.0 许可保证, 无论 Yujin 的公司状态如何变化,
规范与运行时都能存续。你可以分叉其中任何一个、运行其中任何一个、发布
其中任何一个, 今天可以, 我们不在之后也可以。本文档记录下这个承诺, 是
为了让通往这种存续的路径是明示的, 而不是默认的。

---

## 14. 参考实现

规范的实现就是作为 NPM 包 `@nac3/runtime` 分发的参考运行时。版本的
规范来源是运行时自己的常量 `NAC.version`, 它作为数据发布在
`api/latest.json` (见 9.1 节)。本节刻意不再重述一个版本号: 它曾在该包
早已前进之后还带着 `2.5.0-alpha.5`, 那与从第 5 节和第 9 节移除的过时
例子属于同一类缺陷。它提供:

- `js/nac.js` -- 核心运行时: 第 5 节那套公开的命令式 + 自省 API
  (click/fill/select/tab、click_by_verb/tab_by_label、invoke/utter、
  edit_field、setCapabilities、syncPlugin、
  request_authority/confirm_action、
  registerPlugin/call/read/subscribe、narrate/context/tree、
  expect/diff、describe、validate_global、...)。作为该包的
  `main`/`module`/`browser` 入口发布 (`dist/nac.mjs`)。
- `js/nac-v2-extensions.js` -- 棕地 + 数据表的原语, 它们在核心加载
  之后挂到同一个 `window.NAC` 上: 作用域树、autoRegister、瞬时捕获、
  HMAC、isTrusted 证明、i18n 目录 (`t`/`locale`), 以及整个
  `registerDataTable` / `dt_*` 数据表家族 (5.3 节)。发布为
  `@nac3/runtime/extensions` (`dist/nac-v2-extensions.mjs`)。核心
  运行时**不**带 `dt_*` 这一表面; 要得到它就加载这个模块。
- `js/nac-chat-client.js` -- 一个参考聊天客户端, 它把语音 + LLM +
  派发器接在一起。发布为 `@nac3/runtime/chat-client`。

该包还以可执行名 `nac3` 和 `nac` 暴露一个命令行 (`dist/cli.js`,
10.2 节)。

欢迎其他实现 (原生自动化执行器用 Python、嵌入式代理用 Rust 等)。权威是
规范, 不是这份 JS 代码。

---

## 15. 插件扩展契约 -- canvas 与 API 表面 (v2.5)

第 1-14 节假定与代理有关的表面就是 **DOM**。每个可寻址的元素都有一个
`data-nac-id` 属性, 每个动词都通过 `el.click()` 触发, 每次状态读取都来自
`el.getAttribute(...)`。对于外壳和内容都活在 DOM 节点里的应用, 这是
成立的。

对于表面的一部分是 **canvas** 的应用, 它不成立 (LibreOffice /
Collabora Online、Figma、Excalidraw、Miro, 以及任何自制的 WebGL
编辑器)。外壳也许仍然是 DOM (工具栏、对话框), 但命令往往需要流经应用
自己的公开 API (postMessage、插件 SDK、脚本桥), 而状态也许根本无法从
DOM 读到。

v2.5 增加了一小组原语, 让一个 NAC3 插件能够声明它自己通往这类表面的
路由契约。运行时对任何具体应用都保持无知 -- 它学会与某个应用对话的
唯一途径, 就是读那个插件的清单。

### 15.1 为什么需要一组新的原语

只认识 DOM 的 `NAC.click(id)` 做不到:

- 向一个被沙箱化的 Collabora iframe 发送 `Send_UNO_Command` 的
  postMessage。
- 在 Figma 的插件沙箱里调用
  `figma.currentPage.selection = [...]`。
- 对一个 React 的 ref 调用 `excalidrawAPI.setElements(...)`。
- 读出当前 Collabora 的选区上粗体是否处于启用状态 (工具栏会反映它;
  canvas 把它藏起来)。

解决办法**不是**给 `NAC.click` 加上探测 backend 的启发式规则。解决办法
是增加一个显式的、与具体应用无关的动词, 它接受一个插件 slug 和一个
动词路径, 并让插件的清单去声明那个动词如何被路由。

### 15.2 三个原语

```ts
NAC.registerPlugin(slug: string, manifest: PluginManifest): void
NAC.call(plugin: string, verb_path: string, args?: object): Promise<any>
NAC.read(plugin: string, state_path: string): Promise<any>
NAC.subscribe(plugin: string, event_path: string,
              cb: (data: any) => void): SubscriptionHandle
NAC.unsubscribe(handle: SubscriptionHandle): void
```

- `registerPlugin(slug, manifest)` 注册一个 v2.5 的插件。同一个
  `slug` 可以同时出现在 DOM 的清单注册表 (第 5 节) 和 v2.5 的扩展
  注册表里; 两者并存。v2.5 的调用只通过 v2.5 的注册表解析。
- `call` 调用一个已声明的动词。路由由清单选择, 不由代理选择。它以
  backend 返回的东西来解决 (常常是 `undefined` / `{ok: true}`);
  若动词未知、backend 失败, 或响应的形状无效, 它以 `NacError` 拒绝。
- `read` 返回一个已声明的状态值。运行时按声明的顺序走这个状态的兜底
  链, 返回第一个解析成功的来源; 只有当链上每个来源都失败时才拒绝。
- `subscribe` 把一个监听器挂到一个已声明的事件上。它返回一个句柄,
  调用方把它传给 `unsubscribe` 来清理。事件可以由上游真实的事件源
  支撑, 也可以通过轮询 / MutationObserver 合成出来 -- 由清单声明是
  哪一种。

这四个函数都是异步的 (返回 Promise), 只有 `unsubscribe` 例外, 它是
同步且幂等的。

### 15.3 插件清单的形状

```ts
interface PluginManifest {
  slug: string;
  verbs:  { [verb_path: string]: VerbBinding };
  state:  { [state_path: string]: StateBinding[] };
  events: { [event_path: string]: EventBinding };
}

interface VerbBinding {
  backend:       BackendKind;
  /* backend-specific fields (see 15.4) */
  [k: string]: any;
}

interface StateBinding {
  backend:       BackendKind;
  /* backend-specific fields (see 15.4) */
  extract?:      string;   /* extractor DSL string (see 15.5) */
  [k: string]: any;
}

interface EventBinding {
  backend:       BackendKind;
  /* backend-specific fields */
  [k: string]: any;
}

type BackendKind =
  | 'postmessage'
  | 'postmessage-listen'
  | 'sdk-call'
  | 'script-bridge'
  | 'dom-mirror'
  | 'same-origin-window'
  | 'synthetic-mutation'
  | 'synthetic-poll';
```

清单是纯 JSON (没有 JS 回调)。Forge、Sumi 以及将来任何工具都把它们
作为数据生成; 运行时从一个固定的词汇表里解释 backend 的名字。

动词和事件各有**恰好一个**绑定。状态有一个绑定的**有序数组**: 运行时
按顺序走这条链, 返回第一个成功解析的来源。

### 15.4 backend 的词汇表

| 种类 | 用于 | 必填字段 |
|------|----------|-----------------|
| `postmessage` | 动词: 通过 `postMessage` 向一个 iframe 投递消息。 | `target` (要发送到的 iframe 的 CSS 选择器)、`message` (MessageId 字符串)、`values` (用参数插值的对象字面量)、`values_from_args` (可选, 原样转发的参数键的数组) |
| `postmessage-listen` | 事件: 在 `window.message` 上监听某个特定的到达 `MessageId`。 | `source` (用于过滤来源的 iframe 的 CSS 选择器; 省略则接受任何来源)、`message` (要匹配的 MessageId)、`extract` (作用于消息数据的抽取 DSL) |
| `sdk-call` | 动词: 调用一个全局暴露的 JS 函数 (例如 Figma 插件、Excalidraw 的 API)。 | `path` (`window` 里的点号路径, 例如 `figma.currentPage.selection`)、`mode` (`assign` 表示把参数的值赋给该路径, `invoke` 表示把它当函数调用并传入参数对象) |
| `script-bridge` | 动词或状态: 调用某个应用的脚本桥 (Collabora 的 `CallPythonScript`、LibreOffice 的 UNO 桥、Google Apps Script)。 | `bridge` (backend 专属的标识符, 如 `collabora.python`)、`script` (脚本的标识符)、`function` (要运行的函数名)、`args` (用调用参数插值的对象字面量)、`response_match` (用于状态: 要等待的响应 MessageId)、`timeout_ms` (可选, 默认 5000) |
| `dom-mirror` | 状态: 从一个 DOM 元素读取, 它的属性 / 类名 / 文本镜像了 canvas 内部的某个状态 (例如当某种格式在当前选区上启用时被高亮的工具栏按钮)。 | `selector` (要查询的 CSS 选择器)、`extract` (抽取 DSL, 见 15.5) |
| `same-origin-window` | 状态: 当 iframe 同源时, 从 `iframe.contentWindow.<path>` 读取。运行时会察觉跨源并落到下一个兜底。 | `target` (iframe 的 CSS 选择器)、`path` (`contentWindow` 里的点号路径) |
| `synthetic-mutation` | 事件: 通过观察一个或多个状态来源上的 DOM 变动, 在被观察的值发生变化时重新发出, 以此合成一个事件。 | `observe` (要盯住的状态路径的数组; 运行时对每一个调用 `read`, 并在变动之间比对)、`throttle_ms` (可选, 默认 100) |
| `synthetic-poll` | 事件: 通过轮询状态来源来合成一个事件。 | `observe` (状态路径的数组)、`interval_ms` (默认 250) |

每个 backend 都必须由运行时实现为一个自成一体的派发器
(`dispatch(binding, args, context) -> Promise<value>`)。向本规范添加
一种新的 backend 需要跃进规范的版本; 忽略未知 backend 的运行时必须
拒绝声明了它们的清单 (不得默默跳过)。

### 15.5 抽取用的迷你 DSL

状态的 backend 以及 `postmessage-listen` 这个事件 backend, 常常需要从
一个更大的对象里摘出一个字段。运行时自带一个极小的声明式 DSL, 好让
清单保持纯 JSON:

| 写法 | 含义 | 输入示例 -> 输出 |
|--------|---------|-------------------------|
| `field.path.to.value` | 沿点号路径遍历。 | `{a:{b:1}}` 配 `a.b` -> `1` |
| `attribute:NAME` | 仅 DOM: 读 `el.getAttribute(NAME)`。 | `<i data-x="hi">` 配 `attribute:data-x` -> `'hi'` |
| `text` | 仅 DOM: 读 `el.textContent`。 | `<span>hi</span>` 配 `text` -> `'hi'` |
| `classList.contains:CLASS` | 仅 DOM: `el.classList.contains(CLASS)` -> 布尔。 | `<button class="active">` 配 `classList.contains:active` -> `true` |
| `value` | 仅 DOM: 读 `el.value`。 | `<input value="x">` 配 `value` -> `'x'` |
| `present` | 仅 DOM: 若选择器解析到了一个元素则返回 `true`, 否则 `false`。 | 选择器匹配到了 -> `true` |

v2.5 不支持组合; 一个抽取器就恰好是上面的某一行。需要复杂变换的清单,
请改为声明一个 `script-bridge`。

### 15.6 `state` 兜底链的语义

`state[path]` 是一个绑定的数组。`NAC.read(plugin, path)` 按顺序走这个
数组。对每个绑定:

1. 运行时调用该 backend 的派发器。
2. 若派发器以一个值解决 (包括 `false`、`0`、空字符串, 但**不包括**
   `undefined`), `read` 返回那个值。
3. 若派发器拒绝, 或以 `undefined` 解决, 运行时前进到数组里的下一个
   绑定。
4. 若没有任何绑定产出值, `read` 以
   `NacError('state_unreadable', ...)` 拒绝, 它的
   `err.attempts: [...]` 为每个尝试过的 backend 带一条记录, 内容是
   `{backend, reason}`。

理由: 这条链编码的是写清单的人的偏好顺序。最快、最便宜、最新鲜的来源
被声明在最前面; 兜底则优雅地逐级退化。运行时绝不会默默先挑一个更差的
来源。

### 15.7 合成动作的来源

每一次 `NAC.call` 的派发, 都会在 backend 返回之后向 `document` 发出一个
`nac:plugin:invoked` 事件。detail 的载荷:

```js
{
  plugin:    'collabora.writer',
  verb_path: 'uno.Bold',
  backend:   'postmessage',
  request_id: 'pi_<random hex>',
  source:    'agent',     // see sec 7
  trusted:   false,
  duration_ms: 12,
  ok:        true,
  error:     null,
}
```

`nac:plugin:read` (在一次 `read` 之后) 与 `nac:plugin:event` (合成事件
的重新发出) 用同样的形状。`source` 默认是 `'agent'`; 把运行时包进
面向用户界面的宿主, 可以通过已有的 `NAC.set_source(...)` 机制覆盖它
(第 7 节)。

### 15.8 完整走通的例子 -- Collabora Writer

```json
{
  "slug": "collabora.writer",
  "verbs": {
    "uno.Bold": {
      "backend": "postmessage",
      "target":  "iframe[data-collabora-frame]",
      "message": "Send_UNO_Command",
      "values":  { "Command": ".uno:Bold" }
    },
    "doc.save": {
      "backend": "postmessage",
      "target":  "iframe[data-collabora-frame]",
      "message": "Action_Save",
      "values_from_args": ["DontTerminateEdit", "Notify"]
    }
  },
  "state": {
    "selection.isBold": [
      { "backend": "dom-mirror",
        "selector": "[data-nac-id='toolbar.bold']",
        "extract":  "classList.contains:selected" },
      { "backend": "script-bridge",
        "bridge":   "collabora.python",
        "script":   "yujin_state.py",
        "function": "GetSelectionState",
        "response_match": "CallPythonScript-Result",
        "extract":  "Values.is_bold" }
    ],
    "doc.modified": [
      { "backend": "same-origin-window",
        "target":  "iframe[data-collabora-frame]",
        "path":    "app.file.modified" }
    ]
  },
  "events": {
    "doc.modified": {
      "backend": "postmessage-listen",
      "source":  "iframe[data-collabora-frame]",
      "message": "Doc_ModifiedStatus",
      "extract": "Values.Modified"
    },
    "selection.changed": {
      "backend":     "synthetic-mutation",
      "observe":     ["selection.isBold", "selection.isItalic"],
      "throttle_ms": 100
    }
  }
}
```

代理调用 `NAC.call('collabora.writer', 'uno.Bold')`; 运行时经由
`postmessage` 这个 backend 路由, 向该 iframe 投递
`Send_UNO_Command`。为了确认这个效果确实发生了 (见第 17 节), 代理调用
`await NAC.read('collabora.writer', 'selection.isBold')`; 运行时先试
工具栏的镜像 (快且免费), 若镜像不可用就落到 Python 的脚本桥。代理
从不知道、也从不关心是哪个来源回答的。

### 15.9 错误

`NAC.call` / `read` / `subscribe` 会以一个 `NacError` 拒绝, 其 `code`
是下列之一:

- `plugin_not_registered` -- 该 slug 没有 v2.5 的清单。
- `verb_not_declared` -- 该动词路径不在清单里。
- `state_not_declared` -- 该状态路径不在清单里。
- `event_not_declared` -- 该事件路径不在清单里。
- `backend_unknown` -- 清单声明了一个运行时并未实现的 backend。清单
  必须在注册时就被拒绝; 这个错误只有在某个运行时接受了一种将来的清单
  格式、随后又无法派发它时才会浮现。
- `backend_target_missing` -- 该 backend 的目标 (iframe、JS 路径、DOM
  选择器) 找不到。
- `cross_origin_blocked` -- 对一个跨源的 iframe 尝试了
  `same-origin-window`。
- `state_unreadable` -- 一条状态链上的每个绑定都失败了; 见 15.6。
- `timeout` -- 某个 backend 没有在它所声明的 `timeout_ms` 内回应
  (动词默认 5000, 状态读取默认 1000)。
- `invalid` -- 参数的形状不对 (slug 无效、注册时清单格式错乱等)。

---

## 16. 树状导航 (v2.5 -- 已在 2.5.0-alpha.5 发布 / RFC V25-02)

面向辅助流程与语音执行器的分层命令导航原语, 它们需要描述从当前焦点
出发能做什么。

**API 表面:**

- `NAC.context(plugin) -> { breadcrumb: [{nac_id, label}, ...] }`
  从 `document.activeElement` 出发, 沿带有 `data-nac-id` 的祖先元素
  向上走, 在插件的根处停下。若插件内部没有任何东西获得焦点, 返回一条
  空的面包屑。每一级的 `label` 来自 `narrate` (第 17 节)。

- `NAC.tree(plugin, rootId?) -> [{nac_id, label, opens?, leaf?}, ...]`
  列举 `rootId` (省略则为插件的根) 的**直接**可寻址子元素。"直接"
  意思是起点与该子元素之间没有另一个带 `data-nac-id` 的元素。对每一
  项:
  - `label` 通过 `narrate` 解析
  - `opens` 在 `data-nac-opens` 属性存在时镜像它
  - `leaf` 在 `data-nac-leaf` 存在时为 `true`

**给编写者的属性:**

- `data-nac-opens="<target-nac-id>"`: 声明这个节点会打开 / 下钻到由
  目标 id 指明的那个元素。它让代理可以顺着导航链走下去, 而不必猜
  名字。
- `data-nac-leaf`: 明确的终端标记; 下游的代理由此知道不可能再下钻。

**错误:** 对未知的 rootId, `tree` 返回 `[]` (静默为空, 不是错误)。
对未知的插件, `context` 始终返回 `{ breadcrumb: [] }`。

---

## 17. 辅助标签 (v2.5 -- 已在 2.5.0-alpha.5 发布 / RFC V25-03)

人类可读标签的规范解析。一个函数, 服务于屏幕阅读器、语音合成、语音
流程、审计日志, 以及移动端的辅助表面。

**API 表面:**

- `NAC.narrate(plugin, nac_id) -> string | null`
  若找不到该插件或该 nac_id, 返回 `null`。否则返回按下面这个严格优先
  顺序得到的标签:

  1. **`aria-label`** -- 无障碍优先; 除非它只有空白, 否则一律尊重。
  2. **可见文本** -- 该元素的 `textContent`, 但排除任何嵌套的带
     `data-nac-id` 的子树 (那些有自己的 narrate 解析; 把它们排除掉,
     口头输出才会限定在本范围内)。
  3. **`data-nac-label`** -- 编写者明确的覆盖; 当可见文本里含有图标
     字形或 i18n 键时很有用。
  4. **退回到 `nac_id`** -- 最坏的情况; 它示意"没有人写过标签"。

  任何一层上只含空白的值, 都会落到下一层。

**校验:** 对于形如序号的 nac_id (`btn-1`、`btn-2`、...) 而缺少上述
任一较高层标签的情况, `validate_global()` 可能在
`plugin_instance_violations` 这个分组里发出警告。

---

## 18. 效果检测 (v2.5 -- 已在 2.5.0-alpha.5 发布 / RFC V25-04)

它补上"静默损害"这个缺口: 代理确认的是一个动作的效果, 而不仅是命令
已被发出。两个原语都与 `NAC.read()` 组合, 所以 V25-01 的任何 backend
都能用 (postmessage、sdk-call、dom-mirror、...)。

**API 表面:**

- `NAC.expect(plugin, statePath, value, opts?) -> Promise<value>`
  它轮询 `NAC.read(plugin, statePath)`, 直到比较器返回真值, 或者期限
  到达。它以解析出的值解决; 到期则以 `NacError('timeout', ...)`
  拒绝。

  轮询过程中的读取失败会一直重试到期限 (被当作"还看不到", 而不是硬
  错误)。

  可选项:
  - `timeout_ms` (默认 `5000`)
  - `poll_ms` (默认 `100`)
  - `comparator` (默认 `(cur, want) => cur === want`)
    它接收 `(current, expected)`, 返回布尔值。

- `NAC.diff(plugin, statePath, actionFn) -> Promise<{before, after, changed}>`
  它读状态, 等待 `actionFn()`, 再读一次状态。返回两份快照, 以及一个
  用 JSON-stringify 比较算出的布尔值 `changed` (所以 `undefined` 对比
  一个值也会被标记为已改变)。读取失败会折叠为 `undefined`。

**关于组合的说明:** `diff` 只捕捉起点和终点这两份快照; 它**不**观察
动作内部的中间状态。如果你关心的是"状态在某个时刻经过某个特定的值",
请用 `expect`。

---

*本文档是 NAC3 v2.5 的规范性规范。第 0-14 节与 v2.4 稳定版相比没有
变化。第 15-18 节在 v2.5 发布。对本文件的编辑构成规范的变更, 需要一个
RFC; 见 `CONTRIBUTING.md`。*
