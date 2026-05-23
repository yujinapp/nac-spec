---
translation_source: SPEC.md
translation_source_hash: 5ebb8103746daf5bf7877b67ebb3a44cf98b4e2cba1fd8ba30093e0fce1b9b76
translation_quality: machine_v1
translation_lang: fr
translation_date: 2026-05-11T12:52:03.130346+00:00
---

# NAC3 -- Native Agent Contract

**Version:** 2.2.0
**Statut :** Stable
**Licence :** Apache-2.0
**Éditeur :** Yujin (rpaforce.com)

---

## 0. Objectif

NAC3 est un contrat entre les interfaces web et les agents qui les pilotent.
Les agents comprennent les moteurs vocaux, les intermédiaires LLM, les bots
RPA, les outils d'accessibilité et les outils de test de bout en bout. Le contrat
spécifie :

1. **Comment les éléments sont nommés** -- afin qu'un agent puisse demander « cliquer sur le
   bouton enregistrer » et le résoudre vers un unique nœud DOM.
2. **Comment les verbes s'appliquent** -- afin qu'un agent puisse appeler `NAC.click(id)`,
   `NAC.fill(id, value)`, `NAC.tab(plugin, key)`, etc., sans
   code de liaison spécifique à chaque application.
3. **Comment la complétion est signalée** -- afin qu'un agent sache quand une
   étape est terminée, avec une famille d'événements déterministe par rôle.
4. **Comment la provenance est préservée** -- afin qu'un système en aval puisse
   distinguer un vrai clic utilisateur d'un clic synthétisé.

NAC3 ajoute une couche légère par-dessus le framework avec lequel vous effectuez
déjà le rendu. Il ne remplace pas ARIA, React, Vue, ni votre système de design.

---

## 1. Rôles

Chaque élément DOM pertinent pour un agent porte `data-nac-role`. Les
rôles canoniques sont :

| Rôle | Signification | Exemple |
|------|---------------|---------|
| `plugin` | Un module d'interface autonome (une page, un panneau, une collection de widgets). | `<article data-nac-plugin="invoice">` |
| `section` | Un point de repère à l'intérieur d'un plugin (en-tête, corps, pied de page, barre latérale). | `<section data-nac-role="section">` |
| `region` | Une zone nommable à l'intérieur d'une section (un groupe de cartes, une liste de résultats). | `<div data-nac-role="region">` |
| `action` | Un widget cliquable qui déclenche un verbe (bouton, lien utilisé comme bouton). | `<button data-nac-role="action" data-nac-action="save">` |
| `field` | Une entrée que l'utilisateur saisit ou bascule (texte, nombre, case à cocher, radio, date, fichier). | `<input data-nac-role="field">` |
| `option` | Une option sélectionnable à l'intérieur d'un champ (enfant d'une liste déroulante / select / groupe radio). | `<li data-nac-role="option">` |
| `tab` | Un sélecteur de panneau commutable. **Obligatoire lorsque `data-nac-id` correspond à `^tab\.`** | `<button data-nac-role="tab" data-nac-id="tab.lines">` |
| `breadcrumb-item` | Un élément de fil d'Ariane. | `<a data-nac-role="breadcrumb-item">` |
| `accordion-toggle` | Un contrôle d'expansion/réduction. | `<button data-nac-role="accordion-toggle">` |
| `step` | Un indicateur d'étape dans un assistant. | `<li data-nac-role="step">` |
| `pagination-item` | Un contrôle de saut de page dans une liste paginée. | `<button data-nac-role="pagination-item">` |
| `confirm-button` | Un bouton confirmer/annuler à l'intérieur d'une boîte de dialogue de confirmation. | `<button data-nac-role="confirm-button">` |
| `sort-control` | Un en-tête de colonne pour le tri. | `<th data-nac-role="sort-control">` |
| `filter-control` | Un déclencheur de filtre de colonne. | `<button data-nac-role="filter-control">` |
| `data-table` | Un hôte de tableau de données (v2.1). | `<table data-nac-role="data-table">` |
| `navigation` | Une région de navigation de repère. **Pas un onglet.** | `<nav data-nac-role="navigation">` |
| `confirm-dialog` | La modale d'une demande de confirmation. | `<div data-nac-role="confirm-dialog">` |

Les rôles ne figurant pas dans cette liste sont réservés à un usage futur. Un
runtime NAC-strict DEVRAIT rejeter les rôles inconnus au moment de l'enregistrement (v2.2). Un
runtime NAC-permissif PEUT traiter les rôles inconnus comme `action` pour la
rétrocompatibilité (comportement par défaut en v1.9 et v2.0).

---

## 2. Noms

Chaque élément résolvable par un agent porte `data-nac-id`. L'identifiant est :

- **Un chemin pointé** (ex. `deals.list.row.42.actions.delete`).
  Les points séparent les niveaux sémantiques ; le runtime ne les interprète
  pas, mais les humains et les LLM le font.
- **Globalement unique dans la portée d'un `data-nac-plugin`.** Deux
  plugins différents PEUVENT partager un identifiant ; le runtime résout par
  la paire `(plugin, id)`.
- **Stable entre les re-rendus.** Les frameworks qui produisent un nouvel identifiant
  à chaque rendu (hachages aléatoires, compteurs d'instances) rompent le contrat.
- **Stable entre les refontes de l'interface.** Un bouton se déplace de la barre d'outils
  vers un menu déroulant ; son identifiant DOIT rester le même.

Préfixes d'identifiant réservés (v2.1) :

| Préfixe | Réservé pour |
|---------|--------------|
| `tab.` | Boutons d'onglets. Le rôle DOIT être `tab`. |
| `modal.` | Éléments à portée modale. Le rôle est celui du widget feuille. |
| `field.` | Raccourci pour les champs de formulaire. Le rôle DOIT être `field` ou `option`. |
| `confirm.` | Boîtes de dialogue de confirmation. |

---

## 3. Verbes

Un élément `data-nac-role="action"` PEUT porter `data-nac-action="<verb>"`
indiquant ce qu'il fait. Le verbe est un identifiant libre en snake_case
convenu entre l'hôte et l'agent. Verbes courants :

`save`, `cancel`, `submit`, `delete`, `edit`, `view`, `create`,
`approve`, `reject`, `send`, `download`, `upload`, `refresh`,
`expand`, `collapse`, `open`, `close`, `add_row`, `remove_row`.

`NAC.click_by_verb(plugin, verb)` résout un verbe vers l'action unique
sous ce plugin et clique dessus. Plusieurs actions partageant
le même verbe sous un même plugin constituent une erreur manifeste (lint :
`duplicate_verb`).

---

## 4. Manifeste

Chaque plugin PEUT enregistrer un manifeste via :

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
qui détermine que « l'utilisateur a dit 'guardar' » consulte le
manifeste du plugin, trouve le verbe `save`, et émet
`NAC.click_by_verb('invoice', 'save')`.

### 4.1 Champs obligatoires

- `plugin_slug` -- correspond à `data-nac-plugin` sur l'élément hôte.
- `nac_version` -- la version de NAC3 que ce manifeste déclare respecter.
  Le runtime rejette les manifestes déclarant une version supérieure à la sienne.

### 4.2 Champs optionnels

- `elements[]` -- le catalogue des widgets nommés. Chaque entrée DOIT
  avoir `id` et `role`.
- `tabs[]` -- un tableau de premier niveau distinct pour les onglets. Équivalent aux
  entrées `elements[]` avec `role:'tab'`. Les deux formes sont valides.
- `fields[]`, `actions[]`, `kpis[]`, `data_tables[]` -- sous-collections
  typées ; mêmes sémantiques que `elements[]` filtrées par
  rôle. Les démos choisissent la forme la plus lisible pour les humains.

### 4.3 i18n

Chaque `label_i18n` DOIT couvrir l'ensemble des 10 locales NAC3 :

```
es, en, pt, fr, ja, zh, hi, ar, de, it
```

`i18n_strict: 'permissive'` sur `NAC.autoRegister.watch()` autorise
une couverture partielle lors d'une migration brownfield ; les manifestes
de production doivent embarquer les 10 locales.

---

## 5. API Publique

### 5.1 Impératif

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

`NAC.bindAction(el, handler, ctx)` est la méthode conforme à la spécification pour
brancher un gestionnaire de clic. Elle émet automatiquement `nac:action:succeeded` (ou
`:failed`) après l'exécution du gestionnaire (synchrone, exception, ou
Promise). Retourne une fonction de débranchement. À utiliser à la place d'un
`addEventListener('click', ...)` brut dès que l'hôte le permet ;
le code brownfield peut toujours émettre l'événement manuellement comme auparavant.

### 5.1.3 Éditeur de champ (aperçu v2.3)

`NAC.edit_field(nac_id)` ouvre une modale permettant à un utilisateur (ou à un
agent agissant en son nom) de modifier n'importe quel champ texte avec des outils de type Word :

```ts
NAC.edit_field(nac_id: string): Promise<{ok:true}>
```

La modale s'enregistre sous `plugin_slug='nac_editor'` avec les verbes
NAC-3 appelables suivants :

| Verbe | Effet |
|-------|-------|
| `select_word` | sélectionne le mot à la position du curseur |
| `select_sentence` | sélectionne la phrase à la position du curseur |
| `select_all` | Ctrl+A dans l'éditeur |
| `replace` | remplace la sélection par le texte fourni |
| `delete_selection` | supprime la sélection courante |
| `ai_correct_syntax` | envoie la valeur courante au LLM intermédiaire via POST avec le prompt système « fix grammar + spelling, return only fixed text » ; remplace la valeur par la réponse |
| `save` | reporte la valeur dans le champ source, déclenche les événements input + change, ferme la modale |
| `cancel` | abandonne les modifications, ferme la modale |

Échap ferme la modale (annulation). Ctrl/Cmd+Entrée sauvegarde. Un clic sur le fond de l'overlay annule.

La section 13 de la spécification formalisera le contrat en v2.3 ; le runtime v2.2
embarque une implémentation de référence fonctionnelle afin que les adoptants puissent l'intégrer dès aujourd'hui.
Disponible sur n'importe quel champ via :

```js
NAC.edit_field('invoice.client_name');
// ou via un intermédiaire :
NAC.click_by_verb('myplugin', 'edit_field', { nac_id: 'invoice.client_name' });
```

### 5.1.2 Indicateur de validation stricte (v2.2)

`NAC.STRICT_VALIDATION` (booléen, `false` par défaut en v2.2). Lorsqu'il est
`true`, `NAC.register()` lève une `Error` avec `code='strict_validation'`
et un tableau `findings` dans l'un des cas suivants :

- `manifest_role_unknown` -- le rôle d'une entrée ne fait pas partie de l'ensemble canonique.
- `tab_id_manifest_role_drift` -- l'identifiant correspond à `^tab\.` mais le rôle
  n'est pas `'tab'`.
- `manifest_dom_role_mismatch` -- l'attribut `data-nac-role` de l'élément DOM monté
  diffère du rôle de l'entrée dans le manifeste.

En v2.3, la valeur par défaut passe à `true`. En v3.0, l'indicateur est supprimé
(le mode strict devient le seul mode disponible).

Toutes les méthodes asynchrones rejettent avec une `NacError` dont le `code` est l'un des suivants :

- `not_found` -- l'élément, le rôle ou le verbe nommé est absent du DOM.
- `invalid` -- la forme de l'argument est incorrecte.
- `timeout` -- l'effet de bord a été déclenché mais l'événement d'acquittement de conformité
  n'est pas arrivé dans les 5 secondes. **Un timeout signifie un vrai échec** :
  le gestionnaire a peut-être planté, l'acquittement n'a jamais été branché,
  une situation de compétition réseau s'est produite. Les appelants DOIVENT traiter un timeout comme un échec,
  sauf s'ils disposent d'une preuve de l'effet de bord via un autre canal.

### 5.2 Introspection

```ts
NAC.describe():    { active: string|null, plugins: PluginSnap[] }
NAC.describe_v2(): { v2_scope_entries: [...], sitemap: ..., data_tables: [...] }
NAC.manifest(plugin_slug: string): Manifest|null
NAC.validate_global(opts?: {probe?: boolean}): Findings[]
```

### 5.3 Tables de données (v2.1)

```ts
NAC.registerDataTable(spec: DataTableSpec): void
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

Une table de données possède un `subkind` :

- `collection` -- lignes ordonnées avec validation transactionnelle optionnelle.
  Utilisé pour les lignes de facture, les articles d'un panier, les entrées de journal.
- `matrix` -- grille lignes × colonnes où chaque cellule porte une valeur.
  Utilisé pour les matrices de permissions, les grilles de planning.
- `matrix-singletree` -- matrice où chaque ligne se replie en arbre (cas rare).

---

## 6. Événements

Chaque action émet un événement de complétion déterministe. La méthode
`NAC.click()` du runtime attend cet événement et se résout à sa réception.

| Rôle | Événement de succès | Événement d'échec |
|------|---------------------|-------------------|
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

### 6.1 Structure du détail d'événement

Chaque détail d'événement contient le champ d'identifiant canonique ainsi que `plugin` :

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

### 6.2 Émission depuis un gestionnaire hôte

Un gestionnaire de clic DOIT émettre l'événement de succès correspondant après
son effet de bord synchrone :

```js
button.addEventListener('click', function (ev) {
  // ... effectuer le traitement ...
  document.dispatchEvent(new CustomEvent('nac:action:succeeded', {
    detail: { plugin: 'invoice', action_id: 'invoice.save' }
  }));
});
```

Si le traitement est asynchrone, émettre après la résolution. En cas d'échec,
émettre `nac:action:failed` avec `{detail: {plugin, action_id,
error: <message>}}`.

Le runtime v2.2 fournira `NAC.bindAction(el, handler, ctx)`
qui encapsule `addEventListener` et émet automatiquement.

### 6.3 Pourquoi ne pas utiliser l'événement click lui-même ?

Un événement DOM `click` se déclenche avant l'exécution du gestionnaire. Le contrat de NAC3
doit savoir quand **l'effet de bord s'est achevé**, et non quand le clic a démarré.
D'où la famille d'événements dédiée.

---

## 7. Provenance

### 7.1 isTrusted

`event.isTrusted` vaut `true` pour les clics initiés par l'utilisateur (vraie souris,
vraie touche, activation par lecteur d'écran) et `false` pour les clics
synthétisés (`element.click()`, dispatchEvent d'un MouseEvent construit manuellement, automatisation).

NAC3 DOIT exposer cette valeur via `event.detail.is_trusted` dans l'événement
de succès. Les hôtes qui effectuent des actions sensibles sur le plan de la sécurité
(paiement, suppression) PEUVENT exiger `is_trusted === true` et rejeter les clics
synthétiques. La démo de référence `example-v20-full.php` inclut une paire de boutons
(`v20_panel.istrusted_real` et `v20_panel.istrusted_fake`) qui illustre cette distinction.

### 7.2 Manifestes signés par HMAC

Un manifeste PEUT contenir un bloc `provenance` :

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

Le moteur d'exécution calcule le HMAC attendu sur une sérialisation stable
du manifeste (en excluant la signature elle-même) et rejette les manifestes
dont la signature ne correspond pas. Utilisé dans les déploiements multi-locataires
pour empêcher un locataire d'usurper le manifeste d'un autre.

### 7.3 Modèle de menace

Consultez `SECURITY.md` pour le modèle de menace complet. En résumé :

- NAC3 n'authentifie pas l'**utilisateur**. C'est le rôle de votre couche d'authentification.
- NAC3 authentifie le **manifeste** (HMAC).
- NAC3 distingue les clics réels des clics synthétisés
  (isTrusted) afin qu'un hôte puisse refuser ces derniers pour les actions sensibles.
- NAC3 ne protège pas contre un agent malveillant s'exécutant avec les droits
  de l'utilisateur. Un tel agent peut faire tout ce que l'utilisateur peut faire.

---

## 8. Niveaux de conformité

Une page est **conforme NAC-1** si :

- Chaque widget cliquable qu'un agent doit pouvoir actionner
  porte `data-nac-id` et `data-nac-role`.
- Chaque élément `data-nac-role="action"` émet
  `nac:action:succeeded` après son effet de bord.
- La page enregistre au moins un manifeste de plugin via
  `NAC.register()`.
- `NAC.click(id)` fonctionne pour chaque identifiant déclaré.

Une page est **conforme NAC-2** si elle satisfait également :

- L'enregistrement explicite des tableaux `tabs[]`, `fields[]`, `actions[]`
  dans son manifeste (sans inférence depuis le DOM).
- La fourniture de `label_i18n` couvrant les 10 locales NAC3 pour chaque
  libellé visible par l'utilisateur.
- L'implémentation des primitives brownfield v2.0 : arbre de portée,
  capture éphémère, autoRegister.watch.
- Le passage de `NAC.validate_global({probe: false})` sans aucun résultat
  de sévérité `error`.

Une page est **conforme NAC-3** si elle satisfait également :

- La présence de manifestes signés par HMAC.
- La distinction de `isTrusted` pour les actions sensibles sur le plan de la sécurité.
- Le passage de `NAC.validate_global({probe: true})` sans aucun résultat.

Le CLI du package NPM (`npx @nac3/runtime validate <url>`) indique le niveau
le plus élevé atteint par une page.

---

## 9. Gestion des versions

NAC3 suit le versionnage sémantique (semver) :

- Incrément **majeur** : changement incompatible de l'API publique ou des formats
  d'échange. Les adoptants doivent modifier leur code.
- Incrément **mineur** : nouvelles fonctionnalités, rétrocompatibles. Le code existant
  continue de fonctionner.
- Incrément de **correctif** : corrections de bogues, modifications de documentation uniquement.

Politique de dépréciation : une fonctionnalité marquée `@deprecated` dans la version
`X.Y.0` n'est supprimée qu'à partir de `(X+1).0.0` au plus tôt. Les notes de version
documentent explicitement chaque suppression.

La version du package NPM reflète la version de la spécification : `@nac3/runtime@2.1.3`
implémente NAC3 v2.1 avec trois révisions de correctifs.

---

## 10. Validateurs

### 10.1 Moteur d'exécution : `NAC.validate_global()`

Parcourt le DOM en direct, les manifestes enregistrés et le catalogue i18n,
puis retourne un tableau de résultats :

```ts
{
  severity: 'error' | 'warn' | 'info',
  code:     string,                     // e.g. 'tab_role_drift'
  nac_id:   string | null,
  message:  string,
  detail:   Record<string, any>
}
```

Les codes de résultats sont stables entre les versions de correctifs ; de nouveaux codes
n'apparaissent qu'avec les incréments mineurs.

### 10.2 CLI : `npx @nac3/runtime validate <target>`

Encapsule `validate_global` et ajoute une analyse statique de la cohérence
HTML/manifeste. Codes de sortie :

- `0` -- aucun résultat de sévérité supérieure ou égale au seuil configuré.
- `1` -- des résultats ont été trouvés.
- `2` -- la cible elle-même n'a pas pu être chargée.

Utile en CI : `npx @nac3/runtime validate ./dist/index.html
--severity=error`.

---

## 11. L'écosystème autour de NAC3

NAC3 est une couche contractuelle. Pour transformer une page conforme NAC en
application pilotée par la voix, vous avez également besoin de :

1. **Une source de reconnaissance vocale** (SpeechRecognition du navigateur,
   Whisper API, etc.).
2. **Un intermédiaire LLM** qui prend le texte de l'utilisateur, le snapshot
   `NAC.describe()` de la page et un indicateur i18n, puis émet des actions
   structurées : `[{kind: 'click', nac_id: 'X'}, {kind: 'fill', nac_id:
   'Y', value: 'Z'}]`. Voir `guides/LLM_WIRING.md`.
3. **Un client de conversation** qui gère le dialogue et distribue les actions.
   La référence est `js/nac-chat-client.js`.
4. **Un moteur de synthèse vocale** pour les réponses parlées (SpeechSynthesis
   du navigateur, ElevenLabs, etc.).

NAC3 standardise uniquement la forme d'entrée/sortie de l'étape 2 (le snapshot
`NAC.describe()` et la forme des actions). Les étapes 1, 3 et 4 sont hors
spécification ; vous composez librement ce qui vous convient.

---

## 12. Garanties de stabilité

Ce que cette spécification garantit :

1. L'ensemble des rôles canoniques de la section 1 ne sera pas réduit.
   De nouveaux rôles PEUVENT être ajoutés dans les versions mineures.
2. La famille d'événements de la section 6 ne sera pas renommée.
   De nouveaux événements PEUVENT être ajoutés dans les versions mineures.
3. Les signatures de `NAC.click`, `NAC.fill`, etc. ne changeront pas
   dans les versions mineures. De nouveaux champs `opts` optionnels PEUVENT apparaître.
4. Les codes de résultats de `validate_global` ne seront pas réutilisés pour
   des conditions différentes entre les versions mineures.

Ce que cette spécification ne garantit PAS :

1. Le libellé précis des messages d'erreur (ce sont des chaînes du catalogue i18n ;
   les traductions peuvent évoluer).
2. La stratégie DOM pour trouver les éléments (`querySelector` aujourd'hui ;
   pourrait migrer vers un index plus rapide ultérieurement).
3. La structure interne du cache de manifestes. Traitez les manifestes comme
   étant en écriture seule côté hôte, et en lecture seule côté agent.

---

## 13. Questions ouvertes (suivies séparément)

- `data-nac-role="navigation"` devrait-il jamais se résoudre en onglet ?
  Actuellement non (v2.1). La feuille de route v22 plaide pour un rejet plus strict.
- `NAC.click()` devrait-il accepter des identifiants relatifs (par ex. `'./save'` pour
  signifier « save sous le plugin actif ») ? Pas en v2.1 ; envisagé pour la v2.3.
- Les manifestes devraient-ils prendre en charge l'héritage / l'extension entre plugins
  (un manifeste de base étendu par un locataire) ? Suivi comme candidat pour la v3.0.

---

## 13.5 Gouvernance

NAC3 est actuellement géré par Yujin. La spécification est publiée
sous licence Apache 2.0 ; le moteur d'exécution de référence sous MIT. Yujin
s'engage à transférer NAC3 à une fondation neutre (groupe communautaire W3C,
Linux Foundation ou organisme industriel équivalent) si et quand l'adoption
justifie une gouvernance neutre. En attendant, les modifications de la spécification
suivent le processus RFC documenté dans `CONTRIBUTING.md`, avec une période de
commentaires publics d'au moins 14 jours pour tout changement affectant l'API
publique ou les formats d'échange.

Pour les adoptants : la combinaison de licences Apache 2.0 + MIT garantit que
la spécification et le moteur d'exécution survivent à tout changement de statut
juridique de Yujin. Vous pouvez forker l'un ou l'autre, l'exécuter et le distribuer,
aujourd'hui comme après notre disparition. Ce document consigne cet engagement
afin que le chemin vers cette pérennité soit explicite, et non implicite.

---

## 14. Implémentation de référence

L'implémentation canonique est le moteur d'exécution de référence distribué
sous forme de package NPM `@nac3/runtime`. Le moteur est complet pour la v2.1
et inclut :

- `js/nac.js` -- base v1.9 + l'API publique de la section 5.
- `js/nac-v2-extensions.js` -- les primitives brownfield v2.0
  (arbre de portée, capture éphémère, autoRegister, HMAC, isTrusted).
- `js/nac-chat-client.js` -- un client de conversation de référence qui connecte
  la voix, le LLM et le distributeur d'actions.

D'autres implémentations sont les bienvenues (Python pour les moteurs d'automatisation
natifs, Rust pour les agents embarqués, etc.). La spécification, et non le code JS,
fait autorité.

---

*Ce document est la spécification canonique NAC3 v2.1. Toute modification de ce fichier
constitue un changement de spécification et requiert un RFC ; voir `CONTRIBUTING.md`.*

---

*This is a machine translation of the canonical English
version at `/nac-spec/SPEC.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
