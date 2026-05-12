---
translation_source: guides/AI_PLAYBOOK_MIGRATION.md
translation_source_hash: f49b65c798ab36923cab79511851c64a81ad6609a1c37d4936d4c6c0542cc706
translation_quality: machine_v1
translation_lang: it
translation_date: 2026-05-11T13:54:04.931773+00:00
---

# AI Playbook -- Migrazione di un progetto esistente a NAC3

**Versione NAC3:** 2.2 stable + v2.3 interop preview.
**Destinatari:** Qualsiasi agente AI (Claude, GPT, Gemini, LLM locale) incaricato
di migrare un'app web esistente alla conformità NAC-3 (migrazione brownfield).
**Formato:** Runbook passo-passo con COSA, COME, VERIFICA per ogni step.

Quando un utente dice **"migriamo questo progetto a NAC-3"**, un agente AI
che legge questo file DEVE eseguire i passi seguenti nell'ordine indicato.
La migrazione brownfield è più complessa di quella greenfield perché non si può
interrompere l'app in esecuzione. Ogni step viene rilasciato IN MODO INDIPENDENTE.

---

## Step 0 -- Perimetro + gate di sicurezza

### 0.1 Domande da porre all'utente

1. **Livello di rischio**: L'app è in produzione? Se sì, la migrazione avviene
   schermata per schermata dietro feature flag. Se è in staging, si può procedere
   con più libertà.
2. **Framework**: Rilevalo da `package.json` / `composer.json` /
   struttura del progetto, poi conferma con l'utente.
3. **Top-10 azioni**: Chiedi all'utente di elencare le 10 azioni più usate
   nell'app (salva, annulla, cerca, filtra, ecc.).
   Queste vengono migrate per prime.
4. **Backend chat**: Verrà riutilizzata un'infrastruttura chat esistente (Yujin
   chat su `/yujin/nac-demo`, o un proprio intermediario LLM)?
5. **Copertura test attuale**: Esistono test Playwright / Cypress / Jest?
   I test NAC3 verranno aggiunti a fianco, non in sostituzione.
6. **Libreria di componenti**: shadcn / MUI / PrimeNG / Mantine /
   custom? Alcune librerie ignorano le prop `data-*`; sarà necessario
   creare dei wrapper (vedi step 5).

### 0.2 Pulizia git pre-volo

```bash
git status              # DEVE essere pulito prima di iniziare
git checkout -b feat/nac3-migration
```

Ogni step della migrazione NAC vive nel proprio commit, così l'utente
può revisionare e fare revert per singola slice.

---

## Step 1 -- Installazione del runtime + creazione del modulo di boot

```bash
npm install @nac3/runtime@^2.2.0
```

Crea `src/nac/boot.ts` (o l'equivalente per il tuo framework):

```ts
import '@nac3/runtime';
import '@nac3/runtime/extensions';
// import '@nac3/runtime/chat-client';  // uncomment when ready for chat

declare global { interface Window { NAC?: any; NacChat?: any; } }
```

Importa una sola volta dall'entry point radice dell'app (`main.tsx`, `app.module.ts`,
o in cima allo script nell'`<head>` HTML).

**Verifica:** `window.NAC` definito nella console del browser;
`window.NAC.version` restituisce `'2.2.0'` (o superiore).

**Commit:** `feat(nac3-migration): step 1 -- install runtime + boot module`

---

## Step 2 -- Decorazione dell'app shell

Aggiungi `data-nac-plugin="<app-slug>"` al contenitore PIÙ ESTERNO che
racchiude la UI principale. Questo è l'attributo più importante dell'intera
migrazione -- senza di esso lo snapshot dell'intermediario LLM risulta
vuoto (lezione dai casi studio React + Angular, bug #1,
documentato in `docs/CASE_STUDIES_DISCOVERY.md`).

### Esempio React

```tsx
return (
  <div className="app" data-nac-plugin="my-app">
    ...
  </div>
);
```

### Esempio Angular

```html
<div class="app" data-nac-plugin="my-app">
  ...
</div>
```

### Server-rendered (PHP / Rails / Django)

```html
<body data-nac-plugin="my-app">
  ...
</body>
```

**Verifica:** Console del browser: `NAC.describe().plugins.length >= 1`.

**Commit:** `feat(nac3-migration): step 2 -- root data-nac-plugin attribute`

---

## Step 3 -- Decorazione dei pulsanti per le top-10 azioni

Prendi le 10 azioni più usate dallo step 0.3. Per ogni pulsante:

```html
<button
  data-nac-id="<plugin>.<verb>"
  data-nac-role="action"
  data-nac-action="<verb>"
  onclick="...">
  ...
</button>
```

**Convenzioni per gli ID:**
- Namespace del plugin: `invoice.save`, non solo `save`.
- Snake_case minuscolo: `add_row`, non `AddRow` né `add-row`.
- Il verbo va alla foglia se è un'azione globale dell'app; altrimenti annidato:
  `dashboard.invoice.list.row.42.delete`.

Non toccare l'`onclick` / gestore eventi esistente -- la
decorazione è additiva.

**Verifica:** Dalla console:
```js
NAC.describe().plugins[0].elements.length  // >= 10
NAC.list_registered_plugins()                // include il tuo plugin
```

**Commit:** `feat(nac3-migration): step 3 -- top-10 buttons decorated`

---

## Step 4 -- Aggiunta di un manifest minimale

Non cercare di coprire TUTTI gli elementi il primo giorno. Copri i 10
pulsanti principali dello step 3 con `label_i18n` appropriati:

```ts
// src/nac/manifest.ts
const li = (es:string,en:string,pt:string,fr:string,it:string,
            de:string,ja:string,zh:string,hi:string,ar:string) =>
  ({ es, en, pt, fr, it, de, ja, zh, hi, ar });

export const APP_MANIFEST = {
  plugin_slug: 'my-app',
  version: '1.0.0',
  nac_version: '2.2',
  elements: [
    {
      id: 'my-app.save', role: 'action',
      actions: [{
        verb: 'save',
        label_i18n: li('Guardar','Save','Salvar','Sauver','Salva',
                       'Speichern','保存','保存','sahejna','حفظ')
      }],
      label_i18n: li(/* same */)
    },
    // ... altri 9 ...
  ]
};
```

Registra al boot:

```ts
window.NAC?.register(APP_MANIFEST);
```

Se non è possibile rilasciare 10 lingue il primo giorno, usa `i18n_strict: 'permissive'`
sul percorso autoRegister.watch. È una soluzione temporanea;
il validatore strict di NAC3 v2.2 in produzione avviserà in caso di i18n incompleto.

**Verifica:**
```js
NAC.list_registered_plugins()           // ['my-app']
await NAC.click_by_verb('my-app','save')  // resolves
```

**Commit:** `feat(nac3-migration): step 4 -- manifest with top-10 verbs`

---

## Step 5 -- Gestione della libreria di componenti (se applicabile)

Se l'app usa MUI / Mantine / PrimeNG / ecc. e i pulsanti
ignorano le prop `data-*`, crea un wrapper sottile:

```tsx
// src/nac/NacButton.tsx
import { Button as MuiButton } from '@mui/material';
import { useEffect, useRef } from 'react';

export function NacButton({ nacId, verb, plugin, children, ...rest }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.setAttribute('data-nac-id', nacId);
    el.setAttribute('data-nac-role', 'action');
    el.setAttribute('data-nac-action', verb);
  }, [nacId, verb]);
  return <MuiButton ref={ref} {...rest}>{children}</MuiButton>;
}
```

Sostituisci `<Button>` con `<NacButton nacId="..." verb="...">` per
i 10 pulsanti principali. Procedi in modo incrementale.

**Commit:** `feat(nac3-migration): step 5 -- component library wrapper`

---

## Step 6 -- Emissione del contratto ack

L'helper `bindAction` di v2.2 è la soluzione più pulita:

```ts
import { useRef, useEffect } from 'react';

export function useNacAction(plugin: string, actionId: string) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || !window.NAC) return;
    return window.NAC.bindAction(el, () => {}, { plugin, action_id: actionId });
  }, [plugin, actionId]);
  return ref;
}
```

```tsx
function SaveButton({ onSave }) {
  const ref = useNacAction('my-app', 'my-app.save');
  return <button ref={ref} onClick={onSave}>Save</button>;
}
```

Il layer bindAction emette `nac:action:succeeded` automaticamente
dopo che l'`onClick` dell'utente ritorna. Niente più "la chat dice
'No pude ejecutar X: timeout'".

**Verifica:** Dalla console:
```js
document.addEventListener('nac:action:succeeded', e => console.log(e.detail));
await NAC.click('my-app.save');
// Dovrebbe stampare {plugin: 'my-app', action_id: 'my-app.save', ...}
```

**Commit:** `feat(nac3-migration): step 6 -- bindAction ack contract`

---

## Step 7 -- Aggiunta di campi e tab

Per ogni input in cui l'utente digita:

```html
<input data-nac-id="my-app.field_x" data-nac-role="field" ...>
```

Per ogni tab nei componenti tab-strip:

```html
<button
  data-nac-id="tab.<key>"
  data-nac-role="tab"
  onclick="...">
  ...
</button>
```

**Importante (regola del validatore strict v2.2):** Un ID che corrisponde a `^tab\.`
DEVE avere role `tab`. Role non corrispondenti producono il finding
`tab_id_manifest_role_drift` e il runtime non riesce a trovare
il tab tramite `NAC.tab()`.

**Commit:** `feat(nac3-migration): step 7 -- fields + tabs decorated`

---

## Step 8 -- Aggiunta del pannello chat (opzionale, rinviabile)

Inserisci il `nac-chat-client.js` di riferimento:

```html
<aside class="chat" data-nac-plugin="chat" aria-hidden="true">
  <div id="chat-log" data-nac-id="chat.log" data-nac-role="region"></div>
  <input id="chat-input" data-nac-id="chat.input" data-nac-role="field">
  <button id="chat-send" data-nac-id="chat.send" data-nac-role="action">send</button>
</aside>

<script src="https://yujin.app/nac-spec/js/nac-chat-client.js?v=v22"></script>
<script>
NacChat.init({
  endpoint: '/your-llm-intermediary',   // or '/crm/api/v1/yujin/nac-demo'
  chatLog: document.getElementById('chat-log'),
  input:   document.getElementById('chat-input'),
  sendBtn: document.getElementById('chat-send')
});
</script>
```

In alternativa, **rinvia completamente la chat** e indica agli utenti di installare
Yujin Pilot (`yujin.app/pilot`), che scopre la tua app tramite
MCP e la gestisce da un cockpit centralizzato.

**Commit:** `feat(nac3-migration): step 8 -- chat panel`

---

## Step 9 -- Aggiunta del corpus di test NAC3

Copia l'infrastruttura di test di riferimento Yujin:

```bash
mkdir -p test/nac3
cp /path/to/rpaforce-crm/packages/nac/test/stage*.mjs ./test/nac3/
cp /path/to/rpaforce-crm/tools/nac/test-launch.sh ./test/nac3/
```

Adatta il plugin slug e il riferimento al manifest. Esegui:

```bash
bash ./test/nac3/test-launch.sh
```

**Verifica:** Tutti i layer VERDI.

**Commit:** `feat(nac3-migration): step 9 -- NAC3 test corpus`

---

## Step 10 -- Promozione alla conformità NAC-3

```bash
# Nel tuo CI:
npx @nac3/runtime validate ./src --severity=error  # exit 0 required
NAC.validate_global({probe: true})              # zero findings required
```

Imposta `NAC.STRICT_VALIDATION = true` nel boot di produzione per applicare
la coerenza dei role al momento della registrazione.

**Commit:** `feat(nac3-migration): step 10 -- NAC-3 conformance gate`

---

## Ordine di migrazione tra le schermate

In un'app in produzione con molte schermate, non cercare di migrarle
tutte in una volta:

1. **Prima la schermata più usata** (es. login + dashboard).
2. **Poi la schermata di maggior valore** (quella in cui vivono
   i power user).
3. **Le schermate pubbliche** (visibili al traffico anonimo).
4. **Le schermate admin** per ultime (traffico basso, accettazione più approfondita).

Ogni schermata ottiene la propria PR. Ogni PR viene rilasciata dietro un feature flag
se disponibile; il rollback avviene capovolgendo il flag.

---

## Errori comuni durante la migrazione

1. **`data-nac-plugin` dimenticato sulla radice.** Il manifest è registrato
   ma l'LLM non lo vede. **Sintomo:** la chat risponde con un generico "Come posso
   aiutarti?" senza azioni. Soluzione: aggiungi l'attributo. (Bug #1 dai casi studio.)
2. **Stale closure di stato React in onChatAction.** Usa ref +
   setter funzionali. (Bug #2 dai casi studio.)
3. **ID tab con role non-tab.** Finding del validatore strict v2.2.
   `^tab\.` DEVE avere role `tab`.
4. **Riutilizzo di ID dopo un refactor.** Un pulsante spostato in un nuovo
   ruolo semantico DEVE ricevere un nuovo ID. Il riutilizzo rompe l'automazione downstream.
5. **La libreria di componenti ignora i data-*.** Rilevalo subito; scrivi un
   wrapper (step 5).
6. **Il click handler non emette ack.** Usa `bindAction`. Senza
   di esso, `NAC.click()` va in timeout dopo 5s anche quando l'effetto collaterale
   ha funzionato.

---

## Vedi anche

- [AI_PLAYBOOK_NEW_PROJECT.md](AI_PLAYBOOK_NEW_PROJECT.md) -- per
  i progetti greenfield.
- [REACT.md](REACT.md) / [ANGULAR.md](ANGULAR.md) -- approfondimenti per framework.
- [NAC_TEST_MANUAL.md](../docs/NAC_TEST_MANUAL.md) -- playbook di test
  post-migrazione.
- [CASE_STUDIES_DISCOVERY.md](../docs/CASE_STUDIES_DISCOVERY.md)
  -- bug rilevati durante la migrazione di riferimento Yujin.

## Licenza

Apache-2.0.

---

*This is a machine translation of the canonical English
version at `/nac-spec/guides/AI_PLAYBOOK_MIGRATION.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
