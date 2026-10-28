# PENDING -- nac-spec / NAC3

Open work carried by the Urazuke method. One entry per item, with the acceptance
criterion written as the verification that closes it. Nothing closes on a
promise: an item closes when its criterion is measured green.

---

## PRE-3 -- Publication contract, gated  [IN PROGRESS -- the gate is built; criterion 1 is an owner decision]

**Origin:** station N0, prerequisite P8 (`docs/ELIGIBILITY.md`).
**Owner of the decision:** the project owner.
**Registry id:** `PND-067`.
**Status:** open, **narrowed on 2026-10-28**. **No longer blocking:** the owner
decided GO (option 1) on 2026-10-28, which puts this item inside the takeover as
its first task instead of in front of it (`docs/ELIGIBILITY.md` section 4). The
acceptance criterion below is unchanged -- what moved is the queue position, not
the bar.

**Re-measured 2026-10-28 against the published 2.5.2 (what is now DONE):**

* The divergence is gone. `npm pack @nac3/runtime@2.5.2`, unpacked and compared
  file by file against `runtime/`: **22 of 22 identical, 0 differing lines**,
  normalised for line endings. The shipped `SPEC.md` declares 2.5.2 and the
  shipped dist headers declare Apache-2.0.
* The CDN channel is identical to the repository copy: HTTP 200, 349 103 bytes,
  **0 differing lines**.
* The CDN channel now has its gate: the deploy workflow smoke-checks the served
  tree and then runs `verify-contract-api --expect-head-from-repo` against the
  host, with its red cases exercised in the same run.
* `check-version-coherence.mjs` closes the cause of the alpha.5 incident -- the
  version is declared once and every consumer must agree -- in CI and in
  `prepublishOnly`.

**Built on 2026-10-28, the first task of the takeover (registry `PND-067`):**

* **Something reads the registry back.** `scripts/verify-npm-publication.mjs`
  fetches the packument, downloads the published tarball, checks its bytes
  against the integrity hash the registry recorded, unpacks it and compares
  every file against `runtime/` -- in both directions, so a file shipped that
  the repository does not declare is as wrong as a declared file not shipped --
  plus the version inside the tarball's own manifest. Measured against the real
  published 2.5.2: **22 of 22 files identical, 0 differing lines.**
* **The witness is the tree AT the published version, not today's tree.** Found
  on the gate's own first run, which went red against its own commit: the
  contract says an adopter installing version X receives what the repository
  declared at X, and between releases the tree legitimately moves on.
  `--witness-release` resolves the `release(<version>)` commit and compares
  against that; when it cannot resolve one it **fails closed** and names the
  cause (a shallow clone -- which is why CI now checks out with full history --
  or no release cut for that version) instead of quietly comparing against
  whatever is on disk. Three checks in the suite keep that from degrading.
* **Two modes, because "not published yet" is not a divergence.** Release mode
  passes a version the tree declares and the registry does not have yet, and
  fails a published version that no longer matches. Post-publish mode requires
  the version to be there. A gate that cannot tell those apart gets switched
  off; this one is tested on the distinction.
* **An unreachable registry is its own answer**, never a divergence and never a
  pass. `--allow-offline` exists for deliberate offline work and is absent from
  CI.
* **Wired to run by itself:** release mode in `npm run check:release` and in
  `.github/workflows/deploy.yml` on every push; post-publish mode in
  `postpublish` of `runtime/package.json`, so the publish command verifies its
  own result; the red-case suite in CI next to it.
* `runtime/PUBLISH_INSTRUCTIONS.md` rewritten: the old one described a first
  publish from `packages/nac/` at version 2.2.0 into an organisation the package
  is not published under. None of it was true.

**What is still missing (acceptance criterion 1, and only that):**

* The package is still published **by hand** from the owner machine. Publishing
  from CI needs an automation token as the `NPM_TOKEN` repository secret, which
  is the owner's decision to take (secrets are held by one person -- answer Q3).
* Stated plainly, so the gain is not overclaimed: a divergent publication can no
  longer go **unnoticed** -- the publish command reports it and every later push
  reports it -- but it can still **happen**, because nothing prevents a human
  publishing at the wrong moment. Criterion 1 is what closes that, and it waits
  on the token decision.

**What was wrong, measured (2026-10-24) -- historical, now fixed:**

* The npm channel ships the previous version's specification: `SPEC.md` inside
  `nac3-runtime-2.5.0-alpha.5.tgz` has 1 443 lines and declares
  **2.5.0-alpha.4**, against 1 621 lines and alpha.5 in the repository -- 835
  differing lines.
* The same tarball's `dist/*` files declare **"MIT License"** in their header
  while the tarball's own `LICENSE` and the repository both say
  **Apache-2.0**, and still point at `packages/nac/SPEC.md`, a path that no
  longer exists.
* The CDN channel is in sync (identical line for line, modulo CRLF to LF), so
  the two channels disagree with each other about what 2.5.0-alpha.5 is.
* Nothing verifies either channel after a change: the deploy workflow
  smoke-checks the live home page only. It does not publish to npm and does not
  compare the published artefact with the repository. Since production is the
  only deployment target (owner answer Q3), there is no second chance to catch
  a divergence by eye.

**Acceptance criterion (P8 green):**

1. **NOT MET.** One build produces both channels from the same tree, and
   neither channel is published by hand. *(The CDN channel is published by the
   workflow; npm is published by hand.)*
2. **MET, measured 2026-10-28 at 2.5.2 (22/22 files identical; CDN 0 differing
   lines).** A fresh `npm install @nac3/runtime` at version X and a fresh fetch of
   `https://yujin.app/nac-spec/js/nac.js` at version X both yield content
   identical to the repository at that version -- spec text, licence header and
   code -- with the comparison normalised for line endings only.
3. **MET, observed 2026-10-28.** A deliberately introduced divergence in either
   channel makes the gate fail, and that failure was observed at least once.
   *(CDN/contract channel: red cases in CI, as before. npm channel:
   `scripts/test-npm-publication-gate.mjs`, 30 checks, 0 failures -- a local
   registry serves a real tarball built from `runtime/` and the suite breaks one
   thing at a time, asserting the gate refuses AND names what it refused.)*
4. **MET, 2026-10-28.** The check runs after every change, per the owner's
   delivery contract (`docs/ELIGIBILITY.md` section 5, Q5b). *(CDN: every push.
   npm: every push in release mode, plus the publish command itself through
   `postpublish` in `runtime/package.json`.)*

---

## PRE-1 -- Data and backup proof for the CRM example  [NOT BLOCKING]

**Origin:** station N0, prerequisite P6 (`docs/ELIGIBILITY.md`).
**Status:** open, not blocking. The protocol owns no data; this concerns the
example application that consumes it.

**What is missing:** every data class the example generates (tester reports,
waitlist e-mails) documented with its owner, one restore into a test
environment actually executed, and an anonymisation rule per personal field.
The owner answered that no such restore has been proven (Q2).

**Acceptance criterion:** the CRM example has an owner per data class, a copy
path, an anonymisation rule per personal field, and one restore executed and
verified with evidence.

**Why it does not block:** scope. If the takeover ever absorbs the example, this
item becomes blocking and P6 returns to red.

---

## D-05 -- The nine SPEC translations  [DONE 2026-10-27]

**Origin:** decision D-05 (`docs/PENDING_AUDITORIA_2026-10.md#D-05`), option
**B**. The owner deferred it and then reversed the deferral the same day:
*"Hagamos las traducciones ahora, asi luego durante la evolucion solo las vamos
manteniendo."* Registry id `PND-059`.

**Delivered.** All nine locales are complete: 282 of 282 units, 83 of 83
sections each -- 2 538 units, about 80 000 English words, engine recorded in
each store header. The three pieces D-05 required:

| piece | where | proven by |
|---|---|---|
| the text producer | `scripts/build-spec-translations.mjs` + `scripts/lib/spec-units.mjs` | a block round trip over `SPEC.md`, byte for byte |
| the identity lock | the same library | 10 red cases, each asserting the finding NAMES what was broken, plus all 2 538 real units green |
| the no-veto rule | `docs/TRANSLATION_PASS.md`, enforced by the producer's **exit code** | the one case in the suite that asserts an ALLOWED state |

Wired into `npm run check:release`; `scripts/test-spec-translations.mjs` is 33
cases, 0 failures. The procedure for every later release is
`docs/TRANSLATION_PASS.md`.

**The maintenance claim, measured on the real document and not promised:** one
paragraph of English was edited and each locale asked for **2 units**, with 281
of 283 untouched. That is what content-addressed keys buy.

**What did NOT land, and why:** the wording of the no-veto rule in **SPEC
4.3.2**. It is written, translated into the nine and verified; applying it made
`check-version-coherence` and `build-contract-api` refuse, because the
published contract carries the sha384 of `SPEC.md` and that version already
shipped and is signed in the chain. It was reverted, not forced. The text and
the nine translations are in `docs/d-05-4.3.2-delta.md` and
`docs/delta-4.3.2/`; it needs a 2.5.2, which needs the owner's signature.
Tracked as **`PND-061`** (N-51), together with the word **"partial"** that
4.3.2 still uses for translations that are no longer partial.

**N-50 closed by consequence, as the sheet predicted:** there is no vintage to
be silent about. Each banner declares the English revision it translates
(today's) and the coverage (83 of 83), and the `2.2.0` the nine carried inside
their text went away on its own.

---

## Retired

**PRE-2 -- Edge stub for the chat intermediary.** Not needed: the client takes
its endpoint as an injectable option (`js/nac-chat-client.js`, line 671), so a
stand-in can be attached at the edge with no change to the system. The owner
also reclassified the backend as part of the example (Q4).

---

## Defects found at N0, not prerequisites, not to be lost

Recorded here so the takeover inherits them rather than rediscovering them.
Each one closes with a regression test that fails before the fix.

| id | Defect | Where it hurts |
|---|---|---|
| F-1 | 262 files use absolute `/nac-spec/...` references, so 17 documentation screens lose stylesheet and runtime off the production sub-path | the site only works at one mount point |
| F-2 | One shipped demo violates the contract it demonstrates | the demonstration argues against the protocol |
| F-4 | Five legacy stage scripts pass but are outside the gate | enforced coverage is narrower than available coverage |
| F-6 | The landing page claims "eight live demos" while 22 ship | the product misstates itself |
| F-8 | The voice and text path cannot be exercised without the real intermediary | no deterministic test of the flagship flow |
