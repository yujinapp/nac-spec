#!/usr/bin/env node
/* =====================================================================
   build-contract-api.mjs -- publish the NAC3 contract as a static,
   versioned, tamper-evident API.

   Why this exists (external audit N-04, N-14, and the half of N-18
   that waits for a checkable definition of "level"):

   The spec declares roles, verbs, events, finding codes and
   conformance levels normative, but they existed only as prose and as
   literals inside a 344 KB browser bundle. An agent could not read
   the contract without parsing English or disassembling JavaScript,
   and the stability promise of section 12 had no artefact to be
   checked against.

   Owner decision D-02 (2026-10-24): publish it, as a static API, with
   one frozen directory per version, a moving `latest` pointer, no
   purging of old versions, and a method that makes tampering evident.

   THE SOURCE OF TRUTH IS THE RUNTIME, NOT THIS FILE.
   Nothing here is hand-typed from the spec. The generator loads the
   exact published bytes of js/nac.js inside a vm sandbox and reads
   what the runtime itself reports: its version, its exported surface,
   its role set, its event families, its finding codes with their
   severities. Prose-only facts (the locale list, the level
   requirements) are extracted from SPEC.md with anchored patterns and
   fail loudly when the anchor moves. A literal copied by hand is the
   very bug N-17 was about.

   WHAT CANNOT BE DERIVED lives in scripts/contract-api.meta.json:
   the human meaning of each finding code, and whether a level
   requirement is machine-decidable. The gate refuses a mismatch in
   either direction -- an undocumented code, or a documented code the
   runtime no longer emits. That is producer/consumer symmetry applied
   to a published contract.

   Layout produced under api/ (served at /nac-spec/api/):

     api/index.json            the directory + the append-only hash
                               chain. Grows; never rewritten in place.
     api/latest.json           pointers: which version is stable,
                               which is prerelease. The channel also
                               travels INSIDE every artefact, so a
                               consumer that requires a stable
                               contract fails closed instead of
                               silently accepting an alpha (the npm
                               dist-tag mistake of N-01, not repeated).
     api/v/<version>/contract.json   roles, attributes, verbs, events,
                                     locales, api surface.
     api/v/<version>/findings.json   the finding catalogue: code,
                                     severity, emitter, stability.
     api/v/<version>/levels.json     conformance levels, requirement
                                     by requirement, each marked
                                     machine-checkable or not, and
                                     which codes falsify it.
     api/latest/<same three>         byte-identical copy of the newest
                                     version, for consumers that do
                                     not pin.

   Usage:
     node scripts/build-contract-api.mjs          check only (exit 1 on
                                                  drift, on a rewrite of a
                                                  published version, on a
                                                  broken chain, or on a
                                                  purged entry)
     node scripts/build-contract-api.mjs --write  create / refresh the
                                                  current version, the
                                                  chain and latest
     node scripts/build-contract-api.mjs --force  allow overwriting a
                                                  version directory that
                                                  already exists (only for
                                                  a version that never
                                                  shipped)

   ASCII only. No dependency beyond node core.
   ===================================================================== */

import { createHash, createPublicKey, verify as edVerify } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import vm from 'node:vm';
import { loadRuntimeInFixtureDom } from './fixture-dom.mjs';

const ROOT  = join(dirname(fileURLToPath(import.meta.url)), '..');
const WRITE = process.argv.includes('--write');
const FORCE = process.argv.includes('--force');

const API_DIR    = join(ROOT, 'api');
const V_DIR      = join(API_DIR, 'v');
const LATEST_DIR = join(API_DIR, 'latest');
const META_PATH  = join(ROOT, 'scripts', 'contract-api.meta.json');
const TRUST_PATH = join(API_DIR, 'trust.json');
const ATTEST_PATH = join(API_DIR, 'attestation.json');
const WITNESS_DOC_PATH = join(ROOT, 'docs', 'CONTRACT_API_SIGNING.md');
const W_BEGIN = '<!-- NAC3-WITNESS-BEGIN -->';
const W_END   = '<!-- NAC3-WITNESS-END -->';

const SURFACES = ['contract.json', 'findings.json', 'levels.json'];

/* The schema version of the API envelope itself. Bumped only when the
   SHAPE changes, never when the content changes. A consumer pins this
   to know how to read what it got. */
const API_SCHEMA = 1;

let failed = false;
const fail = (msg) => { failed = true; console.error('FAIL  ' + msg); };
const ok   = (msg) => { console.log('OK    ' + msg); };
const note = (msg) => { console.log('      ' + msg); };

/* ---- bytes, hashes, canonical json ---------------------------------
   Every hash here is taken over the exact bytes written to disk, in
   LF, the same bytes the server hands a client. Audit N-22 was a hash
   computed over a CRLF working tree for a file served with LF:
   correct source, impossible hash, runtime rejected by every browser.
   So: refuse CR rather than hash it. */

function sha384(buf) {
  return 'sha384-' + createHash('sha384').update(buf).digest('base64');
}

/* Canonical JSON: keys sorted at every depth, two-space indent, LF,
   one trailing newline. Deterministic across machines and node
   versions, which is what makes a byte comparison a valid gate. */
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

function toBytes(text, label) {
  if (text.indexOf('\r') >= 0) {
    throw new Error('refusing to emit ' + label + ' with CR bytes (audit N-22)');
  }
  return Buffer.from(text, 'utf8');
}

function writeBytes(absPath, bytes) {
  mkdirSync(dirname(absPath), { recursive: true });
  writeFileSync(absPath, bytes);
}

/* ---- the runtime, loaded as the exact published bytes --------------
   js/nac.js is an IIFE that assigns its export onto the global it is
   handed. Inside a vm context, globalThis IS the sandbox, so the
   runtime installs itself there with no window and no document: the
   DOM-dependent branches skip themselves, which is exactly the
   headless path the runtime already supports for SSR and tests.

   This is deliberately NOT runtime/dist/nac.mjs. dist is a wrapper
   built FROM these bytes; the contract must describe the artefact the
   site actually serves and the one the SRI hash of index.html covers. */

function loadRuntime() {
  const srcPath = join(ROOT, 'js', 'nac.js');
  const bytes = readFileSync(srcPath);
  const src = bytes.toString('utf8');
  const quiet = { log() {}, warn() {}, error() {}, info() {} };
  const ctx = vm.createContext({ console: quiet });
  vm.runInContext(src, ctx, { filename: 'js/nac.js' });
  const NAC = ctx.NAC;
  if (!NAC || typeof NAC !== 'object') {
    throw new Error('js/nac.js did not install a NAC export in the sandbox');
  }
  if (!NAC.version || !NAC.spec_version) {
    throw new Error('the runtime export carries no version / spec_version');
  }
  return { NAC, src, bytes };
}

/* ---- extraction from the runtime source ---------------------------
   Each extractor is anchored on a named literal. If the literal is
   renamed or removed, the extractor throws instead of emitting a
   silently empty list -- an empty roles array published as the
   contract would be worse than no contract at all. */

function extractBetween(src, startRx, endToken, label) {
  const m = src.match(startRx);
  if (!m) throw new Error('cannot find ' + label + ' in js/nac.js');
  const from = m.index + m[0].length;
  const to = src.indexOf(endToken, from);
  if (to < 0) throw new Error('cannot find the end of ' + label + ' in js/nac.js');
  return src.slice(from, to);
}

function extractRoles(src) {
  const body = extractBetween(src, /_KNOWN_ROLES_V22\s*=\s*new Set\(\[/, '])', 'the canonical role set');
  const roles = [];
  const rx = /'([a-z][a-z0-9-]*)'/g;
  let m;
  while ((m = rx.exec(body))) roles.push(m[1]);
  if (roles.length < 10) throw new Error('the role set came out suspiciously short (' + roles.length + ')');
  return roles;
}

function extractEventFamilies(src) {
  const body = extractBetween(src, /_CLICK_EVENT_FAMILY\s*=\s*\{/, '\n  };', 'the click event family map');
  const families = {};
  const rx = /'([a-z][a-z0-9-]*)'\s*:\s*\[([^\]]*)\]/g;
  let m;
  while ((m = rx.exec(body))) {
    const events = [];
    const erx = /'(nac:[a-z0-9_:]+)'/g;
    let e;
    while ((e = erx.exec(m[2]))) events.push(e[1]);
    families[m[1]] = events;
  }
  if (Object.keys(families).length < 5) throw new Error('the event family map came out suspiciously short');
  return families;
}

/* Every nac: event name the runtime mentions anywhere. The runtime is
   the only producer of these names, so a scan of its own literals is
   the authoritative list -- not the spec's prose table. */
function extractEventNames(src) {
  const names = new Set();
  const rx = /'(nac:[a-z0-9_]+(?::[a-z0-9_]+)*)'/g;
  let m;
  while ((m = rx.exec(src))) names.add(m[1]);
  return Array.from(names).sort();
}

/* Every data-nac-* attribute the runtime reads or writes. */
function extractAttributes(src) {
  const attrs = new Set();
  const rx = /data-nac-[a-z0-9-]+/g;
  let m;
  while ((m = rx.exec(src))) attrs.add(m[0]);
  return Array.from(attrs).sort();
}

/* ---- finding codes, with the function that emits them -------------
   Three producers, three shapes, all in the same file:
     pushErr('severity', 'code', ...)   per-plugin validate()
     findings.push({ code: 'x', ... })  the strict register-time
                                        validator and the boot dedup
     err.code = 'x'                     thrown errors
   The emitter is resolved by walking back to the nearest preceding
   `function NAME(` so the catalogue can say WHERE a code comes from
   without that mapping being typed by hand. */

function enclosingFunction(src, index) {
  const head = src.slice(0, index);
  const rx = /function\s+([A-Za-z_$][\w$]*)\s*\(/g;
  let last = null, m;
  while ((m = rx.exec(head))) last = m[1];
  return last || '(top level)';
}

function extractFindingCodes(src) {
  const found = new Map(); /* code -> {code, severity, emitters:Set, shapes:Set} */

  const add = (code, severity, emitter, shape) => {
    if (!found.has(code)) {
      found.set(code, { code, severity: severity || null, emitters: new Set(), shapes: new Set() });
    }
    const rec = found.get(code);
    if (severity && !rec.severity) rec.severity = severity;
    rec.emitters.add(emitter);
    rec.shapes.add(shape);
  };

  let m;

  const pushErrRx = /pushErr\('([a-z]+)',\s*'([a-z0-9_]+)'/g;
  while ((m = pushErrRx.exec(src))) {
    add(m[2], m[1], enclosingFunction(src, m.index), 'validate_errors');
  }

  /* Object-shaped emissions often declare their severity next to the code:
       findings.push({ code: 'x', severity: 'error', ... })
     Read it when it is there instead of publishing null. The window stops at
     the next `code:` so one finding can never borrow the severity of the one
     after it, and an emission that declares no severity still publishes
     null -- which is the truth about it. */
  const objRx = /code:\s*'([a-z0-9_]+)'/g;
  while ((m = objRx.exec(src))) {
    const from = m.index + m[0].length;
    const window = src.slice(from, from + 240);
    const nextCode = window.search(/code:\s*'/);
    const scope = nextCode < 0 ? window : window.slice(0, nextCode);
    const sev = scope.match(/severity:\s*'([a-z]+)'/);
    add(m[1], sev ? sev[1] : null, enclosingFunction(src, m.index), 'finding_object');
  }

  const throwRx = /\.code\s*=\s*'([a-z0-9_]+)'/g;
  while ((m = throwRx.exec(src))) {
    add(m[1], 'error', enclosingFunction(src, m.index), 'thrown_error');
  }

  return Array.from(found.values())
    .map((r) => ({
      code: r.code,
      severity: r.severity,
      emitted_by: Array.from(r.emitters).sort(),
      shapes: Array.from(r.shapes).sort(),
    }))
    .sort((a, b) => (a.code < b.code ? -1 : 1));
}

/* The buckets validate_global() returns, WITH the code each one attaches,
   read off items the runtime really produced.

   This used to call validate_global() on an empty document. With no findings
   there is not one item to look at, so it took the bucket NAMES from the
   result keys and the generator then wrote `code: null` for every one of
   them. That was wrong in a way nobody could see from the outside: the
   plugin_instance_violations bucket has carried a code since 2.5.0, the same
   artefact published it in the catalogue AND as uncoded, and the two claims
   sat two keys apart (audit N-14 / PND-039).

   Now a fixture provokes all five conditions and the code is read. Three
   things make it refuse instead of publishing a guess:
     - a bucket the fixture does not provoke (we would have nothing to read),
     - items of one bucket disagreeing on the code (two conditions, one name),
     - an item with no code at all (the N-14 state, back again).
   A generator that composes what it should read is a second opinion, not a
   contract. */
const BUCKET_META_KEYS = new Set([
  'ok', 'has_errors', 'plugin_count', 'total_ids', 'timestamp', 'tolerated',
]);

function readGlobalBuckets() {
  const { result } = loadRuntimeInFixtureDom();
  const names = Object.keys(result).filter((k) => !BUCKET_META_KEYS.has(k)).sort();
  return names.map((bucket) => {
    const items = result[bucket] || [];
    if (!Array.isArray(items)) {
      throw new Error('validate_global bucket "' + bucket + '" is not an array');
    }
    if (items.length === 0) {
      throw new Error(
        'the fixture no longer provokes validate_global bucket "' + bucket
        + '": there is nothing to read its code off, so the catalogue would '
        + 'have to invent one. Teach scripts/fixture-dom.mjs to provoke it.');
    }
    const codes = Array.from(new Set(items.map((i) => i.code)));
    if (codes.length !== 1) {
      throw new Error(
        'validate_global bucket "' + bucket + '" attaches more than one code ('
        + codes.join(', ') + '): one bucket is one condition, or the catalogue '
        + 'cannot describe it with one entry');
    }
    if (!codes[0]) {
      throw new Error(
        'validate_global bucket "' + bucket + '" attaches no code. SPEC.md '
        + 'section 12 promise 4 names this validator; an uncoded bucket makes '
        + 'that promise cover an empty set (audit N-14).');
    }
    const severities = Array.from(new Set(items.map((i) => i.severity)));
    if (severities.length !== 1 || !severities[0]) {
      throw new Error(
        'validate_global bucket "' + bucket + '" does not attach one severity ('
        + severities.join(', ') + ')');
    }
    return { bucket, code: codes[0], severity: severities[0], sample_size: items.length };
  });
}

/* ---- extraction from SPEC.md --------------------------------------
   Two facts live only in the prose. Both are anchored, and both fail
   the build when the anchor moves, so the published contract can
   never quietly disagree with the document. */

function extractLocales(specSrc) {
  const m = specSrc.match(/MUST cover all 10 NAC3 locales:\s*```\s*([^`]+)```/);
  if (!m) throw new Error('cannot find the locale list in SPEC.md section 4.3');
  const locales = m[1].split(',').map((s) => s.trim()).filter(Boolean);
  if (locales.length !== 10) {
    throw new Error('SPEC.md section 4.3 announces 10 locales and lists ' + locales.length);
  }
  return locales;
}

/* The role table of section 1, so the contract can say which of the
   roles the runtime accepts are actually declared in the document.
   Extracted, not typed: the whole point is to surface the difference
   between the two lists rather than to pick one. */
function extractSpecRoleTable(specSrc) {
  const start = specSrc.indexOf('## 1. Roles');
  if (start < 0) throw new Error('cannot find SPEC.md section 1');
  const end = specSrc.indexOf('## 2. Names', start);
  if (end < 0) throw new Error('cannot find the end of SPEC.md section 1');
  const roles = [];
  const rx = /^\|\s*`([a-z][a-z0-9-]*)`\s*\|/gm;
  let m;
  const body = specSrc.slice(start, end);
  while ((m = rx.exec(body))) roles.push(m[1]);
  if (roles.length < 10) throw new Error('the spec role table came out suspiciously short (' + roles.length + ')');
  return roles;
}

function extractCommonVerbs(specSrc) {
  const m = specSrc.match(/naming what it does[\s\S]{0,200}?Common verbs:\s*\n\s*\n([\s\S]*?)\n\s*\n/);
  if (!m) throw new Error('cannot find the common verb list in SPEC.md section 3');
  const verbs = [];
  const rx = /`([a-z_]+)`/g;
  let v;
  while ((v = rx.exec(m[1]))) verbs.push(v[1]);
  if (verbs.length < 10) throw new Error('the common verb list came out suspiciously short');
  return verbs;
}

/* The names the levels carried before 2.5.0, read out of the
   compatibility subsection that promises them.

   api/ publishes these as `legacy_display_name` so a document written
   before the rename can still be mapped onto a level. That makes
   section 8.1 load-bearing: if it stops recording an alias and this
   function just composed 'NAC-' + n anyway, api/ would keep promising
   a mapping no document explains -- the same shape of lie as a
   fingerprint compared against itself. So the gate refuses instead. */
function extractLegacyLevelNames(sectionBody) {
  const subStart = sectionBody.indexOf('### 8.1');
  if (subStart < 0) {
    throw new Error('cannot find SPEC.md section 8.1 -- api/ publishes legacy_display_name and that subsection is what documents it');
  }
  const sub = sectionBody.slice(subStart);
  const out = {};
  for (const n of [1, 2, 3]) {
    const name = 'NAC-' + n;
    if (sub.indexOf('`' + name + '`') < 0) {
      throw new Error('SPEC.md section 8.1 no longer records `' + name + '` as the historical name of level ' + n + ', but api/ still publishes it as legacy_display_name');
    }
    out[n] = name;
  }
  return out;
}

/* The three conformance levels, requirement by requirement, lifted
   verbatim from section 8. The TEXT is extracted; whether a
   requirement is machine-decidable, and which finding code falsifies
   it, is in the meta sidecar keyed by a hash of that text. Edit the
   bullet in the spec and the gate goes red until someone re-reads the
   mapping -- which is the only way a published "level" stays honest. */
function extractLevels(specSrc) {
  const secStart = specSrc.indexOf('## 8. Conformance levels');
  if (secStart < 0) throw new Error('cannot find SPEC.md section 8');
  const secEnd = specSrc.indexOf('## 9. Versioning', secStart);
  if (secEnd < 0) throw new Error('cannot find the end of SPEC.md section 8');
  const body = specSrc.slice(secStart, secEnd);

  const legacy = extractLegacyLevelNames(body);

  const levels = [];
  /* The display name is CAPTURED from the heading, not composed here:
     two places writing the same string is how the version ended up
     typed in 13 places (audit N-17). What section 8 calls a level is
     what api/ publishes as its display_name, by construction. */
  const blockRx = /A page is at \*\*(NAC3 Conformance Level ([123]))\*\*([\s\S]*?)(?=A page is at \*\*NAC3 Conformance Level |\n\nThe NPM package)/g;
  let m;
  while ((m = blockRx.exec(body))) {
    const displayName = m[1];
    const n = Number(m[2]);
    const bullets = [];
    const lines = m[3].split('\n');
    let current = null;
    for (const raw of lines) {
      const line = raw.trim();
      if (/^-\s+/.test(line)) {
        if (current) bullets.push(current);
        current = line.replace(/^-\s+/, '');
      } else if (current && line && !/^(A page is|The NPM|###)/.test(line)) {
        current += ' ' + line;
      } else if (current && !line) {
        bullets.push(current);
        current = null;
      }
    }
    if (current) bullets.push(current);

    levels.push({
      level: n,
      /* Audit N-06, resolved in 2.5.0 by owner decision (option A):
         the pre-2.5.0 names NAC-1/2/3 were one dash away from the
         protocol name NAC3, so a report could not be told apart from
         a statement about the protocol. A machine must never have to
         disambiguate by string shape, so the published id stays the
         key, the display name now says what it is, and the old name
         travels beside it as an alias for documents that predate the
         rename. */
      id: 'nac3-conformance-level-' + n,
      display_name: displayName,
      legacy_display_name: legacy[n],
      cumulative: n > 1,
      requirements: bullets.map((text) => ({
        /* Hex, not a slice of the base64 hash: an id that can contain
           '/' or '+' is hostile to anything that puts it in a URL or a
           JSON pointer. */
        id: 'L' + n + '-' + createHash('sha256').update(text, 'utf8').digest('hex').slice(0, 8),
        text,
        text_sha384: sha384(Buffer.from(text, 'utf8')),
      })),
    });
  }

  if (levels.length !== 3) {
    throw new Error('SPEC.md section 8 yielded ' + levels.length + ' levels, expected 3');
  }
  return levels;
}

/* ---- channel ------------------------------------------------------
   A version with a prerelease tag is NEVER stable. The channel is
   written into every artefact, not only into the pointer file,
   precisely so that a consumer who fetches `latest` without reading
   the pointer still learns what it got. This is N-01 (npm handing
   `latest` an alpha with nothing in the data saying so) answered by
   construction. */
function channelOf(version) {
  return /-/.test(version) ? 'prerelease' : 'stable';
}

/* ---- git helpers --------------------------------------------------
   The repository is the second independent witness of the chain: it
   is itself a hash chain, hosted by someone other than the web host.
   The no-purge gate compares the index that is about to be published
   against the one in HEAD. */
function gitShow(path) {
  try {
    return execFileSync('git', ['show', 'HEAD:' + path], {
      cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'],
    });
  } catch {
    return null;
  }
}

function gitHeadCommit() {
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], {
      cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return null;
  }
}

/* ---- artefact builders --------------------------------------------- */

function buildContract(rt, specSrc, meta) {
  const { NAC, src, bytes } = rt;
  const roles = extractRoles(src);
  const families = extractEventFamilies(src);
  const specRoles = extractSpecRoleTable(specSrc);

  const apiSurface = Object.keys(NAC)
    .filter((k) => typeof NAC[k] === 'function')
    .sort()
    .map((name) => ({ name, arity: NAC[name].length }));

  const dataKeys = Object.keys(NAC)
    .filter((k) => typeof NAC[k] !== 'function')
    .sort()
    .map((name) => ({ name, type: Array.isArray(NAC[name]) ? 'array' : typeof NAC[name] }));

  return {
    api_schema: API_SCHEMA,
    protocol: 'NAC3',
    surface: 'contract',
    version: NAC.version,
    spec_version: NAC.spec_version,
    channel: channelOf(NAC.version),
    generated_by: 'scripts/build-contract-api.mjs',
    generated_from: {
      runtime_path: 'js/nac.js',
      runtime_bytes: bytes.length,
      runtime_sha384: sha384(bytes),
      spec_path: 'SPEC.md',
      spec_sha384: sha384(Buffer.from(specSrc, 'utf8')),
    },
    roles: roles.map((role) => ({
      role,
      completion_events: families[role] || [],
      /* The spec's section 1 table and the runtime's accepted set are
         two different lists today; see the drift report the gate
         prints. The contract publishes what the RUNTIME accepts,
         because that is what an adopter's page is actually judged
         against, and marks whether the spec table declares it. */
      declared_in_spec_table: specRoles.indexOf(role) >= 0,
    })),
    attributes: extractAttributes(src),
    events: extractEventNames(src),
    common_verbs: {
      note: 'Verbs are free-form snake_case identifiers agreed between host and agent. This list is conventional, not exhaustive, and not normative.',
      verbs: extractCommonVerbs(specSrc),
      duplicate_verb_is_a_finding: true,
    },
    locales: {
      note: 'Every label_i18n MUST cover all 10 locales (SPEC.md section 4.3). This is a requirement on the adopter manifest, not on the language of the specification.',
      required: extractLocales(specSrc),
    },
    api: {
      note: 'The exported surface of the runtime, read by loading the published bytes and enumerating the export. Arity is the declared parameter count, not a schema.',
      functions: apiSurface,
      values: dataKeys,
    },
  };
}

function buildFindings(rt, meta) {
  const { NAC, src } = rt;
  const codes = extractFindingCodes(src);
  const buckets = readGlobalBuckets();

  return {
    api_schema: API_SCHEMA,
    protocol: 'NAC3',
    surface: 'findings',
    version: NAC.version,
    spec_version: NAC.spec_version,
    channel: channelOf(NAC.version),
    generated_by: 'scripts/build-contract-api.mjs',
    stability: {
      note: 'SPEC.md section 12 promise 4: finding codes are not reused for a different condition across minor versions. This catalogue is the artefact that promise is checked against: compare two published versions and a reused code is visible.',
      codes_are_append_only: true,
      since_note: 'since records the release that introduced a code. null means the code predates this catalogue (first published at 2.5.0-alpha.5) and its introducing release was not reconstructed from history -- it is not a claim that the code is new.',
    },
    coded_findings: codes.map((c) => {
      const m = meta.finding_codes[c.code] || {};
      return {
        code: c.code,
        severity: c.severity,
        emitted_by: c.emitted_by,
        shapes: c.shapes,
        what: m.what || null,
        fix: m.fix || null,
        since: m.since || null,
      };
    }),
    global_buckets: {
      note: 'validate_global() reports findings as named buckets of objects, not as a flat array. Since 2.5.0 every item of every bucket carries code + severity, so section 12 promise 4 covers a real set. The code and the severity below are READ off items a fixture provokes on purpose (scripts/fixture-dom.mjs), not written here: the previous version of this generator wrote them by hand and published a null for a bucket that had carried a code since 2.5.0 (audit N-14).',
      buckets: buckets.map((b) => ({
        bucket: b.bucket,
        code: b.code,
        severity: b.severity,
        what: (meta.global_buckets[b.bucket] && meta.global_buckets[b.bucket].what) || null,
      })),
    },
    uncoded_findings: {
      note: 'Kept for schema compatibility with 2.5.0-alpha.5 and earlier, where validate_global attached no code to any bucket. Empty since 2.5.0: every bucket is coded, and the codes are in global_buckets above (audit N-14, closed).',
      buckets: [],
    },
  };
}

function buildLevels(rt, specSrc, meta) {
  const { NAC } = rt;
  const levels = extractLevels(specSrc);

  return {
    api_schema: API_SCHEMA,
    protocol: 'NAC3',
    surface: 'levels',
    version: NAC.version,
    spec_version: NAC.spec_version,
    channel: channelOf(NAC.version),
    generated_by: 'scripts/build-contract-api.mjs',
    naming: {
      note: 'Audit N-06, resolved in 2.5.0 (owner decision: option A). The pre-2.5.0 display names NAC-1 / NAC-2 / NAC-3 collided with the protocol name NAC3; they are published as `legacy_display_name` so a document that predates the rename can still be mapped. Machines MUST key on `id`, never on any display name.',
      id_pattern: 'nac3-conformance-level-<1|2|3>',
      display_name_pattern: 'NAC3 Conformance Level <1|2|3>',
      legacy_display_name_pattern: 'NAC-<1|2|3>',
      spec_section: '8 (names), 8.1 (historical names)',
    },
    levels: levels.map((lv) => ({
      id: lv.id,
      level: lv.level,
      display_name: lv.display_name,
      legacy_display_name: lv.legacy_display_name,
      cumulative: lv.cumulative,
      requirements: lv.requirements.map((r) => {
        const m = meta.level_requirements[r.text_sha384] || null;
        return {
          id: r.id,
          text: r.text,
          text_sha384: r.text_sha384,
          machine_checkable: m ? m.machine_checkable : null,
          /* static     = decidable by reading the page and the manifest
             behavioural = decidable only by driving the page and
                           observing the events it emits
             human       = not decidable by a tool at all */
          check: m ? m.check : null,
          falsified_by: m ? m.falsified_by : null,
          note: m ? (m.note || null) : null,
        };
      }),
    })),
    reporting: {
      note: 'A validator MAY report a level only when every machine_checkable requirement of that level and of every lower level passes. Requirements with machine_checkable=false cannot be decided by a tool and MUST be reported as unverified rather than assumed.',
    },
  };
}

/* ---- the index and its hash chain ---------------------------------
   Append-only. Each entry carries the hash of the entry before it, so
   rewriting one published version is not a local edit: it invalidates
   every entry after it, and the head stops matching the copy in git
   and the copy in the npm tarball. Three witnesses, three different
   operators. A compromise of the web host alone forges nothing. */

function entryHash(entry) {
  const copy = { ...entry };
  delete copy.entry_sha384;
  return sha384(Buffer.from(canonical(copy), 'utf8'));
}

function buildEntry(version, channel, publishedAt, commit, runtimeSha, files, prev) {
  const entry = {
    version,
    channel,
    published_at: publishedAt,
    /* HEAD at the moment of generation -- that is, the PARENT of the
       commit that publishes this entry. The publishing commit cannot
       be recorded inside the file it commits. Named for what it is
       rather than `git_commit`, which would invite the wrong reading:
       to find the publishing commit, look for the child of this one
       that touches api/. */
    generated_at_commit: commit,
    runtime_sha384: runtimeSha,
    files,
    prev_entry_sha384: prev,
  };
  entry.entry_sha384 = entryHash(entry);
  return entry;
}

function buildIndex(entries) {
  return {
    api_schema: API_SCHEMA,
    protocol: 'NAC3',
    surface: 'index',
    generated_by: 'scripts/build-contract-api.mjs',
    policy: {
      append_only: true,
      versions_are_never_purged: true,
      versions_are_never_rewritten: true,
      note: 'Each entry carries the hash of the previous entry. The head below is also recorded in the git history of this repository and in the published npm tarball: three independent witnesses. Verify the head against all three before trusting the contract.',
    },
    chain_head: entries.length ? entries[entries.length - 1].entry_sha384 : null,
    entry_count: entries.length,
    entries,
  };
}

function verifyChain(index) {
  let prev = null;
  let i = 0;
  for (const entry of index.entries) {
    i += 1;
    if (entry.prev_entry_sha384 !== prev) {
      fail('chain broken at entry ' + i + ' (' + entry.version + '): prev_entry_sha384 does not match the entry before it');
      return false;
    }
    if (entry.entry_sha384 !== entryHash(entry)) {
      fail('chain broken at entry ' + i + ' (' + entry.version + '): entry_sha384 does not match the entry content');
      return false;
    }
    prev = entry.entry_sha384;
  }
  if (index.chain_head !== prev) {
    fail('chain_head does not match the last entry');
    return false;
  }
  if (index.entry_count !== index.entries.length) {
    fail('entry_count says ' + index.entry_count + ' and there are ' + index.entries.length);
    return false;
  }
  return true;
}

/* ---- layer 4: the offline signature -------------------------------
   The chain proves the publication is internally coherent and the
   three witnesses of the head catch a compromised web host. Neither
   catches a compromised REPOSITORY: whoever can push can rewrite the
   chain and all three witnesses follow. The signature is what closes
   that, and only because the key that makes it is not reachable from
   the repository or from CI -- it lives offline on the owner machine
   (owner decision 2026-10-24, PND-034 option A).

   So this gate VERIFIES and can never sign. A missing or stale
   signature is a hard red in check mode, which is the mode CI runs:
   publishing an unsigned contract after a signed one would be a
   silent downgrade, and a consumer that accepts it gains nothing from
   the layer. Right after --write the same condition is a note rather
   than a red, because at that moment signing is the next step the
   owner has not taken yet. */

function verifyAttestation(index, indexBytes, hard) {
  const bad = hard ? fail : note;
  const trustExists = existsSync(TRUST_PATH);
  const attExists = existsSync(ATTEST_PATH);

  if (!trustExists) {
    if (attExists) {
      fail('api/attestation.json exists and api/trust.json does not: a signature whose public key is not published cannot be verified by anyone');
      return;
    }
    note('unsigned: no api/trust.json yet, so provenance rests on the hash chain and its witnesses alone.');
    note('layer 4 of the method (offline signature) is not in place. To put it in place:');
    note('  node scripts/sign-contract-api.mjs --keygen');
    return;
  }

  let trust;
  try { trust = JSON.parse(readFileSync(TRUST_PATH, 'utf8')); }
  catch (e) { fail('api/trust.json is not valid JSON: ' + e.message); return; }

  const keys = Array.isArray(trust.keys) ? trust.keys : [];
  const active = keys.filter((k) => k.status === 'active');
  if (active.length !== 1) {
    fail('api/trust.json must publish exactly one active key and it publishes ' + active.length);
    return;
  }
  for (const k of keys) {
    if (!k.public_key_spki_b64 || !k.fingerprint_sha384) {
      fail('api/trust.json key "' + k.key_id + '" is missing its public key or its fingerprint');
      return;
    }
    /* The fingerprint is what a human compares against an independent
       record. If it does not match the key material beside it, the
       comparison is theatre. */
    if (sha384(Buffer.from(k.public_key_spki_b64, 'base64')) !== k.fingerprint_sha384) {
      fail('api/trust.json key "' + k.key_id + '": the fingerprint does not match the published key material');
      return;
    }
  }

  if (!attExists) {
    bad('api/trust.json publishes a signing key and api/attestation.json is missing: the contract would be published unsigned');
    note('sign it with the offline key: node scripts/sign-contract-api.mjs --sign');
    return;
  }

  let att;
  try { att = JSON.parse(readFileSync(ATTEST_PATH, 'utf8')); }
  catch (e) { fail('api/attestation.json is not valid JSON: ' + e.message); return; }

  const p = att.payload;
  if (!p || typeof p !== 'object' || !att.signature_b64) {
    fail('api/attestation.json has no payload or no signature');
    return;
  }

  const key = keys.find((k) => k.key_id === p.key_id);
  if (!key) {
    fail('api/attestation.json is signed by key_id "' + p.key_id + '", which api/trust.json does not publish');
    return;
  }
  if (key.status !== 'active') {
    bad('api/attestation.json is signed by key_id "' + p.key_id + '", which is ' + key.status + ': the current index must be signed by the active key');
    note('re-sign with the active key: node scripts/sign-contract-api.mjs --sign');
    return;
  }

  /* Signature first: everything the payload claims is only worth
     checking once we know the payload is the owner's words. */
  let signatureOk = false;
  try {
    const pub = createPublicKey({
      key: Buffer.from(key.public_key_spki_b64, 'base64'),
      format: 'der',
      type: 'spki',
    });
    signatureOk = edVerify(
      null,
      Buffer.from(canonical(p), 'utf8'),
      pub,
      Buffer.from(att.signature_b64, 'base64')
    );
  } catch (e) {
    fail('api/attestation.json signature could not be checked: ' + e.message);
    return;
  }
  if (!signatureOk) {
    fail('api/attestation.json signature does not verify against the published key "' + key.key_id + '"');
    note('either the attestation was altered, or it was made with a key other than the one trust.json publishes.');
    return;
  }

  /* Then what it covers. index_sha384 is the binding one: it is taken
     over the whole published index, so a rewritten policy note or an
     edited entry list breaks it even when the chain still recomputes. */
  const actualIndexSha = sha384(indexBytes);
  let stale = false;
  if (p.index_sha384 !== actualIndexSha) {
    bad('the signature covers a different api/index.json than the one on disk');
    note('signed    ' + p.index_sha384);
    note('on disk   ' + actualIndexSha);
    stale = true;
  }
  if (p.chain_head !== index.chain_head) {
    bad('the signature covers chain head ' + String(p.chain_head).slice(7, 19) + '... and the index head is ' + String(index.chain_head).slice(7, 19) + '...');
    stale = true;
  }
  if (p.entry_count !== index.entry_count) {
    bad('the signature covers ' + p.entry_count + ' entries and the index has ' + index.entry_count);
    stale = true;
  }
  const signedVersions = (p.versions || []).join(',');
  const indexVersions = (index.entries || []).map((e) => e.version).join(',');
  if (signedVersions !== indexVersions) {
    bad('the signature covers versions [' + signedVersions + '] and the index publishes [' + indexVersions + ']');
    stale = true;
  }
  if (stale) {
    note('a release moves the chain, so the index has to be signed again -- that manual step IS the layer:');
    note('  node scripts/sign-contract-api.mjs --sign');
    return;
  }

  ok('signature verifies: key ' + key.key_id + ' (' + key.fingerprint_sha384.slice(7, 19) + '...) over ' + p.entry_count + ' entries, signed ' + p.signed_at);
  note('that fingerprint is only evidence against a record the host does not write: docs/CONTRACT_API_SIGNING.md in git, and the note the owner kept offline.');
}

/* A signature is evidence of provenance only against a record the
   signer's host cannot rewrite. api/trust.json says so itself, and
   points at "the fingerprint recorded in the release documentation".
   This checks that the record is there and still says what api/ says.

   Why a gate and not a convention: the same repository spent five
   months with its version written by hand in thirteen places. A value
   copied into prose and never compared drifts, and a drifted witness
   is worse than no witness -- it is a comparison that passes against
   the wrong value, which is precisely the outcome the layer exists to
   make impossible.

   The record is parsed, not byte-compared against a rendered template:
   comparing two templates would only prove the two templates agree. */
function verifyWitnessRecord(index, indexBytes, hard) {
  const bad = hard ? fail : note;

  /* No published key means layer 4 is not in place; there is nothing to
     witness and the earlier checks already said so. */
  if (!existsSync(TRUST_PATH) || !existsSync(ATTEST_PATH)) return;

  if (!existsSync(WITNESS_DOC_PATH)) {
    bad('docs/CONTRACT_API_SIGNING.md is missing: the published fingerprint has no record outside api/, so a host that serves its own key cannot be contradicted');
    return;
  }
  const src = readFileSync(WITNESS_DOC_PATH, 'utf8');
  const a = src.indexOf(W_BEGIN);
  const b = src.indexOf(W_END);
  if (a < 0 || b < 0 || b < a) {
    bad('docs/CONTRACT_API_SIGNING.md has no witness record: expected a block between ' + W_BEGIN + ' and ' + W_END);
    note('write it with: node scripts/sign-contract-api.mjs --witness   (no private key needed)');
    return;
  }

  const got = {};
  for (const raw of src.slice(a, b).split('\n')) {
    const m = /^\|\s*([a-z0-9_]+)\s*\|\s*(\S.*?)\s*\|\s*$/.exec(raw.replace(/\r$/, ''));
    if (m) got[m[1]] = m[2];
  }

  let trust = null;
  try { trust = JSON.parse(readFileSync(TRUST_PATH, 'utf8')); } catch { return; }
  const active = (trust.keys || []).filter((k) => k.status === 'active');
  if (active.length !== 1) return; /* already reported by verifyAttestation */
  let att = null;
  try { att = JSON.parse(readFileSync(ATTEST_PATH, 'utf8')); } catch { return; }
  const signedAt = att && att.payload ? att.payload.signed_at : null;

  const want = {
    key_id: active[0].key_id,
    key_fingerprint_sha384: active[0].fingerprint_sha384,
    chain_head: index.chain_head,
    index_sha384: sha384(indexBytes),
    entry_count: String(index.entry_count),
    versions: (index.entries || []).map((e) => e.version).join(' '),
    signed_at: signedAt,
  };

  let drift = 0;
  for (const f of Object.keys(want)) {
    if (want[f] === null || want[f] === undefined) continue;
    if (!(f in got)) {
      bad('the witness record in docs/CONTRACT_API_SIGNING.md has no ' + f + ' row');
      drift += 1;
      continue;
    }
    if (got[f] !== want[f]) {
      bad('the witness record in docs/CONTRACT_API_SIGNING.md records ' + f + ' that api/ does not publish');
      note('recorded  ' + got[f]);
      note('api says  ' + want[f]);
      drift += 1;
    }
  }
  if (drift) {
    note('rewrite it from api/: node scripts/sign-contract-api.mjs --witness   (no private key needed)');
    return;
  }
  ok('the witness record in docs/ matches the published key and chain head');
}

/* ---- main ---------------------------------------------------------- */

function main() {
  const rt = loadRuntime();
  const specSrc = readFileSync(join(ROOT, 'SPEC.md'), 'utf8');
  if (!existsSync(META_PATH)) {
    console.error('FAIL  missing ' + META_PATH);
    console.error('      the catalogue needs the human meaning of each code; it is not derivable.');
    process.exit(1);
  }
  const meta = JSON.parse(readFileSync(META_PATH, 'utf8'));

  const version = rt.NAC.version;
  const channel = channelOf(version);
  console.log('runtime version   ' + version + '  (' + channel + ')');
  console.log('spec version      ' + rt.NAC.spec_version);
  console.log('runtime sha384    ' + sha384(rt.bytes));

  /* ---- 1. generate the three surfaces ---- */
  const built = {
    'contract.json': buildContract(rt, specSrc, meta),
    'findings.json': buildFindings(rt, meta),
    'levels.json':   buildLevels(rt, specSrc, meta),
  };

  /* ---- 2. producer / consumer symmetry on the meta sidecar ----
     Both directions. An undocumented code means the catalogue
     publishes a null meaning; a documented code the runtime no longer
     emits means the catalogue describes something that cannot
     happen. Either one is a lie about the contract. */
  const liveCodes = built['findings.json'].coded_findings.map((c) => c.code);
  for (const c of liveCodes) {
    if (!meta.finding_codes[c]) {
      fail('finding code "' + c + '" is emitted by the runtime and has no entry in scripts/contract-api.meta.json');
    }
  }
  for (const c of Object.keys(meta.finding_codes)) {
    if (liveCodes.indexOf(c) < 0) {
      fail('finding code "' + c + '" is documented in the meta sidecar and the runtime no longer emits it (remove it, or restore the emitter)');
    }
  }
  const liveBuckets = built['findings.json'].global_buckets.buckets.map((b) => b.bucket);
  for (const b of liveBuckets) {
    if (!meta.global_buckets[b]) {
      fail('validate_global bucket "' + b + '" has no entry in the meta sidecar');
    }
  }
  for (const b of Object.keys(meta.global_buckets)) {
    if (liveBuckets.indexOf(b) < 0) {
      fail('meta sidecar documents a validate_global bucket "' + b + '" that validate_global no longer returns');
    }
  }
  /* The severity is now READ from the runtime, and the sidecar carries the
     severity a human reviewed. If the two disagree, somebody changed how
     grave a condition is without saying so -- publish neither silently. */
  for (const b of built['findings.json'].global_buckets.buckets) {
    const declared = meta.global_buckets[b.bucket] && meta.global_buckets[b.bucket].severity;
    if (declared && declared !== b.severity) {
      fail('validate_global bucket "' + b.bucket + '" attaches severity "' + b.severity
        + '" and the meta sidecar says "' + declared
        + '". One of the two changed its mind about how grave this is.');
    }
  }
  /* The bucket codes are finding codes too: they must be in the catalogue
     and in the sidecar like any other, or the contract would describe the
     same condition twice with two different meanings. */
  for (const b of built['findings.json'].global_buckets.buckets) {
    if (liveCodes.indexOf(b.code) < 0) {
      fail('validate_global bucket "' + b.bucket + '" attaches code "' + b.code
        + '" and the catalogue does not list it: the emission shape changed and '
        + 'extractFindingCodes no longer sees it.');
    }
  }

  /* ---- 3. the level requirements must still read as they did ----
     The mapping from a requirement to the codes that falsify it was
     reviewed against a specific sentence. If the sentence changed,
     the mapping is unreviewed, and a published level would be
     asserting something nobody checked. */
  for (const lv of built['levels.json'].levels) {
    for (const r of lv.requirements) {
      if (!meta.level_requirements[r.text_sha384]) {
        fail('level requirement "' + r.text.slice(0, 60) + '..." has no reviewed mapping (its text changed, or it is new): add it to scripts/contract-api.meta.json under ' + r.text_sha384);
      }
    }
  }
  for (const h of Object.keys(meta.level_requirements)) {
    const stillThere = built['levels.json'].levels.some((lv) => lv.requirements.some((r) => r.text_sha384 === h));
    if (!stillThere) {
      fail('the meta sidecar maps a level requirement that SPEC.md section 8 no longer contains (' + h + ')');
    }
  }

  /* ---- 4. role table drift, reported not hidden ---- */
  const undeclared = built['contract.json'].roles.filter((r) => !r.declared_in_spec_table).map((r) => r.role);
  if (undeclared.length) {
    note('role drift: the runtime accepts ' + undeclared.length + ' role(s) the spec table does not list: ' + undeclared.join(', '));
    note('            published as accepted + declared_in_spec_table=false. Tracked as audit N-23.');
  }

  if (failed) {
    console.error('');
    console.error('The catalogue is out of sync with the runtime. Nothing was written.');
    process.exit(1);
  }

  /* ---- 5. freeze / drift / no-purge ---- */
  const versionDir = join(V_DIR, version);
  const bytesOf = {};
  for (const name of SURFACES) bytesOf[name] = toBytes(canonical(built[name]), name);

  const existingIndexPath = join(API_DIR, 'index.json');
  const existingIndex = existsSync(existingIndexPath)
    ? JSON.parse(readFileSync(existingIndexPath, 'utf8'))
    : buildIndex([]);

  const priorEntries = existingIndex.entries.filter((e) => e.version !== version);
  const ownEntry = existingIndex.entries.find((e) => e.version === version) || null;

  /* The published bytes of a version that already shipped may never
     change. The only escape is --force, and only for a version that
     the chain says nobody could have pinned yet. */
  let dirtyVersion = false;
  if (existsSync(versionDir)) {
    for (const name of SURFACES) {
      const p = join(versionDir, name);
      if (!existsSync(p)) { dirtyVersion = true; continue; }
      if (!readFileSync(p).equals(bytesOf[name])) dirtyVersion = true;
    }
  } else {
    dirtyVersion = true;
  }

  if (dirtyVersion && ownEntry && !FORCE && !WRITE) {
    fail('api/v/' + version + '/ differs from what the runtime generates, and that version is already in the chain.');
    note('this means either the runtime changed without a version bump, or a published artefact was edited.');
    note('bump the version, or rerun with --write --force if this version never shipped.');
  }
  if (dirtyVersion && ownEntry && WRITE && !FORCE) {
    fail('refusing to rewrite api/v/' + version + '/: it is already in the published chain.');
    note('bump the version in js/nac.js, or add --force if this version never shipped.');
  }

  /* No purge: every entry that HEAD published must still be here. */
  const headIndexRaw = gitShow('api/index.json');
  if (headIndexRaw) {
    let headIndex = null;
    try { headIndex = JSON.parse(headIndexRaw); } catch { headIndex = null; }
    if (headIndex && Array.isArray(headIndex.entries)) {
      for (const he of headIndex.entries) {
        const still = existingIndex.entries.find((e) => e.version === he.version);
        if (!still) {
          fail('version ' + he.version + ' was published in HEAD and is missing from api/index.json -- versions are never purged');
        } else if (still.entry_sha384 !== he.entry_sha384 && he.version !== version) {
          fail('the chain entry for ' + he.version + ' changed since HEAD -- published entries are immutable');
        }
      }
      for (const hv of headIndex.entries.map((e) => e.version)) {
        const dir = join(V_DIR, hv);
        if (!existsSync(dir)) {
          fail('api/v/' + hv + '/ was published in HEAD and no longer exists on disk -- the deploy mirrors this tree with --delete-after, so removing it here removes it from the web');
        }
      }
    }
  }

  /* Every directory on disk must be in the chain, and its bytes must
     match the hashes the chain recorded. */
  if (existsSync(V_DIR)) {
    /* Directories only, and no dotfiles: api/v/ also carries its own
       .htaccess (the immutable cache + CORS rules for frozen
       versions), which is not a version and must not be audited as
       one. withFileTypes keeps this from depending on the name. */
    const versionDirs = readdirSync(V_DIR, { withFileTypes: true })
      .filter((d) => d.isDirectory() && d.name.charAt(0) !== '.')
      .map((d) => d.name);
    for (const dir of versionDirs) {
      const entry = existingIndex.entries.find((e) => e.version === dir);
      if (!entry) {
        if (dir !== version) {
          fail('api/v/' + dir + '/ exists and no chain entry claims it');
        }
        continue;
      }
      for (const f of entry.files) {
        const p = join(ROOT, f.path);
        if (!existsSync(p)) { fail('the chain lists ' + f.path + ' and it is not on disk'); continue; }
        const b = readFileSync(p);
        if (b.length !== f.bytes || sha384(b) !== f.sha384) {
          if (dir === version && (WRITE || FORCE)) continue;
          fail(f.path + ' does not match the hash recorded in the chain (published bytes are immutable)');
        }
      }
    }
  }

  if (!verifyChain(existingIndex)) {
    note('the chain in api/index.json does not verify. Nothing was written.');
  }

  if (failed) { process.exit(1); }

  if (!WRITE) {
    /* Check mode: everything above had to hold, plus the current
       version must already be published and byte-identical. */
    if (!ownEntry) {
      fail('version ' + version + ' is not in api/index.json -- run with --write to publish it');
    } else if (dirtyVersion) {
      fail('api/v/' + version + '/ is stale against the runtime -- run with --write');
    } else {
      ok('api/v/' + version + '/ matches the runtime (' + SURFACES.length + ' surfaces)');
      ok('chain verifies end to end (' + existingIndex.entry_count + ' entries, head ' + String(existingIndex.chain_head).slice(7, 19) + '...)');
    }
    /* latest must mirror the newest entry byte for byte. */
    checkLatest(existingIndex, bytesOf, version);
    /* Hard here: this is the mode CI runs before the upload. */
    verifyAttestation(existingIndex, readFileSync(existingIndexPath), true);
    verifyWitnessRecord(existingIndex, readFileSync(existingIndexPath), true);
    if (failed) process.exit(1);
    console.log('');
    console.log('Contract API is coherent.');
    return;
  }

  /* ---- 6. write ---- */
  for (const name of SURFACES) {
    writeBytes(join(versionDir, name), bytesOf[name]);
    console.log('WRITE api/v/' + version + '/' + name + ' (' + bytesOf[name].length + ' bytes)');
  }

  const files = SURFACES.map((name) => ({
    path: 'api/v/' + version + '/' + name,
    bytes: bytesOf[name].length,
    sha384: sha384(bytesOf[name]),
  }));

  const publishedAt = ownEntry ? ownEntry.published_at : new Date().toISOString().slice(0, 10);
  const prev = priorEntries.length ? priorEntries[priorEntries.length - 1].entry_sha384 : null;
  const entry = buildEntry(version, channel, publishedAt, gitHeadCommit(), sha384(rt.bytes), files, prev);

  const entries = priorEntries.concat([entry]);
  const index = buildIndex(entries);
  const indexBytes = toBytes(canonical(index), 'api/index.json');
  writeBytes(existingIndexPath, indexBytes);
  console.log('WRITE api/index.json (' + index.entry_count + ' entries, head ' + String(index.chain_head).slice(7, 19) + '...)');

  /* latest: a mirror of the newest entry, plus explicit pointers. The
     stable pointer stays null while no stable version exists. Saying
     "latest" and handing over an alpha without the data admitting it
     is exactly the npm problem of N-01. */
  const newestStable = entries.filter((e) => e.channel === 'stable').pop() || null;
  const newestPre = entries.filter((e) => e.channel === 'prerelease').pop() || null;
  const latestPointer = {
    api_schema: API_SCHEMA,
    protocol: 'NAC3',
    surface: 'latest',
    generated_by: 'scripts/build-contract-api.mjs',
    stable: newestStable ? newestStable.version : null,
    prerelease: newestPre ? newestPre.version : null,
    mirrored_in_api_latest: entry.version,
    mirrored_channel: entry.channel,
    chain_head: index.chain_head,
    note: 'api/latest/ mirrors ' + entry.version + ' (' + entry.channel + '). Every mirrored artefact declares its own channel, so a consumer that requires a stable contract can refuse a prerelease without reading this file. Old versions are never purged: pin api/v/<version>/ for a byte-stable contract.',
  };
  writeBytes(join(API_DIR, 'latest.json'), toBytes(canonical(latestPointer), 'api/latest.json'));
  console.log('WRITE api/latest.json (stable=' + latestPointer.stable + ' prerelease=' + latestPointer.prerelease + ')');

  for (const name of SURFACES) {
    writeBytes(join(LATEST_DIR, name), bytesOf[name]);
  }
  console.log('WRITE api/latest/ (mirror of ' + entry.version + ')');

  /* Soft here on purpose: the chain just moved, so an existing
     signature is stale BY DESIGN and signing is the next step. Check
     mode -- the one CI runs -- turns the same condition red. */
  console.log('');
  verifyAttestation(index, indexBytes, false);
  verifyWitnessRecord(index, indexBytes, false);

  console.log('');
  console.log('Contract API written. Commit api/ together with the runtime that produced it.');
}

function checkLatest(index, bytesOf, version) {
  const latestPath = join(API_DIR, 'latest.json');
  if (!existsSync(latestPath)) { fail('api/latest.json is missing'); return; }
  const pointer = JSON.parse(readFileSync(latestPath, 'utf8'));
  if (pointer.chain_head !== index.chain_head) {
    fail('api/latest.json records a chain head that is not the current one');
  }
  if (pointer.mirrored_in_api_latest !== version) {
    fail('api/latest.json says api/latest/ mirrors ' + pointer.mirrored_in_api_latest + ' and the current version is ' + version);
  }
  for (const name of SURFACES) {
    const p = join(LATEST_DIR, name);
    if (!existsSync(p)) { fail('api/latest/' + name + ' is missing'); continue; }
    if (!readFileSync(p).equals(bytesOf[name])) {
      fail('api/latest/' + name + ' is not byte-identical to api/v/' + version + '/' + name);
    }
  }
  const stable = index.entries.filter((e) => e.channel === 'stable').pop() || null;
  if ((stable ? stable.version : null) !== pointer.stable) {
    fail('api/latest.json declares stable=' + pointer.stable + ' and the chain says ' + (stable ? stable.version : null));
  }
  if (!failed) ok('api/latest/ mirrors ' + version + ' and the pointers agree with the chain');
}

try {
  main();
} catch (e) {
  console.error('FAIL  ' + e.message);
  process.exit(1);
}
