---
translation_source: guides/RPA_UIPATH.md
translation_source_hash: 2dd66d68221f687237ac663fa2a360077a51b7cdf8ad74c16488a5934ee7927d
translation_quality: machine_v1
translation_lang: es
translation_date: 2026-05-11T13:28:15.805790+00:00
---

# Guía de integración NAC3 + UiPath

**Versión de NAC3:** 2.2 (con vista previa de interoperabilidad v2.3)
**Estado:** Estable. Probado con UiPath Studio 23.10 + Web
Automation v23.10.

La automatización web de UiPath actualmente extrae el DOM mediante selectores CSS,
apuntado visual o coordenadas codificadas. Con NAC3, cada
widget interactivo de tu aplicación expone un
`data-nac-id` estable; UiPath referencia los elementos por ese id y sobrevive
a rediseños de interfaz sin problemas.

## Por qué NAC3 + UiPath

| Problema actual | Solución con NAC3 |
|----------------|-------------------|
| Los selectores se rompen cuando cambia el CSS | `data-nac-id` es estable ante rediseños visuales |
| El apuntado por ancla o coordenadas falla si un botón se mueve | Igual |
| Fragilidad entre tenants (IDs distintos por cliente) | El manifiesto declara el verbo; el bot llama por verbo |
| Esperar a que "el elemento esté listo" es frágil | El evento `nac:action:succeeded` es determinista |
| Las interfaces multilingüe requieren automatización por idioma | `label_i18n` es agnóstico al idioma; el bot usa ids, no etiquetas |

## Dos caminos de integración

### Camino A -- Actividad de navegador + inyección de JS (recomendado)

La actividad `Inject JavaScript` de UiPath ejecuta `window.NAC.click(...)`
directamente. Sin selectores, sin fragilidad.

```vb
' UiPath sequence pseudocode
Open Browser https://your-app.example.com/
Inject JS: window.NAC.click('invoice.save')
Wait for Event: nac:action:succeeded
```

Implementación:

1. **Actividad de navegador** -- flujo estándar de UiPath.
2. **Actividad Inject JavaScript** -- payload:
   ```js
   return await (async () => {
     const result = await window.NAC.click('@id@');
     return JSON.stringify(result);
   })();
   ```
3. **Asignar** la cadena devuelta a una variable. Parsearla para verificar
   `{ok: true}`.

Para despacho basado en verbos:

```js
await window.NAC.click_by_verb('@plugin@', '@verb@')
```

Para rellenar campos:

```js
await window.NAC.fill('@id@', '@value@')
```

### Camino B -- Basado en selectores con xpath compatible con NAC

Si tu perfil de UiPath prefiere selectores, usa el atributo `data-nac-id`
directamente:

```xml
<webctrl tag='button' attr='data-nac-id' value='invoice.save' />
```

Misma lógica, pero consume el DOM del navegador a través del explorador de árbol
de UiPath. Ligeramente menos robusto (depende del timing del árbol), pero
mantiene el estilo de UiPath.

## Flujo de trabajo de ejemplo en UiPath

`Examples_NAC_Invoice.xaml` (disponible para descarga en el marketplace de Yujin
una vez publicado):

1. **Open Browser** -- apunta la pestaña a tu aplicación conforme a NAC-3.
2. **Esperar window.NAC3** -- inyectar:
   ```js
   return new Promise(r => {
     const t = setInterval(() => {
       if (window.NAC) { clearInterval(t); r('ready'); }
     }, 100);
   });
   ```
3. **For Each Row** -- iterar sobre la tabla de datos de origen.
4. **Inject JS** -- por fila:
   ```js
   await window.NAC.click_by_verb('invoice', 'new');
   await window.NAC.fill('invoice.client_name', @row("client")@);
   await window.NAC.fill('invoice.amount', @row("amount")@);
   await window.NAC.click_by_verb('invoice', 'save');
   ```
5. **Esperar** -- nac:action:succeeded con action_id='invoice.save'.
6. **Continuar** el ciclo.

Todo el flujo tiene 5 actividades, independientemente de qué tan compleja sea la
aplicación subyacente. Compara esto con las típicas 30-50 actividades de un
equivalente basado en selectores CSS.

## Descubrimiento: leer el manifiesto

UiPath puede inspeccionar el manifiesto antes de automatizar:

```js
return window.NAC.describe();
```

Devuelve el árbol completo de plugins. Úsalo para construir
diagramas de flujo dinámicos que se adapten a cambios en el manifiesto sin
necesidad de redesplegar el .xaml.

## Procedencia (NAC-3)

UiPath despacha clics sintéticos, por lo que `event.isTrusted === false`
en el evento de confirmación de NAC3. Las aplicaciones que condicionan verbos
sensibles a `is_trusted` (eliminar, pago, administración) RECHAZARÁN el despacho
de UiPath por defecto.

Para habilitar RPA en esos verbos, la aplicación anfitriona debe incluirlos
explícitamente en la lista blanca:

```js
// In the host app's NAC bootstrap:
window.__NAC_ALLOW_UNTRUSTED__ = ['invoice.save', 'invoice.send'];
```

Analiza el modelo de amenazas con el propietario de la aplicación -- omitir
isTrusted anula la garantía anti-suplantación de la especificación. UiPath
opera en un entorno controlado, por lo que la compensación suele ser
aceptable, pero documéntalo.

## Manejo de errores

NAC3 lanza errores estructurados sobre los que UiPath puede ramificar:

```js
try {
  await window.NAC.click('invoice.save');
} catch (e) {
  return JSON.stringify({ ok: false, code: e.code, message: e.message });
}
```

| `e.code` | Significado | Rama en UiPath |
|----------|-------------|----------------|
| `not_found` | El id no existe en el DOM actual | Redescubrir con `NAC.describe()` |
| `invalid` | Forma del argumento incorrecta | Error en la lógica del bot, escalar |
| `timeout` | El efecto secundario no confirmó en 5s | Reintentar hasta N veces |

## Matriz de pruebas

Ejercitamos la integración contra la
[demo de tabla de datos v21](https://yujin.app/nac-spec/example-v21-data-table.php)
mediante UiPath 23.10 en CI. El flujo de referencia está en
`tools/rpa/uipath/InvoiceFromCSV.xaml` de este repositorio (próximamente).

## Ver también

- [SPEC.md sec 5](../SPEC.md#5-public-api) -- superficie completa de NAC.*.
- [SECURITY.md](../SECURITY.md) -- modelo de amenazas de isTrusted.
- [LLM_WIRING.md](LLM_WIRING.md) -- si tu flujo RPA también necesita
  entrada por voz o chat, conecta el intermediario LLM al frente.
- [NAC_TEST_MANUAL.md](../docs/NAC_TEST_MANUAL.md) -- cómo Yujin
  prueba este contrato de extremo a extremo.

## Licencia

Apache-2.0.

---

*This is a machine translation of the canonical English
version at `/nac-spec/guides/RPA_UIPATH.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
