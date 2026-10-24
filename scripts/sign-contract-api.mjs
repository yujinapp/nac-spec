#!/usr/bin/env node
/* =====================================================================
   sign-contract-api.mjs -- layer 4 of the tamper-evidence method:
   an Ed25519 signature over the published contract index, made with a
   key that lives OFFLINE on the owner's machine.

   Owner decision (2026-10-24, PND-034, option A): the private key is
   never a CI secret and never enters this repository. CI VERIFIES the
   signature and refuses to publish when it does not close; CI cannot
   produce one. That is the only arrangement in which compromising the
   publication pipeline does not let anyone sign a forged contract.

   What this program does -- and all it does -- is PRODUCE signatures.
   It deliberately does not verify: verification lives in two other
   programs written independently of this one, because a verifier that
   shares code with its producer only proves the two agree with each
   other.
     - scripts/build-contract-api.mjs   gate, before publication
     - scripts/verify-contract-api.mjs  consumer, over a served URL

   Usage:
     node scripts/sign-contract-api.mjs --keygen
     node scripts/sign-contract-api.mjs --keygen --key-id nac3-contract-2026
     node scripts/sign-contract-api.mjs --keygen --rotate
     node scripts/sign-contract-api.mjs --sign
     node scripts/sign-contract-api.mjs --sign --key D:/keys/mykey.pem

   Key location, in order of precedence:
     --key <path>
     $NAC3_CONTRACT_SIGNING_KEY
     <home>/.nac3-keys/contract-signing-<key_id>.pem

   Optional passphrase: set $NAC3_CONTRACT_KEY_PASSPHRASE before
   --keygen and the key is written encrypted (aes-256-cbc). The same
   variable must then be set for every --sign.

   ASCII only. No dependency beyond node core.
   ===================================================================== */

import {
  createHash, generateKeyPairSync, createPrivateKey, createPublicKey, sign as edSign,
} from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync, existsSync, chmodSync } from 'node:fs';
import { dirname, join, resolve, relative, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';

const ROOT     = join(dirname(fileURLToPath(import.meta.url)), '..');
const API_DIR  = join(ROOT, 'api');
const INDEX    = join(API_DIR, 'index.json');
const TRUST    = join(API_DIR, 'trust.json');
const ATTEST   = join(API_DIR, 'attestation.json');
const API_SCHEMA = 1;

function arg(name, fallback = null) {
  const i = process.argv.indexOf(name);
  return i >= 0 && process.argv[i + 1] && process.argv[i + 1].charAt(0) !== '-'
    ? process.argv[i + 1]
    : fallback;
}
const has = (name) => process.argv.indexOf(name) >= 0;

function die(msg, ...more) {
  console.error('FAIL  ' + msg);
  for (const m of more) console.error('      ' + m);
  process.exit(1);
}

const sha384 = (buf) => 'sha384-' + createHash('sha384').update(buf).digest('base64');

/* Canonical JSON, byte-identical to the rule in build-contract-api.mjs
   and verify-contract-api.mjs: keys sorted at every depth, two-space
   indent, LF, one trailing newline. The signature is taken over these
   exact bytes, so the three programs MUST agree on them. The function
   is repeated rather than imported on purpose -- see the header. */
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

function writeCanonical(path, value, label) {
  const text = canonical(value);
  if (text.indexOf('\r') >= 0) die('refusing to emit ' + label + ' with CR bytes (audit N-22)');
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, Buffer.from(text, 'utf8'));
  return Buffer.byteLength(text, 'utf8');
}

const passphrase = () => process.env.NAC3_CONTRACT_KEY_PASSPHRASE || null;

function defaultKeyPath(keyId) {
  if (process.env.NAC3_CONTRACT_SIGNING_KEY) return process.env.NAC3_CONTRACT_SIGNING_KEY;
  return join(homedir(), '.nac3-keys', 'contract-signing-' + keyId + '.pem');
}

/* The one mistake that cannot be undone by a later commit: a private
   signing key inside the working tree. Any path under the repository
   root is refused outright, whatever .gitignore happens to say today. */
function refuseInsideRepo(keyPath) {
  const abs = isAbsolute(keyPath) ? resolve(keyPath) : resolve(process.cwd(), keyPath);
  const rel = relative(resolve(ROOT), abs);
  if (rel && !rel.startsWith('..') && !isAbsolute(rel)) {
    die(
      'refusing to put a private signing key inside the repository: ' + abs,
      'this key must never be committable. Use a path outside ' + resolve(ROOT) + ',',
      'for example ' + join(homedir(), '.nac3-keys', 'contract-signing.pem')
    );
  }
  return abs;
}

function readTrust() {
  if (!existsSync(TRUST)) return null;
  try { return JSON.parse(readFileSync(TRUST, 'utf8')); }
  catch (e) { return die('api/trust.json is not valid JSON: ' + e.message); }
}

function fingerprintOf(publicKeyObject) {
  const der = publicKeyObject.export({ type: 'spki', format: 'der' });
  return { der, spki_b64: der.toString('base64'), fingerprint_sha384: sha384(der) };
}

/* ---- keygen -------------------------------------------------------- */

function keygen() {
  const keyId = arg('--key-id', 'nac3-contract-' + new Date().getUTCFullYear());
  if (!/^[a-z0-9][a-z0-9-]{2,63}$/.test(keyId)) {
    die('--key-id must be lowercase letters, digits and dashes (3-64 chars): got "' + keyId + '"');
  }
  const keyPath = refuseInsideRepo(arg('--key', defaultKeyPath(keyId)));

  /* Never overwrite. Overwriting a signing key is a silent, permanent
     loss: every signature it ever made becomes unverifiable and no
     error says so until a consumer fails. */
  if (existsSync(keyPath)) {
    die(
      'a key already exists at ' + keyPath,
      'this program will never overwrite one: that would permanently invalidate every',
      'signature it made. To create an additional key, pass --key-id <new-id> (and',
      '--rotate to retire the current one), or move the existing file away by hand.'
    );
  }

  const trust = readTrust();
  const existing = trust && Array.isArray(trust.keys) ? trust.keys : [];
  if (existing.some((k) => k.key_id === keyId)) {
    die('api/trust.json already publishes a key with key_id "' + keyId + '"',
        'pick another --key-id; a key_id identifies one key forever.');
  }
  const activeNow = existing.filter((k) => k.status === 'active');
  if (activeNow.length && !has('--rotate')) {
    die(
      'api/trust.json already publishes an active key (' + activeNow.map((k) => k.key_id).join(', ') + ')',
      'rerun with --rotate to retire it and publish this one as the active key.',
      'Retired keys stay published so old attestations remain verifiable.'
    );
  }

  const { publicKey, privateKey } = generateKeyPairSync('ed25519');
  const pass = passphrase();
  const pem = privateKey.export(
    pass
      ? { type: 'pkcs8', format: 'pem', cipher: 'aes-256-cbc', passphrase: pass }
      : { type: 'pkcs8', format: 'pem' }
  );
  mkdirSync(dirname(keyPath), { recursive: true });
  writeFileSync(keyPath, pem, { mode: 0o600, flag: 'wx' });
  try { chmodSync(keyPath, 0o600); } catch { /* best effort on Windows ACLs */ }

  const fp = fingerprintOf(publicKey);
  const today = new Date().toISOString().slice(0, 10);
  const nextKeys = existing
    .map((k) => (k.status === 'active' ? { ...k, status: 'retired', retired_at: today } : k))
    .concat([{
      key_id: keyId,
      algorithm: 'ed25519',
      status: 'active',
      created_at: today,
      public_key_spki_b64: fp.spki_b64,
      fingerprint_sha384: fp.fingerprint_sha384,
      custody: 'offline, on the owner machine. Never in this repository and never a CI secret (owner decision, PND-034 option A).',
    }]);

  writeCanonical(TRUST, {
    api_schema: API_SCHEMA,
    protocol: 'NAC3',
    surface: 'trust',
    generated_by: 'scripts/sign-contract-api.mjs',
    algorithm: 'ed25519',
    keys: nextKeys,
    policy: {
      ci_can_verify_but_cannot_sign: true,
      private_key_is_offline: true,
      retired_keys_are_never_removed: true,
      note: 'The public keys that may sign api/attestation.json. This file is published by the web host, which means a compromised host can serve a key of its own choosing: compare the fingerprint of the active key against this repository (git) and against the fingerprint recorded in the release documentation before trusting a signature. A signature is only evidence of provenance when the key is witnessed somewhere the signer does not control.',
    },
  }, 'api/trust.json');

  console.log('');
  console.log('Key created. The private half exists in exactly one place:');
  console.log('  ' + keyPath);
  console.log('');
  console.log('  key_id       ' + keyId);
  console.log('  fingerprint  ' + fp.fingerprint_sha384);
  console.log('  encrypted    ' + (pass ? 'yes (NAC3_CONTRACT_KEY_PASSPHRASE)' : 'no'));
  console.log('');
  console.log('WROTE api/trust.json (' + nextKeys.length + ' key(s), active: ' + keyId + ')');
  console.log('');
  console.log('Back that file up offline NOW. There is no recovery: lose it and the only');
  console.log('remedy is publishing a new key, which every consumer has to learn about.');
  console.log('Record the fingerprint above somewhere outside this machine -- it is what');
  console.log('lets anyone detect a substituted key.');
  console.log('');
  console.log('Next: node scripts/sign-contract-api.mjs --sign');
}

/* ---- sign ---------------------------------------------------------- */

function signIndex() {
  if (!existsSync(INDEX)) die('api/index.json does not exist: there is no contract chain to sign');
  const trust = readTrust();
  if (!trust) {
    die('api/trust.json does not exist: no signing key has been published',
        'run: node scripts/sign-contract-api.mjs --keygen');
  }
  const active = (trust.keys || []).filter((k) => k.status === 'active');
  if (active.length !== 1) {
    die('api/trust.json must publish exactly one active key, it publishes ' + active.length);
  }
  const key = active[0];
  const keyPath = refuseInsideRepo(arg('--key', defaultKeyPath(key.key_id)));
  if (!existsSync(keyPath)) {
    die('no private key at ' + keyPath,
        'this is the offline key for key_id "' + key.key_id + '". Pass --key <path> if it lives elsewhere,',
        'or set NAC3_CONTRACT_SIGNING_KEY.');
  }

  const pass = passphrase();
  let privateKey = null;
  try {
    privateKey = createPrivateKey(pass
      ? { key: readFileSync(keyPath), passphrase: pass }
      : readFileSync(keyPath));
  } catch (e) {
    die('could not read the private key at ' + keyPath + ': ' + e.message,
        pass ? 'NAC3_CONTRACT_KEY_PASSPHRASE is set -- is it the right one?'
             : 'if the key was created with a passphrase, set NAC3_CONTRACT_KEY_PASSPHRASE.');
  }

  /* The key on disk must be the key the world was told about, or the
     signature verifies against nothing. */
  const fp = fingerprintOf(createPublicKey(privateKey));
  if (fp.fingerprint_sha384 !== key.fingerprint_sha384) {
    die(
      'the private key at ' + keyPath + ' is not the key api/trust.json publishes as active',
      'trust.json  ' + key.fingerprint_sha384,
      'this key    ' + fp.fingerprint_sha384,
      'signing with it would produce an attestation nobody can verify.'
    );
  }

  const indexBytes = readFileSync(INDEX);
  const index = JSON.parse(indexBytes.toString('utf8'));

  /* The payload binds the signature to: the exact index bytes, the
     chain head, how many entries there were, and which versions were
     published. index_sha384 is the strongest of the four -- it means
     the signature covers the whole published index, not just its
     head, so altering the policy text or the entry list breaks it. */
  const payload = {
    api_schema: API_SCHEMA,
    protocol: 'NAC3',
    surface: 'attestation-payload',
    key_id: key.key_id,
    chain_head: index.chain_head,
    entry_count: index.entry_count,
    index_sha384: sha384(indexBytes),
    versions: (index.entries || []).map((e) => e.version),
    signed_at: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
  };
  const signedBytes = Buffer.from(canonical(payload), 'utf8');
  const signature = edSign(null, signedBytes, privateKey).toString('base64');

  const bytes = writeCanonical(ATTEST, {
    api_schema: API_SCHEMA,
    protocol: 'NAC3',
    surface: 'attestation',
    generated_by: 'scripts/sign-contract-api.mjs',
    algorithm: 'ed25519',
    statement: 'The holder of the offline key published as ' + key.key_id + ' in api/trust.json attests that api/index.json, with the sha384 and chain head recorded in payload below, is the contract index this project published. The signature is over the canonical JSON of payload: keys sorted at every depth, two-space indent, LF, one trailing newline.',
    payload,
    signature_b64: signature,
    verify_with: 'node scripts/verify-contract-api.mjs --base <url> --expect-head-from-repo',
  }, 'api/attestation.json');

  console.log('');
  console.log('Signed the published contract index.');
  console.log('  key_id       ' + key.key_id);
  console.log('  fingerprint  ' + key.fingerprint_sha384);
  console.log('  chain head   ' + payload.chain_head);
  console.log('  index sha384 ' + payload.index_sha384);
  console.log('  entries      ' + payload.entry_count + ' (' + payload.versions.join(', ') + ')');
  console.log('  signed at    ' + payload.signed_at);
  console.log('');
  console.log('WROTE api/attestation.json (' + bytes + ' bytes)');
  console.log('');
  console.log('Next: node scripts/build-contract-api.mjs   (the gate verifies this signature)');
}

/* ---- main ---------------------------------------------------------- */

if (has('--keygen')) keygen();
else if (has('--sign')) signIndex();
else {
  console.log('sign-contract-api.mjs -- produce the offline Ed25519 attestation over api/index.json');
  console.log('');
  console.log('  --keygen [--key-id <id>] [--key <path>] [--rotate]   create the offline key, publish its public half');
  console.log('  --sign   [--key <path>]                              sign the current api/index.json');
  console.log('');
  console.log('This program only SIGNS. Verification is in build-contract-api.mjs (gate)');
  console.log('and verify-contract-api.mjs (consumer, over a URL).');
  process.exit(2);
}
