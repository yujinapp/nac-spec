# Backlog de auditoria externa -- NAC3 / nac-spec

- Fecha de este documento: 2026-10-24
- Auditoria de origen: Claude Code, revision externa de portada publica, SPEC.md, registro npm, cabeceras HTTP y sitemap.
- Estado global: **ABIERTO -- 10 de 29 cerrados** (N-18 y N-33/N-34 cerrados el 2026-10-26; N-14 cerrado con el catalogo de codigos; el conteo de abajo es el del 2026-10-24 y se mantiene como historia)
- Hallazgos nuevos del 2026-10-26, todos salidos de CONSTRUIR el validador de niveles (N-18): **N-35, N-36, N-37, N-38, N-39**. Ninguno salio de leer.
- Estado global del 2026-10-24: **ABIERTO -- 6 de 24 cerrados** (N-21, N-02, N-03, N-20, N-22 y N-04; todos el 2026-10-24). Parciales: N-14, N-17 y N-18. N-10 esta cerrado en la parte que vive en este repositorio y abierto en la que no.
- **Alcance de la 2.5.0, fijado por el dueno el 2026-10-24:** *"Todos los pendientes son todos los que no sean urazuke. Urazuke no es requisito, lo vamos a avanzar despues de la 2.5, lo dejamos para la 2.6."* O sea: **este backlog ES el trabajo de la 2.5.0**. Los 27 peldanos del metodo Urazuke (PND-002 a PND-028) quedan fuera y se retoman despues. En el registro de pendientes eso son exactamente **tres** items no-Urazuke -- PND-001, PND-030 y PND-032 -- mas los dos que abrio D-02 (PND-033, PND-034).
- Cambio de situacion del 2026-10-24 (17:00 UTC): **N-21 esta resuelto**. El dueno destrabo la facturacion, el pipeline volvio a correr y los arreglos de distribucion ya estan publicados y comprobados contra el servidor. A partir de ahora "corregido en el repositorio" ya no significa "invisible en la web": cada arreglo se puede verificar desde afuera en el push siguiente.
- Metodo: cada hallazgo fue re-medido desde este repositorio el 2026-10-24. La evidencia del auditor se transcribe; la mia es la salida real de los comandos, pegada.
- Regla aplicada: lo que no se pudo medir se informa como "declarado y no medido", nunca como verde.
- Nombre: este archivo se llamaba `PENDIENTES_AUDITORIA_2026-10.md`. Se renombro el 2026-10-24 por pedido del dueno ("fuera del alcance del deploy"). El rsync de publicacion excluye el patron `PENDING_*.md` (deploy.yml, linea 62, sin barra inicial: aplica a cualquier carpeta), asi que este documento no se publica. Verificado en vivo: https://yujin.app/nac-spec/docs/PENDING_AUDITORIA_2026-10.md devuelve 404.
- Estado de las cuatro decisiones del dueno: D-01, D-02, D-03 y D-04 ABIERTAS. Se presentan de a una; ninguna se resuelve sin respuesta explicita.

---

## 0. Como leer esto

Cada entrada lleva los nueve campos pedidos. Los cuatro hallazgos marcados **DECISION DEL DUENO** no estan resueltos: van con opciones y costo, sin eleccion.

Veredicto de verificacion, en una tabla:

| id | Hallazgo | Verificado | Severidad |
|----|----------|-----------|-----------|
| N-01 | `latest` apunta a un alpha | **CONFIRMADO** | avisa (decision del dueno) |
| N-02 | Portada sin SRI | **CERRADO** (2026-10-24) -- publicado y verificado en produccion: 3 de 3 hashes coinciden con los bytes servidos | avisa |
| N-03 | URL mutable con query | **CERRADO** (2026-10-24) -- publicado: la ruta inmutable responde 200 y su sha384 coincide con el integrity de la portada | avisa |
| N-04 | Contrato no legible por maquina | **CERRADO** (2026-10-24) -- D-02 = opcion A ampliada; API estatica publicada, con cadena de hashes y 15 tests en rojo | bloquea (decision del dueno) |
| N-05 | Deriva de versiones en SPEC.md | **CERRADO en el repositorio** (2026-10-24) -- las 8 lineas resueltas una por una contra el codigo, mas 2 que la auditoria no vio; el grep del punto 7 da vacio. Llega a la web con la 2.5.0 | bloquea |
| N-06 | Colision NAC-1/2/3 vs NAC3 | **CERRADO en el repositorio** (2026-10-24) -- **decision del dueno: opcion A**. Los niveles se llaman `NAC3 Conformance Level 1/2/3`, `NAC-1/2/3` queda como alias historico en la seccion 8.1, el id publicado no se toco y 3 candados nuevos lo sostienen. Llega a la web con la 2.5.0 | avisa (decision del dueno) |
| N-07 | Typo "Asistive" en encabezado normativo | **CERRADO en el repositorio** (2026-10-24) -- 9 archivos a mano + derivados regenerados; `grep -c` da 0. Llega a la web con la 2.5.0 | registra |
| N-08 | "10 idiomas" vs spec en un idioma | **REFUTADO en su premisa** -- ver N-08, se reencuadra en N-19 | registra |
| N-09 | Portada sin limites declarados | **CONFIRMADO** (hecho); el reencuadre cambia por N-20 | bloquea (decision del dueno) |
| N-10 | `/nac-spec/` fuera del sitemap | **CONFIRMADO**; arreglado y **publicado** (2026-10-24): `/nac-spec/sitemap.xml` responde 200 con los 61 urls. Lo que queda es externo: el sitemap y el robots de la raiz `yujin.app`, que no viven en este repo | avisa |
| N-11 | Sin nota de vigencia (5 meses) | **CONFIRMADO** | avisa |
| N-12 | Cifras sin recibo al lado | **PARCIAL** -- los recibos existen, no estan anclados | avisa |
| N-13 | "Open questions (tracked separately)" sin direccion | **CERRADO en el repositorio** (2026-10-24) -- las preguntas estan en el documento, con estado, version evaluada y dos direcciones que responden 200 | registra |
| N-14 | Garantia de estabilidad no verificable | **CONFIRMADO** | bloquea |
| N-15 | Enlace de ida sin vuelta a Urazuke | **CONFIRMADO** | registra |
| N-16 | Licencias distintas no declaradas | **PARCIAL** -- NAC3 si declara Apache-2.0; falta Urazuke | registra |
| N-17 | El tarball publicado sirve el SPEC de la version anterior + cabecera MIT | **CONFIRMADO** (nuevo, mio) | bloquea |
| N-18 | `npx nac3 validate <url>` no existe y nunca reporta nivel | **CONFIRMADO** (nuevo, mio) | bloquea |
| N-19 | Las 9 traducciones publicadas son 30-38% del canonico | **CONFIRMADO** (nuevo, mio) | avisa |
| N-20 | No hay frontera interno/publico: el deploy publica todo el arbol | **CONFIRMADO** (nuevo, mio) | bloquea |
| N-22 | La huella publicada se calculaba sobre bytes CRLF y el servidor entrega LF | **CERRADO** (2026-10-24) -- la compuerta de integridad lo detuvo antes de produccion; arreglado en `0778d9f` + `dcb71ea` | bloquea |
| N-23 | El runtime acepta 3 roles que la tabla normativa del SPEC no lista | **ESCRITO en el repositorio** (2026-10-24), esperando tu lectura de las 3 filas nuevas | avisa |
| N-24 | El indice publicado declara tres testigos de su cabeza y el tercero (tarball de npm) todavia no existe | **CONFIRMADO** (nuevo, mio -- lo delato construir la capa 4) | avisa |
| N-25 | `api/trust.json` mandaba comparar la huella contra un registro de la documentacion de release que no existia | **CERRADO** (2026-10-24) -- el registro testigo existe, lo escribe `--witness` y la compuerta lo compara campo por campo (4 casos en rojo) | avisa |
| N-26 | `payload_schema` es normativo en el SPEC y el runtime no lo lee nunca | **CONFIRMADO** (nuevo, mio -- lo delato resolver N-05). Parte documental cerrada; cablearlo o retirar el campo es decision del dueno | avisa |
| N-27 | El gate de integridad tenia 4 defectos y cero tests de comportamiento | **CERRADO** (2026-10-24) -- los 4 arreglados y una suite de 16 casos; contra el gate de HEAD caen exactamente 4 | bloquea |
| N-28 | Los `data-nac-id` de los encabezados derivan del titulo, asi que un typo renombra un id direccionable | **CONFIRMADO** (nuevo, mio -- lo delato verificar el criterio de N-07). **Abierto a proposito**, se hace con G4 | registra |

Resumen al cierre del 2026-10-24: **27 entradas, 7 cerradas, 4 cerradas en el repositorio y en cola para la 2.5.0, 3 parciales, 1 refutada**. Las seis entradas que no estaban en la auditoria original (N-22 a N-28, menos N-21) las encontro el trabajo de arreglar las otras: N-22 la detuvo una compuerta antes de produccion, N-23 la delato el primer contrato generado, N-24 la delato construir la firma, N-25 la delato escribir el paso a paso para el dueno, N-26 la delato resolver la deriva de versiones y N-27 la delato escribirle al gate de integridad la suite que no tenia. Vale anotarlo como patron, porque ya van seis: **cada capa de verificacion que se construye encuentra un hallazgo que la lectura no habia encontrado** -- y la variante mas barata de todas es escribirle los tests a un candado que no los tenia.

---

## 1. Lo que el pedido no alcanza (evaluacion previa, como se pidio)

El pedido es ejecutable en 17 de sus 20 entradas. Faltan cuatro cosas para hacerlo completo, y las informo antes de tocar nada:

1. **N-10 no vive en este repositorio.** `https://yujin.app/sitemap.xml` es el mapa del sitio raiz de yujin.app. En este repo no hay `sitemap.xml` ni `robots.txt` (verificado: `*.xml` devuelve cero archivos). No puedo arreglarlo desde aca. Necesito que me digas donde vive el sitio raiz, o lo dejo como pendiente externo con su criterio de aceptacion y lo cierra quien tenga ese repo.

2. **La entrada N-08 no se sostiene como esta escrita.** Dice que la especificacion se publica en un solo idioma con cero claves de internacionalizacion. Medido: `https://yujin.app/nac-spec/i18n/es/SPEC.md` responde 200, existen nueve directorios de idioma, y la portada publica tiene 66 lineas con `label_i18n` (diez locales cada una). La lista de locales ya esta enumerada en un solo lugar del SPEC (linea 163). Lo que si es cierto y el auditor no vio: las nueve traducciones publicadas son entre el 30% y el 38% del largo del canonico. Eso va como entrada N-19 y cambia el planteo de la decision N-08.

3. **La entrada N-16 tambien es parcial.** "En ningun lado se dice" no es exacto: la portada declara Apache-2.0 en tres lugares (lineas 1349, 1500, 1501). Lo que falta es la licencia de Urazuke y la frase que separa las tres cosas. Queda como entrada, pero mas chica de lo que la auditoria describe.

4. **El bloque de verificacion final tiene dos comandos que hoy no pueden dar lo que el pedido espera.** El punto 8 pide `npx nac3 validate <una pagina de demo>` y que "reporte nivel". Medido: con una URL el CLI aborta con codigo 2 y el mensaje de que la validacion de URL requiere Playwright; y en modo directorio imprime hallazgos y un total, pero nunca un nivel de conformidad. Es la entrada N-18. Si no se arregla primero, el criterio de aceptacion de N-04 no se puede comprobar.

Y una advertencia que no es del pedido pero afecta su cumplimiento literal: el pedido manda escribir este archivo en `docs/`. **`docs/` se publica.** El workflow de deploy sincroniza el arbol entero a `public_html/yujin.app/nac-spec/` con una lista corta de exclusiones, asi que todo lo que este en `docs/` queda accesible en la web. Verificado: `docs/V2.5_STATUS.md` responde 200 hoy. Este archivo esta escrito y **no pusheado**; el push lo publica. Antes de pushear hay que decidir N-20, o mover el backlog fuera del alcance del deploy.

---

## 2. Los cuatro hallazgos que son DECISION DEL DUENO

Ninguno esta resuelto. Van opciones y costo de adopcion.

### D-01 (sobre N-01) -- a donde apunta `latest`

**Opcion A: `latest` vuelve a 2.4.0; los alphas viven solo bajo el tag `alpha`.**
- Costo: todo adoptante nuevo recibe 2.4.0, que no tiene la seccion 17 (etiquetas asistivas) ni lo que se formalizo en 2.5. La portada y la linea 4 del SPEC ("Promoted to npm dist-tag `latest`") tienen que dejar de decir lo que dicen hoy.
- Beneficio: `npm install @nac3/runtime` cumple semver sin leer nada.
- Riesgo: quien hoy instala y recibe el alpha no se enteraria de que hay una version mas nueva de la que tenia, salvo que lea el registro.

**Opcion B: `latest` queda en el alpha y la seccion 9 escribe la politica de prerelease.**
- Costo: todo adoptante nuevo recibe un prerelease por defecto, y el documento tiene que explicar por que, en que condiciones se sale, y que garantias no aplican a un alpha.
- Beneficio: cero trabajo de publicacion; el estado real queda declarado.
- Riesgo: el registro npm entrega algo que semver puro no promete, y N-17 muestra que ese tarball hoy sirve el SPEC de la version anterior. Mientras N-17 este abierto, esta opcion publica una version que no coincide con su propio documento.

**Opcion C: se termina el backlog y se publica una 2.5.0 estable de verdad, promovida a `latest`.**
- Costo: es el backlog completo. No hay 2.5.0 estable honesta mientras N-17 siga abierto (el tarball serviria un SPEC que no es el suyo) ni mientras la seccion 9 no diga lo que dice el registro.
- Beneficio: `latest` vuelve a cumplir semver **y** apunta a la version que la portada y el SPEC describen. Es la unica opcion donde las cuatro fuentes coinciden.
- Riesgo: hasta que salga, `latest` sigue entregando un prerelease.

**Dato que pesa en la eleccion y que no elijo yo:** con N-17 abierto, cualquiera de las dos primeras opciones deja al adoptante nuevo recibiendo un artefacto cuyo SPEC interno dice `2.5.0-alpha.4`.

**DECIDIDO el 2026-10-24: OPCION C.** El dueno, textual: *"C era exactamente, terminar todos los pendientes y publicar una 2.5.0 estable. Yo prefiero C."*

Descarta el desvio de la opcion A, y el motivo es un dato que no estaba en este documento: **hoy el dueno es el unico consumidor de `@nac3/runtime`**. El radio de dano de que `latest` apunte a un alpha es practicamente cero, asi que la opcion A no compra seguridad y solo cuesta trabajo de publicacion. El riesgo que la opcion C deja abierto -- que `latest` entregue un prerelease hasta que salga la estable -- es un riesgo que el dueno asume a sabiendas y que no alcanza a nadie mas.

Registrado en el pending registry como **PND-032**, con su criterio de aceptacion. Esto se escribe aca porque la vez anterior la opcion C se presento solo en el chat, la sesion se corto, y la decision se perdio: no estaba en disco en ningun lado.

**N-01 queda DECIDIDO y pendiente de ejecucion.** Sigue bloqueado por N-17, que es lo que se ataca primero.

### D-02 (sobre N-04) -- si NAC3 tiene nivel de datos propio

**Opcion A: artefacto estatico completo.** Roles, verbos, eventos, codigos de hallazgo con severidad, niveles de conformidad y gramatica de `payload_schema`, con version declarada y huella recalculable. Generado desde el runtime para que no pueda derivar.
- Costo: hay que construir el generador, decidir el esquema, y desde ese momento el artefacto es normativo: un cambio en el runtime sin regenerarlo es un bug. Requiere sumar un paso a CI que lo compare.
- Beneficio: cierra N-14, hace verificable la promesa de la seccion 12, y le da al agente externo lo que la seccion 4 ya promete.

**Opcion B: se retira la promesa.** El SPEC deja de insinuar que un consumidor puede leer el contrato sin desarmar el JS, y la seccion 4 se reescribe para decir que la definicion normativa es la prosa.
- Costo: cero construccion. La seccion 12 sigue siendo inverificable (N-14) y hay que bajarla tambien.
- Beneficio: honesto y barato.
- Riesgo: es un protocolo para agentes cuyo valor declarado es que el agente no tenga que interpretar prosa.

**Opcion C: minimo que desbloquea.** Solo el catalogo de codigos de hallazgo con su severidad, publicado y versionado.
- Costo: bajo. Cierra N-14 y deja N-04 abierto con el resto.
- Beneficio: convierte una garantia incomprobable en una comprobable.

**DECIDIDO el 2026-10-24: OPCION A, AMPLIADA.** El dueno, textual: *"D-02. SI. Publica en una forma que una maquina lo pueda leer, de hecho quiero que como urazuke lo sirva desde una o mas APIS estaticas validadas, con multiversion y latest sin purga... Al igual que urazuke hay que establecer un metodo a prueba de hackeos. Al ser protocolo interno que lo hackeen es altamente peligroso."*

No eligio el minimo: eligio el artefacto completo y le agrego cuatro requisitos que este documento no contemplaba.

1. **API estatica**, no un archivo suelto: superficies JSON con URL estable bajo una raiz propia.
2. **Multiversion**: cada version publicada en su propia ruta congelada.
3. **`latest` sin purga**: el puntero se mueve, las versiones viejas no se borran nunca.
4. **Metodo a prueba de manipulacion**, con la misma vara que Urazuke.

Registrado como **PND-033** (la API) y **PND-034** (el metodo de integridad).

**DECIDIDO el 2026-10-24 -- la custodia de la clave: OPCION A, clave offline en la maquina del dueno.** El dueno, textual: *"Si. Vamos con la primera."* Es la unica de las tres opciones en la que comprometer el sistema de publicacion **no** permite firmar: el CI verifica y no puede firmar, porque la clave privada no vive ni en el repositorio ni en los secretos de Actions. Cuesta un comando manual por release; las releases son raras y el indice solo se mueve con una.

**Precision que hay que dejar escrita, porque el pedido dice "a prueba de hackeos" y eso no es alcanzable tal cual:** con alojamiento estatico no se puede IMPEDIR que alguien que compromete el host cambie los bytes -- el host no corre codigo nuestro. Lo alcanzable, y lo que se construyo, es **manipulacion siempre detectable + consumidor que falla cerrado**: cualquiera que reciba el contrato puede probar, sin confiar en el servidor, que recibio lo que el proyecto publico; y el validador se niega a usar un contrato que no cierra. Prometer impedimento seria repetir el pecado que esta auditoria vino a corregir.

**ENTREGADO el 2026-10-24 (mismo dia de la decision).** Lo que existe y esta probado:

- `api/v/<version>/` con tres superficies: el contrato (roles, atributos, eventos, locales, superficie de API), el catalogo de hallazgos (24 codigos con su severidad y la funcion que los emite) y los niveles de conformidad (los 11 requisitos de la seccion 8, uno por uno).
- `api/index.json`: el directorio con **cadena de hashes append-only**. Cada entrada lleva el hash de la anterior, asi que reescribir una version vieja invalida todas las posteriores y la cabeza deja de coincidir con las otras dos copias (repositorio y tarball de npm): **tres testigos de operadores distintos**.
- `api/latest.json` + `api/latest/`: el puntero movil. **El canal viaja ADENTRO de cada artefacto**, no solo en el puntero, asi que un consumidor que exige estable rechaza un alpha sin leer nada mas. Es N-01 resuelto por construccion: hoy `stable` es `null` y `prerelease` es `2.5.0-alpha.5`, dicho en los datos.
- `scripts/build-contract-api.mjs`: el generador. **Carga los bytes publicados de `js/nac.js` en un sandbox y le pregunta al runtime**: su version, su set de roles, sus familias de eventos, sus codigos con severidad, sus baldes de `validate_global`. Nada se copia a mano del SPEC. Lo que solo vive en prosa (los 10 locales, los requisitos de nivel) se extrae con patrones anclados que **fallan ruidosamente si el ancla se mueve**.
- `scripts/contract-api.meta.json`: lo unico que no se puede derivar -- que SIGNIFICA cada codigo y si un requisito es decidible por una maquina. La compuerta exige simetria en **las dos direcciones**: un codigo sin significado documentado es rojo, y un significado documentado para un codigo que el runtime ya no emite tambien.
- `scripts/verify-contract-api.mjs`: el comando del tercero. Toma una URL, recomputa la cadena, **recalcula el sha384 sobre los bytes que el servidor realmente entrego** (no sobre el repo), comprueba el CORS, y compara la cabeza contra un testigo independiente.
- `scripts/test-contract-api.mjs`: **15 casos, probados en rojo de verdad**, cada uno en un repositorio temporal propio. Editar un artefacto publicado, borrar una version, purgar una entrada del indice, falsear la cabeza, falsear un hash, cambiar el runtime sin regenerar, subir la version sin publicar, un codigo sin documentar, un documento sin codigo, reescribir un requisito del SPEC, un espejo de `latest` que deriva, un puntero que inventa una estable. Y un caso verde: el arbol intacto pasa. **Uno de esos casos nacio de un bug real de la compuerta**: listaba `api/v/` por nombre y acusaba al propio `.htaccess` de ser una version sin entrada en la cadena, lo que habria bloqueado un deploy correcto.
- Dos `.htaccess` nuevos: CORS para todo el subarbol (**medido el 2026-10-24: el host no enviaba `Access-Control-Allow-Origin`, asi que un agente en el navegador desde otro origen no podia leer nada**) y cache inmutable de un ano para las versiones congeladas.
- Enganchado al deploy como dos pasos previos al envio (la compuerta y su suite en rojo) y uno posterior (verificacion contra el host con testigo independiente), mas una casilla nueva en la compuerta de coherencia de version: ahora son 16.

**CAPA 4 ENTREGADA el 2026-10-24, misma sesion que la decision.** Lo que existe:

- `scripts/sign-contract-api.mjs`: el unico programa que **produce** firmas, y lo unico que hace. `--keygen` crea la clave Ed25519, escribe la mitad privada fuera del repositorio con permisos 600 y publica la mitad publica en `api/trust.json`; `--sign` firma el indice. **Se niega** a escribir una clave en cualquier ruta bajo la raiz del repositorio, y **se niega** a sobreescribir una clave existente -- las dos unicas maneras de perder el control de la clave, cada una con su caso en rojo.
- `api/trust.json`: el ancla de confianza publicada. Lista de claves con `status` (`active` / `retired`), su material publico y su huella. **Las claves retiradas nunca se borran**, asi que las firmas viejas siguen siendo verificables; una clave retirada **no** puede firmar el indice actual.
- `api/attestation.json`: la firma. Cubre un payload que ata cuatro cosas: la cabeza de la cadena, la cantidad de entradas, las versiones publicadas y el **sha384 del indice entero**. Ese ultimo es el que importa: significa que la firma cubre todo el indice, no solo su cabeza, asi que editar el texto de la politica -- que no esta dentro de ninguna entrada y por lo tanto la cadena no mira -- rompe la firma. Tiene su caso en rojo.
- La compuerta (`build-contract-api.mjs`) **verifica y no puede firmar**. Mientras no exista `api/trust.json` avisa que la capa no esta puesta y deja pasar; desde que existe, se pone **roja** si falta la firma, si quedo vieja, si la hizo otra clave o si la clave esta retirada. En modo `--write` la misma condicion es un aviso con el comando exacto, porque ahi firmar es el paso siguiente y no un error.
- El verificador del tercero (`verify-contract-api.mjs`) ahora trae la firma del host, la comprueba **sobre los bytes que el servidor entrego**, y compara la huella de la clave contra un testigo independiente (`--expect-key`, o el repositorio con `--expect-head-from-repo`). Tambien detecta el **downgrade**: un host que deja de servir la firma falla, porque perderla en silencio no es una ausencia.
- Honestidad de la salida: la linea "la firma verifica" **solo** se imprime en verde cuando la clave coincide con un testigo. Si la firma cierra contra una clave que el testigo no conoce, el programa lo dice con esas palabras. Un verde que puede convivir con una falsificacion es peor que no imprimir nada.
- `scripts/test-contract-api-http.mjs`: **8 casos sobre el verificador, cada uno con un servidor HTTP real** y el verificador corriendo como proceso aparte. El caso que define la capa: un host que reescribe un artefacto, **reconstruye la cadena entera para que recompute**, mantiene coherentes el puntero y el espejo, publica una clave propia y firma su falsificacion con ella. Todo cierra contra si mismo; lo detectan los testigos. Al lado hay un caso **verde** que corre esa misma falsificacion sin testigos y la acepta: existe para que la frase "verifico coherencia interna y no procedencia" no se pueda borrar en silencio.
- La suite de la compuerta paso de 15 a **26 casos**. Los 11 nuevos: firma manipulada, firma valida sobre otra cabeza, firma de una clave no publicada, clave publicada sin firma, indice editado donde la cadena no mira, clave retirada firmando, huella que no coincide con su material, clave privada dentro del repositorio, sobreescritura de una clave existente, el firmador real contra la compuerta real de punta a punta, y el arbol firmado intacto en verde.
- El caso del firmador real contra la compuerta real no es decorativo: los tres programas llevan **su propia copia** de la regla de JSON canonico, a proposito, porque un verificador que importa el codigo del productor solo prueba que coinciden entre si. Si esas copias se separan un byte, todas las firmas dejan de verificar y ese caso es lo unico que lo dice antes que una release.
- `docs/CONTRACT_API_SIGNING.md`: el procedimiento del dueno, con los comandos, el respaldo, la rotacion y que pasa si no firma.
- Cache: `trust.json` y `attestation.json` entran en la regla de cinco minutos del indice, no en la de un ano de las versiones congeladas. Una firma cacheada vieja le llega al consumidor como una firma que ya no cubre el indice, es decir, como una publicacion manipulada: cachear una firma es fabricar una falsa alarma.
- `.gitignore` suma `*.pem`, `*.key` y `.nac3-keys/` como segundo cinturon, para una clave que llegue al arbol por otra via.

**Lo que esta capa dejo pendiente del dueno, y es lo unico:** correr los dos comandos. La clave no la puede crear Forge -- si la creara Forge en esta maquina y la dejara escrita en algun lado, seria la opcion B con otro nombre.


### D-03 (sobre N-08, reencuadrado por N-19) -- que se declara sobre idiomas

Antes las opciones, el hecho medido que cambia el planteo: la especificacion **si** se publica en diez idiomas, y **nueve de esas diez versiones son traducciones parciales** (30% a 38% del canonico). El requisito de la seccion 5 ("every `label_i18n` MUST cover all 10 NAC3 locales") es una obligacion sobre las etiquetas de la interfaz del adoptante, no sobre el idioma de la especificacion.

**Opcion A: declarar canonico.** Una frase en la seccion 5: el texto normativo es el ingles; las traducciones se publican como no normativas; el requisito de diez locales aplica a `label_i18n` del adoptante, no al documento.
- Costo: una frase. Cierra la incoherencia aparente.
- Beneficio: inmediato y sin obra.

**Opcion B: internacionalizar la portada y la pagina del spec.** Traducir interfaz y navegacion a diez idiomas.
- Costo: alto y permanente (cada cambio de la portada hay que hacerlo diez veces). No toca el problema real, que es que las traducciones del texto normativo estan incompletas.

**Opcion C: A, mas marcar el estado real de cada traduccion.** Declarar canonico el ingles, y que cada traduccion publicada diga que es parcial y de que version, enlazada desde la portada.
- Costo: medio. Toca los nueve archivos y la portada.
- Beneficio: convierte "diez idiomas" en un dato verdadero en vez de un conteo de archivos.

### D-04 (sobre N-09, y no se puede decidir sin N-20) -- que se publica sobre los limites

**Antes de elegir hay que leer N-20: el material interno ya esta publicado.** El documento interno que el pedido manda no publicar esta accesible hoy en la web, junto con otros documentos internos. Asi que "no publicar ese documento" ya no es una instruccion sobre el futuro: es una situacion a reparar.

**Opcion A: se escribe una seccion publica de limites desde cero, y se arregla primero la frontera interno/publico.** Texto nuevo, aprobado frase por frase por el dueno.
- Costo: redaccion y aprobacion; mas el trabajo de N-20.
- Beneficio: es el cambio mas barato que mas credibilidad compra, y deja de haber material interno expuesto.

**Opcion B: se publica el documento interno tal cual.** El pedido la veta expresamente. La listo solo para dejar constancia de que esta descartada.

**Opcion C: se arregla N-20 y no se escribe nada sobre limites por ahora.** Costo minimo; la portada sigue diciendo 95,5% sin decir donde no llega.

**DESBLOQUEADO el 2026-10-24.** N-20 ya no condiciona esta decision: el dueno resolvio N-20 aceptando la exposicion (ver el cierre al pie de N-20), asi que "arreglar primero la frontera" dejo de ser un prerrequisito. Lo que queda de D-04 es una sola pregunta: se escribe la seccion publica de limites, si o no.

**Se escribe.** No es una eleccion nueva: el **punto 3 del bloque de verificacion del dueno** (seccion 5) ya exige `curl /nac-spec/ | grep -c -i "does not cover"` mayor que cero. El dueno pidio ese criterio cuando aprobo el backlog, y hoy devuelve `0`. Cumplirlo ES escribir la seccion. Queda como trabajo pendiente de redaccion, con aprobacion frase por frase del dueno antes de publicar.

**RESUELTA Y EJECUTADA el 2026-10-26.** La seccion esta escrita, **leida frase por frase por
el dueno y aprobada sin cambios**: ocho limites mas la frase de las tres naturalezas con las
dos licencias. Respuesta textual del dueno: *"Todo leido, decision declararlas historicas.
Publicar 2.5 con cifras historicas y remedir despues."* Registro en
`docs/LIMITS_APPROVAL_2026-10-26.md`. La segunda mitad de esa frase decide tambien lo de las
cifras: **se publica la 2.5.0 con las cuatro corridas declaradas historicas y la re-medicion
contra la 2.5.0 sale del camino critico** (`PND-040`, con su costo medido y su criterio de
aceptacion). D-04 deja de estar abierta.

---

## 3. Entradas

### N-01 [DECISION DEL DUENO] El dist-tag `latest` de npm apunta a un alpha

**Que esta mal:** el registro publica como estable un prerelease, y la seccion 9 no dice una palabra sobre prereleases.

**Evidencia del auditor (transcrita):** `GET https://registry.npmjs.org/@nac3/runtime` devuelve `dist-tags {"latest":"2.5.0-alpha.5","alpha":"2.5.0-alpha.5"}`, con 2.4.0 estable publicada y doce versiones en total.

**Evidencia que reproduje (2026-10-24):** `GET registry.npmjs.org/@nac3/runtime` devuelve `dist-tags = {"latest":"2.5.0-alpha.5","alpha":"2.5.0-alpha.5"}`, 12 versiones, `time.modified = 2026-05-25T...`. En el repo, `SPEC.md:4` dice literalmente `Promoted to npm dist-tag `latest``. La seccion 9 empieza en la linea 1060 y no contiene la cadena `prerelease` (cero coincidencias en todo el documento). La linea 1075 dice `implements NAC3 v2.1 with three patch revisions`, que contradice al registro. **Se reproduce.**

**Donde vive el arreglo:** `SPEC.md` seccion 9 (politica de prerelease) y/o el procedimiento de publicacion que fija los dist-tags.

**Grupo de convergencia:** G1-DISTRIBUCION (con N-02, N-03, N-17). No cierra sin N-17.

**Perfiles y criterio de aceptacion:**
- Adoptante nuevo: `npm install @nac3/runtime` entrega lo que la seccion 9 dice que entrega, y el SPEC que viene adentro declara esa misma version.
- Adoptante existente: ninguna version ya instalada cambia de comportamiento.
- Agente externo: los dist-tags son legibles y consistentes con la seccion 9.
- Auditor: el comando del bloque de verificacion devuelve el tag que la decision D-01 haya fijado, y la seccion 9 dice lo mismo.

**Severidad:** avisa. **Quien decide:** el dueno (ver D-01). **Estado:** abierto.

---

### N-02 Cero integridad en lo que la portada manda copiar

**Que esta mal:** la portada ensena a cargar un JavaScript de 344.665 bytes sin atributo de integridad, asi que el adoptante no tiene con que comprobar que recibio lo que el proyecto publico.

**Evidencia del auditor (transcrita):** `grep -c integrity=` sobre el HTML de la portada devuelve 0.

**Evidencia que reproduje (2026-10-24):** `curl -s https://yujin.app/nac-spec/` y `findstr /C:"integrity="` devuelve `0` lineas. En el repo, `index.html` no contiene la cadena `integrity` en ninguna linea, y el snippet de la linea 1068 ensena el `script src` sin hash. **Se reproduce.**

**Donde vive el arreglo:** `index.html` (snippet de la portada) + documentacion de como se recalcula el hash.

**Grupo de convergencia:** G1-DISTRIBUCION (con N-01, N-03, N-17). N-02 y N-03 cierran el mismo agujero.

**Perfiles y criterio de aceptacion:**
- Adoptante nuevo: puede copiar el snippet y el navegador valida el hash sin intervencion.
- Adoptante existente: el snippet nuevo funciona igual que el viejo, con el atributo agregado.
- Agente externo: el hash publicado corresponde al archivo servido hoy.
- Auditor: `grep -c "integrity="` sobre la portada devuelve mas de cero, y el hash pegado en el snippet coincide con el del archivo servido.

**Severidad:** avisa. **Quien decide:** Forge propone; el dueno aprueba el snippet.

**Estado:** **CERRADO** el 2026-10-24, verificado en produccion.

**Cierre -- que se hizo:**
- `index.html` carga sus tres scripts con `integrity="sha384-..."` y `crossorigin="anonymous"`, y el snippet que se manda copiar lleva el hash en el propio tag.
- El hash no esta escrito a mano: lo produce `scripts/build-integrity.mjs`, que recorre los `<script src>` de la portada y **falla** si el hash de la pagina no coincide con el byte en disco. Corre como compuerta del workflow **antes** de preparar el envio.
- Se documento en la portada como recalcularlo, con un comando de una linea sin dependencias (`node -e ...`) y el comando del gate.
- Prueba de regresion real: `scripts/test-integrity-load.mjs` sirve el repositorio por HTTP y abre la portada en un navegador de verdad. **Se probo en rojo**: alterado un digito del hash, el navegador rechazo el runtime y `window.NAC` quedo indefinido; restaurado el hash, verde. Un hash mal escrito se ve perfecto en el archivo, y solo el navegador decide.

**Criterio de aceptacion (perfil auditor): CUMPLIDO.** `curl -s https://yujin.app/nac-spec/ | grep -c "integrity="` devuelve 3.

**Evidencia en produccion (2026-10-24 17:00 UTC, medida por mi):**

```
$ gh run list --limit 1
completed  success  40113957823  fix(integrity): refresh the published sha384 over LF bytes  24s

$ curl -s https://yujin.app/nac-spec/ | grep -o 'integrity="[^"]*"' | wc -l
3

$ curl -sI https://yujin.app/nac-spec/js/2.5.0-alpha.5/nac.js | head -1
HTTP/1.1 200 OK            (344665 bytes)

  servido   sha384-esz+6WxnJZiOKEl1oEgTt5LaoGTBX8pyI8QdsnISxHIVzGCgGYk5qKnWmBEsYnmp
  publicado sha384-esz+6WxnJZiOKEl1oEgTt5LaoGTBX8pyI8QdsnISxHIVzGCgGYk5qKnWmBEsYnmp
```

Los tres scripts se comprobaron uno por uno, no una muestra: `nac.js` (344.665 b), `nac-v2-extensions.js` (82.861 b) y `nac-chat-client.js` (29.435 b). El sha384 calculado sobre los bytes que entrega el servidor es identico al atributo `integrity` de la portada publicada en los tres casos. Lo que no hice: abrir produccion con un navegador real; la comprobacion es la misma aritmetica que hace el navegador, sobre los mismos bytes.

---

### N-03 El runtime se sirve en una URL mutable con parametro de consulta

**Que esta mal:** la unica URL publicada del runtime es mutable, y el parametro de consulta no congela el contenido.

**Evidencia del auditor (transcrita):** `js/nac.js?v=v25-2026-05-25-alpha5`.

**Evidencia que reproduje (2026-10-24):** `index.html:1589` contiene `<script src="js/nac.js?v=v25-2026-05-25-alpha5">`. No existe en el repo ninguna ruta versionada tipo `js/<version>/nac.js`: el directorio `js/` tiene un solo `nac.js`. **Se reproduce.**

**Donde vive el arreglo:** publicacion (copiar el artefacto tambien a `js/<version>/nac.js`) + `index.html` (decir cual URL es para produccion y cual para probar).

**Grupo de convergencia:** G1-DISTRIBUCION.

**Perfiles y criterio de aceptacion:**
- Adoptante nuevo: sigue una URL que no cambia de contenido.
- Adoptante existente: puede comparar el hash de la version que fijo contra el publicado.
- Agente externo: la ruta versionada y la mutable sirven el mismo byte.
- Auditor: la ruta versionada responde 200 y su hash coincide con el `integrity` de N-02.

**Severidad:** avisa. **Quien decide:** Forge propone.

**Estado:** **CERRADO** el 2026-10-24, verificado en produccion.

**Cierre -- que se hizo:**
- Existe la ruta inmutable `js/2.5.0-alpha.5/nac.js` (344.665 bytes): copia congelada, nunca editada a mano. `js/nac.js` queda como alias movil (el build mas nuevo) y asi esta documentado en la portada.
- `js/integrity.json` es el recibo: version, ruta inmutable, alias movil, bytes y sha384 de cada artefacto que la portada carga.
- La portada dice explicitamente cual URL fijar en produccion y cual usar solo para probar.
- El gate falla si `js/<version>/nac.js` difiere de `js/nac.js`: un runtime editado sin subir la version rompe el build en vez de romper a quien fijo la ruta.
- El workflow ahora verifica **despues** del envio que la ruta versionada responda 200 y que la portada publicada ofrezca el path inmutable.

**Criterio de aceptacion (perfil auditor): CUMPLIDO.** `https://yujin.app/nac-spec/js/2.5.0-alpha.5/nac.js` responde 200 con 344.665 bytes y su sha384 es exactamente el `integrity` de la portada publicada. La evidencia esta pegada en N-02.

**Correccion de este documento:** la version anterior de esta entrada decia 352.798 bytes. Ese numero era el del working tree de Windows con CRLF, no el del artefacto que se publica. El tamano real del contrato es 344.665 bytes (LF). La causa esta explicada en N-21.

---

### N-04 [DECISION DEL DUENO] El contrato no es legible por maquina

**Que esta mal:** los elementos que el SPEC declara normativos (roles, verbos, eventos, codigos de hallazgo, niveles de conformidad) no existen como dato, solo como prosa y dentro del runtime.

**Evidencia del auditor (transcrita):** `https://yujin.app/nac-spec/nac3.json` devuelve 404, y en los enlaces de la portada no hay un solo `.json`.

**Evidencia que reproduje (2026-10-24):** `curl -o nul -w "%{http_code}"` sobre `https://yujin.app/nac-spec/nac3.json` devuelve `404`. En el repo, el barrido de todos los `.json` fuera de `node_modules` y `.tmp` no devuelve ningun artefacto de contrato: solo manifiestos por pagina e instancias de configuracion. **Se reproduce.** Nota: el propio bloque de verificacion del pedido (punto 8) depende de N-18, que hoy no funciona.

**Donde vive el arreglo:** artefacto nuevo en la raiz publicada + generador + paso de CI que lo compare contra el runtime.

**Grupo de convergencia:** G2-CONTRATO-LEGIBLE (con N-14, N-18).

**Perfiles y criterio de aceptacion:**
- Adoptante nuevo: obtiene roles y verbos sin leer 62 KB de markdown.
- Adoptante existente: el catalogo publicado corresponde a la version del runtime que esta usando.
- Agente externo: puede validar un manifest contra el contrato sin ejecutar el runtime.
- Auditor: el artefacto responde 200, declara version, y su huella se recalcula y coincide.

**Severidad:** bloquea. **Quien decide:** el dueno (ver D-02).

**Estado:** **CERRADO** el 2026-10-24 en el repositorio; pendiente de la verificacion en produccion del mismo dia (ver el pie de esta entrada).

**Cierre -- que se hizo.** Decidido D-02 = opcion A ampliada, el contrato existe como dato. Las cifras del artefacto generado, que son la respuesta medida a "los elementos normativos no existen como dato":

| superficie | contenido |
|---|---|
| `api/v/2.5.0-alpha.5/contract.json` | 20 roles con sus eventos de completitud, 48 atributos `data-nac-*`, 89 nombres de evento, 133 funciones exportadas, los 10 locales obligatorios, los verbos convencionales |
| `api/v/2.5.0-alpha.5/findings.json` | 24 codigos de hallazgo con severidad y funcion emisora, mas los 5 baldes sin codigo de `validate_global` declarados como tales |
| `api/v/2.5.0-alpha.5/levels.json` | los 3 niveles con sus 11 requisitos: 8 decidibles por una maquina (5 estaticos, 3 por manejo de la pagina) y 3 que NO lo son, cada uno diciendo por que |

Lo que hace que esto no pueda derivar: el generador **no lee el SPEC para saber que hay**, carga los bytes publicados del runtime y le pregunta. La compuerta del deploy regenera y compara; si el runtime cambia y el contrato no, el deploy se detiene.

**Criterio de aceptacion por perfil:**
- Adoptante nuevo: **CUMPLIDO.** Obtiene roles y verbos de un JSON, sin leer 62 KB de markdown.
- Adoptante existente: **CUMPLIDO.** El catalogo declara la version del runtime y su sha384, asi que se puede atar a la version que tiene instalada.
- Agente externo: **CUMPLIDO en el repositorio.** Puede validar contra el contrato sin ejecutar el runtime. El CORS que necesita para leerlo desde otro origen no existia en el host (medido) y se agrego en este mismo cambio: se comprueba recien despues del deploy.
- Auditor: **CUMPLIDO**, con la verificacion en produccion pegada al pie de esta entrada.

**Los 3 requisitos que una maquina NO puede decidir se publican diciendolo**, en vez de ser omitidos para que el numero quede lindo: "todo widget que un agente DEBERIA poder operar lleva id y rol" (una herramienta no sabe cual deberia), "implementa las primitivas de brownfield" (no se distingue el que no las necesita del que las omitio) y "distingue `isTrusted` para verbos sensibles" (cual verbo es sensible es decision de producto). Un validador que reporte esos tres como aprobados esta excediendose, y el artefacto lo dice en el propio dato.

---

### N-05 Deriva del documento respecto de si mismo

**Que esta mal:** el SPEC habla de versiones pasadas como si fueran el presente o el futuro.

**Evidencia del auditor (transcrita):** seccion 5: "`payload_schema` is informational in v2.3 stable" y "v2.4 will formalise the schema grammar"; seccion 13: "Currently no (v2.1)", "Not in v2.1; possibly v2.3", "Tracked as v3.0 candidate".

**Evidencia que reproduje (2026-10-24):** `findstr /N` sobre el SPEC publicado (1.620 lineas, identico al del repo) devuelve ocho lineas con referencia de version: 54, 80, 317, 321, 722, 1075, 1164, 1167. Las cuatro que el auditor cita son 317, 321, 1164 y 1167. Las otras cuatro no las menciono y son de la misma familia: la 1075 es la mas grave, porque dice que el runtime implementa 2.1 mientras el paquete publicado es 2.5.0-alpha.5. **Se reproduce y se amplia.**

**Donde vive el arreglo:** `SPEC.md` (todas las referencias de version, resueltas una por una contra el estado real de 2.4.0 y 2.5.0-alpha.5).

**Grupo de convergencia:** G3-DERIVA (con N-06, N-07, N-13).

**Perfiles y criterio de aceptacion:**
- Adoptante nuevo: no encuentra en el documento una version futura que ya ocurrio.
- Adoptante existente: puede saber que se formalizo y en que version.
- Agente externo: no reporta una capacidad como "proxima" si ya esta entregada.
- Auditor: el comando del bloque de verificacion sobre `v2.1|v2.3 stable|v2.4 will` devuelve vacio, o cada aparicion queda explicada aca como intencional (marca de linea base historica).

**RESUELTO EN EL REPOSITORIO el 2026-10-24** (rama `release/2.5.0`; sale a la web con la 2.5.0).

Las ocho lineas, una por una, resueltas contra el estado real leido del codigo y del changelog -- no supuesto:

| Linea | Decia | Queda | Por que |
|-------|-------|-------|---------|
| 54 | `A data-table host (v2.1).` | `(since 2.1)` | Marca de linea base historica, se conserva: un adoptante existente necesita saber desde cuando existe el rol. Reescrita para que se lea como pasado y no como presente. |
| 91 | `Reserved id prefixes (v2.1):` | `(since 2.1)` | Idem. |
| 317 | ``payload_schema` is informational in v2.3 stable` | parrafo nuevo | El campo es informativo **en 2.5** y el runtime **no lo lee**. Ver N-26: esto destapo un hallazgo propio. |
| 321 | `v2.4 will formalise the schema grammar and turn enforcement into a default` | eliminada | No ocurrio en 2.4 ni hasta 2.5. Se **elimina** en vez de re-fecharse y pasa a la seccion 13 como pregunta abierta **sin fecha**. Una promesa con version adosada, pasada su version, un agente la lee como capacidad disponible. |
| 722 | `### 5.3 Data tables (v2.1)` | `(since 2.1)` | Marca historica. |
| 1075 | ``@nac3/runtime@2.1.3` implements NAC3 v2.1 with three patch revisions` | `@nac3/runtime@X.Y.Z` ... `vX.Y` ... `Z patch revisions` | Era un EJEMPLO de la regla de espejo, no una afirmacion sobre la version vigente, y la regla sigue siendo cierta. Pero el ejemplo con numeros concretos vuelve a envejecer en cada release: queda con marcadores, que no pueden derivar. |
| 1164 | `Currently no (v2.1). El v22 roadmap argumenta...` | fila de tabla, **DECIDIDO: no** | Decidido en 2.2.0 y con candado desde entonces: `tab.`+rol `navigation` produce `tab_id_manifest_role_drift` y con `STRICT_VALIDATION` (default `true` desde 2.3.0) `register` tira. Verificado en `runtime/test/v22.mjs` T3 y T5. |
| 1167 | `Not in v2.1; possibly v2.3` | fila de tabla, **ABIERTA, no implementada** | Medido: cero manejo de `'./'` en el runtime; `_findElement` matchea el id exacto y scopea por plugin. Ese scope ya cubre el caso que la pregunta pedia, asi que se deja abierta y se dice por que la presion es baja. No se inventa una decision que nadie tomo. |

Mas dos lineas que la auditoria no vio y que son de la misma familia, encontradas al barrer TODA referencia de version (no solo las ocho del patron):

- **Seccion 14** afirmaba "current version 2.5.0-alpha.5". Era una casilla de version escrita a mano que **ninguna de las casillas del candado vigilaba**. Se elimina el numero: apunta a `NAC.version` y a `api/latest.json`.
- **Seccion 9** no decia una palabra sobre prereleases, que es la mitad documental de N-01. Ahora existe la **seccion 9.1**: `latest` apunta solo a estables, los prereleases viven bajo su propio dist-tag, nada en un prerelease es una promesa, y las garantias de las secciones 10 y 12 empiezan en la estable. Eso es lo que hace comprobable el punto 1 del bloque de verificacion.

**Medicion del criterio de aceptacion:** `grep -n "v2.1\|v2.3 stable\|v2.4 will"` sobre `SPEC.md` devuelve **vacio**. No por eliminar informacion: las tres marcas historicas siguen diciendo su version, escritas como `since 2.1`, que se lee como pasado. Las dos frases que eran el defecto -- `v2.3 stable` como presente y `v2.4 will` como futuro -- ya no existen.

**Severidad:** bloquea. **Quien decide:** Forge propone, el dueno aprueba cada reescritura que cambie una promesa. **Estado:** **CERRADO en el repositorio**; el punto 7 del bloque de verificacion se mide contra el servidor y pasa a verde con el deploy de la 2.5.0.

---

### N-06 Colision de nombres en el nucleo del contrato

**Que esta mal:** los niveles de conformidad y el protocolo se llaman casi igual, y un agente que tiene que reportar un nivel no puede desambiguar.

**Evidencia del auditor (transcrita):** los niveles de la seccion 8 se llaman NAC-1, NAC-2 y NAC-3, y el protocolo se llama NAC3.

**Evidencia que reproduje (2026-10-24):** `SPEC.md:1026` `A page is **NAC-1 conformant** if:`, `:1036` `**NAC-2 conformant**`, `:1047` `**NAC-3 conformant**`. **Se reproduce.**

**Donde vive el arreglo:** `SPEC.md` seccion 8 + nota de compatibilidad + cualquier consumidor que reporte el nivel (runtime y CLI).

**Grupo de convergencia:** G3-DERIVA. Toca N-18 (el CLI es quien reportaria el nivel).

**Perfiles y criterio de aceptacion:**
- Adoptante nuevo: distingue el protocolo del nivel sin explicacion previa.
- Adoptante existente: encuentra una nota que dice como se llamaban antes.
- Agente externo: reporta un nivel con un identificador que no colisiona con el nombre del protocolo.
- Auditor: ningun encabezado normativo usa la misma cadena para las dos cosas.

**DATO NUEVO DEL 2026-10-24 que acota la eleccion (no la toma):** la API de contrato ya publica los niveles como dato, y ya los desambigua para una maquina: el id normativo es `nac3-conformance-level-1|2|3` y el nombre que colisiona viaja al lado como `display_name: "NAC-1"`, es decir como etiqueta y no como clave. O sea que **la mitad del hallazgo que le importa a un agente esta cerrada**: un consumidor que reporta un nivel ya tiene un identificador que no colisiona con el nombre del protocolo.

Lo que queda es la prosa de la seccion 8, que es lo que lee una persona. Y ahi la eleccion esta acotada a dos, porque un nombre nuevo tipo Bronze/Silver/Gold obligaria a cambiar un id **ya publicado** en una API inmutable, o a vivir con un tercer vocabulario:

- **Opcion A -- "Level 1 / 2 / 3"** (recomendada). Coherente con el id que ya se publico: el documento pasa a decir "a page is at **NAC3 Conformance Level 2**", el id publicado no se toca, y `NAC-2` queda escrito como alias historico en una nota de compatibilidad. Costo: una pasada por la seccion 8 y el extractor de `build-contract-api.mjs`, que ancla en la cadena literal `A page is **NAC-N conformant**` y se pone rojo a proposito cuando se mueve.
- **Opcion B -- dejar NAC-1/2/3 en la prosa** y declarar explicitamente en la seccion 8 que el nivel se cita por su id publicado, no por su nombre. Costo cero de codigo. A cambio, el texto sigue siendo ambiguo para una persona, que es la mitad del hallazgo que el auditor senalo primero.

**Lo que esto bloquea:** la seccion 8 es una de las cuatro superficies que `build-contract-api.mjs` extrae del SPEC con ancla, y el texto de cada requisito esta hasheado contra un sidecar revisado. Tocarla pone el gate en rojo hasta que alguien re-lea el mapeo, que es el comportamiento buscado. Por eso este cambio **tiene que viajar en el mismo salto de version** que el resto, y por eso es lo unico de G3 que no se hizo hoy.

**DECISION DEL DUENO (2026-10-24, chat): OPCION A.** Pedido textual: "A.". Los niveles pasan a llamarse **NAC3 Conformance Level 1 / 2 / 3** y `NAC-1/2/3` queda escrito como nombre historico.

**RESUELTO EN EL REPOSITORIO el 2026-10-24 (PND-036).** Lo entregado:

- `SPEC.md` seccion 8: los tres encabezados pasan a `A page is at **NAC3 Conformance Level N**`, y la seccion abre diciendo que un nivel se cita por el id publicado y no por su nombre.
- `SPEC.md` **seccion 8.1 (nueva)**, *Historical level names*: queda escrito que antes de la 2.5.0 los niveles se llamaban `NAC-1`, `NAC-2` y `NAC-3`, por que colisionaban, y que siguen siendo legibles como alias historico pero **no son normativos**. Es exactamente lo que pedia el criterio del perfil "adoptante existente".
- `levels.json`: `display_name` pasa a `NAC3 Conformance Level N` y aparece `legacy_display_name: NAC-N` al lado. **El id publicado no cambia** (`nac3-conformance-level-N`): la API es inmutable y no se toco. El bloque `naming` publica los tres patrones y de que seccion del SPEC sale cada uno.
- `scripts/build-contract-api.mjs`: el extractor **ya no compone** el nombre. Lo **captura** del encabezado de la seccion 8, y el alias lo **lee** de la seccion 8.1. Dos lugares escribiendo la misma cadena es el bug de N-17 (la version tipeada en 13 lugares); aca no puede repetirse porque el generador no tiene ningun nombre de nivel escrito adentro.
- Superficie publica en ingles: **36 ediciones en 11 archivos** (`guides/*` md + html, `index.html`, `SPEC.md`), **cada una con su lectura anotada** -- protocolo o nivel.

**Evidencia nueva que la auditoria no tenia, y que aparecio al hacer el reemplazo:** la misma cadena significaba dos cosas distintas **dentro del mismo archivo**. En `guides/AI_PLAYBOOK_NEW_PROJECT.md` el titulo "Start a new NAC-3 project" es el **protocolo** y "Step 10 -- Promote to NAC-3 conformance" es el **nivel**; el archivo lo usa en los dos sentidos sin distinguirlos. Un reemplazo a ciegas habria quedado mal en la mitad del archivo. Ese playbook, cuya audiencia declarada es un agente de IA, es por si mismo la mejor evidencia del hallazgo.

**Medicion (2026-10-24):** `grep -n "NAC-1\|NAC-2\|NAC-3\|NAC-conformant"` sobre `SPEC.md`, `guides/*.md`, `guides/*.html`, `index.html`, `README.md`, `ABOUT.md`, `SECURITY.md`, `CONTRIBUTING.md`, `README_DEMOS.md` e `IMPLEMENTATION_GUIDE.md` devuelve **tres lineas, las tres dentro de la seccion 8.1**, que es donde deben estar. El contrato generado en un sandbox a version de ensayo publica los tres niveles con 4/4/3 requisitos, los mismos ids y los mismos hashes de requisito que antes -- o sea que el texto normativo de los requisitos no se movio, solo el nombre del nivel.

**Candados nuevos, 3 casos que no existian:**

- renombrar un nivel en la prosa -> el gate corta con `yielded 2 levels, expected 3`.
- sacar un alias de la seccion 8.1 -> corta con ``section 8.1 no longer records `NAC-2` ``.
- sacar la seccion 8.1 entera -> corta con `cannot find SPEC.md section 8.1`.

**Probados en rojo uno por uno, no por el mensaje:** desactive **solo** el chequeo de la 8.1 y cayeron exactamente esos dos casos (31 pasaron, 2 fallaron); desactive **solo** el ancla del encabezado y cayo exactamente el tercero (32 pasaron, 1 fallo). Y con el chequeo desactivado verifique el **escenario real**, que es editar la 8.1 **y regenerar** -- lo que hace un release, y donde el chequeo de congelamiento no puede ver nada porque el arbol vuelve a ser coherente consigo mismo: el gate publicaba `legacy_display_name: "NAC-2"` con la seccion 8.1 ya sin documentarlo. Con el chequeo puesto, corta y no escribe nada. Es la misma forma de mentira que la huella que se comparaba contra si misma (N-25): una promesa publicada que ningun documento sostiene.

**Lo que NO se toco, y por que:** `NAC.conformance_tier` sigue devolviendo `'NAC-3-versioned'`. Es un valor de cable, no prosa, y es otra taxonomia (la de RFC V24-04). Entra como **N-29**.

**Severidad:** avisa. **Quien decide:** decidido. **Estado:** **CERRADO en el repositorio.** Como todo G3, llega a la web con el salto de version.

---

### N-07 Typo en un encabezado normativo

**Que esta mal:** un encabezado normativo tiene una palabra mal escrita.

**Evidencia del auditor (transcrita):** `## 17. Asistive labels` deberia decir `Assistive`.

**Evidencia que reproduje (2026-10-24):** `SPEC.md:1554` `## 17. Asistive labels (v2.5 -- SHIPPED in 2.5.0-alpha.5 / RFC V25-03)`, una coincidencia en el SPEC publicado. **Se reproduce.** Alcance real, medido en todo el repo: el mismo error aparece en nueve archivos mas, incluidos `README.md:100`, `CHANGELOG.md` en cuatro lineas, `rfcs/README.md` en dos lineas y las copias empaquetadas del SPEC. No hay mas errores ortograficos que el corrector haya marcado en el SPEC; si aparece otro, va como entrada propia segun lo pedido.

**Donde vive el arreglo:** `SPEC.md:1554` + los nueve archivos con la misma cadena.

**Grupo de convergencia:** G3-DERIVA (mecanico, sin decision).

**Perfiles y criterio de aceptacion:**
- Todos: `grep -c "Asistive"` sobre el SPEC publicado devuelve 0.
- Adoptante existente: los anclas de seccion siguen funcionando despues del cambio (verificar que nadie enlace al encabezado con el error).

**RESUELTO EN EL REPOSITORIO el 2026-10-24.** Corregido en los nueve archivos escritos a mano (`SPEC.md`, `README.md`, `README_DEMOS.md`, `rfcs/README.md` x2, `demos/index.html`, `demos/v25-03-narrate/index.html`, `docs/V2.5_ALPHA_1_RELEASE_HANDOVER_2026_05_23.md`, `runtime/CHANGELOG.md` x3, y tres comentarios de `js/nac.js`), y los derivados regenerados por sus generadores en vez de a mano: `runtime/SPEC.md`, `SPEC.html`, `README_DEMOS.html`, `runtime/dist/*`.

**Medicion:** `grep -c "Asistive" SPEC.md` devuelve **0**; `grep -c -i asistive` devuelve 0 en `SPEC.html`, `README_DEMOS.html`, `runtime/SPEC.md` y `runtime/dist/nac.mjs`.

**CONSECUENCIA MEDIDA EL 2026-10-24 (tramo siguiente), y es parte de la lista de tareas del release:** tres de esas correcciones estaban en **comentarios de `js/nac.js`**, que es el runtime publicado. Resultado: la copia congelada e inmutable que la portada carga con su hash, `js/2.5.0-alpha.5/nac.js`, quedo en 344.665 bytes y `js/nac.js` en 344.668. Medido con `git show`: en `HEAD~1` las dos copias eran **identicas**; desde `5ee1f1e` **difieren**.

Por eso el gate de integridad esta en rojo en esta rama, y **no por la misma razon que el gate de contrato** -- el de contrato se queja del hash del SPEC, el de integridad se queja de que los bytes del runtime publicado se movieron. Los dos se arreglan con el salto de version, pero el release tiene que acordarse de **regenerar tambien la copia congelada del runtime**, no solo el contrato. Dicho en una linea: un typo en un comentario del runtime cuesta una version, y eso es el precio correcto de que la direccion congelada sea de verdad inmutable.

**Dos cosas que NO se tocaron, a proposito:**

- **`js/2.5.0-alpha.5/nac.js`**, la copia congelada ya publicada, conserva el typo en sus comentarios. Es correcto: una ruta inmutable es una promesa de bytes, y corregir una falta de ortografia no justifica romperla. El typo muere en la 2.5.0, donde se congela una copia nueva.
- **Las nueve traducciones** (`i18n/*/SPEC.html`) conservan el typo. Se regeneran con G4-IDIOMAS, cuando se decida D-03; hacerlo hoy seria regenerarlas dos veces.

**El criterio de aceptacion pedia verificar que nadie enlace al encabezado con el error:** verificado, cero enlaces entrantes. Pero esa verificacion destapo un problema de fondo que no estaba en la auditoria: el `data-nac-id` del encabezado deriva del titulo, asi que corregir el typo renombra un id direccionable, y el propio SPEC exige que los ids sean estables. Queda registrado como **N-28**, abierto y atado a G4.

**Severidad:** registra. **Quien decide:** Forge. **Estado:** **CERRADO en el repositorio**; el punto 6 del bloque de verificacion pasa a verde con el deploy de la 2.5.0.

---

### N-08 [DECISION DEL DUENO] Idiomas: se reencuadra en N-19

**Que esta mal (formulacion del auditor):** el protocolo exige diez idiomas a cada adoptante y publica su especificacion en uno.

**Evidencia del auditor (transcrita):** la seccion 5 dice "Every `label_i18n` MUST cover all 10 NAC3 locales"; la pagina publica seria `<html lang="en">` con cero claves de internacionalizacion.

**Evidencia que reproduje (2026-10-24) -- la premisa no se sostiene:**
- `https://yujin.app/nac-spec/i18n/es/SPEC.md` responde **200**. Existen nueve directorios de idioma: `ar, de, es, fr, hi, it, ja, pt, zh` (mas el canonico en ingles = diez locales).
- La portada publicada tiene **66 lineas** con `label_i18n` (diez locales cada una).
- Los diez locales ya estan enumerados en un solo lugar del SPEC, linea 163: `es, en, pt, fr, ja, zh, hi, ar, de, it`. El pedido de "dejalo escrito en un solo lugar, enumerado" ya esta cumplido.
- `index.html:2` es `<html lang="en">`, eso si es cierto, y ninguna de las nueve traducciones esta enlazada desde la portada.

**Conclusion:** el hallazgo, como esta escrito, **no se reproduce**. Lo que si existe y no estaba en la auditoria es que las nueve traducciones publicadas tienen entre 480 y 621 lineas contra 1.620 del canonico: son parciales. Eso pasa a **N-19**, y la decision sobre idiomas pasa a **D-03**.

**Donde vive el arreglo:** `SPEC.md` seccion 5 (una frase) + `index.html` (enlace a las traducciones, si el dueno elige la opcion C de D-03).

**Grupo de convergencia:** G4-IDIOMAS (con N-19).

**Perfiles y criterio de aceptacion:**
- Adoptante nuevo: sabe en que idioma esta el texto normativo antes de leerlo.
- Adoptante existente: si elige una traduccion, sabe que es parcial y de que version.
- Agente externo: la lista de locales autoritativos esta en un solo lugar y es la misma que la del validador.
- Auditor: la portada declara el idioma canonico y enlaza lo traducido, o declara que no hay traducciones.

**Severidad:** registra. **Quien decide:** el dueno (ver D-03). **Estado:** abierto, reencuadrado.

---

### N-09 [DECISION DEL DUENO] La portada no declara ningun limite del protocolo

**Que esta mal:** la portada afirma resultados sin decir donde el protocolo no llega.

**Evidencia del auditor (transcrita):** cero ocurrencias de "canvas", "iframe", "not covered" y "limitation" en el HTML de la portada.

**Evidencia que reproduje (2026-10-24):** sobre la portada publicada y sobre `index.html` del repo, `findstr` de `canvas`, `iframe`, `limitation` y `does not cover` devuelve **0** lineas en cada caso. **Se reproduce.**

**Lo que la auditoria no vio, y cambia el planteo:** el documento interno que el pedido manda no publicar **ya esta publicado** (ver N-20). Ademas el repo no tiene ninguna frontera entre material interno y publico, asi que la instruccion "no publiques ese documento" ya no es una precaucion: es una situacion a reparar. Por eso D-04 no se puede decidir sin N-20.

**Donde vive el arreglo:** `index.html` (seccion nueva de limites) + `docs/` y el workflow de deploy para N-20.

**Grupo de convergencia:** G5-HONESTIDAD (con N-11, N-12, N-20). Atado a N-20.

**Perfiles y criterio de aceptacion:**
- Adoptante nuevo: puede leer, antes de invertir, en que tipo de aplicacion el protocolo no funciona.
- Adoptante existente: no descubre el limite despues de haber migrado.
- Agente externo: encuentra el limite declarado como texto, no como ausencia.
- Auditor: `grep -c -i "does not cover"` sobre la portada devuelve mas de cero, y ningun enlace lleva al documento interno.

**Severidad:** bloquea. **Quien decide:** el dueno, frase por frase (ver D-04).

**CERRADO EN EL REPOSITORIO el 2026-10-26.** La seccion publica de limites esta escrita
y publicada en `index.html` (`nac_landing.section.limits`): ocho limites, cada uno con la
linea del SPEC o la medicion de donde salio, mas la frase que distingue protocolo, metodo
y herramienta. **El dueno la leyo frase por frase y la aprobo sin cambios** ese mismo dia
-- registro en `docs/LIMITS_APPROVAL_2026-10-26.md`, artefacto leido en el `.html` del
mismo nombre. Los ocho limites estan tambien **declarados en el manifest** (13 ids
nuevos), asi que un agente los encuentra como dato y no solo como prosa, que es el criterio
del perfil "agente externo". `grep -c -i "does not cover"` sobre `index.html` devuelve
**1** (el encabezado, texto visible). Gate: `node e2e/landing-limits-check.mjs`.
**Estado:** hecho y en cola -- pasa a verde en el servidor con la 2.5.0.

---

### N-10 `/nac-spec/` no esta en el sitemap

**Que esta mal:** el mapa del sitio invita a los rastreadores a todas partes menos al contrato.

**Evidencia del auditor (transcrita):** `https://yujin.app/sitemap.xml` lista siete URLs y no incluye la especificacion.

**Evidencia que reproduje (2026-10-24):** `curl -s https://yujin.app/sitemap.xml` devuelve **siete** entradas `<loc>` (raiz, yujin-forge, yuemail, nac3-kikoe, arquitectura-agentica, urazuke, casos-de-uso) y **cero** coincidencias de `nac-spec`. **Se reproduce.**

**Lo que falta para poder arreglarlo:** **el arreglo no vive en este repositorio.** Verificado: no hay `sitemap.xml` ni `robots.txt` en el repo (el patron `*.xml` devuelve cero archivos). El mapa pertenece al sitio raiz de yujin.app. Necesito que me digas donde vive ese repo, o esta entrada queda como pendiente externo con este criterio de aceptacion.

**Donde vive el arreglo:** FUERA DE ESTE REPO -- sitio raiz de yujin.app, `sitemap.xml`. Documentacion del `robots.txt` global: en este repo o donde vivan los docs.

**Grupo de convergencia:** G7-ALCANZABILIDAD (con N-13 por el lado de los enlaces, y N-19 por el de las traducciones).

**Perfiles y criterio de aceptacion:**
- Adoptante nuevo: llega a la especificacion buscandola.
- Agente externo: el rastreador que el `robots.txt` invita por nombre encuentra el contrato.
- Auditor: `curl sitemap.xml | grep -c nac-spec` devuelve mas de cero, y el `robots.txt` global permite el camino.

**Severidad:** avisa. **Quien decide:** el dueno indica el repo. **Estado:** abierto, **bloqueado por ubicacion**.

---

### N-11 Vigencia

**Que esta mal:** la portada presenta como presente evidencia de mayo, sin fecha de revision.

**Evidencia del auditor (transcrita):** paquete npm modificado 2026-05-25; portada con "PEER REVIEWS 2026-05", "EMPIRICAL BENCHMARK 2026-05", "CASE STUDY 2026-05", "MIGRATION PAPER 2026-05"; hoy es 2026-10-24.

**Evidencia que reproduje (2026-10-24):** `index.html` contiene `2026-05` en las lineas 945, 947, 949 y 910-912 segun el bloque; el registro npm devuelve `time.modified = 2026-05-25`. Cinco meses exactos. No hay ninguna linea de "ultima revision" en la portada. **Se reproduce.**

**Donde vive el arreglo:** `index.html` (fecha visible en cada bloque de evidencia + linea de ultima revision).

**Grupo de convergencia:** G5-HONESTIDAD.

**Perfiles y criterio de aceptacion:**
- Adoptante nuevo: sabe de cuando es lo que lee.
- Adoptante existente: distingue material vigente de material historico.
- Auditor: cada bloque de evidencia tiene fecha y la portada declara su fecha de revision.

**Severidad:** avisa. **Quien decide:** Forge propone; el dueno aporta si el proyecto esta en pausa o no. **Estado:** abierto.

---

### N-12 Las cifras de la portada no tienen recibo al lado

**Que esta mal:** las cifras se afirman sin fecha, version del runtime, modelos y comando en el mismo lugar donde se afirman.

**Evidencia del auditor (transcrita):** "95.5% NAC3 success", "0/200 silent damage (vs 30/200 in Raw)", "80-90% less LLM hallucination", "90% fewer tokens vs raw HTML", "3.5x fewer round-trips than MCP", "6 AIs say it's inevitable".

**Evidencia que reproduje (2026-10-24) -- parcial:**
- Las cifras existen y no tienen recibo al lado. Confirmado.
- Pero **los recibos si existen**, a un clic: `benchmark/results.html` declara fecha de ejecucion `2026-05-19`, nombra cinco modelos, y trae el comando exacto. El bundle `benchmark/nac3-benchmark-v2.3.tar.gz` esta en el repo.
- Lo que es peor y la auditoria no vio: **el bundle es v2.3 y el runtime publicado es 2.5.0-alpha.5.** O sea que las cifras se midieron dos versiones menores atras. Y la portada, linea 958, afirma `fully reproducible - bundle included`.
- El enlace existe (`benchmark/`), pero apunta a paginas que vuelven a afirmar, no al archivo de resultados con la salida.

**Conclusion:** el hallazgo se sostiene en su forma (falta el recibo en el lugar de la afirmacion) y cambia en su causa: lo que falta no es producir evidencia, es anclarla y actualizarla a la version vigente.

**Donde vive el arreglo:** `index.html` (recibo al lado de cada cifra) + regenerar el benchmark contra 2.5.0-alpha.5 o marcar las cifras con la version contra la que se midieron.

**Grupo de convergencia:** G5-HONESTIDAD. Atado a N-11 y a N-05 por la version.

**Perfiles y criterio de aceptacion:**
- Adoptante nuevo: puede llegar de la cifra al comando y a la salida en un clic.
- Adoptante existente: sabe contra que version se midio.
- Agente externo: no cita una cifra de una version que ya no es la publicada.
- Auditor: cada cifra tiene al lado fecha, version, modelos y comando; y la version declarada coincide con el `latest` resuelto en D-01.

**Severidad:** avisa. **Quien decide:** Forge ancla; el dueno decide si se re-mide o se marca como historica. **Estado:** abierto.

---

### N-13 "Open questions (tracked separately)" no dice donde

**Que esta mal:** una seccion remite a un lugar que no nombra.

**Evidencia del auditor (transcrita):** la seccion 13 se llama "Open questions (tracked separately)" y no dice donde.

**Evidencia que reproduje (2026-10-24):** `SPEC.md:1161` `## 13. Open questions (tracked separately)`. En el bloque siguiente no hay ningun enlace ni ruta: cero coincidencias de `http` entre el encabezado y la seccion 14. **Se reproduce.**

**Donde vive el arreglo:** `SPEC.md` seccion 13.

**Grupo de convergencia:** G3-DERIVA + G7-ALCANZABILIDAD (es la misma queja vista de dos lados: falta de direccion).

**Perfiles y criterio de aceptacion:**
- Adoptante nuevo: encuentra el registro de preguntas abiertas.
- Agente externo: la remision resuelve a un recurso existente.
- Auditor: la seccion 13 contiene una direccion que responde 200, o las preguntas estan en el documento.

**RESUELTO EN EL REPOSITORIO el 2026-10-24**, por la segunda rama del criterio: las preguntas estan **en el documento**. La seccion 13 se llama ahora "Open questions" (sin el "tracked separately" que no llevaba a ningun lado, porque no habia ningun otro registro) y dice en su primera linea que se rastrean **ahi**. Trae una tabla con cinco preguntas, cada una con su estado, la **version en que se evaluo por ultima vez** y donde esta parada. Y dos direcciones que responden 200, medidas: `rfcs/README.md` (donde una pregunta que se vuelve propuesta concreta recibe su RFC) y `CONTRIBUTING.md` (el proceso).

**Una regla escrita en la seccion, que es la leccion de N-05:** ninguna fila lleva version objetivo. Una promesa con fecha que pasa su fecha es peor que una sin fecha, que es exactamente el error que la seccion 5 cometia con `payload_schema`.

Las tres preguntas originales se resolvieron **leyendo el codigo**, no suponiendo: una quedo DECIDIDA con su candado localizado en los tests, dos quedan abiertas con su estado real medido. Y se sumaron dos que estaban vivas sin estar escritas en ninguna parte: la de `payload_schema` (N-26) y la de los codigos de `validate_global` (N-14). Detalle por fila en N-05.

**Severidad:** registra. **Quien decide:** Forge. **Estado:** **CERRADO en el repositorio**; visible en la web con el deploy de la 2.5.0.

---

### N-14 La garantia de estabilidad no es verificable

**Que esta mal:** dos promesas normativas sobre los codigos de hallazgo no se pueden comprobar porque el catalogo no esta publicado.

**Evidencia del auditor (transcrita):** la seccion 12 promete que los codigos no se reutilizan; la seccion 10 que son estables entre parches; nada de eso es verificable sin el catalogo.

**Evidencia que reproduje (2026-10-24):** `SPEC.md:1147` contiene la promesa de no reutilizacion de los codigos de `validate_global`. La seccion 10 empieza en la linea 1080 y declara estabilidad entre parches. El catalogo no existe publicado (N-04: 404) ni en el repo. **Se reproduce.**

**Donde vive el arreglo:** depende de D-02. Si D-02 = opcion A o C, el catalogo publicado; si D-02 = opcion B, hay que retirar las dos promesas de las secciones 10 y 12.

**Grupo de convergencia:** G2-CONTRATO-LEGIBLE. **No cierra sin N-04.**

**Perfiles y criterio de aceptacion:**
- Adoptante existente: puede comprobar que un codigo no cambio de significado entre dos versiones.
- Agente externo: compara el catalogo de dos versiones y no encuentra reutilizacion.
- Auditor: la promesa de la seccion 12 tiene un artefacto contra el que contrastarse.

**Severidad:** bloquea. **Quien decide:** el dueno, via D-02.

**Estado:** **PARCIAL** el 2026-10-24. El catalogo existe y esta publicado (N-04 cerrado): 24 codigos con severidad, cada uno con su significado y su arreglo. Comparar dos versiones publicadas y detectar un codigo reusado ya es posible, que es lo que la promesa 4 de la seccion 12 necesitaba.

**Y hay una correccion que me hago a mi mismo, porque la medi mal en el primer pase.** Dije que los codigos "no existen". Lo preciso es: **existen 24 codigos con severidad, y ninguno de ellos esta en el validador que la seccion 12 nombra.** `validate(plugin_slug)` -- el validador por plugin -- emite 16 codigos con severidad explicita, el validador estricto de registro emite otros 3, y hay 5 codigos de error lanzado. Pero `validate_global()`, que es el que la promesa cita textualmente, devuelve **5 baldes de objetos sin un solo campo `code`**. Asi que la promesa de la seccion 12 sigue cubriendo un conjunto vacio: no por falta de catalogo, sino porque apunta al unico validador que no participa de el.

**Lo que falta, acotado:** darle codigos del catalogo a los 5 baldes de `validate_global` (duplicados, huerfanos, no montados, violaciones de convencion, violaciones de instancia de plugin). Eso toca `js/nac.js`, y tocar el runtime obliga a subir la version porque la compuerta de integridad se niega a que la copia congelada difiera del fuente. **Entra en el tren de la 2.5.0 (PND-032), no antes.** Mientras tanto el artefacto publicado declara los 5 baldes como "sin codigo" en vez de inventarles uno: el dato dice la verdad sobre su propio agujero.

**Grupo:** G2-CONTRATO-LEGIBLE. Ya no esta bloqueado por N-04.

**CERRADO EN EL REPOSITORIO el 2026-10-26, y la premisa estaba corrida en uno.**
Antes de escribir una linea fui a leer los cinco baldes: **`plugin_instance_violations`
YA llevaba codigo** (`duplicate_plugin_no_instance_id`, que ademas esta entre los 24
publicados y cuyo `emitted_by` nombra a `_scanPluginInstances`), y **el mismo artefacto
publicado lo declaraba dos claves mas abajo con `code: null`**. O sea que el artefacto
afirmaba las dos cosas a la vez sobre la misma condicion: no mentia por exceso, mentia
por defecto, subdeclarando lo que el runtime ya hacia. **Causa raiz, de la familia que
este proyecto ya conoce:** el extractor corria `validate_global()` sobre un documento
vacio -- sin hallazgos no hay un solo item que mirar -- asi que sacaba los NOMBRES de los
baldes de las claves del resultado y el generador escribia `code: null` a mano. Un
generador que compone lo que deberia leer no es un generador, es una segunda opinion.

**Lo entregado, las dos mitades juntas (si va una sola, la asimetria la creo yo):**
1. **Runtime:** los cuatro baldes que de verdad no llevaban codigo ahora llevan `code` +
   `severity`, con la severidad que el catalogo ya publicaba para no cambiar de opinion
   sobre la gravedad: `nac_id_duplicate_across_plugins` (error),
   `nac_id_orphan_in_dom` (warn), `nac_id_declared_not_mounted` (warn),
   `nac_id_missing_plugin_prefix` (warn). Ninguno reusa un codigo existente (promesa 4).
2. **Generador:** `readGlobalBuckets()` LEE el codigo y la severidad de items que un
   fixture provoca a proposito (`scripts/fixture-dom.mjs`), y **se niega** si un balde no
   se provoca, si los items de un balde no coinciden en el codigo, si un item no trae
   codigo, o si la severidad que adjunta el runtime no coincide con la que un humano
   reviso en el sidecar. `uncoded_findings` queda vacio y se conserva por compatibilidad
   de schema; los datos pasan a `global_buckets`.
3. **Candados:** `scripts/test-validate-global.mjs` (33 casos, 9 de ellos en rojo con el
   defecto plantado EN MEMORIA, nunca en disco) y tres casos rojos nuevos en
   `scripts/test-contract-api.mjs` (36 pasan): balde sin codigo, fixture que deja de
   provocar, y severidad que discrepa de la revisada.
4. **SPEC:** la seccion 10.1 documenta la forma real y la promesa 4 dice donde viven los
   codigos; la pregunta abierta de la seccion 13 pasa a DECIDIDA.

**Lo que armar ese fixture encontro, y vale mas que el arreglo: N-33.** Cuatro de los
cinco baldes salian vacios contra un manifest invalido a proposito. No era el fixture.

**Estado:** hecho en el repositorio; el artefacto publicado lo dira cuando la 2.5.0 se
regenere (el salto de version es lo que destraba la cadena del contrato).

---

### N-15 El enlace a Urazuke es de ida sin vuelta

**Que esta mal:** la portada de NAC3 no enlaza a Urazuke, cuya portada si enlaza a NAC3, y nada separa las tres cosas de naturaleza distinta.

**Evidencia del auditor (transcrita):** la portada enlaza yujin.app, yujin-forge y rpaforce.com, y no enlaza Urazuke.

**Evidencia que reproduje (2026-10-24):** sobre la portada publicada, `findstr /I "urazuke"` devuelve **0** lineas; `yujin-forge` y `rpaforce` aparecen. **Se reproduce.**

**Donde vive el arreglo:** `index.html` (enlace en el pie + una frase que distinga protocolo, metodo y herramienta).

**Grupo de convergencia:** G6-ECOSISTEMA (con N-16).

**Perfiles y criterio de aceptacion:**
- Adoptante nuevo: entiende que NAC3 es un protocolo y no un producto.
- Agente externo: no mete las tres cosas en la misma bolsa al resumir el sitio.
- Auditor: `grep -c -i "urazuke"` sobre la portada devuelve mas de cero, y la frase distingue las tres naturalezas.

**Severidad:** registra. **Quien decide:** Forge propone la frase; el dueno aprueba.

**CERRADO EN EL REPOSITORIO el 2026-10-26.** Dos arreglos, no uno: la frase que distingue
las tres naturalezas vive en la seccion de limites, y el enlace de vuelta tambien esta
**en el pie**, donde la entrada lo pedia (`nac_landing.footer.urazuke` ->
`https://yujin.app/urazuke/`, declarado en el manifest como cualquier otro enlace del pie).
`grep -c -i "urazuke"` sobre `index.html` devuelve mas de cero. Frase aprobada por el dueno
el 2026-10-26 (`docs/LIMITS_APPROVAL_2026-10-26.md`). **Estado:** hecho y en cola.

---

### N-16 Las licencias son distintas y no se declaran juntas

**Que esta mal:** falta la licencia de Urazuke y la frase que separa proyectos, licencias y decisiones.

**Evidencia del auditor (transcrita):** NAC3 es Apache-2.0 y Urazuke es CC BY-SA 4.0, y "en ningun lado se dice".

**Evidencia que reproduje (2026-10-24) -- parcial:** la mitad de NAC3 **no** se sostiene: la portada declara Apache-2.0 en las lineas 1349, 1500 y 1501, y el `LICENSE` del repo es Apache-2.0. Lo que si falta es la licencia de Urazuke y la distincion. **Se reproduce solo la mitad.** Dato adicional que refuerza la entrada: el paquete publicado lleva una cabecera de licencia **MIT** en `dist/nac.mjs` mientras su metadata dice Apache-2.0 (ver N-17, ya registrado como PRE-3).

**Donde vive el arreglo:** `index.html` (una linea junto al enlace de N-15). La declaracion del lado de Urazuke vive en el otro repositorio.

**Grupo de convergencia:** G6-ECOSISTEMA. Atado a N-15 y a N-17.

**Perfiles y criterio de aceptacion:**
- Adoptante nuevo: sabe bajo que licencia esta cada cosa antes de reutilizar.
- Auditor de seguridad: la licencia declarada coincide en las cuatro fuentes (repo, portada, metadata npm, cabecera del artefacto).
- Auditor: las dos portadas declaran las dos licencias, y la cabecera del paquete coincide con su metadata.

**Severidad:** registra. **Quien decide:** Forge.

**CERRADO EN EL REPOSITORIO el 2026-10-26, la mitad que vive en este repo.** Las dos
licencias se declaran juntas en la seccion de limites: NAC3 protocolo Apache-2.0, Urazuke
metodo Creative Commons BY-SA 4.0, Forge herramienta comercial que implementa los dos. El
pie repite la de Urazuke al lado del enlace. **Verificado en vivo el 2026-10-26, no
recordado:** `https://yujin.app/urazuke/` responde 200 y su propia portada declara
"Creative Commons BY-SA 4.0". La cuarta fuente del criterio del auditor de seguridad -- la
cabecera del artefacto publicado, que dice MIT -- **es N-17 y se arregla en la regeneracion
del salto de version**, no aca. **Estado:** hecho y en cola; la coincidencia de las cuatro
fuentes se verifica recien con la 2.5.0 publicada.

---

### N-17 (nuevo) El tarball publicado sirve el SPEC de la version anterior y una cabecera de licencia que contradice la metadata

**Que esta mal:** el paquete que hoy se instala declara por dentro una version y una licencia distintas de las que promete por fuera.

**Evidencia que reproduje (2026-10-24), descargando el artefacto publicado:**
- `npm view @nac3/runtime@2.5.0-alpha.5` devuelve `license: Apache-2.0`.
- Descomprimido el tarball, `package/SPEC.md:3` declara `**Version:** 2.5.0-alpha.4` -- una version anterior a la del paquete que lo contiene. El SPEC empaquetado tiene 1.442 lineas contra 1.620 del canonico del repo.
- `package/dist/nac.mjs:6` dice `MIT License -- Pablo Adrian Kuschniroff + Sumi, 2026`.

**Relacion con lo ya registrado:** esto **ya esta** en el registro interno como **PRE-3**, detectado en la estacion N0 y propuesto ahi como proyecto previo con su criterio de aceptacion (prerrequisito verificado en verde). Esta entrada **no lo duplica**: lo trae al backlog de la auditoria como el hallazgo que la auditoria no vio, y lo ata a N-01 y N-16.

**Donde vive el arreglo:** procedimiento de publicacion (regenerar el SPEC y sincronizar la cabecera antes de empaquetar) + un paso de CI que compare el tarball contra el repo.

**Grupo de convergencia:** G1-DISTRIBUCION. **Bloquea el cierre de N-01**: mientras el tarball sirva el SPEC anterior, ninguna de las dos opciones de D-01 entrega lo que promete.

**Perfiles y criterio de aceptacion:**
- Adoptante nuevo: lo que instala declara la misma version y la misma licencia en las cuatro fuentes.
- Adoptante existente: puede confiar en que el SPEC que lee es el de su version.
- Agente externo: la version del SPEC empaquetado coincide con la version del paquete.
- Auditor de seguridad: cabecera del artefacto, metadata y `LICENSE` coinciden.
- Auditor: descomprimir el tarball publicado y comparar `SPEC.md` contra el del repo da cero diferencias.

**Severidad:** bloquea. **Quien decide:** Forge arregla; el dueno aprueba la republicacion (prod es destino unico).

**PARCIALMENTE CERRADO el 2026-10-24 (commit `b490968`, run de deploy 40115680057 success).** La causa raiz esta arreglada y con candado; lo que queda es republicar.

Lo que se encontro al buscar la causa, y que es mas grande que el hallazgo: **la version estaba escrita a mano en 13 lugares**. El repositorio ya estaba sano en SPEC y en licencia (los commits del 2026-06-29 lo habian corregido *despues* de publicar); lo que seguia roto era el **generador**, que llevaba sus propios literales -- dos en las cabeceras `.d.ts` y tres en el banner del CLI. Por eso cada publicacion podia volver a derivar.

Y una falla latente que nadie habia visto: **el chequeo de humo del deploy tenia `js/2.5.0-alpha.5/nac.js` escrito a mano, dos veces.** Tal como estaba el repositorio, subir el numero a 2.5.0 habria **fallado el deploy** sobre un arbol correcto, porque el workflow afirmaba la presencia de la version ANTERIOR. Se arreglo: ahora lee `immutable_path` de `js/integrity.json`.

Lo entregado:
- `runtime/build.mjs` lee `version:` / `spec_version:` de `js/nac.js` -- la misma constante que `scripts/build-integrity.mjs` ya trataba como normativa -- y se niega a emitir artefactos si no puede leerla. El CLI reporta `2.5.0-alpha.5` / spec `v2.5` en lugar de `2.3.0-alpha.2` / `v2.3`, que es el tercer bullet de N-18.
- `scripts/check-version-coherence.mjs`: candado nuevo. Contrasta 15 casillas contra `js/nac.js` y sale distinto de cero ante cualquier desacuerdo, clasificando cada una como DERIVED (regenerala), DECLARED (editala) o GENERATOR (el generador no debe llevar literal alguno). Cableado al workflow de deploy y al `prepublishOnly` de `runtime/`, asi que el registro npm ya no puede recibir un paquete que se declare mal.
- `runtime/test/smoke.mjs` afirmaba que el CLI imprimia `2.3.0-alpha.2`. **Estaba verde porque coincidia con el bug.** Un test que lleva escrito el valor que verifica no es un candado, es un segundo escondite. Ahora deriva de `package.json`.

Verificacion (no alcanza con que este verde):
- Las dos compuertas verdes en el arbol actual, y **verificadas en el CI real**: el log del run 40115680057 dice `All 15 version slots agree on 2.5.0-alpha.5` y `Immutable path under test: js/2.5.0-alpha.5/nac.js`.
- **Ensayo en seco del salto real a 2.5.0**: el candado se pone ROJO en 12 casillas, cada una con su instruccion. Revertido; el salto no esta en ese commit.
- El ensayo delato un agujero del propio candado: la sonda del changelog pasaba por `includes("2.5.0")`, que matchea el encabezado `2.5.0-alpha.5`. Ahora exige un encabezado `## <version>` como token completo.
- `npm test` de `runtime/`: 15 suites verdes.
- Se probo que la afirmacion corregida del smoke se pone roja inyectando la version vieja en el CLI generado.

**Lo que FALTA para cerrarlo del todo:** republicar. El criterio de aceptacion del auditor -- descomprimir el tarball publicado y comparar su `SPEC.md` contra el del repo da cero diferencias -- solo se puede comprobar contra un paquete nuevo. Se cumple con la 2.5.0 estable de D-01 opcion C.

**Estado:** causa raiz CERRADA y con candado; cierre definitivo pendiente de la republicacion.

---

### N-18 (nuevo) `npx nac3 validate <url>` no valida una URL y nunca reporta un nivel

**Que esta mal:** el comando que el propio bloque de verificacion del pedido usa para comprobar el resultado no puede hacer lo que se le pide.

**Evidencia que reproduje (2026-10-24):**
- `node runtime/dist/cli.js validate https://yujin.app/nac-spec/demo/` aborta con codigo de salida **2** y un mensaje que dice que la validacion de URL requiere Playwright y hay que reintentar.
- `node runtime/dist/cli.js validate scripts` (modo directorio) corre e imprime hallazgos y `Total findings: 0`, **sin nivel de conformidad en ningun caso**.
- `node runtime/dist/cli.js --version` reporta `2.3.0-alpha.2` / `Native Agent Contract v2.3`, mientras el paquete publicado es 2.5.0-alpha.5.

**Por que importa:** el punto 8 de la verificacion del dueno pide `npx nac3 validate <una pagina de demo>` y "reporta nivel, con su salida pegada". Hoy ese criterio **no se puede cumplir**. Ademas N-04 y N-14 no tendrian como comprobarse. Y la deriva de version del propio CLI es la misma familia que N-05.

**Donde vive el arreglo:** `runtime/src/cli` (implementar el modo URL o declarar que no existe) + el reporte de nivel + la version del CLI derivada del paquete.

**Grupo de convergencia:** G2-CONTRATO-LEGIBLE. **Bloquea el cierre de N-04, N-14 y del propio bloque de verificacion.**

**Perfiles y criterio de aceptacion:**
- Adoptante nuevo: `npx nac3 validate <url>` corre y reporta el nivel declarado.
- Adoptante existente: el CLI reporta la misma version que el paquete que lo contiene.
- Agente externo: obtiene un nivel de conformidad con un identificador no ambiguo (N-06).
- Auditor: el comando del punto 8 del bloque de verificacion corre y su salida esta pegada.

**Severidad:** bloquea. **Quien decide:** Forge propone el alcance (implementar el modo URL o corregir el pedido); el dueno aprueba.

**AVANCE PARCIAL el 2026-10-24 (commit `b490968`).** De los tres sintomas, **uno esta cerrado**: la deriva de version del propio CLI. Reportaba `2.3.0-alpha.2` / `Native Agent Contract v2.3`; ahora reporta `2.5.0-alpha.5` / `v2.5`, derivado de la constante autoritativa en lugar de escrito a mano (ver N-17). El criterio de aceptacion "el CLI reporta la misma version que el paquete que lo contiene" esta **cumplido y con test**, y el test se probo en rojo.

**Siguen abiertos los dos sintomas de fondo**, que son los que bloquean N-04, N-14 y el punto 8 del bloque de verificacion:
1. `validate <url>` aborta con salida 2 (requiere Playwright y no lo declara como opcional).
2. Ningun modo reporta un **nivel de conformidad**.

Ninguno de los dos es un arreglo de una linea: el punto 2 necesita que exista una definicion comprobable de "nivel", y eso es justamente lo que **D-02** decide. Hacerlo antes de D-02 seria inventar el criterio.

**CERRADO el 2026-10-26.** Los dos sintomas de fondo estan resueltos y el criterio de
aceptacion del punto 8 se puede cumplir.

- **Modo URL.** `nac validate <url>` carga la pagina en un Chromium real, espera a que el
  registro de manifests **deje de moverse** (no un sleep fijo, que mide el humor de la
  maquina), y lee de la pagina lo que el runtime dice de si mismo. Playwright es
  **opcional y se resuelve en tiempo de llamada**: no entra como dependencia de
  `@nac3/runtime`, porque meter un navegador en el `node_modules` de cada adoptante para
  ofrecer una herramienta que la mayoria no corre es cobrarles por algo que no piden. Si
  falta, el CLI sale con codigo 3 y dice la linea exacta para instalarlo.
- **Reporte de nivel.** Reporta contra los identificadores publicados en `levels.json`,
  con la regla publicada: un nivel solo se afirma cuando **todos** los requisitos
  `machine_checkable` de ese nivel y de los inferiores pasan; los que ninguna herramienta
  decide salen **unverified**, nunca asumidos. Tres veredictos y la diferencia entre los
  dos ultimos es todo el punto: `pass` medido y se cumple, `fail` medido y no se cumple,
  `unverified` **no medido**.
- **Y la cobertura viaja con el nivel.** La regla publicada, sola, permite decir "nivel 1"
  sin decir que tres de sus cuatro requisitos no se midieron -- y, peor, marcar un
  requisito como no decidible lo **saca** del gate, asi que cuanto mas honesto es el
  sidecar mas laxo seria el reporte. Por eso `levels.json` publica desde 2.5.0
  `reporting.must_report_coverage` y el CLI imprime "asserted on N of M requirements" al
  lado de todo nivel que reporta, mas la frase de que es una **medicion y no un
  certificado**.
- **`--drive`.** Los dos requisitos conductuales del nivel 1 no se deciden leyendo: hay
  que hacer click. El validador lo hace **solo si se lo pide**, porque clickear todos los
  controles de la pagina de produccion de alguien no es una operacion de lectura y no
  puede ser el default.
- **De donde salen las definiciones de nivel.** De `SPEC.md` seccion 8, a traves de
  `scripts/spec-levels.mjs` -- **el mismo modulo** que genera
  `api/v/<version>/levels.json`. El CLI no lleva copia propia de la seccion 8: un
  validador que reporta contra su copia privada del spec certifica contra un documento
  que nadie esta leyendo, que es N-17 con mucho peor radio.
- **Simetria productor/consumidor sobre los decididores.** Cada requisito publica el
  `decider` que lo juzga. `runtime/build.mjs` se niega a emitir un CLI si un requisito
  declarado `machine_checkable` nombra un decididor que el CLI no implementa, si nombra
  ninguno, o si el CLI implementa uno que ningun requisito nombra.
- **Donde vive ahora.** El CLI dejo de ser un template literal dentro del generador y es
  codigo real en `runtime/src/cli.mjs` + `runtime/src/cli-url.mjs`; el build solo
  sustituye la version. `scripts/check-version-coherence.mjs` extendio el candado de
  N-17 a esos dos archivos, asi que el hardcodeo no puede mudarse un directorio.

**Medido el 2026-10-26, antes y despues:**

| | antes | despues |
|---|---|---|
| `validate <url>` | aborta, salida 2 | corre y reporta |
| nivel en modo URL | nunca | `nac3-conformance-level-N` o "NONE ASSERTED" con el requisito que lo bloquea |
| nivel en modo directorio | nunca, y sin decirlo | "NOT DECIDABLE IN THIS MODE", con el motivo |
| slots de version coherentes | 16 | 18 |

**Candado:** `scripts/test-cli-levels.mjs`, 29 casos en cuatro grupos (REPORTS / REFUSES /
HONEST / BUILD). **Probado en rojo contra el CLI anterior: 29 de 34 casos caen y solo
quedan verdes los 5 del grupo BUILD, que prueban el build y no el binario.** Dos cosas
que ese rojo delato y estan arregladas: la suite se **estrellaba** en la primera llamada
en vez de fallar un caso -- el mismo defecto de los dos candados anteriores -- y dos
casos daban verde **sobre una lista vacia de veredictos**, es decir justo sobre la
regresion que existen para atrapar. Ademas se probo que el gate de simetria de
decididores es lo que refuta el caso: con el gate, salida 1; sin el, la misma rotura pasa
con salida 0.

**Hallazgos que salio de construirlo, y ninguno salio de leer:** N-35 (`probe` normativo y
sin lector), N-36 (el nivel 3 pide una firma de manifest que el runtime no sabe hacer),
N-37 (el nivel 2 exige la forma de manifest heredada), N-38 (el nivel 1 pide un evento que
un enlace no puede emitir) y N-39 (seis acciones de la portada que nunca confirman). Es
la octava vez que una capa de verificacion encuentra lo que cinco meses de lectura no
habian encontrado.

**Estado:** CERRADO el 2026-10-26.

---

### N-19 (nuevo) Las nueve traducciones publicadas son parciales

**Que esta mal:** la especificacion se publica en diez idiomas y nueve de esas versiones tienen entre el 30% y el 38% del contenido del canonico, sin que nada lo diga.

**Evidencia que reproduje (2026-10-24), conteo de lineas:**

| archivo | lineas | % del canonico |
|---|---|---|
| `SPEC.md` (canonico, en) | 1.620 | 100% |
| `i18n/pt/SPEC.md` | 621 | 38% |
| `i18n/de/SPEC.md` | 616 | 38% |
| `i18n/es/SPEC.md` | 615 | 38% |
| `i18n/it/SPEC.md` | 611 | 38% |
| `i18n/fr/SPEC.md` | 603 | 37% |
| `i18n/hi/SPEC.md` | 513 | 32% |
| `i18n/zh/SPEC.md` | 482 | 30% |
| `i18n/ar/SPEC.md` | 480 | 30% |
| `i18n/ja/SPEC.md` | 480 | 30% |

Se verifica ademas por estructura: en el canonico la seccion 8 esta en la linea 1.026 y la 12 en la 1.147; en `i18n/es/SPEC.md` la seccion 8 esta en la 423 y la 12 en la 533. La diferencia no es de traduccion, es de contenido ausente.

**Por que importa:** un adoptante que lee la version en su idioma lee una especificacion incompleta y no tiene como saberlo. La portada no las enlaza, asi que hoy el dano esta contenido por accidente, no por diseno.

**Donde vive el arreglo:** `i18n/<locale>/SPEC.md` (completar) + una cabecera de estado por archivo (parcial, de que version) + `index.html` si el dueno elige la opcion C de D-03.

**Grupo de convergencia:** G4-IDIOMAS. Es el hallazgo real detras de N-08.

**Perfiles y criterio de aceptacion:**
- Adoptante nuevo: si lee una traduccion, sabe que es parcial y de que version.
- Adoptante existente: no toma una traduccion parcial como texto normativo.
- Agente externo: no cita una clausula ausente en la traduccion como si no existiera.
- Auditor: cada traduccion publicada declara su estado y su version, y ningun enlace de la portada la presenta como completa.

**Severidad:** avisa. **Quien decide:** el dueno, via D-03. **Estado:** abierto.

---

### N-20 (nuevo) No hay frontera entre material interno y publico, y hay interno ya publicado

**Que esta mal:** el deploy publica el arbol entero del repositorio, asi que cualquier documento interno queda en la web, y varios ya estan.

**Evidencia que reproduje (2026-10-24):**
- El workflow de deploy hace `rsync` del arbol completo a `public_html/yujin.app/nac-spec/`, con una lista corta de exclusiones (`.git`, `.github`, `node_modules`, `IMPLEMENTATION_GUIDE.md`, `NPM_PUBLISH_RUNBOOK.md`, `PERFORMANCE_TEST_PLAN.md`, `PROJECT.md`, `PROMO_WEEK_*.md`, `PENDING_*.md`). Todo lo demas se publica.
- Consecuencia medida: el documento interno de cobertura responde **200** en la web publica. Tambien `docs/V2.5_STATUS.md` (200), `rfcs/README.md` (200) y `conduit/CONDUIT_PENDING.md` (200).
- Control que confirma la causa: `docs/PENDING_2026_05_26.md` responde 404, y coincide exactamente con la exclusion `PENDING_*.md`. O sea que lo que no esta publicado es solo lo que la lista de exclusiones tapa por nombre.
- `docs/PENDING.md` responde 404 hoy solo porque `PENDING_*.md` lo cubre por patron, no porque exista una politica.

**Por que importa:** el pedido de la auditoria dice "no publiques ese documento ni lo enlaces: es interno y asi tiene que quedar", y ese documento ya esta publicado. Cualquier decision sobre N-09 tiene que pasar por aca primero. Es ademas un problema de seguridad: lo que hoy esta expuesto incluye material de decision, pendientes y reportes internos.

**Donde vive el arreglo:** `.github/workflows/deploy.yml` (lista de inclusion en vez de lista de exclusion) + un archivo de politica que declare que es publico y que no + mover el material interno fuera del alcance.

**Grupo de convergencia:** G5-HONESTIDAD. **Bloquea N-09.** Atado a N-10 (que se publica y como se descubre).

**Perfiles y criterio de aceptacion:**
- Adoptante nuevo: solo ve material destinado al publico.
- Auditor de seguridad: puede enumerar que es publico y verificarlo contra la politica, sin depender de una lista de nombres.
- Auditor: ningun documento marcado interno responde 200; lo que responde 200 coincide con la politica declarada.

**Agravante medido el 2026-10-24 a las 17:00 UTC, despues de destrabar N-21:** mientras el pipeline estuvo muerto, la exposicion estaba congelada en el arbol de junio. Al revivir, el primer deploy verde publico tambien los documentos de la estacion N0 que se habian escrito con el pipeline caido. Verificado en vivo: `docs/ELIGIBILITY.md` responde **200** y `docs/EVIDENCE_N0.md` responde **200**. Ninguno de los dos estaba pensado para la web. El backlog de auditoria sigue en 404, pero solo porque su nombre matchea `PENDING_*.md`, que es lo que esta entrada denuncia: una lista de nombres no es una politica. Este hallazgo sube de prioridad: cada deploy verde que hagamos desde ahora publica lo que haya en `docs/`.

**Severidad:** bloquea. **Quien decide:** Forge propone la politica; el dueno la aprueba.

**CERRADO el 2026-10-24 -- el dueno ACEPTA la exposicion.** Textual: *"con respecto a la publicacion de docs internos, no tengo problemas, no vendo perfeccion, sino trabajo y evolucion"*.

Esta entrada declaraba, ademas de una incoherencia, **un problema de seguridad**. Para eso la palabra del dueno no alcanza: se verifico antes de aceptar la decision. Barrido de credenciales sobre todo el arbol publicable buscando claves privadas PEM, tokens npm / GitHub / Anthropic y claves AWS. **Resultado: cero valores de credencial.** Los unicos matches son *nombres* de secretos, en `.github/workflows/deploy.yml` (que el rsync excluye) y en la prosa de este mismo documento. Lo que esta expuesto es trabajo en curso, que es exactamente lo que el dueno acepta exponer.

Lo que esta entrada reclamaba con razon -- *una lista de nombres no es una politica* -- queda resuelto por la via contraria a la propuesta. En lugar de una lista de inclusion, la **politica declarada** es:

> Todo lo que esta en el repositorio es publico. En el repositorio no hay secretos.

Es una frase, y es verificable con el barrido de arriba: mas de lo que habia antes, que era una lista de nueve nombres sin criterio.

**Queda registrada una inconsistencia menor, a sabiendas:** la exclusion `PENDING_*.md` sigue en `deploy.yml`, asi que este backlog responde 404 por accidente de nombre y no por politica. Bajo la politica nueva esa exclusion no tiene sentido, pero sacarla no se pidio y no se toco.

**Efecto:** **D-04 queda desbloqueado** -- era lo unico que esta entrada condicionaba.

**Estado:** **CERRADO** (rechazado por decision del dueno, con la verificacion de seguridad hecha). Registro: PND-029.

---

### N-23 (nuevo) El runtime acepta tres roles que la tabla normativa no lista

**Que esta mal:** la seccion 1 publica una tabla de 17 roles canonicos y cierra con "los roles fuera de esta lista estan reservados para uso futuro", y la seccion 1 tambien dice que un runtime estricto DEBERIA rechazar roles desconocidos al registrar. El runtime acepta 20.

**Como aparecio:** no lo busque. **Lo delato el primer contrato generado.** Al pedirle al runtime su set de roles y comparar contra la tabla del documento, la diferencia salio sola. Es el primer dividendo del artefacto de D-02: una incoherencia que cinco meses de lectura del SPEC no habian encontrado aparecio el dia uno de tener el contrato como dato.

**Evidencia que medi (2026-10-24):** el set de roles del runtime tiene 20 entradas; la tabla de la seccion 1 tiene 17. Los tres que sobran: `draggable`, `drop-target` (primitivas de arrastrar y soltar) y `button` (tolerado para botones heredados que solo necesitan ser clicables). Los tres estan en el runtime con comentario propio, asi que no son un accidente: son deliberados y **no se declararon en el documento**.

**Por que importa:** un adoptante que lee la tabla y marca un elemento como `draggable` esta usando un rol que el documento llama reservado. Un agente externo que valide contra la tabla reporta un error donde no hay ninguno. Y al reves: si manana el runtime estricto empieza a rechazar roles no listados, rompe las paginas que usan los tres.

**Donde vive el arreglo:** `SPEC.md` seccion 1 -- agregar las tres filas, o declarar explicitamente que hay un set extendido no normativo. Es una decision de redaccion sobre una tabla normativa, asi que la propongo y la aprueba el dueno.

**Mientras no se arregle:** el contrato publicado **no elige por su cuenta**. Publica los 20 como aceptados y marca cada uno con `declared_in_spec_table: true|false`, asi que el dato dice exactamente donde esta la discrepancia en vez de taparla con cualquiera de las dos listas.

**Grupo de convergencia:** G3-DERIVA (misma familia que N-05, N-06, N-07: el documento y el codigo no dicen lo mismo).

**Perfiles y criterio de aceptacion:**
- Adoptante nuevo: la tabla que lee incluye todo rol que el runtime acepta, o dice donde esta el resto.
- Agente externo: no reporta un error contra un rol que el runtime acepta.
- Auditor: el contrato publicado no tiene ningun rol con `declared_in_spec_table: false`.

**RESUELTO EN EL REPOSITORIO el 2026-10-24, A FALTA DE TU APROBACION DE LA REDACCION.** La tabla normativa de la seccion 1 pasa de 17 a 20 filas. Las tres que faltaban, descritas por lo que el runtime hace con ellas y no por lo que uno querria que fueran:

- `draggable` -- un elemento que el usuario puede levantar y mover (since 1.6.2).
- `drop-target` -- un lugar donde se puede soltar un `draggable` (since 1.6.2).
- `button` -- **tolerado, no recomendado**: un boton heredado que solo necesita ser clickeable, sin contrato de accion. El runtime lo trata como `action`. Se recomienda `action` con su `data-nac-action` explicito.

Esa ultima fila es la que mas importa que este escrita: el runtime la acepta desde siempre y el documento no la nombraba, asi que un adoptante que la usaba estaba fuera de la tabla normativa sin saberlo, y uno que leia la tabla no sabia que existia una salida para su codigo heredado.

**Y se agrega la frase que hace que esto no vuelva a derivar:** la tabla declara que la lista tambien se publica como dato en `api/latest/contract.json`, donde cada rol lleva `declared_in_spec_table`, de modo que una divergencia futura entre documento e implementacion queda **visible en una bandera** en vez de escondida en una diferencia de opinion. Hoy las dos listas coinciden.

**Severidad:** avisa. **Quien decide:** Forge propone la redaccion; el dueno aprueba. **Estado:** **escrito en el repositorio, esperando tu lectura de las tres filas.** Viaja con el salto de version porque cambia `contract.json`.

---

### N-24 (nuevo) El indice publicado declara tres testigos de su cabeza y el tercero no existe

**Que esta mal:** `api/index.json` publica, en su propio texto de politica, que la cabeza de la cadena *"esta registrada tambien en la historia de git de este repositorio y en el tarball de npm publicado: tres testigos independientes"*, y recomienda al consumidor comparar la cabeza contra los tres antes de confiar. El tercero todavia no existe.

**Como aparecio:** tampoco lo busque. **Lo delato construir la capa 4.** Al escribir de donde saca el verificador su testigo independiente hubo que contestar donde vive cada uno, y ahi el tercero se quedo sin direccion.

**Evidencia que medi (2026-10-24):** `chain_head` aparece unicamente en `api/index.json`, `api/latest.json` y los tres programas que lo manejan. No esta en `runtime/`, ni en `runtime/package.json` (`files` lista `dist/`, `README.md`, `LICENSE`, `SPEC.md`, `CHANGELOG.md`), ni puede estar en el tarball publicado: `@nac3/runtime` 2.5.0-alpha.5 se publico antes de que la API existiera.

**Por que importa:** es exactamente la familia de hallazgos que esta auditoria vino a corregir -- una promesa publicada que no se puede cumplir. Un auditor que siga la instruccion al pie de la letra busca un testigo que no esta y no tiene como saber si falta porque nadie lo puso o porque alguien lo saco. Y de los dos testigos reales, uno es el repositorio: comprometerlo mueve la cabeza y su testigo a la vez. Por eso la firma offline es la que sostiene ese caso hoy, no el tercer testigo.

**Donde vive el arreglo:** un artefacto generado dentro de `runtime/`, incluido en `files` del paquete, escrito por `build-contract-api.mjs --write` y verificado por la compuerta, de modo que el tarball de la 2.5.0 lleve la cabeza y la deriva sea imposible. Entra con el tren de la 2.5.0 (PND-032).

**Por que no se arreglo en el acto:** el texto esta dentro de `api/index.json`. Corregirlo obliga a regenerar el indice, y regenerarlo reescribe la entrada de una version **ya publicada** -- precisamente lo que el metodo prohibe. Se corrige cuando el indice se mueva por un motivo legitimo, que es la proxima release. Mientras tanto queda escrito aca y en `docs/CONTRACT_API_SIGNING.md`: **los testigos efectivos son dos.**

**Grupo de convergencia:** G1-DISTRIBUCION (la cabeza viaja con el paquete) y G5-HONESTIDAD (una promesa publicada que todavia no se cumple).

**Perfiles y criterio de aceptacion:**
- Adoptante nuevo: no se entera; no cambia nada de lo que usa.
- Agente externo: encuentra los tres testigos en las tres direcciones que el indice declara.
- Auditor: `npm pack` del runtime contiene la cabeza, y coincide con la del host y la del repositorio.

**Severidad:** avisa. **Quien decide:** Forge; es mecanico. **Estado:** abierto, anotado en PND-032.

---

### N-25 (nuevo, CERRADO el mismo dia) La huella publicada mandaba compararse contra un registro que no existia

**Que esta mal:** `api/trust.json` publicaba, en su propio texto de politica, que un lector debe comparar la huella de la clave activa *"contra este repositorio (git) y contra la huella registrada en la documentacion de release"* antes de confiar en una firma. Y `docs/CONTRACT_API_SIGNING.md` le decia a un tercero que corriera el verificador con `--expect-head <cabeza publicada en las notas del release>` y `--expect-key <huella publicada en las notas del release>`. Esas notas no tenian ningun valor escrito: la huella existia unicamente en `api/trust.json`, es decir en el archivo que sirve el host que uno esta auditando.

**Como aparecio:** lo delato escribir el paso a paso para el dueno. Al redactar "anota la huella en un lugar fuera de la maquina" hubo que contestar donde la anota el proyecto, y la respuesta era: en ningun lado.

**Evidencia que medi (2026-10-24):** `grep` de la huella `sha384-joOCEsjN728D...` sobre todo el arbol, excluyendo `.git`: una sola aparicion, `api/trust.json:10`. Cero en `docs/`, cero en `SPEC.md`, cero en `runtime/`.

**Por que importa:** es la misma familia que N-24 y que N-01 -- una promesa publicada que apunta a nada. Pero aca el costo es peor que una promesa incumplida: un auditor que sigue la instruccion al pie de la letra lee la huella del servidor que esta auditando y la compara **contra si misma**, lo que da verde siempre, incluido el caso en que el host publico una clave propia y firmo su falsificacion con ella. Una comparacion que no puede fallar no es una verificacion; es una ceremonia que produce confianza falsa. El ataque exacto que vuelve inutil esta ceremonia ya estaba cubierto por un caso en rojo del verificador (`un host que reconstruye la cadena y firma con su propia clave`) -- el caso pasaba, pero el instrumento que el documento le ofrecia a una persona para detectarlo no existia.

**Donde vive el arreglo (ya hecho):** `docs/CONTRACT_API_SIGNING.md` lleva un **registro testigo** entre anclas, con `key_id`, huella, cabeza de la cadena, sha384 del indice, cantidad de entradas, versiones y fecha de firma, mas el comando de verificacion listo para pegar con los dos valores reales adentro. Lo escribe `sign-contract-api.mjs --witness`, que **no lee ninguna clave privada** (todos los valores ya son publicos) y que `--sign` corre solo, de modo que una release no puede producir una firma y olvidarse del testigo. `build-contract-api.mjs` lo **compara campo por campo contra `api/`** en cada publicacion y se pone rojo ante cualquier deriva: el valor no se escribe a mano en dos lugares sin una compuerta que los confronte, que es la leccion de las trece copias de la version (N-17).

**Probado en rojo:** 4 casos nuevos en `scripts/test-contract-api.mjs` (26 -> 30): huella que `api/` no publica, cabeza que `api/` no publica, anclas borradas, documento ausente.

**Lo que el arreglo NO compra, escrito en el mismo documento:** el deploy publica `docs/`, asi que el host tambien sirve una copia de este registro. **Esa copia no es un testigo** -- un host comprometido la reescribe junto con `api/trust.json`. El testigo es la copia de GitHub, que tiene otro operador. Y ni esa cubre el caso peor: vive en el mismo repositorio que `api/`, asi que quien pueda pushear mueve las dos. El unico testigo que cubre un repositorio comprometido sigue siendo la huella que el dueno anoto fuera de la maquina el dia que creo la clave.

**Grupo de convergencia:** G5-HONESTIDAD (una instruccion publicada que no se podia seguir).

**Severidad:** avisa. **Quien decide:** Forge; es mecanico. **Estado:** CERRADO el 2026-10-24, en la misma sesion en que aparecio.

---

### N-26 (nuevo) `payload_schema` es un campo normativo del manifest que el runtime de referencia no lee nunca

**Que esta mal:** la seccion 5 del SPEC describia `payload_schema` con semantica de validacion -- "los agentes PUEDEN validar antes de enviar; los runtimes PUEDEN imponerlo cuando `STRICT_VALIDATION` es `true`" -- y el runtime de referencia no tiene una sola linea que lea ese campo.

**Como aparecio:** no lo busque. Aparecio al resolver las lineas 317 y 321 de N-05 contra el estado real: para decir en que version se formalizo la gramatica habia que leer el codigo, y el codigo no la tiene.

**Evidencia que medi (2026-10-24):**

```
$ grep -c "payload_schema" js/nac.js
0
$ grep -rl "payload_schema" (js/mjs/ts/json/php/html, sin node_modules ni .tmp)
ads-demo/atlas-pro/index.html
packages/nac-angular-demo/src/app/manifest.ts
packages/nac-react-demo/src/manifest.ts
runtime/test/v23-invoke.mjs
SPEC.html
```

Cero apariciones en el runtime. Las cinco que hay son **productores** (manifests de demo que declaran el campo) y una fixture de test que lo incluye sin afirmar nada sobre su validacion. `STRICT_VALIDATION` si existe y su default **si** paso a `true`, pero en 2.3.0 y solo para hallazgos de rol de manifest/DOM: `manifest_role_unknown`, `tab_id_manifest_role_drift`, `manifest_dom_role_mismatch`. Nunca cubrio payloads. Y el propio `runtime/CHANGELOG.md`, bajo 2.3.0-alpha.1, lo dice en una seccion titulada **"Not yet wired"**: `STRICT_VALIDATION enforcement of payload_schema (alpha: schema is informational)`. Desde ahi hasta 2.5.0-alpha.5 no se cableo.

**Por que importa, y por que es peor que la deriva de N-05:** un agente que lee la seccion 5 puede concluir que un payload declarado con esquema fue verificado por el runtime. No lo fue. Es asimetria productor/consumidor publicada como contrato: hay tres manifests en este mismo repositorio que declaran el campo y ningun consumidor que lo lea.

**Donde vive el arreglo (ya hecho en la parte documental):** `SPEC.md` seccion 5 dice ahora que el campo es informativo, que el runtime no lo lee, que `STRICT_VALIDATION` cubre roles y no payloads, y que un agente NO DEBE suponer que un payload fue verificado. La promesa "la 2.4 formalizara la gramatica" se **elimina** en vez de re-fecharse, y la pregunta pasa a la seccion 13 como abierta y **sin fecha**.

**Lo que queda abierto:** cablear la validacion, o retirar el campo. Es decision del dueno y no entra en la 2.5.0: cualquiera de las dos toca el runtime y cambia lo que un adoptante puede declarar. Queda como pregunta abierta en la seccion 13, que es exactamente donde el documento ahora dice que viven.

**Grupo de convergencia:** G3-DERIVA (ahi aparecio) + G5-HONESTIDAD (es una capacidad afirmada que no existe).

**Severidad:** avisa. **Quien decide:** Forge redacto la parte documental; el cableado o el retiro del campo es DECISION DEL DUENO. **Estado:** parte documental CERRADA el 2026-10-24; la decision sobre el campo, abierta.

---

### N-27 (nuevo) El gate de integridad tenia cuatro defectos y cero tests de comportamiento

**Que esta mal:** `scripts/build-integrity.mjs` es el UNICO productor del `sha384` que la portada publica, y el congelador de `js/<version>/nac.js`. Se construyo para cerrar N-02 y N-03 y nunca tuvo un solo test de su comportamiento. El gate de contrato tiene su suite en rojo; este tenia ninguna.

**Como aparecio:** al escribirle la suite que le faltaba, antes de usarlo para cortar la 2.5.0. Los dos primeros defectos los encontre a mano al correrlo; los otros dos los delato la suite.

**Los cuatro, medidos:**

1. **`--write` solo refrescaba una copia congelada YA PUBLICADA.** La unica proteccion de una ruta inmutable era que una persona se acordara de subir la version primero. El gate de contrato ya habia trazado la linea en el lugar correcto -- una entrada de la cadena publicada es inmutable, `--force` es solo para una version que nunca salio -- y este congelador no la trazaba. Ahora `--write` se niega cuando la ruta ya existe en HEAD, con el mensaje que dice que hacer, y `--force` avisa en voz alta lo que cuesta.
2. **Un congelamiento rechazado seguia escribiendo aguas abajo.** Devolvia 1 (el deploy quedaba bloqueado) pero igual reescribia `index.html` con el hash de los bytes NUEVOS mientras la ruta congelada tenia los VIEJOS: el arbol quedaba declarando una huella que no correspondia a nada en esa ruta. Peor que el estado que se nego a crear. Ahora corta antes de tocar nada aguas abajo.
3. **La afirmacion "la pagina carga desde la ruta inmutable" la satisfacia la prosa.** Era `text.includes(rutaInmutable)`, y dos secciones mas arriba la portada explica en prosa que `js/<v>/nac.js` es inmutable y que hay que fijarla en produccion. Asi que el `<script>` podia volver al alias mutable `js/nac.js?v=...` -- **que es N-03 textual** -- y el gate decia OK. Ahora se afirma sobre el tag que carga, no sobre una cadena en el archivo.
4. **El chequeo del snippet para adoptantes leia el tag que el propio gate acababa de escribir.** Con `--write` repintando el tag, preguntar "aparece la ruta inmutable en index.html" es una pregunta que el gate ya hizo verdadera por su cuenta: pasaba en un salto de version que no actualizo la documentacion. Ahora se mide fuera de los tags. Es la misma familia que N-25: una comparacion que no puede fallar no es una verificacion.

**De paso, lo que el arreglo 1 habilito:** `--write` ahora **repinta** el tag del runtime a la ruta inmutable vigente. Antes un salto de version congelaba `js/<nueva>/nac.js` y dejaba el tag apuntando a la version anterior, el gate fallaba y una persona tenia que retipear la ruta en `index.html` -- la misma enfermedad de version escrita a mano que el candado existe para matar (N-17). Una casilla menos de las cinco ediciones a mano del release.

**Probado en rojo:** `scripts/test-integrity-gate.mjs`, 16 casos, misma forma que la suite de contrato (un repositorio git desechable por caso, una sola cosa rota, se afirma el rechazo POR EL MOTIVO correcto). Dos casos verdes deliberados: el arbol intacto pasa, y el salto de version CON su snippet actualizado congela sin `--force`. Corrida contra el gate de HEAD -- el de antes de estos arreglos -- **caen exactamente 4 casos y los otros 12 siguen verdes**, que es lo que prueba que estos arreglos son los que sostienen esos candados y que no se rompio nada mas. Cableada al deploy como paso propio.

**Hallazgo lateral (tambien arreglado):** `scripts/build-spec-html.mjs` llevaba la version del spec escrita a mano (`'2.5'`) en dos entradas, y ninguna de las casillas del candado de version la vigilaba. Ahora deriva `spec_version` de `js/nac.js` y se niega a renderizar si no puede leerla.

**Grupo de convergencia:** G1-DISTRIBUCION (es el candado de N-02/N-03) + G5-HONESTIDAD (el defecto 4).

**Severidad:** bloquea (el defecto 3 reabria N-03 en silencio). **Quien decide:** Forge; es mecanico. **Estado:** CERRADO el 2026-10-24, con suite.

---

### N-28 (nuevo, ABIERTO -- no se arreglo a proposito) Los `data-nac-id` de los encabezados del SPEC derivan del titulo, asi que corregir un typo renombra un id direccionable

**Que esta mal:** `scripts/build-spec-html.mjs` genera el `data-nac-id` de cada encabezado a partir del texto del titulo. El encabezado 17 era `spec.h2.17-asistive-labels-v25-shipped-in-250alpha5-rfc-v2503`. Al corregir el typo de N-07, ese id pasa a ser otro. La seccion 2 del propio SPEC dice que un `data-nac-id` debe ser **estable entre redisenos**: "un boton se mueve de la barra a un menu; su id DEBE seguir siendo el mismo".

**Como aparecio:** verificando el criterio de aceptacion de N-07, que pide comprobar que nadie enlace al encabezado con el error.

**Evidencia que medi (2026-10-24):** cero enlaces entrantes a ese ancla en todo el repositorio; las unicas apariciones son las definiciones en `SPEC.html` y en la traduccion `i18n/hi/SPEC.html`. Asi que el cambio **no rompe nada hoy**.

**Por que no lo arregle:** el arreglo correcto es derivar el id del NUMERO de seccion (`spec.h2.17`), que es estable ante cualquier edicion del titulo. Pero eso renombra los ids de TODOS los encabezados del SPEC y de las nueve traducciones de golpe, lo que es un radio de impacto mucho mayor que el typo que lo destapo, y toca material que G4-IDIOMAS va a regenerar igual cuando se decida D-03. Arreglarlo ahora seria hacer el cambio grande dos veces.

**Donde vive el arreglo:** `scripts/build-spec-html.mjs` (derivacion del id) + regenerar `SPEC.html` y las nueve traducciones.

**Grupo de convergencia:** G3-DERIVA + G4-IDIOMAS (se hace con la regeneracion de las traducciones).

**LA OTRA MITAD DEL MISMO DEFECTO, medida el 2026-10-24 al escribir la seccion 8.1:** los ids del CUERPO no derivan del titulo, derivan de la **posicion**: `spec.p.N`, `spec.list.N`, `spec.code.N`. Agregar dos parrafos y un encabezado a la seccion 8 renumero todo lo que viene despues: **85 lineas de `SPEC.html` cambiaron** y ninguna por su contenido. O sea que insertar un parrafo en el medio del SPEC le cambia la direccion a cada elemento posterior. Es el mismo problema que el de los encabezados, por un mecanismo distinto, y se arregla en la misma pasada: el id tiene que derivar de algo estable (numero de seccion + indice dentro de la seccion), no de la posicion global. Nada enlaza hoy a esos ids, igual que en el caso de los encabezados.

**Severidad:** registra. **Quien decide:** Forge propone hacerlo junto con D-03. **Estado:** ABIERTO, con fecha de ejecucion atada a G4.

---

### N-29 (nuevo) `NAC.conformance_tier` sigue hablando el vocabulario que la 2.5.0 retira

**Que esta mal:** la seccion 8 ya no llama `NAC-3` a un nivel, pero el runtime sigue exponiendo `NAC.conformance_tier = 'NAC-3-versioned'` y sigue rechazando con `NacError('feature_not_supported', {tier: 'NAC-3', ...})`. Un agente que lee el contrato obtiene un **nivel** sin ambiguedad y un **tier** con la ambiguedad intacta.

**Evidencia que reproduje (2026-10-24):** `js/nac.js:7883` `conformance_tier: 'NAC-3-versioned'`; `js/nac.js:1020` el fallback `|| 'NAC-3-versioned'`; `docs/RFC_V24-04.md:738` y siguientes definen los tres tiers `NAC-3`, `NAC-3-versioned` y `NAC-3-strict`. `api/latest/contract.json` publica `conformance_tier` como miembro de tipo `string` y **no publica su vocabulario**: una maquina ve el campo y no los valores posibles, asi que tampoco puede saber que esos valores son de otra taxonomia.

**Alcance adicional medido:** `js/nac-v2-extensions.js` usa "at NAC-3" en unos quince comentarios para referirse al nivel. Eso ahora se lee como alias historico, que es para lo que existe la seccion 8.1 -- y tocarlos tiene un costo real, medido en N-07: cambiar un comentario del runtime mueve sus bytes y obliga a un salto de version. No se tocan sin motivo.

**Donde vive el arreglo:** `js/nac.js` + RFC V24-04 + publicar el vocabulario del tier en `contract.json`.

**Por que NO se arreglo hoy:** es un valor de cable, no prosa. Un host puede estar comparando esa cadena, asi que renombrarla es un cambio de compatibilidad -- no esta cubierto por las garantias de la seccion 12, pero tampoco se hace sin decidirlo. Lo barato y honesto, mientras tanto, es **publicar el vocabulario** (los tres valores posibles, con su significado) para que una maquina pueda al menos distinguir tier de nivel sin leer prosa.

**Perfiles y criterio de aceptacion:**
- Agente externo: puede distinguir un *tier* de un *nivel* leyendo solo el contrato.
- Adoptante existente: si el valor se renombra, encuentra escrito el nombre viejo y la fecha del cambio.
- Auditor: el contrato publica el vocabulario de todo campo enumerado que publica.

**Grupo de convergencia:** G2-CONTRATO-LEGIBLE (toca el runtime, asi que viaja con N-14 y la segunda mitad de N-18).

**MITAD HECHA el 2026-10-26: el vocabulario esta publicado.** `contract.json` deja de
publicar `conformance_tier` como un `type: "string"` sin valores y publica el vocabulario
entero: los tres valores, que exige cada uno, cual declara **este** runtime, donde estan
definidos, y la frase que separa las dos taxonomias -- *un tier describe lo que
implementa el RUNTIME (RFC V24-04 seccion 6), un nivel describe lo que la PAGINA declara
y hace (SPEC.md seccion 8), son identificadores distintos y ninguno implica al otro*. Los
tres valores se **extraen** de la seccion 6 del RFC con un patron anclado, nunca se
escriben a mano, y el generador cruza tres fuentes y refuta cualquier desacuerdo: un
valor que el RFC define y el sidecar no explica, un valor que el sidecar explica y el RFC
ya no define, y un valor que el runtime declara y el RFC no conoce.

El CLI lo imprime en la misma linea que mide la pagina, con la etiqueta
`[tier != level: the tier is what the RUNTIME implements]`, porque la unica manera de que
un lector deje de confundirlos es verlos nombrados distinto en la misma frase.

Con esto el criterio de aceptacion del **agente externo** -- "puede distinguir un tier de
un nivel leyendo solo el contrato" -- esta cumplido, y el del **auditor** -- "el contrato
publica el vocabulario de todo campo enumerado que publica" -- tambien.

**Lo que sigue abierto es solo la decision:** si `NAC-3-versioned` se **renombra**. Es un
valor de cable que un host puede estar comparando, asi que renombrarlo es un cambio de
compatibilidad. Si se renombra, conviene que sea en la 2.5.0: mover un valor de cable
despues cuesta otra version. Si se deja, el vocabulario publicado ya resuelve la
ambiguedad para una maquina sin tocar a nadie.

**DECISION DEL DUENO -- 2026-10-26: NO SE RENOMBRA. N-29 QUEDA CERRADO.**

Textual: *"Dejarlo como esta."* Preguntado con el motivo explicito de que renombrar un
valor de cable despues de la 2.5.0 cuesta otra version, de modo que la decision se tomo
con su costo de oportunidad a la vista y no por omision.

Lo que la decision fija, para que un lector futuro no la relea como un olvido:

- `NAC.conformance_tier` sigue devolviendo `'NAC-3-versioned'` en la 2.5.0 y en adelante.
  Los tres valores del vocabulario -- `NAC-3`, `NAC-3-versioned`, `NAC-3-strict` --
  conservan su nombre.
- El motivo aceptado: es un valor que un host puede estar **comparando** en codigo, no
  prosa que alguien lee. La ambiguedad que hacia dano -- un agente que no podia saber si
  `NAC-3` nombraba un tier o un nivel -- ya la resuelve el vocabulario publicado en
  `contract.json`, que una maquina lee sin tocar a nadie. Renombrar romperia a todo
  tercero que compare la cadena a cambio de algo cosmetico.
- Es una **no-accion declarada**, no una deuda. Si alguien quiere reabrirla hace falta una
  decision nueva del dueno y un salto de version mayor, porque a esta altura el valor ya
  viaja publicado en el contrato de la 2.5.0.

Con esto las dos mitades de N-29 estan cerradas: el vocabulario publicado el 2026-10-26, y
la decision de renombre resuelta como no-renombre el mismo dia.

**Severidad:** avisa. **Estado: CERRADO** (2026-10-26) -- mitad mecanica hecha, mitad de
decision resuelta por el dueno como no-accion declarada.

---

### N-30 (CERRADO) La suite del gate de contrato quedaba ciega justo cuando hay un release en vuelo

**Esto NO es un hallazgo nuevo: estaba anotado y diferido.** El tramo del 2026-10-24 ~23:00 UTC lo dejo escrito en el historial de PND-035 como "limitacion que vale anotar", con la tecnica del arreglo ya identificada (normalizar el baseline, lo mismo que se habia hecho en la suite de integridad) y con un motivo para no hacerlo: "toca las cases de firma y testigo". Hoy se hizo, y ese motivo resulto no sostenerse -- la normalizacion firma con una clave desechable y refresca el registro de testigo con el escritor real, asi que los casos de firma no hubo que tocarlos.

**Que estaba mal:** `scripts/test-contract-api.mjs` copia el arbol real a un sandbox y rompe **una** cosa por caso. Pero el arbol real no es publicable mientras hay un release en vuelo: en cuanto `SPEC.md` o el runtime se mueven, `api/v/<version>/` queda stale contra ellos y el gate corta **ahi**, antes de llegar al defecto que cada caso queria probar.

**Evidencia medida (2026-10-24):** sobre `release/2.5.0` la suite daba **13 pasaron, 17 fallaron**, y los 17 con el mismo texto: `api/v/2.5.0-alpha.5/ differs from what the runtime generates`. Ningun candado estaba roto. Un rojo que dice lo mismo en los 17 casos no prueba nada de ninguno.

**Por que importa mas de lo que parece:** esa suite es el unico instrumento que dice si la cadena de hashes, la capa de firma y los testigos siguen guardando lo que prometen. Mientras estuviera ciega, cualquier defecto que se introdujera en esa capa se habria reportado como el mismo rojo generico del release en vuelo. Y el momento en que se apagaba era exactamente el momento en que mas se la necesita: cuando se esta editando el contrato.

**El arreglo:** el sandbox se **normaliza** antes de que ningun caso lo toque -- se regenera a la version que tiene en disco y se firma con una clave desechable, y recien despues se commitea, para que HEAD sea ese estado. Es **incondicional** a proposito: normalizar "solo si el arbol real esta rojo" haria que la suite probara cosas distintas segun el dia, que es la podredumbre que los casos de firma ya evitan reseteando el ancla de confianza en cada corrida. La pregunta separada -- si el arbol commiteado es publicable **hoy** -- la responde `npm run check:contract` sobre el arbol real, y el CI lo corre.

**Medicion despues:** **33 pasaron, 0 fallaron** (los 30 de antes mas los 3 nuevos de N-06). Las otras dos suites no tenian el defecto: `test-integrity-gate.mjs` da **16/16** y `test-contract-api-http.mjs` da **8/8**.

**Severidad:** avisa (es el instrumento, no el producto). **Estado:** CERRADO el mismo dia.

---

### N-31 (nuevo, 2026-10-26) La portada pinta 116 ids y su manifest declaraba 50

**Que esta mal:** la vidriera del protocolo no declara la mitad de su propia superficie. Un
agente que hace lo que el protocolo manda -- leer el manifest -- ve menos de la mitad de lo
que la pagina tiene marcado en el DOM.

**Evidencia medida (2026-10-26):** `data-nac-id` distintos pintados en `index.html` = **116**;
ids declarados en los dos `NAC.register` de la pagina = **50**; pintados y no declarados =
**66 crudos / 64 reales** (los 2 restantes son interpolaciones de plantilla dentro del script:
`' + step.id + '` y `' + a.nac_id + '`). Declarados y no pintados = **0**, que es la buena
noticia: no hay entradas fantasma.

**Tras la seccion de limites de hoy: 130 pintados / 64 declarados, y la brecha sigue siendo
exactamente la misma -- 66 crudos, 64 reales.** Se sumaron 14 pintados y 14 declarados en el
mismo commit. Eso es el punto: la seccion nueva **no empeora** la deuda, y es la razon por la
que sus 13 ids se declararon en lugar de solo pintarlos.

**Por que NO se arreglo hoy:** declarar los 64 que faltan son ~640 etiquetas en diez idiomas,
y eso choca de frente con **D-03**, que sigue sin decidirse. Hacerlo antes de D-03 es hacerlo
dos veces.

**Donde vive el arreglo:** `index.html`, los dos `NAC.register`. **Registro:** `PND-038`.

**Severidad:** avisa. **Estado:** abierto, atado a D-03.

---

### N-32 (nuevo, 2026-10-26) El generador del SPEC pinta un rol sin id en los enlaces de texto

**Que esta mal:** `scripts/build-spec-html.mjs` emite los enlaces embebidos en la prosa como
`<a href="..." data-nac-role="link">` **sin `data-nac-id`**. En el documento que es la
vidriera del protocolo, un agente ve el rol y no tiene como direccionar el elemento -- que es
exactamente lo que el protocolo existe para evitar.

**Como aparecio, y vale la pena decirlo:** no lo encontro una lectura. Lo encontro **volver a
correr el barrido de pantallas** (`e2e/n0-screen-sweep.mjs`) despues de los arreglos de G3:
`SPEC.html` paso de **4 elementos interactivos, 0 sin marcar** a **6 interactivos, 2 sin
marcar**. Los dos enlaces nuevos son los que el arreglo de N-13 agrego al decir donde viven
las preguntas abiertas (`rfcs/README.md` y `CONTRIBUTING.md`). El defecto del generador
estaba desde antes; lo que faltaba era un enlace en la prosa para exponerlo.

**Por que NO se arreglo hoy:** el id natural seria posicional (`spec.p.<n>.link.<k>`) y eso es
**exactamente el anti-patron de N-28** -- ids que se renumeran cuando el texto se mueve.
Arreglarlo ahora seria agregar dos ids posicionales mas al conjunto que N-28 manda renumerar.
Viaja con N-28, en la pasada que depende de **D-03**.

**Donde vive el arreglo:** `scripts/build-spec-html.mjs` (linea del emisor de enlaces) + la
regeneracion de `SPEC.html`. **Registro:** `PND-041`.

**Severidad:** avisa. **Estado:** abierto, atado a N-28 y a D-03.

**Efecto colateral ya aplicado:** el barrido escribia su salida **sin fecha**, asi que
`e2e/sweep.json` no se podia distinguir de una medicion actual aunque fuera de dos dias antes.
Ahora el artefacto se fecha a si mismo (`measured_at`, `measured_at_commit`, `tree`).

---

### N-33 (nuevo, 2026-10-26, GRAVE -- CERRADO el mismo dia) `validate_global` no veia un manifest escrito como el documento manda

**Que estaba mal:** `_collectManifestIds(m)` -- la funcion sobre la que se apoya todo el
validador global -- leia **solo** los grupos legados (`actions`, `fields`, `tabs`, `kpis`,
`charts`) y por la clave `nac_id`. La forma **canonica** del manifest es
`elements: [{ id, role, ... }]`: la que documenta la seccion 4, la que usan todas las
demos, y la que lee **el resto del runtime** (`_capabilityFor` recorre
`m.elements.concat(m.tabs)` por `.id`). Para un manifest escrito como el documento manda,
el colector devolvia **lista vacia**.

**Todo lo que se apoya encima salia mal, y para el mismo lado:** `total_ids` = 0 con dos
manifests registrados; los elementos **declarados** reportados como **huerfanos**, que es
exactamente lo contrario de lo que son; `duplicates`, `unmounted` y
`convention_violations` **incapaces de disparar nunca**, porque se calculan contra el
indice vacio; y con todo eso, `ok: true` y `has_errors: false`. Un validador que no ve el
manifest no es un validador indulgente: **es una luz verde sin nada atras.** Y es el
validador que la seccion 10.1 documenta y que la promesa 4 de la seccion 12 nombra por su
nombre.

**Evidencia, medida sobre la portada real en un navegador (2026-10-26):**

| | `total_ids` | huerfanos | duplicados | no montados | convencion | `ok` |
| --- | --- | --- | --- | --- | --- | --- |
| antes | **0** | **128** | 0 | 0 | 0 | true |
| despues | **64** | **64** | 0 | 0 | 0 | true |

El primer huerfano de la columna "antes" era `nac_landing.topbar`, **que esta declarado**.
Y los 64 huerfanos de la columna "despues" son **exactamente** los 64 ids reales sin
declarar que N-31 habia contado por otro camino: dos mediciones independientes que
coinciden.

**Como aparecio:** armando el fixture que N-14 necesitaba para que el generador LEYERA los
codigos en vez de escribirlos. Cuatro de los cinco baldes salian vacios contra un manifest
invalido a proposito. No era el fixture. **Es el patron de la seccion 8 del handoff por
cuarta vez: cada capa de verificacion que se construye encuentra un hallazgo que meses de
lectura no encontraron.** Esta vez lo encontro tener que PROVOCAR un hallazgo en vez de
observar su ausencia.

**El arreglo:** se leen las dos formas (`elements[].id`, y en los grupos legados `nac_id`
o `id`, porque los tabs se declaran con `.id` en la canonica y con `.nac_id` en la
legada), con deduplicacion final para que un id declarado en las dos formas del MISMO
manifest no cuente como duplicado cruzado. La legada se queda: hay manifests en la calle
que la usan.

**Los tres consumidores, auditados (SQ 14):** `validate_global` pasa a medir de verdad; el
lint de duplicados de `register()` pasa a avisar para manifests canonicos (es un
`console.warn`, no un throw); nada mas lo llama.

**Aviso de compatibilidad, declarado y no escondido:** un host que gateaba su CI en
`has_errors` puede ver su primer rojo al actualizar. **No es una regresion: es el primer
true positive.** Esta en el CHANGELOG y en la seccion 10.1.

**Candado:** `scripts/test-validate-global.mjs`, probado en rojo plantando el defecto en
memoria -- con el colector ciego, `total_ids` cae de 5 a 1 (sobrevive solo el manifest
legado, que es la asimetria exacta) y los declarados vuelven a figurar como huerfanos.

**Severidad:** bloquea (era una compuerta que decia verde sin mirar). **Registro:**
`PND-042`. **Estado:** CERRADO en el repositorio el 2026-10-26.

---

### N-34 (nuevo, 2026-10-26 -- CERRADO el mismo dia) La seccion 10.1 documentaba una forma de retorno que el runtime nunca tuvo

**Que estaba mal:** la seccion 10.1 y la firma de la seccion 5.2 decian que
`validate_global()` devuelve **un array plano de hallazgos**
(`{severity, code, nac_id, message, detail}`). El runtime devuelve **un objeto de baldes
con nombre** (`ok`, `has_errors`, `duplicates`, `orphans`, `unmounted`,
`convention_violations`, `plugin_instance_violations`, `tolerated`, `plugin_count`,
`total_ids`, `timestamp`). No es una deriva de version: es una forma que la
implementacion de referencia **nunca** devolvio.

**Evidencia (2026-10-26):** `NAC.validate_global()` en un sandbox del runtime publicado
devuelve `typeof object`, `Array.isArray === false`, con esas once claves.

**Por que importa mas de lo que parece:** un adoptante que programa contra el documento
escribe `findings.filter(f => f.severity === 'error')` sobre un objeto, recibe
`undefined is not a function`, y el documento no le da ninguna pista. Y la promesa 4 de la
seccion 12 habla de "los codigos de `validate_global`" apoyada en una descripcion que no
corresponde a lo que el validador devuelve.

**Arreglado el mismo dia**, junto con N-14: la seccion 10.1 publica la forma real con el
codigo y la severidad de cada balde, la firma de la 5.2 dice `GlobalReport` en vez de
`Findings[]`, y el candado que lo sostiene es el primer caso de
`scripts/test-validate-global.mjs` ("the validator returns named buckets, not a flat
array").

**Severidad:** avisa. **Estado:** CERRADO el 2026-10-26.

---

### N-35 (nuevo, 2026-10-26) La opcion `probe` es normativa en el SPEC y el runtime no la lee nunca

**Que esta mal:** la seccion 10.1 publica la firma
`NAC.validate_global(opts?: {probe?: boolean})`, y los requisitos de nivel 2 y 3 de la
seccion 8 estan escritos sobre esa opcion -- nivel 2 pide `{probe: false}` con cero
hallazgos de severidad `error`, nivel 3 pide `{probe: true}` con cero hallazgos de
cualquier severidad. El runtime declara `function validate_global()` **sin un solo
parametro** y en sus 23 apariciones de la palabra `probe` en `js/nac.js` ninguna
pertenece a esta funcion.

**Evidencia (2026-10-26):** `SPEC.md:745` publica la firma con `opts`. `js/nac.js:4694`
declara `function validate_global()`. Pasarle `{probe: true}` es aceptado y descartado en
silencio, porque JavaScript no se queja de un argumento de mas.

**Por que importa:** los dos requisitos quedan distinguidos **solo** por el umbral de
severidad, no por la profundidad del sondeo que la frase promete. Un validador que
reporta "pasa nivel 3" esta diciendo algo mas debil que lo que la frase dice, y nada en
el contrato lo avisaba. Es la misma familia que N-26 (`payload_schema` normativo y sin
lector) y N-34 (una forma documentada que el runtime nunca devolvio): el documento
describe una capacidad que el codigo no tiene.

**Como se encontro:** construyendo el modo URL del validador (N-18). Para ponerle un
decididor al requisito de nivel 3 hubo que preguntarse que hace `probe: true`, y la
respuesta fue: nada.

**Mitigado mientras tanto, no tapado:** el decididor `validate_global_no_findings` del
CLI imprime la advertencia junto al veredicto, y el sidecar la deja escrita en la nota
del requisito, que es lo que `api/v/<version>/levels.json` publica.

**Donde vive el arreglo:** `js/nac.js` (cablear `probe`, que es lo que haria que los dos
requisitos midan cosas distintas) **o** `SPEC.md` 10.1 + seccion 8 (retirar la opcion y
escribir los dos requisitos por su umbral). Lo primero es trabajo de runtime; lo segundo
es una frase.

**Severidad:** avisa. **Quien decide:** el dueno -- cablear o retirar. **Estado:** abierto.

---

### N-36 (nuevo, 2026-10-26) El nivel 3 pide manifests firmados y el runtime no sabe firmar ni verificar un manifest

**Que esta mal:** el primer requisito de nivel 3 es "Carries HMAC-signed manifests", y el
sidecar lo publicaba como `machine_checkable: true` con la nota "decidible como la
presencia de un bloque de provenance cuyo HMAC el runtime verifica". **No existe tal
verificacion.** `NAC.sign_provenance` y `NAC.verify_provenance` operan sobre
`detail.source` de un **evento**, nunca sobre un manifest; `register()` guarda el objeto
tal cual y no mira ningun campo de firma.

**Evidencia (2026-10-26):** las 12 apariciones de `hmac`/`signature` en `js/nac.js` estan
todas dentro del bloque de provenance de eventos (`js/nac.js:6784` en adelante). Ni una
toca `_manifests`.

**Consecuencia medida:** **ninguna herramienta puede afirmar el nivel 3 hoy.** No por
falta de ganas del validador: un validador sin el secreto del tenant solo puede ver si el
bloque esta, y no hay nada en la pagina a quien preguntarle si es autentico.

**Como se encontro:** escribiendo el decididor de ese requisito para N-18.

**Lo que hace el validador mientras tanto, y por que asi:** el decididor
`manifest_hmac_block_present` devuelve **fail** cuando ningun manifest trae bloque -- eso
si es decidible, y en negativo es definitivo -- y **unverified** cuando alguno lo trae.
Nunca **pass**. La alternativa, marcar el requisito como no decidible por maquina, suena
mas honesta y es peor: por la regla de reporte publicada, un requisito no decidible
**sale del gate**, asi que declararlo indecidible volveria el nivel 3 mas facil de
afirmar, no mas dificil. Esa propiedad de la regla quedo anotada y mitigada en N-18 con
`must_report_coverage`.

**Donde vive el arreglo:** `js/nac.js` (firma y verificacion de manifests, que es una
funcionalidad de 2.6) **o** `SPEC.md` seccion 8 (escribir el requisito en terminos de lo
que una herramienta puede ver).

**Severidad:** avisa. **Quien decide:** el dueno. **Estado:** abierto.

---

### N-37 (nuevo, 2026-10-26) El nivel 2 exige la forma de manifest que la seccion 4 llama heredada

**Que esta mal:** el primer requisito de nivel 2 dice "Registers `tabs[]`, `fields[]`,
`actions[]` arrays explicitly in its manifest". Esas tres arrays son la forma
**heredada**. La seccion 4 documenta `elements: [{id, role, ...}]` como la forma
canonica, y N-33 es el expediente de lo que costo que el validador leyera solo las
heredadas. Leido literalmente -- que es como un validador tiene que leerlo -- **una
pagina escrita como el documento manda no alcanza el nivel 2**.

**Evidencia (2026-10-26):** la portada del propio protocolo registra dos manifests
(`nac_landing` y `chat`), los dos con `elements[]` y ninguno con las tres arrays. El
validador la deja en `FAIL L2-f6a7aa72` con el detalle "estos manifests usan la forma
canonica elements[] en su lugar". El fixture `e2e/fixtures/level-2-page.html` declara las
dos formas a proposito y por eso puede llegar a nivel 2: es la unica manera de tener un
caso verde contra la frase tal como esta escrita.

**Por que no lo reinterpreto el validador:** porque el mapeo requisito -> decididor esta
revisado contra **esa** frase y versionado por el hash de su texto. Un validador que
decide que la frase "en realidad queria decir" otra cosa es un validador que certifica
contra un documento que nadie escribio.

**Donde vive el arreglo:** `SPEC.md` seccion 8, una frase: declarar la superficie
explicitamente en el manifest (en cualquiera de las dos formas) en vez de nombrar solo
las tres arrays heredadas. Al cambiar la frase cambia su hash, asi que el gate del
contrato exige que alguien vuelva a leer el mapeo -- que es exactamente lo que
corresponde.

**Severidad:** avisa. **Quien decide:** el dueno (es texto normativo). **Estado:** abierto.

---

### N-38 (nuevo, 2026-10-26) El nivel 1 pide un evento que un enlace no puede emitir despues de su propio unload

**Que esta mal:** el segundo requisito de nivel 1 dice que todo elemento
`data-nac-role="action"` emite `nac:action:succeeded` **despues de su efecto**. Cuando el
efecto es navegar, no hay despues: la pagina se descarga y no queda nadie para emitir ni
para escuchar. El requisito no tiene, para un enlace, ningun resultado que una
herramienta pueda registrar -- ni verde ni rojo.

**Evidencia medida (2026-10-26), portada del protocolo, corrida con `--drive`:** de los 39
elementos con rol `action` que la portada declara, **31 son enlaces planos con `href`**.
Dos emiten el evento. Los seis restantes son el caso de N-39.

**Como lo trata el validador, y por que no lo cuenta como defecto de la pagina:** los
clasifica aparte y devuelve **unverified** nombrandolos, en vez de **fail**. Contarlos
como fallas seria culpar a la pagina por un agujero del requisito; contarlos como pases
seria inventar una medicion. El validador cancela la navegacion en la fase de burbuja
para que la pagina sobreviva -- los handlers de la pagina ya corrieron para entonces, asi
que el efecto bajo prueba ocurre y el evento, si lo hubiera, se veria.

**Donde vive el arreglo:** `SPEC.md` seccion 8 -- o se exceptua la navegacion, o se exige
que el elemento emita **antes** de navegar (que es implementable y es lo que hace que un
agente pueda esperar la confirmacion). Mientras no se decida, el nivel 1 de cualquier
pagina con enlaces queda sin poder afirmarse.

**Severidad:** avisa. **Quien decide:** el dueno (es texto normativo). **Estado:** abierto.

---

### N-39 (nuevo, 2026-10-26) Seis acciones declaradas de la portada no confirman nunca, y un agente que las llama espera cinco segundos y se come un timeout

**Que esta mal:** seis elementos de la portada declaran `data-nac-role="action"` y no
emiten ningun evento de completitud. No son enlaces que navegan (ese es N-38): dos son
anclas de fragmento, que dejan la pagina en su sitio, y cuatro son controles del chat con
handler propio. Para los seis, `NAC.click(id)` se queda esperando y termina en
`timeout`.

**Evidencia medida (2026-10-26), `nac validate <portada> --drive`:**

| id | que es |
|---|---|
| `nac_landing.limits.forge` | ancla a `#waitlist` |
| `nac_landing.limits.governance` | ancla a `#governance` |
| `chat.tts` | control del chat |
| `chat.mic` | control del chat |
| `chat.voice.always_on` | control del chat |
| `chat.send` | control del chat |

De los 39 actions declarados: 2 confirman, 31 son enlaces que navegan (N-38) y estos 6
fallan de verdad.

**Por que importa:** es la vidriera del protocolo. Un agente que hace exactamente lo que
NAC3 le dice que haga -- leer el manifest y llamar `NAC.click` por id -- se cuelga cinco
segundos por control y no recibe confirmacion de ninguno. Y a diferencia de N-38, estos
seis **se pueden arreglar en la pagina**: la pagina sigue viva despues del click, asi que
hay un despues en el que emitir.

**Como se encontro:** es el primer hallazgo que no salio de leer. Salio de **manejar** la
pagina: el modo `--drive` de N-18 hizo click en los 39 y conto quien contesto.

**Donde vive el arreglo:** `index.html` -- `NAC.bindAction` en los seis, o un emit
explicito en su handler. Mas un caso en `e2e/landing-limits-check.mjs` para los dos de la
seccion de limites, que son ids que se agregaron en `c64fcf2`.

**Severidad:** avisa (no rompe la pagina para una persona; la rompe para un agente, que es
el publico del protocolo). **Quien decide:** nadie, es trabajo. **Estado:** abierto, no
empezado -- queda fuera del alcance de las dos piezas de este tramo.

---

### N-40 (nuevo, CERRADO el mismo dia -- 2026-10-26) El fragmento que un adoptante copia de la portada publica una huella SRI que no corresponde a ningun archivo

**Que esta mal:** la portada publica la huella del runtime **dos veces**. Una en el
`<script>` real que la pagina carga, y otra dentro del fragmento HTML-escapado que la
seccion de instalacion le ofrece a un adoptante para copiar y pegar. La segunda
declaraba `sha384-JWmlAZyztLTUdWDFM5mBeXAX13iRTXEw//7eK5YpblEEZ/81A50WTmWWS9QwzqrJ`,
que **no es la huella de ningun archivo del repositorio** ni de ninguno que se haya
publicado.

**Evidencia medida (2026-10-26):**

- La huella real de `js/2.5.0-alpha.5/nac.js` (344665 bytes, LF) es
  `sha384-esz+6WxnJZiOKEl1oEgTt5LaoGTBX8pyI8QdsnISxHIVzGCgGYk5qKnWmBEsYnmp`, igual que
  en `js/integrity.json` y que en el `<script>` de `index.html:1724`.
- La huella del fragmento (`index.html:1127`) aparece **una sola vez en todo el arbol**
  y no coincide con ningun archivo de `js/` ni de `runtime/dist/`: se verifico
  recalculando sha384 sobre cada uno.
- `git log -S` la ubica: la introdujo `934dd4f` y `dcb71ea` la cambio **solo en el
  `<script>`**. El mensaje de `dcb71ea` dice exactamente que esta corrigiendo una huella
  calculada sobre bytes CRLF (352798 bytes en Windows) cuando el servidor entrega LF
  (344665). Es decir: **la huella del fragmento es la de los bytes CRLF**, el defecto de
N-22 sobreviviendo en el unico lugar que lee quien copia y pega.

**Por que importa:** es el camino de instalacion documentado del protocolo. Un adoptante
que copia el fragmento obtiene un `integrity` que el navegador no puede hacer coincidir,
asi que **el navegador se niega a ejecutar el runtime** y la pagina queda sin NAC3. Y la
unica senal es una linea en la consola: falla en silencio, que es justo la direccion en
la que este proyecto declara no fallar nunca (SQ 0.3). El agravante esta en el parrafo
inmediatamente debajo del fragmento, que le dice al lector *"Recompute the hash
yourself. Do not take the value above on faith"* -- la verificacion que el documento
ofrece es exactamente la que delata la mentira.

**Por que la compuerta no lo atrapo (el defecto de fondo):** `build-integrity.mjs` es el
unico productor de la huella y compara una por una las huellas de **los `<script>`**. El
fragmento esta HTML-escapado, asi que no es un `<script>` y nunca entro ni al re-pinneo
ni a la comparacion. La compuerta **si** verificaba el **camino** en la prosa -- lo hace a
proposito, para detectar una documentacion sin actualizar -- pero nunca la **huella**.
Asimetria productor/consumidor exacta (SQ 14): custodiado donde se genera, descubierto
donde se publica.

**Como se encontro:** no salio de leer ni de una auditoria. Salio de **preparar el salto
de version**: al ir a actualizar los slots de version de `index.html` aparecieron dos
huellas distintas para la misma URL en el mismo archivo. Van siete: cada capa de
verificacion que se construye encuentra un hallazgo que la lectura no habia encontrado.

**El arreglo (2026-10-26), las dos mitades:**

1. **La huella del fragmento tiene productor.** `--write` la re-pinnea junto con las de
   los `<script>`, anclado en el markup del fragmento. Una huella es un valor derivado,
   asi que no se escribe a mano: es la regla de N-17 aplicada al ultimo lugar donde
   quedaba una copia manual. Si el markup del fragmento se mueve, la compuerta **lo
   dice en voz alta** en vez de dejar de cubrirlo en silencio.
2. **La compuerta refuta cualquier huella no publicada, donde sea.** Toda cadena
   `sha384-...` que la pagina imprima -- en un tag o en prosa -- tiene que ser una de
   las huellas que el proyecto publica, y se reporta con su numero de linea. Formulado
   sobre la pagina entera a proposito: una huella inventada es el mismo defecto donde
   sea que se imprima, y asi el candado no depende de que decoraciones use el markup.

El **camino** en la prosa sigue escrito a mano y custodiado por su caso: es la senal de
que alguien leyo la documentacion despues de un bump, y automatizarlo seria hacer que la
compuerta se conteste sola.

**Verificacion (probada en rojo, no solo en verde):** 5 casos nuevos en
`scripts/test-integrity-gate.mjs`, que pasa de 16 a 21. Corridos contra la compuerta de
HEAD (la anterior al arreglo) **caen los 5 y los 16 viejos siguen verdes**, asi que los
casos miden el cambio y nada mas. Uno de los cinco reproduce el defecto **como paso**:
no planta una cadena inventada, hashea el mismo fuente sobre bytes CRLF y publica eso.
Y hay un caso verde de base -- *el fragmento de base publica la huella publicada* --
porque sin el los dos casos rojos podrian estar verdes sobre un fragmento sin ninguna
huella, que es verde sobre nada.

**Severidad:** bloquea (rompe el camino de instalacion documentado). **Quien decide:**
nadie, es mecanico. **Estado: CERRADO** (2026-10-26) -- huella corregida, productor
unico, compuerta extendida y 5 casos en rojo.

---

### N-41 (nuevo, CERRADO el mismo dia -- 2026-10-26) La compuerta de versiones refutaba documentacion verdadera el dia que se publica una estable

**Que esta mal:** el candado que impide que el paquete publicado misdeclare su propia
version (N-17) tiene una regla para su ultima prueba, la que exige que un generador no
lleve version propia: *"cuenta como hardcodeada cualquier x.y.z que sea igual a la
version que se esta publicando"*. Esa regla es correcta para **codigo** y falsa para
**prosa**, y las dos chocan exactamente un dia: el dia que el proyecto publica una
version estable que sus propios comentarios ya nombran.

**Evidencia medida (2026-10-26):** al subir la version a `2.5.0`, la compuerta paso a
**16 de 18** y los 2 rojos eran 7 frases ciertas:

| archivo | texto |
|---|---|
| `runtime/src/cli.mjs:20` | `Audit N-18: before 2.5.0 the URL mode aborted with exit 2` |
| `runtime/src/cli.mjs:215` | `(pre-2.5.0 alias: ...)` |
| `runtime/src/cli-url.mjs:5` | `Before 2.5.0 nac validate <url> aborted` |
| `runtime/src/cli-url.mjs:182` | `2.5.0 attaches neither code nor severity` |
| `runtime/src/cli-url.mjs:358` | `so nobody reads a pre-2.5.0 runtime as a defective page` |
| `runtime/src/cli-url.mjs:706` | `Audit N-33: before 2.5.0, validate_global() read only the legacy` |
| `runtime/src/cli-url.mjs:720` | `Serve a runtime at 2.5.0 or later.` |

Ninguna declara una version: cinco estan en comentarios y dos son texto que el CLI le
imprime a una persona. Ninguna llega a un artefacto como declaracion.

**Por que importa mas de lo que parece:** un rojo asi deja al que publica con dos
salidas, y las dos son malas. Aflojar el candado, o reescribir documentacion correcta
para esquivar un lint. La segunda ademas no escala: la 2.6.0 choca igual con frases
distintas. Y las dos ensenan lo mismo al proximo lector: que esta compuerta se
desactiva cuando molesta. Un candado en el que nadie cree ya no es un candado.

**El arreglo:** la pregunta se hace de forma estructural en vez de por digitos. Un
literal es una **autodeclaracion** cuando (a) lleva cola de prerelease -- `2.3.0-alpha.2`
no es prosa nunca; (b) la cadena entera **es** la version, que es la forma literal de
N-17 (`const V = '2.5.0'`, `version: '2.5.0'`); o (c) viene **presentada** como una:
precedida por `v`, por `version` y puntuacion, o por `@` (`@nac3/runtime@2.5.0`).
Cualquier otra cosa -- un comentario, o una version dentro de una frase mas larga -- es
prosa y queda legal. Deliberadamente **no** es un removedor de comentarios: `//` aparece
en cada URL de esos archivos, asi que cortar hasta el fin de linea podria **esconder**
una declaracion real. La prueba nunca tiene que decidir que es un comentario, y cuando
duda, marca: falla cerrada.

**Severidad:** bloquea (traba la publicacion de toda version estable que el codigo ya
nombre). **Quien decide:** nadie, es mecanico. **Estado: CERRADO** (2026-10-26).

---

### N-42 (nuevo, CERRADO el mismo dia -- 2026-10-26) La compuerta de versiones leia su fuente de verdad de un comentario, y una prueba suya pasaba con la version correcta pero rompia el deploy siguiente

Dos defectos del mismo archivo, los dos encontrados por el mismo trabajo: escribirle a
la compuerta de versiones la suite de comportamiento que **nunca tuvo**. Era el ultimo
candado del proyecto sin tests, y es el octavo hallazgo que no salio de leer.

#### 42a. La fuente de verdad era un comentario

**Que esta mal:** la compuerta declara que la version autoritativa es la constante del
export `NAC` al final de `js/nac.js`, y la leia con `src.match(/version:\s*'<semver>'/)`
-- sin `/g`, es decir **la primera** aparicion. En `js/nac.js` la primera aparicion esta
en la **linea 8**, dentro del comentario de cabecera que *cita* la constante. El export
real es la quinta aparicion, en la linea 7901.

**Evidencia medida (2026-10-26):** las cinco apariciones de `version: '<semver>'` en
`js/nac.js` son, en orden: linea 8 (comentario de cabecera, `2.5.0`), linea 302
(manifest de ejemplo, `1.0.0`), linea 1914 (`2.3.0`), linea 6713 (`1.0.0`) y linea 7901
(**el export real**, `2.5.0`). La compuerta tomaba la primera.

**Las dos consecuencias, las dos medidas:**

1. Se vacia el export y se deja el comentario: la compuerta reporta **los 18 slots en
   verde** sobre un runtime que no exporta ninguna version. Es el caso de prueba
   `un runtime sin constante de version se refuta, no se asume`.
2. Se mueve solo el comentario: la compuerta **adopta el comentario como autoritativo** y
   reporta el **export** como el slot derivado -- es decir, le dice al que mantiene el
   codigo que edite el artefacto para que coincida con la documentacion. Es N-17 apuntando
   al reves.

**El arreglo:** la version se lee como la lee `scripts/build-contract-api.mjs`:
**cargando** los bytes publicados de `js/nac.js` en un sandbox `vm` y preguntandole al
runtime que exporta. Un comentario no puede satisfacer eso. El comentario de cabecera
conserva su propia prueba, ahora como **consumidor** que tiene que coincidir. Misma
tecnica, mismo archivo, una sola fuente de verdad.

#### 42b. La prueba del deploy pasaba con la version correcta y rompia el deploy siguiente

**Que esta mal:** la prueba del workflow de deploy existe porque el smoke check tenia el
camino versionado escrito a mano, *"lo que hacia que un salto de version rompiera el
deploy"*, y su propio comentario dice: **"encontrar NINGUNA version aca es el caso que
pasa"**. Pero estaba implementada con el helper generico, que pregunta *"toda version
encontrada es la correcta?"*. Asi que un camino recien escrito a mano **pasaba** mientras
nombrara la version en curso, y se ponia rojo en el **salto siguiente** -- que es
exactamente la falla para la que se creo la prueba.

**Evidencia medida (2026-10-26):** con un camino `js/2.5.0/nac.js` plantado en
`.github/workflows/deploy.yml`, la compuerta anterior sale con **codigo 0**. El
comentario ya decia la regla; el codigo recien ahora la aplica.

**El arreglo:** esa prueba deja de usar el helper generico. Aca, a diferencia de los
otros 17 slots, **no encontrar version es el unico verde**, y el mensaje de arreglo lo
dice: un camino correcto hoy rompe el deploy en el proximo salto.

#### Verificacion de los dos (probados en rojo, en dos corridas distintas)

Suite nueva `scripts/test-version-gate.mjs`, **18 casos**, cableada en
`npm run check:release` y en el CI justo despues de la compuerta que prueba.

- Con el arreglo de N-41 puesto y los de N-42 todavia no, los dos casos de N-42 dan
  **RED-FAIL con el texto "la compuerta lo ACEPTO"**: prueba limpia de que el defecto
  era real y de que el caso lo mide.
- Contra la compuerta de HEAD completa (sin ninguno de los tres arreglos) caen **6 de
  18**, y son los 6 correctos: el caso de control, los **3 casos verdes de prosa** de
  N-41 -- es decir, la compuerta vieja refuta documentacion verdadera -- y los 2 de
  N-42. Los otros 12 siguen verdes, asi que la suite mide el cambio y nada mas.
- La suite incluye casos verdes con el mismo peso que los rojos, porque en N-41 el
  defecto **era** un rojo de mas.

**Severidad:** bloquea las dos mitades (42a invalida la garantia entera de la compuerta;
42b rompe un deploy). **Quien decide:** nadie, es mecanico. **Estado: CERRADO**
(2026-10-26).

---

### N-43 (nuevo, CERRADO el mismo dia -- 2026-10-26) Un caso de la suite del contrato dejo de medir el dia que su version inventada se volvio real

**Que esta mal:** el caso *"un puntero latest que inventa una version estable se
refuta"* mutaba `api/latest.json` poniendo `stable = '2.5.0'`. Se escribio cuando no
existia ninguna version estable, asi que `2.5.0` era entonces una invencion. El dia que
se publica la 2.5.0, esa mutacion escribe **la verdad**: la compuerta la acepta -- y
hace bien -- y el caso deja de medir nada mientras sigue reportando.

**Evidencia medida (2026-10-26):** con el arbol en 2.5.0 el caso da **RED-FAIL "la
compuerta ACEPTO un arbol roto"**. Es la unica falla de los 36 casos de la suite, y no
la causo ningun cambio de codigo: la causo el calendario.

**Por que importa:** un fixture que codifica una version a la que el proyecto va a
llegar algun dia tiene fecha de vencimiento y nadie la anoto. Entre que vence y que
alguien lo nota, el caso es una luz verde que no mira nada -- la misma forma de mentira
que N-30 y que la huella que se comparaba contra si misma.

**El arreglo:** una constante `NEVER_PUBLISHED = '99.99.99'` **con guarda**: si la
cadena alguna vez la publica, la suite se niega a correr y lo dice, en vez de volver a
mutar hacia la verdad en silencio. Los otros dos literales de version de las suites
(`9.9.9`, `99.0.0`) ya eran inalcanzables; se verifico que no hay mas.

**Severidad:** avisa (un caso que no mide, no un defecto del producto). **Quien decide:**
nadie, es mecanico. **Estado: CERRADO** (2026-10-26).

---

### N-44 (nuevo, CERRADO el mismo dia -- 2026-10-26) `fill()` se estrella en un DOM parcial, y el fallback que existe para ese caso es inalcanzable

**Que esta mal:** `fill()` escribe el valor de un input a traves del **setter nativo**
de `HTMLInputElement.prototype` y no con `el.value = v`. Eso no es un detalle: React
rastrea el setter original, asi que una asignacion directa se revierte en el siguiente
render y un input controlado nunca recibe el valor. El codigo tiene un fallback para un
host sin ese constructor -- y **el fallback era inalcanzable en el unico entorno para el
que se escribio**. La guarda miraba el **descriptor**, y la expresion que lo produce
atraviesa `window.HTMLInputElement.prototype`. Si ese constructor no existe, tira antes
de llegar a cualquier fallback.

**Evidencia medida (2026-10-26):** `runtime/test/stage4-calls.mjs` -- la suite unitaria
de **todas** las APIs de escritura -- fallaba 2 de 31 casos, `T6 fill happy path
resolves` y `T6 fill set value on input`. Instrumentando el `catch` que se los comia, el
motivo real es `TypeError: Cannot read properties of undefined (reading 'prototype')`.
Verificado preexistente: con el arbol en HEAD (antes de todo el trabajo de esta sesion)
caen los mismos 2 casos.

**Dos consecuencias, no una:**

1. `fill()` y la rama de `checkbox`/`radio` **se estrellan** en vez de degradar en todo
   host con DOM parcial -- un shim de test, un contexto SSR o headless; justo los
   caminos que el runtime declara soportar.
2. Lo que tira **no es un `NacError`**: es un `TypeError` crudo sin `code`. Un agente
   que programo contra el contrato de errores no recibe nada en que ramificar, que es
   la falla que la doctrina de errores de este proyecto existe para no tener.

**Como se encontro:** corriendo la suite completa del runtime para verificar el salto de
version. El handoff declaraba *"suite del runtime (14 stages) verde"* y no lo estaba.

**El arreglo:** un helper `_nativeSetter(ctorName, prop)` que devuelve el setter nativo o
`null`, y chequea **el constructor y su prototype** antes del descriptor. Los tres
puntos de llamada (`checked`, `SELECT.value`, `INPUT`/`TEXTAREA.value`) pasan a usarlo,
asi que no pueden discrepar sobre que significa "el setter nativo no esta". En un
navegador real no cambia nada: los constructores existen siempre, el descriptor se
encuentra y el setter nativo se usa igual que antes.

**Verificacion, de los dos lados, porque el arreglo tiene un riesgo real:**

- **DOM parcial:** `stage4-calls.mjs` pasa de 29/31 a **31/31**. Ese caso ya existia y
  ya estaba rojo: es la prueba en rojo del defecto, no una escrita para la ocasion.
- **Navegador real:** el riesgo del arreglo es haber movido **al navegador** al fallback,
  que es precisamente lo que rompe React. La suite unitaria no puede contestarlo: su
  shim no tiene ningun constructor de elemento, que es por lo que el defecto vivio ahi.
  Candado nuevo `e2e/fill-native-setter-check.mjs` (`npm run test:fill-setter`), en
  Chromium real, que lo mide con una **espia**: define un accessor propio de `value` en
  la instancia, que el setter nativo saltea y el fallback tocaria. 8 verificaciones,
  todas verdes: el descriptor nativo existe, `fill()` resuelve, escribe el valor, emite
  `input`, **no usa el fallback**, y lo mismo en la rama `TEXTAREA`.
- **El candado nuevo, probado en rojo:** se planto la regresion que vigila -- se quito el
  setter nativo de la rama de input y se asigna directo -- y el candado sale **codigo 1**
  con *"fill() used the NATIVE setter, not the fallback"* en rojo. Sobre el arbol
  arreglado sale codigo 0. El runtime se restauro byte a byte identico despues de la
  prueba, verificado.

**Alcance de lo que NO se toco:** `window.HTMLInputElement` no aparece mas sin guarda en
ningun archivo de `js/` (verificado con grep sobre los tres). El unico resto es la
mencion dentro del comentario que explica el arreglo.

**Severidad:** bloquea (un verbo central del protocolo se estrella, y con un error fuera
de contrato, en un entorno declarado soportado). **Quien decide:** nadie, es mecanico.
**Estado: CERRADO** (2026-10-26).

**Nota sobre una afirmacion del handoff, corregida:** *"suite del runtime (14 stages)
verde"* no era cierto. `stage4` tenia 2 casos rojos (este hallazgo, ya cerrado) y
`stage3-backend` **no puede correr en esta maquina y no es un defecto**: su propia
cabecera lo declara *local-only*, pide una `api_key` de un repositorio hermano
(`crm_desa/config/config.json`, que no existe aca) y pega contra un endpoint de LLM en
produccion. Lo verde medible es **18 de 19** archivos de la suite, y el que falta es
externo por diseno. Queda escrito asi para que la proxima sesion no lo lea como una
regresion.

---

### N-45 (nuevo, 2026-10-26, encontrado AL PUBLICAR) La portada del repositorio anuncia un alpha como la version publicada, y la promocion de `latest` es lo que la volvio falsa

**Como se encontro:** no leyendo. Se encontro **ejecutando el paso 6 del 4.3** -- publicar
el paquete y promover `latest` -- y despues recorriendo las ocho casillas del dueno contra
el servidor. La casilla 1 pide que *"la seccion 9 del SPEC diga lo mismo que el registro"*,
y al abrir el SPEC servido para comprobarlo aparecio la linea 4.

**Lo que se midio, en el arbol que acababa de salir en verde con 18 slots de version de
acuerdo:**

| superficie publicada | lo que declaraba |
| --- | --- |
| `SPEC.md` linea 3 | `**Version:** 2.5.0 (stable ...)` |
| `SPEC.md` linea 4 | `**Status:** v2.5.0-alpha.5 -- ... Promoted to npm dist-tag latest.` |
| `README.md` badge 1 | `status-2.5--alpha` (naranja) |
| `README.md` badge 2 | `spec-v2.5_alpha.5` (naranja) |
| `README.md` callout | `**v2.5.0-alpha.5 shipped** (2026-05-25) ... promoted to npm latest.` |
| `README.md` seccion | `## Status: alpha + stable in parallel` |
| `README.md` tabla | tres filas declarando `v2.5-alpha` |

El documento cuyo argumento de venta es que **no se contradice a si mismo** (N-05,
G3-DERIVA) se contradecia en sus primeras cuatro lineas, y la portada del repositorio
-- que el deploy tambien publica en `/nac-spec/README.md`, verificado 200 -- llamaba
alpha a la release estable.

**La parte que importa de la causa raiz, y es nueva:** esas frases **eran verdaderas**
hasta las 18:40 de hoy. `latest` apuntaba a `2.5.0-alpha.5`, asi que *"v2.5.0-alpha.5
... promoted to npm latest"* era un hecho. **El acto de promover `latest` es lo que las
volvio falsas.** No es una frase que se quedo vieja por olvido: es una asimetria
productor/consumidor donde el productor es un comando que se corre una vez en la vida
del release (`npm publish`) y los consumidores son dos documentos que nadie vuelve a
leer ese dia. Es la forma de N-17 trasladada a una superficie humana: una version
escrita a mano en un lugar que ningun candado podia ver.

**Por que los 18 slots no lo vieron:** porque ninguno miraba estos dos archivos. El
candado de versiones cubria el SPEC por su linea `**Version:**` y no por su linea
`**Status:**`, y no cubria `README.md` en absoluto. El gate reportaba *"All 18 version
slots agree on 2.5.0"* sobre una portada que decia alpha, y el reporte era correcto
en lo que media: media dieciocho casillas de las veinte que existen.

**Arreglado, la mitad que no cuesta una version:**

- `README.md`: los dos badges pasan a `status-2.5.0_stable-green` y `spec-v2.5-blue`; el
  callout anuncia `2.5.0 stable shipped (2026-10-26)` y nombra la seccion 9.1 como la
  regla que reserva `latest` para una estable; la seccion pasa a `## Status` con la 2.5.0
  estable como primer item y deja escrito que las cinco prereleases `2.5.0-alpha.N` siguen
  publicadas bajo el tag `alpha` y nunca se purgan; las tres filas de la tabla dicen `v2.5`.
- Se elimino tambien una promesa que la seccion de abajo ya contradecia en el mismo
  archivo: *"V24-04 snapshot versioning + OCC is in implementation and targets
  2.5.0-alpha.2 (or rc.1)"*, mientras la lista de SHIPPED mas abajo lo declara entregado.
- **El candado**: dos slots nuevos en `scripts/check-version-coherence.mjs`
  (`README status badge`, `README spec badge`), que llevan el gate de 18 a **20 slots**.
  Los badges se **decodifican**, no se matchean con una regex: shields.io escribe un
  guion literal como guion doble, asi que el badge de una prerelease se lee
  `2.6.0--alpha.1` y ninguna regex de semver lo reconoceria -- el probe reportaria
  "no nombra ninguna version" sobre un badge que nombra una.
- **Probado en rojo, y el primer caso no es hipotetico: es el README con el que la 2.5.0
  salio de verdad, restaurado textual.** Seis casos rojos nuevos (el README real, un badge
  dejado en la release anterior, la portada sin badge, un badge sin version, el badge de
  spec en la linea anterior, el badge de spec con cola de release) y un caso verde que es
  la contraparte: una frase que nombra una release vieja **sigue siendo legal**, porque la
  seccion de estado de este mismo README nombra las cinco alphas y las lineas 2.2 / 2.3 /
  2.4 y todas son historia verdadera. Un candado que las refutara seria N-41 otra vez en
  otro archivo. La suite pasa de **18 a 25 casos**.

**La mitad que SI cuesta una version, y por que no se toco:** la linea 4 de `SPEC.md`.
Se reescribio, se midio la consecuencia y se revirtio. Medido, no deducido:
`api/v/2.5.0/contract.json` publica `spec_sha384`, la huella de los bytes de `SPEC.md`,
asi que **cualquier edicion del SPEC mueve el contrato de una version ya publicada** --
que es exactamente lo que el metodo prohibe. La correccion del Status line necesita
**2.5.1**: salto de version, copia congelada nueva, entrada nueva en la cadena y **una
firma nueva del dueno**. Y el tarball `@nac3/runtime@2.5.0` ya publicado lleva ese
`SPEC.md` adentro, asi que tampoco se arregla deployando.

**Severidad:** avisa fuerte. No rompe nada ejecutable: rompe la primera impresion y la
coherencia del documento, en el unico dia en que el proyecto le pide a alguien que se
crea que una estable es estable. **Quien decide:** el dueno, y solo la mitad del SPEC
(publicar 2.5.1 hoy con esa linea arreglada, o llevarla a la 2.6). La mitad del README
y el candado son mecanicos y ya estan.

**Estado: CERRADO el README y el candado; ABIERTO el Status line del SPEC,**
esperando la decision de version.

---

## 4. Grupos de convergencia

Estos son el mismo problema visto de dos lados y **tienen que cerrarse juntos**:

- **G1-DISTRIBUCION** -- N-01, N-02, N-03, N-17. Cierra el agujero de integridad y de version del artefacto. N-01 no cierra sin N-17.
- **G2-CONTRATO-LEGIBLE** -- N-04, N-14, N-18. N-14 depende de la decision de N-04; N-04 no se puede comprobar sin N-18.
- **G3-DERIVA** -- N-05, N-06, N-07, N-13. Un solo pasada por el SPEC resuelve las cuatro, pero N-05 y N-06 necesitan aprobacion de redaccion.
- **G4-IDIOMAS** -- N-08, N-19. N-08 quedo reencuadrado: el hecho real es N-19.
- **G5-HONESTIDAD** -- N-09, N-11, N-12, N-20. N-09 no se puede decidir sin N-20; N-12 se apoya en N-11.
- **G6-ECOSISTEMA** -- N-15, N-16. Una sola linea en el pie de la portada cierra las dos.
- **G7-ALCANZABILIDAD** -- N-10, N-13, N-19. N-10 esta fuera de este repo.

Orden de cierre que se desprende de las dependencias, **sujeto a tu aprobacion**:

1. N-20 (frontera interno/publico) -- porque condiciona la decision de N-09 y el destino de este mismo archivo.
2. N-18 (el validador que reporta nivel) -- porque es el instrumento con el que se comprueban otras.
3. G1 (distribucion) -- N-17 primero, despues la decision D-01.
4. G3 (deriva del documento) -- mecanico salvo dos aprobaciones de redaccion.
5. G2 (contrato legible) -- depende de D-02.
6. G5, G4, G6, G7.

**Como quedo ese orden al 2026-10-24 (actualizado en vivo):**

- **(1) N-20: CERRADO**, aceptado por el dueno con verificacion de seguridad hecha. Ya no bloquea nada.
- **(2) N-18: PARCIAL.** La version del CLI esta cerrada. El reporte de nivel **no puede hacerse antes de D-02**: D-02 es lo que define que es un "nivel" comprobable. Asi que N-18 deja de ser el paso 2 y pasa a depender de D-02.
- **(3) G1: la causa raiz de N-17 esta CERRADA y con candado** (commit `b490968`, verificado en el CI real). N-02, N-03 y N-21 ya estaban cerrados. Lo que le queda a G1 es **ejecutar D-01 opcion C**: publicar la 2.5.0 estable. Eso cierra N-01 y el resto de N-17 de una sola vez.
- **(4) G3 (deriva del documento): es ahora el frente mecanico mas grande que esta desbloqueado**, y el que mas casillas mueve del bloque de verificacion de la seccion 5 (puntos 6 y 7). Pasa a ser el proximo trabajo.
- **Lo que esta trabado esperandote:** G2 por **D-02**, G4 por **D-03**. Nada mas.

**Orden vigente al cierre del 2026-10-24, con D-02 ya decidido y entregado:**

1. **G2 (contrato legible): CERRADO en lo que dependia de D-02.** N-04 cerrado, N-14 parcial con alcance acotado (codigos para los 5 baldes de `validate_global`, entra con la 2.5.0), N-18 desbloqueado: ahora existe una definicion comprobable de nivel contra la que el validador puede reportar.
2. **G3 (deriva del documento):** el frente mecanico mas grande y mas rentable -- mueve los puntos 6 y 7 del bloque de verificacion, y ahora tambien N-23.
3. **Redaccion de limites (D-04)** -- mueve el punto 3.
4. **N-18 segunda mitad:** el modo URL del validador y el reporte de nivel, apoyado en `levels.json`.
5. **2.5.0 estable (PND-032):** cierra N-01 y lo que queda de N-17, y es donde entran los codigos de `validate_global`.
6. **G4 cuando decidas D-03**, despues G6 y G7 (lo que no es externo).

**Lo unico que sigue trabado esperandote:** **D-03** (idiomas) y la custodia de la clave de firma de PND-034.

---

**Orden vigente al 2026-10-24 23:00 UTC, con G3 entregado salvo un nombre (PND-035):**

G3-DERIVA esta **cerrado en el repositorio** salvo N-06, que es una palabra tuya. Lo entregado: N-05 (las ocho lineas de deriva, mas dos que la auditoria no vio), N-07 (el typo en nueve archivos + derivados regenerados), N-13 (la seccion 13 con las preguntas adentro, su estado y dos direcciones que responden 200) y N-23 (la tabla normativa de roles pasa de 17 a 20 filas). Tres hallazgos nuevos salieron de hacerlo: **N-26** (`payload_schema` declarado y nunca leido), **N-27** (cuatro defectos en el gate de integridad, mas su suite de 16 casos que no existia) y **N-28** (los ids de encabezado derivan del titulo).

**Lo que ESTE trabajo volvio evidente, y cambia el orden de lo que falta:** el gate de contrato hashea `SPEC.md` entero en `generated_from.spec_sha384`. O sea que **cualquier** edicion del SPEC -- hasta un typo -- cambia `contract.json` y pone el gate en rojo con el mensaje "bump the version". Medido, no deducido: los dos gates estan hoy en rojo en la rama `release/2.5.0` y los dos dicen lo mismo. No es un estorbo, es el diseno: una edicion del contrato **es** una version nueva del contrato. La consecuencia practica es que **nada del contenido de G3 llega a la web sin el salto de version**, y por lo tanto el resto del backlog de superficie publica se acumula en la misma release en vez de salir de a goteo.

De ahi el orden que queda:

1. **N-06** -- una palabra tuya (A o B). Es lo unico de G3 que falta y toca la seccion 8, que el gate extrae con ancla.
2. **D-04, la seccion publica de limites** -- mueve el punto 3 del bloque de verificacion. Vos pediste aprobarla **frase por frase**, asi que se redacta y se te presenta antes de escribirla.
3. **G5 + G6 en la portada** -- N-11 (vigencia), N-12 (recibo al lado de cada cifra), N-15 (el enlace a Urazuke, que mueve el punto 4) y N-16 (las dos licencias en una linea). Son todas de la portada y van juntas.
4. **N-14 + la segunda mitad de N-18** -- codigos para los cinco baldes de `validate_global` y el modo URL del validador apoyado en `levels.json`. Tocan el runtime.
5. **N-24** -- el testigo que falta dentro del paquete de npm. Se arregla cuando el indice se mueva, que es ahora.
6. **El salto a 2.5.0 y la publicacion** (PND-032): regenerar los cuatro generadores, firmar con la clave offline, correr las cuatro suites sobre un arbol otra vez coherente, publicar y promover el dist-tag.
7. **G4 cuando decidas D-03**, y con el N-28 y las nueve traducciones.

---

**Orden vigente al 2026-10-25 00:30 UTC, con N-06 decidido y entregado:**

**G3-DERIVA esta CERRADO en el repositorio, completo.** N-05, N-06, N-07, N-13 y N-23, los cinco. De hacerlo salieron cinco hallazgos nuevos: N-26, N-27, N-28, y hoy **N-29** (`conformance_tier` habla el vocabulario retirado) y **N-30** (la suite del gate de contrato quedaba ciega durante un release).

**Lo que falta para la 2.5.0, en orden:**

1. **D-04, la seccion publica de limites** -- mueve el punto 3 del bloque de verificacion. Pediste aprobarla **frase por frase**, asi que se redacta y se presenta antes de escribirla.
2. **G5 + G6 en la portada** -- N-11 (vigencia), N-12 (recibo al lado de cada cifra), N-15 (el enlace a Urazuke, que mueve el punto 4) y N-16 (las dos licencias en una linea). Son todas de la portada y van juntas.
3. **N-14 + la segunda mitad de N-18** -- codigos para los cinco baldes de `validate_global` y el modo URL del validador apoyado en `levels.json`. Tocan el runtime, y con ellos conviene publicar el vocabulario del tier (**N-29**), que es la parte de N-29 que no necesita decision.
4. **N-24** -- el testigo que falta dentro del paquete de npm. Se arregla cuando el indice se mueva, que es en este release.
5. **El salto a 2.5.0 y la publicacion** (PND-032). Lo que este tramo agrego a esa lista, medido y no deducido: hay que **regenerar la copia congelada del runtime** (`js/<version>/nac.js`), no solo el contrato -- ver la consecuencia medida en N-07. Despues: firmar con la clave offline, correr las cuatro suites sobre un arbol otra vez coherente, publicar y promover el dist-tag.
6. **G4 cuando decidas D-03**, y con el N-28 (las dos mitades) y las nueve traducciones.

**Lo unico que sigue trabado esperandote: D-03 (idiomas).** Nada mas.

---

## N-21 [BLOQUEA] El deploy automatico esta muerto: GitHub Actions no arranca por un problema de facturacion

**Que esta mal:** el unico camino de publicacion que tiene el proyecto no corre. El workflow existe, el push entra, el run aparece en el historial y el job no llega a empezar.

**Evidencia medida por mi (2026-10-24 16:20 UTC):**

```
$ gh run view 40110823244
X The job was not started because your account is locked due to a billing issue.
  Rsync to GoDaddy: .github#1

$ gh run list --limit 12
2026-10-24T16:16:51Z  failure  40110823244  feat(seo): add generated sitemap.xml (61 curated urls)
2026-06-29T00:40:05Z  success  28341600586  fix(landing): drop the last MIT runtime reference
2026-06-29T00:39:35Z  success  28341587207  fix(landing): runtime is Apache-2.0, not MIT
2026-06-29T00:37:40Z  failure  28341536994  docs: refresh drifted spec/docs/types to v2.5.0-alpha.5

$ curl -s -o nul -w "%{http_code}" https://yujin.app/nac-spec/sitemap.xml
404
```

**Lectura:** el ultimo deploy verde es del **2026-06-29** (commit `96a0ea4`). Todo push posterior no se publico, incluido el de hoy. El fallo no es de codigo ni de red: es la cuenta de la organizacion bloqueada por facturacion, y el job no ejecuta una sola linea.

**Efecto:** lo que esta en produccion es exactamente el arbol de `96a0ea4`. Por eso el barrido de N0 encontro el sitio igual al repositorio: coincidian porque el repo no se movio desde esa fecha. Cualquier arreglo que toque la superficie publica queda en el repositorio y NO en la web. Eso alcanza a N-02, N-03, N-05, N-06, N-07, N-09, N-11, N-12, N-13, N-15, N-16, D-03, D-04 y al cierre de N-10.

**No esta mal:** el workflow en si. Lo verifique leyendo `deploy.yml`: hace rsync con `--delete-after` y excluye `.git/`, `.github/`, `.gitignore`, `node_modules/`, `_deploy_stage/`, `*.tsbuildinfo`, `*.log`, `IMPLEMENTATION_GUIDE.md`, `NPM_PUBLISH_RUNBOOK.md`, `PERFORMANCE_TEST_PLAN.md`, `PROJECT.md`, `PROMO_WEEK_*.md`, `PENDING_*.md`. `sitemap.xml` no matchea ninguna exclusion, asi que se publicaria en cuanto el job corra.

**Donde vive el arreglo:** fuera del codigo. Dos caminos:

1. **Destrabar la cuenta** (facturacion de la organizacion en GitHub). Cero cambios de codigo; el proximo push publica tambien lo ya pusheado. Es el unico camino que devuelve el pipeline a su lugar.
2. **Publicar a mano una vez**, con el mismo rsync del workflow. Requiere las tres credenciales que hoy solo existen como secretos del repo (`GODADDY_HOST`, `GODADDY_USER`, `GODADDY_SSH_KEY`). No las tengo y no corresponde que se peguen en el chat: el dueno las tiene en su maquina o puede recuperarlas del panel de secretos.

**Quien decide:** DUENO (es gasto / cuenta, no criterio tecnico mio).

**RESUELTO el 2026-10-24 a las 17:00 UTC.** El dueno tomo el camino 1: cambio el medio de pago y la cuenta quedo al dia. Lo que medi despues, en orden:

```
run 40113318771  workflow_dispatch  16:49 UTC  success  34s   <- el job arranca: la cuenta esta destrabada
run 40113417255  push 934dd4f       16:50 UTC  failure  10s   <- NO es facturacion: lo paro la compuerta de integridad
run 40113957823  push dcb71ea       16:58 UTC  success  24s   <- publica, y lo publicado se verifica
```

El segundo run merece su propio parrafo, porque es la parte que importa. No volvio a fallar por la cuenta: fallo porque la compuerta de integridad que se habia construido para N-02 detuvo el envio con `index.html:1601 integrity is stale for js/2.5.0-alpha.5/nac.js`. Y tenia razon. El hash publicado se habia calculado sobre 352.798 bytes -- los que tiene el archivo en un working tree de Windows, donde cada salto de linea ocupa dos caracteres -- mientras el servidor entrega 344.665 bytes. Mismo codigo fuente, bytes distintos, hash imposible de cumplir. Si la compuerta no hubiera existido, el deploy habria salido verde y el navegador de cada visitante habria rechazado el runtime en silencio. El arreglo quedo en dos commits: `0778d9f` fija los finales de linea del repositorio y ensena al generador a negarse a hashear bytes con CRLF (falla al generar, no en produccion), y `dcb71ea` recalcula el hash sobre los bytes reales.

**Criterio de aceptacion: CUMPLIDO.** Un push produjo un run `success` y el contenido publicado cambio: `/nac-spec/sitemap.xml` responde 200 con los 61 urls, la portada trae sus tres atributos `integrity`, y la ruta inmutable responde 200 con el hash que la portada declara.

**Efecto sobre el resto del backlog:** se levanta el bloqueo de publicacion. N-02 y N-03 quedan cerrados y verificados; N-10 queda cerrado en la parte que vive en este repo. Los demas hallazgos de superficie publica (N-05, N-06, N-07, N-09, N-11, N-12, N-13, N-15, N-16) pasan a ser comprobables desde afuera en cuanto se corrijan. **Contracara, y no es menor:** cada deploy verde publica todo `docs/`. Ver el agravante nuevo en N-20.

**Estado:** **CERRADO.**

**Perfiles afectados:**

- Adoptante nuevo: recibe la version de junio. Todo lo publicado despues de esa fecha, no.
- Adoptante existente: si sigue el repo, ve commits que nunca llegan al sitio.
- Agente externo que consume el contrato: lee una portada que puede estar hasta cuatro meses atrasada respecto del repositorio.
- Auditor de seguridad: no puede verificar ningun arreglo publicado hasta que haya deploy.

**Criterio de aceptacion por perfil:** un push nuevo produce un run con conclusion `success` y el contenido publicado cambia (por ejemplo `sitemap.xml` responde 200 con los 61 urls).

**Grupo de convergencia:** G1-PUBLICACION. Era el que bloqueaba el cierre de todo hallazgo cuyo arreglo se comprueba desde afuera.

---

## 5. Bloque de verificacion del dueno -- estado de hoy

Esto es lo que los comandos del pedido devuelven **hoy**, medido el 2026-10-24. Es la linea base contra la que se va a comparar.

| # | Comando | Esperado por el pedido | Devuelve hoy |
|---|---|---|---|
| 1 | `curl registry.npmjs.org/@nac3/runtime \| grep dist-tags` | lo que D-01 resuelva, y la seccion 9 diciendo lo mismo | `{"latest":"2.5.0-alpha.5","alpha":"2.5.0-alpha.5"}`; la seccion 9 no menciona prereleases |
| 2 | `curl /nac-spec/ \| grep -c "integrity="` | `> 0` | **`3` -- CUMPLE** (2026-10-24 17:00 UTC, desde que N-21 se destrabo) |
| 3 | `curl /nac-spec/ \| grep -c -i "does not cover"` | `> 0` | `0` |
| 4 | `curl /nac-spec/ \| grep -c -i "urazuke"` | `> 0` | `0` |
| 5 | `curl /sitemap.xml \| grep -c "nac-spec"` | `> 0` | `0` (7 URLs, ninguna de nac-spec) |
| 6 | `curl /nac-spec/SPEC.md \| grep -c "Asistive"` | `0` | en el servidor: `1`. **En el repositorio: `0` desde el 2026-10-24** (N-07). Pasa a verde cuando la 2.5.0 se publique. |
| 7 | `curl /nac-spec/SPEC.md \| grep -n "v2.1\|v2.3 stable\|v2.4 will"` | vacio o explicado | en el servidor: 8 lineas (54, 80, 317, 321, 722, 1075, 1164, 1167). **En el repositorio: vacio desde el 2026-10-24** (N-05). Pasa a verde cuando la 2.5.0 se publique. |
| 8 | `npx nac3 validate <demo>` | corre y reporta nivel | con URL: aborta, salida 2. Con directorio: corre, no reporta nivel |

Uno de ocho. Al escribirse esta tabla daba cero de ocho; el punto 2 pasa a verde el 2026-10-24 a las 17:00 UTC con el cierre de N-21, N-02 y N-03.

**Sigue en uno de ocho al cierre del 2026-10-24, y la razon vale mas que el numero.** Los puntos 6 y 7 ya dan lo que se les pide **medido contra el repositorio**, y siguen rojos en la tabla porque esta tabla mide **el servidor**, que es lo correcto: un adoptante no lee el repositorio. Y no se pueden publicar por separado, porque el gate de contrato hashea el SPEC entero: editarlo exige el salto de version. Asi que los puntos 6 y 7 estan **hechos y en cola**, no pendientes. La distincion importa para no confundir trabajo terminado con trabajo publicado -- y para no cantar verde antes de que el servidor lo entregue.

**Al cierre de N-06 (2026-10-25 00:30 UTC) sigue en uno de ocho, y ninguna casilla se movio.** Es correcto que no se moviera: N-06 renombro los niveles en el documento y en el contrato, y esta tabla mide el **servidor**. El punto 8 -- el unico que habla de niveles -- necesita la segunda mitad de N-18 (el modo URL del validador), no el nombre. Lo que si cambio es que **ahora existe contra que reportar un nivel**: `levels.json` publica los tres niveles con id no ambiguo, los 11 requisitos y cuales son decidibles por una maquina.

**Nota del tramo anterior, que se mantiene:** el trabajo de N-17 de esa tarde no mueve ninguna casilla de esta tabla. No las mueve porque esta tabla mide la **superficie publica** (lo que la portada y el SPEC dicen) y N-17 arreglo la **maquinaria de publicacion** (que lo que se publique coincida consigo mismo). Era el prerrequisito de la 2.5.0 estable, no un arreglo de contenido. Las seis casillas rojas que viven en este repositorio -- los puntos 3, 4, 6 y 7 -- se mueven con G3 y con la redaccion de limites, que son el trabajo siguiente. El punto 5 es externo y el 8 espera D-02. El punto 5 sigue en rojo y es externo: el sitemap de la raiz yujin.app no vive en este repo, aunque el sitemap.xml propio de /nac-spec/ ya responde 200 con los 61 urls. Los otros seis siguen esperando los arreglos de contenido.

**Estado al 2026-10-26, tras la redaccion de la superficie publica.** Los puntos **3 y 4
pasan a "hechos y en cola"**, el mismo estado que ya tenian 6 y 7: el texto esta escrito,
aprobado por el dueno y declarado en el manifest, y el servidor no lo entrega hasta el
salto a 2.5.0. Medido contra el repositorio el 2026-10-26: `does not cover` = **1**
(encabezado, texto visible), `urazuke` = **mas de cero** (seccion de limites + enlace del
pie). **La tabla sigue diciendo uno de ocho** y es correcto que lo diga: mide el servidor.

**Y una leccion sobre esta tabla misma, que salio de probar el candado en rojo.** Los
criterios de los puntos 3 y 4 son un `curl | grep -c`, y **un comentario HTML los satisface
sin que ningun lector vea nada**. Paso de verdad: la primera version de la seccion llevaba
el encabezado repetido en un comentario de provenance, se borro la seccion entera para
probar el gate en rojo, y los dos greps siguieron en verde. El comentario se reescribio
para no contener la frase, y el gate `e2e/landing-limits-check.mjs` mide ahora el **texto
renderizado** de la seccion y la **declaracion en el manifest**, con el grep crudo apenas
como espejo del comando del dueno. Es el mismo corolario de la seccion 8 del handoff: una
comparacion que no puede fallar no es una verificacion, es una ceremonia. **Cuando se
recorran las ocho casillas contra el servidor, los puntos 3 y 4 se dan por verdes con el
gate, no con el grep.**

**Estado al 2026-10-26, tras cerrarse N-18.** El **punto 8 pasa a "hecho y en cola"**, el
mismo estado que ya tenian 3, 4, 6 y 7. El comando del pedido es `npx nac3 validate`, que
baja el paquete de npm: el CLI ya hace lo que la casilla pide --
`node runtime/dist/cli.js validate <url> --drive` reporta
`nac3-conformance-level-N` con su identificador publicado y su cobertura -- y el
**`npx` sigue trayendo el CLI viejo hasta que la 2.5.0 se publique**. Asi que la tabla
sigue diciendo **uno de ocho** y sigue siendo correcto que lo diga: mide lo que un
adoptante recibe, no lo que hay en el arbol.

Lo que esto cambia de verdad: **las ocho casillas estan ahora en un solo estado --
una verde, seis hechas y en cola detras del salto de version, y la quinta externa.**
Ninguna espera trabajo nuestro.

Y una advertencia medida al correr el validador nuevo contra la portada servida desde
este repositorio: **la portada sirve hoy una copia congelada del runtime que es anterior
al arreglo de N-33**, asi que su `validate_global` no ve sus propios manifests y reporta
128 huerfanos falsos. El validador lo detecta por su firma (manifests registrados + ids
en el DOM + cero ids declarados) y lo dice como **advertencia sobre el instrumento**, no
como defecto de la pagina. Se destraba solo con el paso 2 del salto de version, que
regenera `js/2.5.0/nac.js`.

---

**ESTADO AL 2026-10-26 19:05 UTC, MEDIDO CONTRA EL SERVIDOR Y CONTRA EL REGISTRO POR
PRIMERA VEZ DESDE QUE LA 2.5.0 ESTA PUBLICADA. Pasa de 1/8 a 7/8, y el unico rojo que
queda es el externo.**

La 2.5.0 estable salio: el dueno firmo el indice (`signed_at 2026-10-26T18:36:51Z`),
`main` se movio por fast-forward a `709b05f`, el deploy (run `40380029640`) dio **success
en sus 17 pasos**, incluidos los cuatro chequeos de humo contra el sitio vivo y la
verificacion del contrato publicado **desde afuera** con `--expect-head-from-repo`.

| # | Comando del dueno | Devuelve ahora | Veredicto |
|---|---|---|---|
| 1 | `curl registry.npmjs.org/@nac3/runtime \| grep dist-tags` | `{"latest":"2.5.0","alpha":"2.5.0-alpha.5"}` | **VERDE en el registro.** `latest` apunta a la estable y las cinco prereleases quedan bajo `alpha`, que es exactamente lo que la seccion 9.1 manda y lo que D-01 opcion C decidio. El registry tardo unos 25 minutos en publicar el packument despues de aceptar el publish (*"being processed"*), asi que la primera medicion de esta casilla dio el valor viejo: **la aceptacion del publish no es la publicacion**, y conviene re-medir contra el packument y no contra la salida de `npm publish`. La otra mitad del criterio -- *"y la seccion 9 diciendo lo mismo"* -- es la que destapo **N-45**. |
| 2 | `curl /nac-spec/ \| grep -c "integrity="` | `4` | **VERDE** |
| 3 | `curl /nac-spec/ \| grep -c -i "does not cover"` | `1` | **VERDE.** Y como quedo escrito arriba, esta casilla se da por verde con el gate `e2e/landing-limits-check.mjs` (texto renderizado + declaracion en el manifest), no con el grep, que un comentario HTML satisface. |
| 4 | `curl /nac-spec/ \| grep -c -i "urazuke"` | `7` | **VERDE**, misma salvedad que el 3 |
| 5 | `curl /sitemap.xml \| grep -c "nac-spec"` | `0` | **ROJO Y EXTERNO.** El sitemap de la raiz `yujin.app` no vive en este repositorio. El propio de `/nac-spec/sitemap.xml` responde **200**. Es el unico item que puede quedar rojo sin ser deuda nuestra. |
| 6 | `curl /nac-spec/SPEC.md \| grep -c "Asistive"` | `0` | **VERDE.** Estaba "hecho y en cola" desde el 2026-10-24; el servidor lo entrego hoy. |
| 7 | `curl /nac-spec/SPEC.md \| grep -n "v2.1\|v2.3 stable\|v2.4 will"` | vacio (0 lineas) | **VERDE.** Idem: ocho lineas en el servidor el 2026-10-24, cero ahora. |
| 8 | `npx nac3 validate <demo>` | corre y reporta nivel | **VERDE, y medido donde importa: desde un directorio adoptante vacio**, instalando solo lo que la casilla implica (`npm i -D playwright @nac3/runtime`). `npx nac3 validate https://yujin.app/nac-spec/` devuelve `runtime on the page 2.5.0 (spec v2.5)`, `validator 2.5.0`, los 11 requisitos uno por uno con su motivo medido, y `Conformance level: NONE ASSERTED` nombrando los tres que fallan medidos (L2-f6a7aa72, L3-cc540e31, L3-4bdc1b16 -- que son N-37, N-36 y N-35, los tres esperando decision del dueno) y los dos que no midio. Salida 1, que es correcto: no afirma un nivel. **Con `npx` a secas, sin playwright, da salida 3** y la causa con su arreglo en tres lineas, por decision de diseno: un runtime que arrastrara un navegador a cada instalacion le cobraria el navegador a todo adoptante que nunca lo corre. |

**Los tres testigos de la cabeza de cadena, verificados de punta a punta y por separado
(N-24).** Hasta hoy el tercero no existia; ahora se midieron los tres y coinciden:

| testigo | de donde se leyo | cabeza |
| --- | --- | --- |
| host | `curl https://yujin.app/nac-spec/api/index.json` | `sha384-tBEQVA0WiCwv...` |
| paquete | `npm pack @nac3/runtime@2.5.0` y leer `contract-head.json` del tarball | `sha384-tBEQVA0WiCwv...` |
| repositorio | `api/index.json` en git | `sha384-tBEQVA0WiCwv...` |

El del paquete es el que un host comprometido no puede alcanzar: npm no permite
republicar una version. Y el CLI publicado se declara `@nac3/runtime CLI 2.5.0 (Native
Agent Contract v2.5)`, con lo cual N-17 queda cerrado **en el registro** y no solo en el
arbol -- era el hallazgo que decia que el tarball publicado anunciaba una version dos
releases atras.

**La advertencia sobre el instrumento quedo resuelta sola, y se midio.** El 2026-10-26 por
la manana el validador avisaba que la portada servia una copia congelada anterior al
arreglo de N-33 y reportaba **128 huerfanos falsos**. Contra el servidor de hoy:
**64 ids declarados, 64 ids resueltos, 0 hallazgos de severidad error**, sin advertencia
de instrumento. Los 128 ids del DOM contra 64 declarados son N-31 (`PND-038`), que es un
hallazgo abierto y conocido, no el defecto del instrumento.

**Y la casilla 1 destapo N-45**, que es el hallazgo nuevo de esta tanda: su criterio pide
que *"la seccion 9 del SPEC diga lo mismo que el registro"*, y al abrir el SPEC servido
para comprobarlo aparecio su linea 4 declarando un alpha como la version publicada. Ver
la entrada N-45: el README y el candado estan cerrados, la linea del SPEC necesita 2.5.1.

## 6. Que no hice

- **No corregi nada.** Ni una linea del sistema. Este documento es la compuerta del PASO 0.
- **No elegi** en N-01, N-04, N-08 ni N-09.
- **No publique ni enlace** ningun documento marcado interno. El documento interno de cobertura esta publicado por el deploy y lo reporto en N-20 sin dar su ruta.
- **No pushee.** Hay dos commits locales sin subir de la estacion N0, mas este archivo sin commitear. El push publica `docs/`, asi que el destino de este archivo es parte de N-20.

---

## 7. Lo que necesito de vos para seguir

Lista original del 2026-10-24, con lo que se resolvio tachado al pie.

1. **Aprobar o corregir este backlog.** Nada se toca antes.
2. **D-01, D-02, D-03, D-04:** las cuatro decisiones, con las opciones de arriba.
3. **N-10:** donde vive el sitio raiz de yujin.app, o lo dejo como pendiente externo.
4. **El destino de este archivo:** `docs/` se publica. Decime si lo muevo fuera del alcance del deploy o si primero arreglamos N-20.
5. **El punto 8 del bloque de verificacion:** lo corrijo (N-18) o lo cambias. Hoy no se puede cumplir.

**Estado de esa lista al 2026-10-24, fin de sesion:**

- **(1) RESUELTO.** Backlog aprobado tal como estaba.
- **(2) DOS DE CUATRO.** **D-01 = opcion C** (2.5.0 estable, promovida a `latest`). **D-04 = se escribe la seccion de limites**, desbloqueado al cerrarse N-20. **D-02 y D-03 siguen abiertas** y son lo unico que traba G2 y G4.
- **(3) ABIERTO, externo.** Sigue sin ubicarse el repositorio del sitio raiz de yujin.app. El sitemap propio de `/nac-spec/` ya responde 200 con 61 urls; falta solo que la raiz lo enlace.
- **(4) RESUELTO.** El archivo se queda en `docs/` y se publica. Decision del dueno al cerrar N-20: no hay material secreto, solo trabajo en curso.
- **(5) RESUELTO EN PARTE, y la parte que falta depende de (2).** La deriva de version del CLI esta cerrada. El reporte de nivel necesita **D-02** primero, porque D-02 es lo que define que es un nivel comprobable. El punto 8 del bloque de verificacion sigue sin poder cumplirse hasta entonces.

**Estado al 2026-10-25 00:30 UTC:**

- **(2) TRES DE CUATRO.** **D-01 = opcion C**, **D-02 = SI** (API estatica, multiversion, `latest` sin purga, a prueba de manipulacion, con clave offline en custodia del dueno) y **D-04 = se escribe la seccion de limites**. Ademas, fuera de las cuatro: **N-06 = opcion A**. **D-03 (idiomas) es la unica que sigue abierta.**
- **(5) Sigue en pie la mitad que falta**, y ya no depende de una decision: existe `levels.json` con los niveles como dato, asi que el reporte de nivel del validador es trabajo, no espera.

**Lo unico que te pido ahora: D-03.** Todo lo demas que esta desbloqueado puede avanzar sin vos.

**Estado al 2026-10-26 (cierre de sesion por actualizacion de Forge).** El alcance quedo
acotado por el dueno: **Urazuke sale de la 2.5.0 y pasa a la 2.6**; "todos los pendientes"
son los que NO son peldanos del metodo. **D-03 sigue siendo lo unico que se espera del dueno**,
y no frena el arranque: el trabajo de redaccion de la superficie publica (D-04/N-09, N-15,
N-16, N-12, N-11, N-14) no depende de ella. El orden exacto de reanudacion, los dos gates
rojos con su lectura y los tres cierres que el clasificador de Forge rechazaba estan en
`docs/HANDOFF_NEXT_SESSION.md`.
