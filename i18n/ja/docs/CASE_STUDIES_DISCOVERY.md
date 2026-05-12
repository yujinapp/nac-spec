---
translation_source: docs/CASE_STUDIES_DISCOVERY.md
translation_source_hash: 59b940d486104c6a9b42d59c1ee6f16c25eb01c0c08b8b98458c68ef4312ed77
translation_quality: machine_v1
translation_lang: ja
translation_date: 2026-05-11T15:04:54.749447+00:00
---

# ケーススタディ -- 自律的に発見されたデモのバグ

Playwright による診断スイープを `yujin.app/nac-spec/demos/react/` および `/demos/angular/` に対して実行し、発見されたバグの記録。Pablo から 2026-05-11 に、症状を明示せずに発見・文書化・修正するよう依頼された。このファイルは発見プロセスと修正内容を記録する。

---

## バグ #1 (HIGH) -- LLM 仲介層がアプリのマニフェストを認識できない

**影響するデモ:** React + Angular。

**症状（観測可能）:** React または Angular デモのチャットパネルで「hola」と入力すると、チャットが「How can I help you with this page?」という汎用的な返答を返す。これが todos アプリであることを認識していない。「agrega tomar agua」と入力しても、LLM は `click_by_verb('todos', 'add_todo')` をディスパッチできない。そのプラグインの存在を知らないためだ。

**発見方法。** 診断スペックはチャット操作中のすべての `page.console` メッセージをキャプチャする。チャットクライアントのログ:

```
[nac-chat] snapshot plugins (1): chat
[nac-chat] backend response: message="Hi! How can I help you with this page?" actions=[]
```

`snapshot plugins (1): chat` が決定的な証拠だ。LLM に送られるスナップショットに含まれるプラグインが `chat` の **1 つだけ**になっている。デモが `NAC.register(TODOS_MANIFEST)` で登録している `todos` プラグインが存在しない。

**根本原因。** `NAC.describe()` は DOM 上の `[data-nac-plugin="..."]` 要素を走査してプラグインを列挙する（`yujin.app/nac-spec/js/nac.js` の約 1557 行目）。チャットパネルの `<aside class="chat" data-nac-plugin="chat">` にはこの属性があるが、アプリの todos 領域には**ない**。ランタイムは todos 領域をプラグインスコープとして認識できず、`describe()` も `snapshotTree()` も LLM も同様に認識できない。

`NAC.register(...)` によるマニフェスト登録は内部の `_manifests` マップを更新するが、DOM に `data-nac-plugin` 属性を自動付与**しない**。それは呼び出し側の責任だ。

**修正。** 両デモのメインアプリコンテナに `data-nac-plugin="todos"` を追加する:

- React: `<div className="app">` -> `<div className="app" data-nac-plugin="todos">`
- Angular: テンプレートの `<div class="app">` -> `<div class="app" data-nac-plugin="todos">`

修正後、`NAC.describe()` は 2 つのプラグイン（`todos` + `chat`）を返し、スナップショットに両方のマニフェストが含まれ、LLM が `todos.*` に対してバーブベースのアクションをディスパッチできるようになる。

**マニュアルへの教訓。** NAC3 のコントラクトでは以下の**両方**が必要:
1. `NAC.register(manifest)` でスキーマを宣言する。
2. DOM ルートに `data-nac-plugin="<slug>"` を付与してプラグインをスコープツリーに登録する。

導入ガイドおよび NAC_TEST_MANUAL でこの点を明示すること。「マニフェストを登録したが DOM 属性を忘れた」というのは典型的な導入ミスであり、上記の「LLM が盲目になる」症状を引き起こす。`stage2-disambiguation.mjs` にリグレッションテストを追加すること: スナップショットに登録済みのすべてのプラグインが含まれていなければ、ファインディングとしてフラグを立てる。

---

## バグ #2 (MEDIUM) -- React の onChatAction ハンドラが古いステートをクロージャで参照する

**影響するデモ:** React のみ。Angular はシグナルと `update()` を使用するため、このカテゴリの問題は発生しない。

**症状（観測可能）:** バグ #1 の修正後も、チャット経由のバーブディスパッチで todo が追加されない。「agrega leche」を送信しても新しい todo が追加されない。LLM は正しく 2 アクションのシーケンス（`fill todos.input "leche"` + `click_by_verb todos add_todo`）を生成しているが、`add_todo` ハンドラ側で `input.trim() === ''` となり、`addTodo()` を呼ばずにサイレントリターンしてしまう。

**発見方法。** 深層探索 Playwright スイープ（ラウンド 2）がチャット経由の追加操作前後の行数をキャプチャする。ファインディング:

```
[WARN] chat.dispatch: [react] chat "agrega leche" did not add a
todo (before=3, after=3). May be LLM hallucination or dispatch
broken.
```

**根本原因。** `App.tsx` のチャットハンドラ登録用 `useEffect` は deps に `[input, todos]` を持つ。ハンドラは**登録時点**の React ステート値をクロージャで参照する。LLM が `actions[]` を同期的に送信すると、チャットクライアントは以下をディスパッチする:
1. `fill todos.input "leche"` -> `setInput('leche')` が再レンダリングをキューに積む。
2. `click_by_verb todos add_todo` -> **同じ JS タスク内で即座に実行される**。React はまだ再レンダリングしていない。ハンドラのクロージャは依然として `input === ''` を参照している。`input.trim()` のガードが失敗し、`addTodo()` が実行されない。

これは React の典型的なクロージャ vs. 古いステートの問題だ。

**修正。** `input` を追跡する `useRef` を使用し、ハンドラはクロージャではなく ref（常に最新の値）から読み取るようにする。将来のバーブで必要になる場合に備えて `todos` にも同じパターンを適用する。

```ts
const inputRef = useRef(input);
useEffect(() => { inputRef.current = input; }, [input]);

useEffect(() => {
  if (!window.NacChat) return;
  window.NacChat.onAction('click_by_verb', (a) => {
    if (a.plugin === 'todos' && a.verb === 'add_todo') {
      const text = (a as any).args?.text || inputRef.current.trim();
      if (text) {
        addTodoFromText(text);
        return { ok: true };
      }
    }
    ...
  });
}, []); // 一度だけ登録
```

ボーナス: LLM が `args.text` に直接テキストを渡す場合も受け付けるようにする。これにより、fill-then-click を行わないアプリでも動作する。

**マニュアルへの教訓。** React で NAC3 チャット駆動バーブを接続する際は、ハンドラをステートに直接クロージャさせては**いけない**。ref または関数型セッターパターンを使用すること。React 導入ガイド（`guides/REACT.md`）およびテストマニュアルに「よくある落とし穴」セクションを追加すること。

---

## バグ #3 (TBD)

診断ラウンド 3 待ち。

---

## ループログ

| ラウンド | 日時 | React エラー | Angular エラー | 登録バグ |
|-------|------|--------------|----------------|------------|
| 1 | 2026-05-11 02:10 | 表面スキャンで 0 件 | 表面スキャンで 0 件 | #1（マニフェストカバレッジ）コンソール解析で発見 |

診断スペックの構造チェック（NAC マウント済み、validate_global クリーン、レジストリ内マニフェスト、todos CRUD 動作、チャットトグル動作）はすべてグリーンで**合格**する。バグは「LLM が登録済みの内容を実際に認識しているか」といった深いセマンティクスの層で表面化する。今後の診断ラウンドでは以下を追加する: LLM レスポンス後のアクション形状の検証、ディスパッチの発火確認、フレームワークステートを通じた dt_state ミューテーション伝播の検証、オートパイロットの全ステップ完了確認、チャットからのロケール切り替え確認。

---

*This is a machine translation of the canonical English
version at `/nac-spec/docs/CASE_STUDIES_DISCOVERY.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
