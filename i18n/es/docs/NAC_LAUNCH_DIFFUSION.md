---
translation_source: docs/NAC_LAUNCH_DIFFUSION.md
translation_source_hash: cbdf7b9e5ec3ed43a39111aab16fbe59c222a05a835429ea43148036320fc5cf
translation_quality: machine_v1
translation_lang: es
translation_date: 2026-05-11T13:31:26.204680+00:00
---

# Plan de difusión del lanzamiento de NAC3

Un manual práctico para poner NAC3 frente a las personas que
deberían usarlo. Escrito el 2026-05-10 para el lanzamiento de
v2.2 / v2.3-preview.

## Qué estamos lanzando

- **Spec:** v2.2 estable, v2.3 preview (primitiva de editor de campos).
- **Runtime:** `@nac3/runtime@2.2.0` en npm (ESM + CJS + d.ts + CLI).
- **Demos:** cuatro demos en vivo en yujin.app/nac-spec/.
- **Guías de adopción:** React + Angular + conexión con LLMs.
- **Casos de estudio:** apps funcionales con Vite + React 18 y Angular 17 en
  `packages/nac-react-demo` + `packages/nac-angular-demo`.
- **Historia de migración brownfield:** el propio Yujin CRM, documentado
  en pkuschnirof/yujin docs/MIGRATION_FROM_RPAFORCE.md.
- **Conformidad NAC-3:** la propia landing page cumple con NAC-3
  (manifest + chat + autopilot + isTrusted-aware).

## Mensajes clave

### Una línea

> **NAC3 -- la pequeña spec pública que permite que las UIs web sean manejadas por agentes de IA,
> runners de voz y herramientas de accesibilidad sin código de integración por aplicación.**

### Tres líneas

> NAC3 es lo que ARIA habría sido si se hubiera diseñado en
> 2026 pensando en LLMs. Decora tu UI existente con tres
> atributos HTML; el runtime resuelve nombres + despacha clics
> + emite eventos de finalización + maneja localización + provee
> procedencia. Apache-2.0, npm install, sin cambios en el proceso de build.

### Pitch de 30 segundos

> Los asistentes de voz, los agentes de chat con LLMs y las herramientas de
> accesibilidad enfrentan el mismo problema: necesitan nombres estables para
> los elementos sobre los que quieren actuar. Los selectores CSS se rompen.
> ARIA se queda en "esto es un botón". Cada equipo construye la misma
> infraestructura desde cero.
>
> NAC3 es el pequeño contrato que resuelve esto. Agregas `data-nac-id`,
> `data-nac-role`, `data-nac-action` a los elementos que un agente
> debe manejar; el runtime se encarga del resto. Hay una
> spec v2.2 funcional, un paquete npm estable, guías para React + Angular,
> y cuatro demos en vivo, incluyendo uno conectado de extremo a extremo a
> un backend de chat con Claude Sonnet con el que puedes hablar ahora mismo.
>
> Es Apache-2.0. Lo creamos porque tenemos un CRM que lo necesitaba.
> Ahora tú también puedes usarlo.

## Audiencias objetivo

| Audiencia | Canal | Gancho |
|-----------|-------|--------|
| Devs de React + Vue + Svelte + Angular | dev.to, Hashnode, r/javascript, r/webdev | "Maneja tu app React existente por voz en 80 líneas" |
| Constructores de voz + agentes | r/LocalLLaMA, r/ChatGPTCoding, Discords de builders de agentes | "El estándar que le faltaba al lado del usuario en las apps de voz" |
| Defensores de la accesibilidad | r/Accessibility, listas de correo de a11y, speakers de meetups de A11y | "ARIA diseñado en 2026 pensando en LLMs" |
| Ingenieros de testing/QA | r/qualityassurance, comunidades de Selenium / Playwright | "Selectores estables que sobreviven rediseños de UI" |
| HN | news.ycombinator.com | el Show HN canónico |
| Tech leads + CTOs | LinkedIn, Mastodon | el ángulo de "de todas formas lo agregarás en 12 meses" |
| Usuarios de Yujin CRM | email directo + banner en el producto | "tu CRM habla NAC3; esto es lo que significa" |

## Canales + publicaciones de ejemplo

### Show HN

- **Título:** `Show HN: NAC -- a small public spec that lets web UIs be driven by AI agents`
- **Primera línea:** "We made this while building Yujin CRM and realised every team trying to ship voice/agent UI rebuilds the same plumbing."
- **Cuerpo:** explicar el contrato (3 atributos + manifest + eventos), enlazar el demo en vivo, enlazar la spec, enlazar el paquete npm, enlazar el caso de estudio de React. Mantenerlo en menos de 200 palabras. Los hilos de comentarios generan más atención que los posts largos.
- **Día:** martes o miércoles por la mañana (hora de EE. UU.). Evitar lunes y viernes.
- **Seguimiento:** estar en los comentarios al menos 4 horas; responder cada pregunta técnica; no responder a provocaciones.

### r/javascript

- **Título:** `[Showoff] NAC: drive your React app with voice + chat using 3 HTML attributes`
- **Cuerpo:** enfocarse en "qué hace el desarrollador que adopta React" -- ejemplos de código de `guides/REACT.md`. Enlazar el directorio del caso de estudio en GitHub.

### r/Accessibility

- **Título:** `NAC: a parallel layer to ARIA for AI-agent-driven UI`
- **Cuerpo:** comenzar con "esto NO es un reemplazo de ARIA, es un complemento" -- la comunidad de accesibilidad es protectora, con razón. Mostrar cómo `data-nac-role="action"` y `role="button"` coexisten.

### dev.to

- **Título:** `Drive any web UI by voice with @nac3/runtime`
- **Gancho:** el repositorio del caso de estudio de React. Capturas de pantalla/gifs del panel de chat + el tour de autopilot.
- **Extensión:** 1500-2000 palabras. Paso a paso.

### Twitter / X

Un hilo de 6 tweets:

1. "Acabamos de lanzar NAC3 v2.2 -- una spec pública + paquete npm que permite que las UIs web sean manejadas por agentes de IA. Apache-2.0. (gif del demo)"
2. "Por qué: cada equipo que construye UX de voz/agentes reconstruye la misma infraestructura. Los selectores CSS se rompen. ARIA no está diseñado para agentes. Necesitábamos un contrato pequeño."
3. "Qué tan pequeño: 3 atributos HTML por elemento. (captura de código)"
4. "Qué obtienes: nombres estables, eventos de finalización deterministas, i18n en 10 locales de fábrica, procedencia vía HMAC + isTrusted, validación automática."
5. "Demo en vivo en yujin.app/nac-spec -- cuatro demos, uno conectado a un backend de chat con Claude Sonnet. Habla con él."
6. "Guías de adopción para React + Angular + casos de estudio funcionales en github.com/yujinapp/nac-spec. Spec en yujin.app/nac-spec/SPEC.md."

### LinkedIn

Post de formato largo (~600 palabras). Apoyarse en el ángulo de "de todas formas lo agregarás en 12 meses"; dirigido a CTOs que evalúan su estrategia de agentes. Incluir una captura del tour de autopilot con forma de BPMN.

### Mastodon

Repostear el hilo de Twitter, mantenerlo conciso. Incluir texto alternativo en cada imagen (importa mucho allí).

## Plan de gif/video del demo

### Gif (15 segundos, en bucle)

Escena 1 (4s): el usuario escribe "agrega tomar agua" en el input de chat del
demo de React.
Escena 2 (3s): el LLM resuelve; la tarea se agrega con un
destello de resaltado.
Escena 3 (4s): el usuario hace clic en "tour"; el autopilot recorre la página
narrando.
Escena 4 (4s): el usuario sostiene el micrófono, dice "remove all done", las tareas
desaparecen.

Alojado como MP4 de 8MB + fallback WebP de 4MB en
`yujin.app/nac-spec/assets/demo.{mp4,webp}`. Usado como gif hero del README,
imagen OG, tarjeta de Twitter, encabezado de dev.to.

### Video (90 segundos, con narración)

Publicado en YouTube + Vimeo.
- 0:00-0:10 -- el problema ("la voz + los agentes necesitan nombres estables").
- 0:10-0:25 -- el contrato (3 atributos).
- 0:25-0:45 -- demo de adopción (caso de estudio de React, 5 líneas agregadas).
- 0:45-1:05 -- manejo vía chat + voz + autopilot.
- 1:05-1:20 -- ejemplo brownfield del Yujin CRM.
- 1:20-1:30 -- "Apache-2.0, npm install @nac3/runtime, links abajo."

## Cadencia de seguimiento

| Tiempo | Acción |
|--------|--------|
| Día 0 | Show HN + r/javascript + hilo de Twitter + artículo en dev.to. Responder comentarios durante 4-8 horas. |
| Día 1 | Post en LinkedIn. Responder comentarios en dev.to. Agregar al backlog de GitHub los issues fáciles que surjan. |
| Día 3 | Post en r/Accessibility + crosspost en Mastodon. |
| Día 7 | Post de blog "Reflexión de la semana 1": qué feedback recibimos, qué cambiamos, los principales issues abiertos en GitHub. |
| Día 14 | Contactar por DM a personas específicas de accesibilidad / builders de agentes que participaron el día 0 con un "¿quieres charlar?". |
| Día 30 | Lanzar un parche v2.2.x con las correcciones más solicitadas por la comunidad. Post de anuncio: "lo que 30 días nos enseñaron sobre NAC3". |
| Día 90 | NAC3 v2.3 se lanza (editor de campos canónico, STRICT_VALIDATION por defecto en true). Nuevo pulso de lanzamiento, menor alcance. |

## Métricas a seguir

- Descargas semanales de `@nac3/runtime` en npm.
- Estrellas + forks en GitHub en `yujinapp/nac-spec` y
  `pkuschnirof/yujin`.
- Vistas de la página del demo en yujin.app/nac-spec/ (logs de acceso del servidor).
- Número de issues abiertos en GitHub (indicador de participación).
- Número de comentaristas únicos en todos los canales mencionados.
- Tendencia de búsqueda de "Native Agent Contract" (Google Trends).

Objetivos para la semana 1:
- 200 descargas en npm
- 100 estrellas en GitHub entre ambos repositorios
- 5000 vistas de la página del demo
- 10 issues / discusiones abiertas
- 1 post de blog no solicitado por alguien externo

Si no alcanzamos esos números por un 50% o más, los mensajes necesitan trabajo; iterar
el copy del post de LinkedIn + dev.to e intentarlo de nuevo en el día 14.

## Lista de verificación previa al lanzamiento (antes de publicar)

- [ ] `npm publish @nac3/runtime@2.2.0` completado (esto es **manual**;
      requiere el token npm del propietario).
- [ ] `npm install @nac3/runtime` funciona desde un directorio tmp limpio.
- [ ] Los demos en vivo cargan sin errores de consola en Chrome + Firefox + Safari.
- [ ] `validate_global({probe: true})` retorna `[]` en la landing.
- [ ] El gif del demo se renderiza correctamente en las tarjetas de vista previa de dev.to + Twitter.
- [ ] `LICENSE`, `CONTRIBUTING`, `SECURITY` todos en su lugar.
- [ ] Al menos un issue abierto en GitHub etiquetado como "good first issue"
      para que los colaboradores que lleguen el día 1 tengan por dónde empezar.
- [ ] Pablo está despierto + listo para responder comentarios durante 4 horas.

## Anti-objetivos

Lo que NO haremos:

- Pagar por publicidad (hasta tener al menos las métricas de la semana 4).
- Hablar mal de ARIA, Selenium, Playwright o cualquier proveedor de agentes.
  NAC3 es aditivo, no adversarial.
- Prometer contratos de soporte empresarial en el lanzamiento (eso viene
  después de conocer la carga de soporte).
- Open-source-washing: el código ES Apache-2.0, Y la implementación de referencia
  del backend de chat también. No separamos características "core" de "premium"
  como ventaja competitiva -- la ventaja es el hosting + créditos de LLM + operaciones.

## Manual del día del lanzamiento

Con tiempo acotado porque Pablo lo maneja solo:

| Hora | Acción |
|------|--------|
| 06:00 (ET de EE. UU.) | Verificación final: `npm test` + `npx @nac3/runtime validate yujin.app/nac-spec/` + abrir todos los demos en modo incógnito. Corregir lo que esté roto. |
| 09:00 | Show HN publicado. |
| 09:05 | Hilo de Twitter publicado. |
| 09:15 | Post en r/javascript publicado. |
| 09:30 | Artículo en dev.to publicado. |
| 09:30-13:30 | En vivo en los comentarios de HN. Fijar un comentario destacado con enlaces rápidos. |
| 14:00 | Post en LinkedIn. |
| 14:00-18:00 | En vivo en comentarios de dev.to + menciones de Twitter. |
| 18:00 | Parar. Descansar. |
| Día 1 09:00 | r/Accessibility + Mastodon. Clasificar issues de GitHub. |

---

*This is a machine translation of the canonical English
version at `/nac-spec/docs/NAC_LAUNCH_DIFFUSION.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
