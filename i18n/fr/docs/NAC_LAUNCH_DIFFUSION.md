---
translation_source: docs/NAC_LAUNCH_DIFFUSION.md
translation_source_hash: cbdf7b9e5ec3ed43a39111aab16fbe59c222a05a835429ea43148036320fc5cf
translation_quality: machine_v1
translation_lang: fr
translation_date: 2026-05-11T14:14:14.621654+00:00
---

# Plan de diffusion pour le lancement de NAC3

Un guide pratique pour faire connaître NAC3 aux personnes qui devraient l'utiliser. Rédigé le 2026-05-10 pour le lancement de v2.2 / v2.3-preview.

## Ce que nous livrons

- **Spec :** v2.2 stable, v2.3 preview (primitive d'éditeur de champ).
- **Runtime :** `@nac3/runtime@2.2.0` sur npm (ESM + CJS + d.ts + CLI).
- **Démos :** quatre démos en ligne sur yujin.app/nac-spec/.
- **Guides d'adoption :** React + Angular + câblage LLM.
- **Études de cas :** applications Vite + React 18 et Angular 17 fonctionnelles dans `packages/nac-react-demo` + `packages/nac-angular-demo`.
- **Scénario de migration brownfield :** le CRM Yujin lui-même, documenté dans pkuschnirof/yujin docs/MIGRATION_FROM_RPAFORCE.md.
- **Conformité NAC-3 :** la page d'accueil elle-même est conforme NAC-3 (manifest + chat + autopilot + isTrusted-aware).

## Messages clés

### Accroche en une phrase

> **NAC3 -- la petite spec publique qui permet aux interfaces web d'être pilotées par des agents IA, des moteurs vocaux et des outils d'accessibilité, sans code de liaison spécifique à chaque application.**

### Accroche en trois phrases

> NAC3, c'est ce qu'ARIA aurait été si elle avait été conçue en 2026 avec les LLMs en tête. Décorez votre interface existante avec trois attributs HTML ; le runtime résout les noms, envoie les clics, émet des événements de complétion, gère la localisation et assure la provenance. Apache-2.0, npm install, aucun changement de pipeline de build.

### Pitch de 30 secondes

> Les assistants vocaux, les agents de chat LLM et les outils d'accessibilité se heurtent tous au même problème : ils ont besoin de noms stables pour les éléments sur lesquels ils doivent agir. Les sélecteurs CSS cassent. ARIA s'arrête à « c'est un bouton ». Chaque équipe reconstruit la même plomberie de zéro.
>
> NAC3 est le petit contrat qui règle ce problème. Vous ajoutez `data-nac-id`, `data-nac-role`, `data-nac-action` aux éléments qu'un agent doit piloter ; le runtime s'occupe du reste. Il existe une spec v2.2 fonctionnelle, un package npm stable, des guides React + Angular, et quatre démos en ligne dont une câblée de bout en bout sur un backend de chat Claude Sonnet que vous pouvez tester dès maintenant.
>
> C'est Apache-2.0. Nous l'avons créé parce que nous gérons un CRM qui en avait besoin. Maintenant vous pouvez l'utiliser aussi.

## Audiences cibles

| Audience | Canal | Accroche |
|----------|-------|----------|
| Développeurs React + Vue + Svelte + Angular | dev.to, Hashnode, r/javascript, r/webdev | « Pilotez votre appli React existante par la voix en 80 lignes » |
| Développeurs d'agents vocaux | r/LocalLLaMA, r/ChatGPTCoding, Discords de développeurs d'agents | « Le standard qui manquait côté interface des applis vocales » |
| Défenseurs de l'accessibilité | r/Accessibility, listes de diffusion a11y, intervenants aux meetups A11y | « ARIA conçue en 2026 avec les LLMs en tête » |
| Ingénieurs test/QA | r/qualityassurance, communautés Selenium / Playwright | « Des sélecteurs stables qui survivent aux refactorisations d'interface » |
| HN | news.ycombinator.com | le Show HN canonique |
| Responsables techniques + CTOs | LinkedIn, Mastodon | l'angle « vous l'ajouterez dans 12 mois de toute façon » |
| Utilisateurs du CRM Yujin | e-mail direct + bandeau in-product | « votre CRM parle NAC3 ; voici ce que ça signifie » |

## Canaux + exemples de publications

### Show HN

- **Titre :** `Show HN: NAC -- a small public spec that lets web UIs be driven by AI agents`
- **Première ligne :** « We made this while building Yujin CRM and realised every team trying to ship voice/agent UI rebuilds the same plumbing. »
- **Corps :** expliquer le contrat (3 attributs + manifest + événements), lier la démo en ligne, la spec, le package npm, l'étude de cas React. Rester sous 200 mots. Les fils de commentaires attirent plus l'attention que les longs posts.
- **Jour :** mardi ou mercredi, matin heure US. Éviter les lundis et vendredis.
- **Suivi :** être présent dans les commentaires pendant au moins 4 heures ; répondre à chaque question technique ; ne pas répondre aux provocations.

### r/javascript

- **Titre :** `[Showoff] NAC: drive your React app with voice + chat using 3 HTML attributes`
- **Corps :** se concentrer sur « que fait le développeur React » -- exemples de code tirés de `guides/REACT.md`. Lier le répertoire GitHub de l'étude de cas.

### r/Accessibility

- **Titre :** `NAC: a parallel layer to ARIA for AI-agent-driven UI`
- **Corps :** commencer par « ce n'est PAS un remplacement d'ARIA, c'est un complément » -- la communauté accessibilité est protectrice, à juste titre. Montrer comment `data-nac-role="action"` et `role="button"` coexistent.

### dev.to

- **Titre :** `Drive any web UI by voice with @nac3/runtime`
- **Accroche :** le dépôt de l'étude de cas React. Captures d'écran/gifs du panneau de chat + la visite guidée autopilot.
- **Longueur :** 1500-2000 mots. Pas à pas.

### Twitter / X

Un fil de 6 tweets :

1. « We just shipped NAC3 v2.2 -- a public spec + npm package that lets web UIs be driven by AI agents. Apache-2.0. (gif of the demo) »
2. « Why: every team building voice/agent UX rebuilds the same plumbing. CSS selectors break. ARIA isn't agent-shaped. We needed a small contract. »
3. « How small: 3 HTML attributes per element. (code screenshot) »
4. « What you get: stable names, deterministic completion events, 10-locale i18n out of the box, provenance via HMAC + isTrusted, auto-validation. »
5. « Live demo at yujin.app/nac-spec -- four demos, one wired to a Claude Sonnet chat backend. Talk to it. »
6. « React + Angular adoption guides + working study cases at github.com/yujinapp/nac-spec. Spec at yujin.app/nac-spec/SPEC.md. »

### LinkedIn

Publication longue (~600 mots). Miser sur l'angle « vous l'ajouterez dans 12 mois de toute façon » ; s'adresser aux CTOs qui évaluent leur stratégie agent. Inclure une capture d'écran de la visite guidée autopilot en forme de BPMN.

### Mastodon

Republier le fil Twitter, rester concis. Inclure un texte alternatif sur chaque image (c'est important sur cette plateforme).

## Plan gif/vidéo de démo

### Gif (15 secondes, en boucle)

Scène 1 (4s) : l'utilisateur tape « agrega tomar agua » dans le champ de chat de la démo React.
Scène 2 (3s) : le LLM résout ; la tâche est ajoutée avec un effet de surbrillance.
Scène 3 (4s) : l'utilisateur clique sur « tour » ; l'autopilot parcourt la page en narrant.
Scène 4 (4s) : l'utilisateur tient le micro, dit « remove all done », les tâches disparaissent.

Hébergé en MP4 8 Mo + fallback WebP 4 Mo sur
`yujin.app/nac-spec/assets/demo.{mp4,webp}`. Utilisé comme gif hero du README, image OG, carte Twitter, en-tête dev.to.

### Vidéo (90 secondes, voix off)

Publiée sur YouTube + Vimeo.
- 0:00-0:10 -- le problème (« la voix + les agents ont besoin de noms stables »).
- 0:10-0:25 -- le contrat (3 attributs).
- 0:25-0:45 -- démo d'adoption (étude de cas React, 5 lignes ajoutées).
- 0:45-1:05 -- pilotage via chat + voix + autopilot.
- 1:05-1:20 -- exemple brownfield du CRM Yujin.
- 1:20-1:30 -- « Apache-2.0, npm install @nac3/runtime, liens ci-dessous. »

## Calendrier de suivi

| Moment | Action |
|--------|--------|
| Jour 0 | Show HN + r/javascript + fil Twitter + article dev.to. Répondre aux commentaires pendant 4-8 heures. |
| Jour 1 | Publication LinkedIn. Répondre aux commentaires dev.to. Ajouter les problèmes faciles soulevés au backlog GitHub. |
| Jour 3 | Publication r/Accessibility + republication Mastodon. |
| Jour 7 | Article de blog « Bilan de la semaine 1 » : retours reçus, changements effectués, principales issues GitHub ouvertes. |
| Jour 14 | Contacter par DM les personnes de la communauté accessibilité / développeurs d'agents qui ont réagi le jour 0 avec un « envie d'en discuter ? ». |
| Jour 30 | Livraison d'un patch v2.2.x avec les corrections les plus demandées par la communauté. Article d'annonce : « ce que 30 jours nous ont appris sur NAC3 ». |
| Jour 90 | Livraison de NAC3 v2.3 (éditeur de champ canonique, STRICT_VALIDATION par défaut à true). Nouvelle impulsion de lancement, périmètre réduit. |

## Métriques à suivre

- Téléchargements npm de `@nac3/runtime` par semaine.
- Étoiles GitHub + forks sur `yujinapp/nac-spec` et `pkuschnirof/yujin`.
- Pages vues de la démo sur yujin.app/nac-spec/ (logs d'accès serveur).
- Nombre d'issues GitHub ouvertes (indicateur d'engagement).
- Nombre de commentateurs uniques sur l'ensemble des canaux ci-dessus.
- Tendance de recherche pour « Native Agent Contract » (Google Trends).

Objectifs, semaine 1 :
- 200 téléchargements npm
- 100 étoiles GitHub sur les deux dépôts combinés
- 5000 pages vues de la démo
- 10 issues / discussions ouvertes
- 1 article de blog non sollicité par un tiers

Si nous manquons ces objectifs de 50 % ou plus, les messages clés doivent être retravaillés ; itérer sur le texte des publications LinkedIn + dev.to et réessayer au jour 14.

## Liste de contrôle pré-lancement (avant de publier)

- [ ] `npm publish @nac3/runtime@2.2.0` effectué (c'est **manuel** ; nécessite le token npm du propriétaire).
- [ ] `npm install @nac3/runtime` fonctionne depuis un répertoire tmp vierge.
- [ ] Les démos en ligne se chargent sans erreurs console dans Chrome + Firefox + Safari.
- [ ] `validate_global({probe: true})` retourne `[]` sur la page d'accueil.
- [ ] Le gif de démo s'affiche correctement dans les cartes de prévisualisation dev.to + Twitter.
- [ ] `LICENSE`, `CONTRIBUTING`, `SECURITY` tous en place.
- [ ] Au moins une issue GitHub ouverte avec le label « good first issue » pour que les contributeurs qui arrivent le jour 1 aient un point de départ.
- [ ] Pablo est disponible et prêt à répondre aux commentaires pendant 4 heures.

## Ce que nous ne ferons pas

Ce que nous ne ferons PAS :

- Acheter de la publicité (au moins jusqu'à avoir les métriques de la semaine 4).
- Dénigrer ARIA, Selenium, Playwright ou tout fournisseur d'agents. NAC3 est additif, pas adversarial.
- Promettre des contrats de support entreprise au lancement (cela viendra après avoir évalué la charge de support).
- Faire du washing open source : le code EST Apache-2.0, ET l'implémentation de référence du backend de chat l'est aussi. Nous ne séparons pas les fonctionnalités « core » des fonctionnalités « premium » comme avantage concurrentiel -- notre avantage, c'est l'hébergement + les crédits LLM + les opérations.

## Guide opérationnel du jour de lancement

Planifié serré car Pablo gère cela seul :

| Heure | Action |
|-------|--------|
| 06:00 (US ET) | Vérification finale : `npm test` + `npx @nac3/runtime validate yujin.app/nac-spec/` + ouvrir toutes les démos en navigation privée. Corriger ce qui est cassé. |
| 09:00 | Show HN publié. |
| 09:05 | Fil Twitter publié. |
| 09:15 | r/javascript publié. |
| 09:30 | Article dev.to publié. |
| 09:30-13:30 | Présent dans les commentaires HN. Épingler un commentaire en tête avec des liens rapides. |
| 14:00 | Publication LinkedIn. |
| 14:00-18:00 | Présent dans les commentaires dev.to + mentions Twitter. |
| 18:00 | Stop. Décompresser. |
| Jour 1 09:00 | r/Accessibility + Mastodon. Triage des issues GitHub. |

---

*This is a machine translation of the canonical English
version at `/nac-spec/docs/NAC_LAUNCH_DIFFUSION.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
