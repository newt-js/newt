---
title: Adding a frontend
description: Give a context a React app, served by the same backend at the context's own path.
sidebar:
  order: 5
---

A context's app is a web app that the backend serves next to the context's API. `newt add frontend` gives a context a React app, bundled by Bun and served at `/<context>`, with no separate server or build step.

## Add one

```sh
newt add frontend tasks
```

```txt
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

Run `bun install` for React, then `bun run dev`, and open http://localhost:3000/tasks.

The context must exist first. Each context has at most one app, at `/<context>`.

## What it writes

| File | What it is for |
|---|---|
| `app/index.html` | the page; it loads `main.tsx` |
| `app/main.tsx` | mounts the React app on `#root` |
| `app/app.tsx` | your app |
| `app/base.ts` | where the app is served, `/tasks`, and its API, `/tasks/api` |
| `app/tsconfig.json` | TypeScript for the browser, with JSX, the DOM and the context's schemas |

It also changes four files:

- `package.json`: adds `react`, `react-dom` and their types.
- `tsconfig.json`: leaves `src/contexts/*/app` out and references the app's own `tsconfig.json`, so `bun run typecheck` checks both.
- `src/contexts/tasks/tasks.context.ts`: hands its app to run, next to its router.
- `src/backend.test.ts`: checks that the app's page is served.

```ts title="src/contexts/tasks/app/app.tsx"
export function App() {
  return <h1>Tasks</h1>
}
```

## How it is served

The context hands its app to run, next to its router:

```ts title="src/contexts/tasks/tasks.context.ts"
import app from './app/index.html'

  static async open(platform: Platform, stores: Stores): Promise<ContextToRun> {
    // …
    return { context: new Tasks_Context(base, tasksModules(base, router)), router, app }
  }
```

`app` is an HTML import or the folder of a built app. Importing an `.html` file gives Bun an HTML bundle: Bun bundles the page with its scripts and styles and serves the result.

- `/tasks` and every path under it, such as `/tasks/board/12`, answer with the page, so your app can have its own client-side routes.
- `/tasks/api/…` stays the context's API, and `/tasks/health-check` its health: a path there that no route takes is a 404, never the page.
- Two contexts' apps never meet: each one is under its own context.

## While you develop

`bun run dev` restarts the backend when you change server code. The generated backend does not turn on Bun's development mode, so the page is bundled once: after you change the frontend, restart `bun run dev` to see it.

To get hot reloading in the browser, turn on `development` in `src/backend.ts`:

```ts title="src/backend.ts"
return runContexts(contexts, {
  platformWithoutContexts: platform,
  serve: {
    port,
    development: Bun.env.NODE_ENV !== 'production',
  },
})
```

Bun then rebuilds the page on every save and reloads it in the browser.

:::caution
Keep `development` off in production. In development mode Bun serves unminified code and shows its own page for unexpected errors.
:::

## Call the API

The page and the API share the origin, so call the API by its path. `base.ts` holds it, and the app imports the types of its context's schemas, so it never copies a DTO by hand:

```tsx title="src/contexts/tasks/app/app.tsx"
import { useEffect, useState } from 'react'
import type { TaskDTO } from '../modules/task/task.schema'
import { API } from './base'

export function App() {
  const [tasks, setTasks] = useState<TaskDTO[]>([])

  useEffect(() => {
    fetch(`${API}/tasks`)
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

- The app imports its own files and, with `import type`, its context's schemas: never the server's code. The [`frontend-imports`](/reference/lint/#newtfrontend-imports) rule checks it.
- Give a client-side router `BASE` as its base, such as React Router's `basename`.

## An app built elsewhere

If you build your app with another tool, the context can serve the built folder instead:

```sh
newt add frontend tasks --built web/dist
```

- `--built` takes the folder that holds the built `index.html`.
- Build it for `/<context>/`, such as `vite build --base=/tasks/`, or its assets answer 404.
- Until that folder has an `index.html`, `/tasks` answers 503.
- Files that exist are served as they are. Any other path under `/tasks` gets `index.html`.
- The context hands it to run as `app: join(import.meta.dir, '../../../web/dist')`, from its own folder.
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
