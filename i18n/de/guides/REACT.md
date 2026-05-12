---
translation_source: guides/REACT.md
translation_source_hash: 9026b361e9e072347481a1f4492eea6f306e77cbbdb53b0d1a40d25008dbecdd
translation_quality: machine_v1
translation_lang: de
translation_date: 2026-05-11T14:15:05.760486+00:00
---

# NAC3 + React Adoptionsleitfaden

Dieser Leitfaden beschreibt zwei Wege, eine React-App NAC-gesteuert zu machen:

- **Greenfield:** neues Projekt, NAC3 von Anfang an.
- **Brownfield:** bestehende App, NAC3 wird schrittweise ohne Rewrite hinzugefügt.

Beide Varianten verwenden `@nac3/runtime` aus npm. Keine Annahmen zum Build-System – funktioniert mit Vite, Next.js, Create React App, Remix oder allem, was normale Pakete bündelt.

---

## 1. Installation

```
npm install @nac3/runtime
```

Das Paket stellt die Runtime nach dem ersten Import als `window.NAC` bereit.
Die Runtime ist framework-agnostisch; React ergänzt JSX lediglich um
`data-nac-*`-Attribute und registriert Manifeste via `useEffect`.

---

## 2. Greenfield – neue App

### 2.1 Runtime einmalig einbinden

In der Root-Komponente (oder `main.tsx` / `_app.tsx`):

```tsx
import { useEffect } from 'react';
import '@nac3/runtime';
import '@nac3/runtime/extensions';   // v2.0 brownfield primitives + HMAC
// optional: '@nac3/runtime/chat-client' für Voice + Chat

export function App() {
  useEffect(() => {
    // Tenant-Präfix (Multi-Tenant-SaaS-Muster). Bei Single-Tenant weglassen.
    if (window.NAC?.setTenantPrefix) {
      window.NAC.setTenantPrefix('demo');
    }
    // HMAC-Secret für signierte Manifeste. Aus der Auth-API beziehen.
    // window.NAC.set_provenance_secret(secret);
  }, []);

  return <YourAppShell />;
}
```

### 2.2 Komponenten dekorieren

Jedes klickbare / befüllbare / umschaltbare Element erhält:

- `data-nac-id` – einen stabilen, durch Punkte getrennten Pfad.
- `data-nac-role` – eine der kanonischen Rollen (siehe SPEC Abschnitt 1).
- `data-nac-action="<verb>"` – nur für `role="action"`.

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

### 2.3 Manifest registrieren

Das Manifest ist die maßgebliche Informationsquelle für den Agenten. Ein LLM, das „guardar" auflöst, findet hier das Verb `save`:

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
        label_i18n: { /* 10 Sprachvarianten */ }
      }],
      label_i18n: { /* 10 Sprachvarianten */ }
    },
    {
      id: 'invoice.cancel',
      role: 'action',
      actions: [{
        verb: 'cancel',
        label_i18n: { /* 10 Sprachvarianten */ }
      }],
      label_i18n: { /* 10 Sprachvarianten */ }
    }
  ]
};

export function InvoiceForm(props) {
  useEffect(() => {
    if (!window.NAC) return;
    window.NAC.register(INVOICE_MANIFEST);
  }, []);
  // ... JSX aus 2.2 ...
}
```

Wichtige Regeln:

- `useEffect` mit `[]`-Abhängigkeiten: einmalig beim Mounten registrieren.
- Das Manifest ist ein statisches Objekt; nicht bei jedem Render neu erstellen
  (die Runtime behandelt `register` als idempotent, aber es verschwendet Rechenzeit).
- React Strict Mode ruft Effects im Entwicklungsmodus doppelt auf. Das `register`
  der Runtime ist idempotent – kein Problem.

### 2.4 Erfolgsereignisse aus Handlern senden

Wenn die Runtime von einem Agenten gesteuert wird, der auf `NAC.click()` wartet,
müssen Handler nach ihrem Seiteneffekt `nac:action:succeeded` auslösen:

```tsx
function onSave() {
  await api.saveInvoice(/* ... */);
  document.dispatchEvent(new CustomEvent('nac:action:succeeded', {
    detail: { plugin: 'invoice', action_id: 'invoice.save' }
  }));
}
```

Dies ist der v2.1-Vertrag. v2.2 liefert einen `useNACAction`-Hook, der das
automatisch übernimmt (siehe Abschnitt Hooks weiter unten).

### 2.5 Steuerung

Von einem beliebigen Agenten, Voice-Runner oder Test aus:

```tsx
await window.NAC.click('invoice.save');
// oder per Verb:
await window.NAC.click_by_verb('invoice', 'save');
// oder ein Feld befüllen:
await window.NAC.fill('invoice.client_name', 'Acme Corp');
```

---

## 3. Brownfield – bestehende React-App

Das Prinzip: nicht alles auf einmal refaktorieren. NAC3 zu einer Komponente
hinzufügen, validieren, wiederholen.

### 3.1 Vorgehensreihenfolge

1. **Zuerst den Top-Level-Wrapper.** `data-nac-plugin="<app-slug>"` zum Root-`<div>`
   oder `<main>` hinzufügen. Der Scope-Baum der Runtime erkennt es automatisch.
2. **Dann die meistgenutzten Buttons.** Speichern, Abbrechen, Absenden, Löschen
   in den wichtigsten Screens. `data-nac-id`, `data-nac-role="action"` und
   `data-nac-action="<verb>"` hinzufügen. Noch kein Manifest anlegen.
3. **Prüfen, ob die Runtime sie erkennt.** DevTools öffnen, `NAC.describe()`
   ausführen. Die Buttons sollten unter ihrem Plugin-Slug erscheinen.
4. **Minimales Manifest hinzufügen.** Nur die Buttons aus Schritt 2 mit ihren
   Verben. Damit funktioniert `NAC.click_by_verb()`.
5. **Felder hinzufügen.** Eingabefelder erhalten `data-nac-role="field"` und
   Manifest-Einträge.
6. **Tabs hinzufügen.** Tab-Umschalter erhalten `data-nac-role="tab"`. **Wichtig:**
   IDs, die auf `^tab\.` passen, MÜSSEN die Rolle `tab` haben (die
   `NAC.tab()`-Abfrage der Runtime arbeitet ausschließlich mit kanonischen Rollen;
   siehe SPEC Abschnitt 1).

### 3.2 Nicht gegen die bestehende Komponentenbibliothek ankämpfen

Wahrscheinlich wird shadcn / Mantine / MUI / Chakra oder ein eigenes System
verwendet. Die meisten rendern ihr eigenes DOM. Zwei Muster funktionieren:

**Muster A: NAC3-Attribute durchreichen.** Die meisten gut gebauten Bibliotheken
leiten unbekannte Props an das zugrunde liegende DOM-Element weiter:

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

Wenn die Bibliothek `data-*`-Attribute weiterleitet, reicht das aus.

**Muster B: Wrapper-Komponente.** Falls die Bibliothek `data-*`-Props verschluckt,
einen kleinen Wrapper schreiben:

```tsx
import { Button as MuiButton } from '@mui/material';
import { useEffect, useRef } from 'react';

interface NACButtonProps {
  nacId: string;
  verb: string;
  // ...weitere MUI-Props
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

### 3.3 Automatische Registrierung aus dem DOM

Wenn das manuelle Deklarieren von Manifesten mühsam ist, durchläuft die v2.0-Extension
`autoRegister.watch` das DOM und registriert automatisch alles mit `data-nac-id` +
`data-nac-role`:

```tsx
useEffect(() => {
  if (!window.NAC?.autoRegister) return;
  const root = document.querySelector('[data-nac-plugin]');
  if (!root) return;
  root.setAttribute('data-nac-watch', '1');
  window.NAC.autoRegister.watch(root, {
    i18n_strict: 'permissive',  // unvollständige 10-Locale-Einträge während der Migration akzeptieren
    throttleMs: 100
  });
}, []);
```

`i18n_strict: 'permissive'` ist für Brownfield-Projekte richtig. Für die Produktion
auf `'strict'` umstellen, sobald der i18n-Katalog vollständig ist.

---

## 4. Hooks (v2.2 Vorschau)

Diese werden mit v2.2 ausgeliefert. Für v2.1 können sie heute ins Projekt kopiert
werden; sie kapseln die v2.1-Runtime und bieten eine idiomatischere React-API.

### 4.1 `useNACManifest`

```tsx
export function useNACManifest(manifest) {
  useEffect(() => {
    if (!window.NAC) return;
    window.NAC.register(manifest);
  }, [manifest.plugin_slug]);  // nur bei Slug-Änderung neu registrieren
}
```

### 4.2 `useNACAction` – automatische Bestätigung senden

```tsx
import { useEffect, useRef } from 'react';

export function useNACAction(plugin: string, actionId: string) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    function onClick() {
      // v2.1-Vertragsereignis nach dem React-onClick auslösen.
      // Microtask-Verzögerung, damit Reacts synthetisches Event zuerst abgeschlossen wird.
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

Verwendung:

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

### 4.3 `useNACDescribe` – den Baum aus einem Panel heraus inspizieren

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

## 5. Testen

### 5.1 Unit- und Integrationstests

NAC3 funktioniert problemlos mit React Testing Library:

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

### 5.2 End-to-End-Tests (Playwright)

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

## 6. Häufige Fallstricke

- **Veraltete IDs in sortierten Listen.** Werden IDs aus einem Zeilenindex
  aufgebaut (`data-nac-id={'row.' + i}`) und die Zeilen umsortiert, brechen
  Agenten, die die ID gecacht haben. Stabile Schlüssel verwenden (Datenbank-IDs).
- **Bedingtes Rendering.** Ein Button, der abhängig von `if (loaded)` gemountet
  oder entfernt wird, verwirrt ein LLM, das den Baum vor dem Laden als Snapshot
  erfasst hat. Hinweis: `NAC.describe()` enthält ab v2.1 ein `mounted`-Flag pro
  Element; Snapshot-Konsumenten sollten danach filtern.
- **React 18 Strict Mode.** Doppelt aufgerufene Effects registrieren das Manifest
  erneut. Die Runtime ist idempotent – kein Problem, aber im Entwicklungsmodus
  erscheinen doppelte Log-Zeilen.
- **Server Components / SSR.** NAC3 ist ausschließlich clientseitig. NAC-nutzende
  Komponenten mit `'use client'` markieren (Next.js App Router) oder lazy rendern.

---

## 7. Produktionsreife

Vor dem Deployment:

1. `i18n_strict: 'permissive'` durch `'strict'` ersetzen. CI erkennt fehlende
   Übersetzungen.
2. `npx @nac3/runtime validate ./src` ausführen – es sollten null Fehler mit
   Schweregrad „error" auftreten.
3. `NAC.validate_global()` aus einem Playwright-Test aufrufen und prüfen, dass
   `[]` zurückgegeben wird.
4. Bei Multi-Tenant-Betrieb sicherstellen, dass Manifeste serverseitig HMAC-signiert
   sind und `NAC.set_provenance_secret()` aus authentifiziertem Code aufgerufen wird.

---

## 8. Nächste Schritte

- `SPEC.md` für den vollständigen Vertrag.
- `guides/LLM_WIRING.md` für das Intermediär-Backend, das „guardar la factura"
  in `NAC.click_by_verb('invoice','save')` auflöst.
- `SECURITY.md` für das Bedrohungsmodell.
- Die Demos unter yujin.app/nac-spec/ (`example.php` ist die v1.9-Referenz;
  `example-v20-full.php` zeigt die Brownfield-Migrationsstory).

---

*This is a machine translation of the canonical English
version at `/nac-spec/guides/REACT.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
