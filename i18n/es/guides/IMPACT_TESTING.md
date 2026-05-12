---
translation_source: guides/IMPACT_TESTING.md
translation_source_hash: d69b8343b9c3e6a8ba3e22f198a9a6646d800f3f32a2f0446a506cb44f9e664b
translation_quality: machine_v1
translation_lang: es
translation_date: 2026-05-11T13:26:58.186559+00:00
---

# Impacto de NAC3 en Testing + QA

**Versión de NAC3:** 2.2 stable.
**Audiencia:** Ingenieros de pruebas, líderes de QA, SDETs, CTOs que evalúan
el costo de mantenimiento de pruebas a largo plazo al adoptar NAC3.

## Resumen

El código de pruebas que usa ids de NAC3 sobrevive a los rediseños de UI. El código
que usa selectores CSS no. Esa única propiedad cambia
la economía del mantenimiento de pruebas de "lineal con los cambios de UI"
a "lineal con los cambios de funcionalidades" -- típicamente entre 5 y 10 veces menos trabajo.

## La matemática del mantenimiento hoy

Una suite típica de Selenium / Cypress / Playwright para una
aplicación web no trivial contiene cientos de selectores:

```ts
await page.locator('button.btn-primary.btn-large:has-text("Save")').click();
await page.locator('div.modal > div.body > input[type="text"]:first-of-type').fill('Acme');
await page.locator('table.invoice-grid > tbody > tr:nth-child(1) > td:last-child > button').click();
```

Estos selectores se rompen cuando:

- El equipo de diseño renombra `.btn-primary` a `.btn-cta`.
- Se agrega un div contenedor por accesibilidad.
- La etiqueta del botón se internacionaliza y "Save" se convierte en
  "Guardar" en las pruebas del tenant en español.
- El layout de la grilla cambia a grid-template-rows.
- Cualquier cosa de la página que NO sea la intención semántica
  cambia.

Encuestas de la industria (2024-2025) estiman que **el 30-50% del tiempo de los ingenieros de QA se destina al mantenimiento de selectores**. El número empeora a medida que la aplicación crece.

## La matemática del mantenimiento con NAC3

```ts
await NAC.click('invoice.save');
await NAC.fill('invoice.client_name', 'Acme');
await NAC.click('invoice.line.42.delete');
```

Estas llamadas sobreviven a:

- Renombrado de clases CSS (los selectores no referencian CSS).
- Reestructuración del árbol DOM (los selectores no referencian estructura).
- Cambios de etiquetas por I18n (los selectores no referencian texto).
- Migraciones de layout de grid a flex.
- Cambios de librería de componentes.

Se rompen ÚNICAMENTE cuando:

- El equipo de producto renombra un verbo (`save` -> `commit`).
- Un botón se elimina por completo.

Estos son **cambios a nivel de funcionalidad**, no de UI. La prueba
necesita actualizarse por la misma razón que el código de producción necesita
actualizarse. Ese es el costo correcto.

## Métricas de impacto concretas

Datos internos de Yujin CRM (2025):

| Métrica | Antes de NAC | Después de NAC | Delta |
|--------|-----------|-----------|-------|
| Líneas promedio por spec de Playwright | 187 | 64 | -66% |
| Mantenimiento por spec tras un sprint de rediseño | 4.2 horas | 0.3 horas | -93% |
| Fallos de pruebas por selectores por semana | 38 | 2 | -95% |
| Tiempo de incorporación de un nuevo ingeniero de QA | 3 semanas | 1 semana | -67% |
| Pruebas que pasan 6 meses después de escritas, sin ediciones | 31% | 89% | +180% |

El 89% es el dato clave. **La gran mayoría de las pruebas de NAC3
siguen funcionando durante la evolución normal del producto**, mientras que
sus equivalentes basadas en selectores se deterioran.

## Lo que NAC3 habilita para la automatización de pruebas

### 1. Corpus de pruebas estable

Una prueba escrita en 2024 contra `NAC.click('invoice.save')` sigue
ejecutándose en 2026 si el verbo `save` sobrevive en el roadmap del producto.
El DOM alrededor del botón puede haberse reconstruido tres veces.

### 2. Pruebas cross-browser sin cambios de modo de selectores

Los selectores CSS se comportan de manera diferente entre Chromium / Firefox /
WebKit en casos borde (pseudo-elementos, anillos de foco, shadow
DOM). NAC3 despacha a través del resolver del runtime -- la misma
ruta de código independientemente del navegador.

### 3. Pruebas agnósticas a I18n

En una aplicación multi-locale: la suite de pruebas actual necesita ejecuciones por locale
porque "Save" / "Guardar" / "Speichern" son el mismo
botón. Con NAC3 la prueba llama al id; el runtime resuelve
entre locales. **Se escribe 1 prueba y corre en 10 locales** (uno
por ).

### 4. Autoría de pruebas asistida por LLM

Un LLM que ve `NAC.describe()` puede producir un spec de prueba completo
a partir de una descripción en prosa: "Probar que agregar una fila y luego
eliminarla devuelve la tabla al estado inicial." El LLM
emite llamadas NAC.*; se revisan y se hace commit. Yujin CRM tiene
~250 specs que fueron creados de esta manera y revisados antes
del merge.

### 5. Pruebas auto-reparables mediante descubrimiento

Cuando una prueba falla porque un id fue renombrado:

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

El `click_by_verb` del runtime ofrece un fallback auto-reparable
que indica "esta prueba necesita actualizarse, pero la acción sigue
funcionando" -- un modo de fallo mucho mejor que "selector no encontrado,
fin".

### 6. Generación de pruebas desde manifiestos

`NAC.validate_global({probe: true})` sintetiza un click en cada
elemento `role="action"` y verifica que emita el evento ack canónico
en menos de 5s. **Esto es una prueba de humo auto-generada para
toda la superficie clickeable de la aplicación**. Se ejecuta en CI; detecta cualquier
botón que se monte sin la emisión correcta del ack.

### 7. Cobertura del pipeline por etapa

La suite de pruebas de referencia de Yujin (NAC_TEST_MANUAL.md) organiza las pruebas
por etapa del pipeline de NAC3:

- Etapa 1 (entrada STT)
- Etapa 2 (Desambiguación)
- Etapa 3 (intermediario LLM)
- Etapa 4 (llamadas NAC.*)
- Etapa 5 (efecto secundario en el DOM)
- Etapa 6 (evento Ack)

La cobertura se mide **por etapa**, no solo por línea de código.
La referencia de Yujin reporta ~95% de promedio ponderado en todas
las etapas. Adoptar ese esquema brinda un scorecard de cobertura
que se mapea directamente sobre el contrato.

## Impacto en los frameworks de pruebas existentes

### Playwright

Integración directa. `page.evaluate()` invoca llamadas `NAC.*`.
Los selectores se mantienen como fallback para aserciones de layout. La referencia
de Yujin incluye 16 specs de Playwright en
`tests/e2e-nac/specs/`.

### Cypress

`cy.window().then(win => win.NAC.click(id))`. El mismo patrón.
Los comandos personalizados envuelven las llamadas NAC:
`cy.nacClick('invoice.save')`.

### Selenium

Ejecutor de JavaScript: `driver.execute_script('return
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

NAC3 convive con React Testing Library, no compite con ella.

### Karma / Jasmine / runners más antiguos

Inyección directa vía `window.NAC`. Cualquier entorno que pueda ejecutar
JavaScript en un contexto de navegador funciona.

## Costo de adopción

### Aplicación existente

Según el [playbook de migración](AI_PLAYBOOK_MIGRATION.md), se estima:

- ~1 día por pantalla para decoración + manifiesto.
- ~1 día por pantalla para migración del corpus de pruebas.
- Total para una aplicación de 20 pantallas: ~6 semanas del tiempo de un ingeniero,
  recuperadas por el ahorro en mantenimiento en 3-4 meses.

### Aplicación nueva

Integrado desde el inicio. El playbook para proyectos greenfield trata los atributos de NAC3 como
una preocupación de primera clase. Sin costo de adaptación posterior.

## Riesgos + mitigación

### Riesgo -- "no confiamos en las pruebas generadas por LLM"

Válido. El LLM produce un candidato; un humano lo revisa y hace commit.
El mismo flujo de trabajo que Copilot. El corpus que se entrega es exactamente lo que
el equipo aprobó, no lo que el LLM escribió.

### Riesgo -- "los ids de NAC se convierten en deuda técnica con el tiempo"

Cierto si se los deja deteriorar. Trate los ids de NAC como nombres de columnas de base de datos:
renombre mediante migración, nunca elimine en vuelo.
El CLI de `@nac3/runtime` detecta ids huérfanos mediante lint estático.

### Riesgo -- "¿qué pasa si la adopción de NAC se estanca?"

La especificación es Apache-2.0. El runtime pesa menos de 200KB. En el peor caso: usted
es dueño del artefacto, los ids se mantienen estables. El peor caso sigue siendo mejor
que los selectores CSS.

## Ver también

- [NAC_TEST_MANUAL.md](../docs/NAC_TEST_MANUAL.md) -- el
  playbook de pruebas estandarizado que respalda este análisis de impacto.
- [RPA_UIPATH.md](RPA_UIPATH.md) /
  [RPA_AUTOMATION_ANYWHERE.md](RPA_AUTOMATION_ANYWHERE.md) /
  [RPA_BLUE_PRISM.md](RPA_BLUE_PRISM.md) -- aplicaciones
  adyacentes del mismo contrato.
- [COVERAGE_REPORT_2026_05_10.md](../docs/COVERAGE_REPORT_2026_05_10.md)
  -- los números de cobertura propios de la referencia de Yujin.

## Licencia

Apache-2.0.

---

*This is a machine translation of the canonical English
version at `/nac-spec/guides/IMPACT_TESTING.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
