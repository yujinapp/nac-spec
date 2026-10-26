/* =====================================================================
   spec-levels.mjs -- the ONE place that reads the conformance levels
   out of SPEC.md.

   Why it is a module and not a function inside one generator:

   Two artefacts have to agree about what a level is -- the published
   contract (api/v/<version>/levels.json, written by
   scripts/build-contract-api.mjs) and the CLI validator that reports a
   level (runtime/dist/cli.js, written by runtime/build.mjs). Audit
   N-17 is the record of what happens when two places write the same
   fact: the version ended up typed in 13 of them, and the published
   tarball announced a version two releases behind its own
   package.json. A validator that reported a level against its own
   private copy of section 8 would be the same bug with a worse blast
   radius -- it would certify pages against a spec nobody is reading.

   So the extraction lives here, both generators import it, and the
   requirement text is keyed by its own hash in
   scripts/contract-api.meta.json. Edit a bullet in section 8 and both
   gates go red until a human re-reads the mapping.

   ASCII only. No dependency beyond node core.
   ===================================================================== */

import { createHash } from 'node:crypto';

export function sha384(buf) {
  return 'sha384-' + createHash('sha384').update(buf).digest('base64');
}

/* The names the levels carried before 2.5.0, read out of the
   compatibility subsection that promises them.

   api/ publishes these as `legacy_display_name` so a document written
   before the rename can still be mapped onto a level. That makes
   section 8.1 load-bearing: if it stops recording an alias and this
   function just composed 'NAC-' + n anyway, api/ would keep promising
   a mapping no document explains -- the same shape of lie as a
   fingerprint compared against itself. So the gate refuses instead. */
export function extractLegacyLevelNames(sectionBody) {
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
   requirement is machine-decidable, which finding code falsifies it,
   and which check the validator runs for it, are in the meta sidecar
   keyed by a hash of that text. Edit the bullet in the spec and the
   gate goes red until someone re-reads the mapping -- which is the
   only way a published "level" stays honest. */
export function extractLevels(specSrc) {
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

export function extractLocales(specSrc) {
  const m = specSrc.match(/MUST cover all 10 NAC3 locales:\s*```\s*([^`]+)```/);
  if (!m) throw new Error('cannot find the locale list in SPEC.md section 4.3');
  const locales = m[1].split(',').map((s) => s.trim()).filter(Boolean);
  if (locales.length !== 10) {
    throw new Error('SPEC.md section 4.3 announces 10 locales and lists ' + locales.length);
  }
  return locales;
}

/* The conformance_tier vocabulary (audit N-29).

   `NAC.conformance_tier` is a WIRE value a host may be comparing, and
   it belongs to a DIFFERENT taxonomy than a conformance level: the
   tiers come from RFC V24-04 section 6, the levels from SPEC.md
   section 8. Until 2.5.0 the contract published the field as
   `type: "string"` and not its values, so a machine could see the
   field and had no way to learn that `NAC-3-versioned` is not a level
   name -- precisely the ambiguity the level rename (N-06) removed
   everywhere else.

   Read from the RFC with an anchored pattern, like every other
   prose-only fact. A hand-typed list here would be the N-17 bug
   again, and this one would ship as a contract. */
export function extractTiers(rfcSrc) {
  const secStart = rfcSrc.indexOf('## 6. Conformance levels');
  if (secStart < 0) {
    throw new Error('cannot find RFC_V24-04.md section 6 -- the contract publishes the conformance_tier vocabulary and that section is what defines it');
  }
  const secEnd = rfcSrc.indexOf('## 7. Backward compatibility', secStart);
  if (secEnd < 0) throw new Error('cannot find the end of RFC_V24-04.md section 6');
  const body = rfcSrc.slice(secStart, secEnd);

  const found = [];
  const rx = /NAC\.conformance_tier\s*=\s*\n?\s*'([^']+)'/g;
  let m;
  while ((m = rx.exec(body))) {
    if (found.indexOf(m[1]) < 0) found.push(m[1]);
  }
  if (found.length !== 3) {
    throw new Error('RFC_V24-04.md section 6 yielded ' + found.length + ' conformance_tier value(s), expected 3: ' + found.join(', '));
  }
  return found;
}
