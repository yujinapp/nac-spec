---
translation_source: docs/VOICE_CHAT_ERROR_ANALYSIS_2026_05_09.md
translation_source_hash: 1c92bf209ccbc809e9d43062cc65ea0594983593f9e93293ae2912837f639f8d
translation_quality: machine_v1
translation_lang: zh
translation_date: 2026-05-11T15:26:06.990773+00:00
---

# 错误分析 -- 语音+聊天会话 2026-05-09

> Pablo 在 `example-v20-full.php` 上进行的语音+聊天测试会话。本文档梳理了观察到的故障，按根本原因分类，并为每个问题提出具体修复方案。仅使用 ASCII 字符。
>
> **STATUS 2026-05-09（当天结束时）：** 路线图中的 8 个修复（C1..C8）均已实现。详见第 7 节末尾的变更摘要及代码位置。

---

## 1. 执行摘要

共检测到 7 类故障。其中 4 类是**可复现的 bug**，已在代码中定位根本原因；2 类是**语音管道的架构限制**，需要架构层面的改动；1 类是**UX 阻断问题**（模态框阻塞聊天）。

严重程度：

| 类别 | 严重程度 | 类型 | 优先级 |
|---|---|---|---|
| C1. TTS -> STT 反馈循环 | **CRITICAL** | 架构 | 立即处理 |
| C2. 子字符串匹配器误触命令 | **HIGH** | bug | 立即处理 |
| C3. 确认模态框阻塞聊天 | **HIGH** | UX | 高 |
| C4. v20_panel.X 无法通过聊天解析 | **MEDIUM** | bug | 中 |
| C5. STT 片段被当作命令执行 | **MEDIUM** | 架构 | 中 |
| C6. 英文 "show" 在 v20_panel 缺失时映射错误 | 派生自 C4 | -- | 关闭 C4 后自动解决 |
| C7. "cambia idioma" 行为不一致 | **LOW** | bug | 低 |

---

## 2. 命令日志（输入 -> 输出 -> 诊断）

| # | 语音/聊天输入 | 机器人响应 | 诊断 |
|---|---|---|---|
| 1 | "apreta describe_v20" | "No encuentro esa accion. Lo mas parecido: Correr el self-test, Ver capacidades, Ver mapa del sistema." | **C4** -- v20_panel 清单不在后端接收到的树中。机器人在其可见的树中搜索，top-3 是实际存在的 slug。 |
| 2 | "pulsa boton show" | "Mostrando el mapa del sistema." | **C6** = C4 的连锁影响。英文 "show" 本应匹配 `v20_panel.toggle`（英文标签 "Toggle panel"），但由于该插件不在树中，匹配器回退到 `navmap.fetch_map`（标签 "Show the system map"）。 |
| 3 | "ve a NAC3 v2.0 layer y pulsa el boton mostrar" | "No veo una capa v2.0 ni un boton 'mostrar'. Lo mas cercano: Ver mapa, Ver capacidades, Listar secciones." | **C4** -- 与 #1 一致。若 v20_panel 在树中，机器人能找到 `v20_panel.toggle`；否则找不到。 |
| 4 | "cambia a ingles" | "No encuentro un control de idioma en esta pagina..." | **C7** -- 行为不一致：命令 #16（完全相同）却成功了。 |
| 5 | "pulsa system map" | "Pulsando NAC.system_map()." | OK（命中）。slug `navmap.fetch_map` 在树中。 |
| 6 | "pulsa capacidades" | "Pulsando NAC.capabilities()." | OK。slug `navmap.caps`。 |
| 7 | "pulsa ver capacidades" | "Pulsando Ver capacidades." | OK。同一 slug。 |
| 8 | "filtra por ricardo" | "Filtrando la tabla por 'ricardo'." | OK。表格实时过滤。 |
| 9 | "pon brasil" | "Pongo Brasil en el campo Pais." | OK。Datalist 自动补全。 |
| 10 | "sube volumen a 80" | "Subiendo volumen a 80%." | OK。滑块。 |
| 11 | "Porqué no me iluminas mostrándome el monte" | "Te muestro el Monte Fuji." | OK。长句+间接表达 -- LLM 正确映射到图标 `art.fuji`。 |
| 12 | "secretísimo" | "Abriendo el modal secreto." | OK。 |
| 13 | "elimina factura" | "Eliminando la factura." | **C3** -- 该操作具有破坏性，但在触发前**未**弹出确认；模态框在操作后才出现，且聊天被阻塞（见 C3）。 |
| 14 | "Voz activada"（机器人 TTS 输出） | "Eliminando la factura." | **C1** -- 反馈循环。TTS 说出 "Voz activada"，STT 将其采集为用户输入。"Voz activada" 本不应匹配任何命令，但因 C2，"activada" 与缓冲区中上一条删除命令关联，触发了操作。 |
| 15 | "voz activada"（回声） | "Eliminando la factura." | **C1** + **C2** -- 循环重复。 |
| 16 | "eliminatorias" | "Eliminando la factura." | **C2** -- 匹配器使用子字符串："elimin" 前缀匹配了 "eliminar"。任何以 "elimina" 开头的词都会触发该操作。 |
| 17 | "Muéstrame factura" | "Previsualizando la factura." | OK。 |
| 18 | "Manos libres activado..."（TTS）-> "manos libres activado"（STT） | "Modo manos libres confirmado." | **C1** -- 同样的循环。 |
| 19 | "modo manos libres confirmado Dime cuáles son tus capacidades" | "Mostrando las capacidades del sistema." | 输入是机器人的回复与用户命令拼接在一起。因 "capacidades" 匹配权重高而命中。**C5** 部分体现。 |
| 20 | "del sistema" | "Mostrando el mapa del sistema." | **C5** -- 上一条输入的片段被作为独立命令处理。 |
| 21 | "corre el test" | "Corriendo el self-test de NAC." | OK。 |
| 22 | "de nac" | "Corriendo el self-test de NAC." | **C5** -- 片段。 |
| 23 | "cambia a inglés" | "Switching to English mode for upcoming replies." | OK。**但**与 #4（相同输入，不同响应）不一致。 |
| 24 | "cambia el idioma de la página a chino" | "No encuentro un control de idioma en esta página..." | **C7** -- LLM 未将此识别为会话级语言切换元命令，而是在树中查找对应控件。 |

---

## 3. 各类别根本原因

### C1 -- TTS -> STT 反馈循环（CRITICAL）

**机制：** `SpeechSynthesisUtterance` 通过用户扬声器播放机器人的回复。与此同时，`SpeechRecognition` 在免提模式下持续运行。麦克风采集到扬声器的声音，STT 将其转录为用户输入，聊天系统处理后机器人再次发声，形成无限循环。

若机器人的任何回复中包含类似命令的词（删除、显示、打开、切换），就可能触发另一个操作。若该词对应破坏性操作，**将造成实际损害**。

**日志中的证据：**
- "Voz activada"（TTS）-> 被采集为输入 -> 与缓冲区中的 "elimina" 匹配 -> 删除发票。
- "Manos libres activado. Te escucho de continuo."（TTS）-> 被采集为 "manos libres activado" -> 机器人回复 "Modo manos libres confirmado"。
- "Modo manos libres confirmado"（TTS）-> 被采集并拼接到下一条输入。

**解决方案（按健壮性排序）：**

1. **强制半双工**（行业标准修复方案）：
   - 当 `speechSynthesis.speaking === true` 时调用 `recognition.stop()`。
   - 在 utterance 结束时（utterance 的 `onend` 事件）恢复 `recognition.start()`。
   - 代价：用户无法在机器人说话时打断。99% 的场景下可接受；会增加感知延迟，但能避免循环。
2. **内容过滤**（纵深防御）：
   - 维护一个循环缓冲区，记录机器人在过去 30 秒内说过的最近 N（=10）条 `SpeechSynthesisUtterance.text`。
   - 当 STT 转录结果到达时，进行归一化处理（小写、去除变音符号、trim），并与缓冲区比对。若与任意近期 utterance 的相似度 >70%，则静默丢弃。
3. **破坏性操作强制确认**（最后一道防线）：
   - 任何带有 `data-nac-a11y-hint="destructive"` 或标记为 `irreversible` 的操作，在触发前必须经过明确的二次确认。NAC3 v1.9 已定义 `confirm_action()` -- 当前 demo 在破坏性路径上未使用该机制。

**建议：** 立即实现方案（1），短期内实现方案（3）。方案（2）可选，适用于希望用户能打断机器人的场景。

---

### C2 -- 子字符串匹配器误触命令（HIGH）

**机制：** 意图解析器（在后端或 LLM 中）使用子字符串匹配。"eliminatorias" 包含前缀 "elimina"，而 "elimina" 是某个已注册操作的动词，因此触发了该操作。

**证据：**
- "eliminatorias" -> "Eliminando la factura."

**解决方案：** 匹配器应基于**完整词元**（或词干）进行匹配，而非子字符串。可行实现：

- 按空格和标点对输入进行分词。
- 对每个词元，使用西班牙语词干归一化与操作动词进行比对（"elimina/elimino/elimine/eliminar" -> 词干 `elimin`，"eliminatorias" -> 词干 `eliminatori`）。词干不同 -> 不匹配。
- 在 system prompt 中维护一份简短的"命令"词干列表（约 30 个动词），用于截断启发式匹配。

`@nac-spec/test-runner/src/lib/matcher.js` 模块已实现完整词元匹配（对整个短语使用 `indexOf`，而非对 slug 进行子字符串匹配）。bug 出在中间层后端，而非最新的匹配器。

**具体行动：** 审查 system prompt（`crm_desa/api/v1/yujin.php` 中的 `yjNacDemoSystemPrompt`），添加明确规则："`eliminar`、`borrar`、`cancelar` 等动词仅在输入的完整词元与动词变形完全匹配时才触发，**不**在该词是另一个词的前缀时触发。"

---

### C3 -- 确认模态框阻塞聊天（HIGH）

**机制（Pablo 报告）：** 机器人触发破坏性操作时，会弹出带有"批准"/"取消"按钮的模态框。该模态框使用带焦点陷阱的 `<dialog>`，或在 DOM 其余部分（包括聊天）上叠加 `inert` 属性。聊天因此变得不可访问：无法输入文字、无法语音输入、无法通过对话确认。

**后果：** 用户必须手动点击取消或批准。在免提模式下，这破坏了"可语音操作"的设计契约。

**解决方案：**

1. 确认模态框应**置于聊天的焦点陷阱之外** -- 或等效地，聊天应**置于模态框的焦点陷阱之外**。实践方案：将聊天设为 `position: fixed`，`z-index` 高于模态框，并在模态框打开时设置 `inert={false}`。
2. 模态框的按钮应声明 `data-nac-id`（如 `confirm.approve`、`confirm.cancel`）并加入 NAC 树。聊天机器人随后可通过语音对相应 slug 发起"批准"或"取消"的 dispatch。
3. TTS 应自动朗读模态框的问题（"确认删除发票吗？请说'是'或'否'。"），STT 应将回答直接解析为确认/拒绝。

**具体行动：** 审查 `example-v20-full.php` 中的 modal-confirm 组件（如存在）或 `js/nac.js` 中 `confirm_action()` 的通用钩子，确保模态框**不**将聊天包含在其焦点树中。

---

### C4 -- v20_panel.X 无法通过聊天解析（MEDIUM）

**机制：** 页面 JS 在每次聊天轮次前调用 `nacDemoSnapshotTree()` 来序列化 NAC 树。该函数调用 `NAC.describe()`（v1，而非 `describe_v2()`）。`NAC.describe()` **仅**包含已通过 `NAC.register()` 注册的插件。

v20_panel 在 `example-v20-full.php` 的 body 末尾 `<script>` 块中注册，位于 `bootV20()` 函数内，该函数通过 `setTimeout(bootV20, 50)` 轮询直到 `NAC.scope` 存在。若出现以下情况：
- 浏览器较慢，或 rc5 的部署尚未完成（rpaforce-crm 打包了自己的 `nac-v2-extensions.js` 副本），导致 `NAC.scope` 不存在，`bootV20` 未能运行；
- 或者 `bootV20` 在用户发送第一条聊天消息之后才运行，

则 `NAC.describe()` 不包含 v20_panel，后端收到的树中缺少这些 slug。

**证据：**
- "apreta describe_v20" -> 机器人找不到 `v20_panel.describe_v2`。
- "pulsa system map" -> 机器人**能**找到 `navmap.fetch_map`（因为 navmap 在 example.js 启动时注册，远早于此）。

**解决方案：**

1. **将 `nacDemoSnapshotTree` 迁移至 `describe_v2()`**（可用时）。`describe_v2()` 同时返回 v1_plugins（兼容）和 v2_scope_entries，确保通过 `NAC.register` 注册的清单和通过 `NAC.scope` 声明的 scope 都能到达后端。
2. **阻塞第一条消息的发送，直到 `bootV20()` 完成。** `chat-send` 保持 disabled 状态，直到 `nac:v2_installed` 事件触发。
3. **确保 `NAC.register({plugin_slug:'v20_panel'})` 在任何 `chatSend` 尝试之前运行。** 将该注册移至 `example.js` 自身的启动阶段（约第 30 行，其他清单所在位置），而非延迟到 body 末尾的内联脚本。

**建议：** 结合方案（1）+（3）。（1）是结构性修复；（3）消除竞态条件。

---

### C5 -- STT 片段被当作命令执行（MEDIUM）

**机制：** Web Speech API 会分别返回部分结果（`onresult`，`interim` 为 true）和最终结果。当前聊天将每个最终结果作为独立消息处理。当用户在 "el del sistema" 和 "muéstrame el mapa" 之间停顿时，STT 可能发出两个最终结果："el del sistema" 和 "muéstrame el mapa"，机器人会分别处理两者。

此外，机器人通过 TTS 的回复（C1 问题）也可能混入并被当作片段处理。

**证据：**
- "del sistema" -> 被当作完整命令执行"显示系统地图"。
- "de nac" -> 执行"NAC3 自检"。

**解决方案：**

1. **缓冲区 + 静默超时防抖**：
   - 将最终结果累积到缓冲区中。
   - 仅在最后一个结果后有 800-1500 毫秒静默时，或用户点击"发送"时，才将内容提交给后端。
   - 这样可将连续片段合并为一个完整问题。
2. **最小长度过滤**：忽略少于 4 个有效字符的转录，除非其匹配动词+宾语的模式（有效短语的正则表达式）。
3. **针对 C1 的过滤**：若转录与机器人最近 N 条 utterance 的相似度 >70%，则丢弃。

**建议：** 方案（1）+（3）。这是现代语音应用（Alexa、Google Assistant、Siri）的标准做法。

---

### C6 -- "show" 在 v20_panel 缺失时映射错误（派生问题）

关闭 C4 后自动解决。当 v20_panel 在树中时，其 `label_i18n.en="Toggle panel"`（或所选标签）会赢得对 "show" 的匹配。当前该插件不在树中，匹配器回退到 `navmap.fetch_map`（标签 "Show the system map"），因为其关键词 "show" 进行了前缀匹配。

补充：`v20_panel.toggle` 的英文标签应将 "show / hide" 作为同义词，而不仅仅是 "Toggle panel"。更新清单如下：

```js
{ id: 'v20_panel.toggle', role: 'button',
  label_i18n: {
    es: 'Mostrar / ocultar panel',
    en: 'Show or hide panel',  /* antes: 'Toggle panel' */
    ...
  }
}
```

---

### C7 -- "cambia idioma" 行为不一致（LOW）

**机制：** LLM 存在两条不确定性路径：
- 字面路径：在可见树中查找语言控件（不存在 -> 拒绝并返回 top-3 候选）。
- 元命令路径：将 "cambia a inglés" 识别为会话级元命令，发出 `{kind:'say', text:'Switching to English mode...'}` 并更新 `currentLang`。

走哪条路径取决于 LLM 的采样结果（当前 system prompt 中 temperature 为 0.5-0.7），导致行为不一致。

**解决方案：** 在 system prompt 中添加**明确规则**：

> "当用户请求切换会话语言时（如 'cambia a inglés'、'switch to French'、'idioma chino'），**始终**以 `{kind:'change_locale', locale:'<2-letter>'}` 响应 -- **不要**在树中查找语言控件。这是影响会话的元命令，而非页面上的点击操作。"

并将 `change_locale` 类型添加到后端处理器接受的词汇表中（与 click / fill / say 等并列）。

代价：system prompt 增加 1 行 + 后端处理器增加 1 个分支。

---

## 4. 修复路线图（按影响/成本排序）

| # | 修复项 | 类别 | 成本 | 影响 |
|---|---|---|---|---|
| 1 | 半双工 TTS/STT（bot 说话时静音麦克风） | C1 | 低 | 关键 |
| 2 | 用 `confirm_action()` 确认破坏性操作 | C1, C3 | 中 | 关键 |
| 3 | Modal 确认框移出聊天的 focus trap | C3 | 中 | 高 |
| 4 | matcher 中按完整单词分词 | C2 | 低 | 高 |
| 5 | 将 `nacDemoSnapshotTree` 迁移至 `describe_v2()` | C4 | 低 | 中 |
| 6 | 将 `NAC.register('v20_panel')` 移至早期启动阶段 | C4 | 极低 | 中 |
| 7 | STT 加入 buffer + 800-1500ms debounce | C5 | 低 | 中 |
| 8 | 在 system prompt 中添加 `change_locale` 规则 | C7 | 极低 | 低 |
| 9 | 在 v20_panel.toggle 的 `label_i18n` 中添加同义词 | C6 | 极低 | 低 |

成本说明：
- **极低**：1 行代码 + 1 次 commit。
- **低**：不超过 30 行，1-2 小时。
- **中**：30-150 行，半天。

---

## 5. 成功案例（有效的部分）

记录运行正常的内容，避免误改：

- "Porqué no me iluminas mostrándome el monte" -> LLM 正确映射到 `art.fuji` 图标。**间接 + 隐喻式 intent 解析** —— 这正是第 16 节所要求的。
- "secretísimo" -> 打开隐藏 modal。**口语化表达解析成功**。
- "Muéstrame factura" -> 预览发票。**动词变位 + 与破坏性命令"elimina factura"的对象区分正确**。
- "filtra por ricardo" -> 实时过滤。**动作 + 参数正确分离**。
- "pon brasil" -> 国家字段填入巴西。**声明式对象到 `fill` 的映射**。
- "sube volumen a 80" -> 滑块调至 80%。**从文本中提取数值 + 滑块操作**。
- "corre el test" -> 自检。**动词 + 树中对象**。

这些案例验证了：当树结构完整、matcher 不因子字符串产生混淆时，system prompt rc5（第 16 节 contract）可以正常工作。

---

## 6. 下一步

在下次 push 中实现修复 #1、#4、#6（三项成本均为低或极低，覆盖三个关键类别）。修复 #2、#3、#5 可放入规模较大的独立 PR。其余项目可加入 backlog。

Pablo：请告知是否现在开始实施这些修复，或者是否希望先审阅本文档。

---

## 7. 实施状态（2026-05-09 终版）

Pablo 批准实施**所有**修复，限制条件为**不得破坏** system prompt rc5 所启用的间接/隐喻/口语化 intent 解析能力（例如隐喻式表达"porqué no me iluminas mostrándome el monte" -> 富士山；口语化表达"secretísimo" -> 隐藏 modal）。该能力存在于 LLM 中，而非本地 matcher。各修复保持 LLM 不变，分别优化：(a) LLM 之前的输入捕获（C1、C5），(b) prompt 向 LLM 传递的规则（C2、C7、C8），以及 (c) 后续 dispatch（C3、C4）。

| # | 类别 | 已实施的修复 | 位置 |
|---|---|---|---|
| C1 | TTS->STT 反馈回路 | 半双工（`speechSynthesis.speaking` 期间静音 STT）+ 保存 bot 最近 8 条 utterance 的循环 buffer + 在 `recognizer.onresult` handler 中进行内容过滤（精确匹配 / 包含匹配 / 70% token 重叠）；处理前先检查 `speechSynthesis.speaking` | `js/example.js` -- `_ttsRecentBuf`、`_sttIsBotEcho`、`_ttsRememberUtterance`；`recognizer.onresult` 在处理前检查 `speechSynthesis.speaking` |
| C2 | 子字符串 matcher | 在 system prompt 中新增显式规则 11："WORD-LEVEL MATCHING -- 'eliminatorias' NO matches 'eliminar'. Conjugated forms or infinitive only. On near-prefix ambiguity, return `{kind:'say'}` for clarification, NEVER the destructive action."本地 `interpret()` 自 2026-05-06 起已正确分词。 | `crm_desa/api/v1/yujin.php` `yjNacDemoSystemPrompt` 规则 11 |
| C3 | Modal 确认框阻塞聊天 | (a) CSS：`.ne-side { z-index: 10001 }` 将聊天框移出 overlay（z-index 9999）。(b) 监听 `nac:confirm:requested` 事件，通过 TTS 播报提示语 + 本地化 hint。(c) `_maybeAnswerPendingConfirm()` 在 `chatSend` 和 `_sttFlush` 中路由，将 10 种语言的 YES/NO 直接映射到 `<id>.confirm`/`.cancel`，绕过 LLM。 | `css/example.css` `.ne-side`；`js/example.js` `_findPendingConfirm`、`_maybeAnswerPendingConfirm`、`nac:confirm:requested` 监听器 |
| C4 | v20_panel 未进入聊天 | (a) Manifest 提取至 `window.__V20_PANEL_MANIFEST__`，通过 `registerV20PanelManifest()` 以 30ms 轮询方式注册，在 `NAC.register` 可用后立即执行（早于 `bootV20`）。(b) `nacDemoSnapshotTree` 现在在 `NAC.describe_v2` 存在时也包含 `v2_scope_entries`、`v2_intermediate_scopes`、`sitemap`、`tenant_prefix`、`nac_version_v2`。 | `example-v20-full.php`（早期注册块）；`js/example.js` 扩展后的 `nacDemoSnapshotTree` |
| C5 | STT 片段被当作命令 | Buffer `_sttBuffer` + `setTimeout(_sttFlush, 1100)`。每个 `final` STT 结果重置计时器；仅在 1100ms 静默后才将 buffer 内容发送至后端。手动路径（chatSend / 停止麦克风）时清空 buffer。 | `js/example.js` `recognizer.onresult` + `_sttFlush` |
| C6 | "show" 映射错误 | 随 C4 修复一并解决（v20_panel 现已在树中可见）。额外：v20_panel.toggle 的 `label_i18n.en` 从 "Toggle panel" 更新为 "Show or hide v2.0 panel"，并新增 9 个完整的本地化语言。 | `example-v20-full.php` `__V20_PANEL_MANIFEST__` |
| C7 | "cambia idioma" 行为不一致 | (a) 在 system prompt 目录中新增 kind `change_locale`。(b) 规则 13："SESSION META-COMMANDS use change_locale -- do NOT search the tree for a 'language control'."(c) 在 `dispatchAgenticAction` 中新增调用 `applyLangChange(a.locale)` 的 handler。 | `crm_desa/api/v1/yujin.php`（新增 kind + 规则 13）；`js/example.js` `dispatchAgenticAction` case `change_locale` |
| C8 | 插件中动词错误（控制台警告 "No action with verb=fetch_map found in plugin selftest"） | 显式规则 12："PLUGIN-VERB BINDING is fixed by the manifest. Do NOT guess, do NOT carry the verb to a nearby plugin, do NOT invent a plugin name."并附 WRONG ↔ RIGHT 示例。 | `crm_desa/api/v1/yujin.php` `yjNacDemoSystemPrompt` 规则 12 |

### 未修改的部分（有意为之）

- **主 system prompt（第 16 节 contract）：** 保持不变。仅新增规则 11、12、13 作为补充；绝对规则 A-F 及规则 1-10 均未改动。
- **本地 matcher `interpret()`：** 自 2026-05-06 起已按完整单词分词，无风险。
- **确认对话框（`nac.js` 中的 `NAC.confirm_dialog`）：** 保持不变；原本已发出 `nac:confirm:requested` 事件，按钮也已有 `data-nac-id`。现在只是新增了监听。

### 残余风险 / 后续步骤

- **C1 第三级（破坏性操作使用 `confirm_action()`）：** 仍待处理。目前"elimina factura"会直接触发操作，modal 随后出现。若 LLM 在规则 11 下仍出现混淆，fallback 方案应为：所有声明为破坏性的操作（`data-nac-a11y-hint=destructive`）在 dispatch 层均须先经过 `confirm_dialog`。留作后续跟进：需检查 `manifest.actions[].destructive`，若为真则在 dispatch 层用 `confirm_action()` 包装 invoke。
- **STT debounce（C5）：** 1100ms 为经验值。若观察到"bot 对短命令响应迟缓"，可降至 800ms 并观察效果。
- **TTS 反馈过滤（C1）—— 激进阈值：** 70% token 重叠阈值可能误拦截用户的合法命令，尤其是与 bot 常用短语高度重合时（例如 bot 刚说完"estas son las capacidades"，用户说"muestra capacidades"）。后续遥测建议：统计每次会话中 `[stt] dropping bot-echo` 的日志次数——若超过 N 次，将阈值提高至 80%。

---

*This is a machine translation of the canonical English
version at `/nac-spec/docs/VOICE_CHAT_ERROR_ANALYSIS_2026_05_09.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
