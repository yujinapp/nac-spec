---
translation_source: CONTRIBUTING.md
translation_source_hash: 15fa7e8a34cc86e6193de8cd9826a9bd98d4b3ac1c72a43646521d75f88f9a26
translation_quality: machine_v1
translation_lang: zh
translation_date: 2026-05-11T13:08:15.229742+00:00
---

# 为 NAC3 做贡献

**规范版本：** 2.2 稳定版（+ v2.3 互操作性预览）。

## 治理

NAC3 目前由 Yujin 负责维护。规范采用 Apache 2.0 许可；参考运行时采用 MIT 许可。Yujin 承诺，一旦采用规模足以支撑中立治理，将把 NAC3 移交至中立基金会（W3C 社区组、Linux Foundation 或同等机构）。在此之前，规范变更遵循以下 RFC 流程，任何涉及公共 API 或线格式的变更须经过至少 14 天的公开评论期。

Apache 2.0 + MIT 双重许可确保了无论 Yujin 的公司状态发生何种变化，规范和运行时都能延续。两种许可均明确欢迎分叉。

---

感谢您考虑为项目做贡献。NAC3 包含一份公开规范和一份参考实现，两者均接受贡献。

## 三类贡献

### 1. 规范变更（需要 RFC）

对 `SPEC.md`、`ABOUT.md` 或 `docs/NAC_V*_ROADMAP.md` 的编辑属于规范变更。提交 PR 前请：

1. 在 GitHub 上创建一个标题为 `RFC: <一句话摘要>` 的 Issue。
2. 描述问题类别（该变更修复了什么 bug 或局限性，最好附上可复现的具体示例）。
3. 描述拟议的合约变更内容。
4. 描述现有采用者的迁移路径。
5. 等待至少一位维护者在 Issue 上回复后，再提交 PR。

未配对 RFC Issue 的规范 PR 将被关闭，并附上指向本节的链接。

### 2. 参考运行时变更

对 `js/nac.js`、`js/nac-v2-extensions.js` 或 `js/nac-chat-client.js` 的编辑。以下情况可直接提交 PR，无需 RFC：

- 该变更是修复 bug，使运行时与当前规范保持一致。
- 该变更是性能优化，不涉及行为差异。
- 该变更属于文档、类型或测试覆盖范围。

若运行时变更会影响规范合约，则**必须**先配套提交规范 RFC。

### 3. 示例、工具或文档改进

对 `example*.php`、`tools/`、`guides/` 或任何非规范 Markdown 文件的编辑，可直接提交 PR。请保持变更精简；我们更倾向于十个小 PR，而非一个大 PR。

## 代码风格

- 源文件仅使用 ASCII 字符（项目部署于 GoDaddy；PHP 8.3 即使在注释中也会拒绝非 ASCII 字符）。破折号请使用 `--`，而非 `--`。
- JS：运行时文件不使用转译器、打包器，也不需要构建步骤。使用纯 ES2018+。npm 包在同一源码基础上添加了 ESM/CJS 封装。
- PHP：heredoc 保持简洁（仅使用 `{$var}`，不使用表达式）。
- 注释：解释**为什么**，而非**做了什么**。diff 本身已经说明了做了什么。
- 测试：每项行为变更都须附带相应测试，该测试在变更前失败、变更后通过。推送前请在仓库根目录运行 `make test-launch`。

## 提交风格

- 主题行不超过 70 个字符，使用现在时祈使句。
  例如："fix(nac): treat tab role drift as register-time error"，而非 "Fixed tab thing"。
- 正文说明问题、原因和修复方式，并通过短 SHA 引用相关提交。
- AI 辅助提交可添加 Co-author trailer；我们不隐瞒工具使用情况。

## 代码审查

- Bug 修复 PR：1 位审批者，即可合并。
- 运行时/规范 PR：1 位审批者 + CI 通过，即可合并。
- 规范变更 PR：需配对 RFC Issue 并有讨论记录 + 1 位审批者 + CI 通过 + PR 开放后 7 天评论窗口期。

## 许可

提交 PR 即表示您以 Apache-2.0 许可授权您的贡献，与项目保持一致。PR 模板中包含一个复选框，请勾选。

## 行为准则

保持技术上的准确、简洁和友善。技术上的分歧是正常的；人身攻击则不可接受。对于屡次违规者，维护者可关闭相关讨论或撤销提交权限。

## 提问渠道

- GitHub Discussions：适用于设计问题、"我是否应该将 NAC3 用于此场景？"以及项目展示。
- GitHub Issues：适用于 bug 报告。
- `nac@yujin.dev`：适用于安全漏洞披露（详见 `SECURITY.md`）。

---

*This is a machine translation of the canonical English
version at `/nac-spec/CONTRIBUTING.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
