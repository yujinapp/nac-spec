---
translation_source: docs/NAC_V22_ROADMAP.md
translation_source_hash: 8d844659a0ed290a00c015c5b2e875d6d9b3d52b18f02f8c182169927d3d4750
translation_quality: machine_v1
translation_lang: fr
translation_date: 2026-05-11T13:48:42.464584+00:00
---

# NAC3 v2.2 -- feuille de route

NAC3 = **Native Agent Contract**.

Démarré le 2026-05-09. Ce fichier accumule les éléments d'évolution pour
la prochaine version mineure de la spécification NAC3. Chaque section est
autonome : énoncé du problème, classe de bug évitée, modification de contrat
proposée et notes d'implémentation.

**État au 2026-05-10 :** v2.2 LIVRÉE. Les éléments V22-01 +
V22-02 + V22-03 + V22-04 sont tous intégrés dans `js/nac.js` + le package NPM
`@nac3/runtime` 2.2.0. Ce fichier fait désormais office de changelog canonique
pour cette version.

| Élément | Statut | Commit |
|---------|--------|--------|
| V22-01 validateur strict | LIVRÉ | 6c2b1866 |
| V22-02 helper bindAction | LIVRÉ | 6c2b1866 |
| V22-03 durcissement du détecteur de locale | LIVRÉ 2026-05-09 | f631d77a |
| V22-04 normalisation des parenthèses dans tab_by_label | LIVRÉ 2026-05-09 | f631d77a |
| V23-01 primitive d'édition de champ (aperçu) | DÉMO LIVRÉE 2026-05-11 | (example-v23-editor.php + packages/nac/test/v23-editor.mjs 8/8 PASS) |

---

## V22-01 -- Le constructeur (`NAC.register`) devient un validateur strict

**Classe de problème.** Les démos sur des bases existantes peuvent déclarer
des éléments de manifeste avec des valeurs de rôle non canoniques
(`role:'navigation'` sur un onglet, `role:'button'` au lieu de `'action'`,
etc.). Le constructeur actuel accepte n'importe quelle forme reçue et la
stocke telle quelle. Le bug ne se manifeste qu'à l'exécution, lorsque l'API
(`NAC.tab()`, `NAC.tab_by_label()`, `NAC.click()`) ne trouve pas l'élément,
car la requête DOM canonique (`[data-nac-role="tab"]`) ne correspond pas. À ce
stade, la démo est déjà déployée, l'utilisateur a déjà déclenché la commande
vocale défaillante, et le runtime lève correctement `tab X missing` -- une
erreur trompeuse puisque l'élément EST bien dans le DOM, simplement sous le
mauvais rôle.

**Déclencheur concret (2026-05-09).** Pablo dicte `ve a pestana
permisos` sur `example-v21-data-table.php`. Le LLM résout en
`NAC.tab('invoice_edit_modal','tab.permissions')`. Le bouton existe dans le
DOM mais avec `data-nac-role="navigation"` (défini ainsi par l'auteur de la
démo pour des raisons de sémantique HTML : les onglets SONT de la navigation).
Le runtime lève « tab tab.permissions missing » alors que le bouton est bien
présent. La même cause racine avait provoqué l'échec de
`tab_by_label('Lines (collection)')` plus tôt dans la même session.

**Pourquoi trois couches de protection auraient dû l'intercepter, mais ne l'ont pas fait.**

| Couche | Devrait détecter… | Comportement actuel |
|--------|-------------------|---------------------|
| Lint pré-commit | dérive de rôle dans les fichiers de démo PHP/HTML | n'existe pas |
| `NAC.register(manifest)` (à l'enregistrement) | rôles non canoniques, incohérence id/rôle | accepte tout silencieusement |
| `NAC.validate_global()` (au lint) | dérive de rôle dans `m.elements[]` | vérifie uniquement la présence de `m.tabs[]` |

La couche API runtime (`NAC.tab` etc.) est la **quatrième** protection,
et la seule qui se déclenche aujourd'hui -- sous forme d'erreur runtime
visible par l'utilisateur final. C'est là que le coût est le plus élevé.

**Modification de contrat proposée pour v2.2.**

`NAC.register` DOIT valider le manifeste avant de le stocker.
Règles de validation :

1. **Énumération des rôles connus.** Chaque `m.elements[i].role` doit
   appartenir à l'ensemble des rôles canoniques (étend
   `_CLICK_EVENT_FAMILY`) :

   ```
   action, field, option, tab, breadcrumb-item, accordion-toggle,
   step, pagination-item, confirm-button, sort-control,
   filter-control, data-table, plugin, section, region,
   navigation, banner, complementary, contentinfo, button
   ```

   Rôles inconnus -> `console.error` + rejet de l'appel à register.
   Les rôles de point de repère (`navigation`, `banner`, etc.) sont acceptés
   mais uniquement sur des éléments dont le nœud DOM correspondant est un
   conteneur de région, et non un widget cliquable.

2. **Cohérence id/rôle.** Si `e.id` correspond à `^tab\.`, alors
   `e.role === 'tab'` est requis. Si `e.id` correspond à
   `^modal\.`, alors `e.role === 'action'` (ou le sous-rôle de l'action)
   est requis. Toute incohérence -> `console.error` + rejet. La grammaire
   du champ id est également un contrat ; elle est aujourd'hui implicite.

3. **Cohérence DOM (au mieux).** Lorsque `register` est appelé après
   l'analyse du DOM (le chemin habituel), rechercher
   `[data-nac-id="<e.id>"]` dans le DOM. Si trouvé et que son
   `data-nac-role` diffère de `e.role`, `console.error` + rejet. Cela
   couvre le cas rencontré par Pablo le 2026-05-09 : le manifeste indique
   `role:'tab'` mais le HTML indique toujours `data-nac-role="navigation"`
   (ou inversement). Lorsqu'il est appelé avant que le DOM soit prêt,
   différer la vérification à une passe ultérieure sur `DOMContentLoaded`.

4. **Helper de migration (fenêtre d'une version).** Pour v2.2.0, les
   règles ci-dessus produisent un `console.error` mais NE lèvent PAS
   d'exception -- les adoptants ont besoin d'une fenêtre pour migrer.
   À partir de v2.3.0, elles lèveront une `RegisterError` et le manifeste
   sera rejeté. Suivi dans le runtime via le flag `NAC.STRICT_VALIDATION`,
   dont la valeur par défaut est `false` en v2.2 et `true` en v2.3.

**Extension de `NAC.validate_global()`.**

Ajout de trois nouveaux résultats :

- `manifest_role_unknown` -- le rôle d'un élément est hors de l'ensemble
  canonique.
- `manifest_dom_role_mismatch` -- le rôle défini dans le manifeste pour
  `<id>` diffère de l'attribut `data-nac-role` dans le DOM.
- `tab_role_drift` -- un `<button>` (ou tout élément cliquable) dans le
  DOM possède `data-nac-id="tab.X"` mais `data-nac-role` n'est pas
  `"tab"` -- qu'une entrée de manifeste existe ou non. Détecte les dérives
  purement HTML que le validateur de manifeste manque par définition.

Chaque résultat porte la sévérité `error` par défaut ;
`{ kind: 'warn' }` est substituable par projet.

**Lint pré-commit (livrable séparé, bloque la même dérive).**

Un nouveau script node `tools/nac/check_demos.mjs` lit chaque fichier
`*.php` et `*.html` dans `yujin.app/nac-spec/`, construit un pseudo-DOM
via cheerio (ou regex pour la variante allégée), extrait chaque appel
`NAC.register({...})` des scripts inline, et vérifie les mêmes règles de
cohérence. Connecté à GitHub Actions et à un hook git `pre-commit` local.
Bloque le commit en cas d'échec d'une règle.

**Estimation de l'effort.**

| Tâche | Où | Effort |
|-------|----|--------|
| Mode strict de `NAC.register` | `js/nac.js` | 2h |
| Nouveaux résultats dans `validate_global` | `js/nac.js` | 2h |
| Script de lint pré-commit | `tools/nac/check_demos.mjs` | 4h |
| Passage de migration sur les démos existantes | `example-v*.php` | 1h |
| Mises à jour de la doc dans la spec | `docs/spec.md` etc. | 1h |
| Tests + câblage CI | `tests/` + `.github/workflows/` | 2h |

Total : ~12h concentrées.

**Compatibilité ascendante.**

Les notes de version v2.2 doivent déclarer :
- `NAC.register` émet désormais un `console.error` en cas de dérive de rôle
  (sans lever d'exception).
- v2.3 commencera à lever une `RegisterError` dans les mêmes conditions.
- Les adoptants doivent exécuter `NAC.validate_global()` avant de mettre en
  production.

Le chemin de migration pour les 6 démos existantes dans ce dépôt est
déjà effectué depuis le commit `0633e080` (2026-05-09) : les boutons
d'onglets de la démo v21 et leur manifeste ont été corrigés en `role:'tab'`.

---

## V22-02 -- Application du contrat action-ack

**Classe de problème.** Les gestionnaires de clic qui effectuent leur travail de manière synchrone doivent appeler `dispatchEvent(new CustomEvent('nac:action:succeeded', {detail:{plugin,action_id}}))` après l'effet de bord. Les panneaux brownfield l'oublient souvent. Le runtime fait alors expirer le poll d'ack de 5s alors que l'effet de bord s'est déjà produit, et le chat ou l'agent signale `No pude ejecutar X: timeout`.

**Déclencheur concret (2026-05-09).** Pablo : `hide` -> le panneau se masque correctement, le chat affiche "No pude ejecutar v20_panel.toggle: timeout". Idem pour chaque bouton du v20-panel.

**L'ancien contournement était incorrect.** Le commit `ad200e4c` traitait silencieusement `err.code === 'timeout'` comme un succès dans la boucle agentique du chat. Pablo a signalé à juste titre que cela masquait de vraies erreurs (gestionnaire bloqué, race condition réseau, exception non gérée) et cassait le seul signal fiable du runtime. Annulé dans `c9bf2bdb`.

**Le bon correctif est déjà livré.** Encapsulation de `bind()` dans `example-v20-full.php` pour émettre automatiquement `nac:action:succeeded`/`nac:action:failed` après chaque gestionnaire. Effectué dans `c9bf2bdb`.

**Modification de contrat proposée pour v2.2.**

Le runtime DEVRAIT fournir un helper :

```js
NAC.bindAction(el, handler, { plugin, action_id })
```

qui prend en charge l'émission de l'ack automatiquement. Même interface que `addEventListener('click', handler)` mais avec le contrat de conformité intégré. Les démos qui adoptent ce helper ne peuvent plus l'oublier.

`validate_global` ajoute un nouveau résultat :

- `action_handler_without_ack` -- détecté par instrumentation : lors de `validate_global`, le validateur envoie un clic synthétique sur chaque élément `data-nac-role="action"` dans un contexte contrôlé, écoute `nac:action:succeeded` pendant 500ms, et signale ceux qui ne le déclenchent pas.

Ce résultat est opt-in (`NAC.validate_global({ probe: true })`) car les clics synthétiques ont des effets de bord.

**Charge de travail.** ~3h pour le helper + ~4h pour le résultat basé sur la sonde.

---

## V22-03 -- Renforcement du détecteur de changement de locale

**Classe de problème.** Les codes de locale à 2 lettres bruts dans le détecteur de langue du client chat (`'de'`, `'es'`, `'en'`) entrent en collision avec des prépositions et des articles dans plusieurs langues. `cambia DE pestana` faisait passer le chat en allemand.

**Le correctif est déjà livré.** La fonction `_detectLangSwitch` de `nac-chat-client.js` exige désormais que les codes à 2 lettres bruts coexistent avec un `LOCALE_TRIGGER` explicite (`idioma`/`language`/`sprache`/...). Effectué dans `f631d77a`.

**Proposé pour v2.2.** Déplacer le détecteur de locale hors du client chat vers une primitive NAC3, afin que chaque intégration chat brownfield bénéficie du même détecteur renforcé. Documenter explicitement la classe de faux positifs dans la spec pour que les implémentations futures ne réintroduisent pas le bug.

**Charge de travail.** ~2h.

---

## V22-04 -- Tolérance au langage naturel pour `tab_by_label`

**Déjà intégré.** La suppression des parenthèses (`"Lines (collection)"` correspond à `"Lines"` et `"Lines tab"`) a été livrée dans `f631d77a`. Il ne s'agit **pas** d'un mécanisme de repli legacy -- c'est une normalisation légitime du texte de bouton cité par un LLM. À documenter dans la spec comme comportement canonique du matcher.

**Charge de travail.** ~1h documentation uniquement.

---

## Hors périmètre pour v2.2 (reporté à v2.3+)

- Hiérarchies de rôles composables (`role:'tab.primary'` vs `role:'tab.secondary'`) : intéressant mais sans déclencheur concret.
- Rechargement à chaud du manifest : encore rare ; le rechargement de page actuel convient.
- Recherche de libellés multi-locale sur les 10 locales simultanément (aujourd'hui le matcher les itère en série, ce qui convient pour ~20 onglets par plugin).

---

## V23-01 -- Primitive d'édition de champ (préversion livrée)

**Classe de problème.** Les runners vocaux et les agents n'ont aucun moyen général de manipuler finement le texte dans un `<input>` ou un `<textarea>` -- ils ne peuvent qu'utiliser `NAC.fill(id, value)` qui remplace tout le contenu. Les tâches réelles (corriger la grammaire dans un paragraphe, remplacer uniquement la sélection, améliorer une phrase par IA) nécessitent des verbes plus granulaires. Aujourd'hui, chaque adoptant qui en a besoin développe sa propre solution.

**Solution.** Une nouvelle primitive runtime `NAC.edit_field(nac_id)` ouvre une modale qui possède la surface d'édition et enregistre son propre plugin `nac_editor` avec 8 verbes canoniques :

| Verbe | Description |
|-------|-------------|
| `select_word` | sélectionner le mot au niveau du curseur |
| `select_sentence` | sélectionner la phrase au niveau du curseur |
| `select_all` | sélectionner tout le texte |
| `replace` | remplacer la sélection par le texte fourni |
| `delete_selection` | supprimer la sélection courante |
| `ai_correct_syntax` | envoyer la valeur courante au backend chat via POST, remplacer par la version corrigée par IA |
| `save` | écrire dans le champ source, fermer la modale |
| `cancel` | abandonner, fermer la modale |

Le manifest de la modale est enregistré de manière idempotente (plusieurs appels à `edit_field` partagent un seul plugin `nac_editor`). Tous les verbes portent `label_i18n` pour les 10 locales.

**Statut :**
- Runtime : LIVRÉ le 2026-05-10 dans `js/nac.js` (fonctions `edit_field` + `_editorRegisterManifest` + gestionnaires modaux émettant les acks).
- Démo : LIVRÉE le 2026-05-11 dans `example-v23-editor.php` (3 champs éditables + compteurs de verbes en direct reliés à `nac:action:succeeded`).
- Tests : LIVRÉS le 2026-05-11 dans `packages/nac/test/v23-editor.mjs` (8/8 PASS) : existence + exception sur id invalide + exception sur rôle invalide + montage de la modale + enregistrement du plugin + idempotence + fermeture sur cancel + fermeture sur save.
- Spec : section à ajouter dans SPEC.md sec 13 dans le cadre du cycle GA v2.3.

**Charge de travail jusqu'au GA.** Au-delà de ce qui est déjà intégré : révision des libellés en locale native pour ja/zh/ar/hi (~2h), spec visuelle Playwright e2e (~3h), texte de spec dans SPEC.md (~2h).

---

## Comment les éléments passent de ce document à la spec

1. Implémenter et livrer le changement runtime derrière un feature flag.
2. Mettre à jour les démos pour qu'elles passent la nouvelle validation stricte.
3. Laisser en production pendant au moins un cycle de release avec le flag par défaut à `warn` (non bloquant).
4. Déplacer la règle dans `docs/spec.md` et passer le défaut à `error` (bloquant) dans la prochaine version mineure.
5. Rayer l'entrée de cette roadmap et ajouter une entrée d'une ligne dans `docs/CHANGELOG.md`.

---

*This is a machine translation of the canonical English
version at `/nac-spec/docs/NAC_V22_ROADMAP.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
