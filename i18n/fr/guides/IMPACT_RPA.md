---
translation_source: guides/IMPACT_RPA.md
translation_source_hash: d278c291a38100f66ef8ed5ae0030875b5e9eb4412db6edecf9b7db2794a16e2
translation_quality: machine_v1
translation_lang: fr
translation_date: 2026-05-11T13:46:23.896337+00:00
---

# Impact de NAC3 sur la RPA

**Version NAC3 :** 2.2 stable.
**Public cible :** architectes RPA, responsables de centres d'excellence (CoE) en automatisation, ingénieurs en automatisation évaluant le coût de maintenance et d'extension des automatisations pilotées par NAC3.

## En résumé

La RPA basée sur les sélecteurs CSS est fragile par conception. La reconnaissance par image est fragile selon l'affichage. NAC3 place des ancres nommées stables sur la page que N'IMPORTE QUELLE plateforme RPA peut cibler. Le coût par automatisation diminue de 60 à 90 % et la dette de maintenance des sélecteurs par trimestre tombe à quasi zéro.

## L'état actuel des sélecteurs RPA

Trois approches, toutes défaillantes :

### 1. Sélecteurs CSS / XPath

```xml
<webctrl tag='button'
         class='btn-primary btn-lg invoice-save-btn'
         text='Save' />
```

Casse lors de : renommages de classes CSS, restructurations de mise en page, traductions d'étiquettes, ajouts de classes au survol.

### 2. Correspondance par image / OCR

Comparaison pixel à pixel du bouton rendu. Casse lors de : changement de thème, mode sombre, changement de résolution, remplacement de police, chevauchement de l'anneau de focus.

### 3. Ciblage par ancre (coordonnées relatives)

« Le bouton deux cellules à droite de l'étiquette "Subtotal". » Casse lors de : redistribution de la mise en page, réorganisation des colonnes, changements de points de rupture responsive.

Ces trois approches exigent une maintenance CoE constante. Un CoE d'entreprise typique consacre 35 à 60 % de son temps à mettre à jour des sélecteurs cassés après des refontes d'interface.

## L'état avec NAC3

Une seule ligne par élément :

```js
await window.NAC.click('invoice.save');
```

Casse lors de : le renommage du verbe `save` par l'équipe produit en autre chose. Il s'agit d'un vrai changement sémantique, et l'automatisation DOIT être mise à jour pour la même raison qui nécessiterait une reformation des utilisateurs.

## Métriques d'impact concrètes

Issues d'un CoE ayant piloté NAC3 sur 14 automatisations :

| Métrique | Basé sur les sélecteurs | Basé sur NAC3 | Delta |
|----------|------------------------|---------------|-------|
| Nombre moyen d'activités par automatisation | 47 | 9 | -81 % |
| Heures de maintenance par trimestre de refonte UI | 41 | 3 | -93 % |
| Exécutions échouées par semaine (dérive des sélecteurs) | 18 | 0 | -100 % |
| Temps de création d'une nouvelle automatisation | 12 heures | 2 heures | -83 % |
| Couverture de la surface d'une application (% des actions accessibles) | 38 % | 95 % | +150 % |

Le chiffre de couverture est le plus important. **La RPA basée sur les sélecteurs couvre typiquement 30 à 50 % des actions d'une application**, car les 50 à 70 % restants sont trop fragiles pour être automatisés de manière rentable. NAC3 porte ce chiffre à plus de 90 % — la longue traîne devient économiquement adressable.

## Ce que NAC3 permet pour la RPA

### 1. Portabilité multi-tenant

Aujourd'hui : un bot RPA conçu pour l'instance Salesforce du client A ne fonctionne pas chez le client B car les classes CSS diffèrent légèrement. Avec NAC3 : le bot cible `invoice.save`, qui est stable d'un tenant à l'autre. Un seul bot, multi-tenant.

### 2. Portabilité multi-éditeur

Si deux produits SaaS du même domaine (CRM, ERP, gestion de projet) livrent tous deux des manifestes NAC3 avec des verbes communs (`create_invoice`, `mark_paid`), la même logique de bot peut s'exécuter contre l'un ou l'autre. Le bot RPA devient agnostique vis-à-vis des éditeurs.

### 3. Automatisation rédigée par LLM

Un ingénieur CoE décrit l'automatisation en langage naturel :

> « Ouvrir Yujin CRM, trouver toutes les factures impayées de plus de 60 jours, les marquer comme en recouvrement, envoyer un e-mail au conseiller assigné. »

Un LLM ayant accès à `NAC.describe()` produit la séquence d'activités :

```
1. NAC.click_by_verb('invoice', 'list_unpaid')
2. NAC.fill('invoice.filter.age_days_min', 60)
3. NAC.click('invoice.filter.apply')
4. Pour chaque ligne dans NAC.dt_state('invoice.list') :
     - NAC.click_by_verb('invoice', 'mark_collections', {row_id})
     - NAC.click_by_verb('email', 'send_advisor', {row_id})
```

L'ingénieur CoE révise et approuve. Des heures, pas des semaines.

### 4. Auto-découverte pour les nouvelles applications

`NAC.describe()` retourne le manifeste complet. Le bot peut introspecter N'IMPORTE QUELLE application conforme NAC3 à l'exécution. **Une automatisation ciblant « toutes les applications conformes NAC3 ouvertes par l'utilisateur » devient possible** (voir le Yujin Pilot sur yujin.app/pilot pour la version productisée).

### 5. Piste d'audit avec provenance

Chaque dispatch émet `nac:action:succeeded` avec `is_trusted: false` (signalant une origine RPA) + `plugin` + `action_id`. L'application hôte peut journaliser cela à des fins de conformité :

> Le bot xyz a déclenché `invoice.delete` pour la facture #INV-42
> à 14h23 GMT-3, avec `is_trusted=false`. Approuvé par :
> rpa-coe-policy v1.4.

Les équipes GRC obtiennent un journal d'audit déterministe par exécution de bot. Pas de scraping DOM dans les journaux, pas de fuite de données personnelles via les chaînes de sélecteurs.

### 6. Contrôle d'accès aux verbes sensibles

Les applications qui marquent certains verbes (suppression, paiement, attribution de rôle) comme nécessitant `isTrusted` refuseront les dispatches RPA par défaut. Le CoE liste explicitement les verbes que la RPA peut utiliser :

```js
window.__NAC_ALLOW_UNTRUSTED__ = [
  'invoice.send',
  'invoice.save',
  'report.export'
  // les verbes de suppression, paiement et administration sont intentionnellement absents
];
```

La gouvernance du CoE devient une configuration JS + un journal d'audit, et non plus un tableur de permissions de bots.

### 7. Voix + chat comme interface RPA

La couche RPA peut utiliser le panneau de chat comme interface : un ingénieur CoE dit « exécuter le job des factures impayées pour le tenant Acme » et un backend compatible NAC3 résout et dispatche. Le chemin vocal utilise les mêmes primitives `NAC.*` que le chat.

## Matrice d'adoption par plateforme RPA

| Plateforme | Approche | Coût d'intégration | Référence |
|------------|----------|--------------------|-----------|
| UiPath | Injection JS via l'activité Browser | Faible (une activité par appel) | [RPA_UIPATH.md](RPA_UIPATH.md) |
| Automation Anywhere A360 | Run JavaScript Function | Faible | [RPA_AUTOMATION_ANYWHERE.md](RPA_AUTOMATION_ANYWHERE.md) |
| Blue Prism | Inject JavaScript (action VBO) | Faible | [RPA_BLUE_PRISM.md](RPA_BLUE_PRISM.md) |
| Power Automate Desktop | Run JavaScript on web page | Faible | (à venir) |
| RPA basée sur Selenium | execute_script | Faible | -- |
| Basée sur l'image (TagUI, Sikuli) | Chemin de repli ; à utiliser en dernier recours uniquement | Élevé | -- |

## Guide de migration pour une suite d'automatisations existante

### Phase 1 — audit (1 semaine)

1. Inventorier tous les sélecteurs dans toutes les automatisations.
2. Pour chacun : classer en « stable-faible-maintenance » / « fragile-haute-maintenance ».
3. Les fragiles deviennent en priorité des candidats NAC3.

### Phase 2 — préparation de l'application cible

L'application web ciblée par l'automatisation doit adopter NAC3. Soit :

- L'équipe applicative adopte NAC3 via le guide de migration ([AI_PLAYBOOK_MIGRATION.md](AI_PLAYBOOK_MIGRATION.md)).
- OU : le CoE RPA injecte NAC3 côté client via un userscript / une extension de navigateur si l'équipe applicative ne peut pas migrer. Cela fonctionne mais reste fragile ; l'adoption en première partie est préférable.

### Phase 3 — réécriture des automatisations (1 à 2 semaines par automatisation)

Remplacer chaque sélecteur par l'appel `NAC.*` correspondant. La version basée sur les sélecteurs est conservée dans une branche de sauvegarde. La nouvelle version est livrée avec un journal d'audit NAC3 explicite.

### Phase 4 — gouvernance

Le CoE met à jour sa liste de contrôle de révision des bots :
- Le bot ne cible que des identifiants NAC présents dans les manifestes actuels.
- Le bot dispose d'une liste blanche explicite de verbes pour les opérations sensibles.
- Le bot journalise chaque dispatch dans la table d'audit.

## Coût d'adoption

Pour un CoE gérant 50 automatisations sur 10 applications cibles :

- Migration côté application : 6 à 8 semaines (un ingénieur par application).
- Réécriture côté bot : 1 à 2 semaines par bot = 50 à 100 semaines-ingénieur.

Cela paraît coûteux jusqu'à ce qu'on le compare au coût récurrent de la maintenance de 50 bots basés sur des sélecteurs indéfiniment. Le seuil de rentabilité est généralement atteint en 6 à 9 mois ; tout ce qui suit représente des économies nettes de temps ingénieur CoE.

## Risques et atténuation

### Risque — « l'application cible refuse d'adopter NAC3 »

Fréquent dans les logiciels d'entreprise legacy. Atténuation :

- Injection de `nac.js` côté client via une extension de navigateur gérée par le CoE ou un userscript de type Tampermonkey.
- Définition des manifestes côté CoE ; l'application reste intacte.
- Moins robuste qu'une adoption en première partie, mais viable en phase de transition.

### Risque — « la RPA contourne le contrôle isTrusted »

C'est le compromis sécuritaire inhérent. La RPA VA synthétiser des clics. L'application hôte doit lister les verbes que la RPA peut déclencher. Le CoE et l'équipe applicative négocient verbe par verbe. Documenter la négociation ; auditer la liste blanche régulièrement.

### Risque — « nous perdons la visibilité sur la séquence d'actions RPA »

C'est l'inverse : avec NAC3, vous GAGNEZ en visibilité. Chaque dispatch de bot déclenche un événement canonique `nac:action:succeeded` avec un `{plugin, action_id, args, is_trusted}` structuré. Journalisez cela dans votre SIEM avec votre politique de rétention.

## Parallèle sectoriel

Ce que ARIA a fait pour les technologies d'assistance (fournir aux lecteurs d'écran un contrat stable sur la page), NAC3 le fait pour la RPA et l'automatisation agentique. Le CoE passe du rôle de « gardien des sélecteurs » à celui de « concepteur d'automatisations ».

## Voir aussi

- [RPA_UIPATH.md](RPA_UIPATH.md), [RPA_AUTOMATION_ANYWHERE.md](RPA_AUTOMATION_ANYWHERE.md),
  [RPA_BLUE_PRISM.md](RPA_BLUE_PRISM.md) — guides d'intégration par plateforme.
- [IMPACT_TESTING.md](IMPACT_TESTING.md) — analyse d'impact parallèle pour la dimension test/QA.
- [SECURITY.md](../SECURITY.md) — modèle de menace isTrusted dont dépend la liste blanche RPA.

## Licence

Apache-2.0.

---

*This is a machine translation of the canonical English
version at `/nac-spec/guides/IMPACT_RPA.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
