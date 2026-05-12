# NAC3 -- Native Agent Contract

> The small public contract that lets web UIs be driven by AI
> agents, voice runners, RPA bots, and accessibility tools --
> without per-app glue code.

[![Status: stable](https://img.shields.io/badge/status-stable-success)](https://yujin.app/nac-spec/)
[![Spec: v2.2](https://img.shields.io/badge/spec-v2.2-blue)](SPEC.md)
[![License: Apache 2.0](https://img.shields.io/badge/license-Apache--2.0-green)](LICENSE)
[![npm: @nac3/runtime](https://img.shields.io/npm/v/@nac3/runtime?label=npm)](https://www.npmjs.com/package/@nac3/runtime)
[![Tests: passing](https://img.shields.io/badge/tests-passing-success)](docs/COVERAGE_REPORT_2026_05_10.md)
[![Coverage: ~95%](https://img.shields.io/badge/coverage-95%25-success)](docs/TEST_COVERAGE_MATRIX.md)

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
| [Yujin CRM](https://yujin.app) | Production reference | v2.2 |
| [Reference demos](https://yujin.app/nac-spec/) | Live, 8 examples (vanilla, React, Angular, data-table, interop, voice ad) | v2.2 |
| [Atlas Pro voice ad](https://yujin.app/nac-spec/ads-demo/atlas-pro/) | Voice-driven advertisement closing the sale via NAC3 | v2.2 |
| Your app | [Bounty program](https://yujin.app/bounty) -- $200-500 per OSS PR | -- |

## Status: stable

- **v2.2** -- shipped 2026-05-10. `NAC.register` strict
  validator, `bindAction` helper, locale-detector hardening.
  Production-ready. This is what `npm install @nac3/runtime`
  delivers today.
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
- Reference runtime (`packages/nac/`): MIT.
- Demos in `nac-spec/`: Apache-2.0.

## See also

- Live spec: https://yujin.app/nac-spec/
- npm: https://www.npmjs.com/package/@nac3/runtime
- GitHub: https://github.com/yujinapp/nac-spec
- Discord: https://discord.gg/FH3xEmGm
- Status page: https://yujin.app/nac-spec/docs/COVERAGE_REPORT_2026_05_10.md
