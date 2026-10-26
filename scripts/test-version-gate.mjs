#!/usr/bin/env node
/* =====================================================================
   test-version-gate.mjs -- prove the version coherence gate goes RED.

   scripts/check-version-coherence.mjs is the lock that exists because
   of audit N-17: the published 2.5.0-alpha.5 tarball shipped a SPEC.md
   declaring alpha.4 and a CLI announcing 2.3.0-alpha.2, because the
   version was hand-written in a dozen files and whoever published
   remembered eleven of them.

   It was the only gate in this project with no behaviour tests, and
   cutting 2.5.0 found a defect in it within a minute (N-41): the rule
   "a bare x.y.z equal to the shipping version is hard-coded" is right
   for code and wrong for prose, so seven correct sentences -- "before
   2.5.0 the URL mode aborted" -- turned red the day 2.5.0 shipped.
   Making it precise is only half the work. The other half is this
   file: proving it still refuses the shape it was built to refuse,
   because a lock relaxed without a red proof is a lock removed.

   Same shape as the other two suites: a throwaway tree per case, one
   thing broken, and the assertion is that the gate refuses it FOR THE
   RIGHT REASON. The green cases carry equal weight here -- a lock that
   also refuses true documentation is the defect N-41 was.

   Run: node scripts/test-version-gate.mjs
   ASCII only. No dependency beyond node core.
   ===================================================================== */

import {
  mkdtempSync, mkdirSync, copyFileSync, readFileSync, writeFileSync,
  rmSync, existsSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

let passed = 0;
let failed = 0;

const abs = (p) => join(ROOT, p);

function runtimeVersion() {
  const src = readFileSync(abs('js/nac.js'), 'utf8');
  const m = src.match(/\bversion\s*:\s*'([^']+)',\s*spec_version/);
  if (!m) throw new Error('cannot find the version constant in js/nac.js');
  return m[1];
}

const VERSION = runtimeVersion();

/* Exactly what the gate reads. Enumerated rather than copied wholesale
   so that a probe pointed at a new file makes this list fail loudly
   instead of testing a tree the gate no longer describes. */
function filesTheGateReads() {
  const list = [
    'scripts/check-version-coherence.mjs',
    'js/nac.js',
    'js/integrity.json',
    'js/' + VERSION + '/nac.js',
    'runtime/package.json',
    'runtime/SPEC.md',
    'runtime/CHANGELOG.md',
    'runtime/build.mjs',
    'runtime/src/cli.mjs',
    'runtime/src/cli-url.mjs',
    'runtime/dist/cli.js',
    'runtime/dist/nac.d.ts',
    'runtime/dist/nac-v2-extensions.d.ts',
    'SPEC.md',
    'index.html',
    '.github/workflows/deploy.yml',
    'api/index.json',
    'api/latest.json',
  ];
  /* The contract probe asserts every artefact the published entry names
     is on disk, so those travel too. */
  const idx = JSON.parse(readFileSync(abs('api/index.json'), 'utf8'));
  const entry = (idx.entries || []).find((e) => e.version === VERSION);
  for (const f of (entry ? entry.files : [])) list.push(f.path);
  return list;
}

const GATE_FILES = filesTheGateReads();

function sandbox() {
  const dir = mkdtempSync(join(tmpdir(), 'nac3-version-gate-'));
  for (const rel of GATE_FILES) {
    const src = abs(rel);
    if (!existsSync(src)) {
      throw new Error('the gate reads ' + rel + ' and it is not on disk: no case below would mean anything');
    }
    const dest = join(dir, rel);
    mkdirSync(dirname(dest), { recursive: true });
    copyFileSync(src, dest);
  }
  return dir;
}

function runGate(dir) {
  const r = spawnSync(process.execPath, [join(dir, 'scripts', 'check-version-coherence.mjs')], {
    cwd: dir, encoding: 'utf8',
  });
  return { code: r.status, out: (r.stdout || '') + (r.stderr || '') };
}

function patch(dir, rel, fn) {
  const p = join(dir, rel);
  const before = readFileSync(p, 'utf8');
  const after = fn(before);
  if (after === before) throw new Error('the mutation of ' + rel + ' changed nothing -- its anchor is gone');
  writeFileSync(p, after);
}

function expectRed(name, mutate, expectText) {
  const dir = sandbox();
  try {
    try {
      mutate(dir);
    } catch (e) {
      /* An anchor that rotted means this case measured nothing. One
         reported failure, not a dead run, so the rest still speaks. */
      failed += 1;
      console.log('RED-FAIL  ' + name);
      console.log('          the defect could not be planted: ' + ((e && e.message) || e));
      return;
    }
    const { code, out } = runGate(dir);
    if (code === 0) {
      failed += 1;
      console.log('RED-FAIL  ' + name);
      console.log('          the gate ACCEPTED it. This is the bug the case exists to catch.');
      return;
    }
    if (expectText && out.indexOf(expectText) < 0) {
      failed += 1;
      console.log('RED-FAIL  ' + name);
      console.log('          it failed, but not for the expected reason.');
      console.log('          expected to see: ' + expectText);
      console.log(out.split('\n').filter((l) => /^(FAIL|DRIFT)/.test(l)).map((l) => '            ' + l).join('\n'));
      return;
    }
    passed += 1;
    console.log('RED-OK    ' + name);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function expectGreen(name, mutate) {
  const dir = sandbox();
  try {
    if (mutate) mutate(dir);
    const { code, out } = runGate(dir);
    if (code !== 0) {
      failed += 1;
      console.log('GREEN-FAIL ' + name);
      console.log(out.split('\n').filter((l) => /^(FAIL|DRIFT|\s+(want|got|fix):)/.test(l))
        .map((l) => '            ' + l).join('\n'));
      return;
    }
    passed += 1;
    console.log('GREEN-OK  ' + name);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

/* Plant a line at the top of a generator source, after its first line. */
const plantInGenerator = (rel, line) => (dir) =>
  patch(dir, rel, (s) => {
    const nl = s.indexOf('\n');
    return s.slice(0, nl + 1) + line + '\n' + s.slice(nl + 1);
  });

console.log('');
console.log('version coherence gate -- version under test ' + VERSION);
console.log('');

/* ---- 1. the control case ------------------------------------------- */

expectGreen('the committed tree passes', null);

/* ---- 2. the N-17 root cause: a generator declaring its own version --
     These are the shapes the lock exists for. Each one is a version
     that REACHES AN ARTEFACT, which is how the published tarball came
     to announce 2.3.0-alpha.2. ---------------------------------------- */

expectRed(
  'a generator assigning the version to a constant is refused (the N-17 shape)',
  plantInGenerator('runtime/src/cli.mjs', "const HARDCODED = '" + VERSION + "';"),
  'no literal version'
);

expectRed(
  'a generator carrying version: <literal> is refused',
  plantInGenerator('runtime/src/cli-url.mjs', "const meta = { version: '" + VERSION + "' };"),
  'no literal version'
);

expectRed(
  'a version introduced by "v" inside a longer string is refused',
  plantInGenerator('runtime/src/cli.mjs', "const banner = 'NAC3 CLI v" + VERSION + " ready';"),
  'no literal version'
);

expectRed(
  'a version introduced by "@" is refused',
  plantInGenerator('runtime/src/cli.mjs', "const dep = '@nac3/runtime@" + VERSION + "';"),
  'no literal version'
);

expectRed(
  'a prerelease literal is refused even in a comment, because it is never prose',
  plantInGenerator('runtime/build.mjs', '/* pinned at 2.4.0-alpha.7 */'),
  'no literal version'
);

/* ---- 3. the N-41 false positives: prose that names a version -------
     Every one of these is a true sentence that was in the tree on the
     day 2.5.0 shipped. A gate that refuses them is the defect, not the
     guard: the only ways out are weakening the lock or rewording true
     documentation, and both end with nobody believing the gate. ------- */

expectGreen(
  'a comment naming the shipping version historically stays legal',
  plantInGenerator('runtime/src/cli.mjs',
    '/* Audit N-18: before ' + VERSION + ' the URL mode aborted with exit 2. */')
);

expectGreen(
  'a user-facing string naming the version as a threshold stays legal',
  plantInGenerator('runtime/src/cli-url.mjs',
    "const hint = 'Serve a runtime at " + VERSION + " or later.';")
);

expectGreen(
  'a user-facing string naming a pre-version alias stays legal',
  plantInGenerator('runtime/src/cli.mjs',
    "const alias = '  (pre-" + VERSION + " alias: ' + 'x' + ')';")
);

/* ---- 4. the DECLARED slots: the ones a human has to edit ----------
     The probe above is about the generators. These are the slots that
     went stale in N-17 itself, and they are what the gate is FOR. --- */

expectRed(
  'the npm package left at the previous version is refused',
  (dir) => patch(dir, 'runtime/package.json', (s) =>
    s.replace('"version": "' + VERSION + '"', '"version": "0.0.1-stale"')),
  'this is what the registry publishes'
);

expectRed(
  'a SPEC document declaring another version is refused',
  (dir) => patch(dir, 'SPEC.md', (s) =>
    s.replace('**Version:** ' + VERSION, '**Version:** 0.0.1-stale')),
  'SPEC document version'
);

expectRed(
  'a packaged SPEC that is not byte-identical to the canonical one is refused',
  (dir) => patch(dir, 'runtime/SPEC.md', (s) => s + '\nan extra line nobody asked for\n'),
  'byte-identical'
);

expectRed(
  'a changelog with no entry for the version being shipped is refused',
  (dir) => patch(dir, 'runtime/CHANGELOG.md', (s) =>
    s.replace(/^## +/m, '## not-a-heading-for ')),
  'no entry for this version'
);

expectRed(
  'a landing page still advertising the previous version is refused',
  (dir) => patch(dir, 'index.html', (s) =>
    s.replace('v' + VERSION + ' &middot;', 'v0.0.1-stale &middot;')),
  'landing version pills'
);

expectRed(
  'an integrity receipt left on the previous version is refused',
  (dir) => patch(dir, 'js/integrity.json', (s) =>
    s.replace('"version": "' + VERSION + '"', '"version": "0.0.1-stale"')),
  'integrity receipt'
);

expectRed(
  'a contract API that never published this version is refused',
  (dir) => patch(dir, 'api/index.json', (s) =>
    s.replace(new RegExp('"version": "' + VERSION.replace(/[.\\+*?[\]^$(){}|]/g, '\\$&') + '"', 'g'),
      '"version": "0.0.1-stale"')),
  'contract API publishes this version'
);

/* ---- 5. the deploy workflow: here, finding NO version is the pass -- */

expectRed(
  'a deploy workflow that hard-codes the versioned path is refused',
  (dir) => patch(dir, '.github/workflows/deploy.yml', (s) =>
    s.replace(/^(\s*)(- name:|name:)/m, '$1# curl .../js/' + VERSION + '/nac.js\n$1$2')),
  'hard-codes a version path'
);

/* ---- 6. the gate must not pass on an absent source of truth -------- */

expectRed(
  'a runtime with no version constant is refused, not defaulted',
  (dir) => patch(dir, 'js/nac.js', (s) =>
    s.replace("version:      '" + VERSION + "',", "version:      undefined,")),
  'carries no usable version'
);

console.log('');
console.log(passed + ' passed, ' + failed + ' failed');
if (failed) {
  console.log('');
  console.log('A failing case here means the version gate does not guard what it claims to');
  console.log('guard -- and it is the only thing standing between a release and the published');
  console.log('tarball misdeclaring its own version, which is audit finding N-17.');
  process.exit(1);
}
