# RFC V26-01 -- Plugin extension hooks: discovery, self-description, real event sources

**Status: SHIPPED** (2.6.0, 2026-11-11)
**Spec sections:** 15.2, 15.3, 15.4, 15.9, 15.10, 15.11
**Supersedes nothing. Breaks nothing.** A manifest written against
v2.5 registers and runs unmodified.

---

## 1. Why

V25-01 published the plugin extension contract: five primitives and
eight backends that let a NAC3 plugin declare how its verbs, state and
events route to a surface that is not DOM. It was measured again on
2026-11-11, surface by surface, against the seven surfaces this project
had not yet decided on (virtualised grids, maps, media players, PDF
viewers, voice-only interfaces, XR, and screen-capture agents as the
competing alternative). The finding was narrow and specific:

> None of the seven needs a new ROUTING mechanism. The eight backends
> are enough to REACH the application in all seven cases. What is
> missing is how the agent FINDS and UNDERSTANDS what the plugin
> declares.

Six hooks came out of that measurement. They are shared by all seven
surfaces -- which is why they are one RFC and not seven -- and the
motivating case for publishing them as a unit is a plugin that lives in
a repository of its own, under its own licence, attached to this
Apache-2.0 core without a byte of it changing. Without E-1 that plugin
is invisible to any agent that did not register it; without E-2 its
arguments are undeclared; without E-3 it polls for events a library
already emits.

## 2. The six hooks

| Id | What was missing | Shape of the fix | Spec |
|----|------------------|------------------|------|
| E-1 | The registry could not be enumerated: `call` / `read` / `subscribe` all require the caller to already know the slug. An agent that did not register the plugin could not learn it exists. | `NAC.plugins()`, `NAC.describePlugin(slug)` -- synchronous, read-only, returning a COPY. | 15.10 |
| E-2 | A manifest declared WHERE a verb routes and nothing about what it is called or what it takes. On a continuous surface the actionable thing IS the argument. | Optional `label` / `hint` / `params` on verbs, `label` / `hint` / `unit` on state and events; validated at register time. | 15.11 |
| E-3 | The only real event source was postMessage. A plugin over a library that emits its own events had to poll or hand-write a mirror node. | `emitter-listen`, the ninth backend. Detects `on`/`off`, `addEventListener`/`removeEventListener`, `addListener`/`removeListener`, or takes them declared. Refuses an emitter it cannot detach from. | 15.4 |
| E-4 | `sdk-call` resolved its path against `window` only, and passed exactly one argument -- so a React ref was unreachable and `map.setView(center, zoom)` was inexpressible. | `NAC.registerApiHandle(name, obj)` + the `handle` field; `args_order` for positional arguments. | 15.4 |
| E-5 | **Defect.** When an observed mirror node was absent, `synthetic-mutation` dropped it; with nothing left to observe, `subscribe` returned a handle that never fired. | Fail closed with `backend_target_missing`. Optional `root` observes a container that outlives the node and re-resolves on mutation, for the virtualised-row lifecycle. | 15.4 |
| E-6 | A plugin-specific error code worked only by accident: `call` lifted any string on `err._code` against a published closed list of ten. | The reserved `plugin.` code space. Anything outside the ten and outside the prefix is refused as `invalid` with `err.offending_code`. | 15.9 |

E-3 is the reason the spec version moves to **2.6**: 15.4 requires a
spec bump for a new backend, and requires runtimes that do not
implement one to reject the manifest rather than skip it silently.

## 3. What it does NOT do

- It does not make the runtime read pixels. The published limit stands.
- It does not add heuristics to `NAC.click` -- 15.1 ruled that out and
  this RFC does not reopen it.
- It does not validate `args` against `params`. The declaration exists
  so an agent can compose a call and a voice runner can speak it; a
  surface that needs its arguments enforced enforces them where they
  land.
- It does not translate anything. A `label` is authored in the language
  of the app (4.3).

## 4. Evidence

**Layer 1 -- unit.** `runtime/test/stage13-plugin-hooks.mjs`, 67
assertions, wired into `npm test`. It carries its own red proof in its
header: run it against the 2.5.2 bytes and 15 assertions fail, four of
them the E-5 silent subscription -- which fails there by RESOLVING,
which is the whole point.

**Layer 2 -- browser, against a library nobody here controls.**
`demos/v26-leaflet-plugin/` + `scripts/run-demo-v26-leaflet-plugin.mjs`:
a real Leaflet 1.9.4 from unpkg with a pinned SRI hash, driven in
headless Chromium, 37 assertions. The plugin file uses nothing but
`registerApiHandle` and `registerPlugin`. Every effect is checked
twice -- once through the protocol and once against Leaflet's own API --
so a pass means the map moved, not that our bookkeeping agreed with
itself. Evidence in `evidence/v26-leaflet-plugin/<run-date>/`.

This is also the receipt the project had been missing since V25-01
shipped: until now the contract had only ever been exercised against a
target we wrote ourselves.

**Layer 3 -- pilot.** Not run for this RFC. Stated here rather than
implied: the Layer 3 coverage objective of `PROJECT.md` sec 3.1 is not
met by this release, and the row in the index says so.

## 5. Notes for adopters

Nothing to migrate. Two behaviours a 2.5 manifest can notice:

1. A `synthetic-mutation` subscription whose mirror nodes are all
   absent now REJECTS where it used to return a handle. If an adopter
   depended on that handle, it depended on a subscription that never
   fired; the fix is `root`, or subscribing when the node exists.
2. A backend raising an `err._code` outside the ten contract codes now
   surfaces as `invalid` instead of that code. Codes move into the
   `plugin.` space with a one-line change at the throw site.
