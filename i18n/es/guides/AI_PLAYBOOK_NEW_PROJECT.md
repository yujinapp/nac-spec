---
translation_source: guides/AI_PLAYBOOK_NEW_PROJECT.md
translation_source_hash: 6586a966938a6d84086a8b79805cde15886536b6718b79526ff7d16d202686fe
translation_quality: machine_v1
translation_lang: es
translation_date: 2026-05-11T13:24:54.734007+00:00
---

# AI Playbook -- Iniciar un nuevo proyecto NAC-3

**Versión de NAC3:** 2.2 estable + vista previa de interoperabilidad v2.3.
**Audiencia:** Cualquier agente de IA (Claude, GPT, Gemini, LLM local) encargado
de inicializar un proyecto conforme a NAC-3 desde cero.
**Formato:** Manual paso a paso. Cada paso tiene QUÉ, CÓMO, VERIFICAR.
Sin ambigüedades.

Cuando un humano diga **"iniciemos un nuevo proyecto NAC-3"** o
algo similar, un agente de IA que lea este archivo DEBE ejecutar los pasos
a continuación en orden, verificando cada punto de control antes de avanzar.

---

## Paso 0 -- Confirmar el alcance con el humano

Hacer exactamente estas preguntas antes de escribir cualquier código:

1. **Framework**: React, Angular, Vue, Svelte, vanilla, o
   renderizado en servidor (PHP/Rails/Django)?
2. **Idiomas**: ¿Cuáles de los 10 locales de NAC3 debe soportar la app
   al lanzamiento? (es, en, pt, fr, it, de, ja, zh, hi, ar)
3. **Backend de chat**: ¿La app expondrá su propio intermediario LLM
   (proveer endpoint) o usará un chat Yujin alojado?
4. **Procedencia**: ¿Multi-tenant? Si es así, planificar la firma HMAC del manifiesto.
5. **Voz**: ¿Solo push-to-talk, manos libres, o ambos?
6. **Interop (vista previa v2.3)**: ¿Esta app podrá ser importada por
   otros hosts NAC3 (Yujin Pilot, apps pares)? Sí -> exponer
   herramientas del servidor MCP.

Registrar cada respuesta. Estas determinan cada decisión posterior.

---

## Paso 1 -- Crear el andamiaje del proyecto

### React (Vite)

```bash
npm create vite@latest <slug> -- --template react-ts
cd <slug>
npm install
npm install @nac3/runtime@^2.2.0
```

### Angular

```bash
npx -p @angular/cli ng new <slug> --style=css --routing=true --strict
cd <slug>
npm install @nac3/runtime@^2.2.0
```

### Vanilla (HTML + JS + PHP, sin framework)

Crear:
- `index.html` con `<body data-nac-plugin="app">`.
- `js/app.js` con las importaciones.

### Renderizado en servidor

Incluir `@nac3/runtime` vía CDN:

```html
<script src="https://yujin.app/nac-spec/js/nac.js?v=v22"></script>
<script src="https://yujin.app/nac-spec/js/nac-v2-extensions.js?v=v22"></script>
```

**Verificar:** `npm run build` (o el equivalente del framework) finaliza
sin errores. Abrir en el navegador; `window.NAC` está definido.

---

## Paso 2 -- Decorar el shell

Agregar al **contenedor raíz** en la plantilla:

```html
<div data-nac-plugin="<your-app-slug>" class="app">
  ...
</div>
```

Agregar a **cada widget clickeable** (botones, enlaces usados como botones):

```html
<button
  data-nac-id="<slug>.<verb>"
  data-nac-role="action"
  data-nac-action="<verb>"
  onclick="...">
  ...
</button>
```

Agregar a **cada campo de formulario** (input, textarea, select):

```html
<input
  data-nac-id="<slug>.<field-name>"
  data-nac-role="field"
  ... />
```

Agregar a **cada botón de pestaña** (la especificación es estricta: el id `^tab\.` DEBE
tener role `tab`):

```html
<button
  data-nac-id="tab.<key>"
  data-nac-role="tab"
  onclick="...">
  ...
</button>
```

**Verificar:** `npx @nac3/runtime validate ./src` reporta cero hallazgos de
severidad error. `NAC.describe()` desde la consola del navegador
devuelve un árbol con coincidencias de `data-nac-plugin`.

---

## Paso 3 -- Escribir el manifiesto

Crear `src/nac/manifest.ts` (o equivalente):

```ts
const li = (es:string,en:string,pt:string,fr:string,it:string,
            de:string,ja:string,zh:string,hi:string,ar:string) =>
  ({ es, en, pt, fr, it, de, ja, zh, hi, ar });

export const APP_MANIFEST = {
  plugin_slug: '<your-app-slug>',
  version: '1.0.0',
  nac_version: '2.2',
  elements: [
    {
      id: '<slug>.save',
      role: 'action',
      actions: [{
        verb: 'save',
        label_i18n: li('Guardar','Save','Salvar','Sauver','Salva',
                       'Speichern','保存','保存','sahejna','حفظ')
      }],
      label_i18n: li(/* same 10 */)
    },
    // ... todos los demás elementos ...
  ]
};
```

**Reglas críticas:**
- Cada `label_i18n` DEBE cubrir los 10 locales soportados. Un mapa
  incompleto es un hallazgo del validador estricto de v2.2.
- Cada `id` que coincida con `^tab\.` DEBE tener `role: 'tab'`.
- Cada `id` DEBE estar bajo el espacio de nombres del plugin (p. ej. `invoice.save`,
  no `save`).
- Los IDs DEBEN ser estables a través de rediseños de la interfaz.

**Verificar:** `NAC.validate_global({probe: false})` devuelve 0
hallazgos de severidad error.

---

## Paso 4 -- Registrar el manifiesto al iniciar

### React

```tsx
import { useEffect } from 'react';
import '@nac3/runtime';
import '@nac3/runtime/extensions';
import { APP_MANIFEST } from './nac/manifest';

export function App() {
  useEffect(() => {
    window.NAC?.register(APP_MANIFEST);
  }, []);
  // ...
}
```

### Angular

```ts
import { Injectable } from '@angular/core';
import '@nac3/runtime';
import '@nac3/runtime/extensions';
import { APP_MANIFEST } from './nac/manifest';

@Injectable({ providedIn: 'root' })
export class NacBoot {
  constructor() {
    (window as any).NAC?.register(APP_MANIFEST);
  }
}
```

Inyectar `NacBoot` en el `AppComponent`.

### Vanilla

```html
<script type="module">
import { APP_MANIFEST } from './nac/manifest.js';
window.NAC.register(APP_MANIFEST);
</script>
```

**Verificar:** `NAC.list_registered_plugins()` devuelve
`['<your-app-slug>']`.

---

## Paso 5 -- Emitir el contrato de confirmación desde cada manejador de clic

Para cada botón decorado con `data-nac-role="action"`, el manejador de clic
DEBE emitir `nac:action:succeeded` después de su efecto secundario sincrónico.

### Patrón A -- mediante `NAC.bindAction` (helper de v2.2, recomendado)

```ts
const btn = document.querySelector('[data-nac-id="<slug>.save"]');
NAC.bindAction(btn, function (ev) {
  saveInvoice();          // tu efecto secundario
}, { plugin: '<slug>', action_id: '<slug>.save' });
```

`bindAction` maneja automáticamente los casos síncronos, asíncronos (Promise) y de excepción.

### Patrón B -- emisión manual

```ts
button.addEventListener('click', function () {
  saveInvoice();
  document.dispatchEvent(new CustomEvent('nac:action:succeeded', {
    detail: { plugin: '<slug>', action_id: '<slug>.save' }
  }));
});
```

Para otros roles, emitir la familia de eventos canónicos:
- `role="field"` -> `nac:field:changed` (detail: `{plugin, field_id, value}`)
- `role="tab"` -> `nac:tab:activated` (detail: `{plugin, tab_id}`)
- Ver sección 6 de SPEC.md para la tabla completa.

**Verificar:** Desde la consola del navegador:
```js
document.addEventListener('nac:action:succeeded', e => console.log(e.detail));
await NAC.click('<slug>.save');
// Debe imprimir {plugin: '<slug>', action_id: '<slug>.save', ...}
```

---

## Paso 6 -- Conectar el panel de chat

Incluir el cliente de chat de referencia O usar Yujin Pilot (externo).

### Opción A -- incrustar `nac-chat-client.js`

```html
<aside class="chat" data-nac-plugin="chat" aria-hidden="true">
  <header class="chat-head">...</header>
  <div id="chat-log" data-nac-id="chat.log" data-nac-role="region"></div>
  <input id="chat-input" data-nac-id="chat.input" data-nac-role="field">
  <button id="chat-send" data-nac-id="chat.send" data-nac-role="action">send</button>
</aside>

<script src="https://yujin.app/nac-spec/js/nac-chat-client.js?v=v22"></script>
<script>
  NacChat.init({
    endpoint: '/api/your-llm-intermediary',
    chatLog: document.getElementById('chat-log'),
    input:   document.getElementById('chat-input'),
    sendBtn: document.getElementById('chat-send')
  });
</script>
```

Tú provees el `endpoint` -- el backend intermediario LLM que
recibe `{prompt, lang, history, nac_tree}` y devuelve
`{message, actions[]}`. Ver `LLM_WIRING.md`.

### Opción B -- delegar a Yujin Pilot

No incrustar chat. Indicar a los usuarios "instala Yujin Pilot
(yujin.app/pilot) para voz + chat en esta app". El escáner MCP de Pilot
descubre tu app y la controla desde su cockpit central.

---

## Paso 7 -- Ejecutar el corpus de pruebas

Copiar la infraestructura de pruebas de referencia de Yujin como punto de partida:

```bash
# Desde la raíz de tu proyecto
cp -r /path/to/rpaforce-crm/packages/nac/test ./test
cp -r /path/to/rpaforce-crm/tools/nac/test-launch.sh ./tools/test-launch.sh
```

Editar `test/stage*.mjs` para referenciar tu manifiesto y tu plugin
slug en lugar del demo. El esqueleto permanece idéntico.

Ejecutar:

```bash
bash ./tools/test-launch.sh
```

**Verificar:** Todas las capas del lado de Node en VERDE. Tiempo total < 15s.

---

## Paso 8 -- Agregar pruebas e2e con Playwright

```bash
mkdir -p tests/e2e-nac
cd tests/e2e-nac
npm init -y
npm install --save-dev @playwright/test
npx playwright install chromium
```

Copiar `tests/e2e-nac/specs/01-landing.spec.ts` de la referencia de Yujin
como plantilla; adaptar a la URL y plugin slug de tu app.

Para la **prueba completa del pipeline** (chat -> LLM -> dispatch -> DOM ->
ack), ver `08-pipeline-end-to-end.spec.ts` de Yujin. Tres pruebas
ejercitan el flujo completo contra tu backend en vivo.

---

## Paso 9 -- Lista de verificación para producción

Antes de desplegar:

- [ ] `NAC.STRICT_VALIDATION = true` -- aplica validación de roles
      en tiempo de registro (lanza error ante desviaciones).
- [ ] `npx @nac3/runtime validate ./src` -- cero hallazgos de severidad error.
- [ ] `npm test` (tu harness) -- 100% de aprobación.
- [ ] `npx playwright test` -- todas las pruebas e2e en verde.
- [ ] Multi-tenant: firmar manifiestos con HMAC del lado del servidor; llamar
      `NAC.set_provenance_secret()` desde código autenticado.
- [ ] Verbos protegidos por is_trusted: incluir explícitamente en la lista blanca
      cualquier verbo que los bots RPA / clics sintéticos deban poder disparar
      (ver SECURITY.md).
- [ ] i18n: cada `label_i18n` cubre los 10 locales (o usar
      `i18n_strict: 'permissive'` durante la migración).

---

## Paso 10 -- Promover a conformidad NAC-3

Ejecutar `NAC.validate_global({probe: true})`. El runtime sintetiza
clics contra cada elemento `role="action"` para verificar que cada uno
emita su confirmación dentro de 5s.

**Verificar:** cero hallazgos. El proyecto es conforme a NAC-3.

---

## Errores comunes de IA (y cómo evitarlos)

1. **Registrar el manifiesto sin `data-nac-plugin` en el DOM.**
   El `NAC.describe()` del runtime recorre el DOM, no el
   registro. Sin el atributo, el snapshot del intermediario LLM
   estará vacío para ese plugin. SIEMPRE emparejar los dos.
2. **Cerrar manejadores de chat sobre estado de React/Vue.** Usar refs o
   setters funcionales. Ver bug #2 en CASE_STUDIES_DISCOVERY.md.
3. **i18n parcial.** El validador estricto de v2.2 falla con mapas
   `label_i18n` incompletos. Si es necesario enviar parcial, usar
   `i18n_strict: 'permissive'` y crear un ticket TODO; no es un
   atajo permanente.
4. **Reutilizar IDs después de una refactorización.** Un botón renombrado a un nuevo
   rol semántico DEBE obtener un nuevo id. Reutilizarlo rompe todos
   los scripts de agentes posteriores.
5. **Olvidar el evento de confirmación.** Un manejador que realiza su trabajo
   de forma sincrónica pero no emite `nac:action:succeeded` hará que
   NAC.click() expire. Usar `bindAction` para incorporar el
   contrato desde el inicio.

---

## Ver también

- [SPEC.md](../SPEC.md) -- contrato canónico.
- [AI_PLAYBOOK_MIGRATION.md](AI_PLAYBOOK_MIGRATION.md) -- para
  proyectos brownfield.
- [NAC_TEST_MANUAL.md](../docs/NAC_TEST_MANUAL.md) -- manual de pruebas
  para cualquier app NAC-3.
- [REACT.md](REACT.md) / [ANGULAR.md](ANGULAR.md) -- guías detalladas por framework.

## Licencia

Apache-2.0.

---

*This is a machine translation of the canonical English
version at `/nac-spec/guides/AI_PLAYBOOK_NEW_PROJECT.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
