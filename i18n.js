/* NAC3 landing — language switcher.
 *
 * Same mechanism as the Urazuke landing: the page ships readable English in the
 * markup, and a catalogue replaces it at runtime.
 *
 *   data-i18n="key"             -> replaces textContent
 *   data-i18n-html="key"        -> replaces innerHTML (for strings with <em>, <code>, <strong>)
 *   data-i18n-attr="attr:key"   -> replaces an attribute; several separated by ";"
 *
 * One rule that is not cosmetic: a language is only offered if its catalogue
 * exists AND declares itself complete. A half-translated catalogue would serve
 * English strings under a Spanish flag, which is the kind of quiet lie the
 * contract this page describes exists to prevent. Incomplete catalogues are
 * skipped and reported in the console, never shown in the selector.
 */
(function () {
  'use strict';

  var LOCALES = [
    { code: 'en', label: 'English' },
    { code: 'es', label: 'Español' },
    { code: 'pt', label: 'Português' },
    { code: 'fr', label: 'Français' },
    { code: 'de', label: 'Deutsch' },
    { code: 'it', label: 'Italiano' },
    { code: 'ja', label: '日本語' },
    { code: 'zh', label: '中文' },
    { code: 'hi', label: 'हिन्दी' },
    { code: 'ar', label: 'العربية' }
  ];
  var RTL = { ar: true };
  var STORE = 'nac3-lang';
  var BASE = 'i18n/';

  var select = document.getElementById('lang-select');
  var cache = {};
  var available = null;

  function pick() {
    var saved;
    try { saved = localStorage.getItem(STORE); } catch (e) { saved = null; }
    if (saved) return saved;
    var nav = (navigator.languages && navigator.languages[0]) || navigator.language || 'en';
    var short = String(nav).toLowerCase().slice(0, 2);
    for (var i = 0; i < LOCALES.length; i++) if (LOCALES[i].code === short) return short;
    return 'en';
  }

  function load(code) {
    if (cache[code]) return Promise.resolve(cache[code]);
    return fetch(BASE + code + '.json', { cache: 'no-cache' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) {
        if (!j) return null;
        // A catalogue has to say it is finished before it is allowed to render.
        if (j._status !== 'complete') {
          console.warn('[nac3-i18n] catalogue "' + code + '" is present but not complete; not offered.');
          return null;
        }
        cache[code] = j;
        return j;
      })
      .catch(function () { return null; });
  }

  function apply(dict, code) {
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      var v = dict[el.getAttribute('data-i18n')];
      if (typeof v === 'string') el.textContent = v;
    });
    document.querySelectorAll('[data-i18n-html]').forEach(function (el) {
      var v = dict[el.getAttribute('data-i18n-html')];
      if (typeof v === 'string') el.innerHTML = v;
    });
    document.querySelectorAll('[data-i18n-attr]').forEach(function (el) {
      el.getAttribute('data-i18n-attr').split(';').forEach(function (pair) {
        var bits = pair.split(':');
        if (bits.length < 2) return;
        var v = dict[bits.slice(1).join(':').trim()];
        if (typeof v === 'string') el.setAttribute(bits[0].trim(), v);
      });
    });
    document.documentElement.lang = code;
    document.documentElement.dir = RTL[code] ? 'rtl' : 'ltr';
  }

  function set(code) {
    load(code).then(function (dict) {
      if (!dict) { if (code !== 'en') set('en'); return; }
      apply(dict, code);
      try { localStorage.setItem(STORE, code); } catch (e) { /* private window */ }
      if (select) select.value = code;
    });
  }

  // Build the selector from the catalogues that actually answer and are complete.
  function build() {
    if (!select) return Promise.resolve([]);
    return Promise.all(LOCALES.map(function (l) {
      return load(l.code).then(function (d) { return d ? l : null; });
    })).then(function (found) {
      available = found.filter(Boolean);
      if (available.length < 2) { select.style.display = 'none'; return available; }
      select.innerHTML = '';
      available.forEach(function (l) {
        var o = document.createElement('option');
        o.value = l.code; o.textContent = l.label;
        select.appendChild(o);
      });
      select.addEventListener('change', function () { set(select.value); });
      return available;
    });
  }

  function start() {
    build().then(function (list) {
      var want = pick();
      var ok = list.some(function (l) { return l.code === want; });
      set(ok ? want : 'en');
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
