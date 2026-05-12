---
translation_source: docs/ACCESSIBILITY.md
translation_source_hash: 615f9c5a447d95c7aee985d926f7b29377bed44dc959fd07a966fd41fa86a03b
translation_quality: machine_v1
translation_lang: fr
translation_date: 2026-05-11T13:47:24.353809+00:00
---

# NAC3 -- Engagement en matière d'accessibilité

**Version de la spec :** 2.2 stable (+ aperçu d'interopérabilité v2.3).
**Dernière révision :** 2026-05-11.

NAC3 a été conçu pour rendre les interfaces web adressables par des machines. La
propriété qui rend une interface navigable par un agent IA la rend également
navigable par un lecteur d'écran, un dispositif de commutation, un eye tracker
et un utilisateur vocal. NAC3 est, par construction, une primitive d'accessibilité
-- et Yujin s'engage à ce qu'il en reste ainsi.

---

## L'engagement

1. **Conformité WCAG 2.1 niveau AA** comme seuil minimal pour chaque
   produit Yujin reposant sur NAC3 (`yujin-pilot`,
   `yujin-forge`, les démos de référence sur yujin.app/nac-spec/,
   yujin.app/registry).
2. **AAA dans la mesure du possible** pour les surfaces où l'accessibilité
   est la plus critique : panneau de chat, activation vocale, premier
   démarrage, messages d'erreur.
3. **Pas d'« édition accessible » séparée**. L'accessibilité est intégrée
   au produit principal, au même prix, avec le même rythme de publication.
   Les éditions séparées stigmatisent les utilisateurs et se dégradent.
4. **Pas d'« accessibilité plus tard »**. Chaque version est conditionnée
   aux vérifications d'accessibilité documentées dans
   [HUMAN_OK_CHECKLIST.md](HUMAN_OK_CHECKLIST.md) section 8.6
   et la nouvelle section de tests de fumée pour lecteurs d'écran (Track G7).

---

## Technologies d'assistance prises en charge

Les implémentations de référence sont testées avec :

| Catégorie d'AT | Outils vérifiés |
|----------------|-----------------|
| Lecteurs d'écran | NVDA (Windows), JAWS (Windows), VoiceOver (macOS, iOS) |
| Commande vocale | Yujin Pilot, Apple Voice Control, Windows Speech Recognition, Dragon NaturallySpeaking |
| Commande par contacteur | iOS Switch Control, Android Switch Access |
| Eye tracking | Tobii Dynavox |
| Agrandissement | Zoom navigateur jusqu'à 200 %, ZoomText, macOS Zoom |
| Clavier seul | Navigation clavier complète, focus visible, sans limite de temps |

Toute AT qui exploite l'arbre d'accessibilité standard (ARIA,
accessibilityRole, accessibilityLabel) bénéficie de NAC3,
car les éléments NAC3 portent les mêmes informations sémantiques
utilisées par la couche AT.

---

## Ce que NAC3 apporte à l'accessibilité (mécanisme)

- **Identifiants stables (`data-nac-id`)** : les lecteurs d'écran et
  les dispositifs de commutation ne dépendent pas de la position visuelle.
  L'identifiant survit aux refontes, et la mémoire musculaire de
  l'utilisateur AT aussi.
- **Rôles canoniques (`data-nac-role`)** : l'énumération des rôles
  (action, field, tab, etc.) correspond 1:1 aux rôles ARIA. Les utilisateurs
  AT entendent des annonces sémantiquement correctes.
- **Verbes du manifeste (`label_i18n`)** : chaque action dispose d'un
  libellé localisé en 10 langues. Les utilisateurs de commande vocale
  prononcent le verbe ; le manifeste le résout.
- **Événements d'acquittement déterministes (`nac:action:succeeded`)** :
  les utilisateurs AT entendent la confirmation qu'une action s'est
  terminée, et non une supposition basée sur une animation de l'interface.
- **Validation stricte (v2.2)** : détecte les divergences entre le
  manifeste et le DOM avant qu'elles n'atteignent les utilisateurs AT.

---

## Ce que NAC3 ne résout PAS

- **Applications natives iOS/Android** : la spec v2.2 couvre
  uniquement le web et les WebView. Le mobile natif est prévu pour
  la feuille de route v3.0.
- **Présentation visuelle** : NAC3 est structurel. Le contraste,
  la taille des polices et les indicateurs de focus relèvent de la
  responsabilité de l'implémentation (les tokens Yujin couvrent
  cela dans nos implémentations de référence).
- **Charge cognitive des flux complexes** : les identifiants NAC3
  ne simplifient pas un workflow mal conçu. Une bonne architecture
  de l'information et des textes en langage clair, si.
- **Sous-titrage des contenus multimédias** : les ressources audio/vidéo
  doivent être sous-titrées par l'éditeur. NAC3 fournit des points
  d'accroche, mais pas le contenu.

---

## Signaler un problème d'accessibilité

Envoyez un e-mail à `accessibility@yujin.app` (ou à l'adresse qui
transfère au mainteneur). SLA de réponse : 5 jours ouvrés pour le
triage, sans SLA sur la correction car chaque cas est différent.
Les problèmes sont suivis publiquement dans le dépôt `nac-spec`
avec le label `a11y`.

Pour les problèmes sensibles en matière de sécurité (ex. : contournement
AT des boîtes de dialogue de confirmation), suivez `SECURITY.md`.

---

## Feuille de route

| Track | Description | Cible |
|-------|-------------|-------|
| G1 | Audit WCAG 2.1 AA + remédiation (Forge + Pilot UI) | Avant Forge/Pilot v1 |
| G2 | Assistant de configuration vocal (premier démarrage Forge + Pilot) | Forge/Pilot v1 |
| G3 | Conformité NAC3 sur chaque page de documentation | Lancement NAC3 v2.2 |
| G4 | Version audio (.mp3) de chaque guide | NAC3 v2.3 |
| G5 | Tutoriel conversationnel sur yujin.app/learn | NAC3 v2.3 |
| G6 | Version en langage simplifié des guides principaux | NAC3 v2.3 |
| G7 | Tests de fumée lecteur d'écran dans HUMAN_OK_CHECKLIST | Lancement NAC3 v2.2 |
| G8 | Programme bêta avec de vrais utilisateurs en situation de handicap | Avant Forge/Pilot v1 |
| G9 | Cette déclaration, publique + liée depuis chaque page | Lancement NAC3 v2.2 |
| G10 | Audit certifié externe | Avant Forge/Pilot 1.0 commercial |

---

## Pourquoi nous publions ceci

Deux raisons pratiques au-delà de l'éthique :

1. **L'EU Accessibility Act (EAA)** est entré en vigueur en juin 2025 pour
   les services B2C. Les applications construites avec Forge sont conformes
   à NAC3 par défaut et arrivent plus proches de la conformité EAA que
   leurs concurrents.
2. **Les poursuites judiciaires ADA Title III aux États-Unis concernant les
   applications web** ont augmenté de 320 % d'une année sur l'autre.
   Les acheteurs en entreprise y sont sensibles. La posture de conformité
   NAC3 + Yujin réduit leur exposition juridique.

NAC3 n'est pas un « standard ouvert avec l'accessibilité en bonus ». NAC3
est « le seul contrat d'automatisation web généraliste nativement conçu
pour l'accessibilité ». Nous le maintiendrons ainsi.

---

## Voir aussi

- [SPEC.md](../SPEC.md) -- le contrat canonique.
- [HUMAN_OK_CHECKLIST.md](HUMAN_OK_CHECKLIST.md) -- inclut
  la section de tests de fumée pour lecteurs d'écran.
- [SECURITY.md](../SECURITY.md) -- modèle de sécurité, inclut
  les problématiques liées aux AT.

## Licence

Ce document est sous licence Apache-2.0. Les implémentations auxquelles
il s'engage sont MIT (runtime) / Apache-2.0 (spec) / propriétaire (Forge,
Pilot).

---

*This is a machine translation of the canonical English
version at `/nac-spec/docs/ACCESSIBILITY.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
