/*
 * snippet-install-check.mjs -- regression lock for audit N-40, from the
 * adopter side.
 *
 * The landing page offers a copy-paste install snippet: a URL plus an
 * integrity hash. For two days that hash matched no file ever
 * published -- it was computed over CRLF bytes from a Windows working
 * tree, while the server serves LF. Anyone who copied it got a browser
 * that refused to execute the runtime, and the only report of that is
 * a console line: it failed silently.
 *
 * The integrity gate now refuses any sha384 on the page that is not a
 * published hash. This asks the question one step further out, the way
 * an adopter experiences it, and deliberately trusts NEITHER side of
 * the gate: it reads the URL and the integrity value VERBATIM out of
 * index.html, serves those exact bytes over HTTP the way a CDN would,
 * and asks a real Chromium to execute the file under that exact hash.
 *
 * That is the N-40 lesson stated as a test: the gate had been
 * comparing the hash it generates, and the hash the page ADVERTISES
 * was a different string.
 *
 * Run: node e2e/snippet-install-check.mjs
 */
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';

const page_src = readFileSync('index.html', 'utf8');

/* The escaped snippet, read as published. */
const m = page_src.match(
  /&lt;script src=<span class="string">"([^"]*\/nac\.js)"<\/span>\s*\n\s*integrity=<span class="string">"(sha384-[A-Za-z0-9+/=]+)"<\/span>/
);
if (!m) {
  console.error('FAIL  cannot find the adopter snippet in index.html -- the anchor moved');
  process.exit(1);
}
const advertisedUrl = m[1];
const advertisedSri = m[2];
console.log('advertised url       ' + advertisedUrl);
console.log('advertised integrity ' + advertisedSri);

/* The path an adopter would fetch, mapped onto this repository. */
const pathOnly = advertisedUrl.replace(/^https?:\/\/[^/]+\/nac-spec\//, '');
console.log('resolved locally to  ' + pathOnly);

/* The version this gate expects is DERIVED from the URL the page
   advertises, not typed. It was typed -- `got.version === '2.5.0'` --
   which made this gate go red on the 2.5.1 for a reason that had
   nothing to do with an adopter: the only gate in the repository with
   a hard-coded version was the one written to catch a hand-written
   hash. Audit N-17 and N-42 are the same shape, and this is now the
   stronger assertion anyway: the runtime the page pins must report the
   version in the path the page pins it at. */
const advertisedVersion = (() => {
  const v = pathOnly.match(/^js\/([^/]+)\/nac\.js$/);
  if (!v) {
    console.error('FAIL  the advertised URL is not an immutable versioned path: ' + pathOnly);
    process.exit(1);
  }
  return v[1];
})();
console.log('advertised version   ' + advertisedVersion);
const bytes = readFileSync(pathOnly);
console.log('bytes                ' + bytes.length);

/* Served over HTTP, because SRI is not enforced on file:// in the same
   way and an adopter fetches it from a CDN. */
const server = createServer((req, res) => {
  if (req.url === '/runtime.js') {
    res.writeHead(200, { 'content-type': 'application/javascript' });
    res.end(bytes);
    return;
  }
  res.writeHead(200, { 'content-type': 'text/html' });
  res.end(
    '<!doctype html><html><body>'
    + '<script src="/runtime.js" integrity="' + advertisedSri + '" crossorigin="anonymous"></script>'
    + '</body></html>'
  );
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = server.address().port;

const browser = await chromium.launch();
const page = await browser.newPage();
const consoleErrors = [];
page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
page.on('pageerror', (e) => consoleErrors.push(String(e)));

await page.goto('http://127.0.0.1:' + port + '/', { waitUntil: 'load' });

const got = await page.evaluate(() => ({
  nacPresent: typeof window.NAC === 'object' && window.NAC !== null,
  version: window.NAC ? window.NAC.version : null,
}));

await browser.close();
server.close();

const digestRefusal = consoleErrors.filter((e) => /integrity|digest|Subresource/i.test(e));

console.log('');
console.log('console errors       ' + (consoleErrors.length ? consoleErrors.join(' | ') : 'none'));
console.log('window.NAC present   ' + got.nacPresent);
console.log('NAC.version          ' + got.version);

const checks = [
  ['the browser did NOT refuse the file for its hash', digestRefusal.length === 0],
  ['the runtime executed (window.NAC exists)', got.nacPresent === true],
  ['and it is the version the page advertises', got.version === advertisedVersion,
   'the page pins js/' + advertisedVersion + '/nac.js and the runtime reports ' + got.version],
  ['no console errors at all', consoleErrors.length === 0],
];

let bad = 0;
console.log('');
for (const [name, ok, detail] of checks) {
  /* The detail is printed on failure only, and it is the whole value of
     a red line: "FAIL and it is the version the page advertises" sent
     the reader to read the gate instead of the defect. */
  console.log((ok ? 'PASS  ' : 'FAIL  ') + name + (!ok && detail ? ' -- ' + detail : ''));
  if (!ok) bad += 1;
}
console.log('');
console.log(bad
  ? 'RED: an adopter who copies the published snippet gets a broken page'
  : 'GREEN: the published snippet works -- advertised hash matches advertised file');
process.exit(bad ? 1 : 0);
