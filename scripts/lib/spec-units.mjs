/* =====================================================================
   spec-units.mjs -- the unit model the nine SPEC translations are
   produced from, and the identity lock that makes them verifiable
   WITHOUT reading the prose (decision D-05, option B, 2026-10-27).

   WHY THIS EXISTS. Option B publishes nine full translations of a
   normative document in languages the owner cannot read. The risk is
   not bad prose -- it is a translation that silently renames an id,
   drops a URL, moves a number or mangles a code sample, because a
   reader in that language then implements something NAC3 never said.
   D-05's answer: make the identities (code spans, link targets, bare
   URLs, prose numbers, table rows, list items, heading level and
   heading number) byte-comparable to the English, so a gate can refuse
   a defective translation with no opinion about its prose.

   THE UNIT MODEL. The canonical SPEC.md is split into BLOCKS that
   cover every line of the file, so the blocks reassemble it byte for
   byte (asserted by a test, not by this comment). Blocks are either:

     verbatim -- blank runs, horizontal rules and fenced code blocks.
                 Never translated and never stored: the producer
                 splices them from the English. A code sample that
                 cannot drift is better than one a gate has to check.
     unit     -- headings and prose blocks (paragraphs, lists, tables,
                 blockquotes). These are what gets translated.

   A unit KEY IS the sha256 of its English text (first 12 hex). That
   makes the store content-addressed, which is the property the whole
   maintenance story rests on: when the English changes one paragraph,
   exactly one key disappears and one appears. Nothing else in the
   store is disturbed, so a release translates its delta and not the
   document. Two identical English blocks share one key on purpose.

   WHAT THIS MODULE DOES NOT DO. It does not judge prose, it does not
   call a translation engine, and it does not decide what is fatal --
   build-spec-translations.mjs owns that policy, because the no-veto
   rule (a stale translation never blocks the English release) is a
   decision, not a measurement.
   ===================================================================== */

import crypto from 'crypto';

export const KEY_LEN = 12;

/* The nine published translations. 'en' is absent on purpose: English
   is not a translation of itself, it is the normative text (SPEC
   section 4.3.2). */
export const LOCALES = ['es', 'pt', 'fr', 'it', 'de', 'ja', 'zh', 'hi', 'ar'];

export function unitKey(text) {
  return crypto.createHash('sha256').update(text, 'utf8').digest('hex').slice(0, KEY_LEN);
}

const RE_FENCE = /^```/;
const RE_HR = /^-{3,}$/;
const RE_HEADING = /^(#{1,6}) +(.*)$/;

/* ------------------------------------------------------------------ */
/* the split                                                           */
/* ------------------------------------------------------------------ */

/* Every line of the input lands in exactly one block, in order, so the
   blocks reassemble the input byte for byte. That round trip is the
   reason this is a block model and not a regex sweep: a splitter that
   loses a blank line produces a document that reads differently from
   the one it claims to translate. */
export function splitBlocks(md) {
  const lines = md.split('\n');
  const blocks = [];
  let i = 0;
  /* The section a block belongs to is identified by ORDINAL, not by
     heading text: "#### Demos and tests" appears three times in the
     canonical spec, and counting sections by name reported 79 where
     every other instrument in the repo counts 83 headings. Two gates
     disagreeing about what a section is would be exactly the kind of
     silent asymmetry this repository keeps finding. */
  let sectionNo = 0;
  let section = '0 (front matter)';

  while (i < lines.length) {
    const line = lines[i];

    if (line.trim() === '') {
      const start = i;
      while (i < lines.length && lines[i].trim() === '') i++;
      blocks.push({ kind: 'blank', verbatim: true, text: lines.slice(start, i).join('\n'), section });
      continue;
    }

    if (RE_FENCE.test(line)) {
      const start = i;
      i++;
      while (i < lines.length && !RE_FENCE.test(lines[i])) i++;
      if (i < lines.length) i++; /* the closing fence */
      blocks.push({ kind: 'code', verbatim: true, text: lines.slice(start, i).join('\n'), section });
      continue;
    }

    if (RE_HR.test(line)) {
      blocks.push({ kind: 'hr', verbatim: true, text: line, section });
      i++;
      continue;
    }

    const h = line.match(RE_HEADING);
    if (h) {
      sectionNo++;
      section = sectionNo + ' ' + h[2].trim();
      blocks.push({ kind: 'heading', verbatim: false, text: line, section, level: h[1].length });
      i++;
      continue;
    }

    const start = i;
    while (i < lines.length
      && lines[i].trim() !== ''
      && !RE_FENCE.test(lines[i])
      && !RE_HR.test(lines[i])
      && !RE_HEADING.test(lines[i])) i++;
    blocks.push({ kind: 'prose', verbatim: false, text: lines.slice(start, i).join('\n'), section });
  }

  for (const b of blocks) if (!b.verbatim) b.key = unitKey(b.text);
  return blocks;
}

/* The distinct translatable units, in first-appearance order. */
export function unitsOf(blocks) {
  const seen = new Map();
  for (const b of blocks) {
    if (b.verbatim || seen.has(b.key)) continue;
    seen.set(b.key, { key: b.key, kind: b.kind, section: b.section, text: b.text });
  }
  return [...seen.values()];
}

/* ------------------------------------------------------------------ */
/* the identity lock                                                   */
/* ------------------------------------------------------------------ */

function sortedMatches(text, re, map) {
  const out = [];
  let m;
  const rx = new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g');
  while ((m = rx.exec(text)) !== null) out.push(map ? map(m) : m[0]);
  return out.sort();
}

/* Code spans are compared as a multiset and then REMOVED before the
   other probes run: a number that lives inside a code span is already
   pinned by the code-span comparison, and counting it twice turns one
   defect into two findings. */
/* A markdown code span MAY be broken across lines -- the renderer
   folds the newline into a space -- and the canonical spec does it
   three times. A regex that stopped at the newline did not see those
   as code spans at all: it paired the backticks wrongly (turning
   ". See " into a "code span"), and it counted the 3 of @nac3 as a
   prose number. The lock then refused three correct translations whose
   only sin was not wrapping in the same column. So newlines are
   allowed inside a span, and whitespace inside a span is collapsed
   before comparing: what has to be identical is the CODE, not where
   the English happened to wrap. */
const RE_CODE = /`[^`]+`/g;
const foldCode = (s) => s.replace(/\s+/g, ' ');

export function identities(text) {
  const code = sortedMatches(text, RE_CODE).map(foldCode).sort();
  const bare = text.replace(RE_CODE, ' ');
  const h = text.match(RE_HEADING);
  return {
    code,
    links: sortedMatches(bare, /\]\(([^)\s]+)\)/g, (m) => m[1]),
    urls: sortedMatches(bare, /https?:\/\/[^\s)\]'"]+/g),
    /* A digit run that is immediately FOLLOWED by a letter is part of
       a word, not a quantity: `a11y`, `i18n`, `l10n`. Demanding those
       in a translation would force the English numeronym into the
       prose of nine languages to satisfy a probe. A digit run
       PRECEDED by a letter still counts, because that is `v2.5` and
       `NAC3` -- a version is exactly what must not drift. */
    numbers: sortedMatches(bare, /(?<![0-9])\d+(?:[.,]\d+)*(?![0-9A-Za-z])/g),
    /* Structure is counted on the RAW text, not on the code-stripped
       one. Stripping first INVENTED a list item: the paragraph with
       "`/parse` + `/tts` conversational loop" becomes " + conversational
       loop" once the code spans go, and a leading "+" reads as a
       bullet. The lock then refused a correct translation for a list
       item the English never had. A probe that manufactures the thing
       it measures is worse than no probe. */
    rows: (text.match(/^ *\|/gm) || []).length,
    items: (text.match(/^ *(?:[-*+]|\d+\.) +/gm) || []).length,
    level: h ? h[1].length : 0,
    /* The section number ("5.1.4" in "### 5.1.4 Action payload"): a
       translation may rename a heading, never renumber it. */
    number: h ? (h[2].match(/^([0-9]+(?:\.[0-9]+)*)\.? /) || [null, null])[1] : null,
  };
}

const SAME = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);

/* Returns a named finding per violated identity. An empty array means
   the translation carries exactly the English identities -- which is
   all this lock claims. It says nothing about whether the prose is a
   correct translation, and no gate in this repository pretends it
   does. */
export function compareIdentities(en, tr) {
  const a = identities(en);
  const b = identities(tr);
  const out = [];
  const diff = (have, want) => {
    const pool = have.slice();
    return want.filter((x) => {
      const i = pool.indexOf(x);
      if (i >= 0) { pool.splice(i, 1); return false; }
      return true;
    });
  };
  const named = (what, A, B) => {
    out.push({
      what,
      detail: 'absent: ' + (diff(B, A).join(' ') || '(none)')
        + '; invented: ' + (diff(A, B).join(' ') || '(none)'),
    });
  };

  if (!SAME(a.code, b.code)) named('code spans', a.code, b.code);
  if (!SAME(a.links, b.links)) named('link targets', a.links, b.links);
  if (!SAME(a.urls, b.urls)) named('URLs', a.urls, b.urls);
  if (!SAME(a.numbers, b.numbers)) named('numbers', a.numbers, b.numbers);
  if (a.rows !== b.rows) {
    out.push({ what: 'table rows', detail: 'English ' + a.rows + ', translation ' + b.rows });
  }
  if (a.items !== b.items) {
    out.push({ what: 'list items', detail: 'English ' + a.items + ', translation ' + b.items });
  }
  if (a.level !== b.level) {
    out.push({ what: 'heading level', detail: 'English ' + a.level + ', translation ' + b.level });
  }
  if (a.number !== b.number) {
    out.push({
      what: 'section number',
      detail: 'English ' + (a.number || '(none)') + ', translation ' + (b.number || '(none)'),
    });
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* the store                                                           */
/* ------------------------------------------------------------------ */

const STORE_OPEN = '<!-- nac3-translation-store';
const STORE_CLOSE = '-->';
/* The tail is matched greedily up to the LAST "-->" on the line, not
   with [^>]*: section 10.2 is titled "CLI: `npx nac3 validate
   <target>`", so nine stores silently swallowed four markers each and
   reported the English as a translation. Found by running the producer
   over a seeded store, not by reading it. */
const RE_UNIT = /^<!-- u ([0-9a-f]{12}) \|(.*)-->[ \t]*$/;

/* The flag a seeded-but-not-yet-translated unit carries. A template
   written by --template holds the ENGLISH text under every marker, and
   that English must never be counted as a translation -- a store that
   claims 282 of 282 while holding the English is the worst possible
   failure of this whole design. So the flag is what makes an entry
   count, and the producer refuses an entry flagged `en` whose text is
   NOT the English: that catches the real accident, a translator who
   did the work and forgot to clear the flag. */
export const FLAG_UNTRANSLATED = 'en';

/* i18n/<locale>/SPEC.units.md -- the authored half. A header block of
   key: value lines, then one marker per unit followed by its
   translated text. The marker carries the English sha (the key), a
   human locator and the kind; only the key is read, the rest is there
   so a person can navigate the file. */
export function parseStore(text) {
  const lines = text.split('\n');
  const header = {};
  let i = 0;
  if (lines[0] !== undefined && lines[0].trim() === STORE_OPEN) {
    i = 1;
    while (i < lines.length && lines[i].trim() !== STORE_CLOSE) {
      const m = lines[i].match(/^([a-z_]+):\s*(.*)$/);
      if (m) header[m[1]] = m[2].trim();
      i++;
    }
    i++;
  }
  const entries = new Map();
  let key = null;
  let flags = [];
  let buf = [];
  const flush = () => {
    if (key === null) return;
    /* Trailing blank lines between entries are the file formatting,
       not part of the translation. */
    while (buf.length && buf[buf.length - 1].trim() === '') buf.pop();
    entries.set(key, { text: buf.join('\n'), flags });
    buf = [];
  };
  for (; i < lines.length; i++) {
    const m = lines[i].match(RE_UNIT);
    if (m) {
      flush();
      key = m[1];
      /* Field 0 is the human locator and never a flag: a locator that
         happened to read "en" would otherwise mark a finished
         translation as untranslated. */
      flags = m[2].split('|').slice(1).map((s) => s.trim()).filter(Boolean);
      continue;
    }
    if (key !== null) buf.push(lines[i]);
  }
  flush();
  return { header, entries };
}

/* The entries that count as translated: everything not flagged. */
export function translated(entries) {
  const out = new Map();
  for (const [k, e] of entries) {
    if (!e.flags.includes(FLAG_UNTRANSLATED)) out.set(k, e.text);
  }
  return out;
}

export function serialiseStore(header, items) {
  const out = [STORE_OPEN];
  for (const [k, v] of Object.entries(header)) out.push(k + ': ' + v);
  out.push(STORE_CLOSE, '');
  for (const e of items) {
    const flags = (e.flags || []).length ? ' | ' + e.flags.join(' | ') : '';
    out.push('<!-- u ' + e.key + ' | ' + e.locator + ' | ' + e.kind + flags + ' -->');
    out.push(e.text);
    out.push('');
  }
  return out.join('\n');
}

/* ------------------------------------------------------------------ */
/* the shape of a published translation                                */
/* ------------------------------------------------------------------ */

/* These three live here, and not in build-translation-banners.mjs
   where they were written, because two producers now read the same
   file: the banner owns the frontmatter and the banner, the text
   producer owns the body. Two copies of "where does the body start"
   is the asymmetry that this repository keeps paying for. */
export const MD_MARK_OPEN =
  '<!-- translation-banner: produced by scripts/build-translation-banners.mjs -->';
export const MD_MARK_CLOSE = '<!-- /translation-banner -->';

export function rx(lit) {
  return lit.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function stripFrontmatter(src) {
  if (!src.startsWith('---\n')) return { fm: null, body: src };
  const end = src.indexOf('\n---', 3);
  if (end === -1) return { fm: null, body: src };
  return { fm: src.slice(4, end + 1), body: src.slice(end + 4).replace(/^\n/, '') };
}

export function withoutBanner(body) {
  return body.replace(
    new RegExp(rx(MD_MARK_OPEN) + '[\\s\\S]*?' + rx(MD_MARK_CLOSE) + '\\n*'), '');
}

/* A section is a markdown heading, not a byte. Bytes were the wrong
   instrument: measured in bytes the nine translations looked like they
   covered anywhere from 30% to 44%, and that spread is UTF-8 encoding
   noise (a CJK character costs three bytes, an ASCII one costs one),
   not coverage. */
export function headingsOf(body) {
  return (body.match(/^#{1,4} .*/gm) || []).length;
}

/* ------------------------------------------------------------------ */
/* the assembly                                                        */
/* ------------------------------------------------------------------ */

/* The body of i18n/<locale>/SPEC.md: English structure, translated
   units where the store has them, ENGLISH where it does not. Falling
   back to English is deliberate and it is the other half of the
   no-veto rule: a document that is 98 percent translated still says
   everything the English says, so a release is never held hostage by
   six untranslated paragraphs. What it must never do is hide that --
   the banner declares the coverage, measured from this same data. */
export function assemble(blocks, store) {
  return blocks.map((b) => {
    if (b.verbatim) return b.text;
    const t = store.get(b.key);
    return t === undefined ? b.text : t;
  }).join('\n');
}

export function coverage(blocks, store) {
  const units = unitsOf(blocks);
  const translated = units.filter((u) => store.has(u.key));
  const sectionsTotal = new Set();
  const sectionsStale = new Set();
  for (const b of blocks) {
    if (b.kind === 'blank' || b.kind === 'hr') continue;
    sectionsTotal.add(b.section);
    if (!b.verbatim && !store.has(b.key)) sectionsStale.add(b.section);
  }
  return {
    units: translated.length,
    unitsTotal: units.length,
    stale: units.filter((u) => !store.has(u.key)),
    orphans: [...store.keys()].filter((k) => !units.some((u) => u.key === k)),
    sections: sectionsTotal.size - sectionsStale.size,
    sectionsTotal: sectionsTotal.size,
  };
}

/* The sha256 of the English document a translation claims to
   translate. Published in the frontmatter so a reader can verify
   WHICH revision was translated without trusting a date. */
export function sourceHash(md) {
  return crypto.createHash('sha256').update(md, 'utf8').digest('hex');
}

/* ------------------------------------------------------------------ */
/* What the NORMATIVE text claims about the nine translations.         */
/* ------------------------------------------------------------------ */

/* WHY THIS LIVES HERE. SPEC 4.3.2 makes two claims about the nine
   translations, and on 2026-10-27 one of them went false by itself:
   the section said "each one IS PARTIAL" and the D-05 pass had taken
   all nine to 83 of 83 sections. Nothing in the repository could
   notice, because no instrument read that prose -- the publication of
   the thing is what made the claim about the thing false, which is the
   shape of defect this project keeps finding.
   The other half was the mirror of it: build-spec-translations.mjs
   PRINTED "a stale translation never blocks the publication of the
   normative English (SPEC 4.3.2)" while 4.3.2 was mute on the subject.
   For a day the tooling cited a clause that did not exist.
   So the claim and its citation are ONE constant, read by the producer
   that cites it and by the gate that verifies the specification really
   says it. Reword it here and both move; reword 4.3.2 alone and the
   gate goes red with the section named. */

export const TRANSLATION_SECTION = '4.3.2';

/* The load-bearing fragment of the no-veto rule. Deliberately the
   predicate and not the whole sentence: it has to survive an editor
   rewriting the subject of the sentence, and still fail if the rule
   itself is dropped. */
export const NO_VETO_CLAIM = 'never blocks the publication';

/* Prose that describes the nine as covering less than the English.
   This is the claim that goes stale the moment a pass completes them,
   so the gate refuses it while every locale is whole -- and refuses
   its ABSENCE while a locale is missing sections. Both directions, or
   it is a lock that only closes one way. */
export const PARTIAL_COVERAGE_PROSE = [
  /\b(is|are|was|were|remains?|stays?)\s+partial\b/i,
  /\bpartial\s+(translation|coverage|version)/i,
  /\beach\s+(one|of\s+them)\s+is\s+partial\b/i,
  /\b(is|are)\s+incomplete\b/i,
  /\bcovers?\s+only\b/i,
];
