/* The NAC manifest for the todos app + the chat panel. Two
   plugins, both with full 10-locale labels.

   This is the agent-facing source of truth. An LLM that hears
   "agregar tomar agua" or "borra el primer todo" looks up the
   verbs declared here, picks one, and emits a structured action
   the chat client dispatches via NAC.click_by_verb(). */

const li = (es:string,en:string,pt:string,fr:string,it:string,
            de:string,ja:string,zh:string,hi:string,ar:string) =>
  ({ es, en, pt, fr, it, de, ja, zh, hi, ar });

export const TODOS_MANIFEST = {
  plugin_slug: 'todos',
  version:     '1.1.0',
  nac_version: '2.3',
  elements: [
    /* Layout regions. */
    { id: 'todos.list', role: 'region',
      label_i18n: li('Lista de tareas','Todo list','Lista de tarefas','Liste de taches','Lista delle attivita','Aufgabenliste','タスク一覧','任务列表','task list','قائمة المهام') },
    { id: 'todos.add.row', role: 'region',
      label_i18n: li('Agregar tarea','Add a task','Adicionar tarefa','Ajouter tache','Aggiungi attivita','Aufgabe hinzufuegen','タスク追加','添加任务','task jodo','أضف مهمة') },

    /* The text field for new todos. */
    { id: 'todos.input', role: 'field',
      label_i18n: li('Texto de la tarea','Task text','Texto da tarefa','Texte de la tache','Testo attivita','Aufgabentext','タスク内容','任务内容','task ka text','نص المهمة') },

    /* The "add" button verb=add_todo. */
    { id: 'todos.add', role: 'action',
      actions: [{ verb: 'add_todo',
        label_i18n: li('Agregar tarea','Add task','Adicionar','Ajouter','Aggiungi','Hinzufuegen','追加','添加','jodo','أضف') }],
      label_i18n: li('Agregar','Add','Adicionar','Ajouter','Aggiungi','Hinzufuegen','追加','添加','jodo','أضف') },

    /* v2.3: payload-bearing one-shot add. An external agent (or
       chat) calls NAC.utter('todos.add_quick', {text:'tomar agua'})
       and the host adds the todo in a single round-trip, instead
       of the two-step fill+click dance. Demonstrates the v2.3
       payload-bearing contract end-to-end. */
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

    /* Mark all done / clear completed verbs at the bottom. */
    { id: 'todos.toggle_all', role: 'action',
      actions: [{ verb: 'toggle_all',
        label_i18n: li('Marcar todas','Mark all','Marcar todas','Tout marquer','Segna tutte','Alle markieren','すべて完了','全部完成','sab done','اعتبر الكل') }],
      label_i18n: li('Marcar todas','Mark all','Marcar todas','Tout marquer','Segna tutte','Alle markieren','すべて完了','全部完成','sab done','اعتبر الكل') },
    { id: 'todos.clear_done', role: 'action',
      actions: [{ verb: 'clear_done',
        label_i18n: li('Borrar completadas','Clear done','Limpar concluidas','Effacer faites','Cancella fatte','Erledigte loeschen','完了削除','清除完成','done hatao','امسح الكل') }],
      label_i18n: li('Borrar completadas','Clear done','Limpar concluidas','Effacer faites','Cancella fatte','Erledigte loeschen','完了削除','清除完成','done hatao','امسح الكل') }
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

/* Per-todo manifest entries are emitted dynamically by the
   TodoItem component (each todo gets its own data-nac-id +
   role='action' for the delete button + role='field' for the
   completed checkbox). They do not need to be in the static
   manifest; auto-register from DOM picks them up. */
