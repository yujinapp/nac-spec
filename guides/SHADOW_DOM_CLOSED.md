# Authoring NAC3 with closed Shadow DOM

> **TL;DR.** Closed shadow roots are opaque from outside by
> browser security design. NAC3 cannot reach in unless you
> voluntarily expose your component via `get nac3()` returning
> a small interface object. Implement `query`, optionally
> `queryAll` and `describe`. If you do, NAC3 callers transparently
> operate your component. If you don't, NAC3 emits
> `nac:shadow_blocked` so the debugger sees the dead end.

**Audience.** Component authors who use
`attachShadow({mode:'closed'})` for legitimate isolation
reasons -- design systems with strict API surfaces, third-party
embedded widgets, security-sensitive components.

**Spec reference.** SPEC.md section 5.1.6.

---

## Why closed shadow DOM exists

Closed shadow DOM is a deliberate browser feature for **opaque
boundaries**. Once you do `attachShadow({mode:'closed'})`:

- `element.shadowRoot` returns `null` from outside.
- The component author keeps the only reference to the shadow
  root (typically as a private field).
- External code cannot query, walk, mutate, or inject into the
  shadow tree.

This is enforced by the browser; no library (NAC3 included)
can bypass it. Whether your component opts in to NAC3 is your
decision.

---

## The voluntary exposure contract

NAC3 v2.3 defines a small interface that closed-shadow
components MAY implement on their host element:

```ts
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
```

You expose it via a getter named `nac3` on your custom
element class.

The NAC3 runtime, when it cannot find an element in document
light DOM or open shadow trees, walks every element on the page
looking for hosts that have an `el.nac3` getter. It calls
`el.nac3.query('[data-nac-id="..."]')`. If the call returns an
Element, the runtime resolves there. If it returns null, the
runtime moves on. If it throws, the runtime emits
`nac:shadow_blocked` (reason='exposure_threw') once for that
host.

---

## Minimal positive example

```js
class MyCorpModal extends HTMLElement {
  constructor() {
    super();
    /* CLOSED shadow root -- opaque from outside. */
    this._shadow = this.attachShadow({ mode: 'closed' });
  }

  /* The voluntary exposure contract. The browser still hides the
     shadow root from outside; we choose to expose a controlled
     query API for NAC3-compliant agents. */
  get nac3() {
    const sh = this._shadow;
    return {
      query:    (sel) => sh.querySelector(sel),
      queryAll: (sel) => Array.from(sh.querySelectorAll(sel)),
      describe: () => Array.from(sh.querySelectorAll('[data-nac-id]'))
        .map(el => ({
          id:    el.getAttribute('data-nac-id'),
          role:  el.getAttribute('data-nac-role'),
          action: el.getAttribute('data-nac-action') || undefined,
          label: (el.textContent || '').trim().slice(0, 60)
        }))
    };
  }

  connectedCallback() {
    this._shadow.innerHTML = `
      <style>:host{display:block;padding:12px}</style>
      <button data-nac-id="corp.modal.cancel"
              data-nac-role="action"
              data-nac-action="cancel">Cancel</button>
      <button data-nac-id="corp.modal.confirm"
              data-nac-role="action"
              data-nac-action="confirm">Confirm</button>
    `;
    this._shadow.addEventListener('click', (e) => {
      const el = e.target.closest('[data-nac-id]');
      if (!el) return;
      this.dispatchEvent(new CustomEvent('nac:action:succeeded', {
        bubbles: true, composed: true,
        detail: {
          plugin: 'corp_modal',
          action_id: el.getAttribute('data-nac-id')
        }
      }));
    });
  }
}
customElements.define('corp-modal', MyCorpModal);
```

After mounting `<corp-modal>`, any external agent can call:

```js
await NAC.click('corp.modal.confirm');
```

and the runtime reaches inside the closed shadow root via your
`query` method. Your internals stay opaque to everyone else.

---

## The negative case (declared closed, no exposure)

If you have a closed shadow root and deliberately do NOT want
to expose it to NAC3, you have two options:

### Option A -- declare it on the host

Add `data-nac-shadow="closed"` to the host element. NAC3
detects this attribute and emits `nac:shadow_blocked` once per
host (with `reason='not_exposed'`), letting debugging tooling
surface the boundary explicitly.

```html
<corp-modal data-nac-shadow="closed"></corp-modal>
```

```js
class CorpModal extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'closed' });
  }
  /* No get nac3() defined -- this component is NOT
     NAC3-operable. */
}
```

When an agent calls `NAC.click('corp.modal.confirm')`:

1. Runtime walks light DOM + open shadow trees -- not found.
2. Runtime sees `data-nac-shadow="closed"` on the host with no
   `nac3` interface -> emits `nac:shadow_blocked` with
   `reason='not_exposed'` (once per host).
3. `NAC.click` rejects with `code='not_found'`.

The caller can listen for `nac:shadow_blocked` to know it hit a
deliberately closed component vs an actually-missing element.

### Option B -- silent (do nothing)

If you do not add `data-nac-shadow="closed"`, the runtime
cannot distinguish a closed-shadow host from a regular element
without shadow. It silently fails to find the element and
returns `not_found`. This is fine for components that have no
intention of ever being agent-operable (and no debugging value
either).

**Recommendation.** Always add `data-nac-shadow="closed"` if
you genuinely want a closed boundary. It costs nothing and
gives debugging tooling a meaningful signal.

---

## Error semantics

The runtime emits the following events at most ONCE per host
(WeakSet dedup) so noisy components never spam:

| Condition | Event | `detail.reason` |
|-----------|-------|------------------|
| `el.nac3.query` threw | `nac:shadow_blocked` | `'exposure_threw'` |
| `el.nac3.query` returned non-Element | `nac:shadow_protocol_violation` | (with `message` + `value_snapshot`) |
| `data-nac-shadow="closed"` + no `el.nac3` | `nac:shadow_blocked` | `'not_exposed'` |
| `el.nac3.query` returned Element | (no event -- resolves) | -- |

Listen at document level:

```js
document.addEventListener('nac:shadow_blocked', (e) => {
  console.warn('[NAC3] closed shadow host',
    e.detail.host, 'blocked:', e.detail.reason);
});
```

---

## What to expose, what NOT to expose

**Expose only the elements your component contract considers
public.** The whole point of closed shadow is to keep internals
private. You can scope `el.nac3.query` to a curated subset:

```js
get nac3() {
  const sh = this._shadow;
  return {
    query: (sel) => {
      // Only resolve public ids; refuse anything internal.
      const m = sel.match(/^\[data-nac-id="([^"]+)"\]$/);
      if (!m) return null;
      const id = m[1];
      if (!id.startsWith('public.')) return null;  // gated
      return sh.querySelector(sel);
    },
    // No queryAll, no describe -- minimum surface.
  };
}
```

This pattern is useful when:
- Your component has internal helper elements that should
  remain invisible to agents.
- You want to audit which ids are "public API" of your
  component.

---

## When throwing vs returning null

If your `query` method encounters an unexpected condition
(component not yet initialised, state corruption, internal
error):

- **Return null** if it is a "this element doesn't exist /
  isn't ready yet" condition. The agent will get
  `code='not_found'` and can retry.
- **Throw** only if you want to signal "the component is
  broken and the caller should give up". NAC3 emits
  `nac:shadow_blocked` (reason='exposure_threw') once and
  skips your host.

Never let unhandled errors leak from `query`; it makes the
runtime emit noisy events on every probe.

---

## Worked example: a corporate modal

```js
class CorpModal extends HTMLElement {
  constructor() {
    super();
    this._shadow  = this.attachShadow({ mode: 'closed' });
    this._opened  = false;
    this._payload = null;
  }

  get nac3() {
    const sh = this._shadow;
    return {
      query: (sel) => {
        // The modal only accepts NAC3 calls when it is open;
        // closed modal => no public surface.
        if (!this._opened) return null;
        return sh.querySelector(sel);
      },
      describe: () => {
        if (!this._opened) return [];
        return [
          { id: 'corp.modal.cancel',  role: 'action', action: 'cancel' },
          { id: 'corp.modal.confirm', role: 'action', action: 'confirm' }
        ];
      }
    };
  }

  open(payload) {
    this._opened  = true;
    this._payload = payload;
    this._shadow.innerHTML = `... `;  // your render
    this.removeAttribute('hidden');
  }

  close() {
    this._opened = false;
    this.setAttribute('hidden', '');
  }
}
customElements.define('corp-modal', CorpModal);
```

The modal is invisible to NAC3 when closed (no surface to
operate) and operable when open. State-aware exposure is
trivial to implement.

---

## Decision tree: open vs closed-with-exposure vs closed-silent

```
       Use closed shadow DOM?
              |
       +------+------+
       |             |
      NO            YES
       |             |
   Use open       Want NAC3 callers
   shadow         to be able to
   (default       operate you?
   modern         |
   pattern)    +--+--+
               |     |
              YES   NO
               |     |
        Implement   Add data-nac-shadow="closed"
        get nac3()  on the host (or don't).
        per this    NAC3 emits shadow_blocked
        guide       on probe; caller learns to
                    leave you alone.
```

For 95% of cases, **open shadow + `data-nac-*` attributes** is
the right answer (see `SHADOW_DOM_OPEN.md`). Closed shadow is
the right answer when isolation is a feature, not an accident.

---

## Anti-patterns

### 1. Exposing more than you need

```js
get nac3() {
  return {
    query:    sel => this._shadow.querySelector(sel),
    queryAll: sel => this._shadow.querySelectorAll(sel),
    /* DON'T: leak internal references. */
    _shadow:  this._shadow,
    state:    this._state
  };
}
```

The runtime only reads `query` / `queryAll` / `describe`. Extra
keys leak your private API and may be relied on by adopters,
creating brittle coupling.

### 2. Throwing from `query` for normal "not found"

```js
get nac3() {
  const sh = this._shadow;
  return {
    query: (sel) => {
      const r = sh.querySelector(sel);
      if (!r) throw new Error('not found');  // DON'T
      return r;
    }
  };
}
```

This emits `nac:shadow_blocked` on every probe of a missing
element. Use null. NAC3 already handles not-found correctly.

### 3. Returning non-Element values

```js
get nac3() {
  return {
    query: (sel) => ({ id: sel, fake: true })  // DON'T
  };
}
```

The runtime emits `nac:shadow_protocol_violation` and skips
your host. Always return Element or null.

### 4. Computing `nac3` on every call

```js
get nac3() {
  console.log('expensive setup');   // ran on every probe!
  return { query: sel => this._shadow.querySelector(sel) };
}
```

The getter is called every time the runtime probes a closed
shadow host. Keep it cheap -- a literal object or a memoised
reference. Heavy work belongs in `connectedCallback`.

---

## Verifying integration

In devtools console:

```js
const host = document.querySelector('corp-modal');
typeof host.nac3;
// -> 'object'

host.nac3.query('[data-nac-id="corp.modal.confirm"]');
// -> <button data-nac-id="corp.modal.confirm">

await NAC.click('corp.modal.confirm');
// -> Promise resolves on nac:action:succeeded
```

If your component is correctly integrated, NAC3 callers operate
it identically to a light-DOM component. The closed boundary
remains intact for any caller that does NOT go through NAC3.

---

## See also

- SPEC.md section 5.1.6 -- formal closed shadow contract.
- SPEC.md section 5.1.5 -- open shadow resolution (the simpler
  cousin).
- `example-v23-shadow-closed.php` -- live positive + negative
  side-by-side.
- `packages/nac/test/v23-shadow.mjs` T4-T9 -- unit tests for
  every error event family.
- `SHADOW_DOM_OPEN.md` -- the open-shadow companion guide.
