---
translation_source: guides/RPA_BLUE_PRISM.md
translation_source_hash: 7ab698b35a99ca25e77a07599f1aa733b4ba42eb08d0f3bce785a9b0c7f7e276
translation_quality: machine_v1
translation_lang: es
translation_date: 2026-05-11T13:28:35.143270+00:00
---

# Guía de integración NAC3 + Blue Prism

**Versión de NAC3:** 2.2 (con vista previa de interoperabilidad v2.3)
**Probado con:** Blue Prism 7.1 + Browser Automation v7.1.

El objeto de negocio `Browser` de Blue Prism expone `Inject JavaScript`
de forma nativa. NAC3 + Blue Prism sigue un patrón de 5 etapas.

## Flujo de etapas

1. **Login Agent** -- estándar.
2. **Navigate** -- abrir la aplicación conforme a NAC.
3. **JS: wait for window.NAC3** -- sondear hasta que esté listo.
4. **JS: NAC.click / fill / tab** -- despacho canónico.
5. **JS: read describe()** -- introspección del manifiesto para la
   siguiente iteración del flujo de datos.

## VBO de ejemplo (Visual Business Object)

```
Object: NAC Driver
Action: Click NAC ID
  Inputs:
    - nacId (Text)
  Code (Inject JavaScript):
    (async () => {
      try {
        await window.NAC.click([nacId]);
        return JSON.stringify({ok:true});
      } catch (e) {
        return JSON.stringify({ok:false, code:e.code, message:e.message});
      }
    })()
  Outputs:
    - resultJson (Text)
```

Acciones equivalentes: `Click By Verb`, `Fill`, `Select`, `Tab`,
`Describe`, `WaitForAck`.

## Patrón de espera de confirmación (ack)

`NAC.click()` ya espera internamente el evento `nac:action:succeeded`
(tiempo de espera de 5s). Blue Prism puede agregar una espera explícita adicional:

```js
return new Promise(resolve => {
  let acked = false;
  document.addEventListener('nac:action:succeeded', function (e) {
    if (e.detail.action_id === '[expectedId]') {
      acked = true;
      resolve('ok');
    }
  }, { once: true });
  setTimeout(() => { if (!acked) resolve('timeout'); }, [timeoutMs]);
});
```

Este patrón expone la familia de eventos canónicos de NAC3 dentro de
las salidas de etapa de Blue Prism, lo cual es útil para ramificar el flujo del proceso.

## Descubrimiento

Acción `Read Manifest`:

```js
return JSON.stringify(window.NAC.describe());
```

Canalizar hacia una Collection. El proceso puede adaptarse a cambios en el
esquema del manifiesto sin necesidad de recompilar las etapas.

## Licencia + ver también

Apache-2.0. Consulte [RPA_UIPATH.md](RPA_UIPATH.md) para un tratamiento más completo.

---

*This is a machine translation of the canonical English
version at `/nac-spec/guides/RPA_BLUE_PRISM.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
