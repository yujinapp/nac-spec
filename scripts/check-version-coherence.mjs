#!/usr/bin/env node
/* =====================================================================
   check-version-coherence.mjs -- one version, declared once, agreed
   everywhere.

   Why this exists (external audit N-17, and the CLI half of N-18):
   the published 2.5.0-alpha.5 tarball shipped a SPEC.md that declared
   2.5.0-alpha.4, and its CLI announced 2.3.0-alpha.2. Nothing was
   broken at the time -- the version was simply hand-written in a dozen
   different files, so "bump the version" meant "remember all twelve",
   and whoever published remembered eleven. Nobody found out until an
   auditor unpacked the tarball.

   This script is the lock. It reads the ONE authoritative constant and
   refuses the build when any declared consumer disagrees. A version
   bump is now: edit js/nac.js, run the build, run this. Anything still
   stale fails loudly here instead of silently on the registry.

   Authoritative source: the `version:` constant in the NAC export at
   the bottom of js/nac.js. SPEC.md sec 9 and scripts/build-integrity.mjs
   both already declare that constant normative; this script is the
   third consumer that agrees, not a new opinion.

   Two classes of check:
     DERIVED   the file is generated; a mismatch means the generator
               did not run. Fix: run the generator.
     DECLARED  the file is hand-written; a mismatch means a human has
               to edit it. Fix: edit it.
     GENERATOR the generator itself must not hard-code a version at
               all -- that is the root cause this script guards.

   Usage:
     node scripts/check-version-coherence.mjs          exit 1 on drift
     node scripts/check-version-coherence.mjs --quiet  only report drift

   ASCII only. No dependency beyond node core.
   ===================================================================== */

import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const QUIET = process.argv.includes('--quiet');

const abs = (p) => join(ROOT, p);
const read = (p) => readFileSync(abs(p), 'utf8');
const has = (p) => existsSync(abs(p));

/* A semver with an optional prerelease tail. The tail is spelled out
   dot-segment by dot-segment rather than as [A-Za-z0-9.]+ so it cannot
   swallow the period that ends a sentence: in a comment reading
   "... runtime v2.5.0-alpha.5." the version is the first 13 characters,
   not 14. Getting this wrong made the first run of this script report
   three slots as stale when they were correct. */
const SEMVER = '[0-9]+\\.[0-9]+\\.[0-9]+(?:-[A-Za-z0-9]+(?:\\.[A-Za-z0-9]+)*)?';

const findings = [];
const report = [];

function ok(label, where, detail) {
  report.push({ state: 'OK', label, where, detail });
}
function drift(label, where, want, got, fix) {
  findings.push({ label, where, want, got, fix });
  report.push({ state: 'FAIL', label, where, detail: '', want, got, fix });
}

/* ---- the authoritative constant ---------------------------------- */

const nacSrc = read('js/nac.js');
const authoritative = nacSrc.match(
  new RegExp('\\bversion\\s*:\\s*\'(' + SEMVER + ')\'')
);
if (!authoritative) {
  console.error('FAIL  cannot find the version constant in js/nac.js.');
  console.error('      Expected a line like:  version: \'2.5.0\',');
  console.error('      Without it there is no authoritative version to check against.');
  process.exit(1);
}
const VERSION = authoritative[1];

const specVersionMatch = nacSrc.match(/\bspec_version\s*:\s*'([0-9]+\.[0-9]+)'/);
const SPEC_VERSION = specVersionMatch ? specVersionMatch[1] : null;
if (!SPEC_VERSION) {
  console.error('FAIL  cannot find the spec_version constant in js/nac.js.');
  process.exit(1);
}

/* ---- probes -------------------------------------------------------
   Each probe collects EVERY version-shaped string in its slot and
   requires all of them to equal the authoritative one. Collecting all
   of them (instead of the first) is deliberate: the alpha.4 leak was a
   second occurrence further down a file whose first occurrence was
   right.
   ------------------------------------------------------------------ */

function allMatches(src, pattern) {
  const out = [];
  /* 'm' as well as 'g': some probes anchor on a line start. */
  const rx = new RegExp(pattern, 'gm');
  let m;
  while ((m = rx.exec(src)) !== null) out.push(m[1]);
  return out;
}

/** every captured value must equal VERSION; zero matches is a miss. */
function expectAll(cls, label, file, pattern, fix, { allowEmpty = false } = {}) {
  if (!has(file)) {
    drift(label, file, VERSION, '(file not found)', 'the probe points at a file that does not exist -- fix this script or restore the file');
    return;
  }
  const found = allMatches(read(file), pattern);
  if (found.length === 0) {
    if (allowEmpty) { ok(label + ' [' + cls + ']', file, 'no hard-coded version (correct)'); return; }
    drift(label, file, VERSION, '(no version found)', fix);
    return;
  }
  const bad = [...new Set(found.filter((v) => v !== VERSION))];
  if (bad.length > 0) {
    drift(label, file, VERSION, bad.join(', '), fix);
    return;
  }
  ok(label + ' [' + cls + ']', file, found.length + ' occurrence' + (found.length === 1 ? '' : 's'));
}

const RUN_BUILD = 'run: node runtime/build.mjs   (this file is generated)';
const RUN_INTEG = 'run: node scripts/build-integrity.mjs --write';
const BY_HAND = 'edit the file by hand to say ' + VERSION;

/* --- the source of truth itself: the export constant AND the header
       comment that quotes it, so the two cannot drift apart. Both are
       anchored on the `spec_version` that follows them, because
       js/nac.js also carries example manifests with their own
       `version:` keys (1.0.0, 2.3.0) that are not the runtime's. --- */
expectAll('DECLARED', 'runtime version constant + header', 'js/nac.js',
  '\\bversion\\s*:\\s*\'(' + SEMVER + ')\',\\s*spec_version', BY_HAND);

/* --- the npm package metadata --- */
(() => {
  const label = 'npm package version';
  const file = 'runtime/package.json';
  const got = JSON.parse(read(file)).version;
  if (got !== VERSION) {
    drift(label, file, VERSION, got,
      'edit runtime/package.json -- this is what the registry publishes');
  } else {
    ok(label + ' [DECLARED]', file, got);
  }
})();

/* --- the spec document, and the copy that rides inside the tarball.
       N-17 was exactly this pair disagreeing. --- */
expectAll('DECLARED', 'SPEC document version', 'SPEC.md',
  '^\\*\\*Version:\\*\\*\\s*(' + SEMVER + ')', BY_HAND);

(() => {
  const label = 'packaged SPEC is the canonical SPEC';
  const file = 'runtime/SPEC.md';
  if (!has(file)) {
    drift(label, file, 'a copy of SPEC.md', '(file not found)', RUN_BUILD);
    return;
  }
  const canonical = readFileSync(abs('SPEC.md'));
  const packaged = readFileSync(abs(file));
  if (!canonical.equals(packaged)) {
    drift(label, file, 'byte-identical to SPEC.md',
      'differs (' + packaged.length + ' bytes vs ' + canonical.length + ')',
      RUN_BUILD + ' -- it copies SPEC.md into runtime/');
  } else {
    ok(label + ' [DERIVED]', file, packaged.length + ' bytes, identical');
  }
})();

/* --- the integrity receipt and the immutable path it freezes --- */
(() => {
  const label = 'integrity receipt version + immutable path';
  const file = 'js/integrity.json';
  if (!has(file)) { drift(label, file, VERSION, '(file not found)', RUN_INTEG); return; }
  const j = JSON.parse(read(file));
  const bad = [];
  if (j.version !== VERSION) bad.push('version=' + j.version);
  if (typeof j.immutable_path === 'string' && !j.immutable_path.includes(VERSION)) {
    bad.push('immutable_path=' + j.immutable_path);
  }
  if (bad.length) drift(label, file, VERSION, bad.join(', '), RUN_INTEG);
  else ok(label + ' [DERIVED]', file, j.immutable_path);
})();

/* --- the frozen copy the landing page pins --- */
(() => {
  const label = 'frozen immutable runtime copy exists';
  const file = 'js/' + VERSION + '/nac.js';
  if (!has(file)) {
    drift(label, file, 'a frozen copy for ' + VERSION, '(missing)', RUN_INTEG);
  } else {
    ok(label + ' [DERIVED]', file, 'present');
  }
})();

/* --- the landing page: the pinned path, the version pills, and the
       two demo plugin manifests. The demo plugins track the runtime
       version on purpose; if one ever needs its own lifecycle, remove
       it from this probe deliberately instead of letting it drift. --- */
expectAll('DECLARED', 'landing pinned immutable path', 'index.html',
  'js/(' + SEMVER + ')/nac\\.js', BY_HAND);
expectAll('DECLARED', 'landing version pills', 'index.html',
  'v(' + SEMVER + ')\\s*&middot;', BY_HAND);
expectAll('DECLARED', 'landing demo plugin manifests', 'index.html',
  'version:\\s*\'(' + SEMVER + ')\'', BY_HAND);

/* --- CI: the deploy smoke check used to hard-code the versioned path,
       which meant a version bump failed the deploy. It must now derive
       it, so finding NO version here is the passing case. --- */
expectAll('DECLARED', 'deploy smoke check derives the path', '.github/workflows/deploy.yml',
  'js/(' + SEMVER + ')/nac\\.js',
  'the deploy workflow hard-codes a version path -- read it from js/integrity.json instead',
  { allowEmpty: true });

/* --- the generated CLI: N-18 third bullet --- */
expectAll('DERIVED', 'CLI reported version', 'runtime/dist/cli.js',
  'CLI\\s+v?(' + SEMVER + ')', RUN_BUILD);

/* --- the generated type declarations --- */
expectAll('DERIVED', 'type declaration headers', 'runtime/dist/nac.d.ts',
  '@nac3/runtime v(' + SEMVER + ')', RUN_BUILD);
expectAll('DERIVED', 'type declaration headers', 'runtime/dist/nac-v2-extensions.d.ts',
  '@nac3/runtime v(' + SEMVER + ')', RUN_BUILD);

/* --- the root cause lock: the generator must not carry a version of
       its own. If it does, every artefact it writes can go stale again
       exactly the way N-17 did. --- */
(() => {
  const label = 'generator carries no hard-coded version';
  const file = 'runtime/build.mjs';
  const src = read(file);
  /* What counts as a package version hard-coded into the generator:
     anything carrying a prerelease tail (2.3.0-alpha.2 -- unambiguously
     a package version, never prose), plus any bare x.y.z that equals
     the version being shipped (so hard-coding the stable 2.5.0 is
     caught too). What does NOT count: a bare x.y.z naming a past spec
     feature, as in the comment "v1.4.1 -- ergonomic resolution". That
     is documentation, it never reaches an artefact, and flagging it
     would train the next reader to ignore this lock. */
  const found = [...new Set(
    /* Leading guard only. A trailing (?![0-9.]) looks right but makes
       the engine backtrack into the prerelease tail when the version
       ends a sentence, yielding a truncated "2.5.0-alph" -- the tail
       pattern above already refuses to end on a dot. */
    allMatches(src, '(?<![0-9.])(' + SEMVER + ')')
      .filter((v) => v.includes('-') || v === VERSION)
  )];
  if (found.length > 0) {
    drift(label, file, 'no literal version', found.join(', '),
      'read the version from js/nac.js instead of writing it here -- that is the N-17 root cause');
  } else {
    ok(label + ' [GENERATOR]', file, 'derives the version');
  }
})();

/* --- the changelog has to mention the version being shipped --- */
(() => {
  const label = 'changelog mentions this version';
  const file = 'runtime/CHANGELOG.md';
  if (!has(file)) { drift(label, file, VERSION, '(file not found)', BY_HAND); return; }
  /* A heading, and the version as a WHOLE token. A plain
     includes(VERSION) passes on a prefix: while shipping 2.5.0 the
     existing "## 2.5.0-alpha.5" heading satisfied it, so this probe
     reported green on a changelog with no entry for the release being
     cut. Caught by dry-running the real bump against this script. */
  const escaped = VERSION.replace(/[.\\+*?[\]^$(){}|]/g, '\\$&');
  const heading = new RegExp('^##\\s+' + escaped + '(?![-.0-9A-Za-z])', 'm');
  if (!heading.test(read(file))) {
    drift(label, file, '## ' + VERSION + ' heading', '(no entry for this version)',
      'add the "## ' + VERSION + '" section -- the package ships CHANGELOG.md, ' +
      'so an adopter reads this to know what they installed');
  } else {
    ok(label + ' [DECLARED]', file, 'heading present');
  }
})();

/* ---- output ------------------------------------------------------- */

const pad = (s, n) => (s + ' '.repeat(n)).slice(0, n);

console.log('');
console.log('version coherence -- authoritative: js/nac.js  NAC.version = ' + VERSION +
            '  (spec ' + SPEC_VERSION + ')');
console.log('');

for (const r of report) {
  if (QUIET && r.state === 'OK') continue;
  console.log(pad(r.state, 6) + pad(r.where, 44) + r.label);
  if (r.state === 'OK') {
    if (r.detail) console.log('      ' + ' '.repeat(44) + r.detail);
  } else {
    console.log('      want: ' + r.want);
    console.log('      got:  ' + r.got);
    console.log('      fix:  ' + r.fix);
  }
}

console.log('');
if (findings.length > 0) {
  console.log('DRIFT: ' + findings.length + ' slot' + (findings.length === 1 ? '' : 's') +
              ' disagree with js/nac.js. Publishing now would ship a package that ' +
              'misdeclares its own version -- which is audit finding N-17.');
  process.exit(1);
}
console.log('All ' + report.length + ' version slots agree on ' + VERSION + '.');
process.exit(0);
