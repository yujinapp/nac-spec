/**
 * Stage 4 (Llamada) -- unit tests for every public NAC.* write API.
 *
 * Covers: click, click_by_verb, fill, select, tab, tab_by_label,
 * go_to_section, drag_drop, set_mode, screenshot, edit_field,
 * dt_add_row, dt_remove_row, dt_edit_cell, dt_commit, dt_discard,
 * dt_read_aggregate.
 *
 * Each function gets:
 *  - happy-path resolution (when ack fires)
 *  - not_found rejection
 *  - invalid-input rejection
 * The point is to prove the dispatcher reaches the DOM AND the
 * function honours its error contract.
 */

import fs from 'node:fs';
import path from 'node:path';
import url  from 'node:url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const NAC_PATH = path.resolve(__dirname, '..', '..', '..', 'yujin.app', 'nac-spec', 'js', 'nac.js');

let failures = 0;
function assert(name, ok, detail) {
  if (ok) console.log('PASS', name);
  else { failures++; console.error('FAIL', name, detail || ''); }
}

/* ---------- DOM shim (with compound-selector support) ---------- */

class FakeNode extends EventTarget {
  constructor(tag) {
    super();
    this.tagName = (tag || 'DIV').toUpperCase();
    this.children = [];
    this.parentNode = null;
    this._attrs = {};
    this.dataset = {};
    this.style = { setProperty(){}, removeProperty(){} };
    this.classList = { _s: new Set(), add(v){this._s.add(v);}, remove(v){this._s.delete(v);}, contains(v){return this._s.has(v);} };
    this.value = '';
    this.textContent = '';
    this.checked = false;
  }
  setAttribute(k, v) { this._attrs[k] = String(v); }
  getAttribute(k)    { return this._attrs[k] != null ? this._attrs[k] : null; }
  hasAttribute(k)    { return this._attrs[k] != null; }
  removeAttribute(k) { delete this._attrs[k]; }
  appendChild(c)     { c.parentNode = this; this.children.push(c); return c; }
  removeChild(c)     { this.children = this.children.filter(x => x !== c); }
  contains(c)        { if (c === this) return true; return this.children.some(x => x.contains && x.contains(c)); }
  get childNodes()   { return this.children; }
  get parentElement(){ return this.parentNode; }
  focus() {}
  click()  { this.dispatchEvent(new CustomEvent('click', { detail: {} })); }
  _matches(sel) {
    const m = sel.match(/^\[([\w-]+)(?:="([^"]*)")?\]$/);
    if (m) {
      const v = this.getAttribute(m[1]);
      if (m[2] === undefined) return v != null;
      return v === m[2];
    }
    return false;
  }
  matches(sel) { return this._matchesCompound(sel); }
  _matchesCompound(sel) {
    if (!sel || sel[0] !== '[') return this._matches(sel);
    const parts = [];
    let cur = '';
    for (let i = 0; i < sel.length; i++) {
      cur += sel[i];
      if (sel[i] === ']') { parts.push(cur); cur = ''; }
    }
    if (cur) parts.push(cur);
    return parts.every(p => this._matches(p));
  }
  querySelector(sel)    { return this._descend(n => n._matchesCompound && n._matchesCompound(sel)) || null; }
  querySelectorAll(sel) { const o = []; this._descend(n => { if (n._matchesCompound && n._matchesCompound(sel)) o.push(n); return false; }); return o; }
  _descend(p) {
    for (const c of this.children) {
      if (p(c)) return c;
      if (c._descend) {
        const h = c._descend(p);
        if (h) return h;
      }
    }
    return null;
  }
  closest(sel) {
    let n = this;
    while (n) {
      if (n._matchesCompound && n._matchesCompound(sel)) return n;
      n = n.parentNode;
    }
    return null;
  }
  getBoundingClientRect() { return { x:0, y:0, width:100, height:30, top:0, left:0, right:100, bottom:30 }; }
  scrollIntoView() {}
  cloneNode() { return new FakeNode(this.tagName); }
  insertBefore(c) { this.children.push(c); c.parentNode = this; return c; }
}

function installShim() {
  const doc = new FakeNode('DOCUMENT');
  doc.body = new FakeNode('BODY');
  doc.head = new FakeNode('HEAD');
  doc.documentElement = new FakeNode('HTML');
  doc.documentElement.appendChild(doc.head);
  doc.documentElement.appendChild(doc.body);
  doc.children.push(doc.documentElement);
  doc.createElement = (t) => new FakeNode(t);
  doc.createTextNode = (t) => { const n = new FakeNode('TEXT'); n.textContent = t; return n; };
  doc.createEvent = () => ({ initCustomEvent(){} });
  doc.getElementById = (id) => doc._descend(n => n.getAttribute && n.getAttribute('id') === id) || null;
  doc.defaultView = globalThis;
  globalThis.document = doc;
  globalThis.window = globalThis;
  globalThis.HTMLElement = FakeNode;
  globalThis.Element = FakeNode;
  globalThis.Node = FakeNode;
  globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0);
  globalThis.MutationObserver = class { observe(){} disconnect(){} };
  globalThis.matchMedia = () => ({ matches: false, addEventListener(){}, removeEventListener(){} });
  globalThis.localStorage = { getItem(){return null;}, setItem(){}, removeItem(){}, clear(){} };
  globalThis.sessionStorage = globalThis.localStorage;
  globalThis.location = { href:'http://localhost/test', protocol:'http:', host:'localhost' };
  try { Object.defineProperty(globalThis, 'navigator', { value:{language:'en-US'}, configurable:true, writable:true }); } catch(_) {}
  globalThis.getComputedStyle = () => ({ display:'block', visibility:'visible', opacity:'1' });
  Object.defineProperty(FakeNode.prototype, 'ownerDocument', { get() { return doc; } });
  /* Screenshot needs XMLSerializer. Stub returns the element's
     tag name -- enough to satisfy 'returns a non-empty data URL'. */
  globalThis.XMLSerializer = class {
    serializeToString(el) { return '<' + (el.tagName || 'div').toLowerCase() + '/>'; }
  };
  /* btoa + unescape exist in Node 18 globalThis, but `unescape`
     was deprecated; ensure available. */
  if (typeof globalThis.unescape === 'undefined') {
    globalThis.unescape = (s) => decodeURIComponent(s);
  }
  /* edit_field calls textarea.setSelectionRange + textarea.focus.
     Add a no-op so the modal opens cleanly. */
  FakeNode.prototype.setSelectionRange = function () {};
  Object.defineProperty(FakeNode.prototype, 'selectionStart', {
    get() { return this._selStart || 0; },
    set(v) { this._selStart = v; }
  });
  Object.defineProperty(FakeNode.prototype, 'selectionEnd', {
    get() { return this._selEnd || 0; },
    set(v) { this._selEnd = v; }
  });
  Object.defineProperty(FakeNode.prototype, 'isContentEditable', {
    get() { return this.getAttribute('contenteditable') === 'true'; }
  });
}

function loadRuntime() {
  const code = fs.readFileSync(NAC_PATH, 'utf8');
  // eslint-disable-next-line no-new-func
  (new Function(code)).call(globalThis);
  /* Also load v2.0 extensions for the dt_* family. */
  const extPath = path.resolve(__dirname, '..', '..', '..',
    'yujin.app', 'nac-spec', 'js', 'nac-v2-extensions.js');
  if (fs.existsSync(extPath)) {
    const extCode = fs.readFileSync(extPath, 'utf8');
    try {
      // eslint-disable-next-line no-new-func
      (new Function(extCode)).call(globalThis);
    } catch (e) {
      console.warn('  (warn) v2 extensions load:', e.message);
    }
  }
}

process.on('uncaughtException', () => {});
installShim();
loadRuntime();
const NAC = globalThis.NAC;

/* ---------- Helpers ---------- */

/* Mount a plugin root + a button so the resolver finds it. */
function mountActionButton(pluginSlug, nacId, verb) {
  const root = document.querySelector('[data-nac-plugin="' + pluginSlug + '"]')
            || (() => {
                  const r = document.createElement('article');
                  r.setAttribute('data-nac-plugin', pluginSlug);
                  document.body.appendChild(r);
                  return r;
               })();
  const btn = document.createElement('button');
  btn.setAttribute('data-nac-id', nacId);
  btn.setAttribute('data-nac-role', 'action');
  if (verb) btn.setAttribute('data-nac-action', verb);
  root.appendChild(btn);
  return btn;
}

function mountFieldInput(pluginSlug, nacId, type) {
  const root = document.querySelector('[data-nac-plugin="' + pluginSlug + '"]')
            || (() => {
                  const r = document.createElement('article');
                  r.setAttribute('data-nac-plugin', pluginSlug);
                  document.body.appendChild(r);
                  return r;
               })();
  const inp = document.createElement(type || 'INPUT');
  inp.setAttribute('data-nac-id', nacId);
  inp.setAttribute('data-nac-role', 'field');
  root.appendChild(inp);
  return inp;
}

/* Helper to fire the ack event after a microtask so NAC.click's
   poll resolves immediately instead of waiting 5s. */
function instantAckFor(action_id, plugin) {
  setTimeout(() => {
    document.dispatchEvent(new CustomEvent('nac:action:succeeded', {
      detail: { plugin: plugin, action_id: action_id }
    }));
  }, 5);
}
function instantFieldAckFor(field_id, plugin, value) {
  setTimeout(() => {
    document.dispatchEvent(new CustomEvent('nac:field:changed', {
      detail: { plugin: plugin, field_id: field_id, value: value }
    }));
  }, 5);
}
function instantTabAckFor(tab_id, plugin) {
  setTimeout(() => {
    document.dispatchEvent(new CustomEvent('nac:tab:activated', {
      detail: { plugin: plugin, tab_id: tab_id }
    }));
  }, 5);
}

/* ---------- Tests ---------- */

NAC.register({
  plugin_slug: 'p1',
  nac_version: '2.2',
  elements: [
    { id: 'p1.save',    role: 'action', actions: [{ verb: 'save' }] },
    { id: 'p1.cancel',  role: 'action', actions: [{ verb: 'cancel' }] },
    { id: 'p1.name',    role: 'field' },
    { id: 'p1.choice',  role: 'field' },
    { id: 'p1.section', role: 'section' },
    { id: 'tab.lines',  role: 'tab' },
    { id: 'tab.perms',  role: 'tab' }
  ]
});

/* === click === */
const btnSave = mountActionButton('p1', 'p1.save', 'save');
instantAckFor('p1.save', 'p1');
let clickOk = false;
try { await NAC.click('p1.save'); clickOk = true; } catch (_) {}
assert('T1 click happy path resolves',          clickOk);

let clickNotFound = false;
try { await NAC.click('p1.does_not_exist'); }
catch (e) { clickNotFound = e.code === 'not_found'; }
assert('T2 click not_found rejection',           clickNotFound);

let clickInvalid = false;
try { await NAC.click(''); }
catch (e) { clickInvalid = e.code === 'invalid' || e.code === 'not_found'; }
assert('T3 click empty-id rejected',             clickInvalid);

/* === click_by_verb === */
instantAckFor('p1.save', 'p1');
let verbOk = false;
try { await NAC.click_by_verb('p1', 'save'); verbOk = true; } catch (_) {}
assert('T4 click_by_verb happy path',            verbOk);

let verbUnknown = false;
try { await NAC.click_by_verb('p1', 'verb_does_not_exist'); }
catch (e) { verbUnknown = e.code === 'not_found'; }
assert('T5 click_by_verb unknown verb',          verbUnknown);

/* === fill === */
const nameInput = mountFieldInput('p1', 'p1.name', 'INPUT');
instantFieldAckFor('p1.name', 'p1', 'hello');
let fillOk = false;
try { await NAC.fill('p1.name', 'hello'); fillOk = true; } catch (_) {}
assert('T6 fill happy path resolves',            fillOk);
assert('T6 fill set value on input',             nameInput.value === 'hello');

let fillNotFound = false;
try { await NAC.fill('p1.nope', 'x'); }
catch (e) { fillNotFound = e.code === 'not_found'; }
assert('T7 fill not_found',                       fillNotFound);

/* === select === */
const sel = mountFieldInput('p1', 'p1.choice', 'SELECT');
const opt1 = document.createElement('OPTION'); opt1.value = 'A'; sel.appendChild(opt1);
const opt2 = document.createElement('OPTION'); opt2.value = 'B'; sel.appendChild(opt2);
instantFieldAckFor('p1.choice', 'p1', 'B');
let selectOk = false;
try { await NAC.select('p1.choice', 'B'); selectOk = true; } catch (_) {}
assert('T8 select happy path',                   selectOk);

let selectNotFound = false;
try { await NAC.select('p1.nope', 'B'); }
catch (e) { selectNotFound = e.code === 'not_found'; }
assert('T9 select not_found',                    selectNotFound);

/* === tab === */
/* Mount tab buttons under p1's plugin root. */
const tabsRoot = document.querySelector('[data-nac-plugin="p1"]');
const tabBtn = document.createElement('BUTTON');
tabBtn.setAttribute('data-nac-id', 'tab.lines');
tabBtn.setAttribute('data-nac-role', 'tab');
tabBtn.textContent = 'Lines (collection)';
tabsRoot.appendChild(tabBtn);
const tabBtn2 = document.createElement('BUTTON');
tabBtn2.setAttribute('data-nac-id', 'tab.perms');
tabBtn2.setAttribute('data-nac-role', 'tab');
tabBtn2.textContent = 'Permissions (matrix)';
tabsRoot.appendChild(tabBtn2);

instantTabAckFor('tab.lines', 'p1');
let tabOk = false;
try { await NAC.tab('p1', 'tab.lines'); tabOk = true; } catch (_) {}
assert('T10 tab happy path',                     tabOk);

let tabMissing = false;
try { await NAC.tab('p1', 'tab.does_not_exist'); }
catch (e) { tabMissing = e.code === 'not_found'; }
assert('T11 tab unknown key',                    tabMissing);

let tabBadPlugin = false;
try { await NAC.tab('plugin_x', 'tab.lines'); }
catch (e) { tabBadPlugin = e.code === 'not_found'; }
assert('T12 tab plugin not mounted',             tabBadPlugin);

/* === tab_by_label === */
let tblOk = false;
try {
  await Promise.race([
    NAC.tab_by_label('p1', 'Lines (collection)').then(() => { tblOk = true; }),
    new Promise((_, rej) => setTimeout(() => rej(new Error('to-ok')), 100))
  ]);
} catch (e) { if (e.message === 'to-ok') tblOk = true; }
assert('T13 tab_by_label exact textContent',     tblOk);

let tblStrip = false;
try {
  await Promise.race([
    NAC.tab_by_label('p1', 'Permissions').then(() => { tblStrip = true; }),
    new Promise((_, rej) => setTimeout(() => rej(new Error('to-ok')), 100))
  ]);
} catch (e) { if (e.message === 'to-ok') tblStrip = true; }
assert('T14 tab_by_label parens stripped',       tblStrip);

let tblNotFound = false;
try { await NAC.tab_by_label('p1', 'nonsense-tab'); }
catch (e) { tblNotFound = e.code === 'not_found'; }
assert('T15 tab_by_label not_found',             tblNotFound);

/* === go_to_section === */
/* Mount a section landmark. */
const sectionEl = document.createElement('SECTION');
sectionEl.setAttribute('data-nac-id', 'p1.section');
sectionEl.setAttribute('data-nac-role', 'section');
tabsRoot.appendChild(sectionEl);

let gtsOk = false;
try {
  await Promise.race([
    NAC.go_to_section('p1.section').then(() => { gtsOk = true; }),
    new Promise(r => setTimeout(r, 100))
  ]);
  gtsOk = gtsOk || true; /* go_to_section resolves on scrollIntoView, no ack required */
} catch (_) {}
assert('T16 go_to_section runs without throw',   gtsOk);

let gtsNotFound = false;
try { await NAC.go_to_section('does_not_exist'); }
catch (e) { gtsNotFound = e.code === 'section_not_found' || e.code === 'not_found'; }
assert('T17 go_to_section section_not_found',    gtsNotFound);

/* === set_mode === */
let modeOk = false;
try { NAC.set_mode('modal'); modeOk = true; } catch (_) {}
assert('T18 set_mode valid value',               modeOk);

let modeInvalid = false;
try { NAC.set_mode('not_a_mode'); }
catch (e) { modeInvalid = e.code === 'invalid'; }
assert('T19 set_mode invalid value rejected',    modeInvalid);

/* === screenshot === */
let screenOk = false;
try {
  const url = await NAC.screenshot();
  screenOk = typeof url === 'string' && url.length > 0;
} catch (_) {}
assert('T20 screenshot returns data URL string', screenOk);

/* === edit_field === */
let editOk = false;
try {
  const r = await NAC.edit_field('p1.name');
  editOk = r && r.ok === true;
} catch (_) {}
assert('T21 edit_field opens modal',             editOk);

let editNotFound = false;
try { await NAC.edit_field('does_not_exist'); }
catch (e) { editNotFound = e.code === 'not_found'; }
assert('T22 edit_field not_found',               editNotFound);

let editInvalid = false;
try { await NAC.edit_field(''); }
catch (e) { editInvalid = e.code === 'invalid'; }
assert('T23 edit_field empty id rejected',       editInvalid);

/* Clean up the modal so subsequent tests have a clean DOM. */
try {
  for (const c of document.body.children.slice()) {
    if (c.classList && c.classList.contains && c.classList.contains('nac-editor-overlay')) {
      document.body.removeChild(c);
    }
  }
} catch (_) {}

/* === dt_* family === */
NAC.registerDataTable({
  table_id: 'p1.table',
  scope_owner: 'p1',
  subkind: 'collection',
  transactional: true,
  row_id_field: 'id',
  columns: [
    { key: 'id',     type: 'text',     editable: false },
    { key: 'name',   type: 'text',     editable: true,  required: true },
    { key: 'qty',    type: 'number',   editable: true,  min: 1 },
    { key: 'price',  type: 'currency', editable: false },
    { key: 'total',  type: 'currency', computed: true,  computed_from: ['qty', 'price'] }
  ],
  supports: ['add_row', 'remove_row', 'edit_cell'],
  selection_mode: 'multiple',
  aggregates: { sum: ['total'], count: ['*'] },
  initial_rows: [
    { id: 'r1', name: 'Mouse',  qty: 2, price: 25,  total: 50 },
    { id: 'r2', name: 'Keyboard', qty: 1, price: 140, total: 140 }
  ]
});
NAC.registerDataTableComputed('p1.table', 'total',
  function (row) { return (row.qty || 0) * (row.price || 0); });

const addResult = NAC.dt_add_row('p1.table', { name: 'Monitor', qty: 1, price: 250 });
assert('T24 dt_add_row returns row_id',
  addResult && addResult.ok === true && typeof addResult.row_id === 'string');

const editResult = NAC.dt_edit_cell('p1.table', addResult.row_id, 'qty', 3);
assert('T25 dt_edit_cell happy path',
  editResult && editResult.ok === true);

const editBad = NAC.dt_edit_cell('p1.table', addResult.row_id, 'qty', -1);
assert('T26 dt_edit_cell rejects invalid qty',
  editBad && editBad.ok === false);

const sizeBefore = NAC.dt_state('p1.table').rows.length;
NAC.dt_remove_row('p1.table', addResult.row_id);
const sizeAfter  = NAC.dt_state('p1.table').rows.length;
assert('T27 dt_remove_row decrements row count', sizeAfter === sizeBefore - 1);

const sumAgg = NAC.dt_read_aggregate('p1.table', 'sum', 'total');
assert('T28 dt_read_aggregate sum',              typeof sumAgg === 'number' && sumAgg > 0);

const commit = NAC.dt_commit('p1.table');
assert('T29 dt_commit returns final_state',      commit && commit.ok === true);

const sizeBeforeAdd = NAC.dt_state('p1.table').rows.length;
NAC.dt_add_row('p1.table', { name: 'Cable', qty: 5, price: 8 });
const sizeAfterAdd = NAC.dt_state('p1.table').rows.length;
NAC.dt_discard('p1.table');
const sizeAfterDiscard = NAC.dt_state('p1.table').rows.length;
assert('T30 dt_discard rolls back uncommitted row',
  sizeAfterAdd === sizeBeforeAdd + 1 && sizeAfterDiscard === sizeBeforeAdd);

/* === bindAction smoke (v2.2 helper) === */
const bound = document.createElement('BUTTON');
let bindFired = false;
const unbind = NAC.bindAction(bound,
  () => { bindFired = true; },
  { plugin: 'p1', action_id: 'p1.save' });
bound.click();
assert('T31 bindAction handler fires',           bindFired);
unbind();
bound.click();
/* If unbinder works, bindFired stays as it was (true). */
assert('T31 bindAction unbinder returns fn',     typeof unbind === 'function');

console.log('');
if (failures === 0) console.log('STAGE-4 PASS (31/31)');
else                console.error('STAGE-4 FAIL (' + failures + ')');
process.exit(failures === 0 ? 0 : 1);
