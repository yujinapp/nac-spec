---
translation_source: docs/NAC_INTEROP_MCP.md
translation_source_hash: 559b9c7f1d01da4f76e35b6e4f1fcb558f8f0bbca87f7cb4148738989b83b49c
translation_quality: machine_v1
translation_lang: it
translation_date: 2026-05-11T14:28:18.878368+00:00
---

# NAC3 -- interoperabilità cross-app via MCP

**Stato:** anteprima v2.3 (branch `feat/nac-interop-mcp`, non ancora
unito a main).
**Sezione spec:** da inserire come sezione 11 di SPEC.md quando la funzionalità
uscirà dall'anteprima.

## Perché

NAC3 v1.9 + v2.0 + v2.1 + v2.2 standardizzano come *una singola* UI web viene
gestita da un agente AI. La v2.3 estende il contratto a come *più*
app NAC3 interoperano tra loro.

Il flusso utente che ha motivato questa scelta:

> Pablo è in Yujin CRM e sta dettando nella chat. Dice:
> *"Yujin, passa a Excel."*
>
> Il client chat di Yujin riconosce questo come un intento di interop. Chiama
> il tool MCP `nac.export_tree` sull'istanza di Excel aperta dall'utente,
> recupera l'intero albero NAC3 di Excel (cartella di lavoro attiva, foglio
> corrente, intervalli denominati, pulsanti della barra multifunzione) e lo
> registra come plugin remoto sotto `remote:excel:*`.
>
> Ora Pablo può dire *"imposta la cella A1 a 100"* e l'intermediario di Yujin
> risolve `remote:excel:cell.A1` -> `NAC.fill('remote:excel:cell.A1', 100)`.
> Il runtime rileva il prefisso `remote:` e instrada il dispatch via MCP.
> Excel esegue l'effetto collaterale, emette il suo ack `nac:field:changed`,
> lo stream SSE lo riporta al runtime di Yujin, la promise locale si risolve.
> Pablo vede nella chat di Yujin: *"Cella A1 impostata a 100."*
>
> La cosa fondamentale è che **l'agente non aveva bisogno di conoscere lo
> schema di Excel in anticipo**. La chiamata a export_tree gli ha fornito
> il manifest nel momento del bisogno.

Questa è la base del **pool commerciale di prodotti collegabili**
annunciato da Yujin al lancio della v2.3. Qualsiasi app di terze parti
che distribuisce un server MCP esponendo i quattro tool di interop descritti
di seguito diventa disponibile come destinazione di navigazione da qualsiasi
altro host NAC3.

## Architettura

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

Tre attori:

1. **Host** -- l'app che l'utente sta attualmente utilizzando (Yujin
   nell'esempio).
2. **Peer** -- l'app esterna conforme a NAC-3 che viene importata
   (Excel nell'esempio).
3. **MCP bridge** -- tipicamente il processo agente dell'host. Gestisce
   i bearer token per i peer noti e instrada le invocazioni.
   Il bridge NON impersona l'utente presso il peer; utilizza le proprie
   credenziali.

## Superficie dei tool MCP

Ogni peer conforme a NAC-3 DEVE esporre questi quattro tool al proprio
endpoint MCP:

### `nac.export_tree`

In ingresso. Restituisce un payload auto-descrittivo che un'altra app può
importare.

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

In ingresso. Esegue il dispatch di un'azione NAC3 sul peer.

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

Il peer esegue il dispatch dell'azione tramite il proprio `NAC.<kind>(...)` locale,
attende la famiglia di eventi ack canonici con un timeout di 5s e
restituisce l'esito. L'ack viene ANCHE trasmesso sul canale SSE
affinché l'host possa correlare.

### `nac.subscribe_events`

Streaming (SSE). Invia gli eventi ack dal peer all'host.

**Input (query string):**

```
?bearer=<token>&plugins=<csv-of-plugin-slugs>&since=<iso8601>
```

**Output (ogni evento):**

```
event: nac:action:succeeded
data: {"plugin":"excel","action_id":"excel.cell.A1","is_trusted":false,
       "result":{"value":100},"ts":"2026-05-10T18:30:01.234Z"}

event: nac:tab:activated
data: {"plugin":"excel","tab_id":"tab.sheet2",...}
```

Il runtime dell'host inoltra questi eventi nel proprio documento locale, così
un agente che chiama `NAC.click('remote:excel:cell.A1')` ottiene una
promise risolta localmente, guidata dall'evento remoto.

### `nac.health`

In ingresso, semplice. Restituisce:

```ts
{ ok: true, nac_version: '2.3', app_id: 'excel-online',
  uptime_ms: 12345 }
```

Usato dagli host per verificare che un peer sia raggiungibile prima di importarlo.

## API runtime lato host

Queste tre nuove funzioni sono disponibili su `window.NAC` a partire dalla v2.3:

```ts
NAC.export_tree(opts?: {
  scope?: 'full' | 'active_plugin' | 'plugin_slug:<slug>',
  include_dom_state?: boolean,
  include_locales?: string[]
}): Promise<NACExportV1>
```

Restituisce il payload definito sopra. Lettura puramente locale, nessun I/O.

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

Registra ogni manifest in `payload.manifests` sotto uno slug di plugin
con namespace:

- `payload.manifests.invoice` diventa
  `remote:<namespace>:invoice` in `NAC.describe()`.
- Tutti i nac_id all'interno di quel manifest vengono prefissati con
  `remote:<namespace>:` quando risolti da `NAC.click()` /
  `NAC.fill()` / ecc.
- Il resolver di elementi del runtime controlla prima il prefisso; se
  corrisponde, instrada il dispatch tramite il transport della connessione
  invece di interrogare il DOM.

```ts
NAC.list_remote_apps(): RemoteHandle[]
NAC.disconnect_remote(remote_id: string): void
```

Ispezione e pulizia. La disconnessione chiude lo stream SSE e
annulla la registrazione dei plugin con namespace.

## Proxying del dispatch

Quando `NAC.click(id)` viene chiamato e `id` inizia con `remote:`:

1. Analizza `remote:<namespace>:<peer_local_id>`.
2. Cerca `_remotes[namespace]` -- il RemoteHandle memorizzato
   all'importazione.
3. Invia via POST `{ bearer, nac_id: peer_local_id, action: { kind:'click',
   args: {} } }` a `handle.endpoint + '/nac.invoke'`.
4. Se `ok: true`, risolve immediatamente la promise locale (lo stream SSE
   esegue anche il dispatch locale di `nac:action:succeeded`, così i
   listener che non hanno la promise vengono comunque notificati).
5. Se `ok: false`, rigetta con il codice di errore del peer.

Gli altri tipi di azione (`fill`, `tab`, `tab_by_label`, `dt_*`,
`edit_field`) seguono lo stesso schema.

## Modello di sicurezza

### Confini di fiducia

- Il **bearer token** autentica l'host presso il peer. Viene
  emesso dal layer di amministrazione del peer (la sua gestione tenant). Il
  bridge lo conserva lato server; non viene mai esposto al prompt
  dell'intermediario LLM.
- L'**HMAC** per singola azione è opzionale ma consigliato per i verbi
  che il peer contrassegna come sensibili (`delete`, `payment.*`, assegnazione
  di ruoli). Corpo HMAC = `bearer + nac_id + kind + sorted(args)`, hash
  SHA-256.
- **Whitelist degli origin** -- il server MCP del peer verifica l'header
  Origin (o il suo equivalente nel transport MCP) rispetto a un elenco
  registrato. Gli host non presenti nell'elenco ricevono HTTP 403.

### Propagazione di is_trusted

Ogni azione dispatchata tramite il proxy porta
`is_trusted: false` nel dettaglio dell'evento ack. Il codice host del peer
PUÒ rifiutare l'azione per questo motivo:

```js
document.addEventListener('nac:action:succeeded', function (e) {
  if (e.detail.action_id === 'invoice.delete' && !e.detail.is_trusted) {
    console.warn('[security] refused synthetic delete via interop');
    e.preventDefault();
  }
});
```

### Rotazione dei token

I bearer token vengono ruotati lato server secondo la normale cadenza di
sessione del peer (es. 24h). L'host rileva un 401 dal peer e recupera
un token aggiornato tramite il flusso di autenticazione dell'utente. Le
sessioni che non riescono a ri-autenticarsi si disconnettono in modo pulito.

## Diagramma di sequenza (testo)

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

## Non-goal (rimandati)

- **Interop bidirezionale in cui il peer importa anche l'host.** Il
  modello v2.3 prevede navigazione monodirezionale host -> peer. Le
  importazioni incrociate aggiungono complessità di rientranza e rilevamento
  dei cicli; rimandato alla v2.4.
- **Catene multi-hop** (Yujin -> Excel -> Slack). Stessa
  ragione di complessità; la v2.3 limita a un solo hop.
- **Azioni in streaming** (cursore live condiviso). Aspirazionale;
  richiede un canale di tipo WebRTC che va oltre ciò che SSE offre.

## Budget di performance

- Round-trip `nac.export_tree`: < 200 ms p95 su LAN.
- Round-trip `nac.invoke` (escluso il tempo dell'effetto collaterale
  lato peer): < 100 ms p95.
- Keepalive `nac.subscribe_events`: heartbeat ogni 15s.

## File di implementazione (questo branch)

| File | Ruolo |
|------|-------|
| `yujin.app/nac-spec/js/nac-mcp-interop.js` | Runtime lato host: export_tree + import + proxy |
| `agent/mcp_interop.py` | Implementazioni dei tool server MCP per Yujin come peer |
| `packages/nac/src/interop.ts` | Tipi TypeScript + helper |
| `yujin.app/nac-spec/example-v22-interop.php` | Demo live: due mini-app affiancate che si importano a vicenda |
| `packages/nac/test/v23-interop.mjs` | Unit test per export + import + proxy |
| `tools/nac/test-launch.sh` | Esteso con il layer 6 (interop) |

## Domande aperte prima della GA della v2.3

- Il payload di export dovrebbe essere opzionalmente firmato con il segreto
  HMAC del peer, così l'host può verificare l'origine anche quando viene
  instradato attraverso un bridge non fidato? (Probabilmente sì; candidato
  per la v2.3.1.)
- Qual è l'affordance UI canonica per "app remota disponibile"
  in una chat? Un'emoji? Una pill? Un'icona per app dal manifest?
  (Candidato per la sezione 14 della spec.)
- I `data_tables` di un peer dovrebbero essere modificabili dall'agente
  dell'host, o in sola lettura per impostazione predefinita? (Orientamento
  verso sola lettura; opt-in esplicito per la scrittura.)

---

*This is a machine translation of the canonical English
version at `/nac-spec/docs/NAC_INTEROP_MCP.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
