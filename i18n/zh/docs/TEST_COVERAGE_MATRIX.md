---
translation_source: docs/TEST_COVERAGE_MATRIX.md
translation_source_hash: 378d7bf89e65b07e54f5d5dc1c62938accfe383e903468a4df028a3e2936f48d
translation_quality: machine_v1
translation_lang: zh
translation_date: 2026-05-11T15:17:46.543073+00:00
---

# NAC3 -- 测试覆盖矩阵（自动化 + 手动）

**规范版本：** 2.2 + v2.3 预览版。
**生成日期：** 2026-05-11。
**权威来源：** Yujin 参考仓库
`yujinapp/nac-spec` 的 `main` 分支。

本矩阵列出 NAC3 生态系统中的**所有**制品，并报告其自动化测试覆盖情况及手动验证关卡（"人工确认"检查清单）。

采用者：可将本矩阵结构复制到自己的应用中。将列替换为你的制品，保持相同的行深度。

---

## 图例

| 符号 | 含义 |
|--------|---------|
| AUTO | 已由自动化测试覆盖（Playwright / Node 端测试套件） |
| MAN  | 需要人工验证（浏览器视觉检查、语音手势、主观 UX） |
| BOTH | 不变量由自动化覆盖 + UX 由人工验证 |
| --   | 无覆盖计划（有意为之） |
| TBD  | 已计划覆盖但尚未实现 |

---

## 1. 运行时制品

| 制品 | 自动化覆盖 | 手动关卡 | 备注 |
|----------|---------------|-------------|-------|
| `js/nac.js`（v1.9 基础版 + v2.0 + v2.1） | AUTO 95% | MAN（跨浏览器冒烟测试） | smoke + v22 + stage4 覆盖写入 API；手动 = 每次发布至少在 Firefox + Safari 中打开一次 |
| `js/nac-v2-extensions.js` | AUTO 90% | MAN（在全新 DOM 上测试 autoRegister.watch） | stage4 dt_* + v22 部分覆盖；手动 = 通过 autoRegister 在运行时挂载新插件 |
| `js/nac-chat-client.js` | AUTO 95% | MAN（真实麦克风 STT） | stage1-audio 模拟 SpeechRecognition；手动 = 在线演示中按下麦克风按钮，每个语言环境说一条提示 |
| `js/nac-mcp-interop.js`（v2.3 预览版） | AUTO 100% | MAN（跨域对等节点往返测试） | v23-interop 覆盖本地页面场景；手动 = 通过 HTTPS 对真实远程 NAC3 对等节点进行测试 |

## 2. NPM 包

| 制品 | 自动化覆盖 | 手动关卡 | 备注 |
|----------|---------------|-------------|-------|
| `@nac3/runtime` 构建产物（dist/ ESM + CJS + d.ts + CLI） | AUTO 100% | MAN（在全新目录中执行 `npm install`） | smoke.mjs 36 项检查；手动 = npm pack + install + 在空 Node 项目中 import 以验证 |
| `@nac3/runtime/extensions` 子路径 | AUTO 100% | -- | smoke 确认文件及 d.ts 存在 |
| `@nac3/runtime/chat-client` 子路径 | AUTO 100% | -- | smoke 确认文件及 d.ts 存在 |
| CLI `npx @nac3/runtime validate` | AUTO 100% | MAN（对团队外部构建的项目运行） | smoke 对 demos 目录运行 CLI；手动 = 在客户发布前对其自有仓库运行 |

## 3. 演示（线上地址：yujin.app/nac-spec/）

| 演示 | 自动化覆盖 | 手动关卡 | 备注 |
|------|---------------|-------------|-------|
| `index.html`（首页） | BOTH | MAN（自动驾驶导览 + 聊天发送） | Playwright 01-landing.spec.ts 验证界面；手动 = 在真实浏览器中运行自动驾驶，确认旁白可听 |
| `example.php`（v1.9 参考实现） | AUTO | MAN（27 个控件点击测试） | Playwright 02-demo-v19 启动检查；手动 = 逐一操作全部 27 个控件，无控制台报错 |
| `example-v20-full.php`（棕地改造） | AUTO | MAN（v20 面板 describe_v2 / validate_global_v2 按钮） | Playwright 03-demo-v20 覆盖面板 + bindAction 确认；手动 = 点击每个面板按钮并检查输出 |
| `example-v20-primitives-showcase.php` | -- | MAN（按原语逐一教学演示） | 纯教学演示；手动 = 8 个原语的导览 |
| `example-v21-data-table.php` | AUTO | MAN（使用麦克风语音聊天） | Playwright 04-demo-v21 覆盖 dt_state + tab.permissions；手动 = 使用语音麦克风，观察 LLM 是否正确分发 |
| `example-v22-interop.php`（v2.3 预览版） | AUTO | MAN（按顺序使用 4 个 CTA） | Playwright 05-demo-v22-interop 端到端；手动 = 眼睛盯屏幕完成 4 按钮流程 |
| `demos/react/`（编译后的学习案例） | AUTO | MAN（聊天驱动的添加/删除） | Playwright 06-demo-react 覆盖挂载 + 添加；手动 = 通过真实麦克风发送聊天"agrega leche"，观察 React 状态更新 |
| `demos/angular/`（编译后的学习案例） | AUTO | MAN（聊天驱动的添加/删除） | Playwright 07-demo-angular 覆盖挂载 + 添加；手动 = 同 React |

## 4. 文档

| 文档 | 自动化覆盖 | 手动关卡 | 备注 |
|-----|---------------|-------------|-------|
| `SPEC.md`（v2.2 规范版） | -- | MAN（由维护者进行 PR 审查） | 规范为散文，无法自动测试。人工逐字审查 |
| `ABOUT.md` | -- | MAN（PR 审查） | 同上 |
| `CONTRIBUTING.md` | -- | MAN（PR 审查） | 同上 |
| `SECURITY.md` | -- | MAN（PR 审查） | 同上。另加每季度威胁模型重读 |
| `README_DEMOS.md` | -- | MAN | 手动链接检查 |
| `docs/NAC_V22_ROADMAP.md` | -- | MAN | 每次发布时更新并审查 |
| `docs/NAC_TEST_MANUAL.md` | AUTO（链接） | MAN（PR 审查） | test-launch.sh 第 3 层验证全部 11 份文档存在；手动 = 阅读以确认准确性 |
| `docs/COVERAGE_REPORT_2026_05_10.md` | -- | MAN（每次发布重新生成） | 本文件本身即覆盖记录；由人工在每次发布时编写 |
| `docs/NAC_INTEROP_MCP.md` | -- | MAN | 规范提案，人工审查 |
| `docs/NAC_LAUNCH_DIFFUSION.md` | -- | MAN | 内部操作手册 |
| `docs/CASE_STUDIES_DISCOVERY.md` | -- | MAN | Bug 事后分析；人工整理 |
| `docs/LAUNCH_PLAN_2026_05_10.md` | -- | MAN（历史记录） | 历史记录 |
| `docs/TEST_COVERAGE_MATRIX.md`（本文件） | AUTO（链接） | MAN | 每次发布时更新 |
| `docs/VOICE_CHAT_ERROR_ANALYSIS_2026_05_09.md` | -- | MAN | 历史 Bug 分析 |
| `docs/HUMAN_OK_CHECKLIST.md` | -- | MAN（由 Pablo 执行） | 检查清单本身；由 Pablo 执行 |

## 5. 采用指南

| 指南 | 自动化覆盖 | 手动关卡 | 备注 |
|-------|---------------|-------------|-------|
| `guides/REACT.md` | -- | MAN（PR 审查 + 采用者反馈） | Hello-world 代码片段应仍可编译；手动 = 每年重新构建检查 |
| `guides/ANGULAR.md` | -- | MAN（PR 审查） | 同上 |
| `guides/LLM_WIRING.md` | -- | MAN（PR 审查） | 参考 Node 后端可运行；手动 = 对线上规范运行 |
| `guides/AI_PLAYBOOK_NEW_PROJECT.md` | -- | MAN（PR 审查） | 步骤断言应保持可执行 |
| `guides/AI_PLAYBOOK_MIGRATION.md` | -- | MAN（PR 审查） | 同上 |
| `guides/IMPACT_TESTING.md` | -- | MAN（PR 审查） | 影响力声明；每季度更新数据 |
| `guides/IMPACT_RPA.md` | -- | MAN（PR 审查） | 同上 |
| `guides/RPA_UIPATH.md` | -- | MAN（每次发布运行一次示例工作流） | 手动 = 执行 InvoiceFromCSV.xaml |
| `guides/RPA_AUTOMATION_ANYWHERE.md` | -- | MAN | 同上 |
| `guides/RPA_BLUE_PRISM.md` | -- | MAN | 同上 |
| `guides/RPA_PLAYWRIGHT.md` | AUTO（参考套件） | MAN（PR 审查） | 模式由 `tests/e2e-nac/specs/` 验证；手动 = 每次发布阅读一次 |

## 6. 测试套件

| 套件 | 自动化覆盖 | 手动关卡 | 备注 |
|-------|---------------|-------------|-------|
| `packages/nac/test/smoke.mjs` | AUTO（自身） | MAN（审查通过率） | 36 项检查；手动 = 每次发布查看一次计数 |
| `packages/nac/test/v22.mjs` | AUTO（自身） | -- | 14 个单元测试 |
| `packages/nac/test/v23-interop.mjs` | AUTO（自身） | -- | 14 个单元测试 |
| `packages/nac/test/stage1-audio.mjs` | AUTO（自身） | MAN（每个语言环境重新生成语料库） | 33 项检查；手动 = 收听部分 TTS 语料库，确认可听 |
| `packages/nac/test/stage2-disambiguation.mjs` | AUTO（自身） | -- | 31 项检查 |
| `packages/nac/test/stage3-backend.mjs` | AUTO（自身，线上） | MAN（审查 LLM 响应） | 45 条提示 × 10 个语言环境；手动 = 随机抽查 2 条提示，确认 LLM 未发生漂移 |
| `packages/nac/test/stage4-calls.mjs` | AUTO（自身） | -- | 31 项检查 |
| `packages/nac/test/stage6-ack.mjs` | AUTO（自身） | -- | 16 项检查 |
| `packages/nac/test/stage6b-longtail.mjs` | AUTO（自身） | -- | 14 项检查 |
| `tests/e2e-nac/specs/*.spec.ts` | AUTO（自身） | MAN（每次发布以有头模式进行视觉审查） | 16 个规格；手动 = 使用 `--headed` 运行一次以目视检查 |
| TTS 语料库（30 个 MP3 文件） | AUTO（存在性 + 大小） | MAN（每个语言环境收听 1 个） | 手动 = 抽样 10 个文件，确认可听、无乱码 |
| `tools/nac/test-launch.sh` | AUTO（自身） | -- | 编排器 |
| `tools/nac/discovery-loop.sh` | AUTO（自身） | -- | 发现 + 修复循环 |

## 7. 学习案例包

| 包 | 自动化覆盖 | 手动关卡 | 备注 |
|---------|---------------|-------------|-------|
| `packages/nac-react-demo/` 源码 | AUTO（构建 + Playwright） | MAN（对已部署的 dist 进行视觉检查） | Vite 构建干净；Playwright 覆盖 todos + chat + autopilot |
| `packages/nac-react-demo/` 已部署 dist | AUTO | MAN（在无痕模式下打开并操作） | 手动 = 在 /demos/react/ 进行人工演练 |
| `packages/nac-angular-demo/` 源码 | AUTO | MAN | 同上 |
| `packages/nac-angular-demo/` 已部署 dist | AUTO | MAN | 同上 |

## 8. 横切关注点

| 关注点 | 自动化覆盖 | 手动关卡 | 备注 |
|---------|---------------|-------------|-------|
| i18n 目录完整性 | AUTO（验证器） | MAN（每个语言环境由母语者审查） | 严格模式验证器标记缺失键；母语者抽查字符串是否符合文化语境 |
| HMAC 清单签名 | AUTO（单元） | MAN（多租户部署冒烟测试） | 单元测试执行签名 + 验证；手动 = 对密钥分发流程进行生产冒烟测试 |
| isTrusted 门控 | AUTO（单元） | MAN（真实点击与合成点击并排对比） | v22 单元覆盖该标志；手动 = 在 example-v20-full.php 上使用 istrusted_real / istrusted_fake 按钮对 |
| 跨域互操作（v2.3） | AUTO（模拟） | MAN（使用真实 bearer token 的真实对等节点） | v23-interop 使用页内模拟；手动 = 在宣布 v2.3 GA 前至少进行一次跨域测试 |
| 部署至 yujin.app | AUTO（推送 -> 自动部署） | MAN（验证 URL 返回 200 及正确内容） | GoDaddy 自动部署；手动 = 每次推送 main 后 curl 所有关键 URL |
| 真实浏览器音频播放 | -- | MAN（麦克风 + 扬声器测试） | Web Speech API 需要真实硬件；手动 = 在线上 v21 演示中按下麦克风，每个语言环境说一条提示 |

## 汇总 -- 按类别加权覆盖情况

| 类别 | AUTO | MAN | BOTH | 覆盖健康度 |
|----------|------|-----|------|-----------------|
| 运行时制品 | 4 | 0 | 0 | 优秀（平均自动化 95%） |
| NPM 包 | 4 | 0 | 0 | 优秀（自动化 100%） |
| 演示 | 6 | 1 | 1 | 良好（不变量自动化，UX 手动） |
| 文档 | 1 | 14 | 0 | 符合预期（文档审查而非单元测试） |
| 采用指南 | 0 | 10 | 0 | 符合预期 |
| 测试套件 | 13 | 4 | 0 | 优秀 |
| 学习案例包 | 2 | 2 | 0 | 良好（自动化 + 手动视觉） |
| 横切关注点 | 4 | 2 | 0 | 良好 |
| **合计** | **34** | **33** | **1** | **优秀** |

## 如何使用本矩阵

### 每次发布时

1. 标记规范版本 + 参考套件版本。
2. 运行 `bash tools/nac/test-launch.sh` —— 所有 AUTO 行均为门控。
3. 逐一完成 MAN 列 —— [Human OK 检查清单](HUMAN_OK_CHECKLIST.md) 是其可执行形式。
4. 将运行结果更新至 COVERAGE_REPORT_<date>.md。
5. 如制品范围发生变化，相应调整本矩阵。

### 对于采用者

将本矩阵结构复制到自己的应用中。替换制品名称，保持相同结构。规范是一致的：每个制品都需要明确的自动化 + 手动关卡。

### 反模式

如果测试仅检查文件是否存在，**不要**将制品标记为"AUTO"。AUTO 意味着测试验证了行为。文件存在性检查归属于测试框架（test-launch.sh），而非制品矩阵。

## 另请参阅

- [NAC_TEST_MANUAL.md](NAC_TEST_MANUAL.md) —— 本矩阵所依据的操作手册。
- [HUMAN_OK_CHECKLIST.md](HUMAN_OK_CHECKLIST.md) —— MAN 列的可执行形式。
- [COVERAGE_REPORT_2026_05_10.md](COVERAGE_REPORT_2026_05_10.md)
  —— 当前版本的实际运行结果。

## 许可证

Apache-2.0。

---

*This is a machine translation of the canonical English
version at `/nac-spec/docs/TEST_COVERAGE_MATRIX.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
