---
translation_source: guides/RPA_AUTOMATION_ANYWHERE.md
translation_source_hash: 165e60e4b3922f8353a3f038d815452ebf9ba7d597cb68f8c313eb47cb416eab
translation_quality: machine_v1
translation_lang: es
translation_date: 2026-05-11T13:28:26.846976+00:00
---

# Guía de integración NAC3 + Automation Anywhere

**Versión de NAC3:** 2.2 (con vista previa de interoperabilidad v2.3)
**Probado con:** Automation Anywhere A2019 + A360.

## Dos caminos -- elige según tu edición de AA

### Camino A -- A360 + Web Recorder + Run JavaScript

La acción `Run JavaScript Function` de AA inyecta código en la pestaña activa del navegador.

```js
// payload variable: NAC_ID = "invoice.save"
async function nacClick(id) {
  await window.NAC.click(id);
  return 'ok';
}
return nacClick($NAC_ID$);
```

Vincula las variables de entrada (`$NAC_ID$`, `$VALUE$`) en tiempo de diseño;
la acción devuelve una cadena sobre la que el bot puede ramificar.

### Camino B -- A2019 + Object Cloning con atributo personalizado

El `Object Cloning` de A2019 tradicionalmente apunta mediante propiedades del DOM.
Configura el selector de propiedades así:

```
HTML.Attribute: data-nac-id
Search value: invoice.save
```

Menos robusto que el Camino A (depende del tiempo de carga del árbol DOM), pero permite
que bots A2019 existentes adopten NAC3 sin reescribir los flujos.

## Plantilla canónica de bot con 8 acciones

Para la demo de factura v21:

| Paso | Acción | Payload |
|------|--------|---------|
| 1 | Open Browser | https://your-app.example.com/ |
| 2 | Wait | esperar que `window.NAC` esté listo (sondeo JS) |
| 3 | Loop CSV | filas |
| 4 | Run JS | `await window.NAC.click_by_verb('invoice','new')` |
| 5 | Run JS | `await window.NAC.fill('invoice.client',$row.client$)` |
| 6 | Run JS | `await window.NAC.fill('invoice.amount',$row.amount$)` |
| 7 | Run JS | `await window.NAC.click_by_verb('invoice','save')` |
| 8 | End Loop | -- |

8 acciones independientemente de la complejidad de la interfaz. Compara con los
30-60 acciones típicas de los flujos basados en selectores CSS.

## Descubrimiento mediante `NAC.describe()`

```js
return JSON.stringify(window.NAC.describe());
```

Devuelve el árbol del manifiesto. AA puede analizarlo con `JSON Parse` y
construir diagramas de flujo dinámicos.

## Procedencia + isTrusted

AA despacha clics sintéticos. La aplicación anfitriona puede rechazar verbos
sensibles (delete, payment) a menos que estén explícitamente en la lista blanca.
Consulta la sección "Provenance" en `RPA_UIPATH.md` para ver el patrón de
habilitación en el lado del host. Lo mismo aplica para AA.

## Manejo de errores

Envuelve cada llamada JS en un bloque `try/catch` que devuelva JSON:

```js
try {
  await window.NAC.fill('@id@', '@value@');
  return JSON.stringify({ok: true});
} catch (e) {
  return JSON.stringify({ok: false, code: e.code, message: e.message});
}
```

La acción `If` ramifica según el JSON analizado.

## Licencia y referencias

Apache-2.0. Consulta [RPA_UIPATH.md](RPA_UIPATH.md) para un tratamiento más
detallado; los patrones se transfieren 1:1.

---

*This is a machine translation of the canonical English
version at `/nac-spec/guides/RPA_AUTOMATION_ANYWHERE.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
