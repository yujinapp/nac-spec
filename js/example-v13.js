/* NAC v1.3 demo wiring. Drives every widget on the page through
 * window.NAC primitives. ASCII-pure. License: MIT.
 */
(function () {
  'use strict';

  if (!window.NAC || !window.NAC.__nac_v1_installed) {
    console.error('NAC reference impl not loaded');
    return;
  }

  const $ = function (sel) { return document.querySelector(sel); };
  const $$ = function (sel) { return Array.prototype.slice.call(document.querySelectorAll(sel)); };

  // ---- Manifests ------------------------------------------------
  NAC.register({
    plugin_slug: 'toasts', label: 'Toasts',
    actions: [
      { id: 'toasts.fire_info',    label: 'Info',    verb: 'apply' },
      { id: 'toasts.fire_success', label: 'Success', verb: 'apply' },
      { id: 'toasts.fire_warn',    label: 'Warn',    verb: 'apply' },
      { id: 'toasts.fire_error',   label: 'Error',   verb: 'apply' },
    ],
  });
  NAC.register({ plugin_slug: 'banner', label: 'Banner',
    actions: [{ id: 'banner.dismiss', label: 'Dismiss', verb: 'cancel' }] });
  NAC.register({ plugin_slug: 'toggle', label: 'Toggles',
    fields: [
      { id: 'toggle.notif', role: 'field', field_type: 'toggle', label: 'Notifications' },
      { id: 'toggle.dark',  role: 'field', field_type: 'toggle', label: 'Dark mode' },
    ] });
  NAC.register({ plugin_slug: 'stepper', label: 'Stepper',
    actions: [
      { id: 'stepper.next', label: 'Next', verb: 'step_next' },
      { id: 'stepper.back', label: 'Back', verb: 'step_back' },
    ] });
  NAC.register({ plugin_slug: 'tree', label: 'Tree' });
  NAC.register({ plugin_slug: 'calendar', label: 'Calendar', tabs: [],
    actions: [
      { id: 'cal.demo.view_month', label: 'Month', verb: 'view_change' },
      { id: 'cal.demo.view_week',  label: 'Week',  verb: 'view_change' },
      { id: 'cal.demo.view_day',   label: 'Day',   verb: 'view_change' },
    ] });
  NAC.register({ plugin_slug: 'richtext', label: 'Rich text editor',
    fields: [{ id: 'rt.body', role: 'field', field_type: 'richtext', label: 'Body',
               supported_formats: ['bold','italic','heading','list','link'] }],
    actions: [
      { id: 'rt.bold',   verb: 'format_apply' }, { id: 'rt.italic', verb: 'format_apply' },
      { id: 'rt.h2',     verb: 'format_apply' }, { id: 'rt.list',   verb: 'format_apply' },
      { id: 'rt.link',   verb: 'format_apply' },
    ] });
  NAC.register({ plugin_slug: 'tags', label: 'Tag input',
    fields: [{ id: 'tags.demo', role: 'field', field_type: 'tag-input', label: 'Tags',
               allow_free_input: true, max_tags: 10 }] });
  NAC.register({ plugin_slug: 'rating', label: 'Rating',
    fields: [{ id: 'rate.demo', role: 'field', field_type: 'rating', label: 'Rate',
               min: 1, max: 5, step: 1, icon: 'star' }] });
  NAC.register({ plugin_slug: 'confirm', label: 'Confirmation dialog',
    actions: [
      { id: 'confirm.danger', label: 'Delete account', verb: 'delete' },
      { id: 'confirm.normal', label: 'Apply changes',  verb: 'apply' },
    ] });
  NAC.register({ plugin_slug: 'drawer-host', label: 'Drawer host',
    actions: [
      { id: 'drawer.open_right',  verb: 'open_drawer' },
      { id: 'drawer.open_bottom', verb: 'open_drawer' },
      { id: 'drawer.peek_bottom', verb: 'peek_drawer' },
    ] });
  NAC.register({ plugin_slug: 'pager', label: 'Pagination' });
  NAC.register({ plugin_slug: 'chart', label: 'Chart',
    charts: [{ id: 'chart.sales', label: 'Monthly sales', kind: 'bar',
               series: [{ id: 'chart.sales.s1', label: 'Sales' }] }] });
  NAC.register({ plugin_slug: 'map', label: 'Map',
    maps: [{ id: 'map.demo', label: 'Customer locations', provider: 'schematic',
             default_center: { lat: -34.6, lng: -58.4 }, default_zoom: 4,
             layers: [{ id: 'map.demo.stores', label: 'Stores' }] }] });
  NAC.register({ plugin_slug: 'presence', label: 'Avatar + presence' });
  NAC.register({ plugin_slug: 'emptystate', label: 'Empty state + skeleton' });

  // ---- Events log ----------------------------------------------
  const evtLog = $('[data-nac-id="v13.events.log"]');
  function logEvent(name, detail) {
    if (!evtLog) return;
    const li = document.createElement('li');
    li.className = 'ne-event-row';
    li.textContent = '[' + new Date().toLocaleTimeString() + '] ' + name + ' ' +
      JSON.stringify(detail || {}).slice(0, 220);
    evtLog.appendChild(li);
    evtLog.scrollTop = evtLog.scrollHeight;
  }
  [
    'nac:installed', 'nac:plugin:opened',
    'nac:action:dispatching', 'nac:action:succeeded', 'nac:action:failed',
    'nac:field:changed', 'nac:state:changed',
    'nac:toast:fired', 'nac:toast:dismissed',
    'nac:banner:dismissed',
    'nac:confirm:requested', 'nac:confirm:confirmed', 'nac:confirm:cancelled',
    'nac:step:advanced', 'nac:step:back', 'nac:step:completed',
    'nac:tree:expanded', 'nac:tree:collapsed', 'nac:tree:selected',
    'nac:tags:added', 'nac:tags:removed',
    'nac:drawer:opened', 'nac:drawer:closed', 'nac:drawer:peek',
    'nac:calendar:event_clicked', 'nac:calendar:view_changed', 'nac:calendar:date_selected',
    'nac:chart:point_clicked', 'nac:chart:series_toggled', 'nac:chart:filtered',
    'nac:map:marker_clicked', 'nac:map:layer_toggled', 'nac:map:moved',
    'nac:presence:changed',
    'nac:empty:displayed', 'nac:empty:cta_clicked',
    'nac:richtext:format_applied', 'nac:richtext:link_inserted', 'nac:richtext:mention_picked',
  ].forEach(function (n) {
    document.addEventListener(n, function (ev) { logEvent(n, ev.detail); });
  });

  // ---- A/B Toasts + banner -------------------------------------
  $('[data-nac-id="toasts.fire_info"]').addEventListener('click', function () {
    NAC.toast('Info: archivo guardado.', { severity: 'info' });
  });
  $('[data-nac-id="toasts.fire_success"]').addEventListener('click', function () {
    NAC.toast('Listo. Operacion completa.', { severity: 'success' });
  });
  $('[data-nac-id="toasts.fire_warn"]').addEventListener('click', function () {
    NAC.toast('Atencion: queda poco stock.', { severity: 'warn' });
  });
  $('[data-nac-id="toasts.fire_error"]').addEventListener('click', function () {
    NAC.toast('Error: no se pudo conectar.', { severity: 'error', ttl_ms: 6000 });
  });
  $('[data-nac-id="banner.dismiss"]').addEventListener('click', function () {
    NAC.dismiss_banner('banner.system');
  });

  // ---- C Toggles -----------------------------------------------
  function wireToggle(id) {
    const el = $('[data-nac-id="' + id + '"]');
    if (!el) return;
    el.addEventListener('click', function () {
      const cur = el.getAttribute('data-nac-state') === 'on';
      const next = !cur;
      el.setAttribute('data-nac-state', next ? 'on' : 'off');
      el.setAttribute('aria-checked', String(next));
      document.dispatchEvent(new CustomEvent('nac:field:changed', {
        detail: { nac_id: id, new_value: next, value: next }, bubbles: true,
      }));
    });
  }
  wireToggle('toggle.notif');
  wireToggle('toggle.dark');

  // ---- D Stepper -----------------------------------------------
  $('[data-nac-id="stepper.next"]').addEventListener('click', function () {
    NAC.step_next('stepper.demo');
  });
  $('[data-nac-id="stepper.back"]').addEventListener('click', function () {
    NAC.step_back('stepper.demo');
  });

  // ---- E Tree --------------------------------------------------
  document.addEventListener('click', function (ev) {
    const t = ev.target.closest('[data-nac-role="action"][data-nac-action="expand_node"]');
    if (!t) return;
    const node = t.closest('[data-nac-role="treenode"]');
    if (!node) return;
    const id = node.getAttribute('data-nac-id');
    const state = node.getAttribute('data-nac-state');
    if (state === 'collapsed') { NAC.tree_expand(id);   t.textContent = '-'; }
    else if (state === 'expanded') { NAC.tree_collapse(id); t.textContent = '+'; }
  });
  document.addEventListener('click', function (ev) {
    const node = ev.target.closest('[data-nac-role="treenode"]');
    if (!node) return;
    if (ev.target.closest('[data-nac-role="action"]')) return;
    const id = node.getAttribute('data-nac-id');
    NAC.tree_select(id);
  });

  // ---- F Calendar ----------------------------------------------
  $$('[data-nac-role="calendar-event"]').forEach(function (e) {
    e.addEventListener('click', function () {
      NAC.calendar_select_event(e.getAttribute('data-nac-id'));
    });
  });
  ['month','week','day'].forEach(function (v) {
    const el = $('[data-nac-id="cal.demo.view_' + v + '"]');
    if (el) el.addEventListener('click', function () { NAC.calendar_view('cal.demo', v); });
  });

  // ---- G Rich text ---------------------------------------------
  const rtField = 'rt.body';
  const rtMap = {
    'rt.bold':   { fmt: 'bold' },
    'rt.italic': { fmt: 'italic' },
    'rt.h2':     { fmt: 'heading', value: 2 },
    'rt.list':   { fmt: 'list',    value: 'unordered' },
    'rt.link':   { fmt: 'link' },
  };
  Object.keys(rtMap).forEach(function (id) {
    const el = $('[data-nac-id="' + id + '"]');
    if (!el) return;
    el.addEventListener('click', function () {
      const m = rtMap[id];
      if (m.fmt === 'link') {
        NAC.richtext_insert_link(rtField, 'NAC spec', 'https://github.com/pkuschnirof/nac-spec');
      } else {
        NAC.richtext_format(rtField, m.fmt, m.value);
      }
    });
  });
  $('[data-nac-id="' + rtField + '"]').addEventListener('input', function (ev) {
    document.dispatchEvent(new CustomEvent('nac:field:changed', {
      detail: { nac_id: rtField, new_value: ev.target.innerHTML.length > 30
        ? ev.target.innerHTML.slice(0, 30) + '...'
        : ev.target.innerHTML },
      bubbles: true,
    }));
  });

  // ---- H Tag input ---------------------------------------------
  const tagsRoot = $('[data-nac-id="tags.demo"]');
  const tagsInput = $('[data-nac-id="tags.demo.input"]');

  function rerenderTags() {
    tagsRoot.innerHTML = '';
    NAC.list_tags('tags.demo').forEach(function (val) {
      const chip = document.createElement('span');
      chip.className = 'v13-tag';
      chip.textContent = val + ' ';
      const x = document.createElement('button');
      x.className = 'v13-tag-x';
      x.type = 'button';
      x.setAttribute('aria-label', 'Remove ' + val);
      x.textContent = 'x';
      x.addEventListener('click', function () {
        NAC.remove_tag('tags.demo', val);
        rerenderTags();
      });
      chip.appendChild(x);
      tagsRoot.appendChild(chip);
    });
  }
  tagsInput.addEventListener('keydown', function (ev) {
    if (ev.key === 'Enter') {
      ev.preventDefault();
      const v = tagsInput.value.trim();
      if (v) {
        NAC.add_tag('tags.demo', v);
        tagsInput.value = '';
        rerenderTags();
      }
    }
  });
  // Seed sample tags so the picker is non-empty.
  NAC.add_tag('tags.demo', 'nac');
  NAC.add_tag('tags.demo', 'demo');
  rerenderTags();

  // ---- I Rating ------------------------------------------------
  const rateRoot = $('[data-nac-id="rate.demo"]');
  const stars = $$('.v13-star');
  function paintStars(v) {
    stars.forEach(function (s) {
      if (Number(s.getAttribute('data-v')) <= v) s.classList.add('is-on');
      else s.classList.remove('is-on');
    });
    rateRoot.setAttribute('data-nac-value', String(v));
    rateRoot.setAttribute('data-nac-state', v ? 'dirty' : 'empty');
    document.dispatchEvent(new CustomEvent('nac:field:changed', {
      detail: { nac_id: 'rate.demo', new_value: v, value: v }, bubbles: true,
    }));
  }
  stars.forEach(function (s) {
    s.addEventListener('click', function () {
      paintStars(Number(s.getAttribute('data-v')));
    });
  });

  // ---- J Confirm dialog ----------------------------------------
  $('[data-nac-id="confirm.danger"]').addEventListener('click', function () {
    NAC.confirm('Are you sure you want to delete this account? This is permanent.', { danger: true })
      .then(function (ok) {
        NAC.toast(ok ? 'Account deleted.' : 'Deletion cancelled.', { severity: ok ? 'success' : 'info' });
      });
  });
  $('[data-nac-id="confirm.normal"]').addEventListener('click', function () {
    NAC.confirm('Apply pending changes now?')
      .then(function (ok) {
        NAC.toast(ok ? 'Changes applied.' : 'Cancelled.', { severity: ok ? 'success' : 'info' });
      });
  });

  // ---- K Drawer ------------------------------------------------
  $('[data-nac-id="drawer.open_right"]').addEventListener('click', function () {
    NAC.open_drawer('drawer.right', 'right');
  });
  $('[data-nac-id="drawer.open_bottom"]').addEventListener('click', function () {
    NAC.open_drawer('drawer.bottom', 'bottom');
  });
  $('[data-nac-id="drawer.peek_bottom"]').addEventListener('click', function () {
    NAC.peek_drawer('drawer.bottom', 25);
  });
  $$('[data-nac-action="close_drawer"]').forEach(function (b) {
    b.addEventListener('click', function () {
      const drawer = b.closest('[data-nac-role="drawer"], [data-nac-role="bottom-sheet"]');
      if (drawer) NAC.close_drawer(drawer.getAttribute('data-nac-id'));
    });
  });

  // ---- L Pagination -------------------------------------------
  const pagerCur = $('[data-nac-id="pager.cards.current"]');
  let pageNum = 1;
  function gotoPage(n) {
    pageNum = Math.max(1, Math.min(5, n));
    pagerCur.textContent = String(pageNum);
    document.dispatchEvent(new CustomEvent('nac:pagination:page_changed', {
      detail: { pager_id: 'pager.cards.pager', current_page: pageNum, total_pages: 5 },
      bubbles: true,
    }));
  }
  $('[data-nac-id="pager.cards.next"]').addEventListener('click', function () { gotoPage(pageNum + 1); });
  $('[data-nac-id="pager.cards.prev"]').addEventListener('click', function () { gotoPage(pageNum - 1); });

  // ---- M Chart -------------------------------------------------
  $$('[data-nac-role="chart-point"]').forEach(function (b) {
    b.addEventListener('click', function () {
      const x = b.getAttribute('data-nac-x');
      const y = Number(b.getAttribute('data-nac-y'));
      const id = b.getAttribute('data-nac-id');
      const series = b.closest('[data-nac-role="chart-series"]').getAttribute('data-nac-id');
      const chart = b.closest('[data-nac-role="chart"]').getAttribute('data-nac-id');
      document.dispatchEvent(new CustomEvent('nac:chart:point_clicked', {
        detail: { chart_id: chart, series: series, x: x, y: y, label: x + ': ' + y, point_id: id },
        bubbles: true,
      }));
      NAC.toast('Drilled into ' + x + ': ' + y, { severity: 'info' });
    });
  });
  $('[data-nac-id="chart.sales.toggle_s1"]').addEventListener('click', function () {
    NAC.chart_toggle_series('chart.sales', 'chart.sales.s1');
  });

  // ---- N Map ---------------------------------------------------
  $$('[data-nac-role="map-marker"]').forEach(function (m) {
    m.addEventListener('click', function () {
      // Clear other selections
      $$('[data-nac-role="map-marker"]').forEach(function (o) {
        if (o !== m) o.setAttribute('data-nac-state', 'idle');
      });
      NAC.map_select_marker(m.getAttribute('data-nac-id'));
    });
  });
  $('[data-nac-id="map.demo.toggle_stores"]').addEventListener('click', function () {
    NAC.map_toggle_layer('map.demo', 'map.demo.stores');
  });

  // ---- O Avatar / presence (toggle Bob's state on click) ------
  const bobPresence = $('[data-nac-id="user.bob.presence"]');
  if (bobPresence) {
    bobPresence.addEventListener('click', function () {
      const cur = bobPresence.getAttribute('data-nac-state');
      const cycle = { online: 'away', away: 'busy', busy: 'offline', offline: 'online' };
      const next = cycle[cur] || 'online';
      bobPresence.setAttribute('data-nac-state', next);
      bobPresence.setAttribute('title', next);
      document.dispatchEvent(new CustomEvent('nac:presence:changed', {
        detail: { user_id: 'user.bob', old_state: cur, new_state: next },
        bubbles: true,
      }));
    });
  }

  // ---- P Empty / skeleton --------------------------------------
  const emptyState = $('[data-nac-id="empty.state"]');
  const skeleton   = $('[data-nac-id="empty.skeleton"]');
  $('[data-nac-id="empty.show_skel"]').addEventListener('click', function () {
    emptyState.setAttribute('data-nac-state', 'hidden');
    skeleton.removeAttribute('hidden');
    skeleton.setAttribute('data-nac-state', 'loading');
    setTimeout(function () {
      // Auto-resolve back to empty state to show the loading -> done -> empty pattern
      skeleton.setAttribute('data-nac-state', 'done');
      skeleton.setAttribute('hidden', 'hidden');
      emptyState.setAttribute('data-nac-state', 'visible');
      document.dispatchEvent(new CustomEvent('nac:empty:displayed', {
        detail: { region_id: 'empty.host', kind: 'no-results' },
        bubbles: true,
      }));
    }, 1500);
  });
  $('[data-nac-id="empty.show_empty"]').addEventListener('click', function () {
    skeleton.setAttribute('data-nac-state', 'done');
    skeleton.setAttribute('hidden', 'hidden');
    emptyState.setAttribute('data-nac-state', 'visible');
    document.dispatchEvent(new CustomEvent('nac:empty:displayed', {
      detail: { region_id: 'empty.host', kind: 'no-results' },
      bubbles: true,
    }));
  });
  $('[data-nac-id="empty.cta"]').addEventListener('click', function () {
    document.dispatchEvent(new CustomEvent('nac:empty:cta_clicked', {
      detail: { region_id: 'empty.host', action_id: 'empty.cta' },
      bubbles: true,
    }));
    NAC.toast('CTA clicked: would open the create form.', { severity: 'success' });
  });

  // ---- O bis. FAB ---------------------------------------------
  $('[data-nac-id="fab.primary"]').addEventListener('click', function () {
    NAC.toast('FAB pressed: primary action fired.', { severity: 'info' });
  });

  // ---- system map provider (so example-v13.php is discoverable)
  NAC.set_system_map_provider(function () {
    const slugs = NAC.list();
    const views = slugs.map(function (s) {
      const m = NAC.manifest(s) || {};
      return {
        id: s, label: m.label || s,
        fields_count:  (m.fields  || []).length,
        actions_count: (m.actions || []).length,
        tabs_count:    (m.tabs    || []).length,
      };
    });
    return Promise.resolve({
      views: views, transitions: [],
      capabilities: {
        entities: views.map(function (v) { return { slug: v.id, label: v.label, verbs: ['drive'] }; }),
        actions: [], reports: [], dashboards: [], integrations: [],
        languages: ['en','es'],
      },
      generated_at: new Date().toISOString(), ttl_seconds: 60,
    });
  });

  // Fire-once banner display event so the runner sees it.
  document.dispatchEvent(new CustomEvent('nac:banner:displayed', {
    detail: { id: 'banner.system', severity: 'warn' }, bubbles: true,
  }));

  // Boot signal
  document.dispatchEvent(new CustomEvent('nac:plugin:opened',
    { detail: { plugin_slug: 'v13_demo' }, bubbles: true }));
})();
