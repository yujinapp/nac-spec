---
translation_source: docs/HUMAN_OK_CHECKLIST_TESTER.md
translation_source_hash: rewrite-2026-05-11-v2
translation_quality: human_rewrite_v2
translation_lang: es
translation_date: 2026-05-11T14:45:00+00:00
---

# NAC3 v2.2 -- Test smoke general (tester checklist en castellano)

**Para:** el tester hispanohablante que va a hacer la pasada general.
**Tiempo estimado:** 60 a 90 minutos.
**Necesitas:**

- Chrome instalado y actualizado (obligatorio para la primera mitad).
- Firefox instalado (para una seccion mas adelante).
- Una computadora con microfono y parlantes/auriculares.
- Si tenes acceso a Safari (Mac) o Edge (Windows), mejor.

## Como usar esta lista

Cada tarea tiene una lista de pasos numerados (1, 2, 3, ...). Hay que hacerlos **en orden** sin saltar ninguno.

Despues de los pasos, mira el bloque **"Resultado esperado"**. Si lo que ves coincide: marca **OK**.

Si algo es distinto, no funciona o aparece un error: marca **ERROR** y escribi en **Comentarios** que viste exactamente. Despues segui con la tarea siguiente -- no te traves.

Al final del formulario, completa la firma final y apreta **Enviar reporte**.

---

## Tarea 1 -- Abrir la pagina principal (Chrome)

Pasos:

1. Abri Chrome.
2. Presiona Ctrl+Shift+N para abrir una ventana de incognito.
3. En la barra de direcciones, escribi: `https://yujin.app/nac-spec/`
4. Presiona Enter.
5. Espera 5 segundos sin hacer click en nada.

Resultado esperado:

- La pagina carga sin error.
- Arriba a la izquierda ves un dibujo sumi-e + el texto "NAC".
- Arriba a la derecha hay una fila de botones que incluye "tour" y "chat".
- En el centro hay un titulo grande "Drive web UIs by voice, chat, AI".
- No hay ningun mensaje rojo de error en la pantalla.

- [ ] OK
- [ ] ERROR
Comentarios: _______________________________

---

## Tarea 2 -- Consola de desarrollador sin errores

Pasos:

1. Estas en la pagina del paso 1.
2. Presiona la tecla F12 para abrir las herramientas de desarrollador del navegador.
3. En la barra de tabs de las herramientas, hace click en **"Console"**.
4. Espera 3 segundos.

Resultado esperado:

- En el panel Console no hay lineas rojas de error.
- Puede haber lineas amarillas (warnings) -- esas no son problema.

- [ ] OK
- [ ] ERROR
Comentarios: _______________________________

---

## Tarea 3 -- Cerrar la consola

Pasos:

1. Presiona F12 otra vez para cerrar las herramientas de desarrollador.

Resultado esperado:

- Las herramientas de desarrollador se cierran. La pagina queda visible al 100%.

- [ ] OK
- [ ] ERROR
Comentarios: _______________________________

---

## Tarea 4 -- Seccion "Made with NAC3"

Pasos:

1. En la pagina principal, baja con la rueda del mouse o con la barra de desplazamiento.
2. Buscá una seccion que tiene como titulo **"Made with NAC3"**.
3. Mira las tarjetas adentro de esa seccion.

Resultado esperado:

- Encontras la seccion "Made with NAC3" en la pagina.
- Adentro hay al menos 4 tarjetas en una grilla.
- Las tarjetas son: "Yujin CRM", "Reference demos", "Atlas Pro voice ad", y "Your app".
- Cada tarjeta tiene arriba un caracter japones, un titulo, una descripcion corta, y un link con una flecha `->`.

- [ ] OK
- [ ] ERROR
Comentarios: _______________________________

---

## Tarea 5 -- Seccion waitlist Forge/Pilot

Pasos:

1. Sigue bajando en la pagina principal.
2. Buscá una seccion con titulo **"Coming Q3 2026: Yujin Forge + Pilot"**.
3. Adentro hay un formulario con un campo de email.

Resultado esperado:

- Encontras la seccion.
- El campo de email dice "you@example.com" como placeholder.
- Debajo hay dos casillas marcadas "Forge ($19)" y "Pilot ($5)".
- Hay un boton azul que dice "Notify me".

- [ ] OK
- [ ] ERROR
Comentarios: _______________________________

---

## Tarea 6 -- Probar el formulario de waitlist

Pasos:

1. En el campo de email del formulario waitlist, escribi tu email **o** un email de prueba (`test@example.com` esta bien).
2. Verifica que las dos casillas "Forge" y "Pilot" estan marcadas.
3. Hace click en el boton **"Notify me"**.
4. Espera 5 segundos.

Resultado esperado:

- Aparece un mensaje al lado del boton, alguno de estos dos:
  1. **"Got it. You will hear from us when Forge + Pilot launch."** (significa que se mando bien)
  2. **"Submission failed -- email hello@yujin.app instead."** (significa que el servidor no respondio pero el fallback funciono)
- Cualquiera de los dos mensajes es aceptable -- ambos indican que el formulario esta cableado.

- [ ] OK
- [ ] ERROR
Comentarios: _______________________________

---

## Tarea 7 -- Abrir el demo data-table

Pasos:

1. En la barra de direcciones del navegador, escribi: `https://yujin.app/nac-spec/example-v21-data-table.php`
2. Presiona Enter.
3. Espera 5 segundos.

Resultado esperado:

- La pagina carga sin error.
- Ves un titulo "NAC v2.1 -- data-table primitive (live)".
- En el centro hay un cuadrado blanco con texto + un boton azul **"Edit invoice #INV-001"**.
- En el lado derecho hay un panel de chat (si no esta visible al cargar, busca arriba a la derecha el boton **"chat"** y clickealo para abrirlo).

- [ ] OK
- [ ] ERROR
Comentarios: _______________________________

---

## Tarea 8 -- Elegir castellano en el chat del demo

Pasos:

1. Estas en el demo v21 (paso 7).
2. Localiza el dropdown de idioma en la parte de arriba del panel de chat (lado derecho).
3. Hace click sobre el dropdown.
4. Elegi **"es"**.

Resultado esperado:

- El dropdown muestra "es".

- [ ] OK
- [ ] ERROR
Comentarios: _______________________________

---

## Tarea 9 -- Abrir el modal de la factura

Pasos:

1. Hace click sobre el boton azul **"Edit invoice #INV-001"** en el centro de la pagina.
2. Espera 1 segundo.

Resultado esperado:

- Aparece un modal grande que cubre la mayor parte de la pantalla.
- Tiene titulo "Edit invoice #INV-001".
- Adentro ves pestanas: **"Lines (collection)"** y **"Permissions (matrix)"**.
- Adentro hay una tabla con filas (productos con cantidad y precio).
- En la esquina del modal hay botones "Cancel" y "Save".

- [ ] OK
- [ ] ERROR
Comentarios: _______________________________

---

## Tarea 10 -- Cambiar pestanas con el mouse

Pasos:

1. El modal "Edit invoice" sigue abierto.
2. La pestana activa es "Lines (collection)" (resaltada con fondo gris claro).
3. Hace click sobre la pestana **"Permissions (matrix)"**.
4. Espera 1 segundo.
5. Hace click sobre **"Lines (collection)"** para volver.

Resultado esperado:

- Cuando hiciste click en "Permissions", la pestana resaltada cambio + el contenido del modal cambio (ahora se ve una grilla de permisos).
- Cuando hiciste click de vuelta en "Lines", volvio a verse la tabla original.
- Ninguna pestana se "trabo".

- [ ] OK
- [ ] ERROR
Comentarios: _______________________________

---

## Tarea 11 -- Cerrar el modal

Pasos:

1. Hace click sobre el boton **"Cancel"** del modal (esquina superior derecha del modal).
2. Espera 1 segundo.

Resultado esperado:

- El modal se cierra.
- Volves a ver la pagina del demo con el boton "Edit invoice #INV-001" en el centro.

- [ ] OK
- [ ] ERROR
Comentarios: _______________________________

---

## Tarea 12 -- Abrir el demo React

Pasos:

1. En la barra de direcciones del navegador, escribi: `https://yujin.app/nac-spec/demos/react/`
2. Presiona Enter.
3. Espera 5 segundos.
4. Si el panel de chat NO esta visible al cargar, busca arriba a la derecha el boton **"chat"** y clickealo para abrirlo.

Resultado esperado:

- La pagina carga sin error.
- Ves una app "Todos" simple: un campo de texto, un boton "Add", y un area abajo (lista de todos vacia).
- En el lado derecho aparece el panel de chat (despues del click en "chat" si no estaba abierto).

- [ ] OK
- [ ] ERROR
Comentarios: _______________________________

---

## Tarea 13 -- Elegir castellano en el chat del demo React

Pasos:

1. Localiza el dropdown de idioma del panel de chat del demo React.
2. Hace click.
3. Elegi **"es"**.

Resultado esperado:

- El dropdown muestra "es".

- [ ] OK
- [ ] ERROR
Comentarios: _______________________________

---

## Tarea 14 -- Agregar un todo a mano

Pasos:

1. En el demo React, hace click adentro del campo de texto del demo (no el del chat -- el campo principal del demo que dice algo como "Add a todo").
2. Escribi: `leche`
3. Hace click en el boton **"Add"** del demo.

Resultado esperado:

- En la lista de todos aparece un item nuevo: **"leche"** con una casilla de seleccion al lado.
- El campo de texto se vacio.

- [ ] OK
- [ ] ERROR
Comentarios: _______________________________

---

## Tarea 15 -- Abrir el demo Angular

Pasos:

1. En la barra de direcciones, escribi: `https://yujin.app/nac-spec/demos/angular/`
2. Presiona Enter.
3. Espera 5 segundos.
4. Si el panel de chat NO esta visible al cargar, busca arriba a la derecha el boton **"chat"** y clickealo para abrirlo.

Resultado esperado:

- La pagina carga sin error.
- Ves la misma estructura que el demo React: app Todos + chat panel (despues del click en "chat" si no estaba abierto).

- [ ] OK
- [ ] ERROR
Comentarios: _______________________________

---

## Tarea 16 -- Repetir agregar todo a mano en Angular

Pasos:

1. Localiza el dropdown de idioma del chat de Angular y elegi **"es"**.
2. Hace click en el campo de texto del demo Angular.
3. Escribi: `manzana`
4. Hace click en **"Add"**.

Resultado esperado:

- En la lista aparece **"manzana"**.
- El campo se vacio.
- La operacion funciona identicamente al demo React.

- [ ] OK
- [ ] ERROR
Comentarios: _______________________________

---

## Tarea 17 -- Probar Firefox (cross-browser smoke)

Pasos:

1. Abri Firefox (si no lo tenes, descargalo de https://www.mozilla.org/firefox).
2. Abri una pestana de Navegacion Privada (Ctrl+Shift+P).
3. En la barra de direcciones, escribi: `https://yujin.app/nac-spec/`
4. Presiona Enter.
5. Espera 5 segundos.

Resultado esperado:

- La pagina carga sin error igual que en Chrome.
- Se ve practicamente identica.

- [ ] OK
- [ ] ERROR
Comentarios: _______________________________

---

## Tarea 18 -- Firefox: data-table demo

Pasos:

1. En Firefox, escribi: `https://yujin.app/nac-spec/example-v21-data-table.php`
2. Presiona Enter.
3. Espera 5 segundos.
4. Hace click en **"Edit invoice #INV-001"** para abrir el modal.
5. Hace click sobre cada una de las pestanas que ves arriba ("Lines (collection)" + "Permissions (matrix)").

Resultado esperado:

- Cada click cambia el contenido del modal.
- No aparecen errores.
- Ninguna pestana se "traba".

- [ ] OK
- [ ] ERROR
Comentarios: _______________________________

---

## Tarea 19 -- Safari o Edge (un tercer navegador)

Pasos:

1. Abri Safari (en Mac) o Edge (en Windows).
2. Si no tenes ninguno de los dos, marca "Skipped" y pasa a la siguiente tarea.
3. Andate a `https://yujin.app/nac-spec/`
4. Espera 5 segundos.

Resultado esperado:

- La pagina carga sin error igual que en Chrome y Firefox.

- [ ] OK
- [ ] ERROR
- [ ] Skipped (no tengo Safari ni Edge)
Comentarios: _______________________________

---

## Tarea 20 -- Navegacion solo con teclado (sin mouse)

Pasos:

1. Volve a Chrome o Firefox, abrí `https://yujin.app/nac-spec/`.
2. **Desconecta o ignora el mouse** -- no lo uses para esta tarea.
3. Presiona la tecla Tab repetidamente, al menos 15 veces.

Resultado esperado:

- Con cada Tab, ves un "anillo de foco" (focus ring) azul o de color visible saltando por la pagina entre botones y enlaces.
- El foco siempre es visible -- nunca desaparece en una zona invisible.

- [ ] OK
- [ ] ERROR
Comentarios: _______________________________

---

## Tarea 21 -- Zoom 200%

Pasos:

1. En la misma pestana del paso 20, presiona Ctrl+= (Ctrl y el signo igual) repetidamente hasta que el indicador de zoom del navegador llegue a 200%.
2. Hace scroll por toda la pagina de arriba a abajo.

Resultado esperado:

- Todo el texto se lee sin problemas.
- Los botones siguen siendo clickeables.
- Ningun texto queda cortado o superpuesto con otros elementos.
- No aparece una barra de scroll horizontal.

- [ ] OK
- [ ] ERROR
Comentarios: _______________________________

---

## Tarea 22 -- Restaurar zoom

Pasos:

1. Presiona Ctrl+0 (Ctrl y cero) para restaurar el zoom al 100%.

Resultado esperado:

- La pagina vuelve a su tamano normal.

- [ ] OK
- [ ] ERROR
Comentarios: _______________________________

---

## Tarea 23 -- URLs criticas: chequeo de "no 404"

Pasos:

Para cada URL de la tabla siguiente: copiala y pegala en la barra de direcciones del navegador, presiona Enter y verifica que **no da error 404 ni pagina en blanco**.

| URL | OK? (escribi "ok" o "error") |
|-----|-----|
| https://yujin.app/nac-spec/ | __ |
| https://yujin.app/nac-spec/SPEC.md | __ |
| https://yujin.app/nac-spec/js/nac.js | __ |
| https://yujin.app/nac-spec/example.php | __ |
| https://yujin.app/nac-spec/example-v21-data-table.php | __ |
| https://yujin.app/nac-spec/example-v22-interop.php | __ |
| https://yujin.app/nac-spec/demos/react/ | __ |
| https://yujin.app/nac-spec/demos/angular/ | __ |

- [ ] Todas OK
- [ ] Al menos una fallo (especificá en Comentarios cual fallo)
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
- Si el servidor no responde, el formulario abre tu cliente de email con todo el reporte ya pre-llenado.

Gracias por testear.
