---
translation_source: guides/REACT.md
translation_source_hash: 9026b361e9e072347481a1f4492eea6f306e77cbbdb53b0d1a40d25008dbecdd
translation_quality: machine_v1
translation_lang: pt
translation_date: 2026-05-11T13:30:30.509907+00:00
---

# Guia de adoção do NAC3 + React

Este guia coloca um app React sob controle do NAC em dois caminhos:

- **Greenfield:** projeto novo, NAC3 desde o primeiro dia.
- **Brownfield:** app existente, NAC3 adicionado progressivamente sem reescrita.

Ambos usam `@nac3/runtime` do npm. Sem suposições sobre etapa de build; funciona com Vite, Next.js, Create React App, Remix ou qualquer bundler que processe pacotes normais.

---

## 1. Instalação

```
npm install @nac3/runtime
```

O pacote expõe o runtime como `window.NAC` após o primeiro import.
O runtime é agnóstico de framework; o React apenas decora o JSX com
atributos `data-nac-*` e registra manifests via `useEffect`.

---

## 2. Greenfield -- app novo

### 2.1 Monte o runtime uma única vez

No seu componente raiz (ou `main.tsx` / `_app.tsx`):

```tsx
import { useEffect } from 'react';
import '@nac3/runtime';
import '@nac3/runtime/extensions';   // v2.0 brownfield primitives + HMAC
// opcional: '@nac3/runtime/chat-client' para voz + chat

export function App() {
  useEffect(() => {
    // Prefixo de tenant (padrão multi-tenant SaaS). Omita se single-tenant.
    if (window.NAC?.setTenantPrefix) {
      window.NAC.setTenantPrefix('demo');
    }
    // Segredo HMAC se você distribuir manifests assinados. Obtenha da sua API de autenticação.
    // window.NAC.set_provenance_secret(secret);
  }, []);

  return <YourAppShell />;
}
```

### 2.2 Decore os componentes

Todo elemento clicável / preenchível / alternável recebe:

- `data-nac-id` -- um caminho pontilhado estável.
- `data-nac-role` -- um dos roles canônicos (veja SPEC seção 1).
- `data-nac-action="<verbo>"` -- apenas para `role="action"`.

```tsx
function InvoiceForm({ invoice, onSave, onCancel }) {
  return (
    <article data-nac-plugin="invoice">
      <input
        type="text"
        data-nac-id="invoice.client_name"
        data-nac-role="field"
        value={invoice.clientName}
        onChange={(e) => /* ... */}
      />

      <button
        data-nac-id="invoice.save"
        data-nac-role="action"
        data-nac-action="save"
        onClick={onSave}
      >
        Save
      </button>

      <button
        data-nac-id="invoice.cancel"
        data-nac-role="action"
        data-nac-action="cancel"
        onClick={onCancel}
      >
        Cancel
      </button>
    </article>
  );
}
```

### 2.3 Registre um manifest

O manifest é a fonte de verdade voltada ao agente. Um LLM que resolve
"guardar" encontra o verbo `save` aqui:

```tsx
import { useEffect } from 'react';

const INVOICE_MANIFEST = {
  plugin_slug: 'invoice',
  version: '1.0.0',
  nac_version: '2.1',
  elements: [
    {
      id: 'invoice.client_name',
      role: 'field',
      label_i18n: {
        es: 'Nombre del cliente', en: 'Customer name',
        pt: 'Nome do cliente', fr: 'Nom du client',
        it: 'Nome del cliente', de: 'Kundenname',
        ja: '顧客名', zh: '客户名称',
        hi: 'ग्राहक का नाम', ar: 'اسم العميل'
      }
    },
    {
      id: 'invoice.save',
      role: 'action',
      actions: [{
        verb: 'save',
        label_i18n: { /* 10 locales */ }
      }],
      label_i18n: { /* 10 locales */ }
    },
    {
      id: 'invoice.cancel',
      role: 'action',
      actions: [{
        verb: 'cancel',
        label_i18n: { /* 10 locales */ }
      }],
      label_i18n: { /* 10 locales */ }
    }
  ]
};

export function InvoiceForm(props) {
  useEffect(() => {
    if (!window.NAC) return;
    window.NAC.register(INVOICE_MANIFEST);
  }, []);
  // ... JSX da seção 2.2 ...
}
```

Regras importantes:

- `useEffect` com deps `[]`: registre apenas uma vez na montagem.
- O manifest é um objeto estático; não o reconstrua a cada render
  (o runtime trata `register` como idempotente, mas você desperdiça ciclos).
- O React Strict Mode invoca os effects duas vezes em desenvolvimento. O
  `register` do runtime é idempotente; sem problemas.

### 2.4 Emita eventos de sucesso nos handlers

Se o runtime for acionado por um agente que aguarda `NAC.click()`,
seus handlers devem emitir `nac:action:succeeded` após o efeito colateral:

```tsx
function onSave() {
  await api.saveInvoice(/* ... */);
  document.dispatchEvent(new CustomEvent('nac:action:succeeded', {
    detail: { plugin: 'invoice', action_id: 'invoice.save' }
  }));
}
```

Este é o contrato da v2.1. A v2.2 traz um hook `useNACAction` que faz
isso por você (veja a seção de Hooks abaixo).

### 2.5 Acione o runtime

A partir de qualquer agente, runner de voz ou teste:

```tsx
await window.NAC.click('invoice.save');
// ou por verbo:
await window.NAC.click_by_verb('invoice', 'save');
// ou preencha um campo:
await window.NAC.fill('invoice.client_name', 'Acme Corp');
```

---

## 3. Brownfield -- app React existente

O princípio: não refatore tudo de uma vez. Adicione NAC3 a um
componente, valide, repita.

### 3.1 Ordem de ataque

1. **Comece pelo wrapper de nível superior.** Adicione `data-nac-plugin="<slug-do-seu-app>"`
   à sua `<div>` ou `<main>` raiz. A árvore de escopos do runtime a detecta.
2. **Botões mais usados em seguida.** Save, cancel, submit, delete nas
   telas mais acessadas. Adicione `data-nac-id`, `data-nac-role="action"`,
   `data-nac-action="<verbo>"`. Não adicione manifest ainda.
3. **Verifique se o runtime os enxerga.** Abra o DevTools, execute
   `NAC.describe()`. Os botões devem aparecer sob o slug do plugin.
4. **Adicione um manifest mínimo.** Apenas os botões do passo 2, com
   seus verbos. Agora `NAC.click_by_verb()` funciona.
5. **Adicione os campos.** Inputs recebem `data-nac-role="field"` + entradas no manifest.
6. **Adicione as abas.** Seletores de aba recebem `data-nac-role="tab"`. **Crítico:**
   ids que correspondam a `^tab\.` DEVEM ter role `tab` (a query `NAC.tab()`
   do runtime é exclusiva para roles canônicos; veja SPEC seção 1).

### 3.2 Não briga com sua biblioteca de componentes existente

Você provavelmente usa shadcn / Mantine / MUI / Chakra / seu-sistema-customizado.
A maioria renderiza seu próprio DOM. Dois padrões funcionam:

**Padrão A: passe os atributos NAC3 diretamente.** A maioria das bibliotecas
bem construídas repassa props desconhecidas ao elemento DOM subjacente:

```tsx
<Button
  data-nac-id="invoice.save"
  data-nac-role="action"
  data-nac-action="save"
  onClick={onSave}
>
  Save
</Button>
```

Se sua biblioteca repassa atributos `data-*`, isso é suficiente.

**Padrão B: componente wrapper.** Se sua biblioteca engole props `data-*`,
escreva um wrapper pequeno:

```tsx
import { Button as MuiButton } from '@mui/material';
import { useEffect, useRef } from 'react';

interface NACButtonProps {
  nacId: string;
  verb: string;
  // ...outras props do MUI
}

export function NACButton({ nacId, verb, ...rest }: NACButtonProps) {
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    ref.current.setAttribute('data-nac-id', nacId);
    ref.current.setAttribute('data-nac-role', 'action');
    ref.current.setAttribute('data-nac-action', verb);
  }, [nacId, verb]);
  return <MuiButton ref={ref} {...rest} />;
}
```

### 3.3 Auto-registro a partir do DOM

Se declarar manifests manualmente for trabalhoso, a extensão v2.0
`autoRegister.watch` percorre o DOM e registra automaticamente tudo
que tiver `data-nac-id` + `data-nac-role`:

```tsx
useEffect(() => {
  if (!window.NAC?.autoRegister) return;
  const root = document.querySelector('[data-nac-plugin]');
  if (!root) return;
  root.setAttribute('data-nac-watch', '1');
  window.NAC.autoRegister.watch(root, {
    i18n_strict: 'permissive',  // aceita catálogo parcial de 10 locales durante a migração
    throttleMs: 100
  });
}, []);
```

`i18n_strict: 'permissive'` é o correto para brownfield. Em produção,
mude para `'strict'` assim que seu catálogo de i18n estiver completo.

---

## 4. Hooks (prévia da v2.2)

Estes serão entregues na v2.2. Para a v2.1, você pode copiá-los no seu
projeto hoje; eles envolvem o runtime v2.1 e oferecem uma API React mais idiomática.

### 4.1 `useNACManifest`

```tsx
export function useNACManifest(manifest) {
  useEffect(() => {
    if (!window.NAC) return;
    window.NAC.register(manifest);
  }, [manifest.plugin_slug]);  // re-registra apenas quando o slug muda
}
```

### 4.2 `useNACAction` -- emissão automática de confirmação

```tsx
import { useEffect, useRef } from 'react';

export function useNACAction(plugin: string, actionId: string) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    function onClick() {
      // Emite o evento de contrato v2.1 após o onClick do React ser executado.
      // Atraso via microtask para que o evento sintético do React termine primeiro.
      queueMicrotask(() => {
        document.dispatchEvent(new CustomEvent('nac:action:succeeded', {
          detail: { plugin, action_id: actionId }
        }));
      });
    }
    el.addEventListener('click', onClick);
    return () => el.removeEventListener('click', onClick);
  }, [plugin, actionId]);
  return ref;
}
```

Uso:

```tsx
function SaveButton({ onSave }) {
  const ref = useNACAction('invoice', 'invoice.save');
  return (
    <button
      ref={ref}
      data-nac-id="invoice.save"
      data-nac-role="action"
      data-nac-action="save"
      onClick={onSave}
    >
      Save
    </button>
  );
}
```

### 4.3 `useNACDescribe` -- inspecione a árvore a partir de um painel

```tsx
import { useState, useEffect } from 'react';

export function useNACDescribe() {
  const [snap, setSnap] = useState(null);
  useEffect(() => {
    if (!window.NAC) return;
    setSnap(window.NAC.describe());
    const tick = setInterval(() => setSnap(window.NAC.describe()), 1000);
    return () => clearInterval(tick);
  }, []);
  return snap;
}
```

---

## 5. Testes

### 5.1 Unitários + integração

O NAC3 funciona bem com React Testing Library:

```tsx
import { render, fireEvent, waitFor } from '@testing-library/react';
import '@nac3/runtime';
import { InvoiceForm } from './InvoiceForm';

test('save button drives via NAC', async () => {
  render(<InvoiceForm />);

  const saved = jest.fn();
  document.addEventListener('nac:action:succeeded', saved);

  await window.NAC.click('invoice.save');

  await waitFor(() => expect(saved).toHaveBeenCalled());
});
```

### 5.2 End-to-end (Playwright)

```ts
import { test, expect } from '@playwright/test';

test('invoice save', async ({ page }) => {
  await page.goto('/invoices/new');
  await page.evaluate(() => window.NAC.fill('invoice.client_name', 'Acme'));
  await page.evaluate(() => window.NAC.click('invoice.save'));
  await expect(page.getByText('Invoice saved')).toBeVisible();
});
```

---

## 6. Armadilhas comuns

- **Ids obsoletos em listas com chave.** Se você constrói ids a partir do
  índice de linha (`data-nac-id={'row.' + i}`) e as linhas são reordenadas,
  agentes que cachearam o id quebram. Use chaves estáveis (ids do banco de dados).
- **Renderização condicional.** Um botão que monta/desmonta com base em
  `if (loaded)` confunde um LLM que capturou a árvore antes do carregamento.
  Informe o LLM: `NAC.describe()` inclui um flag `mounted` por elemento
  (sempre ativo na v2.1); seu consumidor de snapshot deve filtrar por ele.
- **React 18 Strict Mode.** Effects invocados duas vezes re-registram o
  manifest. O runtime é idempotente; sem problemas, mas você verá linhas
  de log duplicadas em desenvolvimento.
- **Server components / SSR.** O NAC3 é client-only. Marque componentes
  que usam NAC com `'use client'` (Next.js App Router) ou renderize-os
  de forma lazy.

---

## 7. Indo para produção

Antes de publicar:

1. Substitua `i18n_strict: 'permissive'` por `'strict'`. O CI detecta
   traduções ausentes.
2. Execute `npx @nac3/runtime validate ./src` -- espere zero ocorrências de
   severidade de erro.
3. Execute `NAC.validate_global()` a partir de um teste Playwright; asserte
   que retorna `[]`.
4. Se multi-tenant, garanta que os manifests sejam assinados com HMAC no
   servidor e que `NAC.set_provenance_secret()` seja chamado a partir de
   código autenticado.

---

## 8. Próximos passos

- `SPEC.md` para o contrato completo.
- `guides/LLM_WIRING.md` para o backend intermediário que resolve
  "guardar la factura" em `NAC.click_by_verb('invoice','save')`.
- `SECURITY.md` para o modelo de ameaças.
- As demos em yujin.app/nac-spec/ (`example.php` é a referência da v1.9;
  `example-v20-full.php` é a história de migração brownfield).

---

*This is a machine translation of the canonical English
version at `/nac-spec/guides/REACT.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
