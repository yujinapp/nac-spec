---
translation_source: guides/RPA_PLAYWRIGHT.md
translation_source_hash: c90a4cc097a692f6fd51ae96eed88a67cadbd94b52bed4bba18af184a4b915bf
translation_quality: machine_v1
translation_lang: hi
translation_date: 2026-05-11T15:06:34.777586+00:00
---

# NAC3 + Playwright इंटीग्रेशन गाइड

**NAC3 संस्करण:** 2.2 (v2.3 इंटरऑप प्रीव्यू सहित)
**स्थिति:** स्थिर। Playwright 1.47 + chromium / firefox / webkit के साथ परीक्षित।

Playwright आज browser automation का de-facto मानक है, जिसे QA टीमें (end-to-end टेस्ट) और बिना निगरानी के चलने वाले lightweight RPA फ्लो दोनों उपयोग करते हैं। NAC3 के साथ, आपकी Playwright स्क्रिप्ट CSS selectors या XPath को टार्गेट करना बंद कर देती हैं और पेज के NAC3 कॉन्ट्रैक्ट के ज़रिए dispatch करने लगती हैं — वही कॉन्ट्रैक्ट जो voice runners, accessibility टूल्स, agentic LLM वर्कफ्लो और इस गाइड सीरीज़ के अन्य RPA प्लेटफ़ॉर्म उपयोग करते हैं।

Yujin रेफरेंस टेस्ट सूट
(`tests/e2e-nac/specs/*.spec.ts`) इसका canonical उदाहरण है।

## NAC3 + Playwright क्यों

| आज की समस्या | NAC3 का समाधान |
|--------------|---------|
| `page.click('button.save')` CSS क्लास का नाम बदलने पर टूट जाता है | `page.evaluate(() => window.NAC.click('invoice.save'))` स्थिर रहता है |
| `page.getByRole('button', {name: 'Save'})` localize होने पर टूट जाता है | लेबल नहीं, id से dispatch करें; label_i18n LLM की ज़िम्मेदारी है |
| `waitForSelector` DOM को poll करता है; async UI पर अस्थिर रहता है | `nac:action:succeeded` एक deterministic इवेंट है |
| Page-object पैटर्न एप्लिकेशन की UI संरचना को दोहराता है | NAC3 manifest ही page object है — टेस्ट और ऐप के बीच साझा |
| Visual टेस्ट cosmetic redesign पर बदल जाते हैं | NAC3 ids के ज़रिए behaviour टेस्ट redesign में भी टिके रहते हैं |

---

## दो इंटीग्रेशन पथ

### पथ A — `page.evaluate` इंजेक्शन (अनुशंसित)

सबसे सरल पैटर्न: हर इंटरैक्शन पेज कॉन्टेक्स्ट में evaluate किए गए `window.NAC` के ज़रिए होती है।

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

### पथ B — NAC को wrap करने वाले कस्टम fixtures

बॉयलरप्लेट को Playwright fixture में wrap करें:

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

अब आपके टेस्ट एप्लिकेशन की भाषा में पढ़े जाते हैं:

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

Yujin रेफरेंस पथ B उपयोग करता है (देखें
`tests/e2e-nac/specs/01-landing.spec.ts`)।

---

## Verb-आधारित dispatch (cross-app पुनः उपयोग के लिए पसंदीदा)

जब एक ही Playwright सूट को कई deployments (अलग-अलग tenants, अलग-अलग brands, एक ही कॉन्ट्रैक्ट) पर चलाना हो, तो ids की जगह verbs को प्राथमिकता दें:

```ts
await nac.clickByVerb('invoice', 'save');
```

हेल्पर:

```ts
clickByVerb: (plugin: string, verb: string) =>
  page.evaluate(
    ([p, v]) => window.NAC.click_by_verb(p, v),
    [plugin, verb]
  )
```

Manifest कॉन्ट्रैक्ट: हर tenant `invoice.save` (या जो भी local id वह चुने) को verb `save` से map करता है। टेस्ट को local id जानने की ज़रूरत नहीं।

---

## Ack का इंतज़ार (`waitForSelector` का deterministic विकल्प)

पुराने तरीके का Playwright:

```ts
await page.click('button.save');
await page.waitForSelector('.toast-success', { timeout: 5000 });
```

यह नाज़ुक है: toast में कोई भी UI बदलाव इसे तोड़ देता है।

NAC3-aware तरीका:

```ts
const ack = await new Promise(resolve => {
  page.on('console', msg => { /* optional log */ });
  page.evaluate(() => new Promise(r =>
    document.addEventListener('nac:action:succeeded',
      e => r(e.detail), { once: true }
    )));
}).then(...);

// या fixture के साथ:
const ackPromise = nac.waitForAck();
await nac.click('invoice.save');
const ack = await ackPromise;
```

यह इवेंट कॉन्ट्रैक्ट का हिस्सा है। यह तब fire होता है जब side effect पूरा हो जाता है, न कि जब कोई मनमाना toast render हो।

---

## टेस्ट केस की स्वतः खोज

NAC3 का `describe()` पूरा element catalog लौटाता है। इसका उपयोग हर action के लिए स्वचालित रूप से टेस्ट scaffolding बनाने में करें:

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

एक टेस्ट, हर action, शून्य per-action रखरखाव। spec से `validate_global({probe: true})` के साथ बेहतरीन तालमेल।

---

## Multi-locale रन

Playwright matrix रन सरल हैं: कॉन्ट्रैक्ट locale-agnostic है।

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

एक ही टेस्ट, 10 locales। पेज के अंदर label_i18n बदल गया; कॉन्ट्रैक्ट नहीं बदला।

---

## Visual regression के लिए Snapshot

NAC3 tree ही structural snapshot है। रिलीज़ के बीच तुलना करें:

```ts
test('structural snapshot', async ({ page, nac }) => {
  await page.goto('https://your-app.example.com/');
  const tree = await nac.describe();
  expect(tree).toMatchSnapshot('app-tree.json');
});
```

एक redesign जो बटन को 200px खिसकाती है, snapshot में diff नहीं करती। एक redesign जो बटन को हटाती है, वह करती है। यही behaviour-grade regression के लिए सही granularity है।

---

## Cross-origin / इंटरऑप टेस्ट (v2.3 प्रीव्यू)

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

`remote:` प्रीफ़िक्स `docs/NAC_INTEROP_MCP.md` में दस्तावेज़ीकृत इंटरऑप लेयर के ज़रिए route होता है।

---

## विफलता के तरीके + डीबगिंग

| लक्षण | निदान |
|---------|-----------|
| `window.NAC is undefined` | पेज में nac.js शामिल नहीं — `<script>` टैग जाँचें |
| `NAC.click(...)` `{ok: false, error: 'not_found'}` लौटाता है | manifest में id नहीं है; typo खोजने के लिए `NAC.validate_global()` चलाएँ |
| Ack कभी fire नहीं होता (टेस्ट waitForAck पर रुक जाता है) | Handler में `dispatchEvent(new CustomEvent('nac:action:succeeded',...))` नहीं है — `NAC.bindAction()` (V22-02) पर migrate करें |
| एक locale के लिए locale-dependent लेबल टेस्ट विफल होता है | label_i18n में वह locale नहीं है — spec validator इसे पकड़ता है |
| Cross-origin टेस्ट CORS preflight पर विफल होता है | Remote peer को अपने CORS config में `Origin: <your-test-host>` allow करना होगा |

गहरी debugging के लिए, यह डालें:

```ts
await page.evaluate(() => {
  document.addEventListener('nac:action:succeeded', e =>
    console.log('[ACK]', e.detail));
  document.addEventListener('nac:action:failed', e =>
    console.warn('[ACK-FAIL]', e.detail));
});
```

फिर `--headed` के साथ चलाएँ और console देखें।

---

## Yujin रेफरेंस सूट

Yujin डेमो `tests/e2e-nac/specs/` पर एक पूर्ण Playwright सूट के साथ आते हैं। पैटर्न सीखने के लिए इन्हें क्रम में पढ़ें:

| Spec | पैटर्न |
|------|---------|
| `01-landing.spec.ts` | बुनियादी page-load + autopilot शुरुआत |
| `02-demo-v19.spec.ts` | walk-every-widget smoke |
| `03-demo-v20.spec.ts` | v20-panel बटन + bindAction ack |
| `04-demo-v21.spec.ts` | data-table dt_* dispatches |
| `05-demo-v22-interop.spec.ts` | v2.3 interop पूर्ण handshake |
| `06-demo-react.spec.ts` | chat के ज़रिए React study case |
| `07-demo-angular.spec.ts` | chat के ज़रिए Angular study case |
| `08-pipeline-end-to-end.spec.ts` | chat -> LLM -> dispatch -> ack |
| `09-diagnostic.spec.ts` | विफलता injection + recovery |
| `10-deep-discovery.spec.ts` | स्वायत्त discovery लूप |

सभी 16 specs `bash tools/nac/test-launch.sh` के ज़रिए clean checkout पर 15 सेकंड से कम में चलते हैं।

---

## CI इंटीग्रेशन

इसे `.github/workflows/e2e.yml` में डालें:

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

locales / browsers / tenants में matrix रन के लिए:

```yaml
strategy:
  matrix:
    locale: [es, en, pt, fr, de, ja, zh, hi, ar, it]
    browser: [chromium, firefox, webkit]
```

10 locales x 3 browsers = 30 jobs, सभी एक ही NAC3-dispatched टेस्ट कोड का पुनः उपयोग करते हैं।

---

## पारंपरिक Playwright टेस्ट से तुलना

एक सामान्य 100-पेज enterprise ऐप ~500-800 Playwright टेस्ट रखता है, जिसमें UI redesign के बाद ~20% flake rate होती है। NAC3 के साथ:

| मेट्रिक | पारंपरिक | NAC3-backed |
|--------|-------------|-------------|
| समान coverage के लिए टेस्ट संख्या | ~500 | ~100 (verb-based) |
| Redesign के बाद flake rate | ~20% | ~2% (केवल जब कॉन्ट्रैक्ट वास्तव में टूटे) |
| `<button>` -> `<a>` swap के बाद रखरखाव | selector फिर से लिखें | कोई नहीं — id स्थिर है |
| नई locale सपोर्ट | सभी label-based selectors फिर से लिखें | कोई नहीं — locale-agnostic |
| Cross-tenant पुनः उपयोग | असंभव (selectors अलग हैं) | सरल (verb-based) |

---

## यह भी देखें

- `tests/e2e-nac/specs/` — रेफरेंस सूट।
- `tools/nac/test-launch.sh` — orchestrator।
- [IMPACT_TESTING.md](IMPACT_TESTING.md) — QA टीमों के लिए व्यापक impact विश्लेषण।
- [LLM_WIRING.md](LLM_WIRING.md) — LLM agents द्वारा उपयोग किया जाने वाला वही dispatch कॉन्ट्रैक्ट।
- `docs/NAC_TEST_MANUAL.md` — मानकीकृत टेस्ट playbook।

## लाइसेंस

Apache-2.0.

---

*This is a machine translation of the canonical English
version at `/nac-spec/guides/RPA_PLAYWRIGHT.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
