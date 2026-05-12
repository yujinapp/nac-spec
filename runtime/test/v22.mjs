/**
 * v2.2 unit-style tests for the strict validator + bindAction.
 *
 * Strategy: build a minimal but functional EventTarget-based
 * "browser" in pure Node so the runtime IIFE can boot. Then drive
 * NAC.register with crafted manifests and assert console.error
 * fires for each finding code. Drive NAC.bindAction to verify the
 * ack event fires after a sync click + after a Promise resolve +
 * the failure event fires on throw.
 *
 * No jsdom dep -- tiny shim, ~150 lines.
 */

import fs from 'node:fs';
import path from 'node:path';
import url  from 'node:url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const RUNTIME_PATH = path.resolve(__dirname, '..', '..', '..',
  'yujin.app', 'nac-spec', 'js', 'nac.js');

let failures = 0;
const errorLog = [];   /* every console.error / console.warn observed */

/* The bindAction handler intentionally rethrows so it preserves
   normal click-handler error semantics. Node's EventTarget
   surfaces that as an uncaughtException via process.nextTick.
   Suppress for the duration of the tests; we assert via the
   captured nac:action:failed event. */
process.on('uncaughtException', function (err) {
  if (err && err.message === 'boom') return;  /* T7 expected */
  console.error('UNEXPECTED uncaughtException:', err);
  failures++;
});

function assert(name, ok, detail) {
  if (ok) {
    console.log('PASS', name);
  } else {
    failures++;
    console.error('FAIL', name, detail || '');
  }
}

/* ---------- Tiny DOM shim ---------- */

class FakeNode extends EventTarget {
  constructor(tag) {
    super();
    this.tagName = (tag || 'DIV').toUpperCase();
    this.children = [];
    this.parentNode = null;
    this._attrs = {};
    this.style = new Proxy({}, {
      get: (t, k) => t[k],
      set: (t, k, v) => { t[k] = v; return true; }
    });
    this.style.setProperty = function (k, v) { this[k] = v; };
    this.style.removeProperty = function (k) { delete this[k]; };
    this.classList = {
      _set: new Set(),
      add(v)      { this._set.add(v); },
      remove(v)   { this._set.delete(v); },
      contains(v) { return this._set.has(v); },
      toggle(v)   { this._set.has(v) ? this._set.delete(v) : this._set.add(v); }
    };
    this.dataset = {};
    this.textContent = '';
    this._innerHTML = '';
  }
  setAttribute(k, v)        { this._attrs[k] = String(v); if (k.startsWith('data-')) this.dataset[k.slice(5).replace(/-([a-z])/g, (_,c)=>c.toUpperCase())] = String(v); }
  getAttribute(k)           { return this._attrs[k] != null ? this._attrs[k] : null; }
  hasAttribute(k)           { return this._attrs[k] != null; }
  removeAttribute(k)        { delete this._attrs[k]; }
  appendChild(c)            { c.parentNode = this; this.children.push(c); return c; }
  removeChild(c)            { this.children = this.children.filter(x => x !== c); c.parentNode = null; return c; }
  contains(c)               { if (c === this) return true; return this.children.some(x => x.contains && x.contains(c)); }
  get childNodes()          { return this.children; }
  get firstChild()          { return this.children[0] || null; }
  get lastChild()           { return this.children[this.children.length - 1] || null; }
  get parentElement()       { return this.parentNode; }
  click()                   { this.dispatchEvent(new CustomEvent('click', { detail: {} })); }
  focus()                   { /* noop */ }
  blur()                    { /* noop */ }
  closest(sel)              { let n = this; while (n) { if (n._matches && n._matches(sel)) return n; n = n.parentNode; } return null; }
  _matches(sel) {
    /* Tiny matcher: [data-foo="bar"], [data-foo], tagName. Enough
       for the runtime's queries. */
    const m = sel.match(/^\[([\w-]+)(?:="([^"]*)")?\]$/);
    if (m) {
      const v = this.getAttribute(m[1]);
      if (m[2] === undefined) return v != null;
      return v === m[2];
    }
    if (sel.toUpperCase() === this.tagName) return true;
    return false;
  }
  matches(sel) { return this._matches(sel); }
  querySelector(sel)        { return this._descend((n) => n._matches && n._matches(sel)) || null; }
  querySelectorAll(sel)     { const out = []; this._descend((n) => { if (n._matches && n._matches(sel)) out.push(n); return false; }); return out; }
  _descend(pred) {
    for (const c of this.children) {
      if (pred(c)) return c;
      if (c._descend) {
        const hit = c._descend(pred);
        if (hit) return hit;
      }
    }
    return null;
  }
  getBoundingClientRect() { return { x: 0, y: 0, width: 100, height: 30, top: 0, left: 0, right: 100, bottom: 30 }; }
  scrollIntoView() { /* noop */ }
  cloneNode() { const n = new FakeNode(this.tagName); n._attrs = { ...this._attrs }; return n; }
  insertBefore(c, ref) { c.parentNode = this; const i = this.children.indexOf(ref); if (i < 0) this.children.push(c); else this.children.splice(i, 0, c); return c; }
  get nodeType() { return 1; }
}

function installShim() {
  const doc = new FakeNode('DOCUMENT');
  doc.body            = new FakeNode('BODY');
  doc.documentElement = new FakeNode('HTML');
  doc.head            = new FakeNode('HEAD');
  doc.documentElement.appendChild(doc.head);
  doc.documentElement.appendChild(doc.body);
  doc.children.push(doc.documentElement);

  doc.createElement = function (tag) { return new FakeNode(tag); };
  doc.createTextNode = function (text) { const n = new FakeNode('TEXT'); n.textContent = text; n.nodeType = 3; return n; };
  doc.createEvent = function () { return { initCustomEvent() {} }; };
  doc.getElementById = function (id) {
    return doc.querySelector('#' + id) || doc._descend((n) => n.getAttribute && n.getAttribute('id') === id) || null;
  };
  doc.querySelector = doc.querySelector.bind(doc);
  doc.querySelectorAll = doc.querySelectorAll.bind(doc);

  globalThis.document = doc;
  globalThis.window = globalThis;
  globalThis.HTMLElement = FakeNode;
  globalThis.Element = FakeNode;
  globalThis.Node = FakeNode;
  globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0);
  globalThis.cancelAnimationFrame  = (id) => clearTimeout(id);
  globalThis.MutationObserver = class { constructor(){} observe(){} disconnect(){} };
  globalThis.matchMedia = () => ({ matches: false, addEventListener(){}, removeEventListener(){} });
  globalThis.localStorage = { getItem(){return null;}, setItem(){}, removeItem(){}, clear(){} };
  globalThis.sessionStorage = globalThis.localStorage;
  globalThis.location = { href: 'http://localhost/test', pathname: '/test', search: '', hash: '', protocol: 'http:', host: 'localhost' };
  /* navigator is a non-writable getter on Node 22+; only set if writable. */
  try { Object.defineProperty(globalThis, 'navigator', { value: { language: 'en-US', userAgent: 'NAC-test' }, configurable: true, writable: true }); } catch (_) {}

  /* Capture console.error / console.warn for assertions. */
  const origError = console.error;
  const origWarn  = console.warn;
  console.error = function () { errorLog.push({ level: 'error', args: Array.from(arguments) }); origError.apply(console, arguments); };
  console.warn  = function () { errorLog.push({ level: 'warn',  args: Array.from(arguments) }); origWarn.apply(console, arguments); };
}

function loadRuntime() {
  const code = fs.readFileSync(RUNTIME_PATH, 'utf8');
  /* Use a Function to evaluate in our shimmed global scope. */
  // eslint-disable-next-line no-new-func
  const fn = new Function(code + '\n//# sourceURL=nac.js');
  fn.call(globalThis);
}

function clearLog() { errorLog.length = 0; }
function logHas(code) { return errorLog.some(e => e.args.some(a => typeof a === 'string' && a.includes(code))); }

/* ---------- Tests ---------- */

installShim();
loadRuntime();
const NAC = globalThis.NAC;

assert('NAC installed',                typeof NAC === 'object');
assert('NAC.version v2.2.x',           /^2\.2\.\d+$/.test(NAC.version));
assert('NAC.bindAction exists',        typeof NAC.bindAction === 'function');
assert('NAC.STRICT_VALIDATION default false', NAC.STRICT_VALIDATION === false);

/* === V22-01 strict validator === */

/* T1: clean manifest -> no error findings. */
clearLog();
NAC.register({
  plugin_slug: 'clean_test',
  nac_version: '2.2',
  elements: [
    { id: 'clean.save', role: 'action',
      label_i18n: { es:'a',en:'b',pt:'c',fr:'d',it:'e',de:'f',ja:'g',zh:'h',hi:'i',ar:'j' } },
    { id: 'tab.x', role: 'tab',
      label_i18n: { es:'a',en:'b',pt:'c',fr:'d',it:'e',de:'f',ja:'g',zh:'h',hi:'i',ar:'j' } }
  ]
});
assert('T1 clean manifest, no findings',
  !logHas('manifest_role_unknown') &&
  !logHas('tab_id_manifest_role_drift') &&
  !logHas('manifest_dom_role_mismatch'));

/* T2: unknown role -> manifest_role_unknown. */
clearLog();
NAC.register({
  plugin_slug: 'unknown_role',
  nac_version: '2.2',
  elements: [{ id: 'x', role: 'banana' }]
});
assert('T2 unknown role detected', logHas('manifest_role_unknown'));

/* T3: tab id with non-tab role -> tab_id_manifest_role_drift. */
clearLog();
NAC.register({
  plugin_slug: 'tab_drift',
  nac_version: '2.2',
  elements: [{ id: 'tab.lines', role: 'navigation' }]
});
assert('T3 tab id role drift detected', logHas('tab_id_manifest_role_drift'));

/* T4: DOM coherence. Mount an element with role A, register with role B. */
clearLog();
const dom_btn = document.createElement('button');
dom_btn.setAttribute('data-nac-id', 'mismatch.btn');
dom_btn.setAttribute('data-nac-role', 'action');
document.body.appendChild(dom_btn);
NAC.register({
  plugin_slug: 'mismatch_test',
  nac_version: '2.2',
  elements: [{ id: 'mismatch.btn', role: 'tab' }]   /* manifest says tab, DOM says action */
});
assert('T4 DOM/manifest role mismatch detected', logHas('manifest_dom_role_mismatch'));

/* T5: STRICT_VALIDATION=true -> register throws. */
clearLog();
NAC.STRICT_VALIDATION = true;
let threw = false;
try {
  NAC.register({
    plugin_slug: 'strict_test',
    nac_version: '2.2',
    elements: [{ id: 'tab.bad', role: 'navigation' }]
  });
} catch (e) {
  threw = e.code === 'strict_validation';
}
NAC.STRICT_VALIDATION = false;
assert('T5 STRICT_VALIDATION makes register throw', threw);

/* === V22-02 bindAction === */

/* T6: bindAction emits nac:action:succeeded after sync click. */
const t6_button = document.createElement('button');
let t6_seen = false;
document.addEventListener('nac:action:succeeded', function onT6(e) {
  if (e.detail && e.detail.action_id === 't6.btn') {
    t6_seen = true;
    document.removeEventListener('nac:action:succeeded', onT6);
  }
});
NAC.bindAction(t6_button, function () { /* sync work */ },
  { plugin: 't6', action_id: 't6.btn' });
t6_button.click();
assert('T6 bindAction emits ack on sync', t6_seen);

/* T7: bindAction emits nac:action:failed when handler throws. */
const t7_button = document.createElement('button');
let t7_failed = null;
document.addEventListener('nac:action:failed', function onT7(e) {
  if (e.detail && e.detail.action_id === 't7.btn') {
    t7_failed = e.detail.error;
    document.removeEventListener('nac:action:failed', onT7);
  }
});
NAC.bindAction(t7_button, function () { throw new Error('boom'); },
  { plugin: 't7', action_id: 't7.btn' });
try { t7_button.click(); } catch (_) { /* expected */ }
assert('T7 bindAction emits failure on throw', t7_failed === 'boom');

/* T8: bindAction emits success after Promise resolves. */
const t8_button = document.createElement('button');
let t8_seen = false;
document.addEventListener('nac:action:succeeded', function onT8(e) {
  if (e.detail && e.detail.action_id === 't8.btn') {
    t8_seen = true;
    document.removeEventListener('nac:action:succeeded', onT8);
  }
});
NAC.bindAction(t8_button, function () {
  return new Promise(function (resolve) { setTimeout(resolve, 10); });
}, { plugin: 't8', action_id: 't8.btn' });
t8_button.click();
await new Promise(r => setTimeout(r, 50));
assert('T8 bindAction emits ack after async resolve', t8_seen);

/* T9: bindAction unbinder works. */
const t9_button = document.createElement('button');
let t9_count = 0;
document.addEventListener('nac:action:succeeded', function (e) {
  if (e.detail && e.detail.action_id === 't9.btn') t9_count++;
});
const unbind = NAC.bindAction(t9_button, function () {},
  { plugin: 't9', action_id: 't9.btn' });
t9_button.click();
unbind();
t9_button.click();
assert('T9 bindAction unbinder stops emission', t9_count === 1);

/* T10: bindAction validates required ctx. */
let t10_threw = false;
try {
  NAC.bindAction(document.createElement('button'), function () {}, {});
} catch (e) {
  t10_threw = e.code === 'invalid';
}
assert('T10 bindAction rejects missing ctx', t10_threw);

console.log('');
if (failures === 0) {
  console.log('V22 PASS (10/10)');
  process.exit(0);
} else {
  console.error('V22 FAIL (' + failures + ' failure' + (failures === 1 ? '' : 's') + ')');
  process.exit(1);
}
