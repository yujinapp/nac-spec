# INITIAL SURVEY -- nac-spec (NAC3)

Station: **N0 -- normalisation of the legacy** (Urazuke, legacy entry).
Date: 2026-10-24. Author: Forge (agent). Owner: Pablo Kuschnirof.
Scope of this document: the intake facts that station N0 needs before it can
judge eligibility. Everything here is either read from the repository or
**verified by running it** (commands and outputs in `docs/EVIDENCE_N0.md`).

---

## 1. What this system is (one paragraph)

NAC3 ("Native Agent Contract") is an **open specification plus a browser
runtime** that makes any web interface operable by a voice assistant, a chat
assistant or an AI agent without screenshots and without a robot driving the
mouse. The application marks its own interface with five `data-nac-*`
attributes; the runtime reads that markup and publishes a structured
description of the screen ("manifest"); the agent receives the description and
answers with one structured action; the runtime executes it and records an
audit trail. Everything runs **in the browser**: there is no application
server in this system.

The repository is at the same time:

1. the **normative contract** (SPEC.md, 14 sections),
2. the **reference runtime** (`js/nac.js` + extension layers, published as
   `@nac3/runtime`),
3. the **public site** (spec, demos, benchmark, migration paper, tester
   programme) deployed at `https://yujin.app/nac-spec/`,
4. the **evidence for the commercial pitch** (benchmark, peer reviews,
   migration case study, Conduit case study).

## 2. Shape of the repository (measured)

| Item | Value |
|---|---|
| Tracked files | 914 |
| JavaScript sources | 29 (`*.js`) |
| PHP reference demos | 13 (`*.php`) |
| HTML documents | 305 (of which ~262 are localised copies under `i18n/`) |
| Markdown docs | 28 under `docs/` + root set |
| Runtime version | `2.5.0-alpha.5`, spec `2.5` |
| Published package | `@nac3/runtime@2.5.0-alpha.5` (npm, `latest` = same) |
| Runtime dependencies | **zero** |
| Root tooling dependencies | `playwright ^1.60.0` (dev only) |
| Build | `runtime/build.mjs`, bundles `js/*.js` -> `runtime/dist/` |
| Last commit at survey | `a1a6b4d` |

Language split: the contract and the runtime are **vanilla JavaScript** (no
framework, no bundler at serve time); the demos are `.php` files that contain
only static HTML plus script tags; the two framework demos are real React 18
and Angular 17 builds.

## 3. Who it serves

Three audiences, each with its own surface:

1. **Adopters** (developers) -- install the runtime, annotate their UI, get
   voice/agent control. Docs: `SPEC.md`, `docs/REACT_GUIDE.md`,
   `docs/ANGULAR_GUIDE.md`, `docs/ADOPTION_GUIDE.md`.
2. **Visitors of the public site** -- read the spec, try 13 reference demos,
   watch the guided tour, chat with the page, benchmark, migration paper.
3. **Testers** -- a structured programme with interactive checklists, a report
   form and an admin view (`docs/TESTER_*`, `docs/portal-tester*`).

A fourth audience exists but is **commercial, not technical**: the landing page
sells two products (Yujin Forge USD 10/mo, Yujin Pilot USD 5/mo) and collects a
waitlist.

## 4. Components, by trust boundary

```
 user (voice / text)
        |
        v
 [chat panel]  js/nac-chat-client.js  ---> EXTERNAL: Yujin chat intermediary
        |                                  (Claude Sonnet primary,
        v                                   DeepSeek fallback) -> not in repo
 [NAC runtime] js/nac.js (core, 8.1k lines, 68 sections)
        +    js/nac-v2-extensions.js   (data tables, navmap, editor, interop)
        +    js/nac-mcp-interop.js     (MCP bridge)
        |
        v
 [annotated application]  data-nac-* attributes in the adopter's DOM
```

Boundary notes that matter for eligibility:

* The runtime is **the only place where actions are executed**. It is
  client-side, so "the application's backend" is whatever the adopter's app
  calls -- the runtime never talks to a database.
* The **only** server this project operates is static file hosting
  (GoDaddy, via rsync in CI). There is no API of our own except the two
  endpoints consumed from the landing page (waitlist, tester reports), which
  are owned by the Yujin CRM, not by this repository.
* The chat layer is an **external integration with no local substitute**:
  without that intermediary the voice/text path cannot be exercised.

## 5. Data

| Data class | Where it lives | Inside this repo? | Notes |
|---|---|---|---|
| Source code, spec, docs, demos | Git + static host | yes | the source of truth is the git history |
| Demo data (invoices, todos, catalogue) | hard-coded in the demo pages | yes | fictional, no real persons |
| Tester reports (name, email, verdicts, free text) | external CRM (rpaforce / yujin.app) | **no** | posted through `/api/v1/tester-reports/submit`; localStorage draft + mailto fallback at the edge |
| Waitlist emails | external CRM (`/api/v1/waitlist-signup`) | **no** | mailto fallback at the edge |
| Server logs / analytics | hosting provider | **no** | not instrumented by this repo |
| Credentials | CI secrets (GoDaddy, SSH) | **no** | referenced only by name in `deploy.yml` |

There is **no database, no user account system, no session store and no
server-side persistence** in this system. The data-table demo commits in
memory only (verified: no `on_commit` hook is registered, nothing leaves the
browser). Consequently "copy production data and anonymise it" has an unusual
answer for this project: there is no production dataset *of this system* to
copy. The only personal data produced by it is the tester/waitlist submissions,
which are already external.

## 6. External integrations (complete list, from the code)

| # | Integration | Direction | Where | Test mode / edge isolation |
|---|---|---|---|---|
| 1 | Yujin chat intermediary `/crm/api/v1/yujin/nac-demo` | out | demos + landing chat | **none in repo**; endpoint is live and validates input (422 on empty body). Primary Claude, fallback DeepSeek, both chosen per request |
| 2 | Tester report submit `rpaforce.com/crm_desa/api/v1/...` (also `yujin.app/api/v1/...`) | out | `js/tester-report.js` | **yes**: primary + sandbox endpoints, localStorage draft, mailto fallback |
| 3 | Waitlist signup `yujin.app/api/v1/waitlist-signup` | out | landing | **yes**: mailto fallback if the API fails |
| 4 | GitHub Actions -> GoDaddy over rsync/SSH | deploy | `.github/workflows/deploy.yml` | no staging host; post-deploy smoke check of the live URL |

## 7. Health snapshot (verified this session, not claimed)

| Check | Result |
|---|---|
| `npm test` in `runtime/` (14 suites) | **green**, 386 assertions, 0 failures, exit 0 |
| `npm run build` in `runtime/` | **green**, exit 0, ~0.6 s |
| Legacy stage scripts not in the gate (`stage1-audio`, `stage3-backend`, `stage4-calls`, `stage6-ack`, `stage6b-longtail`) | all 5 run and pass individually -- but **they are not part of `npm test`**, so nothing enforces them |
| Local bring-up (`php -S localhost:8855`, repo root) | **works**: 51/51 screens answer 200 |
| Runtime boot on the screens | 27 of 51 screens load the runtime and publish a manifest |
| Manifest addressability | on those 27 screens, **every** reported element resolves to a DOM node by `data-nac-id` (100%) |
| End-to-end flow (invoice: open -> add line -> edit qty -> save) | **proven green** with a real browser test (`e2e/n0-eligibility-v21.mjs`) |
| Production site `https://yujin.app/nac-spec/` | **200**, landing renders with `v2.5.0-alpha.5` |
| CI | last runs green; one failure ~23 days earlier, later fixed |

## 8. Defects and drift found while surveying (do not fix in N0)

1. **The site is hard-bound to its production sub-path.** 262 HTML files
   reference `/nac-spec/css/...` and `/nac-spec/js/...` as absolute paths. Run
   from a local server at the repo root, those documents load with **no
   stylesheet and no runtime** (404s). The system therefore only exists
   correctly under `/nac-spec/`.
2. **`example-v20-page-b.php` raises a real runtime error on load**:
   `manifest_role_unknown` for plugin `settings.system.smtp`. A demo that ships
   a contract violation.
3. **Five test stages exist but are not enforced** by the `npm test` gate
   (see section 7).
4. **Doc/code drift**: the landing says "Eight live demos"; the repository
   ships 13 reference demos plus 9 v2.4/v2.5 capability demos.
5. **Unmarked interactive elements**: 324 interactive elements across the swept
   screens carry no `data-nac-id` (concentrated on the documentation pages,
   which are not meant to be driven, but this is the accessibility gap a test
   tool meets first).
6. **`docs/PENDING_2026_05_26.md`** still carries the previous round's
   backlog while the Forge pending registry reports 28 open items; the two are
   not reconciled.

## 9. What N0 still needs from the owner

These are the only questions the repository cannot answer:

1. **Who uses it today and how many** (testers recruited, adopters, real users
   of Yujin CRM as reference app).
2. **Production data and backups**: is there any dataset of this system outside
   the CRM? Has a restore of the tester/waitlist data ever been executed and
   verified?
3. **Deployment ownership**: are the GoDaddy secrets held by one person? Is a
   staging host acceptable, or is production the only target?
4. **Chat intermediary**: who owns it, is there a sandbox key, and what is the
   cost per month at current usage?
5. **Scope of the takeover**: continue NAC3 as a product (evolutive) or keep it
   alive as a published contract (corrective)?

Answers are recorded verbatim in `docs/ELIGIBILITY.md` (section "Questions and
answers").
