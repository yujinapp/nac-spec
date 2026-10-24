# Backlog de auditoria externa -- NAC3 / nac-spec

- Fecha de este documento: 2026-10-24
- Auditoria de origen: Claude Code, revision externa de portada publica, SPEC.md, registro npm, cabeceras HTTP y sitemap.
- Estado global: **ABIERTO -- nada corregido**. Este archivo es la compuerta del PASO 0.
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
| N-02 | Portada sin SRI | **CONFIRMADO** | avisa |
| N-03 | URL mutable con query | **CONFIRMADO** | avisa |
| N-04 | Contrato no legible por maquina | **CONFIRMADO** | bloquea (decision del dueno) |
| N-05 | Deriva de versiones en SPEC.md | **CONFIRMADO** | bloquea |
| N-06 | Colision NAC-1/2/3 vs NAC3 | **CONFIRMADO** | avisa |
| N-07 | Typo "Asistive" en encabezado normativo | **CONFIRMADO** | registra |
| N-08 | "10 idiomas" vs spec en un idioma | **REFUTADO en su premisa** -- ver N-08, se reencuadra en N-19 | registra |
| N-09 | Portada sin limites declarados | **CONFIRMADO** (hecho); el reencuadre cambia por N-20 | bloquea (decision del dueno) |
| N-10 | `/nac-spec/` fuera del sitemap | **CONFIRMADO**; arreglado EN ESTE REPO (2026-10-24, 61 urls) -- **no publicado**, ver N-21 | avisa |
| N-11 | Sin nota de vigencia (5 meses) | **CONFIRMADO** | avisa |
| N-12 | Cifras sin recibo al lado | **PARCIAL** -- los recibos existen, no estan anclados | avisa |
| N-13 | "Open questions (tracked separately)" sin direccion | **CONFIRMADO** | registra |
| N-14 | Garantia de estabilidad no verificable | **CONFIRMADO** | bloquea |
| N-15 | Enlace de ida sin vuelta a Urazuke | **CONFIRMADO** | registra |
| N-16 | Licencias distintas no declaradas | **PARCIAL** -- NAC3 si declara Apache-2.0; falta Urazuke | registra |
| N-17 | El tarball publicado sirve el SPEC de la version anterior + cabecera MIT | **CONFIRMADO** (nuevo, mio) | bloquea |
| N-18 | `npx nac3 validate <url>` no existe y nunca reporta nivel | **CONFIRMADO** (nuevo, mio) | bloquea |
| N-19 | Las 9 traducciones publicadas son 30-38% del canonico | **CONFIRMADO** (nuevo, mio) | avisa |
| N-20 | No hay frontera interno/publico: el deploy publica todo el arbol | **CONFIRMADO** (nuevo, mio) | bloquea |

Resumen: 13 confirmados, 2 parciales, 1 refutado, 4 nuevos. Total 20 entradas abiertas.

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

**Dato que pesa en la eleccion y que no elijo yo:** con N-17 abierto, cualquiera de las dos opciones deja al adoptante nuevo recibiendo un artefacto cuyo SPEC interno dice `2.5.0-alpha.4`.

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

**Severidad:** avisa. **Quien decide:** Forge propone; el dueno aprueba el snippet. **Estado:** abierto.

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

**Severidad:** avisa. **Quien decide:** Forge propone. **Estado:** abierto.

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

**Severidad:** bloquea. **Quien decide:** el dueno (ver D-02). **Estado:** abierto.

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

**Severidad:** bloquea. **Quien decide:** Forge propone, el dueno aprueba cada reescritura que cambie una promesa. **Estado:** abierto.

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

**Severidad:** avisa. **Quien decide:** el dueno elige el nombre nuevo; Forge redacta la nota de compatibilidad. **Estado:** abierto.

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

**Severidad:** registra. **Quien decide:** Forge. **Estado:** abierto.

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

**Severidad:** registra. **Quien decide:** Forge. **Estado:** abierto.

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

**Severidad:** bloquea. **Quien decide:** el dueno, via D-02. **Estado:** abierto, bloqueado por N-04.

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

**Severidad:** bloquea. **Quien decide:** Forge arregla; el dueno aprueba la republicacion (prod es destino unico). **Estado:** abierto.

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

**Severidad:** bloquea. **Quien decide:** Forge propone el alcance (implementar el modo URL o corregir el pedido); el dueno aprueba. **Estado:** abierto.

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

**Severidad:** bloquea. **Quien decide:** Forge propone la politica; el dueno la aprueba. **Estado:** abierto.

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

**Perfiles afectados:**

- Adoptante nuevo: recibe la version de junio. Todo lo publicado despues de esa fecha, no.
- Adoptante existente: si sigue el repo, ve commits que nunca llegan al sitio.
- Agente externo que consume el contrato: lee una portada que puede estar hasta cuatro meses atrasada respecto del repositorio.
- Auditor de seguridad: no puede verificar ningun arreglo publicado hasta que haya deploy.

**Criterio de aceptacion por perfil:** un push nuevo produce un run con conclusion `success` y el contenido publicado cambia (por ejemplo `sitemap.xml` responde 200 con los 61 urls).

**Grupo de convergencia:** G1-PUBLICACION. Bloquea el cierre de todo hallazgo cuyo arreglo se comprueba desde afuera.

**Estado:** abierto.

---

## 5. Bloque de verificacion del dueno -- estado de hoy

Esto es lo que los comandos del pedido devuelven **hoy**, medido el 2026-10-24. Es la linea base contra la que se va a comparar.

| # | Comando | Esperado por el pedido | Devuelve hoy |
|---|---|---|---|
| 1 | `curl registry.npmjs.org/@nac3/runtime \| grep dist-tags` | lo que D-01 resuelva, y la seccion 9 diciendo lo mismo | `{"latest":"2.5.0-alpha.5","alpha":"2.5.0-alpha.5"}`; la seccion 9 no menciona prereleases |
| 2 | `curl /nac-spec/ \| grep -c "integrity="` | `> 0` | `0` |
| 3 | `curl /nac-spec/ \| grep -c -i "does not cover"` | `> 0` | `0` |
| 4 | `curl /nac-spec/ \| grep -c -i "urazuke"` | `> 0` | `0` |
| 5 | `curl /sitemap.xml \| grep -c "nac-spec"` | `> 0` | `0` (7 URLs, ninguna de nac-spec) |
| 6 | `curl /nac-spec/SPEC.md \| grep -c "Asistive"` | `0` | `1` |
| 7 | `curl /nac-spec/SPEC.md \| grep -n "v2.1\|v2.3 stable\|v2.4 will"` | vacio o explicado | 8 lineas: 54, 80, 317, 321, 722, 1075, 1164, 1167 |
| 8 | `npx nac3 validate <demo>` | corre y reporta nivel | con URL: aborta, salida 2. Con directorio: corre, no reporta nivel |

Cero de ocho. El bloque de verificacion esta escrito en verde y hoy da cero.

---

## 6. Que no hice

- **No corregi nada.** Ni una linea del sistema. Este documento es la compuerta del PASO 0.
- **No elegi** en N-01, N-04, N-08 ni N-09.
- **No publique ni enlace** ningun documento marcado interno. El documento interno de cobertura esta publicado por el deploy y lo reporto en N-20 sin dar su ruta.
- **No pushee.** Hay dos commits locales sin subir de la estacion N0, mas este archivo sin commitear. El push publica `docs/`, asi que el destino de este archivo es parte de N-20.

---

## 7. Lo que necesito de vos para seguir

1. **Aprobar o corregir este backlog.** Nada se toca antes.
2. **D-01, D-02, D-03, D-04:** las cuatro decisiones, con las opciones de arriba.
3. **N-10:** donde vive el sitio raiz de yujin.app, o lo dejo como pendiente externo.
4. **El destino de este archivo:** `docs/` se publica. Decime si lo muevo fuera del alcance del deploy o si primero arreglamos N-20.
5. **El punto 8 del bloque de verificacion:** lo corrijo (N-18) o lo cambias. Hoy no se puede cumplir.
