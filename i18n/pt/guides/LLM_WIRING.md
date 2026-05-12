---
translation_source: guides/LLM_WIRING.md
translation_source_hash: 746145f0be3bee6ca1e8d89095de3168e60f2d7c55bf1af78a0086203be97555
translation_quality: machine_v1
translation_lang: pt
translation_date: 2026-05-11T13:32:57.660861+00:00
---

# NAC3 + intermediário LLM

Este guia constrói o backend que transforma prompts do usuário ("guardar la
factura", "ve a permisos", "borra el teclado") em ações NAC3
que o cliente de chat despacha.

O NAC3 padroniza apenas as entradas e saídas deste backend. O
LLM que você escolher, o template de prompt, os limites de taxa e a
moderação são decisões suas. Este guia mostra a forma mais simples
e funcional usando Claude; o mesmo padrão se aplica ao OpenAI,
Gemini ou a um modelo local.

---

## 1. O contrato

### 1.1 Requisição: cliente -> backend

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

O cliente de chat fornece o snapshot `nac_tree` via
`NacChat.snapshotTree()`; o `NAC.describe()` + `NAC.describe_v2()`
do runtime o produzem. É a única visão que o LLM tem do
estado da página.

### 1.2 Resposta: backend -> cliente

```json
{
  "ok":      true,
  "message": "Abriendo la pestana Permisos.",
  "actions": [
    { "kind": "tab", "plugin": "invoice_edit_modal", "tab_key": "tab.permissions" }
  ]
}
```

`message` é o que o chat exibe + fala via TTS. `actions[]` é
a lista estruturada de despacho. O cliente de chat valida cada
ação contra o snapshot que enviou (o nac_id existe? o tab_key é
uma aba conhecida?) antes de chamar `NAC.click()` /
`NAC.tab()` / etc.

### 1.3 Formatos de ação

| `kind` | Campos obrigatórios | Mapeia para |
|--------|---------------------|-------------|
| `click` | `nac_id` | `NAC.click(nac_id)` |
| `click_by_verb` | `verb`, `plugin` opcional | `NAC.click_by_verb(plugin, verb)` |
| `fill` | `nac_id`, `value` | `NAC.fill(nac_id, value)` |
| `select` | `nac_id`, `value` | `NAC.select(nac_id, value)` |
| `tab` | `plugin`, `tab_key` | `NAC.tab(plugin, tab_key)` |
| `tab_by_label` | `label`, `plugin` opcional | `NAC.tab_by_label(plugin, label)` |
| `go_to_section` | `nac_id` | `NAC.go_to_section(nac_id)` |
| `drag_drop` | `nac_id`, `target_nac_id`, `to_index` opcional | `NAC.drag_drop(...)` |
| `say` | `text` | apenas botSpeak, sem ação no DOM |
| `change_locale` | `locale` (2 letras) | `NacChat.setLang(locale)` |
| `dt_add_row` | `table_id`, `values` | `NAC.dt_add_row(...)` |
| `dt_remove_row` | `table_id`, `row_id` | `NAC.dt_remove_row(...)` |
| `dt_edit_cell` | `table_id`, `row_id`, `column`, `value` | `NAC.dt_edit_cell(...)` |
| `dt_commit` | `table_id` | `NAC.dt_commit(...)` |
| `dt_discard` | `table_id` | `NAC.dt_discard(...)` |
| `dt_read_aggregate` | `table_id`, `agg_key`, `column` | `NAC.dt_read_aggregate(...)` |

A enumeração completa está no switch `_dispatchAction()` do
cliente de chat (`js/nac-chat-client.js`).

---

## 2. Backend de referência (Node + Anthropic SDK)

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

Aponte seu cliente de chat para ele:

```js
NacChat._endpoint = 'http://localhost:3000/';
```

---

## 3. Validação -- antes do despacho

Defesa crítica: valide cada ação retornada pelo LLM contra
o snapshot que você enviou.

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

O cliente de referência (`js/nac-chat-client.js`) faz isso em
`_dispatchAction`. Não pule essa etapa -- é a única defesa
contra um LLM que alucina ids ou executa injeção de prompt.

---

## 4. Tratamento de locale

O `lang` do usuário é um campo explícito na requisição. O system
prompt instrui o modelo a responder nesse idioma. Duas considerações
adicionais:

- Se o usuário pedir para trocar de idioma ("cambia a inglés"), o
  modelo retorna `{ kind: 'change_locale', locale: 'en' }`. O
  cliente chama `NacChat.setLang('en')` e a próxima requisição
  carrega `lang: 'en'`.
- O falso positivo do código de 2 letras: o `_detectLangSwitch`
  do cliente de chat faz um curto-circuito na chamada ao LLM quando
  a entrada do usuário corresponde a um padrão de troca de locale. A
  correção foi aplicada em 2026-05-09: códigos de 2 letras isolados
  (`de`, `es`, `en`) só são tratados como códigos de locale quando
  uma palavra-gatilho de idioma explícita também está presente. Sem
  essa correção, "cambia DE pestana" trocava silenciosamente para
  alemão.

---

## 5. Tamanho do snapshot

Uma página ativa pode produzir um snapshot grande (50+ plugins * 30
elementos * 10 locales = 15.000+ entradas). Nos preços do Claude Sonnet,
isso representa dinheiro real por requisição.

Opções:

- **Filtro por plugin ativo.** Envie apenas o plugin ativo + seus
  pais na árvore de escopo. O `snapshotTree()` do cliente de chat
  já inclui apenas os plugins montados.
- **Snapshot de locale único.** Reduza `label_i18n` para apenas o
  `lang` atual do usuário. O cliente pode traduzir novamente no
  despacho.
- **Poda de elementos.** Inclua apenas `role: 'action'`, `'tab'`,
  `'field'`, `'option'` -- ignore `'section'`, `'region'` e
  elementos decorativos. O agente raramente os referencia diretamente.

Na implantação em produção da Yujin, a poda reduz o tamanho do snapshot
em ~10x sem perda de precisão na resolução.

---

## 6. Streaming e latência

O backend de referência acima não usa streaming. Para fluxos de voz
(quando o usuário quer que o TTS comece o mais rápido possível), use
streaming:

- Transmita a resposta do LLM conforme ela chega.
- Assim que o campo `message` for parseável (tipicamente dentro dos
  primeiros 50 tokens), inicie o TTS.
- Aguarde o `actions[]` até o JSON estar completo; despache-os
  após o `message` terminar de ser falado.

O cliente de chat NÃO faz streaming hoje; isso é um candidato para a v2.2.

---

## 7. Multi-LLM

Trocar de LLM é basicamente uma questão de system prompt + SDK.
O formato de wire do NAC3 não muda.

- **OpenAI:** `gpt-4-turbo` ou `gpt-5` funcionam bem. Use
  `response_format: { type: 'json_object' }` para forçar saída JSON
  (elimina o branch de fallback de parse).
- **Gemini:** `gemini-1.5-pro`. Mesmo formato; use
  `responseMimeType: 'application/json'`.
- **Local (Ollama, vLLM):** modelos menores têm dificuldade com o
  snapshot completo. Pode agressivamente (seção 5) e use um template
  de prompt menor que liste apenas verbos. A qualidade cai, mas
  funciona offline.

A implantação em produção da Yujin usa Claude Sonnet por custo +
latência + precisão no uso de ferramentas. Fizemos benchmark com GPT-4 Turbo e
Gemini 1.5 Pro; ambos funcionam, ambos custam mais por requisição no
nosso tamanho de prompt.

---

## 8. Hardening para produção

Antes de publicar:

1. **Autenticação.** O endpoint intermediário DEVE exigir um token de
   sessão da sua aplicação autenticada. Caso contrário, um atacante
   o chama diretamente e obtém acesso gratuito ao Claude.
2. **Rate limit.** Por sessão, por tenant. O `core/Orchestrator.php`
   de referência na base de código da Yujin tem um `TenantRateLimiter`
   que você pode adaptar.
3. **Confiança no snapshot.** O `nac_tree` chega do cliente.
   Trate-o como não confiável: não o registre em logs sem sanitização;
   não permita que uma ação referencie um id que não estava no snapshot
   desta requisição.
4. **Logging.** Registre apenas o prompt + as ações escolhidas, não o
   snapshot. Snapshots podem conter dados do usuário (nomes, valores).
5. **Controle de custo.** Contador de tokens por tenant. Interrupção
   forçada ao atingir o limite do plano.

---

## 9. Referência: formato do endpoint em produção

O endpoint de produção da Yujin está em
`/crm/api/v1/yujin/nac-demo`. Fonte:
`yujin.app/crm/api/v1/yujin.php`. Ele implementa tudo o que foi
descrito acima, além de contadores de uso por tenant (F15) e o log de
auditoria (`yujin_assistant_log`). Leia-o como exemplo battle-tested;
copie o que for útil.

---

*This is a machine translation of the canonical English
version at `/nac-spec/guides/LLM_WIRING.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
