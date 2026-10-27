#!/usr/bin/env node
/* =====================================================================
   test-spec-translations.mjs -- behaviour tests for the translation
   producer and for the identity lock (decision D-05, option B).

   WHY THIS FILE EXISTS AT ALL. The lock's whole value is that it
   REFUSES a defective translation in nine languages nobody on the team
   reads. A lock nobody watched fail is a ceremony: every one of the
   checks below has a RED case that provokes the exact defect and
   asserts the lock names it. Three defects of the lock itself were
   found this way on the first run (a list item invented by stripping
   code spans, a code span broken across lines, the 11 of `a11y`
   counted as a quantity), which is the argument for the file.

   It also carries the widest green case available: every one of the
   2538 real translated units (282 x 9) must pass the identity lock. A
   rule that holds on a hand-made fixture but not on the corpus is not
   a rule.

   Usage:  node scripts/test-spec-translations.mjs
   Exit:   0 all pass, 1 any failure (and the count is printed either
           way -- a suite that only reports when it is green hides its
           own red runs, which this repository has already paid for).
   ===================================================================== */

import fs from 'fs';
import path from 'path';
import os from 'os';
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';
import * as U from './lib/spec-units.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const PRODUCER = path.join(__dirname, 'build-spec-translations.mjs');
const ENGLISH = fs.readFileSync(path.join(ROOT, 'SPEC.md'), 'utf8');
const BLOCKS = U.splitBlocks(ENGLISH);
const UNITS = U.unitsOf(BLOCKS);

let pass = 0;
const failures = [];
function ok(name, cond, detail) {
  if (cond) { pass++; console.log('PASS  ' + name); return; }
  failures.push({ name, detail });
  console.log('FAIL  ' + name + (detail ? '  -- ' + detail : ''));
}
/* A RED case: the probe must produce at least one finding, and the
   finding must be ABOUT the thing we broke. "It failed" is not the
   assertion; "it failed for this reason" is. */
function red(name, en, tr, what) {
  const found = U.compareIdentities(en, tr);
  const hit = found.some((f) => f.what === what);
  ok(name, hit, found.length
    ? 'findings were [' + found.map((f) => f.what).join(', ') + '], expected ' + what
    : 'the lock found nothing; it would have published this');
}
function green(name, en, tr) {
  const found = U.compareIdentities(en, tr);
  ok(name, found.length === 0, found.map((f) => f.what + ': ' + f.detail).join(' | '));
}

/* ------------------------------------------------------------------ */
/* 1. the unit model                                                   */
/* ------------------------------------------------------------------ */

ok('every line of SPEC.md lands in exactly one block (round trip)',
  BLOCKS.map((b) => b.text).join('\n') === ENGLISH);

ok('the canonical spec splits into the 83 sections every other gate counts',
  U.coverage(BLOCKS, new Map()).sectionsTotal === 83,
  'got ' + U.coverage(BLOCKS, new Map()).sectionsTotal);

ok('fenced code blocks are verbatim, never units',
  BLOCKS.filter((b) => b.kind === 'code').every((b) => b.verbatim)
  && UNITS.every((u) => u.kind !== 'code'));

ok('a unit key is the sha of its English text, so an edit moves exactly one key',
  U.unitKey('hello') === U.unitKey('hello') && U.unitKey('hello') !== U.unitKey('hellp'));

/* ------------------------------------------------------------------ */
/* 2. the store format                                                 */
/* ------------------------------------------------------------------ */

{
  /* The locator of section 10.2 contains "<target>" and a backtick.
     An earlier marker regex stopped at the first ">" and silently
     swallowed four markers per store, reporting the English as a
     translation. */
  const nasty = 'CLI: `npx nac3 validate <target>` | and a pipe';
  const items = [
    { key: U.unitKey('a'), locator: nasty.replace(/\|/g, '/'), kind: 'prose', text: 'linea uno\nlinea dos', flags: [] },
    { key: U.unitKey('b'), locator: 'plain', kind: 'heading', text: '## dos', flags: ['en'] },
  ];
  const round = U.parseStore(U.serialiseStore({ locale: 'xx', pass_date: '2026-10-27' }, items));
  ok('a store survives serialise -> parse with a locator full of markup',
    round.entries.get(items[0].key) !== undefined
    && round.entries.get(items[0].key).text === 'linea uno\nlinea dos',
    JSON.stringify(round.entries.get(items[0].key)));
  ok('the header survives the round trip', round.header.pass_date === '2026-10-27');
  ok('the untranslated flag is read, and the locator is never mistaken for one',
    U.translated(round.entries).has(items[0].key)
    && !U.translated(round.entries).has(items[1].key));
}

/* ------------------------------------------------------------------ */
/* 3. the identity lock -- RED cases                                   */
/* ------------------------------------------------------------------ */

red('a renamed code span is refused',
  'Pass `__suffix` to the resolver.', 'Pasale `__sufijo` al resolvedor.', 'code spans');
red('a dropped code span is refused',
  'Call `NAC.click(id)` now.', 'Llamalo ahora.', 'code spans');
red('a rewritten link target is refused',
  'See [the rfcs](rfcs/README.md).', 'Ver [los rfcs](rfcs/LEEME.md).', 'link targets');
red('an invented URL is refused',
  'Rendered at https://yujin.app/nac-spec/SPEC.html today.',
  'Renderizado en https://yujin.app/nac-spec/SPEC-es.html hoy.', 'URLs');
red('a dropped number is refused',
  'The default timeout is 30 seconds.', 'El tiempo de espera por omision es medio minuto.', 'numbers');
red('localised digits are refused (an Arabic-Indic 30 is not a 30)',
  'The default timeout is 30 seconds.', '\u0627\u0644\u0645\u0647\u0644\u0629 \u0627\u0644\u0627\u0641\u062A\u0631\u0627\u0636\u064A\u0629 \u0663\u0660 \u062B\u0627\u0646\u064A\u0629.', 'numbers');
red('a lost table row is refused',
  '| a | b |\n|---|---|\n| `x` | uno |\n| `y` | dos |',
  '| a | b |\n|---|---|\n| `x` | one |', 'table rows');
red('a lost list item is refused',
  '- uno\n- dos\n- tres', '- one\n- two', 'list items');
red('a demoted heading is refused',
  '## 8. Conformance levels', '### 8. Niveles de conformidad', 'heading level');
red('a renumbered section is refused',
  '### 5.1.4 Action payload', '### 5.1.5 Carga de accion', 'section number');

/* ------------------------------------------------------------------ */
/* 4. the identity lock -- GREEN cases it must NOT refuse              */
/* ------------------------------------------------------------------ */

green('a plain honest translation passes',
  'Every agent-relevant DOM element carries `data-nac-role`.',
  'Todo elemento del DOM relevante para un agente lleva `data-nac-role`.');
green('a numeronym is not demanded in the prose (`a11y`, i18n, l10n)',
  '1. **`aria-label`** -- a11y-first; respected unless whitespace-only.',
  '1. **`aria-label`** -- la accesibilidad primero; se respeta salvo que sea solo espacios.');
green('a code span the English broke across lines may be unwrapped',
  'Run `npm install\n  @nac3/runtime` to start.',
  'Corre `npm install @nac3/runtime` para empezar.');
green('a "+" left at the start of a line by stripping code spans is not a list item',
  'The same `/parse` + `/tts` loop\ndrives in either case.',
  'El mismo bucle de `/parse` + `/tts`\nconduce en los dos casos.');
green('a translation may rename a heading as long as it keeps the number',
  '#### 5.4.4 Error codes', '#### 5.4.4 Codigos de error');

/* ------------------------------------------------------------------ */
/* 5. the widest green case: the real corpus, all 282 x 9              */
/* ------------------------------------------------------------------ */

{
  const byKey = new Map(UNITS.map((u) => [u.key, u]));
  let checked = 0;
  const broken = [];
  for (const loc of U.LOCALES) {
    const p = path.join(ROOT, 'i18n', loc, 'SPEC.units.md');
    if (!fs.existsSync(p)) { broken.push(loc + ': no store'); continue; }
    const tr = U.translated(U.parseStore(fs.readFileSync(p, 'utf8')).entries);
    for (const [k, text] of tr) {
      const en = byKey.get(k);
      if (!en) { broken.push(loc + '/' + k + ': orphan'); continue; }
      checked++;
      for (const f of U.compareIdentities(en.text, text)) {
        broken.push(loc + '/' + k + ' (' + en.section + ') ' + f.what);
      }
    }
  }
  ok('every published translated unit passes the lock (' + checked + ' units)',
    broken.length === 0, broken.slice(0, 6).join(' | '));
  ok('the corpus really is the nine locales at full coverage',
    checked === UNITS.length * U.LOCALES.length,
    'checked ' + checked + ', expected ' + UNITS.length * U.LOCALES.length);
}

/* ------------------------------------------------------------------ */
/* 6. the producer's policy: what is fatal and what is not             */
/* ------------------------------------------------------------------ */

function producer(dir, args = []) {
  try {
    const out = execFileSync(process.execPath, [PRODUCER, ...args],
      { env: { ...process.env, NAC3_TRANSLATIONS_ROOT: dir }, encoding: 'utf8' });
    return { code: 0, out };
  } catch (e) {
    return { code: e.status === undefined ? -1 : e.status, out: (e.stdout || '') + (e.stderr || '') };
  }
}

/* Do the nine stores exist at all? A red proof runs this suite against
   a tree that has none, and the policy cases below cannot say anything
   there. They report that as ONE named failure instead of throwing:
   copyFileSync used to throw ENOENT and the whole section vanished
   from the report. */
const HAVE_STORES = U.LOCALES.every((l) =>
  fs.existsSync(path.join(ROOT, 'i18n', l, 'SPEC.units.md')));
const PRODUCER_RUNS = producer(ROOT, ['--stats']).code === 0;
const POLICY_OK = HAVE_STORES && PRODUCER_RUNS;
ok('the producer runs and the nine stores are on disk, so its policy can be exercised',
  POLICY_OK, 'stores: ' + HAVE_STORES + ', producer runnable: ' + PRODUCER_RUNS
    + ' -- the policy cases below are UNVERIFIED, not green');

if (POLICY_OK) {
/* A scratch tree so the real published pages are never touched. */
function scratch() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nac3-tr-'));
  fs.writeFileSync(path.join(dir, 'SPEC.md'), ENGLISH, 'utf8');
  for (const loc of U.LOCALES) {
    fs.mkdirSync(path.join(dir, 'i18n', loc), { recursive: true });
    for (const f of ['SPEC.md', 'SPEC.units.md']) {
      const src = path.join(ROOT, 'i18n', loc, f);
      if (fs.existsSync(src)) fs.copyFileSync(src, path.join(dir, 'i18n', loc, f));
    }
    /* No store on disk (which is exactly what a red proof sees): seed
       one so the tree is still RUNNABLE. copyFileSync used to throw
       ENOENT here and the whole policy section vanished from the
       report -- a crash is not a test result, and it hides every case
       behind it. The cases that need real translated prose then fail
       by NAME on their own setup assertion, which is the honest
       outcome. */
    if (!fs.existsSync(path.join(dir, 'i18n', loc, 'SPEC.units.md'))) {
      producer(dir, ['--template', loc]);
    }
  }
  /* Produce once, so every case below starts from a tree that is IN
     SYNC. Without this the cases inherit whatever state the repo
     happens to be in mid-pass: the hand-edit case silently stopped
     testing a hand edit the moment the real pages were two units
     behind the English, because the block counts no longer lined up.
     A test that depends on the working tree's mood is not a test. */
  producer(dir, ['--write']);
  return dir;
}
{
  const dir = scratch();
  const r = producer(dir);
  ok('the committed tree passes the producer', r.code === 0, r.out.slice(-400));
  fs.rmSync(dir, { recursive: true, force: true });
}

{
  /* THE NO-VETO RULE (D-05): a translation behind the English reports
     loudly and exits 0. This is the one check that asserts an ALLOWED
     state, and it is the reason nine machine artifacts cannot hold a
     release hostage. */
  const dir = scratch();
  const p = path.join(dir, 'i18n', 'es', 'SPEC.units.md');
  const store = U.parseStore(fs.readFileSync(p, 'utf8'));
  const victim = UNITS.find((u) => u.kind === 'prose');
  store.entries.delete(victim.key);
  fs.writeFileSync(p, U.serialiseStore(store.header,
    [...store.entries].map(([k, e]) => ({ key: k, locator: 'x', kind: 'prose', text: e.text, flags: e.flags }))), 'utf8');
  const r = producer(dir);
  ok('a translation behind the English is reported but NOT fatal (the no-veto rule)',
    r.code === 0 && /BEHIND i18n\/es/.test(r.out), 'exit ' + r.code + '; ' + r.out.slice(-400));
  fs.rmSync(dir, { recursive: true, force: true });
}

{
  /* A hand edit of a produced page is fatal: that is how the May
     orphans happened. */
  const dir = scratch();
  const p = path.join(dir, 'i18n', 'de', 'SPEC.md');
  const s = fs.readFileSync(p, 'utf8');
  fs.writeFileSync(p, s.replace('## 1. Rollen', '## 1. Rollen (von Hand bearbeitet)'), 'utf8');
  const r = producer(dir);
  ok('a hand edit of a produced page is fatal',
    r.code === 1 && /edited by hand/.test(r.out), 'exit ' + r.code + '; ' + r.out.slice(-400));
  fs.rmSync(dir, { recursive: true, force: true });
}

{
  /* The accident this flag exists for: the work was done and the flag
     was left on, so the producer would publish English under a
     complete-looking banner. */
  const dir = scratch();
  const p = path.join(dir, 'i18n', 'fr', 'SPEC.units.md');
  const store = U.parseStore(fs.readFileSync(p, 'utf8'));
  /* The victim must be a unit whose translation actually DIFFERS from
     the English. Flagging the H1 (which is "NAC3 -- Native Agent
     Contract" in all ten languages) made this test green for the wrong
     reason: a flag on a unit that legitimately reads the same as the
     English is indistinguishable from untranslated, and the producer
     cannot tell -- it publishes the same bytes either way, so the
     ambiguity is harmless. Choose a unit where it is not harmless. */
  const byKey = new Map(UNITS.map((u) => [u.key, u]));
  const target = [...store.entries].find(([k, e]) =>
    byKey.has(k) && e.text !== byKey.get(k).text);
  ok('setup: found a fr unit whose translation differs from the English',
    target !== undefined);
  const items = [...store.entries].map(([k, e]) => ({
    key: k, locator: 'x', kind: 'prose', text: e.text,
    flags: k === target[0] ? ['en'] : e.flags,
  }));
  fs.writeFileSync(p, U.serialiseStore(store.header, items), 'utf8');
  const r = producer(dir);
  ok('an entry flagged untranslated that does NOT hold the English is fatal',
    r.code === 1 && /flagged untranslated/.test(r.out), 'exit ' + r.code + '; ' + r.out.slice(-400));
  fs.rmSync(dir, { recursive: true, force: true });
}

{
  /* THE DEFECT THIS CHECK ITSELF HAD: the English grows a paragraph,
     the stores are already caught up, and the pages have simply not
     been produced since. That is not a hand edit, and calling it one
     accused all nine locales at once the first time section 4.3.2
     grew. The structure moving is something only the English can do. */
  const dir = scratch();
  const spec = path.join(dir, 'SPEC.md');
  fs.writeFileSync(spec, fs.readFileSync(spec, 'utf8').replace(
    '## 5. Public API',
    ['A paragraph the English grew after the pages were produced.', '', '## 5. Public API'].join(String.fromCharCode(10))), 'utf8');
  const r = producer(dir);
  ok('an English edit the pages have not been produced for is NOT a hand edit',
    r.code === 0 && /has not been produced since/.test(r.out) && !/edited by hand/.test(r.out),
    'exit ' + r.code + '; ' + r.out.slice(-400));
  fs.rmSync(dir, { recursive: true, force: true });
}

{
  /* An identity broken inside a store is fatal even though the page on
     disk is perfectly consistent with it: the page agreeing with a
     wrong store is exactly the failure mode. */
  const dir = scratch();
  const p = path.join(dir, 'i18n', 'zh', 'SPEC.units.md');
  const s = fs.readFileSync(p, 'utf8');
  ok('setup: the zh store mentions data-nac-role', s.includes('`data-nac-role`'));
  fs.writeFileSync(p, s.replace('`data-nac-role`', '`data-nac-rol`'), 'utf8');
  const r = producer(dir);
  ok('a renamed identity inside a store is fatal, with the unit named',
    r.code === 1 && /code spans differ/.test(r.out), 'exit ' + r.code + '; ' + r.out.slice(-400));
  fs.rmSync(dir, { recursive: true, force: true });
}

{
  /* Determinism: producing twice must give the same bytes, or the
     "page is what the store produces" check is noise. */
  const dir = scratch();
  producer(dir, ['--write']);
  const first = U.LOCALES.map((l) => fs.readFileSync(path.join(dir, 'i18n', l, 'SPEC.md'), 'utf8'));
  producer(dir, ['--write']);
  const second = U.LOCALES.map((l) => fs.readFileSync(path.join(dir, 'i18n', l, 'SPEC.md'), 'utf8'));
  ok('producing twice is byte identical', first.every((t, i) => t === second[i]));
  fs.rmSync(dir, { recursive: true, force: true });
}

}

/* ------------------------------------------------------------------ */

console.log('');
console.log(pass + ' passed, ' + failures.length + ' failed');
if (failures.length) {
  for (const f of failures) console.log('  FAILED: ' + f.name + (f.detail ? ' -- ' + f.detail : ''));
  process.exit(1);
}
