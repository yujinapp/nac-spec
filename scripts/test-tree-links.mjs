#!/usr/bin/env node
/* =====================================================================
   test-tree-links.mjs -- the red of scripts/check-tree-links.mjs.

   A gate nobody has seen fail is not a gate. This one rebuilds, in a
   throwaway tree, the TWO defects that were in production on
   2026-11-07 and that no existing gate could see, and refuses to pass
   unless check-tree-links.mjs reports each of them:

     1. the favicon of the five pages one level below the mount root:
        ../assets/favicon.svg, which from that depth names a file the
        tree does not contain (the six pages AT the root resolved the
        same literal to the site root and worked -- that asymmetry is
        why it survived a year);
     2. the nine translated spec pages carrying the English page's
        relative rfcs/README.md from two levels down.

   And it pins the four things the gate must NOT complain about, because
   a gate that cries wolf gets switched off: an external URL, a
   fragment, a root-absolute reference OUTSIDE the mount (that is
   check-mount-path.mjs's business) and a directory served by its index.

   Usage:  node scripts/test-tree-links.mjs
   Exit:   0 the gate sees what it must and stays quiet where it must
   ===================================================================== */

import fs from 'fs';
import os from 'os';
import path from 'path';
import { pagesOf, refsOf, resolveInTree } from './check-tree-links.mjs';

let failures = 0;
function ok(name, cond, detail) {
  console.log(`  ${cond ? 'ok  ' : 'FAIL'}  ${name}${cond || !detail ? '' : '   ' + detail}`);
  if (!cond) failures++;
}

/* A throwaway tree shaped like the real one at the moment of the bug. */
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'tree-links-'));
fs.mkdirSync(path.join(tmp, 'assets'), { recursive: true });
fs.mkdirSync(path.join(tmp, 'migration'), { recursive: true });
fs.mkdirSync(path.join(tmp, 'i18n', 'es'), { recursive: true });
fs.mkdirSync(path.join(tmp, 'rfcs'), { recursive: true });
fs.mkdirSync(path.join(tmp, 'demos', 'react'), { recursive: true });
fs.writeFileSync(path.join(tmp, 'rfcs', 'README.md'), '# rfcs\n');
fs.writeFileSync(path.join(tmp, 'i18n', 'es', 'CONTRIBUTING.md'), '# contribuir\n');
fs.writeFileSync(path.join(tmp, 'demos', 'react', 'index.html'), '<html></html>');

/* defect 1 -- the page one level down, exactly as it was. */
fs.writeFileSync(path.join(tmp, 'migration', 'index.html'),
  '<link rel="icon" href="../assets/favicon.svg">');
/* defect 2 -- the translated page two levels down, exactly as it was. */
fs.writeFileSync(path.join(tmp, 'i18n', 'es', 'SPEC.html'),
  '<a href="rfcs/README.md">rfcs</a> <a href="CONTRIBUTING.md">contribuir</a>');
/* the four quiet cases. */
fs.writeFileSync(path.join(tmp, 'index.html'),
  '<a href="https://example.org/x">ext</a>'
  + '<a href="#section">frag</a>'
  + '<link rel="icon" href="/assets/favicon.svg">'
  + '<a href="demos/react/">demo</a>'
  + '<a href="mailto:a@b.c">mail</a>');

/* Run the gate's own resolver over the fixture, page by page. */
function problemsIn(root) {
  const out = [];
  for (const page of pagesOf(root)) {
    const html = fs.readFileSync(page, 'utf8');
    for (const ref of refsOf(html)) {
      const target = resolveInTree(ref.url, path.dirname(page), root);
      if (!target) continue;
      let exists = fs.existsSync(target);
      if (exists && fs.statSync(target).isDirectory()) {
        exists = ['index.html', 'index.php'].some((i) => fs.existsSync(path.join(target, i)));
      }
      if (!exists) {
        out.push({ page: path.relative(root, page).split(path.sep).join('/'), url: ref.url });
      }
    }
  }
  return out;
}

const found = problemsIn(tmp);
const urls = found.map((f) => f.page + ' -> ' + f.url);
console.log('tree links red -- the two production defects of 2026-11-07');
ok('defect 1: ../assets/favicon.svg from one level down is reported',
  found.some((f) => f.page === 'migration/index.html' && f.url === '../assets/favicon.svg'),
  JSON.stringify(urls));
ok('defect 2: rfcs/README.md from i18n/<loc>/ is reported',
  found.some((f) => f.page === 'i18n/es/SPEC.html' && f.url === 'rfcs/README.md'),
  JSON.stringify(urls));

console.log('and the four it must stay quiet about');
ok('an external URL is not this gate\'s business',
  !found.some((f) => f.url.startsWith('https://')));
ok('a fragment is not a file',
  !found.some((f) => f.url.startsWith('#')));
ok('a root-absolute reference outside the mount belongs to check-mount-path',
  !found.some((f) => f.url === '/assets/favicon.svg'));
ok('a directory served by its index resolves',
  !found.some((f) => f.url === 'demos/react/'));
ok('mailto: is not a file',
  !found.some((f) => f.url.startsWith('mailto:')));
ok('a companion that DOES exist per locale stays relative and resolves',
  !found.some((f) => f.url === 'CONTRIBUTING.md'));

/* And the positive control: with the asset in place, the gate goes quiet. */
fs.mkdirSync(path.join(tmp, 'migration', '..', 'assets'), { recursive: true });
fs.writeFileSync(path.join(tmp, 'assets', 'favicon.svg'), '<svg/>');
fs.mkdirSync(path.join(tmp, 'i18n', 'es', 'rfcs'), { recursive: true });
fs.writeFileSync(path.join(tmp, 'i18n', 'es', 'rfcs', 'README.md'), '# x\n');
const after = problemsIn(tmp);
ok('positive control: once both targets exist the gate reports nothing',
  after.length === 0, JSON.stringify(after));

fs.rmSync(tmp, { recursive: true, force: true });

console.log(failures === 0
  ? '\ntree links red: PASSED -- the gate sees both defects and nothing else'
  : `\ntree links red: FAILED -- ${failures} assertion(s)`);
process.exit(failures === 0 ? 0 : 1);
