#!/usr/bin/env node
/* =====================================================================
   test-integrity-load.mjs -- proof that the landing page still runs
   with Subresource Integrity enforced (audit N-02).

   A hash in the HTML is a claim. This is the receipt: it serves the
   repository over a real HTTP server, opens the landing page in a real
   browser, and fails if any script is refused for a digest mismatch.

   Why this cannot be a grep: the browser is the only thing that decides
   whether integrity passes. A wrong hash looks perfect in the file and
   yields a blank page.

   Usage: node scripts/test-integrity-load.mjs
   ===================================================================== */

import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
};

const server = createServer((req, res) => {
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

const fails = [];
const oks = [];

await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = server.address().port;
const base = `http://127.0.0.1:${port}`;

const browser = await chromium.launch();
const page = await browser.newPage();
const integrityErrors = [];
const pageErrors = [];

page.on('console', (m) => {
  if (m.type() === 'error' && /integrity/i.test(m.text())) integrityErrors.push(m.text());
});
page.on('pageerror', (e) => pageErrors.push(String(e)));

try {
  const resp = await page.goto(`${base}/index.html`, { waitUntil: 'load', timeout: 30000 });
  oks.push(`landing responded HTTP ${resp.status()}`);

  const loaded = await page.evaluate(() =>
    Array.from(document.querySelectorAll('script[src]')).map((s) => ({
      src: s.getAttribute('src'),
      integrity: s.getAttribute('integrity'),
      loaded: true,
    }))
  );

  const nacType = await page.evaluate(() => typeof window.NAC);
  if (nacType === 'object') oks.push('window.NAC is present after load');
  else fails.push(`window.NAC is ${nacType} -- the runtime did not execute`);

  const untagged = loaded.filter((s) => /nac(-v2-extensions|-chat-client)?\.js|2\.5\.0-alpha\.5\/nac\.js/.test(s.src) && !s.integrity);
  if (untagged.length) fails.push(`${untagged.length} runtime script tag(s) carry no integrity attribute: ${untagged.map((s) => s.src).join(', ')}`);
  else oks.push(`${loaded.filter((s) => s.integrity).length} script tag(s) carry an integrity attribute`);

  if (integrityErrors.length) fails.push(`browser refused a script: ${integrityErrors[0]}`);
  else oks.push('no digest-mismatch refusal in the console');

  if (pageErrors.length) fails.push(`page error: ${pageErrors[0]}`);
  else oks.push('no uncaught page error');
} finally {
  await browser.close();
  server.close();
}

for (const o of oks) console.log('OK    ' + o);
for (const f of fails) console.error('FAIL  ' + f);
console.log(fails.length ? '\nIntegrity load test FAILED.' : '\nIntegrity load test PASSED.');
process.exit(fails.length ? 1 : 0);
