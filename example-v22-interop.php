<?php
/**
 * example-v22-interop.php -- NAC v2.3 preview: cross-app
 * navigation via MCP-style export + import.
 *
 * This demo runs TWO mini-apps in the same page:
 *
 *   "Yujin"  (left side)  -- a tiny tasks board.
 *   "Excel"  (right side) -- a tiny spreadsheet.
 *
 * Each one boots its own NAC instance under its own iframe-ish
 * boundary (we cheat: same page, same NAC global, but each app's
 * elements live under data-nac-plugin="yujin_demo" /
 * "excel_demo"; the demo just demonstrates the export/import
 * dance as if they were two separate origins).
 *
 * The interop layer hooks the right side to act as the "remote"
 * peer: when the left side calls
 *   NAC.import_remote_tree(payload, conn)
 * the runtime registers the right side's plugins under
 * 'remote:excel:*' and proxies dispatches via a local
 * in-page bridge (since we cannot reach a real HTTP endpoint
 * across origins in a static demo).
 *
 * The two side-by-side flows that work:
 *
 *   1. From Yujin's chat: "import excel" -> the runtime calls
 *      NAC.export_tree() against the Excel side, then
 *      NAC.import_remote_tree() it back. The user sees both
 *      apps in NAC.describe() under namespaced slugs.
 *
 *   2. From Yujin's chat: "set excel cell A1 to 100" ->
 *      LLM resolves to NAC.fill('remote:excel:excel_demo.cell.A1',
 *      100). Interop layer detects the prefix and forwards via
 *      the in-page bridge. Excel's cell flips. Excel emits
 *      nac:field:changed; the interop layer relays it back into
 *      Yujin's document.
 *
 * Goal: prove the contract end-to-end without needing a real
 * second origin.
 *
 * ASCII-pure per rule 3. No accents, no emoji.
 */
$assetVersion = 'v23-2026-05-10-interop-preview';
?><!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>NAC v2.3 preview -- cross-app interop demo</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Noto+Serif+JP:wght@300;400;700&family=Fira+Code:wght@400;500&display=swap" rel="stylesheet">
<style>
  :root {
    --bg: #fafafa; --surf: #fff; --ink: #1a1a1a; --sub: #f4f3f0;
    --accent: #c8a04d; --indigo: #4F46E5; --rose: #DC2626; --teal: #0E8A8A;
    --border: #e5e5e5;
    --font-sans: 'DM Sans', system-ui, sans-serif;
    --font-mono: 'Fira Code', monospace;
  }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--bg); color: var(--ink);
         font-family: var(--font-sans); }
  .topbar {
    background: var(--ink); color: #f5f5f5; padding: 12px 24px;
    border-bottom: 2px solid var(--accent);
    display: flex; align-items: center; gap: 12px;
  }
  .topbar .brand { font-weight: 600; }
  .topbar .pill { background: var(--accent); color: var(--ink);
                  padding: 3px 10px; border-radius: 4px;
                  font-size: 12px; font-weight: 600; }
  .lay { display: grid; grid-template-columns: 1fr 1fr; gap: 20px;
         padding: 20px; min-height: 80vh; }
  .panel {
    background: var(--surf); border: 1px solid var(--border);
    border-radius: 8px; padding: 18px;
    display: flex; flex-direction: column; gap: 14px;
  }
  .panel-head {
    display: flex; align-items: center; gap: 10px;
    border-bottom: 1px solid var(--border); padding-bottom: 10px;
  }
  .panel-head .kanji { font-family: 'Noto Serif JP', serif; font-size: 22px; color: var(--accent); }
  .panel-head .pname { font-weight: 600; }
  .panel-head .pmark {
    margin-left: auto; font-size: 11px; color: #888;
    font-family: var(--font-mono);
  }
  .yujin-app .pname  { color: var(--indigo); }
  .excel-app .pname  { color: var(--teal); }
  button.cta {
    background: var(--ink); color: #f5f5f5; border: 0;
    padding: 8px 14px; border-radius: 5px; cursor: pointer;
    font-family: inherit; font-size: 13px;
  }
  button.secondary {
    background: transparent; color: var(--ink);
    border: 1px solid var(--border); padding: 7px 12px;
    border-radius: 5px; cursor: pointer; font-family: inherit;
    font-size: 13px;
  }
  button.secondary:hover { background: var(--sub); }
  .task-list { list-style: none; padding: 0; margin: 0; }
  .task-item {
    display: flex; align-items: center; gap: 8px;
    border: 1px solid var(--border); border-radius: 5px;
    padding: 8px 12px; margin-bottom: 6px; font-size: 14px;
  }
  .task-item.done .text { text-decoration: line-through; color: #888; }
  .task-item .text { flex: 1; }
  .grid {
    border-collapse: collapse; width: 100%; font-family: var(--font-mono);
    font-size: 13px;
  }
  .grid th, .grid td {
    border: 1px solid var(--border); padding: 6px 10px;
    text-align: left; min-width: 50px;
  }
  .grid th { background: var(--sub); font-weight: 600; }
  .grid td input {
    border: 0; background: transparent; width: 100%;
    font-family: inherit; font-size: 13px;
  }
  .log {
    background: var(--ink); color: #4ADE80;
    font-family: var(--font-mono); font-size: 11px;
    padding: 10px 14px; border-radius: 6px; max-height: 240px;
    overflow-y: auto; line-height: 1.5;
  }
  .log .ev { color: #c8a04d; }
  .log .ns { color: #A78BFA; }
  .ctrls {
    display: flex; gap: 8px; flex-wrap: wrap; align-items: center;
    padding: 12px 24px; background: var(--surf);
    border-bottom: 1px solid var(--border);
  }
  .ctrls label { font-size: 12px; color: #555; }
  .ctrls input[type=text] {
    border: 1px solid var(--border); border-radius: 4px;
    padding: 6px 10px; font-family: var(--font-mono); font-size: 12px;
    min-width: 280px;
  }
  .badge {
    background: var(--rose); color: white; padding: 1px 6px;
    border-radius: 3px; font-size: 10px; font-weight: 600;
    margin-left: 6px;
  }
  .badge.ok { background: var(--teal); }
</style>
</head>
<body>

<header class="topbar">
  <span style="font-family: 'Noto Serif JP', serif; font-size: 22px; color: var(--accent);">&#27005;</span>
  <span class="brand">NAC v2.3 preview</span>
  <span class="pill">interop</span>
  <span style="font-size: 12px; color: #999;">two NAC apps side-by-side, host + peer dance</span>
</header>

<div class="ctrls">
  <button class="cta"
          id="btn-export-excel"
          data-nac-id="demo.btn.export_excel"
          data-nac-role="action"
          data-nac-action="export_excel">
    1. Export Excel tree
  </button>
  <button class="cta"
          id="btn-import-into-yujin"
          data-nac-id="demo.btn.import"
          data-nac-role="action"
          data-nac-action="import_excel_into_yujin"
          disabled>
    2. Import into Yujin
  </button>
  <button class="secondary"
          id="btn-call-remote"
          data-nac-id="demo.btn.call_remote"
          data-nac-role="action"
          data-nac-action="call_remote_fill"
          disabled>
    3. Yujin calls remote: set A1=100
  </button>
  <button class="secondary"
          id="btn-disconnect"
          data-nac-id="demo.btn.disconnect"
          data-nac-role="action"
          data-nac-action="disconnect"
          disabled>
    Disconnect remote
  </button>
  <span id="status" style="margin-left: auto; font-family: var(--font-mono); font-size: 12px;"></span>
</div>

<div class="lay">

  <!-- ============ Left: Yujin app ============ -->
  <article class="panel yujin-app" data-nac-plugin="yujin_demo">
    <div class="panel-head">
      <span class="kanji" aria-hidden="true">&#36234;</span>
      <span class="pname">Yujin tasks</span>
      <span class="pmark" id="mark-yujin">host</span>
    </div>

    <ul class="task-list" data-nac-id="yujin_demo.list" data-nac-role="region">
      <li class="task-item" data-nac-id="yujin_demo.task.t1" data-nac-role="region">
        <input type="checkbox"
               data-nac-id="yujin_demo.task.t1.done"
               data-nac-role="field">
        <span class="text">Import Excel tree</span>
      </li>
      <li class="task-item" data-nac-id="yujin_demo.task.t2" data-nac-role="region">
        <input type="checkbox"
               data-nac-id="yujin_demo.task.t2.done"
               data-nac-role="field">
        <span class="text">Set cell A1 from chat</span>
      </li>
      <li class="task-item" data-nac-id="yujin_demo.task.t3" data-nac-role="region">
        <input type="checkbox"
               data-nac-id="yujin_demo.task.t3.done"
               data-nac-role="field">
        <span class="text">Observe ack relay</span>
      </li>
    </ul>

    <div>
      <strong>Yujin event log:</strong>
      <div class="log" id="log-yujin"></div>
    </div>
  </article>

  <!-- ============ Right: Excel app (peer) ============ -->
  <article class="panel excel-app" data-nac-plugin="excel_demo">
    <div class="panel-head">
      <span class="kanji" aria-hidden="true">&#34920;</span>
      <span class="pname">Excel mini</span>
      <span class="pmark" id="mark-excel">peer</span>
    </div>

    <table class="grid" data-nac-id="excel_demo.grid" data-nac-role="data-table">
      <thead><tr><th></th><th>A</th><th>B</th><th>C</th></tr></thead>
      <tbody>
        <tr><th>1</th>
          <td><input data-nac-id="excel_demo.cell.A1" data-nac-role="field"></td>
          <td><input data-nac-id="excel_demo.cell.B1" data-nac-role="field"></td>
          <td><input data-nac-id="excel_demo.cell.C1" data-nac-role="field"></td>
        </tr>
        <tr><th>2</th>
          <td><input data-nac-id="excel_demo.cell.A2" data-nac-role="field"></td>
          <td><input data-nac-id="excel_demo.cell.B2" data-nac-role="field"></td>
          <td><input data-nac-id="excel_demo.cell.C2" data-nac-role="field"></td>
        </tr>
        <tr><th>3</th>
          <td><input data-nac-id="excel_demo.cell.A3" data-nac-role="field"></td>
          <td><input data-nac-id="excel_demo.cell.B3" data-nac-role="field"></td>
          <td><input data-nac-id="excel_demo.cell.C3" data-nac-role="field"></td>
        </tr>
      </tbody>
    </table>

    <div>
      <strong>Excel event log:</strong>
      <div class="log" id="log-excel"></div>
    </div>
  </article>
</div>

<!-- BUILD TAG: <?php echo htmlspecialchars($assetVersion); ?> -->
<script>console.log('[demo-interop] build', '<?php echo htmlspecialchars($assetVersion); ?>');</script>

<script src="js/nac.js?v=<?php echo htmlspecialchars($assetVersion); ?>"></script>
<script src="js/nac-v2-extensions.js?v=<?php echo htmlspecialchars($assetVersion); ?>"></script>
<script src="js/nac-mcp-interop.js?v=<?php echo htmlspecialchars($assetVersion); ?>"></script>

<script>
(function () {
  'use strict';

  function logTo(id, html) {
    var el = document.getElementById(id);
    if (!el) return;
    var t = new Date().toISOString().split('T')[1].slice(0, 8);
    el.innerHTML = '<div>[' + t + '] ' + html + '</div>' + el.innerHTML;
  }

  function whenReady(fn) {
    if (window.NAC && window.NAC.export_tree) return fn();
    setTimeout(function () { whenReady(fn); }, 30);
  }

  whenReady(function () {

    /* ============ Register Yujin's manifest ============ */
    function li(es, en) { /* fast 10-locale stub for demo */
      return { es: es, en: en, pt: en, fr: en, it: en,
               de: en, ja: en, zh: en, hi: en, ar: en };
    }
    NAC.register({
      plugin_slug: 'yujin_demo',
      version: '1.0.0',
      nac_version: '2.3',
      elements: [
        { id: 'yujin_demo.list', role: 'region',
          label_i18n: li('Lista de tareas', 'Task list') },
        { id: 'yujin_demo.task.t1', role: 'region',
          label_i18n: li('Tarea 1', 'Task 1') },
        { id: 'yujin_demo.task.t1.done', role: 'field',
          label_i18n: li('Hecho', 'Done') },
        { id: 'yujin_demo.task.t2', role: 'region',
          label_i18n: li('Tarea 2', 'Task 2') },
        { id: 'yujin_demo.task.t2.done', role: 'field',
          label_i18n: li('Hecho', 'Done') },
        { id: 'yujin_demo.task.t3', role: 'region',
          label_i18n: li('Tarea 3', 'Task 3') },
        { id: 'yujin_demo.task.t3.done', role: 'field',
          label_i18n: li('Hecho', 'Done') }
      ]
    });

    /* ============ Register Excel peer's manifest ============ */
    NAC.register({
      plugin_slug: 'excel_demo',
      version: '1.0.0',
      nac_version: '2.3',
      elements: [
        { id: 'excel_demo.grid', role: 'data-table',
          label_i18n: li('Grilla', 'Grid') }
      ].concat(['A','B','C'].flatMap(function (col) {
        return [1,2,3].map(function (row) {
          return {
            id: 'excel_demo.cell.' + col + row,
            role: 'field',
            label_i18n: li('Celda ' + col + row, 'Cell ' + col + row)
          };
        });
      }))
    });

    logTo('log-yujin', '<span class="ev">manifest registered</span>');
    logTo('log-excel', '<span class="ev">manifest registered</span>');

    /* ============ In-page MCP bridge =============
       Simulates the peer's HTTP /nac.invoke endpoint by
       intercepting fetch() calls to a fake URL. */
    var EXCEL_ENDPOINT = 'http://localhost:9999/excel-mcp';
    var EXCEL_BEARER   = 'demo-bearer-excel-' + Math.random().toString(36).slice(2, 10);

    var _origFetch = window.fetch.bind(window);
    window.fetch = async function (url, opts) {
      if (typeof url === 'string' && url.indexOf(EXCEL_ENDPOINT) === 0) {
        return _handleBridgeFetch(url, opts);
      }
      return _origFetch(url, opts);
    };

    async function _handleBridgeFetch(url, opts) {
      var body = opts && opts.body ? JSON.parse(opts.body) : {};
      logTo('log-excel', '<span class="ev">bridge</span> nac.invoke ' + body.action.kind + ' ' + body.nac_id);

      if (body.bearer !== EXCEL_BEARER) {
        return _bridgeResponse({ ok: false, error: { code: 'auth', message: 'bad bearer' } });
      }
      /* Dispatch the action locally against the peer's nac_id. */
      try {
        var k = body.action.kind;
        var a = body.action.args || {};
        var nid = body.nac_id;
        var result;
        if (k === 'click')        result = await NAC.click(nid);
        else if (k === 'fill')    result = await NAC.fill(nid, a.value);
        else if (k === 'select')  result = await NAC.select(nid, a.value);
        else throw new Error('bridge: unsupported kind ' + k);
        logTo('log-excel', '<span class="ev">dispatched</span> ' + k + ' result.ok=' + (result && result.ok));
        return _bridgeResponse({ ok: true, result: result || { ok: true } });
      } catch (e) {
        return _bridgeResponse({ ok: false, error: { code: e.code || 'peer_err', message: e.message } });
      }
    }

    function _bridgeResponse(json) {
      return new Response(JSON.stringify(json), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    /* ============ Wire control buttons ============ */
    var exportedPayload = null;
    var statusEl = document.getElementById('status');
    function status(msg, ok) {
      statusEl.innerHTML = (ok ? '<span class="badge ok">OK</span> ' : '<span class="badge">!</span> ') + msg;
    }

    function bindBtn(id, fn) {
      var el = document.getElementById(id);
      if (!el) return;
      NAC.bindAction(el, fn, {
        plugin: 'demo',
        action_id: el.getAttribute('data-nac-id')
      });
    }

    bindBtn('btn-export-excel', function () {
      var payload = NAC.export_tree({ scope: 'plugin_slug:excel_demo' });
      exportedPayload = payload;
      logTo('log-yujin', '<span class="ev">export_tree</span> got ' +
            Object.keys(payload.manifests).length + ' manifests');
      logTo('log-excel', '<span class="ev">export_tree</span> served (payload size ~' +
            JSON.stringify(payload).length + ' bytes)');
      status('Tree exported. Click step 2.', true);
      document.getElementById('btn-import-into-yujin').disabled = false;
    });

    bindBtn('btn-import-into-yujin', function () {
      if (!exportedPayload) { status('export first', false); return; }
      try {
        NAC.import_remote_tree(exportedPayload, {
          transport: 'http',
          endpoint:  EXCEL_ENDPOINT,
          bearer:    EXCEL_BEARER,
          namespace: 'excel',
          auto_subscribe: false
        });
        logTo('log-yujin', '<span class="ev">import_remote_tree</span> ' +
              '<span class="ns">remote:excel:*</span> now in NAC.describe()');
        status('Excel imported. Run step 3 to call remote.', true);
        document.getElementById('btn-call-remote').disabled = false;
        document.getElementById('btn-disconnect').disabled = false;
        document.getElementById('mark-excel').textContent = 'peer (imported as remote:excel)';
      } catch (e) {
        status('import failed: ' + e.message, false);
        logTo('log-yujin', '<span style="color:#fca5a5;">import error: ' + e.message + '</span>');
      }
    });

    bindBtn('btn-call-remote', async function () {
      try {
        var target = 'remote:excel:excel_demo.cell.A1';
        logTo('log-yujin', '<span class="ev">NAC.fill</span> ' +
              '<span class="ns">' + target + '</span> = 100');
        var result = await NAC.fill(target, 100);
        logTo('log-yujin', '<span class="ev">resolved</span> ' + JSON.stringify(result));
        status('Cell A1 = 100. Check Excel panel.', true);
      } catch (e) {
        status('proxy failed: ' + e.message, false);
        logTo('log-yujin', '<span style="color:#fca5a5;">proxy error: ' + e.message + '</span>');
      }
    });

    bindBtn('btn-disconnect', function () {
      NAC.disconnect_remote('excel');
      logTo('log-yujin', '<span class="ev">disconnected</span> remote:excel');
      status('Disconnected. Re-import to retry.', true);
      document.getElementById('btn-call-remote').disabled = true;
      document.getElementById('btn-disconnect').disabled = true;
      document.getElementById('btn-import-into-yujin').disabled = true;
      document.getElementById('mark-excel').textContent = 'peer';
      exportedPayload = null;
    });

    /* ============ Listen to ack events globally for the log ============ */
    document.addEventListener('nac:action:succeeded', function (e) {
      var d = e.detail || {};
      var line = '<span class="ev">ack</span> ' +
                 (d.plugin || 'unknown') + ' / ' + (d.action_id || '?') +
                 (d.via_interop ? ' <span class="ns">via_interop</span>' : '');
      if (d.via_interop || (d.plugin || '').indexOf('remote:') === 0) {
        logTo('log-yujin', line);
      } else if ((d.action_id || '').indexOf('excel_demo') >= 0) {
        logTo('log-excel', line);
      } else if ((d.action_id || '').indexOf('yujin_demo') >= 0) {
        logTo('log-yujin', line);
      } else if ((d.action_id || '').indexOf('demo.btn') >= 0) {
        logTo('log-yujin', line);  // host buttons
      }
    });
    document.addEventListener('nac:field:changed', function (e) {
      var d = e.detail || {};
      var line = '<span class="ev">field</span> ' + (d.field_id || '?') +
                 ' = ' + (d.value == null ? '' : String(d.value).slice(0, 40));
      if ((d.field_id || '').indexOf('excel_demo') >= 0) logTo('log-excel', line);
      if ((d.field_id || '').indexOf('yujin_demo') >= 0) logTo('log-yujin', line);
    });

    status('Ready. Click step 1.', true);
  });
})();
</script>
</body>
</html>
