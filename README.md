# NAC3 -- Native Agent Contract

> The small public contract that lets web UIs be driven by AI
> agents, voice runners, RPA bots, and accessibility tools --
> without per-app glue code.

[![Status: alpha](https://img.shields.io/badge/status-2.5--alpha-orange)](https://yujin.app/nac-spec/)
[![Spec: v2.5-alpha.5](https://img.shields.io/badge/spec-v2.5_alpha.5-orange)](SPEC.md)
[![License: Apache 2.0](https://img.shields.io/badge/license-Apache--2.0-green)](LICENSE)
[![npm: @nac3/runtime](https://img.shields.io/npm/v/@nac3/runtime?label=npm)](https://www.npmjs.com/package/@nac3/runtime)
[![Tests: passing](https://img.shields.io/badge/tests-349_passing-success)](runtime/test/)

> **v2.5.0-alpha.5 shipped** (2026-05-25) -- v2.5 line complete; 8 SHIPPED RFCs each with Layer 2 + Layer 3 LIVE evidence; promoted to npm latest.
> Unifies the two parallel dev lines that diverged during May 2026 and
> establishes `yujinapp/nac-spec` as the SOLE source of truth for NAC3
> from this commit forward. Adds **V25-01** plugin extension contract
> for canvas+API surfaces (Block A: 8 backends -- postmessage,
> postmessage-listen, sdk-call, script-bridge, dom-mirror,
> same-origin-window, synthetic-mutation, synthetic-poll); ships
> **V24-02** `syncPlugin` for the first time in code (was announced in
> 2.3.x but never landed); ships **V24-05** agent authority + sudo
> elevation primitives (`confirm_action`, `request_authority` with TTL,
> scope rank, `set_confirm_handler`); enforces **V24-01** plugin slug
> uniqueness via `data-nac-plugin-id` at register time + boot pass +
> CI gate. Read [PROJECT.md](PROJECT.md) for the orientation +
> programming norms; [CHANGELOG](runtime/CHANGELOG.md) for the full
> entry; [rfcs/](rfcs/) for the RFC state index.
>
> V24-04 snapshot versioning + OCC is in implementation and targets
> 2.5.0-alpha.2 (or rc.1).

---

## What

NAC3 is what ARIA would have been if it had been designed in
2026 with LLMs in mind. A handful of HTML attributes
(`data-nac-id`, `data-nac-role`, `data-nac-action`) plus an
optional JS manifest let any caller -- a voice runner, a
Playwright spec, an LLM intermediary, a screen reader, an RPA
bot -- address the same UI by name, not by visual coordinate or
CSS selector.

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
| Cross-app workflows need per-pair glue | v2.3 interop layer routes between NAC3 apps |

## Made with NAC3

| App | Type | NAC3 version |
|-----|------|--------------|
| [Yujin CRM](https://yujin.app) | Production reference | v2.5-alpha |
| [Reference demos](https://yujin.app/nac-spec/) | Live, 9 examples (vanilla, React, Angular, data-table, interop, voice ad, disambiguation) | v2.5-alpha |
| [Atlas Pro voice ad](https://yujin.app/nac-spec/ads-demo/atlas-pro/) | Voice-driven advertisement closing the sale via NAC3 | v2.5-alpha |
| Your app | [Bounty program](https://yujin.app/bounty) -- $200-500 per OSS PR | -- |

## Status: alpha + stable in parallel

- **v2.5.0-alpha.5** -- shipped 2026-05-25. **v2.5 line complete.**
  All 8 SHIPPED RFCs of the v2.5 series have runtime + Layer 2
  visual + Layer 3 Pilot LIVE evidence:
  - V24-01 plugin slug uniqueness
  - V24-02 idempotent syncPlugin
  - V24-04 snapshot versioning + OCC (STRICT_VERSIONING defaults true)
  - V24-05 agent authority + sudo elevation
  - V25-01 plugin extension contract for canvas+API (8 backends)
  - V25-02 tree navigation (context + tree + data-nac-opens/leaf)
  - V25-03 asistive labels (narrate)
  - V25-04 effect detection (expect + diff)

  Promoted to npm dist-tag `latest`. `yujinapp/nac-spec` is the
  SOLE source of truth (rpaforce-crm working copy removed since
  alpha.1).
- **v2.4** -- shipped 2026-05-23. Zero-silent-damage strict resolution
  + disambiguation contract. `click_by_verb` / `tab` / `tab_by_label`
  throw `NacError` with `err.candidates` and emit
  `nac:disambiguation_requested` instead of guessing. Headline change
  for assistive-software callers. Stable in 2.5; behaviour unchanged.
- **v2.3** -- shipped 2026-05-13. Payload-bearing actions
  (`NAC.invoke(id, payload)`, `NAC.utter(id, {text, lang})`), F1-F7
  primitives (bindTab, edit_field GA, auth-aware caps).
- **v2.2** -- shipped 2026-05-10. `NAC.register` strict validator,
  `bindAction` helper, locale-detector hardening.
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

## Open standard, open governance

NAC3 is currently stewarded by Yujin. The spec is Apache 2.0;
the reference runtime is MIT. Yujin commits to moving NAC3 to a
neutral foundation (W3C community group, Linux Foundation, or
equivalent) if and when adoption justifies neutral governance.
Spec changes follow the RFC process in
[CONTRIBUTING.md](CONTRIBUTING.md) with at least 14 days of
public comment for any public API or wire-format change.

The Apache 2.0 + MIT licensing guarantees the spec + runtime
survive any change in Yujin's corporate status. Adopters can
fork either, run either, and ship either, today and after
Yujin no longer exists.

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
- Reference runtime (`runtime/`): Apache-2.0 (was tagged MIT in the
  pre-2.5 dual-repo era; harmonised to Apache-2.0 across all NAC3
  artefacts as of the 2026-05-23 consolidation).
- Demos at the repo root + under `demos/`: Apache-2.0.

## See also

- Live spec: https://yujin.app/nac-spec/
- npm: https://www.npmjs.com/package/@nac3/runtime
- GitHub: https://github.com/yujinapp/nac-spec
- Discord: https://discord.gg/FH3xEmGm
- Status page: https://yujin.app/nac-spec/docs/COVERAGE_REPORT_2026_05_10.md
