---
translation_source: guides/LLM_WIRING.md
translation_source_hash: 746145f0be3bee6ca1e8d89095de3168e60f2d7c55bf1af78a0086203be97555
translation_quality: machine_v1
translation_lang: it
translation_date: 2026-05-11T13:51:47.976223+00:00
---

# NAC3 + intermediario LLM

Questa guida costruisce il backend che trasforma i prompt degli utenti ("guardar la
factura", "ve a permisos", "borra el teclado") in azioni NAC3
che il client chat esegue.

NAC3 standardizza solo gli input e gli output di questo backend. L'LLM
che scegli, il template del prompt, i rate limit e la
moderazione sono scelte tue. Questa guida mostra la forma funzionante
più semplice con Claude; lo stesso pattern si applica a OpenAI,
Gemini, o un modello locale.

---

## 1. Il contratto

### 1.1 Richiesta: client -> backend

POST `/your-endpoint`, corpo JSON:

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

Il client chat fornisce lo snapshot `nac_tree` tramite
`NacChat.snapshotTree()`; il runtime `NAC.describe()` +
`NAC.describe_v2()` lo producono. È l'unica visione che l'LLM
ha dello stato della pagina.

### 1.2 Risposta: backend -> client

```json
{
  "ok":      true,
  "message": "Abriendo la pestana Permisos.",
  "actions": [
    { "kind": "tab", "plugin": "invoice_edit_modal", "tab_key": "tab.permissions" }
  ]
}
```

`message` è ciò che la chat mostra e pronuncia via TTS. `actions[]` è
la lista strutturata di dispatch. Il client chat valida ogni
azione rispetto allo snapshot inviato (esiste il nac_id? è
tab_key un tab noto?) prima di chiamare `NAC.click()` /
`NAC.tab()` / ecc.

### 1.3 Forme delle azioni

| `kind` | Campi obbligatori | Mappa a |
|--------|-------------------|---------|
| `click` | `nac_id` | `NAC.click(nac_id)` |
| `click_by_verb` | `verb`, `plugin` opzionale | `NAC.click_by_verb(plugin, verb)` |
| `fill` | `nac_id`, `value` | `NAC.fill(nac_id, value)` |
| `select` | `nac_id`, `value` | `NAC.select(nac_id, value)` |
| `tab` | `plugin`, `tab_key` | `NAC.tab(plugin, tab_key)` |
| `tab_by_label` | `label`, `plugin` opzionale | `NAC.tab_by_label(plugin, label)` |
| `go_to_section` | `nac_id` | `NAC.go_to_section(nac_id)` |
| `drag_drop` | `nac_id`, `target_nac_id`, `to_index` opzionale | `NAC.drag_drop(...)` |
| `say` | `text` | solo botSpeak, nessuna azione DOM |
| `change_locale` | `locale` (2 lettere) | `NacChat.setLang(locale)` |
| `dt_add_row` | `table_id`, `values` | `NAC.dt_add_row(...)` |
| `dt_remove_row` | `table_id`, `row_id` | `NAC.dt_remove_row(...)` |
| `dt_edit_cell` | `table_id`, `row_id`, `column`, `value` | `NAC.dt_edit_cell(...)` |
| `dt_commit` | `table_id` | `NAC.dt_commit(...)` |
| `dt_discard` | `table_id` | `NAC.dt_discard(...)` |
| `dt_read_aggregate` | `table_id`, `agg_key`, `column` | `NAC.dt_read_aggregate(...)` |

L'enumerazione completa si trova nello switch `_dispatchAction()`
del client chat (`js/nac-chat-client.js`).

---

## 2. Backend di riferimento (Node + Anthropic SDK)

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

Punta il tuo client chat su di esso:

```js
NacChat._endpoint = 'http://localhost:3000/';
```

---

## 3. Validazione -- prima del dispatch

Difesa critica: valida ogni azione restituita dall'LLM rispetto
allo snapshot inviato.

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

Il client di riferimento (`js/nac-chat-client.js`) esegue questo
controllo in `_dispatchAction`. Non saltarlo -- è l'unica difesa
contro un LLM che allucinare id o esegue prompt injection.

---

## 4. Gestione della locale

Il `lang` dell'utente è un campo esplicito nella richiesta. Il system
prompt istruisce il modello a rispondere in quella lingua. Due
considerazioni aggiuntive:

- Se l'utente chiede di cambiare lingua ("cambia a inglés"), il
  modello restituisce `{ kind: 'change_locale', locale: 'en' }`. Il
  client chiama `NacChat.setLang('en')` e la richiesta successiva
  porta `lang: 'en'`.
- Il falso positivo del codice a 2 lettere: il `_detectLangSwitch`
  del client chat cortocircuita il round-trip con l'LLM quando
  l'input dell'utente corrisponde a un pattern di cambio locale. La
  correzione è arrivata il 2026-05-09: i codici a 2 lettere (`de`,
  `es`, `en`) vengono trattati come codici locale solo quando è
  presente anche una parola esplicita che indica la lingua. Senza
  quella correzione, "cambia DE pestana" passava silenziosamente al
  tedesco.

---

## 5. Dimensione dello snapshot

Una pagina attiva può produrre uno snapshot di grandi dimensioni
(50+ plugin × 30 elementi × 10 locale = 15.000+ voci). Al prezzo
di Claude Sonnet, questo ha un costo reale per richiesta.

Opzioni:

- **Filtro per plugin attivo.** Invia solo il plugin attivo e i
  suoi genitori nell'albero di scope. Il `snapshotTree()` del client
  chat include già solo i plugin montati.
- **Snapshot a locale singola.** Riduci `label_i18n` al solo
  `lang` corrente dell'utente. Il client può ritradurre al momento
  del dispatch.
- **Potatura degli elementi.** Includi solo `role: 'action'`, `'tab'`,
  `'field'`, `'option'` -- escludi `'section'`, `'region'` ed
  elementi decorativi. L'agente raramente li punta direttamente.

Nel deployment in produzione di Yujin, la potatura riduce la
dimensione dello snapshot di circa 10x senza perdita di accuratezza
nella risoluzione.

---

## 6. Streaming e latenza

Il backend di riferimento sopra non è in streaming. Per i flussi
vocali (l'utente vuole che il TTS inizi il prima possibile), usa
lo streaming:

- Trasmetti la risposta dell'LLM man mano che arriva.
- Non appena il campo `message` è analizzabile (tipicamente entro
  i primi 50 token), avvia il TTS.
- Trattieni `actions[]` fino a quando il JSON è completo; eseguili
  dopo che `message` ha finito di essere pronunciato.

Il client chat oggi NON supporta lo streaming; è un candidato per
la v2.2.

---

## 7. Multi-LLM

Cambiare LLM è principalmente una questione di system prompt + SDK.
Il formato wire di NAC3 non cambia.

- **OpenAI:** `gpt-4-turbo` o `gpt-5` funzionano bene. Usa
  `response_format: { type: 'json_object' }` per forzare l'output
  JSON (elimina il ramo di fallback del parsing).
- **Gemini:** `gemini-1.5-pro`. Stessa struttura; usa
  `responseMimeType: 'application/json'`.
- **Locale (Ollama, vLLM):** i modelli più piccoli faticano con lo
  snapshot completo. Pota aggressivamente (sez. 5) e usa un template
  di prompt più piccolo che elenca solo i verbi. La qualità cala ma
  funziona offline.

Il deployment in produzione di Yujin usa Claude Sonnet per costo +
latenza + accuratezza nell'uso degli strumenti. Abbiamo confrontato
GPT-4 Turbo e Gemini 1.5 Pro; entrambi funzionano, entrambi costano
di più per richiesta alla nostra dimensione di prompt.

---

## 8. Hardening per la produzione

Prima di andare in produzione:

1. **Autenticazione.** L'endpoint intermediario DEVE richiedere un
   token di sessione dalla tua app autenticata. Altrimenti un
   attaccante lo chiama direttamente e ottiene accesso gratuito a
   Claude.
2. **Rate limit.** Per sessione, per tenant. Il `core/Orchestrator.php`
   di riferimento nel codebase Yujin ha un `TenantRateLimiter`
   adattabile.
3. **Fiducia nello snapshot.** Il `nac_tree` arriva dal client.
   Trattalo come non attendibile: non inserirlo nei log senza
   sanitizzazione; non permettere che un'azione faccia riferimento a
   un id che non era nello snapshot di questa richiesta.
4. **Logging.** Registra solo il prompt e le azioni scelte, non lo
   snapshot. Gli snapshot possono contenere dati utente (nomi,
   importi).
5. **Guardia ai costi.** Contatore di token per tenant. Stop
   forzato al limite del piano.

---

## 9. Riferimento: forma dell'endpoint in produzione

L'endpoint in produzione di Yujin si trova su
`/crm/api/v1/yujin/nac-demo`. Sorgente:
`yujin.app/crm/api/v1/yujin.php`. Implementa tutto quanto sopra
più i contatori di utilizzo per tenant (F15) e il log di audit
(`yujin_assistant_log`). Leggilo come esempio collaudato in
produzione; copia ciò che si adatta.

---

*This is a machine translation of the canonical English
version at `/nac-spec/guides/LLM_WIRING.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
