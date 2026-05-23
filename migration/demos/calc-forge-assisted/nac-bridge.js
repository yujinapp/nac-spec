/* nac-bridge.js -- emitted by Yujin Forge.
 *
 * Every element decorated with data-nac-role="action" and data-nac-id
 * gets its inline onclick handler routed through NAC.bindAction, so the
 * runtime's nac:action:succeeded contract fires after the host handler
 * runs. Without this bridge, NAC.click() times out after 5 s even
 * though el.click() already executed the host's handler.
 *
 * The plugin slug is read from <body data-nac-plugin="...">. The
 * Forge-decorated HTML always sets that attribute.
 */
(function () {
  function bridge() {
    if (!window.NAC || typeof window.NAC.bindAction !== 'function') {
      if (window.console) console.error('[nac-bridge] window.NAC.bindAction missing -- include nac.browser.js before this bridge.');
      return;
    }
    var pluginSlug = document.body && document.body.getAttribute('data-nac-plugin');
    if (!pluginSlug) {
      if (window.console) console.error('[nac-bridge] <body data-nac-plugin="..."> missing -- cannot scope bindAction.');
      return;
    }
    var els = document.querySelectorAll('[data-nac-role="action"][data-nac-id]');
    var bound = 0;
    els.forEach(function (el) {
      var id = el.getAttribute('data-nac-id');
      var handler = el.onclick;
      if (typeof handler !== 'function') return;
      el.onclick = null;
      try {
        window.NAC.bindAction(el, handler, { plugin: pluginSlug, action_id: id });
        bound++;
      } catch (e) {
        if (window.console) console.error('[nac-bridge] bindAction failed for ' + id, e);
      }
    });
    if (window.console && console.info) {
      console.info('[nac-bridge] bound ' + bound + ' actions for plugin ' + pluginSlug);
    }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bridge);
  } else {
    bridge();
  }
})();
