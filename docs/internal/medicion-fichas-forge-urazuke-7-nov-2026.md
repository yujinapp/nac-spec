# Las fichas de Forge y de Urazuke, medidas -- 7 de noviembre de 2026

Documento interno. Vive bajo `docs/internal/`, que el despliegue excluye entero.
Cada numero de abajo trae el comando que lo produjo. Lo medido se separa de lo
creido, y lo que este trabajo no puede ver se nombra.

## 1. El despliegue a produccion

Commit `86c0289` empujado a `main` el 2026-11-07 12:09 UTC.

| Que | Resultado | Como se midio |
|---|---|---|
| Run de Actions | **success** | `gh run view 42371210702` |
| El sitio sirve este arbol | 13 de 13 OK, version 2.5.2 | `npm run smoke:live` (externo) |
| La API de contrato verifica | 10 de 10 OK, firma + testigo | `npm run verify:contract` |
| Candado de montaje | PASSED, 321 paginas, 10/10 declaraciones | `npm run check:mount` |
| Paquete publicado = este arbol | 22 de 22 archivos identicos, 0 lineas | `npm run check:npm` |

### Los tres documentos internos quedaron fuera del sitio

Verificado desde afuera, con control positivo:

```
404  /nac-spec/docs/internal/aocr-org-quienes-son-y-por-que-te-mandan-gente-7-nov-2026.md
404  /nac-spec/docs/internal/d-02-hoja-para-decision-el-sitio-solo-existe-bajo-nac-spec.md
404  /nac-spec/docs/internal/medicion-de-visibilidad-de-nac-spec-7-nov-2026.md
404  /nac-spec/docs/internal/            (el directorio)
404  /nac-spec/docs/DISCREPANCIES.md     (control negativo: tambien excluido)
200  /nac-spec/docs/ELIGIBILITY.md       (control positivo: la sonda SI ve docs/)
```

El 200 del control es lo que hace que los 404 signifiquen algo.

### Un falso rojo que conviene conocer

`npm run verify:npm` da **FAIL** hoy, y es correcto que lo de. Ese script corre en
modo `post-publish`, cuyo testigo es el arbol de trabajo: esta hecho para correr
inmediatamente despues de publicar. Entre una version y la siguiente va a dar rojo
por cualquier linea que `runtime/` haya ganado desde el ultimo release -- hoy, una
sola: el hook `postpublish` que agrego el commit `2d97b4c` (2026-10-28), que es el
propio candado instalandose.

El que vale es `npm run check:npm` (modo `release --witness-release`), que compara
contra el commit de release de 2.5.2 (`857c136`) y da **22 de 22 archivos identicos**.
Es el que corre CI. Diferencia exacta, medida desempaquetando el tarball publicado:

```
83c83,84
<     "prepublishOnly": "... && npm test"
---
>     "prepublishOnly": "... && npm test",
>     "postpublish": "node ../scripts/verify-npm-publication.mjs --mode post-publish ..."
```

Dos imprecisiones del propio candado, registradas sin tocarlas (regla 3): informa
"12 line(s)" cuando difiere **una** (compara por posicion, y una linea insertada
corre las doce siguientes), y el nombre `verify:npm` no dice que su testigo es otro.

## 2. La ficha de Forge

### npm: `@nac3/forge-cli` -- esta bien hecha, y su enlace principal es un 404

| Campo | Valor | Lectura |
|---|---|---|
| Version | 1.28.0 (tag `latest`), 218 versiones | activo |
| Publicado desde | 2026-05-27; ultimo 2026-11-04 | |
| Descargas | **11.202** el mes pasado, **2.659** la semana | 18x el runtime de NAC3 |
| Palabras clave | **20** | el techo util |
| Descripcion | 134 caracteres, dice que es la cosa | bien |
| README publicado | 21.500 caracteres | la pagina no esta vacia |
| `homepage` | `github.com/yujinapp/yujin-forge#readme` | **404 anonimo** |
| `repository` | el mismo repo privado | **404 anonimo** |
| `license` | `SEE LICENSE IN LICENSE` | npm no muestra insignia |

El 404 esta **verificado sin credenciales** (`fetch` sin token: 404 para
`yujinapp/yujin-forge`, 200 para `yujinapp/nac-spec`, 200 para `pkuschnirof/urazuke`).
El repositorio es privado (`"private": true`, `gh api repos/yujinapp/yujin-forge`),
y un repositorio privado le contesta 404 a quien no tiene acceso.

Es decir: **11.202 descargas al mes contra una pagina cuyo "mas informacion" no
existe.** Y si hay pagina publica: `https://yujin.app/yujin-forge/` contesta **200**,
y la portada de yujin.app ya la enlaza.

Dos cosas mas, chicas:

* El README publicado abre con "Status: v1.0.51 (2026-06-28)" mientras el paquete
  va en 1.28.0 del 4 de noviembre. La primera pantalla declara una version de hace
  cinco meses.
* `@nac3/forge-rn` (0.1.0-alpha.3, ultimo publicado 2026-09-02) declara
  `homepage: https://yujin.app/forge`, que da **404**. La direccion viva es
  `/yujin-forge/`.

### GitHub: el codigo real es privado, y hay un esqueleto publico con su nombre

| Repositorio | Visibilidad | Tamano | Ultimo empuje | Temas | Sitio |
|---|---|---|---|---|---|
| `yujinapp/yujin-forge` | **privada** | 53,7 MB | 2026-11-04 | 0 | - |
| `pkuschnirof/yujin-forge` | **publica** | 0,12 MB | 2026-05-18 | 0 | - |

El publico es un esqueleto de mayo: README, `package.json`, `src/`, `templates/`,
`tests/`. Su descripcion vende un producto comercial. Quien busque "yujin forge" en
GitHub encuentra ese, no el sistema.

Mientras el repositorio real sea privado, ponerle temas y sitio no sirve de nada:
nadie los ve. La ficha de GitHub de Forge no es un trabajo pendiente -- es una
decision previa: **que parte de Forge es publica.**

## 3. La ficha de Urazuke

`pkuschnirof/urazuke`, publica, creada 2026-10-17, ultimo empuje 2026-11-03, 35,6 MB.

| Campo | Hoy | Problema |
|---|---|---|
| Descripcion | "... (nombre provisorio; en elaboracion)" | contradice al README y al sitio |
| `homepage` | **vacio** | `yujin.app/urazuke/` contesta 200 |
| Temas | **0** | fuera de todo indice tematico |
| Licencia que GitHub reconoce | **NOASSERTION** | no muestra insignia de licencia |
| Vista previa social | sin imagen propia | tarjeta generica al compartir |
| Wiki | habilitada, vacia | pestana muerta |

Las cuatro primeras son las que cuestan.

**La descripcion se desdice del resto.** El README dice que el metodo esta
"aca entero y bajo licencia libre", el sitio esta publicado y el nombre tiene
etimologia escrita (urazukeru: respaldar con pruebas). La ficha, en cambio,
dice "nombre provisorio; en elaboracion" -- que es lo primero que lee alguien que
llega, y le dice que no mire todavia.

**La licencia no se ve.** El `LICENSE` arranca con tres lineas propias
(titulo del metodo y el copyright) antes del texto de Creative Commons, y el detector
de GitHub no lo reconoce: la ficha queda en "NOASSERTION". Para quien evalua, un
repositorio sin licencia declarada es un repositorio que no puede usar.

### Cuanta gente lo mira

| Medida | 14 dias | Como se midio |
|---|---|---|
| Visitas / personas | 23 / **5** | `gh api repos/.../traffic/views` |
| De donde vienen | yujin.app 5, github.com 1 | `traffic/popular/referrers` |
| Clonados / origenes | 740 / 228 | `traffic/clones` |
| Corridas de CI propias | 82 runs x 2 trabajos = ~164 | `gh run list` |

**Los 740 clonados no son adopcion.** Su propia cadena explica del orden de 164, y el
resto no se puede atribuir: GitHub cuenta un origen por dia y las direcciones de los
ejecutores cambian. El numero honesto de Urazuke es el de personas: **cinco en dos
semanas, cinco de las seis llegadas desde tu propio sitio.** El sitio es su unico
canal.

(Para contraste, los 492 clonados de nac-spec si sobreviven la resta: 34 corridas de
un solo trabajo explican ~34, y quedan ~138 origenes sin explicar. Lo que te dije
ayer sobre eso se sostiene.)

## 4. Lo que aparecio sin buscarlo: hay un nac-spec viejo publico que te roba las visitas

`pkuschnirof/nac-spec`, **publica**, ultimo empuje 2026-05-10. No es una bifurcacion:
es una copia independiente de **NAC v1.0**, que llamaba al protocolo
"Navegabilidad Automatica Compliance". Tiene 8 temas y su `homepage` se apunta a
si misma.

| 14 dias | `pkuschnirof/nac-spec` (viejo) | `yujinapp/nac-spec` (el real) |
|---|---|---|
| Visitas | 37 | 17 |
| **Personas** | **34** | **11** |
| Clonados / origenes | 6 / 6 | 492 / 172 |
| Referentes | github.com (1) | github.com (3), aocr.org (3) |

**Tres de cada cuatro personas que miran un nac-spec estan mirando el muerto.** Y no
miran la portada de paso: lo mas leido es `CHANGELOG.md` (5 personas, 128 KB de
historial de v1.0), despues la portada, despues `docs/IMPACT_RPA.md` y
`docs/PHILOSOPHY.md`. Es gente evaluando.

Lo que ven: un protocolo con otro nombre, detenido en mayo, con `PromptEvaluacion*.txt`
y `EvidenciaInline_v*.txt` en la raiz. Sin referente externo -- llegan por el buscador
de GitHub o por tu perfil.

Esto corrige la medicion de ayer en la direccion incomoda: **no son 11 personas
mirando, son 45; y el 76% aterriza en la version equivocada.**

## 5. Deberia estar Urazuke en npm

El nombre `urazuke` esta **libre** (`npm view urazuke` -> 404).

**A favor.** El contenido tiene forma de paquete: `gates/*.json` (catalogo, peldanos,
estaciones, evaluadores, heuristicas, linea base, adaptadores, esquema), `build/*.mjs`
que son los evaluadores ejecutables, y `tests/` con su contraparte en rojo para cada
uno. Forge ya consume la escalera; si la leyera de un paquete con version en vez de
llevar su propia copia, la escalera pasaria a ser un **contrato versionado** y no dos
copias que pueden separarse. `npx urazuke` seria, ademas, una forma fuerte de repartirlo.

**En contra.** Hoy nadie lo instalaria, y cada artefacto publicado es **una puerta mas
que hay que verificar**. Las dos puertas de nac-spec costaron trabajo real: traer el
tarball de vuelta y compararlo byte por byte, y verificar el sitio desde afuera. Una
tercera que nada instala compra riesgo de divergencia a cambio de nada. Sumado a que
el publico de npm instala bibliotecas, no metodos: a Urazuke lo encuentran por el
sitio y por el repositorio, que es exactamente lo que muestra su medicion.

Y hay un nudo que decide el dueno, no yo: **Creative Commons BY-SA 4.0 sobre
artefactos con forma de codigo.** El "compartir igual" sobre `build/*.mjs` le hace
dudar a cualquiera que quiera meter los evaluadores en su propia cadena. El reparto
habitual es permisiva para el codigo y BY-SA para la prosa. No lo toco.

**Recomendacion: no ahora.** El momento de publicarlo es cuando Forge lea la escalera
del paquete en vez de llevar su copia -- ahi la version pasa a ser un contrato y la
puerta se gana su candado. Hasta entonces, lo que rinde es la ficha de GitHub, que es
donde su publico efectivamente aterriza. Si el nombre libre te inquieta, un `0.0.1`
que contenga solo el README apuntando al metodo lo reserva y cuesta nada -- pero sigue
siendo un artefacto publicado, y conviene decirlo en voz alta antes que despues.

## 6. Donde se sube la imagen de vista previa social

No hay API: se sube solo por la web, en los ajustes generales del repositorio,
seccion **Social preview**.

* nac-spec: `https://github.com/yujinapp/nac-spec/settings`
* Urazuke: `https://github.com/pkuschnirof/urazuke/settings`

Formato: PNG, JPG o GIF; **1280 x 640 px** recomendado (minimo 640 x 320); hasta 1 MB.

Medido con `gh repo list --json usesCustomOpenGraphImage`: de los 21 repositorios de
la cuenta, **ninguno** tiene imagen propia.

## 7. Lo que este trabajo no puede ver

* **Quienes son las 45 personas.** GitHub no da identidad, solo cuentas.
* **Si los 740 clonados de Urazuke tienen algo real adentro.** La resta de la cadena
  propia es una estimacion, no una medicion: GitHub no dice que origen fue cual.
* **El origen de una visita es falsificable.** Las tres de aocr.org pueden ser tres
  personas o tres pedidos fraguados.
* **Nada de lo que pase detras de un login ajeno**, incluido el Hub de aocr.org.
* **Si hay adopcion en codigo privado** o fuera de GitHub.
* **Los datos de trafico caducan el 12 de noviembre.** GitHub guarda catorce dias y
  no deja registro historico. El dueno decidio no fijarlos.
