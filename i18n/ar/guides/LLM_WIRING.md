---
translation_source: guides/LLM_WIRING.md
translation_source_hash: 746145f0be3bee6ca1e8d89095de3168e60f2d7c55bf1af78a0086203be97555
translation_quality: machine_v1
translation_lang: ar
translation_date: 2026-05-11T15:11:00.485532+00:00
---

# NAC3 + وسيط LLM

يشرح هذا الدليل كيفية بناء الواجهة الخلفية التي تحوّل مدخلات المستخدم ("guardar la factura"، "ve a permisos"، "borra el teclado") إلى إجراءات NAC3 يُنفّذها عميل الدردشة.

لا يُقنّن NAC3 سوى مدخلات هذه الواجهة الخلفية ومخرجاتها. أما اختيار نموذج LLM وقالب الـ prompt وحدود معدل الطلبات وآليات الإشراف، فكلها قرارات تعود إليك. يعرض هذا الدليل أبسط تطبيق عملي باستخدام Claude، وينطبق نفس النمط على OpenAI وGemini وأي نموذج محلي.

---

## 1. العقد البرمجي

### 1.1 الطلب: من العميل إلى الواجهة الخلفية

POST إلى `/your-endpoint`، جسم الطلب بصيغة JSON:

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

يوفّر عميل الدردشة لقطة `nac_tree` عبر `NacChat.snapshotTree()`؛ وتُنتجها `NAC.describe()` و`NAC.describe_v2()` في وقت التشغيل. وهي المصدر الوحيد الذي يعتمد عليه نموذج LLM لمعرفة حالة الصفحة.

### 1.2 الاستجابة: من الواجهة الخلفية إلى العميل

```json
{
  "ok":      true,
  "message": "Abriendo la pestana Permisos.",
  "actions": [
    { "kind": "tab", "plugin": "invoice_edit_modal", "tab_key": "tab.permissions" }
  ]
}
```

يُعرض `message` في الدردشة ويُنطق عبر TTS. أما `actions[]` فهي قائمة الإجراءات المنظّمة للتنفيذ. يتحقق عميل الدردشة من صحة كل إجراء مقارنةً باللقطة التي أرسلها (هل يوجد `nac_id`؟ هل `tab_key` علامة تبويب معروفة؟) قبل استدعاء `NAC.click()` أو `NAC.tab()` أو غيرها.

### 1.3 أشكال الإجراءات

| `kind` | الحقول المطلوبة | يُعيَّن إلى |
|--------|-----------------|---------|
| `click` | `nac_id` | `NAC.click(nac_id)` |
| `click_by_verb` | `verb`، و`plugin` اختياري | `NAC.click_by_verb(plugin, verb)` |
| `fill` | `nac_id`، `value` | `NAC.fill(nac_id, value)` |
| `select` | `nac_id`، `value` | `NAC.select(nac_id, value)` |
| `tab` | `plugin`، `tab_key` | `NAC.tab(plugin, tab_key)` |
| `tab_by_label` | `label`، و`plugin` اختياري | `NAC.tab_by_label(plugin, label)` |
| `go_to_section` | `nac_id` | `NAC.go_to_section(nac_id)` |
| `drag_drop` | `nac_id`، `target_nac_id`، و`to_index` اختياري | `NAC.drag_drop(...)` |
| `say` | `text` | نطق عبر botSpeak فقط، بدون إجراء على DOM |
| `change_locale` | `locale` (رمز مكوّن من حرفين) | `NacChat.setLang(locale)` |
| `dt_add_row` | `table_id`، `values` | `NAC.dt_add_row(...)` |
| `dt_remove_row` | `table_id`، `row_id` | `NAC.dt_remove_row(...)` |
| `dt_edit_cell` | `table_id`، `row_id`، `column`، `value` | `NAC.dt_edit_cell(...)` |
| `dt_commit` | `table_id` | `NAC.dt_commit(...)` |
| `dt_discard` | `table_id` | `NAC.dt_discard(...)` |
| `dt_read_aggregate` | `table_id`، `agg_key`، `column` | `NAC.dt_read_aggregate(...)` |

يمكن الاطلاع على القائمة الكاملة في دالة `_dispatchAction()` الخاصة بعميل الدردشة (`js/nac-chat-client.js`).

---

## 2. الواجهة الخلفية المرجعية (Node + Anthropic SDK)

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

وجّه عميل الدردشة إليه:

```js
NacChat._endpoint = 'http://localhost:3000/';
```

---

## 3. التحقق من الصحة — قبل التنفيذ

دفاع أساسي: تحقق من صحة كل إجراء يُعيده نموذج LLM مقارنةً باللقطة التي أرسلتها.

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

يُنفّذ عميل الدردشة المرجعي (`js/nac-chat-client.js`) هذا المنطق داخل `_dispatchAction`. لا تتجاهله — فهو خط الدفاع الوحيد ضد نموذج LLM يخترع معرّفات وهمية أو ينفّذ حقن prompt.

---

## 4. معالجة اللغة والمنطقة

حقل `lang` الخاص بالمستخدم يُرسَل صراحةً في الطلب. يوجّه الـ system prompt النموذجَ للرد بتلك اللغة. ثمة اعتباران إضافيان:

- إذا طلب المستخدم تغيير اللغة ("cambia a inglés")، يُعيد النموذج `{ kind: 'change_locale', locale: 'en' }`. يستدعي العميل `NacChat.setLang('en')` ويحمل الطلب التالي `lang: 'en'`.
- مشكلة الإيجابيات الكاذبة للرموز ثنائية الحرف: تتجاوز دالة `_detectLangSwitch` في عميل الدردشة رحلة الذهاب والإياب إلى نموذج LLM حين يطابق مدخل المستخدم نمط تغيير اللغة. صدر الإصلاح بتاريخ 2026-05-09: لا تُعامَل الرموز ثنائية الحرف (`de`، `es`، `en`) على أنها رموز لغة إلا حين يقترن بها كلمة تشغيل لغوية صريحة. قبل هذا الإصلاح، كانت عبارة "cambia DE pestana" تُحوّل اللغة إلى الألمانية بصمت.

---

## 5. حجم اللقطة

قد تُنتج الصفحة النشطة لقطة ضخمة (50+ إضافة × 30 عنصر × 10 لغات = أكثر من 15000 إدخال). وبأسعار Claude Sonnet، يُمثّل ذلك تكلفة حقيقية لكل طلب.

الخيارات المتاحة:

- **تصفية الإضافات النشطة.** أرسل الإضافة النشطة فقط مع عناصرها الأصلية في شجرة النطاق. تتضمن `snapshotTree()` في عميل الدردشة الإضافات المُحمَّلة فقط بالفعل.
- **لقطة بلغة واحدة.** اختزل `label_i18n` لتقتصر على `lang` الحالية للمستخدم. يمكن للعميل إعادة الترجمة عند التنفيذ.
- **تقليم العناصر.** ضمّن فقط العناصر ذات `role: 'action'` و`'tab'` و`'field'` و`'option'`، وأسقط `'section'` و`'region'` والعناصر الزخرفية. نادرًا ما يستهدف الوكيل تلك العناصر مباشرةً.

في نشر Yujin الإنتاجي، يُقلّص التقليم حجم اللقطة بنحو 10 أضعاف دون أي تراجع في دقة التفسير.

---

## 6. البث والكمون

الواجهة الخلفية المرجعية أعلاه لا تدعم البث. لتدفقات الصوت (حيث يريد المستخدم بدء TTS في أقرب وقت ممكن)، استخدم البث:

- ابثّ استجابة نموذج LLM فور وصولها.
- بمجرد أن يصبح حقل `message` قابلًا للتحليل (عادةً خلال أول 50 رمز)، ابدأ TTS.
- أبقِ `actions[]` معلّقةً حتى اكتمال JSON؛ نفّذها بعد انتهاء نطق `message`.

لا يدعم عميل الدردشة البث حاليًا؛ وهو مرشّح لإصدار v2.2.

---

## 7. تعدد نماذج LLM

تغيير نموذج LLM يتعلق أساسًا بالـ system prompt والـ SDK. لا يتغير تنسيق سلك NAC3.

- **OpenAI:** يعمل `gpt-4-turbo` أو `gpt-5` بشكل جيد. استخدم `response_format: { type: 'json_object' }` لإلزام مخرجات JSON (يُلغي فرع الاحتياط في التحليل).
- **Gemini:** `gemini-1.5-pro`. نفس الشكل؛ استخدم `responseMimeType: 'application/json'`.
- **النماذج المحلية (Ollama، vLLM):** تُعاني النماذج الأصغر مع اللقطة الكاملة. قلّم بقوة (القسم 5) واستخدم قالب prompt أصغر يسرد الأفعال فقط. تنخفض الجودة لكنها تعمل دون اتصال.

يستخدم نشر Yujin الإنتاجي Claude Sonnet لأسباب تتعلق بالتكلفة والكمون ودقة استخدام الأدوات. اختبرنا GPT-4 Turbo وGemini 1.5 Pro؛ كلاهما يعمل، وكلاهما أعلى تكلفةً لكل طلب بحجم الـ prompt لدينا.

---

## 8. التصليب للإنتاج

قبل الإطلاق:

1. **المصادقة.** يجب أن تشترط نقطة نهاية الوسيط رمز جلسة من تطبيقك المُصادَق عليه. وإلا يمكن للمهاجم استدعاؤها مباشرةً والحصول على وصول مجاني إلى Claude.
2. **تحديد معدل الطلبات.** على مستوى الجلسة والمستأجر. يحتوي `core/Orchestrator.php` المرجعي في قاعدة كود Yujin على `TenantRateLimiter` يمكنك تكييفه.
3. **الثقة باللقطة.** تصل `nac_tree` من العميل. تعامل معها كمصدر غير موثوق: لا تُدرجها في السجلات دون تعقيم؛ ولا تسمح لإجراء بالإشارة إلى معرّف لم يكن في لقطة هذا الطلب.
4. **التسجيل.** سجّل الـ prompt والإجراءات المختارة فقط، لا اللقطة. قد تحتوي اللقطات على بيانات مستخدمين (أسماء، مبالغ).
5. **حارس التكلفة.** عدّاد رموز لكل مستأجر. إيقاف صارم عند بلوغ حد الخطة.

---

## 9. مرجع: شكل نقطة النهاية الإنتاجية

نقطة نهاية Yujin الإنتاجية موجودة في `/crm/api/v1/yujin/nac-demo`. المصدر: `yujin.app/crm/api/v1/yujin.php`. تُطبّق كل ما سبق إضافةً إلى عدّادات الاستخدام لكل مستأجر (F15) وسجل التدقيق (`yujin_assistant_log`). اطّلع عليها للحصول على مثال مُختبَر في بيئة إنتاجية؛ وانسخ ما يناسبك منها.

---

*This is a machine translation of the canonical English
version at `/nac-spec/guides/LLM_WIRING.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
