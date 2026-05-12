<?php
/**
 * NAC v1.2 -- system-map first-contact demo.
 *
 * URL: https://yujin.app/nac-spec/example-navmap.php
 *
 * Scenario: an agent connects to a NAC system it has never seen.
 * It calls NAC.system_map() once, receives the full navigation tree
 * + capability inventory, builds its mental model, then plans and
 * executes a 3-step task without further inspection.
 *
 * What this page demonstrates:
 *   1. Three plugins (inventory, customers, orders) registered with
 *      transitions[] declared per manifest.
 *   2. NAC.set_system_map_provider wires a SystemMap-shaped response
 *      that aggregates the manifests + transitions.
 *   3. A scripted "agent" panel that calls system_map(), shows the
 *      tree, plans the path "create order for customer Acme Corp",
 *      and walks it via NAC.click + NAC.fill + NAC.search_options.
 *   4. The right-hand events log shows every NAC event fired during
 *      the autonomous run -- including v1.2 nac:options:* and
 *      nac:plugin:* events.
 *
 * ASCII pure. No backend deps.
 */
$assetVersion = 'v1';
?><!DOCTYPE html>
<html lang="en" data-theme="light">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>NAC v1.2 -- system map demo</title>
<meta name="description" content="NAC v1.2 first-contact discovery: an agent walks an unknown system using NAC.system_map() and acts without scraping.">
<link rel="icon" type="image/svg+xml" href="../assets/favicon.svg">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Noto+Serif+JP:wght@300;400;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="css/example.css?v=<?php echo htmlspecialchars($assetVersion); ?>">
<link rel="stylesheet" href="css/example-navmap.css?v=<?php echo htmlspecialchars($assetVersion); ?>">
</head>
<body>

<header class="ne-topbar">
  <div class="ne-topbar-inner">
    <div class="ne-brand">
      <span class="ne-kanji" aria-hidden="true">&#22320;</span>
      <span class="ne-brand-text">
        <span class="ne-brand-line1">NAC v1.2 -- system map demo</span>
        <span class="ne-brand-line2">first-contact discovery in 60 seconds</span>
      </span>
    </div>
    <nav class="ne-topbar-nav">
      <a href="example.php">main demo</a>
      <a href="https://github.com/pkuschnirof/spec/blob/main/spec/NAC-v1.0.md#14-discoverability-and-dynamic-data-extensions-v12-normative" target="_blank" rel="noopener">spec section 14</a>
      <a href="https://github.com/pkuschnirof/nac-spec" target="_blank" rel="noopener">github</a>
    </nav>
  </div>
</header>

<main class="ne-main">

  <section class="ne-intro">
    <h1 class="ne-h1">An unknown system, walked in three steps.</h1>
    <p class="ne-lede">
      The agent below lands on this page never having seen it before.
      It calls <code>NAC.system_map()</code> once. From the response
      it knows that there are three plugins, that "create order"
      is reachable from <code>orders</code>, and that the
      <code>customer</code> field is a remote autocomplete. Then it
      acts -- picking the customer with <code>NAC.search_options</code>,
      filling the amount, clicking submit. No selectors. No DOM
      scraping. No human help.
    </p>
  </section>

  <section class="nm-grid">

    <article class="nm-agent" aria-labelledby="agent-title">
      <header class="ne-card-head">
        <span class="ne-card-kanji" aria-hidden="true">&#33337;</span>
        <h2 class="ne-h2" id="agent-title">Agent panel</h2>
      </header>
      <p class="ne-card-sub">Click "Connect & plan" to start. No scripted selectors -- everything via <code>window.NAC</code>.</p>
      <div class="nm-agent-controls">
        <button class="ne-btn" data-nac-id="agent.connect" data-nac-role="action" data-nac-action="connect" type="button">
          1. Connect &amp; plan
        </button>
        <button class="ne-btn" data-nac-id="agent.execute" data-nac-role="action" data-nac-action="execute" type="button" disabled>
          2. Execute plan
        </button>
        <button class="ne-btn ne-btn-ghost" data-nac-id="agent.reset" data-nac-role="action" data-nac-action="reset" type="button">
          Reset
        </button>
      </div>
      <h3 class="nm-sub">Discovered system map</h3>
      <pre class="nm-map" data-nac-id="agent.map" data-nac-role="region" aria-label="Discovered system map">(empty -- click connect)</pre>
      <h3 class="nm-sub">Plan</h3>
      <ol class="nm-plan" data-nac-id="agent.plan" data-nac-role="region" aria-label="Generated plan">
        <li class="nm-plan-empty">(empty -- click connect)</li>
      </ol>
      <h3 class="nm-sub">Action log</h3>
      <ol class="nm-log" data-nac-id="agent.log" data-nac-role="region" aria-live="polite" aria-relevant="additions"></ol>
    </article>

    <article class="nm-panel" data-nac-plugin="inventory" data-nac-state="normal" aria-labelledby="inv-title">
      <header class="ne-card-head">
        <span class="ne-card-kanji" aria-hidden="true">&#24235;</span>
        <h2 class="ne-h2" id="inv-title">Inventory</h2>
        <div class="ne-chrome">
          <button class="ne-chrome-btn" data-nac-id="inventory.minimize" data-nac-role="action" data-nac-action="minimize" type="button">_</button>
          <button class="ne-chrome-btn" data-nac-id="inventory.maximize" data-nac-role="action" data-nac-action="maximize" type="button">[ ]</button>
          <button class="ne-chrome-btn" data-nac-id="inventory.restore"  data-nac-role="action" data-nac-action="restore"  type="button">o</button>
        </div>
      </header>
      <p class="ne-card-sub">Stock count + reorder.</p>
      <div class="nm-kv"><span>SKU widgets in stock</span><strong data-nac-id="inventory.stock" data-nac-role="value">142</strong></div>
      <button class="ne-btn ne-btn-ghost" data-nac-id="inventory.reorder" data-nac-role="action" data-nac-action="reorder" type="button">Reorder 50</button>
    </article>

    <article class="nm-panel" data-nac-plugin="customers" data-nac-state="normal" aria-labelledby="cust-title">
      <header class="ne-card-head">
        <span class="ne-card-kanji" aria-hidden="true">&#23458;</span>
        <h2 class="ne-h2" id="cust-title">Customers</h2>
        <div class="ne-chrome">
          <button class="ne-chrome-btn" data-nac-id="customers.minimize" data-nac-role="action" data-nac-action="minimize" type="button">_</button>
          <button class="ne-chrome-btn" data-nac-id="customers.maximize" data-nac-role="action" data-nac-action="maximize" type="button">[ ]</button>
          <button class="ne-chrome-btn" data-nac-id="customers.restore"  data-nac-role="action" data-nac-action="restore"  type="button">o</button>
        </div>
      </header>
      <p class="ne-card-sub">5000 customers, fetched on demand.</p>
      <div class="ne-combobox-wrap">
        <input type="text" class="ne-combobox"
               data-nac-id="customers.search" data-nac-role="field"
               data-nac-field-type="combobox" data-nac-state="normal"
               placeholder="Type 2 chars..." aria-label="Search customer" autocomplete="off">
        <ul class="ne-combo-list" data-nac-id="customers.list"
            data-nac-role="listbox" data-nac-state="collapsed"></ul>
      </div>
      <div class="nm-kv"><span>Selected</span><strong data-nac-id="customers.selected" data-nac-role="value">(none)</strong></div>
    </article>

    <article class="nm-panel" data-nac-plugin="orders" data-nac-state="normal" aria-labelledby="ord-title">
      <header class="ne-card-head">
        <span class="ne-card-kanji" aria-hidden="true">&#27880;</span>
        <h2 class="ne-h2" id="ord-title">Orders</h2>
        <div class="ne-chrome">
          <button class="ne-chrome-btn" data-nac-id="orders.minimize" data-nac-role="action" data-nac-action="minimize" type="button">_</button>
          <button class="ne-chrome-btn" data-nac-id="orders.maximize" data-nac-role="action" data-nac-action="maximize" type="button">[ ]</button>
          <button class="ne-chrome-btn" data-nac-id="orders.restore"  data-nac-role="action" data-nac-action="restore"  type="button">o</button>
        </div>
      </header>
      <p class="ne-card-sub">Create a new order against the selected customer.</p>
      <div class="nm-form-row">
        <label for="ord-amount">Amount</label>
        <input id="ord-amount" type="number" class="ne-input"
               data-nac-id="orders.amount" data-nac-role="field"
               data-nac-field-type="number" data-nac-state="empty"
               aria-label="Order amount" placeholder="0">
      </div>
      <div class="nm-form-row">
        <label for="ord-priority">Priority</label>
        <select id="ord-priority" class="ne-input"
                data-nac-id="orders.priority" data-nac-role="field"
                data-nac-field-type="select" data-nac-state="empty"
                aria-label="Priority">
          <option value="">Select...</option>
          <option value="low">Low</option>
          <option value="normal">Normal</option>
          <option value="high">High</option>
          <option value="urgent">Urgent</option>
        </select>
      </div>
      <button class="ne-btn" data-nac-id="orders.submit" data-nac-role="action" data-nac-action="submit" type="button">
        Create order
      </button>
      <div class="nm-result" data-nac-id="orders.result" data-nac-role="region" aria-live="polite"></div>
    </article>

    <article class="nm-events" aria-labelledby="evt-title">
      <header class="ne-card-head">
        <span class="ne-card-kanji" aria-hidden="true">&#35023;</span>
        <h2 class="ne-h2" id="evt-title">NAC events</h2>
      </header>
      <p class="ne-card-sub">Every interaction the agent does emits these. The agent reads them, not the DOM.</p>
      <ol class="ne-events-log" data-nac-id="navmap.events.log" data-nac-role="region" aria-live="polite" aria-relevant="additions"></ol>
    </article>

  </section>

</main>

<script src="js/nac.js?v=<?php echo htmlspecialchars($assetVersion); ?>"></script>
<script src="js/example-navmap.js?v=<?php echo htmlspecialchars($assetVersion); ?>"></script>

</body>
</html>
