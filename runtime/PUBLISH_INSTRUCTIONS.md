# How to publish `@nac3/runtime`

Rewritten 2026-10-28. The previous version of this file described a
one-time first publish from a directory that no longer exists
(`packages/nac/`), at a version that is nine releases old (2.2.0), into
an organisation the package is not published under (`@yujin`). None of
it was true any more. If you are looking for that history, it is in
`git log` -- not here.

This is the current procedure, and it is the only one. The package is
published **by hand from the owner machine**; see "The open decision"
at the end for why that is still the case and what it costs.

---

## What is true today

| Fact | Value | Where it is declared |
|---|---|---|
| Package name | `@nac3/runtime` | `runtime/package.json` |
| Version | the single source of truth is `runtime/package.json` | enforced by `scripts/check-version-coherence.mjs` |
| Directory to publish from | `runtime/` | this file's own location |
| Access | public, registry `registry.npmjs.org` | `publishConfig` in `runtime/package.json` |
| Published files | `dist/`, `README.md`, `LICENSE`, `SPEC.md`, `CHANGELOG.md`, `contract-head.json`, `package.json` | the `files` array |
| Licence | Apache-2.0 | `LICENSE` and the dist headers, which must agree |
| Second delivery channel | `https://yujin.app/nac-spec/js/nac.js`, published by CI on push | `.github/workflows/deploy.yml` |

Both channels are part of the delivery contract: the protocol must be
obtainable by `npm install @nac3/runtime` **and** by the script tag, and
both must match this repository after every change
(`docs/ELIGIBILITY.md`, owner answer Q5b).

## The three automatic checks around a publish

You do not have to remember these. They run themselves, and each one
refuses rather than warns.

1. **Before** the publish -- `prepublishOnly` runs the build, then
   `check-version-coherence.mjs`, then the whole runtime test suite. The
   version coherence gate is the lock written after the alpha.5
   incident: the version is declared once and every consumer of it in
   the tree must agree, or the publish does not start.

2. **After** the publish -- `postpublish` runs
   `scripts/verify-npm-publication.mjs --mode post-publish`, which
   downloads the package you just published **back from the registry**
   and compares every file against this tree, plus the tarball bytes
   against the integrity hash the registry recorded. It retries for
   about forty seconds, because the registry takes a few seconds to
   serve a version it has just accepted. If what landed is not this
   tree, you find out immediately, from the same command.

3. **On every push** -- CI runs the same program in `--mode release`.
   A version in the tree that is not published yet passes with a notice;
   a version that IS published and no longer matches this tree fails the
   build. So a divergence cannot sit unnoticed between releases.

Both modes of the gate, and the eight ways it must refuse, are proven in
`scripts/test-npm-publication-gate.mjs` -- which also runs in CI,
because a gate nobody proved red is a decoration.

## Publishing a stable release

```bash
# 1. The version lives in one place. Bump it there and nowhere else.
#    Everything that repeats it is derived and checked by the gate.
#    runtime/package.json -> "version": "2.5.3"

# 2. From the repository root: the full release chain.
#    Integrity, stylesheets, version coherence, contract API, the
#    translation gates, the live-landing self test, and the npm channel.
npm run check:release

# 3. Publish from the package directory.
cd runtime
npm publish --access public      # prepublishOnly and postpublish run here

# 4. If step 3's postpublish check printed a red, STOP and read it.
#    It names the file and the first differing line. A published
#    version cannot be replaced -- it can only be superseded -- so the
#    fix is a new patch version, not a retry.
```

To re-run the post-publish check on its own, from the repository root:

```bash
npm run verify:npm                      # the version in the tree
node scripts/verify-npm-publication.mjs --version 2.5.2 --mode post-publish
```

## Publishing a prerelease

Prereleases go to the `alpha` tag so that `npm install @nac3/runtime`
keeps resolving to the stable line:

```bash
cd runtime
npm publish --access public --tag alpha
```

Promoting one later is a dist-tag move, not a republication:

```bash
npm dist-tag add @nac3/runtime@2.5.3 latest
```

After any dist-tag move, run `npm run verify:npm` again: the tag changes
what adopters resolve, and the gate is what confirms that what they now
resolve is this tree.

## If the publish fails

* **403 Forbidden** -- 2FA not satisfied for this session, or the token
  in use has no write access to `@nac3`. Log in again with
  `npm login --scope=@nac3 --auth-type=web`.
* **402 Payment Required** -- the scope defaulted to private.
  `--access public` is in the command above for exactly this reason.
* **E403 cannot publish over the previously published versions** -- that
  version is already taken. Bump the patch version and start again from
  step 1. Never try to reuse a version number.
* **The postpublish check is red** -- the publication is wrong, not the
  check. Read which file it names. The usual causes: publishing from a
  dirty working copy, from the wrong branch, or without re-running the
  build after a source change.
* **"the registry is unreachable"** -- that is not a divergence and the
  gate says so in those words. Re-run it when you have a network;
  `--allow-offline` exists for deliberate offline work and is never used
  in CI.

## The open decision

Acceptance criterion 1 of PRE-3 (`docs/PENDING.md`) is still **not met**:
one build should produce both channels from the same tree, with neither
published by hand. The CDN channel is published by CI on every push. The
npm channel is published from this laptop, because publishing from CI
needs an automation token stored as the `NPM_TOKEN` repository secret,
and that is the owner's decision to take -- a token with write access to
the scope, living in GitHub.

What the gate above does and does not buy, stated plainly: a divergent
publication can no longer go **unnoticed** -- the publish command itself
reports it, and CI reports it on every later push. It can still
**happen**, because nothing prevents a human from publishing at the
wrong moment. Closing that last gap is criterion 1, and it waits on the
token decision.
