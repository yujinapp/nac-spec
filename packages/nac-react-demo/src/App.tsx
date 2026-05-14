import { useEffect, useState, useRef } from 'react';
import { TODOS_MANIFEST, CHAT_MANIFEST } from './manifest';
import { useNACManifest, useNacChat, useAutopilot } from './useNAC';

interface Todo {
  id: string;
  text: string;
  done: boolean;
}

const STORAGE_KEY = 'nac-react-demo.todos';

function loadTodos(): Todo[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [
    { id: 't1', text: 'Try the chat: say "agrega tomar agua"', done: false },
    { id: 't2', text: 'Try voice: hold the mic and speak',     done: false },
    { id: 't3', text: 'Try autopilot: click "tour" in the topbar', done: false }
  ];
}

function saveTodos(todos: Todo[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(todos)); } catch {}
}

export function App() {
  const [todos, setTodos] = useState<Todo[]>(loadTodos);
  const [input, setInput] = useState('');
  const [chatOpen, setChatOpen] = useState(false);
  const inputDomRef = useRef<HTMLInputElement>(null);
  /* Mirror state into refs so onChatAction handlers always read
     the LATEST value. Closing handlers over `input` / `todos`
     directly traps a stale closure: when the LLM sends
     fill + click_by_verb in the same actions[] burst, the click
     handler runs before React re-renders. Fix #2 (2026-05-11). */
  const inputRef = useRef(input);
  useEffect(() => { inputRef.current = input; }, [input]);
  const todosRef = useRef(todos);
  useEffect(() => { todosRef.current = todos; }, [todos]);

  /* === Manifest registrations === */
  useNACManifest(TODOS_MANIFEST);
  useNACManifest(CHAT_MANIFEST);

  /* === Chat wiring === */
  useNacChat({
    endpoint:    '/crm/api/v1/yujin/nac-demo',
    chatLogId:   'chat-log',
    inputId:     'chat-input',
    sendBtnId:   'chat-send',
    langSelectId:'chat-lang',
    micBtnId:    'chat-mic',
    handsFreeBtnId: 'chat-handsfree',
    ttsBtnId:    'chat-tts',
    lang:        'en'
  });

  /* === Autopilot === */
  const autopilot = useAutopilot([
    { id: 'todos.list',    narrate: 'Welcome. This is the todo list.' },
    { id: 'todos.add.row', narrate: 'You can add a task here, or ask the chat to do it for you.' },
    { id: 'chat.input',    narrate: 'Try saying: agrega tomar agua. The chat resolves your intent and dispatches a NAC action.' }
  ]);

  /* === Persist === */
  useEffect(() => { saveTodos(todos); }, [todos]);

  /* === Sync chat panel open state to body === */
  useEffect(() => {
    document.body.setAttribute('data-chat-open', chatOpen ? '1' : '0');
  }, [chatOpen]);

  /* === Custom NAC action handlers ===
     Register ONCE on mount with empty deps so closures don't
     re-form on every keystroke. All state reads go through the
     refs above. State mutations use the functional setter form
     so they don't depend on closed-over state either. */
  useEffect(() => {
    if (!window.NacChat) return;

    /* Helper: stage-local text resolution so add_todo works
       whether the LLM sent (fill + click) OR (click with args.text). */
    function resolveAddText(a: any): string {
      const argsText = a?.args?.text || a?.text;
      if (typeof argsText === 'string' && argsText.trim()) return argsText.trim();
      return inputRef.current.trim();
    }

    function addTodoFromText(text: string) {
      setTodos(t => [...t, { id: 't' + Date.now(), text, done: false }]);
      setInput('');
      inputRef.current = '';
      inputDomRef.current?.focus();
    }

    /* click handler. */
    window.NacChat.onAction('click', (a: { nac_id: string }) => {
      const id = a.nac_id;
      if (id === 'todos.add') {
        const text = inputRef.current.trim();
        if (text) { addTodoFromText(text); return { ok: true }; }
        return { ok: false, error: 'input empty' };
      }
      if (id === 'todos.toggle_all') {
        setTodos(t => {
          const allDone = t.every(x => x.done);
          return t.map(x => ({ ...x, done: !allDone }));
        });
        return { ok: true };
      }
      if (id === 'todos.clear_done') {
        setTodos(t => t.filter(x => !x.done));
        return { ok: true };
      }
      const m = id.match(/^todos\.([^.]+)\.(delete|toggle)$/);
      if (m) {
        if (m[2] === 'delete') setTodos(t => t.filter(x => x.id !== m[1]));
        else                   setTodos(t => t.map(x => x.id === m[1] ? { ...x, done: !x.done } : x));
        return { ok: true };
      }
      const el = document.querySelector(`[data-nac-id="${id}"]`) as HTMLElement | null;
      if (el) { el.click(); return { ok: true }; }
      throw new Error('not_found: ' + id);
    });

    /* click_by_verb handler -- accepts args.text for add_todo. */
    window.NacChat.onAction('click_by_verb', (a: any) => {
      if (a.plugin === 'todos') {
        if (a.verb === 'add_todo') {
          const text = resolveAddText(a);
          if (text) { addTodoFromText(text); return { ok: true }; }
          return { ok: false, error: 'no text to add' };
        }
        if (a.verb === 'toggle_all') {
          setTodos(t => {
            const allDone = t.every(x => x.done);
            return t.map(x => ({ ...x, done: !allDone }));
          });
          return { ok: true };
        }
        if (a.verb === 'clear_done') {
          setTodos(t => t.filter(x => !x.done));
          return { ok: true };
        }
      }
      throw new Error('verb not handled: ' + a.verb);
    });

    /* fill handler -- updates BOTH React state AND inputRef so a
       subsequent click_by_verb that fires before re-render still
       sees the latest value. */
    window.NacChat.onAction('fill', (a: { nac_id: string; value: string }) => {
      if (a.nac_id === 'todos.input') {
        const v = String(a.value || '');
        inputRef.current = v;
        setInput(v);
        return { ok: true };
      }
      const el = document.querySelector(`[data-nac-id="${a.nac_id}"]`) as HTMLInputElement | null;
      if (el) {
        el.value = String(a.value || '');
        el.dispatchEvent(new Event('input', { bubbles: true }));
        return { ok: true };
      }
      throw new Error('not_found: ' + a.nac_id);
    });

    /* v2.3: payload-bearing action handler. An external agent
       can call NAC.utter('todos.add_quick', {text: 'tomar agua'})
       and we add the todo in a single round-trip. We listen for
       nac:action:requested on document, gate by action_id,
       process the payload, then emit nac:action:succeeded with
       the request_id echoed back so the runtime can resolve the
       caller's Promise. */
    const utterListener = (ev: Event) => {
      const ce = ev as CustomEvent;
      const detail = ce.detail || {};
      if (detail.action_id !== 'todos.add_quick') return;
      if (detail.verb !== 'utter') {
        document.dispatchEvent(new CustomEvent('nac:action:failed', {
          bubbles: true, composed: true,
          detail: {
            plugin:     'todos',
            action_id:  detail.action_id,
            request_id: detail.request_id,
            error:      'verb_not_supported',
            message:    'expected verb=utter, got ' + detail.verb
          }
        }));
        return;
      }
      const text = ((detail.payload && detail.payload.text) || '').trim();
      if (!text) {
        document.dispatchEvent(new CustomEvent('nac:action:failed', {
          bubbles: true, composed: true,
          detail: {
            plugin:     'todos',
            action_id:  detail.action_id,
            request_id: detail.request_id,
            error:      'empty_payload',
            message:    'utter payload requires non-empty text'
          }
        }));
        return;
      }
      const newId = 't' + Date.now();
      addTodoFromText(text);
      document.dispatchEvent(new CustomEvent('nac:action:succeeded', {
        bubbles: true, composed: true,
        detail: {
          plugin:     'todos',
          action_id:  detail.action_id,
          request_id: detail.request_id,
          verb:       'utter',
          ack: {
            todo_id:    newId,
            text:       text,
            lang:       detail.payload && detail.payload.lang,
            via:        'v2.3_payload_bearing'
          }
        }
      }));
    };
    document.addEventListener('nac:action:requested', utterListener);
    /* Cleanup omitted intentionally: this effect runs ONCE for the
       app lifetime; listener is global to the page. Strict-mode
       double-mount in dev would double-listen but the same
       action_id will be handled twice (idempotency burden on the
       agent's invoker, who must dedup by request_id). */
  }, []); /* register ONCE; refs carry the latest state */

  /* === Mutations === */
  function addTodo() {
    const text = input.trim();
    if (!text) return;
    setTodos(t => [...t, { id: 't' + Date.now(), text, done: false }]);
    setInput('');
    inputRef.current = '';
    inputDomRef.current?.focus();
  }
  function deleteTodo(id: string) {
    setTodos(t => t.filter(x => x.id !== id));
  }
  function toggleTodo(id: string) {
    setTodos(t => t.map(x => x.id === id ? { ...x, done: !x.done } : x));
  }
  function toggleAll() {
    const allDone = todos.every(t => t.done);
    setTodos(t => t.map(x => ({ ...x, done: !allDone })));
  }
  function clearDone() {
    setTodos(t => t.filter(x => !x.done));
  }

  const stats = {
    total:  todos.length,
    done:   todos.filter(t => t.done).length,
    open:   todos.filter(t => !t.done).length
  };

  return (
    <div>
      <header className="topbar">
        <span className="brand">NAC + React<small>study case</small></span>
        <span className="pill">v2.3</span>
        <div className="spacer" />
        <button onClick={() => autopilot.start()}
                aria-label="Start guided tour"
                data-nac-id="app.autopilot"
                data-nac-role="action"
                data-nac-action="autopilot">
          tour
        </button>
        <button onClick={() => setChatOpen(o => !o)}
                aria-pressed={chatOpen}
                aria-label="Toggle chat panel"
                data-nac-id="app.chat.toggle"
                data-nac-role="action"
                data-nac-action="chat_toggle">
          chat
        </button>
      </header>

      <div className="app" data-nac-plugin="todos">
        <h1>Todos</h1>
        <p className="lede">
          A four-screen React app that consumes <code>@nac3/runtime</code> from npm.
          Drive it with your keyboard, the chat, your voice, or the autopilot button.
        </p>

        <div className="add-row"
             data-nac-id="todos.add.row"
             data-nac-role="region">
          <input
            ref={inputDomRef}
            type="text"
            value={input}
            onChange={e => { setInput(e.target.value); inputRef.current = e.target.value; }}
            onKeyDown={e => { if (e.key === 'Enter') addTodo(); }}
            placeholder="What needs doing?"
            data-nac-id="todos.input"
            data-nac-role="field"
          />
          <button onClick={addTodo}
                  data-nac-id="todos.add"
                  data-nac-role="action"
                  data-nac-action="add_todo">
            Add
          </button>
        </div>

        <ul className="todo-list"
            data-nac-id="todos.list"
            data-nac-role="region">
          {todos.map(todo => (
            <li key={todo.id}
                className={'todo-item' + (todo.done ? ' done' : '')}
                data-nac-id={`todos.${todo.id}`}
                data-nac-role="region">
              <input type="checkbox"
                     checked={todo.done}
                     onChange={() => toggleTodo(todo.id)}
                     aria-label={`Mark ${todo.text} as ${todo.done ? 'open' : 'done'}`}
                     data-nac-id={`todos.${todo.id}.toggle`}
                     data-nac-role="field" />
              <span className="text">{todo.text}</span>
              <button onClick={() => deleteTodo(todo.id)}
                      aria-label={`Delete ${todo.text}`}
                      data-nac-id={`todos.${todo.id}.delete`}
                      data-nac-role="action"
                      data-nac-action="delete">
                delete
              </button>
            </li>
          ))}
        </ul>

        <div className="stats">
          <strong>{stats.open}</strong> open / <strong>{stats.done}</strong> done /{' '}
          <strong>{stats.total}</strong> total
          {' '}
          <button onClick={toggleAll}
                  data-nac-id="todos.toggle_all"
                  data-nac-role="action"
                  data-nac-action="toggle_all"
                  style={{ marginLeft: 12 }}>
            mark all
          </button>
          <button onClick={clearDone}
                  data-nac-id="todos.clear_done"
                  data-nac-role="action"
                  data-nac-action="clear_done"
                  style={{ marginLeft: 6 }}>
            clear done
          </button>
        </div>
      </div>

      {/* Chat panel */}
      <aside className="chat" data-nac-plugin="chat" aria-hidden={!chatOpen}>
        <header className="chat-head">
          <span className="brand">Yujin chat</span>
          <select id="chat-lang"
                  data-nac-id="chat.lang"
                  data-nac-role="field"
                  defaultValue="en"
                  aria-label="Chat language">
            <option value="es">es</option>
            <option value="en">en</option>
            <option value="pt">pt</option>
            <option value="fr">fr</option>
            <option value="it">it</option>
            <option value="de">de</option>
            <option value="ja">ja</option>
            <option value="zh">zh</option>
            <option value="hi">hi</option>
            <option value="ar">ar</option>
          </select>
          <button id="chat-tts"
                  data-nac-id="chat.tts"
                  data-nac-role="action"
                  data-nac-action="toggle_tts"
                  aria-pressed="true">tts</button>
        </header>
        <div id="chat-log"
             className="chat-log"
             data-nac-id="chat.log"
             data-nac-role="region"
             aria-live="polite" />
        <div className="chat-tools">
          <button id="chat-mic"
                  data-nac-id="chat.mic"
                  data-nac-role="action"
                  data-nac-action="push_to_talk"
                  aria-pressed="false">mic</button>
          <button id="chat-handsfree"
                  data-nac-id="chat.voice.always_on"
                  data-nac-role="action"
                  data-nac-action="toggle_handsfree"
                  aria-pressed="false">hands-free</button>
        </div>
        <div className="chat-input-row">
          <input id="chat-input"
                 data-nac-id="chat.input"
                 data-nac-role="field"
                 placeholder="ask anything / try: agrega tomar agua"
                 autoComplete="off" />
          <button id="chat-send"
                  data-nac-id="chat.send"
                  data-nac-role="action"
                  data-nac-action="send">
            send
          </button>
        </div>
      </aside>
    </div>
  );
}
