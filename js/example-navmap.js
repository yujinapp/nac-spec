/* NAC v1.2 -- system-map first-contact demo.
 * MIT License -- Pablo Adrian Kuschniroff + Sumi, 2026.
 *
 * What this script does:
 *   1. Registers manifests for inventory / customers / orders.
 *      Each manifest declares transitions[] (the v1.2 way).
 *   2. Wires options resolvers for the customers combobox
 *      (5000 simulated customers, 200 ms latency).
 *   3. Wires window-chrome buttons via NAC.minimize/maximize/restore.
 *   4. Registers a NAC.set_system_map_provider that aggregates
 *      manifests + transitions into a SystemMap.
 *   5. Implements the agent panel:
 *        - Connect & plan: NAC.system_map() -> render tree -> plan.
 *        - Execute: walk the plan via NAC.click + NAC.fill +
 *                   NAC.search_options + NAC.wait_for.
 *
 * No selectors targeting business state. The agent only knows
 * data-nac-id and the manifest. ASCII-pure.
 */
(function () {
  'use strict';

  // ----- helpers -----------------------------------------------
  const $ = function (sel) { return document.querySelector(sel); };
  const evtLog = $('[data-nac-id="navmap.events.log"]');
  const agentLog = $('[data-nac-id="agent.log"]');
  const agentMap = $('[data-nac-id="agent.map"]');
  const agentPlan = $('[data-nac-id="agent.plan"]');

  function emit(name, detail) {
    document.dispatchEvent(new CustomEvent(name, { detail: detail || {}, bubbles: true }));
  }

  function logEvent(name, detail) {
    if (!evtLog) return;
    const li = document.createElement('li');
    li.className = 'ne-event-row';
    const time = new Date().toLocaleTimeString();
    li.textContent = '[' + time + '] ' + name + ' ' +
      JSON.stringify(detail || {}).slice(0, 220);
    evtLog.appendChild(li);
    evtLog.scrollTop = evtLog.scrollHeight;
  }

  function logAgent(line, kind) {
    if (!agentLog) return;
    const li = document.createElement('li');
    if (kind) li.className = 'nm-log-' + kind;
    li.textContent = line;
    agentLog.appendChild(li);
    agentLog.scrollTop = agentLog.scrollHeight;
  }

  // Subscribe to the events the agent will emit + observe.
  [
    'nac:plugin:opened', 'nac:plugin:closed',
    'nac:plugin:minimized', 'nac:plugin:maximized', 'nac:plugin:restored',
    'nac:action:dispatching', 'nac:action:succeeded', 'nac:action:failed',
    'nac:field:changed',
    'nac:options:loading', 'nac:options:loaded', 'nac:options:error',
    'nac:installed'
  ].forEach(function (name) {
    document.addEventListener(name, function (ev) { logEvent(name, ev.detail); });
  });

  // ----- mock customers catalog (5000 entries) -------------------
  const CUST_BASE = [
    'Acme Corp', 'Beta Industries', 'Cogent Systems', 'Delta Air',
    'Edison Labs', 'Fermat & Co', 'Galileo Tech', 'Helios Energy',
    'Iberia SA', 'Jovial Foods', 'Kepler Optics', 'Lambda Group',
    'Meridian Bank', 'Nimbus Cloud', 'Orion Defence', 'Pioneer Films',
    'Quasar Media', 'Rhone Logistics', 'Sumi Studio', 'Tesla Motors',
    'Umbra Telecom', 'Vector Capital', 'Wagner Music', 'Xerion Mining',
    'Yujin Apps', 'Zenith Health'
  ];
  const CUSTOMERS = (function () {
    const out = [];
    for (let i = 0; i < 200; i++) {
      for (let j = 0; j < CUST_BASE.length; j++) {
        out.push(i === 0 ? CUST_BASE[j] : (CUST_BASE[j] + ' ' + (i + 1)));
      }
    }
    return out;
  })();

  // ----- register manifests with v1.2 fields --------------------
  if (!window.NAC || typeof NAC.register !== 'function') {
    logAgent('FATAL: NAC reference impl not loaded.', 'step');
    return;
  }
  NAC.register({
    plugin_slug: 'inventory',
    version: '1.0.0',
    nac_version: '1.2',
    label: 'Inventory',
    actions: [
      { id: 'inventory.reorder', label: 'Reorder', verb: 'click' },
      { id: 'inventory.minimize', label: 'Minimize', verb: 'minimize' },
      { id: 'inventory.maximize', label: 'Maximize', verb: 'maximize' },
      { id: 'inventory.restore',  label: 'Restore',  verb: 'restore' }
    ],
    transitions: [
      { to_view: 'orders', via_action: 'reorder',
        side_effects: ['creates a draft order'] }
    ]
  });
  NAC.register({
    plugin_slug: 'customers',
    version: '1.0.0',
    nac_version: '1.2',
    label: 'Customers',
    fields: [
      {
        id: 'customers.search', role: 'field', field_type: 'combobox',
        label: 'Customer search',
        options_source: 'remote', search_supported: true, min_chars: 2
      }
    ],
    actions: [
      { id: 'customers.minimize', label: 'Minimize', verb: 'minimize' },
      { id: 'customers.maximize', label: 'Maximize', verb: 'maximize' },
      { id: 'customers.restore',  label: 'Restore',  verb: 'restore' }
    ],
    transitions: [
      { to_view: 'orders', via_action: 'create_order_for_selected',
        conditions: [{ field: 'customers.selected', required: true }] }
    ]
  });
  NAC.register({
    plugin_slug: 'orders',
    version: '1.0.0',
    nac_version: '1.2',
    label: 'Orders',
    fields: [
      { id: 'orders.amount',   role: 'field', field_type: 'number', label: 'Amount' },
      { id: 'orders.priority', role: 'field', field_type: 'select', label: 'Priority',
        options_source: 'static',
        options: [
          { value: 'low', label: 'Low' },
          { value: 'normal', label: 'Normal' },
          { value: 'high', label: 'High' },
          { value: 'urgent', label: 'Urgent' }
        ]
      }
    ],
    actions: [
      { id: 'orders.submit', label: 'Submit order', verb: 'submit' },
      { id: 'orders.minimize', label: 'Minimize', verb: 'minimize' },
      { id: 'orders.maximize', label: 'Maximize', verb: 'maximize' },
      { id: 'orders.restore',  label: 'Restore',  verb: 'restore' }
    ]
  });

  // ----- options resolver for customers -------------------------
  NAC.set_options_resolver('customers', 'customers.search', function (q, lim) {
    return new Promise(function (resolve) {
      setTimeout(function () {
        const ql = String(q || '').toLowerCase();
        const limit = Number(lim || 8);
        if (!ql) { resolve([]); return; }
        const out = [];
        for (let i = 0; i < CUSTOMERS.length && out.length < limit; i++) {
          if (CUSTOMERS[i].toLowerCase().indexOf(ql) !== -1) {
            out.push({ value: CUSTOMERS[i], label: CUSTOMERS[i] });
          }
        }
        resolve(out);
      }, 200);
    });
  });

  // ----- system_map provider ------------------------------------
  NAC.set_system_map_provider(function () {
    const slugs = NAC.list();
    const views = [];
    const transitions = [];
    slugs.forEach(function (slug) {
      const m = NAC.manifest(slug);
      if (!m) return;
      views.push({
        id: slug,
        label: m.label || slug,
        fields_count:  (m.fields  || []).length,
        actions_count: (m.actions || []).length,
        tabs_count:    (m.tabs    || []).length
      });
      (m.transitions || []).forEach(function (t) {
        transitions.push({
          from_view: slug,
          to_view:   t.to_view,
          via_action: t.via_action,
          conditions: t.conditions || [],
          side_effects: t.side_effects || []
        });
      });
    });
    return Promise.resolve({
      views: views,
      transitions: transitions,
      capabilities: {
        entities: [
          { slug: 'inventory', label: 'Inventory items', verbs: ['read', 'reorder'] },
          { slug: 'customers', label: 'Customers',       verbs: ['read', 'search', 'select'] },
          { slug: 'orders',    label: 'Orders',          verbs: ['read', 'create', 'submit'] }
        ],
        actions:    [],
        reports:    [],
        dashboards: [],
        integrations: [],
        languages:  ['en']
      },
      generated_at: new Date().toISOString(),
      ttl_seconds: 60
    });
  });

  // ----- wire customer combobox UI ------------------------------
  const custInput  = $('[data-nac-id="customers.search"]');
  const custList   = $('[data-nac-id="customers.list"]');
  const custSelected = $('[data-nac-id="customers.selected"]');

  let custTimer = null;
  function _populateList(opts) {
    custList.innerHTML = '';
    if (!opts.length) {
      custList.setAttribute('data-nac-state', 'collapsed');
      return;
    }
    custList.setAttribute('data-nac-state', 'expanded');
    opts.forEach(function (o, idx) {
      const li = document.createElement('li');
      li.className = 'ne-combo-item';
      li.setAttribute('role', 'option');
      li.setAttribute('data-nac-id', 'customers.option.' + idx);
      li.setAttribute('data-nac-role', 'option');
      li.setAttribute('data-nac-value', o.value);
      li.textContent = o.label;
      li.addEventListener('click', function () {
        custInput.value = o.value;
        custSelected.textContent = o.value;
        custList.innerHTML = '';
        custList.setAttribute('data-nac-state', 'collapsed');
        emit('nac:field:changed',
          { plugin_slug: 'customers', nac_id: 'customers.search', new_value: o.value });
      });
      custList.appendChild(li);
    });
  }

  custInput.addEventListener('input', function () {
    const q = custInput.value.trim();
    if (custTimer) clearTimeout(custTimer);
    if (q.length < 2) {
      custList.innerHTML = '';
      custList.setAttribute('data-nac-state', 'collapsed');
      return;
    }
    custTimer = setTimeout(function () {
      NAC.search_options('customers.search', q, 8).then(_populateList);
    }, 250);
  });

  // ----- wire chrome buttons ------------------------------------
  function _wireChrome(plugin) {
    const root = document.querySelector('[data-nac-plugin="' + plugin + '"]');
    if (!root) return;
    const map = { minimize: NAC.minimize, maximize: NAC.maximize, restore: NAC.restore };
    root.querySelectorAll('.ne-chrome-btn').forEach(function (btn) {
      const verb = btn.getAttribute('data-nac-action');
      btn.addEventListener('click', function () {
        if (map[verb]) map[verb](plugin);
      });
    });
  }
  ['inventory', 'customers', 'orders'].forEach(_wireChrome);

  // ----- wire orders.submit -------------------------------------
  const submitBtn = $('[data-nac-id="orders.submit"]');
  const amountEl  = $('[data-nac-id="orders.amount"]');
  const priorityEl = $('[data-nac-id="orders.priority"]');
  const resultEl  = $('[data-nac-id="orders.result"]');
  const stockEl   = $('[data-nac-id="inventory.stock"]');

  submitBtn.addEventListener('click', function () {
    emit('nac:action:dispatching', { plugin_slug: 'orders', nac_id: 'orders.submit' });
    const customer = custSelected ? custSelected.textContent : '';
    const amount = Number(amountEl.value || 0);
    const priority = priorityEl.value;
    if (!customer || customer === '(none)') {
      resultEl.setAttribute('data-nac-state', 'error');
      resultEl.textContent = 'Customer not selected.';
      emit('nac:action:failed', { plugin_slug: 'orders', nac_id: 'orders.submit', error: 'no_customer' });
      return;
    }
    if (!amount || !priority) {
      resultEl.setAttribute('data-nac-state', 'error');
      resultEl.textContent = 'Amount and priority required.';
      emit('nac:action:failed', { plugin_slug: 'orders', nac_id: 'orders.submit', error: 'missing_fields' });
      return;
    }
    const orderId = 'O-' + (Math.floor(Math.random() * 9000) + 1000);
    resultEl.setAttribute('data-nac-state', 'ok');
    resultEl.textContent = 'Order ' + orderId + ' created for ' + customer +
      ' (' + amount + ' / ' + priority + ').';
    stockEl.textContent = String(Math.max(0, parseInt(stockEl.textContent, 10) - 1));
    emit('nac:action:succeeded',
      { plugin_slug: 'orders', nac_id: 'orders.submit', order_id: orderId });
  });

  // ----- wire inventory.reorder ---------------------------------
  $('[data-nac-id="inventory.reorder"]').addEventListener('click', function () {
    emit('nac:action:dispatching', { plugin_slug: 'inventory', nac_id: 'inventory.reorder' });
    setTimeout(function () {
      stockEl.textContent = String(parseInt(stockEl.textContent, 10) + 50);
      emit('nac:action:succeeded',
        { plugin_slug: 'inventory', nac_id: 'inventory.reorder', delta: 50 });
    }, 150);
  });

  // =============================================================
  // The agent
  // =============================================================
  let _plan = null;

  const connectBtn = $('[data-nac-id="agent.connect"]');
  const executeBtn = $('[data-nac-id="agent.execute"]');
  const resetBtn   = $('[data-nac-id="agent.reset"]');

  function _renderPlan(steps) {
    agentPlan.innerHTML = '';
    steps.forEach(function (s, idx) {
      const li = document.createElement('li');
      li.setAttribute('data-step-idx', String(idx));
      li.setAttribute('data-nac-state', 'pending');
      li.textContent = (idx + 1) + '. ' + s.label;
      agentPlan.appendChild(li);
    });
  }

  function _markStep(idx, state) {
    const li = agentPlan.querySelector('[data-step-idx="' + idx + '"]');
    if (li) li.setAttribute('data-nac-state', state);
  }

  function _goal() {
    // Hard-coded business goal -- in a real product this is the
    // user's chat instruction, classified by an LLM.
    return {
      intent: 'create_order',
      params: {
        customer_query: 'Acme Corp',
        amount: 1500,
        priority: 'high'
      }
    };
  }

  function _planFromMap(map, goal) {
    // Validate the agent can do this with what the map exposed.
    const hasOrders    = map.views.some(function (v) { return v.id === 'orders'; });
    const hasCustomers = map.views.some(function (v) { return v.id === 'customers'; });
    if (!hasOrders || !hasCustomers) {
      throw new Error('System lacks required views for goal=' + goal.intent);
    }
    return [
      { label: 'Search customer "' + goal.params.customer_query + '" via NAC.search_options', kind: 'search' },
      { label: 'Select first match -> sets customers.selected',                                kind: 'select' },
      { label: 'NAC.fill orders.amount = '   + goal.params.amount,                              kind: 'fill_amount' },
      { label: 'NAC.fill orders.priority = ' + goal.params.priority,                            kind: 'fill_priority' },
      { label: 'NAC.click orders.submit',                                                        kind: 'click_submit' },
      { label: 'wait_for nac:action:succeeded',                                                  kind: 'wait_succeeded' }
    ];
  }

  connectBtn.addEventListener('click', function () {
    logAgent('Step 1: NAC.system_map()', 'step');
    NAC.system_map().then(function (map) {
      logAgent('  received ' + map.views.length + ' views, ' +
        map.transitions.length + ' transitions.');
      agentMap.textContent = JSON.stringify(map, null, 2);
      const goal = _goal();
      logAgent('Goal: ' + goal.intent + ' for "' + goal.params.customer_query + '".');
      try {
        _plan = _planFromMap(map, goal);
        _renderPlan(_plan);
        logAgent('Plan ready -- ' + _plan.length + ' steps.', 'step');
        executeBtn.disabled = false;
        emit('nac:plugin:opened', { plugin_slug: 'agent' });
      } catch (e) {
        logAgent('PLAN FAILED: ' + e.message);
      }
    }).catch(function (err) {
      logAgent('ERROR: ' + (err && err.message || err));
    });
  });

  function _delay(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  async function _execute() {
    if (!_plan) return;
    executeBtn.disabled = true;
    const goal = _goal();

    // Step 1 -- search
    _markStep(0, 'active');
    logAgent('  -> NAC.search_options("customers.search", "' + goal.params.customer_query + '", 5)');
    const opts = await NAC.search_options('customers.search', goal.params.customer_query, 5);
    logAgent('  <- ' + opts.length + ' options, picking "' + (opts[0] ? opts[0].label : '(none)') + '"');
    _markStep(0, 'done');

    // Step 2 -- pick first match (simulate user click via fill)
    _markStep(1, 'active');
    if (opts.length) {
      custInput.value = opts[0].value;
      custSelected.textContent = opts[0].value;
      emit('nac:field:changed',
        { plugin_slug: 'customers', nac_id: 'customers.search', new_value: opts[0].value });
    }
    await _delay(120);
    _markStep(1, 'done');

    // Step 3 -- fill amount
    _markStep(2, 'active');
    await NAC.fill('orders.amount', goal.params.amount);
    logAgent('  -> NAC.fill orders.amount = ' + goal.params.amount);
    _markStep(2, 'done');

    // Step 4 -- fill priority
    _markStep(3, 'active');
    await NAC.fill('orders.priority', goal.params.priority);
    logAgent('  -> NAC.fill orders.priority = ' + goal.params.priority);
    _markStep(3, 'done');

    // Step 5 -- click submit
    _markStep(4, 'active');
    logAgent('  -> NAC.click orders.submit');
    await NAC.click('orders.submit');
    _markStep(4, 'done');

    // Step 6 -- wait for action succeeded (already fired sync above,
    // but we still demo the wait_for primitive).
    _markStep(5, 'active');
    logAgent('  -> NAC.wait_for("action:succeeded", 2000)');
    try {
      await NAC.wait_for('action:succeeded', 200);
    } catch (e) {
      // already fired -- that's fine.
    }
    _markStep(5, 'done');

    logAgent('PLAN COMPLETE.', 'step');
  }

  executeBtn.addEventListener('click', function () { _execute(); });

  resetBtn.addEventListener('click', function () {
    agentMap.textContent = '(empty -- click connect)';
    agentPlan.innerHTML = '<li class="nm-plan-empty">(empty -- click connect)</li>';
    agentLog.innerHTML = '';
    evtLog.innerHTML = '';
    custInput.value = '';
    custSelected.textContent = '(none)';
    amountEl.value = '';
    priorityEl.value = '';
    resultEl.removeAttribute('data-nac-state');
    resultEl.textContent = '';
    executeBtn.disabled = true;
    _plan = null;
  });

  // Boot
  emit('nac:plugin:opened', { plugin_slug: 'navmap_demo' });
  logAgent('Ready. Click "Connect & plan" to start.');
})();
