---
translation_source: docs/NAC_LAUNCH_DIFFUSION.md
translation_source_hash: cbdf7b9e5ec3ed43a39111aab16fbe59c222a05a835429ea43148036320fc5cf
translation_quality: machine_v1
translation_lang: zh
translation_date: 2026-05-11T15:23:23.559860+00:00
---

# NAC3 发布扩散计划

面向应当使用 NAC3 的人群的实用推广手册。本文撰写于 2026-05-10，适用于 v2.2 / v2.3-preview 发布。

## 我们发布了什么

- **规范：** v2.2 稳定版，v2.3 预览版（字段编辑器原语）。
- **运行时：** `@nac3/runtime@2.2.0` 发布至 npm（ESM + CJS + d.ts + CLI）。
- **演示：** yujin.app/nac-spec/ 上的四个在线演示。
- **采用指南：** React + Angular + LLM 接入。
- **案例研究：** `packages/nac-react-demo` + `packages/nac-angular-demo` 中可运行的 Vite + React 18 和 Angular 17 应用。
- **棕地迁移故事：** Yujin CRM 本身，记录于 pkuschnirof/yujin docs/MIGRATION_FROM_RPAFORCE.md。
- **NAC-3 合规性：** 落地页本身符合 NAC-3 规范（manifest + chat + autopilot + isTrusted 感知）。

## 核心信息

### 一句话介绍

> **NAC3 —— 一个小型公开规范，让 Web UI 无需为每个应用单独编写胶水代码，即可被 AI 智能体、语音运行器和无障碍工具驱动。**

### 三句话介绍

> NAC3 是 ARIA 在 2026 年以 LLM 为核心重新设计后本该有的样子。只需用三个 HTML 属性装饰你现有的 UI；运行时负责解析名称、分发点击、发出完成事件、处理本地化并提供来源证明。Apache-2.0 授权，npm install 即用，无需修改构建步骤。

### 30 秒推介

> 语音助手、LLM 聊天智能体和无障碍工具都面临同一个问题：它们需要稳定的名称来标识想要操作的元素。CSS 选择器会失效，ARIA 只能告诉你"这是一个按钮"，每个团队都在从头搭建同样的基础设施。
>
> NAC3 就是解决这个问题的小型契约。你只需在智能体应驱动的元素上添加 `data-nac-id`、`data-nac-role`、`data-nac-action`；运行时负责处理其余一切。目前已有可用的 v2.2 规范、稳定的 npm 包、React + Angular 指南，以及四个在线演示，其中一个端到端接入了 Claude Sonnet 聊天后端，现在就可以与之对话。
>
> 采用 Apache-2.0 授权。我们是因为运营一个 CRM 需要它才做出来的，现在你也可以使用。

## 目标受众

| 受众 | 渠道 | 切入点 |
|------|------|--------|
| React + Vue + Svelte + Angular 开发者 | dev.to、Hashnode、r/javascript、r/webdev | "用 80 行代码让你现有的 React 应用支持语音驱动" |
| 语音与智能体构建者 | r/LocalLLaMA、r/ChatGPTCoding、智能体构建者 Discord 社区 | "语音应用用户侧一直缺失的那个标准" |
| 无障碍倡导者 | r/Accessibility、a11y 邮件列表、A11y 线下活动演讲者 | "以 LLM 为核心、在 2026 年重新设计的 ARIA" |
| 测试/QA 工程师 | r/qualityassurance、Selenium / Playwright 社区 | "能在 UI 重新设计后依然有效的稳定选择器" |
| HN | news.ycombinator.com | 标准 Show HN 帖子 |
| 技术负责人与 CTO | LinkedIn、Mastodon | "反正 12 个月后你也会加上它"的角度 |
| Yujin CRM 用户 | 直接邮件 + 产品内横幅 | "你的 CRM 已支持 NAC3；这对你意味着什么" |

## 渠道与示例帖子

### Show HN

- **标题：** `Show HN: NAC -- a small public spec that lets web UIs be driven by AI agents`
- **首句：** "We made this while building Yujin CRM and realised every team trying to ship voice/agent UI rebuilds the same plumbing."
- **正文：** 解释契约（3 个属性 + manifest + 事件），链接在线演示、规范、npm 包和 React 案例研究。控制在 200 字以内。评论区带来的关注往往多于长帖子本身。
- **发布日：** 美国时间周二或周三上午。避开周一和周五。
- **后续跟进：** 在评论区至少活跃 4 小时；回应每一个技术问题；不回应无意义的争论。

### r/javascript

- **标题：** `[Showoff] NAC: drive your React app with voice + chat using 3 HTML attributes`
- **正文：** 聚焦"React 开发者需要做什么"——使用 `guides/REACT.md` 中的代码示例，链接案例研究的 GitHub 目录。

### r/Accessibility

- **标题：** `NAC: a parallel layer to ARIA for AI-agent-driven UI`
- **正文：** 开门见山说明"这不是 ARIA 的替代品，而是它的兄弟"——无障碍社区对此有合理的保护意识。展示 `data-nac-role="action"` 与 `role="button"` 如何共存。

### dev.to

- **标题：** `Drive any web UI by voice with @nac3/runtime`
- **切入点：** React 案例研究仓库。内嵌聊天面板和 autopilot 导览的截图/GIF。
- **篇幅：** 1500-2000 字，分步骤讲解。

### Twitter / X

6 条推文的线程：

1. "我们刚发布了 NAC3 v2.2 —— 一个让 Web UI 可被 AI 智能体驱动的公开规范 + npm 包。Apache-2.0。（演示 GIF）"
2. "为什么做：每个构建语音/智能体 UX 的团队都在重复搭建同样的基础设施。CSS 选择器会失效，ARIA 不是为智能体设计的。我们需要一个小型契约。"
3. "有多小：每个元素只需 3 个 HTML 属性。（代码截图）"
4. "你能得到什么：稳定的名称、确定性的完成事件、开箱即用的 10 语言 i18n、通过 HMAC + isTrusted 实现的来源证明、自动校验。"
5. "在线演示：yujin.app/nac-spec —— 四个演示，其中一个接入了 Claude Sonnet 聊天后端，现在就可以与之对话。"
6. "React + Angular 采用指南 + 可运行案例研究：github.com/pkuschnirof/rpaforce-crm。规范：yujin.app/nac-spec/SPEC.md。"

### LinkedIn

长文帖子（约 600 字）。主打"反正 12 个月后你也会加上它"的角度，面向正在评估智能体策略的 CTO。附上 BPMN 风格 autopilot 导览的截图。

### Mastodon

转发 Twitter 线程，保持简洁。每张图片都附上 alt 文本（在这个平台上很重要）。

## 演示 GIF/视频计划

### GIF（15 秒，循环播放）

场景 1（4 秒）：用户在 React 演示的聊天输入框中输入"agrega tomar agua"。
场景 2（3 秒）：LLM 解析完成；待办事项被添加，并带有闪光高亮效果。
场景 3（4 秒）：用户点击"tour"；autopilot 遍历页面并进行旁白说明。
场景 4（4 秒）：用户按住麦克风，说"remove all done"，待办事项清空。

以 8MB MP4 + 4MB WebP 备用格式托管于
`yujin.app/nac-spec/assets/demo.{mp4,webp}`。用作 README 头图 GIF、OG 图片、Twitter 卡片和 dev.to 头图。

### 视频（90 秒，配音旁白）

发布至 YouTube + Vimeo。
- 0:00-0:10 —— 问题陈述（"语音与智能体需要稳定的名称"）。
- 0:10-0:25 —— 契约介绍（3 个属性）。
- 0:25-0:45 —— 采用演示（React 案例研究，新增 5 行代码）。
- 0:45-1:05 —— 通过聊天、语音和 autopilot 驱动。
- 1:05-1:20 —— Yujin CRM 棕地迁移示例。
- 1:20-1:30 —— "Apache-2.0，npm install @nac3/runtime，链接见下方。"

## 后续跟进节奏

| 时间 | 行动 |
|------|------|
| 第 0 天 | 发布 Show HN + r/javascript + Twitter 线程 + dev.to 文章。在评论区活跃 4-8 小时。 |
| 第 1 天 | 发布 LinkedIn 帖子。回应 dev.to 评论。将收到的易于解决的问题添加到 GitHub 待办列表。 |
| 第 3 天 | 发布 r/Accessibility 帖子 + Mastodon 转发。 |
| 第 7 天 | 发布"第一周回顾"博客文章：收到了哪些反馈、做了哪些改动、提交了哪些热门 GitHub issue。 |
| 第 14 天 | 向第 0 天参与互动的无障碍/智能体构建者发送私信："想聊聊吗？" |
| 第 30 天 | 发布 v2.2.x 补丁，包含社区最多请求的修复。发布公告："30 天教会了我们关于 NAC3 的什么"。 |
| 第 90 天 | NAC3 v2.3 发布（字段编辑器规范化，`STRICT_VALIDATION` 默认为 true）。新一轮小规模发布推广。 |

## 需要追踪的指标

- `@nac3/runtime` 的每周 npm 下载量。
- `pkuschnirof/rpaforce-crm` 和 `pkuschnirof/yujin` 的 GitHub star 数与 fork 数。
- yujin.app/nac-spec/ 演示页面的访问量（服务器访问日志）。
- 提交的 GitHub issue 数量（参与度的代理指标）。
- 上述各渠道的独立评论者数量。
- "Native Agent Contract"的搜索趋势（Google Trends）。

第 1 周目标：
- npm 下载量 200 次
- 两个仓库合计 GitHub star 100 个
- 演示页面访问量 5000 次
- 提交 issue / 讨论 10 条
- 1 篇外部人士自发撰写的博客文章

如果以上目标完成率低于 50%，说明信息传递需要改进；修改 LinkedIn + dev.to 帖子文案，在第 14 天再次尝试。

## 发布前检查清单（点击发布前）

- [ ] `npm publish @nac3/runtime@2.2.0` 完成（此步骤为**手动操作**，需要 owner 级别的 npm token）。
- [ ] 在全新的临时目录中执行 `npm install @nac3/runtime` 验证可用。
- [ ] 在线演示在 Chrome + Firefox + Safari 中加载无控制台报错。
- [ ] `validate_global({probe: true})` 在落地页返回 `[]`。
- [ ] 演示 GIF 在 dev.to + Twitter 预览卡片中正常渲染。
- [ ] `LICENSE`、`CONTRIBUTING`、`SECURITY` 文件均已就位。
- [ ] 至少有一个标记为"good first issue"的 GitHub issue，供第 1 天到来的贡献者有所参与。
- [ ] Pablo 已就位，准备好回应评论 4 小时。

## 非目标

我们**不会**做的事：

- 投放付费广告（至少等到第 4 周的指标出来之后再说）。
- 贬低 ARIA、Selenium、Playwright 或任何智能体厂商。NAC3 是补充性的，不是对抗性的。
- 在发布时承诺企业支持合同（等我们了解支持负载之后再说）。
- 开源洗白：代码确实是 Apache-2.0 授权，聊天后端参考实现也是。我们不把"核心"与"高级"功能分开作为护城河——我们的护城河是托管、LLM 额度和运维。

## 发布当天操作手册

由于 Pablo 独自运营，以下操作均有时间限制：

| 时间 | 行动 |
|------|------|
| 06:00（美国东部时间）| 最终冒烟测试：`npm test` + `npx @nac3/runtime validate yujin.app/nac-spec/` + 在无痕模式下打开所有演示。修复发现的问题。 |
| 09:00 | 发布 Show HN。 |
| 09:05 | 发布 Twitter 线程。 |
| 09:15 | 发布 r/javascript 帖子。 |
| 09:30 | 发布 dev.to 文章。 |
| 09:30-13:30 | 在 HN 评论区保持活跃。置顶一条包含快速链接的评论。 |
| 14:00 | 发布 LinkedIn 帖子。 |
| 14:00-18:00 | 在 dev.to 评论区和 Twitter 提及中保持活跃。 |
| 18:00 | 收工。放松休息。 |
| 第 1 天 09:00 | 发布 r/Accessibility + Mastodon 帖子。整理 GitHub issue。 |

---

*This is a machine translation of the canonical English
version at `/nac-spec/docs/NAC_LAUNCH_DIFFUSION.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
