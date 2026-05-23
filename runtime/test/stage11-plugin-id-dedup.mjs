/* stage11-plugin-id-dedup.mjs -- NAC v2.5 RFC V24-01
 *
 * Plugin slug uniqueness gate. When a plugin slug appears on more than
 * one DOM root simultaneously, every root MUST carry a unique
 * data-nac-plugin-id attribute. The runtime enforces this via:
 *
 *   - NAC.register throws NacError('duplicate_plugin_no_instance_id')
 *     synchronously when the DOM already contains multiple violating
 *     roots for the registered slug.
 *   - Boot-time pass on DOMContentLoaded runs the same check across
 *     EVERY slug. First violation -> dispatches nac:fatal + paints a
 *     visible red banner so the human sees it even with devtools
 *     closed. Re-throws asynchronously so test harnesses + browsers
 *     catch the error instead of silently swallowing.
 *   - validate_global continues to report 'duplicate_plugin_no_instance_id'
 *     as a structured finding for CI pipelines that prefer non-fatal
 *     reporting.
 *   - NAC.HARD_DEDUP=false migration flag: opts the host out of the
 *     fatal pass for one release window. validate_global still reports.
 *
 * Same shim pattern as stage9/10. ASCII only.
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
    return {
      contains: (c) => (self.attributes.class || '').split(/\s+/).includes(c),
      add: (c) => {},
      remove: (c) => {},
    };
  }
  appendChild(n) { this.children.push(n); n._parent = this; return n; }
  insertBefore(n, ref) { this.children.unshift(n); n._parent = this; return n; }
  removeChild(n) { const i = this.children.indexOf(n); if (i >= 0) this.children.splice(i, 1); return n; }
  closest(sel) {
    let p = this;
    while (p) { if (_matches(p, sel)) return p; p = p._parent; }
    return null;
  }
  querySelector(sel)    { const r = _walk(this, sel); return r[0] || null; }
  querySelectorAll(sel) { return _walk(this, sel); }
  matches(sel) { return String(sel).split(',').some(s => _matches(this, s.trim())); }
  click() { try { this.dispatchEvent(new Event('click', { bubbles: true })); } catch (_) {} }
  focus() {}
  get firstChild() { return this.children[0] || null; }
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
        if (v == null) return false;
        if (v !== raw) return false;
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

const fatalEvents = [];
doc.addEventListener('nac:fatal', (e) => fatalEvents.push(e.detail || e));

class HostWindow extends EventTarget {
  constructor() { super(); this.document = doc; }
}
const hostWindow = new HostWindow();
hostWindow.document = doc;

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

/* Make a root + child for a given plugin slug + optional instance id. */
function mkRoot(slug, instance_id) {
  const r = new FakeNode('div');
  r.setAttribute('data-nac-plugin', slug);
  if (instance_id) r.setAttribute('data-nac-plugin-id', instance_id);
  body.appendChild(r);
  return r;
}

assert('NAC.HARD_DEDUP exposed', 'HARD_DEDUP' in NAC);
assert('NAC.HARD_DEDUP defaults to true', NAC.HARD_DEDUP === true);

/* ============== single root: no instance_id required ============== */

const r1 = mkRoot('p_single');
let okSingle = true;
try {
  NAC.register({
    plugin_slug: 'p_single',
    elements: [{ id: 'p_single.action.x', role: 'action', actions: [{ verb: 'x' }] }],
  });
} catch (e) { okSingle = false; }
assert('single-root slug registers OK without data-nac-plugin-id', okSingle);

/* ============== two roots both with unique instance_id: OK ============== */

mkRoot('p_paired', 'a');
mkRoot('p_paired', 'b');
let okPaired = true;
try {
  NAC.register({
    plugin_slug: 'p_paired',
    elements: [{ id: 'p_paired.action.y', role: 'action', actions: [{ verb: 'y' }] }],
  });
} catch (e) { okPaired = false; }
assert('two roots with distinct data-nac-plugin-id register OK', okPaired);

/* ============== two roots one missing instance_id: THROW ============== */

mkRoot('p_missing_one', 'a');
mkRoot('p_missing_one'); /* no instance_id */
let missingErr = null;
try {
  NAC.register({
    plugin_slug: 'p_missing_one',
    elements: [{ id: 'p_missing_one.action.z', role: 'action', actions: [{ verb: 'z' }] }],
  });
} catch (e) { missingErr = e; }
assert('register throws when one of two roots lacks data-nac-plugin-id',
  missingErr && missingErr.code === 'duplicate_plugin_no_instance_id',
  '(got code=' + (missingErr && missingErr.code) + ')');
assert('thrown NacError carries slug',
  missingErr && missingErr.slug === 'p_missing_one');
assert('thrown NacError carries instance_count',
  missingErr && missingErr.instance_count === 2);
assert('thrown NacError carries missing_instance_id_count',
  missingErr && missingErr.missing_instance_id_count === 1);

/* ============== two roots same instance_id: THROW ============== */

mkRoot('p_dup_id', 'same');
mkRoot('p_dup_id', 'same');
let dupErr = null;
try {
  NAC.register({
    plugin_slug: 'p_dup_id',
    elements: [{ id: 'p_dup_id.action.q', role: 'action', actions: [{ verb: 'q' }] }],
  });
} catch (e) { dupErr = e; }
assert('register throws when two roots share data-nac-plugin-id',
  dupErr && dupErr.code === 'duplicate_plugin_no_instance_id');
assert('thrown NacError lists duplicate_instance_ids',
  dupErr && Array.isArray(dupErr.duplicate_instance_ids) &&
  dupErr.duplicate_instance_ids.includes('same'));

/* ============== validate_global still reports the violations ============== */

/* validate_global returns an OBJECT with a plugin_instance_violations
   array (introduced in v2.5 alongside the RFC V24-01 enforcement).
   This is the structured-finding channel for CI gates. */
const vg = NAC.validate_global ? NAC.validate_global() : {};
const piv = Array.isArray(vg.plugin_instance_violations) ? vg.plugin_instance_violations : [];
assert('validate_global.plugin_instance_violations reports duplicate_plugin_no_instance_id',
  piv.length >= 1 && piv.some(f => f.code === 'duplicate_plugin_no_instance_id'),
  '(got ' + piv.length + ' plugin_instance_violations)');

/* ============== HARD_DEDUP=false opts out of the throw ============== */

NAC.HARD_DEDUP = false;
/* Make a fresh slug with a violation. */
mkRoot('p_opt_out', 'x');
mkRoot('p_opt_out');
let optOutErr = null;
try {
  NAC.register({
    plugin_slug: 'p_opt_out',
    elements: [{ id: 'p_opt_out.action.w', role: 'action', actions: [{ verb: 'w' }] }],
  });
} catch (e) { optOutErr = e; }
assert('HARD_DEDUP=false skips the register-time throw',
  optOutErr === null || optOutErr.code !== 'duplicate_plugin_no_instance_id',
  '(got code=' + (optOutErr && optOutErr.code) + ')');

/* But validate_global STILL surfaces it (HARD_DEDUP gates only the
   register-time throw, not the CI-grade reporting). */
const vg2 = NAC.validate_global ? NAC.validate_global() : {};
const piv2 = Array.isArray(vg2.plugin_instance_violations) ? vg2.plugin_instance_violations : [];
const optOutDedupFinding = piv2.find(f =>
  f.code === 'duplicate_plugin_no_instance_id' && f.slug === 'p_opt_out');
assert('validate_global reports the violation even with HARD_DEDUP=false',
  !!optOutDedupFinding);

NAC.HARD_DEDUP = true; /* restore */

/* ============== invalid scope test: zero roots should not throw ============== */

let zeroRootsErr = null;
try {
  NAC.register({
    plugin_slug: 'p_no_dom_root',
    elements: [{ id: 'p_no_dom_root.action.k', role: 'action', actions: [{ verb: 'k' }] }],
  });
} catch (e) { zeroRootsErr = e; }
assert('register OK when no DOM root yet exists for the slug (deferred wiring)',
  zeroRootsErr === null || zeroRootsErr.code !== 'duplicate_plugin_no_instance_id');

console.log('\n' + (failures === 0 ? 'STAGE-11 PASS' : 'STAGE-11 FAIL (' + failures + ')'));
process.exit(failures === 0 ? 0 : 1);
