# How the nine translations of the specification are produced

Decision D-05, option B, owner 2026-10-27: *"Hagamos las traducciones
ahora, asi luego durante la evolucion solo las vamos manteniendo."*

This is the procedure, and it is the procedure a RELEASE follows too --
there is no separate "first pass" ritual. The first pass is the one
where every unit is stale.

---

## The shape

| artifact | who owns it | hand edited? |
|---|---|---|
| `SPEC.md` | the editor | yes, it is the normative English |
| `i18n/<locale>/SPEC.units.md` | the translator of that locale | yes, this IS the translation |
| `i18n/<locale>/SPEC.md` | `scripts/build-spec-translations.mjs` (body) + `scripts/build-translation-banners.mjs` (frontmatter + banner) | **never** |
| `i18n/<locale>/SPEC.html` | the same two producers | **never** |

The nine locales are `es pt fr it de ja zh hi ar`. English is not a
translation of itself: it is the normative text (SPEC 4.3.2).

## The unit model, in one paragraph

`SPEC.md` is split into blocks that cover every line of the file.
Blank runs, horizontal rules and fenced code blocks are **verbatim**:
never translated, never stored, spliced from the English by the
producer, so a code sample cannot drift. Everything else -- headings,
paragraphs, lists, tables, blockquotes -- is a **unit**, and a unit's
key IS the sha256 of its English text. That is the whole maintenance
story: when a release edits one paragraph, exactly one key disappears
and one appears, so the next pass translates six blocks and not a
document.

## The pass

```
# 1. refresh the stores against today's English (keeps every existing
#    translation, drops what the English no longer has, seeds the new)
node scripts/build-spec-translations.mjs --template all

# 2. see what each locale owes
node scripts/build-spec-translations.mjs --stats

# 3. cut the work into fragments (untracked, .translation-parts/<loc>/)
node scripts/build-spec-translations.mjs --parts <locale> 6

# 4. translate the fragments (see the rules below), then fold them in
node scripts/build-spec-translations.mjs --merge <locale> .translation-parts/<locale>/part-*.md

# 5. produce the nine pages and their banners
npm run build:translations

# 6. the gate
npm run check:translations
```

## The rules a translated unit MUST satisfy

These are not style advice. `scripts/build-spec-translations.mjs`
compares them against the English and **refuses** the translation that
breaks one, naming the unit. It is what makes publishing nine
languages nobody on the team reads a verifiable act instead of an act
of faith.

1. **Keep the marker.** Copy the `<!-- u <key> | ... -->` line
   unchanged except for deleting the trailing ` | en` flag. Never edit
   a key. Never add, remove or reorder entries.
2. **Code spans are copied byte for byte.** Anything inside backticks
   is an API name, an attribute, a verb, an event, an error code, a
   path or an identifier. It is never translated and never retyped.
3. **Numbers keep their ASCII digits.** `2.5.1`, `83`, `4.3.2`. No
   localised digit forms (no Arabic-Indic, no full-width): a number in
   a normative document has to be readable by the same eye that reads
   the English.
4. **Link targets and URLs are identical.** Translate the visible text
   of `[text](target)`, never the target.
5. **Heading numbering and level survive.** `### 5.1.4 Action payload`
   becomes `### 5.1.4 <translated title>`, same `#` count, same
   number.
6. **Tables keep their row and column count**, separator row included.
   Lists keep their item count.
7. **Normative verbs stay normative.** MUST / SHOULD / MAY get the
   normative form of the target language, and the same one every time.
   Terminology is consistent across all 282 units of a locale.
8. **Established jargon is not forced.** If the target language leaves
   "shadow DOM", "manifest" or "plugin" in English, leave them.
9. **No bidi control characters** in the right-to-left locale: the
   page declares `dir="rtl"` and the browser does the rest. Invisible
   characters would break the identity comparison for no gain.

## The no-veto rule

**A stale translation never blocks the publication of the normative
English.** It is written HERE, and it is enforced by the exit code of
the producer: being behind the English is reported, loudly and per
unit, and exits 0. Nine machine artifacts do not get veto power over a
release. `scripts/test-spec-translations.mjs` asserts that exit code --
it is the one case in that suite that asserts an ALLOWED state.

Where it is NOT yet written: SPEC 4.3.2. The wording is drafted,
translated into the nine and verified, and it could not land in 2.5.1
because the published contract carries the sha384 of `SPEC.md`
(`scripts/build-contract-api.mjs`), so editing the normative document
moves the contract of a version that already shipped and the gate
refuses it. That is the method working, not a problem to route around.
The text and the measurement are in `docs/d-05-4.3.2-delta.md`; it
needs a 2.5.2, which is the owner's call because it needs the owner's
signature.

What *is* fatal: an identity violation (rule 2 to 6), a page edited by
hand instead of produced, and an entry flagged untranslated that does
not hold the English text -- the accident of a translator who did the
work and forgot to clear the flag, which would otherwise publish
English under a complete-looking banner.

And the honest limit of all this: the lock proves that a translation
carries the English identities and the English structure. **It proves
nothing about whether the prose says what the English says.** No gate
in this repository claims otherwise.

## Where the coverage number comes from

`scripts/build-translation-banners.mjs` measures it from this same
data -- units translated over units total, and sections fully
translated over sections -- and re-renders the banner of each page from
a template to compare it byte for byte. So the banner cannot claim a
coverage the store does not have, which was the defect D-03 found and
the reason the nine May pages could sit at 34 of 83 for five months
without saying so.

## What the first full pass actually cost, measured

Recorded so the next pass is estimated from a number and not from a
feeling.

| | |
|---|---|
| translatable units per locale | 282 (of 672 blocks; 390 are verbatim) |
| English words in those units | 8 942 |
| locales | 9 (`es pt fr it de ja zh hi ar`) |
| first pass total | 2 538 units, ~80 000 English words |
| engine | `anthropic/claude-opus-5`, recorded in each store header |
| defects the identity lock caught in its own corpus | 5 (3 of them defects OF the lock, 2 real translation errors) |
| per-release delta, measured on the one English edit of this pass | 2 units per locale, 281 of 283 kept untouched |

That last row is the whole argument for content-addressed keys: a
one-paragraph edit to section 4.3.2 left 281 of 283 units in place and
asked for 2. A pass is a document once; after that it is a delta.
