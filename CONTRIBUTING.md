# Contributing to NAC3

**Spec version:** 2.2 stable (+ v2.3 interop preview).

## Governance

NAC3 is currently stewarded by Yujin. The spec is Apache 2.0;
the reference runtime is MIT. Yujin commits to moving NAC3 to
a neutral foundation (W3C community group, Linux Foundation, or
equivalent) if and when adoption justifies neutral governance.
Until then, spec changes follow the RFC process below with at
least 14 days of public comment for any change to the public
API or wire formats.

The Apache 2.0 + MIT licensing guarantees that the spec and
runtime survive any change in Yujin's corporate status. Forks
are explicitly welcomed under both licenses.

---

Thanks for considering a contribution. NAC3 is a public spec plus a
reference implementation; both accept contributions.

## Three kinds of contribution

### 1. Spec change (RFC required)

Edits to `SPEC.md`, `ABOUT.md`, or `docs/NAC_V*_ROADMAP.md` are
spec changes. Before opening a PR:

1. Open a GitHub issue titled `RFC: <one-line summary>`.
2. Describe the problem class (what bug or limitation it fixes,
   ideally with a concrete reproduction).
3. Describe the proposed contract change.
4. Describe the migration path for existing adopters.
5. Wait for at least one maintainer reply on the issue before
   opening the PR.

Spec PRs that arrive without a paired RFC issue will be closed
with a pointer to this section.

### 2. Reference runtime change

Edits to `js/nac.js`, `js/nac-v2-extensions.js`, or
`js/nac-chat-client.js`. PRs welcome without an RFC if:

- The change is a bug fix that aligns the runtime with the
  current spec.
- The change is a performance improvement with no behavioural
  delta.
- The change is documentation, types, or test coverage.

PRs that change runtime behaviour in a way that affects the spec
contract MUST be paired with a spec RFC first.

### 3. Demo, tooling, or doc improvement

Edits to `example*.php`, `tools/`, `guides/`, or any non-spec
markdown. PR directly. Keep changes minimal; we prefer ten small
PRs to one big one.

## Code style

- ASCII-only source files (the project is GoDaddy-deployed; PHP
  8.3 rejects non-ASCII even in comments). Use `--` for em-dashes,
  not `--`.
- JS: no transpiler, no bundler, no build step on the runtime
  files. Plain ES2018+. The npm package adds an ESM/CJS wrapper
  around the same source.
- PHP: keep heredocs simple (`{$var}` only, no expressions).
- Comments: explain WHY, not WHAT. The diff already shows the what.
- Tests: every behavioural change ships with a test that fails
  before and passes after. Run `make test-launch` from the repo
  root before pushing.

## Commit style

- Subject under 70 characters, present-tense imperative.
  "fix(nac): treat tab role drift as register-time error", not
  "Fixed tab thing".
- Body explains the problem, the cause, and the fix. Cite
  related commits by short SHA.
- Co-author trailer for AI-assisted commits is fine; we don't
  hide tooling.

## Reviewing

- Bugfix PRs: 1 approver, merge.
- Runtime/spec PRs: 1 approver + green CI, merge.
- Spec change PRs: paired RFC issue with discussion + 1 approver
  + green CI + 7-day comment window after the PR opens.

## Licensing

By submitting a PR you license your contribution under Apache-2.0
to match the project. The PR template includes a checkbox; tick it.

## Code of conduct

Be technically correct, brief, and kind. Disagreement is fine; ad
hominem is not. Maintainers may close threads or revoke commit
access for repeat violations.

## Where to ask questions

- GitHub Discussions for design questions, "should I use NAC3 for
  this?", and showcases.
- GitHub Issues for bug reports.
- `nac@yujin.dev` for security disclosures (see `SECURITY.md`).
