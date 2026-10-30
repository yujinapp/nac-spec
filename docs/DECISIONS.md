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

*Producido en la estación N2 de la escalera Urazuke. Una entrada de este archivo
no se edita después de escrita: si el dueño cambia de opinión, se agrega una
entrada nueva con la fecha nueva y la anterior queda como historia.*
