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

   Covers the generator, the no-purge rule, the hash chain, the
   signature layer and the witness record the signature is compared
   against.

   Run: node scripts/test-contract-api.mjs
   ASCII only. No dependency beyond node core.
   ===================================================================== */

import { mkdtempSync, mkdirSync, copyFileSync, readFileSync, writeFileSync, rmSync, existsSync, cpSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash, generateKeyPairSync, sign as edSign } from 'node:crypto';

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
  mkdirSync(join(dir, 'docs'), { recursive: true });
  copyFileSync(join(ROOT, 'scripts', 'build-contract-api.mjs'), join(dir, 'scripts', 'build-contract-api.mjs'));
  copyFileSync(join(ROOT, 'scripts', 'sign-contract-api.mjs'), join(dir, 'scripts', 'sign-contract-api.mjs'));
  copyFileSync(join(ROOT, 'scripts', 'contract-api.meta.json'), join(dir, 'scripts', 'contract-api.meta.json'));
  copyFileSync(join(ROOT, 'js', 'nac.js'), join(dir, 'js', 'nac.js'));
  copyFileSync(join(ROOT, 'SPEC.md'), join(dir, 'SPEC.md'));
  /* The witness record lives in this document and the gate compares it,
     so a sandbox without it would test a tree that cannot exist. */
  copyFileSync(join(ROOT, 'docs', 'CONTRACT_API_SIGNING.md'), join(dir, 'docs', 'CONTRACT_API_SIGNING.md'));
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

/* ---- layer 4: the offline signature -------------------------------
   The chain and the three witnesses of the head cover a compromised
   HOST. They do not cover a compromised repository: whoever can push
   rewrites the chain and all three witnesses follow it. The signature
   covers that, and only while the key stays offline -- which is why
   the gate must verify it and must never be able to make one.

   These cases sign inside the sandbox with throwaway keys. The owner
   key is never involved, and the end-to-end case runs the real signer,
   which is the only way to prove the signer and the gate agree on the
   exact bytes being signed. */

function sha384(buf) {
  return 'sha384-' + createHash('sha384').update(buf).digest('base64');
}

function canonical(value) {
  const sort = (v) => {
    if (Array.isArray(v)) return v.map(sort);
    if (v && typeof v === 'object') {
      const out = {};
      for (const k of Object.keys(v).sort()) out[k] = sort(v[k]);
      return out;
    }
    return v;
  };
  return JSON.stringify(sort(value), null, 2) + '\n';
}

/* Start every signature case from a known state: the real repository
   may or may not carry a trust anchor yet, and a case that depends on
   which is a case that will rot. */
function resetTrust(dir) {
  rmSync(join(dir, 'api', 'trust.json'), { force: true });
  rmSync(join(dir, 'api', 'attestation.json'), { force: true });
}

function publishedKey(publicKey, keyId, status) {
  const der = publicKey.export({ type: 'spki', format: 'der' });
  return {
    key_id: keyId,
    algorithm: 'ed25519',
    status,
    created_at: '2026-10-24',
    public_key_spki_b64: der.toString('base64'),
    fingerprint_sha384: sha384(der),
    custody: 'throwaway key, generated by the regression suite',
  };
}

function writeTrust(dir, keys) {
  writeFileSync(join(dir, 'api', 'trust.json'), canonical({
    api_schema: 1,
    protocol: 'NAC3',
    surface: 'trust',
    generated_by: 'scripts/test-contract-api.mjs',
    algorithm: 'ed25519',
    keys,
    policy: { ci_can_verify_but_cannot_sign: true, private_key_is_offline: true },
  }));
}

/* Sign the sandbox index. Every option here corresponds to one way the
   layer can be defeated, which is the only reason the options exist. */
function signSandbox(dir, opts = {}) {
  const keyId = opts.keyId || 'suite-key';
  const signer = generateKeyPairSync('ed25519');
  const published = opts.publishDifferentKey ? generateKeyPairSync('ed25519') : signer;

  const keys = [publishedKey(published.publicKey, keyId, opts.status || 'active')];
  if (opts.status && opts.status !== 'active') {
    /* trust.json must still publish exactly one ACTIVE key, or the
       gate stops at that and never reaches the case under test. */
    keys.push(publishedKey(generateKeyPairSync('ed25519').publicKey, keyId + '-current', 'active'));
  }
  writeTrust(dir, keys);

  const indexBytes = readFileSync(join(dir, 'api', 'index.json'));
  const index = JSON.parse(indexBytes.toString('utf8'));
  const payload = {
    api_schema: 1,
    protocol: 'NAC3',
    surface: 'attestation-payload',
    key_id: keyId,
    chain_head: opts.headOverride || index.chain_head,
    entry_count: index.entry_count,
    index_sha384: opts.indexShaOverride || sha384(indexBytes),
    versions: (index.entries || []).map((e) => e.version),
    signed_at: '2026-10-24T00:00:00Z',
  };
  let signature = edSign(null, Buffer.from(canonical(payload), 'utf8'), signer.privateKey).toString('base64');
  if (opts.tamperSignature) {
    signature = (signature.charAt(0) === 'A' ? 'B' : 'A') + signature.slice(1);
  }
  writeFileSync(join(dir, 'api', 'attestation.json'), canonical({
    api_schema: 1,
    protocol: 'NAC3',
    surface: 'attestation',
    generated_by: 'scripts/test-contract-api.mjs',
    algorithm: 'ed25519',
    statement: 'suite',
    payload,
    signature_b64: signature,
  }));

  /* The gate compares the witness record against trust.json and the
     index. Refresh it through the real writer -- rendering it here
     would only prove the suite and the writer agree on a template.
     Without this, every signature case below would go red for a
     drifted record instead of the defect it was written for. */
  const w = runSigner(dir, ['--witness']);
  if (w.code !== 0) throw new Error('--witness failed in the sandbox: ' + w.out);
}

function runSigner(dir, args) {
  const r = spawnSync(process.execPath, [join(dir, 'scripts', 'sign-contract-api.mjs'), ...args], {
    cwd: dir, encoding: 'utf8',
  });
  return { code: r.status, out: (r.stdout || '') + (r.stderr || '') };
}

/* The signer has its own refusals, so it needs its own red harness:
   these cases assert that sign-contract-api.mjs itself says no. */
function expectRedSigner(name, argsFor, expectText) {
  const dir = sandbox();
  try {
    resetTrust(dir);
    const { code, out } = runSigner(dir, argsFor(dir));
    if (code === 0) {
      failed += 1;
      console.log('RED-FAIL  ' + name);
      console.log('          the signer ACCEPTED it.');
      return;
    }
    if (expectText && out.indexOf(expectText) < 0) {
      failed += 1;
      console.log('RED-FAIL  ' + name);
      console.log('          it refused, but not for the expected reason:');
      console.log(out.split('\n').map((l) => '            ' + l).join('\n'));
      return;
    }
    passed += 1;
    console.log('RED-OK    ' + name);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

/* 16. A tree signed by a key it publishes, over the index it publishes,
       must pass. Without this one, every red below could be the gate
       rejecting all signatures. */
expectGreen(
  'a correctly signed tree passes',
  (dir) => { resetTrust(dir); signSandbox(dir); }
);

/* 17. The signature itself altered. */
expectRed(
  'a tampered signature is refused',
  (dir) => { resetTrust(dir); signSandbox(dir, { tamperSignature: true }); },
  'signature does not verify'
);

/* 18. A VALID signature over a different head: the stale signature a
       release leaves behind, and also what a rollback to an older
       signed state looks like. */
expectRed(
  'a valid signature over a different chain head is refused',
  (dir) => { resetTrust(dir); signSandbox(dir, { headOverride: 'sha384-' + 'C'.repeat(64) }); },
  'the signature covers chain head'
);

/* 19. The substituted key. The attacker signs with a key of their own
       and publishes their public half; this is why the fingerprint has
       to be witnessed somewhere the host does not control -- and why
       the gate refuses a signature that does not close against the key
       trust.json actually publishes. */
expectRed(
  'a signature made with a key other than the published one is refused',
  (dir) => { resetTrust(dir); signSandbox(dir, { publishDifferentKey: true }); },
  'signature does not verify'
);

/* 20. The downgrade: a trust anchor exists and the signature is gone.
       Silence must not read as "unsigned is fine". */
expectRed(
  'a published signing key with no attestation is refused',
  (dir) => {
    resetTrust(dir);
    signSandbox(dir);
    rmSync(join(dir, 'api', 'attestation.json'), { force: true });
  },
  'api/attestation.json is missing'
);

/* 21. The index edited where the CHAIN does not look. The policy note
       is not inside any entry, so the chain still recomputes; only a
       signature taken over the whole index catches this. */
expectRed(
  'an index edited outside the chain entries is refused',
  (dir) => {
    resetTrust(dir);
    signSandbox(dir);
    patchJson(dir, 'api/index.json', (o) => { o.policy.note = 'trust us'; });
  },
  'a different api/index.json'
);

/* 22. A retired key cannot sign the current index. Rotation has to
       mean something, or publishing a new key after a compromise
       changes nothing. */
expectRed(
  'an attestation signed by a retired key is refused',
  (dir) => { resetTrust(dir); signSandbox(dir, { status: 'retired' }); },
  'which is retired'
);

/* 23. The fingerprint and the key material must agree. A human
       comparing a fingerprint against an offline record is the whole
       defence against a substituted key; if the fingerprint is just a
       string nobody recomputes, the defence is decorative. */
expectRed(
  'a trust anchor whose fingerprint does not match its key is refused',
  (dir) => {
    resetTrust(dir);
    signSandbox(dir);
    patchJson(dir, 'api/trust.json', (o) => { o.keys[0].fingerprint_sha384 = 'sha384-' + 'D'.repeat(64); });
  },
  'does not match the published key material'
);

/* 24. The real signer, end to end, against the real gate. The two
       programs are deliberately separate and each carries its own copy
       of the canonical-JSON rule; if those copies ever disagree by one
       byte, every signature stops verifying and only this case says so
       before a release does. */
expectGreen(
  'the real signer produces an attestation the gate accepts',
  (dir) => {
    resetTrust(dir);
    const keyDir = mkdtempSync(join(tmpdir(), 'nac3-key-'));
    const keyPath = join(keyDir, 'offline.pem');
    const gen = runSigner(dir, ['--keygen', '--key-id', 'e2e-key', '--key', keyPath]);
    if (gen.code !== 0) throw new Error('keygen failed: ' + gen.out);
    const sgn = runSigner(dir, ['--sign', '--key', keyPath]);
    if (sgn.code !== 0) throw new Error('sign failed: ' + sgn.out);
    rmSync(keyDir, { recursive: true, force: true });
  }
);

/* 25 + 26. The two ways the owner loses control of the key: writing it
       where git can take it, and overwriting the one that already
       signed everything. Both are refused by the signer itself. */
expectRedSigner(
  'the signer refuses to put a private key inside the repository',
  (dir) => ['--keygen', '--key-id', 'inside-repo', '--key', join(dir, 'api', 'leaked.pem')],
  'refusing to put a private signing key inside the repository'
);

expectRedSigner(
  'the signer refuses to overwrite an existing key',
  () => {
    const keyDir = mkdtempSync(join(tmpdir(), 'nac3-key-'));
    writeFileSync(join(keyDir, 'offline.pem'), 'do not clobber me\n');
    return ['--keygen', '--key-id', 'existing-key', '--key', join(keyDir, 'offline.pem')];
  },
  'a key already exists at'
);

/* 27 to 30. The witness record. api/trust.json tells a reader to
       compare the active fingerprint against the record in the release
       documentation, so that record is load-bearing: if it can drift
       from api/ without anything going red, the comparison it exists
       for passes against the wrong value. These four are the ways it
       can rot -- a wrong key, a wrong head, a record deleted, and the
       whole document gone. */
expectRed(
  'a witness record with a key fingerprint api/ does not publish is refused',
  (dir) => patch(dir, 'docs/CONTRACT_API_SIGNING.md', (s) =>
    s.replace(/\| key_fingerprint_sha384 \| sha384-[^|]+\|/, '| key_fingerprint_sha384 | sha384-' + 'E'.repeat(64) + ' |')),
  'records key_fingerprint_sha384 that api/ does not publish'
);

expectRed(
  'a witness record with a chain head api/ does not publish is refused',
  (dir) => patch(dir, 'docs/CONTRACT_API_SIGNING.md', (s) =>
    s.replace(/\| chain_head \| sha384-[^|]+\|/, '| chain_head | sha384-' + 'F'.repeat(64) + ' |')),
  'records chain_head that api/ does not publish'
);

expectRed(
  'a witness record whose markers were removed is refused',
  (dir) => patch(dir, 'docs/CONTRACT_API_SIGNING.md', (s) =>
    s.replace('<!-- NAC3-WITNESS-BEGIN -->', '')),
  'has no witness record'
);

expectRed(
  'a missing witness document is refused',
  (dir) => rmSync(join(dir, 'docs', 'CONTRACT_API_SIGNING.md'), { force: true }),
  'has no record outside api/'
);

console.log('');
console.log(passed + ' passed, ' + failed + ' failed');
if (failed) {
  console.log('');
  console.log('A failing case here means the gate does not actually guard what it claims to guard.');
  process.exit(1);
}
