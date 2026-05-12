---
translation_source: docs/HUMAN_OK_CHECKLIST.md
translation_source_hash: 2b87f1b0665762daf6be1ad520c7ba16f977d21771e6574ae60451039baada31
translation_quality: machine_v1
translation_lang: fr
translation_date: 2026-05-11T14:11:39.693609+00:00
---

# NAC3 -- Checklist de validation humaine

**Version de la spec :** 2.2 + aperçu v2.3.
**Dernière exécution :** 2026-05-11 (à mettre à jour à chaque release).
**Objectif :** forme exécutable de la colonne MAN dans
[TEST_COVERAGE_MATRIX.md](TEST_COVERAGE_MATRIX.md). Un humain
parcourt chaque élément ci-dessous et coche la case. Si un élément
échoue, la release NE PART PAS -- ouvrir un bug et corriger avant
de recommencer.

Ce document NE remplace PAS les tests automatisés. La suite auto
(`bash tools/nac/test-launch.sh`) DOIT être au vert avant de
commencer cette checklist. La checklist existe pour tout ce que
l'automatisation ne peut pas voir : audio réel, ressenti
cross-browser, formulations en langue naturelle, handshake
cross-origin avec un pair en production, finitions visuelles.

---

## Comment utiliser ce document

1. Ouvrir une fenêtre de navigation privée (Chrome + Firefox +
   Safari, dans cet ordre ; répéter les sections visuelles pour
   chaque navigateur).
2. Parcourir les sections dans l'ordre -- certaines dépendent
   d'une section précédente active (ex. : l'interop nécessite que
   les deux démos soient chargées).
3. Cocher chaque `[ ]` uniquement après confirmation personnelle.
   Ne pas déléguer. En cas de doute, marquer `[?]` et consulter
   le responsable de la spec.
4. À la fin, signer et dater le bloc SIGN-OFF.
5. Committer le fichier avec le nouveau tampon de date d'exécution.

Durée estimée par passage : **45-60 minutes**. Ne pas se précipiter ;
tout l'intérêt de cette porte de validation réside dans ce que
l'automatisation rate.

---

## 1. Artefacts runtime

### 1.1 Smoke test cross-browser -- `js/nac.js` + `nac-v2-extensions.js`

Pour chaque navigateur (Chrome, Firefox, Safari) :

- [ ] Ouvrir `https://yujin.app/nac-spec/example.php` en
      navigation privée.
- [ ] La console ne contient aucune erreur après 5 secondes.
- [ ] `NAC.describe().plugins[0]` retourne un objet dans la
      console.
- [ ] `NAC.list_registered_plugins()` retourne au moins un
      slug.
- [ ] Cliquer sur un bouton décoré avec `data-nac-role="action"`
      -- il fonctionne ET un événement `nac:action:succeeded` se
      déclenche (écouter via `document.addEventListener` dans la
      console).

### 1.2 Client de chat en direct -- `nac-chat-client.js`

- [ ] Sur `example-v21-data-table.php`, appuyer sur le bouton
      micro.
- [ ] Dire « ve a permisos » -- le chat déclenche un changement
      d'onglet, pas une réponse en texte libre.
- [ ] Répéter en anglais (« go to permissions ») + en portugais
      (« vai para permissoes ») -- dispatch correct.
- [ ] Dire « cambia de pestaña » -- la locale NE bascule PAS vers
      l'allemand (garde de régression pour V22-03).

### 1.3 Runtime d'interop -- `nac-mcp-interop.js`

- [ ] Ouvrir `example-v22-interop.php`.
- [ ] Utiliser les 4 CTA dans l'ordre : Export tree -> Import
      remote -> List remote apps -> Disconnect remote.
- [ ] Chaque CTA journalise un succès dans son panneau de sortie.
- [ ] Après Disconnect, l'application distante n'apparaît plus
      dans `NAC.list_remote_apps()`.

---

## 2. Package NPM

### 2.1 Smoke test d'installation fraîche

- [ ] Dans un répertoire de travail vierge :
      ```
      mkdir /tmp/nac-smoke && cd /tmp/nac-smoke
      npm init -y
      npm install @nac3/runtime
      node -e "import('@nac3/runtime').then(m => console.log(Object.keys(m)))"
      ```
- [ ] La sortie inclut `NAC`, `registerPlugin`, les validateurs.
- [ ] Aucun avertissement de dépréciation lors de l'installation.

### 2.2 Validateur CLI sur un projet externe

- [ ] Choisir un projet non-Yujin (une démo d'adoption ou
      n'importe quel dossier).
- [ ] Exécuter `npx @nac3/runtime validate .` depuis sa racine.
- [ ] La sortie est lisible par un humain, liste 0 BLOCKERS, et
      quitte avec le code 0 si propre / non-zéro en cas de
      findings.

---

## 3. Démos

### 3.1 Page d'accueil -- `index.html`

- [ ] La page s'affiche avec le branding sumi-e, sans FOUC.
- [ ] Cliquer sur « Autopilot » -- la visite guidée de 5 secondes
      se lance, narration audible (TTS, pas silencieux).
- [ ] Ouvrir le chat -- taper « que es NAC3? » -- obtenir une
      réponse cohérente, pas une erreur.

### 3.2 Démo de référence -- `example.php`

- [ ] Parcourir chacun des 27 widgets visibles sur la page.
- [ ] Zéro erreur console après le parcours complet.
- [ ] Zéro widget non réactif (aucun clic sans effet).

### 3.3 Démo brownfield -- `example-v20-full.php`

- [ ] Le `v20-panel` est visible en haut à droite après le
      chargement de la page.
- [ ] Cliquer sur « describe_v2 » -- le panneau affiche une
      sortie JSON valide.
- [ ] Cliquer sur « validate_global_v2 » -- le panneau affiche
      des findings (ou « 0 findings, OK »).
- [ ] Cliquer sur chacun des 6 boutons du v20-panel -- tous
      émettent `nac:action:succeeded` (visible dans la console
      si un listener est attaché).
- [ ] Bouton istrusted_fake -- l'ack NE se déclenche PAS (le
      runtime rejette correctement les clics synthétiques pour
      les verbes conditionnés à isTrusted).
- [ ] Bouton istrusted_real (vrai clic humain) -- l'ack SE
      déclenche.

### 3.4 Vitrine des primitives -- `example-v20-primitives-showcase.php`

- [ ] Chacune des 8 primitives affiche une section avec un
      exemple fonctionnel.
- [ ] Le texte didactique de chaque section est correct
      (aucun placeholder illisible).

### 3.5 Démo data-table -- `example-v21-data-table.php`

- [ ] Appuyer sur le micro, dire « agrega una linea con concepto
      leche cantidad 2 precio 100 » -- une ligne apparaît dans
      le tableau de collection.
- [ ] Dire « cuanto total hay? » -- le chat répond avec un
      nombre, pas le tableau brut.
- [ ] Dire « ve a permisos » -- l'onglet change.

### 3.6 Démo interop -- `example-v22-interop.php`

- [ ] Déjà couvert au point 1.3 ci-dessus.
- [ ] Bonus : ouvrir la page dans deux onglets du navigateur,
      répéter le handshake -- cela doit fonctionner entre les
      onglets (chaque onglet est sa propre instance NAC,
      la couche interop fait office de pont).

### 3.7 Étude de cas React -- `demos/react/`

- [ ] Ouvrir `https://yujin.app/nac-spec/demos/react/`.
- [ ] Taper « leche » dans le champ texte, cliquer sur « Add »
      -- la tâche apparaît.
- [ ] Ouvrir le chat, dire (via micro) « agrega pan » -- la
      tâche « pan » apparaît via le chemin piloté par le chat.
      Il s'agit de la garde de régression pour le bug #2 de
      l'étude de cas.
- [ ] Dire « borra leche » -- la tâche « leche » disparaît.

### 3.8 Étude de cas Angular -- `demos/angular/`

- [ ] Mêmes 4 vérifications que pour React, sur
      `/nac-spec/demos/angular/`.

---

## 4. Documentation

Pour chacun des documents ci-dessous, lire de bout en bout au moins
une fois par release trimestrielle. Vérifier :

- Le tampon de version est à jour (v2.2).
- Aucun lien interne cassé.
- Aucun TODO en suspens.
- Les extraits de code compilent / s'exécutent tels qu'indiqués.

- [ ] `SPEC.md` (contrat canonique).
- [ ] `ABOUT.md`.
- [ ] `CONTRIBUTING.md`.
- [ ] `SECURITY.md` -- plus relecture trimestrielle du modèle de
      menaces.
- [ ] `README_DEMOS.md`.
- [ ] `docs/NAC_V22_ROADMAP.md`.
- [ ] `docs/NAC_TEST_MANUAL.md`.
- [ ] `docs/NAC_INTEROP_MCP.md`.
- [ ] `docs/NAC_LAUNCH_DIFFUSION.md`.
- [ ] `docs/CASE_STUDIES_DISCOVERY.md`.
- [ ] `docs/TEST_COVERAGE_MATRIX.md` (cette matrice est le
      document associé).
- [ ] `docs/VOICE_CHAT_ERROR_ANALYSIS_2026_05_09.md`.

## 5. Guides d'adoption

Pour chaque guide, vérifier que le snippet hello-world compile toujours et que les étapes permettent à un nouveau lecteur d'aboutir à une installation fonctionnelle :

- [ ] `guides/REACT.md` -- le snippet compile sur Vite + React 18.
- [ ] `guides/ANGULAR.md` -- le snippet compile sur Angular 17 standalone.
- [ ] `guides/LLM_WIRING.md` -- le backend de référence Node démarre et l'exemple de test de contrat passe.
- [ ] `guides/AI_PLAYBOOK_NEW_PROJECT.md` -- les assertions des étapes correspondent toujours à l'API runtime.
- [ ] `guides/AI_PLAYBOOK_MIGRATION.md` -- idem.
- [ ] `guides/IMPACT_TESTING.md` -- chiffres à relire pour actualité (à revérifier chaque trimestre).
- [ ] `guides/IMPACT_RPA.md` -- idem.
- [ ] `guides/RPA_UIPATH.md` -- exécuter l'exemple `InvoiceFromCSV.xaml` une fois (ou son équivalent dans la dernière version d'UiPath Studio).
- [ ] `guides/RPA_AUTOMATION_ANYWHERE.md` -- workflow d'exemple équivalent.
- [ ] `guides/RPA_BLUE_PRISM.md` -- étude d'objet exemple équivalente.

---

## 6. Suites de tests

- [ ] Exécuter `bash tools/nac/test-launch.sh` -- TOUT AU VERT en moins de 15 s.
- [ ] Vérifier le compteur de smoke (`36 PASS`) -- correspond au total attendu.
- [ ] Ouvrir `packages/nac/test/fixtures/voice/` -- sélectionner 1 fichier par locale (10 fichiers au total) -- lire dans un lecteur audio -- audible et intelligible.
- [ ] Vérifier ponctuellement 2 prompts LLM aléatoires issus de `stage3-backend.mjs` -- les réponses sont cohérentes, pas de dérive.
- [ ] Exécuter la suite Playwright avec `--headed` une fois (`npx playwright test --headed`) -- observer visuellement l'interface de chaque spec pendant l'exécution.
- [ ] Exécuter `bash tools/nac/discovery-loop.sh 1` -- un tour se termine avec 0 finding.

---

## 7. Packages d'études de cas

- [ ] `packages/nac-react-demo/` se compile sans erreur (`npm run build`).
- [ ] Le dist React déployé se comporte de manière identique au build local.
- [ ] `packages/nac-angular-demo/` se compile sans erreur.
- [ ] Le dist Angular déployé se comporte de manière identique.

---

## 8. Points transversaux

### 8.1 i18n

- [ ] Choisir une locale (à faire tourner à chaque release) -- envoyer à un locuteur natif pour vérification ponctuelle de 10 chaînes aléatoires.
- [ ] Le validateur confirme 0 clé manquante sur l'ensemble des 10 locales (`NAC.validate_global({locale: 'all'})`).

### 8.2 HMAC + provenance

- [ ] Exécuter le smoke multi-tenant contre le tenant de staging -- la signature du manifeste est vérifiée, aucune erreur `provenance_mismatch` dans les logs.

### 8.3 Contrôle isTrusted

- [ ] Sur `example-v20-full.php`, le test côte à côte istrusted_real vs istrusted_fake (couvert en 3.3 ci-dessus) PASSE la comparaison visuelle : le réel déclenche l'ack, le faux non.

### 8.4 Interopérabilité cross-origin (aperçu v2.3)

- [ ] Au moins UN test cross-origin avant de déclarer v2.3 GA : ouvrir la démo d'interopérabilité contre un pair NAC3 distant hébergé sur une origine différente, bearer token réel, preflight CORS réel. L'aller-retour réussit.

### 8.5 Déploiement

- [ ] Après le push de release, effectuer un curl sur ces URLs et confirmer 200 + contenu correct :
      - `https://yujin.app/nac-spec/index.html`
      - `https://yujin.app/nac-spec/SPEC.md`
      - `https://yujin.app/nac-spec/js/nac.js`
      - `https://yujin.app/nac-spec/js/nac-chat-client.js`
      - `https://yujin.app/nac-spec/example.php`
      - `https://yujin.app/nac-spec/example-v21-data-table.php`
      - `https://yujin.app/nac-spec/example-v22-interop.php`
      - `https://yujin.app/nac-spec/demos/react/`
      - `https://yujin.app/nac-spec/demos/angular/`

### 8.6 Audio réel

- [ ] Matériel réel (micro + haut-parleur d'ordinateur portable) -- appuyer sur le micro dans `example-v21-data-table.php` en production, prononcer un prompt par locale (10 prompts au total) -- le dispatch LLM est cohérent dans chaque locale.

---

## 9. Passage avec lecteur d'écran (accessibilité -- Track G7)

Cette section parcourt les démos avec un lecteur d'écran activé et le moniteur éteint (ou les yeux littéralement fermés). Elle constitue le critère de validation de l'engagement d'accessibilité décrit dans [ACCESSIBILITY.md](ACCESSIBILITY.md).

Effectuer cette section sur au moins DEUX lecteurs d'écran par release (NVDA est le plus simple à prendre en main sur Windows ; VoiceOver est préinstallé sur macOS ; JAWS si vous disposez d'une licence).

### 9.1 NVDA (Windows)

- [ ] Installer NVDA (gratuit, nvaccess.org). Lancer avec Ctrl+Alt+N.
- [ ] Ouvrir `https://yujin.app/nac-spec/index.html` avec le moniteur éteint (ou les yeux fermés).
- [ ] NVDA annonce le titre de la page + un plan structuré des titres (h1, h2, h3) lors de la navigation avec la touche H.
- [ ] La touche Tab atteint chaque contrôle interactif dans un ordre logique ; chaque contrôle annonce clairement son rôle et son libellé.
- [ ] Ouvrir le panneau de chat (NVDA lit que le champ de saisie du chat a role=textbox avec un libellé clair).
- [ ] Saisir « que es NAC3 ? » + envoyer -- NVDA lit la réponse en entier à son arrivée.

### 9.2 NVDA sur `example-v21-data-table.php`

- [ ] NVDA annonce « Onglet Lignes (collection) » + l'onglet Permissions lors de la navigation par Tab.
- [ ] L'activation d'un onglet annonce le nouvel état via l'ack de l'événement `nac:tab:activated`.
- [ ] Lorsque le LLM ajoute une ligne, NVDA lit le contenu de la nouvelle ligne sans action supplémentaire (ou avec une simple flèche Bas).

### 9.3 VoiceOver (macOS)

- [ ] Cmd+F5 pour démarrer VoiceOver.
- [ ] Ouvrir `https://yujin.app/nac-spec/index.html`.
- [ ] VO+U ouvre le rotor ; vérifier que les titres, liens et contrôles de formulaire sont bien renseignés.
- [ ] VO+A lit la page entière de haut en bas -- le résultat est sémantiquement cohérent, pas « div div div lien lien bouton ».

### 9.4 VoiceOver sur les études de cas React + Angular

- [ ] Sur `demos/react/` : ajouter une tâche via le champ de saisie en utilisant uniquement le clavier + VoiceOver. La nouvelle tâche est annoncée lors de l'ajout (l'événement ack est câblé).
- [ ] Sur `demos/angular/` : même test, même attente.

### 9.5 Navigation au clavier uniquement (sans lecteur d'écran, sans souris)

- [ ] Déconnecter/désactiver la souris.
- [ ] Parcourir la page d'accueil avec la touche Tab uniquement. Chaque arrêt de focus est visible (indicateur de focus présent).
- [ ] Ouvrir le panneau de chat au clavier, saisir un prompt, envoyer. Le résultat est narré / affiché correctement.
- [ ] Échap ferme toute modale ouverte.
- [ ] Aucun piège clavier (Tab finit par revenir en haut de page).

### 9.6 Contraste élevé + zoom à 200 %

- [ ] Zoom navigateur à 200 % sur la page d'accueil. La mise en page ne se casse PAS, pas de défilement horizontal, pas de chevauchement de texte.
- [ ] Mode contraste élevé Windows (ou Augmenter le contraste sur macOS). Les boutons, liens et indicateurs de focus restent visibles.

### 9.7 Commande vocale (le cas récursif)

- [ ] Sur un navigateur équipé de Pilot (ou en utilisant le bouton micro de `nac-chat-client.js` de référence), contrôler les démos par la voix uniquement.
- [ ] Le bouton micro annonce son état à NVDA/VoiceOver (« enregistrement démarré », « enregistrement arrêté »).
- [ ] Les commandes vocales dispatchées via NAC3 prennent effet ; l'ack est annoncé au lecteur d'écran.

### 9.8 Problèmes d'accessibilité identifiés

Lister ici tout problème trouvé dans cette section, avec sa sévérité :

```
-
-
-
```

Si un problème de sévérité BLOQUANTE est ouvert, la release NE PART PAS tant qu'il n'est pas résolu.

---

## VALIDATION FINALE

```
Tag de release :     v____._.___
Parcouru par :       ______________________
Parcouru le :        ____-____-____
Navigateurs utilisés : [ ] Chrome  [ ] Firefox  [ ] Safari
Locuteurs natifs consultés (locale -> nom) :
   ____________________________________________
Total des éléments parcourus :  ___ / ___
Éléments en échec (liste avec liens de bugs) :
   ____________________________________________
   ____________________________________________
Signature :          ______________________
```

Committer ce fichier avec le bloc VALIDATION FINALE renseigné pour marquer la release comme « validée humainement ».

---

## Voir aussi

- [TEST_COVERAGE_MATRIX.md](TEST_COVERAGE_MATRIX.md) -- la matrice dont cette checklist est dérivée.
- [NAC_TEST_MANUAL.md](NAC_TEST_MANUAL.md) -- le playbook de référence pour les adoptants.
- [COVERAGE_REPORT_2026_05_10.md](COVERAGE_REPORT_2026_05_10.md) -- le rapport de couverture automatique pour la release en cours.

## Licence

Apache-2.0.

---

*This is a machine translation of the canonical English
version at `/nac-spec/docs/HUMAN_OK_CHECKLIST.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
