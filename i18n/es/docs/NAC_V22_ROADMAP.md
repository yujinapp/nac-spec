---
translation_source: docs/NAC_V22_ROADMAP.md
translation_source_hash: dc0f3c2cfa1ebdc7fb567491c123749675bbb7496bb16cee81c1e202e8e7d4f4
translation_quality: machine_v1
translation_lang: es
translation_date: 2026-05-11T13:22:22.693791+00:00
---

# NAC3 v2.2 -- hoja de ruta

NAC3 = **Native Agent Contract**.

Iniciado el 2026-05-09. Este archivo acumula los elementos de evolución
para el próximo minor de la especificación NAC3. Cada sección es
autocontenida: descripción del problema, la clase de bug que previene,
el cambio de contrato propuesto y las notas de implementación.

**Estado al 2026-05-10:** v2.2 PUBLICADA. Los ítems V22-01 +
V22-02 + V22-03 + V22-04 están todos en `js/nac.js` + el paquete NPM
`@nac3/runtime` 2.2.0. Este archivo es ahora el changelog canónico de
la versión.

| Ítem | Estado | Commit |
|------|--------|--------|
| V22-01 validador estricto | PUBLICADO | 6c2b1866 |
| V22-02 helper bindAction | PUBLICADO | 6c2b1866 |
| V22-03 endurecimiento del detector de locale | PUBLICADO 2026-05-09 | f631d77a |
| V22-04 normalización de paréntesis en tab_by_label | PUBLICADO 2026-05-09 | f631d77a |

---

## V22-01 -- El constructor (`NAC.register`) se convierte en validador estricto

**Clase de problema.** Las demos brownfield pueden declarar elementos
del manifiesto con valores de rol no canónicos (`role:'navigation'` en
un tab, `role:'button'` en lugar de `'action'`, etc.). El constructor
actual acepta cualquier forma que recibe y la almacena tal cual.
El bug solo aparece en tiempo de ejecución cuando la API (`NAC.tab()`,
`NAC.tab_by_label()`, `NAC.click()`) no puede encontrar el elemento,
porque la consulta DOM canónica (`[data-nac-role="tab"]`) no coincide.
Para entonces la demo ya está desplegada, el usuario ya ejecutó el
comando de voz roto, y el runtime lanza correctamente `tab X missing`
-- un error engañoso ya que el elemento SÍ está en el DOM, solo bajo
el rol incorrecto.

**Disparador concreto (2026-05-09).** Pablo dicta `ve a pestana
permisos` en `example-v21-data-table.php`. El LLM resuelve a
`NAC.tab('invoice_edit_modal','tab.permissions')`. El botón
existe en el DOM pero con `data-nac-role="navigation"` (establecido por
el autor de la demo por razones semánticas HTML: los tabs SÍ son
navegación). El runtime lanza "tab tab.permissions missing" aunque el
botón está ahí mismo. La misma causa raíz provocó que
`tab_by_label('Lines (collection)')` fallara antes en la misma sesión.

**Por qué tres capas de guardia deberían haberlo detectado pero no lo hicieron.**

| Capa | Debería detectar... | Qué hace hoy |
|---|---|---|
| Lint pre-commit | deriva de roles en archivos PHP/HTML de demo | no existe |
| `NAC.register(manifest)` (en tiempo de registro) | roles no canónicos, desajuste id/rol | acepta todo silenciosamente |
| `NAC.validate_global()` (en tiempo de lint) | deriva de roles dentro de `m.elements[]` | solo verifica presencia de `m.tabs[]` |

La capa de API en tiempo de ejecución (`NAC.tab` etc.) es la **cuarta**
guardia, y la única que se activa hoy -- como un error en tiempo de
ejecución para el usuario final. Para entonces el costo es el más alto.

**Cambio de contrato propuesto para v2.2.**

`NAC.register` DEBE validar el manifiesto antes de almacenarlo.
Reglas de validación:

1. **Enumeración de roles conocidos.** Cada `m.elements[i].role` debe
   ser miembro del conjunto de roles canónicos (extiende
   `_CLICK_EVENT_FAMILY`):

   ```
   action, field, option, tab, breadcrumb-item, accordion-toggle,
   step, pagination-item, confirm-button, sort-control,
   filter-control, data-table, plugin, section, region,
   navigation, banner, complementary, contentinfo, button
   ```

   Roles desconocidos -> `console.error` + rechazar la llamada a register.
   Los roles landmark (`navigation`, `banner`, etc.) se aceptan pero
   solo en elementos cuyo nodo DOM correspondiente es un contenedor de
   región, no un widget clickeable.

2. **Coherencia id/rol.** Si `e.id` coincide con `^tab\.` entonces
   se requiere `e.role === 'tab'`. Si `e.id` coincide con
   `^modal\.` entonces se requiere `e.role === 'action'` (o el
   sub-rol de la acción). Cualquier desajuste -> `console.error` +
   rechazar. La gramática del campo id también es un contrato;
   hoy es implícita.

3. **Coherencia DOM (mejor esfuerzo).** Cuando `register` se llama
   después de que el DOM está parseado (el camino típico), buscar
   `[data-nac-id="<e.id>"]` en el DOM. Si se encuentra y su
   `data-nac-role` difiere de `e.role`, `console.error` +
   rechazar. Esto captura el caso que Pablo encontró el 2026-05-09: el
   manifiesto dice `role:'tab'` pero el HTML todavía dice
   `data-nac-role="navigation"` (o viceversa). Cuando se llama
   antes de que el DOM esté listo, diferir la verificación a un
   post-paso en `DOMContentLoaded`.

4. **Helper de migración (una ventana de release).** Para v2.2.0 lo
   anterior produce `console.error` pero NO lanza excepción -- los
   adoptantes necesitan una ventana para migrar. A partir de v2.3.0
   lanzarán un `RegisterError` y el manifiesto será rechazado
   definitivamente. Rastreado en el runtime mediante el flag
   `NAC.STRICT_VALIDATION` con valor predeterminado `false` en v2.2
   y `true` en v2.3.

**Extensión de `NAC.validate_global()`.**

Agregar tres nuevos hallazgos:

- `manifest_role_unknown` -- el rol de un elemento está fuera del
  conjunto canónico.
- `manifest_dom_role_mismatch` -- el rol del manifiesto para
  `<id>` difiere del atributo `data-nac-role` del DOM.
- `tab_role_drift` -- un `<button>` (o cualquier elemento clickeable)
  en el DOM tiene `data-nac-id="tab.X"` pero `data-nac-role` no es
  `"tab"` -- independientemente de si existe una entrada en el
  manifiesto. Captura la deriva solo en HTML que el validador de
  manifiesto no puede detectar por definición.

Cada hallazgo tiene severidad `error` por defecto;
`{ kind: 'warn' }` es sobreescribible por proyecto.

**Lint pre-commit (entregable separado, bloquea la misma deriva).**

Un nuevo script de node `tools/nac/check_demos.mjs` lee todos los
archivos `*.php` y `*.html` en `yujin.app/nac-spec/`, construye un
pseudo-DOM mediante cheerio (o regex para el camino liviano), extrae
cada llamada `NAC.register({...})` de los scripts inline, y
verifica las mismas reglas de coherencia. Conectado a GitHub Actions
y a un hook git local `pre-commit`. Bloquea el commit si alguna
regla falla.

**Estimación de esfuerzo.**

| Tarea | Dónde | Esfuerzo |
|---|---|---|
| Modo estricto de `NAC.register` | `js/nac.js` | 2h |
| Nuevos hallazgos en `validate_global` | `js/nac.js` | 2h |
| Script de lint pre-commit | `tools/nac/check_demos.mjs` | 4h |
| Barrido de migración sobre demos existentes | `example-v*.php` | 1h |
| Actualizaciones de documentación en la spec | `docs/spec.md` etc. | 1h |
| Tests + integración CI | `tests/` + `.github/workflows/` | 2h |

Total: ~12h enfocadas.

**Compatibilidad hacia atrás.**

Las notas de release de v2.2 deben declarar:
- `NAC.register` ahora emite `console.error` ante deriva de roles
  (sin lanzar excepción).
- v2.3 comenzará a lanzar `RegisterError` bajo las mismas condiciones.
- Los adoptantes deben ejecutar `NAC.validate_global()` antes de publicar.

El camino de migración para las 6 demos existentes en este repositorio
ya está hecho a partir del commit `0633e080` (2026-05-09): los botones
de tab de la demo v21 y su manifiesto fueron corregidos a `role:'tab'`.

---

## V22-02 -- Cumplimiento del contrato action-ack

**Clase de problema.** Los handlers de click que realizan su trabajo
de forma síncrona deben emitir
`dispatchEvent(new CustomEvent('nac:action:succeeded',
{detail:{plugin,action_id}}))` después del efecto secundario. Los
paneles brownfield frecuentemente lo olvidan. El runtime entonces
agota el tiempo de espera del ack-poll de 5s aunque el efecto
secundario ya ocurrió, y el chat o agente reporta
`No pude ejecutar X: timeout`.

**Disparador concreto (2026-05-09).** Pablo: `hide` -> el panel se
oculta correctamente, el chat dice "No pude ejecutar v20_panel.toggle:
timeout". Lo mismo para cada botón del v20-panel.

**El workaround anterior era incorrecto.** El commit `ad200e4c`
trataba `err.code === 'timeout'` como éxito en el loop agéntico del
chat. Pablo señaló correctamente que eso enmascaraba fallas reales
(handler colgado, race de red, excepción no manejada) y rompía la
única señal honesta del runtime. Revertido en `c9bf2bdb`.

**La corrección correcta ya fue publicada.** Envolver `bind()` en
`example-v20-full.php` para emitir automáticamente
`nac:action:succeeded`/`nac:action:failed` después de cada handler.
Hecho en `c9bf2bdb`.

**Cambio de contrato propuesto para v2.2.**

El runtime DEBERÍA proveer un helper:

```js
NAC.bindAction(el, handler, { plugin, action_id })
```

que se encarga de la emisión del ack automáticamente. Misma superficie
que `addEventListener('click', handler)` pero con el contrato de
conformidad incorporado. Las demos que adopten el helper no pueden
olvidarlo.

`validate_global` agrega un nuevo hallazgo:

- `action_handler_without_ack` -- detectado mediante instrumentación:
  durante `validate_global` el validador despacha un click sintético
  en cada elemento `data-nac-role="action"` bajo un contexto
  controlado, escucha `nac:action:succeeded` por 500ms, y marca
  los que no lo emiten.

Este hallazgo es opt-in (`NAC.validate_global({ probe: true })`)
porque los clicks sintéticos tienen efectos secundarios.

**Esfuerzo.** ~3h para el helper + ~4h para el hallazgo basado en probe.

---

## V22-03 -- Endurecimiento del detector de cambio de locale

**Clase de problema.** Los códigos de locale de 2 letras simples en el
detector de idioma del cliente de chat (`'de'`, `'es'`, `'en'`) colisionan
con preposiciones y artículos en varios idiomas. `cambia DE pestana`
cambiaba el chat al alemán.

**La corrección ya fue publicada.** `_detectLangSwitch` en
`nac-chat-client.js` ahora requiere que los códigos de 2 letras simples
coexistan con un `LOCALE_TRIGGER` explícito
(`idioma`/`language`/`sprache`/...). Hecho en `f631d77a`.

**Propuesto para v2.2.** Mover el detector de locale fuera del cliente
de chat hacia un primitivo NAC3, para que cada embed de chat brownfield
obtenga el mismo detector endurecido. Documentar la clase de falsos
positivos explícitamente en la spec para que implementaciones futuras
no reintroduzcan el bug.

**Esfuerzo.** ~2h.

---

## V22-04 -- Tolerancia al lenguaje natural en `tab_by_label`

**Ya incluido.** El stripping de paréntesis (`"Lines (collection)"` coincide
con `"Lines"` y `"Lines tab"`) fue publicado en `f631d77a`. Esto **no**
es un fallback legacy -- es normalización legítima del texto de botón
citado por el LLM. Documentar en la spec como el comportamiento canónico
del matcher.

**Esfuerzo.** ~1h solo documentación.

---

## Fuera del alcance de v2.2 (diferido a v2.3+)

- Jerarquías de roles componibles (`role:'tab.primary'` vs
  `role:'tab.secondary'`): deseable pero sin disparador concreto.
- Hot-reload de manifiesto: aún es raro; el reload de página actual
  es suficiente.
- Búsqueda de etiquetas multi-locale en los 10 locales simultáneamente
  (hoy el matcher los itera en serie, lo cual es suficiente para
  ~20 tabs por plugin).

---

## Cómo los ítems pasan de este documento a la spec

1. Implementar + publicar el cambio en el runtime detrás de un feature flag.
2. Actualizar las demos para que pasen la nueva validación estricta.
3. Dejar en producción al menos un ciclo de release con el flag
   predeterminado en `warn` (sin lanzar excepción).
4. Mover la regla a `docs/spec.md` y cambiar el predeterminado a `error`
   (lanzando excepción) en el próximo minor.
5. Tachar la entrada de esta hoja de ruta y agregar una línea en
   `docs/CHANGELOG.md`.

---

*This is a machine translation of the canonical English
version at `/nac-spec/docs/NAC_V22_ROADMAP.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
