---
translation_source: SECURITY.md
translation_source_hash: 4d9f26e0cc810ed4f1c6cf921c7ae8f5c004d8ba42445a69a2de58106db2b64f
translation_quality: machine_v1
translation_lang: zh
translation_date: 2026-05-11T13:08:41.673287+00:00
---

# NAC3 -- 安全模型

**规范版本：** 2.2 稳定版（+ v2.3 互操作预览）。

## 威胁模型

NAC3 位于 agent 与你的 UI 之间，是一个契约层，而非认证层。系统中存在若干不同的信任边界；本文档逐一说明，以便你清楚地了解哪些边界受 NAC3 保护，哪些不在其范围之内。

### 边界 A：用户 -> UI

不在 NAC 的职责范围内。请使用你现有的认证机制（会话、OAuth、SSO、MFA）。用户一旦完成认证，NAC3 即假定该用户在 UI 中可执行的任何操作均属合法。

### 边界 B：用户控制的 agent -> UI

用户授权某个 agent 驱动其浏览器会话。典型示例包括：语音助手、屏幕阅读器、嵌入同一页面的 LLM 聊天客户端。NAC3 在此边界的职责：

1. 为 agent 提供稳定的元素名称，使其无需抓取坐标即可执行操作。
2. 暴露 `event.isTrusted`，使宿主能够拒绝针对安全敏感操作（支付、删除、角色授权）的合成点击。agent 无法伪造 `isTrusted=true`；只有真实的用户手势才能将其置为 true。
3. 提供事件级确认，使 agent 无需重新读取 DOM 即可得知操作是否完成。

NAC3 **不**负责防范用户明确信任的 agent 滥用该信任。这属于用户体验问题（在敏感操作前展示授权提示），应由你的应用处理，而非 NAC。

### 边界 C：外部服务 -> UI（LLM 中间层）

若用户的语音指令被发送至远程 LLM，由其返回 NAC3 动作，则该 LLM 即成为信任主体。NAC3 在此边界的职责：

1. LLM 只能看到 `NAC.describe()` 所暴露的内容（树快照 + 已注册的 manifest）。它无法访问用户的认证令牌、Cookie，以及 manifest 声明范围之外的 DOM 内部信息。
2. LLM 不能直接触发点击。它返回一个结构化动作；聊天客户端在分发前需对其进行校验（`nac_id` 是否存在？该操作是否被允许？）。
3. 聊天客户端**应当**拒绝 `nac_id` 不在其所发送快照中的动作（防止提示注入攻击混入任意 id）。

NAC3 **不**规定 LLM 的提示模板、速率限制或内容过滤策略。相关建议请参阅 `guides/LLM_WIRING.md`。

### 边界 D：租户 -> 租户（多租户部署）

在多租户 SaaS 场景中，租户共享运行时但数据相互隔离。NAC3 通过 HMAC 签名 manifest 来保护此边界：

1. 每个租户在发布 manifest 时，使用存储于服务端的租户专属密钥，对稳定序列化后的内容计算 HMAC 签名。
2. 运行时在执行 `NAC.register()` 时，使用其为当前租户预期的密钥重新计算 HMAC。若签名不匹配，manifest 将被拒绝。
3. 恶意租户在没有签名密钥的情况下，无法伪造其他租户的 manifest。

NAC3 **不**阻止租户注册过大或格式错误的 manifest（仅有基本的大小上限）；若你接受不可信的 manifest，请在服务端对注册操作进行速率限制。

### 边界 E：恶意脚本 -> 页面

若页面中包含攻击者控制的 JS（XSS、供应链攻击），则页面已全面沦陷，NAC3 无能为力——攻击者可直接调用 `NAC.click(...)`。请通过 CSP、SRI 以及常规 Web 安全技术栈加以防范。

## 来源信号

### 成功事件中的 `is_trusted`

每个动作成功事件的 detail 中均携带 `is_trusted: boolean`。宿主可针对敏感操作要求此字段为 true：

```js
document.addEventListener('nac:action:succeeded', function (e) {
  var d = e.detail;
  if (d.action_id === 'invoice.delete' && !d.is_trusted) {
    console.warn('[security] refused synthetic delete click');
    e.preventDefault();
  }
});
```

参考示例 `example-v20-full.php` 中包含一对按钮（`v20_panel.istrusted_real` 和 `v20_panel.istrusted_fake`），可在面板输出中直观演示两者的区别。

### HMAC manifest 签名

服务端生成签名：

```python
import hmac, hashlib, json
manifest_body = json.dumps(manifest, sort_keys=True, separators=(',', ':'))
sig = hmac.new(
    tenant_secret.encode('utf-8'),
    manifest_body.encode('utf-8'),
    hashlib.sha256
).hexdigest()
manifest['provenance'] = {
    'signed_at': now_iso8601(),
    'signed_by': tenant_slug,
    'signature': sig
}
```

客户端：

```js
NAC.set_provenance_secret(SECRET_FROM_AUTHED_RESPONSE);
NAC.register(manifest);
// runtime recomputes hmac, rejects if mismatch
```

密钥**必须**来自经过认证的服务端响应，切勿将其硬编码在 JS 源码中。如威胁模型有要求，可按会话轮换密钥。

## 漏洞报告

请发送邮件至 `nac@yujin.dev`，并提供以下信息：

1. 漏洞描述。
2. 复现步骤或概念验证（PoC）。
3. 受影响的 NAC3 版本。
4. 如有建议，请提供缓解方案。

**请勿**在 GitHub 上公开提交 issue。我们承诺：

- 在 3 个工作日内确认收到报告。
- 在 10 个工作日内提供分类评估结果。
- 与报告者协商披露时间。

影响公开规范的严重问题将在 30 天内随补丁版本发布修复；较低严重级别的问题在 90 天内修复。

## NAC3 明确**不**涵盖的范围

- 用户认证。
- 传输数据加密（请使用 TLS）。
- 阻止用户执行其被允许的操作。
- 将 agent 相互隔离（所有 agent 均运行在同一页面中；如需隔离，请使用独立页面）。
- 对单个动作签名（仅对 manifest 签名）。按动作签名已列为 v3.0 候选特性。

---

*This is a machine translation of the canonical English
version at `/nac-spec/SECURITY.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
