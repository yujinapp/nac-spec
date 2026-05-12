---
translation_source: guides/AI_PLAYBOOK_NEW_PROJECT.md
translation_source_hash: 6586a966938a6d84086a8b79805cde15886536b6718b79526ff7d16d202686fe
translation_quality: machine_v1
translation_lang: pt
translation_date: 2026-05-11T13:34:07.548797+00:00
---

# AI Playbook -- Iniciar um novo projeto NAC-3

**Versão do NAC3:** 2.2 stable + v2.3 interop preview.
**Público:** Qualquer agente de IA (Claude, GPT, Gemini, LLM local) encarregado
de inicializar um projeto conforme ao NAC-3 do zero.
**Formato:** Runbook passo a passo. Cada etapa tem O QUÊ, COMO, ASSERT.
Sem ambiguidade.

Quando um humano disser **"vamos iniciar um novo projeto NAC-3"** ou
algo similar, um agente de IA que leia este arquivo DEVE executar as etapas
abaixo em ordem, verificando cada gate antes de avançar.

---

## Etapa 0 -- Confirmar escopo com o humano

Faça exatamente estas perguntas antes de escrever qualquer código:

1. **Framework**: React, Angular, Vue, Svelte, vanilla ou
   server-rendered (PHP/Rails/Django)?
2. **Idiomas**: Quais dos 10 locales do NAC3 o app deve
   suportar no lançamento? (es, en, pt, fr, it, de, ja, zh, hi, ar)
3. **Backend de chat**: O app vai expor seu próprio
   intermediário LLM (fornecer endpoint) ou usar um chat Yujin hospedado?
4. **Proveniência**: Multi-tenant? Se sim, planeje a assinatura HMAC do manifest.
5. **Voz**: Somente push-to-talk, hands-free ou ambos?
6. **Interop (v2.3 preview)**: Este app poderá ser importado por
   outros hosts NAC3 (Yujin Pilot, apps parceiros)? Sim -> expor
   ferramentas do servidor MCP.

Registre cada resposta. Elas orientam todas as decisões subsequentes.

---

## Etapa 1 -- Criar o scaffold do projeto

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

### Vanilla (HTML + JS + PHP, sem framework)

Crie:
- `index.html` com `<body data-nac-plugin="app">`.
- `js/app.js` com os imports.

### Server-rendered

Incorpore `@nac3/runtime` via CDN:

```html
<script src="https://yujin.app/nac-spec/js/nac.js?v=v22"></script>
<script src="https://yujin.app/nac-spec/js/nac-v2-extensions.js?v=v22"></script>
```

**Assert:** `npm run build` (ou equivalente do framework) conclui
sem erros. Abra no navegador; `window.NAC` está definido.

---

## Etapa 2 -- Decorar o shell

Adicione ao seu **container raiz** no template:

```html
<div data-nac-plugin="<your-app-slug>" class="app">
  ...
</div>
```

Adicione a **todo widget clicável** (botões, links-como-botões):

```html
<button
  data-nac-id="<slug>.<verb>"
  data-nac-role="action"
  data-nac-action="<verb>"
  onclick="...">
  ...
</button>
```

Adicione a **todo campo de formulário** (input, textarea, select):

```html
<input
  data-nac-id="<slug>.<field-name>"
  data-nac-role="field"
  ... />
```

Adicione a **todo botão de aba** (a spec é rígida: id com `^tab\.` DEVE
ter role `tab`):

```html
<button
  data-nac-id="tab.<key>"
  data-nac-role="tab"
  onclick="...">
  ...
</button>
```

**Assert:** `npx @nac3/runtime validate ./src` reporta zero findings de
severidade de erro. `NAC.describe()` no console do navegador
retorna uma árvore com correspondências de `data-nac-plugin`.

---

## Etapa 3 -- Escrever o manifest

Crie `src/nac/manifest.ts` (ou equivalente):

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
    // ... todos os outros elementos ...
  ]
};
```

**Regras críticas:**
- Todo `label_i18n` DEVE cobrir todos os 10 locales suportados. Mapas
  incompletos são um finding do validador strict do v2.2.
- Todo `id` com padrão `^tab\.` DEVE ter `role: 'tab'`.
- Todo `id` DEVE ter namespace do plugin (ex.: `invoice.save`,
  não `save`).
- IDs DEVEM ser estáveis entre redesigns de UI.

**Assert:** `NAC.validate_global({probe: false})` retorna 0
findings de severidade de erro.

---

## Etapa 4 -- Registrar o manifest na inicialização

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

Injete `NacBoot` no seu `AppComponent`.

### Vanilla

```html
<script type="module">
import { APP_MANIFEST } from './nac/manifest.js';
window.NAC.register(APP_MANIFEST);
</script>
```

**Assert:** `NAC.list_registered_plugins()` retorna
`['<your-app-slug>']`.

---

## Etapa 5 -- Emitir o contrato de ack em cada handler de clique

Para cada botão decorado com `data-nac-role="action"`, seu
handler de clique DEVE emitir `nac:action:succeeded` após seu
efeito colateral síncrono.

### Padrão A -- via `NAC.bindAction` (helper v2.2, recomendado)

```ts
const btn = document.querySelector('[data-nac-id="<slug>.save"]');
NAC.bindAction(btn, function (ev) {
  saveInvoice();          // seu efeito colateral
}, { plugin: '<slug>', action_id: '<slug>.save' });
```

`bindAction` trata automaticamente os casos síncronos, assíncronos (Promise) e de exceção.

### Padrão B -- emissão manual

```ts
button.addEventListener('click', function () {
  saveInvoice();
  document.dispatchEvent(new CustomEvent('nac:action:succeeded', {
    detail: { plugin: '<slug>', action_id: '<slug>.save' }
  }));
});
```

Para outros roles, emita a família de eventos canônicos:
- `role="field"` -> `nac:field:changed` (detail: `{plugin, field_id, value}`)
- `role="tab"` -> `nac:tab:activated` (detail: `{plugin, tab_id}`)
- Veja a seção 6 do SPEC.md para a tabela completa.

**Assert:** No console do navegador:
```js
document.addEventListener('nac:action:succeeded', e => console.log(e.detail));
await NAC.click('<slug>.save');
// Deve imprimir {plugin: '<slug>', action_id: '<slug>.save', ...}
```

---

## Etapa 6 -- Conectar o painel de chat

Incorpore o cliente de chat de referência OU use o Yujin Pilot (externo).

### Opção A -- incorporar `nac-chat-client.js`

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

Você fornece o `endpoint` -- o backend intermediário LLM que
recebe `{prompt, lang, history, nac_tree}` e retorna
`{message, actions[]}`. Veja `LLM_WIRING.md`.

### Opção B -- delegar ao Yujin Pilot

Não incorpore chat. Informe aos usuários "instale o Yujin Pilot
(yujin.app/pilot) para voz + chat neste app". O scanner MCP do Pilot
descobre seu app e o controla a partir de seu cockpit central.

---

## Etapa 7 -- Executar o corpus de testes

Copie a infraestrutura de testes de referência do Yujin como ponto de partida:

```bash
# Da raiz do seu projeto
cp -r /path/to/rpaforce-crm/packages/nac/test ./test
cp -r /path/to/rpaforce-crm/tools/nac/test-launch.sh ./tools/test-launch.sh
```

Edite `test/stage*.mjs` para referenciar seu manifest e o slug do seu plugin
em vez dos do demo. O esqueleto permanece idêntico.

Execute:

```bash
bash ./tools/test-launch.sh
```

**Assert:** Todas as camadas node-side VERDES. Tempo total < 15s.

---

## Etapa 8 -- Adicionar e2e com Playwright

```bash
mkdir -p tests/e2e-nac
cd tests/e2e-nac
npm init -y
npm install --save-dev @playwright/test
npx playwright install chromium
```

Copie `tests/e2e-nac/specs/01-landing.spec.ts` da referência Yujin
como template; adapte para a URL e o slug do plugin do seu app.

Para o **teste completo de pipeline** (chat -> LLM -> dispatch -> DOM ->
ack), veja o `08-pipeline-end-to-end.spec.ts` do Yujin. Três testes
exercitam o fluxo completo contra seu backend em produção.

---

## Etapa 9 -- Checklist de produção

Antes do deploy:

- [ ] `NAC.STRICT_VALIDATION = true` -- aplica validação de role
      no momento do registro (lança exceção em caso de drift).
- [ ] `npx @nac3/runtime validate ./src` -- zero findings de severidade de erro.
- [ ] `npm test` (seu harness) -- 100% de aprovação.
- [ ] `npx playwright test` -- todos os e2e verdes.
- [ ] Multi-tenant: assine manifests com HMAC no servidor; chame
      `NAC.set_provenance_secret()` a partir de código autenticado.
- [ ] Verbos com gate is_trusted: coloque explicitamente na whitelist qualquer
      verbo que bots RPA / cliques sintéticos devam ter permissão de disparar
      (veja SECURITY.md).
- [ ] i18n: todo `label_i18n` cobre os 10 locales (ou use
      `i18n_strict: 'permissive'` durante a migração).

---

## Etapa 10 -- Promover à conformidade NAC-3

Execute `NAC.validate_global({probe: true})`. O runtime sintetiza
cliques em cada elemento `role="action"` para verificar se cada um
emite seu ack em até 5s.

**Assert:** zero findings. Seu app está em conformidade com o NAC-3.

---

## Erros comuns de IA (e como evitá-los)

1. **Registrar o manifest sem `data-nac-plugin` no DOM.**
   O `NAC.describe()` do runtime percorre o DOM, não o
   registry. Sem o atributo, o snapshot do intermediário LLM
   fica vazio para aquele plugin. SEMPRE combine os dois.
2. **Fechar handlers de chat sobre estado React/Vue.** Use refs ou
   setters funcionais. Veja o bug #2 em CASE_STUDIES_DISCOVERY.md.
3. **i18n parcial.** O validador strict do v2.2 falha em mapas
   `label_i18n` incompletos. Se precisar entregar parcial, use
   `i18n_strict: 'permissive'` e abra um ticket de TODO; não é
   um atalho permanente.
4. **Reutilizar IDs após refatoração.** Um botão renomeado para um novo
   papel semântico DEVE receber um novo id. Reutilizar quebra todos
   os scripts de agentes downstream.
5. **Esquecer o evento ack.** Um handler que executa seu trabalho
   de forma síncrona mas não emite `nac:action:succeeded` vai
   causar timeout no NAC.click(). Use `bindAction` para incorporar
   o contrato.

---

## Veja também

- [SPEC.md](../SPEC.md) -- contrato canônico.
- [AI_PLAYBOOK_MIGRATION.md](AI_PLAYBOOK_MIGRATION.md) -- para
  projetos brownfield.
- [NAC_TEST_MANUAL.md](../docs/NAC_TEST_MANUAL.md) -- playbook de testes
  para qualquer app NAC-3.
- [REACT.md](REACT.md) / [ANGULAR.md](ANGULAR.md) -- aprofundamento por framework.

## Licença

Apache-2.0.

---

*This is a machine translation of the canonical English
version at `/nac-spec/guides/AI_PLAYBOOK_NEW_PROJECT.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
