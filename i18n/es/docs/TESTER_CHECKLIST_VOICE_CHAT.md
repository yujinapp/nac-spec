---
translation_source: docs/TESTER_CHECKLIST_VOICE_CHAT.md
translation_source_hash: rewrite-2026-05-11-v2
translation_quality: human_rewrite_v2
translation_lang: es
translation_date: 2026-05-11T14:30:00+00:00
---

# NAC3 v2.2 -- Test de voz + chat (tester checklist en castellano)

**Para:** el tester hispanohablante enfocado en voz y chat.
**Tiempo estimado:** 30 a 45 minutos.
**Necesitas:**

- Una computadora con microfono integrado o microfono externo enchufado.
- Auriculares o parlantes encendidos.
- Chrome instalado y actualizado (recomendado).

## Como usar esta lista

Cada tarea tiene una lista de pasos numerados (1, 2, 3, ...). Hay que hacerlos **en orden** sin saltar ninguno.

Despues de hacer los pasos, mira el bloque **"Resultado esperado"**. Si lo que ves en pantalla coincide con lo descripto: marca **OK**.

Si algo es distinto, no funciona o aparece un error: marca **ERROR** y escribi en **Comentarios** que viste exactamente (mensaje de error, comportamiento extrano, parte que no aparece). Despues segui con la tarea siguiente -- no te traves.

Al final del formulario hay un bloque "Firma final" para tu nombre, navegador y veredicto general. Apreta **Enviar reporte** al terminar.

---

## Tarea A1 -- Abrir la pagina principal

Pasos:

1. Abri Chrome (no Firefox ni Safari para esta primera prueba).
2. Presiona Ctrl+Shift+N para abrir una ventana de incognito.
3. En la barra de direcciones, escribi exactamente: `https://yujin.app/nac-spec/`
4. Presiona Enter.
5. Espera 5 segundos sin hacer click en nada.

Resultado esperado:

- La pagina carga sin error.
- En la parte de arriba a la izquierda ves un dibujo sumi-e (rama japonesa) + el texto "NAC".
- En la parte de arriba a la derecha ves una fila de botones que incluye uno que dice "tour" y otro que dice "chat".
- En el centro de la pantalla hay un titulo grande que dice "Drive web UIs by voice, chat, AI".
- No hay ningun mensaje rojo de error en la pantalla.

- [ ] OK
- [ ] ERROR
Comentarios: _______________________________

---

## Tarea A2 -- Abrir el panel de chat

Pasos:

1. Estas en la pagina `https://yujin.app/nac-spec/` (la abriste en la tarea A1).
2. Localiza el boton que dice **"chat"** en la parte de arriba a la derecha de la pagina.
3. Hace click sobre el boton **"chat"**.
4. Espera 2 segundos.

Resultado esperado:

- Aparece un panel angosto en el lado derecho de la pantalla.
- En la parte de arriba del panel dice "Yujin chat".
- Adentro del panel ves todo esto:
  1. Un dropdown con codigos de idioma (por ejemplo "en" o "es") junto al titulo.
  2. Un boton chico que dice "tts".
  3. Una zona vacia gris en el medio (es el area donde apareceran los mensajes).
  4. Un boton que dice "mic".
  5. Un boton que dice "hands-free" (o "manos libres").
  6. Un campo de texto vacio con un placeholder gris adentro.
  7. Un boton al lado derecho del campo de texto que dice "send".

- [ ] OK
- [ ] ERROR
Comentarios: _______________________________

---

## Tarea A3 -- ELEGIR CASTELLANO EN EL CHAT (paso obligatorio)

**Importante:** este paso es obligatorio antes de cualquier prueba de voz o de TTS. Si no eliges el idioma correcto, el TTS no va a funcionar y el chat no te va a entender bien.

Pasos:

1. El panel de chat tiene que estar abierto (lo abriste en la tarea A2).
2. Localiza el dropdown de idioma en la parte de arriba del panel del chat. Es el desplegable con codigos de dos letras (por defecto puede decir "en").
3. Hace click sobre el dropdown.
4. Elegi el codigo **"es"** (castellano).
5. Espera 1 segundo.

Resultado esperado:

- El dropdown muestra "es".
- No aparece ningun mensaje rojo de error.

- [ ] OK
- [ ] ERROR
Comentarios: _______________________________

---

## Tarea A4 -- Mandar una pregunta por texto

Pasos:

1. El panel de chat sigue abierto y el idioma esta en "es" (desde la tarea A3).
2. Hace click adentro del campo de texto del chat (donde dice el placeholder gris).
3. Escribi exactamente: `que es NAC3`
4. Presiona Enter en el teclado **o** hace click en el boton "send".
5. Espera entre 5 y 15 segundos.

Resultado esperado:

- Tu pregunta "que es NAC3" aparece en el area gris del chat (es el primer mensaje).
- Despues aparece una respuesta del asistente (un parrafo o mas) explicando que es NAC3.
- La respuesta esta en castellano.
- La respuesta es coherente: dice que NAC3 es un protocolo o estandar abierto, no es texto random ni un error.

- [ ] OK
- [ ] ERROR
Comentarios: _______________________________

---

## Tarea B1 -- Permitir el microfono

Pasos:

1. El panel de chat sigue abierto y el idioma esta en "es".
2. Localiza el boton **"mic"** en el panel del chat (esta arriba del campo de texto, junto al boton "hands-free").
3. Hace click sobre el boton **"mic"**.
4. **Importante:** el navegador te va a preguntar si permitis el uso del microfono. Aparece un cartel en la parte de arriba de la ventana.
5. En el cartel del navegador, hace click en **"Permitir"** o **"Allow"**.

Resultado esperado:

- Despues de permitir el microfono, el boton "mic" cambia de aspecto: cambia de color o aparece un pequeno indicador de que esta grabando.
- No aparece ningun mensaje rojo de error.

- [ ] OK
- [ ] ERROR
Comentarios: _______________________________

---

## Tarea B2 -- Hablar al microfono en castellano

**Importante:** el boton "mic" funciona como **"push-to-talk"** (apretar para hablar). Cada vez que querés decir algo nuevo, hay que clickearlo de nuevo. Esto es intencional, no es un bug. Hay un boton separado "hands-free" / "manos libres" si preferis modo continuo (no probamos eso en esta tarea).

Pasos:

1. El boton "mic" esta activo (lo activaste en la tarea B1).
2. El idioma del chat sigue siendo "es".
3. **Acercate al microfono** o hablale claramente en voz normal.
4. Deci en voz alta y clara: **"hola"**
5. Despues de decir la palabra, espera 2 segundos en silencio.
6. Si el boton "mic" sigue grabando despues de los 2 segundos, hace click en el boton "mic" otra vez para que pare de grabar.
7. Espera entre 5 y 10 segundos.

Resultado esperado:

- En el chat aparece la palabra "hola" (o algo muy parecido).
- Aparece una respuesta del asistente debajo, en castellano.
- Por los parlantes/auriculares escuchas una voz natural que lee la respuesta en voz alta y en castellano. La voz no es robotica rota; es natural.

- [ ] OK
- [ ] ERROR
- [ ] OK pero no escuche audio
Comentarios: _______________________________

---

## Tarea C1 -- Abrir el demo de la tabla de datos

Pasos:

1. En la barra de direcciones del navegador, escribi exactamente: `https://yujin.app/nac-spec/example-v21-data-table.php`
2. Presiona Enter.
3. Espera 5 segundos.

Resultado esperado:

- La pagina carga sin error.
- Arriba ves un titulo que dice "NAC v2.1 -- data-table primitive (live)".
- En el centro de la pagina hay un cuadrado blanco grande con texto + un boton azul que dice **"Edit invoice #INV-001"**.
- En el lado derecho de la pantalla hay un panel de chat (si no esta visible al cargar, busca arriba a la derecha el boton **"chat"** y clickealo para abrirlo).

- [ ] OK
- [ ] ERROR
Comentarios: _______________________________

---

## Tarea C2 -- Elegir castellano en el chat de este demo

**Importante:** este demo tiene su propio panel de chat con su propio dropdown de idioma. Hay que elegirlo otra vez.

Pasos:

1. Estas en la pagina del demo v21 (la abriste en C1).
2. Localiza el dropdown de idioma en la parte de arriba del panel de chat (lado derecho).
3. Hace click sobre el dropdown.
4. Elegi el codigo **"es"**.

Resultado esperado:

- El dropdown muestra "es".

- [ ] OK
- [ ] ERROR
Comentarios: _______________________________

---

## Tarea C3 -- Abrir el modal de la factura

Pasos:

1. El idioma del chat ya esta en "es" (desde C2).
2. Localiza el boton azul que dice **"Edit invoice #INV-001"** en el centro de la pagina.
3. Hace click sobre ese boton.
4. Espera 1 segundo.

Resultado esperado:

- Aparece un modal grande que cubre la mayor parte de la pantalla.
- El modal tiene como titulo "Edit invoice #INV-001".
- Adentro del modal **al fin** ves las pestanas. Hay al menos 2 pestanas en una fila: **"Lines (collection)"** y **"Permissions (matrix)"**.
- Adentro del modal hay una tabla con filas (productos con cantidad y precio).
- En la esquina del modal hay un boton "Cancel" y otro "Save".

- [ ] OK
- [ ] ERROR
Comentarios: _______________________________

---

## Tarea C4 -- Cambiar de pestana hablando

Pasos:

1. El modal "Edit invoice #INV-001" tiene que estar abierto (lo abriste en C3).
2. La pestana activa por defecto es "Lines (collection)" -- esta resaltada con un fondo gris claro.
3. Localiza el boton **"mic"** en el panel de chat de la derecha.
4. Hace click sobre el boton **"mic"**.
5. Si el navegador te pide permiso de microfono, hace click en "Permitir" o "Allow".
6. En voz alta y clara, deci: **"ve a permisos"**
7. Espera 2 segundos en silencio.
8. Si el "mic" sigue grabando, hace click otra vez para que pare.
9. Espera entre 3 y 10 segundos.

Resultado esperado:

- En el chat aparece tu transcripcion "ve a permisos" (o algo muy parecido).
- La pestana activa cambia de "Lines (collection)" a **"Permissions (matrix)"**.
- El contenido del modal cambia: ahora ves una grilla de permisos en lugar de una lista de items.

- [ ] OK
- [ ] ERROR
Comentarios: _______________________________

---

## Tarea C5 -- Volver a la pestana de filas

Pasos:

1. Sigues en el modal abierto del demo v21.
2. La pestana activa es "Permissions (matrix)" desde la tarea C4.
3. Hace click en el boton **"mic"**.
4. En voz alta deci: **"ve a lineas"**
5. Espera 2 segundos en silencio.
6. Si el "mic" sigue grabando, hace click otra vez.
7. Espera entre 3 y 10 segundos.

Resultado esperado:

- En el chat aparece la transcripcion.
- La pestana activa vuelve a **"Lines (collection)"**.
- El modal vuelve a mostrar la lista de items.

- [ ] OK
- [ ] ERROR
Comentarios: _______________________________

---

## Tarea C6 -- Agregar una fila a la tabla hablando

Pasos:

1. Sigues en el modal del demo v21 con la pestana "Lines (collection)" activa.
2. Mira la tabla actual. Antes de hacer este paso, anota mentalmente cuantas filas tiene (por ejemplo "tiene 3 filas").
3. Hace click en el boton **"mic"**.
4. En voz alta y clara, deci pausadamente: **"agrega una linea con concepto leche cantidad dos precio cien"**
5. Espera 2 segundos en silencio.
6. Si el "mic" sigue grabando, hace click otra vez.
7. Espera entre 5 y 15 segundos.

Resultado esperado:

- En el chat aparece la transcripcion de lo que dijiste.
- En la tabla aparece una **nueva fila** al final con: concepto "leche", cantidad 2, precio 100 (o algo cercano).
- La tabla ahora tiene una fila MAS que antes.
- El chat puede responder con un mensaje confirmando que agrego la fila.

- [ ] OK
- [ ] ERROR
Comentarios: _______________________________

---

## Tarea C7 -- Preguntar por el total de la tabla

Pasos:

1. Sigues en el modal con la tabla "Lines (collection)" visible.
2. Hace click en el boton **"mic"**.
3. En voz alta deci: **"cuanto total hay"**
4. Espera 2 segundos en silencio + soltar mic si sigue grabando.
5. Espera entre 5 y 10 segundos.

Resultado esperado:

- En el chat aparece la transcripcion.
- El chat responde con un numero que es la suma de los precios x cantidades de la tabla.
- Por los parlantes escuchas la voz leyendo el numero en castellano.

- [ ] OK
- [ ] ERROR
- [ ] OK pero no escuche audio
Comentarios: _______________________________

---

## Tarea D1 -- Demo de React: abrir y elegir castellano

Pasos:

1. En una nueva pestana del navegador, escribi: `https://yujin.app/nac-spec/demos/react/`
2. Presiona Enter.
3. Espera 5 segundos.
4. Si el panel de chat NO esta visible al cargar, busca arriba a la derecha el boton **"chat"** y clickealo para abrirlo.
5. **IMPORTANTE:** localiza el dropdown de idioma en el panel de chat y elegi **"es"**.

Resultado esperado:

- La pagina carga sin error.
- Ves una app "Todos" simple: tiene un titulo, un campo de texto vacio, un boton "Add", y un area abajo (sera la lista de todos, esta vacia).
- En el lado derecho hay un panel de chat (despues del click en "chat" si no estaba abierto), con el dropdown en "es".

- [ ] OK
- [ ] ERROR
Comentarios: _______________________________

---

## Tarea D2 -- React: agregar un todo a mano (teclado)

Pasos:

1. Estas en el demo de React con el idioma del chat en "es" (desde D1).
2. Hace click adentro del campo de texto del demo (no el del chat -- el campo arriba que dice algo como "Add a todo").
3. Escribi: `manzana`
4. Hace click en el boton **"Add"**.

Resultado esperado:

- En la lista debajo aparece un nuevo item: **"manzana"** con una casilla de seleccion al lado.
- El campo de texto se vacia.

- [ ] OK
- [ ] ERROR
Comentarios: _______________________________

---

## Tarea D3 -- React: agregar un todo hablando

Pasos:

1. Sigues en el demo de React. Ya tiene un item "manzana".
2. Hace click en el boton **"mic"** del panel de chat (lado derecho).
3. En voz alta deci: **"agrega pan"**
4. Espera 2 segundos en silencio + soltar mic si sigue grabando.
5. Espera entre 5 y 10 segundos.

Resultado esperado:

- En el chat aparece la transcripcion "agrega pan".
- En la lista de todos aparece un **nuevo** item "pan".
- La lista ahora tiene 2 items: "manzana" + "pan".

- [ ] OK
- [ ] ERROR
Comentarios: _______________________________

---

## Tarea D4 -- React: borrar un todo hablando

Pasos:

1. Sigues en el demo de React con 2 items en la lista ("manzana" + "pan").
2. Hace click en el boton **"mic"**.
3. En voz alta deci: **"borra manzana"**
4. Espera 2 segundos en silencio.
5. Si el "mic" sigue grabando, hace click otra vez.
6. Espera entre 5 y 10 segundos.

Resultado esperado:

- En el chat aparece la transcripcion.
- El item "manzana" **desaparece** de la lista.
- Solo queda "pan" en la lista.

- [ ] OK
- [ ] ERROR
Comentarios: _______________________________

---

## Tarea E1 -- Demo de Angular: las mismas pruebas

Pasos:

1. En una nueva pestana del navegador, escribi: `https://yujin.app/nac-spec/demos/angular/`
2. Presiona Enter.
3. Espera 5 segundos.
4. Localiza el dropdown de idioma del chat y elegi **"es"**.
5. Repeti las tareas D2, D3, D4 en esta demo (agregar a mano "manzana", agregar hablando "agrega pan", borrar hablando "borra manzana").

Resultado esperado:

- Las 3 operaciones funcionan **exactamente igual** que en el demo de React.
- La interfaz se ve practicamente identica.

- [ ] OK
- [ ] ERROR
Comentarios (escribi diferencias notables si las hay): _______________________________

---

## Tarea F1 -- "Cambia DE pestana" (frase ambigua)

**Que estamos probando:** En castellano, la frase "cambia DE pestana" significa "cambia a otra pestana". La palabra "de" aca es una preposicion, NO el codigo de idioma aleman. El chat tiene que entender la intencion correcta: el usuario quiere **cambiar de pestana**, no quiere cambiar el idioma del chat a aleman.

**Recordatorio de codigos de idioma del chat:**

- `es` = espanol (castellano).
- `en` = ingles.
- `de` = aleman (Deutsch).
- `fr` = frances.
- etc.

Pasos:

1. En una nueva pestana del navegador, escribi: `https://yujin.app/nac-spec/example-v21-data-table.php`
2. Presiona Enter.
3. **IMPORTANTE:** localiza el dropdown de idioma del chat y verifica que esta en **"es"** (espanol). Si no esta en "es", clickealo y ponelo en "es".
4. Hace click en el boton azul **"Edit invoice #INV-001"** para abrir el modal.
5. Hace click en el boton **"mic"** del panel de chat.
6. En voz alta y clara, deci: **"cambia de pestana"**
7. Espera 2 segundos en silencio.
8. Si el "mic" sigue grabando, hace click otra vez para que pare.
9. Espera entre 3 y 10 segundos.
10. **IMPORTANTE:** mira **dos cosas** con atencion:
    1. La pestana activa adentro del modal.
    2. El dropdown de idioma del panel de chat (arriba a la derecha).

Resultado esperado (los dos criterios tienen que cumplirse):

- **Criterio 1 -- la intencion fue entendida:** la pestana activa adentro del modal cambia (de "Lines (collection)" a "Permissions (matrix)" o viceversa). O alternativamente, el chat te pregunta una aclaracion en castellano (algo como "a que pestana queres ir?"). Cualquiera de las dos respuestas es valida -- significa que entendio que querias cambiar de pestana.

- **Criterio 2 -- el idioma del chat NO cambia a aleman:** el dropdown de idioma del chat sigue en **"es"**. NO se cambia a **"de"** (que seria aleman). Este es el bug que estamos buscando que NO ocurra: el sistema confundiendo la preposicion "de" con el codigo de idioma aleman.

Marca:

- [ ] OK -- los dos criterios se cumplen (cambio de pestana o pidio aclaracion + el idioma sigue en "es")
- [ ] ERROR -- el idioma del chat se cambio a "de" (aleman); esto es un bug grave que tenemos que arreglar antes de lanzar
- [ ] ERROR -- el chat no hizo nada o respondio algo que no entendi
Comentarios: _______________________________

---

## Tarea F2 -- Cambio explicito de idioma a aleman

**Que estamos probando:** que cuando el usuario **explicitamente** pide cambiar el idioma, el chat si lo cambie. Esto es lo opuesto de F1: aca queremos confirmar que el chat sabe distinguir un pedido explicito ("cambia el idioma a aleman") de una preposicion casual ("cambia de pestana").

Pasos:

1. Sigues en el demo v21 con el modal "Edit invoice #INV-001" abierto.
2. El chat sigue en idioma "es" (lo verificaste en F1).
3. Hace click en el boton **"mic"** del panel de chat.
4. En voz alta y clara, deci: **"cambia el idioma a aleman"**
5. Espera 2 segundos en silencio.
6. Si el "mic" sigue grabando, hace click otra vez.
7. Espera entre 3 y 10 segundos.
8. Mira el dropdown de idioma del chat.

Resultado esperado:

- El dropdown del chat **SI** se cambia a **"de"** (aleman, "Deutsch"). Este SI es el caso donde el cambio de idioma esta correctamente activado, porque vos lo pediste explicitamente.
- La proxima respuesta del chat aparece en aleman.

- [ ] OK
- [ ] ERROR -- pedi explicitamente cambiar a aleman pero el chat no lo hizo
Comentarios: _______________________________

---

## SIGN-OFF / Firma final

Completa los siguientes datos. Despues apreta el boton "Enviar reporte" al final del formulario.

- Etiqueta del release que probaste: (ejemplo `v2.2.0-rc1`)
- Tu nombre completo
- Tu email
- Navegador usado (Chrome, Firefox, Safari, Edge)
- Sistema operativo (Windows, macOS, Linux)
- Dispositivo (laptop, desktop, tablet)
- Veredicto general: `ready` (listo para lanzar), `needs fixes` (necesita arreglos), o `blocking` (problemas bloqueantes)
- Calificacion general del 1 al 10
- Los 3 problemas mas importantes que encontraste, si los hay
- Comentarios libres -- cualquier cosa que no encajaba en ninguna tarea de arriba

---

## Que pasa cuando aprietas "Enviar reporte"

- Tu reporte se manda automaticamente a los maintainers de Yujin.
- Vas a ver un mensaje "Gracias. Tu reporte fue enviado (ID #N)".
- Si el servidor no responde, el formulario abre tu cliente de email con todo el reporte ya pre-llenado en el cuerpo, para que lo mandes manualmente.

Gracias por testear.
