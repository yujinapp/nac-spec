# EVIDENCE N0 -- receipts for the eligibility sheet

Every line here is a thing that was executed in this session on
2026-10-24, from the repository at `C:\yujin-nac-spec` (branch `main`).
Nothing in this file is a quotation from the documentation: where a document
and an execution disagree, the execution wins and the disagreement is noted.

Environment: Windows 11, Node v22.16.0, npm 11.2.0, PHP 8.3.30, Python 3.13.2,
git 2.45.2, gh authenticated as `pkuschnirof`, Playwright 1.60.0 with browsers
already installed.

Reproduction scripts added by this station (read-only probes, they change
nothing in the system):

* `e2e/n0-eligibility-v21.mjs` -- the end-to-end proof (prerequisite 4).
* `e2e/n0-screen-sweep.mjs` -- the screen inventory (prerequisite 4).

---

## P1 -- environment brought up from the repository

| Step | Command | Result |
|---|---|---|
| Install | `npm install` (root) | no application dependencies; only Playwright for probing |
| Build runtime | `npm run build` in `runtime/` | **exit 0**, 0.56 s, bundles `js/*.js` -> `runtime/dist/` |
| Serve locally | `php -S localhost:8855 -t .` | server up; **51 of 51 screens answer HTTP 200** |
| Runtime present | Playwright probe on every screen | **27 screens boot the runtime and publish a manifest** |
| Data model | read | no persistence layer exists; demo data is hard-coded in the pages |
| Degradation | local screens that use absolute paths | **flashlight finding below** |

**Finding F-1 (matters for bring-up).** 262 tracked HTML files reference their
assets as `/nac-spec/css/...` and `/nac-spec/js/...`. Served from the repository
root, those references 404, so 17 documentation screens load without stylesheet
and without runtime. The system is correct only under the production sub-path
`/nac-spec/`. Evidence: console/network capture on `SPEC.html`,
`docs/NAC_TEST_MANUAL.html` and `peer-reviews.html` shows repeated 404s on
`http://localhost:8855/nac-spec/*`.

## P2 -- code read, module by module

Measured reading, not a claim:

| Module | Size | What it is | Understood |
|---|---|---|---|
| `js/nac.js` | 352 KB, 8 134 lines, **68 sections**, 257 top-level functions | the contract implementation: resolution, description, execution, audit, provenance, widgets, navigation, i18n | yes, section by section |
| `js/nac-v2-extensions.js` | 82 KB | data tables (`registerDataTable`, `dt_*`), navmap, editor, interop, auto-register | yes |
| `js/nac-chat-client.js` | -- | the chat panel: builds the request, renders the actions, speaks | client side only |
| `js/nac-mcp-interop.js` | -- | bridges the manifest to MCP so external agents can call it | yes, at interface level |
| `js/tester-report.js` | -- | tester submissions, draft, fallbacks | yes |
| `example.js` / `pilot.bundle.js` | 375 KB each | generated bundles | artefact, not source |
| `runtime/test/*` | 14 suites | the enforced gate | yes |
| `scripts/stage*.mjs` (5 files) | -- | legacy stage tests, **outside the gate** | yes |

Cannot fully understand, with reason (also listed in `FUNCTIONALITY_RECOVERED.md`
part F): the server side of the chat intermediary (not in the repository); the
five backend SDK adapter strategies (documented outside the code); the full
security argument of the provenance hashing; the provenance of the generated
bundles; the reason five stage scripts were dropped from the gate.

## P3 -- functionality recovered

`docs/FUNCTIONALITY_RECOVERED.md` written: 14 processes, 51 screens, explicit
"what it does not do" section, six `[INF]` marks and five open points of
understanding.

## P4 -- screens drivable, and one flow proven end to end

Inventory (`e2e/n0-screen-sweep.mjs`, machine output in `e2e/sweep.json`):

| Metric | Value |
|---|---|
| Screens probed | 51 |
| Loaded with HTTP 200 | 51 |
| Publish a NAC manifest | 27 |
| Manifest **fully addressable** by `data-nac-id` | 27 of 27 (100 %) |
| Screens with console errors on load | 12 (see F-2 and F-3) |
| Interactive elements with **no** `data-nac-id` | 324 |

**Re-measured on 2026-10-26** (same script, after the G3 spec fixes and the new
public limits section). Two rows moved, and one of them is a finding:

| Page | 2026-10-24 | 2026-10-26 | Reading |
|---|---|---|---|
| `index.html` | 109 reported / 109 addressable / 57 interactive / 0 unmarked | 135 / 135 / 70 / 0 | the receipts (N-12) and the limits section (N-09) added marked elements; still 100 % addressable and still nothing interactive left unmarked |
| `SPEC.html` | 4 interactive / 0 unmarked | 6 interactive / **2 unmarked** | **new finding N-32**: the SPEC generator emits prose links with `data-nac-role` and no `data-nac-id`. The two links are the ones the N-13 fix added. Deferred on purpose with N-28 (`PND-041`) |

The aggregate `unmarked_interactive_total` therefore moves from 324 to **326**;
every other row is unchanged. Both runs are in `e2e/sweep.json`, which **from
this date stamps itself** (`measured_at`, `measured_at_commit`, `tree`): an
undated measurement cannot be told apart from a current one, and this one ages
the moment any page gains or loses a `data-nac-id`.

End-to-end proof (`e2e/n0-eligibility-v21.mjs`, **verdict GREEN**, exit 0),
flow: *open invoice -> add line -> edit quantity -> save*, in a real Chromium:

| Check | Result |
|---|---|
| Page loads, runtime boots, 8 invoice lines present | green |
| Every element `describe()` reports is addressable and role-consistent | green |
| `describe()` reflects visibility (modal internals hidden while closed) | green |
| Opening the modal through the UI | green |
| Adding a line: runtime state **and** DOM follow, table marked modified | green |
| Editing a cell: computed column recomputed, aggregate matches the DOM | green |
| Editing a non-editable / computed / unknown column is refused with the right error | green |
| Saving: modal closes, table no longer modified, `COMMITTED: invoice.lines` in the audit log | green |

Two boundary facts recorded by the same test, not failures but scope:

* **The commit is memory-only.** No table registers an `on_commit` hook and
  nothing leaves the browser. There is no server-side effect to assert, because
  there is no server.
* **The chat endpoint is external.** Probed against the local server,
  `/crm/api/v1/yujin/nac-demo` answers **200 with the site's own HTML** -- i.e.
  the dev server serves the landing page for unknown paths, which is a
  false-positive trap: only the content-type check reveals it. Against the real
  host the endpoint answers **405 to GET** and **422 to an empty POST**, which
  proves it exists and validates input. The voice/text layer therefore works only
  with the real intermediary.

## P5 -- builds and runs with today's tools

| Check | Result |
|---|---|
| `npm test` in `runtime/` | **green**: 14 suites, 386 assertions, 0 failures, exit 0 |
| `npm run build` | exit 0 |
| Runtime dependencies | **zero** -- nothing to break |
| Published artefact | `npm view @nac3/runtime version` -> `2.5.0-alpha.5`, `dist-tags.latest` -> same; matches the repository's declared version |
| Five legacy stage scripts | `stage1-audio`, `stage3-backend`, `stage4-calls`, `stage6-ack`, `stage6b-longtail` all pass individually, **but are not in `npm test`** (F-4) |
| Production site | `https://yujin.app/nac-spec/` answers **200** and renders the landing at `v2.5.0-alpha.5` |
| CI | `gh run list`: recent runs green; one red run ~23 days ago, superseded by later green runs |

**Unresolved dependencies: none.** There is nothing to install to build or run
the runtime. The only unresolved dependency is a *service*: the chat
intermediary (P7).

**Finding F-2.** `example-v20-page-b.php` throws a real runtime error on load:
`manifest_role_unknown` for plugin `settings.system.smtp`. A shipped demo
violates the contract it demonstrates.
**Finding F-3.** The 12 screens with console errors are the 11 documentation
screens hit by F-1 plus that one.
**Finding F-4.** Five stage scripts are maintained but unenforced, so
`npm test` under-reports the real coverage and nothing prevents their drift.

## P6 -- production data and backups

What the code establishes:

* No database, no accounts, no session store, no server-side persistence.
* The only personal data the system produces is what a tester submits (name,
  e-mail, verdicts, free text) and what a visitor submits to the waitlist; both
  are posted to the **Yujin CRM**, which is not this repository.
* The public artefact (the site) has its backup in git: restoring it means
  re-deploying a commit. There is no data restore to exercise for the site.

What could **not** be verified from here, and is therefore the substance of this
criterion: whether the CRM's store of tester/waitlist data has ever been restored
and verified, and who owns that procedure.

**Status: not verified -- open, awaiting the owner.** This is the only
prerequisite that the repository genuinely cannot answer.

## P7 -- external integrations

Enumerated from the code, then probed:

| # | Integration | Probe | Test mode / edge isolation |
|---|---|---|---|
| 1 | Chat intermediary `/crm/api/v1/yujin/nac-demo` | GET -> 405, empty POST -> 422 (endpoint alive and validating); locally -> 200 HTML, i.e. not real | **no stub, no sandbox** in the repository; the model routing (Claude primary, DeepSeek fallback) happens server-side, so cost per interaction is not visible here |
| 2 | Tester reports `rpaforce.com/crm_desa/...` + `yujin.app/api/v1/...` | both answer CORS preflight | **yes**: primary + sandbox endpoint + localStorage draft + mailto fallback |
| 3 | Waitlist `yujin.app/api/v1/waitlist-signup` | preflight OK | **yes**: mailto fallback |
| 4 | CI -> GoDaddy rsync/SSH | last runs green, site live | no staging host; post-deploy smoke check of the live URL only |

## Summary of findings for the sheet

| id | Finding | Consequence |
|---|---|---|
| F-1 | Site bound to the `/nac-spec/` sub-path (262 files) | any local or alternate-host bring-up loses styling and runtime on the docs surface |
| F-2 | `example-v20-page-b.php` raises `manifest_role_unknown` | a shipped demo violates the contract |
| F-3 | 12 screens with console errors, 11 of them explained by F-1 | cosmetic on docs, real on F-2 |
| F-4 | 5 test stages exist outside the gate | coverage signal is optimistic |
| F-5 | 324 interactive elements unannotated | accessibility claim holds for the annotated surface only |
| F-6 | Landing says "eight live demos"; 13 reference + 9 capability demos ship | documentation drift against the code |
| F-7 | Commit is memory-only; no server anywhere in the repository | "backend effect checkable" is true only for the runtime state |
| F-8 | Chat intermediary has no local stub | the voice/text path cannot be tested without the external service |
