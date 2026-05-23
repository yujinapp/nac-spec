/* Yujin Pilot -- embeddable chat + voice cockpit for any NAC3 app.
 *
 * Drop in: <script src="pilot.bundle.js"></script> after nac.browser.js
 * and any NAC.register() call. Pilot reads window.NAC, the active
 * manifests, and offers a floating button that opens a multi-model
 * agentic chat + voice. User types or speaks an intent; Pilot calls
 * the configured LLM with the manifest; LLM returns a JSON action
 * chain; Pilot dispatches each via NAC.click_by_verb.
 *
 * Configuration (API keys, model selector, voice prefs, mode) lives
 * in localStorage under 'yujin_pilot.config'. Keys never leave the
 * browser. WARNING: this client-side mode is for local + demo use;
 * production deployments should put the LLM call behind a server
 * proxy that holds the key.
 *
 * Build: this file is hand-written, no bundler. ASCII only.
 *
 * License: see ../LICENSE (Apache-2.0 until commercial license lands).
 */
(function (global) {
  'use strict';

  if (global.YujinPilot && global.YujinPilot.__installed) return;

  /* =========================================================
     Configuration + state
     ========================================================= */

  var STORAGE_KEY = 'yujin_pilot.config';
  var DEFAULTS = {
    enabled: true,
    mode: 'small', /* globito | small | large */
    selectedModel: 'claude-sonnet-4-6',
    /* API keys per provider. Empty string = not configured. */
    apiKeys: {
      anthropic: '',
      openai: '',
      google: '',
      deepseek: '',
      groq: ''
    },
    voice: {
      sttEnabled: true,
      ttsEnabled: true,
      ttsProvider: 'web-speech', /* web-speech | elevenlabs | google */
      ttsLocale: 'es-AR',
      elevenLabsKey: '',
      googleTtsKey: ''
    },
    /* Probe to read the app's "result" / state, surfaced back to the
       user. Optional. */
    statusProbe: ''
  };

  /* All models the benchmark exercised, grouped by provider. The
     selector in the settings modal renders them grouped + sorted. */
  var MODEL_CATALOG = [
    { id: 'claude-sonnet-4-6',    provider: 'anthropic', label: 'Claude Sonnet 4.6'    },
    { id: 'claude-haiku-4-5',     provider: 'anthropic', label: 'Claude Haiku 4.5'     },
    { id: 'claude-opus-4-7',      provider: 'anthropic', label: 'Claude Opus 4.7'      },
    { id: 'gpt-5.5',              provider: 'openai',    label: 'GPT-5.5'              },
    { id: 'gpt-4o',               provider: 'openai',    label: 'GPT-4o'               },
    { id: 'gpt-4o-mini',          provider: 'openai',    label: 'GPT-4o mini'          },
    { id: 'o4-mini',              provider: 'openai',    label: 'o4-mini (reasoning)'  },
    { id: 'gemini-2.5-pro',       provider: 'google',    label: 'Gemini 2.5 Pro'       },
    { id: 'gemini-2.5-flash',     provider: 'google',    label: 'Gemini 2.5 Flash'     },
    { id: 'gemini-flash-latest',  provider: 'google',    label: 'Gemini Flash latest'  },
    { id: 'deepseek-chat',        provider: 'deepseek',  label: 'DeepSeek Chat'        },
    { id: 'llama-3.3-70b-versatile',                provider: 'groq', label: 'Llama 3.3 70B (Groq)' },
    { id: 'meta-llama/llama-4-scout-17b-16e-instruct', provider: 'groq', label: 'Llama 4 Scout 17B (Groq)' }
  ];

  function deepMerge(target, source) {
    var out = {};
    var k;
    for (k in target) {
      if (Object.prototype.hasOwnProperty.call(target, k)) out[k] = target[k];
    }
    for (k in source) {
      if (!Object.prototype.hasOwnProperty.call(source, k)) continue;
      if (source[k] && typeof source[k] === 'object' && !Array.isArray(source[k])) {
        out[k] = deepMerge(target[k] || {}, source[k]);
      } else {
        out[k] = source[k];
      }
    }
    return out;
  }

  function loadConfig() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return JSON.parse(JSON.stringify(DEFAULTS));
      var parsed = JSON.parse(raw);
      return deepMerge(DEFAULTS, parsed);
    } catch (e) {
      console.warn('[yujin-pilot] config load failed; using defaults.', e);
      return JSON.parse(JSON.stringify(DEFAULTS));
    }
  }

  function saveConfig(cfg) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg)); }
    catch (e) { console.warn('[yujin-pilot] config save failed.', e); }
  }

  function providerOfModel(modelId) {
    for (var i = 0; i < MODEL_CATALOG.length; i++) {
      if (MODEL_CATALOG[i].id === modelId) return MODEL_CATALOG[i].provider;
    }
    /* Heuristic fallback if a custom model is configured. */
    if (modelId.indexOf('claude') === 0) return 'anthropic';
    if (modelId.indexOf('gpt') === 0 || /^o[134]/.test(modelId)) return 'openai';
    if (modelId.indexOf('gemini') === 0) return 'google';
    if (modelId.indexOf('deepseek') === 0) return 'deepseek';
    if (modelId.indexOf('llama') >= 0 || modelId.indexOf('mistral') === 0) return 'groq';
    return 'anthropic';
  }

  /* =========================================================
     Multi-provider LLM client. All providers go through fetch();
     CORS-friendly endpoints only (Anthropic + OpenAI + DeepSeek
     are CORS-permissive; Google requires the API-key-in-URL flow
     which is also CORS-permissive; Groq is OpenAI-compatible).
     ========================================================= */

  function isReasoningOpenAI(modelId) {
    return /^gpt-5/.test(modelId) || /^o[134](-|$)/.test(modelId);
  }

  function anthropicModelId(id) {
    if (id === 'claude-haiku-4-5') return 'claude-haiku-4-5-20251001';
    return id;
  }

  async function callLLM(cfg, systemPrompt, userText) {
    var modelId = cfg.selectedModel;
    var provider = providerOfModel(modelId);
    var key = cfg.apiKeys[provider];
    if (!key) {
      throw new Error('No API key configured for provider "' + provider + '" (model ' + modelId + '). Open Settings to add it.');
    }
    var t0 = Date.now();
    var result;
    if (provider === 'anthropic')  result = await callAnthropic(modelId, key, systemPrompt, userText);
    else if (provider === 'openai')  result = await callOpenAI(modelId, key, systemPrompt, userText);
    else if (provider === 'google')  result = await callGoogle(modelId, key, systemPrompt, userText);
    else if (provider === 'deepseek')result = await callOpenAICompatible('https://api.deepseek.com/v1', modelId, key, systemPrompt, userText);
    else if (provider === 'groq')    result = await callOpenAICompatible('https://api.groq.com/openai/v1', modelId, key, systemPrompt, userText);
    else throw new Error('Unknown provider: ' + provider);
    result.latency_ms = Date.now() - t0;
    result.provider = provider;
    result.model = modelId;
    return result;
  }

  async function callAnthropic(modelId, key, systemPrompt, userText) {
    var body = {
      model: anthropicModelId(modelId),
      max_tokens: 2048,
      system: systemPrompt,
      messages: [{ role: 'user', content: userText }]
    };
    if (!/^claude-opus-4-7/.test(modelId)) body.temperature = 0;
    var resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify(body)
    });
    if (!resp.ok) throw new Error('Anthropic ' + resp.status + ': ' + (await resp.text()));
    var data = await resp.json();
    var block = (data.content || []).find(function (b) { return b.type === 'text'; });
    return {
      text: (block && block.text) || '',
      tokens_in:  data.usage && data.usage.input_tokens  || 0,
      tokens_out: data.usage && data.usage.output_tokens || 0
    };
  }

  async function callOpenAI(modelId, key, systemPrompt, userText) {
    return callOpenAICompatible('https://api.openai.com/v1', modelId, key, systemPrompt, userText);
  }

  async function callOpenAICompatible(baseUrl, modelId, key, systemPrompt, userText) {
    var body = {
      model: modelId,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userText }
      ]
    };
    if (isReasoningOpenAI(modelId)) {
      body.max_completion_tokens = 4096;
    } else {
      body.max_tokens = 2048;
      body.temperature = 0;
    }
    var resp = await fetch(baseUrl + '/chat/completions', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'authorization': 'Bearer ' + key },
      body: JSON.stringify(body)
    });
    if (!resp.ok) throw new Error('OpenAI-compatible ' + resp.status + ': ' + (await resp.text()));
    var data = await resp.json();
    var msg = data.choices && data.choices[0] && data.choices[0].message;
    return {
      text: (msg && msg.content) || '',
      tokens_in:  data.usage && data.usage.prompt_tokens     || 0,
      tokens_out: data.usage && data.usage.completion_tokens || 0
    };
  }

  async function callGoogle(modelId, key, systemPrompt, userText) {
    var url = 'https://generativelanguage.googleapis.com/v1beta/models/' +
              encodeURIComponent(modelId) + ':generateContent?key=' + encodeURIComponent(key);
    var body = {
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: 'user', parts: [{ text: userText }] }],
      generationConfig: { temperature: 0, maxOutputTokens: 2048 }
    };
    var resp = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!resp.ok) throw new Error('Google ' + resp.status + ': ' + (await resp.text()));
    var data = await resp.json();
    var cand = data.candidates && data.candidates[0];
    var parts = cand && cand.content && cand.content.parts || [];
    var text = parts.map(function (p) { return p.text || ''; }).join('');
    var um = data.usageMetadata || {};
    return { text: text, tokens_in: um.promptTokenCount || 0, tokens_out: um.candidatesTokenCount || 0 };
  }

  /* =========================================================
     JSON extraction (models occasionally wrap in fences)
     ========================================================= */

  function extractJson(text) {
    if (!text) return '';
    var m = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (m && m[1]) return m[1].trim();
    var t = text.trim();
    if (t.charAt(0) === '{' && t.charAt(t.length - 1) === '}') return t;
    var i = t.indexOf('{');
    var j = t.lastIndexOf('}');
    if (i >= 0 && j > i) return t.slice(i, j + 1);
    return t;
  }

  /* =========================================================
     NAC bridge
     ========================================================= */

  function activeManifests() {
    if (!global.NAC || typeof global.NAC.list_registered_plugins !== 'function') return [];
    var slugs = global.NAC.list_registered_plugins();
    var out = [];
    for (var i = 0; i < slugs.length; i++) {
      try { out.push(global.NAC.manifest(slugs[i])); }
      catch (e) { /* skip */ }
    }
    return out;
  }

  function activePlugin() {
    var bodyAttr = document.body && document.body.getAttribute('data-nac-plugin');
    if (bodyAttr) return bodyAttr;
    var slugs = (global.NAC && typeof global.NAC.list_registered_plugins === 'function')
      ? global.NAC.list_registered_plugins() : [];
    return slugs[0] || null;
  }

  async function dispatchVerb(plugin, verb) {
    if (!global.NAC || typeof global.NAC.click_by_verb !== 'function') {
      throw new Error('NAC.click_by_verb missing on page');
    }
    return global.NAC.click_by_verb(plugin, verb);
  }

  /* =========================================================
     System prompt
     ========================================================= */

  function buildSystemPrompt(manifests) {
    var manifestStr = JSON.stringify(manifests);
    return [
      'You drive a UI via the NAC-3 protocol. The page registered the following manifest(s):',
      '',
      '<MANIFEST>',
      manifestStr,
      '</MANIFEST>',
      '',
      'Your job: turn the user\'s intent into a chain of NAC click_by_verb actions.',
      '',
      'OUTPUT FORMAT: a single JSON object, no prose, no markdown fences:',
      '{',
      '  "say": "<short reply to the user in their language>",',
      '  "plugin": "<plugin_slug>",',
      '  "actions": [ { "verb": "<verb>" }, ... ]',
      '}',
      '',
      'Rules:',
      '1. Use ONLY verbs that appear in the manifest\'s elements[].actions[].verb.',
      '2. plugin must equal one of the manifest plugin_slug values.',
      '3. Output actions in execution order.',
      '4. If the intent does not map to any dispatchable verbs, return actions: [] and explain in "say".',
      '5. Keep "say" under 200 chars; the user already sees the UI change.'
    ].join('\n');
  }

  /* =========================================================
     Voice -- STT via Web Speech, TTS via Web Speech / ElevenLabs / Google
     ========================================================= */

  function makeSTT(cfg, onResult, onError) {
    var SR = global.SpeechRecognition || global.webkitSpeechRecognition;
    if (!SR) return null;
    var rec = new SR();
    rec.lang = cfg.voice.ttsLocale || 'es-AR';
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.onresult = function (e) {
      if (e.results && e.results[0] && e.results[0][0]) onResult(e.results[0][0].transcript);
    };
    rec.onerror = function (e) { if (onError) onError(e); };
    return rec;
  }

  async function speak(cfg, text) {
    if (!cfg.voice.ttsEnabled || !text) return;
    var provider = cfg.voice.ttsProvider || 'web-speech';
    if (provider === 'elevenlabs' && cfg.voice.elevenLabsKey) {
      try { await speakElevenLabs(cfg, text); return; }
      catch (e) { console.warn('[yujin-pilot] ElevenLabs TTS failed; falling back to Web Speech.', e); }
    }
    if (provider === 'google' && cfg.voice.googleTtsKey) {
      try { await speakGoogleTTS(cfg, text); return; }
      catch (e) { console.warn('[yujin-pilot] Google TTS failed; falling back to Web Speech.', e); }
    }
    speakWebSpeech(cfg, text);
  }

  function speakWebSpeech(cfg, text) {
    if (!global.speechSynthesis) return;
    var u = new SpeechSynthesisUtterance(text);
    u.lang = cfg.voice.ttsLocale || 'es-AR';
    global.speechSynthesis.speak(u);
  }

  async function speakElevenLabs(cfg, text) {
    /* Default voice id: "Rachel" public preset. Override would be a future
       config option. */
    var voiceId = '21m00Tcm4TlvDq8ikWAM';
    var resp = await fetch('https://api.elevenlabs.io/v1/text-to-speech/' + voiceId, {
      method: 'POST',
      headers: {
        'xi-api-key': cfg.voice.elevenLabsKey,
        'content-type': 'application/json',
        'accept': 'audio/mpeg'
      },
      body: JSON.stringify({ text: text, model_id: 'eleven_turbo_v2' })
    });
    if (!resp.ok) throw new Error('ElevenLabs ' + resp.status);
    var blob = await resp.blob();
    var url = URL.createObjectURL(blob);
    var audio = new Audio(url);
    audio.play();
  }

  async function speakGoogleTTS(cfg, text) {
    var resp = await fetch('https://texttospeech.googleapis.com/v1/text:synthesize?key=' + encodeURIComponent(cfg.voice.googleTtsKey), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        input: { text: text },
        voice: { languageCode: cfg.voice.ttsLocale || 'es-AR' },
        audioConfig: { audioEncoding: 'MP3' }
      })
    });
    if (!resp.ok) throw new Error('Google TTS ' + resp.status);
    var data = await resp.json();
    if (!data.audioContent) throw new Error('Google TTS empty');
    var audio = new Audio('data:audio/mp3;base64,' + data.audioContent);
    audio.play();
  }

  /* =========================================================
     UI
     ========================================================= */

  var YUJIN_BRANCH_SVG = '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">'
    + '<path d="M16 50 Q24 40 32 32 Q40 24 50 14" stroke="#1a1a1a" stroke-width="3" fill="none" stroke-linecap="round"/>'
    + '<circle cx="24" cy="42" r="3" fill="#e8a4b8"/>'
    + '<circle cx="32" cy="32" r="3" fill="#e8a4b8"/>'
    + '<circle cx="40" cy="22" r="3" fill="#e8a4b8"/>'
    + '<circle cx="48" cy="14" r="3" fill="#e8a4b8"/>'
    + '</svg>';

  var state = {
    cfg: null,
    messages: [],
    panelOpen: false,
    listening: false,
    busy: false,
    pizarra: []
  };

  function $(sel, root) { return (root || document).querySelector(sel); }
  function el(tag, attrs, children) {
    var e = document.createElement(tag);
    if (attrs) for (var k in attrs) {
      if (k === 'class') e.className = attrs[k];
      else if (k === 'html') e.innerHTML = attrs[k];
      else if (k.indexOf('on') === 0 && typeof attrs[k] === 'function') e.addEventListener(k.slice(2).toLowerCase(), attrs[k]);
      else e.setAttribute(k, attrs[k]);
    }
    if (children) for (var i = 0; i < children.length; i++) {
      var c = children[i];
      if (typeof c === 'string') e.appendChild(document.createTextNode(c));
      else if (c) e.appendChild(c);
    }
    return e;
  }

  function ensureRoot() {
    var root = document.getElementById('yp-root');
    if (root) return root;
    root = el('div', { id: 'yp-root', class: 'yp-root' });
    document.body.appendChild(root);
    return root;
  }

  function renderFab(root) {
    var existing = $('.yp-fab', root);
    if (existing) existing.remove();
    var fab = el('div', {
      class: 'yp-fab' + (state.cfg.enabled ? '' : ' yp-off'),
      role: 'button',
      'aria-label': 'Yujin Pilot',
      html: YUJIN_BRANCH_SVG,
      onclick: function (e) {
        if (e.shiftKey || e.metaKey || e.ctrlKey) { toggleMenu(); return; }
        if (!state.cfg.enabled) { toggleMenu(); return; }
        cyclePanel();
      },
      oncontextmenu: function (e) { e.preventDefault(); toggleMenu(); }
    });
    var menu = el('div', { class: 'yp-fab-menu', id: 'yp-fab-menu' });
    var modeLabel = state.cfg.mode === 'small' ? 'Modo: chat' :
                    state.cfg.mode === 'large' ? 'Modo: pizarra+voz' :
                    'Modo: globito';
    menu.appendChild(el('button', {
      onclick: function () {
        state.cfg.enabled = !state.cfg.enabled;
        saveConfig(state.cfg); renderAll();
      }
    }, [ state.cfg.enabled ? 'Apagar Pilot' : 'Encender Pilot' ]));
    menu.appendChild(el('hr'));
    menu.appendChild(el('button', {
      onclick: function () { cycleMode(); }
    }, [ modeLabel + ' (click para cambiar)' ]));
    menu.appendChild(el('button', {
      onclick: function () { openSettings(); }
    }, [ 'Configuracion...' ]));
    menu.appendChild(el('hr'));
    menu.appendChild(el('button', {
      onclick: function () { state.messages = []; renderPanel(); }
    }, [ 'Limpiar conversacion' ]));
    fab.appendChild(menu);
    root.appendChild(fab);
  }

  function toggleMenu() {
    var m = $('.yp-fab-menu');
    if (m) m.classList.toggle('yp-open');
  }
  function closeMenu() {
    var m = $('.yp-fab-menu');
    if (m) m.classList.remove('yp-open');
  }

  function cyclePanel() {
    closeMenu();
    state.panelOpen = !state.panelOpen;
    renderPanel();
  }
  function cycleMode() {
    closeMenu();
    var order = ['small', 'large'];
    var i = order.indexOf(state.cfg.mode);
    state.cfg.mode = order[(i + 1) % order.length];
    saveConfig(state.cfg);
    state.panelOpen = true;
    renderPanel();
  }

  function renderPanel() {
    var root = ensureRoot();
    var existing = $('.yp-panel', root);
    if (existing) existing.remove();
    if (!state.panelOpen || !state.cfg.enabled) return;

    var modelLabel = state.cfg.selectedModel;
    var panel = el('div', { class: 'yp-panel yp-open yp-mode-' + state.cfg.mode });

    var header = el('div', { class: 'yp-header' });
    header.appendChild(el('div', { class: 'yp-title' }, ['Yujin Pilot']));
    header.appendChild(el('div', { class: 'yp-model' }, [modelLabel]));
    header.appendChild(el('button', { onclick: openSettings, title: 'Configuracion' }, ['⚙']));
    header.appendChild(el('button', { onclick: function () { state.panelOpen = false; renderPanel(); }, title: 'Cerrar' }, ['×']));
    panel.appendChild(header);

    var body = el('div', { class: 'yp-body' });

    var msgs = el('div', { class: 'yp-messages', id: 'yp-messages' });
    state.messages.forEach(function (m) {
      var msg = el('div', { class: 'yp-msg yp-' + m.role });
      msg.appendChild(el('div', { class: 'yp-msg-role' }, [m.role === 'user' ? 'vos' : m.role]));
      msg.appendChild(el('div', { class: 'yp-msg-text' }, [m.text]));
      if (m.trace) msg.appendChild(el('div', { class: 'yp-actions-trace' }, [m.trace]));
      msgs.appendChild(msg);
    });
    body.appendChild(msgs);

    if (state.cfg.mode === 'large') {
      var piz = el('div', { class: 'yp-pizarra' });
      piz.appendChild(el('h4', null, ['Pizarra']));
      state.pizarra.forEach(function (item) {
        piz.appendChild(el('div', { class: 'yp-pizarra-block ' + (item.ok ? 'yp-ok' : 'yp-fail') }, [item.text]));
      });
      if (state.pizarra.length === 0) {
        piz.appendChild(el('div', { class: 'yp-pizarra-block' }, ['Aqui se muestran las acciones que se dispatchan + su resultado.']));
      }
      body.appendChild(piz);
    }

    var inputRow = el('div', { class: 'yp-input-row' });
    var ta = el('textarea', {
      id: 'yp-input',
      placeholder: 'Escribi tu intencion (ej: "calcula 3 + 4")',
      rows: 1,
      onkeydown: function (e) {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          submitInput(ta.value);
        }
      }
    });
    inputRow.appendChild(ta);
    if (state.cfg.voice.sttEnabled) {
      var mic = el('button', {
        class: 'yp-mic' + (state.listening ? ' yp-listening' : ''),
        title: state.listening ? 'Escuchando...' : 'Hablar',
        onclick: function () { toggleListen(ta); }
      }, ['🎙']);
      inputRow.appendChild(mic);
    }
    var send = el('button', { class: 'yp-btn', onclick: function () { submitInput(ta.value); } }, [ state.busy ? '...' : 'Enviar' ]);
    if (state.busy) send.setAttribute('disabled', 'disabled');
    inputRow.appendChild(send);
    body.appendChild(inputRow);

    panel.appendChild(body);
    root.appendChild(panel);

    /* Auto-scroll messages. */
    var msgsEl = $('#yp-messages', root);
    if (msgsEl) msgsEl.scrollTop = msgsEl.scrollHeight;
  }

  /* ----- Settings modal ----- */

  function openSettings() {
    closeMenu();
    var root = ensureRoot();
    var existing = $('.yp-modal-backdrop', root);
    if (existing) existing.remove();

    var cfg = JSON.parse(JSON.stringify(state.cfg));

    var backdrop = el('div', {
      class: 'yp-modal-backdrop yp-open',
      onclick: function (e) { if (e.target === backdrop) backdrop.remove(); }
    });
    var modal = el('div', { class: 'yp-modal' });

    var header = el('div', { class: 'yp-modal-header' });
    header.appendChild(el('div', { class: 'yp-title' }, ['Yujin Pilot -- Configuracion']));
    header.appendChild(el('button', { onclick: function () { backdrop.remove(); } }, ['×']));
    modal.appendChild(header);

    var body = el('div', { class: 'yp-modal-body' });

    body.appendChild(el('div', { class: 'yp-warn-box' }, [
      'Las API keys se guardan en localStorage del navegador. Modo OK para uso local + demos. ',
      'Para produccion: pone la llamada al LLM detras de un proxy y guarda la key del lado servidor.'
    ]));

    /* Model selector */
    var sModel = el('section');
    sModel.appendChild(el('h3', null, ['Modelo']));
    var modelLbl = el('label');
    modelLbl.appendChild(el('span', { class: 'yp-lbl-text' }, ['Modelo activo']));
    var modelSel = el('select');
    var byProvider = {};
    MODEL_CATALOG.forEach(function (m) {
      (byProvider[m.provider] = byProvider[m.provider] || []).push(m);
    });
    ['anthropic', 'openai', 'google', 'deepseek', 'groq'].forEach(function (p) {
      var group = document.createElement('optgroup');
      group.label = p;
      (byProvider[p] || []).forEach(function (m) {
        var opt = document.createElement('option');
        opt.value = m.id;
        opt.textContent = m.label + (cfg.apiKeys[p] ? '' : ' (sin key)');
        if (cfg.selectedModel === m.id) opt.selected = true;
        group.appendChild(opt);
      });
      modelSel.appendChild(group);
    });
    modelSel.addEventListener('change', function () { cfg.selectedModel = modelSel.value; });
    modelLbl.appendChild(modelSel);
    sModel.appendChild(modelLbl);
    body.appendChild(sModel);

    /* API keys */
    var sKeys = el('section');
    sKeys.appendChild(el('h3', null, ['API keys']));
    [
      ['anthropic', 'Anthropic',  'sk-ant-...'],
      ['openai',    'OpenAI',     'sk-...'],
      ['google',    'Google AI',  'AIza...'],
      ['deepseek',  'DeepSeek',   'sk-...'],
      ['groq',      'Groq',       'gsk_...']
    ].forEach(function (row) {
      var lbl = el('label');
      lbl.appendChild(el('span', { class: 'yp-lbl-text' }, [row[1]]));
      var inp = el('input', { type: 'password', placeholder: row[2], value: cfg.apiKeys[row[0]] || '' });
      inp.addEventListener('input', function () { cfg.apiKeys[row[0]] = inp.value; });
      lbl.appendChild(inp);
      sKeys.appendChild(lbl);
    });
    body.appendChild(sKeys);

    /* Voice */
    var sVoice = el('section');
    sVoice.appendChild(el('h3', null, ['Voz']));
    var sttLbl = el('label');
    var sttIn = el('input', { type: 'checkbox' });
    sttIn.checked = !!cfg.voice.sttEnabled;
    sttIn.addEventListener('change', function () { cfg.voice.sttEnabled = sttIn.checked; });
    sttLbl.appendChild(sttIn);
    sttLbl.appendChild(document.createTextNode(' Activar STT (mic) -- usa Web Speech API'));
    sVoice.appendChild(sttLbl);

    var ttsLbl = el('label');
    var ttsIn = el('input', { type: 'checkbox' });
    ttsIn.checked = !!cfg.voice.ttsEnabled;
    ttsIn.addEventListener('change', function () { cfg.voice.ttsEnabled = ttsIn.checked; });
    ttsLbl.appendChild(ttsIn);
    ttsLbl.appendChild(document.createTextNode(' Activar TTS (voz respuesta)'));
    sVoice.appendChild(ttsLbl);

    var prvLbl = el('label');
    prvLbl.appendChild(el('span', { class: 'yp-lbl-text' }, ['Proveedor TTS']));
    var prvSel = el('select');
    ['web-speech', 'elevenlabs', 'google'].forEach(function (p) {
      var o = document.createElement('option');
      o.value = p; o.textContent = p;
      if (cfg.voice.ttsProvider === p) o.selected = true;
      prvSel.appendChild(o);
    });
    prvSel.addEventListener('change', function () { cfg.voice.ttsProvider = prvSel.value; });
    prvLbl.appendChild(prvSel);
    sVoice.appendChild(prvLbl);

    var localeLbl = el('label');
    localeLbl.appendChild(el('span', { class: 'yp-lbl-text' }, ['Locale (ej: es-AR, en-US, pt-BR)']));
    var localeIn = el('input', { type: 'text', value: cfg.voice.ttsLocale || 'es-AR' });
    localeIn.addEventListener('input', function () { cfg.voice.ttsLocale = localeIn.value; });
    localeLbl.appendChild(localeIn);
    sVoice.appendChild(localeLbl);

    var elLbl = el('label');
    elLbl.appendChild(el('span', { class: 'yp-lbl-text' }, ['ElevenLabs key (opcional)']));
    var elIn = el('input', { type: 'password', placeholder: 'xi-...', value: cfg.voice.elevenLabsKey || '' });
    elIn.addEventListener('input', function () { cfg.voice.elevenLabsKey = elIn.value; });
    elLbl.appendChild(elIn);
    sVoice.appendChild(elLbl);

    var gLbl = el('label');
    gLbl.appendChild(el('span', { class: 'yp-lbl-text' }, ['Google TTS key (opcional)']));
    var gIn = el('input', { type: 'password', placeholder: 'AIza...', value: cfg.voice.googleTtsKey || '' });
    gIn.addEventListener('input', function () { cfg.voice.googleTtsKey = gIn.value; });
    gLbl.appendChild(gIn);
    sVoice.appendChild(gLbl);

    body.appendChild(sVoice);

    /* Mode + status probe */
    var sMode = el('section');
    sMode.appendChild(el('h3', null, ['Comportamiento']));
    var modeLbl = el('label');
    modeLbl.appendChild(el('span', { class: 'yp-lbl-text' }, ['Modo']));
    var modeSel = el('select');
    [['small','chat'],['large','pizarra+voz+chat']].forEach(function (m) {
      var o = document.createElement('option');
      o.value = m[0]; o.textContent = m[1];
      if (cfg.mode === m[0]) o.selected = true;
      modeSel.appendChild(o);
    });
    modeSel.addEventListener('change', function () { cfg.mode = modeSel.value; });
    modeLbl.appendChild(modeSel);
    sMode.appendChild(modeLbl);

    var probeLbl = el('label');
    probeLbl.appendChild(el('span', { class: 'yp-lbl-text' }, ['CSS selector para leer estado (opcional)']));
    var probeIn = el('input', { type: 'text', placeholder: 'ej: #display', value: cfg.statusProbe || '' });
    probeIn.addEventListener('input', function () { cfg.statusProbe = probeIn.value; });
    probeLbl.appendChild(probeIn);
    probeLbl.appendChild(el('div', { class: 'yp-hint' }, ['Si esta seteado, Pilot lee textContent de ese selector despues de cada accion + lo incluye en la respuesta.']));
    sMode.appendChild(probeLbl);

    body.appendChild(sMode);

    modal.appendChild(body);

    var footer = el('div', { class: 'yp-modal-footer' });
    footer.appendChild(el('button', { class: 'yp-btn yp-btn-cancel', onclick: function () { backdrop.remove(); } }, ['Cancelar']));
    footer.appendChild(el('button', {
      class: 'yp-btn yp-btn-primary',
      onclick: function () {
        state.cfg = cfg;
        saveConfig(cfg);
        backdrop.remove();
        renderAll();
      }
    }, ['Guardar']));
    modal.appendChild(footer);

    backdrop.appendChild(modal);
    root.appendChild(backdrop);
  }

  /* ----- dispatch loop ----- */

  function addMessage(role, text, trace) {
    state.messages.push({ role: role, text: text, trace: trace || null });
    renderPanel();
  }
  function addPizarra(text, ok) {
    state.pizarra.push({ text: text, ok: !!ok });
    if (state.pizarra.length > 60) state.pizarra = state.pizarra.slice(-60);
    renderPanel();
  }

  async function submitInput(rawText) {
    var text = (rawText || '').trim();
    if (!text || state.busy) return;
    var ta = $('#yp-input');
    if (ta) ta.value = '';
    addMessage('user', text);

    var manifests = activeManifests();
    if (manifests.length === 0) {
      addMessage('error', 'No hay manifest NAC registrado en la pagina. Asegurate de incluir nac.browser.js + NAC.register(manifest).');
      return;
    }

    state.busy = true; renderPanel();
    var sysPrompt = buildSystemPrompt(manifests);

    var llmResp;
    try { llmResp = await callLLM(state.cfg, sysPrompt, text); }
    catch (e) {
      addMessage('error', String(e && e.message || e));
      state.busy = false; renderPanel();
      return;
    }

    var jsonStr = extractJson(llmResp.text);
    var parsed;
    try { parsed = JSON.parse(jsonStr); }
    catch (e) {
      addMessage('error', 'Respuesta del modelo no parseable. Primeros 200 chars: ' + (llmResp.text || '').slice(0, 200));
      state.busy = false; renderPanel();
      return;
    }

    var pluginSlug = parsed.plugin || activePlugin();
    var actions = Array.isArray(parsed.actions) ? parsed.actions : [];
    var trace = [];
    for (var i = 0; i < actions.length; i++) {
      var v = actions[i].verb;
      if (!v) continue;
      try {
        await dispatchVerb(pluginSlug, v);
        trace.push(v);
        addPizarra('OK  ' + pluginSlug + '.' + v, true);
      } catch (e) {
        trace.push('FAIL:' + v);
        addPizarra('FAIL ' + pluginSlug + '.' + v + ' -- ' + (e && e.message || e), false);
        break;
      }
    }

    var probeStatus = '';
    if (state.cfg.statusProbe) {
      var probe = document.querySelector(state.cfg.statusProbe);
      if (probe) probeStatus = ' [' + (probe.textContent || '').trim() + ']';
    }

    var say = parsed.say || ('Listo: ' + trace.length + ' accion(es) dispatchada(s).');
    addMessage('assistant', say + probeStatus, trace.length ? trace.join(' ') : null);
    speak(state.cfg, say);

    state.busy = false; renderPanel();
  }

  /* ----- STT control ----- */

  var sttInstance = null;
  function toggleListen(ta) {
    if (state.listening) {
      if (sttInstance) try { sttInstance.stop(); } catch (e) {}
      state.listening = false;
      renderPanel();
      return;
    }
    sttInstance = makeSTT(state.cfg, function (text) {
      ta.value = text;
      state.listening = false;
      renderPanel();
      submitInput(text);
    }, function (err) {
      state.listening = false;
      addMessage('error', 'STT error: ' + (err && err.error || err));
      renderPanel();
    });
    if (!sttInstance) {
      addMessage('error', 'STT no disponible en este navegador (usa Chrome/Edge).');
      return;
    }
    try { sttInstance.start(); state.listening = true; renderPanel(); }
    catch (e) { addMessage('error', 'STT start failed: ' + e.message); }
  }

  /* ----- mount ----- */

  function renderAll() {
    var root = ensureRoot();
    renderFab(root);
    renderPanel();
  }

  function init() {
    state.cfg = loadConfig();
    renderAll();
    /* Close menu on outside click. */
    document.addEventListener('click', function (e) {
      var fab = document.querySelector('.yp-fab');
      var menu = document.querySelector('.yp-fab-menu');
      if (!fab || !menu) return;
      if (!menu.contains(e.target) && !fab.contains(e.target)) menu.classList.remove('yp-open');
    });
  }

  global.YujinPilot = {
    __installed: true,
    version: '0.1.0',
    open:        function () { state.panelOpen = true; renderPanel(); },
    close:       function () { state.panelOpen = false; renderPanel(); },
    configure:   openSettings,
    enable:      function () { state.cfg.enabled = true;  saveConfig(state.cfg); renderAll(); },
    disable:     function () { state.cfg.enabled = false; saveConfig(state.cfg); renderAll(); },
    sendMessage: submitInput,
    setModel:    function (id) { state.cfg.selectedModel = id; saveConfig(state.cfg); renderAll(); },
    reset:       function () { localStorage.removeItem(STORAGE_KEY); state.cfg = loadConfig(); renderAll(); }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})(window);
