---
translation_source: docs/VOICE_CHAT_ERROR_ANALYSIS_2026_05_09.md
translation_source_hash: 1c92bf209ccbc809e9d43062cc65ea0594983593f9e93293ae2912837f639f8d
translation_quality: machine_v1
translation_lang: ja
translation_date: 2026-05-11T15:10:40.112331+00:00
---

# エラー分析 -- 音声+チャットセッション 2026-05-09

> `example-v20-full.php` における Pablo の音声+チャットテストセッション。本ドキュメントでは、観察された不具合を洗い出し、根本原因ごとに分類し、それぞれに対する具体的な修正案を提示する。ASCII-only。
>
> **STATUS 2026-05-09 (最終):** ロードマップに記載された 8 件の修正 (C1..C8) はすべて実装済み。変更内容とコード上の場所については末尾のセクション 7 を参照。

---

## 1. エグゼクティブサマリー

7 カテゴリの不具合を検出。4 件はコード上で根本原因が特定された**再現可能なバグ**、2 件は**音声パイプラインの設計上の制約**でアーキテクチャ変更が必要、1 件は**UX ブロッカー**（モーダルがチャットをブロックする）。

深刻度:

| カテゴリ | 深刻度 | 種別 | 優先度 |
|---|---|---|---|
| C1. TTS -> STT フィードバックループ | **CRITICAL** | アーキテクチャ | 即時 |
| C2. 部分文字列マッチャーがコマンドを誤発火 | **HIGH** | バグ | 即時 |
| C3. 確認モーダルがチャットをブロック | **HIGH** | UX | 高 |
| C4. v20_panel.X がチャット経由で解決しない | **MEDIUM** | バグ | 中 |
| C5. STT の断片がコマンドとして実行される | **MEDIUM** | アーキテクチャ | 中 |
| C6. v20_panel 不在時に英語の "show" が誤マッピング | C4 の派生 | -- | C4 解決で対応 |
| C7. "cambia idioma" の動作が不安定 | **LOW** | バグ | 低 |

---

## 2. コマンド実行ログ (入力 -> 出力 -> 診断)

| # | 音声/チャット入力 | ボットの応答 | 診断 |
|---|---|---|---|
| 1 | "apreta describe_v20" | "No encuentro esa accion. Lo mas parecido: Correr el self-test, Ver capacidades, Ver mapa del sistema." | **C4** -- v20_panel のマニフェストがバックエンドの受け取るツリーに存在しない。ボットは自身が参照できるツリーを検索し、実際に存在するスラグの上位 3 件を返す。 |
| 2 | "pulsa boton show" | "Mostrando el mapa del sistema." | **C6** = C4 の派生。英語の "show" は `v20_panel.toggle`（EN ラベル "Toggle panel"）にマッチすべきだが、そのプラグインがツリーにないため、マッチャーが `navmap.fetch_map`（ラベル "Show the system map"）にフォールバックする。 |
| 3 | "ve a NAC3 v2.0 layer y pulsa el boton mostrar" | "No veo una capa v2.0 ni un boton 'mostrar'. Lo mas cercano: Ver mapa, Ver capacidades, Listar secciones." | **C4** -- #1 と一致。v20_panel がツリーにあればボットは `v20_panel.toggle` を見つけられる。なければ見つけられない。 |
| 4 | "cambia a ingles" | "No encuentro un control de idioma en esta pagina..." | **C7** -- 不安定: コマンド #16（同一入力）では正常に動作した。 |
| 5 | "pulsa system map" | "Pulsando NAC.system_map()." | OK（正常）。スラグ `navmap.fetch_map` がツリーに存在する。 |
| 6 | "pulsa capacidades" | "Pulsando NAC.capabilities()." | OK。スラグ `navmap.caps`。 |
| 7 | "pulsa ver capacidades" | "Pulsando Ver capacidades." | OK。同一スラグ。 |
| 8 | "filtra por ricardo" | "Filtrando la tabla por 'ricardo'." | OK。テーブルのライブフィルター。 |
| 9 | "pon brasil" | "Pongo Brasil en el campo Pais." | OK。Datalist オートコンプリート。 |
| 10 | "sube volumen a 80" | "Subiendo volumen a 80%." | OK。スライダー。 |
| 11 | "Porqué no me iluminas mostrándome el monte" | "Te muestro el Monte Fuji." | OK。長文かつ間接的な表現 -- LLM がアイコン `art.fuji` に正しくマッピング。 |
| 12 | "secretísimo" | "Abriendo el modal secreto." | OK。 |
| 13 | "elimina factura" | "Eliminando la factura." | **C3** -- 破壊的操作だが、実行前に確認が挟まれない。モーダルは実行後に表示されるが、チャットがブロックされる（C3 参照）。 |
| 14 | "Voz activada"（ボットの TTS 音声） | "Eliminando la factura." | **C1** -- フィードバックループ。TTS が "Voz activada" と発話し、STT がそれをユーザー入力として拾った。"Voz activada" 自体はどのコマンドにもマッチしないはずだが、C2 により "activada" がバッファ内の直前の削除コマンドと関連付けられた。 |
| 15 | "voz activada"（エコー） | "Eliminando la factura." | **C1** + **C2** -- サイクルが繰り返される。 |
| 16 | "eliminatorias" | "Eliminando la factura." | **C2** -- マッチャーが部分文字列で動作: "elimin" プレフィックスが "eliminar" にマッチ。"elimina" で始まる単語はすべてアクションを発火させる。 |
| 17 | "Muéstrame factura" | "Previsualizando la factura." | OK。 |
| 18 | "Manos libres activado..."（TTS）-> "manos libres activado"（STT） | "Modo manos libres confirmado." | **C1** -- 同じループ。 |
| 19 | "modo manos libres confirmado Dime cuáles son tus capacidades" | "Mostrando las capacidades del sistema." | ボットの応答とユーザーのコマンドが連結された入力。"capacidades" が強くマッチしたため正解。**C5** の部分的な事例。 |
| 20 | "del sistema" | "Mostrando el mapa del sistema." | **C5** -- 直前の入力の断片が独立したコマンドとして処理された。 |
| 21 | "corre el test" | "Corriendo el self-test de NAC." | OK。 |
| 22 | "de nac" | "Corriendo el self-test de NAC." | **C5** -- 断片。 |
| 23 | "cambia a inglés" | "Switching to English mode for upcoming replies." | OK。**ただし** #4（同一入力、異なる応答）と不整合。 |
| 24 | "cambia el idioma de la página a chino" | "No encuentro un control de idioma en esta página..." | **C7** -- LLM がこのメタコマンドをセッションの言語変更として認識せず、ツリー上のコントロールとして検索してしまう。 |

---

## 3. カテゴリ別の根本原因

### C1 -- TTS -> STT フィードバックループ (CRITICAL)

**メカニズム:** `SpeechSynthesisUtterance` がボットの応答をユーザーのスピーカーから再生する。ハンズフリーモードでは `SpeechRecognition` が同時に動作しており、マイクがスピーカーの音声を拾い、STT がそれをユーザー入力として文字起こしし、チャットが処理し、ボットが再び発話する、という無限ループが発生する。

ボットの応答にコマンドに類似した単語（eliminar、mostrar、abrir、cambiar など）が含まれていると、別のアクションが発火する可能性がある。その単語が破壊的操作に関連するものであれば、**実際の損害が生じる**。

**ログ上の証拠:**
- "Voz activada"（TTS）-> 入力として拾われる -> バッファ内の "elimina" とマッチ -> 請求書を削除。
- "Manos libres activado. Te escucho de continuo."（TTS）-> "manos libres activado" として拾われる -> ボットが "Modo manos libres confirmado" と応答。
- "Modo manos libres confirmado"（TTS）-> 拾われて次の入力に連結される。

**解決策（堅牢性の高い順）:**

1. **ハーフデュプレックス強制**（業界標準の対処法）:
   - `speechSynthesis.speaking === true` の間は `recognition.stop()` を呼ぶ。
   - utterance の `onend` イベントで `recognition.start()` を再開する。
   - トレードオフ: ボットの発話中にユーザーが割り込めなくなる。99% のケースでは許容範囲内。知覚レイテンシは増えるがループを防止できる。
2. **コンテンツフィルター**（多層防御）:
   - ボットが過去 30 秒以内に発話した直近 N 件（=10 件）の `SpeechSynthesisUtterance.text` を循環バッファに保持する。
   - STT のトランスクリプトが届いたら正規化（小文字化、ダイアクリティクス除去、トリム）し、バッファと比較する。直近の utterance のいずれかと 70% 以上一致する場合は無音で破棄する。
3. **破壊的操作への確認必須化**（最後の防衛線）:
   - `data-nac-a11y-hint="destructive"` または `irreversible` とマークされたアクションは、実行前に明示的な確認の追加ターンを必須とする。NAC3 v1.9 はすでに `confirm_action()` を定義しているが、デモの破壊的パスでは使用されていない。

**推奨:** (1) を即時実装 + (3) を短期で実装。(2) はユーザーがボットに割り込みたい環境向けのオプション。

---

### C2 -- 部分文字列マッチャーがコマンドを誤発火 (HIGH)

**メカニズム:** バックエンドまたは LLM のインテントリゾルバーが部分文字列マッチングを行っている。"eliminatorias" という単語に "elimina" がプレフィックスとして含まれており、"elimina" は登録済みアクションの動詞であるため、アクションが発火する。

**証拠:**
- "eliminatorias" -> "Eliminando la factura."

**解決策:** マッチャーは部分文字列ではなく**完全トークン**（またはステム）で動作させる。実装方法:

- 入力をスペースと句読点でトークン化する。
- 各トークンについて、スペイン語のステム正規化（"elimina/elimino/elimine/eliminar" -> ステム `elimin`、"eliminatorias" -> ステム `eliminatori`）を適用してアクションの動詞と比較する。ステムが異なればマッチしない。
- ヒューリスティックを絞り込むため、システムプロンプトに短い「コマンドステム」リスト（約 30 動詞）を保持する。

`@nac-spec/test-runner/src/lib/matcher.js` モジュールはすでに完全トークンマッチング（スラグの部分文字列ではなくフレーズ全体への `indexOf`）を行っている。バグは最新のマッチャーではなく、中間バックエンドに存在する。

**具体的なアクション:** システムプロンプト（`crm_desa/api/v1/yujin.php` 内の `yjNacDemoSystemPrompt`）を監査し、明示的なルールを追加する: 「`eliminar`、`borrar`、`cancelar` などの動詞は、入力の完全トークンが活用形の動詞と一致する場合にのみマッチさせる。別の単語のプレフィックスである場合はマッチさせない。」

---

### C3 -- 確認モーダルがチャットをブロック (HIGH)

**メカニズム（Pablo の報告）:** ボットが破壊的操作を発火すると、「承認」/「キャンセル」ボタンを持つモーダルが表示される。このモーダルは `<dialog>` のフォーカストラップ、またはチャットを含む DOM の残りの部分に `inert` を設定するオーバーレイを使用している。その結果、チャットにアクセスできなくなり、テキスト入力も音声入力も、会話による確認もできなくなる。

**影響:** ユーザーはクリックで手動承認/キャンセルするしかない。ハンズフリーモードでは「音声で操作可能」という前提が崩れる。

**解決策:**

1. 確認モーダルはチャットの**フォーカストラップの外**に配置する。あるいは逆に、チャットをモーダルのトラップの**外**に置く。実装例: チャットを `position: fixed` + モーダルより高い `z-index` に移動し、モーダルが開いている間も `inert={false}` を維持する。
2. モーダルのボタンに `data-nac-id`（例: `confirm.approve`、`confirm.cancel`）を付与して NAC ツリーに追加する。チャットボットが対応するスラグに対して音声で「承認」または「キャンセル」をディスパッチできるようにする。
3. TTS がモーダルの質問を自動的に読み上げ（「請求書を削除しますか？ 'はい' または 'いいえ' と言ってください。」）、STT がその応答を confirm/reject として直接解釈する。

**具体的なアクション:** `example-v20-full.php` の modal-confirm コンポーネント（存在する場合）または `js/nac.js` の `confirm_action()` 汎用フックを監査し、モーダルがチャットをフォーカスツリーに閉じ込めないことを確認する。

---

### C4 -- v20_panel.X がチャット経由で解決しない (MEDIUM)

**メカニズム:** ページの JS はチャットの各ターン前に `nacDemoSnapshotTree()` を呼び出して NAC ツリーをシリアライズする。この関数は `describe_v2()` ではなく `NAC.describe()`（v1）を呼び出す。`NAC.describe()` は `NAC.register()` で登録済みのプラグインのみを含む。

v20_panel は `example-v20-full.php` の body 末尾の `<script>` ブロック内で、`NAC.scope` が存在するまで `setTimeout(bootV20, 50)` でポーリングする `bootV20()` 関数によって登録される。以下のいずれかの場合:
- ブラウザが遅い、または rc5 のデプロイがまだ反映されていない（rpaforce-crm が独自の `nac-v2-extensions.js` コピーをバンドルしている）ため `NAC.scope` が存在せず `bootV20` が実行されない、
- または `bootV20` がユーザーの最初のチャットメッセージ送信後に遅れて実行される、

という状況では、`NAC.describe()` に v20_panel が含まれず、バックエンドはそれらのスラグを持たないツリーを受け取る。

**証拠:**
- "apreta describe_v20" -> ボットが `v20_panel.describe_v2` を見つけられない。
- "pulsa system map" -> ボットが `navmap.fetch_map` を**正常に**見つける（navmap は example.js の起動時に早期登録されるため）。

**解決策:**

1. **`nacDemoSnapshotTree` を `describe_v2()` に移行する**（利用可能になった時点で）。`describe_v2()` は v1_plugins（互換）と v2_scope_entries の両方を返すため、`NAC.register` で登録されたマニフェストと `NAC.scope` で宣言されたスコープの両方がバックエンドに届くことが保証される。
2. **`bootV20()` 完了まで最初のメッセージ送信をブロックする。** `nac:v2_installed` イベントが発火するまで `chat-send` を disabled 状態にする。
3. **`NAC.register({plugin_slug:'v20_panel'})` が `chatSend` の試行より前に実行されることを保証する。** そのレジスター処理を、body 末尾のインラインスクリプトに遅延させるのではなく、`example.js` 自体の起動処理（他のマニフェストが登録されている ~30 行目付近）に移動する。

**推奨:** (1) + (3) を組み合わせる。(1) が構造的な修正、(3) が競合状態の解消。

---

### C5 -- STT の断片がコマンドとして実行される (MEDIUM)

**メカニズム:** Web Speech API は部分結果（`interim` が true の `onresult`）と最終結果を返す。現在のチャット実装は各最終結果を独立したメッセージとして処理する。ユーザーが "el del sistema" と "muéstrame el mapa" の間で間を置くと、STT が 2 つの最終結果を発行する可能性があり、ボットが両方を処理してしまう。

加えて、TTS によるボットの応答（C1 の問題）が断片として混入する可能性がある。

**証拠:**
- "del sistema" -> "mostrar mapa del sistema" を完全なコマンドとして実行。
- "de nac" -> "self-test de NAC3" を実行。

**解決策:**

1. **バッファ + 無音タイムアウトによるデバウンス**:
   - 最終結果をバッファに蓄積する。
   - 最後の結果から 800〜1500 ms の無音が続いた後、またはユーザーが "send" を入力した後にのみバックエンドへ送信する。
   - これにより連続する断片が 1 つの質問にまとめられる。
2. **最小長フィルター**: 動詞+目的語にマッチする正規表現（有効な短文フレーズ）に一致しない限り、4 文字未満のトランスクリプトは無視する。
3. **C1 対策フィルター**: トランスクリプトがボットの直近 N 件の utterance と 70% 以上一致する場合は破棄する。

**推奨:** (1) + (3)。Alexa、Google Assistant、Siri などの現代的な音声アプリケーションの標準的な手法。

---

### C6 -- v20_panel 不在時に "show" が誤マッピング (派生)

C4 の解決により対応済み。v20_panel がツリーに存在すれば、その `label_i18n.en="Toggle panel"`（または選択したラベル）が "show" に対するマッチで優先される。現状ではツリーにないため、マッチャーが `navmap.fetch_map`（ラベル "Show the system map"）にフォールバックし、キーワード "show" がプレフィックスマッチする。

追加対応: `v20_panel.toggle` の EN ラベルは "Toggle panel" だけでなく "show / hide" を同義語として含めるべき。マニフェストを更新する:

```js
{ id: 'v20_panel.toggle', role: 'button',
  label_i18n: {
    es: 'Mostrar / ocultar panel',
    en: 'Show or hide panel',  /* antes: 'Toggle panel' */
    ...
  }
}
```

---

### C7 -- "cambia idioma" の動作が不安定 (LOW)

**メカニズム:** LLM に 2 つの非決定論的なルートが存在する:
- リテラルルート: 表示中のツリーで言語コントロールを検索する（存在しない -> 上位 3 候補を返して拒否）。
- メタルート: "cambia a inglés" をセッションのメタコマンドとして認識し、`{kind:'say', text:'Switching to English mode...'}` を発行して `currentLang` を変更する。

どちらのルートを取るかは、現在のシステムプロンプトの LLM サンプリング（temperature 0.5〜0.7）に依存するため、結果が不安定になる。

**解決策:** **システムプロンプトに明示的なルールを追加する**:

> 「ユーザーがセッションの言語変更を要求した場合（例: 'cambia a inglés'、'switch to French'、'idioma chino'）、常に `{kind:'change_locale', locale:'<2文字>'}` で応答すること。ツリー上の言語コントロールを検索してはならない。これはページ上のクリック操作ではなく、セッションに影響するメタコマンドである。」

また、バックエンドハンドラーの受け付けるコマンド種別（click / fill / say / etc）に `change_locale` を追加する。

コスト: システムプロンプトへの 1 行追加 + バックエンドハンドラーへの 1 分岐追加。

---

## 4. 修正ロードマップ（影響度／コスト順）

| # | 修正内容 | カテゴリ | コスト | 影響度 |
|---|---|---|---|---|
| 1 | Half-duplex TTS/STT（ボット発話中はマイクをミュート） | C1 | 低 | 致命的 |
| 2 | 破壊的操作を `confirm_action()` で確認 | C1, C3 | 中 | 致命的 |
| 3 | チャットのフォーカストラップ外にモーダル確認を配置 | C3 | 中 | 高 |
| 4 | マッチャーに完全単語トークナイザーを適用 | C2 | 低 | 高 |
| 5 | `nacDemoSnapshotTree` を `describe_v2()` へ移行 | C4 | 低 | 中 |
| 6 | `NAC.register('v20_panel')` を早期ブート時に移動 | C4 | 軽微 | 中 |
| 7 | STT 用バッファ＋デバウンス 800〜1500ms | C5 | 低 | 中 |
| 8 | system prompt に `change_locale` ルールを追加 | C7 | 軽微 | 低 |
| 9 | v20_panel.toggle の `label_i18n` に同義語を追加 | C6 | 軽微 | 低 |

コスト基準：
- **軽微**：1行のコード変更＋1コミット。
- **低**：30行未満、1〜2時間。
- **中**：30〜150行、半日。

---

## 5. 成功した点（うまく動いたこと）

壊さないために、うまくいった点も記録しておく：

- 「なぜ山を見せて私を照らしてくれないの」→ LLM が `art.fuji` アイコンに正しくマッピング。**間接的・比喩的インテントの解決** ── これはセクション16で求めていたものそのもの。
- 「secretísimo」→ シークレットモーダルを開く。**口語表現の解決**。
- 「Muéstrame factura」→ プレビュー表示。**活用形＋「elimina factura」という破壊的コマンドとの目的語の区別**。
- 「filtra por ricardo」→ ライブフィルター。**アクションとパラメーターが正しく分離**。
- 「pon brasil」→ 国フィールドにブラジルを入力。**宣言的オブジェクトの `fill` へのマッピング**。
- 「sube volumen a 80」→ スライダーを80%に設定。**テキストから数値を抽出＋スライダー操作**。
- 「corre el test」→ セルフテスト実行。**動詞＋ツリー上のオブジェクト**。

これらのケースは、ツリーが完全な状態でマッチャーが部分文字列で混乱しない限り、system prompt rc5（セクション16コントラクト）が正しく機能することを検証している。

---

## 6. 次のステップ

次のプッシュで修正 #1、#4、#6 を実装する（いずれもコストが低または軽微で、3つの重要カテゴリをカバーする）。修正 #2、#3、#5 は規模の大きい別 PR にまとめる。残りはバックログに積む。

Pablo：今すぐこれらの修正に着手してほしいか、先にドキュメントを確認したいかを教えてください。

---

## 7. 実装 STATUS（2026-05-09 最終）

Pablo は**すべての**修正の実装を承認した。ただし、system prompt rc5 が実現した**間接的・比喩的・口語的インテントの解決を壊さない**という制約付き（「なぜ山を見せて私を照らしてくれないの」→ Mt. Fuji のような比喩、「secretísimo」→ シークレットモーダルのような口語表現）。この能力はローカルマッチャーではなく LLM に宿っている。各修正は LLM をそのまま保ちつつ、(a) LLM 前の入力キャプチャ（C1、C5）、(b) プロンプトが LLM に渡すルール（C2、C7、C8）、(c) その後のディスパッチ（C3、C4）を改善する。

| # | カテゴリ | 実装した修正 | 場所 |
|---|---|---|---|
| C1 | TTS→STT フィードバックループ | Half-duplex（`speechSynthesis.speaking` 中は STT をミュート）＋ボットの直近8発話の循環バッファ＋`recognizer.onresult` ハンドラーでのコンテンツフィルター（完全一致 / 包含 / 70%トークンオーバーラップ）。`recognizer.onresult` は処理前に `speechSynthesis.speaking` を確認する。 | `js/example.js` -- `_ttsRecentBuf`、`_sttIsBotEcho`、`_ttsRememberUtterance`；recognizer.onresult |
| C2 | 部分文字列マッチャー | system prompt にルール11を明示：「WORD-LEVEL MATCHING -- 'eliminatorias' は 'eliminar' にマッチしない。活用形または不定詞のみ。前置詞の曖昧さがある場合は `{kind:'say'}` で確認を求め、破壊的アクションは絶対に返さない。」ローカルの `interpret()` は 2026-05-06 時点で既に正しくトークナイズ済み。 | `crm_desa/api/v1/yujin.php` `yjNacDemoSystemPrompt` ルール11 |
| C3 | モーダル確認がチャットをブロック | (a) CSS：`.ne-side { z-index: 10001 }` でチャットをオーバーレイ（z-index 9999）の外に出す。(b) `nac:confirm:requested` リスナーがプロンプトと TTS によるローカライズ済みヒントをアナウンス。(c) `chatSend` と `_sttFlush` にルーティングされた `_maybeAnswerPendingConfirm()` が、LLM を経由せず10言語の YES/NO を `<id>.confirm`/`.cancel` に直接マッピング。 | `css/example.css` `.ne-side`；`js/example.js` `_findPendingConfirm`、`_maybeAnswerPendingConfirm`、`nac:confirm:requested` リスナー |
| C4 | v20_panel がチャットに届かない | (a) マニフェストを `window.__V20_PANEL_MANIFEST__` に抽出し、`NAC.register` が存在し次第（`bootV20` より前）30ms ポーリングで `registerV20PanelManifest()` を通じて登録。(b) `nacDemoSnapshotTree` が `NAC.describe_v2` 存在時に `v2_scope_entries`、`v2_intermediate_scopes`、`sitemap`、`tenant_prefix`、`nac_version_v2` も含むよう拡張。 | `example-v20-full.php`（早期登録ブロック）；`js/example.js` `nacDemoSnapshotTree` 拡張 |
| C5 | STT フラグメントがコマンドとして処理される | バッファ `_sttBuffer` ＋ `setTimeout(_sttFlush, 1100)`。STT の `final` 結果ごとにタイマーをリセットし、1100ms の無音後にバッファをバックエンドへフラッシュ。手動パス（chatSend / マイク停止）ではバッファをクリア。 | `js/example.js` `recognizer.onresult` ＋ `_sttFlush` |
| C6 | 「show」が誤ってマッピングされる | C4 のクローズにより解決（v20_panel がツリーに表示されるようになった）。追加対応：v20_panel.toggle の `label_i18n.en` を「Toggle panel」から「Show or hide v2.0 panel」に変更し、9言語の新ロケールを追加。 | `example-v20-full.php` `__V20_PANEL_MANIFEST__` |
| C7 | 「cambia idioma」が不安定 | (a) system prompt のカタログに新 kind `change_locale` を追加。(b) ルール13：「SESSION META-COMMANDS は change_locale を使用すること -- ツリーで『language control』を検索しないこと。」(c) `dispatchAgenticAction` に `applyLangChange(a.locale)` を呼び出すハンドラーを追加。 | `crm_desa/api/v1/yujin.php`（新 kind ＋ルール13）；`js/example.js` `dispatchAgenticAction` case `change_locale` |
| C8 | プラグインの動詞が誤っている（コンソール警告「No action with verb=fetch_map found in plugin selftest」） | ルール12を明示：「PLUGIN-VERB BINDING はマニフェストで固定されている。推測しない、近くのプラグインに動詞を持ち込まない、プラグイン名を作らない。」WRONG ↔ RIGHT の例付き。 | `crm_desa/api/v1/yujin.php` `yjNacDemoSystemPrompt` ルール12 |

### 意図的に変更しなかった点

- **メイン system prompt（セクション16コントラクト）：** そのまま維持。追加したのはルール11、12、13のみで、これらは既存ルールを補完するもの。絶対ルール A〜F および 1〜10 は変更なし。
- **ローカルマッチャー `interpret()`：** 2026-05-06 時点で既に完全単語トークナイズ済み。リスクなし。
- **確認ダイアログ（`nac.js` の `NAC.confirm_dialog`）：** そのまま維持。既に `nac:confirm:requested` を発行し、ボタンには `data-nac-id` が付いていた。今回はそれをリッスンするだけ。

### 残存リスク／次のステップ

- **C1 レベル3（破壊的操作への `confirm_action()`）：** 未対応のまま。現状では「elimina factura」がアクションを実行し、その後モーダルが表示される。ルール11があってもLLMが混乱した場合のフォールバックとして、`data-nac-a11y-hint=destructive` が付いたすべての破壊的アクションをディスパッチレイヤーで `confirm_action()` を通じて実行するべき。フォローアップ課題として残す：`manifest.actions[].destructive` を検査し、該当する場合は invoke を `confirm_action()` でラップする実装が必要。
- **STT デバウンス（C5）：** 1100ms は経験的な値。「短いコマンドへの応答が遅い」と感じる場合は 800ms に下げて様子を見る。
- **TTS フィードバックフィルター（C1）── 積極的なしきい値：** 70% トークンオーバーラップのしきい値は、ボットがよく使うフレーズと一致するユーザーの正当なコマンドをブロックする可能性がある（例：ボットが「これらが機能です」と言った直後に「muestra capacidades」と言った場合）。将来のテレメトリー：`[stt] dropping bot-echo` のログ件数をカウントし、セッションあたり N 件を超えたらしきい値を 80% に引き上げる。

---

*This is a machine translation of the canonical English
version at `/nac-spec/docs/VOICE_CHAT_ERROR_ANALYSIS_2026_05_09.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
