---
translation_source: guides/AI_PLAYBOOK_MIGRATION.md
translation_source_hash: f49b65c798ab36923cab79511851c64a81ad6609a1c37d4936d4c6c0542cc706
translation_quality: machine_v1
translation_lang: fr
translation_date: 2026-05-11T13:44:26.802281+00:00
---

# AI Playbook -- Migrer un projet existant vers NAC3

**Version NAC3 :** 2.2 stable + aperçu interop v2.3.
**Audience :** Tout agent IA (Claude, GPT, Gemini, LLM local) chargé
de migrer une application web existante vers la conformité NAC-3.
**Format :** Runbook étape par étape avec QUOI, COMMENT, VÉRIFIER par étape.

Lorsqu'un humain dit **« migrons ce projet vers NAC-3 »**, un agent IA
lisant ce fichier DOIT exécuter les étapes ci-dessous dans l'ordre.
La migration brownfield est plus difficile que le greenfield car on ne
peut pas casser l'application en production. Chaque étape est livrée
INDÉPENDAMMENT.

---

## Étape 0 -- Périmètre + garde-fous

### 0.1 Questions à poser à l'humain

1. **Niveau de risque** : L'application est-elle en production ? Si oui,
   la migration se fait écran par écran derrière des feature flags. En
   staging, on peut être plus audacieux.
2. **Framework** : Détecter depuis `package.json` / `composer.json` /
   l'arborescence du projet, puis confirmer avec l'humain.
3. **Top 10 des verbes** : Demander à l'humain de lister les 10 actions
   les plus utilisées dans son application (enregistrer, annuler,
   rechercher, filtrer, etc.). Celles-ci migrent en premier.
4. **Backend de chat** : Réutilisera-t-on une infrastructure de chat
   existante (Yujin chat sur `/yujin/nac-demo`, ou votre propre
   intermédiaire LLM) ?
5. **Couverture de tests actuelle** : Playwright / Cypress / Jest
   existants ? Les tests NAC3 seront ajoutés en parallèle, sans
   remplacer les existants.
6. **Bibliothèque de composants** : shadcn / MUI / PrimeNG / Mantine /
   custom ? Certaines bibliothèques absorbent les props `data-*` ; des
   wrappers seront nécessaires (voir étape 5).

### 0.2 Hygiène git avant démarrage

```bash
git status              # DOIT être propre avant de commencer
git checkout -b feat/nac3-migration
```

Chaque étape de migration NAC vit dans son propre commit afin que
l'humain puisse relire et annuler par tranche.

---

## Étape 1 -- Installer le runtime + créer le module de démarrage

```bash
npm install @nac3/runtime@^2.2.0
```

Créer `src/nac/boot.ts` (ou l'équivalent selon le framework) :

```ts
import '@nac3/runtime';
import '@nac3/runtime/extensions';
// import '@nac3/runtime/chat-client';  // uncomment when ready for chat

declare global { interface Window { NAC?: any; NacChat?: any; } }
```

Importer une seule fois depuis le point d'entrée racine de l'application
(`main.tsx`, `app.module.ts`, ou en haut du script dans le `<head>` HTML).

**Vérifier :** `window.NAC` défini dans la console du navigateur ;
`window.NAC.version` retourne `'2.2.0'` (ou supérieur).

**Commit :** `feat(nac3-migration): step 1 -- install runtime + boot module`

---

## Étape 2 -- Décorer le shell de l'application

Ajouter `data-nac-plugin="<app-slug>"` sur le conteneur LE PLUS EXTERNE
qui enveloppe l'interface principale. C'est l'attribut le plus important
de la migration -- sans lui, le snapshot de l'intermédiaire LLM est vide
(leçon tirée des études de cas React + Angular, bug #1, documenté dans
`docs/CASE_STUDIES_DISCOVERY.md`).

### Exemple React

```tsx
return (
  <div className="app" data-nac-plugin="my-app">
    ...
  </div>
);
```

### Exemple Angular

```html
<div class="app" data-nac-plugin="my-app">
  ...
</div>
```

### Rendu côté serveur (PHP / Rails / Django)

```html
<body data-nac-plugin="my-app">
  ...
</body>
```

**Vérifier :** Console du navigateur : `NAC.describe().plugins.length >= 1`.

**Commit :** `feat(nac3-migration): step 2 -- root data-nac-plugin attribute`

---

## Étape 3 -- Décorer les boutons porteurs des 10 verbes principaux

Reprendre les 10 actions les plus utilisées de l'étape 0.3. Pour chaque
bouton :

```html
<button
  data-nac-id="<plugin>.<verb>"
  data-nac-role="action"
  data-nac-action="<verb>"
  onclick="...">
  ...
</button>
```

**Conventions d'ID :**
- Préfixé par le plugin : `invoice.save`, pas juste `save`.
- Snake_case en minuscules : `add_row`, pas `AddRow` ni `add-row`.
- Verbe en feuille pour un verbe global de l'application ; sinon imbriqué :
  `dashboard.invoice.list.row.42.delete`.

Ne pas toucher au `onclick` / gestionnaire d'événement existant -- la
décoration est additive.

**Vérifier :** Depuis la console :
```js
NAC.describe().plugins[0].elements.length  // >= 10
NAC.list_registered_plugins()                // includes your plugin
```

**Commit :** `feat(nac3-migration): step 3 -- top-10 buttons decorated`

---

## Étape 4 -- Ajouter un manifeste minimal

Ne pas chercher à couvrir TOUS les éléments dès le premier jour. Couvrir
les 10 boutons porteurs de verbes de l'étape 3 avec un `label_i18n`
approprié :

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

Enregistrer au démarrage :

```ts
window.NAC?.register(APP_MANIFEST);
```

Si les 10 locales ne peuvent pas être livrées dès le premier jour,
utiliser `i18n_strict: 'permissive'` sur le chemin autoRegister.watch.
Il s'agit d'une béquille temporaire ; le validateur strict NAC3 v2.2 en
production avertira en cas d'i18n incomplète.

**Vérifier :**
```js
NAC.list_registered_plugins()           // ['my-app']
await NAC.click_by_verb('my-app','save')  // resolves
```

**Commit :** `feat(nac3-migration): step 4 -- manifest with top-10 verbs`

---

## Étape 5 -- Gérer la bibliothèque de composants (si applicable)

Si l'application utilise MUI / Mantine / PrimeNG / etc. et que les
boutons absorbent les props `data-*`, écrire un wrapper léger :

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

Remplacer `<Button>` par `<NacButton nacId="..." verb="...">` pour les
10 boutons principaux. Procéder de manière incrémentale.

**Commit :** `feat(nac3-migration): step 5 -- component library wrapper`

---

## Étape 6 -- Émettre le contrat d'acquittement

Le helper `bindAction` de la v2.2 est la voie la plus propre :

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

La couche bindAction déclenche `nac:action:succeeded` automatiquement
après le retour du `onClick` de l'utilisateur. Fini le « le chat dit
'No pude ejecutar X: timeout' ».

**Vérifier :** Depuis la console :
```js
document.addEventListener('nac:action:succeeded', e => console.log(e.detail));
await NAC.click('my-app.save');
// Should print {plugin: 'my-app', action_id: 'my-app.save', ...}
```

**Commit :** `feat(nac3-migration): step 6 -- bindAction ack contract`

---

## Étape 7 -- Ajouter les champs + onglets

Pour chaque champ de saisie :

```html
<input data-nac-id="my-app.field_x" data-nac-role="field" ...>
```

Pour chaque onglet dans les composants de type tab-strip :

```html
<button
  data-nac-id="tab.<key>"
  data-nac-role="tab"
  onclick="...">
  ...
</button>
```

**Point critique (règle du validateur strict v2.2) :** Tout ID
correspondant à `^tab\.` DOIT avoir le rôle `tab`. Un rôle incohérent
produit le finding `tab_id_manifest_role_drift` et le runtime ne peut
plus trouver l'onglet via `NAC.tab()`.

**Commit :** `feat(nac3-migration): step 7 -- fields + tabs decorated`

---

## Étape 8 -- Ajouter le panneau de chat (optionnel, différable)

Intégrer le `nac-chat-client.js` de référence :

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

Alternativement, **différer entièrement le chat** et inviter les
utilisateurs à installer Yujin Pilot (`yujin.app/pilot`), qui découvre
l'application via MCP et la pilote depuis un cockpit centralisé.

**Commit :** `feat(nac3-migration): step 8 -- chat panel`

---

## Étape 9 -- Ajouter le corpus de tests NAC3

Copier l'infrastructure de tests de référence Yujin :

```bash
mkdir -p test/nac3
cp /path/to/rpaforce-crm/packages/nac/test/stage*.mjs ./test/nac3/
cp /path/to/rpaforce-crm/tools/nac/test-launch.sh ./test/nac3/
```

Adapter le slug du plugin et la référence au manifeste. Lancer :

```bash
bash ./test/nac3/test-launch.sh
```

**Vérifier :** Toutes les couches au VERT.

**Commit :** `feat(nac3-migration): step 9 -- NAC3 test corpus`

---

## Étape 10 -- Promouvoir vers la conformité NAC-3

```bash
# Dans votre CI :
npx @nac3/runtime validate ./src --severity=error  # exit 0 required
NAC.validate_global({probe: true})              # zero findings required
```

Définir `NAC.STRICT_VALIDATION = true` dans le boot de production pour
imposer la cohérence des rôles à l'enregistrement.

**Commit :** `feat(nac3-migration): step 10 -- NAC-3 conformance gate`

---

## Ordre de migration entre les écrans

Dans une application en production avec de nombreux écrans, ne pas
tout migrer d'un coup :

1. **L'écran le plus utilisé en premier** (ex. : connexion + tableau de bord).
2. **L'écran à plus forte valeur ensuite** (celui dans lequel vos
   utilisateurs avancés passent leur temps).
3. **Les écrans publics** (visibles par le trafic anonyme).
4. **Les écrans d'administration en dernier** (faible trafic, acceptation
   plus longue).

Chaque écran fait l'objet de sa propre PR. Chaque PR est livrée derrière
un feature flag si disponible ; le rollback se fait en basculant le flag.

---

## Pièges courants lors de la migration

1. **`data-nac-plugin` oublié sur la racine.** Le manifeste est enregistré
   mais le LLM ne voit rien. **Symptôme :** le chat répond de manière
   générique « Comment puis-je vous aider ? » sans proposer d'actions.
   Correction : ajouter l'attribut. (Bug #1 des études de cas.)
2. **Fermeture stale de l'état React dans onChatAction.** Utiliser des
   refs + des setters fonctionnels. (Bug #2 des études de cas.)
3. **ID d'onglet avec un rôle non-tab.** Finding du validateur strict v2.2.
   `^tab\.` DOIT avoir le rôle `tab`.
4. **Réutilisation d'IDs après un refactoring.** Un bouton déplacé vers
   un nouveau rôle sémantique DOIT recevoir un nouvel ID. La réutilisation
   casse l'automatisation en aval.
5. **La bibliothèque de composants absorbe les `data-*`.** Détecter tôt ;
   écrire un wrapper (étape 5).
6. **Le gestionnaire de clic n'émet pas d'acquittement.** Utiliser
   `bindAction`. Sans lui, `NAC.click()` expire après 5 s même si
   l'effet de bord a fonctionné.

---

## Voir aussi

- [AI_PLAYBOOK_NEW_PROJECT.md](AI_PLAYBOOK_NEW_PROJECT.md) -- pour les
  projets greenfield.
- [REACT.md](REACT.md) / [ANGULAR.md](ANGULAR.md) -- approfondissements
  par framework.
- [NAC_TEST_MANUAL.md](../docs/NAC_TEST_MANUAL.md) -- playbook de tests
  post-migration.
- [CASE_STUDIES_DISCOVERY.md](../docs/CASE_STUDIES_DISCOVERY.md)
  -- bugs découverts lors de la migration de référence Yujin.

## Licence

Apache-2.0.

---

*This is a machine translation of the canonical English
version at `/nac-spec/guides/AI_PLAYBOOK_MIGRATION.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
