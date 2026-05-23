<?php
/**
 * example-v23-shadow-closed.php -- NAC v2.3 stable: closed Shadow
 * DOM exposure API (F6) -- POSITIVE + NEGATIVE side-by-side.
 *
 * Closed shadow roots cannot be penetrated from outside the
 * component author's code (it is a browser security boundary,
 * not a NAC3 decision). NAC3 v2.3 defines a VOLUNTARY exposure
 * contract: a component MAY expose an `el.nac3` getter on its
 * host element returning an interface with `query`, `queryAll`
 * (optional) and `describe` (optional). If the component opts
 * in, the runtime delegates. If not, the runtime emits
 * `nac:shadow_blocked` so debugging tooling sees the dead end.
 *
 * This page mounts TWO closed-shadow components side by side so
 * the visitor can compare the contrasted behaviour:
 *
 *   <todo-card-closed-exposed>     POSITIVE: implements el.nac3.
 *                                  External NAC.click resolves.
 *                                  Same UX as open-shadow demo.
 *
 *   <todo-card-closed-blind>       NEGATIVE: closed shadow root,
 *                                  no exposure API, declares
 *                                  data-nac-shadow="closed" on
 *                                  the host so the runtime knows
 *                                  to emit nac:shadow_blocked.
 *                                  NAC.click fails with
 *                                  code='not_found' AND the page
 *                                  hears the blocked event.
 *
 * The event log panel renders every nac:action:succeeded /
 * nac:shadow_blocked / nac:shadow_protocol_violation so visitors
 * see proof of both paths live.
 *
 * Cross-test coverage:
 *   - packages/nac/test/v23-shadow.mjs T4, T5, T6, T7, T8, T9
 *
 * See also:
 *   - SPEC.md sec 5.1.6 (Closed Shadow DOM exposure API)
 *   - guides/SHADOW_DOM_CLOSED.md (exposure authoring guide)
 *   - example-v23-shadow-open.php (open-shadow companion)
 */
?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>NAC3 v2.3 -- Closed Shadow DOM demo</title>
<style>
  :root {
    --yujin-ink:    #1a1a1a;
    --yujin-paper:  #fafaf7;
    --yujin-sumi:   #2c2c2c;
    --yujin-sakura: #c8a04d;
    --yujin-pulse:  #4f46e5;
    --pos-tint:     #ddeed0;
    --pos-stroke:   #6fc88f;
    --neg-tint:     #f5d6d6;
    --neg-stroke:   #d47a7a;
  }
  * { box-sizing: border-box; }
  body {
    font-family: 'DM Sans', -apple-system, system-ui, sans-serif;
    background: var(--yujin-paper);
    color: var(--yujin-ink);
    margin: 0; padding: 32px 24px;
    line-height: 1.55;
  }
  .wrap { max-width: 1080px; margin: 0 auto; }
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

  .grid {
    display: grid; gap: 18px;
    grid-template-columns: 1fr 1fr;
  }
  @media (max-width: 760px) { .grid { grid-template-columns: 1fr; } }

  .case {
    border-radius: 6px; padding: 16px;
    border: 1px solid #d5d2c9;
  }
  .case.positive { background: #f3faf0; border-color: var(--pos-stroke); }
  .case.negative { background: #fcf2f2; border-color: var(--neg-stroke); }
  .case-label {
    display: inline-block; margin-bottom: 6px;
    padding: 2px 9px; border-radius: 3px;
    font-size: 11px; letter-spacing: 0.5px; text-transform: uppercase;
    font-weight: 600;
  }
  .case.positive .case-label { background: var(--pos-stroke); color: #fff; }
  .case.negative .case-label { background: var(--neg-stroke); color: #fff; }
  .case h3 { margin: 4px 0 8px; font-size: 16px; }

  .ctl-row {
    display: flex; gap: 8px; flex-wrap: wrap;
    align-items: center; margin: 12px 0 4px;
  }
  .ctl-row button {
    background: var(--yujin-ink); color: #f5f5f5;
    border: 0; border-radius: 4px;
    padding: 8px 14px; font-size: 13px;
    font-family: inherit; font-weight: 500;
    cursor: pointer;
  }
  .ctl-row button:hover { background: var(--yujin-sumi); }

  .verdict {
    margin-top: 8px;
    padding: 8px 10px;
    border-radius: 4px;
    font-size: 12px;
    font-family: 'Fira Code', monospace;
    min-height: 18px;
    background: #fff;
    border: 1px dashed #c8c5be;
    color: #666;
  }
  .verdict.ok  { background: #ddeed0; color: #245018; border-style: solid; border-color: #6fc88f; }
  .verdict.err { background: #f5d6d6; color: #5a1e1e; border-style: solid; border-color: #d47a7a; }

  todo-card-closed-exposed,
  todo-card-closed-blind {
    display: block;
    border: 1px solid #d5d2c9;
    border-radius: 5px;
    padding: 10px 14px;
    margin: 8px 0;
    background: #fff;
    font-size: 14px;
  }

  #log {
    background: #1a1a1a; color: #d4d4cf;
    padding: 12px 14px; border-radius: 5px;
    font-family: 'Fira Code', 'SF Mono', monospace;
    font-size: 12px; line-height: 1.55;
    height: 280px; overflow-y: auto;
    margin-top: 6px;
    border: 1px solid #2c2c2c;
  }
  #log .ts { color: #888; }
  #log .ok { color: #6fc88f; }
  #log .info { color: #8ec1d4; }
  #log .err { color: #d47a7a; }
  #log .warn { color: #e8c97a; }

  code { background: #f0eee8; padding: 1px 6px; border-radius: 3px; font-size: 13px; }
  hr { border: 0; border-top: 1px solid #ece8df; margin: 26px 0; }

  details summary {
    cursor: pointer; font-weight: 500; font-size: 13px;
    color: var(--yujin-pulse); margin: 8px 0;
  }
  details pre {
    background: #f7f5f0; padding: 10px 12px; border-radius: 4px;
    font-size: 11.5px; line-height: 1.5; overflow-x: auto;
    border-left: 3px solid var(--yujin-sakura);
  }
</style>
</head>
<body>
<div class="wrap">

  <h1>NAC3 v2.3 -- Closed Shadow DOM</h1>
  <p class="tagline">
    <span class="badge">v2.3 stable</span>&nbsp;
    Two closed-shadow web components side by side. One opts in
    via <code>el.nac3</code>, one does not. Watch the contrast.
  </p>

  <div class="pane">
    <h2>The contract</h2>
    <p>
      A closed shadow root is OPAQUE from outside by browser
      design. NAC3 cannot reach in unless the component
      voluntarily exposes itself by implementing
      <code>get nac3() { return { query(...) } }</code> on its
      host element. If it does, the runtime delegates. If it
      does not, the runtime emits
      <code>nac:shadow_blocked</code> so debugging tooling
      surfaces the dead end.
    </p>
  </div>

  <div class="grid">

    <!-- POSITIVE CASE -->
    <div class="case positive">
      <span class="case-label">Positive case</span>
      <h3>Component implements <code>el.nac3</code></h3>
      <p style="font-size:13px;color:#444">
        Same closed shadow root, same opaque from the outside,
        BUT the author exposes a `query` method. The runtime
        delegates, finds the element, fires the click.
      </p>
      <todo-card-closed-exposed
        id="exposed-card"
        data-task="Submit the order"></todo-card-closed-exposed>
      <div class="ctl-row">
        <button id="btn-pos">Toggle "Submit the order" via NAC</button>
      </div>
      <div id="verdict-pos" class="verdict">awaiting click...</div>

      <details>
        <summary>Show source</summary>
<pre>class TodoCardClosedExposed extends HTMLElement {
  constructor() {
    super();
    /* CLOSED shadow root -- inaccessible from outside. */
    this._shadow = this.attachShadow({ mode: 'closed' });
  }

  /* The voluntary NAC3 exposure contract. */
  get nac3() {
    return {
      query:    sel =&gt; this._shadow.querySelector(sel),
      queryAll: sel =&gt; [...this._shadow.querySelectorAll(sel)],
      describe: () =&gt; [...this._shadow.querySelectorAll('[data-nac-id]')]
        .map(el =&gt; ({
          id:    el.getAttribute('data-nac-id'),
          role:  el.getAttribute('data-nac-role'),
          label: el.textContent.trim().slice(0, 40)
        }))
    };
  }
}</pre>
      </details>
    </div>

    <!-- NEGATIVE CASE -->
    <div class="case negative">
      <span class="case-label">Negative case</span>
      <h3>Component does NOT implement <code>el.nac3</code></h3>
      <p style="font-size:13px;color:#444">
        Same closed shadow root, same opaque-from-outside, BUT
        no exposure method. The runtime cannot find the inner
        element. It emits <code>nac:shadow_blocked</code> with
        <code>reason='not_exposed'</code> so the page sees
        exactly why.
      </p>
      <todo-card-closed-blind
        id="blind-card"
        data-nac-shadow="closed"
        data-task="Submit the order"></todo-card-closed-blind>
      <div class="ctl-row">
        <button id="btn-neg">Toggle "Submit the order" via NAC</button>
      </div>
      <div id="verdict-neg" class="verdict">awaiting click...</div>

      <details>
        <summary>Show source</summary>
<pre>class TodoCardClosedBlind extends HTMLElement {
  constructor() {
    super();
    /* CLOSED shadow root -- inaccessible from outside. */
    this._shadow = this.attachShadow({ mode: 'closed' });
  }

  /* No nac3 getter. The host element declares
     data-nac-shadow="closed" so the NAC3 runtime knows this
     is a deliberate closed boundary (vs an element that has
     no shadow at all) and emits nac:shadow_blocked. */
}</pre>
      </details>
    </div>

  </div>

  <hr/>

  <div class="pane">
    <h2>Event log</h2>
    <p>
      Watch this panel while clicking each "Toggle" button. The
      positive side fires <code>nac:action:succeeded</code>; the
      negative side fires <code>nac:shadow_blocked</code> first,
      then <code>NAC.click</code> rejects with
      <code>code='not_found'</code>.
    </p>
    <div id="log"></div>
  </div>

</div>

<!-- Local NAC3 runtime. -->
<script src="js/nac.js"></script>

<script>
(function () {
  'use strict';

  /* ------------------------------------------------------------------
     POSITIVE component: closed shadow + el.nac3 exposure interface.
     ------------------------------------------------------------------ */
  class TodoCardClosedExposed extends HTMLElement {
    constructor() {
      super();
      this._shadow = this.attachShadow({ mode: 'closed' });
    }

    /* The voluntary NAC3 contract. */
    get nac3() {
      const sh = this._shadow;
      return {
        query:    function (sel) { return sh.querySelector(sel); },
        queryAll: function (sel) { return Array.prototype.slice.call(sh.querySelectorAll(sel)); },
        describe: function () {
          return Array.prototype.slice.call(sh.querySelectorAll('[data-nac-id]'))
            .map(function (el) {
              return {
                id:    el.getAttribute('data-nac-id'),
                role:  el.getAttribute('data-nac-role'),
                label: (el.textContent || '').trim().slice(0, 40)
              };
            });
        }
      };
    }

    connectedCallback() {
      const task   = this.getAttribute('data-task') || '(unnamed)';
      const idBase = this.id || 'exposed_' + Math.random().toString(36).slice(2, 7);

      this._shadow.innerHTML =
        '<style>' +
          ':host { display:flex; gap:10px; align-items:center; }' +
          '.task { font-weight: 500; flex: 1; }' +
          '.task.done { text-decoration: line-through; color: #888; }' +
          'input { transform: scale(1.2); }' +
        '</style>' +
        '<input type="checkbox"' +
          ' data-nac-id="' + idBase + '.toggle"' +
          ' data-nac-role="field"' +
          ' aria-label="toggle ' + task + '"/>' +
        '<span class="task">' + task + '</span>';

      const check = this._shadow.querySelector('input');
      const label = this._shadow.querySelector('.task');

      check.addEventListener('change', () => {
        label.classList.toggle('done', check.checked);
        document.dispatchEvent(new CustomEvent('nac:field:changed', {
          bubbles: true, composed: true,
          detail: { plugin: 'todo_card_closed_exposed',
                    nac_id: idBase + '.toggle',
                    value: check.checked }
        }));
        document.dispatchEvent(new CustomEvent('nac:action:succeeded', {
          bubbles: true, composed: true,
          detail: { plugin: 'todo_card_closed_exposed',
                    action_id: idBase + '.toggle',
                    via: 'closed_shadow_via_nac3_exposure' }
        }));
      });
    }
  }

  /* ------------------------------------------------------------------
     NEGATIVE component: closed shadow, NO el.nac3 exposure.
     Declares data-nac-shadow="closed" on its host so the runtime
     can emit nac:shadow_blocked with reason='not_exposed' instead
     of silently failing.
     ------------------------------------------------------------------ */
  class TodoCardClosedBlind extends HTMLElement {
    constructor() {
      super();
      this._shadow = this.attachShadow({ mode: 'closed' });
    }

    /* Deliberately no `get nac3()`. This is the whole point of
       the negative case. */

    connectedCallback() {
      const task = this.getAttribute('data-task') || '(unnamed)';
      this._shadow.innerHTML =
        '<style>' +
          ':host { display:flex; gap:10px; align-items:center; }' +
          '.task { font-weight: 500; flex: 1; }' +
          'input { transform: scale(1.2); }' +
        '</style>' +
        '<input type="checkbox" aria-label="toggle ' + task + '"/>' +
        '<span class="task">' + task +
          ' <em style="color:#999; font-size:11px;">' +
          '(no NAC3 exposure -- visible visually but invisible to agents)' +
          '</em></span>';
    }
  }

  customElements.define('todo-card-closed-exposed', TodoCardClosedExposed);
  customElements.define('todo-card-closed-blind',   TodoCardClosedBlind);

  /* ---------- Event log ---------- */
  const logEl = document.getElementById('log');
  function log(level, msg) {
    if (!logEl) return;
    const ts = new Date().toISOString().slice(11, 23);
    const line = document.createElement('div');
    line.innerHTML =
      '<span class="ts">' + ts + '</span> ' +
      '<span class="' + (level || 'info') + '">' + msg + '</span>';
    logEl.appendChild(line);
    logEl.scrollTop = logEl.scrollHeight;
  }

  document.addEventListener('nac:action:succeeded', function (e) {
    const d = e.detail || {};
    log('ok', 'nac:action:succeeded -- action_id=' + d.action_id +
              ' via=' + (d.via || 'default'));
  });
  document.addEventListener('nac:action:failed', function (e) {
    log('err', 'nac:action:failed -- ' + JSON.stringify(e.detail || {}));
  });
  document.addEventListener('nac:shadow_blocked', function (e) {
    const d = e.detail || {};
    const tag = d.host ? d.host.tagName.toLowerCase() : '?';
    log('warn',
      'nac:shadow_blocked -- host=&lt;' + tag + '&gt; reason=' +
      (d.reason || '?'));
  });
  document.addEventListener('nac:shadow_protocol_violation', function (e) {
    const d = e.detail || {};
    const tag = d.host ? d.host.tagName.toLowerCase() : '?';
    log('err',
      'nac:shadow_protocol_violation -- host=&lt;' + tag + '&gt; msg=' +
      (d.message || '?'));
  });
  document.addEventListener('nac:command:rejected', function (e) {
    const d = e.detail || {};
    if (d.command_method !== 'click') return;
    log('warn',
      'nac:command:rejected -- target=' + d.command_target +
      ' reason=' + d.reason);
  });

  /* ---------- Wire the toggle buttons ---------- */
  document.getElementById('btn-pos').addEventListener('click', async () => {
    const v = document.getElementById('verdict-pos');
    v.className = 'verdict';
    v.textContent = 'calling NAC.click("exposed-card.toggle")...';
    log('info', 'POSITIVE: NAC.click("exposed-card.toggle")');
    try {
      await NAC.click('exposed-card.toggle');
      v.className = 'verdict ok';
      v.textContent = 'OK: NAC reached inside closed shadow via el.nac3.query()';
    } catch (e) {
      v.className = 'verdict err';
      v.textContent = 'unexpected error: ' + (e.message || e);
    }
  });

  document.getElementById('btn-neg').addEventListener('click', async () => {
    const v = document.getElementById('verdict-neg');
    v.className = 'verdict';
    v.textContent = 'calling NAC.click("blind-card.toggle")...';
    log('info', 'NEGATIVE: NAC.click("blind-card.toggle")');
    try {
      await NAC.click('blind-card.toggle');
      v.className = 'verdict err';
      v.textContent = 'unexpected SUCCESS -- closed shadow should NOT be penetrable';
    } catch (e) {
      v.className = 'verdict err';
      v.textContent = 'EXPECTED: NAC.click rejected with code=' +
                      (e.code || 'unknown') +
                      '. Look at the event log: nac:shadow_blocked fired first.';
    }
  });

  /* ---------- Register manifest ---------- */
  if (window.NAC && typeof window.NAC.register === 'function') {
    const prev = window.NAC.STRICT_VALIDATION;
    window.NAC.STRICT_VALIDATION = false;
    try {
      window.NAC.register({
        plugin_slug: 'todo_card_closed_exposed',
        version: '1.0.0',
        nac_version: '2.3',
        elements: [
          { id: 'exposed-card.toggle', role: 'field',
            label_i18n: { es:'a',en:'b',pt:'c',fr:'d',it:'e',
                          de:'f',ja:'g',zh:'h',hi:'i',ar:'j' } }
        ]
      });
      window.NAC.register({
        plugin_slug: 'todo_card_closed_blind',
        version: '1.0.0',
        nac_version: '2.3',
        elements: [
          { id: 'blind-card.toggle', role: 'field',
            label_i18n: { es:'a',en:'b',pt:'c',fr:'d',it:'e',
                          de:'f',ja:'g',zh:'h',hi:'i',ar:'j' } }
        ]
      });
    } finally {
      window.NAC.STRICT_VALIDATION = prev;
    }
  }

  log('info', 'demo loaded -- click each "Toggle" button. Watch the ' +
              'contrast: positive succeeds, negative emits ' +
              'shadow_blocked then rejects.');
})();
</script>
</body>
</html>
