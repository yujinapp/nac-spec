/**
 * NAC MCP Interop -- host-side runtime for cross-app navigation.
 *
 * Adds three public functions to window.NAC:
 *
 *   NAC.export_tree(opts?)            -> NACExportV1
 *   NAC.import_remote_tree(payload, conn) -> RemoteHandle
 *   NAC.list_remote_apps()            -> RemoteHandle[]
 *   NAC.disconnect_remote(namespace)  -> void
 *
 * And patches NAC.click / fill / tab / tab_by_label / etc to
 * detect 'remote:<namespace>:<peer_id>' prefixes and proxy the
 * call via the registered transport (http or stdio).
 *
 * Spec: docs/NAC_INTEROP_MCP.md.
 *
 * Status: v2.3 PREVIEW. Lives in branch feat/nac-interop-mcp.
 */

(function (global) {
  'use strict';

  if (!global.NAC) {
    console.warn('[nac-interop] NAC runtime not loaded yet; skipping interop install');
    return;
  }
  if (global.NAC.__interop_installed) return;
  global.NAC.__interop_installed = true;

  var REMOTE_PREFIX = 'remote:';
  var _remotes = Object.create(null);   /* namespace -> RemoteHandle */
  var _origClick, _origFill, _origSelect, _origTab, _origTabByLabel,
      _origGoToSection, _origDragDrop, _origEditField,
      _origDtAddRow, _origDtRemoveRow, _origDtEditCell, _origDtCommit,
      _origDtDiscard, _origDtReadAggregate;

  /* ---------- Helpers ---------- */

  function _now() { return new Date().toISOString(); }

  function _err(code, message) {
    var e = new Error(message);
    e.code = code;
    return e;
  }

  function _parseRemote(nac_id) {
    if (typeof nac_id !== 'string') return null;
    if (nac_id.indexOf(REMOTE_PREFIX) !== 0) return null;
    var rest = nac_id.slice(REMOTE_PREFIX.length);
    var colon = rest.indexOf(':');
    if (colon < 0) return null;
    return {
      namespace: rest.slice(0, colon),
      peer_id:   rest.slice(colon + 1)
    };
  }

  function _emitLocalAck(plugin, action_id, ok, detail) {
    var name = ok ? 'nac:action:succeeded' : 'nac:action:failed';
    document.dispatchEvent(new CustomEvent(name, {
      detail: Object.assign({
        plugin: plugin,
        action_id: action_id,
        is_trusted: false,    /* remote actions are NEVER user-trusted */
        via_interop: true
      }, detail || {})
    }));
  }

  /* ---------- export_tree ---------- */

  function export_tree(opts) {
    opts = opts || {};
    var scope = opts.scope || 'full';
    var includeDom = !!opts.include_dom_state;
    var includeLocales = opts.include_locales || null;

    /* Collect manifests. We prefer NAC.list_registered_plugins
       (v2.3 introspection helper) because it returns EVERY
       registered manifest regardless of DOM mount state -- which
       is the correct behavior for export (a peer can want to
       export a manifest even if the plugin's DOM is currently
       hidden). Fall back to NAC.describe()'s plugin list if the
       helper isn't there (older runtimes). */
    var manifests = {};
    var snap = (typeof global.NAC.describe === 'function') ? global.NAC.describe() : { plugins: [], active: null };
    var pluginSlugs;
    if (typeof global.NAC.list_registered_plugins === 'function') {
      pluginSlugs = global.NAC.list_registered_plugins();
    } else {
      pluginSlugs = (snap.plugins || []).map(function (p) { return p && p.plugin; }).filter(Boolean);
    }
    pluginSlugs.forEach(function (slug) {
      var m = (typeof global.NAC.manifest === 'function') ? global.NAC.manifest(slug) : null;
      if (!m) return;
      if (includeLocales && Array.isArray(includeLocales)) {
        m = _filterLocales(m, includeLocales);
      }
      if (scope === 'active_plugin' && snap.active !== slug) return;
      if (scope.indexOf('plugin_slug:') === 0 && scope.slice(12) !== slug) return;
      manifests[slug] = m;
    });

    /* Collect v2.0 scope tree if available. */
    var scopeTree = [];
    var dataTables = [];
    if (typeof global.NAC.describe_v2 === 'function') {
      try {
        var v2 = global.NAC.describe_v2();
        scopeTree = v2.v2_scope_entries || [];
        dataTables = v2.data_tables || [];
      } catch (e) { /* tolerated */ }
    }

    /* State block. */
    var state = {
      user_lang: (global.NacChat && global.NacChat._lang) || document.documentElement.lang || 'en'
    };
    if (includeDom) {
      state.url   = location.href;
      state.title = document.title;
    }

    return {
      app_id:         global.__YUJIN_APP_ID__ || 'nac-app-' + Math.random().toString(36).slice(2, 10),
      app_version:    global.__YUJIN_APP_VERSION__ || '1.0.0',
      nac_version:    '2.3',
      exported_at:    _now(),
      active_plugin:  snap.active || null,
      manifests:      manifests,
      scope_tree:     scopeTree,
      data_tables:    dataTables,
      state:          state,
      ack_endpoint:   global.__YUJIN_ACK_ENDPOINT__ || null  /* host-configurable */
    };
  }

  function _filterLocales(manifest, locales) {
    /* Deep-clone the manifest with label_i18n restricted to the
       requested locales. Idempotent + side-effect-free. */
    function reduce(obj) {
      if (obj == null || typeof obj !== 'object') return obj;
      if (Array.isArray(obj)) return obj.map(reduce);
      var out = {};
      for (var k in obj) {
        if (!Object.prototype.hasOwnProperty.call(obj, k)) continue;
        if (k === 'label_i18n' && obj[k] && typeof obj[k] === 'object') {
          var filtered = {};
          locales.forEach(function (loc) {
            if (obj[k][loc]) filtered[loc] = obj[k][loc];
          });
          out[k] = filtered;
        } else {
          out[k] = reduce(obj[k]);
        }
      }
      return out;
    }
    return reduce(manifest);
  }

  /* ---------- import_remote_tree ---------- */

  function import_remote_tree(payload, conn) {
    if (!payload || typeof payload !== 'object') {
      throw _err('invalid', 'import_remote_tree: payload required');
    }
    if (!conn || !conn.endpoint || !conn.bearer) {
      throw _err('invalid', 'import_remote_tree: conn.endpoint + conn.bearer required');
    }
    var transport = conn.transport || 'http';
    var namespace = conn.namespace || payload.app_id;
    if (!namespace) throw _err('invalid', 'import_remote_tree: namespace required (no app_id in payload)');
    if (_remotes[namespace]) {
      throw _err('conflict', 'import_remote_tree: namespace "' + namespace + '" already imported; disconnect first');
    }

    /* Register each remote plugin under namespaced slug. */
    var importedPlugins = [];
    for (var slug in payload.manifests) {
      if (!Object.prototype.hasOwnProperty.call(payload.manifests, slug)) continue;
      var m = payload.manifests[slug];
      var nsSlug = REMOTE_PREFIX + namespace + ':' + slug;
      /* Build a namespaced copy of the manifest. */
      var nsManifest = JSON.parse(JSON.stringify(m));
      nsManifest.plugin_slug = nsSlug;
      nsManifest.__interop_origin = { namespace: namespace, peer_plugin: slug };
      /* Prefix every id in elements / tabs / fields / actions. */
      ['elements', 'tabs', 'fields', 'actions'].forEach(function (key) {
        if (Array.isArray(nsManifest[key])) {
          nsManifest[key].forEach(function (el) {
            if (el && el.id)     el.__peer_id = el.id;
            if (el && el.id)     el.id     = REMOTE_PREFIX + namespace + ':' + el.id;
            if (el && el.nac_id) el.__peer_nac_id = el.nac_id;
            if (el && el.nac_id) el.nac_id = REMOTE_PREFIX + namespace + ':' + el.nac_id;
          });
        }
      });
      try {
        global.NAC.register(nsManifest);
        importedPlugins.push(nsSlug);
      } catch (e) {
        console.error('[nac-interop] failed to register namespaced plugin', nsSlug, e);
      }
    }

    /* Build the handle. */
    var handle = {
      namespace:        namespace,
      app_id:           payload.app_id,
      app_version:      payload.app_version,
      nac_version:      payload.nac_version,
      imported_at:      _now(),
      transport:        transport,
      endpoint:         conn.endpoint,
      bearer:           conn.bearer,
      hmac_secret:      conn.hmac_secret || null,
      imported_plugins: importedPlugins,
      sse:              null,
      _stats:           { invocations: 0, successes: 0, failures: 0 }
    };
    _remotes[namespace] = handle;

    /* Auto-subscribe to ack events. */
    if (conn.auto_subscribe !== false && payload.ack_endpoint && transport === 'http') {
      _subscribeRemote(handle, payload.ack_endpoint);
    }

    document.dispatchEvent(new CustomEvent('nac:interop:imported', {
      detail: { namespace: namespace, app_id: payload.app_id, plugins: importedPlugins }
    }));

    return handle;
  }

  function _subscribeRemote(handle, ackEndpoint) {
    if (typeof EventSource === 'undefined') {
      console.warn('[nac-interop] EventSource not available; ack subscription skipped');
      return;
    }
    /* Bearer can't go in headers for EventSource; use ?bearer query
       string per the spec. */
    var url = ackEndpoint
      + (ackEndpoint.indexOf('?') < 0 ? '?' : '&')
      + 'bearer=' + encodeURIComponent(handle.bearer);
    var es = new EventSource(url);
    es.addEventListener('nac:action:succeeded', function (ev) {
      _relayPeerEvent(handle, 'nac:action:succeeded', ev.data);
    });
    es.addEventListener('nac:action:failed', function (ev) {
      _relayPeerEvent(handle, 'nac:action:failed', ev.data);
    });
    es.addEventListener('nac:tab:activated', function (ev) {
      _relayPeerEvent(handle, 'nac:tab:activated', ev.data);
    });
    es.addEventListener('nac:field:changed', function (ev) {
      _relayPeerEvent(handle, 'nac:field:changed', ev.data);
    });
    es.onerror = function (e) {
      console.warn('[nac-interop] SSE error on', handle.namespace, e);
    };
    handle.sse = es;
  }

  function _relayPeerEvent(handle, eventName, dataStr) {
    var detail;
    try { detail = JSON.parse(dataStr); } catch (_) { detail = { raw: dataStr }; }
    /* Namespace the action_id / field_id / tab_id so local
       listeners see the remote: prefix. */
    ['action_id', 'field_id', 'tab_id', 'option_id', 'plugin'].forEach(function (k) {
      if (detail[k] && typeof detail[k] === 'string'
          && detail[k].indexOf(REMOTE_PREFIX) !== 0) {
        detail[k] = REMOTE_PREFIX + handle.namespace + ':' + detail[k];
      }
    });
    detail.via_interop = true;
    detail.is_trusted  = false;
    document.dispatchEvent(new CustomEvent(eventName, { detail: detail }));
  }

  function list_remote_apps() {
    return Object.keys(_remotes).map(function (ns) {
      var h = _remotes[ns];
      return {
        namespace:        h.namespace,
        app_id:           h.app_id,
        nac_version:      h.nac_version,
        imported_at:      h.imported_at,
        imported_plugins: h.imported_plugins.slice(),
        stats:            Object.assign({}, h._stats)
      };
    });
  }

  function disconnect_remote(namespace) {
    var handle = _remotes[namespace];
    if (!handle) return;
    /* Unregister each namespaced plugin. */
    handle.imported_plugins.forEach(function (slug) {
      if (typeof global.NAC.unregister === 'function') {
        try { global.NAC.unregister(slug); } catch (_) {}
      }
    });
    /* Close SSE. */
    if (handle.sse) { try { handle.sse.close(); } catch (_) {} }
    delete _remotes[namespace];
    document.dispatchEvent(new CustomEvent('nac:interop:disconnected', {
      detail: { namespace: namespace, app_id: handle.app_id }
    }));
  }

  /* ---------- HMAC helpers (SubtleCrypto-based) ---------- */

  async function _hmacSign(secret, body) {
    if (!secret || typeof secret !== 'string') return null;
    if (!global.crypto || !global.crypto.subtle) return null;
    var enc = new TextEncoder();
    var key = await global.crypto.subtle.importKey(
      'raw',
      enc.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    var sig = await global.crypto.subtle.sign('HMAC', key, enc.encode(body));
    var arr = new Uint8Array(sig);
    var hex = '';
    for (var i = 0; i < arr.length; i++) {
      hex += arr[i].toString(16).padStart(2, '0');
    }
    return hex;
  }

  /* ---------- Proxy invoke ---------- */

  async function _proxyInvoke(handle, peer_id, action_kind, args) {
    handle._stats.invocations++;
    var body = {
      bearer:   handle.bearer,
      nac_id:   peer_id,
      action:   { kind: action_kind, args: args || {} }
    };
    /* Optional HMAC on sensitive actions; the host can mark verbs
       sensitive via window.__NAC_INTEROP_SENSITIVE_VERBS__. */
    if (handle.hmac_secret) {
      var canonical = JSON.stringify({
        nac_id: body.nac_id, kind: body.action.kind, args: body.action.args
      });
      try { body.hmac = await _hmacSign(handle.hmac_secret, canonical); } catch (_) {}
    }
    var resp;
    try {
      resp = await fetch(handle.endpoint + '/nac.invoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
    } catch (e) {
      handle._stats.failures++;
      throw _err('network', 'nac.invoke network error: ' + e.message);
    }
    if (!resp.ok) {
      handle._stats.failures++;
      throw _err('http_' + resp.status, 'nac.invoke HTTP ' + resp.status);
    }
    var json;
    try { json = await resp.json(); }
    catch (e) {
      handle._stats.failures++;
      throw _err('parse', 'nac.invoke returned non-JSON');
    }
    if (json.ok === false) {
      handle._stats.failures++;
      throw _err((json.error && json.error.code) || 'peer_error',
                 (json.error && json.error.message) || 'peer rejected the invocation');
    }
    handle._stats.successes++;
    return json.result || { ok: true };
  }

  /* ---------- Patch NAC public API to route remote: prefix ---------- */

  function _wrap(fnName, kindForProxy, argMapper) {
    var orig = global.NAC[fnName];
    if (typeof orig !== 'function') return;
    global.NAC[fnName] = async function () {
      var args = Array.prototype.slice.call(arguments);
      var firstArg = args[0];
      var parsed = _parseRemote(firstArg);
      if (!parsed) return orig.apply(global.NAC, args);
      var handle = _remotes[parsed.namespace];
      if (!handle) {
        throw _err('not_found',
          fnName + ': namespace "' + parsed.namespace + '" not imported (call NAC.import_remote_tree first)');
      }
      var peerArgs = (typeof argMapper === 'function') ? argMapper(args, parsed) : {};
      try {
        var result = await _proxyInvoke(handle, parsed.peer_id, kindForProxy, peerArgs);
        _emitLocalAck(REMOTE_PREFIX + parsed.namespace + ':' + (peerArgs.plugin || parsed.peer_id.split('.')[0]),
                      firstArg, true, { result: result });
        return result;
      } catch (e) {
        _emitLocalAck(REMOTE_PREFIX + parsed.namespace,
                      firstArg, false, { error: { code: e.code, message: e.message } });
        throw e;
      }
    };
    return orig;
  }

  _origClick         = _wrap('click',          'click',          function (args) { return { opts: args[1] || {} }; });
  _origFill          = _wrap('fill',           'fill',           function (args) { return { value: args[1] }; });
  _origSelect        = _wrap('select',         'select',         function (args) { return { value: args[1] }; });
  _origGoToSection   = _wrap('go_to_section',  'go_to_section',  function ()     { return {}; });
  _origEditField     = _wrap('edit_field',     'edit_field',     function ()     { return {}; });

  /* tab(plugin, tab_key): if plugin starts with remote: prefix, parse and proxy. */
  _origTab = global.NAC.tab;
  if (typeof _origTab === 'function') {
    global.NAC.tab = async function (plugin, tab_key) {
      var parsedPlugin = _parseRemote(plugin);
      if (!parsedPlugin) return _origTab.call(global.NAC, plugin, tab_key);
      var handle = _remotes[parsedPlugin.namespace];
      if (!handle) throw _err('not_found', 'tab: namespace "' + parsedPlugin.namespace + '" not imported');
      /* tab_key may also have the prefix; strip it if so. */
      var peerTabKey = tab_key;
      var parsedTab = _parseRemote(tab_key);
      if (parsedTab && parsedTab.namespace === parsedPlugin.namespace) {
        peerTabKey = parsedTab.peer_id;
      }
      var result = await _proxyInvoke(handle, parsedPlugin.peer_id,
                                      'tab', { tab_key: peerTabKey });
      _emitLocalAck(plugin, REMOTE_PREFIX + parsedPlugin.namespace + ':' + peerTabKey,
                    true, { result: result });
      return result;
    };
  }

  /* tab_by_label and click_by_verb also accept a plugin arg. */
  _origTabByLabel = global.NAC.tab_by_label;
  if (typeof _origTabByLabel === 'function') {
    global.NAC.tab_by_label = async function (plugin, label, opts) {
      var parsedPlugin = _parseRemote(plugin);
      if (!parsedPlugin) return _origTabByLabel.call(global.NAC, plugin, label, opts);
      var handle = _remotes[parsedPlugin.namespace];
      if (!handle) throw _err('not_found', 'tab_by_label: namespace not imported');
      return _proxyInvoke(handle, parsedPlugin.peer_id, 'tab_by_label', { label: label });
    };
  }

  var _origClickByVerb = global.NAC.click_by_verb;
  if (typeof _origClickByVerb === 'function') {
    global.NAC.click_by_verb = async function (plugin, verb, opts) {
      var parsedPlugin = _parseRemote(plugin);
      if (!parsedPlugin) return _origClickByVerb.call(global.NAC, plugin, verb, opts);
      var handle = _remotes[parsedPlugin.namespace];
      if (!handle) throw _err('not_found', 'click_by_verb: namespace not imported');
      return _proxyInvoke(handle, parsedPlugin.peer_id, 'click_by_verb', { verb: verb });
    };
  }

  /* dt_* family: each takes table_id as first arg. */
  ['dt_add_row', 'dt_remove_row', 'dt_edit_cell',
   'dt_commit', 'dt_discard', 'dt_read_aggregate'].forEach(function (fnName) {
    var orig = global.NAC[fnName];
    if (typeof orig !== 'function') return;
    global.NAC[fnName] = function () {
      var args = Array.prototype.slice.call(arguments);
      var tableId = args[0];
      var parsed = _parseRemote(tableId);
      if (!parsed) return orig.apply(global.NAC, args);
      var handle = _remotes[parsed.namespace];
      if (!handle) throw _err('not_found', fnName + ': namespace not imported');
      var argsPayload = {};
      switch (fnName) {
        case 'dt_add_row':       argsPayload = { values: args[1] || {} }; break;
        case 'dt_remove_row':    argsPayload = { row_id: args[1] }; break;
        case 'dt_edit_cell':     argsPayload = { row_id: args[1], column: args[2], value: args[3] }; break;
        case 'dt_commit':        argsPayload = {}; break;
        case 'dt_discard':       argsPayload = {}; break;
        case 'dt_read_aggregate':argsPayload = { agg_key: args[1], column: args[2] }; break;
      }
      return _proxyInvoke(handle, parsed.peer_id, fnName, argsPayload);
    };
  });

  /* ---------- Expose on NAC ---------- */

  global.NAC.export_tree         = export_tree;
  global.NAC.import_remote_tree  = import_remote_tree;
  global.NAC.list_remote_apps    = list_remote_apps;
  global.NAC.disconnect_remote   = disconnect_remote;

  console.log('[nac-interop] installed (v2.3 preview) on top of NAC ' + global.NAC.version);

})(window);
