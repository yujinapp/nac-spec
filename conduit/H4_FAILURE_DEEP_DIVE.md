# H4 — análisis profundo de fallos (18 / 54 runs)

**Date:** 2026-05-21
**Scope:** clasificación causa-raíz de cada uno de los 18 fallos de la matriz H4.
**Pregunta de Pablo:** ¿el fallo es del modelo, del fixture, del seed data, de NAC, de Conduit, o de otra cosa?

**Respuesta corta:** **17 de 18 fallos son del modelo. 1 es marginalmente del modelo + NAC (la fallback contains-match enmascara un mal click pero el modelo tampoco hizo lo correcto). Cero fallos son por fixture, seed data, o Conduit.**

---

## Distribución por causa

| Causa raíz | Fallos | Modelos afectados |
|---|---|---|
| **MODEL — instruction-following (prosa en vez de JSON)** | 5 | gemini-2.5-flash |
| **MODEL — state-awareness loop (no ve la transición de página)** | 12 | gpt-4o-mini (9), claude-haiku-4-5 (3) |
| **MODEL — verb/qualifier syntax confusion** | 1 | gpt-5-mini |
| FIXTURE | 0 | — |
| SEED DATA | 0 | — |
| NAC runtime | 0 (1 contribución secundaria) | — |
| CONDUIT app | 0 | — |
| HARNESS | 0 (1 caveat menor, no determinante) | — |
| **Total** | **18** | |

---

## Categoría A — MODEL: instruction-following (5 fallos)

**Síntoma diagnóstico:** turn=1, `first_error` empieza con `parse_fail:` y contiene **prosa en español o inglés** en lugar de JSON.

### gemini-2.5-flash en login_existing_user (2 fallos: iter 1, iter 3)

```
err: 'parse_fail: I will navigate to the login page.'
action_sequence: [parse_fail:]
```

El modelo recibió la instrucción literal *"You return ONE next action as a single JSON object, no prose, no fences"* en el system prompt. Aun así emitió `"I will navigate to the login page."` como prefijo. La rutina `extractJson` busca `{` ... `}` o un fenced block; ninguno aparece → JSON.parse falla → run abortado.

**Por qué pasó solo en 2/3 iter** — la iter 2 sí emitió JSON puro. Gemini 2.5-flash es inconsistente con instrucción JSON-only. No es determinista entre iter incluso a `temperature=0` (la API de Google no es estrictamente determinista a temp=0 — Google lo documenta).

### gemini-2.5-flash en post_comment (3 fallos)

```
err: 'parse_fail: I need to click on the first article link on the home feed. Since no article links are currently visible in the DOM, I will...'
```

Mismo modo de fallo: prosa en vez de JSON. Bonus interesante: el modelo afirma *"no article links are currently visible in the DOM"* — eso es una **alucinación del modelo**, no realidad: el seed data creó 12 artículos y `gemini-3.1-flash-lite` con la misma vista los encontró 3/3.

**No es seed data:** la app tiene los artículos seedeados. **No es harness:** flash-lite ve los mismos elementos. **Es el modelo:** emite una negación + se queda corto.

**Veredicto:** MODEL. Gemini 2.5-flash no respeta `"JSON only"` con confiabilidad necesaria para Pilot loops. La versión más nueva (3.1-flash-lite) sí respeta, y pasó 9/9 en todo. **Recomendación:** evitar 2.5-flash para flujos NAC-3 hasta que Google arregle la regresión. Preferir 3.1-flash-lite.

---

## Categoría B — MODEL: state-awareness loop (12 fallos)

**Síntoma diagnóstico:** turns=12 (hit MAX_TURNS), no parse_fail, secuencia de acciones repetitiva o circular. El modelo NO percibe que la página cambió después de un click exitoso.

### gpt-4o-mini en login_existing_user (3 fallos, idéntico en las 3 iter)

```
1.  click_by_verb:conduit.navigation.nav_item__login   ← navegó a /login
2.  click_by_verb:conduit.navigation.nav_item__login   ← clickeó login OTRA VEZ (ya está ahí)
3.  click_by_verb:conduit.navigation.nav_item__login
4.  click_by_verb:conduit.navigation.nav_item__sign_up
5.  click_by_verb:conduit.navigation.nav_item__login
6.  click_by_verb:conduit.navigation.nav_item__sign_up
7-12: continúa rotando entre login / sign_up / home
```

El modelo NUNCA intenta `fill` del email o password — se queda clickeando navegación. La página /login efectivamente renderizó el form (sonnet, haiku, gpt-5-mini, gemini-3.1-flash-lite lo confirmaron, todos 3/3). El gpt-4o-mini SIMPLEMENTE NO LO VE — o no actualiza su modelo mental de "estoy en /login".

**Determinismo brutal:** las 3 iter producen secuencias casi idénticas (`temperature=0` sí funciona en OpenAI). Esto es un cap determinista del modelo, no flakiness.

### gpt-4o-mini en post_comment (3 fallos)

```
1.  nav_item__home              ← está en home
2.  footer_home                  ← clickeó home OTRA VEZ
3.  nav_item__new_article        ← saltó al editor
4.  tab.feed__global_feed
5.  tab.feed__your_feed
6.  brand
7.  nav_item__home
8.  tab.feed__your_feed o footer_home
9-12: continúa
```

Mismo patrón: rota entre el chrome top-level (home / brand / footer / tabs) y nunca drilla a un artículo. El campo `comment_body` solo existe en `/article/<slug>`, al cual gpt-4o-mini nunca llega. La página correcta es accesible (los seeded articles existen, los selectores los muestran, sonnet+flash-lite los encuentran 3/3 cada uno).

### gpt-4o-mini en publish_article (3 fallos)

```
iter 1+2:
  1. navigate__new_article    ← entró al editor (correcto)
  2. fill conduit.field.title
  3. fill conduit.field.description
  4. fill conduit.field.body
  5. publish_article           ← click publish (probablemente faltó tagList?)
  6-8. publish_article         ← retries (nada cambió)
  9-11. fill conduit.field.tags  ← orden invertido: fills DESPUÉS de los publish
  12. publish_article
```

Aquí el modelo SÍ intenta los pasos correctos pero (a) no espera la confirmación entre clicks y (b) intenta `fill tags` DESPUÉS de varios `publish` fallidos, lo cual es lógicamente al revés. Sonnet hace `fill title / description / body / publish` con un solo intento de publish (5 turns total) y triunfa.

iter 3 del mismo modelo: hace `click nav_item__new_article` × 12. Nunca avanza más allá del primer click. Un caso patológico.

**Veredicto categoría B:** MODEL. Both gpt-4o-mini y haiku-4.5 (más abajo) fallan **state-awareness multi-step**. La instrucción explícita del system prompt era:

> *"If you find yourself about to repeat an action that just succeeded, you are looping — ADVANCE instead. The state has likely updated since you last looked."*

Ninguno de los dos respetó esta regla. Sonnet, gpt-5-mini, gemini-3.1-flash-lite sí.

### claude-haiku-4-5 en post_comment (3 fallos, IDÉNTICOS en las 3 iter)

```
1.  navigate__article
2.  navigate__home
3.  navigate__article
4.  navigate__home
... (alterna 12 veces)
```

Loop estricto entre `navigate qualifier=article` y `navigate qualifier=home`. **Lo interesante aquí:** el qualifier `article` no matchea ningún `data-nac-id` que termine en `__article` (la convención NAC requeriría algo como `__forge-seed-1` para un artículo). El runtime de NAC tiene un fallback de **segundo paso** que hace `indexOf` (contains-match), y eso encuentra `conduit.navigation.nav_item__new_article` (que contiene "article" como substring).

Es decir: haiku quiere "ir al artículo", emite `qualifier='article'`, NAC interpreta eso como `nav_item__new_article` (el editor), entra al editor. Luego haiku piensa "no estoy donde quería" y emite `qualifier='home'` para volver. Loop.

El qualifier correcto sería el SLUG del artículo (por ej. `forge-seed-1`), como hizo Sonnet. Haiku no entiende esa convención.

**Contribución secundaria de NAC:** la fallback contains-match del runtime es **demasiado permisiva** — matchea "article" contra "new_article". Si fuera más estricta (solo prefijo después de `__`), el click fallaría con `NacError: No action found` y haiku tendría feedback más claro de que su qualifier es inadecuado.

**Pero:** incluso con NAC más estricto, **haiku habría fallado de todos modos** porque el modelo no conoce el slug del artículo. Solo cambiaría el modo de fallo de "loop" a "no_match error". El responsable principal sigue siendo el modelo.

**Veredicto:** MODEL (90%) + NAC fallback demasiado lenient (10%, no determinante).

---

## Categoría C — MODEL: verb/qualifier syntax confusion (1 fallo)

### gpt-5-mini en publish_article iter 2

```
1.  navigate__new_article                          ← qualifier embedded in verb
2.  navigate__nav_item__new_article                ← double qualifier
3.  navigate__new_article
4.  conduit.navigation.nav_item__new_article       ← full nac_id as verb
5.  navigate__conduit.navigation.nav_item__new_article  ← combined
6.  navigate__new_article
7.  navigate                                        ← bare verb (works)
...
```

El modelo emitió `verb_or_id: "navigate__new_article"` en vez de `verb: "navigate", qualifier: "new_article"`. El campo `qualifier` quedó vacío. NAC reads verb=`navigate__new_article`, busca `data-nac-action="navigate__new_article"`, no encuentra nada → `NacError`.

Una vez en este modo confuso, gpt-5-mini fue probando variaciones (con prefijo `navigate__`, sin él, con `nav_item__`, etc) — todas inválidas. La iter 1 y 3 del mismo modelo se las arregló correctamente y triunfó 5 turns. Inconsistencia interna en el reasoning de gpt-5-mini.

**Veredicto:** MODEL. gpt-5-mini falla 1/9 en formato de mensaje JSON. No es harness; el system prompt es claro:
```
"verb_or_id": "<verb (for click_by_verb / tab) or nac_id (for fill)>",
"qualifier": "<optional: disambiguates ...>"
```
El modelo confundió las semánticas en esa iter específica.

---

## Lo que NO fue (importante para descartar)

### NO fue del fixture

- Los 2 usuarios de test (`forge_e2e`, `forge_e2e_other`) se registraron correctamente — toda iter que llegó a `/api/users/login` recibió 200 OK con token válido.
- El multi-user fixture del v2 (para follow/favorite tests) no aplica al H4 (estos flows usan solo `forge_e2e`).
- Pre-state setup (login via `ctx.addInitScript`) funcionó para Sonnet, haiku, gpt-5-mini, gemini-3.1-flash-lite — sin variación entre iter del mismo modelo. Fixture estable.

### NO fue del seed data

- El seed de 12 artículos (`Forge seed 1` ... `Forge seed 12`) corrió antes del H4 — confirmado por:
  1. Sonnet 3/3 OK en post_comment (necesita un artículo navegable)
  2. gemini-3.1-flash-lite 3/3 OK en post_comment (idem)
- Si el seed estuviera vacío, NADIE pasaría post_comment. El hecho de que sonnet + flash-lite lo hagan 3/3 prueba que la data está.
- gemini-2.5-flash dijo *"no article links are visible"* — fue ALUCINACIÓN del modelo, no realidad. Mismas page, mismos selectores, otros modelos los vieron.

### NO fue de NAC runtime

- NAC.click_by_verb / fill / tab respondieron correctamente a TODA llamada bien-formada.
- En los loops de gpt-4o-mini, cada click_by_verb devolvió `ok: true` — NAC despachó al elemento correcto. El problema fue que el modelo no procesó la transición de estado entre clicks, no que NAC haya fallado.
- Único caveat: el contains-match del segundo-paso de fallback es lenient. Mitigado a un 10% de contribución en el haiku-comment caso, no determinante.

### NO fue de Conduit (la app)

- Toda llamada a `/api/users/login`, `/api/articles`, `/api/articles/:slug/comments` respondió correctamente cuando los modelos triunfantes la hicieron.
- El bug de slug-uniqueness en publish_article SÍ existió en el run v1 (contaminado), pero se arregló con env-injected suffix por celda. El run v2 (limpio, en el reporte H4) ya no tiene contaminación.
- Conduit's HashRouter, AuthProvider, todos los componentes respondieron consistentemente bien.

### NO fue del harness Playwright (con UN caveat menor)

- El Pilot loop, la `successProbe`, el ciclo de turns, el dispatch a NAC.* — todo idéntico para los 6 modelos. Lo único que varía es la respuesta del LLM.
- Caveat menor: `nacInDom: elsInDom.slice(0, 30)` corta el listado de elementos NAC a los primeros 30. En homepage con 12 artículos, los previews de artículos podrían quedar fuera de esos 30 si el navbar consume muchos slots. **Pero:** sonnet y flash-lite encontraron los artículos en sus 30 elementos → la truncación no fue determinante. Si quisiéramos optimizar el harness, subir el límite a 60-80 daría más contexto a los modelos débiles, pero el resultado de gpt-4o-mini probablemente no cambiaría (su problema es state-awareness, no falta de info).

---

## Patrón meta: ¿qué hace a un modelo APTO para Pilot loops?

Cruzando los modelos que pasan 9/9 vs los que no:

**Capacidades necesarias:**
1. **Adherencia estricta a formato JSON** cuando el system prompt lo pide. (Gemini 2.5 falla; 3.1 lo arregla.)
2. **State-awareness entre turns** — entender que la página cambió después del click anterior y NO repetir la misma acción. (gpt-4o-mini y haiku fallan; sonnet/gpt-5-mini/flash-lite cumplen.)
3. **Comprensión del esquema de qualifier vs verb** — separar `verb` ("navigate") de `qualifier` ("new_article") cuando ambos están definidos. (gpt-5-mini falla 1/9, los demás no.)
4. **Aprovechamiento de instance_pattern** — entender que un componente reusable se identifica por el sufijo dinámico (slug, username). (Haiku especialmente débil aquí.)

**Modelos que cumplen las 4** (en el corpus testeado):
- claude-sonnet-4-6
- gpt-5-mini (con 1 outlier en qualifier syntax)
- gemini-3.1-flash-lite ← **el mejor costo/beneficio**

**Modelos que NO cumplen:**
- claude-haiku-4-5: falla #2 + #4 en multi-step nav
- gpt-4o-mini: falla #2 catastróficamente, prácticamente nunca completa
- gemini-2.5-flash: falla #1 inconsistentemente

---

## Conclusiones operacionales

1. **Para Pilot capture: gemini-3.1-flash-lite es el mejor cheap-model unlock**, con perfecta adherencia a JSON, state-awareness, y qualifier syntax. A $0.0005/flow, no hay tradeoff: es estrictamente Pareto-dominante sobre todos los cheap-models testeados.

2. **gpt-4o-mini queda fuera del set viable** para flujos NAC-3 multi-step. Su limitación NO es de capacidad bruta (puede leer el manifest, emitir JSON, etc.); es **falta de state-awareness** — un déficit cualitativo que más turns no compensa.

3. **claude-haiku-4-5 es bueno en flows lineales (login, publish)** pero pierde sistemáticamente en flows que requieren navegación dinámica (saltar a un item específico de una lista). Si el corpus de flujos del producto es mayormente lineal, haiku sigue siendo viable; si tiene multi-step nav, no.

4. **Ningún fix de fixture/seed/NAC/Conduit cambia el resultado.** Las únicas palancas son: (a) cambiar de modelo, (b) cambiar el system prompt para apuntalar la state-awareness (poco probable que rescate a gpt-4o-mini), (c) cambiar el corpus de flujos para evitar multi-step nav (no es lo que queremos).

5. **Para NAC runtime:** considerar restringir el segundo-paso de fallback (`indexOf`) a un match de prefijo después de `__` en vez de `indexOf` puro. Esto haría errores de qualifier más explícitos sin penalizar a los modelos que usan qualifiers correctos. **Bajo impacto** — no rescataría a haiku pero le daría feedback más útil. Opcional.

---

## Tabla resumen final

| Causa raíz | Fallos | % | Acción |
|---|---|---|---|
| MODEL: prosa en vez de JSON | 5 | 28% | Cambiar modelo (gemini-2.5-flash → 3.1-flash-lite) |
| MODEL: state-awareness loop | 12 | 67% | Cambiar modelo (gpt-4o-mini, haiku no aptos) |
| MODEL: verb/qualifier confusion | 1 | 5% | Outlier de gpt-5-mini, aceptable variance |
| FIXTURE / SEED / NAC / CONDUIT / HARNESS | 0 | 0% | — |

**La inversión correcta es en el set de modelos, no en arreglar nada del harness.**
