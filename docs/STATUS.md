# STATUS -- nac-spec (NAC3), living state

**Refreshed: 2026-10-30** by Forge, at station N2 of the Urazuke ladder.
Map: `docs/SEMANTIC_TREE.md` · Discrepancies: `docs/DISCREPANCIES.md` ·
Owner's decisions: `docs/DECISIONS.md` ·
Contract: `docs/WORKING_AGREEMENT.md` · Session bootstrap: `CLAUDE.md`.

This file is the **state**, not the story. Every number below was produced by
running the command next to it on the date next to it. A number with no command
and no date does not belong in this file (working agreement rules 5 and 14).

---

## 1. What is published right now

| Thing | Value | How it was checked |
|---|---|---|
| Authoritative version | **2.5.2** | the `version:` constant of the `NAC` export at the end of `js/nac.js` |
| Spec version | **2.5** (normative text declares 2.5.2) | `SPEC.md` line 3 |
| npm package | `@nac3/runtime@2.5.2`, Apache-2.0, channel `latest` | `npm run check:npm` -- 22 of 22 files identical to the tree of that version, 0 differing lines |
| Site | `https://yujin.app/nac-spec/` serving this tree | post-deploy smoke check inside CI run 41048418059 |
| Contract API | `api/latest/` mirrors 2.5.2 (stable); prerelease head 2.5.0-alpha.5 | `api/latest.json`, `npm run verify:contract` |
| Pinned runtime copies | `js/2.5.0`, `js/2.5.0-alpha.5`, `js/2.5.1`, `js/2.5.2`, each with its SRI hash | `js/integrity.json`, `npm run check:integrity` |
| Last commit on `main` | `37446d4` (2026-10-30) | `git log` |
| Last CI run | **41048418059 -- success**, 51 s, on `37446d4` | `gh run list` |

---

## 2. The chain (which is the characterization battery -- there is no test environment)

| Gate | Command | Last result |
|---|---|---|
| Full pre-push gate | `npm run check:release` | **green** 2026-10-30, 14 scripts |
| Runtime suites | `cd runtime && npm test` | **green** 2026-10-30 -- 14 suites, **386 PASS, 0 FAIL** |
| Published-package lock | `npm run check:npm` | **green** -- and its red proof `npm run test:npm-gate` passes **31 of 31** cases |
| Spec translations | `npm run stats:translations` | **green** -- canonical 283 units / 83 sections; all nine locales 283/283, 83/83, no orphans |
| Integrity, stylesheets, mount path, version coherence, contract API, landing i18n, translation banners | each in `check:release`, each with its own red proof | **green** |
| Mount path lock | `npm run check:mount` | **green** 2026-10-30 -- 321 pages, 812 references under the mount, 57 relative `<script>` srcs resolved, 10 of 10 declaration sites agreeing; its red proof `npm run test:mount-gate` passes **21 of 21** cases |
| Full deploy chain | push to `main` | **green**, 22 steps, run 41048418059 |

**Not in the chain**, declared so nobody reads "green" as "everything here is
tested":

* `test:limits` and `test:cli-levels` need a browser and do not run in CI (PND-049).
* Five suites exist under `runtime/test/` and are **not** in `npm test`:
  `stage1-audio`, `stage3-backend`, `stage4-calls`, `stage6-ack`,
  `stage6b-longtail` (finding F-4; waiting for a decision as D-03).
* The Playwright demo runners and the Pilot runners (16 scripts under `scripts/`)
  are never called by CI; what exists is dated evidence under `evidence/`
  (waiting for a decision as D-07).

---

## 3. Shape of the repository (re-measured 2026-10-30, `git ls-files`)

| Item | Value |
|---|---|
| Tracked files | 1036 |
| JavaScript sources (`*.js`) | 34 |
| Tooling and tests (`*.mjs`) | 78 |
| PHP reference demos | 13 |
| HTML documents | 308, of which **236** are localised copies under `i18n/` |
| Markdown | 343 total, 53 of them under `docs/` |
| Runtime dependencies | **zero** |
| Root dependencies | `playwright` (dev only) |
| Branches | `main` plus 4; three are 0 commits ahead (history markers), one is stale (H-2) |
| Commits on `main` | 123 |

The previous measurement (2026-10-24, `docs/INITIAL_SURVEY.md` v1) read 914
tracked files; the growth is the per-locale translation store, the new locks and
their red proofs, and the Urazuke documents.

---

## 4. Where the method is

| Item | State |
|---|---|
| Ladder | `WFL-001`, Urazuke for an inherited system, 27 tasks |
| Station N0 (eligibility) | **closed** 2026-10-28 with the owner's GO |
| Station N1 (working agreement) | **closed** 2026-10-30; contract v1.2 accepted in full |
| Station N2 (this reading) | **in flight.** The five artefacts exist; **1 of 8 discrepancies decided** (D-01, owner, 2026-10-30, in `docs/DECISIONS.md`); it closes when the owner decides the other seven |
| Sizing gate (G9) | **missing** -- load-bearing construction is blocked until the owner gives the volumetry, the retention and the hardware envelope |
| Open pending items | **45** (`yujin.pending.list`, 2026-10-30): 25 are the remaining ladder tasks, 20 are work |
| Top three by priority | PND-067 (publish from CI, needs a repository secret), PND-030 (execute the external audit remediation), PND-056 (the contract signing key has no passphrase) |

---

## 5. What is red today, in one list

1. **The npm channel is published by hand.** The lock now refuses a divergent
   publication from three places, so a divergence cannot pass unnoticed -- but it
   can still happen. Needs an `NPM_TOKEN` repository secret (PND-067, owner).
2. **Six of the eight discrepancies are waiting for a decision**
   (`docs/DISCREPANCIES.md`). D-01 and D-02 were decided by the owner on
   2026-10-30 (`docs/DECISIONS.md`); what they left open is PND-072 (D-01) and
   PND-074 plus PND-075 (D-02). None of the other six is being worked until the
   owner decides it.
3. **The landing does not declare half of its own surface**: 116 painted ids
   against 50 declared in its manifest (PND-038), and six declared actions never
   confirm, so an agent calling them eats a five-second timeout (PND-048).
4. **The signing key of the contract API lives without a passphrase** on a
   machine where several agent sessions run, so the signature is not technically
   attributable to the owner (PND-056, owner).
5. **The whole of `docs/` is served publicly** at unlinked but guessable URLs
   (PND-068, owner). `CLAUDE.md`, the working agreement and the three new N2
   documents are excluded from the upload; everything else is live.
6. **The benchmark numbers have not been re-run** on the current release, and the
   landing says so out loud (PND-040).

---

## 6. How to refresh this file

Run these, in this order, and write what came back with today's date:

```
npm run check:release          # the whole gate, 14 scripts
cd runtime && npm test         # 14 suites; count the PASS lines
npm run stats:translations      # the nine locales, per unit and per section
npm run check:npm              # the published package against the tree of its version
gh run list --limit 1          # the last CI run and its conclusion
git ls-files | wc -l           # the shape of the tree
```

A value that comes back different from the one above is not an error of this
file: it is the new state, and this file is wrong until someone updates it. A
value that **cannot be reproduced** gets retired rather than rounded (working
agreement rule 14).
