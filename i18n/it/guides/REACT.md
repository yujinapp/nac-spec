---
translation_source: guides/REACT.md
translation_source_hash: 9026b361e9e072347481a1f4492eea6f306e77cbbdb53b0d1a40d25008dbecdd
translation_quality: machine_v1
translation_lang: it
translation_date: 2026-05-11T13:49:16.275739+00:00
---

# Guida all'adozione di NAC3 + React

Questa guida illustra due percorsi per rendere un'app React guidata da NAC:

- **Greenfield:** nuovo progetto, NAC3 fin dal primo giorno.
- **Brownfield:** app esistente, NAC3 aggiunto progressivamente senza riscrivere tutto.

Entrambi usano `@nac3/runtime` da npm. Nessun presupposto sul build step: funziona con Vite, Next.js, Create React App, Remix o qualsiasi bundler che gestisca pacchetti normali.

---

## 1. Installazione

```
npm install @nac3/runtime
```

Il pacchetto espone il runtime come `window.NAC` al primo import.
Il runtime è framework-agnostic; React si limita a decorare il JSX con attributi `data-nac-*` e a registrare i manifest tramite `useEffect`.

---

## 2. Greenfield -- nuova app

### 2.1 Montare il runtime una sola volta

Nel componente radice (o in `main.tsx` / `_app.tsx`):

```tsx
import { useEffect } from 'react';
import '@nac3/runtime';
import '@nac3/runtime/extensions';   // v2.0 brownfield primitives + HMAC
// opzionale: '@nac3/runtime/chat-client' per voice + chat

export function App() {
  useEffect(() => {
    // Prefisso tenant (pattern multi-tenant SaaS). Omettere se single-tenant.
    if (window.NAC?.setTenantPrefix) {
      window.NAC.setTenantPrefix('demo');
    }
    // Segreto HMAC se si distribuiscono manifest firmati. Recuperarlo dalla propria API di autenticazione.
    // window.NAC.set_provenance_secret(secret);
  }, []);

  return <YourAppShell />;
}
```

### 2.2 Decorare i componenti

Ogni elemento cliccabile / compilabile / commutabile riceve:

- `data-nac-id` -- un percorso puntato stabile.
- `data-nac-role` -- uno dei ruoli canonici (vedi SPEC sez. 1).
- `data-nac-action="<verb>"` -- solo per `role="action"`.

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

### 2.3 Registrare un manifest

Il manifest è la fonte di verità lato agente. Un LLM che risolve "guardar" trova il verbo `save` qui:

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
        label_i18n: { /* 10 locali */ }
      }],
      label_i18n: { /* 10 locali */ }
    },
    {
      id: 'invoice.cancel',
      role: 'action',
      actions: [{
        verb: 'cancel',
        label_i18n: { /* 10 locali */ }
      }],
      label_i18n: { /* 10 locali */ }
    }
  ]
};

export function InvoiceForm(props) {
  useEffect(() => {
    if (!window.NAC) return;
    window.NAC.register(INVOICE_MANIFEST);
  }, []);
  // ... JSX dalla sezione 2.2 ...
}
```

Regole fondamentali:

- `useEffect` con dipendenze `[]`: registrare una sola volta al mount.
- Il manifest è un oggetto statico; non ricrearlo a ogni render (il runtime tratta `register` come idempotente, ma si sprecano cicli inutilmente).
- React Strict Mode invoca gli effect due volte in sviluppo. Il `register` del runtime è idempotente; nessun problema.

### 2.4 Emettere eventi di successo dagli handler

Se il runtime verrà guidato da un agente che attende `NAC.click()`, gli handler devono emettere `nac:action:succeeded` dopo il loro effetto collaterale:

```tsx
function onSave() {
  await api.saveInvoice(/* ... */);
  document.dispatchEvent(new CustomEvent('nac:action:succeeded', {
    detail: { plugin: 'invoice', action_id: 'invoice.save' }
  }));
}
```

Questo è il contratto v2.1. La v2.2 include un hook `useNACAction` che lo fa automaticamente (vedi la sezione Hook più avanti).

### 2.5 Azionare il componente

Da qualsiasi agente, voice runner o test:

```tsx
await window.NAC.click('invoice.save');
// oppure tramite verbo:
await window.NAC.click_by_verb('invoice', 'save');
// oppure compilare un campo:
await window.NAC.fill('invoice.client_name', 'Acme Corp');
```

---

## 3. Brownfield -- app React esistente

Il principio: non fare refactoring di tutto in una volta. Aggiungere NAC3 a un componente, validare, ripetere.

### 3.1 Ordine di intervento

1. **Prima il wrapper di primo livello.** Aggiungere `data-nac-plugin="<slug-app>"` al `<div>` o `<main>` radice. L'albero degli scope del runtime lo rileva automaticamente.
2. **Poi i pulsanti più usati.** Save, cancel, submit, delete nelle schermate più frequentate. Aggiungere `data-nac-id`, `data-nac-role="action"`, `data-nac-action="<verb>"`. Per ora non aggiungere ancora un manifest.
3. **Verificare che il runtime li veda.** Aprire DevTools, eseguire `NAC.describe()`. I pulsanti devono comparire sotto il loro plugin slug.
4. **Aggiungere un manifest minimale.** Solo i pulsanti del passo 2, con i loro verbi. Da questo momento `NAC.click_by_verb()` funziona.
5. **Aggiungere i campi.** Gli input ricevono `data-nac-role="field"` e le relative voci nel manifest.
6. **Aggiungere i tab.** I selettori di tab ricevono `data-nac-role="tab"`. **Importante:** gli id che corrispondono a `^tab\.` DEVONO avere role `tab` (la query `NAC.tab()` del runtime opera solo sui ruoli canonici; vedi SPEC sez. 1).

### 3.2 Non combattere la propria libreria di componenti

Probabilmente si usa shadcn / Mantine / MUI / Chakra / un sistema personalizzato. La maggior parte di queste librerie genera il proprio DOM. Esistono due pattern efficaci:

**Pattern A: passare gli attributi NAC3 direttamente.** La maggior parte delle librerie ben costruite inoltra le prop sconosciute all'elemento DOM sottostante:

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

Se la libreria inoltra gli attributi `data-*`, questo è sufficiente.

**Pattern B: componente wrapper.** Se la libreria ignora le prop `data-*`, scrivere un piccolo wrapper:

```tsx
import { Button as MuiButton } from '@mui/material';
import { useEffect, useRef } from 'react';

interface NACButtonProps {
  nacId: string;
  verb: string;
  // ...altre prop MUI
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

### 3.3 Auto-registrazione dal DOM

Se dichiarare i manifest a mano è tedioso, l'estensione v2.0 `autoRegister.watch` percorre il DOM e registra automaticamente tutto ciò che ha `data-nac-id` + `data-nac-role`:

```tsx
useEffect(() => {
  if (!window.NAC?.autoRegister) return;
  const root = document.querySelector('[data-nac-plugin]');
  if (!root) return;
  root.setAttribute('data-nac-watch', '1');
  window.NAC.autoRegister.watch(root, {
    i18n_strict: 'permissive',  // accetta i18n parziale durante la migrazione
    throttleMs: 100
  });
}, []);
```

`i18n_strict: 'permissive'` è la scelta giusta per il brownfield. In produzione, passare a `'strict'` una volta completato il catalogo i18n.

---

## 4. Hook (anteprima v2.2)

Questi hook saranno inclusi nella v2.2. Per la v2.1 è possibile copiarli nel proprio progetto fin da ora; wrappano il runtime v2.1 e offrono un'API più idiomatica per React.

### 4.1 `useNACManifest`

```tsx
export function useNACManifest(manifest) {
  useEffect(() => {
    if (!window.NAC) return;
    window.NAC.register(manifest);
  }, [manifest.plugin_slug]);  // ri-registra solo al cambio di slug
}
```

### 4.2 `useNACAction` -- emissione automatica dell'ack

```tsx
import { useEffect, useRef } from 'react';

export function useNACAction(plugin: string, actionId: string) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    function onClick() {
      // Emette l'evento contrattuale v2.1 dopo l'esecuzione dell'onClick React.
      // Il ritardo con microtask garantisce che l'evento sintetico di React sia completato.
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

Utilizzo:

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

### 4.3 `useNACDescribe` -- ispezione dell'albero da un pannello

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

### 5.1 Unit + integration

NAC3 si integra bene con React Testing Library:

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

## 6. Errori comuni

- **Id obsoleti nelle liste con chiave.** Se si costruiscono gli id dall'indice di riga (`data-nac-id={'row.' + i}`) e le righe vengono riordinate, gli agenti che hanno memorizzato l'id vanno in errore. Usare chiavi stabili (id del database).
- **Rendering condizionale.** Un pulsante che si monta/smonta in base a `if (loaded)` confonde un LLM che ha acquisito uno snapshot dell'albero prima del caricamento. Il flag `mounted` per elemento incluso in `NAC.describe()` (sempre attivo dalla v2.1) permette al consumer dello snapshot di filtrare di conseguenza.
- **React 18 Strict Mode.** Gli effect invocati due volte ri-registrano il manifest. Il runtime è idempotente; nessun problema, ma in sviluppo compariranno righe di log duplicate.
- **Server components / SSR.** NAC3 è solo client-side. Contrassegnare i componenti che usano NAC con `'use client'` (Next.js App Router) oppure renderizzarli in modo lazy.

---

## 7. Andare in produzione

Prima del rilascio:

1. Sostituire `i18n_strict: 'permissive'` con `'strict'`. La CI intercetterà le traduzioni mancanti.
2. Eseguire `npx @nac3/runtime validate ./src` -- ci si aspetta zero risultati con severità error.
3. Eseguire `NAC.validate_global()` da un test Playwright e verificare che restituisca `[]`.
4. In caso di architettura multi-tenant, assicurarsi che i manifest siano firmati con HMAC lato server e che `NAC.set_provenance_secret()` venga chiamato da codice autenticato.

---

## 8. Prossimi passi

- `SPEC.md` per il contratto completo.
- `guides/LLM_WIRING.md` per il backend intermediario che traduce "guardar la factura" in `NAC.click_by_verb('invoice','save')`.
- `SECURITY.md` per il modello delle minacce.
- Le demo su yujin.app/nac-spec/ (`example.php` è il riferimento v1.9; `example-v20-full.php` illustra la storia della migrazione brownfield).

---

*This is a machine translation of the canonical English
version at `/nac-spec/guides/REACT.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
