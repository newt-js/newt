---
title: Adding a frontend
description: Serve a React app for a context from the same backend, at the context's own path.
sidebar:
  order: 5
---

A frontend is a web app that the backend serves next to its API. `newt add frontend` gives a context a React app, bundled by Bun and served at `/<context>`, with no separate server or build step.

## Add one

```sh
newt add frontend tasks
```

```txt
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

Run `bun install` for React, then `bun run dev`, and open http://localhost:3000/tasks.

The context must exist first. Each context has at most one frontend, at `/<context>`.

## What it writes

| File | What it is for |
|---|---|
| `frontend/index.html` | the page; it loads `main.tsx` |
| `frontend/main.tsx` | mounts the React app on `#root` |
| `frontend/app.tsx` | your app |
| `frontend/tsconfig.json` | TypeScript for the browser, with JSX and the DOM |
| `src/frontends.ts` | the frontends the backend serves |
| `src/frontends.test.ts` | checks that each one's page is served |

It also changes three files:

- `package.json`: adds `react`, `react-dom` and their types.
- `tsconfig.json`: leaves `src/contexts/*/frontend` out and references the frontend's own `tsconfig.json`, so `bun run typecheck` checks both.
- `src/backend.ts`: passes `frontend: frontends` to the server.

```ts title="src/contexts/tasks/frontend/app.tsx"
export function App() {
  return <h1>Tasks</h1>
}
```

## How it is served

```ts title="src/frontends.ts"
import type { FrontendMount } from '@newt-js/core/http'
import tasksFrontend from './contexts/tasks/frontend/index.html'

export const frontends: FrontendMount[] = [
  { path: '/tasks', app: tasksFrontend },
]
```

Importing an `.html` file gives Bun an HTML bundle: Bun bundles the page with its scripts and styles and serves the result.

- `/tasks` and every path under it, such as `/tasks/board/12`, answer with the page, so your app can have its own client-side routes.
- The API stays under `/api/`, next to it.

A `FrontendMount` takes:

| Field | What it is |
|---|---|
| `path` | where it is served, such as `/tasks` |
| `app` | an HTML import, or the folder of a built app |
| `publicFolder` | optional: a folder whose files are served as they are under `path` |

## While you develop

`bun run dev` restarts the backend when you change server code. The generated backend does not turn on Bun's development mode, so the page is bundled once: after you change the frontend, restart `bun run dev` to see it.

To get hot reloading in the browser, turn on `development` in `src/backend.ts`:

```ts title="src/backend.ts"
return runContexts(contexts, {
  platformWithoutContexts: platform,
  serve: { port, health: true, frontend: frontends, development: Bun.env.NODE_ENV !== 'production' },
})
```

Bun then rebuilds the page on every save and reloads it in the browser.

:::caution
Keep `development` off in production. In development mode Bun serves unminified code and shows its own page for unexpected errors.
:::

## Call the API

The page and the API share the origin, so call the API with a relative URL:

```tsx title="src/contexts/tasks/frontend/app.tsx"
import { useEffect, useState } from 'react'

type Task = { id: string, name: string }

export function App() {
  const [tasks, setTasks] = useState<Task[]>([])

  useEffect(() => {
    fetch('/api/tasks/tasks')
      .then(response => response.json())
      .then(page => setTasks(page.items))
  }, [])

  return (
    <ul>
      {tasks.map(task => <li key={task.id}>{task.name}</li>)}
    </ul>
  )
}
```

- The browser sends the backend's cookies with these requests, so a session cookie signs them in. See [authentication](/guides/authentication/).
- Until `src/auth.ts` signs someone in, the API answers 401 to the page too.
- A `POST`, `PUT`, `PATCH` or `DELETE` from the page passes the cross-origin check, because it comes from the backend's own origin.

:::tip
Read the `code` of an error answer, such as `task.not_found`, to decide what the page shows. See [errors](/concepts/errors/).
:::

## A frontend built elsewhere

If you build your frontend with another tool, the backend can serve the built folder instead:

```sh
newt add frontend tasks --built web/dist
```

- `--built` takes the folder that holds the built `index.html`.
- Build it for `/<context>/`, such as `vite build --base=/tasks/`, or its assets answer 404.
- Until that folder has an `index.html`, `/tasks` answers 503.
- Files that exist are served as they are. Any other path under `/tasks` gets `index.html`.
- Its HTML pages get a Content-Security-Policy and `X-Frame-Options: DENY`. Change the policy with the server's `csp` option.

The folder cannot be one that holds the backend, since everything in it would be served, `.env` included.

## Options

```sh
newt add frontend <context> [--built <folder>] [--backend <folder>]
```

| Option | What it does |
|---|---|
| `--built` | serves a folder built elsewhere, instead of writing a React app |
| `--backend` | which backend, in a monorepo with several |

See the [`newt add frontend` reference](/reference/cli/add-frontend/).
