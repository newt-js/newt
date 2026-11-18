---
title: newt add module
description: Adds a module to a context, with its entity, use cases, routes, table and test.
sidebar:
  order: 4
---

`newt add module` adds one kind of thing to a context, such as `task` in `tasks`. It writes a working module: an entity, its schema, a repository, use cases to create, get and list, routes, a table and a test.

## Usage

```sh
newt add module <context>/<module> [options]
```

## Arguments

| Argument | Meaning |
|---|---|
| `context` | A context of the backend, as in `tasks` |
| `module` | The module's name, singular, as in `task` or `price-change` |

## Options

| Option | Default | Meaning |
|---|---|---|
| `--plural <name>` | English rules | Its plural, when the rules get it wrong: `--plural people` |
| `--backend <folder>` | the one you are in | The backend, in a monorepo with several |

It also takes the [global flags](/reference/cli/overview/#global-flags).

- The plural names the routes (`/tasks`) and the module's variable (`tasks`).
- The rules add `s`, `es` after `s x z ch sh`, `ies` for a consonant plus `y`, and `es` for `-sis` words. `child`, `person`, `man`, `woman`, `mouse`, `goose`, `foot`, `tooth`, `quiz`, `news`, `series` and `species` are known.

## Name rules

- Lowercase letters and digits, words joined by `-`, starting with a letter: `task`, `price-change`. The plural follows the same form.
- Not a word JavaScript keeps (`class`, `delete`, `new`…).
- Not a name newt's generated code uses for something else (`module`, `base`, `router`, `events`, `id`, `name`, `entity`, `page`…).
- Its plural cannot be `files`: `/<context>/files` serves the context's files.
- Not starting with `newt-`: tables starting with `newt_` are newt's own.
- The table name (`price_change`) fits in 63 characters.

From `price-change`, newt makes `PriceChange`, `priceChange`, the table `price_change`, and the plural `priceChanges` / `price-changes`.

## What it writes

```sh
newt add module tasks/task
```

```text
  created  src/contexts/tasks/modules/task/value-objects/task-id.ts
  created  src/contexts/tasks/modules/task/task.schema.ts
  created  src/contexts/tasks/modules/task/events/task-created.ts
  created  src/contexts/tasks/modules/task/errors/task-not-found.ts
  created  src/contexts/tasks/modules/task/task.ts
  created  src/contexts/tasks/modules/task/task.repository.ts
  created  src/contexts/tasks/modules/task/task.module.ts
  created  src/contexts/tasks/modules/task/task.routes.ts
  created  src/contexts/tasks/modules/task/task.module.test.ts
  created  src/contexts/tasks/migrations/00001_task_up.sql
  created  src/contexts/tasks/migrations/00001_task_down.sql
  updated  src/contexts/tasks/tasks-modules.ts

Next steps:
  bun test src/contexts/tasks/modules/task
  its routes ask for a session: write authenticate in src/auth.ts to call them from outside the tests
```

- The migrations get the next number in the context's `migrations/` folder, and are written in the backend's SQL (SQLite, Postgres or MySQL).
- `<context>-modules.ts` gets the line that starts the module.
- The routes are `POST /<plural>`, `GET /<plural>` and `GET /<plural>/:id`, under `/<context>/api`.

:::note
The generated routes need a signed-in caller. Until `authenticate` in `src/auth.ts` says who calls, they answer 401 outside the tests. See [Authentication](/guides/authentication/).
:::

## Next steps

- `bun test src/contexts/<context>/modules/<module>`
- Write `authenticate` in `src/auth.ts` to call the routes from outside the tests.

## Errors

- **Not `<context>/<module>`**: `newt add module takes the context and the module, as in newt add module sales/order`.
- **A context the backend does not have**: refused; add it with [`newt add context`](/reference/cli/add-context/).
- **A name that breaks the rules**: `'<name>' cannot name a module: …`, saying which rule.
- **A bad `--plural`**: `'<plural>' cannot be the plural of <module>`.
- **`src/stores.ts` opens no database newt knows**: refused, since newt cannot tell which SQL to write.

See [Contexts and modules](/concepts/contexts-and-modules/) and [Entities](/concepts/entities/).
