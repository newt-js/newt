---
title: newt add backend
description: Adds another backend to a monorepo, in a folder of its own.
sidebar:
  order: 2
---

`newt add backend` adds a backend to a monorepo made with `newt init --monorepo`. Each backend is a separate package with its own contexts, port and `.env`.

## Usage

```sh
newt add backend <folder> [options]
```

## Arguments

| Argument | Meaning |
|---|---|
| `folder` | Where the backend goes, inside the monorepo, as in `apps/admin` |

The folder's last part is the backend's package name.

## Options

| Option | Default | Meaning |
|---|---|---|
| `--port <port>` | next free | The port it serves on, 1 to 65535 |
| `--db <database>` | `sqlite` | `sqlite`, `postgres`, `mysql` or `memory` |
| `--files <storage>` | `local` | `local`, `s3` or `memory` |
| `--cluster <cluster>` | `memory` | `memory` or `valkey` |

It also takes the [global flags](/reference/cli/overview/#global-flags).

- Without `--port`, it takes the highest `PORT` found in the workspaces' `.env`, `.env.local` or `.env.example`, plus 10. With none, `3000`.
- With `--port` set to a port another workspace uses, it warns that a request may reach either.

## Name rules

The folder's last part follows the same rules as a project name: lowercase letters, digits and `- . _ ~`, a letter or digit at each end, not `node_modules`.

## What it writes

```sh
newt add backend apps/admin
```

```text
  skipped  package.json (up to date)
  created  apps/admin/package.json
  created  apps/admin/tsconfig.json
  created  apps/admin/eslint.config.ts
  created  apps/admin/AGENTS.md
  created  apps/admin/src/backend.ts
  created  apps/admin/src/stores.ts
  created  apps/admin/src/env.ts
  created  apps/admin/src/backend.test.ts
  created  apps/admin/src/contexts.ts
  created  apps/admin/src/index.ts
  created  apps/admin/src/auth.ts
  created  apps/admin/.env
  created  apps/admin/.env.example
  created  apps/admin/.gitignore
  created  apps/admin/CLAUDE.md

Next steps:
  bun install
  cd apps/admin
  bun run dev
```

- The backend gets the same files as one from [`newt init`](/reference/cli/init/#what-it-writes).
- The root `package.json` gets the shared devDependencies, and a `workspaces` pattern for the folder when none covers it.

## Next steps

1. `bun install`, at the monorepo's root
2. `cd <folder>`
3. `bun run dev`

## Errors

- **Not in a monorepo** (no `package.json` with `workspaces` here or in a parent folder): use [`newt init`](/reference/cli/init/).
- **A folder outside the monorepo, or its root**: refused.
- **A folder inside `node_modules`**: refused.
- **A folder that is a package already, and not a newt backend**: refused.
- **A folder that holds another workspace**: refused; put the backend beside it.
- **A name another workspace has**: refused; two packages of a monorepo never share a name.
- **A folder left out by a `!` pattern in `workspaces`**: refused until you take the pattern out.

See [Monorepos](/guides/monorepo/).
