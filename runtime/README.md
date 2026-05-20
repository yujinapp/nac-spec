# @nac3/runtime

**Native Agent Contract** -- a small public spec + reference runtime
that lets web UIs be driven by AI assistants, voice runners, and
accessibility tools without per-app glue code.

```
npm install @nac3/runtime
```

## What you get

- The reference runtime (`window.NAC` API).
- The v2.0 brownfield extensions (scope tree, ephemeral capture,
  HMAC, isTrusted).
- A reference chat client that wires voice + LLM + dispatcher.
- A CLI (`npx nac validate <dir>`) that statically lints HTML/PHP
  for NAC contract violations.
- TypeScript types.

## Hello world (vanilla)

```html
<script type="module">
  import '@nac3/runtime';
  // Now window.NAC is ready.
  NAC.register({
    plugin_slug: 'demo',
    nac_version: '2.1',
    elements: [
      { id: 'demo.greet', role: 'action',
        actions: [{ verb: 'greet',
                    label_i18n: { es: 'Saludar', en: 'Greet',
                                  pt: 'Saudar', fr: 'Saluer',
                                  it: 'Saluta', de: 'Begrussen',
                                  ja: '挨拶', zh: '问候',
                                  hi: 'namaste', ar: 'حيي' } }] }
    ]
  });
</script>

<button data-nac-id="demo.greet" data-nac-role="action"
        data-nac-action="greet" onclick="alert('hi')">
  Greet
</button>
```

Now any agent can drive the button:

```js
await NAC.click('demo.greet');
// or by verb:
await NAC.click_by_verb('demo', 'greet');
```

## React

See `guides/REACT.md` in the spec repo for the full story; minimal
shape:

```jsx
import { useEffect } from 'react';
import '@nac3/runtime';

export function Greet() {
  useEffect(() => {
    window.NAC.register({
      plugin_slug: 'demo', nac_version: '2.1',
      elements: [{ id: 'demo.greet', role: 'action',
                   actions: [{ verb: 'greet', label_i18n: {/* ...10 locales... */} }] }]
    });
  }, []);

  return (
    <button
      data-nac-id="demo.greet"
      data-nac-role="action"
      data-nac-action="greet"
      onClick={() => alert('hi')}
    >
      Greet
    </button>
  );
}
```

## CLI

```
npx @nac3/runtime validate ./src
```

Static lint over your HTML/PHP. Reports:

- `tab_role_drift` -- a `data-nac-id="tab.X"` without
  `data-nac-role="tab"`.
- `manifest_role_unknown` -- a manifest element with a role outside
  the canonical set.
- `manifest_dom_role_mismatch` -- the manifest declares a role that
  contradicts the DOM role on the same id.
- `tab_id_manifest_role_drift` -- manifest entry id like `tab.X`
  but the entry's role isn't `'tab'`.

Exit codes:

- `0` -- no findings at the configured severity (default `error`).
- `1` -- findings at or above the configured severity.
- `2` -- target not found / argument error.

## Subpath imports

```js
import NAC               from '@nac3/runtime';
import '@nac3/runtime/extensions';     // v2.0 brownfield primitives
import '@nac3/runtime/chat-client';    // reference voice + chat client
```

## Status

- **v2.3 stable** (current). `syncPlugin` idempotent registration,
  `data-nac-plugin-id` instance uniqueness. Validated across a
  600-run benchmark across 5 models x 3 protocols. See
  [`yujinapp/nac-spec/benchmark/`](https://github.com/yujinapp/nac-spec/tree/main/benchmark/).
- v2.4 in RFC (snapshot versioning + agent authority). Code for V24-04
  is merged with enforcement opt-in (`STRICT_VERSIONING=false` by
  default). See
  [`yujinapp/nac-spec/rfcs/`](https://github.com/yujinapp/nac-spec/tree/main/rfcs/).

## Spec

`SPEC.md` is included in the package. The canonical spec lives at
[yujin.app/nac-spec](https://yujin.app/nac-spec/).

## License

Apache-2.0. See `LICENSE`.

## Repository

[github.com/yujinapp/nac-spec](https://github.com/yujinapp/nac-spec)
(directory: `packages/nac`)

## Author

[Yujin](https://rpaforce.com)
