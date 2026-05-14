# NAC + Angular study case

Angular 17 standalone app that consumes `@nac3/runtime` from npm.
Mirrors `packages/nac-react-demo/` for cross-framework parity.

## Run it

```
cd packages/nac-angular-demo
npm install
npm start
```

Open `http://localhost:4200`. Try the same flows as the React
demo: keyboard, chat ("agrega tomar agua"), voice mic, autopilot.

## What's in the box

| File | Purpose |
|---|---|
| `package.json` | Angular 17 standalone + `@nac3/runtime@^2.2.0` |
| `angular.json` | Vite-style application builder + dev proxy |
| `proxy.conf.json` | Routes `/crm/*` to `https://yujin.app` so the chat backend works in dev |
| `src/main.ts` | `bootstrapApplication(AppComponent)` + imports `@nac3/runtime` (runtime + extensions + chat client) |
| `src/styles.css` | Yujin design tokens |
| `src/app/manifest.ts` | `TODOS_MANIFEST` + `CHAT_MANIFEST`, full 10-locale labels |
| `src/app/nac.service.ts` | Thin Angular service over `window.NAC` + `window.NacChat` |
| `src/app/app.component.ts` | Standalone component using signals + onChatAction overrides |

## Pattern: `onChatAction` overrides

Same idea as the React demo: when the LLM emits an action that
should mutate Angular state (add a todo, toggle one, fill an
input), we register a custom handler so the side-effect goes
through `signal.update(...)` instead of DOM clicks. Without this,
the LLM's "agrega tomar agua" would dispatch a click on
`todos.add` but the input would still be empty in Angular's
state.

```ts
this.nac.onChatAction('click_by_verb', (a) => {
  if (a.plugin === 'todos' && a.verb === 'add_todo') {
    this.addTodo();
    return { ok: true };
  }
  throw new Error('verb not handled');
});
```

## Pattern: per-row dynamic ids

Each todo row gets a stable id derived from its DB id:

```html
<li *ngFor="let todo of todos()"
    [attr.data-nac-id]="'todos.' + todo.id">
  <button [attr.data-nac-id]="'todos.' + todo.id + '.delete'">delete</button>
</li>
```

`@nac3/runtime/extensions`'s `autoRegister.watch` picks them up
automatically. No need to extend the static manifest.

## Production checklist

- Set `window.NAC.STRICT_VALIDATION = true` after `ngOnInit` in
  `AppComponent` to enforce v2.2 register-time validation.
- Run `npx @nac3/runtime validate ./src` in CI; expect zero
  error-severity findings.
- For SSR (Angular Universal), guard NAC calls with
  `isPlatformBrowser(this.platformId)`.

## See also

- `packages/nac-react-demo/` for the React mirror.
- `yujin.app/nac-spec/guides/ANGULAR.md` for the full adoption
  guide (greenfield + brownfield + component-library patterns +
  Karma + Playwright testing + gotchas).
