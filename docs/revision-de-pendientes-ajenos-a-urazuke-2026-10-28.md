# Revisión de los pendientes ajenos a Urazuke

**Fecha:** 28 de octubre de 2026 · **Pedido:** revisar los pendientes que no son de la implementación de Urazuke y cerrar los que ya estén hechos · **Registro:** PND-066

---

## El resultado en una línea

De 42 pendientes abiertos, 27 son los peldaños del método y **15 son otra cosa**. Revisé los 15 uno por uno contra el código y contra el sitio en vivo. **Uno se podía cerrar, y lo cerré. Los otros 14 siguen abiertos de verdad** — ninguno estaba hecho sin que el registro lo supiera.

Pero encontré algo que vale más que un cierre: **seis items estaban mal etiquetados**. Decían que esperaban una decisión tuya que ya habías tomado, o que estaban bloqueados por algo que ya se resolvió. El registro te estaba cobrando deuda que no debías.

---

## Lo que cerré

**Uno solo.** Era el item que esperaba la llegada del informe de auditoría externa. Ese informe llegó hace cuatro días, se validó hallazgo por hallazgo, y cada hallazgo real tiene hoy su propio pendiente. El item seguía diciendo *"el informe todavía no fue recibido"* y *"0 pendientes abiertos"*. Cerrado como duplicado: lo que iba a hacer ya lo hace otro item, con el estado del día.

---

## Lo que corregí sin cerrar

**El item que encabeza tu registro** — la remediación de la auditoría — se presentaba con prioridad máxima y marcado como *"esperando tu aprobación"*. **No esperaba nada:** la compuerta se abrió el 24 de octubre y tus cinco decisiones están todas cerradas, cuatro de ellas además ya ejecutadas. Le corregí el título, el estado, a quién espera, y la referencia a un documento que cambió de nombre hace cuatro días y quedó colgada. Su alcance real — terminar la remediación — sigue abierto, así que no se cierra.

**Dos items más decían estar bloqueados por tu decisión sobre los idiomas.** Esa decisión la tomaste el 26 de octubre y ya está ejecutada; el propio documento, al cerrarla, los nombra entre lo que destraba. Pasan de *bloqueados* a *disponibles*, que es lo contrario de como se leían. Quedó anotado en cada uno.

---

## Los 14 que siguen abiertos, y por qué

### Trabajo puro, nada que decidir (1)

| | Qué falta | Verificado hoy |
|---|---|---|
| **PND-048** | Seis controles de la portada no confirman que hicieron lo que se les pidió; un agente que los llama espera cinco segundos y no recibe nada | Medido: la página tiene dos confirmaciones en total, y ninguna es de esos seis |

Es el único de los quince que no espera ni una palabra ni una decisión. **El candidato natural para arrancar.**

### Ahora disponibles: la decisión que los frenaba ya se tomó (2)

| | Qué falta | Verificado hoy |
|---|---|---|
| **PND-038** | La portada marca muchos más elementos de los que declara, así que un agente que la lee "como manda el protocolo" ve menos de la mitad | No pude volver a contar: ese número necesita un navegador, y eso es justo lo que PND-049 dice que nadie corre |
| **PND-041** | El generador del documento normativo marca los enlaces de texto sin darles nombre, así que no se pueden direccionar | Medido: el generador sigue igual, y el documento sigue con los dos enlaces sin nombre |

### Decisión de infraestructura, es plata y no técnica (2)

| | Qué falta | Verificado hoy |
|---|---|---|
| **PND-049** | Cinco candados que necesitan navegador no corren solos; los protege quien se acuerde | Medido: **cero de los cinco** están cableados. El flujo hasta nombra en un comentario el candado que no corre |
| **PND-040** | Las cifras que la portada publica se midieron contra una versión vieja | Sin cambios. Necesita tus claves de cinco proveedores y ~US$15 de gasto real |

### Tu decisión sobre el texto normativo (4)

Cuatro frases del documento prometen cosas que el código no hace, o exigen cosas que contradicen otra parte del mismo documento. Verifiqué hoy: **ninguna se resolvió**, y ninguna se destrabó con las decisiones anteriores.

| | El problema |
|---|---|
| **PND-046** | El nivel 2 exige la forma vieja de declarar, que otra sección llama heredada. Leído al pie de la letra, **una página escrita como el documento manda no alcanza el nivel 2** — incluida la portada del propio protocolo. Es el más barato: una frase |
| **PND-047** | El nivel 1 pide una confirmación que un enlace no puede dar, porque la página ya se fue. Bloquea 31 de los 39 controles de la portada |
| **PND-044** | Una opción documentada que el código acepta y descarta en silencio. Cablearla o retirarla |
| **PND-045** | El nivel 3 pide firmas que el código no sabe poner ni verificar. **Hoy ninguna herramienta puede afirmar el nivel 3.** Es el más caro: implementarlo empuja una versión entera |

**Recomendación:** presentártelas **juntas, en una tanda**. Las cuatro cambian la misma sección, y cada cambio obliga a releer el mapeo del contrato. De a una suelta, se paga ese costo cuatro veces.

### Tu decisión, otros frentes (3)

| | Qué falta | Verificado hoy |
|---|---|---|
| **PND-063** | Las nueve traducciones completas están publicadas y **deliberadamente invisibles para un buscador**, por una línea de comentario que dice que son parciales | Medido en vivo: **los dos mapas del sitio siguen con la premisa falsa** |
| **PND-056** | La clave con la que se firma el contrato no tiene contraseña, así que la firma no distingue tu mano de cualquier proceso en esa máquina | Sin cambios. Encontré además que este hallazgo está numerado igual que otro distinto, y no está escrito en el documento de auditoría |
| **PND-064** | Programas de un repositorio privado se sirven públicos en tu otro sitio | Medido en vivo: **las dos direcciones siguen contestando**. Sin credenciales expuestas; es superficie de información |

### Defecto de la herramienta, no del proyecto (1)

| | Qué falta | Verificado hoy |
|---|---|---|
| **PND-065** | Mi propio instrumento de evidencia no sabe nombrar trabajo que vive en otro repositorio, y pide un dato que su documentación no publica | Medido contra el instrumento vivo: **sigue sin publicarlo**. Es lo que obliga a pedirte una firma de excepción cuando el trabajo es del otro repo |

---

## El patrón, que es el verdadero hallazgo

Seis de los quince tenían el estado equivocado, y **en ningún caso fue por olvido**. Decían la verdad cuando se escribieron, y se volvieron falsos porque las decisiones se tomaron y el trabajo avanzó. Es exactamente lo que este proyecto viene registrando toda la semana — un documento que queda falso porque algo salió bien — **pero esta vez pasó en el instrumento que decide qué se trabaja.** Ahí cuesta más: un item que dice "esperando a Pablo" con prioridad máxima no es un dato viejo, es una hora de alguien mirando el frente equivocado.

## Un hueco que encontré y no toqué

El documento de auditoría declara **abiertos** varios hallazgos que **ya no tienen ningún pendiente vivo detrás**, porque el item que los anotaba se cerró. Los dos más claros son una regla normativa que el código no lee, y los 85 nombres posicionales del documento. Hay nueve candidatos.

**No abrí pendientes por mi cuenta**: varios de esos textos pueden estar tan viejos como los dos que acabo de corregir, y abrir nueve items sin medir uno por uno mueve el problema en vez de resolverlo. Es una pasada de verificación, y la dejo escrita como criterio de cierre del item de remediación.
