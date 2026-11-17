---
title: Switching databases
description: Move a backend from SQLite to Postgres or MySQL, and bring its data along.
sidebar:
  order: 4
---

Switching databases means changing which database server your contexts open, rewriting their migrations in that database's SQL, and copying the data across. newt does the first part for you when you create a project; for an existing one you do it by hand, with a freshly generated project as your model.

## What newt does and does not do

| Step | Who does it |
|---|---|
| Write `src/stores.ts` for the new database | You, copied from a new project |
| Rewrite the migrations in the new SQL | You |
| Create the new databases | You |
| Create the tables on the new databases | newt, when the backend starts |
| Copy the rows | You, with a script |

There is no `newt` command that switches a backend or moves data.

:::caution
newt's command line reads `src/stores.ts` to know which SQL to write in new migrations. It must import one kind of database only (plus the one in memory). A backend with some contexts on SQLite and others on Postgres is something you can wire by hand, but `newt add` commands then stop with "newt cannot tell which database the backend uses". Switch the whole backend at once.
:::

## 1. Generate a model project

In a scratch folder, make an empty project with the database you want and the same contexts:

```sh
newt init newthub-model --db postgres
cd newthub-model
newt add context tasks
```

Use `--db mysql` for MySQL. You copy files from this project in the next steps, then delete it.

## 2. Change src/stores.ts

Replace `openDatabase` and its imports with the model's. From SQLite to Postgres:

```ts title="src/stores.ts"
import { MemoryDatabase } from '@newt-js/core/database/memory'
import { PostgresDatabase } from '@newt-js/core/database/postgres'
import { requiredEnv } from './env'

export async function openDatabase(context: string, migrations: string, stores: Stores): Promise<Database> {
  if (stores === 'memory') {
    return new MemoryDatabase()
  }
  return PostgresDatabase.open({ url: requiredEnv(`${envOf(context)}_DATABASE_URL`), migrations })
}
```

Remove the `SqliteDatabase` import. Keep `openStorage` as it is: files do not change. If your project has no `src/env.ts` (where `requiredEnv` lives), copy it from the model too.

## 3. Change the environment

Each context's variable changes from a file path to a URL:

| Before (SQLite) | After (Postgres) |
|---|---|
| `TASKS_DATABASE=data/tasks.sqlite` | `TASKS_DATABASE_URL=postgres://...` |

Update `.env`, `.env.example` and your production settings. Then create one database per context, as [Postgres](/guides/databases/postgres/#create-the-databases) or [MySQL](/guides/databases/mysql/#create-the-databases) explains.

## 4. Rewrite the migrations

The new databases start empty, so you can rewrite each migration file in place, in the new SQL. Keep the file names and numbers.

The `task` table, side by side:

| Column | SQLite | Postgres | MySQL |
|---|---|---|---|
| `id` | `TEXT` | `TEXT COLLATE "C"` | `VARCHAR(64) COLLATE utf8mb4_0900_bin` |
| `version` | `INTEGER` | `INTEGER` | `INTEGER` |
| `name` | `TEXT` | `TEXT COLLATE "C"` | `VARCHAR(255) COLLATE utf8mb4_0900_bin` |

Other differences to watch for:

- Text: on Postgres, add `COLLATE "C"` to every text column. On MySQL, use `VARCHAR(n) COLLATE utf8mb4_0900_bin` and end the table with `CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_bin`. newt refuses to start on text columns that would sort differently.
- Yes/no: SQLite `BOOLEAN` (stored as 0 or 1), Postgres `boolean`, MySQL `BOOLEAN` (`TINYINT(1)`).
- JSON: SQLite a type starting with `JSON`, Postgres `jsonb`, MySQL `JSON`.
- Large whole numbers: `INTEGER` holds them on SQLite; use `bigint` on Postgres and `BIGINT` on MySQL.
- Quotes: SQLite and Postgres quote names with `"task"`, MySQL with backticks.
- `ALTER TABLE` differs a lot between the three. Check each `ALTER` against the new database's manual.

:::tip
To see the exact SQL newt writes for a module, run `newt add module tasks/task` in the model project and open its `migrations/` folder.
:::

## 5. Change the tests

Module tests written on SQLite open `SqliteDatabase` with `':memory:'`, which would now run Postgres SQL on SQLite. Change them to the model's shape:

1. Copy `src/test-database.ts` from the model project.
2. In each `<module>.module.test.ts`, open the database with `testDatabase` and drop it after each test:

   ```ts title="src/contexts/tasks/modules/task/task.module.test.ts"
   import { testDatabase } from '../../../../test-database'

   let dropDatabase: () => Promise<void>

   beforeEach(async () => {
     const { database, drop } = await testDatabase(join(import.meta.dir, '../../migrations'))
     dropDatabase = drop
     context = testContext({ name: 'tasks', cluster: new MemoryCluster(), database })
     // ...
   })

   afterEach(async () => {
     await context.close()
     await dropDatabase()
   })
   ```

3. Run the tests against a real server, so the new migrations run:

   ```sh
   TEST_DATABASE_URL=postgres://postgres:postgres@localhost:5432/postgres bun test
   ```

More in [Testing](/guides/testing/#run-module-tests-on-postgres-or-mysql).

## 6. Move the data

newt does not copy data between databases. A short Bun script does it, table by table.

1. Let the backend finish its pending jobs, then stop it. Nothing must write to the SQLite file while you copy.
2. Start the backend once on the new database and stop it. This creates the tables.
3. Copy your tables' rows with a script like this one:

   ```ts title="scripts/copy-tasks.ts"
   import { Database } from 'bun:sqlite'
   import { SQL } from 'bun'

   const tables = ['project', 'task']
   const from = new Database('data/tasks.sqlite', { readonly: true })
   const to = new SQL(Bun.env.TASKS_DATABASE_URL!)

   for (const table of tables) {
     const rows = from.query(`SELECT * FROM "${table}"`).all() as Record<string, unknown>[]
     for (const row of rows) {
       await to`INSERT INTO ${to(table)} ${to(row)}`
     }
     console.log(`${table}: ${rows.length} rows`)
   }

   from.close()
   await to.close()
   ```

   ```sh
   bun scripts/copy-tasks.ts
   ```

4. Repeat for each context, with its own file and URL.
5. Start the backend and check your data.

Notes on the script:

- Column names are the same on every database, so rows copy as they are.
- SQLite returns yes/no columns as `0` or `1`. If a table has them, turn them into `true` or `false` before you insert into Postgres.
- List tables in an order that respects `REFERENCES`: a project before the tasks that point to it.
- Do not copy newt's own tables (`newt_migrations`, `newt_framework_migrations`, `newt_job`, `newt_job_queue`, `newt_schedule_tick`, `newt_idempotency_key`). The new database has its own, and the backend fills them again.

:::danger
Keep the SQLite files until you have checked the new database. They are your way back.
:::

## Going the other way

Moving from Postgres or MySQL to SQLite is the same in reverse: `SqliteDatabase` in `src/stores.ts`, `<CONTEXT>_DATABASE` file paths in `.env`, migrations in SQLite's SQL, and module tests on `SqliteDatabase.open({ path: ':memory:', migrations })` as [SQLite](/guides/databases/sqlite/) shows. Delete `src/test-database.ts`.
