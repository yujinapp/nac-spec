---
translation_source: guides/AI_PLAYBOOK_NEW_PROJECT.md
translation_source_hash: 6586a966938a6d84086a8b79805cde15886536b6718b79526ff7d16d202686fe
translation_quality: machine_v1
translation_lang: fr
translation_date: 2026-05-11T13:43:20.960901+00:00
---

# Guide IA -- Démarrer un nouveau projet NAC-3

**Version NAC3 :** 2.2 stable + aperçu interop v2.3.
**Audience :** Tout agent IA (Claude, GPT, Gemini, LLM local) chargé
d'initialiser un projet conforme NAC-3 de zéro.
**Format :** Procédure pas à pas. Chaque étape comporte QUOI, COMMENT, VÉRIFIER.
Aucune ambiguïté.

Lorsqu'un humain dit **« démarrons un nouveau projet NAC-3 »** ou
quelque chose de similaire, un agent IA lisant ce fichier DOIT exécuter les étapes
ci-dessous dans l'ordre, en validant chaque point de contrôle avant de passer à la suite.

---

## Étape 0 -- Confirmer le périmètre avec l'humain

Poser exactement ces questions avant d'écrire le moindre code :

1. **Framework** : React, Angular, Vue, Svelte, vanilla, ou
   rendu côté serveur (PHP/Rails/Django) ?
2. **Langues** : Quelles locales parmi les 10 locales NAC3 l'application
   doit-elle prendre en charge au lancement ? (es, en, pt, fr, it, de, ja, zh, hi, ar)
3. **Backend de chat** : L'application exposera-t-elle son propre
   intermédiaire LLM (fournir un endpoint) ou utilisera-t-elle un chat Yujin hébergé ?
4. **Provenance** : Multi-tenant ? Si oui, prévoir la signature HMAC du manifeste.
5. **Voix** : Push-to-talk uniquement, mains libres, ou les deux ?
6. **Interop (aperçu v2.3)** : Cette application sera-t-elle importable par
   d'autres hôtes NAC3 (Yujin Pilot, applications tierces) ? Oui -> exposer
   les outils serveur MCP.

Conserver chaque réponse. Elles conditionnent toutes les décisions suivantes.

---

## Étape 1 -- Initialiser le projet

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

### Vanilla (HTML + JS + PHP, sans framework)

Créer :
- `index.html` avec `<body data-nac-plugin="app">`.
- `js/app.js` avec les imports.

### Rendu côté serveur

Intégrer `@nac3/runtime` via CDN :

```html
<script src="https://yujin.app/nac-spec/js/nac.js?v=v22"></script>
<script src="https://yujin.app/nac-spec/js/nac-v2-extensions.js?v=v22"></script>
```

**Vérifier :** `npm run build` (ou l'équivalent du framework) se termine
sans erreur. Ouvrir dans le navigateur ; `window.NAC` est défini.

---

## Étape 2 -- Décorer le shell

Ajouter à votre **conteneur racine** dans le template :

```html
<div data-nac-plugin="<your-app-slug>" class="app">
  ...
</div>
```

Ajouter à **chaque widget cliquable** (boutons, liens utilisés comme boutons) :

```html
<button
  data-nac-id="<slug>.<verb>"
  data-nac-role="action"
  data-nac-action="<verb>"
  onclick="...">
  ...
</button>
```

Ajouter à **chaque champ de formulaire** (input, textarea, select) :

```html
<input
  data-nac-id="<slug>.<field-name>"
  data-nac-role="field"
  ... />
```

Ajouter à **chaque bouton d'onglet** (la spécification est stricte : un id `^tab\.` DOIT
avoir le rôle `tab`) :

```html
<button
  data-nac-id="tab.<key>"
  data-nac-role="tab"
  onclick="...">
  ...
</button>
```

**Vérifier :** `npx @nac3/runtime validate ./src` ne signale aucun résultat de
sévérité erreur. `NAC.describe()` depuis la console du navigateur
retourne un arbre avec les correspondances `data-nac-plugin`.

---

## Étape 3 -- Écrire le manifeste

Créer `src/nac/manifest.ts` (ou équivalent) :

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
    // ... tous les autres éléments ...
  ]
};
```

**Règles critiques :**
- Chaque `label_i18n` DOIT couvrir les 10 locales prises en charge. Un
  remplissage partiel constitue un résultat du validateur strict v2.2.
- Chaque `id` correspondant à `^tab\.` DOIT avoir `role: 'tab'`.
- Chaque `id` DOIT être préfixé par le namespace du plugin (ex. `invoice.save`,
  et non `save`).
- Les IDs DOIVENT rester stables à travers les refontes de l'interface.

**Vérifier :** `NAC.validate_global({probe: false})` retourne 0
résultat de sévérité erreur.

---

## Étape 4 -- Enregistrer le manifeste au démarrage

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

Injecter `NacBoot` dans votre `AppComponent`.

### Vanilla

```html
<script type="module">
import { APP_MANIFEST } from './nac/manifest.js';
window.NAC.register(APP_MANIFEST);
</script>
```

**Vérifier :** `NAC.list_registered_plugins()` retourne
`['<your-app-slug>']`.

---

## Étape 5 -- Émettre le contrat d'accusé de réception depuis chaque gestionnaire de clic

Pour chaque bouton décoré avec `data-nac-role="action"`, votre
gestionnaire de clic DOIT émettre `nac:action:succeeded` après son
effet de bord synchrone.

### Modèle A -- via `NAC.bindAction` (helper v2.2, recommandé)

```ts
const btn = document.querySelector('[data-nac-id="<slug>.save"]');
NAC.bindAction(btn, function (ev) {
  saveInvoice();          // votre effet de bord
}, { plugin: '<slug>', action_id: '<slug>.save' });
```

`bindAction` gère automatiquement les cas synchrones, asynchrones (Promise) et les exceptions.

### Modèle B -- émission manuelle

```ts
button.addEventListener('click', function () {
  saveInvoice();
  document.dispatchEvent(new CustomEvent('nac:action:succeeded', {
    detail: { plugin: '<slug>', action_id: '<slug>.save' }
  }));
});
```

Pour les autres rôles, émettre la famille d'événements canonique :
- `role="field"` -> `nac:field:changed` (detail : `{plugin, field_id, value}`)
- `role="tab"` -> `nac:tab:activated` (detail : `{plugin, tab_id}`)
- Voir la section 6 de SPEC.md pour le tableau complet.

**Vérifier :** Depuis la console du navigateur :
```js
document.addEventListener('nac:action:succeeded', e => console.log(e.detail));
await NAC.click('<slug>.save');
// Doit afficher {plugin: '<slug>', action_id: '<slug>.save', ...}
```

---

## Étape 6 -- Connecter le panneau de chat

Intégrer le client de chat de référence OU utiliser Yujin Pilot (externe).

### Option A -- intégrer `nac-chat-client.js`

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

Vous fournissez l'`endpoint` -- le backend intermédiaire LLM qui
reçoit `{prompt, lang, history, nac_tree}` et retourne
`{message, actions[]}`. Voir `LLM_WIRING.md`.

### Option B -- déléguer à Yujin Pilot

Ne pas intégrer de chat du tout. Indiquer aux utilisateurs « installez Yujin Pilot
(yujin.app/pilot) pour la voix et le chat sur cette application ». Le scanner MCP
de Pilot découvre votre application et la pilote depuis son cockpit central.

---

## Étape 7 -- Exécuter le corpus de tests

Copier l'infrastructure de tests de référence Yujin comme point de départ :

```bash
# Depuis la racine de votre projet
cp -r /path/to/rpaforce-crm/packages/nac/test ./test
cp -r /path/to/rpaforce-crm/tools/nac/test-launch.sh ./tools/test-launch.sh
```

Modifier `test/stage*.mjs` pour référencer votre manifeste et votre slug de plugin
à la place de ceux de la démo. Le squelette reste identique.

Lancer :

```bash
bash ./tools/test-launch.sh
```

**Vérifier :** Toutes les couches côté Node sont au VERT. Durée totale < 15s.

---

## Étape 8 -- Ajouter les tests e2e Playwright

```bash
mkdir -p tests/e2e-nac
cd tests/e2e-nac
npm init -y
npm install --save-dev @playwright/test
npx playwright install chromium
```

Copier `tests/e2e-nac/specs/01-landing.spec.ts` depuis la référence Yujin
comme template ; l'adapter à l'URL et au slug de plugin de votre application.

Pour le **test de pipeline complet** (chat -> LLM -> dispatch -> DOM ->
ack), voir `08-pipeline-end-to-end.spec.ts` de Yujin. Trois tests
exercent l'intégralité du flux contre votre backend en production.

---

## Étape 9 -- Liste de contrôle avant mise en production

Avant le déploiement :

- [ ] `NAC.STRICT_VALIDATION = true` -- applique la validation de rôle
      à l'enregistrement (lève une exception en cas de dérive).
- [ ] `npx @nac3/runtime validate ./src` -- zéro résultat de sévérité erreur.
- [ ] `npm test` (votre harnais) -- 100 % de réussite.
- [ ] `npx playwright test` -- tous les tests e2e au vert.
- [ ] Multi-tenant : signer les manifestes avec HMAC côté serveur ; appeler
      `NAC.set_provenance_secret()` depuis du code authentifié.
- [ ] Verbes protégés par is_trusted : lister explicitement en liste blanche tout verbe
      que les bots RPA / clics synthétiques sont autorisés à déclencher
      (voir SECURITY.md).
- [ ] i18n : chaque `label_i18n` couvre les 10 locales (ou utiliser
      `i18n_strict: 'permissive'` pendant la migration).

---

## Étape 10 -- Obtenir la conformité NAC-3

Exécuter `NAC.validate_global({probe: true})`. Le runtime synthétise
des clics sur chaque élément `role="action"` pour vérifier que chacun
émet son accusé de réception dans les 5 secondes.

**Vérifier :** zéro résultat. Votre application est conforme NAC-3.

---

## Erreurs courantes des agents IA (et comment les éviter)

1. **Enregistrer le manifeste sans `data-nac-plugin` dans le DOM.**
   Le `NAC.describe()` du runtime parcourt le DOM, pas le registre.
   Sans l'attribut, le snapshot de l'intermédiaire LLM est vide pour
   ce plugin. Toujours associer les deux.
2. **Fermetures sur l'état React/Vue dans les gestionnaires de chat.**
   Utiliser des refs ou des setters fonctionnels. Voir le bug #2 dans CASE_STUDIES_DISCOVERY.md.
3. **i18n partielle.** Le validateur strict v2.2 échoue sur les maps
   `label_i18n` incomplètes. Si vous devez livrer en partiel, utiliser
   `i18n_strict: 'permissive'` et créer un ticket TODO ; ce n'est pas
   un raccourci permanent.
4. **Réutiliser des IDs après refactorisation.** Un bouton renommé avec un nouveau
   rôle sémantique DOIT recevoir un nouvel id. La réutilisation casse tous
   les scripts d'agents en aval.
5. **Oublier l'événement d'accusé de réception.** Un gestionnaire qui effectue son travail
   de façon synchrone mais n'émet pas `nac:action:succeeded` fera expirer NAC.click().
   Utiliser `bindAction` pour intégrer le contrat dès le départ.

---

## Voir aussi

- [SPEC.md](../SPEC.md) -- contrat canonique.
- [AI_PLAYBOOK_MIGRATION.md](AI_PLAYBOOK_MIGRATION.md) -- pour
  les projets existants (brownfield).
- [NAC_TEST_MANUAL.md](../docs/NAC_TEST_MANUAL.md) -- guide de test
  pour toute application NAC-3.
- [REACT.md](REACT.md) / [ANGULAR.md](ANGULAR.md) -- approfondissement par framework.

## Licence

Apache-2.0.

---

*This is a machine translation of the canonical English
version at `/nac-spec/guides/AI_PLAYBOOK_NEW_PROJECT.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
