---
translation_source: guides/RPA_PLAYWRIGHT.md
translation_source_hash: c90a4cc097a692f6fd51ae96eed88a67cadbd94b52bed4bba18af184a4b915bf
translation_quality: machine_v1
translation_lang: es
translation_date: 2026-05-11T13:29:31.624803+00:00
---

# Guía de integración NAC3 + Playwright

**Versión de NAC3:** 2.2 (con vista previa de interoperabilidad v2.3)
**Estado:** Estable. Probado con Playwright 1.47 + chromium /
firefox / webkit.

Playwright es el estándar de facto para la automatización de navegadores hoy en día,
utilizado tanto por equipos de QA (pruebas end-to-end) como por flujos ligeros de RPA
que se ejecutan de forma desatendida. Con NAC3, tus scripts de Playwright dejan de
apuntar a selectores CSS o XPath y comienzan a despachar a través del contrato NAC3
de la página — el mismo contrato que utilizan los ejecutores de voz, las herramientas
de accesibilidad, los flujos de trabajo LLM agénticos y las demás plataformas RPA
de esta serie de guías.

La propia suite de pruebas de referencia de Yujin
(`tests/e2e-nac/specs/*.spec.ts`) es el ejemplo canónico.

## Por qué NAC3 + Playwright

| Problema actual | Solución con NAC3 |
|----------------|-------------------|
| `page.click('button.save')` se rompe cuando se renombra la clase CSS | `page.evaluate(() => window.NAC.click('invoice.save'))` es estable |
| `page.getByRole('button', {name: 'Save'})` se rompe al localizar | Se despacha por id, no por etiqueta; label_i18n es responsabilidad del LLM |
| `waitForSelector` hace polling al DOM; es inestable en UIs asíncronas | `nac:action:succeeded` es un evento determinístico |
| El patrón page-object duplica la estructura de UI de la aplicación | El manifiesto NAC3 ES el page object — compartido entre pruebas y app |
| Las pruebas visuales se degradan con rediseños cosméticos | Las pruebas de comportamiento mediante ids de NAC3 sobreviven a los rediseños |

---

## Dos caminos de integración

### Camino A — inyección con `page.evaluate` (recomendado)

El patrón más simple: toda interacción pasa por
`window.NAC` evaluado en el contexto de la página.

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

### Camino B — Fixtures personalizados que envuelven NAC

Encapsula el código repetitivo en un fixture de Playwright:

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

Ahora tus pruebas se leen como habla la aplicación:

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

La referencia de Yujin usa el Camino B (ver
`tests/e2e-nac/specs/01-landing.spec.ts`).

---

## Despacho basado en verbos (preferido para reutilización entre aplicaciones)

Cuando la misma suite de Playwright debe ejecutarse contra varios
despliegues (distintos tenants, distintas marcas, mismo
contrato), se prefieren los verbos sobre los ids:

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

Contrato del manifiesto: cada tenant mapea `invoice.save` (o
el id local que elija) al verbo `save`. La prueba NO
necesita conocer el id local.

---

## Esperar el ack (la alternativa determinística a
`waitForSelector`)

Playwright tradicional:

```ts
await page.click('button.save');
await page.waitForSelector('.toast-success', { timeout: 5000 });
```

Esto es frágil: cualquier cambio en la UI del toast lo rompe.

Con NAC3:

```ts
const ack = await new Promise(resolve => {
  page.on('console', msg => { /* optional log */ });
  page.evaluate(() => new Promise(r =>
    document.addEventListener('nac:action:succeeded',
      e => r(e.detail), { once: true }
    )));
}).then(...);

// O con el fixture:
const ackPromise = nac.waitForAck();
await nac.click('invoice.save');
const ack = await ackPromise;
```

El evento es parte del contrato. Se dispara cuando el efecto
secundario se completó, no cuando se renderizó un toast arbitrario.

---

## Autodescubrimiento de casos de prueba

El método `describe()` de NAC3 devuelve el catálogo completo de elementos. Úsalo para
generar scaffolding de pruebas para cada acción de forma automática:

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

Una prueba, cada acción, cero mantenimiento por acción. Se combina
perfectamente con `validate_global({probe: true})` de la especificación.

---

## Ejecuciones multi-locale

Las ejecuciones en matriz de Playwright son triviales: el contrato es
agnóstico al locale.

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

La misma prueba, 10 locales. El label_i18n dentro de la página cambió;
el contrato no.

---

## Snapshot para regresión visual

El árbol NAC3 ES el snapshot estructural. Compara entre versiones:

```ts
test('structural snapshot', async ({ page, nac }) => {
  await page.goto('https://your-app.example.com/');
  const tree = await nac.describe();
  expect(tree).toMatchSnapshot('app-tree.json');
});
```

Un rediseño que mueve un botón 200px NO genera diferencias en el
snapshot. Un rediseño que ELIMINA el botón sí lo hace. Esa es la
granularidad correcta para regresión a nivel de comportamiento.

---

## Pruebas de origen cruzado / interoperabilidad (vista previa v2.3)

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

El prefijo `remote:` enruta a través de la capa de interoperabilidad documentada
en `docs/NAC_INTEROP_MCP.md`.

---

## Modos de fallo y depuración

| Síntoma | Diagnóstico |
|---------|-------------|
| `window.NAC is undefined` | La página no incluye nac.js — verificar la etiqueta `<script>` |
| `NAC.click(...)` devuelve `{ok: false, error: 'not_found'}` | El id no está en el manifiesto; ejecutar `NAC.validate_global()` para encontrar errores tipográficos |
| El ack nunca se dispara (la prueba se cuelga en waitForAck) | Al handler le falta `dispatchEvent(new CustomEvent('nac:action:succeeded',...))` — migrar a `NAC.bindAction()` (V22-02) |
| La prueba de etiqueta dependiente del locale falla para un locale | label_i18n no tiene ese locale — el validador de la especificación lo detecta |
| La prueba de origen cruzado falla en el preflight CORS | El peer remoto debe permitir `Origin: <your-test-host>` en su configuración CORS |

Para depuración más profunda, agrega:

```ts
await page.evaluate(() => {
  document.addEventListener('nac:action:succeeded', e =>
    console.log('[ACK]', e.detail));
  document.addEventListener('nac:action:failed', e =>
    console.warn('[ACK-FAIL]', e.detail));
});
```

Luego ejecuta con `--headed` y observa la consola.

---

## Suite de referencia de Yujin

Las demos de Yujin incluyen una suite completa de Playwright en
`tests/e2e-nac/specs/`. Lee estos archivos en orden para aprender los
patrones:

| Spec | Patrón |
|------|--------|
| `01-landing.spec.ts` | carga básica de página + inicio de autopilot |
| `02-demo-v19.spec.ts` | smoke recorriendo cada widget |
| `03-demo-v20.spec.ts` | botones del panel v20 + ack con bindAction |
| `04-demo-v21.spec.ts` | despachos dt_* de la tabla de datos |
| `05-demo-v22-interop.spec.ts` | handshake completo de interoperabilidad v2.3 |
| `06-demo-react.spec.ts` | caso de estudio React vía chat |
| `07-demo-angular.spec.ts` | caso de estudio Angular vía chat |
| `08-pipeline-end-to-end.spec.ts` | chat -> LLM -> despacho -> ack |
| `09-diagnostic.spec.ts` | inyección de fallos + recuperación |
| `10-deep-discovery.spec.ts` | bucle de descubrimiento autónomo |

Los 16 specs se ejecutan con `bash tools/nac/test-launch.sh` en menos de
15 segundos en un checkout limpio.

---

## Integración con CI

Agrega esto en `.github/workflows/e2e.yml`:

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

Para ejecuciones en matriz por locales / navegadores / tenants:

```yaml
strategy:
  matrix:
    locale: [es, en, pt, fr, de, ja, zh, hi, ar, it]
    browser: [chromium, firefox, webkit]
```

10 locales x 3 navegadores = 30 jobs, todos reutilizando el mismo código
de prueba despachado por NAC3.

---

## Comparación con pruebas tradicionales de Playwright

Una aplicación empresarial típica de 100 páginas mantiene ~500-800 pruebas de Playwright,
con una tasa de inestabilidad de ~20% tras un rediseño de UI. Con NAC3:

| Métrica | Tradicional | Respaldado por NAC3 |
|---------|-------------|---------------------|
| Cantidad de pruebas para la misma cobertura | ~500 | ~100 (basado en verbos) |
| Tasa de inestabilidad post-rediseño | ~20% | ~2% (solo cuando el contrato realmente cambia) |
| Mantenimiento tras cambio `<button>` -> `<a>` | reescribir selector | ninguno — el id es estable |
| Soporte de nuevo locale | reescribir todos los selectores basados en etiquetas | ninguno — agnóstico al locale |
| Reutilización entre tenants | imposible (los selectores difieren) | trivial (basado en verbos) |

---

## Ver también

- `tests/e2e-nac/specs/` — suite de referencia.
- `tools/nac/test-launch.sh` — orquestador.
- [IMPACT_TESTING.md](IMPACT_TESTING.md) — el análisis de impacto más amplio
  para equipos de QA.
- [LLM_WIRING.md](LLM_WIRING.md) — el mismo contrato de despacho
  utilizado por agentes LLM.
- `docs/NAC_TEST_MANUAL.md` — manual de pruebas estandarizado.

## Licencia

Apache-2.0.

---

*This is a machine translation of the canonical English
version at `/nac-spec/guides/RPA_PLAYWRIGHT.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
