#!/usr/bin/env node
/* =====================================================================
   verify-npm-publication.mjs -- bring the PUBLISHED npm package back
   from the registry and refuse it if it is not this tree.

   Why this program exists, written down so nobody has to reconstruct
   it: on 2026-10-24 the published `@nac3/runtime` shipped the previous
   version's SPEC.md (835 differing lines, declaring a version the tin
   did not) and dist headers that said "MIT License" while the LICENSE
   beside them said Apache-2.0. Nothing caught it. An adopter running
   `npm install @nac3/runtime` received a specification for a different
   version of the protocol than the code they got.

   The cause was closed by check-version-coherence.mjs: the version is
   declared once and every consumer in the tree must agree. But that
   gate reads the TREE. It cannot see what is on the registry, so it
   cannot catch a publication made from a dirty working copy, from the
   wrong branch, from an older checkout, or one where `npm run build`
   was not re-run. The only way to know what adopters receive is to
   fetch what adopters receive.

   That is the whole of this program:
     1. read name + version from runtime/package.json -- the tree is
        the witness, never the registry;
     2. fetch the packument and locate that exact version;
     3. download the tarball and check its bytes against the integrity
        hash the registry itself publishes (a mismatch means the bytes
        in flight are not the bytes the registry recorded);
     4. unpack it and compare EVERY file against runtime/, normalised
        for line endings and nothing else;
     5. check both directions: a file shipped that the repository does
        not declare is as wrong as a declared file not shipped;
     6. check that package.json INSIDE the tarball declares the version
        it was published under.

   Two modes, because "not published yet" is a legitimate state and a
   gate that cannot tell it apart from a divergence gets switched off:

     --mode release       (default) the version in the tree may be
                          absent from the registry: that is the normal
                          window between a version bump and the
                          publication, and it passes with a notice. If
                          the version IS published, it must match. This
                          is the mode for the release chain and for CI
                          on every push -- it is what makes a published
                          version that no longer matches the tree
                          impossible to miss.

     --mode post-publish  the version MUST be on the registry and MUST
                          match. This is the mode for the step right
                          after `npm publish`, and the one that closes
                          the owner's delivery contract: verified after
                          every change.

   Usage:
     node scripts/verify-npm-publication.mjs
     node scripts/verify-npm-publication.mjs --mode post-publish
     node scripts/verify-npm-publication.mjs --version 2.5.2
     node scripts/verify-npm-publication.mjs --registry http://127.0.0.1:8080
     node scripts/verify-npm-publication.mjs --allow-offline
     node scripts/verify-npm-publication.mjs --witness-release
     node scripts/verify-npm-publication.mjs --witness-ref ed399d2

   The witness matters as much as the mode: the contract is about what
   the repository declared AT the published version, which after the
   release is a git ref and not the working tree. See the witness block
   further down -- the first CI run of this gate went red against its
   own commit for exactly this reason.

   A registry that cannot be reached is reported as its own failure,
   never as a divergence, and never as a pass: --allow-offline is there
   for working on a plane, and is deliberately absent from CI.

   Exit code 0 only if every check passed.
   ASCII only. No dependency beyond node core.
   ===================================================================== */

import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { dirname, join, posix } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readTar } from './lib/tar.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PKG_DIR = join(ROOT, 'runtime');

function arg(name, fallback) {
  const i = process.argv.indexOf(name);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

const REGISTRY = arg('--registry', 'https://registry.npmjs.org').replace(/\/+$/, '');
const MODE = arg('--mode', 'release');
const TIMEOUT_MS = Number(arg('--timeout', '30000'));
const ALLOW_OFFLINE = process.argv.includes('--allow-offline');
/* The registry takes a few seconds to serve a version it has just
   accepted. Without a wait, the check wired into `npm publish` itself
   would fail on the one thing it is there to confirm, which is how a
   gate gets removed from the publish script in week two. */
const RETRIES = Number(arg('--retries', '0'));
const RETRY_DELAY_MS = Number(arg('--retry-delay', '5000'));

if (MODE !== 'release' && MODE !== 'post-publish') {
  console.error('FAIL  --mode must be "release" or "post-publish", got "' + MODE + '"');
  process.exit(1);
}

let failed = false;
const fail = (m) => { failed = true; console.error('FAIL  ' + m); };
const ok = (m) => console.log('OK    ' + m);
const note = (m) => console.log('      ' + m);

/* ---------------------------------------------------------------- *
 * the witness
 *
 * The contract is "an adopter installing version X receives what the
 * repository declared AT version X". The working tree answers that
 * only at the moment of the publish; a minute later the tree moves on,
 * and comparing a published 2.5.2 against a tree that is already
 * working towards the next version reports a divergence that is not
 * one. That false red was observed on the first run of this gate in
 * CI, against its own commit, and is why --witness-ref exists.
 *
 *   (no flag)         the working tree. Right for --mode post-publish,
 *                     which runs inside the publish command.
 *   --witness-ref R   read the package from git ref R instead. Right
 *                     for any check that runs later.
 *   --witness-release resolve R automatically: the newest commit whose
 *                     subject is "release(<version>)...", this repo's
 *                     convention for a release cut. Right for CI.
 *
 * Whichever is used, the program prints which witness it compared
 * against. A verifier that does not say what it compared is a verifier
 * nobody can check.
 * ---------------------------------------------------------------- */

function git(args) {
  return execFileSync('git', args, { cwd: ROOT, maxBuffer: 1 << 28 });
}

let WITNESS_REF = arg('--witness-ref', null);
let witnessWhy = 'the working tree';

if (!WITNESS_REF && process.argv.includes('--witness-release')) {
  const wanted = arg('--version', null);
  const treeVersion = JSON.parse(readFileSync(join(PKG_DIR, 'package.json'), 'utf8')).version;
  const target = wanted || treeVersion;
  let log = '';
  try { log = git(['log', '--format=%H%x09%s', '-400']).toString('utf8'); } catch (e) { log = ''; }
  for (const line of log.split('\n')) {
    const tab = line.indexOf('\t');
    if (tab < 0) continue;
    const subject = line.slice(tab + 1);
    if (subject.indexOf('release(' + target + ')') === 0) {
      WITNESS_REF = line.slice(0, tab);
      witnessWhy = 'the release commit for ' + target + ' (' + WITNESS_REF.slice(0, 7) + ' "' + subject + '")';
      break;
    }
  }
  if (!WITNESS_REF) {
    /* Fail closed. The alternative -- quietly comparing against the
       working tree instead -- is how this check would report a
       divergence that is only the tree moving on, and the two causes
       below look identical from the output of a gate that guesses. */
    const depth = log.split('\n').filter(Boolean).length;
    console.error('FAIL  --witness-release could not find a "release(' + target + ')" commit, so the'
      + ' comparison has no witness and was NOT made');
    if (depth <= 1) {
      console.error('        the git history here is ' + depth + ' commit deep: this is a shallow clone.');
      console.error('        in CI, check out with `fetch-depth: 0`.');
    } else {
      console.error('        ' + depth + ' commits were searched and none is a release cut for ' + target + '.');
      console.error('        pass --witness-ref <ref> with the commit that version was published from.');
    }
    process.exit(1);
  }
} else if (WITNESS_REF) {
  witnessWhy = 'git ref ' + WITNESS_REF;
}

/* The declared file set and every file's content come from the SAME
   witness. Mixing them -- a file list from the tree and contents from
   a ref, or the other way round -- produces findings about files that
   never coexisted. */
const ALWAYS = ['package.json', 'README.md', 'LICENSE'];

function walkTree(rel) {
  const abs = join(PKG_DIR, rel);
  if (!existsSync(abs)) return [];
  if (!statSync(abs).isDirectory()) return [rel];
  const out = [];
  for (const name of readdirSync(abs).sort()) {
    out.push(...walkTree(posix.join(rel, name)));
  }
  return out;
}

let listAll;
let witnessRead;

if (WITNESS_REF) {
  let names;
  try {
    names = git(['ls-tree', '-r', '--name-only', WITNESS_REF, '--', 'runtime/'])
      .toString('utf8').split('\n').filter(Boolean)
      .map((p) => p.replace(/^runtime\//, ''));
  } catch (e) {
    console.error('FAIL  cannot read runtime/ at ' + WITNESS_REF + ': ' + e.message);
    process.exit(1);
  }
  listAll = () => names;
  witnessRead = (rel) => git(['show', WITNESS_REF + ':runtime/' + rel]);
} else {
  listAll = null;
  witnessRead = (rel) => readFileSync(join(PKG_DIR, rel));
}

const manifestPath = join(PKG_DIR, 'package.json');
if (!WITNESS_REF && !existsSync(manifestPath)) {
  console.error('FAIL  there is no runtime/package.json: nothing to compare the registry against');
  process.exit(1);
}
const manifest = JSON.parse(witnessRead('package.json').toString('utf8'));
const NAME = manifest.name;
const VERSION = arg('--version', manifest.version);

const declared = new Set();
for (const pattern of [...(manifest.files || []), ...ALWAYS]) {
  const rel = pattern.replace(/\/+$/, '');
  if (listAll) {
    for (const f of listAll()) {
      if (f === rel || f.indexOf(rel + '/') === 0) declared.add(f);
    }
  } else {
    for (const f of walkTree(rel)) declared.add(f);
  }
}

/* ---------------------------------------------------------------- *
 * comparison
 * ---------------------------------------------------------------- */

const TEXT = /\.(js|mjs|cjs|json|md|ts|txt|map|yml|yaml)$/i;
const isText = (rel) => TEXT.test(rel) || rel === 'LICENSE' || rel.endsWith('/LICENSE');

const lf = (buf) => buf.toString('utf8').split('\r\n').join('\n');

/* The report has to name the file AND the first line that differs:
   "the package does not match" sends someone diffing 8 000 lines by
   hand, which is how a gate earns a reputation for crying wolf. */
function difference(rel, published, repo) {
  if (!isText(rel)) {
    return published.equals(repo)
      ? null
      : { kind: 'bytes', published: published.length, repo: repo.length };
  }
  const a = lf(published);
  const b = lf(repo);
  if (a === b) return null;
  const la = a.split('\n');
  const lb = b.split('\n');
  let first = -1;
  let count = 0;
  for (let i = 0; i < Math.max(la.length, lb.length); i += 1) {
    if (la[i] !== lb[i]) {
      if (first < 0) first = i + 1;
      count += 1;
    }
  }
  return {
    kind: 'lines',
    first,
    count,
    publishedLine: la[first - 1],
    repoLine: lb[first - 1],
    publishedLines: la.length,
    repoLines: lb.length,
  };
}

/* ---------------------------------------------------------------- *
 * the registry
 * ---------------------------------------------------------------- */

async function get(url, as) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers: { 'Cache-Control': 'no-cache' } });
    const buf = Buffer.from(await res.arrayBuffer());
    return { status: res.status, buf, json: () => JSON.parse(buf.toString('utf8')) };
  } catch (e) {
    const unreachable = new Error('could not reach ' + url + ': ' + e.message);
    unreachable.unreachable = true;
    throw unreachable;
  } finally {
    clearTimeout(t);
  }
}

function integrityOf(buf, declared) {
  /* npm publishes `integrity` as "<algo>-<base64>" and, for older
     entries, `shasum` as sha1 hex. Check whichever is offered: the
     point is that the bytes we just compared came from the record the
     registry keeps, not merely from the socket. */
  if (declared && declared.integrity) {
    const [algo] = declared.integrity.split('-');
    const got = algo + '-' + createHash(algo).update(buf).digest('base64');
    return { field: 'integrity', expected: declared.integrity, got };
  }
  if (declared && declared.shasum) {
    return { field: 'shasum', expected: declared.shasum, got: createHash('sha1').update(buf).digest('hex') };
  }
  return null;
}

async function main() {
  console.log('package           ' + NAME + '@' + VERSION);
  console.log('registry          ' + REGISTRY);
  console.log('mode              ' + MODE);
  console.log('witness           ' + witnessWhy);
  console.log('                  runtime/ + its files[] declaration (' + declared.size + ' files)');
  console.log('');

  const packumentUrl = REGISTRY + '/' + NAME.replace('/', '%2f');
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  let packument;
  let attempt = 0;
  for (;;) {
    try {
      const res = await get(packumentUrl);
      if (res.status === 404) {
        fail('the registry does not know ' + NAME + ' (HTTP 404 on ' + packumentUrl + ')');
        process.exit(1);
      }
      if (res.status !== 200) {
        fail('the registry answered HTTP ' + res.status + ' for ' + packumentUrl);
        process.exit(1);
      }
      packument = res.json();
    } catch (e) {
      if (e.unreachable) {
        if (ALLOW_OFFLINE) {
          note('the registry is unreachable and --allow-offline was given: the npm channel was NOT verified.');
          note(e.message);
          process.exit(0);
        }
        fail('the registry is unreachable, so the npm channel could not be verified: ' + e.message);
        console.error('        this is NOT a divergence and must not be read as one. Re-run with a network,');
        console.error('        or pass --allow-offline to skip the npm channel on purpose.');
        process.exit(1);
      }
      throw e;
    }

    if ((packument.versions || {})[VERSION]) break;
    if (attempt >= RETRIES) break;
    attempt += 1;
    note('the registry does not serve ' + VERSION + ' yet; waiting ' + RETRY_DELAY_MS
      + ' ms and asking again (attempt ' + attempt + ' of ' + RETRIES + ')');
    await sleep(RETRY_DELAY_MS);
  }

  const entry = (packument.versions || {})[VERSION];
  if (!entry) {
    const known = Object.keys(packument.versions || {});
    if (MODE === 'release') {
      note('the tree declares ' + VERSION + ' and the registry does not publish it yet.');
      note('nothing to compare: this is the window between the version bump and the publication.');
      note('the newest published version is ' + (known[known.length - 1] || 'none') + '.');
      note('run this again with --mode post-publish right after `npm publish`.');
      console.log('');
      console.log('The npm channel has nothing to contradict: ' + VERSION + ' is not published yet.');
      process.exit(0);
    }
    fail('the registry does not publish ' + NAME + '@' + VERSION + ', and post-publish mode requires it');
    console.error('        published versions: ' + (known.join(', ') || 'none'));
    process.exit(1);
  }
  ok('the registry publishes ' + NAME + '@' + VERSION);

  const tarballUrl = (entry.dist || {}).tarball;
  if (!tarballUrl) {
    fail('the registry entry for ' + VERSION + ' carries no dist.tarball');
    process.exit(1);
  }

  let tarball;
  try {
    const res = await get(tarballUrl);
    if (res.status !== 200) {
      fail('the tarball the registry points at returned HTTP ' + res.status + ' (' + tarballUrl + ')');
      process.exit(1);
    }
    tarball = res.buf;
  } catch (e) {
    if (e.unreachable && ALLOW_OFFLINE) {
      note('the tarball is unreachable and --allow-offline was given: the npm channel was NOT verified.');
      process.exit(0);
    }
    fail(e.unreachable
      ? 'the tarball could not be downloaded, so the npm channel could not be verified: ' + e.message
      : e.message);
    process.exit(1);
  }

  const integrity = integrityOf(tarball, entry.dist);
  if (!integrity) {
    fail('the registry entry publishes neither dist.integrity nor dist.shasum: the bytes cannot be tied to the record');
  } else if (integrity.expected !== integrity.got) {
    fail('the tarball bytes do not match the ' + integrity.field + ' the registry records for this version');
    console.error('        recorded ' + integrity.expected);
    console.error('        received ' + integrity.got);
    console.error('        the bytes an adopter installs are not the bytes the registry signed off on.');
  } else {
    ok('tarball bytes match the registry ' + integrity.field + ' (' + tarball.length + ' bytes)');
  }

  let files;
  try {
    files = readTar(gunzipSync(tarball));
  } catch (e) {
    fail('the tarball could not be unpacked: ' + e.message);
    process.exit(1);
  }

  /* ---- the comparison, both directions ---- */
  const seen = new Set();
  let identical = 0;

  for (const f of files) {
    if (f.name.indexOf('package/') !== 0) {
      fail('the tarball contains "' + f.name + '", outside the package/ prefix npm uses');
      continue;
    }
    const rel = f.name.slice('package/'.length);
    seen.add(rel);

    if (!declared.has(rel)) {
      fail('the published package ships "' + rel + '", which the repository does not declare in runtime/package.json files[]');
      continue;
    }
    const repoBytes = witnessRead(rel);
    const diff = difference(rel, f.data, repoBytes);
    if (!diff) {
      identical += 1;
      continue;
    }
    if (diff.kind === 'bytes') {
      fail(rel + ' differs: ' + diff.published + ' bytes published against ' + diff.repo + ' in the repository');
      continue;
    }
    fail(rel + ' differs from the repository: ' + diff.count + ' line(s), first at line ' + diff.first
      + (diff.publishedLines !== diff.repoLines
        ? ' (' + diff.publishedLines + ' lines published against ' + diff.repoLines + ')'
        : ''));
    console.error('        published  ' + JSON.stringify(String(diff.publishedLine).slice(0, 120)));
    console.error('        repository ' + JSON.stringify(String(diff.repoLine).slice(0, 120)));
  }

  for (const rel of [...declared].sort()) {
    if (!seen.has(rel)) {
      fail('the repository declares "' + rel + '" as published and the tarball does not contain it');
    }
  }

  /* ---- the tin must say what is inside it ---- */
  const inner = files.find((f) => f.name === 'package/package.json');
  if (!inner) {
    fail('the tarball has no package/package.json');
  } else {
    let innerManifest = null;
    try { innerManifest = JSON.parse(inner.data.toString('utf8')); }
    catch (e) { fail('package/package.json inside the tarball is not valid JSON: ' + e.message); }
    if (innerManifest) {
      if (innerManifest.version !== VERSION) {
        fail('the tarball published as ' + VERSION + ' declares version ' + innerManifest.version + ' inside');
      } else {
        ok('the manifest inside the tarball declares ' + VERSION);
      }
      if (innerManifest.name !== NAME) {
        fail('the tarball declares the name ' + innerManifest.name + ' and was fetched as ' + NAME);
      }
    }
  }

  if (!failed) {
    ok(identical + ' of ' + declared.size + ' published files identical to the repository, 0 differing lines');
  }

  console.log('');
  if (failed) {
    console.log('The published npm package is NOT this tree. An adopter running');
    console.log('`npm install ' + NAME + '@' + VERSION + '` does not receive what this repository says they do.');
    process.exit(1);
  }
  console.log('The published npm package is this tree.');
}

main().catch((e) => {
  console.error('FAIL  ' + e.message);
  process.exit(1);
});
