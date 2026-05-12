---
translation_source: CONTRIBUTING.md
translation_source_hash: 15fa7e8a34cc86e6193de8cd9826a9bd98d4b3ac1c72a43646521d75f88f9a26
translation_quality: machine_v1
translation_lang: fr
translation_date: 2026-05-11T12:52:42.447218+00:00
---

# Contribuer à NAC3

**Version de la spec :** 2.2 stable (+ aperçu d'interopérabilité v2.3).

## Gouvernance

NAC3 est actuellement géré par Yujin. La spec est sous licence Apache 2.0 ;
le runtime de référence est sous MIT. Yujin s'engage à transférer NAC3 vers
une fondation neutre (groupe communautaire W3C, Linux Foundation, ou
équivalent) si et quand l'adoption le justifie. En attendant, les
modifications de la spec suivent le processus RFC décrit ci-dessous, avec
au moins 14 jours de commentaires publics pour toute modification de l'API
publique ou des formats de communication.

La double licence Apache 2.0 + MIT garantit que la spec et le runtime
survivent à tout changement de statut juridique de Yujin. Les forks sont
explicitement encouragés sous les deux licences.

---

Merci de considérer une contribution. NAC3 est une spec publique accompagnée
d'une implémentation de référence ; les deux acceptent des contributions.

## Trois types de contributions

### 1. Modification de la spec (RFC obligatoire)

Les modifications apportées à `SPEC.md`, `ABOUT.md` ou
`docs/NAC_V*_ROADMAP.md` constituent des changements de spec. Avant
d'ouvrir une PR :

1. Ouvrez une issue GitHub intitulée `RFC: <résumé en une ligne>`.
2. Décrivez la classe de problème (quel bug ou quelle limitation est
   corrigé, idéalement avec une reproduction concrète).
3. Décrivez le changement de contrat proposé.
4. Décrivez le chemin de migration pour les adoptants existants.
5. Attendez qu'au moins un mainteneur réponde à l'issue avant
   d'ouvrir la PR.

Les PR de spec arrivant sans issue RFC associée seront fermées avec un
renvoi vers cette section.

### 2. Modification du runtime de référence

Modifications de `js/nac.js`, `js/nac-v2-extensions.js` ou
`js/nac-chat-client.js`. Les PR sont les bienvenues sans RFC si :

- La modification est un correctif de bug alignant le runtime sur la
  spec actuelle.
- La modification est une amélioration des performances sans impact
  comportemental.
- La modification concerne la documentation, les types ou la couverture
  de tests.

Les PR qui modifient le comportement du runtime d'une manière affectant
le contrat de la spec DOIVENT être accompagnées d'une RFC de spec au
préalable.

### 3. Démo, outillage ou amélioration de la documentation

Modifications de `example*.php`, `tools/`, `guides/`, ou tout fichier
Markdown hors spec. PR directe. Gardez les changements minimaux ; nous
préférons dix petites PR à une seule grande.

## Style de code

- Fichiers source en ASCII uniquement (le projet est déployé sur GoDaddy ;
  PHP 8.3 rejette les caractères non-ASCII même dans les commentaires).
  Utilisez `--` pour les tirets cadratins, pas `--`.
- JS : pas de transpileur, pas de bundler, pas d'étape de build sur les
  fichiers du runtime. ES2018+ pur. Le package npm ajoute une enveloppe
  ESM/CJS autour des mêmes sources.
- PHP : gardez les heredocs simples (`{$var}` uniquement, pas
  d'expressions).
- Commentaires : expliquez POURQUOI, pas QUOI. Le diff montre déjà le quoi.
- Tests : tout changement comportemental doit être accompagné d'un test qui
  échoue avant et passe après. Lancez `make test-launch` depuis la racine du
  dépôt avant de pousser.

## Style des commits

- Sujet de moins de 70 caractères, impératif au présent.
  « fix(nac): treat tab role drift as register-time error », pas
  « Fixed tab thing ».
- Le corps explique le problème, la cause et la correction. Citez les
  commits liés par leur SHA court.
- Le trailer Co-author pour les commits assistés par IA est accepté ; nous
  ne cachons pas l'outillage utilisé.

## Revue de code

- PR de correctif : 1 approbateur, fusion.
- PR runtime/spec : 1 approbateur + CI verte, fusion.
- PR de changement de spec : issue RFC associée avec discussion + 1
  approbateur + CI verte + fenêtre de commentaires de 7 jours après
  l'ouverture de la PR.

## Licence

En soumettant une PR, vous placez votre contribution sous licence Apache-2.0
pour correspondre au projet. Le modèle de PR inclut une case à cocher ;
cochez-la.

## Code de conduite

Soyez techniquement rigoureux, concis et bienveillant. Le désaccord est
acceptable ; l'attaque personnelle ne l'est pas. Les mainteneurs peuvent
fermer des fils de discussion ou révoquer les accès en commit en cas de
violations répétées.

## Où poser des questions

- GitHub Discussions pour les questions de conception, « devrais-je utiliser
  NAC3 pour cela ? », et les présentations de projets.
- GitHub Issues pour les rapports de bugs.
- `nac@yujin.dev` pour les signalements de sécurité (voir `SECURITY.md`).

---

*This is a machine translation of the canonical English
version at `/nac-spec/CONTRIBUTING.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
