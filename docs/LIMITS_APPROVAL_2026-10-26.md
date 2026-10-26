# Aprobacion frase por frase de la seccion publica de limites

**Hallazgos que cierra:** D-04 / N-09 (la portada no declaraba ningun limite),
N-15 (el enlace a Urazuke era de ida sin vuelta), N-16 (las licencias no se
declaraban juntas).
**Aprobado por:** Pablo Kuschnirof (dueno del proyecto), **2026-10-26**.
**Respuesta textual:** *"Todo leido, decision declararlas historicas. Publicar 2.5
con cifras historicas y remedir despues."*
**Alcance de la aprobacion:** las ocho frases de limites y la frase de las tres
naturalezas con las dos licencias, **sin cambios**.

El artefacto que el dueno leyo esta en `docs/LIMITS_APPROVAL_2026-10-26.html`.
El texto aprobado vive publicado en `index.html`, seccion
`nac_landing.section.limits`. **No se reescribe sin una nueva lectura**: la regla
del dueno sobre esta seccion es aprobacion frase por frase.

---

## Regla que se siguio al escribirlo

Ninguna frase afirma un limite que no este medido en el codigo o escrito en el
spec. Al lado de cada una queda de donde salio.

| # | Frase (encabezado publicado) | De donde salio |
|---|---|---|
| 1 | Canvas and WebGL | Seccion 15 del SPEC, con estas palabras ("It does not work for apps where part of the surface is canvas"); nombra Collabora, Figma, Excalidraw, Miro. El limite ya estaba en el spec, no en la portada. |
| 2 | Closed shadow roots | SPEC 5.1.5 (abiertos, recursivo) y 5.1.6 (cerrados, exposicion voluntaria). El nombre del evento `nac:shadow_blocked` se leyo del runtime. |
| 3 | Cross-origin frames | `js/nac.js`: el backend same-origin-window devuelve `cross_origin_blocked` cuando el acceso falla el chequeo de origen. |
| 4 | Anything not web | Por construccion: todo el spec asume DOM. |
| 5 | Not a permission system | SPEC seccion 5, textual: "This complements -- it does not replace -- server-side authorisation. Hosts MUST still enforce permissions on the server... not a security boundary." |
| 6 | Declared is not validated | Hallazgo N-26, medido: cero apariciones de `payload_schema` en el runtime; los que hay en el repo son productores. |
| 7 | Stability is yours to keep | La regla de estabilidad de la seccion 2 del SPEC es una obligacion del adoptante y nada en el runtime la verifica. Es lo mismo que N-28 mostro adentro de casa. |
| 8 | It does not make an agent correct | Las cifras del propio benchmark que la portada publica (95,5%; 0/200 vs 30/200). Convierte una cifra de marketing en un limite declarado. |

**Frase de las tres naturalezas (N-15 + N-16):** "Three different things, three
different licenses. NAC3 is a protocol -- this site, Apache-2.0. Urazuke is a
method for building software with evidence -- yujin.app/urazuke, Creative Commons
BY-SA 4.0. Yujin Forge is a commercial tool that implements both. You can adopt
the protocol without the method and without the tool; that is the point of
publishing it under Apache-2.0."
Verificado el 2026-10-26, no recordado: `yujin.app/urazuke/` responde 200 y su
propia portada declara "Creative Commons BY-SA 4.0". El Apache-2.0 de NAC3 ya
estaba declarado en tres lugares de la portada y en el `LICENSE` del repo.

---

## Lo que se dejo AFUERA a proposito

- **Los idiomas.** Las 9 traducciones publicadas son parciales (30%-38% del
  canonico) y eso es exactamente **D-03**, que sigue sin decidirse. No se escribe
  una frase sobre idiomas antes de que el dueno elija.
- **La gobernanza.** Que NAC3 no es todavia un estandar de industria ya esta dicho
  en la seccion Governance de la portada ("one company, not a foundation"). No se
  repite: la seccion de limites **enlaza** a Governance.
- **Los baldes de `validate_global` sin codigo (N-14).** Es un limite real hoy,
  pero se arregla en el mismo tren (`PND-039`), asi que publicarlo como limite
  seria publicar algo que deja de ser cierto en la misma version.

---

## Las cifras del benchmark: decision del dueno

**Declaradas historicas.** Se publica la 2.5.0 con las cuatro corridas tal como se
midieron, cada una con su recibo diciendo contra que version se midio y que no se
re-midio despues. La re-medicion contra la 2.5.0 (~US$15, 1h 23min de reloj, clave
de los cinco modelos) **sale del camino critico del release** y queda como trabajo
propio en **`PND-040`**.

Lo que la portada dice hoy, y es verdad: *"These figures have not been re-measured
on a later runtime, so read them as what v2.3 did, not as a claim about the current
release."* Detalle de la trazabilidad dataset -> npm en
`docs/BENCHMARK_PROVENANCE.md`.

---

## Como se verifica que esto esta publicado y no solo escrito

`node e2e/landing-limits-check.mjs` (necesita un servidor estatico; por defecto
`http://localhost:8855`). El gate afirma, en un navegador real:

1. `index.html` carga con cero errores de consola.
2. Las palabras `does not cover` y `urazuke` son **texto visible** de la seccion
   -- no un comentario HTML ni una etiqueta del manifest.
3. Los 13 `data-nac-id` de la seccion estan **pintados en el DOM y declarados en el
   manifest** (simetria productor/consumidor, SQ 14).
4. Las dos licencias se nombran juntas.

**Probado en rojo antes de darlo por bueno** (2026-10-26): borrando la seccion de
la portada el gate da 5 rojos; renombrando una sola declaracion del manifest da 1
rojo; con el codigo real da verde.

**Lo que ese ejercicio en rojo encontro, y vale mas que el gate:** el criterio del
propio dueno para los puntos 3 y 4 de su bloque de verificacion es un `curl | grep -c`,
y **un comentario HTML lo satisface sin que ningun lector vea nada**. La primera
version de esta seccion llevaba el encabezado repetido en un comentario de
provenance y el grep pasaba con la seccion borrada. El comentario se reescribio
para que no contenga la frase. El grep queda como espejo del comando del dueno; lo
que de verdad mide es el gate.
