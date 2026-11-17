---
title: Monorepos
description: Keep several newt backends in one repository, each in its own folder.
sidebar:
  order: 6
---

A monorepo is one repository that holds several packages. With newt, each backend is a package of its own (a Bun *workspace*), and the root runs the scripts of all of them.

Use one when you run more than one backend, such as the Newthub API and an admin backend. One backend with several contexts does not need it.

## Create one

```sh
newt init newthub --monorepo
```

```txt
  created  newthub/package.json
  created  newthub/AGENTS.md
  created  newthub/.gitignore
  created  newthub/CLAUDE.md
  created  newthub/apps/api/package.json
  created  newthub/apps/api/tsconfig.json
  created  newthub/apps/api/eslint.config.ts
  created  newthub/apps/api/AGENTS.md
  created  newthub/apps/api/src/backend.ts
  created  newthub/apps/api/src/stores.ts
  created  newthub/apps/api/src/env.ts
  created  newthub/apps/api/src/backend.test.ts
  created  newthub/apps/api/src/contexts.ts
  created  newthub/apps/api/src/index.ts
  created  newthub/apps/api/src/auth.ts
  created  newthub/apps/api/.env
  created  newthub/apps/api/.env.example
  created  newthub/apps/api/.gitignore
  created  newthub/apps/api/CLAUDE.md

Next steps:
  cd newthub
  bun install
  bun run dev
```

`bun create newt newthub --monorepo` does the same. Without a name, in a terminal, `newt init` asks whether you want a backend or a monorepo.

The first backend goes in `apps/api`. Pick another folder with `--backend`:

```sh
newt init newthub --monorepo --backend apps/core
```

`--port`, `--db`, `--files` and `--cluster` apply to that first backend, as in a plain `newt init`. See [installation](/start/installation/#options-of-newt-init).

## The layout

```txt
newthub/
├── package.json        workspaces and scripts for all backends
├── AGENTS.md
├── CLAUDE.md
├── .gitignore
└── apps/
    ├── api/            a full newt backend
    │   ├── package.json
    │   ├── .env
    │   ├── src/
    │   └── …
    └── admin/          another one, added later
```

Each backend folder is the same as a project made by `newt init`: its own `package.json`, `.env`, `src/` and `data/`. See [project structure](/start/project-structure/).

The root `package.json`:

```json title="package.json"
{
  "name": "newthub",
  "private": true,
  "workspaces": ["apps/*"],
  "scripts": {
    "dev": "bun run --filter '*' dev",
    "test": "bun run --filter '*' test",
    "typecheck": "bun run --filter '*' typecheck",
    "lint": "bun run --filter '*' lint"
  },
  "devDependencies": {
    "@newt-js/cli": "^0.0.0",
    "typescript": "7.0.2"
  }
}
```

- `bun install` at the root installs every backend.
- `bun run dev`, `test`, `typecheck` and `lint` at the root run in every backend.
- Inside a backend's folder, the same scripts run for that backend only.
- The root also holds `overrides` for the lint's TypeScript, because Bun reads overrides only from the root.

## Add a backend

From anywhere inside the monorepo:

```sh
newt add backend apps/admin
```

```txt
  skipped  package.json (up to date)
  created  apps/admin/package.json
  created  apps/admin/tsconfig.json
  …
  created  apps/admin/CLAUDE.md

Next steps:
  bun install
  cd apps/admin
  bun run dev
```

- The folder's name becomes the package name, here `admin`. Two packages cannot share a name.
- If no workspace pattern covers the folder, newt adds one to the root `package.json`.
- Each new backend gets the next free port: 10 above the highest one in use. The second backend serves on `3010`.
- `newt add backend` takes `--port`, `--db`, `--files` and `--cluster`, with the same defaults as `newt init`.

:::caution
If you give `--port` a port another backend uses, newt warns you: a request could reach either one. Give one of them another `PORT` in its `.env`.
:::

## Run `newt` in a monorepo

Every `newt add` command works on one backend. newt picks it like this:

1. With `--backend <folder>`, that backend.
2. Inside a backend's folder, that backend.
3. At the root with only one backend, that one.
4. Otherwise it stops and asks for `--backend`.

```sh
newt add context chat
```

```txt
Which backend? This monorepo has apps/admin, apps/api: add --backend apps/admin
```

```sh
newt add context chat --backend apps/api
```

:::tip
`cd` into the backend you work on. Then every command finds it without `--backend`.
:::

## What newt refuses

| You run | newt says |
|---|---|
| `newt init` with `--backend` but no `--monorepo` | add `--monorepo` |
| `newt init` inside a monorepo | use `newt add backend` |
| `newt init --monorepo` in a backend's folder | a monorepo needs a folder of its own |
| `newt add backend` outside a monorepo | use `newt init` |
| `newt add backend` in a folder that is another package | use a folder of its own |

To turn an existing backend into a monorepo, create the monorepo in a new folder and move the backend into it by hand.

## Options

```sh
newt init [name] --monorepo [--backend <folder>] [--port <port>] [--db <database>] [--files <storage>] [--cluster <cluster>]
newt add backend <folder> [--port <port>] [--db <database>] [--files <storage>] [--cluster <cluster>]
```

See the [`newt init`](/reference/cli/init/) and [`newt add backend`](/reference/cli/add-backend/) references.
