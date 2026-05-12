---
translation_source: README_DEMOS.md
translation_source_hash: 0f488dd749283f4f2e03f0e431de47d7007818c6745ce1ce993014bdf9839480
translation_quality: machine_v1
translation_lang: es
translation_date: 2026-05-11T12:47:05.998480+00:00
---

# Demos en vivo de NAC3 en yujin.app/nac-spec/

**Versión de la spec:** 2.2 stable (+ vista previa de interoperabilidad v2.3).

**NAC3** = **Native Agent Contract**. La spec que permite que las interfaces web sean
controladas por asistentes de IA, ejecutores de voz y herramientas de accesibilidad
sin necesidad de código de integración por aplicación.

Tres demos disponibles en paralelo. Cada uno tiene un propósito distinto; no los confunda.

| Archivo | Versión | Propósito |
|---|---|---|
| `example.php` | v1.9 stable | El demo canónico para NAC3 v1.9. 27 widgets (chat, calendario, autopilot, modales, pestañas, gráficos, etc.). Muestra la superficie completa de funcionalidades de v1.9 en una UI con forma de producción. **Sin cambios.** |
| `example-v20-primitives-showcase.php` | v2.0-rc4 | **Showcase didáctico** de los 8 primitivos de v2.0 + HMAC + isTrusted + contrato i18n. 8 secciones, una por primitivo. Útil para revisores y adoptantes que quieran entender cada nuevo primitivo de forma aislada. **NO es una migración de example.php.** |
| `example-v20-full.php` | v2.0-rc4 | **Migración brownfield** de `example.php` a NAC3 v2.0 strict. Los mismos 27 widgets, el mismo HTML, los mismos handlers -- con la capa v2.0 aplicada encima mediante ~80 líneas de código de configuración. Demuestra que la adopción en proyectos reales NO requiere reescribir cada widget. |

## Comparación en paralelo

Abra `example.php` y `example-v20-full.php` en dos pestañas.

### Qué es idéntico

- El markup HTML (cada `<article data-nac-plugin="X">`, cada
  `data-nac-id`, cada referencia al catálogo i18n, cada handler)
- La apariencia visual (mismo layout, mismos widgets, mismas interacciones)
- El runtime de referencia v1.9 (`js/nac.js`) cargado de la misma forma
- Las referencias existentes al catálogo `data-i18n-key`

### Qué es diferente en la versión v2.0-full

1. **Docstring del encabezado** que explica explícitamente que es un
   showcase de migración brownfield.
2. **Una etiqueta script adicional**: `js/nac-v2-extensions.js` cargado
   después de `nac.js` y antes de `example.js`.
3. **Un bloque de configuración adicional** (~80 líneas al final de la
   página) que:
   - Construye un árbol de scopes jerárquico a partir de los atributos
     `data-nac-plugin` existentes (cada plugin se convierte en un scope
     bajo `demo.shell`).
   - Llama a `NAC.set_provenance_secret()` para habilitar la firma HMAC.
   - Llama a `NAC.setTenantPrefix('demo')` para demostrar multi-tenant.
   - Inicia el buffer circular `NAC.captureEphemeral()` para toasts.
   - Llama a `NAC.autoRegister.watch()` sobre el contenedor de tarjetas.
4. **Un panel de UI adicional** (`#v20-panel`, fijo en la esquina inferior derecha)
   que expone `describe_v2()`, `validate_global_v2()`, demo de firma HMAC
   y el botón de distinción isTrusted en vivo.

Ese es el delta completo. Los adoptantes reales pueden reutilizar este patrón tal cual.

## Cómo evaluar

Si es un revisor de NAC3 v2.0:

1. Abra `example.php` primero. Confirme que el demo v1.9 funciona como antes.
2. Abra `example-v20-full.php`. Confirme que funciona DE FORMA IDÉNTICA para
   la funcionalidad v1.9 (chat, calendario, autopilot, etc.).
3. Abra el panel v2.0 (esquina inferior derecha). Haga clic en cada botón:
   - `describe_v2()` -- vea el árbol de scopes construido a partir de los
     atributos de plugin brownfield.
   - `validate_global_v2()` -- vea los hallazgos (probablemente solo advertencias
     si el catálogo i18n tiene vacíos).
   - `sign as agent` -- vea la firma HMAC generada.
   - `click=trusted` / `.click()=fake` -- vea la distinción isTrusted en acción.

Si es un adoptante:

Use el bloque de configuración de `example-v20-full.php` como plantilla. Adapte
el árbol de scopes a la estructura de plugins de su aplicación. La mayor parte del
trabajo consiste en identificar su jerarquía de scopes; el resto es mecánico.

## Enlaces relacionados

- Spec de NAC3: https://github.com/pkuschnirof/nac-spec
- Release v1.9: tag `v1.9.0`
- Release candidate v2.0: `2.0.0-rc4` en `main`
- Historial de revisión de pares ronda 3: `docs/PEER_REVIEW.md`

---

*This is a machine translation of the canonical English
version at `/nac-spec/README_DEMOS.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
