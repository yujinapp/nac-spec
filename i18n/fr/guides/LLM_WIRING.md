---
translation_source: guides/LLM_WIRING.md
translation_source_hash: 746145f0be3bee6ca1e8d89095de3168e60f2d7c55bf1af78a0086203be97555
translation_quality: machine_v1
translation_lang: fr
translation_date: 2026-05-11T13:42:19.144420+00:00
---

# NAC3 + intermédiaire LLM

Ce guide décrit la construction du backend qui transforme les prompts utilisateur (« guardar la factura », « ve a permisos », « borra el teclado ») en actions NAC3 que le client de chat exécute.

NAC3 ne standardise que les entrées et sorties de ce backend. Le LLM que vous choisissez, le template de prompt, les limites de débit et la modération sont de votre ressort. Ce guide présente la forme minimale fonctionnelle avec Claude ; le même schéma s'applique à OpenAI, Gemini ou un modèle local.

---

## 1. Le contrat

### 1.1 Requête : client -> backend

POST `/your-endpoint`, corps JSON :

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

Le client de chat fournit le snapshot `nac_tree` via `NacChat.snapshotTree()` ; le runtime `NAC.describe()` + `NAC.describe_v2()` le génèrent. C'est la seule vue que le LLM a de l'état de la page.

### 1.2 Réponse : backend -> client

```json
{
  "ok":      true,
  "message": "Abriendo la pestana Permisos.",
  "actions": [
    { "kind": "tab", "plugin": "invoice_edit_modal", "tab_key": "tab.permissions" }
  ]
}
```

`message` est ce que le chat affiche et prononce via TTS. `actions[]` est la liste structurée des actions à exécuter. Le client de chat valide chaque action par rapport au snapshot envoyé (le nac_id existe-t-il ? le tab_key est-il un onglet connu ?) avant d'appeler `NAC.click()` / `NAC.tab()` / etc.

### 1.3 Formes des actions

| `kind` | Champs requis | Correspond à |
|--------|---------------|--------------|
| `click` | `nac_id` | `NAC.click(nac_id)` |
| `click_by_verb` | `verb`, `plugin` optionnel | `NAC.click_by_verb(plugin, verb)` |
| `fill` | `nac_id`, `value` | `NAC.fill(nac_id, value)` |
| `select` | `nac_id`, `value` | `NAC.select(nac_id, value)` |
| `tab` | `plugin`, `tab_key` | `NAC.tab(plugin, tab_key)` |
| `tab_by_label` | `label`, `plugin` optionnel | `NAC.tab_by_label(plugin, label)` |
| `go_to_section` | `nac_id` | `NAC.go_to_section(nac_id)` |
| `drag_drop` | `nac_id`, `target_nac_id`, `to_index` optionnel | `NAC.drag_drop(...)` |
| `say` | `text` | botSpeak uniquement, aucune action DOM |
| `change_locale` | `locale` (2 lettres) | `NacChat.setLang(locale)` |
| `dt_add_row` | `table_id`, `values` | `NAC.dt_add_row(...)` |
| `dt_remove_row` | `table_id`, `row_id` | `NAC.dt_remove_row(...)` |
| `dt_edit_cell` | `table_id`, `row_id`, `column`, `value` | `NAC.dt_edit_cell(...)` |
| `dt_commit` | `table_id` | `NAC.dt_commit(...)` |
| `dt_discard` | `table_id` | `NAC.dt_discard(...)` |
| `dt_read_aggregate` | `table_id`, `agg_key`, `column` | `NAC.dt_read_aggregate(...)` |

L'énumération complète se trouve dans le switch `_dispatchAction()` du client de chat (`js/nac-chat-client.js`).

---

## 2. Backend de référence (Node + Anthropic SDK)

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

Pointez votre client de chat vers ce backend :

```js
NacChat._endpoint = 'http://localhost:3000/';
```

---

## 3. Validation — avant l'exécution

Défense essentielle : validez chaque action retournée par le LLM par rapport au snapshot envoyé.

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

Le client de référence (`js/nac-chat-client.js`) effectue cette vérification dans `_dispatchAction`. Ne la sautez pas — c'est la seule protection contre un LLM qui hallucine des identifiants ou exécute une injection de prompt.

---

## 4. Gestion des locales

La `lang` de l'utilisateur est un champ explicite de la requête. Le prompt système demande au modèle de répondre dans cette langue. Deux points supplémentaires à considérer :

- Si l'utilisateur demande à changer de langue (« cambia a inglés »), le modèle retourne `{ kind: 'change_locale', locale: 'en' }`. Le client appelle `NacChat.setLang('en')` et la requête suivante porte `lang: 'en'`.
- Le faux positif sur les codes à 2 lettres : le `_detectLangSwitch` du client de chat court-circuite l'aller-retour LLM lorsque la saisie de l'utilisateur correspond à un schéma de changement de locale. Le correctif a été livré le 09/05/2026 : les codes à 2 lettres seuls (`de`, `es`, `en`) ne sont traités comme des codes de locale que lorsqu'un mot déclencheur de langue explicite est également présent. Sans ce correctif, « cambia DE pestana » basculait silencieusement vers l'allemand.

---

## 5. Taille du snapshot

Une page en production peut générer un snapshot volumineux (50+ plugins × 30 éléments × 10 locales = 15 000+ entrées). Au tarif de Claude Sonnet, cela représente un coût réel par requête.

Options :

- **Filtre par plugin actif.** N'envoyez que le plugin actif et ses parents dans l'arbre de portée. Le `snapshotTree()` du client de chat n'inclut déjà que les plugins montés.
- **Snapshot mono-locale.** Réduisez `label_i18n` à la seule `lang` courante de l'utilisateur. Le client peut retraduire à l'exécution.
- **Élagage des éléments.** N'incluez que les éléments avec `role: 'action'`, `'tab'`, `'field'`, `'option'` — ignorez `'section'`, `'region'` et les éléments décoratifs. L'agent les cible rarement directement.

Dans le déploiement en production de Yujin, cet élagage réduit la taille du snapshot d'environ 10× sans perte de précision dans la résolution.

---

## 6. Streaming et latence

Le backend de référence ci-dessus ne fait pas de streaming. Pour les flux vocaux (l'utilisateur souhaite que le TTS démarre le plus tôt possible), utilisez le streaming :

- Diffusez la réponse du LLM au fur et à mesure.
- Dès que le champ `message` est parseable (généralement dans les 50 premiers tokens), démarrez le TTS.
- Attendez que le JSON soit complet avant de traiter `actions[]` ; exécutez-les après la fin de la lecture de `message`.

Le client de chat ne prend pas en charge le streaming aujourd'hui ; c'est un candidat pour la v2.2.

---

## 7. Multi-LLM

Changer de LLM se résume essentiellement à adapter le prompt système et le SDK. Le format wire de NAC3 ne change pas.

- **OpenAI :** `gpt-4-turbo` ou `gpt-5` fonctionnent bien. Utilisez `response_format: { type: 'json_object' }` pour forcer la sortie JSON (élimine la branche de repli sur le parsing).
- **Gemini :** `gemini-1.5-pro`. Même structure ; utilisez `responseMimeType: 'application/json'`.
- **Local (Ollama, vLLM) :** les modèles plus petits peinent avec le snapshot complet. Élaguez agressivement (section 5) et utilisez un template de prompt réduit qui ne liste que les verbes. La qualité baisse mais fonctionne hors ligne.

Le déploiement en production de Yujin utilise Claude Sonnet pour le rapport coût / latence / précision des appels d'outils. Nous avons comparé GPT-4 Turbo et Gemini 1.5 Pro ; les deux fonctionnent, les deux coûtent plus cher par requête à notre taille de prompt.

---

## 8. Durcissement pour la production

Avant de mettre en production :

1. **Authentification.** L'endpoint intermédiaire DOIT exiger un token de session issu de votre application authentifiée. Sinon, un attaquant peut l'appeler directement et obtenir un accès gratuit à Claude.
2. **Limitation de débit.** Par session, par tenant. Le `core/Orchestrator.php` de référence dans la base de code Yujin dispose d'un `TenantRateLimiter` que vous pouvez adapter.
3. **Confiance dans le snapshot.** Le `nac_tree` provient du client. Traitez-le comme non fiable : ne le journalisez pas sans assainissement ; ne laissez pas une action référencer un identifiant absent du snapshot de cette requête.
4. **Journalisation.** Journalisez uniquement le prompt et les actions choisies, pas le snapshot. Les snapshots peuvent contenir des données utilisateur (noms, montants).
5. **Garde-fou de coût.** Compteur de tokens par tenant. Arrêt forcé à la limite du plan.

---

## 9. Référence : forme de l'endpoint en production

L'endpoint de production de Yujin se trouve à `/crm/api/v1/yujin/nac-demo`. Source : `yujin.app/crm/api/v1/yujin.php`. Il implémente tout ce qui précède, ainsi que les compteurs d'utilisation par tenant (F15) et le journal d'audit (`yujin_assistant_log`). Consultez-le pour un exemple éprouvé en production ; reprenez ce qui vous convient.

---

*This is a machine translation of the canonical English
version at `/nac-spec/guides/LLM_WIRING.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
