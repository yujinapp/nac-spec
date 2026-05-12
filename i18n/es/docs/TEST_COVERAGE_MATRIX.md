---
translation_source: docs/TEST_COVERAGE_MATRIX.md
translation_source_hash: 378d7bf89e65b07e54f5d5dc1c62938accfe383e903468a4df028a3e2936f48d
translation_quality: machine_v1
translation_lang: es
translation_date: 2026-05-11T13:26:57.030787+00:00
---

# NAC3 -- Matriz de Cobertura de Pruebas (automáticas + manuales)

**Versión de spec:** 2.2 + vista previa v2.3.
**Generado:** 2026-05-11.
**Referencia autoritativa para:** el repositorio de referencia Yujin
`yujinapp/nac-spec` en `main`.

Esta matriz lista TODOS los artefactos del ecosistema NAC3 e
informa su cobertura mediante pruebas automatizadas + la compuerta
de verificación manual (el checklist "human OK").

Adoptantes: copien esta estructura de matriz para su propia app. Reemplacen
las columnas con sus artefactos; mantengan la misma profundidad por fila.

---

## Leyenda

| Símbolo | Significado |
|--------|---------|
| AUTO | Cubierto por pruebas automatizadas (Playwright / suite Node) |
| MAN  | Requiere verificación humana (visual en navegador, gesto de voz, UX subjetiva) |
| BOTH | Cubierto automáticamente para invariantes + verificado manualmente para UX |
| --   | Sin cobertura planificada (intencional) |
| TBD  | Cobertura planificada pero no implementada |

---

## 1. Artefactos de runtime

| Artefacto | Cobertura AUTO | Compuerta MAN | Notas |
|----------|---------------|-------------|-------|
| `js/nac.js` (base v1.9 + v2.0 + v2.1) | AUTO 95% | MAN (smoke entre navegadores) | smoke + v22 + stage4 cubren la API de escritura; manual = abrir en Firefox + Safari al menos una vez por release |
| `js/nac-v2-extensions.js` | AUTO 90% | MAN (autoRegister.watch en un DOM nuevo) | stage4 dt_* + v22 parcial; manual = montar un nuevo plugin en runtime vía autoRegister |
| `js/nac-chat-client.js` | AUTO 95% | MAN (STT con micrófono real) | stage1-audio simula SpeechRecognition; manual = presionar el mic en el demo en vivo + hablar un prompt por locale |
| `js/nac-mcp-interop.js` (vista previa v2.3) | AUTO 100% | MAN (roundtrip entre peers de origen cruzado) | v23-interop cubre el escenario de página local; manual = probar contra un peer NAC3 remoto real sobre HTTPS |

## 2. Paquete NPM

| Artefacto | Cobertura AUTO | Compuerta MAN | Notas |
|----------|---------------|-------------|-------|
| Build de `@nac3/runtime` (dist/ ESM + CJS + d.ts + CLI) | AUTO 100% | MAN (`npm install` en un directorio nuevo) | smoke.mjs 36 verificaciones; manual = npm pack + install + import en un proyecto Node vacío para verificar |
| Subpath `@nac3/runtime/extensions` | AUTO 100% | -- | smoke confirma presencia de archivos + d.ts |
| Subpath `@nac3/runtime/chat-client` | AUTO 100% | -- | smoke confirma presencia de archivos + d.ts |
| CLI `npx @nac3/runtime validate` | AUTO 100% | MAN (ejecutar contra un proyecto construido externamente por el equipo) | smoke ejecuta el CLI contra el directorio de demos; manual = ejecutar contra el propio repo del cliente antes de que lo publique |

## 3. Demos (en vivo en yujin.app/nac-spec/)

| Demo | Cobertura AUTO | Compuerta MAN | Notas |
|------|---------------|-------------|-------|
| `index.html` (landing) | BOTH | MAN (tour autopilot + envío de chat) | Playwright 01-landing.spec.ts verifica la superficie; manual = ejecutar el autopilot desde un navegador real, narración audible |
| `example.php` (referencia v1.9) | AUTO | MAN (recorrido de 27 widgets) | Playwright 02-demo-v19 verifica el arranque; manual = recorrer los 27 widgets, sin errores de consola |
| `example-v20-full.php` (brownfield) | AUTO | MAN (botones describe_v2 / validate_global_v2 del panel v20) | Playwright 03-demo-v20 cubre panel + ack de bindAction; manual = hacer clic en cada botón del panel + inspeccionar la salida |
| `example-v20-primitives-showcase.php` | -- | MAN (recorrido didáctico por primitiva) | Demo puramente educativo; manual = el tour de las 8 primitivas |
| `example-v21-data-table.php` | AUTO | MAN (chat de voz con mic) | Playwright 04-demo-v21 cubre dt_state + tab.permissions; manual = usar el mic de voz, observar que LLM despacha correctamente |
| `example-v22-interop.php` (vista previa v2.3) | AUTO | MAN (usar los 4 CTAs en orden) | Playwright 05-demo-v22-interop de extremo a extremo; manual = el flujo de 4 botones con ojos en pantalla |
| `demos/react/` (caso de estudio compilado) | AUTO | MAN (agregar/eliminar por chat) | Playwright 06-demo-react cubre mount + add; manual = enviar por chat "agrega leche" vía mic real, observar actualización del estado React |
| `demos/angular/` (caso de estudio compilado) | AUTO | MAN (agregar/eliminar por chat) | Playwright 07-demo-angular cubre mount + add; manual = igual que React |

## 4. Documentación

| Doc | Cobertura AUTO | Compuerta MAN | Notas |
|-----|---------------|-------------|-------|
| `SPEC.md` (canónico v2.2) | -- | MAN (revisión de PR por un mantenedor) | La spec es prosa; no es posible hacer pruebas automáticas. Un humano revisa cada palabra |
| `ABOUT.md` | -- | MAN (revisión de PR) | Igual |
| `CONTRIBUTING.md` | -- | MAN (revisión de PR) | Igual |
| `SECURITY.md` | -- | MAN (revisión de PR) | Igual. Más relectura trimestral del modelo de amenazas |
| `README_DEMOS.md` | -- | MAN | Verificación manual de enlaces |
| `docs/NAC_V22_ROADMAP.md` | -- | MAN | Actualizar + revisar por release |
| `docs/NAC_TEST_MANUAL.md` | AUTO (enlaces) | MAN (revisión de PR) | La capa 3 de test-launch.sh verifica que los 11 docs existan; manual = leer para verificar exactitud |
| `docs/COVERAGE_REPORT_2026_05_10.md` | -- | MAN (regenerar por release) | Este es el registro de cobertura en sí; un humano lo escribe por release |
| `docs/NAC_INTEROP_MCP.md` | -- | MAN | Propuesta de spec, revisada por humanos |
| `docs/NAC_LAUNCH_DIFFUSION.md` | -- | MAN | Playbook interno |
| `docs/CASE_STUDIES_DISCOVERY.md` | -- | MAN | Postmortems de bugs; curado por humanos |
| `docs/LAUNCH_PLAN_2026_05_10.md` | -- | MAN (histórico) | Registro histórico |
| `docs/TEST_COVERAGE_MATRIX.md` (este archivo) | AUTO (enlaces) | MAN | Actualizar por release |
| `docs/VOICE_CHAT_ERROR_ANALYSIS_2026_05_09.md` | -- | MAN | Análisis histórico de bugs |
| `docs/HUMAN_OK_CHECKLIST.md` | -- | MAN (Pablo lo ejecuta) | El checklist en sí; Pablo lo ejecuta |

## 5. Guías de adopción

| Guía | Cobertura AUTO | Compuerta MAN | Notas |
|-------|---------------|-------------|-------|
| `guides/REACT.md` | -- | MAN (revisión de PR + feedback de adoptantes) | El snippet hello-world debería seguir compilando; manual = verificación de rebuild anual |
| `guides/ANGULAR.md` | -- | MAN (revisión de PR) | Igual |
| `guides/LLM_WIRING.md` | -- | MAN (revisión de PR) | El backend Node de referencia funciona; manual = ejecutarlo contra la spec en vivo |
| `guides/AI_PLAYBOOK_NEW_PROJECT.md` | -- | MAN (revisión de PR) | Las aserciones de pasos deben seguir siendo ejecutables |
| `guides/AI_PLAYBOOK_MIGRATION.md` | -- | MAN (revisión de PR) | Igual |
| `guides/IMPACT_TESTING.md` | -- | MAN (revisión de PR) | Afirmaciones de impacto; actualizar números por trimestre |
| `guides/IMPACT_RPA.md` | -- | MAN (revisión de PR) | Igual |
| `guides/RPA_UIPATH.md` | -- | MAN (ejecutar el workflow de muestra una vez por release) | Manual = ejercitar el InvoiceFromCSV.xaml |
| `guides/RPA_AUTOMATION_ANYWHERE.md` | -- | MAN | Misma forma |
| `guides/RPA_BLUE_PRISM.md` | -- | MAN | Misma forma |
| `guides/RPA_PLAYWRIGHT.md` | AUTO (suite de referencia) | MAN (revisión de PR) | Los patrones son ejercitados por `tests/e2e-nac/specs/`; manual = leer una vez por release |

## 6. Suites de prueba

| Suite | Cobertura AUTO | Compuerta MAN | Notas |
|-------|---------------|-------------|-------|
| `packages/nac/test/smoke.mjs` | AUTO (propia) | MAN (revisar tasa de aprobación) | 36 verificaciones; manual = revisar el conteo una vez por release |
| `packages/nac/test/v22.mjs` | AUTO (propia) | -- | 14 pruebas unitarias |
| `packages/nac/test/v23-interop.mjs` | AUTO (propia) | -- | 14 pruebas unitarias |
| `packages/nac/test/stage1-audio.mjs` | AUTO (propia) | MAN (regenerar corpus por locale) | 33 verificaciones; manual = escuchar una muestra del corpus TTS, verificar que sea audible |
| `packages/nac/test/stage2-disambiguation.mjs` | AUTO (propia) | -- | 31 verificaciones |
| `packages/nac/test/stage3-backend.mjs` | AUTO (propia, en vivo) | MAN (revisar respuestas del LLM) | 45 prompts x 10 locales; manual = verificar al azar que el LLM no derivó en 2 prompts aleatorios |
| `packages/nac/test/stage4-calls.mjs` | AUTO (propia) | -- | 31 verificaciones |
| `packages/nac/test/stage6-ack.mjs` | AUTO (propia) | -- | 16 verificaciones |
| `packages/nac/test/stage6b-longtail.mjs` | AUTO (propia) | -- | 14 verificaciones |
| `tests/e2e-nac/specs/*.spec.ts` | AUTO (propia) | MAN (revisión visual de ejecución con cabeza una vez por release) | 16 specs; manual = ejecutar con `--headed` una vez para revisar visualmente |
| Corpus TTS (30 archivos MP3) | AUTO (presencia + tamaño) | MAN (escuchar 1 por locale) | Manual = muestrear 10 archivos, confirmar que sean audibles, sin basura |
| `tools/nac/test-launch.sh` | AUTO (propia) | -- | Orquestador |
| `tools/nac/discovery-loop.sh` | AUTO (propia) | -- | Loop de descubrimiento + corrección |

## 7. Paquetes de casos de estudio

| Paquete | Cobertura AUTO | Compuerta MAN | Notas |
|---------|---------------|-------------|-------|
| Fuente de `packages/nac-react-demo/` | AUTO (build + Playwright) | MAN (visual en el dist desplegado) | Build de Vite limpio; Playwright cubre todos+chat+autopilot |
| Dist desplegado de `packages/nac-react-demo/` | AUTO | MAN (abrir en incógnito, recorrerlo) | Manual = el recorrido humano en /demos/react/ |
| Fuente de `packages/nac-angular-demo/` | AUTO | MAN | Misma forma |
| Dist desplegado de `packages/nac-angular-demo/` | AUTO | MAN | Igual |

## 8. Aspectos transversales

| Aspecto | Cobertura AUTO | Compuerta MAN | Notas |
|---------|---------------|-------------|-------|
| Completitud del catálogo i18n | AUTO (validador) | MAN (revisión por hablante nativo por locale) | El validador en modo estricto marca claves faltantes; un hablante nativo verifica que las cadenas tengan sentido culturalmente |
| Firma de manifiesto HMAC | AUTO (unitaria) | MAN (smoke de despliegue multi-tenant) | Las pruebas unitarias firman + verifican; manual = smoke en producción contra el flujo de distribución de secretos |
| Compuerta isTrusted | AUTO (unitaria) | MAN (clic real vs. sintético lado a lado) | La unidad v22 cubre el flag; manual = el par de botones istrusted_real / istrusted_fake en example-v20-full.php |
| Interoperabilidad entre orígenes (v2.3) | AUTO (mock) | MAN (peer real con bearer token real) | v23-interop usa mock en página; manual = al menos una prueba entre orígenes antes de declarar v2.3 GA |
| Despliegue en yujin.app | AUTO (push -> auto-deploy) | MAN (verificar que las URLs devuelvan 200 + contenido correcto) | GoDaddy despliega automáticamente; manual = hacer curl a todas las URLs críticas después de cada push a main |
| Reproducción de audio en navegador real | -- | MAN (prueba de mic + parlante) | La Web Speech API necesita hardware real; manual = presionar el mic en el demo v21 en vivo, decir un prompt por locale |

## Resumen -- cobertura ponderada por categoría

| Categoría | AUTO | MAN | BOTH | Estado de cobertura |
|----------|------|-----|------|-----------------|
| Artefactos de runtime | 4 | 0 | 0 | EXCELENTE (95% promedio auto) |
| Paquete NPM | 4 | 0 | 0 | EXCELENTE (100% auto) |
| Demos | 6 | 1 | 1 | BUENO (auto para invariantes, manual para UX) |
| Documentación | 1 | 14 | 0 | ESPERADO (los docs se revisan, no se prueban unitariamente) |
| Guías de adopción | 0 | 10 | 0 | ESPERADO |
| Suites de prueba | 13 | 4 | 0 | EXCELENTE |
| Paquetes de casos de estudio | 2 | 2 | 0 | BUENO (auto + visual manual) |
| Aspectos transversales | 4 | 2 | 0 | BUENO |
| **TOTAL** | **34** | **33** | **1** | **EXCELENTE** |

## Cómo usar esta matriz

### Por release

1. Etiquetar la versión de spec + versión de la suite de referencia.
2. Ejecutar `bash tools/nac/test-launch.sh` -- cada fila AUTO es una compuerta.
3. Recorrer la columna MAN -- el [checklist Human OK](HUMAN_OK_CHECKLIST.md) es la forma ejecutable.
4. Actualizar COVERAGE_REPORT_<fecha>.md con los resultados de la ejecución.
5. Ajustar esta matriz si el panorama de artefactos cambió.

### Por adoptante

Copiar esta estructura de matriz para su propia app. Reemplazar los
nombres de artefactos; mantener la misma forma. La disciplina es la misma:
cada artefacto recibe una compuerta explícita de auto + manual.

### Anti-patrón

NO marcar un artefacto como "AUTO" si la prueba solo verifica presencia
de archivo. AUTO significa que la prueba ejercita comportamiento. Las
verificaciones de presencia de archivo van bajo el harness (test-launch.sh),
no en la matriz de artefactos.

## Ver también

- [NAC_TEST_MANUAL.md](NAC_TEST_MANUAL.md) -- el playbook del que deriva esta matriz.
- [HUMAN_OK_CHECKLIST.md](HUMAN_OK_CHECKLIST.md) -- la forma ejecutable de la columna MAN.
- [COVERAGE_REPORT_2026_05_10.md](COVERAGE_REPORT_2026_05_10.md) -- los resultados reales de ejecución para el release actual.

## Licencia

Apache-2.0.

---

*This is a machine translation of the canonical English
version at `/nac-spec/docs/TEST_COVERAGE_MATRIX.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
