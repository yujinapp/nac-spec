---
translation_source: guides/LLM_WIRING.md
translation_source_hash: 746145f0be3bee6ca1e8d89095de3168e60f2d7c55bf1af78a0086203be97555
translation_quality: machine_v1
translation_lang: zh
translation_date: 2026-05-11T14:49:53.459807+00:00
---

# NAC3 + LLM 中间层

本指南介绍如何构建后端服务，将用户的自然语言指令（如 "guardar la factura"、"ve a permisos"、"borra el teclado"）转换为 NAC3 动作，再由聊天客户端执行。

NAC3 只规范该后端的输入和输出格式。选用哪个 LLM、提示词模板、限流策略和内容审核，均由你自行决定。本指南以 Claude 为例展示最简可用的实现方式；同样的模式也适用于 OpenAI、Gemini 或本地模型。

---

## 1. 接口约定

### 1.1 请求：客户端 -> 后端

POST `/your-endpoint`，JSON 请求体：

```json
{
  "session_id": "sess_abc123",
  "prompt":     "ve a permisos",
  "lang":       "es",
  "history":    [
    { "role": "user",      "text": "muestra factura 1" },
    { "role": "assistant", "text": "Abriendo la factura #INV-001." }
  ],
  "nac_tree": {
    "active":  "invoice_edit_modal",
    "plugins": [
      { "plugin": "invoice", "state": "idle", "elements": [...], "manifest": {...} },
      { "plugin": "invoice_edit_modal", "state": "active", "elements": [...], "manifest": {...} }
    ],
    "v2_scope_entries": [...],
    "data_tables": [...]
  }
}
```

聊天客户端通过 `NacChat.snapshotTree()` 提供 `nac_tree` 快照；该快照由运行时的 `NAC.describe()` + `NAC.describe_v2()` 生成，是 LLM 了解当前页面状态的唯一来源。

### 1.2 响应：后端 -> 客户端

```json
{
  "ok":      true,
  "message": "Abriendo la pestana Permisos.",
  "actions": [
    { "kind": "tab", "plugin": "invoice_edit_modal", "tab_key": "tab.permissions" }
  ]
}
```

`message` 是聊天界面展示的文本，同时通过 TTS 朗读。`actions[]` 是结构化的执行动作列表。聊天客户端在调用 `NAC.click()` / `NAC.tab()` 等方法之前，会先将每个动作与发送时的快照进行校验（nac_id 是否存在？tab_key 是否为已知标签页？）。

### 1.3 动作格式

| `kind` | 必填字段 | 对应方法 |
|--------|----------|---------|
| `click` | `nac_id` | `NAC.click(nac_id)` |
| `click_by_verb` | `verb`，可选 `plugin` | `NAC.click_by_verb(plugin, verb)` |
| `fill` | `nac_id`, `value` | `NAC.fill(nac_id, value)` |
| `select` | `nac_id`, `value` | `NAC.select(nac_id, value)` |
| `tab` | `plugin`, `tab_key` | `NAC.tab(plugin, tab_key)` |
| `tab_by_label` | `label`，可选 `plugin` | `NAC.tab_by_label(plugin, label)` |
| `go_to_section` | `nac_id` | `NAC.go_to_section(nac_id)` |
| `drag_drop` | `nac_id`, `target_nac_id`，可选 `to_index` | `NAC.drag_drop(...)` |
| `say` | `text` | 仅 botSpeak，不操作 DOM |
| `change_locale` | `locale`（2 位语言代码） | `NacChat.setLang(locale)` |
| `dt_add_row` | `table_id`, `values` | `NAC.dt_add_row(...)` |
| `dt_remove_row` | `table_id`, `row_id` | `NAC.dt_remove_row(...)` |
| `dt_edit_cell` | `table_id`, `row_id`, `column`, `value` | `NAC.dt_edit_cell(...)` |
| `dt_commit` | `table_id` | `NAC.dt_commit(...)` |
| `dt_discard` | `table_id` | `NAC.dt_discard(...)` |
| `dt_read_aggregate` | `table_id`, `agg_key`, `column` | `NAC.dt_read_aggregate(...)` |

完整的动作枚举定义在聊天客户端的 `_dispatchAction()` switch 语句中（`js/nac-chat-client.js`）。

---

## 2. 参考后端实现（Node + Anthropic SDK）

```js
// nac-intermediary.mjs
// Run: node nac-intermediary.mjs
// Env: ANTHROPIC_API_KEY

import http from 'node:http';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic();

const MODEL = 'claude-sonnet-4-6';

function systemPrompt(snapshot, lang) {
  return `You drive a web UI by emitting structured NAC actions.

Rules:
1. Resolve the user's intent against the NAC tree below. Prefer
   click_by_verb when a verb matches; fall back to click(nac_id)
   only if no verb fits.
2. For tab switching, use tab() with the plugin + tab_key from
   the manifest, NOT click().
3. NEVER invent nac_ids. Every action MUST reference a name
   present in the tree. If you cannot find a matching name, ask
   the user a clarifying question via {message} with empty actions[].
4. Reply in language: ${lang}.
5. Output JSON only:
   { "message": "...", "actions": [...] }
6. message is what the user sees + hears. Keep it short (one
   sentence is ideal).
7. If the user said "cambia a <language>" emit a single
   change_locale action with the 2-letter code.
8. For data-tables: use dt_add_row / dt_remove_row / dt_edit_cell /
   dt_commit / dt_discard. Compute aggregates with dt_read_aggregate
   then read in the message.
9. Bare 2-letter locale codes ('de','es','en') are language codes
   ONLY when followed/preceded by an explicit language trigger word
   ('idioma', 'language', 'sprache'). 'cambia DE pestana' is NOT
   German -- 'de' here is the Spanish preposition.

NAC tree snapshot (JSON):
${JSON.stringify(snapshot, null, 2)}
`;
}

const server = http.createServer(async (req, res) => {
  if (req.method !== 'POST') { res.writeHead(405); res.end(); return; }

  let raw = '';
  req.on('data', c => raw += c);
  req.on('end', async () => {
    let body;
    try { body = JSON.parse(raw); }
    catch (_) { res.writeHead(400); res.end('bad json'); return; }

    try {
      const completion = await anthropic.messages.create({
        model: MODEL,
        max_tokens: 1024,
        temperature: 0.2,
        system: systemPrompt(body.nac_tree, body.lang || 'es'),
        messages: [
          ...body.history.map(h => ({
            role: h.role === 'assistant' ? 'assistant' : 'user',
            content: h.text
          })),
          { role: 'user', content: body.prompt }
        ]
      });

      // Claude returns JSON inside a text block; parse it.
      const text = completion.content[0].text.trim();
      let parsed;
      try {
        parsed = JSON.parse(text);
      } catch (_) {
        // Fallback: model returned prose. Wrap it.
        parsed = { message: text, actions: [] };
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        ok: true,
        message: parsed.message || '',
        actions: Array.isArray(parsed.actions) ? parsed.actions : []
      }));
    } catch (e) {
      console.error('intermediary error', e.message);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: e.message }));
    }
  });
});

server.listen(3000, () => {
  console.log('NAC intermediary listening on :3000');
});
```

将聊天客户端指向该服务：

```js
NacChat._endpoint = 'http://localhost:3000/';
```

---

## 3. 校验——在执行前

关键防线：在执行前，将 LLM 返回的每个动作与发送时的快照进行校验。

```js
function isActionSafe(action, snapshot) {
  if (!action || !action.kind) return false;
  switch (action.kind) {
    case 'click':
    case 'fill':
    case 'select':
    case 'go_to_section':
      return snapshotHasId(snapshot, action.nac_id);
    case 'click_by_verb':
      return snapshotHasVerb(snapshot, action.plugin, action.verb);
    case 'tab':
      return snapshotHasTab(snapshot, action.plugin, action.tab_key);
    case 'tab_by_label':
      return snapshotHasTabLabel(snapshot, action.plugin, action.label);
    case 'say':
    case 'change_locale':
      return true;
    default:
      // dt_* actions: validate table_id exists.
      if (action.kind.startsWith('dt_')) {
        return snapshotHasTable(snapshot, action.table_id);
      }
      return false;
  }
}

// Reject the action if not safe; show the user a generic message.
for (const a of response.actions) {
  if (!isActionSafe(a, mySnapshot)) {
    console.warn('[nac] dropping unsafe action', a);
    botSpeak('No pude resolver eso.');
    return;
  }
  await dispatchAction(a);
}
```

参考客户端（`js/nac-chat-client.js`）在 `_dispatchAction` 中已实现此逻辑。请勿跳过——这是防止 LLM 幻构 id 或执行提示词注入攻击的唯一防线。

---

## 4. 语言环境处理

用户的 `lang` 作为请求中的独立字段显式传递。系统提示词会指示模型以该语言回复。另有两点需要注意：

- 若用户要求切换语言（如 "cambia a inglés"），模型返回 `{ kind: 'change_locale', locale: 'en' }`，客户端调用 `NacChat.setLang('en')`，后续请求将携带 `lang: 'en'`。
- 2 位语言代码误判问题：聊天客户端的 `_detectLangSwitch` 会在进入 LLM 调用前短路处理语言切换请求。该问题已于 2026-05-09 修复：只有当 2 位代码（`de`、`es`、`en`）前后伴随明确的语言触发词时，才将其识别为语言代码。修复前，"cambia DE pestana" 会被错误地切换为德语。

---

## 5. 快照大小

线上页面可能产生较大的快照（50+ 个插件 × 30 个元素 × 10 种语言 = 15000+ 条目）。按 Claude Sonnet 的计费标准，每次请求的成本不可忽视。

优化方案：

- **仅发送活跃插件。** 只发送当前活跃插件及其在 scope 树中的父级。客户端的 `snapshotTree()` 已只包含已挂载的插件。
- **单语言快照。** 将 `label_i18n` 裁剪为仅保留用户当前使用的 `lang`，客户端在执行时再做翻译。
- **元素裁剪。** 只保留 `role: 'action'`、`'tab'`、`'field'`、`'option'` 的元素，跳过 `'section'`、`'region'` 及装饰性元素。智能体很少直接操作这些元素。

在 Yujin 的生产部署中，裁剪后快照体积缩减约 10 倍，且不影响指令解析准确率。

---

## 6. 流式响应与延迟

上述参考后端为非流式实现。对于语音交互场景（用户希望 TTS 尽快开始播报），可采用流式方案：

- 在 LLM 响应生成时实时流式传输。
- 一旦 `message` 字段可解析（通常在前 50 个 token 内），立即启动 TTS。
- 等待 JSON 完整接收后再执行 `actions[]`，在 `message` 播报完毕后触发动作。

当前聊天客户端不支持流式响应，该功能列为 v2.2 候选特性。

---

## 7. 多 LLM 支持

切换 LLM 主要涉及系统提示词和 SDK 的调整，NAC3 的数据格式不变。

- **OpenAI：** `gpt-4-turbo` 或 `gpt-5` 均可正常使用。建议设置 `response_format: { type: 'json_object' }` 强制 JSON 输出，可省去解析兜底逻辑。
- **Gemini：** `gemini-1.5-pro`，格式相同，使用 `responseMimeType: 'application/json'`。
- **本地模型（Ollama、vLLM）：** 较小的模型难以处理完整快照，需按第 5 节大幅裁剪，并使用仅列出动词的精简提示词模板。质量有所下降，但可离线运行。

Yujin 生产环境使用 Claude Sonnet，综合考量了成本、延迟和工具调用准确率。我们也对 GPT-4 Turbo 和 Gemini 1.5 Pro 进行了基准测试，两者均可正常工作，但在我们的提示词规模下每次请求成本更高。

---

## 8. 生产加固

上线前请确认以下事项：

1. **鉴权。** 中间层端点必须要求来自已认证应用的会话令牌，否则攻击者可直接调用该接口，免费消耗 Claude 额度。
2. **限流。** 按会话、按租户分别限流。Yujin 代码库中 `core/Orchestrator.php` 的 `TenantRateLimiter` 可供参考改造。
3. **快照信任边界。** `nac_tree` 来自客户端，应视为不可信输入：写入日志前须做脱敏处理；动作中引用的 id 必须存在于本次请求的快照中。
4. **日志记录。** 只记录提示词和执行的动作，不记录快照。快照可能包含用户数据（姓名、金额等）。
5. **费用保护。** 按租户统计 token 用量，达到套餐上限时强制停止。

---

## 9. 参考：生产端点格式

Yujin 生产端点位于 `/crm/api/v1/yujin/nac-demo`，源码为 `yujin.app/crm/api/v1/yujin.php`。该实现涵盖上述所有内容，并额外实现了按租户的用量统计（F15）和审计日志（`yujin_assistant_log`）。可作为经过生产验证的参考示例，按需取用。

---

*This is a machine translation of the canonical English
version at `/nac-spec/guides/LLM_WIRING.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
