# NAC3 -- cross-app interop via MCP

**Status:** v2.3 preview (branch `feat/nac-interop-mcp`, not yet
merged to main).
**Spec section:** to be inserted as SPEC.md sec 11 when the feature
moves out of preview.

## Why

NAC3 v1.9 + v2.0 + v2.1 + v2.2 standardise how *one* web UI gets
driven by an AI agent. v2.3 extends the contract to how *multiple*
NAC3 apps interoperate.

The motivating user flow:

> Pablo is in Yujin CRM dictating to the chat. He says:
> *"Yujin, jump to Excel."*
>
> Yujin's chat client recognises this as an interop intent. It
> calls the `nac.export_tree` MCP tool against the Excel instance
> the user has open, pulls back Excel's full NAC3 tree (active
> workbook, current sheet, named ranges, ribbon buttons), and
> registers it as a remote plugin under `remote:excel:*`.
>
> Now Pablo can say *"set cell A1 to 100"* and Yujin's intermediary
> resolves `remote:excel:cell.A1` -> `NAC.fill('remote:excel:cell.A1',
> 100)`. The runtime detects the `remote:` prefix and proxies the
> dispatch via MCP. Excel performs the side effect, emits its
> `nac:field:changed` ack, the SSE stream pipes it back to Yujin's
> runtime, the local promise resolves. Pablo sees in Yujin's chat:
> *"Cell A1 set to 100."*
>
> Critically: **the agent didn't have to know Excel's schema in
> advance**. The export_tree call gave it the manifest at the
> moment of need.

This is the foundation of the **commercial pool of attachable
products** Yujin announced at v2.3 launch. Any third-party app
that ships an MCP server exposing the four interop tools below
becomes available as a navigation target from any other NAC3 host.

## Architecture

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

Three actors:

1. **Host** -- the app the user is currently driving (Yujin in
   the example).
2. **Peer** -- the foreign NAC-3 compliant app being imported
   (Excel in the example).
3. **MCP bridge** -- typically the host's agent process. It owns
   the bearer tokens for known peers and proxies invocations.
   The bridge does NOT impersonate the user against the peer; it
   uses its own credentials.

## MCP tool surface

Every NAC-3 compliant peer MUST expose these four tools at its
MCP endpoint:

### `nac.export_tree`

Inbound. Returns a self-describing payload that another app can
import.

**Input:**

```ts
{
  scope?: 'full' | 'active_plugin' | 'plugin_slug:<slug>',
  include_dom_state?: boolean,    // default false (privacy)
  include_locales?: string[],     // default all 10
  bearer: string                  // peer's per-tenant token
}
```

**Output:**

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

Inbound. Dispatch a NAC3 action on the peer.

**Input:**

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

**Output:**

```ts
{
  ok: boolean,
  result?: { row_id?: string, value?: unknown, ... },
  error?: { code: string, message: string }
}
```

The peer dispatches the action via its local `NAC.<kind>(...)`,
waits for the canonical ack event family with a 5s timeout, and
returns the outcome. The ack is ALSO broadcast on the SSE channel
so the host can correlate.

### `nac.subscribe_events`

Streaming (SSE). Pushes ack events from peer back to host.

**Input (query string):**

```
?bearer=<token>&plugins=<csv-of-plugin-slugs>&since=<iso8601>
```

**Output (each event):**

```
event: nac:action:succeeded
data: {"plugin":"excel","action_id":"excel.cell.A1","is_trusted":false,
       "result":{"value":100},"ts":"2026-05-10T18:30:01.234Z"}

event: nac:tab:activated
data: {"plugin":"excel","tab_id":"tab.sheet2",...}
```

The host's runtime relays these into its local document so an
agent that calls `NAC.click('remote:excel:cell.A1')` gets a
locally-resolved promise driven by the remote event.

### `nac.health`

Inbound, simple. Returns:

```ts
{ ok: true, nac_version: '2.3', app_id: 'excel-online',
  uptime_ms: 12345 }
```

Used by hosts to verify a peer is reachable before importing.

## Host-side runtime API

These three new functions live on `window.NAC` after v2.3 lands:

```ts
NAC.export_tree(opts?: {
  scope?: 'full' | 'active_plugin' | 'plugin_slug:<slug>',
  include_dom_state?: boolean,
  include_locales?: string[]
}): Promise<NACExportV1>
```

Returns the payload defined above. Pure-local read, no I/O.

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

Registers each manifest in `payload.manifests` under a namespaced
plugin slug:

- `payload.manifests.invoice` becomes
  `remote:<namespace>:invoice` in `NAC.describe()`.
- All nac_ids inside that manifest get prefixed with
  `remote:<namespace>:` when resolved by `NAC.click()` /
  `NAC.fill()` / etc.
- The runtime's element resolver checks the prefix first; if
  matched, it proxies the dispatch via the connection's
  transport instead of querying the DOM.

```ts
NAC.list_remote_apps(): RemoteHandle[]
NAC.disconnect_remote(remote_id: string): void
```

Inspection + cleanup. Disconnect tears down the SSE stream and
unregisters the namespaced plugins.

## Dispatch proxying

When `NAC.click(id)` is called and `id` starts with `remote:`:

1. Parse `remote:<namespace>:<peer_local_id>`.
2. Look up `_remotes[namespace]` -- the RemoteHandle stored on
   import.
3. POST `{ bearer, nac_id: peer_local_id, action: { kind:'click',
   args: {} } }` to `handle.endpoint + '/nac.invoke'`.
4. If `ok: true`, immediately resolve the local promise (the SSE
   stream also dispatches the local `nac:action:succeeded` so
   awaiters that don't have the promise still get notified).
5. If `ok: false`, reject with the peer's error code.

Other action kinds (`fill`, `tab`, `tab_by_label`, `dt_*`,
`edit_field`) follow the same pattern.

## Security model

### Trust boundaries

- The **bearer token** authenticates the host to the peer. It's
  issued by the peer's admin layer (its tenant management). The
  bridge stores it server-side; never exposed to the LLM
  intermediary's prompt.
- Per-action **HMAC** is optional but recommended for verbs the
  peer marks as sensitive (`delete`, `payment.*`, role grants).
  HMAC body = `bearer + nac_id + kind + sorted(args)`, hashed
  SHA-256.
- **Origin whitelist** -- the peer's MCP server checks the
  Origin header (or its MCP-transport equivalent) against a
  registered list. Hosts outside the list get HTTP 403.

### is_trusted forwarding

Every action dispatched through the proxy carries
`is_trusted: false` in its ack event detail. The peer's host code
MAY refuse the action for that reason:

```js
document.addEventListener('nac:action:succeeded', function (e) {
  if (e.detail.action_id === 'invoice.delete' && !e.detail.is_trusted) {
    console.warn('[security] refused synthetic delete via interop');
    e.preventDefault();
  }
});
```

### Token rotation

Bearer tokens are rotated server-side on the peer's normal session
cadence (e.g. 24h). The host detects 401 from the peer and re-pulls
a fresh token through the user's auth flow. Sessions that can't
re-authenticate disconnect cleanly.

## Sequence diagram (text)

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

## Non-goals (deferred)

- **Bidirectional interop where peer also imports host.** The
  v2.3 model is host -> peer one-way navigation. Cross-imports
  add reentrancy + cycle detection complexity; deferred to v2.4.
- **Multi-hop chains** (Yujin -> Excel -> Slack). Same
  complexity reason; v2.3 caps at one hop.
- **Streaming actions** (live cursor follow). Aspirational;
  needs WebRTC-shaped channel beyond what SSE delivers.

## Performance budget

- `nac.export_tree` round-trip: < 200 ms p95 over LAN.
- `nac.invoke` round-trip (excluding the peer's side-effect
  time): < 100 ms p95.
- `nac.subscribe_events` keepalive: heartbeat every 15s.

## Implementation files (this branch)

| File | Role |
|------|------|
| `yujin.app/nac-spec/js/nac-mcp-interop.js` | Host-side runtime: export_tree + import + proxy |
| `agent/mcp_interop.py` | MCP server tool implementations for Yujin as peer |
| `packages/nac/src/interop.ts` | TypeScript types + helpers |
| `yujin.app/nac-spec/example-v22-interop.php` | Live demo: two mini-apps side-by-side that import each other |
| `packages/nac/test/v23-interop.mjs` | Unit tests for export + import + proxy |
| `tools/nac/test-launch.sh` | Extended with layer 6 (interop) |

## Open questions before v2.3 GA

- Should the export payload be optionally signed with the peer's
  HMAC secret so the host can verify origin even when proxied
  through an untrusted bridge? (Probably yes; v2.3.1 candidate.)
- What's the canonical UI affordance for "remote app available"
  in a chat? An emoji? A pill? Per-app icon from manifest?
  (Spec sec 14 candidate.)
- Should `data_tables` from a peer be editable from the host's
  agent, or read-only by default? (Lean read-only; explicit opt-in
  for write.)
