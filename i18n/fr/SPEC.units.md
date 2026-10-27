<!-- nac3-translation-store
locale: fr
source: SPEC.md
source_version: 2.5.1
pass_date: 2026-10-27
engine: anthropic/claude-opus-5 (Yujin Forge)
-->

<!-- u 5e3e86e7f989 | 1 NAC3 -- Native Agent Contract | heading -->
# NAC3 -- Native Agent Contract

<!-- u 5e88280f4232 | 1 NAC3 -- Native Agent Contract | prose -->
**Version :** 2.5.1 (stable -- la surface v2.5 complète : narrate, context+tree, expect+diff)
**Statut :** Version stable. Le dist-tag npm `latest` pointe ici ; la section 9.1 énonce ce que cela garantit et ce qu'une préversion ne garantit pas. Ce document énonce sa version en exactement un endroit, la ligne ci-dessus. Les RFC publiés et leurs preuves de Couche 2 + Couche 3 sont listés dans `README.md` et `runtime/CHANGELOG.md`.
**Licence :** Apache-2.0
**Éditeur :** Yujin (yujin.app)

<!-- u 0b1780790faf | 2 0. Purpose | heading -->
## 0. Objet

<!-- u 582895d698d2 | 2 0. Purpose | prose -->
NAC3 est un contrat entre les interfaces web et les agents qui les
pilotent. Parmi les agents : les exécuteurs vocaux, les intermédiaires
LLM, les robots RPA, les outils d'accessibilité et les exécuteurs de
tests end-to-end. Le contrat spécifie :

<!-- u 7c6c7f420b83 | 2 0. Purpose | prose -->
1. **Comment les éléments sont nommés** -- pour qu'un agent puisse
   demander « cliquer sur le bouton enregistrer » et résoudre cela
   vers un unique nœud du DOM.
2. **Comment les verbes s'appliquent** -- pour qu'un agent puisse
   appeler `NAC.click(id)`, `NAC.fill(id, value)`,
   `NAC.tab(plugin, key)`, etc., sans colle par application.
3. **Comment l'achèvement est signalé** -- pour qu'un agent sache
   quand une étape s'est terminée, avec une famille d'événements
   déterministe par rôle.
4. **Comment la provenance est préservée** -- pour qu'un système en
   aval puisse distinguer un vrai clic d'utilisateur d'un clic
   synthétisé.

<!-- u 878edf1e669e | 2 0. Purpose | prose -->
NAC3 ajoute une couche mince par-dessus le framework avec lequel vous
rendez déjà. Il ne remplace ni ARIA, ni React, ni Vue, ni votre design
system.

<!-- u c5107b92723f | 3 1. Roles | heading -->
## 1. Rôles

<!-- u b4f9560e4b2f | 3 1. Roles | prose -->
Tout élément du DOM pertinent pour un agent porte `data-nac-role`. Les
rôles canoniques sont :

<!-- u dfae9890f1ae | 3 1. Roles | prose -->
| Rôle | Signification | Exemple |
|------|---------|---------|
| `plugin` | Un module d'interface autonome (une page, un panneau, un ensemble de widgets). | `<article data-nac-plugin="invoice">` |
| `section` | Un repère à l'intérieur d'un plugin (en-tête, corps, pied, barre latérale). | `<section data-nac-role="section">` |
| `region` | Une zone nommable à l'intérieur d'une section (un groupe de cartes, une liste de résultats). | `<div data-nac-role="region">` |
| `action` | Un widget cliquable qui déclenche un verbe (bouton, lien-bouton). | `<button data-nac-role="action" data-nac-action="save">` |
| `field` | Une entrée que l'utilisateur saisit ou bascule (texte, nombre, case à cocher, radio, date, fichier). | `<input data-nac-role="field">` |
| `option` | Une option sélectionnable dans un champ (enfant de combobox / select / groupe de radios). | `<li data-nac-role="option">` |
| `tab` | Un sélecteur de panneau commutable. **Obligatoire quand `data-nac-id` correspond à `^tab\.`** | `<button data-nac-role="tab" data-nac-id="tab.lines">` |
| `breadcrumb-item` | Un saut du fil d'Ariane. | `<a data-nac-role="breadcrumb-item">` |
| `accordion-toggle` | Un contrôle de dépliage/repliage. | `<button data-nac-role="accordion-toggle">` |
| `step` | Un indicateur d'étape d'assistant. | `<li data-nac-role="step">` |
| `pagination-item` | Un contrôle de saut de page dans une liste paginée. | `<button data-nac-role="pagination-item">` |
| `confirm-button` | Un bouton confirmer/annuler dans une boîte de dialogue de confirmation. | `<button data-nac-role="confirm-button">` |
| `sort-control` | Un en-tête de colonne qui trie. | `<th data-nac-role="sort-control">` |
| `filter-control` | Un déclencheur de filtre de colonne. | `<button data-nac-role="filter-control">` |
| `data-table` | L'hôte d'un tableau de données (depuis 2.1). | `<table data-nac-role="data-table">` |
| `navigation` | Une région de navigation servant de repère. **Ce n'est pas un onglet.** | `<nav data-nac-role="navigation">` |
| `confirm-dialog` | La modale d'une demande de confirmation. | `<div data-nac-role="confirm-dialog">` |
| `draggable` | Un élément que l'utilisateur peut saisir et déplacer (depuis 1.6.2). | `<li data-nac-role="draggable">` |
| `drop-target` | Un endroit où un `draggable` peut être déposé (depuis 1.6.2). | `<ul data-nac-role="drop-target">` |
| `button` | **Toléré, non recommandé.** Un bouton hérité qui doit seulement être cliquable, sans contrat d'action. Le runtime le traite comme `action`. Préférez `action` avec un `data-nac-action` explicite. | `<button data-nac-role="button">` |

<!-- u b08cd46560d8 | 3 1. Roles | prose -->
Les rôles absents de cette liste sont réservés pour un usage futur. Un
runtime NAC-strict DEVRAIT rejeter les rôles inconnus au moment de
l'enregistrement (v2.2). Un runtime NAC-permissive PEUT traiter les
rôles inconnus comme `action` par compatibilité ascendante (le
comportement par défaut en v1.9 et v2.0).

<!-- u 4252e24a246a | 3 1. Roles | prose -->
Ce tableau est la liste normative, et il est publié comme donnée : le
catalogue lisible par machine à `api/latest/contract.json` porte tous
les rôles que le runtime de référence accepte, chacun marqué par
`declared_in_spec_table` pour que les deux listes puissent être
comparées sans lire de prose. Elles concordent à la v2.5. Toute
divergence future est visible dans ce marqueur plutôt que cachée dans
une différence d'opinion entre un document et une implémentation.

<!-- u ae2acf06f5be | 4 2. Names | heading -->
## 2. Noms

<!-- u d732bc7953d1 | 4 2. Names | prose -->
Tout élément résoluble par un agent porte `data-nac-id`. L'id est :

<!-- u 4984c2cad541 | 4 2. Names | prose -->
- **Un chemin pointé** (par exemple `deals.list.row.42.actions.delete`).
  Les points séparent des niveaux sémantiques ; le runtime ne les
  interprète pas, mais les humains et les LLM si.
- **Unique globalement dans la portée d'un `data-nac-plugin`.** Deux
  plugins différents PEUVENT partager un id ; le runtime résout par le
  couple `(plugin, id)`.
- **Stable entre les rendus successifs.** Les frameworks qui produisent
  un nouvel id à chaque rendu (hachages aléatoires, compteurs
  d'instance) cassent le contrat.
- **Stable entre les refontes de l'interface.** Un bouton passe de la
  barre d'outils à un menu déroulant ; son id DOIT rester le même.

<!-- u 889014ee5ece | 4 2. Names | prose -->
Préfixes d'id réservés (depuis 2.1) :

<!-- u 1c4cc568753b | 4 2. Names | prose -->
| Préfixe | Réservé pour |
|--------|--------------|
| `tab.` | Boutons d'onglet. Le rôle DOIT être `tab`. |
| `modal.` | Éléments de portée modale. Le rôle est celui du widget feuille. |
| `field.` | Forme abrégée d'un champ de formulaire. Le rôle DOIT être `field` ou `option`. |
| `confirm.` | Boîtes de dialogue de confirmation. |

<!-- u 2a54888e0697 | 5 3. Verbs | heading -->
## 3. Verbes

<!-- u d70d8aad531c | 5 3. Verbs | prose -->
Un élément avec `data-nac-role="action"` PEUT porter
`data-nac-action="<verb>"` nommant ce qu'il fait. Le verbe est un
identifiant libre en snake-case convenu entre l'hôte et l'agent.
Verbes courants :

<!-- u 746c48370f66 | 5 3. Verbs | prose -->
`save`, `cancel`, `submit`, `delete`, `edit`, `view`, `create`,
`approve`, `reject`, `send`, `download`, `upload`, `refresh`,
`expand`, `collapse`, `open`, `close`, `add_row`, `remove_row`.

<!-- u 956edf53a876 | 5 3. Verbs | prose -->
`NAC.click_by_verb(plugin, verb)` résout un verbe vers l'unique action
sous ce plugin et clique dessus. Plusieurs actions partageant le même
verbe sous un même plugin est une erreur de manifeste (lint :
`duplicate_verb`).

<!-- u 28e680935920 | 6 4. Manifest | heading -->
## 4. Manifeste

<!-- u 6b623deee5e0 | 6 4. Manifest | prose -->
Tout plugin PEUT enregistrer un manifeste via :

<!-- u d0d1394734ea | 6 4. Manifest | prose -->
Le manifeste est la source de vérité côté agent. Un intermédiaire LLM
qui décide que « l'utilisateur a dit "guardar" » consulte le manifeste
du plugin, y trouve le verbe `save` et émet
`NAC.click_by_verb('invoice', 'save')`.

<!-- u a6be4d566708 | 7 4.1 Required fields | heading -->
### 4.1 Champs obligatoires

<!-- u d190057894b0 | 7 4.1 Required fields | prose -->
- `plugin_slug` -- correspond au `data-nac-plugin` de l'élément hôte.
- `nac_version` -- la version de NAC3 avec laquelle ce manifeste
  prétend être conforme. Le runtime rejette les manifestes qui
  revendiquent une version supérieure à la sienne.

<!-- u 58cac67a09e6 | 8 4.2 Optional fields | heading -->
### 4.2 Champs facultatifs

<!-- u 87ea0145c2ce | 8 4.2 Optional fields | prose -->
- `elements[]` -- le catalogue des widgets nommés. Chaque entrée DOIT
  avoir `id` et `role`.
- `tabs[]` -- un tableau de premier niveau distinct, pour les onglets.
  Équivaut à des entrées de `elements[]` avec `role:'tab'`. Les deux
  formes sont valides.
- `fields[]`, `actions[]`, `kpis[]`, `data_tables[]` -- des
  sous-collections typées ; même sémantique que `elements[]` filtré par
  rôle. Les démos choisissent la forme la plus lisible pour un humain.

<!-- u 3a8b6f4f8129 | 9 4.3 i18n | heading -->
### 4.3 i18n

<!-- u 6a665e6998c7 | 9 4.3 i18n | prose -->
Tout `label_i18n` DOIT couvrir les 10 locales de NAC3 :

<!-- u fa9df7559758 | 9 4.3 i18n | prose -->
`i18n_strict: 'permissive'` sur `NAC.autoRegister.watch()` autorise une
couverture partielle pendant une migration brownfield ; les manifestes
de production devraient livrer les 10 locales.

<!-- u 672b32007192 | 10 4.3.1 What the ten locales are a requirement ON | heading -->
#### 4.3.1 Sur quoi porte l'exigence des dix locales

<!-- u e01d2e357587 | 10 4.3.1 What the ten locales are a requirement ON | prose -->
L'exigence ci-dessus porte sur le **manifeste de l'adoptant** : la
table `label_i18n` qu'un agent lit pour nommer un élément dans la
langue de l'utilisateur. Elle ne porte PAS sur la langue de ce
document, et rien dans NAC3 n'oblige une implémentation à publier sa
propre documentation en dix langues.

<!-- u 6345c3141c02 | 11 4.3.2 Normative language of this specification | heading -->
#### 4.3.2 Langue normative de cette spécification

<!-- u 0496b01c0221 | 11 4.3.2 Normative language of this specification | prose -->
Le texte normatif de NAC3 est l'**anglais** : le `SPEC.md` à la racine
du dépôt de la spécification, rendu à
`https://yujin.app/nac-spec/SPEC.html`.

<!-- u 82cce4eb7161 | 11 4.3.2 Normative language of this specification | prose -->
La spécification est aussi publiée sous forme de traductions
automatiques dans `i18n/<locale>/SPEC.md`. Ces traductions sont **non
normatives**. Chacune est partielle et chacune est figée à la révision
source que sa propre bannière déclare ; la bannière est obligatoire, et
une traduction publiée sans bannière est un défaut de la publication,
pas de la traduction. Lorsqu'une traduction et le texte anglais
divergent, c'est le texte anglais qui fait foi, et une revendication de
conformité est une revendication face au texte anglais.

<!-- u a168e1e445ba | 12 5. Public API | heading -->
## 5. API publique

<!-- u e99a6820076b | 13 5.1 Imperative | heading -->
### 5.1 Impérative

<!-- u 935555476ddb | 14 5.1.1 Conformance helper (v2.2) | heading -->
### 5.1.1 Aide à la conformité (v2.2)

<!-- u 61773eab5781 | 14 5.1.1 Conformance helper (v2.2) | prose -->
`NAC.bindAction(el, handler, ctx)` est la façon conforme à la
spécification de brancher un gestionnaire de clic. Il émet
`nac:action:succeeded` (ou `:failed`) automatiquement après l'exécution
du gestionnaire (synchrone, exception ou Promise). Il renvoie une
fonction de détachement. Utilisez-le au lieu d'un
`addEventListener('click', ...)` brut dès que l'hôte le permet ; le code
brownfield peut continuer à émettre l'événement à la main comme avant.

<!-- u f3cb221e90bf | 15 5.1.3 Field editor (v2.3) | heading -->
### 5.1.3 Éditeur de champ (v2.3)

<!-- u d53a2b25eb60 | 15 5.1.3 Field editor (v2.3) | prose -->
`NAC.edit_field(nac_id)` ouvre une modale qui permet à une personne (ou
à un agent en son nom) de modifier n'importe quel champ texte avec des
outils de style traitement de texte :

<!-- u 7bdd9e99f71e | 15 5.1.3 Field editor (v2.3) | prose -->
La modale s'enregistre sous `plugin_slug='nac_editor'` avec ces verbes
appelables depuis NAC3 :

<!-- u 223097f9e322 | 15 5.1.3 Field editor (v2.3) | prose -->
| Verbe | Effet |
|------|--------|
| `select_word` | sélectionner le mot à l'emplacement du curseur |
| `select_sentence` | sélectionner la phrase à l'emplacement du curseur |
| `select_all` | ctrl-A à l'intérieur de l'éditeur |
| `replace` | remplacer la sélection par le texte fourni |
| `delete_selection` | supprimer la sélection courante |
| `ai_correct_syntax` | POSTer la valeur courante vers l'intermédiaire LLM avec l'invite système "fix grammar + spelling, return only fixed text" ; remplacer la valeur par la réponse |
| `save` | réécrire dans le champ source, dispatcher les événements input et change, fermer |
| `cancel` | abandonner, fermer |

<!-- u 9b5784a95c17 | 15 5.1.3 Field editor (v2.3) | prose -->
Échap ferme (annule). Ctrl/Cmd+Entrée enregistre. Un clic sur le fond
de la surcouche annule.

<!-- u 4a9ebc2b57dd | 15 5.1.3 Field editor (v2.3) | prose -->
La section 13 de la spécification formalisera le contrat en v2.3 ; le
runtime v2.2 livre une implémentation de référence fonctionnelle pour
que les adoptants puissent la brancher dès aujourd'hui. Disponible sur
n'importe quel champ via :

<!-- u 8aff4d81ab57 | 16 5.1.4 Action payload + invoke (v2.3) | heading -->
### 5.1.4 Charge utile d'action + invoke (v2.3)

<!-- u 8dbd703fb6af | 16 5.1.4 Action payload + invoke (v2.3) | prose -->
Les actions de NAC v2.2 sont du type clic-et-c'est-parti : un agent
déclenche `NAC.click(id)` ou `NAC.click_by_verb(plugin, verb)` et
l'hôte fait ce qu'il fait. Cela marche pour les actions de verbe et
d'état (`save`, `cancel`, `submit`, `delete`) mais s'effondre quand une
action a besoin de **données** venant de l'agent -- `utter(text)`,
`search(query)`, `send_message(body)`, `upload(file)`,
`schedule(date)`, `translate(text, target_lang)`. L'hôte n'a aucun
moyen de recevoir la charge utile de l'agent via un clic synthétique.

<!-- u 121175aff245 | 16 5.1.4 Action payload + invoke (v2.3) | prose -->
La v2.3 comble ce manque. Le contrat est additif : les verbes de type
clic continuent de fonctionner sans changement.

<!-- u 1e70a9ba51ec | 16 5.1.4 Action payload + invoke (v2.3) | prose -->
`NAC.invoke` dispatche un `CustomEvent` `nac:action:requested` sur
l'élément hôte (il remonte jusqu'à document) avec :

<!-- u af505024f97e | 16 5.1.4 Action payload + invoke (v2.3) | prose -->
L'hôte écoute `nac:action:requested`, traite la charge utile et émet
`nac:action:succeeded` (ou `nac:action:failed`) avec le même
`request_id` dans le détail. Le runtime corrèle par `request_id` et
résout la Promise de l'agent.

<!-- u abc54909999b | 16 5.1.4 Action payload + invoke (v2.3) | prose -->
Le délai par défaut est de **30 secondes** (contre 5 s pour le clic).
On le change avec `opts.timeout`. À l'expiration, la Promise est
rejetée avec `NacError('timeout', ...)`. Comme pour le clic, une
expiration signifie un véritable échec : l'appelant DOIT la traiter
comme tel, sauf s'il a la preuve de l'effet par un autre canal.

<!-- u f20ea060f5a1 | 16 5.1.4 Action payload + invoke (v2.3) | prose -->
`NAC.utter(id, opts)` est le raccourci ergonomique pour le verbe à
charge utile le plus courant. Il équivaut à :

<!-- u 494cdb0b8183 | 17 Manifest declaration | heading -->
#### Déclaration dans le manifeste

<!-- u 237fe9674ed4 | 17 Manifest declaration | prose -->
Une action qui porte une charge utile déclare le schéma de cette charge
dans son entrée de manifeste, pour la traçabilité et pour l'outillage :

<!-- u 6332c86c203d | 17 Manifest declaration | prose -->
`payload_schema` est **informatif en v2.5**, et le runtime de référence
ne le lit pas du tout : le champ est accepté dans un manifeste,
transporté dans `NAC.manifest()`, et jamais validé contre quoi que ce
soit. `NAC.STRICT_VALIDATION` -- dont la valeur par défaut est bien
passée à `true` en 2.3.0 -- ne couvre que les constats de rôle de
manifeste et de DOM ; il n'a jamais couvert les charges utiles. Donc un
agent NE DOIT PAS supposer qu'une charge utile a été vérifiée parce
qu'un schéma a été déclaré : aujourd'hui la seule validation qui a lieu
est celle que l'agent fait avant d'envoyer.

<!-- u 5f7dd2251b4c | 17 Manifest declaration | prose -->
Les schémas sont volontairement simples (un sous-ensemble à la forme de
JSON-Schema) pour qu'un runtime puisse valider sans embarquer un
validateur JSON-Schema complet, et cela reste l'intention de conception
pour le jour où l'exigence sera appliquée.

<!-- u 5ca132eea4a7 | 17 Manifest declaration | prose -->
Une révision antérieure de cette section promettait, pour la version
2.4, de formaliser la grammaire du schéma et d'en faire une exigence
par défaut. **Cela n'est pas arrivé en 2.4 et ne l'est pas davantage à
la 2.5.** La phrase est retirée plutôt que redatée : une promesse avec
un numéro de version accolé, laissée en place passé cette version, se
lit pour un agent comme une capacité sur laquelle il peut compter.
Formaliser la grammaire et brancher l'exigence est suivi comme question
ouverte à la section 13, où elle figure comme ouverte et sans date.

<!-- u a8a904fe4f7c | 18 Disabled-state semantics (v2.3 hotfix from alpha.2) | heading -->
#### Sémantique de l'état désactivé (correctif v2.3 issu d'alpha.2)

<!-- u 1c4abe1b856c | 18 Disabled-state semantics (v2.3 hotfix from alpha.2) | prose -->
`NAC.invoke` ne rejette PAS lorsque l'élément cible porte `disabled` ou
`aria-disabled='true'`. L'attribut HTML `disabled` est un garde-fou de
clic côté interface ; `invoke` est une requête logique porteuse de
charge utile, pas un clic synthétique. Les hôtes qui ont besoin de
refuser un invoke selon l'état de l'interface DOIVENT le faire dans
leur écouteur de `nac:action:requested` et émettre
`nac:action:failed` avec un code d'erreur qui veut dire quelque chose.

<!-- u 6840d6a4d6c1 | 18 Disabled-state semantics (v2.3 hotfix from alpha.2) | prose -->
`NAC.click`, en revanche, rejette TOUJOURS sur les éléments désactivés
(la sémantique du clic est préservée). Couverture de tests :
`runtime/test/v23-invoke.mjs` T7/T8/T9.

<!-- u 81d52460e217 | 19 Conformance: hosts that support invoke MUST | heading -->
#### Conformité : les hôtes qui prennent en charge invoke DOIVENT

<!-- u 55f1c3270fad | 19 Conformance: hosts that support invoke MUST | prose -->
1. Déclarer `actions[].payload_schema` dans l'entrée du manifeste.
2. Écouter `nac:action:requested` (ou utiliser un écouteur générique
   qui filtre par `detail.action_id` + `detail.verb`).
3. Émettre `nac:action:succeeded` -- avec `detail.request_id` renvoyé
   à l'identique -- après traitement, ou `nac:action:failed` (avec le
   code dans `detail.error`) en cas d'échec.
4. NE JAMAIS émettre un événement `:succeeded` avec un `request_id`
   qu'ils n'ont pas reçu (cela évite le croisement entre invocations
   concurrentes).

<!-- u baa88e13de62 | 19 Conformance: hosts that support invoke MUST | prose -->
Les hôtes qui ne prennent PAS en charge invoke continuent de
fonctionner normalement avec `NAC.click()` et `NAC.click_by_verb()`.
Les agents qui appellent `NAC.invoke()` contre un hôte sans entrée
`actions[].payload_schema` recevront quand même un `request_id`, mais
le runtime ne peut pas garantir la livraison ; le délai expire au bout
de 30 s.

<!-- u eeaad94068b6 | 20 Why this matters | heading -->
#### Pourquoi c'est important

<!-- u 282e3ea6a073 | 20 Why this matters | prose -->
La surface agentique complète cesse d'être « une liste de boutons » et
devient « une liste de boutons + des entrées structurées ». Une
annonce vocale devient appelable par NAC.invoke. Une barre de recherche
devient appelable par NAC.invoke. Un envoi de fichier devient appelable
par NAC.invoke. Même protocole, même provenance, même sémantique
d'accusé de réception.

<!-- u 828f3eb13a49 | 20 Why this matters | prose -->
Le premier adoptant de référence est **Atlas Pro** : son élément
`atlas_pro_ad.mic` déclare à la fois le verbe `listen` (clic seul,
existant) et `utter` (porteur de charge utile). La même boucle
conversationnelle `/parse` + `/tts` pilote dans les deux cas ; les
agents qui ont la reconnaissance vocale appellent `listen`, ceux qui
ont leur propre modèle de langue appellent `utter`.

<!-- u 3e2476dc9b6d | 21 Forward modalities (anticipated, no spec change require | heading -->
#### Modalités à venir (anticipées, sans changement de spécification)

<!-- u 96e747f48094 | 21 Forward modalities (anticipated, no spec change require | prose -->
`invoke` est volontairement agnostique de la modalité, pour que de
futures familles d'entrée se branchent sans casser le contrat :

<!-- u 7b40b2227261 | 21 Forward modalities (anticipated, no spec change require | prose -->
| Modalité | Verbe (esquisse)      | Charge utile (esquisse)                          |
|----------|-----------------------|--------------------------------------------------|
| Texte    | `utter`               | `{text, lang?}`                                  |
| Recherche | `search`             | `{query, scope?, limit?}`                        |
| Fichier  | `upload`              | `{filename, mime, data_url \| stream_id}`        |
| Image    | `analyze_image`       | `{image_url \| data_url, prompt?}`               |
| Vidéo    | `analyze_stream`      | `{stream_url, frame_window_ms?, return?}`        |
| Agenda   | `schedule`            | `{datetime, duration_min, attendees?}`           |
| Code     | `apply_diff`          | `{file_path, unified_diff}`                      |
| Voix     | `transcribe`          | `{audio_url \| data_url, lang?}`                 |

<!-- u 93d49eb65964 | 21 Forward modalities (anticipated, no spec change require | prose -->
Chaque modalité suit le même protocole d'événements
`nac:action:requested` -> `nac:action:succeeded` / `:failed`, la même
corrélation par `request_id`, la même sémantique de délai. Le runtime
reste petit ; le vocabulaire de verbes grandit par convention entre
hôtes et agents. Des raccourcis ergonomiques (`NAC.utter`,
`NAC.search`, `NAC.watch`, etc.) peuvent être ajoutés plus tard sans
rien respécifier, parce que chacun est une enveloppe mince autour
d'`invoke`.

<!-- u 0b074c9e1737 | 22 5.1.5 Shadow DOM resolution -- open roots (v2.3) | heading -->
### 5.1.5 Résolution dans le shadow DOM -- racines ouvertes (v2.3)

<!-- u 1636464273f9 | 22 5.1.5 Shadow DOM resolution -- open roots (v2.3) | prose -->
Le runtime résout les références `data-nac-id` à travers les racines
shadow ouvertes, de façon récursive. Une page peut monter des Web
Components avec `attachShadow({mode:'open'})`, poser des attributs
`data-nac-*` sur des éléments à l'intérieur de l'arbre shadow, et
n'importe quel appelant NAC3 (`NAC.click`, `NAC.fill`, `NAC.invoke`,
etc.) résout la cible de façon transparente.

<!-- u b3a1385f2a5d | 23 Resolution algorithm | heading -->
#### Algorithme de résolution

<!-- u 9b00de664df3 | 23 Resolution algorithm | prose -->
Pour un sélecteur `S` (typiquement `[data-nac-id="..."]`) face à une
racine `R` (typiquement `document`) :

<!-- u 5f20e7f1e3d3 | 23 Resolution algorithm | prose -->
1. `R.querySelector(S)` -> si non nul, renvoyer immédiatement.
2. Pour chaque descendant `el` de `R` :
   - Si `el.shadowRoot` est non nul (c'est-à-dire une racine shadow
     ouverte) : récursion avec `R := el.shadowRoot`, profondeur +1.
   - Sinon, si `el.nac3` est un objet exposant une méthode `query`,
     déléguer (voir la section 5.1.6).
3. La récursion est **plafonnée à 10 niveaux de profondeur**. Les
   cibles plus profondes que 10 sont inatteignables ; l'appelant reçoit
   `code='not_found'`. Le plafond existe pour empêcher les parcours
   pathologiques ; en pratique aucune base de code en production
   n'imbrique plus de 3-4 niveaux de shadow.
4. Le parcours suit l'ordre du DOM en largeur : les frères avant les
   shadows imbriqués. La première correspondance l'emporte.

<!-- u bde7cd44c2f1 | 24 Event propagation | heading -->
#### Propagation des événements

<!-- u 872114c02287 | 24 Event propagation | prose -->
Les événements émis par des hôtes à l'intérieur de racines shadow
DOIVENT positionner `composed: true` pour que les écouteurs au niveau
du document les reçoivent. Le runtime NAC3 émet déjà tous ses propres
événements avec `composed:true` ; le code hôte qui émet des événements
`nac:*` à la main est responsable de la même chose. Sans
`composed:true` l'événement s'arrête à la frontière du shadow et la
machinerie de corrélation du runtime ne le voit jamais.

<!-- u 4fd85059ee08 | 25 Author responsibility | heading -->
#### Responsabilité de l'auteur du composant

<!-- u fa8b14bc2a42 | 25 Author responsibility | prose -->
L'auteur du composant doit :

<!-- u 29626dc95548 | 25 Author responsibility | prose -->
1. Poser `data-nac-id`, `data-nac-role`, `data-nac-action` sur les
   éléments opérables à l'intérieur de la racine shadow.
2. Positionner `composed:true` sur tout événement personnalisé que
   l'hôte émet pour signaler un contrat NAC3
   (`nac:action:succeeded`, `nac:field:changed`, etc.).
3. Éviter `<slot>` pour les éléments qui doivent rester isolés dans le
   shadow -- les nœuds placés dans un slot vivent dans le light DOM et
   y sont résolus.

<!-- u 818fc31bb7f1 | 25 Author responsibility | prose -->
Pour les racines shadow ouvertes, aucune indication dans le manifeste
ni aucune activation du runtime n'est nécessaire ; la résolution est
automatique.

<!-- u 465f7ae635af | 26 Reference implementation | heading -->
#### Implémentation de référence

<!-- u 2a8c8ecad562 | 26 Reference implementation | prose -->
Le runtime de référence expose deux aides internes,
`_deepQuery(selector, root)` et `_deepQueryAll(selector, root)`, qui
effectuent le parcours. Les aides publiques `NAC.click`, `NAC.fill`,
`NAC.invoke`, `NAC.describe`, etc., passent toutes par les variantes
profondes.

<!-- u cce9bcee3ad4 | 27 Demos and tests | heading -->
#### Démos et tests

<!-- u 3d3ef999b0ae | 27 Demos and tests | prose -->
- `example-v23-shadow-open.php` -- démos de shadow ouvert imbriqué sur
  1, 2 et 3 niveaux.
- `runtime/test/v23-shadow.mjs` T1-T3, T10 -- couverture unitaire, y
  compris le plafond de profondeur.

<!-- u 27cadaa47199 | 28 5.1.6 Shadow DOM resolution -- closed roots, voluntary  | heading -->
### 5.1.6 Résolution dans le shadow DOM -- racines fermées, exposition volontaire (v2.3)

<!-- u e1bdc1f1cb70 | 28 5.1.6 Shadow DOM resolution -- closed roots, voluntary  | prose -->
Les racines shadow fermées (`attachShadow({mode:'closed'})`) sont
opaques depuis l'extérieur du code de l'auteur du composant : c'est une
frontière de sécurité du navigateur, pas une décision de NAC3. NAC3 ne
peut pas atteindre l'intérieur à moins que l'auteur du composant
n'expose volontairement une surface interrogeable via le contrat
ci-dessous.

<!-- u cc5e4a5b830e | 29 The `el.nac3` interface contract | heading -->
#### Le contrat d'interface `el.nac3`

<!-- u 76ac0cb03f1e | 29 The `el.nac3` interface contract | prose -->
Un élément personnalisé PEUT exposer un objet d'interface sur son hôte,
via un accesseur nommé `nac3` :

<!-- u 9d8b08a63d0f | 29 The `el.nac3` interface contract | prose -->
Les composants adhèrent en implémentant l'accesseur. Les composants qui
n'adhèrent PAS restent inaccessibles aux appelants NAC3 (leurs
internes restent privés, comme le navigateur l'entend).

<!-- u d267ac2618bd | 30 Resolution semantics | heading -->
#### Sémantique de la résolution

<!-- u d5f238d3820d | 30 Resolution semantics | prose -->
Pendant `_deepQuery(selector)`, pour chaque élément visité `el` avec
`el.shadowRoot === null` :

<!-- u 3955816b33aa | 30 Resolution semantics | prose -->
1. Si `typeof el.nac3 === 'object'` et que `el.nac3.query` est une
   fonction, le runtime appelle `el.nac3.query(selector)` :
   - La valeur renvoyée est un Element -> résolu.
   - La valeur renvoyée est `null` -> pas de correspondance dans ce
     shadow.
   - La valeur renvoyée est autre chose -> émettre
     `nac:shadow_protocol_violation` (une fois par hôte) et passer.
   - Elle lève une exception -> émettre `nac:shadow_blocked` (motif
     `'exposure_threw'`, une fois par hôte) et passer.
2. Sinon, si `el.hasAttribute('data-nac-shadow') === true` et que la
   valeur de l'attribut est `'closed'` ET qu'aucune interface `nac3`
   n'est présente, le runtime émet `nac:shadow_blocked` (motif
   `'not_exposed'`, une fois par hôte). C'est l'adhésion de l'auteur au
   signal de débogage « je suis un composant délibérément fermé ».
3. Sinon : l'élément est traité comme un élément normal du light DOM,
   sans racine shadow.

<!-- u 75f86a587f3d | 31 Error event detail shapes | heading -->
#### Forme du détail des événements d'erreur

<!-- u d89cbc6658d3 | 31 Error event detail shapes | prose -->
Détail de `nac:shadow_blocked` :

<!-- u c01abbbc2bac | 31 Error event detail shapes | prose -->
Détail de `nac:shadow_protocol_violation` :

<!-- u cdc7ee5d5dc1 | 31 Error event detail shapes | prose -->
Les deux événements remontent (`bubbles: true`) et traversent les
frontières du shadow (`composed: true`). La déduplication est par hôte,
via un WeakSet tenu par le runtime ; un même hôte émet chaque événement
**au plus une fois par chargement de page**.

<!-- u 5fd63d2eb19d | 32 Why voluntary | heading -->
#### Pourquoi c'est volontaire

<!-- u 64413da3b9b6 | 32 Why voluntary | prose -->
L'opacité du shadow fermé est imposée par le navigateur. Même si NAC3
définissait un mécanisme non volontaire, le navigateur l'empêcherait.
L'exposition volontaire laisse à l'auteur du composant le contrôle
total de l'allure de sa surface publique pour les agents.

<!-- u 374ef204681b | 32 Why voluntary | prose -->
Le coût est une adhésion composant par composant ; le bénéfice est que
les agents conformes à NAC3 fonctionnent face à des design systems
comportant des composants à shadow fermé (Salesforce Lightning,
certains composants de GitHub Primer, widgets sensibles côté sécurité)
sans code d'adaptation par composant.

<!-- u 08aa8d40de06 | 33 Demos and tests | prose -->
- `example-v23-shadow-closed.php` -- le cas positif
  (`<todo-card-closed-exposed>`) et le cas négatif
  (`<todo-card-closed-blind>`) côte à côte, avec panneaux de verdict +
  journal d'événements en direct.
- `runtime/test/v23-shadow.mjs` T4-T9 -- couverture unitaire de chaque
  famille d'événements d'erreur, plus la sémantique de déduplication.
- `guides/SHADOW_DOM_CLOSED.md` -- guide pour l'auteur de composants.

<!-- u 230b5b4555fa | 34 5.1.7 Auth-aware capabilities (v2.3) | heading -->
### 5.1.7 Capacités conscientes de l'autorisation (v2.3)

<!-- u eb36568e63b4 | 34 5.1.7 Auth-aware capabilities (v2.3) | prose -->
NAC3 v2.3 permet au manifeste de déclarer, action par action, les
capacités exigées, et de bloquer ainsi `NAC.click` et `NAC.invoke`
avant le dispatch. L'agent reçoit un refus rapide
(`code='capability_required'`) au lieu d'un aller-retour qui échoue
côté serveur.

<!-- u 3394e13a69f2 | 35 Manifest declaration | prose -->
Une exigence de capacité s'attache au niveau de l'élément ou au niveau
du verbe. Si les deux sont présentes, celle du verbe l'emporte.

<!-- u ed181c92022d | 35 Manifest declaration | prose -->
Pour une sémantique de ET logique (« l'utilisateur a besoin de TOUTES
ces capacités »), déclarez chacune via des actions bloquées séparées,
ou composez côté hôte dans l'écouteur de `nac:action:requested`.

<!-- u 41895cfbb955 | 36 Public API | heading -->
#### API publique

<!-- u 5c22e765201e | 36 Public API | prose -->
`setCapabilities` remplace l'ensemble entier (à utiliser à la connexion
ou au renouvellement de session). `grantCapability` /
`revokeCapability` sont incrémentaux. `userCapabilities` renvoie un
tableau instantané de l'état. `setCapabilities(null)` vide l'ensemble.

<!-- u 519e43ca0c04 | 36 Public API | prose -->
Les hôtes appellent cela chaque fois que le rôle de l'utilisateur
change. L'ensemble vit dans le runtime ; aucun rechargement de
manifeste n'est nécessaire.

<!-- u 4147b564fd7d | 37 Gate semantics | heading -->
#### Sémantique du verrou

<!-- u b7a3a617e58d | 37 Gate semantics | prose -->
Avant le dispatch, `NAC.click(id)` et `NAC.invoke(id, payload)`
cherchent l'entrée de manifeste correspondante (élément + verbe),
lisent `requires_capability` et appellent `_hasCapability` :

<!-- u 55539817baee | 37 Gate semantics | prose -->
- Aucune exigence déclarée -> autorisé.
- Exigence déclarée et l'ensemble courant la satisfait -> autorisé.
- Exigence déclarée et l'ensemble courant ne la satisfait PAS -> rejet
  avec `NacError('capability_required', ...)` ET émission de
  `nac:command:rejected` avec
  `detail.reason='capability_required'`.

<!-- u 61bc21f3c289 | 37 Gate semantics | prose -->
Le verrou s'exécute APRÈS les vérifications `not_found` / `disabled` /
`hidden` sur `click`, pour que l'échec le plus spécifique remonte. Sur
`invoke`, le verrou s'exécute avant que l'événement de requête ne
part (l'hôte ne voit jamais une tentative non autorisée).

<!-- u 03badbc3eb0d | 38 Why this matters | prose -->
Sans le verrou, un agent qui appelle `NAC.click('finance.delete')` ou
bien réussit (aucun verrou d'autorisation -> faille de sécurité) ou
bien échoue côté serveur avec un 403 plusieurs secondes plus tard. Avec
le verrou, l'agent apprend de façon synchrone qu'il lui manque la
capacité et peut réagir comme il faut (demander un autre parcours,
demander une élévation de droits, exposer la contrainte à
l'utilisateur).

<!-- u e2ef7786fa19 | 38 Why this matters | prose -->
Cela complète -- et ne remplace pas -- l'autorisation côté serveur. Les
hôtes DOIVENT continuer d'appliquer les permissions sur le serveur. Le
verrou côté client est une optimisation d'expérience et un signal au
niveau de l'intention, pas une frontière de sécurité.

<!-- u cda6b9e803c0 | 39 Demos and tests | prose -->
- `runtime/test/v23-capabilities.mjs` -- 17 assertions couvrant la
  lecture et l'écriture de l'ensemble, l'octroi et la révocation, le
  verrou du clic, le verrou de l'invoke, la résolution entre niveau de
  verbe et niveau d'élément, la sémantique de OU logique, le vidage par
  null, le rejet des entrées invalides, et la régression des actions
  sans verrou.

<!-- u 79530c72b823 | 40 5.1.2 Strict validation flag (v2.2; default-flipped in  | heading -->
### 5.1.2 Drapeau de validation stricte (v2.2 ; valeur par défaut inversée en v2.3)

<!-- u 7206e583b3eb | 40 5.1.2 Strict validation flag (v2.2; default-flipped in  | prose -->
`NAC.STRICT_VALIDATION` (booléen). Quand il vaut `true`,
`NAC.register()` lève une `Error` avec `code='strict_validation'` et un
tableau `findings` dans l'un de ces cas :

<!-- u 1f68e4a109ee | 40 5.1.2 Strict validation flag (v2.2; default-flipped in  | prose -->
- `manifest_role_unknown` -- le rôle de l'entrée est hors de
  l'ensemble canonique.
- `tab_id_manifest_role_drift` -- l'id correspond à `^tab\.` mais le
  rôle n'est pas `'tab'`.
- `manifest_dom_role_mismatch` -- le `data-nac-role` de l'élément monté
  dans le DOM diffère du rôle de l'entrée du manifeste.

<!-- u c981b4852469 | 40 5.1.2 Strict validation flag (v2.2; default-flipped in  | prose -->
**Valeur par défaut :**

<!-- u 1aa996774f91 | 40 5.1.2 Strict validation flag (v2.2; default-flipped in  | prose -->
- **v2.2.x :** `false` (avertissement seulement). Les adoptants
  avaient besoin d'une fenêtre de migration.
- **v2.3.x :** **`true`** (lève). La fenêtre de migration s'est fermée
  avec la ligne v2.2. Les adoptants dont les manifestes sont chargés de
  dérives s'en retirent en posant `NAC.STRICT_VALIDATION = false` AVANT
  tout appel à `register()`.
- **v3.0 :** le drapeau est retiré (strict est le seul mode).

<!-- u cf1e1b799422 | 40 5.1.2 Strict validation flag (v2.2; default-flipped in  | prose -->
Voir `guides/MIGRATION_v2.2_to_v2.3.md` pour le mode opératoire de
nettoyage des constats de dérive.

<!-- u cdd2e2a2034f | 40 5.1.2 Strict validation flag (v2.2; default-flipped in  | prose -->
Toutes les méthodes asynchrones rejettent avec un `NacError` dont le
`code` est l'un de ceux-ci :

<!-- u 7cdfcbe3b161 | 40 5.1.2 Strict validation flag (v2.2; default-flipped in  | prose -->
- `not_found` -- l'élément, le rôle ou le verbe nommé n'est pas dans le
  DOM.
- `invalid` -- la forme de l'argument est incorrecte.
- `disabled` -- l'élément porte `disabled` ou `aria-disabled='true'`
  (`NAC.click` seulement ; `NAC.invoke` ne vérifie plus depuis le
  correctif v2.3, voir la section 5.1.4).
- `hidden` -- l'élément est hors écran, ou porte `aria-hidden='true'`,
  ou est de dimension nulle.
- `capability_required` -- le manifeste a déclaré
  `requires_capability` et l'ensemble courant de
  `NAC.userCapabilities()` ne le satisfait pas (v2.3, voir la section
  5.1.7).
- `timeout` -- l'effet a été dispatché mais l'événement d'accusé de
  conformité n'est pas arrivé en 5 secondes (30 secondes pour
  `invoke`). **Une expiration signifie un véritable échec** : le
  gestionnaire a peut-être gelé, l'accusé n'a peut-être jamais été
  branché, il y a peut-être eu une course réseau. Les appelants DOIVENT
  traiter l'expiration comme un échec, sauf s'ils ont la preuve de
  l'effet par un autre canal.

<!-- u d50c9290e353 | 41 5.2 Introspection | heading -->
### 5.2 Introspection

<!-- u 68e75bf70e68 | 42 5.3 Data tables (since 2.1) | heading -->
### 5.3 Tableaux de données (depuis 2.1)

<!-- u e835e9440f25 | 42 5.3 Data tables (since 2.1) | prose -->
Les primitives de tableau de données ne font PAS partie du runtime
central (`js/nac.js` / le `nac.mjs` de `@nac3/runtime`). Elles sont
livrées dans le module d'extensions brownfield
`js/nac-v2-extensions.js` (publié comme `@nac3/runtime/extensions`),
qui les accroche au même objet `window.NAC` après son chargement.
Chargez le module d'extensions après le runtime central pour obtenir la
surface `dt_*` :

<!-- u 1702f2abb7ea | 42 5.3 Data tables (since 2.1) | prose -->
Les méthodes ci-dessous ne sont présentes que lorsque le module
d'extensions est chargé ; les appeler sur un runtime réduit au noyau ne
fait rien / renvoie `undefined`.

<!-- u ebe9fa027ecd | 42 5.3 Data tables (since 2.1) | prose -->
Un tableau de données a un `subkind` :

<!-- u 731086aa49b1 | 42 5.3 Data tables (since 2.1) | prose -->
- `collection` -- des lignes ordonnées, avec validation
  transactionnelle facultative. Utilisé pour les lignes de facture, les
  articles d'un panier, les entrées de journal.
- `matrix` -- une grille ligne x colonne où chaque cellule porte une
  valeur. Utilisé pour les matrices de permissions, les grilles
  d'horaires.
- `matrix-singletree` -- une matrice où chaque ligne se replie en un
  arbre (rare).

<!-- u bf57d7617b5a | 43 5.4 Strict resolution + disambiguation (v2.4) | heading -->
### 5.4 Résolution stricte + désambiguïsation (v2.4)

<!-- u 5ce8d66447ea | 43 5.4 Strict resolution + disambiguation (v2.4) | prose -->
NAC3 v2.4 rend **stricte** la résolution d'id, de verbe, de
qualificateur et de libellé. Les verbes qui résolvent une requête vers
un unique élément du DOM -- `click_by_verb`, `tab` (forme à un
argument) et `tab_by_label` -- ne devinent plus. Quand une requête
résout vers zéro candidat ou vers plus d'un, le runtime lève un
`NacError` portant la liste des candidats ET émet un événement
`nac:disambiguation_requested`, au lieu de dispatcher en silence vers
le premier à-peu-près.

<!-- u 1360c72f2adf | 43 5.4 Strict resolution + disambiguation (v2.4) | prose -->
C'est l'invariant de **zéro dommage silencieux**. Il existe pour les
logiciels d'assistance et les agents, où un dispatch silencieux vers le
mauvais élément sans voie de récupération est un bloqueur de sécurité.
L'ancien comportement indulgent d'avant la 2.4 -- un repli par
`indexOf` sur sous-chaîne qui résolvait vers le premier à-peu-près --
est supprimé.

<!-- u 61c212ab5c75 | 43 5.4 Strict resolution + disambiguation (v2.4) | prose -->
> Compatibilité ascendante : la v2.4 est un changement de
> *comportement du contrat*. Les chemins de code qui fournissaient déjà
> des arguments sans ambiguïté continuent de fonctionner tels quels.
> Les chemins de code qui dépendaient du repli indulgent par `indexOf`
> pour résoudre vers le premier à-peu-près vont désormais lever une
> exception -- c'est voulu.

<!-- u 9ded25436c09 | 44 5.4.1 Strict qualifier matching (`click_by_verb`) | heading -->
#### 5.4.1 Correspondance stricte du qualificateur (`click_by_verb`)

<!-- u 03e301b58109 | 44 5.4.1 Strict qualifier matching (`click_by_verb`) | prose -->
`click_by_verb(plugin, verb, opts?)` choisit parmi les nœuds du DOM qui
partagent `data-nac-action="<verb>"`. Lorsque `opts.qualifier` (une
chaîne) est fourni, un élément correspond **seulement** si son
`data-nac-id` satisfait :

<!-- u 3c202d4daa0e | 44 5.4.1 Strict qualifier matching (`click_by_verb`) | prose -->
C'est-à-dire : égalité exacte de l'id, ou un suffixe ancré après un
séparateur `__`. **Il n'y a pas de repli par sous-chaîne**. Un
qualificateur qui n'est qu'une sous-chaîne d'un id (non égal, pas un
`__suffix` ancré) ne correspond PAS.

<!-- u a814e14491fc | 44 5.4.1 Strict qualifier matching (`click_by_verb`) | prose -->
- 0 correspondance -> lève `NacError('no_matching_instance', ...)`.
- exactement 1 correspondance -> résout et clique.
- >1 correspondances -> lève `NacError('ambiguous_qualifier', ...)`.

<!-- u 4218e75d95da | 44 5.4.1 Strict qualifier matching (`click_by_verb`) | prose -->
`opts.qualifier_ordinal` (un nombre) choisit par position parmi tous
les éléments du DOM qui partagent le verbe, en contournant la
correspondance de qualificateur.

<!-- u d62dc6b56ca3 | 45 5.4.2 Strict id resolution (`tab`) | heading -->
#### 5.4.2 Résolution stricte d'id (`tab`)

<!-- u 1a464a4756f3 | 45 5.4.2 Strict id resolution (`tab`) | prose -->
Forme à un argument de `tab(plugin, id)` : une correspondance exacte de
`data-nac-id` dans le DOM l'emporte. Sinon, le runtime cherche les
instances dont l'id commence par `id + "__"` :

<!-- u 2cae0a8b088f | 45 5.4.2 Strict id resolution (`tab`) | prose -->
- 0 instance qualifiée et aucun id exact -> `no_matching_instance`.
- exactement 1 -> résout.
- >1 -> `ambiguous_tab` (passez l'id qualifié complet).

<!-- u 9dd62e535c05 | 46 5.4.3 Strict label resolution (`tab_by_label`) | heading -->
#### 5.4.3 Résolution stricte par libellé (`tab_by_label`)

<!-- u 6bd19a3dd928 | 46 5.4.3 Strict label resolution (`tab_by_label`) | prose -->
`tab_by_label(plugin, label)` résout un libellé lisible par un humain
vers un onglet, en essayant, dans cet ordre : correspondance exacte
avec le libellé du manifeste, correspondance floue ou par sous-chaîne
dans le manifeste, correspondance exacte avec le texte du DOM,
correspondance floue avec le texte du DOM. Si l'un de ces niveaux donne
plus d'une correspondance, il lève
`NacError('ambiguous_label', ...)` ; si aucun niveau ne correspond, il
lève `NacError('not_found', ...)`. Le champ `reason` de l'événement
émis note quel niveau était ambigu (`ambiguous_label_exact`,
`ambiguous_label_fuzzy`, `ambiguous_label_exact_dom`,
`ambiguous_label_fuzzy_dom` ou `no_matching_label`).

<!-- u 4da1ef43f342 | 47 5.4.4 Error codes | heading -->
#### 5.4.4 Codes d'erreur

<!-- u b30b09fb4fb9 | 47 5.4.4 Error codes | prose -->
| `err.code` | Levé par | Signification |
|------------|-----------|---------|
| `no_matching_instance` | `click_by_verb` (qualificateur), `tab` | aucun élément ne correspond au qualificateur / à l'id |
| `ambiguous_qualifier`  | `click_by_verb` | plus de 1 élément correspond au qualificateur |
| `ambiguous_tab`        | `tab`           | plus de 1 instance qualifiée `id__` correspond |
| `ambiguous_label`      | `tab_by_label`  | plus de 1 onglet correspond au libellé (à n'importe quel niveau) |
| `not_found`            | `tab_by_label`  | aucun onglet ne correspond au libellé |

<!-- u 2eacef367ba7 | 48 5.4.5 The `err.candidates` shape | heading -->
#### 5.4.5 La forme de `err.candidates`

<!-- u d9e50d2513fb | 48 5.4.5 The `err.candidates` shape | prose -->
Toute erreur de désambiguïsation porte un tableau `candidates`. Chaque
candidat est exactement :

<!-- u bc9f0faf0ccb | 48 5.4.5 The `err.candidates` shape | prose -->
`nac_id` est le `data-nac-id` de l'élément. `label` est résolu en
préférant `aria-label`, puis le `textContent` nettoyé (tronqué à 120
caractères), puis en se rabattant sur le `data-nac-id`. La liste est
validée contre le DOM : elle nomme les vrais éléments parmi lesquels
l'appelant peut choisir. `NacError` fusionne `candidates` dans l'`Error`
levée, de sorte que `err.code`, `err.message` et `err.candidates` sont
tous renseignés.

<!-- u 652f14fc6baa | 49 5.4.6 The `nac:disambiguation_requested` event | heading -->
#### 5.4.6 L'événement `nac:disambiguation_requested`

<!-- u 595fd49c77a0 | 49 5.4.6 The `nac:disambiguation_requested` event | prose -->
Chaque fois qu'un appel de résolution stricte échoue (aucune
correspondance OU trop de correspondances), le runtime dispatche un
`CustomEvent` `nac:disambiguation_requested` sur `document` *en plus
de* lever l'exception. L'émission est au mieux : si le dispatch échoue,
le runtime lève quand même.

<!-- u e258631d1e18 | 50 5.4.7 How a caller disambiguates | heading -->
#### 5.4.7 Comment un appelant désambiguïse

<!-- u 4277d2b1e5ff | 50 5.4.7 How a caller disambiguates | prose -->
Avec la liste des candidats en main (depuis `err.candidates` ou
`event.detail.candidates`), l'appelant en choisit un et redispatche par
l'une de ces voies :

<!-- u 874e8bd6dc4a | 50 5.4.7 How a caller disambiguates | prose -->
1. **Le `nac_id` complet** -- `NAC.click(candidate.nac_id)`. C'est la
   voie canonique de récupération : le candidat porte déjà l'id exact.
2. **Le `__suffix` ancré** -- passez à `click_by_verb` le suffixe exact
   de l'instance comme qualificateur.
3. **`opts.qualifier_ordinal`** -- sélection par position parmi les
   éléments qui partagent le verbe (dans l'ordre du DOM).

<!-- u 830efd33c855 | 50 5.4.7 How a caller disambiguates | prose -->
La référence travaillée est `example-v24-disambiguation.php` ; le
contrat est couvert par `runtime/test/stage2-disambiguation.mjs` et
`runtime/test/stage7-strict-resolution.mjs`.

<!-- u 9a85added5a4 | 51 6. Events | heading -->
## 6. Événements

<!-- u 3a66eff18a73 | 51 6. Events | prose -->
Toute action émet un événement d'achèvement déterministe. Le
`NAC.click()` du runtime guette cet événement et se résout quand il
part.

<!-- u 97fd131e3759 | 51 6. Events | prose -->
| Rôle | Événement de succès | Événement d'échec |
|------|---------------|---------------|
| `action` | `nac:action:succeeded` | `nac:action:failed` |
| `field` | `nac:field:changed` | -- |
| `option` | `nac:field:changed` | -- |
| `tab` | `nac:tab:activated` | -- |
| `breadcrumb-item` | `nac:breadcrumb:navigated` | -- |
| `accordion-toggle` | `nac:accordion:expanded` / `:collapsed` | -- |
| `step` | `nac:step:advanced` | -- |
| `pagination-item` | `nac:table:page_changed` | -- |
| `confirm-button` | `nac:confirm:resolved` / `:cancelled` | -- |
| `sort-control` | `nac:table:sort_changed` | -- |
| `filter-control` | `nac:table:filter_changed` | -- |

<!-- u d6c1e7b3214b | 52 6.1 Event detail shape | heading -->
### 6.1 Forme du détail de l'événement

<!-- u 963657156129 | 52 6.1 Event detail shape | prose -->
Le détail de tout événement porte le champ d'id canonique, plus
`plugin` :

<!-- u 1c1a163a8447 | 53 6.2 Emitting from a host handler | heading -->
### 6.2 Émettre depuis un gestionnaire de l'hôte

<!-- u e16fdbe62bd6 | 53 6.2 Emitting from a host handler | prose -->
Un gestionnaire de clic DOIT émettre l'événement de succès
correspondant après son effet synchrone :

<!-- u 495a09517d94 | 53 6.2 Emitting from a host handler | prose -->
Si le travail est asynchrone, émettez après la résolution. Si le
travail échoue, émettez `nac:action:failed` avec
`{detail: {plugin, action_id, error: <message>}}`.

<!-- u 6edbabccfab8 | 53 6.2 Emitting from a host handler | prose -->
Le runtime v2.2 fournira `NAC.bindAction(el, handler, ctx)`, qui
enveloppe `addEventListener` et émet automatiquement.

<!-- u 7160fc51611b | 54 6.3 Why not use the click event itself? | heading -->
### 6.3 Pourquoi ne pas utiliser l'événement de clic lui-même ?

<!-- u 1baa670f9949 | 54 6.3 Why not use the click event itself? | prose -->
Un événement `click` du DOM part avant l'exécution du gestionnaire. Le
contrat de NAC3 a besoin de savoir quand **l'effet s'est terminé**, pas
quand le clic a commencé. D'où la famille d'événements distincte.

<!-- u 8c146906a8b5 | 55 7. Provenance | heading -->
## 7. Provenance

<!-- u cda1f0fe1033 | 56 7.1 isTrusted | heading -->
### 7.1 isTrusted

<!-- u ef353b56420d | 56 7.1 isTrusted | prose -->
`event.isTrusted` vaut `true` pour les clics initiés par une personne
(vraie souris, vraie touche, activation par un lecteur d'écran) et
`false` pour les clics synthétisés (`element.click()`, le dispatchEvent
d'un MouseEvent construit à la main, l'automatisation).

<!-- u a62b76a788d4 | 56 7.1 isTrusted | prose -->
NAC3 DOIT exposer cela via `event.detail.is_trusted` dans l'événement
de succès. Les hôtes qui exécutent des actions sensibles côté sécurité
(paiement, suppression) PEUVENT exiger `is_trusted === true` et
refuser les clics synthétiques. La démo de référence
`example-v20-full.php` comprend une paire de boutons
(`v20_panel.istrusted_real` et `v20_panel.istrusted_fake`) qui
démontre la distinction.

<!-- u 99edfdf1816d | 57 7.2 HMAC-signed manifests | heading -->
### 7.2 Manifestes signés par HMAC

<!-- u eaddcc19c68b | 57 7.2 HMAC-signed manifests | prose -->
Un manifeste PEUT porter un bloc `provenance` :

<!-- u a1e273bf09d9 | 57 7.2 HMAC-signed manifests | prose -->
Le runtime calcule le HMAC attendu sur une sérialisation stable du
manifeste (signature exclue) et rejette les manifestes dont la
signature ne correspond pas. Utilisé par les déploiements
multi-locataires pour empêcher un locataire d'usurper le manifeste d'un
autre.

<!-- u 42eadfcaf1d4 | 58 7.3 Threat model | heading -->
### 7.3 Modèle de menace

<!-- u e7fda825444a | 58 7.3 Threat model | prose -->
Voir `SECURITY.md` pour le modèle de menace complet. Version courte :

<!-- u e1934c89ce6b | 58 7.3 Threat model | prose -->
- NAC3 n'authentifie pas l'**utilisateur**. C'est le travail de votre
  couche d'authentification.
- NAC3 authentifie le **manifeste** (HMAC).
- NAC3 distingue les vrais clics des clics synthétisés (isTrusted),
  pour qu'un hôte puisse refuser les seconds sur les verbes sensibles.
- NAC3 ne protège pas contre un agent malveillant qui tourne avec
  l'accès de l'utilisateur. Un tel agent peut tout ce que
  l'utilisateur peut.

<!-- u 4f92477e8bbc | 59 8. Conformance levels | heading -->
## 8. Niveaux de conformité

<!-- u f5b96249fe7b | 59 8. Conformance levels | prose -->
Un niveau s'écrit **NAC3 Conformance Level 1**, **2** ou **3**. Le nom
d'un niveau n'est pas le nom du protocole : un validateur, un rapport
ou une revendication de conformité DOIT citer un niveau par
l'identifiant `nac3-conformance-level-<1|2|3>` publié dans
`api/latest/levels.json`, jamais par un nom d'affichage. La section 8.1
consigne les noms que ces niveaux portaient avant la 2.5.0.

<!-- u d73a01bfbec7 | 59 8. Conformance levels | prose -->
Une page est au **NAC3 Conformance Level 1** si :

<!-- u b8d1b21abef0 | 59 8. Conformance levels | prose -->
- Tout widget cliquable qu'un agent devrait pouvoir manœuvrer porte
  `data-nac-id` et `data-nac-role`.
- Tout élément `data-nac-role="action"` déclenche
  `nac:action:succeeded` après son effet.
- La page enregistre au moins un manifeste de plugin via
  `NAC.register()`.
- `NAC.click(id)` fonctionne pour chaque id annoncé.

<!-- u 8fea90259550 | 59 8. Conformance levels | prose -->
Une page est au **NAC3 Conformance Level 2** si, en plus :

<!-- u 548ba93fb7d9 | 59 8. Conformance levels | prose -->
- Elle enregistre les tableaux `tabs[]`, `fields[]`, `actions[]`
  explicitement dans son manifeste (non déduits du DOM).
- Elle fournit `label_i18n` couvrant les 10 locales de NAC3 pour chaque
  libellé visible par l'utilisateur.
- Elle implémente les primitives brownfield de la v2.0 : arbre de
  portée, capture éphémère, autoRegister.watch.
- Elle passe `NAC.validate_global({probe: false})` avec zéro constat de
  sévérité `error`.

<!-- u f9a2abaf6fbe | 59 8. Conformance levels | prose -->
Une page est au **NAC3 Conformance Level 3** si, en plus :

<!-- u 31ae71ba8c81 | 59 8. Conformance levels | prose -->
- Elle porte des manifestes signés par HMAC.
- Elle distingue `isTrusted` pour les verbes sensibles côté sécurité.
- Elle passe `NAC.validate_global({probe: true})` avec zéro constat.

<!-- u c76a5cbd0d90 | 59 8. Conformance levels | prose -->
La ligne de commande du paquet NPM (`npx nac3 validate <url>`) indique
le niveau le plus élevé qu'une page atteint. (Le paquet livre les
binaires `nac3` et `nac` ; les deux mènent à la même ligne de
commande.)

<!-- u 45c18bc89776 | 60 8.1 Historical level names (v2.5) | heading -->
### 8.1 Noms historiques des niveaux (v2.5)

<!-- u e497f12e1675 | 60 8.1 Historical level names (v2.5) | prose -->
Avant la 2.5.0 les trois niveaux s'écrivaient `NAC-1`, `NAC-2` et
`NAC-3`. Ces noms sont à un tiret du nom du protocole, `NAC3`, de sorte
que « cette page est conforme NAC-3 » ne pouvait pas être distingué de
« cette page implémente NAC3 », et un agent à qui l'on demandait de
rapporter un niveau n'avait aucune chaîne sans ambiguïté à rapporter.

<!-- u 4da6a2838062 | 60 8.1 Historical level names (v2.5) | prose -->
Les anciens noms restent lisibles comme alias historiques :
`api/latest/levels.json` publie chacun comme `legacy_display_name` à
côté du niveau auquel il appartenait, pour qu'un document écrit avant
la 2.5.0 puisse encore être rattaché à un niveau. Ils ne sont PAS
normatifs. Le texte nouveau, la sortie des validateurs et les
revendications de conformité utilisent le numéro de niveau ou
l'identifiant publié.

<!-- u 25cf5f341851 | 61 9. Versioning | heading -->
## 9. Versionnement

<!-- u f434370102cd | 61 9. Versioning | prose -->
NAC3 suit le semver :

<!-- u 21961e924493 | 61 9. Versioning | prose -->
- Incrément **majeur** : changement cassant de l'API publique ou des
  formats de transport. Les adoptants modifient du code.
- Incrément **mineur** : nouvelles fonctionnalités, compatibles avec
  l'existant. L'ancien code continue de fonctionner.
- Incrément de **correctif** : corrections de défauts, changements de
  documentation seulement.

<!-- u 354961fe88c7 | 61 9. Versioning | prose -->
Politique d'obsolescence : une fonctionnalité marquée `@deprecated`
dans la version `X.Y.0` n'est pas retirée avant `(X+1).0.0`. Les notes
de version documentent explicitement chaque retrait.

<!-- u 6040a078d2c9 | 61 9. Versioning | prose -->
La version du paquet NPM reflète la version de la spécification :
`@nac3/runtime@X.Y.Z` implémente NAC3 vX.Y, avec Z révisions de
correctif par-dessus. L'exemple est écrit avec des marqueurs à dessein :
une version concrète dans cette phrase devient obsolète à la version
suivante, et ce document portait `2.1.3` longtemps après que le paquet
avait avancé.

<!-- u db4793e191d0 | 62 9.1 Prereleases and dist-tags | heading -->
### 9.1 Préversions et dist-tags

<!-- u c525c183f446 | 62 9.1 Prereleases and dist-tags | prose -->
Une version avec une queue de préversion (`-alpha.N`, `-beta.N`,
`-rc.N`) **n'est pas** une version publiée de cette spécification. Elle
existe pour qu'un changement puisse être exercé avant d'être promis.

<!-- u 06f01c7dd1c2 | 62 9.1 Prereleases and dist-tags | prose -->
- **`latest` ne pointe jamais que vers une version stable.** Un
  `npm install @nac3/runtime` sans tag DOIT résoudre vers une version
  sans queue de préversion. Un adoptant qui installe la valeur par
  défaut ne reçoit jamais une préversion par accident.
- **Les préversions sont publiées sous leur propre dist-tag**
  (`alpha`, `beta`, `rc`). Y adhérer est explicite : `npm install
  @nac3/runtime@alpha`.
- **Rien dans une préversion n'est une promesse.** Toute surface
  introduite dans l'une d'elles peut changer ou disparaître avant la
  version stable qui la porte. Les garanties de stabilité de la section
  10 et les garanties de codes de constat de la section 12 commencent à
  la version stable.
- **Les préversions ne sont jamais dépubliées** et jamais réétiquetées
  en `latest` de façon rétroactive. La trace de ce qui a été publié
  reste lisible.

<!-- u 5ff3ab15b820 | 62 9.1 Prereleases and dist-tags | prose -->
La version autoritative du runtime de référence est la constante
`NAC.version` dans `js/nac.js`, et elle est publiée comme donnée :
`api/latest.json` porte un pointeur `stable` et un pointeur
`prerelease` distincts (l'un ou l'autre peut valoir `null`), et chaque
artefact publié porte son propre champ `channel`. Un consommateur qui
exige un contrat stable lit un champ et refuse, sans aucune chaîne de
version à analyser et sans aucun tag à croire.

<!-- u 5f55983494b3 | 63 10. Validators | heading -->
## 10. Validateurs

<!-- u 2f3408ca1b03 | 64 10.1 Runtime: `NAC.validate_global()` | heading -->
### 10.1 Runtime : `NAC.validate_global()`

<!-- u ace4de89e478 | 64 10.1 Runtime: `NAC.validate_global()` | prose -->
Parcourt le DOM vivant + les manifestes enregistrés et renvoie un
**objet de groupes nommés** : un groupe par condition, chacun un
tableau de constats. Depuis la 2.5.0 chaque constat de chaque groupe
porte `code` et `severity`, de sorte qu'une intégration de CI peut
bloquer sur un code sans analyser un message :

<!-- u ac96fbc7a1f3 | 64 10.1 Runtime: `NAC.validate_global()` | prose -->
Les cinq codes, leur sévérité et ce qu'il faut faire pour chacun sont
publiés comme donnée à `api/latest/findings.json`, sous
`global_buckets`. Les codes de constat sont stables d'une version de
correctif à l'autre ; de nouveaux codes seulement aux incréments
mineurs, et un code n'est jamais réutilisé pour une autre condition
(section 12, promesse 4).

<!-- u ab93934bfc7f | 64 10.1 Runtime: `NAC.validate_global()` | prose -->
**Les versions antérieures à la 2.5.0 n'attachaient aucun code à ces
groupes**, et cette section décrivait un tableau plat de constats que
le runtime de référence n'a jamais renvoyé (audit N-14, N-34).

<!-- u 656369a32729 | 64 10.1 Runtime: `NAC.validate_global()` | prose -->
**Changement de comportement en 2.5.0 (audit N-33).** Avant la 2.5.0
le collecteur derrière ce validateur ne lisait que les groupes hérités
du manifeste (`actions`, `fields`, `tabs`, `kpis`, `charts`, indexés
par `nac_id`) et jamais la forme canonique `elements: [{ id }]` de la
section 4. Face à un manifeste écrit de la manière documentée, il
rapportait donc `total_ids: 0`, listait chaque élément déclaré comme
orphelin, ne pouvait signaler ni un doublon, ni un id non monté, ni une
violation de convention, et répondait pourtant `ok: true`. Les deux
formes sont lues à partir de la 2.5.0. Un hôte qui bloquait sa CI sur
`has_errors` peut voir son premier échec après la mise à jour : c'est
un vrai positif qui a toujours été là, pas une règle nouvelle.

<!-- u 8cb460800177 | 65 10.2 CLI: `npx nac3 validate <target>` | heading -->
### 10.2 CLI : `npx nac3 validate <target>`

<!-- u 5f1634cd35ad | 65 10.2 CLI: `npx nac3 validate <target>` | prose -->
Enveloppe `validate_global` plus un lint statique de cohérence entre
HTML et manifeste. Codes de sortie :

<!-- u 54affecdb5b9 | 65 10.2 CLI: `npx nac3 validate <target>` | prose -->
- `0` -- aucun constat de sévérité >= au seuil configuré.
- `1` -- il y a des constats.
- `2` -- la cible elle-même n'a pas pu être chargée.

<!-- u 62c5dfe68407 | 65 10.2 CLI: `npx nac3 validate <target>` | prose -->
Utile en CI : `npx nac3 validate ./dist/index.html --severity=error`.
Le paquet expose la CLI sous deux noms de binaire, `nac3` et `nac` ;
utilisez celui qui n'entre pas en collision avec un autre outil de
votre PATH.

<!-- u 01fa36c8d26c | 66 11. The system around NAC3 | heading -->
## 11. Le système autour de NAC3

<!-- u 7ad464281bfd | 66 11. The system around NAC3 | prose -->
NAC3 est une couche de contrat. Pour transformer une page conforme à
NAC3 en application pilotée à la voix, il vous faut aussi :

<!-- u 10116f319016 | 66 11. The system around NAC3 | prose -->
1. **Une source de reconnaissance vocale** (le SpeechRecognition du
   navigateur, l'API Whisper, etc).
2. **Un intermédiaire LLM** qui prend le texte de l'utilisateur +
   l'instantané que `NAC.describe()` donne de la page + une indication
   d'i18n, et émet des actions structurées : `[{kind: 'click',
   nac_id: 'X'}, {kind: 'fill', nac_id: 'Y', value: 'Z'}]`. Voir
   `guides/LLM_WIRING.md`.
3. **Un client de chat** qui tient la conversation et dispatche les
   actions. La référence est `js/nac-chat-client.js`.
4. **Une sortie de synthèse vocale** pour les réponses parlées (le
   SpeechSynthesis du navigateur, ElevenLabs, etc).

<!-- u 400f6554acb4 | 66 11. The system around NAC3 | prose -->
NAC3 ne normalise que la forme d'entrée et de sortie de l'étape 2
(l'instantané de `NAC.describe()` + la forme des actions). Les étapes
1, 3 et 4 sont hors spécification ; vous composez ce que vous voulez.

<!-- u 9bd0d10006ac | 67 12. Stability guarantees | heading -->
## 12. Garanties de stabilité

<!-- u d448e3d3251d | 67 12. Stability guarantees | prose -->
Ce que cette spécification promet :

<!-- u 299877632664 | 67 12. Stability guarantees | prose -->
1. L'ensemble des rôles canoniques de la section 1 ne rétrécira pas. De
   nouveaux rôles PEUVENT être ajoutés dans les versions mineures.
2. La famille d'événements de la section 6 ne sera pas renommée. De
   nouveaux événements PEUVENT être ajoutés dans les versions mineures.
3. Les verbes de `NAC.click`, `NAC.fill`, etc., ne changeront pas de
   forme dans les versions mineures. De nouveaux champs facultatifs
   PEUVENT apparaître dans `opts`.
4. Les codes de constat de `validate_global` ne seront pas réutilisés
   pour des conditions différentes d'une version mineure à l'autre.
   Depuis la 2.5.0 chaque groupe de ce validateur porte un code, et
   tous sont publiés avec leur sévérité à
   `api/latest/findings.json` : comparez deux versions publiées et un
   code réutilisé est visible sans lire une seule source.

<!-- u 7401ca7e951e | 67 12. Stability guarantees | prose -->
Ce que cette spécification NE promet PAS :

<!-- u 0f44826d96f1 | 67 12. Stability guarantees | prose -->
1. La formulation exacte des messages d'erreur (ce sont des chaînes du
   catalogue i18n ; les localisations peuvent bouger).
2. La stratégie DOM pour trouver les éléments (`querySelector`
   aujourd'hui ; cela pourra devenir un index plus rapide plus tard).
3. La disposition interne du cache de manifestes. Traitez les
   manifestes comme en écriture seule côté hôte, et en lecture seule
   côté agent.

<!-- u a6934dd2b815 | 68 13. Open questions | heading -->
## 13. Questions ouvertes

<!-- u f9ce60b69c5c | 68 13. Open questions | prose -->
Elles sont suivies **ici**, dans cette section. Une révision antérieure
intitulait ceci « Questions ouvertes (suivies séparément) » et ne
disait jamais où était ce « séparément » ; il n'y avait aucun autre
registre. Une question qui aboutit à une décision quitte le tableau
ci-dessous et entre dans la section qu'elle affecte. Une question qui
devient une proposition concrète reçoit un RFC, et ceux-ci sont indexés
dans [`rfcs/README.md`](rfcs/README.md), le processus étant dans
[`CONTRIBUTING.md`](CONTRIBUTING.md).

<!-- u dcb4765e57ff | 68 13. Open questions | prose -->
Chaque ligne porte la version où elle a été évaluée pour la dernière
fois, pour qu'un lecteur distingue une question vivante d'une question
abandonnée. **Aucune ligne ne porte de version cible** : une promesse
datée qui dépasse sa date est pire qu'une promesse sans date, ce qui est
l'erreur que la section 5 commettait à propos de `payload_schema`.

<!-- u 5bc638bb20cd | 68 13. Open questions | prose -->
| Question | État | Dernière évaluation | Où cela en est |
|----------|-------|---------------|-----------------|
| `data-nac-role="navigation"` devrait-il jamais résoudre vers un onglet ? | **DÉCIDÉ : non** | v2.5 | Décidé en 2.2.0 et appliqué depuis : un id préfixé `tab.` avec le rôle `navigation` lève `tab_id_manifest_role_drift`, et avec `STRICT_VALIDATION` (par défaut `true` depuis la 2.3.0) `NAC.register` lève. `tab_by_label` ne résout les onglets qu'à partir de `m.tabs[]` et `elements[role=='tab']`. `navigation` est une région repère, jamais un panneau commutable. Voir les sections 1 et 10. |
| `NAC.click()` devrait-il accepter des ids relatifs (par exemple `'./save'`) ? | **OUVERTE, non implémentée** | v2.5 | Le résolveur fait correspondre `data-nac-id` exactement et borne par plugin : l'actif, ou celui de `opts.plugin`. Ce bornage couvre déjà le cas que la question demandait (`NAC.click('save', {plugin:'invoice'})`), donc la pression pour une syntaxe relative est faible et rien n'est en cours. La décider impliquerait d'ajouter une grammaire de chemins à la section 2, où les ids sont déclarés opaques pour le runtime. |
| Les manifestes devraient-ils prendre en charge l'héritage / l'extension entre plugins (un manifeste de base étendu par un locataire) ? | **OUVERTE, candidate pour la prochaine majeure** | v2.5 | Non implémentée. **Ne pas confondre avec la section 15**, le « contrat d'extension de plugin » : celui-ci est livré en v2.5 et c'est un mécanisme de routage vers le backend (`registerPlugin` / `call` / `read` / `subscribe`), pas de l'héritage de manifestes. La question ici porte sur un manifeste qui dérive d'un autre, ce qui touche aux règles d'unicité d'id de la section 2, raison pour laquelle elle est gardée pour une majeure. |
| L'exigence de `payload_schema` devrait-elle être formalisée et activée ? | **OUVERTE, sans date** | v2.5 | Déplacée ici depuis la section 5, qui la promettait pour la v2.4. Elle n'a pas atterri en v2.4 et n'a pas atterri jusqu'à la v2.5 ; le runtime de référence ne lit pas le champ. Voir la section 5 pour savoir exactement ce qui est validé et ce qui ne l'est pas aujourd'hui. |
| Les constats de `validate_global()` devraient-ils porter un code du catalogue publié ? | **DÉCIDÉ : oui, livré en 2.5.0** | v2.5 | Chaque élément de chaque groupe porte `code` + `severity`, de sorte que la promesse 4 de la section 12 couvre désormais un ensemble réel au lieu d'un ensemble vide. Les cinq codes sont publiés sous `global_buckets` dans `api/latest/findings.json`, et le générateur les LIT depuis un cas de test qui provoque chaque groupe, au lieu de les écrire à la main : la version précédente écrivait `code: null` pour un groupe qui portait un code depuis la 2.5.0 et publiait les deux affirmations dans le même fichier. Construire ce cas de test est aussi ce qui a trouvé l'audit N-33 : le validateur ne pouvait pas voir un manifeste écrit sous la forme canonique. Voir 10.1. |

<!-- u 1ba12333695c | 69 13.5 Governance | heading -->
## 13.5 Gouvernance

<!-- u 091136995f4a | 69 13.5 Governance | prose -->
NAC3 est aujourd'hui porté par Yujin. La spécification, la
documentation et le runtime de référence sont tous publiés sous
Apache-2.0. (Le runtime était étiqueté MIT à l'époque des deux dépôts,
avant la 2.5 ; il a été harmonisé en Apache-2.0 sur tous les artefacts
NAC3 lors de la consolidation du 2026-05-23. Voir `LICENSE` et
`runtime/LICENSE`.) Yujin s'engage à transférer NAC3 à une fondation
neutre (un groupe communautaire du W3C, la Linux Foundation, ou un
organisme industriel équivalent) si et quand l'adoption justifiera une
gouvernance neutre. En attendant, les changements de spécification
suivent le processus RFC documenté dans `CONTRIBUTING.md`, avec une
période de commentaire public d'au moins 14 jours pour tout changement
qui touche l'API publique ou les formats de transport.

<!-- u fd9fc738b52c | 69 13.5 Governance | prose -->
Pour les adoptants : la licence uniforme Apache-2.0 garantit que la
spécification et le runtime survivent à tout changement du statut
sociétaire de Yujin. Vous pouvez forker l'un ou l'autre, faire tourner
l'un ou l'autre et livrer l'un ou l'autre, aujourd'hui et après notre
disparition. Ce document consigne l'engagement pour que le chemin vers
cette survie soit explicite, et non implicite.

<!-- u 4d62e1227df1 | 70 14. Reference implementation | heading -->
## 14. Implémentation de référence

<!-- u 52d4fad55b7e | 70 14. Reference implementation | prose -->
L'implémentation canonique est le runtime de référence distribué sous
forme du paquet NPM `@nac3/runtime`. La source normative de la version
est la constante `NAC.version` du runtime lui-même, publiée comme
donnée à `api/latest.json` (voir la section 9.1). Cette section ne
répète volontairement pas un numéro de version : elle portait
`2.5.0-alpha.5` alors que le paquet avait déjà avancé, ce qui est la
même classe de défaut que les exemples périmés retirés des sections 5
et 9. Elle livre :

<!-- u 65f8174ff33b | 70 14. Reference implementation | prose -->
- `js/nac.js` -- le runtime central : l'API publique impérative + d'
  introspection de la section 5 (click/fill/select/tab,
  click_by_verb/tab_by_label, invoke/utter, edit_field,
  setCapabilities, syncPlugin, request_authority/confirm_action,
  registerPlugin/call/read/subscribe, narrate/context/tree,
  expect/diff, describe, validate_global, ...). Publié comme l'entrée
  `main`/`module`/`browser` du paquet (`dist/nac.mjs`).
- `js/nac-v2-extensions.js` -- les primitives brownfield + de tableau
  de données qui s'accrochent au même `window.NAC` après le chargement
  du noyau : arbre de portée, autoRegister, capture éphémère, HMAC,
  attestation d'isTrusted, catalogue i18n (`t`/`locale`), et toute la
  famille `registerDataTable` / `dt_*` des tableaux de données
  (section 5.3). Publié comme `@nac3/runtime/extensions`
  (`dist/nac-v2-extensions.mjs`). Le runtime central NE porte PAS la
  surface `dt_*` ; chargez ce module pour l'obtenir.
- `js/nac-chat-client.js` -- un client de chat de référence qui branche
  la voix + le LLM + le dispatcheur. Publié comme
  `@nac3/runtime/chat-client`.

<!-- u 3267a25cd9bb | 70 14. Reference implementation | prose -->
Le paquet expose aussi une CLI sous les noms de binaire `nac3` et `nac`
(`dist/cli.js`, section 10.2).

<!-- u ada8333c036b | 70 14. Reference implementation | prose -->
D'autres implémentations sont bienvenues (Python pour des exécuteurs
d'automatisation natifs, Rust pour des agents embarqués, etc).
L'autorité, c'est la spécification, pas le code JS.

<!-- u 4dc85a8e4ab3 | 71 15. Plugin extension contract -- canvas + API surfaces  | heading -->
## 15. Contrat d'extension de plugin -- surfaces canvas + API (v2.5)

<!-- u 7d116da9b14a | 71 15. Plugin extension contract -- canvas + API surfaces  | prose -->
Les sections 1-14 supposent que la surface pertinente pour l'agent est
le **DOM**. Tout élément adressable a un attribut `data-nac-id`, tout
verbe se déclenche par `el.click()`, toute lecture d'état vient de
`el.getAttribute(...)`. Cela marche pour les applications dont le
châssis ET le contenu vivent dans des nœuds du DOM.

<!-- u 0551bce3d392 | 71 15. Plugin extension contract -- canvas + API surfaces  | prose -->
Cela ne marche pas pour les applications dont une partie de la surface
est un **canvas** (LibreOffice / Collabora Online, Figma, Excalidraw,
Miro, tout éditeur WebGL maison). Le châssis peut rester du DOM (barres
d'outils, boîtes de dialogue), mais les commandes doivent souvent
passer par l'API publique de l'application elle-même (postMessage, SDK
de plugins, pont de script), et l'état peut n'être pas lisible du tout
depuis le DOM.

<!-- u 72264fb0f469 | 71 15. Plugin extension contract -- canvas + API surfaces  | prose -->
La v2.5 ajoute un petit ensemble de primitives qui permettent à un
plugin NAC3 de déclarer son propre contrat de routage vers de telles
surfaces. Le runtime reste agnostique de toute application
particulière : il apprend à parler à l'une d'elles uniquement en lisant
le manifeste du plugin.

<!-- u 6d9a90384f28 | 72 15.1 Why a new primitive set | heading -->
### 15.1 Pourquoi un nouvel ensemble de primitives

<!-- u a7e9cf90c978 | 72 15.1 Why a new primitive set | prose -->
Le `NAC.click(id)` qui ne connaît que le DOM ne peut pas :

<!-- u 38b34f7795c3 | 72 15.1 Why a new primitive set | prose -->
- Envoyer un postMessage `Send_UNO_Command` à une iframe Collabora en
  bac à sable.
- Appeler `figma.currentPage.selection = [...]` dans le bac à sable de
  plugins de Figma.
- Invoquer `excalidrawAPI.setElements(...)` sur une ref React.
- Lire si Gras est actif sur la sélection courante de Collabora (la
  barre d'outils le reflète ; le canvas le cache).

<!-- u 7495e48dfe8c | 72 15.1 Why a new primitive set | prose -->
Le correctif **n'est pas** d'étendre `NAC.click` avec des heuristiques
de détection de backend. Le correctif est d'ajouter un verbe explicite
et agnostique qui prend un slug de plugin et un chemin de verbe, et qui
laisse le manifeste du plugin déclarer comment ce verbe est routé.

<!-- u 641333576b18 | 73 15.2 The three primitives | heading -->
### 15.2 Les trois primitives

<!-- u 2eeaa810cab5 | 73 15.2 The three primitives | prose -->
- `registerPlugin(slug, manifest)` enregistre un plugin v2.5. Un même
  `slug` PEUT apparaître à la fois dans le registre des manifestes du
  DOM (section 5) et dans le registre des extensions v2.5 ; les deux
  coexistent. Les appels v2.5 ne résolvent que par le registre v2.5.
- `call` invoque un verbe déclaré. Le routage est choisi par le
  manifeste, pas par l'agent. Il se résout avec ce que le backend a
  renvoyé (souvent `undefined` / `{ok: true}`) ; il rejette avec
  `NacError` si le verbe est inconnu, si le backend échoue, ou si la
  forme de la réponse est invalide.
- `read` renvoie une valeur d'état déclarée. Le runtime parcourt la
  chaîne de replis de l'état dans l'ordre déclaré et renvoie la
  première source qui se résout ; il ne rejette que lorsque toutes les
  sources de la chaîne ont échoué.
- `subscribe` attache un écouteur à un événement déclaré. Il renvoie un
  identifiant que l'appelant passe à `unsubscribe` pour nettoyer. Les
  événements PEUVENT être adossés à une vraie source d'événements en
  amont ou synthétisés par interrogation périodique /
  MutationObserver -- le manifeste déclare lequel.

<!-- u da60503266ab | 73 15.2 The three primitives | prose -->
Les quatre fonctions sont asynchrones (elles renvoient une Promise)
sauf `unsubscribe`, qui est synchrone et idempotente.

<!-- u 3a61a03890f1 | 74 15.3 Plugin manifest shape | heading -->
### 15.3 Forme du manifeste de plugin

<!-- u 5420f520d0d4 | 74 15.3 Plugin manifest shape | prose -->
Les manifestes sont du JSON pur (pas de callbacks JS). Forge, Sumi et
tout outillage futur les génèrent comme donnée ; le runtime interprète
les noms de backend à partir d'un vocabulaire fixe.

<!-- u c81d6471a0ab | 74 15.3 Plugin manifest shape | prose -->
Les verbes et les événements ont **exactement une** liaison. L'état a
un **tableau ordonné** de liaisons : le runtime parcourt la chaîne dans
l'ordre et renvoie la première source qui s'est résolue avec succès.

<!-- u 673180462720 | 75 15.4 Backend vocabulary | heading -->
### 15.4 Vocabulaire des backends

<!-- u 1e544939bf9c | 75 15.4 Backend vocabulary | prose -->
| Type | Utilisé pour | Champs obligatoires |
|------|----------|-----------------|
| `postmessage` | Verbe : poster un message vers une iframe via `postMessage`. | `target` (sélecteur CSS de l'iframe destinataire), `message` (la chaîne MessageId), `values` (objet littéral interpolé avec les arguments), `values_from_args` (tableau facultatif de clés d'argument transmises telles quelles) |
| `postmessage-listen` | Événement : écouter un `MessageId` entrant précis sur `window.message`. | `source` (sélecteur CSS de l'iframe servant à filtrer l'origine ; si omis, toute origine est acceptée), `message` (le MessageId à faire correspondre), `extract` (le DSL d'extraction sur les données du message) |
| `sdk-call` | Verbe : appeler une fonction JS exposée globalement (par exemple un plugin Figma, l'API Excalidraw). | `path` (chemin pointé dans `window`, par exemple `figma.currentPage.selection`), `mode` (`assign` pour affecter la valeur des arguments au chemin, `invoke` pour l'appeler comme fonction avec l'objet d'arguments) |
| `script-bridge` | Verbe ou état : invoquer le pont de script d'une application (le `CallPythonScript` de Collabora, le pont UNO de LibreOffice, Google Apps Script). | `bridge` (un identifiant propre au backend, comme `collabora.python`), `script` (identifiant du script), `function` (nom de la fonction à exécuter), `args` (objet littéral interpolé avec les arguments de l'appel), `response_match` (pour un état : le MessageId de réponse à attendre), `timeout_ms` (facultatif, 5000 par défaut) |
| `dom-mirror` | État : lire depuis un élément du DOM dont l'attribut / la classe / le texte reflète un état interne du canvas (par exemple un bouton de barre d'outils mis en évidence quand sa mise en forme est active sur la sélection courante). | `selector` (sélecteur CSS à interroger), `extract` (le DSL d'extraction, voir 15.5) |
| `same-origin-window` | État : lire depuis `iframe.contentWindow.<path>` quand l'iframe est de même origine. Le runtime détecte l'origine croisée et passe au repli suivant. | `target` (sélecteur CSS de l'iframe), `path` (chemin pointé dans `contentWindow`) |
| `synthetic-mutation` | Événement : synthétiser un événement en observant les mutations du DOM sur une ou plusieurs sources d'état et en réémettant quand la valeur observée change. | `observe` (tableau de chemins d'état à surveiller ; le runtime appelle `read` sur chacun et les compare entre deux mutations), `throttle_ms` (facultatif, 100 par défaut) |
| `synthetic-poll` | Événement : synthétiser un événement en interrogeant périodiquement les sources d'état. | `observe` (tableau de chemins d'état), `interval_ms` (250 par défaut) |

<!-- u b3fb5326727c | 75 15.4 Backend vocabulary | prose -->
Chaque backend DOIT être implémenté par le runtime comme un dispatcheur
autonome (`dispatch(binding, args, context) -> Promise<value>`).
Ajouter un nouveau type de backend à la spécification exige d'incrémenter
la version de la spécification ; les runtimes qui ignorent les backends
inconnus DOIVENT rejeter les manifestes qui les déclarent (pas de saut
silencieux).

<!-- u 269f89fd3507 | 76 15.5 Extractor mini-DSL | heading -->
### 15.5 Mini-DSL d'extraction

<!-- u d4919abaffe4 | 76 15.5 Extractor mini-DSL | prose -->
Les backends d'état et le backend d'événement `postmessage-listen` ont
souvent besoin de prélever un champ dans un objet plus grand. Le
runtime livre un minuscule DSL déclaratif pour que les manifestes
restent du JSON pur :

<!-- u edfb3ecdcba7 | 76 15.5 Extractor mini-DSL | prose -->
| Syntaxe | Signification | Exemple d'entrée -> sortie |
|--------|---------|-------------------------|
| `field.path.to.value` | Parcours d'un chemin pointé. | `{a:{b:1}}` avec `a.b` -> `1` |
| `attribute:NAME` | DOM seulement : lire `el.getAttribute(NAME)`. | `<i data-x="hi">` avec `attribute:data-x` -> `'hi'` |
| `text` | DOM seulement : lire `el.textContent`. | `<span>hi</span>` avec `text` -> `'hi'` |
| `classList.contains:CLASS` | DOM seulement : `el.classList.contains(CLASS)` -> booléen. | `<button class="active">` avec `classList.contains:active` -> `true` |
| `value` | DOM seulement : lire `el.value`. | `<input value="x">` avec `value` -> `'x'` |
| `present` | DOM seulement : renvoie `true` si le sélecteur a résolu un élément, `false` sinon. | le sélecteur a correspondu -> `true` |

<!-- u c21d2cceb93f | 76 15.5 Extractor mini-DSL | prose -->
La composition n'est pas prise en charge en v2.5 ; un extracteur est
exactement l'une des lignes ci-dessus. Un manifeste qui a besoin d'une
transformation complexe déclare plutôt un `script-bridge`.

<!-- u 8eaa22faba63 | 77 15.6 Fallback chain semantics for `state` | heading -->
### 15.6 Sémantique de la chaîne de replis pour `state`

<!-- u c1e30df97123 | 77 15.6 Fallback chain semantics for `state` | prose -->
`state[path]` est un tableau de liaisons. `NAC.read(plugin, path)`
parcourt le tableau dans l'ordre. Pour chaque liaison :

<!-- u 9b9d10966d70 | 77 15.6 Fallback chain semantics for `state` | prose -->
1. Le runtime invoque le dispatcheur du backend.
2. Si le dispatcheur se résout avec une valeur (y compris `false`, `0`
   et la chaîne vide, mais PAS `undefined`), `read` renvoie cette
   valeur.
3. Si le dispatcheur rejette, ou se résout avec `undefined`, le runtime
   passe à la liaison suivante du tableau.
4. Si aucune liaison n'a produit de valeur, `read` rejette avec
   `NacError('state_unreadable', ...)`, dont `err.attempts: [...]`
   porte une entrée par backend tenté, avec `{backend, reason}`.

<!-- u 68f0476ca245 | 77 15.6 Fallback chain semantics for `state` | prose -->
Justification : la chaîne encode l'ordre de préférence de l'auteur du
manifeste. La source la plus rapide, la moins coûteuse et la plus
fraîche est déclarée en premier ; les replis se dégradent avec
élégance. Le runtime ne choisit jamais en silence une source
inférieure en premier.

<!-- u ffedb5b06a01 | 78 15.7 Provenance for synthetic actions | heading -->
### 15.7 Provenance des actions synthétiques

<!-- u bc6190f2e478 | 78 15.7 Provenance for synthetic actions | prose -->
Chaque dispatch de `NAC.call` émet un événement `nac:plugin:invoked`
sur `document` après le retour du backend. La charge du détail :

<!-- u b527bd4cadd8 | 78 15.7 Provenance for synthetic actions | prose -->
Même forme pour `nac:plugin:read` (après un `read`) et
`nac:plugin:event` (la réémission d'un événement synthétisé). `source`
vaut `'agent'` par défaut ; les hôtes qui enveloppent le runtime dans
une interface utilisateur PEUVENT le remplacer via le mécanisme
existant `NAC.set_source(...)` (section 7).

<!-- u 07f550e23dcf | 79 15.8 Worked example -- Collabora Writer | heading -->
### 15.8 Exemple travaillé -- Collabora Writer

<!-- u cae1093b9441 | 79 15.8 Worked example -- Collabora Writer | prose -->
L'agent appelle `NAC.call('collabora.writer', 'uno.Bold')` ; le runtime
route par le backend `postmessage` et poste `Send_UNO_Command` vers
l'iframe. Pour confirmer que l'effet a eu lieu (voir la section 17),
l'agent appelle
`await NAC.read('collabora.writer', 'selection.isBold')` ; le runtime
essaie d'abord le miroir de la barre d'outils (rapide, gratuit) et se
rabat sur le pont de scripts Python si le miroir est indisponible.
L'agent ne sait jamais et ne se soucie jamais de savoir quelle source a
répondu.

<!-- u 35fc88c5f8c4 | 80 15.9 Errors | heading -->
### 15.9 Erreurs

<!-- u 5eda63397d51 | 80 15.9 Errors | prose -->
`NAC.call` / `read` / `subscribe` rejettent avec un `NacError` dont le
`code` est l'un de ceux-ci :

<!-- u f6eceddeaf5f | 80 15.9 Errors | prose -->
- `plugin_not_registered` -- le slug n'a pas de manifeste v2.5.
- `verb_not_declared` -- le chemin du verbe n'est pas dans le
  manifeste.
- `state_not_declared` -- le chemin de l'état n'est pas dans le
  manifeste.
- `event_not_declared` -- le chemin de l'événement n'est pas dans le
  manifeste.
- `backend_unknown` -- le manifeste déclare un backend que le runtime
  n'implémente pas. Le manifeste DOIT être rejeté au moment de
  l'enregistrement ; cette erreur n'apparaît que si un runtime accepte
  un format de manifeste futur qu'il ne peut ensuite pas dispatcher.
- `backend_target_missing` -- la cible du backend (iframe, chemin JS,
  sélecteur DOM) est introuvable.
- `cross_origin_blocked` -- un `same-origin-window` a été tenté contre
  une iframe d'origine croisée.
- `state_unreadable` -- toutes les liaisons d'une chaîne d'état ont
  échoué ; voir 15.6.
- `timeout` -- un backend n'a pas répondu dans son `timeout_ms`
  déclaré (5000 par défaut pour les verbes, 1000 pour les lectures
  d'état).
- `invalid` -- la forme de l'argument est incorrecte (slug invalide,
  manifeste malformé au moment de l'enregistrement, etc).

<!-- u f92a4c02f492 | 81 16. Tree navigation (v2.5 -- SHIPPED in 2.5.0-alpha.5 / | heading -->
## 16. Navigation en arbre (v2.5 -- LIVRÉ en 2.5.0-alpha.5 / RFC V25-02)

<!-- u 7a50acadcc20 | 81 16. Tree navigation (v2.5 -- SHIPPED in 2.5.0-alpha.5 / | prose -->
Primitives de navigation hiérarchique des commandes, pour les parcours
d'assistance et les exécuteurs vocaux qui ont besoin de décrire ce
qu'ils peuvent faire depuis le focus courant.

<!-- u 726350183f41 | 81 16. Tree navigation (v2.5 -- SHIPPED in 2.5.0-alpha.5 / | prose -->
**Surface d'API :**

<!-- u c57b2345c081 | 81 16. Tree navigation (v2.5 -- SHIPPED in 2.5.0-alpha.5 / | prose -->
- `NAC.context(plugin) -> { breadcrumb: [{nac_id, label}, ...] }`
  Remonte depuis `document.activeElement` à travers les éléments
  ancêtres qui portent `data-nac-id`, en s'arrêtant à la racine du
  plugin. Renvoie un fil d'Ariane vide si rien n'a le focus dans le
  plugin. Le `label` de chaque maillon vient de `narrate` (section 17).

<!-- u 9345bb2ecfe1 | 81 16. Tree navigation (v2.5 -- SHIPPED in 2.5.0-alpha.5 / | prose -->
- `NAC.tree(plugin, rootId?) -> [{nac_id, label, opens?, leaf?}, ...]`
  Énumère les enfants adressables IMMÉDIATS de `rootId` (ou de la
  racine du plugin si omis). « Immédiat » signifie qu'aucun autre
  élément portant `data-nac-id` ne se trouve entre le point de départ
  et l'enfant. Pour chaque entrée :
  - `label` résolu via `narrate`
  - `opens` reflète l'attribut `data-nac-opens` quand il est présent
  - `leaf` vaut `true` quand `data-nac-leaf` est présent

<!-- u b19ace6221f6 | 81 16. Tree navigation (v2.5 -- SHIPPED in 2.5.0-alpha.5 / | prose -->
**Attributs pour l'auteur :**

<!-- u 8c4475faabe9 | 81 16. Tree navigation (v2.5 -- SHIPPED in 2.5.0-alpha.5 / | prose -->
- `data-nac-opens="<target-nac-id>"` : déclare que ce nœud ouvre /
  descend vers l'élément identifié par l'id cible. Permet aux agents de
  suivre la chaîne de navigation sans deviner de noms.
- `data-nac-leaf` : marqueur terminal explicite ; les agents en aval
  savent qu'aucune descente supplémentaire n'est possible.

<!-- u 6a2e330ae9a8 | 81 16. Tree navigation (v2.5 -- SHIPPED in 2.5.0-alpha.5 / | prose -->
**Erreurs :** `tree` renvoie `[]` pour un rootId inconnu (vide
silencieux, pas une erreur). `context` renvoie toujours
`{ breadcrumb: [] }` pour les plugins inconnus.

<!-- u 7a9670811789 | 82 17. Assistive labels (v2.5 -- SHIPPED in 2.5.0-alpha.5  | heading -->
## 17. Libellés d'assistance (v2.5 -- LIVRÉ en 2.5.0-alpha.5 / RFC V25-03)

<!-- u e6e2f1eecf4e | 82 17. Assistive labels (v2.5 -- SHIPPED in 2.5.0-alpha.5  | prose -->
Résolution canonique des libellés lisibles par un humain. Une seule
fonction pour les lecteurs d'écran, la synthèse vocale, les parcours
vocaux, les journaux d'audit, les surfaces d'assistance mobiles.

<!-- u 2ee6d3c1ba46 | 82 17. Assistive labels (v2.5 -- SHIPPED in 2.5.0-alpha.5  | prose -->
- `NAC.narrate(plugin, nac_id) -> string | null`
  Renvoie `null` si le plugin ou le nac_id est introuvable. Sinon, le
  libellé suivant cet ordre de priorité strict :

<!-- u d1332c239eaf | 82 17. Assistive labels (v2.5 -- SHIPPED in 2.5.0-alpha.5  | prose -->
  1. **`aria-label`** -- l'accessibilité d'abord ; respecté sauf s'il
     n'est que des espaces.
  2. **le texte visible** -- le `textContent` de l'élément, en
     excluant tout sous-arbre imbriqué portant `data-nac-id` (ceux-là
     ont leur propre résolution de narrate ; ils sont exclus pour que
     la sortie parlée reste bornée).
  3. **`data-nac-label`** -- surcharge explicite de l'auteur ; utile
     quand le texte visible contient des glyphes d'icône ou des clés
     d'i18n.
  4. **le `nac_id` en dernier recours** -- le pire cas ; il signale
     « aucun libellé n'a été écrit ».

<!-- u ca12e3704975 | 82 17. Assistive labels (v2.5 -- SHIPPED in 2.5.0-alpha.5  | prose -->
  Les valeurs qui ne sont que des espaces, à n'importe quel niveau,
  retombent au niveau suivant.

<!-- u 05527df57e48 | 82 17. Assistive labels (v2.5 -- SHIPPED in 2.5.0-alpha.5  | prose -->
**Validation :** `validate_global()` peut émettre des avertissements
dans le groupe `plugin_instance_violations` pour les nac_id de forme
ordinale (`btn-1`, `btn-2`, ...) auxquels manque l'un quelconque des
libellés des niveaux supérieurs.

<!-- u 8352032c85cd | 83 18. Effect detection (v2.5 -- SHIPPED in 2.5.0-alpha.5  | heading -->
## 18. Détection de l'effet (v2.5 -- LIVRÉ en 2.5.0-alpha.5 / RFC V25-04)

<!-- u 229a636ff25c | 83 18. Effect detection (v2.5 -- SHIPPED in 2.5.0-alpha.5  | prose -->
Comble le manque du « dommage silencieux » : un agent confirme l'EFFET
d'une action, pas seulement que la commande a été émise. Les deux
primitives se composent avec `NAC.read()`, donc n'importe quel backend
de V25-01 fonctionne (postmessage, sdk-call, dom-mirror, ...).

<!-- u fbede61e05ec | 83 18. Effect detection (v2.5 -- SHIPPED in 2.5.0-alpha.5  | prose -->
- `NAC.expect(plugin, statePath, value, opts?) -> Promise<value>`
  Interroge `NAC.read(plugin, statePath)` jusqu'à ce que le
  comparateur renvoie une valeur vraie ou que l'échéance tombe. Se
  résout avec la valeur résolue ; rejette avec
  `NacError('timeout', ...)` à l'échéance.

<!-- u 2f8b051e6a19 | 83 18. Effect detection (v2.5 -- SHIPPED in 2.5.0-alpha.5  | prose -->
  Les échecs de lecture pendant l'interrogation sont réessayés jusqu'à
  l'échéance (traités comme « pas encore observable », pas comme une
  erreur dure).

<!-- u 31222acebd2a | 83 18. Effect detection (v2.5 -- SHIPPED in 2.5.0-alpha.5  | prose -->
  Options :
  - `timeout_ms` (`5000` par défaut)
  - `poll_ms` (`100` par défaut)
  - `comparator` (`(cur, want) => cur === want` par défaut)
    Reçoit `(current, expected)` et renvoie un booléen.

<!-- u bfe42d1abbb0 | 83 18. Effect detection (v2.5 -- SHIPPED in 2.5.0-alpha.5  | prose -->
- `NAC.diff(plugin, statePath, actionFn) -> Promise<{before, after, changed}>`
  Lit l'état, attend `actionFn()`, relit l'état. Renvoie les deux
  instantanés et un booléen `changed` calculé par comparaison
  JSON-stringify (donc `undefined` face à une valeur est aussi signalé
  comme changé). Les échecs de lecture se replient sur `undefined`.

<!-- u 261f5079717f | 83 18. Effect detection (v2.5 -- SHIPPED in 2.5.0-alpha.5  | prose -->
**Notes de composition :** `diff` ne capture que l'instantané de DÉBUT
et celui de FIN ; il n'observe PAS les états intermédiaires à
l'intérieur de l'action. Utilisez `expect` si votre souci est « l'état
passe par telle valeur précise à un moment donné ».

<!-- u 3c1090ef8c62 | 83 18. Effect detection (v2.5 -- SHIPPED in 2.5.0-alpha.5  | prose -->
*Ce document est la spécification canonique de NAC3 v2.5. Les sections
0-14 sont inchangées par rapport à la v2.4 stable. Les sections 15-18
sont livrées en v2.5. Les modifications de ce fichier constituent des
changements de spécification et exigent un RFC ; voir
`CONTRIBUTING.md`.*
