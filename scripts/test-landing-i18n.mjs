#!/usr/bin/env node
/* Guard for the landing catalogues (i18n/<lang>.json).
 *
 * Why it exists: writing ten catalogues by hand is exactly the kind of work
 * where a mistake is invisible. The first draft of the Portuguese file shipped
 * two Chinese characters in the middle of a sentence, and nothing would have
 * caught it before a reader did. So the check runs before the catalogues grow.
 *
 * What it refuses:
 *   - a catalogue whose key set differs from English (the source)
 *   - an empty value
 *   - a declared language that does not match the filename
 *   - a catalogue claiming _status: complete while a value is still the
 *     English string, for keys that are not proper nouns
 *   - markup drift: a value whose HTML tags differ from the English one, so a
 *     translation cannot silently drop a <code> or a <strong>
 *   - stray scripts: CJK, Arabic or Devanagari characters inside a
 *     Latin-script catalogue, which is how copy-paste accidents look
 *   - a key used by index.html that some catalogue does not carry
 *
 * Run: node scripts/test-landing-i18n.mjs
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIR = join(ROOT, 'i18n');

const LATIN = ['es', 'pt', 'fr', 'de', 'it'];
const CJK = /[぀-ヿ㐀-䶿一-鿿]/;
const ARABIC = /[؀-ۿ]/;
const DEVANAGARI = /[ऀ-ॿ]/;

/* The kanji in this one is deliberate: it is the name of the method, written
   the way the method writes it, and it is the same in every language. */
const KANJI_ALLOWED = new Set(['ura.h2']);

/* Values that are legitimately identical to English in any language. */
const PROPER_NOUNS = new Set([
  'ad.a1.h', 'bd.g3.d', 'foot.forge', 'foot.gh', 'foot.ura', 'gov.c2.a',
  'gov.c3.a', 'hero.cta4', 'hero.eyebrow', 'nav.demos', 'pay.p.cta',
  'nav.chat', 'nav.tour', 'ev.receipt', 'foot.api', 'foot.spec', 'nav.spec'
]);

let failures = 0;
const fail = (m) => { console.error('FAIL  ' + m); failures++; };
const ok = (m) => console.log('OK    ' + m);

const tags = (s) => (String(s).match(/<\/?[a-z]+[^>]*>/g) || []).map((t) => t.replace(/\s.*?>/, '>')).sort().join('');

if (!existsSync(join(DIR, 'en.json'))) {
  console.error('FAIL  i18n/en.json is missing: there is no source to compare against.');
  process.exit(1);
}
const en = JSON.parse(readFileSync(join(DIR, 'en.json'), 'utf8'));
const enKeys = Object.keys(en).filter((k) => !k.startsWith('_')).sort();
ok('en.json is the source: ' + enKeys.length + ' keys');

const files = readdirSync(DIR).filter((f) => /^[a-z]{2}\.json$/.test(f)).sort();
if (files.length < 2) fail('only ' + files.length + ' catalogue(s) found; expected at least English and one translation');

for (const file of files) {
  const code = file.replace('.json', '');
  let dict;
  try { dict = JSON.parse(readFileSync(join(DIR, file), 'utf8')); }
  catch (e) { fail(file + ' is not valid JSON: ' + e.message); continue; }

  if (dict._lang !== code) fail(file + ' declares _lang "' + dict._lang + '" but the filename says "' + code + '"');
  if (dict._status !== 'complete' && dict._status !== 'draft') {
    fail(file + ' has no usable _status; the switcher only serves "complete"');
  }

  const keys = Object.keys(dict).filter((k) => !k.startsWith('_')).sort();
  const missing = enKeys.filter((k) => !(k in dict));
  const extra = keys.filter((k) => !(k in en));
  if (missing.length) fail(file + ' is missing ' + missing.length + ' key(s): ' + missing.slice(0, 6).join(', '));
  if (extra.length) fail(file + ' has ' + extra.length + ' key(s) English does not: ' + extra.slice(0, 6).join(', '));

  const empty = keys.filter((k) => !String(dict[k]).trim());
  if (empty.length) fail(file + ' has empty value(s): ' + empty.join(', '));

  const drift = keys.filter((k) => k in en && tags(dict[k]) !== tags(en[k]));
  if (drift.length) fail(file + ' markup differs from English in: ' + drift.slice(0, 6).join(', '));

  /* A value identical to English is usually an untranslated string and
     sometimes a real cognate ("Adoption" in French). The difference cannot be
     guessed, so the catalogue declares it: _same_as_english lists the keys the
     translator checked and kept. An undeclared match is a failure, and a
     declaration that is no longer true is also a failure, so the list cannot
     rot into a blanket excuse. */
  if (code !== 'en' && dict._status === 'complete') {
    const declared = new Set(Array.isArray(dict._same_as_english) ? dict._same_as_english : []);
    /* identical: every key whose value equals English, proper nouns included.
       needsDeclaring: the subset a translator actually has to vouch for.
       The stale check runs against `identical`, not against `needsDeclaring`,
       or declaring a proper noun would read as a stale declaration -- which is
       the bug this comment exists to stop coming back. */
    const identical = keys.filter((k) => k in en && dict[k] === en[k]);
    const needsDeclaring = identical.filter((k) => !PROPER_NOUNS.has(k));
    const undeclared = needsDeclaring.filter((k) => !declared.has(k));
    if (undeclared.length) {
      fail(file + ' claims complete but ' + undeclared.length + ' value(s) are still the English string and not declared in _same_as_english: ' + undeclared.slice(0, 6).join(', '));
    }
    const stale = [...declared].filter((k) => !identical.includes(k));
    if (stale.length) fail(file + ' declares _same_as_english for key(s) that no longer match English: ' + stale.join(', '));
  }

  if (LATIN.includes(code)) {
    const strays = keys.filter((k) => {
      const v = String(dict[k]);
      if (KANJI_ALLOWED.has(k)) return ARABIC.test(v) || DEVANAGARI.test(v);
      return CJK.test(v) || ARABIC.test(v) || DEVANAGARI.test(v);
    });
    if (strays.length) fail(file + ' is a Latin-script catalogue with foreign characters in: ' + strays.join(', '));
  }

  if (!missing.length && !extra.length && !empty.length && !drift.length) {
    ok(file + ' ' + keys.length + ' keys, parity with English, markup intact [' + dict._status + ']');
  }
}

/* Every key the page asks for has to exist in every complete catalogue. */
const html = readFileSync(join(ROOT, 'index.html'), 'utf8');
const used = new Set();
for (const m of html.matchAll(/data-i18n(?:-html)?="([^"]+)"/g)) used.add(m[1]);
for (const m of html.matchAll(/data-i18n-attr="([^"]+)"/g)) {
  for (const pair of m[1].split(';')) {
    const bits = pair.split(':');
    if (bits.length > 1) used.add(bits.slice(1).join(':').trim());
  }
}
const unknown = [...used].filter((k) => !(k in en));
if (unknown.length) fail('index.html asks for key(s) no catalogue defines: ' + unknown.join(', '));
else ok('index.html uses ' + used.size + ' keys, all of them defined');

const unused = enKeys.filter((k) => !used.has(k));
if (unused.length) console.log('note  ' + unused.length + ' key(s) defined and not used by index.html: ' + unused.slice(0, 6).join(', '));

console.log('');
if (failures) {
  console.error('Landing i18n guard FAILED with ' + failures + ' problem(s).');
  process.exit(1);
}
console.log('Landing i18n guard passed: ' + files.length + ' catalogue(s).');
