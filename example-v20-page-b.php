<?php
/**
 * example-v20-page-b.php -- Settings / SMTP page (page B).
 *
 * Companion to example-v20-page-a.php. The visible NAC tree on
 * THIS page contains the SMTP form (settings.system.smtp.*); the
 * sitemap is identical to page A's, so an intermediary that
 * arrived from page A via the sitemap-planned navigation can
 * resume work here.
 *
 * Continuation trigger: the URL query ?nac_autopilot=smtp_demo.
 * Set on page A by runAutopilotPageA() right before the click.
 *
 * ASCII-only (rule 3 of repo CLAUDE.md, GoDaddy PHP 8.3).
 */
?><!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>NAC v2.0 cross-page sitemap demo - page B (settings/SMTP)</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  body { font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
         margin: 0; background: #fafafa; color: #1a1a1a; }
  .topbar { display:flex; align-items:center; gap:16px; padding:12px 24px;
            background:#1a1a1a; color:#f5f5f5; border-bottom:2px solid #c8a04d; }
  .topbar .brand { font-weight:600; letter-spacing:0.4px; }
  .topbar a, .topbar .current { color:#f5f5f5; text-decoration:none;
            padding:6px 12px; border-radius:6px; font-size:14px; }
  .topbar a:hover { background:#333; }
  .topbar .current { background:#c8a04d; color:#1a1a1a; font-weight:600; }
  .wrap { max-width: 880px; margin: 24px auto; padding: 0 16px; }
  .card { background:#fff; border:1px solid #e5e5e5; border-radius:8px;
          padding:20px; margin-bottom:16px; }
  .card h2 { margin:0 0 8px 0; font-size:18px; }
  .field { display:block; margin-bottom:14px; }
  .field label { display:block; font-size:13px; color:#555;
                 margin-bottom:4px; }
  .field input { width:100%; padding:8px 10px; border:1px solid #cbd2d9;
                 border-radius:6px; font-size:14px; box-sizing:border-box; }
  button.cta { background:#1a1a1a; color:#f5f5f5; border:0; padding:10px 18px;
               border-radius:6px; font-size:14px; cursor:pointer; }
  button.cta.save { background:#2d6a4f; }
  button.cta:hover { background:#333; }
  pre#cp-log { background:#0f0f0f; color:#9ad; padding:14px; border-radius:6px;
               font-size:12px; line-height:1.5; max-height:280px;
               overflow:auto; white-space:pre-wrap; }
  .pill { display:inline-block; padding:2px 8px; border-radius:10px;
          background:#fdecef; color:#7b2030; font-size:11px; }
  .ok-pill { background:#e6f3ec; color:#246b3f; }
  .muted { color:#888; font-size:12px; }
  .saved-status { font-size:13px; color:#246b3f; margin-top:6px; }
</style>
</head>
<body>

<header class="topbar" data-nac-plugin="topbar">
  <span class="brand">Yujin demo</span>
  <a href="example-v20-page-a.php"
     data-nac-id="topbar.dashboard"
     data-nac-role="navigation"
     aria-label="Dashboard">Dashboard</a>
  <span class="current"
        data-nac-id="topbar.settings"
        data-nac-role="navigation"
        aria-current="page">Settings</span>
  <span style="margin-left:auto;" class="muted">page B</span>
</header>

<main class="wrap">

  <article class="card" data-nac-plugin="settings.system.smtp">
    <h2>SMTP <span class="pill" id="cp-pill">arrived from page A</span></h2>
    <p class="muted">If you reached this page through the
       autopilot on page A, the sitemap-planned navigation
       worked. The form fields below are part of the visible
       NAC tree on this page; on page A they were not. The
       autopilot continuation below will fill + save them in
       the next ~2 seconds.</p>

    <form id="cp-smtp-form" onsubmit="event.preventDefault(); document.getElementById('cp-save').click();">
      <div class="field">
        <label for="cp-host">Host</label>
        <input type="text" id="cp-host"
               data-nac-id="settings.system.smtp.host"
               data-nac-role="textbox"
               placeholder="smtp.example.com" autocomplete="off">
      </div>
      <div class="field">
        <label for="cp-port">Port</label>
        <input type="number" id="cp-port"
               data-nac-id="settings.system.smtp.port"
               data-nac-role="textbox"
               placeholder="587" autocomplete="off">
      </div>
      <div class="field">
        <label for="cp-user">SMTP user</label>
        <input type="text" id="cp-user"
               data-nac-id="settings.system.smtp.user"
               data-nac-role="textbox"
               placeholder="user@example.com" autocomplete="off">
      </div>
      <button type="button" id="cp-save"
              class="cta save"
              data-nac-id="settings.system.smtp.save"
              data-nac-role="action"
              data-nac-action="save">Save SMTP settings</button>
      <p id="cp-saved-status" class="saved-status" hidden></p>
    </form>
  </article>

  <article class="card" data-nac-plugin="settings.continuation.log">
    <h2>Continuation log</h2>
    <p class="muted">If <code>?nac_autopilot=smtp_demo</code> is
       in the URL, the autopilot continuation runs at boot. The
       log narrates each step in the visible tree of page B.</p>
    <pre id="cp-log">(boot pending)</pre>
  </article>

</main>

<!-- v1.9 runtime -->
<script src="js/nac.js"></script>
<!-- v2.0 extensions (rc5+) -->
<script src="js/nac-v2-extensions.js"></script>
<!-- shared cross-page demo logic -->
<script src="js/example-v20-cross-page.js"></script>

<script>
(function () {
  'use strict';

  function bootCrossPageDemoB() {
    if (!window.NAC || !window.NAC.scope) {
      return setTimeout(bootCrossPageDemoB, 50);
    }

    /* === 1. Tenant prefix (idempotent across pages) === */
    try { NAC.setTenantPrefix('cross_page_demo'); } catch (_) {}

    /* === 2. Provenance secret === */
    NAC.set_provenance_secret('cross-page-demo-secret');

    /* === 3. Plugin manifests === */
    NAC.register({
      plugin_slug: 'topbar',
      version: '1.0.0',
      nac_version: '1.0',
      elements: [
        { id: 'topbar.dashboard', role: 'navigation',
          label_i18n: { es: 'Tablero', en: 'Dashboard' } },
        { id: 'topbar.settings', role: 'navigation',
          label_i18n: { es: 'Configuracion', en: 'Settings' } }
      ]
    });
    NAC.register({
      plugin_slug: 'settings.system.smtp',
      version: '1.0.0',
      nac_version: '1.0',
      elements: [
        { id: 'settings.system.smtp.host', role: 'textbox',
          label_i18n: { es: 'Servidor SMTP', en: 'SMTP host' } },
        { id: 'settings.system.smtp.port', role: 'textbox',
          label_i18n: { es: 'Puerto SMTP',   en: 'SMTP port' } },
        { id: 'settings.system.smtp.user', role: 'textbox',
          label_i18n: { es: 'Usuario SMTP',  en: 'SMTP user' } },
        { id: 'settings.system.smtp.save', role: 'action',
          actions: [{ verb: 'save', label_i18n: {
            es: 'Guardar configuracion SMTP',
            en: 'Save SMTP settings' } }] }
      ]
    });

    /* === 4. v2 scope tree === */
    var shell = NAC.scope({
      slug: 'shell',
      label_i18n: { es: 'Demo cross-page',
                    en: 'Cross-page demo' }
    });
    shell.scope({ slug: 'topbar',
      label_i18n: { es: 'Barra superior', en: 'Topbar' } });
    var settingsScope = shell.scope({ slug: 'settings',
      label_i18n: { es: 'Configuracion', en: 'Settings' } });
    settingsScope.scope({ slug: 'system',
      label_i18n: { es: 'Sistema', en: 'System' } })
      .scope({ slug: 'smtp',
        label_i18n: { es: 'SMTP', en: 'SMTP' } });

    /* === 5. Same sitemap as page A === */
    var ok = window.YujinCrossPageDemo.declareSharedSitemap();
    YujinCrossPageDemo.log('boot: sitemap declared = ' + ok);

    var d = NAC.describe_v2();
    YujinCrossPageDemo.log('boot: nac_version=' + d.nac_version
      + ' / scopes=' + d.v2_scope_entries.length
      + ' / sitemap_paths=' + (d.sitemap ? d.sitemap.paths.length : 0));

    /* === 6. Resume autopilot if we arrived from page A === */
    var q = window.YujinCrossPageDemo.getAutopilotQuery();
    if (q === 'smtp_demo') {
      YujinCrossPageDemo.log('continuation flag detected -> '
        + 'runAutopilotPageBContinuation()');
      var pill = document.getElementById('cp-pill');
      if (pill) {
        pill.textContent = 'arrived from page A (autopilot)';
        pill.className = 'pill ok-pill';
      }
      setTimeout(function () {
        window.YujinCrossPageDemo.runAutopilotPageBContinuation();
      }, 700);
    } else {
      YujinCrossPageDemo.log('idle (no continuation flag in URL).');
      var pill2 = document.getElementById('cp-pill');
      if (pill2) {
        pill2.textContent = 'manual visit (no autopilot)';
      }
    }
  }
  bootCrossPageDemoB();

  /* === 7. Wire the save button === */
  document.addEventListener('click', function (e) {
    var t = e.target;
    if (t && t.getAttribute('data-nac-id') === 'settings.system.smtp.save') {
      var host = (document.getElementById('cp-host') || {}).value || '';
      var port = (document.getElementById('cp-port') || {}).value || '';
      var user = (document.getElementById('cp-user') || {}).value || '';
      var status = document.getElementById('cp-saved-status');
      if (status) {
        status.hidden = false;
        status.textContent = 'Saved (demo only): host=' + host
          + ' port=' + port + ' user=' + user;
      }
    }
  });
})();
</script>

</body>
</html>
