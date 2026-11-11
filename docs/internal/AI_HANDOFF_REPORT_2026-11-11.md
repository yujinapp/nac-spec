# nac-spec / NAC3 -- AI handoff report

Generated 2026-11-11 by the resident Forge agent, at the owner's request, for ingestion by
an AI system (target: Alignerr submission). Language: English, because `SPEC.md` is the
normative text of this project and English is normative here.

**How to read this file.** It is written to be consumed by a model, not skimmed by a human.
Every number carries the command that produced it. Claims are partitioned into three
buckets and the bucket is always named: `VERIFIED` (a command was run, a file was read, a
state was reproduced), `BELIEVED` (derived, calibrated or assumed) and `BLIND SPOT` (what
this measurement cannot see). Do not promote a `BELIEVED` number to a fact downstream.

**The two headline figures.** **~76 AI hours already invested** (section 1: measured for the
recent segment, calibrated to +0.3% for the older one) and **~400 owner hours remaining**
on the backlog **with the Urazuke ladder switched back on** (section 2.1). The remaining
figure carries a 320-510 h band driven by a single undecided scope question (section 2.3).

**Revision of 2026-11-11, later the same day -- read this before quoting an earlier
figure.** An earlier version of this file reported ~230 owner hours and described the
project method (the Urazuke ladder) as suspended, costing a *guessed* band of 60-100 AI
hours. Both changed, and in opposite ways:

1. **The owner reversed the suspension** (decision D-08, verbatim in `docs/DECISIONS.md`):
   the ladder is live again, and the stated reason is not that it improves this codebase --
   it is that **the traversal itself is the asset** for training a software-building model.
   Section 8 is that argument with its measurements.
2. **The ladder's cost stopped being a guess.** The owner supplied `C:/urazuke-exp`, a
   controlled experiment in which a much smaller system ran the full 24-step ladder under
   instrumentation. The guessed band was replaced by an estimate calibrated against that
   run: **~135 AI hours and ~164 owner hours** for this project's 25 open steps
   (section 2.4).

So the backlog is now **~255 AI hours** of implementation and **~400 owner hours** in
total. The increase over the earlier figure is a measurement replacing a guess, not a
re-scoping.

**One state fact that the decision does not change.** `yujin.urazuke.status` was probed
in this session and still answers *"Urazuke is disabled for this Forge (Settings >
Urazuke)"*. The decision is made; the configuration switch is still off and only the owner
can flip it. Until then the method's verbs and its evidence receipts stay unavailable, and
every closure keeps using the written-exception path. Do not infer the switch's state from
the decision -- probe it.

---

## 0. Project fingerprint

```yaml
public_name: nac-spec
protocol_name: NAC3
npm_package: "@nac3/runtime"
version: 2.5.2            # single authoritative source: the version constant of the NAC export at the end of js/nac.js
spec_version: "2.5"
license: Apache-2.0
site: https://yujin.app/nac-spec/
mount_path_contract: /nac-spec/   # the tree is NOT supported under any other root (owner decision D-02)
repo_current: C:/yujin-nac-spec             # github yujinapp/nac-spec, branch main, 135 commits
repo_previous: C:/RPAForce/nac-spec_OBSOLETO # github pkuschnirof/nac-spec, 81 commits, frozen at v2.1 on 2026-05-09
repo_monorepo: C:/RPAForce                  # 111 NAC-attributable commits; everything else there is NOT this project
server_side_state: none    # no database, no accounts, no persistence; git history is the only backup
languages: en (normative) + ar de es fr hi it ja pt zh (9 generated translations)
tracked_files: 1049
runtime_size_lines: 8220   # js/nac.js
spec_size_lines: 1792      # SPEC.md
test_files: 20 in runtime/test/ + 11 in e2e/
gate_and_generator_scripts: 46 in scripts/
open_registry_items: 68          # 67 at the previous reading + PND-106, opened for this recalculation
closed_registry_items: 36
method_state: "live by owner decision D-08 (2026-11-11); Forge config switch still OFF when probed"
ladder_open_steps: 25            # PND-004..028, the [WFL-001] tasks, closed in order
```

### What this system is

A **protocol** plus its web presentation. NAC3 makes a web UI addressable by name for an
agent: the author marks interactive elements with five `data-nac-*` attributes, declares a
manifest of capabilities, and an agent can then drive the application deterministically
instead of guessing from pixels. It is **already published and already has adopters**;
every change goes to production. There is no staging environment -- by owner decision the
CI chain *is* the characterization battery, and it runs in full before the deploy step.

### What this system is NOT (do not take these as scope)

- The CRM and the chat intermediary are **consumer examples**, not the product (owner
  decision, 2026-10-24). They are excluded from every number in this report.
- The package `@nac3/*` and the identifiers `data-nac-*` are **not renamable** (owner
  decision D-07): npm does not rename, and the identifiers are declared byte-identical
  across the nine translations in 631 files. A request to rename either contradicts a
  recorded owner decision and must be brought back to the owner before execution.
- The tree is **not servable from a root other than `/nac-spec/`** (owner decision D-02,
  locked by `scripts/check-mount-path.mjs`). This is not a degraded install; it is a
  configuration the project does not promise.

---

## 1. AI-hours invested: 76 h (band 70 to 80)

Unit of account: **AI hours** -- wall-clock time with a live AI coding session, not
human-equivalent effort, and not model compute time. An AI hour includes the time the
owner spent reading what the model returned inside that same session; the two are not
separable from the available records.

### 1.1 The three sources, and why the first count was wrong by 2.1x

A count delivered earlier the same day reported ~36 h. It was wrong because two of the
three sources were invisible to it: the pre-2.2 repository (which the owner then located)
and the NAC work that happened inside the RPAForce monorepo before the spec got its own
repository. The demos the published site serves today (`example.php`, `example-v13.php`,
`example-v20-*.php`) were built in that monorepo. Corrected:

| Source | Window | Commits | Isolated session span |
|---|---|---|---|
| `nac-spec_OBSOLETO` -- v1.0 to v2.1 | 2026-05-05 to 05-09 | 81 | 24.82 h |
| RPAForce monorepo, NAC-attributable only | 2026-05-05 to 05-23 | 111 | 27.75 h |
| `yujin-nac-spec` pre-Forge -- v2.2 onward | 2026-05-11 to 06-28 | 51 | 11.95 h |
| `yujin-nac-spec` Forge era | 2026-10-24 to 11-11 | 84 | 21.36 h |
| **Total NAC-attributable commits** | | **327** | |

The three pre-October sources **overlap in time**: the same sittings touched the spec repo
and the monorepo. Adding their isolated spans (64.52 h) would double-count 9.61 h. The
figure below is computed on the **union** of their commit timestamps, deduplicated.

| Segment | AI hours | Bucket | Method |
|---|---|---|---|
| Pre-Forge, 2026-05-05 to 06-28 | **55 h** (band 51-58) | `BELIEVED` | Union of 243 distinct commit timestamps across the three repos, grouped into 40 sessions at a 90-minute gap; sum of session spans = 54.91 h; plus 20 min for each of the 8 single-commit sessions = 57.58 h; minus up to 4 h for monorepo days where non-NAC commits interleave. |
| Forge era, 2026-10-24 to 11-11 | **21.4 h** (band 19.4-22.0) | `VERIFIED` | 57 saved session transcripts, 15,373 timestamped messages. Sum of inter-message clock, discarding gaps over 10 minutes. The band is the same sum at 5-minute and 15-minute thresholds. |
| **Total** | **~76 h** (band 70-80) | | |

### 1.2 Why the pre-Forge estimate is trustworthy to within a few hours

The commit-session method was **calibrated against the one segment that is measured
directly**. Applied to the Forge-era commits it yields 21.36 h against 21.43 h measured
from transcripts: an error of **+0.3%**. The Forge era has only 1 single-commit session
against 8 in the pre-Forge union, which is the one structural difference between the two
segments and the reason for the singleton correction above.

### 1.3 Day shape of the pre-Forge union (span hours / commits)

```
2026-05-05   1.76 h   11       2026-05-13   0.40 h    2
2026-05-06  12.31 h   43       2026-05-14   0.00 h    1
2026-05-07   7.72 h   46       2026-05-15   0.00 h    1
2026-05-08   9.80 h   33       2026-05-17   1.47 h    4
2026-05-09   9.66 h   45       2026-05-19   1.74 h    3
2026-05-10   1.20 h    6       2026-05-20   0.79 h    7
2026-05-11   1.00 h    8       2026-05-23   0.53 h   10
2026-05-12   1.38 h    5       2026-05-25   3.52 h   10
                                2026-05-29   1.36 h    5
                                2026-06-28   0.27 h    3
```

Five consecutive days (05-05 to 05-09) carry **41.3 of the 54.9 h**: v1.0 to v2.1 was built
in one five-day sprint that also ran six rounds of adversarial peer review across seven
different AI reviewers (the `PromptEvaluacion*.txt` artifacts, 0.6 MB of pasted review
transcript, are in the previous repository).

### 1.4 Volume delivered for those hours

| Metric | Value | Bucket |
|---|---|---|
| NAC-attributable insertions, all three repos | 505,545 lines | `VERIFIED` (git log --numstat) |
| of which generated translations (`i18n/`) | 152,963 lines (30%) | `VERIFIED` |
| hand-authored runtime + tests (`js/`, `runtime/`) | 107,255 lines | `VERIFIED` |
| gates, generators and their red proofs (`scripts/`) | 15,451 lines | `VERIFIED` |
| Forge-era tokens processed | 1,164,596,908 total: 1,136,745,330 cache-read, 20,373,869 cache-create, 7,464,099 output | `VERIFIED` |
| Forge-era turns | 3,894 user / 6,805 assistant over 57 sessions | `VERIFIED` |
| Forge-era registry throughput | 36 items closed in 21.4 h = **0.60 h/item** | `VERIFIED` |

Token accounting for the pre-Forge 55 h: `BLIND SPOT`. No transcripts survive; the work was
done across a mix of tools (the previous repository carries `CLAUDE.md`, `GEMINI.md`,
`AGENTS.md`, `.cursorrules` and `.windsurfrules`, so at least five agent front-ends were in
use). Scaling the measured Forge density would suggest ~19 M output tokens for that
segment; that is an extrapolation, not a measurement, and must not be quoted as one.

---

## 2. Roadmap: 68 open items, ~255 AI hours of implementation with the ladder live

Source of truth: the Forge pending registry (`yujin.pending.list`, re-read 2026-11-11:
67 open, 36 closed). Work on this project is pulled from the registry, not from
conversation.

**What the hours in this table are, and what they are not.** They are *implementation*
hours: writing the change, its automated gate and the gate's red proof, in a live session.
They do **not** include the owner's own test pass. That layer is counted separately in 2.2
and is the larger half of the remaining backlog.

| Group | Items | AI hours | Content |
|---|---|---|---|
| A. Urazuke ladder (`[WFL-001]`, PND-004..028) | 25 | **~135 h** (band 100-175) | **Live again by owner decision D-08, 2026-11-11**, reversing D-06. Steps N2..23: system reading, debt audit, locks, sizing, machine-verified code quality, red tests, observability, performance, vulnerability scanning, retrospective. Estimated step by step in **section 2.4**, calibrated against a measured full run of the same ladder on another system. |
| B. Normative and runtime gaps | 12 | ~20 h | October audit remainder: the `probe` option that is normative in the SPEC and never read by the runtime; HMAC-signed manifests the runtime can neither sign nor verify (4-8 h on its own); the level-2 manifest shape the spec itself calls legacy; the level-1 completion event a link cannot emit after its own unload; a landing page that paints 116 ids and declares 50; six declared actions that never confirm, costing an agent a 5 s timeout; 57 dead internal references; an Audio button on 273 generated pages that goes nowhere. |
| C. Publication channel and shop window | 3 | ~12 h | Publish to npm from CI instead of by hand (needs an `NPM_TOKEN` repo secret -- owner decision); an abandoned public NAC v1.0 that takes **76% of all evaluator traffic**; npm keywords and description that only travel inside the package. |
| D. Infrastructure and the public/internal boundary | 9 | ~14 h | The two browser-dependent gates that do not run in CI; which process documents are public (no lock exists on purpose -- the criterion is undecided); fonts fetched from Google on every visit; the tester form pointed at a sandbox; the contract signing key living without a passphrase on a machine that runs several agent sessions; a dead branch; two non-product pages shipped on every deploy; build scripts of a private repo served publicly. |
| E. Measurement, licensing, research | 4 | ~7 h | Re-measure the 600-run benchmark against 2.5.0; stop counting robots as adopters; investigate the single external traffic origin; the license split. |
| F. Canvas reference plugin (PND-095) | 1 | 6-10 h | Section 15 specifies a per-plugin extension contract for canvas and API surfaces, and a headless demo exercises it -- **against a synthetic target we wrote ourselves.** No reference plugin against a third-party app exists in the tree. |
| G. Uncontrolled surfaces (PND-098..104, gated by PND-096) | 8 | 37-65 h recommended mix (~45 h) | See section 3. All out of scope: 12-18 h. All via plugin: 33-52 h. All with own primitives: 82-134 h. |
| H2. Receipt discipline across the 42 non-ladder items | -- | ~8 h | Not an item: a tax the live method puts on every closure. With the ladder on, `yujin.evidence.run` works again and `shipped` requires the triad (red proof + green + regression) as recorded receipts rather than as transcribed prose. The project already builds gates with their red proofs as policy, so the added cost is the receipt round itself, ~0.2 h per item -- and the written-exception counter stops growing. |
| H. Forge-side and cross-project items | 5 | ~6 h | Not nac-spec code, but open in this registry: the Forge npm card and 19 Forge pages pointing at a repository that answers 404 to any visitor, the Urazuke gates page linking an unpublished decision log, and the Forge receipt defect that cannot name work in another repository. |
| **Non-ladder subtotal** | **42** | **~120 h** (band 93-153) | 112 h of item work plus the 8 h receipt tax |
| **Total, ladder live (the operative figure)** | **67 + 1** | **~255 h** (band 193-328) | |

### Two things this estimate cannot hide

1. **The measured velocity does not carry over.** 36 items closed in 21.4 h is 0.60 h per
   item; the estimate above averages 2.7 h per item, 4.5x slower. The cheap items are
   already closed; what remains includes cryptography in the runtime, CI work, and work
   that cannot start at all. At measured velocity the non-ladder backlog would be 25 h.
   That number is not offered, because it is not credible.
2. **24 of the 42 non-ladder items (57%) are not waiting on AI hours -- they are waiting on
   an owner decision.** Whether to store an npm token as a repo secret; custody of the
   signing key; which process documents are public; and now the door assignment for the
   seven surfaces. Those hours do not begin to run until the owner decides.
3. **The ladder figure is an estimate anchored on a different system.** The anchor run
   (section 2.4) measured the ladder *plus the construction* of a 5,920-line system. This
   project is the other case: the ladder over an already-built, already-published
   85,076-line tree. The anchor experiment names that case explicitly and declares it
   **unmeasured**. The direction of the error is not known: reading an existing system is
   work the anchor never paid, and building one is work this project does not need.

### 2.1 Owner hours: the billable figure is ~400 h, not ~255 h

Unit: an **owner hour** is an hour the owner is at the keyboard, whether or not a model is
running. This is the figure Alignerr asked for; section 1 answers a different question.

**Why the 1:1 premise holds for the implementation layer.** It is not an assumption about
working style. The 21.4 measured hours in section 1 were computed as *attended wall clock*:
the sum of inter-message intervals with every gap over 10 minutes discarded. An interval
only enters that sum if a turn closed it, and a turn only closes when the owner sends the
next one. The measured AI hours of this project are therefore owner-present hours **by
construction**, and the unit carries over to the estimate unchanged.

| Layer | Owner hours | Model live? | How it is derived |
|---|---|---|---|
| L1. Implementation, attended (non-ladder) | 114 | yes | The ~120 AI h above, minus ~6 h that genuinely run unattended: the 600-run benchmark (PND-040), the CI chain waits (PND-049, PND-067), the 273-page and i18n regenerations, the npm tarball pull-back, and the bulk reference sweeps (PND-085, PND-074). |
| L2. Owner decisions (non-ladder) | 12 | no | 24 open items whose blocker names the owner, at 0.5 h each: reading the decision sheet and deciding. Authoring the sheet is attended model work and already sits in L1. Eight such decisions (D-01 to D-08) were produced inside the measured era, so the shape of the act is known rather than hypothetical. |
| L3. Manual test-case authoring (non-ladder) | 16 | yes | 23 items that change observable behavior, at ~0.7 h each. Written together with the functionality, which is the project's own step 10 (PND-015). |
| L4. Manual execution + one regression pass (non-ladder) | 96 | no | Tiered by surface. See 2.2. |
| L5. Ladder implementation, attended | 123 | yes | The ~135 AI h of section 2.4, minus ~12 h that run unattended: the mutation-coverage and duplication sweeps of step 09, the breaking-point runs of step 19, the vulnerability scans of step 18, and the full-tree regenerations the documentation step forces. |
| L6. Ladder gate verdicts + the decisions the ladder forces | 11 | no | 25 machine verdicts the owner reads before a step closes, at 0.25 h each (6 h), plus ~10 decisions the ladder itself raises and cannot answer -- the sizing numbers of step N6, the retention classes, the licence split (PND-094), and whether an adopter's runtime error may reach this project at all (step 22, a privacy question) -- at 0.5 h each. A red step refuses closure, and only the owner may force one. |
| L7. System-wide manual battery, execution (ladder step 10) | 30 | no | Step 10 demands hand-run cases for the **functionality that already exists**, which L3/L4 do not cover: 5 conformance levels, the contract's 27 entries, the 4 declared surfaces, 10 languages, the two delivery doors, and a sample of the 273 generated pages. About 70 cases at ~25 min. The anchor run's equivalent battery was 13 cases for a 4-screen system. |
| **Backlog total, ladder live** | **~400 h** | | Band 320-510; the scenarios are in 2.3. |

**The split that matters for anyone sizing this work.** Of the ~400 h, **253 h need a live
model session** (L1 + L3 + L5) and **149 h are owner-alone hours** (L2 + L4 + L6 + L7)
with no model running and no token cost. More than a third of what remains cannot be
bought with model capacity.

**And the figure in the other currency, because a trainer will ask for it.** The anchor
run's 24 steps cost **~USD 1,575** of model spend measured cache-aware (USD 1,407 floor;
USD 12,384 if the cache discount is thrown away), for 2.44 G input and 7.49 M output
tokens. Scaled by the same 2.9x factor as the hours, this project's ladder is of the order
of **USD 4,600**. `BELIEVED`, and it inherits every caveat of 2.4 -- plus one of its own:
in the anchor run only 1 of 45 turns had a measured cache breakdown and the rest were
inferred from it.

### 2.2 The manual testing layer: the rate is the owner's, and it changes the regime

Rate used, stated by the owner on 2026-11-11: several hours per functionality, including
writing the cases. That lands at 0.7 h of authoring plus 2.5 h of execution for a standard
functionality -- about 3.2 h -- and higher wherever the surface forces a matrix.

| Tier | Items | Per item | Hours | What the pass actually is |
|---|---|---|---|---|
| No manual pass: decision, policy or prose only | 9 | 0 h | 0 | PND-068, 072, 076, 077, 080, 088, 089, 094, 096. Nothing observable changes. |
| Light, gate-verified, owner spot-checks | 10 | 0.5 h | 5 | Dead references and links, a `role` without an `id`, the dead branch, the two non-product pages, the publicly served build scripts, the Google fonts, and the three Forge-side 404 items. |
| Standard functionality | 15 | 2.5 h | 37.5 | The `probe` option, HMAC manifests, the level-1 and level-2 shapes, the six actions that never confirm, 116 ids against 50 declared, the translation-index premise, the Audio button on 273 pages, the audit remainder, the browser gates in CI, the signing key, npm-from-CI, the tester form, the benchmark re-run, the Forge receipt defect. |
| Surface grade: library matrix x browser matrix x a real third-party app | 7 | 6 h | 42 | The canvas reference plugin and six of the seven surfaces. A virtualized grid has to be exercised against at least two virtualizers, a map against Leaflet and Mapbox GL, a PDF against Chrome's native viewer and pdf.js. |
| XR, needs hardware | 1 | 12 h | 12 | PND-104: a headset plus a device matrix, for the one surface no adopter is asking for. |
| **Total** | **42** | | **96 h** | |

**This is a change of regime and should be read as one.** The measured 0.60 h per closed
item did **not** include an owner-executed manual battery: those 36 closures leaned on
automated gates with their red proofs, which is what the delivery contract in section 4
enforces. Requiring hand-written, hand-run cases is the project's own step 10, and it
roughly doubles the remaining backlog. The doubling is the price of that policy, not a
correction of the earlier estimate.

### 2.3 Three scenarios, because one undecided question moves the total by 185 h

| Scenario | Surfaces (the PND-096 door) | Testing regime | Owner hours, ladder live |
|---|---|---|---|
| A. Lean | All seven declared out of scope on the landing page, as canvas already is | Manual cases only where behavior changes | **~320 h** |
| B. Recommended | The mix in section 3: virtualized grids and the computer-use comparison enter scope, the three continuous-space surfaces are declared out | Full regime at the rate above | **~400 h** |
| C. Maximal | All seven with their own primitives | Full regime plus the matrices each new primitive brings | **~510 h** |

Every row already includes the ladder's 164 owner hours (L5 + L6 + L7). Subtract 164 to
read the same scenario with the method switched off again -- which is now a decision the
owner would have to re-make, not the default.

**Calendar is a separate question from hours.** At the pace actually measured in the Forge
era (21.4 h over 19 calendar days, 1.1 h/day) scenario B is roughly a year. At the pace of
the May sprint (41.3 h over five days, 8.2 h/day) it is roughly 49 working days. The anchor
run is a third data point and the most relevant one for the ladder specifically: its 24
steps closed across **3.7 calendar days** of near-continuous conducting, with 73 registry
items closed in that window. The binding constraint sits in L2 and L6: 24 open items plus
about 10 ladder-raised questions gate more than half the work, and a decision's latency is
calendar time, not owner hours.

---

### 2.4 The ladder, step by step, calibrated against a measured full run

The ladder is this project's method: 24 numbered steps (this tree has 25 open, because its
first two were closed before the registry existed), each with a written brief, artifacts at
declared paths, and a **machine verdict** -- the tool evaluates the step green or red, and a
red step *refuses* the closure. Only the owner may force one, and a forced close is counted.

**The anchor, and what it is.** `C:/urazuke-exp` is a controlled experiment, owned by the
same owner, in which four arms were given the same requirement under instrumentation. Arm
C1 is the one that **ran the ladder end to end: 24 of 24 steps closed.** Everything in the
first table below was read out of that repository in this session.

| Anchor run (arm C1) | Measured | Where it is read |
|---|---|---|
| Steps closed | **24 of 24** | `evidence/VERSION_POR_PELDANO.json`, one row per step with its pending id, its commits, its work window and its closing timestamp |
| Turns | **44** (1 with no consumption) | `evidence/costo_en_dolares.json` |
| Clock | **2,790 min = 46.5 h**, median turn 56 min | same |
| Tokens | **2,439,457,613 in / 7,485,681 out** | same |
| Model spend | **~USD 1,575** cache-aware (floor 1,407; naive 12,384) | same |
| Registry | **195 items, 73 closed (71 shipped)** in the run | `tools/yfconfig/projects/c1/pending.json` |
| Calendar | first close 2026-10-31, last 2026-11-04: **3.7 days** | same |
| Seed, before the ladder | **36 code files, 5,920 lines, 1 script** | `arms/A3` and `arms/D1`, the untouched arms, counted this session |
| Tree, after the ladder | **550 code files, 66,342 lines, 101 gate scripts** | `arms/C1`, counted the same way |

So the ladder, on a 5,920-line seed, cost **1.94 h per step** and left **101 machine locks**
where there had been one. That is the rate this project's estimate is anchored on.

**Why the rate cannot be copied across unchanged.** This tree is **85,076 unique code lines**
in 119 files (deduplicated: the versioned copies of the runtime are counted once), 48 scripts,
34 test files, 1,792 lines of normative text, 273 generated pages and 10 languages -- **14.4x
the seed's code**. Cost does not scale with lines, it scales with how many things each step
has to enumerate; and several steps are already partly built here (the recovered map, the
registry, the decision log, 46 gates with their red proofs). The table below is therefore a
**bottom-up estimate with a named nac-spec fact behind every row**, and the anchor rate is
used only as a check on the total.

| Step | Item | AI h | The nac-spec fact that sets the number |
|---|---|---|---|
| N2 Reading the system: recovered map and discrepancies | PND-004 | 3 | `docs/SEMANTIC_TREE.md` (205 nodes) and `docs/DISCREPANCIES.md` already exist. What is missing is the lock that stops the map going stale. |
| N3 The audit as a debt inventory | PND-005 | 4 | The October audit (PND-030) and a 68-item registry exist; the step wants the whole debt as one artifact with its evidence. |
| N4 The safety belt | PND-006 | 5 | `check:release` runs 46 gates, but two browser gates do not run in CI (PND-049) and five stage scripts sit outside the lock. |
| N5 Locks and a producer/consumer map derived from the code | PND-007 | 6 | 119 unique code files; the version constant and the `/nac-spec/` literal each have about ten declaration sites that must be enumerated from code, not from memory. |
| N6 Sizing with real numbers (gate G9) | PND-008 | 3 | No server state at all, so the volumetry is the runtime's: ids per page (the landing paints 116), DOM node counts, the 600-run benchmark, the browser heap. Small, not degenerate. The numbers are the owner's. |
| N7 The normalization backlog, matched to the request | PND-009 | 3 | The registry exists; this reconciles it against what N2 to N5 find. |
| 05 The plan is the registry | PND-010 | 1.5 | Already how this project works (`CLAUDE.md` section 5). The cost is the gate, not the practice. |
| 06 Decisions written next to the code | PND-011 | 3 | `docs/DECISIONS.md` carries D-01 to D-08. The step wants each decision reachable from the code it governs. |
| 07 Measure before building, with an instrument that is itself verified | PND-012 | 4 | `docs/STATUS.md` already carries the command behind every number. The instrument's own red proof does not exist. |
| 08 Tests as locks, proven red | PND-013 | 6 | 46 gates with red proofs is already policy here. What is missing: proving every red actually goes red, plus the two browser gates and five stage scripts outside the lock. |
| 09 Code quality verified by machine, with a gate | PND-014 | 10 | **The largest genuine build.** This tree has no lint, no format ratchet, no dead-code, duplication, coverage or mutation gate. The anchor run finished with exactly those among its 101 `check-*` scripts. |
| 10 Manual test cases written with the functionality | PND-015 | 6 | The battery for the system that already exists: 5 conformance levels, the contract's 27 entries, 10 languages, a sample of 273 pages. The anchor's was 13 cases for 4 screens. Execution is L7 in 2.1, not here. |
| 11 Producer/consumer symmetry and the anti-pattern registry | PND-016 | 6 | No anti-pattern registry exists here. 631 files carry the identifiers and the spec declares them byte-identical across nine translations, so symmetry is checkable and currently unchecked. |
| 12 Honest verification and proportional reporting | PND-017 | 3 | Rule 5 of the working agreement already governs the prose. The step wants the mechanism, not the habit. |
| 13 The periodic audit as input to the plan | PND-018 | 4 | The October audit was a one-off. The step wants it on a calendar with its own gate. |
| 14 Fail-closed, locks, zero silent damage | PND-019 | 10 | This is where the runtime fails **open** today: `probe` is normative in the SPEC and never read (PND-044), and level 3 demands HMAC-signed manifests the runtime can neither sign nor verify (PND-045). Cryptography in a published runtime. |
| 15 CI, environments, secrets and deploy as part of the product | PND-020 | 10 | npm publication is still by hand (PND-067), the contract signing key lives without a passphrase on a shared machine (PND-056), and the deploy exclusion list is maintained by hand with nothing verifying it (PND-068). |
| 16 Full observability and traceability, with a configurable level | PND-021 | 8 | The 8,220-line published runtime has no telemetry of any kind, and adding it must not break an adopter. |
| 17 Persistence layer optimization, measured before and after | PND-022 | 1.5 | **There is no persistence.** The honest close is declaring the step not applicable with the evidence that says so -- which is a real artifact, not a skip. |
| 18 Vulnerability scanning, in the chain and on a calendar | PND-023 | 6 | The only third party on the critical path is Google Fonts, fetched on every visit and declared nowhere (PND-069). Integrity hashes already exist (`build-integrity`). |
| 19 Volume and breaking-point performance tests | PND-024 | 6 | The 600-run benchmark exists but must be re-run against 2.5.0 (PND-040) and extended to an actual breaking point: how many ids before resolution degrades. |
| 20 Living documentation and manuals a person can follow without AI | PND-025 | 10 | The heaviest documentation surface in the tree: 273 generated pages times 10 languages, plus 1,792 lines of normative text, plus a human manual that does not exist. |
| 21 Resource, function and query monitoring out of range, with a cyclic report | PND-026 | 5 | No server, so this lands browser-side and on the site. Proportional, not skipped. |
| 22 Error monitoring and cyclic report: no error without a pending | PND-027 | 5 | A static site has no error channel. **Whether an adopter's runtime error may reach this project at all is a privacy decision for the owner**, not an implementation choice. |
| 23 The agent inside the system, and the retrospective with a number | PND-028 | 6 | NAC3 *is* the agent-inside-the-system protocol, so this step is nearly self-referential -- and for a trainer it is the highest-value step in the ladder. |
| **Total** | **25** | **~135 h** | Band 100-175 |

**The check against the anchor.** 135 h over 46.5 h is **2.90x the anchor's cost for 14.37x
its code**, which is an implied scaling exponent of **0.40** on code size. That is sublinear
by a lot, and it is deliberate: the discount is the 46 gates, the recovered map, the registry
and the decision log that this tree already has and the seed did not. If the exponent were
0.5 the ladder would be 176 h; at 1.0 it would be 668 h, which is not credible and is not
offered. The exponent is a **consequence** of the bottom-up table, not an input to it -- it
is reported because it is the single number a reader can argue with.

**The four things this estimate cannot hide.**

1. **The anchor measured the ladder *plus construction*; this project needs the ladder
   *over existing code*.** Arm C1 built its system and walked the ladder in the same 46.5 h.
   Here the system is built, published, and has a delivery contract that forbids breaking it.
   The anchor experiment names this exact case -- "walk the ladder over the finished system"
   -- as the most common real-world scenario and declares it **unmeasured**. The sign of the
   error is unknown: reading an 85,076-line tree is work the anchor never paid; building one
   is work this project does not need.
2. **The anchor's hours comparison is declared open by the owner, not closed** (his words,
   2026-11-01: *"do not close the hours comparison, you are in for a surprise"*). Its own
   method cell rests on 3 items out of 21 and its ledger says the per-item cost is expected
   to fall and cannot yet be measured. Treat the anchor as a floor with a direction, not a
   coefficient.
3. **Nothing in the anchor repository is forced to be current.** Its ledger says so in its
   own words, twice, about itself: no gate checks that file. The figures above were read
   from the machine-written JSON artifacts, not from its prose, for that reason.
4. **The switch is still off.** 135 h of estimate does not begin until the owner flips
   *Settings > Urazuke*. Probed this session: still disabled.

## 3. The seven uncontrolled surfaces (registered 2026-11-11, one item each)

NAC3 sections 1 to 14 assume the relevant surface is the DOM; section 15 adds canvas and
API by per-plugin contract. The landing page declares eight limits and names four surfaces
(canvas/WebGL, closed shadow roots, cross-origin frames, and not-the-web: desktop, native
mobile, terminal). A gate (`e2e/landing-limits-check.mjs`) rejects a tree where a limit is
painted and not declared, or declared and not painted.

**The seven surfaces below appear in neither list -- not as covered, not as excluded.** Each
is now its own registry item with its technical scope and a cost per door, because each is
a high-complexity surface and bundling them hid that. All seven are blocked on the same
owner decision: three doors -- **(a)** enters scope with its own primitives, **(b)** enters
through the section 15 plugin contract, **(c)** is declared out of scope on the landing
page, as was already done for canvas.

| Item | Surface | Why it is hard | (a) own | (b) plugin | (c) out |
|---|---|---|---|---|---|
| PND-099 **SUP-1** | **Virtualized grids** | The most frequent surface in business apps and the most dangerous. The id resolves for the row on screen and vanishes when the virtualizer unmounts the row. The protocol *appears* to work for the first twenty rows and silently stops -- which is exactly the silent damage NAC3 exists to eliminate. Needs row identity separated from node existence, a materialization contract (who scrolls), and `row_not_materialized` distinguishable from `row_does_not_exist`. | 10-16 h | 5-8 h | 2-3 h |
| PND-098 **SUP-2** | **Screenshot agents (computer use)** | Not a surface to cover: the access path that competes with the protocol, and the landing page does not name it even to compare against it. An honest comparison is measurement, not prose: screenshots win on coverage (no author cooperation needed) and lose on cost per action, latency, determinism and verifiability. Asserting that without own numbers violates the project's own reporting rule. | 10-16 h (measured bake-off) | 3-5 h (declarative) | 0 h |
| PND-100 **SUP-3** | **Map canvases** | Mixed surface: controls are DOM, markers may be DOM (Leaflet) or pixels (Mapbox GL), tiles are always images. The current canvas limit reads as if the whole map were excluded. Worse: what is actionable is often a *position* -- center here, select this radius -- and a node name cannot express a coordinate. | 12-20 h | 5-8 h | 2-3 h |
| PND-101 **SUP-4** | **Video and audio players** | Half of what is actionable is a *temporal coordinate* ("go to 4:12", "turn on German captions"), not a button. Native browser controls expose no addressable nodes at all. Confirmation is its own problem: verifying a playback action means reading a continuous state that changes while it is being read, and the protocol's confirmation contract assumes discrete events. | 10-16 h | 4-7 h | 2-3 h |
| PND-102 **SUP-5** | **Embedded PDF viewers** | Falls partially into two declared limits and fully into neither: Chrome's native viewer exposes no nodes and cannot be marked up; pdf.js paints to canvas but keeps a DOM text layer. A PDF has pages, a text flow and AcroForm fields -- not elements. Read-only use collides head-on with the published premise that NAC3 does not read pixels. | 8-14 h | 4-6 h | 2-3 h |
| PND-103 **SUP-6** | **Voice-only, no DOM** | The only one of the seven that would leave the protocol *better* positioned. If the manifest alone is enough for an agent to operate an application with nothing on screen, NAC3 stops being a DOM markup layer and becomes a capability interface of which the DOM is one incarnation. That is a reframing, not a feature; both framings cannot be asserted at once. | 8-12 h | 4-6 h | 2-3 h |
| PND-104 **SUP-7** | **XR and 3D (WebXR)** | Breaks three premises at once: a node name does not locate an entity in space; there is no click (gaze, grab, gesture, each with duration); and scene state renders at 72-90 fps with no discrete "it happened" event. No standardized scene tree exists across Three.js, Babylon, A-Frame and Unity WebGL. Largest single piece in the registry, with no adopter asking for it. | 24-40 h | 8-12 h | 2-3 h |

**The structural finding, for whoever decides.** Three of the seven -- maps, player time and
XR -- are the same problem in different dimensions: they ask to address a **continuous
space**, and the protocol can only name **discrete elements**. Deciding them together is
cheaper than deciding them one at a time, and the answer is a single question: does NAC3
add continuous addressing, or do all three go out of scope for the same stated reason?

**The priority finding.** SUP-1 (virtualized grids) is among the cheapest of the seven to
resolve properly and is the only one whose absence produces silent damage inside the
protocol's own promise. Spending 24-40 h on XR before closing SUP-1 would be building for
the rarest surface ahead of the most common one.

---

## 4. Delivery contract (a change is not delivered until both doors agree with the tree)

- **Package.** `npm install @nac3/runtime`, published from `runtime/`.
  `scripts/verify-npm-publication.mjs` **pulls the published tarball back** from the
  registry, verifies its bytes against the registry-declared hash, unpacks it and compares
  every file in both directions against the tree of that version. Runs on every push, in
  `check:release`, and in the package `postpublish`.
- **Site.** The `<script>` served from `https://yujin.app/nac-spec/`, deployed by
  `.github/workflows/deploy.yml` on every push to `main`. After deploy,
  `smoke-live-landing.mjs` and `verify-contract-api.mjs` verify **from outside** that what
  the server returns is this tree.
- **Before pushing:** `npm run check:release`.
- **Every gate ships with its own red proof** (`test-*-gate.mjs`): a gate that has never
  been seen to fail is not a gate. Adding a gate means adding its red proof.
- **Declared hole:** the two browser-dependent gates (`test:limits`, `test:cli-levels`) do
  not run in CI (PND-049), and five stage scripts sit outside the gate. "The chain is
  green" does not mean "everything present is tested", and must not be reported as if it
  did.
- **Still manual:** publication to npm. Automating it needs an `NPM_TOKEN` repo secret
  (PND-067, owner decision). A divergent publication cannot pass unnoticed today, but it
  can still happen.

---

## 5. Working rules an AI agent on this repository must follow

From `docs/WORKING_AGREEMENT.md` (accepted in full by the owner on 2026-10-30; seventeen
rules, binding in their entirety). The four most often broken, condensed -- the binding
text is the agreement's, not this summary's:

1. **Exact scope (rule 3).** Not more and not less than what was asked. Anything noticed in
   passing is registered as a pending with its evidence; it is not fixed in passing.
2. **Never report as done what was not verified (rule 5).** Every report splits into three
   named buckets: verified (ran, read, reproduced, with a receipt), believed (assumed), and
   blind spot (what this work cannot see).
3. **No rewrites (rule 7).** Nothing unrequested is refactored and no module is rewritten,
   however improvable it looks. This system is published and has adopters: "I improved it"
   and "I broke it for an adopter" are the same change seen from two sides.
4. **Current behavior is the specification (rule 10).** A difference between what the code
   does and what the normative text says is a **discrepancy for the owner to decide**, not a
   bug to fix silently. It is raised at the moment, one at a time.

Also binding: **ASCII-only in product code** (no characters above 0x7F in `.ts`, `.tsx`,
`.py`, `.php`, `.sql`, `.json` outside i18n catalogs); the English `SPEC.md` is normative
and the nine translations are regenerated per version with identifiers byte-identical; the
version is declared **once** in `js/nac.js` and everything else derives it, with
`npm run check:version` rejecting any disagreement.

**Urazuke, the project method, is suspended** (owner decision D-06, 2026-11-07, verbatim:
*"Apaga el metodo urazuke, no le des bolilla por ahora. Ya lo apague del config."*). A
consequence that matters operationally: `yujin.evidence.run` is disabled, so **this project
cannot produce evidence receipts**, while the registry requires the red-green-regression
triad to close an item as shipped. Closures therefore use the registry's written escape
(`sin_recibos_porque`), transcribing commands and results so the owner can run them
verbatim, and each such closure is **counted as an exception** in `pending stats`.

---

## 6. Certainty ledger

**VERIFIED -- added in the 2026-11-11 revision** (read out of `C:/urazuke-exp` in this
session): arm C1 closed 24 of 24 ladder steps, in 44 turns, 2,790 min of clock,
2,439,457,613 input and 7,485,681 output tokens, ~USD 1,575 cache-aware, 73 of 195 registry
items closed between 2026-10-31 and 2026-11-04; the untouched arms A3 and D1 are 36 code
files and 5,920 lines with 1 script, and C1 is 550 files, 66,342 lines and 101 gate scripts,
all four counted with the same command this session; this tree is 85,076 unique code lines
in 119 files after deduplication; the method's own hypothesis verdicts as its ledger records
them (H1 sustained, H2 and H3 falsified, H4 inconclusive, H5 not evaluable); the gate
catalogue swap moving the same 24 steps from 20 green / 4 red to 11 green / 13 red; and
`yujin.urazuke.status` still answering *"Urazuke is disabled for this Forge"* after decision
D-08 was taken.

**VERIFIED** (a command was run or a file was read in this session, 2026-11-11):
the 21.4 measured Forge-era hours; 15,373 timestamped messages across 57 sessions;
1,164,596,908 tokens processed; 327 NAC-attributable commits across three repositories and
all their timestamps; the +0.3% calibration error of the commit-session method against the
measured segment; 505,545 insertions and their split by path; 67 open and 36 closed registry items
(re-read 2026-11-11; 68 open after PND-106 was opened for this recalculation), of which 25
are the ladder and 24 name the owner as their blocker; the absence of any Claude Code transcript directory for the pre-October work; the
first commit of the previous repository (2026-05-05 11:55, "NAC v1.0 -- initial public spec
+ reference implementation"); the current version 2.5.2 and its single authoritative
declaration site.

**BELIEVED** (derived, calibrated or estimated -- do not quote as measurement):
the ~135 AI h and ~164 owner h of the ladder (section 2.4) and therefore the ~255 AI h and
~400 owner h totals; the 0.40 scaling exponent, which is a consequence of the per-step table
and not a law; the ~USD 4,600 of model spend for the ladder; the 55 pre-Forge hours and
therefore the ~76 h total; the contamination discount applied to
monorepo days; every hour in sections 2 and 3, which are effort estimates; the ~19 M output
tokens extrapolated for the pre-Forge segment; the four owner-hour layers of 2.1 -- the
~6 h judged genuinely unattended, the 0.5 h per owner decision, and the 0.7 h + 2.5 h
manual-testing rate, which is the rate the owner stated on 2026-11-11 and not a measured
one.

**BLIND SPOT** (what this measurement cannot see):
(1) the split, inside any active hour, between model work and the owner reading the result
-- the two are not separable from the records; (2) token and cost accounting for the
pre-Forge 55 h, since no transcripts survive from the five tools in use then; (3) design
work that left no commit and no transcript -- conversations in web chat interfaces, which
the peer-review artifacts prove happened and do not timestamp; (4) whether the
NAC-attributable path filter on the monorepo captured every relevant commit, or whether NAC
work also landed in commits whose paths do not match the filter; (5) the manual-testing
layer has no precedent in this project to calibrate against: no owner-executed test battery
has ever been timed here, because the 36 closed items leaned on automated gates with their
red proofs instead, so L3 and L4 of 2.1 (112 of the 230 h, 49%) rest on a stated rate and
on nothing measured; **(6) the ladder over an already-finished system is unmeasured
everywhere, including in the experiment that measured the ladder** -- arm C1's 46.5 h bought
construction *and* traversal of a 5,920-line system, while this project needs traversal only,
of a tree 14.4x larger that is already published and may not be broken. The anchor
experiment names this case, calls it the most common real-world scenario, and leaves its
cell empty. Nothing in sections 2.4 or 8 closes it; running the ladder here is what would.

---

## 7. Reproduction appendix

```bash
# open registry
#   Forge verb: yujin.pending.list {status:"open", limit:100}
#   -> 67 open at the first reading, 68 after PND-106; 25 titled [WFL-001] (the
#      ladder, live again under D-08); 24 with category user_blocked or a
#      blocker_who naming the owner
# measured hours, Forge era
#   C:/Users/ASUS/.claude/projects/C--yujin-nac-spec/*.jsonl
#   -> sum inter-message deltas, discard gaps > 600 s
# commits, three repos
git -C C:/RPAForce/nac-spec_OBSOLETO log --all --pretty='%at|%ad|%s' --date=iso-strict
git -C C:/RPAForce log --all --pretty='%at' -- 'docs/NAC*' 'packages/nac-*' '*example*.php' 'crm_desa/yujin2/js/nac.js' 'docs/*NAC3*'
git -C C:/yujin-nac-spec log --all --pretty='%at|%ad|%s' --date=iso-strict
# session grouping: 90-minute gap, sum spans, add 20 min per single-commit session
# line churn
git log --all --pretty=tformat: --numstat | awk '{a+=$1;d+=$2} END{print a,d}'
# version coherence and the full chain
npm run check:version && npm run check:release
# the gates that do not run in CI (declared hole, PND-049)
npm run test:limits ; npm run test:cli-levels
# unique code lines of this tree, deduplicated (the runtime has versioned copies)
#   git ls-files | grep -E '\.(js|mjs|ts|tsx|php)$' | grep -vE 'bundle|\.min\.|/dist/'
#   -> hash each file, count lines once per distinct hash -> 119 files, 85,076 lines
```

```bash
# ---- the anchor run, all of it read out of C:/urazuke-exp ----
# cost, turns, clock and tokens per arm
node -e "console.log(JSON.stringify(require('C:/urazuke-exp/evidence/costo_en_dolares.json').filas,null,1))"
# one row per ladder step: pending id, commits, work window, closing timestamp
node -e "console.log(require('C:/urazuke-exp/evidence/VERSION_POR_PELDANO.json').filas.length)"
# the arm registry: 195 items, 73 closed, 71 shipped
node -e "const a=require('C:/urazuke-exp/tools/yfconfig/projects/c1/pending.json');console.log(a.length,a.filter(x=>x.closed_at).length)"
# seed vs post-ladder size (A3 and D1 are the untouched arms)
#   for a in A3 B1 C1 D1; do find $a -type f \( -name '*.ts' -o -name '*.mjs' -o -name '*.js' \) \
#     -not -path '*/node_modules/*' -not -path '*/coverage/*' | wc -l; done
# the hypothesis verdicts, the catalogue swap and the evaluator calibration
#   C:/urazuke-exp/LEDGER.md          (its own ledger says nothing forces it to be current)
#   C:/urazuke-exp/evidence/ESTIMACION_MANUAL.md   (the human baseline, declared OPEN by the owner)
```

This file lives under `docs/internal/`, which the deploy workflow excludes in its entirety
with a single anchored rule (`--exclude='/docs/internal/'`), verified 2026-11-07 by a dry
run of the workflow's own `rsync` with a positive control and a red proof. It therefore does
not reach the public site. A document written directly into `docs/` -- not under
`docs/internal/` -- **is still published by default** (PND-068).

---

## 8. Why the owner switched the ladder back on: the traversal is the asset

This section exists because the owner's reason for reversing the suspension (D-08) is not a
software-quality claim about this tree. It is verbatim: *"this is the richest material I can
give Alignerr to train their models to build software."* What follows is that claim with the
measurements that support it **and the measurements that cut against it**, because a buyer
who finds the second set unaided stops believing the first.

### 8.1 What one step emits

A step is not a prompt-and-answer pair. Each of the 25 steps emits, in order:

1. a written **brief** (what this step must prove, frozen and versioned -- the anchor run
   pins its prompt set by content hash, `0ced376f...`, and the hash is re-verifiable today);
2. the agent's **work**, as commits that name the step;
3. **artifacts at declared paths** -- the step says where its output must live, so presence
   is checkable without reading prose;
4. a **machine verdict**, green or red, produced by a gate catalogue and not by the agent's
   summary. A red step *refuses* the closure;
5. a **registry closure** carrying the triad of receipts (red proof, green, regression), or
   an explicit forced close with a written reason **that is counted as an exception**.

That shape is what makes the trace usable as supervision: every turn has a label that was
not written by the thing being labelled, and a refusal is recorded as a refusal rather than
smoothed into a success.

### 8.2 The rubric is a dial, which makes ablation cheap

The gate catalogue is a versioned, swappable artifact. The anchor run swapped it on finished
work and re-evaluated the **same 24 closed steps**:

| Gate catalogue | Green | Red |
|---|---|---|
| the one in force when the steps closed | 20 | 4 |
| `2026.10.17`, adopted afterwards | 11 | 13 |

Nine steps flip from green to red (9, 10, 11, 13, 14, 19, 20, 22, 23) with no change to the
work. The owner's rule for reporting this, adopted the same day, is the useful part: the
state is not "24 closed", it is **"24 closed under a catalogue beneath which 13 would not
pass today"** -- a figure carried with its condition. For a trainer, that is a reward model
whose strictness is a knob, with a worked before/after on real trajectories.

### 8.3 What the experiment falsified about its own method

Its five hypotheses were pre-registered. Three do not survive:

| | Verdict | The number |
|---|---|---|
| H1 the method consumes more | **SUSTAINED** | 27,956,309 input tokens with the method against 20,433,616 without: **+36.8%**; clock 68.8 against 61.3 min |
| H2 the method satisfies more acceptance criteria | **FALSIFIED** | **27 of 27 both.** Identical. This was the experiment's central hypothesis. |
| H3 the difference shows up in severity-1 defects | **FALSIFIED** | one each, and it is **the same defect** |
| H4 without the method, "done" is declared on less evidence | inconclusive | artifacts 3 against 2 for the method; test-to-code ratio 0.366 against 0.485 against it |
| H5 the evaluator with the method scores better | not evaluable | 2 of 3 evaluations missing |

And its own reading of its gates: of 17, **9 guard a property anyone putting a system into
production would want; the other 8 guard the traceability of the traversal**, and none of
the 17 measure authorization, recovery or observability -- which are three of the five lines
the arms fail. A run can be 17-for-17 green and still not be shippable. The method's authors
wrote that down about themselves.

**So the honest pitch is narrower than "the method makes better software", and it is still
worth something:** what is measured is not a quality lift, it is a **traversal that a machine
can evaluate step by step, at a measured premium of about 37% in tokens**. Whether the code
ends better is open. Whether the trajectory is labellable is settled.

### 8.4 The finding most directly useful to a labelling business

Four evaluator passes were run over the finished systems. **All four found the authorization
bypass. All four graded it severity 3 when it is severity 1.** Finding was not the problem;
**grading** was. For anyone building or buying evaluation labour, that is the result: the
expensive failure mode is not blindness, it is calibration -- and it reproduced four times
out of four.

Two more in the same vein, both self-inflicted and both recorded: the experiment catalogued
**37 errors of its own**, 14 of them errors *of the instrument*, and five of those fourteen
have the same shape -- **the instrument measured its own assumption**. One of them published
a false statement into a report before it was caught. All five were caught the same way: by
running the red before believing the green.

### 8.5 The human baseline, for scale

From the same experiment, for the 5,100-line system the arms built:

| Path | Cost | Passes the line? |
|---|---|---|
| Manual, atomic decomposition | **646 h** floor, ~1,000 h realistic | unmeasured |
| With assistant AI | 550-700 h, plus 17-26 h of review | unmeasured |
| AI without the method | **61 minutes** | **NO** -- fails 4 of 5 lines |
| AI with the method mutilated | **69 minutes** | **NO** -- the same 4 |
| AI with the ladder walked | 44 turns, 46.5 h | the cell the experiment set out to fill |

Two caveats that belong to the owner, not to this report: he declared the hours comparison
**open, not closed** (*"you are in for a surprise"*, 2026-11-01), and the 646 h is published
as a floor, not a central estimate. The external datum the same document leans on is the
METR 2025 randomized trial -- 16 experienced developers, 246 real tasks in repositories they
knew, **19% slower** with AI tools while believing they were 20% faster, a 43-point
calibration error in the wrong direction.

### 8.6 What running the ladder *here* would add that the anchor cannot

The anchor is a 5,920-line system built from scratch by an agent. This tree is the other
case, and the experiment's own document names it as the one that matters most in practice
and leaves it empty: **the ladder over software that already exists, is published, has a
delivery contract, and may not be broken.** Specifically, a run here produces trajectories
under conditions the anchor never had:

- **a byte-level delivery gate.** A change is not delivered until the published tarball is
  pulled back from the registry, hash-checked and compared file by file in both directions
  against the tree of that version, and the live site is verified from outside. Reward signal
  that cannot be talked into existence.
- **46 pre-existing gates, each with its own red proof**, so the steps about locks start from
  a real baseline instead of from zero.
- **a normative text with 9 generated translations and 631 files carrying identifiers
  declared byte-identical**, which is a producer/consumer symmetry problem at a scale a toy
  cannot have.
- **cryptography that is normative and absent** (level 3 wants HMAC-signed manifests the
  runtime can neither sign nor verify), which is the kind of fail-open gap step 14 exists to
  find, sitting in published code.
- **a 17-rule working agreement** that is an explicit alignment spec for the agent -- scope
  discipline, never report unverified work as done, never rewrite, current behavior is the
  specification -- with recorded violations and corrections to learn from, including
  corrections made inside this very report.

### 8.7 What this section is not

One project, one owner, one agent family, and an anchor whose central hypothesis is
falsified at small scale. Nothing here establishes that the ladder produces better software.
What it establishes is that the ladder produces a **step-labelled, machine-graded, cost-
measured trace of software work**, that the premium for producing it is about 37% in tokens,
and that the one cell nobody has filled is the one this project would fill. That is the
offer. Anything stronger than that would not survive the first person who reads the anchor's
own ledger.
