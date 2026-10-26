/*
 * fill-native-setter-check.mjs -- regression lock for audit N-44.
 *
 * fill() writes an input value through the NATIVE property setter on
 * HTMLInputElement.prototype, not through el.value = v. That is not a
 * detail: React tracks the original setter, so a plain assignment is
 * silently reverted on the next render and a controlled input never
 * receives the value. The fallback exists only for a host with no such
 * constructor.
 *
 * N-44 was that the guard tested the DESCRIPTOR while the expression
 * reached through window.HTMLInputElement.prototype to produce it, so
 * on a partial DOM fill() threw a raw TypeError before any fallback
 * could run -- the fallback was unreachable in the only environment it
 * was written for.
 *
 * Fixing that has one real risk, and only a browser can answer it: did
 * the guard move the BROWSER onto the fallback too? This asserts, in a
 * real Chromium, that it did not -- by shadowing the instance property
 * with a spy that the native setter bypasses and the fallback would
 * hit. The unit suite cannot ask this question: its DOM shim has no
 * element constructors at all, which is why the defect lived there.
 *
 * Run: node e2e/fill-native-setter-check.mjs
 */
import { chromium } from 'playwright';

const html = `<!doctype html><html><body>
<div data-nac-plugin="t">
  <input id="i" data-nac-id="t.name" data-nac-role="field" data-nac-field-type="text">
  <textarea id="ta" data-nac-id="t.notes" data-nac-role="field" data-nac-field-type="text"></textarea>
</div>
</body></html>`;

const browser = await chromium.launch();
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
await page.setContent(html);
/* As a file, not inlined: the runtime source is 348 KB of JavaScript and
   inlining it inside a <script> tag hands the HTML parser text it is
   entitled to misread. */
await page.addScriptTag({ path: 'js/nac.js' });

await page.evaluate(() => {
  window.NAC.register({
    plugin_slug: 't', version: '1.0.0', nac_version: '2.5',
    elements: [
      { id: 't.name', role: 'field', label: 'Name' },
      { id: 't.notes', role: 'field', label: 'Notes' },
    ],
  });
});

const out = await page.evaluate(async () => {
  /* This build defaults STRICT_VERSIONING to true (the v3 gate), so a
     mutating call without an expected_* is refused before it reaches
     the DOM. That is the documented escape hatch, and it is what the
     unit suite does too -- this test is about the setter, not OCC. */
  window.NAC.STRICT_VERSIONING = false;
  const res = {};
  const d = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value');
  res.nativeDescriptorExists = !!(d && typeof d.set === 'function');

  const el = document.getElementById('i');

  /* A spy only the FALLBACK would trigger: an own accessor on the
     instance. The native prototype setter, invoked with .call(el),
     writes the internal slot and never consults this. */
  let fallbackUsed = false;
  let shadow = '';
  Object.defineProperty(el, 'value', {
    configurable: true,
    get() { return shadow; },
    set(v) { fallbackUsed = true; shadow = String(v); },
  });

  let inputEvents = 0;
  el.addEventListener('input', () => { inputEvents += 1; });

  try {
    await window.NAC.fill('t.name', 'hello');
    res.resolved = true;
  } catch (e) {
    res.resolved = false;
    res.error = (e && (e.code || e.message)) || String(e);
  }

  res.fallbackUsed = fallbackUsed;
  res.inputEvents = inputEvents;

  /* Read the real value past the shadow. */
  delete el.value;
  res.valueAfter = el.value;

  const ta = document.getElementById('ta');
  try {
    await window.NAC.fill('t.notes', 'world');
    res.textareaResolved = true;
  } catch (e) {
    res.textareaResolved = false;
    res.textareaError = (e && (e.code || e.message)) || String(e);
  }
  res.textareaValue = ta.value;
  return res;
});

await browser.close();

console.log(JSON.stringify(out, null, 2));
console.log('page errors: ' + (errors.length ? errors.join(' | ') : 'none'));

const checks = [
  ['the native value descriptor exists in this browser', out.nativeDescriptorExists === true],
  ['fill() resolved', out.resolved === true],
  ['fill() wrote the value', out.valueAfter === 'hello'],
  ['fill() fired an input event', out.inputEvents >= 1],
  ['fill() used the NATIVE setter, not the fallback', out.fallbackUsed === false],
  ['fill() resolved on a TEXTAREA too', out.textareaResolved === true],
  ['fill() wrote the textarea value', out.textareaValue === 'world'],
  ['no page errors', errors.length === 0],
];

let bad = 0;
console.log('');
for (const [name, ok] of checks) {
  console.log((ok ? 'PASS  ' : 'FAIL  ') + name);
  if (!ok) bad += 1;
}
console.log('');
console.log(bad ? 'RED: ' + bad + ' check(s) failed' : 'GREEN: the browser still goes through the native setter');
process.exit(bad ? 1 : 0);
