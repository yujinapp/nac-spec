---
translation_source: docs/CASE_STUDIES_DISCOVERY.md
translation_source_hash: 59b940d486104c6a9b42d59c1ee6f16c25eb01c0c08b8b98458c68ef4312ed77
translation_quality: machine_v1
translation_lang: it
translation_date: 2026-05-11T14:34:24.831111+00:00
---

# Case study -- bug scoperti autonomamente nelle demo

Bug trovati dalla scansione diagnostica Playwright su
`yujin.app/nac-spec/demos/react/` e `/demos/angular/`. Pablo
mi ha chiesto il 2026-05-11 di scoprire + documentare + correggere
senza indicarmi i sintomi. Questo file registra il processo di
scoperta e le correzioni.

---

## Bug #1 (ALTO) -- L'intermediario LLM non vede il manifest dell'app

**Demo interessate:** React + Angular.

**Sintomo (osservabile):** Quando l'utente scrive "hola" nel
pannello chat della demo React o Angular, la chat risponde con un
generico "How can I help you with this page?" -- senza sapere che
si tratta di un'app per i todo. Quando l'utente scrive "agrega
tomar agua", l'LLM non riesce a eseguire
`click_by_verb('todos', 'add_todo')` perché non sa che quel plugin
esiste.

**Metodo di scoperta.** La spec diagnostica cattura ogni messaggio
`page.console` durante l'interazione con la chat. Il client di
chat registra:

```
[nac-chat] snapshot plugins (1): chat
[nac-chat] backend response: message="Hi! How can I help you with this page?" actions=[]
```

`snapshot plugins (1): chat` è la prova schiacciante -- nello
snapshot inviato all'LLM compare UN SOLO plugin, `chat`. Il plugin
`todos` -- che la demo registra tramite `NAC.register(TODOS_MANIFEST)`
-- è assente.

**Causa radice.** `NAC.describe()` enumera i plugin scorrendo il
DOM alla ricerca di elementi `[data-nac-plugin="..."]` (riga ~1557
di `yujin.app/nac-spec/js/nac.js`). Il pannello chat
`<aside class="chat" data-nac-plugin="chat">` ha l'attributo; la
regione todos dell'app NON ce l'ha. Il runtime non riconosce mai
la regione todos come scope di plugin, e di conseguenza nemmeno
`describe()`, nemmeno `snapshotTree()`, nemmeno l'LLM.

La registrazione del manifest tramite `NAC.register(...)` popola
la mappa interna `_manifests` ma NON aggiunge automaticamente
l'attributo `data-nac-plugin` al DOM. Questo è compito del
chiamante.

**Correzione.** Aggiungere `data-nac-plugin="todos"` al
contenitore principale dell'app in entrambe le demo:

- React: `<div className="app">` -> `<div className="app" data-nac-plugin="todos">`
- Angular: `<div class="app">` nel template -> `<div class="app" data-nac-plugin="todos">`

Dopo la correzione, `NAC.describe()` restituisce 2 plugin (`todos`
+ `chat`), lo snapshot include entrambi i manifest e l'LLM può
eseguire azioni basate su verbi contro `todos.*`.

**Lezione per il manuale.** Il contratto NAC3 richiede ENTRAMBE le
operazioni:
1. `NAC.register(manifest)` per dichiarare lo schema.
2. `data-nac-plugin="<slug>"` su un nodo DOM radice per iscrivere
   il plugin nell'albero degli scope.

Le guide di adozione e il NAC_TEST_MANUAL devono evidenziarlo
esplicitamente. Un errore comune degli sviluppatori è registrare
il manifest dimenticando l'attributo DOM, producendo esattamente
il sintomo "LLM cieco" descritto sopra. Aggiungere a
`stage2-disambiguation.mjs` un test di regressione: lo snapshot
deve includere OGNI plugin registrato, altrimenti segnalare un
finding.

---

## Bug #2 (MEDIO) -- I gestori onChatAction di React chiudono su stato obsoleto

**Demo interessata:** Solo React. I signal di Angular con `update()`
rendono questa categoria non applicabile.

**Sintomo (osservabile):** Dopo il deploy della correzione #1, il
dispatch dei verbi guidato dalla chat non aggiunge ancora i todo.
Inviando "agrega leche" non compare nessun nuovo todo. L'LLM emette
correttamente la sequenza di due azioni (`fill todos.input "leche"`
+ `click_by_verb todos add_todo`), ma il gestore di `add_todo`
vede `input.trim() === ''` e ritorna silenziosamente senza chiamare
`addTodo()`.

**Metodo di scoperta.** La scansione Playwright di scoperta
approfondita (round 2) cattura il conteggio delle righe prima e
dopo un'aggiunta guidata dalla chat. Finding:

```
[WARN] chat.dispatch: [react] chat "agrega leche" did not add a
todo (before=3, after=3). May be LLM hallucination or dispatch
broken.
```

**Causa radice.** Il `useEffect` di `App.tsx` per la registrazione
dei gestori chat ha dipendenze `[input, todos]`. I gestori chiudono
sui valori dello stato React AL MOMENTO DELLA REGISTRAZIONE. Quando
l'LLM invia `actions[]` in modo sincrono, il client chat esegue il
dispatch:
1. `fill todos.input "leche"` -> `setInput('leche')` mette in coda
   un re-render.
2. `click_by_verb todos add_todo` -> viene eseguito IMMEDIATAMENTE,
   nello stesso task JS. React non ha ancora eseguito il re-render.
   La closure del gestore ha ancora `input === ''`. Il controllo
   `input.trim()` fallisce; `addTodo()` non viene mai chiamata.

Questo è il classico problema React di closure su stato obsoleto.

**Correzione.** Usare un `useRef` che rispecchia `input`; il
gestore legge dal ref (sempre aggiornato) invece che dalla closure.
Stesso pattern per `todos` nel caso in cui verbi futuri ne abbiano
bisogno.

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
}, []); // registra una sola volta
```

Bonus: accettare anche il testo passato direttamente dall'LLM in
`args.text`, così funziona anche con app che non eseguono
fill-then-click.

**Lezione per il manuale.** Quando si collegano verbi guidati dalla
chat NAC3 in React, NON chiudere mai i gestori direttamente sullo
stato. Usare i ref o il pattern con il setter funzionale. Aggiungere
alla guida di adozione React (`guides/REACT.md`) e al manuale di
test una sezione "errori comuni".

---

## Bug #3 (DA DEFINIRE)

In attesa del round diagnostico 3.

---

## Log dei cicli

| Round | Quando | Errori React | Errori Angular | Bug segnalati |
|-------|--------|--------------|----------------|---------------|
| 1 | 2026-05-11 02:10 | 0 nella scansione superficiale | 0 nella scansione superficiale | #1 (copertura manifest) trovato tramite parsing della console |

I controlli strutturali della spec diagnostica (NAC montato,
validate_global pulito, manifest nel registry, CRUD todos
funzionante, toggle chat funzionante) risultano tutti VERDI. I bug
emergono in semantiche più profonde come "l'LLM sta davvero vedendo
ciò che abbiamo registrato?". I round diagnostici futuri
aggiungeranno: verifica della forma delle azioni post-risposta-LLM,
verifica che il dispatch venga eseguito, verifica della propagazione
delle mutazioni di dt_state attraverso lo stato del framework,
verifica del completamento di tutti i passi da parte dell'autopilot,
verifica del cambio di lingua dalla chat.

---

*This is a machine translation of the canonical English
version at `/nac-spec/docs/CASE_STUDIES_DISCOVERY.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
