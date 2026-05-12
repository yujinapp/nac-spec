---
translation_source: guides/AI_PLAYBOOK_MIGRATION.md
translation_source_hash: f49b65c798ab36923cab79511851c64a81ad6609a1c37d4936d4c6c0542cc706
translation_quality: machine_v1
translation_lang: pt
translation_date: 2026-05-11T13:35:11.494088+00:00
---

# AI Playbook -- Migrar um projeto existente para NAC3

**Versão do NAC3:** 2.2 stable + v2.3 interop preview.
**Público:** Qualquer agente de IA (Claude, GPT, Gemini, LLM local) encarregado
de migrar um app web existente para conformidade com NAC-3.
**Formato:** Runbook passo a passo com O QUÊ, COMO e VERIFICAR por etapa.

Quando um humano disser **"vamos migrar este projeto para NAC-3"**, um agente de IA
que leia este arquivo DEVE executar os passos abaixo em ordem.
A migração brownfield é mais difícil do que greenfield porque você não pode
quebrar o app em produção. Cada etapa é entregue de forma INDEPENDENTE.

---

## Passo 0 -- Escopo + verificações de segurança

### 0.1 Perguntas a fazer ao humano

1. **Envelope de risco**: O app está em produção? Se sim, migre
   por tela, atrás de feature flags. Se for staging, você pode ser mais ousado.
2. **Framework**: Detecte a partir de `package.json` / `composer.json` /
   árvore do projeto, depois confirme com o humano.
3. **Top-10 verbos**: Peça ao humano para listar as 10 ações mais usadas
   no app (salvar, cancelar, buscar, filtrar, etc).
   Essas migram primeiro.
4. **Backend de chat**: Você vai reutilizar uma infraestrutura de chat existente (Yujin
   chat em `/yujin/nac-demo`, ou seu próprio intermediário LLM)?
5. **Cobertura de testes atual**: Já existe Playwright / Cypress / Jest?
   Você vai adicionar testes NAC3 junto, não substituir os existentes.
6. **Biblioteca de componentes**: shadcn / MUI / PrimeNG / Mantine /
   customizada? Algumas bibliotecas descartam props `data-*`; você vai precisar
   de wrappers (veja o passo 5).

### 0.2 Higiene git pré-voo

```bash
git status              # DEVE estar limpo antes de começar
git checkout -b feat/nac3-migration
```

Cada etapa da migração NAC fica em seu próprio commit para que o humano
possa revisar e reverter por fatia.

---

## Passo 1 -- Instalar o runtime + criar o módulo de boot

```bash
npm install @nac3/runtime@^2.2.0
```

Crie `src/nac/boot.ts` (ou equivalente no seu framework):

```ts
import '@nac3/runtime';
import '@nac3/runtime/extensions';
// import '@nac3/runtime/chat-client';  // uncomment when ready for chat

declare global { interface Window { NAC?: any; NacChat?: any; } }
```

Importe uma única vez a partir do entry point raiz do seu app (`main.tsx`, `app.module.ts`,
ou no topo do script no `<head>` do seu HTML).

**Verificar:** `window.NAC` definido no console do navegador;
`window.NAC.version` retorna `'2.2.0'` (ou superior).

**Commit:** `feat(nac3-migration): step 1 -- install runtime + boot module`

---

## Passo 2 -- Decorar o shell do app

Adicione `data-nac-plugin="<app-slug>"` ao container MAIS EXTERNO que
envolve sua UI principal. Este é o atributo mais importante
da migração -- sem ele, o snapshot do intermediário LLM
fica vazio (lição dos casos de estudo com React + Angular, bug #1,
documentado em `docs/CASE_STUDIES_DISCOVERY.md`).

### Exemplo React

```tsx
return (
  <div className="app" data-nac-plugin="my-app">
    ...
  </div>
);
```

### Exemplo Angular

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

**Verificar:** No console do navegador: `NAC.describe().plugins.length >= 1`.

**Commit:** `feat(nac3-migration): step 2 -- root data-nac-plugin attribute`

---

## Passo 3 -- Decorar os botões dos top-10 verbos

Pegue as 10 ações mais usadas do passo 0.3. Para cada botão:

```html
<button
  data-nac-id="<plugin>.<verb>"
  data-nac-role="action"
  data-nac-action="<verb>"
  onclick="...">
  ...
</button>
```

**Convenções de ID:**
- Com namespace do plugin: `invoice.save`, não apenas `save`.
- Snake_case minúsculo: `add_row`, não `AddRow` ou `add-row`.
- Verbo na folha se for um verbo global do app; caso contrário, aninhado:
  `dashboard.invoice.list.row.42.delete`.

Não mexa no `onclick` / handler de evento existente -- a
decoração é aditiva.

**Verificar:** No console:
```js
NAC.describe().plugins[0].elements.length  // >= 10
NAC.list_registered_plugins()                // includes your plugin
```

**Commit:** `feat(nac3-migration): step 3 -- top-10 buttons decorated`

---

## Passo 4 -- Adicionar um manifest mínimo

Não tente cobrir TODOS os elementos no primeiro dia. Cubra os top-10
botões de verbos do passo 3 com `label_i18n` adequado:

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
    // ... 9 more ...
  ]
};
```

Registre no boot:

```ts
window.NAC?.register(APP_MANIFEST);
```

Se você não conseguir entregar 10 locales no primeiro dia, use `i18n_strict: 'permissive'`
no caminho autoRegister.watch. Isso é uma muleta temporária;
o strict-validator do NAC3 v2.2 em produção vai alertar sobre i18n incompleto.

**Verificar:**
```js
NAC.list_registered_plugins()           // ['my-app']
await NAC.click_by_verb('my-app','save')  // resolves
```

**Commit:** `feat(nac3-migration): step 4 -- manifest with top-10 verbs`

---

## Passo 5 -- Lidar com a biblioteca de componentes (se aplicável)

Se seu app usa MUI / Mantine / PrimeNG / etc e os botões
descartam props `data-*`, escreva um wrapper fino:

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

Faça find-replace de `<Button>` -> `<NacButton nacId="..." verb="...">` para
os top-10 botões. Faça isso de forma incremental.

**Commit:** `feat(nac3-migration): step 5 -- component library wrapper`

---

## Passo 6 -- Emitir o contrato de ack

O helper `bindAction` do v2.2 é o caminho mais limpo:

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

A camada bindAction dispara `nac:action:succeeded` automaticamente
após o `onClick` do usuário retornar. Chega de "o chat diz
'No pude ejecutar X: timeout'".

**Verificar:** No console:
```js
document.addEventListener('nac:action:succeeded', e => console.log(e.detail));
await NAC.click('my-app.save');
// Should print {plugin: 'my-app', action_id: 'my-app.save', ...}
```

**Commit:** `feat(nac3-migration): step 6 -- bindAction ack contract`

---

## Passo 7 -- Adicionar campos + abas

Para cada input em que o usuário digita:

```html
<input data-nac-id="my-app.field_x" data-nac-role="field" ...>
```

Para cada aba em componentes de tab-strip:

```html
<button
  data-nac-id="tab.<key>"
  data-nac-role="tab"
  onclick="...">
  ...
</button>
```

**Crítico (regra do strict-validator v2.2):** IDs que correspondam a `^tab\.`
DEVEM ter role `tab`. Roles incompatíveis produzem o
finding `tab_id_manifest_role_drift` e o runtime não consegue encontrar
a aba via `NAC.tab()`.

**Commit:** `feat(nac3-migration): step 7 -- fields + tabs decorated`

---

## Passo 8 -- Adicionar painel de chat (opcional, adiável)

Inclua o `nac-chat-client.js` de referência:

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

Alternativamente, **adie o chat completamente** e oriente os usuários a instalar
o Yujin Pilot (`yujin.app/pilot`), que descobre seu app via
MCP e o controla a partir de um cockpit central.

**Commit:** `feat(nac3-migration): step 8 -- chat panel`

---

## Passo 9 -- Adicionar o corpus de testes NAC3

Copie a infraestrutura de testes de referência do Yujin:

```bash
mkdir -p test/nac3
cp /path/to/rpaforce-crm/packages/nac/test/stage*.mjs ./test/nac3/
cp /path/to/rpaforce-crm/tools/nac/test-launch.sh ./test/nac3/
```

Adapte o slug do plugin + referência ao manifest. Execute:

```bash
bash ./test/nac3/test-launch.sh
```

**Verificar:** Todas as camadas em GREEN.

**Commit:** `feat(nac3-migration): step 9 -- NAC3 test corpus`

---

## Passo 10 -- Promover para conformidade NAC-3

```bash
# In your CI:
npx @nac3/runtime validate ./src --severity=error  # exit 0 required
NAC.validate_global({probe: true})              # zero findings required
```

Defina `NAC.STRICT_VALIDATION = true` no boot de produção para impor
coerência de roles no momento do registro.

**Commit:** `feat(nac3-migration): step 10 -- NAC-3 conformance gate`

---

## Ordem de migração entre telas

Em um app de produção com muitas telas, não tente migrar todas
de uma vez:

1. **Tela mais usada primeiro** (ex.: login + dashboard).
2. **Tela de maior valor em seguida** (aquela em que seus usuários
   avançados vivem).
3. **Telas públicas** (visíveis para tráfego anônimo).
4. **Telas de admin** por último (baixo tráfego, aceitação mais profunda).

Cada tela recebe seu próprio PR. Cada PR é entregue atrás de uma feature flag
se você tiver uma; reverta simplesmente invertendo a flag.

---

## Armadilhas comuns na migração

1. **Esqueceu `data-nac-plugin` no root.** Manifest registrado
   mas LLM cego para ele. **Sintoma:** o chat diz um genérico "Como posso
   ajudar" sem nenhuma ação. Correção: adicione o atributo. (Bug #1 dos
   casos de estudo.)
2. **Stale closure de estado React no onChatAction.** Use refs +
   setters funcionais. (Bug #2 dos casos de estudo.)
3. **ID de aba com role diferente de tab.** Finding do strict-validator v2.2.
   `^tab\.` DEVE ter role `tab`.
4. **Reutilização de IDs após refatoração.** Um botão movido para um novo
   papel semântico DEVE receber um novo id. Reutilizar quebra automações
   downstream.
5. **Biblioteca de componentes descarta data-*.** Detecte cedo; escreva um
   wrapper (passo 5).
6. **Handler de clique não emite ack.** Use `bindAction`. Sem
   ele, `NAC.click()` expira em 5s mesmo quando o efeito colateral
   funcionou.

---

## Veja também

- [AI_PLAYBOOK_NEW_PROJECT.md](AI_PLAYBOOK_NEW_PROJECT.md) -- para
  projetos greenfield.
- [REACT.md](REACT.md) / [ANGULAR.md](ANGULAR.md) -- aprofundamento por framework.
- [NAC_TEST_MANUAL.md](../docs/NAC_TEST_MANUAL.md) -- playbook de testes
  pós-migração.
- [CASE_STUDIES_DISCOVERY.md](../docs/CASE_STUDIES_DISCOVERY.md)
  -- bugs encontrados durante a migração de referência do Yujin.

## Licença

Apache-2.0.

---

*This is a machine translation of the canonical English
version at `/nac-spec/guides/AI_PLAYBOOK_MIGRATION.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
