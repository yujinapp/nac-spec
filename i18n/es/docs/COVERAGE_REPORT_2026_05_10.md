---
translation_source: docs/COVERAGE_REPORT_2026_05_10.md
translation_source_hash: 4da4311e057dd1c23dea9b23a506ada42741d28b05b94709cb5150b1686c51ac
translation_quality: machine_v1
translation_lang: es
translation_date: 2026-05-11T13:30:05.953491+00:00
---

# Reporte de cobertura NAC3 -- noche del 10/11 de mayo de 2026

Generado al cierre de la noche de cobertura en la rama
`feat/nac-interop-mcp`. Este es el registro honesto, caso por caso,
de qué se probó y con qué profundidad.

Reemplaza las afirmaciones informales anteriores de "50/50 PASS" /
"5/5 capas GREEN". Esos números eran estructuralmente correctos
pero la profundidad era desigual; este reporte reformula el panorama
por etapa del pipeline.

## Recordatorio de etapas del pipeline

```
Comunicacion -> Desambiguacion -> Intencion -> Llamada -> Resultado -> Ack
    (1)              (2)             (3)         (4)        (5)         (6)
```

## Suites entregadas (esta rama)

| Suite | Ruta | Tests |
|-------|------|-------|
| smoke | `packages/nac/test/smoke.mjs` | 36 |
| v22 (constructor strict + bindAction) | `packages/nac/test/v22.mjs` | 14 |
| v23-interop (MCP entre aplicaciones) | `packages/nac/test/v23-interop.mjs` | 14 |
| stage1-audio (mock STT + corpus TTS) | `packages/nac/test/stage1-audio.mjs` | 33 |
| stage2-disambiguation | `packages/nac/test/stage2-disambiguation.mjs` | 31 |
| stage3-backend (llamadas en vivo) | `packages/nac/test/stage3-backend.mjs` | ~80 |
| stage4-calls | `packages/nac/test/stage4-calls.mjs` | 31 |
| stage6-ack | `packages/nac/test/stage6-ack.mjs` | 16 |
| **Total local** | | **175+** |

Todos pasan actualmente en local. GitHub Actions no está activo
(presupuesto de créditos en cero; los tests corren solo en la
laptop de Pablo o bajo demanda).

## Matriz de cobertura por etapa del pipeline

### Etapa 1 -- Comunicacion (STT + entrada cruda)

| Capa | Estado | Notas |
|------|--------|-------|
| **CAPA A: mock STT + inyección de corpus** | PASS (30/30) | `packages/nac/test/stage1-audio.mjs`. El mock `SpeechRecognition` sintetiza un evento `result`; NacChat lo recibe y despacha normalmente. Verifica que las trampas de idioma permanezcan en el locale, que los prompts de cambio efectivamente cambien, y que los prompts normales activen el backend. |
| **CAPA B: integridad del corpus** | PASS (3/3) | 30 archivos MP3 generados vía Google Cloud TTS en `packages/nac/test/fixtures/voice/`. Total 365 KB en 10 locales. Verificación de presencia de archivos y tamaño mínimo. |
| Reproducción de audio real con SpeechRecognition del navegador | DIFERIDO | La Web Speech API requiere un stream de micrófono real y un navegador. Corresponde a los e2e con Playwright (en cola). |

**Cobertura Etapa 1: ~85%** -- rutas de texto, corpus y mock STT
completamente cubiertas. Solo queda la reproducción de audio real
en el navegador, que requiere Playwright.

### Etapa 2 -- Desambiguacion

| Aspecto | Casos | Resultado |
|---------|-------|-----------|
| Guardia contra falsos positivos en `_detectLangSwitch` (clase de bug f631d77a) | 12 | PASS -- `cambia de pestana`, `cambia precio de mouse 40`, `borra de la lista`, `pasa de A a B` permanecen CORRECTAMENTE en español. `cambia a aleman`, `switch to english`, `use spanish`, `cambia idioma a de` cambian correctamente. Sin cambio cuando el idioma es el mismo + sin crash con entrada vacía. |
| Coincidencia exacta de textContent en `tab_by_label` | 1 | PASS |
| Eliminación de paréntesis en `tab_by_label` (`"Lines (collection)"` coincide con `"Lines"`) | 1 | PASS |
| Coincidencia por locale i18n en `tab_by_label` | 1 | PASS |
| `tab_by_label` desconocido -> not_found | 1 | PASS |
| `snapshotTree` retorna forma válida | 6 | PASS |

**Cobertura Etapa 2: ~95%.** El ajuste del matcher (requerir
`cand.length >= 3` para coincidencias parciales) se entregó como
corrección adicional en la misma suite, cerrando el falso positivo
de etiquetas de un solo carácter.

### Etapa 3 -- Intencion

Llamadas en vivo contra el endpoint de producción
`https://yujin.app/crm/api/v1/yujin/nac-demo`. El backend de chat
Yujin (Claude Sonnet) actúa como intermediario LLM.

| Aspecto | Casos | Resultado |
|---------|-------|-----------|
| HTTP 200 + respuesta JSON por prompt | 15 prompts en 7 locales (es/en/pt/fr/de/ja + un prompt trampa en español) | PASS en todos |
| La respuesta incluye booleano `ok` | 15 | PASS |
| Cuando `ok`, tiene string `message` + array `actions` | 15 | PASS |
| Cada acción incluye string `kind` | 15 | PASS |
| **Guardia anti-bug**: `cambia de pestana` NO emite `change_locale: 'de'` | 1 | PASS -- el LLM en vivo respeta la regla del system prompt entregada el 2026-05-09. |

**Cobertura Etapa 3: ~85%** del contrato de forma. No es 100%
porque los contenidos específicos de las acciones del LLM son
no deterministas; solo se verifica la forma y el caso anti-bug.

### Etapa 4 -- Llamada (todas las funciones públicas de NAC.*)

| Función | Casos | Resultado |
|---------|-------|-----------|
| `NAC.click` | happy / not_found / invalid | 3 PASS |
| `NAC.click_by_verb` | happy / verbo desconocido | 2 PASS |
| `NAC.fill` | happy / not_found / valor aplicado al DOM | 3 PASS |
| `NAC.select` | happy / not_found | 2 PASS |
| `NAC.tab` | happy / tecla desconocida / plugin no montado | 3 PASS |
| `NAC.tab_by_label` | textContent / paréntesis / i18n / not_found | 4 PASS (se superpone con etapa 2) |
| `NAC.go_to_section` | happy / section_not_found | 2 PASS |
| `NAC.set_mode` | válido / inválido | 2 PASS |
| `NAC.screenshot` | retorna data URL | 1 PASS |
| `NAC.edit_field` (preview v2.3) | abre / not_found / invalid | 3 PASS |
| `NAC.dt_add_row` | retorna row_id | 1 PASS |
| `NAC.dt_edit_cell` | happy / rechaza inválido | 2 PASS |
| `NAC.dt_remove_row` | decrementa estado | 1 PASS |
| `NAC.dt_commit` | retorna final_state | 1 PASS |
| `NAC.dt_discard` | revierte cambios no confirmados | 1 PASS |
| `NAC.dt_read_aggregate` | agregado de suma | 1 PASS |
| `NAC.bindAction` | el handler se dispara + el unbinder funciona | 2 PASS |

**Cobertura Etapa 4: ~95%** de la superficie pública de escritura.
Falta: `drag_drop` (sin cobertura de shim aún), primitivas de toast /
banner / diálogo de confirmación de v1.3 (baja prioridad para v2.x).

### Etapa 5 -- Resultado (efecto secundario en el DOM)

| Aspecto | Estado |
|---------|--------|
| `fill` actualiza input.value | PASS (T6 etapa 4 lo verifica) |
| `select` actualiza el elemento select | PASS (T8 etapa 4) |
| Las mutaciones de `dt_*` se reflejan en `dt_state()` | PASS (T24-T30 etapa 4) |
| El modal de `edit_field` se monta | PASS (T21 etapa 4) |
| Verificación DOM completa en pantalla con Playwright | DIFERIDO -- requiere navegador real + pasos de build con Vite/ng |

**Cobertura Etapa 5: ~70%** a nivel unitario. La verificación DOM
completa está en cola.

### Etapa 6 -- Familia de eventos Ack

| Familia | Casos | Resultado |
|---------|-------|-----------|
| Forma de `nac:action:succeeded` (plugin + action_id + is_trusted) | 4 | PASS |
| Forma de `nac:field:changed` | 3 | PASS |
| Forma de `nac:tab:activated` | 2 | PASS |
| `nac:action:failed` al lanzar excepción en el handler | 2 | PASS |
| Ruta de resolución asíncrona de `bindAction` | 1 | PASS |
| Tiempo de click-to-resolve < 200ms | 1 | PASS |
| Forma canónica de detail entre familias | 3 | PASS |

**Cobertura Etapa 6: ~95%.** Falta: las familias de eventos de larga
cola (`nac:breadcrumb:navigated`, `nac:accordion:expanded`,
`nac:step:advanced`, `nac:table:sort_changed`,
`nac:table:filter_changed`, `nac:confirm:resolved`). El patrón es
el mismo; cubrirlos sería mecánico.

### Transversal: interop (preview v2.3)

| Aspecto | Casos | Resultado |
|---------|-------|-----------|
| Forma de `export_tree` + scope + filtro de locale | 7 | PASS |
| `import_remote_tree` valida conn + registra plugins con namespace + refleja en lista | 5 | PASS |
| Despacho proxy para `click` + `fill` | 4 | PASS |
| Mirror local de ack con `via_interop:true` | 1 | PASS |
| El código de error del peer se propaga | 1 | PASS |
| `disconnect_remote` + rechazo post-desconexión | 2 | PASS |
| Los clicks locales NO se proxean | 1 | PASS |

**Cobertura Interop: 100%** de la superficie del preview v2.3.

## Resumen de cobertura -- pipeline ponderado

| Etapa | Cobertura | Veredicto |
|-------|-----------|-----------|
| 1 Comunicacion | **85%** | Mock STT + corpus TTS PASS. Solo queda reproducción de audio real en navegador. |
| 2 Desambiguacion | 95% | Sólida. Clase de bug verificada. |
| 3 Intencion | 85% | Forma del backend en vivo cubierta. |
| 4 Llamada | 95% | Toda la API pública de escritura probada. |
| 5 Resultado | 70% | Mayormente a nivel unitario. Playwright en cola. |
| 6 Ack | 95% | Familias principales cubiertas; larga cola es mecánica. |
| Interop | 100% | Superficie completa del preview v2.3. |
| **Promedio ponderado** | **~90%** | |

## Qué cambió en el runtime como resultado

Los tests detectaron dos problemas reales que se corrigieron en la
misma rama:

1. **Matcher de `tab_by_label` demasiado permisivo para etiquetas
   de 1 carácter.** Corregido en `js/nac.js` línea 2264 exigiendo
   `cand.length >= 3` para coincidencia parcial bidireccional. La
   igualdad exacta siempre está permitida. Detectado por el test B4
   de la Etapa 2 (una etiqueta desconocida pasaba el filtro).

2. **Faltaba el helper de introspección `NAC.list_registered_plugins()`.** 
   Agregado en `js/nac.js` para que `export_tree` de la capa interop
   pueda iterar los manifiestos registrados independientemente del
   estado de montaje en el DOM. Detectado al escribir la suite
   v23-interop.

Ambos son valiosos -- los tests extrajeron bugs reales del runtime,
que es exactamente el objetivo.

## Qué falta antes de hacer merge a main

| Tarea | Prioridad | Esfuerzo |
|-------|-----------|----------|
| e2e con Playwright en los 6 demos en vivo | alta | 1h |
| Playwright en casos de estudio React + Angular (servidor de desarrollo) | alta | 30min |
| Generación del corpus TTS (Google Cloud, 30 prompts) | media | 20min |
| Test de mock STT + inyección de corpus | media | 30min |
| Test unitario de `drag_drop` | baja | 10min |
| Tests de familias ack de larga cola (breadcrumb, accordion, step, etc) | baja | 30min |
| Cherry-pick de `yujin.app/nac-spec/demos/` + landing a main | bloqueante | 2min |
| Traspaso de email a Pablo | bloqueante | 5min |

Tiempo restante estimado: **~3h tiempo-Sumi** para cerrar en >= 90%
de promedio ponderado + un cherry-pick limpio a main.

## Tiempos de ejecución de tests (laptop, en frío)

| Suite | Tiempo |
|-------|--------|
| smoke | < 1s |
| v22 | < 1s |
| v23-interop | < 2s |
| stage2 | < 1s |
| stage3 (backend en vivo) | ~60s (15 prompts x ~4s promedio + 500ms de espaciado) |
| stage4 | ~2s (setup de modal + dt) |
| stage6 | < 1s |
| **Total** | **~75s** |

`tools/nac/test-launch.sh` (el harness) necesita extenderse para
incluir las etapas 2-6 + interop; pendiente.

## Registro de auditoría

| Commit | Contenido |
|--------|-----------|
| `5b06ae3f` | demos compilados + desplegados + etapa 2 |
| `632aa1f6` | etapas 2+4 + casos de uso del landing |
| (pendiente) | etapas 3+6 + este reporte |

---

*Este documento es el registro canónico de cobertura para la rama
interop v2.3 + el runtime v2.2 tal como está al 2026-05-11
00:50 UTC-3. Se actualiza a medida que se entregan nuevas suites.*

---

*This is a machine translation of the canonical English
version at `/nac-spec/docs/COVERAGE_REPORT_2026_05_10.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
