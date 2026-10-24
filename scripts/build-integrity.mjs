#!/usr/bin/env node
/* =====================================================================
   build-integrity.mjs -- freeze the runtime under an immutable version
   path and keep the Subresource Integrity hashes honest.

   Why this exists (external audit N-02 + N-03):
   the landing told adopters to load a 344 KB script from a mutable URL
   with no hash, so nobody could prove they received what this project
   published. This script is the SINGLE producer of that hash. If the
   hash in index.html disagrees with the bytes on disk, this script
   exits non-zero and the deploy is blocked -- that is the point.

   Two artefacts:
     js/<version>/nac.js   immutable, frozen copy. Production adopters
                           pin this path. Never hand-edited.
     js/integrity.json     the receipt: version, byte length, sha384 of
                           every asset the landing loads.

   Usage:
     node scripts/build-integrity.mjs            check only (exit 1 on drift)
     node scripts/build-integrity.mjs --write    refresh the immutable copy
                                                 and js/integrity.json
     node scripts/build-integrity.mjs --force    overwrite an immutable copy
                                                 that already exists and
                                                 differs (only for a fix to
                                                 an unreleased version)

   ASCII only. No dependency beyond node core.
   ===================================================================== */

import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const WRITE = process.argv.includes('--write');
const FORCE = process.argv.includes('--force');

/* The assets the landing page loads. The runtime is the contract carrier;
   the other two ride with it so the page cannot load a stale sibling. */
const ASSETS = [
  'js/nac.js',
  'js/nac-v2-extensions.js',
  'js/nac-chat-client.js',
];

const abs = (p) => join(ROOT, p);
const read = (p) => readFileSync(abs(p));
const fail = (msg) => { console.error('FAIL  ' + msg); process.exitCode = 1; };

/* ---- version: the authoritative constant lives in the runtime export ---- */

function runtimeVersion(src) {
  const m = src.match(/\bversion\s*:\s*'([0-9]+\.[0-9]+\.[0-9]+(?:-[A-Za-z0-9.]+)?)'/);
  if (!m) throw new Error('cannot find the version constant in js/nac.js');
  return m[1];
}

/* ---- sri ---- */

function sri(buf) {
  return 'sha384-' + createHash('sha384').update(buf).digest('base64');
}

/* ---- line-ending guard (audit finding N-22) ----

   An SRI hash covers bytes, and CRLF is not the same byte sequence as LF.
   This repo is developed on Windows (core.autocrlf=true) and deployed from
   a Linux checkout, so a CRLF working tree produces a hash that no browser
   will ever match against the LF bytes the server sends. That failure is
   silent locally (a dev server serves the same file it hashed) and fatal in
   production (the browser refuses the script and the page dies).
   .gitattributes pins eol=lf so this cannot happen; this guard proves it. */

function hasCRLF(buf) {
  for (let i = 0; i + 1 < buf.length; i++) {
    if (buf[i] === 0x0d && buf[i + 1] === 0x0a) return true;
  }
  return false;
}

function assertLf(buf, path) {
  if (hasCRLF(buf)) {
    fail(`${path} has CRLF line endings in this working tree.\n` +
         '      The deploy checkout is LF, so this hash would not match what\n' +
         '      visitors receive and the browser would refuse the script.\n' +
         '      Fix: git rm -r --cached . && git reset --hard   (see .gitattributes)');
    return false;
  }
  return true;
}

/* ---- main ---- */

function main() {
  const nacSrc = read('js/nac.js').toString('utf8');
  const version = runtimeVersion(nacSrc);
  const immutablePath = `js/${version}/nac.js`;
  const nacBytes = read('js/nac.js');
  const nacIsLf = assertLf(nacBytes, 'js/nac.js');

  console.log(`version           ${version}`);
  console.log(`immutable path    ${immutablePath}`);

  /* 1. the immutable copy must exist and match the source.
        A mismatch means the runtime was edited without a version bump,
        which would silently break every adopter who pinned the path. */
  if (existsSync(abs(immutablePath))) {
    const frozen = read(immutablePath);
    if (!frozen.equals(nacBytes)) {
      if ((FORCE || WRITE) && nacIsLf) {
        writeFileSync(abs(immutablePath), nacBytes);
        console.log(`WRITE ${immutablePath} (refreshed, ${nacBytes.length} bytes)`);
      } else if (nacIsLf) {
        fail(`${immutablePath} differs from js/nac.js -- bump the version, or rerun with --write if this version was never released`);
      }
    } else {
      console.log(`OK    ${immutablePath} matches js/nac.js (${nacBytes.length} bytes)`);
    }
  } else {
    if (WRITE && nacIsLf) {
      mkdirSync(dirname(abs(immutablePath)), { recursive: true });
      writeFileSync(abs(immutablePath), nacBytes);
      console.log(`WRITE ${immutablePath} (created, ${nacBytes.length} bytes)`);
    } else if (nacIsLf) {
      fail(`${immutablePath} does not exist -- run with --write to freeze this version`);
    }
  }

  /* 2. hashes */
  const files = ASSETS.map((asset) => {
    const buf = read(asset);
    assertLf(buf, asset);
    return { path: asset, bytes: buf.length, sha384: sri(buf) };
  });
  for (const f of files) {
    console.log(`hash  ${f.sha384}  ${f.path} (${f.bytes} bytes)`);
  }

  /* 3. the landing must carry the current hash on every script tag it
        loads. This is the check that fails the build on drift. Tags are
        parsed whole (they may span lines); the line number is reported
        so the fix is obvious.

        With --write this script also REPLACES a stale hash in index.html,
        so the hash has exactly one producer and no human retypes it. */
  const indexPath = abs('index.html');
  const original = readFileSync(indexPath, 'utf8');
  let text = original;
  if (WRITE) {
    text = original.replace(/<script\b[^>]*>/g, (tag) => {
      const src = tag.match(/\bsrc="([^"]+?\.js)(?:\?[^"]*)?"/);
      if (!src) return tag;
      const base = src[1].replace(/\\/g, '/').split('/').pop();
      const rec = files.find((f) => f.path.split('/').pop() === base);
      if (!rec) return tag;
      if (/\bintegrity="sha384-[^"]*"/.test(tag)) {
        return tag.replace(/\bintegrity="sha384-[^"]*"/, `integrity="${rec.sha384}"`);
      }
      return tag.replace(/\s*>$/, ` integrity="${rec.sha384}">`);
    });
    if (text !== original) {
      writeFileSync(indexPath, text);
      console.log('WRITE index.html (integrity hashes refreshed)');
    }
  }
  const lineAt = (idx) => text.slice(0, idx).split('\n').length;
  let checked = 0;
  for (const tag of text.matchAll(/<script\b[^>]*>/g)) {
    const src = tag[0].match(/\bsrc="([^"]+?\.js)(?:\?[^"]*)?"/);
    if (!src) continue;
    const name = src[1].replace(/\\/g, '/');
    const base = name.split('/').pop();
    const rec = files.find((f) => f.path.split('/').pop() === base);
    if (!rec) continue;
    checked++;
    const at = lineAt(tag.index);
    const got = tag[0].match(/\bintegrity="(sha384-[^"]+)"/);
    if (!got) {
      fail(`index.html:${at} <script src="${name}"> has no integrity attribute`);
    } else if (got[1] !== rec.sha384) {
      fail(`index.html:${at} integrity is stale for ${name}\n      in page  ${got[1]}\n      on disk  ${rec.sha384}`);
    } else {
      console.log(`OK    index.html:${at} integrity matches ${name}`);
    }
  }
  if (checked === 0) fail('index.html references none of the tracked assets -- did the script tags move?');

  /* 4. the copy-paste snippet must use the immutable path, not the
        moving alias. js/nac.js stays published as "newest build". */
  const snippetImmutable = text.includes('js/' + version + '/nac.js');
  if (!snippetImmutable) {
    fail(`index.html never shows the immutable path js/${version}/nac.js to adopters`);
  } else {
    console.log(`OK    index.html shows the immutable path to adopters`);
  }

  /* 5. receipt */
  if (WRITE && nacIsLf) {
    const receipt = {
      generated_by: 'scripts/build-integrity.mjs',
      version,
      immutable_path: immutablePath,
      mutable_alias: 'js/nac.js',
      files,
    };
    writeFileSync(abs('js/integrity.json'), JSON.stringify(receipt, null, 2) + '\n');
    console.log('WRITE js/integrity.json');
  }

  if (process.exitCode) {
    console.error('\nIntegrity gate FAILED. Nothing should be deployed.');
  } else {
    console.log('\nIntegrity gate PASSED.');
  }
}

main();
