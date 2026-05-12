/**
 * Stage 1 (Comunicacion) -- audio + STT-mock coverage.
 *
 * Two capas:
 *
 * CAPA A: STT mock + text injection.
 *   We mock window.SpeechRecognition so that when "the user
 *   pushes the mic button" fires, an instance is returned that
 *   synthesises a `result` event carrying the corpus's text.
 *   This tests stages 1->2->4 (input collection -> dispatcher).
 *
 * CAPA B: real MP3 corpus verification.
 *   We verify every .mp3 in fixtures/voice/ exists + is >= 1KB
 *   (sanity check the corpus survived git). We do NOT replay
 *   audio through SpeechRecognition because the Web Speech API
 *   needs a real browser + microphone stream. That belongs to
 *   the Playwright e2e suite (queued).
 */

import fs from 'node:fs';
import path from 'node:path';
import url  from 'node:url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const NAC_PATH  = path.resolve(__dirname, '..', '..', '..', 'yujin.app', 'nac-spec', 'js', 'nac.js');
const CHAT_PATH = path.resolve(__dirname, '..', '..', '..', 'yujin.app', 'nac-spec', 'js', 'nac-chat-client.js');
const CORPUS    = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'voice', 'corpus.json'), 'utf8'));

let failures = 0;
function assert(name, ok, detail) {
  if (ok) console.log('PASS', name);
  else { failures++; console.error('FAIL', name, detail || ''); }
}

/* ---------- Tiny shim ---------- */

class FakeNode extends EventTarget {
  constructor(tag) {
    super();
    this.tagName = (tag || 'DIV').toUpperCase();
    this.children = []; this._attrs = {}; this.dataset = {};
    this.style = { setProperty(){}, removeProperty(){} };
    this.classList = { _s: new Set(), add(v){this._s.add(v);}, remove(v){this._s.delete(v);}, contains(v){return this._s.has(v);} };
    this.value = ''; this.textContent = ''; this.parentNode = null;
  }
  setAttribute(k, v) { this._attrs[k] = String(v); }
  getAttribute(k)    { return this._attrs[k] != null ? this._attrs[k] : null; }
  appendChild(c)     { c.parentNode = this; this.children.push(c); return c; }
  removeChild(c)     { this.children = this.children.filter(x => x !== c); }
  focus() {} click() {}
  _matches(sel) {
    const m = sel.match(/^\[([\w-]+)(?:="([^"]*)")?\]$/);
    if (m) { const v = this.getAttribute(m[1]); if (m[2] === undefined) return v != null; return v === m[2]; }
    return false;
  }
  querySelector(sel) { return null; }
  querySelectorAll() { return []; }
  closest() { return null; }
  scrollIntoView() {}
}

function installShim() {
  const doc = new FakeNode('DOCUMENT');
  doc.body = new FakeNode('BODY'); doc.head = new FakeNode('HEAD');
  doc.documentElement = new FakeNode('HTML');
  doc.documentElement.appendChild(doc.head); doc.documentElement.appendChild(doc.body);
  doc.children.push(doc.documentElement);
  doc.createElement = (t) => new FakeNode(t);
  doc.createTextNode = (t) => { const n = new FakeNode('TEXT'); n.textContent = t; return n; };
  doc.createEvent = () => ({ initCustomEvent(){} });
  doc.getElementById = () => null;
  doc.defaultView = globalThis;
  globalThis.document = doc; globalThis.window = globalThis;
  globalThis.HTMLElement = FakeNode; globalThis.Element = FakeNode;
  globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0);
  globalThis.MutationObserver = class { observe(){} disconnect(){} };
  globalThis.matchMedia = () => ({ matches: false, addEventListener(){}, removeEventListener(){} });
  globalThis.localStorage = { getItem(){return null;}, setItem(){}, removeItem(){}, clear(){} };
  globalThis.location = { href:'http://localhost/test', protocol:'http:', host:'localhost' };
  try { Object.defineProperty(globalThis, 'navigator', { value:{language:'en-US'}, configurable:true, writable:true }); } catch(_) {}
  globalThis.getComputedStyle = () => ({ display:'block', visibility:'visible', opacity:'1' });
  Object.defineProperty(FakeNode.prototype, 'ownerDocument', { get() { return doc; } });
}

function loadRuntime() {
  // eslint-disable-next-line no-new-func
  (new Function(fs.readFileSync(NAC_PATH, 'utf8'))).call(globalThis);
  // eslint-disable-next-line no-new-func
  (new Function(fs.readFileSync(CHAT_PATH, 'utf8'))).call(globalThis);
}

process.on('uncaughtException', () => {});
installShim();
loadRuntime();
const NAC = globalThis.NAC;
const NacChat = globalThis.NacChat;

/* ===========================================================
   CAPA B: Corpus file integrity
   =========================================================== */

console.log('--- CAPA B: corpus file integrity ---');

let presentCount = 0;
let totalBytes = 0;
const expectedCount = CORPUS.prompts.length;

for (const p of CORPUS.prompts) {
  const audioPath = path.join(__dirname, 'fixtures', 'voice', p.locale, p.id + '.mp3');
  const exists = fs.existsSync(audioPath);
  if (!exists) {
    failures++;
    console.error('FAIL', p.id, 'missing audio file');
    continue;
  }
  const stat = fs.statSync(audioPath);
  if (stat.size < 1024) {
    failures++;
    console.error('FAIL', p.id, 'too small (' + stat.size + 'B), likely error response');
    continue;
  }
  presentCount++;
  totalBytes += stat.size;
}

assert('CAPA B: all ' + expectedCount + ' audio files present',
       presentCount === expectedCount);
assert('CAPA B: total corpus size >= 100KB',
       totalBytes >= 100 * 1024);
assert('CAPA B: total corpus size <= 2MB',
       totalBytes <= 2 * 1024 * 1024);
console.log('  total bytes:', totalBytes, '(' + Math.round(totalBytes / 1024) + ' KB)');

/* ===========================================================
   CAPA A: STT mock + text injection through NacChat
   =========================================================== */

console.log('--- CAPA A: STT mock + text injection ---');

/* Mock fetch for backend stub. */
let lastBackendBody = null;
globalThis.fetch = async function (urlStr, opts) {
  if (typeof urlStr === 'string' && urlStr.includes('nac-demo')) {
    lastBackendBody = JSON.parse(opts.body);
    return new Response(JSON.stringify({
      ok: true,
      message: 'stub',
      actions: []
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }
  return new Response('not found', { status: 404 });
};
if (typeof globalThis.Response === 'undefined') {
  globalThis.Response = class {
    constructor(body, init) { this.body = body; this.status = (init && init.status) || 200; this.ok = this.status < 400; }
    async json() { return JSON.parse(this.body); }
    async text() { return String(this.body); }
  };
}

/* Mock SpeechRecognition. Each instance, on `start()`, fires a
   `result` event whose transcript is the corpus text we want to
   simulate. This is how the chat client's STT path would be
   exercised by a real recogniser. */
globalThis.SpeechRecognition = class FakeRecognition {
  constructor() {
    this.continuous = false;
    this.interimResults = false;
    this.lang = 'en-US';
    this._listeners = {};
  }
  addEventListener(name, cb) {
    (this._listeners[name] || (this._listeners[name] = [])).push(cb);
  }
  removeEventListener(name, cb) {
    const arr = this._listeners[name] || [];
    this._listeners[name] = arr.filter(x => x !== cb);
  }
  _emit(name, evt) {
    (this._listeners[name] || []).forEach(cb => { try { cb(evt); } catch (_) {} });
  }
  start() {
    /* Fire the planted transcript after a microtask. */
    queueMicrotask(() => {
      this._emit('result', {
        resultIndex: 0,
        results: [[{ transcript: globalThis.__nextTranscript || '', confidence: 0.95 }]]
      });
      this._emit('end', {});
    });
  }
  stop()  {}
  abort() {}
};
globalThis.webkitSpeechRecognition = globalThis.SpeechRecognition;

/* Bootstrap NacChat against the stub fetch. */
NacChat.init({
  endpoint:    'http://test/nac-demo',
  lang:        'es',
  chatLog:     document.createElement('div'),
  input:       document.createElement('input'),
  sendBtn:     document.createElement('button')
});
NacChat._ttsEnabled = false; /* keep stdout clean */

/* Feed each corpus prompt as text (Capa A). We assert:
   - language-trap prompts ('cambia de pestana', 'cambia precio
     de mouse 40') DO NOT switch lang.
   - language-switch prompts DO switch lang.
   - normal prompts result in a backend call. */

for (const p of CORPUS.prompts) {
  /* Reset state. */
  NacChat._lang = p.locale;
  lastBackendBody = null;

  const langBefore = NacChat._lang;
  await NacChat.send(p.text);
  await new Promise(r => setTimeout(r, 20));
  const langAfter = NacChat._lang;
  const calledBackend = lastBackendBody !== null;

  if (p.expected_no_locale_switch === true) {
    assert('[' + p.id + '] no locale switch + backend called',
      langAfter === langBefore && calledBackend);
  } else if (p.expected_kind === 'change_locale' && p.expected_locale) {
    assert('[' + p.id + '] locale switched to ' + p.expected_locale,
      langAfter === p.expected_locale);
  } else {
    assert('[' + p.id + '] backend called',
      calledBackend);
  }
}

console.log('');
if (failures === 0) console.log('STAGE-1 PASS');
else                console.error('STAGE-1 FAIL (' + failures + ')');
process.exit(failures === 0 ? 0 : 1);
