# Handoff -- continuar sesion

**Actualizado:** 2026-10-26, tercera sesion del dia.
**Donde quedo:** las dos piezas que faltaban antes del salto de version estan hechas
(N-18 segunda mitad y el vocabulario de N-29). Lo siguiente es el paso 4.3, el salto de
version, y su paso 4 es del dueno: la firma offline.
**Palabra de reanudacion:** cuando el dueno diga **"Continua"**, se ejecuta la seccion 4
de este documento sin volver a preguntar nada de lo que ya esta decidido aca.

---

## 0. ULTIMO ESTADO -- 2026-10-26, TERCERA sesion del dia (MANDA SOBRE TODO LO DE ABAJO)

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

## 0-bis. ESTADO DE LA SEGUNDA SESION DEL 2026-10-26 (historico)

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
