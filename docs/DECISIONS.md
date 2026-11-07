# Decisiones del dueño -- nac-spec (NAC3)

Estación: **N2 -- la lectura del sistema** (Urazuke, entrada de un legado).
Abierto el **2026-10-30**. Dueño: Pablo Kuschnirof. Escribe: Forge (el agente).
Discrepancias abiertas: `docs/DISCREPANCIES.md` · Mapa: `docs/SEMANTIC_TREE.md` ·
Contrato: `docs/WORKING_AGREEMENT.md`.

**Qué es este documento.** Cada discrepancia que el dueño decide se escribe acá
con **su frase textual** y la fecha. No se parafrasea, no se "mejora" la
redacción y no se agrega una decisión que el dueño no haya dicho. Lo que el
agente agrega va aparte, marcado como *consecuencia* (lo que la decisión obliga
a hacer) o como *abierto* (lo que la decisión **no** resolvió).

Las decisiones de alcance anteriores a esta estación -- qué es el producto, qué
no, las dos puertas de salida, que no hay ambiente de prueba -- están en la
tabla de decisiones de `docs/WORKING_AGREEMENT.md` y no se repiten acá.

---

## D-01 -- El rol de `PROJECT.md`: mapa del sistema o manual de normas

**Traída al dueño:** 2026-10-30, con las tres opciones y la evidencia de las dos
puntas (`docs/DISCREPANCIES.md` D-01).

**Decisión del dueño, 2026-10-30, textual:**

> Se queda como está.

**Qué eligió:** la opción 2. `PROJECT.md` **sigue siendo el manual de normas de
programación** del proyecto. No se convierte en el mapa del sistema y no se
reescribe.

**Consecuencia -- regla confirmada** (escrita al lado del nodo en
`docs/SEMANTIC_TREE.md` sección 0 y en la tabla de `CLAUDE.md` sección 4):

* El **mapa recuperado** del sistema es `docs/SEMANTIC_TREE.md`. Es el único.
* La **puerta de entrada** de cada sesión es `CLAUDE.md`, que remite al contrato,
  al mapa, al estado vivo y a las discrepancias. El peldaño N2 pedía que esa
  instrucción viviera en `PROJECT.md`; con esta decisión vive en `CLAUDE.md`, que
  es el archivo que una sesión lee primero de verdad.
* `PROJECT.md` **no se toca** por esta vía. Un pedido futuro de "poner el mapa en
  PROJECT.md" contradice esta decisión y se trae al dueño antes de ejecutarlo.

**Abierto -- lo que esta decisión NO resolvió.** `PROJECT.md` arrastra, medido el
2026-10-30, cuatro cosas que ya no son ciertas: declara la integración continua
como objetivo futuro (*"when GitHub Actions is wired"*) cuando hoy es la única
puerta a producción; conserva pasos de espejado a un repositorio que **es** este;
declara la última versión publicada como `2.5.0-alpha.5` cuando hoy es `2.5.2`; y
cita cinco documentos obligatorios que no existen (ese último punto es la
discrepancia D-08, todavía sin decidir). El dueño decidió el **rol** del
documento, no si se le corrige el contenido viejo: eso queda registrado como
pendiente con su medición -- **PND-072**, esperando su palabra (regla 9) -- y
**no se hizo de paso** (regla 3). `PROJECT.md` no se tocó en esta sesión.

---

## D-02 -- El sitio solo existe correctamente bajo `/nac-spec/`

**Traída al dueño:** 2026-10-30, con la medición corregida (273 páginas
generadas, **un solo productor**) y la evidencia de las dos puntas
(`docs/DISCREPANCIES.md` D-02).

**Decisión del dueño, 2026-10-30, textual:**

> A: se escribe que este sistema se sirve bajo /nac-spec/ y no en otra raíz, y
> se le pone un candado que lo verifique.

**Qué eligió:** la opción A. El **comportamiento actual es la especificación**
(regla 10 del contrato, aplicada en la dirección que el dueño eligió). **No se
regeneró ninguna página y no se tocó el generador** -- eso era la opción B, y
queda descartada.

**Consecuencia -- regla confirmada** (escrita al lado del nodo P8 en
`docs/SEMANTIC_TREE.md` y en `CLAUDE.md` sección 2):

* Este sistema **se sirve bajo `/nac-spec/` y no se soporta en otra raíz.** Un
  árbol levantado en otra dirección no es una instalación degradada: es una
  configuración que este proyecto no promete. Las 14 páginas escritas a mano --
  la portada y los 13 `example-*.php` -- sí abren en cualquier raíz, porque
  cargan el runtime por ruta relativa, y eso **sigue siendo cierto y
  verificado**.
* El candado es **`scripts/check-mount-path.mjs`**, y su prueba en rojo
  **`scripts/test-mount-path.mjs`** (21 casos, verde el 2026-10-30). Los dos
  entran a `npm run check:release` y a la cadena de despliegue como dos pasos
  nuevos, **antes** del paso que sube el árbol.
* Lo que el candado verifica, y es todo lo que afirma: **(1)** ninguna página
  lleva una referencia raíz-absoluta fuera del montaje; **(2)** todo `<script>`
  que una página carga está bajo el montaje o es relativo y **resuelve en
  disco**; **(3)** las **diez** declaraciones del literal `/nac-spec/` coinciden
  entre sí -- incluido el destino del `rsync` del despliegue, que es la otra
  punta del montaje. Lo que **no** afirma está escrito en su propia cabecera.

**Corrección de una medición propia (2026-10-30, mismo día).** Al implementar
esto, la punta *"el sitio promete"* de D-02 **no se sostuvo**. "All of them open
in your browser" es el título de la sección de demos de la portada, y sus
tarjetas enlazan las páginas `example-*.php`, que son exactamente las que cargan
el runtime por ruta relativa y **sí** abren en cualquier raíz. La promesa no
cubre las 273 páginas generadas. La discrepancia era **más chica** de lo que la
escribí: el sitio no promete algo falso; el requisito de montaje no estaba
escrito en ninguna parte ni verificado por nada. La decisión del dueño lo cubre
igual, y la portada **no se tocó**. Es la segunda medición propia que esta
entrada retira en el mismo día (la primera fueron las "260 páginas").

**Abierto -- lo que esta decisión NO resolvió.** Dos cosas aparecieron mientras
se escribía el candado y **no se arreglaron de paso** (regla 3); quedan
registradas con su medición:

* **PND-074** -- de las 812 referencias raíz-absolutas del árbol, **tres no
  resuelven**: dos `portal-tester.html` localizados (pt, fr) y
  `docs/README_TESTER_FORMS.html`. Es la misma forma del incidente de la hoja de
  estilo inexistente, del lado de los enlaces de navegación, donde no hay
  candado. El candado de montaje **declara explícitamente que no verifica
  resolución** y los nombra.
* **PND-075** -- dos páginas que no son producto viajan al servidor en cada
  despliegue (`e2e/fixtures/level-2-page.html`, un fixture de prueba, y
  `packages/nac-react-demo/index.html`, la entrada de Vite del código fuente).
  Las dos quedaron declaradas como **excepción explícita** en el candado, con su
  razón y su fecha, y el candado va **rojo** si una excepción deja de hacer
  falta -- la lista no puede sobrevivir a su motivo. Que se publiquen sigue sin
  decidirse.

---

## D-03 -- El posicionamiento: nac-spec **quiere** ser encontrable

**No viene de `docs/DISCREPANCIES.md`.** Las dos entradas anteriores son
discrepancias entre el código y el texto normativo; esta es una decisión de
**posicionamiento**, traída desde el registro de pendientes (**PND-078**), que
estaba abierto y bloqueado esperando exactamente esta palabra. Se escribe acá
porque el propio criterio de aceptación de ese pendiente mandaba registrarla en
este archivo, en cualquiera de las dos direcciones.

**Traída al dueño:** 2026-11-07, con la medición de visibilidad
(`docs/internal/medicion-de-visibilidad-de-nac-spec-7-nov-2026.md`): once
personas distintas en catorce días, todas cayendo en el repositorio de GitHub y
no en npm, contra una ficha de GitHub con cero etiquetas, cero sitio declarado y
una descripción sin un solo término que alguien buscaría.

**Decisión del dueño, 2026-11-07, textual:**

> Lo que más me interesa es armar una buena ficha en Github similar a npm,
> tienes creedenciales, pregúntame lo que necesites

**Qué eligió:** la rama afirmativa de PND-078. **La discreción deja de ser la
posición del proyecto.** La premisa que ese pendiente traía escrita --- *"hoy el
sistema es deliberadamente discreto, no se toca sin que el dueño lo pida"* ---
queda **retirada por el dueño**, que lo pidió.

**Consecuencia -- lo que se hizo el mismo día, y es todo lo que se hizo.** Tres
campos de metadata en `yujinapp/nac-spec`, cero líneas de código, cero archivos
del árbol tocados:

* **`homepage`** --- de vacía a `https://yujin.app/nac-spec/`. La ficha del
  repositorio no enlazaba al sitio del protocolo.
* **`topics`** --- de ninguna a **veinte**: `ai-agents`, `agentic-ai`, `llm`,
  `agent-protocol`, `voice-control`, `voice-ui`, `accessibility`, `a11y`,
  `screen-reader`, `web-automation`, `browser-automation`, `ui-automation`,
  `rpa`, `html-attributes`, `semantic-html`, `aria`, `specification`,
  `javascript`, `nac3`, `native-agent-contract`. Veinte es el techo que GitHub
  permite. El repositorio pasa a figurar en las páginas de tema donde la gente
  busca, que es el único índice de GitHub legible por una persona que todavía no
  conoce el nombre.
* **`description`** --- la frase del dueño, *"Human and Machine sharing same
  surfaces"*, **no se borró**: quedó como cierre de una descripción que primero
  dice qué es la cosa, en los términos que alguien escribiría en un buscador
  (*Native Agent Contract (NAC3): a few HTML attributes that let AI agents,
  voice runners, RPA bots and screen readers drive any web UI by name instead of
  by CSS selector. Spec + reference runtime (npm: @nac3/runtime). Human and
  machine sharing the same surfaces.*).

**Lo que NO se tocó** (regla 3, alcance exacto): el `README.md`, que ya está
bien hecho y es lo que la persona lee después de la ficha; `runtime/package.json`
y por lo tanto la metadata del paquete publicado; y la colisión de nombre
--- *"nac3"* ya pertenece al compilador NAC3 de ARTIQ/M-Labs y a una sigla de
materia universitaria brasileña ---, que esta decisión **no resuelve**: los
topics hacen al proyecto encontrable **por lo que hace**, no por cómo se llama.

**Corrección de una medición propia (2026-11-07, mismo día).** PND-078 afirmaba
que el paquete npm declara *"20 keywords incluyendo claude-code, voice, whisper,
elevenlabs"*. **Es falso para este paquete.** Medido en las dos puntas el mismo
día: `npm view @nac3/runtime keywords` devuelve **diez**, y
`runtime/package.json` declara las mismas diez, letra por letra. Las veinte con
`claude-code`/`whisper`/`elevenlabs` son del paquete de Forge, medido en la misma
sesión; se contaminaron los dos hallazgos al redactar. El contraste npm-cuidado
contra GitHub-vacío sigue siendo cierto en dirección y **no** en magnitud: la
línea base de *"similar a npm"* eran diez términos, no veinte. Efecto colateral
bueno de haberlo medido: el paquete publicado y el árbol **coinciden**, así que
esto no era una divergencia que el candado de publicación tuviera que atrapar.

**Abierto -- lo que esta decisión NO resolvió.** La imagen de vista previa
social del repositorio sigue vacía (se sube desde la interfaz web de GitHub; no
hay forma de hacerlo con las credenciales de línea de comando), así que un enlace
al repositorio compartido en una red social se ve como una tarjeta genérica. Y
que el proyecto ahora sea encontrable no cambia el dato duro de la misma
medición: **cero adoptantes**: cero bifurcaciones, cero issues en toda su
historia, y toda coincidencia de código en GitHub público que usa el paquete o
sus atributos está en cuentas del propio dueño.

---

## D-04 -- Los documentos internos de trabajo nacen fuera del sitio

**Traída al dueño:** 2026-11-07. Tres documentos de trabajo quedaron sueltos en
`docs/` sin versionar, y `docs/` **se publica por omisión** (PND-068): dos de
ellos llevan lectura comercial y uno nombra a una organización identificable.

**Decisión del dueño, 2026-11-07, textual:**

> no importa que se borre la medición, los documentos sin seguimiento haz lo que
> recomiendes

**Qué eligió:** delegar el criterio, **sólo para esos tres documentos**. No es
una decisión sobre la pregunta grande de PND-068 --- qué de todo `docs/` debe ser
público ---, que **sigue abierta y sigue siendo del dueño**. Y la primera mitad
de la frase cierra otra cosa: la medición de tráfico de GitHub caduca el
**2026-11-12** y el dueño decidió **no fijarla**.

**Consecuencia -- lo que se hizo.** Los tres documentos se mudaron a
**`docs/internal/`**, un directorio que el despliegue excluye entero con una
**sola regla anclada** (`--exclude='/docs/internal/'`). Se eligió una regla de
directorio en vez de tres exclusiones más por nombre para que el **próximo**
documento interno quede afuera por omisión y no por memoria de alguien ---
exactamente la trampa que PND-068 midió el 2026-10-30, cuando `DECISIONS.md`
necesitó la sexta entrada manual. Queda escrito en el propio workflow y en
`CLAUDE.md` sección 4. Se borraron además 4,9 MB de HTML de terceros que la
investigación de aocr.org había bajado al directorio raíz; nunca estuvieron
versionados.

**Verificado, no creído** (regla 5): se corrió el `rsync` del propio workflow en
seco, con la lista de exclusiones leída del YAML, con control positivo y prueba
en rojo. Con la exclusión: **1313** archivos y **ninguno** bajo
`docs/internal/`. Sin ella: **1317**, y la diferencia son **exactamente** esos
cuatro caminos. `docs/ELIGIBILITY.md` sube en los dos casos, que es lo que
prueba que la sonda sí ve `docs/` --- sin ese control el cero no habría valido
nada.

**Abierto -- lo que esta decisión NO resolvió.** Un documento interno escrito
directo en `docs/`, no bajo `docs/internal/`, **sigue publicándose por
omisión**, y los seis nombres de la lista siguen manteniéndose a mano sin
candado. **No se construyó candado a propósito**: lo que falta decidir es qué
debe ser público (**PND-068**), y un candado hecho antes de esa decisión clavaría
el criterio equivocado. Y los documentos de `docs/` que **ya** se sirven ---
treinta y pico de URLs adivinables --- siguen sirviéndose: regla 17, lo publicado
no se borra, se redirige, y eso todavía no se decidió.

## D-05 -- El posicionamiento se extiende a Forge y a Urazuke

**Continuación de D-03**, traída desde el registro de pendientes (**PND-081**
para Forge y **PND-082** para Urazuke), los dos abiertos y bloqueados esperando
exactamente esta palabra.

**Traída al dueño:** 2026-11-07, con la medición de las dos fichas
(`docs/internal/medicion-fichas-forge-urazuke-7-nov-2026.md`): el paquete de
Forge con 11.202 descargas en un mes y sus dos enlaces principales apuntando a
un repositorio privado que contesta 404 a quien no tiene acceso; la ficha de
Urazuke diciéndole al visitante *"nombre provisorio; en elaboración"* mientras su
README, su sitio y su etimología dicen lo contrario, sin sitio declarado, sin
etiquetas y sin licencia que GitHub reconozca.

**Decisión del dueño, 2026-11-07, textual:**

> Arregla todos los issues sobre Nac3, Forge y Urazuke

**Qué eligió:** ejecutar. Lo que en PND-081 y PND-082 estaba escrito como
*decisión previa del dueño* queda decidido en la dirección afirmativa, con una
sola excepción que el propio dueño separó en el mismo mensaje y sigue abierta
(el repositorio viejo, abajo).

**Consecuencia -- lo que se hizo el mismo día.**

* **Forge** (`yujinapp/yujin-forge`, commit `b76ab2b`): `homepage` pasa a
  `https://yujin.app/yujin-forge/` (verificado 200); `bugs` a la misma página
  más `contact@yujin.app`, que `docs/SECURITY.md` y `docs/PRIVACY_POLICY.md` ya
  publican; y el campo `repository` **se quitó** --- decisión del agente, escrita
  acá para que se pueda revisar: el código vive en privado, un campo ausente no
  afirma nada y uno que apunta a un 404 afirma algo falso. En
  `packages/nac3-rn`, `homepage` pasa de `https://yujin.app/forge` (404) a
  `/yujin-forge/`. El README publicado, que abría con *"Status: v1.0.51
  (2026-06-28)"*, declara la versión que es --- 1.28.0, publicada el 2026-11-04
  según el registro --- y las notas de abajo quedan **fechadas en la versión que
  las midió**, para no re-afirmar como actuales afirmaciones que nadie re-midió.
  **Nada de esto llega a npm hasta la próxima publicación:** el registro sirve el
  `package.json` del tarball, no el del repositorio.
* **Urazuke** (`pkuschnirof/urazuke`, por API): descripción sin el *"nombre
  provisorio; en elaboración"*; `homepage` a `https://yujin.app/urazuke/`
  (verificado 200, y su único canal real: cinco de las seis llegadas de catorce
  días vienen de ahí); **veinte etiquetas** donde había cero; y la wiki vacía
  deshabilitada. La **licencia** va por PR (`pull/37`, rama
  `ficha/licencia-detectable`, compuertas en verde) y no por API, porque es
  contenido del repositorio, porque su README dice textual que *"nadie más
  escribe en `main`"* y porque un push a `main` de ese repositorio despliega a
  producción: `LICENSE` pasa a ser el texto legal canónico de CC BY-SA 4.0 --- el
  que reconoce el detector de GitHub --- y `LICENCIA.md` conserva intacta la
  lectura en castellano con sus notas (alcance, marcas no licenciadas, clientes
  anonimizados). **La licencia no cambia; cambia cómo se declara.**
* **NAC3** (este árbol, commit `a2875df`): el único defecto de código del
  pedido, **PND-083**, cerrado. El candado de publicación informaba *"12
  line(s)"* por una sola línea agregada (comparaba por posición) y su rojo
  afirmaba *"the published npm package is NOT this tree"* sin decir que el
  testigo elegido no era el del contrato. Las dos cosas arregladas con sus
  pruebas en rojo (casos 12 y 13, probados rojos contra el código anterior).

**Cerrado de D-03:** la imagen de vista previa social, que D-03 dejó abierta por
no tener API, **la subió el dueño el 2026-11-07** en los dos repositorios.
Verificado: `usesCustomOpenGraphImage = true` en `yujinapp/nac-spec` y en
`pkuschnirof/urazuke`, las dos sirviendo PNG de 1280 x 640 (136 KB y 119 KB).

**Abierto -- lo que esta decisión NO resolvió.**

* **La publicación del paquete de Forge.** Hasta que el dueño publique, la página
  de npm sigue mostrando los enlaces muertos. Publicar un paquete con 11.202
  descargas al mes no lo decide el agente (**PND-081** sigue abierto).
* **La fusión del PR de Urazuke.** La insignia de licencia aparece al fusionar
  (**PND-082** sigue abierto).
* **Qué parte de Forge es pública.** Quien busca *"yujin forge"* en GitHub
  encuentra `pkuschnirof/yujin-forge`, un esqueleto de mayo de 0,12 MB.
* **El reparto de licencias de Urazuke** entre la prosa del método y los
  artefactos con forma de código (`build/*.mjs`, `gates/*.json`). El *compartir
  igual* sobre ejecutables le hace dudar a cualquiera que quiera meter los
  evaluadores en su propia cadena.
* **El repositorio viejo** `pkuschnirof/nac-spec` (**PND-080**), que el dueño
  separó explícitamente en el mismo mensaje como pregunta abierta: *"Cómo hacemos
  Eliminamos pkuschnirof/nac-spec ó lo ruteamos al nuevo?"*. Sin decidir.
* **El nombre.** El dueño pidió en la misma sesión *"considera ir reemplazando
  nac3 por nac-spec"*. Registrado con su análisis y su medición en **PND-084**,
  sin ejecutar nada: toca el ámbito de npm y los identificadores del protocolo,
  que es la clase de cambio que rompe adoptantes.

---

## D-06 -- El método Urazuke queda suspendido en este proyecto

**Traída al dueño:** no se trajo. El dueño lo decidió y lo ejecutó él mismo en la
configuración de Forge, en medio de la sesión del 2026-11-07.

**Decisión del dueño, 2026-11-07, textual:**

> Apaga el método urazuke, no le des bolilla por ahora. Ya lo apagué del config.

**Qué eligió:** suspender --- *"por ahora"*, no derogar. Se escribe acá porque
tiene dos consecuencias verificables que una sesión futura descubriría a los
golpes.

**Consecuencia.** Los verbos `yujin.urazuke.*` y **`yujin.evidence.run`**
contestan *"Urazuke is disabled for this Forge"*. O sea: **el proyecto ya no
puede producir recibos de evidencia**, y el registro de pendientes exige la terna
(prueba en rojo + verde + regresión) para cerrar con `shipped`. El cierre de
PND-083 de hoy tuvo que usar la salida escrita del propio registro
(`sin_recibos_porque`), con los tres comandos y sus resultados transcriptos para
que el dueño los pueda correr tal cual. Mientras la suspensión siga, **todo
cierre de código va a quedar contado como excepción** en `pending stats`. Eso no
es un efecto secundario molesto: es la medida de la suspensión, y conviene que se
vea.

**Lo que NO cambia:** las tareas `[WFL-001]` siguen abiertas en el registro
(PND-004 a PND-028) y el trabajo sigue saliendo del registro, no de la impresión
(sección 5 de `CLAUDE.md`). Lo que se apagó es la escalera y sus recibos, no la
disciplina del registro ni el contrato de convivencia.

---

---

*Producido en la estación N2 de la escalera Urazuke. Una entrada de este archivo
no se edita después de escrita: si el dueño cambia de opinión, se agrega una
entrada nueva con la fecha nueva y la anterior queda como historia.*
