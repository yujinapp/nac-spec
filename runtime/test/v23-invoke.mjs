/**
 * v2.3 NAC.invoke + NAC.utter unit tests.
 *
 * Boots the runtime against a minimal Node-side DOM shim, registers
 * a manifest with a payload-bearing action, drives the new APIs,
 * and asserts:
 *
 *  - invoke() dispatches nac:action:requested with correlated
 *    request_id, payload, verb, plugin, action_id, ts.
 *  - host emits nac:action:succeeded with the same request_id →
 *    invoke resolves with {ok, ack}.
 *  - host emits nac:action:failed → invoke rejects with NacError.
 *  - 30 s default timeout shortenable via opts.timeout; absent ack →
 *    invoke rejects with code 'timeout'.
 *  - utter() is an ergonomic shortcut for verb='utter'.
 *  - Invalid args (no action_id, no payload, etc.) reject with
 *    code 'invalid' before any event fires.
 *  - Non-existent element rejects with code 'not_found'.
 *
 * Same tiny DOM shim shape as v22.mjs.
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

/* ---------- Minimal DOM shim (mirror of v22.mjs) ---------- */

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
  }
  /* Real DOM bubbling: when an event is dispatched on a child node
     with bubbles:true, it walks up to ancestors. Node's EventTarget
     doesn't do this natively, so we simulate. */
  dispatchEvent(ev) {
    const r = super.dispatchEvent(ev);
    if (ev && ev.bubbles && this.parentElement) {
      try { this.parentElement.dispatchEvent(ev); } catch (_) {}
    } else if (ev && ev.bubbles && this !== fakeDocument && fakeDocument) {
      /* When parentElement chain ends, bubble to document so
         document-level listeners fire (matching real DOM). */
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
  querySelector(sel) {
    const m = sel.match(/^\[data-nac-id="([^"]+)"\]$/);
    if (!m) return null;
    function walk(node) {
      if (!node || !node.children) return null;
      for (const c of node.children) {
        if (c.getAttribute && c.getAttribute('data-nac-id') === m[1]) return c;
        const r = walk(c);
        if (r) return r;
      }
      return null;
    }
    return walk(this);
  }
  querySelectorAll(sel) {
    const m = sel.match(/^\[data-nac-(?:id|plugin)\]$/);
    const out = [];
    function walk(node) {
      if (!node || !node.children) return;
      for (const c of node.children) {
        if (c.getAttribute && (c.getAttribute('data-nac-id') || c.getAttribute('data-nac-plugin'))) {
          out.push(c);
        }
        walk(c);
      }
    }
    walk(this);
    return out;
  }
  getBoundingClientRect() { return { width: 100, height: 30, top: 0, left: 0, bottom: 30, right: 100 }; }
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
  }
  createElement(tag) { return new FakeNode(tag); }
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
  querySelector(sel)    { return this.body.querySelector(sel); }
  querySelectorAll(sel) { return this.body.querySelectorAll(sel); }
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
new Function(src)();   // executes the IIFE, installs window.NAC

const NAC = global.window.NAC;

/* v2.5 alpha.4: STRICT_VERSIONING default flipped to true. This
   test does not use V24-04 expected_* params, so opt out at the
   top to keep the test focused on its actual subject. */
NAC.STRICT_VERSIONING = false;

assert('NAC installed',                 !!NAC && typeof NAC === 'object');
assert('NAC.invoke is fn',              typeof NAC.invoke === 'function');
assert('NAC.utter is fn',               typeof NAC.utter  === 'function');
assert('NAC.version v2.3+',             /^2\.(3|4|[5-9]|\d{2,})\.\d+(-[a-z0-9.]+)?$/.test(NAC.version));

/* ---------- Build a minimal mount: <body><div data-nac-plugin="demo">
                                       <button data-nac-id="demo.mic"
                                               data-nac-role="action"
                                               data-nac-action="utter" />
                                     </div></body>
   plus matching manifest. ---------- */

const root = fakeDocument.createElement('div');
root.setAttribute('data-nac-plugin', 'demo');
fakeDocument.body.appendChild(root);

const mic = fakeDocument.createElement('button');
mic.setAttribute('data-nac-id',     'demo.mic');
mic.setAttribute('data-nac-role',   'action');
mic.setAttribute('data-nac-action', 'utter');
root.appendChild(mic);

NAC.register({
  plugin_slug: 'demo',
  version:     '1.0.0',
  nac_version: '2.3',
  elements: [
    { id: 'demo.mic', role: 'action',
      actions: [
        { verb: 'utter',
          payload_schema: { text: { type: 'string', required: true } },
          label_i18n: { es: 'Decir', en: 'Utter', pt: 'Dizer', fr: 'Dire', it: 'Dire',
                        de: 'Sagen', ja: 'いう', zh: '说', hi: 'kaho', ar: 'قُل' } }
      ],
      label_i18n: { es: 'Microfono', en: 'Mic', pt: 'Microfone', fr: 'Micro',
                    it: 'Microfono', de: 'Mikro', ja: 'マイク', zh: '麦克风', hi: 'mic', ar: 'مايك' } }
  ],
});

/* ---------- T1: invoke -> nac:action:requested -> success ---------- */

let lastRequest = null;
fakeDocument.addEventListener('nac:action:requested', function (ev) {
  if (!ev || !ev.detail) return;
  /* Only respond for demo.mic; other action_ids get handled by
     dedicated listeners later in the test. */
  if (ev.detail.action_id !== 'demo.mic') return;
  lastRequest = ev.detail;
  setTimeout(function () {
    fakeDocument.dispatchEvent(new CustomEvent('nac:action:succeeded', {
      detail: {
        plugin:     'demo',
        action_id:  ev.detail.action_id,
        request_id: ev.detail.request_id,
        verb:       ev.detail.verb,
        echo:       ev.detail.payload && ev.detail.payload.text,
      },
    }));
  }, 0);
});

const r1 = await NAC.invoke('demo.mic', { verb: 'utter', text: 'hello' });
assert('T1 invoke resolves',                    r1 && r1.ok === true);
assert('T1 invoke ack carries request_id',      r1 && typeof r1.request_id === 'string' && r1.request_id.startsWith('nac_inv_'));
assert('T1 invoke ack echoes payload via host', r1 && r1.ack && r1.ack.echo === 'hello');
assert('T1 nac:action:requested fired',         lastRequest && lastRequest.action_id === 'demo.mic');
assert('T1 detail.verb correct',                lastRequest && lastRequest.verb === 'utter');
assert('T1 detail.plugin correct',              lastRequest && lastRequest.plugin === 'demo');
assert('T1 detail.payload.text echo',           lastRequest && lastRequest.payload && lastRequest.payload.text === 'hello');
assert('T1 detail.request_id present',          lastRequest && typeof lastRequest.request_id === 'string');

/* ---------- T2: NAC.utter() shortcut ---------- */

lastRequest = null;
const r2 = await NAC.utter('demo.mic', { text: 'voy a comprar zapatillas', lang: 'es' });
assert('T2 utter resolves',                     r2 && r2.ok === true);
assert('T2 utter forwards verb=utter',          lastRequest && lastRequest.verb === 'utter');
assert('T2 utter forwards text',                lastRequest && lastRequest.payload.text === 'voy a comprar zapatillas');
assert('T2 utter forwards lang',                lastRequest && lastRequest.payload.lang === 'es');

/* ---------- T3: host emits :failed -> invoke rejects ---------- */

try {
  /* Add a fresh element 'demo.fail' that the success listener
     doesn't match. */
  const fb = fakeDocument.createElement('button');
  fb.setAttribute('data-nac-id',     'demo.fail');
  fb.setAttribute('data-nac-role',   'action');
  fb.setAttribute('data-nac-action', 'noop');
  root.appendChild(fb);
  /* Set up a one-shot listener that always fails. */
  const oneShot = function (ev) {
    if (ev.detail.action_id !== 'demo.fail') return;
    fakeDocument.removeEventListener('nac:action:requested', oneShot);
    setTimeout(function () {
      fakeDocument.dispatchEvent(new CustomEvent('nac:action:failed', {
        detail: {
          plugin:     'demo',
          action_id:  ev.detail.action_id,
          request_id: ev.detail.request_id,
          error:      'rate_limited',
          message:    'too fast bro',
        },
      }));
    }, 0);
  };
  fakeDocument.addEventListener('nac:action:requested', oneShot);
  await NAC.invoke('demo.fail', { verb: 'noop' });
  assert('T3 invoke rejects on :failed', false, 'should have rejected');
} catch (e) {
  assert('T3 invoke rejects with code', e && e.code === 'rate_limited');
  assert('T3 error message present',   e && typeof e.message === 'string' && e.message.indexOf('too fast bro') >= 0);
}

/* ---------- T4: invalid args ---------- */

try {
  await NAC.invoke();
  assert('T4 invoke missing action_id rejects', false);
} catch (e) {
  assert('T4 invoke missing action_id', e && e.code === 'invalid');
}
try {
  await NAC.invoke('demo.mic');
  assert('T4 invoke missing payload rejects', false);
} catch (e) {
  assert('T4 invoke missing payload', e && e.code === 'invalid');
}
try {
  await NAC.utter('demo.mic', {});
  assert('T4 utter missing text rejects', false);
} catch (e) {
  assert('T4 utter missing text', e && e.code === 'invalid');
}

/* ---------- T5: not found ---------- */

try {
  await NAC.invoke('demo.ghost', { verb: 'utter', text: 'x' });
  assert('T5 invoke not_found rejects', false);
} catch (e) {
  assert('T5 invoke not_found', e && e.code === 'not_found');
}

/* ---------- T6: timeout ---------- */

const tgo = fakeDocument.createElement('button');
tgo.setAttribute('data-nac-id',     'demo.silent');
tgo.setAttribute('data-nac-role',   'action');
tgo.setAttribute('data-nac-action', 'noop');
root.appendChild(tgo);
/* No listener for this one -- it should time out. */
const t0 = Date.now();
try {
  await NAC.invoke('demo.silent', { verb: 'noop', x: 1 }, { timeout: 250 });
  assert('T6 invoke timeout rejects', false);
} catch (e) {
  const dt = Date.now() - t0;
  assert('T6 invoke timeout code',       e && e.code === 'timeout', 'got code=' + (e && e.code) + ' msg=' + (e && e.message));
  assert('T6 invoke timeout respects opts.timeout (~250ms)', dt >= 200 && dt < 1500, 'elapsed=' + dt + 'ms');
}

/* ---------- T7/T8/T9: alpha.2 disabled-guard relaxation (F5) ----------
   Regression pin-down for the 2.3.0-alpha.2 hotfix. NAC.invoke is a
   payload-bearing logical request, not a synthetic click; it must NOT
   reject when the target element has `disabled` or `aria-disabled=true`.
   NAC.click, by contrast, IS a UX click and MUST still reject on
   disabled (click semantics preserved). Without this test the hotfix
   can silently regress and re-break Atlas Pro's mic during /parse+/tts
   processing. */

const dBtn = fakeDocument.createElement('button');
dBtn.setAttribute('data-nac-id',     'demo.disabled_mic');
dBtn.setAttribute('data-nac-role',   'action');
dBtn.setAttribute('data-nac-action', 'utter');
dBtn.disabled = true;
root.appendChild(dBtn);
/* Wire a success listener that mirrors T1. */
fakeDocument.addEventListener('nac:action:requested', function (ev) {
  if (!ev || !ev.detail) return;
  if (ev.detail.action_id !== 'demo.disabled_mic') return;
  setTimeout(function () {
    fakeDocument.dispatchEvent(new CustomEvent('nac:action:succeeded', {
      detail: {
        plugin:     'demo',
        action_id:  ev.detail.action_id,
        request_id: ev.detail.request_id,
        verb:       ev.detail.verb,
        via:        'disabled_test',
      },
    }));
  }, 0);
});

try {
  const r7 = await NAC.invoke('demo.disabled_mic', { verb: 'utter', text: 'mid-tts-utter' });
  assert('T7 invoke resolves on disabled element', r7 && r7.ok === true,
         'invoke must NOT reject with code=disabled (alpha.2 hotfix); the disabled HTML attr is a click guard, not an invoke guard');
} catch (e) {
  assert('T7 invoke resolves on disabled element', false,
         'rejected with code=' + (e && e.code) + ' -- alpha.2 hotfix REGRESSED');
}

const ardBtn = fakeDocument.createElement('button');
ardBtn.setAttribute('data-nac-id',     'demo.aria_disabled_mic');
ardBtn.setAttribute('data-nac-role',   'action');
ardBtn.setAttribute('data-nac-action', 'utter');
ardBtn.setAttribute('aria-disabled',   'true');
root.appendChild(ardBtn);
fakeDocument.addEventListener('nac:action:requested', function (ev) {
  if (!ev || !ev.detail) return;
  if (ev.detail.action_id !== 'demo.aria_disabled_mic') return;
  setTimeout(function () {
    fakeDocument.dispatchEvent(new CustomEvent('nac:action:succeeded', {
      detail: {
        plugin:     'demo',
        action_id:  ev.detail.action_id,
        request_id: ev.detail.request_id,
        verb:       ev.detail.verb,
        via:        'aria_disabled_test',
      },
    }));
  }, 0);
});

try {
  const r8 = await NAC.invoke('demo.aria_disabled_mic', { verb: 'utter', text: 'aria-disabled-utter' });
  assert('T8 invoke resolves on aria-disabled element', r8 && r8.ok === true);
} catch (e) {
  assert('T8 invoke resolves on aria-disabled element', false,
         'rejected with code=' + (e && e.code));
}

/* T9: NAC.click on the SAME disabled element MUST still reject.
   We do not want the alpha.2 relaxation to leak into click semantics. */
try {
  await NAC.click('demo.disabled_mic');
  assert('T9 NAC.click STILL rejects on disabled', false,
         'click rejection semantics must be preserved');
} catch (e) {
  assert('T9 NAC.click rejects with code=disabled',
         e && (e.code === 'disabled' || /disabled/i.test(e.message || '')),
         'got code=' + (e && e.code) + ' msg=' + (e && e.message));
}

if (failures === 0) {
  console.log('\nV23-INVOKE PASS (' + 'all' + ')');
  process.exit(0);
} else {
  console.error('\nV23-INVOKE FAIL (' + failures + ')');
  process.exit(1);
}
