/* stage7-strict-resolution.mjs -- H1.v7: NAC strict-resolution invariants.
 *
 * Verifies the 0-silent-damage contract on id/verb/qualifier/label
 * resolution. After H1.v7 the runtime MUST:
 *   - throw no_matching_instance when an id/qualifier has no exact
 *     or anchored-suffix match in DOM
 *   - throw ambiguous_qualifier / ambiguous_tab / ambiguous_label
 *     when multiple candidates satisfy the same query
 *   - emit nac:disambiguation_requested AND attach err.candidates
 *     so reactive hosts can present options ("did you mean A or B?")
 *
 * Motivation: NAC is used by disabled users (children with motor /
 * cognitive disabilities) via voice + assistive software. A silent
 * dispatch to the wrong element + no recovery path is the failure
 * mode the protocol forbids. The structured candidate list is what
 * lets the agent re-prompt instead of giving up.
 *
 * Uses the same shim pattern as stage2-disambiguation.mjs (FakeNode +
 * Function-eval the bundle) so no extra deps.
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

/* ---------- Minimal browser shim (subset of stage2 pattern) ---------- */

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
      add: (c) => { const set = new Set((self.attributes.class || '').split(/\s+/).filter(Boolean)); set.add(c); self.attributes.class = [...set].join(' '); },
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
  matches(sel) {
    /* CSV-of-selectors form supported. Used by runtime _focusElement. */
    return String(sel).split(',').some(s => _matches(this, s.trim()));
  }
  click() {
    /* Native EventTarget validates: must be a real Event instance. */
    try { this.dispatchEvent(new Event('click', { bubbles: true })); }
    catch (_) { /* no-op if Event unavailable */ }
    this._clicked = true;
  }
  focus() { this._focused = true; }
  getBoundingClientRect() { return { width: 100, height: 30, top: 0, left: 0, right: 100, bottom: 30 }; }
}
function _matches(node, sel) {
  /* Tiny matcher: supports [attr], [attr="v"], [attr$="v"], tag, and combos. */
  let rest = sel.trim();
  while (rest.length) {
    if (rest[0] === '[') {
      const end = rest.indexOf(']');
      const inner = rest.slice(1, end);
      const eq = inner.indexOf('=');
      if (eq < 0) { if (!node.attributes.hasOwnProperty(inner)) return false; }
      else {
        const attr = inner.slice(0, eq).replace(/[$*]$/, '');
        const opChar = inner[eq - 1];
        const val = inner.slice(eq + 1).replace(/^"|"$/g, '');
        const av = node.getAttribute(attr);
        if (av == null) return false;
        if (opChar === '$') { if (!av.endsWith(val)) return false; }
        else if (opChar === '*') { if (av.indexOf(val) < 0) return false; }
        else if (av !== val) return false;
      }
      rest = rest.slice(end + 1).trim();
    } else if (rest.length) {
      /* tagName or remainder */
      const m = rest.match(/^([a-z][a-z0-9-]*)/i);
      if (m) {
        if (node.tagName !== m[1].toUpperCase()) return false;
        rest = rest.slice(m[1].length).trim();
      } else { return false; }
    }
  }
  return true;
}
function _walk(root, sel) {
  const out = [];
  function visit(n) {
    if (_matches(n, sel)) out.push(n);
    for (const c of n.children) visit(c);
  }
  for (const c of root.children) visit(c);
  return out;
}

const doc = new FakeNode('html');
const body = new FakeNode('body');
const head = new FakeNode('head');
body.setAttribute('data-nac-plugin', 'strict_test');
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

function makeEl(tag, attrs, text) {
  const e = new FakeNode(tag);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  if (text) { e.textContent = text; e._innerText = text; }
  return e;
}

/* Setup: 2 delete buttons w/ distinct __slug, 2 archive buttons w/ same __shared,
   2 feed tabs w/ same __ prefix, 1 unique tab. */
body.appendChild(makeEl('button', { 'data-nac-id': 'strict_test.action.delete__slug-1', 'data-nac-role': 'action', 'data-nac-action': 'delete' }, 'd1'));
body.appendChild(makeEl('button', { 'data-nac-id': 'strict_test.action.delete__slug-2', 'data-nac-role': 'action', 'data-nac-action': 'delete' }, 'd2'));
body.appendChild(makeEl('button', { 'data-nac-id': 'strict_test.action.archive__shared', 'data-nac-role': 'action', 'data-nac-action': 'archive' }, 'a1'));
body.appendChild(makeEl('button', { 'data-nac-id': 'strict_test.action.purge__shared',   'data-nac-role': 'action', 'data-nac-action': 'archive' }, 'a2'));
body.appendChild(makeEl('button', { 'data-nac-id': 'strict_test.tab.feed__home',   'data-nac-role': 'tab' }, 'Home Feed'));
body.appendChild(makeEl('button', { 'data-nac-id': 'strict_test.tab.feed__global', 'data-nac-role': 'tab' }, 'Global Feed'));
body.appendChild(makeEl('button', { 'data-nac-id': 'strict_test.tab.settings',     'data-nac-role': 'tab' }, 'Settings'));

const disambiguationEvents = [];
doc.addEventListener('nac:disambiguation_requested', function (e) {
  disambiguationEvents.push(e.detail || e);
});

/* Use Node's native CustomEvent (Node >=19) so dispatchEvent on the
   real EventTarget base of FakeNode accepts the instance. */
const sandbox = {
  window: {},
  document: doc,
  CustomEvent: globalThis.CustomEvent,
  console,
  setTimeout, clearTimeout, setInterval, clearInterval,
  Promise,
};
sandbox.window.document = doc;

const nacSrc = fs.readFileSync(NAC_PATH, 'utf-8');
new Function('window', 'document', 'CustomEvent', 'console', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Promise', nacSrc)
  (sandbox.window, sandbox.document, sandbox.CustomEvent, console, setTimeout, clearTimeout, setInterval, clearInterval, Promise);

const NAC = sandbox.window.NAC;
if (!NAC) { console.error('NAC failed to load'); process.exit(1); }
NAC.register('strict_test', {
  plugin_slug: 'strict_test',
  elements: [
    { id: 'strict_test.action.delete', role: 'action', actions: [{ verb: 'delete' }] },
    { id: 'strict_test.action.archive', role: 'action', actions: [{ verb: 'archive' }] },
    { id: 'strict_test.tab.feed', role: 'tab' },
    { id: 'strict_test.tab.settings', role: 'tab' },
  ],
});

/* bindAction on each test button so NAC.click_by_verb resolves
   instead of timing out at 5s waiting for nac:action:succeeded.
   This is what a real host would do (or what the v2.3 editor flow
   does automatically). Without it, the action verb has no success
   emitter wired and the runtime correctly waits forever. */
for (const btn of body.children) {
  const id = btn.getAttribute('data-nac-id') || '';
  const role = btn.getAttribute('data-nac-role') || '';
  if (role === 'action') {
    NAC.bindAction(btn, () => undefined, {
      plugin: 'strict_test',
      action_id: id,
    });
  }
}

async function expectThrow(name, fn, errCode, expectCandidatesCount) {
  let thrown = null;
  try { await fn(); }
  catch (e) { thrown = e; }
  if (!thrown) { assert(name + ' (threw)', false, 'no throw'); return; }
  assert(name + ' threw ' + thrown.code, thrown.code === errCode,
    '(want ' + errCode + ' got ' + thrown.code + ': ' + thrown.message + ')');
  if (expectCandidatesCount !== undefined) {
    const c = Array.isArray(thrown.candidates) ? thrown.candidates.length : -1;
    assert(name + ' err.candidates.length=' + c, c === expectCandidatesCount,
      '(want ' + expectCandidatesCount + ' got ' + c + ')');
    if (Array.isArray(thrown.candidates)) {
      const allHaveId = thrown.candidates.every(function (k) { return k && typeof k.nac_id === 'string'; });
      assert(name + ' err.candidates all have nac_id', allHaveId, JSON.stringify(thrown.candidates).slice(0, 200));
    }
  }
}

await (async () => {
  /* S1: exact-anchored qualifier resolves. */
  await NAC.click_by_verb('strict_test', 'delete', { qualifier: 'slug-1' });
  const clickedDelete1 = body.children.find(c => c.getAttribute('data-nac-id') === 'strict_test.action.delete__slug-1');
  assert('S1 exact-anchored qualifier resolves to slug-1', clickedDelete1 && clickedDelete1._clicked === true);

  /* S2: qualifier that's a substring but no __suffix anchor must throw. */
  await expectThrow('S2 qualifier substring "slug" (no exact suffix)',
    () => NAC.click_by_verb('strict_test', 'delete', { qualifier: 'slug' }),
    'no_matching_instance', 2);

  /* S3: qualifier matches multiple by exact suffix -> ambiguous. */
  await expectThrow('S3 qualifier "shared" matches 2 archive elements',
    () => NAC.click_by_verb('strict_test', 'archive', { qualifier: 'shared' }),
    'ambiguous_qualifier', 2);

  /* S4: tab single-arg with exact id resolves. */
  await NAC.tab('strict_test.tab.settings');
  const settings = body.children.find(c => c.getAttribute('data-nac-id') === 'strict_test.tab.settings');
  assert('S4 tab single-arg exact match resolves', settings && settings._clicked === true);

  /* S5: tab single-arg with bare id that has 2 __ qualified instances -> ambiguous. */
  await expectThrow('S5 tab bare id with 2 qualified instances',
    () => NAC.tab('strict_test.tab.feed'),
    'ambiguous_tab', 2);

  /* S6: tab single-arg with id not in DOM and no instances -> no_matching. */
  await expectThrow('S6 tab bare id with no instances',
    () => NAC.tab('strict_test.tab.nonexistent'),
    'no_matching_instance');

  /* S7: nac:disambiguation_requested events were emitted alongside each throw.
     S2/S3/S5/S6 = 4 throws, 1 event per throw. Coverage of the 4th NacError
     code `ambiguous_label` lives in stage2-disambiguation.mjs (tab_by_label
     suite). */
  const reasons = disambiguationEvents.map(e => e.reason);
  assert('S7 disambiguation events emitted (4)',
    disambiguationEvents.length === 4, 'got ' + disambiguationEvents.length + ': ' + reasons.join(','));
  assert('S7 reasons include no_matching_instance + ambiguous_qualifier + ambiguous_tab',
    reasons.includes('no_matching_instance') && reasons.includes('ambiguous_qualifier') && reasons.includes('ambiguous_tab'),
    reasons.join(','));

  /* S8: each disambiguation event carries candidates with nac_id + label. */
  const allEventsHaveCandidates = disambiguationEvents.every(function (e) {
    return Array.isArray(e.candidates) && e.candidates.length > 0 &&
           e.candidates.every(function (c) { return typeof c.nac_id === 'string'; });
  });
  assert('S8 every disambiguation event has candidates[]', allEventsHaveCandidates);

  console.log('\n' + (failures === 0 ? 'STAGE-7 PASS' : 'STAGE-7 FAIL (' + failures + ')'));
  process.exit(failures === 0 ? 0 : 1);
})();
