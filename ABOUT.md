# About NAC3

**Spec version:** 2.2 stable (+ v2.3 interop preview).

**NAC3** = **Native Agent Contract**.

A small, public spec that lets web UIs be driven by AI agents, voice
runners, and accessibility tools the way they're driven by humans
today: by clicking, typing, and reading -- but with names that
machines can resolve, events that machines can wait on, and a
provenance trail that distinguishes a real user from a synthetic
caller.

NAC3 sits next to ARIA, not on top of it. Where ARIA standardised
the **accessibility tree** so screen readers and switch devices
could operate the same UI a sighted user sees, NAC3 standardises
the **agent tree** so a voice command, an LLM intermediary, or an
RPA bot can do the same thing without per-app glue code.

## What you write

A handful of HTML attributes (`data-nac-id`, `data-nac-role`,
`data-nac-action`, `data-nac-plugin`) plus an optional JS manifest
that names the things on the page and the verbs they accept. The
runtime resolves names to elements and dispatches to them.

## What you get

- A page that responds to `NAC.click('deals.create')` from any
  caller -- a voice runner, a Playwright spec, an LLM intermediary,
  a keyboard macro, an accessibility tool.
- A page that emits a deterministic event family
  (`nac:action:succeeded`, `nac:tab:activated`, `nac:field:changed`,
  ...) so the caller knows when each step finished.
- A page whose element identities, not coordinates, drive the
  contract -- so a UI redesign does not break automation.
- A provenance layer (`isTrusted`, HMAC-signed manifests) that
  tells a downstream system whether a click came from a real user
  or from another agent.

## What NAC3 is not

- It is not a UI framework. You keep React / Vue / vanilla / PHP /
  whatever. NAC3 is a thin contract layered on top of whatever you
  already render.
- It is not an LLM. The LLM that resolves "click the save button"
  to `NAC.click('deals.save')` is your problem (or your vendor's);
  see `guides/LLM_WIRING.md` for a reference.
- It is not an accessibility replacement. Keep your ARIA roles.
  NAC3 adds a parallel layer; many adopters end up with both
  `role="button"` and `data-nac-role="action"` on the same element.

## Status

- **v1.9** -- stable. 27 widgets covered, 9 event families,
  HMAC + isTrusted, i18n strict mode, validator. Production
  reference is `example.php`.
- **v2.0** -- ships brownfield migration story (existing pages
  become NAC-driven via ~80 lines of setup). Reference:
  `example-v20-full.php`.
- **v2.1** -- adds the data-table primitive (`collection`,
  `matrix`, `matrix-singletree` subkinds; `dt_add_row`, `dt_edit_cell`,
  aggregates, transactional commit). Reference:
  `example-v21-data-table.php`.
- **v2.2** -- SHIPPED 2026-05-10. `NAC.register` is now a strict
  validator (`manifest_role_unknown`, `tab_id_manifest_role_drift`,
  `manifest_dom_role_mismatch`). New `NAC.bindAction(el, handler,
  ctx)` helper bakes the `nac:action:succeeded` contract into the
  runtime. New flag `NAC.STRICT_VALIDATION` toggles findings
  between warning-only (default in 2.2) and throwing (default in
  2.3). **This is what `npm install @nac3/runtime` ships today.**
  See `docs/NAC_V22_ROADMAP.md` for the full changelog.
- **v2.3** -- in planning. `STRICT_VALIDATION` default flips to
  `true`. `NAC.bindTab(el, handler, ctx)` companion for tab
  widgets. Optional opt-in: streaming chat dispatch.

## Where to start

- Run the demos at `yujin.app/nac-spec/` (any browser, any device).
- Read `SPEC.md` for the full contract.
- Read `guides/REACT.md` if you adopt from React.
- Read `guides/LLM_WIRING.md` if you wire your own LLM
  intermediary.
- Read `SECURITY.md` before deploying NAC3 in a tenant context.

## Governance

NAC3 is currently stewarded by Yujin. The spec is Apache 2.0;
the reference runtime is MIT. Yujin commits to moving NAC3 to
a neutral foundation (W3C community group, Linux Foundation,
or equivalent industry body) if and when adoption justifies
neutral governance. Until then, spec changes follow the RFC
process in `CONTRIBUTING.md` with a public comment period of
at least 14 days for any change to the public API or wire
format.

The Apache 2.0 + MIT licensing guarantees that the spec and
runtime survive any change in Yujin's corporate status.
Adopters can fork either, run either, and ship either, today
and after Yujin no longer exists.

## Where NAC3 sits in the agent stack

**NAC3 is the client-side half of agent-driven software. MCP is
the server-side half.** Use both together for full-stack agents:
MCP exposes your business logic to the model; NAC3 exposes your
UI to whatever caller dispatches the next step (voice, chat,
RPA, test runner, accessibility tool).

NAC3 does not compete with MCP, ARIA, `data-testid`, or AG-UI.
It overlaps in narrow ways and is meant to coexist:

- **MCP** (Anthropic) handles server-side tool calls; NAC3
  handles the UI half. v2.3 preview adds an MCP bridge for
  cross-app routing.
- **ARIA** describes the accessibility tree; NAC3 describes the
  agent tree. They sit side by side on the same elements.
- **`data-testid`** solves stable selectors for tests. NAC3
  covers that case plus voice, RPA, LLM and i18n with one
  attribute, at a higher mental cost. If you only need tests,
  stay on `data-testid`.
- **AG-UI** (CopilotKit) is an adjacent bet on the same problem
  space, focused on chat-driven UIs inside the CopilotKit
  framework. NAC3 is framework-neutral and earlier-stage.

The honest read: NAC3 starts paying back when you have
**multiple callers** (voice + chat + RPA + tests) or
**cross-app** workflows, or when you want **vendor-portable**
agent integrations. For a single app talking to a single agent
vendor, MCP + ARIA already covers most cases.

## Authorship

NAC3 is authored and maintained by Yujin (yujin.app).
Apache-2.0. Contributions welcome -- see `CONTRIBUTING.md`.
