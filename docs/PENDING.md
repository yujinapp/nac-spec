# PENDING -- nac-spec / NAC3

Open work carried by the Urazuke method. One entry per item, with the acceptance
criterion written as the verification that closes it. Nothing closes on a
promise: an item closes when its criterion is measured green.

---

## PRE-3 -- Publication contract, gated  [BLOCKING for P8]

**Origin:** station N0, prerequisite P8 (`docs/ELIGIBILITY.md`).
**Owner of the decision:** the project owner.
**Status:** open. Blocking, while P8 stays red.

**What is wrong, measured (2026-10-24):**

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

1. One build produces both channels from the same tree, and neither channel is
   published by hand.
2. A fresh `npm install @nac3/runtime` at version X and a fresh fetch of
   `https://yujin.app/nac-spec/js/nac.js` at version X both yield content
   identical to the repository at that version -- spec text, licence header and
   code -- with the comparison normalised for line endings only.
3. A deliberately introduced divergence in either channel makes the gate fail,
   and that failure was observed at least once.
4. The check runs after every change, per the owner's delivery contract
   (`docs/ELIGIBILITY.md` section 5, Q5b).

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
