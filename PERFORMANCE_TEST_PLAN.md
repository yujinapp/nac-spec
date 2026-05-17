# NAC3 Performance Test Plan — autonomous execution brief

**Audience:** another Claude Code instance executing this brief on Pablo's
machine.

**Goal:** measure NAC3 performance on dense pages + deep navigability
trees, compare to raw-DOM baselines, publish results as public report.

**Time budget:** 6-10 hours of execution. Stop + report if anything
blocks for >30 min.

**Deliverable:** a self-published HTML report at
`nac-spec/performance.html` plus raw data committed to
`nac-spec/perf/results/<date>/`.

---

## 1. Context (read first)

### What NAC3 is

NAC3 is a semantic contract for AI agents on web UIs. Concrete artifacts:

- **Spec:** `C:\nac-spec-yujinapp\SPEC.md` (canonical spec v2.2)
- **Runtime source:** `C:\nac-spec-yujinapp\runtime\` (the npm `@nac3/runtime`
  package source)
- **Demos:** `C:\nac-spec-yujinapp\demos\` (real working examples)
- **AI playbooks:** `C:\nac-spec-yujinapp\AI_PLAYBOOK_GREENFIELD.md` +
  `AI_PLAYBOOK_MIGRATION.md`

Read SPEC.md sections 1-4 + the AI playbook for greenfield before starting.

### What performance we care about

Six AIs evaluated NAC3 and reported quantitative gains
(`nac-spec/peer-reviews.html`). The gains they cited (80-90% less
hallucination, 90% fewer tokens, etc.) were *estimates*. This test plan
**replaces those estimates with measured numbers** so future evaluations
and publications cite real data.

The seven dimensions we measure (in priority order):

1. **Snapshot generation latency** -- how fast `NAC.describe()` builds a
   serializable tree for an LLM, as a function of N elements
2. **Snapshot size** -- bytes / tokens of the resulting tree, varying N
   elements + N locales
3. **Action dispatch latency** -- `NAC.click(id)` -> ack event round trip
4. **Validation latency** -- `NAC.validate_global({probe: true})` on
   pages of N elements
5. **Memory footprint** -- runtime overhead per registered element + leak
   tests over 30 min repeated cycles
6. **End-to-end LLM round-trip** -- agent operates a page: snapshot ->
   model -> action -> ack. Compared to raw-DOM + heuristic targeting
7. **Bundle size impact** -- @nac3/runtime gzipped, with + without
   tree-shaking

Stretch (nice to have, skip if time runs out):

8. **Cross-browser** -- same tests in Chrome / Firefox / Edge / Safari
9. **Mobile** -- iOS Safari + Android Chrome via emulator
10. **Network simulation** -- snapshot over slow 3G

---

## 2. Setup (before running tests)

### 2.1 Environment

You should run on Pablo's Windows 11 box. Tools you need (most are
already installed):

```bash
node --version      # need >= 20
npm --version       # need >= 10
git --version       # need any modern
```

If anything is missing, ask Pablo. Don't try to install Node
yourself.

Other tools you'll need to install in the project:

```bash
cd C:/nac-spec-yujinapp
mkdir -p perf
cd perf
npm init -y
npm install --save-dev playwright lighthouse@latest tiktoken
npx playwright install chromium firefox webkit
```

Tiktoken is for OpenAI-compatible token counting; for Anthropic Claude
token counting, use the official `@anthropic-ai/tokenizer` if available.
Otherwise use a heuristic: `chars / 4` for English, `chars / 3` for
multilingual.

### 2.2 Repo layout you should create

```
nac-spec-yujinapp/
└── perf/
    ├── README.md               # how to run, generated from this brief
    ├── package.json            # the deps you just installed
    ├── scripts/
    │   ├── gen-page.mjs        # synthetic dense-page generator
    │   ├── benchmark-snapshot.mjs
    │   ├── benchmark-dispatch.mjs
    │   ├── benchmark-validate.mjs
    │   ├── benchmark-memory.mjs
    │   ├── benchmark-llm-roundtrip.mjs
    │   ├── benchmark-bundle.mjs
    │   └── compare-to-baseline.mjs
    ├── pages/                  # generated synthetic pages
    │   ├── dense-100.html
    │   ├── dense-500.html
    │   ├── dense-2000.html
    │   ├── dense-5000.html
    │   └── nested-deep.html
    ├── results/
    │   └── 2026-MM-DD/
    │       ├── raw.json
    │       ├── summary.md
    │       └── charts.html
    └── report.html             # final public-facing report
```

### 2.3 LLM API access for round-trip tests

The round-trip benchmark needs an LLM call. Check Pablo's env vars for:

```bash
echo $ANTHROPIC_API_KEY       # for Claude
echo $OPENAI_API_KEY          # fallback
```

If neither is set, skip the round-trip benchmark and document it
in the report. Don't ask Pablo for keys -- the rest of the suite is
useful without it.

### 2.4 Verify the runtime works locally

```bash
cd C:/nac-spec-yujinapp
cat package.json | grep version    # confirm @nac3/runtime version
ls demos/                          # should have at least one .html demo
```

Open `demos/<first-demo>.html` in Chrome. Open DevTools console. Type:

```js
NAC.describe()
```

Should return a JSON tree. If it errors, escalate to Pablo -- something's
wrong with the demo or runtime, not with you.

---

## 3. Test specifications

### 3.1 Synthetic page generator (`scripts/gen-page.mjs`)

This generator produces pages with N elements arranged in plugins +
sections + actions, following the SPEC's NAC3 shape. Generates locale
variants when asked.

Acceptance criteria:

- Takes `--elements N --plugins P --depth D --locales L` flags
- Writes to `perf/pages/dense-${N}.html`
- Each element has unique `data-nac-id` like `plugin.${p}.action.${i}`
- Each element has `data-nac-role="action"` and `data-nac-action="click"`
- A `<script>` block at the bottom registers all elements via
  `NAC.register({...})` with one entry per element
- `label_i18n` populated for L locales (use realistic strings; pull from
  `peer-reviews.html` as a source corpus if you want)

Sample command line:

```bash
node scripts/gen-page.mjs --elements 100   --plugins 5  --depth 3 --locales 10 > pages/dense-100.html
node scripts/gen-page.mjs --elements 500   --plugins 10 --depth 4 --locales 10 > pages/dense-500.html
node scripts/gen-page.mjs --elements 2000  --plugins 20 --depth 5 --locales 10 > pages/dense-2000.html
node scripts/gen-page.mjs --elements 5000  --plugins 50 --depth 6 --locales 10 > pages/dense-5000.html

# Nested-deep variant: same total N=500 but 12 levels deep
node scripts/gen-page.mjs --elements 500   --plugins 5  --depth 12 --locales 10 > pages/nested-deep.html
```

### 3.2 Snapshot benchmark (`scripts/benchmark-snapshot.mjs`)

Measures `NAC.describe()` latency and serialization size.

For each page in `pages/`:

1. Launch headless Chromium via Playwright
2. Load the page; wait for `NAC` global ready
3. Run `NAC.describe()` 10 times (warm-up: discard first 3)
4. Record:
   - Median latency (ms)
   - 95th percentile latency
   - Resulting tree size (bytes via `JSON.stringify(tree).length`)
   - Approximate token count (chars / 3.5 heuristic, or use tiktoken)
5. Also run `NAC.describe({prune_locale: 'en'})` if the option exists
   in the runtime (check spec) -- record size delta
6. Write results to `results/<date>/raw.json` under `snapshot.<page>` key

Output one row per page in a markdown table:

| Page | Elements | Median latency (ms) | P95 (ms) | Tree bytes | Approx tokens | Tokens / element |
|---|---|---|---|---|---|---|

### 3.3 Dispatch benchmark (`scripts/benchmark-dispatch.mjs`)

Measures the time from `NAC.click(id)` to `nac:action:succeeded`
event firing.

For each page:

1. Load page in Chromium, wait NAC ready
2. Pick 50 random `data-nac-id` values from the page
3. For each: call `NAC.click(id)` + start timer, listen for the ack event +
   stop timer. (If page's actions don't auto-emit ack, fall back to
   measuring "click handled" via mutation observer.)
4. Record median + P95 in ms
5. Compare baseline: `document.querySelector('[data-nac-id="x"]').click()`
   on the same elements. Record delta.

Output a markdown table with columns: page, median (NAC), median (raw),
delta %.

### 3.4 Validation benchmark (`scripts/benchmark-validate.mjs`)

Measures `NAC.validate_global({probe: true})` latency on each page.

The probe mode synthetically dispatches each action and verifies the ack
contract; it's the most expensive validation path.

1. Load page in Chromium, wait NAC ready
2. Call `NAC.validate_global({probe: true})` once (no warm-up; first call
   is the realistic case)
3. Record total ms + number of elements probed + number of failures
4. Write to `validate.<page>` in raw.json

### 3.5 Memory benchmark (`scripts/benchmark-memory.mjs`)

Two sub-tests:

**A — Per-element overhead.** Load each page in Chromium with
`--enable-precise-memory-info`. Use Chrome DevTools Protocol
(`HeapProfiler.collectGarbage`, `Memory.getProcessMemoryInfo`) to take a
heap snapshot before NAC registers any element, then after. Record
delta KB. Divide by N to get bytes/element.

**B — Leak test.** Load `dense-500.html`. Run a loop for 5 minutes:
register 50 elements, unregister, repeat. Take heap snapshots every 30s.
A leak shows as monotonically rising heap size. Acceptance: heap should
stabilize within ±5MB after the first 2 cycles.

### 3.6 LLM round-trip benchmark (`scripts/benchmark-llm-roundtrip.mjs`)

Only run this if `ANTHROPIC_API_KEY` or `OPENAI_API_KEY` is set.

For each page:

1. Load page in Chromium, wait NAC ready
2. Build a snapshot via `NAC.describe()`
3. Construct an LLM prompt asking: "Click the action whose label is
   'Save in Spanish' / 'Submit in Japanese' / etc." Pick 10 such
   prompts per page (randomize labels across locales)
4. Send to LLM, parse the response, expect a JSON action like
   `{verb: "click", nac_id: "..."}`
5. Validate the action via `isActionSafe` (rejects hallucinated IDs)
6. Dispatch the action, wait for ack
7. Record:
   - Total round-trip ms (snapshot -> response -> dispatch -> ack)
   - Token count sent + received per call
   - Hallucination rate: out of 10 prompts, how many returned an
     invalid `nac_id`?
8. Repeat with raw-DOM baseline: snapshot is `document.body.outerHTML`
   pruned to interactive elements; ask the same model the same questions.
   Record same metrics + compare.

Output a markdown table with columns: page, NAC round-trip, raw-DOM
round-trip, NAC hallucination rate, raw-DOM hallucination rate, tokens
in/out NAC, tokens in/out raw.

**Critical:** this benchmark uses tokens you pay for. Cap each test run
at 500 LLM calls total across all pages. If you hit 500 + still have
pages to test, stop and document partial results.

### 3.7 Bundle size benchmark (`scripts/benchmark-bundle.mjs`)

1. Read the published `@nac3/runtime` bundle from `node_modules`
2. Record:
   - Raw size (bytes)
   - Gzipped size (bytes)
   - Tree-shakable size: build a Vite/esbuild bundle that imports only
     `NAC.click` + `NAC.describe`. Record the resulting bundle size.
3. Compare to documented competitors if you know them: ARIA shim
   (no runtime needed, baseline 0), data-testid (no runtime), what
   Playwright includes for selector resolution

### 3.8 Comparison summary (`scripts/compare-to-baseline.mjs`)

Pulls together the LLM round-trip + snapshot benchmarks into a single
"NAC3 vs raw DOM" table. Output a markdown summary that the report.html
template can render directly.

---

## 4. Report generation

After all benchmarks run, produce three deliverables:

### 4.1 Raw data — `results/<date>/raw.json`

Single JSON file with all measurements. Schema:

```json
{
  "ran_at": "2026-05-MM-DDTHH:MM:SSZ",
  "node_version": "...",
  "browser": "chromium 120.0",
  "machine": "Windows 11 / 16GB RAM / Intel i7-1255U",
  "runtime_version": "@nac3/runtime 2.2.x",
  "snapshot": { "dense-100": {...}, "dense-500": {...}, ... },
  "dispatch": { "dense-100": {...}, ... },
  "validate": { ... },
  "memory": { "per_element": {...}, "leak": {...} },
  "llm_roundtrip": { ... },
  "bundle": { ... }
}
```

### 4.2 Summary markdown — `results/<date>/summary.md`

Plain-English summary aimed at developers. Lead with the headline
numbers, then per-section detail. Sample structure:

```markdown
# NAC3 performance — run 2026-MM-DD

## Headline numbers

- Snapshot 5000-element page: X ms median (P95: Y)
- Tokens to describe same page: Z (1 locale) / W (10 locales)
- LLM round-trip on dense-500: A ms NAC3, B ms raw DOM (NAC3 is C% faster)
- Hallucination rate: D% NAC3, E% raw DOM
- Memory per registered element: F bytes
- Bundle gzipped: G KB

## Detailed results

[section per benchmark with tables and observations]

## Caveats

[what wasn't tested, what's noisy, what to redo]
```

### 4.3 Public report — `nac-spec/performance.html`

A Yujin-styled HTML page mirroring the structure of `peer-reviews.html`.
Reuses `css/yujin-tokens.css`. Renders the summary markdown as HTML with
charts (use Chart.js via CDN or inline SVG -- whatever's simpler).

Sections:

1. Headline numbers (KPI card grid)
2. Methodology (what + how, with `<details>` for full scripts)
3. Per-benchmark results (tables + charts)
4. Comparison vs raw DOM (bar chart per metric)
5. Caveats
6. How to reproduce (link to `perf/README.md`)
7. Footer with links to GitHub, npm, Discord (same as `peer-reviews.html`)

Self-NAC3-instrument the page (every interactive element carries
`data-nac-id`, in the spirit of the other docs).

### 4.4 `perf/README.md`

A short "how to run" doc so anyone (Pablo, future Claude Code instances,
external contributors) can re-run the suite. Should walk through:

- Install steps (npm install, playwright install)
- Page generation
- Each benchmark script + what it produces
- How to regenerate the report.html

---

## 5. Execution order

Run in this order. If anything stalls > 30 min, skip + note in summary.

1. **Setup** (~30 min): create `perf/` tree, install deps, verify NAC
   loads in a demo
2. **Page generation** (~30 min): write `gen-page.mjs`, produce all 5
   synthetic pages, verify they load + NAC is happy
3. **Snapshot benchmark** (~30 min): main metric, run + record
4. **Dispatch benchmark** (~30 min): NAC3 vs raw click
5. **Validation benchmark** (~20 min): single-shot per page
6. **Bundle benchmark** (~15 min): static analysis, no browser
7. **Memory benchmark** (~30 min): heap snapshots
8. **LLM round-trip** (~60 min): only if API key set; cap at 500 calls
9. **Report generation** (~45 min): assemble summary + HTML report
10. **Commit + push** (~10 min): single commit to `main` with all
    artifacts under `perf/` plus the new `performance.html`

Total estimated wall-clock: 4-6 hours of compute (much of it Playwright
running headless) + 2-3 hours of you writing scripts + report.

---

## 6. Quality gates

Before committing, verify:

- [ ] All numbers in the report come from `raw.json` (no estimates)
- [ ] Every test that was skipped is explicitly noted (with reason)
- [ ] Report HTML opens cleanly in Chrome (no console errors)
- [ ] All scripts run from a clean clone (test by `git stash` + re-run)
- [ ] Methodology is precise enough that a third party can replicate
- [ ] No PII / credentials in the JSON output

---

## 7. Risks + mitigations

| Risk | Likelihood | Mitigation |
|---|---|---|
| `@nac3/runtime` API doesn't match SPEC (drift between code + spec) | High | Read runtime source first; if `NAC.describe()` doesn't exist by that name, find the equivalent + document the rename |
| 5000-element page crashes the browser | Medium | If Chromium hits memory limit, drop to 2000 + note as the practical ceiling |
| LLM API key missing / out of credits | Medium | Skip round-trip; document. The other 6 benchmarks still produce a useful report |
| Memory benchmark is too noisy | High | Run 3 times, take median; if still noisy, drop to qualitative ("leak / no leak") |
| Playwright version mismatch on Windows | Low | If browser install fails on Windows, fall back to Firefox-only |
| Tests take more time than budget | Medium | Stop at 8 hours wall-clock + report what you have. Partial > nothing |

---

## 8. Output expectations

When done, Pablo gets:

1. A new directory `perf/` in the repo with scripts, pages, results
2. A new file `nac-spec/performance.html` deployable to
   `yujin.app/nac-spec/performance.html`
3. A single commit on `main` with message:
   `perf: NAC3 benchmark suite + initial results (yyyy-mm-dd)`
4. A short text reply summarising:
   - Headline numbers (5 bullets)
   - What you ran
   - What you skipped + why
   - Anything that surprised you (signal worth flagging)
   - URL of the report HTML

Don't push a partial commit and stop. Either finish the run cleanly
or roll back to a clean tree before stopping.

---

## 9. Hard rules

- **No external services beyond Playwright + LLM API.** No cloud
  benchmarking platforms, no paid SaaS.
- **No new dependencies beyond those listed.** If you think you need
  one, ask Pablo first.
- **No commits to `main` until all gates pass.** Use a feature branch
  `perf/initial-suite` and open a PR if you want; Pablo can merge.
- **No prompts that send NAC3 source code to a third-party LLM.** The
  round-trip benchmark sends only synthetic UI snapshots, which is
  fine.
- **No publishing to npm or external services.** Only writes to the
  local repo.

---

## 10. Reference reading order (before starting)

1. This file (PERFORMANCE_TEST_PLAN.md)
2. `SPEC.md` sections 1-4 (skim sections 5+ unless you hit something
   you don't understand)
3. `AI_PLAYBOOK_GREENFIELD.md` -- to understand the canonical NAC3 shape
4. `runtime/` source -- skim the public API (`NAC.click`, `NAC.fill`,
   `NAC.describe`, `NAC.register`, `NAC.validate_global`)
5. `demos/atlas-pro/index.html` or any other working demo -- the
   reference for what a working NAC3 page looks like

If anything is unclear, open `peer-reviews.html` and search for the
relevant capability -- the 6 AIs' notes are decent secondary reference.

---

## 11. Final note

The point of this run isn't to prove NAC3 is fast. It's to **replace
estimates with measurements**. If a measurement contradicts the
peer-review estimates, **report it honestly**. The credibility of the
public report depends on the data being real, not on it being
flattering.

When in doubt:
- Measure rather than estimate
- Report rather than hide
- Skip with a note rather than fake a value

Start with the snapshot benchmark — it's the load-bearing metric. The
rest can stretch or skip; that one can't.

Good luck.
