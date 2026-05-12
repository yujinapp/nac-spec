---
translation_source: ABOUT.md
translation_source_hash: 4ab5d9a2ad96ee42811299474895d9836adc1ca93ea37726806f190f59646484
translation_quality: machine_v1
translation_lang: fr
translation_date: 2026-05-11T12:52:21.335473+00:00
---

# À propos de NAC3

**Version de la spec :** 2.2 stable (+ aperçu d'interopérabilité v2.3).

**NAC3** = **Native Agent Contract**.

Une spec publique et légère qui permet aux interfaces web d'être pilotées par des agents IA, des moteurs vocaux et des outils d'accessibilité, de la même façon qu'elles le sont par des humains aujourd'hui : en cliquant, en tapant et en lisant -- mais avec des noms que les machines peuvent résoudre, des événements sur lesquels elles peuvent attendre, et une piste de provenance qui distingue un vrai utilisateur d'un appelant synthétique.

NAC3 se place aux côtés de ARIA, et non par-dessus. Là où ARIA a standardisé l'**arbre d'accessibilité** pour que les lecteurs d'écran et les dispositifs de commutation puissent utiliser la même interface qu'un utilisateur voyant, NAC3 standardise l'**arbre d'agents** pour qu'une commande vocale, un intermédiaire LLM ou un bot RPA puisse faire de même sans code de liaison spécifique à chaque application.

## Ce que vous écrivez

Une poignée d'attributs HTML (`data-nac-id`, `data-nac-role`, `data-nac-action`, `data-nac-plugin`) ainsi qu'un manifeste JS optionnel qui nomme les éléments de la page et les verbes qu'ils acceptent. Le runtime résout les noms en éléments et leur distribue les appels.

## Ce que vous obtenez

- Une page qui répond à `NAC.click('deals.create')` depuis n'importe quel appelant -- un moteur vocal, une spec Playwright, un intermédiaire LLM, une macro clavier, un outil d'accessibilité.
- Une page qui émet une famille d'événements déterministes (`nac:action:succeeded`, `nac:tab:activated`, `nac:field:changed`, ...) pour que l'appelant sache quand chaque étape est terminée.
- Une page dont le contrat repose sur les identités des éléments, et non sur leurs coordonnées -- ainsi, une refonte de l'interface ne casse pas l'automatisation.
- Une couche de provenance (`isTrusted`, manifestes signés HMAC) qui indique à un système en aval si un clic provient d'un vrai utilisateur ou d'un autre agent.

## Ce que NAC3 n'est pas

- Ce n'est pas un framework UI. Vous conservez React / Vue / vanilla / PHP / ce que vous voulez. NAC3 est un contrat léger superposé à ce que vous rendez déjà.
- Ce n'est pas un LLM. Le LLM qui traduit « clique sur le bouton enregistrer » en `NAC.click('deals.save')` est votre affaire (ou celle de votre fournisseur) ; consultez `guides/LLM_WIRING.md` pour une référence.
- Ce n'est pas un substitut à l'accessibilité. Conservez vos rôles ARIA. NAC3 ajoute une couche parallèle ; de nombreux adoptants se retrouvent avec à la fois `role="button"` et `data-nac-role="action"` sur le même élément.

## Statut

- **v1.9** -- stable. 27 widgets couverts, 9 familles d'événements, HMAC + isTrusted, mode strict i18n, validateur. La référence de production est `example.php`.
- **v2.0** -- introduit le scénario de migration brownfield (les pages existantes deviennent pilotées par NAC via ~80 lignes de configuration). Référence : `example-v20-full.php`.
- **v2.1** -- ajoute la primitive data-table (`collection`, `matrix`, sous-types `matrix-singletree` ; `dt_add_row`, `dt_edit_cell`, agrégats, commit transactionnel). Référence : `example-v21-data-table.php`.
- **v2.2** -- LIVRÉ le 2026-05-10. `NAC.register` est désormais un validateur strict (`manifest_role_unknown`, `tab_id_manifest_role_drift`, `manifest_dom_role_mismatch`). Nouveau helper `NAC.bindAction(el, handler, ctx)` qui intègre le contrat `nac:action:succeeded` dans le runtime. Nouveau flag `NAC.STRICT_VALIDATION` qui bascule les résultats entre avertissement uniquement (défaut en 2.2) et exception (défaut en 2.3). **C'est ce que `npm install @nac3/runtime` installe aujourd'hui.** Voir `docs/NAC_V22_ROADMAP.md` pour le journal des modifications complet.
- **v2.3** -- en cours de planification. La valeur par défaut de `STRICT_VALIDATION` passe à `true`. Companion `NAC.bindTab(el, handler, ctx)` pour les widgets d'onglets. Option d'activation facultative : dispatch de chat en streaming.

## Par où commencer

- Lancez les démos sur `yujin.app/nac-spec/` (tout navigateur, tout appareil).
- Lisez `SPEC.md` pour le contrat complet.
- Lisez `guides/REACT.md` si vous adoptez NAC3 depuis React.
- Lisez `guides/LLM_WIRING.md` si vous connectez votre propre intermédiaire LLM.
- Lisez `SECURITY.md` avant de déployer NAC3 dans un contexte multi-tenant.

## Gouvernance

NAC3 est actuellement géré par Yujin. La spec est sous licence Apache 2.0 ; le runtime de référence est sous MIT. Yujin s'engage à transférer NAC3 à une fondation neutre (groupe communautaire W3C, Linux Foundation ou organisme industriel équivalent) si et quand l'adoption le justifie. En attendant, les modifications de la spec suivent le processus RFC décrit dans `CONTRIBUTING.md`, avec une période de commentaires publics d'au moins 14 jours pour toute modification de l'API publique ou du format de transmission.

La double licence Apache 2.0 + MIT garantit que la spec et le runtime survivent à tout changement de statut juridique de Yujin. Les adoptants peuvent forker l'un ou l'autre, les exécuter et les distribuer, aujourd'hui et après la disparition éventuelle de Yujin.

## Paternité

NAC3 est rédigé et maintenu par Yujin (rpaforce.com). Apache-2.0. Contributions bienvenues -- voir `CONTRIBUTING.md`.

---

*This is a machine translation of the canonical English
version at `/nac-spec/ABOUT.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
