---
translation_source: docs/NAC_INTEROP_MCP.md
translation_source_hash: 559b9c7f1d01da4f76e35b6e4f1fcb558f8f0bbca87f7cb4148738989b83b49c
translation_quality: machine_v1
translation_lang: pt
translation_date: 2026-05-11T13:36:23.017833+00:00
---

# NAC3 -- interoperabilidade entre apps via MCP

**Status:** prévia v2.3 (branch `feat/nac-interop-mcp`, ainda não
mesclada na main).
**Seção da spec:** a ser inserida como seção 11 do SPEC.md quando o
recurso sair da prévia.

## Por que

NAC3 v1.9 + v2.0 + v2.1 + v2.2 padronizam como *uma* UI web é
controlada por um agente de IA. A v2.3 estende o contrato para como
*múltiplos* apps NAC3 interoperam entre si.

O fluxo de usuário que motivou isso:

> Pablo está no Yujin CRM ditando para o chat. Ele diz:
> *"Yujin, vai para o Excel."*
>
> O cliente de chat do Yujin reconhece isso como uma intenção de
> interoperabilidade. Ele chama a ferramenta MCP `nac.export_tree`
> contra a instância do Excel que o usuário tem aberta, obtém a
> árvore NAC3 completa do Excel (pasta de trabalho ativa, planilha
> atual, intervalos nomeados, botões da faixa de opções) e a
> registra como plugin remoto sob `remote:excel:*`.
>
> Agora Pablo pode dizer *"coloca 100 na célula A1"* e o intermediário
> do Yujin resolve `remote:excel:cell.A1` -> `NAC.fill('remote:excel:cell.A1',
> 100)`. O runtime detecta o prefixo `remote:` e faz o proxy do
> dispatch via MCP. O Excel executa o efeito colateral, emite seu
> ack `nac:field:changed`, o stream SSE repassa para o runtime do
> Yujin, a promise local é resolvida. Pablo vê no chat do Yujin:
> *"Célula A1 definida como 100."*
>
> O ponto crucial: **o agente não precisou conhecer o schema do Excel
> com antecedência**. A chamada export_tree forneceu o manifesto no
> momento em que foi necessário.

Essa é a base do **pool comercial de produtos conectáveis** que o
Yujin anunciou no lançamento da v2.3. Qualquer app de terceiros que
disponibilize um servidor MCP expondo as quatro ferramentas de
interoperabilidade abaixo passa a estar disponível como destino de
navegação a partir de qualquer outro host NAC3.

## Arquitetura

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

Três atores:

1. **Host** -- o app que o usuário está controlando no momento (Yujin
   no exemplo).
2. **Peer** -- o app externo compatível com NAC-3 sendo importado
   (Excel no exemplo).
3. **MCP bridge** -- tipicamente o processo do agente do host. Ele
   detém os bearer tokens dos peers conhecidos e faz proxy das
   invocações. A bridge NÃO se passa pelo usuário junto ao peer;
   ela usa suas próprias credenciais.

## Superfície de ferramentas MCP

Todo peer compatível com NAC-3 DEVE expor estas quatro ferramentas
em seu endpoint MCP:

### `nac.export_tree`

Entrada. Retorna um payload autodescritivo que outro app pode
importar.

**Input:**

```ts
{
  scope?: 'full' | 'active_plugin' | 'plugin_slug:<slug>',
  include_dom_state?: boolean,    // default false (privacidade)
  include_locales?: string[],     // default todos os 10
  bearer: string                  // token por tenant do peer
}
```

**Output:**

```ts
{
  app_id: string,                 // 'yujin-crm', 'excel-online', etc.
  app_version: string,            // semver do app, NÃO do NAC
  nac_version: '2.3',
  exported_at: string,            // ISO8601
  active_plugin: string | null,
  manifests: Record<string, Manifest>,   // por plugin_slug
  scope_tree: ScopeNode[],
  data_tables: DataTableSnap[],   // v2.1 sec 18
  state: {
    url?: string,
    title?: string,
    user_lang: string,
    tenant_id?: string
  },
  ack_endpoint: string            // URL SSE para subscribe_events
}
```

### `nac.invoke`

Entrada. Despacha uma ação NAC3 no peer.

**Input:**

```ts
{
  bearer: string,
  nac_id: string,                 // id local do peer, SEM prefixo
  action: {
    kind: 'click' | 'click_by_verb' | 'fill' | 'select'
        | 'tab' | 'tab_by_label' | 'go_to_section'
        | 'dt_add_row' | 'dt_edit_cell' | 'dt_remove_row'
        | 'dt_commit' | 'dt_discard'
        | 'edit_field',
    args: Record<string, unknown>   // formato depende do kind
  },
  hmac?: string                   // HMAC-SHA256 do body (opcional)
                                  // para verbos sensíveis
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

O peer despacha a ação via seu `NAC.<kind>(...)` local, aguarda a
família canônica de eventos ack com timeout de 5s e retorna o
resultado. O ack também é transmitido no canal SSE para que o host
possa correlacionar.

### `nac.subscribe_events`

Streaming (SSE). Envia eventos ack do peer de volta ao host.

**Input (query string):**

```
?bearer=<token>&plugins=<csv-of-plugin-slugs>&since=<iso8601>
```

**Output (cada evento):**

```
event: nac:action:succeeded
data: {"plugin":"excel","action_id":"excel.cell.A1","is_trusted":false,
       "result":{"value":100},"ts":"2026-05-10T18:30:01.234Z"}

event: nac:tab:activated
data: {"plugin":"excel","tab_id":"tab.sheet2",...}
```

O runtime do host repassa esses eventos para seu documento local,
de modo que um agente que chame `NAC.click('remote:excel:cell.A1')`
obtenha uma promise resolvida localmente, acionada pelo evento remoto.

### `nac.health`

Entrada, simples. Retorna:

```ts
{ ok: true, nac_version: '2.3', app_id: 'excel-online',
  uptime_ms: 12345 }
```

Usado pelos hosts para verificar se um peer está acessível antes de
importar.

## API do runtime no lado do host

Estas três novas funções ficam disponíveis em `window.NAC` após a
chegada da v2.3:

```ts
NAC.export_tree(opts?: {
  scope?: 'full' | 'active_plugin' | 'plugin_slug:<slug>',
  include_dom_state?: boolean,
  include_locales?: string[]
}): Promise<NACExportV1>
```

Retorna o payload definido acima. Leitura puramente local, sem I/O.

```ts
NAC.import_remote_tree(
  payload: NACExportV1,
  conn: {
    transport: 'http' | 'stdio',
    endpoint: string,            // URL para http, comando para stdio
    bearer: string,
    namespace?: string,          // padrão: payload.app_id
    auto_subscribe?: boolean     // padrão: true
  }
): RemoteHandle
```

Registra cada manifesto em `payload.manifests` sob um plugin slug
com namespace:

- `payload.manifests.invoice` passa a ser
  `remote:<namespace>:invoice` em `NAC.describe()`.
- Todos os nac_ids dentro desse manifesto recebem o prefixo
  `remote:<namespace>:` quando resolvidos por `NAC.click()` /
  `NAC.fill()` / etc.
- O resolvedor de elementos do runtime verifica o prefixo primeiro;
  se houver correspondência, faz proxy do dispatch via o transport
  da conexão em vez de consultar o DOM.

```ts
NAC.list_remote_apps(): RemoteHandle[]
NAC.disconnect_remote(remote_id: string): void
```

Inspeção e limpeza. Disconnect encerra o stream SSE e cancela o
registro dos plugins com namespace.

## Proxy de dispatch

Quando `NAC.click(id)` é chamado e `id` começa com `remote:`:

1. Faz parse de `remote:<namespace>:<peer_local_id>`.
2. Busca `_remotes[namespace]` -- o RemoteHandle armazenado na
   importação.
3. Faz POST `{ bearer, nac_id: peer_local_id, action: { kind:'click',
   args: {} } }` para `handle.endpoint + '/nac.invoke'`.
4. Se `ok: true`, resolve imediatamente a promise local (o stream SSE
   também despacha o `nac:action:succeeded` local para que awaiters
   que não têm a promise ainda sejam notificados).
5. Se `ok: false`, rejeita com o código de erro do peer.

Os demais tipos de ação (`fill`, `tab`, `tab_by_label`, `dt_*`,
`edit_field`) seguem o mesmo padrão.

## Modelo de segurança

### Limites de confiança

- O **bearer token** autentica o host junto ao peer. Ele é emitido
  pela camada de administração do peer (seu gerenciamento de tenant).
  A bridge o armazena no lado do servidor; nunca é exposto ao prompt
  do intermediário LLM.
- O **HMAC** por ação é opcional, mas recomendado para verbos que o
  peer marca como sensíveis (`delete`, `payment.*`, concessões de
  papel). Corpo do HMAC = `bearer + nac_id + kind + sorted(args)`,
  hash SHA-256.
- **Whitelist de origem** -- o servidor MCP do peer verifica o header
  Origin (ou seu equivalente no transport MCP) contra uma lista
  registrada. Hosts fora da lista recebem HTTP 403.

### Encaminhamento de is_trusted

Toda ação despachada pelo proxy carrega `is_trusted: false` no
detalhe do evento ack. O código host do peer PODE recusar a ação
por esse motivo:

```js
document.addEventListener('nac:action:succeeded', function (e) {
  if (e.detail.action_id === 'invoice.delete' && !e.detail.is_trusted) {
    console.warn('[security] refused synthetic delete via interop');
    e.preventDefault();
  }
});
```

### Rotação de tokens

Os bearer tokens são rotacionados no lado do servidor conforme a
cadência normal de sessão do peer (ex.: 24h). O host detecta um 401
vindo do peer e obtém um novo token pelo fluxo de autenticação do
usuário. Sessões que não conseguem reautenticar são desconectadas
de forma limpa.

## Diagrama de sequência (texto)

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

## Não-objetivos (adiados)

- **Interoperabilidade bidirecional onde o peer também importa o
  host.** O modelo da v2.3 é navegação unidirecional host -> peer.
  Importações cruzadas adicionam complexidade de reentrância e
  detecção de ciclos; adiado para a v2.4.
- **Cadeias multi-hop** (Yujin -> Excel -> Slack). Mesma razão de
  complexidade; a v2.3 limita a um único hop.
- **Ações em streaming** (acompanhamento de cursor ao vivo).
  Aspiracional; requer um canal no estilo WebRTC além do que o SSE
  oferece.

## Orçamento de performance

- Round-trip de `nac.export_tree`: < 200 ms p95 em LAN.
- Round-trip de `nac.invoke` (excluindo o tempo do efeito colateral
  no peer): < 100 ms p95.
- Keepalive de `nac.subscribe_events`: heartbeat a cada 15s.

## Arquivos de implementação (esta branch)

| Arquivo | Função |
|---------|--------|
| `yujin.app/nac-spec/js/nac-mcp-interop.js` | Runtime do lado do host: export_tree + import + proxy |
| `agent/mcp_interop.py` | Implementações das ferramentas do servidor MCP para o Yujin como peer |
| `packages/nac/src/interop.ts` | Tipos TypeScript + helpers |
| `yujin.app/nac-spec/example-v22-interop.php` | Demo ao vivo: dois mini-apps lado a lado que se importam mutuamente |
| `packages/nac/test/v23-interop.mjs` | Testes unitários para export + import + proxy |
| `tools/nac/test-launch.sh` | Estendido com a camada 6 (interop) |

## Questões em aberto antes do GA da v2.3

- O payload de exportação deve ser opcionalmente assinado com o
  segredo HMAC do peer para que o host possa verificar a origem
  mesmo quando roteado por uma bridge não confiável? (Provavelmente
  sim; candidato para v2.3.1.)
- Qual é a affordance canônica de UI para "app remoto disponível"
  em um chat? Um emoji? Uma pílula? Ícone por app vindo do manifesto?
  (Candidato para seção 14 da spec.)
- As `data_tables` de um peer devem ser editáveis pelo agente do
  host, ou somente leitura por padrão? (Tendência para somente
  leitura; opt-in explícito para escrita.)

---

*This is a machine translation of the canonical English
version at `/nac-spec/docs/NAC_INTEROP_MCP.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
