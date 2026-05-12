---
translation_source: guides/RPA_BLUE_PRISM.md
translation_source_hash: 7ab698b35a99ca25e77a07599f1aa733b4ba42eb08d0f3bce785a9b0c7f7e276
translation_quality: machine_v1
translation_lang: ja
translation_date: 2026-05-11T14:45:18.593834+00:00
---

# NAC3 + Blue Prism 統合ガイド

**NAC3 バージョン:** 2.2（v2.3 相互運用プレビュー付き）
**動作確認済み:** Blue Prism 7.1 + Browser Automation v7.1

Blue Prism の `Browser` ビジネスオブジェクトは、標準で `Inject JavaScript` を公開しています。NAC3 + Blue Prism は 5 段階のパターンで構成されます。

## ステージフロー

1. **Login Agent** -- 標準手順。
2. **Navigate** -- NAC 準拠アプリを開く。
3. **JS: wait for window.NAC3** -- 準備完了までポーリング。
4. **JS: NAC.click / fill / tab** -- 標準ディスパッチ。
5. **JS: read describe()** -- データフローの次のイテレーションに向けてマニフェストをイントロスペクト。

## サンプル VBO（Visual Business Object）

```
Object: NAC Driver
Action: Click NAC ID
  Inputs:
    - nacId (Text)
  Code (Inject JavaScript):
    (async () => {
      try {
        await window.NAC.click([nacId]);
        return JSON.stringify({ok:true});
      } catch (e) {
        return JSON.stringify({ok:false, code:e.code, message:e.message});
      }
    })()
  Outputs:
    - resultJson (Text)
```

対応アクション: `Click By Verb`、`Fill`、`Select`、`Tab`、
`Describe`、`WaitForAck`。

## ack 待機パターン

`NAC.click()` は内部で既に `nac:action:succeeded` を待機します（タイムアウト 5 秒）。Blue Prism では、さらに明示的な待機を重ねることができます。

```js
return new Promise(resolve => {
  let acked = false;
  document.addEventListener('nac:action:succeeded', function (e) {
    if (e.detail.action_id === '[expectedId]') {
      acked = true;
      resolve('ok');
    }
  }, { once: true });
  setTimeout(() => { if (!acked) resolve('timeout'); }, [timeoutMs]);
});
```

このパターンにより、標準の NAC3 イベントファミリーを Blue Prism のステージ出力として取り出せるため、プロセスフローの分岐に活用できます。

## ディスカバリー

`Read Manifest` アクション:

```js
return JSON.stringify(window.NAC.describe());
```

Collection にパイプします。これにより、ステージを再コンパイルすることなく、マニフェストのスキーマ変更にプロセスを適応させることができます。

## ライセンス + 関連情報

Apache-2.0。より包括的な解説については [RPA_UIPATH.md](RPA_UIPATH.md) を参照してください。

---

*This is a machine translation of the canonical English
version at `/nac-spec/guides/RPA_BLUE_PRISM.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
