# Medicion de visibilidad de nac-spec

**Fecha de medicion: 7 de noviembre de 2026.** Cada numero va con el comando que lo produjo, como pide el estado vivo. Ninguno es una estimacion.

## 1. La premisa que la medicion contradice

> "hasta ese mensaje nac-spec fue invisible para todo el mundo y el unico que lo utilice fui yo"

**Falso en la parte de "invisible". No verificable en la parte de "el unico que lo use".** El paquete se descarga todos los dias y el repositorio se clona desde cientos de origenes distintos. Lo que no se puede saber desde aca es cuantos de esos origenes son personas.

## 2. El paquete publicado

| Que | Cuanto | Comando |
|---|---|---|
| Descargas ultimo mes | **620** | `curl api.npmjs.org/downloads/point/last-month/@nac3/runtime` |
| Descargas ultima semana | **48** | `curl .../point/last-week/...` |
| Descargas ayer (6 nov) | **9** | `curl .../point/last-day/...` |
| Publicado por primera vez | **11 de mayo de 2026** | `curl registry.npmjs.org/@nac3/runtime` |
| Versiones publicadas | **15** (2.2.0 a 2.5.2) | idem |

**La forma importa mas que el total.** De las 620 descargas del mes, **473 cayeron en dos dias**: 164 el 26 de octubre y 309 el 27. El 27 a las 15:36 UTC es exactamente cuando se publico la ultima version. Un pico de publicacion no son 309 personas: son los escaneres de seguridad, los espejos del registro y los agregadores que bajan el paquete en cuanto aparece una version nueva.

**El numero honesto es el piso, no el pico:** entre 2 y 10 descargas por dia de forma sostenida en noviembre, sin ninguna publicacion de por medio. Eso es consumo recurrente real. De quien, no se sabe.

## 3. El repositorio (ventana de 14 dias, 24 oct - 6 nov)

| Que | Cuanto | Comando |
|---|---|---|
| Vistas de pagina | **17** (11 unicas) | `gh api repos/.../traffic/views` |
| Clonados | **492** (172 origenes unicos) | `gh api repos/.../traffic/clones` |
| Estrellas | **2** | `gh repo view --json stargazerCount` |
| Bifurcaciones / observadores | **0 / 0** | idem |
| Etiquetas de tema | **ninguna** | idem |
| Direccion del sitio declarada en el repo | **vacia** | idem |

### Descuento del propio despliegue

Cada push a la rama principal dispara el despliegue, y ese clonado tambien cuenta. En la ventana hubo **78 commits** y **33 corridas de integracion** (`git log --since=2026-10-24`, `gh run list`). Aun atribuyendo a cada corrida su clonado, quedan **~460 clonados de ~140 origenes que no son tu cadena**.

### Lo que ese contraste significa

**140 origenes distintos clonaron el arbol; 11 personas distintas miraron la pagina.** Las personas miran antes de clonar. Las maquinas clonan sin mirar. Esa proporcion es la firma de la cosecha automatizada, no de la adopcion humana.

## 4. De donde llega el trafico

Solo dos origenes externos en 14 dias (`gh api .../traffic/popular/referrers`):

* `github.com` — 4 visitas, 3 unicas (navegacion interna).
* `aocr.org` — 3 visitas, 3 unicas. Tres personas distintas llegaron desde ahi. No se que es ese sitio; no lo verifique.

**No hay ningun rastro de agensi.io en los origenes.** El hallazgo de Joeri no dejo huella visible desde aca.

### Las paginas mas vistas, y lo que revelan

Entre los archivos mas abiertos del repositorio estan los **tres documentos de promocion y lanzamiento** (el plan de lanzamiento de mayo, el documento de difusion y la semana de promocion). Son documentos de estrategia comercial, estan publicos, y los esta leyendo gente de afuera. Quien hace prospeccion comercial lee exactamente esos para decidir si estas intentando monetizar. **No lo toco** (regla 3): queda registrado como hallazgo para que lo decidas.

## 5. Por que te encontraron: la respuesta mecanica

No hay en el arbol ningun archivo de "instrucciones para agentes" en el formato que esos catalogos venden. Lo que si hay, y es lo que un rastreador lee:

**Las diez palabras clave del paquete publicado:**
`nac`, `native-agent-contract`, `agent`, `voice`, `llm`, `automation`, `accessibility`, `ai`, `ui-contract`, `yujin`

**Y la descripcion:** *"spec + reference runtime that lets web UIs be driven by AI agents, voice runners, and accessibility tools"*.

Para un clasificador que arma una lista de objetivos de "gente que escribe instrucciones para agentes", ese conjunto es una coincidencia perfecta. Cuatro de las diez palabras son justo las que greparia. **Te encontraron porque declaraste bien lo que esto es, en el unico indice legible por maquinas donde estas.** No fue casualidad ni suerte: fue el metadato.

Punto ciego: no puedo distinguir si llegaron por el paquete o por el repositorio. El mensaje te nombra "nac-spec" (el nombre del repositorio y de la direccion), no "@nac3/runtime" (el nombre del paquete) — lo que inclina a repositorio o sitio. Pero la pagina del paquete enlaza al repositorio, asi que la pista no cierra.

## 6. El diagnostico de una linea

**Tu visibilidad ante maquinas es sana. Tu visibilidad ante personas es casi nula.** 140 maquinas y 11 personas en dos semanas.

Y de ahi sale lo que decide el asunto de Agensi: **ese catalogo vende a agentes** — el canal que ya tenes cubierto. No arregla el hueco que la medicion muestra.

## 7. Las tres palancas vacias (no las toque)

Todas son metadato del repositorio: no tocan el arbol, no pasan por ningun candado, no afectan las dos puertas de entrega.

1. **Etiquetas de tema: ninguna.** Es como categoriza la busqueda propia de la plataforma y como lo hace cada catalogo de terceros. Es la palanca de descubrimiento mas barata que existe y esta vacia.
2. **La direccion del sitio no esta declarada en el repositorio.** Quien llega al codigo no puede encontrar la presentacion web.
3. **No hay archivo de orientacion para rastreadores de agentes.** Para un protocolo cuyo publico son literalmente los agentes, es el unico archivo estandar que les dice que es esto.

Las tres son decision tuya, no mia.
