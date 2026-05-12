---
translation_source: guides/LLM_WIRING.md
translation_source_hash: 746145f0be3bee6ca1e8d89095de3168e60f2d7c55bf1af78a0086203be97555
translation_quality: machine_v1
translation_lang: ja
translation_date: 2026-05-11T14:39:17.735302+00:00
---

# NAC3 + LLM 仲介バックエンド

このガイドでは、ユーザーのプロンプト（"guardar la factura"、"ve a permisos"、"borra el teclado"）をチャットクライアントがディスパッチする NAC3 アクションに変換するバックエンドを構築します。

NAC3 が標準化するのは、このバックエンドの入出力のみです。使用する LLM、プロンプトテンプレート、レート制限、モデレーションはすべて開発者が決定します。このガイドでは Claude を使った最もシンプルな実装例を示しますが、同じパターンは OpenAI、Gemini、またはローカルモデルにも適用できます。

---

## 1. コントラクト

### 1.1 リクエスト: クライアント -> バックエンド

POST `/your-endpoint`、JSON ボディ:

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

チャットクライアントは `NacChat.snapshotTree()` を通じて `nac_tree` スナップショットを提供します。これはランタイムの `NAC.describe()` と `NAC.describe_v2()` によって生成されます。LLM がページ状態を把握できる唯一の情報源です。

### 1.2 レスポンス: バックエンド -> クライアント

```json
{
  "ok":      true,
  "message": "Abriendo la pestana Permisos.",
  "actions": [
    { "kind": "tab", "plugin": "invoice_edit_modal", "tab_key": "tab.permissions" }
  ]
}
```

`message` はチャットに表示され、TTS で読み上げられる内容です。`actions[]` は構造化されたディスパッチリストです。チャットクライアントは `NAC.click()` / `NAC.tab()` などを呼び出す前に、送信したスナップショットに対して各アクションを検証します（nac_id が存在するか、tab_key が既知のタブかなど）。

### 1.3 アクションの形式

| `kind` | 必須フィールド | マップ先 |
|--------|----------------|---------|
| `click` | `nac_id` | `NAC.click(nac_id)` |
| `click_by_verb` | `verb`、オプション `plugin` | `NAC.click_by_verb(plugin, verb)` |
| `fill` | `nac_id`、`value` | `NAC.fill(nac_id, value)` |
| `select` | `nac_id`、`value` | `NAC.select(nac_id, value)` |
| `tab` | `plugin`、`tab_key` | `NAC.tab(plugin, tab_key)` |
| `tab_by_label` | `label`、オプション `plugin` | `NAC.tab_by_label(plugin, label)` |
| `go_to_section` | `nac_id` | `NAC.go_to_section(nac_id)` |
| `drag_drop` | `nac_id`、`target_nac_id`、オプション `to_index` | `NAC.drag_drop(...)` |
| `say` | `text` | botSpeak のみ、DOM アクションなし |
| `change_locale` | `locale`（2文字コード） | `NacChat.setLang(locale)` |
| `dt_add_row` | `table_id`、`values` | `NAC.dt_add_row(...)` |
| `dt_remove_row` | `table_id`、`row_id` | `NAC.dt_remove_row(...)` |
| `dt_edit_cell` | `table_id`、`row_id`、`column`、`value` | `NAC.dt_edit_cell(...)` |
| `dt_commit` | `table_id` | `NAC.dt_commit(...)` |
| `dt_discard` | `table_id` | `NAC.dt_discard(...)` |
| `dt_read_aggregate` | `table_id`、`agg_key`、`column` | `NAC.dt_read_aggregate(...)` |

完全な列挙はチャットクライアントの `_dispatchAction()` スイッチ（`js/nac-chat-client.js`）に記載されています。

---

## 2. リファレンスバックエンド（Node + Anthropic SDK）

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

チャットクライアントからこのエンドポイントを指定します:

```js
NacChat._endpoint = 'http://localhost:3000/';
```

---

## 3. バリデーション — ディスパッチ前

重要な防御策: LLM が返したすべてのアクションを、送信したスナップショットに対して検証します。

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

リファレンスクライアント（`js/nac-chat-client.js`）はこの処理を `_dispatchAction` 内で行っています。省略しないでください — これが、LLM が存在しない ID をハルシネーションしたり、プロンプトインジェクションを実行したりすることに対する唯一の防御策です。

---

## 4. ロケール処理

ユーザーの `lang` はリクエストの明示的なフィールドです。システムプロンプトはモデルにその言語で返答するよう指示します。追加で考慮すべき点が2つあります:

- ユーザーが言語切り替えを要求した場合（"cambia a inglés" など）、モデルは `{ kind: 'change_locale', locale: 'en' }` を返します。クライアントは `NacChat.setLang('en')` を呼び出し、次のリクエストには `lang: 'en'` が含まれます。
- 2文字コードの誤検知: チャットクライアントの `_detectLangSwitch` は、ユーザーの入力がロケール切り替えパターンに一致する場合、LLM のラウンドトリップをショートサーキットします。2026-05-09 にリリースされた修正により、裸の2文字コード（`de`、`es`、`en`）は、明示的な言語トリガーワードが同時に存在する場合にのみロケールコードとして扱われます。この修正がなければ、"cambia DE pestana" がサイレントにドイツ語へ切り替わっていました。

---

## 5. スナップショットのサイズ

ライブページは大きなスナップショットを生成することがあります（50以上のプラグイン × 30要素 × 10ロケール = 15,000以上のエントリ）。Claude Sonnet の料金体系では、リクエストごとに無視できないコストになります。

対策:

- **アクティブプラグインフィルター。** アクティブなプラグインとスコープツリー内の親のみを送信します。チャットクライアントの `snapshotTree()` はすでにマウント済みのプラグインのみを含んでいます。
- **単一ロケールスナップショット。** `label_i18n` をユーザーの現在の `lang` のみに絞り込みます。クライアントはディスパッチ時に再翻訳できます。
- **要素の刈り込み。** `role: 'action'`、`'tab'`、`'field'`、`'option'` のみを含め、`'section'`、`'region'`、装飾的な要素はスキップします。エージェントがこれらを直接ターゲットにすることはほとんどありません。

Yujin のプロダクション環境では、この刈り込みによってスナップショットサイズが約10分の1に削減され、解決精度の低下はありませんでした。

---

## 6. ストリーミングとレイテンシ

上記のリファレンスバックエンドは非ストリーミングです。音声フロー（ユーザーが TTS をできるだけ早く開始したい場合）では、ストリーミングを使用します:

- LLM のレスポンスを受信しながらストリーミングします。
- `message` フィールドがパース可能になった時点（通常は最初の50トークン以内）で TTS を開始します。
- JSON が完成するまで `actions[]` を保留し、`message` の読み上げが終わった後にディスパッチします。

チャットクライアントは現時点ではストリーミングに対応していません。これは v2.2 の候補機能です。

---

## 7. マルチ LLM

LLM の切り替えは、主にシステムプロンプトと SDK の変更で対応できます。NAC3 のワイヤーフォーマットは変わりません。

- **OpenAI:** `gpt-4-turbo` または `gpt-5` が良好に動作します。`response_format: { type: 'json_object' }` を使用して JSON 出力を強制することで、パースフォールバック処理を省略できます。
- **Gemini:** `gemini-1.5-pro`。同じ形式で、`responseMimeType: 'application/json'` を使用します。
- **ローカル（Ollama、vLLM）:** 小規模モデルはフルスナップショットの処理が苦手です。積極的に刈り込み（セクション5参照）を行い、動詞のみをリストアップした小さなプロンプトテンプレートを使用してください。品質は低下しますが、オフラインで動作します。

Yujin のプロダクション環境では、コスト・レイテンシ・ツール使用精度の観点から Claude Sonnet を採用しています。GPT-4 Turbo と Gemini 1.5 Pro もベンチマーク済みで、どちらも動作しますが、現在のプロンプトサイズではリクエストあたりのコストが高くなります。

---

## 8. プロダクション向け堅牢化

リリース前に確認すべき事項:

1. **認証。** 仲介エンドポイントは、認証済みアプリのセッショントークンを必須にしなければなりません。そうしないと、攻撃者が直接呼び出して Claude を無料で利用できてしまいます。
2. **レート制限。** セッション単位、テナント単位で設定します。Yujin コードベースのリファレンス `core/Orchestrator.php` には、参考にできる `TenantRateLimiter` が含まれています。
3. **スナップショットの信頼性。** `nac_tree` はクライアントから送信されます。信頼できないデータとして扱ってください。サニタイズせずにログに記録しないこと、また今回のリクエストのスナップショットに含まれていない ID をアクションが参照しないようにしてください。
4. **ロギング。** スナップショットではなく、プロンプトと選択されたアクションのみをログに記録します。スナップショットにはユーザーデータ（氏名、金額など）が含まれる場合があります。
5. **コスト制限。** テナントごとのトークンカウンター。プランの上限に達したら強制停止します。

---

## 9. リファレンス: プロダクションエンドポイントの形式

Yujin のプロダクションエンドポイントは `/crm/api/v1/yujin/nac-demo` にあります。ソース: `yujin.app/crm/api/v1/yujin.php`。上記のすべてに加え、テナントごとの使用量カウンター（F15）と監査ログ（`yujin_assistant_log`）を実装しています。実戦で検証済みの例として参照し、必要な部分を流用してください。

---

*This is a machine translation of the canonical English
version at `/nac-spec/guides/LLM_WIRING.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
