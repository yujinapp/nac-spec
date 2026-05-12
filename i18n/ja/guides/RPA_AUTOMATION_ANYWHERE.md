---
translation_source: guides/RPA_AUTOMATION_ANYWHERE.md
translation_source_hash: 165e60e4b3922f8353a3f038d815452ebf9ba7d597cb68f8c313eb47cb416eab
translation_quality: machine_v1
translation_lang: ja
translation_date: 2026-05-11T14:45:08.997917+00:00
---

# NAC3 + Automation Anywhere 統合ガイド

**NAC3 バージョン:** 2.2（v2.3 相互運用プレビュー含む）
**動作確認済み:** Automation Anywhere A2019 + A360

## 2つのパス -- AA エディションに応じて選択

### パス A -- A360 + Web Recorder + Run JavaScript

AA の `Run JavaScript Function` アクションは、アクティブなブラウザタブに対してコードを注入します。

```js
// payload variable: NAC_ID = "invoice.save"
async function nacClick(id) {
  await window.NAC.click(id);
  return 'ok';
}
return nacClick($NAC_ID$);
```

入力変数（`$NAC_ID$`、`$VALUE$`）はデザイン時にバインドします。アクションは文字列を返し、ボットはその値で分岐処理を行います。

### パス B -- A2019 + Object Cloning とカスタム属性

A2019 の `Object Cloning` は従来、DOM プロパティを対象に動作します。プロパティセレクターを次のように設定してください：

```
HTML.Attribute: data-nac-id
Search value: invoice.save
```

パス A と比べると堅牢性は劣ります（DOM ツリーのタイミングに依存するため）が、既存の A2019 ボットのフローを書き直すことなく NAC3 を導入できます。

## 標準 8 アクション ボットテンプレート

v21 請求書デモ用：

| ステップ | アクション | ペイロード |
|------|--------|---------|
| 1 | Open Browser | https://your-app.example.com/ |
| 2 | Wait | `window.NAC` の準備完了まで待機（JS ポーリング） |
| 3 | Loop CSV | 行データ |
| 4 | Run JS | `await window.NAC.click_by_verb('invoice','new')` |
| 5 | Run JS | `await window.NAC.fill('invoice.client',$row.client$)` |
| 6 | Run JS | `await window.NAC.fill('invoice.amount',$row.amount$)` |
| 7 | Run JS | `await window.NAC.click_by_verb('invoice','save')` |
| 8 | End Loop | -- |

UI の複雑さに関わらず 8 アクションで完結します。CSS セレクターを使ったフローでは通常 30〜60 アクション必要なことと比較してください。

## `NAC.describe()` によるディスカバリー

```js
return JSON.stringify(window.NAC.describe());
```

マニフェストツリーを返します。AA は `JSON Parse` でパースし、動的なフローチャートを構築できます。

## プロベナンスと isTrusted

AA は合成クリックをディスパッチします。ホストアプリは、明示的にホワイトリストに登録されていない限り、機密性の高い動詞（delete、payment など）を拒否する場合があります。ホスト側のオプトインパターンについては、`RPA_UIPATH.md` の「Provenance」セクションを参照してください。AA にも同様のパターンが適用されます。

## エラーハンドリング

すべての JS 呼び出しを `try/catch` でラップし、JSON を返すようにしてください：

```js
try {
  await window.NAC.fill('@id@', '@value@');
  return JSON.stringify({ok: true});
} catch (e) {
  return JSON.stringify({ok: false, code: e.code, message: e.message});
}
```

`If` アクションでパース済みの JSON を基に分岐処理を行います。

## ライセンスと関連情報

Apache-2.0。より詳細な解説は [RPA_UIPATH.md](RPA_UIPATH.md) を参照してください。記載されているパターンはそのまま転用できます。

---

*This is a machine translation of the canonical English
version at `/nac-spec/guides/RPA_AUTOMATION_ANYWHERE.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
