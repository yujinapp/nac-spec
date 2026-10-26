/*
 * translations-check.mjs -- regression lock for what the nine published
 * translations of the specification say about themselves, and for the
 * landing section that links them (decision D-03, option C, 2026-10-26).
 *
 * scripts/build-translation-banners.mjs is the producer and checks the
 * BYTES on disk. This gate checks the only thing those bytes exist for:
 * that a person and an agent actually receive the claim, in a real
 * browser. The two are not redundant -- the limits gate learned the hard
 * way that a string present in a file can be invisible on the page.
 *
 * It asserts, in a real browser:
 *   1. index.html loads with zero console errors and paints the
 *      translations section.
 *   2. "non-normative" is VISIBLE text inside that section, not merely
 *      present in the html.
 *   3. all nine locale links are painted, each one href'd at its page,
 *      each one carrying hreflang + lang, and each one DECLARED in the
 *      registered manifest (producer/consumer symmetry, SQ 14).
 *   4. for each of the nine pages: it responds, it declares
 *      <html lang="<locale>"> (ar also dir="rtl"), the banner is the
 *      FIRST thing in the document body region, its text is visible and
 *      carries the English normativity sentence, the banner element is
 *      declared in that page's manifest, and the page loads with zero
 *      console errors.
 *
 * ASCII-only. Run: node e2e/translations-check.mjs
 *   or against the server: node e2e/translations-check.mjs --base https://yujin.app/nac-spec/
 *
 * The local server answers both "/x" and "/nac-spec/x" for the same file,
 * because the nine translated pages pin the runtime at the absolute path
 * the site serves it from. Without that the pages would load with no
 * runtime and this gate would report a manifest failure that only exists
 * in the harness.
 */
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '../node_modules/playwright/index.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const LOCALES = ['es', 'pt', 'fr', 'it', 'de', 'ja', 'zh', 'hi', 'ar'];
const EN_LINE = 'Non-normative machine translation. The normative text of NAC3 is the English one.';

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
};

let server = null;
const baseFlag = (() => {
  const i = process.argv.indexOf('--base');
  if (i >= 0 && process.argv[i + 1]) return process.argv[i + 1];
  const inline = process.argv.find((a) => a.startsWith('--base='));
  return inline ? inline.slice('--base='.length) : null;
})();
let BASE = baseFlag || process.env.N0_BASE || null;
if (!BASE) {
  server = createServer((req, res) => {
    let urlPath = decodeURIComponent(req.url.split('?')[0]);
    if (urlPath.startsWith('/nac-spec/')) urlPath = urlPath.slice('/nac-spec'.length);
    let file = join(ROOT, urlPath);
    if (urlPath.endsWith('/')) file = join(file, 'index.html');
    if (!existsSync(file) || !statSync(file).isFile()) {
      res.writeHead(404, { 'content-type': 'text/plain' });
      res.end('not found');
      return;
    }
    res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream' });
    res.end(readFileSync(file));
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  BASE = 'http://127.0.0.1:' + server.address().port;
}
BASE = BASE.replace(/\/$/, '');
console.log('base: ' + BASE + (server ? ' (served from this repository)' : ' (external)'));
console.log('');

const failures = [];
function check(name, ok, detail) {
  console.log((ok ? 'PASS  ' : 'FAIL  ') + name + (detail ? ' -- ' + detail : ''));
  if (!ok) failures.push(name + (detail ? ': ' + detail : ''));
}

/* ONE tolerated 404, by URL, and it is printed on every run so nobody
   mistakes it for green. PND-053 / audit N-46: 262 published pages --
   SPEC.html among them -- link /nac-spec/css/yujin-tokens.css, which
   was never published and answers 404 on the site too. It is an owner
   decision (publish the file, or drop the link from the generator), so
   this gate names it instead of either failing on it forever or going
   blind to console errors. Any OTHER console error, and any other 404,
   is still red. When PND-053 closes, this tolerance comes out: that is
   part of its acceptance criterion. */
const TOLERATED_404 = /\/css\/yujin-tokens\.css(\?|$)/;
let toleratedSeen = 0;

/* A 404 is reported to the console as a generic sentence with no URL in
   it, so the URL comes from the response stream and the console line is
   only matched as the shape it is. */
function partition(errs, notFound) {
  const unexpected404 = notFound.filter((u) => !TOLERATED_404.test(u));
  toleratedSeen += notFound.length - unexpected404.length;
  const real = errs.filter((e) => !/Failed to load resource/.test(e));
  return { unexpected404, real };
}

const browser = await chromium.launch();

/* ---------------- 1..3  the landing ---------------- */

/* The locale is PINNED. The landing ships ten catalogues and i18n.js rewrites
   the page from the one matching the reader's browser, so the rendered text
   asserted below is in whatever language the machine running this happens to
   be: on a Spanish Windows these two checks went red over a page that says
   exactly what they ask, in Spanish. The English sentence is the one the lock
   is about -- it is the normative claim -- so the reader is pinned to English
   and the other locales are covered by the catalogue guard, which refuses an
   untranslated or missing value. */
const page = await browser.newPage({ locale: 'en-US' });
const landingErrors = [];
const landing404 = [];
page.on('console', (m) => { if (m.type() === 'error') landingErrors.push(m.text()); });
page.on('pageerror', (e) => landingErrors.push('pageerror: ' + e.message));
page.on('response', (r) => { if (r.status() === 404) landing404.push(r.url()); });

const resp = await page.goto(BASE + '/index.html', { waitUntil: 'load' });
check('index.html responds 200', resp && resp.status() === 200, resp ? String(resp.status()) : 'no response');

await page.waitForFunction(
  () => window.NAC && typeof window.NAC.manifest === 'function'
        && window.NAC.manifest('nac_landing') !== null,
  null, { timeout: 10000 },
).catch(() => {});

const section = await page.evaluate(() => {
  const sec = document.querySelector('[data-nac-id="nac_landing.section.translations"]');
  return sec ? { text: sec.innerText, present: true } : { text: '', present: false };
});
check('the landing paints the translations section', section.present);
check('"non-normative" is VISIBLE text in the section, not only in the html',
  /non-normative/i.test(section.text));
check('the section says the English text governs',
  /English text governs/i.test(section.text));

const links = await page.evaluate((locales) => locales.map((loc) => {
  const a = document.querySelector('[data-nac-id="nac_landing.translations.' + loc + '"]');
  return {
    loc,
    painted: !!a,
    href: a ? a.getAttribute('href') : null,
    hreflang: a ? a.getAttribute('hreflang') : null,
    lang: a ? a.getAttribute('lang') : null,
    text: a ? a.innerText.trim() : '',
  };
}), LOCALES);

for (const l of links) {
  check('landing links ' + l.loc,
    l.painted && l.href === 'i18n/' + l.loc + '/SPEC.html' && l.hreflang === l.loc && l.lang === l.loc && l.text.length > 0,
    l.painted ? 'href=' + l.href + ' hreflang=' + l.hreflang + ' lang=' + l.lang + ' text=' + JSON.stringify(l.text) : 'not painted');
}

const declaredLanding = await page.evaluate(() => {
  const m = window.NAC && window.NAC.manifest ? window.NAC.manifest('nac_landing') : null;
  return m ? (m.elements || []).map((e) => e.id) : [];
});
const wantLanding = ['nac_landing.section.translations', 'nac_landing.translations.list',
  'nac_landing.translations.canonical'].concat(LOCALES.map((l) => 'nac_landing.translations.' + l));
const undeclared = wantLanding.filter((id) => !declaredLanding.includes(id));
check('every id of the translations section is declared in the manifest',
  undeclared.length === 0,
  undeclared.length ? 'undeclared: ' + undeclared.join(', ') : wantLanding.length + ' ids declared');

{
  const { unexpected404, real } = partition(landingErrors, landing404);
  check('the landing loads with no console error and no unexpected 404',
    real.length === 0 && unexpected404.length === 0,
    real.concat(unexpected404).slice(0, 3).join(' | '));
}
await page.close();

/* ---------------- 4  the nine pages ---------------- */

for (const loc of LOCALES) {
  const p = await browser.newPage({ locale: 'en-US' });
  const errs = [];
  const nf = [];
  p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  p.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
  p.on('response', (r) => { if (r.status() === 404) nf.push(r.url()); });

  const r = await p.goto(BASE + '/i18n/' + loc + '/SPEC.html', { waitUntil: 'load' });
  check(loc + ': the page responds 200', r && r.status() === 200, r ? String(r.status()) : 'no response');

  await p.waitForFunction(
    () => window.NAC && typeof window.NAC.manifest === 'function'
          && window.NAC.manifest('spec') !== null,
    null, { timeout: 10000 },
  ).catch(() => {});

  const got = await p.evaluate(() => {
    const el = document.querySelector('[data-nac-id="spec.translation_notice"]');
    const main = document.querySelector('[data-nac-id="spec.main"]');
    const m = window.NAC && window.NAC.manifest ? window.NAC.manifest('spec') : null;
    return {
      lang: document.documentElement.getAttribute('lang'),
      dir: document.documentElement.getAttribute('dir'),
      present: !!el,
      first: !!(main && main.firstElementChild === el),
      text: el ? el.innerText : '',
      declared: m ? (m.elements || []).map((e) => e.id) : [],
      canonicalHref: (() => {
        const a = document.querySelector('[data-nac-id="spec.translation_notice.canonical"]');
        return a ? a.getAttribute('href') : null;
      })(),
    };
  });

  check(loc + ': declares lang="' + loc + '"', got.lang === loc, 'lang=' + got.lang);
  if (loc === 'ar') check('ar: declares dir="rtl"', got.dir === 'rtl', 'dir=' + got.dir);
  check(loc + ': the banner is the first thing in the document region',
    got.present && got.first, got.present ? (got.first ? 'first' : 'present but not first') : 'absent');
  check(loc + ': the banner text is visible and non-empty', got.text.trim().length > 40,
    got.text.trim().length + ' chars');
  check(loc + ': the banner carries the English normativity sentence',
    got.text.includes(EN_LINE));
  check(loc + ': the banner links the normative English text',
    got.canonicalHref === '/nac-spec/SPEC.html', 'href=' + got.canonicalHref);
  check(loc + ': the banner is declared in the page manifest',
    got.declared.includes('spec.translation_notice')
      && got.declared.includes('spec.translation_notice.canonical'),
    got.declared.length + ' declared elements');
  const { unexpected404, real } = partition(errs, nf);
  check(loc + ': the page loads with no console error and no unexpected 404',
    real.length === 0 && unexpected404.length === 0,
    real.concat(unexpected404).slice(0, 2).join(' | '));
  await p.close();
}

await browser.close();
if (server) server.close();

console.log('');
if (toleratedSeen) {
  console.log('WARN  ' + toleratedSeen + ' tolerated 404 response(s) for '
    + '/nac-spec/css/yujin-tokens.css -- audit N-46 / PND-053, an owner decision.');
  console.log('      This gate does not fail on it and does not call it fixed.');
  console.log('');
}
if (failures.length) {
  console.log('RED -- ' + failures.length + ' failing check(s)');
  for (const f of failures) console.log('  ' + f);
  process.exit(1);
}
console.log('GREEN -- the nine translations declare what they are, and the landing links them');
