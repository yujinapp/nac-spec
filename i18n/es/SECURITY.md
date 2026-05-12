---
translation_source: SECURITY.md
translation_source_hash: 4d9f26e0cc810ed4f1c6cf921c7ae8f5c004d8ba42445a69a2de58106db2b64f
translation_quality: machine_v1
translation_lang: es
translation_date: 2026-05-11T12:46:51.541294+00:00
---

# NAC3 -- modelo de seguridad

**Versión de la especificación:** 2.2 stable (+ vista previa de interoperabilidad v2.3).

## Modelo de amenazas

NAC3 se ubica entre los agentes y tu UI. Es una capa de contrato, no
una capa de autenticación. Existen varios límites de confianza bien
definidos; este documento los nombra para que puedas razonar con claridad
sobre cuáles protege NAC3 y cuáles no.

### Límite A: Usuario -> UI

Fuera del alcance de NAC. Usa tu autenticación existente (sesiones, OAuth,
SSO, MFA). Una vez que el usuario está autenticado, NAC3 asume que cualquier
acción que el usuario pueda realizar en la UI está permitida.

### Límite B: Agente controlado por el usuario -> UI

Un usuario le otorga a un agente permiso para manejar su sesión de navegador.
Ejemplos: un asistente de voz, un lector de pantalla, un cliente de chat LLM
integrado en la misma página. El rol de NAC3 aquí:

1. Proveer al agente nombres de elementos estables para que pueda actuar
   sin necesidad de rastrear coordenadas.
2. Exponer `event.isTrusted` para que el host pueda rechazar clics sintéticos
   en verbos sensibles a la seguridad (pagos, eliminaciones, asignación de roles).
   El agente no puede falsificar `isTrusted=true`; solo un gesto real del usuario
   lo establece.
3. Proveer confirmaciones a nivel de evento para que el agente sepa qué se
   completó sin necesidad de releer el DOM.

NAC3 NO protege contra el mal uso de la confianza por parte de un agente que
el usuario autorizó explícitamente. Eso es un problema de experiencia de usuario
(prompts de consentimiento antes de verbos sensibles) que debe resolver tu
aplicación, no NAC.

### Límite C: Servicio externo -> UI (intermediario LLM)

Si el prompt de voz de un usuario se envía a un LLM remoto que devuelve
acciones NAC3, el LLM se convierte en un principal de confianza. El rol de NAC3 aquí:

1. El LLM solo ve lo que `NAC.describe()` expone (el snapshot del árbol
   más los manifiestos registrados). No tiene acceso a los tokens de
   autenticación del usuario, cookies ni a los internos del DOM más allá
   de lo que declara el manifiesto.
2. El LLM no puede causar un clic directamente. Devuelve una acción
   estructurada; el cliente de chat la valida (¿existe el nac_id?
   ¿está permitido el verbo?) antes de despacharla.
3. El cliente de chat DEBERÍA rechazar acciones cuyo `nac_id` no estuviera
   en el snapshot que envió (esto previene inyecciones de prompt que
   intentan introducir ids arbitrarios).

NAC3 NO prescribe la plantilla de prompt del LLM, los límites de tasa ni
el filtrado. Consulta `guides/LLM_WIRING.md` para recomendaciones.

### Límite D: Tenant -> Tenant (despliegues multi-tenant)

SaaS multi-tenant donde los tenants comparten un runtime pero no los datos.
NAC3 protege esto con manifiestos firmados con HMAC:

1. Cada tenant envía su manifiesto con una firma HMAC calculada sobre
   una serialización estable, usando un secreto por tenant almacenado
   en el servidor.
2. El runtime, al ejecutar `NAC.register()`, recalcula el HMAC usando
   el secreto que espera para el tenant activo. Si la firma no coincide,
   el manifiesto es rechazado.
3. Un tenant malicioso no puede falsificar el manifiesto de otro tenant
   sin conocer el secreto de firma.

NAC3 NO impide que un tenant registre un manifiesto excesivamente grande
o malformado más allá de un límite básico de tamaño; aplica límites de tasa
al registro de manifiestos en el servidor si aceptas manifiestos no confiables.

### Límite E: Script malicioso -> Página

Una página que incluye JS controlado por un atacante (XSS, compromiso de
cadena de suministro) ya está comprometida. NAC3 no puede ayudar aquí; el
atacante puede llamar a `NAC.click(...)` directamente. Mitiga esto mediante
CSP, SRI y tu stack habitual de seguridad web.

## Señales de procedencia

### `is_trusted` en eventos de éxito

El detalle de cada evento de éxito de acción incluye `is_trusted: boolean`.
Un host puede requerirlo para verbos sensibles:

```js
document.addEventListener('nac:action:succeeded', function (e) {
  var d = e.detail;
  if (d.action_id === 'invoice.delete' && !d.is_trusted) {
    console.warn('[security] refused synthetic delete click');
    e.preventDefault();
  }
});
```

La demo de referencia `example-v20-full.php` incluye un par de botones
(`v20_panel.istrusted_real` y `v20_panel.istrusted_fake`) que demuestran
la distinción en la salida del panel.

### Firma HMAC de manifiestos

En el servidor, genera la firma:

```python
import hmac, hashlib, json
manifest_body = json.dumps(manifest, sort_keys=True, separators=(',', ':'))
sig = hmac.new(
    tenant_secret.encode('utf-8'),
    manifest_body.encode('utf-8'),
    hashlib.sha256
).hexdigest()
manifest['provenance'] = {
    'signed_at': now_iso8601(),
    'signed_by': tenant_slug,
    'signature': sig
}
```

En el cliente:

```js
NAC.set_provenance_secret(SECRET_FROM_AUTHED_RESPONSE);
NAC.register(manifest);
// runtime recomputes hmac, rejects if mismatch
```

El secreto DEBE provenir de una respuesta autenticada del servidor; nunca
lo incluyas directamente en el código fuente JavaScript. Rótalo por sesión
si el modelo de amenazas lo requiere.

## Reportar una vulnerabilidad

Envía un correo a `nac@yujin.dev` con:

1. Descripción de la vulnerabilidad.
2. Pasos de reproducción o prueba de concepto.
3. Versión(es) de NAC3 afectadas.
4. Mitigación sugerida si tienes una.

NO abras un issue público en GitHub. Nos comprometemos a:

- Confirmar la recepción dentro de 3 días hábiles.
- Proveer una evaluación de triaje dentro de 10 días hábiles.
- Coordinar el momento de divulgación con quien reportó.

Los problemas críticos que afectan la especificación pública se publican
con una versión de parche en un plazo de 30 días; los de menor severidad,
en 90 días.

## Lo que NAC3 explícitamente NO hace

- Autenticar usuarios.
- Cifrar datos en tránsito (usa TLS).
- Impedir que el usuario realice lo que tiene permitido hacer.
- Aislar agentes entre sí (todos se ejecutan en la misma
  página; si necesitas aislamiento, usa páginas separadas).
- Firmar acciones individuales (solo manifiestos). La firma por acción
  está contemplada como candidata para v3.0.

---

*This is a machine translation of the canonical English
version at `/nac-spec/SECURITY.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
