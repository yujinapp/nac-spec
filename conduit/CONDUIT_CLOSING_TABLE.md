# Conduit — cuadro de cierre

**Propósito:** mostrar, sin pedir confianza en un porcentaje, qué hace el
stack NAC-3 + Pilot + Forge cuando se le da un pedido humano simple sobre
una app real (Conduit / RealWorld).

Los diálogos de este cuadro son **trazas reales** capturadas por el Pilot
ejecutando contra la app live (`http://localhost:3000` durante el cierre,
deploy público próximo). No están redactados ni idealizados — salen
verbatim de los archivos `nac3-bench/bench/traces/*.json`, capturados con
Claude Sonnet 4.6 a `temperature=0` y verificados por una `successProbe`
sobre el DOM en vivo.

---

## Flujo 1 — Login de usuario existente

**Pedido humano (al Pilot, en lenguaje natural):**
> "Logueate en Conduit como `forge-e2e@yujin.app` con password
> `forge-e2e-2026`. Navegá a la página de login, llená email + password,
> submit. Frená cuando el navbar muestre el username (estás logueado)."

**Pre-estado:** logout, sin sesión activa.

**Secuencia agente → NAC-3:**

| Turn | Intención del agente | Dispatch NAC-3 | Resultado |
|---|---|---|---|
| 1 | Voy a navegar al login | `click_by_verb('conduit', 'navigate', { qualifier: 'login' })` | OK — DOM transiciona a `/#/login` |
| 2 | Lleno el email | `fill('conduit.field.email', 'forge-e2e@yujin.app')` | OK |
| 3 | Lleno el password | `fill('conduit.field.password', 'forge-e2e-2026')` | OK |
| 4 | Listo, login | `click_by_verb('conduit', 'login')` | OK — navbar muestra `forge_e2e` |

**Turnos:** 4
**Resultado:** `success_probe` retorna `true` (navbar muestra el username).
**Verificación end-to-end:** dispatch sin error ruidoso en ningún turn,
postcondición DOM confirmada por probe del browser.

**Costo de captura (Sonnet 4.6, una vez):** $0.0211 USD. El test de replay
generado por `gen-tests v3` corre indefinidamente en CI a costo cero.

---

## Flujo 2 — Publicar un artículo nuevo

**Pedido humano:**
> "Componé un artículo nuevo. Navegá al editor. Llená título, descripción,
> body. Publicalo. Frená cuando la página del artículo cargue."

**Pre-estado:** usuario logueado.

**Secuencia agente → NAC-3:**

| Turn | Intención del agente | Dispatch NAC-3 | Resultado |
|---|---|---|---|
| 1 | Voy al editor | `click_by_verb('conduit', 'navigate', { qualifier: 'new_article' })` | OK — DOM transiciona a `/#/editor` |
| 2 | Pongo el título | `fill('conduit.field.title', 'Forge v3 capture')` | OK |
| 3 | Descripción | `fill('conduit.field.description', 'captured by Pilot')` | OK |
| 4 | Body | `fill('conduit.field.body', 'This article was created by the v3 capture flow.')` | OK |
| 5 | Publish | `click_by_verb('conduit', 'publish')` | OK — DOM transiciona a `/#/article/forge-v3-capture` |

**Turnos:** 5
**Resultado:** URL final `/article/<slug>`, el artículo existe en la API,
`success_probe` retorna `true`.
**Costo de captura:** $0.0297 USD.

---

## Flujo 3 — Postear un comentario en un artículo existente

**Pedido humano:**
> "Navegá a cualquier artículo del feed (clickeá el primero). En la página
> del artículo escribí un comentario `captured by v3 flow` en el editor de
> comentarios y submit. Frená cuando el comentario aparezca abajo."

**Pre-estado:** usuario logueado, al menos un artículo seedeado en la feed.

**Secuencia agente → NAC-3:**

| Turn | Intención del agente | Dispatch NAC-3 | Resultado |
|---|---|---|---|
| 1 | Voy al feed global (donde están los artículos) | `click_by_verb('conduit', 'switch', { qualifier: 'global_feed' })` | OK — tab feed global activado |
| 2 | Click en el primer artículo (slug: `forge-v3-capture`) | `click_by_verb('conduit', 'navigate', { qualifier: 'forge-v3-capture' })` | OK — DOM transiciona a `/#/article/forge-v3-capture` |
| 3 | Escribo el comentario (el submit es opcional — fill ya dispara el handler) | `fill('conduit.field.comment_body', 'captured by v3 flow')` | OK — comentario visible bajo el artículo |

**Turnos:** 3
**Resultado:** el body text de la página contiene `captured by v3 flow`,
`success_probe` retorna `true`.
**Costo de captura:** $0.0186 USD.

---

## El punto del cuadro

Tres pedidos en lenguaje natural se descomponen en **12 dispatches NAC-3
totales**, todos resueltos sin ambigüedad por el runtime estricto. Cada
dispatch es:
- un **verbo semántico** (`navigate`, `fill`, `login`, `switch`,
  `publish`) que el agente eligió del manifest del plugin, y
- un **target preciso** (qualifier o nac_id) que NAC-3 resolvió contra
  el DOM en vivo.

No hay selectores CSS frágiles, no hay XPath, no hay "click en (123, 456)"
de coordenadas. La capa NAC-3 entrega al agente una superficie semántica;
el agente razona sobre verbos, no sobre HTML.

---

## ¿Y cuando algo no es unívoco?

NAC-3 **nunca resuelve a "el más parecido"** silenciosamente. Si el agente
emite un qualifier ambiguo o un id que no existe, el runtime tira un
error ruidoso CON la lista de candidatos válidos, y emite
`nac:disambiguation_requested` para hosts reactivos (chat UI, voz, lector
de pantalla).

**Ejemplo real del runtime estricto (verificado en
`stage7-strict-resolution.mjs`):**

Agente emite:
```js
NAC.click_by_verb('conduit', 'delete', { qualifier: 'slug' })
```

Si el DOM tiene `conduit.action.delete_article__forge-v3-capture` Y
`conduit.action.delete_article__otro-slug`, el runtime responde:
```json
{
  "code": "no_matching_instance",
  "message": "No element with data-nac-action=\"delete\" matches qualifier=\"slug\" by exact id or __suffix",
  "candidates": [
    { "nac_id": "conduit.action.delete_article__forge-v3-capture", "label": "Delete article" },
    { "nac_id": "conduit.action.delete_article__otro-slug",        "label": "Delete article" }
  ]
}
```

El agente recibe la lista de candidatos pre-validados contra el DOM —
no inventa otro qualifier, **elige de la lista**. Para una interfaz de
voz, eso se traduce literalmente a *"¿Querés borrar este artículo o el
otro?"* — la única consulta que efectivamente recupera al usuario en
vez de hacer el click equivocado.

Esta regla es la que hace de NAC-3 un protocolo seguro para uso asistivo.
Está medida: bajo NAC estricto, los rescates frente a la versión lenient
fueron +12 dispatches sobre 54 (cubierto en `H4_STRICT_NAC_REPORT.md`).

---

## Modelos que soportan estos flujos (N=10 confirmado)

Validados los 3 flujos × N=10 contra el fork live, runtime estricto v2.4
shipped. Default = el más barato con 10/10 estable en los 3 flujos.

| Modelo | 10/10 en los 3 flujos (N=10) | Costo/flujo promedio | Veredicto |
|---|---|---|---|
| **gemini-3.1-flash-lite** | **30/30** (10/10/10) | **$0.00066** | **DEFAULT — más barato con 10/10 estable** |
| gpt-5-mini | 30/30 (10/10/10) | $0.00559 | Runner-up |
| claude-haiku-4-5 | 30/30 (10/10/10) | $0.01314 | Premium-fast |
| claude-sonnet-4-6 | 30/30 (10/10/10) | $0.02794 | Premium baseline |
| gemini-2.5-flash | 20/30 (parse_fail post_comment) | $0.00213 | ⚠ Avoid multi-step |
| gpt-4o-mini | 22/30 (post_comment frágil) | $0.00176 | ⚠ Avoid drill profundo |

**N=10 ES (idioma de la organización) confirmado 2026-05-22 con flash-lite:** 30/30 sobre los 3 flujos, costo total $0.021.

El default se reporta como *"10/10 sobre N=10"*, NO como *"100% reliability"*.
La distinción es la diferencia entre una afirmación defendible y una que
se rompe la primera vez que un usuario con discapacidad la usa y falla.

### Tabla cross-lang (N=3 multilingüe, Escalón 2)

Mismos 3 flujos × 4 ganadores × 5 idiomas × N=3:

| lang | flash-lite | gpt-5-mini | haiku-4-5 | sonnet |
|---|---|---|---|---|
| en | 9/9 | 9/9 | 9/9 | 9/9 |
| es | 9/9 | 9/9 | 9/9 | 9/9 |
| zh | 9/9 | 9/9 | 9/9 | 9/9 |
| hi | 9/9 | 8/9 ⚠ | 8/9 ⚠ | 9/9 |
| ar | 9/9 | 9/9 | 9/9 | 9/9 |

**Total cross-lang: 178/180 = 98.9%.** El default (flash-lite) es **45/45
perfecto** incluyendo scripts no-latinos (zh, hi, ar). La degradación
de hi/post_comment para gpt-5-mini + haiku-4-5 (2 fallos) es la única
señal cross-lang del experimento.

**Nota sobre hi:** las prompts hi corrieron en **transliteración
Latin (ASCII), no en Devanagari nativo**. La degradación observada
queda como **pregunta abierta** (transliteración vs sparsity vs
tokenizer vs sample-size); no se atribuye al script ni se interpreta
como límite del contrato hasta correr una comparación Devanagari /
Latin con N=50+ por celda. Ver §1.4 del CONDUIT_EXPERIMENT_REPORT.

N=10 cross-lang (Escalón 3, paper-grade): **574/600 = 95.7%** —
flash-lite 144/150 (96.0%), gpt-5-mini 132/150 (88.0%), haiku-4-5
148/150 (98.7%), sonnet 150/150 (100%). Hindi total 109/120
(90.8%) — única lengua bajo 95%, abierta como hipótesis no resuelta.

---

## Cómo se reproduce esto

1. Clonar el repo público (Conduit-NAC3 fork).
2. `npm install` + `npm run dev` (Conduit completo, backend + frontend).
3. Abrir `http://localhost:3000`, registrar un usuario.
4. En la esquina inferior del Conduit, click sobre el Pilot.
5. Settings del Pilot → ingresar las propias API keys (BYOK — no hay
   keys de Yujin en la app), elegir modelo.
6. Pedile al Pilot en lenguaje natural: *"login con email X, password Y"*
   o cualquiera de los 3 flujos arriba.

Los dispatches NAC-3 que ejecuta el Pilot son visibles en la consola
del navegador. Los traces v3 capturados están en
`nac3-bench/bench/traces/` del repo Yujin (los `*.json` que aliment

aron este cuadro).

---

## Honestidad sobre los rescates del runtime estricto

Durante el desarrollo del H4 descubrimos que el `indexOf` lenient previo
del runtime estaba ocultando **12 dispatches que parecían fallar al
modelo** pero en realidad eran resoluciones silenciosas al elemento
equivocado. Un caso concreto, con traza real:

- **Agente Haiku 4.5, flujo post_comment, antes del fix:**
  ```
  Turn 1: click_by_verb('conduit', 'navigate', { qualifier: 'article' })
          → NAC matcheaba "article" contra "nav_item__new_article" por substring
          → click silencioso al EDITOR (no a un artículo)
          → DOM transicionaba a /#/editor
  Turn 2: click_by_verb('conduit', 'navigate', { qualifier: 'home' })
          → vuelve a home
  Turn 3-12: loop infinito artículo↔home, sin nunca llegar a un comentario
  Resultado: fallo a los 12 turns ($0.024 desperdiciado)
  ```
- **Mismo agente, mismo flujo, después del fix estricto:**
  ```
  Turn 1: click_by_verb('conduit', 'navigate', { qualifier: 'article' })
          → NacError 'no_matching_instance' con candidates: [slug-1, slug-2, ...]
  Turn 2: click_by_verb('conduit', 'navigate', { qualifier: 'forge-seed-1' })
          → OK
  Turn 3: fill('conduit.field.comment_body', '...')
          → OK
  Resultado: éxito en 5 turns, $0.012
  ```

Eso es la diferencia entre "el agente no entiende" y "el agente entiende
y el runtime lo guía cuando se equivoca". Para un niño usando voz como
único input, esa diferencia es entre frustración sin causa identificable
y un *"¿querés A o B?"* recuperable.

El reporte completo del fix + la matriz comparada lenient vs strict está
en `H4_STRICT_NAC_REPORT.md`.
