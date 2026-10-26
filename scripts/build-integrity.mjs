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
import { execFileSync } from 'node:child_process';
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

/* Did this path already go out to the web? The deploy mirrors the
   committed tree, so "present at HEAD" is the honest proxy for
   "an adopter may already have pinned these bytes". Used to tell a
   never-released version (safe to refreeze) from a published one
   (never, because the hash the landing page promises is public).
   Returns false outside a git checkout, which is the conservative
   answer only because the caller then needs --force anyway. */
function publishedAtHead(path) {
  try {
    execFileSync('git', ['cat-file', '-e', 'HEAD:' + path], {
      cwd: ROOT, stdio: ['ignore', 'ignore', 'ignore'],
    });
    return true;
  } catch {
    return false;
  }
}

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
      /* --write alone used to refresh this copy, which made the only
         protection on a PUBLISHED frozen path a human remembering to
         bump first. The contract API gate already drew the line in the
         right place -- an entry in the published chain is immutable,
         --force is only for a version that never shipped -- and this
         freezer has to draw the same one, because it is the producer
         of the hash the landing page promises in public. */
      const alreadyOut = publishedAtHead(immutablePath);
      if (nacIsLf && FORCE) {
        writeFileSync(abs(immutablePath), nacBytes);
        console.log(`WRITE ${immutablePath} (refreshed under --force, ${nacBytes.length} bytes)`);
        if (alreadyOut) {
          console.log(`WARN  ${immutablePath} was already published at HEAD.`);
          console.log(`      Anyone who pinned it with the old sha384 now gets different bytes`);
          console.log(`      and their browser refuses the script. You asserted this is safe.`);
        }
      } else if (nacIsLf && WRITE && !alreadyOut) {
        writeFileSync(abs(immutablePath), nacBytes);
        console.log(`WRITE ${immutablePath} (refreshed, ${nacBytes.length} bytes)`);
      } else if (nacIsLf && WRITE && alreadyOut) {
        fail(`${immutablePath} is already published at HEAD and js/nac.js no longer matches it.`);
        console.error('      An immutable path is a promise: the landing page publishes its sha384,');
        console.error('      so rewriting these bytes breaks every adopter who pinned them.');
        console.error(`      Fix: bump the version constant in js/nac.js, then rerun --write.`);
        console.error('      --force overrides this, and only makes sense if you are certain this');
        console.error('      version never reached the web.');
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

  /* 1b. fail closed before touching anything downstream.
         Without this, a refused freeze still fell through to step 3,
         which rewrote index.html with the sha384 of the NEW bytes
         while the frozen path on disk still held the OLD ones. The
         exit code was 1, so the deploy was blocked -- but the tree
         was left declaring a hash that matched nothing at that path,
         which is a worse state than the one we refused to create.
         A gate that half-applies is not a gate. */
  if (process.exitCode) {
    console.error('');
    console.error('Integrity gate FAILED at the freeze step. Nothing downstream was written:');
    console.error('index.html and js/integrity.json are untouched, so the tree still agrees');
    console.error('with itself. Resolve the message above and rerun.');
    return;
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
    let repinned = 0;
    text = original.replace(/<script\b[^>]*>/g, (tag) => {
      const src = tag.match(/\bsrc="([^"]+?\.js)(?:\?[^"]*)?"/);
      if (!src) return tag;
      const base = src[1].replace(/\\/g, '/').split('/').pop();
      const rec = files.find((f) => f.path.split('/').pop() === base);
      if (!rec) return tag;
      let out = tag;
      /* Re-pin the runtime tag onto the CURRENT immutable path. Before
         this, a version bump froze js/<new>/nac.js and then left the
         tag pointing at the previous version's path, so the gate
         failed and a human had to retype the path in index.html --
         the same hand-written-version disease the whole lock exists
         to kill (audit N-17). The hash and the path it belongs to now
         have one producer each, and it is this script. */
      if (rec.path === 'js/nac.js' && src[1] !== immutablePath) {
        out = out.replace(/\bsrc="[^"]+"/, `src="${immutablePath}"`);
        repinned += 1;
      }
      if (/\bintegrity="sha384-[^"]*"/.test(out)) {
        out = out.replace(/\bintegrity="sha384-[^"]*"/, `integrity="${rec.sha384}"`);
      } else {
        out = out.replace(/\s*>$/, ` integrity="${rec.sha384}">`);
      }
      return out;
    });
    /* The adopter-facing copy-paste snippet carries an integrity hash
       too, and it is HTML-ESCAPED -- `&lt;script src=...` -- so it is
       not a <script> tag and the pass above never saw it. That is how
       audit N-40 happened: dcb71ea refreshed every real tag when the
       hash moved from CRLF bytes to LF bytes and left the snippet
       advertising the CRLF hash, which matches no file that has ever
       been published. An adopter who copied it got a browser that
       refused to execute the runtime.

       A hash is a derived value, so it gets a producer here rather
       than a reminder to retype it -- the N-17 rule. The PATH in the
       surrounding prose stays hand-written on purpose: that one is
       the signal that somebody read the documentation after a bump,
       and the gate below refuses it when it is stale. */
    const runtimeRec = files.find((f) => f.path === 'js/nac.js');
    const SNIPPET_RX = /(&lt;script src=<span class="string">"[^"]*\/nac\.js"<\/span>\s*\n\s*integrity=<span class="string">")sha384-[A-Za-z0-9+/=]+(")/;
    if (runtimeRec) {
      if (!SNIPPET_RX.test(text)) {
        fail('cannot find the adopter copy-paste snippet in index.html to re-pin its hash.\n' +
             '      The markup this script anchors on changed. Fix the anchor instead of\n' +
             '      letting the snippet keep a hash nobody rewrites (audit N-40).');
      } else {
        const repinnedSnippet = text.replace(SNIPPET_RX, (_m, head, tail) => head + runtimeRec.sha384 + tail);
        if (repinnedSnippet !== text) {
          text = repinnedSnippet;
          console.log('      adopter snippet re-pinned to ' + runtimeRec.sha384);
        }
      }
    }
    if (text !== original) {
      writeFileSync(indexPath, text);
      console.log('WRITE index.html (integrity hashes refreshed' +
                  (repinned ? `, runtime re-pinned to ${immutablePath}` : '') + ')');
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

  /* 4. the page must LOAD the runtime from the immutable path, not
        just mention it. js/nac.js stays published as "newest build".

        This used to be text.includes(immutablePath), which the prose
        two sections above satisfies on its own ("js/<v>/nac.js is
        immutable -- pin it in production"). So the tag could revert to
        the moving alias js/nac.js?v=... and the gate still said OK --
        which is audit N-03 verbatim, inside the lock built to close
        it. Documentation is not a load path: assert the tag. */
  const runtimeTags = [...text.matchAll(/<script\b[^>]*>/g)]
    .map((t) => ({ tag: t[0], at: lineAt(t.index), src: (t[0].match(/\bsrc="([^"]+?\.js)(?:\?[^"]*)?"/) || [])[1] }))
    .filter((t) => t.src && t.src.replace(/\\/g, '/').split('/').pop() === 'nac.js');
  if (runtimeTags.length === 0) {
    fail('index.html does not load the runtime at all -- did the script tag move?');
  } else {
    const mutable = runtimeTags.filter((t) => t.src !== immutablePath);
    if (mutable.length) {
      for (const t of mutable) {
        fail(`index.html:${t.at} loads the runtime from "${t.src}", a mutable path.\n` +
             `      Production must load the immutable ${immutablePath}, whose bytes\n` +
             '      can never change. Fix: rerun with --write (it re-pins the tag).');
      }
    } else {
      console.log(`OK    index.html loads the runtime from ${immutablePath} (${runtimeTags.length} tag` +
                  (runtimeTags.length === 1 ? ')' : 's)'));
    }
  }
  /* The adopter-facing copy-paste snippet is a separate promise: it is
     prose, and it must show the same path the page itself uses.

     Measured OUTSIDE the script tags on purpose. --write re-pins the
     tag, so asking "does the immutable path appear in index.html"
     after that is a question the gate just made true by itself -- it
     would pass on a version bump that never touched the documentation,
     which is the stale snippet it exists to catch. */
  const prose = text.replace(/<script\b[^>]*>/g, '');
  if (!prose.includes('js/' + version + '/nac.js')) {
    fail(`index.html never shows the immutable path js/${version}/nac.js to adopters`);
  } else {
    console.log(`OK    index.html shows the immutable path to adopters`);
  }

  /* EVERY sha384 the page prints must be one this project publishes --
     inside a script tag or in prose, it makes no difference to the
     reader who copies it (audit N-40).

     The checks above compare the hash on each <script> tag. Nothing
     compared the one in the escaped copy-paste snippet, so for two
     days the landing page of the protocol advertised an integrity
     value computed over Windows CRLF bytes: 344665 bytes on the
     server, 352798 in the hash. The browser's only report of that is
     a console line, so it failed quietly -- in the one direction this
     project claims never to fail. The paragraph right under the
     snippet tells the reader to recompute the hash and not take it on
     faith, which is the check that would have caught it.

     Phrased over the whole page on purpose: an unpublished hash is
     the same defect wherever it is printed, and this way the lock
     does not have to know which decorations the markup uses. */
  const published = new Set(files.map((f) => f.sha384));
  let hashesSeen = 0;
  for (const m of text.matchAll(/sha384-[A-Za-z0-9+/=]{20,}/g)) {
    hashesSeen += 1;
    if (published.has(m[0])) continue;
    fail(`index.html:${lineAt(m.index)} advertises a sha384 that matches no published file\n` +
         `      in page  ${m[0]}\n` +
         '      on disk  ' + [...published].join('\n               ') + '\n' +
         '      A reader who copies this gets a browser that refuses the file.\n' +
         '      Fix: rerun with --write (it re-pins every hash, snippet included).');
  }
  if (hashesSeen === 0) {
    fail('index.html prints no sha384 at all -- the integrity attributes vanished');
  } else if (!process.exitCode) {
    console.log(`OK    all ${hashesSeen} sha384 values on the page are published hashes`);
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
