#!/usr/bin/env node
/* =====================================================================
   check-tree-links.mjs -- refuse a tree whose own pages point at files
   it does not contain.

   WHY THIS EXISTS. Measured 2026-11-07 by crawling the live site: two
   defects of the same shape were in production and nothing in the chain
   could see either, because every gate we had reads a DIFFERENT thing --
   the version literal, the mount literal, the stylesheet links, the
   published tarball. Nobody asked the simplest question: does the file
   this page names exist?

     1. five pages one level below the mount root loaded
        ../assets/favicon.svg, which from that depth resolves to
        /nac-spec/assets/favicon.svg -- a path the tree never had. The
        six pages AT the root resolved the same literal to the site's
        own /assets/favicon.svg and worked, which is why it survived.
     2. the nine translated spec pages carried the English page's
        relative [rfcs/README.md] verbatim from two levels down: nine
        404s for a directory that is not localized.

   WHAT THIS CHECKS. For every page in the tree (.html and .php), every
   href/src that names something INSIDE this tree must resolve to a file
   that exists:
     - root-absolute under the mount  -> resolved against the repo root
     - relative                       -> resolved against the page's dir
   External URLs, fragments, mailto:, data: and the non-http schemes the
   spec demonstrates are not this gate's business and are left alone. A
   root-absolute reference OUTSIDE the mount is check-mount-path.mjs's
   business, not this one.

   NOT IN check:release YET, AND THAT IS DECLARED, NOT FORGOTTEN. Run
   against the tree of 2026-11-07, after the two defects above were
   fixed, this gate still reports 57 references across 21 missing
   targets -- all of them in the May-era translated companion docs and
   guides (27 of them one single shape: i18n/<loc>/{CONTRIBUTING,
   README_DEMOS,SECURITY}.html linking ../SPEC.md, which from two levels
   down names i18n/SPEC.md and not the root SPEC.md). Those are
   pre-existing defects in documents whose EXISTENCE is an owner
   decision (several name a translated doc that was never written), so
   wiring the gate into the chain today would only block every push.
   It is wired as `npm run check:tree-links` and tracked in the pending
   registry; it joins check:release the day it is green.

   Its red is scripts/test-tree-links.mjs.

   Usage:  node scripts/check-tree-links.mjs [--survey]
   Exit:   0 every in-tree reference resolves, 1 at least one does not
   ===================================================================== */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const MOUNT = '/nac-spec/';
const SURVEY = process.argv.includes('--survey');

/* Directories that are not part of what the site serves. */
const SKIP_DIRS = new Set([
  'node_modules', '.git', '.tmp', '.translation-parts', 'dist',
  '.forge', '.yujin-forge', 'test-results', 'playwright-report',
]);

export function pagesOf(root = ROOT) {
  const out = [];
  (function walk(dir) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (e.isDirectory()) {
        if (SKIP_DIRS.has(e.name)) continue;
        walk(path.join(dir, e.name));
      } else if (/\.(html|php)$/i.test(e.name)) {
        out.push(path.join(dir, e.name));
      }
    }
  })(root);
  return out.sort();
}

/* Every href/src a page declares, with the attribute it came from. */
export function refsOf(html) {
  const out = [];
  const re = /\b(href|src)\s*=\s*["']([^"']*)["']/gi;
  let m;
  while ((m = re.exec(html))) out.push({ attr: m[1].toLowerCase(), url: m[2].trim() });
  return out;
}

/* Does this reference name something inside this tree? If so, where on
   disk should it be? Returns null when the reference is not ours. */
export function resolveInTree(url, pageDir, root = ROOT) {
  if (!url) return null;
  if (url.startsWith('#')) return null;
  if (/^[a-z][a-z0-9+.-]*:/i.test(url)) return null;      // any scheme
  if (url.startsWith('//')) return null;                   // protocol-relative
  const clean = url.split(/[#?]/)[0];
  if (!clean) return null;
  if (clean.startsWith('/')) {
    if (!clean.startsWith(MOUNT)) return null;             // check-mount-path owns this
    return path.join(root, clean.slice(MOUNT.length));
  }
  return path.resolve(pageDir, clean);
}

function main() {
  const pages = pagesOf();
  const problems = [];
  let checked = 0;

  for (const page of pages) {
    const html = fs.readFileSync(page, 'utf8');
    const pageDir = path.dirname(page);
    for (const ref of refsOf(html)) {
      const target = resolveInTree(ref.url, pageDir);
      if (!target) continue;
      checked++;
      /* A directory reference is served by its index; accept either. */
      let ok = fs.existsSync(target);
      if (ok && fs.statSync(target).isDirectory()) {
        ok = ['index.html', 'index.php'].some((i) => fs.existsSync(path.join(target, i)));
      }
      if (!ok) {
        problems.push({
          page: path.relative(ROOT, page).split(path.sep).join('/'),
          ref: `${ref.attr}=${ref.url}`,
          target: path.relative(ROOT, target).split(path.sep).join('/'),
        });
      }
    }
  }

  console.log(`tree links -- ${pages.length} page(s), ${checked} in-tree reference(s)`);
  if (problems.length === 0) {
    console.log('  every in-tree reference resolves to a file this tree contains');
    return 0;
  }
  /* Group by the missing target: one missing file is usually many pages. */
  const byTarget = new Map();
  for (const p of problems) {
    if (!byTarget.has(p.target)) byTarget.set(p.target, []);
    byTarget.get(p.target).push(p);
  }
  console.log(`  ${problems.length} reference(s) across ${byTarget.size} missing target(s):`);
  for (const [target, list] of [...byTarget].sort((a, b) => b[1].length - a[1].length)) {
    console.log(`\n  MISSING ${target}   (${list.length} reference(s))`);
    for (const p of list.slice(0, 6)) console.log(`      ${p.page}   ${p.ref}`);
    if (list.length > 6) console.log(`      ... and ${list.length - 6} more`);
  }
  if (SURVEY) {
    console.log('\n--survey: reporting only, not failing');
    return 0;
  }
  console.log(`\nTree links gate FAILED: ${problems.length} reference(s) name a file this tree does not contain.`);
  return 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exit(main());
}
