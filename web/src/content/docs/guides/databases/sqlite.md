---
title: SQLite
description: newt's default database, one file per context, ready for production.
sidebar:
  order: 1
---

SQLite is a database kept in a single file on your disk, with no server to run. It is newt's default because it needs no setup, and it is fit for production: one SQLite file serves a busy app on a single machine.

## Start a backend on SQLite

SQLite is the default, so both commands do the same:

```sh
newt init newthub
newt init newthub --db sqlite
```

Each context gets its own file when the backend starts. There is nothing to create or install.

## Where the files live

Each context has one database file, in `data/` by default:

| Context | File | Variable |
|---|---|---|
| `tasks` | `data/tasks.sqlite` | `TASKS_DATABASE` |
| `chat` | `data/chat.sqlite` | `CHAT_DATABASE` |

The variable is the context's folder name in capitals, with `-` turned into `_`, plus `_DATABASE`. `newt add context` writes it to `.env` and `.env.example`:

```sh title=".env"
TASKS_DATABASE=data/tasks.sqlite
```

`src/stores.ts` reads it, and falls back to `data/<context>.sqlite` when it is not set:

```ts title="src/stores.ts"
export async function openDatabase(
  context: string,
  migrations: string,
  stores: Stores,
): Promise<Database> {
  if (stores === 'memory') {
    return SqliteDatabase.open({ path: ':memory:', migrations })
  }
  return SqliteDatabase.open({
    path:
      Bun.env[`${envOf(context)}_DATABASE`] ?? `data/${context}.sqlite`,
    migrations,
  })
}
```

- A relative path is relative to the folder you start the backend from.
- newt creates the file's folder if it is missing.
- Next to each file SQLite keeps two more: `tasks.sqlite-wal` and `tasks.sqlite-shm`. They are part of the database.
- `data/` is in `.gitignore`: your data never goes into git.

:::danger
Never delete the `-wal` file of a database in use. It can hold the latest saved changes that are not in the main file yet.
:::

## What newt sets on each file

When it opens a file, newt sets these SQLite options (*pragmas*):

| Pragma | Value | Why |
|---|---|---|
| `journal_mode` | `WAL` | Reads do not wait for writes |
| `synchronous` | `NORMAL` | Fast writes, safe with WAL |
| `foreign_keys` | `ON` | `REFERENCES` in your migrations is enforced |
| `busy_timeout` | `5000` | Waits up to 5 s for a lock |

newt also opens two connections per file: one that writes and one, read-only, that reads outside transactions. Inside one backend, transactions on a file take turns: one writes at a time.

## SqliteDatabase options

`SqliteDatabase.open(options)` takes:

| Option | Default | What it is |
|---|---|---|
| `path` | required | The file, or `':memory:'` |
| `migrations` | none | The context's migrations folder |
| `waitTimeoutMs` | `30000` | How long a transaction waits for its turn |

`open` runs the [migrations](/concepts/database/) that have not run yet before it returns. `':memory:'` is what the tests use: a new, empty database that is deleted when it closes.

## Back up a live database

Copying `tasks.sqlite` with `cp` while the backend runs can give you a broken copy: recent changes may still be in the `-wal` file. Use SQLite's own backup instead. It is safe while the backend runs.

1. Make a consistent copy with `VACUUM INTO`, from a small Bun script:

   ```ts title="scripts/backup.ts"
   import { Database } from 'bun:sqlite'

   const stamp = new Date().toISOString().replaceAll(':', '-')
   const database = new Database('data/tasks.sqlite')
   database.run(`VACUUM INTO 'backups/tasks-${stamp}.sqlite'`)
   database.close()
   ```

   ```sh
   mkdir -p backups && bun scripts/backup.ts
   ```

   With the `sqlite3` command line tool, `.backup` does the same:

   ```sh
   sqlite3 data/tasks.sqlite ".backup 'backups/tasks.sqlite'"
   ```

2. Copy the backup file somewhere else: another disk, another machine, or object storage.
3. Run it on a schedule, for example once a day with cron.

To restore, stop the backend, put the backup file in place of `data/tasks.sqlite`, delete the old `-wal` and `-shm` files, and start the backend again.

:::tip
Back up every context's file, and the files folder (`data/files/`) if you keep uploads on local disk. A backup you have never restored is not a backup: try a restore once.
:::

For continuous backups, tools exist that stream SQLite's WAL to object storage, such as Litestream (https://litestream.io). newt neither needs nor configures them.

## When to move to Postgres or MySQL

SQLite is the right choice while your backend runs as one process on one machine. Move a context to [Postgres](/guides/databases/postgres/) or [MySQL](/guides/databases/mysql/) when:

- You want [several instances](/guides/scaling/) of the backend on different machines. They must share a database, and a SQLite file lives on one disk.
- Your host has no persistent disk, so a file would be lost on each deploy.
- Your team already runs a managed Postgres or MySQL and its backups.

Heavy traffic alone is rarely a reason: one machine with SQLite handles a lot of reads, and writes take turns quickly. [Switching databases](/guides/databases/switching/) explains what changes.

:::note
newt makes writes take turns inside one process only. Between processes, SQLite's own lock and the 5 s `busy_timeout` apply. For instances on more than one machine, use a database server.
:::
