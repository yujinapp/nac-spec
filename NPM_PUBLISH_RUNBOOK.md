# npm publish runbook -- @nac3/runtime@2.3.0

**Status:** ready to publish. Tarball already validated via `npm pack --dry-run`.
**Last updated:** 2026-05-20

---

## Pre-flight (do once)

### A. Check npm session

```bash
cd /c/nac3-bench/vendor/nac-spec/runtime

# Are you logged in?
npm whoami
```

Three possible outcomes:

- **Prints a username (e.g. `yujin-npm`)**: you're logged in. Skip to "Verify package access" below.
- **Prints `npm ERR! code ENEEDAUTH`**: not logged in. Run:
  ```bash
  npm login --scope=@nac3 --auth-type=web
  ```
  Browser opens. Sign in. 2FA prompts (you have 2FA on the account per
  the original PUBLISH_INSTRUCTIONS). Close the tab when it says
  "you can close this tab". Re-run `npm whoami` to confirm.

- **`npm ERR! code E404` on the registry**: someone changed the
  registry config. Reset:
  ```bash
  npm config set registry https://registry.npmjs.org/
  ```

### B. Verify the @nac3 scope exists + you have publish access

```bash
npm access list packages @nac3 2>&1 | head -10
```

If empty / 404:
- The `@nac3` org doesn't exist yet, OR you're logged in to the wrong account.
- Create the org at https://www.npmjs.com/org/create with slug `nac3`,
  free tier (unlimited public packages).

If listed and shows `@nac3/runtime`: existing package. You'll bump its version.

If listed but no `@nac3/runtime` yet: this is the first publish.

---

## Publish (the actual command)

```bash
cd /c/nac3-bench/vendor/nac-spec/runtime

# 1. Final sanity check
cat package.json | grep '"version"'
# expect: "version": "2.3.0",

cat dist/nac.cjs | grep -E "version: *'2\." | head -2
# expect: version: '2.3.0',
# expect: spec_version: '2.3',

# 2. Dry run -- review the tarball contents
npm publish --dry-run --access public
# Inspect the file list at the bottom. Should include:
#   dist/nac.{cjs,mjs,browser.js,d.ts}
#   dist/nac-v2-extensions.{cjs,mjs,browser.js,d.ts}
#   dist/nac-chat-client.{cjs,mjs,browser.js,d.ts}
#   dist/cli.js + dist/cli-lint.mjs
#   package.json + README.md + LICENSE + SPEC.md + CHANGELOG.md
# Tarball size ~ 332 kB (verified 2026-05-20).

# 3. THE PUBLISH (irreversible).
npm publish --access public
# You'll be prompted for 2FA code. Enter it.
# Expect: + @nac3/runtime@2.3.0
```

---

## Post-publish verification

```bash
# 4. Confirm npm has it
curl -sS https://registry.npmjs.org/@nac3%2Fruntime | jq '.["dist-tags"]'
# expect: { "latest": "2.3.0" }

# 5. Install from a clean dir as a smoke test
cd /tmp && rm -rf npm-smoke && mkdir npm-smoke && cd npm-smoke
npm init -y >/dev/null
npm install @nac3/runtime
node -e "console.log(require('@nac3/runtime/package.json').version)"
# expect: 2.3.0
```

---

## Git tag (after npm publish succeeds)

```bash
cd /c/nac3-bench/vendor/nac-spec

# Find the commit that the tag should point at (current main HEAD).
git log --oneline -1

# Create the tag at HEAD.
git tag -a v2.3.0 -m "release: @nac3/runtime@2.3.0 -- benchmark + syncPlugin + plugin-id"

# Push the tag.
git push origin v2.3.0

# Confirm on GitHub:
# https://github.com/yujinapp/nac-spec/releases/tag/v2.3.0
```

The tag matches the runtime commit. The `BENCHMARK_PROVENANCE.md`
already documents the equivalence.

---

## Optional: create a GitHub release

After the tag is pushed, GitHub shows `Draft a new release` on the
releases page. Title: `v2.3.0 - 600-run benchmark + syncPlugin`.
Copy the v2.3.0 entry from `runtime/CHANGELOG.md` into the body.
Click "Publish release".

This is cosmetic but it's what adopters scroll through on GitHub.

---

## If something goes wrong

| Symptom | Likely cause | Fix |
|---|---|---|
| `403 Forbidden` | No 2FA, or wrong account | Enable 2FA at npmjs.com, login again |
| `402 Payment Required` | Scope private by default | Already handled by `--access public` flag |
| `E403 You cannot publish over previously published versions` | Version already taken | Bump `package.json` "version" to `2.3.1` and retry |
| `EOTP` (one-time password) | 2FA token expired between dry-run and publish | Re-enter, no other action needed |
| Tarball includes node_modules or .env | `files` field in `package.json` is broken | Check `package.json` "files" array, should list only what you want shipped |

---

## After publish, do NOT forget

1. Update the landing's npm-install command if it pins a version.
   Currently `index.html` says `npm install @nac3/runtime` (no pin) -- fine as is.
2. Announce in `#nac-spec` or wherever you announce.
3. The benchmark page already documents the manifest checksum and
   provenance; no changes needed.

---

## TL;DR copy-paste sequence

```bash
cd /c/nac3-bench/vendor/nac-spec/runtime
npm whoami                           # confirm logged in
npm publish --dry-run --access public  # review
npm publish --access public          # ship it (2FA prompt)

cd ..
git tag -a v2.3.0 -m "release: @nac3/runtime@2.3.0"
git push origin v2.3.0

curl -sS https://registry.npmjs.org/@nac3%2Fruntime | jq '.["dist-tags"]'
# expect: { "latest": "2.3.0" }
```

Five commands. Roughly 60 seconds wall-clock once authenticated.
