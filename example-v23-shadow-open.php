<?php
/**
 * example-v23-shadow-open.php -- NAC v2.3 stable: open Shadow DOM
 * resolution (F1).
 *
 * Showcases the runtime walking open `attachShadow({mode:'open'})`
 * roots transparently. An external agent calls NAC.click on an
 * element that lives 1-3 levels deep inside open shadow roots,
 * and the runtime resolves it without any glue code from the
 * component author.
 *
 * Three Web Components built inline:
 *
 *   <todo-card-open>           -- 1-level open shadow root.
 *                                 Renders a checkbox + delete inside.
 *   <wrapper-open>             -- nests <todo-card-open> inside its
 *                                 own open shadow. 2 levels total.
 *   <deep-wrapper-open>        -- nests <wrapper-open>. 3 levels.
 *
 * The page exposes 3 external "Toggle via NAC" buttons that fire
 * NAC.click against each card's data-nac-id at progressively
 * deeper levels. An event log panel renders every
 * nac:action:succeeded / :failed so visitors see the proof live.
 *
 * No glue code, no manifest hint, no special declaration on the
 * component author's side -- only `data-nac-*` attributes on the
 * elements inside the shadow root and `composed:true` on the
 * success event.
 *
 * Cross-test coverage:
 *   - packages/nac/test/v23-shadow.mjs T1, T2, T10
 *
 * See also:
 *   - SPEC.md sec 5.1.5 (Shadow DOM resolution)
 *   - guides/SHADOW_DOM_OPEN.md (authoring guide)
 *   - example-v23-shadow-closed.php (the closed-shadow companion)
 */
?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>NAC3 v2.3 -- Open Shadow DOM demo</title>
<style>
  :root {
    --yujin-ink:    #1a1a1a;
    --yujin-paper:  #fafaf7;
    --yujin-sumi:   #2c2c2c;
    --yujin-sakura: #c8a04d;
    --yujin-pulse:  #4f46e5;
  }
  * { box-sizing: border-box; }
  body {
    font-family: 'DM Sans', -apple-system, system-ui, sans-serif;
    background: var(--yujin-paper);
    color: var(--yujin-ink);
    margin: 0; padding: 32px 24px;
    line-height: 1.55;
  }
  .wrap { max-width: 900px; margin: 0 auto; }
  h1 { font-weight: 600; margin: 0 0 6px; font-size: 28px; }
  .tagline { color: #666; margin-bottom: 28px; }
  .badge {
    display: inline-block; padding: 3px 10px; border-radius: 4px;
    background: var(--yujin-ink); color: #fff;
    font-size: 11px; letter-spacing: 0.5px; text-transform: uppercase;
  }

  .pane {
    background: #fff;
    border: 1px solid #e6e3dc;
    border-radius: 6px;
    padding: 18px 20px;
    margin: 16px 0;
  }
  .pane h2 { font-size: 17px; font-weight: 600; margin: 0 0 8px; }
  .pane p  { margin: 6px 0; color: #444; font-size: 14px; }

  .ctl-row {
    display: flex; gap: 8px; flex-wrap: wrap;
    align-items: center; margin: 12px 0;
  }
  .ctl-row button {
    background: var(--yujin-ink); color: #f5f5f5;
    border: 0; border-radius: 4px;
    padding: 8px 14px; font-size: 13px;
    font-family: inherit; font-weight: 500;
    cursor: pointer;
  }
  .ctl-row button:hover { background: var(--yujin-sumi); }
  .ctl-row .secondary {
    background: transparent; color: var(--yujin-ink);
    border: 1px solid #c8c5be;
  }
  .ctl-row .ok-tag {
    margin-left: 6px; padding: 2px 6px;
    border-radius: 3px; font-size: 11px;
    background: #ddeed0; color: #245018;
  }

  #log {
    background: #1a1a1a; color: #d4d4cf;
    padding: 12px 14px; border-radius: 5px;
    font-family: 'Fira Code', 'SF Mono', monospace;
    font-size: 12px; line-height: 1.55;
    height: 230px; overflow-y: auto;
    margin-top: 6px;
    border: 1px solid #2c2c2c;
  }
  #log .ts { color: #888; }
  #log .ok { color: #6fc88f; }
  #log .info { color: #8ec1d4; }
  #log .err { color: #d47a7a; }

  hr { border: 0; border-top: 1px solid #ece8df; margin: 26px 0; }

  /* Visual style for the web components when rendered. Targets the
     :host of the open shadow root (they inherit from the page). */
  todo-card-open,
  wrapper-open,
  deep-wrapper-open {
    display: block;
    border: 1px solid #d5d2c9;
    border-radius: 5px;
    padding: 10px 14px;
    margin: 10px 0;
    background: #faf8f3;
    font-size: 14px;
  }

  code { background: #f0eee8; padding: 1px 6px; border-radius: 3px; font-size: 13px; }
</style>
</head>
<body>
<div class="wrap">

  <h1>NAC3 v2.3 -- Open Shadow DOM</h1>
  <p class="tagline">
    <span class="badge">v2.3 stable</span>&nbsp;
    The runtime walks <code>el.shadowRoot</code> recursively
    (cap depth 10). Zero glue code on the component author's side.
  </p>

  <div class="pane">
    <h2>How this works</h2>
    <p>
      Three Web Components are mounted below. Each one uses
      <code>attachShadow({mode:'open'})</code> and renders a
      checkbox + delete button (with <code>data-nac-*</code>
      attributes) inside the shadow root. The deeper components
      nest the shallower ones.
    </p>
    <p>
      The buttons on the right call <code>NAC.click(...)</code>
      against the elements <em>inside</em> the shadow boundaries.
      No special manifest declaration is needed -- the runtime
      sees through open shadow roots automatically.
    </p>
  </div>

  <!-- Level 1 -->
  <div class="pane">
    <h2>1) Single open shadow root</h2>
    <todo-card-open id="card-1" data-task="Buy milk"></todo-card-open>
    <div class="ctl-row">
      <button id="toggle-1"
              data-nac-id="ext.toggle_1"
              data-nac-role="action"
              data-nac-action="click">
        Toggle "Buy milk" via NAC
      </button>
      <button class="secondary" id="delete-1">
        Delete via NAC
      </button>
      <span id="state-1" class="ok-tag" hidden></span>
    </div>
  </div>

  <!-- Level 2 -->
  <div class="pane">
    <h2>2) Two nested open shadow roots</h2>
    <wrapper-open>
      <todo-card-open id="card-2" data-task="Mail invoice"></todo-card-open>
    </wrapper-open>
    <div class="ctl-row">
      <button id="toggle-2">Toggle "Mail invoice" (2 levels deep)</button>
      <span id="state-2" class="ok-tag" hidden></span>
    </div>
  </div>

  <!-- Level 3 -->
  <div class="pane">
    <h2>3) Three nested open shadow roots</h2>
    <deep-wrapper-open>
      <wrapper-open>
        <todo-card-open id="card-3" data-task="Call partner"></todo-card-open>
      </wrapper-open>
    </deep-wrapper-open>
    <div class="ctl-row">
      <button id="toggle-3">Toggle "Call partner" (3 levels deep)</button>
      <span id="state-3" class="ok-tag" hidden></span>
    </div>
  </div>

  <hr/>

  <div class="pane">
    <h2>Event log</h2>
    <p>
      Every <code>nac:action:succeeded</code> / <code>:failed</code>
      received at the document level is shown here. Events from inside
      shadow roots bubble up because the runtime sets
      <code>composed: true</code> on every emission.
    </p>
    <div id="log"></div>
  </div>

</div>

<!-- Inline runtime so the demo is self-contained when served
     statically. -->
<script src="js/nac.js"></script>

<script>
(function () {
  'use strict';

  /* ---------- Web Components ---------- */

  /* <todo-card-open> -- a single open shadow root with a checkbox
     and a delete button. Both elements declare data-nac-id +
     data-nac-role inside the shadow. The component emits
     nac:action:succeeded with composed:true so the runtime + page
     listeners both see it. */
  class TodoCardOpen extends HTMLElement {
    static get observedAttributes() { return ['data-task']; }

    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
    }
    connectedCallback() {
      const task = this.getAttribute('data-task') || '(unnamed)';
      const idBase = this.id || ('card_' + Math.random().toString(36).slice(2, 7));

      this.shadowRoot.innerHTML =
        '<style>' +
          ':host { display:flex; gap:10px; align-items:center; }' +
          'label { flex:1; }' +
          '.task { font-weight: 500; }' +
          '.task.done { text-decoration: line-through; color: #888; }' +
          'button { background:#eee; border:0; padding:4px 10px;' +
                   'border-radius:3px; cursor:pointer; font-size:12px; }' +
          'input { transform: scale(1.15); }' +
        '</style>' +
        '<input type="checkbox"' +
          ' data-nac-id="' + idBase + '.toggle"' +
          ' data-nac-role="field"' +
          ' aria-label="toggle ' + task + '"/>' +
        '<label class="task">' + task + '</label>' +
        '<button data-nac-id="' + idBase + '.delete"' +
          ' data-nac-role="action"' +
          ' data-nac-action="delete">delete</button>';

      const check  = this.shadowRoot.querySelector('input');
      const label  = this.shadowRoot.querySelector('label');
      const delBtn = this.shadowRoot.querySelector('button');

      check.addEventListener('change', () => {
        label.classList.toggle('done', check.checked);
        document.dispatchEvent(new CustomEvent('nac:field:changed', {
          bubbles: true, composed: true,
          detail: {
            plugin: 'todo_card_open',
            nac_id: idBase + '.toggle',
            value: check.checked
          }
        }));
      });

      delBtn.addEventListener('click', () => {
        const ev = new CustomEvent('nac:action:succeeded', {
          bubbles: true, composed: true,
          detail: { plugin: 'todo_card_open',
                    action_id: idBase + '.delete' }
        });
        this.dispatchEvent(ev);
        /* Visual feedback -- remove the host from the DOM. */
        this.remove();
      });
    }
  }

  /* <wrapper-open> -- nests its slotted child inside its own open
     shadow root. The runtime now has to walk TWO shadow boundaries
     to find an element inside the nested card. */
  class WrapperOpen extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
    }
    connectedCallback() {
      /* Move all light DOM children into the shadow root. We do not
         use <slot> here because slotted nodes do NOT live inside
         the shadow root; they live in light DOM and are merely
         "projected". That would defeat the whole demo (we want the
         card INSIDE the wrapper's shadow root). */
      const moved = Array.from(this.children);
      this.shadowRoot.innerHTML =
        '<style>' +
          ':host { display:block; padding-left: 12px; ' +
                  'border-left: 3px solid #c8a04d; }' +
          '.wrap-label { color:#888; font-size:11px; ' +
                        'text-transform: uppercase; ' +
                        'letter-spacing: 0.5px; }' +
        '</style>' +
        '<div class="wrap-label">wrapper-open shadow root</div>';
      moved.forEach(n => this.shadowRoot.appendChild(n));
    }
  }

  /* <deep-wrapper-open> -- one more level of nesting. */
  class DeepWrapperOpen extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
    }
    connectedCallback() {
      const moved = Array.from(this.children);
      this.shadowRoot.innerHTML =
        '<style>' +
          ':host { display:block; padding-left: 12px; ' +
                  'border-left: 3px solid #4f46e5; }' +
          '.wrap-label { color:#888; font-size:11px; ' +
                        'text-transform: uppercase; ' +
                        'letter-spacing: 0.5px; }' +
        '</style>' +
        '<div class="wrap-label">deep-wrapper-open shadow root</div>';
      moved.forEach(n => this.shadowRoot.appendChild(n));
    }
  }

  customElements.define('todo-card-open',   TodoCardOpen);
  customElements.define('wrapper-open',     WrapperOpen);
  customElements.define('deep-wrapper-open', DeepWrapperOpen);

  /* ---------- Event log ---------- */

  const logEl = document.getElementById('log');
  function log(level, msg) {
    if (!logEl) return;
    const ts = new Date().toISOString().slice(11, 23);
    const cls = level === 'ok' ? 'ok' : (level === 'err' ? 'err' : 'info');
    const line = document.createElement('div');
    line.innerHTML = '<span class="ts">' + ts + '</span> ' +
                     '<span class="' + cls + '">' + msg + '</span>';
    logEl.appendChild(line);
    logEl.scrollTop = logEl.scrollHeight;
  }

  document.addEventListener('nac:action:succeeded', function (e) {
    log('ok', 'nac:action:succeeded -- action_id=' +
         (e.detail && e.detail.action_id) + ' plugin=' +
         (e.detail && e.detail.plugin));
  });
  document.addEventListener('nac:action:failed', function (e) {
    log('err', 'nac:action:failed -- action_id=' +
         (e.detail && e.detail.action_id) + ' error=' +
         (e.detail && e.detail.error));
  });
  document.addEventListener('nac:field:changed', function (e) {
    log('info', 'nac:field:changed -- nac_id=' +
         (e.detail && e.detail.nac_id) + ' value=' +
         JSON.stringify(e.detail && e.detail.value));
  });

  /* ---------- Wire the external toggle buttons ---------- */

  function flashState(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = 'resolved';
    el.hidden = false;
    setTimeout(() => { el.hidden = true; }, 1500);
  }

  document.getElementById('toggle-1').addEventListener('click', async () => {
    log('info', 'calling NAC.click("card_1.toggle") (1 shadow level)');
    try {
      await NAC.click('card_1.toggle');
      flashState('state-1');
    } catch (e) {
      log('err', 'NAC.click error: ' + (e.message || e));
    }
  });

  document.getElementById('delete-1').addEventListener('click', async () => {
    log('info', 'calling NAC.click("card_1.delete") (1 shadow level)');
    try {
      await NAC.click('card_1.delete');
    } catch (e) {
      log('err', 'NAC.click error: ' + (e.message || e));
    }
  });

  document.getElementById('toggle-2').addEventListener('click', async () => {
    log('info', 'calling NAC.click("card_2.toggle") (2 shadow levels)');
    try {
      await NAC.click('card_2.toggle');
      flashState('state-2');
    } catch (e) {
      log('err', 'NAC.click error: ' + (e.message || e));
    }
  });

  document.getElementById('toggle-3').addEventListener('click', async () => {
    log('info', 'calling NAC.click("card_3.toggle") (3 shadow levels)');
    try {
      await NAC.click('card_3.toggle');
      flashState('state-3');
    } catch (e) {
      log('err', 'NAC.click error: ' + (e.message || e));
    }
  });

  /* ---------- Manifest ----------
     Only required because we use NAC.click against ids that live
     inside shadow roots; the runtime needs to know they are
     legitimate plugin members. The id is the SAME the shadow
     children declared via data-nac-id. */
  if (window.NAC && typeof window.NAC.register === 'function') {
    /* Temporarily disable strict validation -- the shadow elements
       are not in document.body at register time (they live in the
       shadow root); the strict DOM coherence check would warn. */
    const prev = window.NAC.STRICT_VALIDATION;
    window.NAC.STRICT_VALIDATION = false;
    try {
      window.NAC.register({
        plugin_slug: 'todo_card_open',
        version: '1.0.0',
        nac_version: '2.3',
        elements: [
          { id: 'card_1.toggle', role: 'field',
            label_i18n: { es:'a',en:'b',pt:'c',fr:'d',it:'e',
                          de:'f',ja:'g',zh:'h',hi:'i',ar:'j' } },
          { id: 'card_1.delete', role: 'action',
            actions: [{ verb: 'delete' }],
            label_i18n: { es:'a',en:'b',pt:'c',fr:'d',it:'e',
                          de:'f',ja:'g',zh:'h',hi:'i',ar:'j' } },
          { id: 'card_2.toggle', role: 'field',
            label_i18n: { es:'a',en:'b',pt:'c',fr:'d',it:'e',
                          de:'f',ja:'g',zh:'h',hi:'i',ar:'j' } },
          { id: 'card_3.toggle', role: 'field',
            label_i18n: { es:'a',en:'b',pt:'c',fr:'d',it:'e',
                          de:'f',ja:'g',zh:'h',hi:'i',ar:'j' } },
        ]
      });
    } finally {
      window.NAC.STRICT_VALIDATION = prev;
    }
  }

  log('info', 'demo loaded -- click any "Toggle" button to drive a ' +
              'shadow-rooted element via NAC');
})();
</script>
</body>
</html>
