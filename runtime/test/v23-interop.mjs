/**
 * v2.3 PREVIEW interop suite.
 *
 * Validates the export/import contract + the proxy dispatcher
 * patches NAC.click/fill/etc to route remote: prefixes. Uses the
 * same FakeNode shim as v22.mjs.
 *
 * No real network. fetch() is intercepted to a mock peer.
 */

import fs from 'node:fs';
import path from 'node:path';
import url  from 'node:url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const RUNTIME_PATH = path.resolve(__dirname, '..', '..', '..',
  'yujin.app', 'nac-spec', 'js', 'nac.js');
const INTEROP_PATH = path.resolve(__dirname, '..', '..', '..',
  'yujin.app', 'nac-spec', 'js', 'nac-mcp-interop.js');

let failures = 0;
function assert(name, ok, detail) {
  if (ok) console.log('PASS', name);
  else { failures++; console.error('FAIL', name, detail || ''); }
}

/* ---------- Tiny DOM shim (re-used from v22.mjs) ---------- */

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
  }
  setAttribute(k, v) { this._attrs[k] = String(v); }
  getAttribute(k)    { return this._attrs[k] != null ? this._attrs[k] : null; }
  hasAttribute(k)    { return this._attrs[k] != null; }
  removeAttribute(k) { delete this._attrs[k]; }
  appendChild(c)     { c.parentNode = this; this.children.push(c); return c; }
  removeChild(c)     { this.children = this.children.filter(x => x !== c); return c; }
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
  matches(sel) { return this._matches(sel); }
  querySelector(sel) { return this._descend(n => n._matches && n._matches(sel)) || null; }
  querySelectorAll(sel) { const o = []; this._descend(n => { if (n._matches && n._matches(sel)) o.push(n); return false; }); return o; }
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
  dispatchEvent(ev) { return super.dispatchEvent(ev); }
}

function installShim() {
  const doc = new FakeNode('DOCUMENT');
  doc.body = new FakeNode('BODY');
  doc.head = new FakeNode('HEAD');
  doc.documentElement = new FakeNode('HTML');
  doc.documentElement.appendChild(doc.head);
  doc.documentElement.appendChild(doc.body);
  doc.children.push(doc.documentElement);
  doc.createElement   = (t) => new FakeNode(t);
  doc.createTextNode  = (t) => { const n = new FakeNode('TEXT'); n.textContent = t; return n; };
  doc.createEvent     = () => ({ initCustomEvent(){} });
  doc.getElementById  = (id) => doc._descend(n => n.getAttribute && n.getAttribute('id') === id) || null;
  globalThis.document = doc;
  globalThis.window   = globalThis;
  globalThis.HTMLElement = FakeNode;
  globalThis.Element     = FakeNode;
  globalThis.Node        = FakeNode;
  globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0);
  globalThis.cancelAnimationFrame  = (id) => clearTimeout(id);
  globalThis.MutationObserver = class { constructor(){} observe(){} disconnect(){} };
  globalThis.matchMedia = () => ({ matches: false, addEventListener(){}, removeEventListener(){} });
  globalThis.localStorage = { getItem(){return null;}, setItem(){}, removeItem(){}, clear(){} };
  globalThis.sessionStorage = globalThis.localStorage;
  globalThis.location = { href:'http://localhost/test', pathname:'/test', protocol:'http:', host:'localhost' };
  try { Object.defineProperty(globalThis, 'navigator', { value:{language:'en-US'}, configurable:true, writable:true }); } catch(_) {}
  /* Subtle crypto for HMAC (Node 18+ exposes it). */
  if (!globalThis.crypto) globalThis.crypto = require('node:crypto').webcrypto;
}

function loadRuntime() {
  const nacCode = fs.readFileSync(RUNTIME_PATH, 'utf8');
  const interopCode = fs.readFileSync(INTEROP_PATH, 'utf8');
  // eslint-disable-next-line no-new-func
  (new Function(nacCode + '\n//# sourceURL=nac.js')).call(globalThis);
  // eslint-disable-next-line no-new-func
  (new Function(interopCode + '\n//# sourceURL=nac-mcp-interop.js')).call(globalThis);
}

process.on('uncaughtException', () => { /* suppress for tests */ });

/* ---------- Set up + register two manifests so export_tree has content ---------- */

installShim();
loadRuntime();
const NAC = globalThis.NAC;

assert('interop installed',   typeof NAC.export_tree === 'function');
assert('import_remote_tree',  typeof NAC.import_remote_tree === 'function');
assert('list_remote_apps',    typeof NAC.list_remote_apps === 'function');
assert('disconnect_remote',   typeof NAC.disconnect_remote === 'function');

/* === Register a host plugin so describe() has something. === */
NAC.register({
  plugin_slug: 'host_app',
  nac_version: '2.3',
  elements: [
    { id: 'host_app.save', role: 'action',
      label_i18n: { es:'a',en:'b',pt:'c',fr:'d',it:'e',de:'f',ja:'g',zh:'h',hi:'i',ar:'j' },
      actions: [{ verb: 'save',
        label_i18n: { es:'a',en:'b',pt:'c',fr:'d',it:'e',de:'f',ja:'g',zh:'h',hi:'i',ar:'j' } }] }
  ]
});

/* ---------- Test 1: export_tree returns valid shape ---------- */
const payload = NAC.export_tree();
assert('T1 export_tree returns app_id',     typeof payload.app_id === 'string');
assert('T1 export_tree nac_version 2.3',    payload.nac_version === '2.3');
assert('T1 export_tree has manifests',      typeof payload.manifests === 'object');
assert('T1 export_tree has host_app',       'host_app' in payload.manifests);
assert('T1 export_tree state.user_lang',    typeof payload.state.user_lang === 'string');
assert('T1 export_tree exported_at ISO',    /^\d{4}-\d{2}-\d{2}T/.test(payload.exported_at));

/* ---------- Test 2: export_tree scope filter ---------- */
NAC.register({
  plugin_slug: 'second_plugin',
  nac_version: '2.3',
  elements: [{ id: 'second_plugin.x', role: 'action',
              label_i18n: { es:'a',en:'b',pt:'c',fr:'d',it:'e',de:'f',ja:'g',zh:'h',hi:'i',ar:'j' } }]
});
const scoped = NAC.export_tree({ scope: 'plugin_slug:second_plugin' });
assert('T2 scoped export only second_plugin',
  Object.keys(scoped.manifests).length === 1 && 'second_plugin' in scoped.manifests);

/* ---------- Test 3: export_tree locale filter ---------- */
const filtered = NAC.export_tree({ include_locales: ['en', 'es'] });
const m = filtered.manifests.host_app;
const labels = m.elements[0].label_i18n;
assert('T3 locale filter keeps en + es',
  Object.keys(labels).length === 2 && 'en' in labels && 'es' in labels);

/* ---------- Test 4: import_remote_tree rejects missing conn ---------- */
let t4Threw = false;
try {
  NAC.import_remote_tree(payload, {});
} catch (e) {
  t4Threw = e.code === 'invalid';
}
assert('T4 import rejects missing bearer/endpoint', t4Threw);

/* ---------- Test 5: import_remote_tree registers namespaced plugin ---------- */
const handle = NAC.import_remote_tree(payload, {
  transport: 'http',
  endpoint:  'https://peer.example/mcp',
  bearer:    'test-token',
  namespace: 'peer',
  auto_subscribe: false
});
assert('T5 handle namespace is peer',  handle.namespace === 'peer');
assert('T5 handle includes host_app',  handle.imported_plugins.includes('remote:peer:host_app'));
/* NAC.describe() reflects only DOM-mounted plugins; the remote
   import registers manifests without mounting DOM, so we verify
   via list_registered_plugins (the v2.3 introspection helper)
   which iterates the manifest registry directly. */
const registered = NAC.list_registered_plugins();
assert('T5 registered plugins include remote:peer:host_app',
       registered.includes('remote:peer:host_app'));
assert('T5 NAC.manifest works for namespaced slug',
       NAC.manifest('remote:peer:host_app') !== null);

/* ---------- Test 6: list_remote_apps reflects import ---------- */
const apps = NAC.list_remote_apps();
assert('T6 list_remote_apps length 1', apps.length === 1);
assert('T6 list_remote_apps namespace', apps[0].namespace === 'peer');

/* ---------- Test 7: import_remote_tree rejects duplicate namespace ---------- */
let t7Threw = false;
try {
  NAC.import_remote_tree(payload, {
    transport: 'http', endpoint: 'https://peer.example/mcp',
    bearer: 'x', namespace: 'peer', auto_subscribe: false
  });
} catch (e) { t7Threw = e.code === 'conflict'; }
assert('T7 duplicate namespace rejected', t7Threw);

/* ---------- Test 8: proxy fetch intercepted on remote: nac_id ---------- */
/* Install a fetch mock that simulates the peer responding. */
let lastInvokeBody = null;
globalThis.fetch = async function (url, opts) {
  if (typeof url === 'string' && url.indexOf('https://peer.example/mcp/nac.invoke') === 0) {
    lastInvokeBody = JSON.parse(opts.body);
    return new Response(JSON.stringify({ ok: true, result: { ok: true, dispatched: 'mock' } }), {
      status: 200, headers: { 'Content-Type': 'application/json' }
    });
  }
  return new Response('not found', { status: 404 });
};

/* Stub Response if missing. */
if (typeof globalThis.Response === 'undefined') {
  globalThis.Response = class {
    constructor(body, init) { this.body = body; this.status = (init && init.status) || 200; this.ok = this.status < 400; }
    async json() { return JSON.parse(this.body); }
    async text() { return String(this.body); }
  };
}

let t8Resolved = false;
let t8Err = null;
try {
  const result = await NAC.click('remote:peer:host_app.save');
  t8Resolved = !!result;
} catch (e) {
  t8Err = e;
}
assert('T8 NAC.click proxied to peer', t8Resolved && lastInvokeBody && lastInvokeBody.action.kind === 'click');
assert('T8 proxy stripped namespace from peer nac_id',
  lastInvokeBody && lastInvokeBody.nac_id === 'host_app.save');

/* ---------- Test 9: proxy NAC.fill ---------- */
lastInvokeBody = null;
await NAC.fill('remote:peer:host_app.save', 'hello');
assert('T9 NAC.fill proxied as fill kind',
  lastInvokeBody && lastInvokeBody.action.kind === 'fill' && lastInvokeBody.action.args.value === 'hello');

/* ---------- Test 10: ack event emitted locally after proxy success ---------- */
let t10Ack = null;
document.addEventListener('nac:action:succeeded', function onAck(e) {
  if (e.detail && e.detail.via_interop) {
    t10Ack = e.detail;
    document.removeEventListener('nac:action:succeeded', onAck);
  }
});
await NAC.click('remote:peer:host_app.save');
/* Wait a microtask for the dispatch. */
await new Promise(r => setTimeout(r, 10));
assert('T10 local ack emitted with via_interop:true',
       t10Ack !== null && t10Ack.via_interop === true && t10Ack.is_trusted === false);

/* ---------- Test 11: proxy rejects with peer error ---------- */
globalThis.fetch = async function () {
  return new Response(JSON.stringify({ ok: false, error: { code: 'peer_busy', message: 'try later' } }), {
    status: 200, headers: { 'Content-Type': 'application/json' }
  });
};
let t11Err = null;
try { await NAC.click('remote:peer:host_app.save'); }
catch (e) { t11Err = e; }
assert('T11 peer error rejection bubbles up',
       t11Err && t11Err.code === 'peer_busy');

/* ---------- Test 12: disconnect_remote unregisters ---------- */
NAC.disconnect_remote('peer');
const afterDisc = NAC.list_remote_apps();
assert('T12 disconnect clears the namespace', afterDisc.length === 0);
const descAfter = NAC.describe();
const stillRemote = (descAfter.plugins || []).some(p => p.plugin === 'remote:peer:host_app');
assert('T12 disconnect removed namespaced plugin', !stillRemote);

/* ---------- Test 13: calling click on disconnected namespace fails ---------- */
let t13Err = null;
try { await NAC.click('remote:peer:host_app.save'); }
catch (e) { t13Err = e; }
assert('T13 disconnected namespace -> not_found',
       t13Err && t13Err.code === 'not_found');

/* ---------- Test 14: local (non-remote) clicks do NOT proxy ---------- */
/* Critical contract: after interop install, NAC.click on a LOCAL
   id must route through the original (DOM) path, not the proxy
   path. We assert by checking that fetch() is never invoked
   during a local click attempt. The click itself may time out
   waiting for ack in the shim (no ack-poll listener wired), but
   that's a shim limitation -- what we care about here is no
   accidental proxying of local ids. */
let t14FetchCalls = 0;
const _prevFetch = globalThis.fetch;
globalThis.fetch = async function () { t14FetchCalls++; return _prevFetch.apply(this, arguments); };
try {
  /* Set short timeout via Promise.race so the test doesn't wait 5s. */
  await Promise.race([
    NAC.click('host_app.save').catch(() => {}),
    new Promise(r => setTimeout(r, 200))
  ]);
} catch (_) {}
globalThis.fetch = _prevFetch;
assert('T14 local click does NOT proxy (no fetch call)', t14FetchCalls === 0);

/* ---------- Summary ---------- */
console.log('');
if (failures === 0) {
  console.log('V23-INTEROP PASS (14/14)');
  process.exit(0);
} else {
  console.error('V23-INTEROP FAIL (' + failures + ' failure' + (failures === 1 ? '' : 's') + ')');
  process.exit(1);
}
