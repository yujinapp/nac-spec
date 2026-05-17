# Implementation Guide — commit + push runbook

How to ship changes in the two product surfaces Pablo + Sumi work on:

1. **NAC3 spec** (canonical at `github.com/yujinapp/nac-spec`, deployed to
   `https://yujin.app/nac-spec/` via a mirror inside the rpaforce repo)
2. **Yujin Koe** (canonical at `github.com/yujinapp/koe`, deployed to
   `https://koe.yujin.app/` via GitHub Actions SSM RunCommand to AWS EC2)

The two products have different deploy mechanisms. Read once; keep this
file in sync when the mechanism changes.

---

## Quick-reference cheatsheet

| Task | nac-spec | yujin-koe |
|---|---|---|
| Canonical repo path on disk | `C:\nac-spec-yujinapp\` | `C:\yujin-koe\` |
| Canonical remote | `github.com/yujinapp/nac-spec` | `github.com/yujinapp/koe` |
| Deploy target | `https://yujin.app/nac-spec/` | `https://koe.yujin.app/` |
| Deploy mechanism | rpaforce CI rsyncs to GoDaddy | GitHub Actions SSM RunCommand to AWS EC2 |
| Mirror needed | YES — also commit to `C:\rpaforce\yujin.app\nac-spec\` | NO — single source |
| Build step needed | NO (static HTML) | YES if `builder/` changed (Next.js static export) |
| Typical commit-to-live time | 3-5 min (Tests + Deploy + rsync) | 60-90 sec (SSM ssh + rsync) |
| CI dashboard | github.com/pkuschnirof/rpaforce-crm/actions | github.com/yujinapp/koe/actions |

---

## A. Workflow for NAC3 spec changes

The nac-spec repo is canonical. Whatever lives at
`https://yujin.app/nac-spec/...` is served from a MIRROR at
`C:\rpaforce\yujin.app\nac-spec\`. Drift is real: ABOUT.html and SPEC.html
already differ between the two copies. **Never assume the mirror is
in sync.** Mirror explicitly the files you edit.

### Step-by-step

#### 1. Edit in the canonical repo

```bash
cd C:/nac-spec-yujinapp
# Edit the file you need: SPEC.md, peer-reviews.html, index.html, etc.
```

#### 2. Preview locally

For HTML files: just open in browser via file://

```
file:///C:/nac-spec-yujinapp/index.html
file:///C:/nac-spec-yujinapp/peer-reviews.html
```

For Markdown: render via your editor's preview OR use a quick HTML
render `npx markdown-cli your-file.md > /tmp/preview.html` if needed.

The CSS imports `/nac-spec/css/yujin-tokens.css` which won't resolve
under file:// — the layout will look slightly off. To preview with
correct styling, run a static server in the repo:

```bash
cd C:/nac-spec-yujinapp
python -m http.server 8080
# Now http://localhost:8080/peer-reviews.html renders fully
```

#### 3. Diff vs the mirror to know what you must copy

```bash
# Which files differ between canonical + mirror?
diff -rq C:/nac-spec-yujinapp/ C:/rpaforce/yujin.app/nac-spec/ \
  | grep -v ".git" \
  | head -20
```

Any line that says `Files ... differ` is a candidate for sync. If you
ONLY edited X.html in canonical, you only need to copy X.html to mirror.

#### 4. Commit canonical first

```bash
cd C:/nac-spec-yujinapp
git status --short
# Only your edited files should appear. If you see 26 deleted
# "packages/..." rows, do NOT commit them -- those demos are
# indispensable for external developers to evaluate NAC3
# (rpaforce-crm is private; nac-spec is the only public source).
# Run: git checkout HEAD -- packages/  to restore them locally.

git add path/to/file1 path/to/file2  # explicit paths, not git add -A
git commit -m "type(scope): short title

Longer body explaining WHY this commit exists.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"

git push
```

After this, GitHub has the new content at
`github.com/yujinapp/nac-spec`. But `yujin.app/nac-spec/...` is NOT
updated yet — that needs the rpaforce mirror.

#### 5. Copy files to the rpaforce mirror

For each file you edited, copy it:

```bash
cp C:/nac-spec-yujinapp/path/to/file C:/rpaforce/yujin.app/nac-spec/path/to/file
```

For multiple files in one go (only when you're sure mirror should match):

```bash
# Example: copy the whole css/ directory
cp -r C:/nac-spec-yujinapp/css/ C:/rpaforce/yujin.app/nac-spec/css/
```

**Do NOT do a blind `cp -r nac-spec-yujinapp/* rpaforce/yujin.app/nac-spec/`**
— that would overwrite the drift in ABOUT.html / SPEC.html, which may have
intentional changes only in one copy.

#### 6. Commit the rpaforce mirror

```bash
cd C:/rpaforce
git status yujin.app/nac-spec/ --short
# Only the files you just copied should appear

git add yujin.app/nac-spec/path/to/file
git commit -m "docs(nac-spec): mirror <file> from canonical repo

Source: github.com/yujinapp/nac-spec @ <short-sha>

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"

git push
```

#### 7. Wait for the rpaforce CI to deploy

URL: https://github.com/pkuschnirof/rpaforce-crm/actions

You should see two workflows fire:

1. **Fast checks** (gate, ~1 min) — `.github/workflows/fast-checks.yml`.
   Must pass or deploy is blocked.
2. **Deploy to GoDaddy** (~3-5 min) — `.github/workflows/deploy.yml`.
   SSH/SFTPs the zip of `yujin.app/` to GoDaddy's `public_html/yujin.app/`.

If Fast checks fails, fix the issue + re-push. If Deploy fails, click
into the run + read the SSH step's output.

#### 8. Verify deploy

```bash
curl -sI https://yujin.app/nac-spec/<your-file> | head -5
```

Expect `HTTP/1.1 200 OK`. The `.htaccess` in the deployed nac-spec
sets `Cache-Control: max-age=300`, so a 404 cached from before
the deploy may stick for 5 minutes — hard reload (Ctrl+Shift+R) in
browser to bust.

---

## A.2 Reverse mirror — demo sources from rpaforce to nac-spec

The two folders under `packages/` in `nac-spec-yujinapp`
(`nac-react-demo`, `nac-angular-demo`) are NOT canonical here. The
SSOT lives in `C:/rpaforce/packages/` (private repo). nac-spec is
the public mirror so external developers can read the demo source
when evaluating NAC3 adoption.

**Direction is reversed compared to workflow A:** changes start in
`rpaforce/packages/` and propagate to `nac-spec/packages/`.

### When to run this workflow

After any commit in `C:/rpaforce/` that touches
`packages/nac-react-demo/` or `packages/nac-angular-demo/`. Detect
with:

```bash
cd C:/rpaforce
git log --since="1 week ago" --name-only -- packages/nac-react-demo packages/nac-angular-demo \
  | head -40
```

If you see commits whose hash is newer than the latest mirror sync
commit in `nac-spec`, the mirror is stale.

### Step-by-step

#### 1. Identify the drift

```bash
diff -rq --exclude=node_modules --exclude=dist --exclude=package-lock.json \
  C:/rpaforce/packages/nac-react-demo/ \
  C:/nac-spec-yujinapp/packages/nac-react-demo/

diff -rq --exclude=node_modules --exclude=dist --exclude=package-lock.json \
  C:/rpaforce/packages/nac-angular-demo/ \
  C:/nac-spec-yujinapp/packages/nac-angular-demo/
```

Lines that say `Files ... differ` are candidates. **Always exclude
`node_modules/`, `dist/`, `package-lock.json`** — those are build
artefacts and should never enter the mirror.

#### 2. Copy only sources

For each differing file (typically `src/*.tsx`, `src/*.ts`,
`*.json` config, `*.html`, README):

```bash
cp C:/rpaforce/packages/nac-react-demo/src/App.tsx \
   C:/nac-spec-yujinapp/packages/nac-react-demo/src/App.tsx
```

Or copy a whole tree (only if you're sure):

```bash
cp -r C:/rpaforce/packages/nac-react-demo/src/ \
      C:/nac-spec-yujinapp/packages/nac-react-demo/src/
```

#### 3. Commit + push the mirror

```bash
cd C:/nac-spec-yujinapp
git add packages/
git status --short  # sanity check: no dist/, no node_modules/
git commit -m "mirror(packages): sync nac-react-demo + nac-angular-demo from monorepo

Source: rpaforce-crm @ <short-sha-of-latest-rpaforce-commit>

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
git push
```

#### 4. Verify on GitHub

External devs land here:

```
https://github.com/yujinapp/nac-spec/tree/main/packages/nac-react-demo
https://github.com/yujinapp/nac-spec/tree/main/packages/nac-angular-demo
```

Confirm the latest commit timestamp matches what you just pushed,
and that the changed files reflect your edits.

### Things to never do in this workflow

- Never commit `node_modules/`, `dist/`, `.next/`, or
  `package-lock.json` to nac-spec — bloat + leaks build metadata.
- Never edit `packages/` directly in nac-spec. Edit in rpaforce
  first, then mirror. Bidirectional drift is impossible to resolve
  cleanly.
- Never delete `packages/` from nac-spec to "clean up". External
  developers depend on these files being publicly accessible.

---

## B. Workflow for Yujin Koe changes

Single repo, no mirror. CI is automated end-to-end: push to main →
test workflow runs → deploy workflow runs → AWS EC2 receives SSM
RunCommand → `deploy.sh` runs on the box.

### Step-by-step

#### 1. Edit in the canonical repo

```bash
cd C:/yujin-koe
# Edit your files
```

The repo has these top-level directories:

| Path | Purpose | Build step at deploy? |
|---|---|---|
| `backend/` | PHP backend code (Caddy + PHP-FPM serves) | No — just rsynced to `/var/www/koe/` |
| `builder/` | Next.js builder UI | YES — `npm install && next build`, then rsync `out/` |
| `aws/caddy/` | Caddyfile (Caddy reverse proxy config) | No — copied + validated + reloaded |
| `aws/scripts/` | `deploy.sh`, `setup-db.sh`, smoke tests | Used by CI; changes trigger redeploy |
| `.github/workflows/` | CI definitions | Used by CI |
| `docs/` | Project docs | No — not deployed |

#### 2. Run local checks

**For backend PHP changes:**

```bash
# Syntax check ALL touched PHP files BEFORE committing
php -l C:/yujin-koe/backend/path/to/file.php
# Repeat for each modified file
```

**For builder Next.js changes:**

The repo has a GitHub Actions workflow that runs `tsc --noEmit + next
build` on every push, but **catching errors locally before push saves
2 minutes of CI cycle**. If Node.js is installed locally:

```bash
cd C:/yujin-koe/builder
npm install --no-audit --no-fund  # first time only or after package.json changed
npm run typecheck                  # tsc strict check
npm run build                      # produces out/ static export
```

If you don't have Node.js locally, push + watch the
`builder-check` workflow on GitHub. Either way, that workflow catches
TS strict errors before the slower deploy workflow even starts.

#### 3. Check git status

```bash
cd C:/yujin-koe
git status --short
```

Common pre-existing untracked files in this repo that you should NOT
add:

- `aws/terraform/tfplan.out` — Terraform plan output, never commit
- `*.jpg / *.png` at repo root — Pablo's screenshots, ignore unless
  he says otherwise

#### 4. Stage + commit + push

```bash
git add path/to/file1 path/to/file2  # explicit paths
git commit -m "type(scope): short title

Longer body explaining the change. Cover:
- WHY this change exists (link to memory / norm if relevant)
- WHAT files moved + why
- Any breaking changes for callers

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"

git push
```

#### 5. Monitor CI workflows

URL: https://github.com/yujinapp/koe/actions

On every push to main, three workflows can fire (depending on what paths
you touched):

| Workflow | Triggered by | Duration |
|---|---|---|
| **Test** | Any push touching `backend/**` or `.github/workflows/test.yml` | ~30 sec |
| **Builder typecheck + build** | Any push touching `builder/**` | ~2 min |
| **Deploy to AWS EC2** | Any push touching `backend/**` or `builder/**` or `aws/caddy/**` or `aws/scripts/deploy.sh` | 60-90 sec |

All three run in parallel. Deploy doesn't wait for Test; if Test fails
you'll get a separate email but deploy still ships. (This is by design
— deploy is idempotent + Pablo can roll back if needed.)

#### 6. Verify deploy

```bash
# API health
curl -sI https://koe.yujin.app/api/v1/health | head -3
curl https://koe.yujin.app/api/v1/health | head -5

# Static surfaces (if you edited any of these)
curl -sI https://koe.yujin.app/ | head -3
curl -sI https://koe.yujin.app/builder/ | head -3
curl -sI https://koe.yujin.app/admin/ | head -3
curl -sI https://koe.yujin.app/dashboard/ | head -3
curl -sI https://koe.yujin.app/demo/ | head -3

# Smoke test full suite
bash C:/yujin-koe/aws/scripts/smoke-e2e.sh
# Expects "7 passed, 0 failed"
```

If deploy went red:
- Open the failing workflow run on GitHub Actions
- Expand "Show stdout" + "Show stderr" of the SSM command step
- Paste the output to Pablo (or to a new Sumi session) for triage

Common deploy failures:
- **Builder TS error** — fix in `builder/` + repush
- **Migration error** — usually a SQL syntax issue, check
  `install/migrations/NNNN_*.sql`
- **OOM during npm install** — t3.small RAM pressure, rare; re-run usually fixes
- **PAT expired** — Pablo's GitHub PAT for `git pull` on the EC2;
  rotate via `setup-db.sh --force` if needed

---

## C. Worked example: today's pending changes

Right now (as of this guide's creation) there are uncommitted changes
in both repos that exercise both workflows. Use this as a worked
example to follow steps A or B.

### C.1 What's pending

**In `C:/nac-spec-yujinapp/`:**

1. `index.html` — added peer-reviews CTA in hero + featured callout section + new CSS classes
2. `peer-reviews.html` — added Methodology section at the end with original prompt + bias-warning content

**In `C:/rpaforce/yujin.app/nac-spec/`** (needs mirror sync):

1. `index.html` — needs the same content from canonical
2. `peer-reviews.html` — needs the same content from canonical

### C.2 Execute workflow A (nac-spec)

```bash
# Step 1: Verify canonical edits are saved
diff -q C:/nac-spec-yujinapp/peer-reviews.html C:/rpaforce/yujin.app/nac-spec/peer-reviews.html
# Should output: "Files ... and ... differ" (yes, you have new content)

# Step 2: Commit canonical
cd C:/nac-spec-yujinapp
git add index.html peer-reviews.html
git commit -m "feat(landing): peer reviews featured + methodology section

- Adds prominent 'inevitable' CTA to hero
- Adds featured peer-callout section between hero + How small
- Adds Methodology section to peer-reviews.html with original prompt
  + bias-warning explaining why post-human framing matters

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"

git push

# Step 3: Mirror to rpaforce
cp C:/nac-spec-yujinapp/index.html       C:/rpaforce/yujin.app/nac-spec/index.html
cp C:/nac-spec-yujinapp/peer-reviews.html C:/rpaforce/yujin.app/nac-spec/peer-reviews.html

# Step 4: Commit mirror
cd C:/rpaforce
git add yujin.app/nac-spec/index.html yujin.app/nac-spec/peer-reviews.html
git commit -m "docs(nac-spec): mirror landing + peer-reviews from canonical

Mirrors index.html + peer-reviews.html from
github.com/yujinapp/nac-spec for rpaforce deploy CI to publish to
yujin.app/nac-spec/.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"

git push

# Step 5: Verify (after ~5 min)
curl -sI https://yujin.app/nac-spec/peer-reviews.html | head -3
# Expect HTTP 200
```

### C.3 No Koe changes pending right now

Last Koe deploy was `f2bab52` (S2.1 AI assistant backend). Phase 6 S2.2
frontend is the next planned slice; when you start that, use workflow B
exactly.

---

## D. Failure-mode handling

### D.1 Canonical pushed, mirror forgotten

Symptom: GitHub has the new content but `yujin.app/...` still shows old.

Fix: do step 5 + 6 of workflow A. The mirror commit is a separate atomic
action — pushing canonical alone never deploys.

### D.2 Mirror pushed, canonical not

Symptom: `yujin.app/...` shows new content but `github.com/yujinapp/nac-spec`
doesn't have it. External readers cloning the repo get an outdated copy.

Fix: copy from mirror back to canonical + commit/push canonical.

```bash
cp C:/rpaforce/yujin.app/nac-spec/path/to/file C:/nac-spec-yujinapp/path/to/file
cd C:/nac-spec-yujinapp
git add path/to/file
git commit -m "docs: sync from mirror (mirror was ahead)"
git push
```

### D.3 Drift accumulated, can't tell which side is authoritative

Symptom: `diff -rq` shows 5+ files differing and you don't remember which
side has the latest content.

Fix: don't bulk-sync. Open each diff file individually, compare with
`git log`'s recent commits on each side, decide per-file which is right.
Risk of blind sync: silently undoing edits Pablo made in only one copy.

### D.4 CI deploy red on rpaforce push

Symptom: `Deploy to GoDaddy` workflow shows red.

Fix:
- Click into the failing run on github.com/pkuschnirof/rpaforce-crm/actions
- Expand the failed step (usually a `wget` / `unzip` / `rsync` step)
- 90% of failures are GoDaddy SSH timeout (transient) — re-run the
  workflow via "Re-run failed jobs"
- If repeat failure: check the SSH key in GitHub Secrets hasn't rotated

### D.5 CI deploy red on Koe push

Symptom: `Deploy to AWS EC2` workflow red.

Fix:
- Click into the run, find the SSM RunCommand step
- Look at the "Show stdout" + "Show stderr" — the actual error is from
  `aws/scripts/deploy.sh` running on the EC2
- Common: Next.js TypeScript error in `builder/` — fix locally + repush
- Common: migration error — `install/migrations/NNNN_*.sql` has syntax
  issue, fix + repush
- Rare: EC2 OOM during npm install — wait 5 min + retry workflow

---

## E. Things to NEVER do

1. **Never `git add -A` blindly.** Both repos accumulate untracked
   files (Pablo's screenshots, terraform output, node_modules,
   archived demos). Always add by explicit path.

2. **Never bulk-sync nac-spec canonical ↔ mirror.** Drift is real;
   blind sync overwrites intentional one-side-only edits.

3. **Never commit secrets.** Look for: API keys, passwords, .env
   files, tokens with `Bearer` prefix, anything ending in
   `_KEY` or `_SECRET`. The .gitignore catches most but not all.

4. **Never `git push --force` to main on either repo.** No
   exceptions. If you're tempted, you have an underlying confusion
   that force-push will make worse.

5. **Never skip the typecheck step on builder/.** TS strict catches
   real bugs; deploys that fail late cost the same as catching it
   early but waste 2 minutes per cycle.

6. **Never deploy to PROD on a Friday afternoon** unless it's a
   genuine emergency. The 60-90 sec deploy time means a small bug
   can be live for hours over the weekend if nobody notices.

7. **Never edit `C:/nac-spec-yujinapp/peer-reviews.html` without
   considering that the mirror at
   `C:/rpaforce/yujin.app/nac-spec/peer-reviews.html` also needs
   updating.** That's the whole point of section A.5.

---

## F. Quick commands reference

### F.1 Status check across both nac-spec copies

```bash
# Show what's drifted (run regularly to stay aware)
diff -rq C:/nac-spec-yujinapp/ C:/rpaforce/yujin.app/nac-spec/ \
  | grep -v ".git" | grep -v "PROMO_WEEK" | grep -v "PERFORMANCE"
```

(The `grep -v` excludes operational docs that shouldn't be mirrored.)

### F.2 Verify all 4 deploy targets after a release

```bash
echo "=== nac-spec landing ===" && curl -sI https://yujin.app/nac-spec/ | head -2
echo "=== peer reviews ==="    && curl -sI https://yujin.app/nac-spec/peer-reviews.html | head -2
echo "=== koe api health ==="  && curl -s https://koe.yujin.app/api/v1/health | head -3
echo "=== koe builder ==="     && curl -sI https://koe.yujin.app/builder/ | head -2
```

All should return HTTP 200 + reasonable content.

### F.3 Latest commits in each repo

```bash
git -C C:/nac-spec-yujinapp log --oneline -5
git -C C:/rpaforce log --oneline -5
git -C C:/yujin-koe log --oneline -5
```

---

## G. When to update this doc

Whenever:
- Deploy mechanism for either repo changes (e.g., Koe moves off SSM
  RunCommand, or nac-spec gets its own GitHub Actions workflow)
- The mirror pattern between nac-spec and rpaforce changes
- A new repo enters Pablo + Sumi's operational scope
- A common failure mode happens twice and isn't covered in section D

Update + commit to the nac-spec canonical repo (single source of truth
for ops docs that span both products). Mirror to rpaforce only if you
want the doc public at `yujin.app/nac-spec/IMPLEMENTATION_GUIDE.md` —
optional, since this is internal ops.

---

End of guide. ~5 min to read end-to-end. Save + reference whenever
shipping changes.
