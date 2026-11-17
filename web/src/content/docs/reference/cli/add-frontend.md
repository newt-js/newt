---
title: newt add frontend
description: Adds a React frontend to a context, served by the backend at /<context>.
sidebar:
  order: 14
---

`newt add frontend` adds a web page to a context, served by the same backend at `/<context>`, such as `/tasks`. It writes a small React app that Bun bundles, or serves one you build elsewhere.

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
| `--built <folder>` | none | Serve a frontend built elsewhere, from the folder of its `index.html` |
| `--backend <folder>` | the one you are in | The backend, in a monorepo with several |

It also takes the [global flags](/reference/cli/overview/#global-flags).

- Without `--built`, newt writes a React app in `src/contexts/<context>/frontend/`.
- With `--built`, the folder must be built for `/<context>/`, as in `vite build --base=/<context>/`. Its path is relative to where you run the command.

## What it writes

```sh
newt add frontend tasks
```

```text
  created  src/contexts/tasks/frontend/index.html
  created  src/contexts/tasks/frontend/main.tsx
  created  src/contexts/tasks/frontend/app.tsx
  created  src/contexts/tasks/frontend/tsconfig.json
  updated  package.json
  updated  tsconfig.json
  created  src/frontends.ts
  created  src/frontends.test.ts
  updated  src/backend.ts

Next steps:
  bun install
  bun run dev, and open /tasks
```

```ts title="src/frontends.ts"
import type { FrontendMount } from '@newt-js/core/http'
import tasksFrontend from './contexts/tasks/frontend/index.html'

export const frontends: FrontendMount[] = [
  { path: '/tasks', app: tasksFrontend },
]
```

- `package.json` gets `react` and `react-dom`, with `@types/react` and `@types/react-dom` as devDependencies.
- `tsconfig.json` leaves the frontend folders out and references the frontend's own `tsconfig.json`.
- `src/backend.ts` passes `frontend: frontends` to `serve`.
- With `--built web/dist`, only `src/frontends.ts`, `src/frontends.test.ts` and `src/backend.ts` change, and the mount is `{ path: '/tasks', app: join(import.meta.dir, '../web/dist') }`.

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
- **`/<context>` already serves another frontend in `src/frontends.ts`**: refused; take that one out first.
- **A `--built` folder that holds the backend**: refused, since everything in it would be served, `.env` too.

:::danger
Point `--built` at the build output only, such as `web/dist`. Whatever is in that folder is public.
:::

See [Adding a frontend](/guides/frontend/).
