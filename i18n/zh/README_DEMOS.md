---
translation_source: README_DEMOS.md
translation_source_hash: 0f488dd749283f4f2e03f0e431de47d7007818c6745ce1ce993014bdf9839480
translation_quality: machine_v1
translation_lang: zh
translation_date: 2026-05-11T13:09:03.817124+00:00
---

# NAC3 在 yujin.app/nac-spec/ 上的实时演示

**规范版本：** 2.2 stable（+ v2.3 互操作预览）。

**NAC3** = **Native Agent Contract**。该规范允许 Web UI 被 AI 助手、语音运行器和无障碍工具驱动，无需为每个应用编写胶水代码。

三个演示并排展示，各有其独特用途，请勿混淆。

| 文件 | 版本 | 用途 |
|---|---|---|
| `example.php` | v1.9 stable | NAC3 v1.9 的标准演示。包含 27 个组件（聊天、日历、自动驾驶、模态框、标签页、图表等），以接近生产环境的 UI 展示 v1.9 的完整功能面貌。**保持不变。** |
| `example-v20-primitives-showcase.php` | v2.0-rc4 | **教学展示**，涵盖 8 个 v2.0 原语 + HMAC + isTrusted + i18n 契约。共 8 个章节，每个原语对应一节。适合希望单独理解每个新原语的审阅者和采用者。**并非对 example.php 的迁移。** |
| `example-v20-full.php` | v2.0-rc4 | 将 `example.php` **棕地迁移**至 NAC3 v2.0 strict。相同的 27 个组件、相同的 HTML、相同的处理器——通过约 80 行配置代码在顶层叠加 v2.0 层。演示真实场景下的采用**无需重写每个组件**。 |

## 并排对比

在两个标签页中分别打开 `example.php` 和 `example-v20-full.php`。

### 完全相同的部分

- HTML 标记（每个 `<article data-nac-plugin="X">`、每个 `data-nac-id`、每个 i18n 目录引用、每个处理器）
- 视觉外观（相同的布局、相同的组件、相同的交互）
- v1.9 参考运行时（`js/nac.js`）以相同方式加载
- 现有的 `data-i18n-key` 目录引用

### v2.0-full 版本的不同之处

1. **头部文档注释**明确说明这是一个棕地迁移展示。
2. **新增一个 script 标签**：在 `nac.js` 之后、`example.js` 之前加载 `js/nac-v2-extensions.js`。
3. **新增一个配置块**（页面底部约 80 行），其功能包括：
   - 从现有 `data-nac-plugin` 属性构建层级作用域树（每个插件成为 `demo.shell` 下的一个作用域）。
   - 调用 `NAC.set_provenance_secret()` 以启用 HMAC 签名。
   - 调用 `NAC.setTenantPrefix('demo')` 演示多租户。
   - 启动 `NAC.captureEphemeral()` 环形缓冲区用于 toast 通知。
   - 对卡片容器调用 `NAC.autoRegister.watch()`。
4. **新增一个 UI 面板**（`#v20-panel`，固定在右下角），提供实时 `describe_v2()`、`validate_global_v2()`、HMAC 签名演示以及 isTrusted 区分按钮。

这就是全部差异。真实采用者可以直接复用此模式。

## 如何评估

如果你是 NAC3 v2.0 的同行审阅者：

1. 首先打开 `example.php`，确认 v1.9 演示如常运行。
2. 打开 `example-v20-full.php`，确认 v1.9 功能（聊天、日历、自动驾驶等）运行**完全一致**。
3. 打开 v2.0 面板（右下角），依次点击每个按钮：
   - `describe_v2()` —— 查看从棕地插件属性构建的作用域树。
   - `validate_global_v2()` —— 查看检测结果（若 i18n 目录存在缺口，通常仅为警告）。
   - `sign as agent` —— 查看生成的 HMAC 签名。
   - `click=trusted` / `.click()=fake` —— 查看 isTrusted 区分的实际效果。

如果你是采用者：

以 `example-v20-full.php` 的配置块作为模板，将作用域树适配到你的应用插件结构。大部分工作在于梳理你的作用域层级，其余部分是机械性操作。

## 相关链接

- NAC3 规范：https://github.com/pkuschnirof/nac-spec
- v1.9 发布版：标签 `v1.9.0`
- v2.0 候选发布版：`main` 分支上的 `2.0.0-rc4`
- 第 3 轮同行审阅记录：`docs/PEER_REVIEW.md`

---

*This is a machine translation of the canonical English
version at `/nac-spec/README_DEMOS.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
