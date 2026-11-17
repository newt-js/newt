---
title: Postgres
description: Run each context on its own Postgres database.
sidebar:
  order: 2
---

Postgres is a database server: your backend connects to it over the network instead of opening a file. Use it when several instances of your backend must share one database, or when you already run Postgres.

## Start a backend on Postgres

1. Create the backend with `--db postgres`:

   ```sh
   newt init newthub --db postgres
   cd newthub
   newt add context tasks
   ```

2. Start a Postgres server for development, if you do not have one. With Docker:

   ```sh
   docker run -d --name newthub-postgres -e POSTGRES_PASSWORD=postgres \
     -p 5432:5432 postgres
   ```

3. Create one database per context (see [Create the databases](#create-the-databases)):

   ```sh
   docker exec newthub-postgres createdb -U postgres newthub__tasks
   ```

4. Start the backend:

   ```sh
   bun run dev
   ```

On start, each context connects to its database and runs its migrations.

## One database per context

Each context has its own database, and its own variable for it. `newt add context tasks` writes it to `.env` and `.env.example`:

```sh title=".env"
TASKS_DATABASE_URL=postgres://postgres:postgres@localhost:5432/newthub__tasks
```

- The variable is the context's folder name in capitals, `-` turned into `_`, plus `_DATABASE_URL`.
- The suggested database name is `<backend>__<context>`: the backend's package name and the context's folder, with anything but letters and digits turned into `_`. Two backends on one server never share a database.
- The variable is required. Without it the backend does not start: `TASKS_DATABASE_URL is not set: see .env.example`.

`src/stores.ts` opens each one:

```ts title="src/stores.ts"
export async function openDatabase(
  context: string,
  migrations: string,
  stores: Stores,
): Promise<Database> {
  if (stores === 'memory') {
    return new MemoryDatabase()
  }
  return PostgresDatabase.open({
    url: requiredEnv(`${envOf(context)}_DATABASE_URL`),
    migrations,
  })
}
```

:::tip
The databases may live on one server or on several. Each context only knows its own URL, so you can move one context to another server later by changing one variable.
:::

## Create the databases

newt does not create databases: each one must exist before the backend starts. Create one per context, with any tool you like.

With `psql`:

```sql
CREATE DATABASE newthub__tasks;
```

newt's text columns are declared `COLLATE "C"` in the migrations it generates, so the database's default locale does not matter. If you prefer plain `TEXT` columns, create the database with the `C` locale instead:

```sql
CREATE DATABASE newthub__tasks TEMPLATE template0 LOCALE 'C';
```

The user in the URL needs to create tables in the database: the migrations run as that user.

## Migrations

Each context's SQL files live in `src/contexts/<context>/migrations/`. `newt add module tasks/task` writes the Postgres version:

```sql title="src/contexts/tasks/migrations/00001_task_up.sql"
CREATE TABLE "task" (
  id TEXT COLLATE "C" PRIMARY KEY,
  version INTEGER NOT NULL,
  name TEXT COLLATE "C" NOT NULL,
  created_at TEXT COLLATE "C" NOT NULL,
  updated_at TEXT COLLATE "C" NOT NULL
);
```

- `PostgresDatabase.open` runs every pending migration when the backend starts, together with newt's own tables (`newt_job`, `newt_schedule_tick` and others).
- Several instances starting at once are safe: newt takes a lock while it migrates, so each migration runs once.
- newt checks every text column when it opens the database. A column that would compare or sort text differently from other databases stops the start, with a message that names it.

:::caution
Write `COLLATE "C"` on every text column you add, as the generated migrations do. Without it, the backend refuses to start on a database whose locale is not `C`.
:::

For JSON values use `jsonb`, for yes/no values `boolean`, for whole numbers beyond 2^31 `bigint`. More in [Database and migrations](/concepts/database/).

## Connection options

`PostgresDatabase.open(options)` takes:

| Option | Default | What it is |
|---|---|---|
| `url` | required | The database's URL |
| `migrations` | none | The context's migrations folder |
| `connections` | `10` | Connections in the pool |
| `waitTimeoutMs` | `30000` | How long a save waits for a lock |

newt connects with Bun's SQL client (`Bun.SQL`). Options it reads from the URL work too, such as TLS:

```sh title=".env"
TASKS_DATABASE_URL=postgres://app:secret@db.example.com:5432/newthub__tasks?sslmode=require
```

To change the pool size, edit `src/stores.ts`:

```ts title="src/stores.ts"
return PostgresDatabase.open({
  url: requiredEnv(`${envOf(context)}_DATABASE_URL`),
  migrations,
  connections: 20,
})
```

:::note
Each context has its own pool. Three contexts with the default open up to 30 connections per instance. Count them against your server's `max_connections`.
:::

## Tests on Postgres

The tests of a Postgres backend run in memory unless you set `TEST_DATABASE_URL`. With it, each test creates its own database on that server, runs your migrations, and drops it. See [Testing](/guides/testing/#run-module-tests-on-postgres-or-mysql).

```sh
TEST_DATABASE_URL=postgres://postgres:postgres@localhost:5432/postgres \
  bun test
```
