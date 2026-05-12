---
translation_source: docs/HUMAN_OK_CHECKLIST.md
translation_source_hash: 2b87f1b0665762daf6be1ad520c7ba16f977d21771e6574ae60451039baada31
translation_quality: machine_v1
translation_lang: zh
translation_date: 2026-05-11T15:19:12.279484+00:00
---

# NAC3 -- 人工验收清单

**规范版本：** 2.2 + v2.3 预览版。
**最近执行日期：** 2026-05-11（每次发布后更新）。
**用途：** 本文档是
[TEST_COVERAGE_MATRIX.md](TEST_COVERAGE_MATRIX.md) 中 MAN 列的可执行形式。由人工逐项检查并勾选。任何一项未通过，该版本**不得发布**——请提交 bug 并修复后重新执行。

本文档**不能**替代自动化测试。在开始本清单之前，自动化测试套件（`bash tools/nac/test-launch.sh`）**必须**全部通过。本清单的存在是为了覆盖自动化无法检测的内容：真实音频、跨浏览器体验、母语者措辞、与真实对端的跨域握手、视觉细节。

---

## 使用说明

1. 打开全新的无痕窗口（依次使用 Chrome、Firefox、Safari，视觉相关章节需在每个浏览器中重复执行）。
2. 按顺序逐节检查——某些章节依赖前一章节已正常运行（例如互操作性测试需要两个 demo 均已加载）。
3. 仅在**亲自确认**后才勾选 `[ ]`。不得委托他人。如有疑问，标记 `[?]` 并咨询规范负责人。
4. 完成后，在 SIGN-OFF 区域签名并注明日期。
5. 提交文件时更新本次执行日期。

每次执行预计耗时：**45-60 分钟**。请勿仓促完成；本关卡的意义正在于覆盖自动化遗漏的部分。

---

## 1. 运行时产物

### 1.1 跨浏览器冒烟测试 -- `js/nac.js` + `nac-v2-extensions.js`

对每个浏览器（Chrome、Firefox、Safari）分别执行：

- [ ] 在无痕模式下打开 `https://yujin.app/nac-spec/example.php`。
- [ ] 等待 5 秒后，控制台无任何报错。
- [ ] 在控制台执行 `NAC.describe().plugins[0]`，返回一个对象。
- [ ] `NAC.list_registered_plugins()` 返回至少一个 slug。
- [ ] 点击一个带有 `data-nac-role="action"` 的按钮——按钮正常响应，且 `nac:action:succeeded` 事件触发（在控制台通过 `document.addEventListener` 监听验证）。

### 1.2 实时聊天客户端 -- `nac-chat-client.js`

- [ ] 在 `example-v21-data-table.php` 上，点击麦克风按钮。
- [ ] 说"ve a permisos"——聊天触发标签页切换，而非返回自由文本回复。
- [ ] 用英语（"go to permissions"）和葡萄牙语（"vai para permissoes"）重复上述操作——均能正确触发分发。
- [ ] 说"cambia de pestaña"——语言环境**不**切换为德语（V22-03 回归防护）。

### 1.3 互操作运行时 -- `nac-mcp-interop.js`

- [ ] 打开 `example-v22-interop.php`。
- [ ] 按顺序使用 4 个 CTA：导出树 -> 导入远程 -> 列出远程应用 -> 断开远程连接。
- [ ] 每个 CTA 均在其输出面板中记录成功信息。
- [ ] 断开连接后，远程应用不再出现在 `NAC.list_remote_apps()` 中。

---

## 2. NPM 包

### 2.1 全新安装冒烟测试

- [ ] 在临时目录中执行：
      ```
      mkdir /tmp/nac-smoke && cd /tmp/nac-smoke
      npm init -y
      npm install @nac3/runtime
      node -e "import('@nac3/runtime').then(m => console.log(Object.keys(m)))"
      ```
- [ ] 输出中包含 `NAC`、`registerPlugin` 及各验证器。
- [ ] 安装过程中无废弃警告。

### 2.2 对外部项目运行 CLI 验证器

- [ ] 选取任意一个非 Yujin 项目（采用案例中的 demo 或任意目录均可）。
- [ ] 在其根目录执行 `npx @nac3/runtime validate .`。
- [ ] 输出内容可读，列出 0 个 BLOCKER；无问题时退出码为 0，有发现时退出码非 0。

---

## 3. Demo 演示

### 3.1 首页 -- `index.html`

- [ ] 页面以 sumi-e 品牌风格渲染，无 FOUC（无样式内容闪烁）。
- [ ] 点击"Autopilot"——5 秒导览运行，旁白可听（TTS 语音，非静音）。
- [ ] 打开聊天，输入"que es NAC3?"——获得连贯的回复，无报错。

### 3.2 参考 demo -- `example.php`

- [ ] 逐一操作页面上可见的全部 27 个组件。
- [ ] 完整操作后控制台无报错。
- [ ] 无无响应组件（无点击后无任何反应的情况）。

### 3.3 棕地 demo -- `example-v20-full.php`

- [ ] 页面加载后，`v20-panel` 在右上角可见。
- [ ] 点击"describe_v2"——面板显示有效的 JSON 输出。
- [ ] 点击"validate_global_v2"——面板显示发现项（或"0 findings, OK"）。
- [ ] 依次点击 v20-panel 中的 6 个按钮——所有按钮均触发 `nac:action:succeeded`（附加监听器后在控制台可见）。
- [ ] istrusted_fake 按钮——确认事件**不**触发（运行时正确拒绝针对 isTrusted 门控动词的合成点击）。
- [ ] istrusted_real 按钮（真实人工点击）——确认事件**正常**触发。

### 3.4 原语展示 demo -- `example-v20-primitives-showcase.php`

- [ ] 8 个原语各自渲染一个包含可用示例的章节。
- [ ] 每个章节中的说明文字显示正确（无乱码或占位符残留）。

### 3.5 数据表格 demo -- `example-v21-data-table.php`

- [ ] 点击麦克风，说"agrega una linea con concepto leche cantidad 2 precio 100"——集合表格中出现一行新数据。
- [ ] 说"cuanto total hay?"——聊天回复一个数字，而非原始表格内容。
- [ ] 说"ve a permisos"——标签页切换。

### 3.6 互操作 demo -- `example-v22-interop.php`

- [ ] 已在 1.3 中覆盖。
- [ ] 附加项：在两个浏览器标签页中同时打开该页面，重复握手流程——应仍可正常工作（每个标签页是独立的 NAC 实例，互操作层作为桥接）。

### 3.7 React 案例研究 -- `demos/react/`

- [ ] 打开 `https://yujin.app/nac-spec/demos/react/`。
- [ ] 在文本框中输入"leche"，点击"Add"——待办事项出现。
- [ ] 打开聊天，通过麦克风说"agrega pan"——待办事项"pan"通过聊天驱动路径出现。此为案例研究 bug #2 的回归防护。
- [ ] 说"borra leche"——待办事项"leche"消失。

### 3.8 Angular 案例研究 -- `demos/angular/`

- [ ] 与 React 相同的 4 项检查，在 `/nac-spec/demos/angular/` 上执行。

---

## 4. 文档

以下每份文档，每季度发布时至少通读一遍。检查：

- 版本标记是否为当前版本（v2.2）。
- 无失效的内部链接。
- 无遗留的 TODO。
- 代码片段可按示例编译/运行。

- [ ] `SPEC.md`（规范合同）。
- [ ] `ABOUT.md`。
- [ ] `CONTRIBUTING.md`。
- [ ] `SECURITY.md`——另需每季度重新阅读威胁模型。
- [ ] `README_DEMOS.md`。
- [ ] `docs/NAC_V22_ROADMAP.md`。
- [ ] `docs/NAC_TEST_MANUAL.md`。
- [ ] `docs/NAC_INTEROP_MCP.md`。
- [ ] `docs/NAC_LAUNCH_DIFFUSION.md`。
- [ ] `docs/CASE_STUDIES_DISCOVERY.md`。
- [ ] `docs/TEST_COVERAGE_MATRIX.md`（本矩阵的关联文档）。
- [ ] `docs/VOICE_CHAT_ERROR_ANALYSIS_2026_05_09.md`。

---

## 5. 采用指南

对于每份指南，请验证 hello-world 代码片段仍可编译，且步骤能引导初次阅读者完成可用的安装：

- [ ] `guides/REACT.md` -- 代码片段在 Vite + React 18 上可编译。
- [ ] `guides/ANGULAR.md` -- 代码片段在 Angular 17 standalone 上可编译。
- [ ] `guides/LLM_WIRING.md` -- Node 参考后端可正常启动，示例契约测试通过。
- [ ] `guides/AI_PLAYBOOK_NEW_PROJECT.md` -- 步骤断言仍与运行时 API 匹配。
- [ ] `guides/AI_PLAYBOOK_MIGRATION.md` -- 同上。
- [ ] `guides/IMPACT_TESTING.md` -- 重新核对数据的时效性（每季度复查）。
- [ ] `guides/IMPACT_RPA.md` -- 同上。
- [ ] `guides/RPA_UIPATH.md` -- 运行一次 `InvoiceFromCSV.xaml` 示例（或最新版 UiPath Studio 中的等效示例）。
- [ ] `guides/RPA_AUTOMATION_ANYWHERE.md` -- 等效示例工作流。
- [ ] `guides/RPA_BLUE_PRISM.md` -- 等效示例对象研究。

---

## 6. 测试套件

- [ ] 运行 `bash tools/nac/test-launch.sh` -- 在 15 秒内全部通过（ALL GREEN）。
- [ ] 检查烟雾测试计数器（`36 PASS`）-- 与预期总数一致。
- [ ] 打开 `packages/nac/test/fixtures/voice/` -- 每个语言区域各选 1 个文件（共 10 个文件）-- 在音频播放器中播放 -- 确认清晰可辨。
- [ ] 从 `stage3-backend.mjs` 中随机抽查 2 条 LLM 提示词 -- 响应内容合理，无漂移现象。
- [ ] 使用 `--headed` 模式运行一次 Playwright 套件（`npx playwright test --headed`）-- 目视检查每个规格的 UI 运行情况。
- [ ] 运行 `bash tools/nac/discovery-loop.sh 1` -- 一轮完成，0 个发现项。

---

## 7. 案例研究包

- [ ] `packages/nac-react-demo/` 构建无误（`npm run build`）。
- [ ] 已部署的 React 发布版与本地构建行为完全一致。
- [ ] `packages/nac-angular-demo/` 构建无误。
- [ ] 已部署的 Angular 发布版与本地构建行为完全一致。

---

## 8. 横切关注点

### 8.1 i18n

- [ ] 选择一个语言区域（每次发布轮换）-- 发送给母语使用者对 10 条随机字符串进行抽查。
- [ ] 验证器确认所有 10 个语言区域中 0 个缺失键（`NAC.validate_global({locale: 'all'})`）。

### 8.2 HMAC + 溯源

- [ ] 对 staging 租户运行多租户烟雾测试 -- 清单签名验证通过，日志中无 `provenance_mismatch` 错误。

### 8.3 isTrusted 门控

- [ ] 在 `example-v20-full.php` 上，istrusted_real 与 istrusted_fake 并排测试（见上方 3.3）通过视觉差异对比：真实事件触发 ack，伪造事件不触发。

### 8.4 跨源互操作（v2.3 预览版）

- [ ] 在声明 v2.3 GA 之前，至少完成一次跨源测试：打开互操作演示，连接托管在不同源上的远程 NAC3 对等节点，使用真实 bearer token 和真实 CORS 预检请求，确认往返成功。

### 8.5 部署

- [ ] 发布推送后，curl 以下 URL 并确认返回 200 及正确内容：
      - `https://yujin.app/nac-spec/index.html`
      - `https://yujin.app/nac-spec/SPEC.md`
      - `https://yujin.app/nac-spec/js/nac.js`
      - `https://yujin.app/nac-spec/js/nac-chat-client.js`
      - `https://yujin.app/nac-spec/example.php`
      - `https://yujin.app/nac-spec/example-v21-data-table.php`
      - `https://yujin.app/nac-spec/example-v22-interop.php`
      - `https://yujin.app/nac-spec/demos/react/`
      - `https://yujin.app/nac-spec/demos/angular/`

### 8.6 真实音频

- [ ] 使用真实硬件（笔记本麦克风 + 扬声器）-- 在线上 `example-v21-data-table.php` 中按下麦克风按钮，每个语言区域各说一条提示词（共 10 条）-- 确认每个语言区域的 LLM 调度结果均合理。

---

## 9. 屏幕阅读器测试（无障碍访问 -- Track G7）

本节在关闭显示器（或闭眼）的情况下，使用屏幕阅读器对演示进行完整走查。这是
[ACCESSIBILITY.md](ACCESSIBILITY.md) 中无障碍访问承诺的准入门槛。

每次发布至少在**两款**屏幕阅读器上完成本节测试（NVDA 是 Windows 上最易上手的免费选项；VoiceOver 预装于 macOS；如有授权可使用 JAWS）。

### 9.1 NVDA（Windows）

- [ ] 安装 NVDA（免费，nvaccess.org）。使用 Ctrl+Alt+N 启动。
- [ ] 关闭显示器（或闭眼）打开 `https://yujin.app/nac-spec/index.html`。
- [ ] 使用 H 键导航时，NVDA 播报页面标题及标题层级结构（h1、h2、h3）。
- [ ] Tab 键按逻辑顺序到达每个可交互控件；每个控件清晰播报其角色和标签。
- [ ] 打开聊天面板（NVDA 读出聊天输入框的 role=textbox 及清晰标签）。
- [ ] 输入"que es NAC3?"并发送 -- 响应到达时 NVDA 完整朗读内容。

### 9.2 NVDA 在 `example-v21-data-table.php` 上的测试

- [ ] NVDA 在 Tab 导航时播报"Lines（集合）标签页"及"权限"标签页。
- [ ] 激活标签页时，通过 `nac:tab:activated` 事件 ack 播报新状态。
- [ ] LLM 新增行时，NVDA 自动（或按一次向下箭头后）朗读新行内容。

### 9.3 VoiceOver（macOS）

- [ ] 按 Cmd+F5 启动 VoiceOver。
- [ ] 打开 `https://yujin.app/nac-spec/index.html`。
- [ ] VO+U 打开转子；确认标题、链接、表单控件均已填充。
- [ ] VO+A 从头到尾朗读整个页面 -- 语义清晰，而非"div div div link link button"。

### 9.4 VoiceOver 在 React + Angular 案例研究中的测试

- [ ] 在 `demos/react/` 上：仅使用键盘 + VoiceOver 通过输入框添加一条待办事项。添加后新待办事项被播报（ack 事件已接入）。
- [ ] 在 `demos/angular/` 上：相同测试，相同预期。

### 9.5 纯键盘导航（无屏幕阅读器，仅禁用鼠标）

- [ ] 断开/禁用鼠标。
- [ ] 仅使用 Tab 键浏览落地页。每个焦点停留点均可见（焦点环存在）。
- [ ] 通过键盘打开聊天面板，输入提示词并提交。结果正确朗读/显示。
- [ ] Escape 键可关闭已打开的任何模态框。
- [ ] 无键盘陷阱（Tab 最终可循环回到页面顶部）。

### 9.6 高对比度 + 200% 缩放

- [ ] 将落地页浏览器缩放至 200%。布局不破坏，无横向滚动，无文字重叠。
- [ ] 启用 Windows 高对比度模式（或 macOS 增强对比度）。按钮、链接、焦点环保持可见。

### 9.7 语音控制（递归场景）

- [ ] 在已安装 Pilot 的浏览器（或使用参考实现 `nac-chat-client.js` 麦克风按钮）中，仅通过语音控制演示。
- [ ] 麦克风按钮向 NVDA/VoiceOver 播报其状态（"录音已开始"、"录音已停止"）。
- [ ] 通过 NAC3 分发的语音指令生效；ack 被播报给屏幕阅读器。

### 9.8 发现的无障碍访问问题

在此列出本节发现的所有问题及其严重程度：

```
-
-
-
```

如有任何 BLOCKER 级别的问题未解决，该版本不得发布。

---

## 签署确认

```
发布标签：    v____._.___
走查人：      ______________________
走查日期：    ____-____-____
使用浏览器：  [ ] Chrome  [ ] Firefox  [ ] Safari
咨询的母语使用者（语言区域 -> 姓名）：
   ____________________________________________
已走查项目总数：  ___ / ___
失败项目（附 bug 链接）：
   ____________________________________________
   ____________________________________________
签名：        ______________________
```

填写完签署确认块后提交本文件，以标记该版本为"人工确认通过"。

---

## 另请参阅

- [TEST_COVERAGE_MATRIX.md](TEST_COVERAGE_MATRIX.md) -- 本检查清单所依据的矩阵。
- [NAC_TEST_MANUAL.md](NAC_TEST_MANUAL.md) -- 面向采用者的上游操作手册。
- [COVERAGE_REPORT_2026_05_10.md](COVERAGE_REPORT_2026_05_10.md) -- 当前版本的自动覆盖率记录。

## 许可证

Apache-2.0。

---

*This is a machine translation of the canonical English
version at `/nac-spec/docs/HUMAN_OK_CHECKLIST.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
