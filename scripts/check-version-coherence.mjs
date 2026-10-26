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
import vm from 'node:vm';
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

/* THE SOURCE OF TRUTH IS WHAT THE RUNTIME EXPORTS, NOT WHAT THE FILE
   SAYS ABOUT ITSELF (audit N-42).

   This used to be a regex over the source, taking the FIRST
   `version: '<semver>'` it found. In js/nac.js that is line 8 -- the
   header COMMENT that quotes the constant -- and the real export is
   the fifth such match, at the bottom of the file. So the lock that
   exists to stop a published artefact from misdeclaring its own
   version was reading that version out of a comment. Two consequences,
   both measured:

     - blank the export and leave the comment alone, and the gate
       reported all 18 slots green over a runtime that exports no
       version at all;
     - move only the comment, and the gate adopts the comment as
       authoritative and reports the EXPORT as the drifted slot -- it
       would tell a maintainer to edit the artefact to match the
       documentation. That is N-17 pointing backwards.

   So the version is now read the way scripts/build-contract-api.mjs
   reads it: by loading the exact published bytes in a vm sandbox and
   asking the runtime what it exports. A comment cannot satisfy that,
   and the header comment keeps its own probe below as a consumer that
   has to agree. Same technique, same file, one source of truth. */
const NAC = (() => {
  const quiet = { log() {}, warn() {}, error() {}, info() {} };
  const ctx = vm.createContext({ console: quiet });
  try {
    vm.runInContext(nacSrc, ctx, { filename: 'js/nac.js' });
  } catch (e) {
    console.error('FAIL  js/nac.js does not evaluate: ' + e.message);
    console.error('      The version is read from what the runtime EXPORTS, so a runtime');
    console.error('      that cannot load has no version to check against.');
    process.exit(1);
  }
  if (!ctx.NAC || typeof ctx.NAC !== 'object') {
    console.error('FAIL  js/nac.js installed no NAC export in the sandbox.');
    process.exit(1);
  }
  return ctx.NAC;
})();

if (typeof NAC.version !== 'string' || !new RegExp('^' + SEMVER + '$').test(NAC.version)) {
  console.error('FAIL  the NAC export carries no usable version (got ' + JSON.stringify(NAC.version) + ').');
  console.error('      Expected the export at the bottom of js/nac.js to read:  version: \'2.5.0\',');
  console.error('      Without it there is no authoritative version to check against -- and a');
  console.error('      version quoted in a comment is documentation, not a declaration.');
  process.exit(1);
}
const VERSION = NAC.version;

if (typeof NAC.spec_version !== 'string' || !/^[0-9]+\.[0-9]+$/.test(NAC.spec_version)) {
  console.error('FAIL  the NAC export carries no usable spec_version (got ' + JSON.stringify(NAC.spec_version) + ').');
  process.exit(1);
}
const SPEC_VERSION = NAC.spec_version;

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

/* --- the RENDERED spec page, which is what an adopter actually reads:
       SPEC.md is the source, SPEC.html is published beside it, and
       nothing asserted the second was the rendering of the first. It is
       generated, so the failure mode is not a typo -- it is forgetting
       to run the generator, and then the published page announces the
       previous version while SPEC.md announces this one. That happened
       while cutting this very release and only surfaced because a human
       read `git status`. --- */
expectAll('DERIVED', 'rendered SPEC.html version', 'SPEC.html',
  'Version:</strong>\\s*(' + SEMVER + ')',
  'run: node scripts/build-spec-html.mjs   (SPEC.html is generated from SPEC.md)');

/* --- the Status line of that same document, where finding NO version
       is the only pass. Audit N-45, second half.

       The published 2.5.0 SPEC.md declared its version TWICE in its
       first four lines and the two disagreed: line 3 said 2.5.0
       (stable) and line 4 said `v2.5.0-alpha.5 ... Promoted to npm
       dist-tag latest`. Line 4 was TRUE until 18:40 on 2026-10-26 --
       the act of promoting `latest` to the stable release is what
       falsified it, in both halves. Same shape as N-17 and as the
       README half of N-45: a version written by hand where no lock
       looked. The cure is not a second slot to keep in sync, it is to
       stop restating the version: the document declares it once, on
       the line above, and the Status line points at section 9.1.

       WHAT THIS ENFORCES, exactly, so the claim is not larger than the
       code: it refuses a full x.y.z (with or without a prerelease
       tail) and a `vX.Y` token anywhere on the Status line. A bare
       two-part number is allowed only in a cross-reference ("section
       9.1"), which is stripped before scanning, because this document
       references its own sections that way throughout and a gate that
       cannot tell 9.1 from 2.5 without guessing should not guess. Every
       real occurrence of this defect took one of the two refused
       shapes. --- */
(() => {
  const label = 'SPEC status line restates no version';
  const file = 'SPEC.md';
  if (!has(file)) {
    drift(label, file, 'a Status line', '(file not found)', 'restore SPEC.md');
    return;
  }
  const m = read(file).match(/^\*\*Status:\*\*[ \t]*(.*)$/m);
  if (!m) {
    drift(label, file, 'a Status line naming no version', '(no Status line at all)',
      'restore the **Status:** line of SPEC.md -- it is what tells an adopter whether this is a release');
    return;
  }
  const scanned = m[1].replace(/\bsections?\s+[0-9]+(?:\.[0-9]+)*/gi, '');
  const found = [...new Set(allMatches(scanned, '(' + SEMVER + '|v[0-9]+\\.[0-9]+)'))];
  if (found.length) {
    drift(label, file, 'no version on this line at all', found.join(', '),
      'rewrite the Status line so it does not restate the version: the document declares it '
      + 'once, on the **Version:** line above, and the release channel is section 9.1. '
      + 'A Status line that names a version is true until the next release and false after it '
      + '-- that is audit N-45.');
  } else {
    ok(label + ' [DECLARED]', file, 'names no version (correct)');
  }
})();

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

/* --- the published contract API (audit N-04, owner decision D-02).
       The runtime version is now also a published URL, so it is one
       more slot that can fall behind. The deep checks -- hash chain,
       immutability, no purge -- belong to the contract API gate; this
       probe only answers "is THIS version published at all", which is
       what a version bump breaks. --- */
(() => {
  const RUN_API = 'run: node scripts/build-contract-api.mjs --write';
  const label = 'contract API publishes this version';
  const file = 'api/index.json';
  if (!has(file)) { drift(label, file, VERSION, '(file not found)', RUN_API); return; }
  const idx = JSON.parse(read(file));
  const entry = (idx.entries || []).find((e) => e.version === VERSION);
  if (!entry) {
    drift(label, file, VERSION,
      'chain holds ' + ((idx.entries || []).map((e) => e.version).join(', ') || 'nothing'), RUN_API);
    return;
  }
  const missing = (entry.files || []).map((f) => f.path).filter((p) => !has(p));
  if (missing.length) {
    drift(label, file, 'every artefact on disk', 'missing ' + missing.join(', '), RUN_API);
    return;
  }
  const pointerPath = 'api/latest.json';
  if (!has(pointerPath)) { drift(label, pointerPath, VERSION, '(file not found)', RUN_API); return; }
  const pointer = JSON.parse(read(pointerPath));
  if (pointer.mirrored_in_api_latest !== VERSION) {
    drift('contract API latest mirror', pointerPath, VERSION, pointer.mirrored_in_api_latest, RUN_API);
    return;
  }
  ok(label + ' [DERIVED]', file, entry.files.length + ' surfaces, channel ' + entry.channel);
})();

/* --- the landing page: the pinned path, the version pills, and the
       two demo plugin manifests. The demo plugins track the runtime
       version on purpose; if one ever needs its own lifecycle, remove
       it from this probe deliberately instead of letting it drift. --- */
/* Three occurrences, two producers. The <script> tag is written by
   build-integrity.mjs --write (it re-pins the runtime onto the current
   immutable path); the two in the adopter-facing prose are by hand,
   and build-integrity refuses the tree while they are stale. */
expectAll('MIXED', 'landing pinned immutable path', 'index.html',
  'js/(' + SEMVER + ')/nac\\.js',
  RUN_INTEG + ' (rewrites the script tag), then edit the adopter snippet in index.html by hand');
expectAll('DECLARED', 'landing version pills', 'index.html',
  'v(' + SEMVER + ')\\s*&middot;', BY_HAND);
expectAll('DECLARED', 'landing demo plugin manifests', 'index.html',
  'version:\\s*\'(' + SEMVER + ')\'', BY_HAND);

/* --- the repository front page, which is ALSO a published document:
       the deploy mirrors the whole tree, so this file is served at
       /nac-spec/README.md, and on GitHub it is the first thing an
       adopter reads about the project.

       Audit N-45. The 2.5.0 stable release went out with a README
       whose badge read `status-2.5--alpha` and whose headline
       announced "v2.5.0-alpha.5 shipped ... promoted to npm latest".
       Both sentences were TRUE until the promotion and false the
       minute it happened -- the act of promoting `latest` is what
       falsified them. Nothing watched this file, so this gate reported
       eighteen slots green over a front page that called the stable
       release an alpha. That is N-17's shape in a human surface
       instead of a tarball: a version written by hand somewhere no
       lock could see it.

       The badges are DECODED, not pattern-matched, because shields.io
       spells a literal dash as a doubled dash: the badge for a
       prerelease reads 2.6.0--alpha.1, which no semver regex would
       recognise, and the probe would then report "names no version"
       about a badge that names one. Decoding is what lets this read
       the same string a reader sees. --- */
(() => {
  const file = 'README.md';
  if (!has(file)) {
    drift('README badges', file, VERSION, '(file not found)', 'restore README.md');
    return;
  }
  const src = read(file);
  const DASH = '%%LITERAL-DASH%%';

  /** the message segment of a shields.io badge, as a reader sees it */
  const badgeMessage = (name) => {
    const needle = '/badge/' + name + '-';
    const at = src.indexOf(needle);
    if (at < 0) return null;
    const url = src.slice(at + needle.length).split(')')[0];
    const parts = url.split('--').join(DASH).split('-');
    /* the shape is <message>-<color>, so the colour is the last segment */
    return parts.slice(0, -1).join('-').split(DASH).join('-').replace(/_/g, ' ');
  };

  (() => {
    const label = 'README status badge';
    const msg = badgeMessage('status');
    if (msg === null) {
      drift(label, file, 'a status badge naming ' + VERSION, '(no status badge)',
        'README.md is published at /nac-spec/README.md and is the GitHub front page -- '
        + 'give it a status badge that names the shipping version');
      return;
    }
    const found = [...new Set(allMatches(msg, '(' + SEMVER + ')'))];
    if (found.length === 0) {
      drift(label, file, VERSION, JSON.stringify(msg) + ' -- names no version', BY_HAND);
      return;
    }
    const bad = found.filter((v) => v !== VERSION);
    if (bad.length) {
      drift(label, file, VERSION, bad.join(', ') + ' (the badge reads ' + JSON.stringify(msg) + ')',
        BY_HAND + ' -- a stable release whose front page still says alpha is audit N-45');
      return;
    }
    ok(label + ' [DECLARED]', file, msg);
  })();

  (() => {
    const label = 'README spec badge';
    const msg = badgeMessage('spec');
    if (msg === null) {
      drift(label, file, 'a spec badge naming v' + SPEC_VERSION, '(no spec badge)', BY_HAND);
      return;
    }
    const wanted = new RegExp('(^|[^0-9.])' + SPEC_VERSION.replace('.', '\\.') + '([^0-9.]|$)');
    if (!wanted.test(msg)) {
      drift(label, file, 'v' + SPEC_VERSION, JSON.stringify(msg), BY_HAND);
      return;
    }
    /* the spec badge names the SPEC line (2.5), never a release tail */
    const tails = [...new Set(allMatches(msg, '(' + SEMVER + ')'))];
    if (tails.length) {
      drift(label, file, 'v' + SPEC_VERSION + ' -- the spec line, not a release',
        tails.join(', '), BY_HAND);
      return;
    }
    ok(label + ' [DECLARED]', file, msg);
  })();
})();

/* --- CI: the deploy smoke check used to hard-code the versioned path,
       which meant a version bump failed the deploy. It must now derive
       it, so finding NO version here is the passing case. --- */
/* Here, unlike every other slot, finding NO version is the ONLY pass.

   expectAll asks "is every version found the right one", which let a
   freshly hard-coded path through as long as it named the version being
   shipped -- and then broke the deploy at the NEXT bump, which is the
   exact failure this slot was added for. The comment already said
   "finding NO version here is the passing case"; the code only started
   enforcing it here (audit N-42). */
(() => {
  const label = 'deploy smoke check derives the path';
  const file = '.github/workflows/deploy.yml';
  if (!has(file)) {
    drift(label, file, 'no version path', '(file not found)', 'restore the deploy workflow');
    return;
  }
  const found = [...new Set(allMatches(read(file), 'js/(' + SEMVER + ')/nac\\.js'))];
  if (found.length) {
    drift(label, file, 'no version path at all', found.join(', '),
      'the deploy workflow hard-codes a version path -- read it from js/integrity.json instead. '
      + 'A path that is correct today fails the deploy at the next bump, which is why this slot exists.');
  } else {
    ok(label + ' [DECLARED]', file, 'no hard-coded version (correct)');
  }
})();

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
       exactly the way N-17 did.

       Since 2.5.0 the CLI is real source under runtime/src/ instead of
       a template string inside the generator (audit N-18), so the lock
       has to cover that source too -- otherwise the hard-coding simply
       moves one directory over and the gate keeps reporting green
       about a file nobody writes a version into any more. --- */
/* Is this version literal a DECLARATION of the package's own version,
   or prose that happens to name a version? (audit N-41)

   The first cut of this lock answered "any bare x.y.z equal to the
   version being shipped". That is right for code and wrong for prose,
   and the two collide on exactly one day: the day the project ships a
   stable version that its own comments already mention. Cutting 2.5.0
   turned seven correct sentences red -- "before 2.5.0 the URL mode
   aborted", "(pre-2.5.0 alias: ...)", "serve a runtime at 2.5.0 or
   later" -- and left a maintainer two ways out: weaken the lock, or
   reword true documentation to dodge a lint. Both teach the next
   reader to stop believing this gate.

   So the question is asked structurally instead of by digits. A literal
   is a self-declaration when:
     - it carries a prerelease tail -- 2.3.0-alpha.2 is never prose; or
     - the WHOLE string literal is the version -- const V = '2.5.0',
       version: '2.5.0'; that is the N-17 shape verbatim; or
     - it is introduced as one -- preceded by `v`, by `version` and
       punctuation, or by `@` as in @nac3/runtime@2.5.0.
   Anything else -- a comment, or a version embedded in a longer
   sentence -- is prose and stays legal.

   Deliberately NOT a comment stripper: `//` lives inside every URL in
   these files, so stripping to end-of-line could hide a real
   declaration. This test never has to decide what is a comment, and
   when it is unsure it flags -- fail closed. */
function declaredVersions(src) {
  const out = new Set();
  const rx = new RegExp('(?<![0-9.])(' + SEMVER + ')', 'g');
  let m;
  while ((m = rx.exec(src)) !== null) {
    const v = m[1];
    if (v.includes('-')) { out.add(v); continue; }
    if (v !== VERSION) continue;
    const i = m.index;
    const before = src[i - 1];
    const after = src[i + v.length];
    const isWholeString = (before === "'" || before === '"' || before === '`') && before === after;
    const lead = src.slice(Math.max(0, i - 24), i);
    const isIntroduced =
      /(?:^|[^A-Za-z0-9])v$/.test(lead) ||
      /version[^A-Za-z0-9]*$/i.test(lead) ||
      lead.endsWith('@');
    if (isWholeString || isIntroduced) out.add(v);
  }
  return [...out];
}

for (const file of ['runtime/build.mjs', 'runtime/src/cli.mjs', 'runtime/src/cli-url.mjs']) (() => {
  const label = 'generator carries no hard-coded version';
  const src = read(file);
  const found = declaredVersions(src);
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
