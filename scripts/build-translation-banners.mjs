#!/usr/bin/env node
/* =====================================================================
   build-translation-banners.mjs -- the producer AND the gate for what
   the nine published translations of the specification say about
   themselves (decision D-03, option C, 2026-10-26).

   WHY THIS EXISTS. The specification is published in ten languages.
   Nine of those are machine translations of the English text as it was
   on 2026-05-11 (NAC3 v2.2); the English text has grown by 49 sections
   since. Measured, not guessed: each translation carries 34 of the 83
   headings the canonical SPEC.md has today -- all nine the same 34,
   because all nine translate the same older document. Until this
   script existed, nothing on those pages said so above the fold, the
   nine .html files declared <html lang="en"> over translated prose,
   and -- the root cause -- NO script in this repository produced them.
   They were orphan artifacts from May with no producer and no lock, so
   every statement on them rotted silently. This is the producer.

   WHAT IT OWNS, and therefore what it overwrites with --write:
     - the machine-readable translation_* keys in the frontmatter of
       i18n/<locale>/SPEC.md
     - the visible banner right under that frontmatter
     - in i18n/<locale>/SPEC.html: the lang (and dir) attribute, the
       toolbar badge, the visible banner element, and the two manifest
       entries that declare the banner to an agent
     - nothing else. The translated prose is never touched.

   HOW IT VERIFIES. It does not grep the banner for a number, which
   would pass on a banner that says something else entirely. It
   RE-RENDERS the expected banner from the templates below plus the
   numbers measured from disk, and compares byte for byte. A banner
   that drifted, a count that went stale, a lang attribute that lies,
   or a landing page that stopped linking a locale is a named failure.

   Usage:  node scripts/build-translation-banners.mjs            (check)
           node scripts/build-translation-banners.mjs --write    (write)
   Reads:  SPEC.md, i18n/<locale>/SPEC.{md,html}, index.html
   Exit:   0 coherent, 1 drift (every finding named, never just a count)
   ===================================================================== */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const WRITE = process.argv.includes('--write');

/* The nine locales published as translations. 'en' is not here on
   purpose: English is not a translation of itself, it is the
   normative text (SPEC.md section 4.3.2). */
const LOCALES = ['es', 'pt', 'fr', 'it', 'de', 'ja', 'zh', 'hi', 'ar'];

/* What the nine translations are a translation OF. Declared once here
   and written into all nine, so the answer lives in one place. */
const SOURCE_VERSION = '2.2';
const SOURCE_DATE = '2026-05-11';
const CANONICAL_URL = '/nac-spec/SPEC.html';

/* The sentence every agent and every screen reader gets regardless of
   how good the nine translations below are. It is the claim the
   specification itself makes in 4.3.2, in the language 4.3.2 calls
   normative. */
const EN_LINE = 'Non-normative machine translation. The normative text of NAC3 is the English one.';

/* One entry per locale: the banner prose, the word for "translation"
   that goes on the toolbar badge, and the label of the link back to
   the normative text. The numbers are substituted, never typed. */
const T = {
  /* The five Latin-script locales carry their accents as \u escapes:
     this file is product code and stays ASCII-pure (SQ 3), while what
     it writes into a page a person reads is correctly accented. An
     unaccented Spanish banner over accented Spanish prose is also a
     text-to-speech defect, not only a cosmetic one. */
  es: {
    word: 'traducción',
    link: 'Leer el texto normativo en inglés',
    text: ({ n, total }) => `**Traducción automática, no normativa.** Traduce la versión en inglés tal como estaba el ${SOURCE_DATE} (NAC3 v${SOURCE_VERSION}) y cubre ${n} de las ${total} secciones del original de hoy. El texto normativo es el inglés: si esta traducción y el inglés no coinciden, manda el inglés.`,
  },
  pt: {
    word: 'tradução',
    link: 'Ler o texto normativo em inglês',
    text: ({ n, total }) => `**Tradução automática, não normativa.** Traduz a versão em inglês tal como estava em ${SOURCE_DATE} (NAC3 v${SOURCE_VERSION}) e cobre ${n} das ${total} seções do original de hoje. O texto normativo é o inglês: se esta tradução e o inglês divergirem, vale o inglês.`,
  },
  fr: {
    word: 'traduction',
    link: 'Lire le texte normatif en anglais',
    text: ({ n, total }) => `**Traduction automatique, non normative.** Elle traduit la version anglaise telle qu'elle était le ${SOURCE_DATE} (NAC3 v${SOURCE_VERSION}) et couvre ${n} des ${total} sections de l'original actuel. Le texte normatif est l'anglais : en cas de divergence entre cette traduction et l'anglais, l'anglais prévaut.`,
  },
  it: {
    word: 'traduzione',
    link: 'Leggere il testo normativo in inglese',
    text: ({ n, total }) => `**Traduzione automatica, non normativa.** Traduce la versione inglese come era il ${SOURCE_DATE} (NAC3 v${SOURCE_VERSION}) e copre ${n} delle ${total} sezioni dell'originale di oggi. Il testo normativo è l'inglese: in caso di divergenza tra questa traduzione e l'inglese, prevale l'inglese.`,
  },
  de: {
    word: 'Übersetzung',
    link: 'Den normativen englischen Text lesen',
    text: ({ n, total }) => `**Maschinelle Übersetzung, nicht normativ.** Sie übersetzt die englische Fassung vom ${SOURCE_DATE} (NAC3 v${SOURCE_VERSION}) und deckt ${n} von ${total} Abschnitten des heutigen Originals ab. Der normative Text ist der englische: bei Abweichungen gilt der englische Text.`,
  },
  ja: {
    word: '翻訳',
    link: '規範となる英語版を読む',
    text: ({ n, total }) => `**機械翻訳であり、規範ではありません。** ${SOURCE_DATE} 時点の英語版 (NAC3 v${SOURCE_VERSION}) を翻訳したもので、現在の原文の ${n} / ${total} 節を収録しています。規範となる本文は英語版です。本翻訳と英語版が食い違う場合は英語版が優先します。`,
  },
  zh: {
    word: '翻译',
    link: '阅读规范性的英文版本',
    text: ({ n, total }) => `**机器翻译，非规范性文本。** 本文翻译的是 ${SOURCE_DATE} 的英文版 (NAC3 v${SOURCE_VERSION})，覆盖当前原文的 ${n} / ${total} 节。规范性文本为英文版；本译文与英文版不一致时，以英文版为准。`,
  },
  hi: {
    word: 'अनुवाद',
    link: 'अंग्रेज़ी मानक पाठ पढ़ें',
    text: ({ n, total }) => `**मशीनी अनुवाद, गैर-मानक।** यह ${SOURCE_DATE} के अंग्रेज़ी संस्करण (NAC3 v${SOURCE_VERSION}) का अनुवाद है और आज के मूल दस्तावेज़ के ${total} में से ${n} अनुब्हागों को शामिल करता है। मानक पाठ अंग्रेज़ी है: बेमेल होने पर अंग्रेज़ी पाठ मान्य होगा।`,
  },
  ar: {
    word: 'ترجمة',
    link: 'اقرأ النص المعياري بالإنجليزية',
    text: ({ n, total }) => `**ترجمة آلية وغير معيارية.** تُترجم النسخة الإنجليزية كما كانت في ${SOURCE_DATE} (NAC3 v${SOURCE_VERSION})، وتغطي ${n} من ${total} قسما في النص الأصلي الحالي. النص المعياري هو الإنجليزي؛ وعند أي اختلاف يُعتمد النص الإنجليزي.`,
  },
};

/* ------------------------------------------------------------------ */
/* measurement                                                         */
/* ------------------------------------------------------------------ */

const MD_MARK_OPEN = '<!-- translation-banner: produced by scripts/build-translation-banners.mjs -->';
const MD_MARK_CLOSE = '<!-- /translation-banner -->';

function rx(lit) {
  return lit.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function stripFrontmatter(src) {
  if (!src.startsWith('---\n')) return { fm: null, body: src };
  const end = src.indexOf('\n---', 3);
  if (end === -1) return { fm: null, body: src };
  return { fm: src.slice(4, end + 1), body: src.slice(end + 4).replace(/^\n/, '') };
}

/* A section is a markdown heading, not a byte. Bytes were the wrong
   instrument: measured in bytes the nine translations look like they
   cover anywhere from 30% to 44%, and that spread is UTF-8 encoding
   noise (a CJK character costs three bytes, an ASCII one costs one),
   not coverage. Counted in headings, all nine carry the same 34. */
function headings(body) {
  return (body.match(/^#{1,4} .*/gm) || []).length;
}

function withoutBanner(body) {
  return body.replace(new RegExp(rx(MD_MARK_OPEN) + '[\\s\\S]*?' + rx(MD_MARK_CLOSE) + '\\n*'), '');
}

function canonicalHeadings() {
  const { body } = stripFrontmatter(fs.readFileSync(path.join(ROOT, 'SPEC.md'), 'utf8'));
  return headings(body);
}

/* ------------------------------------------------------------------ */
/* rendering -- the single source of every banner on disk              */
/* ------------------------------------------------------------------ */

function renderMdBanner(locale, n, total) {
  const t = T[locale];
  return [
    MD_MARK_OPEN,
    '',
    '> ' + t.text({ n, total }),
    '>',
    '> *' + EN_LINE + '*',
    '>',
    '> [' + t.link + '](' + CANONICAL_URL + ')',
    '',
    MD_MARK_CLOSE,
  ].join('\n');
}

function esc(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/* The emphasis of the first clause becomes a <strong>; the rest is
   escaped text. An agent gets the same claim a reader gets. */
function renderHtmlBanner(locale, n, total) {
  const t = T[locale];
  const body = t.text({ n, total });
  const m = body.match(/^\*\*([\s\S]+?)\*\*\s*([\s\S]*)$/);
  const lead = m ? m[1] : body;
  const rest = m ? m[2] : '';
  return [
    '<aside data-nac-id="spec.translation_notice" data-nac-role="region">',
    '<p data-nac-id="spec.translation_notice.text" data-nac-role="paragraph">'
      + '<strong>' + esc(lead) + '</strong> ' + esc(rest) + '</p>',
    '<p data-nac-id="spec.translation_notice.en" data-nac-role="paragraph" lang="en"><em>'
      + esc(EN_LINE) + '</em></p>',
    '<p data-nac-id="spec.translation_notice.link_row" data-nac-role="paragraph">'
      + '<a href="' + CANONICAL_URL + '" hreflang="en"'
      + ' data-nac-id="spec.translation_notice.canonical"'
      + ' data-nac-role="action" data-nac-action="open">' + esc(t.link) + '</a></p>',
    '</aside>',
  ].join('\n');
}

const MANIFEST_ENTRIES = [
  '      { id: "spec.translation_notice", role: "region",',
  '         label_i18n: { es: "Aviso de traducci\\u00F3n", en: "Translation notice", pt: "Aviso de tradu\\u00E7\\u00E3o", fr: "Avis de traduction", it: "Avviso di traduzione", de: "\\u00DCbersetzungshinweis", ja: "\\u7FFB\\u8A33\\u306E\\u6CE8\\u8A18", zh: "\\u7FFB\\u8BD1\\u8BF4\\u660E", hi: "\\u0905\\u0928\\u0941\\u0935\\u093E\\u0926 \\u0938\\u0942\\u091A\\u0928\\u093E", ar: "\\u0625\\u0634\\u0639\\u0627\\u0631 \\u0627\\u0644\\u062A\\u0631\\u062C\\u0645\\u0629" } },',
  '      { id: "spec.translation_notice.canonical", role: "action",',
  '         actions: [{ verb: "open" }],',
  '         label_i18n: { es: "Texto normativo en ingl\\u00E9s", en: "Normative English text", pt: "Texto normativo em ingl\\u00EAs", fr: "Texte normatif en anglais", it: "Testo normativo in inglese", de: "Normativer englischer Text", ja: "\\u898F\\u7BC4\\u306E\\u82F1\\u8A9E\\u672C\\u6587", zh: "\\u89C4\\u8303\\u6027\\u82F1\\u6587\\u6587\\u672C", hi: "\\u092E\\u093E\\u0928\\u0915 \\u0905\\u0902\\u0917\\u094D\\u0930\\u0947\\u095B\\u0940 \\u092A\\u093E\\u0920", ar: "\\u0627\\u0644\\u0646\\u0635 \\u0627\\u0644\\u0645\\u0639\\u064A\\u0627\\u0631\\u064A \\u0628\\u0627\\u0644\\u0625\\u0646\\u062C\\u0644\\u064A\\u0632\\u064A\\u0629" } },',
].join('\n');

const MANIFEST_RE = / {6}\{ id: "spec\.translation_notice", role: "region",[\s\S]*?id: "spec\.translation_notice\.canonical"[\s\S]*?\} \},\n/;

function renderBadge(locale) {
  return '<span class="badge">NAC3 v' + SOURCE_VERSION + ' &middot; ' + T[locale].word + '</span>';
}

/* ------------------------------------------------------------------ */
/* the contract each translation has to satisfy                        */
/* ------------------------------------------------------------------ */

const REQUIRED_FM = (loc, n, total) => ({
  translation_normative: 'false',
  translation_status: 'partial',
  translation_lang: loc,
  translation_source: 'SPEC.md',
  translation_source_version: SOURCE_VERSION,
  translation_source_date: SOURCE_DATE,
  translation_sections: String(n),
  translation_sections_canonical: String(total),
  translation_canonical_url: CANONICAL_URL,
});

function fmGet(fm, key) {
  const m = fm.match(new RegExp('^' + rx(key) + ':\\s*(.*)$', 'm'));
  return m ? m[1].trim().replace(/^["']|["']$/g, '') : null;
}

const findings = [];
function drift(what, detail, fix) {
  findings.push({ what, detail, fix });
}

const total = canonicalHeadings();

/* ------------------------------------------------------------------ */
/* write mode                                                          */
/* ------------------------------------------------------------------ */

function writeMd(loc) {
  const p = path.join(ROOT, 'i18n', loc, 'SPEC.md');
  const { fm, body } = stripFrontmatter(fs.readFileSync(p, 'utf8'));
  const clean = withoutBanner(body).replace(/^\n+/, '');
  const n = headings(clean);
  const want = REQUIRED_FM(loc, n, total);

  /* Every key the May generator wrote (source hash, quality, date) is
     kept: this script adds what was missing, it does not erase
     provenance. */
  const keep = (fm || '')
    .split('\n')
    .filter((l) => l.trim() && !Object.keys(want).some((k) => l.startsWith(k + ':')));
  const fmOut = keep.concat(Object.entries(want).map(([k, v]) => k + ': ' + v)).join('\n');

  fs.writeFileSync(p, '---\n' + fmOut + '\n---\n\n' + renderMdBanner(loc, n, total) + '\n\n' + clean, 'utf8');
  return n;
}

function writeHtml(loc, n) {
  const p = path.join(ROOT, 'i18n', loc, 'SPEC.html');
  if (!fs.existsSync(p)) return false;
  let s = fs.readFileSync(p, 'utf8');
  const dir = loc === 'ar' ? ' dir="rtl"' : '';

  /* 1. the page stops declaring itself English over translated prose */
  s = s.replace(/<html lang="[^"]*"(?: dir="[^"]*")?>/, '<html lang="' + loc + '"' + dir + '>');

  /* 2. the badge says what the page is: a translation of an older spec.
        It used to read "NAC3 v2.2" alone, which is a claim about NAC3
        rather than about the page. */
  s = s.replace(/<span class="badge">NAC3 v[^<]*<\/span>/, renderBadge(loc));

  /* 3. the banner replaces the leaked frontmatter paragraph: the May
        generator rendered the YAML block as prose, so the first thing
        a reader saw was translation_source_hash. */
  const banner = renderHtmlBanner(loc, n, total);
  const leaked = /<hr \/>\n<p data-nac-id="spec\.p\.1" data-nac-role="paragraph">translation_source:[\s\S]*?<\/p>\n<hr \/>/;
  const already = /<aside data-nac-id="spec\.translation_notice"[\s\S]*?<\/aside>/;
  if (already.test(s)) s = s.replace(already, banner);
  else if (leaked.test(s)) s = s.replace(leaked, banner);
  else s = s.replace(/(<main data-nac-id="spec\.main" data-nac-role="region">\n)/, '$1' + banner + '\n');

  /* 4. the banner is declared, not only painted. Painting an element
        an agent cannot see is the asymmetry audit N-31 is about.
        Written idempotently: an older block is REPLACED, not left
        alone. Skipping the rewrite when the ids already existed was
        this script's own first bug -- it froze the labels of the
        first run, which is exactly the rot it exists to prevent. */
  if (MANIFEST_RE.test(s)) s = s.replace(MANIFEST_RE, MANIFEST_ENTRIES + '\n');
  else s = s.replace(/(\n    elements: \[\n)/, '$1' + MANIFEST_ENTRIES + '\n');
  fs.writeFileSync(p, s, 'utf8');
  return true;
}

if (WRITE) {
  console.log('canonical SPEC.md: ' + total + ' headings');
  for (const loc of LOCALES) {
    const n = writeMd(loc);
    const html = writeHtml(loc, n);
    console.log('  WROTE  i18n/' + loc + '/SPEC.md' + (html ? ' + SPEC.html' : '  (no .html)')
      + '   ' + n + '/' + total + ' sections');
  }
  console.log('');
  console.log('Banners written. Run without --write to verify, including the landing links.');
  process.exit(0);
}

/* ------------------------------------------------------------------ */
/* check mode                                                          */
/* ------------------------------------------------------------------ */

console.log('translation banners -- canonical SPEC.md has ' + total + ' headings');
console.log('');

for (const loc of LOCALES) {
  const before = findings.length;
  const mdPath = path.join(ROOT, 'i18n', loc, 'SPEC.md');
  if (!fs.existsSync(mdPath)) {
    drift('i18n/' + loc + '/SPEC.md', 'the published translation is missing from the tree',
      'restore i18n/' + loc + '/SPEC.md');
    continue;
  }
  const { fm, body } = stripFrontmatter(fs.readFileSync(mdPath, 'utf8'));
  if (fm === null) {
    drift('i18n/' + loc + '/SPEC.md', 'no frontmatter, so nothing machine-readable says it is a translation',
      'node scripts/build-translation-banners.mjs --write');
    continue;
  }
  const n = headings(withoutBanner(body));

  /* the machine-readable half */
  for (const [k, v] of Object.entries(REQUIRED_FM(loc, n, total))) {
    const got = fmGet(fm, k);
    if (got === null) {
      drift('i18n/' + loc + '/SPEC.md', 'frontmatter declares no ' + k,
        'node scripts/build-translation-banners.mjs --write');
    } else if (got !== v) {
      drift('i18n/' + loc + '/SPEC.md', k + ' declares ' + got + ', measured ' + v,
        'node scripts/build-translation-banners.mjs --write');
    }
  }

  /* the half a human reads: re-rendered and compared, never grepped */
  if (!body.includes(renderMdBanner(loc, n, total))) {
    drift('i18n/' + loc + '/SPEC.md',
      body.includes(MD_MARK_OPEN)
        ? 'the visible banner drifted from what this script produces'
        : 'no visible banner above the translated text',
      'node scripts/build-translation-banners.mjs --write');
  }

  /* the published page */
  const hPath = path.join(ROOT, 'i18n', loc, 'SPEC.html');
  if (!fs.existsSync(hPath)) {
    drift('i18n/' + loc + '/SPEC.html', 'the rendered page is missing from the tree',
      'restore or regenerate it');
  } else {
    const h = fs.readFileSync(hPath, 'utf8');
    const langM = h.match(/<html lang="([^"]*)"/);
    if (!langM || langM[1] !== loc) {
      drift('i18n/' + loc + '/SPEC.html',
        'declares lang="' + (langM ? langM[1] : '(none)') + '" over ' + loc
          + ' prose, so a screen reader reads it in the wrong voice',
        'node scripts/build-translation-banners.mjs --write');
    }
    if (loc === 'ar' && !/<html lang="ar" dir="rtl">/.test(h)) {
      drift('i18n/ar/SPEC.html', 'right-to-left prose with no dir="rtl"',
        'node scripts/build-translation-banners.mjs --write');
    }
    if (!h.includes(renderHtmlBanner(loc, n, total))) {
      drift('i18n/' + loc + '/SPEC.html',
        h.includes('spec.translation_notice')
          ? 'the banner element drifted from what this script produces'
          : 'the published page carries no visible banner',
        'node scripts/build-translation-banners.mjs --write');
    }
    if (!h.includes(MANIFEST_ENTRIES)) {
      /* Which of the two it is has to be decided on the MANIFEST, not
         on the id: the painted banner carries that same id in its
         data-nac-id, so asking whether the id appears anywhere told
         "absent" and "drifted" apart wrongly -- the gate refused with
         the wrong reason, which its own tests caught. */
      drift('i18n/' + loc + '/SPEC.html',
        MANIFEST_RE.test(h)
          ? 'the manifest entry for the banner drifted from what this script produces'
          : 'the banner is painted but not declared in the manifest, so an agent cannot see it',
        'node scripts/build-translation-banners.mjs --write');
    }
    if (!h.includes(renderBadge(loc))) {
      drift('i18n/' + loc + '/SPEC.html',
        'the toolbar badge does not say the page is a translation of v' + SOURCE_VERSION,
        'node scripts/build-translation-banners.mjs --write');
    }
  }

  if (findings.length === before) {
    console.log('OK    i18n/' + loc + '   frontmatter + banner + page   ' + n + '/' + total + ' sections');
  }
}

/* ---- the landing is the other half of the contract. D-03 option C
       says "linked from the landing", and a landing rewrite that drops
       a locale has to be a red gate, not a thing nobody notices. ---- */
const landing = path.join(ROOT, 'index.html');
if (!fs.existsSync(landing)) {
  drift('index.html', 'the landing page is missing from the tree', 'restore index.html');
} else {
  const s = fs.readFileSync(landing, 'utf8');
  const missing = LOCALES.filter((l) => !s.includes('i18n/' + l + '/SPEC.html'));
  if (missing.length) {
    drift('index.html', 'does not link ' + missing.length + ' of the ' + LOCALES.length
      + ' published translations (' + missing.join(', ') + ')',
      'link each locale from the translations section');
  } else {
    console.log('OK    index.html   links all ' + LOCALES.length + ' published translations');
  }
  /* Matched as the WHOLE attribute and the WHOLE manifest id, with
     their quotes. A bare substring test passed a link whose id was
     nac_landing.translations.deXX, because "...de" is a prefix of it --
     this gate's own tests caught that, and a gate that cannot fail is
     a ceremony. */
  const unaddressable = LOCALES.filter((l) => s.includes('i18n/' + l + '/SPEC.html')
    && !s.includes('data-nac-id="nac_landing.translations.' + l + '"'));
  if (unaddressable.length) {
    drift('index.html', 'links ' + unaddressable.join(', ')
      + ' with no data-nac-id, so an agent cannot reach what a reader can click',
      'give each link data-nac-id="nac_landing.translations.<locale>"');
  }
  const undeclared = LOCALES.filter((l) => s.includes('i18n/' + l + '/SPEC.html')
    && !s.includes("id: 'nac_landing.translations." + l + "'"));
  if (undeclared.length) {
    drift('index.html', 'paints the ' + undeclared.join(', ')
      + ' link without declaring it in the landing manifest',
      "declare each one as { id: 'nac_landing.translations.<locale>', role: 'action' }");
  }
  if (!/non-normative/i.test(s)) {
    drift('index.html', 'links the translations without saying in words that they are non-normative',
      'state it in the translations section, where a reader sees it');
  }
}

console.log('');
if (findings.length) {
  for (const f of findings) console.log('DRIFT ' + f.what + ': ' + f.detail + '\n      fix: ' + f.fix);
  console.log('');
  console.log(findings.length + ' finding' + (findings.length === 1 ? '' : 's')
    + '. The published translations do not say what they are.');
  process.exit(1);
}
console.log('Translation banners are coherent: ' + LOCALES.length
  + ' locales, each declaring what it covers and what governs.');
