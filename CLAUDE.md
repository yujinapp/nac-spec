# nac-spec / NAC3 — arranque de sesión (know-how para IA coding)

Este archivo lo lee cualquier IA coding (incluido Yujin Forge) al **empezar** una sesión
sobre este repositorio, antes de tocar nada. Existe para que el contrato de convivencia y
el mapa operativo del sistema **no dependan de que alguien se acuerde** de leerlos.

Es la fuente de verdad **operativa** (qué es este sistema, cómo se entrega, dónde está cada
cosa). La narrativa de cómo se llegó a cada decisión vive en el registro de pendientes de
Forge y en los documentos de la toma (sección 4). **Si algo acá contradice al código, gana
el código** — y este archivo se corrige en el mismo commit (regla 4).

---

## 0. El contrato de convivencia — lectura obligatoria

**`docs/WORKING_AGREEMENT.md`.** Define cómo se trabaja sobre este sistema: diecisiete
reglas —las once del método y las seis que este sistema se ganó— y las decisiones del
dueño que no se reabren. **Aceptado completo por el dueño el 2026-10-30**: no quedan
propuestas, rige entero. **Se lee antes de la primera acción de la sesión**, no cuando
surge la duda.

Las cuatro que más se incumplen, resumidas para que no haya excusa de no haberlas visto —
el texto que rige es el del contrato, no este resumen:

* **Alcance exacto (3).** Ni más ni menos de lo pedido. Lo que se ve de paso se registra
  como pendiente con su evidencia; no se arregla de paso.
* **Nunca reportar como hecho algo no verificado (5).** Todo reporte se parte en tres y las
  tres se nombran: **verificado** (se corrió, se leyó, se reprodujo, con recibo),
  **creído** (se asume) y **punto ciego** (lo que este trabajo no puede ver).
* **No se reescribe (7).** Nada que no se haya pedido se refactoriza, y ningún módulo se
  reescribe, por más mejorable que parezca. Este sistema está publicado y tiene adoptantes:
  "lo mejoré" y "lo rompí para un adoptante" son el mismo cambio visto de dos lados.
* **El comportamiento actual es la especificación (10).** Una diferencia entre lo que el
  código hace y lo que el texto normativo dice es una **discrepancia que decide el dueño**,
  no un bug que se arregla en silencio. Se trae **en el momento**, de a una.

---

## 1. Qué es este sistema (y qué no)

NAC3 es un **protocolo** y su **presentación web**. No es un proyecto nuevo: ya está
publicado, ya tiene adoptantes, y cada cambio sale a producción.

* **La versión se declara una sola vez:** la constante `version:` del export `NAC` al final
  de `js/nac.js` (hoy `2.5.2`). Todo lo demás la **deriva** o la **declara**, y un gate
  rechaza el build si alguien discrepa (`npm run check:version`). Subir la versión = editar
  ese archivo y correr los generadores; nunca escribirla a mano en otro lado.
* **El inglés manda.** `SPEC.md` es el texto normativo. Las nueve traducciones viven en
  `i18n/<lang>/` y se regeneran en cada versión; los **identificadores no se traducen**
  (nombres de atributos, verbos, números y direcciones son idénticos letra por letra).
* **Lo que NO es parte del sistema** (decisión del dueño, 2026-10-24): el CRM y el
  intermediario de chat son **ejemplos de consumidor**, no el producto. No se los toma, no
  se los audita como parte de esto.
* **No hay datos propios:** sin base, sin cuentas, sin persistencia del lado del servidor.
  El respaldo del artefacto es la historia de git.

## 2. Las dos puertas de salida (contrato de entrega del dueño)

Un cambio **no está entregado** hasta que las dos puertas coinciden con el árbol:

* **Paquete:** `npm install @nac3/runtime` — se publica desde `runtime/` (hoy `2.5.2`,
  Apache-2.0). Candado: `scripts/verify-npm-publication.mjs` **trae de vuelta el tarball
  publicado** desde el registro, verifica sus bytes contra el hash que el registro declara,
  lo desempaqueta y compara todos los archivos en las dos direcciones contra el árbol de
  **esa** versión. Corre en cada push, en `check:release` y en el `postpublish` del paquete.
* **Sitio:** el `<script>` de `https://yujin.app/nac-spec/`, desplegado por
  `.github/workflows/deploy.yml` en cada push a `main`. Después del deploy,
  `smoke-live-landing.mjs` y `verify-contract-api.mjs` verifican **desde afuera** que lo que
  el servidor entrega es este árbol.

Lo que falta de este lado, y es del dueño: la publicación a npm todavía se hace **a mano**;
automatizarla necesita un `NPM_TOKEN` como secreto del repo (**PND-067**). Hoy una
publicación divergente no puede pasar inadvertida, pero todavía puede ocurrir.

## 3. La cadena es la batería de caracterización (no hay ambiente de prueba)

**Producción es el único destino** (decisión del dueño): no se propone armar un ambiente de
prueba. Por eso la cadena de `.github/workflows/deploy.yml` **es** la batería, y corre
entera **antes** del paso que despliega.

* Antes de empujar: **`npm run check:release`**.
* **Cada candado viene con su prueba en rojo al lado** (`test-*-gate.mjs`, `test-*.mjs`): un
  candado que nunca se vio fallar no es un candado. Si agregás uno, agregá su rojo.
* Hueco declarado: los gates que necesitan navegador (`test:limits`, `test:cli-levels`) no
  corren en CI (**PND-049**), y cinco scripts de etapa quedan fuera del candado. "La cadena
  está verde" **no** significa "todo lo que hay está probado", y no se dice como si lo fuera.

## 4. Dónde está cada cosa

| Qué | Dónde |
|---|---|
| Runtime fuente + versión autoritativa | `js/nac.js` |
| Paquete publicado (`dist/` lo genera `build.mjs`) | `runtime/` |
| Texto normativo + traducciones | `SPEC.md`, `i18n/<lang>/` |
| Candados, generadores y sus pruebas en rojo | `scripts/*.mjs` |
| Pruebas del runtime y de punta a punta | `runtime/test/`, `e2e/` |
| Portada y demos | `index.html`, `demos/`, `example-*.php` |
| Documentos de proceso | `docs/` |

Documentos de la toma, en orden: `docs/INITIAL_SURVEY.md` (hechos de entrada) ·
`docs/ELIGIBILITY.md` + `docs/ELIGIBILITY_CRITERIA.md` (si el sistema se podía tomar) ·
`docs/FUNCTIONALITY_RECOVERED.md` (qué hace hoy) · `docs/EVIDENCE_N0.md` (recibos) ·
`docs/WORKING_AGREEMENT.md` (el contrato) · **`docs/SEMANTIC_TREE.md` (el mapa
recuperado del sistema, con la fuente de cada nodo)** · **`docs/STATUS.md` (el
estado vivo: cada número con el comando que lo produce y su fecha)** ·
**`docs/DISCREPANCIES.md` (lo que no coincide, con la evidencia de las dos
puntas, esperando la decisión del dueño)**.

**Los tres últimos son la lectura mínima antes de tocar código.** El mapa evita
descifrar un módulo de nuevo (regla 8); el estado evita citar un número viejo
como si fuera de hoy (regla 14); las discrepancias evitan "arreglar" en silencio
algo que el dueño todavía no decidió (regla 10). Los tres se excluyen del
despliegue del sitio: son documentos de proceso, y el de discrepancias nombra
los puntos flojos del sistema.

## 5. El orden del trabajo sale del registro, no de la impresión

Lo que se trabaja sale del **registro de pendientes** de Forge (`yujin.pending.list`), no de
lo que parezca urgente en la conversación. Dos reglas que ya costaron tiempo:

* **El estado de un pendiente se mide antes de trabajarlo, no se lee.** El texto de un item
  dice la verdad del día en que se escribió: si dice "esperando al dueño", se busca la
  decisión antes de creerle.
* Lo que aparece de paso —un secreto en el código, un camino muerto, una regla duplicada,
  una consulta sin índice— **se registra con su evidencia**, no se arregla en el momento.

## 6. El método: Urazuke

El proyecto corre la escalera Urazuke para un sistema heredado (`WFL-001`): las tareas son
pendientes `[WFL-001]` y se cierran **en orden**. La estación actual y la consigna del
peldaño se consultan con `yujin.urazuke.status` / `yujin.urazuke.step`. Un peldaño cierra
cuando Forge lo evalúa **verde** con recibos, nunca con un resumen del agente.

**Compuerta de dimensionamiento (G9):** antes de escribir código que soporte carga hay que
registrar la volumetría, la retención y el envoltorio de hardware (`yujin.sizing.*`). Los
números los da el dueño; no se inventan.
