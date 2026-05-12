---
translation_source: docs/NAC_INTEROP_MCP.md
translation_source_hash: 559b9c7f1d01da4f76e35b6e4f1fcb558f8f0bbca87f7cb4148738989b83b49c
translation_quality: machine_v1
translation_lang: es
translation_date: 2026-05-11T13:23:27.154683+00:00
---

# NAC3 -- interoperabilidad entre apps vía MCP

**Estado:** vista previa v2.3 (rama `feat/nac-interop-mcp`, aún no
fusionada a main).
**Sección de especificación:** se insertará como sección 11 de SPEC.md cuando
la funcionalidad salga de vista previa.

## Por qué

NAC3 v1.9 + v2.0 + v2.1 + v2.2 estandarizan cómo *una* interfaz web es
controlada por un agente de IA. v2.3 extiende el contrato para definir cómo
*múltiples* apps NAC3 interoperan entre sí.

El flujo de usuario que motivó esto:

> Pablo está en Yujin CRM dictando al chat. Dice:
> *"Yujin, cambia a Excel."*
>
> El cliente de chat de Yujin reconoce esto como una intención de interoperabilidad.
> Llama a la herramienta MCP `nac.export_tree` contra la instancia de Excel
> que el usuario tiene abierta, recupera el árbol NAC3 completo de Excel
> (libro activo, hoja actual, rangos con nombre, botones de la cinta) y lo
> registra como plugin remoto bajo `remote:excel:*`.
>
> Ahora Pablo puede decir *"pon la celda A1 en 100"* y el intermediario de
> Yujin resuelve `remote:excel:cell.A1` -> `NAC.fill('remote:excel:cell.A1',
> 100)`. El runtime detecta el prefijo `remote:` y enruta el despacho vía
> MCP. Excel ejecuta el efecto secundario, emite su ack `nac:field:changed`,
> el stream SSE lo devuelve al runtime de Yujin, la promesa local se resuelve.
> Pablo ve en el chat de Yujin: *"Celda A1 establecida en 100."*
>
> Lo más importante: **el agente no necesitaba conocer el esquema de Excel
> de antemano**. La llamada a export_tree le entregó el manifiesto en el
> momento en que lo necesitaba.

Esta es la base del **pool comercial de productos adjuntables** que Yujin
anunció en el lanzamiento de v2.3. Cualquier app de terceros que incluya un
servidor MCP que exponga las cuatro herramientas de interoperabilidad descritas
a continuación queda disponible como destino de navegación desde cualquier
otro host NAC3.

## Arquitectura

```
+----------------+         +-----------------+         +----------------+
|  Yujin (host)  |  call   |   MCP bridge    |  HTTP   |  Excel (peer)  |
|   nac.export   | ------> | (agent process) | ------> |   nac.export   |
|   nac.import   | <------ |                 | <------ |   nac.invoke   |
+----------------+         +-----------------+         +----------------+
         ^                                                      |
         |     ack events (SSE: nac:*:succeeded / :failed)     |
         +------------------------------------------------------+
```

Tres actores:

1. **Host** -- la app que el usuario está controlando actualmente (Yujin en
   el ejemplo).
2. **Peer** -- la app externa compatible con NAC-3 que se importa
   (Excel en el ejemplo).
3. **MCP bridge** -- típicamente el proceso agente del host. Gestiona los
   tokens bearer de los peers conocidos y enruta las invocaciones.
   El bridge NO suplanta al usuario ante el peer; usa sus propias credenciales.

## Superficie de herramientas MCP

Todo peer compatible con NAC-3 DEBE exponer estas cuatro herramientas en su
endpoint MCP:

### `nac.export_tree`

Entrante. Devuelve un payload autodescriptivo que otra app puede importar.

**Entrada:**

```ts
{
  scope?: 'full' | 'active_plugin' | 'plugin_slug:<slug>',
  include_dom_state?: boolean,    // default false (privacy)
  include_locales?: string[],     // default all 10
  bearer: string                  // peer's per-tenant token
}
```

**Salida:**

```ts
{
  app_id: string,                 // 'yujin-crm', 'excel-online', etc.
  app_version: string,            // semver of the app, NOT of NAC
  nac_version: '2.3',
  exported_at: string,            // ISO8601
  active_plugin: string | null,
  manifests: Record<string, Manifest>,   // by plugin_slug
  scope_tree: ScopeNode[],
  data_tables: DataTableSnap[],   // v2.1 sec 18
  state: {
    url?: string,
    title?: string,
    user_lang: string,
    tenant_id?: string
  },
  ack_endpoint: string            // SSE URL for subscribe_events
}
```

### `nac.invoke`

Entrante. Despacha una acción NAC3 en el peer.

**Entrada:**

```ts
{
  bearer: string,
  nac_id: string,                 // peer-local id, NOT prefixed
  action: {
    kind: 'click' | 'click_by_verb' | 'fill' | 'select'
        | 'tab' | 'tab_by_label' | 'go_to_section'
        | 'dt_add_row' | 'dt_edit_cell' | 'dt_remove_row'
        | 'dt_commit' | 'dt_discard'
        | 'edit_field',
    args: Record<string, unknown>   // shape depends on kind
  },
  hmac?: string                   // optional HMAC-SHA256 of body
                                  // for sensitive verbs
}
```

**Salida:**

```ts
{
  ok: boolean,
  result?: { row_id?: string, value?: unknown, ... },
  error?: { code: string, message: string }
}
```

El peer despacha la acción a través de su `NAC.<kind>(...)` local,
espera la familia de eventos ack canónicos con un timeout de 5s y
devuelve el resultado. El ack TAMBIÉN se transmite por el canal SSE
para que el host pueda correlacionarlo.

### `nac.subscribe_events`

Streaming (SSE). Envía eventos ack del peer al host.

**Entrada (query string):**

```
?bearer=<token>&plugins=<csv-of-plugin-slugs>&since=<iso8601>
```

**Salida (cada evento):**

```
event: nac:action:succeeded
data: {"plugin":"excel","action_id":"excel.cell.A1","is_trusted":false,
       "result":{"value":100},"ts":"2026-05-10T18:30:01.234Z"}

event: nac:tab:activated
data: {"plugin":"excel","tab_id":"tab.sheet2",...}
```

El runtime del host retransmite estos eventos al documento local, de modo que
un agente que llame a `NAC.click('remote:excel:cell.A1')` obtenga una promesa
resuelta localmente impulsada por el evento remoto.

### `nac.health`

Entrante, simple. Devuelve:

```ts
{ ok: true, nac_version: '2.3', app_id: 'excel-online',
  uptime_ms: 12345 }
```

Los hosts lo usan para verificar que un peer es accesible antes de importarlo.

## API del runtime en el host

Estas tres nuevas funciones viven en `window.NAC` a partir de v2.3:

```ts
NAC.export_tree(opts?: {
  scope?: 'full' | 'active_plugin' | 'plugin_slug:<slug>',
  include_dom_state?: boolean,
  include_locales?: string[]
}): Promise<NACExportV1>
```

Devuelve el payload definido anteriormente. Lectura puramente local, sin I/O.

```ts
NAC.import_remote_tree(
  payload: NACExportV1,
  conn: {
    transport: 'http' | 'stdio',
    endpoint: string,            // URL for http, command for stdio
    bearer: string,
    namespace?: string,          // defaults to payload.app_id
    auto_subscribe?: boolean     // default true
  }
): RemoteHandle
```

Registra cada manifiesto de `payload.manifests` bajo un slug de plugin con
espacio de nombres:

- `payload.manifests.invoice` pasa a ser
  `remote:<namespace>:invoice` en `NAC.describe()`.
- Todos los nac_ids dentro de ese manifiesto reciben el prefijo
  `remote:<namespace>:` cuando son resueltos por `NAC.click()` /
  `NAC.fill()` / etc.
- El resolvedor de elementos del runtime verifica primero el prefijo; si
  coincide, enruta el despacho a través del transporte de la conexión en
  lugar de consultar el DOM.

```ts
NAC.list_remote_apps(): RemoteHandle[]
NAC.disconnect_remote(remote_id: string): void
```

Inspección y limpieza. Disconnect cierra el stream SSE y
elimina el registro de los plugins con espacio de nombres.

## Enrutamiento del despacho

Cuando se llama a `NAC.click(id)` y `id` comienza con `remote:`:

1. Parsear `remote:<namespace>:<peer_local_id>`.
2. Buscar `_remotes[namespace]` -- el RemoteHandle almacenado en
   la importación.
3. POST `{ bearer, nac_id: peer_local_id, action: { kind:'click',
   args: {} } }` a `handle.endpoint + '/nac.invoke'`.
4. Si `ok: true`, resolver inmediatamente la promesa local (el stream SSE
   también despacha el `nac:action:succeeded` local para que los awaiters
   que no tienen la promesa igualmente reciban la notificación).
5. Si `ok: false`, rechazar con el código de error del peer.

Los demás tipos de acción (`fill`, `tab`, `tab_by_label`, `dt_*`,
`edit_field`) siguen el mismo patrón.

## Modelo de seguridad

### Límites de confianza

- El **token bearer** autentica al host ante el peer. Lo emite la capa de
  administración del peer (su gestión de tenants). El bridge lo almacena
  del lado del servidor; nunca se expone al prompt del intermediario LLM.
- El **HMAC** por acción es opcional pero recomendado para los verbos que
  el peer marca como sensibles (`delete`, `payment.*`, asignación de roles).
  Cuerpo del HMAC = `bearer + nac_id + kind + sorted(args)`, hash SHA-256.
- **Lista blanca de orígenes** -- el servidor MCP del peer verifica el
  encabezado Origin (o su equivalente en el transporte MCP) contra una lista
  registrada. Los hosts fuera de la lista reciben HTTP 403.

### Propagación de is_trusted

Toda acción despachada a través del proxy lleva
`is_trusted: false` en el detalle de su evento ack. El código host del peer
PUEDE rechazar la acción por ese motivo:

```js
document.addEventListener('nac:action:succeeded', function (e) {
  if (e.detail.action_id === 'invoice.delete' && !e.detail.is_trusted) {
    console.warn('[security] refused synthetic delete via interop');
    e.preventDefault();
  }
});
```

### Rotación de tokens

Los tokens bearer se rotan del lado del servidor según el ciclo de sesión
normal del peer (p. ej., cada 24h). El host detecta un 401 del peer y
obtiene un token nuevo a través del flujo de autenticación del usuario.
Las sesiones que no pueden reautenticarse se desconectan limpiamente.

## Diagrama de secuencia (texto)

```
USER         YUJIN HOST              MCP BRIDGE              EXCEL PEER
 |              |                       |                        |
 |- "jump      ->| recognise intent     |                        |
 |   to Excel"  | ack=tts                                        |
 |              |- nac.export_tree --> | --- HTTP --------> | export
 |              |                       |                    | tree
 |              |<-- payload --------- | <-- response ----- |
 |              |  import_remote_tree(payload, conn)              |
 |              |  remote plugins now in NAC.describe()           |
 |              |- subscribe_events --> | --- SSE open ----> |
 |              |<------------------- ack stream live <---- |
 |- "set A1    ->| chat resolve to                                |
 |   to 100"    |  click_by_verb('remote:excel', 'set_cell', ...) |
 |              |- detect remote: prefix                          |
 |              |- proxy invoke -----> | --- HTTP --------> | NAC.fill
 |              |                       |                    | side fx
 |              |                       |                    | emit ack
 |              |<------------------- ack via SSE <-------- |
 |              |  local promise resolves                         |
 |- ack tts <--|  "Cell A1 set to 100"                            |
 |              |                                                  |
```

## No incluido (diferido)

- **Interoperabilidad bidireccional donde el peer también importa al host.**
  El modelo v2.3 es navegación unidireccional host -> peer. Las importaciones
  cruzadas añaden complejidad de reentrada y detección de ciclos; diferido a v2.4.
- **Cadenas de múltiples saltos** (Yujin -> Excel -> Slack). Misma razón de
  complejidad; v2.3 limita a un solo salto.
- **Acciones en streaming** (seguimiento de cursor en vivo). Aspiracional;
  requiere un canal tipo WebRTC más allá de lo que SSE puede ofrecer.

## Presupuesto de rendimiento

- Round-trip de `nac.export_tree`: < 200 ms p95 en LAN.
- Round-trip de `nac.invoke` (excluyendo el tiempo del efecto secundario
  en el peer): < 100 ms p95.
- Keepalive de `nac.subscribe_events`: heartbeat cada 15s.

## Archivos de implementación (esta rama)

| Archivo | Rol |
|---------|-----|
| `yujin.app/nac-spec/js/nac-mcp-interop.js` | Runtime del host: export_tree + import + proxy |
| `agent/mcp_interop.py` | Implementaciones de herramientas del servidor MCP para Yujin como peer |
| `packages/nac/src/interop.ts` | Tipos TypeScript + helpers |
| `yujin.app/nac-spec/example-v22-interop.php` | Demo en vivo: dos mini-apps lado a lado que se importan mutuamente |
| `packages/nac/test/v23-interop.mjs` | Pruebas unitarias para export + import + proxy |
| `tools/nac/test-launch.sh` | Extendido con capa 6 (interop) |

## Preguntas abiertas antes del GA de v2.3

- ¿Debería el payload de exportación estar opcionalmente firmado con el
  secreto HMAC del peer para que el host pueda verificar el origen incluso
  cuando se enruta a través de un bridge no confiable? (Probablemente sí;
  candidato para v2.3.1.)
- ¿Cuál es la affordance de UI canónica para "app remota disponible"
  en un chat? ¿Un emoji? ¿Una píldora? ¿Ícono por app desde el manifiesto?
  (Candidato para sección 14 de la especificación.)
- ¿Deberían los `data_tables` de un peer ser editables desde el agente del
  host, o de solo lectura por defecto? (La tendencia es solo lectura; opt-in
  explícito para escritura.)

---

*This is a machine translation of the canonical English
version at `/nac-spec/docs/NAC_INTEROP_MCP.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
