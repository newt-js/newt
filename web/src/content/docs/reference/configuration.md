---
title: Configuration
description: Every file, script, environment variable and startup option a newt project configures.
sidebar:
  order: 5
---

This page lists everything you configure in a newt project: its files, its scripts, its environment variables and the options of the code that starts it. All of it is written by `newt init` and `newt add`; you change it by editing the files.

## Files

| File | What it configures |
|---|---|
| `package.json` | Scripts, dependencies, and the `overrides` the lint needs. |
| `.env` | Your environment variables. Bun loads it on its own. Ignored by git. |
| `.env.example` | The same variables without secrets, to commit. |
| `tsconfig.json` | TypeScript for the backend. |
| `eslint.config.ts` | The lint, [`@newt-js/lint`](/reference/lint/). |
| `src/index.ts` | Starts the backend on `PORT`. |
| `src/backend.ts` | `startBackend`: the platform, the contexts and the server. |
| `src/stores.ts` | How each context opens its database and its file storage. |
| `src/env.ts` | `requiredEnv(name)`: reads a variable or stops with `<NAME> is not set: see .env.example`. Only written when a store needs one. |
| `src/contexts.ts` | Which contexts the backend opens. |
| `src/auth.ts` | Who calls the backend: see [Authentication](/guides/authentication/). |
| `src/contexts/<context>/app/tsconfig.json` | TypeScript for a context's app (after `newt add frontend`). |

:::note
When a command adds variables, it appends the missing ones to `.env` and `.env.example` and never changes a value you already have.
:::

## Scripts

A single backend's `package.json`:

| Script | Runs | Does |
|---|---|---|
| `dev` | `bun --watch src/index.ts` | Starts the backend and restarts it on every change. |
| `start` | `bun src/index.ts` | Starts the backend. |
| `test` | `bun test` | Runs the tests. |
| `typecheck` | `bun check -b` | Type checks the backend and the projects it references (its contexts' apps). |
| `lint` | `bun --bun eslint` | Runs the lint with Bun. |

In a [monorepo](/guides/monorepo/), the root `package.json` has `dev`, `test`, `typecheck` and `lint`, each running `bun run --filter '*' <script>` in every workspace.

### Overrides

The lint's parser needs TypeScript 6's API, whatever TypeScript your project uses. So `package.json` pins it for the `typescript-eslint` packages:

```json title="package.json"
"overrides": {
  "typescript-eslint": {
    "typescript": "npm:@typescript/typescript6@6.0.2"
  },
  "@typescript-eslint/parser": {
    "typescript": "npm:@typescript/typescript6@6.0.2"
  }
}
```

The real list has nine entries: `typescript-eslint`, `@typescript-eslint/eslint-plugin`, `parser`, `project-service`, `tsconfig-utils`, `type-utils`, `typescript-estree`, `utils` and `ts-api-utils`. In a monorepo they live in the root `package.json`, the only one whose overrides Bun reads.

:::caution
Keep these overrides, even if your project uses another TypeScript. The lint's parser needs TypeScript 6, and they are what give it that version.
:::

## Environment variables

`<CONTEXT>` is the context's name in upper case with `-` as `_`: `tasks` gives `TASKS`, `web-session` gives `WEB_SESSION`. Which variables a project has depends on the `--db`, `--files` and `--cluster` you chose in [`newt init`](/reference/cli/init/).

When the backend starts with `stores: 'memory'` (its tests), it reads none of the database, files or cluster variables.

### Server

| Name | Meaning | Default | Example |
|---|---|---|---|
| `PORT` | The port the backend serves on. Read in `src/index.ts`. | `3000` | `PORT=3000` |

`newt init --port` writes it to `.env`.

### A context's host

| Name | Meaning | Default |
|---|---|---|
| `<CONTEXT>_HOST` | The host the context answers at, at its own paths, instead of under `/<context>`. See [A context on its own host](/guides/deploy/#a-context-on-its-own-host). | none |

### Database (`--db`)

| Name | With | Meaning | Default |
|---|---|---|---|
| `<CONTEXT>_DATABASE` | `sqlite` (default) | Path of the context's SQLite file. | `data/<context>.sqlite` |
| `<CONTEXT>_DATABASE_URL` | `postgres` | URL of the context's Postgres database. Required. | none |
| `<CONTEXT>_DATABASE_URL` | `mysql` | URL of the context's MySQL database. Required. | none |

What newt writes to `.env` for a context `tasks` in a backend `demo`, one line per database:

```sh
TASKS_DATABASE=data/tasks.sqlite
TASKS_DATABASE_URL=postgres://postgres:postgres@localhost:5432/demo__tasks
TASKS_DATABASE_URL=mysql://root:root@localhost:3306/demo__tasks
```

With `--db memory` there is no variable: data lives in memory and is lost on restart.

For Postgres and MySQL, newt writes a database name `<backend>__<context>` (both in lower case, other characters as `_`), so two backends never share one. You create that database on your server. See [Postgres](/guides/databases/postgres/) and [MySQL](/guides/databases/mysql/).

### Files (`--files`)

With `local` (default):

| Name | Meaning | Default | Example |
|---|---|---|---|
| `PUBLIC_URL` | The backend's public address, used to build file URLs. Required. | none (written as `http://localhost:<port>`) | `PUBLIC_URL=https://newthub.example.com` |
| `FILES_SECRET` | Key that signs file URLs. Required, 32 characters or more. | none (`newt init` writes a random one to `.env`, empty in `.env.example`) | `FILES_SECRET=f53a3e6c…` |
| `<CONTEXT>_FILES` | Folder where the context keeps its files. | `data/files/<context>` | `TASKS_FILES=data/files/tasks` |

With `s3`:

| Name | Meaning | Default | Example |
|---|---|---|---|
| `S3_ACCESS_KEY_ID` | Access key. Required. | none | |
| `S3_SECRET_ACCESS_KEY` | Secret key. Required. | none | |
| `S3_REGION` | Region. | `us-east-1` | `S3_REGION=eu-west-1` |
| `S3_ENDPOINT` | Endpoint of an S3-compatible service. | none | `S3_ENDPOINT=http://localhost:9000` |
| `<CONTEXT>_S3_BUCKET` | The context's bucket. Required. | none (written as `<backend>--<context>`) | `TASKS_S3_BUCKET=demo--tasks` |

:::danger[FILES_SECRET in production]
Give each deployment its own random secret of 32 characters or more, and never commit `.env`. Anyone with the secret can sign file URLs; changing it makes the URLs already given out stop working.
:::

With `--files memory` there is no variable. See [Files](/concepts/files/).

### Cluster (`--cluster`)

With `--cluster valkey`:

| Name | Meaning | Default | Example |
|---|---|---|---|
| `VALKEY_URL` | The Valkey (or Redis) server the instances share. | Bun's: `REDIS_URL`, then `valkey://localhost:6379` | `redis://localhost:6379` |

With `memory` (default) there is no variable. See [Running several instances](/guides/scaling/).

### Tests

With `--db postgres` or `--db mysql`:

| Name | Meaning | Default | Example |
|---|---|---|---|
| `TEST_DATABASE_URL` | A server where module tests may create and drop databases. Each test gets a new database with the context's migrations. | none: tests use a database in memory | `postgres://postgres:postgres@localhost:5432/postgres` |

It is read by `src/test-database.ts`, which only exists with Postgres or MySQL. With SQLite, module tests run the context's migrations on a SQLite database in memory. See [Testing](/guides/testing/).

## startBackend

`src/backend.ts` exports the function that starts everything:

```ts title="src/backend.ts"
export async function startBackend(
  port: number,
  { stores = 'configured' }: { stores?: Stores } = {},
): Promise<RunningContexts> {
  const platform = new Platform()
  const contexts = await openContexts(platform, stores)
  return runContexts(contexts, {
    platformWithoutContexts: platform,
    serve: { port },
  })
}
```

| Parameter | Meaning | Default |
|---|---|---|
| `port` | The port to serve on. | none (`src/index.ts` passes `PORT`, or `3000`) |
| `stores` | `'configured'` opens the stores from the environment; `'memory'` opens new ones in memory, as the tests want. | `'configured'` |

It returns `RunningContexts`: `server`, `servers` and `stop()`. See [HTTP API](/reference/http/).

## Platform

What every context of the backend shares. `new Platform(options?)`, from `@newt-js/core/application`:

| Option | Meaning | Default |
|---|---|---|
| `cluster` | What instances share: `new MemoryCluster()` or `new ValkeyCluster(url?)`. | `new MemoryCluster()` |
| `logger` | Where logs go. | `new ConsoleLogger()` |
| `observability` | Where traces and metrics go. | none (nothing recorded) |

`platform.useLogger(logger)` and `platform.useObservability(observability)` change them later. See [Logs and observability](/concepts/logs/).

## runContexts

`runContexts(contexts, options)`, from `@newt-js/core/http`, starts the contexts' workers and the server, and stops them on `SIGINT` and `SIGTERM`.

| Option | Meaning | Default |
|---|---|---|
| `serve` | The server's options (see the next table), without `routers`: it serves every context's router. | no shared server |
| `signals` | Stop on `SIGINT` and `SIGTERM`. | `true` |
| `stopTimeoutMs` | How long each step of the stop may take. | `8000` |
| `platformWithoutContexts` | The platform to use when there are no contexts. With contexts, it must be theirs. | none |

The `serve` options the generated project sets:

| Option | Meaning | Default |
|---|---|---|
| `port` | The port. Required. | none |
| `health` | Answers `GET /health-check` with `{ "status": "ok" }` (`503` and `"stopping"` while stopping), and `GET /<context>/health-check` for each context that serves routes. `false` turns it off. | on |

`serve` has more options (`maxBodyBytes`, `trustProxy`, `securityHeaders`, `hsts`, `csp`, `proxy`, `drainMs`, `idleTimeoutSeconds`, `development`, `publicFolder`, `routes`). See [HTTP API](/reference/http/).

## Context options

Each context builds a `ContextBase` in its `<context>.context.ts`:

```ts title="src/contexts/tasks/tasks.context.ts"
const base = new ContextBase({
  name: 'tasks',
  platform,
  database,
  storage: await openStorage('tasks', router, stores, host),
})
```

| Option | Meaning | Default |
|---|---|---|
| `name` | The context's name. No `:`. | none |
| `platform` | The shared platform. | none |
| `database` | The context's database, from `openDatabase`. | none |
| `storage` | `{ private?, public? }`: where its files go, from `openStorage`. | none |
| `clock` | The clock it reads time from. | the system clock |
| `worker` | The worker's settings: `concurrency`, `pollMs`, `leaseMs`, `backoffMs`, `maxBackoffMs`, `keepDoneMs`, `seenEveryMs`, `orphansCheckEveryMs`. | see [@newt-js/core](/reference/core/) |
| `writeRule` | `'off'`, `'warn'` or `'error'`: what happens when a use case writes to another module outside a worker, or saves two modules in one transaction. | `'error'` |
| `guardRule` | `'off'`, `'warn'` or `'error'`: what happens when a save reads tables but guards nothing. | `'error'` |
| `conflictRetries` | `{ times, duplicates, backoffMs }`: how a use case retries when its write conflicts. | `{ times: 3, duplicates: 1, backoffMs: 10 }` |

## TypeScript

```json title="tsconfig.json"
{
  "compilerOptions": {
    "lib": ["ESNext"],
    "target": "ESNext",
    "module": "Preserve",
    "moduleDetection": "force",
    "moduleResolution": "bundler",
    "types": ["bun"],
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,
    "noEmit": true,
    "strict": true,
    "skipLibCheck": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true
  },
  "include": ["**/*.ts"],
  "exclude": ["node_modules", "src/contexts/*/app"],
  "references": [{ "path": "./src/contexts/tasks/app" }]
}
```

`exclude` and `references` for the apps appear after `newt add frontend`. Each app has its own `tsconfig.json`, with `DOM` in `lib`, `"jsx": "react-jsx"` and `"composite": true`, so `bun check -b` checks it as a project of its own. Its `rootDir` is the context, and it includes the context's schemas with their value objects and errors, so the app type-checks the DTOs it imports.

## ESLint

```ts title="eslint.config.ts"
import { newt } from '@newt-js/lint'

export default newt({
  root: import.meta.dirname,
  contexts: { folder: 'src/contexts' },
})
```

Options and rules: [Lint rules](/reference/lint/).
