# NAC + React study case

A small React app that consumes `@nac3/runtime` from npm and ships a
chat panel + autopilot, built end-to-end as a reference adoption
example.

## What's inside

| File | Purpose |
|---|---|
| `package.json` | Vite + React 18 + `@nac3/runtime@^2.2.0` |
| `src/manifest.ts` | Two manifests: `todos` plugin + `chat` plugin, full 10-locale labels |
| `src/useNAC.ts` | `useNACManifest`, `useNACAction`, `useNacChat`, `useAutopilot` hooks |
| `src/App.tsx` | Todos UI + chat panel + autopilot toggle, all decorated with `data-nac-*` |
| `src/main.tsx` | Boots React + imports `@nac3/runtime` (runtime + extensions + chat client) |
| `vite.config.ts` | Dev proxy to `https://yujin.app/crm` so the chat backend is reachable in dev |

## Run it

```
cd packages/nac-react-demo
npm install
npm run dev
```

Open `http://localhost:5173`. Try:

- Type a todo and hit enter.
- Click `chat` in the topbar -> ask: *"agrega tomar agua"* -> the
  text you typed gets added.
- Click `tour` -> autopilot walks the page and narrates each
  section via TTS.
- From the browser console:
  ```js
  await window.NAC.click_by_verb('todos', 'add_todo');
  await window.NAC.fill('todos.input', 'walk the dog');
  await window.NAC.click('todos.add');
  ```

## What this demonstrates

- `@nac3/runtime` is a normal npm dep -- no special build config.
- Two-manifest pattern (one per logical plugin) keeps the agent
  tree readable as the app grows.
- The custom `NacChat.onAction()` overrides for `click`,
  `click_by_verb`, and `fill` route LLM-emitted actions through
  React's state instead of fighting it. Critical pattern for any
  framework with one-way data flow.
- Per-row dynamic `data-nac-id` (one per todo) makes individual
  rows NAC-driveable without bloating the static manifest. The
  runtime's `autoRegister.watch` (in `@nac3/runtime/extensions`)
  picks them up automatically.

## Going to production

- Set `window.NAC.STRICT_VALIDATION = true` after manifest
  registration so v2.2 register-time checks throw on drift.
- Replace `i18n_strict: 'permissive'` with `'strict'` once your
  10-locale catalogue is complete.
- Run `npx @nac3/runtime validate ./src` in CI -- expect zero error
  findings.

## See also

- The Yujin chat backend reference at
  `https://yujin.app/crm/api/v1/yujin/nac-demo` is what this demo
  proxies to in dev.
- `guides/REACT.md` in the spec repo for the full adoption guide.
- `packages/nac-angular-demo/` for the Angular mirror of this
  same app.
