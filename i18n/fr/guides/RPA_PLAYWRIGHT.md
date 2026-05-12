---
translation_source: guides/RPA_PLAYWRIGHT.md
translation_source_hash: c90a4cc097a692f6fd51ae96eed88a67cadbd94b52bed4bba18af184a4b915bf
translation_quality: machine_v1
translation_lang: fr
translation_date: 2026-05-11T13:48:04.241160+00:00
---

# Guide d'intégration NAC3 + Playwright

**Version NAC3 :** 2.2 (avec aperçu d'interopérabilité v2.3)
**Statut :** Stable. Testé avec Playwright 1.47 + chromium /
firefox / webkit.

Playwright est aujourd'hui la référence incontournable pour l'automatisation de navigateur, utilisé aussi bien par les équipes QA (tests de bout en bout) que pour des flux RPA légers exécutés sans supervision. Avec NAC3, vos scripts Playwright cessent de cibler des sélecteurs CSS ou XPath pour passer par le contrat NAC3 de la page — le même contrat utilisé par les runners vocaux, les outils d'accessibilité, les workflows LLM agentiques et les autres plateformes RPA de cette série de guides.

La suite de tests de référence Yujin
(`tests/e2e-nac/specs/*.spec.ts`) en est l'exemple canonique.

## Pourquoi NAC3 + Playwright

| Problème actuel | Solution NAC3 |
|----------------|---------------|
| `page.click('button.save')` casse lors d'un renommage de classe CSS | `page.evaluate(() => window.NAC.click('invoice.save'))` est stable |
| `page.getByRole('button', {name: 'Save'})` casse lors d'une localisation | Dispatch par id, pas par libellé ; label_i18n est l'affaire du LLM |
| `waitForSelector` interroge le DOM en boucle ; instable sur les interfaces asynchrones | `nac:action:succeeded` est un événement déterministe |
| Le pattern page-object duplique la structure UI de l'application | Le manifeste NAC3 EST l'objet page — partagé entre les tests et l'application |
| Les tests visuels se dégradent à chaque refonte cosmétique | Les tests comportementaux via les ids NAC3 survivent aux refontes |

---

## Deux approches d'intégration

### Approche A — injection via `page.evaluate` (recommandée)

Le pattern le plus simple : chaque interaction passe par
`window.NAC` évalué dans le contexte de la page.

```ts
import { test, expect } from '@playwright/test';

test('save an invoice', async ({ page }) => {
  await page.goto('https://your-app.example.com/');

  // Wait for NAC3 to mount.
  await page.waitForFunction(() => window.NAC?.describe);

  // Fill a field.
  await page.evaluate(() =>
    window.NAC.fill('invoice.amount', '1500')
  );

  // Click an action + wait for its ack.
  const ackPromise = page.evaluate(() =>
    new Promise(resolve => {
      document.addEventListener(
        'nac:action:succeeded',
        e => resolve(e.detail),
        { once: true }
      );
    })
  );
  await page.evaluate(() =>
    window.NAC.click('invoice.save')
  );
  const ack = await ackPromise;

  expect(ack).toMatchObject({
    plugin: 'invoice',
    action_id: 'invoice.save'
  });
});
```

### Approche B — fixtures personnalisées encapsulant NAC

Encapsulez le code répétitif dans une fixture Playwright :

```ts
// tests/fixtures/nac.ts
import { test as base, Page } from '@playwright/test';

type NacApi = {
  click: (id: string) => Promise<void>;
  fill:  (id: string, value: string) => Promise<void>;
  tab:   (plugin: string, tabKey: string) => Promise<void>;
  describe: () => Promise<any>;
  waitForAck: () => Promise<any>;
};

export const test = base.extend<{ nac: NacApi }>({
  nac: async ({ page }, use) => {
    await page.waitForFunction(() => window.NAC?.describe);
    const api: NacApi = {
      click:  id => page.evaluate(i => window.NAC.click(i), id),
      fill:   (id, v) => page.evaluate(
        ([i, val]) => window.NAC.fill(i, val), [id, v]
      ),
      tab:    (p, k) => page.evaluate(
        ([pl, key]) => window.NAC.tab(pl, key), [p, k]
      ),
      describe: () => page.evaluate(() => window.NAC.describe()),
      waitForAck: () => page.evaluate(() =>
        new Promise(resolve => {
          document.addEventListener(
            'nac:action:succeeded',
            e => resolve(e.detail),
            { once: true }
          );
        })
      )
    };
    await use(api);
  }
});

export { expect } from '@playwright/test';
```

Vos tests reflètent alors le langage de l'application :

```ts
import { test, expect } from './fixtures/nac';

test('save flow', async ({ page, nac }) => {
  await page.goto('https://your-app.example.com/');
  await nac.fill('invoice.amount', '1500');

  const ackPromise = nac.waitForAck();
  await nac.click('invoice.save');
  const ack = await ackPromise;

  expect(ack.action_id).toBe('invoice.save');
});
```

La référence Yujin utilise l'approche B (voir
`tests/e2e-nac/specs/01-landing.spec.ts`).

---

## Dispatch par verbe (recommandé pour la réutilisation multi-application)

Lorsque la même suite Playwright doit s'exécuter sur plusieurs
déploiements (tenants différents, marques différentes, même
contrat), préférez les verbes aux ids :

```ts
await nac.clickByVerb('invoice', 'save');
```

Fonction utilitaire :

```ts
clickByVerb: (plugin: string, verb: string) =>
  page.evaluate(
    ([p, v]) => window.NAC.click_by_verb(p, v),
    [plugin, verb]
  )
```

Contrat du manifeste : chaque tenant associe `invoice.save` (ou
l'id local qu'il choisit) au verbe `save`. Le test n'a PAS
besoin de connaître l'id local.

---

## Attente de l'accusé de réception (l'alternative déterministe à
`waitForSelector`)

Approche Playwright classique :

```ts
await page.click('button.save');
await page.waitForSelector('.toast-success', { timeout: 5000 });
```

Cette approche est fragile : toute modification UI de la notification casse le test.

Approche NAC3 :

```ts
const ack = await new Promise(resolve => {
  page.on('console', msg => { /* optional log */ });
  page.evaluate(() => new Promise(r =>
    document.addEventListener('nac:action:succeeded',
      e => r(e.detail), { once: true }
    )));
}).then(...);

// Ou avec la fixture :
const ackPromise = nac.waitForAck();
await nac.click('invoice.save');
const ack = await ackPromise;
```

L'événement fait partie du contrat. Il se déclenche lorsque
l'effet de bord est terminé, et non lorsqu'une notification
arbitraire s'est affichée.

---

## Découverte automatique des cas de test

La méthode `describe()` de NAC3 retourne le catalogue complet des éléments. Utilisez-la pour
générer automatiquement un squelette de test pour chaque action :

```ts
test('smoke -- click every action', async ({ page, nac }) => {
  await page.goto('https://your-app.example.com/');
  const tree = await nac.describe();

  for (const plugin of tree.plugins) {
    for (const el of plugin.elements) {
      if (el.role !== 'action') continue;
      console.log('smoke clicking', el.id);
      await page.evaluate(id =>
        window.NAC.click(id), el.id
      );
    }
  }
});
```

Un seul test, toutes les actions, zéro maintenance par action. Se combine
parfaitement avec `validate_global({probe: true})` de la spécification.

---

## Exécutions multi-locale

Les exécutions en matrice Playwright sont triviales : le contrat est
indépendant de la locale.

```ts
const locales = ['es', 'en', 'pt', 'fr', 'de', 'ja',
                 'zh', 'hi', 'ar', 'it'];

for (const lang of locales) {
  test(`save invoice -- ${lang}`, async ({ page, nac }) => {
    await page.goto(`https://your-app.example.com/?lang=${lang}`);
    await nac.fill('invoice.amount', '1500');
    const ack = nac.waitForAck();
    await nac.click('invoice.save');
    expect((await ack).action_id).toBe('invoice.save');
  });
}
```

Le même test, 10 locales. Le label_i18n dans la page a changé ;
le contrat, non.

---

## Instantané pour la régression visuelle

L'arbre NAC3 EST l'instantané structurel. Comparez-le entre les versions :

```ts
test('structural snapshot', async ({ page, nac }) => {
  await page.goto('https://your-app.example.com/');
  const tree = await nac.describe();
  expect(tree).toMatchSnapshot('app-tree.json');
});
```

Une refonte qui déplace un bouton de 200px ne crée PAS de différence dans
l'instantané. Une refonte qui SUPPRIME le bouton, si. C'est le bon niveau de
granularité pour une régression de type comportemental.

---

## Tests cross-origin / interopérabilité (aperçu v2.3)

```ts
test('interop import remote app', async ({ page, nac }) => {
  await page.goto('https://app-a.example.com/');
  await page.evaluate(() => window.NAC.import_remote_tree({
    url: 'https://app-b.example.com/nac/export',
    bearer: 'TEST_TOKEN',
    namespace: 'b'
  }));
  const remotes = await page.evaluate(() =>
    window.NAC.list_remote_apps()
  );
  expect(remotes).toContainEqual(
    expect.objectContaining({ namespace: 'b' })
  );

  // Now dispatch into the remote app via the local NAC:
  await page.evaluate(() =>
    window.NAC.click('remote:b:invoice.save')
  );
});
```

Le préfixe `remote:` est routé via la couche d'interopérabilité documentée
dans `docs/NAC_INTEROP_MCP.md`.

---

## Modes d'échec et débogage

| Symptôme | Diagnostic |
|----------|------------|
| `window.NAC is undefined` | La page n'inclut pas nac.js — vérifiez la balise `<script>` |
| `NAC.click(...)` retourne `{ok: false, error: 'not_found'}` | L'id est absent du manifeste ; exécutez `NAC.validate_global()` pour trouver les fautes de frappe |
| L'accusé de réception ne se déclenche jamais (le test reste bloqué sur waitForAck) | Le handler ne contient pas `dispatchEvent(new CustomEvent('nac:action:succeeded',...))` — migrez vers `NAC.bindAction()` (V22-02) |
| Le test de libellé dépendant de la locale échoue pour une locale | label_i18n manque cette locale — le validateur de spécification le détecte |
| Le test cross-origin échoue au preflight CORS | Le pair distant doit autoriser `Origin: <your-test-host>` dans sa configuration CORS |

Pour un débogage approfondi, ajoutez :

```ts
await page.evaluate(() => {
  document.addEventListener('nac:action:succeeded', e =>
    console.log('[ACK]', e.detail));
  document.addEventListener('nac:action:failed', e =>
    console.warn('[ACK-FAIL]', e.detail));
});
```

Puis lancez avec `--headed` et observez la console.

---

## Suite de référence Yujin

Les démos Yujin sont livrées avec une suite Playwright complète dans
`tests/e2e-nac/specs/`. Lisez ces fichiers dans l'ordre pour apprendre les
patterns :

| Spec | Pattern |
|------|---------|
| `01-landing.spec.ts` | chargement de page basique + démarrage de l'autopilote |
| `02-demo-v19.spec.ts` | smoke de parcours de tous les widgets |
| `03-demo-v20.spec.ts` | boutons du panneau v20 + accusé de réception bindAction |
| `04-demo-v21.spec.ts` | dispatches dt_* du tableau de données |
| `05-demo-v22-interop.spec.ts` | handshake complet d'interopérabilité v2.3 |
| `06-demo-react.spec.ts` | cas d'étude React via chat |
| `07-demo-angular.spec.ts` | cas d'étude Angular via chat |
| `08-pipeline-end-to-end.spec.ts` | chat -> LLM -> dispatch -> accusé de réception |
| `09-diagnostic.spec.ts` | injection de pannes + récupération |
| `10-deep-discovery.spec.ts` | boucle de découverte autonome |

Les 16 specs s'exécutent via `bash tools/nac/test-launch.sh` en moins de
15 secondes sur un dépôt fraîchement cloné.

---

## Intégration CI

Ajoutez ceci dans `.github/workflows/e2e.yml` :

```yaml
name: e2e
on: [push, pull_request]
jobs:
  playwright:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - run: npx playwright test
        env:
          BASE_URL: https://staging.your-app.example.com
```

Pour les exécutions en matrice sur plusieurs locales / navigateurs / tenants :

```yaml
strategy:
  matrix:
    locale: [es, en, pt, fr, de, ja, zh, hi, ar, it]
    browser: [chromium, firefox, webkit]
```

10 locales x 3 navigateurs = 30 jobs, tous réutilisant le même code de test
dispatché via NAC3.

---

## Comparaison avec les tests Playwright traditionnels

Une application d'entreprise typique de 100 pages maintient environ 500 à 800 tests Playwright,
avec un taux d'instabilité d'environ 20 % après une refonte UI. Avec NAC3 :

| Indicateur | Traditionnel | Avec NAC3 |
|------------|-------------|-----------|
| Nombre de tests pour la même couverture | ~500 | ~100 (basé sur les verbes) |
| Taux d'instabilité après refonte | ~20 % | ~2 % (uniquement quand le contrat change réellement) |
| Maintenance après remplacement `<button>` -> `<a>` | réécriture du sélecteur | aucune — l'id est stable |
| Ajout d'une nouvelle locale | réécriture de tous les sélecteurs basés sur les libellés | aucune — indépendant de la locale |
| Réutilisation multi-tenant | impossible (les sélecteurs diffèrent) | triviale (basé sur les verbes) |

---

## Voir aussi

- `tests/e2e-nac/specs/` — suite de référence.
- `tools/nac/test-launch.sh` — orchestrateur.
- [IMPACT_TESTING.md](IMPACT_TESTING.md) — analyse d'impact complète
  pour les équipes QA.
- [LLM_WIRING.md](LLM_WIRING.md) — le même contrat de dispatch
  utilisé par les agents LLM.
- `docs/NAC_TEST_MANUAL.md` — guide de test standardisé.

## Licence

Apache-2.0.

---

*This is a machine translation of the canonical English
version at `/nac-spec/guides/RPA_PLAYWRIGHT.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
