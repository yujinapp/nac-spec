#!/usr/bin/env node
/* =====================================================================
   test-contract-api.mjs -- prove the contract API gate goes RED.

   A green gate proves nothing. This suite builds a throwaway copy of
   the tree for every case, breaks exactly one thing, and asserts the
   gate refuses it with the right reason. Case 1 is the opposite: an
   untouched copy must PASS, because a gate that rejects everything is
   as useless as one that accepts everything.

   Each case is a real end-to-end run of scripts/build-contract-api.mjs
   in its own temporary git repository, so the no-purge rule -- which
   compares against HEAD -- is exercised for real rather than mocked.

   Run: node scripts/test-contract-api.mjs
   ASCII only. No dependency beyond node core.
   ===================================================================== */

import { mkdtempSync, mkdirSync, copyFileSync, readFileSync, writeFileSync, rmSync, existsSync, cpSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync, spawnSync } from 'node:child_process';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

let passed = 0;
let failed = 0;

/* ---- sandbox ------------------------------------------------------- */

function git(cwd, args) {
  return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
}

/* A copy with only what the generator reads, committed, so HEAD has a
   published chain to compare against. */
function sandbox() {
  const dir = mkdtempSync(join(tmpdir(), 'nac3-contract-api-'));
  mkdirSync(join(dir, 'scripts'), { recursive: true });
  mkdirSync(join(dir, 'js'), { recursive: true });
  copyFileSync(join(ROOT, 'scripts', 'build-contract-api.mjs'), join(dir, 'scripts', 'build-contract-api.mjs'));
  copyFileSync(join(ROOT, 'scripts', 'contract-api.meta.json'), join(dir, 'scripts', 'contract-api.meta.json'));
  copyFileSync(join(ROOT, 'js', 'nac.js'), join(dir, 'js', 'nac.js'));
  copyFileSync(join(ROOT, 'SPEC.md'), join(dir, 'SPEC.md'));
  cpSync(join(ROOT, 'api'), join(dir, 'api'), { recursive: true });

  git(dir, ['init', '-q']);
  git(dir, ['config', 'user.email', 'test@local']);
  git(dir, ['config', 'user.name', 'test']);
  git(dir, ['add', '-A']);
  git(dir, ['commit', '-q', '-m', 'baseline']);
  return dir;
}

function runGate(dir, args = []) {
  const r = spawnSync(process.execPath, [join(dir, 'scripts', 'build-contract-api.mjs'), ...args], {
    cwd: dir, encoding: 'utf8',
  });
  return { code: r.status, out: (r.stdout || '') + (r.stderr || '') };
}

function currentVersion() {
  const idx = JSON.parse(readFileSync(join(ROOT, 'api', 'index.json'), 'utf8'));
  return idx.entries[idx.entries.length - 1].version;
}

const VERSION = currentVersion();

/* ---- the harness --------------------------------------------------- */

function expectRed(name, mutate, expectText) {
  const dir = sandbox();
  try {
    mutate(dir);
    const { code, out } = runGate(dir);
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
      console.log('          got:');
      console.log(out.split('\n').filter((l) => l.startsWith('FAIL')).map((l) => '            ' + l).join('\n'));
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
      console.log(out.split('\n').map((l) => '            ' + l).join('\n'));
      return;
    }
    passed += 1;
    console.log('GREEN-OK  ' + name);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

/* ---- helpers for the mutations ------------------------------------- */

const patch = (dir, rel, fn) => {
  const p = join(dir, rel);
  writeFileSync(p, fn(readFileSync(p, 'utf8')));
};

const patchJson = (dir, rel, fn) => {
  const p = join(dir, rel);
  const o = JSON.parse(readFileSync(p, 'utf8'));
  fn(o);
  writeFileSync(p, JSON.stringify(o, null, 2) + '\n');
};

/* ---- cases --------------------------------------------------------- */

console.log('contract API gate -- regression suite');
console.log('version under test: ' + VERSION);
console.log('');

/* 1. The baseline must pass, or every red below is meaningless. */
expectGreen('an untouched tree passes');

/* 2. A published artefact edited after the fact. This is the whole
      point of the chain: the bytes an adopter pinned cannot change. */
expectRed(
  'editing a published artefact is refused',
  (dir) => patch(dir, 'api/v/' + VERSION + '/contract.json', (s) => s.replace('"protocol": "NAC3"', '"protocol": "NAC4"')),
  'does not match the hash recorded in the chain'
);

/* 3. A published version directory deleted. The deploy mirrors this
      tree with --delete-after, so a deletion here is a deletion from
      the web for anyone who pinned it. */
expectRed(
  'deleting a published version directory is refused',
  (dir) => rmSync(join(dir, 'api/v/' + VERSION), { recursive: true, force: true }),
  'no longer exists on disk'
);

/* 4. An entry removed from the index: the purge the owner forbade. */
expectRed(
  'purging an entry from the index is refused',
  (dir) => patchJson(dir, 'api/index.json', (o) => { o.entries = []; o.entry_count = 0; o.chain_head = null; }),
  'versions are never purged'
);

/* 5 + 6. The chain itself. Rewriting history has to be visible. */
expectRed(
  'a tampered chain head is refused',
  (dir) => patchJson(dir, 'api/index.json', (o) => { o.chain_head = 'sha384-' + 'A'.repeat(64); }),
  'chain_head does not match'
);

expectRed(
  'a tampered entry hash is refused',
  (dir) => patchJson(dir, 'api/index.json', (o) => { o.entries[0].entry_sha384 = 'sha384-' + 'B'.repeat(64); }),
  'chain broken'
);

/* 7. The runtime moves and nobody regenerates: the contract would be
      describing a runtime that no longer exists. Changing the role set
      is the cheapest honest way to simulate a real runtime change. */
expectRed(
  'a runtime change without regenerating the contract is refused',
  (dir) => patch(dir, 'js/nac.js', (s) => s.replace("'navigation', 'confirm-dialog',", "'navigation', 'confirm-dialog', 'test-only-role',")),
  'differs from what the runtime generates'
);

/* 8. The runtime moves AND the version moves: the new version simply
      is not published yet, and the gate must say so rather than serve
      a contract for a version that does not exist.

      The mutation is anchored on the ALIGNED declaration at the bottom
      of the runtime (`version:` padded out to a column), because the
      same version literal appears earlier inside the file's own header
      comment on one line. A first-match replace patched the comment
      and left the constant alone -- which is how the first draft of
      this case failed for an interesting reason: the artefacts record
      the runtime's hash, so even a comment edit invalidates them. */
expectRed(
  'a version bump without publishing the contract is refused',
  (dir) => patch(dir, 'js/nac.js', (s) => {
    const out = s.replace(/version:(\s+)'[^']+',(\s*\n\s*)spec_version:/,
      "version:$1'9.9.9',$2spec_version:");
    if (out === s) throw new Error('the version constant anchor moved; fix this test');
    return out;
  }),
  'is not in api/index.json'
);

/* 9 + 10. Producer / consumer symmetry on the catalogue, both ways. */
expectRed(
  'a finding code with no documented meaning is refused',
  (dir) => patchJson(dir, 'scripts/contract-api.meta.json', (o) => { delete o.finding_codes.duplicate_verb; }),
  'has no entry in scripts/contract-api.meta.json'
);

expectRed(
  'a documented code the runtime does not emit is refused',
  (dir) => patchJson(dir, 'scripts/contract-api.meta.json', (o) => {
    o.finding_codes.code_that_never_existed = { what: 'x', fix: 'y', since: null };
  }),
  'the runtime no longer emits it'
);

/* 11. A conformance requirement reworded in the spec. The mapping that
       says "this one is machine-checkable, this code falsifies it" was
       reviewed against a specific sentence; change the sentence and the
       mapping is unreviewed. */
expectRed(
  'rewording a conformance requirement forces the mapping to be re-reviewed',
  (dir) => patch(dir, 'SPEC.md', (s) => s.replace('- Carries HMAC-signed manifests.', '- Carries signed manifests.')),
  'has no reviewed mapping'
);

/* 12. latest must be a copy, not an editable second truth. */
expectRed(
  'a latest mirror that drifts from its source version is refused',
  (dir) => patch(dir, 'api/latest/findings.json', (s) => s.replace('"protocol": "NAC3"', '"protocol": "NAC3 "')),
  'not byte-identical'
);

/* 13 + 14. api/v/ holds frozen version directories AND its own
       .htaccess. The first draft of the gate listed the directory and
       audited every NAME it found, so the .htaccess was reported as a
       version nothing in the chain claimed -- a false red that would
       have blocked a correct deploy. A stray FILE there is not a
       version and must be ignored; a stray DIRECTORY is unexplained
       published surface and must still be refused. */
expectGreen(
  'a non-directory entry in api/v/ is not mistaken for a version',
  (dir) => writeFileSync(join(dir, 'api/v/.htaccess'), '# cache rules\n')
);

expectRed(
  'an unexplained directory in api/v/ is refused',
  (dir) => mkdirSync(join(dir, 'api/v/9.9.9-smuggled')),
  'no chain entry claims it'
);

/* 15. The pointer cannot claim a stable release that the chain does
       not contain. This is N-01 in miniature: `latest` must not be
       able to lie about what channel it is handing over. */
expectRed(
  'a latest pointer that invents a stable version is refused',
  (dir) => patchJson(dir, 'api/latest.json', (o) => { o.stable = '2.5.0'; }),
  'declares stable=2.5.0'
);

console.log('');
console.log(passed + ' passed, ' + failed + ' failed');
if (failed) {
  console.log('');
  console.log('A failing case here means the gate does not actually guard what it claims to guard.');
  process.exit(1);
}
