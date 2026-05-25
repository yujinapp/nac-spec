# V25-01 canvas+API plugin extension demo

End-to-end live demo of NAC3 v2.5 RFC V25-01 against a fake "canvas+API"
target (the kind of surface where the host has NO DOM access to the
rendered content -- Collabora Online, Figma, Excalidraw, Miro, etc).

The demo is the **Layer 2** evidence for V25-01 promotion gate per
[PROJECT.md sec 3.1](../../PROJECT.md#3-test-bar).

---

## Files

```
demos/v25-canvas-api/
  index.html        host page; registers plugin, exercises 8 backends, logs provenance
  target.html       canvas+API mock (iframe-loaded); exposes postMessage RPC + same-origin SDK + DOM
  README.md         this file

scripts/
  run-demo-v25-canvas-api.mjs   Playwright headless runner that captures screenshots + run-log

evidence/v25-canvas-api/<YYYY-MM-DD>/
  01-initial.png ... 09-final.png   per-scenario screenshots
  run-log.txt                       human-readable run trace
  run-log.json                      machine-readable trace + full provenance
```

## What the demo exercises

The host page registers a single plugin `counter-canvas` with a manifest
that routes verbs / state / events through 6 of the 8 declared V25-01
backends. The 2 left out (`dom-mirror`, `synthetic-mutation`) are
DOM-rooted and only meaningful for host-side DOM, not iframe content --
they are covered by `runtime/test/stage8-plugin-extension.mjs` against
an in-host DOM fixture.

| Backend | Used for | Demo button | Layer 2 scenario |
|---|---|---|---|
| `postmessage` (verb) | `counter.increment`, `counter.highlight` | `pm-inc-1`, `pm-inc-5`, `pm-hl-on`, `pm-hl-off` | 2, 3, 7 |
| `sdk-call` (verb) | `counter.reset`, `counter.sdk-add` | `sdk-reset`, `sdk-inc-3` | 4, 5 |
| `script-bridge` (verb, RPC w/ reply) | `counter.fetch-state` | `bridge-getstate` | 6, 10 |
| `same-origin-window` (state) | `counter.value`, `counter.highlighted`, `counter.value-fallback` | `sow-value`, `sow-highlighted`, `fallback-read` | 7, 7b, 10 |
| `postmessage-listen` (event) | `counter.changed` | `sub-changed` | 8 |
| `synthetic-poll` (event) | `counter.derived` | `sub-derived` | 9 |

The high-complexity scenarios additionally test:

- **Fallback chain (7b):** a state declared with two bindings where the
  first targets a selector that does not exist. The runtime
  transparently falls through to the second binding; provenance
  records the *winning* backend, not the failing one.
- **Cross-backend transaction (10):** five verb calls across three
  different backends (`sdk-call` + `postmessage` + `script-bridge`)
  followed by reads via two backends. The script-bridge response is
  used as the read-after-write barrier -- its reply is processed by
  the iframe AFTER any pending postmessage, so it is the safe witness
  for canvas state.
- **Error contract (11):** every documented V25-01 error code surfaces
  through the same `NAC.call` / `NAC.read` paths -- `plugin_not_registered`,
  `verb_not_declared`, `state_unreadable` with `attempts[]` reporting.

## Running the demo locally

```bash
# from c:/yujin-nac-spec/
npm install                          # installs Playwright at project root
npx playwright install chromium      # one-time browser download

# terminal 1: serve repo root over http
python -m http.server 8855

# terminal 2: drive the demo, capture screenshots
node scripts/run-demo-v25-canvas-api.mjs
```

After the run, evidence lives at
`evidence/v25-canvas-api/<today's date>/`. The runner exits non-zero
if any assertion fails so it can wire directly into CI.

You can also open `http://localhost:8855/demos/v25-canvas-api/index.html`
in a browser and click through the buttons by hand -- the provenance
log on the right updates in real time.

## What this demo does NOT cover

- The two host-DOM backends (`dom-mirror`, `synthetic-mutation`).
  Covered by `runtime/test/stage8-plugin-extension.mjs` against a
  jsdom-style fixture. Listed here so anyone auditing the Layer 2
  surface for V25-01 knows where to find the missing pieces.

- V24-04 OCC contract on these verbs. The plugin manifest does not
  declare `expected_*` parameters; OCC enforcement on the plugin
  extension contract is a separate spec slice (and is covered today
  by `runtime/test/stage12-snapshot-versioning.mjs`).

- Authority + sudo elevation (V24-05). The verbs here are not gated.
  See `example-v24-disambiguation.php` for the v2.4 disambiguation
  surface and `runtime/test/stage10-authority-sudo.mjs` for the
  authority unit suite.

## Layer 3 (Pilot-driven)

The Layer 3 driver lives at `scripts/run-pilot-v25-canvas-api.mjs`.
It takes natural-language statements like

  > Reset the counter, then add 7 to it, turn the highlight on, and
  > tell me whether the value is now even.

drives them via Claude (Anthropic API) translating to a sequence of
`NAC.call` / `NAC.read` / `NAC.subscribe` invocations, dispatches each
through Playwright, and validates the final state. See the script
header for env vars + cost model.
