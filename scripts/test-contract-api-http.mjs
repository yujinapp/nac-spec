#!/usr/bin/env node
/* =====================================================================
   test-contract-api-http.mjs -- prove the CONSUMER verifier goes red.

   scripts/test-contract-api.mjs covers the producer gate, which runs
   before publication. This suite covers the other half, and the half
   that matters to anyone who is not us: scripts/verify-contract-api.mjs,
   the program a third party points at a URL to decide whether the
   contract they received is the one this project published.

   A verifier is worth exactly what its red cases are worth. So each
   case here stands up a real HTTP server over a copy of api/, serves a
   tampered publication through it, runs the verifier as a separate
   process against that URL, and asserts it refuses for the right
   reason. Nothing is mocked: the verifier does real fetches and
   recomputes hashes over the bytes it actually received.

   The headline case is the LAST one: a host that rewrites an artefact,
   rebuilds the whole hash chain so it recomputes end to end, publishes
   a signing key of its own and signs the forgery with it. Everything
   closes against itself. Only a witness the host does not control --
   the key fingerprint and the chain head recorded elsewhere -- catches
   it. If that case ever goes green, the signature layer is decoration.

   The owner's offline key is never involved: every case generates a
   throwaway key in memory.

   Run: node scripts/test-contract-api-http.mjs
   ASCII only. No dependency beyond node core.
   ===================================================================== */

import { createServer } from 'node:http';
import { createHash, generateKeyPairSync, sign as edSign } from 'node:crypto';
import { readFileSync, writeFileSync, rmSync, mkdtempSync, existsSync, statSync, cpSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const VERIFIER = join(ROOT, 'scripts', 'verify-contract-api.mjs');

let passed = 0;
let failed = 0;

const sha384 = (buf) => 'sha384-' + createHash('sha384').update(buf).digest('base64');

/* The same canonical-JSON rule as the generator, the signer and the
   verifier. Repeated here on purpose: if this copy ever disagrees with
   theirs, these cases stop reproducing what a real consumer sees. */
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

const entryHash = (entry) => {
  const copy = { ...entry };
  delete copy.entry_sha384;
  return sha384(Buffer.from(canonical(copy), 'utf8'));
};

/* ---- a host ---------------------------------------------------------
   Serves the files with the headers the production .htaccess sets, so
   a case that passes here is a case that passes against the real host
   for the same reason -- including the CORS header, whose absence was
   the measured defect of 2026-10-24. */

function startHost(dir, { cors = true } = {}) {
  return new Promise((resolve) => {
    const server = createServer((req, res) => {
      const rel = normalize(decodeURIComponent(req.url.split('?')[0])).replace(/^[\\/]+/, '');
      const path = join(dir, rel);
      const headers = { 'Content-Type': 'application/json; charset=UTF-8', 'X-Content-Type-Options': 'nosniff' };
      if (cors) {
        headers['Access-Control-Allow-Origin'] = '*';
        headers['Access-Control-Allow-Methods'] = 'GET, HEAD, OPTIONS';
      }
      if (!existsSync(path) || !statSync(path).isFile()) {
        res.writeHead(404, cors ? { 'Access-Control-Allow-Origin': '*' } : {});
        res.end('not found\n');
        return;
      }
      res.writeHead(200, headers);
      res.end(readFileSync(path));
    });
    server.listen(0, '127.0.0.1', () => resolve({ server, port: server.address().port }));
  });
}

const stopHost = (h) => new Promise((resolve) => h.server.close(resolve));

/* ---- a publication to serve ---------------------------------------- */

function publication() {
  const dir = mkdtempSync(join(tmpdir(), 'nac3-http-'));
  cpSync(join(ROOT, 'api'), join(dir, 'api'), { recursive: true });
  /* The repository may or may not carry a trust anchor at this point in
     its life. Every case below publishes its own, so start from none. */
  rmSync(join(dir, 'api', 'trust.json'), { force: true });
  rmSync(join(dir, 'api', 'attestation.json'), { force: true });
  return dir;
}

const readJson = (p) => JSON.parse(readFileSync(p, 'utf8'));
const writeJson = (p, o) => writeFileSync(p, Buffer.from(canonical(o), 'utf8'));

/* Publish a key and sign the index that is on disk, exactly the way
   scripts/sign-contract-api.mjs does it. Returns the fingerprint a
   consumer would have been told about out of band. */
function sign(dir, { keyId = 'http-suite-key' } = {}) {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519');
  const der = publicKey.export({ type: 'spki', format: 'der' });
  const fingerprint = sha384(der);
  writeJson(join(dir, 'api', 'trust.json'), {
    api_schema: 1,
    protocol: 'NAC3',
    surface: 'trust',
    generated_by: 'scripts/test-contract-api-http.mjs',
    algorithm: 'ed25519',
    keys: [{
      key_id: keyId,
      algorithm: 'ed25519',
      status: 'active',
      created_at: '2026-10-24',
      public_key_spki_b64: der.toString('base64'),
      fingerprint_sha384: fingerprint,
      custody: 'throwaway key, generated by the regression suite',
    }],
    policy: { ci_can_verify_but_cannot_sign: true, private_key_is_offline: true },
  });

  const indexBytes = readFileSync(join(dir, 'api', 'index.json'));
  const index = JSON.parse(indexBytes.toString('utf8'));
  const payload = {
    api_schema: 1,
    protocol: 'NAC3',
    surface: 'attestation-payload',
    key_id: keyId,
    chain_head: index.chain_head,
    entry_count: index.entry_count,
    index_sha384: sha384(indexBytes),
    versions: (index.entries || []).map((e) => e.version),
    signed_at: '2026-10-24T00:00:00Z',
  };
  writeJson(join(dir, 'api', 'attestation.json'), {
    api_schema: 1,
    protocol: 'NAC3',
    surface: 'attestation',
    generated_by: 'scripts/test-contract-api-http.mjs',
    algorithm: 'ed25519',
    statement: 'suite',
    payload,
    signature_b64: edSign(null, Buffer.from(canonical(payload), 'utf8'), privateKey).toString('base64'),
  });
  return { fingerprint, head: index.chain_head };
}

/* The compromised host: internally perfect, externally detectable. */
function forgeEverything(dir) {
  const version = readJson(join(dir, 'api', 'index.json')).entries.slice(-1)[0].version;
  const victim = 'api/v/' + version + '/contract.json';
  const original = readFileSync(join(dir, victim));
  const forged = Buffer.from(original.toString('utf8').replace('"protocol": "NAC3"', '"protocol": "NAC3-EVIL"'), 'utf8');
  writeFileSync(join(dir, victim), forged);
  writeFileSync(join(dir, 'api', 'latest', 'contract.json'), forged);

  const index = readJson(join(dir, 'api', 'index.json'));
  let prev = null;
  for (const e of index.entries) {
    for (const f of e.files) {
      if (f.path === victim) { f.bytes = forged.length; f.sha384 = sha384(forged); }
    }
    e.prev_entry_sha384 = prev;
    delete e.entry_sha384;
    e.entry_sha384 = entryHash(e);
    prev = e.entry_sha384;
  }
  index.chain_head = prev;
  writeJson(join(dir, 'api', 'index.json'), index);

  const ptr = readJson(join(dir, 'api', 'latest.json'));
  ptr.chain_head = index.chain_head;
  writeJson(join(dir, 'api', 'latest.json'), ptr);

  /* ... and sign the result with a key the attacker controls, published
     under the key_id a real deployment would use. */
  sign(dir, { keyId: 'nac3-contract-2026' });
}

/* ---- the harness ---------------------------------------------------- */

/* spawn, never spawnSync: the HTTP host lives in THIS process, so a
   synchronous child blocks the event loop that has to answer its
   requests and every case fails with an aborted fetch. That mistake
   cost one debugging round and is exactly the kind of thing a comment
   is for. */
function runVerifier(port, args) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [VERIFIER, '--base', 'http://127.0.0.1:' + port + '/', ...args], {
      cwd: ROOT,
    });
    let out = '';
    child.stdout.on('data', (b) => { out += b.toString('utf8'); });
    child.stderr.on('data', (b) => { out += b.toString('utf8'); });
    child.on('close', (code) => resolve({ code, out }));
  });
}

async function expectRed(name, prepare, args, expectText) {
  const dir = publication();
  let host = null;
  try {
    const extra = prepare(dir) || {};
    host = await startHost(dir, extra.hostOptions);
    const { code, out } = await runVerifier(host.port, typeof args === 'function' ? args(extra) : args);
    if (code === 0) {
      failed += 1;
      console.log('RED-FAIL  ' + name);
      console.log('          the verifier ACCEPTED a tampered publication. This is the bug the case exists to catch.');
      return;
    }
    if (expectText && out.indexOf(expectText) < 0) {
      failed += 1;
      console.log('RED-FAIL  ' + name);
      console.log('          it refused, but not for the expected reason.');
      console.log('          expected to see: ' + expectText);
      console.log(out.split('\n').filter((l) => l.startsWith('FAIL')).map((l) => '            ' + l).join('\n'));
      return;
    }
    passed += 1;
    console.log('RED-OK    ' + name);
  } finally {
    if (host) await stopHost(host);
    rmSync(dir, { recursive: true, force: true });
  }
}

async function expectGreen(name, prepare, args) {
  const dir = publication();
  let host = null;
  try {
    const extra = prepare(dir) || {};
    host = await startHost(dir, extra.hostOptions);
    const { code, out } = await runVerifier(host.port, typeof args === 'function' ? args(extra) : args);
    if (code !== 0) {
      failed += 1;
      console.log('GREEN-FAIL ' + name);
      console.log(out.split('\n').map((l) => '            ' + l).join('\n'));
      return;
    }
    passed += 1;
    console.log('GREEN-OK  ' + name);
  } finally {
    if (host) await stopHost(host);
    rmSync(dir, { recursive: true, force: true });
  }
}

/* ---- cases ---------------------------------------------------------- */

console.log('contract API consumer verifier -- regression suite over real HTTP');
console.log('');

/* 1. An honest publication, signed, with both witnesses supplied. If
      this is not green the reds below prove nothing. */
await expectGreen(
  'an intact signed publication verifies over HTTP',
  (dir) => sign(dir),
  (e) => ['--expect-head', e.head, '--expect-key', e.fingerprint]
);

/* 2. Layer 1 over the wire: an artefact altered and the chain left
      alone. The hash is recomputed over the bytes the server sent, not
      over the repository, which is the only version of this check that
      says anything about the host. */
await expectRed(
  'an altered artefact is caught over the bytes the server sent',
  (dir) => {
    const e = sign(dir);
    const version = readJson(join(dir, 'api', 'index.json')).entries.slice(-1)[0].version;
    const p = join(dir, 'api', 'v', version, 'levels.json');
    /* Length-preserving on purpose. A mutation that also changes the
       byte count is caught by the cheaper length check and never
       exercises the hash, which is the thing this case is about. */
    writeFileSync(p, Buffer.from(readFileSync(p, 'utf8').replace('"protocol": "NAC3"', '"protocol": "NAC4"'), 'utf8'));
    return e;
  },
  (e) => ['--expect-head', e.head, '--expect-key', e.fingerprint],
  'hash mismatch over the bytes actually served'
);

/* 3. The signature altered in flight. */
await expectRed(
  'a tampered signature is refused',
  (dir) => {
    const e = sign(dir);
    const p = join(dir, 'api', 'attestation.json');
    const att = readJson(p);
    att.signature_b64 = (att.signature_b64.charAt(0) === 'A' ? 'B' : 'A') + att.signature_b64.slice(1);
    writeJson(p, att);
    return e;
  },
  (e) => ['--expect-head', e.head, '--expect-key', e.fingerprint],
  'signature does not verify'
);

/* 4. The downgrade. A host that quietly stops serving the signature
      must not read as a host that never had one: the consumer was told
      a key exists, so its absence is the finding. */
await expectRed(
  'a host that drops the signature layer is refused',
  (dir) => {
    const e = sign(dir);
    rmSync(join(dir, 'api', 'trust.json'), { force: true });
    rmSync(join(dir, 'api', 'attestation.json'), { force: true });
    return e;
  },
  (e) => ['--expect-head', e.head, '--expect-key', e.fingerprint],
  'serves no api/trust.json'
);

/* 5. The signature is there and the key is not the witnessed one: the
      compromised host signing with a key it holds, but without
      bothering to rebuild the chain. */
await expectRed(
  'a substituted signing key is refused',
  (dir) => {
    const honest = sign(dir);
    sign(dir, { keyId: 'nac3-contract-2026' });   /* re-signs with a NEW key */
    return honest;                                /* the consumer still expects the old fingerprint */
  },
  (e) => ['--expect-head', e.head, '--expect-key', e.fingerprint],
  'publishes a signing key that the independent witness does not know'
);

/* 6. THE case. Artefact rewritten, chain rebuilt so it recomputes end
      to end, pointer and mirror kept consistent, attacker key
      published, forgery signed with it. Everything agrees with
      everything -- and the two independent witnesses still catch it.
      This is the difference between self-consistency and provenance. */
await expectRed(
  'a self-consistent forgery, chain rebuilt and re-signed, is still refused',
  (dir) => {
    const honest = sign(dir);
    forgeEverything(dir);
    return honest;
  },
  (e) => ['--expect-head', e.head, '--expect-key', e.fingerprint],
  'does not match the independent witness'
);

/* 7. Without the witnesses there is nothing to catch it with, and the
      verifier must not pretend otherwise: the same forgery run with no
      --expect flags is accepted, and the verifier says in so many words
      that it verified self-consistency and NOT provenance. The case
      exists so that sentence can never be quietly deleted. */
await expectGreen(
  'the same forgery passes without witnesses -- and says so',
  (dir) => { sign(dir); forgeEverything(dir); },
  []
);

/* 8. No CORS header. Measured on the real host on 2026-10-24: the
      contract was readable by curl and unreadable by the only consumer
      it exists for, an agent inside a page on another origin. */
await expectRed(
  'a host serving the contract without CORS is refused',
  (dir) => {
    const e = sign(dir);
    return { ...e, hostOptions: { cors: false } };
  },
  (e) => ['--expect-head', e.head, '--expect-key', e.fingerprint],
  'without Access-Control-Allow-Origin'
);

console.log('');
console.log(passed + ' passed, ' + failed + ' failed');
if (failed) {
  console.log('');
  console.log('A failing case here means the command this project publishes for third parties');
  console.log('does not actually detect what it claims to detect.');
  process.exit(1);
}
