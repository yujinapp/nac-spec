---
translation_source: guides/AI_PLAYBOOK_MIGRATION.md
translation_source_hash: f49b65c798ab36923cab79511851c64a81ad6609a1c37d4936d4c6c0542cc706
translation_quality: machine_v1
translation_lang: es
translation_date: 2026-05-11T13:26:12.982010+00:00
---

# AI Playbook -- Migrar un proyecto existente a NAC3

**Versión de NAC3:** 2.2 stable + v2.3 interop preview.
**Audiencia:** Cualquier agente de IA (Claude, GPT, Gemini, LLM local) encargado
de migrar una aplicación web existente a conformidad NAC-3 (migración brownfield).
**Formato:** Runbook paso a paso con QUÉ, CÓMO y VERIFICAR por cada paso.

Cuando un humano diga **"migremos este proyecto a NAC-3"**, un agente de IA
que lea este archivo DEBE ejecutar los pasos a continuación en orden.
La migración brownfield es más difícil que la greenfield porque no se puede
romper la aplicación en ejecución. Cada paso se entrega DE FORMA INDEPENDIENTE.

---

## Paso 0 -- Alcance + controles de seguridad

### 0.1 Preguntas para hacerle al humano

1. **Nivel de riesgo**: ¿La app está en producción? Si es así, migra
   pantalla por pantalla detrás de feature flags. Si está en staging,
   puedes ser más agresivo.
2. **Framework**: Detéctalo desde `package.json` / `composer.json` /
   el árbol del proyecto, luego confírmalo con el humano.
3. **Top-10 verbos**: Pídele al humano que liste las 10 acciones más
   usadas en su app (guardar, cancelar, buscar, filtrar, etc.).
   Estas se migran primero.
4. **Backend de chat**: ¿Se reutilizará una infraestructura de chat
   existente (Yujin chat en `/yujin/nac-demo`, o tu propio intermediario LLM)?
5. **Cobertura de tests actual**: ¿Hay Playwright / Cypress / Jest existentes?
   Agregarás tests de NAC3 junto a los existentes, no los reemplazarás.
6. **Librería de componentes**: ¿shadcn / MUI / PrimeNG / Mantine /
   personalizada? Algunas librerías ignoran las props `data-*`; necesitarás
   wrappers (ver paso 5).

### 0.2 Higiene de git antes de comenzar

```bash
git status              # MUST be clean before starting
git checkout -b feat/nac3-migration
```

Cada paso de la migración NAC vive en su propio commit para que el humano
pueda revisar y revertir por sección.

---

## Paso 1 -- Instalar el runtime + crear el módulo de arranque

```bash
npm install @nac3/runtime@^2.2.0
```

Crear `src/nac/boot.ts` (o el equivalente según el framework):

```ts
import '@nac3/runtime';
import '@nac3/runtime/extensions';
// import '@nac3/runtime/chat-client';  // uncomment when ready for chat

declare global { interface Window { NAC?: any; NacChat?: any; } }
```

Importar una sola vez desde el punto de entrada raíz de la app (`main.tsx`, `app.module.ts`,
o al inicio del script en el `<head>` del HTML).

**Verificar:** `window.NAC` definido en la consola del navegador;
`window.NAC.version` retorna `'2.2.0'` (o superior).

**Commit:** `feat(nac3-migration): step 1 -- install runtime + boot module`

---

## Paso 2 -- Decorar el shell de la aplicación

Agregar `data-nac-plugin="<app-slug>"` al contenedor MÁS EXTERNO que
envuelve la UI principal. Este es el atributo más importante de toda la
migración -- sin él, el snapshot del intermediario LLM queda vacío
(lección del bug #1 en los casos de estudio de React + Angular,
documentado en `docs/CASE_STUDIES_DISCOVERY.md`).

### Ejemplo con React

```tsx
return (
  <div className="app" data-nac-plugin="my-app">
    ...
  </div>
);
```

### Ejemplo con Angular

```html
<div class="app" data-nac-plugin="my-app">
  ...
</div>
```

### Server-rendered (PHP / Rails / Django)

```html
<body data-nac-plugin="my-app">
  ...
</body>
```

**Verificar:** En la consola del navegador: `NAC.describe().plugins.length >= 1`.

**Commit:** `feat(nac3-migration): step 2 -- root data-nac-plugin attribute`

---

## Paso 3 -- Decorar los botones de los top-10 verbos

Toma las 10 acciones más usadas del paso 0.3. Para cada botón:

```html
<button
  data-nac-id="<plugin>.<verb>"
  data-nac-role="action"
  data-nac-action="<verb>"
  onclick="...">
  ...
</button>
```

**Convenciones de ID:**
- Con namespace del plugin: `invoice.save`, no solo `save`.
- Snake_case en minúsculas: `add_row`, no `AddRow` ni `add-row`.
- El verbo al final si es un verbo global de la app; de lo contrario, anidado:
  `dashboard.invoice.list.row.42.delete`.

No toques el `onclick` / manejador de eventos existente -- la
decoración es aditiva.

**Verificar:** Desde la consola:
```js
NAC.describe().plugins[0].elements.length  // >= 10
NAC.list_registered_plugins()                // includes your plugin
```

**Commit:** `feat(nac3-migration): step 3 -- top-10 buttons decorated`

---

## Paso 4 -- Agregar un manifest mínimo

No intentes cubrir TODOS los elementos el primer día. Cubre los top-10
botones de verbos del paso 3 con `label_i18n` apropiado:

```ts
// src/nac/manifest.ts
const li = (es:string,en:string,pt:string,fr:string,it:string,
            de:string,ja:string,zh:string,hi:string,ar:string) =>
  ({ es, en, pt, fr, it, de, ja, zh, hi, ar });

export const APP_MANIFEST = {
  plugin_slug: 'my-app',
  version: '1.0.0',
  nac_version: '2.2',
  elements: [
    {
      id: 'my-app.save', role: 'action',
      actions: [{
        verb: 'save',
        label_i18n: li('Guardar','Save','Salvar','Sauver','Salva',
                       'Speichern','保存','保存','sahejna','حفظ')
      }],
      label_i18n: li(/* same */)
    },
    // ... 9 more ...
  ]
};
```

Registrar al arrancar:

```ts
window.NAC?.register(APP_MANIFEST);
```

Si no puedes entregar los 10 idiomas el primer día, usa `i18n_strict: 'permissive'`
en la ruta de autoRegister.watch. Esto es un apoyo temporal;
el validador estricto de NAC3 v2.2 en producción advertirá sobre i18n incompleto.

**Verificar:**
```js
NAC.list_registered_plugins()           // ['my-app']
await NAC.click_by_verb('my-app','save')  // resolves
```

**Commit:** `feat(nac3-migration): step 4 -- manifest with top-10 verbs`

---

## Paso 5 -- Manejar la librería de componentes (si aplica)

Si tu app usa MUI / Mantine / PrimeNG / etc. y los botones
ignoran las props `data-*`, escribe un wrapper delgado:

```tsx
// src/nac/NacButton.tsx
import { Button as MuiButton } from '@mui/material';
import { useEffect, useRef } from 'react';

export function NacButton({ nacId, verb, plugin, children, ...rest }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.setAttribute('data-nac-id', nacId);
    el.setAttribute('data-nac-role', 'action');
    el.setAttribute('data-nac-action', verb);
  }, [nacId, verb]);
  return <MuiButton ref={ref} {...rest}>{children}</MuiButton>;
}
```

Reemplaza `<Button>` por `<NacButton nacId="..." verb="...">` en los
top-10 botones. Hazlo de forma incremental.

**Commit:** `feat(nac3-migration): step 5 -- component library wrapper`

---

## Paso 6 -- Emitir el contrato de confirmación (ack)

El helper `bindAction` de v2.2 es el camino más limpio:

```ts
import { useRef, useEffect } from 'react';

export function useNacAction(plugin: string, actionId: string) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || !window.NAC) return;
    return window.NAC.bindAction(el, () => {}, { plugin, action_id: actionId });
  }, [plugin, actionId]);
  return ref;
}
```

```tsx
function SaveButton({ onSave }) {
  const ref = useNacAction('my-app', 'my-app.save');
  return <button ref={ref} onClick={onSave}>Save</button>;
}
```

La capa bindAction dispara `nac:action:succeeded` automáticamente
después de que el `onClick` del usuario retorna. Se acabó el "el chat dice
'No pude ejecutar X: timeout'".

**Verificar:** Desde la consola:
```js
document.addEventListener('nac:action:succeeded', e => console.log(e.detail));
await NAC.click('my-app.save');
// Should print {plugin: 'my-app', action_id: 'my-app.save', ...}
```

**Commit:** `feat(nac3-migration): step 6 -- bindAction ack contract`

---

## Paso 7 -- Agregar campos + pestañas

Para cada input en el que el usuario escribe:

```html
<input data-nac-id="my-app.field_x" data-nac-role="field" ...>
```

Para cada pestaña en componentes de tipo tab-strip:

```html
<button
  data-nac-id="tab.<key>"
  data-nac-role="tab"
  onclick="...">
  ...
</button>
```

**Crítico (regla del validador estricto v2.2):** Todo ID que coincida con `^tab\.`
DEBE tener el role `tab`. Los roles que no coincidan producen el hallazgo
`tab_id_manifest_role_drift` y el runtime no podrá encontrar
la pestaña mediante `NAC.tab()`.

**Commit:** `feat(nac3-migration): step 7 -- fields + tabs decorated`

---

## Paso 8 -- Agregar el panel de chat (opcional, diferible)

Incluye el `nac-chat-client.js` de referencia:

```html
<aside class="chat" data-nac-plugin="chat" aria-hidden="true">
  <div id="chat-log" data-nac-id="chat.log" data-nac-role="region"></div>
  <input id="chat-input" data-nac-id="chat.input" data-nac-role="field">
  <button id="chat-send" data-nac-id="chat.send" data-nac-role="action">send</button>
</aside>

<script src="https://yujin.app/nac-spec/js/nac-chat-client.js?v=v22"></script>
<script>
NacChat.init({
  endpoint: '/your-llm-intermediary',   // or '/crm/api/v1/yujin/nac-demo'
  chatLog: document.getElementById('chat-log'),
  input:   document.getElementById('chat-input'),
  sendBtn: document.getElementById('chat-send')
});
</script>
```

Alternativamente, **difiere el chat por completo** e indica a los usuarios que instalen
Yujin Pilot (`yujin.app/pilot`), que descubre tu app vía
MCP y la controla desde un cockpit centralizado.

**Commit:** `feat(nac3-migration): step 8 -- chat panel`

---

## Paso 9 -- Agregar el corpus de tests de NAC3

Copia la infraestructura de tests de referencia de Yujin:

```bash
mkdir -p test/nac3
cp /path/to/rpaforce-crm/packages/nac/test/stage*.mjs ./test/nac3/
cp /path/to/rpaforce-crm/tools/nac/test-launch.sh ./test/nac3/
```

Adapta el slug del plugin y la referencia al manifest. Ejecuta:

```bash
bash ./test/nac3/test-launch.sh
```

**Verificar:** Todas las capas en VERDE.

**Commit:** `feat(nac3-migration): step 9 -- NAC3 test corpus`

---

## Paso 10 -- Promover a conformidad NAC-3

```bash
# In your CI:
npx @nac3/runtime validate ./src --severity=error  # exit 0 required
NAC.validate_global({probe: true})              # zero findings required
```

Establece `NAC.STRICT_VALIDATION = true` en el arranque de producción para
aplicar coherencia de roles en el momento del registro.

**Commit:** `feat(nac3-migration): step 10 -- NAC-3 conformance gate`

---

## Orden de migración entre pantallas

En una app en producción con muchas pantallas, no intentes migrarlas
todas a la vez:

1. **La pantalla más usada primero** (p. ej., login + dashboard).
2. **La pantalla de mayor valor después** (aquella en la que viven
   tus usuarios avanzados).
3. **Las pantallas públicas** (visibles para tráfico anónimo).
4. **Las pantallas de administración** al final (poco tráfico, mayor complejidad de aceptación).

Cada pantalla tiene su propio PR. Cada PR se entrega detrás de un feature flag
si dispones de uno; revertir es tan simple como cambiar el flag.

---

## Errores comunes en la migración

1. **Olvidaste `data-nac-plugin` en el root.** El manifest se registra
   pero el LLM no lo ve. **Síntoma:** el chat responde con un genérico "¿En qué puedo
   ayudarte?" sin mostrar acciones. Solución: agrega el atributo. (Bug #1 de los casos de estudio.)
2. **Closure desactualizado en el estado de React dentro de onChatAction.** Usa refs +
   setters funcionales. (Bug #2 de los casos de estudio.)
3. **ID de pestaña con role que no es tab.** Hallazgo del validador estricto v2.2.
   `^tab\.` DEBE tener role `tab`.
4. **Reutilizar IDs después de una refactorización.** Un botón movido a un nuevo
   rol semántico DEBE obtener un nuevo ID. La reutilización rompe la automatización posterior.
5. **La librería de componentes ignora data-*.** Detéctalo temprano; escribe un
   wrapper (paso 5).
6. **El manejador de click no emite el ack.** Usa `bindAction`. Sin
   él, `NAC.click()` expira a los 5s aunque el efecto secundario
   haya funcionado.

---

## Ver también

- [AI_PLAYBOOK_NEW_PROJECT.md](AI_PLAYBOOK_NEW_PROJECT.md) -- para
  proyectos greenfield.
- [REACT.md](REACT.md) / [ANGULAR.md](ANGULAR.md) -- análisis profundos por framework.
- [NAC_TEST_MANUAL.md](../docs/NAC_TEST_MANUAL.md) -- playbook de tests
  post-migración.
- [CASE_STUDIES_DISCOVERY.md](../docs/CASE_STUDIES_DISCOVERY.md)
  -- bugs encontrados durante la migración de referencia de Yujin.

## Licencia

Apache-2.0.

---

*This is a machine translation of the canonical English
version at `/nac-spec/guides/AI_PLAYBOOK_MIGRATION.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
