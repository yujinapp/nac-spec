---
translation_source: guides/REACT.md
translation_source_hash: 9026b361e9e072347481a1f4492eea6f306e77cbbdb53b0d1a40d25008dbecdd
translation_quality: machine_v1
translation_lang: fr
translation_date: 2026-05-11T13:40:11.082156+00:00
---

# Guide d'adoption NAC3 + React

Ce guide permet de piloter une application React via NAC selon deux approches :

- **Greenfield :** nouveau projet, NAC3 dès le départ.
- **Brownfield :** application existante, NAC3 ajouté progressivement sans réécriture.

Les deux utilisent `@nac3/runtime` depuis npm. Aucune hypothèse sur l'outil de build ; cela fonctionne avec Vite, Next.js, Create React App, Remix, ou tout autre bundler standard.

---

## 1. Installation

```
npm install @nac3/runtime
```

Le package expose le runtime via `window.NAC` dès le premier import.
Le runtime est indépendant du framework ; React se contente de décorer le JSX avec des attributs `data-nac-*` et d'enregistrer les manifestes via `useEffect`.

---

## 2. Greenfield -- nouveau projet

### 2.1 Monter le runtime une seule fois

Dans votre composant racine (ou `main.tsx` / `_app.tsx`) :

```tsx
import { useEffect } from 'react';
import '@nac3/runtime';
import '@nac3/runtime/extensions';   // v2.0 brownfield primitives + HMAC
// optionnel : '@nac3/runtime/chat-client' pour la voix + le chat

export function App() {
  useEffect(() => {
    // Préfixe tenant (pattern SaaS multi-tenant). À ignorer en mono-tenant.
    if (window.NAC?.setTenantPrefix) {
      window.NAC.setTenantPrefix('demo');
    }
    // Secret HMAC si vous distribuez des manifestes signés. À récupérer depuis votre API d'auth.
    // window.NAC.set_provenance_secret(secret);
  }, []);

  return <YourAppShell />;
}
```

### 2.2 Décorer les composants

Chaque élément cliquable / saisissable / commutable reçoit :

- `data-nac-id` -- un chemin pointé stable.
- `data-nac-role` -- l'un des rôles canoniques (voir SPEC sec 1).
- `data-nac-action="<verbe>"` -- uniquement pour `role="action"`.

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

### 2.3 Enregistrer un manifeste

Le manifeste est la source de vérité côté agent. Un LLM qui résout « guardar » y trouve le verbe `save` :

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
  // ... JSX de la section 2.2 ...
}
```

Règles essentielles :

- `useEffect` avec `[]` en dépendances : enregistrement unique au montage.
- Le manifeste est un objet statique ; ne le reconstruisez pas à chaque rendu (le runtime traite `register` comme idempotent, mais vous gaspillez des cycles).
- Le mode Strict de React double-invoque les effets en développement. `register` est idempotent ; aucun risque.

### 2.4 Émettre des événements de succès depuis les handlers

Si le runtime doit être piloté par un agent qui attend `NAC.click()`, vos handlers doivent émettre `nac:action:succeeded` après leur effet de bord :

```tsx
function onSave() {
  await api.saveInvoice(/* ... */);
  document.dispatchEvent(new CustomEvent('nac:action:succeeded', {
    detail: { plugin: 'invoice', action_id: 'invoice.save' }
  }));
}
```

C'est le contrat v2.1. La v2.2 fournit un hook `useNACAction` qui s'en charge automatiquement (voir la section Hooks ci-dessous).

### 2.5 Piloter l'interface

Depuis n'importe quel agent, runner vocal ou test :

```tsx
await window.NAC.click('invoice.save');
// ou par verbe :
await window.NAC.click_by_verb('invoice', 'save');
// ou remplir un champ :
await window.NAC.fill('invoice.client_name', 'Acme Corp');
```

---

## 3. Brownfield -- application React existante

Le principe : ne pas tout refactoriser d'un coup. Ajoutez NAC3 à un composant, validez, répétez.

### 3.1 Ordre d'intervention

1. **Le wrapper de plus haut niveau en premier.** Ajoutez `data-nac-plugin="<votre-slug>"` à votre `<div>` ou `<main>` racine. L'arbre de portée du runtime le détecte automatiquement.
2. **Les boutons les plus utilisés ensuite.** Enregistrer, annuler, soumettre, supprimer dans vos écrans les plus fréquentés. Ajoutez `data-nac-id`, `data-nac-role="action"`, `data-nac-action="<verbe>"`. Pas de manifeste pour l'instant.
3. **Vérifiez que le runtime les détecte.** Ouvrez les DevTools, exécutez `NAC.describe()`. Les boutons doivent apparaître sous leur slug de plugin.
4. **Ajoutez un manifeste minimal.** Uniquement les boutons de l'étape 2, avec leurs verbes. `NAC.click_by_verb()` fonctionne désormais.
5. **Ajoutez les champs.** Les inputs reçoivent `data-nac-role="field"` + les entrées de manifeste correspondantes.
6. **Ajoutez les onglets.** Les sélecteurs d'onglets reçoivent `data-nac-role="tab"`. **Point critique :** les ids correspondant à `^tab\.` DOIVENT avoir le rôle `tab` (la requête `NAC.tab()` du runtime est limitée aux rôles canoniques ; voir SPEC sec 1).

### 3.2 Ne pas lutter contre votre bibliothèque de composants existante

Vous utilisez probablement shadcn / Mantine / MUI / Chakra / votre système maison. La plupart génèrent leur propre DOM. Deux patterns fonctionnent :

**Pattern A : passer les attributs NAC3 en props.** La plupart des bibliothèques bien conçues transmettent les props inconnues à l'élément DOM sous-jacent :

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

Si votre bibliothèque transmet les attributs `data-*`, c'est suffisant.

**Pattern B : composant wrapper.** Si votre bibliothèque absorbe les props `data-*`, écrivez un petit wrapper :

```tsx
import { Button as MuiButton } from '@mui/material';
import { useEffect, useRef } from 'react';

interface NACButtonProps {
  nacId: string;
  verb: string;
  // ...autres props MUI
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

### 3.3 Auto-enregistrement depuis le DOM

Si déclarer les manifestes à la main est fastidieux, l'extension v2.0 `autoRegister.watch` parcourt le DOM et enregistre automatiquement tout élément portant `data-nac-id` + `data-nac-role` :

```tsx
useEffect(() => {
  if (!window.NAC?.autoRegister) return;
  const root = document.querySelector('[data-nac-plugin]');
  if (!root) return;
  root.setAttribute('data-nac-watch', '1');
  window.NAC.autoRegister.watch(root, {
    i18n_strict: 'permissive',  // accepte un catalogue i18n partiel pendant la migration
    throttleMs: 100
  });
}, []);
```

`i18n_strict: 'permissive'` est adapté au brownfield. En production, passez à `'strict'` une fois votre catalogue i18n complet.

---

## 4. Hooks (aperçu v2.2)

Ces hooks sont livrés avec la v2.2. Pour la v2.1, vous pouvez les copier dans votre projet dès maintenant ; ils encapsulent le runtime v2.1 et offrent une API React plus idiomatique.

### 4.1 `useNACManifest`

```tsx
export function useNACManifest(manifest) {
  useEffect(() => {
    if (!window.NAC) return;
    window.NAC.register(manifest);
  }, [manifest.plugin_slug]);  // ré-enregistrement uniquement si le slug change
}
```

### 4.2 `useNACAction` -- émission automatique de l'accusé de réception

```tsx
import { useEffect, useRef } from 'react';

export function useNACAction(plugin: string, actionId: string) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    function onClick() {
      // Émet l'événement du contrat v2.1 après l'exécution du onClick React.
      // Délai via microtask pour laisser l'événement synthétique React se terminer.
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

Utilisation :

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

### 4.3 `useNACDescribe` -- introspection de l'arbre depuis un panneau

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

## 5. Tests

### 5.1 Tests unitaires et d'intégration

NAC3 s'intègre parfaitement avec React Testing Library :

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

### 5.2 Tests de bout en bout (Playwright)

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

## 6. Pièges courants

- **Ids obsolètes dans les listes avec clés.** Si vous construisez des ids à partir d'un index de ligne (`data-nac-id={'row.' + i}`) et que les lignes se réordonnent, les agents qui ont mis l'id en cache se retrouvent en erreur. Utilisez des clés stables (ids de base de données).
- **Rendu conditionnel.** Un bouton qui monte/démonte selon `if (loaded)` perturbe un LLM qui a pris un instantané de l'arbre avant le chargement. Informez le LLM : `NAC.describe()` inclut un flag `mounted` par élément (activé en permanence depuis la v2.1) ; votre consommateur d'instantané doit filtrer sur ce flag.
- **React 18 Strict Mode.** Les effets double-invoqués ré-enregistrent le manifeste. Le runtime est idempotent ; aucun risque, mais vous verrez des lignes de log en double en développement.
- **Composants serveur / SSR.** NAC3 est uniquement côté client. Marquez les composants utilisant NAC avec `'use client'` (Next.js App Router) ou rendez-les de façon différée.

---

## 7. Mise en production

Avant de déployer :

1. Remplacez `i18n_strict: 'permissive'` par `'strict'`. La CI détecte les traductions manquantes.
2. Exécutez `npx @nac3/runtime validate ./src` -- attendez zéro résultat de sévérité erreur.
3. Exécutez `NAC.validate_global()` depuis un test Playwright ; vérifiez qu'il retourne `[]`.
4. En mode multi-tenant, assurez-vous que les manifestes sont signés HMAC côté serveur et que `NAC.set_provenance_secret()` est appelé depuis du code authentifié.

---

## 8. Pour aller plus loin

- `SPEC.md` pour le contrat complet.
- `guides/LLM_WIRING.md` pour le backend intermédiaire qui résout « guardar la factura » en `NAC.click_by_verb('invoice','save')`.
- `SECURITY.md` pour le modèle de menace.
- Les démos sur yujin.app/nac-spec/ (`example.php` est la référence v1.9 ; `example-v20-full.php` illustre la migration brownfield).

---

*This is a machine translation of the canonical English
version at `/nac-spec/guides/REACT.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
