---
translation_source: docs/NAC_INTEROP_MCP.md
translation_source_hash: 559b9c7f1d01da4f76e35b6e4f1fcb558f8f0bbca87f7cb4148738989b83b49c
translation_quality: machine_v1
translation_lang: hi
translation_date: 2026-05-11T15:28:31.781937+00:00
---

# NAC3 -- MCP के ज़रिए cross-app interop

**स्थिति:** v2.3 preview (branch `feat/nac-interop-mcp`, अभी main में merge नहीं हुआ)।
**Spec section:** जब यह feature preview से बाहर आएगा तब SPEC.md sec 11 में जोड़ा जाएगा।

## क्यों

NAC3 v1.9 + v2.0 + v2.1 + v2.2 यह standardise करते हैं कि एक AI agent *एक* web UI को कैसे चलाए। v2.3 इस contract को आगे बढ़ाता है -- यानी *कई* NAC3 apps आपस में कैसे interoperate करें।

इसके पीछे की user flow यह है:

> Pablo, Yujin CRM में chat में बोल रहा है। वह कहता है:
> *"Yujin, Excel पर जाओ।"*
>
> Yujin का chat client इसे एक interop intent के रूप में पहचानता है। वह उस Excel instance के खिलाफ `nac.export_tree` MCP tool को call करता है जो user ने खोला हुआ है, Excel का पूरा NAC3 tree (active workbook, current sheet, named ranges, ribbon buttons) वापस लाता है, और उसे `remote:excel:*` के अंतर्गत एक remote plugin के रूप में register करता है।
>
> अब Pablo कह सकता है *"cell A1 को 100 set करो"* और Yujin का intermediary `remote:excel:cell.A1` -> `NAC.fill('remote:excel:cell.A1', 100)` resolve करता है। Runtime `remote:` prefix detect करता है और dispatch को MCP के ज़रिए proxy करता है। Excel side effect perform करता है, अपना `nac:field:changed` ack emit करता है, SSE stream उसे Yujin के runtime तक पहुँचाती है, local promise resolve होती है। Pablo को Yujin के chat में दिखता है:
> *"Cell A1 को 100 set कर दिया।"*
>
> सबसे ज़रूरी बात: **agent को Excel का schema पहले से जानने की ज़रूरत नहीं थी**। export_tree call ने उसे ज़रूरत के वक्त manifest दे दिया।

यही **attachable products के commercial pool** की नींव है जिसकी घोषणा Yujin ने v2.3 launch पर की थी। कोई भी third-party app जो नीचे दिए चार interop tools expose करने वाला MCP server ship करती है, वह किसी भी NAC3 host से navigation target के रूप में उपलब्ध हो जाती है।

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

तीन actors:

1. **Host** -- वह app जिसे user अभी चला रहा है (उदाहरण में Yujin)।
2. **Peer** -- वह बाहरी NAC-3 compliant app जिसे import किया जा रहा है (उदाहरण में Excel)।
3. **MCP bridge** -- आमतौर पर host का agent process। यह known peers के bearer tokens रखता है और invocations को proxy करता है। Bridge, peer के खिलाफ user का रूप नहीं धारण करता; यह अपने खुद के credentials इस्तेमाल करता है।

## MCP tool surface

हर NAC-3 compliant peer को अपने MCP endpoint पर ये चार tools expose करने **ज़रूरी** हैं:

### `nac.export_tree`

Inbound। एक self-describing payload return करता है जिसे दूसरी app import कर सके।

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

Inbound। Peer पर एक NAC3 action dispatch करता है।

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

Peer, action को अपने local `NAC.<kind>(...)` के ज़रिए dispatch करता है, 5s timeout के साथ canonical ack event family का इंतज़ार करता है, और outcome return करता है। Ack, SSE channel पर भी broadcast होता है ताकि host correlate कर सके।

### `nac.subscribe_events`

Streaming (SSE)। Peer से host तक ack events push करता है।

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

Host का runtime इन्हें अपने local document में relay करता है ताकि जो agent `NAC.click('remote:excel:cell.A1')` call करे उसे locally-resolved promise मिले जो remote event से driven हो।

### `nac.health`

Inbound, सरल। Return करता है:

```ts
{ ok: true, nac_version: '2.3', app_id: 'excel-online',
  uptime_ms: 12345 }
```

Hosts इसका उपयोग import से पहले यह verify करने के लिए करते हैं कि peer reachable है।

## Host-side runtime API

v2.3 के बाद `window.NAC` पर ये तीन नए functions उपलब्ध होंगे:

```ts
NAC.export_tree(opts?: {
  scope?: 'full' | 'active_plugin' | 'plugin_slug:<slug>',
  include_dom_state?: boolean,
  include_locales?: string[]
}): Promise<NACExportV1>
```

ऊपर defined payload return करता है। पूरी तरह local read, कोई I/O नहीं।

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

`payload.manifests` में हर manifest को एक namespaced plugin slug के अंतर्गत register करता है:

- `payload.manifests.invoice`, `NAC.describe()` में `remote:<namespace>:invoice` बन जाता है।
- उस manifest के अंदर सभी nac_ids को `remote:<namespace>:` से prefix किया जाता है जब `NAC.click()` / `NAC.fill()` / आदि resolve करते हैं।
- Runtime का element resolver पहले prefix check करता है; अगर match हो, तो DOM query करने की बजाय connection के transport के ज़रिए dispatch proxy करता है।

```ts
NAC.list_remote_apps(): RemoteHandle[]
NAC.disconnect_remote(remote_id: string): void
```

Inspection और cleanup। Disconnect, SSE stream बंद करता है और namespaced plugins unregister करता है।

## Dispatch proxying

जब `NAC.click(id)` call होता है और `id`, `remote:` से शुरू होता है:

1. `remote:<namespace>:<peer_local_id>` parse करो।
2. `_remotes[namespace]` -- import पर store किया गया RemoteHandle -- lookup करो।
3. `{ bearer, nac_id: peer_local_id, action: { kind:'click', args: {} } }` को `handle.endpoint + '/nac.invoke'` पर POST करो।
4. अगर `ok: true` है, तो local promise तुरंत resolve करो (SSE stream local `nac:action:succeeded` भी dispatch करती है ताकि जिन awaiters के पास promise नहीं है उन्हें भी notify मिले)।
5. अगर `ok: false` है, तो peer के error code के साथ reject करो।

बाकी action kinds (`fill`, `tab`, `tab_by_label`, `dt_*`, `edit_field`) भी यही pattern follow करते हैं।

## Security model

### Trust boundaries

- **Bearer token** host को peer के साथ authenticate करता है। यह peer की admin layer (उसके tenant management) द्वारा जारी किया जाता है। Bridge इसे server-side store करता है; LLM intermediary के prompt में कभी expose नहीं होता।
- Per-action **HMAC** optional है लेकिन उन verbs के लिए recommended है जिन्हें peer sensitive mark करता है (`delete`, `payment.*`, role grants)। HMAC body = `bearer + nac_id + kind + sorted(args)`, SHA-256 hashed।
- **Origin whitelist** -- peer का MCP server, Origin header (या उसके MCP-transport equivalent) को एक registered list के खिलाफ check करता है। List से बाहर के hosts को HTTP 403 मिलता है।

### is_trusted forwarding

Proxy के ज़रिए dispatch हर action अपने ack event detail में `is_trusted: false` लेकर आता है। Peer का host code उस कारण से action refuse कर सकता है:

```js
document.addEventListener('nac:action:succeeded', function (e) {
  if (e.detail.action_id === 'invoice.delete' && !e.detail.is_trusted) {
    console.warn('[security] refused synthetic delete via interop');
    e.preventDefault();
  }
});
```

### Token rotation

Bearer tokens, peer के normal session cadence (जैसे 24h) पर server-side rotate होते हैं। Host, peer से 401 detect करता है और user के auth flow के ज़रिए fresh token re-pull करता है। जो sessions re-authenticate नहीं कर पातीं वे cleanly disconnect हो जाती हैं।

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

## Non-goals (टाले गए)

- **Bidirectional interop जहाँ peer भी host को import करे।** v2.3 model, host -> peer एकतरफा navigation है। Cross-imports में reentrancy और cycle detection की जटिलता आती है; v2.4 तक टाला गया।
- **Multi-hop chains** (Yujin -> Excel -> Slack)। उसी जटिलता के कारण; v2.3 एक hop तक सीमित है।
- **Streaming actions** (live cursor follow)। Aspirational; SSE से परे WebRTC-shaped channel की ज़रूरत है।

## Performance budget

- `nac.export_tree` round-trip: LAN पर p95 < 200 ms।
- `nac.invoke` round-trip (peer के side-effect time को छोड़कर): p95 < 100 ms।
- `nac.subscribe_events` keepalive: हर 15s पर heartbeat।

## Implementation files (यह branch)

| File | Role |
|------|------|
| `yujin.app/nac-spec/js/nac-mcp-interop.js` | Host-side runtime: export_tree + import + proxy |
| `agent/mcp_interop.py` | Yujin को peer के रूप में MCP server tool implementations |
| `packages/nac/src/interop.ts` | TypeScript types + helpers |
| `yujin.app/nac-spec/example-v22-interop.php` | Live demo: दो mini-apps side-by-side जो एक-दूसरे को import करते हैं |
| `packages/nac/test/v23-interop.mjs` | export + import + proxy के लिए unit tests |
| `tools/nac/test-launch.sh` | Layer 6 (interop) के साथ extended |

## v2.3 GA से पहले open questions

- क्या export payload को peer के HMAC secret से optionally sign किया जाना चाहिए ताकि host untrusted bridge के ज़रिए proxy होने पर भी origin verify कर सके? (शायद हाँ; v2.3.1 candidate।)
- Chat में "remote app available" के लिए canonical UI affordance क्या होगा? Emoji? Pill? Manifest से per-app icon? (Spec sec 14 candidate।)
- क्या peer के `data_tables` host के agent से editable होने चाहिए, या default रूप से read-only? (Read-only की ओर झुकाव; write के लिए explicit opt-in।)

---

*This is a machine translation of the canonical English
version at `/nac-spec/docs/NAC_INTEROP_MCP.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
