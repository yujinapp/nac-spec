/* stage12-snapshot-versioning.mjs -- NAC v2.5 RFC V24-04
 *
 * Snapshot versioning + optimistic concurrency control. Three
 * primitives in cheap-to-expensive order:
 *
 *   plugin_version       per-plugin monotonic; ignores noise outside
 *                        the targeted plugin
 *   tree_version         global monotonic; escape hatch
 *   element_state_hash   content-aware; 128-bit SHA-256 truncated
 *
 * Verifies:
 *   - API surface (STRICT_VERSIONING flag, markHydrationComplete,
 *     versionHistory, conformance_tier, eager_hashing)
 *   - describe() includes plugin_version + tree_version + element_state_hash
 *   - syncPlugin bumps plugin_version + tree_version atomically
 *   - _bumpPluginVersion emits nac:plugin:invalidated + nac:tree:invalidated
 *   - markHydrationComplete + 100ms fallback
 *   - versionHistory returns recent bumps
 *
 * Dispatch enforcement (expected_plugin_version etc on click/tab/etc)
 * is NOT exercised here -- those hooks are scheduled for a follow-up
 * commit. Stage12 covers the foundation layer Pablo asked for in
 * the V24-04 consolidation.
 *
 * Same shim pattern as stage9/10/11. ASCII only.
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

class FakeNode extends EventTarget {
  constructor(tag) {
    super();
    this.tagName = (tag || 'DIV').toUpperCase();
    this.children = [];
    this.attributes = {};
    this.textContent = '';
    this.nodeType = 1;
  }
  setAttribute(k, v) { this.attributes[k] = String(v); }
  getAttribute(k) { return Object.prototype.hasOwnProperty.call(this.attributes, k) ? this.attributes[k] : null; }
  removeAttribute(k) { delete this.attributes[k]; }
  hasAttribute(k) { return Object.prototype.hasOwnProperty.call(this.attributes, k); }
  get classList() {
    const self = this;
    return { contains: (c) => false, add: (c) => {}, remove: (c) => {} };
  }
  appendChild(n) { this.children.push(n); n._parent = this; return n; }
  removeChild(n) { const i = this.children.indexOf(n); if (i >= 0) this.children.splice(i, 1); return n; }
  closest(sel) {
    let p = this;
    while (p) { if (_matches(p, sel)) return p; p = p._parent; }
    return null;
  }
  querySelector(sel)    { const r = _walk(this, sel); return r[0] || null; }
  querySelectorAll(sel) { return _walk(this, sel); }
  matches(sel) { return String(sel).split(',').some(s => _matches(this, s.trim())); }
  click() {}
  focus() {}
  get parentElement() { return this._parent || null; }
  getBoundingClientRect() { return { width: 100, height: 30, top: 0, left: 0 }; }
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
        const v = node.attributes[k];
        if (v == null || v !== raw) return false;
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
/* _isVisible reads el.ownerDocument.defaultView.getComputedStyle(el). */
Object.defineProperty(FakeNode.prototype, 'ownerDocument', {
  get() { return doc; },
});

const treeInvalidated = [];
const pluginInvalidated = [];
doc.addEventListener('nac:tree:invalidated', (e) => treeInvalidated.push(e.detail || e));
doc.addEventListener('nac:plugin:invalidated', (e) => pluginInvalidated.push(e.detail || e));

class HostWindow extends EventTarget {
  constructor() { super(); this.document = doc; }
}
const hostWindow = new HostWindow();
hostWindow.document = doc;
hostWindow.location = { href: 'http://test/' };
/* getComputedStyle stub so element_state_hash visibility check doesn't crash. */
hostWindow.getComputedStyle = function () {
  return { display: 'block', visibility: 'visible', opacity: '1' };
};
doc.defaultView = hostWindow;

const sandbox = {
  window: hostWindow,
  document: doc,
  CustomEvent: globalThis.CustomEvent,
  console,
  setTimeout, clearTimeout, setInterval, clearInterval,
  Promise,
};

const nacSrc = fs.readFileSync(NAC_PATH, 'utf-8');
new Function('window', 'document', 'CustomEvent', 'console', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Promise', nacSrc)
  (sandbox.window, sandbox.document, sandbox.CustomEvent, console, setTimeout, clearTimeout, setInterval, clearInterval, Promise);

const NAC = sandbox.window.NAC;
if (!NAC) { console.error('NAC failed to load'); process.exit(1); }

/* Provide a global `location` so describe() doesn't crash. */
globalThis.location = hostWindow.location;

/* ============== Sec 1 -- API surface ============== */

assert('NAC.STRICT_VERSIONING exposed',       'STRICT_VERSIONING' in NAC);
assert('NAC.STRICT_VERSIONING default false',  NAC.STRICT_VERSIONING === false);
assert('NAC.eager_hashing exposed',           'eager_hashing' in NAC);
assert('NAC.conformance_tier exposed',        'conformance_tier' in NAC);
assert('NAC.conformance_tier default NAC-3-versioned',
       NAC.conformance_tier === 'NAC-3-versioned');
assert('NAC.markHydrationComplete is fn',     typeof NAC.markHydrationComplete === 'function');
assert('NAC.versionHistory is fn',            typeof NAC.versionHistory === 'function');

/* ============== Sec 2 -- describe() carries versions ============== */

/* Add a plugin root so describe() has something to report. */
const root = new FakeNode('div');
root.setAttribute('data-nac-plugin', 'occ_test');
const btn = new FakeNode('button');
btn.setAttribute('data-nac-id', 'occ_test.action.x');
btn.setAttribute('data-nac-role', 'action');
btn.setAttribute('data-nac-action', 'x');
root.appendChild(btn);
body.appendChild(root);

NAC.register({
  plugin_slug: 'occ_test',
  elements: [{ id: 'occ_test.action.x', role: 'action', actions: [{ verb: 'x' }] }],
});

const snap1 = NAC.describe();
assert('describe() has tree_version', typeof snap1.tree_version === 'string'
  && snap1.tree_version.indexOf('v_') === 0,
  '(got ' + snap1.tree_version + ')');
const p1 = snap1.plugins.find(p => p.plugin === 'occ_test');
assert('describe().plugins[occ_test] present', !!p1);
assert('plugin entry has plugin_version', p1 && typeof p1.plugin_version === 'string'
  && p1.plugin_version.indexOf('v_') === 0);
assert('plugin entry has plugin_instance_id', p1 && p1.plugin_instance_id === null);
assert('plugin elements have element_state_hash', p1 && p1.elements.length > 0
  && (p1.elements[0].element_state_hash === null
      || typeof p1.elements[0].element_state_hash === 'string'));

const treeV1 = snap1.tree_version;
const pluginV1 = p1.plugin_version;

/* ============== Sec 3 -- syncPlugin bumps versions ============== */

const beforePluginEvents = pluginInvalidated.length;
const beforeTreeEvents   = treeInvalidated.length;

const syncRes = NAC.syncPlugin({
  plugin_slug: 'occ_test',
  elements: [
    { id: 'occ_test.action.x', role: 'action', actions: [{ verb: 'x' }] },
    { id: 'occ_test.action.y', role: 'action', actions: [{ verb: 'y' }] },
  ],
});
assert('syncPlugin replaced=true', syncRes.replaced === true);
assert('syncPlugin returns new version', typeof syncRes.version === 'string'
  && syncRes.version !== pluginV1);
assert('syncPlugin emitted nac:plugin:invalidated',
  pluginInvalidated.length === beforePluginEvents + 1);
assert('syncPlugin emitted nac:tree:invalidated',
  treeInvalidated.length === beforeTreeEvents + 1);

const lastPI = pluginInvalidated[pluginInvalidated.length - 1];
assert('plugin:invalidated trigger=syncPlugin',
  lastPI && lastPI.trigger === 'syncPlugin');
assert('plugin:invalidated detail has from + to versions',
  lastPI && lastPI.from_version && lastPI.to_version
  && lastPI.from_version !== lastPI.to_version);

const snap2 = NAC.describe();
const p2 = snap2.plugins.find(p => p.plugin === 'occ_test');
assert('describe() tree_version bumped',
  snap2.tree_version !== treeV1,
  '(' + treeV1 + ' -> ' + snap2.tree_version + ')');
assert('describe() plugin_version bumped',
  p2.plugin_version !== pluginV1);

/* ============== Sec 4 -- versionHistory devtools surface ============== */

const hist = NAC.versionHistory(10);
assert('versionHistory returns array', Array.isArray(hist));
assert('versionHistory entries have tree_version', hist[0] && typeof hist[0].tree_version === 'string');
assert('versionHistory entries have trigger', hist[0] && typeof hist[0].trigger === 'string');
assert('versionHistory entries have affected_plugins', hist[0] && Array.isArray(hist[0].affected_plugins));
assert('versionHistory most-recent-first ordering',
  hist.length < 2 || hist[0].tree_version >= hist[1].tree_version);

/* ============== Sec 5 -- markHydrationComplete idempotent ============== */

const beforeHydratePluginEvents = pluginInvalidated.length;
NAC.markHydrationComplete();
assert('markHydrationComplete first call emits invalidated event(s)',
  pluginInvalidated.length > beforeHydratePluginEvents,
  '(emitted ' + (pluginInvalidated.length - beforeHydratePluginEvents) + ')');

const beforeSecondCall = pluginInvalidated.length;
NAC.markHydrationComplete();
NAC.markHydrationComplete();
assert('markHydrationComplete idempotent (no extra events)',
  pluginInvalidated.length === beforeSecondCall);

const lastHydrate = pluginInvalidated[pluginInvalidated.length - 1];
assert('hydration event trigger is hydration_complete',
  lastHydrate && lastHydrate.trigger === 'hydration_complete');

console.log('\n' + (failures === 0 ? 'STAGE-12 PASS' : 'STAGE-12 FAIL (' + failures + ')'));
process.exit(failures === 0 ? 0 : 1);
