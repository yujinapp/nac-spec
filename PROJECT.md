# NAC3 -- Project orientation + programming norms

> **Read this file first** before touching any code in this directory.
> If you're a fresh Claude Code session opening the NAC3 tree, this is
> what you need to know before you make any change.

---

## 1. Repo topology

There are TWO physical locations that hold NAC3 code. Knowing which is
which is non-optional -- mixing them up has caused real production
incidents.

| Location | Role | Push policy |
|---|---|---|
| `github.com/yujinapp/nac-spec` | **Canonical public repo.** This is the URL NPM, the landing page, every "made with NAC3" reference, and external adopters point at. It is the source of truth for the NAC3 spec + reference runtime. | Force-push allowed only from a fully-tested local snapshot. Never write directly here without verification. |
| `github.com/pkuschnirof/rpaforce-crm` (this monorepo) | **Development monorepo.** Holds the CRM + many other Yujin projects + a working copy of NAC3 under `yujin.app/nac-spec/` and `packages/nac/`. Used for fast iteration during a feature cycle. | Regular push to main is fine for iteration. After each release wraps, the NAC subset is force-pushed to `yujinapp/nac-spec` and the local copies are deleted. |
| `npm: @nac3/runtime` | The published npm package. | `npm publish` from `packages/nac/` (the rpaforce-crm copy) OR from a fresh clone of `yujinapp/nac-spec/runtime/`. Must match canonical SPEC.md at publish time. |

**Mapping of paths between the two repos:**

| rpaforce-crm | yujinapp/nac-spec |
|---|---|
| `packages/nac/` | `runtime/` |
| `yujin.app/nac-spec/` | root (`SPEC.md`, `js/`, `demos/`, `docs/`, etc) |

**Rule (`feedback_project_md_required`):** if you are the model
opening this project, **read this PROJECT.md before any edit**. If
you cannot reconcile what you see with what this file says, **ask
before assuming**. Repo confusion in May 2026 cost a full afternoon
of work + one unintended npm publish; this rule exists to prevent
recurrence.

---

## 2. RFC process

Every spec-affecting feature analysis becomes an RFC. **No
"design-by-commit"** -- writing the implementation before the RFC is
captured is the same as not doing the RFC.

### 2.1 Where RFCs live

- **Canonical location**: `rfcs/` at the root of `yujinapp/nac-spec`
  (and the equivalent `yujin.app/nac-spec/rfcs/` in rpaforce-crm).
- RFC index at `rfcs/README.md` is the **single source of truth for
  which RFCs exist and what state they are in**.
- Each RFC is one MD file: `RFC-V<MAJOR>-<NN>-<short-title>.md`.
- RFCs MAY also have a rendered HTML companion under `docs/RFC_V*.html`
  for browser viewing on the landing.
- Older RFCs that were proposed but discarded stay in `rfcs/` with
  status `Cancelled` -- never deleted.

### 2.2 RFC states

Every RFC declares ONE of five states, prominently at the top:

| State | Meaning | Code in runtime? |
|---|---|---|
| **(a) Proposed** | Spec drafted, design under review. Comment period open. | No |
| **(b) In implementation** | Spec approved, code in flight on a branch (or in the working tree). Not yet shipped to any npm version. | Partial, on a feature branch |
| **(c) Implemented** | Code merged to main but not yet published. Reviews underway, tests passing locally. | Yes, in main, unreleased |
| **(d) Alpha** | Published to npm as `X.Y.Z-alpha.N`. Real adopters can opt in. Bugs allowed, contract may tighten before GA. | Yes, in an alpha tag |
| **(e) Production** | Published as stable `X.Y.Z`. Contract frozen. Breaking changes require a new RFC + major bump. | Yes, in a stable tag |

A status change in the index requires the corresponding RFC file to
be updated in the same commit.

### 2.3 SPEC + RFC sync invariant

**SPEC.md is ALWAYS in sync with the RFC index.** If an RFC moves to
state `Implemented` / `Alpha` / `Production`, SPEC.md MUST document
the feature in normative language at the same time. If an RFC moves
back to `In implementation` (rare), SPEC.md MUST be reverted to the
pre-RFC text.

### 2.4 Docs that MUST update on every RFC state change

This is the **doc-update invariant**: every RFC state transition is a
no-op until ALL of the following are also updated in the same commit
(or the same PR if work is split). No "I'll do the docs later" -- the
docs ARE part of the feature.

| Doc | Updated when | What to update |
|---|---|---|
| `rfcs/RFC-V<NN>-*.md` | every transition | bump the status line at the top + add a dated note explaining the transition |
| `rfcs/README.md` (RFC index) | every transition | move the row to the new state column / update the "Shipped in" cell |
| `SPEC.md` | `In implementation` -> `Implemented` | add the normative spec section; drop any "(planned)" markers |
| `runtime/CHANGELOG.md` (canonical) + `packages/nac/CHANGELOG.md` (mirror) | `Implemented` -> `Alpha` and `Alpha` -> `Production` | add the version entry referencing the RFC ids |
| `README.md` (canonical and runtime) | `Alpha` -> `Production` | update the "Status" + "Made with NAC3" sections |
| `index.html` (landing) | `Alpha` -> `Production` | bump version pill, footer date, asset cache-busts, demo card if a new example PHP exists |
| `docs/V<X>_STATUS.md` | every transition during a release cycle | tick the row for the RFC |
| Manual de Usuario (`docs/USER_MANUAL.md`) | `Implemented` or later (whichever introduces user-visible behavior) | section on how the feature behaves from the user's perspective + screenshots / GIFs |
| Manual de Diseño Técnico (`docs/TECHNICAL_DESIGN.md`) | `Implemented` | architecture-level description: where the feature lives in the runtime, what state it owns, what events it fires, how it interacts with other features. Aimed at integrators and contributors. |
| `IMPLEMENTATION_GUIDE.md` | `Alpha` or later | adopter-facing how-to: minimal manifest snippet, common pitfalls, migration notes |
| `README_DEMOS.md` + `demos/index.html` (lista de demos) | when a new `example-v*.php` ships | add the new demo card / entry + screenshot link |
| `benchmark/index.html` / `methodology.html` | when an RFC changes any measurable behavior (success rate, latency, silent damage) | re-run the relevant benchmark slice + update the published numbers + add an entry to `docs/BENCHMARK_PROVENANCE.md` |
| `PROMO_WEEK_*.md` / launch posts | `Production` of a major feature | draft the post for HN / Show HN / Discord / Twitter as part of the release commit |
| Sumi Discord KB (`tools/discord-setup/worker/nac3-knowledge.generated.mjs` -- regenerated by `build-knowledge.mjs`) | `Implemented` or later | re-run `node build-knowledge.mjs` so the /sumi command answers from the new SPEC |

If a doc on this list doesn't exist yet, **create it in the same
commit** as the first RFC that needs it. Don't park the doc as
"TODO".

### 2.5 Release flow (atomic per release)

When you ship a release:

1. RFC index is updated (state moves to next phase).
2. The RFC file itself is updated (notes per phase).
3. SPEC.md is updated to reflect what's in the runtime now.
4. CHANGELOG entry references the RFCs by id.
5. README + landing updated.
6. All docs from sec 2.4 above updated.
7. All in a SINGLE PR (no "I'll sync the spec later").

CI gate (target, currently manual): a linter that fails the build if
SPEC.md mentions a feature whose RFC is `Proposed`, or if an RFC is
`Production` but SPEC.md has no corresponding section, or if a doc
in sec 2.4 was not touched in the same PR as the RFC transition.

---

## 3. Programming norms

These are the non-negotiable rules for any code that lands in NAC3.

### 3.1 Tests

- **100% test coverage objective.** Every public function in
  `js/nac.js` (anything exposed on `global.NAC.*`) has a test in
  `runtime/test/` (the canonical npm-package test dir) AND in
  `packages/nac/test/` (the monorepo working copy). The two must
  stay identical at release time -- the build script enforces.
- **100% PASS objective.** `npm test` returns exit code 0 with zero
  FAIL lines. Pre-existing failures are NOT acceptable -- fix or
  delete the test. There is no "known-failing-but-not-our-fault"
  status.
- **TDD per feature.** Before implementing, write a test file that
  fails RED for the new behavior. Then implement. Then commit.
  Acceptable to skip TDD only for trivial extractor / formatter
  changes where the test would be a 1:1 mirror of the impl.
- **Evidence required for spec claims.** Any RFC that ships
  `Implemented` or later carries a passing test or set of tests
  cited in the CHANGELOG entry by file name.

### 3.2 Architecture

- **Agnostic by default.** The runtime knows about NAC primitives:
  roles, ids, verbs, manifests, backend kinds. It knows NOTHING
  about any specific application (Collabora, Figma, the CRM,
  whatever). Application-specific logic lives in plugin manifests
  + decoration tooling (Forge), never in the runtime.
- **Zero internal fallback.** No `if (newImpl) {...} else
  {legacyImpl}` for the same system. If the new code fails, fix
  it; don't silently degrade to the deprecated path. Fallback
  between DIFFERENT systems (DOM mirror -> postMessage ->
  script-bridge in V25-01) is allowed because they are different
  systems; fallback within the same system is regression in
  disguise. See `feedback_no_fallback_to_legacy`.
- **Zero silent damage.** When the runtime cannot satisfy a
  request (ambiguous, not found, blocked), it MUST throw a
  structured NacError + emit a structured event. It MUST NOT
  guess + dispatch + hope. V2.4 strict resolution + V24-05
  authority + the disambiguation contract all encode this.
- **Industrial quality.** Naming clear, errors structured,
  provenance emitted, docs in spec + RFC + CHANGELOG. Nothing
  hardcoded that belongs in a manifest. Nothing that a reviewer
  could call a shortcut.

### 3.3 Code style

- ASCII-pure JavaScript in `js/*.js`. No unicode arrows, em-dashes,
  smart quotes (legacy GoDaddy PHP 8.3 constraint inherited from
  the CRM; keep the discipline even though NAC itself runs in the
  browser).
- Function declarations (not arrow expressions) at top level of
  the IIFE. Arrow expressions OK for inline callbacks.
- camelCase JS variables; PascalCase classes; snake_case JSON
  fields + `data-nac-*` attributes (DOM convention).
- Comments explain WHY, not WHAT. Default to no comment; add one
  only when the WHY is non-obvious (hidden constraint, subtle
  invariant, surprising workaround, spec reference).

### 3.4 Build + deploy

- `packages/nac/build.mjs` reads from `yujin.app/nac-spec/js/*.js`
  (single source of truth) + emits `packages/nac/dist/*` bundles +
  syncs SPEC.md/LICENSE into `packages/nac/`. **No JS source lives
  outside `yujin.app/nac-spec/js/`.**
- `npm test` in `packages/nac/` runs the full suite. CI gate (when
  GitHub Actions is wired): same script on every push to main of
  `yujinapp/nac-spec`.
- Release flow: bump `package.json` -> `npm run build` -> `npm test`
  -> commit + tag -> `npm publish` -> mirror force-push to
  `yujinapp/nac-spec` -> verify by fresh clone + re-run tests.

### 3.5 Multi-language (DOM contract side)

NAC user-facing labels in manifests carry `label_i18n` with all 10
supported locales: `es, en, pt, fr, ja, zh, hi, ar, de, it`.
Manifests missing locales fail validate(). This rule comes from the
Yujin CRM mainline (CLAUDE.md rule 7); NAC3 inherits it so plugins
generated by the CRM work cross-locale by default.

### 3.6 Provenance

Every action the runtime dispatches emits a structured event on
`document`. The schema is consistent: `{plugin, source, trusted,
duration_ms, ok, error}` plus role-specific fields. This is what
lets external auditors trace agent activity. **Do not silently
suppress provenance events**, even on failure paths.

---

## 4. Cycle of work

Standard cadence for any feature (from initial idea to shipped):

1. **Discuss + propose.** Open issue or chat with maintainer
   (Pablo). Outcome: RFC drafted as state `Proposed` in `rfcs/`.
2. **Spec.** Draft SPEC.md section behind a `(planned in RFC V-NN)`
   marker.
3. **Implementation.** Tests RED -> runtime impl -> tests GREEN.
   RFC moves to `In implementation`.
4. **Merge.** Commit + push to monorepo main. RFC moves to
   `Implemented`.
5. **Alpha.** Bump to `X.Y.Z-alpha.N` -> `npm publish --tag alpha`.
   RFC moves to `Alpha`. SPEC.md section loses the `(planned)`
   marker.
6. **Soak.** Real adopters opt into the alpha. Bugs fixed in
   `-alpha.M+1` patches.
7. **Production.** Promote alpha -> stable: bump `X.Y.Z`, publish
   `latest` tag. RFC moves to `Production`. Tag the git release.
8. **Mirror.** Force-push the consolidated state to
   `yujinapp/nac-spec` (after #34 verification step succeeds).
9. **Cleanup.** Delete `packages/nac/` + `yujin.app/nac-spec/` from
   monorepo -- canonical now lives only in `yujinapp/nac-spec`.
10. **Pull-clone validation.** Fresh clone of `yujinapp/nac-spec`
    + run `npm test` end-to-end. If 100% green, cycle closed.

---

## 5. Cross-reference index

| Topic | Doc |
|---|---|
| Spec (normative) | `SPEC.md` |
| RFC index | `rfcs/README.md` |
| Changelog | `runtime/CHANGELOG.md` (canonical), mirror at `../packages/nac/CHANGELOG.md` |
| Implementation guide for adopters | `IMPLEMENTATION_GUIDE.md` |
| NPM publish runbook | `NPM_PUBLISH_RUNBOOK.md` |
| V2.5 status checkpoint | `docs/V2.5_STATUS.md` |
| Benchmark methodology + provenance | `benchmark/methodology.html` + `docs/BENCHMARK_PROVENANCE.md` |
| Runtime audit (2.3.0 snapshot) | `docs/RUNTIME_AUDIT_2.3.0.md` |
| Promo / launch playbook | `PROMO_WEEK_2026_05_18.md` |
| Performance test plan | `PERFORMANCE_TEST_PLAN.md` |

---

## 6. Open issues / decisions in flight

(This section is updated per release. Outdated entries get moved to
`docs/V<X>_STATUS.md` archives.)

- V2.5.0 release in flight as of 2026-05-23. Tracking in
  `docs/V2.5_STATUS.md` + the RFC index.
- Migration of `yujinapp/nac-spec` to be the single source of truth
  pending the V2.5 ship + the verification step #34 in CYCLE.

---

*Last reviewed: 2026-05-23 (V2.5 release cycle, Sumi autopilot).
Update this file in the same commit as any topology / norm change.*
