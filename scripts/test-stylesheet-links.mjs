#!/usr/bin/env node
/* =====================================================================
   test-stylesheet-links.mjs -- behaviour tests for
   scripts/check-stylesheet-links.mjs.

   WHY. The gate it tests was written because a page claimed a resource
   nobody checked existed. A gate that is itself never watched failing
   is the same mistake one level up: every lock in this repository that
   shipped without red cases turned out to have defects nobody could
   see. So each case here plants ONE real defect in a throwaway tree and
   asserts the gate REFUSES it, naming the dead reference -- a red case
   that fails for the wrong reason is not a passing red case.

   The first red case is not hypothetical: it is the verbatim <link>
   line that 262 published pages carried from 2026-06-28 until today.

   Usage:  node scripts/test-stylesheet-links.mjs
   Exit:   0 every case behaved, 1 any case did not
   ===================================================================== */

import { mkdtempSync, mkdirSync, writeFileSync, rmSync, cpSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const GATE = join('scripts', 'check-stylesheet-links.mjs');

/* The line this repository really shipped, byte for byte. */
const SHIPPED_LINE = '<link rel="stylesheet" href="/nac-spec/css/yujin-tokens.css" />';

let passed = 0;
const failures = [];

function page(body) {
  return '<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="utf-8" />\n'
    + body + '\n</head>\n<body><p>page</p></body>\n</html>\n';
}

/* A scratch tree that passes the gate: one page, one stylesheet that
   exists, one remote stylesheet. Each case mutates it. */
function sandbox() {
  const dir = mkdtempSync(join(tmpdir(), 'nac3-css-'));
  mkdirSync(join(dir, 'scripts'), { recursive: true });
  mkdirSync(join(dir, 'css'), { recursive: true });
  cpSync(join(ROOT, GATE), join(dir, GATE));
  writeFileSync(join(dir, 'css', 'example.css'), 'body { color: #1f1f1f; }\n', 'utf8');
  writeFileSync(join(dir, 'SPEC.html'), page(
    '<link rel="stylesheet" href="/nac-spec/css/example.css" />\n'
    + '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces" />'
  ), 'utf8');
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
    else { failures.push(label + ': ' + why); console.log(out.split('\n').slice(0, 8).map((l) => '         ' + l).join('\n')); }
  } finally {
    if (dir !== ROOT) rmSync(dir, { recursive: true, force: true });
  }
}

console.log('stylesheet link gate -- behaviour\n');

testCase('the committed tree passes', 'green', 'ROOT');

testCase('a scratch tree with a resolving stylesheet passes', 'green', null);

testCase('the <link> line 262 published pages really shipped is refused', 'red',
  (dir) => writeFileSync(join(dir, 'SPEC.html'), page(SHIPPED_LINE), 'utf8'),
  '/nac-spec/css/yujin-tokens.css');

testCase('a dead stylesheet is refused with its href and the page named', 'red',
  (dir) => writeFileSync(join(dir, 'docs.html'), page(
    '<link rel="stylesheet" href="/nac-spec/css/never-written.css" />'), 'utf8'),
  'never-written.css');

testCase('attribute order and single quotes do not hide a dead link', 'red',
  (dir) => writeFileSync(join(dir, 'docs.html'), page(
    "<link href='css/ghost.css' type='text/css' rel='stylesheet'>"), 'utf8'),
  'ghost.css');

testCase('a relative href that climbs out of the tree is refused', 'red',
  (dir) => writeFileSync(join(dir, 'docs.html'), page(
    '<link rel="stylesheet" href="../outside/tokens.css" />'), 'utf8'),
  'tokens.css');

testCase('an @import of a file that was never written is refused', 'red',
  (dir) => writeFileSync(join(dir, 'docs.html'), page(
    '<style>@import url("/nac-spec/css/yujin-tokens.css");</style>'), 'utf8'),
  '@import');

testCase('a stylesheet link with no href at all is refused, not skipped', 'red',
  (dir) => writeFileSync(join(dir, 'docs.html'), page(
    '<link rel="stylesheet" />'), 'utf8'),
  'no href');

testCase('a remote stylesheet is not demanded to resolve on disk', 'green',
  (dir) => writeFileSync(join(dir, 'docs.html'), page(
    '<link rel="stylesheet" href="https://cdn.example.com/x.css" />\n'
    + '<link rel="stylesheet" href="//cdn.example.com/y.css" />'), 'utf8'));

testCase('a query string or fragment does not break a link that resolves', 'green',
  (dir) => writeFileSync(join(dir, 'docs.html'), page(
    '<link rel="stylesheet" href="/nac-spec/css/example.css?v=2#top" />'), 'utf8'));

testCase('a rel that merely contains the word is still a stylesheet', 'red',
  (dir) => writeFileSync(join(dir, 'docs.html'), page(
    '<link rel="alternate stylesheet" href="css/ghost.css" />'), 'utf8'),
  'ghost.css');

testCase('a tree with no page at all is refused, not passed over', 'red',
  (dir) => { rmSync(join(dir, 'SPEC.html')); },
  'empty scan is not a pass');

console.log('');
if (failures.length) {
  console.log(passed + ' passed, ' + failures.length + ' failed');
  for (const f of failures) console.log('  ' + f);
  process.exit(1);
}
console.log(passed + ' passed, 0 failed');
console.log('The stylesheet link gate refuses every dead reference it claims to guard.');
