#!/usr/bin/env node
/* =====================================================================
   test-integrity-gate.mjs -- prove the integrity gate goes RED.

   scripts/build-integrity.mjs is the single producer of the sha384 the
   landing page publishes, and the freezer of js/<version>/nac.js. It
   had 0 behaviour tests, and two defects were found in it by hand:

     1. --write alone refreshed an ALREADY PUBLISHED frozen copy. The
        only protection on an immutable path was a human remembering
        to bump the version first.
     2. after refusing the freeze it carried on and rewrote index.html
        with the hash of the NEW bytes, while the frozen path on disk
        still held the OLD ones. Exit code 1 blocked the deploy, but
        the tree was left declaring a hash that matched nothing.

   Same shape as test-contract-api.mjs: a throwaway git repository per
   case, exactly one thing broken, and the assertion is that the gate
   refuses it FOR THE RIGHT REASON. Case 1 is the opposite -- an
   untouched copy must PASS, because a gate that rejects everything is
   as useless as one that accepts everything.

   The sandbox is a real git repo with a real commit because the
   published-at-HEAD rule reads git, so mocking it would test nothing.

   Run: node scripts/test-integrity-gate.mjs
   ASCII only. No dependency beyond node core.
   ===================================================================== */

import {
  mkdtempSync, mkdirSync, copyFileSync, readFileSync, writeFileSync,
  rmSync, existsSync, renameSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

let passed = 0;
let failed = 0;

/* ---- sandbox ------------------------------------------------------- */

function git(cwd, args) {
  return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
}

function runtimeVersion(src) {
  const m = src.match(/\bversion\s*:\s*'([0-9]+\.[0-9]+\.[0-9]+(?:-[A-Za-z0-9.]+)?)'/);
  if (!m) throw new Error('cannot find the version constant in js/nac.js');
  return m[1];
}

const VERSION = runtimeVersion(readFileSync(join(ROOT, 'js', 'nac.js'), 'utf8'));

/* Only what the gate reads, committed, so HEAD holds a published
   frozen copy to compare against. */
function sandbox() {
  const dir = mkdtempSync(join(tmpdir(), 'nac3-integrity-gate-'));
  mkdirSync(join(dir, 'scripts'), { recursive: true });
  mkdirSync(join(dir, 'js', VERSION), { recursive: true });
  copyFileSync(join(ROOT, 'scripts', 'build-integrity.mjs'), join(dir, 'scripts', 'build-integrity.mjs'));
  for (const a of ['nac.js', 'nac-v2-extensions.js', 'nac-chat-client.js']) {
    copyFileSync(join(ROOT, 'js', a), join(dir, 'js', a));
  }
  copyFileSync(join(ROOT, 'js', 'integrity.json'), join(dir, 'js', 'integrity.json'));
  copyFileSync(join(ROOT, 'index.html'), join(dir, 'index.html'));
  /* The frozen copy is taken from js/nac.js, not from the real
     js/<version>/, so the baseline is self-consistent even while the
     real tree is mid-release and legitimately in drift. Without this
     every case inherits that drift and fails for the wrong reason --
     which is what the first run of this suite did. */
  copyFileSync(join(ROOT, 'js', 'nac.js'), join(dir, 'js', VERSION, 'nac.js'));

  git(dir, ['init', '-q']);
  git(dir, ['config', 'user.email', 'test@local']);
  git(dir, ['config', 'user.name', 'test']);

  /* Normalise index.html + integrity.json to these bytes BEFORE the
     commit, so HEAD is a tree the gate calls green. --force is needed
     only because the copy above exists already; nothing is published
     yet at this point. */
  const norm = runGate(dir, ['--write', '--force']);
  if (norm.code !== 0) {
    throw new Error('the sandbox baseline is not green, so every case would be meaningless:\n' + norm.out);
  }

  git(dir, ['add', '-A']);
  git(dir, ['commit', '-q', '-m', 'baseline']);
  return dir;
}

function runGate(dir, args = []) {
  const r = spawnSync(process.execPath, [join(dir, 'scripts', 'build-integrity.mjs'), ...args], {
    cwd: dir, encoding: 'utf8',
  });
  return { code: r.status, out: (r.stdout || '') + (r.stderr || '') };
}

function patch(dir, rel, fn) {
  const p = join(dir, rel);
  writeFileSync(p, fn(readFileSync(p, 'utf8')));
}

/* The sandbox is committed, so "what the gate left behind" is just the
   working tree against HEAD. Empty means the gate touched nothing. */
function dirtyFiles(dir) {
  return git(dir, ['status', '--porcelain'])
    .split('\n').map((l) => l.slice(3).trim()).filter(Boolean);
}

/* ---- the harness --------------------------------------------------- */

function expectRed(name, args, mutate, expectText, extraAssert) {
  const dir = sandbox();
  try {
    mutate(dir);
    const { code, out } = runGate(dir, args);
    if (code === 0) {
      failed += 1;
      console.log('RED-FAIL  ' + name);
      console.log('          the gate ACCEPTED a broken tree. This is the bug the test exists to catch.');
      return;
    }
    if (expectText && out.indexOf(expectText) < 0) {
      failed += 1;
      console.log('RED-FAIL  ' + name);
      console.log('          it failed, but not for the expected reason.');
      console.log('          expected to see: ' + expectText);
      console.log(out.split('\n').map((l) => '            ' + l).join('\n'));
      return;
    }
    if (extraAssert) {
      const problem = extraAssert(dir, out);
      if (problem) {
        failed += 1;
        console.log('RED-FAIL  ' + name);
        console.log('          it failed for the right reason, but: ' + problem);
        return;
      }
    }
    passed += 1;
    console.log('RED-OK    ' + name);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function expectGreen(name, args, mutate, extraAssert) {
  const dir = sandbox();
  try {
    if (mutate) mutate(dir);
    const { code, out } = runGate(dir, args);
    if (code !== 0) {
      failed += 1;
      console.log('GREEN-FAIL ' + name);
      console.log(out.split('\n').map((l) => '            ' + l).join('\n'));
      return;
    }
    if (extraAssert) {
      const problem = extraAssert(dir, out);
      if (problem) {
        failed += 1;
        console.log('GREEN-FAIL ' + name);
        console.log('          it passed, but: ' + problem);
        return;
      }
    }
    passed += 1;
    console.log('GREEN-OK  ' + name);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

/* A comment edit: changes the bytes, changes nothing else. This is
   exactly how the two defects were reached in real work -- fixing a
   typo in a code comment during a release. */
const editRuntimeComment = (dir) =>
  patch(dir, 'js/nac.js', (s) => s.replace('/*', '/* touched by a test. '));

const bumpVersion = (dir) =>
  patch(dir, 'js/nac.js', (s) =>
    s.replace(
      new RegExp("version:\\s*'" + VERSION.replace(/[.\\+*?[\]^$(){}|]/g, '\\$&') + "'"),
      "version: '99.0.0'"
    ));

console.log('');
console.log('integrity gate -- version under test ' + VERSION);
console.log('');

/* ---- 1. the control case ------------------------------------------- */

expectGreen('an untouched tree passes', [], null, (dir) => {
  const dirty = dirtyFiles(dir);
  return dirty.length ? 'a check-only run modified ' + dirty.join(', ') : null;
});

expectGreen('an untouched tree passes with --write too (nothing to do)', ['--write'], null, (dir) => {
  const dirty = dirtyFiles(dir);
  return dirty.length ? '--write rewrote ' + dirty.join(', ') + ' on a tree that was already correct' : null;
});

/* ---- 2. the immutable path is a promise ---------------------------- */

expectRed(
  'the runtime edited without a version bump is refused (check mode)',
  [],
  editRuntimeComment,
  'differs from js/nac.js'
);

expectRed(
  '--write alone cannot refresh a frozen copy that HEAD already published',
  ['--write'],
  editRuntimeComment,
  'is already published at HEAD'
);

/* This is defect 2, and it has to be asserted separately: the previous
   case would have passed even while the gate was leaving a half-applied
   tree behind, because it only looks at the exit code. */
expectRed(
  'a refused freeze writes NOTHING downstream (index.html + integrity.json untouched)',
  ['--write'],
  editRuntimeComment,
  'Nothing downstream was written',
  (dir) => {
    const dirty = dirtyFiles(dir).filter((f) => f !== 'js/nac.js');
    return dirty.length
      ? 'the refused run still modified ' + dirty.join(', ') +
        ' -- the tree now declares a hash that matches nothing at the frozen path'
      : null;
  }
);

expectGreen(
  '--force refreshes a published frozen copy, and says out loud what it cost',
  ['--force', '--write'],
  editRuntimeComment,
  (dir, out) => {
    if (out.indexOf('was already published at HEAD') < 0) {
      return '--force rewrote a published artefact without warning that adopters who pinned it now break';
    }
    const frozen = readFileSync(join(dir, 'js', VERSION, 'nac.js'));
    const src = readFileSync(join(dir, 'js', 'nac.js'));
    return frozen.equals(src) ? null : 'the frozen copy was not actually refreshed';
  }
);

/* ---- 3. a version that never shipped is a different case ----------- */

expectRed(
  'a bumped version with no frozen copy is refused in check mode',
  [],
  bumpVersion,
  'does not exist -- run with --write to freeze this version'
);

/* A bump leaves the adopter-facing snippet pointing at the previous
   release. The gate has to say so: --write re-pins the TAG, and if the
   snippet check were allowed to read that tag it would pass on a
   release whose documentation still sends adopters to the old path. */
expectRed(
  'a version bump that forgets the adopter snippet is refused',
  ['--write'],
  bumpVersion,
  'never shows the immutable path js/99.0.0/nac.js'
);

expectGreen(
  'a version bump WITH its snippet updated freezes on --write, no --force needed',
  ['--write'],
  (dir) => {
    bumpVersion(dir);
    patch(dir, 'index.html', (s) => s.split('js/' + VERSION + '/nac.js').join('js/99.0.0/nac.js'));
  },
  (dir, out) => {
    if (!existsSync(join(dir, 'js', '99.0.0', 'nac.js'))) {
      return 'the new version was not frozen, so a release cannot be cut';
    }
    /* The point of re-pinning: a release must not require a human to
       retype the path into the script tag. */
    const html = readFileSync(join(dir, 'index.html'), 'utf8');
    return /<script src="js\/99\.0\.0\/nac\.js" integrity="sha384-/.test(html)
      ? null
      : 'the runtime tag was not re-pinned to the new immutable path';
  }
);

/* ---- 4. the hash the landing publishes ----------------------------- */

expectRed(
  'a hand-edited hash in index.html is refused',
  [],
  (dir) => patch(dir, 'index.html', (s) =>
    s.replace(/integrity="sha384-[^"]+"/, 'integrity="sha384-' + 'A'.repeat(64) + '"')),
  'integrity is stale'
);

expectRed(
  'a sibling asset edited without regenerating is refused',
  [],
  (dir) => patch(dir, 'js/nac-v2-extensions.js', (s) => s + '\n/* drift */\n'),
  'integrity is stale'
);

/* The script TAG reverting to the moving alias is audit N-03 itself.
   It used to pass, because the gate only asked whether the immutable
   path appeared SOMEWHERE in the file -- and the prose two sections
   above says "js/<v>/nac.js is immutable, pin it in production", which
   satisfied that on its own. */
expectRed(
  'the runtime tag reverting to the mutable alias is refused (prose still mentions the pinned path)',
  [],
  (dir) => patch(dir, 'index.html', (s) =>
    s.replace(
      '<script src="js/' + VERSION + '/nac.js"',
      '<script src="js/nac.js?v=whatever"'
    )),
  'a mutable path'
);

expectRed(
  'a landing page that stops showing adopters the immutable path is refused',
  [],
  (dir) => patch(dir, 'index.html', (s) =>
    s.split('js/' + VERSION + '/nac.js').join('js/nac.js')),
  'never shows the immutable path'
);

/* ---- 5. the CRLF lesson (commit 0778d9f) --------------------------- */

expectRed(
  'CRLF line endings in the runtime are refused before hashing',
  ['--write'],
  (dir) => {
    const p = join(dir, 'js', 'nac.js');
    const lf = readFileSync(p, 'utf8');
    writeFileSync(p, lf.replace(/\n/g, '\r\n'));
  },
  'has CRLF line endings in this working tree'
);

expectRed(
  'CRLF in a sibling asset is refused too',
  ['--write'],
  (dir) => {
    const p = join(dir, 'js', 'nac-chat-client.js');
    writeFileSync(p, readFileSync(p, 'utf8').replace(/\n/g, '\r\n'));
  },
  'has CRLF line endings in this working tree'
);

/* ---- 6. the receipt itself ----------------------------------------- */

expectRed(
  'a missing runtime is refused, not silently skipped',
  [],
  (dir) => renameSync(join(dir, 'js', 'nac.js'), join(dir, 'js', 'nac.js.bak')),
  'ENOENT'
);

/* ---- 7. the adopter copy-paste snippet (audit N-40) ---------------
   The page carries the runtime hash TWICE: on the real <script> tag,
   and inside an HTML-escaped snippet an adopter is invited to copy.
   Only the first had a producer and only the first was ever checked,
   so when dcb71ea moved the hash from CRLF bytes to LF bytes the
   snippet kept advertising a value that matches no file that has
   ever been published. Two days in public on the protocol's own
   landing page, and the failure mode is a console line: a browser
   that refuses to execute the runtime, quietly.

   Both halves get a case: the gate must REFUSE an unpublished hash
   wherever it is printed, and --write must be the one that writes
   the snippet's hash so nobody retypes it. */

/* A syntactically valid sha384 of the right shape that belongs to no
   file -- which is exactly what a stale hash is. */
const BOGUS_SRI = 'sha384-' + 'B0gus'.repeat(12) + 'xy==';

const snippetHashRx =
  /(&lt;script src=<span class="string">"[^"]*\/nac\.js"<\/span>\s*\n\s*integrity=<span class="string">")(sha384-[A-Za-z0-9+/=]+)(")/;

function snippetHashOf(dir) {
  const m = readFileSync(join(dir, 'index.html'), 'utf8').match(snippetHashRx);
  return m ? m[2] : null;
}

function publishedRuntimeHash(dir) {
  return JSON.parse(readFileSync(join(dir, 'js', 'integrity.json'), 'utf8'))
    .files.find((f) => f.path === 'js/nac.js').sha384;
}

/* The baseline must already have a snippet whose hash is the real one.
   Without this the two cases below could both be green on a tree
   where the snippet carries no hash at all -- green over nothing,
   which is the shape of mistake this suite exists to refuse. */
expectGreen('the baseline snippet advertises the published hash', [], null, (dir) => {
  const got = snippetHashOf(dir);
  if (!got) return 'the adopter snippet carries no sha384, so nothing below measures anything';
  const want = publishedRuntimeHash(dir);
  return got === want ? null : 'the snippet advertises ' + got + ' and the published hash is ' + want;
});

expectRed(
  'a hash in the adopter snippet that matches no published file is refused',
  [],
  (dir) => patch(dir, 'index.html', (s) => {
    if (!snippetHashRx.test(s)) throw new Error('the adopter snippet anchor is gone');
    return s.replace(snippetHashRx, (_m, a, _h, c) => a + BOGUS_SRI + c);
  }),
  'matches no published file'
);

expectRed(
  'the real defect of N-40: the snippet keeps the hash of the CRLF bytes',
  [],
  (dir) => {
    /* Reproduce it the way it happened rather than with a made-up
       string: hash the SAME source over CRLF bytes, which is what a
       Windows working tree produced, and advertise that. */
    const lf = readFileSync(join(dir, 'js', 'nac.js'));
    const crlf = Buffer.from(lf.toString('utf8').replace(/\n/g, '\r\n'), 'utf8');
    const crlfSri = 'sha384-' + createHash('sha384').update(crlf).digest('base64');
    patch(dir, 'index.html', (s) => {
      if (!snippetHashRx.test(s)) throw new Error('the adopter snippet anchor is gone');
      return s.replace(snippetHashRx, (_m, a, _h, c) => a + crlfSri + c);
    });
  },
  'matches no published file'
);

expectGreen(
  '--write re-pins the snippet hash instead of asking a human to retype it',
  ['--write', '--force'],
  (dir) => patch(dir, 'index.html', (s) => s.replace(snippetHashRx, (_m, a, _h, c) => a + BOGUS_SRI + c)),
  (dir) => {
    const got = snippetHashOf(dir);
    const want = publishedRuntimeHash(dir);
    if (got === BOGUS_SRI) return '--write left the stale hash in the snippet';
    return got === want ? null : 'the snippet now says ' + got + ' and the published hash is ' + want;
  }
);

/* The anchor itself is load-bearing: if the markup of the snippet
   changes, --write silently stops re-pinning it and the hash goes
   back to having no producer. The gate has to say so out loud
   instead of writing a tree it no longer covers. */
expectRed(
  'a snippet whose markup moved is reported, not silently skipped',
  ['--write', '--force'],
  (dir) => patch(dir, 'index.html', (s) =>
    s.replace(snippetHashRx, (_m, _a, h, _c) => '&lt;script integrity="' + h + '"&gt;')),
  'cannot find the adopter copy-paste snippet'
);
console.log('');
console.log(passed + ' passed, ' + failed + ' failed');
if (failed) {
  console.log('');
  console.log('A failing case here means the integrity gate does not actually guard what it');
  console.log('claims to guard -- and it is the only producer of the hash the landing page');
  console.log('publishes in public.');
  process.exit(1);
}
