#!/usr/bin/env node
/* =====================================================================
   check-mount-path.mjs -- this system is served under /nac-spec/ and is
   not supported at another root. This gate is where that rule is
   WRITTEN and the only thing that verifies it.

   WHY THIS EXISTS. Measured 2026-10-30: 273 generated pages load the
   runtime by root-absolute path (/nac-spec/js/nac.js and
   /nac-spec/js/nac-v2-extensions.js) -- 235 under i18n/, 21 under
   docs/, 11 under guides/, 6 at the root. The 14 hand-written entry
   pages (index.html and the 13 example-*.php) load it by RELATIVE path,
   so those do open from any root. The absolute path is emitted by ONE
   producer, scripts/build-spec-html.mjs: the 273 pages are its output,
   not 273 decisions. It is there for a reason -- the generated pages sit
   at different depths (i18n/ja/docs/x.html, guides/y.html, z.html) and a
   correct relative prefix is not a literal but a function of depth.

   So the tree is nailed to /nac-spec/. In production that is invisible,
   because production IS /nac-spec/. Served from any other root, most
   pages load with no runtime at all: the N0 receipt of 2026-10-24
   recorded exactly that -- two 404s and a page that looks fine.

   This was discrepancy D-02. The owner decided it on 2026-10-30
   (docs/DECISIONS.md D-02): the current behaviour IS the specification.
   The mount requirement gets written down and locked instead of being
   discovered by standing the tree up somewhere else and watching it
   fail. Nothing was regenerated and the generator was not touched.

   WHAT IT PROVES, on the tree that gets deployed:
     1. MOUNT RULE -- no page carries a root-absolute local reference
        outside /nac-spec/. Such a reference 404s in production, where
        the root belongs to another site.
     2. RUNTIME REACHABILITY -- every <script> a page loads is either
        under the mount, or a relative path that resolves on disk. This
        is the half the landing promises for the hand-written demos
        ("All of them open in your browser").
     3. PRODUCER/CONSUMER SYMMETRY -- every place that declares the
        mount still agrees with it. The literal is repeated across the
        deploy target, the live checks, the generators and the sibling
        gates; one of them moving alone is the defect this catches.

   WHAT IT DOES NOT PROVE, stated so nobody reads it as more:
     - it does not check that a root-absolute reference RESOLVES. Three
       dead links were measured while writing this (two localized
       portal-tester pages and docs/README_TESTER_FORMS.html) and are
       registered with their evidence as PND-074; they were not touched
       here, because this gate was asked to verify the mount rule and
       nothing else;
     - it fetches nothing: a host that fails to serve a file that does
       exist in the tree is caught by the live checks
       (scripts/smoke-live-landing.mjs, scripts/verify-contract-api.mjs);
     - it reads markup, so a path built at runtime by script is outside
       its claim;
     - it does not prove the mount is /nac-spec/ on the server. It proves
       the tree and every declaration in it agree on one mount. The
       deploy target in .github/workflows/deploy.yml is the other end.

   Usage:  node scripts/check-mount-path.mjs
   Exit:   0 the tree agrees on the mount, 1 anything disagrees
   ===================================================================== */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/* THE RULE, written once. Everything below is verification of it. */
const MOUNT = '/nac-spec/';

/* Not deployed, not ours, or scratch -- the same set the sibling
   stylesheet gate skips. Everything else in the tree IS uploaded:
   .github/workflows/deploy.yml rsyncs the whole working copy minus a
   named list, so "it is only a fixture" does not mean "it is not
   published". */
const SKIP_DIRS = new Set(['node_modules', '.git', '.yujin-forge', '.tmp', '_deploy_stage']);

/* Pages that are NOT product pages and knowingly carry a root-absolute
   reference belonging to a dev server rather than to this site. Each one
   is pinned by exact path with the reason and the date it was measured;
   an entry that stops being needed makes this gate RED, so the list
   cannot quietly outlive its reason. These two do get uploaded by the
   deploy, and that -- a Vite source entry and a CLI test fixture landing
   on the live server -- is a finding of its own, registered with its
   evidence as PND-075, not something this gate was asked to fix. */
const OFF_MOUNT_EXCEPTIONS = new Map([
  ['e2e/fixtures/level-2-page.html',
    'CLI level fixture for scripts/test-cli-levels.mjs, served from the repo root by that test; not linked from the site (measured 2026-10-30)'],
  ['packages/nac-react-demo/index.html',
    'Vite dev entry for the React demo SOURCE; the built demo is demos/react/ (measured 2026-10-30)'],
]);

/* Every place that repeats the mount literal, measured 2026-10-30. A
   gate that only checked the pages would let the deploy target and the
   pages drift apart in silence, which is the same shape as every other
   finding in this repository: two sides asserting the same fact with
   nothing comparing them. */
const DECLARATION_SITES = [
  ['.github/workflows/deploy.yml', 'the rsync target on the server -- the other end of the mount'],
  ['package.json', 'the smoke:live base URL'],
  ['scripts/build-spec-html.mjs', 'the producer of the 273 absolute runtime tags'],
  ['scripts/build-sitemap.mjs', 'the sitemap base URL'],
  ['scripts/build-translation-banners.mjs', 'the canonical URL of the normative page'],
  ['scripts/sign-contract-api.mjs', 'the public base the contract is signed for'],
  ['scripts/verify-contract-api.mjs', 'the default base the live contract is verified at'],
  ['scripts/check-stylesheet-links.mjs', 'the prefix the stylesheet gate strips to resolve a href'],
  ['scripts/smoke-live-landing.mjs', 'the documented base of the post-deploy smoke check'],
  ['e2e/translations-check.mjs', 'the prefix the browser gate strips when serving locally'],
];

function pages(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) pages(p, out);
    else if (/\.(html|php)$/i.test(e.name)) out.push(p);
  }
  return out;
}

const rel = (p) => path.relative(ROOT, p).split(path.sep).join('/');

/* Server tags come out before anything is scanned. The 13 demo pages
   write their cache-busting version with PHP inside the attribute --
   <script src="js/nac.js?v=<?php echo htmlspecialchars($v); ?>"> -- and
   the `?>` closes the tag as far as a markup scanner is concerned. The
   first version of this gate measured ZERO scripts on six of those
   pages and printed PASSED, which is the exact failure this repository
   keeps finding in its own locks: a check that reads nothing and reports
   green. Found by counting what the scan saw against what grep saw. */
function stripServerTags(src) {
  return src.replace(/<\?(?:php|=)?[\s\S]*?\?>/g, 'SERVERVALUE');
}

/* Not a local path: another origin, an inline payload, a protocol
   handler, or a reference that never leaves the page. */
function isNotLocal(ref) {
  return /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(ref) || ref.startsWith('#') || ref.trim() === '';
}

/* Every shape a page can name a path in. Deliberately wider than what
   the tree uses today (measured: only src and href carry absolute
   paths): a gate that only looks where the defect already is stops
   locking the moment someone writes an <img srcset> or a url() in an
   inline style. */
function references(src) {
  const found = [];
  const attrRe = /\b(src|href|action|formaction|poster|data|srcset)\s*=\s*["']([^"']*)["']/gi;
  for (const m of src.matchAll(attrRe)) {
    const attr = m[1].toLowerCase();
    if (attr === 'srcset') {
      for (const part of m[2].split(',')) {
        const url = part.trim().split(/\s+/)[0];
        if (url) found.push({ attr, url });
      }
    } else {
      found.push({ attr, url: m[2] });
    }
  }
  for (const m of src.matchAll(/url\(\s*["']?([^"')\s]+)/gi)) {
    found.push({ attr: 'css url()', url: m[1] });
  }
  return found;
}

function scriptSources(src) {
  const found = [];
  for (const m of src.matchAll(/<script\b[^>]*>/gi)) {
    const url = (m[0].match(/\bsrc\s*=\s*["']([^"']*)["']/i) || [])[1];
    if (url) found.push(url);
  }
  return found;
}

/* How many script tags with a src the page HAS, counted a second way,
   without relying on where the tag ends. If this disagrees with what
   scriptSources read, the scan is blind on that page and the gate
   refuses instead of reporting on what it managed to see. */
function scriptSourceCount(src) {
  return [...src.matchAll(/<script\b[^>]*\bsrc\s*=\s*["'][^"']+["']/gi)].length;
}

const files = pages(ROOT);

/* An empty or thinned scan is a refusal, not a pass: a gate that finds
   nothing and prints OK is the failure mode this repository keeps
   finding in its own locks. */
if (files.length === 0) {
  console.log('REFUSED  no .html or .php page was found to scan -- an empty scan is not a pass');
  process.exit(1);
}

const problems = [];
const exceptionsUsed = new Set();
let onMount = 0;
let relativeScripts = 0;

for (const file of files.sort()) {
  const where = rel(file);
  const excepted = OFF_MOUNT_EXCEPTIONS.has(where);
  const src = stripServerTags(fs.readFileSync(file, 'utf8'));

  /* 1. the mount rule */
  for (const ref of references(src)) {
    if (isNotLocal(ref.url)) continue;
    if (!ref.url.startsWith('/')) continue;
    if (ref.url.startsWith(MOUNT) || ref.url === MOUNT.replace(/\/$/, '')) { onMount++; continue; }
    if (excepted) { exceptionsUsed.add(where); continue; }
    problems.push({
      kind: 'mount',
      where,
      detail: `${ref.attr}=${ref.url} is root-absolute but outside ${MOUNT}`,
    });
  }

  /* 2. runtime reachability */
  const read = scriptSources(src);
  const present = scriptSourceCount(src);
  if (read.length < present) {
    problems.push({
      kind: 'blind',
      where,
      detail: `the scan read ${read.length} of ${present} <script src> tag(s) on this page `
        + '-- something in the markup ends the tag early, so this gate cannot see what the page loads',
    });
  }
  for (const url of read) {
    if (isNotLocal(url)) continue;
    if (url.startsWith('/')) continue; /* already judged by the mount rule */
    relativeScripts++;
    const clean = url.split('#')[0].split('?')[0];
    const target = path.resolve(path.dirname(file), clean);
    if (!fs.existsSync(target)) {
      problems.push({
        kind: 'script',
        where,
        detail: `<script src="${url}"> does not resolve `
          + `(expected ${rel(target) || '?'}) -- the page would load with no runtime at any root`,
      });
    }
  }
}

/* An exception that no longer applies is removed, not inherited. */
for (const [where, reason] of OFF_MOUNT_EXCEPTIONS) {
  if (!fs.existsSync(path.join(ROOT, where))) {
    problems.push({
      kind: 'stale',
      where,
      detail: `declared as an off-mount exception but the file no longer exists -- drop the entry (${reason})`,
    });
  } else if (!exceptionsUsed.has(where)) {
    problems.push({
      kind: 'stale',
      where,
      detail: 'declared as an off-mount exception but carries no off-mount reference any more -- drop the entry',
    });
  }
}

/* 3. producer/consumer symmetry on the literal */
let declarations = 0;
for (const [site, role] of DECLARATION_SITES) {
  const full = path.join(ROOT, site);
  if (!fs.existsSync(full)) {
    problems.push({ kind: 'declaration', where: site, detail: `declares the mount (${role}) but does not exist` });
    continue;
  }
  if (!fs.readFileSync(full, 'utf8').includes(MOUNT)) {
    problems.push({
      kind: 'declaration',
      where: site,
      detail: `no longer contains ${MOUNT} -- it declares the mount (${role}), so the tree now disagrees with itself`,
    });
    continue;
  }
  declarations++;
}

console.log(`mount path -- the system is served under ${MOUNT}`);
console.log(`  ${files.length} page(s) scanned, ${onMount} reference(s) under the mount, `
  + `${relativeScripts} relative <script> src(s) resolved`);
console.log(`  ${declarations}/${DECLARATION_SITES.length} declaration site(s) agree on the literal`);
for (const [where, reason] of OFF_MOUNT_EXCEPTIONS) {
  if (exceptionsUsed.has(where)) console.log(`  exception: ${where} -- ${reason}`);
}
console.log('');

if (problems.length) {
  const order = { mount: 0, script: 1, blind: 2, stale: 3, declaration: 4 };
  for (const p of problems.sort((a, b) => order[a.kind] - order[b.kind])) {
    console.log(`REFUSED  ${p.where}`);
    console.log(`         ${p.detail}`);
  }
  console.log('');
  console.log(`Mount path gate FAILED: ${problems.length} disagreement(s) with ${MOUNT}.`);
  console.log(`This system is served under ${MOUNT} and is not supported at another root `
    + '(owner decision D-02, 2026-10-30, docs/DECISIONS.md).');
  process.exit(1);
}

console.log(`Mount path gate PASSED: every page and every declaration agrees the mount is ${MOUNT}.`);
