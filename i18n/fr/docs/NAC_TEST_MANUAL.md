---
translation_source: docs/NAC_TEST_MANUAL.md
translation_source_hash: 75c7b936593deacfec1dd9689f1093483363cc45f01514ff9c9d8d52e466c9a9
translation_quality: machine_v1
translation_lang: fr
translation_date: 2026-05-11T13:52:15.426546+00:00
---

# Manuel de test NAC3

**Un guide de test standardisé pour toute application conforme à NAC-3.**

Version 1.0 -- 2026-05-11. Référence pour la surface NAC3 v2.2 + aperçu v2.3. À mettre à jour à chaque évolution de la spécification.

Ce document indique à une équipe adoptante quoi tester, comment tester, quoi vérifier, et quoi ignorer. Étape par étape dans le pipeline NAC3 :

```
Comunicacion -> Desambiguacion -> Intencion -> Llamada -> Resultado -> Ack
    (1)             (2)             (3)         (4)         (5)        (6)
```

Ainsi que les préoccupations transversales : constructeur (V22-01), contrat bindAction (V22-02), interopérabilité (v2.3), provenance + sécurité.

La suite de référence Yujin (l'étude de cas en fin de manuel) comprend **175+ tests unitaires + 16 tests e2e Playwright**. Couverture moyenne pondérée du pipeline : **95 %**. Reprenez ce qui vous convient.

---

## 0. Pourquoi ce manuel existe

Chaque équipe adoptant NAC3 construit son corpus de tests from scratch et finit avec une couverture inégale -- l'une a des tests d'événements ack parfaits mais ignore l'intermédiaire LLM ; une autre a des tests Playwright end-to-end mais aucun test unitaire. Ce manuel codifie ce que signifie « tester complètement » une application NAC-3.

Le seuil minimal pour une application certifiée NAC-3 :

| Étape | Obligatoire | Recommandé |
|-------|-----------|-------------|
| 1 Comunicacion | Chemin texte couvert. Test mock STT pour le client de chat. | Corpus TTS réel + lecture audio via Playwright. |
| 2 Desambiguacion | Détecteur de changement de locale testé pour les faux positifs. Forme de snapshotTree vérifiée. | Tolérance des labels par onglet/i18n testée. |
| 3 Intencion | Smoke backend live (ou cassette VCR) pour >= 5 prompts. | Gardes anti-bugs (spécifiques à l'historique de bugs de votre application). |
| 4 Llamada | Chaque fonction publique NAC.* utilisée par votre application, avec les chemins nominal et d'erreur. | drag_drop, edit_field si vous les câblez. |
| 5 Resultado | Effet de bord DOM vérifié pour au moins les 10 verbes principaux exposés par votre application. | Multi-navigateurs via la matrice Playwright. |
| 6 Ack | Chaque famille d'événements produite par vos rôles, avec la forme du detail vérifiée. | Familles longue traîne (breadcrumb, accordion, step). |
| Interop | Si vous exportez/importez via MCP : forme de export_tree + import + proxy + disconnect. | Signature HMAC + garde contre la récursion. |

---

## 1. Organisation de la suite

Nous recommandons cette structure (correspond à la référence Yujin) :

```
packages/<your-app>/
  test/
    smoke.mjs                       artefact integrity + CLI
    v22.mjs                         strict validator + bindAction
    v23-interop.mjs                 cross-app MCP (if you implement)
    stage1-audio.mjs                STT mock + TTS corpus integrity
    stage2-disambiguation.mjs       _detectLangSwitch + tab_by_label + snapshotTree
    stage3-backend.mjs              live (or recorded) backend smoke
    stage4-calls.mjs                every public NAC.* write API
    stage6-ack.mjs                  ack event families
    stage6b-longtail.mjs            breadcrumb/accordion/step/sort/filter/confirm
    fixtures/voice/                 TTS-generated MP3 corpus
      corpus.json                   prompt -> expected outcome
      generate.mjs                  one-shot regen via Google/ElevenLabs
      <locale>/<id>.mp3
tests/
  e2e-nac/
    playwright.config.ts
    specs/
      01-landing.spec.ts            @demos
      02-demo-<name>.spec.ts        @demos one per surface
      08-pipeline-end-to-end.spec.ts @e2e full chat-to-ack
tools/nac/
  test-launch.sh                    orchestrates everything
```

`tools/nac/test-launch.sh` exécute :
- Couche 1 : toutes les suites côté Node enchaînées dans l'ordre, avec arrêt au premier FAIL.
- Couche 1b (optionnel) : smoke backend live (~60s).
- Couche 2 : lint statique via `npx @nac3/runtime validate <dir>`.
- Couche 3 : vérification de cohérence des liens de documentation.
- Couche 4 : intégrité des artefacts de démo.
- Couche 5 : intégrité du package de l'étude de cas.

Objectif : couches 1 + 2 + 3 + 4 + 5 en moins de 10 secondes sur un ordinateur portable.

---

## 2. Étape par étape : quoi tester

### Étape 1 -- Comunicacion (STT + saisie brute)

#### Ce que cette étape couvre

Capture audio, transcription STT, saisie de texte brut dans le client de chat. Le debouncing `_sttBuffer` + `_sttFlushTimer` du client de chat appartient ici. Le court-circuit de changement de locale (`_maybeChangeLocaleLocally`) vit ici aussi.

#### Quoi tester

1. **Mock STT + injection de transcription.** Remplacez `window.SpeechRecognition` par un faux qui déclenche un événement `result` synthétique avec une transcription plantée. Vérifiez que `NacChat.send(transcript)` propage exactement ce texte dans le dispatcher.
2. **Intégrité du corpus TTS.** Générez ~30 prompts audio via Google Cloud TTS / ElevenLabs dans vos 10 locales supportées. Vérifiez que chaque fichier MP3 existe et fait >= 1 Ko. Sert de détecteur de régression pour le corpus lui-même.
3. **Lecture audio réelle (Playwright).** Optionnel. Rejouez un des MP3 du corpus via le mock `getUserMedia`, routez vers le SpeechRecognition du navigateur. Difficile à mettre en place proprement ; à ignorer pour la v1.

#### Quoi vérifier

- Chaque prompt du corpus atteint `NacChat.send()` avec le texte exact.
- Une saisie vide ou composée uniquement d'espaces ne fait pas planter le client de chat.
- Le court-circuit de changement de locale se déclenche pour les prompts correspondant à `_detectLangSwitch` (couvert aussi en Étape 2).

#### Quoi ignorer

- Les flux de permission microphone. C'est de l'UI au niveau navigateur ; ça ne vaut pas un test Playwright.
- La compatibilité des codecs audio entre navigateurs. Restez sur MP3 dans le corpus et un seul navigateur.

---

### Étape 2 -- Desambiguacion

#### Ce que cette étape couvre

`_detectLangSwitch`. Composition et assainissement du snapshot. Tolérance du matcher `tab_by_label`. Tout ce qui transforme du texte brut en « ce que le LLM doit voir / quel raccourci déclencher localement ».

#### Quoi tester

1. **Cas de faux positifs de `_detectLangSwitch`.** C'est la zone sujette aux bugs ; livrez des anti-tests explicites :
   - `'cambia de pestana'` -> reste dans la locale courante.
   - `'cambia precio de mouse 40'` -> reste dans la locale courante.
   - `'borra de la lista'` -> reste.
   - `'pasa de A a B'` -> reste.
2. **Cas positifs de `_detectLangSwitch`.** 12 minimum couvrant les locales supportées :
   - `'cambia a aleman'` -> de
   - `'switch to english'` -> en
   - `'use spanish'` -> es
   - `'cambia idioma a de'` (déclencheur explicite + code nu) -> de
   - Noop même langue.
   - Saisie vide / espaces uniquement.
3. **Tolérance de `tab_by_label`** :
   - Correspondance exacte sur textContent.
   - Correspondance avec suppression des parenthèses (`"Lines (collection)"` correspond à `"Lines"`).
   - Correspondance sur le label i18n de la locale.
   - Label inconnu -> not_found.
4. **Forme de `snapshotTree`.** Retourne `{active, plugins[]}`. Inclut le manifest par plugin. Contient le snapshot de la table de données du plugin actif (si v2.1).

#### Quoi vérifier

- La langue finale après `NacChat.send(text)` correspond à l'attente.
- Le backend a été appelé ou non selon l'attente.
- `tab_by_label` retourne ou lève une exception proprement selon le cas.
- `snapshotTree()` est sérialisable en JSON et de taille bornée.

#### Pièges courants

- Les codes de locale à 2 lettres (`'de'`, `'es'`) entrent en collision avec des prépositions/articles. Testez explicitement les cas pièges.
- Les labels de remplissage de 1-2 caractères dans `label_i18n` provoquent des faux positifs en correspondance partielle. Utilisez des chaînes réalistes.

---

### Étape 3 -- Intencion (intermédiaire LLM)

#### Ce que cette étape couvre

L'aller-retour HTTP entre le client de chat et l'intermédiaire LLM. Le rôle du backend : lire le snapshot `nac_tree` + le prompt, retourner `{message, actions[]}`.

#### Quoi tester

1. **Smoke sur la forme du backend.** Pour un ensemble de prompts canoniques dans vos locales supportées (recommandé >= 15), faites un POST vers l'endpoint et vérifiez :
   - HTTP 200.
   - Réponse JSON avec un booléen `ok`.
   - Si ok : chaîne `message` + tableau `actions`.
   - Chaque `action.kind` est l'un des kinds canoniques.
2. **Gardes anti-bugs.** Pour chaque classe de bug connue dans votre historique, écrivez un test live explicite. Exemple : `'cambia de pestana'` NE DOIT PAS retourner `change_locale: 'de'`.
3. **Garde sur la taille du snapshot.** N'envoyez pas de snapshots > 20 Ko au LLM si vous facturez au token ; le test fait échouer le build si votre arbre dépasse le budget.

#### Quoi ignorer

- Le contenu spécifique des actions LLM. Le LLM est non déterministe ; n'affirmez pas « save déclenchera action_id = X ». Vérifiez uniquement la forme.
- La résilience réseau (timeouts, retries). Appartient aux tests de charge / fiabilité, pas aux tests unitaires / smoke.

#### Live vs VCR

Les tests live sont fragiles face aux coûts LLM et aux limites de débit. Une fois le corpus de prompts stabilisé, enregistrez les réponses sous forme de cassettes VCR (fichiers JSON associant prompt -> réponse) et rejouez-les en CI. La référence Yujin utilise des tests live car le budget permet ~60s/exécution ; passez aux cassettes si votre CI tourne trop souvent.

---

### Étape 4 -- Llamada (APIs d'écriture NAC.*)

#### Ce que cette étape couvre

Chaque fonction publique de `window.NAC` : click, click_by_verb, fill, select, tab, tab_by_label, go_to_section, drag_drop, edit_field, dt_*, bindAction.

#### Quoi tester

Pour chaque fonction que vous utilisez, trois cas :

1. **Chemin nominal.** Montez un élément DOM correspondant à l'id du manifest ; câblez son handler pour émettre l'événement ack canonique ; appelez NAC.<func>(...) et vérifiez qu'il se résout.
2. **not_found.** Appelez avec un id qui n'existe pas ; vérifiez qu'il lève une exception avec le code `'not_found'` (ou `'section_not_found'` pour go_to_section).
3. **Saisie invalide.** Appelez avec des arguments vides ou mal formés ; vérifiez qu'il lève une exception avec le code `'invalid'`.

Pour la famille `dt_*`, en plus :

- `dt_add_row` retourne `{ok, row_id}`.
- `dt_edit_cell` chemin nominal + valeur invalide rejetée (ex. `qty < min`).
- `dt_remove_row` décrémente `dt_state().rows.length`.
- `dt_commit` retourne `{ok, final_state}`.
- `dt_discard` annule les mutations non commitées.

#### Note d'implémentation

Exécutez dans un shim DOM minimal en cours de processus (~150-200 lignes de sous-classe EventTarget) pour ne pas avoir besoin de jsdom ou Playwright pour l'étape 4. Le matcher de sélecteur composé (`[a="b"][c="d"]`) est la seule fonctionnalité que vous devez supporter. Voir `stage4-calls.mjs` dans la suite de référence.

---

### Étape 5 -- Resultado (effet de bord DOM)

#### Ce que cette étape couvre

Ce qui change réellement dans le DOM après un appel NAC.*. Distinct de l'Étape 4 (la fonction a retourné ok) et de l'Étape 6 (l'événement ack a été déclenché).

#### Quoi tester

1. **Mutation DOM par verbe.** Pour vos 10 verbes principaux :
   - `save` -> le formulaire sous-jacent a-t-il été soumis ? Un toast est-il apparu ?
   - `cancel` -> la modale s'est-elle fermée ? Les valeurs du formulaire ont-elles été réinitialisées ?
   - `delete` -> la ligne a-t-elle été supprimée de la liste ?
   - `add_row` -> une nouvelle ligne est-elle visible dans le tableau ?
2. **Tests e2e Playwright par surface.** Un spec par plugin / écran de premier niveau. Montez la surface dans un vrai navigateur, exercez le flux utilisateur canonique, vérifiez l'état du DOM.

#### Quoi ignorer

- Les diffs de captures d'écran pixel par pixel. La régression visuelle a ses propres outils.
- Les performances (fréquence d'images, décalages de mise en page). Appartient aux tests de performance, budget séparé.

---

### Étape 6 -- Famille d'événements Ack

#### Ce que cette étape couvre

Chaque événement `nac:*` écouté par le runtime. Chacun a une forme de detail canonique (plugin + clé d'id + extras optionnels).

#### Quoi tester

Par famille dans `_CLICK_EVENT_FAMILY` :

- `nac:action:succeeded` -- detail.plugin + detail.action_id + detail.is_trusted.
- `nac:action:failed` -- idem + detail.error.
- `nac:field:changed` -- detail.field_id + detail.value.
- `nac:tab:activated` -- detail.tab_id.
- `nac:breadcrumb:navigated` -- detail.breadcrumb_id.
- `nac:accordion:expanded` / `:collapsed` -- detail.accordion_id.
- `nac:step:advanced` -- detail.step_id.
- `nac:table:page_changed` -- detail.page_index.
- `nac:confirm:resolved` / `:cancelled` -- detail.confirm_id.
- `nac:table:sort_changed` -- detail.column_id.
- `nac:table:filter_changed` -- detail.filter_id.

Pour chacun :
1. Montez un élément DOM avec le rôle canonique.
2. Câblez le handler de clic pour émettre l'événement canonique.
3. Appelez `NAC.click(id)` et écoutez l'événement.
4. Vérifiez la forme du detail.

En plus :
- **Timing click-to-resolve.** Le listener du runtime doit se résoudre dans les 200ms suivant le déclenchement de l'ack. Tout délai supérieur est un bug du runtime.
- **`bindAction`** émet automatiquement l'ack après un handler synchrone.
- **Résolution async de `bindAction`** -- émet automatiquement après la résolution de la Promise.
- **Throw de `bindAction`** -> émet automatiquement `nac:action:failed` avec detail.error.

---

### V22-01 -- Validateur strict du constructeur

`NAC.STRICT_VALIDATION = true` fait lever une exception par `NAC.register` dans les cas suivants :

- `manifest_role_unknown` -- rôle hors de l'ensemble canonique.
- `tab_id_manifest_role_drift` -- l'id correspond à `^tab\.` mais le rôle n'est pas `'tab'`.
- `manifest_dom_role_mismatch` -- le DOM monté a un rôle différent de celui déclaré dans le manifest.

Testez chaque cas en :
1. Définissant `STRICT_VALIDATION = true`.
2. Appelant `register` avec un manifest conçu pour violer la règle.
3. Vérifiant qu'il lève une exception avec `code: 'strict_validation'` et `findings: [...]`.

Sans mode strict : vérifiez que `console.error` a été émis (capturez via un spy sur `console.error`).

---

### V22-02 -- Helper bindAction

Déjà couvert ci-dessus à l'Étape 6, mais : écrivez au moins 5 tests explicites :

1. Handler synchrone -> l'ack se déclenche.
2. Handler qui lève une exception -> l'événement failed se déclenche + l'erreur est relancée.
3. Handler async qui se résout -> l'ack se déclenche après la résolution.
4. `bindAction` retourne un unbinder ; l'appeler arrête l'émission.
5. ctx manquant (pas de plugin ou action_id) -> lève une exception avec `code: 'invalid'`.

---

### Interop -- aperçu v2.3

Si votre application exporte / importe des arbres NAC3 via MCP :

1. **Forme de export_tree.** Retourne `{app_id, app_version, nac_version, exported_at, active_plugin, manifests, scope_tree, data_tables, state, ack_endpoint}`.
2. **Filtres de export_tree.** `scope: 'plugin_slug:<slug>'` retourne uniquement ce plugin. `scope: 'active_plugin'` retourne uniquement l'actif. `include_locales: ['en','es']` retourne uniquement ces locales.
3. **Validation de import_remote_tree.** Bearer ou endpoint manquant lève `invalid`. Namespace dupliqué lève `conflict`.
4. **Enregistrement de plugin avec namespace.** Après import, `NAC.list_registered_plugins()` inclut `remote:<ns>:<slug>`.
5. **Dispatch proxy.** `NAC.click('remote:<ns>:...')` déclenche un `fetch` vers l'endpoint du pair avec `bearer` + `nac_id` (local au pair, sans préfixe) + `action.kind`.
6. **Miroir ack local.** Après un proxy réussi, un `nac:action:succeeded` local se déclenche avec `detail.via_interop: true` + `detail.is_trusted: false`.
7. **Remontée des erreurs du pair.** Le pair retourne `{ok: false, error: {code: '...', message: '...'}}` -> le client lève une exception avec le code du pair.
8. **disconnect_remote.** Efface le namespace ; un `NAC.click('remote:...')` ultérieur lève not_found.
9. **Les clics locaux ne passent pas par le proxy.** Contrat critique : une fois la couche interop installée, appeler NAC.click sur un id LOCAL ne doit PAS déclencher de fetch.

---

## 3. Recommandations d'outillage

### Lanceur de tests

- **Node + modules ESM simples** pour les étapes 2 à 6. Pas de Jest, pas de
  Vitest -- 200 lignes de `assert(name, ok)` suffisent et
  introduisent moins de dépendances.
- **Playwright** pour les tests e2e de l'étape 5 + la lecture audio de l'étape 1 si
  vous la couvrez.

### CI

- N'exécutez pas les tests de fumée sur le backend en direct (étape 3) à chaque push -- ~60s
  par exécution x fréquence des merges = coût réel. Exécutez-les lors de :
  - Déclenchement manuel (`gh workflow run`).
  - Cron nocturne.
  - Avant de taguer une release.
- Exécutez les étapes 1, 2, 4, 6 + le harnais à chaque push. Budget
  total : moins de 15s.

### Rapport de couverture

Maintenez un fichier `docs/COVERAGE_REPORT_<date>.md` par release. Mettez à jour
le tableau au cas par cas. Incluez la moyenne pondérée du pipeline.
La référence Yujin se trouve dans
`yujin.app/nac-spec/docs/COVERAGE_REPORT_2026_05_10.md`.

---

## 4. Anti-patterns à éviter

1. **Vérifier le contenu des actions LLM.** Non déterministe.
   Testez la FORME, pas les VALEURS.
2. **Simuler le DOM à l'étape 5.** L'étape 5 porte sur la mutation réelle du DOM ;
   utilisez Playwright, pas un shim.
3. **Couverture par ligne, pas par étape.** Le nombre de lignes de code couvertes
   ne dit rien sur le bon fonctionnement du pipeline. Utilisez
   la matrice par étape.
4. **Uniquement les cas nominaux à l'étape 4.** Not_found + entrée invalide représentent
   la moitié du contrat.
5. **Ignorer l'étape 6.** L'événement ack est la partie du spec la plus souvent
   violée dans le code des adoptants. Testez chaque famille que
   vous émettez.
6. **Pas de garde-fous contre les bugs.** Chaque bug de production corrigé dans votre application
   doit avoir un test de régression permanent. Le cas 'cambia de pestana'
   est définitivement dans notre étape 2.
7. **Tests en direct à chaque push.** Consomme le budget ; instable en raison de
   la variabilité des services tiers.

---

## 5. Étude de cas -- la suite de référence Yujin

Tous les liens vers les sources de tests ci-dessous pointent vers les fichiers canoniques sur
GitHub.

| Suite | Source | Tests | Durée |
|-------|--------|-------|-------|
| smoke | [packages/nac/test/smoke.mjs](https://github.com/pkuschnirof/rpaforce-crm/blob/main/packages/nac/test/smoke.mjs) | 36 | < 1s |
| v22 | [packages/nac/test/v22.mjs](https://github.com/pkuschnirof/rpaforce-crm/blob/main/packages/nac/test/v22.mjs) | 14 | < 1s |
| v23-interop | [packages/nac/test/v23-interop.mjs](https://github.com/pkuschnirof/rpaforce-crm/blob/main/packages/nac/test/v23-interop.mjs) | 14 | < 2s |
| stage1-audio | [packages/nac/test/stage1-audio.mjs](https://github.com/pkuschnirof/rpaforce-crm/blob/main/packages/nac/test/stage1-audio.mjs) | 33 | < 1s |
| stage2-disambiguation | [packages/nac/test/stage2-disambiguation.mjs](https://github.com/pkuschnirof/rpaforce-crm/blob/main/packages/nac/test/stage2-disambiguation.mjs) | 31 | < 1s |
| stage3-backend (live) | [packages/nac/test/stage3-backend.mjs](https://github.com/pkuschnirof/rpaforce-crm/blob/main/packages/nac/test/stage3-backend.mjs) | ~150 (10 locales x 3 prompts) | ~120s |
| stage4-calls | [packages/nac/test/stage4-calls.mjs](https://github.com/pkuschnirof/rpaforce-crm/blob/main/packages/nac/test/stage4-calls.mjs) | 31 | ~2s |
| stage6-ack | [packages/nac/test/stage6-ack.mjs](https://github.com/pkuschnirof/rpaforce-crm/blob/main/packages/nac/test/stage6-ack.mjs) | 16 | < 1s |
| stage6b-longtail | [packages/nac/test/stage6b-longtail.mjs](https://github.com/pkuschnirof/rpaforce-crm/blob/main/packages/nac/test/stage6b-longtail.mjs) | 14 | < 1s |
| Générateur de corpus TTS | [packages/nac/test/fixtures/voice/generate.mjs](https://github.com/pkuschnirof/rpaforce-crm/blob/main/packages/nac/test/fixtures/voice/generate.mjs) | -- | one-shot |
| Catalogue du corpus TTS | [packages/nac/test/fixtures/voice/corpus.json](https://github.com/pkuschnirof/rpaforce-crm/blob/main/packages/nac/test/fixtures/voice/corpus.json) | 30 prompts | -- |
| Harnais | [tools/nac/test-launch.sh](https://github.com/pkuschnirof/rpaforce-crm/blob/main/tools/nac/test-launch.sh) | 5 couches | ~10s |
| **Total côté Node** | | **259+** | **~10s + 120s en option** |

Plus 16 specs e2e Playwright (~54s) :

| Spec | Source | Tests | Tag |
|------|--------|-------|-----|
| 01-landing | [tests/e2e-nac/specs/01-landing.spec.ts](https://github.com/pkuschnirof/rpaforce-crm/blob/main/tests/e2e-nac/specs/01-landing.spec.ts) | 2 | @demos |
| 02-demo-v19 | [tests/e2e-nac/specs/02-demo-v19.spec.ts](https://github.com/pkuschnirof/rpaforce-crm/blob/main/tests/e2e-nac/specs/02-demo-v19.spec.ts) | 1 | @demos |
| 03-demo-v20 | [tests/e2e-nac/specs/03-demo-v20.spec.ts](https://github.com/pkuschnirof/rpaforce-crm/blob/main/tests/e2e-nac/specs/03-demo-v20.spec.ts) | 2 | @demos |
| 04-demo-v21-datatable | [tests/e2e-nac/specs/04-demo-v21-datatable.spec.ts](https://github.com/pkuschnirof/rpaforce-crm/blob/main/tests/e2e-nac/specs/04-demo-v21-datatable.spec.ts) | 3 | @demos |
| 05-demo-v22-interop | [tests/e2e-nac/specs/05-demo-v22-interop.spec.ts](https://github.com/pkuschnirof/rpaforce-crm/blob/main/tests/e2e-nac/specs/05-demo-v22-interop.spec.ts) | 1 | @demos |
| 06-demo-react-study-case | [tests/e2e-nac/specs/06-demo-react-study-case.spec.ts](https://github.com/pkuschnirof/rpaforce-crm/blob/main/tests/e2e-nac/specs/06-demo-react-study-case.spec.ts) | 2 | @study |
| 07-demo-angular-study-case | [tests/e2e-nac/specs/07-demo-angular-study-case.spec.ts](https://github.com/pkuschnirof/rpaforce-crm/blob/main/tests/e2e-nac/specs/07-demo-angular-study-case.spec.ts) | 2 | @study |
| 08-pipeline-end-to-end | [tests/e2e-nac/specs/08-pipeline-end-to-end.spec.ts](https://github.com/pkuschnirof/rpaforce-crm/blob/main/tests/e2e-nac/specs/08-pipeline-end-to-end.spec.ts) | 3 | @e2e |
| Config | [tests/e2e-nac/playwright.config.ts](https://github.com/pkuschnirof/rpaforce-crm/blob/main/tests/e2e-nac/playwright.config.ts) | -- | -- |
| **Total Playwright** | | **16** | |

**Total général : 205+ tests** couvrant l'intégralité du pipeline, de
la saisie dans le chat jusqu'à l'événement ack, avec une couverture pondérée moyenne
de **95%**.

### Couverture par étape (référence Yujin, 2026-05-11)

| Étape | Suite qui la couvre | Couverture |
|-------|---------------------|------------|
| 1 Comunicacion | stage1-audio.mjs | 85% |
| 2 Desambiguacion | stage2-disambiguation.mjs | 95% |
| 3 Intencion | stage3-backend.mjs (LLM en direct) | 85% |
| 4 Llamada | stage4-calls.mjs | 95% |
| 5 Resultado | tests/e2e-nac/specs/*.spec.ts (Playwright) | 95% |
| 6 Ack | stage6-ack.mjs + stage6b-longtail.mjs | 100% |
| Interop (v2.3) | v23-interop.mjs + 05-demo-v22-interop.spec.ts | 100% |
| Constructor (V22-01) | v22.mjs | 100% |
| bindAction (V22-02) | v22.mjs | 100% |
| **Moyenne pondérée** | | **~95%** |

### Bugs détectés par le corpus de tests

Le corpus de tests a mis en évidence, durant le développement, deux vrais bugs
d'exécution qui ont été corrigés dans la même branche :

1. **Correspondance `tab_by_label` trop permissive.** L'implémentation d'origine
   acceptait toute correspondance `indexOf` bidirectionnelle. Un libellé d'un seul caractère (`'a'`)
   dans `label_i18n` pouvait correspondre à n'importe quelle requête d'au moins 1 caractère.
   Le test B4 de l'étape 2 l'a détecté. Correction : exiger que le candidat et
   la requête fassent tous deux >= 3 caractères pour une correspondance partielle ; l'égalité exacte
   reste toujours autorisée.

2. **Absence de l'assistant d'introspection `list_registered_plugins`.**
   La couche d'interop `export_tree` itère le registre du manifeste
   pour produire sa charge utile. Le runtime ne disposait d'aucune API publique
   pour lister les plugins enregistrés indépendamment de l'état de montage du DOM.
   Détecté lors de l'écriture de la suite v23-interop. Correction :
   ajout de `NAC.list_registered_plugins()` retournant
   `Object.keys(_manifests)`.

Les deux corrections ont été livrées dans `js/nac.js` sur la même branche.

### Guide d'adoption -- adopter cette suite

1. **Copiez d'abord l'infrastructure de tests.** Shim + helpers + harnais de `packages/nac/test/`.
   Exécutez les tests existants pour vérifier.
2. **Remplacez le corpus de tests par la surface de votre application.** Vos
   slugs de plugins, vos verbes, vos data-tables. Conservez l'organisation
   par étape du pipeline.
3. **Générez votre corpus TTS** via
   `packages/nac/test/fixtures/voice/generate.mjs`. Fournissez
   votre clé Google Cloud TTS ou ElevenLabs via une variable d'environnement.
4. **Branchez `tools/nac/test-launch.sh`** sur votre CI. Couches 1 à 5
   en pré-merge ; couche backend 1b en option ou en nocturne.
5. **Maintenez un rapport de couverture.** Mettez-le à jour à chaque release.

### Licence

Ce manuel est sous licence Apache-2.0, comme le reste du spec NAC3.
Copiez, forkez, redistribuez.

---

## 6. Pour aller plus loin

- [SPEC.md](../SPEC.md) -- le contrat canonique que Yujin teste.
- [SECURITY.md](../SECURITY.md) -- modèle de menace + provenance.
- [COVERAGE_REPORT_2026_05_10.md](COVERAGE_REPORT_2026_05_10.md)
  -- le rapport de référence en vigueur.
- [LAUNCH_PLAN_2026_05_10.md](LAUNCH_PLAN_2026_05_10.md) -- le
  playbook de lancement autonome de Sumi dans lequel ce corpus de tests a été
  élaboré.

*Ce document évolue avec le spec NAC3. Soumettez vos modifications via une PR
contre `yujin.app/nac-spec/docs/NAC_TEST_MANUAL.md`.*

---

*This is a machine translation of the canonical English
version at `/nac-spec/docs/NAC_TEST_MANUAL.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
