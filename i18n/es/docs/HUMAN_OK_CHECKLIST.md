---
translation_source: docs/HUMAN_OK_CHECKLIST.md
translation_source_hash: 2b87f1b0665762daf6be1ad520c7ba16f977d21771e6574ae60451039baada31
translation_quality: machine_v1
translation_lang: es
translation_date: 2026-05-11T13:28:24.490145+00:00
---

# NAC3 -- Checklist de aprobación humana (Human OK)

**Versión de spec:** 2.2 + vista previa v2.3.
**Última revisión:** 2026-05-11 (actualizar por cada release).
**Propósito:** forma ejecutable de la columna MAN en
[TEST_COVERAGE_MATRIX.md](TEST_COVERAGE_MATRIX.md). Una persona
recorre cada ítem y marca la casilla. Si algún ítem falla,
el release NO se publica -- registrar un bug y corregirlo antes de reintentar.

Esto NO reemplaza las pruebas automatizadas. El suite automático
(`bash tools/nac/test-launch.sh`) DEBE estar en verde antes de comenzar
este checklist. El checklist existe para todo lo que la automatización
no puede verificar: audio real, sensación cross-browser, redacción en
idioma nativo, handshake cross-origin con un peer en vivo, pulido visual.

---

## Cómo usar este documento

1. Abrir una ventana de incógnito nueva (Chrome + Firefox + Safari, en
   ese orden; repetir las secciones visuales para cada uno).
2. Recorrer las secciones en orden -- algunas dependen de que la
   anterior esté activa (por ejemplo, interop requiere que ambas demos
   hayan cargado).
3. Marcar cada `[ ]` solo cuando se confirme personalmente. No delegar.
   Si hay dudas, marcar `[?]` y consultar al responsable de la spec.
4. Al final, firmar y fechar el bloque SIGN-OFF.
5. Hacer commit del archivo con el nuevo sello de fecha de ejecución.

Tiempo estimado por pasada: **45-60 minutos**. No apresurarse; el
objetivo de esta puerta es precisamente lo que la automatización no detecta.

---

## 1. Artefactos de runtime

### 1.1 Smoke cross-browser -- `js/nac.js` + `nac-v2-extensions.js`

Para cada navegador (Chrome, Firefox, Safari):

- [ ] Abrir `https://yujin.app/nac-spec/example.php` en
      incógnito.
- [ ] La consola no muestra errores después de 5 segundos.
- [ ] `NAC.describe().plugins[0]` devuelve un objeto en la
      consola.
- [ ] `NAC.list_registered_plugins()` devuelve al menos un
      slug.
- [ ] Hacer clic en un botón decorado con `data-nac-role="action"`
      -- funciona Y se dispara un evento `nac:action:succeeded`
      (escuchar con `document.addEventListener` en la consola).

### 1.2 Cliente de chat en vivo -- `nac-chat-client.js`

- [ ] En `example-v21-data-table.php`, presionar el botón del micrófono.
- [ ] Decir "ve a permisos" -- el chat despacha un cambio de pestaña,
      no una respuesta de texto libre.
- [ ] Repetir en inglés ("go to permissions") + portugués
      ("vai para permissoes") -- despacho correcto.
- [ ] Decir "cambia de pestaña" -- el locale NO cambia a alemán
      (guardia de regresión para V22-03).

### 1.3 Runtime de interop -- `nac-mcp-interop.js`

- [ ] Abrir `example-v22-interop.php`.
- [ ] Usar los 4 CTAs en orden: Export tree -> Import remote ->
      List remote apps -> Disconnect remote.
- [ ] Cada CTA registra éxito en su panel de salida.
- [ ] Después de Disconnect, la app remota ya no aparece en
      `NAC.list_remote_apps()`.

---

## 2. Paquete NPM

### 2.1 Smoke de instalación limpia

- [ ] En un directorio de prueba:
      ```
      mkdir /tmp/nac-smoke && cd /tmp/nac-smoke
      npm init -y
      npm install @nac3/runtime
      node -e "import('@nac3/runtime').then(m => console.log(Object.keys(m)))"
      ```
- [ ] La salida incluye `NAC`, `registerPlugin`, validadores.
- [ ] Sin advertencias de deprecación durante la instalación.

### 2.2 Validador CLI en un proyecto externo

- [ ] Elegir cualquier proyecto que no sea de Yujin (una demo de
      adopción o cualquier carpeta).
- [ ] Ejecutar `npx @nac3/runtime validate .` desde su raíz.
- [ ] La salida es legible por humanos, lista 0 BLOCKERS, termina con 0
      si está limpio / distinto de cero si hay hallazgos.

---

## 3. Demos

### 3.1 Landing -- `index.html`

- [ ] La página renderiza con la marca sumi-e, sin FOUC.
- [ ] Hacer clic en "Autopilot" -- el tour de 5 segundos se ejecuta,
      narración audible (TTS, no silenciosa).
- [ ] Abrir el chat -- escribir "que es NAC3?" -- obtener una respuesta
      coherente, no un error.

### 3.2 Demo de referencia -- `example.php`

- [ ] Recorrer cada uno de los 27 widgets visibles en la página.
- [ ] Cero errores en consola después del recorrido completo.
- [ ] Cero widgets sin respuesta (ningún clic que no haga nada).

### 3.3 Demo brownfield -- `example-v20-full.php`

- [ ] `v20-panel` es visible en la parte superior derecha al cargar la página.
- [ ] Hacer clic en "describe_v2" -- el panel muestra salida JSON válida.
- [ ] Hacer clic en "validate_global_v2" -- el panel muestra hallazgos
      (o "0 findings, OK").
- [ ] Hacer clic en cada uno de los 6 botones del v20-panel -- todos
      emiten `nac:action:succeeded` (visible en consola si hay listener adjunto).
- [ ] Botón istrusted_fake -- el ack NO se dispara (el runtime rechaza
      correctamente los clics sintéticos para verbos con isTrusted).
- [ ] Botón istrusted_real (clic humano real) -- el ack SÍ se dispara.

### 3.4 Showcase de primitivos -- `example-v20-primitives-showcase.php`

- [ ] Cada uno de los 8 primitivos renderiza una sección con un
      ejemplo funcional.
- [ ] El texto didáctico de cada sección se lee correctamente
      (sin placeholders corruptos).

### 3.5 Demo de tabla de datos -- `example-v21-data-table.php`

- [ ] Presionar el micrófono, decir "agrega una linea con concepto leche
      cantidad 2 precio 100" -- aparece una fila en la tabla de colección.
- [ ] Decir "cuanto total hay?" -- el chat responde con un número, no
      con la tabla en bruto.
- [ ] Decir "ve a permisos" -- cambia de pestaña.

### 3.6 Demo de interop -- `example-v22-interop.php`

- [ ] Ya cubierto en 1.3 arriba.
- [ ] Bonus: abrir la página en dos pestañas del navegador, repetir el
      handshake -- debe seguir funcionando entre pestañas (cada pestaña
      es su propia instancia NAC, la capa de interop es el puente).

### 3.7 Caso de estudio React -- `demos/react/`

- [ ] Abrir `https://yujin.app/nac-spec/demos/react/`.
- [ ] Escribir "leche" en el campo de texto, hacer clic en "Add" --
      aparece el todo.
- [ ] Abrir el chat, decir (por micrófono) "agrega pan" -- el todo "pan"
      aparece a través del flujo impulsado por chat. Esta es la guardia
      de regresión para el bug #2 del caso de estudio.
- [ ] Decir "borra leche" -- el todo "leche" desaparece.

### 3.8 Caso de estudio Angular -- `demos/angular/`

- [ ] Las mismas 4 verificaciones que React, en
      `/nac-spec/demos/angular/`.

---

## 4. Documentación

Para cada uno de los documentos a continuación, leer de principio a fin
al menos una vez por release trimestral. Verificar:

- El sello de versión está actualizado (v2.2).
- Sin enlaces internos rotos.
- Sin TODOs pendientes.
- Los fragmentos de código compilan / se ejecutan tal como se muestran.

- [ ] `SPEC.md` (contrato canónico).
- [ ] `ABOUT.md`.
- [ ] `CONTRIBUTING.md`.
- [ ] `SECURITY.md` -- más relectura trimestral del modelo de amenazas.
- [ ] `README_DEMOS.md`.
- [ ] `docs/NAC_V22_ROADMAP.md`.
- [ ] `docs/NAC_TEST_MANUAL.md`.
- [ ] `docs/NAC_INTEROP_MCP.md`.
- [ ] `docs/NAC_LAUNCH_DIFFUSION.md`.
- [ ] `docs/CASE_STUDIES_DISCOVERY.md`.
- [ ] `docs/TEST_COVERAGE_MATRIX.md` (esta matriz es el documento hermano).
- [ ] `docs/VOICE_CHAT_ERROR_ANALYSIS_2026_05_09.md`.

## 5. Guías de adopción

Para cada guía, verificar que el snippet de hello-world siga compilando
y que los pasos lleven a un lector nuevo a una instalación funcional:

- [ ] `guides/REACT.md` -- el snippet compila en Vite + React 18.
- [ ] `guides/ANGULAR.md` -- el snippet compila en Angular 17
      standalone.
- [ ] `guides/LLM_WIRING.md` -- el backend de referencia en Node arranca
      y el contrato de prueba de ejemplo pasa.
- [ ] `guides/AI_PLAYBOOK_NEW_PROJECT.md` -- las aserciones de los pasos
      siguen coincidiendo con la API en tiempo de ejecución.
- [ ] `guides/AI_PLAYBOOK_MIGRATION.md` -- ídem.
- [ ] `guides/IMPACT_TESTING.md` -- los números se revisan para
      vigencia (reverificar cada trimestre).
- [ ] `guides/IMPACT_RPA.md` -- ídem.
- [ ] `guides/RPA_UIPATH.md` -- ejecutar el ejemplo `InvoiceFromCSV.xaml`
      una vez (o su equivalente en la última versión de UiPath
      Studio).
- [ ] `guides/RPA_AUTOMATION_ANYWHERE.md` -- flujo de trabajo de ejemplo
      equivalente.
- [ ] `guides/RPA_BLUE_PRISM.md` -- estudio de objeto de ejemplo
      equivalente.

---

## 6. Suites de pruebas

- [ ] Ejecutar `bash tools/nac/test-launch.sh` -- TODO EN VERDE en
      menos de 15 s.
- [ ] Inspeccionar el contador de smoke (`36 PASS`) -- coincide con
      el total esperado.
- [ ] Abrir `packages/nac/test/fixtures/voice/` -- elegir 1
      archivo por locale (10 archivos en total) -- reproducir en un
      reproductor de audio -- audible e inteligible.
- [ ] Verificar al azar 2 prompts de LLM de
      `stage3-backend.mjs` -- las respuestas tienen sentido, sin
      desviaciones.
- [ ] Ejecutar la suite de Playwright con `--headed` una vez
      (`npx playwright test --headed`) -- revisar visualmente la UI de
      cada spec mientras corre.
- [ ] Ejecutar `bash tools/nac/discovery-loop.sh 1` -- una ronda
      completa con 0 hallazgos.

---

## 7. Paquetes de casos de estudio

- [ ] `packages/nac-react-demo/` compila sin errores
      (`npm run build`).
- [ ] El dist de React desplegado se comporta de forma idéntica a la
      compilación local.
- [ ] `packages/nac-angular-demo/` compila sin errores.
- [ ] El dist de Angular desplegado se comporta de forma idéntica.

---

## 8. Aspectos transversales

### 8.1 i18n

- [ ] Elegir un locale (rotar por release) -- enviar a un
      hablante nativo para revisión puntual de 10 cadenas aleatorias.
- [ ] El validador confirma 0 claves faltantes en los 10
      locales (`NAC.validate_global({locale: 'all'})`).

### 8.2 HMAC + procedencia

- [ ] Ejecutar el smoke multi-tenant contra el tenant de staging --
      la firma del manifiesto se verifica, sin errores de
      `provenance_mismatch` en los logs.

### 8.3 Filtrado por isTrusted

- [ ] En `example-v20-full.php`, la prueba comparativa de istrusted_real vs
      istrusted_fake (cubierta en el punto 3.3 anterior) PASA la
      comparación visual: el real dispara el ack, el falso no.

### 8.4 Interoperabilidad cross-origin (vista previa v2.3)

- [ ] Al menos UNA prueba cross-origin antes de declarar v2.3
      GA: abrir la demo de interoperabilidad contra un peer NAC3 remoto
      alojado en un origen diferente, bearer token real, preflight CORS
      real. El roundtrip tiene éxito.

### 8.5 Despliegue

- [ ] Después del push del release, hacer curl a estas URLs y confirmar
      200 + contenido correcto:
      - `https://yujin.app/nac-spec/index.html`
      - `https://yujin.app/nac-spec/SPEC.md`
      - `https://yujin.app/nac-spec/js/nac.js`
      - `https://yujin.app/nac-spec/js/nac-chat-client.js`
      - `https://yujin.app/nac-spec/example.php`
      - `https://yujin.app/nac-spec/example-v21-data-table.php`
      - `https://yujin.app/nac-spec/example-v22-interop.php`
      - `https://yujin.app/nac-spec/demos/react/`
      - `https://yujin.app/nac-spec/demos/angular/`

### 8.6 Audio real

- [ ] Hardware real (micrófono y parlante de laptop) -- presionar el
      micrófono en el `example-v21-data-table.php` en vivo, hablar un
      prompt por locale (10 prompts en total) -- el despacho al LLM
      tiene sentido en cada locale.

---

## 9. Revisión con lector de pantalla (accesibilidad -- Track G7)

Esta sección recorre las demos con un lector de pantalla activado y
el monitor apagado (o con los ojos literalmente cerrados). Es el
requisito de acceso para el compromiso de accesibilidad en
[ACCESSIBILITY.md](ACCESSIBILITY.md).

Realizar esta sección con al menos DOS lectores de pantalla por release
(NVDA es la opción más sencilla en Windows; VoiceOver viene
preinstalado en macOS; JAWS si se dispone de licencia).

### 9.1 NVDA (Windows)

- [ ] Instalar NVDA (gratuito, nvaccess.org). Iniciar con
      Ctrl+Alt+N.
- [ ] Abrir `https://yujin.app/nac-spec/index.html` con el
      monitor apagado (o con los ojos cerrados).
- [ ] NVDA anuncia el título de la página + un esquema estructurado
      de encabezados (h1, h2, h3) al navegar con la tecla H.
- [ ] La tecla Tab alcanza cada control interactivo en un
      orden lógico; cada control anuncia claramente su rol +
      etiqueta.
- [ ] Abrir el panel de chat (NVDA lee que el campo de chat tiene
      role=textbox con una etiqueta clara).
- [ ] Escribir "que es NAC3?" + enviar -- NVDA lee la respuesta
      completa cuando llega.

### 9.2 NVDA en `example-v21-data-table.php`

- [ ] NVDA anuncia "Lines (collection) tab" + la pestaña
      Permissions al navegar con Tab.
- [ ] Al activar una pestaña, se anuncia el nuevo estado mediante el
      ack del evento `nac:tab:activated`.
- [ ] Cuando el LLM agrega una fila, NVDA lee el contenido de la
      nueva fila sin necesidad de acción (o con una sola flecha Abajo).

### 9.3 VoiceOver (macOS)

- [ ] Cmd+F5 para iniciar VoiceOver.
- [ ] Abrir `https://yujin.app/nac-spec/index.html`.
- [ ] VO+U abre el rotor; verificar que los encabezados, enlaces y
      controles de formulario estén poblados.
- [ ] VO+A lee la página completa de arriba a abajo -- tiene
      sentido semántico, no "div div div link link button".

### 9.4 VoiceOver en los casos de estudio de React + Angular

- [ ] En `demos/react/`: agregar una tarea mediante el campo de entrada
      usando solo el teclado + VoiceOver. La nueva tarea se
      anuncia al agregarse (el evento ack está conectado).
- [ ] En `demos/angular/`: misma prueba, misma expectativa.

### 9.5 Navegación solo con teclado (sin lector de pantalla, sin ratón)

- [ ] Desconectar/deshabilitar el ratón.
- [ ] Recorrer la página de inicio usando solo la tecla Tab. Cada punto
      de foco es visible (anillo de foco presente).
- [ ] Abrir el panel de chat con el teclado, escribir un prompt,
      enviar. El resultado se narra / muestra correctamente.
- [ ] Escape cierra cualquier modal que se haya abierto.
- [ ] Sin trampas de teclado (Tab eventualmente vuelve al
      inicio).

### 9.6 Alto contraste + zoom al 200%

- [ ] Zoom del navegador al 200% en la página de inicio. El diseño NO
      se rompe, sin scroll horizontal, sin texto superpuesto.
- [ ] Modo de alto contraste de Windows (o Aumentar contraste en macOS).
      Botones, enlaces y anillos de foco siguen siendo visibles.

### 9.7 Control por voz (el caso recursivo)

- [ ] En un navegador con Pilot habilitado (o usando el botón de
      micrófono del `nac-chat-client.js` de referencia), controlar las
      demos solo por voz.
- [ ] El botón de micrófono anuncia su estado a NVDA/VoiceOver
      ("recording started", "recording stopped").
- [ ] Los comandos de voz despachados mediante NAC3 surten efecto; el
      ack se anuncia al lector de pantalla.

### 9.8 Problemas de accesibilidad encontrados

Listar aquí cualquier problema encontrado en esta sección, con su severidad:

```
-
-
-
```

Si hay algún problema de severidad BLOQUEANTE abierto, el release NO
se publica hasta que sea resuelto.

---

## APROBACIÓN FINAL

```
Etiqueta de release:    v____._.___
Revisado por:           ______________________
Revisado el:            ____-____-____
Navegadores usados:     [ ] Chrome  [ ] Firefox  [ ] Safari
Hablantes nativos consultados (locale -> nombre):
   ____________________________________________
Total de ítems revisados:  ___ / ___
Ítems fallidos (listar con enlaces a bugs):
   ____________________________________________
   ____________________________________________
Firma:                  ______________________
```

Hacer commit de este archivo con el bloque de APROBACIÓN FINAL completo para marcar el
release como "aprobado por persona".

---

## Ver también

- [TEST_COVERAGE_MATRIX.md](TEST_COVERAGE_MATRIX.md) -- la
  matriz de la que deriva este checklist.
- [NAC_TEST_MANUAL.md](NAC_TEST_MANUAL.md) -- el playbook original
  para adoptantes.
- [COVERAGE_REPORT_2026_05_10.md](COVERAGE_REPORT_2026_05_10.md)
  -- el registro de cobertura automática para el release actual.

## Licencia

Apache-2.0.

---

*This is a machine translation of the canonical English
version at `/nac-spec/docs/HUMAN_OK_CHECKLIST.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
