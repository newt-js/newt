---
title: newt init
description: Creates a backend, or a monorepo with a first backend, in a new folder or in the current one.
sidebar:
  order: 1
---

`newt init` creates a new project: one backend, or a monorepo (several packages in one repository) with its first backend.

## Usage

```sh
newt init [name] [options]
bun create newt [name] [options]
```

## Arguments

| Argument | Meaning |
|---|---|
| `name` | The project's folder and package name. `.` uses the current folder and names the package after it. |

Without a name, in an interactive terminal, `newt init` asks for it (suggesting `my-app`) and then asks `A backend or a monorepo?`. Without a terminal, or with `--json`, the name is required.

## Options

| Option | Default | Meaning |
|---|---|---|
| `--db <database>` | `sqlite` | `sqlite`, `postgres`, `mysql` or `memory` |
| `--files <storage>` | `local` | `local`, `s3` or `memory` |
| `--cluster <cluster>` | `memory` | `memory` or `valkey`: what the backend's instances share |
| `--port <port>` | `3000` | The port it serves on, 1 to 65535 |
| `--monorepo` | off | Makes a monorepo, empty unless `--backend` is given |
| `--backend <folder>` | none | The first backend's folder, as `apps/api`; with `--monorepo` only |

It also takes the [global flags](/reference/cli/overview/#global-flags).

- `--db` and `--files` decide what every context of the backend opens. See [Database and migrations](/concepts/database/) and [Files](/concepts/files/).
- `--cluster valkey` is for [running several instances](/guides/scaling/). Tests still use the memory cluster.

## Name rules

- Lowercase letters, digits and `- . _ ~`, with a letter or digit at each end. At most 214 characters. Not `node_modules`.
- A name that breaks them is refused with a suggestion: `My App` suggests `my-app`.
- `--backend` must be a folder inside the monorepo, and its last part follows the same rules.

## What it writes

```sh
newt init newthub
```

```text
  created  newthub/package.json
  created  newthub/tsconfig.json
  created  newthub/eslint.config.ts
  created  newthub/AGENTS.md
  created  newthub/src/backend.ts
  created  newthub/src/stores.ts
  created  newthub/src/env.ts
  created  newthub/src/backend.test.ts
  created  newthub/src/contexts.ts
  created  newthub/src/index.ts
  created  newthub/src/auth.ts
  created  newthub/.env
  created  newthub/.env.example
  created  newthub/.gitignore
  created  newthub/CLAUDE.md

Next steps:
  cd newthub
  bun install
  bun run dev
```

| File | When |
|---|---|
| `src/env.ts` | When the stores need variables: `--db postgres`, `--db mysql`, `--files local` or `--files s3` |
| `src/test-database.ts` | With `--db postgres` or `--db mysql` |
| `.env`, `.env.example` | Always: `PORT`, plus the variables of `--files` and `--cluster` |

What each file is for: [Project structure](/start/project-structure/). Every variable: [Configuration](/reference/configuration/).

With `--monorepo`, it also writes the root's `package.json`, `AGENTS.md`, `.gitignore` and `CLAUDE.md`, and puts the backend in `--backend`, if given; without it, the monorepo is empty, its workspaces taking `apps/`.

### In a folder that has files

`newt init .` or a folder that exists works too:

- Files already there are kept (`skipped`). `package.json` and `.env` only get what they lack.
- A `tsconfig.json`, `src/index.ts` or `src/auth.ts` that lacks what newt needs is kept, with a warning that says what to add.
- The `index.ts` that `bun init` writes, if unchanged, is removed, with its `"module"` key in `package.json`: the backend starts at `src/index.ts`.
- If the folder is a backend already, its database, files, cluster and `PORT` are kept over the options, with a warning for each that differs.
- Another `eslint.config.*` in the folder gives a warning.

## Next steps

1. `cd <name>` (unless you used `.`)
2. `bun install`
3. `bun run dev`

## Errors

- **A bad name**: `'<name>' cannot name a folder and a package`, with a suggestion.
- **More than one name**: `newt init takes one name`.
- **`--backend` without `--monorepo`**: refused; add `--monorepo`.
- **Inside a monorepo**: refused; use [`newt add backend`](/reference/cli/add-backend/) instead.
- **Inside another backend**: refused; make the project in a folder of its own.
- **`--monorepo` on a backend folder**: refused; a monorepo goes in a folder of its own.
- **A bad `--db`, `--files`, `--cluster` or `--port`**: refused, listing the accepted values.
