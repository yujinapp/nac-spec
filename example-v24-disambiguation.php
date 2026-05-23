<?php
/**
 * example-v24-disambiguation.php -- NAC v2.4 strict resolution
 * + disambiguation contract demo.
 *
 * Shows the 0-silent-damage invariant of the v2.4 release:
 *
 *   - An agent ambiguous call ("cancel urgent") would have
 *     silently dispatched to the first near-match under the
 *     pre-2.4 lenient indexOf fallback.
 *   - Under v2.4 strict resolution, the call throws
 *     ambiguous_qualifier with err.candidates AND emits
 *     nac:disambiguation_requested on document so reactive
 *     hosts (chat UI, voice agent, screen reader) can prompt
 *     "did you mean A or B?".
 *
 * Live surfaces:
 *
 *   1. Three reservations side by side. Two share the suffix
 *      "__urgent" (morning + evening). One is standard.
 *
 *   2. Three demo buttons emit common agent calls:
 *
 *        cancel urgent              -> ambiguous_qualifier
 *        cancel standard            -> resolves cleanly
 *        cancel nonexistent_id      -> no_matching_instance
 *
 *   3. The disambiguation card appears whenever the runtime
 *      emits nac:disambiguation_requested. It lists each
 *      candidate (DOM-validated id + label). Picking one
 *      re-dispatches the verb against the exact nac_id.
 *
 *   4. A "lenient simulation" button shows what the v2.3
 *      silent-damage path would have done with the same
 *      input: dispatch to the first near-match (here, the
 *      morning reservation) with no signal that it was
 *      ambiguous.
 *
 * Coverage:
 *   - packages/nac/test/stage7-strict-resolution.mjs (shim)
 *   - nac3-bench/bench/scripts/stage7_strict_nac.mjs (live)
 *   - SPEC.md sec 16 (NacError + disambiguation contract)
 *
 * ASCII only.
 */
?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>NAC v2.4 -- strict resolution + disambiguation</title>
<style>
  :root {
    --bg:        #fafaf7;
    --surface:   #ffffff;
    --subtle:    #f5f2ea;
    --border:    #e6e3da;
    --text:      #1a1a1a;
    --text-2:    #555;
    --text-3:    #888;
    --accent:    #4f5b87;
    --gold:      #c8a04d;
    --green:     #2c8a52;
    --red:       #b3463a;
    --serif:     "Noto Serif JP", Georgia, serif;
    --sans:      "DM Sans", system-ui, -apple-system, sans-serif;
    --mono:      ui-monospace, "SF Mono", Menlo, Consolas, monospace;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0; font-family: var(--sans);
    background: var(--bg); color: var(--text); line-height: 1.55;
  }
  .container { max-width: 980px; margin: 0 auto; padding: 32px 24px 80px; }
  header { display: flex; align-items: baseline; gap: 14px; margin-bottom: 18px; }
  header .kanji { font-family: var(--serif); color: var(--gold); font-size: 26px; }
  header h1 { font-size: 26px; margin: 0; }
  header .ver { font-size: 12px; color: var(--text-3); margin-left: auto; }

  .lede { color: var(--text-2); margin-bottom: 28px; max-width: 70ch; }

  .reservations {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 12px; margin-bottom: 24px;
  }
  .res {
    background: var(--surface); border: 1px solid var(--border);
    border-radius: 8px; padding: 14px 16px;
  }
  .res h3 { margin: 0 0 4px; font-size: 15px; }
  .res .when { color: var(--text-3); font-size: 12px; margin-bottom: 12px; font-family: var(--mono); }
  .res .actions { display: flex; gap: 6px; flex-wrap: wrap; }
  .res .actions button {
    padding: 6px 12px; font-size: 12px; border: 1px solid var(--border);
    background: var(--subtle); border-radius: 4px; cursor: pointer;
    font-family: inherit;
  }
  .res .actions button:hover { background: #ece8de; }
  .res .actions button.danger { color: var(--red); border-color: #d8b8b3; }

  .panel {
    background: var(--surface); border: 1px solid var(--border);
    border-radius: 8px; padding: 16px 18px; margin-top: 16px;
  }
  .panel h3 { margin: 0 0 10px; font-size: 15px; }
  .panel .row { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 10px; }
  .panel .row button {
    padding: 8px 14px; font-size: 13px; border: 0;
    background: var(--accent); color: #fff; border-radius: 5px;
    cursor: pointer; font-family: inherit; font-weight: 600;
  }
  .panel .row button:hover { filter: brightness(1.1); }
  .panel .row button.warn { background: #8a7340; }
  .panel .row button.danger { background: var(--red); }

  #disambig-card {
    display: none; background: #fff8e6; border: 1px solid var(--gold);
    border-radius: 8px; padding: 16px 18px; margin-top: 16px;
  }
  #disambig-card.show { display: block; }
  #disambig-card h3 { margin: 0 0 8px; font-size: 15px; color: #6b5320; }
  #disambig-card .reason {
    font-family: var(--mono); font-size: 12px; color: var(--text-2);
    margin-bottom: 12px;
  }
  #disambig-card .candidates { display: flex; flex-direction: column; gap: 6px; }
  #disambig-card .candidates button {
    text-align: left; padding: 10px 12px; border: 1px solid var(--border);
    background: var(--surface); border-radius: 5px; cursor: pointer;
    font-family: inherit; font-size: 13px;
  }
  #disambig-card .candidates button:hover { background: var(--subtle); border-color: var(--accent); }
  #disambig-card .candidates b { color: var(--accent); }
  #disambig-card .candidates code {
    font-family: var(--mono); font-size: 11px; color: var(--text-3); display: block;
  }

  #log {
    background: #0e1117; color: #cbd5e1; padding: 12px 14px;
    border-radius: 6px; margin-top: 16px; font-family: var(--mono);
    font-size: 12px; min-height: 80px; max-height: 280px; overflow-y: auto;
  }
  #log .entry { margin-bottom: 4px; }
  #log .ok    { color: #4ade80; }
  #log .warn  { color: #fbbf24; }
  #log .err   { color: #f87171; }
  #log .info  { color: #93c5fd; }
  #log .ghost { color: #6b7280; }
</style>
</head>
<body data-nac-plugin="bookings">

<div class="container">

<header data-nac-id="bookings.header" data-nac-role="region">
  <span class="kanji" aria-hidden="true">&#23494;</span>
  <h1>Reservations</h1>
  <span class="ver">NAC v2.4 -- strict resolution + disambiguation</span>
</header>

<p class="lede" data-nac-id="bookings.lede" data-nac-role="paragraph">
  Three reservations. Two share the suffix <code>__urgent</code>
  (morning + evening) so the qualifier "urgent" is genuinely
  ambiguous. Under v2.4 the runtime refuses to guess; it throws
  with structured candidates so a chat / voice / screen-reader
  host can re-prompt. The "lenient simulation" button below
  shows what v2.3 would have done: silently dispatch to the
  first near-match.
</p>

<!-- Reservation cards -->
<div class="reservations">

  <div class="res" data-nac-id="bookings.res.morning" data-nac-role="region">
    <h3>Acme Co -- annual review</h3>
    <div class="when">2026-05-24  08:30 -- 10:00  (URGENT)</div>
    <div class="actions">
      <button data-nac-id="bookings.cancel.morning__urgent"
              data-nac-role="action" data-nac-action="cancel"
              class="danger"
              data-instance-label="Morning - Acme">Cancel</button>
      <button data-nac-id="bookings.confirm.morning__urgent"
              data-nac-role="action" data-nac-action="confirm">Confirm</button>
    </div>
  </div>

  <div class="res" data-nac-id="bookings.res.evening" data-nac-role="region">
    <h3>Hoshi LLC -- contract review</h3>
    <div class="when">2026-05-24  18:00 -- 19:30  (URGENT)</div>
    <div class="actions">
      <button data-nac-id="bookings.cancel.evening__urgent"
              data-nac-role="action" data-nac-action="cancel"
              class="danger"
              data-instance-label="Evening - Hoshi">Cancel</button>
      <button data-nac-id="bookings.confirm.evening__urgent"
              data-nac-role="action" data-nac-action="confirm">Confirm</button>
    </div>
  </div>

  <div class="res" data-nac-id="bookings.res.standard" data-nac-role="region">
    <h3>Kawa GmbH -- discovery</h3>
    <div class="when">2026-05-26  14:00 -- 15:00  (standard)</div>
    <div class="actions">
      <button data-nac-id="bookings.cancel.kawa__standard"
              data-nac-role="action" data-nac-action="cancel"
              class="danger"
              data-instance-label="Standard - Kawa">Cancel</button>
      <button data-nac-id="bookings.confirm.kawa__standard"
              data-nac-role="action" data-nac-action="confirm">Confirm</button>
    </div>
  </div>

</div>

<!-- Agent simulation -->
<div class="panel" data-nac-id="bookings.simulator" data-nac-role="region">
  <h3>Simulate an agent intent</h3>
  <div class="row">
    <button id="sim-ambig"
            data-nac-id="bookings.sim.ambig" data-nac-role="action"
            data-nac-action="simulate_ambiguous">
      Cancel "urgent" (ambiguous)
    </button>
    <button id="sim-ok"
            data-nac-id="bookings.sim.ok" data-nac-role="action"
            data-nac-action="simulate_clean">
      Cancel "standard" (clean)
    </button>
    <button id="sim-missing"
            data-nac-id="bookings.sim.missing" data-nac-role="action"
            data-nac-action="simulate_missing">
      Cancel "nonexistent" (no match)
    </button>
    <button id="sim-lenient"
            data-nac-id="bookings.sim.lenient" data-nac-role="action"
            data-nac-action="simulate_lenient_v23"
            class="warn">
      Lenient v2.3 simulation
    </button>
  </div>
</div>

<!-- Disambiguation card (host-rendered) -->
<div id="disambig-card" data-nac-id="bookings.disambig" data-nac-role="region">
  <h3>Did you mean ...</h3>
  <div class="reason" id="disambig-reason"></div>
  <div class="candidates" id="disambig-candidates"></div>
</div>

<!-- Event log -->
<div id="log" aria-live="polite" data-nac-id="bookings.log" data-nac-role="region"></div>

</div>

<script src="js/nac.js?v=v74-2026-05-23-v24-disambig"></script>
<script>
(function(){
  /* ----- Manifest -- declare the bookings plugin to NAC.
     We register one base id per reservation so the runtime can
     resolve cancel/confirm verbs against a concrete instance.
     Note the suffix pattern: the two URGENT reservations both
     end in __urgent so the qualifier "urgent" matches both. */
  NAC.register('bookings', {
    plugin_slug: 'bookings',
    elements: [
      { id: 'bookings.cancel.morning',  role: 'action', actions: [{verb: 'cancel'}] },
      { id: 'bookings.cancel.evening',  role: 'action', actions: [{verb: 'cancel'}] },
      { id: 'bookings.cancel.kawa',     role: 'action', actions: [{verb: 'cancel'}] },
      { id: 'bookings.confirm.morning', role: 'action', actions: [{verb: 'confirm'}] },
      { id: 'bookings.confirm.evening', role: 'action', actions: [{verb: 'confirm'}] },
      { id: 'bookings.confirm.kawa',    role: 'action', actions: [{verb: 'confirm'}] },
    ],
  });

  /* ----- Each cancel button gets a real handler via bindAction ----- */
  document.querySelectorAll('[data-nac-action="cancel"]').forEach(function(el){
    if (!el.id || !el.id.startsWith('sim-')) {
      NAC.bindAction(el, function(){
        var label = el.getAttribute('data-instance-label') || el.getAttribute('data-nac-id');
        log('ok', 'Cancelled: ' + label);
        el.disabled = true;
        el.textContent = 'Cancelled';
      }, { plugin: 'bookings', action_id: el.getAttribute('data-nac-id') });
    }
  });
  document.querySelectorAll('[data-nac-action="confirm"]').forEach(function(el){
    NAC.bindAction(el, function(){
      log('ok', 'Confirmed: ' + (el.parentElement.parentElement.querySelector('h3').textContent));
      el.disabled = true;
      el.textContent = 'Confirmed';
    }, { plugin: 'bookings', action_id: el.getAttribute('data-nac-id') });
  });

  /* ----- Disambiguation listener: host UI catches the event ----- */
  document.addEventListener('nac:disambiguation_requested', function(e){
    var d = e.detail || {};
    var card = document.getElementById('disambig-card');
    var reason = document.getElementById('disambig-reason');
    var list = document.getElementById('disambig-candidates');

    reason.textContent = 'reason=' + d.reason +
      '   method=' + d.method +
      '   query=' + JSON.stringify(d.query);
    list.innerHTML = '';

    (d.candidates || []).forEach(function(c){
      var b = document.createElement('button');
      b.innerHTML = '<b>' + escapeHtml(c.label || '(no label)') + '</b>' +
                    '<code>' + escapeHtml(c.nac_id) + '</code>';
      b.addEventListener('click', function(){
        log('info', 'User picked: ' + c.nac_id);
        card.classList.remove('show');
        /* Re-dispatch the verb against the exact nac_id. */
        NAC.click(c.nac_id).catch(function(err){
          log('err', 'Re-dispatch failed: ' + err.message);
        });
      });
      list.appendChild(b);
    });

    card.classList.add('show');
    log('warn', 'Disambiguation requested (' + (d.candidates || []).length + ' candidates)');
  });

  /* ----- Wire the simulator buttons ----- */
  document.getElementById('sim-ambig').addEventListener('click', function(){
    log('ghost', '> NAC.click_by_verb("bookings", "cancel", { qualifier: "urgent" })');
    NAC.click_by_verb('bookings', 'cancel', { qualifier: 'urgent' })
      .then(function(){ log('ok', '   resolved (unexpected for ambiguous)'); })
      .catch(function(err){
        log('err', '   threw ' + err.code + ': ' + err.message);
      });
  });

  document.getElementById('sim-ok').addEventListener('click', function(){
    log('ghost', '> NAC.click_by_verb("bookings", "cancel", { qualifier: "standard" })');
    NAC.click_by_verb('bookings', 'cancel', { qualifier: 'standard' })
      .then(function(){ log('ok', '   resolved cleanly'); })
      .catch(function(err){
        log('err', '   threw ' + err.code + ': ' + err.message);
      });
  });

  document.getElementById('sim-missing').addEventListener('click', function(){
    log('ghost', '> NAC.click_by_verb("bookings", "cancel", { qualifier: "nonexistent_id" })');
    NAC.click_by_verb('bookings', 'cancel', { qualifier: 'nonexistent_id' })
      .then(function(){ log('ok', '   resolved (unexpected)'); })
      .catch(function(err){
        log('err', '   threw ' + err.code + ': ' + err.message);
      });
  });

  /* ----- Lenient v2.3 simulation: what would have happened pre-2.4 ----- */
  document.getElementById('sim-lenient').addEventListener('click', function(){
    log('ghost', '> [v2.3 lenient] NAC.click_by_verb("bookings", "cancel", { qualifier: "urgent" })');
    log('warn', '   indexOf fallback: first near-match wins');
    var firstMatch = document.querySelector(
      '[data-nac-action="cancel"][data-nac-id*="urgent"]:not(:disabled)'
    );
    if (firstMatch) {
      log('warn', '   silent dispatch -> ' + firstMatch.getAttribute('data-nac-id'));
      log('err', '   SILENT DAMAGE: the morning reservation was cancelled,');
      log('err', '   but the user may have meant the evening one.');
      firstMatch.click();
    } else {
      log('ghost', '   no near-match left to demonstrate');
    }
  });

  /* ----- Log helpers ----- */
  function log(kind, msg) {
    var d = document.getElementById('log');
    var el = document.createElement('div');
    el.className = 'entry ' + kind;
    el.textContent = msg;
    d.appendChild(el);
    d.scrollTop = d.scrollHeight;
  }
  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  log('info', 'Demo ready. Try the simulator buttons above.');
})();
</script>
</body>
</html>
