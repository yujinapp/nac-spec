# Como grabar el GIF hero de NAC3 -- Voz en castellano (variante latam)

**Para:** alguien con experiencia en imagen y marketing pero sin conocimientos tecnicos.
**Tiempo total estimado:** 30 a 45 minutos (incluye instalacion + varios intentos de grabacion).
**Resultado:** un archivo `.gif` de 10 a 15 segundos, peso menor a 2 MB.
**Donde se va a usar:** version en castellano para LinkedIn, redes sociales latinoamericanas, o materiales de prensa en castellano. (La version con voz en ingles existe en otro archivo, para Hacker News y X internacional.)

---

## Parte A -- Preparacion (10 minutos)

### A1. Instalar la herramienta de grabacion (ScreenToGif)

ScreenToGif es una aplicacion gratuita de Windows para grabar la pantalla como GIF.

1. Abri tu navegador (Chrome, Firefox o el que uses).
2. Andate a esta direccion: `https://www.screentogif.com/`
3. Buscá el boton azul que dice **"Download"** en el centro de la pagina y hace click.
4. Elegi el formato **"Installer"** (el archivo `.exe`).
5. Esperá a que se descargue el archivo (peso aproximado 13 MB).
6. Buscá el archivo descargado en la carpeta de Descargas. Se llama algo como `ScreenToGif.X.Y.Setup.exe`.
7. Hace doble click sobre el archivo.
8. Windows te puede preguntar **"¿Quieres permitir que esta aplicacion realice cambios?"**. Hace click en **"Si"**.
9. Aparece el instalador. Apretá **"Install"** y despues **"Next"** hasta el final.
10. Al final marca **"Launch ScreenToGif"** y apretá **"Finish"**.

ScreenToGif se abre. Vas a ver una ventana chica con 4 botones grandes: **Recorder**, **Webcam**, **Board**, **Editor**. Dejala abierta.

### A2. Abrir Chrome con el demo de NAC3

1. Abri Google Chrome. **Importante:** debe ser Chrome (no Firefox, no Safari). El navegador con la mejor compatibilidad para esta grabacion.
2. Apretá las teclas **Ctrl + Shift + N** todas juntas. Eso abre una ventana de Chrome **en modo incognito** (para evitar interferencia de extensiones).
3. En la barra de direcciones, escribi exactamente:
   ```
   https://yujin.app/nac-spec/example-v21-data-table.php
   ```
4. Apretá Enter.
5. Esperá 5 segundos a que cargue todo.

Lo que tenés que ver en pantalla:

- Arriba a la izquierda hay un dibujo japones (sumi-e) + el texto "NAC".
- En el medio hay un cuadro blanco con texto + un boton azul que dice **"Edit invoice #INV-001"**.
- En el lado derecho hay un panel de chat con varios botones (mic, hands-free, send, etc).

Si la pantalla no se ve asi, refrescala con **Ctrl + F5** y esperá de nuevo.

### A3. Configurar el demo: idioma castellano

**Importante:** esta version graba con voz EN CASTELLANO. El idioma del chat tiene que estar en "es" para que el reconocimiento de voz sea correcto.

1. Mirá el panel de chat (lado derecho de la pantalla). En la parte de arriba del panel hay un menu desplegable chiquito con un codigo de 2 letras (puede decir "en" o "es"). Hace click sobre ese desplegable.
2. **Elegi el codigo "es"** (castellano).
3. Hace click sobre el boton azul **"Edit invoice #INV-001"** en el centro de la pagina.

   Despues del click va a aparecer una ventana grande en el medio de la pantalla con una tabla adentro y dos pestanas en la parte de arriba que dicen "Lines (collection)" y "Permissions (matrix)".

4. **Importante:** anotá mentalmente cuantas filas tiene la tabla en este momento. Por ejemplo: "tiene 3 filas". Lo necesitamos para el resultado esperado de la grabacion (la tabla tendria que tener UNA fila mas despues de hablar al microfono).

### A4. Acomodar la ventana para grabar

1. Achicá la ventana de Chrome a un tamano comodo: aproximadamente 1280 pixeles de ancho por 800 pixeles de alto. No es necesario que sea exacto.
2. Posicioná la ventana en el centro de la pantalla. Las pestanas + barra de direcciones del browser quedan visibles arriba.
3. **NO maximices** la ventana de Chrome. Tiene que estar en modo "ventana", no full-screen.

---

## Parte B -- Grabacion (15 minutos, varios intentos esperados)

### B1. Abrir ScreenToGif y posicionar el rectangulo de captura

1. Abri ScreenToGif (deberia estar en el menu inicio o en el escritorio).
2. En la ventana principal de ScreenToGif, hace click sobre el primer boton grande: **"Recorder"**.
3. Aparece un rectangulo semi-transparente con borde rojo sobre la pantalla. Eso es el area que se va a grabar.
4. Ajustá ese rectangulo arrastrando los bordes y las esquinas. Tiene que cubrir:

   - El modal con la tabla y las pestanas.
   - El panel de chat completo de la derecha.

5. **NO incluyas** dentro del rectangulo:

   - La barra de pestanas del browser.
   - La barra de direcciones.
   - La barra de favoritos.
   - La barra del menu inicio de Windows.

6. El rectangulo ideal cubre solo el contenido relevante: tabla + chat. Imaginate que es un "frame" alrededor de lo que queres mostrar.

### B2. Configurar FPS

1. En la barra de abajo de ScreenToGif (esta dentro del rectangulo de captura) hay un campo numerico que dice **"FPS"** o **"Cuadros por segundo"**.
2. Cambia ese numero a **15**. Es lo ideal: bastante fluido para que se vea bien, pero archivos chicos.

### B3. La grabacion (intento 1)

**Importante:** vas a tener 12-15 segundos para hacer todo. Practicá una vez sin grabar antes.

1. Hace click sobre el boton **"Record"** (rojo, abajo a la derecha del rectangulo de captura).
2. ScreenToGif te da una **cuenta regresiva de 3 segundos** antes de empezar a grabar (3... 2... 1...).
3. **Cuando empieza a grabar**, hace EXACTAMENTE en este orden:

   a. **Segundo 0-1:** quedate quieto, solo dejá que se vea el modal abierto con la tabla.

   b. **Segundo 1-2:** mové el mouse hacia el boton **"mic"** del panel de chat (es el primer boton arriba del campo de texto del chat).

   c. **Segundo 2-3:** hace click sobre **"mic"**. El boton va a cambiar de color o aparecer un indicador de grabacion.

   d. **Segundo 3-8:** **deci en voz clara la siguiente frase en castellano**:

      > **"Agrega un monitor, cantidad uno, precio doscientos cincuenta."**

      Pronunciacion sugerida: "A-GRE-ga un mo-ni-TOR, can-ti-DAD U-no, PRE-cio dos-cien-tos cin-CUEN-ta". Hablá calmadamente, claro, sin acelerar. Si te trabás, deja que se grabe igual y haces un segundo intento despues.

   e. **Segundo 8-10:** quedate quieto. El microfono se va a apagar solo o haces click otra vez en "mic" si sigue grabando. La transcripcion de lo que dijiste va a aparecer en el chat (algo asi como "agrega un monitor cantidad uno precio doscientos cincuenta").

   f. **Segundo 10-12:** mira a la tabla. Tendria que aparecer una fila nueva al final que dice algo como "monitor / 1 / 250" (puede decir "Monitor" en castellano o no, depende de como el sistema lo interprete).

   g. **Segundo 12-15:** quedate quieto un segundo mas dejando ver la fila nueva.

4. Apretá **"Stop"** (cuadrado, donde antes estaba "Record") para terminar la grabacion.

5. ScreenToGif abre automaticamente el **Editor** con el video grabado en formato de cuadros (frames).

### B4. Revisar el video grabado

1. En el editor, vas a ver una linea de tiempo con todos los cuadros.
2. Apretá **"Play"** (triangulo arriba a la izquierda) para ver el resultado.
3. Si:

   - **Esta perfecto** (la frase se entiende, la fila aparece): segui al paso B5.
   - **Algo salio mal** (la transcripcion no agrega la fila, te trabaste, la fila no aparecio, el chat no respondio): cerrá el editor sin guardar y volve al paso B3 para intentar de nuevo. Es normal hacer 3-5 intentos. No te frustres.

### B5. Recortar el video si quedo muy largo

1. Si el video duro mas de 15 segundos, recortá los segundos iniciales o finales que sean redundantes.
2. En la linea de tiempo abajo, elegi los frames que queres borrar arrastrando.
3. Apretá la tecla **Delete** para borrarlos.
4. Apretá Play de nuevo para verificar que el resultado quedo bien.

---

## Parte C -- Exportacion (5 minutos)

### C1. Exportar como GIF

1. En el menu de arriba del editor, hace click en **"Save as"** o **"File" -> "Save as"**.
2. Elegi formato **"Gif"** (no MP4, no WebM, no APNG -- tiene que ser GIF).
3. Llenar:

   - **File name:** `nac3-hero-voice-es.gif`
   - **Save to:** Escritorio (mas facil de encontrar despues).

4. Apretá **"Save"**.
5. Esperá unos segundos a que termine de exportar.

### C2. Verificar peso del archivo

1. Andá al Escritorio.
2. Buscá `nac3-hero-voice-es.gif`.
3. Hace click derecho sobre el archivo -> **"Propiedades"**.
4. Mirá el **"Tamano"** del archivo.
5. Si pesa MENOS DE 2 MB: perfecto, terminamos.
6. Si pesa MAS DE 2 MB: pasá al paso C3 (compresion).

### C3. Comprimir si pesa mas de 2 MB

Hay 2 opciones para reducir el peso:

**Opcion A: Recomprimir en ScreenToGif**

1. Volve al editor de ScreenToGif (con el GIF original cargado).
2. En el menu de arriba: **"Image" -> "Reduce frame count"**.
3. Ajustá el slider para sacar la mitad de los frames.
4. Click "Apply" + Save as GIF de nuevo con el mismo nombre.

**Opcion B: Comprimir online en gifski**

1. Abri https://gif.ski
2. Arrastrá tu archivo GIF a la pagina.
3. Esperá que procese (15-30 segundos).
4. Descargá el resultado.
5. Reemplazá el archivo original en tu Escritorio.

---

## Parte D -- Entrega

1. Manda el archivo `nac3-hero-voice-es.gif` por email a `pablo.kuschnirof@gmail.com` con asunto **"GIF NAC3 hero voz castellano -- listo"**.
2. Si el archivo pesa mas de 25 MB y el email no lo deja adjuntar (cosa rara, no deberia pasar): subilo a Google Drive y compartime el link.

---

## Checklist final antes de entregar

- [ ] El GIF dura entre 10 y 15 segundos.
- [ ] La voz en castellano se escucha clara en la frase **"Agrega un monitor, cantidad uno, precio doscientos cincuenta"**.
- [ ] Se ve el momento en que aparece la fila nueva en la tabla.
- [ ] El peso del archivo es menor a 2 MB.
- [ ] El nombre del archivo es `nac3-hero-voice-es.gif` (importante el sufijo `-es` para distinguir de la version con voz en ingles).

Si todo eso esta tildado, ya esta. Gracias!

---

## Aclaracion sobre cuando usar voz en castellano vs ingles

- **Voz en ingles** (`nac3-hero-voice-en.gif`): para Hacker News, X/Twitter, audiencias internacionales tech, dev.to, sitios en ingles.
- **Voz en castellano** (`nac3-hero-voice-es.gif`, este guion): para LinkedIn en perfiles latam, redes sociales en castellano, prensa tecnica en castellano, conferencias o talks en castellano.

Las dos versiones se entregan al equipo y se usan en distintos canales segun el target.
