---
title: newt add context
description: Adds a context to the backend, with its own database and its own files.
sidebar:
  order: 3
---

`newt add context` adds a context: a part of your app with its own database, such as `tasks` or `chat`. It opens the same kind of database and file storage as the rest of the backend.

## Usage

```sh
newt add context <name> [options]
```

## Arguments

| Argument | Meaning |
|---|---|
| `name` | The context's name, as in `tasks` or `web-session` |

## Options

| Option | Default | Meaning |
|---|---|---|
| `--backend <folder>` | the one you are in | The backend, in a monorepo with several |

It also takes the [global flags](/reference/cli/overview/#global-flags).

## Name rules

- Lowercase letters and digits, words joined by `-`, starting with a letter: `tasks`, `web-session`.
- Not `api`: its frontend would be served at `/api`, where the routes are.
- With Postgres or MySQL, the database name is `<backend>__<context>`; with S3, the bucket is `<backend>--<context>`. Each must fit in 63 characters.

From `web-session`, newt makes `WebSession` (class names), `webSession` (variables) and `WEB_SESSION` (environment variables).

## What it writes

```sh
newt add context chat
```

```text
  created  src/contexts/chat/chat.context.ts
  created  src/contexts/chat/chat-modules.ts
  created  src/contexts/chat/migrations/.gitkeep
  skipped  src/auth.ts (already exists)
  updated  .env
  updated  .env.example
  updated  src/contexts.ts

Next steps:
  bun run dev
```

- `src/contexts.ts` gets a line that opens the context.
- `src/auth.ts` is written only if it is missing.
- `.env` and `.env.example` get the context's variables, by the backend's database and files:

| Backend uses | Variable added | Value |
|---|---|---|
| `sqlite` | `CHAT_DATABASE` | `data/chat.sqlite` |
| `postgres` | `CHAT_DATABASE_URL` | `postgres://postgres:postgres@localhost:5432/<backend>__chat` |
| `mysql` | `CHAT_DATABASE_URL` | `mysql://root:root@localhost:3306/<backend>__chat` |
| `local` files | `CHAT_FILES` | `data/files/chat` |
| `s3` files | `CHAT_S3_BUCKET` | `<backend>--chat` |

`memory` adds nothing. Values already in `.env` are kept.

## Next steps

- With Postgres or MySQL: create the context's database in your server, as `<CONTEXT>_DATABASE_URL` says.
- With S3: set `<CONTEXT>_S3_BUCKET` in `.env` to its bucket.
- `bun run dev`

:::caution
With Postgres or MySQL, this command does not create the database: create it in your server before `bun run dev`.
:::

## Errors

- **A bad name**: `'<name>' cannot name a context: lowercase words joined by -`.
- **`api`**: refused.
- **A database or bucket name over 63 characters**: refused; give the context a shorter name.
- **`src/stores.ts` opens no database or storage newt knows**: refused, since newt cannot tell what the context should open.
- **No backend found**: see [Overview](/reference/cli/overview/#rules-every-command-follows).

See [Contexts and modules](/concepts/contexts-and-modules/).
