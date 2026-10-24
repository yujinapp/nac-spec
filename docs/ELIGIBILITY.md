# ELIGIBILITY -- nac-spec / NAC3

**Sheet version:** 2 (owner's answers incorporated; one new red)
**Date:** 2026-10-24
**Method:** Urazuke, station N0 (normalisation of the legacy)
**Executor:** Forge (agent)
**Decider:** the project owner -- **decision pending confirmation** (see section 4)
**Criteria used:** `docs/ELIGIBILITY_CRITERIA.md`
**Intake facts:** `docs/INITIAL_SURVEY.md`
**Receipts v1:** `docs/EVIDENCE_N0.md`
**Recovered functionality:** `docs/FUNCTIONALITY_RECOVERED.md`
**Change log:** v1 -> v2. Section 5 filled with the owner's answers. P6 and P7
re-coloured on those answers. A claim in P5 was withdrawn and moved to a new
row, P8, which is RED. Sections 6 and 7 added.

---

## 1. The sheet

| # | Prerequisite | Colour | Evidence (what was done, what happened) |
|---|---|---|---|
| **P1** | A complete environment can be brought up from the repository and a copy of the data | **GREEN** | Built the runtime from sources (`npm run build`, exit 0, 0.56 s), served the system locally with PHP, and opened **51 of 51 screens, all HTTP 200**. There is no data to copy: the system holds none (see P6), and the demo data is hard-coded in the pages. What did **not** come up cleanly: 17 documentation screens lose their stylesheet and runtime when served off the production sub-path, because 262 files use absolute `/nac-spec/...` references (finding F-1). This is a defect, not an obstacle to bring-up. |
| **P2** | The code can be read, understood and worked with, module by module | **GREEN** | Read the whole surface: core runtime (8 134 lines, 68 named sections, 257 public functions), the v2 extension layer (tables, navmap, editor, interop, auto-register), the chat client, the MCP bridge, the tester reporter, and the 14 enforced test suites. Every module has a stated responsibility. Six items resist full understanding and are named with their reason in `docs/FUNCTIONALITY_RECOVERED.md` part F. **None of them is load-bearing for reading or changing the code.** |
| **P3** | The functionality can be recovered from the code alone, for an end user | **GREEN** | `docs/FUNCTIONALITY_RECOVERED.md` written: 14 processes, 51 screens with a verdict each, an explicit "what this system does not do" section, six inferred statements marked `[INF]`, and the list of open understanding points. |
| **P4** | Every screen can be driven by a test tool, each element accessible, the backend effect checkable -- proven with one real end-to-end test | **GREEN** | Inventory of all 51 screens measured mechanically: 27 publish a NAC manifest and on those **100 % of reported elements are addressable** by `data-nac-id` (27/27 fully addressable). Wrote and ran a real browser test of one complete flow -- invoice: open, add line, edit quantity, save -- **all checks green**, including the rule enforcement (editing a non-editable or computed column is refused) and the commit landing in the audit log. Caveats, both recorded: 324 interactive elements on the site carry no identifier (concentrated on documentation pages), and there is no *server* effect to assert because the system has no server -- the assertable effect is the runtime state (F-5, F-7). |
| **P5** | The system builds and runs with today's tools, every unresolved dependency named | **GREEN** | On Node 22 / npm 11 / PHP 8.3: `npm test` green (14 suites, **386 assertions, 0 failures**), `npm run build` green, **zero runtime dependencies**, production site live (HTTP 200), CI green. **Unresolved dependencies: none** -- the only unresolved dependency is a service, not a package. Caveat F-4: five legacy stage scripts exist and pass individually but are **not** part of the test gate, so the enforced coverage is narrower than the available coverage. *Corrected in v2: v1 also claimed that the npm artefact matches the repository. That claim was measured and is false; it is now row P8.* |
| **P6** | Production data can be copied and anonymised into a test environment, and a backup exists and has been restored | **GREEN (scoped)** | Re-coloured on the owner's answers Q1 and Q2 (section 5). **This system owns no data.** It is a protocol plus its web presentation: no database, no accounts, no server-side persistence; demo data is hard-coded in the pages. The only personal data it can emit -- tester reports, waitlist e-mails -- is posted to a CRM that the owner classified as a **consumer example**, not part of the object of the method. There is therefore no production dataset of this system to copy or anonymise, and none to restore: the artefact's backup is the git history, and its restore is a checkout plus a redeploy, which P1 already exercised. **Residual, non-blocking:** nobody has proven a restore of the CRM example's own data (PRE-1). That belongs to the example, not to the protocol. **If the takeover scope ever absorbs the CRM demo, this row returns to RED and PRE-1 becomes blocking.** |
| **P7** | Every external integration has a test mode or can be isolated at the edge | **GREEN** | The protocol itself has **zero** external integrations: it is a browser-side library with no runtime dependencies and no required network call. The only calls sit inside example pages, and each is replaceable at the edge without touching the system: the chat client accepts `opts.endpoint` (js/nac-chat-client.js, line 671), so a local stand-in needs no change to the artefact; the tester reporter degrades to a local draft and then to e-mail; the waitlist falls back to e-mail. Probing confirmed the demo endpoint is alive and validating (GET 405, empty POST 422). The owner's answer Q4 reclassified that backend as an example, so the v1 condition ("the owner must explicitly accept the consequence") is satisfied by scope, not by exception. PRE-2 is retired. |
| **P8** | The artefact is actually served the way the product is contracted to be served, and that is verified after every change | **RED** | The owner defined the delivery contract in answer Q5b: two channels, `npm install @nac3/runtime` and `<script src="https://yujin.app/nac-spec/js/nac.js">`, both to be checked after every change. **Measured, channel by channel:** (a) CDN channel **GREEN** -- the served `js/nac.js` is 344 665 bytes against 352 798 in the repository, and the two are identical line for line; the 8 133-byte gap is exactly the CRLF-to-LF conversion performed by the server. (b) npm channel **RED** -- tarball `nac3-runtime-2.5.0-alpha.5.tgz` ships a `SPEC.md` of **1 443 lines describing 2.5.0-alpha.4**, against 1 621 lines and alpha.5 in the repository: **835 differing lines**, the protocol spec one version behind the version number on the tin. Its three dist files differ from the repository build on 4 lines each, and one of those lines declares **"MIT License"** where the repository and the tarball's own `LICENSE` file both say **Apache-2.0**. The tarball's header also still points at `packages/nac/SPEC.md`, a path that no longer exists. (c) **Nothing verifies either channel after a change:** `.github/workflows/deploy.yml` smoke-checks the live home page only; it does not publish to npm, does not compare the published artefact with the repository, and would not have caught any of the above. Measurements in section 7. **Prerequisite project PRE-3.** |

**Result: 7 green, 1 red.** The remaining red is not about the code: it is that
the two channels the product is contracted to be served through are not held in
sync, and no gate checks that they are.

## 2. What the sheet means in plain words

* The system **can be taken over**. It builds, it runs, it is testable, its code
  is readable, and its functionality can be described to an end user without
  asking anyone.
* The scope question is now settled by the owner: the object is **the protocol
  and its web presentation**, permanently evolutive. The CRM is an example of a
  consumer, not the product. That single answer turns the two conditional rows
  (P6, P7) green, because neither the data nor the integrations belong to the
  object any more.
* The one thing that is genuinely wrong today is at the **exit door**: an
  adopter who installs the package receives the previous version's
  specification, plus a licence line that contradicts the licence file next to
  it. And nothing in the pipeline would tell us.
* Two **defects** were found that do not block the takeover but should not
  survive it: the site only works under its production sub-path (F-1), and one
  shipped demo violates the contract it demonstrates (F-2).
* Two **integrity issues** remain from v1: five test stages are unenforced
  (F-4), and the landing page claims "eight live demos" while 22 ship (F-6).

## 3. Prerequisite projects

| id | Blocking? | Prerequisite project | Acceptance criterion |
|---|---|---|---|
| PRE-3 | **YES**, if P8 stays red | **Publication contract, gated**: make one build produce both channels from the same tree, republish the package so that the shipped spec and licence match the repository, and add a gate that fails when either channel diverges from the repository (published `js/nac.js` versus source; published tarball content versus source). | P8 verified green: a fresh `npm install @nac3/runtime` and a fresh fetch of the CDN URL both yield content identical to the repository at the same version, and a deliberately introduced divergence makes the gate fail. |
| PRE-1 | no | **Data and backup proof for the CRM example**: document every data class the example generates, state the owner, execute one restore into a test environment, write the anonymisation rule per personal field. | The CRM example, if it is ever taken into scope, has an owner, a copy path and a proven restore. |
| PRE-2 | retired | Edge stub for the chat intermediary. | Not needed: the endpoint is already an injectable option (Q4 answer, P7). |

## 4. The decision

Options, as defined in `docs/ELIGIBILITY_CRITERIA.md` section 3:

1. **Go** -- take the system over; continue from station N1. P8 is worked as the
   first task of the takeover, not as a precondition.
2. **Go after these prerequisite projects** -- PRE-3 becomes a blocking pending
   item and the takeover waits for it.
3. **No-go** -- do not apply the method to this system.

**Decision: pending confirmation.** The owner has stated the scope (evolutive,
protocol plus web presentation) and has answered all open questions, and the
working instruction on record is to proceed in Urazuke. Section 5 records the
answers; the decision line needs the owner's word, the date and the decider.

## 5. Questions asked and answers given

| # | Question | Answer (owner, 2026-10-24) |
|---|---|---|
| Q1 | Who uses the system today, and how many? | "NAC3 or nac-spec is a protocol of agentic navigability. If you found code for a CRM it is only an example of use. What matters in this repo is validating the consistency of the protocol, and its web presentation." **Effect:** the object of the method is the protocol and its site; the CRM and its demos are consumers. |
| Q2 | Is there any dataset of this system outside the CRM? Has a restore ever been executed and verified? | "NO." **Effect:** no dataset of this system exists to copy, anonymise or restore; P6 re-coloured green by scope, with PRE-1 left to the example. |
| Q3 | Are the deploy secrets held by one person? Is staging acceptable? | "Yes. I hold them. Production is the only target for now." **Effect:** single holder of the deploy credentials; no staging environment; every publication is straight to production, which raises the value of PRE-3. |
| Q4 | Who owns the chat intermediary, is there a sandbox key, what does it cost per month? | "I do not remember this one, give me more detail." **Detail supplied (section 6).** On that detail the owner reclassified the backend as part of the example. |
| Q5a | Scope: evolutive or corrective? | "NAC3 is permanently evolutive." **Effect:** every change must leave the spec, the site and the published artefact consistent, which is exactly what P8 measures. |
| Q5b | How must the product be served? *(raised by the owner, not asked)* | "This protocol exists and must be served as follows, and it must be verified after every change: `npm install @nac3/runtime`, or via CDN `<script src="https://yujin.app/nac-spec/js/nac.js">`." **Effect:** this is the delivery contract. Its verification became P8, and it is the only red. |

## 6. What the chat intermediary is (the detail asked for in Q4)

There is no server in this repository. The chat panel of the demos is a browser
client (`js/nac-chat-client.js`, 1 100-odd lines) that does two things: it
translates a spoken or typed sentence into a NAC3 action by asking a language
model, and then it executes that action against the page. The asking part needs
a backend, because no model key can live in a browser.

That backend is the "intermediary". From the code:

* the client posts to a **relative** path, `/crm/api/v1/yujin/nac-demo`, so it
  inherits whatever host serves the page -- in production, the Yujin app;
* the comment at the top of the file describes the other half as a Yujin LLM
  intermediary with **Claude Sonnet as primary and DeepSeek as fallback**;
* the path is an option: `NacChat._endpoint` can be overridden by
  `opts.endpoint`, so the whole backend can be swapped without touching this
  repository;
* no key, token or model name is present in the repository -- only that
  relative path;
* probing it alive: `GET` returns 405 and an empty `POST` returns 422, so the
  route exists and validates its input. A well-formed call was not made,
  because that would have consumed paid capacity on production.

What the repository cannot tell, and what the question was asking: **whose code
the other half is** (it lives under the CRM application's route space, which is
why it was attributed to the CRM in v1), **whether a sandbox key or a sandbox
host exists**, and **what it costs per month at current usage**. The owner's
answer reclassifies it: it belongs to the example, and since the endpoint is
injectable, the protocol does not depend on it.

## 7. Measurements behind P8 (reproducible)

| Check | Command, in effect | Result |
|---|---|---|
| Local `js/nac.js` | read | 352 798 bytes |
| CDN `js/nac.js` | `fetch https://yujin.app/nac-spec/js/nac.js` | 344 665 bytes, HTTP 200, **identical line by line**; the size delta is CRLF to LF (8 133 bytes) |
| npm tarball | `npm pack @nac3/runtime` -> `nac3-runtime-2.5.0-alpha.5.tgz` | unpacks |
| `dist/nac.browser.js` | compare against `runtime/dist/nac.browser.js` | 8 136 lines both, **4 differing**: stale spec path (`packages/nac/SPEC.md`), **"MIT License"** against "Apache-2.0", and a narration line quoting `version: '2.4.0'` where the repository has `2.5.0-alpha.5` |
| `dist/nac.mjs`, `dist/nac.cjs` | same | 4 differing lines each, same four causes |
| `SPEC.md` | compare against repository `SPEC.md` | **1 443 against 1 621 lines; 835 differing**; the shipped copy declares **2.5.0-alpha.4** where the repository declares 2.5.0-alpha.5 |
| tarball licence | `package/LICENSE` | Apache License, 202 lines -- contradicts the "MIT License" header inside the shipped dist |
| CI | `.github/workflows/deploy.yml` | publishes the site over rsync, smoke-checks the live home page only; **no npm publish, no artefact comparison** |
