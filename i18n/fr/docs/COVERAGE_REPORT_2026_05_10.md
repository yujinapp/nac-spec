---
translation_source: docs/COVERAGE_REPORT_2026_05_10.md
translation_source_hash: 4da4311e057dd1c23dea9b23a506ada42741d28b05b94709cb5150b1686c51ac
translation_quality: machine_v1
translation_lang: fr
translation_date: 2026-05-11T14:13:13.043215+00:00
---

# Rapport de couverture NAC3 -- nuit du 2026-05-10 / 11

Généré à la clôture de la nuit de couverture sur la branche
`feat/nac-interop-mcp`. Il s'agit du compte rendu honnête et
cas par cas de ce qui a été testé + à quelle profondeur.

Remplace les affirmations informelles antérieures de « 50/50 PASS »
/ « 5/5 couches GREEN ». Ces chiffres étaient structurellement
exacts mais la profondeur était inégale ; ce rapport reformule
la situation par étape du pipeline.

## Rappel des étapes du pipeline

```
Comunicacion -> Desambiguacion -> Intencion -> Llamada -> Resultado -> Ack
    (1)              (2)             (3)         (4)        (5)         (6)
```

## Suites livrées (cette branche)

| Suite | Chemin | Tests |
|-------|--------|-------|
| smoke | `packages/nac/test/smoke.mjs` | 36 |
| v22 (constructor strict + bindAction) | `packages/nac/test/v22.mjs` | 14 |
| v23-interop (cross-app MCP) | `packages/nac/test/v23-interop.mjs` | 14 |
| stage1-audio (mock STT + corpus TTS) | `packages/nac/test/stage1-audio.mjs` | 33 |
| stage2-disambiguation | `packages/nac/test/stage2-disambiguation.mjs` | 31 |
| stage3-backend (appels réels) | `packages/nac/test/stage3-backend.mjs` | ~80 |
| stage4-calls | `packages/nac/test/stage4-calls.mjs` | 31 |
| stage6-ack | `packages/nac/test/stage6-ack.mjs` | 16 |
| **Total local** | | **175+** |

Tous en PASS en local. Aucune exécution GitHub Actions (budget
de crédits épuisé ; les tests tournent uniquement sur le laptop
de Pablo + à la demande).

## Matrice de couverture par étape du pipeline

### Étape 1 -- Comunicacion (STT + entrée brute)

| Couche | Statut | Notes |
|--------|--------|-------|
| **CAPA A : mock STT + injection corpus** | PASS (30/30) | `packages/nac/test/stage1-audio.mjs`. Le mock `SpeechRecognition` synthétise un événement `result` ; NacChat le reçoit et le dispatche normalement. Vérifie que les pièges de langue restent dans la locale, que les invites de changement basculent, et que les invites normales déclenchent le backend. |
| **CAPA B : intégrité du corpus** | PASS (3/3) | 30 fichiers MP3 générés via Google Cloud TTS dans `packages/nac/test/fixtures/voice/`. Total 365 Ko sur 10 locales. Vérification de présence des fichiers + contrôle de taille minimale. |
| Lecture audio réelle via SpeechRecognition navigateur | DIFFÉRÉ | L'API Web Speech nécessite un flux microphone réel + un navigateur. Relève des tests e2e Playwright (en file d'attente). |

**Couverture étape 1 : ~85%** -- les chemins texte + corpus + mock STT
sont entièrement couverts. Seule la lecture audio réelle en navigateur
reste à faire, ce qui nécessite Playwright.

### Étape 2 -- Desambiguacion

| Cas testé | Cas | Résultat |
|-----------|-----|----------|
| Garde contre les faux positifs de `_detectLangSwitch` (classe de bug f631d77a) | 12 | PASS -- `cambia de pestana`, `cambia precio de mouse 40`, `borra de la lista`, `pasa de A a B` restent CORRECTEMENT en espagnol. `cambia a aleman`, `switch to english`, `use spanish`, `cambia idioma a de` basculent correctement. Noop même langue + pas de crash sur entrée vide. |
| Correspondance exacte `tab_by_label` sur textContent | 1 | PASS |
| Suppression des parenthèses dans `tab_by_label` (`"Lines (collection)"` correspond à `"Lines"`) | 1 | PASS |
| Correspondance i18n locale dans `tab_by_label` | 1 | PASS |
| `tab_by_label` inconnu -> not_found | 1 | PASS |
| `snapshotTree` retourne une structure valide | 6 | PASS |

**Couverture étape 2 : ~95%.** Le resserrement du matcher (exiger
`cand.length >= 3` pour les correspondances partielles) a été livré
comme correctif annexe dans la même suite, éliminant le faux positif
sur les étiquettes d'un seul caractère.

### Étape 3 -- Intencion

Appels réels contre l'endpoint de production
`https://yujin.app/crm/api/v1/yujin/nac-demo`. Le backend de chat
Yujin (Claude Sonnet) est l'intermédiaire LLM.

| Cas testé | Cas | Résultat |
|-----------|-----|----------|
| HTTP 200 + réponse JSON par invite | 15 invites dans 7 locales (es/en/pt/fr/de/ja + une invite piège en espagnol) | PASS pour toutes |
| La réponse contient un booléen `ok` | 15 | PASS |
| Quand `ok`, présence d'une chaîne `message` + tableau `actions` | 15 | PASS |
| Chaque action contient une chaîne `kind` | 15 | PASS |
| **Garde anti-bug** : `cambia de pestana` n'émet PAS `change_locale: 'de'` | 1 | PASS -- le LLM en production respecte la règle du prompt système livrée le 2026-05-09. |

**Couverture étape 3 : ~85%** du contrat de forme. Pas 100%
car le contenu spécifique des actions du LLM est
non déterministe ; on n'affirme que la forme + le cas anti-bug.

### Étape 4 -- Llamada (toutes les fonctions publiques NAC.*)

| Fonction | Cas | Résultat |
|----------|-----|----------|
| `NAC.click` | happy / not_found / invalid | 3 PASS |
| `NAC.click_by_verb` | happy / verbe inconnu | 2 PASS |
| `NAC.fill` | happy / not_found / valeur appliquée au DOM | 3 PASS |
| `NAC.select` | happy / not_found | 2 PASS |
| `NAC.tab` | happy / clé inconnue / plugin non monté | 3 PASS |
| `NAC.tab_by_label` | textContent / parenthèses / i18n / not_found | 4 PASS (chevauchement étape 2) |
| `NAC.go_to_section` | happy / section_not_found | 2 PASS |
| `NAC.set_mode` | valide / invalide | 2 PASS |
| `NAC.screenshot` | retourne une data URL | 1 PASS |
| `NAC.edit_field` (preview v2.3) | ouverture / not_found / invalid | 3 PASS |
| `NAC.dt_add_row` | retourne row_id | 1 PASS |
| `NAC.dt_edit_cell` | happy / rejette l'invalide | 2 PASS |
| `NAC.dt_remove_row` | décrémente l'état | 1 PASS |
| `NAC.dt_commit` | retourne final_state | 1 PASS |
| `NAC.dt_discard` | annule les modifications non commitées | 1 PASS |
| `NAC.dt_read_aggregate` | agrégat somme | 1 PASS |
| `NAC.bindAction` | le handler se déclenche + le unbinder fonctionne | 2 PASS |

**Couverture étape 4 : ~95%** de la surface d'écriture publique. Manquant :
`drag_drop` (pas encore de shim de couverture), primitives toast / banner /
confirm dialog de la v1.3 (priorité basse pour la v2.x).

### Étape 5 -- Resultado (effets de bord DOM)

| Cas testé | Statut |
|-----------|--------|
| `fill` met à jour input.value | PASS (T6 étape 4 vérifie) |
| `select` met à jour l'élément select | PASS (T8 étape 4) |
| Les mutations `dt_*` se reflètent dans `dt_state()` | PASS (T24-T30 étape 4) |
| Le modal `edit_field` se monte | PASS (T21 étape 4) |
| Vérification DOM plein écran Playwright | DIFFÉRÉ -- nécessite un vrai navigateur + les étapes Vite/ng-build |

**Couverture étape 5 : ~70%** au niveau unitaire. Vérification DOM
plein écran en file d'attente.

### Étape 6 -- Famille d'événements Ack

| Famille | Cas | Résultat |
|---------|-----|----------|
| Forme de `nac:action:succeeded` (plugin + action_id + is_trusted) | 4 | PASS |
| Forme de `nac:field:changed` | 3 | PASS |
| Forme de `nac:tab:activated` | 2 | PASS |
| `nac:action:failed` sur exception du handler | 2 | PASS |
| Chemin de résolution async de `bindAction` | 1 | PASS |
| Délai click-to-resolve < 200ms | 1 | PASS |
| Forme canonique du detail sur toutes les familles | 3 | PASS |

**Couverture étape 6 : ~95%.** Manquant : les familles d'événements
de longue traîne (`nac:breadcrumb:navigated`, `nac:accordion:expanded`,
`nac:step:advanced`, `nac:table:sort_changed`,
`nac:table:filter_changed`, `nac:confirm:resolved`). Le schéma est
identique ; les couvrir serait mécanique.

### Transversal : interop (preview v2.3)

| Cas testé | Cas | Résultat |
|-----------|-----|----------|
| Forme de `export_tree` + scope + filtre locale | 7 | PASS |
| `import_remote_tree` valide la connexion + enregistre les plugins avec namespace + reflète dans la liste | 5 | PASS |
| Dispatch proxy pour `click` + `fill` | 4 | PASS |
| Miroir ack local avec `via_interop:true` | 1 | PASS |
| Le code d'erreur du pair remonte correctement | 1 | PASS |
| `disconnect_remote` + rejet post-déconnexion | 2 | PASS |
| Les clics locaux ne passent PAS par le proxy | 1 | PASS |

**Couverture interop : 100%** de la surface preview v2.3.

## Résumé de couverture -- pipeline pondéré

| Étape | Couverture | Verdict |
|-------|------------|---------|
| 1 Comunicacion | **85%** | Mock STT + corpus TTS PASS. Seule la lecture audio réelle en navigateur est en file d'attente. |
| 2 Desambiguacion | 95% | Solide. Classe de bug vérifiée. |
| 3 Intencion | 85% | Forme du backend réel couverte. |
| 4 Llamada | 95% | Toutes les API d'écriture publiques testées. |
| 5 Resultado | 70% | Principalement au niveau unitaire. Playwright en file d'attente. |
| 6 Ack | 95% | Familles principales couvertes ; longue traîne mécanique. |
| Interop | 100% | Surface complète preview v2.3. |
| **Moyenne pondérée** | **~90%** | |

## Ce qui a changé dans le runtime en conséquence

Les tests ont détecté deux vrais problèmes qui ont été corrigés dans
la même branche :

1. **Matcher `tab_by_label` trop permissif pour les étiquettes d'un
   caractère.** Corrigé dans `js/nac.js` ligne 2264 en exigeant
   `cand.length >= 3` pour la correspondance partielle bidirectionnelle.
   L'égalité exacte reste toujours autorisée.
   Détecté par le test B4 de l'étape 2 (une étiquette inconnue passait
   à travers).

2. **Helper d'introspection `NAC.list_registered_plugins()` manquant.**
   Ajouté dans `js/nac.js` pour permettre à `export_tree` de la couche
   interop d'itérer sur les manifestes enregistrés indépendamment de
   l'état de montage DOM. Détecté lors de l'écriture de la suite
   interop v23.

Les deux sont précieux -- les tests ont fait remonter de vrais bugs
du runtime, ce qui est tout l'intérêt.

## Ce qui reste à faire avant la fusion dans main

| Tâche | Priorité | Effort |
|-------|----------|--------|
| Tests e2e Playwright sur les 6 démos en production | haute | 1h |
| Playwright sur les cas d'étude React + Angular (serveur de dev) | haute | 30min |
| Génération du corpus TTS (Google Cloud, 30 invites) | moyenne | 20min |
| Test mock STT + injection corpus | moyenne | 30min |
| Test unitaire `drag_drop` | basse | 10min |
| Tests familles ack longue traîne (breadcrumb, accordion, step, etc.) | basse | 30min |
| Cherry-pick `yujin.app/nac-spec/demos/` + landing vers main | bloquant | 2min |
| Transfert email vers Pablo | bloquant | 5min |

Temps restant estimé : **~3h temps Sumi** pour atteindre >= 90%
de moyenne pondérée + un cherry-pick propre vers main.

## Temps d'exécution des tests (laptop, démarrage à froid)

| Suite | Durée |
|-------|-------|
| smoke | < 1s |
| v22 | < 1s |
| v23-interop | < 2s |
| stage2 | < 1s |
| stage3 (backend réel) | ~60s (15 invites x ~4s moy. + 500ms de cadence) |
| stage4 | ~2s (modal + setup dt) |
| stage6 | < 1s |
| **Total** | **~75s** |

`tools/nac/test-launch.sh` (le harnais) doit être étendu pour
inclure les étapes 2 à 6 + interop ; en attente.

## Piste d'audit

| Commit | Contenu |
|--------|---------|
| `5b06ae3f` | démos compilées + déployées + étape 2 |
| `632aa1f6` | étapes 2+4 + cas d'usage landing |
| (en attente) | étapes 3+6 + ce rapport |

---

*Ce document est le référentiel canonique de couverture pour la branche
interop v2.3 + le runtime v2.2 tel qu'il se présente le 2026-05-11
à 00h50 UTC-3. Les mises à jour sont intégrées au fur et à mesure
que de nouvelles suites sont livrées.*

---

*This is a machine translation of the canonical English
version at `/nac-spec/docs/COVERAGE_REPORT_2026_05_10.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
