---
translation_source_hash: abf83a2435d03edd99061463e66e25982e426a41f93a8a1bf4a0c0720500553c
translation_quality: machine_v1
translation_date: 2026-10-27
translation_engine: anthropic/claude-opus-5 (Yujin Forge)
translation_normative: false
translation_status: complete
translation_lang: es
translation_source: SPEC.md
translation_source_version: 2.5.2
translation_source_date: 2026-10-27
translation_sections: 83
translation_sections_canonical: 83
translation_units: 283
translation_units_canonical: 283
translation_canonical_url: /nac-spec/SPEC.html
---

<!-- translation-banner: produced by scripts/build-translation-banners.mjs -->

> **Traducción automática, no normativa.** Traduce la versión en inglés tal como estaba el 2026-10-27 (NAC3 v2.5.2) y cubre 83 de las 83 secciones del original de hoy. El texto normativo es el inglés: si esta traducción y el inglés no coinciden, manda el inglés.
>
> *Non-normative machine translation. The normative text of NAC3 is the English one.*
>
> [Leer el texto normativo en inglés](/nac-spec/SPEC.html)

<!-- /translation-banner -->

# NAC3 -- Native Agent Contract

**Versión:** 2.5.2 (estable -- la superficie v2.5 completa: narrate, context+tree, expect+diff)
**Estado:** Versión estable. La etiqueta de distribución `latest` de npm apunta aquí; la sección 9.1 dice qué garantiza eso y qué no garantiza una preversión. Este documento declara su versión en exactamente un lugar, la línea de arriba. Los RFC publicados y su evidencia de Capa 2 + Capa 3 están listados en `README.md` y `runtime/CHANGELOG.md`.
**Licencia:** Apache-2.0
**Editor:** Yujin (yujin.app)

---

## 0. Propósito

NAC3 es un contrato entre interfaces web y los agentes que las
manejan. Entre los agentes están los ejecutores de voz, los
intermediarios LLM, los bots de RPA, las herramientas de
accesibilidad y los ejecutores de pruebas end-to-end. El contrato
especifica:

1. **Cómo se nombran los elementos** -- para que un agente pueda pedir
   "hacé clic en el botón guardar" y resolverlo a un único nodo del DOM.
2. **Cómo se aplican los verbos** -- para que un agente pueda llamar a
   `NAC.click(id)`, `NAC.fill(id, value)`, `NAC.tab(plugin, key)`, etc.,
   sin pegamento por aplicación.
3. **Cómo se señaliza la finalización** -- para que un agente sepa cuándo
   terminó un paso, con una familia de eventos determinista por rol.
4. **Cómo se preserva la procedencia** -- para que un sistema posterior
   pueda distinguir un clic real del usuario de uno sintetizado.

NAC3 agrega una capa delgada encima del framework con el que ya
renderizás. No reemplaza a ARIA, ni a React, ni a Vue, ni a tu sistema
de diseño.

---

## 1. Roles

Todo elemento del DOM que sea relevante para un agente lleva
`data-nac-role`. Los roles canónicos son:

| Rol | Significado | Ejemplo |
|------|---------|---------|
| `plugin` | Un módulo de interfaz autocontenido (una página, un panel, un conjunto de widgets). | `<article data-nac-plugin="invoice">` |
| `section` | Un punto de referencia dentro de un plugin (encabezado, cuerpo, pie, barra lateral). | `<section data-nac-role="section">` |
| `region` | Un área nombrable dentro de una sección (un grupo de tarjetas, una lista de resultados). | `<div data-nac-role="region">` |
| `action` | Un widget clicable que dispara un verbo (botón, enlace usado como botón). | `<button data-nac-role="action" data-nac-action="save">` |
| `field` | Una entrada que el usuario escribe o conmuta (texto, número, casilla, radio, fecha, archivo). | `<input data-nac-role="field">` |
| `option` | Una opción seleccionable dentro de un campo (hijo de un combobox / select / grupo de radios). | `<li data-nac-role="option">` |
| `tab` | Un selector de panel conmutable. **Obligatorio cuando `data-nac-id` coincide con `^tab\.`** | `<button data-nac-role="tab" data-nac-id="tab.lines">` |
| `breadcrumb-item` | Un salto de la ruta de migas. | `<a data-nac-role="breadcrumb-item">` |
| `accordion-toggle` | Un control de expandir/colapsar. | `<button data-nac-role="accordion-toggle">` |
| `step` | Un indicador de paso de un asistente. | `<li data-nac-role="step">` |
| `pagination-item` | Un control de salto de página en una lista paginada. | `<button data-nac-role="pagination-item">` |
| `confirm-button` | Un botón de confirmar/cancelar dentro de un diálogo de confirmación. | `<button data-nac-role="confirm-button">` |
| `sort-control` | Un encabezado de columna que ordena. | `<th data-nac-role="sort-control">` |
| `filter-control` | Un disparador de filtro de columna. | `<button data-nac-role="filter-control">` |
| `data-table` | El anfitrión de una tabla de datos (desde 2.1). | `<table data-nac-role="data-table">` |
| `navigation` | Una región de navegación de referencia. **No es una pestaña.** | `<nav data-nac-role="navigation">` |
| `confirm-dialog` | El modal de un pedido de confirmación. | `<div data-nac-role="confirm-dialog">` |
| `draggable` | Un elemento que el usuario puede levantar y mover (desde 1.6.2). | `<li data-nac-role="draggable">` |
| `drop-target` | Un lugar donde se puede soltar un `draggable` (desde 1.6.2). | `<ul data-nac-role="drop-target">` |
| `button` | **Tolerado, no recomendado.** Un botón heredado que sólo necesita ser clicable, sin contrato de acción. El runtime lo trata como `action`. Preferí `action` con un `data-nac-action` explícito. | `<button data-nac-role="button">` |

Los roles que no están en esta lista quedan reservados para uso futuro.
Un runtime NAC-strict DEBERÍA rechazar los roles desconocidos en el
momento del registro (v2.2). Un runtime NAC-permissive PUEDE tratar los
roles desconocidos como `action` por compatibilidad hacia atrás (el
comportamiento por omisión en v1.9 y v2.0).

Esta tabla es la lista normativa, y se publica como dato: el catálogo
legible por máquina que está en `api/latest/contract.json` lleva todos
los roles que acepta el runtime de referencia, cada uno marcado con
`declared_in_spec_table` para que las dos listas se puedan comparar sin
leer prosa. Coinciden a la fecha de v2.5. Cualquier divergencia futura
queda visible en esa marca, en lugar de quedar escondida en una
diferencia de opinión entre un documento y una implementación.

---

## 2. Nombres

Todo elemento que un agente pueda resolver lleva `data-nac-id`. El id es:

- **Una ruta con puntos** (por ejemplo `deals.list.row.42.actions.delete`).
  Los puntos separan niveles semánticos; el runtime no los interpreta,
  pero las personas y los LLM sí.
- **Único a nivel global dentro del alcance de un `data-nac-plugin`.** Dos
  plugins distintos PUEDEN compartir un id; el runtime resuelve por el
  par `(plugin, id)`.
- **Estable entre re-renderizados.** Los frameworks que producen un id
  nuevo por renderizado (hashes aleatorios, contadores de instancia)
  rompen el contrato.
- **Estable entre rediseños de la interfaz.** Un botón pasa de la barra
  de herramientas a un desplegable; su id DEBE seguir siendo el mismo.

Prefijos de id reservados (desde 2.1):

| Prefijo | Reservado para |
|--------|--------------|
| `tab.` | Botones de pestaña. El rol DEBE ser `tab`. |
| `modal.` | Elementos con alcance de modal. El rol es el del widget hoja. |
| `field.` | Forma abreviada de un campo de formulario. El rol DEBE ser `field` u `option`. |
| `confirm.` | Diálogos de confirmación. |

---

## 3. Verbos

Un elemento con `data-nac-role="action"` PUEDE llevar `data-nac-action="<verb>"`
nombrando lo que hace. El verbo es un identificador libre en snake-case
acordado entre el host y el agente. Verbos habituales:

`save`, `cancel`, `submit`, `delete`, `edit`, `view`, `create`,
`approve`, `reject`, `send`, `download`, `upload`, `refresh`,
`expand`, `collapse`, `open`, `close`, `add_row`, `remove_row`.

`NAC.click_by_verb(plugin, verb)` resuelve un verbo al único elemento de
acción que hay bajo ese plugin y le hace clic. Que varias acciones
compartan el mismo verbo bajo un mismo plugin es un error de manifiesto
(lint: `duplicate_verb`).

---

## 4. Manifiesto

Todo plugin PUEDE registrar un manifiesto mediante:

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

El manifiesto es la fuente de verdad que mira el agente. Un
intermediario LLM que decide "el usuario dijo 'guardar'" busca el
manifiesto del plugin, encuentra el verbo `save` y emite
`NAC.click_by_verb('invoice', 'save')`.

### 4.1 Campos obligatorios

- `plugin_slug` -- coincide con el `data-nac-plugin` del elemento
  anfitrión.
- `nac_version` -- la versión de NAC3 con la que este manifiesto dice
  cumplir. El runtime rechaza los manifiestos que declaran una versión
  más alta que la suya.

### 4.2 Campos opcionales

- `elements[]` -- el catálogo de widgets con nombre. Cada entrada DEBE
  tener `id` y `role`.
- `tabs[]` -- un arreglo de primer nivel aparte, para las pestañas.
  Equivale a entradas de `elements[]` con `role:'tab'`. Las dos formas
  son válidas.
- `fields[]`, `actions[]`, `kpis[]`, `data_tables[]` -- subcolecciones
  tipadas; la misma semántica que `elements[]` filtrado por rol. Las
  demos eligen la forma que se lee mejor para una persona.

### 4.3 i18n

Todo `label_i18n` DEBE cubrir las 10 locales de NAC3:

```
es, en, pt, fr, ja, zh, hi, ar, de, it
```

`i18n_strict: 'permissive'` en `NAC.autoRegister.watch()` admite
cobertura parcial durante una migración brownfield; los manifiestos de
producción deberían publicar las 10 locales.

#### 4.3.1 Sobre qué recae la exigencia de las diez locales

La exigencia de arriba recae sobre el **manifiesto de quien adopta**: el
mapa `label_i18n` que lee un agente para nombrar un elemento en el
idioma del usuario. NO recae sobre el idioma de este documento, y nada
en NAC3 obliga a una implementación a publicar su propia documentación
en diez idiomas.

#### 4.3.2 Idioma normativo de esta especificación

El texto normativo de NAC3 es el **inglés**: el `SPEC.md` que está en la
raíz del repositorio de la especificación, renderizado en
`https://yujin.app/nac-spec/SPEC.html`.

La especificación también se publica como traducciones automáticas bajo
`i18n/<locale>/SPEC.md`. Esas traducciones son **no normativas**. Cada
una declara, en un cartel que un lector ve y en un encabezado legible
por máquina, qué revisión del inglés traduce y cuánto de ella cubre; el
cartel es obligatorio, y una traducción publicada que no lleve cartel es
un defecto de la publicación, no de la traducción. Cuando una traducción
y el texto en inglés no coinciden, manda el texto en inglés, y una
afirmación de conformidad es una afirmación contra el texto en inglés.

Una traducción que está atrasada respecto del inglés **nunca bloquea la
publicación del inglés**. El texto normativo sale cuando está listo; una
traducción vieja se reporta, unidad por unidad, y la versión se publica.
Nueve artefactos automáticos no tienen veto sobre el documento que
traducen. Hasta la 2.5.1 las nueve cubrían 34 de las 83 secciones y nada
lo decía; ahora se producen desde un almacén por idioma, y el
procedimiento es `docs/TRANSLATION_PASS.md`.

---

## 5. API pública

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

### 5.1.1 Ayudante de conformidad (v2.2)

`NAC.bindAction(el, handler, ctx)` es la forma conforme a la
especificación de conectar un manejador de clic. Emite
`nac:action:succeeded` (o `:failed`) de manera automática después de que
el manejador se ejecuta (síncrono, con excepción o Promise). Devuelve un
desvinculador. Usá esto en lugar de un `addEventListener('click', ...)`
pelado siempre que el host lo soporte; el código brownfield puede seguir
emitiendo el evento a mano, como antes.

### 5.1.3 Editor de campo (v2.3)

`NAC.edit_field(nac_id)` abre un modal que permite a una persona (o a un
agente en su nombre) editar cualquier campo de texto con herramientas al
estilo de un procesador de textos:

```ts
NAC.edit_field(nac_id: string): Promise<{ok:true}>
```

El modal se registra bajo `plugin_slug='nac_editor'` con estos verbos
invocables desde NAC3:

| Verbo | Efecto |
|------|--------|
| `select_word` | seleccionar la palabra donde está el cursor |
| `select_sentence` | seleccionar la oración donde está el cursor |
| `select_all` | ctrl-A dentro del editor |
| `replace` | reemplazar la selección por el texto dado |
| `delete_selection` | quitar la selección actual |
| `ai_correct_syntax` | hacer POST del valor actual al intermediario LLM con el prompt de sistema "fix grammar + spelling, return only fixed text"; reemplazar el valor por la respuesta |
| `save` | escribir de vuelta en el campo de origen, despachar los eventos input y change, cerrar |
| `cancel` | descartar, cerrar |

Esc cierra (cancela). Ctrl/Cmd+Enter guarda. Un clic en el fondo del
overlay cancela.

La sección 13 de la especificación formalizará el contrato en v2.3; el
runtime v2.2 publica una implementación de referencia funcionando para
que quien adopte lo pueda conectar hoy. Disponible en cualquier campo
mediante:

```js
NAC.edit_field('invoice.client_name');
// or by intermediary:
NAC.click_by_verb('myplugin', 'edit_field', { nac_id: 'invoice.client_name' });
```

### 5.1.4 Carga útil de acción + invoke (v2.3)

Las acciones de NAC v2.2 son de clic y listo: un agente dispara
`NAC.click(id)` o `NAC.click_by_verb(plugin, verb)` y el host hace lo
que hace. Esto sirve para las acciones de verbo y estado (`save`,
`cancel`, `submit`, `delete`) pero se derrumba cuando una acción
necesita **datos** del agente -- `utter(text)`, `search(query)`,
`send_message(body)`, `upload(file)`, `schedule(date)`,
`translate(text, target_lang)`. El host no tiene manera de recibir la
carga útil del agente a través de un clic sintético.

v2.3 cierra esa brecha. El contrato es aditivo: los verbos al estilo
clic siguen funcionando igual.

```ts
NAC.invoke(action_id: string, payload: object, opts?: { timeout?: number })
  : Promise<{ok: true, request_id: string, ack: object|null}>

NAC.utter(action_id: string,
          opts: { text: string, lang?: string, voice?: string, metadata?: object })
  : Promise<{ok: true, request_id: string, ack: object|null}>
```

`NAC.invoke` despacha un `CustomEvent` `nac:action:requested` sobre el
elemento anfitrión (burbujea hasta document) con:

```ts
detail: {
  action_id:  string,    // canonical nac_id of the host element
  verb:       string,    // payload.verb || el's data-nac-action
  payload:    object,    // arbitrary, action-specific
  plugin:     string|null,
  request_id: string,    // correlation token assigned by the runtime
  ts:         number,    // Date.now()
}
```

El host escucha `nac:action:requested`, procesa la carga útil y emite
`nac:action:succeeded` (o `nac:action:failed`) con el mismo
`request_id` en el detalle. El runtime correlaciona por `request_id` y
resuelve la Promise del agente.

El tiempo de espera por omisión es de **30 segundos** (contra 5 s para
el clic). Se cambia con `opts.timeout`. Al vencer, la Promise se
rechaza con `NacError('timeout', ...)`. Igual que con el clic, un
vencimiento significa una falla real: quien llama DEBE tratarlo como
tal, salvo que tenga prueba del efecto por otro canal.

`NAC.utter(id, opts)` es el atajo ergonómico para el verbo con carga
útil más común. Equivale a:

```js
NAC.invoke(id, { verb: 'utter', text: opts.text, lang: opts.lang });
```

#### Declaración en el manifiesto

Una acción que lleva carga útil declara el esquema de esa carga en su
entrada del manifiesto, por trazabilidad y por las herramientas:

```js
NAC.register({
  plugin_slug: 'atlas_pro_ad',
  version:     '2.1.0',
  nac_version: '2.3',
  elements: [
    { id: 'atlas_pro_ad.mic', role: 'action',
      actions: [
        { verb: 'listen' },
        { verb: 'utter',
          payload_schema: {
            text: { type: 'string', required: true, max: 4000 },
            lang: { type: 'string',
                    enum: ['en','es','pt','fr','it','de','ja','zh','hi','ar'] }
          },
          label_i18n: { es:'Decir', en:'Utter', /* ... 10 locales */ } }
      ],
      label_i18n: { /* ... */ } }
  ]
});
```

`payload_schema` es **informativo a la fecha de v2.5**, y el runtime de
referencia no lo lee en absoluto: el campo se acepta en un manifiesto,
viaja en `NAC.manifest()` y nunca se valida contra nada.
`NAC.STRICT_VALIDATION` -- cuyo valor por omisión sí pasó a `true` en
2.3.0 -- cubre únicamente los hallazgos de rol de manifiesto y DOM;
nunca cubrió las cargas útiles. Así que un agente NO DEBE suponer que
una carga fue revisada porque se declaró un esquema: hoy la única
validación que ocurre es la que hace el agente antes de enviar.

Los esquemas son deliberadamente simples (un subconjunto con forma de
JSON-Schema) para que un runtime pueda validar sin tener que incluir un
validador completo de JSON-Schema, y ésa sigue siendo la intención de
diseño para cuando se exija.

Una revisión anterior de esta sección prometía, para la versión 2.4,
formalizar la gramática del esquema y hacer que se exigiera por
omisión. **Eso no pasó en 2.4 y no pasó hasta la 2.5.** La frase se
quita en lugar de ponerle otra fecha: una promesa con un número de
versión pegado, que sigue en pie pasada esa versión, un agente la lee
como una capacidad con la que puede contar. Formalizar la gramática y
conectar la exigencia queda registrado como pregunta abierta en la
sección 13, donde figura como abierta y sin fecha.

#### Semántica del estado deshabilitado (parche de v2.3 desde alpha.2)

`NAC.invoke` NO rechaza cuando el elemento destino tiene puesto
`disabled` o `aria-disabled='true'`. El atributo HTML `disabled` es una
guarda de clic de la interfaz; `invoke` es un pedido lógico con carga
útil, no un clic sintético. Los hosts que necesiten rechazar un invoke
en función del estado de la interfaz DEBEN hacerlo en su escucha de
`nac:action:requested` y emitir `nac:action:failed` con un código de
error que signifique algo.

`NAC.click`, en cambio, SIGUE rechazando sobre elementos
deshabilitados (se preserva la semántica del clic). Cobertura de
pruebas: `runtime/test/v23-invoke.mjs` T7/T8/T9.

#### Conformidad: los hosts que soportan invoke DEBEN

1. Declarar `actions[].payload_schema` en la entrada del manifiesto.
2. Escuchar `nac:action:requested` (o usar una escucha genérica que
   filtre por `detail.action_id` + `detail.verb`).
3. Emitir `nac:action:succeeded` -- con `detail.request_id` devuelto
   igual -- después de procesar, o `nac:action:failed` (con el código
   en `detail.error`) si falla.
4. NUNCA emitir un evento `:succeeded` con un `request_id` que no
   recibieron (evita el cruce entre invocaciones concurrentes).

Los hosts que NO soportan invoke siguen operando con normalidad bajo
`NAC.click()` y `NAC.click_by_verb()`. Los agentes que llamen a
`NAC.invoke()` contra un host que no tenga una entrada
`actions[].payload_schema` van a recibir igual un `request_id`, pero el
runtime no puede garantizar la entrega; el tiempo de espera vence a los
30 s.

#### Por qué esto importa

La superficie agéntica completa deja de ser "una lista de botones" y
pasa a ser "una lista de botones + entradas estructuradas". Un aviso de
voz se vuelve invocable con NAC.invoke. Una barra de búsqueda se vuelve
invocable con NAC.invoke. Una subida de archivo se vuelve invocable con
NAC.invoke. El mismo protocolo, la misma procedencia, la misma
semántica de acuse.

El primer adoptante de referencia es **Atlas Pro**: su elemento
`atlas_pro_ad.mic` declara tanto el verbo `listen` (sólo clic, el que
ya existía) como `utter` (con carga útil). El mismo bucle
conversacional de `/parse` + `/tts` conduce en los dos casos; los
agentes que tienen STT llaman a `listen`, y los agentes que tienen su
propio modelo de lenguaje llaman a `utter`.

#### Modalidades futuras (previstas, sin cambio de especificación)

`invoke` es deliberadamente agnóstico de la modalidad, para que las
familias de entrada que vengan se enchufen sin romper el contrato:

| Modalidad | Verbo (boceto)        | Carga útil (boceto)                              |
|----------|-----------------------|--------------------------------------------------|
| Texto    | `utter`               | `{text, lang?}`                                  |
| Búsqueda | `search`              | `{query, scope?, limit?}`                        |
| Archivo  | `upload`              | `{filename, mime, data_url \| stream_id}`        |
| Imagen   | `analyze_image`       | `{image_url \| data_url, prompt?}`               |
| Video    | `analyze_stream`      | `{stream_url, frame_window_ms?, return?}`        |
| Agenda   | `schedule`            | `{datetime, duration_min, attendees?}`           |
| Código   | `apply_diff`          | `{file_path, unified_diff}`                      |
| Voz      | `transcribe`          | `{audio_url \| data_url, lang?}`                 |

Cada modalidad sigue el mismo protocolo de eventos
`nac:action:requested` -> `nac:action:succeeded` / `:failed`, la misma
correlación por `request_id`, la misma semántica de tiempo de espera.
El runtime se mantiene chico; el vocabulario de verbos crece por
convención entre hosts y agentes. Los atajos ergonómicos (`NAC.utter`,
`NAC.search`, `NAC.watch`, etc.) se pueden agregar más adelante sin
volver a especificar nada, porque cada uno es una envoltura delgada
sobre `invoke`.

### 5.1.5 Resolución en shadow DOM -- raíces abiertas (v2.3)

El runtime resuelve las referencias `data-nac-id` a través de las
raíces shadow abiertas, de manera recursiva. Una página puede montar
Web Components con `attachShadow({mode:'open'})`, poner atributos
`data-nac-*` en elementos de adentro del árbol shadow, y cualquier
llamador de NAC3 (`NAC.click`, `NAC.fill`, `NAC.invoke`, etc.) resuelve
el destino de manera transparente.

#### Algoritmo de resolución

Para un selector `S` (típicamente `[data-nac-id="..."]`) contra una
raíz `R` (típicamente `document`):

1. `R.querySelector(S)` -> si no es nulo, devolver de inmediato.
2. Para cada descendiente `el` de `R`:
   - Si `el.shadowRoot` no es nulo (o sea, raíz shadow abierta):
     recurrir con `R := el.shadowRoot`, profundidad +1.
   - Si no, y `el.nac3` es un objeto que expone un método `query`,
     delegar (ver la sección 5.1.6).
3. La recursión está **limitada a 10 niveles de profundidad**. Los
   destinos más profundos que 10 son inalcanzables; quien llama recibe
   `code='not_found'`. El límite existe para evitar recorridos
   patológicos; en la práctica ninguna base de código en producción
   anida más de 3-4 niveles shadow.
4. El recorrido va en orden del DOM a lo ancho: primero los hermanos,
   después los shadow anidados. Gana la primera coincidencia.

#### Propagación de eventos

Los eventos que emiten los hosts desde adentro de una raíz shadow
DEBEN poner `composed: true` para que las escuchas a nivel de document
los reciban. El runtime de NAC3 ya emite todos sus propios eventos con
`composed:true`; el código del host que emite eventos `nac:*` a mano es
responsable de lo mismo. Sin `composed:true` el evento se detiene en el
borde del shadow y la maquinaria de correlación del runtime nunca lo
ve.

#### Responsabilidad de quien escribe el componente

Quien escribe el componente tiene que:

1. Poner `data-nac-id`, `data-nac-role`, `data-nac-action` en los
   elementos operables de adentro de la raíz shadow.
2. Poner `composed:true` en cualquier evento propio que emita el host
   para señalizar un contrato de NAC3 (`nac:action:succeeded`,
   `nac:field:changed`, etc.).
3. Evitar `<slot>` para los elementos que necesitan quedar aislados en
   el shadow: los nodos puestos en un slot viven en el light DOM y se
   resuelven ahí.

Para las raíces shadow abiertas no hace falta ninguna pista en el
manifiesto ni activar nada en el runtime; la resolución es automática.

#### Implementación de referencia

El runtime de referencia expone dos ayudantes internos,
`_deepQuery(selector, root)` y `_deepQueryAll(selector, root)`, que
hacen el recorrido. Los ayudantes públicos `NAC.click`, `NAC.fill`,
`NAC.invoke`, `NAC.describe`, etc., pasan todos por las variantes
profundas.

#### Demos y pruebas

- `example-v23-shadow-open.php` -- demos de shadow abierto anidado a 1,
  2 y 3 niveles.
- `runtime/test/v23-shadow.mjs` T1-T3, T10 -- cobertura unitaria,
  incluido el límite de profundidad.

### 5.1.6 Resolución en shadow DOM -- raíces cerradas, exposición voluntaria (v2.3)

Las raíces shadow cerradas (`attachShadow({mode:'closed'})`) son
opacas desde afuera del código de quien escribió el componente: es un
límite de seguridad del navegador, no una decisión de NAC3. NAC3 no
puede llegar adentro salvo que quien escribió el componente exponga
voluntariamente una superficie consultable mediante el contrato de
abajo.

#### El contrato de interfaz `el.nac3`

Un elemento personalizado PUEDE exponer un objeto de interfaz en su
anfitrión, mediante un getter llamado `nac3`:

```ts
interface NAC3HostInterface {
  query(selector: string): Element | null;        // MANDATORY
  queryAll(selector: string): Element[];          // RECOMMENDED
  describe?(): Array<{                            // OPTIONAL
    id:    string;
    role:  string;
    action?: string;
    label?: string;
  }>;
}
```

Los componentes se suman implementando el getter. Los componentes que
NO se suman quedan inaccesibles para los llamadores de NAC3 (sus
internals siguen privados, como el navegador pretende).

#### Semántica de la resolución

Durante `_deepQuery(selector)`, para cada elemento visitado `el` con
`el.shadowRoot === null`:

1. Si `typeof el.nac3 === 'object'` y `el.nac3.query` es una función,
   el runtime llama a `el.nac3.query(selector)`:
   - El valor devuelto es un Element -> resuelto.
   - El valor devuelto es `null` -> no hay coincidencia en este shadow.
   - El valor devuelto es cualquier otra cosa -> se emite
     `nac:shadow_protocol_violation` (una vez por anfitrión) y se
     saltea.
   - Lanza una excepción -> se emite `nac:shadow_blocked` (motivo
     `'exposure_threw'`, una vez por anfitrión) y se saltea.
2. Si no, y `el.hasAttribute('data-nac-shadow') === true` y el valor
   del atributo es `'closed'` Y no hay ninguna interfaz `nac3`
   presente, el runtime emite `nac:shadow_blocked` (motivo
   `'not_exposed'`, una vez por anfitrión). Es la forma en que quien
   escribe el componente se suma a la señal de depuración "soy un
   componente deliberadamente cerrado".
3. Si no: el elemento se trata como un elemento normal del light DOM,
   sin raíz shadow.

#### Forma del detalle de los eventos de error

Detalle de `nac:shadow_blocked`:

```ts
{
  host:   Element,     // the closed-shadow host
  reason: 'exposure_threw' | 'not_exposed',
  ts:     number       // Date.now()
}
```

Detalle de `nac:shadow_protocol_violation`:

```ts
{
  host:           Element,
  message:        string,            // diagnostic message
  value_snapshot: string,            // truncated value preview
  ts:             number
}
```

Los dos eventos burbujean (`bubbles: true`) y cruzan los bordes del
shadow (`composed: true`). La deduplicación es por anfitrión, mediante
un WeakSet que mantiene el runtime; un mismo anfitrión emite cada
evento **a lo sumo una vez por carga de página**.

#### Por qué es voluntario

La opacidad del shadow cerrado la impone el navegador. Incluso si NAC3
definiera un mecanismo no voluntario, el navegador lo impediría. La
exposición voluntaria le deja a quien escribe el componente el control
completo de cómo se ve su superficie pública para los agentes.

El costo es que cada componente tiene que sumarse; el beneficio es que
los agentes conformes con NAC3 funcionan contra sistemas de diseño con
componentes de shadow cerrado (Salesforce Lightning, algunos
componentes de GitHub Primer, widgets sensibles por seguridad) sin
código adaptador por componente.

#### Demos y pruebas

- `example-v23-shadow-closed.php` -- el caso positivo
  (`<todo-card-closed-exposed>`) y el negativo
  (`<todo-card-closed-blind>`) uno al lado del otro, con paneles de
  veredicto + registro de eventos en vivo.
- `runtime/test/v23-shadow.mjs` T4-T9 -- cobertura unitaria de cada
  familia de eventos de error, más la semántica de deduplicación.
- `guides/SHADOW_DOM_CLOSED.md` -- guía para quien escribe componentes.

### 5.1.7 Capacidades con conciencia de autorización (v2.3)

NAC3 v2.3 permite que el manifiesto declare, por acción, qué
capacidades hacen falta, y con eso frena `NAC.click` y `NAC.invoke`
antes de despachar. El agente recibe un rechazo rápido
(`code='capability_required'`) en lugar de una ida y vuelta que falla
del lado del servidor.

#### Declaración en el manifiesto

Una exigencia de capacidad se adosa a nivel del elemento o a nivel del
verbo. Si están las dos, gana la del verbo.

```js
NAC.register({
  plugin_slug: 'fin',
  version:     '1.0.0',
  nac_version: '2.3',
  elements: [
    // Element-level (covers all verbs on this id).
    { id: 'fin.invoice.delete', role: 'action',
      requires_capability: 'finance.delete_invoice',
      actions: [{ verb: 'delete' }] },

    // Verb-level (more granular).
    { id: 'fin.invoice.edit', role: 'action',
      actions: [
        { verb: 'edit',
          requires_capability: 'finance.edit_invoice' },
        { verb: 'view',
          /* no capability -> always allowed */ }
      ] },

    // Array value: OR semantics.
    // ("at least one of these capabilities matches")
    { id: 'fin.invoice.approve', role: 'action',
      requires_capability: ['finance.approve',
                            'finance.admin'],
      actions: [{ verb: 'approve' }] }
  ]
});
```

Para una semántica de Y lógico ("el usuario necesita TODAS estas
capacidades"), declará cada una mediante acciones frenadas por separado,
o componé del lado del host en la escucha de `nac:action:requested`.

#### API pública

```ts
NAC.setCapabilities(caps: string | string[] | null): void
NAC.grantCapability(cap: string): void
NAC.revokeCapability(cap: string): void
NAC.userCapabilities(): string[]
```

`setCapabilities` reemplaza el conjunto completo (usalo para el inicio
de sesión o la renovación de sesión). `grantCapability` /
`revokeCapability` son incrementales. `userCapabilities` devuelve un
arreglo con una foto del estado. `setCapabilities(null)` vacía el
conjunto.

Los hosts llaman a esto cada vez que cambia el rol del usuario. El
conjunto vive en el runtime; no hace falta recargar ningún manifiesto.

#### Semántica del freno

Antes de despachar, `NAC.click(id)` y `NAC.invoke(id, payload)` buscan
la entrada del manifiesto que corresponde (elemento + verbo), leen
`requires_capability` y llaman a `_hasCapability`:

- No hay exigencia declarada -> se permite.
- Hay exigencia declarada y el conjunto actual la satisface -> se
  permite.
- Hay exigencia declarada y el conjunto actual NO la satisface -> se
  rechaza con `NacError('capability_required', ...)` Y se emite
  `nac:command:rejected` con `detail.reason='capability_required'`.

El freno corre DESPUÉS de las comprobaciones de `not_found` /
`disabled` / `hidden` en `click`, para que aflore la falla más
específica. En `invoke`, el freno corre antes de que se dispare el
evento de pedido (el host nunca ve un intento no autorizado).

#### Por qué esto importa

Sin el freno, un agente que llama a `NAC.click('finance.delete')` o
tiene éxito (no hay ningún freno de autorización -> agujero de
seguridad) o falla del lado del servidor con un 403 varios segundos
después. Con el freno, el agente se entera de manera síncrona de que le
falta la capacidad y puede reaccionar como corresponde (pedir otro
flujo, pedir una elevación de permisos, mostrarle la restricción al
usuario).

Esto complementa -- no reemplaza -- la autorización del lado del
servidor. Los hosts DEBEN seguir haciendo valer los permisos en el
servidor. El freno del cliente es una optimización de experiencia y una
señal a nivel de intención, no un límite de seguridad.

#### Demos y pruebas

- `runtime/test/v23-capabilities.mjs` -- 17 aserciones que cubren
  consultar y fijar, otorgar y revocar, el freno del clic, el freno del
  invoke, la resolución entre nivel de verbo y nivel de elemento, la
  semántica de O lógico, el vaciado con null, el rechazo de entradas
  inválidas, y la regresión de las acciones sin freno.

### 5.1.2 Bandera de validación estricta (v2.2; valor por omisión invertido en v2.3)

`NAC.STRICT_VALIDATION` (booleana). Cuando está en `true`,
`NAC.register()` lanza un `Error` con `code='strict_validation'` y un
arreglo `findings` ante cualquiera de estos casos:

- `manifest_role_unknown` -- el rol de la entrada está fuera del
  conjunto canónico.
- `tab_id_manifest_role_drift` -- el id coincide con `^tab\.` pero el
  rol no es `'tab'`.
- `manifest_dom_role_mismatch` -- el `data-nac-role` del elemento del
  DOM montado difiere del rol de la entrada del manifiesto.

**Valor por omisión:**

- **v2.2.x:** `false` (sólo avisa). Quienes adoptaban necesitaban una
  ventana de migración.
- **v2.3.x:** **`true`** (lanza). La ventana de migración se cerró con
  la línea v2.2. Quienes adoptan con manifiestos cargados de
  desviaciones se bajan poniendo `NAC.STRICT_VALIDATION = false` ANTES
  de cualquier llamada a `register()`.
- **v3.0:** la bandera se quita (estricto es el único modo).

Mirá `guides/MIGRATION_v2.2_to_v2.3.md` para el libreto de cómo limpiar
los hallazgos de desviación.

Todos los métodos asíncronos rechazan con un `NacError` cuyo `code` es
uno de éstos:

- `not_found` -- el elemento, rol o verbo nombrado no está en el DOM.
- `invalid` -- la forma del argumento está mal.
- `disabled` -- el elemento tiene `disabled` o `aria-disabled='true'`
  (sólo `NAC.click`; `NAC.invoke` ya no lo comprueba desde el parche de
  v2.3, ver la sección 5.1.4).
- `hidden` -- el elemento está fuera de la pantalla, o con
  `aria-hidden='true'`, o de dimensión cero.
- `capability_required` -- el manifiesto declaró
  `requires_capability` y el conjunto actual de
  `NAC.userCapabilities()` no lo satisface (v2.3, ver la sección
  5.1.7).
- `timeout` -- el efecto se despachó pero el evento de acuse de
  conformidad no llegó en 5 segundos (30 segundos para `invoke`). **Un
  vencimiento significa una falla real**: el manejador puede haberse
  colgado, el acuse puede no haberse conectado nunca, puede haber
  habido una carrera de red. Quien llama DEBE tratar el vencimiento
  como una falla, salvo que tenga prueba del efecto por otro canal.

### 5.2 Introspección

```ts
NAC.describe():    { active: string|null, plugins: PluginSnap[] }
NAC.describe_v2(): { v2_scope_entries: [...], sitemap: ..., data_tables: [...] }
NAC.manifest(plugin_slug: string): Manifest|null
NAC.validate_global(opts?: {probe?: boolean}): GlobalReport   // named buckets, see 10.1
```

### 5.3 Tablas de datos (desde 2.1)

Las primitivas de tabla de datos NO son parte del runtime central
(`js/nac.js` / el `nac.mjs` de `@nac3/runtime`). Vienen en el módulo de
extensiones para brownfield `js/nac-v2-extensions.js` (publicado como
`@nac3/runtime/extensions`), que las engancha al mismo objeto
`window.NAC` después de cargarse. Cargá el módulo de extensiones
después del runtime central para tener la superficie `dt_*`:

```html
<script src="https://yujin.app/nac-spec/js/nac.js"></script>
<script src="https://yujin.app/nac-spec/js/nac-v2-extensions.js"></script>
```

```js
// or with the npm package:
import '@nac3/runtime';
import '@nac3/runtime/extensions';
```

Los métodos de abajo sólo están presentes cuando el módulo de
extensiones está cargado; llamarlos sobre un runtime que sólo tiene el
núcleo no hace nada / devuelve `undefined`.

```ts
NAC.registerDataTable(spec: DataTableSpec): string   // returns table_id
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

- `collection` -- filas ordenadas, con confirmación transaccional
  opcional. Se usa para las líneas de una factura, los ítems de un
  carrito, las entradas de un registro.
- `matrix` -- una grilla de fila x columna donde cada celda lleva un
  valor. Se usa para matrices de permisos, grillas de horarios.
- `matrix-singletree` -- una matriz donde cada fila se colapsa en un
  árbol (poco frecuente).

---

### 5.4 Resolución estricta + desambiguación (v2.4)

NAC3 v2.4 vuelve **estricta** la resolución de id, verbo, calificador y
etiqueta. Los verbos que resuelven un pedido a un único elemento del
DOM -- `click_by_verb`, `tab` (en su forma de un solo argumento) y
`tab_by_label` -- ya no adivinan. Cuando un pedido resuelve a cero
candidatos o a más de uno, el runtime lanza un `NacError` que lleva la
lista de candidatos Y emite un evento `nac:disambiguation_requested`,
en lugar de despachar en silencio al primer parecido.

Éste es el invariante de **cero daño silencioso**. Existe para el
software de asistencia y para los agentes, donde un despacho silencioso
al elemento equivocado sin camino de recuperación es un bloqueante de
seguridad. El comportamiento indulgente de antes de 2.4 -- una
alternativa con `indexOf` por subcadena que resolvía al primer parecido
-- queda eliminado.

> Compatibilidad hacia atrás: v2.4 es un cambio en el
> *comportamiento del contrato*. Los caminos de código que ya pasaban
> argumentos sin ambigüedad siguen funcionando igual. Los caminos de
> código que dependían de la alternativa indulgente con `indexOf` para
> resolver al primer parecido ahora van a lanzar una excepción: está
> hecho a propósito.

#### 5.4.1 Coincidencia estricta de calificador (`click_by_verb`)

`click_by_verb(plugin, verb, opts?)` elige entre los nodos del DOM que
comparten `data-nac-action="<verb>"`. Cuando se pasa `opts.qualifier`
(una cadena), un elemento coincide **sólo** si su `data-nac-id`
satisface:

```js
id === qualifier || id.endsWith('__' + qualifier)
```

O sea: igualdad exacta del id, o un sufijo anclado después de un
separador `__`. **No hay alternativa por subcadena**. Un calificador
que es apenas una subcadena de un id (no igual, no un `__suffix`
anclado) NO coincide.

- 0 coincidencias -> lanza `NacError('no_matching_instance', ...)`.
- exactamente 1 coincidencia -> resuelve y hace clic.
- >1 coincidencias -> lanza `NacError('ambiguous_qualifier', ...)`.

`opts.qualifier_ordinal` (un número) elige por posición entre todos los
elementos del DOM que comparten el verbo, sin pasar por la coincidencia
de calificador.

#### 5.4.2 Resolución estricta de id (`tab`)

Forma de un solo argumento de `tab(plugin, id)`: gana una coincidencia
exacta de `data-nac-id` en el DOM. Si no, el runtime busca las
instancias cuyo id empiece con `id + "__"`:

- 0 instancias calificadas y ningún id exacto -> `no_matching_instance`.
- exactamente 1 -> resuelve.
- >1 -> `ambiguous_tab` (pasá el id calificado completo).

#### 5.4.3 Resolución estricta por etiqueta (`tab_by_label`)

`tab_by_label(plugin, label)` resuelve una etiqueta legible por una
persona a una pestaña, probando, en este orden: coincidencia exacta con
la etiqueta del manifiesto, coincidencia difusa o por subcadena en el
manifiesto, coincidencia exacta con el texto del DOM, coincidencia
difusa con el texto del DOM. Si cualquiera de esos niveles da más de
una coincidencia, lanza `NacError('ambiguous_label', ...)`; si ningún
nivel coincide, lanza `NacError('not_found', ...)`. El campo `reason`
del evento emitido registra cuál fue el nivel ambiguo
(`ambiguous_label_exact`, `ambiguous_label_fuzzy`,
`ambiguous_label_exact_dom`, `ambiguous_label_fuzzy_dom` o
`no_matching_label`).

#### 5.4.4 Códigos de error

| `err.code` | Lo lanza | Significado |
|------------|-----------|---------|
| `no_matching_instance` | `click_by_verb` (calificador), `tab` | ningún elemento coincide con el calificador / id |
| `ambiguous_qualifier`  | `click_by_verb` | más de 1 elemento coincide con el calificador |
| `ambiguous_tab`        | `tab`           | más de 1 instancia calificada `id__` coincide |
| `ambiguous_label`      | `tab_by_label`  | más de 1 pestaña coincide con la etiqueta (en cualquier nivel) |
| `not_found`            | `tab_by_label`  | ninguna pestaña coincide con la etiqueta |

#### 5.4.5 La forma de `err.candidates`

Todo error de desambiguación lleva un arreglo `candidates`. Cada
candidato es exactamente:

```ts
{ nac_id: string, label: string }
```

`nac_id` es el `data-nac-id` del elemento. `label` se resuelve
prefiriendo `aria-label`, después el `textContent` recortado (cortado a
120 caracteres), y si no, cayendo en el `data-nac-id`. La lista está
validada contra el DOM: nombra los elementos reales entre los que puede
elegir quien llama. `NacError` fusiona `candidates` dentro del `Error`
lanzado, así que `err.code`, `err.message` y `err.candidates` quedan
los tres cargados.

#### 5.4.6 El evento `nac:disambiguation_requested`

Cada vez que una llamada de resolución estricta falla (ninguna
coincidencia O demasiadas), el runtime despacha un `CustomEvent`
`nac:disambiguation_requested` sobre `document` *además de* lanzar la
excepción. La emisión es de mejor esfuerzo: si el despacho falla, el
runtime lanza igual.

```ts
document.addEventListener('nac:disambiguation_requested', (e) => {
  e.detail; /* {
    method:     'click_by_verb' | 'tab' | 'tab_by_label',
    plugin:     string | null,
    query:      { verb?, qualifier?, label?, id? },
    reason:     string,   // finer-grained than err.code (see 5.4.3)
    candidates: Array<{ nac_id: string, label: string }>,
  } */
});
```

#### 5.4.7 Cómo desambigua quien llama

Con la lista de candidatos en mano (de `err.candidates` o de
`event.detail.candidates`), quien llama elige uno y vuelve a despachar
por cualquiera de estas vías:

1. **El `nac_id` completo** -- `NAC.click(candidate.nac_id)`. Éste es
   el camino canónico de recuperación: el candidato ya lleva el id
   exacto.
2. **El `__suffix` anclado** -- pasale a `click_by_verb` el sufijo
   exacto de la instancia como calificador.
3. **`opts.qualifier_ordinal`** -- selección por posición entre los
   elementos que comparten el verbo (en orden del DOM).

La referencia trabajada es `example-v24-disambiguation.php`; el
contrato está cubierto por `runtime/test/stage2-disambiguation.mjs` y
`runtime/test/stage7-strict-resolution.mjs`.

---

## 6. Eventos

Toda acción emite un evento de finalización determinista. El
`NAC.click()` del runtime consulta ese evento y resuelve cuando se
dispara.

| Rol | Evento de éxito | Evento de falla |
|------|---------------|---------------|
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

### 6.1 Forma del detalle del evento

El detalle de todo evento lleva el campo canónico de id, más `plugin`:

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

### 6.2 Emitir desde un manejador del host

Un manejador de clic DEBE emitir el evento de éxito correspondiente
después de su efecto síncrono:

```js
button.addEventListener('click', function (ev) {
  // ... do the work ...
  document.dispatchEvent(new CustomEvent('nac:action:succeeded', {
    detail: { plugin: 'invoice', action_id: 'invoice.save' }
  }));
});
```

Si el trabajo es asíncrono, emitir después de que resuelva. Si el
trabajo falla, emitir `nac:action:failed` con `{detail: {plugin,
action_id, error: <message>}}`.

El runtime v2.2 va a proveer `NAC.bindAction(el, handler, ctx)`, que
envuelve a `addEventListener` y emite de manera automática.

### 6.3 ¿Por qué no usar el propio evento de clic?

Un evento `click` del DOM se dispara antes de que corra el manejador.
El contrato de NAC3 necesita saber cuándo **terminó el efecto**, no
cuándo empezó el clic. De ahí la familia de eventos aparte.

---

## 7. Procedencia

### 7.1 isTrusted

`event.isTrusted` vale `true` para los clics que inicia una persona
(mouse real, tecla real, activación desde un lector de pantalla) y
`false` para los clics sintetizados (`element.click()`, el
dispatchEvent de un MouseEvent construido a mano, automatización).

NAC3 DEBE exponer esto en `event.detail.is_trusted` dentro del evento
de éxito. Los hosts que ejecutan acciones sensibles por seguridad
(pagos, borrados) PUEDEN exigir `is_trusted === true` y rechazar los
clics sintéticos. La demo de referencia `example-v20-full.php` incluye
un par de botones (`v20_panel.istrusted_real` y
`v20_panel.istrusted_fake`) que demuestra la distinción.

### 7.2 Manifiestos firmados con HMAC

Un manifiesto PUEDE llevar un bloque `provenance`:

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

El runtime calcula el HMAC esperado sobre una serialización estable del
manifiesto (excluyendo la propia firma) y rechaza los manifiestos cuya
firma no coincide. Lo usan los despliegues multiinquilino para evitar
que un inquilino falsifique el manifiesto de otro.

### 7.3 Modelo de amenazas

Mirá `SECURITY.md` para el modelo de amenazas completo. La versión
corta:

- NAC3 no autentica al **usuario**. Ése es el trabajo de tu capa de
  autenticación.
- NAC3 autentica el **manifiesto** (HMAC).
- NAC3 distingue los clics reales de los sintetizados (isTrusted),
  así un host puede rechazar los segundos para los verbos sensibles.
- NAC3 no protege contra un agente malicioso que corre con el acceso
  del usuario. Ese agente puede hacer todo lo que puede hacer el
  usuario.

---

## 8. Niveles de conformidad

Un nivel se escribe **NAC3 Conformance Level 1**, **2** o **3**. El
nombre de un nivel no es el nombre del protocolo: un validador, un
reporte o una afirmación de conformidad DEBE citar un nivel por el
identificador `nac3-conformance-level-<1|2|3>` publicado en
`api/latest/levels.json`, nunca por un nombre para mostrar. La sección
8.1 registra los nombres que estos niveles llevaban antes de 2.5.0.

Una página está en **NAC3 Conformance Level 1** si:

- Todo widget clicable que un agente debería poder operar lleva
  `data-nac-id` y `data-nac-role`.
- Todo elemento con `data-nac-role="action"` dispara
  `nac:action:succeeded` después de su efecto.
- La página registra al menos un manifiesto de plugin mediante
  `NAC.register()`.
- `NAC.click(id)` funciona para cada id anunciado.

Una página está en **NAC3 Conformance Level 2** si además:

- Registra los arreglos `tabs[]`, `fields[]`, `actions[]` de manera
  explícita en su manifiesto (no inferidos del DOM).
- Provee `label_i18n` cubriendo las 10 locales de NAC3 para cada
  etiqueta que ve el usuario.
- Implementa las primitivas brownfield de v2.0: árbol de alcance,
  captura efímera, autoRegister.watch.
- Pasa `NAC.validate_global({probe: false})` con cero hallazgos de
  severidad `error`.

Una página está en **NAC3 Conformance Level 3** si además:

- Lleva manifiestos firmados con HMAC.
- Distingue `isTrusted` para los verbos sensibles por seguridad.
- Pasa `NAC.validate_global({probe: true})` con cero hallazgos.

La línea de comandos del paquete NPM (`npx nac3 validate <url>`)
reporta el nivel más alto que alcanza una página. (El paquete publica
los binarios `nac3` y `nac`; los dos resuelven a la misma línea de
comandos.)

### 8.1 Nombres históricos de los niveles (v2.5)

Antes de 2.5.0 los tres niveles se escribían `NAC-1`, `NAC-2` y
`NAC-3`. Esos nombres están a un guión de distancia del nombre del
protocolo, `NAC3`, así que "esta página es conforme a NAC-3" no se
podía distinguir de "esta página implementa NAC3", y un agente al que
le pedían reportar un nivel no tenía ninguna cadena sin ambigüedad para
reportar.

Los nombres viejos quedan legibles como alias históricos:
`api/latest/levels.json` publica cada uno como `legacy_display_name`
al lado del nivel al que pertenecía, así un documento escrito antes de
2.5.0 todavía se puede mapear a un nivel. NO son normativos. El texto
nuevo, la salida de los validadores y las afirmaciones de conformidad
usan el número de nivel o el identificador publicado.

---

## 9. Versionado

NAC3 sigue semver:

- Salto **mayor**: cambio incompatible en la API pública o en los
  formatos de cable. Quienes adoptan tienen que editar código.
- Salto **menor**: funcionalidad nueva, compatible hacia atrás. El
  código viejo sigue funcionando.
- Salto de **parche**: corrección de defectos, cambios sólo de
  documentación.

Política de obsolescencia: una funcionalidad marcada `@deprecated` en
la versión `X.Y.0` no se quita antes de `(X+1).0.0`. Las notas de cada
versión documentan toda remoción de manera explícita.

La versión del paquete NPM espeja la versión de la especificación:
`@nac3/runtime@X.Y.Z` implementa NAC3 vX.Y, con Z revisiones de parche
encima. El ejemplo está escrito con marcadores a propósito: una versión
concreta en esta frase queda vieja en la versión siguiente, y este
documento llevaba `2.1.3` mucho después de que el paquete hubiera
avanzado.

### 9.1 Preversiones y etiquetas de distribución

Una versión con cola de preversión (`-alpha.N`, `-beta.N`, `-rc.N`)
**no** es una versión publicada de esta especificación. Existe para
que un cambio se pueda ejercitar antes de prometerlo.

- **`latest` apunta siempre y únicamente a una versión estable.** Un
  `npm install @nac3/runtime` sin etiqueta DEBE resolver a una versión
  sin cola de preversión. Quien adopta e instala lo que viene por
  omisión nunca recibe una preversión por accidente.
- **Las preversiones se publican bajo su propia etiqueta de
  distribución** (`alpha`, `beta`, `rc`). Sumarse es explícito: `npm
  install @nac3/runtime@alpha`.
- **Nada de lo que hay en una preversión es una promesa.** Cualquier
  superficie que aparezca en una puede cambiar o desaparecer antes de
  la versión estable que la lleve. Las garantías de estabilidad de la
  sección 10 y las garantías de códigos de hallazgo de la sección 12
  empiezan en la versión estable.
- **Las preversiones nunca se despublican** y nunca se re-etiquetan
  como `latest` de manera retroactiva. El registro de lo que se
  publicó queda legible.

La versión autoritativa del runtime de referencia es la constante
`NAC.version` de `js/nac.js`, y se publica como dato: `api/latest.json`
lleva un puntero `stable` y otro `prerelease` por separado (cualquiera
de los dos puede ser `null`), y todo artefacto publicado lleva su
propio campo `channel`. Un consumidor que necesita un contrato estable
lee un campo y rechaza, sin ninguna cadena de versión que parsear ni
ninguna etiqueta en la que confiar.

---

## 10. Validadores

### 10.1 Runtime: `NAC.validate_global()`

Recorre el DOM vivo + los manifiestos registrados y devuelve un
**objeto de canastos con nombre**: un canasto por condición, cada uno
un arreglo de hallazgos. Desde 2.5.0 cada hallazgo de cada canasto
lleva `code` y `severity`, así que una integración de CI puede frenar
por un código sin tener que parsear un mensaje:

```ts
{
  ok:         boolean,       // false when any error-severity finding exists
  has_errors: boolean,
  duplicates: [{ code: 'nac_id_duplicate_across_plugins',
                 severity: 'error', nac_id, plugins: string[] }],
  orphans:    [{ code: 'nac_id_orphan_in_dom',
                 severity: 'warn', nac_id, in_dom, in_manifest,
                 plugin_root }],
  unmounted:  [{ code: 'nac_id_declared_not_mounted',
                 severity: 'warn', nac_id, in_manifest, in_dom,
                 plugin }],
  convention_violations:
              [{ code: 'nac_id_missing_plugin_prefix',
                 severity: 'warn', nac_id, plugin, hint }],
  plugin_instance_violations:
              [{ code: 'duplicate_plugin_no_instance_id',
                 severity: 'error', slug, instance_count, ... }],
  tolerated:  [{ kind, nac_id, until, original }],
  plugin_count: number,
  total_ids:    number,
  timestamp:    number
}
```

Los cinco códigos, su severidad y qué hacer con cada uno se publican
como dato en `api/latest/findings.json`, bajo `global_buckets`. Los
códigos de hallazgo son estables entre versiones de parche; códigos
nuevos sólo en saltos menores, y un código nunca se reutiliza para otra
condición (sección 12, promesa 4).

**Las versiones anteriores a 2.5.0 no adosaban ningún código a estos
canastos**, y esta sección describía un arreglo plano de hallazgos que
el runtime de referencia nunca devolvió (auditoría N-14, N-34).

**Cambio de comportamiento en 2.5.0 (auditoría N-33).** Antes de 2.5.0
el recolector que está detrás de este validador leía únicamente los
grupos heredados del manifiesto (`actions`, `fields`, `tabs`, `kpis`,
`charts`, con clave `nac_id`) y nunca la forma canónica
`elements: [{ id }]` de la sección 4. Contra un manifiesto escrito de
la manera documentada, por lo tanto, reportaba `total_ids: 0`, listaba
cada elemento declarado como huérfano, no podía reportar un duplicado,
un id no montado ni una violación de convención en absoluto, y aun así
contestaba `ok: true`. De 2.5.0 en adelante lee las dos formas. Un host
que frenaba su CI con `has_errors` puede ver su primera falla después
de actualizar: eso es un verdadero positivo que siempre estuvo ahí, no
una regla nueva.

### 10.2 Línea de comandos: `npx nac3 validate <target>`

Envuelve a `validate_global` más un lint estático de coherencia entre
el HTML y el manifiesto. Códigos de salida:

- `0` -- ningún hallazgo de severidad >= al umbral configurado.
- `1` -- hay hallazgos.
- `2` -- el propio destino no se pudo cargar.

Útil en CI: `npx nac3 validate ./dist/index.html --severity=error`. El
paquete expone la línea de comandos bajo dos nombres de binario,
`nac3` y `nac`; usá el que no choque con otra herramienta de tu PATH.

---

## 11. El sistema alrededor de NAC3

NAC3 es una capa de contrato. Para convertir una página conforme a NAC3
en una aplicación manejada por voz, hace falta además:

1. **Una fuente de voz a texto** (el SpeechRecognition del navegador,
   la API de Whisper, etc).
2. **Un intermediario LLM** que toma el texto del usuario + la foto que
   da `NAC.describe()` de la página + una pista de i18n y emite
   acciones estructuradas: `[{kind: 'click', nac_id: 'X'}, {kind:
   'fill', nac_id: 'Y', value: 'Z'}]`. Ver `guides/LLM_WIRING.md`.
3. **Un cliente de chat** que sostiene la conversación y despacha las
   acciones. La referencia es `js/nac-chat-client.js`.
4. **Un destino de texto a voz** para las respuestas habladas (el
   SpeechSynthesis del navegador, ElevenLabs, etc).

NAC3 estandariza únicamente la forma de entrada y salida del paso 2 (la
foto de `NAC.describe()` + la forma de las acciones). Los pasos 1, 3 y
4 quedan fuera de la especificación; se componen como cada uno quiera.

---

## 12. Garantías de estabilidad

Lo que esta especificación promete:

1. El conjunto de roles canónicos de la sección 1 no se va a encoger.
   PUEDEN agregarse roles nuevos en versiones menores.
2. La familia de eventos de la sección 6 no va a cambiar de nombre.
   PUEDEN agregarse eventos nuevos en versiones menores.
3. Los verbos de `NAC.click`, `NAC.fill`, etc., no van a cambiar de
   forma en versiones menores. PUEDEN aparecer campos opcionales
   nuevos en `opts`.
4. Los códigos de hallazgo de `validate_global` no se van a reutilizar
   para otras condiciones entre versiones menores. Desde 2.5.0 cada
   canasto de ese validador lleva un código, y todos se publican con su
   severidad en `api/latest/findings.json`: comparando dos versiones
   publicadas, un código reutilizado queda visible sin leer ningún
   fuente.

Lo que esta especificación NO promete:

1. La redacción exacta de los mensajes de error (son cadenas del
   catálogo de i18n; las localizaciones pueden moverse).
2. La estrategia de DOM para encontrar los elementos (`querySelector`
   hoy; más adelante puede pasar a un índice más rápido).
3. La disposición interna de la caché de manifiestos. Tratá los
   manifiestos como de sólo escritura del lado del host, y de sólo
   lectura del lado del agente.

---

## 13. Preguntas abiertas

Se registran **acá**, en esta sección. Una revisión anterior la titulaba
"Preguntas abiertas (registradas por separado)" y nunca decía dónde
quedaba ese "por separado"; no había ningún otro registro. Una pregunta
que llega a una decisión se va de la tabla de abajo y entra en la
sección a la que afecta. Una pregunta que se vuelve una propuesta
concreta recibe un RFC, y ésos están indexados en
[`rfcs/README.md`](rfcs/README.md), con el proceso en
[`CONTRIBUTING.md`](CONTRIBUTING.md).

Cada fila lleva la versión en la que se evaluó por última vez, para que
quien lea pueda distinguir una pregunta viva de una abandonada.
**Ninguna fila lleva una versión objetivo**: una promesa con fecha que
pasa su fecha es peor que una sin fecha, que es el error que la sección
5 cometía con `payload_schema`.

| Pregunta | Estado | Última evaluación | Cómo está |
|----------|-------|---------------|-----------------|
| ¿Debería `data-nac-role="navigation"` resolver alguna vez a una pestaña? | **DECIDIDO: no** | v2.5 | Decidido en 2.2.0 y exigido desde entonces: un id con prefijo `tab.` y rol `navigation` levanta `tab_id_manifest_role_drift`, y con `STRICT_VALIDATION` (por omisión `true` desde 2.3.0) `NAC.register` lanza. `tab_by_label` resuelve pestañas únicamente desde `m.tabs[]` y `elements[role=='tab']`. `navigation` es una región de referencia, nunca un panel conmutable. Ver las secciones 1 y 10. |
| ¿Debería `NAC.click()` aceptar ids relativos (por ejemplo `'./save'`)? | **ABIERTA, no implementada** | v2.5 | El resolvedor hace coincidir `data-nac-id` de manera exacta y acota por plugin: el activo, o el de `opts.plugin`. Esa acotación ya cubre el caso que la pregunta pedía (`NAC.click('save', {plugin:'invoice'})`), así que la presión por una sintaxis relativa es baja y no hay nada en curso. Decidirla implicaría agregar una gramática de rutas a la sección 2, donde los ids se declaran opacos para el runtime. |
| ¿Deberían los manifiestos soportar herencia / extensión entre plugins (un manifiesto base extendido por un inquilino)? | **ABIERTA, candidata para la próxima mayor** | v2.5 | No implementada. **No confundir con la sección 15**, el "contrato de extensión de plugin": eso se publicó en v2.5 y es un mecanismo de enrutamiento al backend (`registerPlugin` / `call` / `read` / `subscribe`), no herencia de manifiestos. La pregunta de acá es sobre un manifiesto que derive de otro, lo que toca las reglas de unicidad de id de la sección 2 y es la razón por la que queda reservada para una mayor. |
| ¿Debería formalizarse y activarse la exigencia de `payload_schema`? | **ABIERTA, sin fecha** | v2.5 | Movida acá desde la sección 5, que la prometía para v2.4. No llegó en v2.4 y no llegó hasta v2.5; el runtime de referencia no lee el campo. Ver la sección 5 para saber exactamente qué se valida hoy y qué no. |
| ¿Deberían los hallazgos de `validate_global()` llevar un código del catálogo publicado? | **DECIDIDO: sí, publicado en 2.5.0** | v2.5 | Cada ítem de cada canasto lleva `code` + `severity`, así que la promesa 4 de la sección 12 ahora cubre un conjunto real en lugar de uno vacío. Los cinco códigos se publican bajo `global_buckets` en `api/latest/findings.json`, y el generador los LEE de un caso de prueba que provoca cada canasto, en lugar de escribirlos a mano: la versión anterior escribía `code: null` para un canasto que llevaba código desde 2.5.0 y publicaba las dos afirmaciones en el mismo archivo. Construir ese caso de prueba es además lo que encontró la auditoría N-33: el validador no podía ver un manifiesto escrito en la forma canónica. Ver 10.1. |

---

## 13.5 Gobernanza

Hoy NAC3 está tutelado por Yujin. La especificación, la documentación y
el runtime de referencia se publican todos bajo Apache-2.0. (El runtime
estuvo etiquetado como MIT en la era de dos repositorios anterior a
2.5; se armonizó a Apache-2.0 en todos los artefactos de NAC3 en la
consolidación del 2026-05-23. Ver `LICENSE` y `runtime/LICENSE`.)
Yujin se compromete a mover NAC3 a una fundación neutral (un grupo
comunitario del W3C, la Linux Foundation, o un organismo industrial
equivalente) si la adopción llega a justificar una gobernanza neutral.
Hasta entonces, los cambios de la especificación siguen el proceso de
RFC documentado en `CONTRIBUTING.md`, con un período de comentario
público de al menos 14 días para cualquier cambio que afecte la API
pública o los formatos de cable.

Para quienes adoptan: el licenciamiento uniforme bajo Apache-2.0
garantiza que la especificación y el runtime sobrevivan a cualquier
cambio en la situación societaria de Yujin. Podés bifurcar cualquiera
de los dos, correr cualquiera de los dos y publicar cualquiera de los
dos, hoy y después de que no estemos. Este documento registra el
compromiso para que el camino a esa supervivencia sea explícito y no
implícito.

---

## 14. Implementación de referencia

La implementación canónica es el runtime de referencia que se
distribuye como el paquete NPM `@nac3/runtime`. La fuente normativa de
la versión es la propia constante `NAC.version` del runtime, publicada
como dato en `api/latest.json` (ver la sección 9.1). Esta sección
deliberadamente no vuelve a declarar un número de versión: llevaba
`2.5.0-alpha.5` cuando el paquete ya se había movido, que es la misma
clase de defecto que los ejemplos viejos que se quitaron de las
secciones 5 y 9. Publica:

- `js/nac.js` -- el runtime central: la API pública imperativa + de
  introspección de la sección 5 (click/fill/select/tab,
  click_by_verb/tab_by_label, invoke/utter, edit_field,
  setCapabilities, syncPlugin, request_authority/confirm_action,
  registerPlugin/call/read/subscribe, narrate/context/tree,
  expect/diff, describe, validate_global, ...). Publicado como la
  entrada `main`/`module`/`browser` del paquete (`dist/nac.mjs`).
- `js/nac-v2-extensions.js` -- las primitivas brownfield + de tabla de
  datos que se enganchan al mismo `window.NAC` después de que carga el
  núcleo: árbol de alcance, autoRegister, captura efímera, HMAC,
  atestación de isTrusted, catálogo de i18n (`t`/`locale`), y toda la
  familia `registerDataTable` / `dt_*` de tablas de datos (sección
  5.3). Publicado como `@nac3/runtime/extensions`
  (`dist/nac-v2-extensions.mjs`). El runtime central NO lleva la
  superficie `dt_*`; cargá este módulo para tenerla.
- `js/nac-chat-client.js` -- un cliente de chat de referencia que
  conecta voz + LLM + despachador. Publicado como
  `@nac3/runtime/chat-client`.

El paquete también expone una línea de comandos bajo los nombres de
binario `nac3` y `nac` (`dist/cli.js`, sección 10.2).

Otras implementaciones son bienvenidas (Python para ejecutores de
automatización nativos, Rust para agentes embebidos, etc). La autoridad
es la especificación, no el código JS.

---

## 15. Contrato de extensión de plugin -- superficies de canvas + API (v2.5)

Las secciones 1-14 suponen que la superficie relevante para el agente
es el **DOM**. Todo elemento direccionable tiene un atributo
`data-nac-id`, todo verbo se dispara a través de `el.click()`, toda
lectura de estado sale de `el.getAttribute(...)`. Eso funciona para las
aplicaciones cuyo armazón Y contenido viven en nodos del DOM.

No funciona para las aplicaciones donde parte de la superficie es
**canvas** (LibreOffice / Collabora Online, Figma, Excalidraw, Miro,
cualquier editor WebGL propio). El armazón puede seguir siendo DOM
(barras de herramientas, diálogos), pero los comandos a menudo
necesitan pasar por la propia API pública de la aplicación
(postMessage, el SDK de plugins, un puente de scripting), y el estado
puede no ser legible desde el DOM en absoluto.

v2.5 agrega un conjunto chico de primitivas que le permiten a un plugin
de NAC3 declarar su propio contrato de enrutamiento hacia esas
superficies. El runtime se mantiene agnóstico de cualquier aplicación
en particular: aprende a hablar con una únicamente leyendo el
manifiesto del plugin.

### 15.1 Por qué un conjunto nuevo de primitivas

El `NAC.click(id)` que sólo sabe de DOM no puede:

- Mandar un postMessage `Send_UNO_Command` a un iframe de Collabora en
  un sandbox.
- Llamar a `figma.currentPage.selection = [...]` dentro del sandbox de
  plugins de Figma.
- Invocar `excalidrawAPI.setElements(...)` sobre una ref de React.
- Leer si Negrita está activa en la selección actual de Collabora (la
  barra de herramientas lo refleja; el canvas lo esconde).

El arreglo **no** es extender `NAC.click` con heurísticas de detección
de backend. El arreglo es agregar un verbo explícito y agnóstico que
tome un slug de plugin y una ruta de verbo, y que deje que el
manifiesto del plugin declare cómo se enruta ese verbo.

### 15.2 Las tres primitivas

```ts
NAC.registerPlugin(slug: string, manifest: PluginManifest): void
NAC.call(plugin: string, verb_path: string, args?: object): Promise<any>
NAC.read(plugin: string, state_path: string): Promise<any>
NAC.subscribe(plugin: string, event_path: string,
              cb: (data: any) => void): SubscriptionHandle
NAC.unsubscribe(handle: SubscriptionHandle): void
```

- `registerPlugin(slug, manifest)` registra un plugin v2.5. Un mismo
  `slug` PUEDE aparecer tanto en el registro de manifiestos del DOM
  (sección 5) como en el registro de extensiones v2.5; los dos
  coexisten. Las llamadas de v2.5 resuelven únicamente por el registro
  v2.5.
- `call` invoca un verbo declarado. El enrutamiento lo elige el
  manifiesto, no el agente. Resuelve con lo que haya devuelto el
  backend (a menudo `undefined` / `{ok: true}`); rechaza con
  `NacError` si el verbo es desconocido, si el backend falla, o si la
  forma de la respuesta es inválida.
- `read` devuelve un valor de estado declarado. El runtime recorre la
  cadena de alternativas del estado en el orden declarado y devuelve la
  primera fuente que resuelve; rechaza sólo cuando fallaron todas las
  fuentes de la cadena.
- `subscribe` adosa una escucha a un evento declarado. Devuelve un
  identificador que quien llama le pasa a `unsubscribe` para limpiar.
  Los eventos PUEDEN estar respaldados por una fuente de eventos real
  aguas arriba o sintetizados por consulta periódica /
  MutationObserver: el manifiesto declara cuál.

Las cuatro funciones son asíncronas (devuelven una Promise) salvo
`unsubscribe`, que es síncrona e idempotente.

### 15.3 Forma del manifiesto de plugin

```ts
interface PluginManifest {
  slug: string;
  verbs:  { [verb_path: string]: VerbBinding };
  state:  { [state_path: string]: StateBinding[] };
  events: { [event_path: string]: EventBinding };
}

interface VerbBinding {
  backend:       BackendKind;
  /* backend-specific fields (see 15.4) */
  [k: string]: any;
}

interface StateBinding {
  backend:       BackendKind;
  /* backend-specific fields (see 15.4) */
  extract?:      string;   /* extractor DSL string (see 15.5) */
  [k: string]: any;
}

interface EventBinding {
  backend:       BackendKind;
  /* backend-specific fields */
  [k: string]: any;
}

type BackendKind =
  | 'postmessage'
  | 'postmessage-listen'
  | 'sdk-call'
  | 'script-bridge'
  | 'dom-mirror'
  | 'same-origin-window'
  | 'synthetic-mutation'
  | 'synthetic-poll';
```

Los manifiestos son JSON puro (sin callbacks de JS). Forge, Sumi y
cualquier herramienta futura los generan como dato; el runtime
interpreta los nombres de backend a partir de un vocabulario fijo.

Los verbos y los eventos tienen **exactamente una** ligadura. El
estado tiene un **arreglo ordenado** de ligaduras: el runtime recorre
la cadena en orden y devuelve la primera fuente que resolvió bien.

### 15.4 Vocabulario de backends

| Tipo | Se usa para | Campos obligatorios |
|------|----------|-----------------|
| `postmessage` | Verbo: postear un mensaje a un iframe vía `postMessage`. | `target` (selector CSS del iframe al que se manda), `message` (la cadena MessageId), `values` (un objeto literal interpolado con los argumentos), `values_from_args` (arreglo opcional de claves de argumento que se reenvían tal cual) |
| `postmessage-listen` | Evento: escuchar un `MessageId` entrante específico en `window.message`. | `source` (selector CSS del iframe por el que se filtra el origen; si se omite, se acepta cualquier origen), `message` (el MessageId a hacer coincidir), `extract` (el DSL de extracción sobre los datos del mensaje) |
| `sdk-call` | Verbo: llamar a una función JS expuesta globalmente (por ejemplo un plugin de Figma, la API de Excalidraw). | `path` (ruta con puntos dentro de `window`, por ejemplo `figma.currentPage.selection`), `mode` (`assign` para fijar la ruta al valor de los argumentos, `invoke` para llamarla como función con el objeto de argumentos) |
| `script-bridge` | Verbo o estado: invocar el puente de scripting de una aplicación (el `CallPythonScript` de Collabora, el puente UNO de LibreOffice, Google Apps Script). | `bridge` (un identificador propio del backend, como `collabora.python`), `script` (identificador del script), `function` (nombre de la función a correr), `args` (objeto literal interpolado con los argumentos de la llamada), `response_match` (para estado: el MessageId de respuesta que hay que esperar), `timeout_ms` (opcional, por omisión 5000) |
| `dom-mirror` | Estado: leer de un elemento del DOM cuyo atributo / clase / texto espeja un estado interno del canvas (por ejemplo un botón de la barra de herramientas que se resalta cuando su formato está activo en la selección actual). | `selector` (selector CSS a consultar), `extract` (el DSL de extracción, ver 15.5) |
| `same-origin-window` | Estado: leer de `iframe.contentWindow.<path>` cuando el iframe es del mismo origen. El runtime detecta el origen cruzado y sigue a la siguiente alternativa. | `target` (selector CSS del iframe), `path` (ruta con puntos dentro de `contentWindow`) |
| `synthetic-mutation` | Evento: sintetizar un evento observando mutaciones del DOM sobre una o más fuentes de estado y volviendo a emitir cuando el valor observado cambia. | `observe` (arreglo de rutas de estado a vigilar; el runtime llama a `read` sobre cada una y las compara entre mutaciones), `throttle_ms` (opcional, por omisión 100) |
| `synthetic-poll` | Evento: sintetizar un evento consultando periódicamente las fuentes de estado. | `observe` (arreglo de rutas de estado), `interval_ms` (por omisión 250) |

Cada backend DEBE estar implementado por el runtime como un
despachador autocontenido
(`dispatch(binding, args, context) -> Promise<value>`). Agregar un tipo
de backend nuevo a la especificación exige saltar la versión de la
especificación; los runtimes que ignoran los backends desconocidos
DEBEN rechazar los manifiestos que los declaran (no saltearlos en
silencio).

### 15.5 Mini-DSL de extracción

Los backends de estado y el backend de evento `postmessage-listen` a
menudo necesitan sacar un campo de un objeto más grande. El runtime
trae un DSL declarativo minúsculo para que los manifiestos sigan
siendo sólo JSON:

| Sintaxis | Significado | Ejemplo de entrada -> salida |
|--------|---------|-------------------------|
| `field.path.to.value` | Recorrido de una ruta con puntos. | `{a:{b:1}}` con `a.b` -> `1` |
| `attribute:NAME` | Sólo DOM: leer `el.getAttribute(NAME)`. | `<i data-x="hi">` con `attribute:data-x` -> `'hi'` |
| `text` | Sólo DOM: leer `el.textContent`. | `<span>hi</span>` con `text` -> `'hi'` |
| `classList.contains:CLASS` | Sólo DOM: `el.classList.contains(CLASS)` -> booleano. | `<button class="active">` con `classList.contains:active` -> `true` |
| `value` | Sólo DOM: leer `el.value`. | `<input value="x">` con `value` -> `'x'` |
| `present` | Sólo DOM: devuelve `true` si el selector resolvió un elemento, y `false` si no. | el selector coincidió -> `true` |

En v2.5 no se admite composición; un extractor es exactamente una de
las filas de arriba. Un manifiesto que necesite una transformación
compleja declara un `script-bridge` en su lugar.

### 15.6 Semántica de la cadena de alternativas de `state`

`state[path]` es un arreglo de ligaduras. `NAC.read(plugin, path)`
recorre el arreglo en orden. Para cada ligadura:

1. El runtime invoca al despachador del backend.
2. Si el despachador resuelve con un valor (incluidos `false`, `0` y
   la cadena vacía, pero NO `undefined`), `read` devuelve ese valor.
3. Si el despachador rechaza, o resuelve con `undefined`, el runtime
   avanza a la ligadura siguiente del arreglo.
4. Si ninguna ligadura produjo un valor, `read` rechaza con
   `NacError('state_unreadable', ...)`, cuyo `err.attempts: [...]`
   lleva una entrada por cada backend intentado, con
   `{backend, reason}`.

Fundamento: la cadena codifica el orden de preferencia de quien
escribió el manifiesto. La fuente más rápida, más barata y más fresca
se declara primero; las alternativas degradan con elegancia. El runtime
nunca elige en silencio una fuente peor primero.

### 15.7 Procedencia de las acciones sintéticas

Cada despacho de `NAC.call` emite un evento `nac:plugin:invoked` sobre
`document` después de que el backend devuelve. La carga del detalle:

```js
{
  plugin:    'collabora.writer',
  verb_path: 'uno.Bold',
  backend:   'postmessage',
  request_id: 'pi_<random hex>',
  source:    'agent',     // see sec 7
  trusted:   false,
  duration_ms: 12,
  ok:        true,
  error:     null,
}
```

La misma forma para `nac:plugin:read` (después de un `read`) y para
`nac:plugin:event` (la re-emisión de un evento sintetizado). `source`
vale `'agent'` por omisión; los hosts que envuelven el runtime en una
interfaz de usuario PUEDEN cambiarlo con el mecanismo que ya existe,
`NAC.set_source(...)` (sección 7).

### 15.8 Ejemplo trabajado -- Collabora Writer

```json
{
  "slug": "collabora.writer",
  "verbs": {
    "uno.Bold": {
      "backend": "postmessage",
      "target":  "iframe[data-collabora-frame]",
      "message": "Send_UNO_Command",
      "values":  { "Command": ".uno:Bold" }
    },
    "doc.save": {
      "backend": "postmessage",
      "target":  "iframe[data-collabora-frame]",
      "message": "Action_Save",
      "values_from_args": ["DontTerminateEdit", "Notify"]
    }
  },
  "state": {
    "selection.isBold": [
      { "backend": "dom-mirror",
        "selector": "[data-nac-id='toolbar.bold']",
        "extract":  "classList.contains:selected" },
      { "backend": "script-bridge",
        "bridge":   "collabora.python",
        "script":   "yujin_state.py",
        "function": "GetSelectionState",
        "response_match": "CallPythonScript-Result",
        "extract":  "Values.is_bold" }
    ],
    "doc.modified": [
      { "backend": "same-origin-window",
        "target":  "iframe[data-collabora-frame]",
        "path":    "app.file.modified" }
    ]
  },
  "events": {
    "doc.modified": {
      "backend": "postmessage-listen",
      "source":  "iframe[data-collabora-frame]",
      "message": "Doc_ModifiedStatus",
      "extract": "Values.Modified"
    },
    "selection.changed": {
      "backend":     "synthetic-mutation",
      "observe":     ["selection.isBold", "selection.isItalic"],
      "throttle_ms": 100
    }
  }
}
```

El agente llama a `NAC.call('collabora.writer', 'uno.Bold')`; el
runtime enruta por el backend `postmessage` y postea
`Send_UNO_Command` al iframe. Para confirmar que el efecto ocurrió
(ver la sección 17), el agente llama a
`await NAC.read('collabora.writer', 'selection.isBold')`; el runtime
prueba primero el espejo de la barra de herramientas (rápido, gratis)
y cae en el puente de scripts de Python si el espejo no está
disponible. El agente nunca sabe ni le importa cuál fuente contestó.

### 15.9 Errores

`NAC.call` / `read` / `subscribe` rechazan con un `NacError` cuyo
`code` es uno de éstos:

- `plugin_not_registered` -- el slug no tiene manifiesto v2.5.
- `verb_not_declared` -- la ruta del verbo no está en el manifiesto.
- `state_not_declared` -- la ruta del estado no está en el manifiesto.
- `event_not_declared` -- la ruta del evento no está en el manifiesto.
- `backend_unknown` -- el manifiesto declara un backend que el runtime
  no implementa. El manifiesto DEBE rechazarse en el momento del
  registro; este error sólo aflora si un runtime acepta un formato de
  manifiesto futuro que después no puede despachar.
- `backend_target_missing` -- el destino del backend (iframe, ruta JS,
  selector del DOM) no se puede encontrar.
- `cross_origin_blocked` -- se intentó un `same-origin-window` contra
  un iframe de origen cruzado.
- `state_unreadable` -- fallaron todas las ligaduras de una cadena de
  estado; ver 15.6.
- `timeout` -- un backend no respondió dentro de su `timeout_ms`
  declarado (por omisión 5000 para los verbos, 1000 para las lecturas
  de estado).
- `invalid` -- la forma del argumento está mal (slug inválido,
  manifiesto mal formado en el momento del registro, etc).

---

## 16. Navegación en árbol (v2.5 -- PUBLICADO en 2.5.0-alpha.5 / RFC V25-02)

Primitivas de navegación jerárquica de comandos, para los flujos de
asistencia y los ejecutores de voz que necesitan describir qué pueden
hacer desde el foco actual.

**Superficie de API:**

- `NAC.context(plugin) -> { breadcrumb: [{nac_id, label}, ...] }`
  Sube desde `document.activeElement` por los elementos ancestros que
  llevan `data-nac-id`, y se detiene en la raíz del plugin. Devuelve
  una ruta de migas vacía si no hay nada con el foco dentro del
  plugin. El `label` de cada miga sale de `narrate` (sección 17).

- `NAC.tree(plugin, rootId?) -> [{nac_id, label, opens?, leaf?}, ...]`
  Enumera los hijos direccionables INMEDIATOS de `rootId` (o de la
  raíz del plugin si se omite). "Inmediato" quiere decir que no hay
  ningún otro elemento con `data-nac-id` entre el punto de partida y
  el hijo. Para cada entrada:
  - `label` resuelto por `narrate`
  - `opens` espeja el atributo `data-nac-opens` cuando está presente
  - `leaf` vale `true` cuando `data-nac-leaf` está presente

**Atributos para quien escribe:**

- `data-nac-opens="<target-nac-id>"`: declara que este nodo abre o
  profundiza hacia el elemento identificado por el id destino. Les
  permite a los agentes seguir la cadena de navegación sin adivinar
  nombres.
- `data-nac-leaf`: marca terminal explícita; los agentes posteriores
  saben que no se puede profundizar más.

**Errores:** `tree` devuelve `[]` para un rootId desconocido (vacío
silencioso, no un error). `context` siempre devuelve
`{ breadcrumb: [] }` para los plugins desconocidos.

---

## 17. Etiquetas de asistencia (v2.5 -- PUBLICADO en 2.5.0-alpha.5 / RFC V25-03)

Resolución canónica de etiquetas legibles por una persona. Una sola
función para los lectores de pantalla, el habla sintetizada, los
flujos de voz, los registros de auditoría y las superficies de
asistencia móviles.

**Superficie de API:**

- `NAC.narrate(plugin, nac_id) -> string | null`
  Devuelve `null` si no se puede encontrar el plugin o el nac_id. Si
  no, la etiqueta que sigue este orden estricto de prioridad:

  1. **`aria-label`** -- la accesibilidad primero; se respeta salvo
     que sea sólo espacios.
  2. **el texto visible** -- el `textContent` del elemento, excluyendo
     cualquier subárbol anidado con `data-nac-id` (ésos tienen su
     propia resolución de narrate; se excluyen para que la salida
     hablada quede acotada).
  3. **`data-nac-label`** -- anulación explícita de quien escribe;
     sirve cuando el texto visible tiene glifos de iconos o claves de
     i18n.
  4. **el `nac_id` como último recurso** -- el peor caso; señala que
     "no se escribió ninguna etiqueta".

  Los valores que son sólo espacios, en cualquier nivel, caen al nivel
  siguiente.

**Validación:** `validate_global()` puede emitir advertencias en el
canasto `plugin_instance_violations` para los nac_id con forma ordinal
(`btn-1`, `btn-2`, ...) a los que les falta cualquiera de las
etiquetas de los niveles superiores.

---

## 18. Detección del efecto (v2.5 -- PUBLICADO en 2.5.0-alpha.5 / RFC V25-04)

Cierra la brecha del "daño silencioso": un agente confirma el EFECTO
de una acción, no apenas que el comando se emitió. Las dos primitivas
se componen con `NAC.read()`, así que funciona cualquier backend de
V25-01 (postmessage, sdk-call, dom-mirror, ...).

**Superficie de API:**

- `NAC.expect(plugin, statePath, value, opts?) -> Promise<value>`
  Consulta `NAC.read(plugin, statePath)` de manera periódica hasta que
  el comparador devuelve algo verdadero o hasta que vence el plazo.
  Resuelve con el valor resuelto; rechaza con
  `NacError('timeout', ...)` cuando vence.

  Las fallas de lectura durante la consulta periódica se reintentan
  hasta que vence el plazo (se tratan como "todavía no observable", no
  como un error duro).

  Opciones:
  - `timeout_ms` (por omisión `5000`)
  - `poll_ms` (por omisión `100`)
  - `comparator` (por omisión `(cur, want) => cur === want`)
    Recibe `(current, expected)` y devuelve un booleano.

- `NAC.diff(plugin, statePath, actionFn) -> Promise<{before, after, changed}>`
  Lee el estado, espera a `actionFn()`, vuelve a leer el estado.
  Devuelve las dos fotos y un booleano `changed` calculado comparando
  con JSON-stringify (así que `undefined` contra un valor también se
  marca como cambiado). Las fallas de lectura se colapsan a
  `undefined`.

**Notas de composición:** `diff` captura únicamente la foto del
PRINCIPIO y la del FINAL; NO observa los estados intermedios de
adentro de la acción. Usá `expect` si lo que te importa es "el estado
pasa por algún valor específico en algún momento".

---

*Este documento es la especificación canónica de NAC3 v2.5. Las
secciones 0-14 están sin cambios respecto de la v2.4 estable. Las
secciones 15-18 se publican en v2.5. Las ediciones de este archivo
constituyen cambios de la especificación y exigen un RFC; ver
`CONTRIBUTING.md`.*
