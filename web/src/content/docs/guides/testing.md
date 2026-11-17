---
title: Testing
description: Run the tests newt generates, and write your own for use cases, routes, jobs and scheduled tasks.
sidebar:
  order: 2
---

newt tests are plain `bun test` files that run your real modules on a database in memory. They exist so you can check a use case, its routes, its jobs and its scheduled tasks in milliseconds, without a server or a database running.

## What newt generates

| File | What it tests |
|---|---|
| `src/backend.test.ts` | The whole backend starts and answers its health route |
| `<module>.module.test.ts` | One module: its use cases and routes |
| `<value-object>.test.ts` | One value object's rules |
| `src/test-database.ts` | Not a test: the database the module tests open, on Postgres or MySQL only |

`newt add module`, `newt add use-case`, `newt add route`, `newt add schedule` and `newt add subscription` each add tests to the module's test file. They are a starting point: edit them as your use cases grow.

## Run the tests

1. Run every test:

   ```sh
   bun run test
   ```

   `bun run test` runs `bun test`. Both work.

2. Run the tests of one folder or file:

   ```sh
   bun test src/contexts/tasks
   ```

3. Run only the tests whose name matches:

   ```sh
   bun test -t "creates a task"
   ```

:::tip
Run `bun run test`, `bun run typecheck` and `bun run lint` after every change. A generated project expects all three to pass.
:::

## Test a module

A module test builds the context by hand, with a database in memory, and calls the module's use cases as functions. This is the test `newt add module tasks/task` writes on SQLite:

```ts title="src/contexts/tasks/modules/task/task.module.test.ts"
import { afterEach, beforeEach, expect, test } from 'bun:test'
import { join } from 'node:path'
import { SqliteDatabase } from '@newt-js/core/database/sqlite'
import {
  testContext,
  type TestContext,
} from '@newt-js/core/application/testing'
import { MemoryCluster } from '@newt-js/core/cluster/memory'
import { HttpRouter } from '@newt-js/core/http'
import { tasksModules } from '../../tasks-modules'
import type { Task_Module } from './task.module'

let context: TestContext
let router: HttpRouter
let tasks: Task_Module
let signedIn: boolean

beforeEach(async () => {
  const database = await SqliteDatabase.open({
    path: ':memory:',
    migrations: join(import.meta.dir, '../../migrations'),
  })
  context = testContext({
    name: 'tasks',
    cluster: new MemoryCluster(),
    database,
  })
  router = new HttpRouter({ prefix: '/tasks/api', database })
  signedIn = true
  router.authenticateWith(async () =>
    signedIn ? { userId: 'tester' } : null,
  )
  tasks = tasksModules(context.base, router).task
})

afterEach(() => context.close())

test('creates a task and reads it back', async () => {
  const created = await tasks.create({ name: ' First ' })

  expect(await tasks.get(created.id)).toMatchObject({
    id: created.id,
    name: 'First',
  })
})
```

This is what `beforeEach` builds for every test:

```mermaid
flowchart TD
  migrations[migrations/] --> db[(SQLite in memory)]
  db --> ctx[testContext]
  db --> router[HttpRouter]
  signedIn[test authenticator] --> router
  ctx -->|context.base| modules[tasksModules]
  router --> modules
  modules --> tasks[task module]
  test[Your test] -->|calls a use case| tasks
  test -->|router.answer| router
```

Step by step:

1. `SqliteDatabase.open({ path: ':memory:', migrations })` opens a new, empty SQLite database for each test and runs the context's own migrations on it. Your SQL is tested too.
2. `testContext(...)` builds the context around that database, with a [test clock](#move-the-clock) and a worker that runs jobs only when you ask.
3. `new HttpRouter({ prefix: '/tasks/api', database })` and `tasksModules(context.base, router)` build the context's modules and register their routes, as the real backend does.
4. `context.close()` closes the database after each test.

:::note
`:memory:` is a real SQLite database: newt keeps it in a temporary file and deletes it on `close()`. It behaves exactly like the file your backend uses.
:::

### testContext options

`testContext` takes the same options as the context's own setup, minus the platform and the clock:

| Option | Required | What it is |
|---|---|---|
| `name` | yes | The context's name, `'tasks'` |
| `database` | yes | The database the context uses |
| `cluster` | yes | What instances share; `new MemoryCluster()` in tests |
| `at` | no | The clock's start, a `Date` or ISO string |
| `storage` | no | The context's file storage |
| `worker` | no | Worker options, such as `backoffMs` |
| `writeRule` | no | `'error'` (default), `'warn'` or `'off'` |
| `guardRule` | no | `'error'` (default), `'warn'` or `'off'` |
| `conflictRetries` | no | `{ times, duplicates, backoffMs }` |

- `writeRule`: what happens when a use case writes to another module outside a worker.
- `guardRule`: what happens when a save reads tables without naming them in its guard.
- `conflictRetries`: how often a use case retries when another save changed the same row first.
- The test clock starts at `2026-01-01T00:00:00.000Z` unless you pass `at`.

### What a TestContext gives you

| Member | What it does |
|---|---|
| `base` | The context's base: database, schedules, worker, storage |
| `clock` | The [test clock](#move-the-clock) |
| `logs` | The log lines written during the test |
| `settle()` | Runs every pending job, and waits for them |
| `close()` | Stops schedules and worker, closes the database |

`logs.lines` holds every line; `logs.said('warn')` returns the messages of one level (`debug`, `info`, `warn`, `error`).

## Test a route

`router.answer(request)` runs a request through the router without a server. It returns the response, or `null` when no route takes the path.

```ts title="src/contexts/tasks/modules/task/task.module.test.ts"
test('creates one by its route and reads it by another', async () => {
  const posted = await router.answer(
    new Request('http://backend.test/tasks/api/tasks', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Second' }),
    }),
  )
  expect(posted?.status).toBe(201)
  const { id } = (await posted!.json()) as { id: string }

  const read = await router.answer(
    new Request(`http://backend.test/tasks/api/tasks/${id}`),
  )
  expect(await read?.json()).toMatchObject({ id, name: 'Second' })
})
```

The host (`backend.test`) can be anything; only the path counts.

To check that a route calls the right use case, spy on it:

```ts title="src/contexts/tasks/modules/task/task.module.test.ts"
import { spyOn } from 'bun:test'

test('POST /tasks/:id/complete-task calls completeTask', async () => {
  const created = await tasks.create({ name: 'First' })
  const called = spyOn(tasks, 'completeTask')

  const response = await router.answer(
    new Request(
      `http://backend.test/tasks/api/tasks/${created.id}/complete-task`,
      { method: 'POST' },
    ),
  )
  expect(response?.status).toBe(200)
  expect(called).toHaveBeenCalledWith({ id: created.id })
})
```

## Sign in and out

The test router signs everyone in as `tester` while `signedIn` is `true`. It replaces the backend's own `src/auth.ts` (see [Authentication](/guides/authentication/)) for the test:

```ts
router.authenticateWith(async () => signedIn ? { userId: 'tester' } : null)
```

To test a request from someone not signed in, set `signedIn = false` before the request. Every private route then answers 401:

```ts title="src/contexts/tasks/modules/task/task.module.test.ts"
test(
  'GET /tasks/api/tasks answers 401 to who has not signed in',
  async () => {
    signedIn = false
    const response = await router.answer(
      new Request('http://backend.test/tasks/api/tasks'),
    )
    expect(response?.status).toBe(401)
  },
)
```

To test two different people, return a different `userId`, for example from a request header you set in the test.

When you call a use case directly, no one is signed in. If the use case reads who the [actor](/concepts/actor-and-scope/) is, run it as someone with `runAsActor`:

```ts
import { runAsActor } from '@newt-js/core'

const created = await runAsActor({ userId: 'ana' }, () =>
  tasks.create({ name: 'First' }),
)
```

:::caution
A use case that needs an actor and runs without one throws `NoActor` (401, code `not_signed_in`). If a direct call fails like that, wrap it in `runAsActor`.
:::

## Move the clock

`context.clock` is a `TestClock`: it stands still until you move it. Use cases, entities, the worker and schedules all read it.

| Method | What it does |
|---|---|
| `now()` | The current time, a `Date` |
| `set(at)` | Jumps to `at`, a `Date` or ISO string |
| `advance(ms)` | Moves forward `ms` milliseconds |

```ts
context.clock.set('2026-03-01T08:59:00.000Z')
context.clock.advance(60_000)
```

## Run jobs with settle()

When a use case records an [event](/concepts/events/), each subscription becomes a job in the outbox: the queue of jobs that lives in your database. In a test, the worker does not run on its own. `await context.settle()` runs every job that is due, then any job those jobs create, until none is left.

Once `completeTask` records the `completed` event, this checks that `notifyAssignee` ran:

```ts title="src/contexts/tasks/modules/task/task.module.test.ts"
test('notifies the assignee once a task is completed', async () => {
  const created = await tasks.create({ name: 'First' })
  await tasks.completeTask({ id: created.id })

  await context.settle()

  const jobs = await context.base.database.outbox.list()
  expect(
    jobs.find(
      job => job.queue === 'task.notifyAssignee.on.task.completed',
    )?.status,
  ).toBe('done')
})
```

## Check jobs in the outbox

`context.base.database.outbox.list(query?)` returns the jobs. Each job has a `queue` named `<module>.<use case>.on.<event>`, a `status` (`pending`, `running`, `done` or `dead`), its `attempts` and its `lastError`.

The query is optional:

| Field | What it does |
|---|---|
| `status` | Only jobs with this status |
| `limit` | At most this many jobs |
| `after` | Jobs after this job id |

A job that fails waits before its next attempt: 10 seconds the first time, doubled each time, up to 15 minutes. The wait follows the test clock. To test a retry, advance the clock and settle again:

```ts
await context.settle()
context.clock.advance(10_000)
await context.settle()
```

After its last attempt (5 by default) a job's status is `dead`. To make retries due at once, pass `worker: { backoffMs: 0 }` to `testContext`.

## Test a scheduled task

A [scheduled task](/concepts/schedules/) does not run on its own in a test either. `context.base.schedules.tick()` checks every schedule against the clock, once.

The first tick only notes where each schedule stands and runs nothing. Move the clock past the next due time, tick again, and settle to run the job:

```ts title="src/contexts/tasks/modules/task/task.module.test.ts"
test('remindOverdue runs at 0 9 * * *', async () => {
  await context.base.schedules.tick()
  context.clock.advance(366 * 24 * 60 * 60 * 1000)
  await context.base.schedules.tick()
  await context.settle()

  const queued = await context.base.database.outbox.list()
  expect(
    queued.find(
      each => each.queue === 'task.remindOverdue.on.task.remindOverdue',
    )?.status,
  ).toBe('done')
})
```

:::tip
To test the exact time, start the clock just before it with `testContext({ ..., at: '2026-03-01T08:59:00.000Z' })`, tick, advance one minute, and tick again.
:::

## Test the whole backend

`src/backend.test.ts` starts the real backend on a free port, with every store in memory:

```ts title="src/backend.test.ts"
import { expect, test } from 'bun:test'
import { startBackend } from './backend'

test('the backend answers its health', async () => {
  const backend = await startBackend(0, { stores: 'memory' })
  const response = await fetch(new URL('/health-check', backend.server!.url))
  expect(response.status).toBe(200)
  await backend.stop()
})
```

- Port `0` lets the system pick a free port.
- `stores: 'memory'` opens every context's database and files in memory, and the cluster too. On SQLite, the databases are SQLite in memory with their migrations; on Postgres and MySQL, newt's database in memory.
- It reads no `.env` value that `src/stores.ts` requires, so it runs anywhere.
- Always `await backend.stop()` at the end.

Use this for tests that go through the real HTTP server, such as checking headers or a frontend.

## Run module tests on Postgres or MySQL

On a Postgres or MySQL backend, module tests open their database through `src/test-database.ts`:

```ts title="src/contexts/tasks/modules/task/task.module.test.ts"
beforeEach(async () => {
  const { database, drop } = await testDatabase(
    join(import.meta.dir, '../../migrations'),
  )
  dropDatabase = drop
  context = testContext({
    name: 'tasks',
    cluster: new MemoryCluster(),
    database,
  })
  // ...
})

afterEach(async () => {
  await context.close()
  await dropDatabase()
})
```

- Without `TEST_DATABASE_URL`, `testDatabase` returns a database in memory. The tests are fast, but your SQL migrations do not run.
- With `TEST_DATABASE_URL`, each test creates a new database on that server (named `test_<random>`), runs the context's migrations on it, and drops it at the end.

To try your migrations on a real server:

1. Start a Postgres or MySQL server you may create and drop databases on.
2. Run the tests with its URL:

   ```sh
   TEST_DATABASE_URL=postgres://postgres:postgres@localhost:5432/postgres \
     bun test
   ```

   For MySQL: `TEST_DATABASE_URL=mysql://root:root@localhost:3306/mysql bun test`.

The database name in the URL is replaced by each test's own; the user must be allowed to create databases.

:::caution
Without `TEST_DATABASE_URL`, a mistake in a Postgres or MySQL migration passes the tests and fails when the backend starts. Run the tests with it before you deploy, for example in CI.
:::

:::danger
Never point `TEST_DATABASE_URL` at your production server. The tests create and drop databases on it.
:::
