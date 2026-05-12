---
translation_source: guides/LLM_WIRING.md
translation_source_hash: 746145f0be3bee6ca1e8d89095de3168e60f2d7c55bf1af78a0086203be97555
translation_quality: machine_v1
translation_lang: de
translation_date: 2026-05-11T14:29:09.323316+00:00
---

# NAC3 + LLM Intermediary

Diese Anleitung beschreibt den Backend-Aufbau, der Benutzereingaben ("guardar la
factura", "ve a permisos", "borra el teclado") in NAC3-Aktionen umwandelt,
die der Chat-Client ausführt.

NAC3 standardisiert ausschließlich die Ein- und Ausgaben dieses Backends. Die
Wahl des LLM, das Prompt-Template, die Rate-Limits und die Moderation
liegen bei Ihnen. Diese Anleitung zeigt die einfachste funktionierende
Implementierung mit Claude; dasselbe Muster gilt für OpenAI, Gemini
oder ein lokales Modell.

---

## 1. Der Vertrag

### 1.1 Anfrage: Client -> Backend

POST `/your-endpoint`, JSON-Body:

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

Der Chat-Client stellt den `nac_tree`-Snapshot über
`NacChat.snapshotTree()` bereit; die Runtime erzeugt ihn mit `NAC.describe()` +
`NAC.describe_v2()`. Er ist die einzige Sicht des LLM auf den
Seitenzustand.

### 1.2 Antwort: Backend -> Client

```json
{
  "ok":      true,
  "message": "Abriendo la pestana Permisos.",
  "actions": [
    { "kind": "tab", "plugin": "invoice_edit_modal", "tab_key": "tab.permissions" }
  ]
}
```

`message` ist das, was der Chat anzeigt und per TTS vorliest. `actions[]` ist
die strukturierte Dispatch-Liste. Der Chat-Client validiert jede
Aktion gegen den gesendeten Snapshot (existiert die nac_id? ist
der tab_key ein bekannter Tab?), bevor er `NAC.click()` /
`NAC.tab()` / etc. aufruft.

### 1.3 Aktionsformen

| `kind` | Pflichtfelder | Entspricht |
|--------|---------------|------------|
| `click` | `nac_id` | `NAC.click(nac_id)` |
| `click_by_verb` | `verb`, optional `plugin` | `NAC.click_by_verb(plugin, verb)` |
| `fill` | `nac_id`, `value` | `NAC.fill(nac_id, value)` |
| `select` | `nac_id`, `value` | `NAC.select(nac_id, value)` |
| `tab` | `plugin`, `tab_key` | `NAC.tab(plugin, tab_key)` |
| `tab_by_label` | `label`, optional `plugin` | `NAC.tab_by_label(plugin, label)` |
| `go_to_section` | `nac_id` | `NAC.go_to_section(nac_id)` |
| `drag_drop` | `nac_id`, `target_nac_id`, optional `to_index` | `NAC.drag_drop(...)` |
| `say` | `text` | nur botSpeak, keine DOM-Aktion |
| `change_locale` | `locale` (2-stellig) | `NacChat.setLang(locale)` |
| `dt_add_row` | `table_id`, `values` | `NAC.dt_add_row(...)` |
| `dt_remove_row` | `table_id`, `row_id` | `NAC.dt_remove_row(...)` |
| `dt_edit_cell` | `table_id`, `row_id`, `column`, `value` | `NAC.dt_edit_cell(...)` |
| `dt_commit` | `table_id` | `NAC.dt_commit(...)` |
| `dt_discard` | `table_id` | `NAC.dt_discard(...)` |
| `dt_read_aggregate` | `table_id`, `agg_key`, `column` | `NAC.dt_read_aggregate(...)` |

Die vollständige Auflistung befindet sich im
`_dispatchAction()`-Switch des Chat-Clients (`js/nac-chat-client.js`).

---

## 2. Referenz-Backend (Node + Anthropic SDK)

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

Chat-Client darauf ausrichten:

```js
NacChat._endpoint = 'http://localhost:3000/';
```

---

## 3. Validierung -- vor dem Dispatch

Kritische Absicherung: Jede vom LLM zurückgegebene Aktion muss gegen
den gesendeten Snapshot validiert werden.

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

Der Referenz-Client (`js/nac-chat-client.js`) führt dies in
`_dispatchAction` durch. Diesen Schritt nicht überspringen -- er ist die einzige Absicherung
gegen ein LLM, das IDs halluziniert oder Prompt-Injection ausführt.

---

## 4. Locale-Behandlung

Das Feld `lang` in der Anfrage gibt die Sprache des Benutzers explizit an. Der System-Prompt
weist das Modell an, in dieser Sprache zu antworten. Zwei weitere
Punkte sind zu beachten:

- Wenn der Benutzer einen Sprachwechsel anfordert ("cambia a inglés"),
  gibt das Modell `{ kind: 'change_locale', locale: 'en' }` zurück. Der
  Client ruft `NacChat.setLang('en')` auf, und die nächste Anfrage
  enthält `lang: 'en'`.
- Das Falsch-Positiv-Problem bei 2-stelligen Codes: Die
  `_detectLangSwitch`-Funktion des Chat-Clients umgeht den LLM-Roundtrip,
  wenn die Benutzereingabe einem Sprachwechsel-Muster entspricht. Der Fix wurde
  am 2026-05-09 eingespielt: Bare 2-stellige Codes (`de`, `es`, `en`) werden nur
  dann als Locale-Codes behandelt, wenn auch ein explizites Sprach-Triggerwort
  vorhanden ist. Ohne diesen Fix wechselte "cambia DE pestana"
  stillschweigend auf Deutsch.

---

## 5. Snapshot-Größe

Eine aktive Seite kann einen großen Snapshot erzeugen (50+ Plugins × 30
Elemente × 10 Locales = 15.000+ Einträge). Bei Claude Sonnet-Preisen
sind das reale Kosten pro Anfrage.

Optionen:

- **Aktiv-Plugin-Filter.** Nur das aktive Plugin und seine
  übergeordneten Elemente im Scope-Tree senden. `snapshotTree()` des Chat-Clients
  enthält bereits nur gemountete Plugins.
- **Einzel-Locale-Snapshot.** `label_i18n` auf die aktuelle `lang` des
  Benutzers reduzieren. Der Client kann beim Dispatch neu übersetzen.
- **Element-Pruning.** Nur `role: 'action'`, `'tab'`,
  `'field'`, `'option'` einschließen -- `'section'`, `'region'` und
  dekorative Elemente weglassen. Der Agent zielt selten direkt auf diese ab.

Im Produktionseinsatz bei Yujin reduziert das Pruning die Snapshot-Größe
um den Faktor ~10 ohne Einbußen bei der Auflösungsgenauigkeit.

---

## 6. Streaming und Latenz

Das obige Referenz-Backend ist nicht-streamend. Für Voice-Flows
(der Benutzer möchte, dass TTS so früh wie möglich beginnt), Streaming verwenden:

- LLM-Antwort streamen, sobald sie eintrifft.
- Sobald das `message`-Feld parsebar ist (typischerweise innerhalb der
  ersten 50 Token), TTS starten.
- `actions[]` zurückhalten, bis das JSON vollständig ist; nach Abschluss
  der `message`-Ausgabe dispatchen.

Der Chat-Client unterstützt heute kein Streaming; dies ist ein Kandidat für v2.2.

---

## 7. Multi-LLM

Der Wechsel zwischen LLMs ist hauptsächlich eine Frage des System-Prompts und des
SDK. Das NAC3-Wire-Format ändert sich nicht.

- **OpenAI:** `gpt-4-turbo` oder `gpt-5` funktionieren gut. Mit
  `response_format: { type: 'json_object' }` JSON-Ausgabe erzwingen
  (eliminiert den Parse-Fallback-Zweig).
- **Gemini:** `gemini-1.5-pro`. Gleiche Struktur; mit
  `responseMimeType: 'application/json'` verwenden.
- **Lokal (Ollama, vLLM):** Kleinere Modelle haben Schwierigkeiten mit dem
  vollständigen Snapshot. Aggressiv prunen (Abschn. 5) und ein kleineres
  Prompt-Template verwenden, das nur Verben auflistet. Qualität sinkt, funktioniert aber
  offline.

Der Yujin-Produktionseinsatz verwendet Claude Sonnet wegen Kosten +
Latenz + Tool-Use-Genauigkeit. GPT-4 Turbo und
Gemini 1.5 Pro wurden benchmarkt; beide funktionieren, kosten bei unserer
Prompt-Größe jedoch mehr pro Anfrage.

---

## 8. Produktionshärtung

Vor dem Deployment:

1. **Auth.** Der Intermediary-Endpunkt MUSS ein Session-Token
   der authentifizierten App erfordern. Andernfalls kann ein Angreifer ihn
   direkt aufrufen und erhält kostenlosen Claude-Zugang.
2. **Rate-Limit.** Pro Session, pro Tenant. Der Referenz-Code
   `core/Orchestrator.php` in der Yujin-Codebasis enthält einen
   `TenantRateLimiter`, der angepasst werden kann.
3. **Snapshot-Vertrauen.** Der `nac_tree` kommt vom Client.
   Als nicht vertrauenswürdig behandeln: nicht ohne Bereinigung in Logs schreiben;
   keine Aktion zulassen, die eine ID referenziert, die nicht im Snapshot
   dieser Anfrage enthalten war.
4. **Logging.** Nur Prompt + gewählte Aktionen loggen, nicht den
   Snapshot. Snapshots können Benutzerdaten enthalten (Namen, Beträge).
5. **Cost Guard.** Token-Zähler pro Tenant. Hartes Limit beim
   Plan-Maximum.

---

## 9. Referenz: Produktions-Endpunkt-Form

Der Yujin-Produktionsendpunkt befindet sich unter
`/crm/api/v1/yujin/nac-demo`. Quelle:
`yujin.app/crm/api/v1/yujin.php`. Er implementiert alles oben Genannte
plus Nutzungszähler pro Tenant (F15) und das Audit-Log
(`yujin_assistant_log`). Als praxiserprobtes Beispiel empfehlenswert;
übernehmen, was passt.

---

*This is a machine translation of the canonical English
version at `/nac-spec/guides/LLM_WIRING.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
