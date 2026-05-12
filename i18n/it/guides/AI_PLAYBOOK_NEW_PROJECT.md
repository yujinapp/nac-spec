---
translation_source: guides/AI_PLAYBOOK_NEW_PROJECT.md
translation_source_hash: 6586a966938a6d84086a8b79805cde15886536b6718b79526ff7d16d202686fe
translation_quality: machine_v1
translation_lang: it
translation_date: 2026-05-11T13:53:00.288418+00:00
---

# AI Playbook -- Avviare un nuovo progetto NAC-3

**Versione NAC3:** 2.2 stable + v2.3 interop preview.
**Destinatari:** Qualsiasi agente AI (Claude, GPT, Gemini, LLM locale) incaricato
di inizializzare da zero un progetto conforme a NAC-3.
**Formato:** Runbook passo-passo. Ogni passo ha COSA, COME, VERIFICA.
Nessuna ambiguità.

Quando un utente dice **"iniziamo un nuovo progetto NAC-3"** o
qualcosa di simile, un agente AI che legge questo file DEVE eseguire i passi
seguenti nell'ordine indicato, verificando ogni gate prima di procedere.

---

## Passo 0 -- Confermare lo scope con l'utente

Porre esattamente queste domande prima di scrivere qualsiasi codice:

1. **Framework**: React, Angular, Vue, Svelte, vanilla, o
   server-rendered (PHP/Rails/Django)?
2. **Lingue**: Quali dei 10 locale NAC3 deve supportare l'app al lancio? (es, en, pt, fr, it, de, ja, zh, hi, ar)
3. **Chat backend**: L'app esporrà un proprio intermediario LLM
   (fornendo un endpoint) oppure utilizzerà una chat Yujin hosted?
4. **Provenienza**: Multi-tenant? In caso affermativo, pianificare la firma HMAC del manifest.
5. **Voce**: Solo push-to-talk, hands-free, o entrambi?
6. **Interop (v2.3 preview)**: Questa app sarà importabile da
   altri host NAC3 (Yujin Pilot, app peer)? Sì -> esporre gli strumenti del server MCP.

Annotare ogni risposta. Guidano tutte le decisioni successive.

---

## Passo 1 -- Scaffolding del progetto

### React (Vite)

```bash
npm create vite@latest <slug> -- --template react-ts
cd <slug>
npm install
npm install @nac3/runtime@^2.2.0
```

### Angular

```bash
npx -p @angular/cli ng new <slug> --style=css --routing=true --strict
cd <slug>
npm install @nac3/runtime@^2.2.0
```

### Vanilla (HTML + JS + PHP, senza framework)

Creare:
- `index.html` con `<body data-nac-plugin="app">`.
- `js/app.js` con gli import.

### Server-rendered

Incorporare `@nac3/runtime` via CDN:

```html
<script src="https://yujin.app/nac-spec/js/nac.js?v=v22"></script>
<script src="https://yujin.app/nac-spec/js/nac-v2-extensions.js?v=v22"></script>
```

**Verifica:** `npm run build` (o equivalente del framework) termina
senza errori. Aprire nel browser; `window.NAC` è definito.

---

## Passo 2 -- Decorare lo shell

Aggiungere al **contenitore radice** nel template:

```html
<div data-nac-plugin="<your-app-slug>" class="app">
  ...
</div>
```

Aggiungere a **ogni widget cliccabile** (pulsanti, link usati come pulsanti):

```html
<button
  data-nac-id="<slug>.<verb>"
  data-nac-role="action"
  data-nac-action="<verb>"
  onclick="...">
  ...
</button>
```

Aggiungere a **ogni campo del form** (input, textarea, select):

```html
<input
  data-nac-id="<slug>.<field-name>"
  data-nac-role="field"
  ... />
```

Aggiungere a **ogni pulsante tab** (la spec è rigorosa: un id `^tab\.` DEVE
avere role `tab`):

```html
<button
  data-nac-id="tab.<key>"
  data-nac-role="tab"
  onclick="...">
  ...
</button>
```

**Verifica:** `npx @nac3/runtime validate ./src` riporta zero risultati di
severità error. `NAC.describe()` dalla console del browser
restituisce un albero con corrispondenze `data-nac-plugin`.

---

## Passo 3 -- Scrivere il manifest

Creare `src/nac/manifest.ts` (o equivalente):

```ts
const li = (es:string,en:string,pt:string,fr:string,it:string,
            de:string,ja:string,zh:string,hi:string,ar:string) =>
  ({ es, en, pt, fr, it, de, ja, zh, hi, ar });

export const APP_MANIFEST = {
  plugin_slug: '<your-app-slug>',
  version: '1.0.0',
  nac_version: '2.2',
  elements: [
    {
      id: '<slug>.save',
      role: 'action',
      actions: [{
        verb: 'save',
        label_i18n: li('Guardar','Save','Salvar','Sauver','Salva',
                       'Speichern','保存','保存','sahejna','حفظ')
      }],
      label_i18n: li(/* same 10 */)
    },
    // ... ogni altro elemento ...
  ]
};
```

**Regole fondamentali:**
- Ogni `label_i18n` DEVE coprire tutti i 10 locale supportati. Una mappa
  parziale è un risultato del validatore strict v2.2.
- Ogni `id` che corrisponde a `^tab\.` DEVE avere `role: 'tab'`.
- Ogni `id` DEVE essere con namespace del plugin (es. `invoice.save`,
  non `save`).
- Gli ID DEVONO essere stabili attraverso i redesign dell'interfaccia.

**Verifica:** `NAC.validate_global({probe: false})` restituisce 0
risultati di severità error.

---

## Passo 4 -- Registrare il manifest all'avvio

### React

```tsx
import { useEffect } from 'react';
import '@nac3/runtime';
import '@nac3/runtime/extensions';
import { APP_MANIFEST } from './nac/manifest';

export function App() {
  useEffect(() => {
    window.NAC?.register(APP_MANIFEST);
  }, []);
  // ...
}
```

### Angular

```ts
import { Injectable } from '@angular/core';
import '@nac3/runtime';
import '@nac3/runtime/extensions';
import { APP_MANIFEST } from './nac/manifest';

@Injectable({ providedIn: 'root' })
export class NacBoot {
  constructor() {
    (window as any).NAC?.register(APP_MANIFEST);
  }
}
```

Iniettare `NacBoot` nell'`AppComponent`.

### Vanilla

```html
<script type="module">
import { APP_MANIFEST } from './nac/manifest.js';
window.NAC.register(APP_MANIFEST);
</script>
```

**Verifica:** `NAC.list_registered_plugins()` restituisce
`['<your-app-slug>']`.

---

## Passo 5 -- Emettere il contratto ack da ogni click handler

Per ogni pulsante decorato con `data-nac-role="action"`, il
click handler DEVE emettere `nac:action:succeeded` dopo il proprio
effetto collaterale sincrono.

### Pattern A -- tramite `NAC.bindAction` (helper v2.2, consigliato)

```ts
const btn = document.querySelector('[data-nac-id="<slug>.save"]');
NAC.bindAction(btn, function (ev) {
  saveInvoice();          // il tuo effetto collaterale
}, { plugin: '<slug>', action_id: '<slug>.save' });
```

`bindAction` gestisce automaticamente i casi sincroni, asincroni (Promise) e di eccezione.

### Pattern B -- emissione manuale

```ts
button.addEventListener('click', function () {
  saveInvoice();
  document.dispatchEvent(new CustomEvent('nac:action:succeeded', {
    detail: { plugin: '<slug>', action_id: '<slug>.save' }
  }));
});
```

Per gli altri role, emettere la famiglia di eventi canonici:
- `role="field"` -> `nac:field:changed` (detail: `{plugin, field_id, value}`)
- `role="tab"` -> `nac:tab:activated` (detail: `{plugin, tab_id}`)
- Vedere la sezione 6 di SPEC.md per la tabella completa.

**Verifica:** Dalla console del browser:
```js
document.addEventListener('nac:action:succeeded', e => console.log(e.detail));
await NAC.click('<slug>.save');
// Dovrebbe stampare {plugin: '<slug>', action_id: '<slug>.save', ...}
```

---

## Passo 6 -- Collegare il pannello chat

Incorporare il client chat di riferimento OPPURE usare Yujin Pilot (esterno).

### Opzione A -- incorporare `nac-chat-client.js`

```html
<aside class="chat" data-nac-plugin="chat" aria-hidden="true">
  <header class="chat-head">...</header>
  <div id="chat-log" data-nac-id="chat.log" data-nac-role="region"></div>
  <input id="chat-input" data-nac-id="chat.input" data-nac-role="field">
  <button id="chat-send" data-nac-id="chat.send" data-nac-role="action">send</button>
</aside>

<script src="https://yujin.app/nac-spec/js/nac-chat-client.js?v=v22"></script>
<script>
  NacChat.init({
    endpoint: '/api/your-llm-intermediary',
    chatLog: document.getElementById('chat-log'),
    input:   document.getElementById('chat-input'),
    sendBtn: document.getElementById('chat-send')
  });
</script>
```

L'`endpoint` è a tuo carico -- si tratta del backend intermediario LLM che
riceve `{prompt, lang, history, nac_tree}` e restituisce
`{message, actions[]}`. Vedere `LLM_WIRING.md`.

### Opzione B -- delegare a Yujin Pilot

Non incorporare la chat. Indicare agli utenti "installa Yujin Pilot
(yujin.app/pilot) per voce + chat su questa app". Lo scanner MCP di Pilot
scopre la tua app e la gestisce dal suo cockpit centrale.

---

## Passo 7 -- Eseguire il corpus di test

Copiare l'infrastruttura di test di riferimento Yujin come punto di partenza:

```bash
# Dalla radice del tuo progetto
cp -r /path/to/rpaforce-crm/packages/nac/test ./test
cp -r /path/to/rpaforce-crm/tools/nac/test-launch.sh ./tools/test-launch.sh
```

Modificare `test/stage*.mjs` per fare riferimento al tuo manifest e al tuo plugin
slug al posto di quelli della demo. Lo scheletro rimane identico.

Eseguire:

```bash
bash ./tools/test-launch.sh
```

**Verifica:** Tutti i layer lato node GREEN. Tempo totale < 15s.

---

## Passo 8 -- Aggiungere i test e2e con Playwright

```bash
mkdir -p tests/e2e-nac
cd tests/e2e-nac
npm init -y
npm install --save-dev @playwright/test
npx playwright install chromium
```

Copiare `tests/e2e-nac/specs/01-landing.spec.ts` dal riferimento Yujin
come template; adattarlo all'URL e al plugin slug della tua app.

Per il **test completo della pipeline** (chat -> LLM -> dispatch -> DOM ->
ack), vedere `08-pipeline-end-to-end.spec.ts` di Yujin. Tre test
esercitano l'intero flusso contro il tuo backend live.

---

## Passo 9 -- Checklist di produzione

Prima del deploy:

- [ ] `NAC.STRICT_VALIDATION = true` -- applica la validazione del role
      al momento della registrazione (lancia eccezione in caso di deriva).
- [ ] `npx @nac3/runtime validate ./src` -- zero risultati di severità error.
- [ ] `npm test` (il tuo harness) -- 100% superato.
- [ ] `npx playwright test` -- tutti gli e2e green.
- [ ] Multi-tenant: firmare i manifest con HMAC lato server; chiamare
      `NAC.set_provenance_secret()` da codice autenticato.
- [ ] Verbi con gate is_trusted: inserire in whitelist esplicita ogni verbo che
      i bot RPA / i click sintetici devono poter attivare
      (vedere SECURITY.md).
- [ ] i18n: ogni `label_i18n` copre tutti i 10 locale (oppure usare
      `i18n_strict: 'permissive'` durante la migrazione).

---

## Passo 10 -- Promuovere alla conformanza NAC-3

Eseguire `NAC.validate_global({probe: true})`. Il runtime sintetizza
click su ogni elemento `role="action"` per verificare che ciascuno
emetta il proprio ack entro 5s.

**Verifica:** zero risultati. Sei conforme a NAC-3.

---

## Errori comuni degli agenti AI (e come evitarli)

1. **Registrare il manifest senza `data-nac-plugin` nel DOM.**
   Il `NAC.describe()` del runtime percorre il DOM, non il
   registry. Senza l'attributo, lo snapshot dell'intermediario LLM
   è vuoto per quel plugin. Associare SEMPRE i due.
2. **Chiudere i chat handler sullo stato React/Vue.** Usare ref o
   setter funzionali. Vedere il bug #2 in CASE_STUDIES_DISCOVERY.md.
3. **i18n parziale.** Il validatore strict v2.2 fallisce su mappe
   label_i18n incomplete. Se è necessario rilasciare in modo parziale, usare
   `i18n_strict: 'permissive'` e aprire un ticket TODO; non è una
   scorciatoia permanente.
4. **Riutilizzare gli ID dopo un refactor.** Un pulsante rinominato con un nuovo
   ruolo semantico DEVE ricevere un nuovo id. Il riutilizzo rompe ogni
   script di agente downstream.
5. **Dimenticare l'evento ack.** Un handler che esegue il proprio lavoro
   in modo sincrono ma non emette `nac:action:succeeded` farà andare in timeout
   NAC.click(). Usare `bindAction` per incorporare il contratto.

---

## Vedere anche

- [SPEC.md](../SPEC.md) -- contratto canonico.
- [AI_PLAYBOOK_MIGRATION.md](AI_PLAYBOOK_MIGRATION.md) -- per
  progetti brownfield.
- [NAC_TEST_MANUAL.md](../docs/NAC_TEST_MANUAL.md) -- playbook di test
  per qualsiasi app NAC-3.
- [REACT.md](REACT.md) / [ANGULAR.md](ANGULAR.md) -- approfondimenti per framework.

## Licenza

Apache-2.0.

---

*This is a machine translation of the canonical English
version at `/nac-spec/guides/AI_PLAYBOOK_NEW_PROJECT.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
