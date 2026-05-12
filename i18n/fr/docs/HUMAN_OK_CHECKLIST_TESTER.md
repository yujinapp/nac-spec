---
translation_source: docs/HUMAN_OK_CHECKLIST_TESTER.md
translation_source_hash: afd5ee5c709c7453a6d7017cf1114562eda10b3a6adfad54f3403d0f405b564a
translation_quality: machine_v1
translation_lang: fr
translation_date: 2026-05-11T13:21:38.462325+00:00
---

# NAC3 v2.2 -- Liste de vérification du testeur (English)

**Pour :** le testeur humain qui effectue la validation de la version.
**Durée :** ~60-90 minutes pour un passage complet.
**Dernière mise à jour :** 2026-05-11.

## Instructions pour le testeur

Pour chaque tâche ci-dessous :

1. Lire les étapes a, b, c, d dans l'ordre.
2. Effectuer exactement ce que dit l'étape a, puis b, puis c.
3. Comparer ce que vous voyez/entendez avec le « Résultat attendu » de l'étape d.
4. Si le résultat correspond exactement : cocher `[X]` dans la case **OK**.
5. Si le résultat ne correspond PAS : cocher `[X]` dans la case **ERREUR** ET noter ce qui s'est réellement passé dans la ligne « Commentaires ».

Ne pas sauter de tâches. En cas d'échec d'une tâche, passer à la suivante (ne pas s'arrêter). Les tâches en échec sont corrigées après le passage complet.

Une fois terminé, signer en bas et renvoyer le fichier.

---

## Section 1 -- Vérification de base de la page d'accueil (Chrome)

### Tâche 1

a) Ouvrir Chrome en mode navigation privée (Ctrl+Shift+N).
b) Saisir dans la barre d'adresse : `https://yujin.app/nac-spec/` et appuyer sur Entrée.
c) Attendre 5 secondes sans cliquer sur quoi que ce soit.
d) **Résultat attendu :** La page se charge. En haut de la page apparaissent une icône sumi-e (pinceau japonais) et le titre « NAC -- Native Agent Contract ». Aucun message d'erreur rouge n'apparaît à l'écran. La page n'est pas vide.

- [ ] OK
- [ ] ERREUR
Commentaires : _______________________________

### Tâche 2

a) Appuyer sur la touche F12 pour ouvrir les outils de développement du navigateur.
b) Cliquer sur l'onglet « Console » dans les outils de développement.
c) Attendre 3 secondes.
d) **Résultat attendu :** La zone Console ne contient aucune ligne d'erreur rouge. (Les avertissements jaunes sont acceptables ; seules les lignes rouges indiquent un échec.)

- [ ] OK
- [ ] ERREUR
Commentaires : _______________________________

### Tâche 3

a) Fermer les outils de développement (F12 à nouveau).
b) Faire défiler la page vers le bas jusqu'à voir une section intitulée « Made with NAC3 ».
c) Observer les cartes dans cette section.
d) **Résultat attendu :** Vous voyez au moins 4 cartes en grille : « Yujin CRM », « Reference demos », « Cal.com (coming) » et « Your app ». Chaque carte comporte un symbole de caractère japonais en haut, un titre, une courte description et un lien avec une flèche `->`.

- [ ] OK
- [ ] ERREUR
Commentaires : _______________________________

### Tâche 4

a) Faire défiler vers le bas jusqu'à voir une section intitulée « Coming Q3 2026: Yujin Forge + Pilot ».
b) Repérer le champ e-mail indiquant « you@example.com ».
c) Y saisir votre véritable adresse e-mail.
d) **Résultat attendu :** Les deux cases à cocher « Forge ($19) » et « Pilot ($5) » sont toutes deux cochées par défaut. Un bouton bleu intitulé « Notify me » est présent.

- [ ] OK
- [ ] ERREUR
Commentaires : _______________________________

### Tâche 5

a) Cliquer sur le bouton « Notify me ».
b) Attendre 5 secondes.
c) Lire le message qui apparaît à côté du bouton.
d) **Résultat attendu :** Un message apparaît indiquant soit « Got it. You will hear from us when Forge + Pilot launch. » soit « Submission failed -- email hello@yujin.app instead. » L'un ou l'autre message est acceptable ; les deux indiquent que le formulaire est bien connecté.

- [ ] OK
- [ ] ERREUR
Commentaires : _______________________________

---

## Section 2 -- Commande vocale sur la démo data-table

### Tâche 6

a) Dans le même navigateur, accéder à : `https://yujin.app/nac-spec/example-v21-data-table.php`
b) Attendre 5 secondes que la page se charge complètement.
c) Observer la page.
d) **Résultat attendu :** Vous voyez une démo de tableau de données avec au moins 3 onglets en haut : « Lines (collection) », « Permissions » et un autre. Un panneau de chat est présent sur le côté droit de l'écran.

- [ ] OK
- [ ] ERREUR
Commentaires : _______________________________

### Tâche 7

a) Repérer le bouton microphone en bas du panneau de chat (généralement une icône circulaire avec un symbole de microphone).
b) Cliquer dessus. Votre navigateur peut demander l'autorisation d'utiliser le microphone ; l'accorder.
c) Parler clairement dans le microphone de votre ordinateur : **« ve a permisos »** (espagnol pour « aller aux permissions »).
d) **Résultat attendu :** Dans les 3 à 5 secondes, l'onglet actif passe de « Lines (collection) » à « Permisos » ou « Permissions ». Le panneau de chat affiche vos mots transcrits.

- [ ] OK
- [ ] ERREUR
Commentaires : _______________________________

### Tâche 8

a) Cliquer à nouveau sur le bouton microphone.
b) Parler clairement : **« go to permissions »** (en anglais cette fois).
c) Attendre la réponse du système.
d) **Résultat attendu :** L'onglet « Permissions » reste actif ou se réactive. Le chat reflète la saisie en anglais.

- [ ] OK
- [ ] ERREUR
Commentaires : _______________________________

### Tâche 9

a) Cliquer à nouveau sur le bouton microphone.
b) Parler clairement : **« cambia de pestana »** (espagnol pour « changer d'onglet » -- le mot « de » est la préposition espagnole).
c) Attendre la réponse.
d) **Résultat attendu :** La langue du chat ne bascule PAS vers l'allemand. Le panneau de chat peut changer d'onglet OU poser une question de clarification, mais la langue reste en espagnol/anglais -- pas en allemand. (Il s'agit du garde-fou de régression pour un ancien bug.)

- [ ] OK
- [ ] ERREUR
Commentaires : _______________________________

---

## Section 3 -- Cas d'étude React

### Tâche 10

a) Accéder à : `https://yujin.app/nac-spec/demos/react/`
b) Attendre 5 secondes.
c) Observer la page.
d) **Résultat attendu :** Vous voyez une application « Todos » : un champ de saisie en haut, un bouton « Add » à côté, et une zone de liste vide en dessous. Un panneau de chat est présent sur le côté droit.

- [ ] OK
- [ ] ERREUR
Commentaires : _______________________________

### Tâche 11

a) Cliquer dans le champ de saisie.
b) Taper le mot **« milk »** (ou tout autre mot court).
c) Cliquer sur le bouton « Add ».
d) **Résultat attendu :** Un nouvel élément de tâche apparaît dans la liste, affichant « milk » avec une case à cocher à côté.

- [ ] OK
- [ ] ERREUR
Commentaires : _______________________________

### Tâche 12

a) Dans le panneau de chat, repérer le bouton microphone.
b) Cliquer dessus et dire : **« agrega pan »** (espagnol pour « ajouter du pain »).
c) Attendre 5 secondes.
d) **Résultat attendu :** Un nouvel élément apparaît dans la liste, affichant « pan » ou « bread ». La liste contient désormais au moins 2 éléments.

- [ ] OK
- [ ] ERREUR
Commentaires : _______________________________

### Tâche 13

a) Cliquer à nouveau sur le microphone.
b) Dire : **« borra leche »** (espagnol pour « supprimer le lait »).
c) Attendre 5 secondes.
d) **Résultat attendu :** L'élément « milk » disparaît de la liste. Seul « pan/bread » reste.

- [ ] OK
- [ ] ERREUR
Commentaires : _______________________________

## Section 4 -- Étude de cas Angular

### Tâche 14

a) Naviguer vers : `https://yujin.app/nac-spec/demos/angular/`
b) Attendre 5 secondes.
c) Observer la page.
d) **Résultat attendu :** Identique à la démo React (Tâche 10) : application « Todos » avec un champ de saisie, un bouton Ajouter, une liste vide et un panneau de chat.

- [ ] OK
- [ ] ERREUR
Commentaires : _______________________________

### Tâche 15

a) Répéter les tâches 11, 12, 13 sur cette démo Angular (ajouter « milk », puis ajouter « pan » par commande vocale, puis supprimer « milk » par commande vocale).
b) Observer le résultat des trois actions.
c) Comparer avec le comportement de la démo React.
d) **Résultat attendu :** Les trois actions fonctionnent exactement de la même façon que dans la démo React.

- [ ] OK
- [ ] ERREUR
Commentaires : _______________________________

---

## Section 5 -- Smoke test multi-navigateurs

### Tâche 16

a) Ouvrir Firefox (ou l'installer depuis mozilla.org si vous ne l'avez pas).
b) Naviguer vers `https://yujin.app/nac-spec/` dans Firefox.
c) Attendre 5 secondes.
d) **Résultat attendu :** Identique à la Tâche 1 : la page se charge, l'icône sumi-e est visible, aucune erreur.

- [ ] OK
- [ ] ERREUR
Commentaires : _______________________________

### Tâche 17

a) Dans Firefox, naviguer vers `https://yujin.app/nac-spec/example-v21-data-table.php`
b) Cliquer sur chacun des onglets visibles à tour de rôle (Lines, Permissions, et tout autre onglet présent).
c) Observer le changement de contenu du tableau.
d) **Résultat attendu :** Chaque clic sur un onglet modifie la zone de contenu en dessous. Aucune erreur n'apparaît. Aucun onglet ne reste « bloqué ».

- [ ] OK
- [ ] ERREUR
Commentaires : _______________________________

### Tâche 18

a) Ouvrir Safari (Mac uniquement) OU Edge (Windows).
b) Naviguer vers `https://yujin.app/nac-spec/`
c) Attendre 5 secondes.
d) **Résultat attendu :** Identique à la Tâche 1.

- [ ] OK
- [ ] ERREUR
Commentaires : _______________________________

---

## Section 6 -- Navigation au clavier uniquement (sans souris)

### Tâche 19

a) Ouvrir `https://yujin.app/nac-spec/` dans n'importe quel navigateur.
b) Mettre la souris de côté ; ne pas y toucher pendant cette tâche.
c) Appuyer sur la touche Tab de façon répétée (environ 15 fois).
d) **Résultat attendu :** Un indicateur de focus visible (anneau bleu ou coloré) se déplace entre les différents éléments de la page (liens, boutons). Le focus est toujours visible -- il ne disparaît jamais et ne reste pas « bloqué » dans une zone invisible.

- [ ] OK
- [ ] ERREUR
Commentaires : _______________________________

### Tâche 20

a) Continuer la navigation par Tab jusqu'à atteindre la zone du panneau de chat.
b) Appuyer sur Tab jusqu'à atteindre le champ de saisie du chat (un anneau de focus doit apparaître autour de lui).
c) Taper « hello » au clavier.
d) Appuyer sur Entrée.
d) **Résultat attendu :** Le chat envoie « hello » et affiche une réponse dans les 5 à 10 secondes. La souris n'a été utilisée à aucun moment.

- [ ] OK
- [ ] ERREUR
Commentaires : _______________________________

---

## Section 7 -- Lecteur d'écran (NVDA sur Windows, VoiceOver sur Mac)

Cette section est facultative si vous ne disposez pas de NVDA ou VoiceOver. Passer directement à la Section 8 si non disponible.

### Tâche 21 (Windows uniquement)

a) Installer NVDA depuis https://www.nvaccess.org/download/ (gratuit).
b) Démarrer NVDA (Ctrl+Alt+N).
c) Ouvrir `https://yujin.app/nac-spec/` avec le moniteur éteint (ou les yeux fermés).
d) **Résultat attendu :** NVDA lit le titre de la page et annonce une structure de plan -- vous pouvez naviguer en appuyant sur la touche H pour passer d'un titre à l'autre. Chaque titre est clairement intelligible à l'écoute.

- [ ] OK
- [ ] ERREUR
Commentaires : _______________________________

### Tâche 22 (Mac uniquement)

a) Appuyer sur Cmd+F5 pour démarrer VoiceOver. (Ou Réglages Système -> Accessibilité -> VoiceOver.)
b) Ouvrir `https://yujin.app/nac-spec/`
c) Appuyer sur VO+A (Ctrl+Alt+A) pour lire la page de haut en bas.
d) **Résultat attendu :** VoiceOver lit la page dans un ordre logique. La lecture est sémantiquement cohérente (par exemple : « titre de niveau 1, NAC », « lien, Ouvrir la démo vanilla », « bouton, Me notifier ») -- et non « div, div, div, lien, lien, bouton ».

- [ ] OK
- [ ] ERREUR
Commentaires : _______________________________

---

## Section 8 -- Chat multi-langue (10 langues)

### Tâche 23

a) Naviguer vers `https://yujin.app/nac-spec/example-v21-data-table.php`
b) Dans le panneau de chat, trouver le menu déroulant de langue (généralement un petit drapeau ou un indicateur « lang »). Le passer en portugais (pt).
c) Cliquer sur le bouton microphone et dire : **« vai para permissoes »** (portugais pour « aller aux permissions »).
d) **Résultat attendu :** L'onglet Permissions s'active. Le chat répond en portugais.

- [ ] OK
- [ ] ERREUR
Commentaires : _______________________________

### Tâche 24

a) Passer la langue du chat en français (fr).
b) Cliquer sur le microphone et dire : **« va aux permissions »**.
c) Attendre la réponse.
d) **Résultat attendu :** L'onglet Permissions s'active. Le chat répond en français.

- [ ] OK
- [ ] ERREUR
Commentaires : _______________________________

### Tâche 25 (facultative, à ignorer si vous ne parlez aucune de ces langues)

Répéter la tâche 23/24 pour l'une des langues suivantes : allemand (de), italien (it), japonais (ja), chinois (zh), hindi (hi), arabe (ar). Utiliser la formulation équivalente dans cette langue.

d) **Résultat attendu :** Chaque langue testée déclenche le changement d'onglet correct.

- [ ] OK
- [ ] ERREUR
- [ ] Ignorée (je ne parle aucune de ces langues)
Commentaires : langue(s) testée(s) + résultat _______________________________

---

## Section 9 -- Contraste élevé et zoom

### Tâche 26

a) Ouvrir `https://yujin.app/nac-spec/`
b) Appuyer sur Ctrl++ (Ctrl et la touche plus) jusqu'à atteindre un niveau de zoom de 200 %.
c) Faire défiler toute la page.
d) **Résultat attendu :** Tout le texte est lisible. Les boutons restent cliquables. Aucun texte n'est tronqué ni ne chevauche d'autres éléments. Aucune barre de défilement horizontale n'apparaît à aucun moment.

- [ ] OK
- [ ] ERREUR
Commentaires : _______________________________

### Tâche 27 (Windows uniquement)

a) Appuyer sur Alt gauche + Maj gauche + Impr. écran pour activer le mode Contraste élevé de Windows.
b) Basculer vers votre navigateur.
c) Observer la page.
d) **Résultat attendu :** La page fonctionne toujours. Le texte est visible (blanc sur fond noir ou contraste similaire). Les boutons ont des bordures visibles. Les liens sont visibles. Rien ne devient invisible.

Après cette tâche, appuyer sur le même raccourci clavier pour désactiver le contraste élevé.

- [ ] OK
- [ ] ERREUR
Commentaires : _______________________________

---

## Section 10 -- Vérification du déploiement (accessibilité des URLs)

### Tâche 28

Pour chaque URL ci-dessous, l'ouvrir dans le navigateur et vérifier qu'elle se charge correctement (pas de 404, pas de page blanche).

| URL | OK ? |
|-----|------|
| https://yujin.app/nac-spec/ | [ ] |
| https://yujin.app/nac-spec/SPEC.md | [ ] |
| https://yujin.app/nac-spec/js/nac.js | [ ] |
| https://yujin.app/nac-spec/js/nac-chat-client.js | [ ] |
| https://yujin.app/nac-spec/example.php | [ ] |
| https://yujin.app/nac-spec/example-v21-data-table.php | [ ] |
| https://yujin.app/nac-spec/example-v22-interop.php | [ ] |
| https://yujin.app/nac-spec/demos/react/ | [ ] |
| https://yujin.app/nac-spec/demos/angular/ | [ ] |

Si une URL échoue : _______________________________

- [ ] Tout OK
- [ ] Au moins une ERREUR (voir notes ci-dessus)

---

## VALIDATION FINALE

```
Tag de version testé :    v____._.___
Nom du testeur :          ______________________________
Date du test :            ____-____-____
Navigateurs utilisés :    [ ] Chrome  [ ] Firefox  [ ] Safari  [ ] Edge
Système d'exploitation :  [ ] Windows  [ ] macOS  [ ] Linux
Lecteur d'écran testé :   [ ] NVDA  [ ] JAWS  [ ] VoiceOver  [ ] Aucun
Nombre de tâches réalisées : ___ sur 28
Tâches marquées ERREUR :     ___

Signature : _______________________________
```

Envoyer ce fichier complété au mainteneur du projet.

---

## Voir aussi

- [HUMAN_OK_CHECKLIST.md](HUMAN_OK_CHECKLIST.md) -- la version technique de cette liste de contrôle, destinée aux développeurs.
- [HUMAN_OK_CHECKLIST_TESTER.es.md](HUMAN_OK_CHECKLIST_TESTER.es.md) -- version en espagnol.
- [ACCESSIBILITY.md](ACCESSIBILITY.md) -- l'engagement en matière d'accessibilité.

---

*This is a machine translation of the canonical English
version at `/nac-spec/docs/HUMAN_OK_CHECKLIST_TESTER.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
