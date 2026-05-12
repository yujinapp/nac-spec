---
translation_source: ABOUT.md
translation_source_hash: 4ab5d9a2ad96ee42811299474895d9836adc1ca93ea37726806f190f59646484
translation_quality: machine_v1
translation_lang: zh
translation_date: 2026-05-11T13:07:51.099872+00:00
---

# 关于 NAC3

**规范版本：** 2.2 稳定版（+ v2.3 互操作预览）。

**NAC3** = **Native Agent Contract**。

这是一个小型公开规范，让 Web UI 能够被 AI 智能体、语音运行器和无障碍工具以人类的方式驱动：点击、输入、读取——但使用机器可以解析的名称、机器可以等待的事件，以及能够区分真实用户与合成调用方的来源追踪机制。

NAC3 与 ARIA 并列，而非建立在其之上。ARIA 标准化了**无障碍树**，使屏幕阅读器和开关设备能够操作视力正常用户所见的同一套 UI；NAC3 则标准化了**智能体树**，使语音命令、LLM 中间层或 RPA 机器人无需针对每个应用编写胶水代码，即可完成同样的操作。

## 你需要编写的内容

少量 HTML 属性（`data-nac-id`、`data-nac-role`、`data-nac-action`、`data-nac-plugin`），以及一个可选的 JS 清单，用于声明页面上的元素及其支持的操作动词。运行时负责将名称解析为元素并向其分发指令。

## 你将获得的能力

- 页面能够响应来自任意调用方的 `NAC.click('deals.create')`——无论是语音运行器、Playwright 测试、LLM 中间层、键盘宏，还是无障碍工具。
- 页面会发出确定性的事件族（`nac:action:succeeded`、`nac:tab:activated`、`nac:field:changed` 等），让调用方知道每个步骤何时完成。
- 页面以元素标识而非坐标驱动契约——因此 UI 重新设计不会破坏自动化流程。
- 来源层（`isTrusted`、HMAC 签名清单）可告知下游系统某次点击来自真实用户还是另一个智能体。

## NAC3 不是什么

- 它不是 UI 框架。你可以继续使用 React / Vue / 原生 JS / PHP 或任何其他技术。NAC3 是叠加在你现有渲染层之上的薄契约层。
- 它不是 LLM。将"点击保存按钮"解析为 `NAC.click('deals.save')` 的 LLM 是你自己（或你的供应商）需要解决的问题；参见 `guides/LLM_WIRING.md` 中的参考实现。
- 它不是无障碍功能的替代品。请保留你的 ARIA roles。NAC3 添加的是一个并行层；许多采用者最终会在同一元素上同时使用 `role="button"` 和 `data-nac-role="action"`。

## 状态

- **v1.9** —— 稳定版。覆盖 27 个组件、9 个事件族，支持 HMAC + isTrusted、i18n 严格模式及验证器。生产参考实现为 `example.php`。
- **v2.0** —— 提供棕地迁移方案（现有页面通过约 80 行配置即可接入 NAC 驱动）。参考实现：`example-v20-full.php`。
- **v2.1** —— 新增数据表原语（`collection`、`matrix`、`matrix-singletree` 子类型；`dt_add_row`、`dt_edit_cell`、聚合操作、事务提交）。参考实现：`example-v21-data-table.php`。
- **v2.2** —— 已于 2026-05-10 发布。`NAC.register` 现为严格验证器（`manifest_role_unknown`、`tab_id_manifest_role_drift`、`manifest_dom_role_mismatch`）。新增 `NAC.bindAction(el, handler, ctx)` 辅助方法，将 `nac:action:succeeded` 契约内置于运行时。新增标志 `NAC.STRICT_VALIDATION`，可在仅警告模式（2.2 默认）与抛出异常模式（2.3 默认）之间切换。**这是 `npm install @nac3/runtime` 当前安装的版本。** 完整变更日志见 `docs/NAC_V22_ROADMAP.md`。
- **v2.3** —— 规划中。`STRICT_VALIDATION` 默认值将切换为 `true`。新增 `NAC.bindTab(el, handler, ctx)`，作为 tab 组件的配套方法。可选功能：流式聊天分发。

## 从哪里开始

- 在 `yujin.app/nac-spec/` 运行演示（支持任意浏览器和设备）。
- 阅读 `SPEC.md` 了解完整契约。
- 如果从 React 接入，请阅读 `guides/REACT.md`。
- 如果需要接入自己的 LLM 中间层，请阅读 `guides/LLM_WIRING.md`。
- 在租户环境中部署 NAC3 之前，请先阅读 `SECURITY.md`。

## 治理

NAC3 目前由 Yujin 负责管理。规范采用 Apache 2.0 许可，参考运行时采用 MIT 许可。如果采用规模达到需要中立治理的程度，Yujin 承诺将 NAC3 移交至中立基金会（W3C 社区组、Linux Foundation 或同等行业机构）。在此之前，规范变更遵循 `CONTRIBUTING.md` 中的 RFC 流程，任何涉及公开 API 或传输格式的变更均须经过至少 14 天的公开评论期。

Apache 2.0 + MIT 的双重许可保证了规范和运行时不受 Yujin 公司状态变化的影响。无论现在还是 Yujin 不再存在之后，采用者均可自由 fork、运行和分发两者。

## 作者信息

NAC3 由 Yujin（rpaforce.com）编写并维护。Apache-2.0 许可。欢迎贡献——详见 `CONTRIBUTING.md`。

---

*This is a machine translation of the canonical English
version at `/nac-spec/ABOUT.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
