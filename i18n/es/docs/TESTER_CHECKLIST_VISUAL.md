---
translation_source: docs/TESTER_CHECKLIST_VISUAL.md
translation_source_hash: rewrite-2026-05-11-v2
translation_quality: human_rewrite_v2
translation_lang: es
translation_date: 2026-05-11T15:00:00+00:00
---

# NAC3 v2.2 -- Test visual del front-end (tester checklist en castellano)

**Para:** el tester hispanohablante que evalua el aspecto visual del producto.
**Tiempo estimado:** 30 minutos.
**Necesitas:** cualquier navegador moderno (Chrome recomendado).

## Como usar esta lista

Cada tarea tiene una lista de pasos numerados (1, 2, 3, ...). Hay que hacerlos **en orden**.

Despues de hacer los pasos, mira el bloque **"Que evaluar"** y comparalo con lo que ves en pantalla. Tomate 30 a 60 segundos por tarea antes de juzgar -- no te apures.

Despues marca **OK** si el aspecto visual es bueno, o **NECESITA ARREGLO** si hay algo que se ve mal, roto o amateur.

**Importante:** en **cada** tarea hay que escribir **al menos 1 oracion** en el cuadro de Comentarios, aun cuando marques OK. Describi lo que viste y como se sintio. El cuadro de comentarios es la parte mas importante de este test.

Si notas algo que no entra en ninguna lista de evaluacion, escribilo igual en Comentarios. Necesitamos tu opinion en palabras, no solo OK / ERROR.

Se honesto, no diplomatico. Un "Necesita arreglo" con un comentario util vale 10 veces mas que 10 OK reflejos.

---

## Tarea V1 -- Primera impresion de la pagina principal

Pasos:

1. Abri Chrome (o tu navegador preferido) en modo incognito (Ctrl+Shift+N).
2. En la barra de direcciones, escribi: `https://yujin.app/nac-spec/`
3. Presiona Enter.
4. Espera 5 segundos.
5. **Importante:** mira la pagina por 30 segundos sin hacer scroll.
6. Imagina que estas llegando por primera vez desde un link de Twitter.

Que evaluar:

- En menos de 10 segundos de leer, ¿queda claro que es NAC3?
- ¿La marca japonesa (sumi-e) se ve sin ser invasiva?
- ¿La tipografia es legible? ¿El contraste es bueno?
- ¿Hay lugares obvios para hacer click despues (Demo, Docs, etc)?
- ¿Se ve profesional o amateur?

- [ ] OK -- se ve profesional, mensaje claro
- [ ] NECESITA ARREGLO
Comentarios (obligatorio, al menos 1 oracion): _______________________________

---

## Tarea V2 -- Ritmo + espaciado

Pasos:

1. Estas en la misma pagina del paso anterior.
2. Hace scroll despacio desde arriba hasta abajo de la pagina.
3. Prestale atencion al ritmo vertical: como estan separadas las secciones.

Que evaluar:

- ¿Hay espacio en blanco adecuado entre secciones (ni demasiado apretado, ni demasiado disperso)?
- ¿Los titulos de seccion se distinguen del texto del cuerpo?
- ¿El ancho de las lineas de texto es comodo (ni muy ancho, ni muy angosto)?
- ¿Ningun elemento "se escapa" de su contenedor?

- [ ] OK
- [ ] NECESITA ARREGLO
Comentarios (obligatorio): _______________________________

---

## Tarea V3 -- Seccion "Made with NAC3"

Pasos:

1. Hace scroll hasta encontrar la seccion con titulo **"Made with NAC3"**.
2. Mira las 4 tarjetas de la grilla.

Que evaluar:

- ¿Las 4 tarjetas son del mismo tamano visual?
- ¿Los caracteres japoneses arriba de cada tarjeta se ven intencionales (no random)?
- ¿Cada tarjeta es legible -- titulo, descripcion, flecha del link, todo claro?
- ¿La seccion se siente como "adopters prestigiosos" o "contenido de relleno"?

- [ ] OK
- [ ] NECESITA ARREGLO
Comentarios (obligatorio): _______________________________

---

## Tarea V4 -- Seccion waitlist Forge + Pilot

Pasos:

1. Hace scroll hasta encontrar la seccion **"Coming Q3 2026: Yujin Forge + Pilot"**.
2. Mira las 2 tarjetas de producto + el formulario de email abajo.

Que evaluar:

- ¿Los dos precios ($19 y $5) son visualmente distintos?
- ¿Las listas de features (bullets) son faciles de escanear?
- ¿El formulario de email se ve limpio -- no apretado?
- ¿El texto del disclaimer BYOK es legible pero no gritando?
- ¿El boton "Notify me" se ve obvio y clickeable?

- [ ] OK
- [ ] NECESITA ARREGLO
Comentarios (obligatorio): _______________________________

---

## Tarea V5 -- Governance + footer

Pasos:

1. Hace scroll hasta el fondo de la pagina.
2. Mira la seccion "Open standard, open governance" + el footer.

Que evaluar:

- ¿El texto de governance es legible y tranquilizador?
- ¿El footer es minimo (caracter japones + licencia + link a GitHub + link a Yujin + version)?
- ¿No hay nada en el footer que se vea roto o desalineado?

- [ ] OK
- [ ] NECESITA ARREGLO
Comentarios (obligatorio): _______________________________

---

## Tarea V6 -- Demo vanilla (example.php)

Pasos:

1. En la barra de direcciones del navegador, escribi: `https://yujin.app/nac-spec/example.php`
2. Presiona Enter.
3. Espera 5 segundos sin interactuar.
4. Mira la pagina con calma.

Que evaluar:

- ¿Los widgets se sienten coherentes entre si o se ven tirados al azar?
- ¿Los colores son consistentes con el resto del producto (paleta sumi-e)?
- ¿Los botones se ven clickeables (con relieve, color, espacio)?
- ¿Los inputs se ven como inputs (donde claramente el cursor podria entrar)?
- ¿Las pestanas (si las hay) se ven como pestanas?

- [ ] OK
- [ ] NECESITA ARREGLO
Comentarios (obligatorio): _______________________________

---

## Tarea V7 -- Demo v20 (brownfield)

Pasos:

1. En la barra de direcciones, escribi: `https://yujin.app/nac-spec/example-v20-full.php`
2. Presiona Enter.
3. Espera 5 segundos.
4. **Importante:** buscá un panel chico que diga "v20-panel" generalmente arriba a la derecha.

Que evaluar:

- ¿El "v20-panel" es visible inmediatamente (no oculto, no cortado)?
- ¿Los botones del panel (describe_v2, validate_global_v2, etc) son legibles + distintos?
- ¿El panel se ve "atornillado" o se integra visualmente a la pagina?

- [ ] OK
- [ ] NECESITA ARREGLO
Comentarios (obligatorio): _______________________________

---

## Tarea V8 -- Demo data-table (v21)

Pasos:

1. En la barra de direcciones, escribi: `https://yujin.app/nac-spec/example-v21-data-table.php`
2. Presiona Enter.
3. Espera 5 segundos.
4. Hace click en el boton azul **"Edit invoice #INV-001"** en el centro.
5. Mira el modal que se abrio (con las pestanas y la tabla adentro).

Que evaluar:

- ¿La pestana activa se ve visualmente distinta de las inactivas?
- ¿Las filas de la tabla alternan color (rayas zebra) para legibilidad?
- ¿Los headers de columna se distinguen de las filas de datos?
- ¿Los botones de accion (agregar fila, etc) son faciles de encontrar?
- ¿El panel de chat del lado derecho no se superpone ni oculta la tabla?

- [ ] OK
- [ ] NECESITA ARREGLO
Comentarios (obligatorio): _______________________________

---

## Tarea V9 -- Demo de interoperabilidad (v22)

Pasos:

1. En la barra de direcciones, escribi: `https://yujin.app/nac-spec/example-v22-interop.php`
2. Presiona Enter.
3. Espera 5 segundos.
4. Mira la pagina (deberia tener dos mini-apps lado a lado).

Que evaluar:

- ¿Las dos apps estan claramente separadas (borde, color, espacio)?
- ¿Los 4 botones de accion ("Export tree", "Import remote", etc) son visibles arriba?
- ¿Si haces click en un boton, aparece feedback claro en algun panel de output?
- ¿La pagina se siente como "dos apps" y no como "una pagina confusa"?

- [ ] OK
- [ ] NECESITA ARREGLO
Comentarios (obligatorio): _______________________________

---

## Tarea V10 -- Demos React + Angular comparados

Pasos:

1. Abri en una nueva pestana: `https://yujin.app/nac-spec/demos/react/`
2. Abri en otra pestana: `https://yujin.app/nac-spec/demos/angular/`
3. Cambia entre las dos pestanas para compararlas lado a lado.

Que evaluar:

- ¿Se ven como la misma app implementada en 2 frameworks distintos (consistente)?
- ¿Ambas tienen UI limpia: input + boton + lista + chat?
- ¿Ambas tienen un panel de chat funcionando?
- ¿Ninguno tiene bugs visuales obvios (superposiciones, texto cortado, colores raros)?

- [ ] OK
- [ ] NECESITA ARREGLO
Comentarios (obligatorio): _______________________________

---

## Tarea V11 -- Panel de chat (layout)

Pasos:

1. Volve a la pagina principal: `https://yujin.app/nac-spec/`
2. Abri el panel de chat haciendo click en el boton **"chat"** arriba a la derecha (si no esta abierto).
3. Cambia el tamano de la ventana del navegador:
   - Hace la ventana **angosta** (~400px de ancho, como un celular).
   - Despues hace la ventana **ancha** (1400px o mas).

Que evaluar:

- En ventana ancha: ¿el chat queda anclado a la derecha sin aplastar el contenido?
- En ventana angosta: ¿el chat cubre toda la ventana o flota sensatamente?
- ¿El boton del microfono siempre es visible (nunca cortado)?
- ¿El boton Send siempre es clickeable?
- Cuando hay mensajes (si los hay), ¿user/assistant se distinguen visualmente?

- [ ] OK
- [ ] NECESITA ARREGLO
Comentarios (obligatorio): _______________________________

---

## Tarea V12 -- Legibilidad del chat

Pasos:

1. El panel de chat sigue abierto.
2. Elegi "es" en el dropdown de idioma.
3. Escribi en el chat 3 mensajes distintos (por ejemplo: `hola`, `que es NAC3`, `mostrame el ejemplo`).
4. Espera las respuestas.
5. Hace scroll por la conversacion.

Que evaluar:

- ¿Los mensajes tuyos y los del asistente se distinguen visualmente?
- ¿Las respuestas largas (multi-parrafo) se ven prolijas y se pueden hacer scroll limpiamente?
- ¿Si hay codigo en alguna respuesta, esta formateado de manera clara?
- ¿El tamano de fuente es comodo (no muy chico, no muy grande)?

- [ ] OK
- [ ] NECESITA ARREGLO
Comentarios (obligatorio): _______________________________

---

## Tarea V13 -- Mobile portrait

Pasos:

1. **Opcion A (preferida):** abri la pagina principal en tu celular (`https://yujin.app/nac-spec/`).
2. **Opcion B:** en Chrome desktop, presiona F12, despues hace click en el icono que parece un celular en la barra de herramientas para activar el modo movil; elegi un iPhone.
3. Hace scroll por toda la pagina.

Que evaluar:

- ¿No aparece una barra de scroll horizontal (el ancho de la pagina entra)?
- ¿Todos los botones son alcanzables con el pulgar (no muy chicos)?
- ¿El texto es legible sin hacer zoom?
- ¿Las imagenes / GIFs (si hay) no rompen el layout?

- [ ] OK
- [ ] NECESITA ARREGLO
Comentarios (obligatorio): _______________________________

---

## Tarea V14 -- Tablet landscape

Pasos:

1. En Chrome desktop, sigue en el modo movil de F12.
2. Cambia el dispositivo a un iPad (preferiblemente en orientacion horizontal/landscape).
3. Mira la pagina.

Que evaluar:

- ¿En el ancho mayor se activan layouts de multi-columna?
- ¿La pagina NO se queda angosta (~600px) en una pantalla de 1024px?
- ¿El espacio en blanco esta balanceado, no incomodo?

- [ ] OK
- [ ] NECESITA ARREGLO
Comentarios (obligatorio): _______________________________

---

## Tarea V15 -- Calificacion global

Pasos:

1. Cerra el modo movil de F12 (volve a desktop).
2. Volve a la pagina principal `https://yujin.app/nac-spec/` y navega un poco mas + visita 2 demos.
3. Sin pensar demasiado, califica la pagina en cada dimension.

Que evaluar (calificacion del 1 al 5, donde 1 es muy malo y 5 es excelente):

- Profesional vs amateur: __
- Marca sumi-e integrada naturalmente: __
- Jerarquia visual clara: __
- Eleccion de colores coherente: __
- Tipografia legible y con gusto: __
- Senal de confianza (¿tomarias el producto en serio?): __

Comentarios (obligatorio): _______________________________

---

## Tarea V16 -- Una cosa para cambiar

Pasos:

1. Pensalo bien por 2 minutos.

Que evaluar:

- Si pudieras cambiar UNA cosa visual en todo el sitio que mas lo mejoraria, ¿que seria?

Tu respuesta (obligatorio, 1 a 3 oraciones): _______________________________
_______________________________

---

## Tarea V17 -- Una cosa para preservar

Pasos:

1. Pensalo bien por 2 minutos.

Que evaluar:

- ¿Que UNA decision visual del sitio te impresiona mas y deberia quedarse?

Tu respuesta (obligatorio): _______________________________

---

## Tarea V18 -- Juicio de confianza

Pasos:

1. Imagina que sos un CTO de una empresa mediana viendo NAC3 por primera vez.

Que evaluar:

- ¿Confiarias en la empresa atras de este producto lo suficiente como para considerar adoptar NAC3 en produccion?
- ¿Por que si o por que no?

- [ ] Si, confiaria
- [ ] No, no confiaria (aun)
Por que (obligatorio): _______________________________

---

## Tarea V19 -- Comparacion con pares

Pasos:

1. Pensa en otras landing pages de dev tools / open standards que conoces (por ejemplo: anthropic.com, vercel.com, linear.app, notion.so, raycast.com).

Que evaluar:

Comparado con esas, el sitio NAC3 se ve:

- [ ] Mejor
- [ ] A la par
- [ ] Abajo
- [ ] Muy abajo

¿Que especificamente? (obligatorio): _______________________________

---

## Tarea V20 -- Caja de feedback libre

Cualquier cosa que viste que no entro en ninguna tarea de arriba: bugs, copy raro, espaciado raro, links rotos, flujos confusos, oportunidades perdidas, ideas para mejorar.

Escribi todo lo que se te ocurra (cuanto mas detalle, mejor):

_______________________________
_______________________________
_______________________________
_______________________________
_______________________________
_______________________________

---

## SIGN-OFF / Firma final

Completa los siguientes datos. Despues apreta el boton "Enviar reporte" al final del formulario.

- Etiqueta del release que probaste: (ejemplo `v2.2.0-rc1`)
- Tu nombre completo
- Tu email
- Navegador usado (Chrome, Firefox, Safari, Edge)
- Sistema operativo (Windows, macOS, Linux)
- Dispositivo (laptop, desktop, tablet, mobile)
- Calificacion visual global (1 a 10): __
- Veredicto para lanzamiento:
  - `ready` (lo visual esta listo para lanzar)
  - `needs fixes` (lo visual necesita arreglos pero no es bloqueante)
  - `blocking` (lo visual bloquea el lanzamiento)
- Los 3 problemas visuales mas importantes para arreglar (en orden de prioridad)

---

## Que pasa cuando aprietas "Enviar reporte"

- Tu reporte se manda automaticamente a los maintainers de Yujin.
- Vas a ver un mensaje "Gracias. Tu reporte fue enviado (ID #N)".
- Si el servidor no responde, el formulario abre tu cliente de email con todo el reporte ya pre-llenado.

Gracias por testear.
