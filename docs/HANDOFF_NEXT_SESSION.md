# Handoff -- estado al 2026-10-27, 19:4x UTC (la 2.5.2 ESTA PUBLICADA en los dos lugares; PND-053 cerrado)

**Lo que cambio respecto de todo lo que sigue abajo: ya no falta la firma, no hay
nada sin empujar, y la 2.5.2 esta afuera.** El dueno firmo en su maquina
(`signed at 2026-10-27T15:29:54Z`, cadena de cuatro entradas, cabeza
`sha384-mzie2uMo7z01...`) y autorizo el movimiento completo ("Si. Empuja y
despliega y en el mismo move cortamos 2.5.2").

## Lo que esta publicado, medido contra produccion y contra el registro

- **npm**: `@nac3/runtime@2.5.2`, `latest`. Instalado en carpeta limpia desde el
  registro: el CLI se anuncia `@nac3/runtime CLI 2.5.2 (Native Agent Contract
  v2.5)`, el `contract-head.json` empaquetado lleva la cabeza de cadena
  `mzie2uMo7z01` con `entry_count 4`, y el `SPEC.md` empaquetado lleva la regla
  de no-veto y ya no llama "partial" a las nueve traducciones. Las cinco
  preversiones siguen bajo el tag `alpha`.
- **El sitio**: `https://yujin.app/nac-spec/` sirve la 2.5.2. `smoke-live-landing`
  contra produccion en verde (sello de version, las tres huellas SRI, la ruta
  inmutable servida con 200, los 13 ids de la seccion de limites, las dos
  licencias y el enlace al metodo). Recibo RCP-089.
- **El contrato, auditable de afuera**: `verify-contract-api --base
  https://yujin.app/nac-spec --expect-head-from-repo` en verde: la cadena
  recomputa sobre los bytes que el servidor entrega, 12 artefactos coinciden,
  `latest` apunta a 2.5.2, la firma verifica contra la clave del testigo
  independiente y la cabeza coincide con los **tres** testigos. Recibo RCP-088.
- **Las nueve traducciones**: servidas, `translation_status: complete`,
  `translation_sections: 83`, `translation_source_version: 2.5.2` en las nueve.
  `SPEC.html` en vivo declara 2.5.2 y lleva la regla de no-veto.
- **Deploy**: run 40532471025, verde, **cero anotaciones propias** (las dos que
  aparecen son avisos de plataforma de GitHub sobre Node 20 y ubuntu-latest).
- **`origin/main` y `origin/portada-look-urazuke` estan en el mismo commit.**

## El candado que PND-061 exigia en su criterio 4 (hecho despues de publicar)

El criterio 4 de PND-061 pedia "un candado que rechace la vuelta de la palabra
'partial' en 4.3.2 sobre nueve traducciones completas". Al cortar la 2.5.2 se
dijo explicitamente que la version **no traia candado nuevo**; ahora existe, en
`scripts/build-translation-banners.mjs`, que ya era el productor y la compuerta
de lo que las nueve dicen de si mismas:

- **Refuta en las dos direcciones.** Si las nueve cubren el documento entero y
  4.3.2 las describe como parciales, es rechazo con la seccion nombrada. Si una
  pagina publicada carga menos secciones que el canonico y 4.3.2 calla, tambien.
  Un candado que cierra para un solo lado no cierra.
- **La regla de no-veto y su cita son UNA constante compartida**
  (`U.NO_VETO_CLAIM` en `scripts/lib/spec-units.mjs`). El productor la imprime
  citando 4.3.2 y la compuerta verifica que 4.3.2 realmente la diga. Esto cierra
  una asimetria real: el 2026-10-27 el productor imprimia esa frase citando
  4.3.2 cuando 4.3.2 no la tenia -- durante un dia la herramienta cito una
  clausula inexistente.
- **Mide ESTRUCTURA, no frescura**, y eso lo encontraron los propios casos en
  rojo. La primera version media la cobertura del store, donde una seccion queda
  "stale" en cuanto un parrafo del ingles se mueve: asi el candado habria exigido
  reescribir el normativo en cada edicion del ingles, que es lo contrario de la
  regla de no-veto. Dos casos lo delataron (uno en rojo que no provocaba el
  mensaje esperado, uno en verde que el candado rechazaba). Corregido a contar
  encabezados de la pagina publicada.
- **Recibos**: RCP-092 (red_proof contra 857c136 con el test llevado al worktree
  base: 4 de 27 casos en BROKEN, cada uno por la **ausencia del mensaje de este
  candado**, no por la huella del SPEC -- el arbol base rechaza igual, y eso es
  justo lo que hace que los cuatro casos discriminen), RCP-093 (`check:release`
  completo en verde, salida 0) y RCP-094 (la suite del candado, 27 casos, 0
  fallos).

## PND-053 cerrado: el stylesheet muerto salio de las 262 paginas (decision del dueno)

Decision textual del dueno, 2026-10-27: **"Sacalo y listo. Avancemos."** -> opcion B.
Hecho **despues** de publicar la 2.5.2, y no toca la version: el contrato pinnea
`SPEC.md`, no `SPEC.html`, asi que no necesito firma ni salto (verificado en
`api/v/2.5.2/contract.json`).

- **Salio de las 262 paginas y del generador.** Una sola linea borrada por pagina,
  forma identica en las 262 (verificado antes de escribir: una unica variante en
  todo el arbol). `scripts/build-spec-html.mjs` ya no la emite, con el motivo
  escrito en el codigo. Las 251 paginas de `docs/` y `guides/` **no tienen
  productor vivo**: son artefactos huerfanos de junio, el mismo patron que las
  traducciones de mayo.
- **El candado que faltaba, que es lo que importa.** El defecto nunca fue el
  archivo ausente: fue que una pagina podia afirmar un recurso que nadie verifico
  que exista. `scripts/check-stylesheet-links.mjs` rechaza cualquier pagina cuyo
  stylesheet local (`<link>` o `@import`) no resuelva en el arbol desplegado, y se
  niega ante un escaneo que no encuentra ninguna pagina. En `check:release` y en
  `deploy.yml`, con sus dos pasos (gate + red).
- **Sus 12 casos en rojo** (`scripts/test-stylesheet-links.mjs`): el primero es la
  linea verbatim que las 262 paginas llevaron cuatro meses; tambien orden de
  atributos y comillas simples, `rel="alternate stylesheet"`, `<link>` sin `href`,
  `@import` muerto y el escaneo vacio. Dos verdes marcan el limite (un stylesheet
  remoto no se exige que resuelva en disco; un `?query` no rompe uno que si).
- **Salio la tolerancia** de `e2e/translations-check.mjs:104` -- era parte del
  criterio de aceptacion de PND-053. El gate que encontro el hallazgo vuelve a
  exigir **cero** errores de consola sin excepciones y pasa en verde sobre las
  nueve: esa es la prueba de que el 404 murio, medida cargando paginas.
- **Consumidores corregidos en el mismo commit** (SQ 14): `IMPLEMENTATION_GUIDE.md`
  decia que el estilo se ve mal bajo `file://` por esa hoja -- era falso y mandaba
  a buscar un problema de estilo inexistente; `PERFORMANCE_TEST_PLAN.md` instruia a
  una pagina futura a **reusar** el archivo muerto, o sea reproducir el defecto.
- **Lo que el candado NO prueba:** lee bytes y resuelve rutas en disco, no descarga
  nada. Un stylesheet remoto no se verifica, y un host que no sirva un archivo que
  SI existe lo cazan los checks en vivo, no este.
- **Publicado y medido contra PRODUCCION, no contra el repositorio.** Commit
  `913d135`, deploy run **40570333555** verde con cero anotaciones propias. Las
  **262 paginas pedidas al servidor una por una**: 262 respuestas 200 y **cero**
  referencias al stylesheet muerto. El archivo sigue dando 404 -- nunca existio y
  no se escribio -- pero ya no lo pide nadie, que es la opcion B tal cual se
  decidio. Recibos: RCP-099 (red_proof contra `f889d7e`: 262 referencias muertas,
  el caso "the committed tree passes" cae), RCP-100 (12/12 la suite del candado),
  RCP-101 (`check:release` completo, salida 0), RCP-102 (navegador local sin
  tolerancia) y RCP-103 (**el mismo gate contra el sitio publicado**, en verde).

## Lo que sigue esperando al dueno (nada traba nada)

| Que | Pendiente |
|---|---|
| La clave de firma sin passphrase en una maquina donde corren varias sesiones de agente. Ponerle passphrase NO rota la clave | PND-056 |
| Las cuatro decisiones sobre el texto de los niveles de conformidad; tres de ellas son lo que `validate-global` reporta en rojo sobre la propia portada | PND-044, PND-045, PND-046, PND-047 |
| El candado en el repo `rpaforce` para que la regeneracion del sitemap de la raiz no borre las 7 urls del protocolo | PND-060 |
| Re-medir el benchmark de 600 corridas (cifras declaradas historicas por decision del dueno) | PND-040 |
| La portada declara 64 de los 128 ids que pinta | PND-038 |
| Seis acciones declaradas que no confirman nunca | PND-048 |

---

# Handoff -- estado al 2026-10-27, 20:10 UTC (D-05 EJECUTADA: las nueve traducciones estan completas)

**Lo que cambio respecto de todo lo que sigue abajo.** El dueno revirtio el
diferimiento de D-05 el mismo dia ("Hagamos las traducciones ahora, asi luego
durante la evolucion solo las vamos manteniendo") y la pasada esta hecha:

- **Las nueve traducciones del SPEC estan completas**: 282 de 282 unidades y 83
  de 83 secciones en cada idioma. 2.538 unidades, ~80.000 palabras de ingles.
  El cartel de cada pagina y su frontmatter lo declaran medido, no tipeado.
- **Hay un productor del texto** (`scripts/build-spec-translations.mjs` +
  `scripts/lib/spec-units.mjs`) y las paginas publicadas **ya no se tocan a
  mano**: una edicion a mano es un rechazo con nombre.
- **El candado de identidades** compara code spans, enlaces, URLs, numeros,
  filas de tabla, items de lista, nivel de encabezado y numero de seccion.
  2.538 unidades reales lo pasan; 10 casos en rojo lo prueban.
- **La regla de no-veto** esta escrita y **hecha valer por el codigo de salida**:
  atraso = reporte por unidad + exit 0. Un idioma viejo no frena el ingles.
- **Enganchado a `npm run check:release`** (verde, salida 0), mas
  `test:spec-translations` (33 casos, 0 fallos) y el candado de ayer reparado
  (22 casos, 0 fallos).
- **El mantenimiento esta probado sobre el documento real:** se edito un parrafo
  del ingles y cada idioma pidio **2 unidades**, con 281 de 283 intactas.
- **Nada publicado todavia.** Son commits locales: la rama no se empujo y no se
  desplego. Lo que esta afuera sigue siendo la 2.5.1 de ayer.

**Lo que NO entro y por que (medido):** la redaccion de la regla de no-veto en
**SPEC 4.3.2**. Al aplicarla, `check-version-coherence` y `build-contract-api`
la rechazaron: el contrato publicado lleva la huella de los bytes de `SPEC.md`,
asi que tocar el normativo mueve el contrato de una version ya firmada. Se
revirtio. El texto y sus nueve traducciones quedan listos en
`docs/d-05-4.3.2-delta.md` y `docs/delta-4.3.2/`; necesita una **2.5.2** con la
firma del dueno. Es **PND-061**, junto con la palabra "partial" que 4.3.2 sigue
usando para traducciones que ya no son parciales.

**Cuatro hallazgos nuevos, ninguno de una lectura:** N-51 (lo de arriba), N-52
(cinco defectos de mis propios instrumentos, encontrados al correrlos contra el
corpus real), N-53 (la suite de los carteles se **estrellaba** entera por un
import nuevo, y uno de sus casos en rojo estaba clavado al numero de mayo y ya
no podia ponerse rojo), N-54 (el frontmatter heredaba la procedencia de mayo
sobre un texto traducido hoy). Todos en
`docs/PENDING_AUDITORIA_2026-10.md`.

**Lo que sigue esperando al dueno:** PND-061 (la 2.5.2), PND-053 (el 404 de
`css/yujin-tokens.css` en 262 paginas), PND-056 (la clave de firma sin
passphrase), las cuatro decisiones sobre el texto de los niveles, y el push de
estos commits.

---

<!-- lo anterior se conserva como registro de la publicacion de la 2.5.1 -->

# Handoff -- estado al 2026-10-27, 01:55 UTC (PUBLICADO: la 2.5.1 esta afuera, en los dos lugares)

**Lo que cambio respecto de todo lo que sigue abajo: ya no falta la firma y ya no hay
nada sin empujar.** El dueno autorizo el movimiento completo ("commit, push y deploy en
PRD") y esta hecho y medido desde afuera:

- **`origin/main` esta en `6e666c1`.** La rama `portada-look-urazuke` se empujo y se
  llevo a `main` con un avance lineal (sin commit de merge). Once commits que antes eran
  locales.
- **npm: `latest` = 2.5.1.** Publicado con `npm publish` desde `runtime/`, tag `latest`,
  shasum `c2fcd21f...`. Verificado **instalando desde el registro en una carpeta vacia**:
  el CLI reporta `@nac3/runtime CLI 2.5.1` y el `SPEC.md` de adentro ya no se contradice.
  Las cinco preversiones siguen publicadas bajo el tag `alpha`.
- **El sitio sirve 2.5.1.** Dos deploys verdes (runs `40434620113` y `40434848218`), los
  21 pasos de cada uno. Medido contra `https://yujin.app/nac-spec/` con
  `scripts/smoke-live-landing.mjs`: el sello dice `v2.5.1 - stable`, las tres huellas de
  integridad coinciden, la ruta inmutable `js/2.5.1/nac.js` responde 200, los **13 ids de
  la seccion de limites** estan declarados, las dos licencias y el enlace al metodo estan.
- **El contrato publicado verifica desde afuera**: la cadena recomputa sobre **tres**
  entradas, `latest` dice `stable=2.5.1`, y la firma del dueno (`nac3-contract-2026`,
  firmada 2026-10-26T22:47:56Z) verifica contra el testigo independiente del repositorio
  y contra el testigo empaquetado.
- **PND-051 y PND-057 cerrados** con expediente y recibos (RCP-057 a RCP-062).

**Dos defectos que salieron de PUBLICAR, no de leer** (ninguno estaba en el arbol de ayer):

1. **El chequeo post-deploy afirmaba la portada con literales tipeados dentro del YAML**,
   entre ellos el marcado textual `<h2>What NAC3 does not cover</h2>`. La reescritura de
   la portada reformulo ese encabezado y lo movio detras de `data-i18n`. Ese paso es
   `::error::` + `exit 1`, asi que este deploy **habria subido el arbol entero y DESPUES
   se habria puesto rojo**, sobre una release por lo demas correcta y firmada. Es la forma
   de N-17 -- un consumidor con una copia tipeada a mano de algo que no le pertenece --
   aplicada a la propia compuerta del deploy. El otro literal, `Now in alpha`, ya no
   existia desde que la portada paso a estable: un `::warning::` que iba a dispararse en
   todos los deploys desde hoy.
   **Arreglado en `2c5b61d`**: `scripts/smoke-live-landing.mjs` reemplaza los tres pasos
   tipeados por una sola llamada que **deriva** todo del arbol que se despliega (titulo,
   sello de version, cada par src/huella, la ruta inmutable y que el host la sirva, los
   13 atributos `data-nac-id` de la seccion de limites, las dos licencias, el enlace al
   metodo). Nada que mantener a mano, y lee igual en los diez idiomas -- el literal viejo
   no podia, y esa es la segunda razon por la que se rompio. `--selftest` para cada
   regresion que dice vigilar (9 casos), y **la primera corrida encontro un defecto del
   propio chequeo**: comparaba los ids como subcadenas, y todos ellos aparecen tambien en
   el manifiesto de la pagina y en una cadena de narracion, asi que un host que borrara el
   marcado y dejara el script lo satisfacia. Ahora afirma el **atributo pintado**.
2. **Los casos en rojo llegaban al log de CI como once errores anotados sobre una corrida
   verde.** El primer deploy del chequeo nuevo salio verde en sus 21 pasos y llego con
   once `::error::` encima: eran los rechazos **intencionales** del `--selftest`. Nada
   estaba mal, que es el problema -- una corrida verde que se lee como una corrida con
   once errores ensena a quien mire despues que los errores de este workflow no significan
   nada, y el proximo va a ser real. No se puede ver localmente: las anotaciones solo
   aparecen con `GITHUB_ACTIONS` puesta.
   **Arreglado en `6e666c1`**, y el caso que lo sostiene no es una linea: el selftest se
   re-corre **como proceso hijo** con la variable de CI puesta y afirma que una corrida
   verde no emite ni una anotacion. Probado en rojo quitando la unica linea de supresion:
   reporta exactamente las once anotaciones que produjo el deploy real. **Medido despues
   del arreglo: el segundo deploy tiene 0 lineas `::error::` en su log.**

**Un recibo con veredicto no-ok queda a proposito en el registro (RCP-059).** Fue el
primer intento de prueba en rojo para la linea Status: se corrio contra `52f0a76`, donde
todavia no existian los catalogos de idioma, y **se estrello** (ENOENT) antes de llegar a
los casos que interesaban. Un estrellon esconde todos los casos que vienen atras, asi que
no vale como evidencia. La prueba valida es **RCP-060**, contra `edccbf8`, que es el primer
arbol que tiene los diez catalogos **y** todavia la linea Status contradictoria: ahi fallan
8 casos **con nombre**, incluidos los cuatro de la linea Status.

**Lo que sigue esperando al dueno, por orden** (ninguno lo traba el release, que ya salio):

| Que | Pendiente |
| --- | --- |
| **La hoja de estilos que da 404 en 262 paginas publicadas** -- publicar el archivo o sacarle el enlace al generador. Las dos salidas cambian como se ve la documentacion publica | PND-053 |
| **La clave de firma sin passphrase** en una maquina donde corren varias sesiones de agente, asi que la firma no es tecnicamente atribuible. Ponerle passphrase no rota la clave | PND-056 |
| ~~**El push del repositorio web** para que la casilla 5 pase a verde~~ **HECHO el 2026-10-27** con autorizacion del dueno: deploy verde, medido contra produccion, casilla 5 en verde. Cerrado con "prueba suficiente" del dueno porque el red_proof nombraria mal a su sujeto (vive en otro repo) | PND-054, cerrado |
| **Una linea sobre el cartel de las nueve traducciones (N-50):** el cartel declara la cobertura y calla la antiguedad, y el tramo que cubre describe la v2.2. Arreglarlo cuesta una linea, **pero esa linea es la opcion A** y el dueno eligio B: no se aplica por cuenta propia | N-50 / PND-059 |
| **Las cuatro decisiones sobre el texto de los niveles** -- tres de ellas son lo que la casilla 8 reporta en rojo sobre la portada del propio protocolo | PND-044 a PND-047 |
| La mitad de la portada que no esta declarada (128 ids pintados, 64 declarados) | PND-038 |
| Seis acciones declaradas que no confirman nunca | PND-048 |

**Lo que NO espera al dueno y es trabajo de Forge, para que no se pierda:** `PND-059` (D-05
= opcion B, la pasada completa de las nueve traducciones, **diferida por el dueno** al avance
del metodo: prioridad 47, detras del ultimo peldano) y `PND-060` (el candado en el repo
`rpaforce` que proteja las 7 urls de nac-spec de una regeneracion futura; hoy nada las
protege, y eso se declaro al cerrar la casilla 5).

---

# Handoff -- estado al 2026-10-26, 21:xx UTC (CONSOLIDADO: una sola rama, una sola portada, una sola firma pendiente)

**Lo que cambio respecto de todo lo que sigue abajo: ya no hay dos sesiones ni dos
arboles.** El dueno decidio consolidar, y esta hecho:

- **Rama unica: `portada-look-urazuke`**, en el arbol principal `C:\yujin-nac-spec`.
  `release/2.5.1` esta **fusionada** ahi (commit de merge `c9f9382`). **Nada empujado**:
  la rama es local, cuatro commits de la portada + el merge, sobre `origin/main`
  (`1937733`).
- **`index.html` no se fusiono: se eligio.** La base es la reescritura de diez idiomas
  (103 KB -> 70 KB, look de Urazuke, peer review propio, destaque de pruebas punta a
  punta, API del contrato visible, libre separado de pago). Las 81 lineas del lado 2.5.1
  se reaplicaron **a mano**, una por una. Fue el **unico conflicto** del merge; todo lo
  demas entro limpio.
- **El worktree `C:\yujin-nac-spec-251` ya no existe** y la rama `release/2.5.1` queda
  como historia. **La firma se corre en `C:\yujin-nac-spec`**, no ahi.

**Lo que se reaplico sobre la portada nueva** (esto es lo que un merge de lineas habria
perdido en silencio):

| Que | Por que no se podia dejar afuera |
| --- | --- |
| 2.5.1 en el sello, el fragmento de instalacion + su huella, las dos tarjetas de la API, el `<script>` y los dos manifiestos | el gate de integridad y el de versiones rechazan el arbol |
| La seccion de traducciones (D-03 opcion C) en el sistema visual nuevo | `build-translation-banners.mjs` la exige enlazada y declarada |
| **Los ocho limites como elementos direccionables** + las tres naturalezas con sus tres licencias | la reescritura los dejo como prosa y les saco los ids. `e2e/landing-limits-check.mjs` estaba **rojo en siete checks** sobre ese arbol. El dueno los aprobo **como dato** |
| N-15: el enlace de vuelta a Urazuke en el pie, declarado | lo pedia el hallazgo, y el candado lo mide |
| **El manifiesto del plugin `chat`** | el panel pinta siete `data-nac-id` y la reescritura no declaraba ninguno: siete elementos que un agente no ve, en la pagina cuyo argumento es que los ve |

**Tres hallazgos nuevos, ninguno de leer: N-47, N-48, N-49** (fichas completas en
`docs/PENDING_AUDITORIA_2026-10.md`).

1. **N-47 -- la version vive ahora en los diez catalogos y ningun candado los miraba.**
   `i18n.js` reemplaza el texto en tiempo de ejecucion **tambien para el ingles**, asi que
   la cadena que el lector ve sale del JSON, no del marcado. El bump habia quedado en el
   HTML con los diez catalogos en `v2.5.0`: dieciocho slots en verde y la portada
   anunciando la version anterior a todo el mundo. Hay slot nuevo en
   `check-version-coherence.mjs` (anclado **en la clave**, porque esos archivos llevan
   cifras historicas) y cuatro casos en `test-version-gate.mjs`.
2. **N-48 -- la autoverificacion de la portada nunca corrio.** Leia como arreglo lo que
   `validate_global()` devuelve como objeto; reventaba en cada carga y lo tapaba un
   `console.warn`. La pagina que argumenta contra el fallo silencioso fallaba en silencio
   sobre su propia conformidad. Es anterior a estas sesiones.
3. **N-49 -- dos candados de navegador median el idioma del sistema del operador.** En una
   Windows en espanol, `test:limits` y `test:translations` se ponian rojos sobre frases que
   la pagina si dice, en espanol. Los dos fijan `en-US` y el de limites gano una **segunda
   pasada en otro idioma** que afirma que **los ids no dependen del idioma**, con su prueba
   en rojo. **Regla que queda escrita: un `data-nac-id` nunca va adentro de un valor
   traducible.**

**La restriccion que ahora es de todos:** cualquier cadena visible que se agregue o cambie
en la portada entra en los **diez** catalogos (`i18n/<lang>.json`), o
`scripts/test-landing-i18n.mjs` se pone rojo -- y ya es compuerta del deploy. En esta
consolidacion fueron **14 claves nuevas por catalogo** (264 por archivo). No se apaga
`_same_as_english`: existe para que la excepcion quede escrita.

**Estado medido en este arbol** (no recordado; se corrio entero):

| Compuerta / suite | Estado |
| --- | --- |
| `check:integrity` | VERDE |
| `check:version` | VERDE -- **23 slots** de acuerdo en 2.5.1 |
| `check:translations` | VERDE -- 9 locales, cada uno declarando lo que cubre |
| `test:version-gate` | VERDE -- 35 casos |
| `test:translations-gate` | VERDE -- 21 casos |
| `test:landing-i18n` | VERDE -- 10 catalogos, 264 claves |
| `test:integrity-gate` / `test:contract` / `test:validate-global` / `test:cli-levels` | VERDE -- 21 / 36 / 33 / 29 |
| `test:integrity` | VERDE |
| `test:limits` | VERDE -- 16 checks, incluidos los dos de idioma |
| `test:snippet` / `test:fill-setter` / `test:translations` | VERDE |
| `check:contract` | **ROJO, y es el unico** |

**El unico rojo y lo unico que falta** (la cadena tiene tres entradas y la firma cubre
dos). En `C:\yujin-nac-spec`, en la maquina del dueno:

```
node scripts/sign-contract-api.mjs --sign
npm run check:release
```

Despues: empujar la rama (**pendiente de autorizacion del dueno**, hoy es local),
publicar y promover. Y sigue esperando **D-03 ya esta decidida y ejecutada**; lo que
queda del lado del dueno es el push, el `PND-054` (casilla 5: un push a OTRO repositorio
que despliega a produccion) y `PND-053` / N-46 (la hoja de estilos que da 404 en 262
paginas, decision de dueno).

---

# Handoff -- estado al 2026-10-26, 17:4x UTC (la 2.5.1 esta cortada y espera UNA firma)

Esto se escribio al final de la sesion que ejecuto las tres decisiones del dueno de
ese dia: **A) D-03 = opcion C**, **B) publicar la 2.5.1 ahora**, **C) el sitio raiz de
yujin.app vive en `C:\rpaforce\yujin.app`** (la ubicacion hubo que corregirla midiendo;
ver mas abajo). Lo anterior a este bloque sigue siendo valido como historia.

## 0. LO PRIMERO, porque cambia como hay que trabajar: DOS SESIONES EN EL MISMO ARBOL

Mientras esta sesion trabajaba, **otra sesion creo la rama `portada-look-urazuke` y la
checkouteo en `C:\yujin-nac-spec`**, el worktree principal. Se detecto porque `index.html`
desaparecio del arbol a mitad de sesion (`git status` lo mostraba como ` D index.html`) y
el reflog registraba un `checkout: moving from main to portada-look-urazuke` a las 17:05.
Esa rama ya lleva tres commits (`9a76a83`, `0077a5b`, `910de67`): una reescritura casi
total de la portada con el look de Urazuke, su propio peer review y catalogos i18n.

Por eso **todo el trabajo de esta sesion se hizo en un worktree aislado**:
`C:\yujin-nac-spec-251`, rama **`release/2.5.1`** sobre `main` (`1937733`). No se toco ni
una vez el checkout de la otra sesion. `node_modules` y `runtime/node_modules` estan ahi
como junctions al worktree principal, asi que los gates de navegador corren.

**EL CHOQUE ES REAL Y ESTA MEDIDO.** Las dos ramas editan `index.html`:

| Que | Medido |
| --- | --- |
| Su reescritura contra la base de la 2.5.0 | 604 lineas agregadas, 1907 borradas (la pagina paso de ~2500 a ~600 lineas) |
| Que runtime fija su portada | `js/2.5.0/nac.js` -- despues de la 2.5.1 el **gate de integridad la rechaza** (exige que la pagina fije el path inmutable vigente). Mecanico: `node scripts/build-integrity.mjs --write` |
| Su sello del pie | dice `v2.5.0 &middot;` -- el gate de versiones lo rechaza contra 2.5.1. A mano |
| Traducciones que enlaza | **cero** -- el gate nuevo `build-translation-banners.mjs` la rechaza. Hay que volver a poner la seccion (65 lineas, ver seccion 2) |
| Fusion automatica de `index.html` | **no se puede.** Las dos ramas reescriben las mismas regiones; hay que rehacer la portada SOBRE la 2.5.1, no fusionarla |
| Lo que SI sobrevive en su version | los 52 ids `nac_landing`, la seccion de limites (`does not cover` x3, `urazuke` x3) y el ancla del snippet del adoptante |

Lo bueno: **los tres choques son auto-detectables**. Ningun candado se los come en silencio.

**Y una consecuencia a dejar escrita: esta sesion NO pudo dejar recibos con**
**`yujin.evidence.run`.** Ese verbo corre el comando en el **project root**
(`C:\yujin-nac-spec`), que es justo el checkout que tiene la otra sesion en otra rama. Un
recibo que dice medir la 2.5.1 y en realidad mide `portada-look-urazuke` nombra mal a su
sujeto, y eso es peor que no tener recibo -- es el mismo error que el 2026-10-26 a la
manana, cuando un recibo decia medir el servidor y media el repositorio. Asi que la
evidencia de esta sesion son las salidas de los gates, citadas con sus numeros en
`PND-052`, `PND-053`, `PND-054` y en la seccion 1 de aca. **Cuando la otra sesion libere el
worktree principal, re-correr los gates con `yujin.evidence.run` y dejar los recibos.**

**Y una observacion sobre el gate de versiones que salio de medir esto, y que NO se
arreglo (fuera de alcance):** la sonda `landing version pills` usa el patron
`v(SEMVER)\s*&middot;`, que tambien lo satisface el **sello del pie**. O sea: si la pildora
de version *desaparece* de la portada, nadie se da cuenta (solo se detecta si queda
VIEJA). Su reescritura ya borro la pildora y el parrafo "`js/<v>/nac.js` is immutable", y
el gate no dijo nada. Es una garantia mas debil que la que promete el nombre de la sonda.

## 1. La 2.5.1: cortada, verificada, y lo unico que falta es la firma

Dos commits en `release/2.5.1`:

- **`016b351`** -- D-03 opcion C (las nueve traducciones y su productor).
- **`dc9250b`** -- el salto a 2.5.1.

Medido despues del salto, no recordado: **integridad verde**, **22 de 22 slots de version
de acuerdo en 2.5.1** (eran 20), **31/31** casos del gate de versiones, **21/21**
integrity-gate, **36/36** contrato, **33/33** validate-global, **29/29** cli-levels,
**21/21** el gate nuevo de traducciones, la suite del runtime en verde con cero fallas, y
los cuatro gates de navegador en verde (SRI, snippet, limits, translations).
**El UNICO rojo es la firma del dueno**, que es el diseno: la clave no vive en el repo.

Lo que el dueno tiene que correr, **en el worktree de la 2.5.1**:

```
cd C:\yujin-nac-spec-251
node scripts/sign-contract-api.mjs --sign
npm run check:release
```

La clave se lee de `~/.nac3-keys/nac3-contract-2026.pem` (o `NAC3_CONTRACT_SIGNING_KEY`),
que es `$HOME`, asi que el worktree no cambia nada. Despues: `npm publish` + `git push`.

**Por que hubo que hacer una version para esto** (medido y revertido el 2026-10-26, antes
de decidirlo): `api/v/<v>/contract.json` publica `spec_sha384`, la huella de los bytes de
`SPEC.md`. Editar ese documento mueve el contrato de una version ya publicada, que es lo
que el metodo prohibe. Y el tarball 2.5.0 ya publicado lleva ese `SPEC.md` adentro.

### Lo que entro en la 2.5.1

- **N-45, segunda mitad.** La linea `**Status:**` del SPEC dejo de restatear la version.
  Decia `v2.5.0-alpha.5 ... Promoted to npm dist-tag latest`, que era **verdad hasta las
  18:40 del 2026-10-26**: el acto de promover `latest` es lo que la volvio falsa, en sus
  dos mitades. Ahora apunta a la seccion 9.1 y no nombra ninguna version, y **hay un slot
  nuevo que rechaza una linea Status que nombre una**, cuyo primer caso rojo es la linea
  con la que la 2.5.0 salio de verdad.
- **Un slot que no existia: `SPEC.html`.** `SPEC.md` es la fuente y `SPEC.html` se publica
  al lado, y nada afirmaba que el segundo fuera el renderizado del primero. El modo de
  falla no es un typo: es olvidarse del generador. **Paso en esta misma release** y se vio
  solo porque una persona leyo `git status`.
- **`e2e/snippet-install-check.mjs` tenia la version escrita a mano** (`=== '2.5.0'`). El
  unico gate del repo con una version tipeada era el que se escribio para cazar un hash
  tipeado: se puso rojo en la 2.5.1 por un motivo que ningun adoptante sufre. Ahora la
  **deriva del path inmutable que la pagina anuncia**, que es la afirmacion mas fuerte:
  el runtime que la pagina fija tiene que reportar la version del path donde lo fija.
  Probado en rojo apuntando el snippet al runtime congelado anterior.

## 2. D-03 = opcion C, ejecutada (`PND-052`)

**La medicion con la que se argumento la decision estaba mal, y la correccion ES el
hallazgo.** El rango "30% a 38%" se midio en **bytes**, y los bytes son el instrumento
equivocado (un caracter CJK pesa tres, uno ASCII pesa uno). Contado en **secciones**, las
nueve traducciones cubren **exactamente las mismas 34 de las 83** que `SPEC.md` tiene hoy:
no son nueve traducciones de calidad distinta, son **nueve copias del mismo desfasaje**. Y
no estan truncadas: traducen completo el documento de mayo (llegaba a la seccion 14) y el
ingles crecio 49 secciones desde entonces.

**La causa raiz de que se podriera en silencio: no habia productor.** Ningun script del
repo generaba `i18n/*/SPEC.html`. Ahora `scripts/build-translation-banners.mjs` los
produce y los verifica **re-renderizando el cartel esperado y comparando byte a byte**, no
grepeando un numero. `check:release` lo corre.

Scripts nuevos: `check:translations`, `build:translations`, `test:translations-gate`,
`test:translations` (navegador).

Tres defectos que salieron de ESCRIBIR el cartel, no de leer: los nueve `SPEC.html`
declaraban `<html lang="en">` sobre prosa traducida (un lector de pantalla los leia con
voz inglesa) y el arabe sin `dir="rtl"`; el generador de mayo renderizaba el frontmatter
YAML **como parrafo visible** (lo primero que leia un visitante era
`translation_source_hash`); y la insignia decia `NAC3 v2.2` a secas.

Dos defectos **del propio candado**, que encontraron sus tests: uno rechazaba por el
motivo equivocado y el otro **pasaba en verde** sobre un id de portada roto, porque
comparaba subcadenas y `nac_landing.translations.de` es prefijo de `...deXX`.

## 3. Hallazgo nuevo que NO es de D-03: `PND-053` / N-46

**262 paginas publicadas -- `SPEC.html` entre ellas -- enlazan `css/yujin-tokens.css`, que
nunca se publico y da 404 en el servidor.** Lo encontro el gate de navegador nuevo al
exigir cero errores de consola. Es decision del dueno (publicar el archivo, o sacarle el
`<link>` al generador), asi que el gate lo **tolera por URL**, lo imprime como WARN
nombrando el pendiente, y sigue rojo ante cualquier otro error. **Cuando `PND-053` cierre
hay que sacarle esa tolerancia al gate: es parte de su criterio de aceptacion.**

## 4. Casilla 5 del bloque del dueno: hecha y esperando UN push (`PND-054`)

El dueno dijo `C:\rpaforce\yujin.app`. **Ese directorio ya no publica nada:** el
`deploy.yml` de `rpaforce-crm` declara un CUTOVER del 2026-06-29 que movio las landings a
**`pkuschnirof/rpaforce`, carpeta `web/yujin.app/`** y borro los rsync que publicaban ese
arbol (quedo congelado el 23 de mayo). Confirmado comparando el contenido servido: el
archivo que sirve `https://yujin.app/sitemap.xml` es **`C:\RPAForce\web\yujin.app\sitemap.xml`**.

Hecho ahi, commit **`d503ce4`**, rama `main`, **SIN pushear**: +7 urls de entrada de
nac-spec en el sitemap y `+Sitemap: https://yujin.app/nac-spec/sitemap.xml` en
`robots.txt`. Siete y no las 63 a proposito: duplicar una lista generada dentro de un
archivo a mano es como empieza a podrirse una segunda copia de la verdad. Escrito con los
CRLF del propio archivo (escribir LF en un documento CRLF es el N-40 con otro sombrero).

**No se pusheo porque ese repo despliega a produccion en cada push a main**, es un acto
hacia afuera y en otro proyecto. Falta: `cd C:\RPAForce\web && git push`.

## 5. El bloque de verificacion del dueno, despues de esta sesion

Sigue en **7 de 8 medido contra el servidor**, y es correcto que lo diga: todo lo de esta
sesion esta en una rama, no publicado. La casilla 5 pasa a verde cuando se pushee el repo
web (seccion 4). Las casillas 6, 7 y 8 ya estaban verdes con la 2.5.0 y la 2.5.1 no las
mueve. **No cantar verde contra el repositorio.**

## 6. Lo que NO se debe hacer al volver

- **No checkoutear ni resetear `C:\yujin-nac-spec`.** Otra sesion esta trabajando ahi.
- **No fusionar `index.html` a ciegas.** Hay que rehacer la portada sobre la 2.5.1.
- **No sacarle la tolerancia del 404 al gate de traducciones** hasta cerrar `PND-053`.
- **No tocar `SPEC.md` sin un salto de version:** mueve `spec_sha384` del contrato.
- **No cerrar `PND-054` sin medir contra el servidor.**

## 7. El patron, otra vez, y van nueve

**Cada capa de verificacion que se construye encuentra un hallazgo que meses de lectura no
habian encontrado.** El cartel de traduccion delato el `lang="en"` de nueve paginas, el
frontmatter renderizado como prosa y la insignia mentirosa. El gate de navegador delato un
404 en 262 paginas publicadas. El salto de version delato un slot que no existia
(`SPEC.html`) y una version tipeada a mano en el unico gate que existia para cazar algo
tipeado a mano. Y los tests del candado nuevo delataron dos defectos del candado nuevo,
uno de ellos **verde sobre el defecto que existia para atrapar**.

Corolario operativo, van tres sesiones seguidas: **una comparacion que no puede fallar no
es una verificacion, es una ceremonia.** Y el corolario del corolario, que es nuevo:
**medir con el instrumento equivocado es peor que no medir**, porque el numero que sale se
cita despues como si fuera un hecho -- el "30% a 38%" de D-03 era ruido de UTF-8 y
sobrevivio dos sesiones.

---
# Handoff -- continuar sesion

**Actualizado:** 2026-10-26, QUINTA sesion del dia.
**Donde quedo:** **la 2.5.0 estable ESTA PUBLICADA.** El dueno firmo el indice del
contrato, el paquete salio a npm con el tag `latest` y el sitio esta deployado, las dos
cosas medidas contra el registro y contra el servidor y no contra el arbol. El bloque de
verificacion del dueno pasa de **1/8 a 7/8**, y el unico rojo que queda es externo.
CUATRO pendings del release cerrados con expediente y recibos, y uno nuevo abierto.

**Lo que el dueno tiene pendiente, y es UNA decision:** `PND-051` -- la linea 4 del SPEC
publicado todavia declara un alpha como la version vigente, y arreglarla cuesta una
**2.5.1** con **una firma mas** suya. Recomendacion: hacerla. Detalle completo en la
seccion 0, entrada N-45 del backlog.

**Palabra de reanudacion:** cuando el dueno diga **"Continua"**, se sigue por la seccion
0 de este documento.

---

## 0. ULTIMO ESTADO -- 2026-10-26, QUINTA sesion del dia: LA 2.5.0 ESTA PUBLICADA

**Esta seccion MANDA sobre todo lo que sigue, incluida la vieja seccion 0.**

### Lo que el dueno hizo en esta sesion, y era el unico paso que faltaba

Firmo el indice del contrato en su maquina y pego la salida. `check:release` quedo
verde entero. A partir de ahi Forge ejecuto el paso 6 del 4.3 completo.

```
key_id       nac3-contract-2026
fingerprint  sha384-joOCEsjN728DRxS8WI/xBGVTkWN7LsK/xQWhQM8mf561GUu84rzItUxh7rliE4ft
chain head   sha384-tBEQVA0WiCwvJAQDkH4zAoE7BuCTweehwiYphpDJr//fm7ANhKFwzBQwK1F8/Jv4
entries      2 (2.5.0-alpha.5, 2.5.0)
signed at    2026-10-26T18:36:51Z
```

### La 2.5.0 esta publicada en los dos lugares, y medido contra los dos

| que | donde se midio | resultado |
| --- | --- | --- |
| npm | `npm view @nac3/runtime dist-tags` | `{ latest: '2.5.0', alpha: '2.5.0-alpha.5' }` |
| npm | `npx -p @nac3/runtime nac3 --version` | `@nac3/runtime CLI 2.5.0 (Native Agent Contract v2.5)` -- **N-17 cerrado EN EL REGISTRO** |
| web | deploy runs `40380029640` y `40382269294` | **success, 17 pasos cada uno** (incluidos los 4 chequeos de humo contra el sitio vivo) |
| web | `node scripts/verify-contract-api.mjs --base https://yujin.app/nac-spec/ --expect-head-from-repo` | **9 de 9 OK**, con testigo independiente |
| tarball | `npm pack @nac3/runtime@2.5.0` y leer `contract-head.json` | cabeza `tBEQVA0WiCwv...` -- **el tercer testigo existe y coincide** |

**Latencia que conviene recordar para la proxima:** `npm publish` contesto *"your package
is being processed and may take a few minutes to become available"* y el packument tardo
**unos 25 minutos** en publicar la version. La primera medicion del dist-tag dio el valor
VIEJO. **La aceptacion del publish no es la publicacion**: se mide contra
`registry.npmjs.org`, nunca contra la salida de `npm publish`.

### El bloque de verificacion del dueno: de 1/8 a 7/8

Recorrido contra el SERVIDOR y el REGISTRO (seccion 5 de
`docs/PENDING_AUDITORIA_2026-10.md`, con la tabla medida fila por fila):

1. dist-tags **VERDE**  |  2. integrity **VERDE** (4)  |  3. does not cover **VERDE** (1)
4. urazuke **VERDE** (7)  |  5. sitemap raiz **ROJO Y EXTERNO** (no vive en este repo)
6. Asistive **VERDE** (0)  |  7. promesas de version viejas **VERDE** (vacio)
8. `npx nac3 validate <url>` **VERDE**, medido desde un directorio adoptante limpio

El punto 8 reporta `Conformance level: NONE ASSERTED` con sus tres fallos medidos
(L2-f6a7aa72 = N-37, L3-cc540e31 = N-36, L3-4bdc1b16 = N-35, las tres decisiones del
dueno) y los dos que no midio. Salida 1, que es correcto: no afirma un nivel. Con `npx`
a secas da salida 3 pidiendo playwright, por diseno.

**Y la advertencia sobre el instrumento quedo resuelta sola:** el validador contra la
portada servida de hoy ve **64 ids declarados, 64 resueltos, 0 hallazgos de severidad
error**. A la manana reportaba 128 huerfanos falsos porque la copia congelada era anterior
al arreglo de N-33. Los 128 ids del DOM contra 64 declarados son **N-31** (`PND-038`),
abierto y conocido.

### CUATRO pendings cerrados con expediente y recibos

`PND-032` (el tren: 2.5.0 estable promovida a latest), `PND-033` (D-02, la API de
contrato, que esperaba la firma), `PND-035` (G3-DERIVA, que esperaba al servidor),
`PND-037` (G5+G6, la portada honesta, que esperaba al servidor). Cada uno con su
`red_proof` + `green` + `regression` grabados (`RCP-031` a `RCP-048`).

**Dos lecciones salieron de grabar esos recibos, y las dos son del tipo que este
proyecto ya conoce:**

- **Un recibo decia medir el servidor y media el repositorio.** En cmd.exe
  `set N0_BASE=... && node ...` **no llega al proceso**: el gate cae a su server local,
  imprime su base y reporta GREEN sobre el repositorio mientras el operador cree que
  midio el sitio. Arreglado donde correspondia: `e2e/landing-limits-check.mjs` acepta
  ahora `--base <url>`, que todo shell pasa igual (commit `ca68bde`). Un recibo que
  nombra mal su sujeto es peor que no tenerlo.
- **Un red_proof se ESTRELLO en vez de fallar**, por una dependencia que no viajo al
  worktree base. Se re-corrio con las dependencias y ahi si refuto con nombre.

### N-45, el hallazgo de esta sesion: no salio de leer, salio de PUBLICAR

**La promocion de `latest` falsifico dos documentos publicados.** Hasta las 18:40 de hoy
`latest` apuntaba a `2.5.0-alpha.5`, asi que *"v2.5.0-alpha.5 ... promoted to npm latest"*
era un hecho. El acto de promover es lo que la volvio falsa. Es N-17 en una superficie
humana: una version escrita a mano donde ningun candado podia verla.

**Mitad CERRADA (`b8fb31b`):** el README -- que el deploy tambien publica en
`/nac-spec/README.md`, verificado 200, y que es la portada de GitHub -- decia
`status-2.5--alpha`, `spec-v2.5_alpha.5`, *"v2.5.0-alpha.5 shipped"* y
*"## Status: alpha + stable in parallel"*. Arreglado, mas una promesa que el propio
archivo contradecia dos pantallas abajo. **Candado: dos slots nuevos, el gate pasa de
18 a 20**, y la suite de 18 a **25 casos** -- 6 rojos nuevos, y el primero no es
hipotetico: **es el README con el que la 2.5.0 salio de verdad, restaurado textual.**
Los badges se DECODIFICAN en vez de matchearse con regex, porque shields.io escribe un
guion literal como guion doble y el badge de una prerelease se lee `2.6.0--alpha.1`.

**Mitad ABIERTA (`PND-051`, decision del dueno):** la **linea 4 de `SPEC.md`** sigue
declarando `Status: v2.5.0-alpha.5` al lado de una linea 3 que declara 2.5.0 estable.
Se reescribio, **se midio la consecuencia y se revirtio**: `api/v/2.5.0/contract.json`
publica `spec_sha384`, la huella de los bytes del SPEC, asi que cualquier edicion mueve
el contrato de una version ya publicada -- lo que el metodo prohibe. Necesita **2.5.1**
(salto, copia congelada, entrada nueva en la cadena y **una firma mas del dueno**), y el
tarball ya publicado lo lleva adentro, asi que un deploy tampoco lo arregla.

### Lo que sigue esperando al dueno

1. **`PND-051` -- 2.5.1 ahora o a la 2.6.** Es una firma suya. Recomendacion: 2.5.1.
2. **D-03 (idiomas).** Traba la pasada de traducciones + N-28 + N-31 + N-32.
3. **N-35 a N-38** (`PND-044` a `PND-047`): cuatro decisiones sobre texto normativo de
   niveles. Ninguna trababa el release y ninguna traba nada ahora, pero **tres de ellas
   son exactamente los tres fallos que el punto 8 reporta** sobre la portada del propio
   protocolo.

### Trabajo abierto que no espera a nadie

`PND-048` (N-39, seis acciones que no confirman nunca), `PND-038` (N-31, 116 ids pintados
y 64 declarados), `PND-040` (re-medir el benchmark contra la 2.5.0, decidido historico),
`PND-049` (los cinco gates de navegador fuera del CI), `PND-030` (el paraguas de la
auditoria, cierra cuando cierren las decisiones), `PND-001`.

**Urazuke sigue fuera de alcance hasta la 2.6** (`PND-002` a `PND-028`).

### Palabra de reanudacion

Cuando el dueno diga **"Continua"**, se sigue por esta seccion 0: lo primero es su
respuesta a `PND-051`.

---

## 0-ante. ESTADO DE LA CUARTA SESION DEL 2026-10-26 (historico: lo mando la seccion 0)

### Lo que el dueno decidio en esta sesion

Textual: **"Dejarlo como esta."** Sobre N-29: el valor de cable
`NAC.conformance_tier` **NO se renombra**, sigue devolviendo `NAC-3-versioned`, y los
tres valores del vocabulario conservan su nombre. Es una **no-accion declarada**, no una
deuda: reabrirla necesita una decision nueva y un salto de version, porque el valor ya
viaja publicado en el contrato de la 2.5.0. Expediente en la seccion N-29 de
`docs/PENDING_AUDITORIA_2026-10.md`. **Con esto N-29 queda CERRADO completo.**

### El salto de version: HECHO en la rama (no publicado)

Pasos 1 a 3 del 4.3, en orden y sin saltear ninguno:

1. **Version a 2.5.0.** 11 slots declarados movidos a mano desde la fuente autoritativa;
   el resto lo escribieron sus generadores. `check:version` da **18/18 sobre 2.5.0**.
   La portada deja de decir `alpha` y dice `stable`; el changelog tomo su fecha; el SPEC
   declara 2.5.0 estable. La seccion 9.1 del SPEC ya decia normativamente que `latest`
   solo apunta a una estable, asi que no hubo que tocarla.
2. **`build-integrity.mjs --write`.** Congelo `js/2.5.0/nac.js` (349103 bytes) y re-pinneo
   la portada. Integridad **verde**.
3. **`build-contract-api.mjs --write`.** La cadena tiene ahora **2 entradas** y
   `api/latest.json` declara `stable=2.5.0`, `prerelease=2.5.0-alpha.5`. Cabeza de cadena
   `sha384-tBEQVA0WiCwv...`.

**N-24 entro en esta regeneracion, como estaba planificado, y de verdad.** El tercer
testigo de la cabeza de cadena ya **existe**: `runtime/contract-head.json`, escrito por
`--write`, exigido por el modo check, y listado en `files` de `runtime/package.json` --
lo cual la compuerta **tambien** verifica, porque un testigo que no viaja en el tarball
es el mismo defecto con nombre de archivo. Verificado por `npm pack --dry-run`: el
tarball `nac3-runtime-2.5.0.tgz` lo lleva (972 B, 22 archivos). El texto de politica de
`api/index.json` deja de prometer tres testigos y **nombra las tres direcciones**, con la
salvedad honesta de que el del paquete existe **desde la 2.5.0** (las releases anteriores
se publicaron antes de que la API existiera).

### Cinco hallazgos nuevos, los cinco CERRADOS, y ninguno salio de leer

Salieron de **preparar y verificar el salto**. Expediente completo de cada uno en
`docs/PENDING_AUDITORIA_2026-10.md`.

- **N-40 (bloqueaba):** el fragmento copy-paste de instalacion de la portada publicaba
  una huella SRI **que no corresponde a ningun archivo publicado** -- era la huella de
  los bytes CRLF, el defecto de N-22 sobreviviendo donde `dcb71ea` solo arreglo el
  `<script>` real. Un adoptante que copiaba el fragmento obtenia un navegador que se
  niega a ejecutar el runtime, **en silencio**. Causa de fondo: asimetria
  productor/consumidor. Arreglado en dos mitades (la huella del fragmento tiene
  productor; la compuerta refuta toda cadena `sha384` de la pagina que no sea una huella
  publicada). **5 casos nuevos**, integridad pasa de 16 a **21**.
- **N-41 (bloqueaba):** la compuerta de versiones **refutaba documentacion verdadera** el
  dia que se publica una estable que el codigo ya nombra -- 7 frases ciertas en rojo.
  Arreglado haciendo la pregunta estructural en vez de por digitos.
- **N-42 (bloqueaba, dos mitades):** (a) la compuerta de versiones leia su fuente de
  verdad de un **comentario** (linea 8 de `js/nac.js`, no el export de la linea 7901), asi
  que daba **18/18 verde sobre un runtime que no exporta ninguna version**; ahora la
  carga en un sandbox `vm` y le pregunta que exporta. (b) la prueba del workflow de
  deploy **pasaba** con un camino versionado recien escrito a mano mientras nombrara la
  version en curso, y rompia el deploy en el salto siguiente -- que es la falla para la
  que se creo.
- **N-43 (avisa):** un caso de la suite del contrato **dejo de medir** el dia que su
  version inventada (`2.5.0`) se volvio real. Ahora usa una version inalcanzable **con
  guarda** que se niega a correr si la cadena la alcanza.
- **N-44 (bloqueaba):** `fill()` **se estrellaba** en todo host con DOM parcial (shim de
  test, SSR, headless) y con un `TypeError` **fuera del contrato de errores**, porque la
  guarda miraba el descriptor y la expresion atravesaba
  `window.HTMLInputElement.prototype`: el fallback era inalcanzable en el unico entorno
  para el que se escribio. Preexistente, verificado contra HEAD.

### La compuerta de versiones ya tiene suite (era la ultima sin tests)

`scripts/test-version-gate.mjs`, **18 casos**, cableada en `npm run check:release` y en
el CI justo detras de la compuerta que prueba. Escribirla encontro N-41, N-42a y N-42b
en la misma hora. **Van ocho hallazgos que no salieron de leer**, y la variante mas
barata sigue siendo la misma: escribirle los tests a un candado que no los tenia.

### Estado de los gates al cierre de esta sesion (medido, no recordado)

| gate | estado |
| --- | --- |
| `check:integrity` | **PASSED** |
| `check:version` | **18/18 sobre 2.5.0** |
| `test:version-gate` (nuevo) | **18/18** |
| `test:integrity-gate` | **21/21** (eran 16) |
| `test:integrity` (navegador) | **PASSED** |
| `test:validate-global` | **33/33** |
| `test:contract` | **36/36** |
| `test:contract-http` | **8/8** |
| `test:limits` (navegador) | **GREEN** |
| `test:cli-levels` (navegador) | **29/29** |
| `test:fill-setter` (navegador, nuevo) | **8/8 GREEN** |
| suite del runtime | **18 de 19 archivos verdes** (ver nota) |
| `check:contract` | **ROJO por un solo motivo: falta la firma del dueno** |

**Integridad y contrato ya NO estan rojos por el salto de version** -- ese motivo se
resolvio. El unico rojo que queda es la firma, y es por diseno: *una release mueve la
cadena, asi que el indice tiene que firmarse de nuevo, y ese paso manual ES la capa*.

**Nota sobre la suite del runtime, corrigiendo lo que decia el handoff anterior:** el
handoff declaraba *"suite del runtime (14 stages) verde"* y **no era cierto**. `stage4`
tenia 2 casos rojos -- es N-44, ya cerrado, ahora **31/31**. Y `stage3-backend` **no
puede correr en esta maquina y no es un defecto**: su propia cabecera lo declara
*local-only*, pide una `api_key` de un repositorio hermano (`crm_desa/config/config.json`,
que no existe aca) y pega contra un endpoint de LLM en produccion. Lo verde medible es
**18 de 19**, y el que falta es externo por diseno.

### Lo que falta para publicar

1. **La firma offline del dueno.** El unico paso, y no lo puede hacer Forge: la clave no
   vive en este repositorio ni es un secreto de CI (decision PND-034 opcion A). Comando
   en la cabecera de este documento.
2. **Publicar el paquete y promover `latest` a la 2.5.0 estable** (D-01 opcion C).

### Lo que sigue esperando al dueno, y ya no es N-29

- **D-03 (idiomas).** Lo unico que le espera ademas de su firma. Traba la pasada de
  traducciones + N-28 + N-31 + N-32.
- **N-35 a N-38:** cuatro decisiones sobre texto normativo de niveles. **Ninguna traba el
  release.** Las dos que mas pesan: ninguna herramienta puede afirmar el nivel 3 hoy
  (N-36), y el nivel 2 leido literalmente exige la forma de manifest que la seccion 4
  llama heredada (N-37).

### Trabajo abierto que NO traba el release

- **N-39** (`PND-048`): seis acciones declaradas de la portada no confirman nunca.
- **N-31** (`PND-038`): la portada declara 50 ids y pinta 116.
- **PND-040**: re-medir el benchmark contra la 2.5.0 (las cifras salen declaradas
  historicas, por decision del dueno).
- **PND-049**: los gates que necesitan navegador no corren en CI. Ahora son **cinco**,
  no dos: `test:integrity`, `test:limits`, `test:cli-levels` y los dos nuevos de esta
  sesion, `test:fill-setter` y `test:snippet`. Deliberadamente no cablee los nuevos al
  CI: cablearlos es el trabajo de ese pendiente y hay que instalar el navegador en el
  runner. El riesgo crecio: `test:fill-setter` es el UNICO que puede contestar si
  `fill()` sigue usando el setter nativo (la suite unitaria no puede, su shim no tiene
  constructores de elemento), y `test:snippet` es el unico que mide el camino de
  instalacion como lo vive un adoptante.

---

## 0-bis. ESTADO DE LA TERCERA SESION DEL 2026-10-26 (historico)

Lo de la seccion 0-bis y de las secciones 1 a 8 sigue siendo cierto salvo donde esta
seccion diga otra cosa.

### Lo que el dueno decidio en esta sesion

Textual: **"Terminemos las piezas."** Es decir: NO publicar la 2.5.0 con el punto 8 en
rojo, sino cerrar primero N-18 y N-29 y despues saltar la version. Eso se hizo.

### Las dos piezas que faltaban: HECHAS

**N-18, segunda mitad -- CERRADO.** `nac validate <url>` carga la pagina en un Chromium
real y **reporta un nivel de conformidad** contra los identificadores de `levels.json`.
Playwright es opcional y se resuelve en tiempo de llamada (no entra como dependencia del
paquete; si falta, salida 3 con las dos lineas que lo instalan). `--drive` clickea los
controles anunciados, que es lo que decide los dos requisitos conductuales del nivel 1, y
esta apagado por default porque clickear la pagina de produccion de alguien no es una
operacion de lectura. Todo nivel que reporta viene con su cobertura ("asserted on N of M
requirements") y con la frase de que es una medicion y no un certificado. El modo
directorio ahora **dice en voz alta** que no puede decidir un nivel, en vez de imprimir
un conteo de hallazgos que un lector podia tomar por uno.

Las definiciones de nivel NO estan en el CLI: se generan de `SPEC.md` seccion 8 por
`scripts/spec-levels.mjs`, **el mismo modulo** que genera `api/v/<version>/levels.json`.
Cada requisito publica el `decider` que lo juzga, y el build se niega a emitir un CLI
cuya tabla de decididores no coincida con el contrato en ninguna de las dos direcciones.

**N-29 -- la mitad que no necesitaba decision: HECHA.** `contract.json` publica el
vocabulario entero de `conformance_tier` (los tres valores, que exige cada uno, cual
declara este runtime, donde estan definidos) y la frase que separa tier de nivel. Los
valores se extraen de la seccion 6 del RFC, nunca se escriben a mano, y el generador
refuta cualquier desacuerdo entre el RFC, el sidecar y lo que el runtime declara.
**Lo unico que queda abierto de N-29 es la decision de renombrar `NAC-3-versioned`.**

### Donde quedo el bloque de verificacion del dueno

**Las ocho casillas estan ahora en un solo estado: una verde, seis hechas y en cola
detras del salto de version, y la quinta externa. Ninguna espera trabajo nuestro.** El
punto 8 se suma a esa cola: el CLI ya hace lo que pide, y `npx nac3 validate` seguira
bajando el CLI viejo hasta que la 2.5.0 se publique. La tabla sigue diciendo uno de ocho
y es correcto que lo diga -- mide lo que un adoptante recibe.

### Cinco hallazgos nuevos, y ninguno salio de leer

Todos salieron de **construir** el validador, y tres de ellos de **manejar** una pagina
con el:

- **N-35** (`PND-044`): `validate_global(opts?: {probe?: boolean})` es normativo en 10.1 y
  el runtime no lee `probe` nunca. Los requisitos de nivel 2 y 3 quedan distinguidos solo
  por el umbral de severidad. **Decision del dueno:** cablear o retirar.
- **N-36** (`PND-045`): el nivel 3 pide manifests firmados con HMAC y el runtime **no sabe
  firmar ni verificar un manifest** -- `sign_provenance` / `verify_provenance` son de
  eventos. **Ninguna herramienta puede afirmar el nivel 3 hoy.** Decision del dueno.
- **N-37** (`PND-046`): el nivel 2 exige `tabs[]/fields[]/actions[]`, la forma que la
  seccion 4 llama heredada. Una pagina escrita como el documento manda no alcanza el
  nivel 2 -- la portada del protocolo incluida. Decision del dueno (texto normativo).
- **N-38** (`PND-047`): el nivel 1 pide un evento que un enlace no puede emitir despues de
  su propio unload. 31 de los 39 actions de la portada son enlaces. Decision del dueno.
- **N-39** (`PND-048`): seis acciones declaradas de la portada **no confirman nunca** y un
  agente que las llama se come un timeout de cinco segundos cada vez. No es decision, es
  trabajo, y no esta empezado: queda fuera del alcance de estas dos piezas.

### Lo que falta para publicar, en orden

1. **El salto de version, paso 4.3 tal cual esta escrito abajo.** Ya no lo precede nada.
2. **El paso 4 de 4.3 es del dueno: la firma offline en su maquina.** Sin eso el CI se
   niega a publicar.

**Lo unico que sigue esperando al dueno ademas de su firma:** **D-03 (idiomas)**, que
traba la pasada de traducciones + N-28 + N-32, y ahora **la decision de N-29** (renombrar
o no `NAC-3-versioned`), que conviene resolver ANTES del salto porque mover un valor de
cable despues cuesta otra version. Las cuatro decisiones de N-35 a N-38 no traban el
release.

### Estado de los gates al cierre de esta sesion

version coherence **18/18 verde** (eran 16; el candado de N-17 ahora cubre
`runtime/src/cli.mjs` y `cli-url.mjs`); contract **36/36**; contract-http **8/8**;
integrity-gate **16/16**; integrity load **verde**; validate-global **33/33**; limits
**verde**; suite del runtime (14 stages) **verde**; **cli-levels 29/29 (nuevo)**.
Integridad y contrato **siguen en rojo por el unico motivo documentado**: falta el salto
de version.

**El candado nuevo se probo en rojo contra el CLI anterior: 29 de 34 casos caen, y los 5
que quedan verdes son los del grupo BUILD, que prueban el build y no el binario.** Ese
rojo delato dos defectos del propio candado, los dos arreglados: se **estrellaba** en la
primera llamada en vez de fallar un caso -- el mismo defecto de los dos candados
anteriores -- y dos casos daban verde **sobre una lista vacia de veredictos**, es decir
justo sobre la regresion que existen para atrapar. Ademas se probo por separado que el
gate de simetria de decididores es lo que refuta la rotura: con el gate, salida 1; sin
el, la misma rotura pasa con salida 0.

---

## 0-ter. ESTADO DE LA SEGUNDA SESION DEL 2026-10-26 (historico)

Lo de las secciones 1 a 8 sigue siendo cierto salvo donde esta seccion diga otra cosa.

### Lo que el dueno decidio en esta sesion

- **Las ocho frases de limites y la frase de las tres naturalezas: LEIDAS Y APROBADAS SIN
  CAMBIOS** (2026-10-26). Textual: *"Todo leido, decision declararlas historicas. Publicar
  2.5 con cifras historicas y remedir despues."* Expediente en
  `docs/LIMITS_APPROVAL_2026-10-26.md`.
- **Cifras del benchmark: historicas.** La 2.5.0 sale con las cuatro corridas declaradas
  historicas; la re-medicion es `PND-040`, fuera del camino critico.
- **D-03 (idiomas) SIGUE SIN DECIDIRSE.** Es lo unico que falta del dueno ademas de su
  firma offline, y lo unico que traba la pasada de traducciones + N-28 + N-32.

### Lo que quedo hecho y commiteado (branch `release/2.5.0`, pusheado, sin deploy)

| Commit | Que dejo |
| --- | --- |
| `c64fcf2` | La seccion publica de limites, el enlace de vuelta a Urazuke (tambien en el pie) y las dos licencias juntas. 13 ids nuevos pintados **y declarados**. Gate `npm run test:limits`. |
| `1e07550`, `7250d06` | El barrido de pantallas se fecha a si mismo y se re-corrio con el arbol limpio. |
| `c7eb0ef` | **N-33** (el validador global no veia los manifests canonicos) + **N-14** (los cinco baldes llevan codigo; el generador los LEE de un fixture en vez de escribirlos). SPEC 10.1 con la forma real (**N-34**). |
| `781d769`, `366ee73`, `9d34dbf` | Los dos candados fallan con nombre en vez de estrellarse: lo delataron los propios recibos de evidencia. |

### Hallazgos nuevos de esta sesion (todos escritos en el backlog)

- **N-31** (`PND-038`): la portada pinta 130 ids y declara 64. La brecha quedo igual que
  antes -- 66 crudos, 64 reales -- porque los 14 nuevos se declararon en el mismo commit.
  Atado a D-03.
- **N-32** (`PND-041`): el generador del SPEC emite enlaces de prosa con `data-nac-role` y
  sin `data-nac-id`. Atado a N-28 y a D-03.
- **N-33** (`PND-042`, **CERRADO**): `validate_global` devolvia `total_ids: 0`, llamaba
  huerfano a todo lo declarado, no podia disparar tres de sus baldes y contestaba
  `ok: true`. Medido en la portada: 0 -> 64 ids vistos, 128 -> 64 huerfanos.
- **N-34** (**CERRADO**): la seccion 10.1 documentaba un array plano que el runtime nunca
  devolvio.

### Lo que falta ANTES del salto de version (paso 4.3), en orden

1. **N-18, segunda mitad** -- el validador de CLI acepta una URL y **reporta nivel**. Es la
   casilla **punto 8** del bloque del dueno. `levels.json` ya publica los tres niveles con
   sus 11 requisitos, asi que es trabajo, no espera. **No empezado.**
2. **N-29** -- publicar el vocabulario de `NAC.conformance_tier` (renombrar el valor de
   cable sigue siendo decision del dueno). **No empezado.**
3. Recien despues, el paso 4.3 tal cual esta escrito abajo. **El paso 4 de 4.3 es del
   dueno: la firma offline en su maquina.** Sin eso el CI se niega a publicar.

**Decision abierta para el dueno, y es de alcance, no tecnica:** publicar la 2.5.0 ya,
con el punto 8 todavia en rojo, o terminar primero N-18 + N-29 y publicar con las ocho
casillas en su mejor estado. Lo primero saca la 2.5.0 hoy; lo segundo agrega un tramo de
trabajo antes del salto.

### Estado de los gates al cierre de esta sesion

- version coherence **16/16 verde**; validate-global lock **33/33**; contract **36/36**;
  contract-http **8/8**; integrity-gate **16/16**; integrity load test **verde**; limits
  gate **verde**; suite del runtime (14 stages) **verde**.
- integridad y contrato **siguen en rojo por el unico motivo documentado**: falta el salto
  de version. Es lo esperado.

---

## 1. Estado verificado al cerrar (medido, no recordado)

| Dato | Valor |
| --- | --- |
| Branch | `release/2.5.0`, upstream `origin/release/2.5.0`, 0 ahead / 0 behind |
| Worktree | limpio |
| HEAD | `d40725c` -- docs(audit): N-30 was recorded and deferred, not newly found |
| `main` | `ebfe261` -- es lo que el deploy publica; **no tiene nada de G3** |
| Produccion | `yujin.app/nac-spec` sirve todavia los textos viejos. **Ningun deploy se disparo con el trabajo de G3.** |
| Version en el arbol | `2.5.0-alpha.5` en las 16 casillas (gate de version VERDE) |
| Gate de integridad | **ROJO** -- `js/2.5.0-alpha.5/nac.js differs from js/nac.js` (el typo de N-07 movio 3 bytes de comentarios del runtime: 344.665 publicado vs 344.668 en el arbol) |
| Gate de contrato | **ROJO** -- `api/v/2.5.0-alpha.5/ differs from what the runtime generates, and that version is already in the chain` |
| Lectura de los dos rojos | **correcta y esperada.** Los dos dicen lo mismo: *bump the version*. Editar el SPEC ES una version nueva del contrato. Se destraban con el salto a 2.5.0, no antes. |
| Bloque de verificacion del dueno | **1 de 8** (solo el punto 2). Puntos 3 y 4 medidos hoy en `index.html`: `does not cover` = 0, `urazuke` = 0. |
| Firma offline | operativa. Clave en custodia del dueno (fuera del repositorio), respaldada offline por el dueno el 2026-10-25. |
| Tarea de fondo viva | `task-mvmk444d-2` -- `php -S localhost:8855` de una sesion anterior. Nadie la usa; proponer pararla. |

---

## 2. Alcance acordado con el dueno (NO reabrir)

- **"Todos los pendientes" = todos los que NO son Urazuke.** Urazuke sale de la 2.5.0
  y pasa a la **2.6**. Los 27 peldanos (`PND-002` .. `PND-028`) **no son requisito**
  del release y no se avanzan en este tramo.
- **D-01 = opcion C**: terminar el backlog de auditoria y publicar una **2.5.0 estable
  de verdad**, coherente consigo misma, promovida a `latest`.
- **D-02 = SI**, ampliado: contrato como API estatica validada, multiversion,
  `latest` sin purga, a prueba de manipulacion. **Construido y publicado.**
- **D-04 = se escribe** la seccion publica de limites.
- **N-06 = opcion A**: los niveles se llaman `NAC3 Conformance Level 1/2/3`.
- **N-20 = aceptado por el dueno**: los documentos internos se publican. Razon textual
  del dueno: *"no vendo perfeccion, sino trabajo y evolucion"*. Verificado antes de
  aceptar: cero claves privadas y cero credenciales en todo el arbol publicable.
- **Custodia de la clave = opcion A**: clave privada **offline, en la maquina del dueno**.
  Nunca entra al repositorio ni al CI.

---

## 3. Lo unico que sigue esperando al dueno

**D-03 -- que se declara sobre idiomas.** Es la unica decision abierta de las cuatro.
Hecho medido: la spec se publica en 10 idiomas y **9 de esas 10 son traducciones
parciales (30%-38% del canonico)**.

- **A** -- declarar el ingles canonico; las traducciones, no normativas. Costo: una frase.
- **B** -- internacionalizar portada y pagina del spec. Costo alto y permanente; no toca
  el problema real. **No recomendada.**
- **C** -- A, mas que cada traduccion declare que es parcial y de que version, enlazado
  desde la portada. Costo medio (9 archivos + portada).
  **Es la recomendacion**: convierte "10 idiomas" en un dato verdadero en vez de un
  conteo de archivos, y es la misma forma que el dueno eligio en D-01 y D-02
  (el minimo honesto que desbloquea, con el destino completo escrito al lado).

**Por que importa el orden:** las 9 traducciones se regeneran **de una sola vez**, y en
esa misma pasada entra el arreglo de N-28 (los 85 `data-nac-id` renumerados). Hacerlo
antes de decidir D-03 es hacerlo dos veces.

**Si el dueno dice "Continua" sin responder D-03:** se arranca igual por el paso 4.1,
que no depende de D-03, y se le vuelve a pedir D-03 recien cuando toque la pasada de
traducciones (paso 4.4). **No se asume una opcion por el.**

---

## 4. Al volver -- orden de trabajo exacto

### 4.0 Higiene de reanudacion (minutos)

1. `git fetch && git status` -- confirmar `release/2.5.0` limpio en `d40725c`.
2. **Reintentar los tres cierres que el clasificador de Forge rechazaba** (el defecto que
   el prompt de `.tmp/prompt-forge-clasificador-rojo.md` manda arreglar; si la version
   nueva de Forge ya lo trae, cierran sin forzar):
   - `PND-034` -- metodo a prueba de manipulacion + custodia de la clave (expediente y
     3 recibos adentro; la decision del dueno ya esta tomada y ejecutada).
   - `PND-035` -- G3-DERIVA (N-05, N-07, N-13, N-23 + 4 defectos del gate de integridad).
   - `PND-036` -- N-06 opcion A.
   **Criterio de aceptacion del arreglo de Forge: estos cierran SIN `force_reason`.**
   Si siguen rechazados, no insistir: dejarlo anotado y seguir.
3. Proponer parar la tarea de fondo `task-mvmk444d-2`.

### 4.1 Redaccion de la superficie publica -- NO depende de D-03 (este es el trabajo que arranca)

Todo esto se acumula en la misma publicacion, porque el gate de contrato hashea el SPEC
entero. **No se publica de a goteo: se junta y sale con la 2.5.0.**

| # | Trabajo | Hallazgo | Casilla del bloque |
| --- | --- | --- | --- |
| a | **Seccion publica de limites** ("what NAC3 does not cover") | D-04 / N-09 | punto 3 (`does not cover` > 0) |
| b | **Enlace de vuelta a Urazuke** desde la portada | N-15 | punto 4 (`urazuke` > 0) |
| c | **Licencias declaradas juntas** (falta la de Urazuke; NAC3 ya declara Apache-2.0) | N-16 | -- |
| d | **Recibos anclados al lado de cada cifra** de la portada | N-12 | -- |
| e | **Nota de vigencia** (el documento tiene 5 meses) | N-11 | -- |
| f | **Garantia de estabilidad verificable** | N-14 | -- |

**Regla del dueno sobre (a):** la seccion de limites se aprueba **frase por frase** antes
de publicar. No se publica texto de limites sin su lectura.

### 4.2 Trabajo que toca el runtime (obliga al bump, entra en el mismo tren)

- **N-18, segunda mitad:** el validador acepta una URL y **reporta nivel**. Ya no espera
  una decision: `levels.json` publica los 3 niveles con id no ambiguo, los 11 requisitos
  y cuales de ellos son decidibles por una maquina (8 si, 3 no). Es la casilla **punto 8**.
- **Codigos en el validador:** existen 24 codigos de hallazgo y **ninguno esta en el
  validador que la garantia del SPEC nombra textualmente** -- devuelve 5 grupos sin codigo.
  Ponerle codigo a esos 5 grupos es barato y es lo que hace que la garantia deje de cubrir
  un conjunto vacio.
- **N-29:** `NAC.conformance_tier` sigue devolviendo `NAC-3-versioned`. Es valor de cable,
  no prosa. **Renombrarlo es decision de compatibilidad del dueno**; lo barato mientras
  tanto es publicar su vocabulario.

### 4.3 El salto de version (lo que destraba los dos gates rojos)

Orden, y **no se puede saltear ningun paso**:

1. Subir la version a `2.5.0` (un solo lugar: la fuente derivada -- **nunca a mano en 16 sitios**).
2. `node scripts/build-integrity.mjs --write` -- regenera **tambien la copia congelada**
   del runtime (`js/2.5.0/nac.js`), no solo el contrato. El typo de N-07 movio bytes del
   runtime: un typo en un comentario cuesta una version, y ese es el precio correcto de
   que la ruta inmutable sea de verdad inmutable.
3. `node scripts/build-contract-api.mjs --write` -- nueva entrada en la cadena.
   **Aca entra N-24**: el texto de `api/trust.json` que declara tres testigos cuando el
   tercero (tarball de npm) no existe. Se corrige **en esta regeneracion y no antes**,
   porque corregirlo exige mover el indice y mover el indice de una version ya publicada
   es exactamente lo que el metodo prohibe.
4. **Firma offline del dueno** -- `node scripts/sign-contract-api.mjs --sign` en su maquina
   (la clave no vive aca). Sin esto el CI se niega a publicar.
5. `node scripts/build-contract-api.mjs` (sin `--write`) -- tiene que decir
   `OK signature verifies: key nac3-contract-2026 ...`.
6. Publicar el paquete y **promover `latest` a la 2.5.0 estable** (D-01 opcion C), y que
   la seccion 9 del SPEC diga lo mismo -- casilla **punto 1**.

### 4.4 La pasada de traducciones -- DEPENDE de D-03

Se hace **una sola vez**, con las 9 traducciones y N-28 (los 85 `data-nac-id` posicionales
renumerados, incluidos los de las traducciones) en la misma pasada.

### 4.5 Verificacion final, contra el servidor y no contra el repositorio

Recorrer **las 8 casillas** del bloque de verificacion del dueno
(`docs/PENDING_AUDITORIA_2026-10.md`, seccion 5) pidiendo las URLs reales. Hoy da **1/8**.
Las casillas 6 y 7 **ya estan hechas en el repositorio** y pasan a verde solas cuando el
servidor entregue la 2.5.0: estan *hechas y en cola*, no pendientes.
El **punto 5 es externo** (el sitemap raiz de `yujin.app` no vive en este repo) y sigue
sin ubicarse ese repositorio -- es el unico item que puede quedar rojo sin ser deuda nuestra.

---

## 5. Pendientes abiertos que SI son de la 2.5.0

| Id | Que es | Estado |
| --- | --- | --- |
| `PND-030` | Paraguas de la remediacion de la auditoria | abierto, cierra al final |
| `PND-032` | D-01 = opcion C, 2.5.0 estable promovida a `latest` | abierto, es el tren |
| `PND-033` | D-02, la API de contrato | hecho; cierra con el release |
| `PND-034` | Metodo a prueba de manipulacion + custodia de la clave | **hecho y verificado**, bloqueado solo por el clasificador de Forge |
| `PND-035` | G3-DERIVA | **hecho**, bloqueado solo por el clasificador de Forge |
| `PND-036` | N-06 opcion A | **hecho**, bloqueado solo por el clasificador de Forge |
| `PND-001` | Hallazgos validados de la auditoria | superado por `PND-030`; revisar si se funde o se cierra |

`PND-002` .. `PND-028` son los 27 peldanos de Urazuke: **fuera de alcance hasta la 2.6**.

---

## 6. Decisiones del dueno que quedaron pedidas y no son del release

No frenan nada; se le preguntan cuando haya aire:

- **N-26** -- `payload_schema` es normativo en el SPEC y el runtime **no lo lee nunca**
  (3 ejemplos lo declaran, cero consumidores lo miran). Cablearlo o retirar el campo.
  Parte documental ya cerrada.
- **N-23** -- el runtime acepta 20 roles y la tabla normativa lista 17 (sobran arrastrar,
  soltar y boton heredado). Las 3 filas nuevas estan escritas, **esperando su lectura**.
- **N-29** -- renombrar o no el valor de cable `NAC-3-versioned`.
- **Los dos recibos en rojo "por estrellon"** -- el prompt de Forge se lo plantea como
  decision: si una suite que **se estrella** (en vez de fallar un caso) cuenta como prueba
  en rojo valida.

---

## 7. Lo que NO se debe hacer al volver

- **No publicar de a goteo.** Cualquier edicion del SPEC pone rojo el gate de contrato.
  Se junta todo y sale en un solo salto de version.
- **No escribir una version a mano.** Se deriva de un solo lugar; escribirla a mano fue
  el bug de las 13 copias.
- **No cerrar un pending con `force_reason`** para esquivar el clasificador de Forge.
- **No avanzar Urazuke** ni cerrar `PND-002`: cerrarlo abre N1, que es un frente propio.
- **No asumir D-03.** Si el dueno no la respondio, se arranca por 4.1 y se le pide cuando
  toque 4.4.
- **No cantar verde contra el repositorio.** El bloque de verificacion mide el **servidor**.

---

## 8. El patron que esta sesion dejo anotado

**Cada capa de verificacion que se construye encuentra un hallazgo que cinco meses de
lectura no habian encontrado.** El contrato como dato delato los 3 roles de mas. La firma
delato el testigo fantasma (N-24). El registro testigo delato la huella que se comparaba
contra si misma. El gate de integridad delato sus propios 4 defectos.

Corolario operativo, que se repitio tres veces: **una comparacion que no puede fallar no
es una verificacion, es una ceremonia.** Antes de dar por bueno un candado, probarlo en
rojo -- y desactivando **solo** la pieza nueva, para que los rojos que caen sean los suyos
y no el ruido de un arbol a medio publicar.
