# D-02 -- El sitio solo existe correctamente bajo `/nac-spec/`

**Hoja para tu decision.** Estacion N2 de Urazuke. Fecha: **2026-10-30**.
Discrepancia 2 de 8 · Decididas hasta hoy: **1** (D-01, *"Se queda como esta"*).
Registro completo: `docs/DISCREPANCIES.md` · Tus decisiones: `docs/DECISIONS.md`.

> Esta es una **decision tuya**, no un bug. El codigo hace una cosa, el sitio
> promete otra, y cual de las dos tiene razon lo decidis vos (regla 10 del
> contrato). **No se toco nada.**

---

## Lo que pasa, en una frase

El producto **esta clavado a la direccion `/nac-spec/`**. Si alguien baja este
proyecto y lo sirve desde otra raiz, la mayoria de las paginas abren sin el
motor: el navegador pide el motor a una direccion que ahi no existe y sigue de
largo. En produccion funciona, porque produccion **es** `/nac-spec/`.

---

## La evidencia de las dos puntas

| Punta | Que dice |
|---|---|
| **Lo generado** | **273 paginas** piden el motor por direccion absoluta: 235 traducciones, 21 documentos, 11 guias, 6 en la raiz |
| **Lo escrito a mano** | las **14 paginas de entrada** -- la portada y los 13 ejemplos -- lo piden por direccion relativa, asi que **esas si** funcionan en cualquier raiz |
| **El productor** | la direccion absoluta la escribe **un solo lugar**: el generador de paginas. Las 273 son su salida, no 273 decisiones sueltas |
| **El sitio promete** | *"All of them open in your browser"* (seccion de demos de la portada) |
| **El recibo del 24** | servidas desde la raiz en una maquina local, esas paginas cargan **sin motor** |

### Correccion de una medicion mia

Esta manana escribi **260 paginas**. Al re-medirlo para traertelo, el numero **no
se reprodujo**: son 273, y ademas faltaba lo mas importante -- que las paginas de
entrada estan del otro lado y que hay un solo productor. Retire el numero viejo
en vez de redondearlo, y la correccion quedo escrita arriba de la entrada con el
comando que la produce.

---

## Por que la direccion absoluta esta ahi, y no es un descuido

Las paginas generadas viven a profundidades distintas (una traduccion japonesa de
un documento esta tres carpetas adentro; una guia, una). Una direccion relativa
**correcta** no es un texto fijo: es un prefijo que depende de donde quedo cada
archivo. La absoluta evita ese calculo, al precio de clavar el sistema a
`/nac-spec/`.

---

## Las dos opciones

### Opcion A -- El comportamiento actual **es** la especificacion

Se escribe: *este sistema se sirve bajo `/nac-spec/` y no se soporta en otra
raiz*. Y se le pone un candado que lo verifique, para que deje de descubrirse
levantando el arbol y viendo fallar.

* **Cuesta:** el candado y su prueba en rojo. Nada de superficie publicada se
  mueve.
* **Se pierde:** que alguien pueda servir este arbol desde otra direccion.

### Opcion B -- Las direcciones pasan a ser relativas

El generador aprende a calcular el prefijo segun la profundidad, y se
**regeneran las 273 paginas** publicadas, en nueve idiomas.

* **Cuesta:** un cambio en el generador + 273 paginas publicadas moviendose en un
  commit, mas el candado que verifique que ninguna quedo mal.
* **Se gana:** el arbol se puede servir desde cualquier lado.

---

## Mi recomendacion: **la A**

Nadie pidio servir esto desde otra raiz: no hay adoptante del beneficio. La B
mueve superficie publicada en nueve idiomas por algo que hoy no le resuelve un
problema a nadie, y el riesgo de una regeneracion masiva es real -- el incidente
de la hoja de estilo inexistente pedida por 262 paginas durante cuatro meses
salio de ahi.

Lo que **si** hace falta en cualquiera de los dos caminos es el candado: hoy la
regla no esta escrita ni verificada en ninguna parte.

---

## Lo que cambia segun lo que elijas

| | Opcion A | Opcion B |
|---|---|---|
| Paginas publicadas que se mueven | **0** | **273** |
| Trabajo | un candado + su rojo | generador + regeneracion + candado |
| Queda escrito en | `SPEC.md` o el contrato, como regla del sistema | nada que declarar: desaparece la restriccion |
| Pendiente que abre | el candado | el bloque de trabajo + el candado |

---

*Tu frase, tal como la digas, se escribe en `docs/DECISIONS.md` con la fecha de
hoy, y la entrada se cierra en `docs/DISCREPANCIES.md`. Si elegis que el sistema
debe cambiar, se abre el pendiente correspondiente; si elegis que el
comportamiento actual se queda, se escribe como regla confirmada al lado del nodo
del mapa.*
