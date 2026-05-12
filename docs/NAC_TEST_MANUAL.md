# NAC3 Test Manual

**A standardised test playbook for any NAC-3 compliant app.**

Version 1.0 -- 2026-05-11. Authoritative for the NAC3 v2.2 + v2.3
preview surface. Update when the spec moves.

This doc tells an adopter team what to test, how to test, what to
assert, and what to skip. Stage by stage along the NAC3 pipeline:

```
Comunicacion -> Desambiguacion -> Intencion -> Llamada -> Resultado -> Ack
    (1)             (2)             (3)         (4)         (5)        (6)
```

Plus cross-cutting concerns: constructor (V22-01), bindAction
contract (V22-02), interop (v2.3), provenance + security.

The Yujin reference suite (the case study at the bottom of this
manual) is **175+ unit tests + 16 Playwright e2e tests**. Average
weighted pipeline coverage **95%**. Copy what fits.

---

## 0. Why this manual exists

Every adopter of NAC3 builds a test corpus from scratch and ends
up with uneven coverage -- one team has perfect ack-event tests
but ignores the LLM intermediary; another has end-to-end
Playwright but no unit tests. This manual codifies what "complete
testing" means for a NAC-3 app.

The minimum bar for a NAC-3-certified app:

| Stage | Must have | Should have |
|-------|-----------|-------------|
| 1 Comunicacion | Text-path covered. STT mock test for the chat client. | Real TTS corpus + audio playback via Playwright. |
| 2 Desambiguacion | Locale-switch detector tested for false-positives. snapshotTree shape verified. | Per-tab/i18n label tolerance tested. |
| 3 Intencion | Live (or VCR-cassette) backend smoke for >= 5 prompts. | Anti-bug guards (specific to your app's bug history). |
| 4 Llamada | Every public NAC.* function called your app uses, with happy + error paths. | drag_drop, edit_field if you wire them. |
| 5 Resultado | DOM side-effect verified for at least the top-10 verbs your app exposes. | Cross-browser via Playwright matrix. |
| 6 Ack | Every event family your roles produce, with detail shape asserted. | Long-tail families (breadcrumb, accordion, step). |
| Interop | If you ship MCP export/import: export_tree shape + import + proxy + disconnect. | HMAC sign + recursion guard. |

---

## 1. Suite layout

We recommend this structure (matches the Yujin reference):

```
packages/<your-app>/
  test/
    smoke.mjs                       artefact integrity + CLI
    v22.mjs                         strict validator + bindAction
    v23-interop.mjs                 cross-app MCP (if you implement)
    stage1-audio.mjs                STT mock + TTS corpus integrity
    stage2-disambiguation.mjs       _detectLangSwitch + tab_by_label + snapshotTree
    stage3-backend.mjs              live (or recorded) backend smoke
    stage4-calls.mjs                every public NAC.* write API
    stage6-ack.mjs                  ack event families
    stage6b-longtail.mjs            breadcrumb/accordion/step/sort/filter/confirm
    fixtures/voice/                 TTS-generated MP3 corpus
      corpus.json                   prompt -> expected outcome
      generate.mjs                  one-shot regen via Google/ElevenLabs
      <locale>/<id>.mp3
tests/
  e2e-nac/
    playwright.config.ts
    specs/
      01-landing.spec.ts            @demos
      02-demo-<name>.spec.ts        @demos one per surface
      08-pipeline-end-to-end.spec.ts @e2e full chat-to-ack
tools/nac/
  test-launch.sh                    orchestrates everything
```

`tools/nac/test-launch.sh` runs:
- Layer 1: every node-side suite chained in order, bailing on
  first FAIL.
- Layer 1b (opt-in): live backend smoke (~60s).
- Layer 2: static lint via `npx @nac3/runtime validate <dir>`.
- Layer 3: doc link sanity.
- Layer 4: demo artefact integrity.
- Layer 5: study case package integrity.

Target: layers 1 + 2 + 3 + 4 + 5 under 10 seconds on a laptop.

---

## 2. Stage-by-stage: what to test

### Stage 1 -- Comunicacion (STT + raw input)

#### What this stage owns

Audio capture, STT transcript, raw text input into the chat
client. The chat client's `_sttBuffer` + `_sttFlushTimer`
debouncing belongs here. Locale-switch short-circuit
(`_maybeChangeLocaleLocally`) lives here too.

#### What to test

1. **STT mock + transcript injection.** Replace
   `window.SpeechRecognition` with a fake that fires a
   synthetic `result` event with a planted transcript. Verify
   that `NacChat.send(transcript)` propagates exactly that
   text into the dispatcher.
2. **TTS corpus integrity.** Generate ~30 audio prompts via
   Google Cloud TTS / ElevenLabs in your 10 supported locales.
   Verify each MP3 file exists + is >= 1KB. Acts as a
   regression detector for the corpus itself.
3. **Real audio playback (Playwright).** Optional. Replay one
   of the corpus MP3s through `getUserMedia` mocking, route to
   the browser's SpeechRecognition. Hard to set up cleanly;
   skip for v1.

#### What to assert

- Every prompt in the corpus reaches `NacChat.send()` with the
  exact text.
- Empty + whitespace input doesn't crash the chat client.
- The locale-switch short-circuit fires for prompts matching
  `_detectLangSwitch` (covered in Stage 2 too).

#### What to skip

- Microphone permission flows. They're browser-level UI; not
  worth Playwright.
- Cross-browser audio codec compatibility. Stick with MP3 in
  the corpus and one browser.

---

### Stage 2 -- Desambiguacion

#### What this stage owns

`_detectLangSwitch`. Snapshot composition + sanitisation.
`tab_by_label` matcher tolerance. Anything that turns raw text
into "what the LLM should see / what shortcut to fire locally".

#### What to test

1. **`_detectLangSwitch` false-positive cases.** This is the
   bug-prone area; ship explicit anti-tests:
   - `'cambia de pestana'` -> stays in current locale.
   - `'cambia precio de mouse 40'` -> stays in current locale.
   - `'borra de la lista'` -> stays.
   - `'pasa de A a B'` -> stays.
2. **`_detectLangSwitch` positive cases.** 12 minimum across
   the supported locales:
   - `'cambia a aleman'` -> de
   - `'switch to english'` -> en
   - `'use spanish'` -> es
   - `'cambia idioma a de'` (explicit trigger + bare code) -> de
   - Same-lang noop.
   - Empty / whitespace input.
3. **`tab_by_label`** tolerance:
   - Exact textContent match.
   - Parens-stripped match (`"Lines (collection)"` matches `"Lines"`).
   - i18n locale label match.
   - Unknown label -> not_found.
4. **`snapshotTree` shape.** Returns `{active, plugins[]}`.
   Includes manifest per plugin. Contains the active plugin's
   data-table snapshot (if v2.1).

#### What to assert

- Final language after `NacChat.send(text)` matches expectation.
- Backend was / wasn't called as expected.
- `tab_by_label` returns or throws cleanly per case.
- `snapshotTree()` is JSON-serialisable + bounded in size.

#### Common gotchas

- Bare 2-letter locale codes (`'de'`, `'es'`) collide with
  prepositions/articles. Test the trap cases explicitly.
- Filler labels of 1-2 chars in `label_i18n` cause false
  positives in partial match. Use realistic strings.

---

### Stage 3 -- Intencion (LLM intermediary)

#### What this stage owns

The HTTP round-trip between the chat client and the LLM
intermediary. The backend's role: read `nac_tree` snapshot +
prompt, return `{message, actions[]}`.

#### What to test

1. **Backend shape smoke.** For a set of canonical prompts in
   your supported locales (recommend >= 15), POST to the
   endpoint and assert:
   - HTTP 200.
   - JSON response with `ok` boolean.
   - When ok: `message` string + `actions` array.
   - Every `action.kind` is one of the canonical kinds.
2. **Anti-bug guards.** For each known bug class in your
   history, write an explicit live test. Example: `'cambia de
   pestana'` MUST NOT return `change_locale: 'de'`.
3. **Snapshot size guard.** Don't ship snapshots > 20KB to the
   LLM if you bill by token; the test fails the build if your
   tree exceeds budget.

#### What to skip

- LLM-specific action contents. The LLM is non-deterministic;
  don't assert "save will trigger action_id = X". Just shape.
- Network resilience (timeouts, retries). Belongs to load /
  reliability testing, not unit / smoke.

#### Live vs VCR

Live tests are fragile to LLM cost + rate limits. After the
prompt corpus stabilises, record responses as VCR cassettes
(JSON files matching prompt -> response) and replay in CI.
Yujin's reference uses live tests because the budget allows
~60s/run; switch to cassettes if your CI runs too often.

---

### Stage 4 -- Llamada (NAC.* write APIs)

#### What this stage owns

Every public function on `window.NAC`: click, click_by_verb,
fill, select, tab, tab_by_label, go_to_section, drag_drop,
edit_field, dt_*, bindAction.

#### What to test

For each function you use, three cases:

1. **Happy path.** Mount a DOM element matching the manifest
   id; wire its handler to emit the canonical ack event;
   call NAC.<func>(...) and assert it resolves.
2. **not_found.** Call with an id that doesn't exist; assert
   it throws with code `'not_found'` (or `'section_not_found'`
   for go_to_section).
3. **Invalid input.** Call with empty / wrong-shape args;
   assert it throws with code `'invalid'`.

For `dt_*` family, additionally:

- `dt_add_row` returns `{ok, row_id}`.
- `dt_edit_cell` happy + invalid-value-rejected (e.g.
  `qty < min`).
- `dt_remove_row` decrements `dt_state().rows.length`.
- `dt_commit` returns `{ok, final_state}`.
- `dt_discard` rolls back uncommitted mutations.

#### Implementation note

Run in a tiny in-process DOM shim (~150-200 lines of EventTarget
subclass) so you don't need jsdom or Playwright for stage 4.
Compound selector matcher (`[a="b"][c="d"]`) is the one feature
you must support. See `stage4-calls.mjs` in the reference suite.

---

### Stage 5 -- Resultado (DOM side effect)

#### What this stage owns

What actually changes in the DOM after a NAC.* call. Distinct
from Stage 4 (the function returned ok) and Stage 6 (the ack
event fired).

#### What to test

1. **Per-verb DOM mutation.** For your top-10 verbs:
   - `save` -> the underlying form submitted? Toast appeared?
   - `cancel` -> the modal closed? Form values reset?
   - `delete` -> the row removed from the list?
   - `add_row` -> a new row visible in the table?
2. **Playwright e2e per surface.** One spec per top-level
   plugin / screen. Mount the surface in a real browser,
   exercise the canonical user flow, assert DOM state.

#### What to skip

- Pixel-perfect screenshot diffs. Visual regression has its
  own tooling.
- Performance (frame rate, layout shifts). Belongs to perf
  testing, separate budget.

---

### Stage 6 -- Ack event family

#### What this stage owns

Every `nac:*` event the runtime listens for. Each has a
canonical detail shape (plugin + id-key + optional extras).

#### What to test

Per family in `_CLICK_EVENT_FAMILY`:

- `nac:action:succeeded` -- detail.plugin + detail.action_id +
  detail.is_trusted.
- `nac:action:failed` -- same + detail.error.
- `nac:field:changed` -- detail.field_id + detail.value.
- `nac:tab:activated` -- detail.tab_id.
- `nac:breadcrumb:navigated` -- detail.breadcrumb_id.
- `nac:accordion:expanded` / `:collapsed` -- detail.accordion_id.
- `nac:step:advanced` -- detail.step_id.
- `nac:table:page_changed` -- detail.page_index.
- `nac:confirm:resolved` / `:cancelled` -- detail.confirm_id.
- `nac:table:sort_changed` -- detail.column_id.
- `nac:table:filter_changed` -- detail.filter_id.

For each:
1. Mount a DOM element with the canonical role.
2. Wire the click handler to emit the canonical event.
3. Call `NAC.click(id)` and listen for the event.
4. Assert detail shape.

Plus:
- **Click-to-resolve timing.** The runtime's listener should
  resolve within 200ms of the ack firing. Anything slower is
  a runtime bug.
- **`bindAction`** auto-emits the ack after a sync handler.
- **`bindAction` async-resolve** auto-emits after Promise
  resolves.
- **`bindAction` throw** -> auto-emits `nac:action:failed`
  with detail.error.

---

### V22-01 -- Strict constructor validator

`NAC.STRICT_VALIDATION = true` makes `NAC.register` throw on:

- `manifest_role_unknown` -- role outside the canonical set.
- `tab_id_manifest_role_drift` -- id matches `^tab\.` but
  role is not `'tab'`.
- `manifest_dom_role_mismatch` -- mounted DOM has different
  role than manifest declares.

Test each by:
1. Setting `STRICT_VALIDATION = true`.
2. Calling `register` with a manifest crafted to violate the
   rule.
3. Asserting it throws with `code: 'strict_validation'` and
   `findings: [...]`.

Without strict mode: assert `console.error` was emitted (capture
via spy on `console.error`).

---

### V22-02 -- bindAction helper

Already covered above in Stage 6, but: write at least 5
explicit tests:

1. Sync handler -> ack fires.
2. Throwing handler -> failed event fires + error rethrown.
3. Async handler that resolves -> ack fires after resolution.
4. `bindAction` returns an unbinder; calling it stops the
   emission.
5. Missing ctx (no plugin or action_id) -> throws with
   `code: 'invalid'`.

---

### Interop -- v2.3 preview

If your app exports / imports NAC3 trees via MCP:

1. **export_tree shape.** Returns `{app_id, app_version,
   nac_version, exported_at, active_plugin, manifests,
   scope_tree, data_tables, state, ack_endpoint}`.
2. **export_tree filters.** `scope: 'plugin_slug:<slug>'`
   returns only that plugin. `scope: 'active_plugin'` returns
   only the active. `include_locales: ['en','es']` returns
   only those locales.
3. **import_remote_tree validation.** Missing bearer or
   endpoint throws `invalid`. Duplicate namespace throws
   `conflict`.
4. **Namespaced plugin registration.** After import,
   `NAC.list_registered_plugins()` includes `remote:<ns>:<slug>`.
5. **Proxy dispatch.** `NAC.click('remote:<ns>:...')` triggers
   a `fetch` to the peer's endpoint with `bearer` + `nac_id`
   (peer-local, no prefix) + `action.kind`.
6. **Local ack mirror.** After successful proxy, a local
   `nac:action:succeeded` fires with `detail.via_interop: true`
   + `detail.is_trusted: false`.
7. **Peer error bubbling.** Peer returns `{ok: false, error:
   {code: '...', message: '...'}}` -> client throws with
   peer's code.
8. **disconnect_remote.** Clears the namespace; subsequent
   `NAC.click('remote:...')` throws not_found.
9. **Local clicks don't proxy.** Critical contract: after the
   interop layer is installed, calling NAC.click on a LOCAL id
   must NOT fetch.

---

## 3. Tooling recommendations

### Test runner

- **Node + plain ESM modules** for stages 2-6. No Jest, no
  Vitest -- 200 lines of `assert(name, ok)` is enough and
  bumps fewer deps.
- **Playwright** for Stage 5 e2e + Stage 1 audio playback if
  you do it.

### CI

- Don't run live backend smoke (Stage 3) on every push -- ~60s
  per run x merge frequency = real money. Run on:
  - Manual trigger (`gh workflow run`).
  - Nightly cron.
  - Before tagging a release.
- Run stages 1, 2, 4, 6 + the harness on every push. Total
  budget: under 15s.

### Coverage report

Maintain a `docs/COVERAGE_REPORT_<date>.md` per release. Update
the case-by-case table. Include the weighted pipeline average.
The Yujin reference is in
`yujin.app/nac-spec/docs/COVERAGE_REPORT_2026_05_10.md`.

---

## 4. Anti-patterns to avoid

1. **Asserting LLM action contents.** Non-deterministic.
   Test SHAPE, not VALUES.
2. **Mocking the DOM in Stage 5.** Stage 5 is about real DOM
   mutation; use Playwright not a shim.
3. **Coverage by line, not by stage.** Lines of code covered
   tells you nothing about whether the pipeline works. Use
   the stage matrix.
4. **Stage 4 happy-paths only.** Not_found + invalid input are
   half the contract.
5. **Skipping Stage 6.** The ack event is the most-violated
   part of the spec in adopter code. Test every family you
   emit.
6. **No anti-bug guards.** Every production bug your app fixed
   gets a permanent regression test. The 'cambia de pestana'
   case is forever in our Stage 2.
7. **Live tests on every push.** Burns budget; flaky from
   third-party variance.

---

## 5. Case study -- the Yujin reference suite

All test source links below point to the canonical files on
GitHub.

| Suite | Source | Tests | Time |
|-------|--------|-------|------|
| smoke | [packages/nac/test/smoke.mjs](https://github.com/yujinapp/nac-spec/blob/main/runtime/test/smoke.mjs) | 36 | < 1s |
| v22 | [packages/nac/test/v22.mjs](https://github.com/yujinapp/nac-spec/blob/main/runtime/test/v22.mjs) | 14 | < 1s |
| v23-interop | [packages/nac/test/v23-interop.mjs](https://github.com/yujinapp/nac-spec/blob/main/runtime/test/v23-interop.mjs) | 14 | < 2s |
| stage1-audio | [packages/nac/test/stage1-audio.mjs](https://github.com/yujinapp/nac-spec/blob/main/runtime/test/stage1-audio.mjs) | 33 | < 1s |
| stage2-disambiguation | [packages/nac/test/stage2-disambiguation.mjs](https://github.com/yujinapp/nac-spec/blob/main/runtime/test/stage2-disambiguation.mjs) | 31 | < 1s |
| stage3-backend (live) | [packages/nac/test/stage3-backend.mjs](https://github.com/yujinapp/nac-spec/blob/main/runtime/test/stage3-backend.mjs) | ~150 (10 locales x 3 prompts) | ~120s |
| stage4-calls | [packages/nac/test/stage4-calls.mjs](https://github.com/yujinapp/nac-spec/blob/main/runtime/test/stage4-calls.mjs) | 31 | ~2s |
| stage6-ack | [packages/nac/test/stage6-ack.mjs](https://github.com/yujinapp/nac-spec/blob/main/runtime/test/stage6-ack.mjs) | 16 | < 1s |
| stage6b-longtail | [packages/nac/test/stage6b-longtail.mjs](https://github.com/yujinapp/nac-spec/blob/main/runtime/test/stage6b-longtail.mjs) | 14 | < 1s |
| TTS corpus generator | [packages/nac/test/fixtures/voice/generate.mjs](https://github.com/yujinapp/nac-spec/blob/main/runtime/test/fixtures/voice/generate.mjs) | -- | one-shot |
| TTS corpus catalog | [packages/nac/test/fixtures/voice/corpus.json](https://github.com/yujinapp/nac-spec/blob/main/runtime/test/fixtures/voice/corpus.json) | 30 prompts | -- |
| Harness | [tools/nac/test-launch.sh](https://github.com/yujinapp/nac-spec/blob/main/tools/nac/test-launch.sh) | 5 layers | ~10s |
| **Total node-side** | | **259+** | **~10s + 120s opt-in** |

Plus 16 Playwright e2e specs (~54s):

| Spec | Source | Tests | Tag |
|------|--------|-------|-----|
| 01-landing | [tests/e2e-nac/specs/01-landing.spec.ts](https://github.com/yujinapp/nac-spec/blob/main/tests/e2e-nac/specs/01-landing.spec.ts) | 2 | @demos |
| 02-demo-v19 | [tests/e2e-nac/specs/02-demo-v19.spec.ts](https://github.com/yujinapp/nac-spec/blob/main/tests/e2e-nac/specs/02-demo-v19.spec.ts) | 1 | @demos |
| 03-demo-v20 | [tests/e2e-nac/specs/03-demo-v20.spec.ts](https://github.com/yujinapp/nac-spec/blob/main/tests/e2e-nac/specs/03-demo-v20.spec.ts) | 2 | @demos |
| 04-demo-v21-datatable | [tests/e2e-nac/specs/04-demo-v21-datatable.spec.ts](https://github.com/yujinapp/nac-spec/blob/main/tests/e2e-nac/specs/04-demo-v21-datatable.spec.ts) | 3 | @demos |
| 05-demo-v22-interop | [tests/e2e-nac/specs/05-demo-v22-interop.spec.ts](https://github.com/yujinapp/nac-spec/blob/main/tests/e2e-nac/specs/05-demo-v22-interop.spec.ts) | 1 | @demos |
| 06-demo-react-study-case | [tests/e2e-nac/specs/06-demo-react-study-case.spec.ts](https://github.com/yujinapp/nac-spec/blob/main/tests/e2e-nac/specs/06-demo-react-study-case.spec.ts) | 2 | @study |
| 07-demo-angular-study-case | [tests/e2e-nac/specs/07-demo-angular-study-case.spec.ts](https://github.com/yujinapp/nac-spec/blob/main/tests/e2e-nac/specs/07-demo-angular-study-case.spec.ts) | 2 | @study |
| 08-pipeline-end-to-end | [tests/e2e-nac/specs/08-pipeline-end-to-end.spec.ts](https://github.com/yujinapp/nac-spec/blob/main/tests/e2e-nac/specs/08-pipeline-end-to-end.spec.ts) | 3 | @e2e |
| Config | [tests/e2e-nac/playwright.config.ts](https://github.com/yujinapp/nac-spec/blob/main/tests/e2e-nac/playwright.config.ts) | -- | -- |
| **Total Playwright** | | **16** | |

**Grand total: 205+ tests** covering the full pipeline from
chat input through ack event, with average weighted coverage
**95%**.

### Coverage by stage (Yujin reference, 2026-05-11)

| Stage | Suite that covers it | Coverage |
|-------|---------------------|----------|
| 1 Comunicacion | stage1-audio.mjs | 85% |
| 2 Desambiguacion | stage2-disambiguation.mjs | 95% |
| 3 Intencion | stage3-backend.mjs (live LLM) | 85% |
| 4 Llamada | stage4-calls.mjs | 95% |
| 5 Resultado | tests/e2e-nac/specs/*.spec.ts (Playwright) | 95% |
| 6 Ack | stage6-ack.mjs + stage6b-longtail.mjs | 100% |
| Interop (v2.3) | v23-interop.mjs + 05-demo-v22-interop.spec.ts | 100% |
| Constructor (V22-01) | v22.mjs | 100% |
| bindAction (V22-02) | v22.mjs | 100% |
| **Weighted average** | | **~95%** |

### Bugs the test corpus pulled out

The test corpus, during development, surfaced two real runtime
bugs that got fixed in the same branch:

1. **`tab_by_label` matcher too lax.** Original implementation
   accepted any bidirectional `indexOf` match. A 1-char filler
   label (`'a'`) in `label_i18n` would match any 1+ char query.
   Stage 2 test B4 caught it. Fix: require both candidate and
   query to be >= 3 chars for partial match; exact equality
   always allowed.

2. **Missing `list_registered_plugins` introspection helper.**
   The interop layer's `export_tree` iterates the manifest
   registry to produce its payload. The runtime had no public
   API to list registered plugins independent of DOM mount
   state. Caught while writing the v23-interop suite. Fix:
   added `NAC.list_registered_plugins()` returning
   `Object.keys(_manifests)`.

Both fixes shipped to `js/nac.js` on the same branch.

### Adopter playbook -- adopt this suite

1. **Copy the test infrastructure first.** `packages/nac/test/`
   shim + helpers + harness. Run the existing tests to verify.
2. **Replace the test corpus with your app's surface.** Your
   plugin slugs, your verbs, your data-tables. Keep the
   pipeline-stage organisation.
3. **Generate your TTS corpus** via
   `packages/nac/test/fixtures/voice/generate.mjs`. Provide
   your Google Cloud TTS or ElevenLabs key via env var.
4. **Wire `tools/nac/test-launch.sh`** to your CI. Layers 1-5
   in pre-merge; backend layer 1b opt-in or nightly.
5. **Maintain a coverage report.** Update per release.

### License

This manual is Apache-2.0 along with the rest of the NAC3 spec.
Copy, fork, redistribute.

---

## 6. Where to next

- [SPEC.md](../SPEC.md) -- the canonical contract Yujin tests
  against.
- [SECURITY.md](../SECURITY.md) -- threat model + provenance.
- [COVERAGE_REPORT_2026_05_10.md](COVERAGE_REPORT_2026_05_10.md)
  -- the live reference report.
- [LAUNCH_PLAN_2026_05_10.md](LAUNCH_PLAN_2026_05_10.md) -- the
  autonomous-Sumi launch playbook that this test corpus was
  built inside.

*This document evolves with the NAC3 spec. Submit edits via PR
against `yujin.app/nac-spec/docs/NAC_TEST_MANUAL.md`.*
