---
translation_source: ABOUT.md
translation_source_hash: 4ab5d9a2ad96ee42811299474895d9836adc1ca93ea37726806f190f59646484
translation_quality: machine_v1
translation_lang: es
translation_date: 2026-05-11T12:24:15.960565+00:00
---

# Acerca de NAC3

**Versión de la especificación:** 2.2 estable (+ vista previa de interoperabilidad v2.3).

**NAC3** = **Native Agent Contract**.

Una especificación pequeña y pública que permite que las interfaces web sean controladas por agentes de IA, ejecutores de voz y herramientas de accesibilidad de la misma manera en que las controlan los humanos hoy: haciendo clic, escribiendo y leyendo -- pero con nombres que las máquinas pueden resolver, eventos que las máquinas pueden esperar, y un rastro de procedencia que distingue a un usuario real de un llamador sintético.

NAC3 se ubica junto a ARIA, no encima de él. Así como ARIA estandarizó el **árbol de accesibilidad** para que los lectores de pantalla y dispositivos de acceso alternativo pudieran operar la misma interfaz que ve un usuario con visión, NAC3 estandariza el **árbol de agentes** para que un comando de voz, un intermediario LLM o un bot RPA puedan hacer lo mismo sin código de integración específico por aplicación.

## Qué se escribe

Un puñado de atributos HTML (`data-nac-id`, `data-nac-role`, `data-nac-action`, `data-nac-plugin`) más un manifiesto JS opcional que nombra los elementos de la página y los verbos que aceptan. El runtime resuelve los nombres en elementos y les despacha acciones.

## Qué se obtiene

- Una página que responde a `NAC.click('deals.create')` desde cualquier llamador -- un ejecutor de voz, una especificación Playwright, un intermediario LLM, una macro de teclado, una herramienta de accesibilidad.
- Una página que emite una familia de eventos determinista (`nac:action:succeeded`, `nac:tab:activated`, `nac:field:changed`, ...) para que el llamador sepa cuándo terminó cada paso.
- Una página cuyo contrato se basa en las identidades de los elementos, no en coordenadas -- de modo que un rediseño de la interfaz no rompe la automatización.
- Una capa de procedencia (`isTrusted`, manifiestos firmados con HMAC) que le indica a un sistema receptor si un clic provino de un usuario real o de otro agente.

## Lo que NAC3 no es

- No es un framework de UI. Se conserva React / Vue / vanilla / PHP / lo que sea. NAC3 es un contrato delgado que se superpone sobre lo que ya se renderiza.
- No es un LLM. El LLM que resuelve "haz clic en el botón guardar" como `NAC.click('deals.save')` es responsabilidad propia (o del proveedor); ver `guides/LLM_WIRING.md` como referencia.
- No reemplaza la accesibilidad. Se deben conservar los roles ARIA. NAC3 agrega una capa paralela; muchos adoptantes terminan con `role="button"` y `data-nac-role="action"` en el mismo elemento.

## Estado

- **v1.9** -- estable. 27 widgets cubiertos, 9 familias de eventos, HMAC + isTrusted, modo estricto i18n, validador. La referencia de producción es `example.php`.
- **v2.0** -- incluye la historia de migración brownfield (las páginas existentes se vuelven NAC-driven con ~80 líneas de configuración). Referencia: `example-v20-full.php`.
- **v2.1** -- agrega la primitiva de tabla de datos (`collection`, `matrix`, subtipos `matrix-singletree`; `dt_add_row`, `dt_edit_cell`, agregados, commit transaccional). Referencia: `example-v21-data-table.php`.
- **v2.2** -- PUBLICADO 2026-05-10. `NAC.register` es ahora un validador estricto (`manifest_role_unknown`, `tab_id_manifest_role_drift`, `manifest_dom_role_mismatch`). Nuevo helper `NAC.bindAction(el, handler, ctx)` que incorpora el contrato `nac:action:succeeded` en el runtime. Nueva bandera `NAC.STRICT_VALIDATION` que alterna los hallazgos entre solo-advertencia (predeterminado en 2.2) y lanzar excepción (predeterminado en 2.3). **Esto es lo que `npm install @nac3/runtime` instala hoy.** Ver `docs/NAC_V22_ROADMAP.md` para el registro de cambios completo.
- **v2.3** -- en planificación. El valor predeterminado de `STRICT_VALIDATION` cambia a `true`. Complemento `NAC.bindTab(el, handler, ctx)` para widgets de pestañas. Opción de incorporación opcional: despacho de chat en streaming.

## Por dónde empezar

- Ejecutar las demos en `yujin.app/nac-spec/` (cualquier navegador, cualquier dispositivo).
- Leer `SPEC.md` para conocer el contrato completo.
- Leer `guides/REACT.md` si se adopta desde React.
- Leer `guides/LLM_WIRING.md` si se conecta un intermediario LLM propio.
- Leer `SECURITY.md` antes de desplegar NAC3 en un contexto multi-tenant.

## Gobernanza

NAC3 está actualmente bajo la administración de Yujin. La especificación tiene licencia Apache 2.0; el runtime de referencia tiene licencia MIT. Yujin se compromete a trasladar NAC3 a una fundación neutral (grupo comunitario W3C, Linux Foundation u organismo sectorial equivalente) si y cuando la adopción justifique una gobernanza neutral. Hasta entonces, los cambios a la especificación siguen el proceso RFC en `CONTRIBUTING.md` con un período de comentarios públicos de al menos 14 días para cualquier cambio en la API pública o el formato de wire.

Las licencias Apache 2.0 + MIT garantizan que la especificación y el runtime sobrevivan a cualquier cambio en el estado corporativo de Yujin. Los adoptantes pueden hacer fork de cualquiera, ejecutar cualquiera y distribuir cualquiera, hoy y después de que Yujin deje de existir.

## Autoría

NAC3 es desarrollado y mantenido por Yujin (yujin.app). Apache-2.0. Se aceptan contribuciones -- ver `CONTRIBUTING.md`.

---

*This is a machine translation of the canonical English
version at `/nac-spec/ABOUT.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
