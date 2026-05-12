---
translation_source: guides/RPA_PLAYWRIGHT.md
translation_source_hash: c90a4cc097a692f6fd51ae96eed88a67cadbd94b52bed4bba18af184a4b915bf
translation_quality: machine_v1
translation_lang: de
translation_date: 2026-05-11T14:35:17.528078+00:00
---

# NAC3 + Playwright Integrationsleitfaden

**NAC3-Version:** 2.2 (mit v2.3 Interop-Vorschau)
**Status:** Stabil. Getestet mit Playwright 1.47 + chromium /
firefox / webkit.

Playwright ist heute der De-facto-Standard für Browser-Automatisierung und wird sowohl von QA-Teams (End-to-End-Tests) als auch für leichtgewichtige RPA-Workflows eingesetzt, die unbeaufsichtigt laufen. Mit NAC3 hören Ihre Playwright-Skripte auf, CSS-Selektoren oder XPath anzusteuern, und beginnen stattdessen, über den NAC3-Vertrag der Seite zu dispatchen – denselben Vertrag, den Voice-Runner, Accessibility-Tools, agentische LLM-Workflows und die anderen RPA-Plattformen in dieser Leitfadenreihe verwenden.

Die Yujin-Referenz-Testsuite selbst
(`tests/e2e-nac/specs/*.spec.ts`) ist das kanonische Beispiel.

## Warum NAC3 + Playwright

| Heutiger Schmerzpunkt | NAC3-Lösung |
|--------------|---------|
| `page.click('button.save')` bricht bei CSS-Klassen-Umbenennung | `page.evaluate(() => window.NAC.click('invoice.save'))` ist stabil |
| `page.getByRole('button', {name: 'Save'})` bricht bei Lokalisierung | Dispatch per ID, nicht per Label; label_i18n ist Sache des LLM |
| `waitForSelector` pollt das DOM; fehleranfällig bei asynchronen UIs | `nac:action:succeeded` ist ein deterministisches Event |
| Das Page-Object-Pattern dupliziert die UI-Struktur der Anwendung | Das NAC3-Manifest IST das Page Object – geteilt zwischen Tests und App |
| Visuelle Tests schlagen bei kosmetischen Redesigns fehl | Verhaltenstests über NAC3-IDs überstehen Redesigns |

---

## Zwei Integrationspfade

### Pfad A – `page.evaluate`-Injektion (empfohlen)

Das einfachste Muster: Jede Interaktion läuft über
`window.NAC`, das im Seitenkontext ausgewertet wird.

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

### Pfad B – Eigene Fixtures, die NAC kapseln

Den Boilerplate in einem Playwright-Fixture kapseln:

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

Jetzt lesen sich Ihre Tests so, wie die Anwendung spricht:

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

Die Yujin-Referenz verwendet Pfad B (siehe
`tests/e2e-nac/specs/01-landing.spec.ts`).

---

## Verb-basierter Dispatch (bevorzugt für appübergreifende Wiederverwendung)

Wenn dieselbe Playwright-Suite gegen mehrere Deployments laufen muss (verschiedene Mandanten, verschiedene Marken, gleicher Vertrag), sind Verben gegenüber IDs zu bevorzugen:

```ts
await nac.clickByVerb('invoice', 'save');
```

Hilfsfunktion:

```ts
clickByVerb: (plugin: string, verb: string) =>
  page.evaluate(
    ([p, v]) => window.NAC.click_by_verb(p, v),
    [plugin, verb]
  )
```

Manifest-Vertrag: Jeder Mandant bildet `invoice.save` (oder welche lokale ID auch immer gewählt wird) auf das Verb `save` ab. Der Test muss die lokale ID NICHT kennen.

---

## Auf Ack warten (die deterministische Alternative zu
`waitForSelector`)

Klassisches Playwright:

```ts
await page.click('button.save');
await page.waitForSelector('.toast-success', { timeout: 5000 });
```

Das ist fragil: Jede UI-Änderung am Toast bricht es.

NAC3-bewusst:

```ts
const ack = await new Promise(resolve => {
  page.on('console', msg => { /* optional log */ });
  page.evaluate(() => new Promise(r =>
    document.addEventListener('nac:action:succeeded',
      e => r(e.detail), { once: true }
    )));
}).then(...);

// Oder mit dem Fixture:
const ackPromise = nac.waitForAck();
await nac.click('invoice.save');
const ack = await ackPromise;
```

Das Event ist Teil des Vertrags. Es feuert, wenn der Seiteneffekt abgeschlossen ist – nicht wenn ein beliebiger Toast gerendert wurde.

---

## Automatische Erkennung von Testfällen

NAC3s `describe()` gibt den vollständigen Element-Katalog zurück. Damit lässt sich automatisch ein Test-Gerüst für jede Aktion generieren:

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

Ein Test, jede Aktion, kein Wartungsaufwand pro Aktion. Passt perfekt zu `validate_global({probe: true})` aus der Spezifikation.

---

## Mehrsprachige Testläufe

Playwright-Matrix-Läufe sind trivial: Der Vertrag ist sprachunabhängig.

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

Derselbe Test, 10 Sprachen. Das label_i18n innerhalb der Seite hat sich geändert; der Vertrag nicht.

---

## Snapshot für visuelle Regression

Der NAC3-Baum IST der strukturelle Snapshot. Versionsübergreifend vergleichen:

```ts
test('structural snapshot', async ({ page, nac }) => {
  await page.goto('https://your-app.example.com/');
  const tree = await nac.describe();
  expect(tree).toMatchSnapshot('app-tree.json');
});
```

Ein Redesign, das einen Button um 200px verschiebt, erzeugt KEINEN Snapshot-Diff. Ein Redesign, das den Button ENTFERNT, schon. Das ist die richtige Granularität für verhaltensbasierte Regression.

---

## Cross-Origin- / Interop-Tests (v2.3-Vorschau)

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

Das Präfix `remote:` leitet über die Interop-Schicht weiter, die in `docs/NAC_INTEROP_MCP.md` dokumentiert ist.

---

## Fehlermodi und Debugging

| Symptom | Diagnose |
|---------|-----------|
| `window.NAC is undefined` | Seite bindet nac.js nicht ein – `<script>`-Tag prüfen |
| `NAC.click(...)` gibt `{ok: false, error: 'not_found'}` zurück | ID fehlt im Manifest; `NAC.validate_global()` ausführen, um Tippfehler zu finden |
| Ack feuert nie (Test hängt bei waitForAck) | Handler fehlt `dispatchEvent(new CustomEvent('nac:action:succeeded',...))` – zu `NAC.bindAction()` migrieren (V22-02) |
| Sprachabhängiger Label-Test schlägt für eine Sprache fehl | label_i18n fehlt für diese Sprache – der Spezifikationsvalidator erkennt das |
| Cross-Origin-Test schlägt beim CORS-Preflight fehl | Der Remote-Peer muss `Origin: <your-test-host>` in seiner CORS-Konfiguration erlauben |

Für tieferes Debugging einfügen:

```ts
await page.evaluate(() => {
  document.addEventListener('nac:action:succeeded', e =>
    console.log('[ACK]', e.detail));
  document.addEventListener('nac:action:failed', e =>
    console.warn('[ACK-FAIL]', e.detail));
});
```

Dann mit `--headed` ausführen und die Konsole beobachten.

---

## Yujin-Referenzsuite

Die Yujin-Demos werden mit einer vollständigen Playwright-Suite unter `tests/e2e-nac/specs/` ausgeliefert. Diese Specs in der angegebenen Reihenfolge lesen, um die Muster zu erlernen:

| Spec | Muster |
|------|---------|
| `01-landing.spec.ts` | Grundlegender Seitenaufruf + Autopilot-Start |
| `02-demo-v19.spec.ts` | Smoke-Test über alle Widgets |
| `03-demo-v20.spec.ts` | v20-Panel-Buttons + bindAction-Ack |
| `04-demo-v21.spec.ts` | Datentabellen-dt_*-Dispatches |
| `05-demo-v22-interop.spec.ts` | v2.3 Interop vollständiger Handshake |
| `06-demo-react.spec.ts` | React-Fallstudie via Chat |
| `07-demo-angular.spec.ts` | Angular-Fallstudie via Chat |
| `08-pipeline-end-to-end.spec.ts` | Chat -> LLM -> Dispatch -> Ack |
| `09-diagnostic.spec.ts` | Fehlerinjektion + Wiederherstellung |
| `10-deep-discovery.spec.ts` | Autonome Discovery-Schleife |

Alle 16 Specs laufen via `bash tools/nac/test-launch.sh` in unter 15 Sekunden auf einem frischen Checkout.

---

## CI-Integration

Dies in `.github/workflows/e2e.yml` einfügen:

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

Für Matrix-Läufe über Sprachen / Browser / Mandanten:

```yaml
strategy:
  matrix:
    locale: [es, en, pt, fr, de, ja, zh, hi, ar, it]
    browser: [chromium, firefox, webkit]
```

10 Sprachen × 3 Browser = 30 Jobs, alle mit demselben NAC3-dispatched Testcode.

---

## Vergleich mit traditionellen Playwright-Tests

Eine typische Enterprise-App mit 100 Seiten pflegt ~500–800 Playwright-Tests mit einer Flake-Rate von ~20 % nach einem UI-Redesign. Mit NAC3:

| Kennzahl | Traditionell | NAC3-gestützt |
|--------|-------------|-------------|
| Testanzahl für gleiche Abdeckung | ~500 | ~100 (verb-basiert) |
| Flake-Rate nach Redesign | ~20 % | ~2 % (nur wenn der Vertrag tatsächlich bricht) |
| Wartung nach `<button>` → `<a>`-Tausch | Selektor neu schreiben | keine – ID stabil |
| Neue Sprachunterstützung | Alle labelbasierten Selektoren neu schreiben | keine – sprachunabhängig |
| Mandantenübergreifende Wiederverwendung | Nicht möglich (Selektoren unterscheiden sich) | Trivial (verb-basiert) |

---

## Siehe auch

- `tests/e2e-nac/specs/` – Referenzsuite.
- `tools/nac/test-launch.sh` – Orchestrator.
- [IMPACT_TESTING.md](IMPACT_TESTING.md) – Die umfassendere Auswirkungsanalyse für QA-Teams.
- [LLM_WIRING.md](LLM_WIRING.md) – Derselbe Dispatch-Vertrag, der von LLM-Agenten verwendet wird.
- `docs/NAC_TEST_MANUAL.md` – Standardisiertes Test-Playbook.

## Lizenz

Apache-2.0.

---

*This is a machine translation of the canonical English
version at `/nac-spec/guides/RPA_PLAYWRIGHT.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
