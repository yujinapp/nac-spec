---
translation_source: guides/RPA_PLAYWRIGHT.md
translation_source_hash: c90a4cc097a692f6fd51ae96eed88a67cadbd94b52bed4bba18af184a4b915bf
translation_quality: machine_v1
translation_lang: pt
translation_date: 2026-05-11T13:38:57.954989+00:00
---

# Guia de integração NAC3 + Playwright

**Versão do NAC3:** 2.2 (com preview de interop v2.3)
**Status:** Estável. Testado com Playwright 1.47 + chromium /
firefox / webkit.

Playwright é o padrão de fato para automação de navegadores hoje,
utilizado tanto por equipes de QA (testes end-to-end) quanto em
fluxos leves de RPA que rodam sem supervisão. Com NAC3, seus scripts
Playwright deixam de mirar seletores CSS ou XPath e passam a
despachar através do contrato NAC3 da página -- o mesmo contrato
usado por runners de voz, ferramentas de acessibilidade, fluxos
agênticos com LLM e as demais plataformas de RPA desta série de guias.

A própria suíte de testes de referência Yujin
(`tests/e2e-nac/specs/*.spec.ts`) é o exemplo canônico.

## Por que NAC3 + Playwright

| Problema atual | Solução com NAC3 |
|----------------|-----------------|
| `page.click('button.save')` quebra quando a classe CSS é renomeada | `page.evaluate(() => window.NAC.click('invoice.save'))` é estável |
| `page.getByRole('button', {name: 'Save'})` quebra quando localizado | Despache por id, não por rótulo; label_i18n é responsabilidade do LLM |
| `waitForSelector` faz polling no DOM; instável em UIs assíncronas | `nac:action:succeeded` é um evento determinístico |
| O padrão page-object duplica a estrutura de UI da aplicação | O manifesto NAC3 É o page object -- compartilhado entre testes e app |
| Testes visuais se degradam com redesigns cosméticos | Testes de comportamento via ids NAC3 sobrevivem a redesigns |

---

## Dois caminhos de integração

### Caminho A -- injeção via `page.evaluate` (recomendado)

O padrão mais simples: toda interação passa por
`window.NAC` avaliado no contexto da página.

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

### Caminho B -- fixtures customizados encapsulando NAC

Encapsule o código repetitivo em um fixture do Playwright:

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

Agora seus testes ficam com a linguagem da aplicação:

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

A referência Yujin usa o Caminho B (veja
`tests/e2e-nac/specs/01-landing.spec.ts`).

---

## Despacho baseado em verbo (preferível para reuso entre apps)

Quando a mesma suíte Playwright precisa rodar contra vários
deployments (tenants diferentes, marcas diferentes, mesmo
contrato), prefira verbos em vez de ids:

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

Contrato do manifesto: cada tenant mapeia `invoice.save` (ou
qualquer id local que escolher) para o verbo `save`. O teste NÃO
precisa conhecer o id local.

---

## Aguardando o ack (a alternativa determinística ao
`waitForSelector`)

Playwright tradicional:

```ts
await page.click('button.save');
await page.waitForSelector('.toast-success', { timeout: 5000 });
```

Isso é frágil: qualquer mudança na UI do toast quebra o teste.

Com NAC3:

```ts
const ack = await new Promise(resolve => {
  page.on('console', msg => { /* optional log */ });
  page.evaluate(() => new Promise(r =>
    document.addEventListener('nac:action:succeeded',
      e => r(e.detail), { once: true }
    )));
}).then(...);

// Ou com o fixture:
const ackPromise = nac.waitForAck();
await nac.click('invoice.save');
const ack = await ackPromise;
```

O evento faz parte do contrato. Ele dispara quando o efeito
colateral foi concluído, não quando um toast arbitrário foi renderizado.

---

## Descoberta automática de casos de teste

O `describe()` do NAC3 retorna o catálogo completo de elementos. Use-o
para gerar scaffolding de testes para cada ação automaticamente:

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

Um teste, todas as ações, zero manutenção por ação. Combina
perfeitamente com `validate_global({probe: true})` da spec.

---

## Execuções multi-locale

Execuções em matriz com Playwright são triviais: o contrato é
agnóstico de locale.

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

O mesmo teste, 10 locales. O label_i18n dentro da página mudou;
o contrato não.

---

## Snapshot para regressão visual

A árvore NAC3 É o snapshot estrutural. Compare entre releases:

```ts
test('structural snapshot', async ({ page, nac }) => {
  await page.goto('https://your-app.example.com/');
  const tree = await nac.describe();
  expect(tree).toMatchSnapshot('app-tree.json');
});
```

Um redesign que move um botão 200px NÃO gera diff no
snapshot. Um redesign que REMOVE o botão, sim. Essa é a
granularidade certa para regressão de comportamento.

---

## Testes cross-origin / interop (preview v2.3)

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

O prefixo `remote:` roteia pela camada de interop documentada
em `docs/NAC_INTEROP_MCP.md`.

---

## Modos de falha + depuração

| Sintoma | Diagnóstico |
|---------|-------------|
| `window.NAC is undefined` | A página não inclui nac.js -- verifique a tag `<script>` |
| `NAC.click(...)` retorna `{ok: false, error: 'not_found'}` | id ausente do manifesto; execute `NAC.validate_global()` para encontrar erros de digitação |
| Ack nunca dispara (teste trava no waitForAck) | Handler sem `dispatchEvent(new CustomEvent('nac:action:succeeded',...))` -- migre para `NAC.bindAction()` (V22-02) |
| Teste de rótulo dependente de locale falha para um locale | label_i18n sem esse locale -- o validador da spec detecta isso |
| Teste cross-origin falha no preflight CORS | O peer remoto deve permitir `Origin: <seu-host-de-teste>` na configuração CORS |

Para depuração mais detalhada, adicione:

```ts
await page.evaluate(() => {
  document.addEventListener('nac:action:succeeded', e =>
    console.log('[ACK]', e.detail));
  document.addEventListener('nac:action:failed', e =>
    console.warn('[ACK-FAIL]', e.detail));
});
```

Em seguida, execute com `--headed` e observe o console.

---

## Suíte de referência Yujin

As demos Yujin incluem uma suíte Playwright completa em
`tests/e2e-nac/specs/`. Leia nesta ordem para aprender os
padrões:

| Spec | Padrão |
|------|--------|
| `01-landing.spec.ts` | carregamento básico de página + início do autopilot |
| `02-demo-v19.spec.ts` | smoke percorrendo todos os widgets |
| `03-demo-v20.spec.ts` | botões do painel v20 + ack via bindAction |
| `04-demo-v21.spec.ts` | despachos dt_* da data-table |
| `05-demo-v22-interop.spec.ts` | handshake completo de interop v2.3 |
| `06-demo-react.spec.ts` | caso de estudo React via chat |
| `07-demo-angular.spec.ts` | caso de estudo Angular via chat |
| `08-pipeline-end-to-end.spec.ts` | chat -> LLM -> dispatch -> ack |
| `09-diagnostic.spec.ts` | injeção de falha + recuperação |
| `10-deep-discovery.spec.ts` | loop de descoberta autônoma |

Todas as 16 specs rodam via `bash tools/nac/test-launch.sh` em menos de
15s em um checkout limpo.

---

## Integração com CI

Adicione isso em `.github/workflows/e2e.yml`:

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

Para execuções em matriz com locales / navegadores / tenants:

```yaml
strategy:
  matrix:
    locale: [es, en, pt, fr, de, ja, zh, hi, ar, it]
    browser: [chromium, firefox, webkit]
```

10 locales x 3 navegadores = 30 jobs, todos reutilizando o mesmo
código de teste despachado via NAC3.

---

## Comparação com testes Playwright tradicionais

Um app enterprise típico de 100 páginas mantém ~500-800 testes Playwright,
com ~20% de taxa de instabilidade após um redesign de UI. Com NAC3:

| Métrica | Tradicional | Com NAC3 |
|---------|-------------|----------|
| Quantidade de testes para a mesma cobertura | ~500 | ~100 (baseado em verbos) |
| Taxa de instabilidade pós-redesign | ~20% | ~2% (apenas quando o contrato realmente muda) |
| Manutenção após troca de `<button>` por `<a>` | reescrever seletor | nenhuma -- id estável |
| Suporte a novo locale | reescrever todos os seletores baseados em rótulo | nenhuma -- agnóstico de locale |
| Reuso entre tenants | impossível (seletores diferem) | trivial (baseado em verbos) |

---

## Veja também

- `tests/e2e-nac/specs/` -- suíte de referência.
- `tools/nac/test-launch.sh` -- orquestrador.
- [IMPACT_TESTING.md](IMPACT_TESTING.md) -- análise de impacto mais ampla
  para equipes de QA.
- [LLM_WIRING.md](LLM_WIRING.md) -- o mesmo contrato de despacho
  usado por agentes LLM.
- `docs/NAC_TEST_MANUAL.md` -- playbook de testes padronizado.

## Licença

Apache-2.0.

---

*This is a machine translation of the canonical English
version at `/nac-spec/guides/RPA_PLAYWRIGHT.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
