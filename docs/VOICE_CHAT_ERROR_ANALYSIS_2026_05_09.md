# Análisis de errores -- sesión voz+chat 2026-05-09

> Sesión de prueba de Pablo en `example-v20-full.php` con voz +
> chat. Este documento aísla los fallos observados, los clasifica
> por causa raíz, y propone una corrección concreta para cada
> uno. ASCII-only.
>
> **STATUS 2026-05-09 (final del día):** los 8 fixes del
> roadmap están implementados (C1..C8). Ver sección 7 al final
> con el resumen de cambios + ubicación en el código.

---

## 1. Resumen ejecutivo

7 categorías de fallos detectadas. 4 son **bugs reproducibles**
con causa raíz identificada en código; 2 son **limitaciones de
diseño del pipeline de voz** que requieren cambio de
arquitectura; 1 es **un blocker de UX** (modal bloquea el chat).

Severidad:

| Categoría | Severidad | Tipo | Prioridad |
|---|---|---|---|
| C1. Feedback loop TTS -> STT | **CRITICAL** | arquitectura | inmediata |
| C2. Matcher por sub-cadena dispara comandos | **HIGH** | bug | inmediata |
| C3. Modal de confirmación bloquea el chat | **HIGH** | UX | alta |
| C4. v20_panel.X no resuelve por chat | **MEDIUM** | bug | media |
| C5. Fragmentos de STT ejecutados como comandos | **MEDIUM** | arquitectura | media |
| C6. "show" en inglés mapea mal cuando v20_panel no está | derivado de C4 | -- | resuelto al cerrar C4 |
| C7. "cambia idioma" inconsistente | **LOW** | bug | baja |

---

## 2. Diario de comandos (input -> output -> diagnóstico)

| # | Input voz / chat | Respuesta del bot | Diagnóstico |
|---|---|---|---|
| 1 | "apreta describe_v20" | "No encuentro esa accion. Lo mas parecido: Correr el self-test, Ver capacidades, Ver mapa del sistema." | **C4** -- el manifiesto v20_panel no está en el árbol que recibe el backend. El bot busca en el árbol que ve y top-3 son los slugs reales presentes. |
| 2 | "pulsa boton show" | "Mostrando el mapa del sistema." | **C6** = consecuencia de C4. La palabra "show" en EN debería matchear `v20_panel.toggle` (label EN "Toggle panel"), pero como ese plugin no está en el árbol, el matcher cae en `navmap.fetch_map` (label "Show the system map"). |
| 3 | "ve a NAC3 v2.0 layer y pulsa el boton mostrar" | "No veo una capa v2.0 ni un boton 'mostrar'. Lo mas cercano: Ver mapa, Ver capacidades, Listar secciones." | **C4** -- consistente con #1. Si el v20_panel está en el árbol, el bot encuentra `v20_panel.toggle`. Si no, no. |
| 4 | "cambia a ingles" | "No encuentro un control de idioma en esta pagina..." | **C7** -- inconsistente: el comando #16 (idéntico) sí funcionó. |
| 5 | "pulsa system map" | "Pulsando NAC.system_map()." | OK (acierto). El slug `navmap.fetch_map` está en el árbol. |
| 6 | "pulsa capacidades" | "Pulsando NAC.capabilities()." | OK. Slug `navmap.caps`. |
| 7 | "pulsa ver capacidades" | "Pulsando Ver capacidades." | OK. Mismo slug. |
| 8 | "filtra por ricardo" | "Filtrando la tabla por 'ricardo'." | OK. Tabla con filtro live. |
| 9 | "pon brasil" | "Pongo Brasil en el campo Pais." | OK. Datalist autocomplete. |
| 10 | "sube volumen a 80" | "Subiendo volumen a 80%." | OK. Slider. |
| 11 | "Porqué no me iluminas mostrándome el monte" | "Te muestro el Monte Fuji." | OK. Frase larga + indirecta -- el LLM mapea bien al ícono `art.fuji`. |
| 12 | "secretísimo" | "Abriendo el modal secreto." | OK. |
| 13 | "elimina factura" | "Eliminando la factura." | **C3** -- la acción es destructiva pero NO se interpone confirmación previa antes de dispararla; el modal aparece DESPUÉS pero el chat queda bloqueado (ver C3). |
| 14 | "Voz activada" (era TTS del bot) | "Eliminando la factura." | **C1** -- feedback loop. El TTS dijo "Voz activada" y el STT lo recogió. La palabra "Voz activada" no debería matchear nada, pero por C2 "activada" se asocia con un comando de eliminación previo en buffer. |
| 15 | "voz activada" (eco) | "Eliminando la factura." | **C1** + **C2** -- repite el ciclo. |
| 16 | "eliminatorias" | "Eliminando la factura." | **C2** -- el matcher hace sub-cadena: "elimin" prefix matchea "eliminar". Cualquier palabra que empiece con "elimina" dispara la acción. |
| 17 | "Muéstrame factura" | "Previsualizando la factura." | OK. |
| 18 | "Manos libres activado..." (TTS) -> "manos libres activado" (STT) | "Modo manos libres confirmado." | **C1** -- mismo loop. |
| 19 | "modo manos libres confirmado Dime cuáles son tus capacidades" | "Mostrando las capacidades del sistema." | El input es la respuesta del bot pegada con el comando del usuario. Acertó porque "capacidades" matchea fuerte. **C5** parcial. |
| 20 | "del sistema" | "Mostrando el mapa del sistema." | **C5** -- fragmento del input previo se procesa como comando independiente. |
| 21 | "corre el test" | "Corriendo el self-test de NAC." | OK. |
| 22 | "de nac" | "Corriendo el self-test de NAC." | **C5** -- fragmento. |
| 23 | "cambia a inglés" | "Switching to English mode for upcoming replies." | OK. **PERO** inconsistente con #4 (mismo input, distinta respuesta). |
| 24 | "cambia el idioma de la página a chino" | "No encuentro un control de idioma en esta página..." | **C7** -- el LLM no reconoce este meta-comando como cambio de idioma de la sesión, lo busca como un control en el árbol. |

---

## 3. Causa raíz por categoría

### C1 -- Feedback loop TTS -> STT (CRITICAL)

**Mecanismo:** el `SpeechSynthesisUtterance` reproduce la
respuesta del bot por los altavoces del usuario. El
`SpeechRecognition` está activo en simultáneo (modo manos
libres). El micrófono recoge la voz de los altavoces, la STT
la transcribe como input del usuario, el chat la procesa, el
bot vuelve a hablar: ciclo infinito.

Cualquier respuesta del bot que contenga una palabra
similar-a-comando (eliminar, mostrar, abrir, cambiar) puede
disparar otra acción. Si la palabra es destructiva,
**produce daño real**.

**Evidencia en el log:**
- "Voz activada" (TTS) -> recogido como input -> matcheado
  contra "elimina" del buffer previo -> elimina factura.
- "Manos libres activado. Te escucho de continuo." (TTS) ->
  recogido como "manos libres activado" -> bot responde "Modo
  manos libres confirmado".
- "Modo manos libres confirmado" (TTS) -> recogido y pegado al
  siguiente input.

**Soluciones (en orden de robustez):**

1. **Half-duplex obligatorio** (la corrección estándar de la
   industria):
   - `recognition.stop()` cuando `speechSynthesis.speaking
     === true`.
   - `recognition.start()` se reanuda cuando termina el
     utterance (evento `onend` del utterance).
   - Costo: el usuario no puede hablar ENCIMA del bot. Acepta-
     ble en 99% de los casos; añade latencia percibida pero
     evita el loop.
2. **Filtro por contenido** (defensa en profundidad):
   - Mantener un buffer circular de los últimos N (=10)
     `SpeechSynthesisUtterance.text` que el bot dijo en los
     últimos 30 segundos.
   - Cuando llega un transcript del STT, normalizar (lowercase,
     sin diacríticos, trim) y comparar contra el buffer. Si
     coincide >70% con cualquier utterance reciente, descartar
     en silencio.
3. **Confirmación obligatoria para acciones destructivas**
   (defensa de último recurso):
   - Cualquier acción con `data-nac-a11y-hint="destructive"` o
     marcada `irreversible` requiere un segundo turno de
     confirmación explícita ANTES de disparar. NAC3 v1.9 ya
     define `confirm_action()` para esto -- el demo no lo
     está usando en el path destructivo.

**Recomendación:** implementar (1) inmediato + (3) a corto
plazo. (2) opcional para entornos donde el usuario quiere
poder interrumpir al bot.

---

### C2 -- Matcher por sub-cadena dispara comandos (HIGH)

**Mecanismo:** el resolver del intent (en el backend o en el
LLM) hace match por sub-cadena. La palabra "eliminatorias"
contiene "elimina" como prefijo, y "elimina" es el verbo de
una acción registrada -> se dispara la acción.

**Evidencia:**
- "eliminatorias" -> "Eliminando la factura."

**Solución:** el matcher debe operar por **token completo**
(o por stem), no por sub-cadena. Implementación posible:

- Tokenizar el input por espacios + puntuación.
- Para cada token, comparar contra los verbos de las acciones
  con normalización de stem español ("elimina/elimino/
  elimine/eliminar" -> stem `elimin`, "eliminatorias" ->
  stem `eliminatori`). Stems diferentes -> no match.
- Mantener una lista corta de stems "comando" en el system
  prompt (~30 verbos) para cortar la heurística.

El módulo `@nac-spec/test-runner/src/lib/matcher.js` ya hace
matching por token completo (`indexOf` sobre la frase entera,
no por sub-cadena del slug). El bug está en el backend
intermediario, no en el matcher reciente.

**Acción concreta:** auditar el system prompt
(`yjNacDemoSystemPrompt` en `crm_desa/api/v1/yujin.php`) y
agregar regla explícita: "verbos como `eliminar`, `borrar`,
`cancelar` solo matchean cuando el token completo del input
coincide con el verbo conjugado, NO cuando es prefijo de otra
palabra."

---

### C3 -- Modal de confirmación bloquea el chat (HIGH)

**Mecanismo (reportado por Pablo):** cuando el bot dispara
una acción destructiva, aparece un modal con botones
"Aprobar" / "Cancelar". El modal usa `<dialog>` con focus
trap o un overlay con `inert` sobre el resto del DOM,
incluido el chat. El chat queda inaccesible: no se puede
escribir, no se puede dictar por voz, no se puede confirmar
por la conversación.

**Consecuencia:** el usuario tiene que cancelar/aprobar
manualmente con click. Para un modo manos libres esto rompe
el contrato de "operable por voz".

**Solución:**

1. El modal de confirmación debe estar **fuera del trap de
   foco** del chat -- o equivalentemente, el chat debe estar
   **fuera del trap** del modal. Práctica: mover el chat a
   `position: fixed` con `z-index` superior al modal y
   `inert={false}` cuando el modal abre.
2. El modal debe declarar sus botones con `data-nac-id`
   (ej. `confirm.approve`, `confirm.cancel`) y entrar al
   árbol NAC. El chatbot puede entonces dispatch de "aprobar"
   o "cancelar" por voz contra el slug correspondiente.
3. El TTS debe leer la pregunta del modal automáticamente
   ("Confirmás eliminar la factura? Decí 'sí' o 'no'.") y la
   STT debe interpretar la respuesta directamente como
   confirm/reject.

**Acción concreta:** auditar el componente modal-confirm en
`example-v20-full.php` (si existe) o el hook genérico de
`confirm_action()` en `js/nac.js` para garantizar que el
modal NO encierre el chat en su tree de focus.

---

### C4 -- v20_panel.X no resuelve por chat (MEDIUM)

**Mecanismo:** el JS de la página llama
`nacDemoSnapshotTree()` antes de cada turno de chat para
serializar el árbol NAC. Esa función llama
`NAC.describe()` (v1, no `describe_v2()`). `NAC.describe()`
SOLO incluye plugins ya registrados via `NAC.register()`.

El v20_panel se registra en `example-v20-full.php` dentro
del bloque `<script>` al final del body, en la función
`bootV20()` que polea `setTimeout(bootV20, 50)` hasta que
`NAC.scope` exista. Si:
- el navegador es lento o el deploy del rc5 todavía no
  llegó (el rpaforce-crm vendora su propia copia de
  `nac-v2-extensions.js`), `NAC.scope` no existe y bootV20
  no corre,
- O bien bootV20 corre tarde, después de que el usuario
  envió el primer mensaje al chat,

entonces `NAC.describe()` no incluye el v20_panel y el
backend recibe un árbol sin esos slugs.

**Evidencia:**
- "apreta describe_v20" -> bot no encuentra
  `v20_panel.describe_v2`.
- "pulsa system map" -> bot SÍ encuentra `navmap.fetch_map`
  (porque navmap se registra en example.js boot, mucho antes).

**Soluciones:**

1. **Migrar `nacDemoSnapshotTree` a `describe_v2()`** (cuando
   esté disponible). `describe_v2()` retorna ambos
   v1_plugins (compat) y v2_scope_entries -- garantiza que
   los manifests registrados via `NAC.register` Y los scopes
   declarados via `NAC.scope` lleguen al backend.
2. **Bloquear el envío del primer mensaje hasta `bootV20()`
   complete.** El `chat-send` tiene un disabled state hasta
   que se emite `nac:v2_installed`.
3. **Garantizar que `NAC.register({plugin_slug:'v20_panel'})`
   corra ANTES de cualquier intento de `chatSend`.** Mover
   ese register al boot de `example.js` mismo (línea ~30
   donde están los otros manifests) en vez de
   diferirlo al script inline al final.

**Recomendación:** combinar (1) + (3). (1) es la fix
estructural; (3) elimina la condición de carrera.

---

### C5 -- Fragmentos de STT como comandos (MEDIUM)

**Mecanismo:** la Web Speech API entrega resultados parciales
(`onresult` con `interim` true) y resultados finales. El
chat actual procesa cada resultado final como un mensaje
independiente. Cuando el usuario hace una pausa entre
"el del sistema" y "muéstrame el mapa", el STT puede
emitir dos resultados finales: "el del sistema" y luego
"muéstrame el mapa", y el bot procesa ambos.

Adicionalmente, la respuesta del bot por TTS (problema C1)
puede colarse y ser procesada como un fragmento.

**Evidencia:**
- "del sistema" -> ejecuta "mostrar mapa del sistema" como
  si fuera un comando completo.
- "de nac" -> ejecuta "self-test de NAC3".

**Solución:**

1. **Buffer + debounce con timeout de silencio**:
   - Acumular resultados finales en un buffer.
   - Solo enviar al backend cuando hay 800-1500 ms de silencio
     después del último resultado, O cuando el usuario tipea
     "send".
   - Esto agrupa fragmentos contiguos en una sola pregunta.
2. **Filtro de longitud mínima**: ignorar transcripts de menos
   de 4 caracteres significativos a menos que matcheen un
   verbo + objeto (regex de frase corta válida).
3. **Filtro contra C1**: si el transcript matchea (>70%) la
   última N utterances del bot, descartar.

**Recomendación:** (1) + (3). Estándar en aplicaciones de voz
modernas (Alexa, Google Assistant, Siri).

---

### C6 -- "show" mapea mal cuando v20_panel no está (DERIVADO)

Resuelto cerrando C4. Cuando el v20_panel está en el árbol,
su `label_i18n.en="Toggle panel"` (o el que se elija) gana
el match contra "show". Hoy no está en el árbol -> el matcher
cae en `navmap.fetch_map` (label "Show the system map")
porque su keyword "show" hace prefix match.

Adicional: el label EN del `v20_panel.toggle` debería incluir
"show / hide" como sinónimos, no solo "Toggle panel". Actuali-
zar el manifest:

```js
{ id: 'v20_panel.toggle', role: 'button',
  label_i18n: {
    es: 'Mostrar / ocultar panel',
    en: 'Show or hide panel',  /* antes: 'Toggle panel' */
    ...
  }
}
```

---

### C7 -- "cambia idioma" inconsistente (LOW)

**Mecanismo:** el LLM tiene dos rutas no determinísticas:
- Ruta literal: buscar un control de idioma en el árbol
  visible (no existe -> rechaza con top-3 candidatos).
- Ruta meta: reconocer "cambia a inglés" como meta-comando
  de la sesión y emitir `{kind:'say', text:'Switching to
  English mode...'}` cambiando `currentLang`.

Cuál ruta toma depende del muestreo del LLM (temperature
0.5-0.7 en el system prompt actual). Resultado:
inconsistente.

**Solución:** **regla explícita en el system prompt**:

> "Cuando el usuario pida cambiar el idioma de la sesión
> (ej. 'cambia a inglés', 'switch to French', 'idioma
> chino'), SIEMPRE responder con `{kind:'change_locale',
> locale:'<2-letter>'}` -- NO buscar un control de idioma
> en el árbol. Es un meta-comando que afecta la sesión, no
> un click en la página."

Y agregar el kind `change_locale` al vocabulario aceptado del
backend (junto a click / fill / say / etc).

Costo: 1 línea en el system prompt + 1 branch en el backend
handler.

---

## 4. Roadmap de fixes (por orden de impacto / costo)

| # | Fix | Categoría | Costo | Impacto |
|---|---|---|---|---|
| 1 | Half-duplex TTS/STT (mute mic mientras habla el bot) | C1 | bajo | crítico |
| 2 | Confirmar destructivas con `confirm_action()` | C1, C3 | medio | crítico |
| 3 | Modal-confirm fuera del focus trap del chat | C3 | medio | alto |
| 4 | Tokenizer por palabra completa en el matcher | C2 | bajo | alto |
| 5 | Migrar `nacDemoSnapshotTree` a `describe_v2()` | C4 | bajo | medio |
| 6 | Mover `NAC.register('v20_panel')` al boot temprano | C4 | trivial | medio |
| 7 | Buffer + debounce 800-1500ms para STT | C5 | bajo | medio |
| 8 | Regla `change_locale` en system prompt | C7 | trivial | bajo |
| 9 | Sinónimos en `label_i18n` del v20_panel.toggle | C6 | trivial | bajo |

Costos:
- **trivial**: 1 línea de código + 1 commit.
- **bajo**: <30 líneas, 1-2 horas.
- **medio**: 30-150 líneas, medio día.

---

## 5. Aciertos relevantes (lo que SÍ funcionó)

Documentar también lo que anduvo bien para no romperlo:

- "Porqué no me iluminas mostrándome el monte" -> el LLM mapea
  bien al ícono `art.fuji`. **Resolución de intent indirecto +
  metafórico** -- esto es exactamente lo que pedimos en sec 16.
- "secretísimo" -> abre el modal secreto. **Coloquialismo
  resolvido**.
- "Muéstrame factura" -> previsualiza. **Conjugación + objeto
  diferenciado del comando destructivo "elimina factura"**.
- "filtra por ricardo" -> filtro live. **Acción + parámetro
  separados correctamente**.
- "pon brasil" -> Brasil en campo país. **Mapeo de objeto
  declarativo a `fill`**.
- "sube volumen a 80" -> slider a 80%. **Numérico extraído del
  texto + slider acción**.
- "corre el test" -> self-test. **Verbo + objeto del árbol**.

Estos casos validan que el system prompt rc5 (sec 16
contract) funciona cuando el árbol está completo y el matcher
no se confunde por sub-cadena.

---

## 6. Próximo paso

Implementar fixes #1, #4, #6 en el siguiente push (los tres
son de costo bajo o trivial y cubren las 3 categorías
críticas). Fixes #2, #3, #5 pueden ir en un PR separado de
mayor envergadura. El resto se puede backlog-ear.

Pablo: avisame si querés que arranque con estos fixes ahora
o si preferís revisar el documento primero.

---

## 7. STATUS de implementación (2026-05-09 final)

Pablo aprobó implementar **todos** los fixes con la
restricción de **NO romper la resolución de intent indirecto /
metafórico / coloquial** que el system prompt rc5 habilitó
(metáforas tipo "porqué no me iluminas mostrándome el monte"
-> Mt. Fuji; coloquialismos tipo "secretísimo" -> modal
secreto). Esa capacidad vive en el LLM, no en el matcher local.
Los fixes preservan el LLM intacto y refinan: (a) la captura
del input antes del LLM (C1, C5), (b) las reglas que el
prompt entrega al LLM (C2, C7, C8), y (c) el dispatch
posterior (C3, C4).

| # | Categoría | Fix implementado | Ubicación |
|---|---|---|---|
| C1 | Feedback loop TTS->STT | Half-duplex (mute STT mientras `speechSynthesis.speaking`) + buffer circular de las últimas 8 utterances del bot + filtro de contenido (exact / containment / 70%-token-overlap) en el handler `recognizer.onresult` | `js/example.js` -- `_ttsRecentBuf`, `_sttIsBotEcho`, `_ttsRememberUtterance`; recognizer.onresult chequea `speechSynthesis.speaking` antes de procesar |
| C2 | Sub-string matcher | Regla 11 explícita en system prompt: "WORD-LEVEL MATCHING -- 'eliminatorias' NO matches 'eliminar'. Conjugated forms or infinitive only. On near-prefix ambiguity, return `{kind:'say'}` for clarification, NEVER the destructive action." Local interpret() ya tokenizaba correctamente desde 2026-05-06. | `crm_desa/api/v1/yujin.php` `yjNacDemoSystemPrompt` regla 11 |
| C3 | Modal confirm bloquea chat | (a) CSS: `.ne-side { z-index: 10001 }` saca el chat del overlay (z-index 9999). (b) Listener `nac:confirm:requested` que anuncia el prompt + hint localizado por TTS. (c) `_maybeAnswerPendingConfirm()` enrutado en `chatSend` y en `_sttFlush` mapea YES/NO en 10 idiomas a `<id>.confirm`/`.cancel` directamente, antes del LLM. | `css/example.css` `.ne-side`; `js/example.js` `_findPendingConfirm`, `_maybeAnswerPendingConfirm`, listener `nac:confirm:requested` |
| C4 | v20_panel no llega al chat | (a) Manifest extraído a `window.__V20_PANEL_MANIFEST__` y registrado vía `registerV20PanelManifest()` con polling de 30ms tan pronto como `NAC.register` exista (antes que `bootV20`). (b) `nacDemoSnapshotTree` ahora también incluye `v2_scope_entries`, `v2_intermediate_scopes`, `sitemap`, `tenant_prefix`, `nac_version_v2` cuando `NAC.describe_v2` existe. | `example-v20-full.php` (early register block); `js/example.js` `nacDemoSnapshotTree` extendido |
| C5 | Fragmentos STT como comandos | Buffer `_sttBuffer` + `setTimeout(_sttFlush, 1100)`. Cada `final` STT result re-arma el timer; sólo después de 1100ms de silencio el buffer se descarga al backend. Borrar buffer en path manual (chatSend / mic-stop). | `js/example.js` `recognizer.onresult` + `_sttFlush` |
| C6 | "show" mapea mal | Resuelto cerrando C4 (v20_panel ahora visible en el árbol). Adicional: `label_i18n.en` del v20_panel.toggle bumpeado de "Toggle panel" a "Show or hide v2.0 panel" + 9 locales nuevos completos. | `example-v20-full.php` `__V20_PANEL_MANIFEST__` |
| C7 | "cambia idioma" inconsistente | (a) Nuevo kind `change_locale` en el catálogo del system prompt. (b) Regla 13: "SESSION META-COMMANDS use change_locale -- do NOT search the tree for a 'language control'." (c) Handler en `dispatchAgenticAction` que llama `applyLangChange(a.locale)`. | `crm_desa/api/v1/yujin.php` (nuevo kind + regla 13); `js/example.js` `dispatchAgenticAction` case `change_locale` |
| C8 | Verbo en plugin equivocado (warning consola "No action with verb=fetch_map found in plugin selftest") | Regla 12 explícita: "PLUGIN-VERB BINDING is fixed by the manifest. Do NOT guess, do NOT carry the verb to a nearby plugin, do NOT invent a plugin name." Con ejemplos de WRONG ↔ RIGHT. | `crm_desa/api/v1/yujin.php` `yjNacDemoSystemPrompt` regla 12 |

### Lo que NO toqué (intencional)

- **System prompt principal (sec 16 contract):** intacto. Sólo
  agregué reglas 11, 12, 13 que refinan; las absolutas A-F y
  las 1-10 no cambiaron.
- **Local matcher `interpret()`:** ya tokeniza por palabra
  completa desde 2026-05-06. No hay riesgo ahí.
- **Confirm dialog (`NAC.confirm_dialog` en `nac.js`):** intacto;
  ya emitía `nac:confirm:requested` y los botones ya tenían
  `data-nac-id`. Sólo lo escucho ahora.

### Riesgo residual / próximos pasos

- **C1 nivel-3 (`confirm_action()` para destructivas):** sigue
  pendiente. Hoy "elimina factura" dispara la acción + el
  modal aparece. Si el LLM volviera a confundirse pese a la
  regla 11, el fallback debería ser que TODA acción declarada
  destructive (`data-nac-a11y-hint=destructive`) PASE primero
  por `confirm_dialog`. Lo dejo como follow-up: implica
  inspeccionar manifest.actions[].destructive y, si lo está,
  envolver el invoke con `confirm_action()` en el dispatch
  layer.
- **STT debounce (C5):** los 1100ms son un valor empírico.
  Si se observa "el bot tarda en responder a comandos cortos",
  bajar a 800ms y observar.
- **TTS feedback filter (C1) -- nivel agresivo:** el threshold
  de 70% token-overlap puede bloquear comandos legítimos del
  usuario que coincidan con frases comunes del bot (p. ej.
  "muestra capacidades" si el bot acaba de decir "estas son
  las capacidades"). Telemetría futura: contar cuántos drop
  loggea `[stt] dropping bot-echo` -- si pasa de N por sesión,
  bajar threshold a 80%.
