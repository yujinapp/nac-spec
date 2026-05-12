---
translation_source: guides/RPA_PLAYWRIGHT.md
translation_source_hash: c90a4cc097a692f6fd51ae96eed88a67cadbd94b52bed4bba18af184a4b915bf
translation_quality: machine_v1
translation_lang: it
translation_date: 2026-05-11T14:13:50.773017+00:00
---

# Guida all'integrazione NAC3 + Playwright

**Versione NAC3:** 2.2 (con anteprima interop v2.3)
**Stato:** Stabile. Testato con Playwright 1.47 + chromium /
firefox / webkit.

Playwright è oggi lo standard de-facto per l'automazione del browser,
utilizzato sia dai team QA (test end-to-end) che per flussi RPA leggeri
eseguiti in modalità non presidiata. Con NAC3, i tuoi script Playwright
smettono di puntare a selettori CSS o XPath e iniziano a fare dispatch
attraverso il contratto NAC3 della pagina -- lo stesso contratto usato
da voice runner, strumenti di accessibilità, workflow LLM agentici e
le altre piattaforme RPA descritte in questa serie di guide.

La suite di test di riferimento Yujin
(`tests/e2e-nac/specs/*.spec.ts`) è l'esempio canonico.

## Perché NAC3 + Playwright

| Problema attuale | Soluzione NAC3 |
|------------------|----------------|
| `page.click('button.save')` si rompe quando la classe CSS viene rinominata | `page.evaluate(() => window.NAC.click('invoice.save'))` è stabile |
| `page.getByRole('button', {name: 'Save'})` si rompe con la localizzazione | Dispatch per id, non per etichetta; label_i18n è responsabilità dell'LLM |
| `waitForSelector` fa polling del DOM; instabile su UI asincrone | `nac:action:succeeded` è un evento deterministico |
| Il pattern page-object duplica la struttura UI dell'applicazione | Il manifest NAC3 È il page object -- condiviso tra test e app |
| I test visivi si degradano a ogni redesign cosmetico | I test comportamentali tramite id NAC3 sopravvivono ai redesign |

---

## Due percorsi di integrazione

### Percorso A -- iniezione con `page.evaluate` (consigliato)

Il pattern più semplice: ogni interazione passa attraverso
`window.NAC` valutato nel contesto della pagina.

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

### Percorso B -- Fixture personalizzate che wrappano NAC

Incapsula il codice ripetitivo in una fixture Playwright:

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

Ora i tuoi test si leggono come parla l'applicazione:

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

Il riferimento Yujin usa il Percorso B (vedi
`tests/e2e-nac/specs/01-landing.spec.ts`).

---

## Dispatch basato su verbi (preferibile per il riuso cross-app)

Quando la stessa suite Playwright deve girare su più
deployment (tenant diversi, brand diversi, stesso contratto),
preferisci i verbi agli id:

```ts
await nac.clickByVerb('invoice', 'save');
```

Helper:

```ts
clickByVerb: (plugin: string, verb: string) =>
  page.evaluate(
    ([p, v]) => window.NAC.click_by_verb(p, v),
    [plugin, verb]
  )
```

Contratto del manifest: ogni tenant mappa `invoice.save` (o
qualsiasi id locale scelga) al verbo `save`. Il test NON
ha bisogno di conoscere l'id locale.

---

## Attendere l'ack (l'alternativa deterministica a
`waitForSelector`)

Playwright tradizionale:

```ts
await page.click('button.save');
await page.waitForSelector('.toast-success', { timeout: 5000 });
```

Questo è fragile: qualsiasi modifica UI al toast lo rompe.

Con NAC3:

```ts
const ack = await new Promise(resolve => {
  page.on('console', msg => { /* optional log */ });
  page.evaluate(() => new Promise(r =>
    document.addEventListener('nac:action:succeeded',
      e => r(e.detail), { once: true }
    )));
}).then(...);

// Oppure con la fixture:
const ackPromise = nac.waitForAck();
await nac.click('invoice.save');
const ack = await ackPromise;
```

L'evento fa parte del contratto. Si attiva quando l'effetto
collaterale è completato, non quando un toast arbitrario viene renderizzato.

---

## Auto-discovery dei casi di test

`describe()` di NAC3 restituisce il catalogo completo degli elementi. Usalo per
generare automaticamente lo scaffolding dei test per ogni azione:

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

Un test, ogni azione, zero manutenzione per singola azione. Si abbina
perfettamente a `validate_global({probe: true})` della spec.

---

## Esecuzioni multi-locale

Le matrix run di Playwright sono banali: il contratto è
locale-agnostico.

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

Lo stesso test, 10 locale. Il label_i18n all'interno della pagina è cambiato;
il contratto no.

---

## Snapshot per la regressione visiva

L'albero NAC3 È lo snapshot strutturale. Confrontalo tra release:

```ts
test('structural snapshot', async ({ page, nac }) => {
  await page.goto('https://your-app.example.com/');
  const tree = await nac.describe();
  expect(tree).toMatchSnapshot('app-tree.json');
});
```

Un redesign che sposta un pulsante di 200px NON produce diff nello
snapshot. Un redesign che RIMUOVE il pulsante sì. Questa è la
giusta granularità per la regressione a livello comportamentale.

---

## Test cross-origin / interop (anteprima v2.3)

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

Il prefisso `remote:` instrada attraverso il layer interop documentato
in `docs/NAC_INTEROP_MCP.md`.

---

## Modalità di errore e debugging

| Sintomo | Diagnosi |
|---------|----------|
| `window.NAC is undefined` | La pagina non include nac.js -- controlla il tag `<script>` |
| `NAC.click(...)` restituisce `{ok: false, error: 'not_found'}` | Id mancante dal manifest; esegui `NAC.validate_global()` per trovare errori di battitura |
| L'ack non arriva mai (il test si blocca su waitForAck) | All'handler manca `dispatchEvent(new CustomEvent('nac:action:succeeded',...))` -- migra a `NAC.bindAction()` (V22-02) |
| Il test con etichetta locale-dipendente fallisce per una locale | label_i18n manca quella locale -- il validatore della spec lo rileva |
| Il test cross-origin fallisce il preflight CORS | Il peer remoto deve consentire `Origin: <your-test-host>` nella sua configurazione CORS |

Per un debugging più approfondito, aggiungi:

```ts
await page.evaluate(() => {
  document.addEventListener('nac:action:succeeded', e =>
    console.log('[ACK]', e.detail));
  document.addEventListener('nac:action:failed', e =>
    console.warn('[ACK-FAIL]', e.detail));
});
```

Poi esegui con `--headed` e osserva la console.

---

## Suite di riferimento Yujin

Le demo Yujin includono una suite Playwright completa in
`tests/e2e-nac/specs/`. Leggile in ordine per apprendere i
pattern:

| Spec | Pattern |
|------|---------|
| `01-landing.spec.ts` | caricamento base della pagina + avvio autopilot |
| `02-demo-v19.spec.ts` | smoke walk su ogni widget |
| `03-demo-v20.spec.ts` | pulsanti v20-panel + ack bindAction |
| `04-demo-v21.spec.ts` | dispatch dt_* su data-table |
| `05-demo-v22-interop.spec.ts` | handshake completo interop v2.3 |
| `06-demo-react.spec.ts` | caso studio React via chat |
| `07-demo-angular.spec.ts` | caso studio Angular via chat |
| `08-pipeline-end-to-end.spec.ts` | chat -> LLM -> dispatch -> ack |
| `09-diagnostic.spec.ts` | iniezione di errori + recovery |
| `10-deep-discovery.spec.ts` | loop di discovery autonomo |

Tutte le 16 spec vengono eseguite tramite `bash tools/nac/test-launch.sh` in meno di
15 secondi su un checkout pulito.

---

## Integrazione CI

Aggiungi questo in `.github/workflows/e2e.yml`:

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

Per matrix run su locale / browser / tenant:

```yaml
strategy:
  matrix:
    locale: [es, en, pt, fr, de, ja, zh, hi, ar, it]
    browser: [chromium, firefox, webkit]
```

10 locale x 3 browser = 30 job, tutti che riutilizzano lo stesso codice
di test con dispatch NAC3.

---

## Confronto con i test Playwright tradizionali

Una tipica app enterprise da 100 pagine mantiene ~500-800 test Playwright,
con un tasso di flakiness del ~20% dopo un redesign UI. Con NAC3:

| Metrica | Tradizionale | Con NAC3 |
|---------|-------------|----------|
| Numero di test per la stessa copertura | ~500 | ~100 (basato su verbi) |
| Tasso di flakiness post-redesign | ~20% | ~2% (solo quando il contratto si rompe davvero) |
| Manutenzione dopo swap `<button>` -> `<a>` | riscrivere il selettore | nessuna -- id stabile |
| Supporto nuova locale | riscrivere tutti i selettori basati su etichetta | nessuna -- locale-agnostico |
| Riuso cross-tenant | impossibile (i selettori differiscono) | banale (basato su verbi) |

---

## Vedi anche

- `tests/e2e-nac/specs/` -- suite di riferimento.
- `tools/nac/test-launch.sh` -- orchestratore.
- [IMPACT_TESTING.md](IMPACT_TESTING.md) -- l'analisi di impatto più ampia
  per i team QA.
- [LLM_WIRING.md](LLM_WIRING.md) -- lo stesso contratto di dispatch
  usato dagli agenti LLM.
- `docs/NAC_TEST_MANUAL.md` -- playbook di test standardizzato.

## Licenza

Apache-2.0.

---

*This is a machine translation of the canonical English
version at `/nac-spec/guides/RPA_PLAYWRIGHT.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
