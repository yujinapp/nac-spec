---
translation_source: SPEC.md
translation_source_hash: 5ebb8103746daf5bf7877b67ebb3a44cf98b4e2cba1fd8ba30093e0fce1b9b76
translation_quality: machine_v1
translation_lang: es
translation_date: 2026-05-11T12:46:05.891123+00:00
---

# NAC3 -- Native Agent Contract

**Version:** 2.2.0
**Status:** Stable
**License:** Apache-2.0
**Editor:** Yujin (rpaforce.com)

---

## 0. Propósito

NAC3 es un contrato entre interfaces web y los agentes que las controlan.
Los agentes incluyen ejecutores de voz, intermediarios LLM, bots de
RPA, herramientas de accesibilidad y ejecutores de pruebas end-to-end.
El contrato especifica:

1. **Cómo se nombran los elementos** -- para que un agente pueda pedir "hacer clic en el
   botón guardar" y resolverlo a un único nodo DOM.
2. **Cómo se aplican los verbos** -- para que un agente pueda llamar `NAC.click(id)`,
   `NAC.fill(id, value)`, `NAC.tab(plugin, key)`, etc., sin
   código de integración por aplicación.
3. **Cómo se señala la finalización** -- para que un agente sepa cuándo terminó un
   paso, con una familia de eventos determinista por rol.
4. **Cómo se preserva la procedencia** -- para que un sistema posterior pueda
   distinguir un clic real del usuario de uno sintetizado.

NAC3 agrega una capa delgada sobre cualquier framework con el que ya
renderices. No reemplaza ARIA, React, Vue ni tu sistema de diseño.

---

## 1. Roles

Cada elemento DOM relevante para un agente lleva `data-nac-role`. Los
roles canónicos son:

| Rol | Significado | Ejemplo |
|-----|-------------|---------|
| `plugin` | Un módulo de UI autocontenido (una página, un panel, una colección de widgets). | `<article data-nac-plugin="invoice">` |
| `section` | Un landmark dentro de un plugin (encabezado, cuerpo, pie, barra lateral). | `<section data-nac-role="section">` |
| `region` | Un área nombrable dentro de una sección (un grupo de tarjetas, una lista de resultados). | `<div data-nac-role="region">` |
| `action` | Un widget clickeable que dispara un verbo (botón, enlace como botón). | `<button data-nac-role="action" data-nac-action="save">` |
| `field` | Una entrada que el usuario escribe o alterna (texto, número, checkbox, radio, fecha, archivo). | `<input data-nac-role="field">` |
| `option` | Una opción seleccionable dentro de un campo (hijo de combobox / select / grupo radio). | `<li data-nac-role="option">` |
| `tab` | Un selector de panel intercambiable. **Requerido cuando `data-nac-id` coincide con `^tab\.`** | `<button data-nac-role="tab" data-nac-id="tab.lines">` |
| `breadcrumb-item` | Un paso de breadcrumb. | `<a data-nac-role="breadcrumb-item">` |
| `accordion-toggle` | Un control de expandir/colapsar. | `<button data-nac-role="accordion-toggle">` |
| `step` | Un indicador de paso de asistente. | `<li data-nac-role="step">` |
| `pagination-item` | Un control de salto de página en una lista paginada. | `<button data-nac-role="pagination-item">` |
| `confirm-button` | Un botón confirmar/cancelar dentro de un diálogo de confirmación. | `<button data-nac-role="confirm-button">` |
| `sort-control` | Un encabezado de columna para ordenar. | `<th data-nac-role="sort-control">` |
| `filter-control` | Un disparador de filtro de columna. | `<button data-nac-role="filter-control">` |
| `data-table` | Un host de tabla de datos (v2.1). | `<table data-nac-role="data-table">` |
| `navigation` | Una región de navegación landmark. **No es un tab.** | `<nav data-nac-role="navigation">` |
| `confirm-dialog` | El modal de una solicitud de confirmación. | `<div data-nac-role="confirm-dialog">` |

Los roles fuera de esta lista están reservados para uso futuro. Un
runtime NAC-strict DEBERÍA rechazar roles desconocidos al momento del
registro (v2.2). Un runtime NAC-permissive PUEDE tratar roles
desconocidos como `action` para compatibilidad con versiones anteriores
(comportamiento predeterminado en v1.9 y v2.0).

---

## 2. Nombres

Cada elemento resolvible por un agente lleva `data-nac-id`. El id es:

- **Una ruta con puntos** (p. ej. `deals.list.row.42.actions.delete`).
  Los puntos separan niveles semánticos; el runtime no los interpreta,
  pero los humanos y los LLMs sí.
- **Globalmente único dentro del ámbito de un `data-nac-plugin`.** Dos
  plugins distintos PUEDEN compartir un id; el runtime resuelve por
  el par `(plugin, id)`.
- **Estable entre re-renders.** Los frameworks que generan un nuevo id
  por render (hashes aleatorios, contadores de instancia) rompen el
  contrato.
- **Estable entre rediseños de UI.** Un botón se mueve de la barra de
  herramientas a un menú desplegable; su id DEBE permanecer igual.

Prefijos de id reservados (v2.1):

| Prefijo | Reservado para |
|---------|----------------|
| `tab.` | Botones de tab. El rol DEBE ser `tab`. |
| `modal.` | Elementos con ámbito de modal. El rol es el del widget hoja. |
| `field.` | Abreviatura de campo de formulario. El rol DEBE ser `field` u `option`. |
| `confirm.` | Diálogos de confirmación. |

---

## 3. Verbos

Un elemento `data-nac-role="action"` PUEDE llevar `data-nac-action="<verb>"`
indicando qué hace. El verbo es un identificador libre en snake_case
acordado entre el host y el agente. Verbos comunes:

`save`, `cancel`, `submit`, `delete`, `edit`, `view`, `create`,
`approve`, `reject`, `send`, `download`, `upload`, `refresh`,
`expand`, `collapse`, `open`, `close`, `add_row`, `remove_row`.

`NAC.click_by_verb(plugin, verb)` resuelve un verbo a la acción única
bajo ese plugin y hace clic en ella. Que múltiples acciones compartan
el mismo verbo bajo un plugin es un error de manifiesto (lint:
`duplicate_verb`).

---

## 4. Manifiesto

Cada plugin PUEDE registrar un manifiesto mediante:

```js
NAC.register({
  plugin_slug: 'invoice',
  version:     '1.0.0',
  nac_version: '2.1',
  elements: [
    { id: 'invoice.save', role: 'action',
      actions: [{ verb: 'save', label_i18n: { es: 'Guardar', en: 'Save', ... } }],
      label_i18n: { es: 'Guardar factura', en: 'Save invoice', ... } },
    ...
  ],
  tabs: [
    { nac_id: 'tab.lines', label_i18n: { es: 'Lineas', en: 'Lines' } },
    ...
  ],
  fields: [
    { id: 'field.client_name', type: 'text', required: true,
      label_i18n: { es: 'Cliente', en: 'Customer' } },
    ...
  ],
  data_tables: [...]
});
```

El manifiesto es la fuente de verdad orientada al agente. Un
intermediario LLM que determina "el usuario dijo 'guardar'" consulta el
manifiesto del plugin, encuentra el verbo `save` y emite
`NAC.click_by_verb('invoice', 'save')`.

### 4.1 Campos requeridos

- `plugin_slug` -- coincide con `data-nac-plugin` en el elemento host.
- `nac_version` -- la versión de NAC3 con la que este manifiesto declara
  cumplir. El runtime rechaza manifiestos que declaren una versión
  superior a la propia.

### 4.2 Campos opcionales

- `elements[]` -- el catálogo de widgets nombrados. Cada entrada DEBE
  tener `id` y `role`.
- `tabs[]` -- un arreglo de nivel superior separado para tabs.
  Equivalente a entradas de `elements[]` con `role:'tab'`. Ambas
  formas son válidas.
- `fields[]`, `actions[]`, `kpis[]`, `data_tables[]` -- subcolecciones
  tipadas; misma semántica que `elements[]` filtrado por rol. Los
  ejemplos usan la forma que resulte más legible para los humanos.

### 4.3 i18n

Cada `label_i18n` DEBE cubrir los 10 locales de NAC3:

```
es, en, pt, fr, ja, zh, hi, ar, de, it
```

`i18n_strict: 'permissive'` en `NAC.autoRegister.watch()` permite
cobertura parcial durante migraciones de sistemas existentes; los
manifiestos de producción deben incluir los 10 locales.

---

## 5. API Pública

### 5.1 Imperativa

```ts
NAC.click(nac_id: string, opts?: ClickOpts): Promise<{ok: true}>
NAC.click_by_verb(plugin: string|null, verb: string, opts?): Promise<...>
NAC.fill(nac_id: string, value: string|number|boolean): Promise<...>
NAC.select(nac_id: string, value: string): Promise<...>
NAC.tab(plugin: string, tab_key: string): Promise<...>
NAC.tab_by_label(plugin: string|null, label: string): Promise<...>
NAC.go_to_section(nac_id: string): Promise<...>
NAC.drag_drop(source_id, target_id, opts?: {to_index?: number}): Promise<...>
NAC.set_mode(mode: 'modal'|'maximized'|'new_tab'|'new_window'): void
NAC.screenshot(): Promise<string>  // data URL
NAC.bindAction(el, handler, {plugin, action_id}): () => void  // v2.2
```

### 5.1.1 Helper de conformidad (v2.2)

`NAC.bindAction(el, handler, ctx)` es la forma conforme a la especificación para
conectar un manejador de clic. Emite `nac:action:succeeded` (o
`:failed`) automáticamente después de que el manejador se ejecuta (síncrono, con excepción o
Promise). Devuelve una función para desregistrar el manejador. Úsalo en lugar de
`addEventListener('click', ...)` directamente siempre que el host lo soporte;
el código brownfield puede seguir emitiendo el evento manualmente como antes.

### 5.1.3 Editor de campo (v2.3 preview)

`NAC.edit_field(nac_id)` abre un modal que permite a un usuario (o a un
agente en su nombre) editar cualquier campo de texto con herramientas estilo Word:

```ts
NAC.edit_field(nac_id: string): Promise<{ok:true}>
```

El modal se registra bajo `plugin_slug='nac_editor'` con estos
verbos invocables de NAC-3:

| Verbo | Efecto |
|-------|--------|
| `select_word` | selecciona la palabra en la posición del cursor |
| `select_sentence` | selecciona la oración en la posición del cursor |
| `select_all` | Ctrl-A dentro del editor |
| `replace` | reemplaza la selección con el texto indicado |
| `delete_selection` | elimina la selección actual |
| `ai_correct_syntax` | envía el valor actual al intermediario LLM mediante POST con el prompt de sistema "fix grammar + spelling, return only fixed text"; reemplaza el valor con la respuesta |
| `save` | escribe de vuelta en el campo de origen, despacha los eventos input y change, cierra el modal |
| `cancel` | descarta los cambios y cierra el modal |

Esc cierra el modal (cancelar). Ctrl/Cmd+Enter guarda. Hacer clic en el
fondo del overlay cancela.

La sección 13 de la especificación formalizará el contrato en v2.3; el runtime de v2.2
incluye una implementación de referencia funcional para que los adoptantes puedan integrarlo hoy.
Disponible en cualquier campo mediante:

```js
NAC.edit_field('invoice.client_name');
// o mediante intermediario:
NAC.click_by_verb('myplugin', 'edit_field', { nac_id: 'invoice.client_name' });
```

### 5.1.2 Flag de validación estricta (v2.2)

`NAC.STRICT_VALIDATION` (booleano, por defecto `false` en v2.2). Cuando
es `true`, `NAC.register()` lanza un `Error` con `code='strict_validation'`
y un array `findings` ante cualquiera de las siguientes condiciones:

- `manifest_role_unknown` -- el rol de la entrada está fuera del conjunto canónico.
- `tab_id_manifest_role_drift` -- el id coincide con `^tab\.` pero el rol
  no es `'tab'`.
- `manifest_dom_role_mismatch` -- el `data-nac-role` del elemento DOM montado
  difiere del rol de la entrada en el manifiesto.

En v2.3 el valor por defecto cambia a `true`. En v3.0 el flag se elimina
(el modo estricto será el único disponible).

Todos los métodos asíncronos rechazan con un `NacError` cuyo `code` es uno de:

- `not_found` -- el elemento, rol o verbo indicado no está en el DOM.
- `invalid` -- la forma del argumento es incorrecta.
- `timeout` -- el efecto secundario fue despachado pero el evento de confirmación de conformidad
  no llegó dentro de 5 segundos. **Un timeout significa falla real**:
  el manejador puede haberse colgado, el ack nunca fue conectado o
  ocurrió una condición de carrera en la red. Los llamadores DEBEN tratar el timeout como falla
  a menos que tengan prueba del efecto secundario por otro canal.

### 5.2 Introspección

```ts
NAC.describe():    { active: string|null, plugins: PluginSnap[] }
NAC.describe_v2(): { v2_scope_entries: [...], sitemap: ..., data_tables: [...] }
NAC.manifest(plugin_slug: string): Manifest|null
NAC.validate_global(opts?: {probe?: boolean}): Findings[]
```

### 5.3 Tablas de datos (v2.1)

```ts
NAC.registerDataTable(spec: DataTableSpec): void
NAC.dt_add_row(table_id, values): {ok, row_id}
NAC.dt_remove_row(table_id, row_id): {ok}
NAC.dt_edit_cell(table_id, row_id, column, value): {ok} | {ok:false, error}
NAC.dt_set_cell(table_id, row, col, value): {ok} | {ok:false, error}
NAC.dt_select(table_id, target): {ok}
NAC.dt_commit(table_id): {ok, final_state} | {ok:false, errors:[...]}
NAC.dt_discard(table_id): {ok}
NAC.dt_state(table_id): TableState
NAC.dt_read_aggregate(table_id, agg_key, column): number|null
NAC.registerDataTableComputed(table_id, column, fn): void
```

Una tabla de datos tiene un `subkind`:

- `collection` -- filas ordenadas con commit transaccional opcional.
  Se usa para líneas de factura, ítems de carrito, entradas de log.
- `matrix` -- grilla de filas x columnas donde cada celda contiene un valor.
  Se usa para matrices de permisos, grillas de horarios.
- `matrix-singletree` -- matrix donde cada fila se colapsa en un
  árbol (poco frecuente).

---

## 6. Eventos

Cada acción emite un evento de finalización determinístico. El método
`NAC.click()` del runtime espera este evento y se resuelve cuando se dispara.

| Rol | Evento de éxito | Evento de falla |
|-----|-----------------|-----------------|
| `action` | `nac:action:succeeded` | `nac:action:failed` |
| `field` | `nac:field:changed` | -- |
| `option` | `nac:field:changed` | -- |
| `tab` | `nac:tab:activated` | -- |
| `breadcrumb-item` | `nac:breadcrumb:navigated` | -- |
| `accordion-toggle` | `nac:accordion:expanded` / `:collapsed` | -- |
| `step` | `nac:step:advanced` | -- |
| `pagination-item` | `nac:table:page_changed` | -- |
| `confirm-button` | `nac:confirm:resolved` / `:cancelled` | -- |
| `sort-control` | `nac:table:sort_changed` | -- |
| `filter-control` | `nac:table:filter_changed` | -- |

### 6.1 Estructura del detalle del evento

El detalle de cada evento incluye el campo de id canónico más `plugin`:

```js
nac:action:succeeded {
  detail: { plugin: 'invoice', action_id: 'invoice.save', ... }
}
nac:tab:activated {
  detail: { plugin: 'invoice_edit_modal', tab_id: 'tab.lines', ... }
}
nac:field:changed {
  detail: { plugin: 'invoice', field_id: 'field.client_name',
            value: 'Acme Corp', ... }
}
```

### 6.2 Emisión desde un manejador del host

Un manejador de clic DEBE emitir el evento de éxito correspondiente después de
su efecto secundario síncrono:

```js
button.addEventListener('click', function (ev) {
  // ... realizar el trabajo ...
  document.dispatchEvent(new CustomEvent('nac:action:succeeded', {
    detail: { plugin: 'invoice', action_id: 'invoice.save' }
  }));
});
```

Si el trabajo es asíncrono, emitir después de la resolución. Si el trabajo
falla, emitir `nac:action:failed` con `{detail: {plugin, action_id,
error: <message>}}`.

El runtime v2.2 proveerá `NAC.bindAction(el, handler, ctx)`
que envuelve `addEventListener` y emite automáticamente.

### 6.3 ¿Por qué no usar el evento click directamente?

Un evento `click` del DOM se dispara antes de que el manejador se ejecute. El contrato
de NAC3 necesita saber cuándo **el efecto secundario se completó**, no cuándo
comenzó el clic. De ahí la familia de eventos separada.

---

## 7. Procedencia

### 7.1 isTrusted

`event.isTrusted` es `true` para clics iniciados por el usuario (mouse real,
tecla real, activación por lector de pantalla) y `false` para
clics sintetizados (`element.click()`, dispatchEvent de un MouseEvent
construido manualmente, automatización).

NAC3 DEBE exponer este valor mediante `event.detail.is_trusted` en el
evento de éxito. Los hosts que realizan acciones sensibles desde el punto de vista de seguridad
(pagos, eliminaciones) PUEDEN requerir `is_trusted === true` y rechazar
clics sintéticos. La demo de referencia `example-v20-full.php`
incluye un par de botones (`v20_panel.istrusted_real` y
`v20_panel.istrusted_fake`) que ilustran la diferencia.

### 7.2 Manifiestos firmados con HMAC

Un manifiesto PUEDE incluir un bloque `provenance`:

```js
NAC.set_provenance_secret('your-tenant-secret');
NAC.register({
  plugin_slug: 'invoice',
  ...,
  provenance: {
    signed_at: '2026-05-09T10:00:00Z',
    signed_by: 'tenant-X',
    signature: '<HMAC-SHA256 of manifest body>'
  }
});
```

El runtime calcula el HMAC esperado sobre una serialización estable
del manifiesto (excluyendo la firma en sí) y rechaza los manifiestos
cuya firma no coincida. Se utiliza en despliegues multi-tenant para
evitar que un tenant suplante el manifiesto de otro.

### 7.3 Modelo de amenazas

Consulte `SECURITY.md` para el modelo de amenazas completo. Versión resumida:

- NAC3 no autentica al **usuario**. Esa es la responsabilidad de
  su capa de autenticación.
- NAC3 autentica el **manifiesto** (HMAC).
- NAC3 distingue clics reales de clics sintetizados
  (isTrusted) para que un host pueda rechazar estos últimos en verbos sensibles.
- NAC3 no protege contra un agente malicioso que opere con
  acceso a nivel de usuario. Dicho agente puede hacer todo lo que el usuario puede hacer.

---

## 8. Niveles de conformidad

Una página es **conforme con NAC-1** si:

- Cada widget interactivo que un agente debe poder operar
  lleva `data-nac-id` y `data-nac-role`.
- Cada elemento con `data-nac-role="action"` dispara
  `nac:action:succeeded` tras su efecto secundario.
- La página registra al menos un manifiesto de plugin mediante
  `NAC.register()`.
- `NAC.click(id)` funciona para cada id anunciado.

Una página es **conforme con NAC-2** si además:

- Registra los arreglos `tabs[]`, `fields[]`, `actions[]` de forma explícita
  en su manifiesto (no inferidos del DOM).
- Proporciona `label_i18n` cubriendo los 10 locales de NAC3 para cada
  etiqueta visible al usuario.
- Implementa las primitivas brownfield de v2.0: árbol de alcance,
  captura efímera, autoRegister.watch.
- Pasa `NAC.validate_global({probe: false})` con cero
  hallazgos de severidad `error`.

Una página es **conforme con NAC-3** si además:

- Lleva manifiestos firmados con HMAC.
- Distingue `isTrusted` para verbos sensibles desde el punto de vista de seguridad.
- Pasa `NAC.validate_global({probe: true})` con cero
  hallazgos.

El CLI del paquete NPM (`npx @nac3/runtime validate <url>`) reporta
el nivel más alto que alcanza una página.

---

## 9. Versionado

NAC3 sigue semver:

- Incremento **mayor**: cambio que rompe la compatibilidad con la API pública o los formatos de intercambio.
  Los adoptantes deben modificar su código.
- Incremento **menor**: nuevas funcionalidades, compatibles hacia atrás. El código existente
  sigue funcionando.
- Incremento de **parche**: correcciones de errores, cambios solo en documentación.

Política de deprecación: una funcionalidad marcada como `@deprecated` en la versión
`X.Y.0` no se elimina antes de `(X+1).0.0`. Las notas de la versión
documentan cada eliminación de forma explícita.

La versión del paquete NPM refleja la versión de la especificación: `@nac3/runtime@2.1.3`
implementa NAC3 v2.1 con tres revisiones de parche.

---

## 10. Validadores

### 10.1 Runtime: `NAC.validate_global()`

Recorre el DOM en vivo, los manifiestos registrados y el catálogo i18n,
y devuelve un arreglo de hallazgos:

```ts
{
  severity: 'error' | 'warn' | 'info',
  code:     string,                     // e.g. 'tab_role_drift'
  nac_id:   string | null,
  message:  string,
  detail:   Record<string, any>
}
```

Los códigos de hallazgos son estables entre versiones de parche; los nuevos códigos solo
aparecen en incrementos menores.

### 10.2 CLI: `npx @nac3/runtime validate <target>`

Envuelve `validate_global` más un análisis estático de coherencia entre HTML y manifiesto.
Códigos de salida:

- `0` -- sin hallazgos de severidad >= umbral configurado.
- `1` -- hay hallazgos.
- `2` -- el objetivo no pudo cargarse.

Útil en CI: `npx @nac3/runtime validate ./dist/index.html
--severity=error`.

---

## 11. El sistema alrededor de NAC3

NAC3 es una capa de contrato. Para convertir una página conforme con NAC en una
aplicación controlada por voz, también se necesita:

1. **Una fuente de reconocimiento de voz** (SpeechRecognition del navegador,
   Whisper API, etc.).
2. **Un intermediario LLM** que toma el texto del usuario + el snapshot de
   `NAC.describe()` de la página + una pista i18n y emite acciones estructuradas:
   `[{kind: 'click', nac_id: 'X'}, {kind: 'fill', nac_id:
   'Y', value: 'Z'}]`. Consulte `guides/LLM_WIRING.md`.
3. **Un cliente de chat** que mantiene la conversación y despacha
   las acciones. La referencia es `js/nac-chat-client.js`.
4. **Un destino de síntesis de voz** para las respuestas habladas (SpeechSynthesis
   del navegador, ElevenLabs, etc.).

NAC3 estandariza únicamente la forma de entrada/salida del paso 2 (el
snapshot de `NAC.describe()` + la forma de las acciones). Los pasos 1, 3 y 4 están
fuera de la especificación; usted compone lo que prefiera.

---

## 12. Garantías de estabilidad

Lo que esta especificación promete:

1. El conjunto de roles canónicos de la sección 1 no se reducirá.
   Se PUEDEN agregar nuevos roles en versiones menores.
2. La familia de eventos de la sección 6 no será renombrada.
   Se PUEDEN agregar nuevos eventos en versiones menores.
3. Los verbos de `NAC.click`, `NAC.fill`, etc. no cambiarán
   su forma en versiones menores. PUEDEN aparecer nuevos campos opcionales en `opts`.
4. Los códigos de hallazgos de `validate_global` no serán reutilizados para
   condiciones distintas entre versiones menores.

Lo que esta especificación NO promete:

1. El texto exacto de los mensajes de error (son cadenas del catálogo i18n;
   las localizaciones pueden cambiar).
2. La estrategia DOM para encontrar elementos (`querySelector` actualmente;
   podría migrar a un índice más rápido en el futuro).
3. El diseño interno del caché de manifiestos. Trate los manifiestos como
   de solo escritura desde el lado del host, y de solo lectura desde el lado del agente.

---

## 13. Preguntas abiertas (rastreadas por separado)

- ¿Debería `data-nac-role="navigation"` resolverse alguna vez como una pestaña?
  Actualmente no (v2.1). El roadmap de v22 propone un rechazo más estricto.
- ¿Debería `NAC.click()` aceptar ids relativos (p. ej., `'./save'` para
  indicar "guardar bajo el plugin activo")? No en v2.1; posiblemente en v2.3.
- ¿Deberían los manifiestos soportar herencia/extensión entre plugins
  (un manifiesto base extendido por un tenant)? Registrado como
  candidato para v3.0.

---

## 13.5 Gobernanza

NAC3 está actualmente bajo la administración de Yujin. La especificación se publica
bajo Apache 2.0; el runtime de referencia bajo MIT. Yujin se compromete
a trasladar NAC3 a una fundación neutral (grupo comunitario de W3C,
Linux Foundation u organismo equivalente de la industria) si y cuando
la adopción justifique una gobernanza neutral. Hasta entonces, los cambios a la especificación
siguen el proceso RFC documentado en `CONTRIBUTING.md`, con un período de
comentarios públicos de al menos 14 días para cualquier cambio que afecte la API pública
o los formatos de intercambio.

Para los adoptantes: la combinación de licencias Apache 2.0 + MIT garantiza
que la especificación y el runtime sobrevivan cualquier cambio en el estado corporativo
de Yujin. Usted puede hacer un fork de cualquiera, ejecutar cualquiera y distribuir
cualquiera, hoy y después de que dejemos de existir. Este documento registra
el compromiso para que el camino hacia esa continuidad sea explícito, no implícito.

---

## 14. Implementación de referencia

La implementación canónica es el runtime de referencia distribuido
como el paquete NPM `@nac3/runtime`. El runtime está completo en funcionalidades
para v2.1 e incluye:

- `js/nac.js` -- base v1.9 + la API pública de la sección 5.
- `js/nac-v2-extensions.js` -- las primitivas brownfield de v2.0
  (árbol de alcance, captura efímera, autoRegister, HMAC, isTrusted).
- `js/nac-chat-client.js` -- un cliente de chat de referencia que conecta
  voz + LLM + despachador.

Se aceptan otras implementaciones (Python para ejecutores de automatización nativos,
Rust para agentes embebidos, etc.). La especificación, no el código JS,
es la autoridad.

---

*Este documento es la especificación canónica de NAC3 v2.1. Las ediciones a
este archivo constituyen cambios a la especificación y requieren un RFC; consulte
`CONTRIBUTING.md`.*

---

*This is a machine translation of the canonical English
version at `/nac-spec/SPEC.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
