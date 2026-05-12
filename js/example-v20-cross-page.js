/* ===============================================================
   example-v20-cross-page.js -- shared logic for the two-page
   sitemap demo (page A dashboard / page B settings).

   Purpose: prove that NAC.declareSitemap() + describe_v2().sitemap
   let an intermediary (autopilot OR chatbot) plan a navigation
   that crosses a page boundary. The visible tree of page A does
   NOT contain settings.system.smtp.* slugs; the sitemap does.

   Pattern:
     1. Both pages call declareSharedSitemap(): same JSON,
        idempotent. Whichever page loads first or last, the
        intermediary always sees the same path catalog.
     2. The autopilot on page A asks: "user wants SMTP". Tree
        check fails -> sitemap check finds settings.system.smtp
        with affordance_to_navigate=[click topbar.settings].
     3. Autopilot dispatches the navigation click. The link is a
        normal <a href>; the browser carries the autopilot intent
        across the page break via ?nac_autopilot=smtp_demo.
     4. Page B boots, sees the query, resumes the autopilot
        on the visible SMTP form, dispatches fill+save.

   The same flow applies in reverse (page B asks for dashboard
   widget X, plans via topbar.dashboard click, continues on A).

   Spec ref: NAC v2.0 sec 17 sitemap primitive (rc5+).
   ASCII-only.
   =============================================================== */
(function (global) {
  'use strict';

  /* ---------- shared sitemap (identical on both pages) -------- */
  function declareSharedSitemap() {
    if (!global.NAC || typeof NAC.declareSitemap !== 'function') {
      console.warn('[cross-page] NAC.declareSitemap not available; '
        + 'this build is < 2.0.0-rc5. Sitemap path planning '
        + 'requires rc5 or newer.');
      return false;
    }
    NAC.declareSitemap({
      paths: [
        {
          slug: 'page.dashboard',
          label_i18n: {
            es: 'Tablero principal',     en: 'Main dashboard',
            pt: 'Painel principal',      fr: 'Tableau de bord',
            it: 'Cruscotto principale',  de: 'Haupt-Dashboard',
            ja: 'メイン ダッシュボード', zh: '主仪表板',
            hi: 'मुख्य डैशबोर्ड',           ar: 'لوحة التحكم الرئيسية'
          },
          affordance_to_navigate: [
            { action: 'click', target: 'topbar.dashboard' }
          ],
          tags: ['page', 'overview']
        },
        {
          slug: 'page.settings',
          label_i18n: {
            es: 'Configuracion',  en: 'Settings',
            pt: 'Configuracoes',  fr: 'Parametres',
            it: 'Impostazioni',   de: 'Einstellungen',
            ja: '設定',           zh: '设置',
            hi: 'सेटिंग्स',          ar: 'الإعدادات'
          },
          affordance_to_navigate: [
            { action: 'click', target: 'topbar.settings' }
          ],
          tags: ['page', 'configuration']
        },
        {
          slug: 'settings.system.smtp',
          label_i18n: {
            es: 'Configuracion SMTP',  en: 'SMTP settings',
            pt: 'Configuracao SMTP',   fr: 'Parametres SMTP',
            it: 'Impostazioni SMTP',   de: 'SMTP-Einstellungen',
            ja: 'SMTP 設定',           zh: 'SMTP 设置',
            hi: 'SMTP सेटिंग्स',          ar: 'إعدادات SMTP'
          },
          /* affordance_to_navigate is a sequence: click in this
             order, with each step re-validated against the visible
             tree before dispatch (sec 17.3). When the user is on
             page A, the topbar.settings click navigates to page B
             via a real anchor; THE BROWSER carries the autopilot
             intent in ?nac_autopilot=. When already on page B,
             only the second step runs (and the first is a no-op
             because page.settings is already current). */
          affordance_to_navigate: [
            { action: 'click', target: 'topbar.settings' },
            { action: 'focus', target: 'settings.system.smtp.host' }
          ],
          requires_permission: ['admin'],
          tags: ['integration', 'mail', 'configuration']
        }
      ]
    });
    return true;
  }

  /* ---------- helpers ---------------------------------------- */
  function $(sel) { return document.querySelector(sel); }
  function $id(id) {
    /* try data-nac-id first, then literal #id, then DOM id */
    return document.querySelector('[data-nac-id="' + id + '"]')
        || document.getElementById(id);
  }

  function logLine(text) {
    var out = document.getElementById('cp-log');
    if (!out) {
      console.log('[cross-page]', text);
      return;
    }
    var ts = new Date().toISOString().split('T')[1].slice(0, 12);
    out.textContent = '[' + ts + '] ' + text + '\n' + out.textContent;
  }

  /* ---------- query string parser ---------------------------- */
  function getAutopilotQuery() {
    try {
      var sp = new URLSearchParams(window.location.search);
      return sp.get('nac_autopilot') || null;
    } catch (_) { return null; }
  }

  /* ---------- autopilot, page A side ------------------------- */
  /* User intent: "configurar SMTP". Page A has no SMTP slug in
     its visible tree. The autopilot must discover via sitemap
     that the path lives under settings.system.smtp and plan the
     cross-page navigation. */
  function runAutopilotPageA() {
    if (!global.NAC || typeof NAC.describe_v2 !== 'function') {
      logLine('FAIL: NAC v2.0 not available.');
      return;
    }
    logLine('AUTOPILOT INTENT: "configurar SMTP" (user phrase, locale-agnostic).');

    var d = NAC.describe_v2();
    var slugInTree = d.v2_scope_entries.some(function (e) {
      return e.slug === 'settings.system.smtp'
          || (e.slug && e.slug.indexOf('settings.system.smtp') === 0);
    });
    logLine('STEP 1: visible tree contains settings.system.smtp? ' + slugInTree);

    if (slugInTree) {
      logLine('Tree-resident; dispatch directly. (Should not happen on page A.)');
      return;
    }

    var sm = d.sitemap;
    logLine('STEP 2: sitemap declared? ' + (!!sm));
    if (!sm) {
      logLine('FAIL: no sitemap. Cannot plan cross-page navigation.');
      return;
    }
    var path = sm.paths.filter(function (p) { return p.slug === 'settings.system.smtp'; })[0];
    logLine('STEP 3: sitemap path resolved: ' + (path ? 'YES' : 'NO'));
    if (!path) {
      logLine('FAIL: settings.system.smtp not in sitemap.');
      return;
    }

    logLine('STEP 4: affordance_to_navigate = '
      + JSON.stringify(path.affordance_to_navigate));
    var firstStep = path.affordance_to_navigate[0];
    if (!firstStep || firstStep.action !== 'click') {
      logLine('FAIL: first step is not a click.');
      return;
    }

    var target = $id(firstStep.target);
    logLine('STEP 5: visible tree contains "' + firstStep.target + '"? '
      + (!!target));
    if (!target) {
      logLine('FAIL: cannot dispatch first nav step; target missing on page A.');
      return;
    }

    /* Carry the autopilot intent across the page break via the
       URL. The link is a real <a href>; we just decorate the URL
       with ?nac_autopilot=smtp_demo before clicking, so when
       page B boots it picks up where we left off. */
    var hrefAttr = target.getAttribute('href');
    if (hrefAttr) {
      var sep = hrefAttr.indexOf('?') >= 0 ? '&' : '?';
      target.setAttribute('href', hrefAttr + sep + 'nac_autopilot=smtp_demo');
      logLine('STEP 6: decorated href -> ' + target.getAttribute('href'));
    }

    logLine('STEP 7: dispatching cross-page navigation click...');
    setTimeout(function () { target.click(); }, 600);
  }

  /* ---------- autopilot, page B side (continuation) ---------- */
  function runAutopilotPageBContinuation() {
    if (!global.NAC || typeof NAC.describe_v2 !== 'function') {
      logLine('FAIL: NAC v2.0 not available.');
      return;
    }
    logLine('AUTOPILOT CONTINUATION (resumed from ?nac_autopilot=smtp_demo).');
    var d = NAC.describe_v2();
    var hostEl  = $id('settings.system.smtp.host');
    var portEl  = $id('settings.system.smtp.port');
    var userEl  = $id('settings.system.smtp.user');
    var saveEl  = $id('settings.system.smtp.save');

    if (!hostEl || !portEl || !userEl || !saveEl) {
      logLine('FAIL: SMTP form not visible on page B.');
      return;
    }
    logLine('STEP 1: SMTP form is now in the visible tree (cross-page nav OK).');

    function step(delay, fn) { setTimeout(fn, delay); }

    step(400, function () {
      hostEl.focus();
      hostEl.value = 'smtp.gmail.com';
      hostEl.dispatchEvent(new Event('input', { bubbles: true }));
      logLine('STEP 2: filled host = "smtp.gmail.com"');
    });
    step(900, function () {
      portEl.focus();
      portEl.value = '587';
      portEl.dispatchEvent(new Event('input', { bubbles: true }));
      logLine('STEP 3: filled port = "587"');
    });
    step(1400, function () {
      userEl.focus();
      userEl.value = 'demo@yujin.app';
      userEl.dispatchEvent(new Event('input', { bubbles: true }));
      logLine('STEP 4: filled user = "demo@yujin.app"');
    });
    step(2000, function () {
      saveEl.click();
      logLine('STEP 5: clicked save. Cross-page sitemap navigation: SUCCESS.');
      /* clean up the URL so reload does not re-trigger */
      try {
        var url = new URL(window.location.href);
        url.searchParams.delete('nac_autopilot');
        history.replaceState({}, '', url.toString());
      } catch (_) {}
    });
  }

  /* ---------- public API ------------------------------------ */
  global.YujinCrossPageDemo = {
    declareSharedSitemap: declareSharedSitemap,
    runAutopilotPageA: runAutopilotPageA,
    runAutopilotPageBContinuation: runAutopilotPageBContinuation,
    getAutopilotQuery: getAutopilotQuery,
    log: logLine
  };
})(typeof window !== 'undefined' ? window : globalThis);
