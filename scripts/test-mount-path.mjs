#!/usr/bin/env node
/* =====================================================================
   test-mount-path.mjs -- behaviour tests for
   scripts/check-mount-path.mjs.

   WHY. The rule that gate carries -- this system is served under
   /nac-spec/ and is not supported at another root (owner decision D-02,
   2026-10-30) -- was invisible for the whole life of the project: it was
   discovered by standing the tree up at another root and watching two
   404s. A lock written for an invisible rule and never seen refusing is
   just a second invisible rule. So each case here plants ONE real
   disagreement in a throwaway tree and asserts the gate REFUSES it,
   naming what it refused -- a red case that fails for the wrong reason
   is not a passing red case.

   Writing these found a defect in the gate itself, which is the point.
   The first version bounded a <script> tag at the first `>`; the 13 demo
   pages write their cache-buster with PHP inside the attribute, so `?>`
   ended the tag early and the scan read ZERO scripts on six of them and
   printed PASSED. Two cases below pin that shape -- a server tag, and a
   different templating syntax that would do the same thing tomorrow.

   Usage:  node scripts/test-mount-path.mjs
   Exit:   0 every case behaved, 1 any case did not
   ===================================================================== */

import { mkdtempSync, mkdirSync, writeFileSync, rmSync, cpSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const GATE = join('scripts', 'check-mount-path.mjs');

/* The runtime tag the generator really emits, byte for byte. */
const SHIPPED_TAG = '<script src="/nac-spec/js/nac.js?v=v25"></script>';
/* What the same tag looks like when the mount is dropped -- the shape
   the N0 receipt recorded on 2026-10-24: served from another root, the
   page asks for a path that belongs to somebody else and gets a 404. */
const OFF_MOUNT_TAG = '<script src="/js/nac.js?v=v25"></script>';

let passed = 0;
const failures = [];

function page(body) {
  return '<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="utf-8" />\n</head>\n<body>\n'
    + body + '\n</body>\n</html>\n';
}

/* Every file the gate reads the mount literal out of, mirrored into the
   scratch tree so that a case about PAGES is not silently a case about
   declarations. Kept in sync with the gate by reading the gate's own
   list -- a hand-copied list here would rot the first time the gate
   gains a declaration site. */
function declarationSites() {
  const src = readFileSync(join(ROOT, GATE), 'utf8');
  const block = src.match(/const DECLARATION_SITES = \[([\s\S]*?)\];/);
  if (!block) {
    console.log('FAILED   the gate no longer exposes DECLARATION_SITES -- this suite cannot mirror it');
    process.exit(1);
  }
  return [...block[1].matchAll(/\['([^']+)',/g)].map((m) => m[1]);
}

const SITES = declarationSites();

/* A scratch tree that passes the gate: one generated page on the mount,
   one hand-written page loading the runtime relatively, the two declared
   off-mount exceptions, and every declaration site carrying the literal.
   Each case mutates it. */
function sandbox() {
  const dir = mkdtempSync(join(tmpdir(), 'nac3-mount-'));
  mkdirSync(join(dir, 'scripts'), { recursive: true });
  mkdirSync(join(dir, 'js'), { recursive: true });
  mkdirSync(join(dir, 'e2e', 'fixtures'), { recursive: true });
  mkdirSync(join(dir, 'packages', 'nac-react-demo'), { recursive: true });
  mkdirSync(join(dir, '.github', 'workflows'), { recursive: true });
  cpSync(join(ROOT, GATE), join(dir, GATE));

  for (const site of SITES) {
    mkdirSync(join(dir, dirname(site)), { recursive: true });
    if (site === 'package.json') {
      writeFileSync(join(dir, site),
        '{\n  "scripts": {\n    "smoke:live": "node x --base https://yujin.app/nac-spec/"\n  }\n}\n', 'utf8');
    } else if (site === GATE.split('\\').join('/')) {
      /* already copied */
    } else {
      writeFileSync(join(dir, site), '# declares the mount: /nac-spec/\n', 'utf8');
    }
  }

  writeFileSync(join(dir, 'js', 'nac.js'), 'window.NAC = {};\n', 'utf8');
  writeFileSync(join(dir, 'SPEC.html'), page(SHIPPED_TAG), 'utf8');
  writeFileSync(join(dir, 'index.html'), page('<script src="js/nac.js"></script>'), 'utf8');
  /* The two exceptions have to be present and still off-mount, or the
     gate refuses them as stale -- which is itself a case below. */
  writeFileSync(join(dir, 'e2e', 'fixtures', 'level-2-page.html'), page(OFF_MOUNT_TAG), 'utf8');
  writeFileSync(join(dir, 'packages', 'nac-react-demo', 'index.html'),
    page('<script type="module" src="/src/main.tsx"></script>'), 'utf8');
  return dir;
}

function run(dir) {
  const r = spawnSync(process.execPath, [join(dir, GATE)], { encoding: 'utf8' });
  return { code: r.status, out: (r.stdout || '') + (r.stderr || '') };
}

function testCase(label, expect, mutate, expectText) {
  const dir = mutate === 'ROOT' ? ROOT : sandbox();
  try {
    if (typeof mutate === 'function') mutate(dir);
    const { code, out } = run(dir);
    const isGreen = code === 0;
    let ok = expect === 'green' ? isGreen : !isGreen;
    let why = '';
    if (!ok) why = isGreen ? 'the gate accepted it' : 'the gate refused it';
    if (ok && expect === 'red' && expectText && !out.includes(expectText)) {
      ok = false;
      why = 'refused, but never named "' + expectText + '"';
    }
    console.log((ok ? (expect === 'green' ? 'GREEN-OK ' : 'RED-OK   ') : 'FAILED   ') + label
      + (ok ? '' : '  [' + why + ']'));
    if (ok) passed++;
    else {
      failures.push(label + ': ' + why);
      console.log(out.split('\n').slice(0, 10).map((l) => '         ' + l).join('\n'));
    }
  } finally {
    if (dir !== ROOT) rmSync(dir, { recursive: true, force: true });
  }
}

console.log('mount path gate -- behaviour\n');

testCase('the committed tree agrees on the mount', 'green', 'ROOT');

testCase('a scratch tree on the mount passes', 'green', null);

/* --- 1. the mount rule ------------------------------------------- */

testCase('the runtime tag with the mount dropped is refused -- the N0 404 shape', 'red',
  (dir) => writeFileSync(join(dir, 'SPEC.html'), page(OFF_MOUNT_TAG), 'utf8'),
  '/js/nac.js');

testCase('a root-absolute href outside the mount is refused', 'red',
  (dir) => writeFileSync(join(dir, 'docs.html'), page(
    '<a href="/guides/start.html">start</a>' + SHIPPED_TAG), 'utf8'),
  '/guides/start.html');

testCase('a root-absolute stylesheet outside the mount is refused', 'red',
  (dir) => writeFileSync(join(dir, 'docs.html'),
    '<!DOCTYPE html><html><head><link rel="stylesheet" href="/css/yujin-tokens.css" /></head>'
    + '<body></body></html>\n', 'utf8'),
  '/css/yujin-tokens.css');

testCase('a page at the site root is judged like any other', 'red',
  (dir) => writeFileSync(join(dir, 'index.html'), page(
    '<script src="/js/nac.js"></script>'), 'utf8'),
  'index.html');

testCase('a mount-shaped prefix that is not the mount does not pass as one', 'red',
  (dir) => writeFileSync(join(dir, 'docs.html'), page(
    '<script src="/nac-spec-v2/js/nac.js"></script>'), 'utf8'),
  '/nac-spec-v2/js/nac.js');

testCase('an off-mount reference inside a .php page is refused too', 'red',
  (dir) => writeFileSync(join(dir, 'example.php'), page(
    '<script src="/js/nac.js"></script>'), 'utf8'),
  'example.php');

/* --- 2. runtime reachability ------------------------------------- */

testCase('a relative runtime src that does not resolve is refused', 'red',
  (dir) => writeFileSync(join(dir, 'index.html'), page(
    '<script src="js/nac-v2-extensions.js"></script>'), 'utf8'),
  'does not resolve');

testCase('a relative src climbing out of the tree is refused', 'red',
  (dir) => writeFileSync(join(dir, 'index.html'), page(
    '<script src="../outside/nac.js"></script>'), 'utf8'),
  'nac.js');

testCase('a relative src with a query string still resolves', 'green',
  (dir) => writeFileSync(join(dir, 'index.html'), page(
    '<script src="js/nac.js?v=v25"></script>'), 'utf8'));

/* --- the blind-scan guard (the defect this suite found) ---------- */

testCase('a PHP cache-buster inside the attribute does not blind the scan', 'red',
  (dir) => writeFileSync(join(dir, 'example.php'), page(
    '<script src="js/missing.js?v=<?php echo htmlspecialchars($v); ?>"></script>'), 'utf8'),
  'js/missing.js');

testCase('the same page with the file present passes', 'green',
  (dir) => writeFileSync(join(dir, 'example.php'), page(
    '<script src="js/nac.js?v=<?php echo htmlspecialchars($v); ?>"></script>'), 'utf8'));

testCase('a templating syntax the scanner cannot read is refused, not skipped', 'red',
  (dir) => writeFileSync(join(dir, 'docs.html'), page(
    '<script src="js/nac.js?v=<%= assetVersion %>"></script>'), 'utf8'),
  'cannot see what the page loads');

/* --- 3. producer/consumer symmetry ------------------------------- */

testCase('a declaration site that moved the mount alone is refused', 'red',
  (dir) => writeFileSync(join(dir, 'package.json'),
    '{\n  "scripts": {\n    "smoke:live": "node x --base https://yujin.app/nac3/"\n  }\n}\n', 'utf8'),
  'package.json');

testCase('the deploy target losing the mount is refused', 'red',
  (dir) => writeFileSync(join(dir, '.github', 'workflows', 'deploy.yml'),
    '# the rsync target was rewritten and nobody told the pages\n', 'utf8'),
  'deploy.yml');

testCase('a declaration site that disappeared is refused', 'red',
  (dir) => rmSync(join(dir, 'scripts', 'build-sitemap.mjs')),
  'does not exist');

/* --- the exception list cannot outlive its reason ---------------- */

testCase('an exception whose file is gone is refused', 'red',
  (dir) => rmSync(join(dir, 'e2e', 'fixtures', 'level-2-page.html')),
  'no longer exists');

testCase('an exception with nothing left to except is refused', 'red',
  (dir) => writeFileSync(join(dir, 'packages', 'nac-react-demo', 'index.html'),
    page('<script type="module" src="src/main.tsx"></script>'), 'utf8'),
  'carries no off-mount reference any more');

/* --- what the gate is not asked to demand ------------------------ */

testCase('another origin, a data URI, a mail link and a fragment are not demanded', 'green',
  (dir) => writeFileSync(join(dir, 'docs.html'), page(
    '<script src="https://cdn.example.com/x.js"></script>\n'
    + '<script src="//cdn.example.com/y.js"></script>\n'
    + '<img src="data:image/gif;base64,R0lGOD" alt="" />\n'
    + '<a href="mailto:hola@example.com">mail</a>\n'
    + '<a href="#top">top</a>\n'
    + '<a href="guides/start.html">relative link</a>'), 'utf8'));

testCase('a tree with no page at all is refused, not passed over', 'red',
  (dir) => {
    rmSync(join(dir, 'SPEC.html'));
    rmSync(join(dir, 'index.html'));
    rmSync(join(dir, 'e2e', 'fixtures', 'level-2-page.html'));
    rmSync(join(dir, 'packages', 'nac-react-demo', 'index.html'));
  },
  'empty scan is not a pass');

console.log('');
if (failures.length) {
  console.log(passed + ' passed, ' + failures.length + ' failed');
  for (const f of failures) console.log('  ' + f);
  process.exit(1);
}
console.log(passed + ' passed, 0 failed');
console.log('The mount path gate refuses every disagreement with /nac-spec/ it claims to guard.');
