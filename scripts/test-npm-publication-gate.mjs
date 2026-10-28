#!/usr/bin/env node
/* =====================================================================
   test-npm-publication-gate.mjs -- prove the npm publication gate goes
   red, and goes red for the right reason.

   A gate nobody proved red is a decoration. This suite stands up a
   real HTTP registry on localhost, serves a real gzipped tar built
   from the real runtime/ tree, and then breaks ONE thing at a time,
   asserting two things each case:

     1. verify-npm-publication.mjs exits non-zero, and
     2. its output NAMES what was broken.

   The second half is the one that matters. A gate that refuses without
   saying which file diverged sends someone diffing eight thousand
   lines by hand, and a gate that costs that much gets switched off.

   The cases are not invented. Cases 3 and 4 are the 2026-10-24
   incident reproduced: a published package carrying the previous
   version's SPEC.md, and dist headers declaring MIT while the LICENSE
   beside them said Apache-2.0. If the gate had existed, these are the
   two reds it would have printed.

   The last three cases are about the gate's own honesty rather than
   the package: that "not published yet" is NOT reported as a
   divergence, that post-publish mode refuses the same state, and that
   an unreachable registry is never quietly turned into a pass.

   Everything is localhost. No network. Nothing is written to the tree.

   ASCII only. No dependency beyond node core.
   ===================================================================== */

import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import { createServer } from 'node:http';
import { spawn, execFileSync } from 'node:child_process';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { dirname, join, posix } from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeTar } from './lib/tar.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PKG_DIR = join(ROOT, 'runtime');
const GATE = join(ROOT, 'scripts', 'verify-npm-publication.mjs');

const manifest = JSON.parse(readFileSync(join(PKG_DIR, 'package.json'), 'utf8'));
const NAME = manifest.name;
const VERSION = manifest.version;

let checks = 0;
let failures = 0;
function assert(condition, label, detail) {
  checks += 1;
  if (condition) {
    console.log('  OK    ' + label);
    return;
  }
  failures += 1;
  console.error('  FAIL  ' + label);
  if (detail) console.error('        ' + String(detail).split('\n').join('\n        '));
}

/* ---------------------------------------------------------------- *
 * the faithful package, built from the tree the same way npm does
 * ---------------------------------------------------------------- */

function walk(rel) {
  const abs = join(PKG_DIR, rel);
  if (!existsSync(abs)) return [];
  if (!statSync(abs).isDirectory()) return [rel];
  const out = [];
  for (const name of readdirSync(abs).sort()) out.push(...walk(posix.join(rel, name)));
  return out;
}

const declared = [];
for (const pattern of [...(manifest.files || []), 'package.json', 'README.md', 'LICENSE']) {
  for (const f of walk(pattern.replace(/\/+$/, ''))) {
    if (declared.indexOf(f) < 0) declared.push(f);
  }
}
declared.sort();

const baseline = () => declared.map((rel) => ({
  name: 'package/' + rel,
  data: readFileSync(join(PKG_DIR, rel)),
}));

const pack = (entries) => gzipSync(writeTar(entries));

/* ---------------------------------------------------------------- *
 * the local registry
 * ---------------------------------------------------------------- */

const state = {
  tarball: null,
  integrity: null,      /* null = derive it from the bytes served */
  version: VERSION,     /* the version the packument advertises */
};

const server = createServer((req, res) => {
  const path = decodeURIComponent((req.url || '').split('?')[0]);
  if (path === '/' + NAME) {
    const integrity = state.integrity
      || 'sha512-' + createHash('sha512').update(state.tarball).digest('base64');
    const body = JSON.stringify({
      name: NAME,
      'dist-tags': { latest: state.version },
      versions: {
        [state.version]: {
          name: NAME,
          version: state.version,
          dist: {
            tarball: 'http://127.0.0.1:' + server.address().port + '/tarball.tgz',
            integrity,
          },
        },
      },
    });
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(body);
    return;
  }
  if (path === '/tarball.tgz') {
    res.writeHead(200, { 'content-type': 'application/octet-stream' });
    res.end(state.tarball);
    return;
  }
  res.writeHead(404, { 'content-type': 'application/json' });
  res.end('{}');
});

/* The child has to run WITHOUT blocking this process: the registry it
   talks to is the http server above, served by this very event loop.
   A synchronous spawn deadlocks -- the child waits for an answer the
   parent cannot give until the child exits -- and every case then
   fails as "registry unreachable", which is a believable-looking red
   for entirely the wrong reason. Observed once; kept as a comment so
   it is not re-introduced. */
function run(args) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    child.stdout.on('data', (d) => { out += d.toString('utf8'); });
    child.stderr.on('data', (d) => { out += d.toString('utf8'); });
    child.on('close', (code) => resolve({ code, out }));
  });
}

function runGate(extra = []) {
  const port = server.address().port;
  return run([
    GATE,
    '--registry', 'http://127.0.0.1:' + port,
    '--mode', 'post-publish',
    ...extra,
  ]);
}

/* A red case is only a red case if it names its subject. */
async function expectRed(label, mutate, needles, extra) {
  console.log('\n' + label);
  const entries = baseline();
  state.integrity = null;
  state.version = VERSION;
  const mutated = mutate ? mutate(entries) : entries;
  state.tarball = pack(mutated || entries);
  const r = await runGate(extra);
  assert(r.code !== 0, 'the gate refuses the publication', 'exit code was ' + r.code + '\n' + r.out);
  for (const needle of needles) {
    assert(r.out.indexOf(needle) >= 0, 'the refusal names "' + needle + '"', r.out);
  }
}

const patch = (entries, rel, fn) => {
  const e = entries.find((x) => x.name === 'package/' + rel);
  if (!e) throw new Error('the baseline package has no ' + rel + ': this test is out of date with runtime/package.json');
  e.data = Buffer.from(fn(e.data.toString('utf8')), 'utf8');
  return entries;
};

/* ---------------------------------------------------------------- *
 * the suite
 * ---------------------------------------------------------------- */

async function main() {
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  console.log('local registry    http://127.0.0.1:' + server.address().port);
  console.log('package under it  ' + NAME + '@' + VERSION + ', ' + declared.length + ' declared files');

  /* ---- 1. the control: a faithful publication must pass ----
     Without this one, every red below could be a gate that refuses
     everything, which is worth exactly nothing. */
  console.log('\n1. CONTROL -- a faithful publication of this tree');
  state.integrity = null;
  state.version = VERSION;
  state.tarball = pack(baseline());
  let r = await runGate();
  assert(r.code === 0, 'the gate accepts a faithful publication', 'exit code ' + r.code + '\n' + r.out);
  assert(r.out.indexOf(declared.length + ' of ' + declared.length + ' published files identical') >= 0,
    'it reports every declared file as identical', r.out);

  /* ---- 2. one line of shipped code ---- */
  await expectRed(
    '2. RED -- one line of dist/nac.browser.js changed in the published copy',
    (e) => patch(e, 'dist/nac.browser.js', (s) => s.replace('\n', '\n/* injected after publication */\n')),
    ['dist/nac.browser.js differs from the repository', 'first at line'],
  );

  /* ---- 3. the 2026-10-24 incident, half one: the stale spec ---- */
  await expectRed(
    '3. RED -- the published SPEC.md is the previous version (the 2026-10-24 incident)',
    (e) => patch(e, 'SPEC.md', (s) => {
      const lines = s.split('\n');
      return lines.slice(0, Math.max(1, lines.length - 180)).join('\n').replace(VERSION, '2.5.0-alpha.4');
    }),
    ['SPEC.md differs from the repository', 'lines published against'],
  );

  /* ---- 4. the same incident, half two: the licence that contradicts
            the LICENSE file shipped beside it ---- */
  await expectRed(
    '4. RED -- the published dist declares MIT while the tree declares Apache-2.0',
    (e) => patch(e, 'dist/nac.mjs', (s) => s.replace('Apache-2.0', 'MIT License')),
    ['dist/nac.mjs differs from the repository'],
  );

  /* ---- 5. a declared file that is not shipped ---- */
  await expectRed(
    '5. RED -- the package does not ship a file the repository declares',
    (e) => e.filter((x) => x.name !== 'package/CHANGELOG.md'),
    ['declares "CHANGELOG.md" as published and the tarball does not contain it'],
  );

  /* ---- 6. a shipped file nobody declared ----
     This is the direction a file-list comparison usually forgets, and
     it is the shape of an accident: a stray build artefact, an
     editor backup, a key. */
  await expectRed(
    '6. RED -- the package ships a file the repository does not declare',
    (e) => [...e, { name: 'package/dist/leftover.js', data: Buffer.from('/* not in the tree */\n') }],
    ['ships "dist/leftover.js"', 'does not declare'],
  );

  /* ---- 7. the tin does not say what is inside it ---- */
  await expectRed(
    '7. RED -- the manifest inside the tarball declares another version',
    (e) => patch(e, 'package.json', (s) => s.replace('"version": "' + VERSION + '"', '"version": "2.5.1"')),
    ['declares version 2.5.1 inside'],
  );

  /* ---- 8. the bytes in flight are not the bytes on record ---- */
  console.log('\n8. RED -- the tarball bytes do not match the integrity the registry records');
  state.tarball = pack(baseline());
  state.integrity = 'sha512-' + createHash('sha512').update('not these bytes').digest('base64');
  state.version = VERSION;
  r = await runGate();
  assert(r.code !== 0, 'the gate refuses the publication', 'exit code ' + r.code + '\n' + r.out);
  assert(r.out.indexOf('do not match the integrity') >= 0, 'the refusal names the integrity mismatch', r.out);

  /* ---- 9. the mode distinction is real, not decorative ----
     The registry advertises only an older version; the tree is ahead.
     That is the normal window between a bump and a publication: the
     release chain must pass it, and the post-publish check must
     refuse it. A gate that cannot tell those two states apart is a
     gate that gets switched off. */
  console.log('\n9. MODE -- the version in the tree is not published yet');
  state.tarball = pack(baseline());
  state.integrity = null;
  state.version = '2.5.1';
  r = await runGate();
  assert(r.code !== 0, 'post-publish mode refuses a version that is not on the registry',
    'exit code ' + r.code + '\n' + r.out);
  assert(r.out.indexOf('post-publish mode requires it') >= 0, 'and says why', r.out);

  const port = server.address().port;
  const rel = await run([GATE, '--registry', 'http://127.0.0.1:' + port, '--mode', 'release']);
  assert(rel.code === 0, 'release mode passes the same state instead of crying wolf',
    'exit code ' + rel.code + '\n' + rel.out);
  assert(rel.out.indexOf('is not published yet') >= 0, 'and says what it did not compare', rel.out);

  /* ---- 10. an unreachable registry is its own answer ----
     Never a divergence, never a pass. A gate that reports a network
     hiccup as tampering teaches people to ignore it; one that reports
     it as success is worse. */
  console.log('\n10. OFFLINE -- the registry cannot be reached');
  const dead = 'http://127.0.0.1:' + (port + 1 > 65535 ? port - 1 : port + 1);
  const off = await run([GATE, '--registry', dead, '--mode', 'post-publish', '--timeout', '2000']);
  assert(off.code !== 0, 'an unreachable registry is not a pass', 'exit code ' + off.code + '\n' + off.out);
  assert(off.out.indexOf('NOT a divergence') >= 0, 'and the refusal says it is not a divergence', off.out);

  const allowed = await run(
    [GATE, '--registry', dead, '--mode', 'post-publish', '--timeout', '2000', '--allow-offline']);
  assert(allowed.code === 0, '--allow-offline exits 0 on purpose', 'exit code ' + allowed.code + '\n' + allowed.out);
  assert(allowed.out.indexOf('was NOT verified') >= 0,
    'and says out loud that the npm channel was not verified', allowed.out);

  /* ---- 11. the witness is the tree AT the published version ----
     The first CI run of this gate went red against its own commit:
     the published 2.5.2 was compared with a working tree that had
     already moved on, and the gate called that a divergence. It is
     not one -- the contract is about what the repository declared AT
     version X. --witness-release exists for that, and these two
     checks are what keep it from degrading into a silent fallback:
     the program must SAY which witness it used, and the content must
     really come from the ref. */
  console.log('\n11. WITNESS -- what the repository declared at the published version');
  state.tarball = pack(baseline());
  state.integrity = null;
  state.version = VERSION;

  const resolved = await runGate(['--witness-release']);
  assert(resolved.out.indexOf('the release commit for ' + VERSION) >= 0,
    '--witness-release names the release commit it resolved, instead of falling back in silence',
    resolved.out);

  /* To prove the content really comes from the ref we need a ref where
     a published file is KNOWN to differ from today's tree, and we must
     not hardcode a commit: the suite would then rot the next time
     history moves. The parent of the last commit that changed
     runtime/package.json differs in that file by definition of
     "changed". The tarball above is built from the working tree, so a
     gate honouring the ref must report package.json -- and one quietly
     reading the working tree cannot. */
  let olderRef = null;
  try {
    const last = execFileSync('git', ['log', '-1', '--format=%H', '--', 'runtime/package.json'],
      { cwd: ROOT, encoding: 'utf8' }).trim();
    const parent = execFileSync('git', ['rev-parse', last + '^'], { cwd: ROOT, encoding: 'utf8' }).trim();
    execFileSync('git', ['cat-file', '-e', parent + ':runtime/package.json'], { cwd: ROOT });
    olderRef = parent;
  } catch (e) {
    olderRef = null;
  }
  assert(!!olderRef,
    'a ref whose runtime/package.json differs from the tree can be resolved from history',
    'without one this case cannot distinguish the ref from the working tree; is this a shallow clone?');
  if (olderRef) {
    const atOlder = await runGate(['--witness-ref', olderRef]);
    assert(atOlder.code !== 0 && atOlder.out.indexOf('package.json differs') >= 0,
      '--witness-ref compares against the ref (' + olderRef.slice(0, 7) + '), not the working tree',
      'exit code ' + atOlder.code + '\n' + atOlder.out);
  }

  /* A witness that cannot be resolved must stop the program, not
     degrade into a comparison against whatever happens to be on disk.
     The shallow-clone case in CI is exactly this one. */
  const noWitness = await runGate(['--witness-release', '--version', '9.9.9']);
  assert(noWitness.code !== 0 && noWitness.out.indexOf('comparison has no witness and was NOT made') >= 0,
    'an unresolvable witness fails closed instead of comparing against the working tree',
    'exit code ' + noWitness.code + '\n' + noWitness.out);

  /* ---- done ---- */
  server.close();
  console.log('');
  console.log(checks + ' checks, ' + failures + ' failure(s)');
  if (failures) {
    console.log('The npm publication gate does NOT refuse what it is supposed to refuse.');
    process.exit(1);
  }
  console.log('The npm publication gate refuses every case above, and names what it refused.');
}

main().catch((e) => {
  server.close();
  console.error('FAIL  ' + e.stack);
  process.exit(1);
});
