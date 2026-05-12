---
translation_source: guides/LLM_WIRING.md
translation_source_hash: 746145f0be3bee6ca1e8d89095de3168e60f2d7c55bf1af78a0086203be97555
translation_quality: machine_v1
translation_lang: hi
translation_date: 2026-05-11T14:59:06.901183+00:00
---

# NAC3 + LLM intermediary

यह गाइड वह backend बनाता है जो user के prompts ("guardar la
factura", "ve a permisos", "borra el teclado") को NAC3 actions में
बदलता है, जिन्हें chat client dispatch करता है।

NAC3 केवल इस backend के inputs और outputs को standardise करता है। आप
कौन सा LLM चुनते हैं, prompt template, rate limits, और moderation —
ये सब आपके निर्णय हैं। यह गाइड Claude के साथ सबसे सरल working shape
दिखाता है; यही pattern OpenAI, Gemini, या किसी local model पर भी
लागू होता है।

---

## 1. Contract

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

Chat client `nac_tree` snapshot `NacChat.snapshotTree()` के ज़रिए
प्रदान करता है; runtime का `NAC.describe()` + `NAC.describe_v2()`
इसे generate करता है। यह LLM का page state देखने का एकमात्र तरीका है।

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

`message` वह है जो chat दिखाता है और TTS के ज़रिए बोलता है। `actions[]`
structured dispatch list है। Chat client प्रत्येक action को उस snapshot
के विरुद्ध validate करता है जो उसने भेजा था (क्या nac_id मौजूद है? क्या
tab_key एक known tab है?) — इसके बाद ही `NAC.click()` / `NAC.tab()` /
आदि call करता है।

### 1.3 Action shapes

| `kind` | आवश्यक fields | Maps to |
|--------|---------------|---------|
| `click` | `nac_id` | `NAC.click(nac_id)` |
| `click_by_verb` | `verb`, optional `plugin` | `NAC.click_by_verb(plugin, verb)` |
| `fill` | `nac_id`, `value` | `NAC.fill(nac_id, value)` |
| `select` | `nac_id`, `value` | `NAC.select(nac_id, value)` |
| `tab` | `plugin`, `tab_key` | `NAC.tab(plugin, tab_key)` |
| `tab_by_label` | `label`, optional `plugin` | `NAC.tab_by_label(plugin, label)` |
| `go_to_section` | `nac_id` | `NAC.go_to_section(nac_id)` |
| `drag_drop` | `nac_id`, `target_nac_id`, optional `to_index` | `NAC.drag_drop(...)` |
| `say` | `text` | केवल botSpeak, कोई DOM action नहीं |
| `change_locale` | `locale` (2-letter) | `NacChat.setLang(locale)` |
| `dt_add_row` | `table_id`, `values` | `NAC.dt_add_row(...)` |
| `dt_remove_row` | `table_id`, `row_id` | `NAC.dt_remove_row(...)` |
| `dt_edit_cell` | `table_id`, `row_id`, `column`, `value` | `NAC.dt_edit_cell(...)` |
| `dt_commit` | `table_id` | `NAC.dt_commit(...)` |
| `dt_discard` | `table_id` | `NAC.dt_discard(...)` |
| `dt_read_aggregate` | `table_id`, `agg_key`, `column` | `NAC.dt_read_aggregate(...)` |

पूरी enumeration chat client के
`_dispatchAction()` switch (`js/nac-chat-client.js`) में है।

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

अपने chat client को इस पर point करें:

```js
NacChat._endpoint = 'http://localhost:3000/';
```

---

## 3. Validation — dispatch से पहले

एक ज़रूरी सुरक्षा उपाय: LLM द्वारा लौटाए गए हर action को उस snapshot
के विरुद्ध validate करें जो आपने भेजा था।

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

Reference client (`js/nac-chat-client.js`) यह काम `_dispatchAction`
में करता है। इसे skip न करें — यह एकमात्र बचाव है उस LLM के खिलाफ
जो ids hallucinate करे या prompt injection execute करे।

---

## 4. Locale handling

User का `lang` request पर एक explicit field है। System prompt model
को उसी भाषा में जवाब देने का निर्देश देता है। दो अतिरिक्त बातें:

- अगर user भाषा बदलने को कहे ("cambia a inglés"), तो model
  `{ kind: 'change_locale', locale: 'en' }` लौटाता है। Client
  `NacChat.setLang('en')` call करता है और अगले request में
  `lang: 'en'` होता है।
- 2-letter code का false-positive: chat client का
  `_detectLangSwitch` LLM round-trip को short-circuit करता है जब
  user का input किसी locale-switch pattern से match करे। यह fix
  2026-05-09 को आई: bare 2-letter codes (`de`, `es`, `en`) को
  locale code तभी माना जाता है जब कोई explicit language trigger word
  भी मौजूद हो। इस fix के बिना, "cambia DE pestana" चुपचाप German में
  switch कर देता था।

---

## 5. Snapshot का आकार

एक live page बड़ा snapshot produce कर सकता है (50+ plugins × 30
elements × 10 locales = 15000+ entries)। Claude Sonnet की pricing पर
यह प्रति request वास्तविक खर्च है।

विकल्प:

- **Active-plugin filter।** केवल active plugin और scope tree में उसके
  parents भेजें। Chat client का `snapshotTree()` पहले से केवल mounted
  plugins शामिल करता है।
- **Single-locale snapshot।** `label_i18n` को केवल user के current
  `lang` तक सीमित करें। Client dispatch पर re-translate कर सकता है।
- **Element pruning।** केवल `role: 'action'`, `'tab'`, `'field'`,
  `'option'` शामिल करें — `'section'`, `'region'`, decorative
  elements छोड़ें। Agent शायद ही कभी उन्हें directly target करता है।

Yujin के production deployment में pruning से snapshot का आकार ~10x
कम हो जाता है, बिना resolution accuracy में कोई कमी के।

---

## 6. Streaming और latency

ऊपर दिया गया reference backend non-streaming है। Voice flows के लिए
(जहाँ user चाहता है कि TTS जल्द से जल्द शुरू हो), streaming
उपयोग करें:

- LLM response आते ही stream करें।
- जैसे ही `message` field parseable हो (आमतौर पर पहले 50 tokens
  के भीतर), TTS शुरू करें।
- JSON पूरा होने तक `actions[]` रोकें; `message` बोलने के बाद
  dispatch करें।

Chat client आज streaming नहीं करता; यह v2.2 का candidate है।

---

## 7. Multi-LLM

LLM बदलना मुख्यतः system prompt + SDK का मामला है। NAC3 का wire
format नहीं बदलता।

- **OpenAI:** `gpt-4-turbo` या `gpt-5` अच्छे काम करते हैं।
  JSON output enforce करने के लिए
  `response_format: { type: 'json_object' }` उपयोग करें
  (parse-fallback branch समाप्त हो जाती है)।
- **Gemini:** `gemini-1.5-pro`। Same shape; उपयोग करें
  `responseMimeType: 'application/json'`।
- **Local (Ollama, vLLM):** छोटे models पूरे snapshot के साथ
  संघर्ष करते हैं। Aggressively prune करें (sec 5) और एक छोटा
  prompt template उपयोग करें जो केवल verbs list करे। Quality
  कम होती है लेकिन offline काम करता है।

Yujin का production deployment cost + latency + tool-use accuracy
के लिए Claude Sonnet उपयोग करता है। हमने GPT-4 Turbo और
Gemini 1.5 Pro को benchmark किया है; दोनों काम करते हैं, दोनों
हमारे prompt size पर प्रति request अधिक खर्च करते हैं।

---

## 8. Production hardening

Ship करने से पहले:

1. **Auth।** Intermediary endpoint को आपके authed app के session
   token की आवश्यकता होनी चाहिए। अन्यथा कोई attacker इसे directly
   call करके मुफ्त Claude access पा सकता है।
2. **Rate limit।** Per-session, per-tenant। Yujin codebase में
   reference `core/Orchestrator.php` में एक `TenantRateLimiter` है
   जिसे आप adapt कर सकते हैं।
3. **Snapshot trust।** `nac_tree` client से आता है। इसे untrusted
   मानें: बिना sanitisation के logs में echo न करें; किसी action को
   ऐसे id को reference न करने दें जो इस request के snapshot में
   नहीं था।
4. **Logging।** केवल prompt + chosen actions log करें, snapshot नहीं।
   Snapshots में user data (नाम, राशि) हो सकता है।
5. **Cost guard।** Per-tenant token counter। Plan limit पर hard-stop।

---

## 9. Reference: production endpoint shape

Yujin का production endpoint
`/crm/api/v1/yujin/nac-demo` पर है। Source:
`yujin.app/crm/api/v1/yujin.php`। यह ऊपर की सभी बातें implement
करता है, साथ ही per-tenant usage counters (F15) और audit log
(`yujin_assistant_log`) भी। एक battle-tested उदाहरण के लिए इसे
पढ़ें; जो उपयुक्त लगे वह copy करें।

---

*This is a machine translation of the canonical English
version at `/nac-spec/guides/LLM_WIRING.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
