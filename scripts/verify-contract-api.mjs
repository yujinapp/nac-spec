#!/usr/bin/env node
/* =====================================================================
   verify-contract-api.mjs -- verify a PUBLISHED NAC3 contract API
   without trusting the host that served it.

   This is the consumer side of the tamper-evidence method, and it is
   deliberately a separate program from the generator: a verifier that
   shares code with the producer only proves they agree with each
   other. This one takes a URL and nothing else.

   What it does, in order:
     1. fetches api/index.json over the network;
     2. recomputes the hash chain end to end, entry by entry;
     3. fetches every artefact the chain lists and compares the bytes
        it actually received against the recorded length and sha384;
     4. fetches api/latest.json and checks the pointers against the
        chain -- including that a `latest` claiming a stable version
        is backed by a stable entry;
     5. checks that the response carries the CORS header an agent in a
        browser needs in order to read any of this at all;
     6. fetches api/trust.json and api/attestation.json and checks the
        Ed25519 signature over the canonical payload -- including that
        the signed index_sha384 is the sha384 of the index bytes THIS
        host just served. The key that makes those signatures lives
        offline on the owner machine, so a signature that closes is
        evidence no compromise of the web host or of CI can produce;
     7. if --expect-head / --expect-key are given, compares the chain
        head and the signing key fingerprint against values obtained
        somewhere ELSE (this repository, the npm tarball, the release
        notes). That comparison is the point: a compromised host can
        serve a perfectly self-consistent forgery -- rebuilt chain,
        own key, valid signature over it -- and only an independent
        witness catches that. scripts/test-contract-api-http.mjs
        carries exactly that case.

   Usage:
     node scripts/verify-contract-api.mjs
     node scripts/verify-contract-api.mjs --base https://yujin.app/nac-spec/
     node scripts/verify-contract-api.mjs --expect-head sha384-...
     node scripts/verify-contract-api.mjs --expect-key sha384-...
     node scripts/verify-contract-api.mjs --expect-head-from-repo
     node scripts/verify-contract-api.mjs --expect-key-from-repo

   Exit code 0 only if every check passed.
   ASCII only. No dependency beyond node core.
   ===================================================================== */

import { createHash, createPublicKey, verify as edVerify } from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

function arg(name, fallback) {
  const i = process.argv.indexOf(name);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}
const BASE = arg('--base', 'https://yujin.app/nac-spec/').replace(/\/+$/, '') + '/';
const TIMEOUT_MS = Number(arg('--timeout', '20000'));

let expectHead = arg('--expect-head', null);
if (process.argv.includes('--expect-head-from-repo')) {
  const p = join(ROOT, 'api', 'index.json');
  if (!existsSync(p)) {
    console.error('FAIL  --expect-head-from-repo: this repository has no api/index.json');
    process.exit(1);
  }
  expectHead = JSON.parse(readFileSync(p, 'utf8')).chain_head;
}

/* The signing key needs an independent witness of its own, for the
   same reason the head does: trust.json is served by the host, so a
   compromised host can publish a key it holds and sign whatever it
   likes with it. The repository is the witness CI has at hand; a
   third party uses --expect-key with the fingerprint from the release
   notes. Taking the fingerprint from the repo is also what makes a
   DOWNGRADE visible: a host that stops serving the signature at all. */
let expectKey = arg('--expect-key', null);
if (process.argv.includes('--expect-head-from-repo') || process.argv.includes('--expect-key-from-repo')) {
  const p = join(ROOT, 'api', 'trust.json');
  if (existsSync(p)) {
    const t = JSON.parse(readFileSync(p, 'utf8'));
    const active = (t.keys || []).filter((k) => k.status === 'active');
    if (active.length === 1) expectKey = expectKey || active[0].fingerprint_sha384;
  } else if (process.argv.includes('--expect-key-from-repo')) {
    console.error('FAIL  --expect-key-from-repo: this repository has no api/trust.json');
    process.exit(1);
  }
}

let failed = false;
const fail = (m) => { failed = true; console.error('FAIL  ' + m); };
const ok   = (m) => console.log('OK    ' + m);

const sha384 = (buf) => 'sha384-' + createHash('sha384').update(buf).digest('base64');

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

function entryHash(entry) {
  const copy = { ...entry };
  delete copy.entry_sha384;
  return sha384(Buffer.from(canonical(copy), 'utf8'));
}

async function get(path) {
  const url = BASE + path;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    /* An Origin header on purpose: this is the request an agent
       running in a page on another site actually makes. */
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { Origin: 'https://example.com', 'Cache-Control': 'no-cache' },
    });
    const buf = Buffer.from(await res.arrayBuffer());
    return { url, status: res.status, headers: res.headers, buf };
  } finally {
    clearTimeout(t);
  }
}

async function main() {
  console.log('base              ' + BASE);

  const idxRes = await get('api/index.json');
  if (idxRes.status !== 200) {
    fail('api/index.json returned HTTP ' + idxRes.status + ' -- there is no published contract API at this base');
    process.exit(1);
  }

  /* CORS first: without it, everything else here is readable by curl
     and unreadable by the only consumer that matters, an agent in a
     browser on someone else's page. */
  const acao = idxRes.headers.get('access-control-allow-origin');
  if (!acao) {
    fail('api/index.json is served without Access-Control-Allow-Origin: a browser agent on another origin cannot read the contract');
  } else {
    ok('CORS present (Access-Control-Allow-Origin: ' + acao + ')');
  }
  const ctype = idxRes.headers.get('content-type') || '';
  if (ctype.indexOf('application/json') < 0) {
    fail('api/index.json is served as "' + ctype + '" instead of application/json');
  } else {
    ok('content type is ' + ctype);
  }

  let index;
  try {
    index = JSON.parse(idxRes.buf.toString('utf8'));
  } catch (e) {
    fail('api/index.json is not valid JSON: ' + e.message);
    process.exit(1);
  }

  /* ---- the chain ---- */
  let prev = null;
  let i = 0;
  for (const entry of index.entries || []) {
    i += 1;
    if (entry.prev_entry_sha384 !== prev) {
      fail('chain broken at entry ' + i + ' (' + entry.version + '): it does not follow the entry before it');
    }
    const recomputed = entryHash(entry);
    if (entry.entry_sha384 !== recomputed) {
      fail('chain broken at entry ' + i + ' (' + entry.version + '): the entry content does not hash to its recorded hash');
    }
    prev = entry.entry_sha384;
  }
  if (index.chain_head !== prev) {
    fail('the published chain head does not match the last entry');
  } else if (!failed) {
    ok('chain recomputes end to end (' + (index.entries || []).length + ' entries)');
  }

  /* ---- the artefacts, byte for byte, as served ---- */
  let checkedFiles = 0;
  for (const entry of index.entries || []) {
    for (const f of entry.files || []) {
      /* The chain records repository-relative paths; under the
         published base, api/... is served at the same relative path. */
      const res = await get(f.path);
      if (res.status !== 200) {
        fail(f.path + ' returned HTTP ' + res.status + ' -- the chain lists an artefact the host does not serve');
        continue;
      }
      if (res.buf.length !== f.bytes) {
        fail(f.path + ' was served as ' + res.buf.length + ' bytes and the chain records ' + f.bytes);
        continue;
      }
      const got = sha384(res.buf);
      if (got !== f.sha384) {
        fail(f.path + ' hash mismatch over the bytes actually served');
        console.error('        served   ' + got);
        console.error('        recorded ' + f.sha384);
        continue;
      }
      checkedFiles += 1;
    }
  }
  if (checkedFiles) ok(checkedFiles + ' artefact(s) match the chain over the bytes the server sent');

  /* ---- the pointer ---- */
  const latestRes = await get('api/latest.json');
  if (latestRes.status !== 200) {
    fail('api/latest.json returned HTTP ' + latestRes.status);
  } else {
    const pointer = JSON.parse(latestRes.buf.toString('utf8'));
    if (pointer.chain_head !== index.chain_head) {
      fail('api/latest.json records a different chain head than api/index.json');
    }
    const stableEntry = (index.entries || []).filter((e) => e.channel === 'stable').pop() || null;
    if (pointer.stable && !stableEntry) {
      fail('api/latest.json advertises stable=' + pointer.stable + ' and the chain contains no stable entry');
    } else if (pointer.stable && stableEntry && pointer.stable !== stableEntry.version) {
      fail('api/latest.json advertises stable=' + pointer.stable + ' and the newest stable entry is ' + stableEntry.version);
    } else {
      ok('latest pointer agrees with the chain (stable=' + pointer.stable + ', prerelease=' + pointer.prerelease + ')');
    }
    /* The mirror must be a copy, not a second editable truth. */
    const mirrored = (index.entries || []).find((e) => e.version === pointer.mirrored_in_api_latest);
    if (!mirrored) {
      fail('api/latest.json says it mirrors ' + pointer.mirrored_in_api_latest + ', which is not in the chain');
    } else {
      /* Its own flag, not the global one: an earlier unrelated failure
         must not swallow the result of this check. A verifier that
         goes quiet about what it did check is a verifier nobody can
         read. */
      let mirrorOk = true;
      for (const f of mirrored.files) {
        const name = f.path.split('/').pop();
        const res = await get('api/latest/' + name);
        if (res.status !== 200) {
          fail('api/latest/' + name + ' returned HTTP ' + res.status);
          mirrorOk = false;
          continue;
        }
        if (sha384(res.buf) !== f.sha384) {
          fail('api/latest/' + name + ' is not byte-identical to the version it claims to mirror');
          mirrorOk = false;
        }
      }
      if (mirrorOk) ok('api/latest/ is byte-identical to ' + mirrored.version);
    }
  }

  /* ---- the offline signature ----
     The chain catches an altered artefact and the head witness catches
     a host serving a coherent forgery. Neither catches someone who can
     PUSH to the repository: they rewrite the chain and every witness
     follows. The signature closes that, and only because the key is
     offline on the owner machine -- not in the repository, not in CI
     (owner decision 2026-10-24, PND-034 option A). */
  const trustRes = await get('api/trust.json');
  const attRes = await get('api/attestation.json');

  if (trustRes.status !== 200) {
    if (expectKey) {
      fail('this repository publishes a signing key and the host serves no api/trust.json (HTTP ' + trustRes.status + ')');
      console.error('        a publication that silently loses its signature is a downgrade, not an absence.');
    } else {
      console.log('      no signature layer published: provenance rests on the chain and the head witness.');
    }
  } else {
    let trust = null;
    try { trust = JSON.parse(trustRes.buf.toString('utf8')); }
    catch (e) { fail('api/trust.json is not valid JSON: ' + e.message); }

    /* Three states, not two: the key matched a witness, there was no
       witness to match, or it matched nothing. Only the first one lets
       a valid signature mean provenance, and the output has to say
       which one happened -- an "OK signature" line printed next to a
       substituted key is worse than no line at all. */
    let keyWitness = expectKey ? 'mismatch' : 'none';
    const active = trust ? (trust.keys || []).filter((k) => k.status === 'active') : [];
    if (trust && active.length !== 1) {
      fail('api/trust.json publishes ' + active.length + ' active keys; exactly one is required');
    } else if (trust) {
      const key = active[0];
      /* The fingerprint a human compares must match the key material
         it is printed next to, or the comparison proves nothing. */
      if (sha384(Buffer.from(key.public_key_spki_b64 || '', 'base64')) !== key.fingerprint_sha384) {
        fail('api/trust.json: the active key fingerprint does not match the key material beside it');
      } else if (expectKey && key.fingerprint_sha384 !== expectKey) {
        fail('the host publishes a signing key that the independent witness does not know');
        console.error('        published ' + key.fingerprint_sha384);
        console.error('        expected  ' + expectKey);
        console.error('        a substituted key with a valid signature over forged data is exactly');
        console.error('        what this comparison exists to catch.');
      } else {
        if (expectKey) keyWitness = 'matched';
        ok(expectKey
          ? 'signing key matches the independent witness (' + key.key_id + ')'
          : 'host publishes a signing key (' + key.key_id + '), not compared against any witness');
      }

      if (attRes.status !== 200) {
        fail('api/trust.json publishes a signing key and api/attestation.json returned HTTP ' + attRes.status + ': the contract is served unsigned');
      } else {
        let att = null;
        try { att = JSON.parse(attRes.buf.toString('utf8')); }
        catch (e) { fail('api/attestation.json is not valid JSON: ' + e.message); }
        const p = att && att.payload;
        if (!p || !att.signature_b64) {
          fail('api/attestation.json carries no payload or no signature');
        } else if (p.key_id !== key.key_id) {
          fail('api/attestation.json is signed by "' + p.key_id + '" and the active key is "' + key.key_id + '"');
        } else {
          let sigOk = false;
          try {
            const pub = createPublicKey({
              key: Buffer.from(key.public_key_spki_b64, 'base64'),
              format: 'der',
              type: 'spki',
            });
            sigOk = edVerify(null, Buffer.from(canonical(p), 'utf8'), pub, Buffer.from(att.signature_b64, 'base64'));
          } catch (e) {
            fail('api/attestation.json signature could not be checked: ' + e.message);
          }
          if (!sigOk) {
            fail('api/attestation.json signature does not verify against the published key');
          } else {
            /* Over the bytes the SERVER sent, not the repository copy.
               This is what makes the signature cover the publication
               rather than the intention. */
            const servedIndexSha = sha384(idxRes.buf);
            let covered = true;
            if (p.index_sha384 !== servedIndexSha) {
              fail('the signature covers a different api/index.json than the one the host served');
              console.error('        signed ' + p.index_sha384);
              console.error('        served ' + servedIndexSha);
              covered = false;
            }
            if (p.chain_head !== index.chain_head) {
              fail('the signature covers chain head ' + String(p.chain_head).slice(7, 19) + '... and the served index head is ' + String(index.chain_head).slice(7, 19) + '...');
              covered = false;
            }
            const sv = (p.versions || []).join(',');
            const iv = (index.entries || []).map((e) => e.version).join(',');
            if (sv !== iv || p.entry_count !== index.entry_count) {
              fail('the signature covers versions [' + sv + '] and the host publishes [' + iv + ']');
              covered = false;
            }
            if (covered && keyWitness === 'matched') {
              ok('offline signature verifies over the served index, by the witnessed key (signed ' + p.signed_at + ')');
            } else if (covered) {
              console.log('      the signature closes against the key THIS HOST published'
                + (keyWitness === 'mismatch' ? ', which is not the witnessed one: it proves nothing.' : '.'));
              console.log('      pass --expect-key <fingerprint> to turn that into evidence of provenance.');
            }
          }
        }
      }
    }
  }

  /* ---- the independent witness ---- */
  if (expectHead) {
    if (index.chain_head !== expectHead) {
      fail('the published chain head does not match the independent witness');
      console.error('        published ' + index.chain_head);
      console.error('        expected  ' + expectHead);
      console.error('        a host serving a self-consistent chain that disagrees with the repository');
      console.error('        and the npm tarball is the signature of a tampered publication.');
    } else {
      ok('chain head matches the independent witness');
    }
  } else {
    console.log('      no --expect-head given: self-consistency verified, provenance NOT verified.');
    console.log('      a compromised host can serve a coherent forgery; compare the head against');
    console.log('      the repository and the npm tarball to rule that out.');
  }

  console.log('');
  if (failed) {
    console.log('The published contract API did NOT verify. Do not trust it.');
    process.exit(1);
  }
  console.log('The published contract API verifies.');
}

main().catch((e) => {
  console.error('FAIL  ' + e.message);
  process.exit(1);
});
