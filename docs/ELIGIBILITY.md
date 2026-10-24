# ELIGIBILITY -- nac-spec / NAC3

**Sheet version:** 1 (presented for decision)
**Date:** 2026-10-24
**Method:** Urazuke, station N0 (normalisation of the legacy)
**Executor:** Forge (agent)
**Decider:** the project owner -- **decision not taken yet**
**Criteria used:** `docs/ELIGIBILITY_CRITERIA.md`
**Intake facts:** `docs/INITIAL_SURVEY.md`
**Receipts:** `docs/EVIDENCE_N0.md`
**Recovered functionality:** `docs/FUNCTIONALITY_RECOVERED.md`

---

## 1. The sheet

| # | Prerequisite | Colour | Evidence (what was done, what happened) |
|---|---|---|---|
| **P1** | A complete environment can be brought up from the repository and a copy of the data | **GREEN** | Built the runtime from sources (`npm run build`, exit 0, 0.56 s), served the system locally with PHP, and opened **51 of 51 screens, all HTTP 200**. There is no data to copy: the system holds none (see P6), and the demo data is hard-coded in the pages. What did **not** come up cleanly: 17 documentation screens lose their stylesheet and runtime when served off the production sub-path, because 262 files use absolute `/nac-spec/...` references (finding F-1, `docs/EVIDENCE_N0.md`). This is a defect, not an obstacle to bring-up. |
| **P2** | The code can be read, understood and worked with, module by module | **GREEN** | Read the whole surface: core runtime (8 134 lines, 68 named sections, 257 public functions), the v2 extension layer (tables, navmap, editor, interop, auto-register), the chat client, the MCP bridge, the tester reporter, and the 14 enforced test suites. Every module has a stated responsibility. Six items resist full understanding and are named with their reason in `docs/FUNCTIONALITY_RECOVERED.md` part F (the server half of the chat intermediary; the five backend adapter strategies; the full provenance-hashing argument; the provenance of two 375 KB generated bundles; why five stage scripts were dropped from the gate; who owns the deploy secrets). **None of them is load-bearing for reading or changing the code.** |
| **P3** | The functionality can be recovered from the code alone, for an end user | **GREEN** | `docs/FUNCTIONALITY_RECOVERED.md` written: 14 processes, 51 screens with a verdict each, an explicit "what this system does not do" section, six inferred statements marked `[INF]`, and the list of open understanding points. |
| **P4** | Every screen can be driven by a test tool, each element accessible, the backend effect checkable -- proven with one real end-to-end test | **GREEN** | Inventory of all 51 screens measured mechanically: 27 publish a NAC manifest and on those **100 % of reported elements are addressable** by `data-nac-id` (27/27 fully addressable). Wrote and ran a real browser test of one complete flow -- invoice: open, add line, edit quantity, save -- **all checks green**, including the rule enforcement (editing a non-editable or computed column is refused) and the commit landing in the audit log. Caveats, both recorded: 324 interactive elements on the site carry no identifier (concentrated on documentation pages), and there is no *server* effect to assert because the system has no server -- the assertable effect is the runtime state (F-5, F-7). |
| **P5** | The system builds and runs with today's tools, every unresolved dependency named | **GREEN** | On Node 22 / npm 11 / PHP 8.3: `npm test` green (14 suites, **386 assertions, 0 failures**), `npm run build` green, **zero runtime dependencies**, npm artefact `@nac3/runtime@2.5.0-alpha.5` matches the repository, production site live (HTTP 200), CI green. **Unresolved dependencies: none** -- the only unresolved dependency is a service, not a package. Caveat F-4: five legacy stage scripts exist and pass individually but are **not** part of the test gate, so the enforced coverage is narrower than the available coverage. |
| **P6** | Production data can be copied and anonymised into a test environment, and a backup exists and has been restored | **RED** | **Not verified -- and the repository cannot verify it.** The code establishes that this system has no database, no accounts and no server-side persistence; the only personal data it produces (tester reports, waitlist e-mails) is posted to the Yujin CRM, which is outside this repository. What could not be established from here: (a) whether anyone has ever restored that CRM data and verified the restore, (b) who owns the copy/anonymisation procedure, (c) whether the produced data classes are complete. **Prerequisite project required** (see section 3). |
| **P7** | Every external integration has a test mode or can be isolated at the edge | **GREEN (conditional)** | Four integrations enumerated from the code and probed alive: the chat intermediary (GET 405 / empty POST 422 -- it exists and validates), tester reports (primary + sandbox endpoint + local draft + e-mail fallback), the waitlist (e-mail fallback), and the deploy pipeline (rsync to shared hosting, post-deploy smoke check of the live URL). Three of the four are replaceable at the edge. **The fourth -- the chat intermediary -- has no stub and no sandbox in this repository** (F-8): the voice/text path cannot be exercised without it. This row is green only if the owner **accepts that consequence explicitly**; otherwise it turns red with a prerequisite project "build an edge stub for the chat intermediary". |

**Result: 6 green, 1 red.** The single red is a documentation-and-verification gap
about data ownership, not a defect in the system.

## 2. What the sheet means in plain words

* The system **can be taken over**. It builds, it runs, it is testable, its code
  is readable and its functionality can be described to an end user without
  asking anyone.
* The **one thing missing** is not technical: nobody has written down who owns
  the data this product generates and whether a restore has ever been proven.
  Until that exists, the method cannot promise that we can work on real data
  safely.
* Two **defects** were found that do not block the takeover but should not
  survive it: the site only works under its production sub-path (F-1), and one
  shipped demo violates the contract it demonstrates (F-2).
* Two **integrity issues** were found: five test stages are unenforced (F-4),
  and the landing page claims "eight live demos" while 22 ship (F-6).

## 3. Prerequisite projects that would turn red into green

| id | Prerequisite project | Acceptance criterion |
|---|---|---|
| PRE-1 | **Data and backup proof**: document every data class the product generates (tester reports, waitlist, hosting logs), state the owner of each, execute one restore of the CRM data into a test environment, and write the anonymisation rule for each personal field. | P6 verified green: every data class has an owner, a copy path and an anonymisation rule, and one restore has been executed and verified with evidence. |
| PRE-2 *(only if the owner rejects the consequence of F-8)* | **Edge stub for the chat intermediary**: a local, deterministic stand-in for `/crm/api/v1/yujin/nac-demo` so the voice/text path can be tested without the real service. | P7 green without a conditional: the full sentence -> action -> effect path runs in a test with the stub. |

## 4. The decision

Options, as defined in `docs/ELIGIBILITY_CRITERIA.md` section 3:

1. **Go** -- take the system over; continue from station N1.
2. **Go after these prerequisite projects** -- PRE-1 (and PRE-2 if chosen)
   become blocking pending items; the takeover waits for them.
3. **No-go** -- do not apply the method to this system.

**Decision: pending.** To be filled in by the owner, with the date and the
decider, in section 5.

## 5. Questions asked and answers given

The repository could answer everything except the five points below. They are
recorded here verbatim once answered.

| # | Question | Answer |
|---|---|---|
| Q1 | Who uses the system today, and how many? (testers recruited, adopters, real users of the CRM as reference app) | *pending* |
| Q2 | Is there any dataset of this system outside the CRM? Has a restore of the tester/waitlist data ever been executed and verified, and who owns it? | *pending* |
| Q3 | Are the deploy secrets held by one person? Is a staging host acceptable, or is production the only target? | *pending* |
| Q4 | Who owns the chat intermediary, is there a sandbox key, and what does it cost per month at current usage? | *pending* |
| Q5 | Scope of the takeover: continue NAC3 as a product (evolutive) or keep it alive as a published contract (corrective)? | *pending* |
