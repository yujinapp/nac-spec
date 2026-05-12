---
translation_source: docs/TEST_COVERAGE_MATRIX.md
translation_source_hash: 378d7bf89e65b07e54f5d5dc1c62938accfe383e903468a4df028a3e2936f48d
translation_quality: machine_v1
translation_lang: fr
translation_date: 2026-05-11T13:53:39.453740+00:00
---

# NAC3 -- Matrice de couverture des tests (automatiques + manuels)

**Version de la spec :** 2.2 + aperçu v2.3.
**Générée le :** 2026-05-11.
**Référence pour :** le dépôt de référence Yujin
`yujinapp/nac-spec` sur `main`.

Cette matrice recense TOUS les artefacts de l'écosystème NAC3 et
indique leur couverture par les tests automatisés ainsi que par la
vérification manuelle (la liste de contrôle « human OK »).

Adoptants : copiez cette structure de matrice pour votre propre
application. Remplacez les colonnes par vos artefacts ; conservez
la même profondeur par ligne.

---

## Légende

| Symbole | Signification |
|---------|---------------|
| AUTO | Couvert par des tests automatisés (Playwright / suite côté Node) |
| MAN  | Nécessite une vérification humaine (visuel navigateur, geste vocal, UX subjective) |
| BOTH | Couvert automatiquement pour les invariants + vérifié manuellement pour l'UX |
| --   | Aucune couverture prévue (intentionnel) |
| TBD  | Couverture prévue mais non encore implémentée |

---

## 1. Artefacts d'exécution

| Artefact | Couverture AUTO | Validation manuelle | Notes |
|----------|-----------------|---------------------|-------|
| `js/nac.js` (base v1.9 + v2.0 + v2.1) | AUTO 95% | MAN (smoke multi-navigateurs) | smoke + v22 + stage4 couvrent l'API d'écriture ; manuel = ouvrir dans Firefox + Safari au moins une fois par version |
| `js/nac-v2-extensions.js` | AUTO 90% | MAN (autoRegister.watch sur un DOM vierge) | stage4 dt_* + v22 partiel ; manuel = monter un nouveau plugin à l'exécution via autoRegister |
| `js/nac-chat-client.js` | AUTO 95% | MAN (STT avec vrai microphone) | stage1-audio simule SpeechRecognition ; manuel = appuyer sur le micro dans la démo live + prononcer une invite par locale |
| `js/nac-mcp-interop.js` (aperçu v2.3) | AUTO 100% | MAN (aller-retour cross-origin avec un pair réel) | v23-interop couvre le scénario en page locale ; manuel = tester contre un vrai pair NAC3 distant en HTTPS |

## 2. Package NPM

| Artefact | Couverture AUTO | Validation manuelle | Notes |
|----------|-----------------|---------------------|-------|
| Build `@nac3/runtime` (dist/ ESM + CJS + d.ts + CLI) | AUTO 100% | MAN (`npm install` dans un répertoire vierge) | smoke.mjs 36 vérifications ; manuel = npm pack + install + import dans un projet Node vide pour vérifier |
| Sous-chemin `@nac3/runtime/extensions` | AUTO 100% | -- | smoke confirme la présence des fichiers + d.ts |
| Sous-chemin `@nac3/runtime/chat-client` | AUTO 100% | -- | smoke confirme la présence des fichiers + d.ts |
| CLI `npx @nac3/runtime validate` | AUTO 100% | MAN (exécuter contre un projet construit en externe par l'équipe) | smoke exécute le CLI contre le répertoire demos ; manuel = exécuter contre le dépôt du client avant sa mise en production |

## 3. Démos (en ligne sur yujin.app/nac-spec/)

| Démo | Couverture AUTO | Validation manuelle | Notes |
|------|-----------------|---------------------|-------|
| `index.html` (page d'accueil) | BOTH | MAN (visite autopilot + envoi de message chat) | Playwright 01-landing.spec.ts vérifie la surface ; manuel = lancer l'autopilot depuis un vrai navigateur, narration audible |
| `example.php` (référence v1.9) | AUTO | MAN (parcours clic des 27 widgets) | Playwright 02-demo-v19 vérifie le démarrage ; manuel = parcourir les 27 widgets, aucune erreur console |
| `example-v20-full.php` (brownfield) | AUTO | MAN (boutons describe_v2 / validate_global_v2 du panneau v20) | Playwright 03-demo-v20 couvre le panneau + l'accusé de réception bindAction ; manuel = cliquer chaque bouton du panneau + inspecter la sortie |
| `example-v20-primitives-showcase.php` | -- | MAN (parcours didactique par primitive) | Démo purement pédagogique ; manuel = la visite des 8 primitives |
| `example-v21-data-table.php` | AUTO | MAN (chat vocal avec micro) | Playwright 04-demo-v21 couvre dt_state + tab.permissions ; manuel = utiliser le micro vocal, observer que le LLM dispatche correctement |
| `example-v22-interop.php` (aperçu v2.3) | AUTO | MAN (utiliser les 4 CTA dans l'ordre) | Playwright 05-demo-v22-interop de bout en bout ; manuel = le flux à 4 boutons avec les yeux à l'écran |
| `demos/react/` (étude de cas compilée) | AUTO | MAN (ajout/suppression piloté par chat) | Playwright 06-demo-react couvre le montage + l'ajout ; manuel = envoyer par chat « agrega leche » via vrai micro, observer la mise à jour de l'état React |
| `demos/angular/` (étude de cas compilée) | AUTO | MAN (ajout/suppression piloté par chat) | Playwright 07-demo-angular couvre le montage + l'ajout ; manuel = identique à React |

## 4. Documentation

| Document | Couverture AUTO | Validation manuelle | Notes |
|----------|-----------------|---------------------|-------|
| `SPEC.md` (canonique v2.2) | -- | MAN (revue PR par un mainteneur) | La spec est en prose ; aucun test automatique possible. Un humain relit chaque mot |
| `ABOUT.md` | -- | MAN (revue PR) | Idem |
| `CONTRIBUTING.md` | -- | MAN (revue PR) | Idem |
| `SECURITY.md` | -- | MAN (revue PR) | Idem. Plus une relecture trimestrielle du modèle de menace |
| `README_DEMOS.md` | -- | MAN | Vérification manuelle des liens |
| `docs/NAC_V22_ROADMAP.md` | -- | MAN | Mise à jour + revue par version |
| `docs/NAC_TEST_MANUAL.md` | AUTO (liens) | MAN (revue PR) | La couche 3 de test-launch.sh vérifie l'existence des 11 docs ; manuel = lire pour vérifier l'exactitude |
| `docs/COVERAGE_REPORT_2026_05_10.md` | -- | MAN (régénérer par version) | Ce fichier est lui-même le relevé de couverture ; un humain le rédige à chaque version |
| `docs/NAC_INTEROP_MCP.md` | -- | MAN | Proposition de spec, revue humaine |
| `docs/NAC_LAUNCH_DIFFUSION.md` | -- | MAN | Playbook interne |
| `docs/CASE_STUDIES_DISCOVERY.md` | -- | MAN | Post-mortems de bugs ; curation humaine |
| `docs/LAUNCH_PLAN_2026_05_10.md` | -- | MAN (historique) | Enregistrement historique |
| `docs/TEST_COVERAGE_MATRIX.md` (ce fichier) | AUTO (liens) | MAN | Mettre à jour par version |
| `docs/VOICE_CHAT_ERROR_ANALYSIS_2026_05_09.md` | -- | MAN | Analyse historique de bugs |
| `docs/HUMAN_OK_CHECKLIST.md` | -- | MAN (Pablo l'exécute) | La liste de contrôle elle-même ; Pablo l'applique |

## 5. Guides d'adoption

| Guide | Couverture AUTO | Validation manuelle | Notes |
|-------|-----------------|---------------------|-------|
| `guides/REACT.md` | -- | MAN (revue PR + retours des adoptants) | Le snippet hello-world doit toujours compiler ; manuel = vérification annuelle de reconstruction |
| `guides/ANGULAR.md` | -- | MAN (revue PR) | Idem |
| `guides/LLM_WIRING.md` | -- | MAN (revue PR) | Le backend Node de référence fonctionne ; manuel = l'exécuter contre la spec live |
| `guides/AI_PLAYBOOK_NEW_PROJECT.md` | -- | MAN (revue PR) | Les assertions d'étapes doivent rester exécutables |
| `guides/AI_PLAYBOOK_MIGRATION.md` | -- | MAN (revue PR) | Idem |
| `guides/IMPACT_TESTING.md` | -- | MAN (revue PR) | Affirmations d'impact ; mettre à jour les chiffres chaque trimestre |
| `guides/IMPACT_RPA.md` | -- | MAN (revue PR) | Idem |
| `guides/RPA_UIPATH.md` | -- | MAN (exécuter le workflow exemple une fois par version) | Manuel = exercer InvoiceFromCSV.xaml |
| `guides/RPA_AUTOMATION_ANYWHERE.md` | -- | MAN | Même forme |
| `guides/RPA_BLUE_PRISM.md` | -- | MAN | Même forme |
| `guides/RPA_PLAYWRIGHT.md` | AUTO (suite de référence) | MAN (revue PR) | Les patterns sont exercés par `tests/e2e-nac/specs/` ; manuel = lire une fois par version |

## 6. Suites de tests

| Suite | Couverture AUTO | Validation manuelle | Notes |
|-------|-----------------|---------------------|-------|
| `packages/nac/test/smoke.mjs` | AUTO (elle-même) | MAN (vérifier le taux de réussite) | 36 vérifications ; manuel = regarder le compteur une fois par version |
| `packages/nac/test/v22.mjs` | AUTO (elle-même) | -- | 14 tests unitaires |
| `packages/nac/test/v23-interop.mjs` | AUTO (elle-même) | -- | 14 tests unitaires |
| `packages/nac/test/stage1-audio.mjs` | AUTO (elle-même) | MAN (régénérer le corpus par locale) | 33 vérifications ; manuel = écouter un échantillon du corpus TTS, vérifier l'audibilité |
| `packages/nac/test/stage2-disambiguation.mjs` | AUTO (elle-même) | -- | 31 vérifications |
| `packages/nac/test/stage3-backend.mjs` | AUTO (elle-même, live) | MAN (vérifier les réponses du LLM) | 45 invites x 10 locales ; manuel = contrôle ponctuel sur 2 invites aléatoires pour détecter une dérive du LLM |
| `packages/nac/test/stage4-calls.mjs` | AUTO (elle-même) | -- | 31 vérifications |
| `packages/nac/test/stage6-ack.mjs` | AUTO (elle-même) | -- | 16 vérifications |
| `packages/nac/test/stage6b-longtail.mjs` | AUTO (elle-même) | -- | 14 vérifications |
| `tests/e2e-nac/specs/*.spec.ts` | AUTO (elle-même) | MAN (revue visuelle d'une exécution avec interface une fois par version) | 16 specs ; manuel = exécuter avec `--headed` une fois pour vérifier visuellement |
| Corpus TTS (30 fichiers MP3) | AUTO (présence + taille) | MAN (écouter 1 par locale) | Manuel = échantillonner 10 fichiers, confirmer l'audibilité, aucun bruit parasite |
| `tools/nac/test-launch.sh` | AUTO (lui-même) | -- | Orchestrateur |
| `tools/nac/discovery-loop.sh` | AUTO (lui-même) | -- | Boucle de découverte + correction |

## 7. Packages d'études de cas

| Package | Couverture AUTO | Validation manuelle | Notes |
|---------|-----------------|---------------------|-------|
| Sources `packages/nac-react-demo/` | AUTO (build + Playwright) | MAN (visuel sur le dist déployé) | Build Vite propre ; Playwright couvre todos + chat + autopilot |
| Dist déployé `packages/nac-react-demo/` | AUTO | MAN (ouvrir en navigation privée, parcourir) | Manuel = le parcours humain sur /demos/react/ |
| Sources `packages/nac-angular-demo/` | AUTO | MAN | Même forme |
| Dist déployé `packages/nac-angular-demo/` | AUTO | MAN | Idem |

## 8. Aspects transversaux

| Aspect | Couverture AUTO | Validation manuelle | Notes |
|--------|-----------------|---------------------|-------|
| Complétude du catalogue i18n | AUTO (validateur) | MAN (revue par un locuteur natif par locale) | Le validateur en mode strict signale les clés manquantes ; un locuteur natif vérifie que les chaînes ont du sens culturellement |
| Signature du manifeste HMAC | AUTO (unitaire) | MAN (smoke de déploiement multi-tenant) | Les tests unitaires signent + vérifient ; manuel = smoke de production contre le flux de distribution des secrets |
| Contrôle isTrusted | AUTO (unitaire) | MAN (comparaison côte à côte clic réel vs synthétique) | Le test unitaire v22 couvre le flag ; manuel = la paire de boutons istrusted_real / istrusted_fake sur example-v20-full.php |
| Interopérabilité cross-origin (v2.3) | AUTO (mock) | MAN (vrai pair avec vrai jeton bearer) | v23-interop utilise un mock en page ; manuel = au moins un test cross-origin avant de déclarer v2.3 GA |
| Déploiement sur yujin.app | AUTO (push -> déploiement automatique) | MAN (vérifier que les URLs renvoient 200 + contenu correct) | GoDaddy déploie automatiquement ; manuel = curl toutes les URLs critiques après chaque push sur main |
| Lecture audio en navigateur réel | -- | MAN (test micro + haut-parleur) | L'API Web Speech nécessite du vrai matériel ; manuel = appuyer sur le micro dans la démo v21 live, prononcer une invite par locale |

## Récapitulatif -- couverture pondérée par catégorie

| Catégorie | AUTO | MAN | BOTH | Santé de la couverture |
|-----------|------|-----|------|------------------------|
| Artefacts d'exécution | 4 | 0 | 0 | EXCELLENTE (95% auto en moyenne) |
| Package NPM | 4 | 0 | 0 | EXCELLENTE (100% auto) |
| Démos | 6 | 1 | 1 | BONNE (auto pour les invariants, manuel pour l'UX) |
| Documentation | 1 | 14 | 0 | ATTENDUE (les docs sont relues, pas testées unitairement) |
| Guides d'adoption | 0 | 10 | 0 | ATTENDUE |
| Suites de tests | 13 | 4 | 0 | EXCELLENTE |
| Packages d'études de cas | 2 | 2 | 0 | BONNE (auto + visuel manuel) |
| Aspects transversaux | 4 | 2 | 0 | BONNE |
| **TOTAL** | **34** | **33** | **1** | **EXCELLENTE** |

## Comment utiliser cette matrice

### Par version

1. Tagger la version de la spec + la version de la suite de référence.
2. Exécuter `bash tools/nac/test-launch.sh` -- chaque ligne AUTO constitue un point de blocage.
3. Parcourir la colonne MAN -- la [liste de contrôle Human OK](HUMAN_OK_CHECKLIST.md) en est la forme exécutable.
4. Mettre à jour le fichier COVERAGE_REPORT_<date>.md avec les résultats de l'exécution.
5. Ajuster cette matrice si le périmètre des artefacts a évolué.

### Par adoptant

Copiez cette structure de matrice pour votre propre application. Remplacez
les noms d'artefacts ; conservez la même forme. La discipline est identique :
chaque artefact reçoit une validation automatique + manuelle explicite.

### Anti-pattern

Ne marquez PAS un artefact « AUTO » si le test vérifie uniquement la présence
du fichier. AUTO signifie que le test exerce un comportement. Les vérifications
de présence de fichiers relèvent du harnais (test-launch.sh), pas de la matrice
des artefacts.

## Voir aussi

- [NAC_TEST_MANUAL.md](NAC_TEST_MANUAL.md) -- le playbook dont cette
  matrice est dérivée.
- [HUMAN_OK_CHECKLIST.md](HUMAN_OK_CHECKLIST.md) -- la forme exécutable
  de la colonne MAN.
- [COVERAGE_REPORT_2026_05_10.md](COVERAGE_REPORT_2026_05_10.md)
  -- les résultats réels de l'exécution pour la version courante.

## Licence

Apache-2.0.

---

*This is a machine translation of the canonical English
version at `/nac-spec/docs/TEST_COVERAGE_MATRIX.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
