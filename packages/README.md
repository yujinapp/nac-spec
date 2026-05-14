# packages/

Adoption study cases for `@nac3/runtime`.

| Package | Stack |
|---|---|
| [nac-react-demo](./nac-react-demo/) | Vite + React 18 standalone app, ~250 lines, consumes `@nac3/runtime` from npm. |
| [nac-angular-demo](./nac-angular-demo/) | Angular 17 standalone mirror of the React study case. Same UI, same flows, framework-shaped service + signals. |

Each package is self-contained:

```bash
cd packages/nac-react-demo
npm install
npm run dev          # http://localhost:5173
```

Both apps run against the production Yujin chat backend (proxied
through `https://yujin.app/crm`). No backend setup required.

Useful side-by-side reference for shop-internal "should we use
React or Angular" decisions.
