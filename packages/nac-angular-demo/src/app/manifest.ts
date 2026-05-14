/* The NAC manifest for the todos app + the chat panel.
   Mirrors the React demo. Both plugins carry full 10-locale labels. */

const li = (
  es:string, en:string, pt:string, fr:string, it:string,
  de:string, ja:string, zh:string, hi:string, ar:string
) => ({ es, en, pt, fr, it, de, ja, zh, hi, ar });

export const TODOS_MANIFEST = {
  plugin_slug: 'todos',
  version:     '1.1.0',
  nac_version: '2.3',
  elements: [
    { id: 'todos.list', role: 'region',
      label_i18n: li('Lista','Todo list','Lista','Liste','Lista','Liste','一覧','列表','list','قائمة') },
    { id: 'todos.add.row', role: 'region',
      label_i18n: li('Agregar','Add row','Adicionar','Ajouter','Aggiungi','Hinzufuegen','追加','添加','jodo','أضف') },
    { id: 'todos.input', role: 'field',
      label_i18n: li('Texto','Text','Texto','Texte','Testo','Text','テキスト','文本','text','نص') },
    { id: 'todos.add', role: 'action',
      actions: [{ verb: 'add_todo', label_i18n: li('Agregar','Add','Adicionar','Ajouter','Aggiungi','Hinzufuegen','追加','添加','jodo','أضف') }],
      label_i18n: li('Agregar','Add','Adicionar','Ajouter','Aggiungi','Hinzufuegen','追加','添加','jodo','أضف') },

    /* v2.3: payload-bearing one-shot add. Mirror of the React
       demo's todos.add_quick. An agent calls
       NAC.utter('todos.add_quick', {text:'tomar agua'}) and the
       host adds the todo in a single round-trip. */
    { id: 'todos.add_quick', role: 'action',
      actions: [
        { verb: 'utter',
          payload_schema: {
            text: { type: 'string', required: true, max: 200 },
            lang: { type: 'string',
                    enum: ['es','en','pt','fr','it','de','ja','zh','hi','ar'] }
          },
          label_i18n: li('Decir tarea','Speak task','Falar tarefa','Dire tache','Detta attivita','Aufgabe sagen','タスクを言う','说任务','task bolo','أملي مهمة') }
      ],
      label_i18n: li('Decir tarea','Speak task','Falar tarefa','Dire tache','Detta attivita','Aufgabe sagen','タスクを言う','说任务','task bolo','أملي مهمة') },

    { id: 'todos.toggle_all', role: 'action',
      actions: [{ verb: 'toggle_all', label_i18n: li('Marcar todas','Mark all','Marcar todas','Tout marquer','Segna tutte','Alle markieren','すべて','全部','sab','اعتبر') }],
      label_i18n: li('Marcar todas','Mark all','Marcar todas','Tout marquer','Segna tutte','Alle markieren','すべて','全部','sab','اعتبر') },
    { id: 'todos.clear_done', role: 'action',
      actions: [{ verb: 'clear_done', label_i18n: li('Limpiar','Clear done','Limpar','Effacer','Cancella','Loeschen','クリア','清除','done hatao','امسح') }],
      label_i18n: li('Limpiar','Clear done','Limpar','Effacer','Cancella','Loeschen','クリア','清除','done hatao','امسح') }
  ]
};

export const CHAT_MANIFEST = {
  plugin_slug: 'chat',
  version:     '1.1.0',
  nac_version: '2.3',
  elements: [
    { id: 'chat.lang', role: 'field',
      label_i18n: li('Idioma','Language','Idioma','Langue','Lingua','Sprache','言語','语言','bhasha','لغة') },
    { id: 'chat.tts', role: 'action',
      actions: [{ verb: 'toggle_tts', label_i18n: li('TTS','TTS','TTS','TTS','TTS','TTS','TTS','TTS','TTS','TTS') }],
      label_i18n: li('TTS','TTS','TTS','TTS','TTS','TTS','TTS','TTS','TTS','TTS') },
    { id: 'chat.mic', role: 'action',
      actions: [{ verb: 'push_to_talk', label_i18n: li('Hablar','Talk','Falar','Parler','Parla','Sprechen','話す','说话','bole','تحدث') }],
      label_i18n: li('Mic','Mic','Mic','Mic','Mic','Mic','マイク','麦克风','mic','مايك') },
    { id: 'chat.input', role: 'field',
      label_i18n: li('Mensaje','Message','Mensagem','Message','Messaggio','Nachricht','メッセージ','消息','sandesh','رسالة') },
    { id: 'chat.send', role: 'action',
      actions: [{ verb: 'send', label_i18n: li('Enviar','Send','Enviar','Envoyer','Invia','Senden','送信','发送','bheje','إرسال') }],
      label_i18n: li('Enviar','Send','Enviar','Envoyer','Invia','Senden','送信','发送','bheje','إرسال') },
    { id: 'chat.log', role: 'region',
      label_i18n: li('Conversacion','Conversation','Conversa','Conversation','Conversazione','Unterhaltung','会話','对话','baat','محادثة') }
  ]
};
