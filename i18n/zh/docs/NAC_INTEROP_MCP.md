---
translation_source: docs/NAC_INTEROP_MCP.md
translation_source_hash: 559b9c7f1d01da4f76e35b6e4f1fcb558f8f0bbca87f7cb4148738989b83b49c
translation_quality: machine_v1
translation_lang: zh
translation_date: 2026-05-11T15:13:57.777412+00:00
---

# NAC3 -- 通过 MCP 实现跨应用互操作

**状态：** v2.3 预览版（分支 `feat/nac-interop-mcp`，尚未合并到 main）。
**规范章节：** 待该功能退出预览后，将作为 SPEC.md 第 11 节插入。

## 背景

NAC3 v1.9 + v2.0 + v2.1 + v2.2 规范了*单个* Web UI 由 AI 代理驱动的方式。v2.3 将契约扩展至*多个* NAC3 应用之间的互操作。

典型用户流程如下：

> Pablo 正在 Yujin CRM 中通过语音对话操作。他说：
> *"Yujin，跳转到 Excel。"*
>
> Yujin 的聊天客户端识别出这是一个互操作意图。它对用户当前打开的 Excel 实例调用 `nac.export_tree` MCP 工具，拉取 Excel 完整的 NAC3 树（活动工作簿、当前工作表、命名区域、功能区按钮），并将其注册为 `remote:excel:*` 下的远程插件。
>
> 此后，Pablo 可以说 *"将单元格 A1 设为 100"*，Yujin 的中间层将 `remote:excel:cell.A1` 解析为 `NAC.fill('remote:excel:cell.A1', 100)`。运行时检测到 `remote:` 前缀，通过 MCP 代理分发该操作。Excel 执行副作用，发出 `nac:field:changed` 确认，SSE 流将其传回 Yujin 的运行时，本地 Promise 完成。Pablo 在 Yujin 聊天中看到：
> *"单元格 A1 已设为 100。"*
>
> 关键在于：**代理无需提前了解 Excel 的 schema**。export_tree 调用在需要时即时提供了清单。

这是 Yujin 在 v2.3 发布时宣布的**可附加商业产品池**的基础。任何第三方应用，只要其 MCP 服务器暴露了以下四个互操作工具，就可以作为任意其他 NAC3 宿主的导航目标。

## 架构

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

三个参与方：

1. **宿主（Host）** —— 用户当前操作的应用（示例中为 Yujin）。
2. **对端（Peer）** —— 被导入的外部 NAC-3 兼容应用（示例中为 Excel）。
3. **MCP 桥接（MCP bridge）** —— 通常是宿主的代理进程。它持有已知对端的 bearer token，并代理调用。桥接**不会**以用户身份向对端发起请求，而是使用自身凭据。

## MCP 工具接口

每个 NAC-3 兼容的对端**必须**在其 MCP 端点暴露以下四个工具：

### `nac.export_tree`

入站。返回一个自描述的载荷，供其他应用导入。

**输入：**

```ts
{
  scope?: 'full' | 'active_plugin' | 'plugin_slug:<slug>',
  include_dom_state?: boolean,    // default false (privacy)
  include_locales?: string[],     // default all 10
  bearer: string                  // peer's per-tenant token
}
```

**输出：**

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

入站。在对端分发一个 NAC3 动作。

**输入：**

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

**输出：**

```ts
{
  ok: boolean,
  result?: { row_id?: string, value?: unknown, ... },
  error?: { code: string, message: string }
}
```

对端通过其本地 `NAC.<kind>(...)` 分发动作，等待规范确认事件族（超时 5 秒），并返回结果。确认事件同时也会广播到 SSE 通道，供宿主进行关联。

### `nac.subscribe_events`

流式（SSE）。将对端的确认事件推送回宿主。

**输入（查询字符串）：**

```
?bearer=<token>&plugins=<csv-of-plugin-slugs>&since=<iso8601>
```

**输出（每条事件）：**

```
event: nac:action:succeeded
data: {"plugin":"excel","action_id":"excel.cell.A1","is_trusted":false,
       "result":{"value":100},"ts":"2026-05-10T18:30:01.234Z"}

event: nac:tab:activated
data: {"plugin":"excel","tab_id":"tab.sheet2",...}
```

宿主运行时将这些事件中继到本地文档，使得调用 `NAC.click('remote:excel:cell.A1')` 的代理能够获得由远程事件驱动的本地 Promise 解析。

### `nac.health`

入站，简单接口。返回：

```ts
{ ok: true, nac_version: '2.3', app_id: 'excel-online',
  uptime_ms: 12345 }
```

宿主在导入前用于验证对端是否可达。

## 宿主侧运行时 API

v2.3 落地后，以下三个新函数将挂载在 `window.NAC` 上：

```ts
NAC.export_tree(opts?: {
  scope?: 'full' | 'active_plugin' | 'plugin_slug:<slug>',
  include_dom_state?: boolean,
  include_locales?: string[]
}): Promise<NACExportV1>
```

返回上述定义的载荷。纯本地读取，无 I/O。

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

将 `payload.manifests` 中的每个清单注册到带命名空间的插件 slug 下：

- `payload.manifests.invoice` 在 `NAC.describe()` 中变为 `remote:<namespace>:invoice`。
- 该清单内所有 nac_id 在被 `NAC.click()` / `NAC.fill()` 等解析时，均会加上 `remote:<namespace>:` 前缀。
- 运行时的元素解析器优先检查前缀；若匹配，则通过连接的传输层代理分发，而非查询 DOM。

```ts
NAC.list_remote_apps(): RemoteHandle[]
NAC.disconnect_remote(remote_id: string): void
```

用于检查和清理。断开连接时会关闭 SSE 流并注销命名空间下的插件。

## 分发代理

当 `NAC.click(id)` 被调用且 `id` 以 `remote:` 开头时：

1. 解析 `remote:<namespace>:<peer_local_id>`。
2. 查找 `_remotes[namespace]` —— 导入时存储的 RemoteHandle。
3. 向 `handle.endpoint + '/nac.invoke'` POST `{ bearer, nac_id: peer_local_id, action: { kind:'click', args: {} } }`。
4. 若 `ok: true`，立即解析本地 Promise（SSE 流同时也会分发本地 `nac:action:succeeded`，使没有持有 Promise 的等待方也能收到通知）。
5. 若 `ok: false`，以对端的错误码拒绝 Promise。

其他动作类型（`fill`、`tab`、`tab_by_label`、`dt_*`、`edit_field`）遵循相同模式。

## 安全模型

### 信任边界

- **Bearer token** 用于宿主向对端进行身份验证。它由对端的管理层（租户管理）签发，存储在桥接服务端，**不会**暴露给 LLM 中间层的提示词。
- 每次动作的 **HMAC** 是可选的，但对于对端标记为敏感的操作（`delete`、`payment.*`、角色授权）建议使用。HMAC 正文 = `bearer + nac_id + kind + sorted(args)`，使用 SHA-256 哈希。
- **来源白名单** —— 对端的 MCP 服务器会根据已注册列表校验 Origin 头（或其 MCP 传输层等价物）。不在列表中的宿主将收到 HTTP 403。

### is_trusted 转发

所有通过代理分发的动作，其确认事件详情中均携带 `is_trusted: false`。对端的宿主代码**可以**据此拒绝该动作：

```js
document.addEventListener('nac:action:succeeded', function (e) {
  if (e.detail.action_id === 'invoice.delete' && !e.detail.is_trusted) {
    console.warn('[security] refused synthetic delete via interop');
    e.preventDefault();
  }
});
```

### Token 轮换

Bearer token 按对端正常会话周期在服务端轮换（例如每 24 小时）。宿主检测到对端返回 401 后，会通过用户的认证流程重新获取新 token。无法重新认证的会话将被干净地断开。

## 时序图（文本）

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

## 非目标（延期）

- **对端也导入宿主的双向互操作。** v2.3 模型为宿主 -> 对端的单向导航。交叉导入引入了重入和循环检测的复杂性，延期至 v2.4。
- **多跳链路**（Yujin -> Excel -> Slack）。同样因复杂性原因，v2.3 最多支持一跳。
- **流式动作**（实时光标跟随）。属于远期目标，需要超出 SSE 能力的 WebRTC 类通道。

## 性能预算

- `nac.export_tree` 往返时延：局域网 p95 < 200 ms。
- `nac.invoke` 往返时延（不含对端副作用时间）：p95 < 100 ms。
- `nac.subscribe_events` 保活：每 15 秒发送一次心跳。

## 实现文件（本分支）

| 文件 | 职责 |
|------|------|
| `yujin.app/nac-spec/js/nac-mcp-interop.js` | 宿主侧运行时：export_tree + import + proxy |
| `agent/mcp_interop.py` | Yujin 作为对端时的 MCP 服务器工具实现 |
| `packages/nac/src/interop.ts` | TypeScript 类型定义与辅助函数 |
| `yujin.app/nac-spec/example-v22-interop.php` | 在线演示：两个并排互相导入的迷你应用 |
| `packages/nac/test/v23-interop.mjs` | export + import + proxy 的单元测试 |
| `tools/nac/test-launch.sh` | 扩展了第 6 层（互操作）测试 |

## v2.3 GA 前的待决问题

- 导出载荷是否应可选地使用对端的 HMAC 密钥签名，以便宿主在通过不受信任的桥接代理时也能验证来源？（倾向于是；v2.3.1 候选项。）
- 聊天界面中"远程应用可用"的规范 UI 呈现方式是什么？表情符号？标签胶囊？来自清单的应用图标？（规范第 14 节候选项。）
- 对端的 `data_tables` 是否应允许宿主代理编辑，还是默认只读？（倾向于只读，写入需显式启用。）

---

*This is a machine translation of the canonical English
version at `/nac-spec/docs/NAC_INTEROP_MCP.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
