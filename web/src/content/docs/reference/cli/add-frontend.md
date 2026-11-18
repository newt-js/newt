---
title: newt add frontend
description: Adds a React app to a context, served by the backend at /<context>.
sidebar:
  order: 14
---

`newt add frontend` gives a context its app, served by the same backend at `/<context>`, such as `/tasks`. It writes a small React app that Bun bundles, or serves one you build elsewhere.

## Usage

```sh
newt add frontend <context> [options]
```

## Arguments

| Argument | Meaning |
|---|---|
| `context` | A context of the backend, as in `tasks` |

## Options

| Option | Default | Meaning |
|---|---|---|
| `--built <folder>` | none | Serve an app built elsewhere, from the folder of its `index.html` |
| `--backend <folder>` | the one you are in | The backend, in a monorepo with several |

It also takes the [global flags](/reference/cli/overview/#global-flags).

- Without `--built`, newt writes a React app in `src/contexts/<context>/app/`.
- With `--built`, the folder must be built for `/<context>/`, as in `vite build --base=/<context>/`. Its path is relative to where you run the command.

## What it writes

```sh
newt add frontend tasks
```

```text
  created  src/contexts/tasks/app/index.html
  created  src/contexts/tasks/app/main.tsx
  created  src/contexts/tasks/app/app.tsx
  created  src/contexts/tasks/app/base.ts
  created  src/contexts/tasks/app/tsconfig.json
  updated  package.json
  updated  tsconfig.json
  updated  src/contexts/tasks/tasks.context.ts
  updated  src/backend.test.ts

Next steps:
  bun install
  bun run dev, and open /tasks
```

```ts title="src/contexts/tasks/tasks.context.ts"
import app from './app/index.html'
// …
    return { context: new Tasks_Context(base, tasksModules(base, router)), router, host, app }
```

- `app/base.ts` holds where the app is served, `BASE`, and its API, `API`.
- `app/tsconfig.json` takes the context's schemas, their value objects and errors too, so the app type-checks the DTOs it imports.
- `package.json` gets `react` and `react-dom`, with `@types/react` and `@types/react-dom` as devDependencies.
- `tsconfig.json` leaves the app folders out and references the app's own `tsconfig.json`.
- `src/backend.test.ts` gets a test that the app's page is served.
- With `--built web/dist`, only `tasks.context.ts` and `src/backend.test.ts` change: the context hands `app: join(import.meta.dir, '../../../web/dist')`, and the test runs once the folder has an `index.html`.

## Warnings

- With `--built`, a folder without `index.html` yet: the backend answers 503 at `/<context>` until it is built.

## Next steps

Without `--built`:

1. `bun install`
2. `bun run dev`, and open `/<context>`

With `--built`: build it into the folder for `/<context>/`, or its assets answer 404. Then `bun run dev` and open `/<context>/`.

## Errors

- **Missing context**: `newt add frontend takes the context, as in newt add frontend sales`.
- **A context the backend does not have**: refused; add it with [`newt add context`](/reference/cli/add-context/).
- **The context hands an app already, in `<context>.context.ts`**: refused; take that one out first.
- **A `--built` folder that holds the backend**: refused, since everything in it would be served, `.env` too.

:::danger
Point `--built` at the build output only, such as `web/dist`. Whatever is in that folder is public.
:::

See [Adding a frontend](/guides/frontend/).
