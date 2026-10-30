# INITIAL SURVEY -- nac-spec (NAC3)

Station: **N0 -- normalisation of the legacy**, completed at **N2 -- the reading
of the system** (Urazuke, legacy entry).
Version **2**, date **2026-10-30**. Version 1 was written 2026-10-24.
Author: Forge (agent). Owner: Pablo Kuschnirof.

**Every statement carries its source.** `[code]` read in the source named,
`[config]` read in a configuration file, `[doc]` read in a document of this
repository, `[business]` stated by the owner with the date (verbatim in
`docs/ELIGIBILITY.md` section 5), `[measured]` produced by running something --
the command and the date are in `docs/STATUS.md` -- and `[inferred]` **not read
end to end**, a lead rather than a fact.

There is no `[database]` tag anywhere in this document. That is not an omission:
this system has no database `[business]` (Q2).

Companions: `docs/SEMANTIC_TREE.md` (the recovered map), `docs/STATUS.md` (the
living state, with every number's command), `docs/DISCREPANCIES.md` (what does
not agree and is waiting for the owner), `docs/EVIDENCE_N0.md` (the receipts of
version 1).

---

## 1. What this system does, and for whom

NAC3 ("Native Agent Contract") is an **open specification plus a browser
runtime** that makes a web interface operable by a voice assistant, a chat
assistant or an AI agent **without screenshots and without a robot driving the
mouse** `[doc]` (`SPEC.md` sec 0). The application marks its own interface with
five `data-nac-*` attributes; the runtime reads that markup and publishes a
structured description of the screen (a "manifest"); the agent receives the
description and answers with **one** structured action; the runtime executes it
and leaves an audit trail `[code]`.

Everything runs **in the browser**. There is no application server in this
system `[code]` + `[business]`.

The repository is four things at once:

1. the **normative contract** -- `SPEC.md`, 18 numbered sections `[measured]`;
2. the **reference runtime** -- `js/nac.js` plus two layers, published as
   `@nac3/runtime` `[code]`;
3. the **public site** -- spec, demos, benchmark, migration paper, governance
   page, tester programme, at `https://yujin.app/nac-spec/` `[config]`;
4. the **evidence for the commercial pitch** -- benchmark, peer reviews,
   migration case study, Conduit experiment `[code]`.

**For whom.** Three technical audiences and one commercial one `[code]`
(`index.html`): adopter developers who annotate an interface they already
shipped; visitors who read the spec and open the demos; testers who run a
checklist; and buyers, because the same landing prices two commercial products
(Forge at USD 10 a month, Pilot at USD 5) while the protocol itself stays
Apache-2.0.

---

## 2. What this system does **not** do

The landing states its own limits, which is unusual enough to be worth
recording as a fact about the system `[doc]` (`index.html`, "What it does not
cover"):

* **It does not read pixels.** Canvas and WebGL are outside the contract: the
  toolbar around a drawing can be named, the drawing cannot.
* **It does not reach a closed shadow root** unless its author exposes a
  resolver -- a browser security boundary, reported rather than guessed around.
* **It does not drive a cross-origin frame** that does not cooperate; it fails
  closed instead of pretending the click landed.
* **It is not for anything that is not the web.** Desktop, mobile-native and
  terminal applications are out of scope.
* **It is not a permission system.** A named verb is an intent-level signal and
  the capability gate is a usability optimisation; the adopter's server must
  still authorise every call.
* **A declared schema is not a validated one**: a manifest may carry a payload
  schema and the reference runtime never reads it.
* **It does not keep names stable for you.** Stable ids are a promise the
  adopter keeps, not one the runtime enforces.
* **It does not make an agent correct.** In the project's own 600-run benchmark
  NAC3 reached 95.5%, not 100%; what it removes is silent damage (0 of 200 runs
  against 30 of 200 on raw DOM). Those numbers are **not re-run on the current
  release** and the landing says so `[doc]`.

And two scope exclusions decided by the owner, not derivable from the code:

* **The CRM and the chat intermediary are not part of the system** -- they are
  examples of a consumer `[business]` (Q1, Q4, 2026-10-24). They are not taken,
  not audited, not absorbed.
* **There is no dataset of this system** to copy, anonymise or restore
  `[business]` (Q2).

---

## 3. Who uses it

| Audience | What is known | Source |
|---|---|---|
| Adopter developers | the reference production app is the Yujin CRM, linked from the landing as "every screen compliant". **How many external adopters exist is not known from here** | `[code]` + declared gap |
| Agents / LLM intermediaries | one is live: the Yujin intermediary the demos post to (Claude primary, DeepSeek fallback), outside this repository | `[code]` |
| Site visitors | not instrumented: this project has no analytics of its own | `[business]` |
| Testers | a structured programme exists (interactive checklists, a report form, an admin view). **How many testers were recruited is not known from here**; the report endpoint points at the sandbox today | `[code]` + declared gap |
| Owner | one person, who holds every credential and publishes to npm by hand | `[business]` (Q3) |

**The owner's answer to "who uses it and how many" reframed the question**
`[business]` (Q1, verbatim in `docs/ELIGIBILITY.md`): what matters in this
repository is the consistency of the protocol and its web presentation. The
number of users of the example app is not a fact about this system.

---

## 4. The technology

| Layer | What it is | Source |
|---|---|---|
| Contract | Markdown, English normative, nine machine translations | `[code]` |
| Runtime | **vanilla JavaScript**, no framework, no bundler at serve time, **zero runtime dependencies** | `[code]` + `[config]` |
| Runtime size | `js/nac.js` 8220 lines; `nac-v2-extensions.js` 2102; `nac-mcp-interop.js` 497; `nac-chat-client.js` 705 | `[measured]` |
| Public surface | 143 exported keys on `global.NAC`, plus 39 attached by the extension layer and 4 by the interop layer | `[measured]` |
| Demos | 13 `.php` files that contain static HTML plus script tags; two real framework builds (React 18, Angular 17) | `[measured]` |
| Build | `runtime/build.mjs` bundles `js/*.js` into `runtime/dist/` | `[config]` |
| Tooling | 78 `.mjs` scripts: generators, locks, each lock's red proof, demo runners, Pilot runners | `[measured]` |
| Dev dependency | `playwright`, the only one | `[config]` |
| Server-side | none of ours. Static file hosting (GoDaddy), plus Apache directives in `.htaccess` so `.md` is served as UTF-8 text instead of 403 | `[config]` |
| Local bring-up | PHP 8.3 and Node 22 both present on the owner's machine; `python -m http.server` is the declared serve script | `[measured]` + `[config]` |

---

## 5. The environments

**There is one environment: production.** `[business]` (Q3, "Production is the
only target for now").

| Environment | What it is | How something reaches it |
|---|---|---|
| **Production, site** | `https://yujin.app/nac-spec/` on GoDaddy static hosting | any push to `main` runs the 22-step chain and, only if it passes, rsyncs with `--delete-after`, then smoke-checks the live site from outside `[config]` |
| **Production, package** | `@nac3/runtime` on the npm registry | **by hand**, from the owner's machine; `prepublishOnly` runs build + coherence + tests, `postpublish` fetches the published tarball back and compares `[config]` |
| **Local** | `php -S` or `python -m http.server` at the repository root | nothing is promised here: 260 published pages load the runtime by absolute `/nac-spec/` path, so served from another root they load without it `[measured]`, open as D-02 |
| **Staging** | **does not exist**, and proposing one is closed | `[business]` (Q3) |
| **CI** | GitHub Actions, one workflow, no scheduled jobs | `[config]` |

Consequence, written into the working agreement as the local reading of rule 11:
**the deploy chain is the characterization battery**, and it runs before the
step that deploys.

---

## 6. What an error costs

The method asks this before anything is touched. The answer is unusual here, and
it cuts both ways.

**What it cannot cost.** There is no data to lose: no database, no accounts, no
server-side persistence `[business]` (Q2) + `[code]`. The backup of the artefact
is the git history. A bad site deploy is recovered by a revert and a push, which
re-runs the chain `[config]`.

**What it does cost.**

1. **A divergent publication reaches every new adopter.** Whoever runs
   `npm install @nac3/runtime` gets what was published, not what is in the tree.
   This already happened once: on 2026-10-24 the published package shipped the
   previous version's normative text and a licence line that contradicted the
   licence file beside it. Since 2026-10-28 three locks refuse that `[code]`,
   but the publication itself is still manual (PND-067).
2. **A broken deploy takes down the normative text.** `SPEC.html` is the home of
   the document this project *is*. The site has no second home `[config]`.
3. **A changed id or label breaks an adopter's callers silently** -- the spec
   says stable names are a promise the adopter keeps, and NAC3 does not enforce
   them `[doc]`. So a rename here is a rename in somebody else's code.
4. **A contract violation in a published demo costs the argument.** The whole
   pitch is "this system does not fail in silence". One demo page currently
   throws on load (D-05) `[code]`.
5. **Credibility is the real asset.** This project sells evidence: a benchmark,
   peer reviews, a migration case study. A number that cannot be reproduced
   costs more here than a bug -- which is why "a measurement that does not
   reproduce is retired, not rounded" is rule 14 of the working agreement.

What an error **does not** cost: money per incident, legal exposure, or a
service outage for a paying user. There is no paid tier of NAC3 itself; the
protocol is Apache-2.0 `[doc]`.

---

## 7. Shape of the repository (re-measured 2026-10-30)

| Item | 2026-10-24 (v1) | 2026-10-30 (v2) |
|---|---|---|
| Tracked files | 914 | **1036** |
| JavaScript sources | 29 | **34** |
| Tooling / tests (`*.mjs`) | not measured | **78** |
| PHP reference demos | 13 | **13** |
| HTML documents | 305 (~262 localised) | **308** (236 localised) |
| Markdown under `docs/` | 28 | **53** |
| Runtime version | 2.5.0-alpha.5 | **2.5.2** |
| Published package | 2.5.0-alpha.5 | **2.5.2**, and identical to the tree of that version |
| Runtime dependencies | zero | **zero** |
| Branches | not measured | **main + 4** (three at 0 ahead, one stale) |

`[measured]` with `git ls-files`. The growth is the per-locale translation store,
the new locks with their red proofs, and the Urazuke documents.

---

## 8. Components, by trust boundary

```
 user (voice / text)
        |
        v
 [chat panel]  js/nac-chat-client.js  ---> EXTERNAL: Yujin chat intermediary
        |                                  (Claude primary, DeepSeek fallback)
        v                                  -> not in this repository
 [NAC runtime] js/nac.js  (core, 8220 lines, 143 exported keys)
        +      js/nac-v2-extensions.js   (data tables, scoping, i18n, shadow DOM)
        +      js/nac-mcp-interop.js     (cross-app bridge, v2.3 preview)
        |
        v
 [annotated application]  data-nac-* attributes in the adopter's DOM
```

Boundaries that matter `[code]`:

* The runtime is **the only place an action is executed**, and it is
  client-side: "the backend" is whatever the adopter's app calls. The runtime
  never talks to a database.
* The only server this project operates is **static file hosting**. There is no
  API of our own; `api/` is a tree of **static JSON files** generated by a
  script, not a service `[config]`.
* The chat layer is an **external integration with no local substitute**: without
  that intermediary the voice and text path cannot be exercised at all. The
  endpoint is injectable, so the protocol does not depend on it `[code]` +
  `[business]` (Q4).

---

## 9. Data

| Data class | Where it lives | In this repo? | Notes |
|---|---|---|---|
| Source, spec, docs, demos | git + static host | yes | the source of truth is the git history |
| Demo data (invoices, todos, catalogue) | hard-coded in the demo pages | yes | fictional, no real persons |
| Tester reports (name, email, verdicts, free text) | external CRM | **no** | `localStorage` draft + `mailto:` fallback at the edge |
| Server logs / analytics | the hosting provider | **no** | not instrumented by this repository |
| Credentials | CI secrets (`GODADDY_*`) and the owner's machine | **no** | referenced only by name in `deploy.yml` |
| Contract signing key | the owner's machine, **without a passphrase** | no | PND-056: the signature is therefore not technically attributable to the owner |

No database, no account system, no session store, no server-side persistence
`[code]` + `[business]`. The data-table demo commits **in memory only**: no
`on_commit` hook is registered and nothing leaves the browser `[code]`.

---

## 10. External integrations (complete, from the code)

| # | Integration | Direction | Isolation / fallback |
|---|---|---|---|
| 1 | Chat intermediary `/crm/api/v1/yujin/nac-demo` | out | **none in repo**; endpoint injectable; the route is alive and validates input (405 on GET, 422 on empty POST) |
| 2 | Tester report submit -- **sandbox primary**, production secondary | out | `localStorage` draft + `mailto:` fallback |
| 3 | **Google Fonts** on the landing | out | **none**; a third-party request on every visit. Not in v1's list of four: found at N2, recorded as H-1 |
| 4 | npm registry | both | the lock fetches the published tarball back and compares both ways |
| 5 | GitHub Actions -> GoDaddy over rsync / SSH | deploy | no staging host; post-deploy smoke check from outside |
| 6 | Playwright (dev only) | out | not shipped |

v1 listed four. The waitlist endpoint it listed as integration 3 **no longer
exists in the tree** `[measured]`: the landing was rewritten and today it links
out to the product pages instead of capturing an address.

---

## 11. Health snapshot (measured 2026-10-30, not claimed)

| Check | Result |
|---|---|
| `cd runtime && npm test` | **green** -- 14 suites, 386 PASS, 0 FAIL |
| `npm run check:release` | **green** -- 12 scripts |
| Published-package lock + its red proof | **green** -- 22 of 22 files identical; 31 of 31 red cases refused |
| Nine spec translations | **green** -- 283/283 units, 83/83 sections each, no orphans |
| Last CI run on `main` | **41048418059 success**, 51 s, commit `37446d4` |
| Production site | serving this tree (post-deploy smoke check from outside) |
| Five suites outside the gate | still outside (D-03) |
| Browser gates in CI | still absent (PND-049) |

Not re-run today, and therefore still carrying their 2026-10-24 date: the local
51-screen sweep, the 27-of-51 manifest publication rate, the 100% addressability
of reported elements, and the end-to-end invoice flow `[doc]`
(`docs/EVIDENCE_N0.md`).

---

## 12. What happened to v1's findings

| v1 finding | State on 2026-10-30 |
|---|---|
| 1. Site hard-bound to `/nac-spec/` (262 pages) | **half closed.** The stylesheet half got a lock (PND-053). The runtime half survives: 260 pages, `[measured]`. Open as **D-02** |
| 2. `example-v20-page-b.php` raises `manifest_role_unknown` | **confirmed at the source**: three elements declare `role: 'textbox'`, which is not one of the 20 roles, and strict validation is on by default. Open as **D-05** |
| 3. Five test stages not enforced | **unchanged.** Open as **D-03** |
| 4. "Eight live demos" on the landing vs the repository | **drifted again, not fixed**: the landing now says nine and shows nine cards; the repository ships 13 PHP demos plus 8 capability demos plus React and Angular. No longer a false claim, still not the same count |
| 5. 324 interactive elements with no `data-nac-id` | **not re-measured today.** Partly tracked as PND-038 (the landing paints 116 ids and declares 50) and PND-041 |
| 6. `docs/PENDING_2026_05_26.md` not reconciled with the registry | **unchanged**; the registry is the source of order (working agreement rule 16) |

New at N2, and recorded rather than fixed: five more discrepancies (D-01, D-04,
D-06, D-07, D-08) and three new findings (H-1 Google Fonts, H-2 a stale branch,
H-3 the tester endpoint on the sandbox). All in `docs/DISCREPANCIES.md`.

---

## 13. What the owner answered (the questions the repository could not)

Verbatim, with their effect, in `docs/ELIGIBILITY.md` section 5 `[business]`,
all 2026-10-24:

* **Scope**: the object is the protocol and its web presentation; the CRM is an
  example of a consumer (Q1, Q4).
* **Data**: there is none of this system's own (Q2).
* **Deployment**: the owner holds the secrets; production is the only target
  (Q3).
* **Evolution**: NAC3 is permanently evolutive (Q5a).
* **Delivery contract**: `npm install @nac3/runtime` or the `<script>` from the
  site, verified after every change (Q5b) -- this became the eighth
  prerequisite, the only red one, and then the first task of the takeover.

Later decisions, same source: the nine translations declare themselves
non-normative (2026-10-26) and are completed and regenerated per version
(2026-10-27); the system is taken with the method (GO, 2026-10-28); the contract
loads itself from `CLAUDE.md` and is accepted in full (2026-10-30).

---

## 14. What this survey cannot see (blind spots, declared)

1. **How many adopters and how many testers there are.** Not in the repository,
   and not instrumented. Only the owner or the external CRM can answer.
2. **Server logs and host configuration.** Static hosting, not instrumented by
   this project; the only signal from outside is the post-deploy smoke check.
3. **The chat intermediary's ownership, sandbox and monthly cost.** Outside the
   scope the owner set.
4. **The runtime's resolution internals.** 8220 lines; this pass read the public
   export, the install block and the headers -- see `docs/SEMANTIC_TREE.md` sec 8.
5. **Whether the benchmark numbers still hold.** They were produced against an
   earlier release and have not been re-run (PND-040).

---

*Version 2 completes version 1 at station N2: the form the method asks for
(what it does and for whom, what it does not do, who uses it, the technology,
the environments, what an error costs), every statement tagged with its source,
and every number either re-measured today or left with the date it was measured.
Working agreement rules 5 and 14.*
