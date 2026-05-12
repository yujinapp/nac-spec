---
translation_source: CONTRIBUTING.md
translation_source_hash: 15fa7e8a34cc86e6193de8cd9826a9bd98d4b3ac1c72a43646521d75f88f9a26
translation_quality: machine_v1
translation_lang: es
translation_date: 2026-05-11T12:46:30.674888+00:00
---

# Contribuir a NAC3

**Versión de la especificación:** 2.2 estable (+ vista previa de interoperabilidad v2.3).

## Gobernanza

NAC3 está actualmente bajo la administración de Yujin. La especificación tiene licencia Apache 2.0; el runtime de referencia tiene licencia MIT. Yujin se compromete a trasladar NAC3 a una fundación neutral (grupo comunitario W3C, Linux Foundation o equivalente) si y cuando la adopción justifique una gobernanza neutral. Hasta entonces, los cambios a la especificación siguen el proceso RFC descrito a continuación, con al menos 14 días de comentario público para cualquier cambio en la API pública o en los formatos de wire.

Las licencias Apache 2.0 + MIT garantizan que la especificación y el runtime sobrevivan a cualquier cambio en el estado corporativo de Yujin. Los forks son explícitamente bienvenidos bajo ambas licencias.

---

Gracias por considerar una contribución. NAC3 es una especificación pública más una implementación de referencia; ambas aceptan contribuciones.

## Tres tipos de contribución

### 1. Cambio a la especificación (requiere RFC)

Las ediciones a `SPEC.md`, `ABOUT.md` o `docs/NAC_V*_ROADMAP.md` son cambios a la especificación. Antes de abrir un PR:

1. Abre un issue en GitHub con el título `RFC: <resumen en una línea>`.
2. Describe la clase de problema (qué error o limitación corrige, idealmente con una reproducción concreta).
3. Describe el cambio de contrato propuesto.
4. Describe la ruta de migración para los adoptantes existentes.
5. Espera al menos una respuesta de un mantenedor en el issue antes de abrir el PR.

Los PRs de especificación que lleguen sin un issue RFC asociado serán cerrados con un enlace a esta sección.

### 2. Cambio al runtime de referencia

Ediciones a `js/nac.js`, `js/nac-v2-extensions.js` o `js/nac-chat-client.js`. Los PRs son bienvenidos sin RFC si:

- El cambio es una corrección de error que alinea el runtime con la especificación actual.
- El cambio es una mejora de rendimiento sin delta de comportamiento.
- El cambio es documentación, tipos o cobertura de pruebas.

Los PRs que cambien el comportamiento del runtime de una manera que afecte el contrato de la especificación DEBEN ir acompañados primero de un RFC de especificación.

### 3. Demo, herramientas o mejora de documentación

Ediciones a `example*.php`, `tools/`, `guides/`, o cualquier markdown que no sea de especificación. PR directo. Mantén los cambios mínimos; preferimos diez PRs pequeños a uno grande.

## Estilo de código

- Archivos fuente solo ASCII (el proyecto se despliega en GoDaddy; PHP 8.3 rechaza caracteres no ASCII incluso en comentarios). Usa `--` para los guiones largos, no `--`.
- JS: sin transpilador, sin bundler, sin paso de compilación en los archivos del runtime. ES2018+ puro. El paquete npm agrega un wrapper ESM/CJS alrededor del mismo código fuente.
- PHP: mantén los heredocs simples (solo `{$var}`, sin expresiones).
- Comentarios: explica el POR QUÉ, no el QUÉ. El diff ya muestra el qué.
- Pruebas: todo cambio de comportamiento debe incluir una prueba que falle antes y pase después. Ejecuta `make test-launch` desde la raíz del repositorio antes de hacer push.

## Estilo de commits

- Asunto de menos de 70 caracteres, imperativo en tiempo presente.
  "fix(nac): treat tab role drift as register-time error", no
  "Fixed tab thing".
- El cuerpo explica el problema, la causa y la solución. Cita commits relacionados por SHA corto.
- El trailer de co-autor para commits asistidos por IA está permitido; no ocultamos las herramientas utilizadas.

## Revisión

- PRs de corrección de errores: 1 aprobador, merge.
- PRs de runtime/especificación: 1 aprobador + CI en verde, merge.
- PRs de cambio a la especificación: issue RFC asociado con discusión + 1 aprobador + CI en verde + ventana de comentarios de 7 días después de que se abra el PR.

## Licenciamiento

Al enviar un PR, licencias tu contribución bajo Apache-2.0 para coincidir con el proyecto. La plantilla del PR incluye una casilla de verificación; márcala.

## Código de conducta

Sé técnicamente correcto, conciso y amable. El desacuerdo está bien; los ataques personales no. Los mantenedores pueden cerrar hilos o revocar el acceso de commit ante violaciones reiteradas.

## Dónde hacer preguntas

- GitHub Discussions para preguntas de diseño, "¿debería usar NAC3 para esto?" y presentaciones de proyectos.
- GitHub Issues para reportes de errores.
- `nac@yujin.dev` para divulgaciones de seguridad (ver `SECURITY.md`).

---

*This is a machine translation of the canonical English
version at `/nac-spec/CONTRIBUTING.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
