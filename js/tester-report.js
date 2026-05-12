/**
 * tester-report.js -- thin client that gathers a tester
 * checklist form, posts the structured payload to
 * /api/v1/tester-reports/submit, auto-saves to localStorage
 * on every change, and falls back to a mailto: link if the
 * POST endpoint is unreachable.
 *
 * Mounted by the markdown render pipeline (render_tester_doc.py).
 * Expects:
 *   <form id="tester-form" data-doc-slug="..." data-doc-lang="...">
 *     ... fieldsets per task with inputs named:
 *       task-N-status (radio: ok | error | skipped)
 *       task-N-comments (textarea)
 *     ... plus sign-off fields:
 *       sign-tester-name, sign-tester-email,
 *       sign-release-tag, sign-browser, sign-os, sign-device,
 *       sign-verdict, sign-rating, sign-free-form, sign-top-issues
 *     ... plus a honeypot input named "website"
 *     ... plus a <button type="submit">Submit</button>
 *     ... plus a <div class="tr-status" aria-live="polite"></div>
 */

(function () {
  'use strict';

  /* Currently the endpoint lives on the sandbox (crm_desa). Once
     production (yujin.app/api/v1) has the handler + migration
     applied, swap PRIMARY back to https://yujin.app/api/v1/... */
  var ENDPOINT_PRIMARY  = 'https://rpaforce.com/crm_desa/api/v1/tester-reports/submit';
  var ENDPOINT_SANDBOX  = 'https://yujin.app/api/v1/tester-reports/submit';
  var FALLBACK_MAILTO_TO = 'pablo.kuschnirof@gmail.com';

  function $(id) { return document.getElementById(id); }
  function $$(sel, root) { return Array.from((root || document).querySelectorAll(sel)); }

  function init() {
    var form = $('tester-form');
    if (!form) return;

    var docSlug = form.getAttribute('data-doc-slug') || 'unknown';
    var docLang = form.getAttribute('data-doc-lang') || 'en';
    var storageKey = 'tester-report:' + docSlug + ':' + docLang;

    restore(form, storageKey);
    form.addEventListener('change',  function () { persist(form, storageKey); });
    form.addEventListener('input',   function () { persist(form, storageKey); });
    form.addEventListener('submit',  function (ev) { ev.preventDefault(); submit(form, docSlug, docLang, storageKey); });
  }

  function restore(form, storageKey) {
    try {
      var raw = localStorage.getItem(storageKey);
      if (!raw) return;
      var saved = JSON.parse(raw);
      Object.keys(saved).forEach(function (name) {
        var els = form.querySelectorAll('[name="' + cssEscape(name) + '"]');
        if (!els.length) return;
        var val = saved[name];
        if (els[0].type === 'radio') {
          Array.from(els).forEach(function (r) { r.checked = (r.value === val); });
        } else if (els[0].type === 'checkbox') {
          els[0].checked = !!val;
        } else {
          els[0].value = (val == null ? '' : String(val));
        }
      });
      showStatus(form, 'Borrador restaurado / draft restored', 'info');
    } catch (e) { /* corrupt local cache; ignore */ }
  }

  function persist(form, storageKey) {
    var data = collect(form);
    try {
      localStorage.setItem(storageKey, JSON.stringify(data.flat));
    } catch (e) { /* quota or private mode -- ignore */ }
  }

  function collect(form) {
    var flat = {};
    var tasks = {};
    var meta  = {};
    var inputs = $$('input,textarea,select', form);
    inputs.forEach(function (el) {
      var name = el.name;
      if (!name) return;
      var val;
      if (el.type === 'radio') {
        if (!el.checked) return;
        val = el.value;
      } else if (el.type === 'checkbox') {
        val = el.checked ? (el.value || true) : null;
      } else {
        val = el.value;
      }
      flat[name] = val;
      var m = name.match(/^task-(.+?)-(status|comments|notes)$/);
      if (m) {
        var key = m[1];
        var kind = m[2];
        if (!tasks[key]) tasks[key] = { id: key };
        tasks[key][kind] = val;
      } else if (name.indexOf('sign-') === 0) {
        meta[name.slice(5)] = val;
      } else {
        meta[name] = val;
      }
    });
    var answers = [];
    Object.keys(tasks).sort(_taskCmp).forEach(function (k) {
      answers.push(tasks[k]);
    });
    return { flat: flat, answers: answers, meta: meta };
  }

  function _taskCmp(a, b) {
    /* sort task ids numerically when possible: "V1" < "V10" */
    var ra = a.match(/(\d+)/);
    var rb = b.match(/(\d+)/);
    if (ra && rb) {
      var na = parseInt(ra[1], 10), nb = parseInt(rb[1], 10);
      if (na !== nb) return na - nb;
    }
    return a.localeCompare(b);
  }

  function submit(form, docSlug, docLang, storageKey) {
    var data = collect(form);
    if (data.meta.website) {
      /* Honeypot triggered -- silent. */
      showStatus(form, 'OK', 'success');
      return;
    }
    var payload = {
      doc_slug:         docSlug,
      doc_lang:         docLang,
      website:          '',
      release_tag:      data.meta['release-tag']  || '',
      tester_name:      data.meta['tester-name']  || '',
      tester_email:     data.meta['tester-email'] || '',
      browser:          data.meta['browser']      || '',
      os:               data.meta['os']           || '',
      device:           data.meta['device']       || '',
      overall_verdict:  data.meta['verdict']      || '',
      overall_rating:   data.meta['rating']       || '',
      free_form_feedback: data.meta['free-form']  || '',
      top_issues_text:    data.meta['top-issues'] || '',
      answers:          data.answers,
    };

    showStatus(form, 'Enviando reporte / sending...', 'info');
    var btn = form.querySelector('button[type="submit"]');
    if (btn) btn.disabled = true;

    postWithFallback(payload)
      .then(function (resp) {
        if (resp && resp.ok) {
          showStatus(form,
            (docLang === 'es'
              ? 'Gracias. Tu reporte fue enviado (ID #' + (resp.report_id || '?') + ').'
              : 'Thank you. Your report was submitted (ID #' + (resp.report_id || '?') + ').'),
            'success');
          try { localStorage.removeItem(storageKey); } catch (e) {}
        } else {
          throw new Error('non-ok response');
        }
      })
      .catch(function () {
        /* Fallback: prepare mailto. */
        var subject = encodeURIComponent('[Yujin tester] ' + docSlug + ' / ' + docLang);
        var bodyText = _formatPlainText(payload);
        var body = encodeURIComponent(bodyText);
        var href = 'mailto:' + FALLBACK_MAILTO_TO
                 + '?subject=' + subject + '&body=' + body;
        showStatus(form,
          (docLang === 'es'
            ? 'No se pudo conectar al servidor. Abriendo tu cliente de email como respaldo...'
            : 'Could not reach the server. Opening your email client as fallback...'),
          'warning');
        window.location.href = href;
      })
      .finally(function () { if (btn) btn.disabled = false; });
  }

  function postWithFallback(payload) {
    return _post(ENDPOINT_PRIMARY, payload).catch(function () {
      return _post(ENDPOINT_SANDBOX, payload);
    });
  }

  function _post(url, payload) {
    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      mode: 'cors',
      credentials: 'omit',
    }).then(function (r) {
      if (!r.ok) throw new Error('http_' + r.status);
      return r.json();
    });
  }

  function _formatPlainText(p) {
    var s = 'Tester report (fallback by email)\n\n';
    s += 'Doc:        ' + p.doc_slug + ' (' + p.doc_lang + ')\n';
    s += 'Release:    ' + p.release_tag + '\n';
    s += 'Tester:     ' + p.tester_name + ' <' + p.tester_email + '>\n';
    s += 'Browser:    ' + p.browser + ' on ' + p.os + ' (' + p.device + ')\n';
    s += 'Verdict:    ' + p.overall_verdict + ' rating=' + p.overall_rating + '\n\n';
    s += 'ANSWERS\n';
    (p.answers || []).forEach(function (a) {
      s += '  Task ' + a.id + ': ' + (a.status || '-');
      if (a.comments) s += '  -- ' + String(a.comments).replace(/\n/g, ' / ');
      s += '\n';
    });
    s += '\nTOP ISSUES\n' + (p.top_issues_text || '(none)') + '\n';
    s += '\nFREE-FORM\n'  + (p.free_form_feedback || '(none)') + '\n';
    return s;
  }

  function showStatus(form, msg, kind) {
    var el = form.querySelector('.tr-status');
    if (!el) return;
    el.textContent = msg;
    el.className = 'tr-status tr-status-' + (kind || 'info');
  }

  function cssEscape(s) {
    return String(s).replace(/(["\\\[\]:.])/g, '\\$1');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
