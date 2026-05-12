<?php
/**
 * example-v21-data-table.php -- modal-embedded data-table demo,
 * connected to the REAL Yujin chat backend (not a local matcher).
 *
 * Demonstrates NAC v2.1 spec sec 18 end-to-end with a live LLM
 * intermediary:
 *
 *   - "Edit invoice" modal containing a data-table of invoice
 *     lines (collection subkind, transactional commit) with 8
 *     pre-loaded rows + computed line_total + live aggregate.
 *   - Permission matrix tab (matrix subkind, role x permission).
 *   - Side chat with text input + push-to-talk mic + hands-free
 *     toggle + TTS toggle + 10-locale selector. Backend:
 *     /crm/api/v1/yujin/nac-demo (Claude Sonnet primary).
 *   - The chat snapshot includes data_tables (sec 18.11) so the
 *     LLM sees rows + columns + aggregates and can resolve voice
 *     intents like:
 *
 *        "agrega una linea con monitor cantidad 1 a 250"
 *        "borra el teclado"
 *        "cambia la cantidad de la silla a 3"
 *        "leeme el total"
 *        "cuantas lineas hay"
 *        "selecciona las que cuestan mas de 100"
 *        "guardar la factura"
 *        "cancelar"
 *
 *     and matrix:
 *
 *        "dale permiso de editar a analyst"
 *        "saca el permiso de borrar al admin"
 *
 * ASCII-only (rule 3 of repo CLAUDE.md, GoDaddy PHP 8.3).
 */
$assetVersion = 'v72-2026-05-09-tab-role';
?><!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>NAC v2.1 -- data-table demo (real chat)</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  body { font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
         margin: 0; background: #fafafa; color: #1a1a1a; }
  .topbar { display:flex; align-items:center; gap:16px; padding:12px 24px;
            background:#1a1a1a; color:#f5f5f5; border-bottom:2px solid #c8a04d; }
  .topbar .brand { font-weight:600; letter-spacing:0.4px; }
  .topbar .pill { background:#c8a04d; color:#1a1a1a; padding:4px 10px;
                  border-radius:6px; font-size:12px; font-weight:600; }
  .wrap { max-width: 1000px; margin: 24px auto 24px 24px;
          padding: 0 16px; padding-right: 380px; }
  .card { background:#fff; border:1px solid #e5e5e5; border-radius:8px;
          padding:20px; margin-bottom:16px; }
  .card h2 { margin:0 0 8px 0; font-size:18px; }
  .card p { margin:0 0 12px 0; line-height:1.5; color:#555; }
  button.cta { background:#1a1a1a; color:#f5f5f5; border:0; padding:10px 18px;
               border-radius:6px; font-size:14px; cursor:pointer; }
  button.cta:hover { background:#333; }
  button.cta.save { background:#2d6a4f; }
  button.cta.cancel { background:#fff; color:#1a1a1a; border:1px solid #cbd2d9; }
  button.small { font-size:12px; padding:4px 8px; }
  pre#log { background:#0f0f0f; color:#9ad; padding:14px; border-radius:6px;
            font-size:11px; line-height:1.5; max-height:240px;
            overflow:auto; white-space:pre-wrap; }

  /* Modal -- 2026-05-09 fix: the chat sidebar lives at z-index
     10001 (fix C3) so it stays operable while a confirm-dialog
     is open. Without compensation, the chat would also overlap
     the modal's right edge and hide the data-table. We carve out
     the chat sidebar from the modal's footprint by setting
     right:340px instead of inset:0. The overlay shades only the
     content area; the chat stays at full opacity AND remains
     interactable. The modal-card centers within the carved area. */
  #modal { display:none; position:fixed;
           top:0; left:0; bottom:0; right:340px;
           background:rgba(0,0,0,0.5);
           z-index:9999; align-items:center; justify-content:center; }
  #modal[data-state="open"] { display:flex; }
  .modal-card { background:#fff; border-radius:10px; padding:24px;
                width:min(720px, 92vw); max-height:88vh; overflow:auto;
                box-shadow:0 12px 40px rgba(0,0,0,0.3); }
  .modal-head { display:flex; align-items:center; gap:12px; margin-bottom:14px; }
  .modal-head h3 { margin:0; flex:1; font-size:18px; }
  .tab-row { display:flex; gap:6px; margin-bottom:12px;
             border-bottom:1px solid #e5e5e5; }
  .tab-btn { background:transparent; border:0; padding:8px 14px;
             border-radius:6px 6px 0 0; cursor:pointer; font-size:13px;
             color:#777; }
  .tab-btn[aria-current="page"] { background:#fafafa; color:#1a1a1a;
             font-weight:600; border-bottom:2px solid #c8a04d; }
  .tab-panel { display:none; }
  .tab-panel[data-active="1"] { display:block; }

  /* Data-table styling */
  table.dt { width:100%; border-collapse:collapse; margin-bottom:12px; }
  table.dt th, table.dt td { padding:8px 10px; text-align:left;
             border-bottom:1px solid #eee; font-size:14px; }
  table.dt th { background:#fafafa; color:#555; font-weight:600; font-size:12px;
             text-transform:uppercase; letter-spacing:0.04em; }
  table.dt td input { width:100%; border:1px solid #cbd2d9; border-radius:4px;
             padding:4px 6px; font-size:13px; box-sizing:border-box; }
  table.dt td input:disabled { background:#f5f5f5; color:#888; }
  table.dt tfoot td { font-weight:600; border-top:2px solid #1a1a1a; }
  .dt-row-actions { white-space:nowrap; }

  /* Matrix styling */
  table.matrix { border-collapse:collapse; margin-top:12px; }
  table.matrix th, table.matrix td { padding:8px 12px; text-align:center;
             border:1px solid #e5e5e5; font-size:13px; }
  table.matrix th { background:#fafafa; }
  table.matrix th.row-head { text-align:left; min-width:120px; }

  /* Chat (sidebar, z-index 10001 so it stays above the modal --
     fix C3) */
  .chat { position:fixed; right:0; top:0; bottom:0; width:340px;
          background:#fff; border-left:1px solid #e5e5e5;
          z-index:10001; display:flex; flex-direction:column;
          box-shadow:-4px 0 16px rgba(0,0,0,0.06); }
  .chat-head { background:#1a1a1a; color:#f5f5f5; padding:10px 14px;
               display:flex; align-items:center; gap:8px; font-size:13px; }
  .chat-head .brand { flex:1; font-weight:600; }
  .chat-lang { background:#333; color:#fff; border:0; padding:4px 6px;
               border-radius:4px; font-size:11px; }
  .chat-log { flex:1; overflow-y:auto; padding:10px 14px; font-size:13px; }
  .nac-chat-bubble { margin-bottom:8px; padding:6px 10px; border-radius:8px;
                     max-width:90%; line-height:1.4; word-wrap:break-word; }
  .nac-chat-bubble.user { background:#1a1a1a; color:#f5f5f5; margin-left:auto;
                          width:fit-content; }
  .nac-chat-bubble.bot  { background:#f0f0f0; color:#1a1a1a; }
  .chat-tools { display:flex; gap:4px; padding:6px; border-top:1px solid #eee; }
  .icon-btn { background:transparent; border:1px solid #ddd; border-radius:6px;
              padding:6px 8px; cursor:pointer; font-size:13px; }
  .icon-btn[data-nac-state="active"] { background:#c8a04d; color:#1a1a1a;
              border-color:#c8a04d; }
  .icon-btn[aria-pressed="true"] { background:#c8a04d; color:#1a1a1a; }
  .chat-input-row { display:flex; gap:6px; padding:6px; border-top:1px solid #eee; }
  .chat-input-row input { flex:1; padding:6px 8px; border:1px solid #cbd2d9;
              border-radius:4px; font-size:13px; }
  .muted { color:#888; font-size:12px; }
</style>
</head>
<body>

<header class="topbar" data-nac-plugin="topbar">
  <span class="brand">Yujin demo</span>
  <span class="pill">v2.1 data-table -- real chat</span>
</header>

<main class="wrap">

  <article class="card" data-nac-plugin="invoice">
    <h2>NAC v2.1 -- data-table primitive (live)</h2>
    <p>Click the button below to open the "Edit invoice" modal.
       The chat to the right is the REAL Yujin LLM intermediary
       (not a local matcher) -- it sees the table state via
       <code>describe_v2().data_tables</code> and resolves voice/
       text intents into <code>dt_*</code> dispatches.</p>
    <p class="muted">Try by voice (mic button) or by typing:</p>
    <ul class="muted">
      <li>"agrega una linea con monitor cantidad 1 a 250"</li>
      <li>"cambia la cantidad de la silla a 3"</li>
      <li>"borra el teclado"</li>
      <li>"leeme el total" / "cuantas lineas hay"</li>
      <li>"selecciona las que cuestan mas de 100"</li>
      <li>"guardar" / "cancelar"</li>
      <li>"dale permiso de editar al analyst"</li>
      <li>"cambia a ingles" / "switch to French"</li>
    </ul>
    <button class="cta" id="open-modal"
            data-nac-id="action.open_invoice"
            data-nac-role="action"
            data-nac-action="open">Edit invoice #INV-001</button>
  </article>

  <article class="card">
    <h2>Runtime log</h2>
    <p class="muted">Newest first. Every NAC dt event lands here.</p>
    <pre id="log">(idle)</pre>
  </article>
</main>

<!-- ========================== MODAL ========================== -->
<!-- The modal carries data-nac-plugin so NAC.describe() walks
     it as its own plugin and the chatbot sees the lines table +
     save/cancel/add buttons even while the modal is closed. The
     LLM gets to see every operable surface up front; the
     visible flag on each element tells it what is currently
     reachable. -->
<div id="modal" data-state="closed" data-nac-id="modal.invoice_edit"
     data-nac-role="modal" data-nac-plugin="invoice_edit_modal"
     aria-hidden="true">
  <div class="modal-card">
    <div class="modal-head">
      <h3>Edit invoice #INV-001</h3>
      <button class="cta cancel small"
              data-nac-id="modal.invoice_edit.cancel"
              data-nac-role="action"
              data-nac-action="cancel">Cancel</button>
      <button class="cta save small"
              data-nac-id="modal.invoice_edit.save"
              data-nac-role="action"
              data-nac-action="save">Save</button>
    </div>

    <div class="tab-row">
      <!-- 2026-05-09: data-nac-role MUST be "tab" per spec sec 6.2 +
           nac.js _CLICK_EVENT_FAMILY (line 1163: 'tab' ->
           [nac:tab:activated]). Was "navigation" previously, which
           caused NAC.tab() and NAC.tab_by_label() to miss these
           buttons in their canonical DOM query. -->
      <button class="tab-btn" data-tab="lines"
              aria-current="page"
              data-nac-id="tab.lines"
              data-nac-role="tab">Lines (collection)</button>
      <button class="tab-btn" data-tab="permissions"
              data-nac-id="tab.permissions"
              data-nac-role="tab">Permissions (matrix)</button>
    </div>

    <!-- Collection demo: invoice lines -->
    <div class="tab-panel" data-tab-panel="lines" data-active="1">
      <table class="dt" id="lines-table" data-nac-id="invoice.lines"
             data-nac-role="data-table">
        <thead><tr>
          <th>Product</th><th>Qty</th><th>Unit price</th>
          <th>Total</th><th></th>
        </tr></thead>
        <tbody></tbody>
        <tfoot><tr>
          <td colspan="3" style="text-align:right">Total:</td>
          <td colspan="2" id="lines-sum">0</td>
        </tr></tfoot>
      </table>
      <button class="cta small"
              data-nac-id="invoice.lines.add"
              data-nac-role="action"
              data-nac-action="add_row">+ Add line</button>
    </div>

    <!-- Matrix demo: permission grid -->
    <div class="tab-panel" data-tab-panel="permissions">
      <table class="matrix" id="perm-matrix" data-nac-id="perm.matrix"
             data-nac-role="data-table">
        <thead><tr id="perm-head"></tr></thead>
        <tbody id="perm-body"></tbody>
      </table>
    </div>
  </div>
</div>

<!-- ========================== CHAT ========================== -->
<aside class="chat" data-nac-plugin="chat">
  <header class="chat-head">
    <span class="brand">Yujin chat</span>
    <select class="chat-lang" id="chat-lang"
            data-nac-id="chat.lang" data-nac-role="field">
      <option value="es">es</option>
      <option value="en">en</option>
      <option value="pt">pt</option>
      <option value="fr">fr</option>
      <option value="it">it</option>
      <option value="de">de</option>
      <option value="ja">ja</option>
      <option value="zh">zh</option>
      <option value="hi">hi</option>
      <option value="ar">ar</option>
    </select>
  </header>
  <div class="chat-log" id="chat-log"
       data-nac-id="chat.log" data-nac-role="region"
       aria-live="polite" aria-relevant="additions"></div>
  <div class="chat-tools">
    <button class="icon-btn" id="chat-mic"
            data-nac-id="chat.mic" data-nac-role="action"
            aria-label="Push to talk" aria-pressed="false"
            data-nac-state="idle">mic</button>
    <button class="icon-btn" id="chat-handsfree"
            data-nac-id="chat.voice.always_on" data-nac-role="action"
            aria-label="Hands-free voice mode" aria-pressed="false">manos libres</button>
    <button class="icon-btn" id="chat-tts"
            data-nac-id="chat.tts" data-nac-role="action"
            aria-label="Toggle TTS" aria-pressed="true">tts</button>
  </div>
  <div class="chat-input-row">
    <input id="chat-input"
           data-nac-id="chat.input" data-nac-role="field"
           placeholder="agrega una linea / borra el teclado / leeme el total"
           autocomplete="off">
    <button class="icon-btn" id="chat-send"
            data-nac-id="chat.send" data-nac-role="action"
            aria-label="Send">send</button>
  </div>
</aside>

<!-- BUILD TAG: <?php echo htmlspecialchars($assetVersion); ?> (Pablo: search this string in View Source to confirm the served HTML matches local code) -->
<script>console.log('[build] example-v21-data-table.php asset version =', '<?php echo htmlspecialchars($assetVersion); ?>');</script>

<!-- v1.9 + v2.1 runtime + chat client -->
<script src="js/nac.js?v=<?php echo htmlspecialchars($assetVersion); ?>"></script>
<script src="js/nac-v2-extensions.js?v=<?php echo htmlspecialchars($assetVersion); ?>"></script>
<script src="js/nac-chat-client.js?v=<?php echo htmlspecialchars($assetVersion); ?>"></script>

<script>
(function () {
  'use strict';

  function bootDemo() {
    if (!window.NAC || typeof NAC.registerDataTable !== 'function') {
      return setTimeout(bootDemo, 30);
    }

    /* === Plugin manifests (so the LLM intermediary gets full
       label_i18n + verb context for the open-invoice button +
       the modal's save/cancel/add buttons + the data-table). */
    NAC.register({
      plugin_slug: 'invoice', version: '1.0.0', nac_version: '1.0',
      elements: [
        { id: 'action.open_invoice', role: 'action',
          actions: [{ verb: 'open', label_i18n: makeLi('Abrir / editar factura', 'Open / edit invoice') }],
          label_i18n: makeLi('Editar factura', 'Edit invoice') }
      ]
    });
    NAC.register({
      plugin_slug: 'invoice_edit_modal', version: '1.0.0', nac_version: '1.0',
      elements: [
        { id: 'modal.invoice_edit.cancel', role: 'action',
          actions: [{ verb: 'cancel', label_i18n: makeLi('Cancelar edicion', 'Cancel edit') }],
          label_i18n: makeLi('Cancelar', 'Cancel') },
        { id: 'modal.invoice_edit.save', role: 'action',
          actions: [{ verb: 'save', label_i18n: makeLi('Guardar factura', 'Save invoice') }],
          label_i18n: makeLi('Guardar', 'Save') },
        { id: 'invoice.lines.add', role: 'action',
          actions: [{ verb: 'add_row', label_i18n: makeLi('Agregar linea', 'Add line') }],
          label_i18n: makeLi('Agregar linea', 'Add line') },
        /* 2026-05-09: role MUST be 'tab' per spec sec 6.2.
           Was 'navigation' (semantically reasonable HTML term but
           non-canonical in NAC); see HTML comment above tab-row. */
        { id: 'tab.lines', role: 'tab',
          label_i18n: makeLi('Solapa lineas', 'Lines tab') },
        { id: 'tab.permissions', role: 'tab',
          label_i18n: makeLi('Solapa permisos', 'Permissions tab') }
      ]
    });

    /* === LINES data-table === */
    NAC.registerDataTable({
      table_id: 'invoice.lines',
      scope_owner: 'modal.invoice_edit',
      subkind: 'collection',
      transactional: true,
      row_id_field: 'line_id',
      columns: [
        { key: 'line_id',    label_i18n: makeLi('id', 'ID'), type: 'text', editable: false },
        { key: 'product',    label_i18n: makeLi('Producto', 'Product'), type: 'text', editable: true, required: true },
        { key: 'qty',        label_i18n: makeLi('Cantidad', 'Qty'), type: 'number', editable: true, min: 1, required: true },
        { key: 'unit_price', label_i18n: makeLi('Precio', 'Unit price'), type: 'currency', editable: false },
        { key: 'line_total', label_i18n: makeLi('Total', 'Total'), type: 'currency', computed: true,
          computed_from: ['qty','unit_price'] }
      ],
      supports: ['add_row','remove_row','edit_cell'],
      selection_mode: 'multiple',
      aggregates: { sum: ['line_total'], count: ['*'] },
      initial_rows: [
        { line_id: 'L1', product: 'Mouse',         qty: 2, unit_price: 25,  line_total: 50  },
        { line_id: 'L2', product: 'Teclado',       qty: 1, unit_price: 140, line_total: 140 },
        { line_id: 'L3', product: 'Monitor',       qty: 1, unit_price: 250, line_total: 250 },
        { line_id: 'L4', product: 'Silla',         qty: 1, unit_price: 320, line_total: 320 },
        { line_id: 'L5', product: 'Auriculares',   qty: 2, unit_price: 90,  line_total: 180 },
        { line_id: 'L6', product: 'Webcam',        qty: 1, unit_price: 75,  line_total: 75  },
        { line_id: 'L7', product: 'Cable USB',     qty: 5, unit_price: 8,   line_total: 40  },
        { line_id: 'L8', product: 'Lampara',       qty: 1, unit_price: 60,  line_total: 60  }
      ],
      validators: [
        { kind: 'row',   code: 'qty_positive', column: 'qty', op: 'gt', value: 0 },
        { kind: 'table', code: 'no_dup_product', unique_columns: ['product'] }
      ]
    });
    NAC.registerDataTableComputed('invoice.lines', 'line_total',
      function (row) { return (row.qty || 0) * (row.unit_price || 0); });

    /* === PERMISSIONS matrix === */
    NAC.registerDataTable({
      table_id: 'perm.matrix',
      scope_owner: 'modal.invoice_edit',
      subkind: 'matrix',
      transactional: true,
      row_axis: { label_i18n: makeLi('Rol', 'Role'),
        values: [
          { slug: 'admin',   label_i18n: makeLi('Administrador', 'Admin') },
          { slug: 'analyst', label_i18n: makeLi('Analista', 'Analyst') },
          { slug: 'viewer',  label_i18n: makeLi('Lector', 'Viewer') }
        ]
      },
      column_axis: { label_i18n: makeLi('Permiso', 'Permission'),
        values: [
          { slug: 'invoices.read',   label_i18n: makeLi('Leer facturas', 'Read invoices') },
          { slug: 'invoices.edit',   label_i18n: makeLi('Editar facturas', 'Edit invoices') },
          { slug: 'invoices.delete', label_i18n: makeLi('Borrar facturas', 'Delete invoices') }
        ]
      },
      cell_type: 'boolean',
      initial_cells: [
        { row: 'admin',   col: 'invoices.read',   value: true },
        { row: 'admin',   col: 'invoices.edit',   value: true },
        { row: 'admin',   col: 'invoices.delete', value: true },
        { row: 'analyst', col: 'invoices.read',   value: true },
        { row: 'analyst', col: 'invoices.edit',   value: true },
        { row: 'viewer',  col: 'invoices.read',   value: true }
      ]
    });

    log('boot: data-tables registered (8 lines + 9-cell matrix)');
    renderLines();
    renderMatrix();

    /* React to events: re-render on change. */
    document.addEventListener('nac:dt:row_added',     onLinesChange);
    document.addEventListener('nac:dt:row_removed',   onLinesChange);
    document.addEventListener('nac:dt:cell_edited',   onLinesChange);
    document.addEventListener('nac:dt:matrix_cell_set', renderMatrix);
    document.addEventListener('nac:dt:discarded',     function (e) {
      if (e.detail.table_id === 'invoice.lines') renderLines();
      else if (e.detail.table_id === 'perm.matrix') renderMatrix();
    });
    document.addEventListener('nac:dt:committed',     function (e) {
      log('COMMITTED: ' + e.detail.table_id);
      NacChat.botSpeak('Guardado.');
      closeModal();
    });
    document.addEventListener('nac:dt:validation_failed', function (e) {
      log('VALIDATION FAILED: ' + JSON.stringify(e.detail.errors));
      NacChat.botSpeak('No puedo guardar: ' +
        (e.detail.errors[0] && e.detail.errors[0].code));
    });
    document.addEventListener('nac:dt:aggregate_changed', function (e) {
      var elt = document.getElementById('lines-sum');
      if (e.detail.column === 'line_total' && e.detail.agg_key === 'sum' && elt) {
        elt.textContent = e.detail.new;
      }
    });

    /* Wire NacChat to the real backend. */
    NacChat.init({
      endpoint:    '/crm/api/v1/yujin/nac-demo',
      sessionId:   'v21-data-table-' + Math.random().toString(36).slice(2, 8),
      lang:        'es',
      chatLog:     document.getElementById('chat-log'),
      input:       document.getElementById('chat-input'),
      sendBtn:     document.getElementById('chat-send'),
      micBtn:      document.getElementById('chat-mic'),
      handsFreeBtn:document.getElementById('chat-handsfree'),
      ttsBtn:      document.getElementById('chat-tts'),
      langSelect:  document.getElementById('chat-lang')
    });

    /* Welcome bubble */
    NacChat.botSpeak('Hola. Probame con voz: '
      + 'agregar lineas, leer el total, borrar productos, '
      + 'cambiar cantidades, guardar o cancelar la factura, '
      + 'o asignar permisos en la otra solapa.');
  }

  function onLinesChange(e) {
    if (e.detail.table_id !== 'invoice.lines') return;
    log('event ' + e.type + ' / by=' + e.detail.by);
    renderLines();
  }

  function makeLi(es, en) {
    return { es: es, en: en, pt: es, fr: es, it: es, de: en,
             ja: en, zh: en, hi: en, ar: en };
  }

  function log(msg) {
    var pre = document.getElementById('log');
    var ts = new Date().toISOString().split('T')[1].slice(0, 12);
    pre.textContent = '[' + ts + '] ' + msg + '\n' + pre.textContent;
  }

  function renderLines() {
    var s = NAC.dt_state('invoice.lines');
    if (!s) return;
    var tbody = document.querySelector('#lines-table tbody');
    tbody.innerHTML = '';
    s.rows.forEach(function (row) {
      var tr = document.createElement('tr');
      tr.setAttribute('data-row-id', row.line_id);
      tr.innerHTML =
        '<td><input data-col="product" value="' + escapeHtml(row.product || '') + '"></td>' +
        '<td><input type="number" data-col="qty" min="1" value="' + (row.qty || 0) + '"></td>' +
        '<td><input data-col="unit_price" value="' + (row.unit_price || 0) + '" disabled></td>' +
        '<td>' + (row.line_total || 0) + '</td>' +
        '<td class="dt-row-actions">' +
        '  <button class="cta cancel small remove-row">x</button>' +
        '</td>';
      tbody.appendChild(tr);
      tr.querySelectorAll('input[data-col]').forEach(function (input) {
        input.addEventListener('change', function () {
          var col = this.getAttribute('data-col');
          var val = col === 'qty' ? Number(this.value) : this.value;
          NAC.dt_edit_cell('invoice.lines', row.line_id, col, val);
        });
      });
      tr.querySelector('.remove-row').addEventListener('click', function () {
        NAC.dt_remove_row('invoice.lines', row.line_id);
      });
    });
    document.getElementById('lines-sum').textContent =
      NAC.dt_read_aggregate('invoice.lines', 'sum', 'line_total') || 0;
  }

  function renderMatrix() {
    var s = NAC.dt_state('perm.matrix');
    if (!s) return;
    var dt = NAC.__v2_dataTables['perm.matrix'];
    if (!dt) return;
    var head = document.getElementById('perm-head');
    head.innerHTML = '<th></th>';
    dt.schema.column_axis.values.forEach(function (col) {
      head.innerHTML += '<th>' + escapeHtml(col.label_i18n.es || col.slug) + '</th>';
    });
    var body = document.getElementById('perm-body');
    body.innerHTML = '';
    dt.schema.row_axis.values.forEach(function (rowDef) {
      var tr = document.createElement('tr');
      tr.innerHTML = '<th class="row-head">' + escapeHtml(rowDef.label_i18n.es || rowDef.slug) + '</th>';
      dt.schema.column_axis.values.forEach(function (colDef) {
        var v = NAC.dt_get_cell('perm.matrix', rowDef.slug, colDef.slug);
        var checked = v ? 'checked' : '';
        tr.innerHTML += '<td><input type="checkbox" ' + checked +
          ' data-row="' + rowDef.slug + '" data-col="' + colDef.slug + '"></td>';
      });
      body.appendChild(tr);
    });
    body.querySelectorAll('input[type="checkbox"]').forEach(function (cb) {
      cb.addEventListener('change', function () {
        NAC.dt_set_cell('perm.matrix',
          this.getAttribute('data-row'),
          this.getAttribute('data-col'),
          this.checked);
      });
    });
  }

  function escapeHtml(s) {
    return String(s).replace(/[<>&"']/g, function (c) {
      return ({ '<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&#39;' }[c]);
    });
  }

  function openModal()  {
    document.getElementById('modal').setAttribute('data-state', 'open');
    document.getElementById('modal').setAttribute('aria-hidden', 'false');
  }
  function closeModal() {
    document.getElementById('modal').setAttribute('data-state', 'closed');
    document.getElementById('modal').setAttribute('aria-hidden', 'true');
  }

  /* Wire UI -- thin glue, all chat logic lives in nac-chat-client.js */
  document.addEventListener('click', function (e) {
    var t = e.target;
    if (!t) return;
    var id = t.getAttribute('data-nac-id');
    if (id === 'action.open_invoice') openModal();
    else if (id === 'modal.invoice_edit.cancel') {
      NAC.dt_discard('invoice.lines'); closeModal();
    }
    else if (id === 'modal.invoice_edit.save') {
      NAC.dt_commit('invoice.lines');
    }
    else if (id === 'invoice.lines.add') {
      NAC.dt_add_row('invoice.lines',
        { product: 'Nuevo', qty: 1, unit_price: 0 });
    }
    if (t.classList && t.classList.contains('tab-btn')) {
      document.querySelectorAll('.tab-btn').forEach(function (b) {
        b.removeAttribute('aria-current');
      });
      t.setAttribute('aria-current', 'page');
      var which = t.getAttribute('data-tab');
      document.querySelectorAll('.tab-panel').forEach(function (p) {
        p.removeAttribute('data-active');
      });
      document.querySelector('.tab-panel[data-tab-panel="' + which + '"]')
        .setAttribute('data-active', '1');
    }
  });

  bootDemo();
})();
</script>

</body>
</html>
