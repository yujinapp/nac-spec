#!/usr/bin/env node
/* =====================================================================
   build-spec-translations.mjs -- the PRODUCER of the nine published
   translations of the specification, and the gate over them
   (decision D-05, option B, owner 2026-10-27).

   WHY THIS EXISTS. Until today the nine i18n/<locale>/SPEC.{md,html}
   were orphans: a May 2026 pass with no producer, so they froze at 34
   of 83 sections while the English grew, and nothing in the repository
   could tell a reader how old they were. D-03 made them DECLARE what
   they are (build-translation-banners.mjs owns that). D-05 decided
   what they ARE: complete translations, regenerated per release. This
   is the half that owns the body.

   THE SHAPE OF THE THING.
     SPEC.md                      the normative English. The only
                                  document anybody edits by hand.
     i18n/<loc>/SPEC.units.md     the store: one entry per translatable
                                  unit, keyed by the sha of its English
                                  text. THE authored artifact per
                                  locale, and the only one.
     i18n/<loc>/SPEC.md           produced here (body) and by
                                  build-translation-banners.mjs
                                  (frontmatter + banner).
     i18n/<loc>/SPEC.html         produced here, through the same
                                  renderer the English page uses.

   WHY CONTENT-ADDRESSED KEYS. Because the owner's reason for doing
   this now was "then during evolution we only maintain them". When a
   release edits one paragraph of English, exactly one key disappears
   and one appears: the store reports six stale units, not a document
   to redo. That is the whole maintenance story, and it is a property
   of the key, not of a promise in a comment.

   WHAT IS FATAL AND WHAT IS NOT -- this is a decision, not a
   measurement, and D-05 made it explicitly:

     FATAL  an identity violation (a translation that renamed an id,
            dropped a URL, moved a number, lost a table row). That is
            not a stale translation, it is a wrong one, and it is the
            only real risk of publishing text the owner cannot read.
     FATAL  a hand edit: the published page says something the store
            does not. A generated artifact edited in place is how the
            May orphans happened.
     FATAL  an entry flagged untranslated that does NOT hold the
            English -- the accident of a translator who did the work
            and forgot to clear the flag, which would otherwise
            silently publish English.
     NOT    being behind the English. A stale translation NEVER blocks
            the publication of the normative English (D-05's no-veto
            rule, SPEC 4.3.2). Nine machine artifacts do not get veto
            power over a release. What they do get is a banner that
            declares the coverage, measured from this same data, so
            nobody has to trust this comment.

   Usage:  node scripts/build-spec-translations.mjs                 check
           node scripts/build-spec-translations.mjs --write          produce
           node scripts/build-spec-translations.mjs --template <loc> seed a store
           node scripts/build-spec-translations.mjs --stats          coverage only
   Exit:   0 coherent (stale is coherent), 1 a finding that is fatal
   ===================================================================== */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as U from './lib/spec-units.mjs';
import { renderTranslatedPage } from './build-spec-html.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const argv = process.argv.slice(2);
const WRITE = argv.includes('--write');
const STATS = argv.includes('--stats');
const TEMPLATE = argv.includes('--template') ? (argv[argv.indexOf('--template') + 1] || 'all') : null;
/* Tests point this at a scratch tree; nothing else does. */
const BASE = process.env.NAC3_TRANSLATIONS_ROOT
  ? path.resolve(process.env.NAC3_TRANSLATIONS_ROOT)
  : ROOT;

const specPath = path.join(BASE, 'SPEC.md');
const english = fs.readFileSync(specPath, 'utf8');
const blocks = U.splitBlocks(english);
const units = U.unitsOf(blocks);

/* Derived, never typed: the version a translation says it translates
   has to come from the document it translates. Typing it is audit
   N-17's root cause, and this file would be the 24th slot to go stale
   on a bump. */
function specVersion() {
  const m = english.match(/^\*\*Version:\*\* +([0-9]+\.[0-9]+(?:\.[0-9]+)?)/m);
  if (!m) {
    throw new Error('cannot read the version from SPEC.md -- refusing to produce a translation that declares an invented one');
  }
  return m[1];
}
const SPEC_VERSION = specVersion();

const fatal = [];
const soft = [];
const fail = (where, detail, fix) => fatal.push({ where, detail, fix });
const warn = (where, detail, fix) => soft.push({ where, detail, fix });

function storePath(loc) {
  return path.join(BASE, 'i18n', loc, 'SPEC.units.md');
}

/* The locator is for a person navigating the store, so it has to be
   unable to break the marker it lives in: a pipe would invent a field
   and a "-->" would end the comment early. */
function locatorOf(u) {
  return u.section.replace(/\s+/g, ' ').replace(/\|/g, '/').replace(/-->/g, '--').slice(0, 58);
}

/* ------------------------------------------------------------------ */
/* --template: seed or refresh a store                                 */
/* ------------------------------------------------------------------ */

/* Keeps every translation already in the store, drops the entries the
   English no longer has, and adds the new ones holding the English
   text under the untranslated flag. Running it after an English edit
   is what turns "retranslate the document" into "translate these six
   blocks". */
function writeTemplate(loc) {
  const p = storePath(loc);
  const prev = fs.existsSync(p) ? U.parseStore(fs.readFileSync(p, 'utf8')) : { header: {}, entries: new Map() };
  const items = units.map((u) => {
    const had = prev.entries.get(u.key);
    return {
      key: u.key,
      locator: locatorOf(u),
      kind: u.kind,
      text: had ? had.text : u.text,
      flags: had && !had.flags.includes(U.FLAG_UNTRANSLATED) ? [] : [U.FLAG_UNTRANSLATED],
    };
  });
  const header = {
    locale: loc,
    source: 'SPEC.md',
    source_version: SPEC_VERSION,
    pass_date: prev.header.pass_date || new Date().toISOString().slice(0, 10),
    engine: prev.header.engine || 'unset',
  };
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, U.serialiseStore(header, items), 'utf8');
  const todo = items.filter((i) => i.flags.length).length;
  console.log('  SEEDED i18n/' + loc + '/SPEC.units.md   ' + items.length + ' units, '
    + (items.length - todo) + ' kept, ' + todo + ' to translate');
}

/* ------------------------------------------------------------------ */
/* --merge: fold translated parts into a store                         */
/* ------------------------------------------------------------------ */

/* A full pass is 282 units per locale, which is more than anyone --
   person or model -- should rewrite in one file operation: a truncated
   write would lose finished work silently. So a pass may arrive in
   parts, each one a fragment in the store format, and this folds them
   in. It refuses a part that carries a key the English does not have,
   because that is either a typo in a key or a translation of a
   paragraph that no longer exists, and both are worth stopping for. */
function mergeParts(loc, files) {
  const p = storePath(loc);
  if (!fs.existsSync(p)) throw new Error('no store for ' + loc + ' -- run --template ' + loc + ' first');
  const store = U.parseStore(fs.readFileSync(p, 'utf8'));
  const known = new Set(units.map((u) => u.key));
  let merged = 0;
  const bad = [];
  for (const f of files) {
    const part = U.parseStore(fs.readFileSync(f, 'utf8'));
    for (const [k, e] of part.entries) {
      if (!known.has(k)) { bad.push(k + ' (in ' + path.basename(f) + ')'); continue; }
      if (e.flags.includes(U.FLAG_UNTRANSLATED)) continue;
      if (!e.text.trim()) { bad.push(k + ' (empty, in ' + path.basename(f) + ')'); continue; }
      store.entries.set(k, { text: e.text, flags: [] });
      merged++;
    }
  }
  if (bad.length) {
    console.log('REFUSED: ' + bad.length + ' entry/entries do not match an English unit:');
    for (const b of bad) console.log('  ' + b);
    process.exit(1);
  }
  const items = units.map((u) => {
    const had = store.entries.get(u.key);
    return {
      key: u.key,
      locator: locatorOf(u),
      kind: u.kind,
      text: had ? had.text : u.text,
      flags: had && !had.flags.includes(U.FLAG_UNTRANSLATED) ? [] : [U.FLAG_UNTRANSLATED],
    };
  });
  const header = { ...store.header, source_version: SPEC_VERSION };
  fs.writeFileSync(p, U.serialiseStore(header, items), 'utf8');
  const todo = items.filter((i) => i.flags.length).length;
  console.log('MERGED ' + merged + ' unit(s) into i18n/' + loc + '/SPEC.units.md -- '
    + (items.length - todo) + '/' + items.length + ' translated, ' + todo + ' to go');
}

/* ------------------------------------------------------------------ */
/* --parts: the work orders a translation pass is done in              */
/* ------------------------------------------------------------------ */

/* Writes the English units of a locale into N fragments under
   .translation-parts/<locale>/ (untracked). Each fragment is already
   in the store format, so translating one is "replace the text under
   each marker and drop the | en flag", and --merge folds it back. The
   division is purely mechanical: a pass can be interrupted after any
   fragment without losing the ones before it. */
function writeParts(loc, count) {
  const dir = path.join(BASE, '.translation-parts', loc);
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  const per = Math.ceil(units.length / count);
  for (let p = 0; p < count; p++) {
    const slice = units.slice(p * per, (p + 1) * per);
    if (!slice.length) break;
    const items = slice.map((u) => ({
      key: u.key, locator: locatorOf(u), kind: u.kind, text: u.text, flags: [U.FLAG_UNTRANSLATED],
    }));
    const name = 'part-' + String(p + 1).padStart(2, '0') + '.md';
    fs.writeFileSync(path.join(dir, name),
      U.serialiseStore({ locale: loc, part: (p + 1) + ' of ' + count, units: String(slice.length) }, items),
      'utf8');
    console.log('  ' + path.join('.translation-parts', loc, name) + '   ' + slice.length + ' units, '
      + slice.reduce((n, u) => n + u.text.split(/\s+/).filter(Boolean).length, 0) + ' English words');
  }
}

if (argv.includes('--parts')) {
  const i = argv.indexOf('--parts');
  const loc = argv[i + 1];
  const count = Number(argv[i + 2] || 6);
  if (!loc) throw new Error('usage: --parts <locale> [count]');
  console.log('canonical SPEC.md v' + SPEC_VERSION + ': ' + units.length + ' units into ' + count + ' parts');
  for (const l of (loc === 'all' ? U.LOCALES : loc.split(','))) writeParts(l, count);
  process.exit(0);
}

if (argv.includes('--merge')) {
  const i = argv.indexOf('--merge');
  const loc = argv[i + 1];
  const files = argv.slice(i + 2).filter((a) => !a.startsWith('--'));
  if (!loc || !files.length) throw new Error('usage: --merge <locale> <part.md> [part.md ...]');
  mergeParts(loc, files);
  process.exit(0);
}

if (TEMPLATE) {
  console.log('canonical SPEC.md: ' + units.length + ' translatable units, '
    + blocks.filter((b) => b.verbatim).length + ' verbatim blocks, v' + SPEC_VERSION);
  for (const loc of (TEMPLATE === 'all' ? U.LOCALES : TEMPLATE.split(','))) writeTemplate(loc);
  process.exit(0);
}

/* ------------------------------------------------------------------ */
/* read every store once                                               */
/* ------------------------------------------------------------------ */

const state = new Map();
for (const loc of U.LOCALES) {
  const p = storePath(loc);
  if (!fs.existsSync(p)) {
    state.set(loc, null);
    continue;
  }
  const parsed = U.parseStore(fs.readFileSync(p, 'utf8'));
  const tr = U.translated(parsed.entries);
  state.set(loc, { ...parsed, tr, cov: U.coverage(blocks, tr) });
}

if (STATS) {
  console.log('canonical SPEC.md v' + SPEC_VERSION + ': ' + units.length + ' units, '
    + U.coverage(blocks, new Map()).sectionsTotal + ' sections');
  for (const loc of U.LOCALES) {
    const s = state.get(loc);
    if (!s) { console.log('  ' + loc + '   no store'); continue; }
    console.log('  ' + loc + '   ' + s.cov.units + '/' + s.cov.unitsTotal + ' units   '
      + s.cov.sections + '/' + s.cov.sectionsTotal + ' sections   '
      + (s.cov.orphans.length ? s.cov.orphans.length + ' orphan' : 'no orphans'));
  }
  process.exit(0);
}

/* ------------------------------------------------------------------ */
/* write mode                                                          */
/* ------------------------------------------------------------------ */

/* The body is replaced; the frontmatter and the banner are left
   exactly as they are, because build-translation-banners.mjs owns
   them. Two producers, two regions, no shared bytes. */
function writeMdBody(loc, body) {
  const p = path.join(BASE, 'i18n', loc, 'SPEC.md');
  let fm = null;
  let banner = '';
  if (fs.existsSync(p)) {
    const cur = U.stripFrontmatter(fs.readFileSync(p, 'utf8'));
    fm = cur.fm;
    const m = cur.body.match(
      new RegExp(U.rx(U.MD_MARK_OPEN) + '[\\s\\S]*?' + U.rx(U.MD_MARK_CLOSE)));
    if (m) banner = m[0] + '\n\n';
  }
  const head = fm === null ? '' : '---\n' + fm + '---\n\n';
  fs.writeFileSync(p, head + banner + body, 'utf8');
  return p;
}

if (WRITE) {
  console.log('canonical SPEC.md v' + SPEC_VERSION + ': ' + units.length + ' translatable units');
  for (const loc of U.LOCALES) {
    const s = state.get(loc);
    if (!s) {
      console.log('  SKIP   i18n/' + loc + '   no store (run --template ' + loc + ')');
      continue;
    }
    const body = U.assemble(blocks, s.tr);
    writeMdBody(loc, body);
    const html = renderTranslatedPage({
      md: body,
      locale: loc,
      version: SPEC_VERSION,
      dir: loc === 'ar' ? 'rtl' : null,
    });
    fs.writeFileSync(path.join(BASE, 'i18n', loc, 'SPEC.html'), html, 'utf8');
    console.log('  WROTE  i18n/' + loc + '/SPEC.md + SPEC.html   '
      + s.cov.units + '/' + s.cov.unitsTotal + ' units translated'
      + (s.cov.stale.length ? ', ' + s.cov.stale.length + ' spliced from the English' : ''));
  }
  console.log('');
  console.log('Bodies written. Now: node scripts/build-translation-banners.mjs --write');
  process.exit(0);
}

/* ------------------------------------------------------------------ */
/* check mode                                                          */
/* ------------------------------------------------------------------ */

console.log('spec translations -- canonical SPEC.md v' + SPEC_VERSION
  + ' has ' + units.length + ' translatable units in '
  + U.coverage(blocks, new Map()).sectionsTotal + ' sections');
console.log('');

const byKey = new Map(units.map((u) => [u.key, u]));

for (const loc of U.LOCALES) {
  const s = state.get(loc);
  const before = fatal.length + soft.length;

  if (!s) {
    fail('i18n/' + loc + '/SPEC.units.md', 'no translation store, so the published page cannot be produced from anything',
      'node scripts/build-spec-translations.mjs --template ' + loc);
    continue;
  }

  /* the header says what it is a translation of */
  if (s.header.locale !== loc) {
    fail('i18n/' + loc + '/SPEC.units.md', 'the store header declares locale ' + (s.header.locale || '(none)'),
      'set locale: ' + loc + ' in the store header');
  }
  if (s.header.source !== 'SPEC.md') {
    fail('i18n/' + loc + '/SPEC.units.md', 'the store header declares source ' + (s.header.source || '(none)'),
      'set source: SPEC.md in the store header');
  }

  /* the flag tells the truth */
  for (const [k, e] of s.entries) {
    if (!e.flags.includes(U.FLAG_UNTRANSLATED)) continue;
    const en = byKey.get(k);
    if (en && e.text !== en.text) {
      fail('i18n/' + loc + '/SPEC.units.md', 'unit ' + k + ' (' + en.section
        + ') is flagged untranslated but does not hold the English text, so real work is being published as English',
        'remove the " | ' + U.FLAG_UNTRANSLATED + '" flag from that marker');
    }
  }

  /* THE IDENTITY LOCK */
  let violations = 0;
  for (const [k, text] of s.tr) {
    const en = byKey.get(k);
    if (!en) continue; /* an orphan: reported below, not locked */
    for (const f of U.compareIdentities(en.text, text)) {
      violations++;
      fail('i18n/' + loc + '/SPEC.units.md', 'unit ' + k + ' (' + en.section + ') -- ' + f.what
        + ' differ from the English: ' + f.detail,
        'restore the English ' + f.what + ' in that unit; identities are never translated');
    }
  }

  /* the published page is what the store produces */
  const mdPath = path.join(BASE, 'i18n', loc, 'SPEC.md');
  if (!fs.existsSync(mdPath)) {
    fail('i18n/' + loc + '/SPEC.md', 'the published translation is not in the tree',
      'node scripts/build-spec-translations.mjs --write');
  } else {
    const published = U.withoutBanner(U.stripFrontmatter(fs.readFileSync(mdPath, 'utf8')).body)
      .replace(/^\n+/, '');
    const expected = U.assemble(blocks, s.tr);
    if (published !== expected) {
      /* Behind the English, or edited by hand? The difference matters:
         one is allowed and declared, the other is the defect this
         whole file exists to prevent. The question is answered on the
         STORE, not on the diff -- if every block the published page
         disagrees about belongs to a unit the store does not have
         fresh, the page is simply behind. */
      const pubBlocks = U.splitBlocks(published);
      if (pubBlocks.length !== blocks.length) {
        /* The STRUCTURE moved, and only the English can do that: a
           paragraph was added or removed upstream and the page has not
           been produced since. Calling this a hand edit was this
           check's own first defect -- it accused all nine pages of
           being edited by hand the moment section 4.3.2 grew one
           paragraph and the stores had already caught up. */
        warn('i18n/' + loc + '/SPEC.md', 'the published page has ' + pubBlocks.length
          + ' blocks and the English has ' + blocks.length
          + ': the English moved and the page has not been produced since',
          'npm run build:translations');
      } else {
        let handEdited = 0;
        for (let i = 0; i < blocks.length; i++) {
          if (pubBlocks[i].text === U.assemble([blocks[i]], s.tr)) continue;
          if (!blocks[i].verbatim && !s.tr.has(blocks[i].key)) continue; /* spliced English, stale */
          handEdited++;
        }
        if (handEdited > 0) {
          fail('i18n/' + loc + '/SPEC.md', 'the published page differs from what the store produces in '
            + handEdited + ' block(s): it was edited by hand, and a hand edit is how the May orphans happened',
            'node scripts/build-spec-translations.mjs --write');
        } else if (s.cov.stale.length) {
          warn('i18n/' + loc + '/SPEC.md', 'the published page is behind the English ('
            + s.cov.stale.length + ' unit(s) still in English)',
            'npm run build:translations');
        }
      }
    }
  }

  /* behind the English: reported, never fatal (the no-veto rule) */
  if (s.cov.stale.length) {
    const sample = s.cov.stale.slice(0, 5).map((u) => u.key + ' ' + u.section).join(', ');
    warn('i18n/' + loc, s.cov.stale.length + ' of ' + s.cov.unitsTotal
      + ' units are not translated yet and are published in English: ' + sample
      + (s.cov.stale.length > 5 ? ', ...' : ''),
      'translate them in i18n/' + loc + '/SPEC.units.md, then npm run build:translations');
  }
  if (s.cov.orphans.length) {
    warn('i18n/' + loc, s.cov.orphans.length
      + ' store entry/entries no longer match any English unit (the English moved under them)',
      'node scripts/build-spec-translations.mjs --template ' + loc + ' drops them');
  }

  if (fatal.length + soft.length === before) {
    console.log('OK    i18n/' + loc + '   ' + s.cov.units + '/' + s.cov.unitsTotal
      + ' units, ' + s.cov.sections + '/' + s.cov.sectionsTotal
      + ' sections, identities match, page is what the store produces');
  } else if (!violations) {
    console.log('..    i18n/' + loc + '   ' + s.cov.units + '/' + s.cov.unitsTotal + ' units');
  }
}

console.log('');
for (const f of soft) console.log('BEHIND ' + f.where + ': ' + f.detail + '\n       fix: ' + f.fix);
for (const f of fatal) console.log('BROKEN ' + f.where + ': ' + f.detail + '\n       fix: ' + f.fix);
console.log('');

if (fatal.length) {
  console.log(fatal.length + ' fatal finding' + (fatal.length === 1 ? '' : 's')
    + '. A translation that renames an identity or was edited by hand is not stale, it is wrong.');
  process.exit(1);
}
if (soft.length) {
  console.log(soft.length + ' translation(s) behind the English. Reported, NOT fatal:'
    + ' a stale translation never blocks the publication of the normative English (SPEC 4.3.2).');
}
console.log('Spec translations are coherent: ' + U.LOCALES.length
  + ' locales produced from their store, identities intact.');
