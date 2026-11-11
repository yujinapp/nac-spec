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
* **El nombre público es `nac-spec`; el protocolo se llama NAC3** (decisión del dueño,
  2026-11-07, `docs/DECISIONS.md` D-07, textual: *"nac-spec como nombre público. Paquete
  sigue nac3"*). La vidriera --- descripción del repositorio, etiquetas, `keywords` de npm,
  prosa de presentación --- dice `nac-spec`, que es por donde la gente lo busca; el texto
  normativo sigue diciendo NAC3. **El paquete (`@nac3/*`) y los identificadores
  (`data-nac-*`) no se renombran**: npm no renombra --- se publica otro nombre y se deprecia
  el viejo, y los dos quedan para siempre --- y los identificadores son 631 archivos que el
  `SPEC.md` declara idénticos letra por letra en las nueve traducciones. Un pedido de
  renombrar el paquete o los identificadores contradice una decisión del dueño y se le trae
  antes de ejecutarlo. Dato que conviene no perder: los atributos se llaman `nac`, **no**
  `nac3`, así que la colisión del nombre NAC3 con el compilador de ARTIQ/M-Labs no los toca.
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

**Regla confirmada por el dueño el 2026-10-30** (*"se escribe que este sistema se sirve
bajo /nac-spec/ y no en otra raíz, y se le pone un candado que lo verifique"*,
`docs/DECISIONS.md` D-02): **este sistema se sirve bajo `/nac-spec/` y no se soporta en otra
raíz.** Las 273 páginas generadas cargan el runtime por ruta absoluta porque un solo
productor (`scripts/build-spec-html.mjs`) emite un prefijo para páginas que viven a seis
profundidades distintas; las 14 escritas a mano lo cargan relativo y sí abren en cualquier
raíz. Un árbol levantado en otra dirección **no** es una instalación degradada: es una
configuración que este proyecto no promete. El candado es `scripts/check-mount-path.mjs`
(las páginas, la resolución de los `<script>` relativos, y las diez declaraciones del
literal `/nac-spec/` —incluido el destino del `rsync`— enfrentadas entre sí) con su rojo
`scripts/test-mount-path.mjs`. Un pedido de hacer el árbol servible desde cualquier raíz
contradice esta decisión y se le trae al dueño antes de ejecutarlo.

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
| Normas de programación (RFC, estilo, doctrina de pruebas) | `PROJECT.md` |

Documentos de la toma, en orden: `docs/INITIAL_SURVEY.md` (hechos de entrada) ·
`docs/ELIGIBILITY.md` + `docs/ELIGIBILITY_CRITERIA.md` (si el sistema se podía tomar) ·
`docs/FUNCTIONALITY_RECOVERED.md` (qué hace hoy) · `docs/EVIDENCE_N0.md` (recibos) ·
`docs/WORKING_AGREEMENT.md` (el contrato) · **`docs/SEMANTIC_TREE.md` (el mapa
recuperado del sistema, con la fuente de cada nodo)** · **`docs/STATUS.md` (el
estado vivo: cada número con el comando que lo produce y su fecha)** ·
**`docs/DISCREPANCIES.md` (lo que no coincide, con la evidencia de las dos
puntas, esperando la decisión del dueño)** · **`docs/DECISIONS.md` (lo que el
dueño ya decidió, con su frase textual y la fecha)**.

**Regla confirmada por el dueño el 2026-10-30** (*"Se queda como está"*,
`docs/DECISIONS.md` D-01): el **mapa** del sistema es `docs/SEMANTIC_TREE.md` y
no hay otro; `PROJECT.md` **no** es el mapa, es el manual de normas, y no se
convierte ni se reescribe; la puerta de entrada de cada sesión es **este**
archivo. Un pedido de mudar el mapa a `PROJECT.md` contradice una decisión del
dueño y se le trae antes de ejecutarlo.

**Los cuatro últimos son la lectura mínima antes de tocar código.** El mapa evita
descifrar un módulo de nuevo (regla 8); el estado evita citar un número viejo
como si fuera de hoy (regla 14); las discrepancias evitan "arreglar" en silencio
algo que el dueño todavía no decidió (regla 10), y las decisiones evitan
reabrir algo que ya decidió. Los cuatro se excluyen del despliegue del sitio:
son documentos de proceso, el de discrepancias nombra los puntos flojos del
sistema y el de decisiones cita al dueño textualmente. Esa lista de exclusión
se mantiene **a mano** y nada la verifica.

**Dónde nace un documento interno nuevo: `docs/internal/`.** Desde el
2026-11-07 el despliegue excluye **ese directorio entero** con una sola regla
anclada (`--exclude='/docs/internal/'`), así que un documento de trabajo que
nace ahí queda fuera del sitio **por omisión**, sin que nadie se tenga que
acordar. Ahí viven los documentos de trabajo que llevan lectura comercial,
nombran a una organización identificable o razonan sobre un acuerdo todavía no
firmado: la medición de visibilidad, la investigación de aocr.org, el traspaso
del 11-nov, la lectura del contrato de Alignerr y la medición de los enganches
que faltan en el contrato de extensión (`CANVAS_HOOKS_AUDIT_2026-11-11.md`).
La exclusión es por directorio, así que un archivo nuevo ahí **no** cambia nada
de lo verificado abajo. Verificado el 2026-11-07 corriendo el `rsync` del
propio workflow en seco, con control positivo y prueba en rojo: con la
exclusión suben 1313 archivos y ninguno de `docs/internal/`; sin ella suben
1317 y la diferencia son exactamente esos cuatro; `docs/ELIGIBILITY.md` sube en
los dos casos, que es lo que prueba que la sonda sí ve `docs/`.

**Lo que esto NO arregla:** un documento interno escrito directo en `docs/` --
no bajo `docs/internal/` -- **sigue publicándose por omisión**, y los seis
nombres de la lista siguen a mano sin candado
(`.github/workflows/deploy.yml`, paso *Stage files for upload*). No se
construyó candado a propósito: lo que falta decidir es **qué** debe ser
público (**PND-068**), y un candado hecho antes de esa decisión clavaría el
criterio equivocado.

## 5. El orden del trabajo sale del registro, no de la impresión

Lo que se trabaja sale del **registro de pendientes** de Forge (`yujin.pending.list`), no de
lo que parezca urgente en la conversación. Dos reglas que ya costaron tiempo:

* **El estado de un pendiente se mide antes de trabajarlo, no se lee.** El texto de un item
  dice la verdad del día en que se escribió: si dice "esperando al dueño", se busca la
  decisión antes de creerle.
* Lo que aparece de paso —un secreto en el código, un camino muerto, una regla duplicada,
  una consulta sin índice— **se registra con su evidencia**, no se arregla en el momento.

## 6. El método: Urazuke -- **reactivado por decisión del 2026-11-11, interruptor todavía apagado**

**Decisión del dueño, 2026-11-11** (*"Justamente me interesa prender la escalera urazuke.
Es el mayor jugo que le puede servir a alignerr para entrenar sus modelos para hacer
software."*, `docs/DECISIONS.md` **D-08**): la escalera **vuelve a estar vigente**, y el
motivo es externo al proyecto --- el recorrido mismo, con su veredicto de máquina por
peldaño, es lo que un entrenador de modelos puede usar.

**Pero el estado del sistema todavía es el de abajo, y por eso se lee igual.** Lo que se
apagó el 7-nov fue el interruptor de la configuración de Forge, y **sólo lo prende el
dueño** en *Ajustes > Urazuke*. Sondeado el 2026-11-11, `yujin.urazuke.status` seguía
contestando *"Urazuke is disabled for this Forge"*. Mientras siga así rige todo lo que
sigue: no hay recibos y los cierres van con la salida escrita. **No se asuma el estado
por haber leído la decisión: se sondea.** El plan recalculado con la escalera adentro
---~135 h de modelo, ~164 h del dueño, calibradas contra la corrida medida de
`C:/urazuke-exp`--- está en `docs/internal/AI_HANDOFF_REPORT_2026-11-11.md`, sección 2.4.

**Decisión anterior, 2026-11-07** (*"Apaga el método urazuke, no le des bolilla por
ahora. Ya lo apagué del config."*, `docs/DECISIONS.md` D-06): el método está **apagado
en la configuración de Forge**. Suspendido *"por ahora"*, no derogado --- y **D-08
terminó ese *por ahora***. Mientras el interruptor siga apagado, `yujin.urazuke.*` y
**`yujin.evidence.run`** contestan *"Urazuke is disabled for this Forge"*, así que no se
los invoque esperando que respondan.

Lo que eso obliga, y hay que saberlo antes de cerrar algo: **el proyecto no puede
producir recibos de evidencia**, y el registro de pendientes exige la terna (prueba en
rojo + verde + regresión) para cerrar con `shipped`. Hay que usar la salida escrita del
propio registro (`sin_recibos_porque`), transcribiendo los comandos y sus resultados para
que el dueño los pueda correr tal cual --- y cada cierre así queda **contado como
excepción** en `pending stats`. Eso es la medida de la suspensión y conviene que se vea.

**Lo que NO cambió:** las tareas `[WFL-001]` siguen abiertas en el registro (PND-004 a
PND-028), el trabajo sigue saliendo del registro y no de la impresión (sección 5), y el
contrato de convivencia (sección 0) rige entero. Lo que se apagó es la escalera y sus
recibos.

Cómo era, para cuando se vuelva a encender: el proyecto corría la escalera Urazuke para un
sistema heredado (`WFL-001`), las tareas eran pendientes `[WFL-001]` que se cerraban **en
orden**, la estación y la consigna del peldaño se consultaban con `yujin.urazuke.status` /
`yujin.urazuke.step`, y un peldaño cerraba cuando Forge lo evaluaba **verde** con recibos,
nunca con un resumen del agente.

**Compuerta de dimensionamiento (G9):** antes de escribir código que soporte carga hay que
registrar la volumetría, la retención y el envoltorio de hardware (`yujin.sizing.*`). Los
números los da el dueño; no se inventan.
