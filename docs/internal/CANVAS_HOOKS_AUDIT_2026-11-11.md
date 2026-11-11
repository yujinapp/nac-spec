# Los enganches que faltan -- medicion superficie por superficie

Fecha: **2026-11-11**. Autor: Forge (el agente). Dueno: Pablo Kuschniroff.
Pedido: *"determina si faltan enganches"* -- antes de que exista una fecha
efectiva de contrato, saber que piezas del **nucleo publico** hacen falta para
que una superficie nueva viva en **otro repositorio, con otro nombre y otra
licencia**, enganchada al NAC3 Apache por el contrato de la seccion 15.

Documentos relacionados:
`docs/internal/ALIGNERR_CONTRATO_CONSECUENCIAS_2026-11-11.md` (secciones 10 y 11) · `docs/DISCREPANCIES.md` D-09 a D-13 y H-7 / H-8 · PND-096
(la compuerta de las siete superficies) · PND-095 (el contrato nunca se ejercito
contra una app real).

Registro: **PND-109** (los seis enganches, espera la palabra del dueno) y
**PND-110** (el defecto E-5, que no es decision de nadie).

---

## 0. Como se midio, y que vale de esto

**Verificado** (lei el codigo, corri la prueba, el comando esta abajo):

* `SPEC.md` seccion 15 entera, lineas 1403 a 1689, leida linea por linea.
* La implementacion entera en `js/nac.js`: el registro `_v25_plugins`, los ocho
  nombres de backend, los tres repartidores de verbos, los cuatro de estado, los
  tres de evento, el DSL extractor, `registerPlugin` / `call` / `read` /
  `subscribe` / `unsubscribe`, `expect` / `diff`, `narrate` / `tree`.
* La bateria del contrato: `node runtime/test/stage8-plugin-extension.mjs` ->
  **STAGE-8 PASS**, y los ocho backends aparecen ejercitados en el archivo de
  prueba (dom-mirror 10 veces, sdk-call 9, postmessage 3, same-origin-window 2,
  script-bridge 1, postmessage-listen 1, synthetic-poll 1, synthetic-mutation 2).
* Que `NAC.set_source` **no existe** en el arbol: cero ocurrencias en `js/` y en
  `runtime/`, salvo la linea del propio `SPEC.md` que lo cita.
* Que el registro de la seccion 15 lo leen **solo** `call`, `read` y
  `subscribe`: ninguna otra funcion del runtime toca `_v25_plugins`.

**Creido** (no medido en esta corrida): que los costos en horas de abajo son del
orden declarado. Salen del mismo metodo que el resto del plan y no de una
corrida medida.

**Punto ciego declarado:** esta medicion es **de lectura**. No construi un
plugin de mapa, de video ni de grilla para probar que el camino cierra de punta
a punta. Eso es exactamente PND-095, que sigue abierto: el contrato de la
seccion 15 nunca se ejercito contra una app real, solo contra un blanco
sintetico que escribimos nosotros. Todo lo que sigue dice "el contrato alcanza /
no alcanza" **por lectura**, no por recibo de corrida.

---

## 1. Lo que el contrato de la seccion 15 ya hace (y hace bien)

Esto no hay que construirlo, ya esta publicado en la 2.5.2 y esta en verde:

* **Cinco primitivas exportadas**: `registerPlugin`, `call`, `read`,
  `subscribe`, `unsubscribe`. Un repositorio aparte registra su plugin y
  enruta sin tocar un byte del nucleo.
* **Ocho backends** con repartidor propio: `postmessage`, `postmessage-listen`,
  `sdk-call`, `script-bridge`, `dom-mirror`, `same-origin-window`,
  `synthetic-mutation`, `synthetic-poll`.
* **Cadena de respaldo para el estado**: el estado es un arreglo ordenado de
  fuentes y el runtime devuelve la primera que resuelve; si fallan todas,
  `state_unreadable` trae `attempts[]` con el motivo de cada una. No hay eleccion
  silenciosa de una fuente peor.
* **Procedencia de cada accion**: `nac:plugin:invoked` / `:read` / `:event` con
  `request_id`, backend, duracion y error.
* **Confirmacion del efecto**: `expect(plugin, state_path, valor, opts)` y
  `diff(plugin, state_path, accion)` **funcionan sobre estado de plugin**, no
  solo sobre el DOM -- verificado leyendo el codigo: las dos llaman a `read`. Y
  `expect` acepta un comparador propio, asi que un estado continuo (posicion de
  un video, centro de un mapa) se puede confirmar por tolerancia y no por
  igualdad.
* **Sin DOM tambien funciona**: `registerPlugin` + `sdk-call` + `synthetic-poll`
  no tocan el documento en ningun punto. Una superficie sin un solo nodo
  (SUP-6) es mecanicamente operable hoy.
* **La licencia lo permite**: Apache-2.0 no tiene reciprocidad, asi que el
  repositorio de afuera puede ser cerrado, propietario y comercial.

**El hallazgo central de esta medicion:** ninguna de las siete superficies
necesita un **mecanismo de ruteo nuevo**. Los ocho backends alcanzan para
*llegar* a la aplicacion en los siete casos. Lo que falta no es como hablarle a
la app: es **como el agente encuentra y entiende** lo que el plugin declara.

---

## 2. Los seis enganches que faltan

### E-1 -- El registro de la seccion 15 no se puede enumerar

**Medido:** `_v25_plugins` lo leen solo `call`, `read` y `subscribe`. No hay
`NAC.plugins()`, no hay `describe`, y la foto del estado (`snapshot`) no lo
incluye. **Un agente que no registro el plugin el mismo no tiene forma de
descubrir que existe**, ni que verbos declara.

**Por que es el bloqueante numero uno del plan modular:** el plan es que el
repositorio de afuera registre su plugin contra el NAC3 publico. Si el runtime
publico no ofrece como enumerarlo, el agente llega a la pagina, lee el manifest
del DOM -- que contesta por la parte DOM -- y la superficie de lienzo queda
**invisible**. El plugin existe y nadie lo encuentra.

**Que hay que publicar:** un accesor de solo lectura del registro (slug, verbos,
estados, eventos), su seccion en el texto normativo, las nueve traducciones, su
demo y su candado con su rojo. **5 a 8 h.**

### E-2 -- El manifest de plugin no se describe a si mismo

**Medido:** `_v25_validateManifest` acepta y guarda **solo** `slug`, `verbs`,
`state`, `events`. No hay etiqueta humana, no hay pista, y **no hay declaracion
de los argumentos de un verbo**. Y `narrate` / `tree` / `context` -- las tres
piezas de voz y de navegacion de la 2.5 -- resuelven **contra el DOM**
(`querySelector`), asi que un verbo de plugin no tiene de donde sacar un nombre
legible.

**Por que es load-bearing, y no cosmetico:** en cuatro de las siete superficies
lo accionable **es el argumento** -- una coordenada y un zoom (SUP-3), un
instante (SUP-4), un numero de pagina o un campo de formulario (SUP-5), una pose
en tres dimensiones (SUP-7). Hoy ese contenido viaja en `args` y **nada declara
su forma, sus unidades ni su rango**. El lado DOM del protocolo si tiene eso:
`fields[]` con tipo. La seccion 15 no tiene nada. Un agente no puede llamar un
verbo cuyos argumentos no estan declarados en ninguna parte, y un proyecto
voice-first no puede nombrar en voz alta un verbo sin etiqueta.

**Que hay que publicar:** `label`, `hint` y `params` opcionales por verbo (y
etiqueta por estado), su validacion, su lectura por el accesor de E-1, texto
normativo, nueve traducciones, candado con su rojo. **6 a 10 h.**

### E-3 -- No hay backend para una fuente de eventos real que no sea postMessage

**Medido:** los tres backends de evento son `postmessage-listen` (una fuente
real: un iframe) y los dos sinteticos (`synthetic-mutation`, que observa
mutaciones del DOM, y `synthetic-poll`, que relee cada 250 ms por omision).
**No hay forma declarativa de escuchar un emisor de eventos de JavaScript**:
`map.on('moveend')`, `video.addEventListener('timeupdate')`, el
`onItemsRendered` de un virtualizador, el `pagechanging` de pdf.js, el
`onresult` del reconocimiento de voz. El propio texto de 15.2 promete que un
evento *"PUEDE estar respaldado por una fuente real"* y la unica fuente real
implementada es postMessage.

**Toca seis de las siete superficies.** Hay una salida sin tocar el nucleo: el
adoptante escribe un **nodo espejo** oculto cuyo atributo refleja el valor y lo
actualiza desde el evento de su libreria; entonces `dom-mirror` +
`synthetic-mutation` ya dan un evento manejado por evento real. Funciona, y es
una pieza de pegamento que el adoptante escribe a mano y que el texto normativo
no nombra.

**Dos caminos, y el costo es distinto:** declarar el patron del nodo espejo como
el camino oficial -- **2 a 3 h**, sin codigo -- o agregar un noveno backend de
emisor. Ojo con eso: la propia 15.4 dice que **agregar un backend obliga a subir
la version de la especificacion**, asi que seria 2.6 y no 2.5.3. **5 a 8 h.**

### E-4 -- `sdk-call` llega solo a `window` y pasa un solo argumento

**Medido:** el repartidor resuelve el `path` contra el objeto global, y en modo
`invoke` llama `fn.call(parent, args)` -- **exactamente un argumento**. No hay
interpolacion de argumentos ni orden posicional (`values` y `values_from_args`
existen solo para `postmessage` y `script-bridge`).

**Consecuencia:** una API de libreria con argumentos posicionales
(`map.setView(centro, zoom)` de Leaflet, media de las APIs de Three.js) **no se
puede expresar**, y un objeto que no vive en `window` -- una referencia de React,
el handle de un visor -- **no se puede alcanzar**. Esto ultimo es llamativo:
la motivacion de la propia seccion 15.1 nombra como caso a cubrir
*"invocar `excalidrawAPI.setElements(...)` sobre una referencia de React"*, y el
backend implementado no llega ahi (va a `docs/DISCREPANCIES.md` D-13).

De nuevo hay salida sin tocar el nucleo -- el adoptante publica una funcion de
pegamento en `window` que recibe un objeto -- y de nuevo es pegamento a mano, no
declarado.

**Que hay que publicar:** mapeo de argumentos para `sdk-call` (orden posicional
y/o interpolacion) y una via para registrar un handle de API que no este en
`window`. **4 a 6 h.**

### E-5 -- `synthetic-mutation` se suscribe en silencio a nada (defecto, no decision)

**Medido:** al suscribir, el runtime resuelve cada estado observado a su nodo
espejo con `document.querySelector(...)` y hace `if (el) elements.push(el)`. Si
el selector **no resuelve ningun elemento**, el nodo simplemente no se observa;
con cero elementos el `MutationObserver` no observa nada, la suscripcion
**devuelve un handle valido y nunca dispara**.

**Por que importa justo aca:** es el caso de SUP-1. En una grilla virtualizada el
nodo de una fila **existe y deja de existir** segun el desplazamiento. Suscribirse
a un cambio de una fila que en ese instante no esta pintada devuelve exito y
silencio -- el dano silencioso que el protocolo existe para eliminar, adentro del
protocolo. Esto no es una discrepancia que decida el dueno: el texto no promete
este comportamiento, y el contrato de convivencia regla 2 pide registrar y la 5
pide no reportarlo como sano.

**Que hay que publicar:** fallar cerrado (o volver a resolver el selector en cada
mutacion), con su prueba en rojo. **2 a 4 h.**

### E-6 -- Un plugin no tiene codigo de error propio declarado

**Medido:** `call` levanta a `NacError` **cualquier** codigo que el backend ponga
en `err._code`, sin validarlo contra ninguna lista. Asi que mecanicamente un
plugin **si** puede devolver `row_not_materialized` y distinguirlo de "esa fila
no existe". Pero la seccion 15.9 presenta una **lista cerrada** de diez codigos
y no nombra esa via en ninguna parte.

**Consecuencia:** el mecanismo que la aceptacion de SUP-1 exige -- *"el protocolo
contesta de forma distinguible de 'esa fila no existe'"* -- hoy funciona **por
accidente de implementacion**, no por contrato. Un adoptante que lea el texto no
sabe que existe, y un runtime futuro que respete la lista cerrada lo puede
clavar sin romper nada escrito.

**Que hay que publicar:** una linea normativa (+ su candado) que declare el
espacio de codigos de plugin y su prefijo. **1 a 2 h.**

---

## 3. La tabla: superficie por enganche

| Superficie | E-1 descubrir | E-2 describirse | E-3 eventos | E-4 sdk-call | E-5 defecto | E-6 error | Veredicto por lectura |
|---|---|---|---|---|---|---|---|
| **SUP-1** grillas virtualizadas | si | si (clave de fila) | si | pegamento | **critico** | **critico** | La seccion 15 alcanza **con E-5 y E-6**. Sin ellos repite el dano silencioso. |
| **SUP-2** computer use | -- | -- | -- | -- | -- | -- | **No es una superficie**: es una comparacion medida. Cero enganches. |
| **SUP-3** mapas | si | **si** (coordenada, zoom, area) | si | **si** (posicionales) | -- | -- | Alcanza. Leaflet y Mapbox tienen API publica y estable. |
| **SUP-4** reproductores | si | **si** (instante, pista) | **si** (`timeupdate`) | si | -- | -- | Alcanza, y la confirmacion ya esta resuelta: `expect` con comparador por tolerancia. |
| **SUP-5** PDF | si | **si** (pagina, campo) | si | si | -- | -- | Alcanza **para pdf.js**. El visor nativo del navegador no lo arregla ningun enganche: no expone nada. |
| **SUP-6** voz sin nodos | **es la superficie** | **es la superficie** | -- | si | -- | -- | Mecanicamente ya funciona sin DOM. Sin E-1 y E-2 **no hay nada que operar**: no hay DOM que leer, el manifest es todo. |
| **SUP-7** XR y 3D | si | **si** (pose) | si | si | -- | -- | Alcanza sin enganches nuevos; A-Frame entra por `dom-mirror`. El costo esta en el plugin, no en el nucleo. |

---

## 4. Las cinco discrepancias que aparecieron de paso

Van a `docs/DISCREPANCIES.md` como **D-09 a D-13** y **no se tocaron**: por la
regla 10 una diferencia entre el codigo y el texto normativo la decide el dueno.
Resumen: `NAC.set_source` citado por 15.7 no existe en el arbol (D-09); el modo
`read` de `sdk-call` esta implementado y no declarado (D-10); el timeout de
lectura de estado declara 1000 ms y el codigo usa 5000 (D-11); la lista cerrada
de codigos de error de 15.9 contra el `_code` que el runtime levanta sin validar
(D-12); y la motivacion de 15.1 nombra un caso -- referencia de React -- que el
backend no alcanza (D-13).

Dos de ellas no son decoracion para este plan: **D-10** es justo el modo que hace
falta para leer el estado de una libreria (centro del mapa, posicion del video,
pagina del PDF) y **D-12** es el mecanismo del error distinguible de SUP-1.

---

## 5. Que hay que publicar antes de la fecha efectiva, y en que orden

El razonamiento de calendario es el de la seccion 10 del documento del contrato:
lo que entre al repositorio publico **durante** el termino es de titularidad
discutible. Entonces los enganches se publican **antes de firmar**, y durante el
termino no entra un solo commit a nac-spec.

| Orden | Pieza | Horas de modelo | Por que va en ese lugar |
|---|---|---|---|
| 1 | **E-1** descubrimiento | 5 a 8 | Sin esto el plugin de afuera es invisible: el plan modular no cierra. |
| 2 | **E-2** manifest que se describe | 6 a 10 | Es el que convierte `args` en algo que un agente puede usar; cuatro superficies dependen de el. |
| 3 | **E-5** el defecto de `synthetic-mutation` | 2 a 4 | Es un defecto, no una decision, y es la superficie mas comun (SUP-1). |
| 4 | **E-6** codigo de error de plugin | 1 a 2 | Barato, normativo, y desbloquea la aceptacion de SUP-1. |
| 5 | **E-4** argumentos de `sdk-call` | 4 a 6 | Sin esto cada adoptante escribe pegamento a mano, pero **no bloquea**. |
| 6 | **E-3** fuente de eventos real | 2 a 3 (patron declarado) o 5 a 8 (backend nuevo, obliga 2.6) | Decision del dueno: declarar el nodo espejo o subir la version de la especificacion. |
| | **Total** | **20 a 38 h de modelo** | Mas tus horas al lado, mas los casos de prueba. |

**Como se lee ese total.** No es trabajo nuevo que se suma a las ~400 h del
pendiente: las seis piezas son **compartidas** por las siete superficies, y hoy
estan escondidas adentro del costo "puerta (b): contrato de plugin" de cada una
de las siete fichas. Sacarlas afuera **baja** el costo de cada superficie y lo
cobra una sola vez. Lo que cambia es el **calendario**: estas horas tienen que
pasar primero, y antes de la fecha efectiva.

**Lo que esto no resuelve, y hay que decirlo:** PND-095 sigue abierto. Con los
seis enganches publicados el camino cierra **por lectura**. El recibo de que
cierra de verdad es un plugin de referencia contra una app real -- un mapa de
Leaflet es el blanco mas barato y sirve de ejemplo para SUP-3 y para PND-095 a la
vez.

---

*Producido el 2026-11-11 a pedido del dueno. Ninguna entrada de la seccion 4 se
resuelve sin su palabra. Este documento vive bajo `docs/internal/`, que el
despliegue excluye entero con una regla anclada, asi que no sale al sitio.*
