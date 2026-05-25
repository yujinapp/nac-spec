/* stage8-plugin-extension.mjs -- NAC v2.5 Block A
 *
 * Plugin extension contract for canvas + API surfaces
 * (Collabora, Figma, Excalidraw, Miro, etc).
 *
 * Verifies SPEC.md sec 15:
 *   - NAC.registerPlugin(slug, manifest): contract validation + storage
 *   - NAC.call(plugin, verb_path, args): routing across backend types
 *   - NAC.read(plugin, state_path): fallback chain semantics
 *   - NAC.subscribe / unsubscribe: handle lifecycle
 *   - Extractor mini-DSL: field path / attribute / text / classList.contains / value / present
 *   - Provenance event family: nac:plugin:invoked / :read / :event
 *   - Error contract: plugin_not_registered, verb_not_declared, state_not_declared,
 *     event_not_declared, backend_unknown, backend_target_missing, cross_origin_blocked,
 *     state_unreadable, timeout, invalid
 *
 * Same shim pattern as stage7. ASCII only.
 */

import fs from 'node:fs';
import path from 'node:path';
import url  from 'node:url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const NAC_PATH  = path.resolve(__dirname, '..', '..', 'js', 'nac.js');

let failures = 0;
function assert(name, ok, detail) {
  if (ok) console.log('PASS', name);
  else { failures++; console.error('FAIL', name, detail || ''); }
}

/* ---------- Minimal browser shim (extends the stage7 shim with iframe + postMessage) ---------- */

class FakeNode extends EventTarget {
  constructor(tag) {
    super();
    this.tagName = (tag || 'DIV').toUpperCase();
    this.children = [];
    this.attributes = {};
    this.textContent = '';
    this._innerText = '';
  }
  setAttribute(k, v) { this.attributes[k] = String(v); }
  getAttribute(k) { return Object.prototype.hasOwnProperty.call(this.attributes, k) ? this.attributes[k] : null; }
  removeAttribute(k) { delete this.attributes[k]; }
  hasAttribute(k) { return Object.prototype.hasOwnProperty.call(this.attributes, k); }
  get classList() {
    const self = this;
    return {
      contains: (c) => (self.attributes.class || '').split(/\s+/).includes(c),
      add:    (c) => { const set = new Set((self.attributes.class || '').split(/\s+/).filter(Boolean)); set.add(c); self.attributes.class = [...set].join(' '); },
      remove: (c) => { const set = new Set((self.attributes.class || '').split(/\s+/).filter(Boolean)); set.delete(c); self.attributes.class = [...set].join(' '); },
      toggle: (c) => { const set = new Set((self.attributes.class || '').split(/\s+/).filter(Boolean)); if (set.has(c)) set.delete(c); else set.add(c); self.attributes.class = [...set].join(' '); },
    };
  }
  appendChild(n) { this.children.push(n); n._parent = this; return n; }
  removeChild(n) { const i = this.children.indexOf(n); if (i >= 0) this.children.splice(i, 1); return n; }
  closest(sel) {
    let p = this;
    while (p) {
      if (_matches(p, sel)) return p;
      p = p._parent;
    }
    return null;
  }
  querySelector(sel)    { const r = _walk(this, sel); return r[0] || null; }
  querySelectorAll(sel) { return _walk(this, sel); }
  matches(sel) { return String(sel).split(',').some(s => _matches(this, s.trim())); }
  click() {
    try { this.dispatchEvent(new Event('click', { bubbles: true })); } catch (_) {}
    this._clicked = true;
  }
  focus() { this._focused = true; }
  getBoundingClientRect() { return { width: 100, height: 30, top: 0, left: 0, right: 100, bottom: 30 }; }
}

function _matches(node, sel) {
  let rest = sel.trim();
  while (rest.length) {
    if (rest[0] === '[') {
      const end = rest.indexOf(']');
      const inner = rest.slice(1, end);
      const eq = inner.indexOf('=');
      if (eq < 0) {
        if (!node.attributes.hasOwnProperty(inner)) return false;
      } else {
        let k = inner.slice(0, eq);
        let raw = inner.slice(eq + 1).replace(/^["']|["']$/g, '');
        const suffix = k.endsWith('$');
        if (suffix) k = k.slice(0, -1);
        const v = node.attributes[k];
        if (v == null) return false;
        if (suffix) { if (!v.endsWith(raw)) return false; }
        else if (v !== raw) return false;
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
  function visit(n) {
    if (_matches(n, sel)) out.push(n);
    if (n.children) for (const c of n.children) visit(c);
  }
  for (const c of root.children) visit(c);
  return out;
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
doc.getElementById = (id) => {
  const found = [];
  (function visit(n) {
    if (n && n.attributes && n.attributes.id === id) found.push(n);
    if (n && n.children) for (const c of n.children) visit(c);
  })(doc);
  return found[0] || null;
};

/* Provenance events from sec 15.7 land on document. Capture for assertions. */
const provenance = { invoked: [], read: [], event: [] };
doc.addEventListener('nac:plugin:invoked', (e) => { provenance.invoked.push(e.detail || e); });
doc.addEventListener('nac:plugin:read',    (e) => { provenance.read.push(e.detail || e); });
doc.addEventListener('nac:plugin:event',   (e) => { provenance.event.push(e.detail || e); });

/* ------- Iframe + window simulation for postmessage / same-origin backends ------- */

class FakeWindow extends EventTarget {
  constructor() {
    super();
    this.postedMessages = [];
  }
  postMessage(msg, targetOrigin) {
    this.postedMessages.push({ msg: msg, targetOrigin: targetOrigin || '*' });
  }
}

function makeIframe(attrs, opts) {
  const f = new FakeNode('iframe');
  for (const k in (attrs || {})) f.setAttribute(k, attrs[k]);
  f.contentWindow = new FakeWindow();
  /* Manifest-side state for same-origin reads. Tests set this directly. */
  f.contentWindow.app = (opts && opts.app) || null;
  f._sameOrigin = !(opts && opts.crossOrigin === true);
  return f;
}

/* ------- MutationObserver mock (must be declared BEFORE sandbox so the
   `class` reference in the sandbox literal resolves -- classes are not
   hoisted like function declarations) ------- */

const _mutationInstances = [];
class MockMutationObserver {
  constructor(cb) {
    this.cb = cb;
    this.targets = [];
    _mutationInstances.push(this);
  }
  observe(target, opts) { this.targets.push({ target: target, opts: opts || {} }); }
  disconnect() {
    this.targets = [];
    const i = _mutationInstances.indexOf(this);
    if (i >= 0) _mutationInstances.splice(i, 1);
  }
  takeRecords() { return []; }
}
/* Tests fire mutations by calling fireMutation(targetEl). All observers
   watching that target (directly or via subtree:true) get notified. */
function fireMutation(targetEl) {
  for (const obs of _mutationInstances.slice()) {
    for (const o of obs.targets) {
      let match = (o.target === targetEl);
      if (!match && o.opts && o.opts.subtree) {
        /* Walk up from targetEl looking for o.target as an ancestor. */
        let p = targetEl;
        while (p) { if (p === o.target) { match = true; break; } p = p._parent; }
      }
      if (match) {
        try { obs.cb([{ type: 'attributes', target: targetEl }], obs); }
        catch (_) {}
        break;
      }
    }
  }
}

/* ------- The window the runtime sees (passed as the `window` arg) ------- */

class HostWindow extends EventTarget {
  constructor() {
    super();
    this.document = doc;
  }
}

const hostWindow = new HostWindow();

const sandbox = {
  window: hostWindow,
  document: doc,
  CustomEvent: globalThis.CustomEvent,
  /* Real Event constructor needed by postmessage-listen synthesis. */
  Event:        globalThis.Event,
  MessageEvent: globalThis.MessageEvent || globalThis.Event,
  MutationObserver: MockMutationObserver,
  console,
  setTimeout, clearTimeout, setInterval, clearInterval,
  Promise,
};
hostWindow.document = doc;
/* Helper test-only: dispatch a synthetic 'message' event on hostWindow as if
   the iframe had posted back. Used by postmessage-listen + script-bridge tests. */
function postFromIframe(sourceIframe, msg) {
  const ev = new Event('message');
  ev.data = msg;
  ev.source = sourceIframe.contentWindow;
  hostWindow.dispatchEvent(ev);
}

const nacSrc = fs.readFileSync(NAC_PATH, 'utf-8');
new Function('window', 'document', 'CustomEvent', 'MutationObserver', 'console', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Promise', nacSrc)
  (sandbox.window, sandbox.document, sandbox.CustomEvent, sandbox.MutationObserver, console, setTimeout, clearTimeout, setInterval, clearInterval, Promise);

const NAC = sandbox.window.NAC;

/* v2.5 alpha.4: STRICT_VERSIONING default flipped to true. This
   test does not use V24-04 expected_* params, so opt out at the
   top to keep the test focused on its actual subject. */
NAC.STRICT_VERSIONING = false;

if (!NAC) { console.error('NAC failed to load'); process.exit(1); }

/* Helper: assert async function rejects with a given NacError code. */
async function expectReject(name, fn, errCode) {
  let thrown = null;
  try { await fn(); }
  catch (e) { thrown = e; }
  if (!thrown) { assert(name + ' (threw)', false, 'no throw'); return; }
  assert(name + ' threw ' + thrown.code, thrown.code === errCode,
    '(want ' + errCode + ' got ' + thrown.code + ': ' + thrown.message + ')');
}

await (async () => {
  /* ============== Sec 15.2 -- NAC.registerPlugin contract ============== */

  assert('NAC.registerPlugin is fn', typeof NAC.registerPlugin === 'function');
  assert('NAC.call is fn',           typeof NAC.call === 'function');
  assert('NAC.read is fn',           typeof NAC.read === 'function');
  assert('NAC.subscribe is fn',      typeof NAC.subscribe === 'function');
  assert('NAC.unsubscribe is fn',    typeof NAC.unsubscribe === 'function');

  /* ============== Sec 15.3 -- manifest validation ============== */

  let invalidManifest = false;
  try { NAC.registerPlugin(); } catch (_) { invalidManifest = true; }
  assert('registerPlugin no args -> throws', invalidManifest);

  let bareSlug = false;
  try { NAC.registerPlugin('p1'); } catch (_) { bareSlug = true; }
  assert('registerPlugin slug without manifest -> throws', bareSlug);

  let badBackend = false;
  try {
    NAC.registerPlugin('p_badbackend', {
      slug: 'p_badbackend',
      verbs: { 'a.b': { backend: 'totally_made_up' } },
      state: {}, events: {},
    });
  } catch (e) {
    badBackend = e.code === 'backend_unknown' || e.code === 'invalid';
  }
  assert('registerPlugin rejects unknown backend at register time', badBackend);

  /* ============== Sec 15.4 -- sdk-call backend (assign mode) ============== */
  /* Easiest backend for tests because it just touches window paths. */

  sandbox.window.testApp = { selection: null, lastCall: null };
  NAC.registerPlugin('sdktest', {
    slug: 'sdktest',
    verbs: {
      'select.set': {
        backend: 'sdk-call',
        path:    'testApp.selection',
        mode:    'assign',
      },
      'select.invoke': {
        backend: 'sdk-call',
        path:    'testApp.invoke',
        mode:    'invoke',
      },
    },
    state: {
      'selection.current': [
        { backend: 'sdk-call', path: 'testApp.selection', mode: 'read' },
      ],
    },
    events: {},
  });

  await NAC.call('sdktest', 'select.set', { nodes: [1, 2, 3] });
  assert('sdk-call assign wrote into window.testApp.selection',
    JSON.stringify(sandbox.window.testApp.selection) === JSON.stringify({ nodes: [1, 2, 3] }));

  sandbox.window.testApp.invoke = (args) => {
    sandbox.window.testApp.lastCall = args;
    return { ok: true };
  };
  const invokeResult = await NAC.call('sdktest', 'select.invoke', { x: 42 });
  assert('sdk-call invoke executed function',
    sandbox.window.testApp.lastCall && sandbox.window.testApp.lastCall.x === 42);
  assert('sdk-call invoke returned value',
    invokeResult && invokeResult.ok === true);

  /* sdk-call read mode reads the path. */
  const sel = await NAC.read('sdktest', 'selection.current');
  assert('read sdk-call returns current value of path',
    sel && JSON.stringify(sel) === JSON.stringify({ nodes: [1, 2, 3] }));

  /* ============== Sec 15.9 -- errors ============== */

  await expectReject('call on unregistered plugin -> plugin_not_registered',
    () => NAC.call('ghost', 'x.y'),
    'plugin_not_registered');

  await expectReject('call on unknown verb -> verb_not_declared',
    () => NAC.call('sdktest', 'nope.nope'),
    'verb_not_declared');

  await expectReject('read on unknown state -> state_not_declared',
    () => NAC.read('sdktest', 'nope.nope'),
    'state_not_declared');

  /* ============== Sec 15.4 -- dom-mirror backend ============== */

  const toolbar = new FakeNode('button');
  toolbar.setAttribute('data-nac-id', 'toolbar.bold');
  toolbar.setAttribute('aria-label', 'Bold');
  toolbar.textContent = 'B';
  body.appendChild(toolbar);

  NAC.registerPlugin('domtest', {
    slug: 'domtest',
    verbs: {},
    state: {
      'bold.active': [
        { backend: 'dom-mirror', selector: '[data-nac-id="toolbar.bold"]',
          extract: 'classList.contains:selected' },
      ],
      'bold.label': [
        { backend: 'dom-mirror', selector: '[data-nac-id="toolbar.bold"]',
          extract: 'attribute:aria-label' },
      ],
      'bold.text': [
        { backend: 'dom-mirror', selector: '[data-nac-id="toolbar.bold"]',
          extract: 'text' },
      ],
      'bold.present': [
        { backend: 'dom-mirror', selector: '[data-nac-id="toolbar.bold"]',
          extract: 'present' },
      ],
      'missing.present': [
        { backend: 'dom-mirror', selector: '[data-nac-id="never.here"]',
          extract: 'present' },
      ],
    },
    events: {},
  });

  const boldActive1 = await NAC.read('domtest', 'bold.active');
  assert('dom-mirror classList.contains -> false when class absent', boldActive1 === false);

  toolbar.classList.add('selected');
  const boldActive2 = await NAC.read('domtest', 'bold.active');
  assert('dom-mirror classList.contains -> true when class present', boldActive2 === true);

  const boldLabel = await NAC.read('domtest', 'bold.label');
  assert('dom-mirror attribute:aria-label', boldLabel === 'Bold');

  const boldText = await NAC.read('domtest', 'bold.text');
  assert('dom-mirror text extractor', boldText === 'B');

  const boldPresent = await NAC.read('domtest', 'bold.present');
  assert('dom-mirror present:true when element exists', boldPresent === true);

  const missingPresent = await NAC.read('domtest', 'missing.present');
  assert('dom-mirror present:false when element absent', missingPresent === false);

  /* ============== Sec 15.6 -- fallback chain ============== */

  NAC.registerPlugin('chaintest', {
    slug: 'chaintest',
    verbs: {},
    state: {
      'priority': [
        /* first: a path that does not exist on window */
        { backend: 'sdk-call', path: 'definitelyDoesNotExist.field', mode: 'read' },
        /* second: dom-mirror on a non-existent selector */
        { backend: 'dom-mirror', selector: '[data-nac-id="ghost"]', extract: 'attribute:value' },
        /* third: the one that wins */
        { backend: 'sdk-call', path: 'testApp.selection', mode: 'read' },
      ],
    },
    events: {},
  });

  const winnerVal = await NAC.read('chaintest', 'priority');
  assert('fallback chain returns first source that resolves',
    winnerVal && JSON.stringify(winnerVal) === JSON.stringify({ nodes: [1, 2, 3] }));

  /* Every binding fails -> state_unreadable + err.attempts populated. */
  NAC.registerPlugin('alldead', {
    slug: 'alldead',
    verbs: {},
    state: {
      'p': [
        { backend: 'sdk-call', path: 'nope.nope.nope', mode: 'read' },
        { backend: 'dom-mirror', selector: '[data-nac-id="ghost-2"]', extract: 'attribute:value' },
      ],
    },
    events: {},
  });

  let unreadable = null;
  try { await NAC.read('alldead', 'p'); }
  catch (e) { unreadable = e; }
  assert('all-fail state -> state_unreadable',
    unreadable && unreadable.code === 'state_unreadable',
    '(got ' + (unreadable && unreadable.code) + ')');
  assert('state_unreadable err.attempts has 2 entries',
    unreadable && Array.isArray(unreadable.attempts) && unreadable.attempts.length === 2,
    '(got ' + (unreadable && (unreadable.attempts ? unreadable.attempts.length : 'no attempts')) + ')');
  assert('attempts carry backend identifier',
    unreadable && unreadable.attempts &&
    unreadable.attempts[0].backend === 'sdk-call' &&
    unreadable.attempts[1].backend === 'dom-mirror');

  /* ============== Sec 15.7 -- provenance ============== */

  const invokedBefore = provenance.invoked.length;
  await NAC.call('sdktest', 'select.set', { nodes: [9] });
  assert('NAC.call emitted nac:plugin:invoked',
    provenance.invoked.length === invokedBefore + 1);
  const lastInvoked = provenance.invoked[provenance.invoked.length - 1];
  assert('nac:plugin:invoked detail has plugin field',
    lastInvoked && lastInvoked.plugin === 'sdktest');
  assert('nac:plugin:invoked detail has verb_path field',
    lastInvoked && lastInvoked.verb_path === 'select.set');
  assert('nac:plugin:invoked detail has backend field',
    lastInvoked && lastInvoked.backend === 'sdk-call');
  assert('nac:plugin:invoked detail has request_id',
    lastInvoked && typeof lastInvoked.request_id === 'string' && lastInvoked.request_id.length > 0);
  assert('nac:plugin:invoked detail has ok:true',
    lastInvoked && lastInvoked.ok === true);

  const readBefore = provenance.read.length;
  await NAC.read('sdktest', 'selection.current');
  assert('NAC.read emitted nac:plugin:read',
    provenance.read.length === readBefore + 1);
  const lastRead = provenance.read[provenance.read.length - 1];
  assert('nac:plugin:read detail has plugin + state_path',
    lastRead && lastRead.plugin === 'sdktest' && lastRead.state_path === 'selection.current');
  assert('nac:plugin:read detail has backend that won the chain',
    lastRead && lastRead.backend === 'sdk-call');

  /* Provenance even on failed calls: ok:false + error populated. */
  const invokedFailBefore = provenance.invoked.length;
  try { await NAC.call('sdktest', 'no.such.verb'); } catch (_) {}
  assert('provenance still emitted on failed call',
    provenance.invoked.length === invokedFailBefore + 1);
  const lastFail = provenance.invoked[provenance.invoked.length - 1];
  assert('failed-call provenance ok:false',
    lastFail && lastFail.ok === false);
  assert('failed-call provenance carries error',
    lastFail && typeof lastFail.error === 'string' && lastFail.error.length > 0);

  /* ============== Sec 15.4 -- postmessage backend (verb) ============== */

  const iframeA = makeIframe(
    { 'data-collabora-frame': '1', id: 'frameA' },
    { app: { selection: { isBold: false } } }
  );
  body.appendChild(iframeA);

  NAC.registerPlugin('collabora_a', {
    slug: 'collabora_a',
    verbs: {
      'uno.Bold': {
        backend: 'postmessage',
        target:  'iframe[data-collabora-frame="1"]',
        message: 'Send_UNO_Command',
        values:  { Command: '.uno:Bold' },
      },
      'doc.save': {
        backend: 'postmessage',
        target:  'iframe[data-collabora-frame="1"]',
        message: 'Action_Save',
        values_from_args: ['DontTerminateEdit', 'Notify'],
      },
      'noframe': {
        backend: 'postmessage',
        target:  'iframe[data-nonexistent="x"]',
        message: 'NoOp',
      },
    },
    state: {
      'selection.isBold.so': [
        { backend: 'same-origin-window',
          target:  'iframe[data-collabora-frame="1"]',
          path:    'app.selection.isBold' },
      ],
    },
    events: {
      'doc.modified': {
        backend: 'postmessage-listen',
        source:  'iframe[data-collabora-frame="1"]',
        message: 'Doc_ModifiedStatus',
        extract: 'Values.Modified',
      },
    },
  });

  /* postmessage: verb dispatches and the iframe captures the message. */
  await NAC.call('collabora_a', 'uno.Bold');
  const sent = iframeA.contentWindow.postedMessages[iframeA.contentWindow.postedMessages.length - 1];
  assert('postmessage verb posted to iframe', sent != null);
  assert('postmessage message id correct',
    sent && sent.msg && sent.msg.MessageId === 'Send_UNO_Command');
  assert('postmessage values include Command literal',
    sent && sent.msg && sent.msg.Values && sent.msg.Values.Command === '.uno:Bold');

  /* values_from_args: forward args verbatim into Values. */
  await NAC.call('collabora_a', 'doc.save',
    { DontTerminateEdit: true, Notify: false, Ignored: 'x' });
  const sent2 = iframeA.contentWindow.postedMessages[iframeA.contentWindow.postedMessages.length - 1];
  assert('postmessage values_from_args forwards declared keys only',
    sent2 && sent2.msg.Values && sent2.msg.Values.DontTerminateEdit === true
    && sent2.msg.Values.Notify === false
    && sent2.msg.Values.Ignored === undefined);

  await expectReject('postmessage with missing iframe -> backend_target_missing',
    () => NAC.call('collabora_a', 'noframe'),
    'backend_target_missing');

  /* ============== Sec 15.4 -- same-origin-window backend (state) ============== */

  const soVal = await NAC.read('collabora_a', 'selection.isBold.so');
  assert('same-origin-window reads contentWindow path',
    soVal === false);

  iframeA.contentWindow.app.selection.isBold = true;
  const soVal2 = await NAC.read('collabora_a', 'selection.isBold.so');
  assert('same-origin-window reflects live state changes',
    soVal2 === true);

  /* Cross-origin iframe -> cross_origin_blocked surfaces as state attempt
     failure. With only one binding in the chain, read rejects with
     state_unreadable whose attempts carry cross_origin_blocked. */
  const iframeX = makeIframe(
    { 'data-cross': '1', id: 'frameX' },
    { crossOrigin: true, app: { x: 1 } }
  );
  body.appendChild(iframeX);
  NAC.registerPlugin('xo', {
    slug: 'xo',
    verbs: {},
    state: {
      'x': [
        { backend: 'same-origin-window',
          target:  'iframe[data-cross="1"]',
          path:    'app.x' },
      ],
    },
    events: {},
  });
  let xoErr = null;
  try { await NAC.read('xo', 'x'); } catch (e) { xoErr = e; }
  assert('cross-origin same-origin-window -> state_unreadable',
    xoErr && xoErr.code === 'state_unreadable');
  assert('cross-origin attempt reason mentions cross_origin_blocked',
    xoErr && xoErr.attempts && xoErr.attempts[0] &&
    /cross[_ ]?origin/i.test(xoErr.attempts[0].reason));

  /* ============== Sec 15.4 -- postmessage-listen + subscribe (event) ============== */

  let modCount = 0;
  let lastMod = null;
  const sub = NAC.subscribe('collabora_a', 'doc.modified', (data) => {
    modCount++;
    lastMod = data;
  });
  assert('subscribe returns a handle', sub && typeof sub === 'object');

  /* Synthetic incoming message: matches the configured MessageId. */
  postFromIframe(iframeA, { MessageId: 'Doc_ModifiedStatus', Values: { Modified: true } });
  assert('postmessage-listen cb fired on matching MessageId', modCount === 1);
  assert('extracted value reaches cb', lastMod === true);

  /* A different MessageId on the same source must NOT fire. */
  postFromIframe(iframeA, { MessageId: 'Something_Else', Values: { Modified: false } });
  assert('postmessage-listen ignores unrelated MessageId', modCount === 1);

  /* A matching MessageId from a DIFFERENT source must NOT fire. */
  const iframeB = makeIframe({ 'data-other': '1' }, {});
  body.appendChild(iframeB);
  postFromIframe(iframeB, { MessageId: 'Doc_ModifiedStatus', Values: { Modified: true } });
  assert('postmessage-listen filters by source iframe', modCount === 1);

  /* unsubscribe -> further messages are ignored. */
  NAC.unsubscribe(sub);
  postFromIframe(iframeA, { MessageId: 'Doc_ModifiedStatus', Values: { Modified: false } });
  assert('unsubscribe stops the cb', modCount === 1);

  /* nac:plugin:event provenance emitted per cb fire. */
  assert('nac:plugin:event provenance has >=1 entry', provenance.event.length >= 1);
  const lastEv = provenance.event[provenance.event.length - 1];
  assert('event provenance carries plugin + event_path',
    lastEv && lastEv.plugin === 'collabora_a' && lastEv.event_path === 'doc.modified');

  /* ============== Sec 15.4 -- script-bridge backend (state, with response) ============== */

  /* The script-bridge backend posts CallPythonScript and resolves
     when a CallPythonScript-Result message arrives whose request
     correlation matches. For testing we use the MessageId match as
     the correlation (the runtime should consume the first matching
     response and ignore later ones in the same call). */

  NAC.registerPlugin('collabora_b', {
    slug: 'collabora_b',
    verbs: {},
    state: {
      'selection.isBold.sb': [
        { backend: 'script-bridge',
          target:  'iframe[data-collabora-frame="1"]',
          bridge:  'collabora.python',
          message: 'CallPythonScript',
          values: {
            ScriptFile: 'yujin_state.py',
            Function:   'GetSelectionState',
          },
          response_match: 'CallPythonScript-Result',
          extract:        'Values.is_bold',
          timeout_ms:     800 },
      ],
    },
    events: {},
  });

  /* Wire a simulator: when the iframe sees the request, post a response. */
  const origPost = iframeA.contentWindow.postMessage.bind(iframeA.contentWindow);
  iframeA.contentWindow.postMessage = function (msg, origin) {
    origPost(msg, origin);
    if (msg && msg.MessageId === 'CallPythonScript') {
      setTimeout(() => {
        postFromIframe(iframeA, { MessageId: 'CallPythonScript-Result',
          Values: { is_bold: true } });
      }, 20);
    }
  };

  const sbVal = await NAC.read('collabora_b', 'selection.isBold.sb');
  assert('script-bridge resolves with extracted value from response', sbVal === true);

  /* Timeout case: stop responding to scripts, wait for timeout. */
  iframeA.contentWindow.postMessage = origPost;
  let sbErr = null;
  try { await NAC.read('collabora_b', 'selection.isBold.sb'); }
  catch (e) { sbErr = e; }
  assert('script-bridge with no response -> state_unreadable',
    sbErr && sbErr.code === 'state_unreadable');
  assert('script-bridge attempt reason mentions timeout',
    sbErr && sbErr.attempts && /timeout/i.test(sbErr.attempts[0].reason));

  /* ============== Sec 15.4 -- synthetic-poll backend (event) ============== */
  /* Observes one or more state paths via NAC.read on a setInterval
     cadence. When any observed value changes vs cached snapshot, fires
     the user cb with the new snapshot. No mutation-observer dependency
     so this works in any environment where setInterval works. */

  sandbox.window.pollCounter = 1;
  sandbox.window.pollLabel   = 'A';

  NAC.registerPlugin('poll_test', {
    slug: 'poll_test',
    verbs: {},
    state: {
      'counter': [ { backend: 'sdk-call', path: 'pollCounter', mode: 'read' } ],
      'label':   [ { backend: 'sdk-call', path: 'pollLabel',   mode: 'read' } ],
    },
    events: {
      'state.changed': {
        backend:     'synthetic-poll',
        observe:     ['counter', 'label'],
        interval_ms: 30,
      },
    },
  });

  let polledFires = 0;
  let lastPolled = null;
  const pollSub = NAC.subscribe('poll_test', 'state.changed', function (snap) {
    polledFires++;
    lastPolled = snap;
  });
  assert('synthetic-poll subscribe returned handle', pollSub && pollSub.backend === 'synthetic-poll');

  /* No change yet -> no fire after a couple ticks. */
  await new Promise(function (r) { setTimeout(r, 90); });
  assert('synthetic-poll silent when nothing changed', polledFires === 0);

  /* Mutate one observed source -> at least one fire within ~120ms. */
  sandbox.window.pollCounter = 2;
  await new Promise(function (r) { setTimeout(r, 120); });
  assert('synthetic-poll fired after change', polledFires >= 1);
  assert('synthetic-poll snapshot has new counter value',
    lastPolled && lastPolled.counter === 2);
  assert('synthetic-poll snapshot includes both observed paths',
    lastPolled && lastPolled.label === 'A');

  /* Second mutation -> additional fire. */
  const beforeSecond = polledFires;
  sandbox.window.pollLabel = 'B';
  await new Promise(function (r) { setTimeout(r, 120); });
  assert('synthetic-poll fired again on second change',
    polledFires > beforeSecond);
  assert('synthetic-poll cached + emitted new label',
    lastPolled && lastPolled.label === 'B');

  /* Unsubscribe -> further changes do nothing. */
  NAC.unsubscribe(pollSub);
  const beforeUnsub = polledFires;
  sandbox.window.pollCounter = 99;
  await new Promise(function (r) { setTimeout(r, 120); });
  assert('synthetic-poll stopped after unsubscribe',
    polledFires === beforeUnsub);

  /* Provenance: synthetic-poll fires nac:plugin:event per dispatch. */
  const lastEvent = provenance.event[provenance.event.length - 1];
  assert('synthetic-poll provenance is nac:plugin:event',
    lastEvent && lastEvent.event_path === 'state.changed' && lastEvent.backend === 'synthetic-poll');

  /* ============== Sec 15.4 -- synthetic-mutation backend (event) ============== */
  /* Observes dom-mirror state paths via MutationObserver. Throttled,
     re-snapshots all observed paths, fires cb when any value changed.
     Requires every observed path's primary binding to be dom-mirror;
     mixing backends rejects at subscribe time. */

  const counterEl = new FakeNode('span');
  counterEl.setAttribute('data-nac-id', 'mut.counter');
  counterEl.textContent = '0';
  body.appendChild(counterEl);

  const labelEl = new FakeNode('span');
  labelEl.setAttribute('data-nac-id', 'mut.label');
  labelEl.textContent = 'A';
  body.appendChild(labelEl);

  NAC.registerPlugin('mut_test', {
    slug: 'mut_test',
    verbs: {},
    state: {
      'counter': [ { backend: 'dom-mirror', selector: '[data-nac-id="mut.counter"]', extract: 'text' } ],
      'label':   [ { backend: 'dom-mirror', selector: '[data-nac-id="mut.label"]',   extract: 'text' } ],
    },
    events: {
      'visible.changed': {
        backend:     'synthetic-mutation',
        observe:     ['counter', 'label'],
        throttle_ms: 5,
      },
    },
  });

  let mutFires = 0;
  let lastMut = null;
  const mutSub = NAC.subscribe('mut_test', 'visible.changed', function (snap) {
    mutFires++;
    lastMut = snap;
  });
  /* Give the priming snapshot a microtask to settle. */
  await new Promise(function (r) { setTimeout(r, 10); });
  assert('synthetic-mutation silent before mutations', mutFires === 0);

  /* Mutate one element + trigger MutationObserver. */
  counterEl.textContent = '1';
  fireMutation(counterEl);
  await new Promise(function (r) { setTimeout(r, 30); });
  assert('synthetic-mutation fired after DOM mutation', mutFires === 1);
  assert('cb received new counter value', lastMut && lastMut.counter === '1');
  assert('cb snapshot includes both observed paths', lastMut && lastMut.label === 'A');

  /* Mutate second element. */
  labelEl.textContent = 'Z';
  fireMutation(labelEl);
  await new Promise(function (r) { setTimeout(r, 30); });
  assert('synthetic-mutation fired again on second mutation', mutFires === 2);
  assert('cb saw updated label', lastMut && lastMut.label === 'Z');

  /* unsubscribe -> further mutations no-op. */
  NAC.unsubscribe(mutSub);
  counterEl.textContent = '999';
  fireMutation(counterEl);
  await new Promise(function (r) { setTimeout(r, 30); });
  assert('synthetic-mutation stopped after unsubscribe', mutFires === 2);

  /* Reject manifest that mixes dom-mirror + sdk-call in observed paths. */
  sandbox.window.sdkVal = 1;
  NAC.registerPlugin('mut_mixed', {
    slug: 'mut_mixed',
    verbs: {},
    state: {
      'dom':  [ { backend: 'dom-mirror', selector: '[data-nac-id="mut.counter"]', extract: 'text' } ],
      'sdk':  [ { backend: 'sdk-call', path: 'sdkVal', mode: 'read' } ],
    },
    events: {
      'mixed.changed': {
        backend: 'synthetic-mutation',
        observe: ['dom', 'sdk'],
      },
    },
  });
  let mixedErr = null;
  try { NAC.subscribe('mut_mixed', 'mixed.changed', function () {}); }
  catch (e) { mixedErr = e; }
  assert('synthetic-mutation rejects non-dom-mirror observe paths',
    mixedErr && mixedErr.code === 'invalid',
    '(got ' + (mixedErr && mixedErr.code) + ')');

  /* Provenance for synthetic-mutation. */
  const mutEvents = provenance.event.filter(function (e) {
    return e.event_path === 'visible.changed' && e.backend === 'synthetic-mutation';
  });
  assert('synthetic-mutation provenance emitted >= 2 times', mutEvents.length >= 2);

  console.log('\n' + (failures === 0 ? 'STAGE-8 PASS' : 'STAGE-8 FAIL (' + failures + ')'));
  process.exit(failures === 0 ? 0 : 1);
})();
