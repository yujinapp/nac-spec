# Authoring NAC3 with open Shadow DOM

> **TL;DR.** If you write Web Components with
> `attachShadow({mode:'open'})`, NAC3 v2.3 walks them
> automatically up to depth 10. You do **not** need to change
> anything in your component author code beyond what you already
> do for accessibility. Just put `data-nac-*` attributes on the
> elements inside your shadow root.

**Audience.** Component library authors and product engineers
who build with Lit, Stencil, vanilla Web Components, or any
framework that uses open shadow DOM (most React/Vue/Angular
adoption does NOT use shadow DOM, see the open-vs-closed
decision tree at the bottom).

**Spec reference.** SPEC.md section 5.1.5.

---

## The five things to remember

1. **Open shadow roots are automatically resolved by NAC3 v2.3.**
   The runtime walks `el.shadowRoot` recursively. No manifest
   hint, no opt-in, no special declaration. Up to 10 levels deep.

2. **Put `data-nac-*` attributes INSIDE the shadow root**, on the
   elements you want operable: buttons, inputs, checkboxes,
   tabs. The same attributes you use in light DOM.

3. **Events must use `composed: true`** when you emit them from
   inside a shadow root. Without `composed: true`, the event
   stops at the shadow boundary and document-level listeners
   never see it. The NAC3 runtime emits its own events
   composed-true by default.

4. **The host element of the shadow root is in light DOM.** That
   means selectors on the host (`my-card[data-nac-plugin]`) work
   from outside; selectors on the shadow children
   (`my-card input[data-nac-id]`) do NOT work from the document
   level. NAC3 handles the descent for you.

5. **CSS for shadow children belongs in the shadow root.** This
   is just how shadow DOM works -- light DOM `<style>` does not
   cross into shadow trees. Use `:host` selectors for the
   component's own visual style.

---

## Minimal example

```html
<my-todo-card data-task="Buy milk"></my-todo-card>

<script>
class MyTodoCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }
  connectedCallback() {
    const task = this.getAttribute('data-task') || '';
    this.shadowRoot.innerHTML = `
      <style>
        :host { display: flex; gap: 8px; padding: 8px; }
        .task.done { text-decoration: line-through; }
      </style>
      <input type="checkbox"
             data-nac-id="todo.${this.id}.toggle"
             data-nac-role="field"/>
      <span class="task">${task}</span>
      <button data-nac-id="todo.${this.id}.delete"
              data-nac-role="action"
              data-nac-action="delete">delete</button>
    `;

    const cb  = this.shadowRoot.querySelector('input');
    const lbl = this.shadowRoot.querySelector('.task');
    cb.addEventListener('change', () => {
      lbl.classList.toggle('done', cb.checked);
      // Emit composed:true so document-level listeners hear us.
      this.dispatchEvent(new CustomEvent('nac:field:changed', {
        bubbles:  true,
        composed: true,
        detail: {
          plugin: 'todo_card',
          nac_id: `todo.${this.id}.toggle`,
          value:  cb.checked
        }
      }));
    });
  }
}
customElements.define('my-todo-card', MyTodoCard);
</script>
```

Now any external agent can call:

```js
await NAC.click('todo.t1.delete');
await NAC.fill ('todo.t1.toggle', true);
```

and the runtime resolves the elements through the shadow
boundary. No glue code needed on your end.

---

## Patterns

### Lit

```js
import { LitElement, html } from 'lit';

class TodoCard extends LitElement {
  static properties = { task: { type: String }, id: { type: String } };

  render() {
    return html`
      <input type="checkbox"
             data-nac-id="todo.${this.id}.toggle"
             data-nac-role="field"
             @change=${this._onToggle}/>
      <span>${this.task}</span>
      <button data-nac-id="todo.${this.id}.delete"
              data-nac-role="action"
              data-nac-action="delete"
              @click=${this._onDelete}>delete</button>
    `;
  }
  _onToggle(e) {
    this.dispatchEvent(new CustomEvent('nac:field:changed', {
      bubbles: true, composed: true,
      detail: { plugin: 'todo_card',
                nac_id: `todo.${this.id}.toggle`,
                value:  e.target.checked }
    }));
  }
  _onDelete() {
    this.dispatchEvent(new CustomEvent('nac:action:succeeded', {
      bubbles: true, composed: true,
      detail: { plugin: 'todo_card', action_id: `todo.${this.id}.delete` }
    }));
  }
}
customElements.define('todo-card', TodoCard);
```

Lit defaults `attachShadow({mode:'open'})` -- you do not need
any extra config. The `data-nac-*` attributes flow naturally.

### Stencil

```tsx
import { Component, Prop, Host, h } from '@stencil/core';

@Component({
  tag: 'todo-card',
  shadow: true,    // <-- this is open shadow by default
  styleUrl: 'todo-card.css'
})
export class TodoCard {
  @Prop() taskId: string;
  @Prop() task:   string;

  render() {
    return (
      <Host>
        <input type="checkbox"
               data-nac-id={`todo.${this.taskId}.toggle`}
               data-nac-role="field"
               onChange={(e) => this._emit('nac:field:changed', {
                 nac_id: `todo.${this.taskId}.toggle`,
                 value:  (e.target as HTMLInputElement).checked
               })}/>
        <span>{this.task}</span>
        <button data-nac-id={`todo.${this.taskId}.delete`}
                data-nac-role="action"
                data-nac-action="delete">delete</button>
      </Host>
    );
  }
  private _emit(type: string, detail: object) {
    this.host.dispatchEvent(new CustomEvent(type, {
      bubbles: true, composed: true, detail: { plugin: 'todo_card', ...detail }
    }));
  }
}
```

### Vanilla

See the minimal example above. No framework needed; the
`attachShadow({mode:'open'})` + `data-nac-*` attributes + a
manifest entry are the contract.

---

## Gotchas

### Don't use `<slot>` for elements you want NAC3 to operate

When you use `<slot>`, slotted content lives in **light DOM** and
is merely projected into the shadow tree visually. The NAC3
runtime walks shadow roots; it does NOT walk projected slot
content from the slot's perspective (the source nodes are in
light DOM and resolved there directly).

This is usually fine -- light-DOM children with `data-nac-id`
work normally. But if your component's logic depends on the
slotted children being "inside" for some shadow-only operation,
the runtime will find them via light DOM first.

### `:host` rules apply, light-DOM rules do not

CSS inside the shadow root uses `:host`, `:host(.modifier)`, and
`::slotted(child)`. Page-level CSS does not cross into the
shadow boundary except through CSS custom properties (`--var`)
and inheritable properties (font, color, etc).

This is unrelated to NAC3 but trips up authors who expect
page-level styles to apply.

### Multiple shadow roots per component are not supported

`attachShadow` can only be called once per element. If you need
hierarchical shadow trees, nest custom elements, each with its
own shadow. The NAC3 runtime walks the chain automatically.

### Depth cap is 10

If you nest open shadow roots more than 10 levels deep
(extremely rare; we have not seen this in any production code),
NAC3 stops walking. The element will not be found and
`NAC.click` will reject with `code='not_found'`. If you hit this,
it is almost certainly a design issue, not a NAC3 limitation.
File an issue on the spec repo if you have a real use case
needing depth > 10.

### Event timing

The runtime resolves the element synchronously, then waits for
the host's success event (`nac:action:succeeded` etc.) with a
configurable timeout. If your component does async work
(network call, animation) BEFORE emitting the event, that delay
counts against the timeout. Default timeout 5s for `click`,
30s for `invoke`. Tune via `opts.timeout`.

---

## Migration: existing components

If your component already uses `attachShadow({mode:'open'})`
and ARIA-correct attributes:

- Add `data-nac-id` on every operable element. Stable, short,
  hierarchical: `plugin.feature.action_or_field`.
- Add `data-nac-role` matching the function ("field", "action",
  "tab", "region").
- Add `data-nac-action` on actions ("save", "submit", "delete",
  "search").
- Make sure your event emissions use `composed: true`.

Zero changes to your component logic. The contract is purely
additive.

---

## Verifying

After integration, open your app in a browser with NAC3 v2.3
loaded and run from the devtools console:

```js
window.NAC.list_registered_plugins();
// -> ['your_plugin_slug', ...]

await window.NAC.click('your_plugin.your_id');
// -> Promise resolves on nac:action:succeeded

window.NAC.describe();
// -> Lists every data-nac-id reachable from the document,
//    including those inside open shadow roots.
```

If your shadow-rooted elements show up in `describe()` output,
you are correctly integrated.

---

## Decision: open vs closed shadow

Choose **open** when:
- You author a design system for internal use.
- You want to support external automation, testing, accessibility
  tools without per-tool integration.
- You want CSS overrides via shadow-piercing techniques like
  `::part` and CSS custom properties.

Choose **closed** when:
- Your component is genuinely sandboxed (third-party widget,
  payment iframe analog, security-sensitive surface).
- You want to OPT IN to NAC3 selectively via `el.nac3` exposure
  rather than expose your full internal structure.

For the closed case, see `SHADOW_DOM_CLOSED.md`.

---

## See also

- SPEC.md section 5.1.5 -- formal shadow DOM resolution rules.
- SPEC.md section 5.1.6 -- closed shadow exposure API.
- `example-v23-shadow-open.php` -- live demo, 1/2/3 levels of
  nesting.
- `example-v23-shadow-closed.php` -- positive + negative
  side-by-side comparison.
- `packages/nac/test/v23-shadow.mjs` -- 10 unit tests
  covering open + closed + depth cap + error events.
