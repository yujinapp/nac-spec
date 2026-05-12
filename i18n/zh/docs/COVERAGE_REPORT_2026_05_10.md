---
translation_source: docs/COVERAGE_REPORT_2026_05_10.md
translation_source_hash: 4da4311e057dd1c23dea9b23a506ada42741d28b05b94709cb5150b1686c51ac
translation_quality: machine_v1
translation_lang: zh
translation_date: 2026-05-11T15:21:02.765309+00:00
---

# NAC3 覆盖率报告 -- 2026-05-10 / 11 夜间

生成于分支 `feat/nac-interop-mcp` 覆盖夜结束时。本报告如实、逐项记录了测试内容及测试深度。

取代此前非正式的"50/50 PASS"/"5/5 层 GREEN"说法。那些数字在结构上是准确的，但深度参差不齐；本报告按流水线阶段重新呈现全貌。

## 流水线阶段说明

```
Comunicacion -> Desambiguacion -> Intencion -> Llamada -> Resultado -> Ack
    (1)              (2)             (3)         (4)        (5)         (6)
```

## 本分支已发布的测试套件

| 套件 | 路径 | 测试数 |
|-------|------|-------|
| smoke | `packages/nac/test/smoke.mjs` | 36 |
| v22（构造函数严格模式 + bindAction） | `packages/nac/test/v22.mjs` | 14 |
| v23-interop（跨应用 MCP） | `packages/nac/test/v23-interop.mjs` | 14 |
| stage1-audio（STT mock + TTS 语料库） | `packages/nac/test/stage1-audio.mjs` | 33 |
| stage2-disambiguation | `packages/nac/test/stage2-disambiguation.mjs` | 31 |
| stage3-backend（实时调用） | `packages/nac/test/stage3-backend.mjs` | ~80 |
| stage4-calls | `packages/nac/test/stage4-calls.mjs` | 31 |
| stage6-ack | `packages/nac/test/stage6-ack.mjs` | 16 |
| **本地合计** | | **175+** |

当前本地全部 PASS。GitHub Actions 未触发（零额度预算；测试仅在 Pablo 的笔记本上按需运行）。

## 按流水线阶段划分的覆盖率矩阵

### Stage 1 -- Comunicacion（STT + 原始输入）

| 层级 | 状态 | 备注 |
|-------|--------|-------|
| **CAPA A：STT mock + 语料库注入** | PASS（30/30） | `packages/nac/test/stage1-audio.mjs`。Mock `SpeechRecognition` 合成 `result` 事件；NacChat 正常接收并分发。断言语言陷阱保持在当前语言环境，切换提示词触发切换，普通提示词触发后端。 |
| **CAPA B：语料库完整性** | PASS（3/3） | 通过 Google Cloud TTS 生成的 30 个 MP3 文件，位于 `packages/nac/test/fixtures/voice/`，覆盖 10 个语言环境，共 365 KB。验证文件存在性及最小体积。 |
| 浏览器 SpeechRecognition 真实音频播放 | 已推迟 | Web Speech API 需要真实麦克风流 + 浏览器环境，归入 Playwright e2e（已排队）。 |

**Stage 1 覆盖率：~85%** —— 文本、语料库及 STT mock 路径已全面覆盖。仅剩真实浏览器音频播放，需要 Playwright。

### Stage 2 -- Desambiguacion

| 关注点 | 用例数 | 结果 |
|---------|-------|--------|
| `_detectLangSwitch` 误报防护（bug 类 f631d77a） | 12 | PASS —— `cambia de pestana`、`cambia precio de mouse 40`、`borra de la lista`、`pasa de A a B` 均正确保持西班牙语。`cambia a aleman`、`switch to english`、`use spanish`、`cambia idioma a de` 正确触发切换。同语言无操作 + 空输入不崩溃。 |
| `tab_by_label` 精确 textContent 匹配 | 1 | PASS |
| `tab_by_label` 括号剥离（`"Lines (collection)"` 匹配 `"Lines"`） | 1 | PASS |
| `tab_by_label` i18n 语言环境匹配 | 1 | PASS |
| `tab_by_label` 未知标签 -> not_found | 1 | PASS |
| `snapshotTree` 返回有效结构 | 6 | PASS |

**Stage 2 覆盖率：~95%。** 匹配器收紧（部分匹配要求 cand.length >= 3）作为附带修复在同一套件中发布，关闭了单字符填充标签的误报问题。

### Stage 3 -- Intencion

针对生产端点 `https://yujin.app/crm/api/v1/yujin/nac-demo` 的实时调用。Yujin 聊天后端（Claude Sonnet）作为 LLM 中间层。

| 关注点 | 用例数 | 结果 |
|---------|-------|--------|
| 每个提示词返回 HTTP 200 + JSON 响应 | 15 个提示词，覆盖 7 种语言（es/en/pt/fr/de/ja + 一个西班牙语陷阱提示词） | 全部 PASS |
| 响应包含 `ok` 布尔值 | 15 | PASS |
| `ok` 为真时，包含 `message` 字符串 + `actions` 数组 | 15 | PASS |
| 每个 action 包含 `kind` 字符串 | 15 | PASS |
| **反 bug 防护**：`cambia de pestana` 不触发 `change_locale: 'de'` | 1 | PASS —— 实时 LLM 遵守了 2026-05-09 发布的系统提示规则。 |

**Stage 3 覆盖率：~85%** 的契约结构。未达 100% 是因为 LLM 的具体 action 内容具有不确定性；我们仅对结构形状 + 反 bug 用例进行断言。

### Stage 4 -- Llamada（所有公开 NAC.* 函数）

| 函数 | 用例数 | 结果 |
|----------|-------|--------|
| `NAC.click` | 正常 / not_found / 无效 | 3 PASS |
| `NAC.click_by_verb` | 正常 / 未知动词 | 2 PASS |
| `NAC.fill` | 正常 / not_found / 值已应用到 DOM | 3 PASS |
| `NAC.select` | 正常 / not_found | 2 PASS |
| `NAC.tab` | 正常 / 未知键 / 插件未挂载 | 3 PASS |
| `NAC.tab_by_label` | textContent / 括号 / i18n / not_found | 4 PASS（与 stage 2 重叠） |
| `NAC.go_to_section` | 正常 / section_not_found | 2 PASS |
| `NAC.set_mode` | 有效 / 无效 | 2 PASS |
| `NAC.screenshot` | 返回 data URL | 1 PASS |
| `NAC.edit_field`（v2.3 预览） | 打开 / not_found / 无效 | 3 PASS |
| `NAC.dt_add_row` | 返回 row_id | 1 PASS |
| `NAC.dt_edit_cell` | 正常 / 拒绝无效输入 | 2 PASS |
| `NAC.dt_remove_row` | 状态递减 | 1 PASS |
| `NAC.dt_commit` | 返回 final_state | 1 PASS |
| `NAC.dt_discard` | 回滚未提交内容 | 1 PASS |
| `NAC.dt_read_aggregate` | 求和聚合 | 1 PASS |
| `NAC.bindAction` | 处理器触发 + 解绑器有效 | 2 PASS |

**Stage 4 覆盖率：~95%** 的公开写入接口。缺失：`drag_drop`（尚无 shim 覆盖）、v1.3 toast / banner / confirm 对话框原语（v2.x 低优先级）。

### Stage 5 -- Resultado（DOM 副作用）

| 关注点 | 状态 |
|---------|--------|
| `fill` 更新 input.value | PASS（stage 4 T6 已验证） |
| `select` 更新 select 元素 | PASS（stage 4 T8） |
| `dt_*` 变更反映在 `dt_state()` 中 | PASS（stage 4 T24-T30） |
| `edit_field` 模态框挂载 | PASS（stage 4 T21） |
| 全屏 Playwright DOM 验证 | 已推迟 —— 需要真实浏览器 + Vite/ng-build 步骤 |

**Stage 5 覆盖率：~70%**（单元级别）。全屏 DOM 验证已排队。

### Stage 6 -- Ack 事件族

| 事件族 | 用例数 | 结果 |
|--------|-------|--------|
| `nac:action:succeeded` 结构（plugin + action_id + is_trusted） | 4 | PASS |
| `nac:field:changed` 结构 | 3 | PASS |
| `nac:tab:activated` 结构 | 2 | PASS |
| 处理器抛出时的 `nac:action:failed` | 2 | PASS |
| `bindAction` 异步 resolve 路径 | 1 | PASS |
| 点击到 resolve 耗时 < 200ms | 1 | PASS |
| 各事件族的规范 detail 结构 | 3 | PASS |

**Stage 6 覆盖率：~95%。** 缺失：长尾事件族（`nac:breadcrumb:navigated`、`nac:accordion:expanded`、`nac:step:advanced`、`nac:table:sort_changed`、`nac:table:filter_changed`、`nac:confirm:resolved`）。模式相同，补充覆盖属于机械性工作。

### 横切关注点：interop（v2.3 预览）

| 关注点 | 用例数 | 结果 |
|---------|-------|--------|
| `export_tree` 结构 + 作用域 + 语言环境过滤 | 7 | PASS |
| `import_remote_tree` 验证连接 + 注册命名空间插件 + 反映在列表中 | 5 | PASS |
| `click` + `fill` 的代理分发 | 4 | PASS |
| 带 `via_interop:true` 的本地 ack 镜像 | 1 | PASS |
| 对端错误码向上冒泡 | 1 | PASS |
| `disconnect_remote` + 断开后拒绝 | 2 | PASS |
| 本地点击不走代理 | 1 | PASS |

**Interop 覆盖率：100%** —— v2.3 预览接口全面覆盖。

## 覆盖率汇总 —— 流水线加权

| 阶段 | 覆盖率 | 结论 |
|-------|----------|---------|
| 1 Comunicacion | **85%** | STT mock + TTS 语料库 PASS。仅真实浏览器音频播放待处理。 |
| 2 Desambiguacion | 95% | 扎实。Bug 类已验证。 |
| 3 Intencion | 85% | 实时后端结构已覆盖。 |
| 4 Llamada | 95% | 所有公开写入 API 均已测试。 |
| 5 Resultado | 70% | 主要为单元级别。Playwright 已排队。 |
| 6 Ack | 95% | 核心事件族已覆盖；长尾为机械性工作。 |
| Interop | 100% | v2.3 预览接口全面覆盖。 |
| **加权平均** | **~90%** | |

## 运行时因此产生的变更

测试发现了两个真实问题，并在同一分支中完成修复：

1. **`tab_by_label` 匹配器对单字符标签过于宽松。** 在 `js/nac.js` 第 2264 行修复，双向部分匹配要求 `cand.length >= 3`，精确相等始终允许。由 Stage 2 测试 B4 发现（未知标签被错误匹配通过）。

2. **`NAC.list_registered_plugins()` 内省辅助函数缺失。** 已在 `js/nac.js` 中添加，供 interop 层的 `export_tree` 在不依赖 DOM 挂载状态的情况下遍历已注册的 manifest。在编写 v23 interop 套件时发现。

两者都有实际价值 —— 测试从运行时中揪出了真实 bug，这正是测试的意义所在。

## 合并到 main 前仍需完成的工作

| 任务 | 优先级 | 工作量 |
|------|----------|--------|
| 对 6 个线上 demo 运行 Playwright e2e | 高 | 1 小时 |
| 对 React + Angular 案例（开发服务器）运行 Playwright | 高 | 30 分钟 |
| TTS 语料库生成（Google Cloud，30 个提示词） | 中 | 20 分钟 |
| STT mock + 语料库注入测试 | 中 | 30 分钟 |
| `drag_drop` 单元测试 | 低 | 10 分钟 |
| 长尾 ack 事件族测试（breadcrumb、accordion、step 等） | 低 | 30 分钟 |
| Cherry-pick `yujin.app/nac-spec/demos/` + 落地页到 main | 阻塞项 | 2 分钟 |
| 邮件切换至 Pablo | 阻塞项 | 5 分钟 |

预计剩余工作量：**~3 小时（Sumi 时间）**，可将加权平均覆盖率提升至 >= 90% 并完成干净的 cherry-pick 到 main。

## 测试执行时间（笔记本，冷启动）

| 套件 | 耗时 |
|-------|------|
| smoke | < 1s |
| v22 | < 1s |
| v23-interop | < 2s |
| stage2 | < 1s |
| stage3（实时后端） | ~60s（15 个提示词 × 平均 ~4s + 500ms 间隔） |
| stage4 | ~2s（模态框 + dt 初始化） |
| stage6 | < 1s |
| **合计** | **~75s** |

`tools/nac/test-launch.sh`（测试运行器）需扩展以包含 stage 2-6 + interop；待处理。

## 审计追踪

| 提交 | 内容 |
|--------|---------|
| `5b06ae3f` | demo 编译 + 部署 + stage 2 |
| `632aa1f6` | stage 2+4 + 落地页用例 |
| （待提交） | stage 3+6 + 本报告 |

---

*本文档是 v2.3 interop 分支及截至 2026-05-11 00:50 UTC-3 的 v2.2 运行时的权威覆盖率记录。新套件发布后将持续更新。*

---

*This is a machine translation of the canonical English
version at `/nac-spec/docs/COVERAGE_REPORT_2026_05_10.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
