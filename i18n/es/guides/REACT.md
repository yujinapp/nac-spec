---
translation_source: guides/REACT.md
translation_source_hash: 9026b361e9e072347481a1f4492eea6f306e77cbbdb53b0d1a40d25008dbecdd
translation_quality: machine_v1
translation_lang: es
translation_date: 2026-05-11T13:21:51.627878+00:00
---

# Guía de adopción de NAC3 + React

Esta guía lleva una app de React a ser manejada por NAC en dos caminos:

- **Greenfield:** proyecto nuevo, NAC3 desde el primer día.
- **Brownfield:** app existente, NAC3 agregado progresivamente sin reescribir.

Ambos usan `@nac3/runtime` desde npm. No hay suposiciones sobre el proceso de build; funciona con Vite, Next.js, Create React App, Remix o cualquier bundler que procese paquetes normales.

---

## 1. Instalación

```
npm install @nac3/runtime
```

El paquete expone el runtime como `window.NAC` tras la primera importación.
El runtime es independiente del framework; React simplemente decora el JSX con atributos `data-nac-*` y registra manifiestos mediante `useEffect`.

---

## 2. Greenfield -- app nueva

### 2.1 Montar el runtime una sola vez

En tu componente raíz (o `main.tsx` / `_app.tsx`):

```tsx
import { useEffect } from 'react';
import '@nac3/runtime';
import '@nac3/runtime/extensions';   // v2.0 brownfield primitives + HMAC
// opcional: '@nac3/runtime/chat-client' para voz + chat

export function App() {
  useEffect(() => {
    // Prefijo de tenant (patrón multi-tenant SaaS). Omitir si es single-tenant.
    if (window.NAC?.setTenantPrefix) {
      window.NAC.setTenantPrefix('demo');
    }
    // Secreto HMAC si distribuyes manifiestos firmados. Obtenerlo de tu API de autenticación.
    // window.NAC.set_provenance_secret(secret);
  }, []);

  return <YourAppShell />;
}
```

### 2.2 Decorar componentes

Todo elemento clickeable / rellenable / conmutable recibe:

- `data-nac-id` -- una ruta con puntos estable.
- `data-nac-role` -- uno de los roles canónicos (ver SPEC sec 1).
- `data-nac-action="<verb>"` -- solo para `role="action"`.

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

### 2.3 Registrar un manifiesto

El manifiesto es la fuente de verdad orientada al agente. Un LLM que resuelve "guardar" encuentra el verbo `save` aquí:

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
  // ... JSX de 2.2 ...
}
```

Reglas clave:

- `useEffect` con deps `[]`: registrar una sola vez al montar.
- El manifiesto es un objeto estático; no lo reconstruyas en cada render (el runtime trata `register` como idempotente, pero desperdicias ciclos).
- El modo Strict de React invoca los efectos dos veces en desarrollo. El `register` del runtime es idempotente; es seguro.

### 2.4 Emitir eventos de éxito desde los handlers

Si el runtime va a ser manejado por un agente que espera `NAC.click()`, tus handlers deben emitir `nac:action:succeeded` después de su efecto secundario:

```tsx
function onSave() {
  await api.saveInvoice(/* ... */);
  document.dispatchEvent(new CustomEvent('nac:action:succeeded', {
    detail: { plugin: 'invoice', action_id: 'invoice.save' }
  }));
}
```

Este es el contrato de v2.1. La v2.2 incluye un hook `useNACAction` que hace esto por ti (ver la sección de Hooks más abajo).

### 2.5 Manejarlo

Desde cualquier agente, runner de voz o prueba:

```tsx
await window.NAC.click('invoice.save');
// o por verbo:
await window.NAC.click_by_verb('invoice', 'save');
// o rellenar un campo:
await window.NAC.fill('invoice.client_name', 'Acme Corp');
```

---

## 3. Brownfield -- app React existente

El principio: no refactorizar todo de una vez. Agrega NAC3 a un componente, valida, repite.

### 3.1 Orden de ataque

1. **Primero el wrapper de nivel superior.** Agrega `data-nac-plugin="<tu-app-slug>"` a tu `<div>` o `<main>` raíz. El árbol de scopes del runtime lo detecta.
2. **Luego los botones más usados.** Guardar, cancelar, enviar, eliminar en tus pantallas más frecuentes. Agrega `data-nac-id`, `data-nac-role="action"`, `data-nac-action="<verb>"`. Todavía no agregues un manifiesto.
3. **Verifica que el runtime los detecte.** Abre DevTools, ejecuta `NAC.describe()`. Los botones deben aparecer bajo su plugin slug.
4. **Agrega un manifiesto mínimo.** Solo los botones del paso 2, con sus verbos. Ahora `NAC.click_by_verb()` funciona.
5. **Agrega los campos.** Los inputs reciben `data-nac-role="field"` + entradas en el manifiesto.
6. **Agrega las pestañas.** Los selectores de pestañas reciben `data-nac-role="tab"`. **Crítico:** los ids que coincidan con `^tab\.` DEBEN tener el role `tab` (la consulta `NAC.tab()` del runtime es solo por rol canónico; ver SPEC sec 1).

### 3.2 No pelees con tu librería de componentes existente

Probablemente uses shadcn / Mantine / MUI / Chakra / tu-sistema-propio. La mayoría renderiza su propio DOM. Dos patrones funcionan:

**Patrón A: pasar los atributos NAC3 directamente.** La mayoría de las librerías bien construidas reenvían props desconocidas al elemento DOM subyacente:

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

Si tu librería reenvía atributos `data-*`, esto es suficiente.

**Patrón B: componente wrapper.** Si tu librería consume los props `data-*` sin pasarlos, escribe un wrapper pequeño:

```tsx
import { Button as MuiButton } from '@mui/material';
import { useEffect, useRef } from 'react';

interface NACButtonProps {
  nacId: string;
  verb: string;
  // ...otras props de Mui
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

### 3.3 Auto-registro desde el DOM

Si declarar manifiestos a mano es tedioso, la extensión `autoRegister.watch` de v2.0 recorre el DOM y registra automáticamente todo lo que tenga `data-nac-id` + `data-nac-role`:

```tsx
useEffect(() => {
  if (!window.NAC?.autoRegister) return;
  const root = document.querySelector('[data-nac-plugin]');
  if (!root) return;
  root.setAttribute('data-nac-watch', '1');
  window.NAC.autoRegister.watch(root, {
    i18n_strict: 'permissive',  // acepta catálogo parcial de 10 locales durante la migración
    throttleMs: 100
  });
}, []);
```

`i18n_strict: 'permissive'` es lo correcto para brownfield. En producción, cambia a `'strict'` una vez que tu catálogo i18n esté completo.

---

## 4. Hooks (preview v2.2)

Estos se incluyen en v2.2. Para v2.1 puedes copiarlos en tu proyecto hoy; envuelven el runtime v2.1 y ofrecen una API más idiomática para React.

### 4.1 `useNACManifest`

```tsx
export function useNACManifest(manifest) {
  useEffect(() => {
    if (!window.NAC) return;
    window.NAC.register(manifest);
  }, [manifest.plugin_slug]);  // re-registrar solo si cambia el slug
}
```

### 4.2 `useNACAction` -- emitir ack automáticamente

```tsx
import { useEffect, useRef } from 'react';

export function useNACAction(plugin: string, actionId: string) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    function onClick() {
      // Emite el evento de contrato v2.1 después de que corre el onClick de React.
      // Delay de microtask para que el evento sintético de React termine primero.
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

### 4.3 `useNACDescribe` -- inspeccionar el árbol desde un panel

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

## 5. Testing

### 5.1 Unitario + integración

NAC3 funciona bien con React Testing Library:

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

## 6. Errores comunes

- **IDs obsoletos en listas con keys.** Si construyes ids a partir del índice de fila (`data-nac-id={'row.' + i}`) y las filas se reordenan, los agentes que cachearon el id se rompen. Usa keys estables (ids de base de datos).
- **Renderizado condicional.** Un botón que se monta/desmonta según `if (loaded)` confunde a un LLM que tomó un snapshot del árbol antes de la carga. Informa al LLM: `NAC.describe()` incluye un flag `mounted` por elemento (siempre activo en v2.1); el consumidor del snapshot debe filtrar por ese valor.
- **React 18 Strict Mode.** Los efectos invocados dos veces vuelven a registrar el manifiesto. El runtime es idempotente; es seguro, pero verás líneas de log duplicadas en desarrollo.
- **Componentes de servidor / SSR.** NAC3 es solo para el cliente. Marca los componentes que usen NAC con `'use client'` (Next.js App Router) o renderízalos de forma lazy.

---

## 7. Ir a producción

Antes de publicar:

1. Reemplaza `i18n_strict: 'permissive'` por `'strict'`. El CI detectará traducciones faltantes.
2. Ejecuta `npx @nac3/runtime validate ./src` -- espera cero hallazgos de severidad error.
3. Ejecuta `NAC.validate_global()` desde una prueba de Playwright; verifica que retorne `[]`.
4. Si es multi-tenant, asegúrate de que los manifiestos estén firmados con HMAC del lado del servidor y que `NAC.set_provenance_secret()` se llame desde código autenticado.

---

## 8. Próximos pasos

- `SPEC.md` para el contrato completo.
- `guides/LLM_WIRING.md` para el backend intermediario que resuelve "guardar la factura" en `NAC.click_by_verb('invoice','save')`.
- `SECURITY.md` para el modelo de amenazas.
- Los demos en yujin.app/nac-spec/ (`example.php` es la referencia v1.9; `example-v20-full.php` es la historia de migración brownfield).

---

*This is a machine translation of the canonical English
version at `/nac-spec/guides/REACT.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
