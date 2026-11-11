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

---

## 7. Recalibración del 2026-11-11 (tarde): el dueño declara que no hay interés económico en NAC3 ni en Urazuke

**Cambio de premisa.** El dueño precisa: *"Nac3 no me interesa, es un protocolo del que nunca
pensé monetizar. Urazuke tampoco. No representan interés económico para mí. De hecho si
tienen éxito pensaba cederlos a una org."* Y pregunta tres cosas: en qué lo compromete esto
realmente, si deja de ser mencionado como creador, y qué valor tiene la frase del email de
invitación (*"You keep ownership of your code"*).

Las secciones 1 a 6 se escribieron suponiendo que había un precio que proteger. Con esta
premisa, parte de esa lectura pierde fuerza y hay que decirlo. Lo que sigue es la lectura
recalibrada; lo de arriba no se borra, se corrige acá.

### 7.1 La frase del email no es una cláusula, y el contrato lo dice en su propio texto

El email (6-nov-2026, `onboarding@alignerr.com`) dice *"You keep ownership of your code"*.
La sección 8 del contrato dice: *"This Agreement represents the entire understanding and
agreement between the parties with respect to the subject matter hereof and **supersedes all
prior agreements** between the parties"*, y además *"No changes, additions, modifications or
waivers to this Agreement will be effective unless in writing and signed by both parties"*.

El email es **anterior** al acuerdo y queda **desplazado** por él. No es un término; es
vidriera. No se puede invocar.

**Pero es justo decir que la frase probablemente sea verdadera para lo ya existente**, por
otra razón: la cesión de 2(a) está acotada en el tiempo a lo concebido *"during the term of
this Agreement"*. Todo lo publicado hasta la 2.5.2 se concibió antes. El email no miente;
simplemente no cubre lo que importa, que es lo que venga después.

### 7.2 Respuesta directa a la pregunta: sí, por el texto dejás de tener derecho a que te nombren

Esto no es inferencia, es la cláusula 2(d) textual:

> *"any license granted Client hereunder includes all rights of **paternity**, **integrity**,
> **disclosure** and **withdrawal** and any other rights that may be known as or referred to
> as 'moral rights', 'artist's rights', 'droit moral', or the like."*

Los cuatro nombres significan, en el orden en que están:

* **paternidad** -- el derecho a ser nombrado como autor.
* **integridad** -- el derecho a objetar que se modifique o se deforme tu obra.
* **divulgación** -- el derecho a decidir cuándo y cómo se da a conocer.
* **retiro** -- el derecho a retirarla de circulación.

Los cuatro se ceden. Y hay una asimetría explícita en el mismo párrafo: 2(d)(i) los autoriza
a *"use Contractor's name in connection with promotion of its business, products or
services"*, sin compensación adicional. Es decir: **ellos conservan el derecho de nombrarte;
vos perdés el derecho de exigir que te nombren.**

**Alcance:** esto corre sobre las *Inventions* de 2(a) -- lo concebido durante el término y
relacionado con los Servicios --, no sobre el artefacto ya publicado bajo Apache-2.0.

**Y una salvedad que es creencia, no verificación:** en muchos ordenamientos de derecho civil
(la Argentina entre ellos) los derechos morales son irrenunciables. El contrato está escrito
anticipando eso: *"To the extent any of the foregoing is ineffective under applicable law,
Contractor hereby provides any and all ratifications and consents necessary..."*, con la
sección 8 eligiendo ley de California y la 9 llevando todo a arbitraje en San Francisco en
inglés. O sea: la defensa de irrenunciabilidad existe como argumento, pero habría que
sostenerla **allá**, no acá. Eso lo contesta un abogado de PI, no esta lectura.

### 7.3 Lo que sigue en pie aun sin interés económico, en orden de gravedad

**1. No podrías seguir desarrollando nac-spec en abierto. Esta es la peor, y no tiene nada
que ver con dinero.** La sección 2(c) define *Proprietary Information* como todo lo
*"developed, learned or obtained by or for or on behalf of Contractor during the period that
Contractor is to be providing the Services"* que se relacione con el negocio del cliente o
con los Servicios, y obliga a *"hold in confidence and not disclose or, except in performing
the Services, use"* eso. Si la tarea es construir sobre tu proyecto con IA y dar devolución,
entonces el producto del trabajo y la traza **son** información propietaria de ellos.

El problema es que nac-spec **sólo existe en público**: cada push a `main` despliega a
producción y la publicación va a npm. La única excepción de 2(c) es para información que
*"is or becomes readily publicly available without restriction **through no fault of
Contractor**"* -- y publicarla vos es precisamente tu hecho, así que no podés entrar a la
excepción por la puerta de publicarlo. En los hechos: **empujar a GitHub durante el término
podría ser el incumplimiento**. Y la sección 8 agrega que un incumplimiento de la sección 2
causa *"irreparable harm"* y habilita medida cautelar: el remedio contra vos no sería daños,
sería una orden de no hacer.

Esto no te quita plata. Te quita el modo de existir del proyecto.

*Salvedad honesta:* depende de la Task Description, que no vi. Un programa que se anuncia
como *"bring your code"* probablemente contemple proyectos públicos. Pero no está en este
texto, y lo que no está escrito no rige (sección 8).

**2. La donación a una organización deja de ser posible para lo que venga.** No se puede
ceder lo que no se tiene. Lo publicado está a salvo y es verificable: el árbol es Apache-2.0
(`LICENSE` + `runtime/package.json:25`), y Apache-2.0 es irrevocable -- lo que ya salió, ya
salió. Lo que caería del lado de ellos es exactamente el futuro: PND-095, PND-096, las siete
superficies, y la criptografía que la especificación exige y el runtime todavía no sabe hacer.

Una organización que reciba medio protocolo, con las superficies nuevas en manos de un
tercero, no recibe un regalo: recibe un problema. Y el corolario irónico: si no sos dueño de
la continuación, **tampoco podés licenciar la continuación bajo Apache-2.0**. El protocolo
podría bifurcarse hacia una rama cerrada que no estarías en posición de frenar, porque el
derecho de retiro lo cediste en 2(d).

**3. Forge es el activo que sí tiene dinero, es el más expuesto, y no lo nombraste.** NAC3 es
gratis y Urazuke es un método; Forge tiene licencia paga. La cesión de 2(a) alcanza lo que
*"arise out of or in connection with the Services"*, y 2(e) va más lejos: concede licencia
*perpetua, irrevocable, mundial, libre de regalías y **sublicenciable*** sobre cualquier
tecnología tuya que haga falta para explotar las Inventions. Si Forge es el instrumento con
el que se prestan los Servicios -- y lo es, así trabaja este proyecto --, cada mejora que
le hagas mientras trabajás es candidata a Invention, y Forge entero es candidato a quedar
bajo esa licencia de 2(e).

*Esto es creído, no verificado:* leo el modelo comercial de Forge de su propia herramienta
(activación de licencia, cobro, asiento pago), no de un contrato que haya leído. Confirmalo
antes de apoyarte en esta línea.

**4. La indemnidad ilimitada no depende de tu interés económico.** La 3(ii) te hace garantizar
que todo es obra original tuya y que nada infringe derechos de nadie; la 5 te obliga a
indemnizar *"any and all claims, damages, liability, settlement, attorneys' fees and expenses,
as incurred, on account of ... any breach of this Agreement **or any other action or inaction**
by or for or on behalf of Contractor"*. En todo el texto **no hay un solo tope de
responsabilidad**. Propio de este proyecto: los demos del sitio nacieron en el monorepo de
RPAForce (`C:\RPAForce\nac-spec_OBSOLETO`), y esa procedencia hay que cerrarla **antes** de
garantizar originalidad. Esta cláusula puede costar dinero real aunque nunca hayas querido
cobrar un peso.

**5. Sección 6: ellos pueden ceder el contrato entero; vos no podés ceder nada.** *"Client may
fully assign and transfer this Agreement in whole or part."* Quien compre Alignerr hereda los
derechos sobre tus Inventions. Con intención altruista o sin ella, **no elegís en manos de
quién termina.**

**6. Sección 2(b): poder irrevocable.** Te designa *"irrevocably ... Client as its agent and
attorney-in-fact, coupled with an interest"* para firmar documentos de PI en tu nombre. Es
habitual en acuerdos de cesión; conviene saber que está.

### 7.4 Lo que se cae de la advertencia de la mañana, dicho sin vueltas

* **La sección 1.3 ("lo que el contrato se lleva es lo único que todavía no es gratis")
  pierde su filo como argumento de negociación.** Si no querés vender NAC3 ni Urazuke, la
  asimetría no te cuesta un precio. Sigue describiendo correctamente lo que ellos reciben,
  pero ya no es una pérdida tuya.
* **La advertencia del orden de las jugadas sobrevive, por otro motivo.** No para proteger un
  precio por NAC3, sino porque **la tarifa por hora es tu monetización**: unas 400 horas
  tuyas de pendiente a 60-100 USD/h son 24.000 a 40.000 USD. Eso es el interés económico real,
  y es lo que hay que negociar -- alcance y horas reconocidas, no regalías de PI.
* **La prohibición de la sección 1 es un trámite, no una pérdida.** Necesitás autorización
  escrita previa para usar tu propia PI en los Servicios. Un programa que se llama "bring your
  code" tiene que tener ese mecanismo. Pedilo.

### 7.5 El addendum, reducido de diez puntos a cinco bajo esta prioridad

1. **Autorización escrita** (la exige la propia sección 1) para usar nac-spec, Forge, Urazuke
   y `urazuke-exp` en los Servicios.
2. **Anexo de invenciones previas** que excluya: nac-spec hasta la 2.5.2 (ancla: etiqueta
   `pre-alignerr-2026-11-11` sobre `c5bec50`), `@nac3/runtime 2.5.2` tal como está publicado
   en npm, el método Urazuke, Yujin Forge y `urazuke-exp`.
3. **Excepción de desarrollo en abierto** -- excepción expresa a 2(c) para que el repositorio,
   el paquete y el sitio puedan seguir publicándose bajo Apache-2.0 durante el término, y para
   que la traza de Urazuke producida sobre nac-spec sea publicable. **Sin este punto el
   proyecto no puede seguir existiendo como existe.**
4. **Atribución** -- paternidad reservada sobre el artefacto nac-spec y sobre el método
   Urazuke: reconocimiento expreso de autoría, y que la cesión no borra el crédito. Es la que
   el dueño preguntó y la que el texto se lleva de la forma más explícita.
5. **Tope de responsabilidad** -- un límite numérico (p.ej. los honorarios efectivamente
   pagados), mutuo, y la indemnidad limitada a reclamos de PI de terceros originados en un
   aporte deliberado del contratista.

Los cinco **por escrito y firmados por las dos partes** (sección 8). La palabra de un
reclutador no tiene ningún efecto jurídico sobre este texto.

### 7.6 Libro de certeza de esta recalibración

* **Verificado:** las citas salen del texto que el dueño pegó en esta sesión (secciones 1,
  2(a) a 2(e), 3, 4, 5, 6, 8, 9) y del email del 6-nov-2026 tal como lo pegó; nac-spec es
  Apache-2.0 (encabezado de `LICENSE` y `runtime/package.json:25`); la etiqueta
  `pre-alignerr-2026-11-11` sobre `c5bec50` existe en el árbol local.
* **Creído:** el modelo comercial de Forge (leído de su propia herramienta, no de un
  contrato); que la Task Description del programa traiga una excepción operativa para
  proyectos públicos; que la procedencia del monorepo de RPAForce afecte la garantía de
  originalidad -- la magnitud no está medida.
* **Punto ciego:** no soy abogado y esto no es asesoramiento legal. No vi la Task Description,
  ni el Process Guide, ni las FAQs, ni ningún addendum propio del programa, y cualquiera de
  esos puede cambiar la lectura de raíz. Si una renuncia a derechos morales es eficaz contra
  un autor argentino en un arbitraje de California es una pregunta para un abogado de PI.

## 8. La pregunta del dueno: "lo que venga tiene que usar mi base, entonces parte de la monetizacion es mia"

Pregunta textual del dueno (2026-11-11, tarde): *"no hay manera de usar NAC3 o Urazuke sin
la base que queda como propiedad exclusiva mia. O sea, lo que viene debe necesariamente
utilizar NAC3 o Urazuke de mi propiedad con licencia Apache 2.0. Correcto? O sea que si
desarrollo Canvas y Alignerr quiere monetizarlo, parte de esa monetizacion seria para NAC3
preexistente?"

**La respuesta corta es no, y el motivo es la licencia que el propio dueno eligio.** La
premisa de hecho es correcta: cualquier superficie nueva de NAC3 --- Canvas incluido ---
necesita el protocolo y el runtime preexistentes para existir. La conclusion juridica no se
sigue. Una dependencia tecnica no genera derecho a cobrar; el derecho a cobrar nace de una
clausula de licencia o de un contrato, y aca la clausula dice exactamente lo contrario.

### 8.1 Apache-2.0 dice "royalty-free" con esas palabras

Texto verificado en `LICENSE` de este arbol, seccion 2 (lineas 66-72):

> *each Contributor hereby grants to You a perpetual, worldwide, non-exclusive, **no-charge,
> royalty-free, irrevocable** copyright license to reproduce, prepare Derivative Works of,
> publicly display, publicly perform, **sublicense**, and distribute the Work and such
> Derivative Works in Source or Object form.*

La seccion 3 repite lo mismo para las patentes. Cinco consecuencias, todas ya vigentes y
ninguna reversible:

1. **Sin cargo.** No hay regalia posible sobre la base preexistente, ni para Alignerr ni
   para nadie. No es que haya que negociarla: esta concedida sin precio.
2. **Irrevocable.** Lo publicado hasta la 2.5.2 quedo concedido para siempre. El dueno
   conserva el copyright y puede relicenciar versiones *futuras*, pero nadie pierde lo que
   ya recibio.
3. **Permisiva, no reciproca.** Apache-2.0 **no** es copyleft. Una obra derivada puede ser
   cerrada, propietaria y comercial. Canvas sobre NAC3 puede venderse cerrado sin devolver
   una linea.
4. **Sublicenciable.** Quien la recibe puede concederla hacia abajo en sus propios terminos.
5. **Ya la tienen.** Alignerr puede usar NAC3 hoy, sin contrato, sin aviso y sin pagar. El
   contrato no les da acceso a la base: la base ya es de todos.

El mecanismo que el dueno esta imaginando existe, pero es otro: licencia reciproca fuerte
(AGPL) mas licencia comercial aparte --- el modelo de doble licencia, donde quien no quiere
abrir su derivado paga. Para NAC3 ese camino esta cerrado de forma definitiva sobre todo lo
publicado, y ademas contradice el objetivo del proyecto: un protocolo permisivo es lo que lo
hace adoptable, y la uniformidad Apache-2.0 esta declarada en `SPEC.md:1345-1357` como
garantia para los adoptantes.

### 8.2 Lo unico que Apache-2.0 si exige: avisos --- y aca hay un agujero medido

La seccion 4 obliga a quien distribuya un derivado a (a) incluir copia de la licencia,
(b) marcar los archivos modificados, (c) **retener los avisos de copyright, patente, marca y
atribucion en el codigo fuente**, y (d) --- solo **si la obra incluye un archivo `NOTICE`**
--- reproducir ese texto de atribucion en el `NOTICE` del derivado, o en su documentacion, o
en una pantalla del producto.

**Verificado en este arbol: hay `LICENSE` en la raiz y en `runtime/`, y no hay ningun archivo
`NOTICE`, en ningun lado.** El efecto practico es concreto: hoy la obligacion de atribucion
de un derivado se reduce al inciso (c), que vive en el fuente y no se ve desde afuera. Nadie
esta obligado a nombrar al autor en la documentacion ni en la interfaz de un producto
construido sobre NAC3.

Eso se arregla agregando un `NOTICE`, cuesta minutos y **no depende de ninguna decision sobre
Alignerr**. Importa mas de lo que parece por el contraste de la seccion 7: la clausula 2(d)
del contrato hace renunciar a los derechos morales --- entre ellos el de paternidad. La
atribucion del `NOTICE`, en cambio, no es un derecho moral: es una **condicion de licencia**,
exigible por derecho de autor contra cualquier distribuidor, fuera del contrato y fuera del
arbitraje de California. Es la via de credito mas firme que le queda al dueno, y es la que
hoy esta vacia.

Segundo dato del mismo lado: la **seccion 6 no concede derechos de marca**. *"This License
does not grant permission to use the trade names, trademarks, service marks, or product names
of the Licensor, except as required for describing the origin of the Work and reproducing the
content of the NOTICE file."* Es decir: el codigo es libre, **el nombre no**. Los nombres
--- NAC3, nac-spec, Urazuke, Yujin --- son el unico activo exclusivo que queda sobre la base
preexistente. No hay ninguna mencion de marca registrada en el arbol (buscado el 2026-11-11:
cero resultados en `*.md` y `*.json`), asi que eso es un activo **no formalizado**.

### 8.3 Urazuke no es el mismo caso, y conviene no mezclarlos

Verificado en la copia local del repositorio de Urazuke
(`.yujin-forge/tmp/urazuke/LICENCIA.md`): esta **doblemente licenciado**, y la frontera es
deliberada --- *"lo que una persona lee se comparte igual; lo que una maquina ejecuta o
consume no exige nada a cambio"*.

* **CC BY-SA 4.0** --- el metodo en prosa: la escalera, los contratos de peldano, los
  manuales, los prompts, las etiquetas, las ocho traducciones.
* **Apache-2.0** --- los programas y **la definicion mecanica de las compuertas** (`gates/`,
  `gates.json`): justo lo que una herramienta implementa.

Eso cambia la respuesta en una mitad y la deja igual en la otra. **ShareAlike es reciproco:**
quien tome la prosa del metodo, la extienda y la publique, tiene que publicarla bajo la misma
licencia, y la atribucion es **condicion de licencia**, no derecho moral. Ahi si hay una
palanca real: el metodo no se puede cercar. Pero **BY-SA tampoco cobra** --- es gratuita y no
prohibe el uso comercial ---, asi que la respuesta a "me corresponde parte de la
monetizacion?" sigue siendo no. Y la parte que una herramienta necesita para implementar el
metodo esta del lado Apache, o sea libre y sin reciprocidad.

Punto ciego importante: si **entrenar un modelo** con texto BY-SA obliga a publicar los pesos
bajo BY-SA --- es decir, si los pesos son obra derivada --- es una pregunta juridicamente
abierta en todo el mundo y hoy nadie la tiene ganada. No conviene construir una expectativa
economica sobre ese argumento.

### 8.4 La asimetria exacta, que es lo que hay que ver

| Pieza | Quien la tiene hoy | Que pasa si se firma |
|---|---|---|
| NAC3 hasta 2.5.2 (protocolo, runtime, 273 paginas, 9 traducciones) | **de todos**, Apache-2.0 irrevocable | sin cambio: ya era libre |
| Metodo Urazuke en prosa | **de todos**, BY-SA (reciproco, con atribucion exigible) | sin cambio |
| Compuertas mecanicas de Urazuke | **de todos**, Apache-2.0 | sin cambio |
| **Canvas y las superficies nuevas** | **nadie: no existen** | **de Alignerr** (clausula 2(a)) |
| Nombres NAC3 / nac-spec / Urazuke / Yujin | exclusivos del dueno (Apache sec. 6) | sin cesion expresa, pero 2(d) los deja usar **su nombre** para promocion |
| Forge (licencia paga) | del dueno | expuesto por 2(a) + licencia perpetua sublicenciable de 2(e) |

Leida asi, la jugada se invierte respecto de lo que el dueno esta suponiendo: **lo que
imagina cobrar es exactamente lo que ya regalo, y lo que estaria regalando es lo unico que
todavia no existe.** Y hay un corolario que ya aparecio en la seccion 7 y que esta tabla
explica mejor: si Canvas es de Alignerr, el dueno **no puede publicarlo bajo Apache-2.0**,
porque no se puede licenciar lo que no es propio. El protocolo quedaria partido: base libre,
superficies nuevas cerradas en manos de un tercero.

### 8.5 Donde esta el dinero, entonces

En la tarifa horaria, y en nada mas. 60 a 100 dolares la hora sobre las ~400 horas de
pendiente son 24.000 a 40.000 dolares, y eso es lo que hay para negociar: alcance, horas
reconocidas y quien se queda con las superficies nuevas. La via de la regalia sobre la base
preexistente no esta cerrada por este contrato --- **esta cerrada desde que el proyecto se
publico bajo Apache-2.0**, y esa fue una decision propia y correcta para un protocolo.

### 8.6 Dos acciones que no dependen de la decision

1. **Agregar un archivo `NOTICE`** a la raiz y a `runtime/` (y hacerlo viajar en el paquete
   publicado), con la atribucion que el dueno quiera que un producto derivado tenga que
   reproducir. Es la unica via de credito que sobrevive a la clausula 2(d), y hoy esta
   vacia. Pendiente a registrar: no se hizo en esta sesion.
2. **Decidir que hacer con los nombres.** Son el activo exclusivo que queda y estan sin
   formalizar. Pregunta del dueno, no del modelo.

Y un detalle que conviene mirar antes de firmar cualquier cosa: el copyright de NAC3 esta
declarado a nombre de **"Yujin (rpaforce.com)"** (`LICENSE:189`), no a nombre de Pablo
Kuschniroff --- mientras Urazuke si lo nombra personalmente (`README.md`, *"Autor: Pablo
Kuschniroff"*). La clausula 3(iii) hace garantizar que se tiene *"the full right"* a ceder.
Si "Yujin" / RPAForce es una persona juridica distinta del firmante, hay que aclarar quien
firma antes de garantizar nada.

### 8.7 Libro de certeza de la seccion 8

* **Verificado:** el texto citado de Apache-2.0 sale de `LICENSE` de este arbol (sec. 2,
  lineas 66-72; sec. 4(a)-(d); sec. 6); `runtime/package.json:25` declara `Apache-2.0`;
  `SPEC.md:5` y `SPEC.md:1345-1357` declaran la uniformidad Apache-2.0; **no existe ningun
  archivo `NOTICE`** en el arbol (`ls` de raiz y `runtime/`); el copyright dice *"Copyright
  2026 Yujin (rpaforce.com)"* (`LICENSE:189`); el reparto doble de Urazuke sale de
  `.yujin-forge/tmp/urazuke/LICENCIA.md` y de `LICENSE` + `LICENSE-CODE` de esa copia.
* **Creido:** que la copia de Urazuke bajo `.yujin-forge/tmp/` coincide con el repositorio
  publico `github.com/pkuschnirof/urazuke` --- no se verifico contra el remoto; que Forge
  tiene licencia paga (leido de la herramienta, no de un contrato).
* **Punto ciego:** no soy abogado y esto no es asesoramiento legal. Si los pesos de un modelo
  entrenado con texto BY-SA son obra derivada es una pregunta abierta. Tampoco vi la Task
  Description del programa, que podria traer terminos propios sobre propiedad de las
  superficies nuevas.

## 9. "La precalificacion es una medicion de valor, y si no me gusta me retiro"

Planteo del dueno (2026-11-11, tarde): ver si Alignerr acepta o rechaza el proyecto es en si
mismo una medicion del valor de NAC3, y despues hay un boton de **withdraw**.

Las dos mitades no se portan igual. La primera es gratis y se puede tener sin firmar nada.
La segunda es la que no hace lo que su nombre promete.

### 9.1 La senal de precalificacion se puede obtener sin aceptar el contrato

Segun el propio email, el camino son dos pasos --- encuesta del proyecto (3 min) y
postulacion + entrevista (20 min) --- y el acuerdo aparece **despues**: *"If approved, we'll
guide you through onboarding"*. El contrato se acepta en el onboarding, y su encabezado dice
como: clickeando *"I ACCEPT"* **o prestando servicios**. Es decir: la encuesta y la
entrevista no son aceptacion, y el veredicto *aceptado / rechazado* llega antes de que haya
que decidir nada. **Esa senal es gratis. Tomala.**

Con dos cuidados concretos:

* **No empezar ninguna tarea antes de decidir.** La aceptacion tambien ocurre **por
  conducta**: prestar servicios crea el contrato sin ningun click. El limite seguro es claro
  --- encuesta y entrevista si; abrir una tarea, no.
* **Cuidar lo que se cuenta en la encuesta.** Describir un proyecto publico Apache-2.0 no
  arriesga nada que no este publicado. Describir el interior de Forge, o el detalle de la
  escalera que todavia no esta publicado, si: antes de que exista contrato no hay ni
  confidencialidad reciproca ni nada que ate a la contraparte, y lo contado queda contado.

### 9.2 Que mide realmente ese veredicto (y que no)

Es una senal real, pero de otra cosa que "cuanto vale NAC3". Lo que Alignerr evalua es
**encaje con su propia necesidad de datos**: si trabajar sobre este proyecto produce trazas
utiles para entrenar modelos de software. Eso se cruza con el tamano del proyecto, el
lenguaje, la tarifa, la cuota del programa y el calendario.

* **Un rechazo** quiere decir "no encaja en nuestro pipeline ahora", no "el protocolo no vale
  nada". Un protocolo de interfaz para agentes puede ser excelente y pesimo como fuente de
  etiquetado al mismo tiempo.
* **Una aceptacion** quiere decir "nos sirve para entrenar", no "es un producto valioso". De
  hecho lo que ya sabemos que les sirve es la escalera con su traza calificada por maquina
  (seccion 7 y el informe del 11-nov), que es un activo distinto del protocolo.

Conviene no convertir ese veredicto en el juicio de valor del proyecto: mide el apetito de un
comprador de datos, no el mercado de NAC3. La medicion de valor que el proyecto si necesita
es otra --- adopcion, que es lo que mide `docs/internal/medicion-de-visibilidad-de-nac-spec-7-nov-2026.md`.

### 9.3 El boton de withdraw no deshace la cesion

Esto es lo que hay que saber antes de apoyarse en el. La seccion 4 del contrato dice, con
estas palabras, que **las secciones 2 a 9 sobreviven cualquier terminacion o vencimiento**.
La seccion 2 es justamente la cesion de propiedad intelectual, la confidencialidad y la
licencia perpetua sobre tecnologia subyacente.

Consecuencia practica: retirarse **corta el trabajo futuro** y nada mas. Todo lo concebido
*durante* el termino --- en todo o en parte --- ya quedo cedido, y sigue cedido despues del
withdraw. La licencia perpetua, irrevocable y sublicenciable de 2(e) sobre la tecnologia
subyacente tambien sigue. La obligacion de confidencialidad tambien, con el limite de 2(c),
que es el punto de la seccion 7: durante el termino, publicar nac-spec en abierto podria ser
el incumplimiento, y el remedio previsto contra el contratista es medida cautelar, no plata.

Dicho al reves y sin vueltas: **el withdraw es una salida del trabajo, no un deshacer.** La
unica ventana en que la decision es reversible es la que existe **antes** de aceptar.

Y una asimetria para tener presente: el contratista **no** tiene derecho a terminar sin
causa; el cliente si, con 15 dias de aviso. Lo que el boton de withdraw significa
exactamente en terminos del contrato --- si es una terminacion por acuerdo, un abandono de
tarea, o solo una baja de la plataforma --- **no esta en el texto que lei**, y por el peso
que tiene conviene preguntarlo por escrito antes de aceptar.

### 9.4 La secuencia que sale de todo esto

1. Encuesta y entrevista: **si**, ahora, sin firmar. Ahi esta la senal gratis.
2. Pedir la **Task Description** y el addendum por escrito, y leerlos antes del click. Es el
   documento que define pago y alcance, y el unico que puede traer una excepcion para
   proyectos publicos.
3. No abrir ninguna tarea hasta que los cinco puntos del addendum (seccion 7.5) esten
   firmados por las dos partes.
4. Recien ahi decidir --- y si se decide entrar, la variante de dano acotado de la seccion 5
   (no traer nac-spec adentro) deja el protocolo afuera del alcance.

### 9.5 Libro de certeza de la seccion 9

* **Verificado:** la supervivencia de las secciones 2 a 9 y la terminacion asimetrica estan
  en la seccion 4 del texto pegado por el dueno; la aceptacion por conducta esta en el
  encabezado; la secuencia encuesta -> postulacion -> onboarding sale del email del
  6-nov-2026 tal como lo pego.
* **Creido:** que el boton de withdraw pertenece al flujo de la plataforma y no al contrato
  --- no lo vi, y el contrato no lo nombra.
* **Punto ciego:** no vi la plataforma, ni la Task Description, ni los terminos de uso de
  app.alignerr.com, que es donde el withdraw podria estar definido. No soy abogado y esto no
  es asesoramiento legal.

## 10. El plan de las cuatro vallas: modularidad, método propio, herramienta y plata

Entre el 2026-11-11 por la tarde el dueño declara cuatro cosas, en este orden:

1. *"Quiero que NAC3 sea modular. Que pueda desarrollar las siguientes funcionalidades en
   otro repo, con otra licencia y que pueda atacharse al nac3 público de Apache."*
2. *"Para las superficies que faltan yo realmente no puedo ni pagar la IA que necesito para
   seguir desarrollándolo."*
3. *"Puedo NO usar Urazuke."*
4. *"Puedo usar otro framework de desarrollo agéntico, como Kiro ó Claude Code, así no
   comprometo Forge... o el que Alignerr me provea."*

Las cuatro juntas cambian el veredicto de las secciones 1 a 9. No porque el texto del
contrato cambie --- no cambia --- sino porque **el daño que ese texto puede hacer depende de
qué se pone adentro del alcance**, y las cuatro declaraciones vacían el alcance de casi todo
lo que valía la pena proteger.

### 10.1 La modularidad que pide ya existe, y está publicada

Esto es el hallazgo de la sección, y conviene que se lea antes que cualquier plan: **no hay
nada que construir para que NAC3 sea modular en el sentido exacto que el dueño pidió.** El
contrato de extensión está en el texto normativo, en la versión publicada, bajo Apache-2.0.

* **`SPEC.md` sección 15, "Plugin extension contract -- canvas + API surfaces (v2.5)".** Son
  las superficies de canvas y de API --- Collabora, Figma, Excalidraw, Miro, cualquier editor
  WebGL propio --- declaradas como el caso que el DOM no cubre, con su juego de primitivas
  propio.
* **Las cinco primitivas son API pública del runtime:** `NAC.registerPlugin(slug, manifest)`,
  `NAC.call(plugin, verb_path, args)`, `NAC.read(plugin, state_path)`, `NAC.subscribe(...)` y
  `NAC.unsubscribe(handle)`. Verificado en el código, no en la especificación:
  `registerPlugin` se implementa en `js/nac.js:7479` y se exporta en el objeto `NAC` en
  `js/nac.js:8169`. Hay demo propia (`demos/v25-canvas-api/index.html`) y corredor propio
  (`npm run demo:v25-canvas-api`).
* **La frase que decide, textual de la sección 15:** *"The runtime stays agnostic of any
  specific app -- it learns how to talk to one only by reading the plugin's manifest."* El
  ruteo lo declara el manifest del plugin, no el núcleo. Un plugin trae su propio backend
  (`postmessage`, SDK global, ref de React, puente a medida) y el núcleo no se enteró de qué
  aplicación es.

Consecuencia práctica: **un repositorio aparte, con otro nombre, con otra licencia ---
incluso cerrada --- que llame a `registerPlugin` y se publique por separado, se engancha al
NAC3 público sin tocar un byte del núcleo.** Apache-2.0 lo permite expresamente: no tiene
reciprocidad, así que un derivado o un plugin puede ser propietario y comercial. Es la misma
asimetría que la sección 8 de este documento mide como una pérdida (nadie le debe regalías):
acá es exactamente lo que el dueño necesita.

### 10.2 Lo que la valla del repositorio protege, y lo que no

**Protege el núcleo.** Lo que hoy está publicado --- el protocolo hasta 2.5.2, el runtime,
los candados, las 273 páginas, las nueve traducciones --- queda afuera del alcance del
contrato, porque fue concebido antes del Effective Date y porque no se lo toca durante el
término. Eso es lo que la etiqueta `pre-alignerr-2026-11-11` fecha.

**No protege lo nuevo.** Y esto hay que decirlo sin anestesia: **la superficie que se
desarrolle durante el término es de Alignerr por la cláusula 2, no importa en qué repositorio
viva, con qué nombre ni bajo qué licencia la publique el dueño.** La cesión alcanza lo
"concebido o reducido a práctica" en conexión con los Servicios; el repositorio es una
carpeta, no una frontera jurídica. Poner el canvas en otro repo **no** lo vuelve propio: lo
vuelve *separable*, que es otra cosa y es la que sirve.

**La fuga a vigilar, y es la única que es técnica:** si una superficie nueva necesita un
*hook* que el núcleo no tiene, ese cambio aterriza en `nac-spec` --- repositorio público,
Apache-2.0 --- **durante el término**, y pasa a ser un commit de titularidad discutible
dentro de la obra que se quería mantener limpia. La mitigación es de calendario y es barata:
**todo hook que el núcleo necesite se construye y se publica ANTES del Effective Date**, y
durante el término no entra un commit a `nac-spec`. La sección 15 existe justamente porque
ese trabajo se hizo en v2.5; lo que haya que agregar, se agrega ahora.

**Y el efecto colateral bueno:** si durante el término no se toca `nac-spec`, la colisión que
la sección 1 marcó como la peor --- la confidencialidad contra un proyecto que sólo existe
publicando --- **desaparece**, porque no hay empujón que pueda ser el incumplimiento.

### 10.3 Urazuke afuera: la valla que más valor retiene

*"Puedo NO usar Urazuke"* es, de las cuatro, la que protege el activo más valioso, y el
razonamiento es el de la cláusula 2(e): le da al cliente una licencia **perpetua,
irrevocable, mundial, sin regalías y sublicenciable** sobre tecnología del contratista que
sea necesaria para explotar los entregables. Si la escalera se usa para producir el trabajo,
esa cláusula es el camino por el que el método --- con sus evaluadores ejecutables, que es la
parte que una empresa de datos de entrenamiento querría --- queda licenciado a ellos para
siempre y con derecho a sublicenciar. Eso **pasa por encima** del "compartir igual" de
Creative Commons, que es la única protección que el método tiene hoy.

No usarlo lo mantiene entero. Y hay una tensión con la decisión **D-08** del mismo día
(*"me interesa prender la escalera Urazuke; es el mayor jugo que le puede servir a
Alignerr"*) que es del dueño resolver: **el método es valioso para ellos justamente porque es
cedible, y es cedible justamente si se usa.** Prenderlo para este proyecto y no usarlo dentro
del contrato son compatibles; prenderlo *como parte del trabajo pago* es regalarlo. La
escalera puede correrse sobre `nac-spec` --- que queda afuera del alcance --- y no sobre lo
que se entregue a Alignerr.

### 10.4 Forge afuera, y encima lo pagan ellos

*"O el que Alignerr me provea"* es la respuesta correcta y además es lo que el propio email
ofrece: el programa se llama *"Alignerr's CC CLI"* y el asunto es **"Bring your code -- We'll
cover the AI"**. Trabajar con la herramienta que ellos proveen saca a Forge del cuadro por
completo: no hay tecnología previa del dueño incorporada al entregable, así que la 2(e) no
tiene por dónde alcanzarla. Forge es el único de los tres activos con licencia paga, y es el
que la sección 7 marcó como el más expuesto. Con esta valla, deja de estarlo.

### 10.5 La plata, que es lo que ordena todo lo anterior

*"No puedo ni pagar la IA que necesito para seguir desarrollándolo."*

Esto reordena el documento entero, y obliga a una resta honesta. Lo invertido hasta hoy son
~76 horas de IA. Lo pendiente --- las siete superficies no contempladas, el canvas, la
criptografía que la especificación exige, y la escalera encendida --- se estimó en ~400 horas
del dueño con su modelo al lado. **Sin financiamiento, esas 400 horas no existen.** Entonces
la pregunta deja de ser "¿cedo la titularidad de las superficies nuevas?" y pasa a ser:

> ¿Prefiero no ser dueño de un software que se construye y me paga por construirlo, o ser
> dueño de un software que no se construye?

Puesta así se contesta sola, y no es una concesión: es la aritmética. Lo que el dueño
conserva en el escenario de las cuatro vallas es **el núcleo Apache para siempre** (la
licencia es irrevocable: lo publicado no se puede recuperar ni cerrar), **la atribución como
condición de licencia** --- que desde el commit de hoy existe, porque el NOTICE existe
(PND-108) y es exigible por derecho de autor, fuera del arbitraje de California --- y **la
tarifa horaria**, que es el único ingreso real que este proyecto puede producir: 60 a 100
dólares la hora sobre horas que se repiten, en vez de una venta que no se repite.

### 10.6 Qué pedir por escrito, ahora que las vallas están claras

El addendum de la sección 4 se reduce otra vez. Con las cuatro vallas, lo que queda es corto
y casi todo es declarativo:

1. **Autorización escrita para traer el código propio** (la cláusula 1 prohíbe usar propiedad
   intelectual propia sin permiso escrito; el email la invita, pero el email no es cláusula).
2. **Anexo de invenciones previas** anclado a la etiqueta `pre-alignerr-2026-11-11`, que ya
   existe y ya está fechada: nombra `nac-spec` entero, Urazuke y Forge como previos y fuera
   del alcance.
3. **Carve-out expreso de publicación:** el contratista puede seguir publicando y manteniendo
   `nac-spec` en abierto --- hoy o cuando el término termine --- sin que eso sea divulgación
   de información propietaria.
4. **Tope de responsabilidad** (la indemnidad de la cláusula 5 no tiene techo).

La atribución reservada que la sección 7 pedía como quinto punto **ya no hace falta pedirla**:
el NOTICE la vuelve una condición de licencia del núcleo, que es más firme que una cláusula
negociada.

### 10.7 Libro de certeza de la sección 10

* **Verificado (código y texto normativo del árbol de hoy):** `SPEC.md` tiene la sección 15
  "Plugin extension contract -- canvas + API surfaces (v2.5)" con las cinco primitivas y la
  forma del manifest; `registerPlugin` está implementado en `js/nac.js:7479` y exportado en
  `js/nac.js:8169`; hay demo en `demos/v25-canvas-api/index.html` y script
  `demo:v25-canvas-api`; `LICENSE` es Apache-2.0 sin reciprocidad, así que un plugin separado
  puede llevar otra licencia; la etiqueta `pre-alignerr-2026-11-11` existe sobre `c5bec50`.
* **Verificado (texto del contrato pegado por el dueño):** la cesión de la cláusula 2 no
  depende del repositorio ni de la licencia que el contratista le ponga; la 2(e) concede
  licencia perpetua y sublicenciable sobre tecnología previa necesaria para explotar los
  entregables; la cláusula 1 exige permiso escrito para usar propiedad intelectual propia.
* **Creído:** que el programa de Alignerr provee la herramienta agéntica y cubre su costo ---
  sale del email del 6-nov ("We'll cover the AI", "Alignerr's CC CLI"), no de la Task
  Description, que no vi.
* **Creído:** que las superficies pendientes se pueden construir enteras por encima de la
  sección 15 sin tocar el núcleo. Es lo que el contrato de extensión promete, pero **no se
  midió superficie por superficie**: la criptografía que la especificación exige, por
  ejemplo, podría necesitar un hook nuevo en el núcleo. Esa medición es la tarea que conviene
  hacer ANTES de firmar, porque define qué tiene que estar publicado antes del Effective
  Date.
* **Punto ciego:** no vi la Task Description, ni los términos de app.alignerr.com, ni sé si
  el programa acepta este proyecto. No soy abogado y esto no es asesoramiento legal.
