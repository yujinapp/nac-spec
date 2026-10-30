# SEMANTIC TREE -- nac-spec (NAC3)

Station: **N2 -- the reading of the system** (Urazuke, legacy entry).
Date: **2026-10-30**. Author: Forge (agent). Owner: Pablo Kuschnirof.
Read together with: `CLAUDE.md` (session bootstrap), `docs/WORKING_AGREEMENT.md`
(the contract), `docs/STATUS.md` (living state), `docs/DISCREPANCIES.md` (what
does not agree and is waiting for the owner).

**This document is not normative.** `SPEC.md` is the normative text. This is a
map recovered **from the system as it exists today**, written so a session that
has never seen this repository can find its way without re-deriving it.

---

## 0. How to read this

Every node carries the source it was read from. The tag is not decoration: it
is what separates what was verified from what was assumed (working agreement
rule 5).

| Tag | Means |
|---|---|
| `[code]` | read in the source named next to it |
| `[config]` | read in a configuration file (`package.json`, `deploy.yml`, `.htaccess`, `api/*.json`) |
| `[doc]` | read in a document of this repository (`SPEC.md`, `README.md`, a guide) |
| `[business]` | stated by the owner, with the date, in `docs/ELIGIBILITY.md` |
| `[measured]` | produced by running something today; the command is in `docs/STATUS.md` |
| `[inferred]` | **not read end to end.** A summary from names, headers or adjacent evidence. Treat as a lead, not as fact |

**There is no `[database]` tag in this document, and that is not an omission.**
This system has no database, no accounts and no server-side persistence
`[business]` (owner, 2026-10-24, `docs/ELIGIBILITY.md` Q2) -- consistent with
the code: nothing under `js/` opens a connection, and the data-table demo
commits in memory only `[code]` (`js/nac-v2-extensions.js`, `dt_commit`).

---

## 1. Domains

Seven. The first three are the product; the rest are what keeps the product
honest, or what sells it.

| # | Domain | What it owns | Where it lives |
|---|---|---|---|
| D1 | **The contract** | the normative text, the role / attribute / event catalogue, and the machine-readable mirror of it | `SPEC.md`, `api/` `[code][config]` |
| D2 | **The runtime** | the only place an action is executed; the reference implementation of D1 | `js/nac.js` + 2 layers `[code]` |
| D3 | **The delivery** | the two gates the owner declared: the npm package and the `<script>` the site serves | `runtime/`, `js/<version>/`, `.github/workflows/deploy.yml` `[config][business]` |
| D4 | **The public site** | the spec rendered, the demos, the benchmark, the migration paper, the governance page | `index.html`, `example-*.php`, `demos/`, `benchmark/`, `migration/`, `conduit/`, `ads-demo/` `[code]` |
| D5 | **The verification chain** | the locks, each with its red proof; there is no test environment, so this chain **is** the characterization battery | `scripts/`, `e2e/`, `runtime/test/` `[code][config]` |
| D6 | **The translations** | nine machine translations of the normative text, plus the localised copies of the secondary pages | `i18n/` `[code][measured]` |
| D7 | **The commercial surface** | the pitch: pricing of Forge and Pilot, the tester programme, the evidence behind the sale | `index.html`, `docs/TESTER_*`, `docs/*REPORT*` `[code]` |

---

## 2. Actors

| Actor | Human? | What it does to this system | Evidence |
|---|---|---|---|
| **Adopter developer** | yes | adds five `data-nac-*` attributes to an interface they already shipped, installs the runtime, optionally registers a manifest | `[doc]` `SPEC.md` sec 0, `IMPLEMENTATION_GUIDE.md` |
| **Agent / LLM intermediary** | no | reads the published description of a screen and answers with one structured action | `[code]` `js/nac-chat-client.js` (the dispatcher routes 8 v2.0 kinds + 9 data-table kinds) |
| **End user of an adopter app** | yes | speaks or types; never sees NAC3 | `[code]` chat panel of the demos |
| **Site visitor** | yes | reads the spec, opens a demo, reads the benchmark | `[code]` `index.html` |
| **Tester** | yes | runs a checklist and submits a structured report | `[code]` `js/tester-report.js` |
| **Owner / maintainer** | yes | decides scope, holds every credential, publishes to npm by hand today | `[business]` + `[config]` (`deploy.yml` reads `secrets.GODADDY_*`) |
| **CI (GitHub Actions)** | no | runs the chain and, only if it passes, deploys the site | `[config]` `.github/workflows/deploy.yml` |
| **npm registry** | no | holds the published artefact the first delivery gate is measured against | `[code]` `scripts/verify-npm-publication.mjs` |
| **Static host (GoDaddy)** | no | serves the site; the only server this project operates | `[config]` rsync step, `.htaccess` |

---

## 3. Processes

Trigger, steps, outcome and exceptions **as the code implements them**, not as a
document wishes they worked.

### P1 -- Install and boot the runtime
* **Trigger** `[code]`: the page loads `js/nac.js` (or `@nac3/runtime`).
* **Steps** `[code]` (install block at the end of `js/nac.js`): the module
  installs `global.NAC` with 143 exported keys; guards against a double install
  (`__nac_v1_installed`); dispatches `nac:installed` carrying version and spec
  version; mounts the ARIA bridge so `data-nac-a11y-hint` actually reaches a
  screen reader; replays any `window.__NAC_PENDING__` the host staged before the
  runtime existed, then clears the buffer so a hot reload does not double-replay.
* **Outcome**: the five attributes in the host DOM become an addressable
  surface. Browser-only init is guarded, so the module is importable in Node and
  in the test suite without a DOM `[code]`.
* **Exceptions** `[code]`: `nac-v2-extensions.js` refuses to install and logs an
  error if `nac.js` was not loaded first; `nac-mcp-interop.js` warns and skips.

### P2 -- An agent acts on a screen
* **Trigger** `[code]`: a caller invokes a write verb (`click`, `fill`,
  `select`, `tab`, `invoke`, `utter`, `drag_drop`, `dt_*`).
* **Steps** `[code]` for the surface, `[inferred]` for the matcher internals
  (the resolution function bodies were not read end to end in this pass):
  resolve `(plugin, nac_id)` against the registry and the DOM; check the
  capability gate when the manifest entry declares `requires_capability`; check
  the snapshot gate (P5); dispatch the host-facing event; wait for the host's
  contract event matching the request id; emit provenance.
* **Outcome**: a resolved promise plus a structured event on `document`, carrying
  `{plugin, source, trusted, duration_ms, ok, error}` `[doc]` (`PROJECT.md` 3.6)
  `[code]` (the runtime's emit helpers).
* **Exceptions** `[code]`: ambiguity, not-found and blocked each raise a
  structured `NacError` **and** emit an event -- the runtime does not guess and
  dispatch. `config.default_timeout_ms` is 5000.

### P3 -- Strict resolution and disambiguation
* **Trigger** `[code]`: a verb or a label resolves to more than one element, or
  to none.
* **Steps / outcome** `[code]`: the runtime refuses instead of picking. Two
  suites cover it, both inside the gate: `runtime/test/stage2-disambiguation.mjs`
  and `stage7-strict-resolution.mjs` `[measured]`.
* **Exceptions**: `STRICT_VALIDATION` defaults to **true** since v2.5, so an
  unknown role makes `register` throw instead of warning `[code]`.

### P4 -- Authority and sudo elevation
* **Trigger** `[code]`: an action the host wants confirmed before its side
  effect happens.
* **Steps** `[code]` (`set_confirm_handler`, `confirm_action`,
  `request_authority`, `has_authority`, `revoke_authority`): the host interposes
  its own confirmation UI; the user may grant a **time-bounded** elevation that
  bypasses confirmation for a scope until the TTL expires.
* **Outcome / exceptions**: covered by `runtime/test/stage10-authority-sudo.mjs`
  `[measured]`. The landing states the limit out loud: the capability gate is a
  usability optimisation, **not** a permission system -- the adopter's server
  must still authorise every call `[doc]` (`index.html`, "What it does not cover").

### P5 -- Snapshot versioning (optimistic concurrency)
* **Trigger** `[code]`: any mutating verb.
* **Steps** `[code]`: `describe()` publishes `plugin_version`, `tree_version`
  and `element_state_hash`; a caller passes `expected_*`; a stale snapshot is
  rejected with `NacError('snapshot_stale')` naming what changed.
  `STRICT_VERSIONING` defaults to **true**, so a caller that passes no
  `expected_*` is rejected with `version_required`.
* **Outcome / exceptions**: `runtime/test/stage12-snapshot-versioning.mjs`
  asserts both the stale path and the missing-expectation path `[measured]`.

### P6 -- The voice / chat loop
* **Trigger** `[code]`: the visitor types or speaks in the chat panel of a demo
  or of the landing.
* **Steps** `[code]` (`js/nac-chat-client.js`): snapshot the tree from
  `NAC.describe()` plus each plugin manifest; POST it with the utterance to the
  **external** intermediary at `/crm/api/v1/yujin/nac-demo`; receive one
  structured action; dispatch it through the runtime; render the bubble; speak
  it. Half-duplex TTS/STT, speech debounce, locale pre-filter and YES/NO routing
  into an open confirm dialog all live in that file.
* **Outcome**: the page is operated by voice, with no screenshot and no robot
  driving the mouse.
* **Exceptions** `[code]`: a data-table verb whose function is missing throws
  with the runtime version named ("runtime older than v2.1"). **The intermediary
  has no local substitute**: without it this path cannot be exercised at all
  `[code]` + `[business]` (owner, 2026-10-24).

### P7 -- Publish the package (first delivery gate)
* **Trigger** `[business]`: the owner publishes **by hand** from `runtime/`.
  Automating it needs an `NPM_TOKEN` repository secret, which is the owner's to
  hold -- registered as a pending item.
* **Steps** `[config]` (`runtime/package.json`): `prepublishOnly` runs the
  build, the version coherence gate and the 14-suite test; `postpublish` runs the
  published-package verifier against the registry with 8 retries.
* **Outcome** `[measured]`: `@nac3/runtime@2.5.2`, Apache-2.0, six published
  entries (`dist/`, `README.md`, `LICENSE`, `SPEC.md`, `CHANGELOG.md`,
  `contract-head.json`).
* **Exceptions** `[code]` (`scripts/verify-npm-publication.mjs`): the verifier
  **fetches the published tarball back**, checks its bytes against the integrity
  the registry records, unpacks it and compares every file in both directions
  against the tree **as it was when that version was published** -- not against
  today's tree. An unresolvable witness fails closed; an unreachable registry is
  not a pass.

### P8 -- Deploy the site (second delivery gate)
* **Trigger** `[config]`: any push to `main`, or a manual dispatch. **There is no
  other path to production, and no test environment** `[business]`.
* **Steps** `[config]` (`.github/workflows/deploy.yml`, 22 steps): integrity,
  global validator, version coherence, contract API, published package, landing
  i18n, translation banners and stylesheet links -- **each lock immediately
  followed by the step that proves it goes red** -- then stage the upload
  (stripping the process documents), rsync to the host with `--delete-after`,
  then smoke-check the live site from outside and verify the published contract
  API from outside.
* **Outcome**: `https://yujin.app/nac-spec/` serves this tree.
* **Exceptions** `[config]`: the chain runs **before** the deploy step, so a red
  lock means nothing ships. Two gates that need a browser are not in the chain
  (`test:limits`, `test:cli-levels`) -- a declared gap, registered as a pending.

### P9 -- Regenerate the nine translations
* **Trigger** `[business]` (owner, 2026-10-27): every version regenerates the
  nine, completed to 100%, with a lock that requires identifiers to be
  character-identical.
* **Steps** `[config]`: `build-spec-translations.mjs` from a per-locale store,
  `build-translation-banners.mjs` for the staleness banner each translation must
  carry, then `test-spec-translations.mjs` and `test-landing-i18n.mjs`.
* **Outcome** `[measured today]`: canonical `SPEC.md` 2.5.2 = 283 units / 83
  sections; all nine locales 283/283 units, 83/83 sections, no orphans.
* **Exceptions** `[doc]` (`SPEC.md` 4.3.2): a translation behind the English
  **never blocks** the English from publishing; where they disagree, the English
  governs.

### P10 -- Build, sign and verify the contract API
* **Trigger** `[config]`: part of the chain and of `check:release`.
* **Steps** `[config]`: `build-contract-api.mjs` generates
  `api/v/<version>/{contract,findings,levels}.json` and mirrors the stable
  channel into `api/latest/`; `sign-contract-api.mjs` signs;
  `verify-contract-api.mjs` checks the head against the repository, and again
  from outside after the deploy.
* **Outcome** `[measured]`: `api/latest/contract.json` declares 20 roles, 48
  attributes, 89 events, spec 2.5, version 2.5.2, channel `stable`;
  `api/latest.json` declares the chain head, the stable version and the
  prerelease, and states that old versions are never purged so a consumer can
  pin `api/v/<version>/`.
* **Exceptions** `[doc]`: the role catalogue flags each entry with
  `declared_in_spec_table`, so a divergence between the document and the
  implementation shows up as data instead of being argued in prose.

### P11 -- A tester submits a report
* **Trigger** `[code]`: the tester submits the checklist form.
* **Steps** `[code]` (`js/tester-report.js`): autosave to `localStorage` on every
  change; POST the structured payload; a honeypot field against bots.
* **Outcome**: the report lands in the **external** CRM, not here.
* **Exceptions** `[code]`: the primary endpoint is the **sandbox** today
  (`rpaforce.com/crm_desa/...`), with production (`yujin.app/api/v1/...`) as the
  secondary and a `mailto:` fallback to the owner's address if both fail. The
  comment in the file says the swap back to production is pending.

---

## 4. Entities

No tables, no schema: these are **in-memory and on-disk shapes**. The attributes
listed are the ones the code enforces or the normative text requires.

| Entity | Key attributes | States / transitions | Source |
|---|---|---|---|
| **Manifest** | `plugin_slug` (required), `nac_version` (required), `version`, `elements[]`, `tabs[]`, `fields[]`, `actions[]`, `kpis[]`, `data_tables[]` | registered -> (re-registered = append) / **synced** (`syncPlugin` replaces instead of appending) -> unregistered | `[doc]` SPEC 4, `[code]` export |
| **Element** | `id` (dotted path, unique per plugin, stable across re-renders and redesigns), `role` (one of 20), `label_i18n` (MUST cover 10 locales), `requires_capability` | addressable / not mounted / ambiguous / unknown-role (throws under strict) | `[doc]` SPEC 1-2, 4.3 |
| **Action / verb** | free-form snake-case verb, unique per plugin (a duplicate is the manifest error `duplicate_verb`), `undoable`, `undo_window_ms` | requested -> succeeded / failed / rejected | `[doc]` SPEC 3, `[code]` export |
| **Event** | 89 declared types; a canonical detail shape per widget family, each with its own entity-specific id field | emitted dual (canonical + legacy) during a transition window | `[config]` `api/latest/contract.json`, `[code]` header of `js/nac.js` |
| **Provenance block** | `{plugin, source, trusted, duration_ms, ok, error}`; `source` as `type|id|tool`; optionally HMAC-signed | emitted on **every** dispatch, failure paths included -- suppressing it is forbidden | `[doc]` PROJECT.md 3.6, `[code]` `sign_provenance` / `verify_provenance` |
| **Snapshot version** | `plugin_version`, `tree_version`, `element_state_hash` | bumped by register / syncPlugin / hydration-complete; a stale expectation is rejected | `[code]` export + `stage12` |
| **Capability** | the user's capability set | set / granted / revoked; gates `click` and `invoke` | `[code]` export, `v23-capabilities` |
| **Authority grant** | scope + TTL | requested -> granted -> expired / revoked | `[code]` export, `stage10` |
| **Contract artefact** | `api_schema`, `protocol`, `version`, `spec_version`, `channel`, `roles[]`, `attributes[]`, `events[]`, `locales`, `conformance_tier` | one per version, immutable once published; `api/latest/` mirrors the stable channel | `[config]` `api/` |
| **Integrity record** | one SRI hash per pinned runtime copy | `js/<version>/` copies are immutable; the gate refuses a drifted hash | `[code]` `js/integrity.json`, `scripts/build-integrity.mjs` |
| **Translation unit** | a per-locale store entry; 283 units / 83 sections at 2.5.2; a banner declaring which English revision it covers | complete / stale (reported per unit, never blocking) | `[measured]`, `[doc]` SPEC 4.3.2 |
| **Tester report** | tasks (ok / error / skipped) with comments, plus sign-off (name, email, release tag, browser, OS, device, verdict, rating, free text) | draft in `localStorage` -> posted -> (fallback) mailto | `[code]` `js/tester-report.js` |

---

## 5. Screens

| Group | How many | Notes |
|---|---|---|
| Landing | 1 (`index.html`) | 16 named sections, a chat panel, and a language selector built **only** from catalogues that declare themselves complete `[code]` |
| PHP reference demos | 13 `[measured]` | the canonical one claims 27 widgets; the data-table demo is the one wired to the live chat backend |
| Capability demos | 8 under `demos/`, plus React and Angular | one per shipped v2.4 / v2.5 block, each with a Playwright runner and a Pilot runner under `scripts/` |
| Rendered documents | 308 HTML tracked, **236 of them localised copies** under `i18n/` `[measured]` | spec, guides, checklists, reports |
| Evidence surfaces | `benchmark/`, `migration/`, `conduit/`, `ads-demo/`, `videos/` | the material behind the commercial claims |

The demos section of the landing shows **nine** cards `[measured]`: six PHP
demos, React, Angular and the Atlas Pro voice ad.

---

## 6. External integrations (complete, from the code)

| # | Integration | Direction | Isolation / fallback | Source |
|---|---|---|---|---|
| 1 | Chat intermediary `/crm/api/v1/yujin/nac-demo` (Claude primary, DeepSeek fallback) | out | **none in this repo**; no local substitute | `[code]` |
| 2 | Tester report submit (sandbox primary, production secondary) | out | `localStorage` draft + `mailto:` fallback | `[code]` |
| 3 | **Google Fonts** (`fonts.googleapis.com`, `fonts.gstatic.com`) on the landing | out | none; a third-party request on every visit, and the stylesheet lock states it does not resolve remote stylesheets | `[code]` `index.html` lines 12-14 |
| 4 | npm registry | both | the published-package lock fetches the tarball back and compares | `[code]` |
| 5 | GitHub Actions -> GoDaddy over rsync / SSH | deploy | no staging host; post-deploy smoke check from outside | `[config]` |
| 6 | Playwright (dev only) | out | the single root dependency; not shipped | `[config]` |

Integration 3 was **not** in the N0 survey's list of four. It is recorded as a
pending item with its measurement, not fixed here (working agreement rule 9).

---

## 7. Scheduled jobs

**None.** `[measured]` -- the only workflow is `deploy.yml`, triggered by a push
to `main` and by manual dispatch; it has no `schedule:` or `cron` key. Nothing
in this system runs on a clock.

---

## 8. What this reading did **not** cover (blind spots, declared)

Working agreement rule 5. The point of this section is that what is missing is
named, instead of the reader assuming the map is complete.

1. **The resolution internals of the runtime.** `js/nac.js` is 8220 lines. This
   pass read the public export, the install block, the version constant and the
   changelog header. The bodies of `click`, `fill`, `select` and the event
   matcher were **not** read line by line; every claim about them above is
   tagged `[inferred]` or rests on a test suite that exercises them.
2. **`js/example.js` (7746 lines) and the 13 PHP demo pages.** Read only where a
   specific question needed them. A demo may carry contract violations this pass
   did not see; the one it did see is in `docs/DISCREPANCIES.md`.
3. **`conduit/`, `benchmark/`, `migration/`, `ads-demo/`.** Catalogued as
   surfaces; their contents were not audited. The landing itself says the two
   measurements are "neither re-run on the current release".
4. **The 236 localised HTML copies.** Covered by the translation meter and the
   landing i18n lock, not read one by one.
5. **Server logs and host configuration.** Not reachable from here: the host is
   GoDaddy static hosting and this project does not instrument it `[business]`.
   The only runtime signal available from outside is the post-deploy smoke
   check. **This is a gap, not a finding** -- reading more code will not close it.
6. **The external chat intermediary.** Outside this repository by the owner's
   scope decision; its ownership, its cost and its availability are not visible
   from here.

---

*Produced at station N2 of the Urazuke ladder. Changing this file in the same
commit as the change it describes is working agreement rule 4. Moving a node's
tag from `[inferred]` to `[code]` is an improvement to this document, not a
rewrite of it (rule 7).*
