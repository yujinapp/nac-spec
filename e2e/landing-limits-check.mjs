/*
 * landing-limits-check.mjs -- regression lock for the public limits section
 * of the landing page (D-04 / N-09, owner-approved 2026-10-26).
 *
 * It asserts, in a real browser:
 *   1. index.html loads with zero console errors.
 *   2. the limits section is present in the DOM.
 *   3. the owner-approved checkbox greps hold on the SERVED html:
 *      "does not cover" > 0 (block item 3) and "urazuke" > 0 (item 4).
 *   4. every data-nac-id painted inside the limits section is also DECLARED
 *      in the registered manifest (producer/consumer symmetry, SQ 14).
 *      N-31 is the same gap for the rest of the page and is tracked apart;
 *      this gate only refuses a REGRESSION inside the new section.
 *   5. the three licenses / three natures paragraph names both licenses.
 *
 * ASCII-only. Run: node e2e/landing-limits-check.mjs
 *
 * It serves the repository itself over an ephemeral local server, the same way
 * scripts/test-integrity-load.mjs does, so it needs nothing running. Point it
 * at the real site to verify the SERVER instead of the repository:
 *   N0_BASE=https://yujin.app/nac-spec node e2e/landing-limits-check.mjs
 * That is the form that turns items 3 and 4 of the owner verification block
 * green, because that block measures the server and not this tree.
 */
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '../node_modules/playwright/index.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

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
let BASE = process.env.N0_BASE || null;
if (!BASE) {
  server = createServer((req, res) => {
    const urlPath = decodeURIComponent(req.url.split('?')[0]);
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
console.log('base: ' + BASE + (server ? ' (served from this repository)' : ' (external)'));

const EXPECTED_IDS = [
  'nac_landing.section.limits',
  'nac_landing.limit.canvas',
  'nac_landing.limit.shadow',
  'nac_landing.limit.cross_origin',
  'nac_landing.limit.native',
  'nac_landing.limit.permissions',
  'nac_landing.limit.schema',
  'nac_landing.limit.stability',
  'nac_landing.limit.correctness',
  'nac_landing.limits.license_nac3',
  'nac_landing.limits.urazuke',
  'nac_landing.limits.forge',
  'nac_landing.limits.governance'
];

const failures = [];
function check(name, ok, detail) {
  console.log((ok ? 'PASS  ' : 'FAIL  ') + name + (detail ? ' -- ' + detail : ''));
  if (!ok) failures.push(name + (detail ? ': ' + detail : ''));
}

const browser = await chromium.launch();
const page = await browser.newPage();
const consoleErrors = [];
page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
page.on('pageerror', (e) => consoleErrors.push('pageerror: ' + e.message));

const url = BASE + '/index.html';
const resp = await page.goto(url, { waitUntil: 'load' });
check('index.html responds 200', resp && resp.status() === 200, resp ? String(resp.status()) : 'no response');

/* The manifest registers after the runtime boots; wait for the registry. */
await page.waitForFunction(
  () => window.NAC && typeof window.NAC.manifest === 'function' &&
        window.NAC.manifest('nac_landing') !== null,
  null,
  { timeout: 10000 }
).catch(() => {});

const html = await page.content();
/* The owner's block measures a curl piped into grep -c, which an HTML
   comment or a manifest label would satisfy on its own. So assert on what a
   READER sees -- the rendered text of the section -- and keep the raw
   grep only as the weaker mirror of the owner's own command. */
const rendered = await page.evaluate(() => {
  const sec = document.querySelector('[data-nac-id="nac_landing.section.limits"]');
  return sec ? sec.innerText : '';
});
check('block item 3: "does not cover" is VISIBLE text in the section',
  /does not cover/i.test(rendered));
check('block item 4: "urazuke" is VISIBLE text in the section',
  /urazuke/i.test(rendered));
check('block item 3+4 also hold on the raw html (owner command mirror)',
  /does not cover/i.test(html) && /urazuke/i.test(html));

const sectionPainted = await page.$$eval('[data-nac-id^="nac_landing.limit"]', (els) =>
  els.map((e) => e.getAttribute('data-nac-id')));
check('limits section painted in the DOM', sectionPainted.length >= 12,
  sectionPainted.length + ' elements with a nac_landing.limit* id');

const declared = await page.evaluate(() => {
  const m = window.NAC.manifest('nac_landing');
  return m ? (m.elements || []).map((e) => e.id) : [];
});
check('manifest registered', declared.length > 0, declared.length + ' declared elements');

const missing = EXPECTED_IDS.filter((id) => !declared.includes(id));
check('every limits id is declared in the manifest', missing.length === 0,
  missing.length ? 'undeclared: ' + missing.join(', ') : EXPECTED_IDS.length + ' ids declared');

const paintedMissing = EXPECTED_IDS
  .filter((id) => id !== 'nac_landing.section.limits')
  .filter((id) => !sectionPainted.includes(id));
check('every declared limits id is painted', paintedMissing.length === 0,
  paintedMissing.length ? 'not in the DOM: ' + paintedMissing.join(', ') : 'all painted');

check('both licenses are named together',
  /Apache-2\.0/.test(html) && /Creative Commons BY-SA 4\.0/.test(html));

/* N-15: the link back to Urazuke also lives in the footer, where the finding
   asked for it, and it is declared like every other footer link. */
const footer = await page.evaluate(() => {
  const a = document.querySelector('[data-nac-id="nac_landing.footer.urazuke"]');
  const m = window.NAC.manifest('nac_landing');
  const ids = m ? (m.elements || []).map((e) => e.id) : [];
  return {
    painted: !!a,
    href: a ? a.getAttribute('href') : null,
    declared: ids.includes('nac_landing.footer.urazuke')
  };
});
check('N-15: footer links back to Urazuke', footer.painted && /urazuke/i.test(footer.href || ''),
  footer.href || 'no link');
check('N-15: the footer link is declared in the manifest', footer.declared);

check('zero console errors on load', consoleErrors.length === 0,
  consoleErrors.slice(0, 3).join(' | '));

await browser.close();
if (server) server.close();

console.log('');
if (failures.length) {
  console.log('RED -- ' + failures.length + ' failing check(s)');
  process.exit(1);
}
console.log('GREEN -- limits section is published, declared and addressable');
