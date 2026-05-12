# Case studies -- demo bugs discovered autonomously

Bugs found by the diagnostic Playwright sweep against
`yujin.app/nac-spec/demos/react/` and `/demos/angular/`. Pablo
asked me on 2026-05-11 to discover + document + fix without him
naming the symptoms. This file records the discovery process +
the fixes.

---

## Bug #1 (HIGH) -- LLM intermediary doesn't see the app's manifest

**Demos affected:** React + Angular.

**Symptom (observable):** When the user types "hola" in the chat
panel of the React or Angular demo, the chat replies with a
generic "How can I help you with this page?" -- not aware that
this is a todos app. When the user says "agrega tomar agua" the
LLM cannot dispatch `click_by_verb('todos', 'add_todo')` because
it doesn't know that plugin exists.

**Discovery method.** The diagnostic spec captures every
`page.console` message during the chat interaction. The chat
client logs:

```
[nac-chat] snapshot plugins (1): chat
[nac-chat] backend response: message="Hi! How can I help you with this page?" actions=[]
```

`snapshot plugins (1): chat` is the smoking gun -- only ONE
plugin appears in the snapshot sent to the LLM, the `chat` plugin.
The `todos` plugin -- which the demo registers via
`NAC.register(TODOS_MANIFEST)` -- is absent.

**Root cause.** `NAC.describe()` enumerates plugins by walking
the DOM for `[data-nac-plugin="..."]` elements (line ~1557 of
`yujin.app/nac-spec/js/nac.js`). The chat panel's
`<aside class="chat" data-nac-plugin="chat">` has the attribute;
the todos region of the app does NOT. The runtime never sees the
todos region as a plugin scope, so neither does `describe()`,
neither does `snapshotTree()`, neither does the LLM.

Manifest registration via `NAC.register(...)` populates the
internal `_manifests` map but does NOT auto-attach a
`data-nac-plugin` attribute to the DOM. That's the caller's
responsibility.

**Fix.** Add `data-nac-plugin="todos"` to the main app container
in both demos:

- React: `<div className="app">` -> `<div className="app" data-nac-plugin="todos">`
- Angular: template's `<div class="app">` -> `<div class="app" data-nac-plugin="todos">`

After the fix, `NAC.describe()` returns 2 plugins (`todos` +
`chat`), the snapshot carries both manifests, and the LLM can
dispatch verb-based actions against `todos.*`.

**Lesson for the manual.** The NAC3 contract requires BOTH:
1. `NAC.register(manifest)` to declare the schema.
2. `data-nac-plugin="<slug>"` on a DOM root to enrol the plugin
   in the scope tree.

The adoption guides and the NAC_TEST_MANUAL should call this out
explicitly. A common adopter mistake is to register the manifest
and forget the DOM attribute, producing the exact "LLM is blind"
symptom above. Add to `stage2-disambiguation.mjs` a regression
test: snapshot must include EVERY registered plugin, otherwise
flag a finding.

---

## Bug #2 (MEDIUM) -- React onChatAction handlers close over stale state

**Demo affected:** React only. Angular's signals + `update()` make
this category not apply.

**Symptom (observable):** After fix #1 deployed, the chat-driven
verb dispatch still doesn't add todos. Sending "agrega leche"
results in no new todo. The LLM correctly emits the two-action
sequence (`fill todos.input "leche"` + `click_by_verb todos
add_todo`), but the `add_todo` handler sees `input.trim() === ''`
and returns silently without calling `addTodo()`.

**Discovery method.** The deep-discovery Playwright sweep
(round 2) captures before/after row counts during a chat-driven
add. Findings:

```
[WARN] chat.dispatch: [react] chat "agrega leche" did not add a
todo (before=3, after=3). May be LLM hallucination or dispatch
broken.
```

**Root cause.** `App.tsx`'s `useEffect` for chat-handler
registration has deps `[input, todos]`. The handlers close over
the React state values AT THE TIME OF REGISTRATION. When the LLM
sends `actions[]` synchronously, the chat client dispatches:
1. `fill todos.input "leche"` -> `setInput('leche')` queues a
   re-render.
2. `click_by_verb todos add_todo` -> runs IMMEDIATELY, in the same
   JS task. React hasn't re-rendered yet. The handler's closure
   still has `input === ''`. The `input.trim()` guard fails;
   `addTodo()` never runs.

This is the classic React closure-vs-stale-state problem.

**Fix.** Use a `useRef` that mirrors `input`; the handler reads
from the ref (always current value) instead of from the closure.
Same pattern for `todos` in case future verbs need it.

```ts
const inputRef = useRef(input);
useEffect(() => { inputRef.current = input; }, [input]);

useEffect(() => {
  if (!window.NacChat) return;
  window.NacChat.onAction('click_by_verb', (a) => {
    if (a.plugin === 'todos' && a.verb === 'add_todo') {
      const text = (a as any).args?.text || inputRef.current.trim();
      if (text) {
        addTodoFromText(text);
        return { ok: true };
      }
    }
    ...
  });
}, []); // register once
```

Bonus: also accept the LLM passing the text directly in
`args.text`, so even apps that don't fill-then-click work.

**Lesson for the manual.** When wiring NAC3 chat-driven verbs in
React, NEVER close handlers over state directly. Use refs or
the functional setter pattern. Add to the React adoption guide
(`guides/REACT.md`) and to the test manual a "common gotcha"
section.

---

## Bug #3 (TBD)

Pending diagnostic round 3.

---

## Loop log

| Round | When | React errors | Angular errors | Bugs filed |
|-------|------|--------------|----------------|------------|
| 1 | 2026-05-11 02:10 | 0 in surface scan | 0 in surface scan | #1 (manifest coverage) found via console parsing |

The diagnostic spec's structural checks (NAC mounted,
validate_global clean, manifests in registry, todos CRUD works,
chat toggle works) all PASS green. The bugs surface in deeper
semantics like "is the LLM actually seeing what we registered?".
Future diagnostic rounds add: post-LLM-response action shape,
verify dispatch fires, verify dt_state mutation propagation
through framework state, verify autopilot completes all steps,
verify locale switching from chat.
