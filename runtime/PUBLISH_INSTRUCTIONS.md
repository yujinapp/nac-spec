# How to publish `@nac3/runtime` to npm (one-time action by Pablo)

The package is fully prepared (`packages/nac/`, version 2.2.0,
dist/ built, README, LICENSE, types). It only needs the npm
account + scope to be created, then a single `npm publish`.

## Pre-flight checklist (one-time)

1. **Create npm account** at https://www.npmjs.com/signup
   - Use a Yujin-owned email (e.g. `hello@yujin.app` or
     `npm@yujin.app`) so the org is not tied to a personal
     handle.
   - Enable 2FA on the account (required for publishing scoped
     packages).

2. **Create the `@yujin` organization**:
   - After login, click your avatar -> "Add an Organization".
   - Choose the FREE tier (unlimited public packages).
   - Org slug: `yujin`.
   - Add yourself as owner.

3. **Generate a publish token** (for CI later):
   - https://www.npmjs.com/settings/{your-username}/tokens
   - Type: "Automation token"
   - Scope: write to `@yujin/*`
   - Save the token somewhere safe (1Password, Bitwarden).

## First publish (now, from your laptop)

```bash
cd packages/nac

# Login interactively (browser-based since you have 2FA on).
npm login --scope=@yujin --auth-type=web

# Verify everything is sane before publishing.
npm pack --dry-run
# -> review the file list. Should be ~30-50 files under dist/,
#    plus README.md, LICENSE, SPEC.md, package.json.

# Publish (public access, required for scoped packages on free tier).
npm publish --access public

# Verify it landed.
curl -sS https://registry.npmjs.org/@nac3%2Fruntime | head -5
```

After publish, the package is live at
`https://www.npmjs.com/package/@nac3/runtime`.

## After first publish

- Add the automation token as a GitHub secret: `NPM_TOKEN`.
- Future releases publish via GitHub Actions on git tag.
- The CI workflow at `.github/workflows/nac-publish.yml` (TBD)
  bumps version + publishes on tag `nac-v*`.

## If the publish fails

Common causes:

- **403 Forbidden**: 2FA not enabled, or org tier does not allow
  public packages. Solution: enable 2FA + ensure org is on Free
  (unlimited public) or Pro.
- **402 Payment Required**: scope is private by default for
  paid plans; force public with `--access public` (already in
  the command above).
- **E403 You cannot publish over the previously published
  versions**: version already taken; bump
  `package.json` "version" to the next patch (e.g. 2.2.1) and
  retry.

## Once published, update the landing

The `nac-spec/index.html` Quick Install section already says
`npm install @nac3/runtime@^2.2.0`. After successful publish, that
command Just Works for any visitor of the landing.
