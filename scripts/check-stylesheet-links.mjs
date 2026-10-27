#!/usr/bin/env node
/* =====================================================================
   check-stylesheet-links.mjs -- refuse any published page that links a
   stylesheet which does not resolve.

   WHY THIS EXISTS. On 2026-06-28 a single line entered the docs
   renderer: <link rel="stylesheet" href="/nac-spec/css/yujin-tokens.css">.
   The file was never written. For four months 262 published pages --
   SPEC.html, the page of the normative document, among them -- asked the
   server for it and got a 404 on every load. Nothing looked broken,
   because every custom property is used with an inline fallback, so the
   failure was silent: a console error on every page of the project whose
   argument is that it does not fail silently. Nobody read it; the
   browser gate for the nine translations found it by LOADING a page.
   PND-053 / audit N-46.

   The defect was not the missing file. The defect was that a page could
   claim a resource nobody checked existed -- the same shape as every
   other finding in this repository: something asserted without reading
   what it asserts. This gate closes that shape for stylesheets.

   WHAT IT PROVES: every local stylesheet a tracked page links (and every
   local @import inside an inline <style>) resolves to a file on disk in
   the tree that gets deployed.

   WHAT IT DOES NOT PROVE, stated so nobody reads it as more:
     - it does not fetch anything: a remote stylesheet (fonts, CDN) is
       not resolved here, and a host that fails to serve a file that DOES
       exist in the tree is caught by the live checks, not by this one
       (scripts/smoke-live-landing.mjs, e2e/translations-check.mjs);
     - it reads bytes, so a stylesheet that resolves but is empty, or one
       loaded by script at runtime, is outside its claim.

   Usage:  node scripts/check-stylesheet-links.mjs
   Exit:   0 every local stylesheet link resolves, 1 any does not
   ===================================================================== */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/* Not deployed, not ours, or scratch: node_modules and the vendored
   reports are third-party trees, .tmp is gitignored working space. */
const SKIP_DIRS = new Set(['node_modules', '.git', '.yujin-forge', '.tmp']);

/* The site is published under this prefix, so a root-absolute href the
   pages use is repo-relative with the prefix stripped. */
const SITE_PREFIX = '/nac-spec/';

function pages(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) pages(p, out);
    else if (e.name.endsWith('.html')) out.push(p);
  }
  return out;
}

function isRemote(href) {
  return /^(https?:)?\/\//i.test(href) || /^data:/i.test(href);
}

/* Where a href written on a page lands in this tree. */
function resolveHref(pageFile, href) {
  const clean = href.split('#')[0].split('?')[0];
  if (!clean) return null;
  if (clean.startsWith(SITE_PREFIX)) {
    return path.join(ROOT, clean.slice(SITE_PREFIX.length));
  }
  if (clean.startsWith('/')) return path.join(ROOT, clean.slice(1));
  return path.resolve(path.dirname(pageFile), clean);
}

/* Every <link> tag, whatever the attribute order or quoting, kept only
   when its rel names a stylesheet. Attribute order is not a contract:
   a gate that only matched rel="stylesheet" href="..." in that order
   would be fooled by a reformat, which is how a lock stops locking. */
function stylesheetHrefs(src) {
  const found = [];
  for (const m of src.matchAll(/<link\b[^>]*>/gi)) {
    const tag = m[0];
    const rel = (tag.match(/\brel\s*=\s*["']([^"']*)["']/i) || [])[1] || '';
    if (!/\bstylesheet\b/i.test(rel)) continue;
    const href = (tag.match(/\bhref\s*=\s*["']([^"']*)["']/i) || [])[1];
    found.push({ kind: 'link', href: href || '', tag });
  }
  /* @import inside an inline <style> fails exactly the same way. */
  for (const m of src.matchAll(/@import\s+(?:url\(\s*)?["']?([^"')\s;]+)/gi)) {
    found.push({ kind: '@import', href: m[1], tag: m[0] });
  }
  return found;
}

const files = pages(ROOT);

/* An empty or thinned scan is a refusal, not a pass: a gate that finds
   nothing and prints OK is the failure mode this repository keeps
   finding in its own locks. */
if (files.length === 0) {
  console.log('REFUSED  no .html page was found to scan -- an empty scan is not a pass');
  process.exit(1);
}

const problems = [];
let localLinks = 0;
let remoteLinks = 0;

for (const file of files.sort()) {
  const src = fs.readFileSync(file, 'utf8');
  for (const ref of stylesheetHrefs(src)) {
    const rel = path.relative(ROOT, file).split(path.sep).join('/');
    if (!ref.href) {
      problems.push(`${rel}: a ${ref.kind} stylesheet with no href -- ${ref.tag.slice(0, 80)}`);
      continue;
    }
    if (isRemote(ref.href)) { remoteLinks++; continue; }
    localLinks++;
    const target = resolveHref(file, ref.href);
    if (!target || !fs.existsSync(target)) {
      problems.push(`${rel}: ${ref.kind} ${ref.href} does not resolve `
        + `(expected ${path.relative(ROOT, target || '').split(path.sep).join('/') || '?'})`);
    }
  }
}

console.log(`stylesheet links -- ${files.length} page(s) scanned, `
  + `${localLinks} local stylesheet reference(s), ${remoteLinks} remote (not fetched)`);
console.log('');

if (problems.length) {
  /* Grouped by href: one missing file across 262 pages is ONE defect,
     and 262 lines would bury it. */
  const byHref = new Map();
  for (const p of problems) {
    const key = p.replace(/^[^:]*:\s*/, '');
    byHref.set(key, (byHref.get(key) || 0) + 1);
    if (!byHref.has('first:' + key)) byHref.set('first:' + key, p.split(':')[0]);
  }
  for (const [key, count] of byHref) {
    if (key.startsWith('first:')) continue;
    console.log(`REFUSED  ${key}`);
    console.log(`         ${count} page(s), e.g. ${byHref.get('first:' + key)}`);
  }
  console.log('');
  console.log(`Stylesheet link gate FAILED: ${problems.length} dead reference(s).`);
  console.log('A page may not claim a stylesheet nobody checked exists (PND-053 / N-46).');
  process.exit(1);
}

console.log('Stylesheet link gate PASSED: every local stylesheet a page links resolves.');
