# NAC3 -- Native Agent Contract

> The small public contract that lets web UIs be driven by AI
> agents, voice runners, RPA bots, and accessibility tools --
> without per-app glue code.

[![Status: experimental](https://img.shields.io/badge/status-experimental-orange)](https://yujin.app/nac-spec/)
[![Spec: v2.2](https://img.shields.io/badge/spec-v2.2-blue)](SPEC.md)
[![License: Apache 2.0](https://img.shields.io/badge/license-Apache--2.0-green)](LICENSE)
[![npm: @nac3/runtime](https://img.shields.io/npm/v/@nac3/runtime?label=npm)](https://www.npmjs.com/package/@nac3/runtime)

---

## What

NAC3 is an experimental contract for driving web UIs from AI
agents, voice runners, RPA bots, and accessibility tools --
without per-app glue code.

A handful of HTML attributes (`data-nac-id`, `data-nac-role`,
`data-nac-action`) plus an optional JS manifest let any caller
address the page by name, not by CSS selector or visual
coordinate. The runtime resolves names to elements and emits
deterministic events when each action finishes.

Single-vendor today (Yujin) with Apache 2.0 + MIT licensing so
adopters can fork, run, and ship without depending on Yujin's
continuity. See [governance](#governance) for the plan to move
to neutral stewardship as adoption grows.

## Quick install

```bash
npm install @nac3/runtime
```

```html
<!-- or via CDN -->
<script src="https://yujin.app/nac-spec/js/nac.js"></script>
<button data-nac-id="invoice.save"
        data-nac-role="action"
        data-nac-action="save">Save</button>
```

```js
// From any caller:
await NAC.click('invoice.save');
// -> emits 'nac:action:succeeded' when done.
```

## See it in action

[**Atlas Pro voice ad demo**](https://yujin.app/nac-spec/ads-demo/atlas-pro/?lang=es) -- an ad that closes its own sale by voice. The visitor speaks, the agent listens in 10 languages, fills the form against a NAC3 manifest, submits the lead to a CRM. Zero clicks. Three seconds.

The voice ad is the visceral case. The same five attributes also drive meeting schedulers, ERP forms, dashboards, admin panels, RPA bots, and Playwright specs -- one contract, every caller.

## Why NAC3

| Today's pain | NAC3 fix |
|--------------|----------|
| CSS selectors break on every redesign | `data-nac-id` is stable across redesigns |
| Locale-dependent label selectors break across translations | Dispatch by id, not label; label_i18n is the LLM's concern |
| Screen readers + voice control + RPA all need separate integrations | One contract; every caller speaks the same verbs |
| LLM agents hallucinate DOM structure | Manifest declares exactly what the page accepts |
| Cross-app workflows need per-pair glue | v2.3 (preview) interop layer routes between NAC3 apps |

## Where NAC3 fits in the agent stack

**NAC3 is the client-side half of agent-driven software. MCP is
the server-side half. Use both for full-stack agents: MCP
exposes your business logic, NAC3 exposes your UI.**

NAC3 does not compete with any of these -- it overlaps in
narrow ways and complements in others. If you only have one
of the problems below, use the dedicated tool. If you have
several, NAC3 unifies the contract.

| Layer | What it solves | Where it stops | NAC3 relationship |
|-------|----------------|----------------|-------------------|
| **MCP** (Anthropic) | Agent calls server-side tools / functions | Doesn't touch the UI; agent can't navigate, fill forms, or read on-screen state | **Complement.** Use MCP for backend ops, NAC3 for the UI half. v2.3 preview adds an MCP bridge to route between NAC3 apps. |
| **ARIA** | Accessibility tree for screen readers + switch devices | Stops at "this is a button named Save"; no verb the agent can call, no completion event | **Sits next to.** Keep your ARIA roles. Many adopters end up with `role="button"` and `data-nac-role="action"` on the same element. |
| **`data-testid`** | Stable selectors for test runners (Cypress, Playwright) | Test-only; no manifest, no event family, no provenance, no i18n | **Superset.** NAC3 covers the testing case + voice + RPA + LLM with the same attribute, but at a higher mental cost. If you only need tests, `data-testid` is fine. |
| **AG-UI** (CopilotKit) | Agent-to-app protocol for chat-driven UIs | Tied to the CopilotKit framework + JS runtime; less focus on RPA / a11y / cross-vendor LLMs | **Adjacent.** Different bet on the same problem space. AG-UI has Series A funding and an existing ecosystem; NAC3 is open + framework-agnostic but earlier-stage. Pick AG-UI if you're building on CopilotKit; NAC3 if you want a framework-neutral surface. |
| **Computer Use / Browser Use** (vision-based agents) | Agent reads pixels, reasons over screenshots | Slow, expensive, and brittle on dynamic content; depends entirely on the LLM | **Fallback layer.** Vision is what the agent uses when NAC3 isn't there. NAC3 turns a 3-second pixel-reasoning round into a 30 ms named dispatch. |

**Honest read of the trade:** if you're inside a single app with
a single agent vendor, MCP (server side) + a screen-reader-grade
ARIA pass (client side) gets you most of the way. NAC3 starts
paying back when you have **multiple callers** (voice + chat +
RPA + tests) or **cross-app** workflows, or when you want
**vendor-portable** agent integrations.

## Made with NAC3

| App | Type | NAC3 version |
|-----|------|--------------|
| [Yujin CRM](https://yujin.app) | Production reference | v2.2 |
| [Reference demos](https://yujin.app/nac-spec/) | Live, 8 examples (vanilla, React, Angular, data-table, interop, voice ad) | v2.2 |
| [Atlas Pro voice ad](https://yujin.app/nac-spec/ads-demo/atlas-pro/) | Voice-driven advertisement closing the sale via NAC3 | v2.2 |
| Your app | [Bounty program](https://yujin.app/bounty) -- $200-500 per OSS PR | -- |

## Status

- **v2.2** -- shipped 2026-05-10. `NAC.register` strict
  validator, `bindAction` helper, locale-detector hardening.
  This is what `npm install @nac3/runtime` delivers today.
  Used in production inside Yujin's own CRM; outside adopters
  are early and few -- see [Made with NAC3](#made-with-nac3).
- **v2.3** -- preview branch with cross-NAC3 interop (MCP
  bridge for cross-origin + cross-device). Tested in-page; GA
  after one full cross-origin real-world test cycle.
- **v3.0** -- roadmap. Mobile-native dialect
  (`accessibilityIdentifier` on iOS, `contentDescription` on
  Android) for non-DOM widgets.

## Documentation

| Audience | Start here |
|----------|------------|
| Anyone | [SPEC.md](SPEC.md) -- canonical contract |
| Anyone | [ABOUT.md](ABOUT.md) -- 2-minute pitch |
| Adopter (React) | [guides/REACT.md](guides/REACT.md) |
| Adopter (Angular) | [guides/ANGULAR.md](guides/ANGULAR.md) |
| LLM backend wiring | [guides/LLM_WIRING.md](guides/LLM_WIRING.md) |
| AI agent migrating an app | [guides/AI_PLAYBOOK_MIGRATION.md](guides/AI_PLAYBOOK_MIGRATION.md) |
| AI agent starting fresh | [guides/AI_PLAYBOOK_NEW_PROJECT.md](guides/AI_PLAYBOOK_NEW_PROJECT.md) |
| QA / Playwright | [guides/RPA_PLAYWRIGHT.md](guides/RPA_PLAYWRIGHT.md) |
| RPA (UiPath / AA / BluePrism) | [guides/RPA_UIPATH.md](guides/RPA_UIPATH.md) + siblings |
| Security review | [SECURITY.md](SECURITY.md) |
| Accessibility | [docs/ACCESSIBILITY.md](docs/ACCESSIBILITY.md) |

Full docs in 10 languages (es, en, pt, fr, it, de, ja, zh, hi,
ar) under `i18n/` -- machine-translated baseline +
native-speaker reviewed for ja/zh/ar/hi.

## Governance

NAC3 is stewarded by Yujin today -- one company, not a
foundation. We say this up front because the difference matters:
NAC3 is not yet an industry standard the way ARIA or MCP are.
It is a vendor-authored contract published under permissive
licenses so adopters don't depend on Yujin's continuity.

- Spec: Apache 2.0.
- Reference runtime (`packages/nac/`): MIT.
- Spec changes follow the RFC process in
  [CONTRIBUTING.md](CONTRIBUTING.md) with at least 14 days of
  public comment for any change to the public API or wire
  format.

Yujin commits to moving NAC3 to a neutral foundation (W3C
community group, Linux Foundation, or equivalent industry body)
if and when adoption justifies neutral governance. Until then,
the Apache 2.0 + MIT licensing is what guarantees portability:
adopters can fork either, run either, and ship either, today
and after Yujin no longer exists.

## Roadmap, commercial tools

NAC3 itself is and will remain free + open. Yujin sells two
commercial tools that build on top of it -- both BYOK (you pay
your own AI provider, we cover the tooling):

- **Yujin Forge** ($19/mo) -- the IDE for building NAC3 apps.
  Claude Code curated + scaffolding + auto-deploy + `forge
  publish`. Coming Q3 2026.
- **Yujin Pilot** ($5/mo, free w/ Forge) -- the controller for
  NAC3 apps. Voice + chat + cross-app routing. Coming Q3 2026.

[Sign up for the waitlist](https://yujin.app/nac-spec/#waitlist).

## Contributing

PRs welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) for the RFC
process for spec changes.

Bounty program for adopters:
[yujin.app/bounty](https://yujin.app/bounty).

## License

- Specification + docs: Apache-2.0.
- Reference runtime (`packages/nac/`): MIT.
- Demos in `nac-spec/`: Apache-2.0.

## See also

- Live spec: https://yujin.app/nac-spec/
- npm: https://www.npmjs.com/package/@nac3/runtime
- GitHub: https://github.com/yujinapp/nac-spec
- Discord: https://discord.gg/FH3xEmGm
- Status page: https://yujin.app/nac-spec/docs/COVERAGE_REPORT_2026_05_10.md
