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

*Producido en la estación N2 de la escalera Urazuke. Una entrada de este archivo
no se edita después de escrita: si el dueño cambia de opinión, se agrega una
entrada nueva con la fecha nueva y la anterior queda como historia.*
