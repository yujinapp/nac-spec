<?php
/**
 * example-v23-editor.php -- NAC v2.3 preview: field editor
 * primitive (V23-01).
 *
 * Showcases NAC.edit_field() opening a Word-style modal over
 * any editable widget. The modal registers its own plugin
 * ('nac_editor') with 8 NAC3-callable verbs:
 *
 *   select_word, select_sentence, select_all,
 *   replace, delete_selection,
 *   ai_correct_syntax, save, cancel
 *
 * Two flows the user (or an agent) can drive:
 *
 *   1. Manual: click "Edit" next to a field. Modal opens.
 *      Use toolbar buttons to select / replace / AI-correct /
 *      save. Original field updates on save.
 *
 *   2. Agent: from the chat panel say "edit the description
 *      and fix the grammar". The LLM dispatches:
 *      NAC.edit_field('contract.description') ->
 *      NAC.click_by_verb('nac_editor', 'ai_correct_syntax') ->
 *      NAC.click_by_verb('nac_editor', 'save').
 *
 * This demo is part of the v2.3 preview branch. Cross-test
 * coverage in:
 *   - packages/nac/test/v23-editor.mjs (stage4 contract)
 *   - tests/e2e-nac/specs/11-demo-v23-editor.spec.ts
 *
 * Production note: the editor primitive registers its plugin
 * idempotently; multiple modals across the page share the
 * same 'nac_editor' plugin. label_i18n covers all 10 locales.
 */
?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>NAC v2.3 preview -- field editor (V23-01)</title>
<style>
  :root {
    --bg:        #fafaf7;
    --surface:   #ffffff;
    --subtle:    #f5f2ea;
    --border:    #e6e3da;
    --text:      #1a1a1a;
    --text-2:    #555;
    --text-3:    #888;
    --accent:    #4f5b87;
    --gold:      #c8a04d;
    --serif:     "Noto Serif JP", Georgia, serif;
    --sans:      "DM Sans", system-ui, -apple-system, sans-serif;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0; font-family: var(--sans);
    background: var(--bg); color: var(--text); line-height: 1.55;
  }
  .container { max-width: 880px; margin: 0 auto; padding: 32px 24px 80px; }
  header { display: flex; align-items: baseline; gap: 14px; margin-bottom: 18px; }
  header .kanji { font-family: var(--serif); color: var(--gold); font-size: 26px; }
  header h1 { font-size: 26px; margin: 0; }
  header .ver { font-size: 12px; color: var(--text-3); margin-left: auto; }

  .lede { color: var(--text-2); margin-bottom: 28px; max-width: 64ch; }

  .field-row {
    background: var(--surface); border: 1px solid var(--border);
    border-radius: 8px; padding: 16px 18px; margin-bottom: 14px;
  }
  .field-row label {
    display: block; font-weight: 600; font-size: 13px;
    color: var(--text-2); margin-bottom: 6px;
  }
  .field-row .field-pair {
    display: flex; align-items: stretch; gap: 8px;
  }
  .field-row input,
  .field-row textarea {
    flex: 1; padding: 10px 12px;
    font-family: inherit; font-size: 14px;
    border: 1px solid var(--border); border-radius: 5px;
    background: var(--subtle); color: var(--text);
  }
  .field-row textarea { min-height: 90px; resize: vertical; }
  .field-row .edit-btn {
    padding: 0 16px; background: var(--accent); color: #fff;
    border: 0; border-radius: 5px; font-weight: 600;
    font-size: 13px; cursor: pointer;
  }
  .field-row .edit-btn:hover { filter: brightness(1.1); }

  .verb-counters {
    background: var(--surface); border: 1px solid var(--border);
    border-radius: 8px; padding: 16px 18px; margin-top: 24px;
  }
  .verb-counters h3 { margin: 0 0 10px; font-size: 15px; }
  .verb-counters .grid {
    display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    gap: 8px; font-size: 13px;
  }
  .verb-counters .grid div {
    background: var(--subtle); padding: 6px 10px; border-radius: 4px;
  }
  .verb-counters .grid b { color: var(--accent); }

  .chat-help {
    margin-top: 24px; padding: 14px 16px;
    background: var(--subtle); border-left: 3px solid var(--gold);
    border-radius: 4px; font-size: 13px; color: var(--text-2);
  }
  .chat-help code {
    background: var(--surface); padding: 1px 6px; border-radius: 3px;
  }
</style>
</head>
<body data-nac-plugin="contract">

<div class="container">

<header data-nac-id="contract.header" data-nac-role="region">
  <span class="kanji" aria-hidden="true">&#26360;</span>
  <h1>Contract editor</h1>
  <span class="ver">NAC v2.3 preview &middot; field editor (V23-01)</span>
</header>

<p class="lede" data-nac-id="contract.lede" data-nac-role="paragraph">
  Three editable fields. Click "Edit" or ask the chat to edit one
  by name -- a modal opens with selection, replace, delete, AI
  syntax-correction, save, and cancel. All eight verbs are
  NAC3-callable.
</p>

<div class="field-row" data-nac-id="contract.row.title" data-nac-role="region">
  <label for="f-title">Contract title</label>
  <div class="field-pair">
    <input id="f-title" type="text"
           data-nac-id="contract.title"
           data-nac-role="field"
           value="Master services agreement -- Acme Inc 2026" />
    <button class="edit-btn"
            data-nac-id="contract.title.edit"
            data-nac-role="action"
            data-nac-action="edit"
            onclick="NAC.edit_field('contract.title')">Edit</button>
  </div>
</div>

<div class="field-row" data-nac-id="contract.row.description" data-nac-role="region">
  <label for="f-desc">Description</label>
  <div class="field-pair">
    <textarea id="f-desc"
              data-nac-id="contract.description"
              data-nac-role="field">This contract regulate the provision of consultancy service. Provider will deliver project as per attached scope. Client agree to pay invoice in 30 days net.</textarea>
    <button class="edit-btn"
            data-nac-id="contract.description.edit"
            data-nac-role="action"
            data-nac-action="edit"
            onclick="NAC.edit_field('contract.description')">Edit</button>
  </div>
</div>

<div class="field-row" data-nac-id="contract.row.clause" data-nac-role="region">
  <label for="f-clause">Termination clause</label>
  <div class="field-pair">
    <textarea id="f-clause"
              data-nac-id="contract.clause"
              data-nac-role="field">Either party may terminate this agreement with thirty (30) days written notice. Outstanding invoices remain due.</textarea>
    <button class="edit-btn"
            data-nac-id="contract.clause.edit"
            data-nac-role="action"
            data-nac-action="edit"
            onclick="NAC.edit_field('contract.clause')">Edit</button>
  </div>
</div>

<section class="verb-counters" data-nac-id="contract.counters" data-nac-role="region">
  <h3>Verbs dispatched (live)</h3>
  <div class="grid">
    <div>select_word: <b id="c-select_word">0</b></div>
    <div>select_sentence: <b id="c-select_sentence">0</b></div>
    <div>select_all: <b id="c-select_all">0</b></div>
    <div>replace: <b id="c-replace">0</b></div>
    <div>delete_selection: <b id="c-delete_selection">0</b></div>
    <div>ai_correct_syntax: <b id="c-ai_correct_syntax">0</b></div>
    <div>save: <b id="c-save">0</b></div>
    <div>cancel: <b id="c-cancel">0</b></div>
  </div>
</section>

<div class="chat-help">
  Try the chat (open with the bubble bottom-right):<br />
  &bullet; <code>edita la descripción y corrige la gramática</code><br />
  &bullet; <code>edit the termination clause and select the first sentence</code><br />
  &bullet; <code>open the title editor and replace it with "Yujin services 2027"</code>
</div>

</div>

<!-- NAC3 runtime + chat client -->
<script src="js/nac.js?v=v22-2026-05-10b"></script>
<script src="js/nac-v2-extensions.js?v=v22-2026-05-10b"></script>
<script src="js/nac-chat-client.js?v=v22-2026-05-10b"></script>

<script>
(function () {
  /* ---- Manifest for the contract plugin ---- */
  var li = function (es, en, pt, fr, it, de, ja, zh, hi, ar) {
    return { es: es, en: en, pt: pt, fr: fr, it: it, de: de, ja: ja, zh: zh, hi: hi, ar: ar };
  };
  if (window.NAC && window.NAC.register) {
    try {
      window.NAC.register({
        plugin_slug: 'contract',
        version: '1.0.0',
        nac_version: '2.2',
        elements: [
          { id: 'contract.title',       role: 'field',
            label_i18n: li('Título','Title','Título','Titre','Titolo','Titel','タイトル','标题','शीर्षक','عنوان') },
          { id: 'contract.title.edit',  role: 'action',
            actions: [{ verb: 'edit', target_field: 'contract.title' }],
            label_i18n: li('Editar título','Edit title','Editar título','Modifier le titre','Modifica titolo','Titel bearbeiten','タイトル編集','编辑标题','शीर्षक संपादित करें','تحرير العنوان') },
          { id: 'contract.description', role: 'field',
            label_i18n: li('Descripción','Description','Descrição','Description','Descrizione','Beschreibung','説明','描述','विवरण','وصف') },
          { id: 'contract.description.edit', role: 'action',
            actions: [{ verb: 'edit', target_field: 'contract.description' }],
            label_i18n: li('Editar descripción','Edit description','Editar descrição','Modifier description','Modifica descrizione','Beschreibung bearbeiten','説明を編集','编辑描述','विवरण संपादित करें','تحرير الوصف') },
          { id: 'contract.clause',      role: 'field',
            label_i18n: li('Cláusula','Clause','Cláusula','Clause','Clausola','Klausel','条項','条款','खंड','بند') },
          { id: 'contract.clause.edit', role: 'action',
            actions: [{ verb: 'edit', target_field: 'contract.clause' }],
            label_i18n: li('Editar cláusula','Edit clause','Editar cláusula','Modifier clause','Modifica clausola','Klausel bearbeiten','条項を編集','编辑条款','खंड संपादित करें','تحرير البند') }
        ]
      });
      console.log('[v23-editor demo] contract plugin registered');
    } catch (e) {
      console.warn('[v23-editor demo] register failed', e);
    }
  }

  /* ---- Verb counters wired to nac:action:succeeded ---- */
  var verbs = ['select_word','select_sentence','select_all','replace',
               'delete_selection','ai_correct_syntax','save','cancel'];
  document.addEventListener('nac:action:succeeded', function (ev) {
    var d = ev.detail || {};
    if (d.plugin !== 'nac_editor') return;
    var av = (d.verb || d.action_id || '').toString().toLowerCase();
    /* extract bare verb from possibly-namespaced action_id */
    var bare = av.indexOf('.') >= 0 ? av.split('.').pop() : av;
    if (verbs.indexOf(bare) >= 0) {
      var el = document.getElementById('c-' + bare);
      if (el) el.textContent = (parseInt(el.textContent, 10) || 0) + 1;
    }
  });

  /* ---- Chat client config (optional, only if endpoint set) ---- */
  if (window.NacChat && window.NacChat.init) {
    try {
      window.NacChat.init({
        endpoint:   '/crm/api/v1/yujin/nac-demo',
        defaultLang: navigator.language ? navigator.language.slice(0,2) : 'en'
      });
    } catch (e) { /* silent if backend not reachable */ }
  }
})();
</script>

</body>
</html>
