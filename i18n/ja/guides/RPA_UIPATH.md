---
translation_source: guides/RPA_UIPATH.md
translation_source_hash: 2dd66d68221f687237ac663fa2a360077a51b7cdf8ad74c16488a5934ee7927d
translation_quality: machine_v1
translation_lang: ja
translation_date: 2026-05-11T14:44:55.860891+00:00
---

# NAC3 + UiPath 統合ガイド

**NAC3 バージョン:** 2.2（v2.3 相互運用プレビュー含む）
**ステータス:** 安定版。UiPath Studio 23.10 + Web Automation v23.10 で動作確認済み。

UiPath の Web 自動化は現在、CSS セレクター・ビジュアルターゲティング・ハードコードされた座標を使って DOM をスクレイピングしています。NAC3 を導入すると、アプリ内のすべてのクリック可能なウィジェットが安定した `data-nac-id` を公開するため、UiPath はその ID で要素を指定でき、UI のデザイン変更にも容易に対応できます。

## NAC3 + UiPath を使う理由

| 現状の課題 | NAC3 による解決策 |
|--------------|---------|
| CSS 変更でセレクターが壊れる | `data-nac-id` はビジュアルデザイン変更後も安定 |
| ボタン移動後にアンカー／座標ターゲティングが失敗する | 同上 |
| テナントをまたいだ脆弱性（顧客ごとに異なる ID） | マニフェストが動詞を宣言し、ボットは動詞で呼び出す |
| 「要素の準備完了」待機が不安定 | `nac:action:succeeded` イベントは決定論的 |
| 多言語 UI ではロケールごとの自動化が必要 | `label_i18n` はロケール非依存。ボットはラベルではなく ID を使用 |

## 2 つの統合パス

### パス A -- Browser アクティビティ + JS インジェクション（推奨）

UiPath の `Inject JavaScript` アクティビティで `window.NAC.click(...)` を直接実行します。セレクター不要、脆弱性なし。

```vb
' UiPath シーケンス擬似コード
Open Browser https://your-app.example.com/
Inject JS: window.NAC.click('invoice.save')
Wait for Event: nac:action:succeeded
```

実装手順：

1. **Browser アクティビティ** -- 標準的な UiPath フロー。
2. **Inject JavaScript アクティビティ** -- ペイロード：
   ```js
   return await (async () => {
     const result = await window.NAC.click('@id@');
     return JSON.stringify(result);
   })();
   ```
3. 返された文字列を変数に **Assign** し、`{ok: true}` を確認するためにパースします。

動詞ベースのディスパッチの場合：

```js
await window.NAC.click_by_verb('@plugin@', '@verb@')
```

入力（fill）の場合：

```js
await window.NAC.fill('@id@', '@value@')
```

### パス B -- NAC 対応 xpath を使ったセレクターベース

UiPath プロファイルでセレクターを使いたい場合は、`data-nac-id` 属性を直接使用します：

```xml
<webctrl tag='button' attr='data-nac-id' value='invoice.save' />
```

同じロジックですが、UiPath のツリーエクスプローラー経由でブラウザー DOM を参照します。ツリーのタイミングに依存するためやや堅牢性は劣りますが、UiPath のイディオムを維持できます。

## UiPath ワークフローのサンプル

`Examples_NAC_Invoice.xaml`（公開後に Yujin マーケットプレイスからダウンロード可能）：

1. **Open Browser** -- NAC-3 準拠アプリのタブを対象にします。
2. **Wait for window.NAC3** -- 以下をインジェクト：
   ```js
   return new Promise(r => {
     const t = setInterval(() => {
       if (window.NAC) { clearInterval(t); r('ready'); }
     }, 100);
   });
   ```
3. **For Each Row** -- ソースデータテーブルを反復処理。
4. **Inject JS** -- 行ごとに：
   ```js
   await window.NAC.click_by_verb('invoice', 'new');
   await window.NAC.fill('invoice.client_name', @row("client")@);
   await window.NAC.fill('invoice.amount', @row("amount")@);
   await window.NAC.click_by_verb('invoice', 'save');
   ```
5. **Wait for** -- action_id='invoice.save' の nac:action:succeeded。
6. ループを **継続**。

アプリの複雑さに関わらず、フロー全体は 5 つのアクティビティで完結します。CSS セレクターベースの同等フローが通常 30〜50 アクティビティになるのと比較してください。

## ディスカバリー：マニフェストの読み取り

UiPath は自動化の前にマニフェストを内省できます：

```js
return window.NAC.describe();
```

プラグインツリー全体を返します。これを使って、.xaml を再デプロイせずにマニフェストの変更に適応する動的フローチャートを構築できます。

## プロベナンス（NAC-3）

UiPath は合成クリックをディスパッチするため、NAC3 の ack イベントでは `event.isTrusted === false` になります。`is_trusted` を条件に機密性の高い動詞（削除、支払い、管理者操作）をガードしているアプリは、デフォルトで UiPath のディスパッチを拒否します。

これらの動詞で RPA を有効にするには、ホストアプリ側で明示的にホワイトリスト登録が必要です：

```js
// ホストアプリの NAC ブートストラップ内：
window.__NAC_ALLOW_UNTRUSTED__ = ['invoice.save', 'invoice.send'];
```

アプリオーナーと脅威モデルについて議論してください。`isTrusted` をバイパスすると、仕様のなりすまし防止保証が無効になります。UiPath は管理された環境で動作するためトレードオフは通常許容範囲内ですが、必ず文書化してください。

## エラーハンドリング

NAC3 は構造化されたエラーをスローするため、UiPath で分岐処理が可能です：

```js
try {
  await window.NAC.click('invoice.save');
} catch (e) {
  return JSON.stringify({ ok: false, code: e.code, message: e.message });
}
```

| `e.code` | 意味 | UiPath の分岐処理 |
|----------|---------|---------------|
| `not_found` | 現在の DOM に ID が存在しない | `NAC.describe()` で再ディスカバリー |
| `invalid` | 引数の形式が不正 | ボットロジックのバグ、エスカレーション |
| `timeout` | 副作用が 5 秒以内に ack しなかった | N 回までリトライ |

## テスト済みマトリクス

CI 環境で UiPath 23.10 を使用し、[v21 データテーブルデモ](https://yujin.app/nac-spec/example-v21-data-table.php) に対して統合テストを実施しています。リファレンスワークフローはこのリポジトリの `tools/rpa/uipath/InvoiceFromCSV.xaml` にあります（近日公開予定）。

## 関連ドキュメント

- [SPEC.md セクション 5](../SPEC.md#5-public-api) -- NAC.* の完全な API サーフェス。
- [SECURITY.md](../SECURITY.md) -- isTrusted の脅威モデル。
- [LLM_WIRING.md](LLM_WIRING.md) -- RPA フローに音声／チャット入力も必要な場合は、LLM 仲介レイヤーを前段に組み込んでください。
- [NAC_TEST_MANUAL.md](../docs/NAC_TEST_MANUAL.md) -- Yujin がこのコントラクトをエンドツーエンドでテストする方法。

## ライセンス

Apache-2.0.

---

*This is a machine translation of the canonical English
version at `/nac-spec/guides/RPA_UIPATH.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
