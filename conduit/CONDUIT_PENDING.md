# Conduit-NAC3 -- pendientes (cierre como producto)

**Owner:** Pablo Kuschnirof
**Author:** Sumi (Claude Opus 4.7)
**Date:** 2026-05-21 (night session, antes de dormir)
**Reference brief:** "Cierre de Conduit como producto evaluable"
(Pablo + Claude Opus 4.7, 2026-05-21).
**Status:** mid-stream. Audit + Phase B/D done. Phase C/E/F/G/H
pending Pablo's OK after sleep.

This doc captures everything that's done, everything that's
still pending, and everything that's left in a non-production
state so the next session can pick up cleanly.

---

## TL;DR

- Audit precondition (Phase A) **DONE**. Findings reconciled
  except for one explicit divergence (index.html NAC tags).
- N=10 ES default confirmation (Phase B) **BROKEN by my own
  harness bug** -- a regression I introduced when fixing the
  shared-DB feed contamination. Fix is identified; not applied
  pending Pablo's OK.
- Key audit (Phase D) **DONE -- SAFE**. Zero API keys in code,
  build, or git history. .env outside Conduit tree.
- Closing dialogue table (Phase C) **NOT STARTED**. Needs real
  traces extracted from `bench/h4_results/` JSONs once N=10 ES
  reproduces clean.
- Pilot bundle (Phase E) **NOT STARTED**. Bundle exists at
  `/c/yujin-pilot/dist/pilot.bundle.js`; needs copy into
  Conduit + script tag.
- Model selector + roster UI (Phase E.2) **NOT STARTED**.
- NAC numbering reconciliation (Phase F) **BLOCKED on Pablo**.
- i18n decoration of Conduit UI for 10 languages (Phase G) **NOT
  STARTED**.
- Public repo + MIT attribution (Phase H) **NOT STARTED**.
  NOTICE.md drafted; commit pipeline ready but nothing pushed.
- Deploy (Phase I) **NOT STARTED**.

---

## Phase A -- Audit precondición (DONE)

Per brief: verify the 3 overnight fixes did not leave the
system in a state different from the cierre a 90%.

### A.1 -- index.html restoration (DIVERGES, documented)

**Brief criterion:** "byte-equivalente al estado del cierre a
90% (commit 994349a / bcc5605)".

**Finding:** `git log` shows `frontend/index.html` was modified
ONLY ONCE in the repo's history (commit `9de5653`, original
upstream Conduit import). Both `994349a` AND `bcc5605` (the
cierre 90% commits) have IDENTICAL index.html WITHOUT NAC
script tags. Yet the H4 benchmark from 2026-05-20 worked.

**Hypothesis:** the H4 was served from a sibling directory,
`/c/conduit-bench/conduit-forge-ai-v5/`, which IS a standalone
Vite app with NAC tags + nac-bridge.js + register inline
script. Vite on port 3000 was serving v5; backend Express on
port 3001 (from /conduit/backend/) provided the API. The same
browser saw integrated NAC + Conduit.

When I restarted Conduit from `/c/conduit-bench/conduit/`
during today's session, I served Vite from /conduit/ which
does NOT have NAC tags. NAC stopped loading. I added the tags
back (NEW lines vs both closure commits).

**Reconciliation:** I keep the NAC tags in /conduit/index.html
(without them the product doesn't work). The divergence will
be COMMITTED as a new commit with a message explaining the
situation. Functional behavior IS equivalent to the closure
state (NAC loads, plugin registers, manifest works).

**State to commit (NEW):**
- `/c/conduit-bench/conduit/frontend/index.html` -- added
  `<script src="/nac.browser.js">`, `<body data-nac-plugin
  ="conduit">`, `<script src="/nac-bridge.js">`, inline
  register script.
- `/c/conduit-bench/conduit/frontend/public/nac-bridge.js` --
  copied from /conduit-forge-ai-v5/public/nac-bridge.js (4655
  bytes).

### A.2 -- `preSeedArticle` leak check (CLEAN)

**Brief criterion:** the harness's DELETE-then-create seed
must NOT leak to the app of production.

**Finding:** `grep preSeedArticle` confirms the function exists
ONLY in `/c/nac3-bench/bench/scripts/h4_cheap_model_validation
.mjs`. NOT in `/conduit/backend/` or `/conduit/frontend/`. The
binary match in database.sqlite is just article DATA that
mentions "forge-seed-1" as a slug, not code. The app has no
auto-seed behavior. ✅

### A.3 -- DB reset state (CLEAN, but FRAGILE)

**Brief criterion:** production DB starts limpio + reproducible.

**Finding:** DB was reset to empty during today's session. Started
clean (0 articles, 0 users). I re-registered forge-e2e to
support the benchmark. The DB then accumulated articles from the
benchmark + my smoke tests + the failed N=10 ES.

**State as of end-of-session:**
- DB has forge-e2e user + ~30 articles (mix of
  forge-h4-publish-{model}-{iter} from publish flows + the
  zombie forge-seed-1 from the bug below).
- Some articles have NULL `author_id` (corruption from
  concurrent benchmark writes).
- **This DB is NOT what gets shipped as product.** Each
  organization's instance starts from a clean migration +
  seed. The current state is only relevant to the benchmark
  reproducibility.

---

## Phase B -- N=10 default confirmation (PARTIAL, BLOCKED)

**Brief criterion:** confirm flash-lite at N=10 in the language
of the organization. "Default = el más barato que da 10/10
estable." Phrasing: "10/10 por flujo sobre N=10".

### Current state

- **Login flow:** 10/10 ES ✅
- **Publish flow:** 10/10 ES ✅
- **post_comment flow:** 0/10 ❌ (HARNESS bug, not model)

### The harness bug I introduced

To fix shared-DB feed contamination (the seed article being
pushed out of the visible feed by other-cell publish articles),
I changed `preSeedArticle` to DELETE-then-create the seed each
iter. The hope: forge-seed-1 always becomes the freshest
article.

What actually happened: Conduit's `deleteArticle` controller
throws `TypeError: Cannot read properties of null (reading
'id')` because some articles in the DB have NULL `author` (from
concurrent benchmark writes earlier in the session). My code
ignores the DELETE failure and proceeds to POST, which returns
422 "Title already exists" because DELETE didn't actually
delete. Net: post_comment iter 1 fails before the model even
gets called.

### The fix (NOT APPLIED, awaiting Pablo OK)

Change preSeedArticle to use a UNIQUE seed per (model, iter):
`forge-seed-{model}-{iter}-{ts}`. Each iter creates a fresh
slug, no DELETE needed, no collision possible. Prompt template
in `h4_prompts_i18n.json` interpolates the dynamic slug via
the existing `{{seed_slug}}` placeholder.

**Implementation cost:** ~5 min code change + DB reset + 3 min
re-run.

**Why not done today:** Pablo asked me to STOP after writing
the V24 plan + this doc, so we both sleep. The fix is
documented + obvious; next session applies it.

### Risk if NOT fixed

The criterion #2 of the closure brief ("N=10 confirmado")
remains unverified for ES. We have N=10 EN (30/30 from yesterday)
which is partial evidence. To ship Conduit-NAC3 to a
Spanish-speaking organization with confidence, we need N=10 ES
clean.

### Workaround if rush

Trust the existing N=10 EN (30/30) + N=3 ES (9/9 from Escalon
2 smoke + clean from harness fix smoke) as "directional
evidence the default is sound across languages". This is
defensible but weaker than 10/10 explicit ES. Pablo decides
strength of evidence needed.

---

## Phase D -- Key audit (DONE -- SAFE)

Per brief: "Cero api_keys propias en app/build/historial.
BYOK. Auditado."

| Check | Result |
|---|---|
| Patrones de API keys en código (sk-ant-/AIza/xoxb-/sk-proj-/etc) | ✅ Cero hits |
| `.env` y `.env.example` en /conduit/ | ✅ `.env` gitignored, contiene solo `JWT_KEY=conduit-forge-bench-jwt-key-2026` (benigno local-dev); `.env.example` tiene placeholder |
| Harness `.env` (con keys reales Anthropic/OpenAI/Google) | ✅ Está en `/c/nac3-bench/bench/.env`, FUERA del tree de Conduit |
| Git history (todas las ramas) | ✅ Cero hits de `sk-ant-`, `AIzaSy`, `ANTHROPIC_API_KEY=`, `OPENAI_API_KEY=` en cualquier commit |
| JWT_KEY handling | ✅ `process.env.JWT_KEY` referenced en jwt.js; valor real en .env gitignored |

**Veredicto:** SAFE. The repo is publishable from a secrets-
hygiene standpoint right now. The JWT_KEY default value should
be replaced per-deployment but that's a deployment concern, not
a repo concern.

**Remaining for deploy (Phase I):**
- Generate a strong per-instance JWT_KEY on tenant provisioning
  (NOT use the bench default).
- Document this in the deployment runbook.

---

## Phase C -- Cuadro de cierre con diálogos reales (NOT STARTED)

**Brief criterion:** 3 flujos, cada uno con cuadro que muestre
pedido humano + secuencia agente→NAC3 (turno, intent, dispatch,
resultado) + turnos + resultado. Salidos de TRACES REALES con
provenance. Mostrado con flash-lite default; Sonnet opcional.

### What's needed

For each of `login_existing_user`, `publish_article`, and
`post_comment`:
1. Pull the action_sequence + per-turn data from the JSON
   trace file (e.g. `h4_results/h4_*_es.json`).
2. Render the natural-language prompt (the one we shipped to
   the model).
3. Render the agent's per-turn intent (we don't have this
   structured -- the model says "I'm going to do X" in its
   raw text response; we'd need to add the agent's `say`
   field to the action_sequence aggregation).
4. Render the NAC dispatch (verb + qualifier).
5. Render the result (OK / NacError + candidates).
6. Show total turns + final success_probe verdict.

### Where to get the data

`h4_results/h4_*_{en,es,zh,hi,ar}.json` files have `results`
arrays with per-iter `action_sequence`. The PROMPT used per
iter is in `h4_prompts_i18n.json`. The model's per-turn
`say` field is NOT currently captured in the result JSON
(only `action_sequence`); we'd need to extend the harness to
capture it OR settle for showing just the dispatches.

### Strict-NAC rescue cases to highlight

Per brief: "Donde el strict-NAC aportó (error ruidoso +
candidates que evitó un loop), mostrarlo".

The Conduit H4 STRICT report documents 12 such rescues. We
should pick 2-3 vivid examples for the closing dialogue table,
showing the BEFORE (lenient: agent loops 12 turns) vs AFTER
(strict: agent gets candidates at turn 1, recovers at turn 2).

### Deliverable

`/c/rpaforce/yujin.app/nac-spec/conduit/CONDUIT_CLOSING_TABLE.md`
(already exists in DRAFT form from yesterday; needs the real
traces folded in).

### Estimated work

- Extend harness to capture per-turn `say` text: ~15 min
- Re-run N=3 ES with extended harness: ~5 min
- Write CONDUIT_CLOSING_TABLE.md sections: ~30 min
- Pick + render strict-NAC rescue examples: ~20 min
- Total: ~1.5 hours

---

## Phase E -- Pilot bundle + roster UI (NOT STARTED)

**Brief criterion:** "BYOK + selector de modelo funcionales,
roster con advertencias visibles."

### E.1 -- Bundle the Pilot in /conduit/

Pilot bundle exists at:
- `/c/yujin-pilot/dist/pilot.bundle.js` (34489 bytes)
- `/c/yujin-pilot/dist/pilot.css` (8252 bytes)

Need to copy into `/c/conduit-bench/conduit/frontend/public/`
+ add `<script src="/pilot.bundle.js">` + `<link rel
="stylesheet" href="/pilot.css">` to index.html.

### E.2 -- Roster UI per the brief

Per brief, the model selector must show classification
VISIBLE (not letter chica):

- **Recomendado (default):** gemini-3.1-flash-lite -- más
  barato, 10/10.
- **Runner-up:** gpt-5-mini.
- **Premium baseline:** Sonnet.
- **Con advertencia visible:**
  - gpt-4o-mini -- "solo flujos lineales, falla drill
    profundo"
  - gemini-2.5-flash -- "parse_fail conocido, preferí 3.1"
  - haiku-4-5 -- "más caro, viable"

### Where the roster lives

Need to check Pilot source to see if it has a built-in roster
or expects host config. Per CLAUDE.md of yujin-pilot, the
roster is BYOK-driven (user inputs their own keys). The
"recommendation" UI is probably absent in current bundle.

**Likely path:** add a roster.json file to /conduit/public/
that Pilot reads on init. Modify Pilot bundle to read this
config and render advisory chips per model. This may require
opening yujin-pilot repo + rebuilding the bundle.

### Estimated work

- Copy bundle + add script tag: 5 min
- Roster.json + Pilot config: 30 min
- Rebuild Pilot bundle if needed: 1 hour
- Verify in browser (manual smoke): 15 min
- Total: ~2 hours

---

## Phase F -- NAC numbering reconciliation (BLOCKED on Pablo)

Discrepancy detected. See V24_RELEASE_PLAN.md OQ1 + OQ3 for
the full picture. Summary:

| Source | Current | Right value (per brief) |
|---|---|---|
| `packages/nac/package.json` | `2.4.0` | TBD (OQ1: 2.4.0 vs 3.0.0) |
| `packages/nac/CHANGELOG.md` | `2.4.0 -- 2026-05-21` | needs expansion to cover full v2.4 train |
| `nac.js` runtime export | `version: '2.4.0', spec_version: '2.4'` | match package.json |
| `nac.js` HEADER comment | "NAC v1.9.0" ← STALE | reference the version constant |
| `packages/nac/SPEC.md` | references v2.1 and v2.3 | needs sec 5.1.8 (elevation) + updates per V24_RELEASE_PLAN.md |
| `nac-spec/index.html` (landing) | chips per integration, stale | resolve per OQ3 |

**Pending decisions from Pablo (V24 doc OQ1):** MAJOR (3.0.0)
vs MINOR (2.4.0)? Strong recommendation: 3.0.0.

**Until decided:** my provisional bump to `2.4.0` stays as IS
locally, NOT pushed, NOT published. If Pablo confirms 3.0.0,
I bump again as a clean replacement.

---

## Phase G -- i18n decoration for 10 languages (NOT STARTED)

**Per Pablo's last redirection 2026-05-21:** before the
deployment, add i18n tags for the 10 languages + selector per
the previous proposal (Conduit Settings primary, Pilot
secondary auto-sync).

### Scope

- Forge gains `--with-i18n-tags`: emits
  `data-i18n="<key>"` on every JSX text node, alongside
  existing `data-nac-*` attributes.
- Catalog files in `/conduit/frontend/public/i18n/{lang}.json`
  for all 10 languages: es, en, pt, fr, ja, zh, hi, ar, de, it.
- Runtime shim `/conduit/frontend/public/conduit-i18n.js`
  reads `localStorage.conduit_lang`, loads the JSON, replaces
  text on all `[data-i18n]` elements, re-walks on DOM mutations.
- Selector UI in Conduit's `/settings` page + small icon in
  the header (always accessible). Persists to localStorage.
- Pilot bundle reads the same localStorage key (no separate
  config). Voice TTS uses matching voice per lang.
- Event `conduit:lang_changed` for hot-sync between Conduit +
  Pilot.
- CI lint: catalog-lint with `--strict-i18n` rejects deploy if
  any locale is missing or empty.

### Manifest stays language-invariant

The NAC manifest is NOT translated -- agent operates by
`nac_id`. The cross-lang Conduit benchmark (178/180) validated
this principle.

### Estimated work

- Forge `--with-i18n-tags` mode: ~4 hours dev (Forge is TS,
  decent test coverage)
- 10 language catalogs: ~$2-3 in Claude translation cost +
  ~1 hour writing + ~1 hour reviewing non-Latin scripts
- Runtime shim + selector UI: ~2 hours dev
- CI lint script: ~1 hour
- Total: ~1 day of focused work

### Order vs Phase I (deploy)

Per Pablo's last instruction: Phase G goes BEFORE deploy.
Means Phase H (public repo + commits) ships WITHOUT i18n
initially; Phase G ships as a second commit; Phase I (deploy)
gates on Phase G complete.

Alternative order: Phase H + Phase G + Phase I as a single
sequence (no intermediate public push until i18n is in).
Cleaner but means the repo isn't visible to the organization
until end of sequence. Decide with Pablo.

---

## Phase H -- Public repo + MIT attribution (NOT STARTED)

### What's done

- `README_NAC3.md` written (fork-specific README explaining
  NAC-3 decorations, Pilot bundle, model roster, repro
  instructions).
- `NOTICE.md` written (Yujin's additions vs upstream Conduit).
- `.gitignore` hardened (sqlite, .env, key/pem, Cypress
  runtime outputs).
- Upstream `LICENSE` preserved unchanged.

### What's NOT done

- Repo NOT pushed anywhere public yet.
- Git remote still points to upstream
  `digitalinnovationone/conduit-realworld-example-app-with-
  cypress-automation`.
- No fork created at `yujinapp/` or any Yujin org.

### Per brief criterion

- "Repo público con MIT attribution correcta" ✓ (drafts done)
- "Verificar que no haya keys en el historial de git" ✓
  (Phase D)
- "Distinción clara de qué es trabajo original de Yujin
  vs el fork upstream" ✓ (NOTICE.md)

### Commits to land (in order)

1. **Restore NAC integration** (index.html + nac-bridge.js +
   manifest serving). Note in commit message: reconciles
   divergence between /conduit/ and /conduit-forge-ai-v5/
   structure; the closure 90% commits had no NAC tags but the
   product requires them.
2. **Add Pilot bundle + roster config** (after Phase E).
3. **Add README_NAC3 + NOTICE + .gitignore hardening.**
4. **Add closing dialogue table** (after Phase C).
5. **Add i18n catalogs + runtime + selector** (after Phase G).
6. **Push to yujinapp/conduit-nac3** (or final repo name TBD
   per Pablo).

### Estimated work

- Per-layer commits: 30 min
- Push + verify remote: 15 min
- Create fork in Yujin org: 10 min (Pablo's gh auth)
- Total: ~1 hour assuming no surprises

---

## Phase I -- Deploy (NOT STARTED)

Per brief: "instancia aislada por organización".

### Target

Fly.io or Render (NOT GoDaddy -- Conduit is Node, GoDaddy is
PHP-optimized).

### What's needed per instance

- Fresh DB (sqlite, embedded; or upgrade to postgres later
  for concurrency).
- Per-instance JWT_KEY (NOT the bench default).
- Per-instance domain or subdomain.
- BYOK -- no API keys in env.
- Registration enabled so the organization creates accounts.
- Health probe + auto-restart on container exit.

### Pre-deploy gate

- Phase A through Phase H complete and green.
- Catalog-lint passes (Phase G).
- Cypress smoke tests pass against the fresh instance.
- One Sumi-validated end-to-end run (login → publish →
  comment) in the organization's language.

### Estimated work

- First instance: ~3 hours (most overhead is Fly.io account
  setup if not already done).
- Subsequent instances per organization: ~30 min via a
  parametrized deploy script.

---

## Decisions awaiting Pablo (next session)

1. **OQ from V24 doc** -- MAJOR vs MINOR for v2.4 bump.
2. **N=10 ES strategy** -- fix the harness + re-run, or trust
   the existing N=10 EN + N=3 ES?
3. **Phase G order** -- before or after Phase H push?
4. **Conduit deployment target** -- Fly.io vs Render?
5. **Repo name for the fork** -- `yujinapp/conduit-nac3`?
   `yujinapp/conduit-evaluable`? Other?
6. **Roster UI implementation** -- modify Pilot bundle or
   external roster.json read by Pilot?

---

## What I'm leaving in non-production state

- `/c/conduit-bench/conduit/backend/database.sqlite` -- has
  benchmark data, some rows with NULL author_id. Reset on next
  Phase B fix.
- `/c/conduit-bench/conduit/frontend/index.html` -- has my NAC
  tag restoration uncommitted. Will commit in Phase H.
- `/c/conduit-bench/conduit/frontend/public/nac-bridge.js` --
  uncommitted, copied from v5. Will commit in Phase H.
- `/c/nac3-bench/bench/scripts/h4_cheap_model_validation.mjs`
  -- has the preSeedArticle DELETE-then-create bug. Will fix
  in Phase B.
- All `/c/tmp/h4_*.log` and `/c/tmp/conduit_*.log` are dev
  logs, can be discarded.
- The 5 `_failed` traces in `/c/nac3-bench/bench/traces/` are
  prior captures; safe to keep for forensics.

---

## Order for resumption (next session)

1. Pablo confirms decisions 1-6 above.
2. Apply Phase B fix (harness preSeedArticle → unique slug
  per iter). Reset DB. Re-run N=10 ES flash-lite.
3. If 30/30 ES → Phase C (closing dialogue table with real
   traces).
4. Phase E (Pilot bundle + roster UI).
5. Phase F (NAC numbering reconciliation per OQ1 decision).
6. Phase G (i18n decoration + selector) OR Phase H push
   first per Pablo's decision.
7. Phase I (deploy to chosen target).

Estimated total time to ship product: 1.5-2 working days
focused, +1 day Pablo review + deploy decisions.

---

*Fin del registro de pendientes Conduit. A dormir.*
