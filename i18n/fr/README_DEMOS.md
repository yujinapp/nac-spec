---
translation_source: README_DEMOS.md
translation_source_hash: 0f488dd749283f4f2e03f0e431de47d7007818c6745ce1ce993014bdf9839480
translation_quality: machine_v1
translation_lang: fr
translation_date: 2026-05-11T12:53:38.378351+00:00
---

# Démos en direct de NAC3 sur yujin.app/nac-spec/

**Version de la spec :** 2.2 stable (+ aperçu d'interopérabilité v2.3).

**NAC3** = **Native Agent Contract**. La spec qui permet aux interfaces web d'être pilotées par des assistants IA, des moteurs vocaux et des outils d'accessibilité, sans code de liaison spécifique à chaque application.

Trois démos disponibles côte à côte. Chacune a un objectif distinct ; ne pas les confondre.

| Fichier | Version | Objectif |
|---|---|---|
| `example.php` | v1.9 stable | La démo de référence pour NAC3 v1.9. 27 widgets (chat, calendrier, pilote automatique, modales, onglets, graphiques, etc.). Présente l'ensemble des fonctionnalités v1.9 dans une interface de forme production. **Inchangé.** |
| `example-v20-primitives-showcase.php` | v2.0-rc4 | **Vitrine didactique** des 8 primitives v2.0 + HMAC + isTrusted + contrat i18n. 8 sections, une par primitive. Utile pour les évaluateurs et les adoptants qui souhaitent comprendre chaque nouvelle primitive de manière isolée. **PAS une migration de example.php.** |
| `example-v20-full.php` | v2.0-rc4 | **Migration brownfield** de `example.php` vers NAC3 v2.0 strict. Mêmes 27 widgets, même HTML, mêmes gestionnaires -- avec la couche v2.0 appliquée par-dessus via ~80 lignes de code d'initialisation. Démontre que l'adoption en conditions réelles ne nécessite PAS de réécrire chaque widget. |

## Comparaison côte à côte

Ouvrir `example.php` et `example-v20-full.php` dans deux onglets.

### Ce qui est identique

- Le balisage HTML (chaque `<article data-nac-plugin="X">`, chaque
  `data-nac-id`, chaque référence au catalogue i18n, chaque gestionnaire)
- L'apparence visuelle (même mise en page, mêmes widgets, mêmes interactions)
- Le runtime de référence v1.9 (`js/nac.js`) chargé de la même façon
- Les références existantes au catalogue `data-i18n-key`

### Ce qui diffère dans la version v2.0-full

1. **Docstring d'en-tête** explicitant qu'il s'agit d'une vitrine de migration brownfield.
2. **Une balise script supplémentaire** : `js/nac-v2-extensions.js` chargé
   après `nac.js` et avant `example.js`.
3. **Un bloc d'initialisation supplémentaire** (~80 lignes en bas de la
   page) qui :
   - Construit un arbre de portées hiérarchique à partir des attributs
     `data-nac-plugin` existants (chaque plugin devient une portée
     sous `demo.shell`).
   - Appelle `NAC.set_provenance_secret()` pour activer la signature HMAC.
   - Appelle `NAC.setTenantPrefix('demo')` pour démontrer le multi-tenant.
   - Démarre le tampon circulaire `NAC.captureEphemeral()` pour les toasts.
   - Appelle `NAC.autoRegister.watch()` sur le conteneur de cartes.
4. **Un panneau d'interface supplémentaire** (`#v20-panel`, fixé en bas à droite)
   exposant en direct `describe_v2()`, `validate_global_v2()`, la démo de
   signature HMAC et le bouton de distinction isTrusted.

C'est l'intégralité du delta. Les adoptants réels peuvent réutiliser ce modèle tel quel.

## Comment évaluer

Si vous êtes évaluateur pair de NAC3 v2.0 :

1. Ouvrir `example.php` en premier. Vérifier que la démo v1.9 fonctionne comme avant.
2. Ouvrir `example-v20-full.php`. Vérifier qu'il fonctionne DE MANIÈRE IDENTIQUE pour
   les fonctionnalités v1.9 (chat, calendrier, pilote automatique, etc.).
3. Ouvrir le panneau v2.0 (coin inférieur droit). Cliquer sur chaque bouton :
   - `describe_v2()` -- visualiser l'arbre de portées construit à partir des
     attributs de plugin brownfield.
   - `validate_global_v2()` -- visualiser les résultats (probablement des avertissements
     uniquement si le catalogue i18n présente des lacunes).
   - `sign as agent` -- visualiser la signature HMAC produite.
   - `click=trusted` / `.click()=fake` -- voir la distinction isTrusted en action.

Si vous êtes un adoptant :

Utiliser le bloc d'initialisation de `example-v20-full.php` comme modèle. Adapter
l'arbre de portées à la structure de plugins de votre application. L'essentiel du
travail consiste à identifier votre hiérarchie de portées ; le reste est mécanique.

## Liens croisés

- Spec NAC3 : https://github.com/pkuschnirof/nac-spec
- Version v1.9 : tag `v1.9.0`
- Candidat à la version v2.0 : `2.0.0-rc4` sur `main`
- Historique de la revue par les pairs (round 3) : `docs/PEER_REVIEW.md`

---

*This is a machine translation of the canonical English
version at `/nac-spec/README_DEMOS.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
