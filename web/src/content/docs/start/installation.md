---
title: Installation
description: What you need on your machine, and how to run the newt command.
sidebar:
  order: 2
---

newt runs on Bun. You install Bun once, and the `newt` command comes with each project.

## Requirements

| Tool | Version | Why |
|---|---|---|
| Bun | 1.4.0 or newer | runs the backend, the tests and the CLI |
| Git | any | optional, to keep your project |

Install Bun as https://bun.sh says, then check it:

```sh
bun --version
```

You do not need Node.js, a database server or Docker. The default database is SQLite, which Bun has built in.

## Create a project

Any of these creates a new backend in the folder `my-app`:

```sh
bun create newt my-app
```

```sh
bunx @newt-js/cli init my-app
```

Both run the same `newt init`, with the same options. `npm create newt my-app` works too, as long as Bun is installed; without Bun it tells you how to get it.

:::caution
Before a project exists, write `bunx @newt-js/cli`, not `bunx newt`. The npm package called `newt` is a different program.
:::

## The `newt` command inside a project

Each project lists `@newt-js/cli` in its `devDependencies`. After `bun install`, run it from anywhere inside the project:

```sh
bunx newt --help
bunx newt add context tasks
```

These docs write `newt ...` for short. Read it as `bunx newt ...`.

If you run a `newt` installed elsewhere inside a project, it hands the command over to the project's own copy. That way the code it writes always matches the project's version of newt.

## Options every command takes

| Option | What it does |
|---|---|
| `--dry-run` | prints what would change, writes nothing |
| `--json` | prints the result as JSON |
| `-h`, `--help` | shows the help |
| `-v`, `--version` | shows the version (`newt -v`) |

With `--json`, a command prints `{ dryRun, files: [{ path, status, note? }], warnings, nextSteps }`, or `{ error }` with exit code 1.

A command never overwrites a file that is already there. Run it twice and the second run skips what exists.

## Options of `newt init`

```sh
newt init [name] [--port <port>] [--db <database>] [--files <storage>] [--cluster <cluster>] [--monorepo] [--backend <folder>]
```

| Option | Values | Default |
|---|---|---|
| `--port` | 1 to 65535 | `3000` |
| `--db` | `sqlite`, `postgres`, `mysql`, `memory` | `sqlite` |
| `--files` | `local`, `s3` | `local` |
| `--cluster` | `memory`, `valkey` | `memory` |
| `--monorepo` | | off |
| `--backend` | a folder | `apps/api` |

- `name` is the new folder. `newt init .` uses the current folder and names the project after it.
- Without a name, in a terminal, newt asks for the name and whether you want a backend or a monorepo.
- `--db` sets the database every context opens. See [SQLite](/guides/databases/sqlite/), [Postgres](/guides/databases/postgres/) and [MySQL](/guides/databases/mysql/).
- `--files` sets where contexts keep uploaded files: a local folder or S3. See [files](/concepts/files/).
- `--cluster` sets what several running instances share. See [running several instances](/guides/scaling/).
- `--monorepo` and `--backend` are explained in [monorepos](/guides/monorepo/).

All options are in the [`newt init` reference](/reference/cli/init/).

:::tip
Keep the defaults for your first project. SQLite, local files and the memory cluster need nothing else on your machine.
:::

## Editor setup

A project needs no editor plugin, but two help:

- **TypeScript**: your editor reads `tsconfig.json`. A frontend, if you add one, has its own `tsconfig.json` in its folder.
- **ESLint**: the project has an `eslint.config.ts` with newt's rules. An ESLint extension shows them as you type, the same ones `bun run lint` reports.

## Next steps

Build [your first project](/start/first-project/).
