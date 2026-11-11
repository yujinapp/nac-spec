/* stage13-plugin-hooks.mjs -- NAC v2.6 / RFC V26-01
 *
 * The six hooks the plugin extension contract was missing for a canvas
 * or API surface to live in ANOTHER repository and still be operable
 * through the public runtime (SPEC.md sec 15.4 / 15.9 / 15.10 / 15.11):
 *
 *   E-1  discovery      NAC.plugins() / NAC.describePlugin(slug)
 *   E-2  self-description  label / hint / params on verbs, label+unit
 *                          on state, label on events
 *   E-3  emitter-listen  the ninth backend: a REAL event source that
 *                        is not postMessage (map.on, addEventListener)
 *   E-4  sdk-call        positional args (args_order) + an API handle
 *                        that never lands on window
 *   E-5  synthetic-mutation fails CLOSED instead of returning a
 *                        subscription that never fires; `root`
 *                        survives a node that unmounts and remounts
 *   E-6  error codes     the ten of 15.9 plus the reserved `plugin.`
 *                        namespace; anything else is refused
 *
 * THE RED PROOF. Every case below that guards a hook fails against the
 * 2.5.2 runtime. Run it against the previous bytes to see it:
 *
 *   git show HEAD:js/nac.js > /tmp/nac-2.5.2.js
 *   NAC3_RUNTIME_PATH=/tmp/nac-2.5.2.js node runtime/test/stage13-plugin-hooks.mjs
 *
 * The E-5 case is the one worth watching there: on 2.5.2 subscribing to
 * a state whose mirror node is absent RESOLVES -- a handle that never
 * fires -- which is why that case asserts a refusal and not a value.
 *
 * Same shim pattern as stage8. ASCII only.
 */

import fs from 'node:fs';
import path from 'node:path';
import url  from 'node:url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const NAC_PATH  = process.env.NAC3_RUNTIME_PATH
  ? path.resolve(process.env.NAC3_RUNTIME_PATH)
  : path.resolve(__dirname, '..', '..', 'js', 'nac.js');

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
    this.attributes = {};
    this.textContent = '';
  }
  setAttribute(k, v) { this.attributes[k] = String(v); }
  getAttribute(k) { return Object.prototype.hasOwnProperty.call(this.attributes, k) ? this.attributes[k] : null; }
  removeAttribute(k) { delete this.attributes[k]; }
  hasAttribute(k) { return Object.prototype.hasOwnProperty.call(this.attributes, k); }
  get classList() {
    const self = this;
    return {
      contains: (c) => (self.attributes.class || '').split(/\s+/).includes(c),
      add:    (c) => { const s = new Set((self.attributes.class || '').split(/\s+/).filter(Boolean)); s.add(c); self.attributes.class = [...s].join(' '); },
      remove: (c) => { const s = new Set((self.attributes.class || '').split(/\s+/).filter(Boolean)); s.delete(c); self.attributes.class = [...s].join(' '); },
    };
  }
  appendChild(n) { this.children.push(n); n._parent = this; return n; }
  removeChild(n) { const i = this.children.indexOf(n); if (i >= 0) this.children.splice(i, 1); n._parent = null; return n; }
  closest(sel) { let p = this; while (p) { if (_matches(p, sel)) return p; p = p._parent; } return null; }
  querySelector(sel)    { const r = _walk(this, sel); return r[0] || null; }
  querySelectorAll(sel) { return _walk(this, sel); }
  matches(sel) { return String(sel).split(',').some(s => _matches(this, s.trim())); }
  click() { this._clicked = true; }
  focus() { this._focused = true; }
  getBoundingClientRect() { return { width: 100, height: 30, top: 0, left: 0, right: 100, bottom: 30 }; }
}

/* Attribute + tag selectors only -- the same subset stage8 reads. */
function _matches(node, sel) {
  let rest = String(sel).trim();
  while (rest.length) {
    if (rest[0] === '[') {
      const end = rest.indexOf(']');
      const inner = rest.slice(1, end);
      const eq = inner.indexOf('=');
      if (eq < 0) {
        if (!Object.prototype.hasOwnProperty.call(node.attributes, inner)) return false;
      } else {
        const k = inner.slice(0, eq);
        const raw = inner.slice(eq + 1).replace(/^["']|["']$/g, '');
        if (node.attributes[k] !== raw) return false;
      }
      rest = rest.slice(end + 1).trim();
    } else {
      const m = rest.match(/^[a-zA-Z][a-zA-Z0-9_-]*/);
      if (!m) return false;
      if (node.tagName !== m[0].toUpperCase()) return false;
      rest = rest.slice(m[0].length).trim();
    }
  }
  return true;
}
function _walk(root, sel) {
  const out = [];
  (function visit(n) {
    if (_matches(n, sel)) out.push(n);
    if (n.children) for (const c of n.children) visit(c);
  })(root);
  return out.filter((n) => n !== root || _matches(root, sel));
}

const doc = new FakeNode('html');
const body = new FakeNode('body');
const head = new FakeNode('head');
doc.appendChild(head);
doc.appendChild(body);
doc.head = head;
doc.body = body;
doc.documentElement = doc;
doc.readyState = 'complete';
doc.createElement = (t) => new FakeNode(t);
doc.createTextNode = (t) => { const n = new FakeNode('TEXT'); n.textContent = t; return n; };
doc.getElementById = () => null;

const provenance = { invoked: [], read: [], event: [] };
doc.addEventListener('nac:plugin:invoked', (e) => { provenance.invoked.push(e.detail || e); });
doc.addEventListener('nac:plugin:read',    (e) => { provenance.read.push(e.detail || e); });
doc.addEventListener('nac:plugin:event',   (e) => { provenance.event.push(e.detail || e); });

/* MutationObserver mock: declared before the sandbox literal because a
   class reference is not hoisted the way a function declaration is. */
const _mutationInstances = [];
class MockMutationObserver {
  constructor(cb) { this.cb = cb; this.targets = []; _mutationInstances.push(this); }
  observe(target, opts) { this.targets.push({ target, opts: opts || {} }); }
  disconnect() {
    this.targets = [];
    const i = _mutationInstances.indexOf(this);
    if (i >= 0) _mutationInstances.splice(i, 1);
  }
  takeRecords() { return []; }
}
function fireMutation(targetEl) {
  for (const obs of _mutationInstances.slice()) {
    for (const o of obs.targets) {
      let match = (o.target === targetEl);
      if (!match && o.opts && o.opts.subtree) {
        let p = targetEl;
        while (p) { if (p === o.target) { match = true; break; } p = p._parent; }
      }
      if (match) {
        try { obs.cb([{ type: 'attributes', target: targetEl }], obs); } catch (_) {}
        break;
      }
    }
  }
}

class HostWindow extends EventTarget {
  constructor() { super(); this.document = doc; }
}
const hostWindow = new HostWindow();

const sandbox = {
  window: hostWindow,
  document: doc,
  CustomEvent: globalThis.CustomEvent,
  MutationObserver: MockMutationObserver,
};
hostWindow.document = doc;

const nacSrc = fs.readFileSync(NAC_PATH, 'utf-8');
new Function('window', 'document', 'CustomEvent', 'MutationObserver', 'console', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Promise', nacSrc)
  (sandbox.window, sandbox.document, sandbox.CustomEvent, sandbox.MutationObserver, console, setTimeout, clearTimeout, setInterval, clearInterval, Promise);

const NAC = sandbox.window.NAC;
if (!NAC) { console.error('NAC failed to load'); process.exit(1); }
NAC.STRICT_VERSIONING = false;

const tick = () => new Promise((r) => setTimeout(r, 5));

/* Each hook runs in its own section so a runtime that does not have
   one of them -- 2.5.2 refuses the ninth backend at register time --
   reports a failed section and keeps going, instead of aborting the
   file and leaving the other five unmeasured. That is what makes the
   red proof in the header readable. */
async function section(name, fn) {
  try { await fn(); }
  catch (e) {
    failures++;
    console.error('FAIL [' + name + '] threw: ' + ((e && e.message) || String(e)));
  }
}

async function expectReject(name, fn, errCode) {
  let thrown = null;
  try { await fn(); } catch (e) { thrown = e; }
  if (!thrown) { assert(name, false, 'did not reject/throw (want ' + errCode + ')'); return null; }
  assert(name + ' -> ' + thrown.code, thrown.code === errCode,
    '(want ' + errCode + ' got ' + thrown.code + ': ' + thrown.message + ')');
  return thrown;
}

/* A library that emits its own events, in the three shapes real ones
   ship. Nothing here touches the DOM: that is the point of E-3. */
class FakeEmitter {
  constructor(kind) {
    this.kind = kind;            /* 'on' | 'addEventListener' | 'addListener' | 'no-off' */
    this.listeners = {};
    this.detached = 0;
    const add = (name, fn) => { (this.listeners[name] = this.listeners[name] || []).push(fn); };
    const rem = (name, fn) => {
      const l = this.listeners[name] || [];
      const i = l.indexOf(fn);
      if (i >= 0) { l.splice(i, 1); this.detached++; }
    };
    if (kind === 'on' || kind === 'no-off') this.on = add;
    if (kind === 'on') this.off = rem;
    if (kind === 'addEventListener') { this.addEventListener = add; this.removeEventListener = rem; }
    if (kind === 'addListener') { this.addListener = add; this.removeListener = rem; }
  }
  emit(name, payload) { for (const fn of (this.listeners[name] || []).slice()) fn(payload); }
  count(name) { return (this.listeners[name] || []).length; }
}

let acme = null;

await section('E-1 discovery + E-2 self-description', async () => {

  /* ================= E-1 -- discovery (sec 15.10) ================= */

  assert('NAC.plugins is fn',           typeof NAC.plugins === 'function');
  assert('NAC.describePlugin is fn',    typeof NAC.describePlugin === 'function');
  assert('NAC.registerApiHandle is fn', typeof NAC.registerApiHandle === 'function');

  /* A plugin registered by SOMEONE ELSE -- the agent did not write it
     and has no reference to its manifest. */
  NAC.registerPlugin('acme.canvas', {
    slug:  'acme.canvas',
    label: 'Acme canvas',
    hint:  'The drawing surface of the Acme editor',
    verbs: {
      'view.set': {
        backend: 'sdk-call',
        path:    'acmeApi.setView',
        mode:    'invoke',
        label:   'Move the view',
        hint:    'Centres the canvas on a coordinate at a zoom level',
        params: [
          { name: 'center', type: 'array',  required: true,  unit: 'degrees', label: 'Centre', hint: '[lat, lng]' },
          { name: 'zoom',   type: 'number', required: false, unit: 'zoom level', min: 0, max: 22 },
        ],
      },
      'select.clear': { backend: 'sdk-call', path: 'acmeApi.clear', mode: 'invoke' },
    },
    state: {
      'view.center': [
        { backend: 'sdk-call', path: 'acmeApi.getCenter', mode: 'invoke', label: 'Centre of the view', unit: 'degrees' },
        { backend: 'dom-mirror', selector: '[data-mirror="center"]', extract: 'attribute:data-value' },
      ],
    },
    events: {
      'view.moved': {
        backend: 'emitter-listen',
        path:    'acmeApi',
        event:   'moveend',
        label:   'The view stopped moving',
        observe: ['view.center'],
      },
    },
  });

  const all = NAC.plugins();
  assert('plugins() returns an array', Array.isArray(all));
  acme = all.filter((p) => p.slug === 'acme.canvas')[0];
  assert('plugins() finds a plugin the caller did not register', !!acme);
  assert('descriptor carries the plugin label', acme && acme.label === 'Acme canvas');
  assert('descriptor lists the verbs sorted',
    acme && acme.verbs.map((v) => v.verb_path).join(',') === 'select.clear,view.set',
    acme && JSON.stringify(acme.verbs.map((v) => v.verb_path)));
  assert('descriptor lists the state paths with their chain',
    acme && acme.state.length === 1 &&
    acme.state[0].state_path === 'view.center' &&
    acme.state[0].backends.join(',') === 'sdk-call,dom-mirror');
  assert('descriptor lists the events with the library event name',
    acme && acme.events.length === 1 && acme.events[0].event === 'moveend' &&
    acme.events[0].backend === 'emitter-listen');

  const direct = NAC.describePlugin('acme.canvas');
  assert('describePlugin agrees with plugins()',
    JSON.stringify(direct) === JSON.stringify(acme));

  /* The descriptor is a COPY: a caller cannot reach into the registry
     and rewrite another plugin's routing through it. */
  direct.verbs[0].backend = 'postmessage';
  direct.slug = 'hijacked';
  if (direct.verbs[0].params) direct.verbs[0].params.push({ name: 'x', type: 'string' });
  const after = NAC.describePlugin('acme.canvas');
  assert('descriptor is a copy, not the live registry',
    after.slug === 'acme.canvas' &&
    after.verbs[0].backend === 'sdk-call' &&
    JSON.stringify(after) === JSON.stringify(acme));

  let unknown = null;
  try { NAC.describePlugin('nope.nothing'); } catch (e) { unknown = e; }
  assert('describePlugin on an unknown slug -> plugin_not_registered',
    unknown && unknown.code === 'plugin_not_registered', unknown && unknown.code);
  let badSlug = null;
  try { NAC.describePlugin(''); } catch (e) { badSlug = e; }
  assert('describePlugin with an empty slug -> invalid',
    badSlug && badSlug.code === 'invalid', badSlug && badSlug.code);

  /* ============ E-2 -- the manifest describes itself (15.11) ============ */

  const setView = acme.verbs.filter((v) => v.verb_path === 'view.set')[0];
  assert('verb carries a human label', setView && setView.label === 'Move the view');
  assert('verb carries a hint', setView && /coordinate/.test(setView.hint || ''));
  assert('verb declares its arguments', setView && Array.isArray(setView.params) && setView.params.length === 2);
  assert('argument declares name, type, unit and whether it is required',
    setView && setView.params[0].name === 'center' && setView.params[0].type === 'array' &&
    setView.params[0].unit === 'degrees' && setView.params[0].required === true);
  assert('numeric argument declares its range',
    setView && setView.params[1].min === 0 && setView.params[1].max === 22);
  assert('state path takes its label and unit from the chain',
    acme.state[0].label === 'Centre of the view' && acme.state[0].unit === 'degrees');
  assert('event carries a human label', acme.events[0].label === 'The view stopped moving');
  assert('an undeclared label reads as null, not as a missing key',
    acme.verbs[0].label === null && acme.verbs[0].params === null);

  /* A 2.5-era manifest -- no labels anywhere -- still registers. */
  let legacyOk = true;
  try {
    NAC.registerPlugin('legacy.v25', {
      slug: 'legacy.v25',
      verbs: { 'a.b': { backend: 'sdk-call', path: 'legacyApi.go', mode: 'invoke' } },
      state: {}, events: {},
    });
  } catch (_) { legacyOk = false; }
  assert('a manifest written against 2.5 still registers', legacyOk);

  function rejectsManifest(name, manifest, code) {
    let thrown = null;
    try { NAC.registerPlugin(manifest.slug, manifest); } catch (e) { thrown = e; }
    assert(name, thrown && thrown.code === code,
      thrown ? '(got ' + thrown.code + ')' : '(registered without refusing)');
  }
  rejectsManifest('a label that is not a string -> invalid', {
    slug: 'bad.label',
    verbs: { 'a.b': { backend: 'sdk-call', path: 'x', mode: 'invoke', label: 42 } },
    state: {}, events: {},
  }, 'invalid');
  rejectsManifest('a param of a type the vocabulary lacks -> invalid', {
    slug: 'bad.type',
    verbs: { 'a.b': { backend: 'sdk-call', path: 'x', mode: 'invoke', params: [{ name: 'q', type: 'coordinate' }] } },
    state: {}, events: {},
  }, 'invalid');
  rejectsManifest('a param with no name -> invalid', {
    slug: 'bad.noname',
    verbs: { 'a.b': { backend: 'sdk-call', path: 'x', mode: 'invoke', params: [{ type: 'string' }] } },
    state: {}, events: {},
  }, 'invalid');
  rejectsManifest('two params with the same name -> invalid', {
    slug: 'bad.dup',
    verbs: { 'a.b': { backend: 'sdk-call', path: 'x', mode: 'invoke', params: [{ name: 'q', type: 'string' }, { name: 'q', type: 'number' }] } },
    state: {}, events: {},
  }, 'invalid');
  rejectsManifest('params that are not an array -> invalid', {
    slug: 'bad.params',
    verbs: { 'a.b': { backend: 'sdk-call', path: 'x', mode: 'invoke', params: { q: 'string' } } },
    state: {}, events: {},
  }, 'invalid');

});

await section('E-4 sdk-call reaches further', async () => {

  /* ============ E-4 -- sdk-call reaches further (15.4) ============ */

  /* An API object that NEVER lands on window: this is SPEC 15.1's own
     motivating case (a React ref) and 2.5.2 could not express it. */
  const hiddenApi = {
    calls: [],
    setView(center, zoom) { this.calls.push({ center, zoom }); return { ok: true }; },
    getZoom() { return 9; },
    zoom: 9,
  };
  NAC.registerApiHandle('acme.map', hiddenApi);
  assert('apiHandles() lists the registered handle',
    typeof NAC.apiHandles === 'function' && NAC.apiHandles().indexOf('acme.map') >= 0);

  NAC.registerPlugin('acme.handle', {
    slug: 'acme.handle',
    verbs: {
      'view.set': {
        backend: 'sdk-call', handle: 'acme.map', path: 'setView', mode: 'invoke',
        args_order: ['center', 'zoom'],
      },
      'view.set_object': {
        backend: 'sdk-call', handle: 'acme.map', path: 'setView', mode: 'invoke',
      },
      'view.missing_handle': {
        backend: 'sdk-call', handle: 'not.registered', path: 'setView', mode: 'invoke',
      },
      'view.bad_order': {
        backend: 'sdk-call', handle: 'acme.map', path: 'setView', mode: 'invoke',
        args_order: 'center,zoom',
      },
    },
    state: {
      'view.zoom':    [{ backend: 'sdk-call', handle: 'acme.map', path: 'zoom', mode: 'read' }],
      'view.zoom_fn': [{ backend: 'sdk-call', handle: 'acme.map', path: 'getZoom', mode: 'invoke' }],
    },
    events: {},
  });

  await NAC.call('acme.handle', 'view.set', { center: [10, 20], zoom: 7 });
  assert('args_order sends POSITIONAL arguments to a library signature',
    hiddenApi.calls.length === 1 &&
    JSON.stringify(hiddenApi.calls[0].center) === '[10,20]' &&
    hiddenApi.calls[0].zoom === 7,
    JSON.stringify(hiddenApi.calls));

  await NAC.call('acme.handle', 'view.set_object', { center: [1, 2], zoom: 3 });
  assert('without args_order the args object still travels as one argument',
    hiddenApi.calls.length === 2 &&
    hiddenApi.calls[1].center && hiddenApi.calls[1].center.center &&
    hiddenApi.calls[1].zoom === undefined,
    JSON.stringify(hiddenApi.calls[1]));

  assert('state reads a property off the handle', (await NAC.read('acme.handle', 'view.zoom')) === 9);
  assert('state reads through a getter on the handle', (await NAC.read('acme.handle', 'view.zoom_fn')) === 9);

  await expectReject('an unregistered handle refuses',
    () => NAC.call('acme.handle', 'view.missing_handle', {}), 'backend_target_missing');
  await expectReject('args_order that is not an array refuses',
    () => NAC.call('acme.handle', 'view.bad_order', {}), 'invalid');

  assert('unregisterApiHandle reports what it did',
    NAC.unregisterApiHandle('acme.map') === true && NAC.unregisterApiHandle('acme.map') === false);
  await expectReject('a handle that was unregistered stops resolving',
    () => NAC.call('acme.handle', 'view.set', { center: [0, 0] }), 'backend_target_missing');
  NAC.registerApiHandle('acme.map', hiddenApi);

  let badHandle = null;
  try { NAC.registerApiHandle('', {}); } catch (e) { badHandle = e; }
  assert('registerApiHandle refuses an empty name', badHandle && badHandle.code === 'invalid');
  let nullHandle = null;
  try { NAC.registerApiHandle('x.y', null); } catch (e) { nullHandle = e; }
  assert('registerApiHandle refuses a null object', nullHandle && nullHandle.code === 'invalid');

});

await section('E-3 emitter-listen', async () => {

  /* ============ E-3 -- emitter-listen (15.4, ninth backend) ============ */

  const mapEmitter = new FakeEmitter('on');
  const domEmitter = new FakeEmitter('addEventListener');
  const nodeEmitter = new FakeEmitter('addListener');
  const leakyEmitter = new FakeEmitter('no-off');
  NAC.registerApiHandle('emit.map',  mapEmitter);
  NAC.registerApiHandle('emit.dom',  domEmitter);
  NAC.registerApiHandle('emit.node', nodeEmitter);
  NAC.registerApiHandle('emit.leaky', leakyEmitter);
  sandbox.window.globalEmitter = new FakeEmitter('on');

  /* The mirror node the observed state reads from. */
  const mirror = new FakeNode('span');
  mirror.setAttribute('data-mirror', 'zoom');
  mirror.setAttribute('data-value', '9');
  body.appendChild(mirror);

  NAC.registerPlugin('acme.events', {
    slug: 'acme.events',
    verbs: {},
    state: {
      'view.zoom': [{ backend: 'dom-mirror', selector: '[data-mirror="zoom"]', extract: 'attribute:data-value' }],
    },
    events: {
      'view.moved':   { backend: 'emitter-listen', handle: 'emit.map', event: 'moveend', extract: 'detail.zoom' },
      'view.snap':    { backend: 'emitter-listen', handle: 'emit.map', event: 'snap', observe: ['view.zoom'] },
      'dom.changed':  { backend: 'emitter-listen', handle: 'emit.dom', event: 'timeupdate' },
      'node.changed': { backend: 'emitter-listen', handle: 'emit.node', event: 'page' },
      'global.moved': { backend: 'emitter-listen', path: 'globalEmitter', event: 'moveend' },
      'leaky.moved':  { backend: 'emitter-listen', handle: 'emit.leaky', event: 'moveend' },
      'gone.moved':   { backend: 'emitter-listen', path: 'nothing.here', event: 'moveend' },
      'wrong.method': { backend: 'emitter-listen', handle: 'emit.map', event: 'moveend', method: 'subscribeMaybe' },
    },
  });

  const seen = [];
  const h1 = NAC.subscribe('acme.events', 'view.moved', (v) => seen.push(v));
  assert('subscribe through emitter-listen attached to the library',
    mapEmitter.count('moveend') === 1);
  mapEmitter.emit('moveend', { detail: { zoom: 11 } });
  assert('a real library event reaches the callback, extractor applied',
    seen.length === 1 && seen[0] === 11, JSON.stringify(seen));
  const provCount = provenance.event.filter((p) => p.backend === 'emitter-listen').length;
  assert('the synthesised event emits provenance with its backend', provCount === 1);

  NAC.unsubscribe(h1);
  assert('unsubscribe detached the listener from the library',
    mapEmitter.count('moveend') === 0 && mapEmitter.detached === 1);
  mapEmitter.emit('moveend', { detail: { zoom: 12 } });
  assert('after unsubscribe the callback stops being called', seen.length === 1);

  const snaps = [];
  const h2 = NAC.subscribe('acme.events', 'view.snap', (s) => snaps.push(s));
  mirror.setAttribute('data-value', '14');
  mapEmitter.emit('snap', {});
  await tick();
  assert('observe re-reads the declared state at event time',
    snaps.length === 1 && snaps[0]['view.zoom'] === '14', JSON.stringify(snaps));
  NAC.unsubscribe(h2);

  const domSeen = [];
  const h3 = NAC.subscribe('acme.events', 'dom.changed', (v) => domSeen.push(v));
  domEmitter.emit('timeupdate', { t: 3 });
  assert('the addEventListener / removeEventListener shape is detected',
    domSeen.length === 1 && domSeen[0].t === 3);
  NAC.unsubscribe(h3);
  assert('and torn down through removeEventListener', domEmitter.count('timeupdate') === 0);

  const nodeSeen = [];
  const h4 = NAC.subscribe('acme.events', 'node.changed', (v) => nodeSeen.push(v));
  nodeEmitter.emit('page', 7);
  assert('the addListener / removeListener shape is detected', nodeSeen.length === 1 && nodeSeen[0] === 7);
  NAC.unsubscribe(h4);

  const globalSeen = [];
  const h5 = NAC.subscribe('acme.events', 'global.moved', (v) => globalSeen.push(v));
  sandbox.window.globalEmitter.emit('moveend', 'g');
  assert('an emitter reached by dotted path into the global object works',
    globalSeen.length === 1 && globalSeen[0] === 'g');
  NAC.unsubscribe(h5);

  await expectReject('an emitter with no removal method is REFUSED, not leaked',
    () => NAC.subscribe('acme.events', 'leaky.moved', () => {}), 'backend_target_missing');
  assert('and nothing was attached to it', leakyEmitter.count('moveend') === 0);
  await expectReject('an emitter that does not resolve refuses',
    () => NAC.subscribe('acme.events', 'gone.moved', () => {}), 'backend_target_missing');
  await expectReject('a declared method that is not a function refuses',
    () => NAC.subscribe('acme.events', 'wrong.method', () => {}), 'backend_target_missing');

  let noEventName = null;
  try {
    NAC.registerPlugin('bad.emitter', {
      slug: 'bad.emitter', verbs: {}, state: {},
      events: { 'x.y': { backend: 'emitter-listen', handle: 'emit.map' } },
    });
  } catch (e) { noEventName = e; }
  assert('emitter-listen without `event` is refused at register time',
    noEventName && noEventName.code === 'invalid', noEventName && noEventName.code);

});

await section('E-5 synthetic-mutation fails closed', async () => {

  /* ====== E-5 -- synthetic-mutation fails closed (15.4) ====== */

  /* THE REGRESSION. On 2.5.2 this subscription came back as a valid
     handle and never fired: the selector matched nothing, so the
     observer observed nothing. Success and silence. */
  NAC.registerPlugin('grid.rows', {
    slug: 'grid.rows',
    verbs: {},
    state: {
      'row.42.value':  [{ backend: 'dom-mirror', selector: '[data-row="42"]', extract: 'attribute:data-value' }],
      'row.now.value': [{ backend: 'dom-mirror', selector: '[data-row="now"]', extract: 'attribute:data-value' }],
    },
    events: {
      'row.42.changed':      { backend: 'synthetic-mutation', observe: ['row.42.value'], throttle_ms: 1 },
      'row.mixed.changed':   { backend: 'synthetic-mutation', observe: ['row.now.value', 'row.42.value'], throttle_ms: 1 },
      'row.42.rooted':       { backend: 'synthetic-mutation', observe: ['row.42.value'], root: '[data-grid="viewport"]', throttle_ms: 1 },
      'row.42.rooted_gone':  { backend: 'synthetic-mutation', observe: ['row.42.value'], root: '[data-grid="nowhere"]', throttle_ms: 1 },
      'row.42.bad_root':     { backend: 'synthetic-mutation', observe: ['row.42.value'], root: 17, throttle_ms: 1 },
      'row.now.changed':     { backend: 'synthetic-mutation', observe: ['row.now.value'], throttle_ms: 1 },
    },
  });

  const viewport = new FakeNode('div');
  viewport.setAttribute('data-grid', 'viewport');
  body.appendChild(viewport);
  const presentRow = new FakeNode('span');
  presentRow.setAttribute('data-row', 'now');
  presentRow.setAttribute('data-value', '1');
  viewport.appendChild(presentRow);

  await expectReject('subscribing to a row that is not painted REFUSES instead of going silent',
    () => NAC.subscribe('grid.rows', 'row.42.changed', () => {}), 'backend_target_missing');
  await expectReject('one absent node out of two is enough to refuse',
    () => NAC.subscribe('grid.rows', 'row.mixed.changed', () => {}), 'backend_target_missing');
  await expectReject('a root selector that resolves nothing refuses too',
    () => NAC.subscribe('grid.rows', 'row.42.rooted_gone', () => {}), 'backend_target_missing');
  await expectReject('a root that is not a selector string refuses',
    () => NAC.subscribe('grid.rows', 'row.42.bad_root', () => {}), 'invalid');

  /* The virtualised-grid case: the row is absent NOW, the container
     outlives it, and the subscription survives the remount. */
  const rooted = [];
  const h6 = NAC.subscribe('grid.rows', 'row.42.rooted', (s) => rooted.push(s));
  assert('with a root declared, subscribing to an unpainted row is allowed', !!h6);
  await tick();
  const lateRow = new FakeNode('span');
  lateRow.setAttribute('data-row', '42');
  lateRow.setAttribute('data-value', '100');
  viewport.appendChild(lateRow);
  fireMutation(lateRow);
  await tick(); await tick();
  assert('the row remounts and the subscription taken before it fires',
    rooted.length === 1 && rooted[0]['row.42.value'] === '100', JSON.stringify(rooted));
  lateRow.setAttribute('data-value', '101');
  fireMutation(lateRow);
  await tick(); await tick();
  assert('and keeps firing on the next change',
    rooted.length === 2 && rooted[1]['row.42.value'] === '101', JSON.stringify(rooted));
  NAC.unsubscribe(h6);

  /* No regression for the shape that already worked. */
  const plain = [];
  const h7 = NAC.subscribe('grid.rows', 'row.now.changed', (s) => plain.push(s));
  await tick();
  presentRow.setAttribute('data-value', '2');
  fireMutation(presentRow);
  await tick(); await tick();
  assert('a mirror node that IS painted keeps working as it did in 2.5',
    plain.length === 1 && plain[0]['row.now.value'] === '2', JSON.stringify(plain));
  NAC.unsubscribe(h7);

});

await section('E-6 plugin error code space', async () => {

  /* ====== E-6 -- the plugin error code space (15.9) ====== */

  sandbox.window.errApi = {
    rowGone() { const e = new Error('row 42 is not materialised'); e._code = 'plugin.row_not_materialized'; throw e; },
    madeUp()  { const e = new Error('something'); e._code = 'totally_made_up'; throw e; },
    bare()    { throw new Error('no code at all'); },
  };
  NAC.registerPlugin('acme.errors', {
    slug: 'acme.errors',
    verbs: {
      'row.gone':   { backend: 'sdk-call', path: 'errApi.rowGone', mode: 'invoke' },
      'row.madeup': { backend: 'sdk-call', path: 'errApi.madeUp',  mode: 'invoke' },
      'row.bare':   { backend: 'sdk-call', path: 'errApi.bare',    mode: 'invoke' },
    },
    state: {}, events: {},
  });

  const pluginCode = await expectReject('a plugin code under the reserved prefix survives verbatim',
    () => NAC.call('acme.errors', 'row.gone'), 'plugin.row_not_materialized');
  assert('and it is distinguishable from "that row does not exist"',
    pluginCode && pluginCode.code !== 'invalid' && pluginCode.code !== 'backend_target_missing');
  const madeUp = await expectReject('a code outside the closed list and outside the prefix is refused',
    () => NAC.call('acme.errors', 'row.madeup'), 'invalid');
  assert('and the refusal names the code it refused',
    madeUp && madeUp.offending_code === 'totally_made_up', madeUp && madeUp.offending_code);
  let bare = null;
  try { await NAC.call('acme.errors', 'row.bare'); } catch (e) { bare = e; }
  assert('a backend error with no code at all still surfaces as itself',
    bare && /no code at all/.test(bare.message));

});

/* ====== the version this surface belongs to ====== */

assert('runtime declares spec version 2.6', NAC.spec_version === '2.6', NAC.spec_version);

console.log('\n' + (failures === 0 ? 'STAGE-13 PASS' : 'STAGE-13 FAIL (' + failures + ')'));
process.exit(failures === 0 ? 0 : 1);
