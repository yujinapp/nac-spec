/* stage10-authority-sudo.mjs -- NAC v2.5 RFC V24-05
 *
 * Agent authority + sudo elevation. The runtime exposes three
 * primitives so a host can interpose a confirmation UI between an
 * agent dispatch and the action's side effect, with a SUDO-style
 * elevation that bypasses confirmations for a granted scope until
 * its TTL expires.
 *
 *   NAC.set_confirm_handler(fn)
 *     fn is async (req) => boolean. The host renders its UI
 *     (modal, voice, Discord button, etc) and resolves true on
 *     approve, false on reject.
 *
 *   NAC.confirm_action(action_id, message, opts?)
 *     opts = { scope: 'low' | 'medium' | 'high', metadata: {...} }
 *     Returns Promise<boolean>. If currently elevated for an equal
 *     or stricter scope, resolves true synchronously (no handler
 *     call). Otherwise invokes the handler.
 *
 *   NAC.request_authority(scope, ttl_ms, opts?)
 *     Asks the host for sudo elevation for `scope` for `ttl_ms`.
 *     On grant, subsequent confirm_action calls in that scope
 *     resolve immediately for ttl_ms. After TTL the elevation
 *     auto-revokes; manual revoke is NAC.revoke_authority(scope).
 *
 *   NAC.has_authority(scope) -> boolean
 *   NAC.revoke_authority(scope) -> void  (idempotent)
 *
 * Scope rank: high > medium > low. Granted high authority
 * satisfies medium + low; granted low does NOT satisfy higher.
 *
 * Provenance event family on document:
 *   nac:authority:requested -> handler about to be called
 *   nac:authority:granted   -> handler approved
 *   nac:authority:denied    -> handler rejected
 *   nac:authority:revoked   -> manual revoke
 *   nac:authority:expired   -> TTL passed
 *   nac:action:confirmed    -> confirm_action approved (via handler or sudo)
 *   nac:action:rejected     -> confirm_action denied
 *
 * Same shim pattern as stage8/9. ASCII only.
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
  }
  setAttribute(k, v) { this.attributes[k] = String(v); }
  getAttribute(k) { return Object.prototype.hasOwnProperty.call(this.attributes, k) ? this.attributes[k] : null; }
  removeAttribute(k) { delete this.attributes[k]; }
  hasAttribute(k) { return Object.prototype.hasOwnProperty.call(this.attributes, k); }
  appendChild(n) { this.children.push(n); n._parent = this; return n; }
  removeChild(n) { const i = this.children.indexOf(n); if (i >= 0) this.children.splice(i, 1); return n; }
  querySelector() { return null; }
  querySelectorAll() { return []; }
  matches() { return false; }
  closest() { return null; }
  click() { try { this.dispatchEvent(new Event('click', { bubbles: true })); } catch (_) {} }
  focus() {}
  get classList() {
    const self = this;
    return { contains: () => false, add: () => {}, remove: () => {} };
  }
  getBoundingClientRect() { return { width: 100, height: 30, top: 0, left: 0 }; }
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

const provenance = {
  requested: [], granted: [], denied: [], revoked: [], expired: [],
  confirmed: [], rejected: [],
};
doc.addEventListener('nac:authority:requested', (e) => provenance.requested.push(e.detail || e));
doc.addEventListener('nac:authority:granted',   (e) => provenance.granted.push(e.detail || e));
doc.addEventListener('nac:authority:denied',    (e) => provenance.denied.push(e.detail || e));
doc.addEventListener('nac:authority:revoked',   (e) => provenance.revoked.push(e.detail || e));
doc.addEventListener('nac:authority:expired',   (e) => provenance.expired.push(e.detail || e));
doc.addEventListener('nac:action:confirmed',    (e) => provenance.confirmed.push(e.detail || e));
doc.addEventListener('nac:action:rejected',     (e) => provenance.rejected.push(e.detail || e));

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

/* v2.5 alpha.4: STRICT_VERSIONING default flipped to true. This
   test does not use V24-04 expected_* params, so opt out at the
   top to keep the test focused on its actual subject. */
NAC.STRICT_VERSIONING = false;

if (!NAC) { console.error('NAC failed to load'); process.exit(1); }

await (async () => {
  /* ============== API surface ============== */

  assert('NAC.set_confirm_handler is fn',  typeof NAC.set_confirm_handler === 'function');
  assert('NAC.confirm_action is fn',       typeof NAC.confirm_action === 'function');
  assert('NAC.request_authority is fn',    typeof NAC.request_authority === 'function');
  assert('NAC.has_authority is fn',        typeof NAC.has_authority === 'function');
  assert('NAC.revoke_authority is fn',     typeof NAC.revoke_authority === 'function');

  /* ============== confirm_action with no handler -> reject ============== */

  let noHandler = null;
  try { await NAC.confirm_action('a.b', 'do?'); }
  catch (e) { noHandler = e; }
  assert('confirm_action without handler rejects',
    noHandler && noHandler.code === 'no_confirm_handler');

  /* ============== confirm_action with handler ============== */

  /* Handler that approves everything. */
  NAC.set_confirm_handler(async (req) => true);
  const ok1 = await NAC.confirm_action('save.draft', 'Save?');
  assert('confirm_action approved by handler returns true', ok1 === true);
  assert('nac:action:confirmed emitted', provenance.confirmed.length === 1);
  assert('confirmed detail has action_id',
    provenance.confirmed[0].action_id === 'save.draft');

  /* Handler that rejects everything. */
  NAC.set_confirm_handler(async (req) => false);
  const ok2 = await NAC.confirm_action('delete.contract', 'Delete?');
  assert('confirm_action denied by handler returns false', ok2 === false);
  assert('nac:action:rejected emitted', provenance.rejected.length === 1);

  /* Handler that THROWS -- runtime treats as denied. */
  NAC.set_confirm_handler(async (req) => { throw new Error('user cancelled'); });
  const ok3 = await NAC.confirm_action('weird', 'do?');
  assert('confirm_action with throwing handler returns false', ok3 === false);

  /* Handler observes the req payload (kind, action_id, message, scope, metadata). */
  let observedReq = null;
  NAC.set_confirm_handler(async (req) => { observedReq = req; return true; });
  await NAC.confirm_action('upload.x', 'Upload?',
    { scope: 'medium', metadata: { size_mb: 12 } });
  assert('handler observes kind=confirm_action',
    observedReq && observedReq.kind === 'confirm_action');
  assert('handler observes message',     observedReq && observedReq.message === 'Upload?');
  assert('handler observes scope',       observedReq && observedReq.scope === 'medium');
  assert('handler observes metadata',    observedReq && observedReq.metadata && observedReq.metadata.size_mb === 12);

  /* ============== request_authority + sudo bypass ============== */

  NAC.set_confirm_handler(async (req) => true);
  const beforeGranted = provenance.granted.length;
  const a1 = await NAC.request_authority('medium', 200);
  assert('request_authority granted returns object',
    a1 && a1.granted === true && a1.scope === 'medium' && typeof a1.expires_at === 'number');
  assert('nac:authority:requested emitted', provenance.requested.length >= 1);
  assert('nac:authority:granted emitted',  provenance.granted.length === beforeGranted + 1);

  assert('has_authority(medium) true after grant',  NAC.has_authority('medium') === true);
  assert('has_authority(low) true after medium grant -- high satisfies lower',
    NAC.has_authority('low') === true);
  assert('has_authority(high) false -- medium does NOT satisfy higher',
    NAC.has_authority('high') === false);

  /* Now confirm_action with scope=medium should resolve immediately
     WITHOUT calling the handler. Verify by replacing handler with
     one that throws (would otherwise reject). */
  let handlerCalled = 0;
  NAC.set_confirm_handler(async (req) => { handlerCalled++; throw new Error('NEVER'); });
  const sudoOk = await NAC.confirm_action('act.medium', 'do?', { scope: 'medium' });
  assert('sudo elevation bypasses handler for matching scope',
    sudoOk === true && handlerCalled === 0);
  assert('sudo bypass also emits nac:action:confirmed',
    provenance.confirmed[provenance.confirmed.length - 1].sudo === true);

  /* But scope=high (which we don't have) should still hit the handler. */
  const noSudo = await NAC.confirm_action('act.high', 'high?', { scope: 'high' });
  assert('sudo elevation does NOT bypass higher scope',
    handlerCalled === 1 && noSudo === false /* throwing handler -> false */);

  /* ============== TTL auto-expiry ============== */

  /* Wait past the TTL we set (200 ms). */
  await new Promise(r => setTimeout(r, 250));
  assert('has_authority returns false after TTL', NAC.has_authority('medium') === false);
  assert('nac:authority:expired emitted at TTL', provenance.expired.length >= 1);
  const lastExp = provenance.expired[provenance.expired.length - 1];
  assert('expired detail names the scope',
    lastExp && lastExp.scope === 'medium');

  /* ============== manual revoke ============== */

  NAC.set_confirm_handler(async (req) => true);
  await NAC.request_authority('high', 5000);
  assert('has_authority(high) true', NAC.has_authority('high') === true);
  const beforeRevoked = provenance.revoked.length;
  NAC.revoke_authority('high');
  assert('has_authority(high) false after revoke',
    NAC.has_authority('high') === false);
  assert('nac:authority:revoked emitted',
    provenance.revoked.length === beforeRevoked + 1);
  /* Idempotent. */
  NAC.revoke_authority('high');
  NAC.revoke_authority('high');
  assert('revoke_authority idempotent (no extra events)',
    provenance.revoked.length === beforeRevoked + 1);

  /* ============== request_authority denied ============== */

  NAC.set_confirm_handler(async (req) => false);
  const beforeDenied = provenance.denied.length;
  const denied = await NAC.request_authority('high', 5000);
  assert('request_authority denied returns granted=false',
    denied && denied.granted === false);
  assert('nac:authority:denied emitted',
    provenance.denied.length === beforeDenied + 1);
  assert('has_authority unchanged after denial', NAC.has_authority('high') === false);

  /* ============== invalid args ============== */

  let badScope = null;
  try { await NAC.request_authority('wrong_scope', 1000); }
  catch (e) { badScope = e; }
  assert('request_authority rejects invalid scope',
    badScope && badScope.code === 'invalid');

  let badTtl = null;
  try { await NAC.request_authority('low', -5); }
  catch (e) { badTtl = e; }
  assert('request_authority rejects negative ttl',
    badTtl && badTtl.code === 'invalid');

  console.log('\n' + (failures === 0 ? 'STAGE-10 PASS' : 'STAGE-10 FAIL (' + failures + ')'));
  process.exit(failures === 0 ? 0 : 1);
})();
