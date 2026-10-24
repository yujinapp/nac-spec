# Backlog de auditoria externa -- NAC3 / nac-spec

- Fecha de este documento: 2026-10-24
- Auditoria de origen: Claude Code, revision externa de portada publica, SPEC.md, registro npm, cabeceras HTTP y sitemap.
- Estado global: **ABIERTO -- 6 de 24 cerrados** (N-21, N-02, N-03, N-20, N-22 y N-04; todos el 2026-10-24). Parciales: N-14, N-17 y N-18. N-10 esta cerrado en la parte que vive en este repositorio y abierto en la que no.
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
| N-06 | Colision NAC-1/2/3 vs NAC3 | **CONFIRMADO**; la mitad que le importa a una maquina ya esta cerrada (`api/` publica el id `nac3-conformance-level-N`). Falta la prosa: **esperando el nombre, A o B** | avisa (decision del dueno) |
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

**Severidad:** avisa. **Quien decide:** el dueno elige el nombre nuevo; Forge redacta la nota de compatibilidad. **Estado:** **abierto, esperando una palabra del dueno** (A o B). Es lo unico de G3 que falta.

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

**Severidad:** bloquea. **Quien decide:** el dueno, frase por frase (ver D-04). **Estado:** abierto, bloqueado por N-20.

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

**Severidad:** registra. **Quien decide:** Forge propone la frase; el dueno aprueba. **Estado:** abierto.

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

**Severidad:** registra. **Quien decide:** Forge. **Estado:** abierto.

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

**Estado:** parcial -- version del CLI cerrada; modo URL y reporte de nivel abiertos, el segundo en espera de D-02.

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

**Severidad:** registra. **Quien decide:** Forge propone hacerlo junto con D-03. **Estado:** ABIERTO, con fecha de ejecucion atada a G4.

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

**Nota del tramo anterior, que se mantiene:** el trabajo de N-17 de esa tarde no mueve ninguna casilla de esta tabla. No las mueve porque esta tabla mide la **superficie publica** (lo que la portada y el SPEC dicen) y N-17 arreglo la **maquinaria de publicacion** (que lo que se publique coincida consigo mismo). Era el prerrequisito de la 2.5.0 estable, no un arreglo de contenido. Las seis casillas rojas que viven en este repositorio -- los puntos 3, 4, 6 y 7 -- se mueven con G3 y con la redaccion de limites, que son el trabajo siguiente. El punto 5 es externo y el 8 espera D-02. El punto 5 sigue en rojo y es externo: el sitemap de la raiz yujin.app no vive en este repo, aunque el sitemap.xml propio de /nac-spec/ ya responde 200 con los 61 urls. Los otros seis siguen esperando los arreglos de contenido.

---

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

**Lo unico que te pido ahora: D-02 y D-03.** Todo lo demas que esta desbloqueado puede avanzar sin vos.
