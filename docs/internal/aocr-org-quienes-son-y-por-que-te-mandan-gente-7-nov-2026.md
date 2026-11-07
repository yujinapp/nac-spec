# aocr.org: quiénes son y por qué te mandan gente

**Medición del 7 de noviembre de 2026.** Cada afirmación lleva de dónde salió. Lo que sigue está partido en tres: **verificado** (lo corrí o lo leí), **creído** (lo deduzco) y **punto ciego** (lo que esta investigación no puede ver).

---

## La respuesta corta

**No usaron nac-spec.** Y lo más importante: **no podrían.** No tienen frontend propio donde ponerlo — sus tres propiedades web son plataformas alquiladas a terceros.

**Pero el tráfico es real y señala a una persona, no a la institución.** Tres personas distintas, el mismo día, entraron a la página de versiones del repositorio desde una página de aocr.org que no es pública. El enlace existe en algún lado detrás de su login.

---

## Quiénes son — VERIFICADO

**American Osteopathic College of Radiology.** No es osteopatía: es **radiología osteopática**. Fundada en 1941, con sede en Milan, Missouri (119 E 2nd St), contacto `info@aocr.org`. Es un colegio profesional: organiza formación médica continua, una convención anual, un "caso de la semana", una bolsa de trabajo y una comunidad de miembros.

> Fuente: su propia portada y la ficha de Wikipedia.

## Con qué está construido lo que tienen — VERIFICADO

Esto es lo que contesta tu pregunta de fondo. Las tres cosas que tienen son **productos de terceros, llave en mano**:

| Lo que es | Sobre qué corre | Qué significa |
|---|---|---|
| El sitio `aocr.org` | **YourMembership**, de Community Brands — plataforma alojada para colegios profesionales | Ellos no escriben el HTML: lo genera la plataforma |
| La comunidad `connect.aocr.org` | **Higher Logic** | Foro alquilado |
| La app nueva que viste | **"Hub & Space"**, de **Mosaic** | App de marca blanca; la misma la usan decenas de asociaciones |

La pila técnica del sitio es de otra década: jQuery 1.10 y 3.6, jQuery Migrate, **YUI 2.9** (una biblioteca que Yahoo abandonó en 2014), Bootstrap, y los parches `html5shiv` y `respond.js` que existen para que Internet Explorer 8 no se rompa. Servidor ASP.NET detrás de Cloudflare.

Una organización que sigue cargando compatibilidad con IE8 no está adoptando un protocolo de agentes de 2026.

## La búsqueda de la huella — VERIFICADO, y salió vacía

Busqué la marca de NAC3 (`data-nac-*`, `nac.js`, `nac-spec`, `nac3`, `yujin`) en:

- la portada — 111 KB de HTML: **cero**
- el sitio de comunidad — 122 KB: **cero**
- el armazón web de la app Hub & Space: **cero**
- **las 45 páginas públicas del sitio**, recorridas una por una: **cero**, y ninguna menciona GitHub

Y el remate: **le pregunté a su propio buscador.** Su motor de búsqueda interno devuelve *"No records matched your search criteria"* para `github`, para `nac3` y para `yujin` — mientras que `radiology`, el control, devuelve *"Records Found"*. El buscador funciona; lo que no está es el contenido.

## El tráfico, número por número — VERIFICADO

Del tablero de tráfico del repositorio (sólo lo ve quien lo administra):

- **Orígenes externos:** `aocr.org` → 3 visitas de 3 personas distintas. `github.com` → 4 de 3. **No hay ningún otro en el mundo.**
- **Páginas más vistas:** la portada del repositorio (4 / 2), y **la página de versiones (3 visitas / 3 personas)**.
- **Por día:** el 29 de octubre hubo exactamente **3 visitas de 3 personas**.
- Total de los catorce días: 17 visitas, 11 personas.
- Interés acumulado real: **2 estrellas** (una es tuya), **0 bifurcaciones**, **0 suscriptores**, **0 incidencias abiertas**.

## Lo que deduzco — CREÍDO, no verificado

**Los tres números coinciden en 3/3.** El origen `aocr.org` da 3 visitas de 3 personas; la página de versiones da 3 de 3; el 29 de octubre da 3 de 3. Tres cortes independientes de los mismos datos leen idéntico. Lo más económico es que sean **el mismo hecho**: el 29 de octubre, tres personas distintas entraron desde aocr.org directamente a la página de versiones.

No puedo probarlo: GitHub no permite cruzar origen × día × página. Pero la coincidencia triple es difícil de atribuir al azar.

**Y ese destino dice algo.** La página de versiones no es donde cae un robot — un rastreador va a la raíz. Es donde entra **alguien que está evaluando si el proyecto está vivo y en qué versión va**. Tres personas llegando ahí, el mismo día, por el mismo enlace, se lee como alguien que compartió el enlace con dos colegas y los tres fueron a ver si esto se mantiene.

**Dónde está ese enlace.** Si ninguna página pública lo tiene y su propio buscador no lo encuentra, el enlace está **detrás de su login**: el AOCR Hub, un hilo del foro de miembros, o un boletín interno. Eso es exactamente lo que no puedo ver.

## Puntos ciegos — lo que esto no puede ver

1. **Todo lo que está detrás de su login.** El Hub de miembros y los hilos del foro. Es justamente donde la evidencia debería estar.
2. **El origen puede falsificarse.** Cualquier programa puede declarar un origen falso al pedir una página. No puedo distinguir tres personas reales de tres pedidos fraguados. Lo considero poco probable por el destino elegido (la página de versiones), pero es posible.
3. **GitHub nunca guarda la página de origen, sólo el dominio** — y sólo catorce días. Lo del 29 de octubre deja de existir el 12 de noviembre.
4. **Las clonaciones no tienen origen registrado.** 492 clonaciones de 172 orígenes en dos semanas, y de ninguna se sabe de dónde vino.
5. **El índice histórico del Internet Archive estaba caído** cuando lo consulté (devolvió una página de mantenimiento), así que no pude revisar páginas de aocr.org que hoy ya no existan.

---

## Lo que esto vale, como negocio

Dos observaciones. No son evidencia: son lectura.

**Primera: la radiología es, de todos los rubros posibles, el que mejor le calza a NAC3.** Un radiólogo ya trabaja dictando — es la única especialidad médica donde hablarle a la máquina es el método normal de trabajo, no una adaptación. Y trabaja con las manos ocupadas y la vista fija en la imagen. Una interfaz que se maneja por voz con un contrato explícito no es un agregado de accesibilidad ahí: es la forma natural de usar un visor de imágenes. Que el único origen externo de tráfico en todo internet sea un colegio de radiólogos es, por lo menos, una pista que no conviene tirar.

**Segunda: el contraste con lo que tienen es la oportunidad.** Toda su presencia digital está alquilada a plataformas que no controlan, y la más nueva —la app— es de marca blanca. No son un competidor ni un adoptante: son un ejemplo de quién **tiene el problema** y ninguna herramienta para resolverlo.

---

## Advertencia sobre este documento

Este informe nombra a una organización identificable y contiene lectura comercial. Según el arranque de sesión de este proyecto, **todo documento nuevo en la carpeta de documentos se publica al sitio web por omisión** salvo que alguien lo agregue a mano a la lista de exclusión, y **nada verifica esa lista**. Ya hay otros dos documentos en la misma situación. Conviene resolver los tres juntos antes del próximo despliegue.
