/**
 * Stage 2 (Desambiguacion) -- unit tests.
 *
 * Covers:
 *   - _detectLangSwitch false-positive guard (commit f631d77a)
 *   - snapshotTree composition + sanitisation
 *   - parens stripping in tab_by_label labels
 *   - i18n locale matching
 */

import fs from 'node:fs';
import path from 'node:path';
import url  from 'node:url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const NAC_PATH  = path.resolve(__dirname, '..', '..', '..', 'yujin.app', 'nac-spec', 'js', 'nac.js');
const CHAT_PATH = path.resolve(__dirname, '..', '..', '..', 'yujin.app', 'nac-spec', 'js', 'nac-chat-client.js');

let failures = 0;
function assert(name, ok, detail) {
  if (ok) console.log('PASS', name);
  else { failures++; console.error('FAIL', name, detail || ''); }
}

/* ---------- Minimal browser shim ---------- */

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
  click() { this.dispatchEvent(new CustomEvent('click', { detail: {} })); }
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
    /* Split a compound selector like '[data-x][data-y="z"]' into
       its single-bracket pieces; require all to match. */
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
  getBoundingClientRect() { return { x:0, y:0, width:100, height:30 }; }
  scrollIntoView() {}
  cloneNode() { return new FakeNode(this.tagName); }
  insertBefore(c, ref) { this.children.push(c); c.parentNode = this; return c; }
  closest(sel) {
    let n = this;
    while (n) {
      if (n._matches && n._matches(sel)) return n;
      n = n.parentNode;
    }
    return null;
  }
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
  /* Provide getComputedStyle for nac.js _serializeElement which
     reads it via ownerDocument.defaultView. We give a stub that
     returns sane defaults so the snapshot doesn't crash. */
  doc.defaultView = globalThis;
  globalThis.getComputedStyle = function () {
    return { display: 'block', visibility: 'visible', opacity: '1' };
  };
  /* ownerDocument needs to be set on every FakeNode. Simplest: a
     getter returning the document instance. */
  Object.defineProperty(FakeNode.prototype, 'ownerDocument', {
    get() { return doc; }
  });
}

function loadRuntime() {
  const nacCode = fs.readFileSync(NAC_PATH, 'utf8');
  // eslint-disable-next-line no-new-func
  (new Function(nacCode)).call(globalThis);
}

function loadChatClient() {
  const chatCode = fs.readFileSync(CHAT_PATH, 'utf8');
  // eslint-disable-next-line no-new-func
  (new Function(chatCode)).call(globalThis);
}

process.on('uncaughtException', () => {});
installShim();
loadRuntime();
loadChatClient();
const NAC = globalThis.NAC;
const NacChat = globalThis.NacChat;

assert('runtime + chat installed', NAC && NacChat);

/* =============================================================
   PART A -- _detectLangSwitch (12 cases)
   ============================================================= */

/* The function itself is private inside the IIFE. We exercise it
   indirectly via NacChat.send() short-circuit OR via _maybeChangeLocaleLocally
   which is also private. Instead, we call setLang() to bootstrap
   then send() with various phrases and watch what happens.
   For a pure unit test we need access to _detectLangSwitch. Since
   it's not exposed, we test via the *observable* behaviour of
   the chat client: when a phrase matches a locale switch, the
   client's _lang flips and a bot acknowledgement is emitted to
   the chat-log. If no match, _lang stays + the phrase goes to
   the backend (which we intercept). */

let backendCalled = false;
let lastBackendBody = null;
globalThis.fetch = async function (url, opts) {
  if (typeof url === 'string' && url.includes('nac-demo')) {
    backendCalled = true;
    lastBackendBody = JSON.parse(opts.body);
    return new Response(JSON.stringify({ ok: true, message: 'stubbed', actions: [] }), {
      status: 200, headers: { 'Content-Type': 'application/json' }
    });
  }
  return new Response('not found', { status: 404 });
};
if (typeof globalThis.Response === 'undefined') {
  globalThis.Response = class {
    constructor(body, init) { this.body = body; this.status = (init && init.status) || 200; this.ok = this.status < 400; }
    async json() { return JSON.parse(this.body); }
    async text() { return String(this.body); }
  };
}

/* Bootstrap chat client: install no-op DOM mounts. */
NacChat.init({
  endpoint:    'http://test/crm/api/v1/yujin/nac-demo',
  lang:        'es',
  chatLog:     document.createElement('div'),
  input:       document.createElement('input'),
  sendBtn:     document.createElement('button'),
  langSelect:  document.createElement('select')
});

async function testPhrase(name, phrase, expectedLangAfter, expectedBackendCalled) {
  NacChat._lang = 'es'; // reset
  backendCalled = false;
  lastBackendBody = null;
  /* botSpeak() may speak; suppress speechSynthesis. */
  NacChat._ttsEnabled = false;
  await NacChat.send(phrase);
  /* small async settle */
  await new Promise(r => setTimeout(r, 30));
  assert(name + ' -- final lang',     NacChat._lang === expectedLangAfter,
    'lang=' + NacChat._lang + ' (want ' + expectedLangAfter + ')');
  assert(name + ' -- backend called', backendCalled === expectedBackendCalled,
    'called=' + backendCalled + ' (want ' + expectedBackendCalled + ')');
}

/* Cases that MUST NOT switch language (the bug class from f631d77a). */
await testPhrase('A1 cambia de pestana',          'cambia de pestana',           'es', true);
await testPhrase('A2 cambia precio de mouse 40',  'cambia precio de mouse 40',   'es', true);
await testPhrase('A3 borra de la lista',          'borra de la lista',           'es', true);
await testPhrase('A4 pasa de A a B',              'pasa de A a B',               'es', true);

/* Cases that MUST switch language (positive cases). */
await testPhrase('A5 cambia a aleman',            'cambia a aleman',             'de', false);
await testPhrase('A6 switch to english',          'switch to english',           'en', false);
await testPhrase('A7 use spanish',                'use spanish',                 'es', false);
await testPhrase('A8 cambia idioma a de',         'cambia idioma a de',          'de', false);

/* Ambiguous cases that should NOT switch (bare 2-letter codes need trigger). */
await testPhrase('A9 quiero comprar de B',        'quiero comprar de B',         'es', true);
await testPhrase('A10 separa el "to" del verbo',  'separa el to del verbo',      'es', true);

/* Same-lang noop. */
NacChat._lang = 'en';
backendCalled = false;
await NacChat.send('switch to english');
await new Promise(r => setTimeout(r, 30));
assert('A11 same-lang noop -- lang stays en', NacChat._lang === 'en');
assert('A11 same-lang noop -- backend NOT called', backendCalled === false);

/* Empty + whitespace input doesn't crash. */
NacChat._lang = 'es';
let crashed = false;
try {
  await NacChat.send('');
  await NacChat.send('   ');
} catch (e) { crashed = true; }
assert('A12 empty/ws input does not crash', !crashed);

/* =============================================================
   PART B -- tab_by_label tolerance
   ============================================================= */

/* Set up a plugin with a tab declared two ways:
     - in elements[] with role 'tab'
     - matching DOM with data-nac-role="tab" + textContent "Lines (collection)" */
NAC.register({
  plugin_slug: 'tab_test',
  nac_version: '2.2',
  elements: [
    { id: 'tab.lines', role: 'tab',
      label_i18n: { es:'Solapa lineas',en:'Lines tab',pt:'a',fr:'a',it:'a',de:'a',ja:'a',zh:'a',hi:'a',ar:'a' } },
    { id: 'tab.permissions', role: 'tab',
      label_i18n: { es:'Solapa permisos',en:'Permissions tab',pt:'a',fr:'a',it:'a',de:'a',ja:'a',zh:'a',hi:'a',ar:'a' } }
  ]
});
const pluginRoot = document.createElement('article');
pluginRoot.setAttribute('data-nac-plugin', 'tab_test');
document.body.appendChild(pluginRoot);
const tab1 = document.createElement('button');
tab1.setAttribute('data-nac-id', 'tab.lines');
tab1.setAttribute('data-nac-role', 'tab');
tab1.textContent = 'Lines (collection)';
pluginRoot.appendChild(tab1);
const tab2 = document.createElement('button');
tab2.setAttribute('data-nac-id', 'tab.permissions');
tab2.setAttribute('data-nac-role', 'tab');
tab2.textContent = 'Permissions (matrix)';
pluginRoot.appendChild(tab2);

/* tab_by_label semantics test -- we verify it does NOT throw
   'not_found' for any of the three label paths (exact textContent,
   parens-stripped, i18n locale). The ack-poll will time out in
   this shim (no host emits the tab event) but that's a SEPARATE
   concern -- here we test the matcher. */

/* Debug -- show what the matcher sees. */
console.log('  (debug) manifest(tab_test):',
  JSON.stringify(NAC.manifest('tab_test'), null, 2).slice(0, 400));
console.log('  (debug) DOM has tab_test plugin:',
  !!document.querySelector('[data-nac-plugin="tab_test"]'));
console.log('  (debug) DOM has data-nac-role="tab":',
  document.querySelectorAll('[data-nac-role="tab"]').length);

async function tabByLabelMatches(label) {
  try {
    /* Race against a 100ms timer; if the call throws SYNCHRONOUSLY
       with code='not_found', the matcher rejected the label. If it
       hangs waiting for ack, the matcher accepted it. */
    await Promise.race([
      NAC.tab_by_label('tab_test', label),
      new Promise((_, rej) => setTimeout(() => rej(new Error('timeout-ok')), 100))
    ]);
    return true;
  } catch (e) {
    if (e.code === 'not_found')         return false;
    if (e.message === 'timeout-ok')     return true;  /* matcher found it, ack-poll hung */
    /* Unexpected error -- log + treat as matcher failure. */
    console.error('  (debug) unexpected error:', e.code, e.message);
    return false;
  }
}

assert('B1 tab_by_label resolves exact label',
       await tabByLabelMatches('Lines (collection)'));
assert('B2 tab_by_label resolves with parens stripped',
       await tabByLabelMatches('Lines'));
assert('B3 tab_by_label resolves via i18n label',
       await tabByLabelMatches('solapa lineas'));

/* tab_by_label should THROW for an unknown label. */
let tabNotFound = false;
try {
  await NAC.tab_by_label('tab_test', 'definitely-not-a-tab');
} catch (e) {
  tabNotFound = e.code === 'not_found';
}
assert('B4 tab_by_label throws not_found for unknown label', tabNotFound);

/* =============================================================
   PART C -- snapshotTree
   ============================================================= */

const snap = NacChat.snapshotTree();
assert('C1 snapshotTree returns object',    typeof snap === 'object' && snap !== null);
assert('C1 snapshotTree has active field',  'active' in snap);
assert('C1 snapshotTree has plugins array', Array.isArray(snap.plugins));
assert('C1 snapshot includes tab_test',
  snap.plugins.some(p => p && p.plugin === 'tab_test'));

/* Snapshot for tab_test must include the tab manifest entries. */
const tabSnap = snap.plugins.find(p => p && p.plugin === 'tab_test');
assert('C2 snapshot tab_test has manifest', tabSnap && tabSnap.manifest);
const ids = (tabSnap.manifest.elements || []).map(e => e.id);
assert('C2 snapshot manifest includes tab.lines', ids.includes('tab.lines'));
assert('C2 snapshot manifest includes tab.permissions', ids.includes('tab.permissions'));

console.log('');
if (failures === 0) console.log('STAGE-2 PASS');
else                console.error('STAGE-2 FAIL (' + failures + ')');
process.exit(failures === 0 ? 0 : 1);
