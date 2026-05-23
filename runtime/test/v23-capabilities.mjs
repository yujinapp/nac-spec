/**
 * v2.3 F7 auth-aware capabilities tests.
 *
 * Verifies the manifest-declared `requires_capability` gate runs on
 * NAC.click and NAC.invoke before dispatch, rejecting with
 * code='capability_required' when the user's set does not contain
 * the required cap.
 *
 * Coverage:
 *   T1  setCapabilities replaces the set; userCapabilities() reads it.
 *   T2  grant/revoke incremental updates work.
 *   T3  NAC.click on action with requires_capability and missing cap
 *       -> rejects with code='capability_required'.
 *   T4  NAC.click on same action after grantCapability -> succeeds.
 *   T5  NAC.invoke on action with verb-level requires_capability
 *       -> rejects when cap missing.
 *   T6  NAC.invoke on action with element-level requires_capability
 *       (no verb-level override) -> rejects when cap missing.
 *   T7  Array requires_capability: OR semantics (any one match passes).
 *   T8  setCapabilities(null) clears the set.
 *   T9  setCapabilities throws on non-array non-string.
 *  T10  Action without requires_capability is unaffected (regression).
 */

import fs from 'node:fs';
import path from 'node:path';
import url  from 'node:url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const RUNTIME_PATH = path.resolve(__dirname, '..', '..', 'js', 'nac.js');

let failures = 0;
function assert(name, ok, detail) {
  if (ok) console.log('PASS', name);
  else { failures++; console.error('FAIL', name, detail || ''); }
}

/* Same minimal DOM shim as v23-invoke.mjs */
class FakeNode extends EventTarget {
  constructor(tag) {
    super();
    this.tagName = (tag || 'DIV').toUpperCase();
    this.children = [];
    this.attributes = {};
    this.textContent = '';
    this.classList = { add:()=>{}, remove:()=>{}, contains:()=>false, toggle:()=>{} };
    this.style = {};
    this.disabled = false;
    this.id = '';
    this.parentElement = null;
    this.nodeType = 1;
  }
  dispatchEvent(ev) {
    const r = super.dispatchEvent(ev);
    if (ev && ev.bubbles && this.parentElement) {
      try { this.parentElement.dispatchEvent(ev); } catch (_) {}
    } else if (ev && ev.bubbles && this !== fakeDocument && fakeDocument) {
      try { fakeDocument.dispatchEvent(ev); } catch (_) {}
    }
    return r;
  }
  setAttribute(k, v) { this.attributes[k] = String(v); }
  getAttribute(k)    { return Object.prototype.hasOwnProperty.call(this.attributes, k) ? this.attributes[k] : null; }
  hasAttribute(k)    { return Object.prototype.hasOwnProperty.call(this.attributes, k); }
  removeAttribute(k) { delete this.attributes[k]; }
  appendChild(c) { this.children.push(c); c.parentElement = this; return c; }
  closest(sel) {
    if (sel === '[data-nac-plugin]') {
      let cur = this;
      while (cur) {
        if (cur.attributes && cur.attributes['data-nac-plugin']) return cur;
        cur = cur.parentElement || null;
      }
      return null;
    }
    return null;
  }
  querySelectorAll(sel) {
    const out = [];
    if (sel === '*') {
      function walk(n) {
        if (!n || !n.children) return;
        for (const c of n.children) { out.push(c); walk(c); }
      }
      walk(this);
      return out;
    }
    const idSel = sel.match(/^\[data-nac-id="([^"]+)"\]$/);
    const allId = sel === '[data-nac-id]';
    const allPlugin = sel === '[data-nac-plugin]';
    function walk(n) {
      if (!n || !n.children) return;
      for (const c of n.children) {
        if ((idSel && c.getAttribute && c.getAttribute('data-nac-id') === idSel[1]) ||
            (allId && c.getAttribute && c.getAttribute('data-nac-id')) ||
            (allPlugin && c.getAttribute && c.getAttribute('data-nac-plugin'))) {
          out.push(c);
        }
        walk(c);
      }
    }
    walk(this);
    return out;
  }
  querySelector(sel) { const r = this.querySelectorAll(sel); return r.length ? r[0] : null; }
  matches(sel) {
    if (!sel) return false;
    const attrEq = sel.match(/^\[([a-zA-Z0-9_-]+)="([^"]+)"\]$/);
    if (attrEq) return this.getAttribute(attrEq[1]) === attrEq[2];
    const attr = sel.match(/^\[([a-zA-Z0-9_-]+)\]$/);
    if (attr) return this.hasAttribute(attr[1]);
    return false;
  }
  getBoundingClientRect() { return { width: 100, height: 30, top: 0, left: 0, bottom: 30, right: 100 }; }
  click() { this.dispatchEvent(new CustomEvent('click', { bubbles: true })); }
}

class FakeDocument extends EventTarget {
  constructor() {
    super();
    this.body = new FakeNode('body');
    this.head = new FakeNode('head');
    this.documentElement = new FakeNode('html');
    this.documentElement.appendChild(this.head);
    this.documentElement.appendChild(this.body);
    this.readyState = 'complete';
    this.nodeType = 9;
  }
  createElement(tag) { return new FakeNode(tag); }
  querySelector(sel)    { return this.body.querySelector(sel); }
  querySelectorAll(sel) { return this.body.querySelectorAll(sel); }
  getElementById(id) {
    function walk(n) {
      if (!n || !n.children) return null;
      for (const c of n.children) {
        if (c.id === id) return c;
        const r = walk(c);
        if (r) return r;
      }
      return null;
    }
    return walk(this.body);
  }
}

const fakeDocument = new FakeDocument();
global.document = fakeDocument;
global.window = {
  document: fakeDocument,
  addEventListener:    (...a) => fakeDocument.addEventListener(...a),
  removeEventListener: (...a) => fakeDocument.removeEventListener(...a),
  dispatchEvent:       (e)    => fakeDocument.dispatchEvent(e),
  navigator: { userAgent: 'NodeFakeBrowser/1.0' },
  location:  { href: 'https://fake/', pathname: '/' },
};
global.CustomEvent = class extends Event {
  constructor(type, init) { super(type, init); this.detail = init && init.detail; }
};
global.HTMLElement = FakeNode;
global.Element     = FakeNode;
global.MutationObserver = class { observe(){} disconnect(){} takeRecords(){return [];} };

const src = fs.readFileSync(RUNTIME_PATH, 'utf8');
new Function(src)();
const NAC = global.window.NAC;
assert('NAC installed', !!NAC && typeof NAC === 'object');
assert('setCapabilities exists',  typeof NAC.setCapabilities  === 'function');
assert('grantCapability exists',  typeof NAC.grantCapability  === 'function');
assert('revokeCapability exists', typeof NAC.revokeCapability === 'function');
assert('userCapabilities exists', typeof NAC.userCapabilities === 'function');

/* Build mount + manifest with capabilities-bearing actions. */
const root = fakeDocument.createElement('div');
root.setAttribute('data-nac-plugin', 'fin');
fakeDocument.body.appendChild(root);

const invoiceBtn = fakeDocument.createElement('button');
invoiceBtn.setAttribute('data-nac-id', 'fin.invoice.delete');
invoiceBtn.setAttribute('data-nac-role', 'action');
invoiceBtn.setAttribute('data-nac-action', 'delete');
root.appendChild(invoiceBtn);

const editBtn = fakeDocument.createElement('button');
editBtn.setAttribute('data-nac-id', 'fin.invoice.edit_with_payload');
editBtn.setAttribute('data-nac-role', 'action');
editBtn.setAttribute('data-nac-action', 'edit');
root.appendChild(editBtn);

const orBtn = fakeDocument.createElement('button');
orBtn.setAttribute('data-nac-id', 'fin.invoice.approve');
orBtn.setAttribute('data-nac-role', 'action');
orBtn.setAttribute('data-nac-action', 'approve');
root.appendChild(orBtn);

const safeBtn = fakeDocument.createElement('button');
safeBtn.setAttribute('data-nac-id', 'fin.invoice.view');
safeBtn.setAttribute('data-nac-role', 'action');
safeBtn.setAttribute('data-nac-action', 'view');
root.appendChild(safeBtn);

/* Wire per-element click success listeners so each NAC.click can
   resolve through the canonical nac:action:succeeded path. We can't
   rely on document-level event.target because the FakeNode shim does
   not populate it when events bubble. */
function wireSuccess(btn) {
  btn.addEventListener('click', () => {
    fakeDocument.dispatchEvent(new CustomEvent('nac:action:succeeded', {
      detail: { plugin: 'fin', action_id: btn.getAttribute('data-nac-id') }
    }));
  });
}
wireSuccess(invoiceBtn);
wireSuccess(editBtn);
wireSuccess(orBtn);
wireSuccess(safeBtn);

fakeDocument.addEventListener('nac:action:requested', (ev) => {
  if (!ev || !ev.detail) return;
  setTimeout(() => {
    fakeDocument.dispatchEvent(new CustomEvent('nac:action:succeeded', {
      detail: {
        plugin:     ev.detail.plugin || 'fin',
        action_id:  ev.detail.action_id,
        request_id: ev.detail.request_id,
        verb:       ev.detail.verb,
      },
    }));
  }, 0);
});

NAC.register({
  plugin_slug: 'fin', version: '1.0.0', nac_version: '2.3',
  elements: [
    /* Element-level requires_capability (covers click + any verb). */
    { id: 'fin.invoice.delete', role: 'action',
      requires_capability: 'finance.delete_invoice',
      actions: [{ verb: 'delete' }] },
    /* Verb-level requires_capability. */
    { id: 'fin.invoice.edit_with_payload', role: 'action',
      actions: [
        { verb: 'edit', requires_capability: 'finance.edit_invoice' }
      ] },
    /* OR semantics: array of caps. */
    { id: 'fin.invoice.approve', role: 'action',
      requires_capability: ['finance.approve', 'finance.admin'],
      actions: [{ verb: 'approve' }] },
    /* No capability declared -- regression target. */
    { id: 'fin.invoice.view', role: 'action',
      actions: [{ verb: 'view' }] },
  ],
});

/* ---------- T1: set + read ---------- */
NAC.setCapabilities(['finance.view', 'finance.export']);
const caps1 = NAC.userCapabilities();
assert('T1 setCapabilities replaces set',
  caps1.length === 2 && caps1.includes('finance.view') && caps1.includes('finance.export'),
  JSON.stringify(caps1));

/* ---------- T2: grant / revoke ---------- */
NAC.grantCapability('finance.delete_invoice');
const caps2 = NAC.userCapabilities();
assert('T2 grantCapability adds', caps2.includes('finance.delete_invoice'));
NAC.revokeCapability('finance.delete_invoice');
const caps3 = NAC.userCapabilities();
assert('T2 revokeCapability removes', !caps3.includes('finance.delete_invoice'));

/* ---------- T3: click rejects on missing cap ---------- */
let t3_threw = null;
try {
  await NAC.click('fin.invoice.delete');
} catch (e) {
  t3_threw = e;
}
assert('T3 NAC.click rejects with capability_required',
  t3_threw && t3_threw.code === 'capability_required',
  t3_threw ? ('got code=' + t3_threw.code) : 'no throw');

/* ---------- T4: click succeeds after grant ---------- */
NAC.grantCapability('finance.delete_invoice');
let t4_ok = false;
try {
  await NAC.click('fin.invoice.delete');
  t4_ok = true;
} catch (e) {
  t4_ok = false;
}
assert('T4 NAC.click resolves after grantCapability', t4_ok);

/* ---------- T5: invoke verb-level cap missing ---------- */
NAC.setCapabilities([]);
let t5_threw = null;
try {
  await NAC.invoke('fin.invoice.edit_with_payload',
    { verb: 'edit', text: 'pay later' });
} catch (e) {
  t5_threw = e;
}
assert('T5 NAC.invoke verb-level cap gate rejects',
  t5_threw && t5_threw.code === 'capability_required');

/* ---------- T6: invoke element-level cap fallback ---------- */
let t6_threw = null;
try {
  await NAC.invoke('fin.invoice.delete', { verb: 'delete' });
} catch (e) {
  t6_threw = e;
}
assert('T6 NAC.invoke element-level cap gate rejects',
  t6_threw && t6_threw.code === 'capability_required');

/* ---------- T7: OR semantics ---------- */
NAC.setCapabilities([]);
let t7a_threw = null;
try { await NAC.click('fin.invoice.approve'); } catch (e) { t7a_threw = e; }
assert('T7 approve rejects with neither cap',
  t7a_threw && t7a_threw.code === 'capability_required');

NAC.grantCapability('finance.admin');
let t7b_ok = false;
try { await NAC.click('fin.invoice.approve'); t7b_ok = true; } catch (_) {}
assert('T7 approve passes when ONE of the OR caps is granted', t7b_ok);

/* ---------- T8: setCapabilities(null) clears ---------- */
NAC.setCapabilities(null);
assert('T8 setCapabilities(null) clears set',
  NAC.userCapabilities().length === 0);

/* ---------- T9: invalid input rejected ---------- */
let t9_threw = null;
try { NAC.setCapabilities(123); } catch (e) { t9_threw = e; }
assert('T9 setCapabilities throws on non-array non-string',
  t9_threw && t9_threw.code === 'invalid');

/* ---------- T10: unguarded actions unaffected ---------- */
NAC.setCapabilities([]);
let t10_ok = false;
try { await NAC.click('fin.invoice.view'); t10_ok = true; } catch (_) {}
assert('T10 actions without requires_capability still work',
  t10_ok, 'view should not be gated');

if (failures === 0) {
  console.log('\nV23-CAPABILITIES PASS (all)');
  process.exit(0);
} else {
  console.error('\nV23-CAPABILITIES FAIL (' + failures + ')');
  process.exit(1);
}
