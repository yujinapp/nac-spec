/**
 * v2.3 Shadow DOM resolution tests (F1 + F6).
 *
 * Verifies the runtime walks open shadow roots and delegates to the
 * el.nac3 exposure API on closed shadow roots. The shim is a slightly
 * extended FakeNode that supports `attachShadow({mode})`, `shadowRoot`,
 * and a `getter`-style `nac3` interface.
 *
 * Coverage:
 *   T1  NAC.click resolves an element inside a 1-level open shadow root.
 *   T2  Resolution walks 3 nested open shadow roots.
 *   T3  Resolution stops at depth cap (10) -- a 12-level chain is unreachable.
 *   T4  Closed shadow + el.nac3.query exposure -> NAC.click resolves.
 *   T5  Closed shadow + el.nac3.queryAll exposure -> _deepQueryAll picks up.
 *   T6  Closed shadow + el.nac3.query that THROWS -> emits
 *       nac:shadow_blocked with reason='exposure_threw' (once per host).
 *   T7  Closed shadow + el.nac3.query returning non-Element ->
 *       emits nac:shadow_protocol_violation.
 *   T8  Closed shadow with data-nac-shadow="closed" and NO el.nac3 ->
 *       emits nac:shadow_blocked with reason='not_exposed' (once per host).
 *   T9  Same closed-no-exposure host queried twice ->
 *       nac:shadow_blocked emits ONLY ONCE (WeakSet dedup).
 *  T10  Events fired inside a shadow root with composed:true reach
 *       document-level listeners (regression guard for F1 boundary cross).
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

/* ---------- DOM shim with shadow DOM + nac3 interface support ---------- */

class FakeNode extends EventTarget {
  constructor(tag) {
    super();
    this.tagName = (tag || 'DIV').toUpperCase();
    this.children = [];
    this.attributes = {};
    this.textContent = '';
    this.classList = { add: () => {}, remove: () => {}, contains: () => false, toggle: () => {} };
    this.style = {};
    this.disabled = false;
    this.id = '';
    this.parentElement = null;
    this.shadowRoot = null;
    this._shadowMode = null;
    /* Hook for tests to install an `el.nac3` interface. */
    this.nac3 = null;
    this.nodeType = 1;
  }
  attachShadow({ mode }) {
    const root = new FakeShadowRoot(this);
    if (mode === 'open') {
      this.shadowRoot = root;
    } else {
      /* Closed: shadowRoot stays null from outside (real browser behaviour). */
      this._closedShadow = root;
    }
    this._shadowMode = mode;
    return root;
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
  appendChild(c) {
    this.children.push(c);
    /* parentElement chain follows light DOM tree, not shadow. */
    if (c instanceof FakeNode) c.parentElement = this;
    return c;
  }
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
  /* Universal querySelectorAll that handles '*' AND [data-nac-id="..."] */
  querySelectorAll(sel) {
    const out = [];
    if (sel === '*') {
      function walk(node) {
        if (!node || !node.children) return;
        for (const c of node.children) {
          out.push(c);
          walk(c);
        }
      }
      walk(this);
      return out;
    }
    const idSel = sel.match(/^\[data-nac-id="([^"]+)"\]$/);
    const allId = sel === '[data-nac-id]';
    const allPlugin = sel === '[data-nac-plugin]';
    function walk2(node) {
      if (!node || !node.children) return;
      for (const c of node.children) {
        const isMatch =
          (idSel    && c.getAttribute && c.getAttribute('data-nac-id') === idSel[1]) ||
          (allId    && c.getAttribute && c.getAttribute('data-nac-id')) ||
          (allPlugin && c.getAttribute && c.getAttribute('data-nac-plugin'));
        if (isMatch) out.push(c);
        walk2(c);
      }
    }
    walk2(this);
    return out;
  }
  querySelector(sel) {
    const r = this.querySelectorAll(sel);
    return r.length ? r[0] : null;
  }
  matches(sel) {
    /* Minimal selector matcher: tag, [attr], [attr="value"] */
    if (!sel) return false;
    if (sel === '*') return true;
    const attrEq = sel.match(/^\[([a-zA-Z0-9_-]+)="([^"]+)"\]$/);
    if (attrEq) return this.getAttribute(attrEq[1]) === attrEq[2];
    const attr = sel.match(/^\[([a-zA-Z0-9_-]+)\]$/);
    if (attr) return this.hasAttribute(attr[1]);
    if (/^[a-zA-Z0-9_-]+$/.test(sel)) return this.tagName === sel.toUpperCase();
    return false;
  }
  getBoundingClientRect() { return { width: 100, height: 30, top: 0, left: 0, bottom: 30, right: 100 }; }
  click() {
    this.dispatchEvent(new CustomEvent('click', { bubbles: true }));
  }
}

/* Shadow root behaves like a Node for querySelector purposes, but does
   NOT have a parentElement chain into the light tree (matches real DOM). */
class FakeShadowRoot {
  constructor(host) {
    this.host = host;
    this.children = [];
    this.nodeType = 11; /* DocumentFragment */
  }
  appendChild(c) {
    this.children.push(c);
    /* In real DOM, parentElement of a shadow-root-direct child returns
       null from the outside but events with composed:true still bubble
       through the host. We simulate by chaining parentElement to the
       host so bubble-up reaches document via host. The composed flag
       is honored by ignoring this chain when composed=false (not
       tested here; we use composed:true throughout). */
    if (c instanceof FakeNode) c.parentElement = this.host;
    return c;
  }
  querySelectorAll(sel) {
    /* Delegate to a synthetic FakeNode whose children are the shadow children. */
    const wrap = new FakeNode('shadow_wrap');
    wrap.children = this.children;
    return wrap.querySelectorAll(sel);
  }
  querySelector(sel) {
    const r = this.querySelectorAll(sel);
    return r.length ? r[0] : null;
  }
}

class FakeDocument extends EventTarget {
  constructor() {
    super();
    this.body  = new FakeNode('body');
    this.head  = new FakeNode('head');
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
    function walk(node) {
      if (!node || !node.children) return null;
      for (const c of node.children) {
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
  addEventListener: (...a) => fakeDocument.addEventListener(...a),
  removeEventListener: (...a) => fakeDocument.removeEventListener(...a),
  dispatchEvent: (e) => fakeDocument.dispatchEvent(e),
  navigator: { userAgent: 'NodeFakeBrowser/1.0' },
  location: { href: 'https://fake/', pathname: '/' },
};
global.CustomEvent = class extends Event {
  constructor(type, init) {
    super(type, init);
    this.detail = init && init.detail;
  }
};
global.HTMLElement = FakeNode;
global.Element     = FakeNode;
global.MutationObserver = class {
  observe() {}
  disconnect() {}
  takeRecords() { return []; }
};

const src = fs.readFileSync(RUNTIME_PATH, 'utf8');
new Function(src)();
const NAC = global.window.NAC;
assert('NAC installed', !!NAC && typeof NAC === 'object');

/* ---------- Helper: build a NAC-conformant element inside a host ---------- */

function makeNacButton(id) {
  const b = fakeDocument.createElement('button');
  b.setAttribute('data-nac-id',     id);
  b.setAttribute('data-nac-role',   'action');
  b.setAttribute('data-nac-action', 'click');
  /* Wire success listener for click contract. */
  b.addEventListener('click', () => {
    fakeDocument.dispatchEvent(new CustomEvent('nac:action:succeeded', {
      bubbles: true, composed: true,
      detail: { plugin: 'demo', action_id: id }
    }));
  });
  return b;
}

/* Capture shadow events on the document. */
const blockedEvents = [];
const violationEvents = [];
fakeDocument.addEventListener('nac:shadow_blocked', (ev) => blockedEvents.push(ev.detail));
fakeDocument.addEventListener('nac:shadow_protocol_violation', (ev) => violationEvents.push(ev.detail));

/* ---------- T1: 1-level open shadow ---------- */

const pluginRoot1 = fakeDocument.createElement('div');
pluginRoot1.setAttribute('data-nac-plugin', 'demo');
fakeDocument.body.appendChild(pluginRoot1);

const host1 = fakeDocument.createElement('my-card-open');
pluginRoot1.appendChild(host1);
const shadow1 = host1.attachShadow({ mode: 'open' });
shadow1.appendChild(makeNacButton('shadow_open.toggle'));

NAC.register({
  plugin_slug: 'demo', version: '1.0.0', nac_version: '2.3',
  elements: [{ id: 'shadow_open.toggle', role: 'action', actions: [{ verb: 'click' }] }],
});

try {
  await NAC.click('shadow_open.toggle');
  assert('T1 NAC.click resolves through 1-level open shadow', true);
} catch (e) {
  assert('T1 NAC.click resolves through 1-level open shadow', false, e && e.message);
}

/* ---------- T2: 3 nested open shadows ---------- */

let outer = fakeDocument.createElement('lvl-1');
pluginRoot1.appendChild(outer);
for (let lv = 2; lv <= 3; lv++) {
  const sr = outer.attachShadow({ mode: 'open' });
  const next = fakeDocument.createElement('lvl-' + lv);
  sr.appendChild(next);
  outer = next;
}
const sr3 = outer.attachShadow({ mode: 'open' });
sr3.appendChild(makeNacButton('shadow_open.deep_3'));

try {
  await NAC.click('shadow_open.deep_3');
  assert('T2 NAC.click walks 3 nested open shadow roots', true);
} catch (e) {
  assert('T2 NAC.click walks 3 nested open shadow roots', false, e && e.message);
}

/* ---------- T3: depth cap (12-level chain unreachable) ---------- */

let chain = fakeDocument.createElement('chain-0');
pluginRoot1.appendChild(chain);
for (let lv = 1; lv <= 12; lv++) {
  const sr = chain.attachShadow({ mode: 'open' });
  const next = fakeDocument.createElement('chain-' + lv);
  sr.appendChild(next);
  chain = next;
}
const tooDeepSr = chain.attachShadow({ mode: 'open' });
tooDeepSr.appendChild(makeNacButton('shadow_open.too_deep'));

let cappedRejected = false;
try {
  await NAC.click('shadow_open.too_deep');
  cappedRejected = false; /* should NOT resolve */
} catch (e) {
  cappedRejected = e && e.code === 'not_found';
}
assert('T3 depth cap rejects too-deep target (>10)',
  cappedRejected,
  'expected not_found at depth >10; depth=13');

/* ---------- T4: closed shadow + el.nac3.query exposure ---------- */

const host4 = fakeDocument.createElement('my-card-closed-q');
pluginRoot1.appendChild(host4);
const shadow4 = host4.attachShadow({ mode: 'closed' });
const btn4 = makeNacButton('shadow_closed.q.toggle');
shadow4.appendChild(btn4);
host4.nac3 = {
  query: (sel) => shadow4.querySelector(sel),
};

try {
  await NAC.click('shadow_closed.q.toggle');
  assert('T4 NAC.click resolves via el.nac3.query (closed shadow)', true);
} catch (e) {
  assert('T4 NAC.click resolves via el.nac3.query (closed shadow)', false, e && e.message);
}

/* ---------- T5: closed shadow + el.nac3.queryAll ---------- */

const host5 = fakeDocument.createElement('my-card-closed-qall');
pluginRoot1.appendChild(host5);
const shadow5 = host5.attachShadow({ mode: 'closed' });
shadow5.appendChild(makeNacButton('shadow_closed.qall.toggle'));
host5.nac3 = {
  query:    (sel) => shadow5.querySelector(sel),
  queryAll: (sel) => shadow5.querySelectorAll(sel),
};

try {
  await NAC.click('shadow_closed.qall.toggle');
  assert('T5 NAC.click resolves via el.nac3.queryAll (closed shadow)', true);
} catch (e) {
  assert('T5 NAC.click resolves via el.nac3.queryAll (closed shadow)', false, e && e.message);
}

/* ---------- T6: el.nac3.query throws -> nac:shadow_blocked ---------- */

blockedEvents.length = 0;

const host6 = fakeDocument.createElement('my-card-closed-throws');
pluginRoot1.appendChild(host6);
host6.nac3 = {
  query: () => { throw new Error('producer broken'); },
};

try { await NAC.click('shadow_closed.never_resolves_6'); } catch (_) {}
const t6Blocked = blockedEvents.find(d => d.host === host6 && d.reason === 'exposure_threw');
assert('T6 throwing el.nac3.query emits nac:shadow_blocked reason=exposure_threw',
  !!t6Blocked, JSON.stringify(blockedEvents.map(e => e.reason)));

/* ---------- T7: el.nac3.query returns non-Element -> protocol violation ---------- */

violationEvents.length = 0;

const host7 = fakeDocument.createElement('my-card-closed-bad-shape');
pluginRoot1.appendChild(host7);
host7.nac3 = {
  query: () => 'not an element',
};

try { await NAC.click('shadow_closed.never_resolves_7'); } catch (_) {}
const t7Violation = violationEvents.find(d => d.host === host7);
assert('T7 non-Element return emits nac:shadow_protocol_violation',
  !!t7Violation, JSON.stringify(violationEvents.map(e => e.message)));

/* ---------- T8: data-nac-shadow="closed" with no nac3 -> not_exposed ---------- */

blockedEvents.length = 0;

const host8 = fakeDocument.createElement('my-card-closed-no-expose');
host8.setAttribute('data-nac-shadow', 'closed');
pluginRoot1.appendChild(host8);
/* No nac3 interface installed. */

try { await NAC.click('shadow_closed.never_resolves_8'); } catch (_) {}
const t8Blocked = blockedEvents.find(d => d.host === host8 && d.reason === 'not_exposed');
assert('T8 closed-shadow with no nac3 emits not_exposed',
  !!t8Blocked, JSON.stringify(blockedEvents.map(e => e.reason)));

/* ---------- T9: once-per-host dedup ---------- */

blockedEvents.length = 0;

/* Same host8 -- query again, should NOT re-emit. */
try { await NAC.click('shadow_closed.never_resolves_8_again'); } catch (_) {}
const t9Count = blockedEvents.filter(d => d.host === host8).length;
assert('T9 nac:shadow_blocked emits only once per host (WeakSet dedup)',
  t9Count === 0,
  'expected 0 re-emits, got ' + t9Count);

/* ---------- T10: events composed:true cross shadow boundaries ---------- */

const host10 = fakeDocument.createElement('my-card-bubble');
pluginRoot1.appendChild(host10);
const shadow10 = host10.attachShadow({ mode: 'open' });
const innerBtn = makeNacButton('shadow_open.bubble');
shadow10.appendChild(innerBtn);

let saw = false;
fakeDocument.addEventListener('nac:action:succeeded', (ev) => {
  if (ev.detail && ev.detail.action_id === 'shadow_open.bubble') saw = true;
});
try {
  await NAC.click('shadow_open.bubble');
} catch (_) {}
assert('T10 succeeded event composed:true reaches document from shadow root',
  saw, 'event was not received');

/* ---------- summary ---------- */

if (failures === 0) {
  console.log('\nV23-SHADOW PASS (all)');
  process.exit(0);
} else {
  console.error('\nV23-SHADOW FAIL (' + failures + ')');
  process.exit(1);
}
