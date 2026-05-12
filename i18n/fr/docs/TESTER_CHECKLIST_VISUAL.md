---
translation_source: docs/TESTER_CHECKLIST_VISUAL.md
translation_source_hash: 096be2111afd4470edb63fbb0001b20e678a6720201334fc1622bed3a4d434fb
translation_quality: machine_v1
translation_lang: fr
translation_date: 2026-05-11T13:23:24.143305+00:00
---

# NAC3 v2.2 -- Liste de contrôle testeur : visuel / mise en page front-end

**Destiné à :** le testeur humain évaluant l'aspect visuel et le ressenti général.
**Durée :** ~30 minutes.
**Prérequis :** tout navigateur moderne (Chrome recommandé).

## Comment utiliser cette liste de contrôle

Pour chaque tâche :

1. Ouvrir l'URL indiquée.
2. Observer la page calmement. Prendre 30 à 60 secondes avant de juger.
3. Comparer avec la liste « Ce qu'il faut évaluer ».
4. Cocher `[X]` dans **OK** si tout semble correct.
5. Cocher `[X]` dans **À CORRIGER** si quelque chose semble mauvais / cassé / peu professionnel.
6. Écrire TOUJOURS au moins 1 phrase dans la zone Commentaires, même en cochant OK -- décrire ce que vous avez vu et ce que vous avez ressenti.
7. Si vous remarquez quelque chose qui ne figure pas dans la liste d'évaluation, l'écrire également dans les Commentaires. La zone Commentaires est la partie la plus importante de cette liste de contrôle.

Soyez honnête, pas poli. Un « à corriger » avec un vrai commentaire est plus utile que 10 cases « OK » cochées par réflexe.

---

## Section 1 -- Page d'accueil (la porte d'entrée)

### Tâche V1 -- Première impression de la page d'accueil

a) Ouvrir Chrome en navigation privée, aller sur `https://yujin.app/nac-spec/`.
b) Observer la page pendant 30 secondes sans faire défiler.
c) S'imaginer arriver depuis Twitter pour la première fois.
d) **Ce qu'il faut évaluer :**
- La zone hero (haut de page) explique-t-elle clairement ce qu'est NAC3 en moins de 10 secondes de lecture ?
- Le branding japonais sumi-e est-il visible sans être envahissant ?
- La police est-elle lisible ? Le contraste est-il bon ?
- Y a-t-il des endroits évidents où cliquer ensuite (Demo, Docs, etc.) ?
- L'ensemble paraît-il professionnel ou amateur ?

- [ ] OK -- aspect professionnel, message clair
- [ ] À CORRIGER
Commentaires (obligatoires) : _______________________________
_______________________________

### Tâche V2 -- Espacement et rythme

a) Faire défiler lentement la page d'accueil du haut vers le bas.
b) Prêter attention au rythme vertical : les sections sont-elles séparées proprement, ou se chevauchent-elles ?
c) **Ce qu'il faut évaluer :**
- Espace blanc suffisant entre les sections (ni trop serré, ni trop aéré) ?
- Les titres de section se distinguent-ils du corps du texte ?
- Les lignes de texte sont-elles confortables à lire (ni trop larges, ni trop étroites) ?
- Aucun élément ne semble « déborder » de son conteneur ?

- [ ] OK
- [ ] À CORRIGER
Commentaires : _______________________________
_______________________________

### Tâche V3 -- Section « Made with NAC3 »

a) Faire défiler jusqu'à la section « Made with NAC3 ».
b) Observer les 4 cartes dans la grille.
c) **Ce qu'il faut évaluer :**
- Les 4 cartes ont-elles la même taille visuelle ?
- Les caractères japonais en haut de chaque carte semblent-ils intentionnels ou aléatoires ?
- Chaque carte est-elle lisible -- titre, description, flèche de lien tous clairs ?
- La section donne-t-elle une impression d'utilisateurs prestigieux, ou de contenu de remplissage ?

- [ ] OK
- [ ] À CORRIGER
Commentaires : _______________________________
_______________________________

### Tâche V4 -- Section liste d'attente Forge + Pilot

a) Faire défiler jusqu'à « Coming Q3 2026: Yujin Forge + Pilot ».
b) Observer les 2 cartes produit + le formulaire e-mail en dessous.
c) **Ce qu'il faut évaluer :**
- Les deux niveaux tarifaires (19 $ et 5 $) sont-ils visuellement distincts ?
- Les listes de fonctionnalités produit (puces) sont-elles faciles à parcourir ?
- Le formulaire e-mail est-il épuré -- pas surchargé ?
- Le texte de mention légale concernant BYOK est-il lisible sans être trop présent ?
- Le bouton « Notify me » est-il bien visible et semble-t-il cliquable ?

- [ ] OK
- [ ] À CORRIGER
Commentaires : _______________________________
_______________________________

### Tâche V5 -- Gouvernance + pied de page

a) Faire défiler jusqu'en bas de la page.
b) Observer la section « Open standard, open governance » + le pied de page.
c) **Ce qu'il faut évaluer :**
- Le texte de gouvernance est-il lisible et rassurant ?
- Le pied de page est-il minimaliste (kanji, licence, lien GitHub, lien Yujin, version) ?
- Rien dans le pied de page ne semble cassé ou mal aligné ?

- [ ] OK
- [ ] À CORRIGER
Commentaires : _______________________________
_______________________________

---

## Section 2 -- Visuel des démos

### Tâche V6 -- Démo Vanilla (example.php)

a) Aller sur `https://yujin.app/nac-spec/example.php`.
b) Observer la page sans interagir.
c) **Ce qu'il faut évaluer :**
- Les 27 widgets s'assemblent-ils de façon cohérente ou semblent-ils jetés au hasard ?
- Les couleurs sont-elles cohérentes (palette sumi-e ou chaotique) ?
- Les boutons semblent-ils cliquables (relief, couleur, espacement correct) ?
- Les champs de saisie semblent-ils accessibles (le curseur s'y poserait clairement) ?
- Les onglets (le cas échéant) ressemblent-ils à des onglets ?

- [ ] OK
- [ ] À CORRIGER
Commentaires : _______________________________
_______________________________

### Tâche V7 -- Démo v20-full

a) Aller sur `https://yujin.app/nac-spec/example-v20-full.php`.
b) Prêter une attention particulière au « v20-panel », généralement en haut à droite.
c) **Ce qu'il faut évaluer :**
- Le v20-panel est-il visible immédiatement (pas caché, pas coupé) ?
- Les boutons du panneau (describe_v2, validate_global_v2, etc.) sont-ils lisibles et distincts ?
- Le panneau ne semble-t-il pas « rajouté à la va-vite » -- s'intègre-t-il visuellement à la page ?

- [ ] OK
- [ ] À CORRIGER
Commentaires : _______________________________
_______________________________

### Tâche V8 -- Démo tableau de données (v21)

a) Aller sur `https://yujin.app/nac-spec/example-v21-data-table.php`.
b) Observer les onglets + le tableau de données à l'intérieur.
c) **Ce qu'il faut évaluer :**
- L'onglet actif est-il visuellement distinct des onglets inactifs ?
- Les lignes du tableau alternent-elles de couleur (zèbre) pour faciliter la lecture ?
- Les en-têtes de colonnes se distinguent-ils des lignes de données ?
- Les boutons d'action « ajouter une ligne » ou similaires sont-ils repérables ?
- Le panneau de chat ne chevauche-t-il pas le tableau et ne le masque-t-il pas ?

- [ ] OK
- [ ] À CORRIGER
Commentaires : _______________________________
_______________________________

### Tâche V9 -- Démo interop (v22)

a) Aller sur `https://yujin.app/nac-spec/example-v22-interop.php`.
b) Observer les deux mini-applications côte à côte.
c) **Ce qu'il faut évaluer :**
- Les deux côtés sont-ils clairement séparés (bordure, couleur ou espacement) ?
- Les 4 CTA (Export tree, Import remote, etc.) sont-ils visibles en haut ?
- Après avoir cliqué sur un CTA, le panneau de sortie affiche-t-il clairement un retour ?
- Le visuel donne-t-il l'impression de « deux applications » et non d'« une page confuse » ?

- [ ] OK
- [ ] À CORRIGER
Commentaires : _______________________________
_______________________________

### Tâche V10 -- Démos React + Angular

a) Ouvrir `https://yujin.app/nac-spec/demos/react/` et `https://yujin.app/nac-spec/demos/angular/` dans deux onglets.
b) Les comparer côte à côte.
c) **Ce qu'il faut évaluer :**
- Donnent-ils l'impression de la même application implémentée dans 2 frameworks (cohérence) ?
- Les deux ont-ils une interface Todos épurée : champ de saisie + bouton + liste ?
- Les deux ont-ils un panneau de chat fonctionnel ?
- Aucun des deux ne présente de bugs visuels évidents (chevauchements, texte coupé, couleurs incorrectes) ?

- [ ] OK
- [ ] À CORRIGER
Commentaires : _______________________________
_______________________________

---

## Section 3 -- Visuel du panneau de chat

### Tâche V11 -- Mise en page du panneau de chat

a) Sur la page d'accueil, ouvrir le panneau de chat (cliquer sur la bulle si replié).
b) Redimensionner la fenêtre du navigateur : étroite (type téléphone, ~400 px de large) et large (bureau, 1400 px).
c) **Ce qu'il faut évaluer :**
- En large : le panneau de chat est-il ancré à droite sans écraser le contenu ?
- En étroit : le panneau de chat occupe-t-il toute la largeur OU flotte-t-il de façon sensée ?
- Le bouton microphone est-il toujours visible (jamais coupé) ?
- Le bouton Envoyer est-il toujours cliquable ?
- Les bulles de messages (lorsqu'il y en a) distinguent-elles clairement l'utilisateur de l'assistant ?

- [ ] OK
- [ ] À CORRIGER
Commentaires : _______________________________
_______________________________

### Tâche V12 -- Lisibilité du chat

a) Saisir et envoyer 3 messages. Attendre les réponses.
b) Faire défiler la conversation.
c) **Ce qu'il faut évaluer :**
- Les messages de l'utilisateur et ceux de l'assistant sont-ils visuellement distincts ?
- Les longues réponses (multi-paragraphes) sont-elles paginées / défilables proprement ?
- Les blocs de code dans les réponses (le cas échéant) sont-ils mis en forme clairement ?
- La taille de police est-elle confortable (ni trop petite, ni trop grande) ?

- [ ] OK
- [ ] À CORRIGER
Commentaires : _______________________________
_______________________________

---

## Section 4 -- Mobile / responsive

### Tâche V13 -- Mobile portrait

a) Sur un téléphone (ou en mode mobile DevTools du navigateur réglé sur iPhone), ouvrir `https://yujin.app/nac-spec/`.
b) Faire défiler toute la page.
c) **Ce qu'il faut évaluer :**
- Pas de barre de défilement horizontal (la largeur de la page s'adapte) ?
- Tous les boutons sont-ils accessibles avec le pouce (pas trop petits) ?
- Le texte est-il lisible sans zoomer ?
- Les images / GIF (le cas échéant) ne cassent-ils pas la mise en page ?

- [ ] OK
- [ ] À CORRIGER
Commentaires : _______________________________
_______________________________

### Tâche V14 -- Tablette paysage

a) Sur une tablette (ou DevTools iPad paysage), ouvrir la page d'accueil.
b) Observer comment la mise en page exploite la largeur supplémentaire.
c) **Ce qu'il faut évaluer :**
- Les mises en page multi-colonnes s'activent-elles aux tailles plus larges ?
- La page ne reste-t-elle PAS étroite (~600 px) sur un écran de 1024 px ?
- L'espace blanc est-il équilibré, pas gênant ?

- [ ] OK
- [ ] À CORRIGER
Commentaires : _______________________________
_______________________________

---

## Section 5 -- Ressenti subjectif

### Tâche V15 -- Esthétique générale

a) Sans trop réfléchir, parcourir la page d'accueil + 2 démos.
b) Évaluer le ressenti selon ces dimensions :

| Dimension | 1 (mauvais) - 5 (excellent) |
|-----------|---------------------|
| Professionnel vs amateur | __ |
| Branding sumi-e intégré naturellement | __ |
| Hiérarchie visuelle claire | __ |
| Choix de couleurs cohérents | __ |
| Typographie lisible et de bon goût | __ |
| Signal de confiance (prendriez-vous ce produit au sérieux ?) | __ |

Commentaires : _______________________________
_______________________________

### Tâche V16 -- Une chose à changer

Si vous pouviez changer UNE chose visuelle sur l'ensemble du site pour l'améliorer le plus, laquelle serait-ce ?

Votre réponse (obligatoire, 1 à 3 phrases) : _______________________________
_______________________________
_______________________________

### Tâche V17 -- Une chose à conserver

Quel choix visuel sur le site vous impressionne le plus et devrait rester ?

Votre réponse (obligatoire) : _______________________________
_______________________________

### Tâche V18 -- Jugement de confiance

a) Imaginez que vous êtes un CTO qui découvre cela pour la première fois.
b) Feriez-vous suffisamment confiance à l'entreprise derrière ce produit pour envisager d'adopter NAC3 en production ?
c) **Pourquoi ou pourquoi pas ?**

- [ ] Oui, je ferais confiance
- [ ] Non, je ne ferais pas (encore) confiance
Pourquoi : _______________________________
_______________________________

### Tâche V19 -- Comparaison avec les pairs

Comparé aux autres pages d'accueil d'outils open-standard / dev-tools (ex. Anthropic, Vercel, Linear, Notion), le site NAC3 paraît :

- [ ] Meilleur
- [ ] Au même niveau
- [ ] En dessous
- [ ] Bien en dessous

Ce qui le distingue précisément : _______________________________
_______________________________

### Tâche V20 -- Zone de retour libre

Tout ce que vous avez remarqué et qui ne correspond à aucune tâche ci-dessus. Bugs, formulations maladroites, espacements étranges, liens cassés, parcours confus, opportunités manquées. Tout noter.

_______________________________
_______________________________
_______________________________
_______________________________
_______________________________
_______________________________
_______________________________
_______________________________

---

## VALIDATION FINALE (évaluation visuelle)

```
Tag de version :    v____._.___
Nom du testeur :    ______________________________
Date :              ____-____-____
Navigateur :        [ ] Chrome  [ ] Firefox  [ ] Safari  [ ] Edge
Appareil :          [ ] Bureau  [ ] Tablette  [ ] Téléphone

Note visuelle globale (1-10) : __

Top 3 des problèmes visuels à corriger (par ordre de priorité) :
1. _______________________________
2. _______________________________
3. _______________________________

Verdict pour le lancement :
[ ] le visuel est prêt à être mis en ligne
[ ] le visuel nécessite des corrections mais ce n'est pas bloquant
[ ] le visuel est bloquant -- ne pas lancer encore

Signature : ______________________________
```

---

## Voir aussi

- `TESTER_CHECKLIST_VOICE_CHAT.md` -- évaluation spécifique voix + chat.
- `TESTER_CHECKLIST_VISUAL.es.md` -- version espagnole.
- `HUMAN_OK_CHECKLIST_TESTER.md` -- liste de contrôle fonctionnelle générale.

---

*This is a machine translation of the canonical English
version at `/nac-spec/docs/TESTER_CHECKLIST_VISUAL.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
