<?php
/**
 * example-v20-page-a.php -- Dashboard page (page A).
 *
 * Companion to example-v20-page-b.php. Together they prove that
 * NAC.declareSitemap() (spec sec 17, runtime rc5+) lets an
 * intermediary -- autopilot OR LLM chatbot -- plan a navigation
 * that crosses a page break.
 *
 * The visible NAC tree on this page does NOT contain the SMTP
 * form. The sitemap does. The autopilot button below asks
 * "configurar SMTP" -- the runtime then:
 *   1. Checks the visible tree -- no match.
 *   2. Reads describe_v2().sitemap -- finds settings.system.smtp
 *      with affordance_to_navigate=[click topbar.settings].
 *   3. Decorates the topbar link with ?nac_autopilot=smtp_demo
 *      and dispatches a click. The browser navigates to page B.
 *   4. Page B boots, sees the query, completes the SMTP form.
 *
 * ASCII-only (rule 3 of repo CLAUDE.md, GoDaddy PHP 8.3).
 */
?><!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>NAC v2.0 cross-page sitemap demo - page A (dashboard)</title>
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
  .card p { margin:0 0 12px 0; line-height:1.5; color:#555; }
  button.cta { background:#1a1a1a; color:#f5f5f5; border:0; padding:10px 18px;
               border-radius:6px; font-size:14px; cursor:pointer; }
  button.cta:hover { background:#333; }
  pre#cp-log { background:#0f0f0f; color:#9ad; padding:14px; border-radius:6px;
               font-size:12px; line-height:1.5; max-height:280px;
               overflow:auto; white-space:pre-wrap; }
  .lbl { display:inline-block; min-width:120px; color:#777; font-size:13px; }
  .pill { display:inline-block; padding:2px 8px; border-radius:10px;
          background:#eef3ee; color:#264; font-size:11px; }
  .muted { color:#888; font-size:12px; }
</style>
</head>
<body>

<header class="topbar" data-nac-plugin="topbar">
  <span class="brand">Yujin demo</span>
  <span class="current"
        data-nac-id="topbar.dashboard"
        data-nac-role="navigation"
        aria-current="page">Dashboard</span>
  <a href="example-v20-page-b.php"
     data-nac-id="topbar.settings"
     data-nac-role="navigation"
     aria-label="Settings">Settings</a>
  <span style="margin-left:auto;" class="muted">page A</span>
</header>

<main class="wrap">

  <article class="card" data-nac-plugin="dashboard.welcome">
    <h2>Welcome <span class="pill">page A</span></h2>
    <p>This is the dashboard. Notice that <strong>no SMTP form
       lives on this page</strong> -- it is on the Settings page
       (page B). Yet the autopilot below can satisfy the intent
       <em>"configurar SMTP"</em> by reading the sitemap, planning
       the navigation, and continuing the work after the page
       break.</p>
    <p class="muted">Open the browser console on both pages to
       follow the NAC events. The log box at the bottom of each
       page narrates the autopilot decisions.</p>
  </article>

  <article class="card" data-nac-plugin="dashboard.autopilot">
    <h2>Autopilot trigger</h2>
    <p>Click the button. The autopilot will:
       <ol>
         <li>Inspect <code>describe_v2()</code>'s visible tree
             (no SMTP slug present here).</li>
         <li>Read <code>describe_v2().sitemap</code> and find
             <code>settings.system.smtp</code>.</li>
         <li>Walk the path's
             <code>affordance_to_navigate</code> and dispatch the
             cross-page click.</li>
         <li>Page B picks up <code>?nac_autopilot=smtp_demo</code>
             and finishes the form.</li>
       </ol>
    </p>
    <button id="cp-run-autopilot" class="cta"
            data-nac-id="dashboard.autopilot.run"
            data-nac-role="action"
            data-nac-action="play">
      Run autopilot: configure SMTP
    </button>
  </article>

  <article class="card" data-nac-plugin="dashboard.log">
    <h2>Autopilot log</h2>
    <p class="muted">Newest entries on top. Each line shows the
       step the runtime took. STEP 1 will report
       "tree contains settings.system.smtp? false" -- correctly --
       and STEP 4 will print the affordance_to_navigate from the
       sitemap.</p>
    <pre id="cp-log">(idle -- click the button)</pre>
  </article>

  <article class="card" data-nac-plugin="dashboard.facts">
    <h2>What this proves</h2>
    <ul>
      <li><span class="lbl">Tree is authority.</span>
          The intermediary NEVER invokes a slug not in the
          visible tree at dispatch time. Sitemap is metadata.</li>
      <li><span class="lbl">Plan before act.</span>
          Cross-page navigation is a planned sequence: each step
          re-validated on its own page.</li>
      <li><span class="lbl">No client-side state.</span>
          The intent transfers via a URL query (HTTP-native).
          Sticky session / localStorage / cookies optional.</li>
      <li><span class="lbl">LLM contract.</span>
          The same sitemap that the autopilot reads here is what
          a chatbot sees in its system prompt -- both classes
          plan identically. Equality of access (RFC sec 0a).</li>
    </ul>
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

  function bootCrossPageDemoA() {
    if (!window.NAC || !window.NAC.scope) {
      return setTimeout(bootCrossPageDemoA, 50);
    }

    /* === 1. Tenant prefix === */
    try { NAC.setTenantPrefix('cross_page_demo'); } catch (_) {}

    /* === 2. Provenance secret (HMAC) === */
    NAC.set_provenance_secret('cross-page-demo-secret');

    /* === 3. Plugin manifests for the topbar + dashboard === */
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
      plugin_slug: 'dashboard.autopilot',
      version: '1.0.0',
      nac_version: '1.0',
      elements: [
        { id: 'dashboard.autopilot.run', role: 'action',
          actions: [{ verb: 'play', label_i18n: {
            es: 'Configurar SMTP via autopilot',
            en: 'Configure SMTP via autopilot' } }] }
      ]
    });

    /* === 4. Build a v2 scope tree === */
    var shell = NAC.scope({
      slug: 'shell',
      label_i18n: { es: 'Demo cross-page',
                    en: 'Cross-page demo' }
    });
    shell.scope({ slug: 'topbar',
      label_i18n: { es: 'Barra superior', en: 'Topbar' } });
    shell.scope({ slug: 'dashboard',
      label_i18n: { es: 'Tablero', en: 'Dashboard' } });

    /* === 5. Declare the SHARED sitemap (sec 17) === */
    var ok = window.YujinCrossPageDemo.declareSharedSitemap();
    YujinCrossPageDemo.log('boot: sitemap declared = ' + ok);

    /* === 6. Echo what describe_v2 sees === */
    var d = NAC.describe_v2();
    YujinCrossPageDemo.log('boot: nac_version=' + d.nac_version
      + ' / scopes=' + d.v2_scope_entries.length
      + ' / sitemap_paths=' + (d.sitemap ? d.sitemap.paths.length : 0));
  }
  bootCrossPageDemoA();

  /* === 7. Wire the autopilot button === */
  document.addEventListener('click', function (e) {
    var t = e.target;
    if (t && t.getAttribute('data-nac-id') === 'dashboard.autopilot.run') {
      window.YujinCrossPageDemo.runAutopilotPageA();
    }
  });
})();
</script>

</body>
</html>
