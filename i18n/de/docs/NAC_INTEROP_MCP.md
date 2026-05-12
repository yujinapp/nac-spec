---
translation_source: docs/NAC_INTEROP_MCP.md
translation_source_hash: 559b9c7f1d01da4f76e35b6e4f1fcb558f8f0bbca87f7cb4148738989b83b49c
translation_quality: machine_v1
translation_lang: de
translation_date: 2026-05-11T14:42:26.696043+00:00
---

# NAC3 -- App-übergreifende Interoperabilität via MCP

**Status:** v2.3 Vorschau (Branch `feat/nac-interop-mcp`, noch nicht in main gemergt).
**Spec-Abschnitt:** Wird als SPEC.md Abschnitt 11 eingefügt, sobald das Feature den Vorschaustatus verlässt.

## Hintergrund

NAC3 v1.9 + v2.0 + v2.1 + v2.2 standardisieren, wie *eine* Web-UI von einem KI-Agenten gesteuert wird. v2.3 erweitert den Vertrag auf die Interoperabilität *mehrerer* NAC3-Apps.

Der motivierende Anwendungsfall:

> Pablo arbeitet in Yujin CRM und diktiert in den Chat. Er sagt:
> *„Yujin, wechsel zu Excel."*
>
> Yujins Chat-Client erkennt dies als Interop-Intent. Er ruft das MCP-Tool `nac.export_tree` gegen die Excel-Instanz auf, die der Nutzer geöffnet hat, holt Excels vollständigen NAC3-Baum zurück (aktive Arbeitsmappe, aktuelles Tabellenblatt, benannte Bereiche, Ribbon-Schaltflächen) und registriert ihn als Remote-Plugin unter `remote:excel:*`.
>
> Jetzt kann Pablo sagen *„setze Zelle A1 auf 100"*, und Yujins Vermittler löst `remote:excel:cell.A1` -> `NAC.fill('remote:excel:cell.A1', 100)` auf. Die Laufzeitumgebung erkennt das Präfix `remote:` und leitet den Dispatch via MCP weiter. Excel führt den Seiteneffekt aus, sendet sein `nac:field:changed`-Ack, der SSE-Stream leitet es zurück an Yujins Laufzeitumgebung, das lokale Promise löst sich auf. Pablo sieht im Yujin-Chat: *„Zelle A1 auf 100 gesetzt."*
>
> Entscheidend: **Der Agent musste Excels Schema nicht im Voraus kennen**. Der export_tree-Aufruf lieferte ihm das Manifest genau zum Zeitpunkt des Bedarfs.

Dies ist die Grundlage des **kommerziellen Pools anschließbarer Produkte**, den Yujin beim Launch von v2.3 angekündigt hat. Jede Drittanbieter-App, die einen MCP-Server mit den vier unten beschriebenen Interop-Tools ausliefert, wird als Navigationsziel von jedem anderen NAC3-Host aus verfügbar.

## Architektur

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

Drei Akteure:

1. **Host** -- die App, die der Nutzer gerade bedient (im Beispiel Yujin).
2. **Peer** -- die fremde NAC-3-konforme App, die importiert wird (im Beispiel Excel).
3. **MCP bridge** -- typischerweise der Agentenprozess des Hosts. Er verwaltet die Bearer-Tokens für bekannte Peers und leitet Aufrufe weiter. Die Bridge gibt sich gegenüber dem Peer NICHT als Nutzer aus; sie verwendet eigene Anmeldedaten.

## MCP-Tool-Oberfläche

Jeder NAC-3-konforme Peer MUSS diese vier Tools an seinem MCP-Endpunkt bereitstellen:

### `nac.export_tree`

Eingehend. Gibt eine selbstbeschreibende Nutzlast zurück, die eine andere App importieren kann.

**Eingabe:**

```ts
{
  scope?: 'full' | 'active_plugin' | 'plugin_slug:<slug>',
  include_dom_state?: boolean,    // default false (privacy)
  include_locales?: string[],     // default all 10
  bearer: string                  // peer's per-tenant token
}
```

**Ausgabe:**

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

Eingehend. Führt eine NAC3-Aktion auf dem Peer aus.

**Eingabe:**

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

**Ausgabe:**

```ts
{
  ok: boolean,
  result?: { row_id?: string, value?: unknown, ... },
  error?: { code: string, message: string }
}
```

Der Peer leitet die Aktion über sein lokales `NAC.<kind>(...)` weiter, wartet mit einem Timeout von 5 Sekunden auf die kanonische Ack-Event-Familie und gibt das Ergebnis zurück. Das Ack wird AUCH auf dem SSE-Kanal gesendet, damit der Host es zuordnen kann.

### `nac.subscribe_events`

Streaming (SSE). Überträgt Ack-Events vom Peer zurück an den Host.

**Eingabe (Query-String):**

```
?bearer=<token>&plugins=<csv-of-plugin-slugs>&since=<iso8601>
```

**Ausgabe (je Event):**

```
event: nac:action:succeeded
data: {"plugin":"excel","action_id":"excel.cell.A1","is_trusted":false,
       "result":{"value":100},"ts":"2026-05-10T18:30:01.234Z"}

event: nac:tab:activated
data: {"plugin":"excel","tab_id":"tab.sheet2",...}
```

Die Laufzeitumgebung des Hosts leitet diese Events in ihr lokales Dokument weiter, sodass ein Agent, der `NAC.click('remote:excel:cell.A1')` aufruft, ein lokal aufgelöstes Promise erhält, das durch das Remote-Event gesteuert wird.

### `nac.health`

Eingehend, einfach. Gibt zurück:

```ts
{ ok: true, nac_version: '2.3', app_id: 'excel-online',
  uptime_ms: 12345 }
```

Wird von Hosts verwendet, um die Erreichbarkeit eines Peers vor dem Import zu prüfen.

## Host-seitige Laufzeit-API

Diese drei neuen Funktionen stehen nach dem v2.3-Release auf `window.NAC` zur Verfügung:

```ts
NAC.export_tree(opts?: {
  scope?: 'full' | 'active_plugin' | 'plugin_slug:<slug>',
  include_dom_state?: boolean,
  include_locales?: string[]
}): Promise<NACExportV1>
```

Gibt die oben definierte Nutzlast zurück. Rein lokaler Lesevorgang, kein I/O.

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

Registriert jedes Manifest in `payload.manifests` unter einem namespaced Plugin-Slug:

- `payload.manifests.invoice` wird zu `remote:<namespace>:invoice` in `NAC.describe()`.
- Alle nac_ids innerhalb dieses Manifests erhalten das Präfix `remote:<namespace>:`, wenn sie von `NAC.click()` / `NAC.fill()` / etc. aufgelöst werden.
- Der Element-Resolver der Laufzeitumgebung prüft das Präfix zuerst; bei Übereinstimmung leitet er den Dispatch über den Transport der Verbindung weiter, anstatt das DOM abzufragen.

```ts
NAC.list_remote_apps(): RemoteHandle[]
NAC.disconnect_remote(remote_id: string): void
```

Inspektion und Aufräumen. Disconnect beendet den SSE-Stream und hebt die Registrierung der namespaced Plugins auf.

## Dispatch-Weiterleitung

Wenn `NAC.click(id)` aufgerufen wird und `id` mit `remote:` beginnt:

1. Parse `remote:<namespace>:<peer_local_id>`.
2. Schlage `_remotes[namespace]` nach -- das beim Import gespeicherte RemoteHandle.
3. POST `{ bearer, nac_id: peer_local_id, action: { kind:'click', args: {} } }` an `handle.endpoint + '/nac.invoke'`.
4. Bei `ok: true` wird das lokale Promise sofort aufgelöst (der SSE-Stream sendet auch das lokale `nac:action:succeeded`, sodass Awaiter ohne das Promise trotzdem benachrichtigt werden).
5. Bei `ok: false` wird mit dem Fehlercode des Peers abgelehnt.

Andere Aktionsarten (`fill`, `tab`, `tab_by_label`, `dt_*`, `edit_field`) folgen demselben Muster.

## Sicherheitsmodell

### Vertrauensgrenzen

- Das **Bearer-Token** authentifiziert den Host gegenüber dem Peer. Es wird von der Admin-Schicht des Peers (dessen Tenant-Verwaltung) ausgestellt. Die Bridge speichert es serverseitig; es wird nie dem Prompt des LLM-Vermittlers ausgesetzt.
- Das **HMAC** pro Aktion ist optional, wird aber für Verben empfohlen, die der Peer als sensibel markiert (`delete`, `payment.*`, Rollenvergaben). HMAC-Body = `bearer + nac_id + kind + sorted(args)`, gehasht mit SHA-256.
- **Origin-Whitelist** -- der MCP-Server des Peers prüft den Origin-Header (oder das MCP-Transport-Äquivalent) gegen eine registrierte Liste. Hosts außerhalb der Liste erhalten HTTP 403.

### Weiterleitung von is_trusted

Jede über den Proxy gesendete Aktion trägt `is_trusted: false` im Detail des Ack-Events. Der Host-Code des Peers KANN die Aktion aus diesem Grund ablehnen:

```js
document.addEventListener('nac:action:succeeded', function (e) {
  if (e.detail.action_id === 'invoice.delete' && !e.detail.is_trusted) {
    console.warn('[security] refused synthetic delete via interop');
    e.preventDefault();
  }
});
```

### Token-Rotation

Bearer-Tokens werden serverseitig im normalen Session-Rhythmus des Peers rotiert (z. B. alle 24 Stunden). Der Host erkennt eine 401-Antwort vom Peer und holt sich über den Auth-Flow des Nutzers ein neues Token. Sessions, die sich nicht erneut authentifizieren können, werden sauber getrennt.

## Sequenzdiagramm (Text)

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

## Nicht-Ziele (zurückgestellt)

- **Bidirektionale Interoperabilität, bei der der Peer auch den Host importiert.** Das v2.3-Modell ist eine Einwegnavigation Host -> Peer. Gegenseitige Imports erhöhen die Komplexität durch Reentranz und Zykluserkennung; auf v2.4 verschoben.
- **Multi-Hop-Ketten** (Yujin -> Excel -> Slack). Gleicher Komplexitätsgrund; v2.3 begrenzt auf einen Hop.
- **Streaming-Aktionen** (Live-Cursor-Verfolgung). Aspirativ; erfordert einen WebRTC-artigen Kanal, der über SSE hinausgeht.

## Performance-Budget

- `nac.export_tree` Round-Trip: < 200 ms p95 über LAN.
- `nac.invoke` Round-Trip (ohne die Seiteneffektzeit des Peers): < 100 ms p95.
- `nac.subscribe_events` Keepalive: Heartbeat alle 15 Sekunden.

## Implementierungsdateien (dieser Branch)

| Datei | Rolle |
|-------|-------|
| `yujin.app/nac-spec/js/nac-mcp-interop.js` | Host-seitige Laufzeitumgebung: export_tree + import + proxy |
| `agent/mcp_interop.py` | MCP-Server-Tool-Implementierungen für Yujin als Peer |
| `packages/nac/src/interop.ts` | TypeScript-Typen und Hilfsfunktionen |
| `yujin.app/nac-spec/example-v22-interop.php` | Live-Demo: zwei Mini-Apps nebeneinander, die sich gegenseitig importieren |
| `packages/nac/test/v23-interop.mjs` | Unit-Tests für export + import + proxy |
| `tools/nac/test-launch.sh` | Erweitert um Schicht 6 (Interop) |

## Offene Fragen vor v2.3 GA

- Sollte die Export-Nutzlast optional mit dem HMAC-Secret des Peers signiert werden, damit der Host den Ursprung auch bei Weiterleitung über eine nicht vertrauenswürdige Bridge verifizieren kann? (Wahrscheinlich ja; Kandidat für v2.3.1.)
- Was ist die kanonische UI-Darstellung für „Remote-App verfügbar" in einem Chat? Ein Emoji? Ein Pill-Element? Ein App-spezifisches Icon aus dem Manifest? (Kandidat für Spec-Abschnitt 14.)
- Sollten `data_tables` eines Peers vom Agenten des Hosts bearbeitbar oder standardmäßig schreibgeschützt sein? (Tendenz: schreibgeschützt; explizites Opt-in für Schreibzugriff.)

---

*This is a machine translation of the canonical English
version at `/nac-spec/docs/NAC_INTEROP_MCP.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
