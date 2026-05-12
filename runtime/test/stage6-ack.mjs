/**
 * Stage 6 (Ack event) -- listener exhaustive coverage.
 *
 * Verifies every event family declared in _CLICK_EVENT_FAMILY
 * fires with the canonical detail shape when the corresponding
 * NAC.* function is called against a real handler.
 *
 * Plus: the v2.2 bindAction helper emits the contract event
 * automatically (covered in v22 suite); the v2.3 interop
 * relays peer events with via_interop=true (covered in
 * v23-interop). This stage focuses on the LOCAL emission path.
 */

import fs from 'node:fs';
import path from 'node:path';
import url  from 'node:url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const NAC_PATH  = path.resolve(__dirname, '..', '..', '..', 'yujin.app', 'nac-spec', 'js', 'nac.js');
const EXT_PATH  = path.resolve(__dirname, '..', '..', '..', 'yujin.app', 'nac-spec', 'js', 'nac-v2-extensions.js');

let failures = 0;
function assert(name, ok, detail) {
  if (ok) console.log('PASS', name);
  else { failures++; console.error('FAIL', name, detail || ''); }
}

/* ---------- DOM shim ---------- */

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
      if (c._descend) { const h = c._descend(p); if (h) return h; }
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
  getBoundingClientRect() { return { x:0, y:0, width:100, height:30 }; }
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
  FakeNode.prototype.setSelectionRange = function () {};
}

function loadRuntime() {
  const nac = fs.readFileSync(NAC_PATH, 'utf8');
  // eslint-disable-next-line no-new-func
  (new Function(nac)).call(globalThis);
  if (fs.existsSync(EXT_PATH)) {
    try {
      const ext = fs.readFileSync(EXT_PATH, 'utf8');
      // eslint-disable-next-line no-new-func
      (new Function(ext)).call(globalThis);
    } catch (_) {}
  }
}

process.on('uncaughtException', () => {});
installShim();
loadRuntime();
const NAC = globalThis.NAC;

/* ---------- Plugin + handlers that emit the canonical ack ---------- */

NAC.register({
  plugin_slug: 'ack_test',
  nac_version: '2.2',
  elements: [
    { id: 'ack_test.save',    role: 'action',  actions: [{ verb: 'save' }] },
    { id: 'ack_test.field',   role: 'field' },
    { id: 'tab.alpha',        role: 'tab' },
    { id: 'tab.beta',         role: 'tab' },
    { id: 'ack_test.section', role: 'section' }
  ]
});

const root = document.createElement('article');
root.setAttribute('data-nac-plugin', 'ack_test');
document.body.appendChild(root);

const saveBtn = document.createElement('button');
saveBtn.setAttribute('data-nac-id', 'ack_test.save');
saveBtn.setAttribute('data-nac-role', 'action');
saveBtn.setAttribute('data-nac-action', 'save');
saveBtn.addEventListener('click', () => {
  /* Host emits the canonical ack synchronously. */
  document.dispatchEvent(new CustomEvent('nac:action:succeeded', {
    detail: { plugin: 'ack_test', action_id: 'ack_test.save', is_trusted: false }
  }));
});
root.appendChild(saveBtn);

const fieldInp = document.createElement('input');
fieldInp.setAttribute('data-nac-id', 'ack_test.field');
fieldInp.setAttribute('data-nac-role', 'field');
fieldInp.addEventListener('input', () => {
  document.dispatchEvent(new CustomEvent('nac:field:changed', {
    detail: { plugin: 'ack_test', field_id: 'ack_test.field', value: fieldInp.value }
  }));
});
root.appendChild(fieldInp);

const tabAlpha = document.createElement('button');
tabAlpha.setAttribute('data-nac-id', 'tab.alpha');
tabAlpha.setAttribute('data-nac-role', 'tab');
tabAlpha.addEventListener('click', () => {
  document.dispatchEvent(new CustomEvent('nac:tab:activated', {
    detail: { plugin: 'ack_test', tab_id: 'tab.alpha' }
  }));
});
root.appendChild(tabAlpha);

const tabBeta = document.createElement('button');
tabBeta.setAttribute('data-nac-id', 'tab.beta');
tabBeta.setAttribute('data-nac-role', 'tab');
tabBeta.addEventListener('click', () => {
  document.dispatchEvent(new CustomEvent('nac:tab:activated', {
    detail: { plugin: 'ack_test', tab_id: 'tab.beta' }
  }));
});
root.appendChild(tabBeta);

const section = document.createElement('section');
section.setAttribute('data-nac-id', 'ack_test.section');
section.setAttribute('data-nac-role', 'section');
root.appendChild(section);

/* ---------- Test 1: nac:action:succeeded fires with canonical shape ---------- */

let actionAck = null;
document.addEventListener('nac:action:succeeded', function on(e) {
  if (e.detail && e.detail.action_id === 'ack_test.save') {
    actionAck = e.detail;
    document.removeEventListener('nac:action:succeeded', on);
  }
});
await NAC.click('ack_test.save');
assert('T1 nac:action:succeeded fires after click',  actionAck !== null);
assert('T1 detail.plugin set',                       actionAck && actionAck.plugin === 'ack_test');
assert('T1 detail.action_id set',                    actionAck && actionAck.action_id === 'ack_test.save');
assert('T1 detail.is_trusted boolean',               actionAck && typeof actionAck.is_trusted === 'boolean');

/* ---------- Test 2: nac:field:changed via NAC.fill ---------- */

let fieldAck = null;
document.addEventListener('nac:field:changed', function on(e) {
  if (e.detail && e.detail.field_id === 'ack_test.field') {
    fieldAck = e.detail;
    document.removeEventListener('nac:field:changed', on);
  }
});
await NAC.fill('ack_test.field', 'hello world');
assert('T2 nac:field:changed fires after fill',      fieldAck !== null);
assert('T2 field_id correct',                        fieldAck && fieldAck.field_id === 'ack_test.field');
assert('T2 value forwarded',                         fieldAck && fieldAck.value === 'hello world');

/* ---------- Test 3: nac:tab:activated via NAC.tab ---------- */

let tabAck = null;
document.addEventListener('nac:tab:activated', function on(e) {
  if (e.detail && e.detail.tab_id === 'tab.alpha') {
    tabAck = e.detail;
    document.removeEventListener('nac:tab:activated', on);
  }
});
await NAC.tab('ack_test', 'tab.alpha');
assert('T3 nac:tab:activated fires after tab',       tabAck !== null);
assert('T3 tab_id correct',                          tabAck && tabAck.tab_id === 'tab.alpha');

/* ---------- Test 4: nac:action:failed when handler throws ---------- */

const failBtn = document.createElement('button');
failBtn.setAttribute('data-nac-id', 'ack_test.failing');
failBtn.setAttribute('data-nac-role', 'action');
root.appendChild(failBtn);

let failAck = null;
document.addEventListener('nac:action:failed', function on(e) {
  if (e.detail && e.detail.action_id === 'ack_test.failing') {
    failAck = e.detail;
    document.removeEventListener('nac:action:failed', on);
  }
});

/* Use bindAction so the contract failure event fires automatically. */
NAC.bindAction(failBtn, () => { throw new Error('intentional'); },
  { plugin: 'ack_test', action_id: 'ack_test.failing' });
try { failBtn.click(); } catch (_) {}
await new Promise(r => setTimeout(r, 10));
assert('T4 nac:action:failed fires after throw',     failAck !== null);
assert('T4 error message forwarded',                 failAck && failAck.error === 'intentional');

/* ---------- Test 5: bindAction promise-resolution path ---------- */

const asyncBtn = document.createElement('button');
asyncBtn.setAttribute('data-nac-id', 'ack_test.async');
asyncBtn.setAttribute('data-nac-role', 'action');
root.appendChild(asyncBtn);

let asyncAck = null;
document.addEventListener('nac:action:succeeded', function on(e) {
  if (e.detail && e.detail.action_id === 'ack_test.async') {
    asyncAck = e.detail;
    document.removeEventListener('nac:action:succeeded', on);
  }
});
NAC.bindAction(asyncBtn, () => new Promise(r => setTimeout(r, 30)),
  { plugin: 'ack_test', action_id: 'ack_test.async' });
asyncBtn.click();
await new Promise(r => setTimeout(r, 60));
assert('T5 bindAction async-resolve emits ack',      asyncAck !== null);

/* ---------- Test 6: ack event timing -- runtime polls + resolves ---------- */

/* When NAC.click awaits, the runtime's internal listener should
   resolve as soon as the canonical ack fires (within milliseconds,
   not the 5s timeout). Time the click-to-resolve and assert < 200ms. */
const timeBtn = document.createElement('button');
timeBtn.setAttribute('data-nac-id', 'ack_test.timed');
timeBtn.setAttribute('data-nac-role', 'action');
timeBtn.addEventListener('click', () => {
  document.dispatchEvent(new CustomEvent('nac:action:succeeded', {
    detail: { plugin: 'ack_test', action_id: 'ack_test.timed' }
  }));
});
root.appendChild(timeBtn);

const t0 = Date.now();
await NAC.click('ack_test.timed');
const dur = Date.now() - t0;
assert('T6 NAC.click resolves within 200ms of ack',  dur < 200,
  'took ' + dur + 'ms');

/* ---------- Test 7: detail shape is identical across event families ---------- */

/* The canonical id field changes per event family but every event
   carries plugin + the id key. Verify schema-style. */
function detailIsCanonical(detail, idKey) {
  return detail
      && typeof detail.plugin === 'string'
      && typeof detail[idKey] === 'string';
}
assert('T7 action detail canonical', detailIsCanonical(actionAck, 'action_id'));
assert('T7 field detail canonical',  detailIsCanonical(fieldAck,  'field_id'));
assert('T7 tab detail canonical',    detailIsCanonical(tabAck,    'tab_id'));

console.log('');
if (failures === 0) console.log('STAGE-6 PASS');
else                console.error('STAGE-6 FAIL (' + failures + ')');
process.exit(failures === 0 ? 0 : 1);
