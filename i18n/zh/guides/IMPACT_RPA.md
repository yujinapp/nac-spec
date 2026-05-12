---
translation_source: guides/IMPACT_RPA.md
translation_source_hash: d278c291a38100f66ef8ed5ae0030875b5e9eb4412db6edecf9b7db2794a16e2
translation_quality: machine_v1
translation_lang: zh
translation_date: 2026-05-11T14:53:47.475074+00:00
---

# NAC3 对 RPA 的影响

**NAC3 版本：** 2.2 稳定版。
**目标读者：** RPA 架构师、自动化卓越中心（CoE）负责人、评估 NAC3 驱动自动化维护与扩展成本的自动化工程师。

## 摘要

基于 CSS 选择器的 RPA 天生脆弱。基于图像识别的方案受显示环境影响同样脆弱。NAC3 在页面上放置稳定的命名锚点，任何 RPA 平台都可以直接定位。每个自动化任务的成本降低 60–90%，每季度的选择器维护负债几乎归零。

## 当前 RPA 选择器的现状

三种方式，各有缺陷：

### 1. CSS 选择器 / XPath

```xml
<webctrl tag='button'
         class='btn-primary btn-lg invoice-save-btn'
         text='Save' />
```

以下情况会导致失效：CSS 类名重命名、布局重构、标签翻译、悬停状态类名新增。

### 2. 图像 / OCR 匹配

对渲染后按钮进行像素比对。以下情况会导致失效：主题更换、深色模式、分辨率变化、字体替换、焦点环遮挡。

### 3. 锚点（相对坐标）定位

"'Subtotal' 标签右侧第二个单元格的按钮。"以下情况会导致失效：布局重排、列顺序调整、响应式断点变化。

三种方式都需要 CoE 持续维护。典型的企业 CoE 在 UI 重新设计后，有 35–60% 的时间花在修复失效选择器上。

## 引入 NAC3 后的现状

每个元素只需一行代码：

```js
await window.NAC.click('invoice.save');
```

唯一会导致失效的情况：产品团队将动词 `save` 重命名为其他名称。这是真正的语义变更，自动化任务必须随之更新——就像人工操作员需要重新培训一样。

## 具体影响指标

来自某 CoE 在 14 个自动化任务上试点 NAC3 的数据：

| 指标 | 基于选择器 | 基于 NAC3 | 变化 |
|------|-----------|----------|------|
| 每个自动化任务的平均活动数 | 47 | 9 | -81% |
| 每季度 UI 重设计后的维护工时 | 41 | 3 | -93% |
| 每周失败运行次数（选择器漂移） | 18 | 0 | -100% |
| 新建一个自动化任务的耗时 | 12 小时 | 2 小时 | -83% |
| 应用覆盖率（可触达的应用操作占比） | 38% | 95% | +150% |

覆盖率数据最为关键。**基于选择器的 RPA 通常只能覆盖应用 30–50% 的操作**，其余 50–70% 因自动化成本过高而无法实现。NAC3 将覆盖率提升至 90% 以上——长尾操作在经济上变得可行。

## NAC3 为 RPA 带来的能力

### 1. 跨租户可移植性

现状：为客户 A 的 Salesforce 实例构建的 RPA 机器人无法在客户 B 上运行，因为 CSS 类名存在细微差异。引入 NAC3 后：机器人定位 `invoice.save`，该标识在各租户间保持稳定。同一个机器人，支持多租户。

### 2. 跨厂商可移植性

如果同一领域（CRM、ERP、项目管理）的两款 SaaS 产品都提供包含重叠动词（`create_invoice`、`mark_paid`）的 NAC3 清单，同一套机器人逻辑可以分发到任意一款产品。RPA 机器人实现厂商无关。

### 3. LLM 自动生成自动化任务

CoE 工程师用自然语言描述自动化需求：

> "打开 Yujin CRM，找出所有逾期超过 60 天的未付发票，将其标记为催收状态，并向对应顾问发送邮件。"

具备 `NAC.describe()` 访问权限的 LLM 生成活动序列：

```
1. NAC.click_by_verb('invoice', 'list_unpaid')
2. NAC.fill('invoice.filter.age_days_min', 60)
3. NAC.click('invoice.filter.apply')
4. For each row in NAC.dt_state('invoice.list'):
     - NAC.click_by_verb('invoice', 'mark_collections', {row_id})
     - NAC.click_by_verb('email', 'send_advisor', {row_id})
```

CoE 工程师审核并批准。数小时内完成，而非数周。

### 4. 新应用的自动发现

`NAC.describe()` 返回完整清单。机器人可在运行时自省任何符合 NAC3 规范的应用。**"自动化覆盖用户当前打开的所有 NAC3 合规应用"成为可能**（参见 [yujin.app/pilot](https://yujin.app/pilot) 的 Yujin Pilot 产品化版本）。

### 5. 带溯源的审计追踪

每次分发都会触发 `nac:action:succeeded` 事件，携带 `is_trusted: false`（标识 RPA 来源）、`plugin` 及 `action_id`。宿主应用可将此记录用于合规审计：

> 机器人 xyz 于 GMT-3 14:23 分发了针对发票 #INV-42 的 `invoice.delete` 操作，`is_trusted=false`。审批依据：rpa-coe-policy v1.4。

GRC 团队可获得每次机器人运行的确定性审计日志。日志中无 DOM 抓取内容，选择器字符串中也不会泄露 PII。

### 6. 敏感动词访问控制

将某些动词（删除、付款、角色授权）标记为需要 `isTrusted` 的应用，默认会拒绝 RPA 分发请求。CoE 需明确将允许 RPA 使用的动词加入白名单：

```js
window.__NAC_ALLOW_UNTRUSTED__ = [
  'invoice.send',
  'invoice.save',
  'report.export'
  // 删除、付款、管理员动词有意不在此列
];
```

CoE 治理变为一份 JS 配置加一份审计日志，而非一张机器人权限电子表格。

### 7. 语音与聊天作为 RPA 前端

RPA 层可以将聊天面板作为其 UI：CoE 工程师说"为租户 Acme 运行未付发票任务"，具备 NAC3 感知能力的后端即可解析并分发。语音路径与聊天使用相同的 `NAC.*` 原语。

## 各 RPA 平台适配矩阵

| 平台 | 接入方式 | 集成成本 | 参考文档 |
|------|---------|---------|---------|
| UiPath | 通过 Browser 活动注入 JS | 低（每次调用一个活动） | [RPA_UIPATH.md](RPA_UIPATH.md) |
| Automation Anywhere A360 | Run JavaScript Function | 低 | [RPA_AUTOMATION_ANYWHERE.md](RPA_AUTOMATION_ANYWHERE.md) |
| Blue Prism | Inject JavaScript（VBO action） | 低 | [RPA_BLUE_PRISM.md](RPA_BLUE_PRISM.md) |
| Power Automate Desktop | Run JavaScript on web page | 低 | （即将发布） |
| 基于 Selenium 的 RPA | execute_script | 低 | -- |
| 基于图像（TagUI、Sikuli） | 降级路径；仅作最后手段 | 高 | -- |

## 现有自动化套件的迁移手册

### 第一阶段——审计（1 周）

1. 盘点所有自动化任务中的每一个选择器。
2. 逐一分类为"稳定-低维护"或"脆弱-高维护"。
3. 脆弱的选择器优先成为 NAC3 迁移候选。

### 第二阶段——目标应用准备

自动化任务所针对的 Web 应用必须先采用 NAC3。可选方式：

- 应用团队按照迁移手册（[AI_PLAYBOOK_MIGRATION.md](AI_PLAYBOOK_MIGRATION.md)）完成迁移。
- 或者：若应用团队无法迁移，RPA CoE 通过用户脚本或浏览器扩展在客户端注入 NAC3。此方式可行，但较为脆弱；优先推荐第一方采用。

### 第三阶段——自动化任务重写（每个任务 1–2 周）

将每个选择器替换为对应的 `NAC.*` 调用。基于选择器的旧版本保留在备份分支中。新版本随附明确的 NAC3 审计日志。

### 第四阶段——治理

CoE 更新机器人审查清单：
- 机器人仅定位当前清单中存在的 NAC id。
- 机器人对敏感操作有明确的动词白名单。
- 机器人将每次分发记录到审计表。

## 采用成本

对于一个针对 10 个目标应用运行 50 个自动化任务的 CoE：

- 应用端迁移：6–8 周（每个应用一名工程师）。
- 机器人端重写：每个机器人 1–2 周，共计 50–100 工程师周。

看起来成本不低，但与无限期维护 50 个基于选择器的机器人的持续成本相比，通常在 6–9 个月内即可回本；此后节省的全是 CoE 工程师时间。

## 风险与缓解措施

### 风险——"目标应用拒绝采用 NAC3"

在遗留企业软件中较为常见。缓解方式：

- 通过 CoE 管理的浏览器扩展或 Tampermonkey 风格的用户脚本在客户端注入 `nac.js`。
- 在 CoE 侧定义清单；应用本身保持不变。
- 健壮性不如第一方采用，但在过渡期内可行。

### 风险——"RPA 绕过 isTrusted 访问控制"

这是安全层面的权衡。RPA 确实会合成点击操作。宿主应用必须将 RPA 可触发的动词加入白名单。CoE 与应用团队逐动词协商。将协商过程文档化，并定期审计白名单。

### 风险——"我们失去对 RPA 操作序列的可见性"

恰恰相反：引入 NAC3 后可见性反而**提升**了。每次机器人分发都会触发标准化的 `nac:action:succeeded` 事件，携带结构化的 `{plugin, action_id, args, is_trusted}` 数据。将其记录到 SIEM 并按保留策略存档。

## 行业类比

ARIA 为辅助技术所做的事（为屏幕阅读器提供页面上的稳定契约），NAC3 正在为 RPA 和智能体自动化实现。CoE 的角色从"选择器维护工"转变为"自动化设计师"。

## 参见

- [RPA_UIPATH.md](RPA_UIPATH.md)、[RPA_AUTOMATION_ANYWHERE.md](RPA_AUTOMATION_ANYWHERE.md)、[RPA_BLUE_PRISM.md](RPA_BLUE_PRISM.md)——各平台集成指南。
- [IMPACT_TESTING.md](IMPACT_TESTING.md)——测试/QA 维度的同类影响分析。
- [SECURITY.md](../SECURITY.md)——RPA 白名单所依赖的 isTrusted 威胁模型。

## 许可证

Apache-2.0。

---

*This is a machine translation of the canonical English
version at `/nac-spec/guides/IMPACT_RPA.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
