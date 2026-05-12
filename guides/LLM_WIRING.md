# NAC3 + LLM intermediary

This guide builds the backend that turns user prompts ("guardar la
factura", "ve a permisos", "borra el teclado") into NAC3 actions
the chat client dispatches.

NAC3 standardises only the inputs and outputs of this backend. The
LLM you pick, the prompt template, the rate limits, and the
moderation are your choices. This guide shows the simplest
working shape with Claude; the same pattern applies to OpenAI,
Gemini, or a local model.

---

## 1. The contract

### 1.1 Request: client -> backend

POST `/your-endpoint`, JSON body:

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

The chat client provides the `nac_tree` snapshot via
`NacChat.snapshotTree()`; the runtime's `NAC.describe()` +
`NAC.describe_v2()` produce it. It is the LLM's only view of the
page state.

### 1.2 Response: backend -> client

```json
{
  "ok":      true,
  "message": "Abriendo la pestana Permisos.",
  "actions": [
    { "kind": "tab", "plugin": "invoice_edit_modal", "tab_key": "tab.permissions" }
  ]
}
```

`message` is what the chat shows + speaks via TTS. `actions[]` is
the structured dispatch list. The chat client validates each
action against the snapshot it sent (does the nac_id exist? is
the tab_key a known tab?) before calling `NAC.click()` /
`NAC.tab()` / etc.

### 1.3 Action shapes

| `kind` | Required fields | Maps to |
|--------|-----------------|---------|
| `click` | `nac_id` | `NAC.click(nac_id)` |
| `click_by_verb` | `verb`, optional `plugin` | `NAC.click_by_verb(plugin, verb)` |
| `fill` | `nac_id`, `value` | `NAC.fill(nac_id, value)` |
| `select` | `nac_id`, `value` | `NAC.select(nac_id, value)` |
| `tab` | `plugin`, `tab_key` | `NAC.tab(plugin, tab_key)` |
| `tab_by_label` | `label`, optional `plugin` | `NAC.tab_by_label(plugin, label)` |
| `go_to_section` | `nac_id` | `NAC.go_to_section(nac_id)` |
| `drag_drop` | `nac_id`, `target_nac_id`, optional `to_index` | `NAC.drag_drop(...)` |
| `say` | `text` | botSpeak only, no DOM action |
| `change_locale` | `locale` (2-letter) | `NacChat.setLang(locale)` |
| `dt_add_row` | `table_id`, `values` | `NAC.dt_add_row(...)` |
| `dt_remove_row` | `table_id`, `row_id` | `NAC.dt_remove_row(...)` |
| `dt_edit_cell` | `table_id`, `row_id`, `column`, `value` | `NAC.dt_edit_cell(...)` |
| `dt_commit` | `table_id` | `NAC.dt_commit(...)` |
| `dt_discard` | `table_id` | `NAC.dt_discard(...)` |
| `dt_read_aggregate` | `table_id`, `agg_key`, `column` | `NAC.dt_read_aggregate(...)` |

The full enumeration is in the chat client's
`_dispatchAction()` switch (`js/nac-chat-client.js`).

---

## 2. Reference backend (Node + Anthropic SDK)

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
   ONLY when followed/preceded by an explicit language word
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

Point your chat client at it:

```js
NacChat._endpoint = 'http://localhost:3000/';
```

---

## 3. Validation -- before dispatch

Critical defence: validate every action the LLM returns against
the snapshot you sent.

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

The reference client (`js/nac-chat-client.js`) does this in
`_dispatchAction`. Don't skip it -- it is the only defense
against an LLM that hallucinates ids or executes prompt
injection.

---

## 4. Locale handling

The user's `lang` is an explicit field on the request. The system
prompt instructs the model to reply in that language. Two extra
considerations:

- If the user asks to switch language ("cambia a inglés"), the
  model returns `{ kind: 'change_locale', locale: 'en' }`. The
  client calls `NacChat.setLang('en')` and the next request
  carries `lang: 'en'`.
- The 2-letter code false-positive: the chat client's
  `_detectLangSwitch` short-circuits the LLM round-trip when the
  user's input matches a locale-switch pattern. The fix landed
  2026-05-09: bare 2-letter codes (`de`, `es`, `en`) are only
  treated as locale codes when an explicit language trigger word
  is also present. Without that fix, "cambia DE pestana"
  silently switched to German.

---

## 5. Snapshot size

A live page can produce a large snapshot (50+ plugins * 30
elements * 10 locales = 15000+ entries). At Claude Sonnet pricing
that is real money per request.

Options:

- **Active-plugin filter.** Send only the active plugin + its
  parents in the scope tree. The chat client's `snapshotTree()`
  already includes only mounted plugins.
- **Single-locale snapshot.** Strip `label_i18n` to just the
  user's current `lang`. The client can re-translate on dispatch.
- **Element pruning.** Only include `role: 'action'`, `'tab'`,
  `'field'`, `'option'` -- skip `'section'`, `'region'`,
  decorative elements. The agent rarely targets those directly.

For Yujin's production deployment the prune drops snapshot size
~10x with no loss in resolution accuracy.

---

## 6. Streaming and latency

The reference backend above is non-streaming. For voice flows
(the user wants TTS to start as soon as possible), use streaming:

- Stream the LLM response as it arrives.
- As soon as the `message` field is parseable (typically within
  the first 50 tokens), start TTS.
- Hold the `actions[]` until the JSON is complete; dispatch them
  after `message` finishes speaking.

The chat client does NOT stream today; this is a v2.2 candidate.

---

## 7. Multi-LLM

Switching LLMs is mostly a matter of the system prompt + the
SDK. NAC3's wire format does not change.

- **OpenAI:** `gpt-4-turbo` or `gpt-5` work well. Use
  `response_format: { type: 'json_object' }` to enforce JSON
  output (eliminates the parse-fallback branch).
- **Gemini:** `gemini-1.5-pro`. Same shape; use
  `responseMimeType: 'application/json'`.
- **Local (Ollama, vLLM):** smaller models struggle with the
  full snapshot. Prune aggressively (sec 5) and use a smaller
  prompt template that lists only verbs. Quality drops but works
  offline.

The Yujin production deployment uses Claude Sonnet for cost +
latency + tool-use accuracy. We've benchmarked GPT-4 Turbo and
Gemini 1.5 Pro; both work, both cost more per request at our
prompt size.

---

## 8. Production hardening

Before shipping:

1. **Auth.** The intermediary endpoint MUST require a session
   token from your authed app. Otherwise an attacker calls it
   directly and gets free Claude access.
2. **Rate limit.** Per-session, per-tenant. The reference
   `core/Orchestrator.php` in the Yujin codebase has a
   `TenantRateLimiter` you can adapt.
3. **Snapshot trust.** The `nac_tree` arrives from the client.
   Treat it as untrusted: do not echo it into logs without
   sanitisation; do not let an action reference an id that was
   not in this request's snapshot.
4. **Logging.** Log only the prompt + chosen actions, not the
   snapshot. Snapshots can contain user data (names, amounts).
5. **Cost guard.** Token counter per tenant. Hard-stop on plan
   limit.

---

## 9. Reference: production endpoint shape

The Yujin production endpoint is at
`/crm/api/v1/yujin/nac-demo`. Source:
`yujin.app/crm/api/v1/yujin.php`. It implements all of the above
plus per-tenant usage counters (F15) and the audit log
(`yujin_assistant_log`). Read it for a battle-tested example;
copy what fits.
