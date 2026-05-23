# NAC3 v2.3.0 stable -- release plan

**Owner:** Pablo Kuschnirof
**Author:** Sumi (Claude Opus 4.7)
**Started:** 2026-05-13
**Target ship:** **2026-05-14** (launch day -- single Sumi day, code-bound).

This doc is the single source of truth for what has to happen to
drop the `-alpha` from `@nac3/runtime@2.3.0` and call it stable.
Items get crossed out as they ship; we do not delete them, so the
history of the cut is visible after the fact.

---

## Current state (snapshot 2026-05-13)

- **Runtime:** `@nac3/runtime@2.3.0-alpha.2` published to npm
  + served on `https://yujin.app/nac-spec/` and via unpkg.
- **Reference adopter:** Atlas Pro voice ad
  (`yujin.app/nac-spec/ads-demo/atlas-pro/`) declares
  `verb:'utter'` + `payload_schema` on `atlas_pro_ad.mic`.
- **Tests green:**
  - Node-level: smoke + stage1..6b + v22 + v23-invoke (23/23) +
    v23-editor (8/8) + v23-interop (14/14).
  - Live Playwright: `atlas-pro-v23-utter-e2e.mjs` 16/16
    GREEN against the live deploy. `NAC.utter` resolves with
    full ack (plugin, action_id, verb, request_id, slots).
    Multi-language video pipeline produced en/es/zh mp4s.
- **What's missing for stable:** see priority tiers below.

---

## Framing decision

**v2.3 ships as a stable release with EXTRA features bundled
beyond the alpha.2 cut.** Reasons:

1. `NAC.invoke` + `NAC.utter` are the headline contract and they
   are already live + tested + adopted.
2. ABOUT.md line 75 had three items pre-declared for v2.3:
   STRICT_VALIDATION flip, bindTab companion, optional
   streaming chat. We close the first two, defer streaming.
3. Pablo requested **open Shadow DOM** support inside the v2.3
   cut (2026-05-13). Adding it now keeps the v2.3 story
   coherent ("v2.3 = NAC3 ready for the web component era").

We do **not** bundle anything else that is not pre-declared.
Items beyond the list below go to v2.4 in `ROADMAP.md`.

---

## Scope of v2.3 stable (everything that goes in)

### Headline -- already in alpha.2

- `NAC.invoke(action_id, payload, opts?)` -- payload-bearing
  action. Dispatches `nac:action:requested`, awaits
  `nac:action:succeeded` / `:failed` with the same
  `request_id`. Default timeout 30 s.
- `NAC.utter(action_id, {text, lang?, voice?})` -- ergonomic
  shortcut for `verb:'utter'`.
- Hotfix from alpha.2: `invoke` no longer rejects with
  `code='disabled'` on `disabled`/`aria-disabled` elements;
  click-style `NAC.click` still does.
- Informational `payload_schema` on manifest entries (does NOT
  enforce in 2.3; enforcement is a v2.4 candidate).

### New for v2.3 final (this cut)

| # | Feature | Status | Effort (Sumi-time) |
|---|---------|--------|--------------------|
| F1 | **Open Shadow DOM resolution** (cap=10, NEW per Pablo 2026-05-13) | not started | LARGE ~12 min |
| F2 | **`NAC.bindTab(el, handler, ctx)` companion** | not started | MEDIUM ~5 min |
| F3 | **`STRICT_VALIDATION` default flips `true`** | not started | BRIEF ~3 min |
| F4 | **`edit_field` primitive GA** (preview shipped 2026-05-10) | spec text + e2e missing | MEDIUM ~5 min |
| F5 | **Pin-down test for alpha.2 disabled-guard fix** | not started | BRIEF ~3 min |
| F6 | **Closed Shadow DOM exposure API** (NEW per Pablo 2026-05-13) | not started | MEDIUM ~7 min |
| D1 | **Demo: Open Shadow DOM** (web component + NAC.click cruzando boundaries) | not started | MEDIUM ~5 min |
| D2 | **Demo: Closed Shadow DOM** (web component implements `el.nac3` interface) | not started | MEDIUM ~5 min |
| M1 | **Manual: open shadow DOM authoring guide** | not started | BRIEF ~3 min |
| M2 | **Manual: closed shadow DOM exposure guide** | not started | BRIEF ~3 min |

### F1 -- Open Shadow DOM resolution (NEW)

**Problem.** Today every `_findById` / `_resolveId` helper uses
`document.querySelector('[data-nac-id="..."]')`. Web Components
that mount inside an open `shadowRoot` are invisible to NAC3
runtime calls, even though their `data-nac-*` attributes are
correctly authored. Adopter pain: any React/Vue/Lit/Svelte
project that uses shadow-rooted components (popovers, tooltips,
custom modals) cannot be driven by an external agent today.

**Solution.**

1. Introduce a single `_deepQuery(selector, opts?)` helper that:
   - Starts at `document` (or a supplied root).
   - Tries `root.querySelector(selector)` first; returns hit.
   - If no hit, walks every element with `.shadowRoot` (i.e.
     open shadow roots only) recursively.
   - Default max depth: 6 levels (matches v1.6.x precedent).
   - Optionally returns the path for debugging
     (`NAC.describe('id')` already returns location info).

2. Replace `document.querySelector('[data-nac-id="..."]')` at
   the ~12 call sites that resolve by id with `_deepQuery(...)`.

3. Manifest hint (informative, not required):
   ```
   { id: 'my_plugin.popover', role:'action', shadow_host:true }
   ```
   When set, the runtime accepts that the element lives inside
   a shadow root and does not warn about visibility checks
   that legitimately fail.

4. Closed shadow roots remain **explicitly out of scope** (same
   stance as v1.6.x). When a closed shadow root is encountered,
   the runtime emits `nac:shadow_blocked` once per host so
   adopters know they need to bridge it via a public method.

5. Events: `bubbles: true, composed: true` is already the
   default on every emitted CustomEvent (verified at
   `nac.js` line 3487). So once an event fires inside a
   shadow root, it correctly crosses the boundary. No change
   needed.

**Test plan.** New `packages/nac/test/v23-shadow.mjs`:
- T1: open shadowRoot 1-level, `NAC.click` resolves.
- T2: open shadowRoot 3-levels nested, `NAC.fill` resolves.
- T3: 7-levels nested -> graceful not_found (depth cap).
- T4: closed shadowRoot -> `nac:shadow_blocked` emitted once.
- T5: action inside shadow root emits succeed event that
      bubbles up to `document` (composed=true verification).
- T6: `NAC.utter` on element inside shadow root works
      end-to-end (covers the convergence of F1 + invoke).

**Spec text.** New SPEC.md section 5.1.5 -- "Shadow DOM scope".
States: open roots resolved depth=6; closed roots emit
`nac:shadow_blocked`; manifest opt-in `shadow_host:true` hint;
events use composed:true by default.

### F2 -- `NAC.bindTab` companion

Mirror of `NAC.bindAction`, but for tab widgets. Bakes the
`nac:tab:activated` contract into the runtime so adopters
stop hand-emitting it.

```ts
NAC.bindTab(el, handler, ctx?): unbinder
```

`handler` receives `(tab_id, ctx)` and returns void / Promise.
Runtime emits `nac:tab:activated` on resolve and
`nac:tab:activation_failed` on throw.

**Test.** Extend `packages/nac/test/v22.mjs` (the bindAction
test fixture is mirror-shaped).

### F3 -- `STRICT_VALIDATION` default = `true`

Today `NAC.STRICT_VALIDATION = false` -- the validator warns
on drift findings but does not throw. ABOUT.md line 76 had
this flip pre-declared for v2.3.

**Decision needed from Pablo:** does this go in? It is a
behavioural change visible to anyone who registers a manifest
with drift findings. Mitigation: every demo + Atlas Pro
registers without drift findings, so internal projects survive.
External adopters get a clean migration note in
`MIGRATION_v2.2_to_v2.3.md`.

**Default proposal: YES, flip it.** Without this, the
spec promise from ABOUT.md drifts forever. We can add
`NAC.STRICT_VALIDATION = false` opt-out at the top of an
adopter's bootstrap if they need a window.

### F4 -- `edit_field` GA

Preview shipped 2026-05-10 (runtime + demo + 8/8 unit tests).
What is missing for GA:

- Native-locale label review for ja/zh/ar/hi (~2 hrs).
- One Playwright spec opening the editor on the live demo
  (`example-v23-editor.php`).
- Spec text in SPEC.md sec 13.

### F5 -- Pin-down test for alpha.2 disabled-guard fix

The alpha.2 hotfix relaxed `NAC.invoke` so it no longer rejects
on `disabled` / `aria-disabled` elements. Today no test pins
that behaviour, so it can regress silently.

**Test.** Add to `packages/nac/test/v23-invoke.mjs`:
- T7: element with `disabled` set -> invoke resolves
  (host receives request).
- T8: element with `aria-disabled='true'` -> invoke resolves.
- T9: same element, `NAC.click` -> rejects with
  `code='disabled'` (click semantics preserved).

### F6 -- Closed Shadow DOM exposure API

**Problem.** Closed shadow roots are opaque by browser security
design. NAC3 cannot reach into them. Today every component lib
that uses closed shadow DOM (Salesforce Lightning, some GitHub
Primer components, design systems) is invisible to NAC3 callers.

**Solution.** NAC3 v2.3 SPEC sec 5.1.6 defines a voluntary
contract that closed-shadow component authors MAY implement to
become NAC3-operable. NAC3 ships the consumer; the producer
opts in.

**Contract.**

```ts
// On the host element of a closed shadow root, the component MAY
// expose a `nac3` interface object:
interface NAC3HostInterface {
  query(selector: string): Element | null;        // MANDATORY
  queryAll(selector: string): Element[];          // RECOMMENDED
  describe?(): Array<{                            // OPTIONAL
    id: string;
    role: string;
    action?: string;
    label?: string;
  }>;
}

// Producer side:
class MyClosedComponent extends HTMLElement {
  constructor() {
    super();
    this._shadow = this.attachShadow({ mode: 'closed' });
  }
  get nac3() {
    return {
      query:    (sel) => this._shadow.querySelector(sel),
      queryAll: (sel) => [...this._shadow.querySelectorAll(sel)],
      describe: () => this._enumNacChildren(),
    };
  }
}
```

**Runtime behaviour (consumer side).** Inside `_deepQuery`, after
walking open shadow roots and finding nothing, the runtime
enumerates every element under the current root whose
`shadowRoot === null` AND `typeof el.nac3 === 'object'`, and
delegates to `el.nac3.query(selector)`. The first non-null hit
is the resolution.

**Error handling (frozen per Pablo decision 2026-05-13).**

| Condition | Runtime behaviour |
|-----------|-------------------|
| `el.nac3.query` throws | emit `nac:shadow_blocked` with `detail.reason='exposure_threw'`, host included in detail. Once-per-host. Skip + continue. |
| `el.nac3.query` returns non-Element shape (string, plain obj, etc.) | emit `nac:shadow_protocol_violation` with offending value snapshot. Skip + continue. |
| `el.shadowRoot === null` AND `el.nac3` not defined | emit `nac:shadow_blocked` with `detail.reason='not_exposed'`. Once-per-host. (Original closed-shadow default.) |
| `el.nac3.query` returns valid Element | resolved. Returned to caller. No event. |

**Why these defaults:**
- `nac3` as getter property (Decision C in design memo) -- groups
  the verbs, leaves room for `nac3.invoke`, `nac3.observe`, etc
  in v2.4 without API churn.
- `query` mandatory but `describe` optional -- minimal viable
  contract; describe is the fast path.
- Both `shadow_blocked` reasons are once-per-host (use a WeakSet
  to track emitted hosts per page).

**Test plan.** New `packages/nac/test/v23-shadow-closed.mjs`:
- T1: component with `el.nac3.query` -> `NAC.click` resolves.
- T2: component with `el.nac3` but `query` throws -> emits
  `nac:shadow_blocked` with `reason='exposure_threw'`.
- T3: component with `el.nac3.query` returning string ->
  `nac:shadow_protocol_violation`.
- T4: component with closed root and no `nac3` interface ->
  `nac:shadow_blocked` with `reason='not_exposed'`, emitted
  ONCE on first resolve attempt, NOT re-emitted on subsequent
  resolves against same host.
- T5: `describe()` fast path returns array, `NAC.find` uses it.

**Spec text.** New SPEC.md sec 5.1.6 -- "Closed Shadow DOM
exposure API (voluntary)".

### D1 -- Demo: open shadow DOM web component + NAC3

A minimal demo at `yujin.app/nac-spec/example-v23-shadow-open.php`
or `.html`:
- Page declares a `<my-todo-card>` web component using
  `attachShadow({mode:'open'})`.
- Inside the shadow root, the component renders 2-3
  `[data-nac-id]` elements (a checkbox + a delete button).
- Page-level UI button "Toggle first todo via NAC" wires
  `NAC.click('my_card.toggle')` and observes the result.
- Live demo proves: external runtime sees inside open shadow,
  events bubble up via `composed:true`, no glue required.

### D2 -- Demo: closed shadow DOM with `el.nac3` exposure

Twin demo at `example-v23-shadow-closed.php` (or .html):
- Same `<my-todo-card>` but `attachShadow({mode:'closed'})`.
- Component implements `get nac3()` returning the interface
  from sec 5.1.6.
- Same external test ("Toggle first todo via NAC") succeeds.
- Companion negative example: a `<no-expose-card>` with closed
  shadow and NO `nac3` getter; page logs the `nac:shadow_blocked`
  event so visitor sees the error path.

### M1 -- Manual: open shadow DOM authoring guide

New `yujin.app/nac-spec/guides/SHADOW_DOM_OPEN.md` (~150-200
lines):
- When you use open shadow DOM with NAC3.
- The 3 things you need: `data-nac-*` attrs on shadow children,
  `attachShadow({mode:'open'})`, events with `composed:true`.
- Common gotchas (styling crossing shadow boundary; slotted
  content; `:host` selectors with NAC3).
- Code patterns for Lit, vanilla, Stencil.
- Migration: existing components that already use open shadow
  need zero changes -- NAC3 v2.3 just walks them.

### M2 -- Manual: closed shadow DOM exposure guide

New `yujin.app/nac-spec/guides/SHADOW_DOM_CLOSED.md` (~200-250
lines):
- Why closed shadow exists (security boundary, opinionated
  isolation).
- The voluntary contract: `get nac3()` returning the interface.
- Mandatory vs recommended vs optional method semantics.
- Error contract: `nac:shadow_blocked` and
  `nac:shadow_protocol_violation` codes.
- Worked example: a `<corp-modal>` from a design system,
  closed shadow, NAC3-exposed.
- When to use closed-with-exposure vs open: 3-bullet decision
  tree.
- Anti-patterns: leaking internal state, exposing more than
  needed, throwing from `query`.

---

## Deferred to v2.4

- Optional streaming chat dispatch (ABOUT.md mentioned but
  big surface; defer for focus).
- `payload_schema` enforcement (today informational; runtime
  validates declared shape against actual payload in 2.4).
- Closed shadow root bridging primitive.
- `NAC.invoke` ack with structured response data beyond slots
  dict (today free-form; spec a vocabulary in 2.4).
- Cross-browser audit beyond Chromium (firefox/webkit
  Playwright passes -- check now, fix later if any break).

---

## Priority tiers + execution order

### P0 -- Blockers (no stable without these)

All P0/P1 decisions confirmed by Pablo 2026-05-13:
- F3 STRICT_VALIDATION: flip to true
- F1 shadow DOM cap: 10
- F1 closed shadow root default: emit nac:shadow_blocked once per host
- F6 closed shadow API: ship with `el.nac3` interface
- Adopters: BOTH React and Angular demos

1. **F5** -- Pin-down test for alpha.2 hotfix (defense).
2. **F1** -- Shadow DOM open: helper + 12 callsite refactors +
   `v23-shadow.mjs` tests + SPEC.md sec 5.1.5. Cap=10.
3. **F6** -- Closed shadow DOM exposure API + tests + SPEC.md sec 5.1.6.
4. **F3** -- STRICT_VALIDATION default flip to true.
5. **F2** -- NAC.bindTab companion.
6. **F4** -- edit_field GA polish.
7. **D1** -- Demo open shadow DOM.
8. **D2** -- Demo closed shadow DOM with exposure.
9. **M1** -- Manual open shadow DOM.
10. **M2** -- Manual closed shadow DOM exposure.
11. **Bump runtime** -- `package.json` 2.3.0-alpha.2 -> 2.3.0;
    `nac.js` global `NAC.version`; `nac.d.ts` types.
12. **CHANGELOG.md** -- consolidated `## 2.3.0 -- 2026-05-13`
    entry that supersedes the alpha.1+alpha.2 fragmenting.
13. **SPEC.md** -- sec 5.1.4 final wording (invoke/utter) +
    sec 5.1.5 (shadow DOM open) + sec 5.1.6 (closed exposure) +
    edit_field promotion in sec 13.
14. **ABOUT.md** -- bump status from "v2.2 stable + v2.3 alpha"
    to "v2.3.0 stable".

### P1 -- Stable quality (what a reviewer asks for)

7. **F2** -- `NAC.bindTab` companion + tests.
8. **F4** -- `edit_field` GA polish (locale review + 1 spec
   + spec text).
9. **Multi-language live utter** -- extend
   `atlas-pro-v23-utter-e2e.mjs` so it covers `es` and `zh`
   in addition to `en`. Sanity for LANGUAGE LOCK + TTS path.
10. **Second adopter using invoke/utter** --
    `packages/nac-react-demo` registers a payload-bearing
    action (e.g. "agrega tomar agua" via `NAC.utter` instead
    of fill+click). Two reference impls, not one.
11. **`AUTHORING_PATTERNS.md`** -- new section "click vs
    invoke decision tree".
12. **`MIGRATION_v2.2_to_v2.3.md`** -- one page: additive
    bits + STRICT_VALIDATION note.

### P2 -- Signal (suma confianza, no bloquea)

13. **Cross-browser** -- run the live e2e against Firefox +
    WebKit Playwright. Document any limitation.
14. **`NAC_v20_ROADMAP_ACTIONABLE.md`** -- mark `invoke`,
    `utter`, `edit_field`, `bindTab`, shadow DOM as DONE.
15. **Discord KB rebuild** --
    `tools/discord-setup/worker/nac3-knowledge.generated.mjs`
    regenerated with v2.3 stable strings.
16. **Landing yujin.app** -- copy bump to "v2.3.0 -- stable".

### P3 -- Release engineering

17. **Git tag** `v2.3.0` + GitHub release notes.
18. **`RELEASE_v2.3.0.md`** in `nac-spec/` paralleling
    `RELEASE_v1.9.0.md`.
19. **`npm publish @nac3/runtime@2.3.0`** -- Pablo runs this;
    Sumi cannot. Pre-flight: `npm pack`, inspect tarball,
    `prepublishOnly` runs full test suite.
20. **Discord announcement** -- Pablo runs (community comms).

---

## Acceptance criteria for "stable" tag

When all of the following hold simultaneously, we tag v2.3.0:

- [ ] All P0 items closed.
- [ ] All P1 items closed.
- [ ] `npm test` in `packages/nac/` -- every suite green.
- [ ] `atlas-pro-e2e.mjs` baseline -- 14+/15 PASS (the
      two LLM-stochastic items get a one-retry budget).
- [ ] `atlas-pro-v23-utter-e2e.mjs` -- 16/16 PASS in
      Chromium + Firefox + WebKit.
- [ ] `v23-shadow.mjs` -- 6/6 PASS.
- [ ] SPEC.md sec 5.1.4 + 5.1.5 + sec 13 (edit_field)
      complete.
- [ ] CHANGELOG.md has a non-alpha `2.3.0` entry.
- [ ] At least 2 reference adopters use invoke/utter
      (Atlas Pro + react-demo).
- [ ] No `-alpha` / `-beta` / `-rc` string anywhere in
      `package.json` / `nac.js` / docs that mention the
      current shipping version.

---

## Open questions for Pablo

1. **F3 STRICT_VALIDATION flip** -- yes / no / defer-to-2.4?
2. **Shadow DOM depth cap** -- 6 (v1.6.x precedent) or 10
   (more permissive; some component libs nest deep)?
3. **Closed shadow root behaviour** -- emit
   `nac:shadow_blocked` once per host (current proposal) or
   silently skip (less noisy, also less debuggable)?
4. **Second adopter for invoke** -- react-demo (simpler) vs
   angular-demo (Pablo has been using Angular cases)?
5. **Cross-browser scope** -- block stable on firefox/webkit
   passing or document-and-ship?

---

## Where to find the work as it lands

- All commits on `main`, no feature branch.
- Each P0/P1 item -> one focused commit with the item's #
  in the subject line (e.g. `feat(v2.3): F1 open shadow DOM
  resolution`).
- This doc updates inline: completed items get `[done]` tag
  + commit SHA next to them.

---

*Last revision: 2026-05-13, generated by Sumi for Pablo.*
