---
translation_source: guides/IMPACT_TESTING.md
translation_source_hash: d69b8343b9c3e6a8ba3e22f198a9a6646d800f3f32a2f0446a506cb44f9e664b
translation_quality: machine_v1
translation_lang: fr
translation_date: 2026-05-11T13:45:26.984672+00:00
---

# Impact de NAC3 sur les tests et l'assurance qualité

**Version NAC3 :** 2.2 stable.
**Public cible :** Ingénieurs test, responsables QA, SDETs, CTOs évaluant
le coût de maintenance à long terme des tests lors d'une adoption de NAC3.

## En résumé

Le code de test qui utilise les identifiants NAC3 survit aux refactorisations d'interface. Le code de test qui utilise des sélecteurs CSS, non. Cette seule propriété transforme l'économie de la maintenance des tests : on passe d'un coût « linéaire avec les changements d'UI » à un coût « linéaire avec les changements fonctionnels » — soit généralement 5 à 10 fois moins de travail.

## Le calcul de maintenance aujourd'hui

Une suite Selenium / Cypress / Playwright typique pour une application web non triviale contient des centaines de sélecteurs :

```ts
await page.locator('button.btn-primary.btn-large:has-text("Save")').click();
await page.locator('div.modal > div.body > input[type="text"]:first-of-type').fill('Acme');
await page.locator('table.invoice-grid > tbody > tr:nth-child(1) > td:last-child > button').click();
```

Ces sélecteurs cassent lorsque :

- L'équipe design renomme `.btn-primary` en `.btn-cta`.
- Une div englobante est ajoutée pour l'accessibilité.
- Le libellé du bouton est internationalisé et « Save » devient
  « Guardar » dans les tests du tenant es.
- La mise en page passe à `grid-template-rows`.
- N'importe quel aspect de la page qui N'EST PAS l'intention sémantique
  change.

Les enquêtes sectorielles (2024-2025) estiment que **30 à 50 % du temps des ingénieurs QA est consacré à la maintenance des sélecteurs**. Ce chiffre empire à mesure que l'application grossit.

## Le calcul de maintenance avec NAC3

```ts
await NAC.click('invoice.save');
await NAC.fill('invoice.client_name', 'Acme');
await NAC.click('invoice.line.42.delete');
```

Ces appels survivent à :

- Les renommages de classes CSS (les sélecteurs ne référencent pas le CSS).
- La restructuration de l'arbre DOM (les sélecteurs ne référencent pas la structure).
- Les changements de libellés I18n (les sélecteurs ne référencent pas le texte).
- Les migrations de mise en page grid vers flex.
- Les changements de bibliothèque de composants.

Ils cassent UNIQUEMENT lorsque :

- L'équipe produit renomme un verbe (`save` -> `commit`).
- Un bouton est entièrement supprimé.

Ce sont des **changements fonctionnels**, pas des changements d'UI. Le test doit être mis à jour pour la même raison que le code de production doit l'être. C'est le bon référentiel de coût.

## Métriques d'impact concrètes

Données internes de Yujin CRM (2025) :

| Métrique | Avant NAC | Après NAC | Delta |
|--------|-----------|-----------|-------|
| Nombre moyen de lignes par spec Playwright | 187 | 64 | -66 % |
| Maintenance par spec après un sprint de refonte | 4,2 heures | 0,3 heure | -93 % |
| Échecs de tests liés aux sélecteurs par semaine | 38 | 2 | -95 % |
| Montée en compétence d'un nouvel ingénieur QA | 3 semaines | 1 semaine | -67 % |
| Tests passants 6 mois après écriture, sans modification | 31 % | 89 % | +180 % |

Le chiffre de 89 % est décisif. **La grande majorité des tests NAC3 continuent de fonctionner au fil de l'évolution normale du produit**, tandis que leurs équivalents basés sur des sélecteurs se dégradent.

## Ce que NAC3 permet pour l'automatisation des tests

### 1. Corpus de tests stable

Un test écrit en 2024 ciblant `NAC.click('invoice.save')` fonctionne encore en 2026 si le verbe `save` survit à la feuille de route produit. Le DOM autour du bouton peut avoir été reconstruit trois fois.

### 2. Tests multi-navigateurs sans adaptation des sélecteurs

Les sélecteurs CSS se comportent différemment selon Chromium / Firefox /
WebKit pour certains cas limites (pseudo-éléments, anneaux de focus, shadow
DOM). NAC3 passe par le résolveur du runtime — le même chemin de code quel que soit le navigateur.

### 3. Tests agnostiques à l'I18n

Pour une application multi-locale : la suite de tests actuelle nécessite des exécutions par locale parce que « Save » / « Guardar » / « Speichern » désignent tous le même bouton. Avec NAC3, le test appelle l'identifiant ; le runtime résout toutes les locales. **Vous écrivez 1 test, il s'exécute sur 10 locales** (une par ).

### 4. Rédaction de tests assistée par LLM

Un LLM qui voit `NAC.describe()` peut produire une spec de test complète à partir d'une description en langage naturel : « Tester que l'ajout d'une ligne puis sa suppression remet le tableau dans son état initial. » Le LLM émet des appels `NAC.*` ; vous relisez et commitez. Le Yujin CRM compte environ 250 specs rédigées de cette façon et relues avant merge.

### 5. Tests auto-réparateurs via la découverte

Lorsqu'un test échoue parce qu'un identifiant a été renommé :

```ts
try {
  await NAC.click('invoice.save');
} catch (e) {
  if (e.code === 'not_found') {
    // Re-discover; the verb 'save' may live under a new id.
    const r = await NAC.click_by_verb('invoice', 'save');
    if (r.ok) console.warn('id has changed; update test');
  }
}
```

Le `click_by_verb` du runtime offre un mécanisme de repli auto-réparateur qui signale « ce test doit être mis à jour, mais l'action fonctionne toujours » — un mode d'échec bien plus utile que « sélecteur introuvable, point final ».

### 6. Génération de tests à partir des manifestes

`NAC.validate_global({probe: true})` synthétise un clic sur chaque élément
`role="action"` et vérifie qu'il émet l'événement d'acquittement canonique dans les 5 secondes. **Il s'agit d'un test de fumée auto-généré pour toute la surface cliquable de l'application**. Exécutez-le en CI ; il détecte tout bouton monté sans émission correcte de l'acquittement.

### 7. Couverture par étape du pipeline

La suite de tests de référence de Yujin (NAC_TEST_MANUAL.md) organise les tests par étape du pipeline NAC3 :

- Étape 1 (entrée STT)
- Étape 2 (Désambiguïsation)
- Étape 3 (Intermédiaire LLM)
- Étape 4 (Appels NAC.*)
- Étape 5 (Effet de bord DOM)
- Étape 6 (Événement d'acquittement)

La couverture est mesurée **par étape**, pas seulement par ligne de code.
La référence Yujin rapporte environ 95 % de moyenne pondérée sur toutes les étapes. Adopter ce schéma vous donne un tableau de bord de couverture qui correspond directement au contrat.

## Impact sur les frameworks de test existants

### Playwright

Intégration directe. `page.evaluate()` invoque les appels `NAC.*`.
Les sélecteurs restent disponibles en repli pour les assertions de mise en page. La référence Yujin inclut 16 specs Playwright dans
`tests/e2e-nac/specs/`.

### Cypress

`cy.window().then(win => win.NAC.click(id))`. Même approche.
Des commandes personnalisées encapsulent les appels NAC :
`cy.nacClick('invoice.save')`.

### Selenium

Exécuteur JavaScript : `driver.execute_script('return
window.NAC.click(arguments[0])', 'invoice.save')`.

### Jest + React Testing Library

```ts
import '@nac3/runtime';
import { render } from '@testing-library/react';
import { App } from './App';

test('save works', async () => {
  render(<App />);
  await window.NAC.click('invoice.save');
  expect(mockApi.save).toHaveBeenCalled();
});
```

NAC3 fonctionne aux côtés de React Testing Library, pas en opposition.

### Karma / Jasmine / anciens runners

Injection directe via `window.NAC`. Tout ce qui peut exécuter du JavaScript dans un contexte navigateur fonctionne.

## Coût d'adoption

### Application existante

Selon le [guide de migration](AI_PLAYBOOK_MIGRATION.md), comptez :

- Environ 1 jour par écran pour la décoration et le manifeste.
- Environ 1 jour par écran pour la migration du corpus de tests.
- Total pour une application de 20 écrans : environ 6 semaines de travail pour un ingénieur,
  amorti par les économies de maintenance en 3 à 4 mois.

### Nouvelle application

Intégré d'emblée. Le guide greenfield traite les attributs NAC3 comme une préoccupation de premier ordre. Aucun coût de rétrofit.

## Risques et atténuation

### Risque — « nous ne faisons pas confiance aux tests générés par LLM »

Légitime. Le LLM produit un candidat ; un humain relit et commite.
Même flux de travail que Copilot. Le corpus livré est exactement ce que l'équipe a approuvé, pas ce que le LLM a écrit.

### Risque — « les identifiants NAC deviennent de la dette technique avec le temps »

Vrai si vous les laissez se dégrader. Traitez les identifiants NAC comme des noms de colonnes de base de données : renommez via migration, ne supprimez jamais en cours d'utilisation.
Le CLI `@nac3/runtime` détecte les identifiants orphelins via un lint statique.

### Risque — « et si l'adoption de NAC stagne ? »

La spec est sous licence Apache-2.0. Le runtime fait moins de 200 Ko. Dans le pire des cas : vous possédez l'artefact, les identifiants restent stables. Le pire des cas reste meilleur que les sélecteurs CSS.

## Voir aussi

- [NAC_TEST_MANUAL.md](../docs/NAC_TEST_MANUAL.md) — le guide de test standardisé que cette analyse d'impact sous-tend.
- [RPA_UIPATH.md](RPA_UIPATH.md) /
  [RPA_AUTOMATION_ANYWHERE.md](RPA_AUTOMATION_ANYWHERE.md) /
  [RPA_BLUE_PRISM.md](RPA_BLUE_PRISM.md) — applications adjacentes
  du même contrat.
- [COVERAGE_REPORT_2026_05_10.md](../docs/COVERAGE_REPORT_2026_05_10.md)
  — les chiffres de couverture propres à la référence Yujin.

## Licence

Apache-2.0.

---

*This is a machine translation of the canonical English
version at `/nac-spec/guides/IMPACT_TESTING.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
