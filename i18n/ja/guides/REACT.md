---
translation_source: guides/REACT.md
translation_source_hash: 9026b361e9e072347481a1f4492eea6f306e77cbbdb53b0d1a40d25008dbecdd
translation_quality: machine_v1
translation_lang: ja
translation_date: 2026-05-11T14:36:39.131780+00:00
---

# NAC3 + React 導入ガイド

このガイドでは、React アプリを NAC 駆動にするための2つのパスを説明します：

- **Greenfield：** 新規プロジェクト、最初から NAC3 を導入。
- **Brownfield：** 既存アプリ、リライトなしで NAC3 を段階的に追加。

どちらも npm の `@nac3/runtime` を使用します。ビルドステップの前提はなく、Vite、Next.js、Create React App、Remix、または通常のパッケージをバンドルする任意のツールで動作します。

---

## 1. インストール

```
npm install @nac3/runtime
```

このパッケージは、最初のインポート後にランタイムを `window.NAC` として公開します。
ランタイムはフレームワーク非依存です。React は JSX に `data-nac-*` 属性を付与し、`useEffect` 経由でマニフェストを登録するだけです。

---

## 2. Greenfield -- 新規アプリ

### 2.1 ランタイムを一度マウントする

ルートコンポーネント（または `main.tsx` / `_app.tsx`）に記述します：

```tsx
import { useEffect } from 'react';
import '@nac3/runtime';
import '@nac3/runtime/extensions';   // v2.0 brownfield プリミティブ + HMAC
// オプション: ボイス + チャットには '@nac3/runtime/chat-client'

export function App() {
  useEffect(() => {
    // テナントプレフィックス（マルチテナント SaaS パターン）。シングルテナントの場合は省略。
    if (window.NAC?.setTenantPrefix) {
      window.NAC.setTenantPrefix('demo');
    }
    // 署名済みマニフェストを使用する場合は HMAC シークレットを設定。認証 API から取得。
    // window.NAC.set_provenance_secret(secret);
  }, []);

  return <YourAppShell />;
}
```

### 2.2 コンポーネントを装飾する

クリック可能・入力可能・切り替え可能なすべての要素に以下を付与します：

- `data-nac-id` -- 安定したドット区切りのパス。
- `data-nac-role` -- 正規ロールのいずれか（SPEC セクション 1 参照）。
- `data-nac-action="<verb>"` -- `role="action"` の場合のみ。

```tsx
function InvoiceForm({ invoice, onSave, onCancel }) {
  return (
    <article data-nac-plugin="invoice">
      <input
        type="text"
        data-nac-id="invoice.client_name"
        data-nac-role="field"
        value={invoice.clientName}
        onChange={(e) => /* ... */}
      />

      <button
        data-nac-id="invoice.save"
        data-nac-role="action"
        data-nac-action="save"
        onClick={onSave}
      >
        Save
      </button>

      <button
        data-nac-id="invoice.cancel"
        data-nac-role="action"
        data-nac-action="cancel"
        onClick={onCancel}
      >
        Cancel
      </button>
    </article>
  );
}
```

### 2.3 マニフェストを登録する

マニフェストはエージェント向けの信頼できる情報源です。LLM が「guardar」を解決する際、ここで動詞 `save` を見つけます：

```tsx
import { useEffect } from 'react';

const INVOICE_MANIFEST = {
  plugin_slug: 'invoice',
  version: '1.0.0',
  nac_version: '2.1',
  elements: [
    {
      id: 'invoice.client_name',
      role: 'field',
      label_i18n: {
        es: 'Nombre del cliente', en: 'Customer name',
        pt: 'Nome do cliente', fr: 'Nom du client',
        it: 'Nome del cliente', de: 'Kundenname',
        ja: '顧客名', zh: '客户名称',
        hi: 'ग्राहक का नाम', ar: 'اسم العميل'
      }
    },
    {
      id: 'invoice.save',
      role: 'action',
      actions: [{
        verb: 'save',
        label_i18n: { /* 10 ロケール */ }
      }],
      label_i18n: { /* 10 ロケール */ }
    },
    {
      id: 'invoice.cancel',
      role: 'action',
      actions: [{
        verb: 'cancel',
        label_i18n: { /* 10 ロケール */ }
      }],
      label_i18n: { /* 10 ロケール */ }
    }
  ]
};

export function InvoiceForm(props) {
  useEffect(() => {
    if (!window.NAC) return;
    window.NAC.register(INVOICE_MANIFEST);
  }, []);
  // ... 2.2 の JSX ...
}
```

主なルール：

- `useEffect` に `[]` 依存配列を指定：マウント時に一度だけ登録。
- マニフェストは静的オブジェクトにする。レンダリングのたびに再生成しないこと（ランタイムは `register` をべき等として扱いますが、無駄なサイクルが発生します）。
- React Strict Mode では開発時にエフェクトが二重実行されます。ランタイムの `register` はべき等なので安全です。

### 2.4 ハンドラーから成功イベントを発行する

エージェントが `NAC.click()` を呼び出して完了を待つ場合、ハンドラーは副作用の後に `nac:action:succeeded` を発行する必要があります：

```tsx
function onSave() {
  await api.saveInvoice(/* ... */);
  document.dispatchEvent(new CustomEvent('nac:action:succeeded', {
    detail: { plugin: 'invoice', action_id: 'invoice.save' }
  }));
}
```

これは v2.1 のコントラクトです。v2.2 ではこれを自動化する `useNACAction` フックが提供されます（後述のフックセクション参照）。

### 2.5 動かしてみる

任意のエージェント、ボイスランナー、またはテストから：

```tsx
await window.NAC.click('invoice.save');
// または動詞で指定:
await window.NAC.click_by_verb('invoice', 'save');
// またはフィールドに入力:
await window.NAC.fill('invoice.client_name', 'Acme Corp');
```

---

## 3. Brownfield -- 既存 React アプリ

原則：一度にすべてをリファクタリングしない。一つのコンポーネントに NAC3 を追加し、検証してから繰り返す。

### 3.1 作業の順序

1. **まずトップレベルのラッパーから。** ルートの `<div>` または `<main>` に `data-nac-plugin="<your-app-slug>"` を追加します。ランタイムのスコープツリーがこれを検出します。
2. **次に最もよく使われるボタン。** 最も使用頻度の高い画面の Save、Cancel、Submit、Delete に `data-nac-id`、`data-nac-role="action"`、`data-nac-action="<verb>"` を追加します。この時点ではマニフェストはまだ不要です。
3. **ランタイムが認識しているか確認。** DevTools を開き、`NAC.describe()` を実行します。ボタンがプラグインスラッグの下に表示されるはずです。
4. **最小限のマニフェストを追加。** ステップ 2 のボタンと動詞だけを記述します。これで `NAC.click_by_verb()` が動作します。
5. **フィールドを追加。** 入力要素に `data-nac-role="field"` とマニフェストエントリを追加します。
6. **タブを追加。** タブ切り替えに `data-nac-role="tab"` を付与します。**重要：** `^tab\.` にマッチする id は必ずロール `tab` を持つ必要があります（ランタイムの `NAC.tab()` クエリは正規ロール専用です。SPEC セクション 1 参照）。

### 3.2 既存のコンポーネントライブラリと戦わない

おそらく shadcn / Mantine / MUI / Chakra / 独自システムを使用しているでしょう。これらの多くは独自の DOM をレンダリングします。2つのパターンが有効です：

**パターン A：NAC3 属性をそのまま渡す。** 多くの優れたライブラリは未知の props を基底の DOM 要素に転送します：

```tsx
<Button
  data-nac-id="invoice.save"
  data-nac-role="action"
  data-nac-action="save"
  onClick={onSave}
>
  Save
</Button>
```

ライブラリが `data-*` 属性を転送するなら、これで十分です。

**パターン B：ラッパーコンポーネント。** ライブラリが `data-*` props を吸収してしまう場合は、小さなラッパーを作成します：

```tsx
import { Button as MuiButton } from '@mui/material';
import { useEffect, useRef } from 'react';

interface NACButtonProps {
  nacId: string;
  verb: string;
  // ...その他の MUI props
}

export function NACButton({ nacId, verb, ...rest }: NACButtonProps) {
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    ref.current.setAttribute('data-nac-id', nacId);
    ref.current.setAttribute('data-nac-role', 'action');
    ref.current.setAttribute('data-nac-action', verb);
  }, [nacId, verb]);
  return <MuiButton ref={ref} {...rest} />;
}
```

### 3.3 DOM から自動登録する

マニフェストを手動で宣言するのが面倒な場合、v2.0 拡張の `autoRegister.watch` が DOM を走査し、`data-nac-id` + `data-nac-role` を持つ要素を自動的に登録します：

```tsx
useEffect(() => {
  if (!window.NAC?.autoRegister) return;
  const root = document.querySelector('[data-nac-plugin]');
  if (!root) return;
  root.setAttribute('data-nac-watch', '1');
  window.NAC.autoRegister.watch(root, {
    i18n_strict: 'permissive',  // 移行中は 10 ロケールの部分的な対応を許容
    throttleMs: 100
  });
}, []);
```

Brownfield では `i18n_strict: 'permissive'` が適切です。i18n カタログが完成したら、本番環境では `'strict'` に切り替えてください。

---

## 4. フック（v2.2 プレビュー）

これらは v2.2 で提供されます。v2.1 では今すぐプロジェクトにコピーして使用できます。v2.1 ランタイムをラップし、より React らしい API を提供します。

### 4.1 `useNACManifest`

```tsx
export function useNACManifest(manifest) {
  useEffect(() => {
    if (!window.NAC) return;
    window.NAC.register(manifest);
  }, [manifest.plugin_slug]);  // スラッグが変わった場合のみ再登録
}
```

### 4.2 `useNACAction` -- ack を自動発行

```tsx
import { useEffect, useRef } from 'react';

export function useNACAction(plugin: string, actionId: string) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    function onClick() {
      // React の onClick が完了した後に v2.1 コントラクトイベントを発行。
      // React の合成イベントが先に終わるようマイクロタスクで遅延。
      queueMicrotask(() => {
        document.dispatchEvent(new CustomEvent('nac:action:succeeded', {
          detail: { plugin, action_id: actionId }
        }));
      });
    }
    el.addEventListener('click', onClick);
    return () => el.removeEventListener('click', onClick);
  }, [plugin, actionId]);
  return ref;
}
```

使用例：

```tsx
function SaveButton({ onSave }) {
  const ref = useNACAction('invoice', 'invoice.save');
  return (
    <button
      ref={ref}
      data-nac-id="invoice.save"
      data-nac-role="action"
      data-nac-action="save"
      onClick={onSave}
    >
      Save
    </button>
  );
}
```

### 4.3 `useNACDescribe` -- パネルからツリーを内省する

```tsx
import { useState, useEffect } from 'react';

export function useNACDescribe() {
  const [snap, setSnap] = useState(null);
  useEffect(() => {
    if (!window.NAC) return;
    setSnap(window.NAC.describe());
    const tick = setInterval(() => setSnap(window.NAC.describe()), 1000);
    return () => clearInterval(tick);
  }, []);
  return snap;
}
```

---

## 5. テスト

### 5.1 ユニット + インテグレーション

NAC3 は React Testing Library と相性が良いです：

```tsx
import { render, fireEvent, waitFor } from '@testing-library/react';
import '@nac3/runtime';
import { InvoiceForm } from './InvoiceForm';

test('save button drives via NAC', async () => {
  render(<InvoiceForm />);

  const saved = jest.fn();
  document.addEventListener('nac:action:succeeded', saved);

  await window.NAC.click('invoice.save');

  await waitFor(() => expect(saved).toHaveBeenCalled());
});
```

### 5.2 エンドツーエンド（Playwright）

```ts
import { test, expect } from '@playwright/test';

test('invoice save', async ({ page }) => {
  await page.goto('/invoices/new');
  await page.evaluate(() => window.NAC.fill('invoice.client_name', 'Acme'));
  await page.evaluate(() => window.NAC.click('invoice.save'));
  await expect(page.getByText('Invoice saved')).toBeVisible();
});
```

---

## 6. よくある落とし穴

- **キー付きリストでの id の陳腐化。** 行インデックスから id を生成している場合（`data-nac-id={'row.' + i}`）、行が並び替えられると id をキャッシュしたエージェントが壊れます。安定したキー（DB の id）を使用してください。
- **条件付きレンダリング。** `if (loaded)` に基づいてマウント・アンマウントされるボタンは、ロード前にツリーをスナップショットした LLM を混乱させます。v2.1 では `NAC.describe()` が各要素に `mounted` フラグを常時含めるため、スナップショットの利用側でフィルタリングしてください。
- **React 18 Strict Mode。** エフェクトの二重実行によりマニフェストが再登録されます。ランタイムはべき等なので安全ですが、開発時にログが二重に出力されます。
- **サーバーコンポーネント / SSR。** NAC3 はクライアント専用です。NAC を使用するコンポーネントには `'use client'`（Next.js App Router）を付けるか、遅延レンダリングしてください。

---

## 7. 本番環境への移行

リリース前に：

1. `i18n_strict: 'permissive'` を `'strict'` に変更します。CI が翻訳漏れを検出します。
2. `npx @nac3/runtime validate ./src` を実行し、エラー重大度の検出結果がゼロであることを確認します。
3. Playwright テストから `NAC.validate_global()` を実行し、`[]` が返ることをアサートします。
4. マルチテナントの場合、マニフェストがサーバーサイドで HMAC 署名されており、`NAC.set_provenance_secret()` が認証済みコードから呼び出されていることを確認します。

---

## 8. 次のステップ

- 完全なコントラクトは `SPEC.md` を参照。
- 「guardar la factura」を `NAC.click_by_verb('invoice','save')` に解決する中間バックエンドについては `guides/LLM_WIRING.md` を参照。
- 脅威モデルについては `SECURITY.md` を参照。
- yujin.app/nac-spec/ のデモ（`example.php` は v1.9 のリファレンス、`example-v20-full.php` は Brownfield 移行のストーリー）。

---

*This is a machine translation of the canonical English
version at `/nac-spec/guides/REACT.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
