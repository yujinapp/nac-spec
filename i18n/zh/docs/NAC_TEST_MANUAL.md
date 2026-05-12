---
translation_source: docs/NAC_TEST_MANUAL.md
translation_source_hash: 75c7b936593deacfec1dd9689f1093483363cc45f01514ff9c9d8d52e466c9a9
translation_quality: machine_v1
translation_lang: zh
translation_date: 2026-05-11T15:16:32.604938+00:00
---

# NAC3 测试手册

**适用于任何 NAC-3 合规应用的标准化测试规范。**

版本 1.0 -- 2026-05-11。适用于 NAC3 v2.2 + v2.3 预览接口。规范更新时同步更新本文档。

本文档告知采用团队：测试什么、如何测试、断言什么、以及跳过什么。按 NAC3 流水线各阶段依次说明：

```
Comunicacion -> Desambiguacion -> Intencion -> Llamada -> Resultado -> Ack
    (1)             (2)             (3)         (4)         (5)        (6)
```

以及横切关注点：构造器（V22-01）、bindAction 契约（V22-02）、互操作（v2.3）、来源追踪与安全。

Yujin 参考套件（本手册底部的案例研究）包含 **175+ 个单元测试 + 16 个 Playwright e2e 测试**，加权平均流水线覆盖率 **95%**。可按需参考。

---

## 0. 本手册的目的

每个 NAC3 采用团队都要从零构建测试语料库，最终覆盖率参差不齐——有的团队 ack 事件测试完善，却忽略了 LLM 中间层；有的团队有端到端 Playwright 测试，却没有单元测试。本手册明确定义 NAC-3 应用"完整测试"的含义。

NAC-3 认证应用的最低要求：

| 阶段 | 必须具备 | 建议具备 |
|-------|-----------|-------------|
| 1 Comunicacion | 文本路径已覆盖。聊天客户端有 STT mock 测试。 | 真实 TTS 语料库 + 通过 Playwright 验证音频播放。 |
| 2 Desambiguacion | 语言切换检测器的误报测试。snapshotTree 结构已验证。 | 已测试每个标签页/i18n 标签的容错性。 |
| 3 Intencion | 针对 >= 5 个提示词的实时（或 VCR 录制）后端冒烟测试。 | 针对应用历史 bug 的防御性测试。 |
| 4 Llamada | 应用使用的每个公开 NAC.* 函数，包含正常路径和错误路径。 | 如已接入，则测试 drag_drop、edit_field。 |
| 5 Resultado | 至少验证应用暴露的前 10 个动词的 DOM 副作用。 | 通过 Playwright 矩阵进行跨浏览器测试。 |
| 6 Ack | 角色产生的每个事件族，并断言 detail 结构。 | 长尾事件族（breadcrumb、accordion、step）。 |
| Interop | 如果发布 MCP 导出/导入：验证 export_tree 结构 + 导入 + 代理 + 断开连接。 | HMAC 签名 + 递归防护。 |

---

## 1. 套件结构

推荐以下结构（与 Yujin 参考套件一致）：

```
packages/<your-app>/
  test/
    smoke.mjs                       artefact integrity + CLI
    v22.mjs                         strict validator + bindAction
    v23-interop.mjs                 cross-app MCP (if you implement)
    stage1-audio.mjs                STT mock + TTS corpus integrity
    stage2-disambiguation.mjs       _detectLangSwitch + tab_by_label + snapshotTree
    stage3-backend.mjs              live (or recorded) backend smoke
    stage4-calls.mjs                every public NAC.* write API
    stage6-ack.mjs                  ack event families
    stage6b-longtail.mjs            breadcrumb/accordion/step/sort/filter/confirm
    fixtures/voice/                 TTS-generated MP3 corpus
      corpus.json                   prompt -> expected outcome
      generate.mjs                  one-shot regen via Google/ElevenLabs
      <locale>/<id>.mp3
tests/
  e2e-nac/
    playwright.config.ts
    specs/
      01-landing.spec.ts            @demos
      02-demo-<name>.spec.ts        @demos one per surface
      08-pipeline-end-to-end.spec.ts @e2e full chat-to-ack
tools/nac/
  test-launch.sh                    orchestrates everything
```

`tools/nac/test-launch.sh` 执行：
- 第 1 层：按顺序链式运行所有 node 端套件，遇到第一个 FAIL 即中止。
- 第 1b 层（可选）：实时后端冒烟测试（约 60 秒）。
- 第 2 层：通过 `npx @nac3/runtime validate <dir>` 进行静态检查。
- 第 3 层：文档链接完整性检查。
- 第 4 层：演示产物完整性检查。
- 第 5 层：案例研究包完整性检查。

目标：在笔记本电脑上，第 1 + 2 + 3 + 4 + 5 层总耗时不超过 10 秒。

---

## 2. 各阶段测试内容

### 阶段 1 -- Comunicacion（STT + 原始输入）

#### 本阶段职责

音频采集、STT 转录、原始文本输入到聊天客户端。聊天客户端的 `_sttBuffer` + `_sttFlushTimer` 防抖逻辑属于本阶段。语言切换短路逻辑（`_maybeChangeLocaleLocally`）也在此处。

#### 测试内容

1. **STT mock + 转录注入。** 用伪造实现替换 `window.SpeechRecognition`，触发携带预设转录文本的合成 `result` 事件。验证 `NacChat.send(transcript)` 将该文本原样传入调度器。
2. **TTS 语料库完整性。** 通过 Google Cloud TTS / ElevenLabs 为 10 个支持的语言区域各生成约 30 条音频提示词。验证每个 MP3 文件存在且大小 >= 1KB。用于检测语料库本身的回归问题。
3. **真实音频播放（Playwright）。** 可选。通过 `getUserMedia` mock 回放语料库中的某个 MP3，路由到浏览器的 SpeechRecognition。配置较复杂，v1 阶段可跳过。

#### 断言内容

- 语料库中的每条提示词都以原始文本到达 `NacChat.send()`。
- 空输入和纯空白输入不会导致聊天客户端崩溃。
- 对于匹配 `_detectLangSwitch` 的提示词，语言切换短路逻辑正常触发（阶段 2 也有覆盖）。

#### 跳过内容

- 麦克风权限流程。属于浏览器级 UI，不值得用 Playwright 测试。
- 跨浏览器音频编解码器兼容性。语料库统一使用 MP3，只测一个浏览器。

---

### 阶段 2 -- Desambiguacion

#### 本阶段职责

`_detectLangSwitch`。快照组合与清洗。`tab_by_label` 匹配器容错性。将原始文本转化为"LLM 应看到的内容/本地触发的快捷操作"的所有逻辑。

#### 测试内容

1. **`_detectLangSwitch` 误报用例。** 这是容易出 bug 的区域，需编写明确的反向测试：
   - `'cambia de pestana'` -> 保持当前语言区域。
   - `'cambia precio de mouse 40'` -> 保持当前语言区域。
   - `'borra de la lista'` -> 保持。
   - `'pasa de A a B'` -> 保持。
2. **`_detectLangSwitch` 正向用例。** 跨支持的语言区域至少 12 个：
   - `'cambia a aleman'` -> de
   - `'switch to english'` -> en
   - `'use spanish'` -> es
   - `'cambia idioma a de'`（显式触发词 + 裸语言代码）-> de
   - 相同语言的无操作情况。
   - 空输入 / 纯空白输入。
3. **`tab_by_label`** 容错性：
   - 精确 textContent 匹配。
   - 去括号匹配（`"Lines (collection)"` 匹配 `"Lines"`）。
   - i18n 语言区域标签匹配。
   - 未知标签 -> not_found。
4. **`snapshotTree` 结构。** 返回 `{active, plugins[]}`。每个插件包含 manifest。包含活跃插件的数据表快照（如为 v2.1）。

#### 断言内容

- `NacChat.send(text)` 后的最终语言与预期一致。
- 后端是否被调用符合预期。
- `tab_by_label` 在各用例下正常返回或抛出异常。
- `snapshotTree()` 可 JSON 序列化且大小在合理范围内。

#### 常见陷阱

- 裸 2 字母语言代码（`'de'`、`'es'`）与介词/冠词冲突。需明确测试这些陷阱用例。
- `label_i18n` 中 1-2 个字符的填充标签会导致部分匹配误报。使用真实字符串。

---

### 阶段 3 -- Intencion（LLM 中间层）

#### 本阶段职责

聊天客户端与 LLM 中间层之间的 HTTP 往返。后端职责：读取 `nac_tree` 快照 + 提示词，返回 `{message, actions[]}`。

#### 测试内容

1. **后端结构冒烟测试。** 针对支持语言区域中的一组标准提示词（建议 >= 15 个），POST 到端点并断言：
   - HTTP 200。
   - JSON 响应包含 `ok` 布尔值。
   - 当 ok 为 true 时：包含 `message` 字符串 + `actions` 数组。
   - 每个 `action.kind` 属于标准类型之一。
2. **防御性 bug 测试。** 针对历史中每类已知 bug，编写明确的实时测试。示例：`'cambia de pestana'` 绝对不能返回 `change_locale: 'de'`。
3. **快照大小限制。** 如果按 token 计费，不要向 LLM 发送超过 20KB 的快照；若树超出预算，测试应使构建失败。

#### 跳过内容

- LLM 具体的 action 内容。LLM 是非确定性的，不要断言"保存会触发 action_id = X"。只验证结构。
- 网络韧性（超时、重试）。属于负载/可靠性测试，不属于单元/冒烟测试。

#### 实时测试 vs VCR

实时测试受 LLM 费用和速率限制影响较脆弱。提示词语料库稳定后，将响应录制为 VCR cassette（JSON 文件，映射提示词到响应），在 CI 中回放。Yujin 参考套件使用实时测试，因为预算允许约 60 秒/次；如果 CI 运行频繁，请切换为 cassette。

---

### 阶段 4 -- Llamada（NAC.* 写入 API）

#### 本阶段职责

`window.NAC` 上的所有公开函数：click、click_by_verb、fill、select、tab、tab_by_label、go_to_section、drag_drop、edit_field、dt_*、bindAction。

#### 测试内容

对于每个使用的函数，测试三种情况：

1. **正常路径。** 挂载一个匹配 manifest id 的 DOM 元素；将其处理器接入以触发标准 ack 事件；调用 `NAC.<func>(...)` 并断言其 resolve。
2. **not_found。** 使用不存在的 id 调用；断言抛出 code 为 `'not_found'` 的异常（`go_to_section` 为 `'section_not_found'`）。
3. **无效输入。** 使用空值或错误结构的参数调用；断言抛出 code 为 `'invalid'` 的异常。

对于 `dt_*` 系列，额外测试：

- `dt_add_row` 返回 `{ok, row_id}`。
- `dt_edit_cell` 正常路径 + 无效值被拒绝（例如 `qty < min`）。
- `dt_remove_row` 使 `dt_state().rows.length` 减少。
- `dt_commit` 返回 `{ok, final_state}`。
- `dt_discard` 回滚未提交的变更。

#### 实现说明

在一个轻量的进程内 DOM shim（约 150-200 行 EventTarget 子类）中运行，无需 jsdom 或 Playwright。复合选择器匹配（`[a="b"][c="d"]`）是唯一必须支持的特性。参见参考套件中的 `stage4-calls.mjs`。

---

### 阶段 5 -- Resultado（DOM 副作用）

#### 本阶段职责

NAC.* 调用后 DOM 的实际变化。与阶段 4（函数返回 ok）和阶段 6（ack 事件触发）相互独立。

#### 测试内容

1. **按动词验证 DOM 变更。** 针对前 10 个动词：
   - `save` -> 底层表单是否已提交？Toast 是否出现？
   - `cancel` -> 模态框是否关闭？表单值是否重置？
   - `delete` -> 行是否从列表中移除？
   - `add_row` -> 表格中是否出现新行？
2. **每个界面的 Playwright e2e 测试。** 每个顶层插件/页面一个 spec。在真实浏览器中挂载界面，执行标准用户流程，断言 DOM 状态。

#### 跳过内容

- 像素级截图对比。视觉回归有专用工具。
- 性能（帧率、布局偏移）。属于性能测试，预算独立。

---

### 阶段 6 -- Ack 事件族

#### 本阶段职责

运行时监听的每个 `nac:*` 事件。每个事件都有标准的 detail 结构（plugin + id-key + 可选附加字段）。

#### 测试内容

针对 `_CLICK_EVENT_FAMILY` 中的每个事件族：

- `nac:action:succeeded` -- detail.plugin + detail.action_id + detail.is_trusted。
- `nac:action:failed` -- 同上 + detail.error。
- `nac:field:changed` -- detail.field_id + detail.value。
- `nac:tab:activated` -- detail.tab_id。
- `nac:breadcrumb:navigated` -- detail.breadcrumb_id。
- `nac:accordion:expanded` / `:collapsed` -- detail.accordion_id。
- `nac:step:advanced` -- detail.step_id。
- `nac:table:page_changed` -- detail.page_index。
- `nac:confirm:resolved` / `:cancelled` -- detail.confirm_id。
- `nac:table:sort_changed` -- detail.column_id。
- `nac:table:filter_changed` -- detail.filter_id。

每个事件族：
1. 挂载一个具有标准 role 的 DOM 元素。
2. 将点击处理器接入以触发标准事件。
3. 调用 `NAC.click(id)` 并监听事件。
4. 断言 detail 结构。

此外：
- **点击到 resolve 的时序。** 运行时监听器应在 ack 触发后 200ms 内 resolve。超时则为运行时 bug。
- **`bindAction`** 在同步处理器执行后自动触发 ack。
- **`bindAction` 异步 resolve** 在 Promise resolve 后自动触发 ack。
- **`bindAction` 抛出异常** -> 自动触发 `nac:action:failed`，携带 detail.error。

---

### V22-01 -- 严格构造器校验器

`NAC.STRICT_VALIDATION = true` 使 `NAC.register` 在以下情况抛出异常：

- `manifest_role_unknown` -- role 不在标准集合中。
- `tab_id_manifest_role_drift` -- id 匹配 `^tab\.` 但 role 不是 `'tab'`。
- `manifest_dom_role_mismatch` -- 已挂载的 DOM 的 role 与 manifest 声明不一致。

每种情况的测试方法：
1. 设置 `STRICT_VALIDATION = true`。
2. 使用专门违反该规则的 manifest 调用 `register`。
3. 断言抛出 `code: 'strict_validation'` 且包含 `findings: [...]` 的异常。

非严格模式下：断言 `console.error` 被调用（通过 spy 捕获 `console.error`）。

---

### V22-02 -- bindAction 辅助函数

上文阶段 6 已有覆盖，但需额外编写至少 5 个明确测试：

1. 同步处理器 -> ack 触发。
2. 抛出异常的处理器 -> failed 事件触发 + 错误重新抛出。
3. resolve 的异步处理器 -> resolve 后 ack 触发。
4. `bindAction` 返回解绑函数；调用后停止触发。
5. 缺少 ctx（无 plugin 或 action_id）-> 抛出 `code: 'invalid'` 的异常。

---

### Interop -- v2.3 预览

如果应用通过 MCP 导出/导入 NAC3 树：

1. **export_tree 结构。** 返回 `{app_id, app_version, nac_version, exported_at, active_plugin, manifests, scope_tree, data_tables, state, ack_endpoint}`。
2. **export_tree 过滤。** `scope: 'plugin_slug:<slug>'` 只返回该插件。`scope: 'active_plugin'` 只返回活跃插件。`include_locales: ['en','es']` 只返回这些语言区域。
3. **import_remote_tree 校验。** 缺少 bearer 或 endpoint 时抛出 `invalid`。重复命名空间抛出 `conflict`。
4. **命名空间插件注册。** 导入后，`NAC.list_registered_plugins()` 包含 `remote:<ns>:<slug>`。
5. **代理调度。** `NAC.click('remote:<ns>:...')` 向对端端点发起 `fetch`，携带 `bearer` + `nac_id`（对端本地 id，无前缀）+ `action.kind`。
6. **本地 ack 镜像。** 代理成功后，本地触发 `nac:action:succeeded`，detail 包含 `detail.via_interop: true` + `detail.is_trusted: false`。
7. **对端错误冒泡。** 对端返回 `{ok: false, error: {code: '...', message: '...'}}` -> 客户端以对端的 code 抛出异常。
8. **disconnect_remote。** 清除命名空间；后续 `NAC.click('remote:...')` 抛出 not_found。
9. **本地点击不走代理。** 关键契约：安装互操作层后，对本地 id 调用 NAC.click 绝对不能发起 fetch。

---

## 3. 工具推荐

### 测试运行器

- **Node + 纯 ESM 模块**用于第 2-6 阶段。不用 Jest，不用 Vitest——200 行 `assert(name, ok)` 就够了，还能减少依赖。
- **Playwright** 用于第 5 阶段端到端测试，以及第 1 阶段音频播放测试（如果需要的话）。

### CI

- 不要在每次推送时都运行实时后端冒烟测试（第 3 阶段）——每次约 60 秒 × 合并频率 = 真实成本。仅在以下情况运行：
  - 手动触发（`gh workflow run`）。
  - 每夜定时任务。
  - 发布版本打标签前。
- 每次推送时运行第 1、2、4、6 阶段及测试框架。总时间预算：15 秒以内。

### 覆盖率报告

每次发布维护一份 `docs/COVERAGE_REPORT_<date>.md`。更新逐项用例表格，并包含加权流水线平均值。Yujin 参考报告位于 `yujin.app/nac-spec/docs/COVERAGE_REPORT_2026_05_10.md`。

---

## 4. 应避免的反模式

1. **断言 LLM 动作的具体内容。** 结果不确定。测试**结构（SHAPE）**，而非**值（VALUES）**。
2. **在第 5 阶段模拟 DOM。** 第 5 阶段关注的是真实 DOM 变更，请使用 Playwright 而非 shim。
3. **按代码行数而非阶段统计覆盖率。** 代码行覆盖率无法说明流水线是否正常工作。请使用阶段矩阵。
4. **第 4 阶段只测试正常路径。** `not_found` 和无效输入占合约的一半。
5. **跳过第 6 阶段。** ack 事件是接入方代码中违反规范最多的部分。对每个你发出的事件族都要测试。
6. **没有防回归守卫。** 应用修复的每个生产 bug 都要有永久性回归测试。`cambia de pestana` 用例已永久纳入我们的第 2 阶段测试。
7. **每次推送都运行实时测试。** 消耗预算，且因第三方不稳定性导致测试不可靠。

---

## 5. 案例研究——Yujin 参考测试套件

以下所有测试源文件链接均指向 GitHub 上的规范文件。

| 套件 | 源文件 | 测试数 | 耗时 |
|-------|--------|-------|------|
| smoke | [packages/nac/test/smoke.mjs](https://github.com/yujinapp/nac-spec/blob/main/runtime/test/smoke.mjs) | 36 | < 1s |
| v22 | [packages/nac/test/v22.mjs](https://github.com/yujinapp/nac-spec/blob/main/runtime/test/v22.mjs) | 14 | < 1s |
| v23-interop | [packages/nac/test/v23-interop.mjs](https://github.com/yujinapp/nac-spec/blob/main/runtime/test/v23-interop.mjs) | 14 | < 2s |
| stage1-audio | [packages/nac/test/stage1-audio.mjs](https://github.com/yujinapp/nac-spec/blob/main/runtime/test/stage1-audio.mjs) | 33 | < 1s |
| stage2-disambiguation | [packages/nac/test/stage2-disambiguation.mjs](https://github.com/yujinapp/nac-spec/blob/main/runtime/test/stage2-disambiguation.mjs) | 31 | < 1s |
| stage3-backend（实时） | [packages/nac/test/stage3-backend.mjs](https://github.com/yujinapp/nac-spec/blob/main/runtime/test/stage3-backend.mjs) | ~150（10 个语言区域 × 3 个提示词） | ~120s |
| stage4-calls | [packages/nac/test/stage4-calls.mjs](https://github.com/yujinapp/nac-spec/blob/main/runtime/test/stage4-calls.mjs) | 31 | ~2s |
| stage6-ack | [packages/nac/test/stage6-ack.mjs](https://github.com/yujinapp/nac-spec/blob/main/runtime/test/stage6-ack.mjs) | 16 | < 1s |
| stage6b-longtail | [packages/nac/test/stage6b-longtail.mjs](https://github.com/yujinapp/nac-spec/blob/main/runtime/test/stage6b-longtail.mjs) | 14 | < 1s |
| TTS 语料生成器 | [packages/nac/test/fixtures/voice/generate.mjs](https://github.com/yujinapp/nac-spec/blob/main/runtime/test/fixtures/voice/generate.mjs) | -- | 一次性 |
| TTS 语料目录 | [packages/nac/test/fixtures/voice/corpus.json](https://github.com/yujinapp/nac-spec/blob/main/runtime/test/fixtures/voice/corpus.json) | 30 个提示词 | -- |
| 测试框架 | [tools/nac/test-launch.sh](https://github.com/yujinapp/nac-spec/blob/main/tools/nac/test-launch.sh) | 5 层 | ~10s |
| **Node 端合计** | | **259+** | **~10s + 120s（可选）** |

另有 16 个 Playwright 端到端规格（约 54 秒）：

| 规格 | 源文件 | 测试数 | 标签 |
|------|--------|-------|-----|
| 01-landing | [tests/e2e-nac/specs/01-landing.spec.ts](https://github.com/yujinapp/nac-spec/blob/main/tests/e2e-nac/specs/01-landing.spec.ts) | 2 | @demos |
| 02-demo-v19 | [tests/e2e-nac/specs/02-demo-v19.spec.ts](https://github.com/yujinapp/nac-spec/blob/main/tests/e2e-nac/specs/02-demo-v19.spec.ts) | 1 | @demos |
| 03-demo-v20 | [tests/e2e-nac/specs/03-demo-v20.spec.ts](https://github.com/yujinapp/nac-spec/blob/main/tests/e2e-nac/specs/03-demo-v20.spec.ts) | 2 | @demos |
| 04-demo-v21-datatable | [tests/e2e-nac/specs/04-demo-v21-datatable.spec.ts](https://github.com/yujinapp/nac-spec/blob/main/tests/e2e-nac/specs/04-demo-v21-datatable.spec.ts) | 3 | @demos |
| 05-demo-v22-interop | [tests/e2e-nac/specs/05-demo-v22-interop.spec.ts](https://github.com/yujinapp/nac-spec/blob/main/tests/e2e-nac/specs/05-demo-v22-interop.spec.ts) | 1 | @demos |
| 06-demo-react-study-case | [tests/e2e-nac/specs/06-demo-react-study-case.spec.ts](https://github.com/yujinapp/nac-spec/blob/main/tests/e2e-nac/specs/06-demo-react-study-case.spec.ts) | 2 | @study |
| 07-demo-angular-study-case | [tests/e2e-nac/specs/07-demo-angular-study-case.spec.ts](https://github.com/yujinapp/nac-spec/blob/main/tests/e2e-nac/specs/07-demo-angular-study-case.spec.ts) | 2 | @study |
| 08-pipeline-end-to-end | [tests/e2e-nac/specs/08-pipeline-end-to-end.spec.ts](https://github.com/yujinapp/nac-spec/blob/main/tests/e2e-nac/specs/08-pipeline-end-to-end.spec.ts) | 3 | @e2e |
| 配置 | [tests/e2e-nac/playwright.config.ts](https://github.com/yujinapp/nac-spec/blob/main/tests/e2e-nac/playwright.config.ts) | -- | -- |
| **Playwright 合计** | | **16** | |

**总计：205+ 个测试**，覆盖从聊天输入到 ack 事件的完整流水线，加权平均覆盖率 **95%**。

### 各阶段覆盖率（Yujin 参考，2026-05-11）

| 阶段 | 覆盖套件 | 覆盖率 |
|-------|---------------------|----------|
| 1 Comunicacion | stage1-audio.mjs | 85% |
| 2 Desambiguacion | stage2-disambiguation.mjs | 95% |
| 3 Intencion | stage3-backend.mjs（实时 LLM） | 85% |
| 4 Llamada | stage4-calls.mjs | 95% |
| 5 Resultado | tests/e2e-nac/specs/*.spec.ts（Playwright） | 95% |
| 6 Ack | stage6-ack.mjs + stage6b-longtail.mjs | 100% |
| 互操作（v2.3） | v23-interop.mjs + 05-demo-v22-interop.spec.ts | 100% |
| 构造函数（V22-01） | v22.mjs | 100% |
| bindAction（V22-02） | v22.mjs | 100% |
| **加权平均** | | **~95%** |

### 测试语料库发现的 Bug

测试语料库在开发过程中发现了两个真实的运行时 Bug，并在同一分支中完成了修复：

1. **`tab_by_label` 匹配器过于宽松。** 原始实现接受任意双向 `indexOf` 匹配。`label_i18n` 中一个单字符填充标签（`'a'`）可以匹配任何长度大于等于 1 的查询字符串。第 2 阶段测试 B4 发现了此问题。修复方案：对于部分匹配，要求候选项和查询字符串均不少于 3 个字符；精确相等始终允许。

2. **缺少 `list_registered_plugins` 自省辅助方法。** 互操作层的 `export_tree` 通过遍历 manifest 注册表来生成其载荷。运行时没有公开 API 可以独立于 DOM 挂载状态列出已注册的插件。在编写 v23-interop 套件时发现了此问题。修复方案：新增 `NAC.list_registered_plugins()`，返回 `Object.keys(_manifests)`。

两处修复均在同一分支中发布至 `js/nac.js`。

### 接入方使用手册——采用本测试套件

1. **首先复制测试基础设施。** 复制 `packages/nac/test/` 中的 shim、辅助工具和测试框架，运行现有测试以验证环境。
2. **用你的应用界面替换测试语料库。** 替换为你的插件 slug、动词和数据表格，保持流水线阶段的组织结构不变。
3. **生成你的 TTS 语料库**，使用 `packages/nac/test/fixtures/voice/generate.mjs`，通过环境变量提供你的 Google Cloud TTS 或 ElevenLabs 密钥。
4. **将 `tools/nac/test-launch.sh` 接入你的 CI。** 第 1-5 层在合并前运行；后端第 1b 层设为可选或每夜运行。
5. **维护覆盖率报告。** 每次发布时更新。

### 许可证

本手册与 NAC3 规范其余部分同为 Apache-2.0 许可。可自由复制、分叉和再分发。

---

## 6. 后续资源

- [SPEC.md](../SPEC.md)——Yujin 测试所依据的规范合约。
- [SECURITY.md](../SECURITY.md)——威胁模型与来源说明。
- [COVERAGE_REPORT_2026_05_10.md](COVERAGE_REPORT_2026_05_10.md)——实时参考报告。
- [LAUNCH_PLAN_2026_05_10.md](LAUNCH_PLAN_2026_05_10.md)——本测试语料库所依托的 autonomous-Sumi 发布手册。

*本文档随 NAC3 规范持续演进。请通过 PR 提交修改，目标文件为 `yujin.app/nac-spec/docs/NAC_TEST_MANUAL.md`。*

---

*This is a machine translation of the canonical English
version at `/nac-spec/docs/NAC_TEST_MANUAL.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
