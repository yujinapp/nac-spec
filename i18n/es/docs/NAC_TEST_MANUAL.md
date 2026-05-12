---
translation_source: docs/NAC_TEST_MANUAL.md
translation_source_hash: 75c7b936593deacfec1dd9689f1093483363cc45f01514ff9c9d8d52e466c9a9
translation_quality: machine_v1
translation_lang: es
translation_date: 2026-05-11T13:25:49.415220+00:00
---

# Manual de Pruebas NAC3

**Un playbook de pruebas estandarizado para cualquier app compatible con NAC-3.**

Versión 1.0 -- 2026-05-11. Autorizado para la superficie NAC3 v2.2 + vista previa v2.3.
Actualizar cuando la especificación cambie.

Este documento le indica a un equipo adoptante qué probar, cómo probarlo, qué
verificar y qué omitir. Etapa por etapa a lo largo del pipeline NAC3:

```
Comunicacion -> Desambiguacion -> Intencion -> Llamada -> Resultado -> Ack
    (1)             (2)             (3)         (4)         (5)        (6)
```

Más aspectos transversales: constructor (V22-01), contrato bindAction
(V22-02), interoperabilidad (v2.3), procedencia + seguridad.

La suite de referencia Yujin (el caso de estudio al final de este
manual) cuenta con **más de 175 pruebas unitarias + 16 pruebas e2e con Playwright**. Cobertura
ponderada promedio del pipeline: **95%**. Tome lo que le sirva.

---

## 0. Por qué existe este manual

Cada equipo que adopta NAC3 construye su corpus de pruebas desde cero y termina
con cobertura desigual: un equipo tiene pruebas de eventos ack perfectas
pero ignora el intermediario LLM; otro tiene Playwright de extremo a extremo
pero ninguna prueba unitaria. Este manual codifica qué significa "pruebas completas"
para una app NAC-3.

El mínimo requerido para una app certificada NAC-3:

| Etapa | Debe tener | Debería tener |
|-------|-----------|-------------|
| 1 Comunicacion | Ruta de texto cubierta. Prueba con mock de STT para el cliente de chat. | Corpus TTS real + reproducción de audio vía Playwright. |
| 2 Desambiguacion | Detector de cambio de idioma probado para falsos positivos. Forma de snapshotTree verificada. | Tolerancia de etiquetas por pestaña/i18n probada. |
| 3 Intencion | Smoke de backend en vivo (o con cassette VCR) para >= 5 prompts. | Guardas anti-bug (específicas al historial de bugs de tu app). |
| 4 Llamada | Cada función pública NAC.* que usa tu app, con rutas felices y de error. | drag_drop, edit_field si los conectas. |
| 5 Resultado | Efecto secundario en el DOM verificado para al menos los 10 verbos principales que expone tu app. | Multinavegador vía matriz Playwright. |
| 6 Ack | Cada familia de eventos que producen tus roles, con la forma del detalle verificada. | Familias de cola larga (breadcrumb, accordion, step). |
| Interop | Si exportas/importas MCP: forma de export_tree + import + proxy + disconnect. | Firma HMAC + guarda de recursión. |

---

## 1. Estructura de la suite

Recomendamos esta estructura (coincide con la referencia Yujin):

```
packages/<your-app>/
  test/
    smoke.mjs                       artefact integrity + CLI
    v22.mjs                         strict validator + bindAction
    v23-interop.mjs                 cross-app MCP (if you implement)
    stage1-audio.mjs                STT mock + TTS corpus integrity
    stage2-disambiguation.mjs       _detectLangSwitch + tab_by_label + snapshotTree
    stage3-backend.mjs              live (or recorded) backend smoke
    stage4-calls.mjs                every public NAC.* write API
    stage6-ack.mjs                  ack event families
    stage6b-longtail.mjs            breadcrumb/accordion/step/sort/filter/confirm
    fixtures/voice/                 TTS-generated MP3 corpus
      corpus.json                   prompt -> expected outcome
      generate.mjs                  one-shot regen via Google/ElevenLabs
      <locale>/<id>.mp3
tests/
  e2e-nac/
    playwright.config.ts
    specs/
      01-landing.spec.ts            @demos
      02-demo-<name>.spec.ts        @demos one per surface
      08-pipeline-end-to-end.spec.ts @e2e full chat-to-ack
tools/nac/
  test-launch.sh                    orchestrates everything
```

`tools/nac/test-launch.sh` ejecuta:
- Capa 1: cada suite del lado de Node encadenada en orden, deteniendo al
  primer FAIL.
- Capa 1b (opcional): smoke de backend en vivo (~60s).
- Capa 2: lint estático vía `npx @nac3/runtime validate <dir>`.
- Capa 3: verificación de integridad de enlaces de documentación.
- Capa 4: integridad de artefactos de demo.
- Capa 5: integridad del paquete del caso de estudio.

Objetivo: capas 1 + 2 + 3 + 4 + 5 en menos de 10 segundos en una laptop.

---

## 2. Etapa por etapa: qué probar

### Etapa 1 -- Comunicacion (STT + entrada sin procesar)

#### Qué abarca esta etapa

Captura de audio, transcripción STT, entrada de texto sin procesar en el cliente
de chat. El debouncing de `_sttBuffer` + `_sttFlushTimer` del cliente de chat
pertenece aquí. El cortocircuito de cambio de idioma
(`_maybeChangeLocaleLocally`) también vive aquí.

#### Qué probar

1. **Mock de STT + inyección de transcripción.** Reemplazar
   `window.SpeechRecognition` con un fake que dispare un
   evento `result` sintético con una transcripción plantada. Verificar
   que `NacChat.send(transcript)` propague exactamente ese
   texto al dispatcher.
2. **Integridad del corpus TTS.** Generar ~30 prompts de audio vía
   Google Cloud TTS / ElevenLabs en los 10 idiomas soportados.
   Verificar que cada archivo MP3 exista y tenga >= 1KB. Actúa como
   detector de regresión para el corpus en sí.
3. **Reproducción de audio real (Playwright).** Opcional. Reproducir uno
   de los MP3 del corpus mediante mock de `getUserMedia`, enrutarlo al
   SpeechRecognition del navegador. Difícil de configurar limpiamente;
   omitir para v1.

#### Qué verificar

- Cada prompt del corpus llega a `NacChat.send()` con el
  texto exacto.
- La entrada vacía o con solo espacios en blanco no rompe el cliente de chat.
- El cortocircuito de cambio de idioma se activa para prompts que coincidan
  con `_detectLangSwitch` (también cubierto en la Etapa 2).

#### Qué omitir

- Flujos de permisos de micrófono. Son UI a nivel del navegador; no
  vale la pena con Playwright.
- Compatibilidad de códecs de audio entre navegadores. Usar MP3 en
  el corpus y un solo navegador.

---

### Etapa 2 -- Desambiguacion

#### Qué abarca esta etapa

`_detectLangSwitch`. Composición y sanitización de snapshots.
Tolerancia del matcher `tab_by_label`. Todo lo que convierte texto sin procesar
en "lo que el LLM debería ver / qué atajo disparar localmente".

#### Qué probar

1. **Casos de falso positivo de `_detectLangSwitch`.** Esta es la
   área propensa a bugs; incluir pruebas anti-regresión explícitas:
   - `'cambia de pestana'` -> permanece en el idioma actual.
   - `'cambia precio de mouse 40'` -> permanece en el idioma actual.
   - `'borra de la lista'` -> permanece.
   - `'pasa de A a B'` -> permanece.
2. **Casos positivos de `_detectLangSwitch`.** Mínimo 12 en los
   idiomas soportados:
   - `'cambia a aleman'` -> de
   - `'switch to english'` -> en
   - `'use spanish'` -> es
   - `'cambia idioma a de'` (disparador explícito + código bare) -> de
   - Noop para el mismo idioma.
   - Entrada vacía / solo espacios en blanco.
3. **Tolerancia de `tab_by_label`**:
   - Coincidencia exacta de textContent.
   - Coincidencia sin paréntesis (`"Lines (collection)"` coincide con `"Lines"`).
   - Coincidencia de etiqueta de idioma i18n.
   - Etiqueta desconocida -> not_found.
4. **Forma de `snapshotTree`.** Devuelve `{active, plugins[]}`.
   Incluye manifiesto por plugin. Contiene el snapshot de la tabla de datos
   del plugin activo (si es v2.1).

#### Qué verificar

- El idioma final después de `NacChat.send(text)` coincide con lo esperado.
- El backend fue o no fue llamado según lo esperado.
- `tab_by_label` devuelve o lanza limpiamente según el caso.
- `snapshotTree()` es serializable a JSON y tiene tamaño acotado.

#### Errores comunes

- Los códigos de idioma de 2 letras bare (`'de'`, `'es'`) colisionan con
  preposiciones/artículos. Probar los casos trampa explícitamente.
- Etiquetas de relleno de 1-2 caracteres en `label_i18n` causan falsos
  positivos en coincidencia parcial. Usar cadenas realistas.

---

### Etapa 3 -- Intencion (intermediario LLM)

#### Qué abarca esta etapa

El ciclo HTTP entre el cliente de chat y el intermediario LLM.
El rol del backend: leer el snapshot `nac_tree` + el prompt, devolver `{message, actions[]}`.

#### Qué probar

1. **Smoke de forma del backend.** Para un conjunto de prompts canónicos en
   los idiomas soportados (se recomienda >= 15), hacer POST al
   endpoint y verificar:
   - HTTP 200.
   - Respuesta JSON con booleano `ok`.
   - Cuando ok: string `message` + array `actions`.
   - Cada `action.kind` es uno de los tipos canónicos.
2. **Guardas anti-bug.** Para cada clase de bug conocida en el
   historial, escribir una prueba en vivo explícita. Ejemplo: `'cambia de
   pestana'` NO DEBE devolver `change_locale: 'de'`.
3. **Guarda de tamaño de snapshot.** No enviar snapshots > 20KB al
   LLM si se factura por token; la prueba falla el build si el
   árbol supera el presupuesto.

#### Qué omitir

- Contenidos específicos de acciones del LLM. El LLM es no determinista;
  no verificar "save disparará action_id = X". Solo la forma.
- Resiliencia de red (timeouts, reintentos). Pertenece a pruebas de carga /
  confiabilidad, no a pruebas unitarias / smoke.

#### En vivo vs VCR

Las pruebas en vivo son frágiles por el costo del LLM y los límites de tasa. Una vez que
el corpus de prompts se estabilice, grabar las respuestas como cassettes VCR
(archivos JSON que mapean prompt -> respuesta) y reproducirlos en CI.
La referencia de Yujin usa pruebas en vivo porque el presupuesto permite
~60s/ejecución; cambiar a cassettes si el CI se ejecuta con demasiada frecuencia.

---

### Etapa 4 -- Llamada (APIs de escritura NAC.*)

#### Qué abarca esta etapa

Cada función pública en `window.NAC`: click, click_by_verb,
fill, select, tab, tab_by_label, go_to_section, drag_drop,
edit_field, dt_*, bindAction.

#### Qué probar

Para cada función que se use, tres casos:

1. **Ruta feliz.** Montar un elemento DOM que coincida con el id del manifiesto;
   conectar su handler para emitir el evento ack canónico;
   llamar a NAC.<func>(...) y verificar que resuelva.
2. **not_found.** Llamar con un id que no existe; verificar
   que lance con código `'not_found'` (o `'section_not_found'`
   para go_to_section).
3. **Entrada inválida.** Llamar con args vacíos o de forma incorrecta;
   verificar que lance con código `'invalid'`.

Para la familia `dt_*`, adicionalmente:

- `dt_add_row` devuelve `{ok, row_id}`.
- `dt_edit_cell` ruta feliz + valor inválido rechazado (ej.
  `qty < min`).
- `dt_remove_row` decrementa `dt_state().rows.length`.
- `dt_commit` devuelve `{ok, final_state}`.
- `dt_discard` revierte mutaciones no confirmadas.

#### Nota de implementación

Ejecutar en un shim DOM en proceso pequeño (~150-200 líneas de subclase EventTarget)
para no necesitar jsdom ni Playwright en la etapa 4.
El matcher de selector compuesto (`[a="b"][c="d"]`) es la única característica
que se debe soportar. Ver `stage4-calls.mjs` en la suite de referencia.

---

### Etapa 5 -- Resultado (efecto secundario en el DOM)

#### Qué abarca esta etapa

Lo que realmente cambia en el DOM después de una llamada NAC.*. Distinto
de la Etapa 4 (la función devolvió ok) y la Etapa 6 (el evento ack se disparó).

#### Qué probar

1. **Mutación del DOM por verbo.** Para los 10 verbos principales:
   - `save` -> ¿se envió el formulario subyacente? ¿Apareció el toast?
   - `cancel` -> ¿se cerró el modal? ¿Se reiniciaron los valores del formulario?
   - `delete` -> ¿se eliminó la fila de la lista?
   - `add_row` -> ¿hay una nueva fila visible en la tabla?
2. **E2e con Playwright por superficie.** Un spec por plugin / pantalla
   de nivel superior. Montar la superficie en un navegador real,
   ejecutar el flujo de usuario canónico, verificar el estado del DOM.

#### Qué omitir

- Diffs de capturas de pantalla pixel a pixel. La regresión visual tiene
  su propia herramienta.
- Rendimiento (tasa de fotogramas, cambios de layout). Pertenece a pruebas de
  rendimiento, presupuesto separado.

---

### Etapa 6 -- Familia de eventos Ack

#### Qué abarca esta etapa

Cada evento `nac:*` que escucha el runtime. Cada uno tiene una
forma de detalle canónica (plugin + clave de id + extras opcionales).

#### Qué probar

Por familia en `_CLICK_EVENT_FAMILY`:

- `nac:action:succeeded` -- detail.plugin + detail.action_id +
  detail.is_trusted.
- `nac:action:failed` -- igual + detail.error.
- `nac:field:changed` -- detail.field_id + detail.value.
- `nac:tab:activated` -- detail.tab_id.
- `nac:breadcrumb:navigated` -- detail.breadcrumb_id.
- `nac:accordion:expanded` / `:collapsed` -- detail.accordion_id.
- `nac:step:advanced` -- detail.step_id.
- `nac:table:page_changed` -- detail.page_index.
- `nac:confirm:resolved` / `:cancelled` -- detail.confirm_id.
- `nac:table:sort_changed` -- detail.column_id.
- `nac:table:filter_changed` -- detail.filter_id.

Para cada una:
1. Montar un elemento DOM con el rol canónico.
2. Conectar el handler de clic para emitir el evento canónico.
3. Llamar a `NAC.click(id)` y escuchar el evento.
4. Verificar la forma del detalle.

Además:
- **Tiempo de resolución por clic.** El listener del runtime debería
  resolver dentro de los 200ms del disparo del ack. Cualquier cosa más lenta es
  un bug del runtime.
- **`bindAction`** emite automáticamente el ack después de un handler síncrono.
- **`bindAction` async-resolve** emite automáticamente después de que la Promise
  resuelve.
- **`bindAction` throw** -> emite automáticamente `nac:action:failed`
  con detail.error.

---

### V22-01 -- Validador estricto del constructor

`NAC.STRICT_VALIDATION = true` hace que `NAC.register` lance en:

- `manifest_role_unknown` -- rol fuera del conjunto canónico.
- `tab_id_manifest_role_drift` -- el id coincide con `^tab\.` pero
  el rol no es `'tab'`.
- `manifest_dom_role_mismatch` -- el DOM montado tiene un rol diferente
  al que declara el manifiesto.

Probar cada uno:
1. Establecer `STRICT_VALIDATION = true`.
2. Llamar a `register` con un manifiesto diseñado para violar la
   regla.
3. Verificar que lance con `code: 'strict_validation'` y
   `findings: [...]`.

Sin modo estricto: verificar que se emitió `console.error` (capturar
mediante spy en `console.error`).

---

### V22-02 -- Helper bindAction

Ya cubierto arriba en la Etapa 6, pero: escribir al menos 5
pruebas explícitas:

1. Handler síncrono -> ack se dispara.
2. Handler que lanza -> evento failed se dispara + error relanzado.
3. Handler asíncrono que resuelve -> ack se dispara después de la resolución.
4. `bindAction` devuelve un unbinder; llamarlo detiene la
   emisión.
5. ctx faltante (sin plugin o action_id) -> lanza con
   `code: 'invalid'`.

---

### Interop -- vista previa v2.3

Si tu app exporta / importa árboles NAC3 vía MCP:

1. **Forma de export_tree.** Devuelve `{app_id, app_version,
   nac_version, exported_at, active_plugin, manifests,
   scope_tree, data_tables, state, ack_endpoint}`.
2. **Filtros de export_tree.** `scope: 'plugin_slug:<slug>'`
   devuelve solo ese plugin. `scope: 'active_plugin'` devuelve
   solo el activo. `include_locales: ['en','es']` devuelve
   solo esos idiomas.
3. **Validación de import_remote_tree.** Bearer o endpoint faltante lanza
   `invalid`. Namespace duplicado lanza `conflict`.
4. **Registro de plugin con namespace.** Después del import,
   `NAC.list_registered_plugins()` incluye `remote:<ns>:<slug>`.
5. **Despacho por proxy.** `NAC.click('remote:<ns>:...')` dispara
   un `fetch` al endpoint del par con `bearer` + `nac_id`
   (local del par, sin prefijo) + `action.kind`.
6. **Mirror de ack local.** Después de un proxy exitoso, se dispara un
   `nac:action:succeeded` local con `detail.via_interop: true`
   + `detail.is_trusted: false`.
7. **Propagación de error del par.** El par devuelve `{ok: false, error:
   {code: '...', message: '...'}}` -> el cliente lanza con
   el código del par.
8. **disconnect_remote.** Limpia el namespace; el siguiente
   `NAC.click('remote:...')` lanza not_found.
9. **Los clics locales no van por proxy.** Contrato crítico: después de que
   la capa de interop está instalada, llamar a NAC.click en un id LOCAL
   NO DEBE hacer fetch.

---

## 3. Recomendaciones de herramientas

### Test runner

- **Node + módulos ESM simples** para las etapas 2-6. Sin Jest, sin
  Vitest -- 200 líneas de `assert(name, ok)` son suficientes y
  agregan menos dependencias.
- **Playwright** para e2e de la Etapa 5 + reproducción de audio de la Etapa 1 si
  lo implementas.

### CI

- No ejecutes el smoke del backend en vivo (Etapa 3) en cada push -- ~60s
  por ejecución x frecuencia de merges = dinero real. Ejecútalo en:
  - Disparo manual (`gh workflow run`).
  - Cron nocturno.
  - Antes de etiquetar un release.
- Ejecuta las etapas 1, 2, 4, 6 + el harness en cada push. Presupuesto
  total: menos de 15s.

### Reporte de cobertura

Mantén un `docs/COVERAGE_REPORT_<date>.md` por release. Actualiza
la tabla caso por caso. Incluye el promedio ponderado del pipeline.
La referencia de Yujin está en
`yujin.app/nac-spec/docs/COVERAGE_REPORT_2026_05_10.md`.

---

## 4. Anti-patrones a evitar

1. **Verificar el contenido de las acciones del LLM.** No es determinístico.
   Prueba la FORMA, no los VALORES.
2. **Mockear el DOM en la Etapa 5.** La Etapa 5 trata sobre mutación real del DOM;
   usa Playwright, no un shim.
3. **Cobertura por línea, no por etapa.** Las líneas de código cubiertas
   no dicen nada sobre si el pipeline funciona. Usa
   la matriz de etapas.
4. **Solo happy-paths en la Etapa 4.** Not_found + entrada inválida son
   la mitad del contrato.
5. **Saltarse la Etapa 6.** El evento ack es la parte más violada
   de la spec en el código de los adoptantes. Prueba cada familia que
   emitas.
6. **Sin guardas contra bugs.** Cada bug de producción que tu app corrigió
   debe tener un test de regresión permanente. El caso 'cambia de pestana'
   está para siempre en nuestra Etapa 2.
7. **Tests en vivo en cada push.** Consume presupuesto; es inestable por
   varianza de terceros.

---

## 5. Caso de estudio -- la suite de referencia de Yujin

Todos los enlaces al código fuente de los tests apuntan a los archivos canónicos en
GitHub.

| Suite | Fuente | Tests | Tiempo |
|-------|--------|-------|------|
| smoke | [packages/nac/test/smoke.mjs](https://github.com/yujinapp/nac-spec/blob/main/runtime/test/smoke.mjs) | 36 | < 1s |
| v22 | [packages/nac/test/v22.mjs](https://github.com/yujinapp/nac-spec/blob/main/runtime/test/v22.mjs) | 14 | < 1s |
| v23-interop | [packages/nac/test/v23-interop.mjs](https://github.com/yujinapp/nac-spec/blob/main/runtime/test/v23-interop.mjs) | 14 | < 2s |
| stage1-audio | [packages/nac/test/stage1-audio.mjs](https://github.com/yujinapp/nac-spec/blob/main/runtime/test/stage1-audio.mjs) | 33 | < 1s |
| stage2-disambiguation | [packages/nac/test/stage2-disambiguation.mjs](https://github.com/yujinapp/nac-spec/blob/main/runtime/test/stage2-disambiguation.mjs) | 31 | < 1s |
| stage3-backend (live) | [packages/nac/test/stage3-backend.mjs](https://github.com/yujinapp/nac-spec/blob/main/runtime/test/stage3-backend.mjs) | ~150 (10 locales x 3 prompts) | ~120s |
| stage4-calls | [packages/nac/test/stage4-calls.mjs](https://github.com/yujinapp/nac-spec/blob/main/runtime/test/stage4-calls.mjs) | 31 | ~2s |
| stage6-ack | [packages/nac/test/stage6-ack.mjs](https://github.com/yujinapp/nac-spec/blob/main/runtime/test/stage6-ack.mjs) | 16 | < 1s |
| stage6b-longtail | [packages/nac/test/stage6b-longtail.mjs](https://github.com/yujinapp/nac-spec/blob/main/runtime/test/stage6b-longtail.mjs) | 14 | < 1s |
| Generador de corpus TTS | [packages/nac/test/fixtures/voice/generate.mjs](https://github.com/yujinapp/nac-spec/blob/main/runtime/test/fixtures/voice/generate.mjs) | -- | one-shot |
| Catálogo de corpus TTS | [packages/nac/test/fixtures/voice/corpus.json](https://github.com/yujinapp/nac-spec/blob/main/runtime/test/fixtures/voice/corpus.json) | 30 prompts | -- |
| Harness | [tools/nac/test-launch.sh](https://github.com/yujinapp/nac-spec/blob/main/tools/nac/test-launch.sh) | 5 capas | ~10s |
| **Total lado Node** | | **259+** | **~10s + 120s opt-in** |

Más 16 specs e2e de Playwright (~54s):

| Spec | Fuente | Tests | Tag |
|------|--------|-------|-----|
| 01-landing | [tests/e2e-nac/specs/01-landing.spec.ts](https://github.com/yujinapp/nac-spec/blob/main/tests/e2e-nac/specs/01-landing.spec.ts) | 2 | @demos |
| 02-demo-v19 | [tests/e2e-nac/specs/02-demo-v19.spec.ts](https://github.com/yujinapp/nac-spec/blob/main/tests/e2e-nac/specs/02-demo-v19.spec.ts) | 1 | @demos |
| 03-demo-v20 | [tests/e2e-nac/specs/03-demo-v20.spec.ts](https://github.com/yujinapp/nac-spec/blob/main/tests/e2e-nac/specs/03-demo-v20.spec.ts) | 2 | @demos |
| 04-demo-v21-datatable | [tests/e2e-nac/specs/04-demo-v21-datatable.spec.ts](https://github.com/yujinapp/nac-spec/blob/main/tests/e2e-nac/specs/04-demo-v21-datatable.spec.ts) | 3 | @demos |
| 05-demo-v22-interop | [tests/e2e-nac/specs/05-demo-v22-interop.spec.ts](https://github.com/yujinapp/nac-spec/blob/main/tests/e2e-nac/specs/05-demo-v22-interop.spec.ts) | 1 | @demos |
| 06-demo-react-study-case | [tests/e2e-nac/specs/06-demo-react-study-case.spec.ts](https://github.com/yujinapp/nac-spec/blob/main/tests/e2e-nac/specs/06-demo-react-study-case.spec.ts) | 2 | @study |
| 07-demo-angular-study-case | [tests/e2e-nac/specs/07-demo-angular-study-case.spec.ts](https://github.com/yujinapp/nac-spec/blob/main/tests/e2e-nac/specs/07-demo-angular-study-case.spec.ts) | 2 | @study |
| 08-pipeline-end-to-end | [tests/e2e-nac/specs/08-pipeline-end-to-end.spec.ts](https://github.com/yujinapp/nac-spec/blob/main/tests/e2e-nac/specs/08-pipeline-end-to-end.spec.ts) | 3 | @e2e |
| Config | [tests/e2e-nac/playwright.config.ts](https://github.com/yujinapp/nac-spec/blob/main/tests/e2e-nac/playwright.config.ts) | -- | -- |
| **Total Playwright** | | **16** | |

**Gran total: 205+ tests** que cubren el pipeline completo desde
la entrada del chat hasta el evento ack, con cobertura ponderada promedio
del **95%**.

### Cobertura por etapa (referencia Yujin, 2026-05-11)

| Etapa | Suite que la cubre | Cobertura |
|-------|---------------------|----------|
| 1 Comunicacion | stage1-audio.mjs | 85% |
| 2 Desambiguacion | stage2-disambiguation.mjs | 95% |
| 3 Intencion | stage3-backend.mjs (LLM en vivo) | 85% |
| 4 Llamada | stage4-calls.mjs | 95% |
| 5 Resultado | tests/e2e-nac/specs/*.spec.ts (Playwright) | 95% |
| 6 Ack | stage6-ack.mjs + stage6b-longtail.mjs | 100% |
| Interop (v2.3) | v23-interop.mjs + 05-demo-v22-interop.spec.ts | 100% |
| Constructor (V22-01) | v22.mjs | 100% |
| bindAction (V22-02) | v22.mjs | 100% |
| **Promedio ponderado** | | **~95%** |

### Bugs que el corpus de tests detectó

El corpus de tests, durante el desarrollo, detectó dos bugs reales en tiempo de
ejecución que se corrigieron en la misma rama:

1. **Matcher de `tab_by_label` demasiado permisivo.** La implementación original
   aceptaba cualquier coincidencia bidireccional con `indexOf`. Una etiqueta de 1 carácter
   (`'a'`) en `label_i18n` coincidía con cualquier consulta de 1+ caracteres.
   El test B4 de la Etapa 2 lo detectó. Corrección: se requiere que tanto el candidato como
   la consulta tengan >= 3 caracteres para coincidencia parcial; la igualdad exacta
   siempre está permitida.

2. **Helper de introspección `list_registered_plugins` faltante.**
   El `export_tree` de la capa de interop itera el registro del manifiesto
   para producir su payload. El runtime no tenía una API pública
   para listar los plugins registrados independientemente del estado de montaje en el DOM.
   Detectado al escribir la suite v23-interop. Corrección:
   se agregó `NAC.list_registered_plugins()` que retorna
   `Object.keys(_manifests)`.

Ambas correcciones se enviaron a `js/nac.js` en la misma rama.

### Guía para adoptantes -- cómo adoptar esta suite

1. **Copia primero la infraestructura de tests.** `packages/nac/test/`
   shim + helpers + harness. Ejecuta los tests existentes para verificar.
2. **Reemplaza el corpus de tests con la superficie de tu app.** Tus
   slugs de plugins, tus verbos, tus data-tables. Mantén la
   organización por etapas del pipeline.
3. **Genera tu corpus TTS** mediante
   `packages/nac/test/fixtures/voice/generate.mjs`. Proporciona
   tu clave de Google Cloud TTS o ElevenLabs mediante variable de entorno.
4. **Conecta `tools/nac/test-launch.sh`** a tu CI. Capas 1-5
   en pre-merge; capa de backend 1b opt-in o nocturna.
5. **Mantén un reporte de cobertura.** Actualízalo por release.

### Licencia

Este manual es Apache-2.0 junto con el resto de la spec de NAC3.
Copia, haz fork, redistribuye.

---

## 6. ¿Qué sigue?

- [SPEC.md](../SPEC.md) -- el contrato canónico contra el que Yujin ejecuta los tests.
- [SECURITY.md](../SECURITY.md) -- modelo de amenazas + procedencia.
- [COVERAGE_REPORT_2026_05_10.md](COVERAGE_REPORT_2026_05_10.md)
  -- el reporte de referencia en vivo.
- [LAUNCH_PLAN_2026_05_10.md](LAUNCH_PLAN_2026_05_10.md) -- el
  playbook de lanzamiento autónomo de Sumi dentro del cual se construyó este corpus de tests.

*Este documento evoluciona junto con la spec de NAC3. Envía ediciones mediante PR
contra `yujin.app/nac-spec/docs/NAC_TEST_MANUAL.md`.*

---

*This is a machine translation of the canonical English
version at `/nac-spec/docs/NAC_TEST_MANUAL.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
