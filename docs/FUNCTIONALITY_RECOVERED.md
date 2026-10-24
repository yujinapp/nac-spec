# FUNCTIONALITY RECOVERED -- what this system does, for the person who uses it

Station N0, Urazuke. Date: 2026-10-24.
Reconstructed **from the code and from running it**, not from the marketing copy.
Every statement that is a deduction rather than a direct reading is marked `[INF]`.
Where a claim was checked by running it, the check is named in
`docs/EVIDENCE_N0.md`.

---

## PART A -- The three sentences that explain the product

1. You take a web application that already exists and you **label its
   interface**: each button, field, table and panel declares what it is, what it
   does, what state it is in and what it belongs to.
2. From those labels the system produces a **description of the screen** that a
   person can speak to and an AI assistant can act on: "open invoice 12", "set
   the quantity to four", "save".
3. The assistant does not guess coordinates and does not take screenshots. It
   answers with **one action over one labelled element**, the page executes it,
   and the system writes down what happened.

Everything else in the system is support for those three sentences: the
specification that says how to label, the runtime that reads the labels, the
extension layers that cover tables, editors, plugins and multi-page navigation,
and a public site that proves the whole thing works.

## PART B -- Who uses it

| Actor | What they want | Where they enter |
|---|---|---|
| **Adopter** (development team with an existing app) | make their app voice/agent-operable without rewriting it | `SPEC.md`, `runtime/`, React and Angular guides |
| **End user of an adopter's app** | speak to the app instead of hunting for the control | the chat or voice panel inside the app |
| **Visitor of the public site** | understand what NAC is, see it working, decide whether to try it | `https://yujin.app/nac-spec/` |
| **Tester of the programme** | run a checklist against a demo and report the result | the tester pages under `docs/` |
| **Buyer** | purchase Forge or Pilot, or join the waitlist | the commercial section of the site |

## PART C -- The processes, one by one

### P-01. An adopter makes an existing screen operable

*Who:* adopter. *Where:* their own app.

1. They add `data-nac-plugin` to each region of the page that should be visible
   to an assistant (a card, a panel, a form).
2. On every interactive element they add `data-nac-id` (a stable name), and
   `data-nac-role` (button, field, table, modal, tab...), plus the attributes
   the role needs: `data-nac-action`, `data-nac-state`, `data-nac-target`,
   `data-nac-hint`.
3. They load the runtime. The page does not change visually. `[INF]` this is the
   point the project sells: annotating is a data change, not a rewrite -- the
   demos keep an identical layout between the annotated and non-annotated
   versions.
4. They call `NAC.describe()` and receive the description of the screen: the
   plugins, the elements with their roles, states, visibility, labels, values,
   groups and the relationships between them.

*Verified:* the fourteen reference demos publish a manifest this way; on those
pages every reported element resolves to a real DOM node.

### P-02. A user operates the app by speaking

*Who:* end user. *Where:* the chat/voice panel of an adopter's app.

1. The user says what they want, in their own words.
2. The page sends the **description of the current screen** plus the user's
   words to a chat intermediary.
3. The intermediary returns a structured answer: either one concrete action
   (click element X, set field Y to value Z, choose row N) or a request for
   clarification.
4. The runtime executes the action against the page, records it in the audit
   log, and the screen changes exactly as if the user had done it by hand.
5. If the sentence matches more than one element, the system does **not** pick
   one: it raises a disambiguation request and offers the candidates
   (`err.candidates`). This is an explicit design rule against silent damage.

*Verified in part:* the executing half (action -> state change -> audit line) is
proven by the end-to-end test. The understanding half depends on the external
intermediary and **cannot be exercised in this environment**.

### P-03. A table becomes editable by conversation

*Who:* end user of an app that has a data table (invoices, orders, price lists).

1. The table is registered with its columns, each column declaring whether it is
   editable, computed or read-only, its type, and which aggregate it feeds
   (sum, count, average).
2. The assistant receives the table's structure and a summary -- row count, the
   aggregates -- instead of the whole table. `[INF]` this is what keeps the
   description small enough to be cheap.
3. The user says "add a line", "set the quantity to four", "remove the third
   line". The runtime applies the change to its state, recomputes the computed
   columns, updates the on-screen aggregate and marks the table as modified.
4. The user says "save". The table emits a commit event with the difference
   between the state before and after, and stops being marked as modified.

*Verified:* the whole flow -- open, add line, edit quantity, reject edit of a
non-editable column, reject edit of a computed column, save with audit line --
runs green in a real browser. The commit is **in memory**: nothing is written to
a server, because the demo has no server.

### P-04. The user edits text in place

*Who:* end user. *Where:* `example-v23-editor.php`.

A Word-style field editor: the assistant can read the text, the selection and
the formatting state, select a range, replace it, apply formatting, and undo or
redo. The point is that an assistant can correct a paragraph without taking the
whole document away from the user.

*Verified:* the page loads and publishes its elements; the editing verbs are
present in the runtime.

### P-05. The app lives across pages and inside shadow DOM

Two related capabilities:

* **Cross-page scope:** the naming of elements carries the page, so an assistant
  can be told "go to page B and do X" and the runtime resolves which page it is
  on.
* **Shadow roots:** the runtime can see into open shadow roots, and into closed
  ones **only if the component voluntarily exposes them**. `[INF]` this is a
  deliberate security stance: encapsulation is respected by default.

*Verified:* the two-page pair and both shadow demos load and publish manifests.

### P-06. Several apps talk to each other

*Who:* adopter with more than one NAC-enabled application.

App A can ask app B to perform an action, through a routing layer, and receives
the result back. `[INF]` the intended use is a suite of internal tools that
behave as one surface for the assistant.

*Verified:* `example-v22-interop.php` loads with its elements exposed.

### P-07. The UI is protected by authority levels and time-boxed elevation

*Who:* adopter with sensitive actions (payments, deletions, configuration).

1. Each element can declare an authority level.
2. A normal agent action on a protected element is refused.
3. A **sudo elevation** can be granted for a bounded window, after which the
   privilege expires by itself.

*Verified:* `demos/v24-05-authority-sudo/` exists and loads.

### P-08. Plugins extend the contract without breaking it

*Who:* adopter with their own widget library.

A widget library can register itself as a NAC plugin: it declares its slug, its
elements and its extension points, and re-registering the same plugin is
idempotent. Two plugins cannot share a slug: uniqueness is enforced and reported
as an error instead of silently overwriting.

*Verified:* the two v2.4 plugin demos load.

### P-09. Snapshots and conflicting edits

*Who:* adopter with concurrent users.

The description of a screen carries a version. If the user changed the page
between the moment the assistant read it and the moment it acted, the runtime
detects the drift and refuses the action instead of applying it to a page that
has moved. `[INF]` this is optimistic concurrency control applied to UI state.

*Verified:* `demos/v24-04-snapshot-versioning/` loads.

### P-10. The assistant can navigate a tree instead of reading everything

*Who:* end user of a large application.

Instead of receiving the whole page, the assistant receives a **tree** and can
walk it: `context` tells it where it is, `tree` gives it the children of the
current node. On a big screen this is the difference between an affordable
description and an impossible one.

*Verified:* `demos/v25-02-tree-nav/` loads.

### P-11. The system narrates what it is doing, out loud

*Who:* end user who is listening rather than looking (accessibility, driving,
hands busy).

Each element can carry an assistive label. The runtime reads the screen aloud --
what it is, what state it is in, what can be done with it -- and after an action
it narrates the result. `[INF]` this is the accessibility half of the product
and the reason the demos carry audio hooks.

*Verified:* `demos/v25-03-narrate/` loads; the runtime exposes the narration
verbs.

### P-12. Effects can be asserted (this is what makes it testable)

Because every element has a name and every action has an observable result, the
runtime offers `expect` and `diff`: a test -- or an agent -- can assert "after
this action, this element has this state", and get a diff when it does not. This
is the mechanism that turns "does it work?" from a human judgement into a check
that runs by itself.

*Verified:* `demos/v25-04-expect-diff/` loads; the runtime exposes the verbs.

### P-13. A tester runs the programme

*Who:* tester. *Where:* the tester pages.

Three interactive checklists (visual, voice/chat, human-OK sign-off) walk the
tester through what to verify on each demo and record the verdicts. A report form
submits the result to the CRM, keeps a local draft if the network fails, and
falls back to an e-mail if the endpoint is unreachable. An admin page lists the
submitted reports.

*Verified:* all tester pages load; the report path has primary + sandbox
endpoints, localStorage draft and mailto fallback in the code.

### P-14. A visitor convinces themselves

*Who:* visitor. *Where:* the public site.

The site is not a brochure: it is an argument made of artefacts. In order down
the page:

1. **Six independent AI systems reviewed the contract** (peer reviews).
2. **A benchmark of 600 runs across 5 models and 3 protocols**, whose headline
   is the safety property: zero phantom selections.
3. **A migration of a real open-source application** (Conduit, 47 React
   components) done by the toolchain, with its cost and duration.
4. **One calculator decorated three ways**, showing how little code the
   annotation path costs.
5. **How small the runtime is.**
6. **Thirteen live demos** to try.
7. **Sites built with it.**
8. **The commercial layer** and its two products.
9. **For builders**, **use cases**, **case studies**, **why now**, **where it
   fits in the agent stack**, **governance**.

Every section is a separate, checkable page, and the landing itself is
NAC-enabled: you can chat with it and take a guided tour that narrates itself.

*Verified:* the landing boots two NAC plugins (`nac_landing`, `chat`), exposes
its elements, and every linked section answers 200.

## PART D -- Screen inventory

51 screens were loaded one by one and measured. Verdict legend:
**drivable** = the runtime publishes a manifest and every reported element is
addressable by `data-nac-id`; **static** = a document page with no runtime.

| Group | Screens | Drivable |
|---|---|---|
| Public site (landing, peer reviews, spec, about, security, contributing, demo index, benchmark x3) | 10 | 10 (all with runtime) |
| Case studies (Conduit, migration x3, four calculator demos) | 8 | 8 |
| Capability demos (React, Angular, v24 x4, v25 x4) | 10 | 10 |
| Adopter demos (`ads-demo`, `ads-demo/atlas-pro`) | 2 | 2 |
| Reference demos (13 `.php` pages) | 13 | 13 |
| Manuals and tester tools (checklists x3, admin, coverage matrix, test manual) | 6 | 6 |
| **Total** | **51** | **51 loaded, 27 publish a manifest; on those 27 the manifest is 100% addressable** |

The remaining 24 screens are documentation pages that never load the runtime;
they are readable but not drivable, which is correct for their purpose.

**The gap that matters:** 324 interactive elements across the swept screens carry
no `data-nac-id`. They concentrate on the documentation pages (search boxes,
language switchers, navigation links), but the number means the claim "every
element accessible" is true **of the annotated surface**, not of the whole site.

## PART E -- What the system does NOT do (read this before deciding)

1. **It is not an application server.** There is no backend in this repository:
   no database, no accounts, no sessions, no server-side persistence.
2. **It does not understand language by itself.** Understanding lives in the
   external chat intermediary. Without it, the system can execute actions but
   cannot interpret a sentence.
3. **It does not record what users do**, beyond an in-page audit log that is lost
   on reload.
4. **It does not persist the demo data.** The table commit is memory-only.
5. **It does not run offline as a voice product.** The voice path needs the
   browser's speech APIs `[INF]` and the understanding path needs the network.
6. **It does not guarantee that a third party's page is correctly annotated.**
   `validate_global_v2()` reports problems; it cannot fix them.
7. **It is alpha.** The version string is `2.5.0-alpha.5`, and the site says so.

## PART F -- Open points of understanding (honest list)

Things I could not fully understand from the code alone, in order of concern:

1. **The chat intermediary's contract.** The request/response shape between the
   page and `/crm/api/v1/yujin/nac-demo` is visible on the client side only; the
   server side is not in this repository, so the prompt strategy, the model
   routing and the cost per interaction cannot be read, only inferred.
2. **The five backend SDK adapter strategies** in the v2 layer: the code names
   them and selects one, but the reason for each strategy is only in the docs.
3. **The canonical hashing used for provenance (`_sha256Sync` and the HMAC
   path).** I read the call sites and the intent (signed descriptions), not the
   full security argument.
4. **The pilot bundles** (`pilot.bundle.js`, `example.js`, 375 KB each): they are
   generated artefacts; their source lives outside the readable path.
5. **Why five legacy stage scripts are excluded from the test gate** while being
   maintained: I found no written reason. `[INF]` they were superseded by the
   `runtime/test` suites.
6. **The deployment target's ownership**: the CI deploys over rsync to shared
   hosting; who holds the secrets and whether a restore is possible is outside
   the repository.

None of these blocks working with the code; items 1, 2 and 6 are the ones that
would slow a takeover down.
