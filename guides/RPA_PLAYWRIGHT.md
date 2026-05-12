# NAC3 + Playwright integration guide

**NAC3 version:** 2.2 (with v2.3 interop preview)
**Status:** Stable. Tested against Playwright 1.47 + chromium /
firefox / webkit.

Playwright is the de-facto standard for browser automation today,
used by both QA teams (end-to-end tests) and lightweight RPA
flows that run unattended. With NAC3, your Playwright scripts
stop targeting CSS selectors or XPath and start dispatching
through the page's NAC3 contract -- the same contract used by
voice runners, accessibility tools, agentic LLM workflows, and
the other RPA platforms in this guide series.

The Yujin reference test suite itself
(`tests/e2e-nac/specs/*.spec.ts`) is the canonical example.

## Why NAC3 + Playwright

| Today's pain | NAC3 fix |
|--------------|---------|
| `page.click('button.save')` breaks when CSS class renames | `page.evaluate(() => window.NAC.click('invoice.save'))` is stable |
| `page.getByRole('button', {name: 'Save'})` breaks when localised | Dispatch by id, not label; label_i18n is the LLM's concern |
| `waitForSelector` polls the DOM; flaky on async UIs | `nac:action:succeeded` is a deterministic event |
| Page-object pattern duplicates the application's UI structure | NAC3 manifest IS the page object -- shared between tests + app |
| Visual tests churn on cosmetic redesigns | Behaviour tests via NAC3 ids survive redesigns |

---

## Two integration paths

### Path A -- `page.evaluate` injection (recommended)

The simplest pattern: every interaction goes through
`window.NAC` evaluated in the page context.

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

### Path B -- Custom fixtures wrapping NAC

Wrap the boilerplate in a Playwright fixture:

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

Now your tests read like the application speaks:

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

The Yujin reference uses Path B (see
`tests/e2e-nac/specs/01-landing.spec.ts`).

---

## Verb-based dispatch (preferred for cross-app reuse)

When the same Playwright suite must run against several
deployments (different tenants, different brands, same
contract), prefer verbs over ids:

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

Manifest contract: every tenant maps `invoice.save` (or
whatever local id it picks) to verb `save`. The test does NOT
need to know the local id.

---

## Waiting for ack (the deterministic alternative to
`waitForSelector`)

Old-school Playwright:

```ts
await page.click('button.save');
await page.waitForSelector('.toast-success', { timeout: 5000 });
```

This is brittle: any UI change to the toast breaks it.

NAC3-aware:

```ts
const ack = await new Promise(resolve => {
  page.on('console', msg => { /* optional log */ });
  page.evaluate(() => new Promise(r =>
    document.addEventListener('nac:action:succeeded',
      e => r(e.detail), { once: true }
    )));
}).then(...);

// Or with the fixture:
const ackPromise = nac.waitForAck();
await nac.click('invoice.save');
const ack = await ackPromise;
```

The event is part of the contract. It fires when the side
effect completed, not when an arbitrary toast rendered.

---

## Auto-discovery of test cases

NAC3's `describe()` returns the full element catalog. Use it to
generate test scaffolding for every action automatically:

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

One test, every action, zero per-action maintenance. Pairs
perfectly with `validate_global({probe: true})` from the spec.

---

## Multi-locale runs

Playwright matrix runs are trivial: the contract is locale-
agnostic.

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

Same test, 10 locales. The label_i18n inside the page changed;
the contract did not.

---

## Snapshot for visual regression

The NAC3 tree IS the structural snapshot. Compare across releases:

```ts
test('structural snapshot', async ({ page, nac }) => {
  await page.goto('https://your-app.example.com/');
  const tree = await nac.describe();
  expect(tree).toMatchSnapshot('app-tree.json');
});
```

A redesign that moves a button by 200px does NOT diff the
snapshot. A redesign that REMOVES the button does. That's the
right granularity for behaviour-grade regression.

---

## Cross-origin / interop tests (v2.3 preview)

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

The remote: prefix routes through the interop layer documented
in `docs/NAC_INTEROP_MCP.md`.

---

## Failure modes + debugging

| Symptom | Diagnosis |
|---------|-----------|
| `window.NAC is undefined` | Page doesn't include nac.js -- check `<script>` tag |
| `NAC.click(...)` returns `{ok: false, error: 'not_found'}` | id missing from manifest; run `NAC.validate_global()` to find typos |
| Ack never fires (test hangs on waitForAck) | Handler missing its `dispatchEvent(new CustomEvent('nac:action:succeeded',...))` -- migrate to `NAC.bindAction()` (V22-02) |
| Locale-dependent label test fails for one locale | label_i18n missing that locale -- spec validator catches this |
| Cross-origin test fails CORS preflight | Remote peer must allow `Origin: <your-test-host>` in its CORS config |

For deeper debugging, drop:

```ts
await page.evaluate(() => {
  document.addEventListener('nac:action:succeeded', e =>
    console.log('[ACK]', e.detail));
  document.addEventListener('nac:action:failed', e =>
    console.warn('[ACK-FAIL]', e.detail));
});
```

Then run `--headed` and watch the console.

---

## Yujin reference suite

The Yujin demos ship with a complete Playwright suite at
`tests/e2e-nac/specs/`. Read these in order to learn the
patterns:

| Spec | Pattern |
|------|---------|
| `01-landing.spec.ts` | basic page-load + autopilot start |
| `02-demo-v19.spec.ts` | walk-every-widget smoke |
| `03-demo-v20.spec.ts` | v20-panel buttons + bindAction ack |
| `04-demo-v21.spec.ts` | data-table dt_* dispatches |
| `05-demo-v22-interop.spec.ts` | v2.3 interop full handshake |
| `06-demo-react.spec.ts` | React study case via chat |
| `07-demo-angular.spec.ts` | Angular study case via chat |
| `08-pipeline-end-to-end.spec.ts` | chat -> LLM -> dispatch -> ack |
| `09-diagnostic.spec.ts` | failure injection + recovery |
| `10-deep-discovery.spec.ts` | autonomous discovery loop |

All 16 specs run via `bash tools/nac/test-launch.sh` in under
15s on a clean checkout.

---

## CI integration

Drop this in `.github/workflows/e2e.yml`:

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

For matrix runs across locales / browsers / tenants:

```yaml
strategy:
  matrix:
    locale: [es, en, pt, fr, de, ja, zh, hi, ar, it]
    browser: [chromium, firefox, webkit]
```

10 locales x 3 browsers = 30 jobs, all reusing the same NAC3-
dispatched test code.

---

## Comparison vs traditional Playwright tests

A typical 100-page enterprise app maintains ~500-800 Playwright
tests, with ~20% flake rate after a UI redesign. With NAC3:

| Metric | Traditional | NAC3-backed |
|--------|-------------|-------------|
| Test count for same coverage | ~500 | ~100 (verb-based) |
| Flake rate post-redesign | ~20% | ~2% (only when contract genuinely breaks) |
| Maintenance after `<button>` -> `<a>` swap | rewrite selector | none -- id stable |
| New locale support | rewrite all label-based selectors | none -- locale-agnostic |
| Cross-tenant reuse | impossible (selectors differ) | trivial (verb-based) |

---

## See also

- `tests/e2e-nac/specs/` -- reference suite.
- `tools/nac/test-launch.sh` -- orchestrator.
- [IMPACT_TESTING.md](IMPACT_TESTING.md) -- the broader impact
  analysis for QA teams.
- [LLM_WIRING.md](LLM_WIRING.md) -- the same dispatch contract
  used by LLM agents.
- `docs/NAC_TEST_MANUAL.md` -- standardised test playbook.

## License

Apache-2.0.
