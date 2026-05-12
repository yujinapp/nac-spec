---
translation_source: docs/ACCESSIBILITY.md
translation_source_hash: 615f9c5a447d95c7aee985d926f7b29377bed44dc959fd07a966fd41fa86a03b
translation_quality: machine_v1
translation_lang: es
translation_date: 2026-05-11T13:21:05.637191+00:00
---

# NAC3 -- Compromiso de accesibilidad

**Versión de la especificación:** 2.2 estable (+ vista previa de interoperabilidad v2.3).
**Última revisión:** 2026-05-11.

NAC3 fue diseñado para que las interfaces web sean direccionables por máquinas. La misma propiedad que hace que una interfaz sea navegable por un agente de IA la hace navegable por un lector de pantalla, un dispositivo de acceso por pulsador, un rastreador ocular y un usuario de voz. NAC3 es, por construcción, un primitivo de accesibilidad — y Yujin se compromete a mantenerlo así.

---

## El compromiso

1. **Cumplimiento de WCAG 2.1 Nivel AA** como mínimo para todo producto de Yujin construido sobre NAC3 (`yujin-pilot`, `yujin-forge`, las demos de referencia en yujin.app/nac-spec/, yujin.app/registry).
2. **AAA donde sea factible** para las superficies donde la accesibilidad importa más: panel de chat, activación por voz, incorporación inicial, mensajes de error.
3. **Sin "edición accesible" separada**. La accesibilidad se incluye en el producto principal, al mismo precio y con el mismo ciclo de lanzamiento. Las ediciones separadas estigmatizan a los usuarios y se deterioran.
4. **Sin "accesibilidad después"**. Cada versión está condicionada a las verificaciones de accesibilidad documentadas en la sección 8.6 de [HUMAN_OK_CHECKLIST.md](HUMAN_OK_CHECKLIST.md) y en la nueva sección de pruebas básicas de lector de pantalla (Track G7).

---

## Tecnologías de asistencia compatibles

Las implementaciones de referencia se prueban con:

| Categoría de AT | Herramientas verificadas |
|-----------------|--------------------------|
| Lectores de pantalla | NVDA (Windows), JAWS (Windows), VoiceOver (macOS, iOS) |
| Control por voz | Yujin Pilot, Apple Voice Control, Windows Speech Recognition, Dragon NaturallySpeaking |
| Acceso por pulsador | iOS Switch Control, Android Switch Access |
| Rastreo ocular | Tobii Dynavox |
| Ampliación | Zoom del navegador hasta 200%, ZoomText, macOS Zoom |
| Solo teclado | Navegación completa por teclado, foco visible, sin límites de tiempo |

Cualquier AT que consuma el árbol de accesibilidad estándar (ARIA, accessibilityRole, accessibilityLabel) se beneficia de NAC3, porque los elementos de NAC3 llevan la misma información semántica utilizada por la capa de AT.

---

## Qué aporta NAC3 a la accesibilidad (mecanismo)

- **Identificadores estables (`data-nac-id`)**: los lectores de pantalla y el acceso por pulsador no dependen de la posición visual. El identificador sobrevive a los rediseños, por lo que la memoria muscular del usuario de AT también lo hace.
- **Roles canónicos (`data-nac-role`)**: la enumeración de roles (action, field, tab, etc.) se mapea 1:1 con los roles de ARIA. Los usuarios de AT escuchan anuncios semánticamente correctos.
- **Verbos del manifiesto (`label_i18n`)**: cada acción tiene una etiqueta localizada en 10 idiomas. Los usuarios de control por voz pronuncian el verbo; el manifiesto lo resuelve.
- **Eventos de confirmación deterministas (`nac:action:succeeded`)**: los usuarios de AT escuchan la confirmación de que una acción se completó, no una suposición basada en la animación de la interfaz.
- **Validación estricta (v2.2)**: detecta la divergencia entre el manifiesto y el DOM antes de que llegue a los usuarios de AT.

---

## Lo que NAC3 NO resuelve

- **Aplicaciones nativas de iOS/Android**: la especificación v2.2 cubre únicamente web + WebView. El móvil nativo está en la hoja de ruta de v3.0.
- **Presentación visual**: NAC3 es estructural. El contraste, el tamaño de fuente y los indicadores de foco son responsabilidad de la implementación (los tokens de Yujin cubren esto en nuestras implementaciones de referencia).
- **Carga cognitiva de flujos complejos**: los ids de NAC3 no simplifican un flujo de trabajo mal diseñado. Una buena arquitectura de información y textos en lenguaje claro sí lo hacen.
- **Subtitulado de contenido multimedia**: los activos de audio/video deben ser subtitulados por el publicador. NAC3 provee los puntos de integración, pero no el contenido.

---

## Cómo reportar un problema de accesibilidad

Envía un correo a `accessibility@yujin.app` (o a la dirección que reenvíe al mantenedor). SLA de respuesta: 5 días hábiles para triaje; sin SLA de corrección porque cada caso es diferente. Los problemas se rastrean públicamente en el repositorio `nac-spec` con la etiqueta `a11y`.

Para problemas sensibles a la seguridad (por ejemplo, evasión de diálogos de confirmación por parte de AT), sigue las instrucciones en `SECURITY.md`.

---

## Hoja de ruta

| Track | Descripción | Objetivo |
|-------|-------------|----------|
| G1 | Auditoría WCAG 2.1 AA + remediación (Forge + Pilot UI) | Antes de Forge/Pilot v1 |
| G2 | Asistente de configuración por voz (primera ejecución de Forge + Pilot) | Forge/Pilot v1 |
| G3 | Cumplimiento de NAC3 en cada página de documentación | Lanzamiento de NAC3 v2.2 |
| G4 | Versión de audio (.mp3) de cada guía | NAC3 v2.3 |
| G5 | Tutorial conversacional en yujin.app/learn | NAC3 v2.3 |
| G6 | Versión en lenguaje claro de las guías principales | NAC3 v2.3 |
| G7 | Prueba básica de lector de pantalla en HUMAN_OK_CHECKLIST | Lanzamiento de NAC3 v2.2 |
| G8 | Programa beta con usuarios con discapacidad real | Antes de Forge/Pilot v1 |
| G9 | Esta declaración, pública y enlazada desde cada página | Lanzamiento de NAC3 v2.2 |
| G10 | Auditoría certificada externa | Antes de Forge/Pilot 1.0 comercial |

---

## Por qué publicamos esto

Dos razones prácticas más allá de la ética:

1. **La Ley Europea de Accesibilidad (EAA)** entró en vigor en junio de 2025 para servicios B2C. Las aplicaciones construidas con Forge son conformes con NAC3 por defecto y se acercan más al cumplimiento de la EAA que las de la competencia.
2. **Las demandas bajo el Título III de la ADA de EE. UU. por aplicaciones web** crecieron un 320% interanual. Los compradores empresariales se preocupan por esto. La postura de cumplimiento de NAC3 + Yujin reduce su exposición legal.

NAC3 no es un "estándar abierto con accesibilidad como beneficio adicional". NAC3 es "el único contrato de automatización web de propósito general que es nativo en accesibilidad por construcción". Lo mantendremos así.

---

## Ver también

- [SPEC.md](../SPEC.md) -- el contrato canónico.
- [HUMAN_OK_CHECKLIST.md](HUMAN_OK_CHECKLIST.md) -- incluye la sección de pruebas básicas de lector de pantalla.
- [SECURITY.md](../SECURITY.md) -- modelo de seguridad, incluye aspectos relacionados con AT.

## Licencia

Este documento está bajo Apache-2.0. Las implementaciones a las que se compromete son MIT (runtime) / Apache-2.0 (spec) / propietario (Forge, Pilot).

---

*This is a machine translation of the canonical English
version at `/nac-spec/docs/ACCESSIBILITY.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
