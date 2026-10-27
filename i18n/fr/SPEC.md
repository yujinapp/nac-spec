---
translation_source_hash: abf83a2435d03edd99061463e66e25982e426a41f93a8a1bf4a0c0720500553c
translation_quality: machine_v1
translation_date: 2026-10-27
translation_engine: anthropic/claude-opus-5 (Yujin Forge)
translation_normative: false
translation_status: complete
translation_lang: fr
translation_source: SPEC.md
translation_source_version: 2.5.2
translation_source_date: 2026-10-27
translation_sections: 83
translation_sections_canonical: 83
translation_units: 283
translation_units_canonical: 283
translation_canonical_url: /nac-spec/SPEC.html
---

<!-- translation-banner: produced by scripts/build-translation-banners.mjs -->

> **Traduction automatique, non normative.** Elle traduit la version anglaise telle qu'elle était le 2026-10-27 (NAC3 v2.5.2) et couvre 83 des 83 sections de l'original actuel. Le texte normatif est l'anglais : en cas de divergence entre cette traduction et l'anglais, l'anglais prévaut.
>
> *Non-normative machine translation. The normative text of NAC3 is the English one.*
>
> [Lire le texte normatif en anglais](/nac-spec/SPEC.html)

<!-- /translation-banner -->

# NAC3 -- Native Agent Contract

**Version :** 2.5.2 (stable -- la surface v2.5 complète : narrate, context+tree, expect+diff)
**Statut :** Version stable. Le dist-tag npm `latest` pointe ici ; la section 9.1 énonce ce que cela garantit et ce qu'une préversion ne garantit pas. Ce document énonce sa version en exactement un endroit, la ligne ci-dessus. Les RFC publiés et leurs preuves de Couche 2 + Couche 3 sont listés dans `README.md` et `runtime/CHANGELOG.md`.
**Licence :** Apache-2.0
**Éditeur :** Yujin (yujin.app)

---

## 0. Objet

NAC3 est un contrat entre les interfaces web et les agents qui les
pilotent. Parmi les agents : les exécuteurs vocaux, les intermédiaires
LLM, les robots RPA, les outils d'accessibilité et les exécuteurs de
tests end-to-end. Le contrat spécifie :

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

NAC3 ajoute une couche mince par-dessus le framework avec lequel vous
rendez déjà. Il ne remplace ni ARIA, ni React, ni Vue, ni votre design
system.

---

## 1. Rôles

Tout élément du DOM pertinent pour un agent porte `data-nac-role`. Les
rôles canoniques sont :

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

Les rôles absents de cette liste sont réservés pour un usage futur. Un
runtime NAC-strict DEVRAIT rejeter les rôles inconnus au moment de
l'enregistrement (v2.2). Un runtime NAC-permissive PEUT traiter les
rôles inconnus comme `action` par compatibilité ascendante (le
comportement par défaut en v1.9 et v2.0).

Ce tableau est la liste normative, et il est publié comme donnée : le
catalogue lisible par machine à `api/latest/contract.json` porte tous
les rôles que le runtime de référence accepte, chacun marqué par
`declared_in_spec_table` pour que les deux listes puissent être
comparées sans lire de prose. Elles concordent à la v2.5. Toute
divergence future est visible dans ce marqueur plutôt que cachée dans
une différence d'opinion entre un document et une implémentation.

---

## 2. Noms

Tout élément résoluble par un agent porte `data-nac-id`. L'id est :

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

Préfixes d'id réservés (depuis 2.1) :

| Préfixe | Réservé pour |
|--------|--------------|
| `tab.` | Boutons d'onglet. Le rôle DOIT être `tab`. |
| `modal.` | Éléments de portée modale. Le rôle est celui du widget feuille. |
| `field.` | Forme abrégée d'un champ de formulaire. Le rôle DOIT être `field` ou `option`. |
| `confirm.` | Boîtes de dialogue de confirmation. |

---

## 3. Verbes

Un élément avec `data-nac-role="action"` PEUT porter
`data-nac-action="<verb>"` nommant ce qu'il fait. Le verbe est un
identifiant libre en snake-case convenu entre l'hôte et l'agent.
Verbes courants :

`save`, `cancel`, `submit`, `delete`, `edit`, `view`, `create`,
`approve`, `reject`, `send`, `download`, `upload`, `refresh`,
`expand`, `collapse`, `open`, `close`, `add_row`, `remove_row`.

`NAC.click_by_verb(plugin, verb)` résout un verbe vers l'unique action
sous ce plugin et clique dessus. Plusieurs actions partageant le même
verbe sous un même plugin est une erreur de manifeste (lint :
`duplicate_verb`).

---

## 4. Manifeste

Tout plugin PEUT enregistrer un manifeste via :

```js
NAC.register({
  plugin_slug: 'invoice',
  version:     '1.0.0',
  nac_version: '2.1',
  elements: [
    { id: 'invoice.save', role: 'action',
      actions: [{ verb: 'save', label_i18n: { es: 'Guardar', en: 'Save', ... } }],
      label_i18n: { es: 'Guardar factura', en: 'Save invoice', ... } },
    ...
  ],
  tabs: [
    { nac_id: 'tab.lines', label_i18n: { es: 'Lineas', en: 'Lines' } },
    ...
  ],
  fields: [
    { id: 'field.client_name', type: 'text', required: true,
      label_i18n: { es: 'Cliente', en: 'Customer' } },
    ...
  ],
  data_tables: [...]
});
```

Le manifeste est la source de vérité côté agent. Un intermédiaire LLM
qui décide que « l'utilisateur a dit "guardar" » consulte le manifeste
du plugin, y trouve le verbe `save` et émet
`NAC.click_by_verb('invoice', 'save')`.

### 4.1 Champs obligatoires

- `plugin_slug` -- correspond au `data-nac-plugin` de l'élément hôte.
- `nac_version` -- la version de NAC3 avec laquelle ce manifeste
  prétend être conforme. Le runtime rejette les manifestes qui
  revendiquent une version supérieure à la sienne.

### 4.2 Champs facultatifs

- `elements[]` -- le catalogue des widgets nommés. Chaque entrée DOIT
  avoir `id` et `role`.
- `tabs[]` -- un tableau de premier niveau distinct, pour les onglets.
  Équivaut à des entrées de `elements[]` avec `role:'tab'`. Les deux
  formes sont valides.
- `fields[]`, `actions[]`, `kpis[]`, `data_tables[]` -- des
  sous-collections typées ; même sémantique que `elements[]` filtré par
  rôle. Les démos choisissent la forme la plus lisible pour un humain.

### 4.3 i18n

Tout `label_i18n` DOIT couvrir les 10 locales de NAC3 :

```
es, en, pt, fr, ja, zh, hi, ar, de, it
```

`i18n_strict: 'permissive'` sur `NAC.autoRegister.watch()` autorise une
couverture partielle pendant une migration brownfield ; les manifestes
de production devraient livrer les 10 locales.

#### 4.3.1 Sur quoi porte l'exigence des dix locales

L'exigence ci-dessus porte sur le **manifeste de l'adoptant** : la
table `label_i18n` qu'un agent lit pour nommer un élément dans la
langue de l'utilisateur. Elle ne porte PAS sur la langue de ce
document, et rien dans NAC3 n'oblige une implémentation à publier sa
propre documentation en dix langues.

#### 4.3.2 Langue normative de cette spécification

Le texte normatif de NAC3 est l'**anglais** : le `SPEC.md` à la racine
du dépôt de la spécification, rendu à
`https://yujin.app/nac-spec/SPEC.html`.

La spécification est aussi publiée sous forme de traductions
automatiques dans `i18n/<locale>/SPEC.md`. Ces traductions sont **non
normatives**. Chacune déclare, dans une bannière que le lecteur voit et
dans un frontmatter lisible par machine, quelle révision anglaise elle
traduit et quelle part elle en couvre ; la bannière est obligatoire, et
une traduction publiée sans bannière est un défaut de la publication,
pas de la traduction. Lorsqu'une traduction et le texte anglais
divergent, c'est le texte anglais qui fait foi, et une revendication de
conformité est une revendication face au texte anglais.

Une traduction en retard sur l'anglais **ne bloque jamais la
publication de l'anglais**. Le texte normatif sort quand il est prêt ;
une traduction périmée est signalée, unité par unité, et la version
part. Neuf artefacts automatiques n'ont pas de droit de veto sur le
document qu'ils traduisent. Jusqu'à la 2.5.1 les neuf couvraient 34 des
83 sections et rien ne le disait ; elles sont désormais produites depuis
un magasin par locale, et la procédure est
`docs/TRANSLATION_PASS.md`.

---

## 5. API publique

### 5.1 Impérative

```ts
NAC.click(nac_id: string, opts?: ClickOpts): Promise<{ok: true}>
NAC.click_by_verb(plugin: string|null, verb: string, opts?): Promise<...>
NAC.fill(nac_id: string, value: string|number|boolean): Promise<...>
NAC.select(nac_id: string, value: string): Promise<...>
NAC.tab(plugin: string, tab_key: string): Promise<...>
NAC.tab_by_label(plugin: string|null, label: string): Promise<...>
NAC.go_to_section(nac_id: string): Promise<...>
NAC.drag_drop(source_id, target_id, opts?: {to_index?: number}): Promise<...>
NAC.set_mode(mode: 'modal'|'maximized'|'new_tab'|'new_window'): void
NAC.screenshot(): Promise<string>  // data URL
NAC.bindAction(el, handler, {plugin, action_id}): () => void  // v2.2
```

### 5.1.1 Aide à la conformité (v2.2)

`NAC.bindAction(el, handler, ctx)` est la façon conforme à la
spécification de brancher un gestionnaire de clic. Il émet
`nac:action:succeeded` (ou `:failed`) automatiquement après l'exécution
du gestionnaire (synchrone, exception ou Promise). Il renvoie une
fonction de détachement. Utilisez-le au lieu d'un
`addEventListener('click', ...)` brut dès que l'hôte le permet ; le code
brownfield peut continuer à émettre l'événement à la main comme avant.

### 5.1.3 Éditeur de champ (v2.3)

`NAC.edit_field(nac_id)` ouvre une modale qui permet à une personne (ou
à un agent en son nom) de modifier n'importe quel champ texte avec des
outils de style traitement de texte :

```ts
NAC.edit_field(nac_id: string): Promise<{ok:true}>
```

La modale s'enregistre sous `plugin_slug='nac_editor'` avec ces verbes
appelables depuis NAC3 :

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

Échap ferme (annule). Ctrl/Cmd+Entrée enregistre. Un clic sur le fond
de la surcouche annule.

La section 13 de la spécification formalisera le contrat en v2.3 ; le
runtime v2.2 livre une implémentation de référence fonctionnelle pour
que les adoptants puissent la brancher dès aujourd'hui. Disponible sur
n'importe quel champ via :

```js
NAC.edit_field('invoice.client_name');
// or by intermediary:
NAC.click_by_verb('myplugin', 'edit_field', { nac_id: 'invoice.client_name' });
```

### 5.1.4 Charge utile d'action + invoke (v2.3)

Les actions de NAC v2.2 sont du type clic-et-c'est-parti : un agent
déclenche `NAC.click(id)` ou `NAC.click_by_verb(plugin, verb)` et
l'hôte fait ce qu'il fait. Cela marche pour les actions de verbe et
d'état (`save`, `cancel`, `submit`, `delete`) mais s'effondre quand une
action a besoin de **données** venant de l'agent -- `utter(text)`,
`search(query)`, `send_message(body)`, `upload(file)`,
`schedule(date)`, `translate(text, target_lang)`. L'hôte n'a aucun
moyen de recevoir la charge utile de l'agent via un clic synthétique.

La v2.3 comble ce manque. Le contrat est additif : les verbes de type
clic continuent de fonctionner sans changement.

```ts
NAC.invoke(action_id: string, payload: object, opts?: { timeout?: number })
  : Promise<{ok: true, request_id: string, ack: object|null}>

NAC.utter(action_id: string,
          opts: { text: string, lang?: string, voice?: string, metadata?: object })
  : Promise<{ok: true, request_id: string, ack: object|null}>
```

`NAC.invoke` dispatche un `CustomEvent` `nac:action:requested` sur
l'élément hôte (il remonte jusqu'à document) avec :

```ts
detail: {
  action_id:  string,    // canonical nac_id of the host element
  verb:       string,    // payload.verb || el's data-nac-action
  payload:    object,    // arbitrary, action-specific
  plugin:     string|null,
  request_id: string,    // correlation token assigned by the runtime
  ts:         number,    // Date.now()
}
```

L'hôte écoute `nac:action:requested`, traite la charge utile et émet
`nac:action:succeeded` (ou `nac:action:failed`) avec le même
`request_id` dans le détail. Le runtime corrèle par `request_id` et
résout la Promise de l'agent.

Le délai par défaut est de **30 secondes** (contre 5 s pour le clic).
On le change avec `opts.timeout`. À l'expiration, la Promise est
rejetée avec `NacError('timeout', ...)`. Comme pour le clic, une
expiration signifie un véritable échec : l'appelant DOIT la traiter
comme tel, sauf s'il a la preuve de l'effet par un autre canal.

`NAC.utter(id, opts)` est le raccourci ergonomique pour le verbe à
charge utile le plus courant. Il équivaut à :

```js
NAC.invoke(id, { verb: 'utter', text: opts.text, lang: opts.lang });
```

#### Déclaration dans le manifeste

Une action qui porte une charge utile déclare le schéma de cette charge
dans son entrée de manifeste, pour la traçabilité et pour l'outillage :

```js
NAC.register({
  plugin_slug: 'atlas_pro_ad',
  version:     '2.1.0',
  nac_version: '2.3',
  elements: [
    { id: 'atlas_pro_ad.mic', role: 'action',
      actions: [
        { verb: 'listen' },
        { verb: 'utter',
          payload_schema: {
            text: { type: 'string', required: true, max: 4000 },
            lang: { type: 'string',
                    enum: ['en','es','pt','fr','it','de','ja','zh','hi','ar'] }
          },
          label_i18n: { es:'Decir', en:'Utter', /* ... 10 locales */ } }
      ],
      label_i18n: { /* ... */ } }
  ]
});
```

`payload_schema` est **informatif en v2.5**, et le runtime de référence
ne le lit pas du tout : le champ est accepté dans un manifeste,
transporté dans `NAC.manifest()`, et jamais validé contre quoi que ce
soit. `NAC.STRICT_VALIDATION` -- dont la valeur par défaut est bien
passée à `true` en 2.3.0 -- ne couvre que les constats de rôle de
manifeste et de DOM ; il n'a jamais couvert les charges utiles. Donc un
agent NE DOIT PAS supposer qu'une charge utile a été vérifiée parce
qu'un schéma a été déclaré : aujourd'hui la seule validation qui a lieu
est celle que l'agent fait avant d'envoyer.

Les schémas sont volontairement simples (un sous-ensemble à la forme de
JSON-Schema) pour qu'un runtime puisse valider sans embarquer un
validateur JSON-Schema complet, et cela reste l'intention de conception
pour le jour où l'exigence sera appliquée.

Une révision antérieure de cette section promettait, pour la version
2.4, de formaliser la grammaire du schéma et d'en faire une exigence
par défaut. **Cela n'est pas arrivé en 2.4 et ne l'est pas davantage à
la 2.5.** La phrase est retirée plutôt que redatée : une promesse avec
un numéro de version accolé, laissée en place passé cette version, se
lit pour un agent comme une capacité sur laquelle il peut compter.
Formaliser la grammaire et brancher l'exigence est suivi comme question
ouverte à la section 13, où elle figure comme ouverte et sans date.

#### Sémantique de l'état désactivé (correctif v2.3 issu d'alpha.2)

`NAC.invoke` ne rejette PAS lorsque l'élément cible porte `disabled` ou
`aria-disabled='true'`. L'attribut HTML `disabled` est un garde-fou de
clic côté interface ; `invoke` est une requête logique porteuse de
charge utile, pas un clic synthétique. Les hôtes qui ont besoin de
refuser un invoke selon l'état de l'interface DOIVENT le faire dans
leur écouteur de `nac:action:requested` et émettre
`nac:action:failed` avec un code d'erreur qui veut dire quelque chose.

`NAC.click`, en revanche, rejette TOUJOURS sur les éléments désactivés
(la sémantique du clic est préservée). Couverture de tests :
`runtime/test/v23-invoke.mjs` T7/T8/T9.

#### Conformité : les hôtes qui prennent en charge invoke DOIVENT

1. Déclarer `actions[].payload_schema` dans l'entrée du manifeste.
2. Écouter `nac:action:requested` (ou utiliser un écouteur générique
   qui filtre par `detail.action_id` + `detail.verb`).
3. Émettre `nac:action:succeeded` -- avec `detail.request_id` renvoyé
   à l'identique -- après traitement, ou `nac:action:failed` (avec le
   code dans `detail.error`) en cas d'échec.
4. NE JAMAIS émettre un événement `:succeeded` avec un `request_id`
   qu'ils n'ont pas reçu (cela évite le croisement entre invocations
   concurrentes).

Les hôtes qui ne prennent PAS en charge invoke continuent de
fonctionner normalement avec `NAC.click()` et `NAC.click_by_verb()`.
Les agents qui appellent `NAC.invoke()` contre un hôte sans entrée
`actions[].payload_schema` recevront quand même un `request_id`, mais
le runtime ne peut pas garantir la livraison ; le délai expire au bout
de 30 s.

#### Pourquoi c'est important

La surface agentique complète cesse d'être « une liste de boutons » et
devient « une liste de boutons + des entrées structurées ». Une
annonce vocale devient appelable par NAC.invoke. Une barre de recherche
devient appelable par NAC.invoke. Un envoi de fichier devient appelable
par NAC.invoke. Même protocole, même provenance, même sémantique
d'accusé de réception.

Le premier adoptant de référence est **Atlas Pro** : son élément
`atlas_pro_ad.mic` déclare à la fois le verbe `listen` (clic seul,
existant) et `utter` (porteur de charge utile). La même boucle
conversationnelle `/parse` + `/tts` pilote dans les deux cas ; les
agents qui ont la reconnaissance vocale appellent `listen`, ceux qui
ont leur propre modèle de langue appellent `utter`.

#### Modalités à venir (anticipées, sans changement de spécification)

`invoke` est volontairement agnostique de la modalité, pour que de
futures familles d'entrée se branchent sans casser le contrat :

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

Chaque modalité suit le même protocole d'événements
`nac:action:requested` -> `nac:action:succeeded` / `:failed`, la même
corrélation par `request_id`, la même sémantique de délai. Le runtime
reste petit ; le vocabulaire de verbes grandit par convention entre
hôtes et agents. Des raccourcis ergonomiques (`NAC.utter`,
`NAC.search`, `NAC.watch`, etc.) peuvent être ajoutés plus tard sans
rien respécifier, parce que chacun est une enveloppe mince autour
d'`invoke`.

### 5.1.5 Résolution dans le shadow DOM -- racines ouvertes (v2.3)

Le runtime résout les références `data-nac-id` à travers les racines
shadow ouvertes, de façon récursive. Une page peut monter des Web
Components avec `attachShadow({mode:'open'})`, poser des attributs
`data-nac-*` sur des éléments à l'intérieur de l'arbre shadow, et
n'importe quel appelant NAC3 (`NAC.click`, `NAC.fill`, `NAC.invoke`,
etc.) résout la cible de façon transparente.

#### Algorithme de résolution

Pour un sélecteur `S` (typiquement `[data-nac-id="..."]`) face à une
racine `R` (typiquement `document`) :

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

#### Propagation des événements

Les événements émis par des hôtes à l'intérieur de racines shadow
DOIVENT positionner `composed: true` pour que les écouteurs au niveau
du document les reçoivent. Le runtime NAC3 émet déjà tous ses propres
événements avec `composed:true` ; le code hôte qui émet des événements
`nac:*` à la main est responsable de la même chose. Sans
`composed:true` l'événement s'arrête à la frontière du shadow et la
machinerie de corrélation du runtime ne le voit jamais.

#### Responsabilité de l'auteur du composant

L'auteur du composant doit :

1. Poser `data-nac-id`, `data-nac-role`, `data-nac-action` sur les
   éléments opérables à l'intérieur de la racine shadow.
2. Positionner `composed:true` sur tout événement personnalisé que
   l'hôte émet pour signaler un contrat NAC3
   (`nac:action:succeeded`, `nac:field:changed`, etc.).
3. Éviter `<slot>` pour les éléments qui doivent rester isolés dans le
   shadow -- les nœuds placés dans un slot vivent dans le light DOM et
   y sont résolus.

Pour les racines shadow ouvertes, aucune indication dans le manifeste
ni aucune activation du runtime n'est nécessaire ; la résolution est
automatique.

#### Implémentation de référence

Le runtime de référence expose deux aides internes,
`_deepQuery(selector, root)` et `_deepQueryAll(selector, root)`, qui
effectuent le parcours. Les aides publiques `NAC.click`, `NAC.fill`,
`NAC.invoke`, `NAC.describe`, etc., passent toutes par les variantes
profondes.

#### Démos et tests

- `example-v23-shadow-open.php` -- démos de shadow ouvert imbriqué sur
  1, 2 et 3 niveaux.
- `runtime/test/v23-shadow.mjs` T1-T3, T10 -- couverture unitaire, y
  compris le plafond de profondeur.

### 5.1.6 Résolution dans le shadow DOM -- racines fermées, exposition volontaire (v2.3)

Les racines shadow fermées (`attachShadow({mode:'closed'})`) sont
opaques depuis l'extérieur du code de l'auteur du composant : c'est une
frontière de sécurité du navigateur, pas une décision de NAC3. NAC3 ne
peut pas atteindre l'intérieur à moins que l'auteur du composant
n'expose volontairement une surface interrogeable via le contrat
ci-dessous.

#### Le contrat d'interface `el.nac3`

Un élément personnalisé PEUT exposer un objet d'interface sur son hôte,
via un accesseur nommé `nac3` :

```ts
interface NAC3HostInterface {
  query(selector: string): Element | null;        // MANDATORY
  queryAll(selector: string): Element[];          // RECOMMENDED
  describe?(): Array<{                            // OPTIONAL
    id:    string;
    role:  string;
    action?: string;
    label?: string;
  }>;
}
```

Les composants adhèrent en implémentant l'accesseur. Les composants qui
n'adhèrent PAS restent inaccessibles aux appelants NAC3 (leurs
internes restent privés, comme le navigateur l'entend).

#### Sémantique de la résolution

Pendant `_deepQuery(selector)`, pour chaque élément visité `el` avec
`el.shadowRoot === null` :

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

#### Forme du détail des événements d'erreur

Détail de `nac:shadow_blocked` :

```ts
{
  host:   Element,     // the closed-shadow host
  reason: 'exposure_threw' | 'not_exposed',
  ts:     number       // Date.now()
}
```

Détail de `nac:shadow_protocol_violation` :

```ts
{
  host:           Element,
  message:        string,            // diagnostic message
  value_snapshot: string,            // truncated value preview
  ts:             number
}
```

Les deux événements remontent (`bubbles: true`) et traversent les
frontières du shadow (`composed: true`). La déduplication est par hôte,
via un WeakSet tenu par le runtime ; un même hôte émet chaque événement
**au plus une fois par chargement de page**.

#### Pourquoi c'est volontaire

L'opacité du shadow fermé est imposée par le navigateur. Même si NAC3
définissait un mécanisme non volontaire, le navigateur l'empêcherait.
L'exposition volontaire laisse à l'auteur du composant le contrôle
total de l'allure de sa surface publique pour les agents.

Le coût est une adhésion composant par composant ; le bénéfice est que
les agents conformes à NAC3 fonctionnent face à des design systems
comportant des composants à shadow fermé (Salesforce Lightning,
certains composants de GitHub Primer, widgets sensibles côté sécurité)
sans code d'adaptation par composant.

#### Démos et tests

- `example-v23-shadow-closed.php` -- le cas positif
  (`<todo-card-closed-exposed>`) et le cas négatif
  (`<todo-card-closed-blind>`) côte à côte, avec panneaux de verdict +
  journal d'événements en direct.
- `runtime/test/v23-shadow.mjs` T4-T9 -- couverture unitaire de chaque
  famille d'événements d'erreur, plus la sémantique de déduplication.
- `guides/SHADOW_DOM_CLOSED.md` -- guide pour l'auteur de composants.

### 5.1.7 Capacités conscientes de l'autorisation (v2.3)

NAC3 v2.3 permet au manifeste de déclarer, action par action, les
capacités exigées, et de bloquer ainsi `NAC.click` et `NAC.invoke`
avant le dispatch. L'agent reçoit un refus rapide
(`code='capability_required'`) au lieu d'un aller-retour qui échoue
côté serveur.

#### Déclaration dans le manifeste

Une exigence de capacité s'attache au niveau de l'élément ou au niveau
du verbe. Si les deux sont présentes, celle du verbe l'emporte.

```js
NAC.register({
  plugin_slug: 'fin',
  version:     '1.0.0',
  nac_version: '2.3',
  elements: [
    // Element-level (covers all verbs on this id).
    { id: 'fin.invoice.delete', role: 'action',
      requires_capability: 'finance.delete_invoice',
      actions: [{ verb: 'delete' }] },

    // Verb-level (more granular).
    { id: 'fin.invoice.edit', role: 'action',
      actions: [
        { verb: 'edit',
          requires_capability: 'finance.edit_invoice' },
        { verb: 'view',
          /* no capability -> always allowed */ }
      ] },

    // Array value: OR semantics.
    // ("at least one of these capabilities matches")
    { id: 'fin.invoice.approve', role: 'action',
      requires_capability: ['finance.approve',
                            'finance.admin'],
      actions: [{ verb: 'approve' }] }
  ]
});
```

Pour une sémantique de ET logique (« l'utilisateur a besoin de TOUTES
ces capacités »), déclarez chacune via des actions bloquées séparées,
ou composez côté hôte dans l'écouteur de `nac:action:requested`.

#### API publique

```ts
NAC.setCapabilities(caps: string | string[] | null): void
NAC.grantCapability(cap: string): void
NAC.revokeCapability(cap: string): void
NAC.userCapabilities(): string[]
```

`setCapabilities` remplace l'ensemble entier (à utiliser à la connexion
ou au renouvellement de session). `grantCapability` /
`revokeCapability` sont incrémentaux. `userCapabilities` renvoie un
tableau instantané de l'état. `setCapabilities(null)` vide l'ensemble.

Les hôtes appellent cela chaque fois que le rôle de l'utilisateur
change. L'ensemble vit dans le runtime ; aucun rechargement de
manifeste n'est nécessaire.

#### Sémantique du verrou

Avant le dispatch, `NAC.click(id)` et `NAC.invoke(id, payload)`
cherchent l'entrée de manifeste correspondante (élément + verbe),
lisent `requires_capability` et appellent `_hasCapability` :

- Aucune exigence déclarée -> autorisé.
- Exigence déclarée et l'ensemble courant la satisfait -> autorisé.
- Exigence déclarée et l'ensemble courant ne la satisfait PAS -> rejet
  avec `NacError('capability_required', ...)` ET émission de
  `nac:command:rejected` avec
  `detail.reason='capability_required'`.

Le verrou s'exécute APRÈS les vérifications `not_found` / `disabled` /
`hidden` sur `click`, pour que l'échec le plus spécifique remonte. Sur
`invoke`, le verrou s'exécute avant que l'événement de requête ne
part (l'hôte ne voit jamais une tentative non autorisée).

#### Pourquoi c'est important

Sans le verrou, un agent qui appelle `NAC.click('finance.delete')` ou
bien réussit (aucun verrou d'autorisation -> faille de sécurité) ou
bien échoue côté serveur avec un 403 plusieurs secondes plus tard. Avec
le verrou, l'agent apprend de façon synchrone qu'il lui manque la
capacité et peut réagir comme il faut (demander un autre parcours,
demander une élévation de droits, exposer la contrainte à
l'utilisateur).

Cela complète -- et ne remplace pas -- l'autorisation côté serveur. Les
hôtes DOIVENT continuer d'appliquer les permissions sur le serveur. Le
verrou côté client est une optimisation d'expérience et un signal au
niveau de l'intention, pas une frontière de sécurité.

#### Démos et tests

- `runtime/test/v23-capabilities.mjs` -- 17 assertions couvrant la
  lecture et l'écriture de l'ensemble, l'octroi et la révocation, le
  verrou du clic, le verrou de l'invoke, la résolution entre niveau de
  verbe et niveau d'élément, la sémantique de OU logique, le vidage par
  null, le rejet des entrées invalides, et la régression des actions
  sans verrou.

### 5.1.2 Drapeau de validation stricte (v2.2 ; valeur par défaut inversée en v2.3)

`NAC.STRICT_VALIDATION` (booléen). Quand il vaut `true`,
`NAC.register()` lève une `Error` avec `code='strict_validation'` et un
tableau `findings` dans l'un de ces cas :

- `manifest_role_unknown` -- le rôle de l'entrée est hors de
  l'ensemble canonique.
- `tab_id_manifest_role_drift` -- l'id correspond à `^tab\.` mais le
  rôle n'est pas `'tab'`.
- `manifest_dom_role_mismatch` -- le `data-nac-role` de l'élément monté
  dans le DOM diffère du rôle de l'entrée du manifeste.

**Valeur par défaut :**

- **v2.2.x :** `false` (avertissement seulement). Les adoptants
  avaient besoin d'une fenêtre de migration.
- **v2.3.x :** **`true`** (lève). La fenêtre de migration s'est fermée
  avec la ligne v2.2. Les adoptants dont les manifestes sont chargés de
  dérives s'en retirent en posant `NAC.STRICT_VALIDATION = false` AVANT
  tout appel à `register()`.
- **v3.0 :** le drapeau est retiré (strict est le seul mode).

Voir `guides/MIGRATION_v2.2_to_v2.3.md` pour le mode opératoire de
nettoyage des constats de dérive.

Toutes les méthodes asynchrones rejettent avec un `NacError` dont le
`code` est l'un de ceux-ci :

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

### 5.2 Introspection

```ts
NAC.describe():    { active: string|null, plugins: PluginSnap[] }
NAC.describe_v2(): { v2_scope_entries: [...], sitemap: ..., data_tables: [...] }
NAC.manifest(plugin_slug: string): Manifest|null
NAC.validate_global(opts?: {probe?: boolean}): GlobalReport   // named buckets, see 10.1
```

### 5.3 Tableaux de données (depuis 2.1)

Les primitives de tableau de données ne font PAS partie du runtime
central (`js/nac.js` / le `nac.mjs` de `@nac3/runtime`). Elles sont
livrées dans le module d'extensions brownfield
`js/nac-v2-extensions.js` (publié comme `@nac3/runtime/extensions`),
qui les accroche au même objet `window.NAC` après son chargement.
Chargez le module d'extensions après le runtime central pour obtenir la
surface `dt_*` :

```html
<script src="https://yujin.app/nac-spec/js/nac.js"></script>
<script src="https://yujin.app/nac-spec/js/nac-v2-extensions.js"></script>
```

```js
// or with the npm package:
import '@nac3/runtime';
import '@nac3/runtime/extensions';
```

Les méthodes ci-dessous ne sont présentes que lorsque le module
d'extensions est chargé ; les appeler sur un runtime réduit au noyau ne
fait rien / renvoie `undefined`.

```ts
NAC.registerDataTable(spec: DataTableSpec): string   // returns table_id
NAC.dt_add_row(table_id, values): {ok, row_id}
NAC.dt_remove_row(table_id, row_id): {ok}
NAC.dt_edit_cell(table_id, row_id, column, value): {ok} | {ok:false, error}
NAC.dt_set_cell(table_id, row, col, value): {ok} | {ok:false, error}
NAC.dt_select(table_id, target): {ok}
NAC.dt_commit(table_id): {ok, final_state} | {ok:false, errors:[...]}
NAC.dt_discard(table_id): {ok}
NAC.dt_state(table_id): TableState
NAC.dt_read_aggregate(table_id, agg_key, column): number|null
NAC.registerDataTableComputed(table_id, column, fn): void
```

Un tableau de données a un `subkind` :

- `collection` -- des lignes ordonnées, avec validation
  transactionnelle facultative. Utilisé pour les lignes de facture, les
  articles d'un panier, les entrées de journal.
- `matrix` -- une grille ligne x colonne où chaque cellule porte une
  valeur. Utilisé pour les matrices de permissions, les grilles
  d'horaires.
- `matrix-singletree` -- une matrice où chaque ligne se replie en un
  arbre (rare).

---

### 5.4 Résolution stricte + désambiguïsation (v2.4)

NAC3 v2.4 rend **stricte** la résolution d'id, de verbe, de
qualificateur et de libellé. Les verbes qui résolvent une requête vers
un unique élément du DOM -- `click_by_verb`, `tab` (forme à un
argument) et `tab_by_label` -- ne devinent plus. Quand une requête
résout vers zéro candidat ou vers plus d'un, le runtime lève un
`NacError` portant la liste des candidats ET émet un événement
`nac:disambiguation_requested`, au lieu de dispatcher en silence vers
le premier à-peu-près.

C'est l'invariant de **zéro dommage silencieux**. Il existe pour les
logiciels d'assistance et les agents, où un dispatch silencieux vers le
mauvais élément sans voie de récupération est un bloqueur de sécurité.
L'ancien comportement indulgent d'avant la 2.4 -- un repli par
`indexOf` sur sous-chaîne qui résolvait vers le premier à-peu-près --
est supprimé.

> Compatibilité ascendante : la v2.4 est un changement de
> *comportement du contrat*. Les chemins de code qui fournissaient déjà
> des arguments sans ambiguïté continuent de fonctionner tels quels.
> Les chemins de code qui dépendaient du repli indulgent par `indexOf`
> pour résoudre vers le premier à-peu-près vont désormais lever une
> exception -- c'est voulu.

#### 5.4.1 Correspondance stricte du qualificateur (`click_by_verb`)

`click_by_verb(plugin, verb, opts?)` choisit parmi les nœuds du DOM qui
partagent `data-nac-action="<verb>"`. Lorsque `opts.qualifier` (une
chaîne) est fourni, un élément correspond **seulement** si son
`data-nac-id` satisfait :

```js
id === qualifier || id.endsWith('__' + qualifier)
```

C'est-à-dire : égalité exacte de l'id, ou un suffixe ancré après un
séparateur `__`. **Il n'y a pas de repli par sous-chaîne**. Un
qualificateur qui n'est qu'une sous-chaîne d'un id (non égal, pas un
`__suffix` ancré) ne correspond PAS.

- 0 correspondance -> lève `NacError('no_matching_instance', ...)`.
- exactement 1 correspondance -> résout et clique.
- >1 correspondances -> lève `NacError('ambiguous_qualifier', ...)`.

`opts.qualifier_ordinal` (un nombre) choisit par position parmi tous
les éléments du DOM qui partagent le verbe, en contournant la
correspondance de qualificateur.

#### 5.4.2 Résolution stricte d'id (`tab`)

Forme à un argument de `tab(plugin, id)` : une correspondance exacte de
`data-nac-id` dans le DOM l'emporte. Sinon, le runtime cherche les
instances dont l'id commence par `id + "__"` :

- 0 instance qualifiée et aucun id exact -> `no_matching_instance`.
- exactement 1 -> résout.
- >1 -> `ambiguous_tab` (passez l'id qualifié complet).

#### 5.4.3 Résolution stricte par libellé (`tab_by_label`)

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

#### 5.4.4 Codes d'erreur

| `err.code` | Levé par | Signification |
|------------|-----------|---------|
| `no_matching_instance` | `click_by_verb` (qualificateur), `tab` | aucun élément ne correspond au qualificateur / à l'id |
| `ambiguous_qualifier`  | `click_by_verb` | plus de 1 élément correspond au qualificateur |
| `ambiguous_tab`        | `tab`           | plus de 1 instance qualifiée `id__` correspond |
| `ambiguous_label`      | `tab_by_label`  | plus de 1 onglet correspond au libellé (à n'importe quel niveau) |
| `not_found`            | `tab_by_label`  | aucun onglet ne correspond au libellé |

#### 5.4.5 La forme de `err.candidates`

Toute erreur de désambiguïsation porte un tableau `candidates`. Chaque
candidat est exactement :

```ts
{ nac_id: string, label: string }
```

`nac_id` est le `data-nac-id` de l'élément. `label` est résolu en
préférant `aria-label`, puis le `textContent` nettoyé (tronqué à 120
caractères), puis en se rabattant sur le `data-nac-id`. La liste est
validée contre le DOM : elle nomme les vrais éléments parmi lesquels
l'appelant peut choisir. `NacError` fusionne `candidates` dans l'`Error`
levée, de sorte que `err.code`, `err.message` et `err.candidates` sont
tous renseignés.

#### 5.4.6 L'événement `nac:disambiguation_requested`

Chaque fois qu'un appel de résolution stricte échoue (aucune
correspondance OU trop de correspondances), le runtime dispatche un
`CustomEvent` `nac:disambiguation_requested` sur `document` *en plus
de* lever l'exception. L'émission est au mieux : si le dispatch échoue,
le runtime lève quand même.

```ts
document.addEventListener('nac:disambiguation_requested', (e) => {
  e.detail; /* {
    method:     'click_by_verb' | 'tab' | 'tab_by_label',
    plugin:     string | null,
    query:      { verb?, qualifier?, label?, id? },
    reason:     string,   // finer-grained than err.code (see 5.4.3)
    candidates: Array<{ nac_id: string, label: string }>,
  } */
});
```

#### 5.4.7 Comment un appelant désambiguïse

Avec la liste des candidats en main (depuis `err.candidates` ou
`event.detail.candidates`), l'appelant en choisit un et redispatche par
l'une de ces voies :

1. **Le `nac_id` complet** -- `NAC.click(candidate.nac_id)`. C'est la
   voie canonique de récupération : le candidat porte déjà l'id exact.
2. **Le `__suffix` ancré** -- passez à `click_by_verb` le suffixe exact
   de l'instance comme qualificateur.
3. **`opts.qualifier_ordinal`** -- sélection par position parmi les
   éléments qui partagent le verbe (dans l'ordre du DOM).

La référence travaillée est `example-v24-disambiguation.php` ; le
contrat est couvert par `runtime/test/stage2-disambiguation.mjs` et
`runtime/test/stage7-strict-resolution.mjs`.

---

## 6. Événements

Toute action émet un événement d'achèvement déterministe. Le
`NAC.click()` du runtime guette cet événement et se résout quand il
part.

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

### 6.1 Forme du détail de l'événement

Le détail de tout événement porte le champ d'id canonique, plus
`plugin` :

```js
nac:action:succeeded {
  detail: { plugin: 'invoice', action_id: 'invoice.save', ... }
}
nac:tab:activated {
  detail: { plugin: 'invoice_edit_modal', tab_id: 'tab.lines', ... }
}
nac:field:changed {
  detail: { plugin: 'invoice', field_id: 'field.client_name',
            value: 'Acme Corp', ... }
}
```

### 6.2 Émettre depuis un gestionnaire de l'hôte

Un gestionnaire de clic DOIT émettre l'événement de succès
correspondant après son effet synchrone :

```js
button.addEventListener('click', function (ev) {
  // ... do the work ...
  document.dispatchEvent(new CustomEvent('nac:action:succeeded', {
    detail: { plugin: 'invoice', action_id: 'invoice.save' }
  }));
});
```

Si le travail est asynchrone, émettez après la résolution. Si le
travail échoue, émettez `nac:action:failed` avec
`{detail: {plugin, action_id, error: <message>}}`.

Le runtime v2.2 fournira `NAC.bindAction(el, handler, ctx)`, qui
enveloppe `addEventListener` et émet automatiquement.

### 6.3 Pourquoi ne pas utiliser l'événement de clic lui-même ?

Un événement `click` du DOM part avant l'exécution du gestionnaire. Le
contrat de NAC3 a besoin de savoir quand **l'effet s'est terminé**, pas
quand le clic a commencé. D'où la famille d'événements distincte.

---

## 7. Provenance

### 7.1 isTrusted

`event.isTrusted` vaut `true` pour les clics initiés par une personne
(vraie souris, vraie touche, activation par un lecteur d'écran) et
`false` pour les clics synthétisés (`element.click()`, le dispatchEvent
d'un MouseEvent construit à la main, l'automatisation).

NAC3 DOIT exposer cela via `event.detail.is_trusted` dans l'événement
de succès. Les hôtes qui exécutent des actions sensibles côté sécurité
(paiement, suppression) PEUVENT exiger `is_trusted === true` et
refuser les clics synthétiques. La démo de référence
`example-v20-full.php` comprend une paire de boutons
(`v20_panel.istrusted_real` et `v20_panel.istrusted_fake`) qui
démontre la distinction.

### 7.2 Manifestes signés par HMAC

Un manifeste PEUT porter un bloc `provenance` :

```js
NAC.set_provenance_secret('your-tenant-secret');
NAC.register({
  plugin_slug: 'invoice',
  ...,
  provenance: {
    signed_at: '2026-05-09T10:00:00Z',
    signed_by: 'tenant-X',
    signature: '<HMAC-SHA256 of manifest body>'
  }
});
```

Le runtime calcule le HMAC attendu sur une sérialisation stable du
manifeste (signature exclue) et rejette les manifestes dont la
signature ne correspond pas. Utilisé par les déploiements
multi-locataires pour empêcher un locataire d'usurper le manifeste d'un
autre.

### 7.3 Modèle de menace

Voir `SECURITY.md` pour le modèle de menace complet. Version courte :

- NAC3 n'authentifie pas l'**utilisateur**. C'est le travail de votre
  couche d'authentification.
- NAC3 authentifie le **manifeste** (HMAC).
- NAC3 distingue les vrais clics des clics synthétisés (isTrusted),
  pour qu'un hôte puisse refuser les seconds sur les verbes sensibles.
- NAC3 ne protège pas contre un agent malveillant qui tourne avec
  l'accès de l'utilisateur. Un tel agent peut tout ce que
  l'utilisateur peut.

---

## 8. Niveaux de conformité

Un niveau s'écrit **NAC3 Conformance Level 1**, **2** ou **3**. Le nom
d'un niveau n'est pas le nom du protocole : un validateur, un rapport
ou une revendication de conformité DOIT citer un niveau par
l'identifiant `nac3-conformance-level-<1|2|3>` publié dans
`api/latest/levels.json`, jamais par un nom d'affichage. La section 8.1
consigne les noms que ces niveaux portaient avant la 2.5.0.

Une page est au **NAC3 Conformance Level 1** si :

- Tout widget cliquable qu'un agent devrait pouvoir manœuvrer porte
  `data-nac-id` et `data-nac-role`.
- Tout élément `data-nac-role="action"` déclenche
  `nac:action:succeeded` après son effet.
- La page enregistre au moins un manifeste de plugin via
  `NAC.register()`.
- `NAC.click(id)` fonctionne pour chaque id annoncé.

Une page est au **NAC3 Conformance Level 2** si, en plus :

- Elle enregistre les tableaux `tabs[]`, `fields[]`, `actions[]`
  explicitement dans son manifeste (non déduits du DOM).
- Elle fournit `label_i18n` couvrant les 10 locales de NAC3 pour chaque
  libellé visible par l'utilisateur.
- Elle implémente les primitives brownfield de la v2.0 : arbre de
  portée, capture éphémère, autoRegister.watch.
- Elle passe `NAC.validate_global({probe: false})` avec zéro constat de
  sévérité `error`.

Une page est au **NAC3 Conformance Level 3** si, en plus :

- Elle porte des manifestes signés par HMAC.
- Elle distingue `isTrusted` pour les verbes sensibles côté sécurité.
- Elle passe `NAC.validate_global({probe: true})` avec zéro constat.

La ligne de commande du paquet NPM (`npx nac3 validate <url>`) indique
le niveau le plus élevé qu'une page atteint. (Le paquet livre les
binaires `nac3` et `nac` ; les deux mènent à la même ligne de
commande.)

### 8.1 Noms historiques des niveaux (v2.5)

Avant la 2.5.0 les trois niveaux s'écrivaient `NAC-1`, `NAC-2` et
`NAC-3`. Ces noms sont à un tiret du nom du protocole, `NAC3`, de sorte
que « cette page est conforme NAC-3 » ne pouvait pas être distingué de
« cette page implémente NAC3 », et un agent à qui l'on demandait de
rapporter un niveau n'avait aucune chaîne sans ambiguïté à rapporter.

Les anciens noms restent lisibles comme alias historiques :
`api/latest/levels.json` publie chacun comme `legacy_display_name` à
côté du niveau auquel il appartenait, pour qu'un document écrit avant
la 2.5.0 puisse encore être rattaché à un niveau. Ils ne sont PAS
normatifs. Le texte nouveau, la sortie des validateurs et les
revendications de conformité utilisent le numéro de niveau ou
l'identifiant publié.

---

## 9. Versionnement

NAC3 suit le semver :

- Incrément **majeur** : changement cassant de l'API publique ou des
  formats de transport. Les adoptants modifient du code.
- Incrément **mineur** : nouvelles fonctionnalités, compatibles avec
  l'existant. L'ancien code continue de fonctionner.
- Incrément de **correctif** : corrections de défauts, changements de
  documentation seulement.

Politique d'obsolescence : une fonctionnalité marquée `@deprecated`
dans la version `X.Y.0` n'est pas retirée avant `(X+1).0.0`. Les notes
de version documentent explicitement chaque retrait.

La version du paquet NPM reflète la version de la spécification :
`@nac3/runtime@X.Y.Z` implémente NAC3 vX.Y, avec Z révisions de
correctif par-dessus. L'exemple est écrit avec des marqueurs à dessein :
une version concrète dans cette phrase devient obsolète à la version
suivante, et ce document portait `2.1.3` longtemps après que le paquet
avait avancé.

### 9.1 Préversions et dist-tags

Une version avec une queue de préversion (`-alpha.N`, `-beta.N`,
`-rc.N`) **n'est pas** une version publiée de cette spécification. Elle
existe pour qu'un changement puisse être exercé avant d'être promis.

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

La version autoritative du runtime de référence est la constante
`NAC.version` dans `js/nac.js`, et elle est publiée comme donnée :
`api/latest.json` porte un pointeur `stable` et un pointeur
`prerelease` distincts (l'un ou l'autre peut valoir `null`), et chaque
artefact publié porte son propre champ `channel`. Un consommateur qui
exige un contrat stable lit un champ et refuse, sans aucune chaîne de
version à analyser et sans aucun tag à croire.

---

## 10. Validateurs

### 10.1 Runtime : `NAC.validate_global()`

Parcourt le DOM vivant + les manifestes enregistrés et renvoie un
**objet de groupes nommés** : un groupe par condition, chacun un
tableau de constats. Depuis la 2.5.0 chaque constat de chaque groupe
porte `code` et `severity`, de sorte qu'une intégration de CI peut
bloquer sur un code sans analyser un message :

```ts
{
  ok:         boolean,       // false when any error-severity finding exists
  has_errors: boolean,
  duplicates: [{ code: 'nac_id_duplicate_across_plugins',
                 severity: 'error', nac_id, plugins: string[] }],
  orphans:    [{ code: 'nac_id_orphan_in_dom',
                 severity: 'warn', nac_id, in_dom, in_manifest,
                 plugin_root }],
  unmounted:  [{ code: 'nac_id_declared_not_mounted',
                 severity: 'warn', nac_id, in_manifest, in_dom,
                 plugin }],
  convention_violations:
              [{ code: 'nac_id_missing_plugin_prefix',
                 severity: 'warn', nac_id, plugin, hint }],
  plugin_instance_violations:
              [{ code: 'duplicate_plugin_no_instance_id',
                 severity: 'error', slug, instance_count, ... }],
  tolerated:  [{ kind, nac_id, until, original }],
  plugin_count: number,
  total_ids:    number,
  timestamp:    number
}
```

Les cinq codes, leur sévérité et ce qu'il faut faire pour chacun sont
publiés comme donnée à `api/latest/findings.json`, sous
`global_buckets`. Les codes de constat sont stables d'une version de
correctif à l'autre ; de nouveaux codes seulement aux incréments
mineurs, et un code n'est jamais réutilisé pour une autre condition
(section 12, promesse 4).

**Les versions antérieures à la 2.5.0 n'attachaient aucun code à ces
groupes**, et cette section décrivait un tableau plat de constats que
le runtime de référence n'a jamais renvoyé (audit N-14, N-34).

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

### 10.2 CLI : `npx nac3 validate <target>`

Enveloppe `validate_global` plus un lint statique de cohérence entre
HTML et manifeste. Codes de sortie :

- `0` -- aucun constat de sévérité >= au seuil configuré.
- `1` -- il y a des constats.
- `2` -- la cible elle-même n'a pas pu être chargée.

Utile en CI : `npx nac3 validate ./dist/index.html --severity=error`.
Le paquet expose la CLI sous deux noms de binaire, `nac3` et `nac` ;
utilisez celui qui n'entre pas en collision avec un autre outil de
votre PATH.

---

## 11. Le système autour de NAC3

NAC3 est une couche de contrat. Pour transformer une page conforme à
NAC3 en application pilotée à la voix, il vous faut aussi :

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

NAC3 ne normalise que la forme d'entrée et de sortie de l'étape 2
(l'instantané de `NAC.describe()` + la forme des actions). Les étapes
1, 3 et 4 sont hors spécification ; vous composez ce que vous voulez.

---

## 12. Garanties de stabilité

Ce que cette spécification promet :

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

Ce que cette spécification NE promet PAS :

1. La formulation exacte des messages d'erreur (ce sont des chaînes du
   catalogue i18n ; les localisations peuvent bouger).
2. La stratégie DOM pour trouver les éléments (`querySelector`
   aujourd'hui ; cela pourra devenir un index plus rapide plus tard).
3. La disposition interne du cache de manifestes. Traitez les
   manifestes comme en écriture seule côté hôte, et en lecture seule
   côté agent.

---

## 13. Questions ouvertes

Elles sont suivies **ici**, dans cette section. Une révision antérieure
intitulait ceci « Questions ouvertes (suivies séparément) » et ne
disait jamais où était ce « séparément » ; il n'y avait aucun autre
registre. Une question qui aboutit à une décision quitte le tableau
ci-dessous et entre dans la section qu'elle affecte. Une question qui
devient une proposition concrète reçoit un RFC, et ceux-ci sont indexés
dans [`rfcs/README.md`](rfcs/README.md), le processus étant dans
[`CONTRIBUTING.md`](CONTRIBUTING.md).

Chaque ligne porte la version où elle a été évaluée pour la dernière
fois, pour qu'un lecteur distingue une question vivante d'une question
abandonnée. **Aucune ligne ne porte de version cible** : une promesse
datée qui dépasse sa date est pire qu'une promesse sans date, ce qui est
l'erreur que la section 5 commettait à propos de `payload_schema`.

| Question | État | Dernière évaluation | Où cela en est |
|----------|-------|---------------|-----------------|
| `data-nac-role="navigation"` devrait-il jamais résoudre vers un onglet ? | **DÉCIDÉ : non** | v2.5 | Décidé en 2.2.0 et appliqué depuis : un id préfixé `tab.` avec le rôle `navigation` lève `tab_id_manifest_role_drift`, et avec `STRICT_VALIDATION` (par défaut `true` depuis la 2.3.0) `NAC.register` lève. `tab_by_label` ne résout les onglets qu'à partir de `m.tabs[]` et `elements[role=='tab']`. `navigation` est une région repère, jamais un panneau commutable. Voir les sections 1 et 10. |
| `NAC.click()` devrait-il accepter des ids relatifs (par exemple `'./save'`) ? | **OUVERTE, non implémentée** | v2.5 | Le résolveur fait correspondre `data-nac-id` exactement et borne par plugin : l'actif, ou celui de `opts.plugin`. Ce bornage couvre déjà le cas que la question demandait (`NAC.click('save', {plugin:'invoice'})`), donc la pression pour une syntaxe relative est faible et rien n'est en cours. La décider impliquerait d'ajouter une grammaire de chemins à la section 2, où les ids sont déclarés opaques pour le runtime. |
| Les manifestes devraient-ils prendre en charge l'héritage / l'extension entre plugins (un manifeste de base étendu par un locataire) ? | **OUVERTE, candidate pour la prochaine majeure** | v2.5 | Non implémentée. **Ne pas confondre avec la section 15**, le « contrat d'extension de plugin » : celui-ci est livré en v2.5 et c'est un mécanisme de routage vers le backend (`registerPlugin` / `call` / `read` / `subscribe`), pas de l'héritage de manifestes. La question ici porte sur un manifeste qui dérive d'un autre, ce qui touche aux règles d'unicité d'id de la section 2, raison pour laquelle elle est gardée pour une majeure. |
| L'exigence de `payload_schema` devrait-elle être formalisée et activée ? | **OUVERTE, sans date** | v2.5 | Déplacée ici depuis la section 5, qui la promettait pour la v2.4. Elle n'a pas atterri en v2.4 et n'a pas atterri jusqu'à la v2.5 ; le runtime de référence ne lit pas le champ. Voir la section 5 pour savoir exactement ce qui est validé et ce qui ne l'est pas aujourd'hui. |
| Les constats de `validate_global()` devraient-ils porter un code du catalogue publié ? | **DÉCIDÉ : oui, livré en 2.5.0** | v2.5 | Chaque élément de chaque groupe porte `code` + `severity`, de sorte que la promesse 4 de la section 12 couvre désormais un ensemble réel au lieu d'un ensemble vide. Les cinq codes sont publiés sous `global_buckets` dans `api/latest/findings.json`, et le générateur les LIT depuis un cas de test qui provoque chaque groupe, au lieu de les écrire à la main : la version précédente écrivait `code: null` pour un groupe qui portait un code depuis la 2.5.0 et publiait les deux affirmations dans le même fichier. Construire ce cas de test est aussi ce qui a trouvé l'audit N-33 : le validateur ne pouvait pas voir un manifeste écrit sous la forme canonique. Voir 10.1. |

---

## 13.5 Gouvernance

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

Pour les adoptants : la licence uniforme Apache-2.0 garantit que la
spécification et le runtime survivent à tout changement du statut
sociétaire de Yujin. Vous pouvez forker l'un ou l'autre, faire tourner
l'un ou l'autre et livrer l'un ou l'autre, aujourd'hui et après notre
disparition. Ce document consigne l'engagement pour que le chemin vers
cette survie soit explicite, et non implicite.

---

## 14. Implémentation de référence

L'implémentation canonique est le runtime de référence distribué sous
forme du paquet NPM `@nac3/runtime`. La source normative de la version
est la constante `NAC.version` du runtime lui-même, publiée comme
donnée à `api/latest.json` (voir la section 9.1). Cette section ne
répète volontairement pas un numéro de version : elle portait
`2.5.0-alpha.5` alors que le paquet avait déjà avancé, ce qui est la
même classe de défaut que les exemples périmés retirés des sections 5
et 9. Elle livre :

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

Le paquet expose aussi une CLI sous les noms de binaire `nac3` et `nac`
(`dist/cli.js`, section 10.2).

D'autres implémentations sont bienvenues (Python pour des exécuteurs
d'automatisation natifs, Rust pour des agents embarqués, etc).
L'autorité, c'est la spécification, pas le code JS.

---

## 15. Contrat d'extension de plugin -- surfaces canvas + API (v2.5)

Les sections 1-14 supposent que la surface pertinente pour l'agent est
le **DOM**. Tout élément adressable a un attribut `data-nac-id`, tout
verbe se déclenche par `el.click()`, toute lecture d'état vient de
`el.getAttribute(...)`. Cela marche pour les applications dont le
châssis ET le contenu vivent dans des nœuds du DOM.

Cela ne marche pas pour les applications dont une partie de la surface
est un **canvas** (LibreOffice / Collabora Online, Figma, Excalidraw,
Miro, tout éditeur WebGL maison). Le châssis peut rester du DOM (barres
d'outils, boîtes de dialogue), mais les commandes doivent souvent
passer par l'API publique de l'application elle-même (postMessage, SDK
de plugins, pont de script), et l'état peut n'être pas lisible du tout
depuis le DOM.

La v2.5 ajoute un petit ensemble de primitives qui permettent à un
plugin NAC3 de déclarer son propre contrat de routage vers de telles
surfaces. Le runtime reste agnostique de toute application
particulière : il apprend à parler à l'une d'elles uniquement en lisant
le manifeste du plugin.

### 15.1 Pourquoi un nouvel ensemble de primitives

Le `NAC.click(id)` qui ne connaît que le DOM ne peut pas :

- Envoyer un postMessage `Send_UNO_Command` à une iframe Collabora en
  bac à sable.
- Appeler `figma.currentPage.selection = [...]` dans le bac à sable de
  plugins de Figma.
- Invoquer `excalidrawAPI.setElements(...)` sur une ref React.
- Lire si Gras est actif sur la sélection courante de Collabora (la
  barre d'outils le reflète ; le canvas le cache).

Le correctif **n'est pas** d'étendre `NAC.click` avec des heuristiques
de détection de backend. Le correctif est d'ajouter un verbe explicite
et agnostique qui prend un slug de plugin et un chemin de verbe, et qui
laisse le manifeste du plugin déclarer comment ce verbe est routé.

### 15.2 Les trois primitives

```ts
NAC.registerPlugin(slug: string, manifest: PluginManifest): void
NAC.call(plugin: string, verb_path: string, args?: object): Promise<any>
NAC.read(plugin: string, state_path: string): Promise<any>
NAC.subscribe(plugin: string, event_path: string,
              cb: (data: any) => void): SubscriptionHandle
NAC.unsubscribe(handle: SubscriptionHandle): void
```

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

Les quatre fonctions sont asynchrones (elles renvoient une Promise)
sauf `unsubscribe`, qui est synchrone et idempotente.

### 15.3 Forme du manifeste de plugin

```ts
interface PluginManifest {
  slug: string;
  verbs:  { [verb_path: string]: VerbBinding };
  state:  { [state_path: string]: StateBinding[] };
  events: { [event_path: string]: EventBinding };
}

interface VerbBinding {
  backend:       BackendKind;
  /* backend-specific fields (see 15.4) */
  [k: string]: any;
}

interface StateBinding {
  backend:       BackendKind;
  /* backend-specific fields (see 15.4) */
  extract?:      string;   /* extractor DSL string (see 15.5) */
  [k: string]: any;
}

interface EventBinding {
  backend:       BackendKind;
  /* backend-specific fields */
  [k: string]: any;
}

type BackendKind =
  | 'postmessage'
  | 'postmessage-listen'
  | 'sdk-call'
  | 'script-bridge'
  | 'dom-mirror'
  | 'same-origin-window'
  | 'synthetic-mutation'
  | 'synthetic-poll';
```

Les manifestes sont du JSON pur (pas de callbacks JS). Forge, Sumi et
tout outillage futur les génèrent comme donnée ; le runtime interprète
les noms de backend à partir d'un vocabulaire fixe.

Les verbes et les événements ont **exactement une** liaison. L'état a
un **tableau ordonné** de liaisons : le runtime parcourt la chaîne dans
l'ordre et renvoie la première source qui s'est résolue avec succès.

### 15.4 Vocabulaire des backends

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

Chaque backend DOIT être implémenté par le runtime comme un dispatcheur
autonome (`dispatch(binding, args, context) -> Promise<value>`).
Ajouter un nouveau type de backend à la spécification exige d'incrémenter
la version de la spécification ; les runtimes qui ignorent les backends
inconnus DOIVENT rejeter les manifestes qui les déclarent (pas de saut
silencieux).

### 15.5 Mini-DSL d'extraction

Les backends d'état et le backend d'événement `postmessage-listen` ont
souvent besoin de prélever un champ dans un objet plus grand. Le
runtime livre un minuscule DSL déclaratif pour que les manifestes
restent du JSON pur :

| Syntaxe | Signification | Exemple d'entrée -> sortie |
|--------|---------|-------------------------|
| `field.path.to.value` | Parcours d'un chemin pointé. | `{a:{b:1}}` avec `a.b` -> `1` |
| `attribute:NAME` | DOM seulement : lire `el.getAttribute(NAME)`. | `<i data-x="hi">` avec `attribute:data-x` -> `'hi'` |
| `text` | DOM seulement : lire `el.textContent`. | `<span>hi</span>` avec `text` -> `'hi'` |
| `classList.contains:CLASS` | DOM seulement : `el.classList.contains(CLASS)` -> booléen. | `<button class="active">` avec `classList.contains:active` -> `true` |
| `value` | DOM seulement : lire `el.value`. | `<input value="x">` avec `value` -> `'x'` |
| `present` | DOM seulement : renvoie `true` si le sélecteur a résolu un élément, `false` sinon. | le sélecteur a correspondu -> `true` |

La composition n'est pas prise en charge en v2.5 ; un extracteur est
exactement l'une des lignes ci-dessus. Un manifeste qui a besoin d'une
transformation complexe déclare plutôt un `script-bridge`.

### 15.6 Sémantique de la chaîne de replis pour `state`

`state[path]` est un tableau de liaisons. `NAC.read(plugin, path)`
parcourt le tableau dans l'ordre. Pour chaque liaison :

1. Le runtime invoque le dispatcheur du backend.
2. Si le dispatcheur se résout avec une valeur (y compris `false`, `0`
   et la chaîne vide, mais PAS `undefined`), `read` renvoie cette
   valeur.
3. Si le dispatcheur rejette, ou se résout avec `undefined`, le runtime
   passe à la liaison suivante du tableau.
4. Si aucune liaison n'a produit de valeur, `read` rejette avec
   `NacError('state_unreadable', ...)`, dont `err.attempts: [...]`
   porte une entrée par backend tenté, avec `{backend, reason}`.

Justification : la chaîne encode l'ordre de préférence de l'auteur du
manifeste. La source la plus rapide, la moins coûteuse et la plus
fraîche est déclarée en premier ; les replis se dégradent avec
élégance. Le runtime ne choisit jamais en silence une source
inférieure en premier.

### 15.7 Provenance des actions synthétiques

Chaque dispatch de `NAC.call` émet un événement `nac:plugin:invoked`
sur `document` après le retour du backend. La charge du détail :

```js
{
  plugin:    'collabora.writer',
  verb_path: 'uno.Bold',
  backend:   'postmessage',
  request_id: 'pi_<random hex>',
  source:    'agent',     // see sec 7
  trusted:   false,
  duration_ms: 12,
  ok:        true,
  error:     null,
}
```

Même forme pour `nac:plugin:read` (après un `read`) et
`nac:plugin:event` (la réémission d'un événement synthétisé). `source`
vaut `'agent'` par défaut ; les hôtes qui enveloppent le runtime dans
une interface utilisateur PEUVENT le remplacer via le mécanisme
existant `NAC.set_source(...)` (section 7).

### 15.8 Exemple travaillé -- Collabora Writer

```json
{
  "slug": "collabora.writer",
  "verbs": {
    "uno.Bold": {
      "backend": "postmessage",
      "target":  "iframe[data-collabora-frame]",
      "message": "Send_UNO_Command",
      "values":  { "Command": ".uno:Bold" }
    },
    "doc.save": {
      "backend": "postmessage",
      "target":  "iframe[data-collabora-frame]",
      "message": "Action_Save",
      "values_from_args": ["DontTerminateEdit", "Notify"]
    }
  },
  "state": {
    "selection.isBold": [
      { "backend": "dom-mirror",
        "selector": "[data-nac-id='toolbar.bold']",
        "extract":  "classList.contains:selected" },
      { "backend": "script-bridge",
        "bridge":   "collabora.python",
        "script":   "yujin_state.py",
        "function": "GetSelectionState",
        "response_match": "CallPythonScript-Result",
        "extract":  "Values.is_bold" }
    ],
    "doc.modified": [
      { "backend": "same-origin-window",
        "target":  "iframe[data-collabora-frame]",
        "path":    "app.file.modified" }
    ]
  },
  "events": {
    "doc.modified": {
      "backend": "postmessage-listen",
      "source":  "iframe[data-collabora-frame]",
      "message": "Doc_ModifiedStatus",
      "extract": "Values.Modified"
    },
    "selection.changed": {
      "backend":     "synthetic-mutation",
      "observe":     ["selection.isBold", "selection.isItalic"],
      "throttle_ms": 100
    }
  }
}
```

L'agent appelle `NAC.call('collabora.writer', 'uno.Bold')` ; le runtime
route par le backend `postmessage` et poste `Send_UNO_Command` vers
l'iframe. Pour confirmer que l'effet a eu lieu (voir la section 17),
l'agent appelle
`await NAC.read('collabora.writer', 'selection.isBold')` ; le runtime
essaie d'abord le miroir de la barre d'outils (rapide, gratuit) et se
rabat sur le pont de scripts Python si le miroir est indisponible.
L'agent ne sait jamais et ne se soucie jamais de savoir quelle source a
répondu.

### 15.9 Erreurs

`NAC.call` / `read` / `subscribe` rejettent avec un `NacError` dont le
`code` est l'un de ceux-ci :

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

---

## 16. Navigation en arbre (v2.5 -- LIVRÉ en 2.5.0-alpha.5 / RFC V25-02)

Primitives de navigation hiérarchique des commandes, pour les parcours
d'assistance et les exécuteurs vocaux qui ont besoin de décrire ce
qu'ils peuvent faire depuis le focus courant.

**Surface d'API :**

- `NAC.context(plugin) -> { breadcrumb: [{nac_id, label}, ...] }`
  Remonte depuis `document.activeElement` à travers les éléments
  ancêtres qui portent `data-nac-id`, en s'arrêtant à la racine du
  plugin. Renvoie un fil d'Ariane vide si rien n'a le focus dans le
  plugin. Le `label` de chaque maillon vient de `narrate` (section 17).

- `NAC.tree(plugin, rootId?) -> [{nac_id, label, opens?, leaf?}, ...]`
  Énumère les enfants adressables IMMÉDIATS de `rootId` (ou de la
  racine du plugin si omis). « Immédiat » signifie qu'aucun autre
  élément portant `data-nac-id` ne se trouve entre le point de départ
  et l'enfant. Pour chaque entrée :
  - `label` résolu via `narrate`
  - `opens` reflète l'attribut `data-nac-opens` quand il est présent
  - `leaf` vaut `true` quand `data-nac-leaf` est présent

**Attributs pour l'auteur :**

- `data-nac-opens="<target-nac-id>"` : déclare que ce nœud ouvre /
  descend vers l'élément identifié par l'id cible. Permet aux agents de
  suivre la chaîne de navigation sans deviner de noms.
- `data-nac-leaf` : marqueur terminal explicite ; les agents en aval
  savent qu'aucune descente supplémentaire n'est possible.

**Erreurs :** `tree` renvoie `[]` pour un rootId inconnu (vide
silencieux, pas une erreur). `context` renvoie toujours
`{ breadcrumb: [] }` pour les plugins inconnus.

---

## 17. Libellés d'assistance (v2.5 -- LIVRÉ en 2.5.0-alpha.5 / RFC V25-03)

Résolution canonique des libellés lisibles par un humain. Une seule
fonction pour les lecteurs d'écran, la synthèse vocale, les parcours
vocaux, les journaux d'audit, les surfaces d'assistance mobiles.

**Surface d'API :**

- `NAC.narrate(plugin, nac_id) -> string | null`
  Renvoie `null` si le plugin ou le nac_id est introuvable. Sinon, le
  libellé suivant cet ordre de priorité strict :

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

  Les valeurs qui ne sont que des espaces, à n'importe quel niveau,
  retombent au niveau suivant.

**Validation :** `validate_global()` peut émettre des avertissements
dans le groupe `plugin_instance_violations` pour les nac_id de forme
ordinale (`btn-1`, `btn-2`, ...) auxquels manque l'un quelconque des
libellés des niveaux supérieurs.

---

## 18. Détection de l'effet (v2.5 -- LIVRÉ en 2.5.0-alpha.5 / RFC V25-04)

Comble le manque du « dommage silencieux » : un agent confirme l'EFFET
d'une action, pas seulement que la commande a été émise. Les deux
primitives se composent avec `NAC.read()`, donc n'importe quel backend
de V25-01 fonctionne (postmessage, sdk-call, dom-mirror, ...).

**Surface d'API :**

- `NAC.expect(plugin, statePath, value, opts?) -> Promise<value>`
  Interroge `NAC.read(plugin, statePath)` jusqu'à ce que le
  comparateur renvoie une valeur vraie ou que l'échéance tombe. Se
  résout avec la valeur résolue ; rejette avec
  `NacError('timeout', ...)` à l'échéance.

  Les échecs de lecture pendant l'interrogation sont réessayés jusqu'à
  l'échéance (traités comme « pas encore observable », pas comme une
  erreur dure).

  Options :
  - `timeout_ms` (`5000` par défaut)
  - `poll_ms` (`100` par défaut)
  - `comparator` (`(cur, want) => cur === want` par défaut)
    Reçoit `(current, expected)` et renvoie un booléen.

- `NAC.diff(plugin, statePath, actionFn) -> Promise<{before, after, changed}>`
  Lit l'état, attend `actionFn()`, relit l'état. Renvoie les deux
  instantanés et un booléen `changed` calculé par comparaison
  JSON-stringify (donc `undefined` face à une valeur est aussi signalé
  comme changé). Les échecs de lecture se replient sur `undefined`.

**Notes de composition :** `diff` ne capture que l'instantané de DÉBUT
et celui de FIN ; il n'observe PAS les états intermédiaires à
l'intérieur de l'action. Utilisez `expect` si votre souci est « l'état
passe par telle valeur précise à un moment donné ».

---

*Ce document est la spécification canonique de NAC3 v2.5. Les sections
0-14 sont inchangées par rapport à la v2.4 stable. Les sections 15-18
sont livrées en v2.5. Les modifications de ce fichier constituent des
changements de spécification et exigent un RFC ; voir
`CONTRIBUTING.md`.*
