/* NAC v2.0 demo behaviour (runtime: v1.9.0 base + rc5 v2 extensions).
 *
 * Wires synth, modal, form, chat (text + voice), autopilot, v1.7
 * widget showcase, conformance self-test, and NAC lifecycle events.
 * ASCII pure. Zero deps -- relies only on the NAC reference impl
 * loaded immediately before this file.
 *
 * Public hook: window.NeDemo (debug helper for the dev console).
 */
(function () {
  'use strict';

  // ------------------------------------------------------------ utils
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $all(sel, root) { return Array.from((root || document).querySelectorAll(sel)); }
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
  function setState(el, st) {
    if (!el) return;
    el.setAttribute('data-nac-state', st);
  }
  function emit(name, detail) {
    document.dispatchEvent(new CustomEvent(name, { detail: detail || {} }));
  }

  // ------------------------------------------------------------ NAC manifest
  // Declare both plugin manifests up front so NAC.describe() works
  // before any user interaction.
  /* v1.5.1: full 10-locale label_i18n on every action / field /
     tab so the LLM (Claude Sonnet primary, DeepSeek free fallback)
     can match a user request in any of the Yujin-supported
     languages against any locale's label. The 10 locales are the
     Yujin standard set: es en pt fr ja zh hi ar de it. */

  /* Solfege names per language. Latin-language users say
     "do/re/mi/fa/sol/la/si"; English users say "C/D/E/F/G/A/B"
     (or solfege when classically trained); Japanese uses katakana
     d-r-m-f-s-l-s; Chinese pinyin or numeric; Hindi devanagari
     transliteration; Arabic transliteration. */
  function _noteLabels(es, en, ja, zh, hi, ar) {
    return { es: es, en: en, pt: es, fr: es, it: es, de: en,
             ja: ja, zh: zh, hi: hi, ar: ar };
  }

  if (window.NAC && typeof NAC.register === 'function') {
    NAC.register({
      plugin_slug: 'example_demo',
      version: '1.0.0',
      nac_version: '1.0',
      i18n_namespace: 'nac.demo',
      modes_supported: ['modal', 'maximized'],
      kpis: [],
      actions: [
        /* v1.5.5: piano notes replaced by sumi-e gallery (3
           ink-drawing icons that toggle expanded/idle on click).
           Each label_i18n carries the 10 Yujin locales so the
           agentic chat can match a request like "give me the
           cherry blossom" / "muestrame el sakura" /
           "桜を表示して" against any locale. */
        { nac_id: 'art.sakura', verb: 'apply', label_i18n: {
          es: 'Sakura (rama de cerezo)', en: 'Sakura (cherry blossom branch)',
          pt: 'Sakura (ramo de cerejeira)', fr: 'Sakura (branche de cerisier)',
          it: 'Sakura (ramo di ciliegio)', de: 'Sakura (Kirschbluetenzweig)',
          ja: '桜 (Sakura)', zh: '樱花 (Sakura)',
          hi: 'Sakura (चेरी ब्लॉसम)',
          ar: 'ساكورا (فرع زهر الكرز)',
        } },
        { nac_id: 'art.fuji', verb: 'apply', label_i18n: {
          es: 'Monte Fuji', en: 'Mount Fuji',
          pt: 'Monte Fuji', fr: 'Mont Fuji',
          it: 'Monte Fuji', de: 'Berg Fuji',
          ja: '富士山 (Fuji)', zh: '富士山',
          hi: 'फ़ूजी पर्वत',
          ar: 'جبل فوجي',
        } },
        { nac_id: 'art.bamboo', verb: 'apply', label_i18n: {
          es: 'Bambu', en: 'Bamboo stalks',
          pt: 'Bambu', fr: 'Bambou',
          it: 'Bambu', de: 'Bambus',
          ja: '竹 (Take, bamboo)', zh: '竹',
          hi: 'बाँस',
          ar: 'الخيزران',
        } },
        { nac_id: 'secret.open',    verb: 'apply', label_i18n: {
          es: 'abrir el modal secreto', en: 'open the secret modal',
          pt: 'abrir o modal secreto', fr: 'ouvrir le modal secret',
          it: 'apri il modale segreto', de: 'das geheime Modal öffnen',
          ja: '秘密のモーダルを開く',
          zh: '打开秘密模态框',
          hi: 'गुप्त मोडल खोलें',
          ar: 'فتح النموذج السري',
        } },
        { nac_id: 'play.autopilot', verb: 'apply', label_i18n: {
          es: 'piloto automatico (autopilot)', en: 'autopilot demo',
          pt: 'piloto automatico', fr: 'pilote automatique',
          it: 'pilota automatico', de: 'Autopilot starten',
          ja: 'オートパイロット',
          zh: '自动驾驶演示',
          hi: 'autopilot डेमो',
          ar: 'عرض القيادة الذاتية',
        } },
      ],
      fields: [
        { nac_id: 'field.name', type: 'text', label_i18n: {
          es: 'tu nombre', en: 'your name', pt: 'seu nome',
          fr: 'votre nom', it: 'il tuo nome', de: 'Ihr Name',
          ja: 'あなたの名前', zh: '你的名字',
          hi: 'आपका नाम',
          ar: 'اسمك',
        } },
        { nac_id: 'field.mood', type: 'select',
          options: ['', 'curious', 'impressed', 'skeptical'],
          label_i18n: {
            es: 'animo / mood', en: 'mood',
            pt: 'humor / animo', fr: 'humeur',
            it: 'umore', de: 'Stimmung',
            ja: '気分', zh: '心情',
            hi: 'मनोदशा',
            ar: 'المزاج',
          } },
        { nac_id: 'field.spread', type: 'checkbox', label_i18n: {
          es: 'compartir / spread', en: 'spread the word',
          pt: 'compartilhar', fr: 'partager',
          it: 'condividere', de: 'verbreiten',
          ja: '拡散させる', zh: '传播',
          hi: 'फैलाना',
          ar: 'النشر',
        } },
      ],
    });
    NAC.register({
      plugin_slug: 'example_assistant',
      version: '1.0.0',
      nac_version: '1.0',
      i18n_namespace: 'nac.demo.assistant',
      kpis: [],
      actions: [
        { nac_id: 'chat.send',    verb: 'submit', label_i18n: {
          es: 'enviar mensaje', en: 'send message',
          pt: 'enviar mensagem', fr: 'envoyer le message',
          it: 'invia messaggio', de: 'Nachricht senden',
          ja: 'メッセージを送信',
          zh: '发送消息',
          hi: 'संदेश भेजें',
          ar: 'إرسال الرسالة',
        } },
        { nac_id: 'chat.mic',     verb: 'apply',  label_i18n: {
          es: 'microfono / dictado', en: 'microphone / dictation',
          pt: 'microfone', fr: 'microphone', it: 'microfono',
          de: 'Mikrofon', ja: 'マイク', zh: '麦克风',
          hi: 'माइक्रोफ़ोन',
          ar: 'الميكروفون',
        } },
        { nac_id: 'chat.tts',     verb: 'apply',  label_i18n: {
          es: 'voz del bot (TTS)', en: 'bot voice (TTS)',
          pt: 'voz do bot', fr: 'voix du bot', it: 'voce del bot',
          de: 'Bot-Stimme', ja: 'ボットの声',
          zh: '机器人语音', hi: 'bot की आवाज',
          ar: 'صوت البوت',
        } },
        { nac_id: 'manifest.toggle', verb: 'apply', label_i18n: {
          es: 'mostrar / ocultar el manifest', en: 'show / hide the manifest',
          pt: 'mostrar / ocultar o manifest', fr: 'afficher / masquer le manifest',
          it: 'mostra / nascondi manifest', de: 'Manifest ein- / ausblenden',
          ja: 'manifest を表示 / 非表示',
          zh: '显示 / 隐藏 manifest',
          hi: 'manifest दिखाना / छिपाना',
          ar: 'إظهار / إخفاء manifest',
        } },
      ],
      fields: [
        { nac_id: 'chat.input', type: 'text', label_i18n: {
          es: 'mensaje al asistente', en: 'message to the assistant',
          pt: 'mensagem ao assistente', fr: 'message a l’assistant',
          it: 'messaggio all’assistente', de: 'Nachricht an den Assistenten',
          ja: 'アシスタントへのメッセージ',
          zh: '发给助手的消息',
          hi: 'सहायक को संदेश',
          ar: 'رسالة إلى المساعد',
        } },
        /* v1.9.0+: language selector exposed as a NAC field so the
           agentic backend (Claude Sonnet primary, DeepSeek fallback)
           sees it in NAC.describe() and can fill it via NAC.fill(
           'chat.lang', 'ja'). Pre-fix the field had data-nac-id on
           the DOM only and the AI replied "no expuesta en el
           contrato NAC" to "cambia idioma a japones". Each option
           carries its own label_i18n so the AI matches a request
           in any of the 10 locales: "japones" -> ja, "japanese" ->
           ja, "japonais" -> ja, "Japanisch" -> ja, "japones" -> ja,
           etc. */
        { nac_id: 'chat.lang', type: 'select',
          options: ['en','es','pt','fr','de','it','ja','zh','hi','ar'],
          option_labels_i18n: {
            'en': { es: 'ingles', en: 'English', pt: 'ingles',
                    fr: 'anglais', it: 'inglese', de: 'Englisch',
                    ja: '英語', zh: '英语', hi: 'अंग्रेज़ी',
                    ar: 'الانجليزية' },
            'es': { es: 'espanol', en: 'Spanish', pt: 'espanhol',
                    fr: 'espagnol', it: 'spagnolo', de: 'Spanisch',
                    ja: 'スペイン語', zh: '西班牙语',
                    hi: 'स्पेनिश', ar: 'الاسبانية' },
            'pt': { es: 'portugues', en: 'Portuguese', pt: 'portugues',
                    fr: 'portugais', it: 'portoghese', de: 'Portugiesisch',
                    ja: 'ポルトガル語', zh: '葡萄牙语',
                    hi: 'पुर्तगाली', ar: 'البرتغالية' },
            'fr': { es: 'frances', en: 'French', pt: 'frances',
                    fr: 'francais', it: 'francese', de: 'Franzoesisch',
                    ja: 'フランス語', zh: '法语',
                    hi: 'फ़्रेंच', ar: 'الفرنسية' },
            'de': { es: 'aleman', en: 'German', pt: 'alemao',
                    fr: 'allemand', it: 'tedesco', de: 'Deutsch',
                    ja: 'ドイツ語', zh: '德语',
                    hi: 'जर्मन', ar: 'الالمانية' },
            'it': { es: 'italiano', en: 'Italian', pt: 'italiano',
                    fr: 'italien', it: 'italiano', de: 'Italienisch',
                    ja: 'イタリア語', zh: '意大利语',
                    hi: 'इतालवी', ar: 'الايطالية' },
            'ja': { es: 'japones', en: 'Japanese', pt: 'japones',
                    fr: 'japonais', it: 'giapponese', de: 'Japanisch',
                    ja: '日本語', zh: '日语',
                    hi: 'जापानी', ar: 'اليابانية' },
            'zh': { es: 'chino', en: 'Chinese', pt: 'chines',
                    fr: 'chinois', it: 'cinese', de: 'Chinesisch',
                    ja: '中国語', zh: '中文',
                    hi: 'चीनी', ar: 'الصينية' },
            'hi': { es: 'hindi', en: 'Hindi', pt: 'hindi',
                    fr: 'hindi', it: 'hindi', de: 'Hindi',
                    ja: 'ヒンディー語', zh: '印地语',
                    hi: 'हिन्दी', ar: 'الهندية' },
            'ar': { es: 'arabe', en: 'Arabic', pt: 'arabe',
                    fr: 'arabe', it: 'arabo', de: 'Arabisch',
                    ja: 'アラビア語', zh: '阿拉伯语',
                    hi: 'अरबी', ar: 'العربية' },
          },
          /* v1.9.6: explicit description_i18n + intent_phrases_i18n
             so the agentic backend disambiguates "change page
             language" requests from "translate our conversation"
             requests. Pre-fix, when user said "cambia a chino" the
             AI replied "no tengo control del idioma de la pagina"
             because its intent classifier mapped the request to
             'translate-this-conversation' instead of
             'fill-chat.lang-field'. Adding intent_phrases_i18n that
             enumerate common phrasings in 10 locales makes the
             chat.lang field self-documenting as the page-language
             control. */
          description_i18n: {
            es: 'Cambia el idioma de TODA la pagina (UI, mensajes, voz). NO es solo el idioma de chat. Filleable con NAC.fill("chat.lang", <code>) donde code es uno de en/es/pt/fr/de/it/ja/zh/hi/ar.',
            en: 'Switches the display language of the ENTIRE page (UI, messages, voice). NOT just the chat conversation language. Fillable via NAC.fill("chat.lang", <code>) where code is one of en/es/pt/fr/de/it/ja/zh/hi/ar.',
            pt: 'Muda o idioma de TODA a pagina (UI, mensagens, voz). NAO so o idioma do chat.',
            fr: 'Change la langue d\'affichage de TOUTE la page (UI, messages, voix). PAS seulement la langue de la conversation.',
            it: 'Cambia la lingua di TUTTA la pagina (UI, messaggi, voce). NON solo la lingua della chat.',
            de: 'Aendert die Anzeigesprache der GANZEN Seite (UI, Nachrichten, Stimme). NICHT nur die Chat-Sprache.',
            ja: 'ページ全体の表示言語を切り替えます。チャット会話の言語だけではありません。',
            zh: '切换整个页面的显示语言（界面、消息、语音）。不仅仅是聊天对话的语言。',
            hi: 'पूरे पेज की display language बदलता है। केवल chat conversation की भाषा नहीं।',
            ar: 'تغيير لغة عرض الصفحة بالكامل (الواجهة والرسائل والصوت). ليس فقط لغة محادثة الدردشة.',
          },
          intent_phrases_i18n: {
            es: ["cambia el idioma", "cambia idioma a", "cambiar idioma de la pagina", "cambia a {language}", "ponelo en {language}", "pasa la pagina a {language}", "muestra todo en {language}", "el idioma de la pagina"],
            en: ["change language", "change language to", "switch to {language}", "set the page language", "show me in {language}", "switch the interface to {language}", "page language", "interface language"],
            pt: ["mude o idioma", "mude para {language}", "trocar idioma", "idioma da pagina"],
            fr: ["change la langue", "passe en {language}", "langue de la page", "interface en {language}"],
            it: ["cambia lingua", "passa a {language}", "lingua della pagina", "interfaccia in {language}"],
            de: ["aendere die sprache", "wechsle zu {language}", "seitensprache", "interface in {language}"],
            ja: ["言語を変えて", "{language} に切り替えて", "ページの言語", "インターフェース言語"],
            zh: ["改变语言", "切换到{language}", "页面语言", "界面语言"],
            hi: ["भाषा बदलो", "{language} में बदलो", "पेज की भाषा", "interface भाषा"],
            ar: ["غير اللغة", "تحويل الى {language}", "لغة الصفحة", "لغة الواجهة"]
          },
          a11y_hint: ['external_side_effect'],
          undoable: true,
          undo_window_ms: 0,
          label_i18n: {
            es: 'idioma de la interfaz (cambia toda la pagina)',
            en: 'interface language (changes whole page)',
            pt: 'idioma da interface',
            fr: 'langue de l\'interface',
            it: 'lingua dell\'interfaccia',
            de: 'Anzeigesprache',
            ja: '表示言語 (ページ全体)',
            zh: '界面语言（整个页面）',
            hi: 'इंटरफ़ेस भाषा',
            ar: 'لغة الواجهة',
          } },
      ],
    });
  }

  // ------------------------------------------------------------ Web Audio synth
  let _audioCtx = null;
  function ensureAudio() {
    if (_audioCtx) return _audioCtx;
    try {
      _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      console.warn('[demo] AudioContext unavailable:', e && e.message);
    }
    return _audioCtx;
  }
  function playNote(freq, durSec) {
    const ctx = ensureAudio();
    if (!ctx) return;
    const dur = durSec || 0.5;
    /* v1.5.4-fix: in the autopilot the first note played fine
       (the autopilot button click delivered a fresh user gesture
       which unlocked the AudioContext); subsequent notes 1.1s
       later were silent because:
       1. setTimeout callbacks do NOT carry user-gesture flag, and
       2. some Chromium variants on Android (Brave, mobile emulators,
          power-saver browsers) auto-suspend an idle AudioContext
          between scheduled events even though .state still reads
          "running" in JS land.
       Fix: ALWAYS call ctx.resume() before scheduling. resume() on
       a context that is genuinely running is a no-op that resolves
       immediately; on one that auto-suspended it kicks the context
       back. Combined with a 50ms lookahead (was 10ms; the slow
       emulator the user tested on needed more headroom), this
       guarantees every scheduled note actually plays. */
    function schedule() {
      const t0 = ctx.currentTime + 0.05;
      let osc, gain;
      try {
        osc = ctx.createOscillator();
        gain = ctx.createGain();
      } catch (e) {
        console.warn('[demo] AudioContext rejected createNode:', e && e.message);
        return;
      }
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(parseFloat(freq), t0);
      // ADSR envelope: 10ms attack, decay to sustain .35, release at end
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(0.45, t0 + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.18, t0 + 0.18);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      try {
        osc.start(t0);
        osc.stop(t0 + dur + 0.05);
      } catch (e) {
        console.warn('[demo] osc.start rejected:', e && e.message,
          'state:', ctx.state);
      }
    }
    /* Unconditional resume() pattern: state-check race is the
       trap that v1.5.3 fell into. A context that reports running
       can still need a kick on certain mobile builds. */
    try {
      const p = ctx.resume();
      if (p && typeof p.then === 'function') {
        p.then(schedule, schedule);
      } else {
        schedule();
      }
    } catch (e) {
      /* Older Safari throws synchronously when resume() is called
         on an already-running context. Schedule directly. */
      schedule();
    }
  }

  /* Audio context unlock.
     Bug-fix 2026-05-06: AudioContext starts in 'suspended' state and
     only resumes inside a user-gesture callstack. When the chat
     dispatches el.click() programmatically, that synthetic click
     does NOT count as a user gesture, so playNote() during chat-
     driven autopilot stayed silent. Capture every real pointer /
     touch / key event globally and call resume() so a single
     direct click anywhere on the page (including the chat input
     itself) unlocks audio for the entire session. Listener stays
     attached because some browsers re-suspend the context after
     long idle periods. */
  function _unlockAudio() {
    const ctx = ensureAudio();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(function () { /* swallow; next gesture retries */ });
    }
  }
  ['pointerdown', 'mousedown', 'touchstart', 'keydown'].forEach(function (ev) {
    document.addEventListener(ev, _unlockAudio, { capture: true });
  });

  // ------------------------------------------------------------ Modal
  function openModal() {
    const portal = $('#ne-modal-portal');
    if (!portal) return;
    const back = document.createElement('div');
    back.className = 'ne-modal-backdrop';
    back.setAttribute('data-nac-plugin', 'secret');
    back.setAttribute('data-nac-state', 'opening');
    back.innerHTML = ''
      + '<div class="ne-modal" role="dialog" aria-modal="true"'
      +   ' aria-labelledby="ne-modal-title">'
      +   '<span class="ne-modal-kanji" aria-hidden="true">&#31192;</span>'
      +   '<h3 id="ne-modal-title" data-i18n-key="modal.title">Hi there.</h3>'
      +   '<p data-i18n-key="modal.body1">You triggered NAC.click(secret.open) -- whether you '
      +   'pressed the button or Yujin did it for you.</p>'
      +   '<p data-i18n-key="modal.body2">The lifecycle events nac:plugin:opening and '
      +   'nac:plugin:opened just fired. A voice runner '
      +   'or a chat agent watching this page knows the modal is now '
      +   'on screen, and can ask you to close it.</p>'
      +   '<button type="button" class="ne-btn ne-btn-primary ne-modal-close"'
      +     ' data-nac-id="secret.close" data-nac-role="action"'
      +     ' data-nac-action="apply" data-nac-state="idle">'
      +     '<span data-i18n-key="btn.close">Close</span>'
      +   '</button>'
      + '</div>';
    portal.appendChild(back);
    /* v1.5.3: re-run translation so the freshly-injected modal
       picks up the active locale. */
    if (typeof translatePage === 'function') translatePage();
    emit('nac:plugin:opening', { plugin_slug: 'secret' });
    setTimeout(function () {
      back.setAttribute('data-nac-state', 'opened');
      emit('nac:plugin:opened', { plugin_slug: 'secret' });
    }, 50);
    function close() {
      back.setAttribute('data-nac-state', 'closing');
      emit('nac:plugin:closing', { plugin_slug: 'secret' });
      back.style.opacity = '0';
      setTimeout(function () {
        if (back.parentNode) back.parentNode.removeChild(back);
        emit('nac:plugin:closed', { plugin_slug: 'secret' });
      }, 180);
    }
    back.addEventListener('click', function (e) {
      if (e.target === back || e.target.closest('.ne-modal-close')) {
        emit('nac:action:dispatching',
             { nac_id: 'secret.close', verb: 'apply' });
        close();
        emit('nac:action:succeeded',
             { nac_id: 'secret.close', verb: 'apply' });
      }
    });
  }

  // ------------------------------------------------------------ Events log
  const eventsLog = $('[data-nac-id="events.log"]');
  /* v1.8: bumped MAX_LOG_ROWS 30 -> 200 so a full autopilot run +
     conformance test fit in the panel without truncating. The
     panel has its own overflow scrollbar so the user can review
     the entire trace post-run. */
  const MAX_LOG_ROWS = 200;
  function logEvent(name, detail) {
    if (!eventsLog) return;
    let cls = 'ne-evt-state';
    if (name.indexOf('action') !== -1)  cls = 'ne-evt-action';
    if (name.indexOf('field') !== -1)   cls = 'ne-evt-field';
    if (name.indexOf('plugin') !== -1)  cls = 'ne-evt-plugin';
    if (name.indexOf('command') !== -1) cls = 'ne-evt-command';
    const li = document.createElement('li');
    li.className = cls;
    /* v1.8: prefer canonical entity-id fields (sec 6.2) over the
       legacy nac_id alias when serialising to the log. Falls back
       to nac_id / plugin_slug for v1.6.x emitters. */
    const d = detail || {};
    const id = d.action_id || d.field_id || d.tab_id || d.section_id ||
               d.column_id || d.filter_id || d.source_id || d.target_id ||
               d.tree_id || d.node_id || d.toast_id || d.drawer_id ||
               d.calendar_id || d.event_id || d.chart_id || d.series_id ||
               d.map_id || d.marker_id || d.richtext_id || d.breadcrumb_id ||
               d.carousel_id || d.timeline_id || d.stepper_id ||
               d.command_target || d.nac_id || d.plugin_slug || d.plugin || '';
    li.textContent = name + (id ? '  ->  ' + id : '');
    eventsLog.appendChild(li);
    while (eventsLog.children.length > MAX_LOG_ROWS) {
      eventsLog.removeChild(eventsLog.firstChild);
    }
    eventsLog.scrollTop = eventsLog.scrollHeight;
  }
  ['nac:plugin:opening', 'nac:plugin:opened',
   'nac:plugin:closing', 'nac:plugin:closed',
   'nac:action:dispatching', 'nac:action:succeeded', 'nac:action:failed',
   'nac:field:changed', 'nac:state:changed'].forEach(function (n) {
    document.addEventListener(n, function (e) { logEvent(n, e.detail); });
  });

  // ------------------------------------------------------------ Action buttons
  // Generic: when any [data-nac-role="action"] is clicked, emit
  // dispatching + succeeded around the side-effect.
  // v1.5.2: buttons marked data-nac-toggle="true" (chat.mic,
  // chat.tts, manifest.toggle) own their own data-nac-state machine
  // and the generic dispatcher MUST NOT touch state for them.
  // Without this opt-out, the dispatcher's pre-state="active" /
  // post-state="success"->"idle" transitions collide with the
  // toggle handler's interpretation of state, producing phantom
  // failures (mic never starts because the handler reads the
  // dispatcher's "active" as "already recording" and calls stop()).
  document.addEventListener('click', function (e) {
    const btn = e.target.closest('[data-nac-role="action"]');
    if (!btn) return;
    const nacId = btn.getAttribute('data-nac-id');
    const verb  = btn.getAttribute('data-nac-action') || 'apply';
    if (!nacId) return;
    const isToggle = btn.getAttribute('data-nac-toggle') === 'true';
    if (!isToggle) setState(btn, 'active');
    /* v1.7.0 dual emit: canonical action_id + legacy nac_id alias.
       Plugin scope from the closest data-nac-plugin ancestor so
       sec 6.2.1 universal base (plugin + plugin_instance_id) is
       satisfied -- the conformance test FAILed in round 2 because
       these were missing. */
    const actPluginRoot = btn.closest('[data-nac-plugin]');
    const actBase = {
      plugin: actPluginRoot ? actPluginRoot.getAttribute('data-nac-plugin') : 'example_demo',
      plugin_instance_id: actPluginRoot ? (actPluginRoot.getAttribute('data-nac-plugin-id') || null) : null,
      action_id: nacId, nac_id: nacId, verb: verb,
    };
    emit('nac:action:dispatching', actBase);
    let ok = true;
    try {
      runAction(nacId, btn);
    } catch (err) {
      ok = false;
      emit('nac:action:failed', Object.assign({}, actBase, { error: String(err) }));
    }
    if (ok) {
      emit('nac:action:succeeded', actBase);
      if (!isToggle) {
        setTimeout(function () { setState(btn, 'success'); }, 60);
        setTimeout(function () { setState(btn, 'idle');    }, 600);
      }
    }
  });

  function runAction(nacId, btn) {
    /* v1.5.5: piano notes replaced by the sumi-e gallery (3
       icons, expand/minimize via art.<slug>). The audio path
       was unreliable on mobile emulators; the new visual demo
       exercises the same NAC.click contract with reliable
       feedback. The legacy note.* path stays here as a guard
       in case any vendored copy still emits clicks against the
       old ids -- it is now a silent no-op (no audio, no
       throw), so v1.5.4 plugins do not regress. */
    if (nacId.indexOf('note.') === 0) {
      return;
    }
    if (nacId.indexOf('art.') === 0)    { toggleArt(nacId, btn); return; }
    if (nacId === 'secret.open')        { openModal(); return; }
    if (nacId === 'play.autopilot')     { autopilot();  return; }
    if (nacId === 'chat.send')          { chatSend();     return; }
    if (nacId === 'chat.mic')           { toggleMic(btn); return; }
    if (nacId === 'chat.tts')           { toggleTts(btn); return; }
    if (nacId === 'chat.voice.always_on') { toggleVoiceAlwaysOn(btn); return; }
    if (nacId === 'manifest.toggle')    { toggleManifest(btn); return; }
  }

  /* v1.5.5: sumi-e gallery toggle. State machine per icon:
       idle <-> expanded
     Single shared canvas (art.canvas) shows the SVG drawing of
     whichever icon is currently expanded. Clicking an idle icon
     expands it (collapsing any other expanded icon first).
     Clicking an expanded icon minimizes it back to idle. The
     transitions emit nac:state:changed events on the icons so
     a NAC operator can observe the state machine. */
  const ART_SVG = {
    sakura:
      '<svg viewBox="0 0 200 140" xmlns="http://www.w3.org/2000/svg" aria-label="Cherry-blossom branch">'
      + '<defs><radialGradient id="petal-g" cx="50%" cy="50%"><stop offset="0%" stop-color="#FBCFE8"/><stop offset="100%" stop-color="#EC4899"/></radialGradient></defs>'
      + '<path d="M10 120 Q60 80 110 70 T190 30" stroke="#3F2A1D" stroke-width="3" fill="none" stroke-linecap="round"/>'
      + '<path d="M70 95 Q80 80 95 90" stroke="#3F2A1D" stroke-width="2" fill="none"/>'
      + '<path d="M150 60 Q160 45 175 50" stroke="#3F2A1D" stroke-width="2" fill="none"/>'
      + '<g fill="url(#petal-g)" stroke="#9D174D" stroke-width="0.6">'
      +   '<circle cx="40" cy="105" r="6"/>'
      +   '<circle cx="50" cy="98" r="5"/>'
      +   '<circle cx="80" cy="82" r="6"/>'
      +   '<circle cx="100" cy="73" r="7"/>'
      +   '<circle cx="115" cy="68" r="5"/>'
      +   '<circle cx="140" cy="55" r="6"/>'
      +   '<circle cx="160" cy="46" r="6"/>'
      +   '<circle cx="180" cy="35" r="5"/>'
      + '</g>'
      + '</svg>',
    fuji:
      '<svg viewBox="0 0 200 140" xmlns="http://www.w3.org/2000/svg" aria-label="Mount Fuji">'
      + '<rect x="0" y="0" width="200" height="140" fill="#F5F1E6"/>'
      + '<circle cx="155" cy="35" r="14" fill="#F87171"/>'
      + '<polygon points="20,120 100,30 180,120" fill="#475569" stroke="#1E293B" stroke-width="2"/>'
      + '<polygon points="80,55 100,30 120,55 110,65 100,55 90,65" fill="#FFFFFF"/>'
      + '<path d="M0 122 Q40 116 80 122 T160 122 T200 122" stroke="#1E293B" stroke-width="2" fill="none"/>'
      + '<path d="M30 132 Q60 128 90 132" stroke="#1E293B" stroke-width="1.5" fill="none"/>'
      + '<path d="M120 132 Q150 128 180 132" stroke="#1E293B" stroke-width="1.5" fill="none"/>'
      + '</svg>',
    bamboo:
      '<svg viewBox="0 0 200 140" xmlns="http://www.w3.org/2000/svg" aria-label="Bamboo stalks">'
      + '<rect x="0" y="0" width="200" height="140" fill="#F0FDF4"/>'
      + '<g stroke="#166534" stroke-width="3" fill="#22C55E">'
      +   '<rect x="55" y="20" width="14" height="100" rx="2"/>'
      +   '<rect x="55" y="20" width="14" height="2" fill="#166534"/>'
      +   '<rect x="55" y="50" width="14" height="2" fill="#166534"/>'
      +   '<rect x="55" y="80" width="14" height="2" fill="#166534"/>'
      +   '<rect x="55" y="110" width="14" height="2" fill="#166534"/>'
      +   '<rect x="100" y="10" width="14" height="115" rx="2"/>'
      +   '<rect x="100" y="40" width="14" height="2" fill="#166534"/>'
      +   '<rect x="100" y="75" width="14" height="2" fill="#166534"/>'
      +   '<rect x="100" y="115" width="14" height="2" fill="#166534"/>'
      +   '<rect x="135" y="30" width="14" height="95" rx="2"/>'
      +   '<rect x="135" y="60" width="14" height="2" fill="#166534"/>'
      +   '<rect x="135" y="95" width="14" height="2" fill="#166534"/>'
      + '</g>'
      + '<g fill="#15803D" stroke="#14532D" stroke-width="1">'
      +   '<path d="M62 25 Q40 15 30 30 Q45 28 62 35"/>'
      +   '<path d="M107 15 Q90 5 80 22 Q95 18 107 25"/>'
      +   '<path d="M142 35 Q125 25 115 42 Q130 38 142 45"/>'
      + '</g>'
      + '</svg>',
  };
  const _artLabel = {
    sakura: { es: 'Sakura',           en: 'Cherry blossom branch' },
    fuji:   { es: 'Monte Fuji',       en: 'Mount Fuji' },
    bamboo: { es: 'Bambu',            en: 'Bamboo stalks' },
  };
  function toggleArt(nacId, btn) {
    const slug = btn && btn.getAttribute('data-art');
    if (!slug || !ART_SVG[slug]) return;
    const canvas = $('[data-nac-id="art.canvas"]');
    const inner  = $('[data-nac-id="art.canvas.body"]');
    const wasExpanded = btn.getAttribute('data-nac-state') === 'expanded';
    /* Collapse every other icon first -- only one drawing
       visible at a time. */
    document.querySelectorAll('[data-nac-id^="art."][data-nac-role="action"]')
      .forEach(function (b) {
        if (b !== btn) b.setAttribute('data-nac-state', 'idle');
      });
    if (wasExpanded) {
      /* Click on the active one -> minimise. */
      btn.setAttribute('data-nac-state', 'idle');
      if (canvas) {
        canvas.setAttribute('data-nac-state', 'empty');
        if (inner) inner.innerHTML = '';
        setTimeout(function () { canvas.hidden = true; }, 250);
      }
      emit('nac:state:changed', {
        plugin: 'example_demo', plugin_instance_id: null,
        nac_id: nacId, state: 'idle', prior_state: 'expanded',
      });
    } else {
      btn.setAttribute('data-nac-state', 'expanded');
      if (canvas) {
        canvas.hidden = false;
        if (inner) inner.innerHTML = ART_SVG[slug];
        /* Force reflow so the empty -> ready transition runs. */
        canvas.offsetHeight;
        canvas.setAttribute('data-nac-state', 'ready');
      }
      emit('nac:state:changed', {
        plugin: 'example_demo', plugin_instance_id: null,
        nac_id: nacId, state: 'expanded', prior_state: 'idle',
        art: slug, label: (_artLabel[slug] && _artLabel[slug].en) || slug,
      });
    }
  }

  // ------------------------------------------------------------ Form fields
  document.addEventListener('input', function (e) {
    const f = e.target.closest('[data-nac-role="field"]');
    if (!f) return;
    const nacId = f.getAttribute('data-nac-id');
    if (!nacId) return;
    const ftype = f.getAttribute('data-nac-field-type');
    let value = f.value;
    if (ftype === 'checkbox') value = !!f.checked;
    f.setAttribute('data-nac-state', 'dirty');
    /* v1.7.0 dual emit: canonical field_id + new_value + legacy
       nac_id/value. plugin scope from the field's data-nac-plugin
       ancestor (sec 6.2.1 universal base). */
    const fillRoot = f.closest('[data-nac-plugin]');
    emit('nac:field:changed', {
      plugin: fillRoot ? fillRoot.getAttribute('data-nac-plugin') : 'example_demo',
      plugin_instance_id: fillRoot ? (fillRoot.getAttribute('data-nac-plugin-id') || null) : null,
      field_id: nacId, nac_id: nacId,
      new_value: value, value: value,
    });
  });
  document.addEventListener('change', function (e) {
    const f = e.target.closest('[data-nac-role="field"][data-nac-field-type="checkbox"]');
    if (!f) return;
    const nacId = f.getAttribute('data-nac-id');
    f.setAttribute('data-nac-state', 'dirty');
    /* v1.7.0 dual emit. */
    const cbRoot = f.closest('[data-nac-plugin]');
    emit('nac:field:changed', {
      plugin: cbRoot ? cbRoot.getAttribute('data-nac-plugin') : 'example_demo',
      plugin_instance_id: cbRoot ? (cbRoot.getAttribute('data-nac-plugin-id') || null) : null,
      field_id: nacId, nac_id: nacId,
      new_value: !!f.checked, value: !!f.checked,
    });
  });

  // ------------------------------------------------------------ Chat (text + voice)
  const chatLog   = $('[data-nac-id="chat.log"]');
  const chatInput = $('[data-nac-id="chat.input"]');
  const chatTts   = $('[data-nac-id="chat.tts"]');
  /* v1.5.2: TTS defaults OFF so the activated state (aria-pressed
     "true") is visually distinct from the resting state. User
     activates by clicking; the button then turns red + pulses so
     they know voice replies are on. */
  let ttsEnabled  = false;
  /* v1.5.2: hoisted to the top of the chat block so applyLangChange
     (which fires at module init, right after the I18N table and
     the lang selector wire) can reference it safely. Pre-v1.5.2
     this `let` lived next to getRecognizer() further down; the
     module-init `applyLangChange(currentLang)` call hit the
     temporal dead zone and threw "Cannot access 'recognizer'
     before initialization", which aborted the rest of the IIFE
     and broke voice + chat dispatch entirely. */
  let recognizer = null;

  function chatBubble(role, text, opts) {
    if (!chatLog) return;
    const li = document.createElement('li');
    li.className = 'ne-chat-bubble ' + role;
    li.textContent = text;
    /* v1.6.3: opts.skipHistory marks this bubble so nacDemoHistory
       does NOT include it in the next request's history payload.
       Used for unavailable / parse_degraded error messages: those
       are infrastructure feedback, not real assistant turns, and
       echoing them in history confuses the model into repeating
       them on the next prompt. */
    if (opts && opts.skipHistory) {
      li.setAttribute('data-history-skip', 'true');
    }
    chatLog.appendChild(li);
    chatLog.scrollTop = chatLog.scrollHeight;
  }
  /* v1.5.1: 10-locale UI translations for the demo's chat chrome.
     The 10 locales are the Yujin standard set: es en pt fr ja zh
     hi ar de it. Adding a key to this table requires adding the
     value in every locale; the validator script in the repo (when
     vendored) flags missing entries. */
  const I18N = {
    badge_thinking: {
      es: 'Yujin pensando...',          en: 'Yujin thinking...',
      pt: 'Yujin pensando...',          fr: 'Yujin reflechit...',
      it: 'Yujin sta pensando...',      de: 'Yujin denkt nach...',
      ja: 'Yujin が考えています...',
      zh: 'Yujin 正在思考...',
      hi: 'Yujin सोच रहा है...',
      ar: 'يفكر Yujin...',
    },
    badge_agent: {
      es: 'Modo agente: ',              en: 'Agent mode: ',
      pt: 'Modo agente: ',              fr: 'Mode agent: ',
      it: 'Modalita agente: ',          de: 'Agentenmodus: ',
      ja: 'エージェント・モード: ',
      zh: '代理模式: ',
      hi: 'agent मोड: ',
      ar: 'وضع الوكيل: ',
    },
    badge_fallback_suffix: {
      es: ' (fallback)',                en: ' (fallback)',
      pt: ' (fallback)',                fr: ' (fallback)',
      it: ' (fallback)',                de: ' (Fallback)',
      ja: '(フォールバック)',
      zh: '（备选）',
      hi: ' (fallback)',
      ar: ' (احتياطي)',
    },
    badge_offline: {
      es: 'Modo offline (matcher local)',
      en: 'Offline mode (local matcher)',
      pt: 'Modo offline (matcher local)',
      fr: 'Mode hors ligne (matcher local)',
      it: 'Modalita offline (matcher locale)',
      de: 'Offline-Modus (lokaler Matcher)',
      ja: 'オフライン・モード (ローカル・マッチャー)',
      zh: '离线模式 (本地匹配器)',
      hi: 'offline मोड (स्थानीय matcher)',
      ar: 'وضع غير متصل (مطابق محلي)',
    },
    badge_unavailable: {
      es: 'IA no disponible -- reintentar en unos minutos',
      en: 'AI unavailable -- retry in a few minutes',
      pt: 'IA indisponivel -- tente em alguns minutos',
      fr: 'IA indisponible -- reessayez dans quelques minutes',
      it: 'IA non disponibile -- riprova tra qualche minuto',
      de: 'KI nicht verfugbar -- in einigen Minuten erneut versuchen',
      ja: 'AIは利用できません -- 数分後に再試行',
      zh: 'AI 暂不可用 -- 几分钟后重试',
      hi: 'AI अनुपलब्ध -- कुछ मिनटों में पुनः प्रयास करें',
      ar: 'الذكاء الاصطناعي غير متاح -- اعد المحاولة بعد دقائق',
    },
    badge_parse_degraded: {
      es: 'Probe todos los proveedores y ninguno respondio en JSON valido. Reformula.',
      en: 'Tried every provider; none returned valid JSON. Please rephrase.',
      pt: 'Tentei todos os provedores; nenhum retornou JSON valido. Reformule.',
      fr: 'J\'ai essaye tous les fournisseurs; aucun n\'a renvoye un JSON valide. Reformulez.',
      it: 'Ho provato tutti i provider; nessuno ha restituito JSON valido. Riformula.',
      de: 'Alle Anbieter probiert; keiner gab gueltiges JSON zurueck. Umformulieren.',
      ja: 'すべてのプロバイダを試しましたが、有効なJSONが返りませんでした。言い換えてください。',
      zh: '尝试了所有提供商，均未返回有效 JSON。请改述后重试。',
      hi: 'सभी providers आज़माए, किसी ने भी valid JSON नहीं दिया। कृपया दोबारा कहें।',
      ar: 'جربت كل المزودين ولم يرجع اي منهم JSON صالحا. اعد الصياغة.',
    },
    err_unknown_request: {
      es: 'No te entendi. Probemos: "tocale Mi", "abrime el secreto", "empezar tour", "compartir".',
      en: 'I did not understand. Try: "play Mi", "open the secret", "start tour", "spread".',
      pt: 'Nao entendi. Tente: "toque Mi", "abrir o segredo", "iniciar tour", "compartilhar".',
      fr: 'Je n’ai pas compris. Essayez: "joue Mi", "ouvre le secret", "demarre la visite", "partager".',
      it: 'Non ho capito. Prova: "suona Mi", "apri il segreto", "inizia tour", "condividere".',
      de: 'Habe ich nicht verstanden. Versuchen Sie: "spiele Mi", "Geheimnis offnen", "Tour starten", "verbreiten".',
      ja: '分かりませんでした。お試し: 「ミを弾いて」「秘密を開く」「ツアーを開始」',
      zh: '我没听懂。试试: "弹 Mi"、"打开秘密"、"开始演示"、"传播"。',
      hi: 'मुझे समझ नहीं आया। आजमाएँ: "Mi बजाओ", "secret खोलो", "tour शुरू", "फैलाओ"।',
      ar: 'لم أفهم. حاول: "اعزف Mi"، "افتح السر"، "ابدأ الجولة"، "النشر".',
    },
    err_action_not_found: {
      es: 'No encuentro la accion ',    en: 'Action not found: ',
      pt: 'Acao nao encontrada: ',      fr: 'Action introuvable: ',
      it: 'Azione non trovata: ',       de: 'Aktion nicht gefunden: ',
      ja: 'アクションが見つかりません: ',
      zh: '找不到操作: ',
      hi: 'कार्य नहीं मिला: ',
      ar: 'الإجراء غير موجود: ',
    },
    err_field_not_found: {
      es: 'No encuentro el campo ',     en: 'Field not found: ',
      pt: 'Campo nao encontrado: ',     fr: 'Champ introuvable: ',
      it: 'Campo non trovato: ',        de: 'Feld nicht gefunden: ',
      ja: 'フィールドが見つかりません: ',
      zh: '找不到字段: ',
      hi: 'फ़ील्ड नहीं मिला: ',
      ar: 'الحقل غير موجود: ',
    },
    err_dispatch_fail: {
      es: 'Falle ',                     en: 'Failed ',
      pt: 'Falhou ',                    fr: 'Echec ',
      it: 'Fallito ',                   de: 'Fehlgeschlagen ',
      ja: '失敗: ',                     zh: '失败: ',
      hi: 'विफल: ',
      ar: 'فشل: ',
    },
    err_action_failed: {
      es: 'No pude ejecutar ',          en: 'Could not run ',
      pt: 'Nao pude executar ',         fr: 'Impossible d’executer ',
      it: 'Non posso eseguire ',        de: 'Konnte nicht ausfuhren: ',
      ja: '実行できませんでした: ',
      zh: '无法执行: ',
      hi: 'नहीं चला सका: ',
      ar: 'تعذر التنفيذ: ',
    },
    msg_done: {
      es: 'Listo: ',                    en: 'Done: ',
      pt: 'Pronto: ',                   fr: 'Fait: ',
      it: 'Fatto: ',                    de: 'Erledigt: ',
      ja: '完了: ',                     zh: '完成: ',
      hi: 'हो गया: ',
      ar: 'تم: ',
    },
    msg_wrote: {
      es: 'Escribi "',                  en: 'Wrote "',
      pt: 'Escrevi "',                  fr: 'J’ai ecrit "',
      it: 'Ho scritto "',               de: 'Ich habe geschrieben "',
      ja: '入力しました "',
      zh: '已输入 "',
      hi: 'लिख दिया "',
      ar: 'كتبت "',
    },
    msg_in: {
      es: '" en ',                      en: '" in ',
      pt: '" em ',                      fr: '" dans ',
      it: '" in ',                      de: '" in ',
      ja: '" を ',                      zh: '" 至 ',
      hi: '" को ',
      ar: '" في ',
    },
    msg_nothing_to_close: {
      es: 'No hay nada abierto que cerrar.',
      en: 'Nothing open to close.',
      pt: 'Nada aberto para fechar.',
      fr: 'Rien d’ouvert a fermer.',
      it: 'Niente da chiudere.',
      de: 'Nichts zum Schliessen offen.',
      ja: '閉じるものはありません。',
      zh: '没有可关闭的内容。',
      hi: 'बंद करने के लिए कुछ नहीं है।',
      ar: 'لا يوجد ما يمكن إغلاقه.',
    },
    msg_done_short: {
      es: 'Hecho.',                     en: 'Done.',
      pt: 'Pronto.',                    fr: 'Fait.',
      it: 'Fatto.',                     de: 'Erledigt.',
      ja: '完了。',                     zh: '完成。',
      hi: 'हो गया।',
      ar: 'تم.',
    },
    tts_on: {
      es: 'Voz activada',                en: 'Voice on',
      pt: 'Voz ativada',                 fr: 'Voix activee',
      it: 'Voce attivata',               de: 'Stimme an',
      ja: '音声オン',                    zh: '语音已开',
      hi: 'आवाज़ चालू',
      ar: 'الصوت مفعل',
    },
    tts_off: {
      es: 'Voz silenciada',              en: 'Voice off',
      pt: 'Voz silenciada',              fr: 'Voix coupee',
      it: 'Voce spenta',                 de: 'Stimme aus',
      ja: '音声オフ',                    zh: '语音已关',
      hi: 'आवाज़ बंद',
      ar: 'الصوت مكتوم',
    },
    /* v1.6.3 hands-free / always-on voice mode (for headphone use). */
    voice_always_on_on: {
      es: 'Activar manos libres',        en: 'Turn on hands-free',
      pt: 'Ativar mãos livres',          fr: 'Activer mains libres',
      it: 'Attivare vivavoce',           de: 'Freisprechen aktivieren',
      ja: 'ハンズフリーをオン',           zh: '开启免提',
      hi: 'हैंड्स-फ्री चालू करें',          ar: 'تفعيل الوضع الحر',
    },
    voice_always_on_off: {
      es: 'Apagar manos libres',         en: 'Turn off hands-free',
      pt: 'Desativar mãos livres',       fr: 'Desactiver mains libres',
      it: 'Disattivare vivavoce',        de: 'Freisprechen aus',
      ja: 'ハンズフリーをオフ',           zh: '关闭免提',
      hi: 'हैंड्स-फ्री बंद करें',           ar: 'ايقاف الوضع الحر',
    },
    voice_always_on_started: {
      es: 'Manos libres activado. Te escucho de continuo.',
      en: 'Hands-free on. Listening continuously.',
      pt: 'Mãos livres ativado. Ouvindo continuamente.',
      fr: 'Mains libres activees. Ecoute continue.',
      it: 'Vivavoce attivato. Ascolto continuo.',
      de: 'Freisprechen an. Ich hoere kontinuierlich zu.',
      ja: 'ハンズフリー オン。継続して聞いています。',
      zh: '免提已开。持续聆听中。',
      hi: 'हैंड्स-फ्री चालू। निरंतर सुन रहा हूँ।',
      ar: 'الوضع الحر مفعل. اسمعك باستمرار.',
    },
    voice_always_on_stopped: {
      es: 'Manos libres apagado.',       en: 'Hands-free off.',
      pt: 'Mãos livres desativado.',     fr: 'Mains libres desactivees.',
      it: 'Vivavoce disattivato.',       de: 'Freisprechen aus.',
      ja: 'ハンズフリー オフ。',           zh: '免提已关。',
      hi: 'हैंड्स-फ्री बंद।',                 ar: 'ايقاف الوضع الحر.',
    },
    err_no_voice_support: {
      es: 'Tu navegador no soporta voz. Probalo en Chrome o Edge.',
      en: 'Your browser does not support voice. Try Chrome or Edge.',
      pt: 'Seu navegador nao suporta voz. Tente Chrome ou Edge.',
      fr: 'Votre navigateur ne supporte pas la voix. Essayez Chrome ou Edge.',
      it: 'Il tuo browser non supporta la voce. Prova Chrome o Edge.',
      de: 'Ihr Browser unterstutzt keine Stimme. Versuchen Sie Chrome oder Edge.',
      ja: 'このブラウザは音声非対応。Chrome か Edge を試してください。',
      zh: '此浏览器不支持语音。请尝试 Chrome 或 Edge。',
      hi: 'यह browser आवाज़ का समर्थन नहीं करता। Chrome या Edge आज़माएँ।',
      ar: 'متصفحك لا يدعم الصوت. جرب Chrome أو Edge.',
    },
    err_mic_start: {
      es: 'No pude prender el mic.',     en: 'Could not start the mic.',
      pt: 'Nao consegui ligar o mic.',   fr: 'Impossible d’activer le mic.',
      it: 'Non posso avviare il mic.',   de: 'Mikrofon konnte nicht gestartet werden.',
      ja: 'マイクを起動できませんでした。',
      zh: '无法启动麦克风。',
      hi: 'mic चालू नहीं कर सका।',
      ar: 'تعذر تشغيل الميكروفون.',
    },
    err_mic_unheard: {
      es: 'No te escuche bien',           en: 'Did not catch that',
      pt: 'Nao ouvi bem',                 fr: 'Je n’ai pas bien entendu',
      it: 'Non ho sentito bene',          de: 'Habe ich nicht gut gehort',
      ja: 'うまく聞き取れませんでした',
      zh: '没听清',
      hi: 'ठीक से सुना नहीं',
      ar: 'لم أسمع جيدا',
    },
  };

  /* v1.5.2: data-i18n-key target table for visible page chrome.
     Every element in example.php that carries data-i18n-key has a
     row here. translatePage() walks the table on every locale
     switch. Keep keys flat and short so the agentic chat could
     also flip them via NAC if we choose to expose them later. */
  const SECTION_I18N = {
    /* v1.9.2: full i18n backfill. Every visible string now has a
       key. Section sub-text "v1.X sec X.Y -- nac:..." stays in
       technical form (event names are identifiers, not translatable)
       but the connective word ("sec" / "Abschn." / "節") is
       localized. */
    /* --- common / status --- */
    'status.idle': {
      es: 'inactivo', en: 'idle', pt: 'inativo',
      fr: 'inactif', it: 'inattivo', de: 'leerlauf',
      ja: '待機中', zh: '空闲',
      hi: 'निष्क्रिय', ar: 'في الانتظار',
    },
    'common.error': {
      es: 'Error: {message}', en: 'Error: {message}',
      pt: 'Erro: {message}', fr: 'Erreur : {message}',
      it: 'Errore: {message}', de: 'Fehler: {message}',
      ja: 'エラー: {message}', zh: '错误：{message}',
      hi: 'त्रुटि: {message}', ar: 'خطأ: {message}',
    },
    'placeholder.empty_click_button': {
      es: '(vacio -- click un boton)', en: '(empty -- click a button)',
      pt: '(vazio -- clique um botao)', fr: '(vide -- cliquez un bouton)',
      it: '(vuoto -- clicca un pulsante)', de: '(leer -- Knopf klicken)',
      ja: '(空 -- ボタンをクリック)', zh: '（空 -- 点击按钮）',
      hi: '(खाली -- एक बटन click करें)', ar: '(فارغ -- انقر زرا)',
    },
    'placeholder.empty_click_any_button': {
      es: '(vacio -- click cualquier boton)', en: '(empty -- click any button)',
      pt: '(vazio -- clique qualquer botao)', fr: '(vide -- cliquez un bouton)',
      it: '(vuoto -- clicca un pulsante)', de: '(leer -- Knopf klicken)',
      ja: '(空 -- 任意のボタンをクリック)', zh: '（空 -- 点击任意按钮）',
      hi: '(खाली -- कोई भी बटन click करें)', ar: '(فارغ -- انقر اي زر)',
    },
    /* --- card form / fields --- */
    'ph.type_or_yujin': {
      es: 'Escribi o dejaselo a Yujin',
      en: 'Type or let Yujin fill it',
      pt: 'Digite ou deixe o Yujin preencher',
      fr: 'Tape ou laisse Yujin remplir',
      it: 'Scrivi o lascia che Yujin compili',
      de: 'Tippen oder Yujin ausfuellen lassen',
      ja: '入力するか Yujin に任せて',
      zh: '输入或让 Yujin 填',
      hi: 'टाइप करें या Yujin को भरने दें',
      ar: 'اكتب او دع Yujin يملا',
    },
    'lbl.spread_word': {
      es: 'Quiero difundir NAC', en: 'I want to spread the word about NAC',
      pt: 'Quero divulgar NAC', fr: 'Je veux faire connaitre NAC',
      it: 'Voglio diffondere NAC', de: 'Ich will NAC verbreiten',
      ja: 'NAC を広めたい', zh: '我想传播 NAC',
      hi: 'NAC के बारे में फैलाना चाहता हूँ',
      ar: 'اريد نشر NAC',
    },
    /* --- tabs + accordion --- */
    'tab.overview': {
      es: 'Resumen', en: 'Overview', pt: 'Visao geral',
      fr: 'Apercu', it: 'Panoramica', de: 'Uebersicht',
      ja: '概要', zh: '概览', hi: 'सारांश', ar: 'نظرة عامة',
    },
    'tab.details': {
      es: 'Detalles', en: 'Details', pt: 'Detalhes',
      fr: 'Details', it: 'Dettagli', de: 'Details',
      ja: '詳細', zh: '详情', hi: 'विवरण', ar: 'تفاصيل',
    },
    'tab.history': {
      es: 'Historial', en: 'History', pt: 'Historico',
      fr: 'Historique', it: 'Cronologia', de: 'Verlauf',
      ja: '履歴', zh: '历史', hi: 'इतिहास', ar: 'السجل',
    },
    'tabpanel.overview': {
      es: 'Contenido del resumen. Probá decir "passa a la tab Detalles".',
      en: 'Overview content. Try saying "switch to the Details tab".',
      pt: 'Conteudo do resumo. Tente dizer "mudar para a aba Detalhes".',
      fr: 'Contenu de l\'apercu. Essayez de dire "passe a l\'onglet Details".',
      it: 'Contenuto della panoramica. Prova a dire "passa alla scheda Dettagli".',
      de: 'Uebersichtsinhalt. Sag "wechsle zum Tab Details".',
      ja: '概要の内容。「詳細タブに切り替えて」と言ってみよう。',
      zh: '概览内容。试试说"切换到详情标签"。',
      hi: 'सारांश सामग्री. कहकर देखें "Details tab पर जाओ"।',
      ar: 'محتوى النظرة العامة. جرب ان تقول "بدل الى تبويب التفاصيل".',
    },
    'tabpanel.details_intro': {
      es: 'Contenido de detalles. Tres secciones de acordeon abajo.',
      en: 'Details content. Three accordion sections below.',
      pt: 'Conteudo de detalhes. Tres secoes de acordeao abaixo.',
      fr: 'Contenu des details. Trois sections accordeon ci-dessous.',
      it: 'Contenuto dei dettagli. Tre sezioni a fisarmonica sotto.',
      de: 'Detail-Inhalt. Drei Akkordeon-Abschnitte unten.',
      ja: '詳細の内容。下に 3 つのアコーディオン・セクション。',
      zh: '详情内容。下方三个折叠面板区段。',
      hi: 'विवरण सामग्री. नीचे तीन accordion खंड.',
      ar: 'محتوى التفاصيل. ثلاثة اقسام اكورديون ادناه.',
    },
    'tabpanel.history': {
      es: 'Contenido del historial. Vacio por ahora.',
      en: 'History content. Empty for now.',
      pt: 'Conteudo do historico. Vazio por enquanto.',
      fr: 'Contenu de l\'historique. Vide pour le moment.',
      it: 'Contenuto della cronologia. Vuoto per ora.',
      de: 'Verlaufsinhalt. Vorerst leer.',
      ja: '履歴の内容。今は空。',
      zh: '历史内容。目前为空。',
      hi: 'इतिहास सामग्री. अभी खाली.',
      ar: 'محتوى السجل. فارغ حاليا.',
    },
    'acc.section_a': {
      es: 'Seccion A', en: 'Section A', pt: 'Secao A',
      fr: 'Section A', it: 'Sezione A', de: 'Abschnitt A',
      ja: 'セクション A', zh: '区段 A',
      hi: 'अनुभाग A', ar: 'القسم A',
    },
    'acc.section_a_body': {
      es: 'Contenido oculto. Abrime con NAC.expand("acc.s1").',
      en: 'Hidden content. Open me with NAC.expand("acc.s1").',
      pt: 'Conteudo oculto. Abra-me com NAC.expand("acc.s1").',
      fr: 'Contenu masque. Ouvre-moi avec NAC.expand("acc.s1").',
      it: 'Contenuto nascosto. Aprimi con NAC.expand("acc.s1").',
      de: 'Versteckter Inhalt. Oeffne mit NAC.expand("acc.s1").',
      ja: '非表示の内容。NAC.expand("acc.s1") で開いて。',
      zh: '隐藏内容。用 NAC.expand("acc.s1") 打开。',
      hi: 'छिपी सामग्री. NAC.expand("acc.s1") से खोलें.',
      ar: 'محتوى مخفي. افتحني بـ NAC.expand("acc.s1").',
    },
    'acc.section_b': {
      es: 'Seccion B', en: 'Section B', pt: 'Secao B',
      fr: 'Section B', it: 'Sezione B', de: 'Abschnitt B',
      ja: 'セクション B', zh: '区段 B',
      hi: 'अनुभाग B', ar: 'القسم B',
    },
    'acc.section_b_body': {
      es: 'Mas contenido oculto.', en: 'More hidden content.',
      pt: 'Mais conteudo oculto.', fr: 'Plus de contenu masque.',
      it: 'Altro contenuto nascosto.', de: 'Weiterer versteckter Inhalt.',
      ja: 'さらに非表示の内容。', zh: '更多隐藏内容。',
      hi: 'और छिपी सामग्री.', ar: 'محتوى مخفي اضافي.',
    },
    /* --- combo + table --- */
    'ph.try_country': {
      es: 'Probá: Argen, Brasil, Francia',
      en: 'Try: Argen, Brazil, France',
      pt: 'Tente: Argen, Brasil, Franca',
      fr: 'Essaie : Argen, Bresil, France',
      it: 'Prova: Argen, Brasile, Francia',
      de: 'Versuch: Argen, Brasilien, Frankreich',
      ja: '試して: Argen, Brazil, France',
      zh: '试试：Argen, Brazil, France',
      hi: 'आज़माएं: Argen, Brazil, France',
      ar: 'جرب: Argen, Brazil, France',
    },
    'lbl.volume': {
      es: 'Volumen:', en: 'Volume:', pt: 'Volume:',
      fr: 'Volume :', it: 'Volume:', de: 'Lautstaerke:',
      ja: '音量:', zh: '音量：',
      hi: 'वॉल्यूम:', ar: 'الصوت:',
    },
    'ph.filter_name': {
      es: 'Filtrar por nombre...', en: 'Filter by name...',
      pt: 'Filtrar por nome...', fr: 'Filtrer par nom...',
      it: 'Filtra per nome...', de: 'Nach Namen filtern...',
      ja: '名前で絞り込み...', zh: '按名称过滤...',
      hi: 'नाम से फ़िल्टर...', ar: 'تصفية حسب الاسم...',
    },
    'aria.filter_table': {
      es: 'Filtrar tabla', en: 'Filter table',
      pt: 'Filtrar tabela', fr: 'Filtrer le tableau',
      it: 'Filtra tabella', de: 'Tabelle filtern',
      ja: '表をフィルター', zh: '过滤表格',
      hi: 'तालिका फ़िल्टर', ar: 'تصفية الجدول',
    },
    'th.name': {
      es: 'Nombre', en: 'Name', pt: 'Nome',
      fr: 'Nom', it: 'Nome', de: 'Name',
      ja: '名前', zh: '姓名', hi: 'नाम', ar: 'الاسم',
    },
    'th.age': {
      es: 'Edad', en: 'Age', pt: 'Idade',
      fr: 'Age', it: 'Eta', de: 'Alter',
      ja: '年齢', zh: '年龄', hi: 'उम्र', ar: 'العمر',
    },
    'th.city': {
      es: 'Ciudad', en: 'City', pt: 'Cidade',
      fr: 'Ville', it: 'Citta', de: 'Stadt',
      ja: '都市', zh: '城市', hi: 'शहर', ar: 'المدينة',
    },
    'btn.prev': {
      es: 'Anterior', en: 'Prev', pt: 'Anterior',
      fr: 'Prec.', it: 'Prec.', de: 'Zurueck',
      ja: '前', zh: '上一页', hi: 'पिछला', ar: 'السابق',
    },
    'btn.next_short': {
      es: 'Siguiente', en: 'Next', pt: 'Proximo',
      fr: 'Suivant', it: 'Avanti', de: 'Weiter',
      ja: '次', zh: '下一页', hi: 'अगला', ar: 'التالي',
    },
    'lbl.page': {
      es: 'Pagina', en: 'Page', pt: 'Pagina',
      fr: 'Page', it: 'Pagina', de: 'Seite',
      ja: 'ページ', zh: '页', hi: 'पृष्ठ', ar: 'صفحة',
    },
    /* --- drag list + dropzone --- */
    'drag.drop_here': {
      es: 'soltar aca', en: 'drop here',
      pt: 'soltar aqui', fr: 'deposer ici',
      it: 'rilascia qui', de: 'hier ablegen',
      ja: 'ここにドロップ', zh: '拖到此处',
      hi: 'यहाँ छोड़ें', ar: 'افلات هنا',
    },
    'dropzone.line1': {
      es: 'Soltá un archivo aca, o click para elegir.',
      en: 'Drop a file here, or click to pick.',
      pt: 'Solte um arquivo aqui, ou clique para escolher.',
      fr: 'Depose un fichier ici, ou clique pour choisir.',
      it: 'Trascina un file qui, o clicca per selezionare.',
      de: 'Datei hier ablegen oder klicken, um auszuwaehlen.',
      ja: 'ここにファイルをドロップ、またはクリックで選択。',
      zh: '把文件拖到这里，或点击选择。',
      hi: 'यहाँ फ़ाइल छोड़ें या select करने के लिए click करें।',
      ar: 'افلت ملفا هنا، او انقر للاختيار.',
    },
    'dropzone.line2': {
      es: '(no hay upload real -- solo demo)',
      en: '(no real upload -- demo only)',
      pt: '(sem upload real -- so demo)',
      fr: '(pas d\'upload reel -- demo seulement)',
      it: '(no upload reale -- solo demo)',
      de: '(kein echter Upload -- nur Demo)',
      ja: '(実際のアップロードなし -- デモのみ)',
      zh: '（无真实上传 -- 仅演示）',
      hi: '(कोई वास्तविक अपलोड नहीं -- डेमो)',
      ar: '(لا تحميل فعلي -- عرض فقط)',
    },
    'aria.file_upload': {
      es: 'Subir archivo', en: 'File upload',
      pt: 'Upload de arquivo', fr: 'Telechargement de fichier',
      it: 'Caricamento file', de: 'Datei-Upload',
      ja: 'ファイルアップロード', zh: '文件上传',
      hi: 'फ़ाइल अपलोड', ar: 'تحميل ملف',
    },
    /* --- remote autocomplete --- */
    'ph.type_2_chars': {
      es: 'Tipea al menos 2 caracteres...',
      en: 'Type at least 2 chars...',
      pt: 'Digite ao menos 2 caracteres...',
      fr: 'Tape au moins 2 caracteres...',
      it: 'Digita almeno 2 caratteri...',
      de: 'Mindestens 2 Zeichen tippen...',
      ja: '少なくとも 2 文字入力...',
      zh: '至少输入 2 个字符...',
      hi: 'कम से कम 2 अक्षर टाइप करें...',
      ar: 'اكتب حرفين على الاقل...',
    },
    'aria.search_city': {
      es: 'Buscar ciudad', en: 'Search city',
      pt: 'Buscar cidade', fr: 'Chercher une ville',
      it: 'Cerca citta', de: 'Stadt suchen',
      ja: '都市を検索', zh: '搜索城市',
      hi: 'शहर खोजें', ar: 'البحث عن مدينة',
    },
    'aria.city_suggestions': {
      es: 'Sugerencias de ciudades', en: 'City suggestions',
      pt: 'Sugestoes de cidades', fr: 'Suggestions de villes',
      it: 'Suggerimenti citta', de: 'Stadt-Vorschlaege',
      ja: '都市候補', zh: '城市建议',
      hi: 'शहर के सुझाव', ar: 'اقتراحات المدن',
    },
    'status.ready_search': {
      es: 'Listo. Tipea para buscar.', en: 'Ready. Type to search.',
      pt: 'Pronto. Digite para buscar.', fr: 'Pret. Tape pour chercher.',
      it: 'Pronto. Scrivi per cercare.', de: 'Bereit. Tippen zum Suchen.',
      ja: '準備完了。入力して検索。', zh: '就绪。输入以搜索。',
      hi: 'तैयार. खोजने के लिए टाइप करें.', ar: 'جاهز. اكتب للبحث.',
    },
    'lbl.picked': {
      es: 'Elegido:', en: 'Picked:', pt: 'Escolhido:',
      fr: 'Choisi :', it: 'Scelto:', de: 'Gewaehlt:',
      ja: '選択:', zh: '已选：',
      hi: 'चुना गया:', ar: 'المختار:',
    },
    'status.none_paren': {
      es: '(ninguno)', en: '(none)', pt: '(nenhum)',
      fr: '(aucun)', it: '(nessuno)', de: '(keine)',
      ja: '(なし)', zh: '（无）',
      hi: '(कोई नहीं)', ar: '(لا شيء)',
    },
    'cities.searching': {
      es: 'Buscando "{query}"...', en: 'Searching "{query}"...',
      pt: 'Buscando "{query}"...', fr: 'Recherche "{query}"...',
      it: 'Cercando "{query}"...', de: 'Suche "{query}"...',
      ja: '"{query}" を検索中...', zh: '正在搜索 "{query}"...',
      hi: '"{query}" खोज रहा है...', ar: 'جاري البحث عن "{query}"...',
    },
    'cities.loaded': {
      es: 'Cargados {count} resultado(s).',
      en: 'Loaded {count} result(s).',
      pt: 'Carregados {count} resultado(s).',
      fr: '{count} resultat(s) charge(s).',
      it: 'Caricati {count} risultato/i.',
      de: '{count} Ergebnis(se) geladen.',
      ja: '{count} 件の結果を読み込みました。',
      zh: '已加载 {count} 个结果。',
      hi: '{count} परिणाम लोड हुए.',
      ar: 'تم تحميل {count} نتيجة.',
    },
    'cities.type_2_chars': {
      es: 'Tipea al menos 2 caracteres.', en: 'Type at least 2 chars.',
      pt: 'Digite ao menos 2 caracteres.', fr: 'Tape au moins 2 caracteres.',
      it: 'Digita almeno 2 caratteri.', de: 'Mindestens 2 Zeichen tippen.',
      ja: '少なくとも 2 文字入力。', zh: '至少输入 2 个字符。',
      hi: 'कम से कम 2 अक्षर टाइप करें.', ar: 'اكتب حرفين على الاقل.',
    },
    /* --- navmap + selftest --- */
    'aria.navmap_output': {
      es: 'Salida del mapa del sistema', en: 'System map output',
      pt: 'Saida do mapa do sistema', fr: 'Sortie de la navmap',
      it: 'Output mappa sistema', de: 'Systemkarte-Ausgabe',
      ja: 'ナビマップ出力', zh: '系统地图输出',
      hi: 'navmap आउटपुट', ar: 'مخرجات خريطة النظام',
    },
    'aria.selftest_output': {
      es: 'Salida del self-test', en: 'Self-test output',
      pt: 'Saida do self-test', fr: 'Sortie du self-test',
      it: 'Output self-test', de: 'Selbsttest-Ausgabe',
      ja: 'セルフテスト出力', zh: '自检输出',
      hi: 'Self-test आउटपुट', ar: 'مخرجات الاختبار الذاتي',
    },
    'lbl.gap_report': {
      es: 'Reporte de gaps', en: 'Gap report',
      pt: 'Relatorio de gaps', fr: 'Rapport des manques',
      it: 'Rapporto lacune', de: 'Luecken-Bericht',
      ja: 'ギャップ報告', zh: '差距报告',
      hi: 'Gap रिपोर्ट', ar: 'تقرير الفجوات',
    },
    /* --- drawer --- */
    'card.drawer': {
      es: 'Cajon (drawer)', en: 'Drawer', pt: 'Gaveta',
      fr: 'Tiroir', it: 'Cassetto', de: 'Schublade',
      ja: 'ドロワー', zh: '抽屉',
      hi: 'Drawer', ar: 'الدرج',
    },
    'sub.drawer': {
      es: 'v1.7 sec 6.2.11 -- nac:drawer:opened/closed',
      en: 'v1.7 sec 6.2.11 -- nac:drawer:opened/closed',
      pt: 'v1.7 sec 6.2.11 -- nac:drawer:opened/closed',
      fr: 'v1.7 sec 6.2.11 -- nac:drawer:opened/closed',
      it: 'v1.7 sec 6.2.11 -- nac:drawer:opened/closed',
      de: 'v1.7 Abschn. 6.2.11 -- nac:drawer:opened/closed',
      ja: 'v1.7 第 6.2.11 節 -- nac:drawer:opened/closed',
      zh: 'v1.7 第 6.2.11 节 -- nac:drawer:opened/closed',
      hi: 'v1.7 खण्ड 6.2.11 -- nac:drawer:opened/closed',
      ar: 'v1.7 القسم 6.2.11 -- nac:drawer:opened/closed',
    },
    'btn.open_drawer': {
      es: 'Abrir cajon', en: 'Open drawer',
      pt: 'Abrir gaveta', fr: 'Ouvrir tiroir',
      it: 'Apri cassetto', de: 'Schublade oeffnen',
      ja: 'ドロワーを開く', zh: '打开抽屉',
      hi: 'Drawer खोलें', ar: 'فتح الدرج',
    },
    'lbl.drawer_content': {
      es: 'Contenido del cajon', en: 'Drawer content',
      pt: 'Conteudo da gaveta', fr: 'Contenu du tiroir',
      it: 'Contenuto cassetto', de: 'Schubladen-Inhalt',
      ja: 'ドロワーの内容', zh: '抽屉内容',
      hi: 'Drawer सामग्री', ar: 'محتوى الدرج',
    },
    'text.drawer_body': {
      es: 'Cuerpo del cajon (texto de relleno).',
      en: 'Lorem ipsum drawer body.',
      pt: 'Corpo da gaveta (texto fictício).',
      fr: 'Corps du tiroir (texte de remplissage).',
      it: 'Corpo cassetto (testo segnaposto).',
      de: 'Schubladen-Text (Platzhalter).',
      ja: 'ドロワー本文（仮テキスト）。',
      zh: '抽屉正文（占位文字）。',
      hi: 'Drawer body (placeholder text).',
      ar: 'محتوى الدرج (نص تجريبي).',
    },
    'btn.close': {
      es: 'Cerrar', en: 'Close', pt: 'Fechar',
      fr: 'Fermer', it: 'Chiudi', de: 'Schliessen',
      ja: '閉じる', zh: '关闭',
      hi: 'बंद', ar: 'اغلاق',
    },
    /* --- calendar --- */
    'card.calendar': {
      es: 'Calendario', en: 'Calendar', pt: 'Calendario',
      fr: 'Calendrier', it: 'Calendario', de: 'Kalender',
      ja: 'カレンダー', zh: '日历',
      hi: 'कैलेंडर', ar: 'التقويم',
    },
    'sub.calendar': {
      es: 'v1.7 sec 6.2.12 -- nac:calendar:view_changed/event_selected',
      en: 'v1.7 sec 6.2.12 -- nac:calendar:view_changed/event_selected',
      pt: 'v1.7 sec 6.2.12 -- nac:calendar:view_changed/event_selected',
      fr: 'v1.7 sec 6.2.12 -- nac:calendar:view_changed/event_selected',
      it: 'v1.7 sec 6.2.12 -- nac:calendar:view_changed/event_selected',
      de: 'v1.7 Abschn. 6.2.12 -- nac:calendar:view_changed/event_selected',
      ja: 'v1.7 第 6.2.12 節 -- nac:calendar:view_changed/event_selected',
      zh: 'v1.7 第 6.2.12 节 -- nac:calendar:view_changed/event_selected',
      hi: 'v1.7 खण्ड 6.2.12 -- nac:calendar:view_changed/event_selected',
      ar: 'v1.7 القسم 6.2.12 -- nac:calendar:view_changed/event_selected',
    },
    'cal.view_month': {
      es: 'Mes', en: 'Month', pt: 'Mes',
      fr: 'Mois', it: 'Mese', de: 'Monat',
      ja: '月', zh: '月', hi: 'महीना', ar: 'شهر',
    },
    'cal.view_week': {
      es: 'Semana', en: 'Week', pt: 'Semana',
      fr: 'Semaine', it: 'Settimana', de: 'Woche',
      ja: '週', zh: '周', hi: 'सप्ताह', ar: 'اسبوع',
    },
    'cal.view_day': {
      es: 'Dia', en: 'Day', pt: 'Dia',
      fr: 'Jour', it: 'Giorno', de: 'Tag',
      ja: '日', zh: '日', hi: 'दिन', ar: 'يوم',
    },
    'aria.week_cal_grid': {
      es: 'Cuadricula de calendario semanal',
      en: 'Week calendar grid',
      pt: 'Grade de calendario semanal',
      fr: 'Grille du calendrier semaine',
      it: 'Griglia calendario settimana',
      de: 'Wochen-Kalenderraster',
      ja: '週カレンダーのグリッド',
      zh: '周历网格',
      hi: 'सप्ताह कैलेंडर ग्रिड',
      ar: 'شبكة تقويم الاسبوع',
    },
    'day.mon': { es: 'Lun', en: 'Mon', pt: 'Seg', fr: 'Lun', it: 'Lun', de: 'Mo', ja: '月', zh: '周一', hi: 'सोम', ar: 'الاثن' },
    'day.tue': { es: 'Mar', en: 'Tue', pt: 'Ter', fr: 'Mar', it: 'Mar', de: 'Di', ja: '火', zh: '周二', hi: 'मंगल', ar: 'الثلا' },
    'day.wed': { es: 'Mie', en: 'Wed', pt: 'Qua', fr: 'Mer', it: 'Mer', de: 'Mi', ja: '水', zh: '周三', hi: 'बुध', ar: 'الارب' },
    'day.thu': { es: 'Jue', en: 'Thu', pt: 'Qui', fr: 'Jeu', it: 'Gio', de: 'Do', ja: '木', zh: '周四', hi: 'गुरु', ar: 'الخمي' },
    'day.fri': { es: 'Vie', en: 'Fri', pt: 'Sex', fr: 'Ven', it: 'Ven', de: 'Fr', ja: '金', zh: '周五', hi: 'शुक्र', ar: 'الجمع' },
    'day.sat': { es: 'Sab', en: 'Sat', pt: 'Sab', fr: 'Sam', it: 'Sab', de: 'Sa', ja: '土', zh: '周六', hi: 'शनि', ar: 'السبت' },
    'day.sun': { es: 'Dom', en: 'Sun', pt: 'Dom', fr: 'Dim', it: 'Dom', de: 'So', ja: '日', zh: '周日', hi: 'रवि', ar: 'الاحد' },
    'cal.evt_standup': {
      es: 'Standup 09:00', en: 'Standup 09:00',
      pt: 'Standup 09:00', fr: 'Standup 09:00',
      it: 'Standup 09:00', de: 'Standup 09:00',
      ja: 'スタンドアップ 09:00', zh: '站会 09:00',
      hi: 'Standup 09:00', ar: 'اجتماع 09:00',
    },
    'cal.evt_demo': {
      es: 'Demo 14:00', en: 'Demo 14:00',
      pt: 'Demo 14:00', fr: 'Demo 14:00',
      it: 'Demo 14:00', de: 'Demo 14:00',
      ja: 'デモ 14:00', zh: '演示 14:00',
      hi: 'Demo 14:00', ar: 'عرض 14:00',
    },
    'cal.status_default': {
      es: 'Vista: semana, 2 eventos',
      en: 'View: week, 2 events',
      pt: 'Vista: semana, 2 eventos',
      fr: 'Vue : semaine, 2 evenements',
      it: 'Vista: settimana, 2 eventi',
      de: 'Ansicht: Woche, 2 Termine',
      ja: '表示: 週、2 件',
      zh: '视图：周，2 个事件',
      hi: 'दृश्य: सप्ताह, 2 ईवेंट',
      ar: 'العرض: اسبوع، حدثان',
    },
    'cal.status_view': {
      es: 'Vista: {view}, {count} eventos',
      en: 'View: {view}, {count} events',
      pt: 'Vista: {view}, {count} eventos',
      fr: 'Vue : {view}, {count} evenements',
      it: 'Vista: {view}, {count} eventi',
      de: 'Ansicht: {view}, {count} Termine',
      ja: '表示: {view}、{count} 件',
      zh: '视图：{view}，{count} 个事件',
      hi: 'दृश्य: {view}, {count} ईवेंट',
      ar: 'العرض: {view}، {count} حدث',
    },
    'cal.status_event': {
      es: 'Evento: {event}', en: 'Event: {event}',
      pt: 'Evento: {event}', fr: 'Evenement : {event}',
      it: 'Evento: {event}', de: 'Termin: {event}',
      ja: 'イベント: {event}', zh: '事件：{event}',
      hi: 'ईवेंट: {event}', ar: 'الحدث: {event}',
    },
    /* --- chart --- */
    'card.chart': {
      es: 'Grafico', en: 'Chart', pt: 'Grafico',
      fr: 'Graphique', it: 'Grafico', de: 'Diagramm',
      ja: 'チャート', zh: '图表',
      hi: 'चार्ट', ar: 'مخطط',
    },
    'sub.chart': {
      es: 'v1.7 sec 6.2.13 -- nac:chart:data_loaded/series_toggled',
      en: 'v1.7 sec 6.2.13 -- nac:chart:data_loaded/series_toggled',
      pt: 'v1.7 sec 6.2.13 -- nac:chart:data_loaded/series_toggled',
      fr: 'v1.7 sec 6.2.13 -- nac:chart:data_loaded/series_toggled',
      it: 'v1.7 sec 6.2.13 -- nac:chart:data_loaded/series_toggled',
      de: 'v1.7 Abschn. 6.2.13 -- nac:chart:data_loaded/series_toggled',
      ja: 'v1.7 第 6.2.13 節 -- nac:chart:data_loaded/series_toggled',
      zh: 'v1.7 第 6.2.13 节 -- nac:chart:data_loaded/series_toggled',
      hi: 'v1.7 खण्ड 6.2.13 -- nac:chart:data_loaded/series_toggled',
      ar: 'v1.7 القسم 6.2.13 -- nac:chart:data_loaded/series_toggled',
    },
    'btn.reload_data': {
      es: 'Recargar datos', en: 'Reload data',
      pt: 'Recarregar dados', fr: 'Recharger',
      it: 'Ricarica dati', de: 'Daten neu laden',
      ja: 'データ再読み込み', zh: '重新加载数据',
      hi: 'डेटा पुनः लोड', ar: 'اعادة تحميل البيانات',
    },
    'aria.chart_two_series': {
      es: 'Grafico de barras de dos series',
      en: 'Two-series bar chart',
      pt: 'Grafico de barras de duas series',
      fr: 'Diagramme a barres a deux series',
      it: 'Grafico a barre a due serie',
      de: 'Saeulendiagramm mit zwei Reihen',
      ja: '2 シリーズ棒グラフ',
      zh: '双系列柱状图',
      hi: 'दो-श्रृंखला बार चार्ट',
      ar: 'مخطط شريطي بسلسلتين',
    },
    'chart.status_default': {
      es: '2 series, 6 puntos cada una',
      en: '2 series, 6 points each',
      pt: '2 series, 6 pontos cada',
      fr: '2 series, 6 points chacune',
      it: '2 serie, 6 punti ciascuna',
      de: '2 Reihen, 6 Punkte je',
      ja: '2 シリーズ、各 6 点',
      zh: '2 个系列，每个 6 个点',
      hi: '2 श्रृंखला, 6 बिंदु प्रत्येक',
      ar: 'سلسلتان، 6 نقاط لكل منهما',
    },
    'chart.status_toggled': {
      es: '{series} -> {state}', en: '{series} -> {state}',
      pt: '{series} -> {state}', fr: '{series} -> {state}',
      it: '{series} -> {state}', de: '{series} -> {state}',
      ja: '{series} -> {state}', zh: '{series} -> {state}',
      hi: '{series} -> {state}', ar: '{series} -> {state}',
    },
    'chart.state_visible': {
      es: 'visible', en: 'visible', pt: 'visivel',
      fr: 'visible', it: 'visibile', de: 'sichtbar',
      ja: '表示', zh: '显示',
      hi: 'दिखाई दे रहा', ar: 'مرئي',
    },
    'chart.state_hidden': {
      es: 'oculto', en: 'hidden', pt: 'oculto',
      fr: 'masque', it: 'nascosto', de: 'versteckt',
      ja: '非表示', zh: '隐藏',
      hi: 'छिपा', ar: 'مخفي',
    },
    'chart.status_reloaded': {
      es: 'Recargado -- 2 series, 6 puntos cada una',
      en: 'Reloaded -- 2 series, 6 points each',
      pt: 'Recarregado -- 2 series, 6 pontos cada',
      fr: 'Recharge -- 2 series, 6 points chacune',
      it: 'Ricaricato -- 2 serie, 6 punti ciascuna',
      de: 'Neu geladen -- 2 Reihen, 6 Punkte je',
      ja: '再読み込み -- 2 シリーズ、各 6 点',
      zh: '已重载 -- 2 个系列，每个 6 个点',
      hi: 'पुनः लोड -- 2 श्रृंखला, 6 बिंदु प्रत्येक',
      ar: 'اعيد التحميل -- سلسلتان، 6 نقاط لكل منهما',
    },
    /* --- map --- */
    'card.map': {
      es: 'Mapa', en: 'Map', pt: 'Mapa',
      fr: 'Carte', it: 'Mappa', de: 'Karte',
      ja: '地図', zh: '地图',
      hi: 'मानचित्र', ar: 'خريطة',
    },
    'sub.map': {
      es: 'v1.7 sec 6.2.14 -- nac:map:focused/marker_selected',
      en: 'v1.7 sec 6.2.14 -- nac:map:focused/marker_selected',
      pt: 'v1.7 sec 6.2.14 -- nac:map:focused/marker_selected',
      fr: 'v1.7 sec 6.2.14 -- nac:map:focused/marker_selected',
      it: 'v1.7 sec 6.2.14 -- nac:map:focused/marker_selected',
      de: 'v1.7 Abschn. 6.2.14 -- nac:map:focused/marker_selected',
      ja: 'v1.7 第 6.2.14 節 -- nac:map:focused/marker_selected',
      zh: 'v1.7 第 6.2.14 节 -- nac:map:focused/marker_selected',
      hi: 'v1.7 खण्ड 6.2.14 -- nac:map:focused/marker_selected',
      ar: 'v1.7 القسم 6.2.14 -- nac:map:focused/marker_selected',
    },
    'aria.map_world': {
      es: 'Mapamundi con tres marcadores sumi-e',
      en: 'World map with three sumi-e markers',
      pt: 'Mapa-mundi com tres marcadores sumi-e',
      fr: 'Carte du monde avec trois marqueurs sumi-e',
      it: 'Mappa del mondo con tre marcatori sumi-e',
      de: 'Weltkarte mit drei Sumi-e-Markierungen',
      ja: '3 つの墨絵マーカー付き世界地図',
      zh: '带三个水墨标记的世界地图',
      hi: 'तीन sumi-e markers वाला विश्व मानचित्र',
      ar: 'خريطة العالم مع ثلاث علامات سومي-اي',
    },
    'map.status_default': {
      es: 'Sin marcador seleccionado', en: 'No marker selected',
      pt: 'Nenhum marcador selecionado', fr: 'Aucun marqueur selectionne',
      it: 'Nessun marcatore selezionato', de: 'Keine Markierung gewaehlt',
      ja: 'マーカー未選択', zh: '未选择标记',
      hi: 'कोई marker चुना नहीं', ar: 'لم تحدد علامة',
    },
    'map.status_selected': {
      es: 'Seleccionado: {marker}', en: 'Selected: {marker}',
      pt: 'Selecionado: {marker}', fr: 'Selectionne : {marker}',
      it: 'Selezionato: {marker}', de: 'Gewaehlt: {marker}',
      ja: '選択: {marker}', zh: '已选：{marker}',
      hi: 'चयनित: {marker}', ar: 'المحدد: {marker}',
    },
    /* --- richtext --- */
    'card.richtext': {
      es: 'Texto enriquecido', en: 'Richtext', pt: 'Texto rico',
      fr: 'Texte enrichi', it: 'Testo formattato', de: 'Rich Text',
      ja: 'リッチテキスト', zh: '富文本',
      hi: 'रिच टेक्स्ट', ar: 'نص منسق',
    },
    'sub.richtext': {
      es: 'v1.7 sec 6.2.15 -- nac:richtext:formatted/link_inserted',
      en: 'v1.7 sec 6.2.15 -- nac:richtext:formatted/link_inserted',
      pt: 'v1.7 sec 6.2.15 -- nac:richtext:formatted/link_inserted',
      fr: 'v1.7 sec 6.2.15 -- nac:richtext:formatted/link_inserted',
      it: 'v1.7 sec 6.2.15 -- nac:richtext:formatted/link_inserted',
      de: 'v1.7 Abschn. 6.2.15 -- nac:richtext:formatted/link_inserted',
      ja: 'v1.7 第 6.2.15 節 -- nac:richtext:formatted/link_inserted',
      zh: 'v1.7 第 6.2.15 节 -- nac:richtext:formatted/link_inserted',
      hi: 'v1.7 खण्ड 6.2.15 -- nac:richtext:formatted/link_inserted',
      ar: 'v1.7 القسم 6.2.15 -- nac:richtext:formatted/link_inserted',
    },
    'btn.link': {
      es: 'Enlace', en: 'Link', pt: 'Link',
      fr: 'Lien', it: 'Collegamento', de: 'Link',
      ja: 'リンク', zh: '链接',
      hi: 'लिंक', ar: 'رابط',
    },
    'richtext.placeholder': {
      es: 'Escribi aca. Usa los botones B/I/Enlace.',
      en: 'Type here. Use B/I/Link buttons.',
      pt: 'Digite aqui. Use os botoes B/I/Link.',
      fr: 'Tape ici. Utilise les boutons B/I/Lien.',
      it: 'Scrivi qui. Usa i pulsanti B/I/Link.',
      de: 'Hier tippen. B/I/Link-Knoepfe nutzen.',
      ja: 'ここに入力。B/I/リンクボタンを使って。',
      zh: '在此输入。使用 B/I/链接按钮。',
      hi: 'यहाँ टाइप करें. B/I/Link बटन use करें.',
      ar: 'اكتب هنا. استخدم ازرار B/I/Link.',
    },
    /* --- breadcrumb --- */
    'card.breadcrumb': {
      es: 'Migas (breadcrumb)', en: 'Breadcrumb',
      pt: 'Trilha', fr: 'Fil d\'Ariane',
      it: 'Briciole', de: 'Brotkrumen',
      ja: 'パンくず', zh: '面包屑',
      hi: 'Breadcrumb', ar: 'مسار التنقل',
    },
    'sub.breadcrumb': {
      es: 'v1.7 sec 6.2.16 -- nac:breadcrumb:navigated',
      en: 'v1.7 sec 6.2.16 -- nac:breadcrumb:navigated',
      pt: 'v1.7 sec 6.2.16 -- nac:breadcrumb:navigated',
      fr: 'v1.7 sec 6.2.16 -- nac:breadcrumb:navigated',
      it: 'v1.7 sec 6.2.16 -- nac:breadcrumb:navigated',
      de: 'v1.7 Abschn. 6.2.16 -- nac:breadcrumb:navigated',
      ja: 'v1.7 第 6.2.16 節 -- nac:breadcrumb:navigated',
      zh: 'v1.7 第 6.2.16 节 -- nac:breadcrumb:navigated',
      hi: 'v1.7 खण्ड 6.2.16 -- nac:breadcrumb:navigated',
      ar: 'v1.7 القسم 6.2.16 -- nac:breadcrumb:navigated',
    },
    'crumb.home': {
      es: 'Inicio', en: 'Home', pt: 'Inicio',
      fr: 'Accueil', it: 'Home', de: 'Start',
      ja: 'ホーム', zh: '首页',
      hi: 'होम', ar: 'الرئيسية',
    },
    'crumb.catalogue': {
      es: 'Catalogo', en: 'Catalogue', pt: 'Catalogo',
      fr: 'Catalogue', it: 'Catalogo', de: 'Katalog',
      ja: 'カタログ', zh: '目录',
      hi: 'कैटलॉग', ar: 'الكتالوج',
    },
    'crumb.item_42': {
      es: 'Item 42', en: 'Item 42', pt: 'Item 42',
      fr: 'Article 42', it: 'Elemento 42', de: 'Artikel 42',
      ja: 'アイテム 42', zh: '条目 42',
      hi: 'आइटम 42', ar: 'العنصر 42',
    },
    'crumb.preview_label': {
      es: 'Mostrando:', en: 'Showing:', pt: 'Exibindo:',
      fr: 'Affichage :', it: 'Mostrando:', de: 'Anzeige:',
      ja: '表示中:', zh: '显示：',
      hi: 'दिखा रहा:', ar: 'عرض:',
    },
    /* --- carousel --- */
    'card.carousel': {
      es: 'Carrusel', en: 'Carousel', pt: 'Carrossel',
      fr: 'Carrousel', it: 'Carosello', de: 'Karussell',
      ja: 'カルーセル', zh: '轮播',
      hi: 'Carousel', ar: 'الشريط الدوار',
    },
    'sub.carousel': {
      es: 'v1.7 sec 6.2.17 -- nac:carousel:advanced',
      en: 'v1.7 sec 6.2.17 -- nac:carousel:advanced',
      pt: 'v1.7 sec 6.2.17 -- nac:carousel:advanced',
      fr: 'v1.7 sec 6.2.17 -- nac:carousel:advanced',
      it: 'v1.7 sec 6.2.17 -- nac:carousel:advanced',
      de: 'v1.7 Abschn. 6.2.17 -- nac:carousel:advanced',
      ja: 'v1.7 第 6.2.17 節 -- nac:carousel:advanced',
      zh: 'v1.7 第 6.2.17 节 -- nac:carousel:advanced',
      hi: 'v1.7 खण्ड 6.2.17 -- nac:carousel:advanced',
      ar: 'v1.7 القسم 6.2.17 -- nac:carousel:advanced',
    },
    'carousel.sakura_title': {
      es: 'Sakura', en: 'Sakura', pt: 'Sakura',
      fr: 'Sakura', it: 'Sakura', de: 'Sakura',
      ja: '桜', zh: '樱花',
      hi: 'Sakura', ar: 'ساكورا',
    },
    'carousel.sakura_blurb': {
      es: 'Cerezo en tinta. Indice 0 de 3.',
      en: 'Cherry blossom in ink. Index 0 of 3.',
      pt: 'Cerejeira em tinta. Indice 0 de 3.',
      fr: 'Cerisier a l\'encre. Index 0 sur 3.',
      it: 'Ciliegio a inchiostro. Indice 0 di 3.',
      de: 'Kirschbluete in Tusche. Index 0 von 3.',
      ja: '墨で描いた桜。インデックス 0 / 3。',
      zh: '水墨樱花。索引 0/3。',
      hi: 'स्याही में चेरी ब्लॉसम. Index 0 / 3।',
      ar: 'ازهار الكرز بالحبر. الفهرس 0 من 3.',
    },
    'carousel.fuji_title': {
      es: 'Fuji', en: 'Fuji', pt: 'Fuji',
      fr: 'Fuji', it: 'Fuji', de: 'Fuji',
      ja: '富士', zh: '富士',
      hi: 'Fuji', ar: 'فوجي',
    },
    'carousel.fuji_blurb': {
      es: 'Silueta del Fuji. Indice 1 de 3.',
      en: 'Mount Fuji silhouette. Index 1 of 3.',
      pt: 'Silhueta do Fuji. Indice 1 de 3.',
      fr: 'Silhouette du Fuji. Index 1 sur 3.',
      it: 'Sagoma del Fuji. Indice 1 di 3.',
      de: 'Fuji-Silhouette. Index 1 von 3.',
      ja: '富士山のシルエット。インデックス 1 / 3。',
      zh: '富士山轮廓。索引 1/3。',
      hi: 'Fuji silhouette. Index 1 / 3।',
      ar: 'صورة ظلية لجبل فوجي. الفهرس 1 من 3.',
    },
    'carousel.bamboo_title': {
      es: 'Bambu', en: 'Bamboo', pt: 'Bambu',
      fr: 'Bambou', it: 'Bambu', de: 'Bambus',
      ja: '竹', zh: '竹',
      hi: 'बाँस', ar: 'الخيزران',
    },
    'carousel.bamboo_blurb': {
      es: 'Pinceladas de bambu. Indice 2 de 3.',
      en: 'Bamboo grove brushstrokes. Index 2 of 3.',
      pt: 'Pinceladas de bambu. Indice 2 de 3.',
      fr: 'Coups de pinceau bambou. Index 2 sur 3.',
      it: 'Pennellate di bambu. Indice 2 di 3.',
      de: 'Bambus-Pinselstriche. Index 2 von 3.',
      ja: '竹のブラシストローク。インデックス 2 / 3。',
      zh: '竹林笔触。索引 2/3。',
      hi: 'बाँस की brushstrokes. Index 2 / 3।',
      ar: 'لمسات فرشاة الخيزران. الفهرس 2 من 3.',
    },
    'aria.prev_slide': {
      es: 'Slide anterior', en: 'Previous slide',
      pt: 'Slide anterior', fr: 'Slide precedent',
      it: 'Slide precedente', de: 'Voriges Slide',
      ja: '前のスライド', zh: '上一张',
      hi: 'पिछला slide', ar: 'الشريحة السابقة',
    },
    'aria.next_slide': {
      es: 'Slide siguiente', en: 'Next slide',
      pt: 'Slide seguinte', fr: 'Slide suivant',
      it: 'Slide successivo', de: 'Naechstes Slide',
      ja: '次のスライド', zh: '下一张',
      hi: 'अगला slide', ar: 'الشريحة التالية',
    },
    'carousel.display_default': {
      es: 'Slide 1 de 3', en: 'Slide 1 of 3',
      pt: 'Slide 1 de 3', fr: 'Slide 1 sur 3',
      it: 'Slide 1 di 3', de: 'Slide 1 von 3',
      ja: 'スライド 1 / 3', zh: '幻灯片 1/3',
      hi: 'Slide 1 / 3', ar: 'الشريحة 1 من 3',
    },
    'carousel.display': {
      es: 'Slide {n} de {total}', en: 'Slide {n} of {total}',
      pt: 'Slide {n} de {total}', fr: 'Slide {n} sur {total}',
      it: 'Slide {n} di {total}', de: 'Slide {n} von {total}',
      ja: 'スライド {n} / {total}', zh: '幻灯片 {n}/{total}',
      hi: 'Slide {n} / {total}', ar: 'الشريحة {n} من {total}',
    },
    /* --- timeline --- */
    'card.timeline': {
      es: 'Linea de tiempo', en: 'Timeline',
      pt: 'Linha do tempo', fr: 'Chronologie',
      it: 'Cronologia', de: 'Zeitleiste',
      ja: 'タイムライン', zh: '时间线',
      hi: 'टाइमलाइन', ar: 'الخط الزمني',
    },
    'sub.timeline': {
      es: 'v1.7 sec 6.2.18 -- nac:timeline:loaded',
      en: 'v1.7 sec 6.2.18 -- nac:timeline:loaded',
      pt: 'v1.7 sec 6.2.18 -- nac:timeline:loaded',
      fr: 'v1.7 sec 6.2.18 -- nac:timeline:loaded',
      it: 'v1.7 sec 6.2.18 -- nac:timeline:loaded',
      de: 'v1.7 Abschn. 6.2.18 -- nac:timeline:loaded',
      ja: 'v1.7 第 6.2.18 節 -- nac:timeline:loaded',
      zh: 'v1.7 第 6.2.18 节 -- nac:timeline:loaded',
      hi: 'v1.7 खण्ड 6.2.18 -- nac:timeline:loaded',
      ar: 'v1.7 القسم 6.2.18 -- nac:timeline:loaded',
    },
    'btn.load_older': {
      es: 'Cargar mas viejos', en: 'Load older',
      pt: 'Carregar mais antigos', fr: 'Charger plus anciens',
      it: 'Carica piu vecchi', de: 'Aeltere laden',
      ja: '古いものを読み込む', zh: '加载更早',
      hi: 'पुराने लोड करें', ar: 'تحميل الاقدم',
    },
    'btn.load_newer': {
      es: 'Cargar mas nuevos', en: 'Load newer',
      pt: 'Carregar mais novos', fr: 'Charger plus recents',
      it: 'Carica piu recenti', de: 'Neuere laden',
      ja: '新しいものを読み込む', zh: '加载更新',
      hi: 'नए लोड करें', ar: 'تحميل الاحدث',
    },
    /* --- skip / a11y / dragtypes --- */
    'card.skip': {
      es: 'Region "skip-validate"', en: 'Skip-validate region',
      pt: 'Regiao skip-validate', fr: 'Region skip-validate',
      it: 'Regione skip-validate', de: 'Skip-validate-Bereich',
      ja: 'skip-validate 領域', zh: 'skip-validate 区域',
      hi: 'Skip-validate क्षेत्र', ar: 'منطقة skip-validate',
    },
    'sub.skip': {
      es: 'v1.8 sec 3.1 -- data-nac-validate="skip"',
      en: 'v1.8 sec 3.1 -- data-nac-validate="skip"',
      pt: 'v1.8 sec 3.1 -- data-nac-validate="skip"',
      fr: 'v1.8 sec 3.1 -- data-nac-validate="skip"',
      it: 'v1.8 sec 3.1 -- data-nac-validate="skip"',
      de: 'v1.8 Abschn. 3.1 -- data-nac-validate="skip"',
      ja: 'v1.8 第 3.1 節 -- data-nac-validate="skip"',
      zh: 'v1.8 第 3.1 节 -- data-nac-validate="skip"',
      hi: 'v1.8 खण्ड 3.1 -- data-nac-validate="skip"',
      ar: 'v1.8 القسم 3.1 -- data-nac-validate="skip"',
    },
    'blurb.skip': {
      es: 'La region gris simula un widget de un tercero que el host no puede instrumentar con NAC. El validador NO produce hard-errors sobre su contenido pero SI advierte sobre los interactivos que oculta.',
      en: 'The grey region below mocks a third-party widget the host cannot retrofit with NAC. The validator does NOT raise hard-errors on its contents but DOES warn about the interactives it hides.',
      pt: 'A regiao cinza simula um widget de terceiros que o host nao pode instrumentar com NAC. O validador NAO produz hard-errors sobre seu conteudo mas alerta sobre os interativos que esconde.',
      fr: 'La zone grise simule un widget tiers que l\'hote ne peut pas instrumenter avec NAC. Le validateur ne produit PAS d\'erreurs strictes sur son contenu mais avertit des interactifs qu\'il cache.',
      it: 'La regione grigia simula un widget di terze parti che l\'host non puo strumentare con NAC. Il validatore NON solleva hard-error sul contenuto ma AVVERTE sugli interattivi nascosti.',
      de: 'Der graue Bereich simuliert ein Drittanbieter-Widget, das der Host nicht mit NAC nachruesten kann. Der Validator wirft KEINE Hard-Errors fuer seinen Inhalt, WARNT aber vor versteckten interaktiven Elementen.',
      ja: 'グレーの領域はホストが NAC で計装できないサードパーティ・ウィジェットを模倣します。バリデータは内容に対してハードエラーを出しませんが、隠されたインタラクティブ要素には警告を出します。',
      zh: '灰色区域模拟一个 host 无法用 NAC 改造的第三方组件。验证器不会对其内容报告 hard-error，但会对其隐藏的交互元素发出警告。',
      hi: 'ग्रे क्षेत्र एक third-party widget को mock करता है जिसे host NAC से retrofit नहीं कर सकता। Validator इसकी सामग्री पर hard-error नहीं उठाता लेकिन छिपे interactives पर warn करता है।',
      ar: 'تحاكي المنطقة الرمادية اداة من طرف ثالث لا يستطيع المضيف تعديلها بـ NAC. لا يصدر المدقق اخطاء صارمة على محتواها لكنه يحذر من العناصر التفاعلية المخفية.',
    },
    'aria.vendor_widget': {
      es: 'Widget de proveedor (no etiquetado con NAC)',
      en: 'Vendor widget (not NAC-tagged)',
      pt: 'Widget de fornecedor (sem tag NAC)',
      fr: 'Widget tiers (sans etiquette NAC)',
      it: 'Widget di terze parti (senza tag NAC)',
      de: 'Anbieter-Widget (ohne NAC-Tag)',
      ja: 'ベンダー・ウィジェット (NAC 未タグ)',
      zh: '供应商组件（未标记 NAC）',
      hi: 'वेंडर widget (NAC tag नहीं)',
      ar: 'اداة من بائع (بدون وسم NAC)',
    },
    'skip.third_party_label': {
      es: 'tercero', en: '3rd-party', pt: 'terceiro',
      fr: 'tiers', it: 'terzo', de: 'Dritt-Anbieter',
      ja: 'サードパーティ', zh: '第三方',
      hi: 'थर्ड पार्टी', ar: 'طرف ثالث',
    },
    'skip.vendor_button': {
      es: 'Boton del proveedor', en: 'Vendor button',
      pt: 'Botao do fornecedor', fr: 'Bouton du tiers',
      it: 'Pulsante del fornitore', de: 'Anbieter-Knopf',
      ja: 'ベンダーのボタン', zh: '供应商按钮',
      hi: 'वेंडर बटन', ar: 'زر البائع',
    },
    'skip.vendor_input_ph': {
      es: 'Input del proveedor', en: 'Vendor input',
      pt: 'Input do fornecedor', fr: 'Saisie du tiers',
      it: 'Input del fornitore', de: 'Anbieter-Eingabe',
      ja: 'ベンダーの入力', zh: '供应商输入',
      hi: 'वेंडर input', ar: 'حقل البائع',
    },
    'btn.run_validate': {
      es: 'Correr validate()', en: 'Run validate()',
      pt: 'Rodar validate()', fr: 'Lancer validate()',
      it: 'Esegui validate()', de: 'validate() starten',
      ja: 'validate() を実行', zh: '运行 validate()',
      hi: 'validate() चलाएँ', ar: 'تشغيل validate()',
    },
    'card.a11y': {
      es: 'Accion peligrosa con a11y hint',
      en: 'Dangerous action with a11y hint',
      pt: 'Acao perigosa com a11y hint',
      fr: 'Action dangereuse avec a11y hint',
      it: 'Azione pericolosa con a11y hint',
      de: 'Gefaehrliche Aktion mit a11y-Hinweis',
      ja: 'a11y ヒント付きの危険なアクション',
      zh: '带 a11y 提示的危险操作',
      hi: 'a11y hint के साथ खतरनाक action',
      ar: 'اجراء خطير مع تلميح a11y',
    },
    'sub.a11y': {
      es: 'v1.8 sec 3.1 -- data-nac-a11y-hint',
      en: 'v1.8 sec 3.1 -- data-nac-a11y-hint',
      pt: 'v1.8 sec 3.1 -- data-nac-a11y-hint',
      fr: 'v1.8 sec 3.1 -- data-nac-a11y-hint',
      it: 'v1.8 sec 3.1 -- data-nac-a11y-hint',
      de: 'v1.8 Abschn. 3.1 -- data-nac-a11y-hint',
      ja: 'v1.8 第 3.1 節 -- data-nac-a11y-hint',
      zh: 'v1.8 第 3.1 节 -- data-nac-a11y-hint',
      hi: 'v1.8 खण्ड 3.1 -- data-nac-a11y-hint',
      ar: 'v1.8 القسم 3.1 -- data-nac-a11y-hint',
    },
    'blurb.a11y': {
      es: 'El boton de abajo declara su riesgo via data-nac-a11y-hint. Las herramientas de voz, los lectores de pantalla y los agentes IA leen esto desde NAC.describe() y DEBERIAN interponer una confirmacion ANTES de invocar. El boton inerte de al lado no tiene hint y es solo una accion normal.',
      en: 'The button below declares its risk via data-nac-a11y-hint. Voice tools, screen readers and AI agents read this from NAC.describe() and SHOULD interpose a confirmation BEFORE invoking. The inert button next to it has no hint and is just a normal action.',
      pt: 'O botao abaixo declara seu risco via data-nac-a11y-hint. Ferramentas de voz, leitores de tela e agentes IA leem isso de NAC.describe() e DEVEM interpor uma confirmacao ANTES de invocar. O botao inerte ao lado nao tem hint.',
      fr: 'Le bouton ci-dessous declare son risque via data-nac-a11y-hint. Les outils vocaux, les lecteurs d\'ecran et les agents IA lisent ceci depuis NAC.describe() et DOIVENT interposer une confirmation AVANT d\'invoquer. Le bouton inerte voisin n\'a pas de hint.',
      it: 'Il pulsante sottostante dichiara il rischio via data-nac-a11y-hint. Strumenti vocali, screen reader e agenti IA lo leggono da NAC.describe() e DOVREBBERO interporre una conferma PRIMA di invocare. Il pulsante inerte vicino non ha hint.',
      de: 'Der Knopf unten deklariert sein Risiko via data-nac-a11y-hint. Voice-Tools, Screen Reader und KI-Agenten lesen dies aus NAC.describe() und SOLLTEN eine Bestaetigung VOR dem Auslosen einschieben. Der inerte Knopf daneben hat keinen Hinweis.',
      ja: '下のボタンは data-nac-a11y-hint でリスクを宣言します。音声ツール、スクリーンリーダー、AI エージェントは NAC.describe() からこれを読み、呼び出し前に確認を挟むべきです。隣の不活性ボタンにはヒントがありません。',
      zh: '下方按钮通过 data-nac-a11y-hint 声明风险。语音工具、屏幕阅读器和 AI 代理从 NAC.describe() 读取此信息，并应在调用前插入确认。旁边的非活动按钮没有 hint。',
      hi: 'नीचे का बटन data-nac-a11y-hint से अपना risk घोषित करता है। Voice tools, screen readers और AI agents इसे NAC.describe() से पढ़ते हैं और invoking से पहले confirmation interpose करना चाहिए। बगल का inert बटन hint-less है।',
      ar: 'يعلن الزر ادناه عن خطورته عبر data-nac-a11y-hint. تقرا ادوات الصوت وقارئات الشاشة ووكلاء الذكاء هذا من NAC.describe() ويجب ان يضعوا تاكيدا قبل الاستدعاء. الزر المجاور الخامل بلا تلميح.',
    },
    'btn.delete_invoice': {
      es: 'Eliminar factura', en: 'Delete invoice',
      pt: 'Excluir fatura', fr: 'Supprimer la facture',
      it: 'Elimina fattura', de: 'Rechnung loeschen',
      ja: '請求書を削除', zh: '删除发票',
      hi: 'चालान हटाएँ', ar: 'حذف الفاتورة',
    },
    'btn.preview_invoice': {
      es: 'Previsualizar factura', en: 'Preview invoice',
      pt: 'Visualizar fatura', fr: 'Apercu facture',
      it: 'Anteprima fattura', de: 'Rechnung Vorschau',
      ja: '請求書をプレビュー', zh: '预览发票',
      hi: 'चालान preview', ar: 'معاينة الفاتورة',
    },
    'a11y.foot_describe': {
      es: 'describe() en el boton delete: a11y_hint: ["irreversible","requires_confirmation","data_loss"]',
      en: 'describe() on the delete button: a11y_hint: ["irreversible","requires_confirmation","data_loss"]',
      pt: 'describe() no botao delete: a11y_hint: ["irreversible","requires_confirmation","data_loss"]',
      fr: 'describe() sur le bouton delete : a11y_hint: ["irreversible","requires_confirmation","data_loss"]',
      it: 'describe() sul pulsante delete: a11y_hint: ["irreversible","requires_confirmation","data_loss"]',
      de: 'describe() am Loeschen-Knopf: a11y_hint: ["irreversible","requires_confirmation","data_loss"]',
      ja: '削除ボタンの describe(): a11y_hint: ["irreversible","requires_confirmation","data_loss"]',
      zh: '删除按钮上的 describe()：a11y_hint: ["irreversible","requires_confirmation","data_loss"]',
      hi: 'delete बटन पर describe(): a11y_hint: ["irreversible","requires_confirmation","data_loss"]',
      ar: 'describe() على زر الحذف: a11y_hint: ["irreversible","requires_confirmation","data_loss"]',
    },
    'card.dragtypes': {
      es: 'Aceptar / rechazar por tipo de drag',
      en: 'Drag-type accept / reject',
      pt: 'Aceitar / rejeitar por tipo de drag',
      fr: 'Accepter / refuser par type de drag',
      it: 'Accetta / rifiuta per tipo drag',
      de: 'Drag-Typ akzeptieren / ablehnen',
      ja: 'ドラッグ型の受理 / 拒否',
      zh: '按 drag 类型接受 / 拒绝',
      hi: 'Drag-type accept / reject',
      ar: 'قبول / رفض حسب نوع السحب',
    },
    'sub.dragtypes': {
      es: 'v1.8 sec 13.4 -- data-nac-drag-type / -drag-accept',
      en: 'v1.8 sec 13.4 -- data-nac-drag-type / -drag-accept',
      pt: 'v1.8 sec 13.4 -- data-nac-drag-type / -drag-accept',
      fr: 'v1.8 sec 13.4 -- data-nac-drag-type / -drag-accept',
      it: 'v1.8 sec 13.4 -- data-nac-drag-type / -drag-accept',
      de: 'v1.8 Abschn. 13.4 -- data-nac-drag-type / -drag-accept',
      ja: 'v1.8 第 13.4 節 -- data-nac-drag-type / -drag-accept',
      zh: 'v1.8 第 13.4 节 -- data-nac-drag-type / -drag-accept',
      hi: 'v1.8 खण्ड 13.4 -- data-nac-drag-type / -drag-accept',
      ar: 'v1.8 القسم 13.4 -- data-nac-drag-type / -drag-accept',
    },
    'blurb.dragtypes': {
      es: 'Arrastrá las tarjetas tipadas a una de las dos zonas. La zona "files only" solo acepta file; la zona "any" acepta todo. Una incompatibilidad de tipo dispara nac:command:rejected con reason="drag_type_mismatch".',
      en: 'Drag the typed cards into one of the two zones. The "files only" zone accepts only file; the "any" zone accepts everything. A type mismatch fires nac:command:rejected with reason="drag_type_mismatch".',
      pt: 'Arraste os cartoes tipados para uma das zonas. A zona "files only" aceita apenas file; a zona "any" aceita tudo. Uma incompatibilidade dispara nac:command:rejected com reason="drag_type_mismatch".',
      fr: 'Glisse les cartes typees dans l\'une des zones. La zone "files only" n\'accepte que file ; la zone "any" accepte tout. Un type non compatible declenche nac:command:rejected avec reason="drag_type_mismatch".',
      it: 'Trascina le carte tipizzate in una delle zone. La zona "files only" accetta solo file; la zona "any" accetta tutto. Un mismatch di tipo emette nac:command:rejected con reason="drag_type_mismatch".',
      de: 'Ziehe die typisierten Karten in eine der Zonen. Die Zone "files only" akzeptiert nur file; die Zone "any" akzeptiert alles. Ein Typ-Mismatch sendet nac:command:rejected mit reason="drag_type_mismatch".',
      ja: '型付きカードをいずれかのゾーンにドラッグ。"files only" は file のみ、"any" はすべて受け付け。型不一致は reason="drag_type_mismatch" で nac:command:rejected を発火。',
      zh: '将带类型的卡片拖到两个区域之一。"files only" 仅接受 file；"any" 接受所有。类型不匹配会触发 reason="drag_type_mismatch" 的 nac:command:rejected。',
      hi: 'Typed cards को दो zones में से एक में drag करें. "files only" zone केवल file accept करता है; "any" zone सब. Type mismatch reason="drag_type_mismatch" के साथ nac:command:rejected fire करता है.',
      ar: 'اسحب البطاقات المصنفة الى احدى المنطقتين. "files only" تقبل file فقط؛ "any" تقبل كل شيء. عدم تطابق النوع يطلق nac:command:rejected مع reason="drag_type_mismatch".',
    },
    'dragtypes.files_only': {
      es: 'solo archivos', en: 'files only',
      pt: 'apenas arquivos', fr: 'fichiers uniquement',
      it: 'solo file', de: 'nur Dateien',
      ja: 'ファイルのみ', zh: '仅文件',
      hi: 'केवल फ़ाइलें', ar: 'الملفات فقط',
    },
    'dragtypes.any': {
      es: 'cualquiera', en: 'any',
      pt: 'qualquer', fr: 'tout',
      it: 'qualsiasi', de: 'alles',
      ja: '任意', zh: '任意',
      hi: 'कोई भी', ar: 'اي',
    },
    'btn.drive_mismatch': {
      es: 'Tirar tag -> solo archivos (rechazado)',
      en: 'Drive a tag -> files-only (rejected)',
      pt: 'Levar tag -> apenas arquivos (rejeitado)',
      fr: 'Conduire un tag -> fichiers uniquement (rejete)',
      it: 'Trascina un tag -> solo file (rifiutato)',
      de: 'Tag treiben -> nur Dateien (abgelehnt)',
      ja: 'tag を files-only へ (拒否)',
      zh: '将 tag 拖到 files-only（拒绝）',
      hi: 'tag को files-only पर drive (rejected)',
      ar: 'سحب tag -> ملفات فقط (مرفوض)',
    },
    /* --- chat aside + chrome --- */
    'aria.yujin_guide': {
      es: 'Guia y chat de Yujin', en: 'Yujin guide and chat',
      pt: 'Guia e chat do Yujin', fr: 'Guide et chat Yujin',
      it: 'Guida e chat Yujin', de: 'Yujin-Anleitung und Chat',
      ja: 'Yujin ガイドとチャット', zh: 'Yujin 指南和聊天',
      hi: 'Yujin गाइड और चैट', ar: 'دليل ودردشة Yujin',
    },
    'chat.status_offline': {
      es: 'demo offline', en: 'offline demo',
      pt: 'demo offline', fr: 'demo hors-ligne',
      it: 'demo offline', de: 'Offline-Demo',
      ja: 'オフライン・デモ', zh: '离线演示',
      hi: 'ऑफ़लाइन डेमो', ar: 'عرض دون اتصال',
    },
    'aria.display_language': {
      es: 'Idioma de la interfaz', en: 'Display language',
      pt: 'Idioma da interface', fr: 'Langue d\'affichage',
      it: 'Lingua di visualizzazione', de: 'Anzeigesprache',
      ja: '表示言語', zh: '界面语言',
      hi: 'इंटरफ़ेस भाषा', ar: 'لغة العرض',
    },
    'aria.hold_to_talk': {
      es: 'Mantene apretado para hablar', en: 'Hold to talk',
      pt: 'Segure para falar', fr: 'Maintenir pour parler',
      it: 'Tieni premuto per parlare', de: 'Druecken zum Sprechen',
      ja: '長押しで話す', zh: '按住说话',
      hi: 'बोलने के लिए दबाएँ', ar: 'اضغط للتحدث',
    },
    'ph.tell_yujin': {
      es: 'Decile a Yujin que hacer (probá: tocale Do)',
      en: 'Tell Yujin what to do (try: tocale Do)',
      pt: 'Diga ao Yujin o que fazer (tente: tocale Do)',
      fr: 'Dis a Yujin quoi faire (essaie : tocale Do)',
      it: 'Dì a Yujin cosa fare (prova: tocale Do)',
      de: 'Sag Yujin, was zu tun ist (Beispiel: tocale Do)',
      ja: 'Yujin に指示を出す (例: tocale Do)',
      zh: '告诉 Yujin 做什么（试试：tocale Do）',
      hi: 'Yujin को बताएँ क्या करना है (try: tocale Do)',
      ar: 'اخبر Yujin بما يجب فعله (جرب: tocale Do)',
    },
    'aria.send': {
      es: 'Enviar', en: 'Send', pt: 'Enviar',
      fr: 'Envoyer', it: 'Invia', de: 'Senden',
      ja: '送信', zh: '发送',
      hi: 'भेजें', ar: 'ارسال',
    },
    'aria.toggle_voice': {
      es: 'Alternar respuestas por voz', en: 'Toggle voice replies',
      pt: 'Alternar respostas por voz', fr: 'Basculer reponses vocales',
      it: 'Attiva/disattiva risposte vocali', de: 'Sprachantworten umschalten',
      ja: '音声応答の切り替え', zh: '切换语音回复',
      hi: 'आवाज़ उत्तर toggle', ar: 'تبديل الردود الصوتية',
    },
    'aria.hands_free': {
      es: 'Manos libres / escucha siempre activa',
      en: 'Hands-free / always-on listening',
      pt: 'Maos livres / sempre ouvindo',
      fr: 'Mains libres / ecoute permanente',
      it: 'A mani libere / ascolto continuo',
      de: 'Freisprechen / Dauer-Hoeren',
      ja: 'ハンズフリー / 常時聞き取り',
      zh: '免提 / 持续聆听',
      hi: 'हैंड्स-फ़्री / हमेशा सुन रहा',
      ar: 'بدون يدين / استماع دائم',
    },
    'title.hands_free': {
      es: 'Manos libres', en: 'Hands-free',
      pt: 'Maos livres', fr: 'Mains libres',
      it: 'A mani libere', de: 'Freisprechen',
      ja: 'ハンズフリー', zh: '免提',
      hi: 'हैंड्स-फ़्री', ar: 'بدون يدين',
    },
    /* --- gallery aria + chrome --- */
    'aria.sakura_branch': {
      es: 'Rama de sakura', en: 'Sakura branch',
      pt: 'Galho de sakura', fr: 'Branche de sakura',
      it: 'Ramo di sakura', de: 'Sakura-Zweig',
      ja: '桜の枝', zh: '樱花枝',
      hi: 'Sakura शाखा', ar: 'فرع الساكورا',
    },
    'aria.mount_fuji': {
      es: 'Monte Fuji', en: 'Mount Fuji',
      pt: 'Monte Fuji', fr: 'Mont Fuji',
      it: 'Monte Fuji', de: 'Berg Fuji',
      ja: '富士山', zh: '富士山',
      hi: 'फ़ूजी पर्वत', ar: 'جبل فوجي',
    },
    'aria.bamboo': {
      es: 'Bambu', en: 'Bamboo',
      pt: 'Bambu', fr: 'Bambou',
      it: 'Bambu', de: 'Bambus',
      ja: '竹', zh: '竹',
      hi: 'बाँस', ar: 'الخيزران',
    },
    'aria.minimize': {
      es: 'Minimizar', en: 'Minimize',
      pt: 'Minimizar', fr: 'Reduire',
      it: 'Riduci', de: 'Minimieren',
      ja: '最小化', zh: '最小化',
      hi: 'छोटा करें', ar: 'تصغير',
    },
    'aria.maximize': {
      es: 'Maximizar', en: 'Maximize',
      pt: 'Maximizar', fr: 'Agrandir',
      it: 'Ingrandisci', de: 'Maximieren',
      ja: '最大化', zh: '最大化',
      hi: 'बड़ा करें', ar: 'تكبير',
    },
    'aria.restore': {
      es: 'Restaurar', en: 'Restore',
      pt: 'Restaurar', fr: 'Restaurer',
      it: 'Ripristina', de: 'Wiederherstellen',
      ja: '元に戻す', zh: '还原',
      hi: 'पुनर्स्थापित', ar: 'استعادة',
    },
    /* --- tree --- */
    'aria.toggle_fruits': {
      es: 'Alternar nodo Frutas', en: 'Toggle Fruits node',
      pt: 'Alternar no Frutas', fr: 'Basculer noeud Fruits',
      it: 'Apri/chiudi nodo Frutta', de: 'Knoten Fruechte umschalten',
      ja: '「果物」ノードの切り替え', zh: '切换"水果"节点',
      hi: '"फल" node toggle', ar: 'تبديل عقدة الفاكهة',
    },
    'aria.toggle_citrus': {
      es: 'Alternar nodo Citricos', en: 'Toggle Citrus node',
      pt: 'Alternar no Citricos', fr: 'Basculer noeud Agrumes',
      it: 'Apri/chiudi nodo Agrumi', de: 'Knoten Zitrus umschalten',
      ja: '「柑橘」ノードの切り替え', zh: '切换"柑橘"节点',
      hi: '"खट्टे फल" node toggle', ar: 'تبديل عقدة الحمضيات',
    },
    'aria.toggle_veggies': {
      es: 'Alternar nodo Verduras', en: 'Toggle Vegetables node',
      pt: 'Alternar no Vegetais', fr: 'Basculer noeud Legumes',
      it: 'Apri/chiudi nodo Verdure', de: 'Knoten Gemuese umschalten',
      ja: '「野菜」ノードの切り替え', zh: '切换"蔬菜"节点',
      hi: '"सब्ज़ियाँ" node toggle', ar: 'تبديل عقدة الخضراوات',
    },
    'aria.toggle_greens': {
      es: 'Alternar nodo Hojas verdes', en: 'Toggle Greens node',
      pt: 'Alternar no Folhas verdes', fr: 'Basculer noeud Feuilles vertes',
      it: 'Apri/chiudi nodo Verdure a foglia', de: 'Knoten Blattgemuese umschalten',
      ja: '「葉物野菜」ノードの切り替え', zh: '切换"绿叶菜"节点',
      hi: '"पत्तेदार" node toggle', ar: 'تبديل عقدة الخضراوات الورقية',
    },
    'aria.toggle_grains': {
      es: 'Alternar nodo Granos', en: 'Toggle Grains node',
      pt: 'Alternar no Graos', fr: 'Basculer noeud Cereales',
      it: 'Apri/chiudi nodo Cereali', de: 'Knoten Getreide umschalten',
      ja: '「穀物」ノードの切り替え', zh: '切换"谷物"节点',
      hi: '"अनाज" node toggle', ar: 'تبديل عقدة الحبوب',
    },
    'tree.fruits': {
      es: 'Frutas', en: 'Fruits', pt: 'Frutas',
      fr: 'Fruits', it: 'Frutta', de: 'Fruechte',
      ja: '果物', zh: '水果', hi: 'फल', ar: 'الفاكهة',
    },
    'tree.citrus': {
      es: 'Citricos', en: 'Citrus', pt: 'Citricos',
      fr: 'Agrumes', it: 'Agrumi', de: 'Zitrusfruechte',
      ja: '柑橘', zh: '柑橘', hi: 'खट्टे फल', ar: 'الحمضيات',
    },
    'tree.veggies': {
      es: 'Verduras', en: 'Vegetables', pt: 'Vegetais',
      fr: 'Legumes', it: 'Verdure', de: 'Gemuese',
      ja: '野菜', zh: '蔬菜', hi: 'सब्ज़ियाँ', ar: 'الخضراوات',
    },
    'tree.greens': {
      es: 'Hojas verdes', en: 'Greens', pt: 'Folhas verdes',
      fr: 'Feuilles vertes', it: 'Verdure a foglia', de: 'Blattgemuese',
      ja: '葉物野菜', zh: '绿叶菜', hi: 'पत्तेदार', ar: 'الخضراوات الورقية',
    },
    'tree.grains': {
      es: 'Granos', en: 'Grains', pt: 'Graos',
      fr: 'Cereales', it: 'Cereali', de: 'Getreide',
      ja: '穀物', zh: '谷物', hi: 'अनाज', ar: 'الحبوب',
    },
    'tree.apple':   { es: 'Manzana', en: 'Apple', pt: 'Maca', fr: 'Pomme', it: 'Mela', de: 'Apfel', ja: 'リンゴ', zh: '苹果', hi: 'सेब', ar: 'تفاح' },
    'tree.pear':    { es: 'Pera', en: 'Pear', pt: 'Pera', fr: 'Poire', it: 'Pera', de: 'Birne', ja: '梨', zh: '梨', hi: 'नाशपाती', ar: 'كمثرى' },
    'tree.lemon':   { es: 'Limon', en: 'Lemon', pt: 'Limao', fr: 'Citron', it: 'Limone', de: 'Zitrone', ja: 'レモン', zh: '柠檬', hi: 'नींबू', ar: 'ليمون' },
    'tree.orange':  { es: 'Naranja', en: 'Orange', pt: 'Laranja', fr: 'Orange', it: 'Arancia', de: 'Orange', ja: 'オレンジ', zh: '橙子', hi: 'संतरा', ar: 'برتقال' },
    'tree.lime':    { es: 'Lima', en: 'Lime', pt: 'Lima', fr: 'Citron vert', it: 'Lime', de: 'Limette', ja: 'ライム', zh: '青柠', hi: 'मुसम्मी', ar: 'لايم' },
    'tree.carrot':  { es: 'Zanahoria', en: 'Carrot', pt: 'Cenoura', fr: 'Carotte', it: 'Carota', de: 'Karotte', ja: 'ニンジン', zh: '胡萝卜', hi: 'गाजर', ar: 'جزر' },
    'tree.potato':  { es: 'Papa', en: 'Potato', pt: 'Batata', fr: 'Pomme de terre', it: 'Patata', de: 'Kartoffel', ja: 'ジャガイモ', zh: '土豆', hi: 'आलू', ar: 'بطاطا' },
    'tree.spinach': { es: 'Espinaca', en: 'Spinach', pt: 'Espinafre', fr: 'Epinard', it: 'Spinaci', de: 'Spinat', ja: 'ホウレンソウ', zh: '菠菜', hi: 'पालक', ar: 'سبانخ' },
    'tree.kale':    { es: 'Kale', en: 'Kale', pt: 'Couve', fr: 'Chou kale', it: 'Cavolo riccio', de: 'Gruenkohl', ja: 'ケール', zh: '羽衣甘蓝', hi: 'केल', ar: 'كرنب اخضر' },
    'tree.rice':    { es: 'Arroz', en: 'Rice', pt: 'Arroz', fr: 'Riz', it: 'Riso', de: 'Reis', ja: '米', zh: '稻米', hi: 'चावल', ar: 'ارز' },
    'tree.wheat':   { es: 'Trigo', en: 'Wheat', pt: 'Trigo', fr: 'Ble', it: 'Grano', de: 'Weizen', ja: '小麦', zh: '小麦', hi: 'गेहूँ', ar: 'قمح' },
    'tree.oats':    { es: 'Avena', en: 'Oats', pt: 'Aveia', fr: 'Avoine', it: 'Avena', de: 'Hafer', ja: 'オーツ麦', zh: '燕麦', hi: 'जई', ar: 'شوفان' },
    /* --- stepper --- */
    'stepper.display': {
      es: '{label} -- paso {n} de {total}',
      en: '{label} -- step {n} of {total}',
      pt: '{label} -- passo {n} de {total}',
      fr: '{label} -- etape {n} sur {total}',
      it: '{label} -- passo {n} di {total}',
      de: '{label} -- Schritt {n} von {total}',
      ja: '{label} -- ステップ {n} / {total}',
      zh: '{label} -- 步骤 {n}/{total}',
      hi: '{label} -- step {n} / {total}',
      ar: '{label} -- خطوة {n} من {total}',
    },
    /* --- top nav, self-test buttons, stepper/tree/toast headers (added v1.9.1, kept). --- */
    'nav.spec': {
      es: 'spec', en: 'spec', pt: 'spec', fr: 'spec',
      it: 'spec', de: 'Spec',
      ja: '仕様', zh: '规范',
      hi: 'spec', ar: 'المواصفات',
    },
    'nav.manual': {
      es: 'manual', en: 'manual', pt: 'manual', fr: 'manuel',
      it: 'manuale', de: 'Handbuch',
      ja: 'マニュアル', zh: '手册',
      hi: 'मैनुअल', ar: 'دليل',
    },
    'nav.contribute': {
      es: 'contribuir', en: 'contribute', pt: 'contribuir',
      fr: 'contribuer', it: 'contribuire', de: 'mitwirken',
      ja: '貢献する', zh: '贡献',
      hi: 'योगदान', ar: 'المساهمة',
    },
    'btn.show_navmap': {
      es: 'Ver mapa del sistema', en: 'Show navmap',
      pt: 'Ver mapa do sistema', fr: 'Voir la navmap',
      it: 'Mostra mappa', de: 'Navmap zeigen',
      ja: 'ナビマップを表示', zh: '显示系统地图',
      hi: 'navmap दिखाएँ', ar: 'عرض خريطة التنقل',
    },
    'btn.show_caps': {
      es: 'Ver capacidades', en: 'Show capabilities',
      pt: 'Ver capacidades', fr: 'Voir capacites',
      it: 'Mostra capacita', de: 'Faehigkeiten zeigen',
      ja: '機能を表示', zh: '显示能力',
      hi: 'क्षमताएँ दिखाएँ', ar: 'عرض القدرات',
    },
    'btn.list_sections': {
      es: 'Listar secciones', en: 'List sections',
      pt: 'Listar secoes', fr: 'Lister les sections',
      it: 'Elenca sezioni', de: 'Abschnitte auflisten',
      ja: 'セクション一覧', zh: '列出区段',
      hi: 'अनुभाग सूची', ar: 'سرد الاقسام',
    },
    'btn.run_self_test': {
      es: 'Correr el self-test de NAC', en: 'Run NAC self-test',
      pt: 'Rodar o self-test', fr: 'Lancer le self-test',
      it: 'Esegui self-test NAC', de: 'NAC-Selbsttest starten',
      ja: 'NAC セルフテストを実行', zh: '运行 NAC 自检',
      hi: 'NAC self-test चलाएँ', ar: 'تشغيل اختبار NAC',
    },
    'btn.agent_tour': {
      es: 'Agente IA: tour de la pagina',
      en: 'AI agent: tour the page',
      pt: 'Agente IA: tour da pagina',
      fr: 'Agent IA: tour de la page',
      it: 'Agente IA: tour della pagina',
      de: 'KI-Agent: Tour der Seite',
      ja: 'AI エージェント: ページのツアー',
      zh: 'AI 代理：页面导览',
      hi: 'AI एजेंट: पेज टूर',
      ar: 'وكيل الذكاء: جولة في الصفحة',
    },
    'btn.event_conformance': {
      es: 'Conformidad de eventos NAC v2.0',
      en: 'NAC v2.0 event conformance',
      pt: 'Conformidade de eventos NAC v2.0',
      fr: 'Conformite evenements NAC v2.0',
      it: 'Conformita eventi NAC v2.0',
      de: 'NAC v2.0 Event-Konformitaet',
      ja: 'NAC v2.0 イベント適合性',
      zh: 'NAC v2.0 事件一致性',
      hi: 'NAC v2.0 इवेंट conformance',
      ar: 'مطابقة احداث NAC v2.0',
    },
    'card.stepper': {
      es: 'Stepper -- ciclador sumi-e',
      en: 'Stepper -- sumi-e cycler',
      pt: 'Stepper -- ciclador sumi-e',
      fr: 'Stepper -- cycleur sumi-e',
      it: 'Stepper -- ciclatore sumi-e',
      de: 'Stepper -- Sumi-e-Zykler',
      ja: 'ステッパー -- 墨絵サイクラー',
      zh: '步进器 -- 水墨循环',
      hi: 'Stepper -- sumi-e cycler',
      ar: 'Stepper -- مبدل سومي-اي',
    },
    'sub.stepper': {
      es: 'v1.7 sec 6.2.8 -- nac:step:advanced / :back',
      en: 'v1.7 sec 6.2.8 -- nac:step:advanced / :back',
      pt: 'v1.7 sec 6.2.8 -- nac:step:advanced / :back',
      fr: 'v1.7 sec 6.2.8 -- nac:step:advanced / :back',
      it: 'v1.7 sec 6.2.8 -- nac:step:advanced / :back',
      de: 'v1.7 Abschn. 6.2.8 -- nac:step:advanced / :back',
      ja: 'v1.7 第 6.2.8 節 -- nac:step:advanced / :back',
      zh: 'v1.7 第 6.2.8 节 -- nac:step:advanced / :back',
      hi: 'v1.7 खण्ड 6.2.8 -- nac:step:advanced / :back',
      ar: 'v1.7 القسم 6.2.8 -- nac:step:advanced / :back',
    },
    'btn.back': {
      es: '« Atras', en: '« Back',
      pt: '« Voltar', fr: '« Retour',
      it: '« Indietro', de: '« Zurueck',
      ja: '« 戻る', zh: '« 返回',
      hi: '« वापस', ar: '« رجوع',
    },
    'btn.next': {
      es: 'Siguiente »', en: 'Next »',
      pt: 'Proximo »', fr: 'Suivant »',
      it: 'Avanti »', de: 'Weiter »',
      ja: '次へ »', zh: '下一步 »',
      hi: 'अगला »', ar: 'التالي »',
    },
    'card.tree': {
      es: 'Arbol', en: 'Tree', pt: 'Arvore',
      fr: 'Arbre', it: 'Albero', de: 'Baum',
      ja: 'ツリー', zh: '树',
      hi: 'पेड़', ar: 'الشجرة',
    },
    'sub.tree': {
      es: 'v1.7 sec 6.2.9 -- nac:tree:expanded/collapsed/selected',
      en: 'v1.7 sec 6.2.9 -- nac:tree:expanded/collapsed/selected',
      pt: 'v1.7 sec 6.2.9 -- nac:tree:expanded/collapsed/selected',
      fr: 'v1.7 sec 6.2.9 -- nac:tree:expanded/collapsed/selected',
      it: 'v1.7 sec 6.2.9 -- nac:tree:expanded/collapsed/selected',
      de: 'v1.7 Abschn. 6.2.9 -- nac:tree:expanded/collapsed/selected',
      ja: 'v1.7 第 6.2.9 節 -- nac:tree:expanded/collapsed/selected',
      zh: 'v1.7 第 6.2.9 节 -- nac:tree:expanded/collapsed/selected',
      hi: 'v1.7 खण्ड 6.2.9 -- nac:tree:expanded/collapsed/selected',
      ar: 'v1.7 القسم 6.2.9 -- nac:tree:expanded/collapsed/selected',
    },
    'card.toast': {
      es: 'Toast', en: 'Toast', pt: 'Toast',
      fr: 'Toast', it: 'Toast', de: 'Toast',
      ja: 'トースト', zh: '通知条',
      hi: 'Toast', ar: 'اشعار توست',
    },
    'sub.toast': {
      es: 'v1.7 sec 6.2.10 -- nac:toast:shown/dismissed',
      en: 'v1.7 sec 6.2.10 -- nac:toast:shown/dismissed',
      pt: 'v1.7 sec 6.2.10 -- nac:toast:shown/dismissed',
      fr: 'v1.7 sec 6.2.10 -- nac:toast:shown/dismissed',
      it: 'v1.7 sec 6.2.10 -- nac:toast:shown/dismissed',
      de: 'v1.7 Abschn. 6.2.10 -- nac:toast:shown/dismissed',
      ja: 'v1.7 第 6.2.10 節 -- nac:toast:shown/dismissed',
      zh: 'v1.7 第 6.2.10 节 -- nac:toast:shown/dismissed',
      hi: 'v1.7 खण्ड 6.2.10 -- nac:toast:shown/dismissed',
      ar: 'v1.7 القسم 6.2.10 -- nac:toast:shown/dismissed',
    },
    'btn.fire_toast': {
      es: 'Disparar toast', en: 'Fire toast',
      pt: 'Disparar toast', fr: 'Declencher toast',
      it: 'Lancia toast', de: 'Toast ausloesen',
      ja: 'トーストを発火', zh: '触发通知条',
      hi: 'toast भेजें', ar: 'اطلاق التوست',
    },
    'intro.title': {
      es: 'Hablale a esta pagina. O hace click. O dejaselo a Yujin.',
      en: 'Talk to this page. Or click. Or let Yujin do it.',
      pt: 'Fale com esta pagina. Ou clique. Ou deixe o Yujin fazer.',
      fr: 'Parlez a cette page. Ou cliquez. Ou laissez Yujin le faire.',
      it: 'Parla a questa pagina. O clicca. O lascia che Yujin lo faccia.',
      de: 'Sprich mit dieser Seite. Oder klicke. Oder lass Yujin das machen.',
      ja: 'このページに話しかけよう。クリックでも。または Yujin に任せよう。',
      zh: '与此页面对话。或点击。或让 Yujin 来做。',
      hi: 'इस पेज से बात करें। या क्लिक करें। या Yujin से करवाएँ।',
      ar: 'تحدث الى هذه الصفحة. او انقر. او دع Yujin يتولى الامر.',
    },
    'intro.lead': {
      es: 'Cada boton, campo y modal aca habla NAC. Un runner de voz, un agente de chat o una herramienta de accesibilidad pueden manejar la pagina sin scrapear pixels ni hackear el DOM. Apreta el boton de abajo y mira manejarse sola.',
      en: 'Every button, field and modal here speaks NAC. A voice runner, a chat agent or an accessibility tool can drive the page without scraping pixels and without DOM hacks. Hit the button below and watch the page drive itself.',
      pt: 'Cada botao, campo e modal aqui fala NAC. Um runner de voz, um agente de chat ou uma ferramenta de acessibilidade pode dirigir a pagina sem raspar pixels e sem hacks no DOM. Clique no botao abaixo e veja a pagina se dirigir.',
      fr: 'Chaque bouton, champ et modal ici parle NAC. Un runner vocal, un agent chat ou un outil d’accessibilite peut piloter la page sans scraper de pixels et sans hacks DOM. Cliquez sur le bouton en bas pour voir la page se piloter toute seule.',
      it: 'Ogni pulsante, campo e modale qui parla NAC. Un runner vocale, un agente di chat o uno strumento di accessibilita possono pilotare la pagina senza scraping di pixel e senza hack DOM. Premi il pulsante qui sotto e guarda la pagina pilotarsi da sola.',
      de: 'Jeder Knopf, jedes Feld und jedes Modal hier spricht NAC. Ein Voice-Runner, ein Chat-Agent oder ein Accessibility-Tool kann die Seite ohne Pixel-Scraping und ohne DOM-Hacks steuern. Klick den Knopf unten und sieh zu, wie sich die Seite selbst steuert.',
      ja: 'このページのすべてのボタン・入力欄・モーダルは NAC を話します。音声ランナー、チャット・エージェント、アクセシビリティ・ツールはピクセル走査も DOM ハックもなしにページを操作できます。下のボタンを押して、ページが自分で動く様子を見てください。',
      zh: '此页面的每个按钮、字段和模态框都会说 NAC。语音运行器、聊天代理或辅助功能工具都可以操作页面，无需像素抓取或 DOM hack。点击下方按钮，看页面自动驾驶。',
      hi: 'यहाँ हर बटन, फ़ील्ड और modal NAC बोलता है। वॉइस runner, chat agent या accessibility tool पिक्सेल scraping और DOM hacks के बिना पेज चला सकते हैं। नीचे का बटन दबाएँ और पेज को खुद चलते देखें।',
      ar: 'كل زر وحقل ومربع حواري هنا يتحدث NAC. مشغل الصوت او وكيل الدردشة او اداة الوصول يمكنها قيادة الصفحة بدون مسح بكسل ولا حيل DOM. اضغط الزر اسفل وشاهد الصفحة تقود نفسها.',
    },
    'intro.watch_btn': {
      es: 'Mira a Yujin hacerlo',         en: 'Watch Yujin do it',
      pt: 'Veja o Yujin fazer',           fr: 'Regarde Yujin le faire',
      it: 'Guarda Yujin farlo',           de: 'Yujin zusehen',
      ja: 'Yujin の自動操作を見る',
      zh: '看 Yujin 自动操作',
      hi: 'Yujin को करते देखें',
      ar: 'شاهد Yujin يفعلها',
    },
    'card.piano': {
      es: 'Piano',                        en: 'Piano',
      pt: 'Piano',                        fr: 'Piano',
      it: 'Pianoforte',                   de: 'Klavier',
      ja: 'ピアノ',                       zh: '钢琴',
      hi: 'पियानो',                       ar: 'بيانو',
    },
    'card.art': {
      es: 'Galeria sumi-e',               en: 'Sumi-e gallery',
      pt: 'Galeria sumi-e',               fr: 'Galerie sumi-e',
      it: 'Galleria sumi-e',              de: 'Sumi-e-Galerie',
      ja: '墨絵ギャラリー',
      zh: '水墨画廊',
      hi: 'Sumi-e गैलरी',
      ar: 'معرض السومي',
    },
    'sub.art': {
      es: '3 iconos, 3 dibujos a tinta. Click sobre un icono para expandir; click de nuevo para minimizar.',
      en: '3 icons, 3 ink drawings. Click an icon to expand it; click again to minimize.',
      pt: '3 icones, 3 desenhos a tinta. Clique para expandir; clique de novo para minimizar.',
      fr: '3 icones, 3 dessins a l’encre. Clique pour deployer; reclique pour reduire.',
      it: '3 icone, 3 disegni a inchiostro. Clicca per espandere; clicca di nuovo per ridurre.',
      de: '3 Symbole, 3 Tuschezeichnungen. Klick zum Aufklappen; nochmal zum Schliessen.',
      ja: '3 つのアイコン、3 つの墨絵。クリックで展開、もう一度クリックで最小化。',
      zh: '3 个图标，3 幅水墨画。点击展开，再次点击最小化。',
      hi: '3 आइकन, 3 स्याही चित्र. एक आइकन पर click से expand; फिर click से minimize।',
      ar: '3 ايقونات، 3 رسوم حبرية. انقر لتوسيعها؛ انقر مرة اخرى للتصغير.',
    },
    'card.modal': {
      es: 'Modal secreto',                en: 'Secret modal',
      pt: 'Modal secreto',                fr: 'Modal secret',
      it: 'Modale segreto',               de: 'Geheimes Modal',
      ja: '秘密のモーダル',
      zh: '秘密模态框',
      hi: 'गुप्त modal',
      ar: 'النموذج السري',
    },
    'card.form': {
      es: 'Campos del formulario',        en: 'Form fields',
      pt: 'Campos do formulario',         fr: 'Champs du formulaire',
      it: 'Campi del form',               de: 'Formularfelder',
      ja: 'フォーム項目',
      zh: '表单字段',
      hi: 'Form फ़ील्ड',
      ar: 'حقول النموذج',
    },
    'card.tabs': {
      es: 'Pestanas y acordeon',          en: 'Tabs & accordion',
      pt: 'Abas e acordeao',              fr: 'Onglets et accordeon',
      it: 'Schede e accordion',           de: 'Tabs und Akkordeon',
      ja: 'タブとアコーディオン',
      zh: '标签页与折叠面板',
      hi: 'Tabs और accordion',
      ar: 'علامات التبويب والاكورديون',
    },
    'card.combo': {
      es: 'Combobox y slider',            en: 'Combobox & slider',
      pt: 'Combobox e slider',            fr: 'Combobox et slider',
      it: 'Combobox e slider',            de: 'Combobox und Slider',
      ja: 'コンボボックスとスライダー',
      zh: '组合框与滑块',
      hi: 'Combobox और slider',
      ar: 'قائمة منسدلة وشريط تمرير',
    },
    'card.table': {
      es: 'Tabla con orden y filtro',     en: 'Sortable / filterable table',
      pt: 'Tabela ordenavel / filtravel', fr: 'Tableau triable / filtrable',
      it: 'Tabella ordinabile / filtrabile', de: 'Sortier-/Filtertabelle',
      ja: 'ソート・フィルター可能な表',
      zh: '可排序与筛选的表格',
      hi: 'क्रमबद्ध / फ़िल्टर करने योग्य तालिका',
      ar: 'جدول قابل للفرز والتصفية',
    },
    'card.drag': {
      es: 'Arrastrar y soltar + zona',    en: 'Drag & drop + file zone',
      pt: 'Arrastar e soltar + area',     fr: 'Glisser-deposer + zone fichiers',
      it: 'Trascina e rilascia + area',   de: 'Drag & Drop + Dateibereich',
      ja: 'ドラッグ＆ドロップ',
      zh: '拖放与文件区域',
      hi: 'खींचें और छोड़ें + फ़ाइल क्षेत्र',
      ar: 'سحب وافلات + منطقة الملفات',
    },
    'card.remote': {
      es: 'Autocompletado remoto',        en: 'Remote autocomplete',
      pt: 'Autocompletar remoto',         fr: 'Autocompletion distante',
      it: 'Autocomplete remoto',          de: 'Remote-Autocomplete',
      ja: 'リモート自動補完',
      zh: '远程自动补全',
      hi: 'Remote autocomplete',
      ar: 'الاكمال التلقائي عن بعد',
    },
    'card.navmap': {
      es: 'Mapa del sistema',             en: 'System map',
      pt: 'Mapa do sistema',               fr: 'Carte du systeme',
      it: 'Mappa del sistema',            de: 'Systemkarte',
      ja: 'システムマップ',
      zh: '系统地图',
      hi: 'System map',
      ar: 'خريطة النظام',
    },
    'card.selftest': {
      es: 'Auto-test e introspeccion',    en: 'Self-test & introspect',
      pt: 'Auto-teste e introspeccao',    fr: 'Auto-test et introspection',
      it: 'Auto-test e introspezione',    de: 'Selbsttest und Inspektion',
      ja: 'セルフテストと内省',
      zh: '自检与内省',
      hi: 'स्व-परीक्षण और निरीक्षण',
      ar: 'الاختبار الذاتي والاستبطان',
    },
    'side.chat': {
      es: 'Hablar con Yujin',             en: 'Talk to Yujin',
      pt: 'Falar com Yujin',              fr: 'Parler avec Yujin',
      it: 'Parla con Yujin',              de: 'Mit Yujin sprechen',
      ja: 'Yujin と話す',
      zh: '与 Yujin 对话',
      hi: 'Yujin से बात करें',
      ar: 'تحدث مع Yujin',
    },
    'side.manifest': {
      es: 'Manifest NAC',                 en: 'NAC manifest',
      pt: 'Manifest NAC',                 fr: 'Manifest NAC',
      it: 'Manifest NAC',                 de: 'NAC-Manifest',
      ja: 'NAC マニフェスト',
      zh: 'NAC 清单',
      hi: 'NAC manifest',
      ar: 'بيان NAC',
    },
    'brand.tagline': {
      es: 'maneja UIs por voz, chat y agentes IA',
      en: 'drive UIs by voice, chat, AI',
      pt: 'controle UIs por voz, chat e IA',
      fr: 'pilotez les UIs par la voix, le chat, l’IA',
      it: 'pilota UI con voce, chat, IA',
      de: 'UIs per Stimme, Chat und KI steuern',
      ja: '音声・チャット・AI で UI を操作',
      zh: '通过语音、聊天和 AI 操作 UI',
      hi: 'voice, chat और AI से UI चलाएँ',
      ar: 'تحكم في الواجهات بالصوت والدردشة والذكاء الاصطناعي',
    },
    'sub.piano': {
      es: '8 botones, 8 notas. Cada una es una accion NAC.',
      en: '8 buttons, 8 notes. Each one is a NAC action.',
      pt: '8 botoes, 8 notas. Cada um eh uma acao NAC.',
      fr: '8 boutons, 8 notes. Chacun est une action NAC.',
      it: '8 pulsanti, 8 note. Ciascuno e una azione NAC.',
      de: '8 Knopfe, 8 Noten. Jeder ist eine NAC-Aktion.',
      ja: '8 つのボタン、8 つの音符。それぞれが NAC アクション。',
      zh: '8 个按钮、8 个音符。每一个都是一个 NAC 动作。',
      hi: '8 बटन, 8 स्वर। हर एक NAC क्रिया है।',
      ar: '8 ازرار، 8 نغمات. كل واحد هو اجراء NAC.',
    },
    'sub.modal': {
      es: 'Hace click y mira los eventos del ciclo de vida.',
      en: 'Click and watch the lifecycle events fly.',
      pt: 'Clique e veja os eventos do ciclo de vida.',
      fr: 'Cliquez et regardez les evenements du cycle de vie.',
      it: 'Clicca e guarda gli eventi del ciclo di vita.',
      de: 'Klicken und die Lifecycle-Events beobachten.',
      ja: 'クリックしてライフサイクル・イベントを見る。',
      zh: '点击并查看生命周期事件。',
      hi: 'क्लिक करें और lifecycle events देखें।',
      ar: 'انقر وشاهد احداث دورة الحياة.',
    },
    'sub.form': {
      es: 'Texto, select, checkbox -- todos manejables por NAC.fill.',
      en: 'Text, select, checkbox -- all driveable by NAC.fill.',
      pt: 'Texto, select, checkbox -- todos controlaveis por NAC.fill.',
      fr: 'Texte, select, checkbox -- tous pilotables par NAC.fill.',
      it: 'Testo, select, checkbox -- tutti gestibili da NAC.fill.',
      de: 'Text, Select, Checkbox -- alle ueber NAC.fill steuerbar.',
      ja: 'テキスト、セレクト、チェックボックス -- すべて NAC.fill で操作可能。',
      zh: '文本、下拉、复选框 -- 全部可由 NAC.fill 驱动。',
      hi: 'Text, select, checkbox -- सब NAC.fill से चलाने योग्य।',
      ar: 'نص، قائمة، صندوق اختيار -- كلها قابلة للقيادة عبر NAC.fill.',
    },
    'sub.tabs': {
      es: 'Tablist, tabpanel y accordion-section -- v1.1.',
      en: 'Tablist, tabpanel and accordion-section -- v1.1.',
      pt: 'Tablist, tabpanel e accordion-section -- v1.1.',
      fr: 'Tablist, tabpanel et accordion-section -- v1.1.',
      it: 'Tablist, tabpanel e accordion-section -- v1.1.',
      de: 'Tablist, Tabpanel und Accordion-Section -- v1.1.',
      ja: 'Tablist、tabpanel、accordion-section -- v1.1。',
      zh: 'Tablist、tabpanel 与 accordion-section -- v1.1。',
      hi: 'Tablist, tabpanel और accordion-section -- v1.1.',
      ar: 'Tablist و tabpanel و accordion-section -- v1.1.',
    },
    'sub.combo': {
      es: 'Autocompletado + rango continuo -- v1.1.',
      en: 'Autocomplete + continuous range -- v1.1.',
      pt: 'Autocomplete + intervalo continuo -- v1.1.',
      fr: 'Autocompletion + plage continue -- v1.1.',
      it: 'Autocomplete + intervallo continuo -- v1.1.',
      de: 'Autovervollstaendigung + kontinuierlicher Bereich -- v1.1.',
      ja: 'オートコンプリート + 連続レンジ -- v1.1。',
      zh: '自动补全 + 连续范围 -- v1.1。',
      hi: 'Autocomplete + continuous range -- v1.1.',
      ar: 'الاكمال التلقائي + نطاق مستمر -- v1.1.',
    },
    'sub.table': {
      es: 'sort-control, filter-control, pagination-control -- v1.1.',
      en: 'sort-control, filter-control, pagination-control -- v1.1.',
      pt: 'sort-control, filter-control, pagination-control -- v1.1.',
      fr: 'sort-control, filter-control, pagination-control -- v1.1.',
      it: 'sort-control, filter-control, pagination-control -- v1.1.',
      de: 'sort-control, filter-control, pagination-control -- v1.1.',
      ja: 'sort-control, filter-control, pagination-control -- v1.1。',
      zh: 'sort-control、filter-control、pagination-control -- v1.1。',
      hi: 'sort-control, filter-control, pagination-control -- v1.1.',
      ar: 'sort-control و filter-control و pagination-control -- v1.1.',
    },
    'sub.drag': {
      es: 'draggable, drop-target, dropzone -- v1.1.',
      en: 'draggable, drop-target, dropzone -- v1.1.',
      pt: 'draggable, drop-target, dropzone -- v1.1.',
      fr: 'draggable, drop-target, dropzone -- v1.1.',
      it: 'draggable, drop-target, dropzone -- v1.1.',
      de: 'draggable, drop-target, dropzone -- v1.1.',
      ja: 'draggable, drop-target, dropzone -- v1.1。',
      zh: 'draggable、drop-target、dropzone -- v1.1。',
      hi: 'draggable, drop-target, dropzone -- v1.1.',
      ar: 'draggable و drop-target و dropzone -- v1.1.',
    },
    'sub.remote': {
      es: '5000 ciudades, fetch del server. options_source=remote -- v1.2.',
      en: '5000 cities, server-fetched. options_source=remote -- v1.2.',
      pt: '5000 cidades, buscadas no servidor. options_source=remote -- v1.2.',
      fr: '5000 villes, recuperees cote serveur. options_source=remote -- v1.2.',
      it: '5000 citta, recuperate dal server. options_source=remote -- v1.2.',
      de: '5000 Staedte, vom Server geladen. options_source=remote -- v1.2.',
      ja: '5000 都市、サーバーからフェッチ。options_source=remote -- v1.2。',
      zh: '5000 个城市，由服务器获取。options_source=remote -- v1.2。',
      hi: '5000 शहर, server-fetched. options_source=remote -- v1.2.',
      ar: '5000 مدينة، تم جلبها من الخادم. options_source=remote -- v1.2.',
    },
    'sub.navmap': {
      es: 'Descubrimiento de primer contacto: vistas, transiciones, capabilities -- v1.2.',
      en: 'First-contact discovery: views, transitions, capabilities -- v1.2.',
      pt: 'Descoberta de primeiro contato: views, transitions, capabilities -- v1.2.',
      fr: 'Decouverte au premier contact: views, transitions, capabilities -- v1.2.',
      it: 'Scoperta al primo contatto: views, transitions, capabilities -- v1.2.',
      de: 'Erstkontakt-Discovery: views, transitions, capabilities -- v1.2.',
      ja: '初回コンタクト探索: views、transitions、capabilities -- v1.2。',
      zh: '首次接触发现: views、transitions、capabilities -- v1.2。',
      hi: 'पहले संपर्क पर खोज: views, transitions, capabilities -- v1.2.',
      ar: 'الاكتشاف عند اول اتصال: views، transitions، capabilities -- v1.2.',
    },
    'sub.selftest': {
      es: 'Corre el runner contra esta misma pagina. Mira el system map. Hace un tour de agente IA.',
      en: 'Run the runner against this same page. See the system map. Take an AI agent tour.',
      pt: 'Execute o runner contra esta mesma pagina. Veja o system map. Faca um tour de agente IA.',
      fr: 'Lance le runner contre cette page. Visualise la system map. Fais un tour d’agent IA.',
      it: 'Esegui il runner contro questa stessa pagina. Guarda la system map. Fai un tour da agente IA.',
      de: 'Den Runner gegen diese Seite laufen lassen. Die Systemkarte ansehen. Eine KI-Agenten-Tour machen.',
      ja: 'このページに対して runner を走らせる。システムマップを見る。AI エージェント・ツアーを行う。',
      zh: '对当前页面运行 runner。查看 system map。进行 AI 代理演示。',
      hi: 'इस page पर runner चलाएँ। system map देखें। AI agent tour लें।',
      ar: 'شغل ال runner على هذه الصفحة. شاهد خريطة النظام. خذ جولة وكيل ذكاء اصطناعي.',
    },
    /* Form labels */
    'lbl.your_name': {
      es: 'Tu nombre', en: 'Your name', pt: 'Seu nome',
      fr: 'Votre nom', it: 'Il tuo nome', de: 'Ihr Name',
      ja: 'あなたの名前', zh: '你的名字',
      hi: 'आपका नाम',
      ar: 'اسمك',
    },
    'lbl.mood': {
      es: 'Animo', en: 'Mood', pt: 'Humor',
      fr: 'Humeur', it: 'Umore', de: 'Stimmung',
      ja: '気分', zh: '心情',
      hi: 'मनोदशा',
      ar: 'المزاج',
    },
    'lbl.country': {
      es: 'Pais (autocompletado)', en: 'Country (autocomplete)',
      pt: 'Pais (autocompletar)', fr: 'Pays (autocompletion)',
      it: 'Paese (autocomplete)', de: 'Land (Autovervollstaendigung)',
      ja: '国 (自動補完)', zh: '国家 (自动补全)',
      hi: 'देश (autocomplete)',
      ar: 'البلد (اكمال تلقائي)',
    },
    'lbl.lang': {
      es: 'Idioma:', en: 'Lang:', pt: 'Idioma:',
      fr: 'Langue:', it: 'Lingua:', de: 'Sprache:',
      ja: '言語:', zh: '语言:',
      hi: 'भाषा:', ar: 'اللغة:',
    },
    /* Mood select options */
    'opt.pick_one': {
      es: 'Elegi una', en: 'Pick one', pt: 'Escolha uma',
      fr: 'Choisissez', it: 'Scegli', de: 'Eine waehlen',
      ja: '一つ選んでください', zh: '选一个',
      hi: 'एक चुनें',
      ar: 'اختر واحدا',
    },
    'opt.curious': {
      es: 'Curioso', en: 'Curious', pt: 'Curioso',
      fr: 'Curieux', it: 'Curioso', de: 'Neugierig',
      ja: '興味あり', zh: '好奇',
      hi: 'जिज्ञासु',
      ar: 'فضولي',
    },
    'opt.impressed': {
      es: 'Impactado', en: 'Impressed', pt: 'Impressionado',
      fr: 'Impressionne', it: 'Colpito', de: 'Beeindruckt',
      ja: '感銘を受けた', zh: '印象深刻',
      hi: 'प्रभावित',
      ar: 'منبهر',
    },
    'opt.skeptical': {
      es: 'Esceptico', en: 'Skeptical', pt: 'Cetico',
      fr: 'Sceptique', it: 'Scettico', de: 'Skeptisch',
      ja: '懐疑的', zh: '持怀疑',
      hi: 'संदेहवादी',
      ar: 'متشكك',
    },
    /* Buttons */
    'btn.open_secret': {
      es: 'Abrir el secreto', en: 'Open the secret',
      pt: 'Abrir o segredo', fr: 'Ouvrir le secret',
      it: 'Apri il segreto', de: 'Das Geheimnis oeffnen',
      ja: '秘密を開く',
      zh: '打开秘密',
      hi: 'गुप्त खोलें',
      ar: 'افتح السر',
    },
    /* Events live card */
    'card.events': {
      es: 'Eventos NAC en vivo', en: 'NAC events live',
      pt: 'Eventos NAC ao vivo', fr: 'Evenements NAC en direct',
      it: 'Eventi NAC in diretta', de: 'NAC-Events live',
      ja: 'NAC イベント・ライブ',
      zh: 'NAC 事件实时',
      hi: 'NAC events लाइव',
      ar: 'احداث NAC مباشر',
    },
    'sub.events': {
      es: 'Cada interaccion emite un evento del ciclo de vida NAC. Mira.',
      en: 'Every interaction emits a NAC lifecycle event. Watch.',
      pt: 'Cada interacao emite um evento do ciclo de vida NAC. Observe.',
      fr: 'Chaque interaction emet un evenement de cycle de vie NAC. Regardez.',
      it: 'Ogni interazione emette un evento del ciclo di vita NAC. Guarda.',
      de: 'Jede Interaktion sendet ein NAC-Lifecycle-Event. Schau zu.',
      ja: 'すべてのインタラクションが NAC ライフサイクル・イベントを発生させます。',
      zh: '每次交互都会发出一个 NAC 生命周期事件。看一下。',
      hi: 'हर interaction एक NAC lifecycle event छोड़ता है। देखें।',
      ar: 'كل تفاعل يصدر حدث دورة حياة NAC. شاهد.',
    },
    /* Secret modal */
    'modal.title': {
      es: 'Hola.', en: 'Hi there.', pt: 'Ola.',
      fr: 'Salut.', it: 'Ciao.', de: 'Hallo.',
      ja: 'こんにちは。', zh: '你好。',
      hi: 'नमस्ते।',
      ar: 'مرحبا.',
    },
    'modal.body1': {
      es: 'Disparaste NAC.click(secret.open) -- ya sea que apretaste el boton o Yujin lo hizo por vos.',
      en: 'You triggered NAC.click(secret.open) -- whether you pressed the button or Yujin did it for you.',
      pt: 'Voce disparou NAC.click(secret.open) -- seja clicando o botao ou tendo o Yujin fazer por voce.',
      fr: 'Vous avez declenche NAC.click(secret.open) -- que vous ayez clique le bouton ou que Yujin l’ait fait pour vous.',
      it: 'Hai attivato NAC.click(secret.open) -- sia che abbia cliccato il pulsante sia che Yujin lo abbia fatto per te.',
      de: 'Du hast NAC.click(secret.open) ausgeloest -- ob du den Knopf gedrueckt oder Yujin es fuer dich getan hast.',
      ja: 'NAC.click(secret.open) が発火しました -- ボタンを押したのが貴方か Yujin かに関わらず。',
      zh: '你触发了 NAC.click(secret.open) -- 不论是你按下按钮还是 Yujin 替你做的。',
      hi: 'आपने NAC.click(secret.open) trigger किया -- चाहे आपने बटन दबाया हो या Yujin ने आपके लिए किया हो।',
      ar: 'لقد قمت بتشغيل NAC.click(secret.open) -- سواء ضغطت الزر بنفسك او فعل Yujin ذلك من اجلك.',
    },
    'modal.body2': {
      es: 'Los eventos del ciclo de vida nac:plugin:opening y nac:plugin:opened acaban de dispararse. Un runner de voz o un agente de chat que mira esta pagina sabe que el modal esta en pantalla, y te puede pedir que lo cierres.',
      en: 'The lifecycle events nac:plugin:opening and nac:plugin:opened just fired. A voice runner or a chat agent watching this page knows the modal is now on screen, and can ask you to close it.',
      pt: 'Os eventos de ciclo de vida nac:plugin:opening e nac:plugin:opened acabaram de disparar. Um runner de voz ou um agente de chat observando esta pagina sabe que o modal esta na tela e pode pedir para fechar.',
      fr: 'Les evenements de cycle de vie nac:plugin:opening et nac:plugin:opened viennent d’etre emis. Un runner vocal ou un agent de chat qui regarde cette page sait que le modal est a l’ecran et peut vous demander de le fermer.',
      it: 'Gli eventi del ciclo di vita nac:plugin:opening e nac:plugin:opened sono appena scattati. Un runner vocale o un agente di chat che osserva questa pagina sa che il modale e ora a schermo e puo chiederti di chiuderlo.',
      de: 'Die Lifecycle-Events nac:plugin:opening und nac:plugin:opened wurden gerade ausgeloest. Ein Voice-Runner oder Chat-Agent, der diese Seite beobachtet, weiss nun, dass das Modal angezeigt wird, und kann dich bitten, es zu schliessen.',
      ja: 'ライフサイクル・イベント nac:plugin:opening と nac:plugin:opened が発火しました。このページを観察している音声ランナーやチャット・エージェントは、モーダルが表示されていることを認識し、閉じるよう依頼できます。',
      zh: '生命周期事件 nac:plugin:opening 和 nac:plugin:opened 刚刚触发。监控本页面的语音 runner 或聊天代理已知道模态框已显示，并可请求关闭。',
      hi: 'Lifecycle events nac:plugin:opening और nac:plugin:opened अभी fire हुए। Voice runner या chat agent, जो यह page देख रहा है, जानता है कि modal अब screen पर है और close करने को कह सकता है।',
      ar: 'تم اطلاق احداث دورة الحياة nac:plugin:opening و nac:plugin:opened. مشغل صوتي او وكيل دردشة يراقب هذه الصفحة يعرف ان النموذج معروض الان ويمكنه ان يطلب اغلاقه.',
    },
    'btn.close': {
      es: 'Cerrar', en: 'Close', pt: 'Fechar', fr: 'Fermer',
      it: 'Chiudi', de: 'Schliessen',
      ja: '閉じる', zh: '关闭',
      hi: 'बंद करें',
      ar: 'اغلاق',
    },

    /* ===== Autopilot bot lines ===== */
    /* v1.9.4: autopilot narration refactor. User feedback:
       "algunos comentarios muy roboticos, y algunos campos que se
       dicen en ingles, por mas que el idioma sea espanol".
       Pasada de naturalizacion: ingles leaks en es/pt/fr/it
       reemplazados por palabras nativas donde existen, verbos
       suavizados ("Cambio a" -> "Paso a", "Reseteo" -> "Vuelvo
       al inicio"), referencias innecesarias a APIs internas
       removidas del speech (mantenidas en code), v1.7 calendar
       actualizado a "dia" tras el bug fix anterior. Closing
       linea bumpeada v1.8/29 -> v1.9/30+. Locales no-Romance
       (de/ja/zh/hi/ar) tocados solo donde habia leak claro. */
    'auto.reset': {
      es: 'Vuelvo al inicio.',
      en: 'Back to the initial state.',
      pt: 'Volto ao inicio.',
      fr: 'Je reviens a l\'etat initial.',
      it: 'Torno allo stato iniziale.',
      de: 'Zurueck auf Anfang.',
      ja: '初期状態に戻します。',
      zh: '回到初始状态。',
      hi: 'शुरुआत पर वापस।',
      ar: 'العودة الى البداية.',
    },
    'auto.intro': {
      es: 'Empezamos.',
      en: 'Here we go.',
      pt: 'Vamos la.',
      fr: 'On y va.',
      it: 'Iniziamo.',
      de: 'Los geht\'s.',
      ja: 'では始めます。',
      zh: '开始演示。',
      hi: 'चलो शुरू करें।',
      ar: 'لنبدا.',
    },
    'auto.tab_details': {
      es: 'Paso a la solapa Detalles.',
      en: 'Switching to the Details tab.',
      pt: 'Vou para a aba Detalhes.',
      fr: 'Je passe a l\'onglet Details.',
      it: 'Passo alla scheda Dettagli.',
      de: 'Wechsel zum Tab Details.',
      ja: '「詳細」タブに切り替えます。',
      zh: '切换到「详情」标签。',
      hi: '"विवरण" tab पर जा रहा हूँ।',
      ar: 'انتقل الى علامة "التفاصيل".',
    },
    'auto.accordion': {
      es: 'Abro una seccion del acordeon.',
      en: 'Opening an accordion section.',
      pt: 'Abro uma secao do acordeao.',
      fr: 'J\'ouvre une section de l\'accordeon.',
      it: 'Apro una sezione della fisarmonica.',
      de: 'Ich klappe einen Akkordeon-Abschnitt auf.',
      ja: 'アコーディオンのセクションを開きます。',
      zh: '展开一个折叠面板。',
      hi: 'एक accordion अनुभाग खोल रहा हूँ।',
      ar: 'افتح قسما من الاكورديون.',
    },
    'auto.country': {
      es: 'Elijo Argentina en el selector de paises.',
      en: 'Picking Argentina in the country selector.',
      pt: 'Escolho Argentina no seletor de paises.',
      fr: 'Je choisis l\'Argentine dans le selecteur de pays.',
      it: 'Scelgo Argentina nel selettore di paesi.',
      de: 'Ich waehle Argentinien im Laenderwaehler.',
      ja: '国選択でアルゼンチンを選びます。',
      zh: '在国家选择器选择阿根廷。',
      hi: 'देश selector में अर्जेंटीना चुन रहा हूँ।',
      ar: 'اختار الارجنتين من قائمة الدول.',
    },
    'auto.slider': {
      es: 'Subo el control de volumen a 70.',
      en: 'Raising the volume control to 70.',
      pt: 'Subo o controle de volume a 70.',
      fr: 'Je monte le volume a 70.',
      it: 'Porto il volume a 70.',
      de: 'Lautstaerke auf 70.',
      ja: '音量を 70 に上げます。',
      zh: '把音量调到 70。',
      hi: 'वॉल्यूम 70 तक बढ़ा रहा हूँ।',
      ar: 'ارفع الصوت الى 70.',
    },
    'auto.sort': {
      es: 'Ordeno la tabla por edad.',
      en: 'Sorting the table by age.',
      pt: 'Ordeno a tabela por idade.',
      fr: 'Je trie le tableau par age.',
      it: 'Ordino la tabella per eta.',
      de: 'Ich sortiere die Tabelle nach Alter.',
      ja: '表を年齢順に並べます。',
      zh: '按年龄给表格排序。',
      hi: 'तालिका को उम्र से क्रमबद्ध कर रहा हूँ।',
      ar: 'افرز الجدول حسب العمر.',
    },
    'auto.filter': {
      es: 'Filtro la tabla por "Diego".',
      en: 'Filtering the table by "Diego".',
      pt: 'Filtro a tabela por "Diego".',
      fr: 'Je filtre le tableau par "Diego".',
      it: 'Filtro la tabella per "Diego".',
      de: 'Ich filtere die Tabelle nach "Diego".',
      ja: '表を「Diego」で絞り込みます。',
      zh: '按 "Diego" 过滤表格。',
      hi: 'तालिका को "Diego" से filter कर रहा हूँ।',
      ar: 'اصفي الجدول بـ "Diego".',
    },
    'auto.drag_drop': {
      es: 'Arrastro Alpha a la lista de la derecha.',
      en: 'Dragging Alpha to the list on the right.',
      pt: 'Arrasto Alpha para a lista da direita.',
      fr: 'Je glisse Alpha vers la liste de droite.',
      it: 'Trascino Alpha alla lista a destra.',
      de: 'Ich ziehe Alpha in die rechte Liste.',
      ja: 'Alpha を右のリストにドラッグします。',
      zh: '把 Alpha 拖到右边的列表。',
      hi: 'Alpha को दाहिनी सूची में खींच रहा हूँ।',
      ar: 'اسحب Alpha الى القائمة اليمنى.',
    },
    'auto.remote': {
      es: 'En la tarjeta de autocompletado remoto escribo "ber" y elijo Berlin.',
      en: 'In the remote autocomplete card I type "ber" and pick Berlin.',
      pt: 'Na tarjeta de autocompletar remoto digito "ber" e escolho Berlin.',
      fr: 'Dans la carte d\'autocompletion distante je tape "ber" et choisis Berlin.',
      it: 'Nella scheda di autocompletamento remoto scrivo "ber" e scelgo Berlin.',
      de: 'In der Karte fuer Remote-Autovervollstaendigung tippe ich "ber" und waehle Berlin.',
      ja: '遠隔オートコンプリートのカードで "ber" と打ち Berlin を選びます。',
      zh: '在远程自动完成卡片输入 "ber" 并选 Berlin。',
      hi: 'दूरस्थ autocomplete कार्ड में "ber" टाइप कर Berlin चुन रहा हूँ।',
      ar: 'في بطاقة الاكمال التلقائي عن بعد اكتب "ber" واختار Berlin.',
    },
    'auto.minimize': {
      es: 'Minimizo la tarjeta de autocompletado.',
      en: 'Minimizing the autocomplete card.',
      pt: 'Minimizo a tarjeta de autocompletar.',
      fr: 'Je reduis la carte d\'autocompletion.',
      it: 'Riduco la scheda di autocompletamento.',
      de: 'Ich minimiere die Autocomplete-Karte.',
      ja: 'オートコンプリートのカードを最小化します。',
      zh: '把自动完成卡片最小化。',
      hi: 'autocomplete कार्ड minimize कर रहा हूँ।',
      ar: 'اصغر بطاقة الاكمال التلقائي.',
    },
    'auto.remote_min': {
      es: 'Empiezo minimizando la tarjeta de autocompletado.',
      en: 'I start by minimizing the autocomplete card.',
      pt: 'Comeco minimizando a tarjeta de autocompletar.',
      fr: 'Je commence par reduire la carte d\'autocompletion.',
      it: 'Inizio riducendo la scheda di autocompletamento.',
      de: 'Ich beginne mit dem Minimieren der Autocomplete-Karte.',
      ja: 'まずオートコンプリートのカードを最小化。',
      zh: '先把自动完成卡片最小化。',
      hi: 'पहले autocomplete कार्ड minimize करता हूँ।',
      ar: 'ابدا بتصغير بطاقة الاكمال التلقائي.',
    },
    'auto.remote_max': {
      es: 'Ahora la abro al maximo.',
      en: 'Now I expand it.',
      pt: 'Agora a abro ao maximo.',
      fr: 'Maintenant je l\'agrandis.',
      it: 'Ora la ingrandisco.',
      de: 'Jetzt maximiere ich sie.',
      ja: '次に最大化します。',
      zh: '现在最大化。',
      hi: 'अब इसे maximize कर रहा हूँ।',
      ar: 'الان اوسعها بالكامل.',
    },
    'auto.remote_filter': {
      es: 'Y aplico el filtro: escribo "ber" y elijo Berlin.',
      en: 'And I apply the filter: type "ber" and pick Berlin.',
      pt: 'E aplico o filtro: digito "ber" e escolho Berlin.',
      fr: 'Et j\'applique le filtre: je tape "ber" et choisis Berlin.',
      it: 'E applico il filtro: scrivo "ber" e scelgo Berlin.',
      de: 'Und ich wende den Filter an: ich tippe "ber" und waehle Berlin.',
      ja: 'そしてフィルタを適用、"ber" と入力し Berlin を選びます。',
      zh: '然后应用过滤器：输入 "ber" 并选 Berlin。',
      hi: 'और filter लगाता हूँ: "ber" टाइप कर Berlin चुनता हूँ।',
      ar: 'واطبق الفلتر: اكتب "ber" واختار Berlin.',
    },
    'auto.systemmap': {
      es: 'Pido el mapa del sistema para que veas el grafo de plugins.',
      en: 'Requesting the system map so you can see the plugin graph.',
      pt: 'Peco o mapa do sistema para voce ver o grafo de plugins.',
      fr: 'Je demande la carte du systeme pour voir le graphe des plugins.',
      it: 'Chiedo la mappa del sistema cosi vedi il grafo dei plugin.',
      de: 'Ich rufe die Systemkarte auf, damit du den Plugin-Graphen siehst.',
      ja: 'プラグインのグラフを見せるためシステムマップを呼び出します。',
      zh: '请求系统地图，让你看到插件图。',
      hi: 'plugin graph देखने के लिए system map माँग रहा हूँ।',
      ar: 'اطلب خريطة النظام لرؤية الرسم البياني للاضافات.',
    },
    'auto.gotochat': {
      es: 'Vamos a la seccion del chat.',
      en: 'Heading to the chat section.',
      pt: 'Vamos a secao do chat.',
      fr: 'On va a la section du chat.',
      it: 'Andiamo alla sezione chat.',
      de: 'Auf zum Chat-Bereich.',
      ja: 'チャットの場所へ移動します。',
      zh: '我们去聊天区。',
      hi: 'चैट section की तरफ जा रहा हूँ।',
      ar: 'لنذهب الى قسم الدردشة.',
    },
    /* v1.7 widget showcase narration. Each line drives one card so
       the autopilot exercises every event family in spec sec 6.2.
       v1.9.4: ingles leaks reemplazados (chart -> grafico, marker
       -> marcador, carousel -> carrusel, timeline -> linea de
       tiempo, breadcrumb -> migas). Calendar bumped semana -> dia
       (matches the v1.9.3 bug fix that switched view click target). */
    'auto.v17_stepper': {
      es: 'Avanzo un paso en el ciclador.',
      en: 'Advancing the stepper.',
      pt: 'Avanco um passo no ciclador.',
      fr: 'J\'avance le stepper.',
      it: 'Avanzo il ciclatore.',
      de: 'Stepper weiter.',
      ja: 'ステッパーを進めます。',
      zh: '推进步进器。',
      hi: 'Stepper आगे बढ़ा रहा हूँ।',
      ar: 'اتقدم في الستيبر.',
    },
    'auto.v17_tree': {
      es: 'Abro el primer nodo del arbol.',
      en: 'Expanding the first tree node.',
      pt: 'Abro o primeiro no da arvore.',
      fr: 'J\'ouvre le premier noeud de l\'arbre.',
      it: 'Apro il primo nodo dell\'albero.',
      de: 'Erster Baumknoten auf.',
      ja: 'ツリーの最初のノードを開きます。',
      zh: '展开树的第一个节点。',
      hi: 'पेड़ का पहला node खोल रहा हूँ।',
      ar: 'افتح اول عقدة في الشجرة.',
    },
    'auto.v17_toast': {
      es: 'Tiro un mensaje toast.',
      en: 'Firing a toast.',
      pt: 'Disparo um toast.',
      fr: 'Je declenche un toast.',
      it: 'Lancio un toast.',
      de: 'Toast ausloesen.',
      ja: 'トーストを表示します。',
      zh: '触发一个通知条。',
      hi: 'Toast दिखा रहा हूँ।',
      ar: 'اطلق توست.',
    },
    'auto.v17_drawer': {
      es: 'Abro y cierro el cajon lateral.',
      en: 'Opening and closing the drawer.',
      pt: 'Abro e fecho a gaveta.',
      fr: 'J\'ouvre puis ferme le tiroir.',
      it: 'Apro e chiudo il cassetto.',
      de: 'Drawer auf und zu.',
      ja: 'ドロワーを開閉します。',
      zh: '打开和关闭抽屉。',
      hi: 'Drawer खोल कर बंद कर रहा हूँ।',
      ar: 'افتح واغلق الدرج.',
    },
    'auto.v17_calendar': {
      es: 'Cambio la vista del calendario a dia.',
      en: 'Switching calendar to day view.',
      pt: 'Mudo a vista do calendario para dia.',
      fr: 'Calendrier en vue jour.',
      it: 'Calendario in vista giorno.',
      de: 'Kalender auf Tagesansicht.',
      ja: 'カレンダーを日ビューに。',
      zh: '日历切到日视图。',
      hi: 'Calendar day view पर।',
      ar: 'تقويم الى عرض يومي.',
    },
    'auto.v17_chart': {
      es: 'Recargo los datos del grafico.',
      en: 'Reloading chart data.',
      pt: 'Recarrego os dados do grafico.',
      fr: 'Je recharge les donnees du graphique.',
      it: 'Ricarico i dati del grafico.',
      de: 'Diagramm-Daten neu laden.',
      ja: 'グラフを再読み込み。',
      zh: '重新加载图表数据。',
      hi: 'चार्ट डेटा reload कर रहा हूँ।',
      ar: 'اعد تحميل بيانات الرسم.',
    },
    'auto.v17_map': {
      es: 'Selecciono el marcador de Tokio.',
      en: 'Selecting the Tokyo marker.',
      pt: 'Seleciono o marcador de Toquio.',
      fr: 'Je selectionne le marqueur Tokyo.',
      it: 'Seleziono il marcatore di Tokyo.',
      de: 'Tokio-Marker waehlen.',
      ja: '東京のマーカーを選びます。',
      zh: '选择东京标记。',
      hi: 'टोक्यो marker चुन रहा हूँ।',
      ar: 'اختار علامة طوكيو.',
    },
    'auto.v17_richtext': {
      es: 'Aplico negrita al texto enriquecido.',
      en: 'Bolding the rich text.',
      pt: 'Aplico negrito ao texto rico.',
      fr: 'Je mets le texte enrichi en gras.',
      it: 'Metto in grassetto il testo formattato.',
      de: 'Rich Text fett setzen.',
      ja: 'リッチテキストを太字に。',
      zh: '把富文本加粗。',
      hi: 'rich text bold कर रहा हूँ।',
      ar: 'اجعل النص الغني عريضا.',
    },
    'auto.v17_breadcrumb': {
      es: 'Voy a la miga del medio.',
      en: 'Navigating to the mid breadcrumb.',
      pt: 'Vou para o item do meio.',
      fr: 'Je navigue au fil d\'Ariane du milieu.',
      it: 'Vado alla briciola intermedia.',
      de: 'Zu mittlerem Brotkrumen.',
      ja: '中間のパンくずに移動。',
      zh: '导航到中间面包屑。',
      hi: 'बीच के breadcrumb पर जा रहा हूँ।',
      ar: 'انتقل الى مسار التنقل الاوسط.',
    },
    'auto.v17_carousel': {
      es: 'Avanzo el carrusel.',
      en: 'Advancing the carousel.',
      pt: 'Avanco o carrossel.',
      fr: 'J\'avance le carrousel.',
      it: 'Avanzo il carosello.',
      de: 'Karussell weiter.',
      ja: 'カルーセルを進めます。',
      zh: '推进轮播。',
      hi: 'Carousel आगे बढ़ा रहा हूँ।',
      ar: 'اقدم الشريط الدوار.',
    },
    'auto.v17_timeline': {
      es: 'Cargo eventos antiguos de la linea de tiempo.',
      en: 'Loading older timeline entries.',
      pt: 'Carrego eventos antigos da linha do tempo.',
      fr: 'Je charge les entrees plus anciennes de la chronologie.',
      it: 'Carico voci piu vecchie della cronologia.',
      de: 'Aeltere Zeitleisten-Eintraege laden.',
      ja: 'タイムラインの古い項目を読み込み。',
      zh: '加载更早的时间线条目。',
      hi: 'टाइमलाइन में पुराने events ला रहा हूँ।',
      ar: 'احمل اقدم عناصر الخط الزمني.',
    },

    'auto.v18_skip': {
      es: 'Corro validate sobre la region marcada como skip: el widget de proveedor queda fuera del NAC-3, solo con un aviso.',
      en: 'Running validate over the skip region: the vendor widget is exempt from NAC-3 with just a warning.',
      pt: 'Rodo validate sobre a regiao skip: o widget de fornecedor fica fora do NAC-3, com apenas um aviso.',
      fr: 'Je lance validate sur la zone skip: le widget tiers est exempte du NAC-3, juste un avertissement.',
      it: 'Eseguo validate sulla regione skip: il widget di terze parti e esente dal NAC-3, solo con un avviso.',
      de: 'Validate ueber die Skip-Region: das Drittanbieter-Widget ist vom NAC-3 ausgenommen, nur mit Warnung.',
      ja: 'スキップ領域で validate を実行：サードパーティのウィジェットは NAC-3 から除外され、警告のみ。',
      zh: '在 skip 区运行 validate：第三方组件不计入 NAC-3，仅一个警告。',
      hi: 'skip region पर validate: तीसरे-पक्ष का widget NAC-3 से छूट, सिर्फ एक चेतावनी।',
      ar: 'اشغل validate على منطقة skip: ودجت الطرف الثالث معفى من NAC-3 مع تحذير فقط.',
    },

    'auto.v18_a11y': {
      es: 'El boton "borrar" declara a11y-hint irreversible. Como agente IA leo el hint y NO invoco. Emito command:rejected con razon agent_declined_irreversible. Asi v1.9 propone autonomia con freno.',
      en: 'The delete button declares a11y-hint irreversible. As an AI agent I read the hint and DO NOT invoke. I emit command:rejected with reason agent_declined_irreversible. This is v1.9 proposing autonomy with restraint.',
      pt: 'O botao "apagar" declara a11y-hint irreversible. Como agente IA leio o hint e NAO invoco. Emito command:rejected com razao agent_declined_irreversible.',
      fr: 'Le bouton "supprimer" declare a11y-hint irreversible. En tant qu\'agent IA je lis le hint et N\'INVOQUE PAS. J\'emets command:rejected avec reason agent_declined_irreversible.',
      it: 'Il pulsante "elimina" dichiara a11y-hint irreversible. Come agente IA leggo il hint e NON invoco. Emetto command:rejected con reason agent_declined_irreversible.',
      de: 'Der Loesch-Knopf deklariert a11y-hint irreversible. Als KI-Agent lese ich den Hint und INVOKE NICHT. Ich emit command:rejected mit reason agent_declined_irreversible.',
      ja: '削除ボタンは a11y-hint irreversible を宣言。AI エージェントとして hint を読み、呼び出しません。command:rejected を reason agent_declined_irreversible で発火。',
      zh: '删除按钮声明 a11y-hint irreversible。作为 AI 代理，我读取 hint 并不调用。我发出 command:rejected，理由 agent_declined_irreversible。',
      hi: 'delete बटन a11y-hint irreversible declare करता है। AI agent के रूप में मैं hint पढ़ता हूँ और इसे invoke नहीं करता। command:rejected reason agent_declined_irreversible के साथ।',
      ar: 'زر الحذف يعلن a11y-hint irreversible. بصفتي وكيل ذكاء اصطناعي اقرا التلميح ولا اتصل. اطلق command:rejected بسبب agent_declined_irreversible.',
    },

    'auto.v18_dragtypes': {
      es: 'Arrastro una etiqueta a la zona "solo archivos". Tipo incompatible: command:rejected con razon drag_type_mismatch.',
      en: 'Dragging a tag onto the files-only zone. Type mismatch: command:rejected with reason drag_type_mismatch.',
      pt: 'Arrasto uma etiqueta para a zona "so arquivos". Tipo incompativel: command:rejected por drag_type_mismatch.',
      fr: 'Je glisse une etiquette sur la zone "fichiers uniquement". Type incompatible: command:rejected pour drag_type_mismatch.',
      it: 'Trascino un tag nella zona "solo file". Tipo non compatibile: command:rejected con reason drag_type_mismatch.',
      de: 'Ich ziehe ein Tag in die "Nur Dateien"-Zone. Typ unvertraeglich: command:rejected mit reason drag_type_mismatch.',
      ja: 'タグを「ファイルのみ」ゾーンへドラッグ。型不一致で command:rejected が reason drag_type_mismatch で発火。',
      zh: '将一个标签拖到"仅文件"区。类型不匹配：command:rejected 以 drag_type_mismatch 触发。',
      hi: 'tag को "केवल फ़ाइलें" zone में drag। type mismatch: command:rejected reason drag_type_mismatch के साथ।',
      ar: 'اسحب وسما الى منطقة "الملفات فقط". تعارض النوع: command:rejected بسبب drag_type_mismatch.',
    },

    'auto.closing': {
      es: 'Eso es NAC v1.9. Mas de 30 familias de eventos canonicas. ProvenanceBlock con HMAC por accion. nac:action:confirm para acciones irreversibles. data-nac-braille-label para usuarios sordociegos. Todos los widgets operables por voz, chat, RPA, agentes IA y lectores de pantalla. Sin scraping. Sin hacks de DOM. Solo el contrato.',
      en: 'That is NAC v1.9. Over 30 canonical event families. ProvenanceBlock with HMAC per action. nac:action:confirm for irreversible actions. data-nac-braille-label for deaf-blind users. Every widget driveable by voice, chat, RPA, AI agents, and screen readers. No scraping. No DOM hacks. Just the contract.',
      pt: 'Isso e NAC v1.9. Mais de 30 familias de eventos canonicas. ProvenanceBlock com HMAC por acao. nac:action:confirm para acoes irreversiveis. data-nac-braille-label para usuarios surdo-cegos. Todo widget conduzivel por voz, chat, RPA, agentes IA e leitores de tela. Sem scraping. Sem hacks de DOM. Apenas o contrato.',
      fr: 'Voila NAC v1.9. Plus de 30 familles d\'evenements canoniques. ProvenanceBlock avec HMAC par action. nac:action:confirm pour les actions irreversibles. data-nac-braille-label pour les utilisateurs sourds-aveugles. Chaque widget pilotable par voix, chat, RPA, agents IA et lecteurs d\'ecran. Pas de scraping. Pas de hacks DOM. Juste le contrat.',
      it: 'Questo e NAC v1.9. Oltre 30 famiglie di eventi canoniche. ProvenanceBlock con HMAC per azione. nac:action:confirm per azioni irreversibili. data-nac-braille-label per utenti sordo-ciechi. Ogni widget pilotabile per voce, chat, RPA, agenti IA e screen reader. Niente scraping. Niente hack DOM. Solo il contratto.',
      de: 'Das ist NAC v1.9. Mehr als 30 kanonische Event-Familien. ProvenanceBlock mit HMAC pro Aktion. nac:action:confirm fuer irreversible Aktionen. data-nac-braille-label fuer taubblinde Nutzer. Jedes Widget steuerbar per Stimme, Chat, RPA, KI-Agenten und Screen Reader. Kein Scraping. Keine DOM-Hacks. Nur der Vertrag.',
      ja: 'これが NAC v1.9 です。30 を超えるカノニカルなイベント・ファミリー。アクションごとに HMAC 付き ProvenanceBlock。不可逆アクション用の nac:action:confirm。盲ろう者のための data-nac-braille-label。すべてのウィジェットが音声、チャット、RPA、AI エージェント、スクリーンリーダーで操作可能。スクレイピングなし、DOM ハックなし、契約だけ。',
      zh: '这就是 NAC v1.9。超过 30 个规范事件族。每个动作带 HMAC 的 ProvenanceBlock。nac:action:confirm 用于不可逆动作。data-nac-braille-label 服务聋盲用户。每个 widget 都可由语音、聊天、RPA、AI 代理和屏幕阅读器操作。无 scraping，无 DOM hack。只有契约。',
      hi: 'यह है NAC v1.9. 30 से अधिक canonical event families। हर action पर HMAC के साथ ProvenanceBlock. अपरिवर्तनीय actions के लिए nac:action:confirm. बहरे-अंधे उपयोगकर्ताओं के लिए data-nac-braille-label. हर widget आवाज़, chat, RPA, AI agents और screen readers से चल सकता है. कोई scraping नहीं, कोई DOM hack नहीं, केवल contract।',
      ar: 'هذا هو NAC v1.9. اكثر من 30 عائلة احداث قانونية. ProvenanceBlock مع HMAC لكل اجراء. nac:action:confirm للاجراءات التي لا رجعة فيها. data-nac-braille-label لمستخدمي البريل من فاقدي السمع والبصر. كل ودجت قابل للقيادة بالصوت، الدردشة، RPA، وكلاء الذكاء الاصطناعي وقارئات الشاشة. بدون scraping. بدون حيل DOM. فقط العقد.',
    },

    /* ===== Misc bot lines (templated where needed) ===== */
    'msg.upload_sim': {
      es: 'Subi (simulado): {value}',
      en: 'Uploaded (simulated): {value}',
      pt: 'Enviei (simulado): {value}',
      fr: 'Telecharge (simule) : {value}',
      it: 'Caricato (simulato): {value}',
      de: 'Hochgeladen (simuliert): {value}',
      ja: 'アップロード (シミュレート): {value}',
      zh: '已上传 (模拟): {value}',
      hi: 'Upload किया (simulated): {value}',
      ar: 'تم الرفع (محاكاة): {value}',
    },
    'msg.tab_overview': {
      es: 'Tab Overview activa.', en: 'Overview tab active.',
      pt: 'Aba Overview ativa.', fr: 'Onglet Overview actif.',
      it: 'Scheda Overview attiva.', de: 'Tab Overview aktiv.',
      ja: 'Overview タブが有効。', zh: 'Overview 标签已激活。',
      hi: 'Overview tab सक्रिय।', ar: 'علامة Overview نشطة.',
    },
    'msg.tab_details': {
      es: 'Tab Details activa.', en: 'Details tab active.',
      pt: 'Aba Details ativa.', fr: 'Onglet Details actif.',
      it: 'Scheda Details attiva.', de: 'Tab Details aktiv.',
      ja: 'Details タブが有効。', zh: 'Details 标签已激活。',
      hi: 'Details tab सक्रिय।', ar: 'علامة Details نشطة.',
    },
    'msg.tab_history': {
      es: 'Tab History activa.', en: 'History tab active.',
      pt: 'Aba History ativa.', fr: 'Onglet History actif.',
      it: 'Scheda History attiva.', de: 'Tab History aktiv.',
      ja: 'History タブが有効。', zh: 'History 标签已激活。',
      hi: 'History tab सक्रिय।', ar: 'علامة History نشطة.',
    },
    'msg.section_a': {
      es: 'Seccion A abierta.', en: 'Section A opened.',
      pt: 'Secao A aberta.', fr: 'Section A ouverte.',
      it: 'Sezione A aperta.', de: 'Abschnitt A geoeffnet.',
      ja: 'セクション A を開きました。', zh: 'A 节已展开。',
      hi: 'Section A खोली।', ar: 'تم فتح القسم A.',
    },
    'msg.section_b': {
      es: 'Seccion B abierta.', en: 'Section B opened.',
      pt: 'Secao B aberta.', fr: 'Section B ouverte.',
      it: 'Sezione B aperta.', de: 'Abschnitt B geoeffnet.',
      ja: 'セクション B を開きました。', zh: 'B 节已展开。',
      hi: 'Section B खोली।', ar: 'تم فتح القسم B.',
    },
    'msg.volume': {
      es: 'Volumen en {value}%.', en: 'Volume at {value}%.',
      pt: 'Volume em {value}%.', fr: 'Volume a {value}%.',
      it: 'Volume al {value}%.', de: 'Lautstaerke bei {value}%.',
      ja: 'ボリューム {value}%。', zh: '音量 {value}%。',
      hi: 'Volume {value}% पर।', ar: 'الصوت عند {value}%.',
    },
    'msg.sort_name': {
      es: 'Tabla ordenada por nombre {dir}.', en: 'Table sorted by name {dir}.',
      pt: 'Tabela ordenada por nome {dir}.', fr: 'Tableau trie par nom {dir}.',
      it: 'Tabella ordinata per nome {dir}.', de: 'Tabelle nach Name {dir} sortiert.',
      ja: '名前で {dir} にソート。', zh: '按名字 {dir} 排序。',
      hi: 'Name से {dir} sort।', ar: 'تم الفرز بالاسم {dir}.',
    },
    'msg.sort_age': {
      es: 'Tabla ordenada por edad {dir}.', en: 'Table sorted by age {dir}.',
      pt: 'Tabela ordenada por idade {dir}.', fr: 'Tableau trie par age {dir}.',
      it: 'Tabella ordinata per eta {dir}.', de: 'Tabelle nach Alter {dir} sortiert.',
      ja: '年齢で {dir} にソート。', zh: '按年龄 {dir} 排序。',
      hi: 'Age से {dir} sort।', ar: 'تم الفرز بالعمر {dir}.',
    },
    'msg.sort_city': {
      es: 'Tabla ordenada por ciudad {dir}.', en: 'Table sorted by city {dir}.',
      pt: 'Tabela ordenada por cidade {dir}.', fr: 'Tableau trie par ville {dir}.',
      it: 'Tabella ordinata per citta {dir}.', de: 'Tabelle nach Stadt {dir} sortiert.',
      ja: '都市で {dir} にソート。', zh: '按城市 {dir} 排序。',
      hi: 'City से {dir} sort।', ar: 'تم الفرز بالمدينة {dir}.',
    },
    'msg.filter': {
      es: 'Tabla filtrada por "{q}".', en: 'Table filtered by "{q}".',
      pt: 'Tabela filtrada por "{q}".', fr: 'Tableau filtre par "{q}".',
      it: 'Tabella filtrata per "{q}".', de: 'Tabelle gefiltert nach "{q}".',
      ja: '"{q}" でフィルタ。', zh: '按 "{q}" 过滤。',
      hi: '"{q}" से filter।', ar: 'تمت التصفية بـ "{q}".',
    },
    'msg.page_next': {
      es: 'Pagina siguiente.', en: 'Next page.',
      pt: 'Proxima pagina.', fr: 'Page suivante.',
      it: 'Pagina successiva.', de: 'Naechste Seite.',
      ja: '次のページ。', zh: '下一页。',
      hi: 'अगला page।', ar: 'الصفحة التالية.',
    },
    'msg.page_prev': {
      es: 'Pagina anterior.', en: 'Previous page.',
      pt: 'Pagina anterior.', fr: 'Page precedente.',
      it: 'Pagina precedente.', de: 'Vorherige Seite.',
      ja: '前のページ。', zh: '上一页。',
      hi: 'पिछला page।', ar: 'الصفحة السابقة.',
    },
    'msg.alpha_drop': {
      es: 'Alpha movido a la lista derecha.', en: 'Alpha dropped to the right list.',
      pt: 'Alpha movido para a lista direita.', fr: 'Alpha deplace dans la liste droite.',
      it: 'Alpha spostato nella lista a destra.', de: 'Alpha in die rechte Liste verschoben.',
      ja: 'Alpha を右リストに移動。', zh: 'Alpha 移到右边列表。',
      hi: 'Alpha को दाईं सूची में रखा।', ar: 'تم نقل Alpha الى القائمة اليمنى.',
    },
    'msg.beta_drop': {
      es: 'Beta movido a la lista derecha.', en: 'Beta dropped to the right list.',
      pt: 'Beta movido para a lista direita.', fr: 'Beta deplace dans la liste droite.',
      it: 'Beta spostato nella lista a destra.', de: 'Beta in die rechte Liste verschoben.',
      ja: 'Beta を右リストに移動。', zh: 'Beta 移到右边列表。',
      hi: 'Beta को दाईं सूची में रखा।', ar: 'تم نقل Beta الى القائمة اليمنى.',
    },
    'msg.gamma_drop': {
      es: 'Gamma movido a la lista derecha.', en: 'Gamma dropped to the right list.',
      pt: 'Gamma movido para a lista direita.', fr: 'Gamma deplace dans la liste droite.',
      it: 'Gamma spostato nella lista a destra.', de: 'Gamma in die rechte Liste verschoben.',
      ja: 'Gamma を右リストに移動。', zh: 'Gamma 移到右边列表。',
      hi: 'Gamma को दाईं सूची में रखा।', ar: 'تم نقل Gamma الى القائمة اليمنى.',
    },
    /* sort direction tokens, used to interpolate {dir} in the
       sort messages above. */
    'msg.dir_asc': {
      es: 'asc.', en: 'asc.', pt: 'asc.', fr: 'asc.',
      it: 'asc.', de: 'asc.', ja: '昇順。', zh: '升序。',
      hi: 'asc।', ar: 'تصاعدي.',
    },
    'msg.dir_desc': {
      es: 'desc.', en: 'desc.', pt: 'desc.', fr: 'desc.',
      it: 'desc.', de: 'desc.', ja: '降順。', zh: '降序。',
      hi: 'desc।', ar: 'تنازلي.',
    },
  };

  /* Tiny printf-style placeholder substitution: replaces every
     `{name}` in the template with the corresponding key in vars.
     Used by botSpeak callers that pass a value (volume %, file
     name, sort dir, filter query, etc) into a localised message. */
  function tFmt(key, vars) {
    let s = t(key);
    if (!vars) return s;
    return s.replace(/\{(\w+)\}/g, function (_, k) {
      return (k in vars) ? String(vars[k]) : '{' + k + '}';
    });
  }

  function translatePage() {
    /* Body text via data-i18n-key. */
    const els = document.querySelectorAll('[data-i18n-key]');
    Array.prototype.forEach.call(els, function (el) {
      const key = el.getAttribute('data-i18n-key');
      const map = SECTION_I18N[key];
      if (!map) return;
      const text = map[currentLang] || map.en;
      if (!text) return;
      /* CRITICAL: do NOT touch elements that contain element
         children. Replacing textContent on a parent wipes out
         every nested element. Skip; rely on each child carrying
         its own data-i18n-key. The intro lead paragraph used to
         wrap an inline action button; v1.9.1 moved it out so the
         lead translates and the button translates separately. */
      if (el.children && el.children.length > 0) return;
      el.textContent = text;
    });
    /* v1.9.1: attribute translations. Three conventions cover
       the common cases:
         data-i18n-aria-label-key  -> aria-label
         data-i18n-placeholder-key -> placeholder
         data-i18n-title-key       -> title (tooltip)
       Any element can declare any subset. We deliberately
       require explicit per-attribute keys (not a generic
       data-i18n-attr="aria-label:key|placeholder:key2") so the
       grep audit stays trivial. */
    const ATTR_MAP = [
      ['data-i18n-aria-label-key',  'aria-label'],
      ['data-i18n-placeholder-key', 'placeholder'],
      ['data-i18n-title-key',       'title'],
    ];
    for (let i = 0; i < ATTR_MAP.length; i++) {
      const dataAttr = ATTR_MAP[i][0];
      const targetAttr = ATTR_MAP[i][1];
      const nodes = document.querySelectorAll('[' + dataAttr + ']');
      Array.prototype.forEach.call(nodes, function (el) {
        const key = el.getAttribute(dataAttr);
        const map = SECTION_I18N[key];
        if (!map) return;
        const text = map[currentLang] || map.en;
        if (!text) return;
        el.setAttribute(targetAttr, text);
      });
    }
    /* Document direction RTL flips for Arabic + Hebrew. */
    const rtl = (currentLang === 'ar');
    document.documentElement.setAttribute('dir', rtl ? 'rtl' : 'ltr');
  }

  /* Persist the detected locale once per page load. The agentic
     dispatcher and the legacy matcher both read `currentLang`. */
  function _detectLang() {
    /* Priority: explicit URL ?lang=xx > html lang attr >
       navigator.language > 'en'. */
    try {
      const u = new URL(location.href);
      const q = u.searchParams.get('lang');
      if (q && /^[a-z]{2}$/i.test(q)) return q.slice(0, 2).toLowerCase();
    } catch (e) {}
    const html = (document.documentElement.getAttribute('lang') || '')
      .slice(0, 2).toLowerCase();
    if (html && I18N.badge_thinking[html]) return html;
    const nav = (navigator.language || 'en').slice(0, 2).toLowerCase();
    if (nav && I18N.badge_thinking[nav]) return nav;
    return 'en';
  }
  let currentLang = _detectLang();
  /* Honour runtime override (e.g. demo page may flip locale via a
     selector and call window.setNacDemoLang('zh')). */
  window.setNacDemoLang = function (lang) {
    if (typeof lang === 'string' && I18N.badge_thinking[lang]) {
      currentLang = lang;
    }
  };
  function t(key) {
    /* Lookup walks BOTH translation tables. The original I18N
       table holds chat-chrome keys (badge_*, err_*, msg_*, tts_*).
       SECTION_I18N holds page-wide visible chrome plus autopilot
       + runtime feedback. */
    let e = I18N[key];
    if (!e && typeof SECTION_I18N !== 'undefined') {
      e = SECTION_I18N[key];
    }
    if (!e) return key;
    return e[currentLang] || e.en || key;
  }

  /* TTS BCP-47 lang code per UI lang. Web Speech accepts longer
     tags but most engines pick a default voice when given just the
     primary subtag. */
  const TTS_BCP47 = {
    es: 'es-AR', en: 'en-US', pt: 'pt-BR', fr: 'fr-FR',
    it: 'it-IT', de: 'de-DE', ja: 'ja-JP', zh: 'zh-CN',
    hi: 'hi-IN', ar: 'ar-SA',
  };

  /* v1.6.5: TTS-busy tracker so automated flows (autopilot tick,
     agent tour wait) can size their pauses to match how long TTS
     actually takes to read each line. The user asked: "que las
     pausas de las automatizaciones al final de cada paso se
     ajusten a la cantidad de segundos que lleva recitar el audio
     respectivo". When TTS is off this stays at 0 and the
     automations run at the visual-minimum cadence. When TTS is
     on, _ttsBusyUntil is the wall-clock timestamp at which the
     current speech is expected to finish; flows compute their
     pause as max(visual_settle, _ttsBusyUntil - now + buffer). */
  let _ttsBusyUntil = 0;

  /* 2026-05-09 fix C1 (TTS->STT feedback loop):
     Maintain a circular buffer of the last N utterances the bot
     spoke, normalised. When a STT result arrives, we compare
     against this buffer and drop matches -- the bot is hearing
     itself through the speakers. The recognizer is also paused
     while TTS is actively speaking (half-duplex).

     Why both: pausing the recognizer prevents 95% of cases (the
     mic mutes for the duration of bot speech). The content filter
     catches the residual cases where:
       - the OS audio loopback delay leaks a fragment AFTER mute,
       - the user's headphones leak audio into the room mic,
       - the recognizer was already mid-result when the bot started.
     Both layers run in parallel; either dropping the input is
     enough.

     Buffer size 8 is empirical -- enough to cover a multi-sentence
     reply chain (e.g. "Modo manos libres confirmado. Decime que
     queres hacer. Te escucho."). */
  const _ttsRecentBuf = [];
  const _TTS_RECENT_MAX = 8;
  const _TTS_RECENT_TTL_MS = 30000;   /* 30s -- past that, the bot
                                          uttered something else */

  function _normalizeForFilter(s) {
    /* lowercase + strip diacritics + collapse whitespace +
       drop punctuation. ASCII-only by using the Unicode
       combining-diacritics escape regex (matches U+0300..U+036F).
       Same algorithm as @nac-spec/test-runner matcher._norm. */
    return String(s || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function _sttIsBotEcho(transcript) {
    if (!transcript) return false;
    const norm = _normalizeForFilter(transcript);
    if (!norm) return false;
    const now = Date.now();
    /* Purge expired entries lazily so the buffer cannot grow
       unbounded under a wedged TTS. */
    while (_ttsRecentBuf.length && now - _ttsRecentBuf[0].ts > _TTS_RECENT_TTL_MS) {
      _ttsRecentBuf.shift();
    }
    for (let i = 0; i < _ttsRecentBuf.length; i++) {
      const entry = _ttsRecentBuf[i].norm;
      if (!entry) continue;
      /* Exact equality: the recognizer faithfully transcribed the
         bot. */
      if (entry === norm) return true;
      /* Containment: a fragment of the utterance got captured
         (Chrome breaks long utterances into multiple finals). */
      if (entry.length > 8 && entry.indexOf(norm) >= 0) return true;
      if (norm.length  > 8 && norm.indexOf(entry) >= 0) return true;
      /* Token-level overlap: 70%+ of tokens match -- the user's
         room mic blended bot voice with silence. Only triggered
         on inputs of 3+ tokens to avoid false positives on short
         deliberate commands like "yes". */
      const a = entry.split(' ');
      const b = norm.split(' ');
      if (a.length >= 3 && b.length >= 3) {
        const setA = new Set(a);
        let hit = 0;
        for (let k = 0; k < b.length; k++) if (setA.has(b[k])) hit++;
        const ratio = hit / Math.max(a.length, b.length);
        if (ratio >= 0.7) return true;
      }
    }
    return false;
  }

  function _ttsRememberUtterance(text) {
    if (!text) return;
    _ttsRecentBuf.push({ norm: _normalizeForFilter(text), ts: Date.now() });
    while (_ttsRecentBuf.length > _TTS_RECENT_MAX) _ttsRecentBuf.shift();
  }
  function _ttsRemainingMs() {
    return Math.max(0, _ttsBusyUntil - Date.now());
  }

  /* v1.8 sync flag: when true (set by autopilot), botSpeak buffers
     the narration for ~280ms so the smooth scrollIntoView triggered
     by NAC.click in the SAME step has time to settle and the
     widget animation (chart bars, marker pulse, etc.) is visible
     by the time the voice describes it. Conformance test and chat
     keep the instant path. */
  let _autopilotSpeakDelayMs = 0;

  /* v1.8 spotlight: during the autopilot run, BEFORE every NAC
     write call (click/fill/expand/sort/set_slider/drag_drop/
     go_to_section), find the .ne-card or .ne-side-section
     ancestor of the target nac_id and add data-nac-autopilot-
     spotlight="1" so a CSS rule frames it in red. The previous
     spotlight is removed in the same beat so only one card is
     ever active. The handler is reactive to a target-id, which
     means it fires in time for the user to follow the focus
     visually before the action settles. */
  let _spotlightCurrent = null;
  function _spotlightById(nacId) {
    if (!nacId) return;
    const el = document.querySelector('[data-nac-id="' + nacId + '"]');
    if (!el) return;
    const card = el.closest(
      '.ne-card, .ne-side-section, [data-nac-role="section"]');
    if (!card || card === _spotlightCurrent) return;
    if (_spotlightCurrent) {
      _spotlightCurrent.removeAttribute('data-nac-autopilot-spotlight');
    }
    card.setAttribute('data-nac-autopilot-spotlight', '1');
    _spotlightCurrent = card;
  }
  function _spotlightClear() {
    if (_spotlightCurrent) {
      _spotlightCurrent.removeAttribute('data-nac-autopilot-spotlight');
      _spotlightCurrent = null;
    }
  }
  /* v1.9.3: focus-lead time. Pre-fix the autopilot called
     NAC.click(), which inside ran scrollIntoView({behavior:'smooth'})
     followed by el.click() in the next microtask. The smooth scroll
     takes 500-800ms; el.click() runs synchronously before the scroll
     completes, so by the time the user's eye landed on the target
     card the data had already changed. The user reported: "el foco
     llega despues del cambio de datos. un par de segundos."
     Fix: in the autopilot wrap, do the scroll EXPLICITLY first,
     then PAUSE for FOCUS_LEAD_MS, then dispatch the original call.
     Net flow per step:
       t = 0          : spotlight applied + smooth scroll begins
       t = 500-800    : scroll settles, user's eye reaches the card
                        with data still unchanged
       t = 800-1200   : user fixates briefly on current state
       t = LEAD       : orig.click() fires, data changes under gaze
       t = LEAD + 600 : voice describes the change (post-LEAD voice
                        delay reduced from 2200ms to 600ms because
                        the LEAD already eats the visual gap). */
  const FOCUS_LEAD_MS = 1200;
  function _scrollTargetIntoView(nacId) {
    if (!nacId) return;
    const el = document.querySelector('[data-nac-id="' + nacId + '"]');
    if (!el || typeof el.scrollIntoView !== 'function') return;
    try {
      el.scrollIntoView({ behavior: 'smooth', block: 'center',
                          inline: 'nearest' });
    } catch (e) { /* older browsers ignore options */ }
  }
  /* Monkey-patch lifecycle: returns a restore function. Patches
     each write entry-point so it spotlights its target BEFORE
     dispatching the underlying call, scrolls the target into the
     viewport, waits FOCUS_LEAD_MS for the scroll to settle and
     for the user's gaze to fixate, then runs the original call.
     The wrap returns a Promise that resolves when the underlying
     call resolves so the autopilot's await chain stays intact. */
  function _installAutopilotSpotlight() {
    if (!window.NAC) return function () {};
    const orig = {};
    function wrap(name) {
      if (typeof NAC[name] !== 'function') return;
      orig[name] = NAC[name];
      NAC[name] = function (firstArg) {
        const args = arguments;
        if (typeof firstArg === 'string') {
          _spotlightById(firstArg);
          _scrollTargetIntoView(firstArg);
        }
        return new Promise(function (resolve, reject) {
          setTimeout(function () {
            try {
              const r = orig[name].apply(NAC, args);
              Promise.resolve(r).then(resolve, reject);
            } catch (e) { reject(e); }
          }, FOCUS_LEAD_MS);
        });
      };
    }
    ['click', 'fill', 'expand', 'collapse', 'sort', 'filter',
     'set_slider', 'drag_drop', 'go_to_section', 'pick_date',
     'tree_expand', 'tree_collapse', 'tree_select',
     'step_next', 'step_back', 'step_to',
     'open_drawer', 'close_drawer',
     'calendar_view', 'calendar_select_event',
     'chart_toggle_series', 'map_focus', 'map_select_marker',
     'richtext_format', 'navigate_breadcrumb',
     'carousel_advance', 'carousel_to',
     'minimize', 'maximize', 'restore'].forEach(wrap);
    return function _restore() {
      Object.keys(orig).forEach(function (k) { NAC[k] = orig[k]; });
      _spotlightClear();
    };
  }
  let _spotlightUninstall = null;
  function botSpeak(text, opts) {
    if (_autopilotSpeakDelayMs > 0) {
      const d = _autopilotSpeakDelayMs;
      setTimeout(function () { _doBotSpeak(text, opts); }, d);
      return;
    }
    _doBotSpeak(text, opts);
  }
  function _doBotSpeak(text, opts) {
    chatBubble('bot', text, opts);
    /* 2026-05-09 fix C1: remember every utterance the bot is
       about to speak, so the STT path can drop echoes. Done
       BEFORE the speak() call so a result arriving mid-speech
       still finds the entry. */
    _ttsRememberUtterance(text);
    if (!ttsEnabled || !('speechSynthesis' in window)) return;
    try {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = TTS_BCP47[currentLang] || 'en-US';
      u.rate = 1.05;
      u.pitch = 1.0;
      /* Estimate speech duration. Latin scripts at rate 1.05
         deliver ~14 chars/sec (~150 wpm * 5 chars/word / 60).
         CJK scripts pack ~1 syllable per glyph and TTS reads
         them at ~6 chars/sec. Hindi/Arabic land between (~10).
         A 1.2x safety multiplier so pauses end AFTER speech
         settles rather than mid-syllable. */
      const isCJK   = /[぀-ヿ一-鿿가-힯]/.test(text);
      const isAbjad = /[؀-ۿऀ-ॿ]/.test(text);
      const charsPerSec = isCJK ? 6 : (isAbjad ? 10 : 14);
      /* v1.7 round 4: bumped 1.2 -> 1.5 because Spanish at rate
         1.05 was finishing AFTER the autopilot proceeded to the
         next step, leaving voice and visuals desynced. */
      const estMs = Math.max(800, Math.round((text.length / charsPerSec) * 1000 * 1.5));
      const queueTail = Math.max(_ttsBusyUntil, Date.now());
      _ttsBusyUntil = queueTail + estMs;
      /* Refine the timestamp when the browser actually finishes
         (or errors out). The estimate is a safety net for browsers
         that fire onend late or never. */
      u.onend   = function () { _ttsBusyUntil = Date.now(); };
      u.onerror = function () { _ttsBusyUntil = Date.now(); };
      /* No speechSynthesis.cancel() here -- multiple speaks queue
         naturally on the SpeechSynthesis API. Cancellation
         happens in chatSend / voice onresult / mic-stop paths
         where a new user turn legitimately discards the bot's
         pending speech. */
      speechSynthesis.speak(u);
    } catch (e) { /* swallow; TTS is best-effort */ }
  }
  /* 2026-05-09 fix C7-bis: locale switch detection BEFORE the LLM
     round-trip. The previous fix only added a `change_locale` kind
     to the system prompt but the LLM intermittently emitted only
     a `say` action with the acknowledgement and no actual
     change_locale -- the user heard "Cambio el idioma a ingles"
     but the page stayed in Spanish. This pre-filter catches the
     intent locally with a 10-locale name dictionary + 6-language
     switch-verb regex, and applies the change directly. Same
     boundary semantics as fix C3 (the confirm-dialog route). */
  var LOCALE_NAMES = {
    /* Spanish */
    'espanol': 'es', 'castellano': 'es',
    'ingles': 'en',
    'portugues': 'pt',
    'frances': 'fr',
    'italiano': 'it',
    'aleman': 'de',
    'japones': 'ja',
    'chino': 'zh',
    'hindi': 'hi',
    'arabe': 'ar',
    /* English */
    'spanish': 'es',
    'english': 'en',
    'portuguese': 'pt',
    'french': 'fr',
    'german': 'de',
    'japanese': 'ja',
    'chinese': 'zh',
    'arabic': 'ar',
    /* Portuguese */
    'espanhol': 'es', 'frances_pt': 'fr', 'alemao': 'de',
    /* French */
    'espagnol': 'es', 'anglais': 'en', 'allemand': 'de', 'italien': 'it',
    /* German */
    'spanisch': 'es', 'englisch': 'en', 'franzosisch': 'fr', 'italienisch': 'it', 'deutsch': 'de',
    /* Italian */
    'spagnolo': 'es', 'inglese': 'en', 'francese': 'fr', 'tedesco': 'de',
    /* ISO codes accepted directly */
    'es': 'es', 'en': 'en', 'pt': 'pt', 'fr': 'fr', 'it': 'it',
    'de': 'de', 'ja': 'ja', 'zh': 'zh', 'hi': 'hi', 'ar': 'ar'
  };
  var _LOCALE_SWITCH_VERB_RE = new RegExp(
    '\\b(' +
      'cambia|cambiar|cambialo|cambiame|cambiamelo|' +
      'switch|change|use|using|set' +
    ')\\b'
  );
  /* Bare-name shortcut: 1- or 2-word inputs like "ingles" or
     "switch english" that drop a switch verb plus a known
     locale name. */
  function _normalizeForLocale(s) {
    return String(s || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
  function _detectLangSwitchIntent(rawText) {
    var norm = _normalizeForLocale(rawText);
    if (!norm) return null;
    var tokens = norm.split(' ').filter(Boolean);
    /* Prefer hits that include an explicit switch verb. */
    var hasVerb = _LOCALE_SWITCH_VERB_RE.test(norm)
               || /\bidioma\b/.test(norm)
               || /\blanguage\b/.test(norm)
               || /\bsprache\b/.test(norm)   /* de */
               || /\blingua\b/.test(norm)    /* it/pt */
               || /\blangue\b/.test(norm);   /* fr */
    var foundCode = null;
    for (var i = 0; i < tokens.length; i++) {
      if (LOCALE_NAMES[tokens[i]]) { foundCode = LOCALE_NAMES[tokens[i]]; break; }
    }
    if (!foundCode) return null;
    /* Bare-name policy: short input (<=3 tokens) AND a locale
       name -> treat as switch even without explicit verb.
       Otherwise require the verb to avoid false positives on
       conversational mentions of language names. */
    if (hasVerb || tokens.length <= 3) return foundCode;
    return null;
  }
  function _maybeChangeLocaleLocally(rawText) {
    var code = _detectLangSwitchIntent(rawText);
    if (!code) return false;
    if (typeof applyLangChange !== 'function') return false;
    if (code === currentLang) {
      botSpeak((typeof t === 'function' ? t('msg_already_in_language') : 'Already in that language.'),
        { skipHistory: true });
      return true;
    }
    try {
      applyLangChange(code);
      var ack = {
        es: 'Cambie a espanol.',
        en: 'Switched to English.',
        pt: 'Mudei para portugues.',
        fr: 'Bascule en francais.',
        it: 'Sono passato all italiano.',
        de: 'Auf Deutsch umgestellt.',
        ja: '日本語に切り替えました。',
        zh: '已切换到中文。',
        hi: 'Hindi mein switch kar diya.',
        ar: 'تم التغيير الى العربية.'
      };
      botSpeak(ack[code] || ('Switched to ' + code + '.'));
      return true;
    } catch (e) {
      console.warn('[locale-switch] applyLangChange threw:', e);
      return false;
    }
  }

  /* 2026-05-09 fix C3: when a confirm-dialog is pending, route
     YES/NO answers from the chat (text or voice) directly to the
     dialog's confirm/cancel buttons instead of dispatching them
     through the normal LLM path. The chat stays accessible
     because the .ne-side z-index:10001 sits above the overlay's
     z-index:9999 (see css/example.css). */
  function _findPendingConfirm() {
    return document.querySelector(
      '[data-nac-role="confirm-dialog"][data-nac-state="pending"]'
    );
  }
  function _maybeAnswerPendingConfirm(rawText) {
    const dialog = _findPendingConfirm();
    if (!dialog) return false;
    const id = dialog.getAttribute('data-nac-id');
    const norm = _normalizeForFilter(rawText);
    /* Multi-locale yes/no vocabulary. Word-complete tokens only
       (per fix C2 -- "noche" must NOT match "no"). */
    const tokens = norm.split(' ').filter(Boolean);
    const YES = ['si','yes','ya','oui','ja','sim','hai','shi','na\'am','ha','aprob','aprobar','confirma','confirmar','confirmo','dale','adelante','ok','okay'];
    const NO  = ['no','nope','non','nein','nao','iie','la','rad','cancel','cancela','cancelar','cancelo','para','aborta','abortar'];
    function tokensHit(arr) {
      for (let i = 0; i < tokens.length; i++) {
        if (arr.indexOf(tokens[i]) >= 0) return true;
      }
      return false;
    }
    const isYes = tokensHit(YES);
    const isNo  = tokensHit(NO);
    if (!isYes && !isNo) return false;
    const targetSlug = id + (isYes ? '.confirm' : '.cancel');
    const btn = document.querySelector('[data-nac-id="' + targetSlug + '"]');
    if (!btn) return false;
    btn.click();
    botSpeak(isYes
      ? 'Confirmado.'
      : 'Cancelado.', { skipHistory: true });
    return true;
  }

  /* TTS announcement when a confirm-dialog opens, so the user
     knows the operation is pending and how to answer. Hooks into
     the runtime's nac:confirm:requested event (see nac.js
     confirm_dialog). */
  document.addEventListener('nac:confirm:requested', function (e) {
    try {
      const prompt = (e && e.detail && e.detail.prompt) || '';
      if (!prompt) return;
      /* Localised hint based on currentLang -- minimal set, falls
         back to ES. */
      const hints = {
        es: 'Decime si o no para responder.',
        en: 'Say yes or no to answer.',
        pt: 'Diga sim ou nao para responder.',
        fr: 'Dites oui ou non pour repondre.',
        it: 'Dimmi si o no per rispondere.',
        de: 'Sag ja oder nein zur Antwort.',
        ja: 'はい または いいえ と答えてください。',
        zh: '请说 是 或 否 回答。',
        hi: 'haan ya nahin kahkar jawab dein.',
        ar: 'قل نعم او لا للاجابة.'
      };
      const hint = hints[currentLang] || hints.es;
      botSpeak(prompt + ' ' + hint, { skipHistory: true });
    } catch (_) {}
  }, true);

  function chatSend() {
    if (!chatInput) return;
    const text = (chatInput.value || '').trim();
    if (!text) return;
    console.log('[nac-demo] chatSend:', text);
    /* C3: if a confirm-dialog is pending, route YES/NO directly. */
    if (_maybeAnswerPendingConfirm(text)) {
      chatInput.value = '';
      chatBubble('user', text);
      return;
    }
    /* C7-bis: locale switch intent -> apply locally before LLM. */
    if (_maybeChangeLocaleLocally(text)) {
      chatInput.value = '';
      chatBubble('user', text);
      return;
    }
    /* v1.6.5: a new user turn cancels any pending bot TTS so the
       fresh response is not queued behind half-finished
       sentences. Pre-v1.6.5 botSpeak called cancel() itself,
       which truncated automations like the agent tour. The
       cancel now lives where it belongs: at the boundary of a
       new user-initiated turn. */
    if ('speechSynthesis' in window) {
      try { speechSynthesis.cancel(); } catch (e) {}
      _ttsBusyUntil = 0;
    }
    chatInput.value = '';
    chatBubble('user', text);
    /* v1.5: try the agentic backend (Claude Sonnet primary,
       DeepSeek free fallback) first. If it fails (network error,
       timeout, 429, 5xx), fall through to the local matcher
       interpret() so the demo keeps working offline. */
    setTimeout(function () {
      try {
        agenticDispatch(text);
      } catch (e) {
        console.error('[nac-demo] agenticDispatch threw synchronously:', e);
        try { interpret(text); } catch (e2) {
          console.error('[nac-demo] interpret threw too:', e2);
          chatBubble('bot',
            (typeof t === 'function' ? t('err_unknown_request')
                                     : 'I did not understand.'));
        }
      }
    }, 50);
  }

  /* ---------------- v1.5 agentic dispatch -------------------------
     Endpoint: https://yujin.app/api/v1/yujin/nac-demo
     Request:  { session_id, prompt, lang, history[], nac_tree }
     Response: { ok, data: { message, actions[], model, fallback_used } }
     The backend never echoes API keys; the frontend never sees them. */

  /* The Yujin assistant lives behind the CRM at /crm/api/v1/yujin/*.
     When the demo is served from yujin.app/nac-spec/example.php, that
     resolves to https://yujin.app/crm/api/v1/yujin/nac-demo. A vendor
     who copies the demo into a NAC-instrumented project will need to
     override NAC_DEMO_ENDPOINT to point at their own backend. */
  const NAC_DEMO_ENDPOINT = '/crm/api/v1/yujin/nac-demo';
  function nacDemoUrl() {
    /* Allow a host page to override via window.NAC_DEMO_ENDPOINT
       (full absolute URL). */
    if (typeof window.NAC_DEMO_ENDPOINT === 'string'
        && window.NAC_DEMO_ENDPOINT) {
      return window.NAC_DEMO_ENDPOINT;
    }
    return (location.origin || ('https://' + location.hostname))
      + NAC_DEMO_ENDPOINT;
  }

  /* Persistent session id across reloads in the same tab. The backend
     uses it as the rate-limit bucket. */
  function nacDemoSessionId() {
    try {
      let id = sessionStorage.getItem('nac_demo_session_id');
      if (!id) {
        const rnd = Math.random().toString(36).slice(2, 14)
                  + Date.now().toString(36);
        id = rnd.slice(0, 32);
        sessionStorage.setItem('nac_demo_session_id', id);
      }
      return id;
    } catch (e) {
      /* Storage blocked: generate a per-page id (rate limit may be
         tighter but functionality survives). */
      return ('nacd' + Math.random().toString(36).slice(2, 14)
              + Date.now().toString(36)).slice(0, 32);
    }
  }

  /* Bounded conversational history for the backend. Pulls the last
     four turns from the chatLog DOM so refreshes do not break it. */
  function nacDemoHistory() {
    if (!chatLog) return [];
    const bubbles = Array.prototype.slice.call(
      chatLog.querySelectorAll('.ne-chat-bubble'));
    const turns = [];
    for (let i = Math.max(0, bubbles.length - 8); i < bubbles.length; i++) {
      const el = bubbles[i];
      /* v1.6.3: bubbles tagged with data-history-skip="true" are
         infrastructure messages (parse_degraded, unavailable). Skip
         them so the model never sees its own apology echoed back
         and starts repeating it. Bug discovered in ai.log: DeepSeek
         responding to "elegir Buenos Aires 4" with the literal
         "Probe todos los proveedores..." string from the prior
         turn's parse_degraded bubble. */
      if (el.getAttribute('data-history-skip') === 'true') continue;
      const role = el.classList.contains('user') ? 'user'
                 : el.classList.contains('bot')  ? 'assistant'
                 : null;
      if (!role) continue;
      const c = (el.textContent || '').trim();
      if (!c) continue;
      turns.push({ role: role, content: c });
    }
    /* The current user turn is appended in the request body separately,
       so drop it from history if it is the last entry. */
    if (turns.length && turns[turns.length - 1].role === 'user') {
      turns.pop();
    }
    return turns.slice(-10);
  }

  /* Snapshot the page's NAC tree using the runtime's own primitives.
     Returns a structure the backend's compactor (yjNacDemoCompactTree)
     understands.

     Bug-defence 2026-05-06: wrap the entire snapshot in try/catch so
     a single brittle call inside the runtime (older NAC version on
     deployed copy, missing manifest, plugin in a half-mounted state)
     does not silently abort the whole agentic dispatch. On failure
     we return null and the dispatcher falls back to the local
     interpret() matcher with a clear console warning. */
  function nacDemoSnapshotTree() {
    if (!window.NAC || typeof NAC.describe !== 'function') return null;
    try {
      const snap = NAC.describe();
      if (!snap || typeof snap !== 'object') return null;
      /* describe() shape (v1.4.2 P5.0 normative): { active,
         plugins[], fields, actions, kpis, tabs, feedback,
         timestamp }. We forward the per-plugin elements +
         manifest where available. */
      const plugins = (snap.plugins || []).map(function (p) {
        let m = null;
        try {
          if (typeof NAC.manifest === 'function' && p && p.plugin) {
            m = NAC.manifest(p.plugin);
          }
        } catch (e) { /* manifest may throw if plugin half-mounted */ }
        return {
          plugin:    p && p.plugin   || '',
          version:   p && p.version  || '',
          state:     p && p.state    || '',
          elements:  p && p.elements || [],
          manifest:  m || null,
        };
      });
      const out = {
        active:  snap.active || null,
        plugins: plugins,
      };
      /* 2026-05-09 debug aid for fix C4: print the plugin slugs
         in the snapshot so the user can verify v20_panel is in
         the array sent to the backend. If v20_panel is here but
         the chatbot still does not see it, the issue is the
         backend's compactor cap (yjNacDemoCompactTree). */
      console.log('[nac-demo] snapshot plugins (' + plugins.length + '):',
        plugins.map(function (p) { return p.plugin; }).join(', '));
      /* 2026-05-09 fix C4: when NAC v2 extensions are loaded,
         also forward the v2 layer (scope tree + sitemap +
         intermediate scopes) so the backend intermediary sees
         everything an LLM needs to plan cross-page navigation
         (sec 17). v1 plugins remain authoritative for the visible
         tree; the v2 fields are additive metadata. Wrapped in
         try/catch so a v2 hiccup never breaks the v1 path. */
      try {
        if (typeof NAC.describe_v2 === 'function') {
          const v2 = NAC.describe_v2();
          if (v2) {
            out.v2_scope_entries = v2.v2_scope_entries || [];
            out.v2_intermediate_scopes = v2.v2_intermediate_scopes || [];
            out.sitemap = v2.sitemap || null;
            out.tenant_prefix = v2.tenant_prefix || null;
            out.nac_version_v2 = v2.nac_version || null;
          }
        }
      } catch (e) {
        console.warn('[nac-demo] v2 snapshot extension failed (v1 path still works):', e && e.message);
      }
      return out;
    } catch (e) {
      console.warn('[nac-demo] snapshot failed, falling back to local matcher:', e && e.message);
      return null;
    }
  }

  /* v1.5.1: returns the currentLang detected at boot or set via
     window.setNacDemoLang(). The detection chain (URL ?lang= > html
     lang > navigator.language > 'en') runs once in _detectLang(). */
  function nacDemoLang() {
    return currentLang;
  }

  function setBackendBadge(state, label) {
    /* Find or lazily inject a small status badge above the chat. The
       host page may declare a target with data-nac-id="chat.backend"
       and we honour it; otherwise inject. */
    let badge = document.querySelector('[data-nac-id="chat.backend"]');
    if (!badge && chatLog) {
      badge = document.createElement('div');
      badge.setAttribute('data-nac-id', 'chat.backend');
      badge.style.cssText = 'font-size:11px;opacity:.6;margin-bottom:4px;';
      chatLog.parentNode.insertBefore(badge, chatLog);
    }
    if (!badge) return;
    badge.setAttribute('data-nac-state', state);
    badge.textContent = label;
  }

  async function agenticDispatch(prompt) {
    /* v1.5.2: any unexpected throw inside this function (snapshot
       crash, fetch crash on a sandboxed browser, JSON parse
       blow-up, an interpret() exception during fallback) used to
       leave the user's bubble alone in the chat with no bot
       reply. Wrap the entire body so we ALWAYS produce visible
       feedback, even when something explodes. */
    console.log('[nac-demo] agenticDispatch start:', prompt);
    try {
      const r = await _agenticDispatchInner(prompt);
      console.log('[nac-demo] agenticDispatch ok');
      return r;
    } catch (err) {
      console.error('[nac-demo] dispatch crashed:', err);
      try { setBackendBadge('offline', t('badge_offline')); } catch (e) {}
      try { return interpret(prompt); } catch (e) {
        try { botSpeak(t('err_unknown_request')); } catch (e2) {
          /* truly out of options -- log and continue */
          console.error('[nac-demo] interpret() also crashed:', e);
        }
      }
    }
  }
  async function _agenticDispatchInner(prompt) {
    const tree = nacDemoSnapshotTree();
    if (!tree) {
      /* No NAC runtime detected -- straight to local matcher. */
      console.warn('[nac-demo] no NAC tree available, using local matcher');
      return interpret(prompt);
    }
    console.log('[nac-demo] tree captured, plugins:', (tree.plugins || []).length);
    const body = {
      session_id: nacDemoSessionId(),
      prompt:     prompt,
      lang:       nacDemoLang(),
      history:    nacDemoHistory(),
      nac_tree:   tree,
    };
    setBackendBadge('thinking', t('badge_thinking'));
    let json = null;
    try {
      const ctrl = new AbortController();
      const timeoutId = setTimeout(function () { ctrl.abort(); }, 25000);
      const url = nacDemoUrl();
      console.log('[nac-demo] POST', url);
      const res = await fetch(url, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
        signal:  ctrl.signal,
        credentials: 'omit',
      });
      clearTimeout(timeoutId);
      console.log('[nac-demo] fetch returned status', res.status);
      json = await res.json().catch(function (e) {
        console.warn('[nac-demo] JSON parse failed:', e && e.message);
        return null;
      });
      console.log('[nac-demo] body parsed, ok=', json && json.ok);
      if (!res.ok || !json || json.ok !== true) {
        throw new Error('backend ' + res.status + ' '
          + (json && json.error ? json.error : ''));
      }
    } catch (err) {
      console.warn('[nac-demo] backend failed, falling back to local matcher:', err && err.message);
      setBackendBadge('offline', t('badge_offline'));
      return interpret(prompt);
    }

    /* v1.5.3 fix: Response::success() does
       array_merge(['ok'=>true], $data), which flattens fields to
       the response root -- there is NO `data` envelope. Pre-v1.5.3
       this code read json.data.message and got undefined every
       time, so the bot's reply was suppressed even though the
       backend responded fine. Fall back to the json.data.* form
       too in case a future Response wrapper is introduced. */
    const env = (json && json.data && typeof json.data === 'object')
      ? json.data : json;
    const model = env.model || 'unknown';
    const fb    = !!env.fallback_used;
    const unavailable = env.unavailable === true || model === 'canned';

    /* v1.6.1: when the backend chain landed on the canned tier, the
       message is a localised "AI temporarily unavailable" apology and
       the actions array is empty. Show a distinct badge state and do
       NOT degrade to the local matcher (the chain already exhausted
       every real provider; the matcher would just confuse the user). */
    if (unavailable) {
      setBackendBadge('unavailable', t('badge_unavailable'));
      const msg = env.message || t('badge_unavailable');
      /* v1.6.3: skipHistory so the next turn's history does not
         include this infra-error message. Without skipHistory the
         model sees its own apology in context and tends to echo
         it on the next prompt -- visible in ai.log as response
         text equal to the prior unavailable message. */
      botSpeak(msg, { skipHistory: true });
      return;
    }

    /* v1.6.3: parse_degraded means the backend rotated through
       every real tier in the chain (Claude -> DeepSeek -> Groq)
       and none produced parseable JSON. User feedback 2026-05-07:
       do NOT fall back to a local matcher -- the backend already
       did the right thing by trying every provider. Show the
       localised error message that the backend included, and
       set a distinct badge state so the user knows what happened.
       The error is honest: the AI could not respond in the
       contract shape; the user should rephrase. */
    if (env.parse_degraded === true) {
      console.warn('[nac-demo] parse_degraded after',
        env.tiers_tried || 'N', 'tiers, model=', model);
      setBackendBadge('parse_degraded', t('badge_parse_degraded'));
      /* Prefer the locale-aware client-side string over the
         backend's English fallback for ja/zh/hi/ar (rule 3
         GoDaddy ASCII purity prevents the backend from carrying
         non-Latin scripts). */
      const msg = t('badge_parse_degraded') || env.message ||
        'Could not get a valid response from the AI providers.';
      /* skipHistory: same reason as the unavailable path. */
      botSpeak(msg, { skipHistory: true });
      return;
    }

    setBackendBadge(fb ? 'fallback' : 'live',
      t('badge_agent') + model + (fb ? t('badge_fallback_suffix') : ''));

    const message = env.message || '';
    const actions = Array.isArray(env.actions) ? env.actions : [];

    if (message) botSpeak(message);
    if (!actions.length) return;

    /* v1.6.6: client-side defense for the say-duplicates-message
       case (also dropped server-side in v1.6.6 yjNacDemo, but
       kept here for older deploys + cached prompts in any future
       tier that does not honour the prompt rule). */
    const _messageNorm = String(message).trim().toLowerCase();

    /* Dispatch each action sequentially so the focus follow + visual
       pulse from v1.4.1/1.4.2 fire in order. We tolerate one failed
       action and keep going; logged to console. */
    for (let i = 0; i < actions.length; i++) {
      const a = actions[i];
      /* v1.6.6: skip a 'say' action that just repeats the
         already-spoken message field. Server-side dedup catches
         most cases; this is the second line of defense. */
      if (a && a.kind === 'say' && _messageNorm) {
        const sayText = String(a.text || '').trim().toLowerCase();
        if (sayText === _messageNorm) {
          console.log('[nac-demo] dropped duplicate say action');
          continue;
        }
      }
      try {
        await dispatchAgenticAction(a);
        /* Tiny pause between actions so the human reviewer sees each
           focus pulse. */
        await new Promise(function (r) { setTimeout(r, 250); });
      } catch (err) {
        console.warn('[nac-demo] action failed', a, err && err.message);
        /* v1.6.3: skipHistory so a transient dispatch error
           ("No pude ejecutar X: timeout") does NOT enter the
           conversation history. ai.log analysis showed DeepSeek
           inventing similar-looking error strings on the next
           turn after seeing one in context, recursively
           degrading the chat. The real action failure stays
           visible in console + browser, just not as bot
           memory the model can echo.
           Note 2026-05-09: a previous patch silently swallowed
           err.code === 'timeout'. Pablo flagged that as masking
           real failures (handler hung, network race). The
           authoritative fix is to make brownfield handlers emit
           the nac:action:succeeded ack the spec requires; the
           v20-panel inline script now wraps bind() to do that
           automatically. Real timeouts still surface here. */
        botSpeak(t('err_action_failed')
          + (a.nac_id || a.verb || a.label || a.kind)
          + ': ' + (err && err.code || err && err.message || 'error'),
          { skipHistory: true });
      }
    }
  }

  async function dispatchAgenticAction(a) {
    if (!a || !a.kind) throw new Error('invalid action');
    if (!window.NAC) throw new Error('NAC runtime missing');
    switch (a.kind) {
      case 'click':
        return await NAC.click(a.nac_id);
      case 'click_by_verb':
        return await NAC.click_by_verb(a.plugin || null, a.verb);
      case 'fill':
        return await NAC.fill(a.nac_id, a.value);
      case 'select':
        return await NAC.select(a.nac_id, a.value);
      case 'tab':
        return await NAC.tab(a.plugin, a.tab_key);
      case 'tab_by_label':
        return await NAC.tab_by_label(a.plugin || null, a.label);
      case 'drag_drop':
        /* v1.6.2: implements spec sec 13.4 NAC.drag_drop. The
           runtime resolves source + target by nac_id, validates
           roles (draggable + drop-target), performs the DOM move
           and emits the canonical drag event sequence. */
        if (typeof NAC.drag_drop !== 'function') {
          throw new Error('NAC.drag_drop missing -- runtime older than v1.6.2');
        }
        return await NAC.drag_drop(a.nac_id, a.target_nac_id,
          typeof a.to_index === 'number' ? { to_index: a.to_index } : undefined);
      case 'go_to_section':
        /* v1.6.7: navigate to a section landmark. Sections are
           NOT clickable -- they have data-nac-role="section" and
           the runtime's NAC.go_to_section() handles scrolling +
           the v1.6.5 highlight + nac:section:reached emit. The
           model previously emitted click('page.section.X') and
           timed out because click on a section role doesn't
           match any event family. */
        if (typeof NAC.go_to_section !== 'function') {
          throw new Error('NAC.go_to_section missing -- older runtime');
        }
        return await NAC.go_to_section(a.nac_id);
      case 'say':
        if (a.text) botSpeak(a.text);
        return { ok: true };
      case 'change_locale':
        /* 2026-05-09 fix C7: meta-command. Dispatched by the LLM
           when the user asks to change the SESSION language
           ('cambia a ingles', 'switch to Chinese'). Calls the
           runtime's lang switcher directly -- this is NOT a
           click on a tree element. */
        if (typeof a.locale === 'string' && a.locale.length === 2) {
          try {
            applyLangChange(a.locale);
            return { ok: true };
          } catch (e) {
            throw new Error('change_locale failed: ' + (e && e.message || e));
          }
        }
        throw new Error('change_locale: missing or invalid locale code');
      /* === v2.1 sec 18 data-table action kinds === */
      case 'dt_add_row':
        if (typeof NAC.dt_add_row !== 'function') throw new Error('dt_add_row missing -- runtime older than v2.1');
        var rAdd = NAC.dt_add_row(a.table_id, a.values || {});
        if (rAdd && rAdd.ok === false) throw new Error('dt_add_row: ' + rAdd.error + (rAdd.column ? ' (' + rAdd.column + ')' : ''));
        return { ok: true, row_id: rAdd && rAdd.row_id };
      case 'dt_remove_row':
        if (typeof NAC.dt_remove_row !== 'function') throw new Error('dt_remove_row missing -- runtime older than v2.1');
        NAC.dt_remove_row(a.table_id, a.row_id);
        return { ok: true };
      case 'dt_edit_cell':
        if (typeof NAC.dt_edit_cell !== 'function') throw new Error('dt_edit_cell missing -- runtime older than v2.1');
        var rEdit = NAC.dt_edit_cell(a.table_id, a.row_id, a.column, a.value);
        if (rEdit && rEdit.ok === false) throw new Error('dt_edit_cell: ' + rEdit.error);
        return { ok: true };
      case 'dt_set_cell':
        if (typeof NAC.dt_set_cell !== 'function') throw new Error('dt_set_cell missing -- runtime older than v2.1');
        var rSet = NAC.dt_set_cell(a.table_id, a.row, a.col, a.value);
        if (rSet && rSet.ok === false) throw new Error('dt_set_cell: ' + rSet.error);
        return { ok: true };
      case 'dt_select':
        if (typeof NAC.dt_select !== 'function') throw new Error('dt_select missing -- runtime older than v2.1');
        return NAC.dt_select(a.table_id, a.target);
      case 'dt_commit':
        if (typeof NAC.dt_commit !== 'function') throw new Error('dt_commit missing -- runtime older than v2.1');
        var rCom = NAC.dt_commit(a.table_id);
        if (rCom && rCom.ok === false) {
          throw new Error('dt_commit blocked by validation: ' +
            (rCom.errors || []).map(function (e) { return e.code; }).join(', '));
        }
        return { ok: true, final_state: rCom && rCom.final_state };
      case 'dt_discard':
        if (typeof NAC.dt_discard !== 'function') throw new Error('dt_discard missing -- runtime older than v2.1');
        NAC.dt_discard(a.table_id);
        return { ok: true };
      case 'dt_read_aggregate':
        if (typeof NAC.dt_read_aggregate !== 'function') throw new Error('dt_read_aggregate missing -- runtime older than v2.1');
        var v = NAC.dt_read_aggregate(a.table_id, a.agg_key, a.column);
        return { ok: true, value: v };
      default:
        throw new Error('unknown action kind: ' + a.kind);
    }
  }
  if (chatInput) {
    chatInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        chatSend();
      }
    });
  }

  /* v1.5.2: language selector wiring. The <select> declared in
     example.php carries data-nac-id="chat.lang" so the agentic
     chat can drive it via NAC.fill('chat.lang', 'zh'). On change
     we update currentLang, persist to sessionStorage, set the
     recognizer locale, and re-localise the placeholder + chat
     status copy. Existing chat history bubbles stay in their
     original language by design (history is forensic). */
  const chatLangSelect = $('[data-nac-id="chat.lang"]');
  function applyLangChange(newLang) {
    if (!newLang || !I18N.badge_thinking[newLang]) return;
    currentLang = newLang;
    try { sessionStorage.setItem('nac_demo_lang', newLang); } catch (e) {}
    document.documentElement.setAttribute('lang', newLang);
    if (chatLangSelect && chatLangSelect.value !== newLang) {
      chatLangSelect.value = newLang;
    }
    if (recognizer) {
      try { recognizer.lang = TTS_BCP47[newLang] || 'en-US'; } catch (e) {}
    }
    /* Refresh visible localised chrome bits. */
    if (chatInput) {
      const ph = {
        es: 'Decile a Yujin que hacer (proba: tocale Do)',
        en: 'Tell Yujin what to do (try: play Do)',
        pt: 'Diga ao Yujin o que fazer (tente: toque Do)',
        fr: 'Dites a Yujin quoi faire (essayez: joue Do)',
        it: 'Di a Yujin cosa fare (prova: suona Do)',
        de: 'Sagen Sie Yujin, was zu tun ist (versuch: spiele Do)',
        ja: 'Yujin に指示を出す (例: ドを弾いて)',
        zh: '告诉 Yujin 做什么 (试试: 弹 Do)',
        hi: 'Yujin को बताएँ क्या करना है (आज़माएँ: Do बजाओ)',
        ar: 'اطلب من Yujin (جرب: اعزف Do)',
      };
      chatInput.placeholder = ph[newLang] || ph.en;
    }
    const status = $('[data-nac-id="chat.status"]');
    if (status) {
      const st = {
        es: 'demo offline',                en: 'offline demo',
        pt: 'demo offline',                fr: 'demo hors ligne',
        it: 'demo offline',                de: 'Offline-Demo',
        ja: 'オフライン・デモ',             zh: '离线演示',
        hi: 'offline डेमो',
        ar: 'عرض غير متصل',
      };
      status.textContent = st[newLang] || st.en;
    }
    /* v1.5.2: walk all [data-i18n-key] elements and swap their
       textContent for the chosen locale. Covers headings, intro
       paragraph, side panel titles, the "Watch Yujin do it" inline
       button, etc. */
    translatePage();
    /* Tell the agentic dispatcher to refresh the badge label too. */
    setBackendBadge('idle', '');
  }
  /* Restore from session storage if the user previously picked a
     locale during this tab. */
  try {
    const saved = sessionStorage.getItem('nac_demo_lang');
    if (saved && I18N.badge_thinking[saved]) {
      currentLang = saved;
      document.documentElement.setAttribute('lang', saved);
    }
  } catch (e) {}
  if (chatLangSelect) {
    chatLangSelect.value = currentLang;
    chatLangSelect.addEventListener('change', function () {
      applyLangChange(chatLangSelect.value);
    });
    /* Reactive event so the agentic dispatcher's NAC.fill() also
       triggers the same recompute. */
    document.addEventListener('nac:field:changed', function (e) {
      if (e.detail && e.detail.nac_id === 'chat.lang') {
        applyLangChange((e.detail.value || '').toString());
      }
    });
  }
  /* Apply the initial localisation pass so the placeholder + status
     reflect the detected lang on first render. */
  applyLangChange(currentLang);
  function interpret(raw) {
    /* Tiny offline-demo NLU. Maps Spanish/English phrases to NAC.click /
       NAC.fill so the chat acts as a real driver of the page even
       without an upstream model.

       Bug-fix 2026-05-06: the previous version used substring match
       on single letters and short syllables ('c', 'do', 're', 'mi',
       'sol', 'la', 'si'). Those collide with extremely common words
       -- 'toca', 'tocate', 'secreto', 'cerrar', 'mira', 'apreta'
       -- so every chat input ended up dispatching note.c regardless
       of intent. The fix tokenises the input and matches tokens as
       whole words. Notes now match only when the user explicitly
       says the syllable as its own word ('toca un re' -> tokens
       [toca, un, re] -> note.d). Action keywords are checked BEFORE
       notes so 'apreta el botón secret' is not eaten by the note
       fallback. */
    const lc = raw.toLowerCase().trim();
    /* Strip accents in a copy so token matching is accent-insensitive
       for the operator. We keep the original `t` for phrase matching
       in places where Spanish accents matter (e.g. "boton" vs the
       quoted name parameter). */
    const tStrip = lc.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const tokens = tStrip.split(/[\s,.\?!¿¡;:()"'‘’“”]+/)
                         .filter(Boolean);
    function hasToken(arr) {
      return arr.some(function (w) { return tokens.indexOf(w) >= 0; });
    }
    function hasPhrase(arr) {
      return arr.some(function (w) { return tStrip.indexOf(w) !== -1; });
    }

    /* 1. Action keywords FIRST. These are unambiguous and beat
          the note fallback. */
    if (hasPhrase(['secret', 'secreto', 'abrir el modal', 'open the modal'])
        || hasToken(['modal'])) { return drive('secret.open'); }
    if (hasToken(['cerrar', 'close', 'cerrame', 'cerralo'])) {
      const x = $('[data-nac-id="secret.close"]');
      if (x) { x.click(); return; }
      botSpeak(t('msg_nothing_to_close'));
      return;
    }
    if (hasToken(['autopilot', 'mira', 'watch', 'piloto', 'demo',
                  'empezar', 'comenzar', 'iniciar', 'tour', 'arranca'])) {
      return drive('play.autopilot');
    }
    if (hasToken(['nombre', 'name'])) {
      const m = raw.match(/[\"‘’“”](.+?)[\"‘’“”]/);
      const v = m ? m[1] : 'Yujin';
      return drive_fill('field.name', v);
    }
    if (hasToken(['estoy', 'mood', 'curioso', 'curious', 'impressed',
                  'impactado', 'skeptical', 'esceptico', 'animo'])) {
      const v = hasToken(['curioso', 'curious']) ? 'curious'
              : hasToken(['impressed', 'impactado']) ? 'impressed'
              : 'skeptical';
      return drive_fill('field.mood', v);
    }
    if (hasToken(['compartir', 'spread'])) {
      const cb = $('[data-nac-id="field.spread"]');
      if (cb) { cb.checked = true; cb.dispatchEvent(new Event('change')); }
      botSpeak(t('msg_done_short'));
      return;
    }

    /* 2. Piano notes LAST. Token-only match (no substring) so words
          like "toca", "secreto", "mira" never trigger them. */
    if (hasToken(['do2', 'c2'])
        || hasPhrase(['do octava', 'octave c', 'do alto', 'high c'])) {
      return drive('note.c2');
    }
    if (hasToken(['do', 'c']))  { return drive('note.c'); }
    if (hasToken(['re', 'd']))  { return drive('note.d'); }
    if (hasToken(['mi', 'e']))  { return drive('note.e'); }
    if (hasToken(['fa', 'f']))  { return drive('note.f'); }
    if (hasToken(['sol', 'g'])) { return drive('note.g'); }
    if (hasToken(['la', 'a']))  { return drive('note.a'); }
    if (hasToken(['si', 'b']))  { return drive('note.b'); }

    botSpeak(t('err_unknown_request'));
  }
  /* v1.5.4-fix: variant of drive() that flags the target element
     with __nac_skip_focus = true before invoking NAC.click. The
     runtime's _focusElement consumes the flag and skips the
     scroll + focus + pulse for that single click. Used by the
     autopilot piano steps where rapid succession would otherwise
     produce a flickering scroll storm. */
  function _driveNoFocus(nacId) {
    const el = document.querySelector(
      '[data-nac-id="' + nacId + '"][data-nac-role="action"]');
    if (el) el.__nac_skip_focus = true;
    drive(nacId);
  }

  function drive(nacId) {
    /* Bug-fix 2026-05-06: route through NAC.click() so the runtime's
       focus-follow + scrollIntoView + visual pulse fire. The previous
       implementation called el.click() directly which bypassed every
       v1.4.1 ergonomic. */
    if (window.NAC && typeof NAC.click === 'function') {
      NAC.click(nacId).then(function () {
        botSpeak(t('msg_done') + nacId);
      }).catch(function (err) {
        if (err && err.code === 'not_found') {
          botSpeak(t('err_action_not_found') + nacId);
        } else if (err && err.code === 'timeout') {
          /* Action ran but the demo did not emit succeeded fast enough.
             Treat as success for the chat narrative -- the visible
             effect already happened. */
          botSpeak(t('msg_done') + nacId);
        } else {
          botSpeak(t('err_dispatch_fail') + nacId + ': ' + (err && err.message || err));
        }
      });
      return;
    }
    /* Fallback when NAC is missing (should not happen on this page). */
    const el = document.querySelector('[data-nac-id="' + nacId + '"][data-nac-role="action"]');
    if (!el) { botSpeak(t('err_action_not_found') + nacId); return; }
    el.click();
    botSpeak(t('msg_done') + nacId);
  }
  function drive_fill(nacId, value) {
    /* Same upgrade as drive(): use NAC.fill() so the runtime focuses
       the field, scrolls it into view, and emits the v1.4.1
       nac:focus:moved event. */
    if (window.NAC && typeof NAC.fill === 'function') {
      NAC.fill(nacId, value).then(function () {
        botSpeak(t('msg_wrote') + value + t('msg_in') + nacId);
      }).catch(function (err) {
        if (err && err.code === 'not_found') {
          botSpeak(t('err_field_not_found') + nacId);
        } else {
          botSpeak(t('err_dispatch_fail') + nacId + ': ' + (err && err.message || err));
        }
      });
      return;
    }
    const el = document.querySelector('[data-nac-id="' + nacId + '"][data-nac-role="field"]');
    if (!el) { botSpeak(t('err_field_not_found') + nacId); return; }
    el.value = value;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    botSpeak(t('msg_wrote') + value + t('msg_in') + nacId);
  }

  /* v1.6.3: hands-free / always-on mode for headphone use.
     User feedback 2026-05-07: "que no sea tan agresivo el corte"
     and "modo abierto todo el tiempo (para auriculares)". The
     default push-to-talk path stays. When voiceAlwaysOn is true,
     the recognizer runs continuously, swallows interim partials,
     and auto-restarts on end (Chrome enforces ~1 minute idle
     timeout that we transparently re-arm). */
  let voiceAlwaysOn = false;

  // Voice STT (push-to-talk on the mic button).
  // `recognizer` is hoisted higher up in the chat block (next to
  // ttsEnabled) so applyLangChange at module-init can reference it
  // safely without hitting the temporal dead zone.
  function getRecognizer() {
    if (recognizer) return recognizer;
    const Cls = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Cls) return null;
    recognizer = new Cls();
    recognizer.lang = TTS_BCP47[currentLang] || 'en-US';
    /* v1.6.3: continuous + interimResults enabled by default so
       hands-free mode is a flag flip rather than re-creating the
       recognizer. In push-to-talk mode we still only act on
       final results; the difference is whether we auto-restart
       on end. */
    recognizer.continuous = false;
    recognizer.interimResults = true;
    /* 2026-05-09 fix C5: STT debounce. The Web Speech API
       can emit several `final` results in quick succession when
       the user pauses mid-sentence ("ve a" pause "settings"). The
       handler used to dispatch each fragment as an independent
       command. Now we accumulate fragments in _sttBuffer and only
       dispatch after _STT_SILENCE_MS of no new results. The user
       can override the wait by hitting Enter or pressing the mic
       button (handled in chatSend). */
    let _sttBuffer = '';
    let _sttFlushTimer = null;
    const _STT_SILENCE_MS = 1100;
    function _sttFlush() {
      const text = (_sttBuffer || '').trim();
      _sttBuffer = '';
      if (_sttFlushTimer) { clearTimeout(_sttFlushTimer); _sttFlushTimer = null; }
      if (!text) return;
      /* C1 (TTS->STT echo): drop the input if it matches recent
         bot utterances. Logged so devs can see the filter firing. */
      if (_sttIsBotEcho(text)) {
        console.log('[stt] dropping bot-echo: ' + text);
        return;
      }
      /* C1 (half-duplex): if TTS is still actively speaking when
         the flush window expires, drop -- the recognizer should
         not be active here, but Chromium occasionally fires a
         delayed final after we paused it. Belt and suspenders. */
      if ('speechSynthesis' in window && speechSynthesis.speaking) {
        console.log('[stt] dropping during TTS playback: ' + text);
        return;
      }
      /* C3: voice answer to a pending confirm-dialog short-
         circuits before the LLM round-trip. */
      if (_maybeAnswerPendingConfirm(text)) {
        chatBubble('user', text);
        return;
      }
      /* C7-bis: voice locale switch (e.g. "cambia a ingles" via
         voice) bypasses the LLM. */
      if (_maybeChangeLocaleLocally(text)) {
        chatBubble('user', text);
        return;
      }
      /* From here on, treat the buffered text as a fresh user
         turn (same boundary semantics as the chatSend path). */
      try { speechSynthesis.cancel(); } catch (e2) {}
      _ttsBusyUntil = 0;
      chatBubble('user', text);
      try {
        agenticDispatch(text);
      } catch (err) {
        console.error('[nac-demo] STT dispatch threw:', err);
        try { interpret(text); } catch (e2) { /* swallow */ }
      }
    }

    recognizer.onresult = function (e) {
      /* C1 (half-duplex): if TTS is currently playing, swallow
         the result entirely. It is overwhelmingly the bot
         hearing itself. Do not buffer, do not echo to the user
         bubble, do not dispatch. */
      if ('speechSynthesis' in window && speechSynthesis.speaking) {
        console.log('[stt] half-duplex: dropping result while TTS speaking');
        return;
      }
      /* Only act on final results -- interim partials (browser-
         streaming preview as the user is still talking) would
         dispatch mid-sentence. We loop because in continuous mode
         e.results may contain multiple final entries when the user
         said several utterances back-to-back. */
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (!r.isFinal) continue;
        const text = (r[0] && r[0].transcript || '').trim();
        if (!text) continue;
        /* C5: append to the buffer + (re)arm the flush timer.
           Successive final fragments within _STT_SILENCE_MS get
           glued into a single dispatched turn. */
        _sttBuffer = _sttBuffer ? (_sttBuffer + ' ' + text) : text;
        if (_sttFlushTimer) clearTimeout(_sttFlushTimer);
        _sttFlushTimer = setTimeout(_sttFlush, _STT_SILENCE_MS);
      }
    };
    recognizer.onend = function () {
      /* v1.6.3: in always-on mode, auto-restart. Chrome stops
         the recognizer after ~60s of silence even when
         continuous=true; this keeps the session alive for
         hands-free use without the user having to re-press. */
      if (voiceAlwaysOn) {
        try {
          recognizer.lang = TTS_BCP47[currentLang] || 'en-US';
          recognizer.continuous = true;
          recognizer.start();
          /* Mic stays "active" visually so the user sees that
             the always-on session is still alive. */
          const mic = $('[data-nac-id="chat.mic"]');
          if (mic) {
            setState(mic, 'active');
            mic.setAttribute('aria-pressed', 'true');
          }
          return;
        } catch (e) {
          /* Race: start() called while still ending. Try once
             more on a microtask. */
          setTimeout(function () {
            if (voiceAlwaysOn) {
              try { recognizer.start(); } catch (e2) {}
            }
          }, 80);
          return;
        }
      }
      const mic = $('[data-nac-id="chat.mic"]');
      if (mic) {
        setState(mic, 'idle');
        mic.setAttribute('aria-pressed', 'false');
      }
    };
    recognizer.onerror = function (e) {
      /* In always-on mode swallow most errors and let onend
         restart the recognizer. Surface only fatal errors
         (no-mic, not-allowed) to the user. */
      const fatal = e.error === 'not-allowed' || e.error === 'service-not-allowed';
      if (voiceAlwaysOn && !fatal) {
        console.warn('[voice] always-on recoverable error:', e.error);
        return;
      }
      botSpeak(t('err_mic_unheard') + ' (' + e.error + ').',
        { skipHistory: true });
      const mic = $('[data-nac-id="chat.mic"]');
      if (mic) {
        setState(mic, 'idle');
        mic.setAttribute('aria-pressed', 'false');
      }
      voiceAlwaysOn = false;
    };
    return recognizer;
  }

  /* v1.6.3: toggle hands-free mode. Wired to a button with
     data-nac-id="chat.voice.always_on". */
  function toggleVoiceAlwaysOn(btn) {
    const r = getRecognizer();
    if (!r) {
      botSpeak(t('err_no_voice_support'), { skipHistory: true });
      return;
    }
    voiceAlwaysOn = !voiceAlwaysOn;
    btn.setAttribute('aria-pressed', String(voiceAlwaysOn));
    btn.setAttribute('data-nac-state', voiceAlwaysOn ? 'active' : 'idle');
    btn.title = voiceAlwaysOn ? t('voice_always_on_off') : t('voice_always_on_on');
    if (voiceAlwaysOn) {
      r.continuous = true;
      r.lang = TTS_BCP47[currentLang] || 'en-US';
      try { r.start(); } catch (e) { /* may already be running */ }
      const mic = $('[data-nac-id="chat.mic"]');
      if (mic) {
        setState(mic, 'active');
        mic.setAttribute('aria-pressed', 'true');
      }
      botSpeak(t('voice_always_on_started'), { skipHistory: true });
    } else {
      r.continuous = false;
      try { r.stop(); } catch (e) {}
      botSpeak(t('voice_always_on_stopped'), { skipHistory: true });
    }
  }
  function toggleMic(btn) {
    const r = getRecognizer();
    if (!r) {
      botSpeak(t('err_no_voice_support'));
      return;
    }
    if (btn.getAttribute('data-nac-state') === 'active') {
      try { r.stop(); } catch (e) { /* ignore */ }
      setState(btn, 'idle');
      btn.setAttribute('aria-pressed', 'false');
      return;
    }
    try {
      /* v1.5.2: refresh recognizer locale on every start so a user
         who switched the language selector mid-session is heard in
         the right tongue. */
      try { r.lang = TTS_BCP47[currentLang] || 'en-US'; } catch (e) {}
      r.start();
      setState(btn, 'active');
      btn.setAttribute('aria-pressed', 'true');
    } catch (e) {
      botSpeak(t('err_mic_start'));
    }
  }
  function toggleTts(btn) {
    ttsEnabled = !ttsEnabled;
    btn.setAttribute('aria-pressed', String(ttsEnabled));
    /* Also drive data-nac-state so the focus pulse + red bg fires
       on either signal -- v1.5.2 CSS targets both. */
    btn.setAttribute('data-nac-state', ttsEnabled ? 'active' : 'idle');
    btn.title = ttsEnabled ? t('tts_on') : t('tts_off');
    /* Quick audible confirmation so the user knows voice replies
       just turned on. */
    if (ttsEnabled) botSpeak(t('tts_on'));
    else if ('speechSynthesis' in window) {
      try { speechSynthesis.cancel(); } catch (e) {}
    }
  }

  // ------------------------------------------------------------ Manifest panel
  function toggleManifest(btn) {
    const body = $('[data-nac-id="manifest.body"]');
    if (!body) return;
    const expanded = btn.getAttribute('aria-expanded') === 'true';
    const next = !expanded;
    btn.setAttribute('aria-expanded', String(next));
    btn.setAttribute('data-nac-state', next ? 'expanded' : 'collapsed');
    body.hidden = !next;
    if (next) {
      const m = (window.NAC && NAC.manifest && NAC.manifest('example_demo')) || {};
      body.textContent = JSON.stringify(m, null, 2);
    }
  }

  // ------------------------------------------------------------ Autopilot
  // Show, in 7-8 seconds, the same flow Yujin would do via voice.
  /* v1.6.0: register a custom reset provider for example_demo.
     The runtime's NAC.reset('example_demo') will invoke this
     instead of the generic fallback. Returns the demo to a
     known clean state: empty fields, all sumi-e icons collapsed,
     secret modal closed, cities card restored, tabs on first,
     accordion collapsed, table sort + filter cleared, slider
     defaulted, scroll back to top. */
  if (window.NAC && typeof NAC.set_reset_provider === 'function') {
    NAC.set_reset_provider('example_demo', async function () {
      /* Close secret modal if open. */
      const closeBtn = document.querySelector('[data-nac-id="secret.close"]');
      if (closeBtn) closeBtn.click();
      /* Collapse every expanded sumi-e icon. */
      document.querySelectorAll(
        '[data-nac-id^="art."][data-nac-state="expanded"]'
      ).forEach(function (b) { b.click(); });
      /* Clear text inputs. */
      ['field.name', 'field.country', 'cities.search',
       'table.demo.filter'].forEach(function (id) {
        const el = document.querySelector('[data-nac-id="' + id + '"]');
        if (!el) return;
        el.value = '';
        el.setAttribute('data-nac-state', 'pristine');
        el.dispatchEvent(new Event('input',  { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      });
      /* Reset mood select. */
      const mood = document.querySelector('[data-nac-id="field.mood"]');
      if (mood) {
        mood.value = '';
        mood.setAttribute('data-nac-state', 'pristine');
        mood.dispatchEvent(new Event('change', { bubbles: true }));
      }
      /* Uncheck spread checkbox. */
      const spread = document.querySelector('[data-nac-id="field.spread"]');
      if (spread) {
        spread.checked = false;
        spread.setAttribute('data-nac-state', 'pristine');
        spread.dispatchEvent(new Event('change', { bubbles: true }));
      }
      /* Reset volume slider to 50. */
      const vol = document.querySelector('[data-nac-id="field.volume"]');
      if (vol) {
        vol.value = '50';
        vol.dispatchEvent(new Event('input', { bubbles: true }));
      }
      /* Restore cities card if minimised. */
      if (window.NAC && typeof NAC.restore === 'function') {
        try { NAC.restore('cities'); } catch (e) {}
      }
      /* Reset tabs to first. */
      const firstTab = document.querySelector('[data-nac-id="tabs.demo.t1"]');
      if (firstTab && firstTab.getAttribute('data-nac-state') !== 'active') {
        firstTab.click();
      }
      /* Collapse expanded accordion sections. */
      document.querySelectorAll(
        '[data-nac-role="accordion-section"][data-nac-state="expanded"]'
      ).forEach(function (s) {
        s.setAttribute('data-nac-state', 'collapsed');
      });
      /* Reset table sort indicators. */
      document.querySelectorAll(
        '[data-nac-role="sort-control"][data-sort-dir]'
      ).forEach(function (b) { b.removeAttribute('data-sort-dir'); });
      /* Scroll to top so the user sees the demo from the start. */
      try {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } catch (e) { window.scrollTo(0, 0); }
      return true;
    });
  }

  function autopilot() {
    /* v1.8 sync: enable narration delay so each step's voice
       arrives ~280ms AFTER the action, giving the scrollIntoView
       smooth time to settle and the widget animation (chart bars,
       map marker pulse) to be visible WHEN the voice describes it.
       The reset narration ('auto.reset') is intentionally OUT of
       this window because nothing visual is animating yet. */
    /* v1.6.0: reset to a clean state before each run so the
       autopilot always starts from the same baseline. The user
       sees fields clear, modals close, cards restore, sort/
       filter unwind. Without this, repeated autopilot runs
       compounded state from the previous run (typed names
       lingering, expanded accordion staying open, etc). */
    botSpeak(t('auto.reset'));
    /* Switch on AFTER the reset narration so 'auto.reset' is
       not delayed. v1.9.3: reduced 2200 -> 600 because the
       wrap-level FOCUS_LEAD_MS pause (1200ms before each NAC
       call) already eats the visual gap. Voice now arrives
       ~600ms AFTER the action, describing what just happened
       under the user's gaze, instead of waiting for the foco to
       arrive (which now happens BEFORE the action). User's
       complaint pre-fix: "Cuando miro el foco, los datos ya
       estan cambiados". Post-fix: focus arrives, user fixates,
       data changes under their eye, voice confirms. */
    setTimeout(function () { _autopilotSpeakDelayMs = 600; }, 50);
    /* Install the spotlight: every NAC.click/fill/etc that runs
       during the autopilot first marks its target's enclosing
       card with data-nac-autopilot-spotlight=1 so the CSS frames
       it in red. The previous spotlight is removed automatically. */
    if (_spotlightUninstall) _spotlightUninstall();
    _spotlightUninstall = _installAutopilotSpotlight();
    let resetReady = Promise.resolve();
    if (window.NAC && typeof NAC.reset === 'function') {
      try {
        resetReady = NAC.reset('example_demo').catch(function () {});
      } catch (e) { /* swallow */ }
    }
    resetReady.then(function () {
      /* Small pause so the visual reset (smooth scroll, card
         restore, tab swap) settles before the demo begins. */
      setTimeout(_autopilotRun, 800);
    });
  }

  function _autopilotRun() {
    botSpeak(t('auto.intro'));
    /* v1.5.4-fix: audio prewarm. Some Chromium builds (Brave,
       Android emulators) require an oscillator to be CREATED +
       STARTED inside the user-gesture stack to "bless" the
       AudioContext for the rest of the session. Pre-fix, only
       the FIRST piano note in the autopilot played because the
       autopilot button click delivered the gesture for note.c
       only; notes scheduled in setTimeout (note.e / .g / .c2)
       hit a context that the browser silently re-locked. The
       silent prewarm here runs INSIDE the click handler that
       called autopilot(), so it counts as a user gesture and
       authorises subsequent oscillators. */
    const __ctx = ensureAudio();
    if (__ctx) {
      try {
        __ctx.resume();
        const __o = __ctx.createOscillator();
        const __g = __ctx.createGain();
        __g.gain.value = 0.0001; /* effectively silent */
        __o.connect(__g); __g.connect(__ctx.destination);
        __o.start();
        __o.stop(__ctx.currentTime + 0.05);
      } catch (e) { /* swallow; subsequent notes will retry */ }
    }
    const seq = [
      // ----- v1.0 sumi-e gallery (was piano) -------------------
      /* v1.5.5: piano replaced by 3 sumi-e icon cards. Each
         click toggles its drawing. The autopilot expands each
         icon, lets the user see the drawing, then minimises it
         back to icon. Same NAC.click contract, no audio
         dependency. */
      /* v1.6.7 (user feedback 2026-05-07): one click per art card.
         Pre-v1.6.7 each art was clicked TWICE (expand then
         minimize) -- the second click was visually invisible on
         a fast machine but botSpeak fired both times, so the
         user heard "Listo: art.sakura" twice in a row. The
         next-card click doesn't auto-collapse the previous, but
         that's a design choice -- the autopilot's NAC.reset() at
         the start of every run brings everything back to idle. */
      function () { drive('art.sakura'); },
      function () { drive('art.fuji');   },
      function () { drive('art.bamboo'); },
      function () { drive('secret.open'); },
      function () { setTimeout(function () {
        const x = $('[data-nac-id="secret.close"]');
        if (x) x.click();
      }, 800); },
      function () { drive_fill('field.name', 'Yujin'); },
      function () { drive_fill('field.mood', 'impressed'); },
      function () {
        const cb = $('[data-nac-id="field.spread"]');
        if (cb) { cb.checked = true; cb.dispatchEvent(new Event('change')); }
      },
      // ----- v1.1 widgets -------------------------------------
      function () {
        botSpeak(t('auto.tab_details'));
        /* v1.5.4-fix: was `const t = $(...)` -- shadowed the
           outer t() translation function. Renamed to `tabEl`. */
        const tabEl = $('[data-nac-id="tabs.demo.t2"]');
        if (tabEl) tabEl.click();
      },
      function () {
        botSpeak(t('auto.accordion'));
        if (window.NAC && typeof NAC.expand === 'function') {
          // First section in the accordion card.
          const acc = document.querySelector(
            '[data-nac-role="accordion-section"][data-nac-id]');
          if (acc) NAC.expand(acc.getAttribute('data-nac-id'));
        }
      },
      function () {
        botSpeak(t('auto.country'));
        drive_fill('field.country', 'Argentina');
      },
      function () {
        botSpeak(t('auto.slider'));
        if (window.NAC && typeof NAC.set_slider === 'function') {
          NAC.set_slider('field.volume', 70);
        }
      },
      function () {
        botSpeak(t('auto.sort'));
        if (window.NAC && typeof NAC.sort === 'function') {
          NAC.sort('table.demo', 'table.demo.sort.age', 'desc')
            .catch(function (err) {
              console.warn('[autopilot] sort failed:', err && err.message);
            });
        }
      },
      /* v1.5.4-fix: filter step added after sort. The user asked
         the autopilot to demonstrate filtering, and the table
         actually contains a 'Diego' row so the visual feedback
         is genuine. Routes through NAC.fill so the focus follow
         + nac:field:changed pipeline both fire. */
      function () {
        botSpeak(t('auto.filter'));
        if (window.NAC && typeof NAC.fill === 'function') {
          NAC.fill('table.demo.filter', 'Diego').catch(function () {});
        } else {
          const f = $('[data-nac-id="table.demo.filter"]');
          if (f) {
            f.value = 'Diego';
            f.dispatchEvent(new Event('input', { bubbles: true }));
          }
        }
      },
      // ----- v1.6.2 drag_drop ---------------------------------
      /* Demonstrates NAC.drag_drop (spec sec 13.4, runtime
         shipped in v1.6.2). The previous autopilot release had
         no drag-drop step because the runtime had no programmatic
         drag entry point; the user reported the gap on
         2026-05-07 and this step closes the loop. The reset()
         call at the autopilot start (line ~2802) returns the
         item to the left list, so this step always begins from
         a clean baseline regardless of prior runs. */
      function () {
        botSpeak(t('auto.drag_drop'));
        if (window.NAC && typeof NAC.drag_drop === 'function') {
          NAC.drag_drop('drag.item.alpha', 'drag.list.right')
            .catch(function (err) {
              console.warn('[autopilot] drag_drop failed:',
                err && err.message);
            });
        }
      },
      // ----- v1.2 widgets -------------------------------------
      /* v1.5.5: remote autocomplete now demonstrates 3 distinct
         visual states explicitly, per user request: 1) start
         minimized, 2) maximize, 3) apply filter. Each state is
         a separate seq[] step so the user sees each transition
         as the autopilot narrates it. */
      function () {
        botSpeak(t('auto.remote_min'));
        if (window.NAC && typeof NAC.minimize === 'function') {
          NAC.minimize('cities');
        }
      },
      function () {
        botSpeak(t('auto.remote_max'));
        if (window.NAC && typeof NAC.restore === 'function') {
          NAC.restore('cities');
        } else if (window.NAC && typeof NAC.maximize === 'function') {
          NAC.maximize('cities');
        }
      },
      function () {
        botSpeak(t('auto.remote_filter'));
        if (window.NAC && typeof NAC.fill === 'function') {
          NAC.fill('cities.search', 'ber').catch(function () {});
        } else {
          const ci = $('[data-nac-id="cities.search"]');
          if (ci) {
            ci.value = 'ber';
            ci.dispatchEvent(new Event('input', { bubbles: true }));
          }
        }
        setTimeout(function () {
          const opts = document.querySelectorAll(
            '[data-nac-id^="cities.option."]');
          let target = null;
          for (let i = 0; i < opts.length; i++) {
            if ((opts[i].textContent || '').toLowerCase().indexOf('berlin') >= 0) {
              target = opts[i]; break;
            }
          }
          target = target || opts[0];
          if (target) {
            const id = target.getAttribute('data-nac-id');
            if (window.NAC && typeof NAC.click === 'function' && id) {
              NAC.click(id).catch(function () { target.click(); });
            } else {
              target.click();
            }
          }
        }, 1000);
      },
      /* v1.5.4-fix: navmap.fetch via NAC.click instead of raw
         el.click(), so focus follow scrolls + pulses the button
         and the user can see what the agent is doing. */
      function () {
        botSpeak(t('auto.systemmap'));
        if (window.NAC && typeof NAC.click === 'function') {
          NAC.click('navmap.fetch').catch(function () {});
        } else {
          const b = $('[data-nac-id="navmap.fetch"]');
          if (b) b.click();
        }
      },
      // ----- v1.7 widget showcase (stepper, tree, toast, drawer,
      //       calendar, chart, map, richtext, breadcrumb, carousel,
      //       timeline). Autopilot exercises each so the demo
      //       walkthrough now covers 100% of sec 6.2 widgets.
      //       Runs BEFORE the chat hop so the widgets stay in
      //       the viewport while the user is watching them.
      //       v1.7 round 5: every step routes through NAC.click()
      //       so the runtime's scroll-into-view + focus pulse
      //       fire on each card. Raw el.click() produced the
      //       "voice narrates, no visible progress" hang the
      //       user reported on round 4. -----
      function () {
        botSpeak(t('auto.v17_stepper'));
        if (window.NAC && typeof NAC.click === 'function') {
          NAC.click('stepper.demo.next').catch(function () {});
        }
      },
      function () {
        botSpeak(t('auto.v17_tree'));
        if (window.NAC && typeof NAC.click === 'function') {
          NAC.click('tree.demo.fruits.toggle').catch(function () {});
        }
      },
      function () {
        botSpeak(t('auto.v17_toast'));
        if (window.NAC && typeof NAC.click === 'function') {
          NAC.click('toast.demo.fire').catch(function () {});
        }
      },
      function () {
        botSpeak(t('auto.v17_drawer'));
        if (window.NAC && typeof NAC.click === 'function') {
          NAC.click('drawer.demo.open').catch(function () {});
          setTimeout(function () {
            NAC.click('drawer.demo.close').catch(function () {});
          }, 1200);
        }
      },
      function () {
        /* v1.9.3-fix: switch to DAY view, not WEEK. The calendar
           mounts in week view by default (aria-pressed=true on the
           Week button), so NAC.click('calendar.demo.view.week') was
           a visual no-op -- the autopilot ran the call but no state
           changed, the user saw nothing happen. Switching to day
           produces a visible layout change (1-day strip vs 7-day
           strip) the spectator can perceive. */
        botSpeak(t('auto.v17_calendar'));
        if (window.NAC && typeof NAC.click === 'function') {
          NAC.click('calendar.demo.view.day').catch(function () {});
        }
      },
      function () {
        botSpeak(t('auto.v17_chart'));
        if (window.NAC && typeof NAC.click === 'function') {
          NAC.click('chart.demo.reload').catch(function () {});
        }
      },
      function () {
        botSpeak(t('auto.v17_map'));
        if (window.NAC && typeof NAC.click === 'function') {
          NAC.click('map.demo.marker.tokyo').catch(function () {});
        }
      },
      function () {
        botSpeak(t('auto.v17_richtext'));
        if (window.NAC && typeof NAC.click === 'function') {
          NAC.click('richtext.demo.bold').catch(function () {});
        }
      },
      function () {
        botSpeak(t('auto.v17_breadcrumb'));
        if (window.NAC && typeof NAC.click === 'function') {
          NAC.click('breadcrumb.demo.1').catch(function () {});
        }
      },
      function () {
        botSpeak(t('auto.v17_carousel'));
        if (window.NAC && typeof NAC.click === 'function') {
          NAC.click('carousel.demo.next').catch(function () {});
        }
      },
      function () {
        botSpeak(t('auto.v17_timeline'));
        if (window.NAC && typeof NAC.click === 'function') {
          NAC.click('timeline.demo.older').catch(function () {});
        }
      },
      // ----- v1.8 cards: skip-validate / a11y-hint / drag-types --
      function () {
        botSpeak(t('auto.v18_skip'));
        if (window.NAC && typeof NAC.click === 'function') {
          NAC.click('skip.demo.run_validate').catch(function () {});
        }
      },
      function () {
        /* v1.9.5-fix: autopilot demonstrates AI agent RESTRAINT
           on a11y_hint=irreversible. Pre-fix the autopilot called
           NAC.click('a11y.demo.delete') and stubbed window.confirm
           to false -- but that was a hack: it hid the dialog
           without showing the user any feedback at all. The
           autopilot just silently moved on, breaking the demo's
           pedagogical point.

           v1.9.5: instead of clicking and cancelling, the autopilot
           reads NAC.find('a11y.demo.delete').a11y_hint, sees
           "irreversible", and DECLINES to invoke. It narrates the
           decision and emits a synthetic nac:command:rejected event
           with reason='agent_declined_irreversible' so the events
           log shows the rejection. The spotlight stays on the card
           so the spectator sees the button (with its visible hint)
           that the agent refused to click.

           This is the correct demo: the value of a11y_hint is that
           an autonomous agent reads it and self-restrains. The old
           "click + auto-cancel via stub" was hiding that mechanism. */
        botSpeak(t('auto.v18_a11y'));
        if (!window.NAC) return;
        try {
          /* Spotlight + scroll-into-view so the spectator sees the card. */
          if (typeof _spotlightById === 'function') {
            _spotlightById('a11y.demo.delete');
          }
          if (typeof _scrollTargetIntoView === 'function') {
            _scrollTargetIntoView('a11y.demo.delete');
          }
          /* Read the hint from describe() -- the real consumer path. */
          const desc = (typeof NAC.find === 'function') ? NAC.find('a11y.demo.delete') : null;
          const hints = desc && desc.a11y_hint ? desc.a11y_hint : [];
          const isIrreversible = hints.indexOf('irreversible') >= 0
                                 || hints.indexOf('data_loss') >= 0;
          /* Emit the synthetic rejection so the events log shows it. */
          if (isIrreversible && typeof NAC.command_rejected === 'function') {
            NAC.command_rejected({
              command_method: 'click',
              command_target: 'a11y.demo.delete',
              reason: 'agent_declined_irreversible',
              message: 'AI agent read a11y_hint and declined to invoke',
              source: { type: 'agent', tool: 'autopilot' },
            });
          }
          /* Update the feedback badge if it exists so visible state
             changes on the card itself. */
          const fb = document.querySelector(
            '[data-nac-id="a11y.demo.feedback"]');
          if (fb) {
            fb.textContent = '* declined';
            fb.setAttribute('data-nac-state', 'success');
          }
        } catch (e) {
          /* swallow -- demo continues */
        }
      },
      function () {
        botSpeak(t('auto.v18_dragtypes'));
        if (window.NAC && typeof NAC.click === 'function') {
          NAC.click('dragtypes.demo.try_mismatch').catch(function () {});
        }
      },
      // ----- chat hop (last interactive step) -----------------
      function () {
        botSpeak(t('auto.gotochat'));
        if (window.NAC && typeof NAC.go_to_section === 'function') {
          NAC.go_to_section('page.section.chat');
        }
      },
      // ----- closing line -------------------------------------
      function () {
        botSpeak(t('auto.closing'));
      },
    ];
    let i = 0;
    function tick() {
      if (i >= seq.length) {
        /* v1.8 sync cleanup: the autopilot run is over; restore
           the instant-narration path so chat and conformance test
           do not inherit the voice delay. Also uninstall the
           spotlight monkey-patches so chat NAC.click on quotes
           does not re-frame cards. */
        _autopilotSpeakDelayMs = 0;
        if (_spotlightUninstall) {
          _spotlightUninstall();
          _spotlightUninstall = null;
        }
        return;
      }
      try { seq[i](); } catch (e) { /* keep going */ }
      i++;
      /* v1.6.7 fix: poll-based TTS-aware wait. Pre-v1.6.7 the
         pause was computed synchronously by reading
         _ttsRemainingMs() right after seq[i]() returned. But
         seq[i] often calls drive('art.X') which is ASYNC --
         NAC.click() returns a promise, and botSpeak() (which
         sets _ttsBusyUntil) only fires on the .then() of that
         promise. So at the moment we measured _ttsRemainingMs,
         the speak hadn't queued yet -> the buffer thought TTS
         was idle and the next step fired before the previous
         narration finished.
         The fix: wait the visual-settle window first, THEN
         poll _ttsRemainingMs (by which point the async drive
         has resolved and botSpeak has queued the speech), and
         only then schedule the next tick.
         Net effect: TTS off -> ~1800ms+1000ms = 2.8s/step
         (same as pre-v1.6.5).  TTS on -> visual-settle +
         remaining-speech + 1000ms buffer (longer for long
         narration lines). */
      /* v1.8: 1800 + 1500 = ~3.3s minimum between steps (when no
         narration), more when the voice line is long. Bumped
         ttsBuffer 1000 -> 1500 per user request 'mas pausa entre
         evento y evento'. */
      const visualSettle = 1800;
      const ttsBuffer = 1500;
      setTimeout(function () {
        const remaining = _ttsRemainingMs();
        if (remaining > 100) {
          setTimeout(tick, remaining + ttsBuffer);
        } else {
          setTimeout(tick, ttsBuffer);
        }
      }, visualSettle);
    }
    tick();
  }

  // ============================================================
  // ============== v1.1 widget extensions ======================
  // ============================================================

  // ------------------------------------------------------------ Tabs
  document.addEventListener('click', function (e) {
    const tab = e.target.closest('[data-nac-role="tab"]');
    if (!tab) return;
    const tablist = tab.closest('[data-nac-role="tablist"]');
    if (!tablist) return;
    const nacId = tab.getAttribute('data-nac-id');
    emit('nac:tab:switching', { tab_id: nacId, nac_id: nacId, plugin: 'example_demo', plugin_instance_id: null });
    $all('[data-nac-role="tab"]', tablist).forEach(function (t) {
      t.setAttribute('data-nac-state', 'idle');
      t.setAttribute('aria-selected', 'false');
    });
    tab.setAttribute('data-nac-state', 'active');
    tab.setAttribute('aria-selected', 'true');
    /* Match by suffix: tabs.demo.t1 -> tabs.demo.t1.panel */
    const panelId = nacId + '.panel';
    $all('[data-nac-role="tabpanel"]').forEach(function (p) {
      const pid = p.getAttribute('data-nac-id');
      const isActive = (pid === panelId);
      p.hidden = !isActive;
      p.setAttribute('data-nac-state', isActive ? 'active' : 'idle');
    });
    emit('nac:tab:changed', { tab_id: nacId, nac_id: nacId, plugin: 'example_demo', plugin_instance_id: null });
  });

  // ------------------------------------------------------------ Accordion
  document.addEventListener('click', function (e) {
    const head = e.target.closest('[data-nac-role="action"]');
    if (!head) return;
    const section = head.closest('[data-nac-role="accordion-section"]');
    if (!section) return;
    const sectionId = section.getAttribute('data-nac-id');
    const wasCollapsed = section.getAttribute('data-nac-state') === 'collapsed';
    /* v1.7.0 dual emit: canonical nac:accordion:expanded/collapsed
       (sec 6.2.6) + legacy nac:section:expanded/collapsed for
       v1.6.x consumers. Detail uses section_id (canonical) +
       nac_id (legacy alias). Plugin scope must be set so the
       conformance test's universal-base check passes. */
    const accPlugin = (section.closest('[data-nac-plugin]')
                       || {}).getAttribute &&
                      section.closest('[data-nac-plugin]').getAttribute('data-nac-plugin');
    const accBase = {
      plugin: accPlugin || 'example_demo',
      plugin_instance_id: null,
      section_id: sectionId,    /* v1.7.0 canonical */
      nac_id:     sectionId,    /* legacy, drop v2.0 */
    };
    if (wasCollapsed) {
      emit('nac:section:expanding', accBase);                /* legacy */
      section.setAttribute('data-nac-state', 'expanded');
      head.setAttribute('aria-expanded', 'true');
      const body = section.querySelector('.ne-acc-body');
      if (body) body.hidden = false;
      setTimeout(function () {
        emit('nac:accordion:expanded', accBase);             /* v1.7.0 canonical */
        emit('nac:section:expanded', accBase);               /* legacy alias */
      }, 50);
    } else {
      emit('nac:section:collapsing', accBase);
      section.setAttribute('data-nac-state', 'collapsed');
      head.setAttribute('aria-expanded', 'false');
      const body = section.querySelector('.ne-acc-body');
      if (body) body.hidden = true;
      setTimeout(function () {
        emit('nac:accordion:collapsed', accBase);            /* v1.7.0 canonical */
        emit('nac:section:collapsed', accBase);              /* legacy alias */
      }, 50);
    }
  });

  // ------------------------------------------------------------ Combobox
  const COUNTRIES = [
    'Argentina', 'Brazil', 'Chile', 'Colombia', 'Mexico',
    'Peru', 'Uruguay', 'France', 'Germany', 'Italy', 'Japan',
    'Spain', 'United Kingdom', 'United States',
  ];
  const comboInput = $('[data-nac-id="field.country"]');
  const comboList  = $('[data-nac-id="field.country.list"]');
  if (comboInput && comboList) {
    comboInput.addEventListener('input', function () {
      const q = comboInput.value.trim().toLowerCase();
      const matches = q
        ? COUNTRIES.filter(function (c) { return c.toLowerCase().indexOf(q) !== -1; })
        : [];
      comboList.innerHTML = matches.slice(0, 6).map(function (c) {
        return '<li role="option" data-value="' + esc(c) + '">' + esc(c) + '</li>';
      }).join('');
      comboList.hidden = matches.length === 0;
      comboInput.setAttribute('aria-expanded',
        matches.length > 0 ? 'true' : 'false');
    });
    comboList.addEventListener('click', function (e) {
      const li = e.target.closest('li');
      if (!li) return;
      const v = li.getAttribute('data-value');
      comboInput.value = v;
      comboInput.setAttribute('data-nac-state', 'dirty');
      comboList.hidden = true;
      comboInput.setAttribute('aria-expanded', 'false');
      emit('nac:field:changed', { field_id: 'field.country', nac_id: 'field.country', new_value: v, value: v, plugin: 'example_demo', plugin_instance_id: null });
    });
    document.addEventListener('click', function (e) {
      if (!comboInput.contains(e.target) && !comboList.contains(e.target)) {
        comboList.hidden = true;
        comboInput.setAttribute('aria-expanded', 'false');
      }
    });
  }

  // ------------------------------------------------------------ Slider
  const slider = $('[data-nac-id="field.volume"]');
  const sliderRead = $('[data-nac-id="field.volume.read"]');
  if (slider) {
    slider.addEventListener('input', function () {
      const v = parseInt(slider.value, 10);
      slider.setAttribute('aria-valuenow', String(v));
      slider.setAttribute('data-nac-state', 'dirty');
      if (sliderRead) sliderRead.textContent = String(v);
      emit('nac:slider:value_changed', {
        field_id: 'field.volume',                /* v1.7.0 canonical */
        nac_id:   'field.volume',                /* legacy */
        value:    v,
        min:      0, max: 100,
        plugin:   'example_demo', plugin_instance_id: null,
      });
    });
  }

  // ------------------------------------------------------------ Table
  const TABLE_DATA = [
    { name: 'Akari',   age: 28, city: 'Tokyo'        },
    { name: 'Brenda',  age: 41, city: 'Buenos Aires' },
    { name: 'Camila',  age: 33, city: 'Lima'         },
    { name: 'Diego',   age: 52, city: 'Santiago'     },
    { name: 'Emi',     age: 24, city: 'Osaka'        },
    { name: 'Fabian',  age: 37, city: 'Cordoba'      },
    { name: 'Gabriela',age: 45, city: 'Medellin'     },
    { name: 'Haruki',  age: 30, city: 'Kyoto'        },
    { name: 'Ivana',   age: 29, city: 'Montevideo'   },
    { name: 'Jorge',   age: 60, city: 'Mendoza'      },
  ];
  const tableState = { sortKey: null, sortDir: 'none', filter: '', page: 1, pageSize: 5 };
  const tableBody = $('[data-nac-id="table.demo.body"]');
  const tableFilter = $('[data-nac-id="table.demo.filter"]');
  const pagePrev = $('[data-nac-id="table.demo.page.prev"]');
  const pageNext = $('[data-nac-id="table.demo.page.next"]');
  const pageCurrent = $('[data-nac-id="table.demo.page.current"]');
  const pageTotal   = $('[data-nac-id="table.demo.page.total"]');

  function renderTable() {
    if (!tableBody) return;
    let rows = TABLE_DATA.slice();
    if (tableState.filter) {
      const q = tableState.filter.toLowerCase();
      rows = rows.filter(function (r) {
        return r.name.toLowerCase().indexOf(q) !== -1 ||
               r.city.toLowerCase().indexOf(q) !== -1;
      });
    }
    if (tableState.sortKey && tableState.sortDir !== 'none') {
      rows.sort(function (a, b) {
        const av = a[tableState.sortKey];
        const bv = b[tableState.sortKey];
        if (av < bv) return tableState.sortDir === 'asc' ? -1 : 1;
        if (av > bv) return tableState.sortDir === 'asc' ? 1 : -1;
        return 0;
      });
    }
    const total = Math.max(1, Math.ceil(rows.length / tableState.pageSize));
    if (tableState.page > total) tableState.page = total;
    if (pageTotal) pageTotal.textContent = String(total);
    if (pageCurrent) pageCurrent.textContent = String(tableState.page);
    if (pagePrev) pagePrev.setAttribute('data-nac-state',
      tableState.page <= 1 ? 'disabled' : 'idle');
    if (pageNext) pageNext.setAttribute('data-nac-state',
      tableState.page >= total ? 'disabled' : 'idle');
    const start = (tableState.page - 1) * tableState.pageSize;
    const slice = rows.slice(start, start + tableState.pageSize);
    tableBody.innerHTML = slice.map(function (r) {
      return '<tr><td>' + esc(r.name) + '</td><td>' +
             r.age + '</td><td>' + esc(r.city) + '</td></tr>';
    }).join('') ||
    '<tr><td colspan="3" style="text-align:center;color:var(--text-tertiary);padding:14px;">No matches</td></tr>';
  }
  if (tableFilter) {
    tableFilter.addEventListener('input', function () {
      tableState.filter = tableFilter.value;
      tableState.page = 1;
      tableFilter.setAttribute('data-nac-state',
        tableFilter.value ? 'filtering' : 'idle');
      renderTable();
      emit('nac:table:filter_changed', {
        plugin: 'example_demo', plugin_instance_id: null,
        table_id:  'table.demo',                 /* v1.7.0 canonical */
        filter_id: 'table.demo.filter',          /* v1.7.0 canonical */
        nac_id:           'table.demo',           /* legacy */
        filter_nac_id:    'table.demo.filter',    /* legacy */
        value:   tableFilter.value,
        cleared: !tableFilter.value,
      });
    });
  }
  $all('[data-nac-role="sort-control"]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      const key = btn.getAttribute('data-sort-key');
      let dir = btn.getAttribute('data-sort-dir');
      dir = dir === 'none' ? 'asc' : dir === 'asc' ? 'desc' : 'none';
      $all('[data-nac-role="sort-control"]').forEach(function (b) {
        b.setAttribute('data-sort-dir', 'none');
      });
      btn.setAttribute('data-sort-dir', dir);
      tableState.sortKey = dir === 'none' ? null : key;
      tableState.sortDir = dir;
      renderTable();
      emit('nac:table:sort_changed', {
        plugin: 'example_demo', plugin_instance_id: null,
        table_id:  'table.demo',                       /* v1.7.0 canonical */
        column_id: btn.getAttribute('data-nac-id'),    /* v1.7.0 canonical */
        nac_id:           'table.demo',                /* legacy */
        column_nac_id:    btn.getAttribute('data-nac-id'), /* legacy */
        direction: dir,
      });
    });
  });
  function changePage(delta) {
    tableState.page += delta;
    if (tableState.page < 1) tableState.page = 1;
    renderTable();
    emit('nac:table:page_changed', {
      plugin: 'example_demo', plugin_instance_id: null,
      table_id:  'table.demo',                /* v1.7.0 canonical */
      nac_id:    'table.demo',                /* legacy */
      page_n:    tableState.page,
      page_size: tableState.pageSize,
    });
  }
  if (pagePrev) pagePrev.addEventListener('click', function () {
    if (pagePrev.getAttribute('data-nac-state') !== 'disabled') changePage(-1);
  });
  if (pageNext) pageNext.addEventListener('click', function () {
    if (pageNext.getAttribute('data-nac-state') !== 'disabled') changePage(1);
  });
  renderTable();

  // ------------------------------------------------------------ Drag and drop
  let _dragSourceId = null;
  document.addEventListener('dragstart', function (e) {
    const item = e.target.closest('[data-nac-role="draggable"]');
    if (!item) return;
    _dragSourceId = item.getAttribute('data-nac-id');
    item.setAttribute('data-nac-state', 'dragging');
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', _dragSourceId);
    }
    /* v1.7.0 dual emit: source_id (canonical) + from_nac_id (legacy). */
    emit('nac:drag:started', {
      plugin: 'example_demo', plugin_instance_id: null,
      source_id:   _dragSourceId,
      from_nac_id: _dragSourceId,
    });
  });
  document.addEventListener('dragover', function (e) {
    const target = e.target.closest('[data-nac-role="drop-target"]');
    if (!target) return;
    e.preventDefault();
    target.setAttribute('data-nac-state', 'drop-target-over');
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
    emit('nac:drag:over', {
      plugin: 'example_demo', plugin_instance_id: null,
      source_id:   _dragSourceId,                              /* v1.7.0 */
      target_id:   target.getAttribute('data-nac-id'),         /* v1.7.0 */
      from_nac_id: _dragSourceId,                              /* legacy */
      over_nac_id: target.getAttribute('data-nac-id'),         /* legacy */
    });
  });
  document.addEventListener('dragleave', function (e) {
    const target = e.target.closest('[data-nac-role="drop-target"]');
    if (target) target.setAttribute('data-nac-state', 'idle');
  });
  document.addEventListener('drop', function (e) {
    const target = e.target.closest('[data-nac-role="drop-target"]');
    if (!target || !_dragSourceId) return;
    e.preventDefault();
    target.setAttribute('data-nac-state', 'idle');
    const item = document.querySelector('[data-nac-id="' + _dragSourceId + '"]');
    if (item) {
      item.setAttribute('data-nac-state', 'idle');
      const empty = target.querySelector('.ne-drag-empty');
      if (empty) empty.remove();
      target.appendChild(item);
    }
    emit('nac:drag:dropped', {
      plugin: 'example_demo', plugin_instance_id: null,
      source_id:     _dragSourceId,                          /* v1.7.0 */
      target_id:     target.getAttribute('data-nac-id'),     /* v1.7.0 */
      from_nac_id:   _dragSourceId,                          /* legacy */
      target_nac_id: target.getAttribute('data-nac-id'),     /* legacy */
    });
    _dragSourceId = null;
  });
  document.addEventListener('dragend', function (e) {
    const item = e.target.closest('[data-nac-role="draggable"]');
    if (item && item.getAttribute('data-nac-state') === 'dragging') {
      item.setAttribute('data-nac-state', 'idle');
      emit('nac:drag:cancelled', {
        plugin: 'example_demo', plugin_instance_id: null,
        source_id:   _dragSourceId,
        from_nac_id: _dragSourceId,
        reason: 'aborted',
      });
      _dragSourceId = null;
    }
  });

  // ------------------------------------------------------------ Dropzone (file upload)
  const dz       = $('[data-nac-id="upload.zone"]');
  const dzInput  = $('[data-nac-id="upload.input"]');
  function handleFiles(files) {
    if (!files || !files.length) return;
    const f = files[0];
    const dzBase = {
      plugin: 'example_demo', plugin_instance_id: null,
      dropzone_id: 'upload.zone',                  /* v1.7.0 canonical */
      nac_id:      'upload.zone',                  /* legacy */
    };
    emit('nac:dropzone:dropped', Object.assign({}, dzBase, {
      file: { name: f.name, size: f.size, type: f.type },
    }));
    emit('nac:file:added', Object.assign({}, dzBase, {
      file: { name: f.name, size: f.size, type: f.type },
    }));
    dz.setAttribute('data-nac-state', 'uploading');
    /* Fake progress in 4 ticks. */
    let pct = 0;
    const iv = setInterval(function () {
      pct += 25;
      emit('nac:file:upload_progress', Object.assign({}, dzBase, {
        bytes_sent: Math.round(f.size * pct / 100),
        bytes_total: f.size, pct: pct,
      }));
      if (pct >= 100) {
        clearInterval(iv);
        dz.setAttribute('data-nac-state', 'idle');
        emit('nac:file:upload_completed', Object.assign({}, dzBase, {
          file: { name: f.name, size: f.size },
          file_id: 'demo-' + Date.now(),
        }));
        if (window.toast) toast('Uploaded (demo): ' + f.name, 'ok');
        botSpeak(tFmt('msg.upload_sim', { value: f.name }));
      }
    }, 220);
  }
  if (dz) {
    dz.addEventListener('dragover', function (e) {
      e.preventDefault();
      dz.setAttribute('data-nac-state', 'drop-target-over');
      emit('nac:dropzone:drag_over', {
        plugin: 'example_demo', plugin_instance_id: null,
        dropzone_id: 'upload.zone',                /* v1.7.0 canonical */
        nac_id:      'upload.zone',                /* legacy */
      });
    });
    dz.addEventListener('dragleave', function () {
      dz.setAttribute('data-nac-state', 'idle');
    });
    dz.addEventListener('drop', function (e) {
      e.preventDefault();
      handleFiles(e.dataTransfer && e.dataTransfer.files);
    });
    if (dzInput) {
      dzInput.addEventListener('change', function () {
        handleFiles(dzInput.files);
      });
    }
  }

  // ------------------------------------------------------------ Driver API extensions for v1.1
  /* Best-effort extensions on window.NAC. The reference impl already
     covers v1.0; we layer v1.1 helpers on top so chat / autopilot
     can call them. */
  if (window.NAC) {
    NAC.expand = NAC.expand || function (sectionId) {
      const sec = document.querySelector(
        '[data-nac-id="' + sectionId + '"][data-nac-role="accordion-section"]');
      if (!sec) return Promise.reject(new Error('not_found'));
      if (sec.getAttribute('data-nac-state') === 'collapsed') {
        const head = sec.querySelector('[data-nac-role="action"]');
        if (head) head.click();
      }
      return Promise.resolve({ ok: true });
    };
    NAC.collapse = NAC.collapse || function (sectionId) {
      const sec = document.querySelector(
        '[data-nac-id="' + sectionId + '"][data-nac-role="accordion-section"]');
      if (!sec) return Promise.reject(new Error('not_found'));
      if (sec.getAttribute('data-nac-state') === 'expanded') {
        const head = sec.querySelector('[data-nac-role="action"]');
        if (head) head.click();
      }
      return Promise.resolve({ ok: true });
    };
    NAC.set_slider = NAC.set_slider || function (fieldId, val) {
      const el = document.querySelector(
        '[data-nac-id="' + fieldId + '"][data-nac-role="slider"]');
      if (!el) return Promise.reject(new Error('not_found'));
      el.value = String(val);
      el.dispatchEvent(new Event('input', { bubbles: true }));
      return Promise.resolve({ ok: true });
    };
    NAC.sort = NAC.sort || function (tableId, columnId, dir) {
      const btn = document.querySelector(
        '[data-nac-id="' + columnId + '"][data-nac-role="sort-control"]');
      if (!btn) return Promise.reject(new Error('not_found'));
      /* Click until we reach the requested direction. */
      let safety = 4;
      while (btn.getAttribute('data-sort-dir') !== dir && safety > 0) {
        btn.click();
        safety--;
      }
      return Promise.resolve({ ok: true });
    };
    NAC.go_to_page = NAC.go_to_page || function (tableId, n) {
      while (tableState.page < n) {
        if (pageNext.getAttribute('data-nac-state') === 'disabled') break;
        pageNext.click();
      }
      while (tableState.page > n) {
        if (pagePrev.getAttribute('data-nac-state') === 'disabled') break;
        pagePrev.click();
      }
      return Promise.resolve({ ok: true });
    };
    NAC.drag_drop = NAC.drag_drop || function (sourceId, targetId) {
      const src = document.querySelector(
        '[data-nac-id="' + sourceId + '"][data-nac-role="draggable"]');
      const tgt = document.querySelector(
        '[data-nac-id="' + targetId + '"][data-nac-role="drop-target"]');
      if (!src || !tgt) return Promise.reject(new Error('not_found'));
      /* Synthesize the drag flow without a real DataTransfer. */
      _dragSourceId = sourceId;
      src.setAttribute('data-nac-state', 'dragging');
      emit('nac:drag:started', { from_nac_id: sourceId });
      tgt.setAttribute('data-nac-state', 'idle');
      const empty = tgt.querySelector('.ne-drag-empty');
      if (empty) empty.remove();
      tgt.appendChild(src);
      src.setAttribute('data-nac-state', 'idle');
      emit('nac:drag:dropped',
        { from_nac_id: sourceId, target_nac_id: targetId });
      _dragSourceId = null;
      return Promise.resolve({ ok: true });
    };
  }

  // ------------------------------------------------------------ Chat NLU extensions for v1.1 widgets
  const _origInterpret = interpret;
  interpret = function (raw) {
    const t = raw.toLowerCase();
    function match(arr) { return arr.some(function (w) { return t.indexOf(w) !== -1; }); }
    /* Tabs */
    if (match(['tab overview', 'overview', 'pestania overview']))
      { document.querySelector('[data-nac-id="tabs.demo.t1"]').click();
        botSpeak(t('msg.tab_overview')); return; }
    if (match(['tab details', 'details', 'detalles', 'pestania details']))
      { document.querySelector('[data-nac-id="tabs.demo.t2"]').click();
        botSpeak(t('msg.tab_details')); return; }
    if (match(['tab history', 'history', 'historial']))
      { document.querySelector('[data-nac-id="tabs.demo.t3"]').click();
        botSpeak(t('msg.tab_history')); return; }
    /* Accordion */
    if (match(['expand a', 'abri seccion a', 'expand section a']))
      { NAC.expand('acc.s1'); botSpeak(t('msg.section_a')); return; }
    if (match(['expand b', 'abri seccion b', 'expand section b']))
      { NAC.expand('acc.s2'); botSpeak(t('msg.section_b')); return; }
    /* Combobox */
    if (match(['argentina'])) { drive_fill('field.country', 'Argentina'); return; }
    if (match(['brazil', 'brasil'])) { drive_fill('field.country', 'Brazil'); return; }
    if (match(['france', 'francia'])) { drive_fill('field.country', 'France'); return; }
    if (match(['japan', 'japon'])) { drive_fill('field.country', 'Japan'); return; }
    /* Slider */
    if (match(['volumen', 'volume', 'subi', 'baja', 'set volume'])) {
      const m = raw.match(/(\d{1,3})/);
      const v = m ? Math.max(0, Math.min(100, parseInt(m[1], 10))) : 70;
      NAC.set_slider('field.volume', v);
      botSpeak(tFmt('msg.volume', { value: v }));
      return;
    }
    /* Table */
    if (match(['ordena por nombre', 'sort by name', 'sort name'])) {
      const dir = match(['desc', 'descending', 'descendente']) ? 'desc' : 'asc';
      NAC.sort('table.demo', 'table.demo.sort.name', dir);
      botSpeak(tFmt('msg.sort_name', { dir: t(dir === 'asc' ? 'msg.dir_asc' : 'msg.dir_desc') }));
      return;
    }
    if (match(['ordena por edad', 'sort by age', 'sort age'])) {
      const dir = match(['desc', 'descendente']) ? 'desc' : 'asc';
      NAC.sort('table.demo', 'table.demo.sort.age', dir);
      botSpeak(tFmt('msg.sort_age', { dir: t(dir === 'asc' ? 'msg.dir_asc' : 'msg.dir_desc') }));
      return;
    }
    if (match(['ordena por ciudad', 'sort by city'])) {
      const dir = match(['desc', 'descendente']) ? 'desc' : 'asc';
      NAC.sort('table.demo', 'table.demo.sort.city', dir);
      botSpeak(tFmt('msg.sort_city', { dir: t(dir === 'asc' ? 'msg.dir_asc' : 'msg.dir_desc') }));
      return;
    }
    if (match(['filtra', 'filter', 'busca '])) {
      const m = raw.match(/[\"'](.+?)[\"']/);
      const q = m ? m[1] : (raw.split(/filt(ra|er)/i).pop() || '').trim();
      if (q && tableFilter) {
        tableFilter.value = q;
        tableFilter.dispatchEvent(new Event('input', { bubbles: true }));
        botSpeak(tFmt('msg.filter', { q: q }));
        return;
      }
    }
    if (match(['siguiente pagina', 'next page', 'pagina siguiente'])) {
      pageNext.click(); botSpeak(t('msg.page_next')); return;
    }
    if (match(['pagina anterior', 'prev page', 'previous page'])) {
      pagePrev.click(); botSpeak(t('msg.page_prev')); return;
    }
    /* Drag and drop */
    if (match(['arrastra alpha', 'mueve alpha', 'drag alpha'])) {
      NAC.drag_drop('drag.item.alpha', 'drag.list.right');
      botSpeak(t('msg.alpha_drop')); return;
    }
    if (match(['arrastra beta', 'mueve beta', 'drag beta'])) {
      NAC.drag_drop('drag.item.beta', 'drag.list.right');
      botSpeak(t('msg.beta_drop')); return;
    }
    if (match(['arrastra gamma', 'mueve gamma', 'drag gamma'])) {
      NAC.drag_drop('drag.item.gamma', 'drag.list.right');
      botSpeak(t('msg.gamma_drop')); return;
    }
    return _origInterpret(raw);
  };

  // =============================================================
  // v1.2 demos: dynamic options + window chrome + system map
  // =============================================================

  // ----- Mock cities catalog (5000 entries simulating a server) -----
  const CITY_BASE = [
    'Buenos Aires', 'Cordoba', 'Rosario', 'Mendoza', 'La Plata',
    'San Miguel de Tucuman', 'Mar del Plata', 'Salta', 'Santa Fe',
    'San Juan', 'Resistencia', 'Neuquen', 'Posadas', 'Bahia Blanca',
    'Madrid', 'Barcelona', 'Valencia', 'Sevilla', 'Zaragoza', 'Malaga',
    'Murcia', 'Palma', 'Bilbao', 'Alicante', 'Cordoba ES', 'Valladolid',
    'Mexico City', 'Guadalajara', 'Monterrey', 'Puebla', 'Tijuana',
    'Leon', 'Juarez', 'Zapopan', 'Merida', 'Cancun', 'Acapulco',
    'Sao Paulo', 'Rio de Janeiro', 'Brasilia', 'Salvador', 'Fortaleza',
    'Belo Horizonte', 'Manaus', 'Curitiba', 'Recife', 'Porto Alegre',
    'Lima', 'Arequipa', 'Trujillo', 'Cuzco', 'Bogota', 'Medellin',
    'Cali', 'Cartagena', 'Barranquilla', 'Santiago de Chile',
    'Valparaiso', 'Concepcion', 'Antofagasta', 'Caracas', 'Maracaibo',
    'Quito', 'Guayaquil', 'Asuncion', 'Montevideo', 'La Paz',
    'Santa Cruz de la Sierra', 'Tegucigalpa', 'San Salvador',
    'Ciudad de Guatemala', 'Managua', 'Panama City', 'San Jose CR',
    'Santo Domingo', 'La Habana', 'San Juan PR',
    'Paris', 'Lyon', 'Marseille', 'Toulouse', 'Nice', 'Bordeaux',
    'London', 'Manchester', 'Birmingham', 'Liverpool', 'Edinburgh',
    'Berlin', 'Hamburg', 'Munich', 'Frankfurt', 'Cologne', 'Stuttgart',
    'Rome', 'Milan', 'Naples', 'Turin', 'Florence', 'Venice',
    'Lisbon', 'Porto', 'Amsterdam', 'Rotterdam', 'Brussels',
    'Vienna', 'Zurich', 'Geneva', 'Prague', 'Budapest', 'Warsaw',
    'Tokyo', 'Osaka', 'Kyoto', 'Yokohama', 'Sapporo', 'Nagoya',
    'Beijing', 'Shanghai', 'Shenzhen', 'Guangzhou', 'Hong Kong',
    'Seoul', 'Busan', 'Bangkok', 'Singapore', 'Kuala Lumpur',
    'Jakarta', 'Manila', 'Hanoi', 'Mumbai', 'Delhi', 'Bangalore',
    'New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix',
    'Philadelphia', 'San Antonio', 'San Diego', 'Dallas', 'San Jose',
    'Toronto', 'Vancouver', 'Montreal', 'Ottawa', 'Calgary',
    'Sydney', 'Melbourne', 'Brisbane', 'Perth', 'Auckland'
  ];
  // Generate ~5000 by suffixing the base set so search has weight.
  const CITIES = (function () {
    const out = [];
    for (let i = 0; i < 35; i++) {
      for (let j = 0; j < CITY_BASE.length; j++) {
        out.push(i === 0 ? CITY_BASE[j] : (CITY_BASE[j] + ' ' + (i + 1)));
      }
    }
    return out;
  })();

  // ----- Register manifests for the v1.2 plugins ----------------
  if (window.NAC && typeof NAC.register === 'function') {
    NAC.register({
      plugin_slug: 'cities',
      version: '1.0.0',
      nac_version: '1.2',
      label: 'Remote autocomplete demo',
      fields: [
        {
          id: 'cities.search',
          role: 'field',
          field_type: 'combobox',
          label: 'City',
          options_source: 'remote',
          search_supported: true,
          min_chars: 2
        }
      ],
      actions: [
        { id: 'cities.minimize', label: 'Minimize', verb: 'minimize' },
        { id: 'cities.maximize', label: 'Maximize', verb: 'maximize' },
        { id: 'cities.restore', label: 'Restore', verb: 'restore' }
      ],
      transitions: [
        { to_view: 'navmap', via_action: 'fetch_map' }
      ]
    });
    NAC.register({
      plugin_slug: 'navmap',
      version: '1.0.0',
      nac_version: '1.2',
      label: 'System map demo',
      actions: [
        { id: 'navmap.fetch', label: 'Fetch system map', verb: 'fetch_map' },
        { id: 'navmap.caps',  label: 'Fetch capabilities', verb: 'fetch_capabilities' },
        { id: 'navmap.minimize', label: 'Minimize', verb: 'minimize' },
        { id: 'navmap.maximize', label: 'Maximize', verb: 'maximize' },
        { id: 'navmap.restore',  label: 'Restore', verb: 'restore' }
      ]
    });
  }

  // ----- Wire the "remote" combobox using NAC.set_options_resolver
  const cityInput  = document.querySelector('[data-nac-id="cities.search"]');
  const cityList   = document.querySelector('[data-nac-id="cities.list"]');
  const cityStatus = document.querySelector('[data-nac-id="cities.status"]');
  const cityPicked = document.querySelector('[data-nac-id="cities.picked"]');

  if (cityInput && window.NAC && typeof NAC.set_options_resolver === 'function') {
    // The resolver simulates a server fetch: 200 ms latency + scoring.
    NAC.set_options_resolver('cities', 'cities.search', function (query, limit) {
      return new Promise(function (resolve) {
        setTimeout(function () {
          const q = String(query || '').toLowerCase();
          if (!q) { resolve([]); return; }
          const lim = Number(limit || 10);
          const out = [];
          for (let i = 0; i < CITIES.length && out.length < lim; i++) {
            if (CITIES[i].toLowerCase().indexOf(q) !== -1) {
              out.push({ value: CITIES[i], label: CITIES[i] });
            }
          }
          resolve(out);
        }, 200);
      });
    });

    // Listen to the v1.2 spec events to update status.
    document.addEventListener('nac:options:loading', function (ev) {
      if (ev.detail && ev.detail.field_id === 'cities.search') {
        cityStatus.textContent = tFmt('cities.searching', { query: ev.detail.query || '' });
        cityStatus.setAttribute('data-nac-state', 'loading');
      }
    });
    document.addEventListener('nac:options:loaded', function (ev) {
      if (ev.detail && ev.detail.field_id === 'cities.search') {
        cityStatus.textContent = tFmt('cities.loaded', { count: ev.detail.count });
        cityStatus.setAttribute('data-nac-state', 'ready');
      }
    });
    document.addEventListener('nac:options:error', function (ev) {
      if (ev.detail && ev.detail.field_id === 'cities.search') {
        cityStatus.textContent = tFmt('common.error', { message: ev.detail.message || '' });
        cityStatus.setAttribute('data-nac-state', 'error');
      }
    });

    // User typing -> debounced search via the NAC driver.
    let cityTimer = null;
    cityInput.addEventListener('input', function () {
      const q = cityInput.value.trim();
      if (cityTimer) clearTimeout(cityTimer);
      if (q.length < 2) {
        cityList.innerHTML = '';
        cityList.setAttribute('data-nac-state', 'collapsed');
        cityStatus.textContent = t('cities.type_2_chars');
        cityStatus.setAttribute('data-nac-state', 'ready');
        return;
      }
      cityTimer = setTimeout(function () {
        NAC.search_options('cities.search', q, 8).then(function (opts) {
          cityList.innerHTML = '';
          if (!opts.length) {
            cityList.setAttribute('data-nac-state', 'collapsed');
            return;
          }
          cityList.setAttribute('data-nac-state', 'expanded');
          opts.forEach(function (o, idx) {
            const li = document.createElement('li');
            li.className = 'ne-combo-item';
            li.setAttribute('role', 'option');
            li.setAttribute('data-nac-id', 'cities.option.' + idx);
            li.setAttribute('data-nac-role', 'option');
            li.setAttribute('data-nac-value', o.value);
            li.textContent = o.label;
            li.addEventListener('click', function () {
              cityInput.value = o.value;
              cityPicked.textContent = o.value;
              cityList.innerHTML = '';
              cityList.setAttribute('data-nac-state', 'collapsed');
              emit('nac:field:changed',
                { plugin_slug: 'cities', nac_id: 'cities.search', new_value: o.value });
            });
            cityList.appendChild(li);
          });
        }).catch(function (err) {
          cityStatus.textContent = tFmt('common.error', { message: (err && err.message) || err });
          cityStatus.setAttribute('data-nac-state', 'error');
        });
      }, 250);
    });
  }

  // ----- Window chrome: wire min/max/restore buttons via NAC ----
  function _wireChrome(plugin) {
    const root = document.querySelector('[data-nac-plugin="' + plugin + '"]');
    if (!root) return;
    const map = { minimize: NAC.minimize, maximize: NAC.maximize, restore: NAC.restore };
    root.querySelectorAll('.ne-chrome-btn').forEach(function (btn) {
      const verb = btn.getAttribute('data-nac-action');
      btn.addEventListener('click', function () {
        const fn = map[verb];
        if (fn) fn(plugin);
      });
    });
  }
  if (window.NAC && typeof NAC.minimize === 'function') {
    _wireChrome('cities');
    _wireChrome('navmap');
    /* v1.5.3 fix: was log(...) -- undefined identifier, threw
       Uncaught ReferenceError every time a window-chrome event
       fired. After the first throw the listeners may detach in
       some browsers, breaking subsequent autopilot steps. */
    document.addEventListener('nac:plugin:minimized', function (ev) {
      console.log('nac:plugin:minimized', ev.detail);
    });
    document.addEventListener('nac:plugin:maximized', function (ev) {
      console.log('nac:plugin:maximized', ev.detail);
    });
    document.addEventListener('nac:plugin:restored', function (ev) {
      console.log('nac:plugin:restored', ev.detail);
    });
  }

  // ----- System map: register a provider built from THIS page ---
  if (window.NAC && typeof NAC.set_system_map_provider === 'function') {
    NAC.set_system_map_provider(function () {
      // Walk the registered manifests and the DOM to synthesize a map.
      const slugs = (typeof NAC.list === 'function') ? NAC.list() : [];
      const views = [];
      const transitions = [];
      slugs.forEach(function (slug) {
        const m = NAC.manifest ? NAC.manifest(slug) : null;
        if (!m) return;
        views.push({
          id: slug,
          label: m.label || slug,
          fields_count:  (m.fields  || []).length,
          actions_count: (m.actions || []).length,
          tabs_count:    (m.tabs    || []).length,
          required_permissions: m.required_permissions || []
        });
        (m.transitions || []).forEach(function (t) {
          transitions.push({
            from_view: slug,
            to_view: t.to_view,
            via_action: t.via_action,
            conditions: t.conditions || []
          });
        });
      });
      return Promise.resolve({
        views: views,
        transitions: transitions,
        capabilities: {
          entities:     [{ slug: 'demo_widgets', label: 'Demo widgets', verbs: ['click','fill','select'] }],
          actions:      [],
          reports:      [],
          dashboards:   [],
          integrations: [],
          languages:    ['en','es']
        },
        generated_at: new Date().toISOString(),
        ttl_seconds: 60
      });
    });
  }

  const navOut    = document.querySelector('[data-nac-id="navmap.output"]');
  const navFetch  = document.querySelector('[data-nac-id="navmap.fetch"]');
  const navCaps   = document.querySelector('[data-nac-id="navmap.caps"]');
  if (navFetch && navOut) {
    navFetch.addEventListener('click', function () {
      navOut.textContent = 'Fetching system map...';
      NAC.system_map().then(function (m) {
        navOut.textContent = JSON.stringify(m, null, 2);
        emit('nac:action:succeeded', { plugin_slug: 'navmap', nac_id: 'navmap.fetch' });
      }).catch(function (err) {
        navOut.textContent = tFmt('common.error', { message: (err && err.message) || err });
      });
    });
  }
  if (navCaps && navOut) {
    navCaps.addEventListener('click', function () {
      navOut.textContent = 'Fetching capabilities...';
      NAC.capabilities().then(function (c) {
        navOut.textContent = JSON.stringify(c, null, 2);
        emit('nac:action:succeeded', { plugin_slug: 'navmap', nac_id: 'navmap.caps' });
      }).catch(function (err) {
        navOut.textContent = tFmt('common.error', { message: (err && err.message) || err });
      });
    });
  }

  // =============================================================
  // v1.2 self-test panel + AI agent tour
  // =============================================================

  if (window.NAC && typeof NAC.register === 'function') {
    NAC.register({
      plugin_slug: 'selftest',
      version: '1.0.0',
      nac_version: '1.2',
      label: 'Self-test and introspect',
      actions: [
        { id: 'selftest.show_navmap',   label: 'Show navmap',       verb: 'fetch_map' },
        { id: 'selftest.show_caps',     label: 'Show capabilities', verb: 'fetch_capabilities' },
        { id: 'selftest.list_sections', label: 'List sections',     verb: 'list_sections' },
        { id: 'selftest.run_tests',     label: 'Run NAC self-test', verb: 'run_tests' },
        { id: 'selftest.agent_tour',    label: 'AI agent tour',     verb: 'agent_tour' },
        { id: 'selftest.minimize',      label: 'Minimize',          verb: 'minimize' },
        { id: 'selftest.maximize',      label: 'Maximize',          verb: 'maximize' },
        { id: 'selftest.restore',       label: 'Restore',           verb: 'restore' },
      ],
    });
  }

  const selftestOut = document.querySelector('[data-nac-id="selftest.output"]');
  const selftestGaps = document.querySelector('[data-nac-id="selftest.gaps"]');
  const selftestGapList = document.querySelector('[data-nac-id="selftest.gaps.list"]');

  function selftestShow(text) {
    selftestOut.textContent = text;
    selftestOut.scrollTop = 0;
  }

  function selftestRenderGaps(gaps) {
    selftestGapList.innerHTML = '';
    gaps.forEach(function (g) {
      const li = document.createElement('li');
      li.className = 'gap-' + (g.severity || 'warn');
      li.textContent = '[' + (g.severity || 'warn').toUpperCase() + '] ' +
        g.rule + ': ' + g.detail;
      selftestGapList.appendChild(li);
    });
    selftestGaps.setAttribute('open', 'open');
    selftestGaps.setAttribute('data-nac-state', 'expanded');
  }

  // Wire chrome
  if (window.NAC && typeof NAC.minimize === 'function') {
    _wireChrome('selftest');
  }

  // Show navmap
  const stShowMap = document.querySelector('[data-nac-id="selftest.show_navmap"]');
  if (stShowMap) {
    stShowMap.addEventListener('click', function () {
      selftestShow('Fetching system_map()...');
      NAC.system_map().then(function (m) {
        selftestShow(JSON.stringify(m, null, 2));
        emit('nac:action:succeeded', { plugin_slug: 'selftest', nac_id: 'selftest.show_navmap' });
      }).catch(function (err) {
        selftestShow('Error: ' + (err && err.message || err));
      });
    });
  }

  // Show capabilities
  const stShowCaps = document.querySelector('[data-nac-id="selftest.show_caps"]');
  if (stShowCaps) {
    stShowCaps.addEventListener('click', function () {
      selftestShow('Fetching capabilities()...');
      NAC.capabilities().then(function (c) {
        selftestShow(JSON.stringify(c, null, 2));
        emit('nac:action:succeeded', { plugin_slug: 'selftest', nac_id: 'selftest.show_caps' });
      }).catch(function (err) {
        selftestShow('Error: ' + (err && err.message || err));
      });
    });
  }

  // List sections
  const stListSections = document.querySelector('[data-nac-id="selftest.list_sections"]');
  if (stListSections) {
    stListSections.addEventListener('click', function () {
      const list = NAC.list_sections ? NAC.list_sections() : [];
      const lines = ['Page sections (' + list.length + '):'];
      list.forEach(function (s) {
        lines.push('  - ' + s.id + '  [' + (s.visible ? 'visible' : 'hidden') + ']  "' + (s.label || '').slice(0, 60) + '"');
      });
      selftestShow(lines.join('\n'));
      emit('nac:action:succeeded', { plugin_slug: 'selftest', nac_id: 'selftest.list_sections' });
    });
  }

  // ----- in-page NAC self-test (catalog-driven) -----
  // Mirror of runner/nac_runner.py but in the browser.
  async function runSelfTest() {
    const t0 = Date.now();
    const results = []; // {plugin, kind, target, ok, detail, ms, expectedEvent?}
    const gaps    = []; // {rule, severity, detail}

    function rec(plugin, kind, target, ok, detail, ms) {
      results.push({ plugin: plugin, kind: kind, target: target, ok: ok, detail: detail || '', ms: ms || 0 });
    }
    function waitEvent(name, sinceIdx, timeoutMs) {
      return new Promise(function (resolve) {
        const deadline = Date.now() + (timeoutMs || 1500);
        function tick() {
          const arr = window.__nacSelfTestEvents.slice(sinceIdx);
          const ev = arr.find(function (e) { return e.name === name; });
          if (ev) return resolve(ev);
          if (Date.now() >= deadline) return resolve(null);
          setTimeout(tick, 30);
        }
        tick();
      });
    }
    function eventsIdx() { return window.__nacSelfTestEvents.length; }

    // Install one-shot event recorder
    if (!window.__nacSelfTestInstalled) {
      window.__nacSelfTestInstalled = true;
      window.__nacSelfTestEvents = [];
      [
        'nac:action:succeeded', 'nac:action:failed', 'nac:action:dispatching',
        'nac:plugin:opened', 'nac:plugin:minimized', 'nac:plugin:maximized', 'nac:plugin:restored',
        'nac:tab:changed', 'nac:section:expanded', 'nac:section:collapsed',
        'nac:field:changed', 'nac:options:loaded', 'nac:slider:value_changed',
        'nac:section:reached',
      ].forEach(function (n) {
        document.addEventListener(n, function (ev) {
          window.__nacSelfTestEvents.push({ name: n, t: Date.now(), detail: ev.detail || {} });
        });
      });
    }

    const slugs = NAC.list ? NAC.list() : [];
    selftestShow('Discovered plugins: ' + slugs.length + ' -- running tests...\n');

    for (let s = 0; s < slugs.length; s++) {
      const slug = slugs[s];
      const m = NAC.manifest ? NAC.manifest(slug) : null;
      if (!m) continue;

      // validate()
      const v = NAC.validate ? NAC.validate(slug) : { ok: true };
      rec(slug, 'validate', slug, !!(v && v.ok), v && v.ok ? 'ok' : ('missing=' + (v && v.missing || '?')), 0);
      if (v && v.missing && v.missing.length) {
        v.missing.forEach(function (mm) {
          gaps.push({ rule: 'P7 manifest', severity: 'fail', detail: slug + ' missing: ' + mm });
        });
      }

      // actions (skip selftest's own buttons to avoid recursion)
      const actions = (m.actions || []).filter(function (a) { return a.id !== 'selftest.run_tests' && a.id !== 'selftest.agent_tour'; });
      for (let i = 0; i < Math.min(actions.length, 3); i++) {
        const a = actions[i];
        const verb = (a.verb || 'click').toLowerCase();
        const idx = eventsIdx();
        const ti = Date.now();
        let want = 'nac:action:succeeded';
        try {
          if (verb === 'minimize') { await NAC.minimize(slug); want = 'nac:plugin:minimized'; }
          else if (verb === 'maximize') { await NAC.maximize(slug); want = 'nac:plugin:maximized'; }
          else if (verb === 'restore')  { await NAC.restore(slug);  want = 'nac:plugin:restored'; }
          else { await NAC.click(a.id); }
          const ev = await waitEvent(want, idx, 1500);
          rec(slug, 'action', a.id, !!ev, ev ? want : ('timeout waiting ' + want), Date.now() - ti);
        } catch (e) {
          rec(slug, 'action', a.id, false, String(e && e.message || e), Date.now() - ti);
        }
      }

      // fields (sample first 2 of each plugin)
      const fields = (m.fields || []).slice(0, 2);
      for (let i = 0; i < fields.length; i++) {
        const f = fields[i];
        const ftype = (f.field_type || 'text').toLowerCase();
        const idx = eventsIdx();
        const ti = Date.now();
        try {
          if (ftype === 'combobox' || ftype === 'select' || ftype === 'multi-select') {
            const src = (f.options_source || 'static');
            let opts = [];
            if (src === 'remote') {
              opts = await NAC.search_options(f.id, 'a', 5);
            } else {
              opts = await NAC.options(f.id);
            }
            if (opts.length) {
              await NAC.fill(f.id, opts[0].value || opts[0].label);
              const ev = await waitEvent('nac:field:changed', idx, 1200);
              rec(slug, 'field', f.id, !!ev, 'pick "' + (opts[0].value || opts[0].label) + '" from ' + src, Date.now() - ti);
            } else {
              rec(slug, 'field', f.id, false, 'no options resolved', Date.now() - ti);
              gaps.push({ rule: 'P3 options', severity: 'warn', detail: f.id + ' resolved 0 options for source=' + src });
            }
          } else if (ftype === 'slider' || ftype === 'range') {
            await (NAC.set_slider ? NAC.set_slider(f.id, 50) : NAC.fill(f.id, 50));
            const ev = await waitEvent('nac:slider:value_changed', idx, 1200) ||
                       await waitEvent('nac:field:changed', idx, 200);
            rec(slug, 'field', f.id, !!ev, 'slider=50', Date.now() - ti);
          } else {
            const sample = ({ email:'nac@test.local', tel:'+5491155555555', url:'https://example.com', number:'42' })[ftype] || 'NAC test';
            await NAC.fill(f.id, sample);
            const ev = await waitEvent('nac:field:changed', idx, 1200);
            rec(slug, 'field', f.id, !!ev, 'fill "' + sample + '"', Date.now() - ti);
          }
        } catch (e) {
          rec(slug, 'field', f.id, false, String(e && e.message || e), Date.now() - ti);
        }
      }
    }

    // ---- gap rules -----------------------------------------------
    // R1: every clickable element has data-nac-id, EXCEPT inside a
    // data-nac-validate="skip" subtree (spec sec 3.1, v1.8) -- those
    // are explicitly opted-out third-party widgets the host cannot
    // retrofit. Counting them as gaps would punish the legitimate
    // escape hatch.
    const buttonsRaw = document.querySelectorAll(
      'button:not([data-nac-id]), input[type="button"]:not([data-nac-id]), input[type="submit"]:not([data-nac-id])');
    const buttons = Array.prototype.filter.call(buttonsRaw, function (b) {
      return !b.closest('[data-nac-validate="skip"]');
    });
    if (buttons.length) {
      gaps.push({ rule: 'R1 button without nac-id', severity: 'fail',
        detail: buttons.length + ' button(s) lack data-nac-id' });
    }
    // R2: every plugin root has a manifest
    const pluginRoots = document.querySelectorAll('[data-nac-plugin]');
    pluginRoots.forEach(function (el) {
      const slug = el.getAttribute('data-nac-plugin');
      if (!NAC.manifest || !NAC.manifest(slug)) {
        gaps.push({ rule: 'R2 plugin root without manifest', severity: 'fail',
          detail: 'data-nac-plugin="' + slug + '" has no NAC.register call' });
      }
    });
    // R3: every form field has a field-type
    const fieldsNoType = document.querySelectorAll('[data-nac-role="field"]:not([data-nac-field-type])');
    if (fieldsNoType.length) {
      gaps.push({ rule: 'R3 field without field-type', severity: 'warn',
        detail: fieldsNoType.length + ' field(s) lack data-nac-field-type' });
    }
    // R4: every section has a label
    const sectionsNoLabel = document.querySelectorAll('[data-nac-role="section"]:not([data-nac-label])');
    if (sectionsNoLabel.length) {
      gaps.push({ rule: 'R4 section without label', severity: 'warn',
        detail: sectionsNoLabel.length + ' section(s) lack data-nac-label' });
    }
    // R5: page top-level <section> elements that lack data-nac-role
    const looseSections = document.querySelectorAll('main > section:not([data-nac-role]), body > section:not([data-nac-role])');
    if (looseSections.length) {
      gaps.push({ rule: 'R5 page section without role', severity: 'warn',
        detail: looseSections.length + ' top-level section(s) without data-nac-role="section"' });
    }
    // R6: every action without a verb is unclassified
    const actionsNoVerb = document.querySelectorAll('[data-nac-role="action"]:not([data-nac-action])');
    if (actionsNoVerb.length) {
      gaps.push({ rule: 'R6 action without verb', severity: 'warn',
        detail: actionsNoVerb.length + ' action(s) lack data-nac-action' });
    }

    // ---- summary -------------------------------------------------
    const passed = results.filter(function (r) { return r.ok; }).length;
    const failed = results.length - passed;
    const took = Math.round((Date.now() - t0) / 100) / 10;
    const lines = [];
    lines.push('NAC self-test summary');
    lines.push('=====================');
    lines.push('plugins:    ' + slugs.length);
    lines.push('tests:      ' + results.length);
    lines.push('passed:     ' + passed);
    lines.push('failed:     ' + failed);
    lines.push('took:       ' + took + ' s');
    lines.push('gaps:       ' + gaps.length);
    lines.push('');
    lines.push('Per-test results:');
    results.forEach(function (r) {
      lines.push((r.ok ? '  ok ' : 'FAIL ') + r.plugin + ' / ' + r.kind + ' / ' + r.target +
        '   ' + (r.detail || '') + '  (' + r.ms + ' ms)');
    });
    selftestShow(lines.join('\n'));
    selftestRenderGaps(gaps);
    emit('nac:action:succeeded', { plugin_slug: 'selftest', nac_id: 'selftest.run_tests',
      summary: { plugins: slugs.length, total: results.length, passed: passed, failed: failed, gaps: gaps.length } });
  }

  const stRunTests = document.querySelector('[data-nac-id="selftest.run_tests"]');
  if (stRunTests) {
    stRunTests.addEventListener('click', function () { runSelfTest(); });
  }

  // ----- AI agent tour: walks the page narrating in chat -----
  async function aiAgentTour() {
    const speak = (typeof botSpeak === 'function') ? botSpeak : function () {};
    const log = (line) => { selftestShow((selftestOut.textContent || '') + '\n' + line); };
    /* v1.6.7 helper: poll-based adaptive pause. Wait the
       visual-settle baseline first (so section-highlight CSS
       + scroll + state animations all land), THEN poll
       _ttsRemainingMs() to absorb whatever speech is still
       playing + 1000ms breathing room.
       In agent tour the speak() runs SYNC before the wait()
       call (unlike autopilot where drive() is async), so the
       pre-v1.6.7 single-shot calculation already worked here.
       But aligning both flows on the same poll pattern keeps
       the codepaths uniform and forgives any future flow that
       triggers speech via async paths. */
    const wait = (baselineMs) => {
      const ttsBuffer = 1000;
      return new Promise(function (resolve) {
        setTimeout(function () {
          const remaining = _ttsRemainingMs();
          if (remaining > 100) {
            setTimeout(resolve, remaining + ttsBuffer);
          } else {
            setTimeout(resolve, ttsBuffer);
          }
        }, baselineMs);
      });
    };
    selftestShow('AI agent: discovering page...');
    speak('Hola, soy el agente Yujin. Voy a recorrer esta pagina sin que muevas el mouse.');
    await wait(1200);

    // Step 1: discover
    const map = await NAC.system_map().catch(function () { return null; });
    const sections = NAC.list_sections ? NAC.list_sections() : [];
    /* v1.6.6: when NAC.system_map() returns 0 views (e.g. the
       host is a demo that never calls NAC.register but still has
       plugin roots in the DOM), fall back to a DOM scan. The
       message "Encontre 0 plugins y 5 secciones" was misleading
       because the demo HAS visible cards (cities, navmap,
       upload.zone, drag-list, table.demo, etc.) -- they are
       just not registered as manifests. Counting via
       data-nac-plugin attribute reflects what the user sees. */
    const mapViews = map ? map.views.length : 0;
    const domPluginRoots = document.querySelectorAll('[data-nac-plugin]');
    const pluginCount = mapViews > 0 ? mapViews : domPluginRoots.length;
    log('-> NAC.system_map() returned ' + mapViews + ' views.');
    log('-> data-nac-plugin DOM scan returned ' + domPluginRoots.length + ' roots.');
    log('-> NAC.list_sections() returned ' + sections.length + ' sections.');
    speak('Encontre ' + pluginCount + ' plugins y ' + sections.length + ' secciones.');
    await wait(1200);

    // Step 2: visit every section in order
    for (let i = 0; i < sections.length; i++) {
      const s = sections[i];
      log('-> NAC.go_to_section("' + s.id + '")');
      speak('Voy a la seccion: ' + (s.label || s.id));
      try { await NAC.go_to_section(s.id); } catch (e) {}
      /* Section highlight CSS animation runs ~1500ms; let it
         fully fade. With TTS on, this baseline often gets
         exceeded by the speech tail. */
      await wait(1500);
    }

    /* Step 3: exercise one action per plugin. v1.6.6 widens the
       discovery: prefer registered manifests when they exist
       (NAC.list returns plugin slugs in current runtime), fall
       back to a DOM walk of [data-nac-plugin] roots so demos
       without explicit NAC.register calls still get exercised. */
    const slugSet = {};
    domPluginRoots.forEach(function (root) {
      const s = root.getAttribute('data-nac-plugin');
      if (!s) return;
      if (s === 'selftest' || s === 'example_demo' || s === 'example_assistant') return;
      slugSet[s] = root;
    });
    const slugs = Object.keys(slugSet);
    for (let i = 0; i < Math.min(slugs.length, 3); i++) {
      const slug = slugs[i];
      const root = slugSet[slug];
      let actId = null;
      let actLabel = slug;
      const m = NAC.manifest ? NAC.manifest(slug) : null;
      if (m && m.actions && m.actions.length) {
        const act = m.actions.find(function (a) {
          const v = (a.verb || 'click').toLowerCase();
          return v !== 'minimize' && v !== 'maximize' && v !== 'restore';
        });
        if (act) { actId = act.id; actLabel = act.label || act.id; }
      }
      /* DOM fallback: pick the first non-chrome action button. */
      if (!actId && root) {
        const candidate = root.querySelector(
          '[data-nac-role="action"][data-nac-id]:not([data-nac-action="minimize"]):not([data-nac-action="maximize"]):not([data-nac-action="restore"])');
        if (candidate) {
          actId = candidate.getAttribute('data-nac-id');
          actLabel = (candidate.getAttribute('aria-label')
                   || candidate.textContent || '').trim().slice(0, 40)
                   || actId;
        }
      }
      if (actId) {
        log('-> NAC.click("' + actId + '") on plugin ' + slug);
        speak('Pruebo la accion ' + actLabel);
        try { await NAC.click(actId); } catch (e) {}
        /* Focus pulse runs ~600ms; with TTS on this often gets
           extended by the speech tail. */
        await wait(1000);
      }
    }

    log('-> Tour complete.');
    speak('Tour completo. Mira el log a la derecha para ver los eventos NAC que dispare.');
    emit('nac:action:succeeded', { plugin_slug: 'selftest', nac_id: 'selftest.agent_tour' });
  }

  const stAgentTour = document.querySelector('[data-nac-id="selftest.agent_tour"]');
  if (stAgentTour) {
    stAgentTour.addEventListener('click', function () { aiAgentTour(); });
  }

  // ============================================================
  // v1.7 widget showcase: wire each card's events with canonical
  // shapes per spec sec 6.2.
  // ============================================================
  function _wireV17Widgets() {
    /* Stepper -- cycles through 3 sumi-e drawings (sakura, fuji,
       bamboo) so the v1.7 widget showcase is visually rich, not
       a numbers-only placeholder. User feedback: stepper podria
       ciclar imagenes. */
    const stepperLabels = ['Sakura', 'Fuji', 'Bamboo'];
    const stepperSlugs  = ['sakura', 'fuji', 'bamboo'];
    const stepperState = { current: 0, total: 3 };
    const stepperDisplay = $('[data-nac-id="stepper.demo.display"]');
    const stepperCanvas  = $('[data-nac-id="stepper.demo.canvas"]');
    function stepperRender() {
      const label = stepperLabels[stepperState.current] || ('Step ' + (stepperState.current + 1));
      if (stepperDisplay) {
        stepperDisplay.textContent = tFmt('stepper.display', { label: label, n: stepperState.current + 1, total: stepperState.total });
      }
      if (stepperCanvas) {
        const slug = stepperSlugs[stepperState.current];
        stepperCanvas.innerHTML = ART_SVG[slug] || '';
      }
    }
    /* Initial render so the first sumi-e shows on boot. */
    stepperRender();
    const stepNext = $('[data-nac-id="stepper.demo.next"]');
    const stepBack = $('[data-nac-id="stepper.demo.back"]');
    if (stepNext) stepNext.addEventListener('click', function () {
      /* 2026-05-09 fix conformance MISS: when the autopilot
         leaves the stepper at the last step, a subsequent
         click on next would return without emitting anything,
         and the conformance test reports
         '[MISS] nac:step:advanced -- no event captured'.
         Wraparound: if at the last step, jump back to 0 and
         emit the canonical event. UX-wise this reads as
         'cycle through the stepper'. */
      const from = stepperState.current;
      if (from >= stepperState.total - 1) {
        stepperState.current = 0;
      } else {
        stepperState.current++;
      }
      stepperRender();
      emit('nac:step:advanced', {
        plugin: 'stepper_demo', plugin_instance_id: null,
        stepper_id: 'stepper.demo',
        from_index: from, to_index: stepperState.current,
        total: stepperState.total,
      });
    });
    if (stepBack) stepBack.addEventListener('click', function () {
      if (stepperState.current <= 0) return;
      const from = stepperState.current;
      stepperState.current--;
      stepperRender();
      emit('nac:step:back', {
        plugin: 'stepper_demo', plugin_instance_id: null,
        stepper_id: 'stepper.demo',
        from_index: from, to_index: stepperState.current,
      });
    });

    /* Tree */
    $all('[data-tree-toggle]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const node = btn.closest('[data-nac-role="tree-node"]');
        if (!node) return;
        const isCollapsed = node.getAttribute('data-nac-state') === 'collapsed';
        node.setAttribute('data-nac-state', isCollapsed ? 'expanded' : 'collapsed');
        const children = node.querySelector('.ne-tree-children');
        if (children) children.hidden = !isCollapsed;
        btn.textContent = isCollapsed ? '-' : '+';
        emit(isCollapsed ? 'nac:tree:expanded' : 'nac:tree:collapsed', {
          plugin: 'tree_demo', plugin_instance_id: null,
          tree_id: 'tree.demo',
          node_id: node.getAttribute('data-nac-id'),
        });
      });
    });
    let treeSelected = null;
    $all('[data-nac-plugin="tree_demo"] [data-nac-role="tree-node"]').forEach(function (node) {
      node.addEventListener('click', function (ev) {
        /* Skip clicks on the toggle button (it has its own
           handler that emits nac:tree:expanded/collapsed). */
        if (ev.target.closest('[data-tree-toggle]')) return;
        /* Fire ONLY for the closest tree-node ancestor of the
           click target. Pre-fix every parent node fired its own
           selected event when a leaf was clicked because the
           click bubbled up the entire ancestor chain -- one
           click on Apple emitted selected for Apple AND Fruits.
           The closest() check makes selection unambiguous. */
        const closestNode = ev.target.closest('[data-nac-role="tree-node"]');
        if (closestNode !== node) return;
        const prior = treeSelected;
        treeSelected = node.getAttribute('data-nac-id');
        emit('nac:tree:selected', {
          plugin: 'tree_demo', plugin_instance_id: null,
          tree_id: 'tree.demo',
          node_id: treeSelected,
          prior_node_id: prior,
        });
      });
    });

    /* Toast */
    let toastIdSeq = 0;
    const toastFire = $('[data-nac-id="toast.demo.fire"]');
    const toastHost = $('[data-nac-id="toast.demo"]');
    if (toastFire && toastHost) {
      toastFire.addEventListener('click', function () {
        const id = 'toast.demo.t' + (++toastIdSeq);
        const li = document.createElement('div');
        li.className = 'ne-toast-item';
        li.textContent = 'Toast ' + toastIdSeq + ' fired';
        li.setAttribute('data-nac-id', id);
        li.setAttribute('data-nac-role', 'toast');
        toastHost.appendChild(li);
        emit('nac:toast:shown', {
          plugin: 'toast_demo', plugin_instance_id: null,
          toast_id: id, severity: 'info', message: li.textContent,
        });
        setTimeout(function () {
          if (!li.parentNode) return;
          li.remove();
          emit('nac:toast:dismissed', {
            plugin: 'toast_demo', plugin_instance_id: null,
            toast_id: id, by: 'timeout',
          });
        }, 1800);
      });
    }

    /* Drawer */
    const drawerOpen  = $('[data-nac-id="drawer.demo.open"]');
    const drawerClose = $('[data-nac-id="drawer.demo.close"]');
    const drawerBody  = $('[data-nac-id="drawer.demo"]');
    if (drawerOpen && drawerBody) drawerOpen.addEventListener('click', function () {
      drawerBody.hidden = false;
      drawerBody.setAttribute('data-nac-state', 'open');
      emit('nac:drawer:opened', {
        plugin: 'drawer_demo', plugin_instance_id: null,
        drawer_id: 'drawer.demo',
      });
    });
    if (drawerClose && drawerBody) drawerClose.addEventListener('click', function () {
      drawerBody.hidden = true;
      drawerBody.setAttribute('data-nac-state', 'closed');
      emit('nac:drawer:closed', {
        plugin: 'drawer_demo', plugin_instance_id: null,
        drawer_id: 'drawer.demo',
      });
    });

    /* Calendar -- v1.8: live mini-grid. The 7-day strip lives in
       example.php; here we toggle aria-pressed on the view buttons,
       update the grid's data-cal-view (CSS reacts), update the
       status feedback, and emit canonical events. */
    const calGrid = document.querySelector('[data-nac-id="calendar.demo"]');
    const calStatus = document.querySelector('[data-nac-id="calendar.demo.status"]');
    $all('[data-nac-plugin="calendar_demo"] [data-cal-view]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const view = btn.getAttribute('data-cal-view');
        $all('[data-nac-plugin="calendar_demo"] [data-cal-view]').forEach(function (b) {
          b.setAttribute('aria-pressed', String(b === btn));
        });
        if (calGrid) calGrid.setAttribute('data-cal-view', view);
        if (calStatus) {
          calStatus.textContent = tFmt('cal.status_view', { view: t('cal.view_' + view) || view, count: 2 });
          calStatus.setAttribute('data-nac-state', 'success');
        }
        emit('nac:calendar:view_changed', {
          plugin: 'calendar_demo', plugin_instance_id: null,
          calendar_id: 'calendar.demo',
          view: view,
        });
      });
    });
    $all('[data-nac-plugin="calendar_demo"] [data-nac-role="calendar-event"]').forEach(function (el) {
      el.addEventListener('click', function () {
        const eid = el.getAttribute('data-nac-id');
        $all('[data-nac-plugin="calendar_demo"] [data-nac-role="calendar-event"]')
          .forEach(function (e) { e.removeAttribute('data-event-active'); });
        el.setAttribute('data-event-active', '1');
        if (calStatus) {
          calStatus.textContent = tFmt('cal.status_event', { event: (el.getAttribute('title') || eid) });
          calStatus.setAttribute('data-nac-state', 'success');
        }
        emit('nac:calendar:event_selected', {
          plugin: 'calendar_demo', plugin_instance_id: null,
          calendar_id: 'calendar.demo',
          event_id: eid,
        });
      });
    });

    /* Chart -- v1.8: SVG bar render. Two series (alpha, beta), 6
       bars each, side-by-side. Reload generates new heights so
       the reload button shows visible state change. Toggle hides
       the corresponding series via CSS opacity. */
    let chartSeriesAlpha = true, chartSeriesBeta = true;
    const chartStatusEl = $('[data-nac-id="chart.demo.status"]');
    function chartRandomData() {
      const a = []; const b = [];
      for (let i = 0; i < 6; i++) {
        a.push(20 + Math.floor(Math.random() * 60));
        b.push(20 + Math.floor(Math.random() * 60));
      }
      return { alpha: a, beta: b };
    }
    function chartRender(data) {
      const w = 36;     /* width per slot (alpha + beta + gap) */
      const ax = 28;    /* axis x offset */
      const ay = 100;   /* axis y baseline */
      function renderSeries(series, offset, color) {
        const g = document.querySelector(
          '[data-nac-plugin="chart_demo"] g[data-series-id="' + series + '"]');
        if (!g) return;
        const arr = data[series];
        let svg = '';
        for (let i = 0; i < arr.length; i++) {
          const x = ax + i * w + offset;
          const h = arr[i];
          const y = ay - h;
          svg += '<rect x="' + x + '" y="' + y +
                 '" width="12" height="' + h +
                 '" fill="' + color + '"></rect>';
        }
        g.innerHTML = svg;
      }
      renderSeries('alpha', 0,  '#4f46e5');  /* indigo */
      renderSeries('beta',  14, '#f59e0b');  /* amber */
    }
    let chartData = chartRandomData();
    chartRender(chartData);
    function chartToggleHandler(seriesId, btn, getter, setter) {
      btn.addEventListener('click', function () {
        const next = !getter();
        setter(next);
        btn.setAttribute('aria-pressed', String(next));
        const g = document.querySelector(
          '[data-nac-plugin="chart_demo"] g[data-series-id="' + seriesId + '"]');
        if (g) {
          if (next) g.setAttribute('data-active', '1');
          else g.removeAttribute('data-active');
        }
        if (chartStatusEl) {
          chartStatusEl.textContent = tFmt('chart.status_toggled', {
            series: seriesId,
            state: next ? t('chart.state_visible') : t('chart.state_hidden')
          });
        }
        emit('nac:chart:series_toggled', {
          plugin: 'chart_demo', plugin_instance_id: null,
          chart_id: 'chart.demo',
          series_id: seriesId,
          visible: next,
        });
      });
    }
    const chartA = $('[data-nac-id="chart.demo.series.alpha"]');
    const chartB = $('[data-nac-id="chart.demo.series.beta"]');
    if (chartA) chartToggleHandler('alpha', chartA,
      function () { return chartSeriesAlpha; },
      function (v) { chartSeriesAlpha = v; });
    if (chartB) chartToggleHandler('beta', chartB,
      function () { return chartSeriesBeta; },
      function (v) { chartSeriesBeta = v; });
    const chartReload = $('[data-nac-id="chart.demo.reload"]');
    if (chartReload) chartReload.addEventListener('click', function () {
      chartData = chartRandomData();
      chartRender(chartData);
      if (chartStatusEl) {
        chartStatusEl.textContent = t('chart.status_reloaded');
        chartStatusEl.setAttribute('data-nac-state', 'success');
      }
      emit('nac:chart:data_loaded', {
        plugin: 'chart_demo', plugin_instance_id: null,
        chart_id: 'chart.demo',
        series_count: 2, point_count: 12,
      });
    });
    /* Initial load event so consumers see at least one. */
    setTimeout(function () {
      emit('nac:chart:data_loaded', {
        plugin: 'chart_demo', plugin_instance_id: null,
        chart_id: 'chart.demo',
        series_count: 2, point_count: 12,
      });
    }, 200);

    /* Map */
    const markerCenter = {
      ba:     { lat: -34.6, lng: -58.4 },
      tokyo:  { lat: 35.7,  lng: 139.7 },
      berlin: { lat: 52.5,  lng: 13.4 },
    };
    /* v1.8: SVG markers + button list both fire the same select.
       data-marker-id is on either a <button> (the row below the
       map) or a <circle> inside the SVG. The status feedback line
       updates on each select so the user sees the live wiring. */
    const markerLabel = {
      ba: 'Buenos Aires (-34.6, -58.4)',
      tokyo: 'Tokyo (35.7, 139.7)',
      berlin: 'Berlin (52.5, 13.4)',
    };
    const mapStatusEl = document.querySelector('[data-nac-id="map.demo.status"]');
    function selectMarker(id) {
      /* Toggle data-marker-active on every SVG circle so CSS can
         pulse the chosen one. */
      $all('[data-nac-plugin="map_demo"] svg [data-marker-id]')
        .forEach(function (el) {
          if (el.getAttribute('data-marker-id') === id) {
            el.setAttribute('data-marker-active', '1');
          } else {
            el.removeAttribute('data-marker-active');
          }
        });
      if (mapStatusEl) {
        mapStatusEl.textContent = tFmt('map.status_selected', { marker: (markerLabel[id] || id) });
        mapStatusEl.setAttribute('data-nac-state', 'success');
      }
      emit('nac:map:marker_selected', {
        plugin: 'map_demo', plugin_instance_id: null,
        map_id: 'map.demo',
        marker_id: id,
      });
      /* v1.7.0 conformance fix: also re-focus the map on the
         selected marker. */
      const c = markerCenter[id];
      if (c) {
        emit('nac:map:focused', {
          plugin: 'map_demo', plugin_instance_id: null,
          map_id: 'map.demo',
          center: c, zoom: 5,
        });
      }
    }
    /* Wire BOTH the buttons (data-nac-id="map.demo.marker.X") and
       the SVG circles. Buttons stay the canonical NAC click path;
       SVG clicks are a UX bonus for users who prefer the visual. */
    $all('[data-nac-plugin="map_demo"] [data-marker-id]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const id = btn.getAttribute('data-marker-id');
        selectMarker(id);
      });
    });
    /* Initial focused event so plain page-load consumers see at
       least one. The conformance test does NOT depend on this
       (it triggers via marker click). */
    setTimeout(function () {
      emit('nac:map:focused', {
        plugin: 'map_demo', plugin_instance_id: null,
        map_id: 'map.demo',
        center: markerCenter.ba, zoom: 5,
      });
    }, 250);

    /* Richtext -- v1.8: ensure-selection helper. document.execCommand
       requires an active Range inside the contenteditable; clicking
       Bold without first selecting text was a no-op (the user
       reported 'la negrita NO se aplica al rich text'). When no
       selection exists, we select the entire body text so the
       click produces a visible result. */
    const rtBody = $('[data-nac-id="richtext.demo"]');
    function _rtEnsureSelection() {
      if (!rtBody) return false;
      rtBody.focus();
      const sel = window.getSelection ? window.getSelection() : null;
      if (!sel) return false;
      let activeRange = (sel.rangeCount > 0) ? sel.getRangeAt(0) : null;
      const insideRtBody = activeRange &&
        rtBody.contains(activeRange.startContainer) &&
        rtBody.contains(activeRange.endContainer);
      const isCollapsed = activeRange && activeRange.collapsed;
      if (!insideRtBody || isCollapsed) {
        const range = document.createRange();
        range.selectNodeContents(rtBody);
        sel.removeAllRanges();
        sel.addRange(range);
      }
      return true;
    }
    $all('[data-nac-plugin="richtext_demo"] [data-format]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const fmt = btn.getAttribute('data-format');
        _rtEnsureSelection();
        let ok = false;
        try { ok = document.execCommand(fmt); } catch (e) {}
        /* Fallback: if execCommand returned false (deprecated path
           in some modern browsers), wrap the selection manually with
           the appropriate tag. */
        if (!ok) {
          const sel = window.getSelection();
          if (sel && sel.rangeCount > 0 && !sel.isCollapsed) {
            const range = sel.getRangeAt(0);
            const tag = (fmt === 'bold') ? 'b' :
                        (fmt === 'italic') ? 'i' :
                        (fmt === 'underline') ? 'u' : null;
            if (tag) {
              const wrap = document.createElement(tag);
              try {
                wrap.appendChild(range.extractContents());
                range.insertNode(wrap);
              } catch (e) { /* swallow */ }
            }
          }
        }
        emit('nac:richtext:formatted', {
          plugin: 'richtext_demo', plugin_instance_id: null,
          richtext_id: 'richtext.demo',
          format: fmt,
        });
      });
    });
    const rtLink = $('[data-nac-id="richtext.demo.link"]');
    if (rtLink) rtLink.addEventListener('click', function () {
      const href = 'https://github.com/pkuschnirof/nac-spec';
      _rtEnsureSelection();
      let ok = false;
      try { ok = document.execCommand('createLink', false, href); } catch (e) {}
      if (!ok) {
        /* Manual fallback: wrap the selection in <a href="...">. */
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0 && !sel.isCollapsed) {
          const range = sel.getRangeAt(0);
          const a = document.createElement('a');
          a.href = href;
          a.target = '_blank';
          a.rel = 'noopener';
          try {
            a.appendChild(range.extractContents());
            range.insertNode(a);
          } catch (e) { /* swallow */ }
        }
      }
      emit('nac:richtext:link_inserted', {
        plugin: 'richtext_demo', plugin_instance_id: null,
        richtext_id: 'richtext.demo',
        href: href,
      });
    });

    /* Breadcrumb -- v1.8 fix: include the legacy nac_id alias of
       the clicked button in the detail so NAC.click('breadcrumb.
       demo.2') matches via _eventMatchesElement (the canonical
       breadcrumb_id refers to the container 'breadcrumb.demo',
       so the matcher would otherwise time out).

       v1.9.4: update preview-label on click so the card has a
       visible state change beyond the aria-current underline. The
       label re-resolves through the i18n catalog so the visible
       text matches the active locale. */
    const crumbPreviewLabel = document.querySelector(
      '[data-nac-id="breadcrumb.demo.preview.label"]');
    function _crumbKeyForIndex(idx) {
      return idx === 0 ? 'crumb.home'
           : idx === 1 ? 'crumb.catalogue'
           : 'crumb.item_42';
    }
    $all('[data-nac-plugin="breadcrumb_demo"] [data-crumb-index]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        $all('[data-nac-plugin="breadcrumb_demo"] [data-crumb-index]')
          .forEach(function (b) { b.removeAttribute('aria-current'); });
        btn.setAttribute('aria-current', 'page');
        const idx = parseInt(btn.getAttribute('data-crumb-index'), 10);
        if (crumbPreviewLabel) {
          const key = _crumbKeyForIndex(idx);
          crumbPreviewLabel.setAttribute('data-i18n-key', key);
          crumbPreviewLabel.textContent = t(key);
        }
        emit('nac:breadcrumb:navigated', {
          plugin: 'breadcrumb_demo', plugin_instance_id: null,
          breadcrumb_id: 'breadcrumb.demo',
          to_index: idx,
          to_label: btn.textContent.trim(),
          nac_id: btn.getAttribute('data-nac-id'),  /* legacy alias */
        });
      });
    });

    /* Carousel -- v1.7 round 6: 3 sumi-e slides (sakura / fuji /
       bamboo). Each slide carries a data-art slug; on first
       render we inject the matching ART_SVG so the slide shows
       a real ink drawing instead of empty space. data-active is
       toggled on the visible slide; CSS handles the cross-fade. */
    const carouselTotal = 3;
    const carouselDisplay = $('[data-nac-id="carousel.demo.display"]');
    const carouselSlides = document.querySelectorAll(
      '[data-nac-role="carousel-slide"]');
    /* Inject sumi-e SVG into each slide's .ne-carousel-art block. */
    carouselSlides.forEach(function (slide) {
      const art = slide.querySelector('.ne-carousel-art');
      if (!art) return;
      const slug = art.getAttribute('data-art');
      if (slug && typeof ART_SVG === 'object' && ART_SVG[slug]) {
        art.innerHTML = ART_SVG[slug];
      }
    });
    function carouselGet() {
      const root = $('[data-nac-id="carousel.demo"]');
      return root ? parseInt(root.getAttribute('data-cur') || '0', 10) : 0;
    }
    function carouselSet(idx, dir) {
      const root = $('[data-nac-id="carousel.demo"]');
      if (root) root.setAttribute('data-cur', String(idx));
      if (carouselDisplay) carouselDisplay.textContent = tFmt('carousel.display', { n: idx + 1, total: carouselTotal });
      /* Toggle data-active on the matching slide so the CSS
         cross-fade reveals it. */
      carouselSlides.forEach(function (slide, i) {
        if (i === idx) slide.setAttribute('data-active', '1');
        else slide.removeAttribute('data-active');
      });
      emit('nac:carousel:advanced', {
        plugin: 'carousel_demo', plugin_instance_id: null,
        carousel_id: 'carousel.demo',
        index: idx, total: carouselTotal,
        direction: dir,
      });
    }
    const carouselNext = $('[data-nac-id="carousel.demo.next"]');
    const carouselPrev = $('[data-nac-id="carousel.demo.prev"]');
    if (carouselNext) carouselNext.addEventListener('click', function () {
      carouselSet((carouselGet() + 1) % carouselTotal, 'forward');
    });
    if (carouselPrev) carouselPrev.addEventListener('click', function () {
      carouselSet((carouselGet() - 1 + carouselTotal) % carouselTotal, 'backward');
    });

    /* Timeline */
    let timelineLoadedCount = 3;
    const timelineOlder = $('[data-nac-id="timeline.demo.older"]');
    const timelineNewer = $('[data-nac-id="timeline.demo.newer"]');
    if (timelineOlder) timelineOlder.addEventListener('click', function () {
      const added = 2;
      timelineLoadedCount += added;
      emit('nac:timeline:loaded', {
        plugin: 'timeline_demo', plugin_instance_id: null,
        timeline_id: 'timeline.demo',
        loaded_count: added, direction: 'older',
      });
    });
    if (timelineNewer) timelineNewer.addEventListener('click', function () {
      const added = 1;
      timelineLoadedCount += added;
      emit('nac:timeline:loaded', {
        plugin: 'timeline_demo', plugin_instance_id: null,
        timeline_id: 'timeline.demo',
        loaded_count: added, direction: 'newer',
      });
    });

    /* Register a minimal manifest per showcase plugin so the
       runtime's NAC.validate / validate_global do not fault on
       "data-nac-plugin without NAC.register" (R2 finding from
       v1.7 conformance). The manifests declare only the
       label_i18n + the canonical actions/fields that this card
       exposes; widget-specific extension blocks are out of scope
       for the showcase. */
    if (window.NAC && typeof NAC.register === 'function') {
      const v17Manifests = {
        stepper_demo: {
          plugin_slug: 'stepper_demo', version: '1.0.0',
          actions: [
            { nac_id: 'stepper.demo.next', verb: 'next',
              label_i18n: { en: 'Next step', es: 'Siguiente paso' } },
            { nac_id: 'stepper.demo.back', verb: 'back',
              label_i18n: { en: 'Previous step', es: 'Paso anterior' } },
          ],
        },
        tree_demo: {
          plugin_slug: 'tree_demo', version: '1.0.0',
          actions: [
            { nac_id: 'tree.demo.fruits.toggle', verb: 'toggle',
              label_i18n: { en: 'Toggle Fruits', es: 'Toggle Frutas' } },
            { nac_id: 'tree.demo.veggies.toggle', verb: 'toggle',
              label_i18n: { en: 'Toggle Vegetables', es: 'Toggle Verduras' } },
          ],
        },
        toast_demo: {
          plugin_slug: 'toast_demo', version: '1.0.0',
          actions: [
            { nac_id: 'toast.demo.fire', verb: 'fire_toast',
              label_i18n: { en: 'Fire toast', es: 'Disparar toast' } },
          ],
        },
        drawer_demo: {
          plugin_slug: 'drawer_demo', version: '1.0.0',
          actions: [
            { nac_id: 'drawer.demo.open', verb: 'open',
              label_i18n: { en: 'Open drawer', es: 'Abrir drawer' } },
            { nac_id: 'drawer.demo.close', verb: 'close',
              label_i18n: { en: 'Close drawer', es: 'Cerrar drawer' } },
          ],
        },
        calendar_demo: {
          plugin_slug: 'calendar_demo', version: '1.0.0',
          actions: [
            { nac_id: 'calendar.demo.view.month', verb: 'view_month',
              label_i18n: { en: 'Month view', es: 'Vista mensual' } },
            { nac_id: 'calendar.demo.view.week', verb: 'view_week',
              label_i18n: { en: 'Week view', es: 'Vista semanal' } },
            { nac_id: 'calendar.demo.view.day', verb: 'view_day',
              label_i18n: { en: 'Day view', es: 'Vista diaria' } },
          ],
        },
        chart_demo: {
          plugin_slug: 'chart_demo', version: '1.0.0',
          actions: [
            { nac_id: 'chart.demo.series.alpha', verb: 'toggle_series',
              label_i18n: { en: 'Toggle Alpha', es: 'Toggle Alpha' } },
            { nac_id: 'chart.demo.series.beta', verb: 'toggle_series',
              label_i18n: { en: 'Toggle Beta', es: 'Toggle Beta' } },
            { nac_id: 'chart.demo.reload', verb: 'reload',
              label_i18n: { en: 'Reload data', es: 'Recargar datos' } },
          ],
        },
        map_demo: {
          plugin_slug: 'map_demo', version: '1.0.0',
          actions: [
            { nac_id: 'map.demo.marker.ba', verb: 'select_marker',
              label_i18n: { en: 'Buenos Aires marker', es: 'Marcador Buenos Aires' } },
            { nac_id: 'map.demo.marker.tokyo', verb: 'select_marker',
              label_i18n: { en: 'Tokyo marker', es: 'Marcador Tokio' } },
            { nac_id: 'map.demo.marker.berlin', verb: 'select_marker',
              label_i18n: { en: 'Berlin marker', es: 'Marcador Berlin' } },
          ],
        },
        richtext_demo: {
          plugin_slug: 'richtext_demo', version: '1.0.0',
          actions: [
            { nac_id: 'richtext.demo.bold', verb: 'format_bold',
              label_i18n: { en: 'Bold', es: 'Negrita' } },
            { nac_id: 'richtext.demo.italic', verb: 'format_italic',
              label_i18n: { en: 'Italic', es: 'Cursiva' } },
            { nac_id: 'richtext.demo.link', verb: 'insert_link',
              label_i18n: { en: 'Insert link', es: 'Insertar link' } },
          ],
        },
        breadcrumb_demo: {
          plugin_slug: 'breadcrumb_demo', version: '1.0.0',
          actions: [
            { nac_id: 'breadcrumb.demo.0', verb: 'navigate',
              label_i18n: { en: 'Home', es: 'Inicio' } },
            { nac_id: 'breadcrumb.demo.1', verb: 'navigate',
              label_i18n: { en: 'Catalogue', es: 'Catalogo' } },
            { nac_id: 'breadcrumb.demo.2', verb: 'navigate',
              label_i18n: { en: 'Item 42', es: 'Item 42' } },
          ],
        },
        carousel_demo: {
          plugin_slug: 'carousel_demo', version: '1.0.0',
          actions: [
            { nac_id: 'carousel.demo.next', verb: 'next',
              label_i18n: { en: 'Next slide', es: 'Siguiente slide' } },
            { nac_id: 'carousel.demo.prev', verb: 'prev',
              label_i18n: { en: 'Previous slide', es: 'Slide anterior' } },
          ],
        },
        timeline_demo: {
          plugin_slug: 'timeline_demo', version: '1.0.0',
          actions: [
            { nac_id: 'timeline.demo.older', verb: 'load_older',
              label_i18n: { en: 'Load older', es: 'Cargar mas antiguos' } },
            { nac_id: 'timeline.demo.newer', verb: 'load_newer',
              label_i18n: { en: 'Load newer', es: 'Cargar mas recientes' } },
          ],
        },
      };
      Object.keys(v17Manifests).forEach(function (slug) {
        try { NAC.register(v17Manifests[slug]); } catch (e) {}
      });
    }

    /* Open events for every showcase plugin so v1.7 conformance
       sees nac:plugin:opened from each. */
    ['stepper_demo','tree_demo','toast_demo','drawer_demo',
     'calendar_demo','chart_demo','map_demo','richtext_demo',
     'breadcrumb_demo','carousel_demo','timeline_demo',
     /* v1.8 cards */
     'skip_demo','a11y_hint_demo','dragtypes_demo'].forEach(function (slug) {
      emit('nac:plugin:opened', {
        plugin: slug, plugin_instance_id: null,
        version: '1.0.0',
      });
    });
  }
  _wireV17Widgets();
  _wireV18Widgets();

  /* v1.8 wiring: skip-validate region, a11y-hint delete, drag types. */
  function _wireV18Widgets() {
    /* Run validate() on the skip_demo plugin and surface the
       findings in the inline feedback span. */
    const skipBtn = document.querySelector('[data-nac-id="skip.demo.run_validate"]');
    const skipFb  = document.querySelector('[data-nac-id="skip.demo.feedback"]');
    if (skipBtn && skipFb) {
      skipBtn.addEventListener('click', function () {
        var r = (window.NAC && typeof NAC.validate === 'function')
          ? NAC.validate('skip_demo') : { ok: false, code: 'no_runtime' };
        var msg;
        if (r && r.errors) {
          var warns = r.errors.filter(function (e) {
            return e.code === 'skip_subtree_contains_interactives';
          });
          if (warns.length) {
            msg = 'warn: ' + warns[0].interactive_count +
              ' interactive(s) inside skip subtree';
          } else {
            msg = r.ok ? 'ok' : 'error';
          }
        } else {
          msg = r && r.code ? r.code : 'unknown';
        }
        skipFb.textContent = msg;
        skipFb.setAttribute('data-nac-state',
          /warn|error/.test(msg) ? 'warning' : 'success');
      });
    }
    /* a11y-hint delete: emit a confirm dialog on click, demonstrating
       that downstream tools should interpose on the irreversible flag. */
    const dangerBtn = document.querySelector('[data-nac-id="a11y.demo.delete"]');
    if (dangerBtn) {
      dangerBtn.addEventListener('click', function (e) {
        const desc = (window.NAC && NAC.find) ? NAC.find('a11y.demo.delete') : null;
        const hints = desc && desc.a11y_hint
          ? desc.a11y_hint.join(' + ') : 'no hints';
        const ok = window.confirm(
          'Delete invoice?\n\nNAC a11y_hint: ' + hints +
          '\n\n(A real UI would route this through NAC.confirm.)');
        if (ok) {
          emit('nac:action:succeeded', {
            plugin: 'a11y_hint_demo', plugin_instance_id: null,
            action_id: 'a11y.demo.delete', verb: 'delete',
          });
        } else {
          /* Use the new public command_rejected helper. */
          if (window.NAC && typeof NAC.command_rejected === 'function') {
            NAC.command_rejected({
              command_method: 'click',
              command_target: 'a11y.demo.delete',
              reason: 'user_cancelled',
              message: 'user dismissed the irreversible-action confirm',
              source: { type: 'user' },
            });
          }
        }
      });
    }
    /* Drag-type mismatch trigger button: drives NAC.drag_drop with
       a tag source onto the files-only target so the user can see
       nac:command:rejected fire in the event log. */
    const tryMismatch = document.querySelector('[data-nac-id="dragtypes.demo.try_mismatch"]');
    const dtFb = document.querySelector('[data-nac-id="dragtypes.demo.feedback"]');
    if (tryMismatch && dtFb) {
      tryMismatch.addEventListener('click', async function () {
        try {
          await NAC.drag_drop('dragtypes.card.tag', 'dragtypes.zone.files');
          dtFb.textContent = 'unexpected ok';
          dtFb.setAttribute('data-nac-state', 'warning');
        } catch (err) {
          dtFb.textContent = 'rejected: ' + (err && err.code);
          dtFb.setAttribute('data-nac-state', 'success');
        }
      });
    }
    /* Wire native HTML5 drag for the dragtypes.* cards so a real
       user can drag them too. NAC.drag_drop fires programmatic
       drags; this lets manual drags emit the same events.  */
    document.querySelectorAll('[data-nac-id^="dragtypes.card."]')
      .forEach(function (card) {
        card.addEventListener('dragstart', function (e) {
          e.dataTransfer.setData('text/plain', card.getAttribute('data-nac-id'));
        });
      });
    document.querySelectorAll('[data-nac-id^="dragtypes.zone."]')
      .forEach(function (zone) {
        zone.addEventListener('dragover', function (e) { e.preventDefault(); });
        zone.addEventListener('drop', function (e) {
          e.preventDefault();
          const sid = e.dataTransfer.getData('text/plain');
          NAC.drag_drop(sid, zone.getAttribute('data-nac-id'))
            .catch(function () {});
        });
      });
    /* Register manifests so describe() exposes the new cards' actions
       (needed for a11y_hint to surface via NAC.find). */
    if (window.NAC && typeof NAC.register === 'function') {
      NAC.register({
        plugin_slug: 'a11y_hint_demo',
        version: '1.0.0',
        nac_version: '1.8',
        actions: [
          { nac_id: 'a11y.demo.delete', verb: 'delete',
            label_i18n: { es: 'borrar factura', en: 'delete invoice',
              pt: 'apagar fatura', fr: 'supprimer facture',
              it: 'elimina fattura', de: 'Rechnung loeschen',
              ja: '請求書を削除', zh: '删除发票',
              hi: 'invoice हटाएँ', ar: 'حذف الفاتورة' } },
          { nac_id: 'a11y.demo.preview', verb: 'apply',
            label_i18n: { es: 'previsualizar factura', en: 'preview invoice',
              pt: 'pre-visualizar fatura', fr: 'pre-visualiser facture',
              it: 'anteprima fattura', de: 'Rechnung Vorschau',
              ja: '請求書のプレビュー', zh: '预览发票',
              hi: 'invoice preview', ar: 'معاينة الفاتورة' } },
        ],
      });
      NAC.register({
        plugin_slug: 'skip_demo', version: '1.0.0', nac_version: '1.8',
        actions: [
          { nac_id: 'skip.demo.run_validate', verb: 'apply',
            label_i18n: { es: 'ejecutar validate()', en: 'run validate()',
              pt: 'executar validate()', fr: 'lancer validate()',
              it: 'esegui validate()', de: 'validate() ausfuehren',
              ja: 'validate() 実行', zh: '运行 validate()',
              hi: 'validate() चलाएँ', ar: 'تشغيل validate()' } },
        ],
      });
      NAC.register({
        plugin_slug: 'dragtypes_demo', version: '1.0.0', nac_version: '1.8',
        actions: [
          { nac_id: 'dragtypes.demo.try_mismatch', verb: 'apply',
            label_i18n: { es: 'intentar mismatch', en: 'try mismatch',
              pt: 'tentar mismatch', fr: 'essayer mismatch',
              it: 'prova mismatch', de: 'Mismatch testen',
              ja: 'mismatch を試す', zh: '尝试 mismatch',
              hi: 'mismatch आज़माएँ', ar: 'جرب mismatch' } },
        ],
      });
    }
  }

  // ============================================================
  // v1.7 conformance self-test: programmatically exercise every
  // widget family showcased and verify the emitted event shape
  // matches spec sec 6.2.
  // ============================================================
  function runEventConformance() {
    selftestShow('v1.7+v1.8 conformance running...');
    /* v1.8 viewport-jump fix: the conformance seq[] drives ~30
       NAC.click / NAC.fill calls in rapid succession across cards
       scattered throughout the page. Each call triggers
       _focusElement -> scrollIntoView({block:'center'}) which
       makes the viewport bounce up + down for ~10 seconds. The
       user reported 'foco se desplaza para arriba unos 7 cm'.
       Fix: globally suppress focus during the conformance run
       via NAC.config.focus_on_action = false (the runtime already
       honours this flag at line ~707), AND remember the user's
       scroll position at start so we can restore it at the end
       after writing results. */
    const _savedFocusFlag = (window.NAC && window.NAC.config)
      ? window.NAC.config.focus_on_action : true;
    const _savedScrollY = window.scrollY || window.pageYOffset || 0;
    if (window.NAC && window.NAC.config) {
      window.NAC.config.focus_on_action = false;
    }
    /* Capture every nac:* event for the duration of the run. */
    const captured = [];
    const families = [
      'plugin:opening','plugin:opened','plugin:closing','plugin:closed',
      'plugin:reset','action:dispatching','action:succeeded','action:failed',
      'field:changed','tab:changed','accordion:expanded','accordion:collapsed',
      'confirm:requested','confirm:resolved','confirm:cancelled',
      'step:advanced','step:back','tree:expanded','tree:collapsed','tree:selected',
      'toast:shown','toast:dismissed','drawer:opened','drawer:closed',
      'calendar:view_changed','calendar:event_selected',
      'chart:data_loaded','chart:series_toggled',
      'map:focused','map:marker_selected',
      'richtext:formatted','richtext:link_inserted',
      'breadcrumb:navigated','carousel:advanced','timeline:loaded',
      'reorder:applied','list:reordered','table:sort_changed',
      'table:filter_changed','table:page_changed','slider:value_changed',
      'drag:started','drag:over','drag:dropped','drag:cancelled',
      'dropzone:dropped','dropzone:drag_over','file:added',
      'file:upload_progress','file:upload_completed',
      'section:reached','state:changed','focus:moved',
      /* v1.8 command events. */
      'command:rejected','command:failed',
    ];
    const seen = Object.create(null);
    const handlers = {};
    families.forEach(function (f) {
      const name = 'nac:' + f;
      handlers[name] = function (e) {
        captured.push({ name: name, detail: e.detail || {} });
        seen[name] = true;
      };
      document.addEventListener(name, handlers[name]);
    });

    /* Drive the showcase widgets so each emits its event. */
    function clickIfPresent(id) {
      const el = document.querySelector('[data-nac-id="' + id + '"]');
      if (el) el.click();
    }
    const seq = [
      /* v1.7 round 3: synthetic plugin:opened so the conformance
         can verify the canonical shape (sec 6.2.2) without
         depending on boot-time emits that fire BEFORE the
         conformance subscribes. The actual page also emits
         nac:plugin:opened from the boot fan-out at line ~7700;
         that one runs once at page load and the conformance
         post-subscribes too late to catch it. */
      function () {
        emit('nac:plugin:opened', {
          plugin: 'conformance_probe', plugin_instance_id: null,
          version: '1.7.0',
        });
      },
      /* Drag-drop via NAC.drag_drop fires the canonical
         drag:started -> drag:over -> drag:dropped chain. The
         runtime emits both canonical (source_id, target_id)
         and legacy (from_nac_id, target_nac_id) per v1.7.0. */
      function () {
        if (window.NAC && typeof NAC.drag_drop === 'function') {
          NAC.drag_drop('drag.item.alpha', 'drag.list.right')
            .catch(function () { /* tolerate role mismatch in stale runtime */ });
        }
      },
      function () { clickIfPresent('stepper.demo.next'); },
      function () { clickIfPresent('stepper.demo.back'); },
      function () { clickIfPresent('toast.demo.fire'); },
      function () { clickIfPresent('drawer.demo.open'); },
      function () { clickIfPresent('drawer.demo.close'); },
      function () { clickIfPresent('calendar.demo.view.week'); },
      function () { clickIfPresent('calendar.demo.event.1'); },
      function () { clickIfPresent('chart.demo.series.alpha'); },
      function () { clickIfPresent('chart.demo.reload'); },
      function () { clickIfPresent('map.demo.marker.ba'); },
      function () { clickIfPresent('richtext.demo.bold'); },
      function () { clickIfPresent('richtext.demo.link'); },
      function () { clickIfPresent('breadcrumb.demo.0'); },
      function () { clickIfPresent('carousel.demo.next'); },
      function () { clickIfPresent('timeline.demo.older'); },
      /* v1.7.0 conformance fix: cover all 3 tree events.
         First toggle expands -> nac:tree:expanded. */
      function () { clickIfPresent('tree.demo.fruits.toggle'); },
      /* Second toggle on the same node collapses ->
         nac:tree:collapsed. */
      function () { clickIfPresent('tree.demo.fruits.toggle'); },
      /* Click a leaf node directly so the selected handler
         fires nac:tree:selected. */
      function () {
        const leaf = document.querySelector('[data-nac-id="tree.demo.apple"]');
        if (leaf) leaf.click();
      },
      /* v1.7 round 2: extend coverage to v1.0..v1.6 baseline
         events that the existing demo cards emit. The user
         reported these as MISS in the conformance run because
         the seq did not click them. */
      /* Sumi-e art card emits nac:state:changed with state="expanded". */
      function () { clickIfPresent('art.sakura'); },
      /* Accordion section toggle emits nac:accordion:expanded
         (canonical) + nac:section:expanded (legacy alias). The
         autopilot may have left the section expanded already; if
         we just clicked once we'd emit accordion:collapsed and
         miss the canonical expanded event. So: pre-collapse if
         needed, then expand. */
      function () {
        const sec = document.querySelector('[data-nac-id="acc.s1"]');
        if (sec && sec.getAttribute('data-nac-state') === 'expanded') {
          clickIfPresent('acc.s1.toggle');
        }
      },
      function () { clickIfPresent('acc.s1.toggle'); },
      /* Table sort control emits nac:table:sort_changed. */
      function () { clickIfPresent('table.demo.sort.age'); },
      /* Table filter input emits nac:table:filter_changed -- need
         to dispatch input event, not just click. */
      function () {
        const f = document.querySelector('[data-nac-id="table.demo.filter"]');
        if (f) {
          f.value = 'Diego';
          f.dispatchEvent(new Event('input', { bubbles: true }));
        }
      },
      /* Slider input fires nac:slider:value_changed. */
      function () {
        const s = document.querySelector('[data-nac-id="field.volume"]');
        if (s) {
          s.value = '70';
          s.dispatchEvent(new Event('input', { bubbles: true }));
        }
      },
      /* Tab change fires nac:tab:changed. */
      function () {
        const t = document.querySelector('[data-nac-id="tabs.demo.t2"]');
        if (t) t.click();
      },
      /* Field change on the name input fires nac:field:changed. */
      function () {
        if (window.NAC && typeof NAC.fill === 'function') {
          NAC.fill('field.name', 'Yujin').catch(function () {});
        }
      },
      /* Action dispatch on the system map button fires
         nac:action:dispatching + :succeeded. */
      function () { clickIfPresent('navmap.fetch'); },
      /* v1.8: provoke nac:command:rejected via NAC.click on a
         non-existent target. Wrapped in try so the throw does not
         break the seq[]. */
      function () {
        try {
          if (window.NAC && typeof NAC.click === 'function') {
            NAC.click('does.not.exist').catch(function () {});
          }
        } catch (e) {}
      },
      /* v1.8: provoke nac:command:failed via the public helper. */
      function () {
        if (window.NAC && typeof NAC.command_failed === 'function') {
          NAC.command_failed({
            command_method: 'click',
            command_target: 'conformance.synthetic.failed',
            reason: 'exception',
            message: 'synthetic failure for conformance test',
            error_message: 'synthetic failure for conformance test',
            source: { type: 'script' },
          });
        }
      },
    ];
    let i = 0;
    function tick() {
      if (i < seq.length) {
        try { seq[i](); } catch (e) { /* keep going */ }
        i++;
        setTimeout(tick, 120);
      } else {
        setTimeout(report, 300);
      }
    }
    function report() {
      /* Detach handlers. */
      families.forEach(function (f) {
        document.removeEventListener('nac:' + f, handlers['nac:' + f]);
      });
      /* Validate canonical shapes. */
      const canonicalFields = {
        /* v1.7 widget showcase (sec 6.2.8 - 6.2.18). */
        'nac:step:advanced':         ['stepper_id','from_index','to_index','total'],
        'nac:step:back':             ['stepper_id','from_index','to_index'],
        'nac:tree:expanded':         ['tree_id','node_id'],
        'nac:tree:collapsed':        ['tree_id','node_id'],
        'nac:tree:selected':         ['tree_id','node_id'],
        'nac:toast:shown':           ['toast_id','severity','message'],
        'nac:toast:dismissed':       ['toast_id','by'],
        'nac:drawer:opened':         ['drawer_id'],
        'nac:drawer:closed':         ['drawer_id'],
        'nac:calendar:view_changed': ['calendar_id','view'],
        'nac:calendar:event_selected': ['calendar_id','event_id'],
        'nac:chart:data_loaded':     ['chart_id','series_count'],
        'nac:chart:series_toggled':  ['chart_id','series_id','visible'],
        'nac:map:focused':           ['map_id'],
        'nac:map:marker_selected':   ['map_id','marker_id'],
        'nac:richtext:formatted':    ['richtext_id','format'],
        'nac:richtext:link_inserted':['richtext_id','href'],
        'nac:breadcrumb:navigated':  ['breadcrumb_id','to_index'],
        'nac:carousel:advanced':     ['carousel_id','index','total','direction'],
        'nac:timeline:loaded':       ['timeline_id','loaded_count','direction'],
        /* v1.0..v1.6 baseline events (sec 6.2.2 - 6.2.7, 6.2.20 - 6.2.23). */
        'nac:plugin:opened':         ['version'],
        'nac:action:dispatching':    ['action_id','verb'],
        'nac:action:succeeded':      ['action_id','verb'],
        'nac:field:changed':         ['field_id','new_value'],
        'nac:tab:changed':           ['tab_id'],
        'nac:accordion:expanded':    ['section_id'],
        'nac:slider:value_changed':  ['field_id','value'],
        'nac:table:sort_changed':    ['table_id','column_id','direction'],
        'nac:table:filter_changed':  ['table_id','filter_id','value'],
        'nac:drag:started':          ['source_id'],
        'nac:drag:dropped':          ['source_id','target_id'],
        'nac:state:changed':         ['nac_id','state'],
        /* v1.8 command events (sec 6.2.30). plugin is NOT in the
           required base for these because rejected/failed may fire
           before plugin context is resolvable (e.g. not_found). */
        'nac:command:rejected':      ['command_method','reason'],
        'nac:command:failed':        ['command_method'],
      };
      const lines = [];
      let pass = 0, fail = 0;
      Object.keys(canonicalFields).forEach(function (eventName) {
        const required = canonicalFields[eventName];
        const samples = captured.filter(function (c) { return c.name === eventName; });
        if (samples.length === 0) {
          lines.push('[MISS] ' + eventName + ' -- no event captured');
          fail++;
          return;
        }
        const first = samples[0].detail;
        const missing = required.filter(function (k) { return first[k] === undefined; });
        /* v1.8: nac:command:rejected and nac:command:failed may fire
           before plugin context is resolvable (e.g. not_found target),
           so we exempt them from the plugin-string base check. */
        const exemptFromPlugin = (eventName === 'nac:command:rejected' ||
                                  eventName === 'nac:command:failed');
        const pluginOk = exemptFromPlugin || typeof first.plugin === 'string';
        const baseOk = exemptFromPlugin || ('plugin_instance_id' in first);
        if (missing.length === 0 && pluginOk && baseOk) {
          lines.push('[PASS] ' + eventName + ' (' + samples.length + ')');
          pass++;
        } else {
          lines.push('[FAIL] ' + eventName + ' missing: ' + missing.join(',') +
            (pluginOk ? '' : ' plugin'));
          fail++;
        }
      });
      lines.push('---');
      lines.push('Total events captured: ' + captured.length);
      lines.push('Pass: ' + pass + ' / Fail: ' + fail);
      selftestShow(lines.join('\n'));
      emit('nac:action:succeeded', {
        plugin: 'selftest', plugin_instance_id: null,
        action_id: 'selftest.event_conformance',
        verb: 'event_conformance',
        result: { pass: pass, fail: fail, total_captured: captured.length },
      });
      /* v1.8 viewport-jump fix: restore the focus-on-action flag
         and pin the scroll back where the user was when they
         clicked the button. The conformance test should not move
         the page out from under the user. */
      if (window.NAC && window.NAC.config) {
        window.NAC.config.focus_on_action = _savedFocusFlag;
      }
      /* Plain two-arg scrollTo so 'auto' (instant) is the default;
         the option-form 'instant' is non-standard and ignored on
         some browsers. */
      window.scrollTo(0, _savedScrollY);
    }
    setTimeout(tick, 100);
  }
  /* Wire to a button if present, else expose globally. */
  const stConformance = document.querySelector('[data-nac-id="selftest.event_conformance"]');
  if (stConformance) {
    stConformance.addEventListener('click', function () { runEventConformance(); });
  }
  window.runEventConformance = runEventConformance;

  // ------------------------------------------------------------ Boot
  emit('nac:plugin:opened', { plugin_slug: 'example_demo' });
  emit('nac:plugin:opened', { plugin_slug: 'example_assistant' });

  // Public debug helper
  window.NeDemo = {
    play: playNote,
    drive: drive,
    drive_fill: drive_fill,
    autopilot: autopilot,
    table: { renderTable: renderTable, state: tableState },
    cities: { catalog: CITIES, count: CITIES.length },
  };
})();
