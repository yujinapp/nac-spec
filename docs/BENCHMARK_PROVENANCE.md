# Benchmark provenance

This document closes the trazability gap between the 600-run benchmark
dataset and the published `@nac3/runtime` package.

---

## Mapping dataset → npm

| Artifact | Value |
|---|---|
| Benchmark dataset publication date | 2026-05-19 |
| Total runs | 600 (5 models × 3 protocols × 4 tasks × 10 iterations) |
| Per-row `runtime_version` field (in JSONL) | `2.2.1` |
| Per-row `manifest_checksum` field (in JSONL) | `67db3eef3658` |
| Per-row `bench_version` field (in JSONL) | `0.1.0` |
| Runtime commit at benchmark execution | `584992b76bac9179d363d820935cbb0cdb8dfe38` |
| npm release of that commit | `@nac3/runtime@2.3.0` |
| Release date | 2026-05-20 |

The benchmark JSONL was tagged with `runtime_version=2.2.1` because that
was the `NAC.version` constant in the runtime at execution time. Between
benchmark execution and npm release, the version constant was bumped
from `2.2.1` → `2.3.0` to reflect the `syncPlugin` + `data-nac-plugin-id`
APIs being public new functionality (MINOR bump per semver).

**The code itself did not change.** The commit hash `584992b…` is the
single point of truth — the npm `2.3.0` and the dataset `2.2.1` are
byte-identical builds of that commit.

---

## What the benchmark validates

✅ **The 2.3.0 decoration + verb + idempotency layer.** Five models
across three protocols, 600 runs, with `STRICT_VERSIONING=false` (the
default). Zero phantom-selector silent damage under NAC3.

✅ **`syncPlugin` idempotency under repeated re-renders.** The fixture
re-renders on every task setup; the manifest stays stable across runs
(checksum 67db3eef3658 across all 600 rows).

✅ **`data-nac-plugin-id` uniqueness enforcement.** The fixture's
`validate_global` runs with this in effect.

❌ **The benchmark does NOT validate the V24-04 enforcement.** With
`STRICT_VERSIONING=false`, the runtime exposes `plugin_version` +
`element_state_hash` in `describe()` output but does not throw
`snapshot_stale` on stale-version dispatches. The 600 runs did not
exercise the OCC contract; they exercised the observable shape of the
runtime under default-disabled enforcement.

❌ **The benchmark does NOT test V24-05 authority primitives.** Those
are RFC draft (see `/rfcs/`), not in the 2.3.0 runtime.

---

## Status for the 2.5.0 release -- the figures are published as historical

**Owner decision, 2026-10-26.** The 2.5.0 release ships these numbers
**declared historical**: they are published as what the 2.3 line did, not as a
claim about the current runtime. Re-measuring against 2.5.0 was taken off the
critical path of the release and tracked as its own work (`PND-040`).

| Run | Date | Measured against | Re-measured since |
|---|---|---|---|
| 600-run benchmark | 2026-05-19 | runtime v2.3 (dataset field `2.2.1`, same commit) | no |
| Conduit case study | 2026-05-22 | runtime v2.3.1 | no |
| Migration paper | 2026-05-20 | runtime v2.3 / v2.3.1 | no |

Each of the three measured runs carries this in its own receipt on the landing
page. The benchmark card says it in full -- *"These figures have not been
re-measured on a later runtime, so read them as what v2.3 did, not as a claim
about the current release"* -- and the Conduit and migration receipts carry the
short form, *"Not re-measured on a later runtime."* The fourth evidence card on
that page, peer reviews, is not in this table on purpose: its percentages are
the six reviewers' own converging estimates and never were measurements, which
is what its receipt now says. The public
limits section says the same thing as a declared limit (sentence 8, approved by
the owner on 2026-10-26 -- see `docs/LIMITS_APPROVAL_2026-10-26.md`).

Cost of the re-measurement, from the original run and not estimated: ~US$15,
1h 23min wall-clock, 600 runs across 5 models, and the owner's keys for the five
providers. Acceptance criteria are in `PND-040`.

---

## Reproducibility

To re-run the benchmark and verify the dataset:

1. Download the bundle: <https://github.com/yujinapp/nac-spec/blob/main/benchmark/nac3-benchmark-v2.3.tar.gz>
2. Install dependencies, configure API keys.
3. Run `bash scripts/run_final_600.sh`.
4. Confirm every row's `manifest_checksum` equals `67db3eef3658`.

Bench page: <https://github.com/yujinapp/nac-spec/tree/main/benchmark/>

---

## Auditor checklist

Anyone verifying the published numbers can:

- [ ] Clone `yujinapp/nac-spec` at tag `v2.3.0` (commit `584992b…`).
- [ ] Compare `package.json` version → matches the npm.
- [ ] Compare `js/nac.js` content against the npm tarball (`npm pack @nac3/runtime@2.3.0` → unpack → diff).
- [ ] Download bundle, run the smoke (3 cells, ~$0.01) → verify `runtime_version` field reads `2.3.0` in the new JSONL (post-bump), `manifest_checksum` reads `67db3eef3658`.
- [ ] Run full sweep, compare aggregate numbers within statistical noise (±2% per cell at N=10).

If any of these diverges, the dataset is suspect; please file an issue.
