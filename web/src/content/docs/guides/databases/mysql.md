---
title: MySQL
description: Run each context on its own MySQL database.
sidebar:
  order: 3
---

MySQL is a database server: your backend connects to it over the network instead of opening a file. Use it when several instances of your backend must share one database, or when you already run MySQL.

newt needs MySQL 8.0 or later, which has the collation `utf8mb4_0900_bin` that newt's text columns use.

## Start a backend on MySQL

1. Create the backend with `--db mysql`:

   ```sh
   newt init newthub --db mysql
   cd newthub
   newt add context tasks
   ```

2. Start a MySQL server for development, if you do not have one. With Docker:

   ```sh
   docker run -d --name newthub-mysql -e MYSQL_ROOT_PASSWORD=root \
     -p 3306:3306 mysql
   ```

3. Create one database per context (see [Create the databases](#create-the-databases)):

   ```sh
   docker exec newthub-mysql mysql -uroot -proot \
     -e "CREATE DATABASE newthub__tasks \
     CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_bin"
   ```

4. Start the backend:

   ```sh
   bun run dev
   ```

On start, each context connects to its database and runs its migrations.

## One database per context

Each context has its own database, and its own variable for it. `newt add context tasks` writes it to `.env` and `.env.example`:

```sh title=".env"
TASKS_DATABASE_URL=mysql://root:root@localhost:3306/newthub__tasks
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
  return MysqlDatabase.open({
    url: requiredEnv(`${envOf(context)}_DATABASE_URL`),
    migrations,
  })
}
```

## Create the databases

newt does not create databases: each one must exist before the backend starts. Create one per context, with the binary collation:

```sql
CREATE DATABASE newthub__tasks
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_0900_bin;
```

With that collation, text compares and sorts by its exact characters, the same as on SQLite and Postgres. The user in the URL needs to create tables in the database: the migrations run as that user.

:::tip
Creating the database with `utf8mb4_0900_bin` means every table you add takes it by default, even when a migration forgets to say so.
:::

## Migrations

Each context's SQL files live in `src/contexts/<context>/migrations/`. `newt add module tasks/task` writes the MySQL version:

```sql title="src/contexts/tasks/migrations/00001_task_up.sql"
CREATE TABLE `task` (
  id VARCHAR(64) COLLATE utf8mb4_0900_bin PRIMARY KEY,
  version INTEGER NOT NULL,
  name VARCHAR(255) COLLATE utf8mb4_0900_bin NOT NULL,
  created_at VARCHAR(255) COLLATE utf8mb4_0900_bin NOT NULL,
  updated_at VARCHAR(255) COLLATE utf8mb4_0900_bin NOT NULL
) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_bin;
```

- `MysqlDatabase.open` runs every pending migration when the backend starts, together with newt's own tables (`newt_job`, `newt_schedule_tick` and others).
- Several instances starting at once are safe: newt takes a lock while it migrates, so each migration runs once.
- newt checks every text column when it opens the database. A column with another collation stops the start, with a message that names it.

:::caution
MySQL commits each `CREATE TABLE` or `ALTER TABLE` on its own, even inside a transaction. If a migration with several statements fails halfway, the first ones stay applied: fix the database by hand before you start again. Keep one change per migration.
:::

For JSON values use `JSON`, for yes/no values `BOOLEAN` (MySQL stores it as `TINYINT(1)`), for whole numbers beyond 2^31 `BIGINT`. More in [Database and migrations](/concepts/database/).

## Connection options

`MysqlDatabase.open(options)` takes:

| Option | Default | What it is |
|---|---|---|
| `url` | required | The database's URL |
| `migrations` | none | The context's migrations folder |
| `connections` | `10` | Connections in the pool |
| `waitTimeoutMs` | `30000` | How long a save waits for a lock |

newt connects with Bun's SQL client (`Bun.SQL`), which reads the URL. Its documentation lists what else the URL can carry: https://bun.com/docs/runtime/sql

To change the pool size, edit `src/stores.ts`:

```ts title="src/stores.ts"
return MysqlDatabase.open({
  url: requiredEnv(`${envOf(context)}_DATABASE_URL`),
  migrations,
  connections: 20,
})
```

:::note
Each context has its own pool. Three contexts with the default open up to 30 connections per instance. Count them against your server's `max_connections`.
:::

## Tests on MySQL

The tests of a MySQL backend run in memory unless you set `TEST_DATABASE_URL`. With it, each test creates its own database on that server (with `utf8mb4_0900_bin`), runs your migrations, and drops it. See [Testing](/guides/testing/#run-module-tests-on-postgres-or-mysql).

```sh
TEST_DATABASE_URL=mysql://root:root@localhost:3306/mysql bun test
```
