---
translation_source: guides/IMPACT_RPA.md
translation_source_hash: d278c291a38100f66ef8ed5ae0030875b5e9eb4412db6edecf9b7db2794a16e2
translation_quality: machine_v1
translation_lang: es
translation_date: 2026-05-11T13:27:54.371505+00:00
---

# Impacto de NAC3 en RPA

**Versión de NAC3:** 2.2 stable.
**Audiencia:** Arquitectos de RPA, líderes de centros de excelencia
en automatización (CoE), ingenieros de automatización que evalúan el
costo de mantenimiento y expansión de automatizaciones basadas en NAC3.

## Resumen ejecutivo

El RPA basado en selectores CSS es frágil por diseño. El reconocimiento
por imagen es frágil según la pantalla. NAC3 coloca anclas nombradas y
estables en la página que CUALQUIER plataforma de RPA puede usar como
objetivo. El costo por automatización se reduce entre un 60 y un 90%, y
la deuda trimestral de mantenimiento de selectores cae a casi cero.

## El estado actual de los selectores en RPA

Tres estilos, todos con fallas:

### 1. Selectores CSS / XPath

```xml
<webctrl tag='button'
         class='btn-primary btn-lg invoice-save-btn'
         text='Save' />
```

Se rompe con: renombrado de clases CSS, reestructuración del layout,
traducción de etiquetas, adición de clases en estado hover.

### 2. Coincidencia por imagen / OCR

Comparación de píxeles del botón renderizado. Se rompe con: cambio de
tema, modo oscuro, cambio de resolución, sustitución de fuente,
superposición del anillo de foco.

### 3. Targeting por ancla (coordenadas relativas)

"El botón dos celdas a la derecha de la etiqueta 'Subtotal'." Se rompe
con: reflow del layout, reordenamiento de columnas, cambios en
breakpoints responsivos.

Los tres exigen mantenimiento constante del CoE. El CoE empresarial
típico dedica entre el 35 y el 60% de su tiempo a actualizar selectores
rotos tras rediseños de interfaz.

## El estado con NAC3

Una sola línea por elemento:

```js
await window.NAC.click('invoice.save');
```

Se rompe con: que el verbo `save` sea renombrado por el equipo de
producto a otra cosa. Ese es un cambio semántico real, y la
automatización DEBE actualizarse por la misma razón por la que los
humanos necesitarían reentrenamiento.

## Métricas de impacto concretas

De un CoE que piloteó NAC3 en 14 automatizaciones:

| Métrica | Basado en selectores | Basado en NAC3 | Delta |
|---------|---------------------|----------------|-------|
| Promedio de actividades por automatización | 47 | 9 | -81% |
| Horas de mantenimiento por trimestre de rediseño de UI | 41 | 3 | -93% |
| Ejecuciones fallidas por semana (selector drift) | 18 | 0 | -100% |
| Tiempo para crear una nueva automatización | 12 horas | 2 horas | -83% |
| Cobertura de la superficie de una app (% de acciones alcanzables) | 38% | 95% | +150% |

El número de cobertura es el más importante. **El RPA basado en
selectores típicamente cubre entre el 30 y el 50% de las acciones de
una app** porque el 50-70% restante es demasiado frágil para automatizar
de forma rentable. NAC3 eleva eso a más del 90%: la larga cola se vuelve
económicamente viable.

## Lo que NAC3 habilita para RPA

### 1. Portabilidad entre tenants

Hoy: un bot de RPA construido para la instancia de Salesforce del
Cliente A no funciona en la del Cliente B porque las clases CSS difieren
levemente. Con NAC3: el bot apunta a `invoice.save`, que es estable
entre tenants. El mismo bot, multi-tenant.

### 2. Portabilidad entre proveedores

Si dos productos SaaS del mismo dominio (CRM, ERP, gestión de
proyectos) incluyen manifiestos NAC3 con verbos superpuestos
(`create_invoice`, `mark_paid`), la misma lógica del bot se despacha
contra cualquiera de los dos. El bot de RPA se vuelve agnóstico al
proveedor.

### 3. Automatización generada por LLM

Un ingeniero del CoE describe la automatización en prosa:

> "Abrir Yujin CRM, encontrar todas las facturas impagas con más de
> 60 días, marcarlas como en cobranza, enviar correo al asesor asignado."

Un LLM con acceso a `NAC.describe()` produce la secuencia de
actividades:

```
1. NAC.click_by_verb('invoice', 'list_unpaid')
2. NAC.fill('invoice.filter.age_days_min', 60)
3. NAC.click('invoice.filter.apply')
4. For each row in NAC.dt_state('invoice.list'):
     - NAC.click_by_verb('invoice', 'mark_collections', {row_id})
     - NAC.click_by_verb('email', 'send_advisor', {row_id})
```

El ingeniero del CoE revisa y aprueba. Horas, no semanas.

### 4. Autodescubrimiento para nuevas apps

`NAC.describe()` devuelve el manifiesto completo. El bot puede
introspeccionar CUALQUIER app conforme a NAC3 en tiempo de ejecución.
**Una automatización que apunte a "toda app conforme a NAC3 que el
usuario tenga abierta" se vuelve posible** (ver Yujin Pilot en
yujin.app/pilot para la versión productizada).

### 5. Trazabilidad con procedencia

Cada despacho emite `nac:action:succeeded` con
`is_trusted: false` (indicando origen RPA) + `plugin` +
`action_id`. La app anfitriona puede registrar esto para cumplimiento:

> El bot xyz despachó `invoice.delete` para la factura #INV-42
> a las 14:23 GMT-3, con `is_trusted=false`. Aprobado por:
> rpa-coe-policy v1.4.

Los equipos de GRC obtienen un log de auditoría determinístico por
ejecución de bot. Sin scraping del DOM en los logs, sin filtración de
PII desde las cadenas de selectores.

### 6. Control de verbos sensibles

Las apps que marcan ciertos verbos (eliminar, pago, asignación de rol)
como `isTrusted`-required rechazarán los despachos de RPA por defecto.
El CoE incluye explícitamente en la lista blanca qué verbos puede usar
el RPA:

```js
window.__NAC_ALLOW_UNTRUSTED__ = [
  'invoice.send',
  'invoice.save',
  'report.export'
  // verbos de eliminación, pago y administración intencionalmente ausentes
];
```

La gobernanza del CoE se convierte en una configuración JS + un log de
auditoría, no en una hoja de cálculo de permisos de bots.

### 7. Voz + chat como front-end de RPA

La capa de RPA puede usar el panel de chat como su interfaz: un
ingeniero del CoE dice "ejecutar el trabajo de facturas impagas para el
tenant Acme" y un backend con soporte NAC3 resuelve y despacha. La ruta
de voz usa las mismas primitivas `NAC.*` que usa el chat.

## Matriz de adopción por plataforma de RPA

| Plataforma | Ruta | Costo de integración | Referencia |
|------------|------|----------------------|------------|
| UiPath | Inyectar JS mediante actividad Browser | Bajo (una actividad por llamada) | [RPA_UIPATH.md](RPA_UIPATH.md) |
| Automation Anywhere A360 | Run JavaScript Function | Bajo | [RPA_AUTOMATION_ANYWHERE.md](RPA_AUTOMATION_ANYWHERE.md) |
| Blue Prism | Inject JavaScript (acción VBO) | Bajo | [RPA_BLUE_PRISM.md](RPA_BLUE_PRISM.md) |
| Power Automate Desktop | Run JavaScript on web page | Bajo | (próximamente) |
| RPA basado en Selenium | execute_script | Bajo | -- |
| Basado en imagen (TagUI, Sikuli) | Ruta de respaldo; usar solo como último recurso | Alto | -- |

## Guía de migración para una suite de automatizaciones existente

### Fase 1 -- auditoría (1 semana)

1. Inventariar todos los selectores en cada automatización.
2. Para cada uno: clasificar como "estable-bajo mantenimiento" /
   "frágil-alto mantenimiento".
3. Los frágiles se convierten en candidatos NAC3 primero.

### Fase 2 -- preparación de la app objetivo

La app web que la automatización apunta debe adoptar NAC3. Opciones:

- El equipo de la app adopta NAC3 mediante la guía de migración
  ([AI_PLAYBOOK_MIGRATION.md](AI_PLAYBOOK_MIGRATION.md)).
- O bien: el CoE de RPA inyecta NAC3 del lado del cliente mediante un
  userscript o extensión de navegador si el equipo de la app no puede
  migrar. Esto funciona pero es frágil; se prefiere la adopción de
  primera parte.

### Fase 3 -- reescritura de la automatización (1-2 semanas por automatización)

Reemplazar cada selector con la llamada `NAC.*` correspondiente.
La versión basada en selectores se conserva en una rama de respaldo.
La nueva versión se entrega con log de auditoría NAC3 explícito.

### Fase 4 -- gobernanza

El CoE actualiza su checklist de revisión de bots:
- El bot solo apunta a IDs de NAC que existen en los manifiestos actuales.
- El bot tiene una lista blanca explícita de verbos para operaciones sensibles.
- El bot registra cada despacho en la tabla de auditoría.

## Costo de adopción

Para un CoE que opera 50 automatizaciones contra 10 apps objetivo:

- Migración del lado de la app: 6-8 semanas (un ingeniero por app).
- Reescritura del lado del bot: 1-2 semanas por bot = 50-100 semanas-ingeniero.

Parece costoso hasta que se compara con el costo en estado estable de
mantener 50 bots basados en selectores indefinidamente. El punto de
equilibrio típicamente se alcanza en 6-9 meses; todo lo que sigue es
ahorro puro de tiempo de ingenieros del CoE.

## Riesgos y mitigación

### Riesgo -- "la app objetivo se niega a adoptar NAC3"

Común en software empresarial legado. Mitigar mediante:

- Inyectar `nac.js` del lado del cliente mediante una extensión de
  navegador administrada por el CoE o un userscript estilo Tampermonkey.
- Definir los manifiestos del lado del CoE; la app permanece sin cambios.
- Menos robusto que la adopción de primera parte, pero viable como
  solución de transición.

### Riesgo -- "el RPA elude el control de isTrusted"

Este es el trade-off de seguridad. El RPA SÍ sintetizará clics. La app
anfitriona debe incluir en la lista blanca qué verbos puede activar el
RPA. El CoE y el equipo de la app negocian verbo por verbo. Documentar
la negociación; auditar la lista blanca periódicamente.

### Riesgo -- "perdemos visibilidad sobre la secuencia de acciones del RPA"

Al contrario: con NAC3 se GANA visibilidad. Cada despacho del bot
dispara un evento canónico `nac:action:succeeded` con
`{plugin, action_id, args, is_trusted}` estructurado. Registrar eso en
el SIEM con la política de retención correspondiente.

## Paralelo en la industria

Lo que ARIA hizo para la tecnología de asistencia (dar a los lectores
de pantalla un contrato estable sobre la página), NAC3 lo hace para RPA
y la automatización agéntica. El CoE pasa de ser "mantenedor de
selectores" a "diseñador de automatizaciones".

## Ver también

- [RPA_UIPATH.md](RPA_UIPATH.md), [RPA_AUTOMATION_ANYWHERE.md](RPA_AUTOMATION_ANYWHERE.md),
  [RPA_BLUE_PRISM.md](RPA_BLUE_PRISM.md) -- guías de integración por
  plataforma.
- [IMPACT_TESTING.md](IMPACT_TESTING.md) -- análisis de impacto paralelo
  para la dimensión de testing/QA.
- [SECURITY.md](../SECURITY.md) -- modelo de amenazas de isTrusted del
  que depende la lista blanca de RPA.

## Licencia

Apache-2.0.

---

*This is a machine translation of the canonical English
version at `/nac-spec/guides/IMPACT_RPA.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
