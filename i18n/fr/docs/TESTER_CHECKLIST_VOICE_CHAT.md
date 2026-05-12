---
translation_source: docs/TESTER_CHECKLIST_VOICE_CHAT.md
translation_source_hash: 8a27543feff39f34b78b01fceec66d117fae27d4d9e6d4a8f74eef3c71e5982d
translation_quality: machine_v1
translation_lang: fr
translation_date: 2026-05-11T13:22:21.904315+00:00
---

# NAC3 v2.2 -- Liste de vérification testeur : voix + chat

**Pour :** le testeur humain chargé du comportement voix + chat.
**Durée :** ~30-45 minutes.
**Prérequis :** microphone fonctionnel + haut-parleurs/casque.

## Instructions

Pour chaque tâche :

1. Lire les étapes a, b, c, d dans l'ordre.
2. Effectuer exactement ce que décrit l'étape a, puis b, puis c.
3. Comparer ce que vous voyez/entendez avec le « Résultat attendu » en d.
4. Cocher `[X]` dans **OK** si cela correspond ; cocher `[X]` dans **ERREUR** + décrire ce qui s'est réellement passé.
5. Ne pas sauter d'étape. Si une tâche échoue, passer à la suivante.

---

## Section A -- Bases du panneau de chat

### Tâche A1 -- Ouvrir le panneau de chat

a) Ouvrir Chrome en navigation privée (Ctrl+Shift+N).
b) Aller sur `https://yujin.app/nac-spec/`.
c) Repérer le panneau de chat (généralement une bulle circulaire en bas à droite ; cliquer dessus pour l'agrandir). S'il est déjà ouvert, ignorer ce clic.
d) **Résultat attendu :** Un panneau de chat s'ouvre sur le côté droit de l'écran. Il contient : un en-tête avec le texte « Yujin chat », un menu déroulant de sélection de langue, une zone de saisie de texte en bas, un bouton Envoyer, et un bouton microphone à côté de la saisie.

- [ ] OK
- [ ] ERREUR
Commentaires : _______________________________

### Tâche A2 -- Envoyer une question par texte

a) Cliquer dans la zone de saisie du chat.
b) Taper : `que es NAC3?`
c) Cliquer sur le bouton Envoyer (ou appuyer sur Entrée).
d) **Résultat attendu :** En 5 à 15 secondes, le chat affiche une réponse en espagnol (car le message était en espagnol). La réponse explique ce qu'est NAC3. Elle comporte au moins 2 phrases. Aucun message d'erreur rouge n'apparaît.

- [ ] OK
- [ ] ERREUR
Commentaires : _______________________________

### Tâche A3 -- Envoyer une autre question en anglais

a) Dans le même chat, taper : `how do I install NAC3?`
b) Appuyer sur Entrée.
c) Attendre la réponse.
d) **Résultat attendu :** La réponse revient en anglais. Elle mentionne `npm install @nac3/runtime` ou une commande d'installation similaire.

- [ ] OK
- [ ] ERREUR
Commentaires : _______________________________

---

## Section B -- Saisie vocale (microphone)

### Tâche B1 -- Première activation du micro (autorisation d'accès)

a) Cliquer sur le bouton microphone à côté de la saisie du chat.
b) Le navigateur demande l'autorisation d'accès au microphone. Cliquer sur « Autoriser ».
c) Observer l'état visuel du bouton.
d) **Résultat attendu :** Le bouton microphone change d'apparence (couleur, animation ou icône) pour indiquer qu'il est en écoute active. Un indicateur « enregistrement en cours » peut être visible.

- [ ] OK
- [ ] ERREUR
Commentaires : _______________________________

### Tâche B2 -- Parler en espagnol

a) Avec le microphone actif, prononcer clairement : **« hola »** (un seul mot).
b) Après ~2 secondes de silence, l'enregistrement s'arrête automatiquement (ou cliquer à nouveau sur le bouton micro pour l'arrêter).
c) Attendre 3 à 5 secondes.
d) **Résultat attendu :** Le panneau de chat affiche le mot transcrit « hola » (ou proche). Une réponse du chat apparaît en espagnol dans les 10 secondes.

- [ ] OK
- [ ] ERREUR
Commentaires : _______________________________

### Tâche B3 -- Voix en anglais

a) Cliquer à nouveau sur le bouton microphone.
b) Prononcer clairement : **« what is NAC3 »**.
c) Attendre la réponse.
d) **Résultat attendu :** La transcription affiche « what is NAC3 » (ou proche). Réponse en anglais.

- [ ] OK
- [ ] ERREUR
Commentaires : _______________________________

### Tâche B4 -- TTS (synthèse vocale) lecture audio

a) Après l'apparition de la réponse de la tâche B3, écouter attentivement vos haut-parleurs.
b) Être attentif pendant les 5 secondes suivant l'affichage de la réponse dans le chat.
d) **Résultat attendu :** Une voix anglaise claire lit la réponse à voix haute via vos haut-parleurs. La voix est naturelle (pas robotique ou hachée).

- [ ] OK
- [ ] ERREUR
- [ ] Aucun son entendu
Commentaires : _______________________________

---

## Section C -- Dispatch vocal sur la démo data-table

### Tâche C1 -- Charger la démo data-table

a) Aller sur `https://yujin.app/nac-spec/example-v21-data-table.php`.
b) Attendre 5 secondes pour le chargement complet.
c) Repérer le panneau de chat et les onglets en haut du tableau de données.
d) **Résultat attendu :** La page affiche plusieurs onglets (au moins « Lines (collection) » et « Permissions »). Le panneau de chat est visible.

- [ ] OK
- [ ] ERREUR
Commentaires : _______________________________

### Tâche C2 -- Changement d'onglet par la voix (espagnol)

a) Cliquer sur le bouton microphone.
b) Prononcer : **« ve a permisos »**.
c) Attendre jusqu'à 5 secondes.
d) **Résultat attendu :** L'onglet « Permisos » (ou « Permissions ») devient actif. Le contenu de la zone d'affichage change.

- [ ] OK
- [ ] ERREUR
Commentaires : _______________________________

### Tâche C3 -- Changement d'onglet par la voix (anglais)

a) Cliquer sur le microphone.
b) Prononcer : **« go to lines »**.
c) Attendre.
d) **Résultat attendu :** L'onglet « Lines (collection) » s'active.

- [ ] OK
- [ ] ERREUR
Commentaires : _______________________________

### Tâche C4 -- Ajouter une ligne par la voix

a) Cliquer sur le microphone.
b) Prononcer lentement : **« agrega una linea con concepto leche cantidad dos precio cien »**.
c) Attendre jusqu'à 10 secondes.
d) **Résultat attendu :** Une nouvelle ligne apparaît dans le tableau de données avec : concept = « leche » (ou « milk »), quantité = 2, prix = 100 (ou analyse similaire).

- [ ] OK
- [ ] ERREUR
Commentaires : _______________________________

### Tâche C5 -- Lire un agrégat par la voix

a) Cliquer sur le microphone.
b) Prononcer : **« cuanto total hay? »** (ou « what is the total? »).
c) Attendre la réponse.
d) **Résultat attendu :** Le chat répond avec une valeur numérique correspondant à la somme des lignes visibles. Le TTS lit le nombre à voix haute.

- [ ] OK
- [ ] ERREUR
Commentaires : _______________________________

---

## Section D -- Dispatch vocal sur les démos React + Angular

### Tâche D1 -- Démo React : ajout par la voix

a) Aller sur `https://yujin.app/nac-spec/demos/react/`.
b) Attendre 5 secondes.
c) Cliquer sur le microphone dans le panneau de chat.
d) Prononcer : **« agrega leche »**.
e) Attendre 5 secondes.
d) **Résultat attendu :** Un élément todo « leche » (ou « milk ») apparaît dans la liste de tâches.

- [ ] OK
- [ ] ERREUR
Commentaires : _______________________________

### Tâche D2 -- Démo React : suppression par la voix

a) Dans la même démo, cliquer sur le microphone.
b) Prononcer : **« borra leche »**.
c) Attendre 5 secondes.
d) **Résultat attendu :** L'élément « leche/milk » disparaît de la liste.

- [ ] OK
- [ ] ERREUR
Commentaires : _______________________________

### Tâche D3 -- Démo Angular : mêmes flux

a) Aller sur `https://yujin.app/nac-spec/demos/angular/`.
b) Répéter les tâches D1 et D2 sur cette démo.
c) Comparer le comportement avec la démo React.
d) **Résultat attendu :** Comportement identique -- l'ajout par la voix fonctionne, la suppression par la voix fonctionne.

- [ ] OK
- [ ] ERREUR
Commentaires : _______________________________

---

## Section E -- Voix multilingue (tester uniquement les langues que vous parlez)

Pour chaque langue que vous parlez réellement, effectuer le test ci-dessous. Ignorer sinon.

### Tâche E1 -- Portugais

a) Aller sur `https://yujin.app/nac-spec/example-v21-data-table.php`.
b) Changer la langue du chat en « pt » (portugais) via le menu déroulant.
c) Cliquer sur le microphone, prononcer : **« vai para permissoes »**.
d) **Résultat attendu :** L'onglet Permissions s'active. Réponse du chat en portugais.

- [ ] OK
- [ ] ERREUR
- [ ] Ignoré (ne parle pas portugais)
Commentaires : _______________________________

### Tâche E2 -- Français

a) Changer la langue en « fr ».
b) Prononcer : **« va aux permissions »**.
c) Observer.
d) **Résultat attendu :** Permissions s'active. Réponse en français.

- [ ] OK
- [ ] ERREUR
- [ ] Ignoré
Commentaires : _______________________________

### Tâche E3 -- Allemand

a) Changer la langue en « de ».
b) Prononcer : **« gehe zu berechtigungen »**.
c) Observer.
d) **Résultat attendu :** Permissions s'active. Réponse en allemand.

- [ ] OK
- [ ] ERREUR
- [ ] Ignoré
Commentaires : _______________________________

### Tâche E4 -- Autre (it / ja / zh / hi / ar)

Pour toute autre langue que vous parlez parmi {italien, japonais, chinois, hindi, arabe}, effectuer le même test avec la phrase équivalente à « aller aux permissions ».

- [ ] OK
- [ ] ERREUR
- [ ] Ignoré
Langue testée : ______________
Commentaires : _______________________________

---

## Section F -- Piège de changement de locale (garde contre les régressions)

### Tâche F1 -- Le piège de la préposition « de » (espagnol)

a) Aller sur `https://yujin.app/nac-spec/example-v21-data-table.php`.
b) S'assurer que le chat est en espagnol (« es ») dans le menu déroulant de langue.
c) Cliquer sur le microphone, prononcer : **« cambia de pestana »** (espagnol pour « changer d'onglet » -- « de » est la préposition espagnole, PAS l'allemand).
d) Attendre la réponse.
d) **Résultat attendu :** Le chat ne passe PAS en allemand. Le menu déroulant de langue reste sur « es ». Le chat peut répondre en espagnol en demandant une clarification, ou changer d'onglet -- les deux sont acceptables. Le résultat interdit est « langue passée en allemand ».

- [ ] OK (resté en espagnol)
- [ ] ERREUR (passé en allemand -- régression !)
Commentaires : _______________________________

### Tâche F2 -- Changement de langue explicite (autorisé)

a) Cliquer sur le microphone.
b) Prononcer : **« cambia el idioma a aleman »** (explicitement « changer la langue en allemand »).
c) Attendre.
d) **Résultat attendu :** La langue du chat passe en « de » (allemand). Il s'agit du déclencheur légitime.

- [ ] OK
- [ ] ERREUR
Commentaires : _______________________________

---

## VALIDATION FINALE (voix + chat)

```
Tag de version :         v____._.___
Nom du testeur :         ______________________________
Date :                   ____-____-____
Navigateur :             [ ] Chrome  [ ] Firefox  [ ] Safari  [ ] Edge
Micro + haut-parleurs :  [ ] oui  [ ] non
Langues testées :        __ , __ , __ , __ , __ , __
Tâches effectuées :      __ sur 23
Tâches marquées OK :     __
Tâches marquées ERREUR : __
Verdict global :         [ ] prêt  [ ] corrections nécessaires  [ ] problèmes bloquants

Top 3 des problèmes (le cas échéant) :
1. _______________________________
2. _______________________________
3. _______________________________

Signature : ______________________________
```

---

## Voir aussi

- `TESTER_CHECKLIST_VISUAL.md` -- évaluation de la mise en page visuelle.
- `TESTER_CHECKLIST_VOICE_CHAT.es.md` -- version espagnole de ce fichier.
- `HUMAN_OK_CHECKLIST_TESTER.md` -- liste de vérification fonctionnelle générale.

---

*This is a machine translation of the canonical English
version at `/nac-spec/docs/TESTER_CHECKLIST_VOICE_CHAT.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
