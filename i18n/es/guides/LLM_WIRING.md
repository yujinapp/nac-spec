---
translation_source: guides/LLM_WIRING.md
translation_source_hash: 746145f0be3bee6ca1e8d89095de3168e60f2d7c55bf1af78a0086203be97555
translation_quality: machine_v1
translation_lang: es
translation_date: 2026-05-11T13:23:56.517737+00:00
---

# NAC3 + intermediario LLM

Esta guía construye el backend que convierte los prompts del usuario ("guardar la
factura", "ve a permisos", "borra el teclado") en acciones NAC3
que el cliente de chat despacha.

NAC3 estandariza únicamente las entradas y salidas de este backend. El
LLM que elijas, la plantilla de prompt, los límites de tasa y la
moderación son decisiones tuyas. Esta guía muestra la forma más simple
que funciona con Claude; el mismo patrón aplica a OpenAI,
Gemini o un modelo local.

---

## 1. El contrato

### 1.1 Solicitud: cliente -> backend

POST `/your-endpoint`, cuerpo JSON:

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

El cliente de chat provee el snapshot `nac_tree` mediante
`NacChat.snapshotTree()`; el runtime lo produce con `NAC.describe()` +
`NAC.describe_v2()`. Es la única vista que tiene el LLM del
estado de la página.

### 1.2 Respuesta: backend -> cliente

```json
{
  "ok":      true,
  "message": "Abriendo la pestana Permisos.",
  "actions": [
    { "kind": "tab", "plugin": "invoice_edit_modal", "tab_key": "tab.permissions" }
  ]
}
```

`message` es lo que el chat muestra y reproduce por TTS. `actions[]` es
la lista estructurada de despacho. El cliente de chat valida cada
acción contra el snapshot que envió (¿existe el nac_id? ¿es
el tab_key una pestaña conocida?) antes de llamar a `NAC.click()` /
`NAC.tab()` / etc.

### 1.3 Formas de acción

| `kind` | Campos requeridos | Mapea a |
|--------|------------------|---------|
| `click` | `nac_id` | `NAC.click(nac_id)` |
| `click_by_verb` | `verb`, `plugin` opcional | `NAC.click_by_verb(plugin, verb)` |
| `fill` | `nac_id`, `value` | `NAC.fill(nac_id, value)` |
| `select` | `nac_id`, `value` | `NAC.select(nac_id, value)` |
| `tab` | `plugin`, `tab_key` | `NAC.tab(plugin, tab_key)` |
| `tab_by_label` | `label`, `plugin` opcional | `NAC.tab_by_label(plugin, label)` |
| `go_to_section` | `nac_id` | `NAC.go_to_section(nac_id)` |
| `drag_drop` | `nac_id`, `target_nac_id`, `to_index` opcional | `NAC.drag_drop(...)` |
| `say` | `text` | solo botSpeak, sin acción DOM |
| `change_locale` | `locale` (2 letras) | `NacChat.setLang(locale)` |
| `dt_add_row` | `table_id`, `values` | `NAC.dt_add_row(...)` |
| `dt_remove_row` | `table_id`, `row_id` | `NAC.dt_remove_row(...)` |
| `dt_edit_cell` | `table_id`, `row_id`, `column`, `value` | `NAC.dt_edit_cell(...)` |
| `dt_commit` | `table_id` | `NAC.dt_commit(...)` |
| `dt_discard` | `table_id` | `NAC.dt_discard(...)` |
| `dt_read_aggregate` | `table_id`, `agg_key`, `column` | `NAC.dt_read_aggregate(...)` |

La enumeración completa está en el switch `_dispatchAction()` del
cliente de chat (`js/nac-chat-client.js`).

---

## 2. Backend de referencia (Node + Anthropic SDK)

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

Apunta tu cliente de chat hacia él:

```js
NacChat._endpoint = 'http://localhost:3000/';
```

---

## 3. Validación -- antes del despacho

Defensa crítica: valida cada acción que devuelve el LLM contra
el snapshot que enviaste.

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

El cliente de referencia (`js/nac-chat-client.js`) hace esto en
`_dispatchAction`. No lo omitas -- es la única defensa
contra un LLM que alucina ids o ejecuta inyección de prompts.

---

## 4. Manejo de locale

El `lang` del usuario es un campo explícito en la solicitud. El system
prompt le indica al modelo que responda en ese idioma. Dos consideraciones adicionales:

- Si el usuario pide cambiar de idioma ("cambia a inglés"), el
  modelo devuelve `{ kind: 'change_locale', locale: 'en' }`. El
  cliente llama a `NacChat.setLang('en')` y la siguiente solicitud
  lleva `lang: 'en'`.
- El falso positivo del código de 2 letras: el `_detectLangSwitch`
  del cliente de chat cortocircuita el ciclo al LLM cuando la
  entrada del usuario coincide con un patrón de cambio de locale. La corrección
  se aplicó el 2026-05-09: los códigos de 2 letras sueltos (`de`, `es`, `en`) solo
  se tratan como códigos de locale cuando también está presente una palabra
  disparadora de idioma explícita. Sin esa corrección, "cambia DE pestana"
  cambiaba silenciosamente al alemán.

---

## 5. Tamaño del snapshot

Una página en producción puede generar un snapshot grande (50+ plugins × 30
elementos × 10 locales = 15 000+ entradas). Con los precios de Claude Sonnet
eso representa dinero real por solicitud.

Opciones:

- **Filtro por plugin activo.** Envía solo el plugin activo y sus
  padres en el árbol de scope. El `snapshotTree()` del cliente de chat
  ya incluye solo los plugins montados.
- **Snapshot de un solo locale.** Reduce `label_i18n` al `lang`
  actual del usuario. El cliente puede retraducir al despachar.
- **Poda de elementos.** Incluye solo `role: 'action'`, `'tab'`,
  `'field'`, `'option'` -- omite `'section'`, `'region'` y
  elementos decorativos. El agente raramente los apunta directamente.

En el despliegue en producción de Yujin, la poda reduce el tamaño del snapshot
~10x sin pérdida en la precisión de resolución.

---

## 6. Streaming y latencia

El backend de referencia anterior no usa streaming. Para flujos de voz
(el usuario quiere que el TTS comience lo antes posible), usa streaming:

- Transmite la respuesta del LLM a medida que llega.
- En cuanto el campo `message` sea parseable (típicamente dentro de
  los primeros 50 tokens), inicia el TTS.
- Retén `actions[]` hasta que el JSON esté completo; despáchalos
  después de que `message` termine de reproducirse.

El cliente de chat NO hace streaming hoy; es un candidato para v2.2.

---

## 7. Multi-LLM

Cambiar de LLM es principalmente cuestión del system prompt y el
SDK. El formato de wire de NAC3 no cambia.

- **OpenAI:** `gpt-4-turbo` o `gpt-5` funcionan bien. Usa
  `response_format: { type: 'json_object' }` para forzar salida JSON
  (elimina la rama de fallback del parser).
- **Gemini:** `gemini-1.5-pro`. Misma forma; usa
  `responseMimeType: 'application/json'`.
- **Local (Ollama, vLLM):** los modelos más pequeños tienen dificultades con el
  snapshot completo. Poda agresivamente (sec. 5) y usa una plantilla de
  prompt más pequeña que liste solo verbos. La calidad baja pero funciona
  sin conexión.

El despliegue en producción de Yujin usa Claude Sonnet por costo +
latencia + precisión en el uso de herramientas. Hemos comparado GPT-4 Turbo y
Gemini 1.5 Pro; ambos funcionan, ambos cuestan más por solicitud con
nuestro tamaño de prompt.

---

## 8. Hardening para producción

Antes de publicar:

1. **Autenticación.** El endpoint del intermediario DEBE requerir un token de sesión
   de tu aplicación autenticada. De lo contrario, un atacante lo llama
   directamente y obtiene acceso gratuito a Claude.
2. **Límite de tasa.** Por sesión, por tenant. El
   `core/Orchestrator.php` de referencia en el código de Yujin tiene un
   `TenantRateLimiter` que puedes adaptar.
3. **Confianza en el snapshot.** El `nac_tree` llega desde el cliente.
   Trátalo como no confiable: no lo vuelques en logs sin
   sanitización; no permitas que una acción referencie un id que no estaba
   en el snapshot de esta solicitud.
4. **Logging.** Registra solo el prompt y las acciones elegidas, no el
   snapshot. Los snapshots pueden contener datos del usuario (nombres, montos).
5. **Control de costos.** Contador de tokens por tenant. Detención forzada al
   alcanzar el límite del plan.

---

## 9. Referencia: forma del endpoint en producción

El endpoint de producción de Yujin está en
`/crm/api/v1/yujin/nac-demo`. Fuente:
`yujin.app/crm/api/v1/yujin.php`. Implementa todo lo anterior
más contadores de uso por tenant (F15) y el log de auditoría
(`yujin_assistant_log`). Léelo como ejemplo probado en producción;
copia lo que aplique.

---

*This is a machine translation of the canonical English
version at `/nac-spec/guides/LLM_WIRING.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
