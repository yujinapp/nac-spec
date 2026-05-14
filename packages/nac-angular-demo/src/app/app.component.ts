import { Component, OnInit, AfterViewInit, signal, computed, effect, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NacService } from './nac.service';
import { TODOS_MANIFEST, CHAT_MANIFEST } from './manifest';

interface Todo {
  id: string;
  text: string;
  done: boolean;
}

const STORAGE_KEY = 'nac-angular-demo.todos';

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

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <header class="topbar">
      <span class="brand">NAC + Angular<small>study case</small></span>
      <span class="pill">v2.3</span>
      <div class="spacer"></div>
      <button (click)="startAutopilot()"
              data-nac-id="app.autopilot"
              data-nac-role="action"
              data-nac-action="autopilot">
        tour
      </button>
      <button (click)="toggleChat()"
              [attr.aria-pressed]="chatOpen()"
              data-nac-id="app.chat.toggle"
              data-nac-role="action"
              data-nac-action="chat_toggle">
        chat
      </button>
    </header>

    <div class="app" data-nac-plugin="todos">
      <h1>Todos</h1>
      <p class="lede">
        Angular 17 standalone + <code>&#64;yujin/nac</code> from npm. Same shape as the React demo.
      </p>

      <div class="add-row" data-nac-id="todos.add.row" data-nac-role="region">
        <input type="text"
               [(ngModel)]="input"
               (keyup.enter)="addTodo()"
               placeholder="What needs doing?"
               data-nac-id="todos.input"
               data-nac-role="field" />
        <button (click)="addTodo()"
                data-nac-id="todos.add"
                data-nac-role="action"
                data-nac-action="add_todo">
          Add
        </button>
      </div>

      <ul class="todo-list" data-nac-id="todos.list" data-nac-role="region">
        <li *ngFor="let todo of todos()"
            class="todo-item"
            [class.done]="todo.done"
            [attr.data-nac-id]="'todos.' + todo.id"
            data-nac-role="region">
          <input type="checkbox"
                 [checked]="todo.done"
                 (change)="toggleTodo(todo.id)"
                 [attr.aria-label]="'Mark ' + todo.text + ' as ' + (todo.done ? 'open' : 'done')"
                 [attr.data-nac-id]="'todos.' + todo.id + '.toggle'"
                 data-nac-role="field" />
          <span class="text">{{ todo.text }}</span>
          <button (click)="deleteTodo(todo.id)"
                  [attr.aria-label]="'Delete ' + todo.text"
                  [attr.data-nac-id]="'todos.' + todo.id + '.delete'"
                  data-nac-role="action"
                  data-nac-action="delete">
            delete
          </button>
        </li>
      </ul>

      <div class="stats">
        <strong>{{ openCount() }}</strong> open /
        <strong>{{ doneCount() }}</strong> done /
        <strong>{{ total() }}</strong> total
        <button (click)="toggleAll()"
                data-nac-id="todos.toggle_all"
                data-nac-role="action"
                data-nac-action="toggle_all">mark all</button>
        <button (click)="clearDone()"
                data-nac-id="todos.clear_done"
                data-nac-role="action"
                data-nac-action="clear_done">clear done</button>
      </div>
    </div>

    <aside class="chat" data-nac-plugin="chat" [attr.aria-hidden]="!chatOpen()">
      <header class="chat-head">
        <span class="brand">Yujin chat</span>
        <select id="chat-lang" data-nac-id="chat.lang" data-nac-role="field">
          <option value="es">es</option>
          <option value="en" selected>en</option>
          <option value="pt">pt</option>
          <option value="fr">fr</option>
          <option value="it">it</option>
          <option value="de">de</option>
          <option value="ja">ja</option>
          <option value="zh">zh</option>
          <option value="hi">hi</option>
          <option value="ar">ar</option>
        </select>
        <button id="chat-tts" data-nac-id="chat.tts" data-nac-role="action" data-nac-action="toggle_tts" aria-pressed="true">tts</button>
      </header>
      <div id="chat-log" class="chat-log" data-nac-id="chat.log" data-nac-role="region" aria-live="polite"></div>
      <div class="chat-tools">
        <button id="chat-mic" data-nac-id="chat.mic" data-nac-role="action" data-nac-action="push_to_talk" aria-pressed="false">mic</button>
        <button id="chat-handsfree" data-nac-id="chat.voice.always_on" data-nac-role="action" data-nac-action="toggle_handsfree" aria-pressed="false">hands-free</button>
      </div>
      <div class="chat-input-row">
        <input id="chat-input" data-nac-id="chat.input" data-nac-role="field" placeholder="ask anything" autocomplete="off" />
        <button id="chat-send" data-nac-id="chat.send" data-nac-role="action" data-nac-action="send">send</button>
      </div>
    </aside>
  `
})
export class AppComponent implements OnInit, AfterViewInit {
  private nac = inject(NacService);

  todos    = signal<Todo[]>(loadTodos());
  input    = '';
  chatOpen = signal(false);

  total     = computed(() => this.todos().length);
  doneCount = computed(() => this.todos().filter(t => t.done).length);
  openCount = computed(() => this.todos().filter(t => !t.done).length);

  constructor() {
    /* Persist + reflect chat-open state on body. */
    effect(() => {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(this.todos())); } catch {}
    });
    effect(() => {
      document.body.setAttribute('data-chat-open', this.chatOpen() ? '1' : '0');
    });
  }

  ngOnInit() {
    /* Register both manifests on init. */
    this.nac.register(TODOS_MANIFEST);
    this.nac.register(CHAT_MANIFEST);
  }

  ngAfterViewInit() {
    /* Wire chat client to the DOM nodes that are now in the tree. */
    this.nac.initChat({
      endpoint:    '/crm/api/v1/yujin/nac-demo',
      lang:        'en',
      chatLog:     document.getElementById('chat-log'),
      input:       document.getElementById('chat-input'),
      sendBtn:     document.getElementById('chat-send'),
      langSelect:  document.getElementById('chat-lang'),
      micBtn:      document.getElementById('chat-mic'),
      handsFreeBtn:document.getElementById('chat-handsfree'),
      ttsBtn:      document.getElementById('chat-tts')
    });

    /* Custom action handlers so chat-driven verbs route through
       Angular signals instead of DOM clicks. */
    this.nac.onChatAction('click_by_verb', (a: { plugin?: string; verb: string }) => {
      if (a.plugin === 'todos') {
        if (a.verb === 'add_todo' && this.input.trim()) { this.addTodo(); return { ok: true }; }
        if (a.verb === 'toggle_all')                    { this.toggleAll(); return { ok: true }; }
        if (a.verb === 'clear_done')                    { this.clearDone(); return { ok: true }; }
      }
      throw new Error('verb not handled: ' + a.verb);
    });
    this.nac.onChatAction('click', (a: { nac_id: string }) => {
      const id = a.nac_id;
      if (id === 'todos.add' && this.input.trim()) { this.addTodo(); return { ok: true }; }
      if (id === 'todos.toggle_all')               { this.toggleAll(); return { ok: true }; }
      if (id === 'todos.clear_done')               { this.clearDone(); return { ok: true }; }
      const m = id.match(/^todos\.([^.]+)\.(delete|toggle)$/);
      if (m) {
        if (m[2] === 'delete') this.deleteTodo(m[1]);
        else                   this.toggleTodo(m[1]);
        return { ok: true };
      }
      const el = document.querySelector('[data-nac-id="' + id + '"]') as HTMLElement | null;
      if (el) { el.click(); return { ok: true }; }
      throw new Error('not_found: ' + id);
    });
    this.nac.onChatAction('fill', (a: { nac_id: string; value: string }) => {
      if (a.nac_id === 'todos.input') { this.input = String(a.value || ''); return { ok: true }; }
      const el = document.querySelector('[data-nac-id="' + a.nac_id + '"]') as HTMLInputElement | null;
      if (el) {
        el.value = String(a.value || '');
        el.dispatchEvent(new Event('input', { bubbles: true }));
        return { ok: true };
      }
      throw new Error('not_found: ' + a.nac_id);
    });

    /* v2.3: payload-bearing action listener. Mirror of the React
       demo. An agent calls NAC.utter('todos.add_quick', {text})
       and we add the todo in a single round-trip by listening
       for nac:action:requested at document level, gating by
       action_id, processing payload, then emitting
       nac:action:succeeded with request_id echoed back. */
    document.addEventListener('nac:action:requested', (ev: Event) => {
      const ce = ev as CustomEvent;
      const detail: any = ce.detail || {};
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
      const text = String((detail.payload && detail.payload.text) || '').trim();
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
      this.todos.update(t => [...t, { id: newId, text, done: false }]);
      document.dispatchEvent(new CustomEvent('nac:action:succeeded', {
        bubbles: true, composed: true,
        detail: {
          plugin:     'todos',
          action_id:  detail.action_id,
          request_id: detail.request_id,
          verb:       'utter',
          ack: {
            todo_id: newId,
            text:    text,
            lang:    detail.payload && detail.payload.lang,
            via:     'v2.3_payload_bearing'
          }
        }
      }));
    });
  }

  /* === Actions === */
  addTodo() {
    const text = this.input.trim();
    if (!text) return;
    this.todos.update(t => [...t, { id: 't' + Date.now(), text, done: false }]);
    this.input = '';
  }
  deleteTodo(id: string)  { this.todos.update(t => t.filter(x => x.id !== id)); }
  toggleTodo(id: string)  { this.todos.update(t => t.map(x => x.id === id ? { ...x, done: !x.done } : x)); }
  toggleAll() {
    const allDone = this.todos().every(t => t.done);
    this.todos.update(t => t.map(x => ({ ...x, done: !allDone })));
  }
  clearDone()             { this.todos.update(t => t.filter(x => !x.done)); }

  toggleChat()            { this.chatOpen.update(o => !o); }

  async startAutopilot() {
    const steps = [
      { id: 'todos.list',    narrate: 'Welcome. This is the todo list.' },
      { id: 'todos.add.row', narrate: 'Add a task here, or ask the chat to do it.' },
      { id: 'chat.input',    narrate: 'Try saying: agrega tomar agua.' }
    ];
    let abort = false;
    const onAbort = () => { abort = true; };
    window.addEventListener('keydown',   onAbort, { once: true });
    window.addEventListener('mousedown', onAbort, { once: true });
    for (const step of steps) {
      if (abort) break;
      const el = document.querySelector('[data-nac-id="' + step.id + '"]') as HTMLElement | null;
      if (!el) continue;
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      el.setAttribute('data-autopilot', 'active');
      try { this.nac.botSpeak(step.narrate); } catch {}
      await new Promise(r => setTimeout(r, 3500));
      el.removeAttribute('data-autopilot');
    }
    window.removeEventListener('keydown',   onAbort);
    window.removeEventListener('mousedown', onAbort);
  }
}
