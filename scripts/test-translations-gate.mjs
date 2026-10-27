#!/usr/bin/env node
/* =====================================================================
   test-translations-gate.mjs -- behaviour tests for
   scripts/build-translation-banners.mjs.

   WHY. Every lock in this repository that shipped without its own tests
   turned out to have defects nobody could see, and three of them were
   found by writing exactly this file for a different gate. So the
   producer of the translation banners gets its red cases before it is
   trusted: each case plants ONE real defect in a throwaway copy of the
   tree and asserts the gate REFUSES it, by name.

   WHAT THIS FILE CANNOT PROVE, stated here so nobody reads it as more
   than it is: this gate reads bytes. A banner wrapped in an HTML
   comment, or styled display:none, would satisfy it and would be
   invisible to a reader -- that is the exact trap the limits section
   fell into. Proving a reader SEES the banner needs a browser, and
   that is e2e/translations-check.mjs. The two together are the claim;
   this one alone is not.

   Usage:  node scripts/test-translations-gate.mjs
   Exit:   0 all cases behaved, 1 any case did not
   ===================================================================== */

import { cpSync, mkdtempSync, readFileSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const LOCALES = ['es', 'pt', 'fr', 'it', 'de', 'ja', 'zh', 'hi', 'ar'];

let passed = 0;
const failures = [];

function sandbox() {
  const dir = mkdtempSync(join(tmpdir(), 'nac3-tr-'));
  cpSync(join(ROOT, 'SPEC.md'), join(dir, 'SPEC.md'));
  cpSync(join(ROOT, 'index.html'), join(dir, 'index.html'));
  cpSync(join(ROOT, 'i18n'), join(dir, 'i18n'), { recursive: true });
  cpSync(join(ROOT, 'scripts', 'build-translation-banners.mjs'),
    join(dir, 'scripts', 'build-translation-banners.mjs'), { recursive: true });
  /* The banner producer gained an import (scripts/lib/spec-units.mjs)
     when D-05 gave the translation BODY its own producer, and this
     scratch tree stopped being a runnable copy: every case here
     crashed with ERR_MODULE_NOT_FOUND instead of failing, and a crash
     hides the cases behind it. The store is copied too, because the
     coverage the banner states is now measured from it. */
  cpSync(join(ROOT, 'scripts', 'lib'), join(dir, 'scripts', 'lib'), { recursive: true });
  for (const loc of ['es', 'pt', 'fr', 'it', 'de', 'ja', 'zh', 'hi', 'ar']) {
    const store = join(ROOT, 'i18n', loc, 'SPEC.units.md');
    if (existsSync(store)) cpSync(store, join(dir, 'i18n', loc, 'SPEC.units.md'));
  }
  return dir;
}

function run(dir) {
  const r = spawnSync(process.execPath, [join(dir, 'scripts', 'build-translation-banners.mjs')],
    { encoding: 'utf8' });
  return { code: r.status, out: (r.stdout || '') + (r.stderr || '') };
}

function patch(dir, rel, fn) {
  const p = join(dir, rel);
  writeFileSync(p, fn(readFileSync(p, 'utf8')), 'utf8');
}

/* A case either expects the gate to accept the tree (green) or to
   refuse it AND to say why in words that name the defect (red). A red
   case that fails for the wrong reason is not a passing red case. */
function testCase(label, expect, mutate, expectText) {
  const dir = sandbox();
  try {
    if (mutate) mutate(dir);
    const { code, out } = run(dir);
    const isGreen = code === 0;
    let ok = expect === 'green' ? isGreen : !isGreen;
    let why = '';
    if (!ok) {
      why = expect === 'green'
        ? 'expected the gate to pass, it refused: ' + out.split('\n').filter((l) => l.startsWith('DRIFT')).slice(0, 2).join(' | ')
        : 'expected the gate to refuse, it passed';
    } else if (expect === 'red' && expectText && !new RegExp(expectText, 'i').test(out)) {
      ok = false;
      why = 'it refused, but never said why in the expected terms (/' + expectText + '/). Said: '
        + out.split('\n').filter((l) => l.startsWith('DRIFT')).slice(0, 2).join(' | ');
    }
    console.log((ok ? (expect === 'green' ? 'GREEN-OK  ' : 'RED-OK    ') : 'BROKEN    ') + label
      + (ok ? '' : ' -- ' + why));
    if (ok) passed += 1; else failures.push(label + ': ' + why);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

console.log('translation banner gate -- ' + LOCALES.length + ' published locales');
console.log('');

/* ---- the tree as committed ---- */
testCase('the committed tree passes', 'green', null);

/* ---- the banner itself ---- */
testCase('a translation with no visible banner is refused', 'red',
  (d) => patch(d, 'i18n/es/SPEC.md',
    (s) => s.replace(/<!-- translation-banner[\s\S]*?<!-- \/translation-banner -->\n/, '')),
  'no visible banner');

testCase('a banner whose prose was edited by hand is refused', 'red',
  (d) => patch(d, 'i18n/it/SPEC.md', (s) => s.replace('non normativa', 'normativa')),
  'drifted');

testCase('a banner that moved to a different file is not counted for this one', 'red',
  (d) => {
    patch(d, 'i18n/de/SPEC.md',
      (s) => s.replace(/<!-- translation-banner[\s\S]*?<!-- \/translation-banner -->\n/, ''));
  },
  'de');

/* ---- the numbers ---- */
/* This case used to patch the literal string 'translation_sections: 34'
   -- the May number. When D-05 took the nine to 83 of 83 the patch
   stopped matching, so it provoked nothing and the case passed for the
   wrong reason: a red case that cannot go red is worse than no case.
   It is anchored on the KEY now, never on the value. */
testCase('a count that overstates what the translation covers is refused', 'red',
  (d) => patch(d, 'i18n/fr/SPEC.md',
    (s) => s.replace(/translation_sections: \d+/, 'translation_sections: 999')),
  'translation_sections declares 999');

/* The same lie from the other side: the page keeps claiming full
   coverage while the STORE it is measured against lost a unit. Since
   D-05 the coverage is measured from the store, so this is the shape
   the lie takes now. */
testCase('a page that claims coverage its store no longer supports is refused', 'red',
  (d) => patch(d, 'i18n/fr/SPEC.units.md',
    (s) => s.replace(/^<!-- u [0-9a-f]{12} \|/m, '<!-- u ffffffffffff |')),
  'translation_units declares');

testCase('a stale canonical total is refused', 'red',
  (d) => patch(d, 'i18n/zh/SPEC.md',
    (s) => s.replace(/translation_sections_canonical: \d+/, 'translation_sections_canonical: 34')),
  'translation_sections_canonical');

testCase('a canonical SPEC that grew leaves every banner stale, and that is refused', 'red',
  (d) => patch(d, 'SPEC.md', (s) => s + '\n## 19. A section added after the translations\n\nBody.\n'),
  'translation_sections_canonical');

/* ---- the claim about normativity ---- */
testCase('a translation that declares itself normative is refused', 'red',
  (d) => patch(d, 'i18n/pt/SPEC.md', (s) => s.replace('translation_normative: false', 'translation_normative: true')),
  'translation_normative declares true');

testCase('a missing frontmatter key is refused, not defaulted', 'red',
  (d) => patch(d, 'i18n/ja/SPEC.md', (s) => s.replace(/translation_canonical_url: .*\n/, '')),
  'declares no translation_canonical_url');

/* ---- the published page ---- */
testCase('a translated page declaring lang="en" is refused', 'red',
  (d) => patch(d, 'i18n/hi/SPEC.html', (s) => s.replace('<html lang="hi">', '<html lang="en">')),
  'wrong voice');

testCase('right-to-left prose with no dir="rtl" is refused', 'red',
  (d) => patch(d, 'i18n/ar/SPEC.html', (s) => s.replace('<html lang="ar" dir="rtl">', '<html lang="ar">')),
  'dir="rtl"');

testCase('a banner painted but not declared in the manifest is refused', 'red',
  (d) => patch(d, 'i18n/es/SPEC.html',
    (s) => s.replace(/ {6}\{ id: "spec\.translation_notice", role: "region",[\s\S]*?id: "spec\.translation_notice\.canonical"[\s\S]*?\} \},\n/, '')),
  'not declared in the manifest');

testCase('a toolbar badge that hides that the page is a translation is refused', 'red',
  (d) => patch(d, 'i18n/it/SPEC.html',
    (s) => s.replace(/<span class="badge">NAC3 v[^<]*<\/span>/, '<span class="badge">NAC3 v2.5</span>')),
  'badge');

testCase('a deleted translation is refused, not silently skipped', 'red',
  (d) => rmSync(join(d, 'i18n', 'zh', 'SPEC.md')),
  'missing from the tree');

testCase('a deleted translated page is refused', 'red',
  (d) => rmSync(join(d, 'i18n', 'fr', 'SPEC.html')),
  'missing from the tree');

/* ---- the landing, which is the other half of option C ---- */
testCase('a landing that stopped linking one locale is refused', 'red',
  (d) => patch(d, 'index.html', (s) => s.replace(/<a href="i18n\/ja\/SPEC\.html"[\s\S]*?<\/a>/, '')),
  'does not link 1 of the 9');

testCase('a landing rewrite that dropped every link is refused', 'red',
  (d) => patch(d, 'index.html', (s) => s.replace(/i18n\/[a-z]{2}\/SPEC\.html/g, 'SPEC.html')),
  'does not link 9 of the 9');

testCase('a locale linked with no data-nac-id is refused', 'red',
  (d) => patch(d, 'index.html', (s) => s.replace('nac_landing.translations.de', 'nac_landing.translations.deXX')),
  'no data-nac-id');

/* The mutation is case-INSENSITIVE on purpose. It used to be /g, and the
   consolidated landing writes the claim twice -- once mid-sentence and once as
   a heading, "Non-normative machine translations". So the case-sensitive
   mutation left the capitalised one standing, the gate's case-insensitive test
   still found it, and this case reported RED-OK over a page that still said
   the thing it was supposed to have stopped saying. A mutation that does not
   fully remove the claim proves nothing about the gate. */
testCase('a landing that links them without calling them non-normative is refused', 'red',
  (d) => patch(d, 'index.html', (s) => s.replace(/non-normative/gi, 'partial')),
  'non-normative');

testCase('a missing landing page is refused, not treated as zero locales', 'red',
  (d) => rmSync(join(d, 'index.html')),
  'landing page is missing');

/* ---- what the NORMATIVE text claims about the nine (PND-061) ----
       SPEC 4.3.2 is prose, so nothing measured it: on 2026-10-27 the
       section called the nine "partial" hours after a pass had taken
       them to 83 of 83, and the producer printed a no-veto clause
       citing a section that did not yet contain it. Each case below
       plants one of those two shapes back.
       Every edit here ALSO invalidates the source hash in the nine
       frontmatters, so the gate would refuse the tree anyway -- which
       is why each case asserts the refusal in the terms of THIS check.
       A red case that would still pass with the check deleted proves
       nothing, and this suite has already shipped two of those. */
const H432 = '#### 4.3.2 Normative language of this specification';

/* Real line breaks, never an escape: the only thing these blocks do is
   plant text, and a mangled escape is how a mutation stops provoking. */
const PARTIAL_PARA = `

Each one is partial and frozen at the revision its banner declares.
`;

const EXTRA_SECTION = `

## 15. A section the nine do not have

Body.
`;

testCase('a normative text that calls the nine partial while all nine are whole is refused', 'red',
  (d) => patch(d, 'SPEC.md', (s) => s.replace(H432, H432 + PARTIAL_PARA)),
  'describes the nine as covering less than the English');

testCase('a normative text that dropped the no-veto rule the producer cites is refused', 'red',
  (d) => patch(d, 'SPEC.md',
    (s) => s.split('never blocks the publication').join('may delay the publication')),
  'no-veto rule is missing');

testCase('a specification that lost section 4.3.2 entirely is refused, not passed over', 'red',
  (d) => patch(d, 'SPEC.md', (s) => s.replace(H432, '#### 4.3.2b Something else')),
  'is gone');

/* The mirror: it refuses in BOTH directions, or it is a lock that only
   closes one way. The English grows a section the nine do not have, so
   they are genuinely short, and 4.3.2 stays silent about it. */
testCase('a normative text silent about coverage while the nine are short is refused', 'red',
  (d) => patch(d, 'SPEC.md', (s) => s + EXTRA_SECTION),
  'says nothing about it');

/* ---- and the one shape that must STAY legal ---- */
testCase('a translation that legitimately covers more sections stays legal', 'green',
  (d) => {
    /* The gate measures; it does not pin the number at 34. A locale
       that gains sections has to pass once its banner is regenerated. */
    patch(d, 'i18n/es/SPEC.md', (s) => s + '\n## 15. Una seccion traducida de mas\n\nCuerpo.\n');
    const r = spawnSync(process.execPath,
      [join(d, 'scripts', 'build-translation-banners.mjs'), '--write'], { encoding: 'utf8' });
    if (r.status !== 0) throw new Error('--write failed: ' + r.stdout + r.stderr);
  });

testCase('a reworded 4.3.2 that keeps the rule and claims no coverage stays legal', 'green',
  (d) => {
    /* The check is not pinned to today's sentence. Reword the prose
       around the rule, regenerate what the banners own, and the tree
       has to pass -- otherwise this is a lock on an editor, not on a
       claim. */
    patch(d, 'SPEC.md', (s) => s.split('The normative text of NAC3 is the **English** one')
      .join('The text that governs NAC3 is the **English** one'));
    const r = spawnSync(process.execPath,
      [join(d, 'scripts', 'build-translation-banners.mjs'), '--write'], { encoding: 'utf8' });
    if (r.status !== 0) throw new Error('--write failed: ' + r.stdout + r.stderr);
  });

console.log('');
/* The tally goes out on BOTH paths, like every other gate suite here.
   It used to print only on green, and a red run said just how many cases
   misbehaved -- so the run that matters most (the suite against the tree
   before the change) was the only one that did not report how it went.
   Measured consequence, not hypothetical: an evidence receipt of that red
   run parsed no counts and was recorded as weak. */
console.log(passed + ' passed, ' + failures.length + ' failed');
if (failures.length) {
  console.log('');
  console.log('RED -- ' + failures.length + ' case(s) did not behave:');
  for (const f of failures) console.log('  ' + f);
  process.exit(1);
}
