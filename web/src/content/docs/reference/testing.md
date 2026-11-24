---
title: Testing API
description: What @newt-js/core/application/testing exports to test a context.
sidebar:
  order: 3
---

`@newt-js/core/application/testing` builds a context for a test: real database, a clock you move by hand, and jobs that run when you ask. You use it in every module test. For how to write tests, read [Testing](/guides/testing/).

```ts
import { TestClock }        from '@newt-js/core/application/testing'
import type { TestContext } from '@newt-js/core/application/testing'
import { testContext }      from '@newt-js/core/application/testing'
```

## testContext

`testContext(options: TestContextOptions): TestContext` makes a context base on its own platform. Its worker and its scheduled tasks do not run by themselves: you run them with `settle()` and `base.schedules.tick()`.

```ts title="src/contexts/tasks/modules/task/task.module.test.ts"
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
  router.authenticateWith(async () =>
    signedIn ? { userId: 'tester' } : null,
  )
  tasks = tasksModules(context.base, router).task
})

afterEach(() => context.close())
```

### Options

`TestContextOptions`:

| Option | Type | Default | Meaning |
|---|---|---|---|
| `name` | `string` | — (required) | The context's name, as in production (`'tasks'`). No `:`. |
| `database` | `Database` | — (required) | Usually SQLite in memory: `SqliteDatabase.open({ path: ':memory:', migrations })`. |
| `cluster` | `Cluster` | — (required) | Usually `new MemoryCluster()` from `@newt-js/core/cluster/memory`. |
| `at` | `Date \| string` | `'2026-01-01T00:00:00.000Z'` | The time the clock starts at. |
| `worker` | `WorkerOptionsGiven` | the worker's defaults | Worker settings (`concurrency`, `leaseMs`, `backoffMs`…). |
| `writeRule` | `WriteRule` | `'error'` | Same as in [ContextBase](/reference/core/). |
| `guardRule` | `GuardRule` | `'error'` | Same as in ContextBase. |
| `conflictRetries` | `Partial<ConflictRetries>` | ContextBase's | Same as in ContextBase. |
| `storage` | `StorageOptions` | none | File storage, for example `{ private: new MemoryStorage() }`. |

You cannot pass `platform`, `clock` or `email`: `testContext` makes its own.

:::caution
Jobs never run by themselves in a test context. After a use case that publishes an event, call `await context.settle()` before checking what its subscriptions did.
:::

### TestContext

| Member | Type | What it is |
|---|---|---|
| `base` | `ContextBase` | The context's base: pass it to your modules (`tasksModules(context.base, router)`). |
| `clock` | `TestClock` | The clock of `base`. Time stands still until you move it. |
| `logs` | `CapturedLines` | What was logged in this context, kept for the test instead of printed. |
| `email` | `MemoryEmail` | What sends its emails: none goes out, and `sent` has them all. |
| `settle()` | `() => Promise<void>` | Runs every waiting job, and the jobs those jobs leave, until none is left. |
| `close()` | `() => Promise<void>` | Stops the worker and the schedules, closes the database, and stops capturing logs. Call it in `afterEach`. |

:::tip
Call `close()` in `afterEach`, as the generated tests do. Without it, the database stays open and the logs stay captured for the next test.
:::

Useful members of `base` in a test:

| Member | Use |
|---|---|
| `base.schedules.tick()` | Fires every scheduled task that is due at the clock's time. |
| `base.database.outbox.list()` | The jobs in the outbox, with their `queue` and `status`. |
| `base.bus` | Publishes and subscribes to events. |

```ts
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
```

### logs

`CapturedLines`:

| Member | Type | What it is |
|---|---|---|
| `lines` | `LogLine[]` | Every line: `{ at, level, message, fields, context }`. |
| `said(level)` | `(level: 'debug' \| 'info' \| 'warn' \| 'error') => string[]` | The messages of that level. |
| `restore()` | `() => void` | Stops capturing. `close()` calls it. |

```ts
expect(context.logs.said('info')).toContain('as a job')
```

## TestClock

A `Clock` that only moves when you tell it to.

| Member | Signature | What it does |
|---|---|---|
| `constructor` | `new TestClock(at?: Date \| string)` | Starts at `at`, or `2026-01-01T00:00:00.000Z`. |
| `now` | `() => Date` | The current time. |
| `set` | `(at: Date \| string) => void` | Jumps to that time. |
| `advance` | `(ms: number) => void` | Moves forward `ms` milliseconds. |

```ts
const clock = new TestClock('2026-03-01T09:00:00.000Z')
clock.advance(60_000)
clock.now().toISOString() // '2026-03-01T09:01:00.000Z'
```

## Calling routes in a test

There is no special helper: call `router.answer` with a `Request`. It runs the route with every check (sign-in, body, errors) and no server. See [HttpRouter](/reference/http/#httprouter).

```ts
const response = await router.answer(
  new Request('http://backend.test/tasks/api/tasks', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'Second' }),
  }),
)
expect(response?.status).toBe(201)
```

To test the whole backend, start it on port `0` with stores in memory, as the generated `src/backend.test.ts` does:

```ts title="src/backend.test.ts"
const backend = await startBackend(0, { stores: 'memory' })
const response = await fetch(new URL('/health-check', backend.server!.url))
expect(response.status).toBe(200)
await backend.stop()
```
