#!/usr/bin/env node
/* =====================================================================
   test-cli-levels.mjs -- the lock on the CLI validator that reports a
   conformance level (audit N-18, second half).

   What this suite is FOR, stated plainly because it is easy to write
   the useless version of it: a gate that only ever watches the
   validator refuse is not testing the validator, it is testing that
   nothing passes. Half the cases here drive a deliberately conformant
   fixture and demand that it REACHES a level, with the published
   identifier and the coverage ratio printed. The other half break one
   thing at a time and demand the level go away for that reason and no
   other.

   Four groups:

     REPORTS   the fixture reaches nac3-conformance-level-2 and says so
               with the published id, the display name, the pre-2.5.0
               alias and "asserted on N of M".

     REFUSES   one break at a time -- no manifest, no legacy arrays, an
               action that never completes -- each one costing exactly
               the level it should cost.

     HONEST    structural locks that hold whatever the page is: a
               requirement no tool can decide is NEVER reported as
               passed; a read-only run NEVER asserts a level that
               needs the page driven; the coverage arithmetic adds up.

     BUILD     the producer/consumer symmetry around the decider names.
               A requirement the contract calls machine-checkable whose
               decider the CLI does not implement, or a decider the CLI
               implements that no requirement names, refuses the build.

   Run: node scripts/test-cli-levels.mjs
   ASCII only. Needs Playwright, like the validator it tests.
   ===================================================================== */

import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync, mkdtempSync, mkdirSync, copyFileSync, cpSync, writeFileSync } from 'node:fs';
import { join, extname, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CLI = join(ROOT, 'runtime', 'dist', 'cli.js');
const FIXTURE = join(ROOT, 'e2e', 'fixtures', 'level-2-page.html');

let passed = 0;
let failed = 0;
function check(name, ok, detail) {
  if (ok) { passed += 1; console.log('PASS  ' + name + (detail ? ' -- ' + detail : '')); }
  else { failed += 1; console.error('FAIL  ' + name + (detail ? ' -- ' + detail : '')); }
}

/* ---- a server that can serve a MUTATED copy of the fixture ----------
   The negative cases need a page that differs from the fixture in one
   named way. Mutating the file on disk would make the suite depend on
   its own cleanup; serving the variant from memory cannot leave a mess
   behind, and the fixture on disk stays the one thing everybody reads. */

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
};

const FIXTURE_SRC = readFileSync(FIXTURE, 'utf8');
const variants = new Map();

function variant(name, transform) {
  const html = transform(FIXTURE_SRC);
  if (html === FIXTURE_SRC) {
    /* A "broken" variant identical to the original is a case that
       proves nothing while reporting green -- the ceremony this
       repository keeps finding. Refuse it loudly. */
    throw new Error('variant "' + name + '" did not change the fixture, so it cannot break anything');
  }
  variants.set('/__variant/' + name, html);
  return '/__variant/' + name;
}

const server = createServer((req, res) => {
  const urlPath = decodeURIComponent(req.url.split('?')[0]);
  if (variants.has(urlPath)) {
    res.writeHead(200, { 'content-type': TYPES['.html'] });
    res.end(variants.get(urlPath));
    return;
  }
  let file = join(ROOT, urlPath);
  if (urlPath.endsWith('/')) file = join(file, 'index.html');
  if (!existsSync(file) || !statSync(file).isFile()) {
    res.writeHead(404, { 'content-type': 'text/plain' });
    res.end('not found');
    return;
  }
  res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream' });
  res.end(readFileSync(file));
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
/* Close it on ANY exit path. A suite that leaves a listening socket
   behind makes the next run look like a port problem. */
process.on('exit', () => { try { server.close(); } catch (_) { /* already down */ } });
const BASE = 'http://127.0.0.1:' + server.address().port;

/* The CLI runs as a child process, which is how an adopter runs it. It
   is also why the server cannot be driven synchronously: spawnSync
   would block this process's event loop and the browser would never
   get an answer. Measured the hard way while building this -- the
   first version of the harness timed out on every page. */
function runCli(args) {
  const r = spawnSync(process.execPath, [CLI, ...args], { encoding: 'utf8' });
  return { code: r.status, out: (r.stdout || '') + (r.stderr || '') };
}

async function cliAsync(args) {
  const { spawn } = await import('node:child_process');
  return new Promise((resolve) => {
    let out = '';
    const ch = spawn(process.execPath, [CLI, ...args], { stdio: ['ignore', 'pipe', 'pipe'] });
    ch.stdout.on('data', (d) => { out += d; });
    ch.stderr.on('data', (d) => { out += d; });
    ch.on('close', (code) => resolve({ code, out }));
  });
}

/* A CLI that cannot produce a report is ONE FAILED CASE, not a dead
   run. The first version of this helper threw, and running the suite
   against the pre-N-18 CLI -- the actual regression it exists to
   catch -- crashed it on the first call, hiding all 28 cases behind
   the first one. That is the same defect the two locks before this one
   had, and the same fix: fail with a name. */
async function jsonReport(path, extra = []) {
  const r = await cliAsync(['validate', BASE + path, '--json', ...extra]);
  const i = r.out.indexOf('{');
  if (i < 0) {
    check('the CLI produced a JSON report for ' + path, false,
      'no JSON in its output: ' + r.out.trim().split('\n')[0]);
    return { code: r.code, report: null, raw: r.out };
  }
  try {
    return { code: r.code, report: JSON.parse(r.out.slice(i)), raw: r.out };
  } catch (e) {
    check('the CLI produced PARSEABLE JSON for ' + path, false, String(e.message).slice(0, 120));
    return { code: r.code, report: null, raw: r.out };
  }
}

/* Accessors that survive a missing report, so every case still gets to
   report its own verdict instead of inheriting a crash. */
const NO_REPORT = {
  level: '(no report)', level_id: null, legacy_display_name: null,
  decided: -1, total: -1, undecided: [], blocked_by: [], blocked_by_unverified: [],
};
function summary(r) { return (r && r.report) ? r.report.report : NO_REPORT; }
function verdictsOf(r) { return (r && r.report) ? r.report.verdicts : []; }

/* ===================== group REPORTS ================================= */

const good = await jsonReport('/e2e/fixtures/level-2-page.html', ['--drive']);
check('REPORTS: the fixture reaches a level at all',
  summary(good).level === 2,
  'reported level ' + JSON.stringify(summary(good).level));
check('REPORTS: the level is cited by its published identifier',
  summary(good).level_id === 'nac3-conformance-level-2',
  summary(good).level_id);
check('REPORTS: the pre-2.5.0 alias travels with it (N-06)',
  summary(good).legacy_display_name === 'NAC-2',
  String(summary(good).legacy_display_name));
check('REPORTS: exit 0 for a page that reaches a level with no failure at or below it',
  good.code === 0, 'exit ' + good.code);

const prose = await cliAsync(['validate', BASE + '/e2e/fixtures/level-2-page.html', '--drive']);
check('REPORTS: the prose output names the level identifier',
  /Conformance level: nac3-conformance-level-2/.test(prose.out));
check('REPORTS: the prose output states the coverage ratio',
  /asserted on \d+ of \d+ requirements/.test(prose.out));
check('REPORTS: the prose output refuses to call it a certification',
  /not a certification/i.test(prose.out));
check('REPORTS: the tier is labelled as not being a level (N-29)',
  /tier != level/.test(prose.out));

/* ===================== group REFUSES ================================= */

const noManifest = variant('no-manifest', (s) =>
  s.replace('NAC.register({', 'window.__skipped = true; false && NAC.register({'));
const r1 = await jsonReport(noManifest, ['--drive']);
check('REFUSES: a page that registers no manifest reaches no level',
  summary(r1).level === null, 'level ' + JSON.stringify(summary(r1).level));
check('REFUSES: and names the requirement that blocked it',
  (summary(r1).blocked_by || []).includes('L1-bb23d963'),
  (summary(r1).blocked_by || []).join(','));
check('REFUSES: a page at no level exits 1', r1.code === 1, 'exit ' + r1.code);

const noGroups = variant('no-legacy-groups', (s) =>
  s.replace(/\n\s*tabs:\s*\[[\s\S]*?\n\s*\]\n\s*\}\);/, '\n  });'));
const r2 = await jsonReport(noGroups, ['--drive']);
check('REFUSES: dropping the legacy tabs/fields/actions arrays costs level 2 and keeps level 1',
  summary(r2).level === 1, 'level ' + JSON.stringify(summary(r2).level));
check('REFUSES: and the level-2 requirement that fell is the one named in the spec sentence',
  verdictsOf(r2).some((v) => v.requirement_id === 'L2-f6a7aa72' && v.verdict === 'fail'));

const deadAction = variant('action-never-completes', (s) =>
  s.replace(/NAC\.bindAction\(/, 'window.__unbound = (') );
const r3 = await jsonReport(deadAction, ['--drive']);
check('REFUSES: an action that never fires its completion event costs level 1',
  summary(r3).level === null, 'level ' + JSON.stringify(summary(r3).level));
check('REFUSES: and the behavioural requirement is the one that failed, measured not assumed',
  verdictsOf(r3).some((v) => v.requirement_id === 'L1-fc278d09' && v.verdict === 'fail'),
  (verdictsOf(r3).find((v) => v.requirement_id === 'L1-fc278d09') || {}).detail);

/* ===================== group HONEST ================================== */

for (const [label, res] of [['the conformant fixture', good], ['a page with no manifest', r1]]) {
  const seen = verdictsOf(res);
  const overreach = seen.filter((v) => !v.machine_checkable && v.verdict === 'pass');
  /* The `seen.length > 0` is not decoration. Without it this case
     passes on an EMPTY verdict list -- which is exactly what a CLI
     that produced no report hands it, so the lock would report green
     on the very regression it exists to catch. Measured: running this
     suite against the pre-N-18 CLI, these two were the only cases
     outside the BUILD group that stayed green. */
  check('HONEST: no requirement outside a tool\'s reach is reported as passed -- ' + label,
    seen.length > 0 && overreach.length === 0,
    seen.length === 0 ? 'no verdicts at all' : overreach.map((v) => v.requirement_id).join(','));
}

const readOnly = await jsonReport('/e2e/fixtures/level-2-page.html');
check('HONEST: a read-only run does NOT assert a level that needs the page driven',
  summary(readOnly).level === null,
  'level ' + JSON.stringify(summary(readOnly).level));
check('HONEST: and it says which requirements went unmeasured rather than passing them',
  ['L1-fc278d09', 'L1-1f78457d']
    .every((id) => (summary(readOnly).blocked_by_unverified || []).includes(id)),
  (summary(readOnly).blocked_by_unverified || []).join(','));
check('HONEST: the same page reaches level 2 WITH --drive, so the gate is not just refusing everything',
  summary(good).level === 2 && summary(readOnly).level === null);

const rep = summary(good);
const atLevel = verdictsOf(good).filter((v) => v.level === rep.level);
check('HONEST: the coverage arithmetic adds up',
  rep.total === atLevel.length && rep.decided + rep.undecided.length === rep.total,
  rep.decided + ' decided + ' + rep.undecided.length + ' undecided = ' + rep.total);

check('HONEST: every machine-checkable requirement names the decider that judged it',
  verdictsOf(good).length > 0
    && verdictsOf(good).filter((v) => v.machine_checkable).every((v) => !!v.decider));

check('HONEST: level 3 is not asserted while no tool can confirm a manifest signature (N-36)',
  verdictsOf(good).some((v) => v.requirement_id === 'L3-cc540e31' && v.verdict !== 'pass'));

/* The directory mode used to print a finding count and stop, which a
   reader could take for a conformance result. */
const dir = runCli(['validate', join(ROOT, 'scripts')]);
check('HONEST: directory mode says out loud that it cannot decide a level',
  /Conformance level: NOT DECIDABLE IN THIS MODE/.test(dir.out));

/* ===================== group BUILD =================================== */

function buildSandbox() {
  const dir = mkdtempSync(join(tmpdir(), 'nac3-cli-levels-'));
  mkdirSync(join(dir, 'scripts'), { recursive: true });
  mkdirSync(join(dir, 'js'), { recursive: true });
  mkdirSync(join(dir, 'runtime'), { recursive: true });
  copyFileSync(join(ROOT, 'js', 'nac.js'), join(dir, 'js', 'nac.js'));
  copyFileSync(join(ROOT, 'SPEC.md'), join(dir, 'SPEC.md'));
  copyFileSync(join(ROOT, 'LICENSE'), join(dir, 'LICENSE'));
  copyFileSync(join(ROOT, 'scripts', 'spec-levels.mjs'), join(dir, 'scripts', 'spec-levels.mjs'));
  copyFileSync(join(ROOT, 'scripts', 'contract-api.meta.json'), join(dir, 'scripts', 'contract-api.meta.json'));
  copyFileSync(join(ROOT, 'runtime', 'build.mjs'), join(dir, 'runtime', 'build.mjs'));
  cpSync(join(ROOT, 'runtime', 'src'), join(dir, 'runtime', 'src'), { recursive: true });
  return dir;
}

function runBuild(dir) {
  const r = spawnSync(process.execPath, [join(dir, 'runtime', 'build.mjs')],
    { cwd: join(dir, 'runtime'), encoding: 'utf8' });
  return { code: r.status, out: (r.stdout || '') + (r.stderr || '') };
}

function patchMeta(dir, fn) {
  const p = join(dir, 'scripts', 'contract-api.meta.json');
  const m = JSON.parse(readFileSync(p, 'utf8'));
  fn(m);
  writeFileSync(p, JSON.stringify(m, null, 2) + '\n');
}

/* The sandbox has to be GREEN before any case breaks it, for the same
   reason the contract suite normalises its copy: a red that every case
   shares proves nothing about any of them. */
const base = buildSandbox();
const baseRun = runBuild(base);
check('BUILD: an untouched sandbox builds the CLI green',
  baseRun.code === 0, baseRun.code === 0 ? '' : baseRun.out.slice(-400));

const s1 = buildSandbox();
patchMeta(s1, (m) => {
  const k = Object.keys(m.level_requirements).find((h) => m.level_requirements[h].decider === 'manifest_registered');
  m.level_requirements[k].decider = 'a_decider_nobody_wrote';
});
const b1 = runBuild(s1);
check('BUILD: a machine-checkable requirement whose decider the CLI does not implement refuses the build',
  b1.code !== 0 && /a_decider_nobody_wrote/.test(b1.out), 'exit ' + b1.code);

const s2 = buildSandbox();
patchMeta(s2, (m) => {
  const k = Object.keys(m.level_requirements).find((h) => m.level_requirements[h].decider === 'manifest_registered');
  delete m.level_requirements[k].decider;
});
const b2 = runBuild(s2);
check('BUILD: a requirement published as machine-checkable with no decider refuses the build',
  b2.code !== 0 && /names no decider/.test(b2.out), 'exit ' + b2.code);

const s3 = buildSandbox();
patchMeta(s3, (m) => {
  const k = Object.keys(m.level_requirements).find((h) => m.level_requirements[h].decider === 'manifest_registered');
  m.level_requirements[k].decider = null;
  m.level_requirements[k].machine_checkable = false;
  m.level_requirements[k].requires_drive = false;
  m.level_requirements[k].check = 'human';
});
const b3 = runBuild(s3);
check('BUILD: a decider the CLI implements that no requirement names refuses the build',
  b3.code !== 0 && /no\n?.*requirement in SPEC\.md section 8 names|that no/.test(b3.out), 'exit ' + b3.code);

const s4 = buildSandbox();
patchMeta(s4, (m) => {
  const k = Object.keys(m.level_requirements)[0];
  delete m.level_requirements[k];
});
const b4 = runBuild(s4);
check('BUILD: a section-8 sentence with no reviewed mapping refuses the build',
  b4.code !== 0 && /reviewed mapping/.test(b4.out), 'exit ' + b4.code);

/* ===================== done ========================================== */

server.close();
console.log('');
console.log(passed + ' passed, ' + failed + ' failed');
if (failed) {
  console.error('');
  console.error('The CLI validator is not reporting levels the way the contract says it does.');
  process.exit(1);
}
console.log('GREEN -- the validator reports a level, refuses one for a named reason, and');
console.log('         cannot claim a requirement it did not measure.');
