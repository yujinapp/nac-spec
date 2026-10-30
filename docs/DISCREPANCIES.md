# Discrepancias -- nac-spec (NAC3)

Estación: **N2 -- la lectura del sistema** (Urazuke, entrada de un legado).
Fecha: **2026-10-30**. Autor: Forge (el agente). Dueño: Pablo Kuschnirof.
Mapa recuperado: `docs/SEMANTIC_TREE.md` · Estado vivo: `docs/STATUS.md` ·
Decisiones del dueño: `docs/DECISIONS.md` · Contrato:
`docs/WORKING_AGREEMENT.md`.

**Qué es este documento.** La lista de todo lo que encontré donde el código, la
configuración, la documentación y lo que el dueño dijo **no coinciden**. Cada
entrada trae la evidencia de las dos puntas y **no está resuelta**: por la regla
10 del contrato, una diferencia entre lo que el código hace y lo que el texto
normativo dice es una **decisión del dueño**, no un bug que el agente arregla en
silencio. Acá no se arregló nada.

**Cómo se traen.** Por decisión del dueño (2026-10-30) las discrepancias se le
traen **en el momento y de a una**, no en lotes. Este documento es el registro
completo para que ninguna se pierda; la conversación va de a una. La línea
*estado* de cada entrada dice cuáles ya se le llevaron y cuáles decidió; las
decididas quedan con su frase textual en `docs/DECISIONS.md`.

**Decididas hasta hoy (2026-10-30):** 1 de 8 -- D-01. Las otras siete siguen
esperando su palabra y **ninguna se tocó**.

**Lo que no está acá.** Los hallazgos donde **una sola punta tiene razón** no
son discrepancias: son hallazgos, y por la regla 9 van al registro de pendientes
con su evidencia. Están listados al final, en la sección 2, con su número.

---

## 1. Discrepancias (deciden el dueño)

### D-01 -- `PROJECT.md`: el método espera un mapa, el repositorio tiene un manual de normas

| Punta | Qué dice | Evidencia |
|---|---|---|
| El método | `PROJECT.md` es el mapa recuperado del sistema (dominios, actores, procesos, entidades, pantallas, integraciones, trabajos programados), de 300 líneas como máximo, y la puerta de entrada de cada sesión | consigna del peldaño N2 |
| El repositorio | `PROJECT.md` es un documento de orientación y **normas de programación**: topología de repositorios, proceso de RFC, doctrina de pruebas, estilo de código, ciclo de trabajo. 361 líneas. Última revisión declarada: **2026-05-25** | `PROJECT.md` leído entero hoy |

Además, medido hoy, el documento arrastra cosas que ya no son ciertas: dice que
la integración continua es un objetivo *"when GitHub Actions is wired"* y hoy
está cableada y es la única puerta a producción; conserva pasos de espejado a un
repositorio que **es** este; declara la última versión publicada como
`2.5.0-alpha.5` cuando hoy es `2.5.2`; y cita cinco documentos que no existen
(ver D-08).

**Qué hay que decidir.** Tres opciones:

1. `PROJECT.md` **se convierte** en el mapa que pide el método, y las normas se
   mudan a un documento propio.
2. `PROJECT.md` **queda** como el manual de normas, el mapa vive en
   `docs/SEMANTIC_TREE.md` (donde ya está) y la puerta de entrada de cada sesión
   sigue siendo `CLAUDE.md` (donde ya está), que remite a los dos.
3. Se corrige únicamente lo que quedó viejo adentro de `PROJECT.md`, sin cambiar
   su rol.

**Mi recomendación: la 2, más la 3 como pendiente aparte.** Reescribir
`PROJECT.md` sería exactamente lo que la regla 7 prohíbe —reemplazar un
documento que existe y que alguien puede estar leyendo— y el mapa ya está
escrito al lado sin destruir nada. Lo que sí hay que hacer es corregir lo viejo,
porque un documento que dice "la cadena todavía no existe" en un proyecto donde
la cadena es la única puerta a producción desinforma a quien lo lee primero.

**Estado:** **DECIDIDA** por el dueño el 2026-10-30, textual: *"Se queda como
está"* -- la opción 2. `PROJECT.md` sigue siendo el manual de normas; el mapa es
`docs/SEMANTIC_TREE.md` y la puerta de entrada de cada sesión es `CLAUDE.md`.
Escrita en `docs/DECISIONS.md` y como **regla confirmada** al lado del nodo
(`docs/SEMANTIC_TREE.md` sección 0, `CLAUDE.md` sección 4). **No cierra la parte
3:** el contenido viejo de `PROJECT.md` (la cadena declarada como objetivo
futuro, el espejado a este mismo repositorio, la versión `2.5.0-alpha.5`) queda
registrado como pendiente con su medición y sin tocar (**PND-072**) -- el dueño
decidió el rol del documento, no si se le corrige el contenido. El punto 4 de esa
lista es D-08, que sigue sin decidir.

---

### D-02 -- El sitio solo existe correctamente bajo `/nac-spec/`

| Punta | Qué dice | Evidencia |
|---|---|---|
| El código | 260 páginas publicadas cargan el runtime por **ruta absoluta**: `/nac-spec/js/nac.js?v=...` y `/nac-spec/js/nac-v2-extensions.js?v=...` | medido hoy, 2026-10-30 |
| El sitio | "All of them open in your browser" (sección de demos de la portada) | `index.html` |
| El recibo de N0 | servido desde la raíz en una máquina local, esos documentos cargan **sin runtime** (404 en los dos scripts) | `docs/EVIDENCE_N0.md`, 2026-10-24 |

El defecto equivalente del lado de las hojas de estilo **ya se cerró** con un
candado (`check-stylesheet-links.mjs`, a raíz de PND-053: una hoja inexistente
pedida por 262 páginas durante cuatro meses). Lo que queda abierto es la parte
del runtime, y ningún candado la cubre.

**Qué hay que decidir.** O el comportamiento actual **es** la especificación
—este sistema se sirve bajo `/nac-spec/` y no se soporta en otra raíz, lo cual
se escribe y se termina la discusión— o las rutas pasan a ser relativas y el
árbol se puede servir desde cualquier lado.

**Mi recomendación: declarar que el comportamiento actual es la especificación,
y agregar el candado que lo verifique.** Cambiar 260 páginas publicadas es
mucho riesgo para un beneficio que hoy no tiene adoptante: nadie pidió servir
esto desde otra raíz. Pero conviene que esté escrito, porque hoy se descubre
levantándolo y fallando.

**Estado:** no traída todavía.

---

### D-03 -- Cinco etapas de prueba existen y no están en el candado

| Punta | Qué dice | Evidencia |
|---|---|---|
| El código | hay 19 suites en `runtime/test/`; el comando `npm test` corre **14** | medido hoy |
| Las que quedan afuera | `stage1-audio`, `stage3-backend`, `stage4-calls`, `stage6-ack`, `stage6b-longtail` | medido hoy, contra `runtime/package.json` |
| El recibo de N0 | las cinco **pasan** corridas a mano | `docs/EVIDENCE_N0.md`, 2026-10-24 |

Esto ya está declarado como hallazgo F-4 de la elegibilidad y está escrito en la
regla 11 del contrato: "la cadena está verde" no es lo mismo que "todo lo que
hay está probado".

**Qué hay que decidir.** Entran al candado (y entonces una de ellas puede frenar
un despliegue), se borran, o se declaran material de archivo que nadie promete
mantener verde.

**Mi recomendación: entran al candado.** Pasan hoy, así que el costo de
incorporarlas es cero y lo que se gana es que dejen de poder romperse sin que
nadie se entere. Si alguna resulta frágil, esa de por sí es información.

**Estado:** no traída todavía.

---

### D-04 -- Las nueve traducciones están al 100% en el texto normativo y desparejas en los documentos secundarios

| Punta | Qué dice | Evidencia |
|---|---|---|
| La decisión del dueño (2026-10-27) | las nueve traducciones se completan al **100%** y se regeneran en cada versión | `docs/WORKING_AGREEMENT.md`, tabla de decisiones |
| El texto normativo | **cumple**: 283 de 283 unidades y 83 de 83 secciones en los nueve idiomas, sin huérfanos | medido hoy con el medidor del proyecto |
| Las guías | **cumplen**: 22 archivos en cada uno de los nueve | medido hoy |
| Los documentos secundarios (`i18n/<idioma>/docs/`) | **no**: español 30 archivos, francés y portugués 29, alemán / italiano / japonés / chino 20, hindi 6 y **árabe 0** | medido hoy |

La decisión del dueño se tomó hablando del texto normativo. Nada dice qué pasa
con los documentos secundarios, y ningún candado los mira.

**Qué hay que decidir.** La regla del 100% se extiende a `docs/`, o se congela
lo que hay declarándolo, o se retiran las copias parciales.

**Mi recomendación: declarar el alcance de la regla —texto normativo y guías— y
congelar `docs/` como está, con un candado que impida que la portada ofrezca un
idioma para un documento que en ese idioma no existe.** Traducir 30 documentos
secundarios a nueve idiomas es un costo grande para material que no es
normativo; lo que no se puede dejar así es ofrecer un idioma y entregar otra
cosa.

**Estado:** no traída todavía.

---

### D-05 -- Un demo publicado viola el contrato que demuestra

| Punta | Qué dice | Evidencia |
|---|---|---|
| El texto normativo | los roles válidos son **20**, y `textbox` no es uno de ellos (el rol de un campo es `field`) | `SPEC.md` sección 1, y el catálogo publicado `api/latest/contract.json` |
| El runtime | `STRICT_VALIDATION` viene en **true** desde la versión 2.5: un rol desconocido hace que `register` **tire** `manifest_role_unknown` | `js/nac.js`, leído hoy |
| El demo | `example-v20-page-b.php` registra tres elementos con `role: 'textbox'` | leído hoy, líneas 161-166 |

Consecuencia: esa página publicada rompe al cargar. Ya estaba en el relevamiento
de N0 como hallazgo 2, medido en un navegador el 2026-10-24.

**Qué hay que decidir.** Acá el texto normativo gana sin discusión —`textbox` no
existe en el contrato—, así que lo único que decide el dueño es **si se toca una
página publicada y cuándo**: se corrige el rol, se retira el demo, o se deja
roto a propósito y se documenta.

**Mi recomendación: corregir el rol.** Son tres líneas, el cambio no toca
ninguna otra página, y lo que está en juego es la credibilidad del argumento
central del proyecto: un sistema que promete no fallar en silencio tiene una
página de ejemplo que falla al cargar.

**Estado:** no traída todavía.

---

### D-06 -- La especificación exige diez idiomas por etiqueta; 46 de 80 etiquetas de los demos traen dos

| Punta | Qué dice | Evidencia |
|---|---|---|
| El texto normativo | cada `label_i18n` **DEBE** cubrir los diez idiomas de NAC3 | `SPEC.md` 4.3 |
| El mismo texto, más abajo | `i18n_strict: 'permissive'` permite cobertura parcial durante una migración, y "los manifiestos de producción **deberían** traer los diez" | `SPEC.md` 4.3 |
| Los demos de referencia | 80 bloques `label_i18n` en total: **34 traen los diez** y **46 traen exactamente dos** (español e inglés). La distribución es limpia: no hay intermedios | medido hoy con un medidor de descarte |

Por archivo: `js/example.js` 18 de 44 con diez; `example-v20-full.php` 7 de 8;
`example-v23-shadow-open.php` 4 de 4; `example-v20-cross-page.js` 3 de 3;
`example-v23-shadow-closed.php` 2 de 2; y con **cero** de los diez:
`example-v20-page-a.php` (6), `example-v20-page-b.php` (11) y
`example-v20-primitives-showcase.php` (2).

**Qué hay que decidir.** ¿El "DEBE" de los diez idiomas aplica a los demos que
el proyecto publica como referencia, o los demos son material de demostración
donde dos idiomas alcanzan? Si aplica, faltan 46 etiquetas por completar y
corresponde un candado.

**Mi recomendación: aplica.** Son la referencia que un adoptante copia: si la
referencia trae dos idiomas, el adoptante trae dos. Pero no lo haría ahora: es
trabajo de traducción sobre páginas publicadas, y conviene que entre como un
bloque propio con su candado, no "de paso" (regla 3).

**Estado:** no traída todavía.

---

### D-07 -- La doctrina de tres capas de prueba está escrita y la cadena no la ejecuta

| Punta | Qué dice | Evidencia |
|---|---|---|
| `PROJECT.md` 3.1 | "100% tests" son **tres capas** obligatorias en cada versión alpha o posterior: unitaria, visual con Playwright y capturas, y conducida por un agente Pilot real. Ninguna es opcional | `PROJECT.md`, leído hoy |
| El mismo documento | nombra el ejecutor `scripts/run-all-demos.mjs` | ídem |
| El código | **ese ejecutor no existe.** Sí existen 16 ejecutores por función (8 de demo y 8 de pilot) bajo `scripts/`, y evidencia guardada para 8 bloques bajo `evidence/` | medido hoy |
| La cadena | no llama a **ninguno** de los 16 | `.github/workflows/deploy.yml`, leído hoy |

Es decir: las tres capas existieron como trabajo hecho y quedaron como evidencia
fechada, pero nada las vuelve a correr. La capa 1 sí está en el candado (14
suites, 386 verificaciones en verde hoy).

**Qué hay que decidir.** La doctrina se cumple y la cadena pasa a ejecutar las
capas 2 y 3, o la doctrina se corrige para decir lo que de verdad se exige en
cada versión (capa 1 en cada cambio; capas 2 y 3 como evidencia fechada por
bloque).

**Mi recomendación: corregir la doctrina, y agregar un ejecutor que enumere las
capas 2 y 3 fuera de la cadena.** La capa 3 necesita un agente real y plata por
corrida: ponerla en cada push no es sostenible, y una regla que no se cumple es
peor que una regla más chica que sí. Lo que no puede quedar es la frase
"ninguna es opcional" al lado de una cadena que no corre dos de las tres.

**Estado:** no traída todavía.

---

### D-08 -- Cinco documentos citados como obligatorios no existen

| Punta | Qué dice | Evidencia |
|---|---|---|
| `PROJECT.md` 2.4 | lista los documentos que **deben** actualizarse en cada transición de RFC, e incluye `docs/USER_MANUAL.md`, `docs/TECHNICAL_DESIGN.md` y el espejo `packages/nac/CHANGELOG.md`. Dice: "si un documento de esta lista todavía no existe, créalo en el mismo commit" | `PROJECT.md` |
| El relevamiento de N0 | cita como documentación del adoptante `docs/REACT_GUIDE.md`, `docs/ANGULAR_GUIDE.md` y `docs/ADOPTION_GUIDE.md` | `docs/INITIAL_SURVEY.md` v1 |
| El código | **ninguno de los seis existe.** Las guías reales son `guides/REACT.md` y `guides/ANGULAR.md`; el changelog vive solo en `runtime/CHANGELOG.md` | verificado hoy, uno por uno |

**Qué hay que decidir.** Se crean los que faltan (el manual de usuario y el de
diseño técnico son dos de los artefactos que el método pide más adelante, en el
peldaño 20), o se corrige la lista para que nombre lo que existe.

**Mi recomendación: corregir las referencias ahora y crear los manuales cuando
el método los pida.** Una lista que nombra documentos inexistentes se vuelve
ruido y se deja de leer entera, que es lo que le pasó a esta.

**Estado:** no traída todavía. Depende de D-01: si `PROJECT.md` cambia de rol,
esta lista se mueve con él.

---

## 2. Hallazgos que **no** son discrepancias (una sola punta tiene razón)

Van al registro de pendientes con su evidencia, por la regla 9. No se arreglaron
de paso.

| # | Hallazgo | Medición | Pendiente |
|---|---|---|---|
| H-1 | La portada pide tipografías a un tercero (`fonts.googleapis.com`, `fonts.gstatic.com`) en cada visita. No estaba en la lista de cuatro integraciones del relevamiento de N0, y el candado de hojas de estilo declara que no resuelve hojas remotas | `index.html` líneas 12-14, leído hoy | **PND-069** |
| H-2 | Rama muerta: `docs/audit-refresh-2026-06-28` está 1 commit adelante y 80 atrás de `main`, y lo que trae es "refrescar documentos derivados a 2.5.0-alpha.5" -- tres versiones atrás | `git rev-list`, medido hoy | **PND-070** |
| H-3 | El formulario del tester publica contra el **sandbox** como destino primario y contra producción como secundario; el nombre de las dos constantes está invertido y el comentario del código dice que el cambio de vuelta está pendiente | `js/tester-report.js` líneas 28-32, leído hoy | **PND-071** |
| H-4 | La publicación a npm se hace a mano; automatizarla necesita un secreto del repositorio que solo el dueño puede guardar | medido en la toma | PND-067 |
| H-5 | Todo `docs/` se sirve hoy en direcciones públicas no enlazadas pero adivinables | `docs/ELIGIBILITY.md` responde 200, medido el 2026-10-30 | PND-068 |
| H-6 | Dos candados que necesitan navegador no corren en la cadena (`test:limits`, `test:cli-levels`) | `deploy.yml`, leído hoy | PND-049 |

Las otras tres ramas (`portada-look-urazuke`, `release/2.5.0`, `release/2.5.1`)
están **0 commits adelante** de `main`: son marcas de historia, no trabajo
perdido. Verificado hoy.

---

## 3. Simetrías verificadas (lo que **sí** coincide)

Vale escribirlo: son los lugares donde alguien ya puso el candado y funciona.

* El catálogo de roles del texto normativo y el del contrato publicado coinciden
  en **20**, y cada entrada del catálogo trae la marca `declared_in_spec_table`
  para que una divergencia futura se vea como dato y no como opinión.
* La versión se declara **una sola vez** (`js/nac.js`) y todo lo demás la deriva;
  el candado de coherencia rechaza el build si alguien discrepa.
* El paquete publicado `2.5.2` y el árbol de esa versión son **idénticos**: 22
  de 22 archivos, cero líneas distintas, con los bytes verificados contra la
  integridad que declara el registro.
* Las nueve traducciones del texto normativo están **completas** (283/283
  unidades, 83/83 secciones) y los identificadores son idénticos letra por letra.
* Los 14 suites del runtime: **386 verificaciones en verde, cero fallas**,
  medido hoy.

---

*Producido en la estación N2 de la escalera Urazuke. Ninguna entrada de la
sección 1 se resuelve sin la palabra del dueño; cuando la dé, la decisión se
escribe en `docs/DECISIONS.md` con su frase textual y la fecha, y la entrada se
cierra acá.*
