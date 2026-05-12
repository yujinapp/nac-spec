---
translation_source: docs/CASE_STUDIES_DISCOVERY.md
translation_source_hash: 59b940d486104c6a9b42d59c1ee6f16c25eb01c0c08b8b98458c68ef4312ed77
translation_quality: machine_v1
translation_lang: de
translation_date: 2026-05-11T14:48:24.814115+00:00
---

# Fallstudien -- autonom entdeckte Demo-Bugs

Bugs, die beim diagnostischen Playwright-Sweep gegen
`yujin.app/nac-spec/demos/react/` und `/demos/angular/` gefunden wurden. Pablo
bat mich am 2026-05-11, diese ohne vorherige Benennung der Symptome zu entdecken, zu dokumentieren und zu beheben. Diese Datei dokumentiert den Entdeckungsprozess und die Korrekturen.

---

## Bug #1 (HOCH) -- LLM-Vermittler sieht das App-Manifest nicht

**Betroffene Demos:** React + Angular.

**Symptom (beobachtbar):** Wenn der Benutzer „hola" im Chat-Panel
des React- oder Angular-Demos eingibt, antwortet der Chat mit einem
generischen „How can I help you with this page?" -- ohne zu wissen, dass
es sich um eine Todos-App handelt. Wenn der Benutzer „agrega tomar agua" sagt, kann das
LLM `click_by_verb('todos', 'add_todo')` nicht ausführen, weil
es dieses Plugin nicht kennt.

**Entdeckungsmethode.** Die Diagnose-Spec erfasst jede
`page.console`-Meldung während der Chat-Interaktion. Der Chat-Client
protokolliert:

```
[nac-chat] snapshot plugins (1): chat
[nac-chat] backend response: message="Hi! How can I help you with this page?" actions=[]
```

`snapshot plugins (1): chat` ist das entscheidende Indiz -- im Snapshot, der an das LLM
gesendet wird, erscheint nur EIN Plugin: `chat`.
Das `todos`-Plugin -- das die Demo über
`NAC.register(TODOS_MANIFEST)` registriert -- fehlt.

**Grundursache.** `NAC.describe()` zählt Plugins auf, indem es den
DOM nach `[data-nac-plugin="..."]`-Elementen durchsucht (Zeile ~1557 von
`yujin.app/nac-spec/js/nac.js`). Das Chat-Panel
`<aside class="chat" data-nac-plugin="chat">` besitzt das Attribut;
der Todos-Bereich der App hingegen NICHT. Die Laufzeitumgebung erkennt den
Todos-Bereich nie als Plugin-Scope, daher auch `describe()` nicht,
`snapshotTree()` nicht und das LLM nicht.

Die Manifest-Registrierung über `NAC.register(...)` befüllt zwar die
interne `_manifests`-Map, hängt aber KEIN
`data-nac-plugin`-Attribut automatisch an den DOM. Das liegt in der Verantwortung des Aufrufers.

**Behebung.** `data-nac-plugin="todos"` zum Haupt-App-Container
in beiden Demos hinzufügen:

- React: `<div className="app">` -> `<div className="app" data-nac-plugin="todos">`
- Angular: `<div class="app">` im Template -> `<div class="app" data-nac-plugin="todos">`

Nach der Behebung gibt `NAC.describe()` 2 Plugins zurück (`todos` +
`chat`), der Snapshot enthält beide Manifeste, und das LLM kann
verbbasierte Aktionen gegen `todos.*` ausführen.

**Lektion für das Handbuch.** Der NAC3-Vertrag erfordert BEIDES:
1. `NAC.register(manifest)` zur Deklaration des Schemas.
2. `data-nac-plugin="<slug>"` an einem DOM-Root, um das Plugin
   in den Scope-Baum einzutragen.

Die Einführungsleitfäden und das NAC_TEST_MANUAL sollten dies
explizit hervorheben. Ein häufiger Fehler bei der Einbindung ist, das Manifest zu registrieren
und das DOM-Attribut zu vergessen, was genau das oben beschriebene „LLM ist blind"-Symptom erzeugt. Zu `stage2-disambiguation.mjs` sollte ein Regressionstest hinzugefügt werden: Der Snapshot muss JEDES registrierte Plugin enthalten, andernfalls wird ein Befund gemeldet.

---

## Bug #2 (MITTEL) -- React `onChatAction`-Handler schließen über veralteten State

**Betroffenes Demo:** Nur React. Angulars Signals + `update()` machen
diese Kategorie nicht anwendbar.

**Symptom (beobachtbar):** Nach dem Einspielen von Fix #1 fügt die chat-gesteuerte
Verb-Ausführung immer noch keine Todos hinzu. Das Senden von „agrega leche"
führt zu keinem neuen Todo. Das LLM gibt korrekt die zweiteilige Aktionssequenz aus
(`fill todos.input "leche"` + `click_by_verb todos
add_todo`), aber der `add_todo`-Handler sieht `input.trim() === ''`
und kehrt stillschweigend zurück, ohne `addTodo()` aufzurufen.

**Entdeckungsmethode.** Der Deep-Discovery-Playwright-Sweep
(Runde 2) erfasst die Zeilenanzahl vor und nach einem chat-gesteuerten
Hinzufügen. Befunde:

```
[WARN] chat.dispatch: [react] chat "agrega leche" did not add a
todo (before=3, after=3). May be LLM hallucination or dispatch
broken.
```

**Grundursache.** Der `useEffect` in `App.tsx` für die Chat-Handler-
Registrierung hat die Abhängigkeiten `[input, todos]`. Die Handler schließen über
die React-State-Werte ZUM ZEITPUNKT DER REGISTRIERUNG. Wenn das LLM
`actions[]` synchron sendet, führt der Chat-Client folgendes aus:
1. `fill todos.input "leche"` -> `setInput('leche')` stellt ein
   Re-Render in die Warteschlange.
2. `click_by_verb todos add_todo` -> läuft SOFORT, im selben
   JS-Task. React hat noch kein Re-Render durchgeführt. Der Closure des Handlers
   hat noch `input === ''`. Die `input.trim()`-Prüfung schlägt fehl;
   `addTodo()` wird nie ausgeführt.

Dies ist das klassische React-Closure-vs.-veralteter-State-Problem.

**Behebung.** Eine `useRef` verwenden, die `input` spiegelt; der Handler liest
aus der Ref (immer aktueller Wert) statt aus dem Closure.
Gleiches Muster für `todos`, falls zukünftige Verben es benötigen.

```ts
const inputRef = useRef(input);
useEffect(() => { inputRef.current = input; }, [input]);

useEffect(() => {
  if (!window.NacChat) return;
  window.NacChat.onAction('click_by_verb', (a) => {
    if (a.plugin === 'todos' && a.verb === 'add_todo') {
      const text = (a as any).args?.text || inputRef.current.trim();
      if (text) {
        addTodoFromText(text);
        return { ok: true };
      }
    }
    ...
  });
}, []); // einmalig registrieren
```

Bonus: Auch akzeptieren, dass das LLM den Text direkt in
`args.text` übergibt, sodass auch Apps funktionieren, die nicht erst befüllen und dann klicken.

**Lektion für das Handbuch.** Beim Verdrahten von NAC3-chat-gesteuerten Verben in
React NIEMALS Handler direkt über State schließen. Refs oder
das funktionale Setter-Muster verwenden. Einen Abschnitt „Häufige Fallstricke"
zum React-Einführungsleitfaden (`guides/REACT.md`) und zum Test-Handbuch hinzufügen.

---

## Bug #3 (AUSSTEHEND)

Ausstehend bis Diagnose-Runde 3.

---

## Loop-Protokoll

| Runde | Zeitpunkt | React-Fehler | Angular-Fehler | Gemeldete Bugs |
|-------|-----------|--------------|----------------|----------------|
| 1 | 2026-05-11 02:10 | 0 im Surface-Scan | 0 im Surface-Scan | #1 (Manifest-Abdeckung) via Konsolen-Parsing gefunden |

Die strukturellen Prüfungen der Diagnose-Spec (NAC gemountet,
`validate_global` sauber, Manifeste in der Registry, Todos-CRUD funktioniert,
Chat-Toggle funktioniert) sind alle GRÜN. Die Bugs zeigen sich in tieferer
Semantik, z. B. „Sieht das LLM tatsächlich, was wir registriert haben?".
Zukünftige Diagnose-Runden ergänzen: Aktionsform nach LLM-Antwort,
Verifizierung der Dispatch-Ausführung, Verifizierung der `dt_state`-Mutationspropagation
durch den Framework-State, Verifizierung des vollständigen Autopilot-Ablaufs,
Verifizierung der Locale-Umschaltung per Chat.

---

*This is a machine translation of the canonical English
version at `/nac-spec/docs/CASE_STUDIES_DISCOVERY.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
