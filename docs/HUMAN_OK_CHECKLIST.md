# NAC3 -- Human OK checklist

**Spec version:** 2.2 + v2.3 preview.
**Last walked:** 2026-05-11 (to be updated per release).
**Purpose:** the executable form of the MAN column in
[TEST_COVERAGE_MATRIX.md](TEST_COVERAGE_MATRIX.md). A human
walks every item below and ticks the box. If any item fails,
the release does NOT ship -- file a bug and fix before retrying.

This is NOT a substitute for automated tests. The auto suite
(`bash tools/nac/test-launch.sh`) MUST be green before you start
this checklist. The checklist exists for everything automation
cannot see: real audio, cross-browser feel, native-speaker
phrasing, cross-origin handshake with a live peer, visual
polish.

---

## How to use this document

1. Open a fresh incognito window (Chrome + Firefox + Safari, in
   that order, repeat the visual sections for each).
2. Walk the sections in order -- some sections depend on a
   previous one being live (e.g. interop needs both demos to
   have loaded).
3. Tick each `[ ]` only when you personally confirm. Don't
   delegate. If unsure, mark `[?]` and ask the spec lead.
4. At the end, sign + date the SIGN-OFF block.
5. Commit the file with the new run date stamp.

Estimated time per pass: **45-60 minutes**. Do not rush; the
whole point of this gate is the parts automation misses.

---

## 1. Runtime artifacts

### 1.1 Cross-browser smoke -- `js/nac.js` + `nac-v2-extensions.js`

For each browser (Chrome, Firefox, Safari):

- [ ] Open `https://yujin.app/nac-spec/example.php` in
      incognito.
- [ ] Console has zero errors after 5 seconds.
- [ ] `NAC.describe().plugins[0]` returns an object in the
      console.
- [ ] `NAC.list_registered_plugins()` returns at least one
      slug.
- [ ] Click one button decorated with `data-nac-role="action"`
      -- it works AND a `nac:action:succeeded` event fires
      (listen via `document.addEventListener` in console).

### 1.2 Live chat client -- `nac-chat-client.js`

- [ ] On `example-v21-data-table.php`, press the mic button.
- [ ] Say "ve a permisos" -- chat dispatches a tab switch,
      not a free-text reply.
- [ ] Repeat in English ("go to permissions") + Portuguese
      ("vai para permissoes") -- correct dispatch.
- [ ] Say "cambia de pestaña" -- locale does NOT switch to
      German (regression guard for V22-03).

### 1.3 Interop runtime -- `nac-mcp-interop.js`

- [ ] Open `example-v22-interop.php`.
- [ ] Use the 4 CTAs in order: Export tree -> Import remote ->
      List remote apps -> Disconnect remote.
- [ ] Each CTA logs success to its output panel.
- [ ] After Disconnect, the remote app no longer appears in
      `NAC.list_remote_apps()`.

---

## 2. NPM package

### 2.1 Fresh install smoke

- [ ] In a scratch directory:
      ```
      mkdir /tmp/nac-smoke && cd /tmp/nac-smoke
      npm init -y
      npm install @nac3/runtime
      node -e "import('@nac3/runtime').then(m => console.log(Object.keys(m)))"
      ```
- [ ] Output includes `NAC`, `registerPlugin`, validators.
- [ ] No deprecation warnings during install.

### 2.2 CLI validator on an external project

- [ ] Pick any non-Yujin project you have (a demo from
      adoption, or any folder).
- [ ] Run `npx @nac3/runtime validate .` from its root.
- [ ] Output is human-readable, lists 0 BLOCKERS, exits 0 on
      clean / non-zero on findings.

---

## 3. Demos

### 3.1 Landing -- `index.html`

- [ ] Page renders with sumi-e branding, no FOUC.
- [ ] Click "Autopilot" -- 5-second tour runs, narration
      audible (TTS, not silent).
- [ ] Open chat -- type "que es NAC3?" -- get a coherent
      response, not error.

### 3.2 Reference demo -- `example.php`

- [ ] Walk every one of the 27 widgets visible on the page.
- [ ] Zero console errors after the full walk.
- [ ] Zero unresponsive widgets (no clicks that do nothing).

### 3.3 Brownfield demo -- `example-v20-full.php`

- [ ] `v20-panel` is visible top-right after page load.
- [ ] Click "describe_v2" -- panel shows valid JSON output.
- [ ] Click "validate_global_v2" -- panel shows findings
      (or "0 findings, OK").
- [ ] Click each of the 6 buttons in the v20-panel -- all
      emit `nac:action:succeeded` (visible in console if
      listener attached).
- [ ] istrusted_fake button -- ack DOES NOT fire (the
      runtime correctly rejects synthetic clicks for
      isTrusted-gated verbs).
- [ ] istrusted_real button (real human click) -- ack DOES
      fire.

### 3.4 Primitives showcase -- `example-v20-primitives-showcase.php`

- [ ] Each of the 8 primitives renders a section with a
      working example.
- [ ] The didactic copy in each section reads correctly
      (no garbled placeholders).

### 3.5 Data-table demo -- `example-v21-data-table.php`

- [ ] Press mic, say "agrega una linea con concepto leche
      cantidad 2 precio 100" -- a row appears in the
      collection table.
- [ ] Say "cuanto total hay?" -- the chat replies with a
      number, not the raw table.
- [ ] Say "ve a permisos" -- tab switches.

### 3.6 Interop demo -- `example-v22-interop.php`

- [ ] Already covered in 1.3 above.
- [ ] Bonus: open the page in two browser tabs, repeat the
      handshake -- it should still work across tabs (each
      tab is its own NAC instance, the interop layer is the
      bridge).

### 3.7 React study case -- `demos/react/`

- [ ] Open `https://yujin.app/nac-spec/demos/react/`.
- [ ] Type "leche" in the textbox, click "Add" -- todo
      appears.
- [ ] Open chat, say (via mic) "agrega pan" -- todo "pan"
      appears via the chat-driven path. This is the
      regression guard for case study bug #2.
- [ ] Say "borra leche" -- todo "leche" disappears.

### 3.8 Angular study case -- `demos/angular/`

- [ ] Same 4 checks as React, on
      `/nac-spec/demos/angular/`.

---

## 4. Documentation

For each of the docs below, read end-to-end at least once per
quarterly release. Check:

- The version stamp is current (v2.2).
- No broken internal links.
- No dangling TODOs.
- The code snippets compile / run as shown.

- [ ] `SPEC.md` (canonical contract).
- [ ] `ABOUT.md`.
- [ ] `CONTRIBUTING.md`.
- [ ] `SECURITY.md` -- plus quarterly threat model re-read.
- [ ] `README_DEMOS.md`.
- [ ] `docs/NAC_V22_ROADMAP.md`.
- [ ] `docs/NAC_TEST_MANUAL.md`.
- [ ] `docs/NAC_INTEROP_MCP.md`.
- [ ] `docs/NAC_LAUNCH_DIFFUSION.md`.
- [ ] `docs/CASE_STUDIES_DISCOVERY.md`.
- [ ] `docs/TEST_COVERAGE_MATRIX.md` (this matrix is the
      sibling).
- [ ] `docs/VOICE_CHAT_ERROR_ANALYSIS_2026_05_09.md`.

---

## 5. Adoption guides

For each guide, verify the hello-world snippet still compiles
and the steps lead a fresh reader to a working install:

- [ ] `guides/REACT.md` -- snippet compiles on Vite + React 18.
- [ ] `guides/ANGULAR.md` -- snippet compiles on Angular 17
      standalone.
- [ ] `guides/LLM_WIRING.md` -- the Node reference backend boots
      and the example contract test passes.
- [ ] `guides/AI_PLAYBOOK_NEW_PROJECT.md` -- step assertions
      still match the runtime API.
- [ ] `guides/AI_PLAYBOOK_MIGRATION.md` -- same.
- [ ] `guides/IMPACT_TESTING.md` -- numbers re-read for
      currency (recheck per quarter).
- [ ] `guides/IMPACT_RPA.md` -- same.
- [ ] `guides/RPA_UIPATH.md` -- run `InvoiceFromCSV.xaml`
      sample once (or its equivalent in the latest UiPath
      Studio).
- [ ] `guides/RPA_AUTOMATION_ANYWHERE.md` -- equivalent
      sample workflow.
- [ ] `guides/RPA_BLUE_PRISM.md` -- equivalent sample object
      study.

---

## 6. Test suites

- [ ] Run `bash tools/nac/test-launch.sh` -- ALL GREEN in
      under 15s.
- [ ] Inspect the smoke counter (`36 PASS`) -- matches
      expected total.
- [ ] Open `packages/nac/test/fixtures/voice/` -- pick 1
      file per locale (10 files total) -- play in audio
      player -- audible + intelligible.
- [ ] Spot-check 2 random LLM prompts from
      `stage3-backend.mjs` -- responses make sense, no
      drift.
- [ ] Run Playwright suite with `--headed` once
      (`npx playwright test --headed`) -- eyeball each
      spec's UI as it runs.
- [ ] Run `bash tools/nac/discovery-loop.sh 1` -- one round
      completes with 0 findings.

---

## 7. Study case packages

- [ ] `packages/nac-react-demo/` builds clean
      (`npm run build`).
- [ ] Deployed React dist behaves identically to the local
      build.
- [ ] `packages/nac-angular-demo/` builds clean.
- [ ] Deployed Angular dist behaves identically.

---

## 8. Cross-cutting

### 8.1 i18n

- [ ] Pick one locale (rotate per release) -- send to a
      native speaker for spot-check of 10 random strings.
- [ ] Validator confirms 0 missing keys across all 10
      locales (`NAC.validate_global({locale: 'all'})`).

### 8.2 HMAC + provenance

- [ ] Run the multi-tenant smoke against the staging
      tenant -- manifest signing verifies, no
      `provenance_mismatch` errors in logs.

### 8.3 isTrusted gating

- [ ] On `example-v20-full.php`, the istrusted_real vs
      istrusted_fake side-by-side test (covered in 3.3
      above) PASSES the visual diff: real fires ack, fake
      does not.

### 8.4 Cross-origin interop (v2.3 preview)

- [ ] At least ONE cross-origin test before declaring v2.3
      GA: open the interop demo against a remote NAC3 peer
      hosted on a different origin, real bearer token, real
      CORS preflight. Roundtrip succeeds.

### 8.5 Deployment

- [ ] After the release push, curl these URLs and confirm
      200 + correct content:
      - `https://yujin.app/nac-spec/index.html`
      - `https://yujin.app/nac-spec/SPEC.md`
      - `https://yujin.app/nac-spec/js/nac.js`
      - `https://yujin.app/nac-spec/js/nac-chat-client.js`
      - `https://yujin.app/nac-spec/example.php`
      - `https://yujin.app/nac-spec/example-v21-data-table.php`
      - `https://yujin.app/nac-spec/example-v22-interop.php`
      - `https://yujin.app/nac-spec/demos/react/`
      - `https://yujin.app/nac-spec/demos/angular/`

### 8.6 Real audio

- [ ] Real hardware (laptop mic + speaker) -- press mic on
      the live `example-v21-data-table.php`, speak one
      prompt per locale (10 prompts total) -- LLM dispatch
      makes sense in every locale.

---

## 9. Screen reader pass (accessibility -- Track G7)

This section walks the demos with a screen reader prompted +
the monitor turned off (or eyes literally closed). It is the
gate for accessibility commitment in
[ACCESSIBILITY.md](ACCESSIBILITY.md).

Do this section on at least TWO screen readers per release
(NVDA is the easiest entry on Windows; VoiceOver is
pre-installed on macOS; JAWS if you have a license).

### 9.1 NVDA (Windows)

- [ ] Install NVDA (free, nvaccess.org). Launch with
      Ctrl+Alt+N.
- [ ] Open `https://yujin.app/nac-spec/index.html` with the
      monitor off (or eyes closed).
- [ ] NVDA announces the page title + a structured outline
      of headings (h1, h2, h3) when navigating with H key.
- [ ] Tab key reaches every interactive control in a
      logical order; each control announces its role +
      label clearly.
- [ ] Open the chat panel (NVDA reads the chat input has
      role=textbox with a clear label).
- [ ] Type "que es NAC3?" + send -- NVDA reads the response
      in full when it arrives.

### 9.2 NVDA on `example-v21-data-table.php`

- [ ] NVDA announces "Lines (collection) tab" + the
      Permissions tab on Tab navigation.
- [ ] Activating a tab announces the new state via the
      `nac:tab:activated` event ack.
- [ ] When the LLM adds a row, NVDA reads the new row
      content unprompted (or with a single Down arrow).

### 9.3 VoiceOver (macOS)

- [ ] Cmd+F5 to start VoiceOver.
- [ ] Open `https://yujin.app/nac-spec/index.html`.
- [ ] VO+U opens the rotor; verify headings, links, form
      controls are populated.
- [ ] VO+A reads the entire page top-to-bottom -- it makes
      semantic sense, not "div div div link link button".

### 9.4 VoiceOver on the React + Angular study cases

- [ ] On `demos/react/`: add a todo via the input field
      using only the keyboard + VoiceOver. The new todo is
      announced when added (the ack event is wired).
- [ ] On `demos/angular/`: same test, same expectation.

### 9.5 Keyboard-only navigation (no screen reader, just no
mouse)

- [ ] Disconnect/disable the mouse.
- [ ] Walk the landing page via Tab key only. Every focus
      stop is visible (focus ring present).
- [ ] Open the chat panel via keyboard, type a prompt,
      submit. Result narrates / displays correctly.
- [ ] Escape closes any modal that opened.
- [ ] No keyboard traps (Tab eventually cycles back to the
      top).

### 9.6 High contrast + 200% zoom

- [ ] Browser zoom to 200% on the landing. Layout does NOT
      break, no horizontal scroll, no overlapping text.
- [ ] Windows high contrast mode (or macOS Increase
      Contrast). Buttons, links, focus rings remain
      visible.

### 9.7 Voice control (the recursive case)

- [ ] On a Pilot-equipped browser (or using the reference
      `nac-chat-client.js` mic button), control the demos
      by voice only.
- [ ] Mic button announces its state to NVDA/VoiceOver
      ("recording started", "recording stopped").
- [ ] Voice commands dispatched via NAC3 take effect; the
      ack is announced to the screen reader.

### 9.8 Accessibility issues found

List any issues found in this section here, with severity:

```
-
-
-
```

If any BLOCKER-severity issue is open, the release does NOT
ship until resolved.

---

## SIGN-OFF

```
Release tag:    v____._.___
Walked by:      ______________________
Walked on:      ____-____-____
Browsers used:  [ ] Chrome  [ ] Firefox  [ ] Safari
Native speakers consulted (locale -> name):
   ____________________________________________
Total items walked:  ___ / ___
Failed items (list with bug links):
   ____________________________________________
   ____________________________________________
Signature:      ______________________
```

Commit this file with the SIGN-OFF block populated to mark the
release as "human OK".

---

## See also

- [TEST_COVERAGE_MATRIX.md](TEST_COVERAGE_MATRIX.md) -- the
  matrix this checklist derives from.
- [NAC_TEST_MANUAL.md](NAC_TEST_MANUAL.md) -- the upstream
  playbook for adopters.
- [COVERAGE_REPORT_2026_05_10.md](COVERAGE_REPORT_2026_05_10.md)
  -- the auto coverage record for the current release.

## License

Apache-2.0.
