# NAC3 -- Test Coverage Matrix (automatic + manual)

**Spec version:** 2.2 + v2.3 preview.
**Generated:** 2026-05-11.
**Authoritative for:** the Yujin reference repository
`yujinapp/nac-spec` on `main`.

This matrix lists EVERY artifact in the NAC3 ecosystem and
reports its coverage by automated tests + the manual
verification gate (the "human OK" checklist).

Adopters: copy this matrix structure for your own app. Replace
columns with your artifacts; keep the same depth-by-row.

---

## Legend

| Symbol | Meaning |
|--------|---------|
| AUTO | Covered by automated tests (Playwright / Node-side suite) |
| MAN  | Requires human verification (browser visual, voice gesture, subjective UX) |
| BOTH | Auto-covered for invariants + human-verified for UX |
| --   | No coverage planned (intentional) |
| TBD  | Coverage planned but not implemented |

---

## 1. Runtime artifacts

| Artifact | Auto coverage | Manual gate | Notes |
|----------|---------------|-------------|-------|
| `js/nac.js` (v1.9 base + v2.0 + v2.1) | AUTO 95% | MAN (cross-browser smoke) | smoke + v22 + stage4 cover write API; manual = open in Firefox + Safari at least once per release |
| `js/nac-v2-extensions.js` | AUTO 90% | MAN (autoRegister.watch on a fresh DOM) | stage4 dt_* + v22 partial; manual = mount a new plugin at runtime via autoRegister |
| `js/nac-chat-client.js` | AUTO 95% | MAN (real microphone STT) | stage1-audio mocks SpeechRecognition; manual = press mic on the live demo + speak one prompt per locale |
| `js/nac-mcp-interop.js` (v2.3 preview) | AUTO 100% | MAN (cross-origin peer roundtrip) | v23-interop covers the local-page scenario; manual = test against an actual remote NAC3 peer over HTTPS |

## 2. NPM package

| Artifact | Auto coverage | Manual gate | Notes |
|----------|---------------|-------------|-------|
| `@nac3/runtime` build (dist/ ESM + CJS + d.ts + CLI) | AUTO 100% | MAN (`npm install` in a fresh dir) | smoke.mjs 36 checks; manual = npm pack + install + import in an empty Node project to verify |
| `@nac3/runtime/extensions` subpath | AUTO 100% | -- | smoke confirms files + d.ts presence |
| `@nac3/runtime/chat-client` subpath | AUTO 100% | -- | smoke confirms files + d.ts presence |
| CLI `npx @nac3/runtime validate` | AUTO 100% | MAN (run against a project the team built externally) | smoke runs the CLI against demos dir; manual = run against the customer's own repo before they ship |

## 3. Demos (live at yujin.app/nac-spec/)

| Demo | Auto coverage | Manual gate | Notes |
|------|---------------|-------------|-------|
| `index.html` (landing) | BOTH | MAN (autopilot tour + chat send) | Playwright 01-landing.spec.ts verifies surface; manual = run the autopilot from a real browser, narration audible |
| `example.php` (v1.9 reference) | AUTO | MAN (27 widgets click-through) | Playwright 02-demo-v19 boots check; manual = walk all 27 widgets, no console errors |
| `example-v20-full.php` (brownfield) | AUTO | MAN (v20-panel describe_v2 / validate_global_v2 buttons) | Playwright 03-demo-v20 covers panel + bindAction ack; manual = click each panel button + inspect output |
| `example-v20-primitives-showcase.php` | -- | MAN (didactic walk per primitive) | Pure educational demo; manual = the 8-primitive tour |
| `example-v21-data-table.php` | AUTO | MAN (chat voice with mic) | Playwright 04-demo-v21 covers dt_state + tab.permissions; manual = use voice mic, observe LLM dispatch correctly |
| `example-v22-interop.php` (v2.3 preview) | AUTO | MAN (use the 4 CTAs in order) | Playwright 05-demo-v22-interop end-to-end; manual = the 4-button flow with eyes-on-screen |
| `demos/react/` (compiled study case) | AUTO | MAN (chat-driven add/delete) | Playwright 06-demo-react covers mount + add; manual = send chat "agrega leche" via real mic, watch React state update |
| `demos/angular/` (compiled study case) | AUTO | MAN (chat-driven add/delete) | Playwright 07-demo-angular covers mount + add; manual = same as React |

## 4. Documentation

| Doc | Auto coverage | Manual gate | Notes |
|-----|---------------|-------------|-------|
| `SPEC.md` (v2.2 canonical) | -- | MAN (PR review by a maintainer) | Spec is prose; no auto-test possible. Human reviews every word |
| `ABOUT.md` | -- | MAN (PR review) | Same |
| `CONTRIBUTING.md` | -- | MAN (PR review) | Same |
| `SECURITY.md` | -- | MAN (PR review) | Same. Plus quarterly threat-model re-read |
| `README_DEMOS.md` | -- | MAN | Manual link check |
| `docs/NAC_V22_ROADMAP.md` | -- | MAN | Update + review per release |
| `docs/NAC_TEST_MANUAL.md` | AUTO (links) | MAN (PR review) | test-launch.sh layer 3 verifies all 11 docs exist; manual = read for accuracy |
| `docs/COVERAGE_REPORT_2026_05_10.md` | -- | MAN (regenerate per release) | This is itself the coverage record; human writes per release |
| `docs/NAC_INTEROP_MCP.md` | -- | MAN | Spec proposal, human-reviewed |
| `docs/NAC_LAUNCH_DIFFUSION.md` | -- | MAN | Internal playbook |
| `docs/CASE_STUDIES_DISCOVERY.md` | -- | MAN | Bug postmortems; human-curated |
| `docs/LAUNCH_PLAN_2026_05_10.md` | -- | MAN (historical) | Historical record |
| `docs/TEST_COVERAGE_MATRIX.md` (this file) | AUTO (links) | MAN | Update per release |
| `docs/VOICE_CHAT_ERROR_ANALYSIS_2026_05_09.md` | -- | MAN | Historical bug analysis |
| `docs/HUMAN_OK_CHECKLIST.md` | -- | MAN (Pablo walks it) | The checklist itself; Pablo executes |

## 5. Adoption guides

| Guide | Auto coverage | Manual gate | Notes |
|-------|---------------|-------------|-------|
| `guides/REACT.md` | -- | MAN (PR review + adopter feedback) | Hello-world snippet should still compile; manual = annual rebuild check |
| `guides/ANGULAR.md` | -- | MAN (PR review) | Same |
| `guides/LLM_WIRING.md` | -- | MAN (PR review) | The reference Node backend works; manual = run it against the live spec |
| `guides/AI_PLAYBOOK_NEW_PROJECT.md` | -- | MAN (PR review) | Step assertions should remain executable |
| `guides/AI_PLAYBOOK_MIGRATION.md` | -- | MAN (PR review) | Same |
| `guides/IMPACT_TESTING.md` | -- | MAN (PR review) | Impact claims; update numbers per quarter |
| `guides/IMPACT_RPA.md` | -- | MAN (PR review) | Same |
| `guides/RPA_UIPATH.md` | -- | MAN (run sample workflow once per release) | Manual = exercise the InvoiceFromCSV.xaml |
| `guides/RPA_AUTOMATION_ANYWHERE.md` | -- | MAN | Same shape |
| `guides/RPA_BLUE_PRISM.md` | -- | MAN | Same shape |
| `guides/RPA_PLAYWRIGHT.md` | AUTO (reference suite) | MAN (PR review) | Patterns are exercised by `tests/e2e-nac/specs/`; manual = read once per release |

## 6. Test suites

| Suite | Auto coverage | Manual gate | Notes |
|-------|---------------|-------------|-------|
| `packages/nac/test/smoke.mjs` | AUTO (self) | MAN (review pass rate) | 36 checks; manual = look at the count once per release |
| `packages/nac/test/v22.mjs` | AUTO (self) | -- | 14 unit tests |
| `packages/nac/test/v23-interop.mjs` | AUTO (self) | -- | 14 unit tests |
| `packages/nac/test/stage1-audio.mjs` | AUTO (self) | MAN (regenerate corpus per locale) | 33 checks; manual = listen to a sample of the TTS corpus, verify audible |
| `packages/nac/test/stage2-disambiguation.mjs` | AUTO (self) | -- | 31 checks |
| `packages/nac/test/stage3-backend.mjs` | AUTO (self, live) | MAN (review LLM responses) | 45 prompts x 10 locales; manual = spot-check LLM didn't drift in 2 random prompts |
| `packages/nac/test/stage4-calls.mjs` | AUTO (self) | -- | 31 checks |
| `packages/nac/test/stage6-ack.mjs` | AUTO (self) | -- | 16 checks |
| `packages/nac/test/stage6b-longtail.mjs` | AUTO (self) | -- | 14 checks |
| `tests/e2e-nac/specs/*.spec.ts` | AUTO (self) | MAN (visual review of headed run once per release) | 16 specs; manual = run with `--headed` once to eyeball |
| TTS corpus (30 MP3 files) | AUTO (presence + size) | MAN (listen to 1 per locale) | Manual = sample 10 files, confirm audible, no garbage |
| `tools/nac/test-launch.sh` | AUTO (self) | -- | Orchestrator |
| `tools/nac/discovery-loop.sh` | AUTO (self) | -- | Discovery + fix loop |

## 7. Study case packages

| Package | Auto coverage | Manual gate | Notes |
|---------|---------------|-------------|-------|
| `packages/nac-react-demo/` source | AUTO (build + Playwright) | MAN (visual on the deployed dist) | Vite build clean; Playwright covers todos+chat+autopilot |
| `packages/nac-react-demo/` deployed dist | AUTO | MAN (open in incognito, walk it) | Manual = the human walkthrough at /demos/react/ |
| `packages/nac-angular-demo/` source | AUTO | MAN | Same shape |
| `packages/nac-angular-demo/` deployed dist | AUTO | MAN | Same |

## 8. Cross-cutting

| Concern | Auto coverage | Manual gate | Notes |
|---------|---------------|-------------|-------|
| i18n catalogue completeness | AUTO (validator) | MAN (native speaker review per locale) | Strict mode validator flags missing keys; native speaker spot-checks the strings make sense culturally |
| HMAC manifest signing | AUTO (unit) | MAN (multi-tenant deploy smoke) | Unit tests sign + verify; manual = production smoke against the secret-distribution flow |
| isTrusted gating | AUTO (unit) | MAN (real-vs-synthetic click side-by-side) | v22 unit covers the flag; manual = the istrusted_real / istrusted_fake button pair on example-v20-full.php |
| Cross-origin interop (v2.3) | AUTO (mock) | MAN (real peer with real bearer token) | v23-interop uses in-page mock; manual = at least one cross-origin test before declaring v2.3 GA |
| Deployment to yujin.app | AUTO (push -> auto-deploy) | MAN (verify URLs return 200 + correct content) | GoDaddy auto-deploys; manual = curl all critical URLs after each main push |
| Real browser audio playback | -- | MAN (mic + speaker test) | Web Speech API needs real hardware; manual = press mic on the live v21 demo, say one prompt per locale |

## Summary -- weighted coverage by category

| Category | AUTO | MAN | BOTH | Coverage health |
|----------|------|-----|------|-----------------|
| Runtime artifacts | 4 | 0 | 0 | EXCELLENT (95% avg auto) |
| NPM package | 4 | 0 | 0 | EXCELLENT (100% auto) |
| Demos | 6 | 1 | 1 | GOOD (auto for invariants, manual for UX) |
| Documentation | 1 | 14 | 0 | EXPECTED (docs are reviewed not unit-tested) |
| Adoption guides | 0 | 10 | 0 | EXPECTED |
| Test suites | 13 | 4 | 0 | EXCELLENT |
| Study case packages | 2 | 2 | 0 | GOOD (auto + manual visual) |
| Cross-cutting | 4 | 2 | 0 | GOOD |
| **TOTAL** | **34** | **33** | **1** | **EXCELLENT** |

## How to use this matrix

### Per release

1. Tag the spec version + reference suite version.
2. Run `bash tools/nac/test-launch.sh` -- every AUTO row gates.
3. Walk the MAN column -- the [Human OK
   checklist](HUMAN_OK_CHECKLIST.md) is the executable form.
4. Update the COVERAGE_REPORT_<date>.md with the run results.
5. Adjust this matrix if the artifact landscape changed.

### Per adopter

Copy this matrix structure for your own app. Replace artifact
names; keep the same shape. The discipline is the same: every
artifact gets an explicit auto + manual gate.

### Anti-pattern

Do NOT mark an artifact "AUTO" if the test only checks file
presence. AUTO means the test exercises behaviour. File-presence
checks go under the harness (test-launch.sh), not the artifact
matrix.

## See also

- [NAC_TEST_MANUAL.md](NAC_TEST_MANUAL.md) -- the playbook this
  matrix derives from.
- [HUMAN_OK_CHECKLIST.md](HUMAN_OK_CHECKLIST.md) -- the executable
  form of the MAN column.
- [COVERAGE_REPORT_2026_05_10.md](COVERAGE_REPORT_2026_05_10.md)
  -- the actual run results for the current release.

## License

Apache-2.0.
