# ALIGNERR -- Contractor Agreement: lectura de consecuencias

**Fecha:** 2026-11-11 · **Registro:** PND-107 · **Documento interno** (vive bajo
`docs/internal/`, excluido del sitio por la regla anclada del `rsync`).

---

## 0. Qué es esto, y qué no es

Es la lectura del texto que me pasaste, cláusula por cláusula, orientada a **una sola
pregunta**: qué le pasa a nac-spec, a Yujin Forge y a la escalera Urazuke si aceptás.

**No es asesoramiento legal y yo no soy abogado.** Lo que sigue es lectura de un texto
en inglés redactado bajo ley de California. Una cesión de propiedad intelectual que
toca un producto **ya publicado y con adoptantes** amerita un abogado de PI matriculado
en California, y amerita que lo mire **antes** del click, no después. El valor de este
documento es que te dice **dónde mirar** y **qué pedir**, no que te reemplace al abogado.

Las partes: **ALIGNERR LLC** ("Client") y vos ("Contractor"). Ley aplicable: California.
Foro: arbitraje JAMS en el condado de San Francisco, en inglés. Forma de aceptación: un
botón "I ACCEPT" --- que según el propio texto "will create a legally enforceable
contract ... **without modification**".

---

## 1. Las cinco consecuencias que importan

### 1. Tal como está, meter nac-spec adentro **lo prohíbe el propio contrato**

Sección 1, última oración:

> "Contractor agrees that it will not (and will not permit others to) ... **except as
> expressly authorized by Client in writing hereafter, use or disclose at any time
> Contractor's own** or any third party's confidential information or **intellectual
> property in connection with the Services**."

Leído de frente: usar **tu propia** propiedad intelectual en los Services está prohibido
**por omisión**. Hace falta autorización **escrita y previa** de Alignerr. Tu plan ---
"meter el proyecto en Alignerr" --- es, sin ese papel, un incumplimiento desde el primer
día. Y el incumplimiento de las secciones 2 y 3 habilita medidas cautelares (sección 8).

Esto es lo primero de la lista porque **no es un riesgo, es un bloqueo**: el plan, tal
como está descripto, no entra por la puerta que el contrato deja abierta.

### 2. El roadmap de 112 horas que estimamos hoy caería **del lado de ellos**

Sección 2(a). La cesión no se limita a lo que entregás en una tarea:

> "...all other intellectual property rights ... relating to any and all inventions
> (whether or not patentable), works of authorship ... **made or conceived or reduced to
> practice, in whole or in part, by or for or on behalf of Contractor during the term of
> this Agreement** that **relate to the subject matter of or arise out of or in
> connection with the Services** or any Proprietary Information."

Tres cosas de esa redacción, en orden de gravedad:

* **"during the term"**: la ventana es temporal, no por tarea. Todo lo que concibas
  mientras el acuerdo esté vivo entra en el radio, hayas cobrado por eso o no.
* **"in whole or in part"**: no hace falta que la invención nazca ahí. Basta que una parte
  se concrete durante el término. Lo publicado hasta la 2.5.2 fue concebido **antes** y
  queda afuera por fecha --- pero **PND-095, PND-096 y las siete superficies** (canvas,
  XR, video, PDF, mapas, grillas virtualizadas, voz sin nodos, agentes por captura) son,
  literalmente, invenciones a concebir de acá en adelante.
* **"relate to the subject matter of ... the Services"**: acá está el nudo. Si las tareas
  que elegís son sobre trazas de ingeniería de software y navegabilidad por IA --- que es
  exactamente lo que querés hacer --- entonces la relación con la materia es **máxima**, y
  con ella el alcance de la cesión. Cuanto más cerca está la tarea de tu negocio, más
  grande es la red.

Y el detalle que agrava todo: **este contrato no tiene schedule de invenciones previas.**
Los acuerdos de este tipo suelen traer un Anexo A donde el contratista **lista lo que ya
era suyo** y queda excluido. Acá no hay. Tampoco hay aviso del artículo 2870 del Código
Laboral de California (el que limita este tipo de cesión), que el 2872 obliga a dar ---
aunque ese régimen está escrito para **empleados** y su aplicación a contratistas
independientes no es cosa resuelta, y además su propia excepción deja afuera lo que "se
relacione con el negocio del empleador", que es justo donde cae lo tuyo. No te apoyes en
ese artículo: apoyate en un anexo que diga tus nombres.

### 3. Lo que el contrato se lleva es **lo único que todavía no es gratis**

Esto es el punto estratégico y conviene verlo antes que los números.

nac-spec está publicado bajo **Apache-2.0** (verificado: `LICENSE` y el campo `license`
de `runtime/package.json`). O sea: **Alignerr ya puede entrenar modelos con nac-spec hoy,
sin contrato, sin permiso y sin pagarte un peso.** La licencia ya se lo dio. Firmar no les
da acceso a nada que no tengan.

Lo que **no** está bajo Apache-2.0 es exactamente lo que vos identificaste como el jugo:

* la **escalera Urazuke** como método, su rúbrica y su catálogo de criterios;
* las **trazas etiquetadas peldaño por peldaño** y los recibos de máquina;
* `C:/urazuke-exp` y su corrida medida (los 24 peldaños del brazo C1);
* **Yujin Forge**, que es el que produce esas trazas;
* y los seis documentos de `docs/internal/`, incluido el reporte de handoff.

Y para esa capa, la sección 2(e) es explícita:

> "...Contractor hereby grants Client and its successors a **perpetual, irrevocable,
> worldwide royalty-free, non-exclusive, sublicensable** right and license to exploit and
> exercise all such technology and intellectual property rights..."

**No exclusiva** quiere decir que seguís siendo dueño: podés seguir usando y licenciando
Urazuke. **Perpetua e irrevocable** quiere decir que no lo podés deshacer nunca, ni
terminando el contrato. **Sublicenciable** quiere decir que pueden pasárselo a quien
quieran, incluido a quien le compre la empresa (sección 6: ellos pueden ceder el contrato
entero; vos no podés ceder nada).

Resumido en una línea: **para lo público el contrato es casi inocuo porque ya lo regalaste
bien, con atribución y cláusula de patentes. Para el método es una licencia perpetua
gratuita, a cambio de la tarifa por tarea.**

### 4. No tenés interruptor de salida; ellos sí

Sección 4. Los dos caminos de terminación no son simétricos:

* Cualquiera puede terminar por **incumplimiento material** no subsanado en 10 días.
* **Solo el Client** puede terminar "at any time, with or without cause, upon fifteen (15)
  days' notice".

No hay cláusula que te deje terminar sin causa. Consecuencia práctica, y es la que
importa: la ventana de la sección 2(a) --- "during the term" --- **no tiene interruptor del
lado tuyo**. Dejar de tomar tareas no termina el acuerdo. Mientras siga vivo, el radio de
la cesión sigue barriendo todo lo que concebís y que "se relacione con la materia".

Dos agregados de la misma sección:

* El pago de lo completado está prometido **"if (and only if) such termination is without
  cause"**. Si terminan **alegando** causa, el texto no promete pagarte lo ya hecho.
* "Client may communicate the obligations contained in this Agreement to any other (or
  potential) client or employer of Contractor." Pueden escribirle a tus otros clientes
  para contarles qué firmaste.

### 5. Garantizás con patrimonio ilimitado y, en los hechos, no podés litigar

Tres cosas que se multiplican entre sí:

**Las garantías (sección 3) son amplias y absolutas, sin "a mi mejor conocimiento":**

> "(ii) all work under this Agreement shall be **Contractor's original work** and none of
> the Services or Inventions ... will infringe, misappropriate or violate any intellectual
> property or other right of any person or entity"

Riesgo concreto y propio de este proyecto: **los demos que el sitio publica hoy no nacieron
en este repositorio, nacieron dentro del monorepo de RPAForce** (111 cambios, según la
medición de esta mañana). Si RPAForce es una entidad distinta de vos --- o si hubo otras
manos ahí --- la procedencia de ese código es algo que estarías **garantizando** sin tenerlo
aclarado. Lo mismo para cualquier dependencia con licencia de terceros.

**La indemnidad (sección 5) no tiene techo** y es de redacción inusualmente abierta:

> "Contractor agrees to indemnify Client from any and all claims, damages, liability,
> settlement, attorneys' fees and expenses, as incurred, on account of the foregoing or
> **any breach of this Agreement or any other action or inaction** by or for or on behalf
> of Contractor."

Y **no hay en todo el contrato ninguna limitación de responsabilidad ni tope** --- ni por
el monto de los honorarios cobrados, ni por nada. Eso no es un olvido: es la asignación de
riesgo. Del lado de ellos, la exposición máxima son las tarifas de las tareas; del lado
tuyo, es tu patrimonio.

**Y el foro hace que la asimetría no se pueda discutir.** Sección 9: arbitraje JAMS
obligatorio en el condado de San Francisco, un único árbitro, actuaciones y pruebas **en
inglés** (toda prueba en otro idioma va traducida), y sección 8 + 9: **honorarios al que
gana**. Desde Argentina, iniciar o defender un arbitraje JAMS cuesta en tasas y abogados
bastante más de lo que una disputa por tarifas de etiquetado podría recuperar, y perder
implica pagar también los abogados de ellos. En la práctica: **las cláusulas 2 y 3 son
ejecutables contra vos, y las tuyas no son ejecutables contra ellos por costo.**

---

## 2. El resto del texto, en orden

| Cláusula | Qué dice | Consecuencia para vos |
|---|---|---|
| **1 (pago)** | Los honorarios son "the only consideration due", y solo lo que diga el Task Description. | No hay mínimo, no hay garantía de tareas, no hay pago por disponibilidad. Y el contrato que leíste **no es el acuerdo completo**: la plata y el alcance real están en el *Task Description* de cada proyecto, que todavía no viste. Leelo antes de aceptar un proyecto, no solo este marco. |
| **1 (quién ejecuta)** | "all activity relating to Services will be performed by and only by Contractor or by employees ... approved in writing in advance". | No podés delegar ni subcontratar. Las herramientas no son "personas", pero ver la fila de 3(iii). |
| **2(b)** | Te designa a ellos "agent and attorney-in-fact, **coupled with an interest**", de forma **irrevocable**. | Pueden firmar documentos de cesión y registro **en tu nombre**, sin tu intervención. Si alguna vez discutís qué fue cedido, la discusión llega **después** de que el papel ya se firmó. |
| **2(c)** | Todo lo que aprendas u obtengas que se relacione con el negocio de ellos "**or demonstrably anticipated business**" es Proprietary Information: confidencial, y no la podés usar salvo prestando los Services. | Contaminación **hacia adelante** sobre el roadmap de Forge. Si trabajando ahí aprendés cómo se entrena con trazas de software --- justo tu terreno --- queda discutible si podés usar eso en tu propio producto. La válvula de escape está en la misma cláusula: no aplica a lo que puedas **documentar** que es "readily publicly available". Documentá fechas. |
| **2(c)** | "Contractor has no expectation of privacy with respect to Client's ... information processing systems ... may be monitored at any time without notice." | Todo lo que pase por sus sistemas es observable sin aviso. |
| **2(d)** | Pueden usar tu nombre para promocionar su negocio, sin compensación adicional, y renunciás a derechos morales / de atribución sobre lo cedido. | Podés aparecer como caso en su material comercial. Y sobre lo cedido no te queda derecho de que figure tu nombre. Ojo: esto **no** alcanza retroactivamente a lo ya publicado bajo Apache-2.0, cuya cláusula de atribución sigue rigiendo para todo el mundo. |
| **3(iii)** | Debés hacer que **toda persona** con acceso a los Services o a la Proprietary Information firme, **antes** del acceso, un acuerdo al menos tan protector. | Este es el riesgo **operativo** que nadie ve venir: vos trabajás a través de Forge, que manda contenido a proveedores de modelo y tiene un canal entre instancias. Si el material de una tarea es Proprietary Information, tu propio stack es una vía de salida que el contrato no contempla. Hay que preguntarlo explícitamente, no asumirlo. |
| **3(vi)** | Garantizás que nada de la ley "of any country within which Contractor is located" exige registro, aprobación o **retención impositiva**, y "will not make any claim to the contrary". | Estás garantizando el comportamiento de la **ley argentina**, que no controlás, y renunciando de antemano a invocarla. Esta es de las cláusulas que un abogado local te va a marcar primero. El texto además aclara que ellos firman **confiando en esa declaración**. |
| **6** | Vos no podés ceder ni subcontratar; ellos pueden ceder el contrato entero, en todo o en parte. | La licencia perpetua de 2(e) y la titularidad de 2(a) pueden terminar en manos de otra empresa --- un comprador, una afiliada --- sin que vos participes. |
| **8** | "No changes ... will be effective unless in writing and **signed by both parties**." Entire agreement. | **Ninguna promesa de un reclutador por mail o por chat vale nada.** Si querés un resguardo, tiene que estar en un addendum firmado por las dos partes. El click acepta el texto tal cual. |

**Lo que juega a favor, para que el cuadro sea justo:** no hay cláusula de no competencia,
no hay no-solicitación, no hay exclusividad, no te obligan a contratar seguro, no hay
penalidades por rechazar tareas, y si terminan **sin** causa te deben lo completado. Las
secciones 10 a 12 reproducen la inmunidad del 18 USC 1833(b): podés revelar un secreto
comercial a una autoridad o a un abogado para denunciar una presunta ilegalidad sin
responsabilidad. Eso es protección real y es bueno que esté.

---

## 3. "Meter el proyecto en Alignerr" son tres cosas distintas, y una es mucho peor

El contrato te trata distinto según cuál de las tres sea. Vale separarlas:

**(A) Usar nac-spec como sustrato de las tareas que tomás en la plataforma.**
Prohibido por omisión (sección 1, hace falta el permiso escrito). Si lo conseguís,
2(e) les deja la licencia perpetua sobre lo subyacente y 2(a) la titularidad de lo nuevo.
Exposición alta.

**(B) Entregar el proyecto como material de entrenamiento: las trazas, los recibos, el
reporte de handoff, `urazuke-exp`.**
Lo público ya lo tienen gratis, así que esto **solo** agrega lo privado. Y lo entregado
dentro de una tarea es "work product created pursuant to this agreement" --- titularidad de
Alignerr por 2(a). Es la variante que **cede justamente el activo exclusivo** a cambio de
una tarifa por hora de etiquetado.

**(C) Proponerles que financien una corrida de la escalera sobre nac-spec** --- la celda
vacía que identificamos esta mañana: el método aplicado a software **ya terminado y
publicado**, catorce veces más grande que el experimento, con contrato de entrega byte a
byte y adoptantes. Eso **no es una tarea del catálogo**: es un acuerdo comercial distinto
(un SOW, o una licencia de datos), con su precio y su alcance.

**Y acá está el consejo más importante de todo el documento: el orden importa.**
Si tu objetivo es (C) --- y por cómo lo venís armando, es (C) ---, entonces **aceptar el
click-through antes de esa conversación es exactamente la movida que destruye lo que
querés vender.** Desde el momento en que el acuerdo está vivo, 2(a) y 2(e) ya están
corriendo sobre la materia relacionada, y la pregunta "¿cuánto vale que corramos Urazuke
acá?" se contesta sola: ya lo tienen. **La conversación comercial va primero, el contrato
de etiquetado después o nunca.**

---

## 4. El addendum mínimo, si igual querés entrar

Tiene que estar **firmado por las dos partes** (sección 8); un mail de un reclutador no es
una modificación. Diez pedidos, en orden de importancia:

1. **Anexo de PI preexistente excluida**, con nombres: nac-spec / NAC3, el paquete
   `@nac3/*` y todo el árbol de `yujinapp/nac-spec`, Yujin Forge, el método Urazuke y su
   rúbrica, `urazuke-exp`, y el contenido de `docs/internal/`. Es el papel que hoy no
   existe y es el que cambia todo.
2. **Autorización escrita de la sección 1** para usar esa PI en los Services, si de verdad
   quieren el proyecto adentro. Sin eso, (A) y (B) no son ejecutables sin incumplir.
3. **Acotar 2(a)** a lo entregado **dentro de una tarea concreta**, con exclusión expresa
   de todo lo que se relacione con lo listado en el punto 1. Lo que hay que sacar es
   "during the term", "in whole or in part" y "or for or on behalf of".
4. **Acotar 2(e)**: licencia **no perpetua**, **no sublicenciable** fuera de sus afiliadas,
   limitada a uso interno de entrenamiento, y que termine con el acuerdo.
5. **Terminación simétrica**: derecho tuyo a terminar sin causa con 15 días, y pago de lo
   completado también cuando ellos aleguen causa que no esté acreditada.
6. **Tope de responsabilidad** igual a los honorarios cobrados en los últimos 12 meses, y
   acotar la indemnidad a reclamos de terceros por PI --- hoy cubre "any other action or
   inaction", que no es una indemnidad, es un cheque en blanco.
7. **Garantía 3(ii) con estándar de conocimiento**: "to Contractor's knowledge". Y antes de
   firmar, aclarar la procedencia del código que vino del monorepo de RPAForce.
8. **Borrar 3(vi)** o reemplazarla por "cada parte cumple su propia legislación", con el
   W-8BEN donde corresponda. No garantices la ley argentina.
9. **El tema herramientas**: permiso explícito para procesar material de tareas a través de
   proveedores de modelo y de tu propio stack --- o compromiso de ellos de que ninguna tarea
   contenga material que no pueda pasar por ahí. Si no, operativamente no podés trabajar.
10. **Arbitraje remoto** y tasas administrativas de JAMS a cargo de ellos. Es una concesión
    habitual y es la diferencia entre tener foro y no tenerlo.

Expectativa realista: es una plataforma de click-through con miles de contratistas. **La
probabilidad de que negocien el marco es baja** --- pero la de que te den el punto 1 y el
punto 2 por escrito, acotados a tu caso, no es cero, porque a ellos tampoco les sirve
recibir material cuya titularidad quede discutible. Si no negocian nada, eso **también es
información**: te dice que (C) no va a pasar por esta puerta.

---

## 5. Si decidís aceptar igual: la variante de daño acotado

* **No metas el proyecto adentro.** Tomá tareas lo más **lejanas** posible de protocolos de
  navegabilidad por IA y de métodos de ingeniería asistida. El radio de 2(a) depende de la
  palabra "relate": cuanto menos se relacione la tarea con tu negocio, más chica la red.
* **Apuntalos al repositorio público.** Si lo que querés es que a Alignerr le sirva, eso ya
  está: Apache-2.0, público, con historia de git, 273 páginas y diez idiomas. Pueden
  entrenar con eso hoy. Eso cumple tu objetivo **sin firmar ninguna cesión**.
* **Fechá el estado previo.** Antes del click: commitear lo pendiente y poner una etiqueta
  de git. Hoy tenés cuatro archivos sin commitear, entre ellos el reporte de handoff. La
  fecha de publicación de la 2.5.2 en el registro npm ya está atestiguada por un tercero;
  el repositorio público da timestamp del resto. Eso es la evidencia de "concebido antes
  del término" y cuesta cinco minutos. **Es lo único de esta lista que conviene hacer
  decidas lo que decidas.**
* **No pongas nada de `docs/internal/` adentro.** Son seis documentos: el reporte de
  handoff, la medición de visibilidad, la investigación de aocr.org, las fichas de Forge y
  Urazuke, la hoja de decisión D-02 y el HTML de horas. Llevan lectura comercial y nombran
  a terceros identificables. Están fuera del sitio a propósito; que queden fuera de la
  plataforma también.

---

## 6. Libro de certeza

**Verificado** (se leyó o se corrió, acá, hoy):

* nac-spec está bajo **Apache-2.0**: `LICENSE` (encabezado Apache License 2.0) y el campo
  `"license": "Apache-2.0"` de `runtime/package.json`.
* `docs/internal/` tiene **seis** documentos y está excluido del despliegue por la regla
  anclada `--exclude='/docs/internal/'` del `rsync` en `.github/workflows/deploy.yml`.
* Hay **cuatro** archivos sin commitear, incluido `AI_HANDOFF_REPORT_2026-11-11.md`.
* Las citas del contrato de este documento son **textuales** del texto que pegaste.

**Creído** (lectura, no verificación --- y acá es donde hace falta el abogado):

* Que "relate to the subject matter of ... the Services" alcanzaría al roadmap de nac-spec
  y a Forge. Es la lectura literal del texto; cuán amplio lo leería un árbitro es
  precisamente lo que un abogado estima y yo no.
* Que el artículo 2870 del Código Laboral de California probablemente **no** te rescate
  (está escrito para empleados y su excepción deja afuera lo que se relaciona con el
  negocio del cliente). Es la lectura, no una opinión legal.
* Que negocian poco. Es inferencia del modelo de click-through, sin dato.

**Puntos ciegos** (lo que este trabajo no puede ver):

* **El Task Description.** El contrato dice que el alcance y la plata están ahí, y no lo
  tengo. Puede agregar términos de datos propios.
* **Quién es ALIGNERR LLC y a quién le cede.** La sección 6 les deja ceder el contrato
  entero; conviene confirmar la entidad, su matriz y a quién terminaría cediéndose antes de
  firmar. No lo verifiqué y no lo afirmo de memoria.
* **La procedencia del código del monorepo de RPAForce** que hoy sirve los demos. La
  garantía 3(ii) la cubre y yo no tengo con qué cerrarla.
* **Tu situación fiscal y societaria en Argentina**, que es justo lo que 3(vi) te hace
  garantizar.
