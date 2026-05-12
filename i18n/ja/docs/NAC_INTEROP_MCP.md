---
translation_source: docs/NAC_INTEROP_MCP.md
translation_source_hash: 559b9c7f1d01da4f76e35b6e4f1fcb558f8f0bbca87f7cb4148738989b83b49c
translation_quality: machine_v1
translation_lang: ja
translation_date: 2026-05-11T14:58:00.207949+00:00
---

# NAC3 -- MCP によるクロスアプリ相互運用

**ステータス:** v2.3 プレビュー（ブランチ `feat/nac-interop-mcp`、未マージ）
**仕様セクション:** 機能がプレビューを卒業した時点で SPEC.md セクション 11 として挿入予定。

## 背景

NAC3 v1.9 + v2.0 + v2.1 + v2.2 は、*1 つの* Web UI を AI エージェントが操作する方法を標準化した。v2.3 では、*複数の* NAC3 アプリが相互運用する方法までコントラクトを拡張する。

想定ユーザーフロー:

> Pablo は Yujin CRM でチャットに話しかけている。彼は言う:
> *「Yujin、Excel に切り替えて。」*
>
> Yujin のチャットクライアントはこれを相互運用インテントとして認識する。ユーザーが開いている Excel インスタンスに対して `nac.export_tree` MCP ツールを呼び出し、Excel の完全な NAC3 ツリー（アクティブなワークブック、現在のシート、名前付き範囲、リボンボタン）を取得し、`remote:excel:*` 配下のリモートプラグインとして登録する。
>
> これで Pablo が *「セル A1 を 100 にして」* と言うと、Yujin の仲介レイヤーが `remote:excel:cell.A1` を解決し、`NAC.fill('remote:excel:cell.A1', 100)` を呼び出す。ランタイムは `remote:` プレフィックスを検出し、MCP 経由でディスパッチをプロキシする。Excel が副作用を実行して `nac:field:changed` の ack を発行し、SSE ストリームがそれを Yujin のランタイムに返し、ローカルの Promise が解決される。Pablo は Yujin のチャットで確認する: *「セル A1 を 100 に設定しました。」*
>
> 重要なのは: **エージェントは Excel のスキーマを事前に知っている必要がなかった**という点だ。export_tree の呼び出しが、必要なタイミングでマニフェストを提供した。

これは、Yujin が v2.3 ローンチで発表した**アタッチ可能な製品の商用プール**の基盤となる。MCP サーバーを通じて以下の 4 つの相互運用ツールを公開するサードパーティアプリは、他の NAC3 ホストからのナビゲーション先として利用可能になる。

## アーキテクチャ

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

3 つのアクター:

1. **Host** -- ユーザーが現在操作しているアプリ（例では Yujin）。
2. **Peer** -- インポート対象の外部 NAC-3 準拠アプリ（例では Excel）。
3. **MCP bridge** -- 通常はホストのエージェントプロセス。既知のピアのベアラートークンを保持し、呼び出しをプロキシする。ブリッジはピアに対してユーザーを偽装しない。独自のクレデンシャルを使用する。

## MCP ツールインターフェース

NAC-3 準拠のすべてのピアは、MCP エンドポイントで以下の 4 つのツールを公開しなければならない（MUST）:

### `nac.export_tree`

インバウンド。他のアプリがインポートできる自己記述型ペイロードを返す。

**入力:**

```ts
{
  scope?: 'full' | 'active_plugin' | 'plugin_slug:<slug>',
  include_dom_state?: boolean,    // default false (privacy)
  include_locales?: string[],     // default all 10
  bearer: string                  // peer's per-tenant token
}
```

**出力:**

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

インバウンド。ピア上で NAC3 アクションをディスパッチする。

**入力:**

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

**出力:**

```ts
{
  ok: boolean,
  result?: { row_id?: string, value?: unknown, ... },
  error?: { code: string, message: string }
}
```

ピアはローカルの `NAC.<kind>(...)` を通じてアクションをディスパッチし、5 秒のタイムアウトで正規の ack イベントファミリーを待機して結果を返す。ack は SSE チャネルにもブロードキャストされるため、ホスト側で相関付けが可能。

### `nac.subscribe_events`

ストリーミング（SSE）。ピアからホストへ ack イベントをプッシュする。

**入力（クエリ文字列）:**

```
?bearer=<token>&plugins=<csv-of-plugin-slugs>&since=<iso8601>
```

**出力（各イベント）:**

```
event: nac:action:succeeded
data: {"plugin":"excel","action_id":"excel.cell.A1","is_trusted":false,
       "result":{"value":100},"ts":"2026-05-10T18:30:01.234Z"}

event: nac:tab:activated
data: {"plugin":"excel","tab_id":"tab.sheet2",...}
```

ホストのランタイムはこれらをローカルドキュメントにリレーするため、`NAC.click('remote:excel:cell.A1')` を呼び出したエージェントは、リモートイベントによって駆動されるローカル解決済み Promise を受け取る。

### `nac.health`

インバウンド、シンプル。以下を返す:

```ts
{ ok: true, nac_version: '2.3', app_id: 'excel-online',
  uptime_ms: 12345 }
```

ホストがインポート前にピアへの疎通確認を行うために使用する。

## ホスト側ランタイム API

v2.3 以降、`window.NAC` に以下の 3 つの新関数が追加される:

```ts
NAC.export_tree(opts?: {
  scope?: 'full' | 'active_plugin' | 'plugin_slug:<slug>',
  include_dom_state?: boolean,
  include_locales?: string[]
}): Promise<NACExportV1>
```

上記で定義したペイロードを返す。純粋なローカル読み取りで、I/O は発生しない。

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

`payload.manifests` 内の各マニフェストを名前空間付きのプラグインスラグとして登録する:

- `payload.manifests.invoice` は `NAC.describe()` 内で `remote:<namespace>:invoice` になる。
- そのマニフェスト内のすべての nac_id は、`NAC.click()` / `NAC.fill()` などで解決される際に `remote:<namespace>:` プレフィックスが付与される。
- ランタイムの要素リゾルバーはまずプレフィックスを確認し、一致した場合は DOM を参照せず、接続のトランスポートを通じてディスパッチをプロキシする。

```ts
NAC.list_remote_apps(): RemoteHandle[]
NAC.disconnect_remote(remote_id: string): void
```

検査とクリーンアップ用。disconnect は SSE ストリームを切断し、名前空間付きプラグインの登録を解除する。

## ディスパッチのプロキシ

`NAC.click(id)` が呼び出され、`id` が `remote:` で始まる場合:

1. `remote:<namespace>:<peer_local_id>` をパースする。
2. `_remotes[namespace]` -- インポート時に保存された RemoteHandle を参照する。
3. `{ bearer, nac_id: peer_local_id, action: { kind:'click', args: {} } }` を `handle.endpoint + '/nac.invoke'` に POST する。
4. `ok: true` の場合、ローカルの Promise を即座に解決する（SSE ストリームもローカルの `nac:action:succeeded` をディスパッチするため、Promise を持たない awaiter にも通知が届く）。
5. `ok: false` の場合、ピアのエラーコードで reject する。

他のアクション種別（`fill`、`tab`、`tab_by_label`、`dt_*`、`edit_field`）も同じパターンに従う。

## セキュリティモデル

### 信頼境界

- **ベアラートークン**はホストをピアに対して認証する。ピアの管理レイヤー（テナント管理）が発行する。ブリッジはサーバーサイドで保持し、LLM 仲介のプロンプトには一切公開しない。
- アクション単位の **HMAC** はオプションだが、ピアが機密として指定したアクション（`delete`、`payment.*`、ロール付与）には推奨される。HMAC ボディ = `bearer + nac_id + kind + sorted(args)`、SHA-256 でハッシュ化。
- **オリジンホワイトリスト** -- ピアの MCP サーバーは Origin ヘッダー（または MCP トランスポート相当）を登録済みリストと照合する。リスト外のホストには HTTP 403 を返す。

### is_trusted の転送

プロキシ経由でディスパッチされたすべてのアクションは、ack イベントの detail に `is_trusted: false` を持つ。ピアのホストコードはこれを理由にアクションを拒否してもよい（MAY）:

```js
document.addEventListener('nac:action:succeeded', function (e) {
  if (e.detail.action_id === 'invoice.delete' && !e.detail.is_trusted) {
    console.warn('[security] refused synthetic delete via interop');
    e.preventDefault();
  }
});
```

### トークンローテーション

ベアラートークンはピアの通常のセッションサイクル（例: 24 時間）でサーバーサイドにてローテーションされる。ホストはピアからの 401 を検出し、ユーザーの認証フローを通じて新しいトークンを再取得する。再認証できないセッションはクリーンに切断される。

## シーケンス図（テキスト）

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

## 非目標（先送り）

- **ピアもホストをインポートする双方向相互運用。** v2.3 モデルはホスト → ピアの一方向ナビゲーション。クロスインポートは再入性とサイクル検出の複雑さを伴うため、v2.4 に先送り。
- **マルチホップチェーン**（Yujin → Excel → Slack）。同様の複雑さのため、v2.3 は 1 ホップに制限。
- **ストリーミングアクション**（ライブカーソル追従）。将来的な目標。SSE が提供できる範囲を超えた WebRTC 的なチャネルが必要。

## パフォーマンス予算

- `nac.export_tree` ラウンドトリップ: LAN 上で p95 < 200 ms。
- `nac.invoke` ラウンドトリップ（ピアの副作用時間を除く）: p95 < 100 ms。
- `nac.subscribe_events` キープアライブ: 15 秒ごとにハートビート。

## 実装ファイル（このブランチ）

| ファイル | 役割 |
|------|------|
| `yujin.app/nac-spec/js/nac-mcp-interop.js` | ホスト側ランタイム: export_tree + import + proxy |
| `agent/mcp_interop.py` | Yujin をピアとして動作させる MCP サーバーツール実装 |
| `packages/nac/src/interop.ts` | TypeScript 型定義とヘルパー |
| `yujin.app/nac-spec/example-v22-interop.php` | ライブデモ: 相互インポートする 2 つのミニアプリを並べて表示 |
| `packages/nac/test/v23-interop.mjs` | export + import + proxy のユニットテスト |
| `tools/nac/test-launch.sh` | レイヤー 6（相互運用）を追加して拡張 |

## v2.3 GA 前のオープンクエスチョン

- エクスポートペイロードをピアの HMAC シークレットで署名し、信頼できないブリッジ経由でプロキシされた場合でもホストがオリジンを検証できるようにすべきか？（おそらく Yes; v2.3.1 候補。）
- チャット内で「リモートアプリ利用可能」を示す標準的な UI アフォーダンスは何か？絵文字？ピル型バッジ？マニフェストからのアプリ固有アイコン？（仕様セクション 14 候補。）
- ピアの `data_tables` はホストのエージェントから編集可能にすべきか、デフォルトで読み取り専用にすべきか？（読み取り専用を基本とし、書き込みは明示的なオプトインを推奨。）

---

*This is a machine translation of the canonical English
version at `/nac-spec/docs/NAC_INTEROP_MCP.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
