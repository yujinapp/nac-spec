---
translation_source: docs/ACCESSIBILITY.md
translation_source_hash: 615f9c5a447d95c7aee985d926f7b29377bed44dc959fd07a966fd41fa86a03b
translation_quality: machine_v1
translation_lang: zh
translation_date: 2026-05-11T15:11:10.197122+00:00
---

# NAC3 -- 无障碍承诺

**规范版本：** 2.2 稳定版（+ v2.3 互操作预览）。
**最后审阅：** 2026-05-11。

NAC3 的设计目标是让 Web UI 可被机器寻址。使 UI 可被 AI 智能体导航的特性，同样使其可被屏幕阅读器、开关设备、眼动追踪仪和语音用户导航。NAC3 在构造上就是一个无障碍原语——Yujin 承诺始终保持这一特性。

---

## 承诺内容

1. **WCAG 2.1 Level AA** 合规是所有基于 NAC3 构建的 Yujin 产品的最低标准（`yujin-pilot`、`yujin-forge`、yujin.app/nac-spec/ 的参考演示，以及 yujin.app/registry）。
2. **在可行的情况下达到 AAA 级**，适用于无障碍访问最为关键的界面：聊天面板、语音激活、首次运行引导、错误提示。
3. **不提供单独的"无障碍版本"**。无障碍功能随主产品发布，价格相同，发布节奏相同。单独版本会给用户贴标签，且会逐渐腐化。
4. **不存在"以后再做无障碍"**。每次发布都以 [HUMAN_OK_CHECKLIST.md](HUMAN_OK_CHECKLIST.md) 第 8.6 节中记录的无障碍检查项以及新增的屏幕阅读器冒烟测试章节（Track G7）作为发布门控。

---

## 支持的辅助技术

参考实现已针对以下辅助技术进行测试：

| AT 类别 | 已验证工具 |
|---------|-----------|
| 屏幕阅读器 | NVDA（Windows）、JAWS（Windows）、VoiceOver（macOS、iOS） |
| 语音控制 | Yujin Pilot、Apple Voice Control、Windows Speech Recognition、Dragon NaturallySpeaking |
| 开关访问 | iOS Switch Control、Android Switch Access |
| 眼动追踪 | Tobii Dynavox |
| 放大功能 | 浏览器缩放至 200%、ZoomText、macOS Zoom |
| 纯键盘操作 | 完整键盘导航、可见焦点、无时间限制 |

任何使用标准无障碍树（ARIA、accessibilityRole、accessibilityLabel）的 AT 都能从 NAC3 中受益，因为 NAC3 元素携带了与 AT 层相同的语义信息。

---

## NAC3 对无障碍的贡献（机制说明）

- **稳定标识符（`data-nac-id`）**：屏幕阅读器和开关访问不依赖视觉位置。该标识符在界面重新设计后仍然有效，AT 用户的操作习惯也因此得以保留。
- **规范角色（`data-nac-role`）**：角色枚举（action、field、tab 等）与 ARIA 角色一一对应。AT 用户能听到语义正确的播报。
- **清单动词（`label_i18n`）**：每个操作都有 10 种语言的本地化标签。语音控制用户说出动词，清单即可解析。
- **确定性确认事件（`nac:action:succeeded`）**：AT 用户能听到操作已完成的确认，而非依赖 UI 动画进行猜测。
- **严格验证（v2.2）**：在清单与 DOM 之间的偏差到达 AT 用户之前即予以捕获。

---

## NAC3 不解决的问题

- **原生 iOS/Android 应用**：v2.2 规范仅覆盖 Web + WebView。原生移动端已列入 v3.0 路线图。
- **视觉呈现**：NAC3 是结构性的。对比度、字体大小、焦点指示器由具体实现负责（Yujin 的设计令牌在参考实现中已覆盖这些内容）。
- **复杂流程的认知负担**：NAC3 的 id 无法让设计糟糕的工作流变得简单。良好的信息架构和简明的文案才能做到。
- **多媒体字幕**：音视频资源的字幕须由发布者提供。NAC3 提供钩子，但不提供内容。

---

## 报告无障碍问题

发送邮件至 `accessibility@yujin.app`（或转发至维护者的邮箱）。响应 SLA：5 个工作日内完成分类，修复时间不设 SLA，因为每个案例情况不同。问题在 `nac-spec` 仓库中以 `a11y` 标签公开追踪。

对于涉及安全的问题（例如 AT 绕过确认对话框），请遵循 `SECURITY.md`。

---

## 路线图

| Track | 描述 | 目标节点 |
|-------|------|---------|
| G1 | WCAG 2.1 AA 审计 + 修复（Forge + Pilot UI） | Forge/Pilot v1 发布前 |
| G2 | 语音优先设置向导（Forge + Pilot 首次运行） | Forge/Pilot v1 |
| G3 | 每个文档页面符合 NAC3 规范 | NAC3 v2.2 发布 |
| G4 | 每篇指南的音频版本（.mp3） | NAC3 v2.3 |
| G5 | yujin.app/learn 的对话式教程 | NAC3 v2.3 |
| G6 | 关键指南的简明语言平行版本 | NAC3 v2.3 |
| G7 | HUMAN_OK_CHECKLIST 中的屏幕阅读器冒烟测试 | NAC3 v2.2 发布 |
| G8 | 真实残障用户 Beta 计划 | Forge/Pilot v1 发布前 |
| G9 | 本声明公开发布并在每个页面添加链接 | NAC3 v2.2 发布 |
| G10 | 外部认证审计 | Forge/Pilot 1.0 商业版发布前 |

---

## 为何公开发布本声明

除道德层面外，还有两个实际原因：

1. **欧盟无障碍法案（EAA）** 已于 2025 年 6 月对 B2C 服务正式生效。使用 Forge 构建的应用默认符合 NAC3 规范，在 EAA 合规方面比竞争对手更具优势。
2. **美国 ADA 第三章针对 Web 应用的诉讼**同比增长 320%。企业买家对此高度关注。NAC3 + Yujin 的合规态势有助于降低其法律风险。

NAC3 不是"将无障碍作为附加功能的开放标准"。NAC3 是"唯一在构造上原生支持无障碍的通用 Web 自动化契约"。我们将始终坚守这一定位。

---

## 另请参阅

- [SPEC.md](../SPEC.md) -- 规范契约。
- [HUMAN_OK_CHECKLIST.md](HUMAN_OK_CHECKLIST.md) -- 包含屏幕阅读器冒烟测试章节。
- [SECURITY.md](../SECURITY.md) -- 安全模型，包含 AT 相关内容。

## 许可证

本文档采用 Apache-2.0 许可证。其所承诺的实现分别采用 MIT（运行时）/ Apache-2.0（规范）/ 专有许可证（Forge、Pilot）。

---

*This is a machine translation of the canonical English
version at `/nac-spec/docs/ACCESSIBILITY.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
