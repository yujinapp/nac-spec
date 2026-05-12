---
translation_source: docs/CASE_STUDIES_DISCOVERY.md
translation_source_hash: 59b940d486104c6a9b42d59c1ee6f16c25eb01c0c08b8b98458c68ef4312ed77
translation_quality: machine_v1
translation_lang: es
translation_date: 2026-05-11T13:28:49.702779+00:00
---

# Casos de estudio -- bugs descubiertos de forma autónoma

Bugs encontrados por el barrido diagnóstico de Playwright contra
`yujin.app/nac-spec/demos/react/` y `/demos/angular/`. Pablo
me pidió el 2026-05-11 descubrir + documentar + corregir sin que
él nombrara los síntomas. Este archivo registra el proceso de
descubrimiento + las correcciones.

---

## Bug #1 (ALTO) -- El intermediario LLM no ve el manifiesto de la app

**Demos afectados:** React + Angular.

**Síntoma (observable):** Cuando el usuario escribe "hola" en el
panel de chat del demo de React o Angular, el chat responde con un
genérico "How can I help you with this page?" -- sin saber que
esta es una app de todos. Cuando el usuario dice "agrega tomar agua",
el LLM no puede despachar `click_by_verb('todos', 'add_todo')` porque
no sabe que ese plugin existe.

**Método de descubrimiento.** El spec diagnóstico captura cada
mensaje de `page.console` durante la interacción con el chat. El
cliente de chat registra:

```
[nac-chat] snapshot plugins (1): chat
[nac-chat] backend response: message="Hi! How can I help you with this page?" actions=[]
```

`snapshot plugins (1): chat` es la pista clave -- solo UN plugin
aparece en el snapshot enviado al LLM, el plugin `chat`.
El plugin `todos` -- que el demo registra mediante
`NAC.register(TODOS_MANIFEST)` -- está ausente.

**Causa raíz.** `NAC.describe()` enumera plugins recorriendo el
DOM en busca de elementos `[data-nac-plugin="..."]` (línea ~1557 de
`yujin.app/nac-spec/js/nac.js`). El `<aside class="chat" data-nac-plugin="chat">`
del panel de chat tiene el atributo; la región de todos de la app NO.
El runtime nunca reconoce la región de todos como un scope de plugin,
por lo tanto tampoco lo hace `describe()`, ni `snapshotTree()`, ni el LLM.

El registro del manifiesto mediante `NAC.register(...)` puebla el
mapa interno `_manifests` pero NO adjunta automáticamente un
atributo `data-nac-plugin` al DOM. Esa es responsabilidad del caller.

**Corrección.** Agregar `data-nac-plugin="todos"` al contenedor
principal de la app en ambos demos:

- React: `<div className="app">` -> `<div className="app" data-nac-plugin="todos">`
- Angular: `<div class="app">` en el template -> `<div class="app" data-nac-plugin="todos">`

Tras la corrección, `NAC.describe()` devuelve 2 plugins (`todos` +
`chat`), el snapshot incluye ambos manifiestos, y el LLM puede
despachar acciones basadas en verbos contra `todos.*`.

**Lección para el manual.** El contrato de NAC3 requiere AMBAS cosas:
1. `NAC.register(manifest)` para declarar el esquema.
2. `data-nac-plugin="<slug>"` en un nodo raíz del DOM para inscribir
   el plugin en el árbol de scopes.

Las guías de adopción y el NAC_TEST_MANUAL deben señalar esto
explícitamente. Un error común de los adoptantes es registrar el
manifiesto y olvidar el atributo del DOM, produciendo exactamente
el síntoma de "LLM ciego" descrito arriba. Agregar a
`stage2-disambiguation.mjs` una prueba de regresión: el snapshot
debe incluir TODOS los plugins registrados; de lo contrario,
registrar un hallazgo.

---

## Bug #2 (MEDIO) -- Los handlers de onChatAction en React cierran sobre estado obsoleto

**Demo afectado:** Solo React. Los signals + `update()` de Angular
hacen que esta categoría no aplique.

**Síntoma (observable):** Tras desplegar la corrección #1, el
despacho de verbos impulsado por chat sigue sin agregar todos.
Enviar "agrega leche" no produce ningún todo nuevo. El LLM emite
correctamente la secuencia de dos acciones (`fill todos.input "leche"`
+ `click_by_verb todos add_todo`), pero el handler de `add_todo` ve
`input.trim() === ''` y retorna silenciosamente sin llamar a `addTodo()`.

**Método de descubrimiento.** El barrido profundo de Playwright
(ronda 2) captura el conteo de filas antes y después de un add
impulsado por chat. Hallazgos:

```
[WARN] chat.dispatch: [react] chat "agrega leche" did not add a
todo (before=3, after=3). May be LLM hallucination or dispatch
broken.
```

**Causa raíz.** El `useEffect` de `App.tsx` para el registro de
handlers de chat tiene deps `[input, todos]`. Los handlers cierran
sobre los valores del estado de React EN EL MOMENTO DEL REGISTRO.
Cuando el LLM envía `actions[]` de forma sincrónica, el cliente de
chat despacha:
1. `fill todos.input "leche"` -> `setInput('leche')` encola un
   re-render.
2. `click_by_verb todos add_todo` -> se ejecuta INMEDIATAMENTE, en
   la misma tarea JS. React aún no ha re-renderizado. El closure del
   handler todavía tiene `input === ''`. El guard `input.trim()` falla;
   `addTodo()` nunca se ejecuta.

Este es el clásico problema de closure vs. estado obsoleto en React.

**Corrección.** Usar un `useRef` que refleje `input`; el handler lee
del ref (siempre el valor actual) en lugar del closure.
El mismo patrón aplica para `todos` en caso de que futuros verbos
lo necesiten.

```ts
const inputRef = useRef(input);
useEffect(() => { inputRef.current = input; }, [input]);

useEffect(() => {
  if (!window.NacChat) return;
  window.NacChat.onAction('click_by_verb', (a) => {
    if (a.plugin === 'todos' && a.verb === 'add_todo') {
      const text = (a as any).args?.text || inputRef.current.trim();
      if (text) {
        addTodoFromText(text);
        return { ok: true };
      }
    }
    ...
  });
}, []); // registrar una sola vez
```

Bonus: también aceptar que el LLM pase el texto directamente en
`args.text`, para que incluso las apps que no hacen fill-then-click
funcionen.

**Lección para el manual.** Al conectar verbos impulsados por chat de
NAC3 en React, NUNCA cerrar handlers directamente sobre el estado.
Usar refs o el patrón de setter funcional. Agregar a la guía de
adopción de React (`guides/REACT.md`) y al manual de pruebas una
sección de "errores comunes".

---

## Bug #3 (PENDIENTE)

Pendiente de la ronda diagnóstica 3.

---

## Registro de iteraciones

| Ronda | Cuándo | Errores React | Errores Angular | Bugs registrados |
|-------|--------|---------------|-----------------|------------------|
| 1 | 2026-05-11 02:10 | 0 en escaneo superficial | 0 en escaneo superficial | #1 (cobertura de manifiesto) encontrado via análisis de consola |

Las verificaciones estructurales del spec diagnóstico (NAC montado,
validate_global limpio, manifiestos en el registro, CRUD de todos
funciona, toggle del chat funciona) todas pasan en verde. Los bugs
aparecen en semánticas más profundas como "¿el LLM realmente ve lo
que registramos?". Las rondas diagnósticas futuras agregan: forma de
acción post-respuesta-LLM, verificar que el despacho se dispara,
verificar la propagación de mutación de dt_state a través del estado
del framework, verificar que el autopilot completa todos los pasos,
verificar el cambio de locale desde el chat.

---

*This is a machine translation of the canonical English
version at `/nac-spec/docs/CASE_STUDIES_DISCOVERY.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
